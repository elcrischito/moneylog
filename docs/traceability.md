# Requirements → Feature → Sprint → Verification → Result — MoneyLog

Version **2.0 (28 Nov 2026, Deliverable 2)**. Replaces the forward-looking v1.0 (Sprint 1 baseline, 14 Nov 2026), which is kept in Git history. Every row maps a baseline requirement (SRS 1.2, including the approved change CR-01) to its feature or system responsibility, sprint, acceptance criteria, planned tests, the **actual test file** and the **result with the version** it ran on.

*Result* = all listed automated tests passed on staging `a68cb20` (server 120/120, client 17/17, Playwright 12/12; CI run on the same commit) unless the row says otherwise. *Planned* = contract written, test not yet implemented or not yet run — never counted as done.

| Requirement | Feature / resp. | Sprint | AC / verification | Planned tests | Actual files | Result (version) |
|---|---|---|---|---|---|---|
| FR-01 Sign in | F-01 | 1 | AC-01-1, AC-01-2 | TEST-API-01, TEST-API-02, TEST-UI-01, TEST-E2E-01 | `Login.test.tsx`, `sprint1-journey.spec.ts`, `auth.api.test.ts` | pass `a68cb20` |
| FR-02 Sign out | F-01 | 1 | AC-01-4 | TEST-API-04, TEST-E2E-01 | `sprint1-journey.spec.ts`, `auth.api.test.ts` | pass `a68cb20` |
| FR-03 Current user | F-01 | 1 | AC-01-3 | TEST-API-03 | `auth.api.test.ts` | pass `a68cb20` |
| FR-04 Admin lists users | F-02 | 1 | AC-02-1 | TEST-API-10 | `admin.api.test.ts` | pass `a68cb20` |
| FR-05 Admin enables/disables | F-02 | 1 | AC-02-2, AC-02-3 | TEST-API-11, TEST-API-12, TEST-E2E-02 | `admin.spec.ts`, `admin.api.test.ts` | pass `a68cb20` |
| FR-06 Admin creates user / resets password | F-17 | 3 | AC-17-1…3, AC-17-5, AC-17-6 | TEST-API-150, TEST-API-151, TEST-API-152, TEST-API-154, TEST-UNIT-27 | — | **planned — not run** |
| FR-07 Account balances | F-03 | 1 | AC-03-1, AC-03-2 | TEST-API-20, TEST-UNIT-05 | `accounts.api.test.ts`, `ledger.balances.test.ts` | pass `a68cb20` |
| FR-08 Manage accounts | F-09 | 2 | AC-09-1 … AC-09-8 | TEST-UNIT-20, TEST-API-70, TEST-API-71, TEST-API-72, TEST-API-73, TEST-API-74, TEST-API-75, TEST-API-76, TEST-API-77, TEST-API-78, TEST-UI-10 | `AccountsPage.test.tsx`, `accounts.manage.api.test.ts`, `accounts.validate.test.ts` | pass `a68cb20` |
| FR-09 Opening balance | F-04 | 1 | AC-04-1 … AC-04-3 | TEST-API-21, TEST-API-22, TEST-UNIT-04 | `accounts.api.test.ts`, `ledger.balances.test.ts` | pass `a68cb20` |
| FR-10 Payment / charge | F-05 | 1 | AC-05-1 … AC-05-6 | TEST-API-30, TEST-API-31, TEST-API-32, TEST-API-33, TEST-API-34, TEST-API-35, TEST-API-36, TEST-UNIT-01, TEST-UNIT-02, TEST-UNIT-03, TEST-UI-02, TEST-UI-03, TEST-E2E-01 | `Nav.test.tsx`, `TransactionForm.test.tsx`, `sprint1-journey.spec.ts`, `transactions.api.test.ts`, `ledger.transactions.test.ts` | pass `a68cb20` |
| FR-11 Receive money | F-06 | 1 | AC-06-1 … AC-06-3 | TEST-API-40, TEST-API-41, TEST-API-42, TEST-E2E-01 | `sprint1-journey.spec.ts`, `transactions.api.test.ts` | pass `a68cb20` |
| FR-12 History | F-08 | 1 | AC-08-1, AC-08-2 | TEST-API-60, TEST-API-61, TEST-E2E-01 | `sprint1-journey.spec.ts`, `summary-history.api.test.ts` | pass `a68cb20` |
| FR-13 Income/expense summary | F-07 | 1 | AC-07-1, AC-07-2 | TEST-API-50, TEST-UNIT-06, TEST-E2E-01 | `sprint1-journey.spec.ts`, `summary-history.api.test.ts`, `ledger.summary.test.ts` | pass `a68cb20` |
| FR-14 Outstanding loans | F-03 totals / F-10 | 1 / 2 | AC-03-2, AC-10-1 … AC-10-5 | TEST-API-20, TEST-UNIT-21, TEST-API-80, TEST-API-81, TEST-API-82, TEST-API-83, TEST-UI-11 | `LoansPage.test.tsx`, `accounts.api.test.ts`, `loans.api.test.ts`, `loans.overview.test.ts` | pass `a68cb20` |
| FR-15 Correction (edit/delete) | F-11 | 2 | AC-11-1 … AC-11-7 | TEST-UNIT-22, TEST-API-90, TEST-API-91, TEST-API-92, TEST-API-93, TEST-API-94, TEST-API-95, TEST-API-96, TEST-UI-12, TEST-E2E-20 | `TransactionForm.test.tsx`, `sprint2-correction.spec.ts`, `transactions.edit.api.test.ts`, `ledger.edit.test.ts` | pass `a68cb20` |
| FR-16 Search / filter | F-12 | 2 | AC-12-1 … AC-12-6 | TEST-UNIT-23, TEST-API-100, TEST-API-101, TEST-API-102, TEST-API-103, TEST-API-104, TEST-API-105, TEST-UI-13 | `FilterBar.test.tsx`, `transactions.filter.api.test.ts`, `filter.parse.test.ts` | pass `a68cb20` |
| FR-17 Mark favorite | F-14 | 3 | AC-14-1, AC-14-2, AC-14-5 | TEST-API-120, TEST-API-121, TEST-API-124, TEST-UI-15, TEST-E2E-30 | `FavoriteButton.test.tsx`, `sprint3-duplicate-favorite.spec.ts`, `favorites.api.test.ts` | pass `a68cb20` |
| FR-18 List favorites | F-14 | 3 | AC-14-1, AC-14-3 | TEST-UNIT-25, TEST-API-120, TEST-API-122, TEST-E2E-30 | `sprint3-duplicate-favorite.spec.ts`, `favorites.api.test.ts`, `filter.favorite.test.ts` | pass `a68cb20` |
| FR-19 Duplicate | F-15 | 3 | AC-15-1 … AC-15-4 | TEST-UNIT-UI-16, TEST-API-130, TEST-UI-16, TEST-E2E-30 | `NewTransactionDuplicate.test.tsx`, `duplicate.test.ts`, `sprint3-duplicate-favorite.spec.ts`, `duplicate.api.test.ts` | pass `a68cb20` |
| FR-20 Category spending | F-13 | 2 | AC-13-1 … AC-13-5 | TEST-UNIT-24, TEST-API-110, TEST-API-111, TEST-API-112, TEST-API-113, TEST-UI-14 | `SpendingPage.test.tsx`, `spending.api.test.ts`, `spending.test.ts` | pass `a68cb20` |
| FR-21 Reports | F-16 | 3 | AC-16-1 … AC-16-5 | TEST-UNIT-26, TEST-API-140, TEST-API-141, TEST-API-142, TEST-API-143, TEST-UI-17 | — | **planned — not run** |
| FR-22 Change own password | F-17 | 3 | AC-17-4 | TEST-API-153, TEST-UI-18 | — | **planned — not run** |
| BR-01 Own records only | F-03…F-15 | 1–3 | AC-03-3, AC-05-5, AC-08-2, AC-09-7, AC-10-5, AC-11-4, AC-12-5, AC-13-5, AC-14-4, AC-15-4 | TEST-API-23, TEST-API-34, TEST-API-61, TEST-API-76, TEST-API-83, TEST-API-93, TEST-API-104, TEST-API-113, TEST-API-123, TEST-API-130 | `accounts.api.test.ts`, `accounts.manage.api.test.ts`, `duplicate.api.test.ts`, `favorites.api.test.ts`, `loans.api.test.ts`, `spending.api.test.ts`, `summary-history.api.test.ts`, `transactions.api.test.ts`, `transactions.edit.api.test.ts`, `transactions.filter.api.test.ts` | pass `a68cb20` |
| BR-02 Admin no financial data | F-02 (all financial routes) | 1–3 | AC-02-4, AC-09-7, AC-10-5, AC-11-4, AC-12-5, AC-13-5, AC-14-4 | TEST-API-13, TEST-E2E-02, TEST-API-76, TEST-API-83, TEST-API-93, TEST-API-104, TEST-API-113, TEST-API-123 | `Nav.test.tsx`, `admin.spec.ts`, `accounts.manage.api.test.ts`, `admin.api.test.ts`, `favorites.api.test.ts`, `loans.api.test.ts`, `spending.api.test.ts`, `transactions.edit.api.test.ts`, `transactions.filter.api.test.ts` | pass `a68cb20` |
| BR-03 Disabled user blocked | F-01, F-02 | 1 | AC-01-5, AC-02-3 | TEST-API-05, TEST-API-12 | `admin.api.test.ts`, `auth.api.test.ts` | pass `a68cb20` |
| BR-04 Admin self/last-admin guard | F-02 | 1 | AC-02-5 | TEST-API-14 | `admin.api.test.ts` | pass `a68cb20` |
| BR-05 Account types/subtypes | F-03 / F-09 | 1 / 2 | AC-03-1, AC-09-2, AC-09-8 | TEST-API-20, TEST-UNIT-20, TEST-API-71, TEST-API-77 | `accounts.api.test.ts`, `accounts.manage.api.test.ts`, `accounts.validate.test.ts` | pass `a68cb20` |
| BR-06 Lines = total | F-05, F-06, F-11 | 1 / 2 | AC-05-2, AC-11-2 | TEST-UNIT-01, TEST-API-31, TEST-UI-02, TEST-API-91 | `TransactionForm.test.tsx`, `transactions.api.test.ts`, `transactions.edit.api.test.ts`, `ledger.transactions.test.ts` | pass `a68cb20` |
| BR-07 Amount range / precision | F-05, F-06 | 1 | AC-05-3 | TEST-UNIT-02, TEST-API-32 | `transactions.api.test.ts`, `ledger.transactions.test.ts` | pass `a68cb20` |
| BR-08 Payment account types | F-05 | 1 | AC-05-4 | TEST-UNIT-03, TEST-API-33 | `transactions.api.test.ts`, `ledger.transactions.test.ts` | pass `a68cb20` |
| BR-09 Receipt account types | F-06, F-11 | 1 / 2 | AC-06-2, AC-11-6 | TEST-UNIT-03, TEST-API-41, TEST-API-95 | `transactions.api.test.ts`, `transactions.edit.api.test.ts`, `ledger.transactions.test.ts` | pass `a68cb20` |
| BR-10 Same owner, active, not self | F-05, F-06, F-09, F-11 | 1 / 2 | AC-05-5, AC-09-5, AC-11-5 | TEST-API-34, TEST-API-74, TEST-UNIT-22, TEST-API-94 | `accounts.manage.api.test.ts`, `transactions.api.test.ts`, `transactions.edit.api.test.ts`, `ledger.edit.test.ts` | pass `a68cb20` |
| BR-11 Double-entry effects | F-03, F-05, F-06, F-10, F-11 | 1 / 2 | AC-05-1, AC-06-1, AC-10-1, AC-11-1 | TEST-UNIT-05, TEST-API-30, TEST-API-40, TEST-API-80, TEST-API-90 | `loans.api.test.ts`, `transactions.api.test.ts`, `transactions.edit.api.test.ts`, `ledger.balances.test.ts` | pass `a68cb20` |
| BR-12 Only income/expense lines counted | F-07, F-13, F-16 | 1 / 2 / 3 | AC-07-2, AC-13-1, AC-16-1 | TEST-UNIT-06, TEST-API-50, TEST-UNIT-24, TEST-API-110, TEST-API-140 | `spending.api.test.ts`, `summary-history.api.test.ts`, `ledger.summary.test.ts`, `spending.test.ts` | pass `a68cb20` for 4 tests; **planned:** TEST-API-140 |
| BR-13 Opening balance rules | F-04, F-16 | 1 / 3 | AC-04-2, AC-04-3, AC-16-3 | TEST-API-22, TEST-UNIT-04, TEST-API-141 | `accounts.api.test.ts`, `ledger.balances.test.ts` | pass `a68cb20` for 2 tests; **planned:** TEST-API-141 |
| BR-14 Date not in the future | F-05, F-06, F-11 | 1 / 2 | AC-05-6, AC-11-2 | TEST-API-35, TEST-API-36, TEST-UI-03, TEST-API-91 | `Nav.test.tsx`, `TransactionForm.test.tsx`, `transactions.api.test.ts`, `transactions.edit.api.test.ts` | pass `a68cb20` |
| BR-15 v2 Wallet ≥ 0 (CR-01) | F-05, F-06, F-11 | Lab 7 / 2 | AC-05-7…9, AC-06-4, AC-11-7 | TEST-UNIT-08, TEST-API-37, TEST-API-38, TEST-API-39, TEST-API-96 | `transactions.edit.api.test.ts`, `wallet.api.test.ts`, `ledger.wallet.test.ts` | pass `a68cb20` |
| BR-16 Atomic correction | F-11 | 2 | AC-11-1, AC-11-2 | TEST-API-90, TEST-API-91 | `transactions.edit.api.test.ts` | pass `a68cb20` |
| BR-17 Duplicate never changes original; favorites per owner | F-14, F-15 | 3 | AC-14-4, AC-15-2 | TEST-API-123, TEST-API-130 | `duplicate.api.test.ts`, `favorites.api.test.ts` | pass `a68cb20` |
| NFR-01 Password hashing, never returned | F-01, F-17 | 1 / 3 | AC-01-6, AC-17-5 | TEST-API-06, TEST-API-154 | `auth.api.test.ts` | pass `a68cb20` for 1 tests; **planned:** TEST-API-154 |
| NFR-02 401 on protected routes | F-01 | 1 | AC-01-7 | TEST-API-07 | `auth.api.test.ts` | pass `a68cb20` |
| NFR-03 Session lifecycle | F-01, F-17 | 1 / 3 | AC-01-4, AC-01-8, AC-17-3, AC-17-4 | TEST-API-04, TEST-API-08, TEST-API-152, TEST-API-153 | `auth.api.test.ts` | pass `a68cb20` for 2 tests; **planned:** TEST-API-152, TEST-API-153 |
| NFR-04 Integer money | F-05, F-13, F-16 | 1 / 2 / 3 | AC-05-3, AC-13-2 | TEST-UNIT-02, TEST-UNIT-24 | `ledger.transactions.test.ts`, `spending.test.ts` | pass `a68cb20` |
| NFR-05 Atomic save | F-05, F-06, F-11 | 1 / 2 | AC-05-2, AC-11-2 | TEST-API-31, TEST-API-91 | `transactions.api.test.ts`, `transactions.edit.api.test.ts` | pass `a68cb20` |
| NFR-06 Persistence across redeploy | R-01 | Lab 5 / D2 | post-deploy check | D2-E3 (manual, after the RC deployment) | — | manual / CI evidence (D2 Part E) |
| NFR-07 Env config, Docker | R-01 | Lab 5 | Dockerfile + .env.example review | CI job test-and-docker (Docker build) | — | manual / CI evidence (D2 Part E) |
| NFR-08 One-command tests, CI gate | R-01 | Lab 5 | merge gate | CI job test-and-docker required on main | — | manual / CI evidence (D2 Part E) |
| NFR-09 Usability at 360 px | R-02 | 1–3 | no horizontal scroll; every E2E also runs in the mobile-360 project | TEST-E2E-03, TEST-E2E-20, TEST-E2E-30 | `sprint1-journey.spec.ts`, `sprint2-correction.spec.ts`, `sprint3-duplicate-favorite.spec.ts` | pass `a68cb20` |
| NFR-10 Performance p95 < 500 ms | R-02 / F-16 | 3 | AC-16-6 | TEST-PERF-01 | — | **planned — not run** |

## Coverage and gaps (28 Nov 2026)

- Every FR, BR and listed NFR has a feature or responsibility, a sprint, AC and named tests. **No requirement is unallocated.**
- **Not yet verified (planned for the final release, 13 Dec):** FR-06 Admin creates user / resets password; FR-21 Reports; FR-22 Change own password; BR-12 Only income/expense lines counted (partly); BR-13 Opening balance rules (partly); NFR-01 Password hashing, never returned (partly); NFR-03 Session lifecycle (partly); NFR-10 Performance p95 < 500 ms. Their contracts (F-16, F-17) are written; their tests are planned and **not** counted as passed.
- NFR-06/07/08 are verified by delivery evidence (deployment, CI gate, redeploy persistence), not by unit tests.
- Each test ID above was found in the listed file by a script (`grep` of the test sources at the version shown); IDs without a file are marked planned.
