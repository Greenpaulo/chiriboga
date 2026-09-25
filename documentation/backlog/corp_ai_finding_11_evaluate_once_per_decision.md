# F3 Per-decision evaluation cache

**Roadmap item:** F3 · **Depends on:** F2, F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Evaluate server security once per Corp decision instead of again in each
independent planning helper, and stop paying for debug-only evaluation in
ordinary play (review finding 11). The evaluator scans public credit sources,
bypass effects, breakers, hosted cards, defensive upgrades and every relevant
ICE. Its cost grows with board complexity and with planning sophistication.
The cache must never change a decision.

## Current behaviour
- `_withHypothetical()` exists but only `_ordinaryPurgeOutcome()` uses it.
  Most probes that change the board and then call the security evaluator do
  so by hand: `_icePreventsGameWinningBreach`, `_iceWouldSecureServer`,
  `_criticalBreachDefenseAction`, the `Phase_Main` "gain then install" check
  (through `_rankedInstallOptions`), `_effectiveRunnerCreditPool` (which is
  called inside the evaluator and changes `attackedServer`), and
  `_potentialTagPunishment`. F2 lists them all and migrates them.
- Decision-snapshot recording is opt-in (`DecisionSnapshots.enabled = false`
  by default), so ordinary play does not generate reproduction code.
- Local double work is gone. `_rankedServersToProtect()` computes one
  security result per real server and passes it into `_protectionScore()`.
  `_bestProtectedRemote()` computes each candidate's protection score once.
  Call-count regressions enforce both.
- `Choice()` already has a decision lifetime:
  - it saves `_decisionRandomState`, installs a fresh one, and restores the
    old one in `finally`;
  - the F1 asset-destination order cache lives in that state;
  - it does not cache security results.
- Security evaluators are also called from card hooks outside a Corp
  `Choice()`. Examples: `corp.AI._serverToProtect()` in `sets/systemgateway.js`
  and `sets/elevation.js`, `corp.AI._protectionScore()` in
  `sets/systemupdate2021.js`, and `corp.AI._evaluateServerSecurity()` in
  `sets/elevation.js`.

See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design
Relevant functions (search by name): `_evaluateServerSecurity()`,
`_rankedServersToProtect()`, `_protectionScore()`, `_rankedInstallOptions()`,
`_withHypothetical()`, `Choice()`, and the `Phase_Main` debug call.

Where the duplicate work comes from:
- The source log for `bugs2.md` items 3 and 4 printed the same Remote 3
  security result 29 times during one Corp decision. That is repeated
  evaluation, not recursion or a gameplay loop.
- `Phase_Main` calls `_serverToProtect(false, true)` on entry only for debug
  logging.
- `_rankedInstallOptions()` calls `_serverToProtect()` up to three more
  times, and can itself run two or three times per click.
- `_isAScoringServer()`, `_emptyProtectedRemotes()`, `_scoringWindow()`,
  critical-defence planning and install planning each request overlapping
  protection and security information.

Fix:
- **Lifetime.** Put the cache in the per-`Choice()` decision state, beside
  `_decisionRandomState`: created on `Choice()` entry, restored in `finally`.
  Outside a `Choice()` there is no cache, so card hooks that call the
  evaluator at other times evaluate directly.
- **Hypothetical detection by depth, not by call site.** Read and write the
  cache only when the hypothetical depth count kept by `_withHypothetical()`
  and F2's shared run and encounter wrappers is 0. Every hypothetical passes
  through one of those after F2, so a cache lookup inside any hypothetical,
  nested or not, and wherever it was started, is bypassed. Do not detect
  hypotheticals by listing functions or by looking for `_withHypothetical()`
  on the stack.
- **Key.** The server object plus the evaluator's options. This is safe only
  because the board cannot change inside one `Choice()` at depth 0. Add a
  debug assertion (on in tests) that recomputes a sample of hits and compares.
- **Debug call.** Gate the `Phase_Main` debug-only `_serverToProtect(false,
  true)` call behind a debug flag.
- **Count calls.** Count evaluator calls per `Choice()` through F4's collector
  extension point (`evaluatorCallCount`).
- **Precedents** for save and restore: `AIIceEncounterSaveState` /
  `AIIceEncounterRestoreState`, and `AIPrepareHypotheticalForRC` /
  `AIRestoreHypotheticalFromRC`.

## Safety and information boundary
- No long-lived cache keyed only by server identity.
- A result computed at hypothetical depth above zero never enters the cache,
  and a cached result is never served at depth above zero.
- The cache must not reroll or freeze randomness. Postures keep their own
  lifetimes (principle 5), and clearing the cache must not reroll a posture
  (see L8.4).

## Test scenarios
1. Decisions are identical with the cache on and off across the green corp
   decision fixtures and `tests/decision-snapshots.test.js`.
2. A cached result is never read across a board change: two `Choice()` calls
   with a change between them each see the current board.
3. **The with-ICE and without-ICE probes still differ with caching on.** Use
   the Bran-on-R&D board in `tests/corp-server-security.test.js`, where
   `_icePreventsGameWinningBreach(rndBran, 6, rnd)` is `true`. Warm the cache
   with a real-board `_evaluateServerSecurity(rnd)` inside the same `Choice()`,
   then call the probe. It must still return `true`, and the cache must hold
   no entry written at depth above zero.
4. The same holds for `_iceWouldSecureServer()`, for the
   `_criticalBreachDefenseAction()` ICE-install probe (the post-install risk
   is lower than the cached pre-install risk), and for the `Phase_Main` "gain
   then install" check.
5. A hypothetical nested inside another hypothetical, or started from a shared
   wrapper (Baker, `runcalculator.js`), also bypasses the cache.
6. The debug-only call does not run when the debug flag is off.
7. The existing local guarantees remain. There is one evaluator call per real
   server in a ranked-protection pass, and one protection-score call per
   candidate in `_bestProtectedRemote()`.
8. A card hook that calls `corp.AI._evaluateServerSecurity()` outside a
   `Choice()` gets a fresh evaluation.

## Acceptance gate
Behaviour-identical performance change, so it ships without an option.
- Decision snapshots are identical to the recorded baseline, with no deltas.
- An F4 run on the committed deck pool with the same seeds, cache off
  compared with cache on, shows:
  - identical per-decision choices in the decision logs;
  - mean `evaluatorCallCount` per `Phase_Main` decision lower by at least
    50%;
  - `decisionLatencyMs` not higher (the upper bound of the 95% interval of
    the difference is at most 0).

## Things to consider
- This is not expected to fix a noticeable pause on ordinary boards. The gate
  is call count and latency.
- The cache pairs with L8.4 posture epochs, since both define decision
  lifetimes.
- Review findings 1 and 2 (evaluator correctness) have landed, so the cache
  stores the corrected evaluator.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded baseline except for listed, justified deltas (none expected).
- [ ] The `evaluatorCallCount` collector is added through F4's collector extension point, and the F4 cache-off versus cache-on comparison (command, deck pairs, seeds, results) is recorded in the Resolution.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
