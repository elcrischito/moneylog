# Sprint 1 — Software Test Specification (summary) and Product Definition of Done

Version 1.0 (14 Nov 2026), written before implementation. The detailed STS rows live in each feature contract. This page lists every planned test once, with its level and planned file, so that Part F can map AC → test → result.

## Test levels and tools

| Level | Tool | What it covers | Location |
|---|---|---|---|
| Unit | Vitest | Domain rules in `server/src/domain/ledger.ts`: money parsing, BR-06…BR-14 validation, double-entry balances, summaries | `server/tests/unit/` |
| API + DB integration | Vitest + Supertest against a real PostgreSQL | Authentication, authorization (401/403/404), persistence, atomic writes | `server/tests/api/` |
| UI component | Vitest + React Testing Library (jsdom) | Login error, allocation form, navigation by role | `client/tests/` |
| End-to-end | Playwright (Chromium; desktop + 360 px mobile) | Sprint 1 journey, admin journey, mobile layout | `client/tests-e2e/` |

## Planned tests

| Test | Level | AC | Planned file |
|---|---|---|---|
| TEST-UNIT-01 | unit | AC-05-2 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-02 | unit | AC-05-3 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-03 | unit | AC-05-4, AC-05-5, AC-06-2 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-04 | unit | AC-04-2, AC-04-3 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-05 | unit | AC-03-1, AC-03-2 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-06 | unit | AC-07-1, AC-07-2 | `server/tests/unit/ledger.test.ts` |
| TEST-UNIT-07 | unit | AC-05-6 | `server/tests/unit/ledger.test.ts` |
| TEST-API-01 … 08 | API+DB | AC-01-1 … AC-01-8 | `server/tests/api/auth.api.test.ts` |
| TEST-API-10 … 14 | API+DB | AC-02-1 … AC-02-5 | `server/tests/api/admin.api.test.ts` |
| TEST-API-20 … 23 | API+DB | AC-03-1 … AC-04-2 | `server/tests/api/accounts.api.test.ts` |
| TEST-API-30 … 35 | API+DB | AC-05-1 … AC-05-6 | `server/tests/api/transactions.api.test.ts` |
| TEST-API-40 … 42 | API+DB | AC-06-1 … AC-06-3 | `server/tests/api/transactions.api.test.ts` |
| TEST-API-50 | API+DB | AC-04-3, AC-07-1, AC-07-2 | `server/tests/api/summary-history.api.test.ts` |
| TEST-API-60, 61 | API+DB | AC-08-1, AC-08-2 | `server/tests/api/summary-history.api.test.ts` |
| TEST-UI-01 | UI | AC-01-2 | `client/tests/Login.test.tsx` |
| TEST-UI-02 | UI | AC-05-2 | `client/tests/TransactionForm.test.tsx` |
| TEST-UI-03 | UI | AC-02-4 | `client/tests/Nav.test.tsx` |
| TEST-E2E-01 | E2E | AC-01-1, AC-01-4, AC-05-1, AC-06-1, AC-07-1, AC-08-1 | `client/tests-e2e/sprint1-journey.spec.ts` |
| TEST-E2E-02 | E2E | AC-02-2, AC-02-4 | `client/tests-e2e/admin.spec.ts` |
| TEST-E2E-03 | E2E | NFR-09 | `client/tests-e2e/sprint1-journey.spec.ts` (mobile project) |

**Manual checks** (supplements, not substitutes): NFR-06 persistence after a server restart (record a transaction, stop and start the API, reload, the transaction is still listed); visual check of the screens at 360 px.

**TDD.** For the domain rules (TEST-UNIT-01…07) and the authorization rules (TEST-API-13, TEST-API-34, TEST-API-61), the tests are committed first and seen failing (CI run on the PR), then the implementation is committed and the same tests pass. The PRs record both runs.

## Product Definition of Done (applies to every Sprint 1 feature)

A feature is **Done** only when all of these are true and the evidence exists:

1. **Behaviour.** Every AC of the feature contract is implemented. Every business rule is enforced on the server.
2. **Verification executed.** Every planned test for its AC exists and was run on the release commit. Results are recorded with the command, counts (passed/failed/skipped) and the commit SHA.
3. **Meaningful tests passing.** The tests assert real behaviour against a real database, not stubs. No required test is skipped, disabled or weakened. Failures are reported.
4. **Review and integration.** The work went through an Issue → feature branch from `staging` → PR into `staging` with a written review (self-review for this one-member team, stating what was checked) → CI green → merged. It is then released from `staging` to `main` through a release PR.
5. **Documents current.** The contract, traceability and README match the code. Any change to a contract is recorded in its revision history.
6. **Setup reproducible.** A fresh clone runs with the README commands and the seed. No real secret is committed.
7. **Disclosure.** Any incomplete work, known defect or failed/skipped test is listed in the release notes and the Deliverable 1 PDF.
