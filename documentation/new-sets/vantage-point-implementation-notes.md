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

## Batch 6 engine support

`PlayClickCost` centralizes the click cost to play an operation or event. A
Double starts at 2 clicks and active `modifyPlayClickCost` effects can change
that value. Both play-action legality and payment use the helper, allowing
Synchrocyclotron to make the first Double operation cost 1 click even when the
Corp has only that click remaining.

`StealCost` combines an accessed agenda's printed `stealCost` with active
`modifyStealCost` effects. Access checks require both the returned credits and
clicks, and steal resolution pays them before moving the agenda. This activates
the previously unused credit-cost hook on The Source while supporting Méliès
City Luxury Line's printed click cost.

## Batch 6 confirmed patterns

Synchrocyclotron observes Double operations while inactive, because the first
Double played earlier in the turn consumes its discount even if the asset is
rezzed later. Its state resets at either turn boundary.

Ansel 2.0 exposes its click-break as a Runner-controlled ability on Corp ICE.
The two clicks are lost before the first selected subroutine is broken, then
the Runner may select one remaining subroutine or stop. Its four subroutines
handle no-target cases, preventable installed-card trashing, heap removal,
normal paid installs from HQ or Archives, and ending the run. The Run Calculator
models the exact two-click/up-to-two-subroutine exchange.

Reverb's self-only rez modifier is available while inactive and counts every
other installed unrezzed piece of ICE. Sleipnir presents explicit decline
choices for both optional subroutines and suppresses the draw choice when R&D
is empty.

`tests/vantagepoint-integration.test.js` covers Batch 6 scoring, first-Double
tracking, Runner-controlled breaks, target selection, install cancellation,
dynamic rez cost, optional draw/recursion, and ICE AI models.
`tests/play-and-steal-cost.test.js` covers the shared play-click and steal-cost
helpers, affordability failures and action-phase payment integration.

## Batch 7 engine support

The Run Calculator now passes remaining clicks to `AIIceSpecificEffect`, after
applying earlier `loseClicks` entries in the same branch. Vertigo uses that
state to distinguish an ordinary click loss from the serious steal/trash lock
created when the Runner reaches zero clicks.

Corp main-phase planning now consumes numeric `AIEconomyPlay` declarations on
operations and numeric `AIPlayWhenCan` declarations for currently valid
opportunities. The established hard-coded economy and urgent-operation lists
retain priority; card-defined declarations extend those policies for new sets.

`AddTempBonusClicks` accepts both bonuses and penalties and logs negative
adjustments as fewer allotted clicks. `ResetClicks` already consumes the
accumulated one-shot modifier at the beginning of the affected turn.

## Batch 7 confirmed patterns

Vertigo creates a lingering steal/trash restriction only when it is passed
with the Runner on zero clicks, and removes that restriction at run end.
Caveat Emptor stores its selected positive or negative next-turn click change
through the shared temporary-click helper.

`realloc()` enumerates pairs, so it cannot be played with fewer than two
rezzed ICE, and gains each chosen ICE's printed rez cost before derezzing it.
Retirement Plan uses normal Archives install choices and normal install costs,
limited to agendas, assets and ICE.

Perfect Recall records an agenda's server in the pre-score window, before the
agenda moves to the score area. Its paid ability reveals one HQ card, spends a
power counter and creates a title-specific lingering restriction independent
of whether the upgrade remains active; the restriction cleans up at run end.

`tests/vantagepoint-integration.test.js` covers Batch 7 target requirements,
both Caveat Emptor modes, printed-cost income and derez choices, Archives
install filtering, score/steal counter placement, title-specific prevention,
run cleanup and the meaningful Corp/Runner AI decisions.

## Batch 8 engine support

`Purge(afterPurge, context)` now accepts an optional continuation that runs
after purge-response windows resolve. Knowledge Seeker uses it to preserve the
printed order of purging virus counters before derezzing, without replacing a
pending purge-response phase with a derez-response phase.

Méliès U models its three physical extra identity copies as a secret department
value. The normal trigger decision does not log the chosen department; flipping
reveals the department name and changes the active identity subtype from
Division to Department until the Runner's discard phase ends.

The renderer maps Tenure Floors, Subsurface Labs and Disposal Grounds to
`36036-0.webp`, `36036-1.webp` and `36036-2.webp`, respectively, and restores
the normal `36036.jpg` front when the identity flips back.

## Batch 8 confirmed patterns

Lotus Haze moves a rezzed upgrade between existing server roots without
changing its rez state, excludes the source server, and enforces the one-Region
limit at the destination. Its agenda counter is spent only after a legal source
and destination have been selected.

