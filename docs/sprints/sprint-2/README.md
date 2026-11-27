# Sprint 2 — contracts, test design and Definition of Done

Contracts version 1.0 (27 Nov 2026), committed **before** any Sprint 2 implementation (PR "Sprint 2 contracts"). Later changes are recorded in each contract's revision history; earlier versions remain in Git history.

| Feature | Issue | Contract | AC | Planned tests |
|---|---|---|---|---|
| F-09 Manage financial accounts | #49 | [F-09](F-09-manage-accounts.md) | AC-09-1 … AC-09-8 | TEST-UNIT-20, TEST-API-70…78, TEST-UI-10 |
| F-10 Loans overview | #50 | [F-10](F-10-loans-overview.md) | AC-10-1 … AC-10-5 | TEST-UNIT-21, TEST-API-80…83, TEST-UI-11 |
| F-11 Transaction correction | #51 | [F-11](F-11-transaction-correction.md) | AC-11-1 … AC-11-6 | TEST-UNIT-22, TEST-API-90…95, TEST-UI-12, TEST-E2E-20 |
| F-12 Search and filter | #52 | [F-12](F-12-search-and-filter.md) | AC-12-1 … AC-12-6 | TEST-UNIT-23, TEST-API-100…105, TEST-UI-13 |
| F-13 Category spending | #53 | [F-13](F-13-category-spending.md) | AC-13-1 … AC-13-5 | TEST-UNIT-24, TEST-API-110…113, TEST-UI-14 |
| Cross-feature regression | — | — | Sprint 1 AC-01-1 … AC-08-2 stay green | all Sprint 1 tests + TEST-E2E-21 (Sprint 1 journey + Sprint 2 pages, desktop and 360 px) |

## Test levels (same tools as Sprint 1)
- **Unit** (Vitest): pure domain functions in `server/src/domain/` — no database.
- **API + DB** (Vitest + Supertest against a real PostgreSQL migrated with the committed migrations): every AC, including boundaries, other-user (404/0 rows) and Administrator (403) paths.
- **UI component** (Vitest + React Testing Library) for each new page/form.
- **E2E** (Playwright, desktop + 360 px) for the correction journey and the new pages.

**TDD.** For each feature the failing tests are committed and pushed first (CI red on the PR), then the implementation (CI green). The PR description links both runs.

## Layers that need no change
- **Database:** no migration for F-09…F-13 — `FinancialAccount.isActive`, the unique `(ownerId, name)` index, `Transaction.isFavorite` and the cascade from Transaction to AllocationLine already exist (Sprint 1 migration `20261114160000_init`).
- **Authentication / roles (F-01, F-02):** unchanged; every new route is mounted behind the existing `requireAuth + requireRole("USER")`, so the Administrator denial (403) is inherited and re-tested per feature.
- **Balances (F-03):** derived as before; F-10, F-11 and F-13 reuse `computeBalances` / the ledger loader.

## Definition of Done
The product Definition of Done in [`../sprint-1/sts-and-dod.md`](../sprint-1/sts-and-dod.md) applies unchanged to every Sprint 2 feature. The Sprint 2 release is the release PR `staging → main` that integrates F-09…F-13, tagged `v0.2.0`.
