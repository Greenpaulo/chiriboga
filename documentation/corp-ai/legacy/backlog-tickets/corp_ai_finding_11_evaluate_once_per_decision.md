# Corp AI finding 11: Evaluate once per decision (cache + gated debug + guarded hypotheticals)

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 11.
**File:** `ai_corp.js` — `_evaluateServerSecurity()` (~2319), `_rankedServersToProtect()` (~2525), `_protectionScore()`, `_rankedInstallOptions()` (~3273), `Phase_Main` debug call (~5091). Line numbers drift; search by function name.
**Belongs in:** Foundations doc F2 (guarded helper) and F3 (per-decision cache), `documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`. It pairs with Security roadmap Layer 8.4 posture epochs and the Phase 9 latency metric.
**Suggested order:** Step 5 of 5 — after the evaluator fixes (1, 2) land, so the cache caches the corrected evaluator.
**Depends on:** Findings 1 and 2 (the evaluator's behaviour must be correct before caching it). Finding 12 measures the call-count/latency improvement.
**Status:** Follow-up remains open. The safe local duplication found while fixing `bugs2.md` items 3 and 4 has been removed; this ticket now owns only cross-helper, decision-scoped reuse.

**22 September 2026 audit note:** `_withHypothetical()` now exists and is used
by ordinary purge evaluation with exception-safe restoration. The broader cache
remains open. Decision-snapshot recording is now explicitly opt-in
(`DecisionSnapshots.enabled = false` by default), so ordinary play does not pay
for reproduction-code generation at every interesting decision. This does not
claim the cache work below is complete.

---

## Problem

The source log for `bugs2.md` items 3 and 4 printed the same Remote 3 security result 29 times between lines 244 and 280. That was repeated evaluation during one Corp decision, not recursion or a gameplay loop. Logging has since been moved out of the evaluator, but repeated computation can still occur across independent planning helpers.

The local double work has been removed:

- `_rankedServersToProtect()` now calculates one security result per included real server and passes it into `_protectionScore()`.
- `_bestProtectedRemote()` now calculates each candidate's protection score once instead of rescoring every new leader.
- Call-count regressions enforce both properties.

Remaining duplication can still arise because:

- `Phase_Main` calls `_serverToProtect(false, true)` on entry (~5091) just for debug logging.
- `_rankedInstallOptions()` calls `_serverToProtect()` up to 3 more times, and can itself run 2-3 times per click.
- `_isAScoringServer()`, `_emptyProtectedRemotes()`, `_scoringWindow()`, critical-defence planning, and install planning independently request overlapping protection/security information.

This is not currently expected to create a noticeable pause on ordinary boards, but the evaluator scans public credit sources, bypass effects, breakers, hosted cards, defensive upgrades, and every relevant ICE. The cost will grow as both board complexity and planning sophistication increase.

## Proposed fix

- Add a per-decision evaluation context or cache keyed to the state and cleared on `Choice()` entry or state change. Bypass it during hypotheticals.
- Gate the debug call behind a debug flag.
- Add one guarded `_withHypothetical()` helper. Precedents already exist: `AIIceEncounterSaveState` / `AIIceEncounterRestoreState`, and `AIPrepareHypotheticalForRC` / `AIRestoreHypotheticalFromRC`.

Do not add a long-lived cache keyed only by server identity. Several planners temporarily change ICE arrays, rez state, credits, counters, and encounter state; returning a real-board result inside one of those hypothetical states would change decisions. Prefer an explicit decision context plus an opt-out for guarded hypothetical evaluation, or introduce a reliable board-state generation counter first.

## Tests / acceptance criteria

- Decisions are identical with the cache on and off.
- Evaluator call counts per `Phase_Main` drop (measure with the finding 12 harness / Phase 9 latency metric).
- A stale cache is never read across a board change; hypotheticals always bypass it.
- The debug-only call does not run when the debug flag is off.
- Existing local guarantees remain: one evaluator call per real server in a ranked-protection pass and one protection-score call per candidate in `_bestProtectedRemote()`.
