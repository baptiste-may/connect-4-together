import { Server } from "@colyseus/core";
import defineGameServer from "@/server/server";
import { listRooms } from "@/server/rooms/registry";
import { CloudflareTransport } from "./cloudflare-transport";

/**
 * Durable Object hosting the whole Colyseus server: the in-memory matchmaker,
 * every room and all WebSockets — the Workers-side replacement for the single
 * Node process. A single instance (`idFromName("game")`) keeps shared lobby
 * state warm; eviction resets the lobby just like a server restart.
 *
 * Not a hibernating Durable Object: open sockets keep the isolate warm by
 * design, exactly like a long-lived Node process.
 */
export class GameServer {
  /** Boot promise, created on first request and cached for the instance's
   *  life. */
  private transport?: Promise<CloudflareTransport>;

  /**
   * Boots the Colyseus server lazily — the first request pays the cost.
   *
   * @returns A promise for the transport bound to the bootstrapped `Server`.
   */
  private ensureTransport(): Promise<CloudflareTransport> {
    if (this.transport === undefined) {
      this.transport = this.boot().catch((e) => {
        // A boot failure must not brick the instance: drop the cached promise
        // so the next request retries.
        this.transport = undefined;
        throw e;
      });
    }
    return this.transport;
  }

  /**
   * Constructs and starts the Colyseus server on the Cloudflare transport.
   *
   * @returns The ready transport.
   */
  private async boot(): Promise<CloudflareTransport> {
    const transport = new CloudflareTransport();
    const server = new Server({
      transport,
      devMode: false,
      gracefullyShutdown: false,
      greet: false,
    });
    defineGameServer(server);
    await server.listen(0);
    return transport;
  }

  /**
   * Entry point for every request routed to this object: WebSocket upgrades,
   * Colyseus matchmaking HTTP endpoints and the `GET /api/rooms` lobby probe.
   *
   * @param request The request forwarded by the Worker.
   * @returns The `101` upgrade, the matchmaking handler's response, or a 404.
   */
  async fetch(request: Request): Promise<Response> {
    const transport = await this.ensureTransport();

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      const pair = new WebSocketPair();
      const serverSocket = pair[1];
      serverSocket.accept();
      void transport.handleUpgrade(request, serverSocket);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/rooms") {
      return new Response(JSON.stringify(listRooms()), {
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const handler = transport.getRouterHandler();
    return handler !== undefined
      ? handler(request)
      : new Response("Not Found", { status: 404 });
  }
}
