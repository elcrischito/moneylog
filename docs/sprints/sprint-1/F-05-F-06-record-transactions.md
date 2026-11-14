# F-05 Make a payment / record a charge and F-06 Receive money — Feature contract

| | |
|---|---|
| Requirements | F-05: FR-10, BR-06, BR-07, BR-08, BR-10, BR-11, BR-14, NFR-04, NFR-05 · F-06: FR-11, BR-06, BR-07, BR-09, BR-10, BR-11, BR-14 |
| Depends on | F-01, F-03 |
| Version | 1.0 (14 Nov 2026), written before implementation |

These two features share one endpoint, one domain validator and one form, because the only differences are the `kind` and the allowed account types.

## Behaviour and workflow
1. The user opens **New transaction** and picks a tab: *Make a payment* (`PAYMENT`) or *Receive money* (`RECEIPT`).
2. They choose the paying account (PAYMENT: Cash or Loan Taken) or the receiving account (RECEIPT: Cash), a date (default today), a description and a total.
3. They add one or more allocation lines (account + amount). The form shows **Remaining to allocate = total − sum of lines** and disables *Save* until it is exactly 0.00.
4. *Save* sends `POST /api/transactions`. The server validates everything again (BR-06…BR-14). It then saves the transaction and its lines in **one database transaction** (NFR-05) and answers `201` with the saved transaction. The UI goes to History with a success message.
5. Balances (F-03), the summary (F-07) and the history (F-08) reflect the new transaction immediately, because balances are derived.

Sprint 1 journey (theme example), all by alice:

| Step | Kind | Primary account | Lines |
|---|---|---|---|
| Salary | RECEIPT 30,000.00 | Bangkok Bank Savings | Salary 30,000.00 |
| Card purchase | PAYMENT 1,500.00 | KTC Credit Card | Dining 900.00, Groceries 600.00 |
| Card repayment | PAYMENT 1,500.00 | Bangkok Bank Savings | KTC Credit Card 1,500.00 |

## Rules, validation, failure and boundary cases (all checked on the server by `validateTransaction`)

| Code | Rule | HTTP |
|---|---|---|
| `VALIDATION_ERROR` | `kind` ∈ {PAYMENT, RECEIPT}; `accountId`, `date`, `total`, `lines[]` present; description ≤ 200 characters | 400 |
| `INVALID_AMOUNT` | total and each line > 0, ≤ 2 decimals, ≤ 9,999,999.99 (BR-07, NFR-04) | 400 |
| `INVALID_LINE_COUNT` | 1 ≤ lines ≤ 20 (BR-07) | 400 |
| `LINES_TOTAL_MISMATCH` | sum(lines) = total exactly, in satang (BR-06) | 400 |
| `ACCOUNT_NOT_FOUND` | every account id belongs to the caller and is active (BR-10). Another user's account looks the same as a non-existent one. | 400 |
| `ACCOUNT_TYPE_NOT_ALLOWED` | PAYMENT: primary ∈ {CASH, LOAN_TAKEN}, lines ∈ {EXPENSE, LOAN_TAKEN, LOAN_GIVEN, CASH} (BR-08). RECEIPT: primary = CASH, lines ∈ {INCOME, LOAN_GIVEN, LOAN_TAKEN, CASH} (BR-09). | 400 |
| `LINE_USES_PRIMARY_ACCOUNT` | no line may use the primary account (BR-10) | 400 |
| `DATE_IN_FUTURE` | date ≤ today in Asia/Bangkok; today is accepted (BR-14) | 400 |

When a rule fails, **nothing** is written (NFR-05). Lines on the same account are allowed (e.g. two dining lines). An overdraft is allowed (BR-15).

## Permissions
USER only (ADMIN → 403). Only the caller's accounts can be used.

## API
`POST /api/transactions`
```json
{ "kind": "PAYMENT", "date": "2026-11-14", "description": "Dinner and groceries",
  "accountId": "<KTC Credit Card id>", "total": "1500.00",
  "lines": [ { "accountId": "<Dining id>", "amount": "900.00" },
             { "accountId": "<Groceries id>", "amount": "600.00" } ] }
```
`201`
```json
{ "transaction": { "id": "…", "kind": "PAYMENT", "date": "2026-11-14", "description": "Dinner and groceries",
    "total": "1500.00", "account": { "id": "…", "name": "KTC Credit Card", "type": "LOAN_TAKEN" },
    "lines": [ { "account": { "id": "…", "name": "Dining", "type": "EXPENSE" }, "amount": "900.00" },
               { "account": { "id": "…", "name": "Groceries", "type": "EXPENSE" }, "amount": "600.00" } ],
    "createdAt": "…" } }
```
Errors: `400` (codes above, with `details[]` per field/line), `401`, `403`.

## Data
Tables `Transaction` and `AllocationLine` (migration `init`). Constraints: `CHECK ("totalAmount" > 0)`, `CHECK ("amount" > 0)`, FKs to `FinancialAccount` and `User`, `ON DELETE CASCADE` from transaction to lines, index `(ownerId, date DESC)`.

