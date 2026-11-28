// F-09 Manage financial accounts — contract docs/sprints/sprint-2/F-09-manage-accounts.md
import type { AccountSubtype, AccountType, Result } from "./ledger";

export const MAX_ACCOUNT_NAME = 60;
export const MAX_ACCOUNTS_PER_USER = 100;

export interface NewAccount {
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
}

/** RED stub — implemented in the GREEN commit. */
export function validateNewAccount(_input: unknown): Result<NewAccount> {
  return { ok: true, value: { name: "", type: "CASH", subtype: null } };
}

/** RED stub. */
export function validateAccountName(_input: unknown): Result<string> {
  return { ok: true, value: "" };
}

/** Case-insensitive comparison key for BR-05 / AC-09-3. */
export const nameKey = (name: string) => name.trim().toLowerCase();
