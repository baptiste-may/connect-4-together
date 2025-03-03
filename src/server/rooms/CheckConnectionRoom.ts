import {Room} from "colyseus";

/**
 * A room that is used to check if the client's connection to the server is working.
 * This room allows only one client to join.
 */
export class CheckConnectionRoom extends Room {
    onCreate() {
        this.maxClients = 1;
    }
}