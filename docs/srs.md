# Software Requirements Specification — MoneyLog

| | |
|---|---|
| Product | MoneyLog — Personal Money and Expense Logging System (CPE 334 theme 7) |
| Team | EN-049 `elcrischito` (one member: Mamadou, student ID 69540460047) |
| Version | 1.0 — Sprint 1 baseline, 14 Nov 2026 |
| Status | Baseline for Sprints 1–3. Changes are recorded in Section 8. |

## 1. Stakeholder problem and context

People who manage their own money (in our chosen context: university students and young employees in Bangkok who are paid in Thai baht) keep their wallet, bank account, credit card and loans in different places. They do not know their real position: how much cash they have, how much they owe on the credit card, who owes them money, and how much they earned and spent this month.

A spreadsheet works badly for this. One payment often touches several things at once. For example, one card bill covers dining and groceries, or one salary deposit is partly income and partly a friend paying back a loan. Formulas break, and transfers end up counted as spending.

MoneyLog is a private, multi-user web application. Each user records transactions once, split into allocation lines. The system keeps every account balance correct and separates real income and expenses from transfers, borrowing, loan repayments and opening balances.

## 2. Actors and responsibilities

| Actor | Description | Responsibilities in MoneyLog |
|---|---|---|
| **User** (role `USER`) | A person who records their own finances | Manages only their own financial accounts, opening balances, transactions, favorites and summaries |
| **Administrator** (role `ADMIN`) | Operator of the platform | Manages platform user accounts and access (list, enable, disable, and later create users / reset passwords). **Cannot** view or modify any user's financial records or summaries |
| **System** | MoneyLog backend | Authenticates, enforces permissions and business rules on the server, computes balances and summaries, stores data persistently |

Seeded demo accounts are used in Sprint 1. Self-registration, password recovery and e-mail verification are out of scope (Section 3).

## 3. Scope

### In scope (whole product, Sprints 1–3)
- Login, logout, current-user identity; two roles (User, Administrator) enforced on the server.
- Administrator management of user access (enable/disable; later: create user, reset password).
- Financial accounts of five types: **Cash** (wallet, bank), **Loan Given**, **Loan Taken** (credit card, other borrowing), **Income**, **Expense**.
- Opening balances with a date for Cash and Loan accounts.
- Two transaction forms, each with one or more allocation lines: **Make a payment / record a charge** and **Receive money**.
- Account balances, outstanding loans, credit card debt, income and expense summary, category spending, transaction history.
- Transaction correction, search and filtering, favorites, duplicate, reports.
- One currency (Thai baht, THB) with 2 decimal places.

### Explicit exclusions
Period budgets, shared budgets, automatic recurring transactions, bank or card integration (no import or API), multiple currencies and exchange rates, investments/stocks, real payment gateways, e-mail/SMS notifications, self-registration, password recovery, multiple roles per account, native mobile apps. Synthetic data only.

## 4. Functional requirements

| ID | Requirement (observable behaviour) | Sprint |
|---|---|---|
| FR-01 | A user signs in with e-mail and password and receives a session; wrong credentials are rejected without saying which field was wrong. | 1 |
| FR-02 | A signed-in user signs out; the session token stops working immediately. | 1 |
| FR-03 | The application shows the current user's name and role, obtained from the server for the current session. | 1 |
| FR-04 | An administrator lists platform users (name, e-mail, role, enabled status), without any financial information. | 1 |
| FR-05 | An administrator enables or disables a user account. | 1 |
| FR-06 | An administrator creates a user account with an initial password and resets a user's password. | 3 |
| FR-07 | A user views their own financial accounts with the current balance of each, grouped by type, plus totals for cash, credit card debt, loans taken and loans given. | 1 |
| FR-08 | A user creates, renames and deactivates their own financial accounts of the five types (with subtype for Cash and Loan Taken). | 2 |
| FR-09 | A user records or updates the opening balance and opening date of a Cash, Loan Given or Loan Taken account. | 1 |
| FR-10 | A user records a **payment/charge**: picks the paying Cash or Loan Taken account, date, description and total, and allocates the total across expense accounts, repayments of loans taken, loans given, or transfers to another cash account. | 1 |
| FR-11 | A user records **money received**: picks the receiving Cash account, date, description and total, and allocates the total across income accounts, repayments of loans given, new borrowing, or transfers from another cash account. | 1 |
| FR-12 | A user views their transaction history (newest first) with date, type, account, description, total and allocation lines. | 1 |
| FR-13 | A user views an income and expense summary for a date range: total income, total expense, net, and the amount per income/expense account. | 1 |
| FR-14 | A user views outstanding loans: each Loan Taken (including credit cards) and Loan Given account with its outstanding amount. | 1 (totals) / 2 (loan view) |
| FR-15 | A user corrects an existing transaction (edit fields and lines, or delete it); balances and summaries reflect the correction. | 2 |
| FR-16 | A user searches and filters transactions by date range, account, type, text and amount range. | 2 |
| FR-17 | A user marks or unmarks a transaction as favorite. | 3 |
| FR-18 | A user views the list of favorite transactions. | 3 |
| FR-19 | A user selects **Duplicate** on a transaction to open a new editable transaction pre-filled with the same details. | 3 |
| FR-20 | A user views category spending: expense totals per expense account for a period, sorted by amount, with share of total. | 2 |
| FR-21 | A user views reports: income vs expense per month and net position (assets minus debts) over time. | 3 |
| FR-22 | A user changes their own password. | 3 |

