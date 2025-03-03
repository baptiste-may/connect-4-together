import Case from "@/components/game/content/Case";
import {useEffect, useState} from "react";
import {useGameData} from "@/components/Game";

export default function Grid() {

    const {room, yourColor, isYourTurn, nbPlayers, winner} = useGameData();

    const [grid, setGrid] = useState<number[][]>([
        [-1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1],
        [-1, -1, -1, -1, -1, -1, -1],
    ]);
    const [selectedColumn, setSelectedColumn] = useState<null | number>(null);
    const [selectedCase, setSelectedCase] = useState<null | [number, number]>(null);

    useEffect(() => {
        room.state.board.onChange((color: number, id: number) => {
            const x = id % 7;
            const y = Math.floor(id / 7);
            setGrid(prev => {
                const newGrid = [...prev];
                newGrid[y][x] = color;
                return newGrid;
            });
        });
    }, [room]);

    useEffect(() => {
        if (selectedColumn === null) return setSelectedCase(null);
        let i = grid.length - 1;
        while (i >= 0 && grid[i][selectedColumn] !== -1) i--;
        if (i < 0) return setSelectedCase(null);
        setSelectedCase([i, selectedColumn]);
    }, [selectedColumn, grid]);

    return (
        <div
            className="relative grid grid-cols-7 grid-rows-6 bg-blue-600 border-4 border-blue-800 rounded-2xl w-full 2xl:w-auto h-auto 2xl:h-full aspect-[7/6] overflow-y-auto">
            {grid.map((row, i) => row.map((value, j) => {
                const isSelectedCase = nbPlayers >= 2 && isYourTurn && winner === -1 && selectedCase !== null && i === selectedCase[0] && j === selectedCase[1];
                return (
                    <Case key={`${i}-${j}`} color={isSelectedCase ? yourColor : value}
                          hoved={isSelectedCase}/>
                );
            }))}
            <div className="absolute left-0 top-0 grid grid-cols-7 w-full h-full" onMouseLeave={() => {
                setSelectedColumn(null);
            }} onClick={() => {
                if (selectedColumn === null) return;
                setSelectedColumn(null);
                room.send("play-piece", selectedColumn);
            }}>
                {Array(7).keys().toArray().map(i =>
                    <div key={i} className="w-full h-full"
                         onMouseEnter={() => {
                             setSelectedColumn(i);
                         }}/>)}
            </div>
        </div>
    );
}