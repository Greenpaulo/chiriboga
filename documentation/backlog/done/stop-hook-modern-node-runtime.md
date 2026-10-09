# Run Stop-hook verification with a supported Node runtime

**Source:** PR #12 review of the runtime changes added in `938137e`.
**Reproduction:** `tests/verify-on-stop.test.js` (green simulated-runtime coverage; no pending reproduction was created).

## Problem

A running agent session can retain an older hook command and inherited Node
PATH. The regression suite uses modern APIs that an old Node runtime cannot
run, so verification needs a supported runtime even in an existing session.

## Resolution

Implemented from `0447a38` in `938137e`; documented during PR #12 remediation
on 2026-10-07.

`.codex/hooks.json` sources NVM and selects Node 20 before launching
`scripts/agent-hooks/verify-on-stop.js`. The hook independently checks its
actual runtime, covering sessions that retained the earlier command. On
Node below 18 it asks `/bin/zsh -lc` for the login-shell Node path and retries
once with a different executable. It forwards the parsed session payload,
sets `CHIRIBOGA_HOOK_RUNTIME_RETRY`, and forwards the child stdout, stderr and
exit status (a null child status becomes exit 1).

If lookup fails, returns no executable or returns the same executable, the
hook emits a blocking response explaining the runtime requirement. If the
retried executable is still below Node 18, the retry marker causes a blocking
response instead of another retry. The NVM command selects the preferred
runtime; the hook's minimum supported version is 18. Launch failures forward
the child process failure status rather than claiming suite success.

`tests/verify-on-stop.test.js` executes the actual hook source in a VM with
mocked filesystem and child processes. Its old-runtime case asserts the
login-shell command, retry executable and script path, forwarded session ID,
retry marker and returned blocking reason. Another case checks that an old
retried runtime blocks rather than looping. Existing cases verify that suite
failures remain capped per session and that success or irrelevant changes
reset that cap. These tests simulate Node 8; they do not launch a real old
Node process or verify the user's NVM installation. Lookup and child launch
failure branches are described from code inspection, not claimed as tested.

## Acceptance gate

N/A — agent verification tooling; no gameplay or AI policy change.

## Acceptance criteria

- [x] Hook configuration selects Node 20; retained old sessions retry once.
- [x] Regression coverage verifies payload/result forwarding and retry bounds.
- [x] Resolution records runtime failure behavior and test limitations.
- [x] `node tests/verify-on-stop.test.js` passes; the full
  `node tests/run-all-tests.js` run passes all 51 test files, including Corp
  decision fixtures and decision snapshots.

## Post-merge closure

2026-10-08: moved to `done/` after [PR #12](https://github.com/Greenpaulo/chiriboga/pull/12) merged.
