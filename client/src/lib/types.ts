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
