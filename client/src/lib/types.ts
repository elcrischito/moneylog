export type AccountType = "CASH" | "LOAN_GIVEN" | "LOAN_TAKEN" | "INCOME" | "EXPENSE";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  subtype: "WALLET" | "BANK" | "CREDIT_CARD" | "OTHER_LOAN" | null;
  openingBalance: string;
  openingDate: string | null;
  balance: string;
  isActive: boolean;
}

export interface AccountsResponse {
  accounts: Account[];
  totals: { cash: string; creditCardDebt: string; loansTaken: string; loansGiven: string };
}

export interface AccountRef {
  id: string;
  name: string;
  type: AccountType;
}

export interface Transaction {
  id: string;
  kind: "PAYMENT" | "RECEIPT";
  date: string;
  description: string;
  total: string;
  account: AccountRef;
  lines: { account: AccountRef; amount: string }[];
  isFavorite: boolean; // F-14
  createdAt: string;
}

export interface SummaryResponse {
  from: string;
  to: string;
  income: { total: string; byAccount: { accountId: string; name: string; amount: string }[] };
  expense: { total: string; byAccount: { accountId: string; name: string; amount: string }[] };
  net: string;
}

// F-10
export interface LoanRow {
  id: string;
  name: string;
  subtype: Account["subtype"];
  isActive: boolean;
  outstanding: string;
  openingBalance: string;
  openingDate: string | null;
  lastActivity: string | null;
  status: "OPEN" | "SETTLED" | "OVERPAID";
}
export interface LoansResponse {
  taken: LoanRow[];
  given: LoanRow[];
  totals: { taken: string; given: string; net: string };
}

// F-13
export interface SpendingResponse {
  from: string;
  to: string;
  total: string;
  categories: { accountId: string; name: string; amount: string; share: string }[];
}
