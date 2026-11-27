# CR-01 — A Wallet can no longer go below zero (Lab 7)

| | |
|---|---|
| Issue | #41 (label `lab7`) |
| Requested | 21 Nov 2026 by Mamadou Diao Bah (Product owner, team EN-049) |
| Approval | Course TA by e-mail, 27 Nov 2026 17:20 Bangkok: "you do not need to have the instructor or TAs check or approve your work. You can proceed directly." Recorded on #41. |
| Accepted Sprint 1 baseline | v0.1.0 = `c26bebe` (BR-15 v1 implemented and accepted; UAT accepted `81d4c6d` with the same rule) |
| Pre-change commit | `staging` = `c7af0bb` (27 Nov 2026), `main` / deployed = `81d4c6d` |
| Intervening development | Lab 5 delivery (Docker, CI, GCP), #37 version in `/api/health`, Lab 6 UAT docs and the #47 exercise (defect + fix, net no app change), Sprint 2 contracts (docs only). None touches BR-15. |

## Old → new behaviour
| | Old (BR-15 v1, Sprint 1) | New (BR-15 v2) |
|---|---|---|
| Payment from a wallet larger than its balance | accepted, wallet becomes negative (shown red) | **refused** `400 INSUFFICIENT_WALLET_FUNDS`, nothing stored |
| Payment that leaves the wallet at exactly 0.00 | accepted | accepted (boundary) |
| Transfer out of the wallet (receipt into bank with a wallet line) beyond its balance | accepted | **refused**, same code |
| Money into a wallet (receipt into it, payment line on it) | accepted | accepted, even if the wallet is negative today |
| Bank account overdraft | accepted | accepted (unchanged) |
| Wallets already negative before the change | — | kept as recorded (no migration); only further withdrawals are blocked |

**Reason.** Physical cash cannot be overspent: a negative wallet always means a missing receipt or a wrong account, which makes balances and summaries misleading. A bank overdraft is real and stays allowed.

## Impact analysis
| Area | Affected? | Impact and decision |
|---|---|---|
| Requirements | yes | SRS 1.1: BR-15 v2, D-05 revised; FR-10/FR-11 wording unchanged |
| F-05 / F-06 contract | yes | v1.1: new error code, AC-05-7…9, AC-06-4, STS rows; TEST-API-35 setup moved off the empty wallet (its assertion is about dates, unchanged) |
| F-03 balances / F-07 summary / F-08 history | display only | balances still derived (BR-11); summary unaffected (no income/expense change); history unchanged |
| F-04 opening balance | no | opening amounts are ≥ 0 already (BR-13) |
| Domain code | yes | new pure rule `walletShortfalls` in `domain/ledger.ts`; `validateTransaction` unchanged |
| API / service | yes | `POST /api/transactions` runs the wallet guard inside its database transaction, after locking the affected wallet rows (`FOR UPDATE`) — prevents two concurrent payments both passing |
| Validation order | yes | all Sprint 1 rules first (so `ACCOUNT_NOT_FOUND` for another user's wallet never reveals its balance), funds check last |
| Roles / ownership | no change, re-tested | USER only; other user's wallet → 400 ACCOUNT_NOT_FOUND; Administrator 403 (AC-05-9) |
| Persistence / migration | no schema change | integer satang; no data migration; existing negative wallets stay |
| UI | small | the form already shows the server error under the form; message text names the wallet and the available amount |
| Sprint 2 F-11 (edit) | future | the guard must exclude the original transaction's own effect when editing — recorded in F-11 contract revision |
| Tests | yes | new TEST-UNIT-08, TEST-API-37…39; all Sprint 1 tests must stay green (regression) |
| Docs / UAT cases | yes | UAT-02 step 6 pays 0.30 from Wallet: still valid only if the wallet has ≥ 0.30 — noted in uat-cases v1.2 |
