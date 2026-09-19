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
    return CheckSubType(card, 'Stealth') && (card.credits || 0) > 0;
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

Run the full command list in `documentation/new-sets/current-set-implementation.md`
before changing a batch status.

## Batch 2 engine support

Archives cards are now turned faceup together when Archives is breached.
`automaticOnArchivesCardsTurnedFaceUp` receives that group once, which lets
Nurse Hạnh distinguish one card from two or more without access-choice
enumeration mutating game state.

`Trash([], ..., callback, context)` now invokes its continuation callback.
This preserves ordered instructions after fully prevented damage: Stick and
Poke's added subroutine still draws 1 card when its 1 net damage is prevented.

## Batch 2 confirmed patterns

Lampades pays the accessed card's printed rez or play cost from currently
hosted credits on eligible Stealth cards. Multi-credit payments can be split
across sources, and agendas are not eligible because they have neither printed
rez nor play cost.

Hackerspace exposes matching cards as normal hosted install destinations. The
install-cost pipeline receives that destination, so its one-credit modifier
applies to installs onto Hackerspace—including card-effect installs—without
discounting ordinary resource installs. Its hand-size modifier independently
checks the hosted Companion and Connection subtypes.

Stick and Poke inserts its temporary subroutine at index 0 and removes that
exact object at encounter end, including if the resource becomes inactive
during the encounter. Corp route planning models the immediately relevant net
damage; the Run Calculator has no draw effect token, so its accompanying draw
is deliberately not represented as damage prevention.

`tests/vantagepoint-integration.test.js` covers Batch 2 payments and negative
access cases, hosted-install eligibility and discount scope, hand-size state,
grouped Archives draws and AI timing, and temporary-subroutine ordering,
turn reset, cleanup and route modelling.

## Batch 3 engine support

`ChoicesTriggerableAbilities` now recognizes `corpAbilities` on active Runner
cards, mirroring the existing `runnerAbilities` path on Corp cards. Rotary uses
this to expose its Corp-controlled click ability without making the whole card
active for the opponent.

Runs now include `responseOnWouldApproachServer` immediately before the normal
approach-server phase. Baker uses this decision-safe window to choose and pay
for a redirect; the destination's approach phase is then initialized normally,
so its approach triggers see the changed attacked server.

## Batch 3 confirmed patterns

Kompromat remains active through its initiated run, records success, gives the
Corp the derez-or-bad-publicity choice at run end and then removes itself from
the game. Tailgate uses `modifyPlayCost` while inactive and the established
successful-run `modifyBreachAccess` pattern.

Underdome Irregulars tracks ice rez events while inactive so installing it
later in the same Runner turn does not lose public history. Its state resets at
turn boundaries, and the action-phase-end effect handles draw, tag removal and
self-trash branches explicitly.

`tests/vantagepoint-integration.test.js` covers Batch 3 costs, restrictions,
choices, run and turn cleanup, current Stealth-credit spending, redirect and
central-pressure AI hooks, plus the two shared engine paths above.
