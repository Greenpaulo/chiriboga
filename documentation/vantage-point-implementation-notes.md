# Vantage Point Implementation Notes

Verified implementation notes for mechanics introduced or confirmed while
completing Batch 1. The external-agent runbook remains authoritative; these
notes supplement it rather than replacing its required repository reading.

## Batch 1 engine support

`phase.js` fires `automaticOnSubroutineResolved` immediately before an unbroken
ice subroutine resolves, passing the ice and subroutine. Take a Dive uses that
hook to record state on its own resolving event, so the state remains correct
if another effect changes the attacked server during the run.

Chain Reaction does not use global properties on `runner`. It tracks successful
central runs on its own card object with `responseOnRunSuccessful`, using
`availableWhenInactive: true` so copies in the Grip receive the update. Its
flags reset at the beginning of either player's turn.

## Confirmed patterns

### Stealth-only payments

`recurringCredits` is the card's refill capacity. The currently available
hosted credits are stored in `card.credits`; spending a stealth credit must
decrement `card.credits`, never `card.recurringCredits`.

Because the source must be chosen, build choices from installed Stealth cards
with at least 1 current credit and use the selected choice's `.card` property:

```js
var choices = ChoicesArrayCards(
  InstalledCards(runner).filter(function (card) {
    return CheckSubType(card, "Stealth") && (card.credits || 0) > 0;
  }),
);

function spendSelectedCredit(params) {
  params.card.credits -= 1;
  UpdateCounters();
}
```

If a source defines `canUseCredits`, also respect that source's restriction.
AI modelling must cap repeated uses by the number of eligible current stealth
credits rather than treating the Runner's general credit pool as stealth.

### Multi-card trash effects

Use `ChoicesInstalledCards(player, CheckTrash)` so forbidden targets are not
offered. For an effect that trashes multiple cards simultaneously, collect the
full selection and pass the array to one `Trash(cards, true, callback, context)`
call. Continue the resolving ability from that callback so trash-prevention and
trash-response phases finish before the next instruction begins.

### Remove from game

Use `RemoveFromGame(this)`. A run event remains in `resolvingCards` during its
run, so its run-success and run-end callbacks remain active until it moves.

### Encounter strength reductions

Return the reduction from `modifyStrength` only for the currently encountered
target, and clear encounter-scoped state in `responseOnEncounterEnds`. The Run
Calculator should model a reduction as a negative modification to the ice, not
as a strength increase to the breaker.

## Batch verification

`tests/vantagepoint-integration.test.js` covers Batch 1 restrictions, target
filtering and sequencing, turn/run/encounter cleanup, stealth payment, and the
bounded Corsair AI strength reduction in addition to set metadata checks.

Run the full command list in `documentation/current-set-implementation.md`
before changing a batch status.
