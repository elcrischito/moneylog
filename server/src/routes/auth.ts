// F-01 Authentication and sessions — contract docs/sprints/sprint-1/F-01-authentication.md
import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../prisma";
import { AppError, asyncHandler, badRequest } from "../http/errors";
import { createSession, revokeSession } from "../auth/sessions";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

// A real bcrypt hash used when the e-mail is unknown, so every failure takes about the same time.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8.Gm1ZJ1YxKvXyZzjUjLM9Bp1n2bJ6";
const invalidCredentials = () => new AppError(401, "INVALID_CREDENTIALS", "Invalid e-mail or password.");

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
      throw badRequest("VALIDATION_ERROR", "E-mail and password are required.", [
        ...(typeof email !== "string" || !email.trim() ? [{ field: "email", message: "E-mail is required." }] : []),
        ...(typeof password !== "string" || !password ? [{ field: "password", message: "Password is required." }] : []),
      ]);
    }
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    // Same answer for unknown e-mail, wrong password and disabled user (AC-01-2, AC-01-5).
    if (!user || !ok || !user.isActive) throw invalidCredentials();

    const token = await createSession(user.id);
    res.json({ token, user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role } });
  }),
);

authRouter.post(
  "/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    await revokeSession(req.sessionId!);
    res.status(204).end();
  }),
);

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
