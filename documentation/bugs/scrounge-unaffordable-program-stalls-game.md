# Engine: Scrounge opens an empty install prompt when its play cost leaves no program affordable

**Source log:** none. Found by the F4 baseline run (`zwicky-magdalene` seeds 68 and 139); replay with `node scripts/ai-game.js --seed 68:zwicky-magdalene --corp "Zwicky Supermodernism.js" --runner "Magdalene CBB.js" --tail 30`.
**Reproduction:** `tests/pending/scrounge-unaffordable-program-stalls-game.test.js` — `node tests/pending/scrounge-unaffordable-program-stalls-game.test.js` (fails at `f795a63`, 2026-10-02)

## Summary
Scrounge (Elevation 35004, play cost 1 and an extra click: install 1 program
from the Heap) checks in `Enumerate` that some Heap program is installable
before the play cost is paid. If paying the 1 credit leaves no program
affordable, `Resolve` opens an install `DecisionPhase` with no options. The
engine logs "No valid commands available" and the game freezes. A human player
hits this the same way as the AI.

## Evidence
Seed 68: `Runner spent 2 clicks`, `Runner spent one credit`, `Played
"Scrounge"`, `ERROR No valid commands available`, `ERROR Null command`.

The state when the empty prompt opened was recorded by wrapping
`DecisionPhase` in the replay:
- seed 68: 0 credits; Heap programs Mayfly (cost 1), Principia (2),
  Chromatophores (1).
- seed 139: 2 credits; Heap programs Principia (3), Echelon (3).

## Reproduction
The test builds the board with the real headless engine
(`tests/pending/_headless-board.js`): Scrounge in the Grip, Mayfly (install
cost 1) as the only Heap program, the Runner with 1 credit and 4 clicks at its
action phase, and `runner.AI.preferred` set to play Scrounge. It asserts that
no decision prompt opens with zero options, that the game does not stall, and
that it finishes. Today an empty prompt is opened by `Scrounge`.

## Root cause
- [Verified] `Resolve` opens `DecisionPhase` with an empty `installChoices`
  list when no Heap program is affordable after paying the play cost — the
  reproduction, and both replays above.
- [Verified] `Enumerate` calls `ChoicesArrayInstall(runner.heap, …)` before the
  play cost is paid, so it counts programs that only the unpaid credit makes
  affordable.
- [Inferred] Under the rules, an event can be played even if its effect cannot
  fully resolve; the effect then does as much as it can. So `Resolve` must
  cope with no affordable program (skip to the "add a program to the bottom of
  your Stack" step) whatever `Enumerate` does.

## Proposed fix
In Scrounge's `Resolve`, when `installChoices` is empty, skip the install and
continue with the optional add-to-Stack step. Separately decide whether
`Enumerate` should account for the play cost; making it stricter alone is not
enough, because other effects can change credits or costs between
`Enumerate` and `Resolve`. A general engine guard that refuses to open an empty
`DecisionPhase` (log the error and continue) would stop the whole class of
freezes. It changes a widely used function, so plan it separately if
preferred.

## Acceptance gate
N/A — deterministic fix (principle 4): the game must always have a valid
command; the rules let the effect do as much as possible.

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged, together with `tests/pending/_headless-board.js`.
- [ ] A variation covers an affordable program (it is installed) and an empty Heap of programs after payment (the add-to-Stack step still runs).
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Whether the Runner AI should play Scrounge when it cannot then afford the
  install is a separate, strategic question.
- [humanoid-resources-install-stalls-game.md](humanoid-resources-install-stalls-game.md)
  also leaves the game with no command.
