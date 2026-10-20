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

Batch 1 is Complete. Batch 2 (26005–26009) is next; the set remains In progress,
hidden and untested. Optional strategy work is queued separately. No commits
or pushes were made.

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

### Open

- ELO for 26015–26018 not set: the Trash or Busto lookup was not available in
  this session.
- Tracker and backlog rows not updated: on `main` the tracker still describes
  Vantage Point; the Downfall transition is in the uncommitted batch 1 work.

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

- Tracker and backlog rows not updated: on `main` the tracker still describes
  Vantage Point; the Downfall tracker exists only on the batch 1 branch. Mark
  batch 5 complete there when the branches merge.
- `AIPreferredPlayChoice` on Sell Out (36011) is declared `(card, choices)` but
  is called with `(choices)`; it would throw if reached through
  `_wastefulToPlay`. Not changed here.
