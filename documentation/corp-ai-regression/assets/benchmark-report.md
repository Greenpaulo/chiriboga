# Original vs current Corp AI benchmark report

## Verdict

**Regressed.** With the original Corp AI as baseline and the current Corp AI as candidate, the primary defence metric became worse: `pointsStolen` increased by **0.563 points/game**, with paired 95% interval **[+0.373, +0.753]**. The whole interval is above zero when lower is better, so the predeclared improvement check fails. All three frozen guards also fail.

This is not the intended defensive trade-off and it is not merely a turtling pattern. The current Corp allows more points to be stolen, scores substantially less, wins less often, and takes longer to finish games. Remote theft improved, but substantially higher theft from HQ and R&D more than offset it.

## Inputs and provenance

- Harness/current chassis branch: `roadmap/corp_ai_finding_12_seeded_batch_harness`
- Harness/current SHA: `b52d45123c10201572aaf837714dd019bd9bdfcc`
- Original Corp AI source SHA: `625b008ccfc0113d29a2d358d3a40e2377699bd7` (H0)
- Original-arm shim commit: `4cd91d1b1d101404123bd5d6fbb1aa8c1284e9f3`
- Original report SHA: `4cd91d1`; current report SHA: `b52d451`; both recorded `dirty: false`
- Pool: `/Users/paulbingham/bench/beginner-pool.json`, id `beginner-v1`, hash `fe8cb821d04c9dd7`
- Sets: `systemgateway`, `systemupdate2021`, `elevation`
- Pairs: `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`
- Seeds: 1–200 per pair; 1,000 games per arm
- Starts: none; collectors: none/default core collectors
- Current Corp options: defaults (`evidenceBasedHostedCardRez: false`)
- Original Corp options: empty default-options object from the shim
- Runner options: defaults (`{}`) in both arms
- `ai_runner.js` SHA-256 in both worktrees: `d63b38a0b2e91bb95bb9be91bbc290a985a34f5980d82121ea816b10556b10b4`
- The committed worktree revisions differ only in `ai_corp.js`.

The upstream repository's advertised default branch was `dev` at `c863f5af74ceb4fa821a4c84d3f643efffacb7ba`. Its downloaded `ai_corp.js` was byte-identical to H0: SHA-256 `1cae40d130996fb0ec62d690558c2475dcc80f3c42d2077bbda7653a94d44284`, 3,409 lines and 137,442 bytes with CRLF endings.

The owner's gitignored `ai_corp_original.js` was not used because it differed from H0:

- Owner copy: 3,985 lines, 148,891 bytes, LF endings, SHA-256 `4e82d3d7c8ba446bee75c081f1ad7f0184cce1b39079f5272c099eae7c88d16b`
- H0: 3,409 lines, 137,442 bytes, CRLF endings, SHA-256 `1cae40d130996fb0ec62d690558c2475dcc80f3c42d2077bbda7653a94d44284`
- Ignoring end-of-line whitespace, the diff still contained 2,456 insertions and 1,881 deletions.

The owner selected H0 after the upstream identity was verified.

## Frozen acceptance checks

These were written to `/Users/paulbingham/bench/benchmark-plan.md` before any candidate batch result was generated and were not changed afterward.

| Check | Direction/tolerance | Result |
|---|---:|---|
| Improve `pointsStolen` | Lower; whole 95% interval below zero | **FAIL**: +0.563 [+0.373, +0.753] |
| Guard `winRate` | Higher; tolerance 0.03 | **FAIL**: -0.180 [-0.218, -0.141] |
| Guard `pointsScored` | Higher; tolerance 0.4 | **FAIL**: -1.723 [-1.934, -1.505] |
| Guard `gameLength` | Lower; tolerance 2 turns | **FAIL**: +1.810 [+1.314, +2.314] |
| Corp latency | Lower; report only | Current was substantially slower |

The game-length mean regression is 1.81 turns, but the guard fails because its upper confidence bound admits a regression greater than the frozen two-turn tolerance.

## Original-arm shim

The H0 file retained CRLF endings. Relative to `625b008:ai_corp.js`, the shim was 14 insertions plus the missing EOF newline:

