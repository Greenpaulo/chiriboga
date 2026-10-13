# Corp decision latency increases approximately 33% after L9.1

## Implementation status

**Parked at the owner's request, 2026-10-13.** Browser play has no noticeable
slowdown according to the owner. The measured overhead is in shared AI code;
it has not been established as exclusive to the batch runner. No further
implementation or benchmarking is authorized by this parking decision. The
ticket remains open and the experimental changes remain uncommitted.

2026-10-13: the owner clarified that the actual goal is recovery of batch runtime
that rose from roughly 180s to roughly 330s. A small partial reduction does not
resolve this ticket. The old criterion accepting any repeatable decrease was
not the owner's agreed success threshold and must not be used to close it.
The approved activation-observation cache is an intermediate
candidate, not a completed repair. Keep the ticket open and investigate the
remaining L9.1 computation before proposing hand-off. Merely documenting the
remaining regression in a Resolution is not an acceptable substitute for fixing
it.

The owner's first two completed 1,000-game beginner comparisons retain all
decisions and outcomes. Corp mean is 7.743 to 7.409ms, difference -0.334ms
[-0.397, -0.272], in forward order; 7.729 to 7.390ms, difference -0.339ms
[-0.392, -0.285], in reverse order. Elapsed time is 257.512 to 250.341s and
256.176 to 249.102s. These demonstrate approximately 4.3% lower mean latency
and 2.8% lower elapsed time, but do not establish recovery of the L9.1
regression. The approximately -5ms differences are the Corp maximum-latency
metric, not the mean or a percentage. Completed comparison outputs are
`/tmp/chiriboga-l91-full-beginner-forward-comparison.txt` and
`/tmp/chiriboga-l91-full-beginner-reverse-comparison.txt`; source report code
hashes are `0a2dd753c155727c` (baseline) and `08c51555e9fe75a7` (candidate).

The early agent timing comparisons without `node20` in their report names are
invalid performance evidence: the temporary baseline shell selected Node
23.4.0, while the repository selected Node 20.19.0. Subsequent agent and owner
commands pin `/Users/paulbingham/.nvm/versions/node/v20.19.0/bin/node` for both
builds. Their exact decision/log comparisons remain useful. Pause profiling
and regression tests while the owner's performance runs are active.

The saved 182.848s reference is
`bench/archived-current/2026-10-12T17-11-58-680Z-8a5b04a.json`: beginner,
1,000 games, command `node scripts/ai-batch.js --pool documentation/corp-ai-regression/assets/beginner-pool.json --seeds 1-200 --out bench/baseline.json`.
The same commit's saved Startup report is 225.517s. The current owner's
forward full runs are beginner 257.512s and Startup 338.367s. These saved
reports establish concrete historical references; do not compare the old
beginner elapsed time directly with the new Startup elapsed time. The archived
commands do not pin workers or record Node version, and the old builds precede
adopted L8.5 feedback. Establish those controls when re-running the historical
reference; this is a measurement requirement, not a reason to accept a small
partial fix.

All four owner comparisons completed on Node 20.19.0. The candidate preserves
all decision/log hashes, winners, reasons, points and game lengths in every
1,000-game comparison. Startup forward elapsed time is 338.367 to 313.327s,
with Corp mean 7.003 to 6.109ms (difference -0.893ms, interval
[-0.985, -0.804]). Startup reverse elapsed time is 297.556 to 302.318s,
with Corp mean 6.203 to 5.873ms (difference -0.330ms, interval
[-0.389, -0.273]). In that reverse run Runner mean rises 0.738 to 0.790ms,
p95 2.901 to 3.004ms and max 47.128 to 54.568ms, with intervals excluding
zero. Thus the candidate does not even establish lower elapsed time in both
Startup orders; the Runner timing regression is unresolved. No adoption or
handoff is warranted. Full outputs are
`/tmp/chiriboga-l91-full-startup-forward-comparison.txt` and
`/tmp/chiriboga-l91-full-startup-reverse-comparison.txt`, with source report
code hashes `7148ce83517e981b` (baseline) and `418fb6e65b45d65f` (candidate).
The pasted owner output is also retained at
`/Users/paulbingham/.codex/attachments/3b57b2dc-310f-41e6-b843-6ac05cb2f654/Pasted text.txt`.

