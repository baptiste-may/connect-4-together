import { EventEmitter } from "node:events";
import {
  ClientState,
  Protocol,
  debugMessage,
  enqueueClientRaw,
  getMessageBytes,
  logger,
  type Client,
  type ClientPrivate,
  type ISendOptions,
} from "@colyseus/core";

const SEND_OPTS = { binary: true };

/**
 * Bridges a Workers `WebSocket` onto the EventEmitter surface Colyseus room
 * internals expect from `client.ref`: `message`/`close`/`error` events plus
 * `send`/`close`/`readyState`. `ws`-compatible by construction.
 *
 * @remarks The socket must already have `accept()` called on it, otherwise the
 * runtime drops every message before the pair is upgraded.
 */
export class CloudflareSocketRef extends EventEmitter {
  private readonly socket: WebSocket;

  /**
   * @param socket The accepted server end of a `WebSocketPair`.
   */
  constructor(socket: WebSocket) {
    super();
    this.socket = socket;
    socket.binaryType = "arraybuffer";

    socket.addEventListener("message", (event: MessageEvent) => {
      this.emit(
        "message",
        typeof event.data === "string"
          ? new TextEncoder().encode(event.data)
          : new Uint8Array(event.data as ArrayBuffer),
      );
    });
    socket.addEventListener("close", (event: CloseEvent) => {
      this.emit("close", event.code, event.reason);
    });
    socket.addEventListener("error", () => {
      this.emit("error", new Error("WebSocket error"));
    });
  }

  /** Connection state of the underlying socket (`0` opening … `3` closed). */
  get readyState(): number {
    return this.socket.readyState;
  }

  /**
   * Sends one frame, mirroring the `ws` send signature. A thrown `send` means
   * the socket is gone — surfaced through `cb` so buffered writes never crash
   * the isolate.
   *
   * @param data Frame payload (Colyseus only ever sends binary frames).
   * @param _options `ws` send options; Workers delivers frames as-is.
   * @param cb Receives the error when the underlying `send` throws.
   */
  send(
    data: Uint8Array | ArrayBuffer | string,
    _options?: { binary?: boolean },
    cb?: (err?: Error) => void,
  ): void {
    try {
      this.socket.send(data);
      cb?.();
    } catch (e) {
      cb?.(e as Error);
    }
  }

  /**
   * Closes the socket with a spec-valid close code.
   *
   * The Workers runtime rejects close codes outside `1000` and `3000–4999`, so
   * the reserved codes (`1005`, `1006`, …) Colyseus passes through degrade to a
   * plain close instead of throwing mid-disconnect.
   *
   * @param code Close code (`1000` or `3000–4999`).
   * @param data Optional close reason.
   */
  close(code?: number, data?: string): void {
    const valid =
      code === undefined || code === 1000 || (code >= 3000 && code <= 4999);
    try {
      this.socket.close(valid ? code : undefined, data);
    } catch {
      try {
        this.socket.close();
      } catch {
        // Already closed — nothing left to do.
      }
    }
  }
}

/**
 * Server-side client bound to a Workers WebSocket — the equivalent of
 * `@colyseus/ws-transport`'s `WebSocketClient` for the Cloudflare transport.
 */
export class CloudflareClient implements Client, ClientPrivate {
  declare "~messages": Record<string | number, unknown>;
  declare reconnectionToken: string;
  declare _joinedAt: number;

  /** Session id, handed to the client during the JOIN_ROOM handshake. */
  sessionId: string;
  /** Mirror of {@link sessionId}, as on the framework's own clients. */
  id: string;
  /** The bridged socket consumed by room internals. */
  ref: CloudflareSocketRef;
  /** Position in the connection state machine, starts at `JOINING`. */
  state: ClientState = ClientState.JOINING;
  /** Messages staged until the JOIN_ROOM handshake flushes them. */
  _enqueuedMessages: unknown[] = [];
  /** Inbound frame throughput, read by `maxMessagesPerSecond`. */
  _numMessagesLastSecond = 0;
  _messageCountResetsAt = 0;
  /** `performance.now()` of the most recent inbound frame. */
  _lastMessageTime = 0;

  /**
   * @param id The client's session id.
   * @param ref The accepted WebSocket adapter backing this client.
   */
  constructor(id: string, ref: CloudflareSocketRef) {
    this.sessionId = this.id = id;
    this.ref = ref;
  }

  /**
   * Sends a binary frame tagged `ROOM_DATA_BYTES`.
   *
   * @param type Message type identifier.
   * @param bytes Raw payload.
   * @param options Send options.
   */
  sendBytes(
    type: string | number,
    bytes: Buffer | Uint8Array,
    options?: ISendOptions,
  ): void {
    debugMessage("send bytes(to %s): '%s' -> %j", this.sessionId, type, bytes);
    this.enqueueRaw(
      getMessageBytes.raw(Protocol.ROOM_DATA_BYTES, type, void 0, bytes),
      options,
    );
  }

  /**
   * Sends a msgpack-encoded message to this client.
   *
   * @param messageOrType Identifier the client SDK matches on.
   * @param messageOrOptions Payload or send options.
   * @param options Send options.
   */
  send(
    messageOrType: string | number | symbol,
    messageOrOptions?: unknown | ISendOptions,
    options?: ISendOptions,
  ): void {
    debugMessage(
      "send(to %s): '%s' -> %j",
      this.sessionId,
      messageOrType,
      messageOrOptions,
    );
    this.enqueueRaw(
      getMessageBytes.raw(
        Protocol.ROOM_DATA,
        messageOrType as string | number,
        messageOrOptions,
      ),
      options,
    );
  }

  /**
   * Stages a raw frame, buffering it until the handshake when not joined yet.
   *
   * @param data Frame bytes.
   * @param options Send options (`afterNextPatch` stages until the next patch).
   */
  enqueueRaw(data: Uint8Array | Buffer, options?: ISendOptions): void {
    enqueueClientRaw(this, data, options);
  }

  /**
   * Writes a raw frame straight to the socket.
   *
   * @param data Frame bytes.
   * @param options Send options.
   * @param cb Completion callback (receives the error on failure).
   */
  raw(
    data: Uint8Array | Buffer,
    options?: ISendOptions,
    cb?: (err?: Error) => void,
  ): void {
    this.ref.send(data, SEND_OPTS, cb);
  }

  /**
   * Sends an `ERROR` frame to the client, used by the join failure path.
   *
   * @param code Error code, relayed to the client SDK's `onError`.
   * @param message Optional human-readable reason.
   * @param cb Completion callback.
   */
  error(code: number, message = "", cb?: (err?: Error) => void): void {
    this.raw(getMessageBytes[Protocol.ERROR](code, message), void 0, cb);
  }

  /** Connection state of the underlying socket. */
  get readyState(): number {
    return this.ref.readyState;
  }

  /**
   * Closes the connection.
   *
   * @param code Optional close code (defaults to 1000).
   * @param data Optional close reason.
   */
  leave(code?: number, data?: string): void {
    this.ref.close(code, data);
  }

  /**
   * @deprecated Use {@link leave} instead.
   */
  close(code?: number, data?: string): void {
    logger.warn(
      "DEPRECATION WARNING: use client.leave() instead of client.close()",
    );
    this.leave(code, data);
  }

  /** Serializes the client for logging and telemetry. */
  toJSON(): { sessionId: string; readyState: number } {
    return { sessionId: this.sessionId, readyState: this.readyState };
  }
}
