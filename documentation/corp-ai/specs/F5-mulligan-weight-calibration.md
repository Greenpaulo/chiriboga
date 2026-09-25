# F5 Mulligan weight calibration

**Roadmap item:** F5 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-planning.md` (Acceptance gates, AI options)
**Verified against code:** 376f32c (2026-09-25)

## Goal
Calibrate the Corp's opening-hand score weights and its mulligan margin with
seeded games, instead of the hand-set coefficients in use today. Review
finding 4 fixed the mulligan's logic without the harness. It left weight
calibration as a follow-up because the harness did not exist (finding 04's
Resolution: "retained as calibration follow-up rather than a prerequisite").
Principle 8 says uncalibrated coefficients are not adopted, so the current
weights remain the fallback until evidence replaces them.

## Current behaviour
`Phase_Mulligan()` compares `_openingHandScore(hand)` with
`_expectedOpeningHandScore(HQ + R&D, handSize)`. It mulligans when the hand
scores strictly lower, with no margin. The expectation is hypergeometric over
the known redraw population, which is Corp-known composition and not R&D
order. The coefficients are hand-set:
- **ICE value**, from `_openingHandSummary()`: `max(0.5, 3 - 0.5 × rez
  cost)` per ICE, halved when the rez cost exceeds the Corp's credits.
- **Count values**, from `_openingHandCountValue()`:
  - ICE `[0, 1.5, 2.5]` for 0, 1 and 2 or more;
  - economy `[0, 1.25, 2.25, 2.75]` for 0 to 3 or more;
  - agenda penalty `-[0, 0, 1.5, 4.5, 8, 12]` for 0 to 5 or more.
- **Economy cards**, from `_openingHandEconomyCard()`: Transaction and
  Advertisement subtypes, or `AIEconomyCard === true`.

Deterministic coverage is `tests/corp-mulligan.test.js` and the promoted
mulligan fixture in `tests/fixtures/corp-decisions/`.

## Design
- **Weights as data.** Move the coefficients into one frozen weights object
  (`CORP_AI_MULLIGAN_WEIGHTS_DEFAULT`) and add a mulligan margin `m`: mulligan
  when `handScore < redrawScore - m`. Default `m = 0`. The functions read the
  active weights instead of literals. This step is behaviour-identical.
- **Candidate weights** (`CORP_AI_MULLIGAN_WEIGHTS_CALIBRATED`) are used only
  when the AI option `calibratedMulliganWeights` is on. It defaults to
  `false`, following the AI options convention.
- **Sweep.** Use F4 to run a small grid over the coefficients that plausibly
  matter, with the same seeds and deck pool for every point:
  - the ICE count values;
  - the per-ICE value slope;
  - the second-agenda penalty;
  - the economy count values;
  - the margin `m`.

  Pick the best point on a tuning seed set, then judge the gate on a
  separate, held-out seed set, so the gate does not reward overfitting.
- Record rejected weight sets and their measured effect in
  `documentation/corp-ai/architecture.md` (principle 8).

## Safety and information boundary
- The score reads only HQ and the composition of HQ + R&D. It must never use
  R&D order, and nothing about the Runner's hidden cards.
- No randomness: the decision stays deterministic for a given hand and deck.

## Test scenarios
1. With `calibratedMulliganWeights` off, every existing mulligan test and
   fixture gives the same decision and logged scores as before the weights
   moved into data.
2. With the option on, the calibrated weights are used and the logged reason
   names the weight set.
3. The margin works in both directions. With `m > 0`, a hand scoring just
   below the expectation (by less than `m`) is kept. A hand scoring below it
   by more than `m` is mulliganed.
4. Permuting R&D order with the same composition never changes the decision.

## Acceptance gate
F4 comparison on the committed deck pool, using the held-out seed set,
400 games per deck pair (mulligan effects are small), baseline with the
option off against candidate with the option on:
- **Improvement:** Corp `winRate`, pooled. The lower bound of the 95%
  interval of the difference is above 0.
- **Guard:** `pointsStolen` must not rise by more than 0.10 agenda points per
  game (the interval's upper bound is at most +0.10).
- **Guard:** `gameLength` must not rise by more than 0.5 turns.
- **Report, not guarded:** Corp `mulliganRate`, baseline against candidate.

If no candidate passes, keep the current weights, record the sweep in
`architecture.md`, and park the item.

## Things to consider
- The weights interact with I4 (agenda commitment) and I5 (economy value). A
  later change to either can move the optimum, so re-run the sweep after
  them, not before.
- The economy definition (`AIEconomyCard` and the subtypes) is an input, not
  a weight. Changing it is out of scope.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] `documentation/corp-ai/architecture.md` describes the calibrated weights and any rejected sets.
- [ ] `node tests/run-all-tests.js` passes.