### Resume checkpoint

- Completed experiments in `ai_corp.js`: count-independent activation-model
  caching, complete matching/ability caches within the evaluation context, and
  fresh descriptor arrays with restoration of symbols and non-enumerable keys.
  These preserve the correctness guards; measured recovery is insufficient.
- Current green tests: `tests/l91-count-independent-pricing.test.js` (2 cases),
  `tests/l91-activation-cache.test.js` (12),
  `tests/l91-repeated-breaker-matching.test.js` (4), and
  `tests/l91-matching-cache.test.js` (3). Last full suite: 92 files passed,
  including Corp decision fixtures and decision snapshots. The original
  count-independent reproduction was promoted byte-for-byte; matching
  assertions are unchanged, with its harness corrected to load real helpers.
- Next proposal is the **unapproved** optional modifier-list argument described
  below. `checks.js` and `runcalculator.js` have not been changed. Its pending
  reproduction has one failing case and two passing controls. Resume from this
  proposal rather than repeating the completed diagnosis; obtain approval
  before implementing the shared-helper change.
- Frozen local sources: `/tmp/chiriboga-l91-baseline-4106086` is the original
  post-L8.5 behavioural oracle; `/tmp/chiriboga-l91-candidate-4106086` is the
  activation-only candidate used for the owner's full comparisons;
  `/tmp/chiriboga-l91-recovery-candidate-4106086` is the refined matching/array
  candidate; `/tmp/chiriboga-l91-historical-8a5b04a` is the historical reference.
  Pin the absolute Node 20 executable above and run measurements sequentially
  with 8 workers. Do not overwrite the activation-only candidate when resuming.
- Findings, measured results, rejected approaches and next-step reasoning are
  recorded in this ticket. Raw local profiles, reports and diagnostic scripts
  named here are temporary artifacts, not repository archives; if they are
  removed, the recorded conclusions remain, but fresh validation measurements
  may be needed. No further full owner batch is warranted until smaller runs
  support substantial recovery.

## Implementation plan

Extended at `4106086`, 2026-10-13. **Awaiting approval.**

- **Validation:** The previously approved matching and descriptor-array repair
  is implemented and passes all 92 green test files, including Corp decision
  fixtures and decision snapshots. The matching reproduction passes unchanged
  (only its harness now loads the existing hypothetical helpers), and the
  ticket checker's assertion comparator confirms that its assertions did not
  change. Added variations exercise complete/copy-safe lists, real Magnet
  suppression, nested boards, symbols, non-enumerable keys and throwing probes.
  The guard still captures every descriptor freshly and uses key-order checks
  to avoid allocating hash sets for unchanged objects.
- **Current performance:** On Node 20.19.0, 8 workers, beginner seeds 1–20,
  the original post-L8.5 baseline takes 29.242s with Corp mean 8.807ms. The
  initial array candidate takes 28.077s with mean 7.962ms and identical hashes.
  Refining arrays takes 27.238s with mean 7.575ms. Historical `8a5b04a`
  takes 24.996s/6.699ms before these trials and 24.642s/6.487ms after them.
  The historical build has different L8.5 policy/workloads and is not the
  behavioural oracle, but these controls still show material runtime recovery
  remains unfinished. Do not hand off or call the ticket resolved.
- **Remaining waste and reproduction:** `CheckHasAbilities()` calls
  `ChoicesActiveTriggers("modifyHasAbilities")` on every invocation. Matching
  and calculator initialization call it once per card on an unchanged board,
  rediscovering the same list repeatedly. All located production call sites
  use the existing single argument. `tests/pending/l91-ability-trigger-discovery.test.js`
  demonstrates four discoveries instead of one for a three-card batch; the
  default-fresh-call and callback-receiver/order controls pass. This is another
  objective work-count oracle, not a strategic preference.
- **Approach:** Add an optional precomputed modifier-list argument to
  `CheckHasAbilities()` in `checks.js`. Existing one-argument calls must retain
  exactly their fresh-discovery behaviour. The predicate, callback receiver,
  ordering and early rejection remain engine-owned and unchanged. Pass a fresh
  list within matching's existing board/depth context and the synchronous
  initialization loops of `_securityRunCalculator()` in `ai_corp.js` and
  `CalculatePieceBegin()` in `runcalculator.js`. The run calculator collects its
  list after ICE analysis, immediately before filtering active cards; do not
  retain it across pathfinding stages or asynchronous yields. No global cache,
  new card hook, heuristic adjustment, snapshot bypass or stale-board reuse.
