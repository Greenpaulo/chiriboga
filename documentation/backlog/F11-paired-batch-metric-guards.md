# F11 Paired batch-metric guards

**Roadmap item:** F11 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/ai-batch-harness.md`, `documentation/ai-planning.md`, [deception gate reconciliation](../corp-ai/deception-gates.md)
**Verified against code:** e33a91b (2026-10-12)

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

- [ ] All scenarios have focused tests with independently specified expected results.
- [ ] Paired pooled metrics work with `--guard` and `--improve` in `gate` and `--compare`, with repeatable intervals, declared direction, missing-data failures and strict tolerance checks.
- [ ] Baseline-only calibration is documented with independent-cohort semantics; adoption comparisons still require matching seeds.
- [ ] Existing per-game metrics and ceilings retain their semantics and seeded games retain their decisions and log hashes.
- [ ] `documentation/ai-batch-harness.md`, `documentation/ai-planning.md` and `documentation/corp-ai/architecture.md` describe the delivered support.
- [ ] `node tests/run-all-tests.js` passes.
