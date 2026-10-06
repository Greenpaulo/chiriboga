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
