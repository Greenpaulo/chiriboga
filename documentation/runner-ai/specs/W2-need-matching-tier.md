# W2 Need-matching tier in keep decisions

**Roadmap item:** W2 · **Depends on:** W1 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Keep cards whose declared role matches a current need, as a tier behind
explicit `AIWorthKeeping` and ahead of the fallback, so intent hooks stop being
dead code.

## Current behaviour
Intent hooks (`AIEconomyInstall`, `AIEconomyPlay`, `AIDrawInstall`,
`AIDrawTrigger`) are only read for cards already judged worth keeping, so a
card with an intent hook but no `AIWorthKeeping` is never kept. The generated
list is in `documentation/card-status.md`. See
[architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- A card with no `AIWorthKeeping` and a declared `AIEconomyInstall` or
  `AIEconomyPlay` is kept when `needEconomy` is true.
- A card with no `AIWorthKeeping` and a declared `AIDrawInstall` or
  `AIDrawTrigger` is kept when `needDraw` is true.
- A card with an `Icebreaker` subtype that can cover a server in
  `lockedOutServers` is kept, alongside the existing generic breaker checklist.
- Explicit `AIWorthKeeping`, where present, is checked first and always wins,
  including over the subtype fallback (area rule 2).

## Safety and information boundary
Locked-out-server matching uses only public Corp information.

## Test scenarios
1. Each card listed in `documentation/card-status.md` as having an intent hook
   but no `AIWorthKeeping` is kept exactly when its matching need is true, and
   excluded when it is false and no other tier applies.
2. A card whose `AIWorthKeeping` returns `false` stays excluded even when a
   matching need or subtype fallback applies.
3. A card that matches a need but fails `_wastefulToInstall()` stays excluded.
4. Locked-out-server matching does not change when hidden Corp cards are
   substituted.

## Acceptance gate
The W0 baseline fixtures show only the intended new inclusions, and no
previously included card is excluded except where an explicit `false` now wins
over the subtype fallback.

## Things to consider
Making explicit `false` win over the subtype fallback changes current
behaviour for any card whose hook returns `false` while it has a breaker or
console subtype. List those cards in the Resolution.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