- **Tests:** Promote the new discovery reproduction unchanged. Verify default
  callers still observe activation/hosting changes, supplied lists retain
  predicate semantics, and matching/calculator loops collect once per stable
  scope. Exercise real Magnet, nested contexts, private Corp calculator
  ownership, hidden-information boundaries and both Runner and Corp routes.
  Run focused tests before `node tests/run-all-tests.js` again.
- **Risk and docs:** This extends a shared engine helper, so it needs approval
  beyond the previous plan, which explicitly avoided engine-function changes.
  Document the optional argument and its stable-board lifetime in the helper's
  API comment and architecture. Explicitly preserve ordinary one-argument
  callers; no card-hook contract or `ai.md` change is proposed. Three source
  files are involved: `checks.js`, `ai_corp.js` and `runcalculator.js`.
- **Performance acceptance:** Re-profile and repeat controlled small batches
  for both pools and orders. Continue toward pre-regression batch performance;
  neither the implemented improvements nor this proposed step automatically
  satisfy that goal. Request new owner 1,000-game comparisons only when the
  smaller evidence supports runtime recovery, rather than another small partial
  improvement. Use post-L8.5 main with adopted options as the behavioural oracle
  and matched historical runs as the performance reference.

Performance reports for this stage are
`/tmp/chiriboga-l91-recovery-beginner-{historical,baseline,candidate}-a.json`
and `/tmp/chiriboga-l91-recovery-beginner-{historical,candidate}-b.json`.
The initial array candidate's unchanged replay/profile is in
`/tmp/chiriboga-l91-recovery-profile/` (approximately 1,220ms security,
439ms guard and 235ms matching). These are partial-investigation results.

## Previous approved plan — matching and descriptor arrays

Revised at `4106086`, 2026-10-13, after the owner's full comparisons and
clarification of the required runtime recovery. **Approved 2026-10-13.**

- **Validation:** The activation-cache candidate is not sufficient. All four
  owner comparisons retain exact gameplay hashes, but Startup reverse elapsed
  time and Runner latency regress. Same-Node CPU profiles of `btl-kit`, seed 3,
  at `3803c98` and the candidate retain the exact 21-turn game and log hash
  `55e2f0a0dbae`. Sampled security evaluation is approximately 858ms before
  L9.1 and 1,546ms on the candidate. The current state guard accounts for
  approximately 486ms, including 132ms descriptor snapshotting and 196ms
  restoration. The additional matching passes in `_breakerLayerPrices()`
  account for approximately 246ms outside the preferred-breaker search.
  Instrumentation counts 3,348 matching calls, 2,169 repeated ICE/context
  calls, and 43,235 public ability checks within the repeats. The new pending
  reproduction below fails three resource-work assertions for this waste;
  its fresh-context/uncached-state control passes. The only current card
  `modifyHasAbilities` implementation is Magnet's public hosted-program check;
  availability during matching is a public-board fact, not a break-count fact.
- **Classification:** Still an objective performance repair: preserve prices,
  legality, public state, information boundaries and decisions. No strategic
  preference, heuristic adjustment, new card hook or AI option.
- **Approach:** Address both substantial remaining costs in `ai_corp.js`.
  Cache the complete matching list, including empty results, per ICE in the
  existing security evaluation context; preserve every alternative and return
  defensive array copies. Cache public ability availability only for the
  matching pass, per card in that same board context. Do not change or globally
  memoize `CheckHasAbilities()`; use fresh records across hypothetical/context
  changes. Replace the guard's descriptor dictionaries with fresh per-object
  own-key/descriptor arrays, and restore each saved descriptor directly. Capture
  both players, the breaker, target ICE and all active cards on every actual
  probe. Use all own keys, including symbols and non-enumerable properties,
  when removing fields introduced by hooks. Preserve flags, accessors, values,
  run globals and exception handling. No snapshot reuse across probes or boards.
