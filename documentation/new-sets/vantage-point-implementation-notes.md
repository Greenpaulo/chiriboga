# Vantage Point Implementation Notes

Verified implementation notes for mechanics introduced or confirmed while
completing Batch 1. The `implement-card-batch` skill remains authoritative; these
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
and after clearing the completed run's global state. The hook receives a queue
for work that must change phase after all automatic cleanup hooks return.
Aircheck records the optional remote target in its response and queues the new
run during cleanup, so no run-end responses are skipped and the automatic
trigger loop itself never changes phase.

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

## Batch 11 engine support

`Bypass` now opens `responseOnBypassed` with the bypassed ICE before continuing
to encounter-end responses. Lethe uses that window for its preventable tag.
The run calculator supports `fullyBrokenEffects` and `bypassEffects` on the
ICE analysis, charging the appropriate tag when ending that branch rather than
incorrectly treating it as an encounter or subroutine effect.

`Uninstall` moves a host to the grip or stack, trashes all hosted cards through
normal unpreventable trash sequencing, then runs an optional continuation.
Lethe and Scapegoat use it; Scapegoat shuffles after hosted trash responses.

The Corp advancement search consumes the read-only `AIFastAdvanceCounters`
hook on candidate operations and installed one-shot upgrades. It models actual
operation credit/click costs, already-paid resolving operations, upgrade rez
costs and one-shot consumption using local search state. Main-phase execution
can rez or activate the planned upgrade and supply its preferred target.

## Batch 11 confirmed patterns

Lethe tags on the final subroutine break, with a guard reset each encounter,
and separately on bypass. Its optional recursion offers either end of R&D
plus decline. Corp AI prefers strong non-agenda draws, buries agendas when
only agendas are available, and returns public Runner threats to the grip.
Paywall loses credits from the Runner's main pool (down to zero), then offers
a separate legal payment or end-the-run choice.

Flood the Market counts only remotes with both a nonempty root and protecting
ICE, including unrezzed ICE; Double's additional click is paid by the engine.
Scapegoat's mode is chosen by the Runner and its installed target by the Corp.
Both modes remain selectable even when they have no effect. Returning or
shuffling is not trashing the chosen card, so trash prohibitions do not exclude
that target.

Hype Machine tracks any score or steal while inactive, including before it is
installed, and clears that turn state on either player's next turn. Its cost
reduction applies only to itself; trashing it as a cost is unpreventable and
places a counter only on an advanceable installed card in its own root. Corp
AI banks free rezzes, uses counters on unfinished agendas, and models the
upgrade as a finite advancement source without mutating real cards.

Subroutine overlays were measured and checked with the ASCII pixel tool:
Lethe `(102,32)` and `(137,32)`; Paywall `(102,32)`.
Focused coverage is in `tests/vantagepoint-integration.test.js` and
`tests/vantagepoint-batch11-engine.test.js` (mechanics, choices, cleanup,
AI branches, bypass sequencing, hosted-trash continuation and advancement
search affordability/one-shot/read-only checks).

Batch 11 verification used Node 20.19.0. The Stop hook instead inherited Node
8.17.0, which exposed an `Array.at()` call in the new integration test; this
was replaced with ordinary array indexing. Both Batch 11 focused tests now
pass on Node 8.17.0 as well. The eight remaining Node 8 suite failures also
occur on the unchanged HEAD baseline: `agent-scripts.test.js`,
`agent-skills.test.js`, `ai-batch.test.js`, `ai-hook-docs.test.js`,
`card-status.test.js`, `corp-ai-card-titles.test.js`,
`ticket-roadmap-sync.test.js`, and `verify-on-stop.test.js`. These are existing
runtime incompatibilities (modern string/array/fs APIs and VM shebang parsing),
not Batch 11 regressions.

## Batch 11 AI call-site follow-up

Checking the hook consumers exposed a missing selection path for Hype Machine:
`RezUsability` allowed a free rez, but post-action and Runner end-of-turn policy
used fixed card lists and could leave it unrezzed when its server was empty.
`AIRezWhenCan()` now declares that opportunity, and Corp command selection
checks full rez legality before acting on it in any legal rez window. Hype
Machine returns true only at zero rez cost. Focused tests exercise actual
`CorpAI.Choice` command and card selection after scoring and at Runner EOT,
including no-discount, already-rezzed and no-rez-window negative cases.

## Batch 12 — 36056–36060 (2026-10-05, Codex)

- Sacrifice Zone Expansion installs publicly, pays three credits on the first
  advance on either player's turn, and optionally spends an advancement counter
  for preventable meat damage after a successful run on a different server.
  Turn/uninstall cleanup prevents stale guards. Its public successful-run damage
  is included in complete Runner routes, independently of breach replacement;
  the Corp advancement selector uses the ordinary four-counter scoring target.
- Luana Campos is unique. Hosting transfers actual bad publicity to visible
  `bad_publicity` counters, gives income and draws mandatorily. The new
  `interruptOnUninstall` continuation, consumed by `Trash` and `Uninstall`,
  finishes bad-publicity prevention and responses before moving the card.
  Hosted counters are consumed once even when returning publicity is prevented.
  Corp install/rez hooks and turn-start choices use actual available publicity.
- Event Horizon exposes both three-credit payment choices, legal program
  targets and a preventable program trash; its paid trash cost is unpreventable.
  Corp `AITriggerInPaidWindow` selection saves the sacrifice for the final
  movement window before a potentially winning breach. `AIGlobalETRUses` shares
  that one-use policy with security planning. `AIMandatoryPassCost` prices the
  cheaper of the ETR payment or a real breaker activation; `AIETRTrashesSelf`
  prevents charging for the sacrificed layer on repeated routes. Complete
  Runner route modelling sees its public paid defense even after passing or
  bypassing it. The Runner conservatively assumes the sacrifice will be used;
  the Corp policy can decline it on a non-winning breach.
- Flywheel gives each mandatory credit before offering its separate optional
  draw. Real Corp option selection declines hand overflow and imminent decking.
  Its run model describes economy punishment without asserting an ETR.
- Tocsin's `availableFromHQ` ability is discovered by the real Corp trigger
  selector, with action-click, credit, trash and HQ checks. Payment, reveal and
  unpreventable trash finish before searching. Separate barrier/sentry choices
  allow finding neither, either or both, never selecting the same physical card
  twice. Every completed search shuffles, then reveals and adds the selected
  cards. The existing tutor scorer selects affordable new ICE; real selector
  tests cover command, card and both search targets, plus expired/empty searches.

Shared additions are limited to HQ paid-ability discovery, mandatory uninstall
continuations, rendering/resetting hosted bad publicity, paid-window Corp
trigger selection, mandatory ICE pass pricing and public complete-run effects.
Existing ELO values and registry/playability flags are preserved.
Subroutine overlay positions were measured and verified with ASCII pixel
windows: Event Horizon `(103,32)`, `(137,32)`; Flywheel `(59,16)`, `(79,16)`;
Tocsin `(123,16)`, `(143,16)`, `(162,16)`.

Focused evidence: `tests/vantagepoint-batch12.test.js` exercises mechanics,
cleanup, negative cases, real Corp command/card/option selection, real Runner
route calculation, and real trash/bad-publicity prevention/response ordering.
`tests/corp-server-security.test.js` exercises the real security planner with
payment, a cheaper Mimic break, one-use ETR capacity and sacrificed-layer cost.
The integration test checks the batch's definitions and shared entry points.

Batch 12 verification passed on Node 20.19.0: focused batch/integration/security
and subroutine-visual tests; all required format/deckbuilding/identity checks;
JavaScript syntax and `git diff --check`; and `node tests/run-all-tests.js`
(46 test files, including Corp decision fixtures and decision snapshots).
The batch brief reports no unfinished markers for all five cards. Batch scope,
exact ELO preservation and absence of empty effects were checked separately.

### Batch 12 stop-hook runtime follow-up

The Stop hook inherited Node 8.17.0 and found a test-harness leak: loading
`utility.js` in the Batch 12 VM modified the host `console.log`, so printing the
final test summary invoked the utility logger's modern `replaceAll` API. The
harness now gives the VM its own console object. The focused Batch 12 test
passes on both Node 8.17.0 and Node 20.19.0; all 46 test files pass on Node 20.

The Node 8 full run still fails `agent-scripts.test.js`,
`agent-skills.test.js`, `ai-batch.test.js`, `ai-hook-docs.test.js`,
`card-status.test.js`, `corp-ai-card-titles.test.js`,
`ticket-roadmap-sync.test.js` and `verify-on-stop.test.js`. An isolated unchanged
HEAD archive, with read-only links to the existing images and Git metadata,
fails the same eight tests under Node 8 (45 baseline test files). These existing
runtime incompatibilities are unrelated to Batch 12; the Stop hook's full
suite is therefore not green under its inherited Node 8 runtime.

### Batch 12 AI audit and recurring hook runtime repair

The follow-up audit found that Luana's automatic income preference could draw
the last R&D card before the Corp's mandatory draw. Her AI now declines hosting
in that state, and declines installing/rezzing her as economy until at least two
cards remain. Real option-selector tests cover the one-card decline and
two-card activation; human choices and printed mandatory draw are unchanged.

The remaining policies are working heuristics rather than optimal tactical
search: Sacrifice Zone Expansion spends its damage counter whenever eligible;
Event Horizon protects potentially winning breaches and its Runner model is
conservative; Tocsin prioritizes an affordable new ICE search without comparing
it against an entire defense/scoring plan. This audit does not establish that
those policies maximize win probability.

The recurring Node 8 hook mismatch is repaired at the suite launcher.
`.nvmrc` pins 20.19.0. `verify-on-stop.js` resolves the installed nvm binary and
puts it first on the child PATH. If that installation is absent, it accepts a
current Node of at least the pinned major version; an older runtime produces
an explicit setup error without running an incompatible suite. The hook itself
remains parsable by Node 8. Its tests cover old-shell selection, modern fallback,
missing-runtime diagnostics, block limits and counter reset, on Node 8 and 20.

