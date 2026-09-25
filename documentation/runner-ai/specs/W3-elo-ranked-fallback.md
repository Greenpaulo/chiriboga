# W3 ELO-ranked fallback

**Roadmap item:** W3 · **Depends on:** W2 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Replace the remaining hard exclusion with a ranking, like the Corp's final
fallback, so no card is unconditionally "discard first".

## Current behaviour
A card that matches neither an explicit hook nor the subtype fallback is
excluded from `cardsWorthKeeping`, which gates the mulligan, the economy scan,
install ordering and discard priority. The generated "neither" list is in
`documentation/card-status.md`. See
[architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- A card matching no explicit hook, matched need or subtype fallback is
  included in `cardsWorthKeeping` and tagged as fallback-tier.
- Rank only; add no threshold constant.

## Safety and information boundary
No additional constraints beyond the principles files.

## Test scenarios
1. Fallback-tier cards are in `cardsWorthKeeping` and available to the generic
   decision loop.
2. A very low-ELO card with no declared role is discarded before a
   moderate-ELO fallback card competing for the same slot (with W4).
3. A mulligan decision that previously found nothing worth keeping only because
   of missing hooks now reflects actual hand quality.

## Acceptance gate
No Runner Grip card in the playable sets is unconditionally excluded from
`cardsWorthKeeping`: every card is hook-gated, need-matched or fallback-ranked,
as `documentation/card-status.md` can show.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
