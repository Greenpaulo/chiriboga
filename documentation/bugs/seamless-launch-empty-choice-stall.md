# Corp AI: Seamless Launch enters an empty decision phase and stalls

**Source log:** `documentation/debug-logs/bug_raised/L8.9-btl-kit-632.log`
**Reproduction:** `tests/pending/seamless-launch-empty-choice-stall.test.js` — `node tests/pending/seamless-launch-empty-choice-stall.test.js` (fails at `aac6ea9` plus uncommitted L8.9 observation changes, 2026-10-19)

## Summary

The Corp enters “Playing Seamless Launch” with no available commands. The AI
returns no command, `ExecuteChosen()` logs Null command, and the main loop stops
until the watchdog reports a 10-second no-step stall. A legal play must offer a
resolvable target, or the action must be safely rejected/recovered. This ticket
covers legal admission and uninterrupted resolution, not strategic target ranking.

## Evidence

The archived excerpt derives from the preserved isolated observer-off trace;
its original JSON remains under `bench/L8.9-aac6ea9-stage1-diagnostics/`.
Lines 8–17 record:

```text
No valid commands available
phase: Playing Seamless Launch
Null command
phase: Playing Seamless Launch
```

Lines 22–28 show active side Corp, identifier `Corp 2.2`, executing command
`play`, `commands: []`, and resolving card Seamless Launch. Line 3 records the
10-second stall. This is not the 900-second overall game timeout.

The original L8.9 extension and isolated observer-off/on reports match: btl-kit
seed 632, 27 turns, Corp 4–5 Runner, no winner, log hash `17fbc4f23c6e`, decision
hash `6ccc9a6081e13b3b82938817f822e08c461b1805`. Both modes fail identically.

## Reproduction

The pending test plays just this recorded seed with the original pool, three
collectors, effective options and observer off. It asserts the game does not
stall, has no errors, and completes with a winner. Current output fails the
first assertion with actual reason `stalled`. Run log:
`/tmp/L8.9-seamless-pending.log`; exit `/tmp/L8.9-seamless-pending.exit` is 1.
No alternate target or expectation workaround is applied.

## Root cause

- [Verified] The recorded runtime trace and isolated seeded runs reach the
  empty Seamless Launch phase, then Null command and the no-step stall.
- [Inferred] `Play()` obtains `card.Enumerate()` choices and creates DecisionPhase.
  Seamless Launch's `Enumerate()` filters installed advanceable targets through
  `_cardShouldBeFastAdvanced()` and excludes cards installed this turn.
- [Inferred] CorpAI `_choiceInner()` returns undefined on an empty command list;
  `Main()` passes the undefined indexed command to `ExecuteChosen()`, whose null
  branch logs an error without scheduling further play.
- [Inferred] Some admission/planning versus resolution-enumeration mismatch
  permits the empty phase. The trace does not establish which target/filter
  changed or whether the play should have been rejected earlier. Investigate
  that state transition before choosing the fix.

## Proposed fix

Reconstruct the failing play's target eligibility and compare the planner,
legality checks and actual operation enumeration. Prevent entering a decision
phase with no legal resolution, or recover safely without spending unintended
costs/losing the action. Preserve valid Seamless Launch plays and the restriction
on cards installed this turn. Do not fix this by arbitrarily changing strategic
fast-advance preferences or introducing a title-specific main-loop escape.
A strategic heuristic change, if later proposed, needs its own explicit gate.

## Acceptance gate

N/A — deterministic fix (principle 4): a legal play must have a resolvable choice
and the engine must not stop scheduling because the selected command is undefined.

## Acceptance criteria

- [ ] The pending reproduction passes and moves into `tests/`, expectation unchanged.
- [ ] A focused board case isolates why admission and resolution choices diverge.
- [ ] Valid targets remain playable; cards installed this turn remain excluded.
- [ ] No-target handling preserves phase, clicks, credits and card location correctly.
- [ ] New or changed AI hooks are documented in `documentation/ai.md` if needed.
- [ ] Required final `node scripts/ticket.js check <ticket>` passes after implementation and movement.

## Out of scope / related

Found during [L8.9 Stage 1](../backlog/L8.9-observable-defense-parity.md).
No existing open ticket covered Seamless Launch's empty-resolution mechanism.
The completed Humanoid Resources install-stall and Scrounge unaffordable-install
tickets have similar Null command symptoms but different card/lifecycle causes;
this has not been established as a regression of either fix. There is no evidence
linking this stall to KPI's undefined helper or Snare!'s “Specific case” route.