### Batch 12 strategic rework (2026-10-05)

This review supersedes the simple policies recorded above. The prior green
suite established usable mechanics, but did not establish good resource tradeoffs.
Batch 12 was reopened before correcting those decisions. The skill and workflow
now require strategic alternatives and contrasting real-consumer tests before
completion; final set review verifies support rather than postponing it.

- Sacrifice Zone's first-advance income is included once in each advancement
  plan, independent of placed counters, and competes with ordinary click economy.
  Damage preserves completed scoring or a counter essential to the next
  three-click scoring window, except when damage immediately flatlines. The
  next-turn comparison uses current credits and owned fast-advance cards, not
  a prediction of hidden draws, so it is a conservative scoring budget.
- Luana chooses existing empty protected remotes. Real install selection tests
  verify that placement; previous publicity and mandatory-draw safeguards remain.
- Event Horizon's paid defense protects winning breaches and last-click agenda
  breaches, while preserving recurring ICE against repeatable non-winning runs.
  The Runner calculates finite ordinary continuations through a local ICE-model
  overlay, budgets extra clicks, pool credits, fresh bad-publicity credits and
  successful-run damage, and leaves the real server unchanged. Continuations
  are cached only within one calculation snapshot. Multiple copies require
  multiple extra runs. The current installed rig and ordinary static-board run
  assumptions are retained; no intervening draw/install search is introduced.
  Its real Runner selector now follows calculated subroutine OR branches,
  including no-program declines and shrinking unaffordable payment menus.
- Flywheel takes a useful draw with two cards remaining and then preserves the
  final mandatory-draw card; mandatory income and hand-overflow checks remain.
- Tocsin's setup trigger yields to winning advancement and useful installs.
  It preserves a final installation click and affordable stopping ICE in HQ.
  Search affordability includes the expend credit, the protection target's
  installation cost and unrezzed ICE reserve. Targets rank stopping behavior,
  public breaker coverage and existing ELO; duplicate titles are declined.
  Three R&D cards can support a one-card search that leaves two behind.

`tests/vantagepoint-batch12.test.js` exercises the real Corp command, card,
install and target selectors, real advancement search, real Runner option
selection and run calculator. Contrasting cases cover a winning advance versus
expend, score preservation versus immediate flatline, useful versus unsafe draws,
a stopping versus higher-ELO economy-only tutor target, and affordable versus
unaffordable finite reruns. The existing security suite covers Event Horizon's
payment versus actual killer cost and self-consumption in Corp planning.

Verification after the strategic rework: the focused batch and security suites,
all required shared checks and `node tests/run-all-tests.js` pass on Node
20.19.0 (46 files, including Corp decision fixtures and decision snapshots).
AI hook documentation checks 120 hooks. The skill-creator quick validator passes
using PyYAML in an isolated temporary validation environment. Batch 12 is complete
again; Batch 13 remains pending. No claims are made about earlier batches' strategy
without their own audit evidence.


## Batch 13 partial implementation and payment-model blocker (2026-10-06)

Historical handoff (superseded by the completion below): owner Codex, range
36061–36066, originally blocked. The user authorized the shared dependency
after merging the Touchstone payment-choice fix. No independent review verdict
is added by implementation. Registry/playability flags are
unchanged. The tree began clean; exact ELO and metadata are preserved.

Partial work retained for 36061–36064:

- Myōshu records installs and qualifying scores while inactive, resets on both
  turn starts, and adds itself to the Corp score area with two agenda points.
  The real `CorpAI.Choice` command/card path chooses a ten-credit immediate win
  before other tactics. Ordinary priority play takes its expiring window while
  reserving all installed unrezzed ICE costs. Tests contrast an immediate win,
  non-winning points, a defensive reserve, an unaffordable purchase, a same-turn
  installation and an expired score window.
- Reanimation Protocol uses the standard install/trash/payment callbacks and
  discounted `Rez`, retaining additional rez costs. The ten-credit discount is
  shared between actual installation and rez costs; it expires after payment.
  Non-Liability bad publicity waits for rez responses. The real Corp command,
  card and target selectors recur stopping ICE for the planner's protection
  target and hold when a cheaper affordable HQ stopping defender exists.
  Tests cover combined cost, no affordability, discount handoff/cleanup and
  Liability/non-Liability outcomes. Installation and rez callback contracts are
  exercised through a headless harness; this is not a full UI timing audit.
- Vulture Fund gains fourteen credits and takes preventable bad publicity.
  Existing main-phase tactics outrank ordinary economy, and clean economy such
  as Hedge Fund precedes its declared economy play. Actual command/card tests
  cover useful income, the seven-credit threshold and competing Hedge Fund.
- Flagship restricts placement to HQ/R&D and is unique. Success suppression
  uses the real declaration modifier; access filtering covers central cards
  and other root cards together, excluding Flagship itself. Only its marked
  access limit persists after access-trash and expires at run-end cleanup.
  Local CR 9.12.5 establishes that persistence applies when the Runner trashes
  a rezzed accessed card, through the end of that run. Public planning helpers
  cap Corp central multi-access pressure and Runner HQ access value, and
  existing Runner successful-run benefit queries recognize success suppression.
  Tests contrast active/unrezzed protection, root-first/central-first access,
  trash persistence and cleanup, actual useful/unaffordable Corp rez selection,
  and real public planning consumers. This does not claim full set-wide
  strategic coverage or independent review of Flagship.

Shared changes: `InstallCost` now applies `modifyInstallCost` to ICE, with the
same destination parameter used by other installation costs. Optional-forfeit
rez menus account for an initiating effect's credit reduction. `AIImmediateWin`
has an affordable/legality-checked main-phase consumer. Public access/success
planning queries are documented in `documentation/ai.md` with their consumers.

### Exact blocker: Shackleton Grid payment-source choices

The necessary dependency is a shared source-aware payment and planning model,
not a card-only damage hook. Current code proves the gap:

- `SpendCredits` in `mechanics.js` spends Runner temporary credits before any
  choice and, for AI players, drains eligible hosted credits before the pool.
  Hosted `onCreditsSpent` observes only its own source. There is no general
  payment-complete event identifying outside-pool contributions, including
  bad-publicity credits, for another installed card's conditional ability.
- `RunCalculator.ValidPoint` in `runcalculator.js` explicitly spends aggregate
  `otherCredits` before the pool. Route points have total expenditure/loss, not
  source allocations; a four-damage trigger cannot distinguish a pool-only
  alternative from a route that uses bad-publicity/hosted credits. Complete
  routes, in-progress encounters and finite rerun continuations all consume
  this representation.
- `CorpAI._effectiveRunnerCreditPool` returns pool, temporary, recurring and
  bad-publicity totals, and its security consumers use their aggregate buying
  power. They do not express the source-dependent four-damage consequence or
  the Runner's alternative of preserving outside credits.

Adding unconditional meat damage or zeroing all outside credits would misstate
legal/strategic routes. Greedy live AI payment could also flatline a Runner who
can afford a safe pool-only payment. Addressing all three consumers and their
continuations materially exceeds this card batch, so the skill requires a
blocked handoff rather than calling the missing support an accepted limitation.

To unblock, implement and verify the shared dependency with these acceptance
criteria, then resume this same range:

1. Emit outside-pool spend information after complete payment, including mixed
   hosted/pool payments and temporary bad-publicity credits. Preserve the
   cost-paid checkpoint and callback/response ordering (local CR 9.5.7b),
   including existing synchronous payment callers, prevention and no-spend cases.
2. Support safe pool-only and outside-credit routes in the real Runner
   calculator and payment selector. Choosing outside credits applies four
   preventable meat damage once per turn, while an available safe pool route
   avoids it. Source restrictions such as required stealth remain enforced.
3. Preserve the trigger's used/unused state across encounters and repeated runs
   in the turn; reset it at each turn boundary. Account for payments while
   accessing, and do not replace a conditional damage effect with an ETR.
4. Make Corp public security/rez/install planning compare those same legal
   alternatives without reading hidden Grip identities or mutating the board.
5. Exercise real selectors/calculators on contrasting boards: lethal outside
   spend versus an affordable safe pool payment; unavoidable outside spend;
   zero/pool-only spend; surviving damage; already-used ability; scarce credits;
   and repeated-run continuations. Then implement Shackleton's human optional
   trigger, prevention, strategic placement/rez and once-per-turn cleanup.

36065 and 36066 retain their unfinished markers. Let Them Dream has not been
started; do not skip the blocked batch to claim a later batch or set-wide review.

Validation of the partial tree: `tests/vantagepoint-batch13.test.js`, Vantage
Point integration, AI hook docs, Mycoweb/rez-callback and Corp security tests;
required shared format/deck tests, syntax checks and `git diff --check` pass.
The final `node tests/run-all-tests.js` run passed all 47 files, including Corp
decision fixtures and decision snapshots (Node 20.19.0).


## Batch 13 completion and payment dependency resolution (2026-10-06)

Owner: Codex. Range: 36061–36066. The shared dependency is implemented on this
branch; the previously recorded blocker is resolved. Existing 36061–36064 work
is retained, all six cards preserve their metadata/ELO, and registry/playability
flags remain unchanged. This completes implementation, not independent review.

- `SpendCredits` now aggregates outside-pool contributions and emits
  `responseOnCreditsSpent` at payment completion, before its continuation.
  Temporary credits become optional human choices when Shackleton matters.
  Existing pool/hosted choices from the merged Touchstone fix remain in use.
  `SpendHostedCredits` routes required stealth payments through this checkpoint;
  Corsair, Lampades and Baker use it, with Baker paying before changing servers.
