"use client";

import {useEffect, useState} from "react";
import {Room, RoomAvailable} from "colyseus.js";
import ClientProvider, {useClient} from "@/components/providers/ClientProvider";
import Game from "@/components/Game";
import {Button, Card, Divider, Hero, Loading, Table} from "react-daisyui";
import {useToast} from "@/components/providers/ToastProvider";
import {CircleX, Crown, Dices, ListRestart, LogIn, Play, Plus, Users} from "lucide-react";
import More from "@/components/More";
import {GoogleAnalytics} from "@next/third-parties/google";
import {GOOGLE_ANALYTICS_GA} from "@/libs/static";
import BMCButton from "@/components/BMCButton";
import NameInput from "@/components/NameInput";
import NameProvider, {useName} from "@/components/providers/NameProvider";
import JoinForm from "@/components/JoinForm";

function PageWithHandler() {

    const alert = useToast();
    const {name: username} = useName();
    const {client, isLoading} = useClient();

    const [currentRoom, setCurrentRoom] = useState<undefined | Room>(undefined);
    const [rooms, setRooms] = useState<RoomAvailable[] | undefined>(undefined);

    const updateRooms = () => {
        setRooms(undefined);
        if (isLoading) return;
        client.getAvailableRooms().then(res => {
            setRooms(res);
        });
    };

    useEffect(() => {
        updateRooms();
        if (currentRoom === undefined) {
            const reconnectionToken = localStorage.getItem("reconnectionToken");
            if (reconnectionToken !== null && !isLoading) {
                client.reconnect(reconnectionToken)
                    .then(setCurrentRoom)
                    .catch(() => localStorage.removeItem("reconnectionToken"));
            }
        }
        else localStorage.setItem("reconnectionToken", currentRoom.reconnectionToken);
    }, [client, isLoading, currentRoom]);

    return (
        <>
            <More room={currentRoom}/>
            {currentRoom === undefined ? <Hero className="min-h-screen">
                <Hero.Content className="flex-col">
                    <h1 className="text-3xl md:text-5xl font-bold">Connect 4 Together</h1>
                    <h2 className="flex gap-2 text-base md:text-xl font-light font-mono">
                        <span>Bienvenue</span>
                        <NameInput/>
                        <span>!</span>
                    </h2>
                    <Card className="bg-base-200">
                        <Card.Body>
                            <Card.Title className="flex justify-center">Entre amis</Card.Title>
                            <div className="flex flex-col md:flex-row items-center gap-2">
                                <Button color="primary" disabled={isLoading} className="w-full md:w-auto" onClick={() => {
                                    if (isLoading) return;
                                    client.create("Normal", {
                                        name: username,
                                        isPrivate: true
                                    }).then(setCurrentRoom).catch(err => {
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
                                <JoinForm setRoom={setCurrentRoom}/>
                            </div>
                            <Divider className="flex my-2"/>
                            <Card.Title className="flex justify-center">En ligne</Card.Title>
                            <div className="flex gap-2 mb-2">
                                <Button color="secondary" disabled={isLoading} className="grow" onClick={() => {
                                    if (isLoading) return;
                                    client.joinOrCreate("Normal", {
                                        name: username
                                    }).then(setCurrentRoom).catch(err => {
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
                                <Button shape="square" color="secondary" onClick={updateRooms}>
                                    <ListRestart/>
                                </Button>
                            </div>
                            <div className="flex justify-center">
                                {rooms === undefined ? <Loading variant="dots" size="lg"/> : rooms.length === 0 ?
                                    undefined : <Table>
                                        <Table.Head>
                                            <span className="flex gap-1">
                                                <Dices size={16}/>
                                                Type
                                            </span>
                                            <span className="flex gap-1">
                                                <Crown size={16}/>
                                                Host
                                            </span>
                                            <span className="flex gap-1">
                                                <Users size={16}/>
                                                Joueurs
                                            </span>
                                        </Table.Head>
                                        <Table.Body>
                                            {rooms.map(({roomId, name, clients, maxClients, metadata}) => <Table.Row hover key={roomId}>
                                                <span>{name}</span>
                                                <span>{metadata.host}</span>
                                                <span>{`${clients} / ${maxClients}`}</span>
                                                <Button color="secondary" size="sm" disabled={isLoading} shape="square" onClick={() => {
                                                    if (isLoading) return;
                                                    client.joinById(roomId, {
                                                        name: username
                                                    }).then(setCurrentRoom);
                                                }}>
                                                    <LogIn size={16}/>
                                                </Button>
                                            </Table.Row>)}
                                        </Table.Body>
                                    </Table>}
                            </div>
                        </Card.Body>
                    </Card>
                    <BMCButton/>
                    <hr className="h-8"/>
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

export default function Page() {
    return (
        <>
            <GoogleAnalytics gaId={GOOGLE_ANALYTICS_GA}/>
            <ClientProvider>
                <NameProvider>
                    <PageWithHandler/>
                </NameProvider>
            </ClientProvider>
        </>
    );
}