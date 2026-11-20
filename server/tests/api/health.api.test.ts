import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

describe("health and readiness", () => {
  const savedVersion = process.env.APP_VERSION;
  afterEach(() => {
    if (savedVersion === undefined) delete process.env.APP_VERSION;
    else process.env.APP_VERSION = savedVersion;
  });

  // #37: UAT records the exact deployed commit from /api/health.
  it("GET /api/health answers ok with version 'dev' when APP_VERSION is not set", async () => {
    delete process.env.APP_VERSION;
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "MoneyLog API", version: "dev" });
  });

  it("GET /api/health returns the commit from APP_VERSION", async () => {
    process.env.APP_VERSION = "49a3d9e0123456789abcdef0123456789abcdef0";
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.version).toBe("49a3d9e0123456789abcdef0123456789abcdef0");
  });

  it("GET /api/ready reports the database as connected", async () => {
    const res = await request(app).get("/api/ready");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("connected");
  });

  it("unknown API routes answer JSON 404", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
