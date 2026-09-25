# L5.1 Observed-deck threat priors

**Roadmap item:** L5.1 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Replace the fixed faction/import weights in `_estimateRunnerBypassRisk()` with priors updated from public deck evidence, so the hidden-threat estimate reflects what the Runner has actually shown while preserving imperfect information.

## Current behaviour
Cards declare a mechanic-level `AIHiddenThreat` profile. `_estimateRunnerBypassRisk(server)` uses the Runner identity faction as a fixed deckbuilding prior, discounts out-of-faction threats, subtracts publicly revealed Heap copies, and combines the remaining expected copies with public Grip and Stack sizes into a bounded protection-score penalty for one-ICE servers (exposed as `publicThreatRisk`). See [architecture: public threat memory](../corp-ai/architecture.md#public-threat-memory).

## Design
- Adjust mechanic-class expectations from revealed Heap cards, installed cards, influence already observed, deck size, and optionally an offline archetype table.
- Keep `AIHiddenThreat` as the card-level contract.
- Return both probability and evidence, for telemetry.
- Fall back to the current fixed prior when evidence is sparse or no calibrated archetype data exists.
- Document the posterior calculation rules and valid public sources in `documentation/ai.md`.

## Safety and information boundary
- Never inspect Grip or Stack card identities, saved decklists, or Runner-AI private caches.
- Public pile sizes and faceup cards are valid; hidden-card contents are not.

## Test scenarios
1. Hidden Grip/Stack substitutions do not change risk.
2. Revealing an in-faction threat increases the posterior before its copy is consumed by the Heap count.
3. Observed influence caps reduce implausible imported-copy estimates.
4. Exhausting all expected copies in the Heap still yields zero risk.

## Acceptance gate
Adopt only after seeded simulations (F4) show better-calibrated predicted-versus-observed threat rates than the fixed prior, without increasing false confidence on uncommon decklists.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
