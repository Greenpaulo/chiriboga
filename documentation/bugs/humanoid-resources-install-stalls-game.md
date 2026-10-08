# Engine: Humanoid Resources' installs leave the game with no valid command

**Source log:** none. Found by the F4 baseline run (`leo-topan` seed 101); replay with `node scripts/ai-game.js --seed 101:leo-topan --corp "LEO Glacier.js" --runner "Topan CBB.js" --tail 30`.
**Reproduction:** `tests/pending/humanoid-resources-install-stalls-game.test.js` — `node tests/pending/humanoid-resources-install-stalls-game.test.js` (fails at `f795a63`, 2026-10-02)

## Implementation plan

Proposed at `e894637`, 2026-10-08. **Awaiting approval.**

- **Validation:** the original pending reproduction still stalls after the
  first install. A temporary card-only experiment moved the continuation to
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
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged, together with `tests/pending/_headless-board.js`.
- [ ] A variation covers two installs followed by playing an operation, and one skipping straight to the operation.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- [corp-install-choice-crashes-on-null-skip-option.md](corp-install-choice-crashes-on-null-skip-option.md),
  the Corp AI crash on the same prompt.
- [scrounge-unaffordable-program-stalls-game.md](scrounge-unaffordable-program-stalls-game.md)
  is a different card that also leaves the game with no command.
