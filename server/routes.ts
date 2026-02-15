import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerSyncRoutes } from "./syncRoutes";

export async function registerRoutes(app: Express): Promise<Server> {
  registerSyncRoutes(app);

  const httpServer = createServer(app);

  return httpServer;
}
