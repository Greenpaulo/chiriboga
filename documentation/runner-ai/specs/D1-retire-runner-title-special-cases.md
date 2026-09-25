# D1 Retire Runner AI card-title special cases

**Roadmap item:** D1 · **Depends on:** none · **Sets:** the sets containing the listed cards
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`

## Goal
Replace the card-title lists and title comparisons in `ai_runner.js` with
declarative hooks, so new cards work without editing the AI.

## Current behaviour
The constructor hard-codes `economyPlay` (Sure Gamble, Creative Commission,
Wildcat Strike) and `maxHandIncreasers` (T400 Memory Diamond), and the decision
code compares titles directly: Corporate Town, Conduit (in the Heap),
Clearinghouse, PAD Campaign, Regolith Mining License, Nico Campaign and Marilyn
Campaign (Corp assets valued when choosing what to trash or run). See
[architecture: installing and playing cards](../architecture.md#installing-and-playing-cards).

## Design
- Replace `economyPlay` with the existing `AIEconomyPlay` hook on the cards.
- Replace `maxHandIncreasers` with a hook declaring a maximum-hand-size
  increase, documented in `documentation/ai.md`.
- Replace the Corp asset title checks with a Corp-card hook describing the
  asset's value to trash or deny, documented in `documentation/ai.md`.
- Replace the Conduit Heap check with a hook on the card.
- Migrate one group at a time; each group's cards declare the hook in the same
  change.

## Safety and information boundary
Hooks on Corp cards may only be consulted when the Runner can see the card
(rezzed, faceup or accessed).

## Test scenarios
1. Each migrated behaviour is unchanged for the listed cards.
2. A new card declaring the hook gets the behaviour with no `ai_runner.js` edit.
3. No title comparison or title list remains for a migrated group.

## Acceptance gate
Every row above is migrated or deleted, and existing Runner behaviour for the
listed cards is unchanged.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
