# MoneyLog — Sprint 1 UAT cases (Lab 6, Product Team EN-049 "elcrischito")

Version 1.0 · 21 Nov 2026 · Issue #36. Scope: the delivered Sprint 1 features **F-01 … F-08** and their acceptance criteria **AC-01-1 … AC-08-2** (contracts in `docs/sprints/sprint-1/`, accepted baseline **v0.1.0 = `c26bebe`**). Nothing from Sprint 2 or 3 is part of this acceptance. The handoff (URL, version, accounts, setup and cleanup) is in [`handoff.md`](handoff.md).

**How to read the expected results.** The live database is shared, and other people may already have recorded data, so the money cases never assume a starting balance. Each one starts with a **"Write down before"** step, and its expected results are given as **before value ± change**. That way every case can be run again and gives the same verdict. Amounts are Thai baht. The app shows them as `฿1,234.56`, and you type them without the symbol or commas (`1234.56`).

**Order.** UAT-01 … UAT-05 are independent and can run in any order. **UAT-06 must run last**: it disables and then re-enables Bob, and if it stopped halfway it would block UAT-03 and UAT-04.

| Case | Category (Lab 6 §3.1) | Role(s) | Main AC |
|---|---|---|---|
| UAT-01 | **Normal domain journey** | User A (Alice) | AC-05-1, AC-06-1, AC-03-1, AC-03-2, AC-07-1, AC-08-1 |
| UAT-02 | **Business rule / boundary** | User A (Alice) | AC-05-2, AC-05-3, AC-05-6 |
| UAT-03 | **Forbidden role / ownership** (other user's records + Administrator denied financial data) | User B (Bob), Administrator | AC-03-3, AC-08-2, AC-02-4, AC-01-7 |
| UAT-04 | **State / history / persistence** | User B (Bob) | AC-04-1, AC-04-2, AC-04-3, AC-08-1 |
| UAT-05 | Sign-in, sign-out, disabled account | User A, Disabled user (Dan) | AC-01-1, AC-01-2, AC-01-4, AC-01-5 |
| UAT-06 | Administrator user access (run last) | Administrator, User B | AC-02-1, AC-02-2, AC-02-3, AC-02-5 |

---

## UAT-01 — Normal journey: card purchase split over two categories, card repayment, salary

- **Purpose:** check that money moves exactly as the double-entry rules say, end to end, and that balances, the month summary and the history all agree.
- **Requirement / AC:** FR-05, FR-06, FR-07, FR-08, BR-03, BR-07, BR-11 · AC-05-1, AC-06-1, AC-03-1, AC-03-2, AC-07-1, AC-08-1.
- **Role:** User A, `alice@moneylog.test`.
- **Preconditions:** signed out. Today's date is used for every transaction.
- **Synthetic inputs:** descriptions start with `UAT-01`. Amounts 1,500.00 = 900.00 + 600.00, then 1,500.00, then 30,000.00.

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as User A. | The **Dashboard** opens with "Hello, Alice". The top bar shows "Alice Wong · User". |
| 2 | Open **Accounts**. **Write down before:** *Bangkok Bank Savings* (B0), *KTC Credit Card* (K0), *Dining* (D0), *Groceries* (G0), *Salary* (S0). Open **Summary**, click **Show** with the default range (this month), and write down **Income** (I0) and **Expense** (E0). | The values are visible. The Summary range runs from the 1st of this month to today. |
| 3 | **New transaction** → **Make a payment**. Paid from: *KTC Credit Card*. Date: today. Total: `1500`. Description: `UAT-01 dinner and groceries`. Line 1: *Dining* `900`. **+ Add line**. Line 2: *Groceries* `600`. **Save transaction**. | "Remaining to allocate: ฿0.00" before saving. After saving, **History** opens with "Transaction saved." and the new row at the top: today's date, Payment, KTC Credit Card, ฿1,500.00. |
| 4 | Click **Show lines (2)** on that row. | Two lines: Dining ฿900.00 and Groceries ฿600.00. |
| 5 | Open **Accounts**. | KTC Credit Card = **K0 + 1,500.00** (the card owes more). Dining = **D0 + 900.00**. Groceries = **G0 + 600.00**. Bangkok Bank Savings = **B0** (unchanged). |
| 6 | **Make a payment** to repay the card: Paid from *Bangkok Bank Savings*, total `1500`, description `UAT-01 pay card`, Line 1: *KTC Credit Card* `1500`. Save. | Saved. Accounts: Bangkok Bank Savings = **B0 − 1,500.00**. KTC Credit Card = **K0** (back to its value before step 3). |
| 7 | **Receive money**: Received into *Bangkok Bank Savings*, total `30000`, description `UAT-01 salary`, Line 1: *Salary* `30000`. Save. | Saved. Accounts: Bangkok Bank Savings = **B0 + 28,500.00** (−1,500.00 + 30,000.00). Salary = **S0 + 30,000.00**. |
| 8 | Open **Summary** → **Show** (this month). | Income = **I0 + 30,000.00** and Expense = **E0 + 1,500.00**. Net = Income − Expense. The **card repayment of step 6 is not an expense**: the expense comes only from Dining and Groceries (AC-07-2). |
| 9 | Open **History**. | The three UAT-01 rows appear **newest first**: salary, then card repayment, then dinner and groceries. |

**Pass if** every value in steps 5–8 matches exactly (to the satang). A difference of even ฿0.01 is a FAIL.

---

## UAT-02 — Business rules and boundaries on a new transaction

- **Purpose:** check that wrong amounts and dates are refused, that nothing is stored when they are, and that exact cents are kept.
- **Requirement / AC:** BR-05, BR-07, BR-08, BR-12 · AC-05-2, AC-05-3, AC-05-6.
- **Role:** User A, `alice@moneylog.test`.
- **Preconditions:** signed in as User A. Open **History** and **write down the number of rows** (N0). Open **Accounts** and write down *Wallet* (W0) and *Groceries* (G0).

| # | Action | Expected result |
|---|---|---|
| 1 | **New transaction** → **Make a payment**, Paid from *Wallet*, total `1500`, Line 1 *Dining* `1400`. | "Remaining to allocate: ฿100.00" in red. **Save transaction is disabled.** |
| 2 | Change the total to `1.234`. | The message "Use a number with at most 2 decimals." appears under Total, and Save stays disabled. |
| 3 | Change the total to `0`, with Line 1 = `0`. | Save stays disabled, or saving shows an error. **No transaction is created.** |
| 4 | Click the **Date** field and try to choose **tomorrow**. | The date picker does not offer days after today (today is the maximum). |
| 5 | Leave the page without saving and open **History**. | Still **N0** rows: the refused attempts stored nothing. |
| 6 | **Make a payment** from *Wallet*, total `0.30`, description `UAT-02 cents`, Line 1 *Groceries* `0.10`, **+ Add line**, Line 2 *Groceries* `0.20`. Save. | "Remaining to allocate: ฿0.00", then saved. History shows ฿0.30. Accounts: Wallet = **W0 − 0.30** and Groceries = **G0 + 0.30**, exactly (no 0.30000000004 effect). |
| 7 | Open **History**. | **N0 + 1** rows. |

**Pass if** steps 1–5 refuse without storing anything and step 6 stores exactly 0.30.

---

## UAT-03 — Forbidden: another user's records, and the Administrator has no financial data

- **Purpose:** check that one user can never see or open another user's financial records, and that the Administrator cannot read any financial data. The **server** must enforce this, not only the menu. Steps 5 and 9 use the browser console, which is the only way to call the API directly with a session.
- **Requirement / AC:** BR-01, BR-02, NFR-02 · AC-03-3, AC-08-2, AC-02-4, AC-01-7.
- **Roles:** User A (Alice), User B (Bob), Administrator.
- **Preconditions:** User A has at least one transaction (run UAT-01 first, or create any payment with description `UAT-03 alice`). Signed out.

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as **User A**. Open **History** and write down the description and total of the top row. Open the browser console (F12 → Console) and run: `fetch('/api/transactions',{headers:{Authorization:'Bearer '+sessionStorage.getItem('moneylog.token')}}).then(r=>r.json()).then(t=>console.log(t[0].id))` | The console prints an id (a long text). **Write it down as `ALICE_TX`.** |
| 2 | Open **Accounts** and write down *Wallet* and *Bangkok Bank Savings* for User A. **Sign out.** | Back on the sign-in page. |
| 3 | Sign in as **User B**. Open **History**. | None of User A's rows appear: no `UAT-01 …`, no `UAT-03 alice`, no "Lab5 persistence check". |
| 4 | Open **Accounts** and **Summary**. | Only User B's own accounts and amounts. User B's numbers do not include any of User A's amounts. |
| 5 | In the console (still User B): `fetch('/api/transactions/ALICE_TX',{headers:{Authorization:'Bearer '+sessionStorage.getItem('moneylog.token')}}).then(async r=>console.log(r.status, await r.text()))`, replacing `ALICE_TX` with the id from step 1. | Prints **`404`** and `{"error":{"code":"NOT_FOUND","message":"Transaction not found."}}`. **No** amount, description or line of User A is shown. |
| 6 | **Sign out.** Sign in as the **Administrator**. | The **Users** page opens. The top bar shows only **Users**: no Dashboard, Accounts, New transaction, History or Summary. |
| 7 | In the address bar, open `/accounts`, then `/transactions`, then `/summary` on the same site. | Each time the app goes back to **Users**. No balance or transaction is shown. |
| 8 | On **Users**, look at every column. | Only Name, E-mail, Role and Status (with an Enable/Disable button). No balance, amount or password. |
| 9 | In the console (still Administrator): `fetch('/api/accounts',{headers:{Authorization:'Bearer '+sessionStorage.getItem('moneylog.token')}}).then(async r=>console.log(r.status, await r.text()))`, then the same with `/api/transactions` and `/api/summary`. | Each prints **`403`** and `{"error":{"code":"FORBIDDEN",…}}`, with **no** financial data. |
| 10 | Sign out, sign in as **User A** and open **Accounts**. | Wallet and Bangkok Bank Savings are the same as in step 2: nothing changed. |

**Pass if** steps 3–5 and 6–9 never disclose User A's data, and step 10 shows the protected state unchanged.

---

## UAT-04 — State and persistence: opening balance replace rule, history, sign-out / sign-in

- **Purpose:** check that an opening balance is **replaced, not added**, that it survives a new session, that it is never counted as income, and that history is kept in order.
- **Requirement / AC:** FR-04, BR-09, BR-10 · AC-04-1, AC-04-2, AC-04-3, AC-08-1.
- **Role:** User B, `bob@moneylog.test`. User B's *Loan to Ploy* account is used because no case creates transactions on it, so its balance equals its opening balance.
- **Preconditions:** signed in as User B. Open **Summary** → **Show** (this month) and write down **Income** (I0).

| # | Action | Expected result |
|---|---|---|
| 1 | **Accounts** → on *Loan to Ploy*, click **Opening balance**. Opening amount `10000`, opening date: the 1st of this month. Save. | The balance of *Loan to Ploy* is **฿10,000.00**. Under the name: "Opening ฿10,000.00 on <date>". |
| 2 | Click **Opening balance** on *Loan to Ploy* again and enter `12000` with the same date. Save. | The balance is **฿12,000.00**, **not** ฿22,000.00: the new value replaces the old one. |
| 3 | Try the opening balance `-5` on *Loan to Ploy*. | It is refused with an error message, and the balance stays ฿12,000.00. |
| 4 | Look at an **Income** or **Expense** account (e.g. *Salary*, *Dining*). | There is **no** Opening balance button: opening balances are only for cash and loan accounts. |
| 5 | Open **Summary** → **Show** (this month). | Income is still **I0**. The ฿12,000.00 opening balance is **not** income. |
| 6 | **Make a payment** from *Wallet*, total `45.50`, description `UAT-04 coffee`, Line 1 *Dining* `45.50`. Save. Then **Receive money** into *Wallet*, total `45.50`, description `UAT-04 refund from friend`, Line 1 *Loan to Ploy* `45.50`. Save. | Both are saved. History shows **`UAT-04 refund from friend` above `UAT-04 coffee`** (newest first). *Loan to Ploy* = **฿11,954.50** (12,000.00 − 45.50, Ploy paid back part of the loan). |
| 7 | **Sign out**, close the browser tab, open the site again and sign in as User B. | Accounts still show *Loan to Ploy* = ฿11,954.50 and "Opening ฿12,000.00". History still has both UAT-04 rows in the same order. |

**Pass if** step 2 shows 12,000.00 (not 22,000.00), step 5 keeps Income unchanged, and step 7 shows the same state after a new session.

*Re-running UAT-04:* step 1 then sets the opening balance back to 10,000.00 and step 2 to 12,000.00, so the case gives the same result. The expected value of *Loan to Ploy* after step 6 becomes 12,000.00 − 45.50 × (number of previous runs + 1). Write down its value before step 6 if you run the case twice.

---

## UAT-05 — Sign in, sign out and disabled account

- **Purpose:** check that only enabled users with the right password get in, and that the error never tells which part was wrong.
- **Requirement / AC:** FR-01, FR-02, NFR-03 · AC-01-1, AC-01-2, AC-01-4, AC-01-5.
- **Roles:** User A (Alice), Disabled user (Dan).

| # | Action | Expected result |
|---|---|---|
| 1 | Sign in as `alice@moneylog.test` with the **wrong** password `Wrong-123`. | "Invalid e-mail or password." You stay on the sign-in page. |
| 2 | Sign in as `nobody@moneylog.test` with any password. | The **same** message, "Invalid e-mail or password.". It does not say whether the e-mail exists. |
| 3 | Sign in as the **Disabled user** `dan@moneylog.test` with the **correct** demo password. | The **same** message, and no access. |
| 4 | Sign in as User A with the correct password. | Dashboard with "Hello, Alice". |
| 5 | Click **Sign out**. Then press the browser **Back** button. | The sign-in page opens. Going back shows no financial data: you are sent back to sign-in. |

---

## UAT-06 — Administrator: list, disable and enable a user (run last)

- **Purpose:** check what the Administrator can do, and that disabling a user takes effect immediately.
- **Requirement / AC:** FR-03 · AC-02-1, AC-02-2, AC-02-3, AC-02-5.
- **Roles:** Administrator, User B (Bob). Use **two different browsers**, or one normal and one private window, so both sessions stay open.

| # | Action | Expected result |
|---|---|---|
| 1 | Window 1: sign in as User B and open **History**. | Bob's history is shown. |
| 2 | Window 2: sign in as the **Administrator**. **Users** lists Nok Administrator, Alice Wong, Bob Chen and Dan Disabled with their status. | Dan's status is **Disabled** and the others are **Enabled**. No financial column. |
| 3 | Window 2: click **Disable** for **Bob Chen**. | Bob's status becomes **Disabled**. |
| 4 | Window 1: click **Accounts** (or reload). | Bob is signed out and back on the sign-in page (session ended). Signing in again as Bob with the correct password gives "Invalid e-mail or password.". |
| 5 | Window 2: click **Enable** for Bob Chen. | Bob's status becomes **Enabled**. |
| 6 | Window 1: sign in as Bob. | Signed in: Bob's dashboard opens. |
| 7 | Window 2: look at your own row (Nok Administrator). | It has **no Disable button**, so the Administrator cannot lock themselves out. Its status stays **Enabled**. (The server also refuses it with `400 CANNOT_DISABLE_ADMIN`, covered by automated test TEST-API-14.) |

**Cleanup check:** at the end, Bob must be **Enabled** again. If the case stopped after step 3, sign in as the Administrator and enable Bob.
