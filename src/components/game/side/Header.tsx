import RoomId from "@/components/game/side/header/RoomId";
import LeaveButton from "@/components/game/side/header/LeaveButton";
import {useGameData} from "@/components/Game";
import SkipButton from "@/components/game/side/header/SkipButton";
import RoomType from "@/components/game/side/header/RoomType";
import {Card} from "react-daisyui";

export default function Header() {

    const {room} = useGameData();

    return (
        <Card className="bg-base-200 rounded-none lg:rounded-lg">
            <Card.Body>
                <RoomType/>
                <RoomId id={room.id}/>
                <div className="divider m-0"/>
                <SkipButton/>
                <LeaveButton/>
            </Card.Body>
        </Card>
    );
}