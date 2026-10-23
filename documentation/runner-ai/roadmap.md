# Runner AI roadmap

One entry per item. Full specs live in the linked ticket (`ready` and later) or
spec file (`proposed`); how finished work behaves lives in
[architecture.md](architecture.md); rules live in
[../ai-principles.md](../ai-principles.md) and [principles.md](principles.md).
Statuses, IDs and commands are defined in [../ai-planning.md](../ai-planning.md).

- `node scripts/roadmap.js next` lists items (both AIs) whose dependencies are all `done`.
- `node scripts/roadmap.js blockers` lists tickets held by unfinished
  dependencies; add `--fix` to refresh their generated headers.
- `tests/ai-roadmaps.test.js` fails if a status, link, dependency or generated
  blocker header disagrees with the tickets.

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

## Run targeting (T)

Which server should the Runner run, and what risk does it take there?

### T1 Caution with advanced face-down cards
- **Status:** proposed
- **Depends on:** F4
- **Spec:** [T1-advanced-card-trap-caution.md](specs/T1-advanced-card-trap-caution.md)
- **Goal:** Treat an advanced face-down card as possibly a trap, from public information, instead of nearly always running it.

## Principle debt (D)

Existing Runner AI code that breaks a shared principle.

### D1 Retire Runner AI card-title special cases
- **Status:** proposed
- **Depends on:** none
- **Spec:** [D1-retire-runner-title-special-cases.md](specs/D1-retire-runner-title-special-cases.md)
- **Goal:** Replace the title lists and title comparisons in `ai_runner.js` with hooks.

### Done

| ID | Item | Delivered by | Architecture |
|---|---|---|---|
| D2 | Injectable randomness for the Runner AI | [D2-injectable-runner-randomness](../backlog/done/D2-injectable-runner-randomness.md) | [run selection](architecture.md#run-selection-and-the-run-calculator) |
| D3 | Close Runner AI information-boundary leaks | [D3-close-runner-information-leaks](../backlog/done/D3-close-runner-information-leaks.md) | [what the Runner AI knows](architecture.md#what-the-runner-ai-knows) |
