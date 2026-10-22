# Downfall implementation notes

## Batch 1 — 26001–26004

Codex, 2026-10-16, temporary worktree. Existing partial implementations were
verified rather than credited in advance. Vantage Point's records and review
findings were preserved during the implementation-set transition.

- **Isolation:** legal installed-resource trash cost, paid unpreventably before
  play triggers and income, including response sequencing and cancellation.
  Real Runner economy command and follow-up selection cash out an exhausted
  resource; no target and insufficient credits reject the play. Live resources
  are retained. Its existing economy-list consumer now preserves target choices.
- **Demolisher:** +1 MU, shared trash-cost discount, one credit on the first
  Runner-controlled Corp-card trash each turn. Tracks first-time state while
  inactive; Corp sacrifices, hosted casualties and simultaneous groups do not
  manufacture extra rewards. Shared trash attribution captures the controller
  before priority changes; automatic effect ownership is scoped and restored.
  The real selector installs one useful affordable console. Actual trash cost
  and MU evaluators, credits, both-turn resets and inactive timing are covered.
- **Chisel:** legal ICE hosting, counter-based reduction, mandatory encounter
  growth or preventable host trash. The condition is checked before adding a
  counter, so reaching zero leaves the ICE for this encounter. Host movement
  uses engine encounter cleanup and trashes hosted Chisel. Protected strength,
  purge, missing hosts and disabled-host installation are accounted for. Real
  Runner install selection, full run calculations and Corp planning cover its
  direct effects without changing the board. The ICE model now exposes
  `knownToEvaluator` so synthetic hidden strength cannot become free trash.
  Existing counters are already in `Strength`; Corp shortcut adjustment adds
  only the prospective encounter counter, avoiding double counting.
- **Stargate:** click and per-turn limit, R&D run, mandatory successful-run
  replacement, revealing the top three (or fewer), legal mandatory trash and
  order/visibility restoration. A revealed trashed card remains faceup in
  Archives; prevention restores it facedown in R&D. The delayed effect survives
  the program leaving play. Failed/redirected runs and run end clear state.
  Real Runner commands install before a funded R&D run and activate the card;
  real selection chooses the highest ELO revealed legal target. Successful-run
  suppression and spent-use tests prevent useless activation. Empty R&D does
  not create an impossible choice. No hidden deck content informs pre-run AI.

### Engine contracts and scope

`additionalPlayCostTrash` sequences a selected trash additional cost through
`Play` before `automaticOnPlay`. `Trash` accepts an optional explicit actor,
retains it through prevention and supplies actor/direct-card arguments to
trash callbacks; old callbacks ignore the additional arguments. Automatic
source ownership is restored in `finally`. See `engine_patterns.md` for the
contracts. Callers explicitly forcing another player to trash must name that
player. This does not attempt a global revision of older card implementations.

The batch helper regression now reads the active queue and verifies each source
marker report, rather than assuming Vantage Point batch 3 is always complete.
No existing gameplay assertions were removed or relaxed.

All four cards previously lacked ELO. Exact values from
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking), checked
2026-10-16: Isolation 1269, Demolisher 1371, Chisel 1663, Stargate 1710. No other
card's ELO or gameplay was changed.

### Focused evidence and optimisation

`tests/downfall-integration.test.js` covers the mechanics and real consumers
above. Browser rendering and interactive manual games were not tested; the
ignored artwork is linked from the original checkout for read-only
filesystem integration checks.

Queue deeper strategy separately: Isolation's competition with other economy
and willingness to cash out a still-useful resource; Demolisher against other
consoles; Chisel host rankings and repeated-run setup; Stargate revealed target
value versus ELO, an immediate ordinary agenda steal, competing breach
replacements and Archives follow-up plans. These are optional policy advances;
baseline mechanics, legality, direct accounting and usable choices are tested.

### Required verification

All 95 test files pass under Node 20.19.0 using the full
`node tests/run-all-tests.js` command, including Corp decision fixtures and
decision snapshots; known-red pending reproductions remain excluded. The
focused batch, hook documentation, hypothetical mutation, empty-trash, Corp
security, Vantage Point integration and batch 13 checks also pass. Required
Eternal-format, format-aware deckbuilder and identity-change checks pass.
Edited JavaScript syntax checks and `git diff --check` pass. The first full
run identified the old tracker-test assumption and an empty-trash context
lookup; both were repaired before the passing full run.

