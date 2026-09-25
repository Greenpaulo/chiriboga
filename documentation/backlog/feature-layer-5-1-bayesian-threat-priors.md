# L5.1 Observed-deck threat priors

**Roadmap item:** L5.1 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Replace the fixed faction/import weights in `_estimateRunnerBypassRisk()` with priors updated from public deck evidence, so the hidden-threat estimate reflects what the Runner has actually shown while preserving imperfect information.

## Current behaviour
See [architecture: public threat memory](../corp-ai/architecture.md#public-threat-memory). Verified details: `_hiddenThreatProfiles(runnerFaction)` builds, once per faction, the `AIHiddenThreat` profiles of every card definition, weighting `expectedCopies` by 1 (identity faction), 0.5 (Neutral) or 0.25 (other factions). `_estimateRunnerBypassRisk(server)`, for one-ICE servers only, groups profiles by `kind`, subtracts Heap copies of that kind, computes a hypergeometric-style chance that at least one remaining copy is in the public-size Grip (Grip plus Stack as the unknown pool), and returns `min(4, Σ severity × probability)`. `_protectionScore()` subtracts it. Nothing updates the weights from what the Runner has shown.

## Design
- Behind `this.options.observedDeckThreatPriors` (default `false`), adjust mechanic-class expectations from revealed Heap cards, installed cards, influence already observed, deck size, and optionally an offline archetype table.
- Keep `AIHiddenThreat` as the card-level contract.
- Return both probability and evidence, for telemetry.
- Fall back to the current fixed prior when evidence is sparse or no calibrated archetype data exists.
- Document the posterior calculation rules and valid public sources in `documentation/ai.md`.

## Safety and information boundary
- Never inspect Grip or Stack card identities, saved decklists, or Runner-AI private caches.
- Public pile sizes and faceup cards are valid; hidden-card contents are not.
- The F4 collector below reads the true Grip only inside the harness, after the decision, to score predictions; nothing it reads is fed back to the AI.

## Test scenarios
1. Hidden Grip/Stack substitutions do not change risk.
2. Revealing an in-faction threat increases the posterior before its copy is consumed by the Heap count.
3. Observed influence caps reduce implausible imported-copy estimates.
4. Exhausting all expected copies in the Heap still yields zero risk.
5. With the option off, `_estimateRunnerBypassRisk()` returns exactly today's values.

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on. The deck pool must tag at least two Runner decks as off-archetype (heavy out-of-faction imports of `AIHiddenThreat` cards, or none at all).

- Improvement: `threatPredictionError` (Brier score) over all decks decreases: the CI of (baseline − candidate) has a lower bound above 0.
- Guard (false confidence on uncommon decklists): `threatPredictionError` on the off-archetype decks: CI upper bound of (candidate − baseline) at most +0.01.
- Guard: `pointsStolen` per game: CI upper bound of (candidate − baseline) at most +0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collector `threatPredictionError` is added through F4's collector extension point: at each Corp-turn evaluation of a one-ICE server, for each threat kind, the squared difference between the predicted probability that at least one copy is in the Grip and whether one actually is (read by the harness, not the AI), averaged per game.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
