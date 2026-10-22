# Engine: Shred silently lets the run end when the attacked server's root is empty

**Outcome:** adopted

**Source log:** `documentation/debug-logs/bug_raised/shred_didnt_stop_etr_after_sub_fired.txt`
**Reproduction:** `tests/pending/shred-empty-root-end-run-unexplained.test.js` — `node tests/pending/shred-empty-root-end-run-unexplained.test.js` (fails at `60fa0d7`, 2026-10-16)
**Green path:** `tests/shred-empty-root-end-run-unexplained.test.js` — `node tests/shred-empty-root-end-run-unexplained.test.js`

## Resolution
Implemented from `60fa0d7`.

Shred's X=0 branch in `responsePreventableEndRun.Resolve` (`sets/elevation.js`)
now logs that the Corp trashes 0 cards and the run ends. Rules behaviour is
unchanged: the engine was already correct. Reproduction moved to `tests/`
with its assertions unchanged.

## Summary
The Runner played Shred on HQ; Semak-samun's "End the run unless the Runner
suffers 3 net damage" ended the run and Shred appeared to do nothing. HQ had no
cards in its root, so X = 0: the Corp "reveals and trashes 0 cards", a cost that
can always be paid, and the run ends. The engine handled this correctly but
logged nothing, so the outcome read as Shred failing to fire.

## Evidence
```
166 Played Shred
167 Run initiated attacking HQ
171 Corp rezzed Semak-samun
173 Firing End the run unless the Runner suffers 3 net damage. on Semak-samun:
174 Run ends
```
Line 201 `CorpTestField(...)`: HQ installed is `[35054]` (Semak-samun, ice);
the root of HQ is empty. The Runner (human, 4 cards in grip) chose "End the run"
on Semak-samun.

## Reproduction
Loads `sets/elevation.js` in a VM with engine calls stubbed, starts a Shred run
and resolves its end-run interrupt. Control (X=1, Corp declines to trash): the
run is prevented from ending (passes at `60fa0d7`). X=0: the run ends (passes)
and a Shred log line explains why — failed at `60fa0d7` with `got: []`.

## Root cause
- [Verified] With an empty root, Shred's interrupt resolves and leaves
  `intended.endRun` true without logging — reproduction case 2.
- [Verified] Shred prevents the end of the run when X > 0 and the Corp declines
  to trash — reproduction case 1.
- [Inferred] Semak-samun's ETR goes through `EndTheRun` with prevention enabled,
  so Shred's `responsePreventableEndRun` is offered (`mechanics.js` `EndTheRun`).
- [Inferred] Rules: NetrunnerDB rulings for Shred (2025-06-30) treat the
  "unless" text as a nested cost; trashing 0 cards is payable, so the run ends.
  No ruling addresses X = 0 directly.

## Proposed fix
Log the X = 0 outcome in Shred's interrupt. No rules or AI change.

## Acceptance gate
N/A — deterministic fix (principle 4): Shred's X = 0 outcome is logged.

## Acceptance criteria
- [x] The reproduction passes and has moved into the green suite
      (`tests/`), expectation unchanged.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Shred's interrupt is not `automatic`; for a human Runner it may appear as a
  prompt at "About to End Run" even when X = 0. Not investigated.
