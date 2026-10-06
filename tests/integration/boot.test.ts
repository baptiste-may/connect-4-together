import type { Server } from "colyseus";
import { startServer } from "@/main";

jest.mock("next", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    prepare: jest.fn().mockResolvedValue(undefined),
    getRequestHandler: jest.fn(
      () => (_req: unknown, res: { end: (body: string) => void }) =>
        res.end("next"),
    ),
    getUpgradeHandler: jest.fn(() => jest.fn()),
  })),
}));

jest.mock("@colyseus/monitor", () => ({
  monitor: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const PORT = 3999;

describe("server boot", () => {
  let gameServer: Server;

  beforeAll(async () => {
    process.env.MONITOR_USER = "admin";
    process.env.MONITOR_PASSWORD = "secret";
    gameServer = await startServer(PORT);
  });

  afterAll(async () => {
    const httpServer = (
      gameServer.transport as unknown as {
        server?: import("node:http").Server;
      }
    ).server;

    await gameServer.gracefullyShutdown(false);
    await new Promise<void>((resolve) => {
      if (httpServer?.listening) {
        httpServer.close(() => resolve());
      } else {
        resolve();
      }
    });
  });

  it("should expose the room listing on GET /api/rooms", async () => {
    const response = await fetch(`http://localhost:${PORT}/api/rooms`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("should protect the monitor behind basic auth", async () => {
    const unauthorized = await fetch(`http://localhost:${PORT}/admin`);
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch(`http://localhost:${PORT}/admin`, {
      headers: {
        Authorization: `Basic ${Buffer.from("admin:secret").toString("base64")}`,
      },
    });
    expect(authorized.status).toBe(200);
  });

  it("should forward unmatched requests to the Next handler", async () => {
    const response = await fetch(`http://localhost:${PORT}/some-page`);

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("next");
  });
});
