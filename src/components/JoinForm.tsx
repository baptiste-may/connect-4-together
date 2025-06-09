import {LogIn, ShieldQuestion} from "lucide-react";
import {Button, Input, Join} from "react-daisyui";
import {useToast} from "@/components/providers/ToastProvider";
import {useName} from "@/components/providers/NameProvider";
import {useClient} from "@/components/providers/ClientProvider";
import {useState} from "react";
import {Room} from "colyseus.js";

export default function JoinForm({setRoom}: {
    setRoom: (room: Room) => void;
}) {

    const alert = useToast();
    const {name} = useName();
    const {client, isLoading} = useClient();

    const [inputValue, setInputValue] = useState("");
    const [inputError, setInputError] = useState(false);

    return (
        <form onSubmit={e => {
            e.preventDefault();
            if (isLoading) return;
            client.joinById(inputValue, {
                name
            }).then(room => {
                setRoom(room);
            }).catch(() => {
                setInputError(true);
                alert({
                    title: "La partie n'existe pas.",
                    status: "error",
                    Icon: ShieldQuestion
                });
            });
        }}>
            <Join>
                <Input color={inputError ? "error" : "primary"} placeholder="XXXXXX" maxLength={6}
                       className="join-item font-mono placeholder:font-mono w-24" onChange={e => {
                    setInputValue(e.target.value);
                    setInputError(false);
                }}/>
                <Button color="primary" type="submit" className="join-item" disabled={isLoading}>
                    <LogIn/>
                    Rejoindre
                </Button>
            </Join>
        </form>
    );
}