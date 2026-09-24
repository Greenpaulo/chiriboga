# Vantage Point Implementation Notes

Verified implementation notes for mechanics introduced or confirmed while
completing Batch 1. The external-agent runbook remains authoritative; these
notes supplement it rather than replacing its required repository reading.

## Batch 1 engine support

`phase.js` fires `automaticOnSubroutineFiring` immediately before an unbroken
ice subroutine starts resolving, passing the ice and subroutine. Take a Dive
uses that hook to record state on its own resolving event, so the state remains
correct if another effect changes the attacked server during the run.

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

## Batch 4 engine support

`CreditPoolCanBeUsed` lets an active card prevent credit-pool spending or loss
without hiding the pool's actual value or disabling eligible hosted and Runner
temporary credits. Aircheck uses `preventCreditPoolUse` only while its event is
active. The focused credit-pool regression covers affordability, spending,
loss and unchanged ordinary behavior. N-Pot's Runner-paid break ability now
uses `SpendCredits`, so it consumes eligible hosted credits and cannot bypass
the lock with a direct pool deduction.

The run-end phase fires `automaticOnRunEndCleanup` after all run-end responses
and after clearing the completed run's global state. Aircheck records the
optional remote target in its response, then starts that run from the cleanup
hook so no run-end responses are skipped and the new run is not overwritten by
the old phase transition.

Runner tutor planning now consistently reads the local array returned by
`AIIcebreakerTutor`; the previous `this.tutorableIcebreakers` typo was dormant
until Beta Build supplied eligible candidates.

## Batch 4 confirmed patterns

Hiram marks the current top card of R&D as known to the Runner after a Runner
hardware install or trash, including hardware trashed from a non-installed
location. Non-hardware events and empty R&D do not trigger the look.

Aircheck restricts its first run to HQ or R&D, supplies four hosted credits,
locks only the ordinary credit pool, and offers an optional remote run only
after a successful first run. Its paired run-calculation hooks exclude the
inaccessible pool and restore the exact hypothetical state afterward.

Beta Build searches only installable non-virus programs, shuffles before the
cost-free install, begins the selected run after installation completes and
returns the same program to the top of the stack at run end only if it remained
installed. Its tutor hook exposes eligible non-virus icebreakers to route
planning.

Methuselah is a unique +1 MU console. At each run start it can trash hardware
from the grip as an unpreventable conditional cost to place two hosted credits,
which are usable during runs. Its AI install, fuel-selection and route-credit
hooks avoid treating unrelated grip cards as valid fuel.

`tests/vantagepoint-integration.test.js` covers Batch 4 triggers, restrictions,
run chaining and cleanup, tutor filtering and temporary-install cleanup, hosted
credits and AI hooks. `tests/credit-pool-lock.test.js` covers the shared credit
availability, spending and loss behavior.

## Batch 5 engine support

`ChoicesForfeitableAgendas` is the shared source for forfeit choices. Cards
marked `cannotForfeit` are omitted from optional and mandatory rez costs and
Data Dealer, and `Forfeit` rejects a direct attempt as a final safeguard. Corp
AI chooses from the actual legal option list rather than indexing the complete
score area. `tests/forfeit-restriction.test.js` covers both choice filtering and
resolution.

## Batch 5 confirmed patterns

Touchstone observes event plays while inactive so installing it after the
first event of a turn cannot retroactively earn a credit. Its hosted credits
are available only during runs and its public route model reports the current
credit count.

Read-Write Share marks facedown hosted grip cards as not installed. Its trash
ability detaches and moves them before paying the self-trash cost, preventing
the normal hosted-card cleanup from trashing cards that must be shuffled into
the Stack.

Sipa checks the current outermost ICE at the pass-ICE response window and
requires at least one subroutine with every subroutine broken. Its exchange
preserves card positions, hosted cards and a remote that would otherwise be
briefly empty during the two moves. Runner AI accepts the optional swap only
when it can replace the passed ICE with a lower-valued installed ICE.

Stowaway uses the normal hosted-program install path with an ICE-only
`installOnlyOn` predicate. Its successful-run reward compares the attacked
server with its host's current server, so moving the host moves the reward.

Word on the Street records Corp installs while inactive. During the
pre-scoring window it pays the additional cost for an agenda installed that
turn by moving itself to the Corp score area as a non-forfeitable −1-point
agenda. Scoring an older agenda instead triggers the normal preventable trash
sequence before gaining credits and drawing.

`tests/vantagepoint-integration.test.js` covers Batch 5 first-event tracking,
hosting limits and cleanup, fully-broken ICE swaps, Trojan server matching,
scoring branches, cleanup and AI valuation hooks.
