# MoneyLog — Sprint 1 UAT handoff (Lab 6)

**Product Team:** EN-049 "elcrischito": Mamadou Diao Bah (69540460047), one-member team, section 131.
**UAT Team:** Yohann Moscato (69540460011) and Héloïse Savoye (69540460018), team EN-002, TokTickIT.

## 1. What to test

| Item | Value |
|---|---|
| Product | **MoneyLog**, Theme 7: Personal Money and Expense Logging System (double-entry: every payment or receipt is split into lines that must add up to the total) |
| URL | **https://moneylog-bqq6zokxdq-as.a.run.app** |
| Accepted Sprint 1 baseline | tag **v0.1.0** = commit `c26bebe` (14 Nov 2026), contracts in `docs/sprints/sprint-1/` |
| Deployed release under test | `main` = **`81d4c6d`**, Cloud Run revision **`moneylog-00005-jz6`** (21 Nov 2026). It has the same Sprint 1 behaviour as v0.1.0. The only later changes are Lab 5 deployment work and `version` in `/api/health`; no Sprint 2 feature is deployed. |
| How to record the tested version | Open **https://moneylog-bqq6zokxdq-as.a.run.app/api/health**. `version` is the full commit SHA that is running. Copy it into every result row. |
| Accepted-for-test scope | Sprint 1 features **F-01 … F-08**: sign in/out (F-01), administrator user access (F-02), accounts and balances (F-03), opening balances (F-04), payments (F-05), receipts (F-06), income/expense summary (F-07), history (F-08). **Out of scope:** editing or deleting transactions, budgets, recurring items, reports and CSV export (Sprint 2/3). Report them as enhancements, not defects. |
| Cases | **UAT-01 … UAT-06** in [`uat-cases.md`](uat-cases.md). UAT-06 must run **last**. |
| Browser | Any current Chrome, Edge or Firefox. The console (F12) is needed for UAT-03 steps 1, 5 and 9 only. |

**Change control.** I will not deploy to this URL while your test session is running. If a fix is needed, I will tell you the new `version` before you re-test.

## 2. Test accounts (synthetic data only)

| Label | E-mail | Role | Password |
|---|---|---|---|
| User A | `alice@moneylog.test` | User (Alice Wong) | **demo password**, sent privately |
| User B | `bob@moneylog.test` | User (Bob Chen) | same demo password |
| Disabled user | `dan@moneylog.test` | User, disabled on purpose (Dan Disabled) | same demo password |
| Administrator | `admin@moneylog.test` | Administrator (Nok Administrator) | **admin password**, sent privately |

No password is in this document or in Git. Both are stored in Google Secret Manager and sent to you in a private message. They are test passwords for synthetic accounts only. Do not reuse them anywhere.

## 3. Data setup and cleanup

- **Setup:** none. Every user already has the 11 starter accounts (Bangkok Bank Savings, Wallet, KTC Credit Card, Loan from Mom, Loan to Ploy, Salary, Interest Earned, Dining, Groceries, Electricity, Telecom). Some earlier test data exists (for example Alice's "Lab5 persistence check", 123.45 THB from Wallet). That is why each money case asks you to **write down the values before** and gives the expected results as before ± change.
- **Your data:** start every description with the case ID (`UAT-01 …`) so your rows are easy to find.
- **Cleanup:** none needed. Sprint 1 has no delete feature, and the cases are written to be repeatable with the before/after method. The only state you must put back is **Bob Enabled** at the end of UAT-06 (if needed: sign in as the Administrator → Users → Enable Bob Chen).
- **If something blocks you** (cannot sign in, the site is down): write **BLOCKED** with the reason and the time, and message me at once. Do not mark it as passed.

## 4. Reporting

For every case, record: case ID, tester name, date and time (Bangkok), tested `version`, the inputs you used, the **actual** result in your own words, and PASS / FAIL / BLOCKED. Add a screenshot of the key moment.

For each FAIL, open a GitHub Issue at https://github.com/elcrischito/moneylog/issues (or message me if you cannot). Give the title, case and AC, tested version, preconditions and data, numbered reproduction steps, expected result, actual result, severity (critical / major / minor, explained by its effect on the user) and a screenshot.

At the end, send your decision for this exact `version`: **Accepted**, **Accepted with minor limitations** (list them), or **Not Accepted** (reasons), with your names and the date.

Thank you!
