// CR-01 / BR-15 v2 — TEST-UNIT-08
// Contract: docs/sprints/sprint-1/F-05-F-06-record-transactions.md v1.1 (AC-05-7, AC-05-8, AC-06-4)
import { describe, it, expect } from "vitest";
import { walletShortfalls, type LedgerAccount } from "../../src/domain/ledger";

const acc = (id: string, type: LedgerAccount["type"], subtype: LedgerAccount["subtype"] = null): LedgerAccount => ({
  id, type, subtype, openingBalance: 0, isActive: true,
});
const accounts = new Map(
  [acc("wallet", "CASH", "WALLET"), acc("wallet2", "CASH", "WALLET"), acc("bank", "CASH", "BANK"), acc("dining", "EXPENSE"), acc("salary", "INCOME")].map((a) => [a.id, a]),
);
const pay = (from: string, total: number, lines = [{ accountId: "dining", amount: total }]) => ({ kind: "PAYMENT" as const, primaryAccountId: from, total, lines });
const receive = (into: string, total: number, lines: { accountId: string; amount: number }[]) => ({ kind: "RECEIPT" as const, primaryAccountId: into, total, lines });

describe("TEST-UNIT-08 walletShortfalls (BR-15 v2)", () => {
  const bal = (w: number, b = 0) => new Map([["wallet", w], ["wallet2", 0], ["bank", b], ["dining", 0], ["salary", 0]]);

  it("AC-05-7: paying exactly the wallet balance is allowed (boundary 0.00)", () => {
    expect(walletShortfalls(pay("wallet", 50000), bal(50000), accounts)).toEqual([]);
  });

  it("AC-05-7: one satang more is a shortfall naming the wallet and its available balance", () => {
    expect(walletShortfalls(pay("wallet", 50001), bal(50000), accounts)).toEqual([{ accountId: "wallet", available: 50000, after: -1 }]);
  });

  it("AC-05-8: a bank account may still go below zero", () => {
    expect(walletShortfalls(pay("bank", 10000), bal(0, 0), accounts)).toEqual([]);
  });

  it("AC-05-8: money into a negative wallet is always allowed", () => {
    expect(walletShortfalls(receive("wallet", 1000, [{ accountId: "salary", amount: 1000 }]), bal(-130), accounts)).toEqual([]);
  });

  it("AC-05-8: a negative wallet cannot pay even a small amount", () => {
    expect(walletShortfalls(pay("wallet", 1), bal(-130), accounts)).toEqual([{ accountId: "wallet", available: -130, after: -131 }]);
  });

  it("AC-06-4: a wallet line in a receipt is a transfer out of the wallet", () => {
    expect(walletShortfalls(receive("bank", 30001, [{ accountId: "wallet", amount: 30001 }]), bal(30000), accounts)).toEqual([
      { accountId: "wallet", available: 30000, after: -1 },
    ]);
    expect(walletShortfalls(receive("bank", 30000, [{ accountId: "wallet", amount: 30000 }]), bal(30000), accounts)).toEqual([]);
  });

  it("a payment from one wallet into another checks only the wallet money leaves", () => {
    expect(walletShortfalls(pay("wallet", 2000, [{ accountId: "wallet2", amount: 2000 }]), bal(1000), accounts)).toEqual([
      { accountId: "wallet", available: 1000, after: -1000 },
    ]);
  });
});
