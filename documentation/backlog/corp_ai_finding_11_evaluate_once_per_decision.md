# F3 Per-decision evaluation cache

**Roadmap item:** F3 · **Depends on:** F2 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Evaluate server security once per Corp decision instead of repeatedly across independent planning helpers, and stop paying for debug-only evaluation in ordinary play (review finding 11). The evaluator scans public credit sources, bypass effects, breakers, hosted cards, defensive upgrades and every relevant ICE, so its cost grows with board complexity and planning sophistication.

## Current behaviour
22 September 2026 audit note: `_withHypothetical()` now exists and is used by ordinary purge evaluation with exception-safe restoration. The broader cache remains open. Decision-snapshot recording is now explicitly opt-in (`DecisionSnapshots.enabled = false` by default), so ordinary play does not pay for reproduction-code generation at every interesting decision. The local double work has been removed: `_rankedServersToProtect()` calculates one security result per included real server and passes it into `_protectionScore()`, `_bestProtectedRemote()` calculates each candidate's protection score once, and call-count regressions enforce both. The small F1 destination-order cache establishes the decision-lifetime pattern but does not cache security results. See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Relevant functions (search by name; line numbers drift): `_evaluateServerSecurity()`, `_rankedServersToProtect()`, `_protectionScore()`, `_rankedInstallOptions()`, and the `Phase_Main` debug call.

The source log for `bugs2.md` items 3 and 4 printed the same Remote 3 security result 29 times during one Corp decision: repeated evaluation, not recursion or a gameplay loop. Remaining duplication arises because:

- `Phase_Main` calls `_serverToProtect(false, true)` on entry just for debug logging.
- `_rankedInstallOptions()` calls `_serverToProtect()` up to three more times, and can itself run two or three times per click.
- `_isAScoringServer()`, `_emptyProtectedRemotes()`, `_scoringWindow()`, critical-defence planning and install planning independently request overlapping protection/security information.

Proposed fix:

- Add a per-decision evaluation context or cache keyed to the state, cleared on `Choice()` entry and at decision boundaries or state change.
- Bypass the cache during hypothetical state changes (every `_withHypothetical()` call from F2).
- Gate the `Phase_Main` debug call behind a debug flag.
- Existing save/restore precedents: `AIIceEncounterSaveState` / `AIIceEncounterRestoreState`, and `AIPrepareHypotheticalForRC` / `AIRestoreHypotheticalFromRC`.

## Safety and information boundary
- Do not add a long-lived cache keyed only by server identity. Several planners temporarily change ICE arrays, rez state, credits, counters and encounter state; returning a real-board result inside one of those hypothetical states would change decisions.
- Prefer an explicit decision context plus an opt-out for guarded hypothetical evaluation, or introduce a reliable board-state generation counter first.

## Test scenarios
1. Decisions are identical with the cache on and off.
2. A stale cache is never read across a board change.
3. Hypothetical evaluation always bypasses the cache and never populates it.
4. The debug-only call does not run when the debug flag is off.
5. Existing local guarantees remain: one evaluator call per real server in a ranked-protection pass, and one protection-score call per candidate in `_bestProtectedRemote()`.

## Acceptance gate
Evaluator call counts per `Phase_Main` drop, measured with the F4 harness and its per-decision latency metric, with no decision changes.

## Things to consider
- This is not currently expected to create a noticeable pause on ordinary boards; the gate is call count and latency, not a visible fix.
- Original dependency: review findings 1 and 2 (evaluator correctness) should land before caching, so the cache stores the corrected evaluator.
- The cache pairs with L8.4 posture epochs: both define decision lifetimes, and clearing the cache must not reroll a posture.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
