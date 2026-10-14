# F11 Paired batch-metric guards

**Outcome:** adopted

**Roadmap item:** F11 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/ai-batch-harness.md`, `documentation/ai-planning.md`, [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 62b51a0 (2026-10-13)

**Reproduction:** `tests/pending/F11-paired-batch-metric-guards.test.js` — fails at 62b51a0, 2026-10-13 (0/3 passed: pooled improvements unavailable, baseline-only dropped games not counted, correlation validity contract absent). Moved to `tests/F11-paired-batch-metric-guards.test.js`; passes with `node tests/F11-paired-batch-metric-guards.test.js` (3/3).

## Resolution

Implemented from 62b51a0, 2026-10-13.

- `compareReports()` accepts trusted collector definitions and reconstructs requested pooled metrics from successful matched game keys. Baseline and candidate use identical game-index bootstrap draws. Raw point differences, intervals, directions, resample counts and symmetric dropped-key counts are reported; strict guard/improvement checks use unrounded values. Duplicate keys, missing samples, nonfinite statistics, undefined draws and undeclared directions cannot pass. Existing per-game metric names take precedence; diagnostic-only legacy collectors need not be installed to compare unrelated per-game metrics.
- Added the optional `validateBatch(perGameSamples)` contract. The correlation collector validates sample columns and requires at least one defined correlation on original cohorts and every draw. Invalid draws fail the entire paired check; they are not discarded. Separate-arm correlation diagnostics still return their legacy zero when undefined, so absolute ceilings and measured no-worse checks retain their semantics. Both CLI paths preserve paired evidence when the same metric also has an absolute check, and the trusted loader rejects path-like collector names.
- Added `scripts/ai-batch/calibration.js` with `calibrateReports()`: independent draws within matching deck-pair/fixture strata for disjoint same-policy baseline cohorts. Matching code, options and other configuration are required. It returns calibration statistics, cohort sizes and failure counts, with no adoption verdict. Numeric/string spellings of the same seed cannot disguise cohort overlap. Adoption comparison still refuses mismatched seeds.
- The three new pending assertions passed unchanged and were moved to `tests/F11-paired-batch-metric-guards.test.js`; only relative imports changed during the move. The pending file was created during this uncommitted implementation, so it does not exist in Git history at the starting commit. The workflow checker cannot perform its historical assertion comparison for that path; no assertions or expectations were changed. This provenance warning cannot be removed by a commit because this workflow explicitly prohibits committing. The initial 0/3 failure results and unchanged assertions remain documented here and in the final green test.
- `tests/ai-batch-pooled-comparison.test.js` verifies independently specified pooled/nonlinear results, shared-index pairing, strict thresholds, directions, identity/crossing-zero failures, missing and invalid data, unusable correlation draws, symmetric exclusions, duplicate keys, repeatability and independent stratified calibration. `tests/ai-batch.test.js` exercises both guard/improvement CLI paths, including synthetic cached gate reports isolated from existing cache tests, and feeds the correlation collector during observation-on/off seeded identity checks. Synthetic reports are test oracles, not adoption evidence. Updated the architecture-name test's source list to include the new calibration helper.
- Updated the harness guide, planning rules and [architecture: Foundations](../../corp-ai/architecture.md#foundations). No card AI hook, engine code or policy option changed. Calibration implementation resolves the scope ambiguity approved in the plan; no consumer margins or source gates were amended.
- Focused verification: reproduction 3/3, pooled/calibration tests passed, batch integration 29 scenarios passed, existing measured no-worse checks passed, and architecture-name checks passed. `node tests/run-all-tests.js`: all 90 test files passed, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.

## Implementation plan

Proposed at `62b51a0`, 2026-10-13. **Approved 2026-10-13.**

- **Validation:** Current-behaviour claims are confirmed in `compareReports()`, `batchMetrics()`, the CLI comparison paths and `bluffSingleVariableCorrelation.finishBatch()`. The collector retains samples and declares the lower direction. A constant/unusable correlation currently becomes zero. `--no-worse` now also exists; preserve its distinct measured-value semantics and L8.4's settled gate. This is measurement-only, with objective synthetic statistical oracles; no AI policy option or adoption gate is needed. F4 is done and F11 has no blockers. The design's calibration documentation and scenario 7's executable calibration requirement need an explicit scope decision; this plan supplies a separate calibration helper, never relaxed adoption matching. The design sentence about exceeding `-tolerance` applies to guards; improvements retain the explicitly required bound above zero.
- **Approach:** Extend `scripts/ai-batch/metrics.js` comparison with collector definitions supplied by the existing trusted CLI loader. Pair successful games by key, count dropped keys symmetrically, and recompute pooled statistics from identical game-index draws in both arms. Report pooled values, raw difference and interval, oriented improvement, direction, resample count and dropped pairs. Use unrounded values for strict pooled thresholds. Reject missing/nonfinite samples or statistics, absent directions and invalid bootstrap draws without substituting zeros. Add `validateBatch(perGameSamples)` (true or a diagnostic reason) for collector-specific validity; the correlation collector validates sample structure and requires at least one defined outcome/variable correlation on the original cohort and every draw. Retain diagnostic zero values and existing absolute ceiling/no-worse behavior for compatibility. Update both CLI paths and printing without overwriting paired results with separate-arm intervals. Add `scripts/ai-batch/calibration.js` for baseline-only independent-cohort resampling within deck-pair/fixture strata, requiring matching strata and disjoint seeds; it does not call or bypass adoption comparison validation. Do not subtract separate interval endpoints or average per-game correlations.
- **Tests:** Keep the three failing reproduction assertions unchanged and move them to the green suite after repair. Add independently calculated nonlinear pooled and shared-index oracles, repeatability, strict tolerance boundaries, higher/lower direction, identity/crossing-zero improvement failures, missing/invalid samples, constant columns, invalid draws, no successful pairs, mismatched metadata and duplicate-key rejection. Exercise gate and `--compare` integration, preserve per-game/ceiling/no-worse/option-effect checks, and verify observation on/off decision and log hashes. Verify independent calibration's stratification, separate draws and rejection of seed overlap; adoption must continue rejecting disjoint seeds. Run focused tests and `node tests/run-all-tests.js`.
- **Risk:** Four source files change (metrics, CLI, correlation collector and the new calibration helper), requiring this plan gate. Undefined resamples must fail closed rather than drop draws and narrow the interval. Legacy collector/report diagnostics and consumers must keep working; avoid requiring sample reconstruction for comparisons that request only existing per-game metrics. Preserve policy RNG and engine code untouched.
- **Docs:** Update `documentation/ai-batch-harness.md`, `documentation/ai-planning.md` and the Foundations section of `documentation/corp-ai/architecture.md`; describe the validity contract, paired pooled checks and separate calibration semantics. Set F11 in-progress and link the architecture section in the resolution at implementation hand-off. No card AI hooks change.

## Goal

Let an F4 gate guard a pooled collector metric against its matching control,
using a paired bootstrap difference rather than an absolute candidate ceiling.
I2 requires this; F12/L8.2 also need pooled improvement checks and I3 gates
can reuse the comparisons. This item changes
measurement only, not AI policy.

## Current behaviour

`scripts/ai-batch/metrics.js:compareReports()` validates matching pool, seeds,
starts and collectors, then bootstraps differences in per-game metrics.
`batchMetrics()` separately computes pooled `finishBatch()` values and
game-resampled intervals for each report. `scripts/ai-batch.js` checks pooled
metrics only through `applyCeilingChecks()` and `--ceiling`; `--guard` on
`bluffSingleVariableCorrelation.max` fails as an unknown per-game metric.
The collector retains game-level samples, so paired pooled comparison needs
no decision replay or averaging of per-game correlations.

## Design

- Extend `--guard` and `--improve` for batch metrics with declared better directions.
  For improvement, require the oriented paired 95% interval lower bound above
  zero, as for existing per-game improvements. F12/L8.2 need actual tell
  reduction, not just an allowed-regression guard. Keep
  per-game guards and absolute `--ceiling` semantics intact. This supplies
  the optional stronger rule described in the merge plan's deception-gate
  reconciliation; it does not retroactively replace L8.4's settled measured
  batch-maximum check or automatically amend other items' source gates.
- Join successful baseline/candidate games by existing game keys. Draw the
  same game-pair indices for both arms, recompute each collector's
  `finishBatch()` on each draw and bootstrap candidate minus baseline.
  Never subtract independently computed interval endpoints.
- Report control/candidate pooled values, difference, 95% interval, direction,
  tolerance, resample count and dropped pairs. Orient differences exactly as
  existing guards do; the lower improvement bound must exceed `-tolerance`.
- Fail closed on missing samples, unusable correlation columns, incompatible
  reports or no usable pairs. Define and test a collector validity contract;
  a constant column currently returning zero is not evidence of precision.
- Support both `gate` and `--compare`; seeded bootstrap draws are repeatable.
  Resolve collector definitions through the existing trusted loader.
- Document baseline-only precision calibration separately from adoption:
  identical policy and matching seeds are an identity sanity check; disjoint
  seed cohorts require an explicitly independent, deck-pair-stratified
  bootstrap and must not pass as matched reports. Keep strict matching
  checks in adoption gates. Calibration evidence belongs to each consumer.

## Safety and information boundary

Measurement is passive. Collecting and comparing samples must not alter game
decisions, policy random draws or game log hashes. Retain report compatibility
validation and the option-effect requirement.

## Test scenarios

1. A synthetic pooled collector gives the expected paired difference, with
   both arms using identical resampled game indices and repeatable draws.
2. Identity reports produce zero difference; an introduced regression fails,
   and a tolerance-respecting difference passes with the declared direction.
   Pooled `--improve` passes only for a strictly positive oriented lower bound;
   identity and intervals crossing zero fail improvement.
3. Missing or invalid samples, constant correlation columns, no successful
   pairs and mismatched seeds/pools/starts/collectors fail clearly.
4. Failed/unpaired games are excluded symmetrically and counted in the report.
5. Existing per-game guards, ceilings and no-option-effect failures retain
   their behavior; integration exercises both `gate` and `--compare`.
6. Observation on/off leaves seeded decisions and log hashes identical.
7. Independent baseline calibration resamples cohorts separately within deck
   pairs and does not bypass matching validation for an adoption gate.

## Acceptance gate

N/A — deterministic fix (principle 4): statistical and measurement invariants
above have synthetic oracles; game decisions and random draws stay identical.
F11 does not adopt an AI policy or choose a consumer's tolerance.

## Acceptance criteria

- [x] All scenarios have focused tests with independently specified expected results.
- [x] Paired pooled metrics work with `--guard` and `--improve` in `gate` and `--compare`, with repeatable intervals, declared direction, missing-data failures and strict tolerance checks.
- [x] Baseline-only calibration is documented with independent-cohort semantics; adoption comparisons still require matching seeds.
- [x] Existing per-game metrics and ceilings retain their semantics and seeded games retain their decisions and log hashes.
- [x] `documentation/ai-batch-harness.md`, `documentation/ai-planning.md` and `documentation/corp-ai/architecture.md` describe the delivered support.
- [x] `node tests/run-all-tests.js` passes.
