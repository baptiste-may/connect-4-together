import {
  CloseCode,
  Protocol,
  Transport,
  connectClientToRoom,
  createAuthContext,
  debugAndPrintError,
  getMessageBytes,
  isDevMode,
  logger,
  matchMaker,
  type Router,
} from "@colyseus/core";
import { CloudflareClient, CloudflareSocketRef } from "./cloudflare-client";

/** Server→client PING cadence, keeping sockets alive past the edge's idle
 *  window. The client SDK ignores PING frames, so this is one-way. */
const KEEPALIVE_INTERVAL_MS = 30_000;

/** `readyState` of an open Workers WebSocket. */
const WS_OPEN = 1;

/**
 * Colyseus transport backed by Cloudflare Workers WebSockets: matchmaking runs
 * on the framework's better-call router via `bindRouter`, and upgrades are
 * wired through {@link handleUpgrade} from the Durable Object. Mirrors
 * `WebSocketTransport`'s contract (`listen`/`shutdown`/`simulateLatency`)
 * without any TCP port behind it.
 */
export class CloudflareTransport extends Transport {
  private routerHandler?: (request: Request) => Promise<Response>;
  private keepaliveInterval?: ReturnType<typeof setInterval>;
  private readonly sockets = new Set<CloudflareSocketRef>();

  /**
   * Called from Colyseus' boot sequence — no TCP listener exists, so the
   * callback fires immediately.
   *
   * @param _port Ignored (no port is bound).
   * @param _hostname Ignored.
   * @param _backlog Ignored.
   * @param listeningListener Invoked with no error once boot may proceed.
   * @returns This transport.
   */
  listen(
    _port?: number | string,
    _hostname?: string,
    _backlog?: number,
    listeningListener?: (err?: unknown) => void,
  ): this {
    listeningListener?.();
    return this;
  }

  /**
   * Stores the router built by `Server.bindRoutes()` so the Durable Object can
   * serve matchmaking over `fetch` — the Cloudflare stand-in for the
   * better-call/Express `express` option.
   *
   * @param router The Colyseus router exposing a Request→Response handler.
   */
  bindRouter(router: Router): void {
    this.routerHandler = (request) => router.handler(request);
  }

  /**
   * Returns the router handler bound during boot, if boot completed.
   *
   * @returns The matchmaking request handler, or `undefined` before boot.
   */
  getRouterHandler(): ((request: Request) => Promise<Response>) | undefined {
    return this.routerHandler;
  }

  /**
   * The isolate ending kills sockets with it — only the keepalive timer needs
   * clearing.
   */
  shutdown(): void {
    if (this.keepaliveInterval !== undefined) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = undefined;
    }
    this.sockets.clear();
  }

  /**
   * Latency simulation patches `WebSocketClient.prototype`, which does not
   * apply to this transport's own client class, so it degrades to a warning.
   *
   * @param milliseconds The requested simulated round-trip time.
   */
  simulateLatency(milliseconds: number): void {
    logger.warn(
      `latency simulation is not supported on the Cloudflare transport (requested: ${milliseconds}ms)`,
    );
  }

  /**
   * Wires an accepted Workers WebSocket into the matchmaking pipeline, as
   * `WebSocketTransport.onConnection` does for the Node `ws` transport.
   *
   * Called after `WebSocketPair` + `accept()`; failures are reported over the
   * socket (error frame + close), never by throwing, since the `101` webSocket
   * response has already been sent by the caller.
   *
   * @param request The upgrade request (the URL carries the room/session ids).
   * @param socket The already-accepted server end of a `WebSocketPair`.
   */
  async handleUpgrade(request: Request, socket: WebSocket): Promise<void> {
    const parsedURL = new URL(request.url);
    const sessionId = parsedURL.searchParams.get("sessionId");
    const processAndRoomId = parsedURL.pathname.match(
      /\/[a-zA-Z0-9_\-]+\/([a-zA-Z0-9_\-]+)$/,
    );
    const roomId = processAndRoomId && processAndRoomId[1];

    const ref = new CloudflareSocketRef(socket);
    this.track(ref);

    // Greeter/ping-only probe (no room, no session): answer PING frames, then
    // close after a short grace period as the Node transport does.
    if (!sessionId && !roomId) {
      const timeout = setTimeout(
        () => ref.close(CloseCode.NORMAL_CLOSURE),
        1000,
      );
      ref.on("message", () => ref.send(new Uint8Array([Protocol.PING])));
      ref.on("close", () => clearTimeout(timeout));
      return;
    }

    const room = roomId ? matchMaker.getLocalRoomById(roomId) : undefined;
    const client = new CloudflareClient(sessionId ?? "", ref);
    const reconnectionToken = parsedURL.searchParams.get("reconnectionToken");
    const skipHandshake = parsedURL.searchParams.has("skipHandshake");
    try {
      await connectClientToRoom(
        room,
        client,
        createAuthContext({
          headers: request.headers,
          token: parsedURL.searchParams.get("_authToken"),
        }),
        {
          reconnectionToken: reconnectionToken ?? undefined,
          skipHandshake,
        },
      );
    } catch (e) {
      debugAndPrintError(e as Error);
      const error = e as { code?: number; message?: string };
      client.error(error.code ?? CloseCode.WITH_ERROR, error.message, () =>
        ref.close(
          reconnectionToken
            ? isDevMode
              ? CloseCode.MAY_TRY_RECONNECT
              : CloseCode.FAILED_TO_RECONNECT
            : CloseCode.WITH_ERROR,
        ),
      );
    }
  }

  /**
   * Registers a socket for keepalive and lifecycle bookkeeping.
   *
   * @param ref The socket adapter created by {@link handleUpgrade}.
   */
  private track(ref: CloudflareSocketRef) {
    this.sockets.add(ref);
    // EventEmitter throws on an "error" emission with no listener — mirror the
    // ws-transport error handler so a dead socket never kills the isolate.
    ref.on("error", (err) =>
      debugAndPrintError((err as Error)?.message || String(err)),
    );
    ref.once("close", () => {
      this.sockets.delete(ref);
      if (this.sockets.size === 0 && this.keepaliveInterval !== undefined) {
        clearInterval(this.keepaliveInterval);
        this.keepaliveInterval = undefined;
      }
    });
    if (this.sockets.size === 1) {
      this.startKeepalive();
    }
  }

  /**
   * Starts the one-way keepalive, pinging every open socket so edge proxies do
   * not idle-close them.
   */
  private startKeepalive() {
    if (this.keepaliveInterval !== undefined) return;
    this.keepaliveInterval = setInterval(() => {
      const ping = getMessageBytes[Protocol.PING]();
      for (const ref of this.sockets) {
        if (ref.readyState === WS_OPEN) ref.send(ping);
      }
    }, KEEPALIVE_INTERVAL_MS);
  }
}
