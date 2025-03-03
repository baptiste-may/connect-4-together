import {useGameData} from "@/components/Game";

export default function SpectatorList() {

    const {getName, spectators} = useGameData();

    return (
        <div className="grid grid-cols-2 gap-4 w-fit">
            {[...spectators].map(id =>
                <div key={id} className="badge badge-neutral badge-lg">{getName(id)}</div>)}
        </div>
    );
}