- **Implementation evidence:** A standalone, rotated-order microbenchmark of
  22 representative public objects and 519 properties from the real game
  measures approximately 232ms per 1,000 native dictionary snapshot/restores,
  versus 140ms for key/descriptor arrays. Individual property restoration with
  the original dictionaries is only about 225ms; a compact ordinary-property
  variant is about 148ms. Prefer the simpler arrays over these alternatives.
  This is only evidence for choosing an experiment: it is not game-level
  performance acceptance and does not establish recovery of the regression.
- **Tests:** Promote `tests/pending/l91-repeated-breaker-matching.test.js`
  unchanged after it passes. Extend focused coverage for preferred versus full
  matching lists, empty results, returned-list mutation, public ability changes,
  actual Magnet hosting and fresh/nested hypothetical contexts. Exercise the
  new guard on normal and throwing probes with deleted or changed properties,
  added non-enumerable and symbol properties, getters that must not run,
  property flags and signed zero, both in individual pricing and the full-route
  calculator caller. Keep existing gameplay expectations unchanged. Repeat
  focused pricing, Sang/Principia, counters/clicks, security-cache and
  hypothetical checks, then `node tests/run-all-tests.js`.
- **Performance and completion:** Use controlled sequential comparisons with
  the explicit Node 20 binary, identical workers/pools/seeds/options and both
  execution orders. Re-profile after each change to verify that the identified
  costs actually disappear. Re-run historical builds with the matching settings
  to establish comparable pre-regression references; the saved beginner and
  Startup references are 182.848s and 225.517s respectively. Keep adopted L8.5
  options on for post-L8.5 baseline/candidate behavioural acceptance; isolate
  their effect separately when comparing older builds without that feature.
  Require the owner's repeated 1,000-game evidence for both pools. These two
  optimizations do not automatically complete the ticket: if material runtime
  regression remains, continue the investigation and revise the design before
  hand-off. Do not substitute a statistically significant small decrease for
  recovery of the pre-regression batch performance.
- **Risk:** Matching/availability caches must not survive a changed public
  board, lose alternative breakers or suppress fresh observations in nested
  hypotheticals. The guard still takes every descriptor freshly; the array
  representation must preserve restoration after throws without reading
  getters. Both guard consumers must be exercised. No engine function, global
  cache, synchronous contract or AI hook contract changes are proposed.
- **Docs:** Update the server-security architecture section with the matching
  cache lifetime and descriptor representation only after implementation;
  retain the complete intermediate owner evidence and exact build/report
  identifiers here. No card-hook contract change requires an `ai.md` update.

**New reproduction:** `tests/pending/l91-repeated-breaker-matching.test.js` —
`node tests/pending/l91-repeated-breaker-matching.test.js` (three failures at
`4106086` plus the activation-cache candidate, 2026-10-13; one control passes).
The current green suite passes all 92 test files, including Corp decision
fixtures and decision snapshots. Production changes for this revised plan
have now been implemented; their performance is insufficient for closure, as
recorded in the active extended plan above.

Local investigation artifacts: profiles and identical replay logs in
`/tmp/chiriboga-l91-followup-current/` and
`/tmp/chiriboga-l91-followup-pre/`; summary utility
`/tmp/chiriboga-l91-profile-summary.js`; count/schema instrumentation and output
`/tmp/chiriboga-l91-followup-counts.js` and
`/tmp/chiriboga-l91-followup-counts.json`; representation experiment
`/tmp/chiriboga-l91-descriptor-benchmark.js`. These are diagnostic tools, not
regression-suite or full-pool acceptance evidence.

## Previous approved plan — activation cache

Proposed at `4106086`, 2026-10-13. **Approved 2026-10-13.**

