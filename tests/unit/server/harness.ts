import { type Client, matchMaker } from "colyseus";
import { NormalRoom } from "@/server/rooms/NormalRoom";

/**
 * Minimal shape of Colyseus' private `Room.onMessageEvents` registry.
 * Handlers are registered as `(client, message) => void`.
 */
interface MessageEvents {
  events: Record<string, ((client: Client, message: unknown) => unknown)[]>;
}

let initialized = false;
const createdRooms: NormalRoom[] = [];

/**
 * Initializes the in-memory matchmaker (LocalPresence + LocalDriver) and
 * registers the `Normal` room type. Idempotent: runs at most once per test
 * file, so suites can simply `await createRoom()`.
 * @returns Resolves once the matchmaker accepts room creation.
 */
async function ensureMatchMaker(): Promise<void> {
  if (initialized) return;
  await matchMaker.setup();
  matchMaker.defineRoomType("Normal", NormalRoom);
  initialized = true;
}

/**
 * Creates a real `NormalRoom` through the matchmaker (`onCreate`, generated
 * roomId, scoped presence, registry), keeps it alive past auto-dispose and
 * tracks it for `disposeRooms`.
 * @param options Client options forwarded to the creation path.
 * @returns The freshly created room instance.
 */
export async function createRoom(
  options: Record<string, unknown> = {},
): Promise<NormalRoom> {
  await ensureMatchMaker();
  const listing = await matchMaker.createRoom("Normal", options);
  const room = matchMaker.getLocalRoomById(listing.roomId) as NormalRoom;
  room.autoDispose = false;
  createdRooms.push(room);
  return room;
}

/**
 * Builds a client stub. Unit tests only exercise logic that reads
 * `sessionId`, so a full transport-level client is unnecessary.
 * @param sessionId The session id the room will see.
 * @returns A stand-in for a connected Colyseus client.
 */
export function createClient(sessionId: string): Client {
  return { sessionId } as unknown as Client;
}

/**
 * Dispatches a message through the room's registered `onMessage` handlers,
 * mirroring Colyseus' ROOM_DATA path without a socket.
 * @param room The room receiving the message.
 * @param client The sending client.
 * @param type The message type (e.g. `"join-color"`).
 * @param message The message payload.
 * @returns Resolves once every handler for `type` has run.
 */
export async function sendMessage(
  room: NormalRoom,
  client: Client,
  type: string,
  message?: unknown,
): Promise<void> {
  const registry = (room as unknown as { onMessageEvents: MessageEvents })
    .onMessageEvents;
  const handlers = registry.events[type];
  if (handlers === undefined || handlers.length === 0) {
    throw new Error(`no onMessage handler registered for "${type}"`);
  }
  for (const handler of handlers) {
    await handler(client, message);
  }
}

/**
 * Disposes every room created through `createRoom`: clients are removed
 * first (they never existed at transport level), then `disconnect()` runs
 * the full disposal chain — patch/auto-dispose timers, `onDispose`,
 * registry and driver cleanup.
 * @returns Resolves once all tracked rooms are gone.
 */
export async function disposeRooms(): Promise<void> {
  for (const room of createdRooms.splice(0)) {
    while (room.clients.length > 0) room.clients.pop();
    await room.disconnect();
  }
}
