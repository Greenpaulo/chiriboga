# Corp AI bug fixes: fixture workflow (instructions for a coding agent)

You are fixing a Corp AI bug that a human flagged from a debug log. Use a fixture to reproduce it, then fix it,
then prove nothing else broke. The bug is described by the log's file name in `documentation/debug-logs/`.

## Steps
1. List the decisions recorded in the log:
   `node tests/extract-fixture.js documentation/debug-logs/<log> --list`
   Pick the decision that matches the bug title (the option the AI chose is shown as `chose:`).
   If the log has no snapshots, it predates the recorder: take the end-of-game dump at the bottom of the log and
   rewind it by hand to the decision moment. See `tests/fixtures/corp-decisions/agenda-into-remote-behind-non-etr-ice.txt`.
2. Create the fixture. Set `--expect` from the bug title: `!x` means the AI must not choose `x`; `x` means it must.
   `node tests/extract-fixture.js <log> <n> <short-name> --expect "!install"`
3. Run `node tests/corp-decision-fixtures.test.js`. The new fixture must FAIL. If it passes, it did not capture
   the bug: recheck the decision number and the expected answer before doing anything else.
4. Find the cause. `AI_LOG=1 node tests/corp-decision-fixtures.test.js` prints the AI's own reasoning for each fixture.
5. Fix the general behaviour in `ai_corp.js`. Do not special-case this board (no card-title checks, no hardcoded
   numbers that only suit this fixture). Prefer card hooks and shared helpers over new title lists.
6. Add one variation fixture (same situation with different credits, cards or servers) that should give the same answer.
7. Run all of these and fix or report anything that fails:
   `node tests/corp-decision-fixtures.test.js && node tests/corp-server-security.test.js && node tests/decision-snapshots.test.js`

## Rules
- Do not edit or delete existing fixtures or change their `EXPECT` lines. If you believe one is wrong, say so and leave it.
- Do not weaken the fixture to make it pass.
- A fixture captures one board. Keep only the ones that were hard to fix, have recurred, or guard shared code.
- Report: what the bug was, the root cause, the change, and the results of all three test commands.

## Reference
- **Recorder:** `DecisionSnapshots` in `utility.js`, called from `CorpAI.Choice` in `ai_corp.js`. It records the board
  only at Corp mulligan, action-phase and approach decisions with two or more options, keeps the last 12, and writes
  them into downloaded logs under `=== DECISION SNAPSHOTS ===`. That header line also reports the recorder's own time cost.
- **Fixture files:** `tests/fixtures/corp-decisions/*.txt`. `// KEY: value` comment lines, then the
  `RunnerTestField(...)` / `CorpTestField(...)` dump.
  Keys: `EXPECT` (required), `OPTIONS`, `IDENTIFIER` / `TITLE` / `COMMAND` / `CHOICETYPE` (from snapshots; the runner
  calls the real `Choice()`), `PHASE` (older hand-written fixtures call one `Phase_*` method directly), `SETUP`
  (extra JS state applied after the dump, e.g. `corp.creditPool=5`), `SOURCE`, `NOTE`.
- **Runner flags:** `--ids` lists card ids; `--stub-missing` lists engine functions the AI needs that the harness lacks
  (discovery only; its results are unreliable).
- **Harness limits:** engine functions are stubbed (`CheckScore`, `MaxHandSize`, `Link`, ...) and are approximations.
  If a stub is wrong for your case, fix the stub in `tests/corp-decision-fixtures.test.js` and say so.
  Decisions with non-text options are marked `REPLAYABLE: false` and cannot be replayed exactly.
