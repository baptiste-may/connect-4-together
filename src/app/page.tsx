"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { type RoomAvailable } from "@colyseus/sdk";
import type { GameRoom, GameRoomState } from "@/libs/room";
import ClientProvider, {
  useClient,
} from "@/components/providers/ClientProvider";
import { Button, Card, Divider, Hero, Loading, Table } from "react-daisyui";
import { useToast } from "@/components/providers/ToastProvider";
import { thrownErrorMessage } from "@/libs/errors";
import {
  CircleX,
  Crown,
  Dices,
  ListRestart,
  LogIn,
  Play,
  Plus,
  Users,
} from "lucide-react";
import More from "@/components/More";
import { GoogleAnalytics } from "@next/third-parties/google";
import { GOOGLE_ANALYTICS_GA } from "@/libs/static";
import BMCButton from "@/components/BMCButton";
import NameInput from "@/components/NameInput";
import NameProvider, { useName } from "@/components/providers/NameProvider";
import JoinForm from "@/components/JoinForm";

const Game = dynamic(() => import("@/components/Game"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-base-100">
      <Loading variant="dots" size="lg" />
    </div>
  ),
});

function PageWithHandler() {
  const alert = useToast();
  const { name: username } = useName();
  const { client, isLoading, rooms: initialRooms } = useClient();

  const [currentRoom, setCurrentRoom] = useState<undefined | GameRoom>(
    undefined,
  );
  const [refreshedRooms, setRefreshedRooms] = useState<
    RoomAvailable[] | undefined
  >(undefined);

  const rooms = refreshedRooms ?? initialRooms;

  const updateRooms = useCallback(() => {
    if (isLoading) return;
    setRefreshedRooms(undefined);
    fetch("/api/rooms")
      .then((res) => {
        if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
        return res.json() as Promise<RoomAvailable[]>;
      })
      .then(setRefreshedRooms)
      .catch(() => undefined);
  }, [isLoading]);

  const reportError = useCallback(
    (err: unknown) => {
      alert({
        title: "Une erreur est survenue",
        subtitle: thrownErrorMessage(err),
        status: "error",
        Icon: CircleX,
      });
    },
    [alert],
  );

  useEffect(() => {
    if (isLoading) return;
    if (currentRoom !== undefined) {
      localStorage.setItem("reconnectionToken", currentRoom.reconnectionToken);
      return;
    }
    const reconnectionToken = localStorage.getItem("reconnectionToken");
    if (reconnectionToken === null) return;
    client
      .reconnect<GameRoomState>(reconnectionToken)
      .then(setCurrentRoom)
      .catch(() => localStorage.removeItem("reconnectionToken"));
  }, [client, isLoading, currentRoom]);

  useEffect(() => {
    const preload = () => void import("@/components/Game");
    if (typeof window.requestIdleCallback !== "function") {
      const timer = window.setTimeout(preload, 1000);
      return () => window.clearTimeout(timer);
    }
    const handle = window.requestIdleCallback(preload);
    return () => window.cancelIdleCallback(handle);
  }, []);

  const onLeaveRoom = useCallback(
    (intentional: boolean) => {
      if (currentRoom === undefined) return;
      currentRoom.removeAllListeners();
      const backToHomepage = () => {
        setCurrentRoom(undefined);
        updateRooms();
      };
      if (intentional) {
        localStorage.removeItem("reconnectionToken");
        currentRoom.leave().then(backToHomepage);
      } else backToHomepage();
    },
    [currentRoom, updateRooms],
  );

  return (
    <>
      <More room={currentRoom} />
      {currentRoom === undefined ? (
        <Hero className="min-h-screen">
          <Hero.Content className="flex-col">
            <h1 className="text-3xl font-bold md:text-5xl">
              Connect 4 Together
            </h1>
            <h2 className="flex gap-2 font-mono text-base font-light md:text-xl">
              <span>Bienvenue</span>
              <NameInput />
              <span>!</span>
            </h2>
            <Card className="bg-base-200">
              <Card.Body>
                <Card.Title className="flex justify-center">
                  Entre amis
                </Card.Title>
                <div className="flex flex-col items-center gap-2 md:flex-row">
                  <Button
                    color="primary"
                    disabled={isLoading}
                    className="w-full md:w-auto"
                    onClick={() => {
                      if (isLoading) return;
                      client
                        .create<"Normal", GameRoomState>("Normal", {
                          name: username,
                          isPrivate: true,
                        })
                        .then(setCurrentRoom)
                        .catch(reportError);
                    }}
                  >
                    <Plus />
                    Créer une partie
                  </Button>
                  <JoinForm setRoom={setCurrentRoom} />
                </div>
                <Divider className="my-2 flex" />
                <Card.Title className="flex justify-center">
                  En ligne
                </Card.Title>
                <div className="mb-2 flex gap-2">
                  <Button
                    color="secondary"
                    disabled={isLoading}
                    className="grow"
                    onClick={() => {
                      if (isLoading) return;
                      client
                        .joinOrCreate<"Normal", GameRoomState>("Normal", {
                          name: username,
                        })
                        .then(setCurrentRoom)
                        .catch(reportError);
                    }}
                  >
                    <Play />
                    Rejoindre une partie
                  </Button>
                  <Button
                    shape="square"
                    color="secondary"
                    onClick={updateRooms}
                  >
                    <ListRestart />
                  </Button>
                </div>
                <div className="flex justify-center">
                  {rooms === undefined ? (
                    <Loading variant="dots" size="lg" />
                  ) : rooms.length === 0 ? undefined : (
                    <Table>
                      <Table.Head>
                        <span className="flex gap-1">
                          <Dices size={16} />
                          Type
                        </span>
                        <span className="flex gap-1">
                          <Crown size={16} />
                          Host
                        </span>
                        <span className="flex gap-1">
                          <Users size={16} />
                          Joueurs
                        </span>
                      </Table.Head>
                      <Table.Body>
                        {rooms.map(
                          ({ roomId, name, clients, maxClients, metadata }) => (
                            <Table.Row hover key={roomId}>
                              <span>{name}</span>
                              <span>{metadata.host}</span>
                              <span>{`${clients} / ${maxClients}`}</span>
                              <Button
                                color="secondary"
                                size="sm"
                                disabled={isLoading}
                                shape="square"
                                onClick={() => {
                                  if (isLoading) return;
                                  client
                                    .joinById<string, GameRoomState>(roomId, {
                                      name: username,
                                    })
                                    .then(setCurrentRoom)
                                    .catch(reportError);
                                }}
                              >
                                <LogIn size={16} />
                              </Button>
                            </Table.Row>
                          ),
                        )}
                      </Table.Body>
                    </Table>
                  )}
                </div>
              </Card.Body>
            </Card>
            <BMCButton />
            <hr className="h-8" />
          </Hero.Content>
        </Hero>
      ) : (
        <Game room={currentRoom} onLeaveRoom={onLeaveRoom} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <>
      <GoogleAnalytics gaId={GOOGLE_ANALYTICS_GA} />
      <ClientProvider>
        <NameProvider>
          <PageWithHandler />
        </NameProvider>
      </ClientProvider>
    </>
  );
}
