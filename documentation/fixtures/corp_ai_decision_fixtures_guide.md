# Corp AI: Turning Mistakes into Regression Fixtures

## Purpose

The Corp AI is a ladder of heuristics in `Phase_Main`. A fix in one place can quietly break a decision somewhere else, and without a check you only notice in play.

The fix is to save each real mistake once, as a **fixture**, so a single command can re-check all of them after every change.

A fixture is a frozen copy of one bad moment:
- the exact board from the game,
- the option list the engine offered,
- the answer you say is correct.

Running it asks the AI the same question and checks whether it now gives your answer.

## The life of one mistake

Example: the mulligan rule throws away a hand with 1 ICE, 3 economy cards and an agenda.

1. **The AI makes a bad decision in a game.**
2. **You save it as a fixture** and write `EXPECT: n` (keep the hand).
3. **You run it and it fails.** This is intended. It proves the fixture can catch the mistake.
4. **You fix the code** and run it again. It passes.
5. **You keep the file.** Later, you change something unrelated in `ai_corp.js` and run all fixtures. If that change brings the bad decision back, the fixture fails immediately. That failure is the regression being caught.

Two things follow from this:
- Each saved mistake protects you from that mistake returning.
- The set only checks mistakes you have saved, so it becomes more useful as it grows.

## What the game already provides

Verified by reading the code, not by running the game:
- Every log downloaded with `DownloadCapturedLog()` (`utility.js`) ends with the output of `ReproductionCode()`.
- That output is executable code: `RunnerTestField(...)` and `CorpTestField(...)` calls listing card IDs for both sides (hands, decks, heap, all servers, scored agendas), followed by property lines such as `corp.HQ.cards[1].advancement=2;` and `.rezzed=true;`.
- It includes hidden information such as the Runner's Grip and the Corp's remote contents.
- `decks.js` (~776) has a debug block that uses the same functions to start the browser game from a given board.

**Credits, clicks, turn and phase are only included when `debugging` is true.** In a normal log they are missing, so a fixture must supply them with a `SETUP` line.

## The runner

Files:
- `tests/corp-decision-fixtures.test.js`: the runner.
- `tests/fixtures/corp-decisions/*.txt`: the fixtures.

The real `CorpTestField` builds PIXI-rendered cards, so it cannot run in Node. The runner supplies plain-object versions of `InstanceCard`, `InstanceCardsPush`, `CorpTestField` and `RunnerTestField`. The dump from a log can then be evaluated as-is inside the same `vm` sandbox that `tests/corp-server-security.test.js` uses. It loads the real `ai_corp.js` and the three scoped card sets.

### Commands

```
node tests/corp-decision-fixtures.test.js                  # run every fixture
AI_LOG=1 node tests/corp-decision-fixtures.test.js         # also print the AI's own reasoning
node tests/corp-decision-fixtures.test.js --ids            # list card IDs for writing fixtures
node tests/corp-decision-fixtures.test.js --stub-missing   # discovery mode (see caveats)
```

The runner sets a non-zero exit code when any fixture fails. Chain it with the existing suite:

```
node tests/corp-server-security.test.js && node tests/corp-decision-fixtures.test.js
```

### Fixture format

A fixture is a text file. The `// KEY: value` lines are JavaScript comments, so the whole file evaluates normally.

| Directive | Meaning |
|---|---|
| `// PHASE: Phase_Main` | Which AI method to call. Default `Phase_Main`. Others: `Phase_Mulligan`, `Phase_Score`, and so on. |
| `// OPTIONS: install, advance, gain, draw` | The option list the engine offered. It is not in the log dump, so you write it. |
| `// EXPECT: advance` | The right answer. `// EXPECT: !purge` means "must not choose purge". |
| `// SETUP: corp.creditPool=5; corp.clickTracker=3` | Extra state to apply after the dump. Needed for non-debug logs. |
| `// NOTE: ...` | Free text for your own reference. |

Example (`advance-agenda-one-short.txt`):

