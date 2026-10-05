import { Callbacks } from "@colyseus/schema";
import type { GameRoom } from "@/libs/room";
import Side from "@/components/game/Side";
import Content from "@/components/game/Content";
import { createContext, useContext, useEffect, useState } from "react";
import Info from "@/components/game/Info";
import { Button, Drawer, Indicator } from "react-daisyui";
import { ChevronRight, X } from "lucide-react";

const GameContext = createContext<
  | undefined
  | {
      room: GameRoom;
      host: string;
      playerNames: Record<string, string>;
      onLeaveRoom: (intentional: boolean) => void;
      getName: (id: string) => string;
      spectators: Set<string>;
      players: string[];
      chatMessages: {
        content: string;
        author: string;
      }[];
      turn: number;
      winner: string;
      yourColor: number;
      isYourTurn: boolean;
      nbPlayers: number;
      isAPlayer: boolean;
      votedForSkip: Set<string>;
      isPrivate: boolean;
      grid: number[][];
    }
>(undefined);

export default function Game({
  room,
  onLeaveRoom,
}: {
  room: GameRoom;
  onLeaveRoom: (intentional: boolean) => void;
}) {
  const [host, setHost] = useState("");
  const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
  const [spectators, setSpectators] = useState<Set<string>>(new Set<string>());
  const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
  const [chatMessages, setChatMessages] = useState<
    {
      content: string;
      author: string;
    }[]
  >([]);
  const [turn, setTurn] = useState(0);
  const [winner, setWinner] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [votedForSkip, setVotedForSkip] = useState<Set<string>>(
    new Set<string>(),
  );
  const [isPrivate, setIsPrivate] = useState(true);
  const [grid, setGrid] = useState<number[][]>([
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1],
    [-1, -1, -1, -1, -1, -1, -1],
  ]);

  const [chatRoomId, setChatRoomId] = useState(room.roomId);

  // Reset the chat during render when the room changes, instead of clearing it
  // inside the subscription effect (which would cause a cascading render).
  if (chatRoomId !== room.roomId) {
    setChatRoomId(room.roomId);
    setChatMessages([]);
  }

  useEffect(() => {
    const unsubs: Array<() => void> = [];
    const callbacks = Callbacks.get(room);

    unsubs.push(
      callbacks.listen("host", (value: string) => setHost(value), true),
    );
    unsubs.push(
      callbacks.listen("turn", (value: number) => setTurn(value), true),
    );
    unsubs.push(
      callbacks.listen("winner", (value: string) => setWinner(value), true),
    );
    unsubs.push(
      callbacks.listen(
        "isPrivate",
        (value: boolean) => setIsPrivate(value),
        true,
      ),
    );

    unsubs.push(
      callbacks.onAdd(
        "playerNames",
        (name: string, id: string) =>
          setPlayerNames((prev) => {
            const newNames = { ...prev };
            newNames[id] = name;
            return newNames;
          }),
        true,
      ),
    );

    unsubs.push(
      callbacks.onRemove("playerNames", (_: string, id: string) =>
        setPlayerNames((prev) => {
          const newNames = { ...prev };
          delete newNames[id];
          return newNames;
        }),
      ),
    );

    unsubs.push(
      callbacks.onChange("playerNames", (id: string, name: string) =>
        setPlayerNames((prev) => {
          const newNames = { ...prev };
          newNames[id] = name;
          return newNames;
        }),
      ),
    );

    unsubs.push(
      callbacks.onAdd(
        "spectators",
        (name: string) =>
          setSpectators((prev) => {
            const newSpects = new Set(prev);
            newSpects.add(name);
            return newSpects;
          }),
        true,
      ),
    );

    unsubs.push(
      callbacks.onRemove("spectators", (name: string) =>
        setSpectators((prev) => {
          const newSpects = new Set(prev);
          newSpects.delete(name);
          return newSpects;
        }),
      ),
    );

    unsubs.push(
      callbacks.onChange("players", (index: number, value: string) =>
        setPlayers((prev) => {
          const newPlayers = [...prev];
          newPlayers[index] = value;
          return newPlayers;
        }),
      ),
    );

    unsubs.push(
      callbacks.onAdd(
        "chatMessages",
        (value: { content: string; author: string }) =>
          setChatMessages((prev) => [...prev, value]),
        true,
      ),
    );

    unsubs.push(
      callbacks.onAdd(
        "votedForSkip",
        (name: string) =>
          setVotedForSkip((prev) => {
            const newVotedForSkip = new Set(prev);
            newVotedForSkip.add(name);
            return newVotedForSkip;
          }),
        true,
      ),
    );

    unsubs.push(
      callbacks.onRemove("votedForSkip", (name: string) =>
        setVotedForSkip((prev) => {
          const newVotedForSkip = new Set(prev);
          newVotedForSkip.delete(name);
          return newVotedForSkip;
        }),
      ),
    );

    const onLeaveCallback = () => onLeaveRoom(false);
    const leaveUnsub = room.onLeave(onLeaveCallback);
    unsubs.push(() => leaveUnsub.remove(onLeaveCallback));

    unsubs.push(
      callbacks.onChange("board", (index: number, color: number) => {
        const x = index % 7;
        const y = Math.floor(index / 7);
        setGrid((prev) => {
          const newGrid = [...prev];
          newGrid[y][x] = color;
          return newGrid;
        });
      }),
    );

    return () => {
      unsubs.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    };
  }, [room, onLeaveRoom]);

  const getName = (id: string) => {
    if (playerNames.hasOwnProperty(id)) return playerNames[id];
    return "Joueur " + id;
  };

  const yourColor = players.indexOf(room.sessionId);
  const isYourTurn = yourColor === turn;

  const nbPlayers = players.filter((e) => e !== "").length;
  const isAPlayer = players.includes(room.sessionId);

  const toggleDrawer = () => setDrawerOpen((prev) => !prev);

  return (
    <GameContext.Provider
      value={{
        room,
        host,
        playerNames,
        onLeaveRoom,
        getName,
        spectators,
        players,
        chatMessages,
        turn,
        winner,
        yourColor,
        isYourTurn,
        nbPlayers,
        isAPlayer,
        votedForSkip,
        isPrivate,
        grid,
      }}
    >
      <div className="relative flex h-screen w-screen gap-4 lg:p-4">
        <Drawer
          side={
            <Indicator className="flex h-full flex-col overflow-auto bg-base-200 lg:gap-4 lg:bg-transparent">
              <Indicator.Item className="relative translate-x-2 translate-y-2 sm:absolute sm:-translate-x-2 lg:hidden">
                <Button
                  onClick={toggleDrawer}
                  color="accent"
                  className="w-[calc(100%-16px)] sm:w-12"
                  shape="square"
                >
                  <X />
                </Button>
              </Indicator.Item>
              <Side />
            </Indicator>
          }
          className="h-full overflow-y-auto lg:drawer-open [&>div]:h-screen lg:[&>div]:h-[calc(100vh-32px)]"
          open={drawerOpen}
          onClickOverlay={toggleDrawer}
        >
          <Button
            className="absolute left-2 top-2 lg:hidden"
            onClick={toggleDrawer}
            color="accent"
            shape="square"
          >
            <ChevronRight />
          </Button>
          <Content />
          <Info />
        </Drawer>
      </div>
    </GameContext.Provider>
  );
}

export function useGameData() {
  const context = useContext(GameContext);
  if (context === undefined) throw new Error("GameContext provider not found.");
  return context;
}
