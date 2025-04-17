import {useGameData} from "@/components/Game";
import {Badge} from "react-daisyui";

export default function SpectatorList() {

    const {getName, spectators} = useGameData();

    return (
        <div className="grid grid-cols-2 gap-4 w-full">
            {[...spectators].map(id =>
                <Badge key={id} color="neutral" size="lg" className="w-full h-8">{getName(id)}</Badge>)}
        </div>
    );
}