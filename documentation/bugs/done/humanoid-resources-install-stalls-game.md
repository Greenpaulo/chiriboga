# Engine: Humanoid Resources' installs leave the game with no valid command

**Outcome:** adopted

**Source log:** none. Found by the F4 baseline run (`leo-topan` seed 101); replay with `node scripts/ai-game.js --seed 101:leo-topan --corp "LEO Glacier.js" --runner "Topan CBB.js" --tail 30`.
**Reproduction:** `tests/pending/humanoid-resources-install-stalls-game.test.js` — `node tests/pending/humanoid-resources-install-stalls-game.test.js` (fails at `f795a63`, 2026-10-02)

## Resolution

Implemented from `2c58361`, 2026-10-08.

- `humanoidResourcesInstall` now continues from `Install`'s final
  `onInstallComplete` callback with `returnToPhase=true`, after payment and
  all install responses finish. Only successful installs consume the two-card
  allowance. Cancellation restores the card to HQ and reopens the menu with
  the same allowance; skip paths return through the original phase.
- `humanoidResourcesPlayOp` now checks the operation's real `Enumerate` in
  addition to affordability. This excludes operations such as Petty Cash
  after a completed action while still allowing the free play with zero
  clicks. `FullCheckPlay` is unsuitable here because it requires action clicks.
- The unchanged reproduction is now
  `tests/humanoid-resources-install-stalls-game.test.js` and passes with
  `node tests/humanoid-resources-install-stalls-game.test.js`.
  `tests/humanoid-resources-resolution.test.js` passes seven real-engine
  scenarios: two installs and operation play, skipping all installs,
  skipping the second install, skipping the operation, cancellation and
  retry, nested install-response decisions, and operation restrictions and
  affordability. The tests verify original-phase restoration and no extra
  action click.
- The change is an objective legality and uninterrupted-resolution fix,
  with no strategic AI preference, AI hook change, or acceptance gate needed.
  The extra operation-legality defect is covered by the approved plan.
  The shared helper already lives at `tests/_headless-board.js`; the stale
  criterion asking to move it has been corrected.
- Startup replay command:
  `node scripts/ai-batch.js replay --pool tests/fixtures/ai-batch/deck-pool-startup-format.json --pairs pd-muslihaT --seeds 25`.
  Humanoid Resources resolves two installs and plays Nanomanagement; the
  game finishes at 23 turns (Runner wins by empty R&D, Corp 5–5 Runner,
  log hash `22cdcf4238c1`), instead of stalling at turn 16.
- `node tests/run-all-tests.js`: all 71 test files pass, including
  `tests/corp-decision-fixtures.test.js`, `tests/decision-snapshots.test.js`,
  the promoted reproduction and the new resolution scenarios.

## Implementation plan

Proposed at `e894637`, revalidated at `2c58361`, 2026-10-08. **Approved 2026-10-08.**

- **Validation:** the original pending reproduction still stalls after the
  first install (confirmed again at `2c58361`: `stalled: no main-loop step
  for 3 s after: Null command`). Current code still starts the next prompt
  immediately after calling `Install`; its final callback runs only after
  install responses. The operation menu still checks only credits, while
  Petty Cash's `Enumerate` rejects play after a completed action. These two
  helpers have no callers outside this card's resolution chain.
  A temporary card-only experiment moved the continuation to
  `Install`'s final `onInstallComplete` callback with `returnToPhase=true`.
  Both installs then finished, but the unchanged reproduction still stalled
  at `Playing Petty Cash`, whose real `Enumerate` returned zero choices.
  The experiment was reverted. The proposed install fix is necessary but
  insufficient; the operation menu's credit-only eligibility check also
  permits operations with unsatisfied play restrictions.
- **Approach:** sequence the second install and optional operation after all
  install responses complete, retaining the original return phase. Handle
  cancellation explicitly. Filter the free operation offer by affordability
  and the operation's legal enumerated choices without requiring another
  action click; `FullCheckPlay` requires clicks even with its second argument
  false, so it cannot be used unchanged here. Keep the skip paths valid.
- **Tests:** move the original reproduction unchanged when it passes. Add
  real-engine variations for two installs followed by a legal operation,
  skipping directly to the operation, skipping the operation, cancellation,
  install responses, and excluding Petty Cash after a completed action.
  Replay Startup `pd-muslihaT` seed 25 and run the full regression suite.
