import Header from "@/components/game/side/Header";
import Chat from "@/components/game/side/Chat";
import UserList from "@/components/game/side/UserList";
import {Divider} from "react-daisyui";

export default function Side() {
    return (
        <>
            <Header/>
            <Divider className="my-0 lg:hidden"/>
            <UserList/>
            <Divider className="my-0 lg:hidden"/>
            <Chat/>
        </>
    );
}