# D3 Close Runner AI information-boundary leaks

**Roadmap item:** D3 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`

## Goal
Remove the places where the Runner AI's decisions can depend on information a
human Runner could not have, and make the helpers enforce the boundary
themselves instead of relying on every caller.

## Current behaviour
Found while documenting the Runner AI (see
[architecture: what the Runner AI knows](../architecture.md#what-the-runner-ai-knows)):

- `Trash()` in `mechanics.js` calls `LoseInfoAboutHQCards(card)` with the real
  identity of any card trashed from HQ, even when it leaves face down, so the
  Runner's HQ model loses exactly that title.
- `IceAI()` in `runcalculator.js` reads `RezCost(ice) - ice.rezCost` for unseen
  ICE. A code comment argues this only exposes the bonus cost, but a modifier
  that depends on the hidden card changes the estimate.
- `_icebreakerInPileNotInHandOrArray()` is given the Stack by card hooks. Which
  breakers remain is known from the decklist, but which one is returned depends
  on hidden Stack order.
- `_matchingBreakerInstalled()` and `_breakerMatchesIce()` read ICE subtypes
  without a visibility check. Callers in `ai_runner.js` check first; some card
  hooks do not.
- `CalculatePieceBegin()` compares unseen root card titles with Hokusai Grid
  (no practical effect today).

## Design
- When a card leaves HQ face down, update the HQ model only with information
  the Runner saw (for example one fewer card, not a specific title).
- In `IceAI()`, estimate unseen ICE cost modifiers only from public effects, or
  record an explicit decision in `principles.md` if the bonus-cost read is
  judged acceptable.
- Make pile scans used for planning order-independent (for example choose by a
  stable rule such as ELO or title order, not position).
- Move the visibility check into `_matchingBreakerInstalled()` and
  `_breakerMatchesIce()`, or add a visibility-aware wrapper for card hooks.
- Remove the title comparison against unseen root cards.

## Safety and information boundary
This item exists to enforce `documentation/runner-ai/principles.md` §1.

## Test scenarios
1. Trashing a face-down card from HQ changes the Runner's HQ model identically
   whichever hidden card it was.
2. The estimate for an unseen ICE is identical when the hidden ICE is replaced
   by a different ICE with the same public state.
3. A tutor's chosen breaker is identical for two Stack orders with the same
   contents.
4. Breaker-matching helpers return no match for unrezzed, unexposed ICE.
5. Each scenario above runs with at least two different hidden cards and
   asserts identical Runner decisions.

## Acceptance gate
Every listed read is removed, guarded or explicitly accepted in
`principles.md`, and the substitution tests pass.

## Things to consider
`PlayerCanLook()` returns true for everything while the `viewAllFronts` debug
flag is on; tests must run with it off.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