Esca resolves its mandatory credit loss from every access and its net damage
only while the Runner is tagged. An R&D access makes the card public for the
duration of that access and restores its previous faceup state afterward.

ezaM preserves both ICE positions and a remote that is only briefly empty
during a cross-server swap. Its strength subroutine snapshots the installed ICE
it affects, stacks through separate lingering effects and cleans each effect up
at run end. The Run Calculator's `strengthenAllIce` effect carries that
subroutine's +1 modifier into later encounters instead of treating it as a
generic threat.

Knowledge Seeker offers a mandatory bottom-to-top arrangement of up to four
R&D cards, purges and derezzes after an encounter at three virus counters, and
models the third-counter purge pressure separately from its end-the-run
subroutine.

`tests/vantagepoint-integration.test.js` covers Batch 8 identity state and
matching-server effects, upgrade movement restrictions, tagged and untagged
accesses, ICE swaps and lingering strength cleanup, R&D ordering, purge/derez
sequencing and the meaningful Corp/Runner AI decisions.

## Batch 9 engine support

Corp cards can declare `installOnlyIn(server)` for destination restrictions.
Normal install choices and Corp upgrade planning both respect the hook; The Red
Room uses it to allow HQ, R&D and Archives while excluding remote servers.

`Rez` now accepts an optional final continuation that fires after automatic and
response-based on-rez effects finish. Unleash uses that continuation so its
optional subroutine resolves only after the chosen ICE is fully rezzed.

Corp security planning now collects `AIGlobalETRUses` from all active Corp
cards, not only the score area. This lets an active Red Room contribute its
finite cross-server end-the-run capacity without title-specific logic.

## Batch 9 confirmed patterns

Lionsmane gives the Runner explicit pay, damage and jack-out branches, and only
offers jack out while a run exists. Its Run Calculator model preserves those
alternatives rather than treating either conditional subroutine as guaranteed.
Vicsek snapshots the Runner's tag count before resolving its damage and tag
instructions, then trashes itself unpreventably after its second subroutine.

Cultivate sequences the mandatory trash, HQ addition and remaining R&D order.
Its Corp AI discards the lowest-valued card, keeps the highest-valued card and
places the strongest remaining draw on top. Unleash validates the tag and ICE
target before play, pays the tag cost, rezzes for free, and offers a real
subroutine choice including a human decline option.

The Red Room resets its first-score-or-steal state even while inactive, gains
at most one counter per turn, and spends counters only during runs against a
different server. Its live AI activation and declarative security-planning
hook share the same game-saving policy.

`tests/vantagepoint-integration.test.js` covers Batch 9 choices, costs,
sequencing, first-time resets, cleanup and ICE models.
`tests/corp-install-destination.test.js`, `tests/corp-server-security.test.js`
and `tests/mycoweb-rez-discount.test.js` cover the three shared engine paths.

## Batch 10 engine support

`BadPublicity` now fires `responseOnTakeBadPublicity` after prevention resolves
and only when the Corp actually takes at least 1 bad publicity. It accepts an
optional continuation that runs after those responses. Editorial Division uses
the response to distinguish the first successful bad-publicity event each turn;
Nihilo Agent uses the continuation to keep its tag, bad-publicity and
counter-removal instructions in printed order.

## Batch 10 confirmed patterns

Editorial Division resets its first-time state at both turn boundaries, filters
R&D to non-agenda Black Ops, Gray Ops and Liability cards, and shuffles even
after a failed or declined search. Its Corp choice takes the best legal tutor
target unless R&D is critically low.

Witch Hunt takes bad publicity on either score or steal, records only its own
score, and at the end of that Corp action phase removes all existing tags before
giving the Runner 3 new tags. Magistrate Revontulet is unique, contributes a
three-credit additional steal cost while active, and removes up to 3 credits
whenever the Corp scores any agenda.

Nihilo Agent loads three power counters only when it is rezzed, removes a tag
and bad publicity at turn start, then sequences its discard-phase tag, bad
publicity and counter removal through prevention/response continuations. It
trashes itself unpreventably when the last counter is removed.

Grubber takes bad publicity only when rezzed protecting a central. Each
subroutine gives the Runner a real pay-3-or-end-the-run choice and its Run
Calculator model preserves those alternatives.

`tests/vantagepoint-integration.test.js` covers Batch 10 filtering, failed
searches, first-time resets, score/steal and phase timing, steal costs, counter
cleanup, central-only rez behavior, Runner payment choices, AI policies and the
post-prevention bad-publicity response/continuation path.
