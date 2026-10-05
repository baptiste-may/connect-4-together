import { CloseCode, Room, type Client } from "colyseus";
import {
  ArraySchema,
  MapSchema,
  Schema,
  SetSchema,
  type,
} from "@colyseus/schema";
import { ChatMessage } from "@/server/utils/Chat";
import { registerRoom, unregisterRoom } from "@/server/rooms/registry";
import filter from "leo-profanity";

/**
 * Represents the state of the room.
 */
export class State extends Schema {
  @type("boolean") isPrivate = false;
  @type("string") host = "";
  @type({ map: "string" }) playerNames = new MapSchema();
  @type(["string"]) players = new ArraySchema<string>();
  @type({ set: "string" }) spectators = new SetSchema<string>();
  @type(["number"]) board = new ArraySchema<number>();
  @type([ChatMessage]) chatMessages = new ArraySchema<ChatMessage>();
  @type("number") turn = 0;
  @type("string") winner = "";
  @type({ set: "string" }) votedForSkip = new SetSchema<string>();
}

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Normalizes a player name received from a client.
 * The schema only stores strings, so a missing or invalid name falls back to
 * a generated one instead of failing the join.
 * @param client The client the name belongs to.
 * @param value The raw value received from the client.
 * @returns A non-empty player name.
 */
function sanitizePlayerName(client: Client, value: unknown): string {
  const name = typeof value === "string" ? value.trim() : "";
  return name === "" ? `Joueur ${client.sessionId}` : name;
}

/**
 * A game room for managing game state and player interactions.
 */
export class NormalRoom extends Room<{ state: State }> {
  ID_KEY = "$normal";

