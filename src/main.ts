import "dotenv/config";
import next from "next";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import defineGameServer from "./server/server";
import { monitor } from "@colyseus/monitor";
import express from "express";
import { createServer } from "node:http";
import basicAuth from "express-basic-auth";
import { v6 } from "uuid";
import { listRooms } from "./server/rooms/registry";

const port = parseInt(process.env.PORT || "3000");
const monitorUser = process.env.MONITOR_USER || v6();
const monitorPassword = process.env.MONITOR_PASSWORD || v6();
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({ dev });
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
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
      app.use(express.json());

      app.get("/api/rooms", (_req, res) => {
        res.json(listRooms());
      });

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
});
