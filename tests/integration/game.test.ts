import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
} from "@jest/globals";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { boot, type ColyseusTestServer } from "@colyseus/testing";
import type { Room as SDKRoom } from "@colyseus/sdk";
import defineGameServer from "@/server/server";
import { registerApiRoutes } from "@/server/routes";
import type { RoomListing } from "@/server/rooms/registry";
import type { NormalRoom, State } from "@/server/rooms/NormalRoom";

let app: ColyseusTestServer;
const sdkRooms: SDKRoom[] = [];

/**
 * Opens a fresh SDK connection to the room created by `host` and tracks it
 * for cleanup.
 * @param host A client already sitting in the room.
 * @returns The second client, with its initial state applied.
 */
async function joinSecond(host: SDKRoom): Promise<SDKRoom> {
  const second = await app.sdk.joinById(host.roomId, { name: "Bob" });
  sdkRooms.push(second);
  await second.waitForInitialState();
  return second;
}

/**
 * Drops a room that already left on its own from the cleanup list.
 * Calling `leave()` again on a closed connection registers an `onLeave`
 * listener that can never fire, which would hang `afterEach`.
 * @param room The room to stop tracking.
 */
function forget(room: SDKRoom) {
  const index = sdkRooms.indexOf(room);
  if (index !== -1) sdkRooms.splice(index, 1);
}

/**
 * Sends a room message and resolves once every listed client has applied the
 * resulting state patch, so the next message is never raced against the
 * previous one.
 * @param sender The client emitting the message.
 * @param type The message channel name.
 * @param clients The clients expected to receive the patch.
 * @param payload The message payload, if any.
 */
async function sendAndWait(
  sender: SDKRoom,
  type: string,
  clients: SDKRoom[],
  payload?: unknown,
) {
  const patches = clients.map((client) => client.waitForNextPatch());
  sender.send(type, payload);
  await Promise.all(patches);
}

/**
 * Seats the host in slot 0 and the second client in slot 1.
 * @param host The client that created the room.
 * @param second The client opened by `joinSecond`.
 */
async function seatBoth(host: SDKRoom, second: SDKRoom) {
  await sendAndWait(host, "join-color", [host, second], 0);
  await sendAndWait(second, "join-color", [host, second], 1);
}

/**
 * Polls `GET /api/rooms` until `predicate` is satisfied.
 * Listing mutations (`setPrivate`, `setMetadata`) complete asynchronously on
 * the server, so HTTP assertions wait for them instead of assuming a fixed
 * ordering with respect to the state patches.
 * @param predicate The condition the listing must satisfy.
 * @returns The first listing that satisfies it, or the last one seen.
 */
async function waitForListing(
  predicate: (rooms: RoomListing[]) => boolean,
): Promise<RoomListing[]> {
  const deadline = Date.now() + 2000;
  let rooms = (await app.http.get<RoomListing[]>("/api/rooms")).data;
  while (!predicate(rooms) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
    rooms = (await app.http.get<RoomListing[]>("/api/rooms")).data;
  }
  return rooms;
}

beforeAll(async () => {
  const gameServer = new Server({
    transport: new WebSocketTransport(),
    devMode: false,
    greet: false,
    gracefullyShutdown: false,
    express: registerApiRoutes,
  });
  defineGameServer(gameServer);
  app = await boot(gameServer);
});

afterEach(async () => {
  await Promise.all(
    sdkRooms.splice(0).map((room) => room.leave().catch(() => {})),
  );
  await app.cleanup();
});

afterAll(async () => {
  await app.shutdown();
});

