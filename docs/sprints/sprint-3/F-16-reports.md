# F-16 Reports — Feature contract

| | |
|---|---|
| Requirements | FR-21, BR-11, BR-12, BR-13, NFR-04, NFR-10 |
| Depends on | F-03 (balances), F-07 (summary) |
| Version | 1.0 (28 Nov 2026), written before implementation (Issue #66) |

The **Reports** page shows, for the last *N* calendar months (Asia/Bangkok), income, expense and net per month, and the **net position** (assets − debts) at the end of each month.

## Behaviour and workflow
1. Menu **Reports** → `GET /api/reports/monthly?months=6` (default 6, allowed 1–24).
2. The page shows a table: Month (`2026-11`), Income, Expense, Net, Net position at month end. The current month is "to date" (ends today).
3. A simple bar chart (SVG, `aria-hidden`) shows income vs expense per month; the table is the accessible source.

## Rules
- **Income / expense** per month = F-07 rules (BR-12): only INCOME / EXPENSE lines, transaction date inside the month.
- **Net** = income − expense.
- **Net position at month end** = Σ CASH + Σ LOAN_GIVEN − Σ LOAN_TAKEN balances computed (BR-11) from every transaction dated **≤ the last day of the month**. Opening balances (BR-13) count only from their opening date (an opening dated after the month end is not included).
- Months with no data show 0.00. Integer satang throughout (NFR-04).
- `months` outside 1–24 or not an integer → 400 `VALIDATION_ERROR` (field `months`).

## Permissions
USER only, own data only (ADMIN → 403).

## API
`GET /api/reports/monthly?months=3` →
```json
{ "months": [ { "month": "2026-09", "from": "2026-09-01", "to": "2026-09-30", "income": "0.00", "expense": "0.00", "net": "0.00", "netPosition": "0.00" },
              { "month": "2026-10", "...": "..." },
              { "month": "2026-11", "from": "2026-11-01", "to": "2026-11-28", "income": "30000.00", "expense": "1500.00", "net": "28500.00", "netPosition": "28500.00" } ] }
```
Oldest month first.

## Acceptance criteria
- **AC-16-1** After the Sprint 1 journey this month: income 30,000.00, expense 1,500.00, net 28,500.00; the card repayment and opening balances are not income or expense.
- **AC-16-2** Net position at the end of the month = cash + loans given − loans taken at that date (e.g. bank 28,500.00, card 0.00 → 28,500.00). A transaction dated in October is included in October's position and every later month.
- **AC-16-3** An opening balance dated 15 Nov is not in October's net position but is in November's.
- **AC-16-4** `months=0`, `months=25`, `months=abc` → 400. `months=1` returns only the current month.
- **AC-16-5** Bob's data never appears in Alice's report; the Administrator gets 403.
- **AC-16-6** (NFR-10) With 2,000 transactions, the endpoint answers in < 500 ms p95 on the reference deployment (scripted check, Sprint 3 final).

## Tests (STS)
| Test ID | Level | AC | Input | Expected |
|---|---|---|---|---|
| TEST-UNIT-26 | unit (`monthlyReport`) | AC-16-1…3 | accounts + transactions over 3 months, opening dated mid-month | per-month income/expense/net and net position |
| TEST-API-140 | API + DB | AC-16-1, AC-16-2 | Sprint 1 journey; months=2 | values as AC-16-1/2 |
| TEST-API-141 | API + DB | AC-16-3 | opening balance 15 Nov; months=2 | Oct excludes, Nov includes |
| TEST-API-142 | API + DB | AC-16-4 | invalid months | 400 field `months` |
| TEST-API-143 | API + DB | AC-16-5 | Bob; admin | isolation; 403 |
| TEST-UI-17 | component | AC-16-1 | ReportsPage fixture | table rows and values |
| TEST-PERF-01 | scripted | AC-16-6 | 2,000 transactions, 50 requests | p95 < 500 ms |

## Definition of Done
Sprint 1 product DoD, every test above executed on the release commit (TEST-PERF-01 on the GCP deployment).

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 28 Nov 2026 | First contract, before implementation |
