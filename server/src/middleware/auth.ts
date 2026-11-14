import type { NextFunction, Request, Response } from "express";
import { resolveSession } from "../auth/sessions";
import { forbidden, unauthenticated } from "../http/errors";
import type { RoleName } from "../auth/types";

// Every protected request: valid, unexpired, unrevoked session of an enabled user (NFR-02, BR-03).
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    const resolved = token ? await resolveSession(token) : null;
    if (!resolved) return next(unauthenticated());
    req.user = resolved.user;
    req.sessionId = resolved.sessionId;
    next();
  } catch (err) {
    next(err);
  }
}

// Role check on the server; hiding a link in the UI is never the protection (System SDS §5).
export const requireRole = (role: RoleName) => (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== role) return next(forbidden());
  next();
};