- Shackleton has an optional four-meat-damage response and normal prevention.
  Declining leaves its opportunity available; accepting consumes it, with resets
  on both turn boundaries. Install ranking consumes `AIPreferredUpgradeServer`
  to choose funded paid-defense servers, using existing threat ranking. It holds
  the Region without outside funding or with an occupied Region. Rez planning
  requires an unused opportunity and impending encounter/access payment.
- Runner `RunCalculator.Calculate` and `CalculateAsync` compare independent
  outside-first and pool-only policies and rank them using the existing route
  costs. Points retain the selected policy, conditional damage and public meat
  prevention. `RunnerAI.AIPreserveOutsideCredits` follows that plan in live
  payments. Credit locks exclude pool funding. Four cards survive four damage;
  fewer require prevention or a legal pool-only alternative.
- Repeated-run continuations carry consumed Shackleton opportunities and
  prevention capacity without mutating actual cards. Their reserved pool budget
  respects each continuation's policy. Prevention still resolves through the
  real `Damage` path; Crash Space exposes its trashable three-point capacity
  with `AIMeatDamagePrevention`. Its consumption retains the existing damage
  opportunity cost rather than treating the prevention card as free.
- Required stealth uses `AIRunRestrictedCredits` and explicit route counters.
  Supplemental credits become available only after their restricted payment;
  they cannot finance ordinary breaks or access trash costs. Consumption spans
  ICE and finite reruns. This replaces Corsair's pool-credit supplement. The
  real-calculator test also exposed reversed arguments in Corsair's `StrModify`
  call; its source/target order and the integration harness's stub are corrected
  to the actual engine contract.
- Corp `_effectiveRunnerCreditPool` checks pool-use restrictions in its restored
  hypothetical-server context. `_evaluateServerSecurityUncached` compares
  lethal outside funding against the safe pool ceiling, and records survivable
  meat damage as deterrence. These queries use public counters, Grip size and
  installed prevention only. They do not inspect Grip identities or alter cards.
- Let Them Dream searches the chosen source, reveals the selected agenda and
  offers HQ or bottom-of-R&D placement. A searched R&D is shuffled immediately
  after selection, before reveal/movement (CR 8.7.3); decline and HQ/Archives
  searches do not shuffle. Restricted R&D searches may fail to find; HQ/Archives
  must find an eligible agenda if present (CR 8.7.2e). Empty sources terminate.
  The Corp's real option selector retrieves a fast winning agenda when protected
  staging, a click and hand space exist; otherwise it recovers Archives agendas
  or hides flooded/exposed HQ agendas. It declines without a useful target.
- `AgendaPointsForCard` consumes the new owner-sensitive gameplay property
  `agendaPointsForPlayer`; score totals, Runner known-agenda potential and Corp
  defensive agenda/breach-loss estimates value Let Them Dream at one Runner
  point and two Corp points. Moving score areas does not alter printed metadata.

Decision-level evidence in `tests/vantagepoint-batch13.test.js` covers real
payment choices, Corp damage/rez/install/search selection, synchronous and
asynchronous run calculation, safe versus lethal/unavoidable outside funding,
surviving damage, pool locks, direct hosted payments, prevention resolution,
already-used and reset opportunities, repeated runs, restricted stealth across
multiple ICE, region conflicts, useful/declined searches, shuffle/failure timing,
bottom insertion and owner-sensitive victory risk. Existing tests for Myōshu's
immediate-win/reserve alternatives, Reanimation targets/costs, Vulture economy,
and Flagship success/access planning remain green.

Validation: focused batch/integration, Corp security (145 cases), credit-pool
locks, AI hook documentation, required format/deck checks, syntax and whitespace
checks; `node tests/run-all-tests.js` passes all 50 test files, including Corp
decision fixtures and decision snapshots, on Node 20.19.0. The separate set-wide
review is next; no new accepted limitation is recorded for this batch.


## Batch 13 reopened: Corp Corsair security gap (2026-10-06)

The completion claim above is superseded. Checking whether the AI uses these
cards well exposed a missing opposing-planner case, so batch 13 is In progress.
This is unfinished strategic support, not an accepted limitation or a deferred
set-wide-review task.

Reproduction: reuse the required-stealth board in
`tests/vantagepoint-batch13.test.js`: rezzed Shackleton in HQ, one strength-three
Barrier with one ETR, Corsair, one ability-only stealth credit, four pool credits,
four Grip cards, no prevention and no generic outside credits. The real Runner
calculator finds an outside-payment route costing one required stealth credit,
one ordinary break credit and three pool credits to trash Shackleton, taking
four survivable meat damage. On that identical board the Corp
`_evaluateServerSecurity(corp.HQ)` returns `isSecure: true`, infinite mandatory
break cost and a four-credit ceiling.

Code confirms both missing consumers: the Corp breaker-cost probe calls
`AIImplementBreaker` once and ignores returned strength-modification directions,
so Corsair's reduction never reaches its breaking branch. The public credit
ceiling also does not consume `AIRunRestrictedCredits`, and credits allowed only
for `canUseCredits("using", null)` are excluded when it probes installed breakers.
Existing Runner restricted-payment tests pass; existing Corp cases use an
ordinary breaker and do not exercise this contrast. All 50 green test files
passing therefore did not establish this part of the acceptance criteria.

Required repair: make Corp cost/resource assessment follow the legal restricted
payment route, retain source exhaustion across multiple ICE/repeated runs, and
account for Shackleton/prevention without treating survivable damage as an ETR.
Add contrasting same-board assertions through both real consumers: four cards
survive; three do not without prevention; pool credits cannot replace required
stealth; insufficient/exhausted stealth prevents additional reductions; a usable
ordinary breaker may provide a safe pool-only alternative. Preserve public-only,
read-only planning and rerun the required full regression suite before restoring
Complete. Other cards' tested strategic decisions are retained, but this finding
prevents an unqualified batch-wide strategic sign-off.


## Batch 13 Corp restricted-payment repair (2026-10-06)

The reopened finding above is repaired; its reproduction is now a green
assertion in `tests/vantagepoint-batch13.test.js`. The ordinary-breaker probe is
retained for other boards. With an enabled restricted-credit provider installed,
Corp `_icePlanOutcome` uses `_restrictedPaymentPlanOutcome` and the shared
RunCalculator to follow complete payment/strength-reduction routes. Thus it
also retains credit exhaustion and finite-repeat budgets, rather than treating
Corsair's first reduction as an unbreakable ICE result.

The calculator's local `_securityPlanning` context restricts ICE to the chosen
fundable rez plan and uses Corp knowledge of that ICE. Optional access and trash
costs are excluded from this ICE-pass/security forecast. It preserves the usual
finite-defender continuation and pool-only/outside-credit branches. Corp
security consumes route feasibility, includes supplements only at restricted
payments and counts planned damage once. Preparation credit gains consume the
same click budget as paid click abilities, initiating the run and repeating it.

Outside-damage opportunities are captured before temporarily supplying a
hypothetical attacked server, so next-turn resets and already-used current-turn
opportunities retain their proper meanings. Hypothetical context is restored
in `finally`; actual cards/counters and Runner route caches are untouched. Tests
make numeric Grip reads throw while retaining its public length.

Contrasting evidence through the actual Corp security consumer and Runner
calculator now covers:

- four cards survive required stealth plus Shackleton; three cannot, even with
  a large pool, while an ordinary breaker supplies a safe pool-only alternative;
- one stealth credit cannot pay reductions for two ICE; two credits can;
- a finite outer stop requires a third reduction on the repeated inner ICE,
  with separate source and click budgets and no repeated Shackleton damage;
- public Crash Space prevention enables a one-card required-stealth route,
  and its one-shot capacity cannot be reused on a later damage encounter;
- a used opportunity stays consumed this Runner turn and is restored for the
  next Runner turn without changing the real card;
- hidden Corp ICE is forecast only in an affordable rez plan;
- one spare click cannot both gain a credit and initiate a repeated run; two
  distinct spare clicks can support both; and
- forecasts do not read hidden Grip identities or change credits, counters,
  current phase/run state or the actual Runner's cached route.

The focused batch/integration, Corp security and pool-lock regressions and all
required syntax/format/deck checks pass. `node tests/run-all-tests.js` passes all 50 test files, including Corp decision
fixtures and decision snapshots, on Node 20.19.0. This repairs the known implementation gap;
independent batch/set-wide review remains separate.

## Batch 2 remediation — C2-1, C2-2, C2-3 (2026-10-06)

Exact scope: 36005–36008. All metadata and ELO values are preserved. Printed
human mechanics remain intact; the repairs address current AI consumers and
missing essential evidence in the independent batch report.

- **Lampades 36005:** actual access commands contrast legal stealth/power with
  exhaustion, ordinary cheap trash and ability-only trash. A subsequent real
  Corsair barrier route proves the scarce-stealth opportunity cost. Recursive
  `SpendHostedCredits` payments prefer access-only sources before breaker/general
  sources, preserving flexible funding. Legality, counter consumption, split
  payment and unsupported agenda costs remain covered by integration tests.
- **Hackerspace 36006 / C2-2:** reusable Runner destination ranking carries the
  selected host through draw-install, pre-run and generic keep/install commands.
  An explicit card preference keeps its veto/index contract; legal defaults rank
  destination cost and marginal hand slots. Real command/card/host selection
  proves both one-credit and hosted-only zero-credit installs, ordinary ineligible
  installation, and the actual maximum hand size of seven after completing the
  pair. Setup checks distinct, not-already-installed targets, budgets clicks and
  costs, declines a lone discount and selects setup for immediate paired hand
  pressure. Exposed tagged resource hosts are excluded from default ranking.
- **Nurse Hạnh 36007:** installation requires at least two public facedown
  Archives cards, actual Stack capacity, useful hand space and time/funding for a
  survivable Archives route. Scarce-credit, zero/one reveal, empty/one-card Stack,
  last-click, overdraw and blocked-Archives command contrasts cover declines.
  `AIRunExtraPotential` makes the installed draw opportunity change actual server
  selection; `AIRunBreachDraw` supplies its ordered finite breach draw to both
  planners. Real `runBreachServer.Init` dispatch moves zero/zero/two actual Stack
  cards for zero/one/two facedown reveal groups.
