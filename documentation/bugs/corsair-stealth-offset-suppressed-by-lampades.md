# Corp AI and Runner AI: Lampades installed before Corsair hides Corsair's stealth credits from credit planning

**Source:** code inspection while documenting AI hooks (no debug log)
**Reproduction:** `tests/pending/corsair-stealth-offset-suppressed-by-lampades.test.js` — `node tests/pending/corsair-stealth-offset-suppressed-by-lampades.test.js` (fails at `ef6da52`, 2026-09-25)

## Summary

Corsair's `AIRunPoolCreditOffset` reports the stealth credits it can spend on
its barrier reduction, but only when it is the first installed card marked
`AIUsesStealthCredits`. The check is meant to stop two copies of Corsair
counting the same credits twice. Lampades carries the same marker without
providing an offset, so when Lampades was installed before Corsair, neither card
reports the credits. The Corp then underestimates the Runner's credits when
judging server security, and the Runner AI underestimates its own. Today the
only affected source is Cloak, and Vantage Point is still hidden, so there is no
live-game impact yet.

## Evidence

Corsair's offset, `sets/vantagepoint.js` (`cardSet[36004].AIRunPoolCreditOffset`):

```js
var installedCorsairs = InstalledCards(runner).filter(function (card) {
  return card.AIUsesStealthCredits;
});
if (installedCorsairs[0] != this) return 0;
```

Lampades (`cardSet[36005]`) also declares `AIUsesStealthCredits: true`, because
its access-trash ability is paid only with stealth credits. `InstalledCards()`
returns Runner programs in install order, so the first "Corsair" found is
whichever of the two was installed first.

## Reproduction

The test loads the real `CorpAI`, Corsair, Lampades and Cloak definitions, then
reads `_effectiveRunnerCreditPool(remote).recurringCredits` with Cloak holding 1
credit:

| Installed programs (in order) | Expected | Actual |
|---|---:|---:|
| Corsair, Lampades, Cloak | 1 | 1 |
| Corsair, Corsair, Cloak | 1 | 1 |
| Lampades, Corsair, Cloak | 1 | **0** |

A fourth case calls Corsair's hook directly in the failing order and gets 0
instead of 1. The two passing rows are controls: they show the test setup is
sound and that the de-duplication must keep working.

## Root cause

- [Verified] With Lampades installed before Corsair, the Corp's effective
  Runner credit pool loses Cloak's credit. In the reverse order it is counted.
  (Reproduction, cases 1 and 3.)
- [Verified] Corsair's `AIRunPoolCreditOffset` returns 0 in that order, because
  `installedCorsairs[0]` is Lampades. (Reproduction, case 4.)
- [Verified] The first-copy check correctly stops two Corsairs double counting,
  so it cannot simply be removed. (Reproduction, case 2.)
- [Verified] Cloak (`sets/creationandcontrol.js`, 3041) is currently the only
  installed Stealth card with credits and no `canUseCredits` hook, the only kind
  of source the offset reports. This comes from a scan of `sets/*.js` for Stealth
  cards with credits.
- [Inferred] Corsair's `AIImplementBreaker` still charges one pool credit for
  each stealth-funded -3 reduction (`reduction.runner_credits_spent += 1`). So
  when the offset is missing, each reduction costs a real credit in planning
  instead of Cloak's credit.
- [Inferred] Runner AI run planning has the same shortfall: `ai_runner.js` adds
  up every active card's `AIRunPoolCreditOffset` into `poolCreditOffset`.

## Proposed fix

Choose which card reports by identifying copies of Corsair, not "any card that
spends stealth credits". The engine creates cards with
`jQuery.extend(true, {}, definition)` (`decks.js` `InstanceCard()`), which
shares function references, so every Corsair copy has the same offset function:

```js
var reportingCopies = InstalledCards(runner).filter(function (card) {
  return card.AIRunPoolCreditOffset === corsair.AIRunPoolCreditOffset;
});
if (reportingCopies[0] != this) return 0;
```

- [Verified] Patching this in memory makes all four reproduction cases pass,
  including the two-Corsair control.

Rejected alternatives:

- **Remove the marker from Lampades.** This hides the symptom, but the marker is
  accurate for Lampades, and the next card with a stealth-only ability would
  bring the bug back.
- **Compare card titles.** This is not allowed by the roadmap's
  no-hardcoded-titles principle.
- **Count stealth-only credits once, centrally, in the evaluator.** This is a
  larger design change. It's worth doing if more cards start consuming
  stealth-only credits during runs, but it's not needed for this bug.

The `modification.use.AIUsesStealthCredits` check in Corsair's
`AIImplementBreaker` was reviewed and is fine. It counts reductions already paid
for from the shared stealth credits, and Lampades never creates strength
reductions.

## Acceptance criteria

- [ ] The reproduction passes and moves to
      `tests/corsair-stealth-offset-suppressed-by-lampades.test.js`, with its
      expectations unchanged.
- [ ] `AIUsesStealthCredits` is documented in `documentation/ai.md` (§4.20 Run
      Credit Sources): it marks a card with an ability payable only with stealth
      credits, and it does not identify Corsair. Remove it from
      `LEGACY_UNDOCUMENTED` in `tests/ai-hook-docs.test.js`, including the
      comment about this bug.
- [ ] No card-title checks are added.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related

- **Cloak has no `canUseCredits` hook.** Its printed text says "Use this credit
  to pay for using icebreakers", but in play the credit can only be spent by
  stealth-only abilities such as Corsair's. This falls under the "Hosted &
  Recurring Credit Pools" check in
  `documentation/new-sets/creation_and_control_audit.md` and deserves its own
  ticket. If Cloak gets `canUseCredits("using", icebreaker)`, the generic
  hosted-credit path will count it, and Corsair's offset would have no remaining
  source. At that point, decide whether the offset is still needed.
