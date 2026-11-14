// Runtime configuration from environment variables (NFR-07).
// Every variable is documented in server/.env.example and docs/system-sds.md Section 7.
export const isProduction = () => process.env.NODE_ENV === "production";

export const config = {
  port: () => Number(process.env.PORT) || 4000,
  sessionTtlHours: () => {
    const n = Number(process.env.SESSION_TTL_HOURS);
    return Number.isFinite(n) && n > 0 ? n : 8;
  },
  corsOrigins: () =>
    (process.env.CORS_ORIGIN ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
};

export function assertProductionConfig(): void {
  if (!isProduction()) return;
  if (!process.env.DATABASE_URL) {
    throw new Error("Missing required environment variable in production: DATABASE_URL");
  }
}
