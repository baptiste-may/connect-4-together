import {colors} from "@/components/game/colors";
import {useGameData} from "@/components/Game";
import {Badge, Button} from "react-daisyui";

export function Player({name, color, colorId, clientIsPlayer}: {
    name: string;
    color: string;
    colorId: number;
    clientIsPlayer: boolean;
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
        <Badge color="primary" size="lg" className={`h-8 border-${color} bg-${color} rounded-lg`}>
            {name}
        </Badge>
    );
}

export default function PlayerList() {

    const {room, getName, players} = useGameData();

    return (
        <div className="grid grid-cols-2 gap-4 w-fit">
            {Array(4).keys().toArray().map(i =>
                <Player key={i} name={players[i] === "" ? "" : getName(players[i])} color={colors[i]} colorId={i}
                        clientIsPlayer={players.includes(room.sessionId)}/>)}
        </div>
    );
}