import {Button, Loading, Modal, Table} from "react-daisyui";
import {Room, RoomAvailable} from "colyseus.js";
import {useEffect, useState} from "react";
import {useClient} from "@/components/providers/ClientProvider";
import {useName} from "@/components/providers/NameProvider";
import {ListRestart, Logs, X} from "lucide-react";

export default function RoomsModal({isOpen, onClose, setRoom}: {
    isOpen: boolean;
    onClose: () => void;
    setRoom: (room: Room) => void;
}) {

    const clientName = useName().name;
    const client = useClient();

    const [rooms, setRooms] = useState<RoomAvailable[] | undefined>(undefined);

    const updateRooms = () => {
        if (!isOpen) return;
        setRooms(undefined);
        client.getAvailableRooms().then(res => {
            setRooms(res);
        });
    };

    useEffect(() => {
        updateRooms();
    }, [isOpen]);

    return (
        <Modal.Legacy open={isOpen} onClickBackdrop={onClose} responsive className="!w-full md:!max-w-xl">
            <Button size="sm" color="ghost" shape="square" className="absolute right-2 top-2" onClick={onClose}>
                <X/>
            </Button>
            <Modal.Header className="flex gap-2 font-bold">
                <Logs strokeWidth={3}/>
                <span>Liste des parties</span>
                <Button shape="square" color="primary" size="sm" onClick={updateRooms}>
                    <ListRestart/>
                </Button>
            </Modal.Header>
            <Modal.Body className="flex justify-center">
                {rooms === undefined ? <Loading variant="dots" size="lg"/> : rooms.length === 0 ?
                    <span>Aucune partie disponible</span> : <Table>
                        <Table.Head>
                            <span>ID</span>
                            <span>Type</span>
                            <span>Host</span>
                            <span>Joueurs</span>
                            <span></span>
                        </Table.Head>
                        <Table.Body>
                            {rooms.map(({roomId, name, clients, maxClients, metadata}) => <Table.Row hover key={roomId}>
                                <span>{roomId}</span>
                                <span>{name}</span>
                                <span>{metadata.host}</span>
                                <span>{`${clients} / ${maxClients}`}</span>
                                <Button color="primary" size="sm" className="w-min" onClick={() => {
                                    client.joinById(roomId, {
                                        name: clientName
                                    }).then(room => {
                                        setRoom(room);
                                    });
                                }}>Rejoindre</Button>
                            </Table.Row>)}
                        </Table.Body>
                    </Table>}
            </Modal.Body>
        </Modal.Legacy>
    );
}