import {useGameData} from "@/components/Game";
import {LogOut} from "lucide-react";
import {Button} from "react-daisyui";

export default function LeaveButton() {

    const {onLeaveRoom} = useGameData();

    return (
        <Button color="error" onClick={() => onLeaveRoom(true)}>
            <LogOut/>
            Quitter la partie
        </Button>
    );
}