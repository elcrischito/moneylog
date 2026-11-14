# F-03 Account balances overview and F-04 Opening balance — Feature contract

| | |
|---|---|
| Requirements | F-03: FR-07, FR-14 (totals), BR-01, BR-05, BR-11, BR-15 · F-04: FR-09, BR-12, BR-13 |
| Depends on | F-01 |
| Version | 1.0 (14 Nov 2026), written before implementation |

## Behaviour and workflow
**F-03.** The user opens **Dashboard** or **Accounts**. The client calls `GET /api/accounts`. The server loads only the caller's accounts and their transactions and computes each balance with the domain function `computeBalances` (BR-11):

- `CASH`, `LOAN_GIVEN`, `EXPENSE`: balance = opening + debits − credits
- `LOAN_TAKEN`, `INCOME`: balance = opening + credits − debits (for LOAN_TAKEN this is the amount owed)
- A payment debits each line account and credits the paying account. A receipt debits the receiving account and credits each line account.

Totals: `cash` = sum of CASH balances; `creditCardDebt` = sum of LOAN_TAKEN with subtype CREDIT_CARD; `loansTaken` = sum of all LOAN_TAKEN; `loansGiven` = sum of LOAN_GIVEN.

**F-04.** On **Accounts**, each CASH / LOAN_* account has *Set opening balance* (amount, date). The client calls `PUT /api/accounts/:id/opening-balance`. The opening balance **replaces** any previous one (BR-13) and is never income or expense (BR-12).

## Rules, validation, failure and boundary cases
- Balances are derived on every read; no balance column exists (decision D-01).
- A negative Cash balance is allowed and shown in red (BR-15).
- Opening balance: the account must be the caller's and of type CASH, LOAN_GIVEN or LOAN_TAKEN (`400 OPENING_BALANCE_NOT_ALLOWED`); amount ≥ 0 with ≤ 2 decimals and ≤ 9,999,999.99 (`400 INVALID_AMOUNT`); date `YYYY-MM-DD`, not in the future (`400 DATE_IN_FUTURE`). `0` is allowed (boundary).
- Another user's or an unknown account id gives `404 NOT_FOUND` (BR-01).

## Permissions
USER only (ADMIN → 403). Own accounts only.

## API
`GET /api/accounts` → `200`
```json
{ "accounts": [ { "id": "…", "name": "Bangkok Bank Savings", "type": "CASH", "subtype": "BANK",
                  "openingBalance": "10000.00", "openingDate": "2026-11-01", "balance": "38500.00", "isActive": true } ],
  "totals": { "cash": "38500.00", "creditCardDebt": "0.00", "loansTaken": "0.00", "loansGiven": "0.00" } }
```
Accounts are ordered by type (CASH, LOAN_TAKEN, LOAN_GIVEN, INCOME, EXPENSE), then name.

`PUT /api/accounts/:id/opening-balance` with body `{ "amount": "10000.00", "date": "2026-11-01" }` → `200 { "account": { …, "balance": "…" } }`. Errors: `400 VALIDATION_ERROR | INVALID_AMOUNT | DATE_IN_FUTURE | OPENING_BALANCE_NOT_ALLOWED`, `401`, `403`, `404`.

## Data
Table `FinancialAccount` (migration `init`): `openingBalance INT NOT NULL DEFAULT 0` (satang), `openingDate DATE NULL`, unique `(ownerId, name)`. The seed creates 10 accounts per enabled user (System SDS, Section 2).

## UI
- **Dashboard**: four total cards (Cash, Credit card debt, Loans taken, Loans given), then account balances.
- **Accounts**: groups with headings. Each row shows the name, subtype and balance, plus an inline opening-balance form with labelled fields, an error under the field, and *Save*.

## Acceptance criteria
| AC | Given / When / Then |
|---|---|
| AC-03-1 | Given alice's seeded accounts and some transactions, `GET /api/accounts` returns each own account with type, subtype and the balance defined by BR-11 (negative cash allowed). |
| AC-03-2 | The totals are cash, credit card debt, loans taken and loans given, as defined above. |
| AC-03-3 | Bob's list never contains alice's accounts. Bob setting an opening balance on alice's account gets `404`. |
| AC-04-1 | Setting 10,000.00 on alice's bank account (no transactions) gives a balance of 10,000.00. Setting 12,000.00 again replaces it (balance 12,000.00, not 22,000.00). |
| AC-04-2 | An opening balance on an INCOME/EXPENSE account gives `400 OPENING_BALANCE_NOT_ALLOWED`; a negative amount gives `400 INVALID_AMOUNT`; a future date gives `400 DATE_IN_FUTURE`; `0.00` is accepted. |
| AC-04-3 | An opening balance is not counted as income in the summary. |

## Software Test Specification
| Test | Level | AC | Input / precondition | Expected |
|---|---|---|---|---|
| TEST-UNIT-04 | unit | AC-04-2, AC-04-3 | `validateOpeningBalance` with types/amounts; summary with opening only | allowed only for CASH/LOAN_*; negative rejected; income 0 |
| TEST-UNIT-05 | unit | AC-03-1, AC-03-2 | Sprint 1 example in memory + an overdraft case | bank 38,500.00; card 0.00; dining 900.00; groceries 600.00; salary 30,000.00; overdraft −50.00 |
| TEST-API-20 | API+DB | AC-03-1, AC-03-2 | fresh user, GET accounts | 10 accounts, all types present, balances 0.00, totals 0.00 |
| TEST-API-21 | API+DB | AC-04-1 | PUT 10,000 then 12,000 on bank | balance 12,000.00 |
| TEST-API-22 | API+DB | AC-04-2 | PUT on Salary; amount −1; date tomorrow; amount 0 | 400 ×3 with codes; 200 for 0 |
| TEST-API-23 | API+DB | AC-03-3 | bob lists accounts; bob PUT on alice's account | no alice ids; 404 |
| TEST-API-50 | API+DB | AC-04-3 | summary after opening balance only | income 0.00 |

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 14 Nov 2026 | First contract (before implementation) |
