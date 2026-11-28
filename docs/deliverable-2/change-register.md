# Change and defect register — MoneyLog (status 28 Nov 2026)

Accepted Sprint 1 baseline: **v0.1.0 = `c26bebe`** (14 Nov 2026). UAT-accepted release: `81d4c6d` (Lab 6, partner EN-002, 45/45).

| ID | Source | Requirement / feature | Finding or change | Accepted decision | Status | Fix / change release | Re-test outcome |
|---|---|---|---|---|---|---|---|
| L5-01 | Lab 5 deployment | NFR-07, R-01 | Demo passwords must not be the public seed fallback on GCP | Passwords from Secret Manager; rotated | Resolved | Lab 5 release (16 Nov) | sign-in with rotated password works; fallback refused (Lab 5 evidence) |
| L6-37 (#37) | Lab 6 preparation | R-01 | UAT testers cannot see which commit they test | `GET /api/health` returns the deployed commit (`APP_VERSION`) | Resolved | `81d4c6d` (PR #38/#39) | health shows the release SHA on every deploy since |
| #44 | Lab 6 UAT (EN-002) | UAT-03 doc (AC-03-3) | Console command in UAT-03 failed (`TypeError`): response is `{transactions:[…]}` | Documentation defect, minor | Resolved | uat-cases v1.1 (PR #46) | partner re-ran UAT-03: pass |
| #45 | Lab 6 UAT (EN-002) | UAT-04 doc (AC-04-x) | Expected values wrong on a second run | Documentation defect, minor: expected values written as "before ± change" | Resolved | uat-cases v1.1 (PR #46) | partner re-ran UAT-04: pass |
| #47 | Lab 6 UAT exercise | BR-14, AC-05-6 | Future-dated transaction accepted on the exercise build `be84770` | Major defect (controlled exercise) | Resolved | PR #48 (`ca316e4`), approved by partner reviewer | partner re-test 45/45 ACCEPTED (22 Nov); regression tests TEST-API-36, TEST-UI-03 |
| CR-01 (#41) | Lab 7 change request, TA approval 27 Nov | BR-15 → v2, F-05/F-06 | A wallet can no longer go below 0.00 (bank overdraft kept) | Approved baseline revision (SRS 1.1, contract F-05/F-06 1.1) | Implemented | main `c655a61` (PRs #55–#57) | post-deploy checks on `c655a61` 4/4 pass; tests TEST-UNIT-08, TEST-API-37…39 |
| REV-01 | CR-01 impact | F-05 STS | TEST-API-35 paid from an empty wallet (relied on BR-15 v1) | Setup moved to the bank; assertion unchanged | Done | `c1347d9` | TEST-API-35 passes |
| REV-02 | CR-01 × Sprint 2 | F-11 contract | Edits must respect the wallet rule | F-11 contract v1.1 (AC-11-7, TEST-API-96), before implementation | Implemented | v0.2.0 `60e6328` | TEST-API-96 pass |
| Q-01 | SRS open question | Refunds | How to record a shop refund | No scope change: refunds stay out of scope; correct the purchase with F-11 | Closed | SRS 1.2 (D2) | — |
| Q-02 | SRS open question | F-09 / F-10 | Borrower name for Loan Given | Account name holds the borrower; one account per borrower | Closed | SRS 1.2 (D2) | AC-10-2 uses "Loan to Ploy" |

No open defect at 28 Nov 2026 (open Issues are the planned features #66, #67).
