# Corp AI and Runner AI: Sang Kancil and Principia have no AI breaker hook, so the Corp thinks stronger ICE is unbreakable

**Outcome:** adopted

## Resolution

Implemented from `8a5b04a`, 2026-10-12, following the plan approved in this
conversation.

Replaced the two unused card hooks with the existing `AIImplementBreaker`
contract. Both Corp pricing and Runner pump/break paths now use the legal
subtype, +2 strength boost and one-credit break costs. Sang Kancil's pump
cost is 1 credit with an active Run event or an explicitly modeled prospective
Run event; otherwise it is 3. Principia's pump costs 2. Corp pricing still
uses a separate calculator and does not receive the private prospective-event
discount. No shared evaluator, gameplay ability, install-cost or AI-option
changes were needed. This is the deterministic legality/ability-cost fix
classified in the plan, with no strategic adoption gate.

Moved the newly created reproduction from
`tests/pending/sang-kancil-and-principia-priced-as-unbreakable.test.js` to
`tests/sang-kancil-and-principia-priced-as-unbreakable.test.js`. Assertions and
expectations were preserved. During verification, real break edges reached
`RunCalculator.SrBreak` and exposed a missing `k_combinations` harness helper;
the test now loads that actual helper from `utility.js`, without changing any
assertions. The exact green test, replayed with only `sets/elevation.js`
substituted from starting commit `8a5b04a`, still reports the original 6 passed,
9 failed cases. With the fix it reports 15 passed, 0 failed. The original
pending file was never committed, so `ticket.js check` cannot compare its Git
history; this baseline replay supplies independent red/green evidence without
creating a commit or modifying workflow checks.

