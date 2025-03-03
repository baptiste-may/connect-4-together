import {Server} from "colyseus";
import {NormalRoom} from "@/server/rooms/NormalRoom";
import {CheckConnectionRoom} from "@/server/rooms/CheckConnectionRoom";

/**
 * Registers game rooms with the Colyseus server.
 *
 * @param gameServer - The Colyseus server.
 */
export default function define(gameServer: Server) {
    gameServer.define("CheckConnection", CheckConnectionRoom);
    gameServer.define("Normal", NormalRoom);
}