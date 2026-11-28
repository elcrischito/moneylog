// F-17 User administration and own password — contract docs/sprints/sprint-3/F-17-user-admin-and-password.md
import type { Result } from "./ledger";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // bcrypt limit

/** RED stub — implemented in the GREEN commit. */
export function checkPassword(_input: unknown): Result<string> {
  return { ok: true, value: "" };
}

/** RED stub. */
export function validateNewUser(_input: unknown): Result<{ email: string; fullName: string; password: string }> {
  return { ok: true, value: { email: "", fullName: "", password: "" } };
}