- **Stick and Poke 36008 / C2-1:** `drawCard` effects track finite public Stack
  counts and damage peaks before draw. Both actual planners accept outer ezaM /
  inner Tithe with one Grip and one Stack card; empty Grip or empty Stack rejects,
  while an already-used effect does not fire again. Exactly one predicted
  encounter receives the addition, without inspecting hidden ICE identities.
  Live `AIEncounterEffects` inserts the same ordered model before broken masking.
  Real breakers, Inside Job bypass, prevention response, once-per-turn state and
  encounter cleanup preserve both damage and draw timing. A public free finite
  net-prevention contract has actual engine-response and opposing-planner fixture
  evidence; it does not grant legacy paid prevention without payment costs.
- **C2-3:** `_runAfterInstall` uses a separate calculator after the chosen
  destination's cost, installation click and Grip removal. `finally` restores
  zones, location/host, resources and live state, including an exception probe.
  Six-point known-agenda command/card/server selection runs directly on the
  reviewed empty-Stack/Tithe board; the nonwinning control also declines unsafe
  preparation. Safe useful paired installation and last-click decline are
  contrasted. Mandatory damage/cycling alone no longer creates an install reason;
  paired hand capacity or supported free prevention supplies a strategic benefit.

Shared route accounting preserves Stack/Grip depletion, first-encounter use and
free prevention over finite Event Horizon reruns and payment-policy branches.
A real Shackleton route proves that a later payment's damage follows the earlier
Stick and Poke damage/draw: four cards survive, three do not, and both planners
agree without reserving hypothetical extra credit clicks during the active run.
Historical omitted-draw notes above are superseded, not accepted as a limitation.

Permanent acceptance: `tests/vantagepoint-batch2.test.js`, supplemented by
`tests/vantagepoint-integration.test.js`. Shared consumers requiring independent
revalidation include batch 1's Corsair/Tailor routes, batches 12–13's finite
payment/prevention routes and all existing install-before-run/draw-install users.
The batch 2 report's independent verdict remains Changes required until re-review;
no set registry or playability flags changed. No new card limitation is accepted.
The obsolete pending Corsair offset expectations remain untouched; current-code
counterevidence was appended to their bug ticket rather than changing them.

Verification: Node 20.19.0; focused batch 2/integration, affected batch 1/11/12/13,
Corp security (145 cases), credit-pool and hook-documentation tests pass.
All required syntax/format/deck/identity checks and `git diff --check` pass.
Final `node tests/run-all-tests.js`: **52 test files passed**, including Corp
decision fixtures and decision snapshots, excluding known-red pending tests.
Batch 2 is Complete in the implementation tracker; independent re-review is
still required. No new limitation is accepted; batch 3 is next for repair.


## Batch 2 decisive access funding repair — C2-4 (2026-10-06)

The independent positive-savings counterexample reproduced: six Runner points,
a public winning agenda behind Funhouse, Corsair, two Methuselah stealth credits,
and Luana access with printed cost one versus normal trash three. Actual Lampades
payment destroyed the complete route even though paying three pool credits
preserved it. C2-1–C2-3 repairs remain supported by the current focused suite.

Lampades now supplies the same `_stealthPaymentPlan` to its access priority and
recursive live payment. The reusable Runner `_accessPaymentPreservesWinningRun`
compares complete routes to public winning remote agendas before and after the
exact proposed allocation. It accounts for the initiating click, route costs,
remaining steal credits/clicks, public restrictions and finite installed funding.
Current temporary credits expire; the next run receives its own bad-publicity
credits. It does not assume future source replenishment or inspect hidden Corp
or Stack identities. Independent calculators preserve the live route/cost caches;
funding and encounter globals restore in `finally`, including throwing consumers.

The ordinary-trash selector uses the same evaluation with `_accessTrashPayment`,
which mirrors actual `SpendCredits` allocation. `AIPreserveOutsideCredits` makes
that real consumer spend affordable pool credits when hosted credits are necessary
for the known winning follow-up. Both branches decline when their costs eliminate
all currently funded public winning steals. No named-card exception or numerical
priority tuning was introduced.

Permanent real access command/card/payment regressions in
`tests/vantagepoint-batch2.test.js` cover scarce versus plentiful stealth, positive
savings versus free trash, unaffordable ordinary trash, additional steal costs,
access-only source allocation, nonwinning/hidden targets and expired clicks.
Actual payment leaves two stealth credits and a complete route in the ordinary
trash and plentiful-ability cases; unavailable safe trash leaves the card.
Concealed Corp/Stack getters, cache checks and a throwing resource consumer cover
information boundaries and restoration. Existing all-card acceptance revalidates
Hackerspace destinations/hand capacity, Nurse reveal/draw choices, Stick and Poke
ordered damage/draw and opposing finite route models.

Affected consumers: Runner access triggers and ordinary trash (including Imp and
other access cards), `SpendCredits` outside-credit preservation, shared complete
routes, batch 1 Corsair/Tailor and batches 11–13 finite/payment/prevention effects.
Independent re-review must assess C2-4 and these affected consumers; the historical
review verdict remains Changes required. No new limitation is accepted.

Verification: Node 20.19.0; focused batch 2/integration, affected batch 1/11/12/13,
Corp security (145 cases), credit-pool and hook-documentation tests passed.
Required syntax/format/deck/identity checks and `git diff --check` passed.
Final `node tests/run-all-tests.js`: **52 files passed**, including Corp decision
fixtures and decision snapshots; known-red pending reproductions excluded.
`card-status.js` regenerated the status document; batch brief reports no unfinished
markers for all four cards, and their gameplay effects have no empty stubs.
Batch 2 is Complete; batch 3 is next. Independent re-review remains required.


## Batch 2 actual access payment contract repair — C2-4 (2026-10-06)

The second independent re-review correctly found that the previous test bypassed
actual access-phase payment. The engine enumerates and resolves ordinary access
trash using `"paying trash costs"`; the reserve policy and hypothetical allocator
used `"trashing"`, missing both the live reserve check and Azimat eligibility.
The real phase reproduction lost the public winning route before this repair.

Runner `AIPreserveOutsideCredits`, `_accessTrashPayment` and the access selector
now share the engine's existing reason. Source/pool eligibility and deterministic
allocation therefore agree with actual `SpendCredits`. The separate Corp
click-to-trash reason remains unchanged. No gameplay card, ELO or priority tuning
changed. Scarce stealth stays available for Corsair's known winning follow-up;
Azimat's legal trash-only credits fund trash without consuming that reserve.

Permanent acceptance in `tests/vantagepoint-batch2.test.js` uses real legal phase
enumeration, command/card/ability selection and phase resolution, including
`phases.runAccessingCard.Resolve.trash`. Contrasts cover scarce/plentiful stealth,
one pool credit with Azimat, temporary credits, free/unsafe/unaffordable trash,
ordinary trash without Lampades, the actual Méliès City Luxury Line steal-click
cost, hidden/nonwinning agendas, expired clicks and a reason-sensitive pool lock
with/without Azimat. Both resource balances and complete winning routes are
asserted. Existing all-card tests retain C2-1–C2-3 ordered draw, hosted install,
preparation and opposing-planner evidence, plus privacy/restoration coverage.

Affected consumers are shared Runner ordinary access trash, hosted-source and
pool eligibility, `SpendCredits` outside-credit preservation, source-sensitive
damage/prevention and batches 1/11/12/13. Their focused regressions pass, as do
all required syntax/format/deck/identity/hook-doc checks, status regeneration and
the empty-effect/no-unfinished-marker audits. Node 20.19.0 full verification:
`node tests/run-all-tests.js` — **52 files passed**, including Corp decision
fixtures and decision snapshots. Pending known-red reproductions are excluded.

Batch 2 implementation is Complete; batch 3 is next. Independent re-review must
verify C2-4 through actual phase payment, Azimat and these affected shared
consumers, alongside retained all-card acceptance. The independent report's
Changes required verdict is preserved; no new limitation is accepted.


## Batch 2 ordinary winning-run precedence repair — C2-5 (2026-10-06)

Repair checklist: C2-5 reproduced with the permanent real command/server test
before code edits (installed Nurse selected Archives instead of the winning
remote). C2-1–C2-4 are already independently resolved in the latest report;
retain and rerun their permanent ordered-draw, hosting, preparation and actual
access-payment contrasts, rather than alter their supported behavior.

Runner's ordinary run selector now calls `_winningRunBeforeOpportunity` before
potential scoring or hypothetical preparation. The existing expiring-play
consumer remains supported. Both require an enumerated legal ordinary run,
public winning agenda, complete route and affordable post-route credit/click
steal costs, with public breach and steal prohibitions respected. No Nurse
specific title check or bonus tuning is involved. The helper retains prospective
encounter context throughout the complete calculation and restores it in
`finally`; this exposes run-only funding and avoids applying end-of-turn hand
retention to a last-click winning route. It performs no installs, run-event
preparation or live resource spending. A chosen complete route remains cached
for the real server choice and subsequent run decisions.

`tests/vantagepoint-batch2.test.js` adds twelve real command/server contrasts:
installed Nurse, Nurse in Grip, absent Nurse, empty Stack, faceup Archives,
useful draw-only board, infeasible route, unaffordable steal, expired steal-click
budget, steal prohibition, hidden agenda and breach prohibition. The five
immediate-win boards choose the remote; the seven unusable/nonwinning boards
choose useful Archives draw. Two further boards exercise actual Corsair/
Methuselah restricted funding and a later steal payment: funded win versus
exhausted stealth, without spending either source. Supplemental exception
coverage proves prospective cost failure restores context and leaves Grip,
Stack, credits and clicks intact. Existing C2-1–C2-4 tests retain every card's
mechanics, cleanup, strategic alternatives and opposing planner evidence.

