import {Button, Join} from "react-daisyui";
import {useGameData} from "@/components/Game";
import {RotateCw} from "lucide-react";

export default function SkipButton() {

    const {room, nbPlayers, votedForSkip, players} = useGameData();

    return (
        <Join>
            <Button color="neutral" className="join-item grow" onClick={() => room.send("vote-skip")}
                    disabled={votedForSkip.has(room.sessionId) || !players.includes(room.sessionId)}>
                <RotateCw width={16} height={16}/>
                Voter pour Reset
            </Button>
            <div
                className="input input-bordered join-item flex items-center">{`${votedForSkip.size} / ${nbPlayers}`}</div>
        </Join>
    );
}