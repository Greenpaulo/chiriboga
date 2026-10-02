# Corp AI: install choice crashes on a "Skip install" option whose card is null

**Source log:** none. Found by the F4 baseline run (`leo-topan` seed 101); replay with `node scripts/ai-game.js --seed 101:leo-topan --corp "LEO Glacier.js" --runner "Topan CBB.js" --tail 30`.
**Reproduction:** `tests/pending/corp-install-choice-null-skip-option.test.js` — `node tests/pending/corp-install-choice-null-skip-option.test.js` (fails at `f795a63`, 2026-10-02)

## Summary
When a card offers the Corp an install prompt with a skip option such as
`{card: null, label: "Skip install"}` (Humanoid Resources), the Corp AI's
install ranking throws `TypeError: Cannot read properties of null (reading
'unique')`. The engine catches it and picks an arbitrary option, so the Corp
installs whichever card happens to be first instead of deciding. The AI must
handle every legal option shape a card offers.

## Evidence
From the replay above (the batch game uses the same seed streams):

```
Humanoid Resources gains Corp 4[c]
Humanoid Resources trashed
Corp drew 3 cards
ERROR TypeError: Cannot read properties of null (reading 'unique')
AI: Error executing select choice asynchronously, using arbitrary option from:
Corp created a new remote server
```

Stack: `_uniqueCopyAlreadyInstalled` ← `_rankedInstallOptions` ←
`_bestInstallOption` ← `_choiceInner` (the `executingCommand == "install"`
select branch) ← `Choice`.

## Reproduction
The test builds a board with the real headless engine
(`tests/pending/_headless-board.js`): Humanoid Resources rezzed in a remote,
the Corp at its action phase with 3 clicks and 5 credits, and
`corp.AI.preferred` set to trigger it. The game then runs as normal. The test
asserts that no `TypeError … 'unique'` is logged. Today it fails with exactly
that error.

## Root cause
- [Verified] `_bestInstallOption()` builds its card list with
  `typeof optionList[i].card !== "undefined"`, which admits `card: null`, and
  `_rankedInstallOptions()` calls `_uniqueCopyAlreadyInstalled(card)` on each
  entry, which reads `card.unique` — reproduction above and its stack trace.
- [Verified] Humanoid Resources' `humanoidResourcesInstall()` (`sets/elevation.js`)
  pushes `{card: null, label: "Skip install"}` into an install prompt.
- [Inferred] Other Corp AI helpers that collect `optionList[i].card` the same
  way may also fail on null-card options. The four trusted and playable sets
  contain 38 `card: null` options (`rg -n "card: null" sets/`), most of them
  "Decline", "Continue" or "Done" choices.

## Proposed fix
In `_bestInstallOption()`, ignore options whose `card` is null when building
the candidate list. Then audit the other Corp AI helpers that map
`optionList` to cards (start with `_bestTrashOption()` and any `.card`
collection in `_choiceInner()`) and apply the same rule. The fix makes the
existing ranking run; it does not decide when to skip. Whether a skip should
be chosen over a low-value install is a strategic question for a separate,
gated item if wanted. Do not special-case Humanoid Resources.

## Acceptance gate
N/A — deterministic fix (principle 4): the AI must not throw on any legal
option a card offers; a thrown error replaces the decision with an arbitrary
option.

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged, together with `tests/pending/_headless-board.js`.
- [ ] A unit test covers a null-card option in each Corp AI helper changed by the audit.
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- After the crash the game deadlocks; that is a separate card bug,
  [humanoid-resources-install-stalls-game.md](humanoid-resources-install-stalls-game.md).
- The same `TypeError` appeared once in an F4 fixture-start game
  (`corp-continues-send-a-message-scoring-plan`, `btl-kit`, seed 3); it was
  not investigated separately.
