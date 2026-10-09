# Engine: Scrounge opens an empty install prompt when its play cost leaves no program affordable

**Outcome:** adopted

**Source log:** none. Found by the F4 baseline run (`zwicky-magdalene` seeds 68 and 139); replay with `node scripts/ai-game.js --seed 68:zwicky-magdalene --corp "Zwicky Supermodernism.js" --runner "Magdalene CBB.js" --tail 30`.
**Reproduction:** `tests/pending/scrounge-unaffordable-program-stalls-game.test.js` — `node tests/pending/scrounge-unaffordable-program-stalls-game.test.js` (fails at `44479ba`, confirmed 2026-10-09; promoted unchanged to `tests/scrounge-unaffordable-program-stalls-game.test.js`)

## Resolution

Implemented from `44479ba`, 2026-10-09, on
`bug/scrounge-unaffordable-program-stalls-game`, alongside the authorized F3
collector/comparison completion work.

- Confirmed the unchanged pending reproduction fails by opening an empty
  Scrounge install prompt. The F3 preliminary run also reproduced this at
  `zwicky-magdalene` seeds 8 and 36 in all three cache modes.
- Scrounge's `Resolve` now detects no legal install choices and invokes its
  existing optional add-to-stack continuation instead of opening an empty
  decision. It clears pending install state, offers programs still in the
  Heap plus Done, and returns through the original phase.
- This is an objective uninterrupted-resolution fix under
  [Comprehensive Rules 1.2.4](https://rules.nullsignal.games/?r=rule_playing):
  resolve the possible parts of the instruction. No strategic AI change,
  new AI hook, shared engine guard or stricter play-enumeration policy.
- No plan approval needed: this is the ticket's card-local fix, not a shared
  engine/heuristic change, and no green expectation or hook contract changes.
- The pending reproduction passes and was moved with `git mv` into
  `tests/scrounge-unaffordable-program-stalls-game.test.js`; assertions are
  unchanged. `tests/scrounge-resolution.test.js` adds five real-engine cases:
  affordable install plus optional add, installing the last Heap program,
  unaffordable install with add or decline, and the Heap becoming empty
  between enumeration and resolution. Checks include payment, card zones,
  pending-trigger cleanup, original-phase restoration and no extra clicks.
- The shared helper already lives in `tests/_headless-board.js`; the old
  acceptance criterion asking to move it from pending was stale and corrected.
- Focused tests pass (unchanged reproduction and five resolution variations).
  `node tests/run-all-tests.js`: 74 files passed, including required Corp
  decision fixtures and decision snapshots.
- Former F3 stalls now finish: replay `zwicky-magdalene` seed 8, Corp 7–6
  Runner after 18 turns, `logHash c303faade62f`; seed 36, Corp 4–7 Runner
  after 24 turns, `logHash b3611f7645a6`. Neither replay reports errors.
- The final F3 off/on/verify run also completed all 4,200 executions without
  errors (all seven committed core-v1 pairs, paired seeds 1–200), with
  identical decisions and logs across cache modes.
- Final `node scripts/ticket.js check` passes: reproduction moved unchanged,
  reproduction passes, and all 74 green test files pass.

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
(`tests/_headless-board.js`): Scrounge in the Grip, Mayfly (install
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
- [Verified] Comprehensive Rules 1.2.4 requires resolving as much of an
  instruction as possible when it does not say "if able". So `Resolve` must
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
- [x] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged; the shared helper is already in `tests/_headless-board.js`.
- [x] A variation covers an affordable program (it is installed) and an empty Heap of programs after payment (the add-to-Stack step still runs).
- [x] New or changed AI hooks are documented in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes (74 files).

## Out of scope / related
- Whether the Runner AI should play Scrounge when it cannot then afford the
  install is a separate, strategic question.
- [humanoid-resources-install-stalls-game.md](../humanoid-resources-install-stalls-game.md)
  also leaves the game with no command.
