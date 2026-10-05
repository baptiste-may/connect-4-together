import Case from "@/components/game/content/Case";
import { useMemo, useState } from "react";
import { useGameData } from "@/components/Game";

export default function Grid() {
  const { room, yourColor, isYourTurn, nbPlayers, winner, grid } =
    useGameData();

  const [selectedColumn, setSelectedColumn] = useState<null | number>(null);

  // Derived from `selectedColumn` and `grid`, so there is no reason to keep it
  // in state nor to synchronize it in an effect.
  const selectedCase = useMemo<null | [number, number]>(() => {
    if (selectedColumn === null) return null;
    let i = grid.length - 1;
    while (i >= 0 && grid[i][selectedColumn] !== -1) i--;
    if (i < 0) return null;
    return [i, selectedColumn];
  }, [selectedColumn, grid]);

  return (
    <div className="relative grid aspect-[7/6] w-[99vmin] grid-cols-7 grid-rows-6 rounded-2xl border-4 border-blue-800 bg-blue-600">
      {grid.map((row, i) =>
        row.map((value, j) => {
          const isSelectedCase =
            nbPlayers >= 2 &&
            isYourTurn &&
            winner === "" &&
            selectedCase !== null &&
            i === selectedCase[0] &&
            j === selectedCase[1];
          return (
            <Case
              key={`${i}-${j}`}
              color={isSelectedCase ? yourColor : value}
              hoved={isSelectedCase}
            />
          );
        }),
      )}
      <div
        className="absolute left-0 top-0 grid h-full w-full grid-cols-7"
        onMouseLeave={() => {
          setSelectedColumn(null);
        }}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <div
            key={i}
            className="h-full w-full"
            onMouseEnter={() => {
              setSelectedColumn(i);
            }}
            onClick={() => {
              setSelectedColumn(null);
              room.send("play-piece", i);
            }}
          />
        ))}
      </div>
    </div>
  );
}