## 5. Business rules

| ID | Rule | Sprint |
|---|---|---|
| BR-01 | A user can read and change **only their own** financial accounts, transactions, favorites and summaries. Any other user's record is answered as *not found*. | 1 |
| BR-02 | An administrator **cannot** view or modify any financial account, transaction, favorite or summary (`403`). | 1 |
| BR-03 | A disabled user cannot sign in, and their existing sessions are rejected on the next request. | 1 |
| BR-04 | An administrator cannot disable their own account and the last enabled administrator cannot be disabled. | 1 |
| BR-05 | Account types are CASH (subtype WALLET or BANK), LOAN_TAKEN (subtype CREDIT_CARD or OTHER_LOAN), LOAN_GIVEN, INCOME, EXPENSE. An account name is unique per user. | 1 (seeded) / 2 (managed) |
| BR-06 | The allocation lines of a transaction must add up **exactly** to its total. | 1 |
| BR-07 | The total and every line amount are greater than 0 THB, have at most 2 decimals, and are at most 9,999,999.99 THB. A transaction has 1 to 20 lines. | 1 |
| BR-08 | Payment/charge: the paying account is CASH or LOAN_TAKEN. Lines may use EXPENSE (spending), LOAN_TAKEN (repayment of a loan or card), LOAN_GIVEN (money lent) or CASH (transfer to another cash account). INCOME lines are not allowed. | 1 |
| BR-09 | Receive money: the receiving account is CASH. Lines may use INCOME, LOAN_GIVEN (repayment received), LOAN_TAKEN (new borrowing) or CASH (transfer from another cash account). EXPENSE lines are not allowed. | 1 |
| BR-10 | Every account used by a transaction belongs to the same user and is active. A line cannot use the transaction's own paying/receiving account. | 1 |
| BR-11 | Each transaction updates **all** relevant balances by double entry. A payment credits the paying account and debits each line account. A receipt debits the receiving account and credits each line account. Cash, Loan Given and Expense balances increase with debits. Loan Taken (amount owed) and Income balances increase with credits. | 1 |
| BR-12 | Only INCOME lines count as income and only EXPENSE lines count as expense. Transfers, borrowing, loan repayments and opening balances are never counted as income or expense. | 1 |
| BR-13 | Opening balances exist only for CASH, LOAN_GIVEN and LOAN_TAKEN accounts, are ≥ 0, and have an opening date. Recording it again replaces the previous opening balance (one per account). | 1 |
| BR-14 | A transaction date is required and cannot be later than today (Asia/Bangkok). | 1 |
| BR-15 | A Cash balance may go below zero (overdraft is recorded, not blocked); no credit limit is enforced. | 1 |
| BR-16 | A correction replaces the transaction atomically; a deleted transaction no longer affects balances or summaries. | 2 |
| BR-17 | Duplicate never changes the original. The new transaction is saved only when the user submits it, and it is validated like any new transaction. Favorites belong to their owner. | 3 |

### Balance effect table (BR-11)

| Transaction | Paying / receiving account | Line account type → effect |
|---|---|---|
| Payment from **Cash** | cash − total | Expense: expense + a · Loan Taken: owed − a (repayment) · Loan Given: owed to me + a · Cash: other cash + a |
| Charge on **Loan Taken** (e.g. credit card) | owed + total | same as above |
| **Receive** into Cash | cash + total | Income: income + a · Loan Given: owed to me − a · Loan Taken: owed + a (borrowing) · Cash: other cash − a |

