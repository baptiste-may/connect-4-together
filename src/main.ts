import "dotenv/config";
import next from "next";
import {Server} from "colyseus";
import {WebSocketTransport} from "@colyseus/ws-transport";
import defineGameServer from "./server/server";
import {monitor} from "@colyseus/monitor";
import express from "express";
import {createServer} from "node:http";
import basicAuth from "express-basic-auth";
import {v6} from "uuid";

const port = parseInt(process.env.PORT || "3000");
const monitorUser = process.env.MONITOR_USER || v6();
const monitorPassword = process.env.MONITOR_PASSWORD || v6();
const dev = process.env.NODE_ENV !== "production";
const nextApp = next({dev});
const handle = nextApp.getRequestHandler();

nextApp.prepare().then(async () => {
    const app = express();
    const server = createServer(app);

    app.use(express.json());

    const gameServer = new Server({
        transport: new WebSocketTransport({server: server}),
        devMode: dev
    });

    defineGameServer(gameServer);

    app.use("/admin", basicAuth({
        users: {
            [monitorUser]: monitorPassword,
        },
        challenge: true,
        unauthorizedResponse: "Please provide valid credentials"
    }), monitor({
        columns: [
            "roomId",
            "clients",
            "locked"
        ]
    }));
    app.all("*", (req, res) => handle(req, res));

    server.listen(port, () => {
        console.log(`✅ Server listening at http://localhost:${port} as ${dev ? "development" : "production"}`);
    });
})