# W4 Discard ordering parity

**Roadmap item:** W4 · **Depends on:** W3 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Make `_indexOfBestDiscardOption()` discard the lowest-ranked fallback-tier card
first, instead of the first non-member it finds.

## Current behaviour
`_indexOfBestDiscardOption()` discards, in order: a unique card already
installed or duplicated in the Grip; a card not in `cardsWorthKeeping` that
duplicates one already held; any card not in `cardsWorthKeeping` (the first
found); a duplicate of a kept card; otherwise the oldest card. See [architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- Among cards that qualify only through the W3 fallback tier, sort by `elo`
  ascending before the existing duplicate and oldest-card rules.
- Do not reorder cards kept by an explicit `AIWorthKeeping` or a matched need;
  they carry a stronger keep signal than ELO.

## Safety and information boundary
No additional constraints beyond the principles files.

## Test scenarios
1. Of two fallback-only cards, the lower-ELO one is discarded first.
2. A need-matched card is never discarded ahead of a same-ELO fallback-only card.
3. The existing unique-duplicate discard priority is unchanged.

## Acceptance gate
Discard order among otherwise undifferentiated cards is ELO-driven, matching
the Corp's ranking discipline.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
