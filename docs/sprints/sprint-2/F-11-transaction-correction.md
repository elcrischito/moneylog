# F-11 Transaction correction (edit and delete) — Feature contract

| | |
|---|---|
| Requirements | FR-15, BR-16, BR-06…BR-14, BR-01, NFR-05 |
| Depends on | F-05, F-06, F-08 |
| Version | 1.0 (27 Nov 2026), written before implementation (Issue #51) |

A user can correct a mistake: change any field or line of their own transaction, or delete it. Balances, summaries, loans and spending are derived, so they reflect the correction at once (BR-16).

## Behaviour and workflow
1. Each History row gets **Edit** and **Delete**.
2. **Edit** opens `/transactions/:id/edit`: the Sprint 1 form, pre-filled with the transaction (kind, account, date, description, total, lines).
   - *Save* sends `PUT /api/transactions/:id` with the same body as `POST`.
   - The server validates it exactly like a new transaction, with every Sprint 1 rule (BR-06…BR-14).
   - It then **replaces** the transaction and all its lines in **one database transaction** (NFR-05): the fields are updated, the old lines deleted and the new lines inserted. The id and `createdAt` are kept.
   - The answer is `200` with the corrected transaction. History opens with "Transaction updated.".
3. **Delete** asks for confirmation ("Delete this transaction? Balances will change.").
   - Then `DELETE /api/transactions/:id` removes the transaction and its lines (cascade) → `204`.
   - History shows "Transaction deleted.".
4. A favorite mark (Sprint 3, F-14) is kept on edit.

## Rules, validation, boundaries
- **Same validation as creation** (BR-06…BR-14), so the codes are those of the F-05/F-06 contract.
- **Kind may change** (PAYMENT ↔ RECEIPT): the new kind's account rules apply (BR-08/BR-09).
- **Inactive accounts (F-09):** an account deactivated after the transaction was recorded may stay in the corrected transaction **only if the original already used it in the same role** (primary or line). Any other use of an inactive account → 400 `ACCOUNT_NOT_FOUND`. This lets the user fix the description or the date of an old transaction without reactivating accounts.
- **Atomic:** if any rule fails, the stored transaction is unchanged, with the same lines and amounts (NFR-05).
- **Not found:** an unknown id, or another user's transaction → `404 NOT_FOUND`. It is never revealed and never changed (BR-01).
- **Delete is permanent:** Sprint 2 has no undo. The confirmation dialog is the safeguard.

## Permissions
USER only, own transactions only (ADMIN → 403).

## API
- `PUT /api/transactions/:id`, with the same body as `POST /api/transactions` → `200 { "transaction": <TransactionDto> }`
- `DELETE /api/transactions/:id` → `204`
- Errors: `400` (F-05/F-06 codes), `401`, `403`, `404`.

## UI
- `HistoryPage`: **Edit** link and **Delete** button per row, with a confirm dialog.
- `EditTransactionPage` reuses `TransactionForm` with `initial` values and an `onSubmit` that calls PUT.
- The form shows inactive accounts **only** when the original used them (label "(inactive)").

## Acceptance criteria
- **AC-11-1** Editing the card purchase from 1,500.00 (Dining 900 + Groceries 600) to 1,200.00 (Dining 700 + Groceries 500) gives KTC Credit Card +1,200.00, Dining +700, Groceries +500. The month's expense drops by 300.00. The id and `createdAt` are unchanged.
- **AC-11-2** An edit with lines ≠ total, a future date, or another user's account is refused with the F-05 code. The stored transaction is unchanged (same total, same lines).
- **AC-11-3** Deleting the 30,000.00 salary removes it from History. Bangkok Bank Savings drops by 30,000.00 and the month's income drops by 30,000.00. Its lines are gone from the database.
- **AC-11-4** Bob's PUT or DELETE on Alice's transaction → 404, and Alice's transaction is unchanged. The Administrator → 403.
- **AC-11-5** After Dining is deactivated, an old transaction with a Dining line can still be edited (description changed). Adding a **new** line on a different inactive account → 400 `ACCOUNT_NOT_FOUND`.
- **AC-11-6** Changing the kind from PAYMENT to RECEIPT with valid RECEIPT accounts is accepted. Balances follow the new kind.

## Tests (STS)

| Test ID | Level | Input | Expected |
|---|---|---|---|
| TEST-UNIT-22 | unit (`validateTransaction` with `allowInactive`) | inactive account in the original role vs a new role | accepted / `ACCOUNT_NOT_FOUND` |
| TEST-API-90 | API + DB | PUT 1500 → 1200 (700 + 500) | 200; balances and summary as AC-11-1; same id, createdAt |
| TEST-API-91 | API + DB | PUT with mismatch, future date, Bob's account | 400 codes; DB row and lines unchanged (AC-11-2) |
| TEST-API-92 | API + DB | DELETE the salary | 204; balance and income −30000; 0 lines in DB (AC-11-3) |
| TEST-API-93 | API + DB | Bob PUT/DELETE on Alice's tx; admin | 404 and unchanged; 403 (AC-11-4) |
| TEST-API-94 | API + DB | deactivate Dining, edit old tx; add another inactive account | 200; then 400 (AC-11-5) |
| TEST-API-95 | API + DB | PAYMENT → RECEIPT | 200; balances follow (AC-11-6) |
| TEST-UI-12 | component | TransactionForm with `initial` | fields pre-filled; submit sends the edited body |
| TEST-E2E-20 | E2E (Playwright) | record → edit → delete through the UI | balances on Accounts follow each step |

## Definition of Done
The Sprint 1 product DoD applies.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | First contract, before implementation |