- **Validation:** Clean post-L8.5 starting worktree. A fresh CPU profile of
  beginner `btl-kit`, seed 3, retains the 21-turn game and log hash
  `55e2f0a0dbae`. Inclusive sampled time is approximately 1,486ms in
  `_evaluateServerSecurity()`, 522ms in `_withBreakerPricingState()` and 99ms
  in `_probeBreakerPrice()`; guard snapshotting accounts for approximately
  154ms and restoration 245ms. Separate instrumentation of that same seeded
  game counts 1,613 guarded standard probes, including 301 repeated probes
  for the same evaluation context, ICE and breaker at another count. The
  pending deterministic test below fails because the standard hook executes
  twice for identical activation inputs. Its count-bearing-hook control passes.
  This independently confirms both guard overhead and a narrower source of
  avoidable work; it does not establish an overall speedup. Existing L9.1
  pricing tests pass all 44 cases; `node tests/run-all-tests.js` passes all
  88 test files, including Corp decision fixtures and decision snapshots.
  Profile command: `node --cpu-prof --cpu-prof-dir=/tmp/chiriboga-l91-4106086-profiles scripts/ai-batch.js replay --pool documentation/corp-ai-regression/assets/beginner-pool.json --pairs btl-kit --seeds 3`.
  Local counting setup: `/tmp/chiriboga-l91-probe-counts.js`, passed to
  `playGame()` with `streamPrefix: "3:btl-kit"` and the beginner pool's sets
  and `btl-kit` deck files; it wraps the guard and standard probe, tracking
  repeated ICE/breaker identities in a WeakMap keyed by evaluation context.
- **Classification:** Objective, behaviour-preserving optimization. The oracle
  is identical structured prices, routes, public state and decisions. There is
  no strategic preference or new AI option. Standard `AIImplementBreaker`
  receives no requested subroutine count: only the interceptor's arithmetic
  uses it. By contrast `AIBreakCost` receives the count and cannot share this
  optimization. Existing per-context price/strength/ICE-analysis caches already
  establish the evaluation lifetime; do not extend it.
- **Approach:** Capture the standard hook's validated activation observations
  (pump cost and break cost/amount, including multiple alternatives) once per
  ICE/breaker in `_securityEvaluationContext()`. Derive the minimum exact price
  for each requested count from those observations, retaining invalid/incapable/
  unknown classification and full-calculator witness metadata. Change
  `_probeBreakerPrice()`, `_computeBreakerPrice()` and the context initialization
  in `ai_corp.js`; retain `_breakerPrice()`'s count-specific result cache and
  numeric compatibility consumers. Publish reusable observations only after
  the guarded probe restores successfully; thrown probes must remain unknown
  and retry normally. No reuse without an evaluation context; no reuse for
  count-bearing `AIBreakCost`, text fallback or the full route calculator.
  Keep the complete descriptor/encounter guard for each actual hook invocation.
  Reject cross-probe snapshot reuse: intervening hooks and nested hypothetical
  boards make that lifetime harder to prove. Do not revive the withdrawn
  compare-before-restoring experiment.
- **Tests:** Promote `tests/pending/l91-count-independent-pricing.test.js`
  unchanged after it passes. Add variations for several activation alternatives,
  pump gaps, non-unit break amounts, malformed and throwing declarations,
  full-route witness metadata, and fresh/nested hypothetical contexts seeing
  their own board. Verify descriptors, getters, counters, clicks and run globals
  still restore on normal/throwing probes. Run focused L9.1, Sang/Principia,
  hypothetical and security-cache tests, followed by `node tests/run-all-tests.js`
  including Corp decision fixtures and decision snapshots.
- **Risk:** Count-independent observations must not retain mutable calculator
  points or become a cache across boards. Existing hooks must remain read-only
  and deterministic, as required by principle 3; no hook-contract changes.
  Multiple activation alternatives must be minimized independently for every
  count rather than scaling one previously cheapest quote. The measured waste
  is 18.7% of this game's guarded probes; remaining snapshot/restoration and
  first-probe costs remain. Small repeated beginner and Startup batches in both
  orders will check exact hashes and practical speed before requesting the
  owner's required 1,000-game comparisons. No performance acceptance criterion
  will be ticked from this profile or a work-count test alone. Keep the ticket
  open until the required repeated full comparisons meet its criteria.
