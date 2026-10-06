import { describe, expect, it, afterEach } from "@jest/globals";
import { createClient, createRoom, disposeRooms, sendMessage } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

describe("join-color", () => {
  it("should assign the color and move the client out of spectators when a free color is picked", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);
    expect(room.state.spectators.has("A")).toBe(true);

    await sendMessage(room, a, "join-color", 1);

    expect(room.state.players[1]).toBe("A");
    expect(room.state.spectators.has("A")).toBe(false);
  });

  it("should ignore the choice when the color is already taken", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a);
    await room.onJoin(b);
    await sendMessage(room, a, "join-color", 1);

    await sendMessage(room, b, "join-color", 1);

    expect(room.state.players[1]).toBe("A");
    expect(room.state.players.filter((p) => p !== "")).toHaveLength(1);
    expect(room.state.spectators.has("B")).toBe(true);
  });

  it("should ignore the second choice when the player already picked a color", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);
    await sendMessage(room, a, "join-color", 1);

    await sendMessage(room, a, "join-color", 2);

    expect(room.state.players[1]).toBe("A");
    expect(room.state.players[2]).toBe("");
  });

  it("should ignore the choice when the color is out of range or invalid", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);

    for (const color of [4, -1, "abc", 99]) {
      await sendMessage(room, a, "join-color", color);
    }

    expect(room.state.players.filter((p) => p !== "")).toHaveLength(0);
    expect(room.state.spectators.has("A")).toBe(true);
  });

  it("should leave the turn on an occupied slot when the first player picks a color outside slot 0", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a);
    await room.onJoin(b);

    // A picks a color outside slot 0: the game must start on A's slot.
    await sendMessage(room, a, "join-color", 2);
    expect(room.state.players[room.state.turn]).toBe("A");

    // A second player filling slot 0 must not steal the opening turn.
    await sendMessage(room, b, "join-color", 0);
    expect(room.state.turn).toBe(2);
    expect(room.state.players[room.state.turn]).toBe("A");
  });

  it("should keep the opening turn when the first player picks slot 0", async () => {
    const room = await createRoom();
    const a = createClient("A");
    const b = createClient("B");
    await room.onJoin(a);
    await room.onJoin(b);

    await sendMessage(room, a, "join-color", 0);
    await sendMessage(room, b, "join-color", 1);

    expect(room.state.turn).toBe(0);
    expect(room.state.players[0]).toBe("A");
  });
});
