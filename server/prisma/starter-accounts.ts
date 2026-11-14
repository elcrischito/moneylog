// Accounts every seeded user starts with (the theme's Sprint 1 example + one of each type).
import { AccountType, AccountSubtype } from "@prisma/client";

export const STARTER_ACCOUNTS: { name: string; type: AccountType; subtype?: AccountSubtype }[] = [
  { name: "Bangkok Bank Savings", type: AccountType.CASH, subtype: AccountSubtype.BANK },
  { name: "Wallet", type: AccountType.CASH, subtype: AccountSubtype.WALLET },
  { name: "KTC Credit Card", type: AccountType.LOAN_TAKEN, subtype: AccountSubtype.CREDIT_CARD },
  { name: "Loan from Mom", type: AccountType.LOAN_TAKEN, subtype: AccountSubtype.OTHER_LOAN },
  { name: "Loan to Ploy", type: AccountType.LOAN_GIVEN },
  { name: "Salary", type: AccountType.INCOME },
  { name: "Interest Earned", type: AccountType.INCOME },
  { name: "Dining", type: AccountType.EXPENSE },
  { name: "Groceries", type: AccountType.EXPENSE },
  { name: "Electricity", type: AccountType.EXPENSE },
  { name: "Telecom", type: AccountType.EXPENSE },
];
