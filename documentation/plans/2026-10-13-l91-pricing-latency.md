# L9.1 pricing latency investigation

Starting commit: `7d208b4`, 2026-10-13.

## Commit boundary

- `8a5b04a`: post-L8.4 main; archived beginner baseline 182.848 seconds.
- `3803c98`: Sang Kancil/Principia hooks already fixed; no L9.1 evaluator changes.
- `e33a91b`: L9.1 structured pricing, route planning and pricing-state guard.
- `6d7fac6`: unknown-price handling in one-shot bypass ranking.
- `7d208b4`: merged main; recorded beginner baseline 243.834 seconds.

The owner's alternating beginner runs of `8a5b04a` and `7d208b4` averaged
219.5 and 251.5 seconds respectively. Those indicate an approximately 15%
increase under similar contemporary machine conditions. The supplied Startup
comparison against `3803c98` isolates changes after the Sang hook fix: Corp
mean decision latency rose from 4.079 to 5.458ms, with practically unchanged
game length. Attribution specifically to Sang was incorrect.

## Focused profiling

Profiled a real headless batch replay with Node's CPU profiler:

```sh
node --cpu-prof --cpu-prof-dir=/tmp/chiriboga-latency-profiles \
  scripts/ai-batch.js replay \
  --pool documentation/corp-ai-regression/assets/beginner-pool.json \
  --pairs btl-kit --seeds 3
```

The same game has an identical log at `3803c98`, unmodified `7d208b4` and
the candidate. Approximate inclusive sample times, in milliseconds:

| Function | Before L9.1 | Current main | Initial draft |
| --- | ---: | ---: | ---: |
| `_evaluateServerSecurity` | 851 | 1569 | 1521 |
| `_withBreakerPricingState` | absent | 564 | 478 |
| `_probeBreakerPrice` | absent | 148 | 123 |

The current-main pricing guard spent approximately 156ms snapshotting object
descriptors and 235ms restoring them, outside the price probe itself. It
snapshots every active card and both players for every uncached breaker price.
This is a concrete new cost introduced by L9.1, and accounts for much of the
extra server-evaluation time in this example. One sampled game does not prove
the entire pool has the same cost distribution. Profile sample times are
approximate and depend on machine load.

## Rejected optimization experiment

The experiment kept the existing snapshots and exception protection, restoring only
properties whose descriptors changed. Compare descriptors without invoking
getters; retain accessors, property flags, deleted properties, symbols and
signed zero. There is no change to pricing, route choices, caches or AI hooks.
The optimization does not remove the remaining snapshot cost.

The initial profile draft was then refined to retain symbol descriptors and
signed zero before running regression tests and controlled batches.

Focused candidate pricing tests: 44 passed, including unchanged-card write avoidance
and descriptor/symbol restoration on exceptions. `node tests/run-all-tests.js`:
83 test files passed, including Corp decision fixtures and decision snapshots.
All 25 paired beginner games (five seeds per pair) retained identical decision
and log hashes. The first small batch timings were inconclusive (37s versus
38s with profiling/background test work differing), so they are not evidence
of an overall speedup. A controlled small comparison and a full-pool timing
comparison should be recorded separately.

A subsequent sequential comparison with no full suite running measured
37.116s on unmodified main versus 38.658s on the candidate. All 25 game
decision/log hashes still matched. Mean Corp decision latency was 7.075 versus
7.402ms; mean Runner latency was 0.329 versus 0.332ms. This does **not**
establish an overall benefit. Repeating unmodified main immediately afterwards
took 36.287s. The candidate was withdrawn, including its experiment-only tests;
the profile improvement alone is not sufficient reason to adopt it. A copy of
the rejected diff is retained locally at
`/tmp/chiriboga-l91-pricing-rejected-candidate.patch`. Production code and tests
are unchanged by this investigation.

After withdrawal, the focused L9.1 and Sang tests passed (42 and 15 cases),
and a fresh `node tests/run-all-tests.js` passed all 83 test files again.

The next optimization needs to reduce snapshot work itself, or avoid duplicate
guarded probes, with explicit evidence that snapshots remain correct across
hypothetical states. Simply comparing every descriptor during restoration
did not deliver a wall-time benefit in these tests.

## Full timing comparison for the owner

Create clean detached checkouts from the main repository:

```sh
git worktree add --detach /tmp/chiriboga-timing-pre-l91 3803c98
git worktree add --detach /tmp/chiriboga-timing-main 7d208b4
```

Run these sequentially with similar background activity. Each command plays
1,000 games; plain batches do not reuse gate report caches. These two builds
isolate the L9.1 changes after the Sang hook fix.

```sh
(
  cd /tmp/chiriboga-timing-pre-l91
  node scripts/ai-batch.js \
    --pool documentation/corp-ai-regression/assets/beginner-pool.json \
    --seeds 1-200 --jobs 8 --out /tmp/chiriboga-timing-pre-l91.json
)
(
  cd /tmp/chiriboga-timing-main
  node scripts/ai-batch.js \
    --pool documentation/corp-ai-regression/assets/beginner-pool.json \
    --seeds 1-200 --jobs 8 --out /tmp/chiriboga-timing-main.json
)
node scripts/ai-batch.js --compare \
  /tmp/chiriboga-timing-pre-l91.json /tmp/chiriboga-timing-main.json
```

Repeat the builds in reverse order if their timings are close. Use
elapsed time alongside decision latency and unchanged decision hashes; bootstrap
intervals across games cannot control for machine conditions across runs.
No full-pool benchmark was run by the agent, as requested by the owner.

## Owner's full comparison

The owner supplied the above comparison on 2026-10-13: 1,000 paired beginner
games, zero changed decisions. Baseline is `3803c98`; candidate is `7d208b4`.

| Metric (ms) | Baseline | Main | Difference | Bootstrap 95% interval |
| --- | ---: | ---: | ---: | --- |
| Corp mean | 5.968 | 7.921 | +1.953 | [+1.810, +2.106] |
| Corp p95 | 28.236 | 38.383 | +10.147 | [+9.073, +11.342] |
| Corp max | 62.717 | 89.529 | +26.811 | [+24.257, +29.347] |
| Runner mean | 0.560 | 0.581 | +0.021 | [+0.017, +0.026] |
| Runner p95 | 2.897 | 3.001 | +0.104 | [+0.077, +0.131] |
| Runner max | 31.089 | 31.945 | +0.856 | [-0.126, +1.857] |

Corp mean latency rose approximately 32.7%, p95 35.9%, and max 42.7%.
Runner mean rose approximately 3.8%. Game length (14.978), points scored
(3.926), points stolen (5.756), win rate (0.403), both mulligan rates and all
server-specific stolen-point metrics were identical. No wall-time summaries
were supplied with this comparison.

This strengthens attribution to the added L9.1 computation rather than longer
games or a uniform machine slowdown. It does not isolate the pricing guard
from all other L9.1 changes, and the confidence intervals do not control for
machine conditions across runs. Combined with focused profiling, reducing
pricing-state snapshot overhead is the next supported optimization target.
Identical decisions in this pool do not show that L9.1's correctness fixes are
unnecessary: focused unknown-price and resource-pricing cases still matter.
