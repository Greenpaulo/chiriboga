# Engine: Key Performance Indicators and Peer Review call undefined NewRemoteServer

**Source log:** `documentation/debug-logs/bug_raised/L8.9-zwicky-magdalene-576.log`
**Reproduction:** `tests/pending/kpi-peer-review-new-remote-undefined.test.js` — `node tests/pending/kpi-peer-review-new-remote-undefined.test.js` (fails at `aac6ea9` plus uncommitted L8.9 observation changes, 2026-10-19)

## Summary

Key Performance Indicators throws `ReferenceError: NewRemoteServer is not defined`
when its free-ICE effect selects a new remote. The seeded game continues after
error recovery and eventually reports a Runner win, but it is a failed execution,
not a valid outcome. Peer Review contains the same undefined call in its optional
root-install callback. Neither call should bypass the engine's normal server
creation and installation lifecycle.

## Evidence

The archived excerpt is derived from the preserved isolated observer-off trace;
its original JSON remains under `bench/L8.9-aac6ea9-stage1-diagnostics/`.
Lines 14–17 capture the exception stack at `sets/elevation.js:7798`, through
DecisionPhase and ResolveChoice. Lines 39–42 show:

```text
Played "Key Performance Indicators"
ERROR ReferenceError: NewRemoteServer is not defined
AI: Error executing select choice asynchronously, using arbitrary option from:
ERROR Invalid choice made (0) of:
```

L8.9's original extension and isolated observer-off/on reports reproduce identical
errors, 17 turns, log hash `e5e90c59f8e8`, and decision hash
`cb8f5032e532221009a9bf49492aa5934200f9d6` for zwicky-magdalene seed 576.
This is a baseline defect, independent of enabling the defense observer.

## Reproduction

The pending test plays that one committed deck pair/seed with the original pool,
three collectors, effective options and observer off, and asserts that the game
has no errors and completes with a winner. It fails with actual errors
`['ReferenceError: NewRemoteServer is not defined']`, expected `[]`.
Run log `/tmp/L8.9-kpi-pending.log`; exit `/tmp/L8.9-kpi-pending.exit` is 1.
The test targets KPI; Peer Review requires a separate focused variation when fixed.

## Root cause

- [Verified] The seeded reproduction and preserved stack exercise KPI's
  `_chooseEffect()` free-ICE callback, which calls undefined `NewRemoteServer()`
  for `server === null` before reaching `Install()`.
- [Inferred] Peer Review's `_offerInstall()` callback has the same defect at its
  null-destination branch (`sets/elevation.js:6640` at investigation time). It was
  found by source inspection, not exercised by the Zwicky game.
- [Inferred] `Install()` already handles a null Corp destination by calling
  `NewServer()`, registering the remote, and opening `responseOnCreateServer`.
  Calling that lifecycle directly should avoid the nonexistent helper.
- [Inferred] KPI starts its second effect immediately after calling `Install()`;
  its continuation may also need sequencing after installation completes.
  Removing the undefined call alone has not been demonstrated sufficient.

## Proposed fix

Use the existing null-destination `Install()` route in both card callbacks.
Review all install arguments, cost suppression and KPI's second-effect sequencing
against `Install()`'s final completion callback. Preserve decline/cancel handling
and server-created responses. Do not add a global server helper that bypasses the
normal lifecycle. Confirm existing-server installs still work. These are objective
resolution requirements; this ticket does not select better strategic targets.

## Acceptance gate

N/A — deterministic fix (principle 4): legal card resolution must not reference
an undefined function, and new remotes must use the normal install lifecycle.

## Acceptance criteria

- [ ] The pending reproduction passes and moves into `tests/`, expectation unchanged.
- [ ] Focused real-engine cases cover KPI and Peer Review installing into new and existing remotes.
- [ ] KPI's second effect waits for completed installation and relevant responses; costs and cancellation remain correct.
- [ ] New remote registration and server-created responses happen exactly once.
- [ ] New or changed AI hooks are documented in `documentation/ai.md` if needed.
- [ ] Required final `node scripts/ticket.js check <ticket>` passes after implementation and movement.

## Out of scope / related

Found during [L8.9 Stage 1](../backlog/code-review/L8.9-observable-defense-parity.md).
The Snare! “Specific case” candidate route does not call this helper and is not
the failing path. No existing bug/backlog ticket covered this mechanism when
searched on 2026-10-19. Baseline repair is not implemented by this triage.