  /**
   * Generates a single 6-character room ID.
   * @returns A 6-character room ID
   */
  generateRoomIdSingle(): string {
    let roomId = "";
    for (let i = 0; i < 6; i++) {
      roomId += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return roomId;
  }

  /**
   * Generates a unique 6-character room ID.
   * Ensures the ID is not already in use.
   * @returns A unique 6-character room ID
   */
  async generateRoomId(): Promise<string> {
    const currentIds = await this.presence.smembers(this.ID_KEY);
    let id;
    do {
      id = this.generateRoomIdSingle();
    } while (currentIds.includes(id));

    await this.presence.sadd(this.ID_KEY, id);
    return id;
  }

  /**
   * Initializes the room upon creation.
   * Sets initial state, generates unique room ID, and configures message handlers.
   */
  async onCreate() {
    this.roomId = await this.generateRoomId();

    this.setState(new State());
    for (let i = 0; i < 7 * 6; i++) {
      this.state.board.push(-1);
    }
    for (let i = 0; i < 4; i++) {
      this.state.players.push("");
    }

    this.maxClients = 8;
    await this.setMetadata({
      host: "",
    });
    await this.setPrivate(false);

    this.onMessage("set-lock", async (client, value) => {
      if (client.sessionId !== this.state.host) return;
      await this.setPrivate(value);
      this.state.isPrivate = value;
    });

    this.onMessage("send-message", (client, message) => {
      let cleanedMessage = message;
      filter.loadDictionary("fr");
      cleanedMessage = filter.clean(cleanedMessage);
      filter.loadDictionary("en");
      cleanedMessage = filter.clean(cleanedMessage);
      filter.loadDictionary("ru");
      cleanedMessage = filter.clean(cleanedMessage);
      this.state.chatMessages.push(
        new ChatMessage(cleanedMessage, client.sessionId),
      );
    });

    this.onMessage("join-color", (client, message) => {
      const color = parseInt(message);
      if (color > 4) return;
      if (this.state.players[color] !== "") return;
      if (this.state.players.includes(client.sessionId)) return;
      this.state.players[color] = client.sessionId;
      this.state.spectators.delete(client.sessionId);
    });

    this.onMessage("play-piece", (client, message) => {
      if (this.state.winner !== "") return;
      const column = parseInt(message);
      if (column > 6) return;
      if (this.getNbPlayers() < 2) return;
      const index = this.state.players.indexOf(client.sessionId);
      if (index === -1) return;
      if (index !== this.state.turn) return;
      this.playPiece(column, index);
    });

    this.onMessage("vote-skip", (client) => {
      if (!this.state.players.includes(client.sessionId)) return;
      this.state.votedForSkip.add(client.sessionId);
      if (this.state.votedForSkip.size >= this.getNbPlayers()) {
        for (let i = 0; i < 7 * 6; i++) {
          this.state.board[i] = -1;
        }
        this.state.votedForSkip.clear();
        this.state.turn = -1;
        this.state.winner = "";
        this.newTurn();
      }
    });

    this.onMessage("update-name", (client, message) => {
      this.state.playerNames.set(
        client.sessionId,
        sanitizePlayerName(client, message),
      );
    });

    registerRoom(this);
  }

  /**
   * Handles a client joining the room.
   * @param client The client joining the room.
   * @param options The options passed to the client when joining.
   */
  async onJoin(
    client: Client,
    options?: {
      name?: string;
      isPrivate?: boolean;
    },
  ) {
    const name = sanitizePlayerName(client, options?.name);
    this.state.spectators.add(client.sessionId);
    this.state.playerNames.set(client.sessionId, name);
    if (this.state.host === "") {
      this.state.host = client.sessionId;
      await this.setMetadata({
        host: name,
      });
      if (options?.isPrivate) {
        await this.setPrivate(true);
        this.state.isPrivate = true;
      }
    }
  }

  /**
   * Handles a client leaving the room.
   * @param client The client leaving the room.
   * @param code The close code, `CloseCode.CONSENTED` when the client left intentionally.
   */
  async onLeave(client: Client, code?: number) {
    try {
      if (code === CloseCode.CONSENTED) throw new Error("Consented leave");
      await this.allowReconnection(client, 5);
    } catch {
      this.state.spectators.delete(client.sessionId);
      this.state.votedForSkip.delete(client.sessionId);
      const index = this.state.players.indexOf(client.sessionId);
      if (index !== -1) {
        this.state.players[index] = "";
        if (index === this.state.turn && this.state.winner === "")
          this.newTurn();
      }
      if (this.state.host === client.sessionId) {
        const players = this.state.players.filter((p) => p !== "");
        this.state.host =
          players.length > 0 ? players[0] : this.state.spectators.toArray()[0];
        await this.setMetadata({
          host: this.state.playerNames.get(this.state.host),
        });
      }
    }
  }

  /**
   * Retrieves the color of a piece at a given position.
   * @param lig The row index.
   * @param col The column index.
   * @returns The color of the piece.
   */
  getPieceColor(lig: number, col: number) {
    return this.state.board[lig * 7 + col];
  }

  /**
   * Places a piece in the specified column.
   * @param column The column to place the piece.
   * @param color The color of the piece.
   */
  playPiece(column: number, color: number) {
    let i = 5;
    while (i >= 0 && this.getPieceColor(i, column) !== -1) i--;
    if (i < 0) return;
    this.state.board[i * 7 + column] = color;
    this.checkIfGameOver();
    if (this.state.winner === "") this.newTurn();
  }

  /**
   * Retrieves the number of players currently in the room.
   * @returns The number of players.
   */
  getNbPlayers() {
    return this.state.players.filter((elt) => elt !== "").length;
  }

  /**
   * Advances the game to the next turn.
   */
  newTurn() {
    this.state.turn = (this.state.turn + 1) % 4;
    if (this.getNbPlayers() === 0) return;
    while (this.state.players[this.state.turn] === "")
      this.state.turn = (this.state.turn + 1) % 4;
  }

  /**
   * Checks if the given coordinates are within the board limits.
   * @param x The row index.
   * @param y The column index.
   * @returns True if coordinates are valid, otherwise false.
   */
  correctCoords(x: number, y: number) {
    return 0 <= x && x < 6 && 0 <= y && y < 7;
  }

  /**
   * Checks if the game is over by finding four consecutive pieces.
   */
  checkIfGameOver() {
    const grid: number[][] = [];
    for (let i = 0; i < 6; i++) {
      const row: number[] = [];
      for (let j = 0; j < 7; j++) {
        const color = this.getPieceColor(i, j);
        row.push(color === undefined ? -1 : color);
      }
      grid.push(row);
    }
    for (let x = 0; x < 6; x++) {
      for (let y = 0; y < 7; y++) {
        const color = grid[x][y];
        if (color === -1) continue;
        for (const [i, j] of [
          [1, 0],
          [0, 1],
          [1, 1],
          [1, -1],
          [-1, 1],
        ]) {
          for (let k = 1; k < 4; k++) {
            const X = x + i * k;
            const Y = y + j * k;
            if (!this.correctCoords(X, Y)) break;
            if (grid[X][Y] !== color) break;
            if (k === 3) {
              this.state.winner = this.state.players[color] || "";
              return;
            }
          }
        }
      }
    }
  }

  /**
   * Cleans up resources when the room is disposed.
   */
  async onDispose() {
    unregisterRoom(this);
    this.presence.srem(this.ID_KEY, this.roomId);
  }
}
