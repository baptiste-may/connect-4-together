import { afterEach, describe, expect, it } from "@jest/globals";
import type { NormalRoom } from "@/server/rooms/NormalRoom";
import type { Client } from "colyseus";
import { createClient, createRoom, disposeRooms, sendMessage } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

/**
 * Creates a room with two identified players: A in slot 0, B in slot 1,
 * A holding the opening turn.
 * @returns The room plus its two players.
 */
async function setupTwoPlayers(): Promise<{
  room: NormalRoom;
  a: Client;
  b: Client;
}> {
  const room = await createRoom();
  const a = createClient("A");
  const b = createClient("B");
  await room.onJoin(a);
  await room.onJoin(b);
  await sendMessage(room, a, "join-color", 0);
  await sendMessage(room, b, "join-color", 1);
  return { room, a, b };
}

/**
 * Reads a board cell by grid coordinates.
 * @param room The room under test.
 * @param row Row index (0 top, 5 bottom).
 * @param column Column index (0-6).
 * @returns The piece color at that position.
 */
function cell(room: NormalRoom, row: number, column: number): number {
  return room.state.board[row * 7 + column];
}

describe("play-piece", () => {
  it("should reject the move when fewer than two players are identified", async () => {
    const room = await createRoom();
    const a = createClient("A");
    await room.onJoin(a);
    await sendMessage(room, a, "join-color", 0);

    await sendMessage(room, a, "play-piece", 0);

    expect(room.state.board.every((c) => c === -1)).toBe(true);
  });

  it("should reject the move when the client is a spectator", async () => {
    const { room, a, b } = await setupTwoPlayers();
    const c = createClient("C");
    await room.onJoin(c);

    await sendMessage(room, c, "play-piece", 0);

    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(a.sessionId).toBe("A");
    expect(b.sessionId).toBe("B");
  });

  it("should reject the move when it is not the player's turn", async () => {
    const { room, b } = await setupTwoPlayers();

    await sendMessage(room, b, "play-piece", 0);

    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(room.state.turn).toBe(0);
  });

  it("should ignore the move when the target column is full", async () => {
    const room = await createRoom();
    for (let row = 0; row < 6; row++) room.state.board[row * 7 + 2] = row % 2;
    const before = [...room.state.board];

    room.playPiece(2, 0);

    expect([...room.state.board]).toEqual(before);
    expect(room.state.winner).toBe("");
  });

  it("should drop the piece to the bottom of the column and pass the turn when the move is legal", async () => {
    const { room, a } = await setupTwoPlayers();

    await sendMessage(room, a, "play-piece", 3);

    expect(cell(room, 5, 3)).toBe(0);
    expect(cell(room, 4, 3)).toBe(-1);
    expect(room.state.turn).toBe(1);
  });

  it("should stack the pieces when the same column is played twice", async () => {
    const { room, a, b } = await setupTwoPlayers();

    await sendMessage(room, a, "play-piece", 0);
    await sendMessage(room, b, "play-piece", 0);
    await sendMessage(room, a, "play-piece", 0);

    expect(cell(room, 5, 0)).toBe(0);
    expect(cell(room, 4, 0)).toBe(1);
    expect(cell(room, 3, 0)).toBe(0);
    expect(room.state.turn).toBe(1);
  });

  it("should reject the move without touching the board when the column is out of range", async () => {
    const { room, a } = await setupTwoPlayers();

    for (const column of [-1, 7, 100, "abc"]) {
      await sendMessage(room, a, "play-piece", column);
    }

    expect(room.state.board.every((x) => x === -1)).toBe(true);
  });

  it("should declare four in a row and lock the board when the move completes a line", async () => {
    const { room, a, b } = await setupTwoPlayers();

    await sendMessage(room, a, "play-piece", 0);
    await sendMessage(room, b, "play-piece", 1);
    await sendMessage(room, a, "play-piece", 0);
    await sendMessage(room, b, "play-piece", 1);
    await sendMessage(room, a, "play-piece", 0);
    await sendMessage(room, b, "play-piece", 1);
    await sendMessage(room, a, "play-piece", 0);

    expect(room.state.winner).toBe("A");

    // The losing player cannot move once the game is decided.
    await sendMessage(room, b, "play-piece", 2);
    expect(cell(room, 5, 2)).toBe(-1);
  });
});
