// F-09 Manage financial accounts — contract docs/sprints/sprint-2/F-09-manage-accounts.md
import type { AccountSubtype, AccountType, Result } from "./ledger";

export const MAX_ACCOUNT_NAME = 60;
export const MAX_ACCOUNTS_PER_USER = 100;
export const ACCOUNT_TYPES: readonly AccountType[] = ["CASH", "LOAN_TAKEN", "LOAN_GIVEN", "INCOME", "EXPENSE"];

// BR-05: which subtype each type needs (null = no subtype).
export const SUBTYPES_FOR: Record<AccountType, readonly AccountSubtype[]> = {
  CASH: ["WALLET", "BANK"],
  LOAN_TAKEN: ["CREDIT_CARD", "OTHER_LOAN"],
  LOAN_GIVEN: [null],
  INCOME: [null],
  EXPENSE: [null],
};

export interface NewAccount {
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
}

const err = (code: string, message: string, field: string) => ({ ok: false as const, error: { code, message, details: [{ field, message }] } });

/** Trimmed name, 1–60 characters. */
export function validateAccountName(input: unknown): Result<string> {
  if (typeof input !== "string") return err("VALIDATION_ERROR", "Name must be text.", "name");
  const name = input.trim();
  if (name.length < 1 || name.length > MAX_ACCOUNT_NAME) {
    return err("VALIDATION_ERROR", `Name must be 1 to ${MAX_ACCOUNT_NAME} characters long.`, "name");
  }
  return { ok: true, value: name };
}

export function validateNewAccount(input: unknown): Result<NewAccount> {
  const body = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  if (!input || typeof input !== "object") return err("VALIDATION_ERROR", "Body must be an object.", "name");
  const name = validateAccountName(body.name);
  if (!name.ok) return name;
  if (!ACCOUNT_TYPES.includes(body.type as AccountType)) {
    return err("VALIDATION_ERROR", "Type must be CASH, LOAN_TAKEN, LOAN_GIVEN, INCOME or EXPENSE.", "type");
  }
  const type = body.type as AccountType;
  const subtype = (body.subtype ?? null) as AccountSubtype;
  if (!SUBTYPES_FOR[type].includes(subtype)) {
    const need = SUBTYPES_FOR[type][0] === null ? "no subtype" : SUBTYPES_FOR[type].join(" or ");
    return err("INVALID_SUBTYPE", `A ${type} account needs ${need}.`, "subtype");
  }
  return { ok: true, value: { name: name.value, type, subtype } };
}

/** Case-insensitive comparison key for BR-05 / AC-09-3. */
export const nameKey = (name: string) => name.trim().toLowerCase();
