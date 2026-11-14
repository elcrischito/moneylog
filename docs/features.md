# Feature Inventory — MoneyLog

Version 1.0 (Sprint 1 baseline, 14 Nov 2026). Requirement IDs refer to [`srs.md`](srs.md).

| ID | Feature | Short description | Requirements | Depends on | Sprint |
|---|---|---|---|---|---|
| F-01 | Authentication and sessions | Login, logout, current user; server-side sessions; disabled users blocked | FR-01, FR-02, FR-03, BR-03, NFR-01, NFR-02, NFR-03 | — | 1 |
| F-02 | Administrator user access | Admin lists users and enables/disables them; admin is blocked from all financial data | FR-04, FR-05, BR-02, BR-04 | F-01 | 1 |
| F-03 | Account balances overview | User's own accounts with derived balances grouped by type; totals for cash, credit card debt, loans taken, loans given | FR-07, FR-14 (totals), BR-01, BR-05, BR-11, BR-15 | F-01 | 1 |
| F-04 | Opening balance | Record/replace the opening balance and date of a Cash or Loan account | FR-09, BR-13, BR-12 | F-03 | 1 |
| F-05 | Make a payment / record a charge | Multi-line payment from a Cash or Loan Taken account | FR-10, BR-06, BR-07, BR-08, BR-10, BR-11, BR-14, NFR-04, NFR-05 | F-03 | 1 |
| F-06 | Receive money | Multi-line receipt into a Cash account | FR-11, BR-06, BR-07, BR-09, BR-10, BR-11, BR-14, NFR-04, NFR-05 | F-03 | 1 |
| F-07 | Income and expense summary | Income, expense, net and per-account totals for a date range | FR-13, BR-12 | F-05, F-06 | 1 |
| F-08 | Transaction history | Own transactions newest first, with allocation lines | FR-12, BR-01 | F-05, F-06 | 1 |
| F-09 | Manage financial accounts | Create, rename, deactivate accounts of the five types | FR-08, BR-05 | F-03 | 2 |
| F-10 | Loans overview | Outstanding amount per Loan Taken / Loan Given account | FR-14 | F-03 | 2 |
| F-11 | Transaction correction | Edit or delete a transaction atomically | FR-15, BR-16 | F-05, F-06 | 2 |
| F-12 | Search and filter | Filter history by date range, account, type, text, amount | FR-16 | F-08 | 2 |
| F-13 | Category spending | Expense per expense account with share of total | FR-20, BR-12 | F-07 | 2 |
| F-14 | Favorites | Mark/unmark and list favorite transactions | FR-17, FR-18, BR-01, BR-17 | F-08 | 3 |
| F-15 | Duplicate transaction | Open a new editable transaction pre-filled from an existing one | FR-19, BR-17 | F-05, F-06 | 3 |
| F-16 | Reports | Monthly income vs expense and net position over time | FR-21 | F-07 | 3 |
| F-17 | Account administration and own password | Admin creates users / resets passwords; user changes own password | FR-06, FR-22, NFR-01 | F-02 | 3 |
| R-01 | Delivery responsibility | Docker image, CI on every PR, merge gate, GCP deployment from `main`, persistence across redeploy | NFR-06, NFR-07, NFR-08 | all | 1 (design + local) / Lab 5 |
| R-02 | Hardening responsibility | Accessibility at 360 px, performance target, regression suite | NFR-09, NFR-10 | all | 1 (core screens) / 3 |
