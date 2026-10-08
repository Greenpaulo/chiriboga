# Record and preserve the accepted AI benchmark baseline

**Source:** PR #12 review of the baseline tooling added in `938137e`.
**Reproduction:** `tests/refresh-ai-baseline.test.js` (green workflow coverage; no pending reproduction was created).

## Problem

The five-pair benchmark needs a current accepted-main report for candidate
comparisons. Manual replacement can overwrite prior evidence, and a fresh
clone has no ignored benchmark JSON to compare against.

## Resolution

Implemented from `0447a38` in `938137e`; first-comparison instructions clarified
during PR #12 remediation on 2026-10-07.

`scripts/refresh-ai-baseline.js` runs the frozen beginner pool with seeds
1–200 into `bench/baseline.json`. It promotes only an `ai-batch-report` with
1,000 games, zero failures and `dirty: false`. An exclusive lock prevents
concurrent refreshes. The previous report is copied unchanged to a dated,
commit-labelled file in `bench/archived-current/` before atomic promotion to
`bench/current/baseline.json`. An existing staging report or multiple current
reports is rejected. Failed runs and invalid reports preserve the current
baseline and retain any staging report for inspection; the lock is released
on ordinary failures. A forcibly terminated process can leave a stale lock.

`tests/refresh-ai-baseline.test.js` verifies exact batch arguments, both
canonical and dated current reports, byte-for-byte archived evidence,
initial creation without an archive, invalid and dirty reports, batch
exceptions, staging-file protection, ambiguous current reports and locking.
These are isolated filesystem tests with an injected batch runner; they do
not establish gameplay outcomes or execute the 1,000-game benchmark.

`documentation/ai-batch-harness.md` documents post-merge refresh and recovery.
Its comparison instructions now initialise a missing baseline on a clean,
committed target-main build before returning to the candidate, including
copying local reports when separate worktrees are used. They provide a direct
harness command for target-main builds predating the refresh script, with
the same clean-build, game-count and failure checks. This workflow records
an already accepted build; it does not decide acceptance.

## Acceptance gate

N/A — local benchmark evidence management; no gameplay or AI policy change.

## Acceptance criteria

- [x] Successful refresh preserves earlier evidence and promotes a clean report.
- [x] Failed, ambiguous and concurrent refreshes protect the current baseline.
- [x] Documentation covers fresh-clone setup, refresh and failure recovery.
- [x] `node tests/refresh-ai-baseline.test.js` passes all 10 cases; the full
  `node tests/run-all-tests.js` run passes all 51 test files, including Corp
  decision fixtures and decision snapshots.
