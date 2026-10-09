# D3 Close Runner AI information-boundary leaks

**Roadmap item:** D3 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`
**Verified against code:** 3c25455 (2026-10-09)

## Implementation plan

Proposed at `3c25455`, 2026-10-09. **Awaiting approval.**

- **Validation:** All five reads confirmed at `3c25455`. Gate classification:
  objective (information-boundary oracle, runner principles §1); the ticket's
  gate was rewritten into the `N/A — deterministic fix (principle 4)` form
  without changing what it demands. Corrections and evidence:
  - `Trash()` (`mechanics.js:553`) calls `LoseInfoAboutHQCards(card)` for every
    card leaving HQ, before `MoveCard`; Corp discards and Corp-effect trashes
    from HQ leave face down, so the title-specific decrement leaks.
  - `IceAI()` (`runcalculator.js:72`) leak is real, not theoretical: unrezzed
    Reverb (`sets/vantagepoint.js`, `modifyRezCost` with
    `availableWhenInactive`) makes `RezCost(ice) - ice.rezCost` negative only
    when the hidden card is Reverb, and `GetCardProperty`'s lower clamp
    (`-printed rezCost`) also depends on the hidden printed cost.
  - `_icebreakerInPileNotInHandOrArray()` has no `ai_runner.js` callers; all
    callers are card hooks (systemgateway, systemupdate2021, uprising,
    vantagepoint, elevation). Stack contents are knowable from the decklist,
    so the defect is order-dependence of the returned card, not content.
    Heap-only callers are public and unaffected.
  - `_matchingBreakerInstalled()` / `_breakerMatchesIce()`: every
    `ai_runner.js` caller and the Leech, Egret, Chromatophores hooks check
    visibility or rezzed first; the unguarded path is the
    `AIMatchingBreakerInstalled` hooks it fans out to. The `AIFixedStrength`
    branch's "strength 3 for unseen ICE" fallback becomes dead after the guard.
  - Hokusai: the title loop in `CalculatePieceBegin()` runs over all root cards
    when `numUnknownCardsInRoot == 0`, which still includes unknown *advanced*
    root cards (they are counted as Clearinghouse/Urtica guesses instead).
    Hokusai is never advanced, so no practical effect, as the ticket says.
- **Approach:**
  1. `Trash()`: if `PlayerCanLook(runner, card)` (accessed, face up or
     `knownToRunner`) keep `LoseInfoAboutHQCards(card)`; otherwise call
     `LoseInfoAboutHQCards(null)` (one fewer unknown card, uncertainty grows
     for all entries), as `Install()` already does.
  2. `IceAI()`: replace the `extraRezCost` read with a new helper in
     `runcalculator.js` that sums `modifyRezCost` triggers only from active
     source cards other than the ICE itself that the knowledge player can look
     at, with no clamp. Visible modifiers in the playable sets (Reina Roja,
     Xanadu, HB: Architects of Tomorrow, Akitaro Watanabe, Tread Lightly, Hype
     Machine, Fransofia Ward) read only public state of the target; listed in
     the Resolution.
  3. `_icebreakerInPileNotInHandOrArray()`: when the pile contains any card
     the Runner cannot look at, work on a copy sorted by title (stable) before
     the existing `SortCardsWorthKeeping` pass, so the result depends only on
     contents. Fully visible piles (Heap) keep current order and behaviour.
     Rejected: ELO-first ordering (a strategic preference, would need a gate).
  4. Add `if (!PlayerCanLook(runner, iceCard))` early returns (`false` /
     `null`) to `_breakerMatchesIce()` and `_matchingBreakerInstalled()`;
     remove the dead unseen-strength fallback.
  5. `CalculatePieceBegin()`: loop over `knownCardsInRoot` instead of
     `data.server.root`. The title comparison itself stays (title special
     cases are D1's scope).
- **Tests:** new `tests/runner-information-boundary.test.js` (no pending
  reproduction exists): one block per scenario 1–4, each run with at least two
  substituted hidden cards asserting identical results (scenario 5), and
  `viewAllFronts` asserted off. Scenario 2 uses Reverb vs another ICE.
- **Risk:** item 2 changes estimates for unseen ICE whenever Reverb is
  installed unrezzed or a hidden modifier exists (intended); item 3 changes
  which tutor target is chosen among equals for Stack tutors (Special Order,
  Mutual Favor, etc.); item 1 changes HQ-model entries after face-down HQ
  trashes. All are boundary corrections, not strategic changes. Check with the
  full suite incl. `tests/decision-snapshots.test.js`; any snapshot change will
  be inspected and reported, not silently re-baselined.
- **Docs:** `documentation/runner-ai/architecture.md` "What the Runner AI
  knows" (remove the closed reads, describe the guards);
  `documentation/ai.md` note that `_matchingBreakerInstalled` /
  `_breakerMatchesIce` now enforce visibility and that
  `_icebreakerInPileNotInHandOrArray` is order-independent for hidden piles;
  roadmap D3 status.

## Goal
Remove the places where the Runner AI's decisions can depend on information a
human Runner could not have, and make the helpers enforce the boundary
themselves instead of relying on every caller.

## Current behaviour
Found while documenting the Runner AI (see
[architecture: what the Runner AI knows](../runner-ai/architecture.md#what-the-runner-ai-knows)):

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
N/A — deterministic fix (principle 4): the Runner information boundary
(`documentation/runner-ai/principles.md` §1). Every listed read is removed,
guarded or explicitly accepted in `principles.md`, and the substitution tests
(identical Runner results for different hidden cards with the same public
state) pass.

## Things to consider
`PlayerCanLook()` returns true for everything while the `viewAllFronts` debug
flag is on; tests must run with it off.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