- **Risk:** changes remain in this card's two helpers and preserve shared
  engine contracts. The oracle is legal choices and uninterrupted resolution;
  no strategic AI preference or new hook is proposed.
- **Docs:** record the extra legality defect and final verification in this
  ticket; correct the stale helper-move criterion (the shared helper already
  resides at `tests/_headless-board.js`).

## Summary
After Humanoid Resources' ability (Elevation 35039: gain 4, draw 3, install up
to 2 cards, may play 1 operation), the first install from HQ leaves the engine
with no valid command: it logs "No valid commands available" and "Null
command", and the main loop stops. The game never ends, which in the browser
means a frozen game. Any player, human or AI, who installs through the ability
can hit this.

## Evidence
From the replay above, with the separate Corp AI crash neutralised:

```
Humanoid Resources gains Corp 4[c]
Humanoid Resources trashed
Corp drew 3 cards
ERROR bestInstallOption failed to find any desired install options with this optionList:
Corp created a new remote server
Corp spent one credit
ERROR No valid commands available
ERROR Null command
```

## Reproduction
Additional seeded evidence (2026-10-08, `4eaca7b`):
`documentation/debug-logs/bug_raised/startup-pd-muslihat-seed-25.log`, generated with
`node scripts/ai-batch.js replay --pool tests/fixtures/ai-batch/deck-pool-startup-format.json --pairs pd-muslihaT --seeds 25`.
Line 1 reports a stall after `Null command`, at 16 turns with Corp 5–2 Runner
(log hash `354c259e57e7`). Lines 499–506 show Humanoid Resources used,
three clicks spent, four credits gained, the card trashed, three cards drawn,
a new remote created, and three credits spent; play then stops.
[Verified] This replay reproduces the same install stall using the Startup
pool, without the test's null-option workaround. The original batch completed
999 of 1000 games; this was its only failure. The pool and referenced precons
include local changes, so retain those deck versions when replaying this seed.

The test builds the same board as the Corp AI ticket (Humanoid Resources
rezzed, 3 clicks, 5 credits, the AI forced to trigger it). It also patches
`CorpAI.prototype._rankedInstallOptions` to drop null cards, so it tests the
card, not the AI crash; the patch is a no-op once that ticket is fixed. It
asserts that the game does not stall and finishes. Today it stalls ("no
main-loop step for 3 s after: Null command").

## Root cause
- [Verified] The stall happens right after the first install through the
  ability, with or without the Corp AI crash — the reproduction and the replay
  above.
- [Inferred] `humanoidResourcesInstall()` calls `Install(params.card,
  params.server)` and then immediately calls `humanoidResourcesInstall()` (or
  `humanoidResourcesPlayOp()`) again in the same callback. `Install()`
  (`mechanics.js`) is asynchronous, with `onInstallResolve` / `onInstallComplete`
  callbacks and a `returnToPhase` flag, so the next `DecisionPhase` is opened
  while the install's own phases are still pending.
- [Verified] A quick experiment that moved the continuation into
  `onInstallResolve` (with `returnToPhase` true) did not fix it: the Corp then
  installed and trashed in an endless loop. The right callback and
  `returnToPhase` combination needs care; see how other multi-install cards
  chain `Install()`.

## Proposed fix
Chain the second install and the operation step from `Install()`'s
completion callback, following an existing card that installs several cards in
sequence. Check `returnToPhase` so the install does not return to the action
phase before Humanoid Resources has finished. Check the "Skip install" and
"Done installing" paths and the play-operation step the same way.

## Acceptance gate
N/A — deterministic fix (principle 4): the game must always have a valid
command; a deadlock is never legal play.

## Acceptance criteria
- [x] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged, using the existing shared helper at `tests/_headless-board.js`.
- [x] A variation covers two installs followed by playing an operation, and one skipping straight to the operation.
- [x] New or changed AI hooks are documented in `documentation/ai.md` (none changed).
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related
- [corp-install-choice-crashes-on-null-skip-option.md](corp-install-choice-crashes-on-null-skip-option.md),
  the Corp AI crash on the same prompt.
- [scrounge-unaffordable-program-stalls-game.md](../scrounge-unaffordable-program-stalls-game.md)
  is a different card that also leaves the game with no command.