## 6. Non-functional requirements

| ID | Requirement and measurable target | Verification | Sprint |
|---|---|---|---|
| NFR-01 | Passwords are stored only as bcrypt hashes (cost ≥ 10) and are never returned by any API. | API test checks responses have no `passwordHash`; seed/code review | 1 |
| NFR-02 | Every protected endpoint rejects a request with no valid session with `401` and returns no private data. | API tests on each protected route | 1 |
| NFR-03 | Sessions use a random 256-bit opaque token stored only as a SHA-256 hash, expire after 8 hours, and are revoked by logout. | API tests (logout, expired/revoked token) | 1 |
| NFR-04 | Money is stored as integer satang; no floating-point rounding errors (e.g. 0.10 + 0.20 = 0.30 exactly). | unit tests | 1 |
| NFR-05 | A transaction, its lines and their balance effects are saved atomically; a rejected transaction stores nothing. | API/DB integration test | 1 |
| NFR-06 | Data survives an application restart and a redeployment: everything is in PostgreSQL, nothing is kept in the application process or on the container disk. | manual restart check (S1), Lab 5 redeploy check | 1 / Lab 5 |
| NFR-07 | Configuration and secrets come from environment variables; no secret is committed; the app is packaged in Docker. | review + Lab 5 CI | 1 (design) / Lab 5 |
| NFR-08 | The build and all automated tests run with one command each and run on every Pull Request; a failing check blocks merging. | CI run history | 1 (local) / Lab 5 |
| NFR-09 | Usability: every form field has a label, errors are shown next to the field, layouts work at 360 px width without horizontal scrolling. | UI tests + E2E mobile viewport | 1 (core screens) / 3 |
| NFR-10 | Performance: history and summary APIs answer in < 500 ms (p95) for a user with 2,000 transactions on the reference deployment. | scripted load check | 3 |

## 7. Assumptions

- A-01 One currency (THB) for all accounts; amounts entered with up to 2 decimals.
- A-02 Users are adults managing their own money; there is no shared household access.
- A-03 Credit cards are modelled as Loan Taken accounts: a charge increases the amount owed and a repayment reduces it.
- A-04 Opening balances describe the position on the opening date; earlier history is not entered.
- A-05 Dates are calendar dates in Asia/Bangkok; time of day is not recorded.
- A-06 Seeded demo accounts are enough for Sprint 1 (spec 5.2); passwords for them come from environment variables in production.

## 8. Decisions, questions and resolutions

| ID | Question / decision | Resolution |
|---|---|---|
| D-01 | How to keep all balances correct with multi-line transactions? | Double-entry model (BR-11). Balances are derived from opening balance + allocation lines; they are never stored as editable numbers. |
| D-02 | Store money as decimal or integer? | Integer satang in the database and domain code (NFR-04); the API exchanges decimal strings such as `"1250.50"`. |
| D-03 | JWT or server-side sessions? | Server-side opaque sessions in PostgreSQL, so logout and disabling a user take effect immediately (FR-02, BR-03) and sessions survive redeploys. |
| D-04 | Can a payment line use an Income account, or a receipt line an Expense account (e.g. a shop refund)? | No (BR-08, BR-09). Refunds are out of scope for Sprint 1; open question Q-01 tracks them for Sprint 2. |
| D-05 | Is a negative Cash balance an error? | No, it is recorded (BR-15); the UI highlights it. |
| D-06 | How should the API answer a request for another user's record? | `404 Not Found`, so the API does not reveal that the record exists (BR-01). Administrators get `403` on all financial routes (BR-02). |
| D-07 | Are financial accounts created by users in Sprint 1? | No. Sprint 1 seeds them (as in the theme's Sprint 1 example); account management is F-09 in Sprint 2. |
| D-08 | Team size | Team EN-049 has one member (registered as *Solo*). Teammate review is replaced by a written self-review on each PR; this is disclosed in Part F. |

| ID | Open question | Planned resolution |
|---|---|---|
| Q-01 | How should refunds from a shop be recorded (money back on a card)? | Ask TA; candidate: allow a negative-effect *refund* line type on an Expense account in Sprint 2. |
| Q-02 | Should Loan Given accounts track the borrower's name separately? | Decide with F-09 in Sprint 2 (currently the account name, e.g. "Loan to Ploy"). |
