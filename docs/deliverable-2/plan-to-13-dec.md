# Completion plan to the final release (13 Dec 2026)

Owner of every item: **Mamadou Diao Bah** (one-member team). Final examinations: 1–11 Dec, so the remaining product workflows are scheduled **before** 1 Dec; the exam period holds only small bounded items.

| Date | Item | Feature / AC | Remaining action | Depends on | Done when |
|---|---|---|---|---|---|
| 29 Nov | D2 candidate | F-01…F-15 | submit D2 PDF; keep the candidate deployed | — | PDF on LEB2 |
| 30 Nov | **F-16 Reports** | AC-16-1…5 | RED (TEST-UNIT-26, TEST-API-140…143) → GREEN (`GET /api/reports/monthly`, Reports page, TEST-UI-17) | F-07 | CI green, merged to staging |
| 30 Nov – 1 Dec | **F-17 User admin + own password** | AC-17-1…6 | RED (TEST-UNIT-27, TEST-API-150…154) → GREEN (admin create/reset, change password page, TEST-UI-18) | F-01, F-02 | CI green, merged to staging |
| 2 Dec | Release candidate 2 | F-16, F-17 | release PR staging → main, deploy, post-deploy checks | above | `/api/health` = release SHA |
| 3 Dec | E2E in CI (debt TD-1) | NFR-08 | Playwright job (API + Vite + Postgres service) required on main | — | job green on a PR |
| 4 Dec | NFR-10 check | AC-16-6, TEST-PERF-01 | script: 2,000 synthetic transactions, 50 requests to history/summary/reports on GCP; record p95 | F-16 | p95 < 500 ms recorded |
| 4 Dec | Partner re-test request | Sprint 2 + 3 | send UAT cases for F-09…F-17 to EN-002 | RC2 | e-mail sent |
| 9 Dec | Partner UAT results | — | triage findings into Issues (severity, decision) | EN-002 | every finding triaged |
| 11–12 Dec | Fixes + final regression | any finding | RED/GREEN per defect; full suite + E2E | findings | 0 open major defects |
| 12 Dec | Final video | — | record the main journeys (Sprint 1 → 3) | RC final | video uploaded |
| 13 Dec | **Final release v1.0.0** | all | tag, deploy, final post-deploy checks, final report | all above | tag on main, deployed |

Risks: exam load (mitigated by finishing F-16/F-17 before 1 Dec); single developer (no independent reviewer → partner review requested on release PRs).
