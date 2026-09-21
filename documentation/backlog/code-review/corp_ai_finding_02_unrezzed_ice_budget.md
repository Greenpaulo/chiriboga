# Corp AI finding 2: Unrezzed ICE is budgeted independently, overstating security

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 2.
**File:** `ai_corp.js` — `_evaluateServerSecurity()` (~2319). Line numbers drift; search by function name.
**Belongs in:** Security roadmap (`documentation/corp-ai/roadmaps/corp_ai_improvement_roadmap.md`), new `#### Layer 1.1 ... [FOLLOW-UP]`, placed before `### Layer 2`.
**Suggested order:** Step 3 of 5 — pairs with finding 1; the two evaluator fixes come before everything that consumes the evaluator.
**Depends on:** Nothing hard. Validate with the harness (finding 12).

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

## Resolution — 21 September 2026

Implemented in `_evaluateServerSecurity()`.

- The evaluator now reserves unrezzed ICE rez costs from a single local budget in encounter order, outermost to innermost.
- Rezzed ICE remain active without consuming that budget; skipped unrezzed ICE are excluded from bypass and break-cost evaluation and identified in `reasons`.
- The calculation remains side-effect free: it does not spend credits, change rez state, or reorder ICE.
- Added deterministic regression coverage for the 5-credit and 8-credit two-layer cases, rezzed ICE, and state preservation.
- Added the completed Layer 1.1 roadmap entry, the Install Phase 2 cross-reference, and the evaluator behavior note in `documentation/ai.md`.
