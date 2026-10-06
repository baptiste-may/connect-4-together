import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { CloseCode } from "colyseus";
import { listRooms } from "@/server/rooms/registry";
import { createClient, createRoom, disposeRooms, sendMessage } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

describe("room lifecycle", () => {
  it("should initialize a clean game state when the room is created", async () => {
    const room = await createRoom();

    expect(room.roomId).toMatch(/^[A-Z0-9]{6}$/);
    expect(room.roomName).toBe("Normal");
    expect(room.maxClients).toBe(8);
    expect(room.state.board).toHaveLength(42);
    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(room.state.players).toHaveLength(4);
    expect(room.state.players.every((p) => p === "")).toBe(true);
    expect(room.state.host).toBe("");
    expect(room.state.turn).toBe(0);
    expect(room.state.winner).toBe("");
    expect(room.state.isPrivate).toBe(false);
    expect(room.metadata?.host).toBe("");
  });

  it("should make the first joiner the host and record their name when they join", async () => {
    const room = await createRoom();
    await room.onJoin(createClient("HOST1"), { name: "Alice" });

    expect(room.state.host).toBe("HOST1");
    expect(room.state.playerNames.get("HOST1")).toBe("Alice");
    expect(room.metadata?.host).toBe("Alice");
    expect(room.state.spectators.has("HOST1")).toBe(true);
  });

  it("should keep the original host when a second client joins", async () => {
    const room = await createRoom();
    await room.onJoin(createClient("HOST1"), { name: "Alice" });
    await room.onJoin(createClient("OTHER"), { name: "Bob" });

    expect(room.state.host).toBe("HOST1");
    expect(room.metadata?.host).toBe("Alice");
  });

  it("should fall back to a generated name when none is provided", async () => {
    const room = await createRoom();
    await room.onJoin(createClient("S1"));
    await room.onJoin(createClient("S2"), { name: "   " });

    expect(room.state.playerNames.get("S1")).toBe("Joueur S1");
    expect(room.state.playerNames.get("S2")).toBe("Joueur S2");
  });

  it("should honour the private-room option when the host creates the room with it", async () => {
    const room = await createRoom();
    await room.onJoin(createClient("HOST1"), {
      name: "Alice",
      isPrivate: true,
    });

    expect(room.state.isPrivate).toBe(true);
    expect(listRooms().some((l) => l.roomId === room.roomId)).toBe(false);
  });

  it("should free the player slot and the spectator seat when a client leaves", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a);
    await room.onJoin(b);
    await sendMessage(room, a, "join-color", 0);

    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.players[0]).toBe("");
    expect(room.state.spectators.has("A")).toBe(false);
    expect(b.sessionId).toBe("B");
  });
  it("should advance the turn when the player holding it leaves", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a);
    await room.onJoin(b);
    await sendMessage(room, a, "join-color", 0);
    await sendMessage(room, b, "join-color", 1);

    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.turn).toBe(1);
    expect(room.state.players[1]).toBe("B");
  });

  it("should hand the host seat to the next remaining player when the host leaves", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a, { name: "Alice" });
    await room.onJoin(b, { name: "Bob" });
    await sendMessage(room, b, "join-color", 1);

    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.host).toBe("B");
    expect(room.metadata?.host).toBe("Bob");
  });

  it("should hand the host seat to a spectator when no players remain", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a, { name: "Alice" });
    await room.onJoin(b, { name: "Bob" });

    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.host).toBe("B");
    expect(room.metadata?.host).toBe("Bob");
  });

  it("should clear the host seat when the room empties", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a, { name: "Alice" });

    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.host).toBe("");
    expect(room.metadata?.host).toBe("");
    expect(
      listRooms().find((l) => l.roomId === room.roomId)?.metadata.host,
    ).toBe("");
  });

  it("should clear the skip vote of the leaver when they leave", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);
    await room.onLeave(a, CloseCode.CONSENTED);

    expect(room.state.votedForSkip.size).toBe(0);
  });

  it("should keep the seat while waiting for a reconnection when a client drops", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);
    const allowReconnection = jest
      .spyOn(room, "allowReconnection")
      .mockResolvedValue(createClient("A"));

    await room.onLeave(a);

    expect(allowReconnection).toHaveBeenCalledWith(a, 5);
    expect(room.state.spectators.has("A")).toBe(true);
  });
});
