# F-07 Income and expense summary and F-08 Transaction history — Feature contract

| | |
|---|---|
| Requirements | F-07: FR-13, BR-12 · F-08: FR-12, BR-01 |
| Depends on | F-05, F-06 |
| Version | 1.0 (14 Nov 2026), written before implementation |

## Behaviour and workflow
**F-07.** **Summary** shows a date range (default: the first day of the current month to today) and a *Show* button. The client calls `GET /api/summary?from=&to=`. The server takes the caller's transactions with `from ≤ date ≤ to`. Income = sum of lines on INCOME accounts. Expense = sum of lines on EXPENSE accounts. Net = income − expense (BR-12). It also returns the total per income and per expense account, sorted by amount descending. Accounts with 0 are omitted. Transfers, borrowing, loan repayments and opening balances never appear, because they are not INCOME/EXPENSE lines.

**F-08.** **History** lists the caller's transactions newest first: date, kind, primary account, description and total. A row expands to show its allocation lines. If there are none, it shows "No transactions yet — record your first one" and a link to New transaction. Optional `?limit=` (default 50, maximum 200).

## Rules, validation, failure and boundary cases
- `from` and `to` are optional `YYYY-MM-DD` dates. A malformed date, or `from > to`, gives `400 VALIDATION_ERROR`. Both bounds are inclusive.
- Transactions are ordered by `date DESC, createdAt DESC`.
- `GET /api/transactions/:id` for an id that is not the caller's gives `404 NOT_FOUND` (BR-01). The ADMIN role gets `403` (BR-02).

## API
`GET /api/summary?from=2026-11-01&to=2026-11-30` →
```json
{ "from": "2026-11-01", "to": "2026-11-30",
  "income":  { "total": "30000.00", "byAccount": [ { "accountId": "…", "name": "Salary", "amount": "30000.00" } ] },
  "expense": { "total": "1500.00",  "byAccount": [ { "accountId": "…", "name": "Dining", "amount": "900.00" },
                                                  { "accountId": "…", "name": "Groceries", "amount": "600.00" } ] },
  "net": "28500.00" }
```
`GET /api/transactions?limit=50` → `200 { "transactions": [ <transaction as in F-05> ] }`
`GET /api/transactions/:id` → `200 { "transaction": … }` | `404`

## Data
No change (reads `Transaction`, `AllocationLine`, `FinancialAccount`).

## UI
- **Summary**: two date inputs with labels, then three cards (Income, Expense, Net) and two lists per account.
- **History**: a table on desktop and cards on mobile. *Show lines* toggles the lines. Loading, empty and error states with Retry.

## Acceptance criteria
| AC | Given / When / Then |
|---|---|
| AC-07-1 | After the Sprint 1 journey, the summary for the month shows income 30,000.00 (Salary), expense 1,500.00 (Dining 900.00, Groceries 600.00) and net 28,500.00. A range that excludes the dates shows zeros. |
| AC-07-2 | Transfers, borrowing, loan/card repayments and opening balances in the range do not change income or expense. |
| AC-08-1 | History shows alice's transactions newest first, each with its lines. |
| AC-08-2 | Bob's history contains none of alice's transactions. Bob opening alice's transaction id gets `404`. |

## Software Test Specification
| Test | Level | AC | Input / precondition | Expected |
|---|---|---|---|---|
| TEST-UNIT-06 | unit | AC-07-1, AC-07-2 | `summarize` over the journey + transfer + borrowing + repayment, range inside/outside | income 30,000.00, expense 1,500.00; out-of-range → 0 |
| TEST-API-50 | API+DB | AC-07-1, AC-07-2 | journey + borrowing receipt + transfer; GET summary | totals as above; borrowing/transfer absent; invalid range → 400 |
| TEST-API-60 | API+DB | AC-08-1 | three transactions on different dates | order newest first, lines included |
| TEST-API-61 | API+DB | AC-08-2 | bob lists history and opens alice's id | none of alice's; 404 |
| TEST-E2E-01 | E2E | AC-07-1, AC-08-1 | browser journey | summary card income ฿30,000.00, expense ฿1,500.00; history has 3 rows |

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 14 Nov 2026 | First contract (before implementation) |
