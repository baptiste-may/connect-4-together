import express from "express";
import { listRooms } from "./rooms/registry";

/**
 * Registers the shared HTTP API routes on an Express application.
 *
 * Used both by the main entrypoint and by the integration test boot so that
 * tests exercise the exact same `/api/rooms` contract as production.
 *
 * @param app - Express application to register the routes on.
 * @returns void
 */
export function registerApiRoutes(app: express.Application) {
  app.use(express.json());

  app.get("/api/rooms", (_req, res) => {
    res.json(listRooms());
  });
}
