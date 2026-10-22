# Engine: rewinding with Rotary installed crashes the Corp ability scan

**Outcome:** adopted

**Source log:** `documentation/debug-logs/bug_raised/typerror_after_running_r&d.txt`
**Reproduction:** `tests/pending/rewind-restores-corp-abilities.test.js` — `node tests/pending/rewind-restores-corp-abilities.test.js` (fails at `60fa0d7`, 2026-10-16); green at `tests/rewind-restores-corp-abilities.test.js` — `node tests/rewind-restores-corp-abilities.test.js`

## Resolution
Implemented from `60fa0d7`. Added `"corpAbilities"` to `replicationCodeBlacklist`
in `utility.js`, as proposed. No plan was written: the change adds one entry to
a constant whose only consumer is `ReplicationCode`, matching how `abilities`
and `runnerAbilities` are already handled; no AI choice changes. The
reproduction moved to `tests/` with its assertions unchanged. It runs a real
headless game with `sets/vantagepoint.js` loaded, because `_headless-board.js`
loads only the trusted sets and Rotary is in Vantage Point.
The initial `node tests/run-all-tests.js` run passed 93 of 95 files;
`flipped-identity` and `vantagepoint-integration` failed because the worktree
had no `images/` (gitignored card art). The later
`node scripts/ticket.js check documentation/bugs/code-review/rewind-corrupts-runner-card-corp-abilities.md`
passed all 95 test files. The [PR #62 description](https://github.com/Greenpaulo/chiriboga/pull/62)
records the final command and output:

```text
PASS Reproduction moved to tests/rewind-restores-corp-abilities.test.js unchanged.
PASS Reproduction passes.
PASS Full suite: 95 test files passed.
```

That check ended with `Ticket check passed.` and supersedes the initial
93-of-95 result; no test failures are accepted by the checked criterion below.

## Summary
After a rewind while the Runner has Rotary installed, the game throws
`TypeError: Cannot read properties of undefined (reading 'Enumerate')` as soon
as the engine lists the Corp's triggerable abilities (here, when the Runner
initiated a run on R&D), and the game stops. Rewinding must restore a playable
state. Rotary is the only card with `corpAbilities`, so any game with Rotary
installed is affected after any rewind.

## Evidence
- Lines 15–19 (and at every turn boundary): `ERROR: Value above (.corpAbilities) is unsupported in ValueToString.` — the rewind state cannot serialise Rotary's ability.
- Line 135: `Rewinding...`, then line 137:
  `Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'Enumerate')`
  `at ChoicesAbility` ← `ChoicesTriggerableAbilities` ← `EnumeratePhase`.
- Lines 145–163: a second rewind repeats the crash on `Run initiated attacking R&D`.

## Reproduction
A headless game installs Rotary, saves the state with `ReproductionCode(true)`,
clears and restores it exactly as the rewind handler in `init.js` does, then
calls `ChoicesTriggerableAbilities(corp)` with the Runner tagged in the Corp's
action phase. It asserts the scan does not throw and offers
`[click], 2[c]: Trash Rotary.` Current output:

```
FAIL: Corp ability scan after rewind must not throw: {"savedLine":"runner.rig.hardware[0].corpAbilities=[,];", ... "firstAbilityType":"undefined","error":"Cannot read properties of undefined (reading 'availableFromHQ')"}
```

(The log's `Enumerate` read is the same failure at an older line of
`ChoicesAbility`; current code reads `availableFromHQ` from the slot first.)

## Root cause
- [Verified] The saved rewind code contains `runner.rig.hardware[0].corpAbilities=[,];` — reproduction `savedLine`.
- [Verified] Evaluating it leaves `corpAbilities` with length 1 and an `undefined` element (`[,].length === 1`), so `ChoicesAbility` dereferences `undefined` — reproduction `abilityCount`/`firstAbilityType`.
- [Inferred] `InstanceCard` deep-copies card objects, so `card.corpAbilities !== cardDefinition.corpAbilities`; `CardPropertyToString` therefore serialises it. `ValueToString` returns `""` for each ability object, producing `[,]`.
- [Inferred] `abilities` and `runnerAbilities` avoid this only because they are in `replicationCodeBlacklist` (`utility.js`); `corpAbilities` was added later (Rotary, Vantage Point) without being listed.

## Proposed fix
Add `"corpAbilities"` to `replicationCodeBlacklist` beside `abilities` and
`runnerAbilities`. No card mutates `corpAbilities` at runtime, so the
definition's copy is always correct after restore. This also silences the
`ValueToString` error spam. Rejected: making `ValueToString` drop unsupported
array items — it would hide other serialisation gaps rather than fix this one.

## Acceptance gate
N/A — deterministic fix (principle 4): a restored state must keep every card's printed abilities usable.

## Acceptance criteria
- [x] The reproduction passes and has moved into the green suite
      (`tests/`), expectation unchanged.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Line 83, `Valid option with undefined label:` for Rotary's breach choice, is a separate logging warning.
