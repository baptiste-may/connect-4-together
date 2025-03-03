import {Button, Input, Join, Modal} from "react-daisyui";
import {useClient} from "@/components/providers/ClientProvider";
import {useState} from "react";
import {Room} from "colyseus.js";
import {useName} from "@/components/providers/NameProvider";
import {useToast} from "@/components/providers/ToastProvider";
import {LogIn, Search, ShieldQuestion, X} from "lucide-react";

export default function JoinModal({isOpen, onClose, setRoom}: {
    isOpen: boolean;
    onClose: () => void;
    setRoom: (room: Room) => void;
}) {

    const alert = useToast();
    const {name} = useName();
    const client = useClient();

    const [inputValue, setInputValue] = useState("");
    const [inputError, setInputError] = useState(false);

    return (
        <Modal.Legacy open={isOpen} onClickBackdrop={onClose} responsive>
            <Button size="sm" color="ghost" shape="square" className="absolute right-2 top-2" onClick={onClose}>
                <X/>
            </Button>
            <Modal.Header className="flex gap-2 font-bold">
                <Search strokeWidth={3}/>
                Chercher une partie
            </Modal.Header>
            <Modal.Body>
                <form onSubmit={e => {
                    e.preventDefault();
                    client.joinById(inputValue, {
                        name
                    }).then(room => {
                        setRoom(room);
                        onClose();
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
                               className="join-item" onChange={e => {
                            setInputValue(e.target.value);
                            setInputError(false);
                        }}/>
                        <Button color="primary" type="submit" className="join-item">
                            <LogIn/>
                            Rejoindre
                        </Button>
                    </Join>
                    <p className="text-red-500">{inputError ? "Partie introuvable" : ""}</p>
                </form>
            </Modal.Body>
        </Modal.Legacy>
    );
}