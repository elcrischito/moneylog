# F-15 Duplicate a transaction — Feature contract

| | |
|---|---|
| Requirements | FR-19, BR-17, BR-06 … BR-14, BR-15 v2 |
| Depends on | F-05/F-06 (create), F-08 (history), F-09 (inactive accounts) |
| Version | 1.0 (28 Nov 2026), written before implementation (Issue #65) |

**Duplicate** opens the new-transaction form pre-filled from an existing transaction, so a repeated expense (rent, lunch split) is recorded in two clicks. Nothing is saved until the user submits.

## Behaviour and workflow
1. Each History row has **Duplicate** → `/transactions/new?from=<id>`.
2. The page loads `GET /api/transactions/:id` (own transaction only) and pre-fills kind, account, description, total and lines. The **date is today** (Asia/Bangkok), not the original date.
3. The user may change anything, then **Save transaction** sends a normal `POST /api/transactions`. The server validates it as any new transaction (every Sprint 1 rule and the CR-01 wallet rule).
4. If the original used an account that is now **inactive** (F-09), that account is not offered; the field is left empty and a note says "Some accounts of the original are inactive and were left empty."
5. If the id is unknown or belongs to another user, the page shows "Transaction not found." and an empty form.

## Rules
- BR-17: the original transaction is never changed (no request is sent to it).
- The duplicate is a new row: new id, new `createdAt`, `isFavorite = false`.
- No new API: the feature reuses `GET /api/transactions/:id` and `POST /api/transactions`.

## Permissions
USER only. `GET /api/transactions/:id` already answers 404 for another user's id (BR-01) and 403 for the Administrator.

## UI
`HistoryPage`: **Duplicate** link per row. `NewTransactionPage`: reads `from`, shows "Duplicated from <date> <description>", passes `initial` to `TransactionForm` (F-11) with today's date and inactive accounts removed.

## Acceptance criteria
- **AC-15-1** Duplicating the card purchase (1,500.00 = 900 + 600) opens the form with the same kind, account, description, total and lines, and today's date. Saving creates a **second** transaction; balances move by the same amounts again.
- **AC-15-2** The original is unchanged: same id, date, total, lines, `isFavorite`.
- **AC-15-3** A duplicate whose line account is now inactive has that line's account empty; Save stays disabled until an active account is chosen.
- **AC-15-4** `?from=` with another user's id shows "Transaction not found." (the API answers 404) and saves nothing.

## Tests (STS)
| Test ID | Level | AC | Input | Expected |
|---|---|---|---|---|
| TEST-UNIT-UI-16 (`duplicatePayload`) | unit | AC-15-1, AC-15-3 | original + accounts with one inactive, today | same fields, date = today, inactive account id cleared, `dropped = 1` |
| TEST-API-130 | API + DB | AC-15-1, AC-15-2 | GET original, POST the duplicate payload | 201 new id; original row byte-identical; balances doubled |
| TEST-UI-16 | component | AC-15-1 | NewTransactionPage with `from` (fetch mocked) | form pre-filled, date today, banner text |
| TEST-E2E-30 | E2E | AC-15-1, AC-15-2 | History → Duplicate → Save | two rows with the same description; first row unchanged |

## Definition of Done
Sprint 1 product DoD, every test above executed on the release commit.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 28 Nov 2026 | First contract, before implementation |
