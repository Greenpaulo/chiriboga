# L10 Sampled breach capability research (parked)

**Roadmap item:** L10 · **Depends on:** L9.0, L9.1, L5.1, F2, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [L9 fidelity](L9-run-simulation-fidelity.md), `documentation/backlog/feature-layer-5-1-bayesian-threat-priors.md`, `documentation/ai-batch-harness.md`
**Verified against code:** fe9f1d3 (2026-10-13)

## Goal

Preserve the idea of estimating hidden-state breach capability while the model
is unresolved. This item is parked, not ready to raise or implement. The original
draft conflated ability to breach with next-turn breach occurrence; neither an
estimator nor a policy consumer is specified for implementation here.

## Current behaviour

- `_evaluateServerSecurity()` returns current and honest security verdicts,
  estimated route costs and `unpricedBreakers`. L9.1 preserves unknown pricing:
  `honestBreakCost` can be null, so it is not always a finite numeric input.
- The `securityCalibration` collector records successful runs during the Runner
  turn after a server snapshot. That outcome includes the Runner's choice to
  run, not just whether a feasible route existed.
- L5.1's proposed priors concern mechanic-class hidden threats. They are not a
  delivered joint distribution over complete hidden hands or legal decklists.
- Grip size is public and allowed by Corp principles. The earlier removal of
  Grip size from agenda-bluff probability addressed a learnable tell, not an
  information-boundary prohibition.
- `_random` is shared policy randomness and F2's hypothetical guard restores
  state; neither makes extra sampling draws observationally invisible by itself.

## Design

Before un-parking, rewrite this spec around one explicit target:

1. **Capability:** probability that a feasible route exists under a declared
   hidden-state model. Validate sampled route outcomes against controlled
   exhaustive/oracle cases; an unrun open server can still be fully breachable.
2. **Occurrence:** probability the Runner actually breaches next turn. This
   additionally needs an explicit action-choice/attempt model and must handle
   competing servers, draws, income, prevention and avoidance.

Prefer capability as the first experiment. Define the hidden-state prior beyond
L5.1's mechanic-class expectations, legal installation/memory constraints,
shared click/credit budgets and run costs, uncertainty for unpriced mechanisms,
route scope and limits inherited from L9. Reusing break pricing does not solve
these missing planning constraints. Unknown pricing is not certain feasibility.

Use a separate injectable sampling stream and a declared sample cache lifetime;
observation may not advance policy RNG or change choices. An eventual estimate
must be deterministic from permitted information, recorded seed and model version.
Define the sampling interval and endpoint handling before evaluating calibration.

For occurrence calibration, compare against simple empirical/public-state
baselines as well as security verdicts, use held-out seeds/decks, handle 0/1
log-loss endpoints explicitly, and cluster repeated server observations within
games. A Brier-score improvement over binary lockout labels alone does not show
that hidden-hand sampling adds value. Define coverage, runtime budget and exact
commands only after the target and model are frozen.

The provisional credit-ceiling counts in the old draft have no recorded
provenance here. Re-derive their cohort, revision and cause before using them
as motivation. No L10.1 consumer is proposed and I4 does not depend on this work.

## Safety and information boundary

Only public Runner information and an independently specified prior; never real
Grip/Stack identities, saved Runner decklists or private Runner-AI state. Keep
soft risk separate from deterministic security and Corp scoring admission.
Hypothetical results may not leak into real-board caches or policy randomness.

## Test scenarios

Required when rewriting the parked proposal: hidden-card substitution, public
Grip-size use, policy RNG identity, throwing-probe restoration, an open server
that is not chosen for a run, infeasible installation/click budgets, unknown
pricing, route-oracle agreement and calibration against held-out baselines.
These are research requirements, not evidence of a working estimator.

## Acceptance gate

N/A — deterministic fix (principle 4): any preliminary passive diagnostics must
preserve decisions, RNG and gameplay hashes. No strategic adoption or estimator
implementation is authorised by this parked spec. Before un-parking, specify the
model, objective validation and complete observation identity protocol here;
any later decision consumer requires a separate F4 strategic adoption gate.

## Acceptance criteria

- [ ] Before un-parking, choose capability or occurrence and replace the research
      questions with a complete target, prior, route model and uncertainty rules.
- [ ] Define objective oracle tests, empirical comparators, independent sampling
      stream/cache lifetime, held-out validation, coverage and runtime budget.
- [ ] Re-ground current claims and dependencies before raising a rewritten spec.
- [ ] Record provenance for any motivating measurements; no unsupported counts.
- [ ] Any delivered implementation documents hooks/architecture and passes
      `node tests/run-all-tests.js`; no estimator or consumer ships while parked.
