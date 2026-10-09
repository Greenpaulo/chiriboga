# F3 Per-decision evaluation cache

**Outcome:** adopted — full behaviour-identical F3 comparison passed, 2026-10-09.

**Roadmap item:** F3 · **Depends on:** F2, F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 44479ba (2026-10-09)

## Resolution

**Comparison status:** passed — behaviour-identical F4 comparison on the full committed pool, 2026-10-09. No strategic option or AI default change.

Implemented from `44479ba` for the completion follow-up below.

Historical cache implementation: built from `58f3a4d` (with D2 and F4 step 1
uncommitted in the same tree). The following original measurements and review
are preserved as historical evidence; the dated completion entry supersedes
the unfinished dependency and test-coverage notes.

- **Depth counter (the part of F2 that F3 needs).** `CorpAI._hypotheticalDepth`
  is raised in `try/finally` by `_withHypothetical()` and by F2 sites #2 to #8
  (`_icePreventsGameWinningBreach` and `_iceWouldSecureServer`, both probes
  each; `_criticalBreachDefenseAction`; `_effectiveRunnerCreditPool`;
  `_effectiveIceSubtypes`; `_potentialTagPunishment`; the `Phase_Main` "gain
  then install" check). Their restore logic is unchanged. F2's ticket records
  this.
- **Cache.** `Choice()` creates `_securityCache` and restores the previous one
  in `finally`. `_evaluateServerSecurity()` is now the cached entry. It serves
  or stores a result only at depth 0, when not nested in another evaluation,
  keyed by the server plus `_securityBoardKey()`. The work moved unchanged into
  `_evaluateServerSecurityUncached()`. `_securityCacheVerify` recomputes every
  hit and throws on a difference; `_securityCacheEnabled` turns the cache off.
- **Deviation 1: two more cache lifetimes.** Measuring showed 323 of 693
  evaluations in a game ran outside any `Choice()`. They came from
  `_prepareProtectionPrioritiesForCorpTurn()` (called by the engine at turn
  start) and `_bestInstallOption()` (called from card code). Both now run
  under `_withSecurityCache()`, a one-call lifetime with the same rules.
  Uncached evaluations outside a decision fell to 21. A direct
  `_evaluateServerSecurity()` call from a card outside a decision still
  evaluates afresh (scenario 8).
- **Deviation 2: the key includes a public-board fingerprint**, as planned, so
  an unguarded board change still misses the cache. A test checks this.
- **Debug call.** `Phase_Main`'s protection-ranking call runs only when
  `debugSecurityLog` is on (default off). That alone cut seed 1 from 42 s to
  34 s.
- **Tests.** Seven new cases in `tests/corp-server-security.test.js` (132 in
  total):
  - the Bran with-ICE probe returns true with a warm cache, the cache matches
    the real board afterwards, and depth is back at 0 (scenario 3);
  - `_iceWouldSecureServer` gives the same answer with and without the cache
    (scenario 4);
  - fresh results across decisions, and through the fingerprint within one
    (scenario 2);
  - nested `_withHypothetical` neither reads nor writes the cache (scenario 5);
  - fresh results outside a decision (scenario 8);
  - verify mode throws on a stale entry;
  - the debug call is gated (scenario 6).

  The existing call-count cases (scenario 7), the corp decision fixtures and
  the decision snapshots are unchanged (scenario 1). `node tests/run-all-tests.js`:
  35 test files passed.

- **Review follow-up (2026-10-05):** the `Phase_Main` credit probe now restores
  `_hypotheticalDepth` and the saved credit pool in `finally`. A regression
  exercises successful and throwing probes at depth 0 and inside an existing
  hypothetical; it fails against the previous implementation. This covers the
  `Phase_Main` probe in scenario 4.
- **Not covered by a unit test:** the `_criticalBreachDefenseAction` probe
  (scenario 4), and hypotheticals started from Baker or `runcalculator.js`
  (scenario 5). The first carries the depth counter, and the other two change
  state only inside an evaluation that is already running, where nested
  evaluations bypass the cache. The game comparison below reports aggregate
  results, but does not establish that these paths ran.
- **Interim gate evidence (F4 is not built).** Using `node scripts/ai-game.js
--seeds 1-20` with Duel PD vs Tao and a `--setup` file that toggles the
  cache:
  - cache off against cache on with `_securityCacheVerify`: identical `logHash`
    on all 20 seeds, no engine errors, every game won, and verify never threw;
  - cache on (final code): identical `logHash` on all 20 again;
  - game time (8 in parallel): mean 58.4 s off, 27.1 s on, which is 2.16×
    overall (median 1.79×, range 1.24× to 3.07×; seed 7 went from 381 s to
    158 s);
  - evaluator calls in seed 1: 2,209, of which 508 were computed (110
    hypothetical, 21 outside a decision).
- **Left open:**
  - Historical at implementation: the F4 comparison and `evaluatorCallCount` collector waited for F4. F4 is now done; the completion entry below supersedes this blocker.
  - About half the remaining time is still in the evaluations that must run,
    where each ICE is repriced once per rez plan. That is proposed as F6
    ([F6-headless-ai-performance.md](../done/F6-headless-ai-performance.md)). With F3, a 2,400-game gate
    takes about 2¼ hours.
- Docs: [architecture: foundations](../../corp-ai/architecture.md#foundations)
  (cache and depth counter), the F2 ticket, and new roadmap item F6.

## Completion follow-up — 2026-10-09

Implemented from `44479ba` (uncommitted follow-up).

- Follow the previously approved F3 plan: complete the collector, deterministic
  scenarios and formal comparison without changing cache semantics or AI
  heuristics. Re-grounding corrected the obsolete F2/F4 and cache-lifetime
  claims above. No new risk plan is required for passive harness measurements
  and additional regression coverage.
- `evaluatorCallCount` observes per-Choice harness telemetry. It distinguishes
  requests from computations, filters main-phase command decisions, and rejects
  missing instrumentation. Instrumentation is confined to the headless harness;
  ordinary play incurs no added counting work.
- `security-cache-gate` checks exact decision-sequence and log identity,
  complete/error-free reports, at least 50% fewer computations per main decision,
  and the paired latency interval. Tests reject changed choices/logs, missing
  games, missing main decisions, quick runs, insufficient savings and slower
  decisions. Reports record cache mode and include it in their configuration key.
- Green decision fixtures run off/on/verify against unchanged expectations and
  compare both choices and logged reasons. F3 tests now exercise real nested
  `Choice()` lifetimes and exception restoration, a warmed main-phase credit
  probe, a real critical-defence ICE install with its logged reason and lower
  post-install risk, and warm-cache bypass through Baker and RC encounter
  wrappers. F2's existing throw/restoration cases also cover these wrappers.
- The old generic criterion demanding logged choices for every internal helper
  was clarified: internal cache helpers emit no choice or decision log; their
  deterministic oracle is the returned security result and restored state.
  Decision paths that do log reasons are checked for those reasons.
- Preliminary command:
  `node scripts/ai-batch.js security-cache-gate --quick --jobs 8 --out /tmp/chiriboga-f3-quick`.
  Both off and on arms hit the same Scrounge stalls (`zwicky-magdalene` seeds
  8 and 36). Seed 8 replay stalls immediately after playing Scrounge, matching
  [the existing engine ticket](../../bugs/scrounge-unaffordable-program-stalls-game.md).
  This is a prerequisite to an error-free acceptance run, not evidence of an
  F3 decision regression. All three arms finished with those two failures.
  On 348 completed pairs, mean computations/main decision were 35.482 off
  versus 8.364 on (76.4% reduction; paired difference -27.118,
  95% interval [-28.068, -26.206]); mean Corp decision latency was 11.175 ms
  versus 5.294 ms (difference -5.882 ms, interval [-6.357, -5.430]).
  Ordered decision digests and game-log hashes were identical on all 350
  seeds/pairs in all three arms, including both failures. The command ended
  `Gate: indicative only (--quick)`. No acceptance claim is made from this run.
- After the authorized Scrounge fix, repeated preliminary command:
  `node scripts/ai-batch.js security-cache-gate --quick --jobs 8 --out /tmp/chiriboga-f3-quick-fixed`.
  All 350 games in each arm completed without errors; all ordered decision
  digests and log hashes matched. Mean computations/main decision: 35.568
  off vs 8.387 on (difference -27.182, 95% interval [-28.128, -26.267]);
  Corp decision latency: 11.243 vs 5.058 ms (difference -6.185 ms,
  interval [-6.677, -5.721]). Ends `Gate: indicative only (--quick)`.
  The formal 200-seed-per-pair run below supersedes this indicative result.
- Focused tests pass: server security (143 cases), hypothetical guards (34),
  batch harness (23), green decision fixtures (45 checks across 15 boards),
  and snapshots (11). Final `node tests/run-all-tests.js`: all 74 test files
  pass (including the promoted Scrounge reproduction and its new resolution
  suite), with the required decision fixtures and snapshots included.

### Full F3 acceptance evidence — 2026-10-09

**Gate command:** `node scripts/ai-batch.js security-cache-gate --games 200 --jobs 8 --out /tmp/chiriboga-f3-gate`

- Same final working-tree source based on `44479ba` in all arms, including
  the Scrounge prerequisite fix; default strategic AI options throughout.
- Committed `tests/fixtures/ai-batch/deck-pool.json` (`core-v1`), all seven
  deck pairs (`pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`,
  `zwicky-magdalene`, `leo-topan`), paired seeds 1–200: 1,400 games per arm,
  4,200 executions total.
- Cache off: 1,400 games, zero failures, 429 s. Cache on: 1,400 games,
  zero failures, 309 s. Cache on with every hit verified: 1,400 games,
  zero failures, 475 s; no stale-result exception.
- Every paired ordered decision digest and game-log hash is identical in all
  three arms. No missing games or unmeasured main command decisions.
- Mean computations/main decision: **35.995 off → 8.475 on**, a **76.5%**
  reduction (requirement: at least 50%). Paired on-minus-off difference:
  **-27.520**, bootstrap 95% interval **[-27.991, -27.055]**.
- Mean Corp decision latency: **11.659 ms off → 5.553 ms on**, a **52.4%**
  reduction. Paired difference **-6.106 ms**, 95% interval
  **[-6.369, -5.861] ms**; the upper bound is below the required 0.
- Terminal result: **`Gate: passed`**. Raw F4 reports are retained locally as
  `/tmp/chiriboga-f3-gate/off.json`, `on.json`, and `verify.json`; the recorded
  command reproduces them. No timing baseline was reused.
- `node scripts/ticket.js check` passes, including the full 74-file suite.
  Its missing-reproduction-line warning reflects this existing performance
  feature having no pending bug reproduction; its deterministic green coverage
  and formal comparison are recorded above.
- No remaining implementation or acceptance work. The completion follow-up
  awaits independent review; the original cache's historical review below
  does not review these new collector/tests/comparison changes.

## Implementation plan

Proposed at `58f3a4d` (plus uncommitted D2 and F4 step 1), 2026-09-25. **Approved 2026-09-25.**

- **Validation:** the premise holds and is larger than the ticket says.
  Measured with `node scripts/ai-game.js --seed 1 --setup <counter>`:
  2,389 top-level `_evaluateServerSecurity()` calls in 133 Corp `Choice()`s
  (up to 156 in one). 2,053 (86%) repeat the same server on an identical board
  within the same `Choice()`, and only 110 run on a changed board. The
  evaluator takes 36 s of the 42 s game. The ticket's design is sound, but it
  depends on F2's depth counter, and F2 (11 migrations) is not done. F4 (the
  gate's batch run) is also not done.
- **Approach.** This does F3 plus the part of F2 it needs: the depth counter,
  but not F2's migrations or its ratchet test.
  - `this._hypotheticalDepth`, raised and lowered in `try/finally` by
    `_withHypothetical()` and by F2 sites #2, #3, #4, #5, #6, #7 and #8, all in
    `ai_corp.js`. Their restore logic is unchanged; migrating it stays F2's
    job.
  - The other sites are not bumped. #9 is dead code (F2 deletes it). #10
    (Baker) and #11 (`RunCalculator.IceAI`) change state only inside an
    evaluation already running, and the cache serves only outermost calls.
  - `Choice()` creates `this._securityCache` next to `_decisionRandomState`
    and restores the previous one in `finally`. Outside a `Choice()` there is
    no cache.
  - `_evaluateServerSecurity(server)` serves or stores a result only when a
    cache exists, `_hypotheticalDepth` is 0 and it is not nested inside
    another evaluation.
  - **Key:** the server plus a cheap public-board fingerprint (credits,
    clicks, tags, run/encounter state, each server's ICE and root cards with
    rez state and counters, and the Runner's rig). This departs from the
    ticket, which keys on the server alone. The fingerprint costs microseconds
    against about 15 ms per evaluation, and keeps a missed mutation site safe
    if it changes anything it covers.
  - A test-only check (`_securityCacheVerify`) recomputes every hit and
    throws on any difference.
  - The `Phase_Main` debug-only `_serverToProtect(false, true)` call runs
    only when AI logging is on.
- **Tests:**
  - New `tests/corp-security-cache.test.js`, covering the ticket's scenarios:
    - 2 and 8: fresh results across a board change and outside `Choice()`.
    - 3 and 4: the Bran-on-R&D probe and `_iceWouldSecureServer` still differ
      with a warm cache, and nothing is stored at depth above 0.
    - 5: a nested hypothetical bypasses the cache.
    - 6: the debug call is gated.
    - 7: the existing call-count guarantees still hold.
  - Scenario 1 and the gate: fixtures and decision snapshots unchanged, and
    `ai-game.js` with the cache off and on over 20 seeds must give identical
    `logHash` on every game, with the verify check on.
- **Risk:** a stale result served during an unguarded hypothetical would
  change a decision. It is mitigated by the depth bumps, the fingerprint key,
  the verify check and the logHash comparison. Callers do not write to the
  result object (checked with rg), so sharing it is safe.
- **Gate:** F4 is not built, so the F4 criterion stays unticked. The
  Resolution records the `ai-game.js` cache-off vs cache-on comparison
  (seeds, identical hashes, call counts, game times) as interim evidence.
- **Docs:** `corp-ai/architecture.md` (foundations: cache and depth), F2's
  ticket (the depth counter exists, and which sites have it), roadmap F3 to
  in-progress.

## Goal

Evaluate server security once per Corp decision instead of again in each
independent planning helper, and stop paying for debug-only evaluation in
ordinary play (review finding 11). The evaluator scans public credit sources,
bypass effects, breakers, hosted cards, defensive upgrades and every relevant
ICE. Its cost grows with board complexity and with planning sophistication.
The cache must never change a decision.

## Current behaviour

Re-grounded at `44479ba`, 2026-10-09. The original cache implementation is
already enabled; this follow-up finishes its measurement and coverage.

- `Choice()` creates a fresh `_securityCache` and restores the previous cache
  and `_decisionRandomState` in `finally`.
- `_evaluateServerSecurity()` caches only at hypothetical depth 0 outside a
  nested evaluation. Its key includes the server and `_securityBoardKey()`.
  `_evaluateServerSecurityUncached()` performs the work;
  `_securityCacheVerify` recomputes cache hits and rejects stale results.
- `_withSecurityCache()` supplies a one-call lifetime for turn-start protection
  priorities and card-facing install selection. Direct calls outside these
  lifetimes remain uncached.
- F2 is done. The shared `AIWithRunContext()` and `AIWithIceEncounter()`
  wrappers now raise the same hypothetical depth as `_withHypothetical()`;
  Baker and `RunCalculator.IceAI()` no longer rely only on evaluator nesting.
- F4 is done and supplies the passive collector extension point. F3's
  remaining acceptance run can use the committed pool and paired seeds.
- The main-phase debug protection ranking is gated by `debugSecurityLog`.
  Existing ranked-protection and best-remote local call-count guarantees remain.
- Decision-snapshot recording is opt-in. This performance change is an
  objective behaviour-preservation invariant, not a strategic preference.
  It needs no default-off strategic AI option, but its promised performance
  comparison remains mandatory for completion.

See [architecture: foundations](../../corp-ai/architecture.md#foundations).

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
- **Key.** The server object, evaluator options and the cheap public-board
  fingerprint described in the Resolution (credits, clicks, tags,
  run/encounter state, server ICE/root state and the Runner rig). The
  fingerprint forces a miss if public state changes within one `Choice()`;
  do not assume the board is immutable. Add a debug assertion (on in tests)
  that recomputes a sample of hits and compares.
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

Behaviour-identical performance change; no strategic option. Use F4's
committed `core-v1` pool, paired seeds 1–200 on all seven deck pairs, at the
same source code and default AI options. Run three arms: cache off, on, and
on with every cache hit verified. Never reuse timing reports for this command.

Collector: `evaluatorCallCount`. For each `Corp 2.2` command decision it counts
security requests and actual computations separately; calls outside `Choice()`
are excluded. Verify-mode recomputations count as work. The per-game mean of
computations per main decision is the gate metric, averaged over paired games.
Counting requests alone cannot demonstrate caching: the callers still request
the same results. Decisions that compute nothing remain in the denominator.

| Check | Evidence | Threshold |
|---|---|---|
| Identity | Ordered decision digest (side, phase, type, option labels, chosen index), plus full game-log hash | identical in all three arms for every game |
| Integrity | Complete pool, all games finish without errors, main command decisions measured | no missing or failed games |
| Performance | `evaluatorCallCount.computationsPerMainDecision` | candidate mean at most 50% of baseline |
| Latency | `decisionLatencyMs.corp.mean`, F4 paired bootstrap 95% interval of on minus off | upper bound at most 0 |
| Snapshots | Green decision fixtures and decision-snapshot tests | unchanged expectations; fixtures identical off/on/verify, including logged reasons |

**Gate command:** `node scripts/ai-batch.js security-cache-gate --games 200 --jobs 8 --out /tmp/chiriboga-f3-gate`

The dedicated behaviour-identical command reuses F4's workers, pool, seeds,
collector and paired-bootstrap comparison. The strategic `gate` command
requires changed games and is therefore unsuitable for F3. A `--quick` run
is diagnostic only and cannot pass. Failed games are not silently dropped.

## Things to consider

- This is not expected to fix a noticeable pause on ordinary boards. The gate
  is call count and latency.
- The cache pairs with L8.4 posture epochs, since both define decision
  lifetimes.
- Review findings 1 and 2 (evaluator correctness) have landed, so the cache
  stores the corrected evaluator.

## Acceptance criteria

- [x] Every test scenario above has deterministic coverage: choices and logged reasons where the decision path logs a reason; internal cache probes assert returned security results and state restoration.
- [x] Decision snapshots are identical to the recorded baseline except for listed, justified deltas (none expected).
- [x] The passive `evaluatorCallCount` collector and fail-closed behaviour-identical comparison command are built and tested.
- [x] The `evaluatorCallCount` collector is added through F4's collector extension point, and the F4 cache-off versus cache-on comparison (command, deck pairs, seeds, results) is recorded in the Resolution.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`. (None: no card-facing hook changed.)
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.

## Code review — 2026-09-25

**Verdict:** Pass
**Reviewed:** `58f3a4d..cd95844` (commit `cd95844`, "F3: cache server-security results for one Corp decision")

### Findings

1. **Note** — `ai_corp.js`, sites #10 (Baker, `sets/vantagepoint.js`) and #11 (`RunCalculator.IceAI`): not bumping `_hypotheticalDepth` here relies on these mutations always happening nested inside an already-running `_evaluateServerSecurity()` call (protected instead by the `_securityEvaluating` nesting guard). That's plausible from the code shape but isn't traced by a unit test — matches the Resolution's own "not covered by a unit test" admission for scenario 5. The full-game verify-mode evidence (no throw across a real game, cache-off/on logHash identical) is reasonably strong indirect support, but it's still empirical rather than proven.
2. **Note** — the ticket's header line `**Verified against code:** 376f32c` is stale — that commit predates F3 entirely and doesn't correspond to what was actually reviewed (HEAD `cd95844`, built from `58f3a4d`). Worth fixing so future readers aren't misled.

### Checks performed

- `node scripts/ticket.js check`: WARN/FAIL — 2 of 35 test files fail (`flipped-identity.test.js`, `vantagepoint-integration.test.js`) on a missing local card-art image asset. Confirmed both fail identically on the pre-F3 base commit `58f3a4d`, so this is a pre-existing environment issue (missing image file), not a regression from this change. All other files pass, including the expanded `tests/corp-server-security.test.js` (132 cases, run standalone: all pass).
- Traced all 8 `_hypotheticalDepth` insertion points (`_withHypothetical`, `_effectiveIceSubtypes`, `_effectiveRunnerCreditPool`, both blocks in `_icePreventsGameWinningBreach`/`_iceWouldSecureServer`, `_criticalBreachDefenseAction`, `_potentialTagPunishment`, `Phase_Main`'s "gain then install" check) by function boundary — matches the Resolution's list exactly.
- Confirmed `_bestInstallOption` and `_prepareProtectionPrioritiesForCorpTurn` are genuinely called outside `Choice()` (`phase.js` at turn start; `sets/systemgateway.js`, `sets/systemupdate2021.js`, `sets/vantagepoint.js` card hooks) — supports the "two more cache lifetimes" deviation.
- Independently reran the interim gate evidence for seed 1 (`node scripts/ai-game.js --seed 1`, Duel PD vs Tao): identical `logHash` (`7fd342dbe6a8`) with the cache on (21.8s), off (46.9s), and on with `_securityCacheVerify` (48.7s, no throw) — a 2.15× speedup, consistent with the Resolution's claimed 2.16× mean across 20 seeds.
- Confirmed `documentation/corp-ai/architecture.md` and the F2 ticket's update note accurately describe the shipped mechanism.
- Confirmed the commit is scoped to F3 alone — the "Changed since 58f3a4d" diff mixes in D2 and F4-step-1 (separate, already-landed commits), which the Resolution correctly attributes to tree state rather than claiming as its own.
- Verified `Counters()` helper used in `_securityBoardKey()` exists; verified `_evaluateServerSecurityUncached()` has no internal recursive call to `_evaluateServerSecurity()` (the `_securityEvaluating` nesting guard is defensive, not covering a known live recursion path).
