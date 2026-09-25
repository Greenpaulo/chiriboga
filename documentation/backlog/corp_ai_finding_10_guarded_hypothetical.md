# F2 Guarded hypothetical evaluation: remaining migrations

**Roadmap item:** F2 · **Depends on:** none · **Sets:** vantagepoint (Baker)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Route every Corp planning probe that temporarily mutates game state through one exception-safe helper, so a throw during evaluation can never leave credits, run context or other state altered, and fix the accidental array `<` comparison found alongside it (review finding 10).

## Current behaviour
`_withHypothetical(apply, evaluate, restore)` exists and gives exception-safe restoration to migrated probes such as ordinary purge evaluation; `_icePreventsGameWinningBreach()` and `_criticalBreachDefenseAction()` already restore correctly. Three cases remain unmigrated: `Phase_Main`'s manual credit rollback, `_iceInstallScore()`, and Baker's card-local run-context probe in `sets/vantagepoint.js`. See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Search by function name; line numbers drift.

- **`Phase_Main` credit probe:** `corp.creditPool += this._clicksLeft() - 1` is rolled back manually, not in `try/finally`, so a throw in between leaves the Corp's credits inflated. Route it through `_withHypothetical()`.
- **Array comparison:** `rankedInstallOptions < this._rankedInstallOptions(...)` compares arrays with `<`. It works only because plain objects stringify to `"[object Object]"`; it is accidental. Compare `.length` instead.
- **`_iceInstallScore()`** (currently unused) mutates without a guard. Convert its mutation to `_withHypothetical()`, or delete the function with Install Phase 2 if it is still unused.
- **Baker's prospective-run probe:** Baker's `AIRedirectsRun` must ask run-only credit sources (for example Touchstone's hosted credit) whether they would be usable in a prospective Archives run even though no run is active during Corp planning. Its card-local helper currently supplies `attackedServer` under `try/finally` and restores the live value; this is safe and regression-tested but duplicates the guarded-hypothetical pattern. Migrate this probe, and any other card hook that needs a prospective run context, to `_withHypothetical()` or a narrow shared run-context wrapper.

## Safety and information boundary
- Migrated probes must remain read-only: no credits spent, counters changed, cards rezzed or state left different after evaluation.
- Restoration must happen after exceptions as well as on normal return.
- Results computed inside a hypothetical context must never populate F3's per-decision evaluation cache.

## Test scenarios
1. The install-option comparison reflects relative counts, not string coercion.
2. Throwing inside the `Phase_Main` hypothetical leaves credits, and any other mutated state, exactly as they were.
3. `_iceInstallScore()`'s mutation is guarded, or the function is gone.
4. Baker's `AIRedirectsRun` still detects a redirect paid by a run-only credit source during Corp-turn planning, and the live `attackedServer` is unchanged afterwards, including when the probed credit source throws.
5. The existing Baker/Touchstone Archives-backdoor regression still passes.

## Acceptance gate
Every probe listed under Design uses `_withHypothetical()` or the shared run-context wrapper (or, for `_iceInstallScore()`, is deleted), and the scenarios above pass.

## Things to consider
- This finding and F3 were originally paired: F3 owns the cache that hypotheticals must bypass. Land F2 first so F3 can rely on a single guarded entry point to detect hypothetical context.
- If a narrow run-context wrapper is added for card hooks, document it in `documentation/ai.md` as the supported way for a hook to evaluate prospective run-only costs.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