```diff
 constructor() {
   this.preferred = null;
+  this.options = Object.assign({}, CorpAI.DEFAULT_OPTIONS);
 }

 Choice(optionList, choiceType) {
+  var telemetry =
+    typeof DecisionSnapshots !== "undefined" && DecisionSnapshots.telemetry;
+  var startedAt = telemetry ? DecisionSnapshots.Now() : 0;
+  var ret = this._choiceInner(optionList, choiceType);
+  if (telemetry)
+    DecisionSnapshots.Record("corp", choiceType, optionList, ret, DecisionSnapshots.Now() - startedAt);
+  return ret;
+}
+
+_choiceInner(optionList, choiceType) {
   // original decision logic unchanged
 }

+CorpAI.DEFAULT_OPTIONS = Object.freeze({
+});
```

The original `RandomRange(virus_min, virus_max)` call was not changed. No later option or decision policy was added.

## Smoke test and known cross-version differences

Current arm:

- `tests/ai-batch.test.js`: 12/12 scenarios passed.
- Gateway and PD–Tao seeds 1–10: 20/20 games had a winner and `errors: []`.
- Repeated Gateway seed 1 produced identical log hash `f11c34d148d4`.

Original arm:

- Gateway and PD–Tao seeds 1–10: 20/20 games had a winner and `errors: []`.
- Repeated Gateway seed 1 produced identical log hash `4ef7b95d3f7d`.
- `tests/ai-batch.test.js` had three owner-approved expected incompatibilities, recorded here and not treated as blockers:
  1. The dedicated Corp-policy random-stream scenario expects later `_random` behavior; H0 intentionally retains `RandomRange` on the seeded engine stream.
  2. The AI-options scenario tries to enable later option `evidenceBasedHostedCardRez`, which H0's intentionally empty options object rejects.
  3. The gate baseline-reuse/quick scenario also tries to enable `evidenceBasedHostedCardRez` and is rejected for the same reason.

The tests, H0 randomness and H0 options were not changed.

## Batch validation

| Arm | Games | Failed | Wall time | Code hash | Report |
|---|---:|---:|---:|---|---|
| Original | 1,000 | 0 | 118.934 s | `47fba9d60eeaabca` | `/Users/paulbingham/bench/orig.json` |
| Current | 1,000 | 0 | 227.936 s | `a0ab675e420ce8b0` | `/Users/paulbingham/bench/current.json` |

Both reports match on pool hash, seeds, starts and collectors. Each has exactly 1,000 valid games and an empty `failures` list. No replay triage was needed. The harness reported 997 of 1,000 paired games with changed log hashes.

The first attempt to detach the original command was terminated by the execution wrapper before it began; it left a zero-byte log, no process and no report. The supervised background launch shown in the frozen command was the only original batch that actually executed.

## Pooled results

Differences are current minus original. Confidence intervals are the harness's deterministic 10,000-resample paired bootstrap intervals.

| Metric | Original | Current | Difference | 95% interval | Better |
|---|---:|---:|---:|---:|---|
| Corp win rate | 0.433 | 0.253 | -0.180 | [-0.218, -0.141] | Higher |
| Corp points scored | 4.264 | 2.541 | -1.723 | [-1.934, -1.505] | Higher |
| Runner points stolen | 5.675 | 6.238 | +0.563 | [+0.373, +0.753] | Lower |
| Game length (turns) | 14.765 | 16.575 | +1.810 | [+1.314, +2.314] | Lower |
| Corp decision latency mean (ms) | 1.820 | 6.774 | +4.954 | [+4.655, +5.257] | Lower |
| Corp decision latency p95 (ms) | 7.624 | 32.867 | +25.244 | [+23.527, +27.011] | Lower |

### Stolen points by server

| Server | Original | Current | Difference | 95% interval | Better |
|---|---:|---:|---:|---:|---|
| HQ | 2.060 | 2.697 | +0.637 | [+0.450, +0.827] | Lower |
| R&D | 2.058 | 2.658 | +0.600 | [+0.418, +0.786] | Lower |
| Archives | 0.010 | 0.112 | +0.102 | [+0.069, +0.138] | Lower |
| Remote | 1.547 | 0.771 | -0.776 | [-0.920, -0.630] | Lower |

The current Corp protected remotes better but exposed all three central servers more, especially HQ and R&D.

## Per-pair results

Compact cells show `original → current; difference [95% interval]`.

