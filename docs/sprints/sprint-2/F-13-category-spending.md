# F-13 Category spending — Feature contract

| | |
|---|---|
| Requirements | FR-20, BR-12, BR-01 |
| Depends on | F-07 |
| Version | 1.0 (27 Nov 2026), written before implementation (Issue #53) |

For a period, show how much was spent per **expense account** (category), sorted by amount, with each category's share of total spending.

## Behaviour and workflow
1. The menu gets a **Spending** item. The page has **From** / **To** (default: this month, the 1st to today in Asia/Bangkok, as F-07) and **Show**.
2. `GET /api/spending?from&to` returns the categories.
3. The page shows a table (Category, Amount, Share) with a horizontal bar per row, whose width is the share. Under it: **Total spending**.
4. An empty period shows "No spending in this period." and Total 0.00.

## Rules
- Only lines on **EXPENSE** accounts count (BR-12). A card repayment, a loan, a transfer or an opening balance never counts.
- The amount per category is the sum of its EXPENSE lines whose transaction date is in `[from, to]`, inclusive.
- **Share** = amount / total × 100, rounded **half-up to one decimal**, and shown as text (`"58.3"`). It is computed in integers: `round(amount × 1000 / total) / 10`. Because of the rounding, the shares may add up to 99.9–100.1. The UI shows the exact amounts, so the total is always exact.
- Sort by amount, largest first, then by name (A→Z) for equal amounts.
- Inactive expense accounts (F-09) are included when they have spending in the period.
- A category with 0.00 in the period is not listed.

## Validation
`from` / `to`: YYYY-MM-DD with `from` ≤ `to`, otherwise 400 `VALIDATION_ERROR` (same as F-07).

## Permissions
USER only, own data only (ADMIN → 403).

## API
`GET /api/spending?from=2026-11-01&to=2026-11-30` →
```json
{ "from": "2026-11-01", "to": "2026-11-30", "total": "1500.00",
  "categories": [ { "accountId": "…", "name": "Dining", "amount": "900.00", "share": "60.0" },
                  { "accountId": "…", "name": "Groceries", "amount": "600.00", "share": "40.0" } ] }
```

## Acceptance criteria
- **AC-13-1** After the Sprint 1 journey, this month shows Dining 900.00 (60.0) and Groceries 600.00 (40.0), Total 1,500.00. The card repayment and the salary are not counted.
- **AC-13-2** Spending of 1.00, 1.00 and 1.00 in three categories gives shares 33.3, 33.3 and 33.3, sorted by name. Each amount is exact.
- **AC-13-3** A period with no spending gives total 0.00 and an empty list. `from` > `to` gives 400.
- **AC-13-4** The date boundaries are inclusive: a 25.00 expense dated `to` is counted, and one dated the day after `to` is not.
- **AC-13-5** Bob's spending is not included in Alice's view. The Administrator gets 403.

## Tests (STS)
| Test ID | Level | Input | Expected |
|---|---|---|---|
| TEST-UNIT-24 | unit (`categorySpending`) | lines incl. non-expense, equal amounts, 1/3 split, out-of-range dates | amounts, shares half-up, sort, exclusions |
| TEST-API-110 | API + DB | Sprint 1 journey | AC-13-1 |
| TEST-API-111 | API + DB | empty period; from > to | AC-13-3 |
| TEST-API-112 | API + DB | expenses on `to` and on the day after | AC-13-4 |
| TEST-API-113 | API + DB | Bob's spending; admin | AC-13-5 |
| TEST-UI-14 | component | SpendingPage fixture | rows, share text, bar width style, total |

## Definition of Done
The Sprint 1 product DoD applies.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | First contract, before implementation |
