import { afterEach, describe, expect, it } from "@jest/globals";
import { CloseCode } from "colyseus";
import type { NormalRoom } from "@/server/rooms/NormalRoom";
import type { Client } from "colyseus";
import { createClient, createRoom, disposeRooms, sendMessage } from "./harness";

afterEach(async () => {
  await disposeRooms();
});

/**
 * Creates a room with two identified players (A in slot 0, B in slot 1)
 * and lets A place one piece so board resets are observable.
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
  await sendMessage(room, a, "play-piece", 2);
  return { room, a, b };
}

describe("vote-skip", () => {
  it("should ignore the vote when the client has no color", async () => {
    const { room } = await setupTwoPlayers();
    const spectator = createClient("S");
    await room.onJoin(spectator);

    await sendMessage(room, spectator, "vote-skip");

    expect(room.state.votedForSkip.size).toBe(0);
  });

  it("should keep the board when a player still has to vote", async () => {
    const { room, a } = await setupTwoPlayers();

    await sendMessage(room, a, "vote-skip");

    expect(room.state.votedForSkip.size).toBe(1);
    expect(room.state.board.some((x) => x !== -1)).toBe(true);
  });

  it("should reset the board when every player has voted", async () => {
    const { room, a, b } = await setupTwoPlayers();

    await sendMessage(room, a, "vote-skip");
    await sendMessage(room, b, "vote-skip");

    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(room.state.votedForSkip.size).toBe(0);
    expect(room.state.winner).toBe("");
    expect(room.state.players[room.state.turn]).toBe("A");
  });

  it("should recheck the pending votes when a player leaves", async () => {
    const { room, a, b } = await setupTwoPlayers();
    await sendMessage(room, a, "vote-skip");
    expect(room.state.votedForSkip.size).toBe(1);

    await room.onLeave(b, CloseCode.CONSENTED);

    // B left: A's outstanding vote now covers every remaining player.
    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(room.state.votedForSkip.size).toBe(0);
    expect(room.state.players[room.state.turn]).toBe("A");
    expect(a.sessionId).toBe("A");
  });

  it("should drop the leaver's vote when they leave so no reset triggers on their behalf", async () => {
    const { room, b } = await setupTwoPlayers();
    await sendMessage(room, b, "vote-skip");
    expect(room.state.votedForSkip.size).toBe(1);

    await room.onLeave(b, CloseCode.CONSENTED);

    expect(room.state.votedForSkip.size).toBe(0);
    expect(room.state.board.some((x) => x !== -1)).toBe(true);
  });

  it("should reset immediately when the only remaining player votes", async () => {
    const { room, a, b } = await setupTwoPlayers();
    await room.onLeave(b, CloseCode.CONSENTED);

    await sendMessage(room, a, "vote-skip");

    expect(room.state.board.every((x) => x === -1)).toBe(true);
    expect(room.state.votedForSkip.size).toBe(0);
  });
});