Batch 1 is Complete. At this batch’s handoff, batch 2 was next. The current
implementation queue is maintained in [the tracker](current-set-implementation.md);
the set remains In progress, hidden and untested.

## Batch 2 — 26005–26009

Reconciled against PR #66 on 2026-10-20. Focused evidence:
`tests/downfall-batch2.test.js`, using the real engine, selectors and run
calculator. The detailed baseline policies are in
[Downfall Batch 2 card hooks](../ai.md#downfall-batch-2-card-hooks).

- Utae pays X once for its once-per-run multi-break; the other break requires
  three installed Virtual resources. Trickster Taka funds programs during runs;
  Fencer Fueno funds trash/steal costs after a successful run.
- Climactic Showdown removes itself before choosing a protected server. Its
  optional Corp trash prevents the lingering HQ/R&D access bonus. The Nihilist
  spends virus counters before the Corp chooses an R&D trash or Runner draw.
  Both Corp-chosen trashes explicitly retain Corp attribution when their
  decision returns to Runner priority; the real phase flow is covered.
- Missing ELO values were copied from the published Trash or Busto ranking on
  2026-10-20: Utae 1205, Showdown 1194, Fueno 1557, Nihilist 1364, Taka 1659.

### Batch 2 optimisation

Queue deeper Showdown server/trash valuation, Utae break sequencing,
hosted-credit/tag trade-offs and use of other programs’ Nihilist counters.
Current policies use local thresholds; no independent review is recorded.

## Batch 3 — 26010–26014

Implemented by Claude on 2026-10-16 on a branch from `main`, in parallel with
batch 1. ELO values are from the Trash or Busto ranking on 2026-10-16. Focused
evidence: `tests/downfall-batch3.test.js` (nine real-engine scenarios with both
AIs; human menus driven phase by phase, AI cases through the main loop).

### Rulings and mechanics

- **Az McCaffrey.** The discount opportunity is used by the first job
  resource, connection resource or hardware installed in a turn, including an
  install that ignores costs. Non-qualifying installs leave it available. It
  resets at the start of each player's turn.
- **Always Have a Backup Plan.** The rerun is offered only when the first run
  ends unsuccessfully and the attacked server still exists. It is optional
  (in-card decline). The second run starts from the run-end cleanup queue, so
  it costs no click. "Last piece of ice you encountered" is the most recent
  `automaticOnEncounter` ice of the first run; if none was encountered there is
  no bypass. During the second run that ice is bypassed every time it is
  encountered. No engine "additional cost to run" exists yet, so "ignoring any
  additional costs" has nothing to waive: the Downfall cards that add run
  costs (the "As an additional cost to run this server" stubs) must waive them
  while the card's `secondRun` is true when they are implemented.
- **Blueberry!™ Diesel.** Looks at the top two cards (the end of
  `runner.stack`), optionally moves one to the bottom (index 0), then draws 2.
  With an empty stack it simply draws nothing.
- **Flip Switch.** All three abilities are usable only during the Runner's
  turn. The trash abilities are paid abilities, so they appear in paid ability
  windows (post-action, run windows), not as action-phase click abilities.
  Jack out is offered only during a run.
- **Lucky Charm.** Usable after a successful HQ run earlier in the same turn,
  tracked while the card is anywhere (the condition concerns the Runner).
  `EndTheRun` is only called by Corp card abilities, so every preventable
  end-the-run qualifies. It is removed from the game as the cost.

### Engine changes

- `Trace` now opens a `responseOnTraceInitiated` window (priority to
  `playerTurn`) after setting `traceStrength` and before the Corp raises
  strength; the remainder moved to `TraceStrengthDecisions`. With no response
  the trace continues synchronously as before.
- Response windows require every enumerated trigger to be resolved, so the
  optional Lucky Charm and Flip Switch trace interrupt each offer an explicit
  decline choice. Documented in `engine_patterns.md`.

### AI decisions

- Runner AI tagged branch: a new `AITriggerToRemoveTags` consumer triggers a
  free tag-removal paid ability in the first window that offers it, and skips
  the basic remove-tag action while one is usable.
- Backup Plan reruns only if the run calculator finds a complete path with the
  bypass applied (declines when inner ice still stops it); its encounter
  options feed the bypass to the path, which the AI executes.
- Flip Switch zeroes a trace whose base strength exceeds the Runner's link.
- Lucky Charm prevents the end of a run on a server with positive cached
  potential.
- Blueberry!™ Diesel is played through the draw consumer (`AIPlayToDraw: 2`)
  and bottoms a redundant unique or extra console.

### Deeper strategy (optimisation queue)

- The Runner AI does not seek out Backup Plan: its extra potential is small and
  the run planner does not value the second-chance bypass, so it is played only
  when a run is otherwise attractive. The rerun decision uses the cached
  potential from the last run decision.
- Flip Switch has no AI jack-out policy, and its trace decision ignores the
  Corp's credits to boost and the trace's consequence.
- Lucky Charm is not valued when installing, and the AI does not sequence an
  HQ run first to enable it.
- Blueberry!™ Diesel's bottom choice only recognises redundant cards.
- Az McCaffrey has no AI preference for qualifying installs beyond the cost.

### Found outside this batch

- Chain Reaction (Vantage Point 36001) records its central runs from a
  `responseOnRunSuccessful` server parameter, but `phases.runSuccessful` passes
  none, so its play condition can never be met in a real game. Not changed
  here; it belongs to the Vantage Point optimisation queue.

## Batch 4 — 26015–26018

Claude, 2026-10-16. Focused test: `tests/downfall-batch4.test.js` (real engine
and Runner AI).

### Rulings and engine changes

- "The first time each turn" conditions about game events count events from
  before the card was active. The engine now records them:
  `RecordTurnEvent`/`TurnEventCount` in `utility.js`, cleared by `ChangePhase`
  when a turn begins. `Install` records `runnerHardwareInstall`; `Draw` records
  `runnerDraw`/`corpDraw` once per draw that would draw at least 1 card.
- Ice derezzed during its encounter no longer fires its subroutines
  (`phases.runSubroutines` skips unrezzed ice).
- Bukhgalter: per CR 6.5.7b the program fully breaks ice only if it broke every
  subroutine itself. The existing definition paid out whenever the last
  subroutine was broken; it now tracks its own breaks for the encounter.
- Masterwork (v37): its own install counts as a hardware install, so it draws
  when it is the first hardware installed that turn. The run-begin install adds
  1[c] through a temporary `modifyInstallCost`, so affordability and payment use
  the normal install path; the extra cost clears on payment, cancel or
  completion.
- "Baklan" Bochkin: only X equal to the ice's strength (minimum 0) is offered,
  because the card is trashed either way. Counters and trash are paid before the
  derez; the tag is taken whether or not the derez happens.
- The Class Act: `Draw` moves cards before its responses, so the interrupt
  resolves as the equivalent choice afterwards — the drawn cards plus the new
  top card of the stack; choosing a drawn card swaps it for that top card. With
  no card left in the stack every looked-at card would be drawn anyway, so no
  choice is offered. Any other `responseOnCardsDrawn` effect on Runner draws
  would see the pre-swap cards; none exists today. The draw-4 fires at the end
  of either player's discard phase in the turn it was installed.

### Baseline AI

- Masterwork: kept/installed as a Console; at run start installs a hardware it
  would keep only if the cached run path stays affordable after cost + 1.
- Bukhgalter: existing `AIImplementBreaker` (killer, 1/1/1/1).
- Baklan: `AIImplementBreaker` adds a bypass-style point (tag + moderate cost)
  for ice at or below its available counters, counting the run's first
  encounter; reserved for servers with potential ≥ 1.5. The run path triggers
  it through the normal persistent-ability route.
- The Class Act: `AIDrawInstall` 2; bottoms a duplicate unique, else a card the
  AI would not keep, else the lowest-ELO card.

### Optimisation queue

- Bukhgalter's 2[c] full-break gain is not modelled in run costing.
- Masterwork's run-start install ignores clicks/MU trade-offs and competing uses
  of the credits; Baklan's 1.5 potential threshold is uncalibrated.
- The Class Act bottoming choice does not plan around tutors or known
  upcoming needs.

### Batch 4 record reconciliation

The missing ELO values for 26015–26018 were backfilled from the published
Trash or Busto ranking on 2026-10-20: Masterwork 1576, Bukhgalter 1947,
Baklan 1448 and The Class Act 1942. The tracker and gameplay backlog now
record this batch’s implementation; optional strategy work remains queued.

## Batch 5 — 26019–26023

Claude, 2026-10-16. Focused test: `tests/downfall-batch5.test.js` (real engine
and Runner AI). ELO from the Trash or Busto ranking on 2026-10-16: Lat 1766,
In the Groove 1477, Khusyuk 1491, Spec Work 1585, Supercorridor 1295.

### Rulings and engine changes

- `responseOnRunnerTurnEnds` / `responseOnCorpTurnEnds` have no engine
  consumer, so the existing Supercorridor trigger never fired. "When your turn
  ends" now uses `responseOnRunnerDiscardEnds` (Runner 2.3), where both
  conditions trigger. Tinkering (coreset) and other cards still rely on the dead
  hooks for cleanup; that is outside this batch.
- "Play only as your first [click]": the engine now counts clicks spent per
  turn (`SpendClicks` → `ClicksSpentThisTurn(player)`, reset by `ResetClicks`).
  Lost clicks are not spent. In the Groove's `Enumerate` refuses once a click
  has been spent.
- In the Groove's "remainder of this turn" effect stays on the card in the heap
  (`availableWhenInactive`) and ends at the Runner's discard-end window or the
  next Corp turn. Each copy played is a separate effect. "Printed install cost"
  is the card's `installCost`, ignoring modifiers.
- Khusyuk: the set-aside cards stay on top of R&D, faceup, while the Runner
  picks 1 to access through the normal `phases.runAccessingCard` (steal, trash
  and on-access effects all apply). `modifyAccessCardAllowed` blocks R&D root
  cards and any extra breach access. Afterwards R&D is shuffled and positional
  knowledge (`knownToRunner`) on R&D cards is cleared. Only costs an installed
  card actually has are offered; with none, X is 0 and nothing is set aside.
- Breach replacements resolve after the engine has entered Run 6.4, and its
  automatic `responseOnRunEnds` triggers fire on entry, before the replacement.
  Khusyuk therefore keeps its state out of `responseOnRunEnds`, cleans up in
  `automaticOnRunEndCleanup`, and returns from its access to Run 6.4 through a
  one-shot phase so Run 6.4 is not re-initialised (which would fire every
  automatic run-end trigger twice).
- Spec Work: trashing the program is a cost (unpreventable) and may target
  hosted programs; the gain and draw wait for the trash to finish.

### Baseline AI

- Lat and Supercorridor: the AI always takes the optional draw / 2[c].
- In the Groove: `AIPlayWhenCan` gated by `AIWouldPlay` — first click, at
  least two wanted, installable, affordable grip cards with printed cost ≥ 1
  within the remaining clicks. The trigger gains when credits are below 4 or
  hand space is short, otherwise draws.
- Khusyuk: `AIRunEventExtraPotential` on R&D, `0.4 × (X − 1)` for X ≥ 2; picks
  the cost with the most installed cards; accesses an agenda first, then a card
  it can trash keeping 3[c].
- Spec Work: played only with a program it can spare (`AIOkToTrash`, a
  non-icebreaker costing ≤ 1, or a duplicated breaker type).

### Optimisation queue

- Lat: no planning to match HQ size (e.g. holding or playing a card to equalise).
- Supercorridor: no planning to end the turn at the Corp's credit total.
- In the Groove: does not reorder installs or plan the turn around the effect;
  draw/gain split is a fixed threshold.
- Khusyuk: the 0.4 per extra card is uncalibrated; access choice ignores
  known upgrades/ambushes and trash value.
- Spec Work: no comparison with keeping a weak program for later.

### Open

- `AIPreferredPlayChoice` on Sell Out (36011) is declared `(card, choices)` but
  is called with `(choices)`; it would throw if reached through
  `_wastefulToPlay`. Not changed here.


## Batch 6 — 26024–26030

Reconciled against PR #66 on 2026-10-20. Focused evidence:
`tests/downfall-batch6.test.js`, using the real engine, selectors and run
calculator. See [Downfall Batch 6 card hooks](../ai.md#downfall-batch-6-card-hooks)
for the implemented baseline policies and consumers.

- Gauss gains strength for its install turn. Pelangi adds an encounter subtype
  by spending a virus counter once per turn; the run calculator and live
  breaker choices follow that subtype. Rezeki gains at Runner turn start.
- The Artist’s credit and discounted-install abilities have separate per-turn
  limits. Its install enumeration restores the prior temporary discount in
  `finally`, including failed AI planning and nested evaluation.
- Direct Access blanks both identities for its run and restores hypothetical
  AI state. Rejig returns a card as a cost and uses its printed cost as an
  install discount. Whistleblower’s named-agenda effect survives its trash
  and expires at run end; its AI uses known reachable agendas.
- Missing ELO values were copied from the published Trash or Busto ranking on
  2026-10-20: Gauss 1639, Pelangi 1604, Rezeki 1981, The Artist 1334,
  Direct Access 1337, Rejig 1552 and Whistleblower 1164.

### Batch 6 optimisation

Queue Pelangi counter conservation/type selection, Artist install timing,
Direct Access valuation, Rejig target value and Whistleblower timing. Current
policies are baseline choices; no independent review is recorded.

## Batch 7 — 26031–26035

Reconciled against PR #66 on 2026-10-20. Focused evidence:
`tests/downfall-batch7.test.js`, covering real engine phases, trash attribution
and Corp AI selectors. See
[Downfall Batch 7 card hooks](../ai.md#downfall-batch-7-card-hooks).

- MirrorMorph records completed Corp actions and offers a credit or a different
  extra action after three different actions. The post-action response fires
  once; the restricted extra action goes through the normal main phase.
- Architect Deployment Test looks at the top five R&D cards and optionally
  installs and rezzes one asset, upgrade or ice; the AI ranks legal install
  choices through the existing Corp install evaluator.
- Calvin B4L3Y and Nanoetching Matrix have once-per-turn click abilities. Their
  optional trash responses require the Runner to trash the rezzed asset.
  Calvin’s AI draw ability keeps R&D above zero.
- Hagen loses strength per installed icebreaker and can trash only a program
  without a Decoder, Fracter or Killer subtype before its end-the-run subroutine.

### Batch 7 optimisation

Queue MirrorMorph action ordering, Architect Deployment Test install value,
asset activation timing and Hagen program-trash value. Independent review and
set-wide review remain unrequested in the tracker.

## PR #66 record reconciliation — 2026-10-20

Batches 2 and 4–7 were implemented in this PR but absent from the completion
and optimisation logs. The tracker now records seven completed batches and
six pending batches, with batch 8 selected next. Reconciliation dates describe
this verification, not reconstructed original implementation dates. All six
batch 2–7 focused test files pass on Node 20.19.0. Masterwork’s hypothetical
surcharge helpers and The Artist’s discounted enumeration restore their prior
state on success and exceptions; regressions cover both ordinary and already
active state. The asynchronous surcharge used during an actual Masterwork
install remains until its existing completion/cancel callbacks clear it.

## Batch 8 — 26036–26040 (2026-10-16)

Implemented on `cards/downfall-batch-8`, from local `main` at `60fa0d7`, in
`/private/tmp/chiriboga-downfall-batch-8`. Batch 1 and batches 2–7 were originally maintained
separately; they were integrated from main for PR #67 on 2026-10-20. The Downfall tracker setup and
Vantage Point archive/record were copied from the batch 1 worktree; its gameplay,
shared gameplay changes and completion claims were not copied. The tracker-aware
agent-script regression was reused to remove its historic Vantage Point batch assumption.

### Mechanics and baseline AI

- Fully Operational resolves the first choice before counting qualifying
  remotes; subsequent repeats use that fixed count. Draw and operation-credit
  responses finish before the next choice. Its real Corp economy selector
  plays it; mode selection draws into a small HQ when funded and otherwise
  gains credits.
- Red Level Clearance chooses two different modes in either order, waits for
  draw/install completion, excludes agendas from the install choices and pays
  normal install costs. An impossible install instruction resolves without an
  effect. Its economy selector plays it, choosing credits followed by useful
  draw or the refunded click. Human choices retain all four modes.
- Cold Site Server spends action clicks to add power counters, charges both
  clicks and credits before declaring a run, and clears counters at the next
  Corp turn start while active. The real Corp main-phase selector banks up to
  three counters on an agenda remote after higher-priority tactics; placement
  values protected remotes. The run calculator accounts for entry costs on
  complete and incomplete routes, uses pool credits rather than future
  bad-publicity credits, and does not charge again on mid-run recalculation.
- Hyoubu Institute reveals a random grip card or the top stack card, with empty
  zone and action-click guards. Shared reveal notifications identify the
  revealing player, including mandatory Runner R&D access reveals. It gains
  one credit on the first Corp reveal each turn. The real Corp main-phase
  selector uses a spare click for information and income, without examining
  either hidden zone while selecting a target.
- Project Yagi-Uda gains counters for advancement past three and offers legal
  HQ/root/ICE swaps only during a run from the Corp score area. Swaps preserve
  the exact position and a sole-card remote, respect root/Region/destination
  restrictions, perform uninstall interrupts and hosted-card cleanup, reset
  departing counters and install incoming cards unrezzed without costs.
  Install responses finish before the Runner's optional jack-out. Swapping
  encountered ICE ends that encounter; approaching ICE retains its position.
  The real paid-window selector rescues an exposed agenda or replaces currently
  approached ICE with a stronger affordable piece. The Runner recalculates the
  remaining route to choose whether to continue. Overadvancement aims for four.

Focused evidence is in `tests/downfall-batch8.test.js`: human mode sequencing,
real legal-action discovery/payment/movement, both operation economy consumers,
Corp setup and paid-window selectors, Runner post-swap selection, run calculator
resource/cleanup contrasts, and reveal actor/once-per-turn contrasts.

### Shared contracts

`AdditionalRunCosts(server)` sums active `modifyRunClickCost` and
`modifyRunCreditCost` modifiers. Basic runs and Run-event play checks reserve
these resources; `MakeRun(server, ignoreAdditionalCosts = false)` pays them
before declaration and before granting bad-publicity credits. The explicit
waiver is used by Always Have a Backup Plan for its second run, including
when Cold Site Server would otherwise require extra clicks and credits.

`GainCredits` accepts an optional fifth `afterGain` callback, invoked after
operation/agenda credit-gain responses, allowing repeated instructions to wait.
`Reveal` accepts an optional sixth `revealingPlayer` argument and emits
`automaticOnReveal(card, revealingPlayer)`. The default actor is the active
player, except mandatory R&D access reveals, which belong to the Runner.

The run calculator's House of Knives check now identifies that agenda before
counting its counters; Yagi-Uda counters do not represent net damage.

### Rules and metadata sources

The [Downfall release notes](https://nullsignal.games/products/downfall/dfreleasenotes/)
clarify Fully Operational's repeat-count timing and Yagi-Uda's approach,
encounter and immediate jack-out behavior. The
[Comprehensive Rules, section 8.8](https://rules.nullsignal.games/?r=section_swapping_cards)
require legal destinations and unrezzed incoming Corp cards, and distinguish a
swap from the normal install procedure. Focused tests preserve those rulings.

These five definitions had no ELO property on main. Exact
[Trash or Busto rankings](https://trash-or-busto.herokuapp.com/ranking), retrieved
2026-10-16: Fully Operational 1879, Red Level Clearance 1831, Cold Site Server
1455, Hyoubu Institute 1147, Project Yagi-Uda 1536. Other cards were untouched.

### Optional strategy work

Compare Fully Operational's marginal draw/credit mix with competing economy;
compare all Red Level install and click sequences; calibrate Cold Site's counter
budget and placement against scoring progress; value Hyoubu information against
other spare-click actions; compare Yagi-Uda swaps/overadvancement with rez,
agenda-access, immediate-win and future-counter plans. Its initial swap policy
uses known Corp cards and printed ICE strength, rather than comparing full
counterfactual defense routes. Independent review has not been requested.

### Verification

Passed on Node 20.19.0: `tests/downfall-batch8.test.js`,
`tests/agent-scripts.test.js`, `tests/ai-hook-docs.test.js`,
`tests/eternal-format.test.js`, `tests/deckbuild-format-pool.test.js`, and
`tests/decklauncher-identity-change.test.js`; syntax and diff checks pass.
All five batch cards show no unfinished markers. Card status was regenerated.

The first full run exposed the old agent-script assumption that active batch 3
must be complete. Its replacement checks the actual tracker range and compares
marker reports with source, retaining the assertion for completed batches.
A later focused check also covers charging Cold Site entry again on a forced
subsequent run, while mid-run recalculation owes none.

### Resume verification (2026-10-18)

The previous full runs completed with three failures: the posture-feedback VM
harness lacked the new run-entry helpers, and this temporary worktree lacked
ignored local art required by flipped-identity and Vantage Point integration
checks. The posture-only harness now explicitly supplies a zero-modifier run
cost environment; the batch test continues to exercise real cost utilities,
legality and payment. Local art is linked under the ignored `images/` directory
from the main workspace, without adding image assets to the change.

Passed again on Node 20.19.0: the three previously failing test files,
`tests/downfall-batch8.test.js`, `tests/agent-scripts.test.js`,
`tests/ai-hook-docs.test.js`, and all three required shared format checks.
Card status was regenerated and the batch brief confirms no unfinished markers
for all five cards. No changes were made to other batches.

Final full regression verification passed on Node 20.19.0: all 95 test files,
including Corp decision fixtures and decision snapshots. The run completed with
exit status 0, recorded in
`/private/tmp/chiriboga-downfall-batch-8-resumed-tests.status`; its summary is in
`/private/tmp/chiriboga-downfall-batch-8-resumed-tests.log`.
Batch 8 is Complete; its optimisation row is Pending for the strategy items
above. Batches 1–7 were subsequently integrated from main for PR #67.

## PR #67 merge reconciliation — 2026-10-20

Integrated main's batches 1–7 with batch 8, retaining maintained Vantage Point
records and regenerating card status. Removed duplicate ELO properties introduced
by the merge. Always Have a Backup Plan now uses the additional-cost waiver for
its second run; the real-engine batch 3 regression verifies Cold Site Server
charges the first run and waives both costs for the second. Removing the waiver
makes that regression fail.

On Node 20.19.0, batch 3 and batch 8 focused checks, AI hook documentation and
generated card status checks passed. Final `node tests/run-all-tests.js` passed
all 109 test files (exit 0), including Corp decision fixtures, decision snapshots
and integration tests. Output and status were saved separately in
`/private/tmp/pr67-merge-tests.log` and `/private/tmp/pr67-merge-tests.status`.

## Batch 8 run-event payment repair — 2026-10-20

Bounded required repair for Cold Site Server (26038) and shared run-event
legality: the additional-run-cost check reserved the event's entire play cost
using only sources eligible for initiating a run. This rejected Dirty Laundry
with one pool credit plus one credit on Prepaid VoicePAD, even without a tax.
The new regression failed on that exact assertion before the repair.

`FullCheckPlay` still checks event affordability with its actual payment
purpose and card. The run-entry helper now reserves only the event cost left
after event-only sources, preserving separate run-entry payment restrictions.
Credits eligible for both costs are counted once. No AI hooks or card
definitions changed; the House of Knives calculator correction is retained.

Permanent evidence in `tests/downfall-batch8.test.js` covers Prepaid-funded
Dirty Laundry without a tax, sufficient versus insufficient combined funds,
exhausted Prepaid credits, shared hosted credits, additional click costs, and
actual event payment followed by run initiation and payment of the tax.
Batch 3's first-run tax/second-run waiver regression also passes. The other
batch 8 cards and optional strategy queue are outside this repair's scope.
Shared consumers revalidated include ordinary run actions, run events from
System Update 2021, and Always Have a Backup Plan from batch 3.

Focused batch 8/batch 3 checks and required shared format checks pass on Node
20.19.0. Final `node tests/run-all-tests.js` passed all 109 files (exit 0),
including Corp decision fixtures, decision snapshots and integration tests.
Output/status are saved to
`/private/tmp/chiriboga-run-event-payment-tests.log` and
`/private/tmp/chiriboga-run-event-payment-tests.status`. Independent review of
this bounded repair remains required; optional batch strategy work is unchanged.

## Batch 9 — 26041–26046

Implemented by Codex, 2026-10-22. Existing metadata and exact ELOs preserved.

- **Sting!** resolves score/steal damage only for itself and counts the opposite
  player's copies after movement into the score area. Ordinary agenda scoring,
  bait evaluation, known-root Runner run costing and Corp breach-damage
  evaluation consume its baseline support. Winning steals omit post-win damage
  in the evaluators.
- **Public Health Portal** uses the real reveal API, including the Corp reveal
  notification consumed by Hyoubu, and waits for viewing completion before
  income. Empty R&D still yields income under the do-as-much-as-possible rule.
  The real install and paid-window rez consumers exercise its economy route.
- **Storgotic Resonator** is unique and gains one counter for the first matching
  direct Corp trash each turn, including damage and trashes from noninstalled
  zones. Earlier matching trashes while unrezzed consume that turn's opportunity;
  Runner-controlled trashes and off-faction cards do not qualify. A stable event
  ordinal prevents nested automatic trashes from changing the first event's
  eligibility. Click damage checks action timing, counters and clicks; real
  command selection activates it and cannot use an empty counter pool.
- **Saisentan** offers the mandatory encounter type choice and all three damage
  subroutines. Each original subroutine can cause one separately preventable
  bonus; that bonus is from the encounter ability and does not recursively
  amplify itself. Cleanup clears the type at encounter end, even if inactive.
  Corp choices use public Heap/rig type frequencies. The real ICE calculator
  budgets the possible extra damage conservatively, without Corp grip access.
- **Complete Image** checks three agenda points and a successful run during the
  preceding Runner turn. Each name/damage step waits for damage prevention and
  trash responses, repeats only on an actual named casualty, and ends the action
  phase after the chain. It cleans up its resolving operation. Baseline AI uses
  its real play selector against a small grip and guesses from public names;
  it does not inspect hidden grip or stack card names.
- **Letheia Nisei** is unique, tracks the first approach even while unrezzed,
  plays secret affordable 0–2 credit bids, offers the optional trash only after
  different bids, and moves the Runner to the outermost ICE in the same run.
  The Runner may jack out and otherwise reapproaches that ICE. The install and
  rez consumers choose an ICE-protected destination and its approach window.
  Real optional-choice and Runner run-calculation consumers handle trash and
  continuation. Run-local calculator persistents bound the possible repeated
  traversal to one per upgrade and preserve spent credits, clicks, damage,
  breaker resources and run-duration effects; they refresh no run-start funds.
  The Corp safety proof does not turn a chance-based Psi outcome into a lockout.

Rules consulted: local Comprehensive Rules v26.03, §§5.4.3–5.4.4 (Terminal
ends the action phase directly), 10.14.3 (legal bid credit sources, including
hosted funds) and 10.14.4–10.14.6 (secret bids, payment-source order, no
checkpoint between bid payments). `PsiGame` defers spend responses until both
payments finish; focused tests assert that observers see both deductions.

Focused evidence: `tests/downfall-batch9.test.js` drives the real score/play,
install/rez, click-trigger and option selectors, engine trash/damage/reveal
flows, known-root/ICE run evaluation, and finite repeat traversal. Negative
cases include wrong score trigger, no qualifying run/points/credits, wrong
trash actor/faction, earlier inactive and nested trashes, empty counters,
prevented damage, repeat-approach expiry, zero-credit bids and insufficient
same-run payment resources. Required shared format/deck/integration checks
also pass. Final validation: all **114 full-suite test files pass** on Node
20.19.0, including Corp decision fixtures and decision snapshots; exit status
0. Known-red pending reproductions remain excluded. Syntax checks, hook docs,
agent-script checks and `git diff --check` pass.

Optional optimisation: compare Resonator damage with scoring and economy;
improve Complete Image play thresholds and public title inference; calibrate
Saisentan type priors and its conservative two-damage bound; choose Letheia
bids and trash timing by expected re-encounter/breach value and rank protected
destinations by actual taxed cost. These are baseline heuristic limitations,
not missing printed mechanics or deferred required consumers.

Saisentan's subroutine overlays were measured with
`node scripts/measure-subroutine-visual.js 26044` and checked with the ASCII
zoom helper: centres 155, 175 and 195, each one printed line (`h: 16`). The
focused visual regression and measurement audit pass. Initial full validation
caught these missing overlay fields; they were repaired before final rerun.
