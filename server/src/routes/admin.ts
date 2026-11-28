// F-02 Administrator user access — contract docs/sprints/sprint-1/F-02-admin-user-access.md
// F-17 create user / reset password — contract docs/sprints/sprint-3/F-17-user-admin-and-password.md
// Mounted behind requireAuth + requireRole("ADMIN") in app.ts.
import { Router } from "express";
import { prisma } from "../prisma";
import bcrypt from "bcryptjs";
import { AppError, asyncHandler, badRequest, forbidden, notFound } from "../http/errors";
import { checkPassword, validateNewUser } from "../domain/users";
import { STARTER_ACCOUNTS } from "../../prisma/starter-accounts";
import { revokeAllSessions } from "../auth/sessions";

export const adminRouter = Router();

// Only access-related fields: never the hash, never financial data (AC-02-1, BR-02).
const PUBLIC_USER = { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true } as const;

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({ select: PUBLIC_USER, orderBy: { fullName: "asc" } });
    res.json({ users });
  }),
);

adminRouter.patch(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const { isActive } = req.body ?? {};
    if (typeof isActive !== "boolean") {
      throw badRequest("VALIDATION_ERROR", "isActive must be true or false.", [{ field: "isActive", message: "Must be a boolean." }]);
    }
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User");

    // BR-04: never disable yourself or the last enabled administrator.
    if (!isActive && target.role === "ADMIN") {
      const enabledAdmins = await prisma.user.count({ where: { role: "ADMIN", isActive: true } });
      if (target.id === req.user!.id || enabledAdmins <= 1) {
        throw badRequest("CANNOT_DISABLE_ADMIN", "You cannot disable your own account or the last enabled administrator.");
      }
    }

    const user = await prisma.user.update({ where: { id: target.id }, data: { isActive }, select: PUBLIC_USER });
    if (!isActive) await revokeAllSessions(target.id); // BR-03: effective immediately
    res.json({ user });
  }),
);

const BCRYPT_COST = 10; // NFR-01

// F-17: create a USER with an initial password and the 11 starter accounts (same as the seed).
adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const v = validateNewUser(req.body);
    if (!v.ok) throw new AppError(400, v.error.code, v.error.message, v.error.details);
    const exists = await prisma.user.findFirst({ where: { email: { equals: v.value.email, mode: "insensitive" } } });
    if (exists) throw new AppError(409, "EMAIL_TAKEN", "A user with this e-mail already exists.", [{ field: "email", message: "Already used." }]);
    const passwordHash = await bcrypt.hash(v.value.password, BCRYPT_COST);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { email: v.value.email, fullName: v.value.fullName, passwordHash, role: "USER" }, select: PUBLIC_USER });
      await tx.financialAccount.createMany({ data: STARTER_ACCOUNTS.map((a) => ({ ...a, subtype: a.subtype ?? null, ownerId: u.id })) });
      return u;
    });
    res.status(201).json({ user });
  }),
);

// F-17: reset a user's password; every session of that user is revoked (they must sign in again).
adminRouter.post(
  "/users/:id/password",
  asyncHandler(async (req, res) => {
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw notFound("User");
    if (target.role === "ADMIN" && target.id !== req.user!.id) throw forbidden(); // AC-17-6
    const pw = checkPassword(req.body?.password);
    if (!pw.ok) throw new AppError(400, pw.error.code, pw.error.message, pw.error.details);
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash: await bcrypt.hash(pw.value, BCRYPT_COST) } });
    await revokeAllSessions(target.id);
    res.status(204).end();
  }),
);
