# Regression suite

Use the Node version in `.nvmrc`. The suite has three selections:

| Command | Coverage | When |
| --- | --- | --- |
| `node tests/run-all-tests.js --fast` | All top-level regression files, including cheap batch/defence checks and decision fixtures/snapshots | Broader checkpoints when needed, final review-fix validation, and stop hook; intermediate ticket checks can use `--fast` |
| `node tests/run-all-tests.js --integration` | Files under `tests/integration/`: batch orchestration, seeded gameplay, defence observation and pooled CLI comparison | Relevant changes; see below |
| `node tests/run-all-tests.js` | Both tiers | One final run through `ticket.js check <ticket>` at the end of implementation, before agent handoff; also available at PR opening |

`--unit-only` is now a compatibility alias for `--fast`. The fast tier retains
short real-engine board regressions; it is not a promise that every case is a
unit test. Known-red reproductions in `pending/` and
`fixtures/corp-decisions-pending/` stay outside all three selections.

The expensive scenarios formerly in the top-level `ai-batch.test.js` and
`realized-defense.test.js` now live in files with the same names under
`tests/integration/`. Their fast cases remain in the original files. Shared
helpers live in `_ai-batch-test-support.js` and
`_realized-defense-test-support.js`; each scenario belongs to one tier.

During development, run an integration file when changing the infrastructure it covers:

- **Batch orchestration, CLI, gates/comparison, replay, cache, workers or seeded
  randomness:** `node tests/integration/ai-batch.test.js`.
- **Defence collectors, pooled comparison, observation, measurement or public posture tracking:**
  `node tests/integration/realized-defense.test.js`.
- **Shared seeded RNG or headless simulation infrastructure:** run both with
  `node tests/run-all-tests.js --integration`. Ordinary AI heuristic or card
  decision changes use their focused regressions and the fast suite; they do
  not trigger these simulations just because an AI decision changed.

Paul opens PRs and merges manually; CodeRabbit reviews on GitHub. The implementing
agent runs `node scripts/ticket.js check <ticket>` once at the very end, after
code, gate decisions, documentation and ticket movement are finished. This
checks the ticket/reproduction and runs the complete suite before final handoff.
The same command remains available to Paul when opening the PR.

## Test cadence

Choose tests for the behaviour and risk being checked, not for the number of
edits, cards, review comments or skill steps completed.

- **While editing:** run the affected regression or focused checks when there
  is a meaningful change to exercise. A passing focused test does not call for
  another suite by itself. Use the fast suite when shared changes, a failure
  or uncertain interactions warrant broader feedback; do not make it a loop
  after each edit. Skip a separate fast run if final full validation is next.
- **Implementation handoff:** run one full validation after the final code,
  gate decisions, generated files and relevant metadata are ready. Tickets use
  `ticket.js check`; card implementation/optimisation uses the full runner.
  Count matching commands in trackers and integration checklists once. Fix a
  failure with focused checks before repeating final validation. Do not launch
  another run while one is pending; follow `AGENTS.md` for long runs.
- **Review fixes:** use focused checks while repairing comments, then one fast
  run for the combined code/test changes before publishing them. Run targeted
  integration checks for affected simulation infrastructure. Full validation
  is warranted for changed suite selection/shared test infrastructure or an
  explicit need for whole-suite evidence, not simply because review occurred.
- **Read-only audits:** exercise the specific decisions being reviewed and
  reuse verified matching shared results. If no current full result exists,
  obtain one for the reviewed snapshot. A set review shares one coordinator
  full run across batches. A green suite does not replace strategic evidence.
- **Documentation and triage:** use checks that exercise the changed artifacts
  (for example, skill metadata or roadmap validation). A pending reproduction
  must fail for the reported reason; pending files are outside the green suite.
  Do not run fast/full solely for new pending files, notes or prose changes.

A reusable result needs a known command, runtime/environment, relevant inputs,
source/tests and metadata matching the current work, plus a collected exit
status. A commit alone does not identify uncommitted changes. Different flags,
fixtures or environments may exercise different coverage: retain those checks.
A full suite includes its fast and integration files, so an identical focused
invocation does not need repeating just to satisfy a second checklist. Changes
to result notes alone do not invalidate a pass unless they affect a tested input.

The stop hook still runs `--fast` automatically on relevant working-tree changes;
it does not yet recognise an earlier successful run. The reuse guidance above
is for agents scheduling their checks, not a claim of automatic hook caching.

The runner uses two child processes at a time. Each test file keeps its own
process and VM state. `agent-scripts.test.js` runs alone before the workers:
it temporarily creates repository files that other tests enumerate. If another
test needs to mutate shared repository state, isolate its fixtures in a temporary
directory or add it to the runner's `exclusiveFiles` set.

Use `--diagnose` to print wall time and the ten slowest files; normal runs
print only failures and the summary. Save all file timings independently with:

```sh
node tests/run-all-tests.js --timings /tmp/chiriboga-test-timings.json
```

The JSON includes suite tier, worker count, total wall time, and each file's duration,
exit status, signal and pass/fail result, sorted slowest first. Timings include
process startup and, with multiple workers, CPU contention. To measure sequential
performance or diagnose a concurrency issue, use `--jobs 1`; adjust concurrency
with `--jobs N`. Compare runs on the same Node version and machine. Summing
parallel file durations is not a measured sequential baseline.

## Adding and maintaining coverage

Add a ticket regression to the existing behaviour suite when its setup fits.
Use named or parameterised cases for variations; a ticket does not require a new
file. Keep genuinely different decision paths even when they exercise the same
function. Delete a duplicate only after checking its assertions and setup.

Keep passing output to a short summary (at most five lines / 600 bytes).
Per-case progress belongs behind `process.env.VERBOSE`. Follow the cadence
above. Save full-run stdout/stderr
and its exit status separately, following `AGENTS.md` for long runs.

Consolidated regressions:

When a pending reproduction was created in the current worktree and has no Git
history, record its SHA-256 before implementation in the ticket's Resolution
as `**Untracked reproduction SHA-256:** \`<64 lowercase hex digits>\``.
The ticket checker uses that digest only when Git has no original pending file;
the moved green reproduction must then match the complete original file byte
for byte. A mismatch fails validation. Keep extra coverage in an existing suite
so the original reproduction can remain unchanged.

| Former file | Current suite |
| --- | --- |
| `f6-headless-ai-performance.test.js` | `corp-server-security.test.js`: three unrezzed ICE priced once each; now unconditional, avoiding a second run of the entire security suite |
| `corp-install-choice-null-skip-option.test.js` | `corp-install-null-options.test.js`: Skip install |
| `corp-install-choice-null-decline-option.test.js` | `corp-install-null-options.test.js`: Decline |
| `syailendra-typed-as-barrier-instead-of-code-gate.test.js` | `elevation-missing-cards.test.js`: canonical subtype checked against the loaded card |

Historical ticket and review records retain their original command names; use
this table to locate the current coverage.
