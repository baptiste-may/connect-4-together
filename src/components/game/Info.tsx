import {Alert} from "react-daisyui";
import {useGameData} from "@/components/Game";
import {Award, Ban, CircleCheck, Crown, Frown, Loader, Lock, LucideIcon, Pause, Play} from "lucide-react";

function Component({status, Icon, title, subtitle}: {
    status?: "success" | "info" | "warning" | "error";
    Icon: LucideIcon;
    title: string;
    subtitle: string;
}) {
    return (
        <Alert status={status} className="fixed left-1/2 top-1 -translate-x-1/2 shadow-xl w-fit">
            <Icon className="w-12 h-12 sm:w-8 sm:h-8" strokeWidth={3}/>
            <div>
                <h3 className="font-bold">{title}</h3>
                <div className="text-xs">{subtitle}</div>
            </div>
        </Alert>
    );
}

export default function Info() {

    const {isYourTurn, yourColor, isAPlayer, nbPlayers, winner, getName, grid, room} = useGameData();

    if (winner !== "") {
        if (winner === room.sessionId) return <Component
            status="success" Icon={Award}
            title="Bravo !"
            subtitle="Vous avez gagné la partie !"
        />;
        if (yourColor !== -1) return <Component
            status="error" Icon={Frown}
            title="Dommage !"
            subtitle={`${getName(winner)} a gagné la partie !`}
        />;
        return <Component
            status="success" Icon={Crown}
            title="Partie finie !"
            subtitle={`${getName(winner)} a gagné la partie !`}
        />;
    }

    if (!isAPlayer) {
        if (nbPlayers >= 4) return <Component
            status="warning" Icon={Lock}
            title="Partie pleine !"
            subtitle="Vous pouvez tout de même observer la partie"
        />;
        return <Component
            status="success" Icon={CircleCheck}
            title="Prêt à commencer !"
            subtitle="Vous pouvez choisir votre couleur."
        />;
    }

    if (!grid.map(row => row.includes(-1)).includes(true)) return <Component
        status="warning"
        title="Partie nulle !"
        subtitle="Vous avez fait une égalité !"
        Icon={Ban}/>;

    if (nbPlayers < 2) return <Component
        status="warning" Icon={Loader}
        title="Vous êtes tout seul !"
        subtitle="En attente de joueurs..."
    />;

    if (isYourTurn) return <Component
        status="success" Icon={Play}
        title="A vous de jouer !"
        subtitle="C'est votre tour ! Selectionnez une colonne."
    />;
    return <Component
        status="error" Icon={Pause}
        title="Ce n'est pas à vous de jouer !"
        subtitle="En attente de votre tour..."
    />;
}