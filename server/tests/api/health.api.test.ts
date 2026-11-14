import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app";

describe("health and readiness", () => {
  it("GET /api/health answers ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "MoneyLog API" });
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
