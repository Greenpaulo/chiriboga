# Downfall implementation notes

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