Affected consumers: ordinary Runner command/server ranking, expiring play
priority (batch 1), and the complete route/payment calculator shared with other
batch evidence. Re-review batch 2 C2-5 and C2-1–C2-4 retention, plus batch 1's
winning-run consumer and batches 11/12/13 route/payment regressions. This repair
is implementation evidence; it leaves all independent verdicts intact. No new
accepted limitation or registry/playability change.

Verification: Node 20.19.0; focused batch 2/integration, affected batch 1/11/12/13,
Corp security, credit-pool lock, source payment UI and hook-doc suites pass.
`node tests/run-all-tests.js`: all 52 files pass, including Corp decision fixtures
and decision snapshots; pending known-red reproductions remain excluded.
Card-status regeneration, batch brief (all four without unfinished markers),
range empty-effect/subroutine audit, syntax, format, deck pool, identity and
`git diff --check` pass. No further implementation gaps identified in this batch;
independent batch 2/shared-consumer re-review is required. Batch 3 is next.


## Batch 2 immediate-win Grip budget repair — C2-6 (2026-10-07)

Repair checklist: reproduce C2-6, separate immediate winning-route survival
from soft retention/cache preferences, retain C2-1–C2-5 acceptance and exercise
the earlier expiring-play consumer. The retained fourth independent re-review
probe reproduced the reported Archives choices before edits; a permanent
command/server regression also failed on the zero-credit one-Grip board.
Historical observation assertions and independent verdicts remain unchanged.

Runner `_winningRunBeforeOpportunity` now guards its complete calculation with
`_evaluatingWinningRun`, restored in `finally` alongside prospective run state.
`_calculateRunPathPieceBegin` uses actual Grip capacity in that context rather
than subtracting `cardsWorthKeeping` according to cached potential. Ordinary
routes keep their existing retention policy. No card bonus, ELO, title-specific
branch, gameplay mechanic or opposing security model changed. The complete
calculator still enforces ordered damage peaks, finite Stack/prevention,
restricted funding, click budgets and additional steal costs.

Permanent `tests/vantagepoint-batch2.test.js` evidence exercises real command,
card and server selection. Fresh zero/four-credit one-card wins, five-credit
and spare-duplicate controls, one/two-click boards and repeated unchanged-board
choices all take the known winning remote rather than Nurse's Archives draw.
Both ordinary selection and an actually legal/useful expiring Chain Reaction
choose survivable wins; lethal, unaffordable, additional-click, forbidden and
hidden targets decline. Nonwinning controls retain draw or expiring denial.
Stick and Poke's damage-before-draw permits the finite-Stack winning route;
empty Stack rejects it. Throwing ICE modelling restores the tactical context,
and a subsequent ordinary calculation still reserves the useful Grip card.
Selectors preserve live Grip, Stack, credits, clicks and run context.

Existing per-card acceptance remains in the same focused suite: Lampades's
actual access payment preserves winning stealth reserves (C2-4); Hackerspace
chooses funded setup and eligible free hosting/hand capacity (C2-2); Nurse's
useful finite draw and ordinary winning-run priority persist (C2-5); Stick and
Poke retains opposing ordered-resource, cleanup/prevention and safe preparation
contrasts (C2-1/C2-3). No new accepted limitation is introduced.

Shared re-review scope: batch 2 C2-1–C2-6, batch 1 expiring-play precedence,
and ordinary Runner complete-route consumers of retained-card damage budgets.
Affected batch 1/11/12/13, payment and Corp-security regressions are rerun;
independent batch and set review remain required.

Verification on Node 20.19.0: focused batch 2/integration, batch 1/11/12/13,
145 Corp-security cases, credit-pool lock, payment-source UI and AI hook docs
pass. All required syntax, Eternal/deck-pool/identity and diff checks pass.
`node scripts/card-status.js` regenerates the unchanged card status;
`node scripts/batch-brief.js 2` reports no unfinished markers for all four cards.
The selected range has no empty effects or subroutine arrays.
`node tests/run-all-tests.js`: **52 test files passed**, including Corp decision
fixtures and decision snapshots, excluding known-red pending reproductions.
Batch 2 implementation is Complete; batch 3 is next. Independent review remains
required before treating the repair as strategic approval.


## Batch 2 immediate-win tag budget repair — C2-7 (2026-10-07)

The fifth independent re-review's Funhouse/known Hub counterexample reproduced
before edits, as did a new permanent green-suite command/server assertion.
Repair checklist: remove only post-win tag cleanup from the guarded tactical
route, retain real survival and legality, and preserve C2-1–C2-6 acceptance.
Historical diagnostic probes and independent review verdicts remain unchanged.

Runner `_calculateRunPathPieceBegin` now supplies `Infinity` for the tag limit
under `_evaluatingWinningRun`. The real calculator's `ValidPoint` already
respects this sentinel, so it no longer recalculates removal clicks/credits
for a supported immediate winning steal. The existing tactical guard restores
in `finally` on success, decline and exceptions. Ordinary routes retain finite
tag cleanup and retained-Grip preferences. Complete route damage peaks, finite
Stack/prevention, run-ending effects, source-sensitive payments, remaining
clicks and additional steal costs still apply. No gameplay, card metadata,
ELO, Nurse draw ranking, new hook or opposing security model changed.

Permanent `tests/vantagepoint-batch2.test.js` exercises actual command/server
selection on fresh and repeated one-click/zero-credit, two-click/four-credit
and three-click/funded boards. A genuinely legal useful expiring Chain Reaction
also yields to the win. Nonwinning boards retain Archives draw, lethal runs
retain expiring denial, and lethal inner damage, unbreakable ETR and additional
credit/click steal costs decline. A tagged Doomscroll control preserves actual
conditional damage. AI choices in actual Funhouse encounter and subroutine
phases take two tags without credits; the actual access command and steal move
the agenda to score area and reach the winning total. Planning preserves live
resources/zones/context; ordinary complete calculations still reject tags with
no removal budget, including after an exception. The same suite retains each
card's supported payment, hosting/hand-space, finite draw and safe preparation
contrasts from C2-1–C2-6. No accepted limitation changed.

Independent re-review scope: batch 2 C2-1–C2-7 and all four cards' retained
strategic evidence, batch 1 ordinary winning-run and expiring-play consumers,
and other Runner complete-route tag-budget consumers. Shared security/payment
and batch 1/11/12/13 regressions are included; independent approval is separate
from implementation completion.

Verification on Node 20.19.0: focused batch 2/integration, affected batch
1/11/12/13, Corp security (145 cases), credit-pool lock, payment-source UI and
AI hook docs pass. Required syntax/format/deck-pool/identity and diff checks
pass. Card-status regeneration is unchanged; all four brief entries have no
unfinished markers and the range has no empty effects/subroutine arrays.
`node tests/run-all-tests.js`: **52 test files passed**, including Corp decision
fixtures and decision snapshots, excluding known-red pending reproductions.
Batch 2 implementation is Complete; batch 3 is next. Independent batch and
shared-consumer re-review remain required.

## Batch 2 consolidated remediation — C2-8–C2-10 (2026-10-14)

Continued `cards/vantage-point-remediation-batch-2` from `e64a44a` in
`/private/tmp/chiriboga-vantage-remediation-batch-2`; the user's original checkout
was not edited. Cards remain 36005–36008, with metadata/ELO/playability unchanged.
The sixth independent report's consolidated matrix is the repair contract.
Its referenced sixth-review probe files are absent at this branch's HEAD;
findings were reproduced afresh against HEAD code rather than assuming those
historical artifacts were runnable. New expected-outcome cases in
`tests/vantagepoint-batch2.test.js` fail against the original production files:
C2-8 selects the lethal Doomscroll route, C2-9 removes a tag instead of winning,
and C2-10 installs unfunded Lampades. Temporary baseline harnesses remain under
`/private/tmp/chiriboga-batch2-baseline/` and are not green-suite dependencies.

Finding-by-finding changes and evidence:

- **C2-8:** `RunCalculator.Directions` expands public tag-condition descriptors
  in chosen subroutine order. Doomscroll's threshold, Lamplighter's conditional
  ETR/pay alternative, and Vicsek's tag-scaled damage/tags now use the state at
  resolution. These three ICE descriptions are necessary shared dependencies,
  including Vicsek 36042 outside this batch. No live-tag overlay or hidden card
  identity is used. Finite continuations carry initial tags and include tag state
  in their local cache key; credit-policy forks copy that context. Corp
  `_restrictedPaymentPlanOutcome` selects the complete route for conditional
  ICE, including boards without Nurse or a restricted source. Permanent evidence
  covers ordinary/expiring command and server choices, actual AI Funhouse choices,
  Doomscroll/Vicsek damage and winning steals, Lamplighter ETR, opposing same-board
  security, real break masks, Inside Job bypass, paid tag avoidance, finite reruns,
  payment forks and exceptions. Original ordered draw/prevention/reset cases stay.
- **C2-9:** one early `_winningRunBeforeOpportunity` evaluation precedes basic
  and event tag cleanup, expiring plays and ordinary potential/preparation.
  `_accessPaymentPreservesWinningRun` applies terminal tags without post-win cleanup
  while retaining real survival, source restrictions, clicks and additional steal
  costs. Actual ordinary trash preserves indispensable stealth; funded Lampades
  spends only spare stealth. Calculator `terminalGoal` suppresses discretionary
  root trash only; Hokusai and other mandatory approach effects remain. Live
  recalculation derives a public legal winning agenda, retains its damage/tag
  budgets and reserves pool-only steal credits/clicks. Both initial and live
  paths enforce the cost once. Permanent tests cover actual basic/event precedence
  and nonwinning controls, zero-credit SanSan access/steal with the upgrade left
  installed, a one-credit exact steal boundary, lethal mandatory approach damage,
  Tithe→Funhouse live continuation and changed danger/cost/visibility/legality
  declines. Original scarce/plentiful/locked/Azimat/temporary/privacy/restoration
  acceptance remains in the same suite.
