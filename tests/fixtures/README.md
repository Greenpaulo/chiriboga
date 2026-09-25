# Corp AI decision fixtures

Decision fixtures turn a real Corp AI mistake into a permanent, replayable regression test. They complement unit tests: unit tests protect the evaluator or helper that was wrong, while a fixture protects the complete AI choice made from a particular board.

## When to add one

Add a fixture when a bug report or debug log contains a concrete bad decision such as drawing, installing, advancing, purging, or choosing the wrong server. Prefer a unit test alone for isolated calculation defects which have no meaningful top-level decision to replay.

A useful fixture contains:

- the board at the exact decision moment;
- the option list offered by the engine;
- the expected command and, where relevant, card or server; and
- a `SOURCE` or `NOTE` explaining its provenance.

## Commands

```sh
node tests/corp-decision-fixtures.test.js
AI_LOG=1 node tests/corp-decision-fixtures.test.js
node tests/corp-decision-fixtures.test.js fixture-name.txt
node tests/corp-decision-fixtures.test.js --ids
node tests/decision-snapshots.test.js
node tests/corp-server-security.test.js
```

Run the complete regression collection, including decision fixtures, with:

```sh
node tests/run-all-tests.js
```

The default runner executes only fixtures under `tests/fixtures/corp-decisions/` and must remain green. Known bugs which have not been fixed belong under `tests/fixtures/corp-decisions-pending/` and can be demonstrated with:

```sh
node tests/corp-decision-fixtures.test.js --pending
```

Pending fixtures are intentionally excluded from the normal regression command.

## Creating a fixture from a downloaded log

The game can keep a bounded `DecisionSnapshots` record for replayable Corp
mulligan, action-phase, and approach decisions. Recording is off during ordinary
play because each entry contains a full reproduction dump. Enable it explicitly
for a debugging session with `DecisionSnapshots.enabled = true`; downloaded
logs then include the captured snapshots.

List the recorded decisions:

```sh
node tests/extract-fixture.js documentation/debug-logs/example.txt --list
```

Create a fixture from the matching decision:

```sh
node tests/extract-fixture.js documentation/debug-logs/example.txt 12 short-name --expect '!install'
```

The extractor writes `tests/fixtures/corp-decisions/short-name.txt`. Add `--pending` to write `tests/fixtures/corp-decisions-pending/short-name.txt` instead, which is what triage of an unfixed bug should do. Decisions containing non-text options are labelled non-replayable and require a purpose-built test; for an unfixed bug, put that test in `tests/pending/`, which `run-all-tests.js` does not run.

For an older log without decision snapshots, reconstruct the state at the decision from its final `RunnerTestField(...)` and `CorpTestField(...)` dump. Record that reconstruction explicitly in `NOTE`; an end-of-game dump is not automatically the decision-time board.

## Required workflow

1. Add the captured fixture as pending (`--pending`) and run it before changing the AI. It must fail for the reported reason.
2. Add a meaningful variation when the bug concerns a broad heuristic rather than one unique board.
3. Fix the general behavior without board-specific card-title checks or magic values.
4. Move a previously pending fixture into `corp-decisions/` only after the fix makes it pass.
5. Add focused unit coverage for any helper or evaluator logic changed by the fix.
6. Run the fixture runner, security tests, snapshot tests, and the complete `tests/*.test.js` collection.

Do not weaken an existing expectation merely to make a fixture pass. If an expectation is wrong, document the evidence and review it separately.

## Fixture format

Directives are JavaScript comments followed by executable reproduction code:

```js
// PHASE: Phase_Main
// OPTIONS: install, advance, gain, draw
// EXPECT: advance
// EXPECT_SERVER: Remote 0
// EXPECT_CARD: Hostile Takeover
// SETUP: corp.creditPool=5; corp.clickTracker=3; runner.creditPool=5
// SOURCE: chiriboga-log-example.txt decision 12
// NOTE: Agenda is one advancement short of scoring.
RunnerTestField(...);
CorpTestField(...);
```

Supported directives:

| Directive | Meaning |
|---|---|
| `EXPECT` | Required command. Prefix with `!` only when several alternatives are valid and one action is specifically forbidden. |
| `OPTIONS` | Required engine option list. Snapshot extraction supplies it automatically. |
| `EXPECT_SERVER` | Optional expected install server (`HQ`, `R&D`, `Archives`, `Remote N`, or `NEW`). |
| `EXPECT_CARD` | Optional expected installed or selected card recorded in `ai.preferred`. |
| `IDENTIFIER`, `TITLE`, `COMMAND`, `CHOICETYPE` | Snapshot metadata. When `IDENTIFIER` is present, the runner replays the real `CorpAI.Choice()` path. |
| `PHASE` | Legacy/manual mode which calls a `Phase_*` method directly. Defaults to `Phase_Main`. |
| `SETUP` | Additional public state applied after the reproduction dump. |
| `SOURCE`, `NOTE` | Provenance and explanation. |

Each fixture receives a new `CorpAI` instance and clean board state. This prevents preferences, protection history, cached threat profiles, or random decisions from leaking between fixtures.

## Reliability rules and limits

- The runner loads real AI and card definitions but replaces rendering and some engine functions with deterministic headless implementations.
- `--stub-missing` is discovery-only. Auto-stubbed results are not trustworthy until the missing function receives a faithful implementation.
- Use exact positive expectations when one action is clearly correct. A negative expectation such as `!draw` does not establish that the selected alternative was strategically sound.
- One fixture containing hidden cards does not prove the AI ignored them. Use paired fixtures with identical public state and different hidden contents, or a focused unit test that throws when hidden properties are read.
- Snapshot fixtures replay only string option lists. Complex card/object selections need a dedicated unit or integration test.
- Keep fixture files only for valuable real regressions, recurring failures, or shared decision paths. Avoid turning every trivial branch into a brittle board snapshot.
