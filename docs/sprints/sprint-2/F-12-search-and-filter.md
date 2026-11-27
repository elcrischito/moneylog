# F-12 Search and filter transactions — Feature contract

| | |
|---|---|
| Requirements | FR-16, BR-01 |
| Depends on | F-08 |
| Version | 1.0 (27 Nov 2026), written before implementation (Issue #52) |

History gets a filter bar. A user can narrow their own transactions by date range, account, kind, text and total amount. All filters combine with AND.

## Behaviour and workflow
1. The filter bar on **History** has:
   - **From** and **To** dates;
   - **Account** (any of the user's accounts, active or not);
   - **Type** (Any / Payment / Receipt);
   - **Text**;
   - **Min** and **Max** total;
   - **Apply** and **Clear**.
2. **Apply** calls `GET /api/transactions` with the filled filters as query parameters. The list shows "N transactions" and the rows, newest first (as F-08).
3. **Clear** resets every field and reloads the unfiltered list.
4. When nothing matches, the page shows "No transaction matches these filters.".

## Filter rules
| Parameter | Meaning | Validation (400 `VALIDATION_ERROR`, field named) |
|---|---|---|
| `from`, `to` | date ≥ from, date ≤ to (inclusive) | YYYY-MM-DD; `from` ≤ `to` |
| `accountId` | the account is the primary account **or** is on any line | a UUID; an id the user does not own simply matches nothing (no leak, no error) |
| `kind` | PAYMENT or RECEIPT | one of the two |
| `q` | description contains `q`, case-insensitive (`ILIKE '%q%'`, with `%` and `_` escaped) | trimmed, 1–100 characters |
| `min`, `max` | total ≥ min, total ≤ max (inclusive) | money format (> 0 not required: 0.00 allowed), ≤ 2 decimals; `min` ≤ `max` |
| `limit` | as Sprint 1: 1–200, default 50 | — |

- The owner filter (BR-01) is always applied first. No parameter can widen it.
- Boundaries are inclusive: `to = date` keeps the transactions of that day, and `min = 1500.00` keeps a total of exactly 1,500.00.

## Permissions
USER only (ADMIN → 403).

## API
`GET /api/transactions?from=2026-11-01&to=2026-11-30&accountId=…&kind=PAYMENT&q=dinner&min=100&max=2000&limit=50`
→ `200 { "transactions": [ … ], "count": 3 }` (`count` = the number of rows returned).

## UI
The `HistoryPage` filter bar wraps on 360 px. Every input has a label. "Apply" is a submit button, so Enter works.

## Acceptance criteria
- **AC-12-1** With the three journey transactions, `q=DINNER` returns only the card purchase "Dinner and groceries" (case-insensitive).
- **AC-12-2** `accountId` = Groceries returns the card purchase, where Groceries is a line. `accountId` = Bangkok Bank Savings returns the salary and the repayment, where it is the primary account.
- **AC-12-3** `from = to = <date>` returns that day's transactions. `min = max = 1500.00` returns the two transactions of exactly 1,500.00.
- **AC-12-4** `from` after `to`, `min` > `max`, `kind=TRANSFER`, a `q` of 101 characters, and `min=1.234` each give 400 `VALIDATION_ERROR`.
- **AC-12-5** Bob filtering with Alice's `accountId` or Alice's description text gets 0 rows. The Administrator gets 403.
- **AC-12-6** Filters combine: `kind=PAYMENT&min=1000` excludes the salary (a RECEIPT).

## Tests (STS)
| Test ID | Level | Input | Expected |
|---|---|---|---|
| TEST-UNIT-23 | unit (`parseTransactionFilter`) | valid/invalid query objects incl. boundaries | parsed filter or field errors |
| TEST-API-100 | API + DB | q=DINNER | 1 row (AC-12-1) |
| TEST-API-101 | API + DB | accountId line vs primary | rows as AC-12-2 |
| TEST-API-102 | API + DB | inclusive date and amount boundaries | rows as AC-12-3 |
| TEST-API-103 | API + DB | invalid parameters | 400 each (AC-12-4) |
| TEST-API-104 | API + DB | Bob with Alice's id/text; admin | 0 rows; 403 (AC-12-5) |
| TEST-API-105 | API + DB | kind + min combined | AND semantics (AC-12-6) |
| TEST-UI-13 | component | HistoryPage filter bar | query string built from the filled fields only; Clear resets |

## Definition of Done
The Sprint 1 product DoD applies.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | First contract, before implementation |
