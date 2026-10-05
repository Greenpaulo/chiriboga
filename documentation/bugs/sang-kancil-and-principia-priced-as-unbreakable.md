# Corp AI and Runner AI: Sang Kancil and Principia have no AI breaker hook, so the Corp thinks stronger ICE is unbreakable

**Source:** code inspection while verifying the Corp AI known limits for L9 (no debug log)
**Reproduction:** none written yet (no pending test). The harness check under Reproduction can become `tests/pending/sang-kancil-and-principia-priced-as-unbreakable.test.js`. Checked at `376f32c`, 2026-09-25.

## Summary

Sang Kancil (Decoder) and Principia (Fracter), both in `elevation.js` (a
playable set), define their break and pump abilities but no
`AIImplementBreaker` hook and no `cardText`. The Corp prices breakers through
`AIImplementBreaker` and falls back to `cardText` patterns; with neither, any
ICE stronger than the breaker is priced at `Infinity`, and the Corp reports the
server as a hard lockout even when the Runner can easily pay to get in. The
Runner AI's `RunCalculator` also reads breaker behaviour only from
`AIImplementBreaker`, so it probably cannot plan breaks with these two cards.

## Evidence

- `node scripts/show.js card 35020` (Sang Kancil) and `node scripts/show.js
  card 35032` (Principia): abilities "Break 1 code gate/barrier subroutine"
  (1 credit) and "+2 strength" (3 credits, or 1 while a run event is active,
  for Sang Kancil; 2 credits for Principia). Neither block contains
  `AIImplementBreaker` or `cardText`.
- `ai_corp.js`, `_breakerActivationCost()`: with no `AIImplementBreaker`, the
  text fallback reads `breaker.cardText || ""`; with no pump pattern and a
  positive strength gap it returns `Infinity`.
- `runcalculator.js`: breaker-specific options are added only
  `if (typeof card.AIImplementBreaker == "function")`.

## Reproduction

In the `tests/corp-server-security.test.js` harness, install the card for the
Runner with 30 credits and evaluate a one-ICE server whose ICE has the matching
subtype and one ETR subroutine:

| Breaker | ICE strength | Expected | Actual |
|---|---:|---|---|
| Sang Kancil | 1 | not secure, mandatory 1–2 | not secure, mandatory 2 |
| Sang Kancil | 4 | not secure, mandatory 4 (3 pump + 1 break) | **secure, mandatory `Infinity`** |
| Principia | 1 | not secure, mandatory 1–2 | not secure, mandatory 2 |
| Principia | 4 | not secure, mandatory 3 (2 pump + 1 break) | **secure, mandatory `Infinity`** |

The strength-1 rows are controls: at or below the breaker's strength the text
fallback's default price (2 per subroutine) applies.

## Root cause

- [Verified] Both cards lack `AIImplementBreaker` and `cardText` (Evidence).
- [Verified] The Corp reports a strength-4 matching ICE as a hard lockout
  against either card with 30 Runner credits (Reproduction).
- [Verified] A scan of the four playable sets found no other card with an
  `Icebreaker` subtype and no `AIImplementBreaker`.
- [Inferred] The Runner AI cannot plan breaks with either card, because
  `RunCalculator` has no fallback for breakers without the hook.

## Proposed fix

Add `AIImplementBreaker` to both cards, following the standard pattern (for
example Buzzsaw in `systemgateway.js`), calling `rc.ImplementIcebreaker` with
the printed costs: Sang Kancil `["Code Gate"]`, pump 3 for +2 (1 while
`runEventIsActive()`), break 1 for 1; Principia `["Barrier"]`, pump 2 for +2,
break 1 for 1. The general gap (any breaker the Corp cannot price counts as
unbreakable) is roadmap item L9, scenario 1; this ticket fixes only the two
cards.

## Acceptance criteria

- [ ] A deterministic test reproduces the four rows above with the expected
      values and passes in the green suite (`tests/`).
- [ ] A Runner AI test shows `RunCalculator` finds a break path through a
      strength-4 matching ICE with each card.
- [ ] No card-title checks are added.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

- **Printed values.** The comment header above each definition disagrees with
  the object (Sang Kancil: header "Cost: 4, Strength: 1", object
  `installCost: 3`, `strength: 2`; Principia: header "Cost: 6", object
  `installCost: 4`). Check against the card data before relying on either.
- L9 (run-simulation fidelity) owns the evaluator change so that a future
  unpriceable breaker never produces a hard lockout.
