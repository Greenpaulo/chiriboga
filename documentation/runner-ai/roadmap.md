# Runner AI roadmap

One entry per item. Full specs live in the linked ticket (`ready` and later) or
spec file (`proposed`); how finished work behaves lives in
[architecture.md](architecture.md); rules live in
[../ai-principles.md](../ai-principles.md) and [principles.md](principles.md).
Statuses, IDs and commands are defined in [../ai-planning.md](../ai-planning.md).

- `node scripts/roadmap.js next` lists items (both AIs) whose dependencies are all `done`.
- `tests/ai-roadmaps.test.js` fails if a status, link or dependency here
  disagrees with the tickets.

## Hand keep and discard (W)

Which Grip cards are worth keeping, playing or installing, and which go first
when the hand is full? Shared design:
[specs/hand-keep-design.md](specs/hand-keep-design.md). Current coverage is
generated in [../card-status.md](../card-status.md#runner-keep-coverage-playable-sets).

### W0 Baseline capture and keep/discard telemetry
- **Status:** proposed
- **Depends on:** none
- **Spec:** [W0-baseline-capture-and-telemetry.md](specs/W0-baseline-capture-and-telemetry.md)
- **Goal:** Record current keep/discard behaviour and reasons before changing it.

### W1 Centralised need computation
- **Status:** proposed
- **Depends on:** W0
- **Spec:** [W1-centralised-need-computation.md](specs/W1-centralised-need-computation.md)
- **Goal:** Compute economy, draw and lockout needs once per decision, with no behaviour change yet.

### W2 Need-matching tier in keep decisions
- **Status:** proposed
- **Depends on:** W1
- **Spec:** [W2-need-matching-tier.md](specs/W2-need-matching-tier.md)
- **Goal:** Keep cards whose declared role matches a current need; explicit `AIWorthKeeping` always wins.

### W3 ELO-ranked fallback
- **Status:** proposed
- **Depends on:** W2
- **Spec:** [W3-elo-ranked-fallback.md](specs/W3-elo-ranked-fallback.md)
- **Goal:** No card is unconditionally "discard first"; unmatched cards are ranked by ELO.

### W4 Discard ordering parity
- **Status:** proposed
- **Depends on:** W3
- **Spec:** [W4-discard-ordering-parity.md](specs/W4-discard-ordering-parity.md)
- **Goal:** Discard the lowest-ranked fallback card first instead of the first one found.

### W5 Bespoke keep logic cleanup
- **Status:** proposed
- **Depends on:** W4
- **Spec:** [W5-bespoke-logic-cleanup.md](specs/W5-bespoke-logic-cleanup.md)
- **Goal:** Remove keep logic that duplicates a shared need; give Lampades, Sell Out and Tailgate real hooks.

## Principle debt (D)

Existing Runner AI code that breaks a shared principle.

### D1 Retire Runner AI card-title special cases
- **Status:** proposed
- **Depends on:** none
- **Spec:** [D1-retire-runner-title-special-cases.md](specs/D1-retire-runner-title-special-cases.md)
- **Goal:** Replace the title lists and title comparisons in `ai_runner.js` with hooks.

### D2 Injectable randomness for the Runner AI
- **Status:** proposed
- **Depends on:** none
- **Spec:** [D2-injectable-runner-randomness.md](specs/D2-injectable-runner-randomness.md)
- **Goal:** Route Runner AI randomness through an injectable source so decisions are reproducible.

### D3 Close Runner AI information-boundary leaks
- **Status:** proposed
- **Depends on:** none
- **Spec:** [D3-close-runner-information-leaks.md](specs/D3-close-runner-information-leaks.md)
- **Goal:** Stop Runner decisions depending on hidden Corp cards or Stack order; make helpers enforce visibility.
