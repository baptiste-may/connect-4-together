"use client";

import {createContext, ReactNode, useContext, useEffect, useState} from "react";
import {Client} from "colyseus.js";
import {useToast} from "@/components/providers/ToastProvider";
import {CloudAlert} from "lucide-react";

const ClientContext = createContext<undefined | {
    isLoading: true;
    client?: Client;
} | {
    isLoading: false;
    client: Client;
}>(undefined);

export default function ClientProvider({children}: {
    children: ReactNode;
}) {

    const alert = useToast();

    const [client, setClient] = useState<undefined | Client>(undefined);

    useEffect(() => {
        const client = new Client(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`);
        client.create("CheckConnection").then(room => {
            room.leave().then(() => setClient(client));
        }).catch(() => {
            alert({
                title: "Impossible de se connecter au serveur",
                status: "error",
                Icon: CloudAlert
            });
        });
    }, [alert]);

    return (
        <ClientContext.Provider value={client === undefined ? {isLoading: true} : {isLoading: false, client}}>
            {children}
        </ClientContext.Provider>
    );
}

export function useClient() {
    const context = useContext(ClientContext);
    if (context === undefined) throw new Error();
    return context;
}