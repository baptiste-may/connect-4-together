import {colors} from "@/components/game/colors";
import {useGameData} from "@/components/Game";
import {Badge, Button} from "react-daisyui";
import _ from "underscore";
import {Hand} from "lucide-react";

export function Player({name, color, colorId, clientIsPlayer, currentTurn}: {
    name: string;
    color: string;
    colorId: number;
    clientIsPlayer: boolean;
    currentTurn: boolean;
}) {

    const {room} = useGameData();

    if (name === "") return (
        <Button
            size="sm"
            className={`hover:btn-neutral border-${color} hover:border-${color} bg-${color} hover:bg-${color}`}
            onClick={() => {
                room.send("join-color", colorId);
            }}
            disabled={clientIsPlayer}
        >
            Rejoindre
        </Button>
    );

    return (
        <Badge color="primary" size="lg" className={`flex gap-2 h-8 border-${color} bg-${color} rounded-lg`}>
            {currentTurn && <Hand/>}
            {name}
        </Badge>
    );
}

export default function PlayerList() {

    const {room, getName, players, turn} = useGameData();

    return (
        <div className="grid grid-cols-2 gap-4 w-fit">
            {_.range(4).map(i =>
                <Player key={i} name={players[i] === "" ? "" : getName(players[i])} color={colors[i]} colorId={i}
                        clientIsPlayer={players.includes(room.sessionId)} currentTurn={i === turn}/>)}
        </div>
    );
}