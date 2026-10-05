# I9 Calibration, simulation and simplification

**Roadmap item:** I9 · **Depends on:** I8, F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Tune the bounded score coefficients with reproducible evidence and remove the
compatibility bands and legacy fallback, so the unified install policy is the
only install policy and measurably no worse than the baseline on any guarded
metric.

## Current behaviour
Install priorities come from legacy ordering and hand-set heuristics. The
compatibility bands I1 introduces, the legacy-marked title bands (Snare!,
Trick of Light) and each item's default-off legacy path remain until this item
shows they are no longer needed.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Metrics, all from F4's core set or collectors earlier items added:
`pointsScored`, `pointsStolen` and `pointsStolenByServer`,
`installToScoreTurns`, `agendaExposureTurns`, `assetNetCredits`,
`trapTriggers`, `strandedUnrezzedIceCost`, `corpInsolventTurns`,
`installOutcomes` (abandoned plans), `decisionLatencyMs`, and
`bluffSingleVariableCorrelation` (defined in the L8.4 ticket and added by
whichever of L8.2, L8.4 or L8.5 lands first; I9 extends it).

Work:

- Tune coefficients only inside the design note's stated bounds; record each
  coefficient beside its component.
- Run broader randomized matches only after deterministic regression tests
  pass.
- Extend `bluffSingleVariableCorrelation` (definition and public-variable
  list in the L8.4 ticket) to I3's install-role decisions, so bait,
  agenda-bluff and install-role outcomes are all checked against the same
  public variables.
- **Equivalent coverage** (the rule for removing a band, branch or fallback):
  (a) every deterministic test and fixture that exercised it (found by
  deleting it on a branch and running the suite) passes without it, or its
  expectation change is listed and justified by an adopted I item; (b) I0's
  install-fixture decision snapshots are identical except those listed
  deltas; (c) an F4 run with it removed against it present keeps every
  standard guard. When every compatibility band and title band passes, the
  legacy fallback and the per-item options are removed.

## Safety and information boundary
Calibration must not regress imperfect-information compliance or deception
safety. No bait/bluff decision may show an exploitable correlation with a
single observable game-state variable beyond its documented bounded inputs.

## Test scenarios
1. Removing a compatibility band or legacy ordering branch leaves the
   deterministic fixtures it covered passing (equivalent coverage, part a).
2. `bluffSingleVariableCorrelation` reports a correlation near 1 for a
   synthetic policy that bluffs only when Corp credits exceed 5, and near 0 for
   one that bluffs uniformly at random, on a fixed seed.
3. With every option on and the fallback removed, the full suite and all
   decision fixtures pass.

## Acceptance gate
Against I0's baseline, with every I option on (candidate) and the calibrated
coefficients:

- **No material regression:** every standard guard in the design note holds
  (`winRate`, `pointsScored`, `pointsStolen`, `gameLength`,
  `decisionLatencyMs`, `corpInsolventTurns`).
- **Improvement:** at least one of `pointsStolen` (falls), `pointsScored`
  (rises) or `assetNetCredits` (rises) has an interval excluding zero in the
  improving direction.
- **Deception confidence threshold:** over at least 2,000 bait/bluff decisions,
  for every observable variable that is not a documented bounded input of the
  posture, the bootstrap 95% upper bound of `bluffSingleVariableCorrelation`
  is at most 0.2; for documented inputs, the observed bluff rate per variable
  bucket is within 0.05 of the documented formula.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The `bluffSingleVariableCorrelation` collector (added by an L8 item through F4's collector extension point) also covers install-role decisions.
- [ ] Each removed band or branch is listed in the Resolution with its equivalent-coverage evidence.
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then are the calibrated coefficients adopted and the legacy fallback removed.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
