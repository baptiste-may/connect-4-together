import {colors} from "@/components/game/colors";

export default function Case({color, hoved}: {
    color: number;
    hoved?: boolean;
}) {
    return (
        <div className="flex items-center justify-center">
            <div
                className={`flex w-4/5 h-4/5 rounded-full ${color === -1 ? "bg-base-100" : ("bg-" + colors[color])}${hoved ? "/75" : ""} border-4 border-blue-800 transition-colors`}></div>
        </div>
    );
}