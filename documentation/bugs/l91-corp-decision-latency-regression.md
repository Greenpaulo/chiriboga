# Corp decision latency increases approximately 33% after L9.1

**Priority:** Address after the reviewed L8.5 merge, before further shared Corp evaluator changes.
**Scope:** Behaviour-preserving performance repair; retain the Sang/Principia and L9.1 correctness fixes.
**Verified against code:** b77fc47 (2026-10-13); timing evidence compares 3803c98 and 7d208b4.
**Reproduction:** Owner-run 1,000-game paired beginner benchmark below. This is a measured latency reproduction, not a pending gameplay fixture. No timing assertion has been added to the regression suite.
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

- [ ] Profiling and a focused deterministic reproduction identify the waste
  eliminated by the selected implementation; any pending reproduction passes
  unchanged and is promoted into the green suite.
- [ ] State restoration, throwing/malformed hooks, nested hypothetical probes,
  cache modes, counters/clicks and Sang/Principia correctness tests pass.
- [ ] Identical-option before/after 1,000-game beginner and Startup comparisons
  retain all decision and log hashes, outcomes and game lengths.
- [ ] Repeated runs in both orders show lower Corp mean latency and lower batch
  elapsed time; record mean/p95/max for both sides, elapsed time and bootstrap
  intervals. A negative Corp-mean difference whose 95% interval excludes zero
  must be reproduced across run orders; explain any tail-latency increase.
- [ ] The full regression suite passes, including Corp decision fixtures and
  decision snapshots, without changing existing gameplay expectations.
- [ ] The Resolution records the exact baseline/candidate commits, options,
  commands, reports, performance results and remaining costs.
