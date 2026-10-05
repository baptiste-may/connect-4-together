import type { NormalRoom } from "@/server/rooms/NormalRoom";

/**
 * Joinable room summary served by `GET /api/rooms`.
 * Mirrors `RoomAvailable` from `@colyseus/sdk` without importing the client
 * SDK on the server.
 */
export interface RoomListing {
  roomId: string;
  name: string;
  clients: number;
  maxClients: number;
  metadata: { host: string };
}

const rooms = new Set<NormalRoom>();

/**
 * Adds a room to the public listing.
 * @param room The room to expose.
 */
export function registerRoom(room: NormalRoom) {
  rooms.add(room);
}

/**
 * Removes a room from the public listing.
 * @param room The room to hide.
 */
export function unregisterRoom(room: NormalRoom) {
  rooms.delete(room);
}

/**
 * Lists the rooms advertised to clients.
 * Rooms the host marked as private are left out of the lobby; they stay
 * reachable by room id. Full rooms are kept listed since the lobby displays
 * their occupancy.
 * @returns The rooms advertised to clients.
 */
export function listRooms(): RoomListing[] {
  return [...rooms]
    .filter((room) => !room.state.isPrivate)
    .map((room) => ({
      roomId: room.roomId,
      name: room.roomName,
      clients: room.clients.length,
      maxClients: room.maxClients,
      metadata: { host: room.metadata?.host ?? "" },
    }));
}
