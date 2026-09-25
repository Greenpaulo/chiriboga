# I9 Calibration, simulation and simplification

**Roadmap item:** I9 · **Depends on:** I8, F4 · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`

## Goal
Tune bounded weights using reproducible evidence and remove superseded legacy
branches, so that the unified install policy measurably improves on the
baseline and the compatibility scaffolding can be retired.

## Current behaviour
Install priorities come from legacy ordering and hand-set heuristics; the
compatibility score bands and legacy fallback that I1 introduces remain until
replacement coverage is demonstrated.
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
Metrics:

- agenda points scored and stolen by installation context;
- game-winning breaches enabled or prevented;
- time from agenda install to score or steal;
- asset install/rez/click cost versus realized return;
- trap trigger and runner-engagement rates;
- deception exploitability by observable public-state variable, including
  turn, credits, server shape, and installed-card context;
- ICE install count, rez rate, marginal break-cost gain, and stranded unrezzed
  cost;
- central versus remote protection share;
- Corp insolvency caused by install commitments;
- number of abandoned or immediately obsolete install plans;
- average decision latency.

Work:

- Compare fixed-seed baselines before and after every scoring-policy change.
- Run broader randomized matches only after deterministic regression tests
  pass.
- Audit bait/bluff outcomes for learnable single-variable correlations across
  many seeds and games; install-level role and card selection must not leak a
  deterministic signal even when the underlying posture roll is balanced.
- Keep coefficients bounded and documented beside their semantic score
  component.
- Remove compatibility score bands and dead legacy ordering only after the
  replacement demonstrates equivalent coverage.
- Keep a clear fallback path until candidate scoring outperforms baseline
  without major regressions.

## Safety and information boundary
Calibration must not regress imperfect-information compliance or deception
safety. No bait/bluff decision may show an exploitable correlation with a
single observable game-state variable beyond its documented bounded inputs and
confidence threshold.

## Test scenarios
1. Fixed-seed baselines are compared before and after every scoring-policy
   change.
2. Bait/bluff outcomes show no learnable single-variable correlation across
   many seeds and games beyond their documented bounded inputs.
3. Removing a compatibility score band or legacy ordering branch leaves the
   deterministic fixtures it covered passing.

## Acceptance gate
The unified policy improves scoring, asset return, or breach prevention in
seeded comparisons without material regressions in economy, action latency,
deception safety, or imperfect-information compliance. No bait/bluff decision
may show an exploitable correlation with a single observable game-state
variable beyond its documented bounded inputs and confidence threshold.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
