import type { Room } from "@colyseus/sdk";
import type { State } from "@/server/rooms/NormalRoom";

/**
 * Shape of the state synchronized by `NormalRoom`, as seen by the client.
 */
export type GameRoomState = State;

/**
 * Client-side handle on a game room, with a typed state.
 * Messages stay untyped (`room.send("update-name", name)`).
 */
export type GameRoom = Room<GameRoomState>;

/**
 * Converts the flat row-major `board` array (7 columns × 6 rows) into a 2D
 * grid indexed `grid[y][x]`. Out-of-range cells fall back to `-1` (empty), so
 * the helper also works on a fresh, not-yet-synced state.
 * @param board Flat board array, row-major (`index = y * 7 + x`).
 * @returns A 6×7 grid of cell colors (`-1` when empty).
 */
export function toGrid(board: readonly number[]): number[][] {
  const grid: number[][] = [];
  for (let y = 0; y < 6; y++) {
    const row: number[] = [];
    for (let x = 0; x < 7; x++) {
      row.push(board[y * 7 + x] ?? -1);
    }
    grid.push(row);
  }
  return grid;
}
