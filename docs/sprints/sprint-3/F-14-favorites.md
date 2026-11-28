# F-14 Favorites — Feature contract

| | |
|---|---|
| Requirements | FR-17, FR-18, BR-17 (favorites belong to their owner), BR-01, NFR-02 |
| Depends on | F-08 history, F-12 filters, F-11 edit |
| Version | 1.0 (28 Nov 2026), written before implementation (Issue #64) |

A user marks the transactions they repeat often (rent, phone bill, lunch) as **favorites** and lists only those. A favorite is a flag on the user's own transaction; it never changes amounts, balances or summaries.

## Behaviour and workflow
1. Each History row has a **star** toggle button ("☆ Add to favorites" / "★ Favorite"). Clicking it sends `PUT /api/transactions/:id/favorite { "isFavorite": true|false }`; the row updates without reloading the page.
2. The History filter bar (F-12) gets a **Favorites only** checkbox, sent as `favorite=true`. It combines with every other filter (AND).
3. Editing a transaction (F-11) keeps its favorite mark. Deleting it removes the mark with the row.

## Rules, validation, boundaries
| Code | Rule | HTTP |
|---|---|---|
| `VALIDATION_ERROR` | body `isFavorite` must be a boolean (`"true"`, 1, null are refused) | 400 |
| `NOT_FOUND` | unknown id, or another user's transaction (BR-01, BR-17): never revealed, never changed | 404 |
| `VALIDATION_ERROR` | query `favorite` is `true` or `false` (anything else refused, field `favorite`) | 400 |

- Setting the same value twice is allowed (idempotent): 200, nothing else changes.
- The flag changes **only** `isFavorite`: total, lines, date, `createdAt`, balances and summary are unchanged.
- No limit on the number of favorites.

## Permissions
USER only, own transactions only (ADMIN → 403).

## API
- `PUT /api/transactions/:id/favorite` `{ "isFavorite": true }` → `200 { "transaction": <TransactionDto> }` (TransactionDto already has `isFavorite`)
- `GET /api/transactions?favorite=true` → `{ transactions, count }` (F-12 shape)

## Data
No migration: `Transaction.isFavorite boolean default false` exists since Sprint 1 (System SDS §3).

## UI
`HistoryPage`: star button per row with an accessible name ("Add … to favorites" / "Remove … from favorites") and `aria-pressed`; `FilterBar`: "Favorites only" checkbox.

## Acceptance criteria
- **AC-14-1** Marking the card purchase as favorite returns 200 with `isFavorite: true`; it then appears in `favorite=true` and History shows ★. Unmarking removes it from the list.
- **AC-14-2** Marking changes nothing else: the stored total, lines, date, createdAt, all balances and the month summary are identical before and after.
- **AC-14-3** `favorite=true&kind=PAYMENT&min=1000` returns only favorite payments of at least 1,000.00 (AND with F-12 filters). `favorite=yes` → 400.
- **AC-14-4** Bob cannot mark Alice's transaction (404, Alice's flag unchanged) and Bob's `favorite=true` never lists Alice's favorites. The Administrator gets 403.
- **AC-14-5** Editing a favorite transaction (F-11 PUT) keeps `isFavorite: true`. `isFavorite: "true"` (a string) → 400.

## Tests (STS)
| Test ID | Level | AC | Input | Expected |
|---|---|---|---|---|
| TEST-UNIT-25 | unit (`parseTransactionFilter`) | AC-14-3 | `favorite` = true / false / yes / empty | `favorite: true/false`, error on field `favorite`, ignored when empty |
| TEST-API-120 | API + DB | AC-14-1 | mark, list, unmark, list | 200 isFavorite true; listed; 200 false; not listed |
| TEST-API-121 | API + DB | AC-14-2 | snapshot row + balances + summary, mark | all identical except isFavorite |
| TEST-API-122 | API + DB | AC-14-3 | 2 favorites (payment 1,500, receipt 30,000) + 1 plain payment; combined query; `favorite=yes` | only the 1,500 payment; 400 |
| TEST-API-123 | API + DB | AC-14-4 | Bob PUTs Alice's id; Bob lists favorites; admin PUT | 404 + Alice unchanged; Bob 0 Alice rows; 403 |
| TEST-API-124 | API + DB | AC-14-5 | mark, then F-11 PUT; body `"true"` | still favorite; 400 |
| TEST-UI-15 | component | AC-14-1 | History row star click | PUT sent with the opposite value; `aria-pressed` follows |

## Definition of Done
Sprint 1 product DoD (`docs/sprints/sprint-1/sts-and-dod.md`), every test above executed on the release commit.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 28 Nov 2026 | First contract, before implementation |
