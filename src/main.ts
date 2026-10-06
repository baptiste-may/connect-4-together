import "dotenv/config";
import next from "next";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import defineGameServer from "./server/server";
import { monitor } from "@colyseus/monitor";
import { createServer } from "node:http";
import basicAuth from "express-basic-auth";
import { v6 } from "uuid";
import { registerApiRoutes } from "./server/routes";

/**
 * Builds and starts the combined Next.js + Colyseus server on a single port:
 * the Next request handler and the Colyseus WebSocket transport share one HTTP
 * server, and the Express routes (`/api/rooms`, `/admin`) are mounted before
 * the catch-all that forwards everything else to Next.
 *
 * @param port - Port to listen on. Defaults to `PORT` or `3000`.
 * @returns The Colyseus server, once it is listening.
 */
export async function startServer(
  port = parseInt(process.env.PORT || "3000"),
): Promise<Server> {
  const monitorUser = process.env.MONITOR_USER || v6();
  const monitorPassword = process.env.MONITOR_PASSWORD || v6();
  const dev = process.env.NODE_ENV !== "production";
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const upgradeHandler = nextApp.getUpgradeHandler();
  const server = createServer();

  server.on("upgrade", (req, socket, head) => {
    void upgradeHandler(req, socket, head);
  });

  const transport = new WebSocketTransport({ noServer: true });

  transport.attachToServer(server, {
    filter: (req) => !req.url?.startsWith("/_next/"),
  });

  const gameServer = new Server({
    transport,
    devMode: dev,
    express: (app) => {
      registerApiRoutes(app);

      app.use(
        "/admin",
        basicAuth({
          users: {
            [monitorUser]: monitorPassword,
          },
          challenge: true,
          unauthorizedResponse: "Please provide valid credentials",
        }),
        monitor({
          prefix: "/admin",
          columns: ["roomId", "clients", "locked"],
        }),
      );

      app.use((req, res) => handle(req, res));
    },
  });

  defineGameServer(gameServer);

  await gameServer.listen(port);

  console.log(
    `✅ Server listening at http://localhost:${port} as ${dev ? "development" : "production"}`,
  );

  return gameServer;
}

if (process.env.NODE_ENV !== "test") {
  startServer().catch((error) => {
    console.error("❌ Failed to start the server", error);
    process.exit(1);
  });
}
