// F-17 User administration and own password — contract docs/sprints/sprint-3/F-17-user-admin-and-password.md
import type { Result } from "./ledger";

export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // bcrypt limit
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const weak = (message: string) => ({ ok: false as const, error: { code: "WEAK_PASSWORD", message, details: [{ field: "password", message }] } });
const invalid = (field: string, message: string) => ({ ok: false as const, error: { code: "VALIDATION_ERROR", message, details: [{ field, message }] } });

/** 10–72 characters, at least one letter and one digit. */
export function checkPassword(input: unknown): Result<string> {
  if (typeof input !== "string") return weak("Password must be text.");
  if (input.length < PASSWORD_MIN || input.length > PASSWORD_MAX) return weak(`Password must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters long.`);
  if (!/[A-Za-z]/.test(input) || !/\d/.test(input)) return weak("Password must contain at least one letter and one digit.");
  return { ok: true, value: input };
}

export function validateNewUser(input: unknown): Result<{ email: string; fullName: string; password: string }> {
  const b = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return invalid("email", "Enter a valid e-mail address.");
  const fullName = typeof b.fullName === "string" ? b.fullName.trim() : "";
  if (fullName.length < 1 || fullName.length > 100) return invalid("fullName", "Full name must be 1 to 100 characters long.");
  const pw = checkPassword(b.password);
  if (!pw.ok) return pw;
  return { ok: true, value: { email, fullName, password: pw.value } };
}