```
// PHASE: Phase_Main
// OPTIONS: install, advance, gain, draw
// EXPECT: advance
// SETUP: corp.creditPool=5; corp.clickTracker=3; runner.creditPool=5
// NOTE: Hostile Takeover (needs 2) sits in a remote with 1 advancement.
RunnerTestField(30019, [], [], [], [], [], cardBackTexturesRunner,glowTextures,strengthTextures);
CorpTestField(30035, [], [], [31077], [], [], [], [[31071]], [], cardBackTexturesCorp,glowTextures,strengthTextures);
corp.remoteServers[0].root[0].advancement=1;
```

## Adding a mistake, step by step

1. **Download the log at the moment of the mistake.** The dump is a snapshot from when you press download.
2. **Copy the block that starts at `RunnerTestField(`** from the end of the log into a new file, e.g. `tests/fixtures/corp-decisions/short-description.txt`.
3. **Add the directives** at the top: `PHASE`, `OPTIONS`, `EXPECT`, and `SETUP` if credits and clicks are missing.
4. **Run it.** It should fail. Use `AI_LOG=1` to see the AI's reasoning and find the code path that returned the wrong choice.
5. **Fix the code** until it passes.
6. **Commit the fixture** with the fix.

You decide the expected answer, so write down what a good player would do.

## Current state

Two fixtures ship with the runner:

| Fixture | Result | Meaning |
|---|---|---|
| `advance-agenda-one-short.txt` | PASS | `Phase_Main` advances an agenda that is one short of scoring. |
| `mulligan-one-ice-three-economy.txt` | FAIL (intended) | A hand with 1 ICE, 3 economy cards and 1 agenda is mulliganed ("Didn't draw enough playable ICE"). This is finding 4 in the findings file as a red test. |

`Phase_Main` needed three engine stubs that were not in the existing harness: `CheckScore`, `CheckTags`, `AdvancementRequirement`. The runner defines them, and `corp.resolvingCards` and `corp.AI` are also set up.

## Caveats

- **Not tested on a real downloaded log.** The fixtures were written by hand in the format that `ReproductionCode()` emits, going by the code. Expect small adjustments the first time, for example with hosted cards or unusual property lines.
- **The stubs are approximations.** `CheckScore` in particular approximates the engine check. Other phases may need more stubs, and each wrong stub can distort a result.
- **`--stub-missing` is for discovery only.** It auto-stubs any missing engine function to return `false` and prints the names. Results in that mode are not trustworthy. Write real stubs for the names it lists.
- **Snapshot timing.** The dump captures the moment you download, not the moment of the decision. If you download later, the board has changed.
- **Option list not captured.** You write `OPTIONS` yourself.
- **Hidden information is in the dump.** The AI must not read it. A fixture therefore also tests that the AI's choice does not depend on hidden cards.
- **Mid-run state is probably not covered.** Encounter state is not obviously part of the dump. Start with main-phase and mulligan decisions.
- **Stub duplication.** The engine stubs are copied from `tests/corp-server-security.test.js`. Keep the two in sync, or move them into a shared helper.
- **Possible AI quirk, not investigated.** With Ansel 1.0 in hand and 5 credits, the AI counted "0 playable ICE". It is probably its `AIWorthwhileIce` rule for a not-yet-chosen server. Worth a look.

## Where it fits with the roadmaps

- The install roadmap's **Phase 0** asks for opt-in decision logging and deterministic fixtures for representative hands and boards. This runner is that fixtures piece.
- It is separate from the seeded AI-vs-AI batch harness (findings item 12). Fixtures check single decisions. The harness measures whole-game behaviour. You want both.
- It complements `tests/corp-server-security.test.js`, which checks evaluator helpers directly.

## Suggested next steps

1. Add fixtures for the next two or three real mistakes you see in play.
2. Add an opt-in hook in `Choice()` that saves `ReproductionCode()` plus the option list and the chosen index at each decision. Then a bad decision becomes a fixture without needing the log at the right moment.
3. Move the shared engine stubs into one helper used by both test files.
4. Run both test files in one command before each commit.

## Files

- `tests/corp-decision-fixtures.test.js`
- `tests/fixtures/corp-decisions/advance-agenda-one-short.txt`
- `tests/fixtures/corp-decisions/mulligan-one-ice-three-economy.txt`