- **C2-10:** Lampades `AIInstallBeforeRun` requires public useful access value
  and legal funding. `AIWastefulToInstall` also gates generic installation,
  available powered duplicates and MU pressure. Archives cards already in the
  trash cannot establish a useful Lampades preparation; its root still can.
  The new documented read-only `AIHypotheticalInstallCounters()` returns `{power: 3}`;
  `_runAfterInstall` applies/restores exact property descriptors without firing
  gameplay triggers. Real command/card/install choices cover funded savings,
  unfunded/exhausted/unusable sources, duplicates, full MU, last click and direct
  win. Counter/context/resource restoration is checked on success and exception.

The integration test's Vicsek model assertion now checks the deferred descriptor
representation; real conditional outcomes are asserted separately above. No
expectation about a decision or game outcome was weakened. The existing pending
Corsair/Lampades offset reproduction remains red and untouched (its old offset
hook contract is outside this batch); no passing pending reproduction was left
outside the green suite. No new limitation was accepted.

Verification: Node 20.19.0; batch 2 and integration, required syntax/format/deck
pool/identity checks, batch 1/13, Corp security (145 cases), payment-source UI,
credit-pool lock and AI-hook documentation pass. The full suite includes batch
11/12, Corp decision fixtures and decision snapshots: **52 test files pass**.
Card-status regeneration is unchanged, all four brief entries have no unfinished
markers, the selected definitions contain no empty effects/subroutine arrays,
and `git diff --check` passes. Ignored Vantage Point art was copied from the local
`chiriboga-dev2` checkout; the missing ignored 300×420 Dewi reverse-side test asset
was downloaded from the existing image provider into this worktree only. The
first full run's two missing-asset failures were resolved without skipping tests.

Implementation completion does not renew an independent verdict. Re-review batch
2's full sixth-review matrix and C2-1–C2-10, the actual diff, affected batch 1
ordinary/expiring winning consumers, batch 13 finite/payment/prevention consumers,
and Doomscroll/Lamplighter/Vicsek security descriptions (including batch 9).
The next implementation repair is batch 3, 36009–36016.

## Batch 3 strategic remediation — 2026-10-14

Cards 36009–36016; finding IDs C3-1–C3-5. Permanent evidence is
`tests/vantagepoint-batch3.test.js`, using actual engine phases, command/card/target
selectors and run calculation; browser rendering alone is inert.

| Card | Consumers and contrasting evidence |
|---|---|
| Vic 36009 | New `AITriggerToRemoveTags` consumer before basic cleanup; actual trigger card/ability, click/credit/draw/removal resolution. Used/unused, zero/one/two credits, full Grip/empty Stack, and a known winning run establish the competing actions. Runner draws stop at an empty Stack; they do not lose the game. |
| Kompromat 36010 | Current code already used `BadPublicity`, so the historical undefined-helper crash is absent. Real successful-run dispatch, publicity/prevention/nested completion, failed-run removal and derez branches pass. Corp security/loss hypotheticals compare permanent publicity against re-rez affordability; zero-credit and funded Ice Wall boards change the actual reward choice. Success-prevented runs receive no reward potential. |
| Sell Out 36011 | Correct one-argument preferred-choice contract; actual `Playing` consumer also applies it to economy/draw plays. A doomed Underdome is sacrificed while a useful zero-cost Stick and Poke remains; necessary resources and useful hosted children cause decline. Actual trash, net credits and draw resolve. Printed install price is not expendability. |
| Tailgate 36012 | Existing discounted cost and run-event/access consumers retained. Actual command contrasts choose multiaccess with funds, normal run when unaffordable, and decline the success bonus under Crisium. A last-click three-card HQ with a known winning agenda selects Tailgate and reaches seven points; no-argument success dispatch and run-end reset pass. |
| Borrowed Goods 36013 | Install choice and install-before-install memory ordering preserve cleanup clicks and pool credits for an untagged Runner; already tagged installs add no tag. Actual command/card/install resolution contrasts spare versus needed MU, funded cleanup versus last-click zero credits, and tagged versus untagged state. |
| Rotary 36014 | Optional breach choice, access valuation and final breach tag modelling share finite route/resource checks. Actual selector/resolution contrasts funded cleanup, scarce pool/clicks, ICE consuming the reserve, and a known second R&D winning agenda. Real run/card/server and steal resolution reaches seven points while tagged. Restricted-payment forks preserve independent probe guards and live caches. Corp real trigger/resolution trashes the console when useful but yields to a Neurospike kill. Public Corp pressure uses public budget bounds only. |
| Baker 36015 | Real run command/ability selects the useful backdoor with one run-only Stealth credit, declines an exhausted use or absent fuel, and follows through to HQ with actual payment. A better faceup Archives agenda is retained without spending the credit. Cached ordinary breach value excludes active run bonuses so the live redirect does not compare its own bonus against itself; planning context restoration remains covered by integration. |
| Underdome 36016 | Conditional draw-install and install-choice consumers decline guaranteed last-click self-trash and mandatory overdraw, accept a remembered rez, and prepare only for a worthwhile public affordable unrezzed ICE opportunity with another click. Contrasts use actual cached run potentials, not a stubbed decision. End-phase tag removal versus unusable draw, turn reset and actual self-trash pass. |

Shared changes are limited to tag-removal ability/card selection, current legal
play target selection, ordinary-breach caching, guaranteed known bonus accesses,
and final optional breach tags. The latter apply once after finite reruns and
retain probe/defer flags through payment-policy calculators. A discretionary
bonus may be declined without turning an otherwise legal run into a lockout.

The previous integration expectations that Rotary always contributes an access
on an empty/unfunded central board described the reviewed defect, not its text.
They now assert zero in that state; real funded and winning contrasts live in
the permanent batch test. Baker's human options now include an explicit decline.
Metadata and ELO are preserved. No matching pending reproduction was found.

Independent re-review must cover every C3 finding and the matrix above. The
shared play-choice consumer also affects Forged Activation Orders and Beta Build
(batch 4); shared run/access changes require revalidation of batches 1, 2, 12
and 13, particularly terminal steals, finite Horizon reruns and restricted
payments. Implementation does not change any independent verdict or playability.

Final verification: batch 3/integration/hook documentation and required shared
checks pass; `node tests/run-all-tests.js` passes all 93 regression files,
including Corp decision fixtures and decision snapshots. All eight brief entries
have no unfinished markers; metadata/ELO and empty-effect checks pass. No new
accepted limitation or playability change was introduced. Batch 4 is next.

## Batch 3 continuation remediation — 2026-10-14

This supersedes the original future-rez, public Rotary-budget and cached-only
Baker claims in the historical batch 3 implementation entry. Cards remain
36009–36016; metadata/ELO, registry flags and independent verdicts are preserved.
Required repair list: **C3-4 continuation**, **C3-6**, **C3-7**, plus the latest
review's multi-ICE Kompromat, Goods preparation, Rotary setup/composition and
Baker source-allocation evidence. The retained 57-observation diagnostic probe
reproduced the current defects before editing; its recorded JSON digest still
matches the historical review manifest. No matching pending reproduction exists.

| Finding / gap | Current consumers and permanent decision evidence |
|---|---|
| C3-4, Underdome | Both install/draw-install consumers now wait for an observed rez. Cold two-click one/two-credit boards, with/without a matching breaker, hold the resource; they cannot buy it on the assumption that the next command will run. Actual remembered-rez command → install → gain → end-phase draw retains it. A funded HQ pressure run actually pays for a rez while Underdome is in Grip, ends unsuccessfully (success is not required), then installs and draws. Existing last-click decline, hand-space/tag payoff, turn reset and Sell Out final-click expendability remain covered. This uses run-first sequencing rather than a speculative sacrifice-run planner. |
| C3-6, Rotary opposing pressure | `_publicTagAccess` uses `_projectedRunnerClicks` on the Corp turn and actual remaining clicks live. It combines public installed access sources and distinguishes ordinary tag cleanup from credible affordable terminal access. `_terminalCentralAccessAffordable` counts Corp-owned agenda combinations without using hidden HQ/R&D order or Runner private cards. Real `_centralPressureSummary` and `_centralBreachLossRisk` give two accesses and certain loss on the two-card last-click HQ win, identical ordinary pressure with exhausted/fresh Corp-turn trackers, and decline terminal extras without steal clicks/credits or another card. Existing taxed-route optional decline, restricted payments, finite Horizon tags and denial-versus-Neurospike kill remain green. |
| C3-7, Baker Runner | New `AIRunAbilityPlan(server?)` supplies complete verified paths to the actual run-ability cost selector and prioritizes guaranteed affordable winning abilities before setup/cleanup. The same `_redirectPlan` checks live destinations/payment sources. One Stealth credit is reserved, cannot also pay Archives breaks, and is recorded in route cost. The calculator traverses Archives ICE then applies destination successful-run/breach effects, optional payments, terminal steal requirements, prevention and finite ordinary destination reruns. Real command/live choices avoid fatal Hokusai, select safe R&D after fresh/depleted Grip, retain better Archives, accept survivable/prevented wins, decline unfunded steal clicks, and reject a Horizon continuation locked behind destination Ice Wall. Exceptions restore source credits, prospective server/depth and live path/cost caches. |
| C3-7, Baker Corp | `_archivesIsBackdoorTo`, `_archivesBackdoorDestinations` and the existing HQ wrapper propagate both central capabilities to `_breachConsequence`, upgrade placement, `_protectionScore`, `_nothingWorthProtecting` and `_serverHasStakes`. Baker's public capability reserves fuel and checks a surviving route using Corp-owned ICE, public Grip size/prevention/resources and projected preparation clicks. Same-board HQ/R&D agenda stakes select the relevant backdoor consequence, increase Archives protection urgency and disappear with exhausted fuel. Fatal destination, spent origin fuel and used/current-versus-next-turn controls pass. Destination ICE is skipped on the initial redirect and traversed on a forced ordinary rerun. |
| Kompromat evidence | Real reward choices with two rezzed layers derez the funded cheap Ice Wall while preserving Palisade; zero Corp credits instead retain both layers and take publicity. Actual derez/publicity/removal completes. This extends the single-layer and prevention regressions without fixed target lists. |
| Goods evidence | Real command → Goods install/tag → basic tag cleanup → Cleaver install preserves the existing four-MU rig and pays all costs. A two-credit board gains rather than attempting an unfunded sequence. `AIInstallBeforeInstall` requires sufficient added MU, program cost and cleanup clicks/credits; already tagged installs add no tag. |
| Rotary setup/composition evidence | Four-credit setup runs directly, five-credit setup installs for three credits, then runs HQ and chooses the funded optional tag. Docklands Pass plus Rotary covers a three-card known winning HQ only with the expensive agenda's steal click available. Other sources covering all central cards cannot justify another tag. |

