# Engine: Stowaway never gains credits on a successful run on its host server

**Outcome:** adopted

**Source log:** `documentation/debug-logs/bug_raised/stowaway_ability_doesnt_trigger_on_successful_run.txt` (also `documentation/debug-logs/bug_raised/didnt_gain_creds_from_stowaway_on_successful_run.txt`)
**Reproduction:** `tests/pending/stowaway-successful-run-no-credits.test.js` — `node tests/pending/stowaway-successful-run-no-credits.test.js` (fails at `60fa0d7`, 2026-10-16; promoted unchanged to `tests/stowaway-successful-run-no-credits.test.js`, `node tests/stowaway-successful-run-no-credits.test.js`)

## Resolution

Implemented from `60fa0d7`, 2026-10-16, on `bugs/stowaway-successful-run`.

- Stowaway's and Chain Reaction's automatic `responseOnRunSuccessful.Resolve`
  now read the global `attackedServer` instead of a `server` parameter the
  engine never passes. Same fix as Tailgate (`bugs/done/tailgate-hq-access-not-granted.md`),
  whose validation named both cards as affected.
- Chain Reaction is included beyond the logs because it has the identical
  defect and fix; it could never become playable.
- `tests/vantagepoint-integration.test.js` now sets `attackedServer` and calls
  both Resolves with no arguments, as the engine does. Expected values are
  unchanged.
- Reproduction written untracked under `tests/pending/`, confirmed failing,
  then moved with `mv` to `tests/` with assertions unchanged.
- No plan needed: two card definitions in one set file, no AI or engine change.

## Summary
Stowaway ("Whenever you make a successful run on this server, gain 2[c].")
never pays out. In both logs the Runner hosts Stowaway on ice protecting the
server they then run successfully, and no credits are gained. Its automatic
`responseOnRunSuccessful.Resolve(server)` compares the host's server with a
`server` argument the engine never supplies, so the check is always false.
Chain Reaction's run tracking has the same defect.

## Evidence
`stowaway_ability_doesnt_trigger_on_successful_run.txt`:
- Line 302: `Runner installed Stowaway`; end-of-log dump hosts 36024 on
  `corp.RnD.ice[0]` (Whitespace).
- Lines 307–325 and 331–346: two `Run initiated attacking R&D` … `Run successful`
  with no Stowaway credit gain.

`didnt_gain_creds_from_stowaway_on_successful_run.txt`:
- Line 121 / 208: `Runner installed Stowaway`; dump hosts it on `corp.HQ.ice[0]`.
- Lines 126–137, 142–146, 213–217: successful HQ runs, no credit gain.

## Reproduction
Loads `sets/vantagepoint.js`, hosts Stowaway on R&D ice, sets `attackedServer`
and calls `responseOnRunSuccessful.Resolve` with no arguments (the engine's
automatic dispatch). Asserts 2 credits on R&D and 0 on HQ; also asserts Chain
Reaction becomes playable after successful HQ, R&D and Archives runs.
At `60fa0d7`:
```
FAIL: Stowaway must gain 2 credits on a successful run on its host server  (0 !== 2)
FAIL: Chain Reaction must be playable after successful runs on HQ, R&D and Archives  (0 !== 1)
```

## Root cause
- [Verified] `AddTriggersToTriggerList` in `phase.js` resolves automatic
  triggers with `Resolve.call(card)` and no arguments — read at `60fa0d7`; the
  reproduction's dispatch mirrors it and fails.
- [Verified] Stowaway's and Chain Reaction's `Resolve(server)` receive
  `undefined`, so neither records the run — reproduction.
- [Verified] The existing integration test passed only because it called
  `Resolve` with a server argument the engine never supplies.

## Proposed fix
Read `attackedServer` inside both Resolves, the convention other
`responseOnRunSuccessful` cards use (for example coreset's virus-counter
programs). Rejected: changing the engine to pass the server to automatic
triggers — it touches every automatic `responseOnX` hook and their varied
signatures for two cards. Vantage Point's other `Resolve(server)` on this hook
(line ~209) ignores its parameter and is unaffected.

## Acceptance gate
N/A — deterministic fix (principle 4): card text — Stowaway gains 2[c] exactly
when a run on its host's server succeeds.

## Acceptance criteria
- [x] The reproduction passes and has moved into the green suite (`tests/`),
      expectation unchanged.
- [x] `tests/vantagepoint-integration.test.js` calls both Resolves the way the
      engine does (no arguments).
- [x] `node tests/run-all-tests.js` passes (95 test files, Node v22.14.0).

## Out of scope / related
- `bugs/done/tailgate-hq-access-not-granted.md` — same defect class.
- An automatic hook with an `Enumerate` is still silently ignored by
  `AddTriggersToTriggerList` (it only logs an error); not audited here.
