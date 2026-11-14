# Requirements → Feature → Sprint → Verification — MoneyLog

Version 1.0 (Sprint 1 baseline, 14 Nov 2026). Sprint 1 rows link to acceptance criteria (AC) and planned tests (TEST) in [`sprints/sprint-1/`](sprints/sprint-1/). Later-sprint rows are allocated now, and their AC/tests are written with their contracts.

| Requirement | Feature / responsibility | Sprint | Acceptance criteria → tests |
|---|---|---|---|
| FR-01 Login | F-01 | 1 | AC-01-1, AC-01-2 → TEST-API-01, TEST-API-02, TEST-UI-01, TEST-E2E-01 |
| FR-02 Logout | F-01 | 1 | AC-01-4 → TEST-API-04, TEST-E2E-01 |
| FR-03 Current user | F-01 | 1 | AC-01-3 → TEST-API-03 |
| FR-04 Admin lists users | F-02 | 1 | AC-02-1 → TEST-API-10 |
| FR-05 Admin enables/disables | F-02 | 1 | AC-02-2, AC-02-3 → TEST-API-11, TEST-API-12, TEST-E2E-02 |
| FR-06 Admin creates user / resets password | F-17 | 3 | to be written with F-17 contract |
| FR-07 Account balances | F-03 | 1 | AC-03-1, AC-03-2 → TEST-API-20, TEST-UNIT-05 |
| FR-08 Manage accounts | F-09 | 2 | F-09 contract |
| FR-09 Opening balance | F-04 | 1 | AC-04-1, AC-04-2, AC-04-3 → TEST-API-21, TEST-API-22, TEST-UNIT-04 |
| FR-10 Payment / charge | F-05 | 1 | AC-05-1 … AC-05-6 → TEST-API-30 … TEST-API-35, TEST-UNIT-01…03, TEST-UI-02, TEST-E2E-01 |
| FR-11 Receive money | F-06 | 1 | AC-06-1 … AC-06-3 → TEST-API-40 … TEST-API-42, TEST-E2E-01 |
| FR-12 History | F-08 | 1 | AC-08-1, AC-08-2 → TEST-API-60, TEST-API-61, TEST-E2E-01 |
| FR-13 Income/expense summary | F-07 | 1 | AC-07-1, AC-07-2 → TEST-API-50, TEST-UNIT-06, TEST-E2E-01 |
| FR-14 Outstanding loans | F-03 (totals) / F-10 (loan view) | 1 / 2 | AC-03-2 → TEST-API-20; F-10 contract |
| FR-15 Correction | F-11 | 2 | F-11 contract |
| FR-16 Search/filter | F-12 | 2 | F-12 contract |
| FR-17, FR-18 Favorites | F-14 | 3 | F-14 contract |
| FR-19 Duplicate | F-15 | 3 | F-15 contract |
| FR-20 Category spending | F-13 | 2 | F-13 contract |
| FR-21 Reports | F-16 | 3 | F-16 contract |
| FR-22 Change own password | F-17 | 3 | F-17 contract |
| BR-01 Own records only | F-03, F-05, F-06, F-07, F-08 (and later F-09…F-16) | 1 | AC-03-3, AC-05-5, AC-08-2 → TEST-API-23, TEST-API-34, TEST-API-61 |
| BR-02 Admin no financial data | F-02 | 1 | AC-02-4 → TEST-API-13, TEST-E2E-02 |
| BR-03 Disabled user blocked | F-01, F-02 | 1 | AC-01-5, AC-02-3 → TEST-API-05, TEST-API-12 |
| BR-04 Admin self/last-admin guard | F-02 | 1 | AC-02-5 → TEST-API-14 |
| BR-05 Account types/subtypes | F-03 (seeded) / F-09 | 1 / 2 | AC-03-1 → TEST-API-20 (seeded types); F-09 contract |
| BR-06 Lines = total | F-05, F-06 | 1 | AC-05-2 → TEST-UNIT-01, TEST-API-31, TEST-UI-02 |
| BR-07 Amount range / precision / line count | F-05, F-06 | 1 | AC-05-3 → TEST-UNIT-02, TEST-API-32 |
| BR-08 Payment account types | F-05 | 1 | AC-05-4 → TEST-UNIT-03, TEST-API-33 |
| BR-09 Receipt account types | F-06 | 1 | AC-06-2 → TEST-UNIT-03, TEST-API-41 |
| BR-10 Same owner, active, not self | F-05, F-06 | 1 | AC-05-5 → TEST-API-34 |
| BR-11 Double-entry effects | F-03, F-05, F-06 | 1 | AC-05-1, AC-06-1 → TEST-UNIT-05, TEST-API-30, TEST-API-40 |
| BR-12 Only income/expense lines counted | F-07, F-04 | 1 | AC-07-2 → TEST-UNIT-06, TEST-API-50 |
| BR-13 Opening balance rules | F-04 | 1 | AC-04-2, AC-04-3 → TEST-API-22, TEST-UNIT-04 |
| BR-14 Date not in the future | F-05, F-06 | 1 | AC-05-6 → TEST-API-35 |
| BR-15 Overdraft allowed | F-03 | 1 | AC-03-1 → TEST-UNIT-05 |
| BR-16 Atomic correction | F-11 | 2 | F-11 contract |
| BR-17 Duplicate/favorites | F-14, F-15 | 3 | F-14, F-15 contracts |
| NFR-01 Password hashing | F-01 | 1 | AC-01-6 → TEST-API-06 |
| NFR-02 401 on protected routes | F-01 | 1 | AC-01-7 → TEST-API-07 |
| NFR-03 Session lifecycle | F-01 | 1 | AC-01-4, AC-01-8 → TEST-API-04, TEST-API-08 |
| NFR-04 Integer money | F-05, F-06 | 1 | AC-05-3 → TEST-UNIT-02 |
| NFR-05 Atomic save | F-05, F-06 | 1 | AC-05-2 → TEST-API-31 (nothing stored) |
| NFR-06 Persistence | R-01 | 1 / Lab 5 | manual restart check (Part F); Lab 5 C-05 |
| NFR-07 Env config, Docker | R-01 | 1 (design) / Lab 5 | review of `.env.example`; Lab 5 |
| NFR-08 One-command tests, CI gate | R-01 | 1 / Lab 5 | CI workflow `test` on every PR |
| NFR-09 Usability 360 px | R-02 | 1 (core screens) / 3 | TEST-E2E-03 (mobile viewport) |
| NFR-10 Performance | R-02 | 3 | load-check script in Sprint 3 |

## Coverage check

- Every FR, BR and NFR above has a feature or named responsibility and a sprint. **No uncovered requirement.**
- Partially covered in Sprint 1: FR-14 (totals only; full loan view in F-10), NFR-06/07/08 (local in Sprint 1, cloud in Lab 5), NFR-09 (Sprint 1 screens only).

## Approved changes

| Date | Change | Reason |
|---|---|---|
| 14 Nov 2026 | Baseline v1.0 | First version |
