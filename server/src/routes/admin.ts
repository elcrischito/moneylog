// F-02 Administrator user access — contract docs/sprints/sprint-1/F-02-admin-user-access.md
// Mounted behind requireAuth + requireRole("ADMIN") in app.ts.
import { Router } from "express";
import { prisma } from "../prisma";
import { asyncHandler, badRequest, notFound } from "../http/errors";
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