- **Docs:** Update the unknown-breaker-prices section of
  [Corp architecture](../corp-ai/architecture.md#server-security-evaluation)
  with the limited activation-observation cache and its lifetime, and record
  exact commands, options, reports and results here. No card hook is added or
  changed, so `documentation/ai.md` requires no contract update. No roadmap
  item links this ticket.

**Priority:** Address after the reviewed L8.5 merge, before further shared Corp evaluator changes.
**Scope:** Behaviour-preserving performance repair; retain the Sang/Principia and L9.1 correctness fixes.
**Verified against code:** 4106086 (2026-10-13); historical timing evidence compares 3803c98 and 7d208b4; post-L8.5 profiling and duplicate-probe reproduction below.
**Reproduction:** `tests/pending/l91-count-independent-pricing.test.js` — `node tests/pending/l91-count-independent-pricing.test.js` (fails at `4106086`, 2026-10-13: standard activation hook called twice instead of once; count-bearing-hook control passes). Owner-run 1,000-game paired beginner benchmark below supplies historical latency evidence. No wall-time assertion has been added to the regression suite.
**Related:** [Investigation and rejected optimization](../plans/2026-10-13-l91-pricing-latency.md), [L9.1](../backlog/done/L9.1-unpriceable-breakers.md), [Sang/Principia fix](done/sang-kancil-and-principia-priced-as-unbreakable.md).

## Problem

[Verified] L9.1 adds substantial Corp computation without changing any choices
in the measured beginner pool. The owner observed full batch runtimes rising
from approximately 180 to 262 seconds. Alternating historical main
`8a5b04a` and current main `7d208b4` yielded 217/222 and 255/248 seconds:
averages 219.5 and 251.5 seconds, respectively. Machine conditions account for
some historical timing drift, but the contemporary gap remains about 15%.

The narrower full benchmark compares `3803c98` (Sang/Principia hooks already
fixed, before L9.1) with `7d208b4` (L9.1 merged). It reports 1,000 paired
games and **zero changed decisions**, with these per-game timing aggregates:

| Metric (ms) | Before L9.1 | Main | Difference | Bootstrap 95% interval |
| --- | ---: | ---: | ---: | --- |
| Corp mean | 5.968 | 7.921 | +1.953 | [+1.810, +2.106] |
| Corp p95 | 28.236 | 38.383 | +10.147 | [+9.073, +11.342] |
| Corp max | 62.717 | 89.529 | +26.811 | [+24.257, +29.347] |
| Runner mean | 0.560 | 0.581 | +0.021 | [+0.017, +0.026] |
| Runner p95 | 2.897 | 3.001 | +0.104 | [+0.077, +0.131] |
| Runner max | 31.089 | 31.945 | +0.856 | [-0.126, +1.857] |

Corp mean increases approximately 32.7%, p95 35.9%, and max 42.7%; Runner
mean increases approximately 3.8%. Game length (14.978), points scored
(3.926), points stolen (5.756), win rate (0.403), both mulligan rates and
every server-specific stolen-points metric are identical. This comparison
does not supply wall-time summaries, and its bootstrap intervals do not
control for machine load between runs.

## Reproduce

From the main repository, create the historical builds if not already present:

```sh
git worktree add --detach /tmp/chiriboga-timing-pre-l91 3803c98
git worktree add --detach /tmp/chiriboga-timing-main 7d208b4
```

Run sequentially with similar background activity, using the same Node version:

```sh
for build in pre-l91 main; do
  (
    cd "/tmp/chiriboga-timing-$build"
    node scripts/ai-batch.js \
      --pool documentation/corp-ai-regression/assets/beginner-pool.json \
      --seeds 1-200 --jobs 8 \
      --out "/tmp/chiriboga-timing-$build.json"
  )
done
node scripts/ai-batch.js --compare \
  /tmp/chiriboga-timing-pre-l91.json /tmp/chiriboga-timing-main.json
```

The owner ran this comparison and supplied the table above on 2026-10-13.
Plain batches play fresh games, rather than reusing gate report caches.

For fix acceptance, compare a clean post-L8.5 main build with the optimized
build, keeping all options (including adopted feedback), pools, seeds,
collectors, Node version and worker counts identical. Historical pre-L9.1
results diagnose the regression; they are not the fix's behavioural baseline.
Preserve reports before and after any `post-merge.js` baseline refresh.
Have the owner run any needed 1,000-game comparisons.

## Current diagnosis

[Verified] `3803c98` contains the Sang card-hook fix; `e33a91b` subsequently
introduces the L9.1 evaluator changes. `6d7fac6` adjusts unknown-price bypass
ranking; `7d208b4` merges that work. Attribution specifically to Sang was wrong.

[Verified] `_computeBreakerPrice()` calls `_withBreakerPricingState()` for
each uncached price. The guard collects both players, the breaker, target ICE
and every active card; takes all own-property descriptors; and redefines
every saved property when restoring. `_breakerPrice()` caches completed
prices within an evaluation context, but each distinct uncached price still
pays this guard cost.

[Verified] A Node CPU profile of beginner `btl-kit`, seed 3, measures about
564ms in `_withBreakerPricingState()`: approximately 156ms in descriptor
snapshotting and 235ms in restoration, versus 148ms in the enclosed price
probe. The 21-turn game has an identical log before L9.1 and on current main.
Sampled `_evaluateServerSecurity()` time rises from about 851 to 1569ms.

[Inferred] The state guard accounts for much of this game's added work, and
is the first optimization target. A single sampled game does not isolate all
L9.1 costs or prove that the whole pool shares its distribution. Profile the
post-L8.5 baseline before choosing an implementation.

## Rejected approach

An experiment compared every saved descriptor and redefined only changed
properties. Its first profile looked cheaper, but controlled 25-game runs
were 37.116s on main, 38.658s on the candidate, and 36.287s on main again.
All decisions/logs remained identical; validation passed all 83 test files on
pre-L8.5 main, plus 44 focused pricing cases. The experiment was withdrawn,
including its extra tests. Do not adopt
this approach based solely on a microbenchmark or one CPU profile.

## Constraints and implementation planning

- Preserve structured priced/unknown/incapable results, resource and counter
  budgets, click/native mixed routes, and supported full-calculator witnesses.
- Preserve public payment/card descriptors and encounter/run globals after
  normal and throwing probes. Do not invoke getters merely to snapshot state.
- Preserve private Corp calculator ownership and the information boundary.
- Preserve hypothetical-depth bookkeeping and security-cache bypass rules.
- No correctness rollback, heuristic tuning, card-title exceptions, or
  weakened expectations to recover speed.
- Investigate reducing repeated snapshot work within a single evaluation or
  eliminating duplicate probes only after proving the lifetime is safe across
  nested/hypothetical state changes and state-dependent hooks. Reusing a stale
  snapshot can silently restore the wrong board.
- Before implementation, derive a focused deterministic work-count reproduction
  for the validated waste, with state-restoration counterexamples. Avoid flaky
  wall-time assertions in CI and tests that merely prescribe one algorithm.
- Follow the implement-ticket plan gate for the shared evaluator repair.

## Acceptance gate

N/A — deterministic fix (principle 4): the optimization must preserve prices,
legal routes, public state, information boundaries and decisions exactly.
It introduces no strategic preference or new AI option. Separate repeated
performance comparisons below are required; absence of an F4 strategic gate
does not waive performance evidence.

## Acceptance criteria

- [ ] Recover the batch runtime regression reported by the owner (roughly
  180s before, roughly 330s now), targeting the pre-regression runtime range.
  Establish the exact reference build and benchmark command and validate
  recovery with matched pool, seeds, worker count and Node version, controlling
  for subsequent code/options. Retain post-L8.5 main as the behavioural oracle.
  A small statistically significant reduction is not a sufficient result.
- [ ] Profiling and a focused deterministic reproduction identify the waste
  eliminated by the selected implementation; any pending reproduction passes
  unchanged and is promoted into the green suite.
- [ ] State restoration, throwing/malformed hooks, nested hypothetical probes,
  cache modes, counters/clicks and Sang/Principia correctness tests pass.
- [ ] Identical-option before/after 1,000-game beginner and Startup comparisons
  retain all decision and log hashes, outcomes and game lengths.
- [ ] Repeated runs in both orders demonstrate recovery against the
  pre-regression runtime reference, as well as lower Corp mean latency and
  batch elapsed time against post-L8.5 main. Record mean/p95/max for both sides,
  elapsed time and bootstrap intervals. A negative Corp-mean difference whose
  95% interval excludes zero is a necessary check, not the success threshold
  for resolving the runtime regression. Explain any tail-latency increase.
- [ ] The full regression suite passes, including Corp decision fixtures and
  decision snapshots, without changing existing gameplay expectations.
- [ ] The Resolution records the exact baseline/candidate commits, options,
  commands, reports, performance results and remaining costs.
