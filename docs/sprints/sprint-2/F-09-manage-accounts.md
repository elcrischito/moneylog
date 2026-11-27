# F-09 Manage financial accounts — Feature contract

| | |
|---|---|
| Requirements | FR-08, BR-05, BR-01, BR-10, NFR-02 |
| Depends on | F-01, F-03 |
| Version | 1.0 (27 Nov 2026), written before implementation (Issue #49) |

In Sprint 1 every user got the 11 starter accounts from the seed. F-09 lets a user add, rename, deactivate and re-activate their **own** accounts. Accounts are never deleted, because past transactions point to them.

## Behaviour and workflow
1. **Accounts** shows an **Add account** form: name, type and, for Cash and Loan Taken, a subtype.
2. *Add* sends `POST /api/accounts`. The new account appears in its group with balance 0.00. If it is a Cash or Loan account, it can then get an opening balance (F-04).
3. Each account row has **Rename**: an inline field, then *Save* sends `PATCH /api/accounts/:id {name}`. History, summary and balances show the new name everywhere, because they read the name from the account.
4. Each account row has **Deactivate** / **Activate**: `PATCH /api/accounts/:id {isActive}`.
   - A deactivated account is listed under **Inactive accounts** with its balance. It is **not offered** in the transaction form, and the server refuses it in new transactions (`ACCOUNT_NOT_FOUND`, as in Sprint 1).
   - Its past transactions, its balance and its share of totals stay unchanged.

## Rules, validation, boundaries

| Code | Rule | HTTP |
|---|---|---|
| `VALIDATION_ERROR` | `name` is a string. After trimming, it is 1–60 characters long (61 is refused). `type` is one of CASH, LOAN_TAKEN, LOAN_GIVEN, INCOME, EXPENSE. | 400 |
| `INVALID_SUBTYPE` | CASH needs WALLET or BANK. LOAN_TAKEN needs CREDIT_CARD or OTHER_LOAN. LOAN_GIVEN, INCOME and EXPENSE must have no subtype (BR-05). | 400 |
| `ACCOUNT_NAME_TAKEN` | The name is unique per user, compared **case-insensitively** after trimming ("wallet" = "Wallet "). The same name for another user is fine. Renaming to the account's own current name is not a conflict. | 409 |
| `ACCOUNT_LIMIT` | A user has at most 100 accounts, active and inactive together. The 100th is accepted and the 101st is refused. | 409 |
| `BALANCE_NOT_ZERO` | A CASH, LOAN_TAKEN or LOAN_GIVEN account can be deactivated only when its balance is exactly 0.00, so no money or debt disappears from the active view. INCOME and EXPENSE accounts can always be deactivated. | 409 |
| `IMMUTABLE_FIELD` | `type` and `subtype` cannot be changed after creation: past transactions were validated against them. The PATCH body may contain only `name` and/or `isActive`. | 400 |
| `NOT_FOUND` | Another user's account answers like an unknown id (BR-01). | 404 |

## Permissions
USER only (ADMIN → 403, as for every financial route). A user can only read and change their own accounts.

## API
- `POST /api/accounts` `{ "name": "Kasikorn Savings", "type": "CASH", "subtype": "BANK" }` → `201 { "account": <AccountDto> }`
- `PATCH /api/accounts/:id` `{ "name": "Kasikorn Main" }` or `{ "isActive": false }` → `200 { "account": <AccountDto> }`
- `GET /api/accounts` (unchanged shape). Each `AccountDto` already has `isActive`, so inactive accounts are returned too, and the client groups them.

`AccountDto` = `{ id, name, type, subtype, isActive, balance, openingBalance, openingDate }` (Sprint 1 shape, unchanged).

## Data
No migration is needed: `FinancialAccount.isActive` and `@@unique([ownerId, name])` already exist. Case-insensitive uniqueness is checked in the service before insert. The exact-case unique index stays as a last guard: a race returns 409.

## UI
`AccountsPage`:
- an **Add account** form, where the subtype select appears only for Cash / Loan Taken;
- per row, **Rename** and **Deactivate** (or **Activate** in the Inactive section);
- errors shown under the field with `role="alert"`.

`TransactionForm` lists only active accounts, using the `isActive` filter that was already in Sprint 1.

## Acceptance criteria
- **AC-09-1** Creating "Kasikorn Savings" (CASH/BANK) returns 201. The account is listed with balance 0.00 and can be used in a new payment.
- **AC-09-2** A name of 61 characters, an empty name, an unknown type, CASH without a subtype and EXPENSE with a subtype are each refused with 400 and the code above. Nothing is created.
- **AC-09-3** "groceries" when "Groceries" exists → 409 `ACCOUNT_NAME_TAKEN`. Bob may create "Groceries" while Alice has one.
- **AC-09-4** Renaming "Dining" to "Eating out" keeps its id, its balance and its transactions. History and summary show the new name.
- **AC-09-5** A deactivated account is refused in a new transaction (400 `ACCOUNT_NOT_FOUND`) and is no longer offered in the form. Its balance and past transactions are unchanged. Re-activating makes it usable again.
- **AC-09-6** Deactivating Wallet with balance 0.01 → 409 `BALANCE_NOT_ZERO`. With 0.00 it succeeds. Deactivating Dining (EXPENSE) with spending succeeds.
- **AC-09-7** Bob cannot rename, deactivate or see Alice's account (404). The Administrator gets 403 on every account route.
- **AC-09-8** Changing `type` or `subtype` with PATCH → 400 `IMMUTABLE_FIELD`.

## Tests (STS)

| Test ID | Level | Input | Expected |
|---|---|---|---|
| TEST-UNIT-20 | unit (`validateNewAccount`) | name lengths 0, 1, 60, 61 with spaces; type/subtype matrix (5 types × 5 subtypes incl. null) | Valid only for the combinations in BR-05 and length 1–60 |
| TEST-API-70 | API + DB | POST Kasikorn Savings CASH/BANK, then a payment from it | 201; listed with balance 0.00; payment 201 (AC-09-1) |
| TEST-API-71 | API + DB | invalid bodies of AC-09-2 | 400 with each code; the account count is unchanged (AC-09-2) |
| TEST-API-72 | API + DB | "groceries" for Alice; "Groceries" for Bob | 409 `ACCOUNT_NAME_TAKEN`; then 201 (AC-09-3) |
| TEST-API-73 | API + DB | rename Dining → Eating out after a payment | same id and balance; history line shows "Eating out" (AC-09-4) |
| TEST-API-74 | API + DB | deactivate Dining, then a payment to it; reactivate, then pay again | 400 `ACCOUNT_NOT_FOUND`; balance unchanged; then 201 (AC-09-5) |
| TEST-API-75 | API + DB | Wallet 0.01 → deactivate; Wallet 0.00 → deactivate | 409 `BALANCE_NOT_ZERO`; then 200 (AC-09-6) |
| TEST-API-76 | API + DB | Bob PATCHes Alice's account; admin GETs/POSTs/PATCHes | 404; 403 (AC-09-7) |
| TEST-API-77 | API + DB | PATCH `{type:"EXPENSE"}` | 400 `IMMUTABLE_FIELD` (AC-09-8) |
| TEST-API-78 | API + DB | 100th and 101st account | 201, then 409 `ACCOUNT_LIMIT` (boundary) |
| TEST-UI-10 | component | Accounts page: add form, subtype select appears for Cash, server error shown | form calls the API; `role="alert"` shows 409 text |

## Definition of Done
The product DoD of Sprint 1 (`docs/sprints/sprint-1/sts-and-dod.md`) applies, with every test above executed on the Sprint 2 release commit.

## Revision history
| Version | Date | Change |
|---|---|---|
| 1.0 | 27 Nov 2026 | First contract, before implementation |
