# Completion plan to the final release (13 Dec 2026)

Owner of every item: **Mamadou Diao Bah** (one-member team). Final examinations: 1–11 Dec. **Update 28 Nov:** every baseline feature (F-01…F-17) is implemented and tested in the D2 candidate; the exam period holds only bounded verification items.

| Date | Item | Feature / AC | Remaining action | Depends on | Done when |
|---|---|---|---|---|---|
| 29 Nov | D2 candidate | F-01…F-15 | submit D2 PDF; keep the candidate deployed | — | PDF on LEB2 |
| ~~30 Nov~~ **done 28 Nov** | F-16 Reports | AC-16-1…5 | done: PR #73 (RED `970a0d0` → GREEN `4e5f059`) | F-07 | ✔ |
| ~~30 Nov – 1 Dec~~ **done 28 Nov** | F-17 User admin + own password | AC-17-1…6 | done: PR #74 (RED `08b8265` → GREEN `efaf244`) | F-01, F-02 | ✔ |
| 2 Dec | Release candidate 2 | F-16, F-17 | release PR staging → main, deploy, post-deploy checks | above | `/api/health` = release SHA |
| ~~3 Dec~~ **done 28 Nov** | E2E in CI (debt TD-1) | NFR-08 | done: PR #75 | — | ✔ |
| 4 Dec | NFR-10 check on GCP | AC-16-6, TEST-PERF-01 | run `scripts/perf-check.ts` against the deployment (local run 28 Nov: worst p95 152 ms) | F-16 | p95 < 500 ms recorded on GCP |
| 4 Dec | Partner re-test request | Sprint 2 + 3 | send UAT cases for F-09…F-17 to EN-002 | RC2 | e-mail sent |
| 9 Dec | Partner UAT results | — | triage findings into Issues (severity, decision) | EN-002 | every finding triaged |
| 11–12 Dec | Fixes + final regression | any finding | RED/GREEN per defect; full suite + E2E | findings | 0 open major defects |
| 12 Dec | Final video | — | record the main journeys (Sprint 1 → 3) | RC final | video uploaded |
| 13 Dec | **Final release v1.0.0** | all | tag, deploy, final post-deploy checks, final report | all above | tag on main, deployed |

Risks: exam load (mitigated by finishing F-16/F-17 before 1 Dec); single developer (no independent reviewer → partner review requested on release PRs).
