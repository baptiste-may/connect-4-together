"use client";

import {useName} from "@/components/providers/NameProvider";
import {useEffect, useState} from "react";
import {Room} from "colyseus.js";
import {useClient} from "@/components/providers/ClientProvider";
import Game from "@/components/Game";
import {Button, Card, Divider, Hero} from "react-daisyui";
import JoinModal from "@/components/modals/JoinModal";
import RoomsModal from "@/components/modals/RoomsModal";
import {useToast} from "@/components/providers/ToastProvider";
import {CircleX, Logs, Play, Plus, Search} from "lucide-react";
import Settings from "@/components/Settings";

export default function Page() {

    const alert = useToast();
    const {name} = useName();
    const client = useClient();

    const [currentRoom, setCurrentRoom] = useState<undefined | Room>(undefined);
    const [joinModalOpen, setJoinModalOpen] = useState(false);
    const [roomsModalOpen, setRoomsModalOpen] = useState(false);

    useEffect(() => {
        if (currentRoom === undefined) {
            const reconnectionToken = localStorage.getItem("reconnectionToken");
            if (reconnectionToken !== null) {
                client.reconnect(reconnectionToken)
                    .then(room => setCurrentRoom(room))
                    .catch(() => localStorage.removeItem("reconnectionToken"));
            }
        }
        else localStorage.setItem("reconnectionToken", currentRoom.reconnectionToken);
    }, [currentRoom]);

    return (
        <>
            <Settings room={currentRoom}/>
            {currentRoom === undefined ? <Hero className="min-h-screen">
                <Hero.Content className="flex-col">
                    <h1 className="text-3xl md:text-5xl font-bold">Connect 4 Together</h1>
                    <h2 className="text-base md:text-xl font-light">{`Bienvenue ${name} !`}</h2>
                    <Card className="bg-base-200">
                        <Card.Body className="grid grid-cols-1 lg:grid-cols-2">
                            <Card.Title className="sm:col-span-2 flex justify-center">Entre amis</Card.Title>
                            <Button color="primary" onClick={() => {
                                client.create("Normal", {
                                    name,
                                    isPrivate: true
                                }).then(room => {
                                    setCurrentRoom(room);
                                }).catch(err => {
                                    alert({
                                        title: "Une erreur est survenue",
                                        subtitle: err.message,
                                        status: "error",
                                        Icon: CircleX
                                    });
                                });
                            }}>
                                <Plus/>
                                Créer une partie
                            </Button>
                            <Button color="primary" onClick={() => {
                                setJoinModalOpen(true);
                            }}>
                                <Search/>
                                Chercher une partie
                            </Button>
                            <JoinModal isOpen={joinModalOpen}
                                       onClose={() => setJoinModalOpen(false)}
                                       setRoom={room => setCurrentRoom(room)}/>
                            <Divider className="hidden lg:flex col-span-2 my-2"/>
                            <Card.Title className="sm:col-span-2 flex justify-center">En ligne</Card.Title>
                            <Button color="secondary" onClick={() => {
                                client.joinOrCreate("Normal", {
                                    name
                                }).then(room => {
                                    setCurrentRoom(room);
                                }).catch(err => {
                                    alert({
                                        title: "Une erreur est survenue",
                                        subtitle: err.message,
                                        status: "error",
                                        Icon: CircleX
                                    });
                                });
                            }}>
                                <Play/>
                                Rejoindre une partie
                            </Button>
                            <Button color="secondary" onClick={() => setRoomsModalOpen(true)}>
                                <Logs/>
                                Parcourir les parties
                            </Button>
                            <RoomsModal isOpen={roomsModalOpen}
                                        onClose={() => setRoomsModalOpen(false)}
                                        setRoom={room => setCurrentRoom(room)}/>
                        </Card.Body>
                    </Card>
                </Hero.Content>
            </Hero> : <Game room={currentRoom} onLeaveRoom={(intentional: boolean) => {
                currentRoom.removeAllListeners();
                if (intentional) {
                    localStorage.removeItem("reconnectionToken");
                    currentRoom.leave().then(() => {
                        setCurrentRoom(undefined);
                    })
                } else setCurrentRoom(undefined);
            }}/>}
        </>
    );
}