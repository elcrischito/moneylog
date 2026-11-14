# Three-Sprint Plan — MoneyLog

Version 1.0 (14 Nov 2026). Feature IDs are listed in [`../features.md`](../features.md).

| Sprint | Goal | Features | Depends on | Completion outcome | Checkpoint |
|---|---|---|---|---|---|
| **1** | A small, working, secure ledger: a user can record the theme's Sprint 1 example end to end and see correct results; the administrator manages access but cannot see money data | F-01, F-02, F-03, F-04, F-05, F-06, F-07, F-08; R-01 (local + CI), R-02 (core screens) | — | Release on `main`, tagged `v0.1.0`: login/logout, two roles enforced on the server, opening balance → salary → split card purchase → card repayment, balances, summary and history; API, unit, UI and E2E tests passing | Deliverable 1 |
| **2** | Core expansion: users manage their own accounts and loans, fix mistakes, find transactions and see where money goes | F-09, F-10, F-11, F-12, F-13; R-01 (Docker, CI gate, GCP deploy — Lab 5) | F-03…F-08 | Integrated, deployed release `v0.2.0` with contracts and tests for each feature | Deliverable 2, 29 Nov |
| **3** | Completion and hardening | F-14, F-15, F-16, F-17; R-02 (accessibility, performance, regression); UAT defect fixes from Lab 6 | F-07, F-08, F-02 | Final release `v1.0.0`, all FR/BR/NFR verified, demo video | Progress 29 Nov, complete 13 Dec |

## Dependencies

```
F-01 ─┬─ F-02 ── F-17
      └─ F-03 ─┬─ F-04
               ├─ F-05 ─┬─ F-07 ─┬─ F-13
               └─ F-06 ─┘        └─ F-16
                        ├─ F-08 ─┬─ F-12
                        │        └─ F-14
                        ├─ F-11
                        └─ F-15
F-03 ── F-09, F-10
```

## Why this Sprint 1 scope

The theme brief sets the minimum Sprint 1 scope: seeded users and accounts, an opening bank balance, salary received, a credit card purchase split into dining and groceries, a card repayment, and then the resulting bank balance, card debt, income/expense summary and history. User and Administrator roles must be enforced on the backend. F-01…F-08 are exactly the features this needs:
- F-05 and F-06 hold the real domain logic: multi-line transactions with double entry and BR-06…BR-14.
- F-03 and F-07 prove that the logic gives correct numbers (BR-11, BR-12).
- F-01 and F-02 give the access foundation.

Account creation (F-09) is left to Sprint 2 because Sprint 1 seeds the accounts.

**Capacity.** The team has one member, so Sprint 1 keeps the UI simple (one form handles both transaction kinds) and puts the effort into the domain module and its tests.

## Remaining work after Sprint 1 (carried into Sprints 2–3)
F-09…F-17, Docker/CI gate/GCP (Lab 5), loan view, refunds (Q-01), accessibility and performance hardening.