`tests/vantagepoint-batch3.test.js` contains this evidence with the real engine,
selectors and calculator; only browser rendering/audio are inert. The exact
Baker extra-potential=3/restored-context assertions moved from the lightweight
integration stub into this complete engine harness; no expectation was weakened.
The finite public net-prevention contrast uses a declarative installed capability
fixture consumed by the actual calculator, rather than a stubbed decision path.
Uncertain central valuations and public capability bounds remain heuristics;
these tests do not claim optimal probabilities or full-match performance.

Re-review the latest independent batch 3 matrix, C3-4/C3-6/C3-7 and all retained
C3-1–C3-5 controls and named evidence gaps. Shared changes require independent
revalidation of batches 1, 2, 4, 12 and 13, legacy Sneakdoor redirects, and Corp
consequence/protection/placement/stakes consumers. Implementation does not renew
any independent verdict or set-wide readiness/playability status.

A composed Baker/Rotary regression also exposed a missing continuation valuation:
ordinary destination ICE had hidden optional access from the cached potential.
The final tag hook now reads the complete route's resources, and
`AIAdditionalAccess(server, rc, point)` reads the accepted per-card breach tags.
Baker values newly enabled central access using the existing 0.5 access metric;
Rotary supplies the same passive R&D value through `AIRunExtraPotential` (HQ
already collects it). Actual scarce/funded command/route/live-breach choices
agree and include the prepaid redirect in the route cost. Replay fixtures now
load real public resource helpers; their expectations and snapshot assertions
remain unchanged. Existing active-run hypothetical-context guard passes.

Verification: focused batch/integration, 172 Corp-security cases, hook docs,
hypothetical-mutation, syntax, format/deck/identity and diff checks pass.
Final `node tests/run-all-tests.js` passes all **93 regression files**, including
`tests/corp-decision-fixtures.test.js` (68 assertions across 17 fixtures) and
`tests/decision-snapshots.test.js` (13 scenarios). The intermediate full run
exposed replay-harness missing public helpers and the existing active-run context
guard; both were fixed without changing fixture/snapshot expectations. Final
required shared and diff checks pass, generated card status was refreshed, and
all eight brief entries have no unfinished markers or empty effects/subroutines.
Metadata/ELO are unchanged. Batch 3 is Complete for implementation; independent
re-review remains required. No new accepted limitation. Batch 4 is next.


## Batch 3 terminal composition remediation — 2026-10-14

