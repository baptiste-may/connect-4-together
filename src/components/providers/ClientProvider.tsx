"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { Client, type RoomAvailable } from "@colyseus/sdk";
import { useToast } from "@/components/providers/ToastProvider";
import { CloudAlert } from "lucide-react";

const PROBE_TIMEOUT_MS = 5000;
const RETRY_INITIAL_DELAY_MS = 1000;
const RETRY_MAX_DELAY_MS = 10000;

const ClientContext = createContext<
  | undefined
  | {
      isLoading: true;
      client?: undefined;
      rooms?: undefined;
    }
  | {
      isLoading: false;
      client: Client;
      rooms: RoomAvailable[];
    }
>(undefined);

export default function ClientProvider({ children }: { children: ReactNode }) {
  const alert = useToast();

  const [connection, setConnection] = useState<
    | undefined
    | {
        client: Client;
        rooms: RoomAvailable[];
      }
  >(undefined);

  useEffect(() => {
    const client = new Client(
      `${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}`,
    );

    let isCancelled = false;
    let timeoutId: NodeJS.Timeout | undefined;
    let retryId: NodeJS.Timeout | undefined;
    let retryDelay = RETRY_INITIAL_DELAY_MS;
    let hasWarned = false;

    const probe = () => {
      Promise.race([
        fetch("/api/rooms").then((res) => {
          if (!res.ok) throw new Error(`Unexpected status ${res.status}`);
          return res.json() as Promise<RoomAvailable[]>;
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("Connection probe timed out")),
            PROBE_TIMEOUT_MS,
          );
        }),
      ])
        .then((rooms) => {
          clearTimeout(timeoutId);
          if (isCancelled) return;
          setConnection({ client, rooms });
        })
        .catch(() => {
          clearTimeout(timeoutId);
          if (isCancelled) return;
          if (!hasWarned) {
            hasWarned = true;
            alert({
              title: "Impossible de se connecter au serveur",
              status: "error",
              Icon: CloudAlert,
            });
          }
          retryId = setTimeout(probe, retryDelay);
          retryDelay = Math.min(retryDelay * 2, RETRY_MAX_DELAY_MS);
        });
    };

    probe();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(retryId);
    };
  }, [alert]);

  return (
    <ClientContext.Provider
      value={
        connection === undefined
          ? { isLoading: true }
          : {
              isLoading: false,
              client: connection.client,
              rooms: connection.rooms,
            }
      }
    >
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const context = useContext(ClientContext);
  if (context === undefined) throw new Error();
  return context;
}
