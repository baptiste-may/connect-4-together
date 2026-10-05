import type { Room } from "@colyseus/sdk";
import type { State } from "@/server/rooms/NormalRoom";

/**
 * Shape of the state synchronized by `NormalRoom`, as seen by the client.
 */
export type GameRoomState = State;

/**
 * Client-side handle on a game room, with a typed state.
 * Messages stay untyped (`room.send("update-name", name)`).
 */
export type GameRoom = Room<GameRoomState>;
