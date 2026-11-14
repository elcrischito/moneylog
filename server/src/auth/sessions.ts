// Server-side opaque sessions (System SDS §6, NFR-03): 256-bit random token, only its
// SHA-256 hash is stored, fixed lifetime, revoked by logout or when the user is disabled.
import crypto from "crypto";
import { prisma } from "../prisma";
import { config } from "../config";
import type { AuthUser } from "./types";

export const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + config.sessionTtlHours() * 3600 * 1000),
    },
  });
  return token;
}

export async function resolveSession(token: string): Promise<{ sessionId: string; user: AuthUser } | null> {
  if (!/^[0-9a-f]{64}$/.test(token)) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user.isActive) return null;
  const { id, email, fullName, role } = session.user;
  return { sessionId: session.id, user: { id, email, fullName, role } };
}

export async function revokeSession(sessionId: string) {
  await prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
}

export async function revokeAllSessions(userId: string) {
  await prisma.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
}
