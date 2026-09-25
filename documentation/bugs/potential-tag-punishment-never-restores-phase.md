# Corp AI: `_potentialTagPunishment` never restores the phase identifier and has no `finally`

**Source:** code inspection during the Corp AI planning audit (no debug log)
**Reproduction:** none yet: found by reading the code at `376f32c`, 2026-09-25; writing a failing test is the first acceptance criterion.

## Summary
`_potentialTagPunishment(tags, clicks, credits)` in `ai_corp.js` asks "could
the Corp punish the Runner if it had these tags, clicks and credits?". It
temporarily overwrites `runner.tags`, `corp.clickTracker`, `corp.creditPool`
and `currentPhase.identifier` (to `"Corp 2.2"`, so `CheckActionClicks` accepts
an action), calls `_useWhenTaggedCard()`, then restores the live values. Two
defects:

1. The phase is never restored. The restore line is a comparison, not an
   assignment, so `currentPhase.identifier` stays `"Corp 2.2"` after the probe.
2. The restore is not in `finally`. If `_useWhenTaggedCard()` throws (it calls
   card `AIWouldPlay` hooks and `FullCheckPlay`), the Runner's tags and the
   Corp's clicks and credits are left at the hypothetical values.

## Evidence
```js
currentPhase.identifier = "Corp 2.2"; //for CheckActionClicks
var useWhenTaggedCard = this._useWhenTaggedCard();
//restore actual values
runner.tags = storedTags;
corp.creditPool = storedCredits;
corp.clickTracker = storedClicks;
currentPhase.identifier == storedPhaseIdentifier;
```

The probe is skipped entirely when `clicks > 0 && credits > 1` and the Runner
has an installed resource (the early `return true`), so it mutates only on
boards without that shortcut.

## Impact (current callers)
- `Phase_Main`, in the Biotic Labor fast-advance check for Tomorrow's Headline.
  That branch needs `"advance"` in the option list, which only the
  `phases.corpActionMain` phase ("Corp 2.2") offers, so the identifier is
  already `"Corp 2.2"` and the lost restore is a no-op there.
- Public Trail's `AIWouldPlay` (`sets/systemgateway.js`). It is called from
  `_commonCardToPlayChecks()` during the Corp's main phase (identifier already
  `"Corp 2.2"`), and from `_bestNonAgendaTutorOption()` when a tutor or
  recursion choice lists Public Trail (Malapert Data Vault, Archived Memories,
  Project Atlas, Hortum). Those choices are answered while `currentPhase` is
  a `DecisionPhase` object. `DecisionPhase()` copies the underlying identifier
  into a new object that is discarded when the decision resolves. The wrong
  identifier therefore lasts only until the end of that decision. Hortum's
  choice is made during a run, so for the rest of that decision the phase
  reads as `"Corp 2.2"` instead of the run phase.
- [Inferred] No current path renames a persistent phase object such as
  `phases.corpActionStart` ("Corp 2.1"). A new caller that runs the probe
  outside a decision phase would rename that phase for the rest of the game.

So today the defect is latent. It is still a real unsafe mutation, and it
blocks F3 (the per-decision evaluation cache), which needs every
hypothetical to be guarded.

## Root cause
- `==` typed for `=` in the restore, and a manual save and restore instead of
  the guarded helper `_withHypothetical(apply, evaluate, restore)`.

## Proposed fix
Route the probe through `_withHypothetical()`. `apply` sets the four fields
and `restore` puts back all four, including `currentPhase.identifier`. This
is one of the migrations listed in F2
(`documentation/backlog/corp_ai_finding_10_guarded_hypothetical.md`). Fix it
here or in F2, and tick the F2 row either way.

## Acceptance criteria
- [ ] A failing test shows `currentPhase.identifier` is unchanged after `_potentialTagPunishment()` runs from a non-"Corp 2.2" phase with no resource-trash shortcut.
- [ ] The test also shows tags, clicks, credits and the phase identifier are restored when `_useWhenTaggedCard()` throws.
- [ ] The test passes after the fix and has moved into `tests/`.
- [ ] `node tests/run-all-tests.js` passes.
