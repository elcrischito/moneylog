# F-10 Loans overview — Feature contract

| | |
|---|---|
| Requirements | FR-14 (loan view), BR-11, BR-13, BR-01 |
| Depends on | F-03, F-04, F-05, F-06 |
| Version | 1.0 (27 Nov 2026), written before implementation (Issue #50) |

Sprint 1 showed only two totals: "Loans taken (incl. cards)" and "Loans given". F-10 adds a **Loans** page. It shows each Loan Taken account (credit cards included) and each Loan Given account with its outstanding amount, the opening amount, and the last time money moved on it.

## Behaviour and workflow
1. The menu gets a **Loans** item, which opens `GET /api/loans`.
2. The page has two tables:
   - **I owe** (LOAN_TAKEN: credit cards and other loans)
   - **Owed to me** (LOAN_GIVEN)

   Each row shows the name, the subtype, the outstanding amount, the opening amount and date, and the date of the last transaction that touched the account.
3. Rows are sorted by outstanding amount, largest first, then by name.
4. Under the tables: **Total I owe**, **Total owed to me**, and **Net** = owed to me − I owe.
5. A loan account whose outstanding amount is 0.00 is shown as **Settled**. An inactive loan account (F-09) is listed only if its outstanding amount is not 0.00, which cannot happen after a valid deactivation, but old data stays visible.

## Rules
- **Outstanding** = the derived balance of the account (BR-11, the same `computeBalances` as F-03). For LOAN_TAKEN, a positive amount means I owe it. For LOAN_GIVEN, a positive amount means it is owed to me. Nothing new is stored.
- A negative outstanding amount (for example, a card overpaid by 0.50) is shown as it is, with the label **Overpaid**. It counts in the totals with its sign.
- Totals use integer satang. Net can be negative.
- Opening balances are part of the outstanding amount (BR-13), but they are never income or expense (BR-12, unchanged).

## Permissions
USER only, own accounts only (ADMIN → 403).

## API
`GET /api/loans` →
```json
{ "taken": [ { "id": "…", "name": "KTC Credit Card", "subtype": "CREDIT_CARD", "isActive": true,
               "outstanding": "1500.00", "openingBalance": "0.00", "openingDate": null,
               "lastActivity": "2026-11-27", "status": "OPEN" } ],
  "given": [ { "id": "…", "name": "Loan to Ploy", "subtype": null, "isActive": true,
               "outstanding": "2000.00", "openingBalance": "2000.00", "openingDate": "2026-11-01",
               "lastActivity": null, "status": "OPEN" } ],
  "totals": { "taken": "1500.00", "given": "2000.00", "net": "500.00" } }
```
`status` is `OPEN` (> 0), `SETTLED` (= 0) or `OVERPAID` (< 0).

## UI
`LoansPage`: two tables with a caption and the status as a text badge (not only a colour), and a totals line. It works at 360 px, because the tables scroll horizontally inside their card.

## Acceptance criteria
- **AC-10-1** After the Sprint 1 journey (card purchase 1,500.00), KTC Credit Card shows outstanding 1,500.00 OPEN. After the 1,500.00 repayment, it shows 0.00 SETTLED.
- **AC-10-2** Loan to Ploy with opening balance 2,000.00 and a receipt line of 500.00 from Ploy shows 1,500.00 owed to me. Net = given − taken.
- **AC-10-3** A card repaid by 1,500.50 against 1,500.00 shows −0.50 OVERPAID, and the totals include −0.50.
- **AC-10-4** Rows are sorted by outstanding amount, largest first. `lastActivity` is the latest transaction date that uses the account as primary or line, or `null`.
- **AC-10-5** Bob sees only his own loans. The Administrator gets 403. CASH, INCOME and EXPENSE accounts never appear.

## Tests (STS)

| Test ID | Level | Input | Expected |
|---|---|---|---|
| TEST-UNIT-21 | unit (`loanOverview`) | balances map + accounts + transactions incl. a negative and a zero | status OPEN/SETTLED/OVERPAID, sort order, totals and net in satang, lastActivity |
| TEST-API-80 | API + DB | Sprint 1 journey, then GET /api/loans | card 1500.00 OPEN, then 0.00 SETTLED (AC-10-1) |
| TEST-API-81 | API + DB | Loan to Ploy opening 2000.00, receipt line 500.00 | 1500.00; totals and net (AC-10-2) |
| TEST-API-82 | API + DB | card repayment 1500.50 | −0.50 OVERPAID in the row and in the total (AC-10-3) |
| TEST-API-83 | API + DB | Bob and admin call GET /api/loans | Bob: only his loans; admin 403; no CASH/INCOME/EXPENSE rows (AC-10-5) |
| TEST-UI-11 | component | LoansPage with a fixture | two tables, status text, totals line |

## Definition of Done
The Sprint 1 product DoD applies.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | First contract, before implementation |
