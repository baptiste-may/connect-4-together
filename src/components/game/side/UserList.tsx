import PlayerList from "@/components/game/side/userList/PlayerList";
import SpectatorList from "@/components/game/side/userList/SpectatorList";
import {Binoculars, Users} from "lucide-react";
import {Card} from "react-daisyui";

export default function UserList() {
    return (
        <Card className="bg-base-200 grow rounded-none lg:rounded-lg">
            <Card.Body className="grow-0">
                <Card.Title>
                    <Users strokeWidth={3}/>
                    Joueurs
                </Card.Title>
                <PlayerList/>
                <Card.Title>
                    <Binoculars strokeWidth={3}/>
                    Spectateurs
                </Card.Title>
                <SpectatorList/>
            </Card.Body>
        </Card>
    );
}