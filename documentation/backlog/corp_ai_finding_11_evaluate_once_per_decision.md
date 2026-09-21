# Corp AI finding 11: Evaluate once per decision (cache + gated debug + guarded hypotheticals)

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 11.
**File:** `ai_corp.js` — `_evaluateServerSecurity()` (~2319), `_rankedServersToProtect()` (~2525), `_protectionScore()`, `_rankedInstallOptions()` (~3273), `Phase_Main` debug call (~5091). Line numbers drift; search by function name.
**Belongs in:** Foundations doc F2 (guarded helper) and F3 (per-decision cache), `documentation/corp-ai/roadmaps/corp_ai_foundations_roadmap.md`. It pairs with Security roadmap Layer 8.4 posture epochs and the Phase 9 latency metric.
**Suggested order:** Step 5 of 5 — after the evaluator fixes (1, 2) land, so the cache caches the corrected evaluator.
**Depends on:** Findings 1 and 2 (the evaluator's behaviour must be correct before caching it). Finding 12 measures the call-count/latency improvement.

---

## Problem (from reading, not profiled)

`_evaluateServerSecurity()` is called repeatedly for the same board:

- `_rankedServersToProtect()` runs `_protectionScore()`, which runs the evaluator, then runs it again per server.
- `Phase_Main` calls `_serverToProtect(false, true)` on entry (~5091) just for debug logging.
- `_rankedInstallOptions()` calls `_serverToProtect()` up to 3 more times, and can itself run 2-3 times per click.

## Proposed fix

- Add a per-decision cache keyed to the state and cleared on `Choice()` entry or state change. Bypass it during hypotheticals.
- Gate the debug call behind a debug flag.
- Add one guarded `_withHypothetical()` helper. Precedents already exist: `AIIceEncounterSaveState` / `AIIceEncounterRestoreState`, and `AIPrepareHypotheticalForRC` / `AIRestoreHypotheticalFromRC`.

## Tests / acceptance criteria

- Decisions are identical with the cache on and off.
- Evaluator call counts per `Phase_Main` drop (measure with the finding 12 harness / Phase 9 latency metric).
- A stale cache is never read across a board change; hypotheticals always bypass it.
- The debug-only call does not run when the debug flag is off.
