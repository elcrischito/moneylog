import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { config } from "./config";
import { errorHandler } from "./http/errors";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { accountsRouter } from "./routes/accounts";
import { transactionsRouter } from "./routes/transactions";
import { summaryRouter } from "./routes/summary";
import { requireAuth, requireRole } from "./middleware/auth";
import "./auth/types";

export function createApp() {
  const app = express();
  const origins = config.corsOrigins();
  app.use(cors(origins.length > 0 ? { origin: origins } : undefined));
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_req, res) => {
    // version = commit SHA baked into the image (Dockerfile ARG APP_VERSION, #37); "dev" locally.
    res.json({ status: "ok", service: "MoneyLog API", version: process.env.APP_VERSION || "dev" });
  });

  // 503 when the database cannot be reached (used by the Lab 5 smoke test).
  app.get("/api/ready", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: "ready", db: "connected" });
    } catch {
      res.status(503).json({ status: "not_ready", db: "unreachable" });
    }
  });

  app.use("/api/auth", authRouter);

  // Access foundation (System SDS §5): administrator routes are ADMIN only and every
  // financial route is USER only, so an administrator never reaches financial data (BR-02).
  app.use("/api/admin", requireAuth, requireRole("ADMIN"), adminRouter);
  app.use(["/api/accounts", "/api/transactions", "/api/summary"], requireAuth, requireRole("USER"));
  app.use("/api/accounts", accountsRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/summary", summaryRouter);

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
  });

  // In the single production container, Express also serves the built React app.
  const clientDist = process.env.CLIENT_DIST_DIR || path.resolve(process.cwd(), "..", "client", "dist");
  if (fs.existsSync(path.join(clientDist, "index.html"))) {
    app.use(express.static(clientDist, { index: false, maxAge: "1h" }));
    app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
  }

  app.use(errorHandler);
  return app;
}

export const app = createApp();