Remaining finding **C3-7**, cards 36014/36015, reproduced before editing:
the permanent HQ last-click Baker/Rotary regression chose `gain` instead of
`trigger`. The second independent review's other accepted matrix rows remain
supported by the retained permanent batch3 tests; their findings and verdict
are preserved in the [review report](reviews/vantage-point/vantagepoint-batch-3.md#second-independent-remediation-re-review--2026-10-14).

Rotary's `AIWinningBreachAgenda(server, candidateOnly)` can discover a legally
known extra agenda without first validating destination ICE. Only Baker uses
candidate-only mode through `_publicBreachAgendaCandidates`; ordinary Rotary
callers retain the original route safety. Baker validates its complete paid
Archives route, destination effects, finite ordinary reruns, optional access
record and steal resources. Completed HQ coverage must guarantee every central
card; R&D coverage must reach the known depth. Unknown or probable cards,
Flagship limits and declined optional access cannot become a terminal goal.
This same verified plan reaches early terminal command/card/ability selection,
ordinary run-ability costing, live destination and restricted payment choice;
actual Rotary access checks the remaining live resources after payment.

The new real-path tests exposed two necessary `RunCalculator.CopyPoint` repairs:
copy reserved steal credits instead of losing them when adding optional tags,
and preserve the point's payment policy/damage rather than restoring the
calculator's origin damage. The Shackleton/Corsair/Rotary contrast verifies
exactly four meat damage, declining at Grip=3 and accepting at Grip=4, with
unbreakable destination ICE. No new numerical tuning or rules interpretation.

`composedTerminalAcceptance` in `tests/vantagepoint-batch3.test.js` exercises
HQ/R&D command, chosen Baker ability, one actual Stealth payment, destination,
Rotary tag and legal steal to seven points with zero cleanup resources. Further
contrasts cover Docklands' third HQ card, funded/unfunded additional steal click,
exact/scarce steal pool and actual payment, pool/outside policy branches,
fatal/surviving/prevented destinations, newly depleted live Grip/pool/fuel,
unknown agenda, used Baker, no fuel, finite destination reruns, access limits,
probable HQ coverage, valuable Archives retention and ordinary Rotary safety.
Existing exception/cache, multiple-source allocation and public both-central
redirect tests remain green. No pending reproduction belongs to this finding.

Affected shared consumers: ordinary/terminal Runner run selection, optional
breach tags, terminal steal budgets, finite reruns and payment-policy calculators;
Corp public pressure/security/redirect consumers retain their contracts. Batch
1/2/12/13 tests, 172 Corp security cases, mutation/privacy guards, credit-pool
lock and Tailgate tests pass. Corp architecture now describes both redirect
destinations and the current shared hypothetical guards.

Independent re-review must cover the entire second-review matrix (C3-1–C3-6,
C3-7 base and composed terminal criteria) together, plus these affected shared
consumers and previously passing batches 1, 2 and 13. No new limitation is
accepted, no reviewer verdict is changed and playability remains unchanged.

Verification: final stable `node tests/run-all-tests.js` passes **93 test files**,
including `corp-decision-fixtures.test.js` and `decision-snapshots.test.js`.
All required syntax/integration/format/deck/identity/diff checks and hook docs
pass; card-status regenerated, all eight brief entries show no unfinished
markers, and the range has no empty effects/subroutine arrays. The earlier
full run overlapped source edits and failed the ai-batch cache-reuse assertion;
the stable full rerun passes that test as well. No expectations were weakened.
Batch 3 is Complete for implementation; batch 4 (36017–36020) is next.

## Batch 4 remediation contract — 2026-10-14

Repair scope: 36017–36020, findings C4-1–C4-4 and directly coupled S1.
Historical review probes are diagnostic observations; their old passing hashes
are not current acceptance. No independent verdict is changed.

- **Hiram:** hardware install/trash learns only the current R&D top. Actual
  known-top potential and CommandChoice must run for a useful agenda, decline
  a worthless known top, and stop treating a drawn/shuffled card as the top.
  Human look must explicitly present the card to the Runner without exposing it
  to the Corp. Contrast hidden top substitutions before the trigger.
- **Aircheck (C4-3/S1):** central run uses four hosted credits, outside sources
  and a locked pool. Optional remote is a free new run, using remaining hosted
  credits and a refreshed bad-publicity fund; choose a useful affordable route,
  decline unaffordable/lethal/empty routes despite old positive potential.
  Real calculator failures must restore event/breaker scratch state and runEvent.
  Run-end cleanup must resolve other effects before starting the new run.
- **Beta Build (C4-2/C4-4):** pay three and one click once, install the chosen
  non-virus program for free, run the planned server, then return the still
  installed program. Carry exact legal card/host/server from real planner to
  play choice; changed legal options must not produce an invalid preference.
  Last-click winning Cleaver route beats a higher-ELO irrelevant decoder;
  insufficient payment/MU declines. Ordinary tutors retain separate setup costs.
- **Methuselah (C4-1):** install economy only with expendable hardware and enough
  future run use to repay four credits; preserve necessary hardware. Real install
  selector and run-begin fuel selector must contrast absent/unaffordable/useful
  fuel and costly installation versus existing winning run. Stealth sources
  share the actual Lampades/Corsair route/payment budget, without double counting.

S1 affects Credits/LoseCredits/SpendCredits/GainCredits, run cleanup and pool
presentation: bad-publicity credits remain spendable but cannot be lost or counted
as pool; Stimhack remains pool-equivalent. Revalidate credit lock, source/payment,
Corp security, batches 1–3/13, Paywall (batch 11) and finite prevention consumers.
Repair criterion is real live losses/payments plus opposing public route budgets;
no hidden information or live state mutation is permitted in planning.

### Batch 4 repaired behavior and evidence

Permanent acceptance is in `tests/vantagepoint-batch4.test.js`, loading actual
engine, card definitions, selectors and calculators with browser rendering/audio
inert. The older `vantagepoint-early-strategy.cjs` now aborts on an unrelated,
obsolete early-card observation before reaching this batch; it was not rewritten
as a green test. The isolated actual-helper S1 probe reproduced all four
mismatches before repair and reports zero after repair.

| Finding/card | Supported decision and contrasting evidence |
|---|---|
| Hiram | Real CommandChoice runs for the learned agenda and gains for the learned operation; hidden substitutions give identical potential. Human Runner-only card choice, Grip-hardware trash eligibility, replacement-top privacy and real R&D shuffle invalidation are exercised. `AIWinningBreachAgenda` feeds existing terminal-route priority using only the current learned top. |
| C4-3 / Aircheck | Real calculator exceptions restore the pool, event scratch, bonus breaker, forecast fuel, `rc.runEvent`, run context and hypothetical depth. A free follow-up uses one remaining hosted credit, declines at zero despite a fifteen-credit locked pool, declines lethal Karunā and empty remotes, and accepts a freshly funded route. Actual run-end dispatch observes all cleanup before the next MakeRun and refreshes the fund. |
| C4-2/C4-4 / Beta Build | Real command/card/play-choice selects Cleaver/HQ over a higher-ELO decoder and other servers on the last click; saved exact choice survives another random seed, and invalid saved preference reconstructs the safe legal route. Actual play/install dispatch pays three/one click, actual Cleaver breaking spends the remaining credit, and actual steal reaches seven points. Actual return removes the temporary breaker. Insufficient combined credits and MU decline Beta Build for other legal actions. Existing integration covers viruses, shuffle, hosts, cancellation and uninstalled-target return suppression. |
| C4-1 / Methuselah | Functional economy hook and generic-install gate accept profitable expendable fuel, decline absent/single/necessary fuel and unaffordable investment. Actual console installation spends four before a funded next run. Actual run command/fuel trash/payment consumes forecast credits; necessary Tailor is preserved. Guarded `AIRunStartCreditPlan` models the lost Grip card and source's stealth identity, with no private Corp consumer. One versus two Corsair barriers establishes finite shared reduction/break credits. Existing batch 2 and 13 regressions establish Lampades/Corsair live reserves, alternative funding and opposing public security. |
| S1 | Actual Paywall, empty pool, Corp loss, Aircheck lock, spending fund before Stimhack, Stimhack loss and pool-locked Stimhack payments agree with the updated rules. Real human and AI Stimhack allocations avoid Shackleton's outside-credit response. Corp active-run budgets distinguish pool and outside sources. Display labels the fund separately and restores the pool on a renderer exception. |

New shared consumer contracts are documented in `documentation/ai.md`:
`AITutorStartsRun` and `AIRunStartCreditPlan`. No existing hook was undocumented
or removed from `LEGACY_UNDOCUMENTED`. Card metadata and ELO remain exact.

The old credit-lock assertion expecting one fund credit to be lost under a pool
lock was contradicted by [Null Signal's rules explanation](https://nullsignal.games/blog/the-return-of-bad-publicity-in-vantage-point/).
It now requires zero loss and retention of the fund, while a separate setup
isolates the existing N-Pot hosted-payment check. Expectations were corrected
from rule evidence, not weakened to accommodate a production defect.

Affected re-review scope: all four cards/C4-1–C4-4 and S1; Runner generic tutor,
run-start preparation and run-event restore paths; known-top and terminal-route
consumers; source-sensitive payments and opposing Corp security. Revalidate
batches 1–3/13 and Paywall in batch 11, including finite source/prevention budgets.
The independent review and set-wide verdict are unchanged. No batch limitation
is accepted or deferred to set-wide review.

Incidental pre-existing API misuse found while auditing temporary credit gains:
`sets/creationandcontrol.js` passes reason strings such as `"ability"` and
`"operation"` as GainCredits' temporary argument, including Corp calls; that
already routed ordinary gains into Runner temporary credits. This is a separate
legacy-card repair, outside the selected range. It is not a limitation of the
four selected cards or the bad-publicity/Stimhack contract implemented here.


Final batch 4 verification (2026-10-14, Node 20.19.0):
`node tests/run-all-tests.js` **94/94 passed**, including Corp decision fixtures
and decision snapshots. Focused batch 4, credit lock, batch 2/3/13, 172 Corp
security cases and hook-documentation checks pass. Required syntax, set
integration, eternal/deckbuild/identity checks and `git diff --check` pass.
Card-status regeneration is current; all four brief entries have no unfinished
markers, and the range has no empty Resolve or subroutine arrays. Batch 4 is
Complete for implementation; independent re-review remains required.


## Batch 4 consolidated continuation contract — 2026-10-15

Repair C4-5–C4-8 without changing the independent verdict. Preserve C4-1–C4-4,
Beta Build's one-action tutor and Hiram's private learned-top lifecycle.

- C4-5: actual active credit sources, including resolving events, must reach
  Corsair/Lampades/Baker discovery and both run planners. Forecast Aircheck as
  the same finite Stealth source as live play; inactive/empty events contribute
  nothing. Exercise actual reduction, break and access payments and opposing
  public full-route pricing; never forecast hidden events for the Corp.
- C4-6: optional Aircheck runs use the shared run-start fuel forecast, fresh
  publicity and zero initiating click, without reloading the event. Sacrificed
  Grip is unavailable for damage. Contrast absent/necessary/expendable fuel,
  lethal sacrifice and live second-run trash/break/steal.
- C4-7: prioritize a safe known winning remote over cached ordinary potential.
  All terminal consumers must reserve legal generic steal credits after route
  payments, including fund and unrestricted hosted credits, excluding
  breaker-only sources. Cover ordinary/Hiram/Aircheck, Rotary/Baker and optional
  access preservation with real selectors, allocation and winning continuations;
  preserve finite rerun, prevention, safety and hidden-information regressions.
- C4-8: distinguish forecast pool income from outside hosted funds. Ken's gain
  cannot defeat Aircheck's lock; Cezve, Touchstone and Methuselah remain finite
  sources. Contrast locked/unlocked routes and actual event payment.

Affected consumers requiring independent re-review include batches 1–3/13,
Corp public restricted-route pricing, terminal live recalculation, optional
access reserves and source-sensitive damage. No limitation is accepted.


### Consolidated continuation implementation and permanent evidence

`tests/vantagepoint-batch4.test.js` extends the actual-engine acceptance suite;
review observation probes and historical hashes remain untouched.

| Finding | Changed contract and contrasting permanent evidence |
|---|---|
| C4-5 | Corsair/Lampades/Baker inspect active Stealth sources. Aircheck forecast activates the real event with four credits/lock; common planning removes the duplicate scalar. Actual play → reduction → break → Lampades command/trash spends one finite balance; inactive/empty sources and two-vs-three barriers decline correctly. Public Corp full-route pricing now establishes the exact two-credit reduction/break route; hidden Grip events remain private and state restores. Existing Baker routes and batch 2/3/13 source regressions remain green. |
| C4-6 | `_prepareRunStartCredits`/`_restoreRunStartCredits` serve both common planning and free-follow-up calculation. Ordinary and six-point follow-ups accept expendable Borrowed Goods, decline absent/needed hardware and lethal post-sacrifice Grip. Actual cleanup → MakeRun → hardware trash → two credits → one-credit break → seven-point steal matches the forecast. Faults restore Grip order, source, RC, fund, context and hypothetical depth. Existing fresh-fund/remaining-event/empty-remote controls are retained. |
| C4-7a | Known safe immediate winning remotes precede ordinary potential. Real choice/cleanup/run/steal wins; ordinary six-vs-zero-point and unsafe-target contrasts preserve the higher ordinary target when appropriate. |
| C4-7b | RC separates generic terminal reserves from permanent pool-only continuation reserves. Ordinary/Hiram/Aircheck and Rotary/Baker use complete paid routes, including actual hosted/publicity steals and paid redirects to both centrals. Pool, hosted and fund controls succeed; short and breaker-only funds decline. Live depletion invalidates routes. Optional access declines consuming the sole required follow-up credit, permits spare funding, and actual allocator/break/steal reaches seven. Terminal-only Shackleton payment rejects lethal Grip and actually resolves four damage before the surviving steal. Finite failed attempts refresh publicity, expire event funds and carry installed sources at their remaining balances; five-vs-six hosted-credit total costs and nested source-overlay exception restoration are covered. |
| C4-8 | Ken uses explicit pool-income forecast `AIRunPoolCreditGain`; it remains locked under Aircheck. Cezve/Methuselah/Touchstone retain actual hosted identities; Touchstone's event-play gain uses `AIRunEventCreditGain`, needed to match its real balance rather than a generic scalar. Provider forecasts equal real event-play availability and public Corp budgets; Cezve remains central-only. Real command/card/play/payment takes a useful four-break Aircheck and declines the fifth; ordinary Overclock retains Ken's actual gain. |

A real command test exposed an additional consumer bypass: hand-overflow play
could start a Run event after run planning had rejected it. That generic fallback
now leaves Run events to the actual planner (or their separately explicit
`AIWouldPlay` policy). The useful action has a real high-value HQ access plan;
no potential tuning or selector mocking was introduced.

Necessary out-of-range changes are source discovery on 36004/36005/36015,
terminal consumers on 36014/36015, Ken's forecast classification and Touchstone's
actual event-play source gain. No printed text, metadata or ELO changed. Shared
consumer validation includes batch 1/2/3/12/13, public Corp security, optional
payments, prevention, source-sensitive damage and hypothetical restoration.
No new accepted limitation and no readiness/playability change.


Final continuation verification (2026-10-15, Node 20.19.0):
`node tests/run-all-tests.js` **94/94 passed**, including
`tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
Focused batch 4, set integration, affected batches 1/2/3/12/13, credit lock,
payment UI, 172 Corp-security cases, 34 hypothetical guards, mutation inventory,
and hook documentation pass (142 hooks; 37 legacy exceptions). Required syntax,
eternal format, random decks, identity changes and `git diff --check` pass.
Card-status regeneration is current; brief entries have no unfinished markers;
exact selected-card ELO is preserved and no empty effects/subroutines remain.
Batch 4 is Complete for implementation. Independent full-matrix/shared-consumer
re-review remains required; batch 5 is next. No commit or push was made.