Documented both hooks in `documentation/ai.md`, removed the dead legacy hook
exemption, and regenerated `documentation/card-status.md`. Architecture:
[Corp server security](../../corp-ai/architecture.md#server-security-evaluation)
and [Runner run calculation](../../runner-ai/architecture.md#run-selection-and-the-run-calculator).

Validation:
- `node tests/sang-kancil-and-principia-priced-as-unbreakable.test.js`:
  15 passed, 0 failed.
- `node tests/ai-hook-docs.test.js`: 127 hooks checked; 39 legacy exceptions.
- `node tests/run-all-tests.js`: all 81 test files passed, including
  `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.

The broad L9.1 unpriceable-breaker evaluator change and stale printed-value
comments remain outside this fix. The user's existing merge-plan edits were
left untouched. No code deviations from the approved plan.

## Implementation plan

Proposed at `8a5b04a`, 2026-10-12. **Approved 2026-10-12.**

- **Validation:** The new pending reproduction runs the real Corp evaluator and
  follows real Runner `RunCalculator.IceAct` pump/break edges. It reports
  6 passed and 9 failed cases. Baseline `node tests/run-all-tests.js` passes
  all 80 test files, including Corp decision fixtures and decision snapshots.
  Both strength-4 matching ICE produce false
  lockouts and neither breaker offers a Runner break path. Low-strength,
  insufficient-credit and wrong-subtype controls pass. This is an objective
  ability-cost/legality oracle, not a preference among legal plays; no seeded
  strategic gate is needed. Both dead hooks have no consumer. The proposed
  costs agree with the gameplay abilities. The proposed Sang Kancil hook needs
  one refinement: checking only `runEventIsActive()` misses prospective Run
  events, which `RunnerAI._commonRunCalculationChecksAsync` supplies through `rc.runEvent`
  before they enter `runner.resolvingCards` (`ai_runner.js`, assignment before
  calculation). The pending prospective-event case demonstrates the required
  two-credit pump-plus-break path. The ticket's claim of four playable sets
  is stale: `documentation/card-sets.md` lists three; Vantage Point is
  in-progress. This does not affect these two Elevation cards.
- **Approach:** Replace only the two dead card hooks in `sets/elevation.js` with
  implementations of the existing `AIImplementBreaker` contract, returning
  the accumulator with `rc.ImplementIcebreaker` options appended. Sang Kancil:
  Code Gate, +2 strength for 3 credits or 1 while a Run event is active or is
  the calculator's prospective Run event, 1 credit per subroutine. Principia:
  Barrier, +2 strength for 2 credits, 1 credit per subroutine. Check the
  prospective card's event type and Run subtype. The Corp uses its own
  calculator and must receive no discount from the Runner's private planned
  event. No shared evaluator change, new hook contract, card-title checks or
  AI option. A property rename alone would retain the wrong hook signature;
  adding card text would leave Runner calculation unsupported.
- **Tests:** Preserve and move
  `tests/pending/sang-kancil-and-principia-priced-as-unbreakable.test.js`
  into `tests/` once it passes unchanged. Its 15 cases cover the four original
  rows, Runner pump/break paths, insufficient credits, wrong subtypes,
  multiple pumps/subroutines, active Run and non-Run events, and prospective
  Run-event pricing with a separate public Corp price. Run the focused test,
  hook-doc checks and `node tests/run-all-tests.js`, including Corp decision
  fixtures and decision snapshots.
- **Risk:** These hooks affect both Corp pricing and Runner run simulation.
  Tests exercise their existing consumers and budget boundaries. The discount
  reads only the active public event or the Runner calculator's explicit
  hypothetical event. Leave install costs, gameplay abilities and the broader
  L9.1 unpriceable-breaker work unchanged.
- **Docs:** Document both hooks in `documentation/ai.md`; remove the unused
  `AIImplementIcebreaker` legacy exemption in `tests/ai-hook-docs.test.js`;
  update the Corp server-security and Runner run-calculator architecture
  sections; regenerate `documentation/card-status.md` with its script.
  Record the resolution and move/check this ticket through `ticket.js` after
  verification. Leave the user's existing merge-plan change untouched.

**Source:** code inspection while verifying the Corp AI known limits for L9 (no debug log)
**Reproduction:** `tests/pending/sang-kancil-and-principia-priced-as-unbreakable.test.js` (fails at `8a5b04a`, 2026-10-12: 6 passed, 9 failed); green path `tests/sang-kancil-and-principia-priced-as-unbreakable.test.js` — `node tests/sang-kancil-and-principia-priced-as-unbreakable.test.js` passes all 15 cases, 2026-10-12.

## Summary

Sang Kancil (Decoder) and Principia (Fracter), both in `elevation.js` (a
playable set), define their break and pump abilities but no
`AIImplementBreaker` hook and no `cardText`. The Corp prices breakers through
`AIImplementBreaker` and falls back to `cardText` patterns; with neither, any
ICE stronger than the breaker is priced at `Infinity`, and the Corp reports the
server as a hard lockout even when the Runner can easily pay to get in. The
Runner AI's `RunCalculator` also reads breaker behaviour only from
`AIImplementBreaker`, so it probably cannot plan breaks with these two cards.

## Additional evidence — 2026-10-02

Found while adding required-hook checks to `scripts/card-status.js`
(`documentation/card-status.md` now lists both cards as "icebreaker without
`AIImplementBreaker` or `AISpecialBreaker`").

- [Verified] Both cards do define an AI hook, under the wrong name:
  `AIImplementIcebreaker` (`sets/elevation.js`, Sang Kancil and Principia).
  Nothing reads that name: `rg -n "AIImplementIcebreaker"` finds only the two
  definitions and the `LEGACY_UNDOCUMENTED` list in
  `tests/ai-hook-docs.test.js`.
- [Verified] The dead hook also has the wrong shape for the real contract: it
  takes no arguments and returns `{breakCost, boostCost, boostAmount}` (for
  Sang Kancil `{1, 3, 2}`), while `AIImplementBreaker` receives the run
  calculator and adds break and pump options through it (`documentation/ai.md`
  §4.1). So the fix is to write a proper `AIImplementBreaker` for each card,
  not to rename the property. Then delete `AIImplementIcebreaker` from
  `LEGACY_UNDOCUMENTED`.

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
- [Verified] The Runner calculator offers no pump/break path with either card
  through strength-4 matching ICE, demonstrated by the pending reproduction.
  `RunCalculator.IceAct` has no fallback for breakers without the hook.

## Proposed fix

Add `AIImplementBreaker` to both cards, following the standard pattern (for
example Buzzsaw in `systemgateway.js`), calling `rc.ImplementIcebreaker` with
the printed costs: Sang Kancil `["Code Gate"]`, pump 3 for +2 (1 while
`runEventIsActive()`), break 1 for 1; Principia `["Barrier"]`, pump 2 for +2,
break 1 for 1. The general gap (any breaker the Corp cannot price counts as
unbreakable) is roadmap item L9, scenario 1; this ticket fixes only the two
cards.

## Acceptance gate

N/A — deterministic fix (principle 4): model the cards' legal strength boosts,
subtype restrictions and credit costs exactly, including Sang Kancil's active
or prospective Run-event discount. Paid break paths must fit their credit
budget; affordable matching ETR ICE must not be classified as a hard lockout
because the legal pump/break abilities are missing from the model.

## Acceptance criteria

- [x] A deterministic test reproduces the four rows above with the expected
      values and passes in the green suite (`tests/`).
- [x] A Runner AI test shows `RunCalculator` finds a break path through a
      strength-4 matching ICE with each card.
- [x] Sang Kancil costs 2 credits to pump and break strength-4 matching ICE
      with an active or prospective Run event; non-Run events grant no discount,
      and a private prospective event does not reduce the Corp public price.
- [x] No card-title checks are added.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related

- **Printed values.** The comment header above each definition disagrees with
  the object (Sang Kancil: header "Cost: 4, Strength: 1", object
  `installCost: 3`, `strength: 2`; Principia: header "Cost: 6", object
  `installCost: 4`). Check against the card data before relying on either.
- L9 (run-simulation fidelity) owns the evaluator change so that a future
  unpriceable breaker never produces a hard lockout.
