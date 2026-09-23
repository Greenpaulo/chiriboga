# Corp AI finding 2: Unrezzed ICE is budgeted independently, overstating security

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 2.
**File:** `ai_corp.js` — `_evaluateServerSecurity()` (~2319). Line numbers drift; search by function name.
**Belongs in:** Security roadmap (`documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`), new `#### Layer 1.1 ... [FOLLOW-UP]`, placed before `### Layer 2`.
**Suggested order:** Step 3 of 5 — pairs with finding 1; the two evaluator fixes come before everything that consumes the evaluator.
**Depends on:** Nothing hard. Validate with the harness (finding 12).
**Status:** Fixed, regression-tested, and code-review validated. See the resolution and validation records below.

---

## Problem

Each unrezzed ICE is checked against the Corp's full credits on its own. Two 4c ICE with 5 credits both count as active security, but only one can be rezzed. The result overstates security and can mark a server secure when it is not.

## Proposed fix

- Walk the route in encounter order (highest `server.ice` index first) with a running budget.
- Rezzed ICE cost nothing.
- An unrezzed ICE counts only if it fits the remaining budget.
- Use a local counter and no state mutation. Log skipped ICE in `reasons`.
- This matches what `Phase_Approaching()` can actually do.
- Every caller inherits the fix: protection scores, `_iceWorthRezzing()` and critical defense.

## Tests / acceptance criteria

- 2x4c ICE with 5 credits: only the outer ICE counts.
- Same ICE with 8 credits: both count.
- Rezzed ICE consumes no budget.
- Live credits, `rezzed` flags and `server.ice` are unchanged after evaluation.

## Cross-reference to add

Add a one-line cross-reference from Install roadmap Phase 2, scenario 4: "consume the evaluator fix, do not reimplement it".

---

## Resolution — corrected 22 September 2026

Implemented in `_evaluateServerSecurity()`.

- The first implementation used one outer-to-inner base-credit budget. Review found that this could spend the budget on a weak outer layer while excluding a decisive inner layer, and it did not allocate target-compatible hosted rez credits.
- The evaluator now enumerates affordable subsets of unrezzed ICE and keeps the plan with the strongest deterministic outcome: hard lockout, then mandatory break cost, then total avoidance cost, with lower rez cost as the final tie-break. Rezzed ICE are always included.
- `_canFundRezPlan()` allocates base credits plus active, target-compatible hosted credits with a small max-flow calculation, so a restricted source cannot be promised to an ineligible ICE or spent twice.
- ICE outside the selected plan are excluded from bypass and break-cost evaluation and identified in `reasons` as omitted from the best affordable plan.
- The calculation remains side-effect free: it does not spend credits, change rez state, or reorder ICE.
- Added deterministic regression coverage for the original 5-credit and 8-credit cases, state preservation, skipping a weak outer layer for a decisive inner layer, and compatible versus incompatible hosted rez credits.
- Added the completed Layer 1.1 roadmap entry, the Install Phase 2 cross-reference, and the evaluator behavior note in `documentation/ai.md`.

## Code-review validation — 23 September 2026

- Revalidated the implementation against the live credit-spending model, bypass allocation, evaluator consumers, roadmap cross-reference, and acceptance criteria above.
- Confirmed that selecting the strongest affordable subset is the better-supported correction to the original outer-to-inner budget proposal: the Corp may decline a weak outer rez and preserve funds for decisive inner ICE.
- Confirmed target-restricted hosted credits are allocated without double-spending and evaluation leaves credits, rez state, hosted credits, and ICE order unchanged.
- `node tests/corp-server-security.test.js`: **109 regression cases passed**.
- `node tests/run-all-tests.js`: **19 test files passed**, including the Corp decision-fixture and decision-snapshot suites.
- No corrective code change was required; the ticket is ready for the completed backlog.
