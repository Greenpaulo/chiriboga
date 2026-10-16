# Downfall implementation notes

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
