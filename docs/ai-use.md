# AI-use declaration — MoneyLog (team EN-049)

| Tool | Used for | How the output was checked |
|---|---|---|
| Claude (Anthropic), coding and specification agent | Drafting the SRS, feature inventory, System SDS and Sprint 1 contracts from the theme 7 brief; writing tests before code; implementing the API, domain module and React pages; CI workflow; README | The theme brief was compared line by line with the SRS (see the PR #9 review). Every test was run locally and in CI, and the red run before each implementation is linked in its PR. Balances were recomputed by hand for the Sprint 1 example. The diffs were reviewed for secrets before each push. |

The student remains responsible for every requirement, design decision and test, and can explain them. Two defects were found by tests and fixed: the History "saved" message was lost under React StrictMode (found by E2E), and the seed list lacked a non-card loan account (found while implementing AC-06-3; contract revision 1.1).