## UI
One form with two tabs. The account selects are filtered by the allowed types of the selected kind. *+ Add line* / *Remove* buttons (1–20 lines). A live "Remaining to allocate" text appears in red when it is not 0. The form stays filled and shows the server error after a `400`. *Save* is disabled while saving.

## Acceptance criteria
| AC | Given / When / Then |
|---|---|
| AC-05-1 | Given alice, when she records the card purchase (1,500.00 = Dining 900.00 + Groceries 600.00), then `201`, the card owes 1,500.00, Dining = 900.00 and Groceries = 600.00. When she then pays the card 1,500.00 from the bank, the bank drops by 1,500.00 and the card owes 0.00. |
| AC-05-2 | Lines summing to 1,400.00 for a total of 1,500.00 give `400 LINES_TOTAL_MISMATCH`, and the number of alice's transactions is unchanged. |
| AC-05-3 | A total of 0, of −5, of "1.234" or above 9,999,999.99 gives `400 INVALID_AMOUNT`. 0 or 21 lines give `400 INVALID_LINE_COUNT`. 20 lines are accepted. 0.10 + 0.20 lines = total 0.30 is accepted (no float error). |
| AC-05-4 | A payment with an INCOME line, or paid from an INCOME/EXPENSE/LOAN_GIVEN account, gives `400 ACCOUNT_TYPE_NOT_ALLOWED`. |
| AC-05-5 | Using bob's account, an unknown id, or an inactive account in alice's transaction gives `400 ACCOUNT_NOT_FOUND`. A line on the primary account gives `400 LINE_USES_PRIMARY_ACCOUNT`. Nothing is stored. |
| AC-05-6 | Tomorrow's date gives `400 DATE_IN_FUTURE`; today's date is accepted. |
| AC-06-1 | Given alice, when she receives 30,000.00 salary into the bank, then the bank rises by 30,000.00 and Salary = 30,000.00. |
| AC-06-2 | A receipt with an EXPENSE line, or into a LOAN_TAKEN account, gives `400 ACCOUNT_TYPE_NOT_ALLOWED`. |
| AC-06-3 | A receipt into the wallet of 3,000.00 = borrowing from "Other loan" 2,000.00 + transfer from bank 1,000.00 raises the wallet by 3,000.00, raises the loan owed by 2,000.00 and lowers the bank by 1,000.00. Income is unchanged. |

## Software Test Specification
| Test | Level | AC | Input / precondition | Expected |
|---|---|---|---|---|
| TEST-UNIT-01 | unit | AC-05-2 | `validateTransaction` with lines ≠ total, and = total | LINES_TOTAL_MISMATCH / ok |
| TEST-UNIT-02 | unit | AC-05-3 | `parseMoney` on "0.10", "0.20", "1.234", "0", "-5", "abc", "10000000.00"; 0/20/21 lines | exact satang; rejections with INVALID_AMOUNT / INVALID_LINE_COUNT |
| TEST-UNIT-03 | unit | AC-05-4, AC-06-2, AC-05-5 | each disallowed type combination; line = primary | ACCOUNT_TYPE_NOT_ALLOWED / LINE_USES_PRIMARY_ACCOUNT |
| TEST-UNIT-07 | unit | AC-05-6 | date = today / tomorrow (Bangkok) | ok / DATE_IN_FUTURE |
| TEST-API-30 | API+DB | AC-05-1 | alice: opening 10,000, salary, card purchase, repayment | 201 ×3; balances bank 38,500.00, card 0.00, dining 900.00, groceries 600.00 |
| TEST-API-31 | API+DB | AC-05-2 | lines 1,400 vs total 1,500 | 400 LINES_TOTAL_MISMATCH; transaction count unchanged |
| TEST-API-32 | API+DB | AC-05-3 | total "0", "1.234" | 400 INVALID_AMOUNT |
| TEST-API-33 | API+DB | AC-05-4 | payment with Salary line | 400 ACCOUNT_TYPE_NOT_ALLOWED |
| TEST-API-34 | API+DB | AC-05-5 | alice uses bob's Dining id | 400 ACCOUNT_NOT_FOUND; nothing stored |
| TEST-API-35 | API+DB | AC-05-6 | tomorrow / today | 400 DATE_IN_FUTURE / 201 |
| TEST-API-40 | API+DB | AC-06-1 | salary receipt | bank +30,000.00; Salary 30,000.00 |
| TEST-API-41 | API+DB | AC-06-2 | receipt with Dining line; receipt into the card | 400 ACCOUNT_TYPE_NOT_ALLOWED ×2 |
| TEST-API-42 | API+DB | AC-06-3 | borrowing + transfer receipt | wallet +3,000.00, loan +2,000.00, bank −1,000.00, income unchanged |
| TEST-UI-02 | UI component | AC-05-2 | form total 1,500, lines 900 + 500 | "Remaining to allocate ฿100.00", Save disabled; becomes enabled at 0.00 |
| TEST-E2E-01 | E2E | AC-05-1, AC-06-1 | full journey in the browser | dashboard shows bank 38,500.00 and card debt 0.00 |

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 14 Nov 2026 | First contract (before implementation) |