| Pair | Win rate (higher) | Points scored (higher) | Points stolen (lower) | Turns (lower) |
|---|---|---|---|---|
| `btl-kit` | 0.425 → 0.340; -0.085 [-0.180, +0.010] | 2.890 → 2.165; -0.725 [-1.230, -0.235] | 5.900 → 5.925; +0.025 [-0.410, +0.475] | 14.070 → 17.100; +3.030 [+1.735, +4.340] |
| `gateway` | 0.420 → 0.095; -0.325 [-0.400, -0.250] | 4.895 → 1.765; -3.130 [-3.590, -2.665] | 5.640 → 6.810; +1.170 [+0.760, +1.585] | 16.200 → 18.605; +2.405 [+1.265, +3.505] |
| `neh-zahya` | 0.205 → 0.095; -0.110 [-0.175, -0.045] | 3.390 → 1.960; -1.430 [-1.905, -0.955] | 6.790 → 7.035; +0.245 [-0.030, +0.525] | 12.860 → 14.355; +1.495 [+0.525, +2.530] |
| `pd-tao` | 0.690 → 0.515; -0.175 [-0.270, -0.080] | 6.200 → 4.990; -1.210 [-1.695, -0.715] | 4.440 → 4.940; +0.500 [-0.010, +1.020] | 15.590 → 17.380; +1.790 [+0.685, +2.915] |
| `pe-steve` | 0.425 → 0.220; -0.205 [-0.295, -0.115] | 3.945 → 1.825; -2.120 [-2.560, -1.680] | 5.605 → 6.480; +0.875 [+0.430, +1.330] | 15.105 → 15.435; +0.330 [-0.740, +1.405] |

### Corp decision latency by pair

| Pair | Mean ms | p95 ms |
|---|---|---|
| `btl-kit` | 3.898 → 12.191; +8.293 [+7.282, +9.317] | 17.691 → 63.573; +45.881 [+39.919, +52.115] |
| `gateway` | 1.286 → 6.489; +5.204 [+4.737, +5.679] | 4.790 → 29.065; +24.275 [+21.941, +26.657] |
| `neh-zahya` | 1.551 → 4.744; +3.194 [+2.752, +3.665] | 6.228 → 21.672; +15.444 [+13.122, +17.898] |
| `pd-tao` | 1.113 → 6.409; +5.296 [+4.738, +5.887] | 4.259 → 30.994; +26.735 [+23.205, +30.429] |
| `pe-steve` | 1.254 → 4.038; +2.784 [+2.493, +3.084] | 5.149 → 19.032; +13.883 [+12.156, +15.680] |

## Interpretation

The current AI's aggregate pattern is adverse on every outcome axis:

- `pointsStolen` is higher, so the defence work did not achieve the benchmark's stated goal on this common upstream-era pool.
- `winRate` fell by 18.0 percentage points and `pointsScored` fell by 1.723 points/game.
- Games became 1.81 turns longer on average.
- The regression appears across the pool rather than being confined to one matchup. Gateway is the largest outcome regression.
- The server split suggests a concrete investigation direction: stronger remote defence coincides with much weaker central defence.

The evidence supports investigating the enabled Corp policy changes before building further work on them. Because the result is a clear regression rather than an interval crossing zero, the runbook's inconclusive-result seed expansion does not apply.

## Caveats

- AI-vs-AI Corp win rate also reflects the fixed current Runner AI's strength; this experiment isolates the Corp implementation but is not a human-play benchmark.
- These common decks deliberately avoid post-upstream mechanics. A flat result would not have proved newer logic useless, although the observed regression is directly relevant to these supported matchups.
- The current AI is expected to be slower partly because it includes more evaluation and telemetry/efficiency machinery; latency was report-only and did not determine the verdict.
- H0's live `RandomRange` call consumes the seeded engine stream, while the current Corp uses later randomness plumbing. Pairing is therefore looser than a same-revision option gate but remains deterministic and unbiased, as predeclared.

## Artifacts

- Frozen plan: `/Users/paulbingham/bench/benchmark-plan.md`
- Pool: `/Users/paulbingham/bench/beginner-pool.json`
- Original report/log: `/Users/paulbingham/bench/orig.json`, `/Users/paulbingham/bench/orig.log`
- Current report/log: `/Users/paulbingham/bench/current.json`, `/Users/paulbingham/bench/current.log`
- Comparison output: `/Users/paulbingham/bench/comparison.log`
- Original source backups: `/Users/paulbingham/bench/ai_corp_H0.js`, `/Users/paulbingham/bench/ai_corp_original.js`
- Worktrees retained: `/Users/paulbingham/apps/netrunner/bench-orig`, `/Users/paulbingham/apps/netrunner/bench-current`
- Throwaway branches retained: `bench-orig`, `bench-current`

Nothing was pushed, and no real branch was modified.
