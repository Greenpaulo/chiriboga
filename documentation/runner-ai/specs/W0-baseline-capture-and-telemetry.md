# W0 Baseline capture and keep/discard telemetry

**Roadmap item:** W0 · **Depends on:** none · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/runner-ai/principles.md`, `documentation/runner-ai/specs/hand-keep-design.md`

## Goal
Record current keep and discard behaviour before changing it, so later W items
can tell intended changes from unintended ones.

## Current behaviour
`_cardsWorthKeeping()` includes a card only through an explicit
`AIWorthKeeping` or the subtype fallback, and `_indexOfBestDiscardOption()`
discards non-members early. Nothing records why a card was included or
excluded. See [architecture: keep and discard decisions](../architecture.md#keep-and-discard-decisions).

## Design
- Add opt-in structured logging around `_cardsWorthKeeping()` and
  `_indexOfBestDiscardOption()`: which cards were included or excluded and why
  (explicit hook result, subtype fallback, or neither).
- Create deterministic fixtures for representative hands across the playable
  sets, including the cards `documentation/card-status.md` lists as having an
  intent hook but no `AIWorthKeeping`, and Lampades, Sell Out and Tailgate.
- Create `tests/runner-worth-keeping.test.js` for these fixtures.

## Safety and information boundary
Logging must not inspect hidden Corp cards, alter decisions, consume randomness
or be enabled by default.

## Test scenarios
1. Fixed hands produce stable snapshots of current keep/discard membership.
2. Enabling logging does not change any keep or discard result.
3. Each exclusion is recorded with its reason.

## Acceptance gate
Fixed test states produce stable snapshots of current keep/discard membership,
sufficient to detect intended versus unintended changes in later items.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The side's `architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
