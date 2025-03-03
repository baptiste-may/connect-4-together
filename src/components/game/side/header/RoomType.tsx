import {useGameData} from "@/components/Game";
import {Lock, Unlock} from "lucide-react";
import {Button} from "react-daisyui";

export default function RoomType() {

    const {room, isPrivate, host} = useGameData();

    return (
        <h1 className="card-title">
            <span>{`Type: ${room.name}`}</span>
            {host === room.sessionId ? <Button color={isPrivate ? "warning" : "success"} shape="square" size="sm"
                                               onClick={() => room.send("set-lock", !isPrivate)}>
                {isPrivate ? <Lock/> : <Unlock/>}
            </Button> : undefined}
        </h1>
    );
}