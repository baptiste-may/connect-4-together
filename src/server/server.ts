import {Server} from "colyseus";
import {NormalRoom} from "@/server/rooms/NormalRoom";

/**
 * Registers game rooms with the Colyseus server.
 *
 * @param gameServer - The Colyseus server.
 */
export default function define(gameServer: Server) {
    gameServer.define("Normal", NormalRoom);
}