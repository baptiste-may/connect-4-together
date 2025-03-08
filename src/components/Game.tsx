import {Room} from "colyseus.js";
import Side from "@/components/game/Side";
import Content from "@/components/game/Content";
import {createContext, useContext, useEffect, useState} from "react";
import Info from "@/components/game/Info";
import {Button, Drawer, Indicator} from "react-daisyui";
import {ChevronRight, X} from "lucide-react";

const GameContext = createContext<undefined | {
    room: Room;
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
    winner: number;
    yourColor: number;
    isYourTurn: boolean;
    nbPlayers: number;
    isAPlayer: boolean;
    votedForSkip: Set<string>;
    isPrivate: boolean;
}>(undefined);

export default function Game({room, onLeaveRoom}: {
    room: Room;
    onLeaveRoom: (intentional: boolean) => void;
}) {

    const [host, setHost] = useState("");
    const [playerNames, setPlayerNames] = useState<Record<string, string>>({});
    const [spectators, setSpectators] = useState<Set<string>>(new Set<string>());
    const [players, setPlayers] = useState<string[]>(["", "", "", ""]);
    const [chatMessages, setChatMessages] = useState<{
        content: string;
        author: string;
    }[]>([]);
    const [turn, setTurn] = useState(0);
    const [winner, setWinner] = useState(-1);
    const [drawerOpen, setDrawerOpen] = useState(true);
    const [votedForSkip, setVotedForSkip] = useState<Set<string>>(new Set<string>());
    const [isPrivate, setIsPrivate] = useState(true);

    useEffect(() => {
        room.state.listen("host", (value: string) => setHost(value));
        room.state.listen("turn", (value: number) => setTurn(value));
        room.state.listen("winner", (value: number) => setWinner(value));
        room.state.listen("isPrivate", (value: boolean) => setIsPrivate(value));

        room.state.playerNames.onAdd((name: string, id: string) => setPlayerNames(prev => {
            const newNames = {...prev};
            newNames[id] = name;
            return newNames;
        }));

        room.state.playerNames.onRemove((_: never, id: string) => setPlayerNames(prev => {
            const newNames = {...prev};
            delete newNames[id];
            return newNames;
        }));

        room.state.playerNames.onChange((name: string, id: string) => setPlayerNames(prev => {
            const newNames = {...prev};
            newNames[id] = name;
            return newNames;
        }));

        room.state.spectators.onAdd((name: string) => setSpectators(prev => {
            const newSpects = new Set(prev);
            newSpects.add(name);
            return newSpects;
        }));

        room.state.spectators.onRemove((name: string) => setSpectators(prev => {
            const newSpects = new Set(prev);
            newSpects.delete(name);
            return newSpects;
        }));

        room.state.players.onChange((value: string, index: number) => setPlayers(prev => {
            const newPlayers = [...prev];
            newPlayers[index] = value;
            return newPlayers;
        }));

        room.state.chatMessages.onAdd((value: {
            content: string;
            author: string;
        }) => setChatMessages(prev => [...prev, value]));

        room.state.votedForSkip.onAdd((name: string) => setVotedForSkip(prev => {
            const newVotedForSkip = new Set(prev);
            newVotedForSkip.add(name);
            return newVotedForSkip;
        }));

        room.state.votedForSkip.onRemove((name: string) => setVotedForSkip(prev => {
            const newVotedForSkip = new Set(prev);
            newVotedForSkip.delete(name);
            return newVotedForSkip;
        }));

        room.onLeave(() => onLeaveRoom(false));
    }, [room, onLeaveRoom]);

    const getName = (id: string) => {
        if (playerNames.hasOwnProperty(id)) return playerNames[id];
        return "Joueur " + id;
    }

    const yourColor = players.indexOf(room.sessionId);
    const isYourTurn = yourColor === turn;

    const nbPlayers = players.filter(e => e !== "").length;
    const isAPlayer = players.includes(room.sessionId);

    const toggleDrawer = () => setDrawerOpen(prev => !prev);

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
                isPrivate
            }}>
            <div className="relative flex gap-4 w-screen h-screen lg:p-4">
                <Drawer side={<Indicator
                    className="flex flex-col lg:gap-4 h-full bg-base-200 lg:bg-transparent overflow-auto">
                    <Indicator.Item className="lg:hidden relative sm:absolute translate-x-2 sm:-translate-x-2 translate-y-2">
                        <Button onClick={toggleDrawer} color="accent" className="w-[calc(100%_-_16px)] sm:w-12" shape="square">
                            <X/>
                        </Button>
                    </Indicator.Item>
                    <Side/>
                </Indicator>}
                        className="lg:drawer-open h-full [&>div]:h-screen lg:[&>div]:h-[calc(100vh_-_32px)] overflow-y-auto"
                        open={drawerOpen} onClickOverlay={toggleDrawer}>
                    <Button className="absolute top-2 left-2 lg:hidden" onClick={toggleDrawer} color="accent" shape="square">
                        <ChevronRight/>
                    </Button>
                    <Content/>
                    <Info/>
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