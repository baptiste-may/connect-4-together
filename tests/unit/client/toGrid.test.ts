import { describe, expect, it } from "@jest/globals";
import { toGrid } from "@/libs/room";

describe("toGrid", () => {
  it("should return an empty 6×7 grid when the board is fresh", () => {
    const grid = toGrid([]);

    expect(grid).toHaveLength(6);
    for (const row of grid) {
      expect(row).toHaveLength(7);
      expect(row).toEqual(Array(7).fill(-1));
    }
  });

  it("should map row-major indices to grid[y][x] when the board is filled", () => {
    const board = Array.from({ length: 42 }, (_, i) => i);

    const grid = toGrid(board);

    expect(grid[0][0]).toBe(0);
    expect(grid[0][6]).toBe(6);
    expect(grid[1][0]).toBe(7);
    expect(grid[5][0]).toBe(35);
    expect(grid[5][6]).toBe(41);
  });

  it("should treat cells past the end of the board as empty when they fall outside the grid", () => {
    const board = Array(35).fill(-1);
    board[34] = 2;

    const grid = toGrid(board);

    expect(grid[4][6]).toBe(2);
    expect(grid[5]).toEqual(Array(7).fill(-1));
  });

  it("should fall back to -1 when the board contains holes", () => {
    const board: number[] = [0];
    board.length = 42;

    const grid = toGrid(board);

    expect(grid[0][0]).toBe(0);
    expect(grid[5][6]).toBe(-1);
  });
});