describe("game server over HTTP and WebSocket", () => {
  it("should advertise a public room through GET /api/rooms when it is joinable", async () => {
    const room = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(room);
    await room.waitForInitialState();

    const res = await app.http.get<RoomListing[]>("/api/rooms");

    expect(res.data).toHaveLength(1);
    expect(res.data[0]).toMatchObject({
      name: "Normal",
      clients: 1,
      maxClients: 8,
      metadata: { host: "Alice" },
    });
  });

  it("should send a fully seeded state when a client joins", async () => {
    const room = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(room);
    await room.waitForInitialState();

    const state = room.state as State;
    expect(state.players).toHaveLength(4);
    expect([...state.board]).toHaveLength(42);
    expect([...state.board].every((cell) => cell === -1)).toBe(true);
    expect(state.spectators.has(room.sessionId)).toBe(true);
    expect(state.host).toBe(room.sessionId);
    expect(state.playerNames.get(room.sessionId)).toBe("Alice");
  });

  it("should broadcast the seat assignment to every client when a player picks a color", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);

    await sendAndWait(host, "join-color", [host, second], 0);

    expect(host.state.players[0]).toBe(host.sessionId);
    expect(second.state.players[0]).toBe(host.sessionId);
    expect(second.state.spectators.has(host.sessionId)).toBe(false);
  });

  it("should broadcast the board patch when a player makes a legal move", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);

    await sendAndWait(host, "join-color", [host, second], 0);
    await sendAndWait(second, "join-color", [host, second], 1);

    // The host holds seat 0, so the turn stays on them after both joins.
    await sendAndWait(host, "play-piece", [host, second], 3);

    // Column 3, bottom row: index 5 * 7 + 3, piece color 0.
    expect(host.state.board[38]).toBe(0);
    expect(second.state.board[38]).toBe(0);
    expect(host.state.turn).toBe(1);
  });

  it("should broadcast the chat message to every client when a player sends one", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);

    const patch = second.waitForNextPatch();
    host.send("send-message", "hello");
    await patch;

    expect(second.state.chatMessages).toHaveLength(1);
    expect(second.state.chatMessages[0].content).toBe("hello");
    expect(second.state.chatMessages[0].author).toBe(host.sessionId);
  });

  it("should remove the room from the lobby when the host locks it and restore it when unlocked", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    const serverRoom = app.getRoomById<NormalRoom>(host.roomId);

    const lock = serverRoom.waitForMessage("set-lock");
    await sendAndWait(host, "set-lock", [host, second], true);
    await lock;

    expect(second.state.isPrivate).toBe(true);
    expect(await waitForListing((rooms) => rooms.length === 0)).toHaveLength(0);

    const unlock = serverRoom.waitForMessage("set-lock");
    await sendAndWait(host, "set-lock", [host, second], false);
    await unlock;

    expect(second.state.isPrivate).toBe(false);
    const rooms = await waitForListing((listed) => listed.length === 1);
    expect(rooms).toHaveLength(1);
    expect(rooms[0].roomId).toBe(host.roomId);
  });

  it("should leave the room public when a player who is not the host requests a lock", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    const serverRoom = app.getRoomById<NormalRoom>(host.roomId);

    // The guard returns without touching the state, so there is no patch to
    // wait for: the server-side message waiter is what keeps this from racing.
    const handled = serverRoom.waitForMessage("set-lock");
    second.send("set-lock", true);
    await handled;

    expect(serverRoom.state.isPrivate).toBe(false);
    expect(second.state.isPrivate).toBe(false);

    const res = await app.http.get<RoomListing[]>("/api/rooms");
    expect(res.data).toHaveLength(1);
    expect(res.data[0].roomId).toBe(host.roomId);
  });

  it("should update the listing metadata when the host renames", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    const serverRoom = app.getRoomById<NormalRoom>(host.roomId);

    const handled = serverRoom.waitForMessage("update-name");
    await sendAndWait(host, "update-name", [host, second], "Alicia");
    await handled;

    expect(second.state.playerNames.get(host.sessionId)).toBe("Alicia");

    const rooms = await waitForListing(
      (listed) => listed[0]?.metadata.host === "Alicia",
    );
    expect(rooms[0].metadata.host).toBe("Alicia");
  });

  it("should reset the board when every seated player has voted to skip", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    await seatBoth(host, second);

    // Column 3, bottom row: index 5 * 7 + 3, piece color 0.
    await sendAndWait(host, "play-piece", [host, second], 3);
    expect(second.state.board[38]).toBe(0);

    // One vote out of two is below quorum: the board must survive it.
    await sendAndWait(host, "vote-skip", [host, second]);
    expect(second.state.votedForSkip.size).toBe(1);
    expect(second.state.board[38]).toBe(0);

    await sendAndWait(second, "vote-skip", [host, second]);
    expect([...second.state.board].every((cell) => cell === -1)).toBe(true);
    expect([...host.state.board].every((cell) => cell === -1)).toBe(true);
    expect(second.state.votedForSkip.size).toBe(0);
    expect(host.state.votedForSkip.size).toBe(0);
  });

  it("should reassign the host and free the seat when the host leaves the room", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    await seatBoth(host, second);

    const patch = second.waitForNextPatch();
    await host.leave();
    forget(host);
    await patch;

    expect(second.state.players[0]).toBe("");
    expect(second.state.spectators.has(host.sessionId)).toBe(false);
    expect(second.state.host).toBe(second.sessionId);

    const rooms = await waitForListing(
      (listed) => listed[0]?.metadata.host === "Bob",
    );
    expect(rooms[0].metadata.host).toBe("Bob");
  });

  it("should keep the seat reserved when the host disconnects without consent and free it once allowReconnection expires", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    await sendAndWait(host, "join-color", [host, second], 0);

    // No client-side retry: the seat must be released by the server alone.
    host.reconnection.enabled = false;
    const patch = second.waitForNextPatch();
    await host.leave(false);
    forget(host);

    // The seat stays reserved while the server waits for a reconnection.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(second.state.players[0]).toBe(host.sessionId);

    await patch;
    expect(second.state.players[0]).toBe("");
    expect(second.state.spectators.has(host.sessionId)).toBe(false);
    expect(second.state.host).toBe(second.sessionId);
  }, 10000);

  it("should lock the room when every slot is taken", async () => {
    const first = await app.sdk.joinOrCreate("Normal", { name: "P1" });
    sdkRooms.push(first);
    await first.waitForInitialState();

    for (let i = 2; i <= 8; i++) {
      const client = await app.sdk.joinById(first.roomId, { name: `P${i}` });
      sdkRooms.push(client);
      await client.waitForInitialState();
    }

    // Reaching maxClients locks the room, which is what matchmaking hits
    // first; the "is already full." branch only exists for join races.
    expect(app.getRoomById(first.roomId).clients).toHaveLength(8);
    await expect(
      app.sdk.joinById(first.roomId, { name: "P9" }),
    ).rejects.toThrow(/is locked/);
  });

  it("should reject the join when the room does not exist", async () => {
    await expect(app.sdk.joinById("ZZZZZZ", { name: "Ghost" })).rejects.toThrow(
      /not found/,
    );
  });

  it("should broadcast a chat message to every client and filter profanity when a player sends one", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);

    await sendAndWait(host, "send-message", [host, second], "hello");
    const first = second.state.chatMessages[0];
    expect(first.content).toBe("hello");
    expect(first.author).toBe(host.sessionId);

    await sendAndWait(host, "send-message", [host, second], "putain");
    const flagged =
      second.state.chatMessages[second.state.chatMessages.length - 1];
    expect(flagged.content).not.toBe("putain");
    expect(flagged.content).toContain("*");
  });

  it("should ignore a seat request when the chosen color is out of range", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const serverRoom = app.getRoomById<NormalRoom>(host.roomId);
    const state = host.state as State;

    for (const color of [4, -1, 9]) {
      const handled = serverRoom.waitForMessage("join-color");
      host.send("join-color", color);
      await handled;
    }

    expect(state.players.every((seat) => seat === "")).toBe(true);
    expect(state.spectators.has(host.sessionId)).toBe(true);
  });

  it("should ignore a move sent by a spectator", async () => {
    const host = await app.sdk.joinOrCreate("Normal", { name: "Alice" });
    sdkRooms.push(host);
    await host.waitForInitialState();
    const second = await joinSecond(host);
    await seatBoth(host, second);
    const spectator = await app.sdk.joinById(host.roomId, { name: "Carol" });
    sdkRooms.push(spectator);
    await spectator.waitForInitialState();
    const serverRoom = app.getRoomById<NormalRoom>(host.roomId);

    const handled = serverRoom.waitForMessage("play-piece");
    spectator.send("play-piece", 3);
    await handled;

    expect([...host.state.board].every((cell) => cell === -1)).toBe(true);
    expect(second.state.turn).toBe(0);
  });
});
