# Downfall implementation notes

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
