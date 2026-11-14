// "38500.00" -> "฿38,500.00" ; negative values keep their sign.
export function thb(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  const sign = n < 0 ? "-" : "";
  return `${sign}฿${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CASH: "Cash and bank",
  LOAN_TAKEN: "Loans taken and credit cards",
  LOAN_GIVEN: "Loans given",
  INCOME: "Income",
  EXPENSE: "Expenses",
};

export const SUBTYPE_LABEL: Record<string, string> = {
  BANK: "Bank",
  WALLET: "Wallet",
  CREDIT_CARD: "Credit card",
  OTHER_LOAN: "Loan",
};

export function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
