# F4 Seeded AI-vs-AI batch harness

**Roadmap item:** F4 · **Depends on:** D2 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-planning.md` (Acceptance gates, AI options)
**Verified against code:** 376f32c (2026-09-25)

## Goal
A repeatable, headless batch runner that plays the Corp AI against the Runner
AI from fixed seeds, on a committed pool of deck pairs, and writes a JSON
report of core outcome metrics. Every gated item uses it to compare a
baseline (its AI option off) with a candidate (option on) under one
comparison rule. Consumer items add their own metrics through a collector
extension point, and baselines are committed so later items compare against
the same numbers (review finding 12).

## Current behaviour
**Step 1 is done (2026-09-25, at `58f3a4d` plus D2):** `scripts/ai-game.js`
plays one full seeded AI-vs-AI game headlessly with the real engine files, the
real `StartGame()` and `Main()` loop and both AIs, from two precons. Findings:
- Only browser globals needed stubbing: jQuery (with a real `extend`), PIXI,
  `document`, timers (`window.setTimeout` runs the next step with
  `setImmediate`), `cardRenderer`, `particleSystems`, placeholder textures,
  plus loading `sounds.js`. No engine change was needed, and the
  end-of-game problem `decks.js` warns about did not appear.
- Three streams per seed (engine `Math.random`, `corp.AI._random`,
  `runner.AI._random`) make games reproducible: the same seed replays the same
  610-line log (`logHash`), and different seeds play different games.
- A missing stub (`particleSystems`) made an AI choice throw and fall back to
  an arbitrary option without failing the game, so the script fails any game
  that logs an engine error. The harness must keep that rule.
- **Speed is the constraint.** Ten games of Duel PD vs Tao took 5 s to 6.4
  min each, typically 30 to 40 s. A profile puts 85% of the time in the Corp
  AI's `_evaluateServerSecurity()` (via `_icePlanOutcome`, `_protectionScore`,
  `_rankedInstallOptions`), which F3 targets; the engine loop is cheap. At
  that speed a 2,400-game gate takes about 3 hours on 8 parallel processes.

The rest of this ticket builds the batch runner on `scripts/ai-game.js`.

Before step 1 there was no batch runner. The pieces:
- `decks.js` has a disabled (`if (false)`) test-field block that sets
  `mainLoopDelay = 50` "for speedy AI vs AI testing" in the browser.
- `tests/corp-decision-fixtures.test.js` evaluates one Corp decision
  headlessly in a `vm` context with engine functions stubbed. It does not
  play games.
- `DecisionSnapshots` (`utility.js`) is an opt-in recorder
  (`enabled: false`). It keeps only decisions in its `interesting` phases,
  at most `max` (12) entries, and each entry carries full
  `ReproductionCode()`. Its `totalMs`/`worstMs` measure the recorder's own
  cost (building the reproduction dump), not decision latency.
- `ReproductionCode()` dumps, as `RunnerTestField(...)`/`CorpTestField(...)`
  lines, are the format of the fixtures in `tests/fixtures/corp-decisions/`.
- `CorpAI.GameEnded(winner)` and `RunnerAI.GameEnded(winner)` are empty
  stubs, and nothing calls them. The game ends through `PlayerWin(player,
  msgstr)` in `utility.js`.

Randomness today:
- **Engine:** `RandomRange()` (`utility.js`) calls `Math.random`, and
  `Shuffle()` (`utility.js`) uses `RandomRange`. They drive the deck shuffles
  in `init.js`, HQ and Grip shuffles in `utility.js`, and `ShuffleInto` in
  `mechanics.js`. `sets/*.js` has 49 further `Math.random` / `RandomRange` /
  `Shuffle` calls for card effects. `decks.js` picks random identities with
  `RandomRange`.
- **Corp AI:** F1 is done. Policy randomness comes from `CorpAI._random`. The
  constructor assigns `this._random = Math.random`, so it captures the
  function that exists at construction time.
- **Runner AI:** not injectable. `ai_runner.js` calls `Math.random`
  (server-potential jitter) and `RandomRange` (a random-option fallback)
  directly. Runner item D2 (`documentation/runner-ai/roadmap.md`, proposed)
  adds the seam.
- `deck/seedrandom.min.js` (which provides `Math.seedrandom`) is loaded by
  the engine pages. `gauntlet.php` and `sets/tutorial.js` use it.

See [architecture: foundations](../corp-ai/architecture.md#foundations).

## Design

**Runner.** `node scripts/ai-batch.js` plays games headlessly:
- It loads the root engine files, the AI files, `runcalculator.js`, the sets
  marked `playable` in `documentation/card-sets.md` and the precons into one
  `vm` context per game. Rendering, sound and DOM calls are stubbed, and the
  main loop is stepped synchronously with no delay.
- Step 1 (one game runs to `PlayerWin` headlessly) is done; see Current
  behaviour. The browser-driven fallback is not needed.
- Options:
  `--pool <file> --games <n per pair> --seeds <file|range> --start <fixture>
  --corp-option <name>=<value> --runner-option <name>=<value> --collector
  <name> --out <report.json>`, and `--compare <baseline.json>
  <candidate.json>`.

**Seeding.** A seed must reproduce the whole game, and a policy change on one
side must not shift another side's random stream. The earlier text asked to
"seed with `Math.seedrandom(seed)`" while "not replacing global randomness".
Those conflict, so the rule is three independent streams per game, each
derived from `(seed, deckPairId)`:
- **Engine stream:** in the harness's own `vm` context only, `Math.random` is
  replaced by `new Math.seedrandom(seed + ':engine')`. This covers
  `RandomRange`, `Shuffle` and every card effect. Replacing the global is safe
  here because the context belongs to the harness.
- **Corp AI stream:** after `CorpAI` is constructed, the harness assigns
  `corp.AI._random = new Math.seedrandom(seed + ':corp')`. Replacing the
  global alone would not reach it, because the constructor has already
  captured `Math.random`.
- **Runner AI stream:** assigned the same way through D2's seam. Until D2 is
  done, Runner AI draws come from the engine stream, so a Runner-side policy
  change shifts the deck shuffles. Hence the dependency.

**AI options.** This follows the convention in `documentation/ai-planning.md`:
`CorpAI.DEFAULT_OPTIONS` / `RunnerAI.DEFAULT_OPTIONS` are copied into
`this.options`, and every option defaults to `false`.
- `--corp-option` / `--runner-option` set `corp.AI.options.<name>` /
  `runner.AI.options.<name>` after construction.
- An unknown option name is an error, not a no-op.
- The report records the full effective options for both sides.

**Deck pool.** The committed file is `tests/fixtures/ai-batch/deck-pool.json`:
a list of `{id, corp: "<precon file>", runner: "<precon file>"}`. A test
checks that every card id in every listed precon falls in a set marked
`playable` in `documentation/card-sets.md` (id ranges from `config.js`
`setRegistry`) and has a `cardSet[<id>]` definition in `sets/*.js`.
Candidates found in `precons/` whose card ids are all in playable sets:
- **Matched duels:** `Duel BTL vs Kit.js` / `Duel Kit vs BTL.js`,
  `Duel PD vs Tao.js` / `Duel Tao vs PD.js`, `Duel NEH vs Zahya.js` /
  `Duel Zahya vs NEH.js`.
- **Tutorial pair:** `Gateway Corp.js` / `Gateway Runner.js`.
- **Core Battle Box**, which covers Elevation and Vantage Point cards (ids
  35000 and up): `LEO Glacier.js`, `Nebula Fast Advance.js`,
  `PT Untaian Shell GameAssets.js`, `Zwicky Supermodernism.js` against
  `Magdalene CBB.js`, `MuslihaT CBB.js`, `Topan CBB.js`.
- **Quick-game `Girometics SG+SU21` decks**, for example `High Stakes.js`,
  `Thorny Grid.js` and `Wintermute.js` against `Open Gateway.js`,
  `The Long Con.js` and `Trash King.js`.

Start with about six pairs, covering at least one duel and the tutorial pair.
The pool must include two Core Battle Box Corp decks, because the reactive
items (R1.1, R1.2, R2) are judged on them:
- `Zwicky Supermodernism.js` (The Zwicky Group: Invisible Hands);
- `LEO Glacier.js` (LEO Construction: Labor Solutions).

`Nebula Fast Advance.js` (Nebula Talent Management: Making Stars) is a future
entry. Its identity, card 35057, has no definition in `sets/*.js`, so it
joins the pool, with a new baseline, once that card is defined. Any later
change to the pool starts a new baseline.

**Fixture-state starts.** `--start <fixture>` begins every game of the batch
from a saved mid-game board. The board is a `ReproductionCode()` dump in the
fixture format of `tests/fixtures/corp-decisions/`, loaded with the real
`RunnerTestField`/`CorpTestField`. The seeds then drive the rest of the game.
L3.5.1 needs a matrix of mid-game boards, so `--start` also accepts a
directory, and the report keys its results by fixture.

**Core metrics** (built by F4; names from the shared decisions):

| Metric | Definition |
|---|---|
| `winRate` | Corp wins / games, per deck pair and pooled |
| `pointsScored` | Corp agenda points scored per game |
| `pointsStolen` | Runner agenda points stolen per game |
| `pointsStolenByServer` | `pointsStolen` split into `hq`, `rd`, `archives` and `remote` |
| `gameLength` | Turns until `PlayerWin` |
| `decisionLatencyMs` | Per-`Choice()` wall time, per side: mean, p95 and max |
| `mulliganRate` | Games in which each side took a mulligan / games |

**Collector extension point.** A collector is one file in
`scripts/ai-batch/collectors/<name>.js` exporting `{name, onEvent(event,
game), finish(game)}`:
- The harness emits `gameStart`, `decision` (side, phase identifier, choice
  type, options, chosen, latency), `run` (server, success), `score`, `steal`
  (card, server), `turnEnd` and `gameEnd` (winner).
- `finish` returns a number, or an object of numbers, per game. The report
  aggregates it and the comparison rule treats it like a core metric.
- Consumer items add their own collectors as part of their work. Examples:
  - `evaluatorCallCount` (F3);
  - `stallTurns` and `unusedCreditsAtEnd` (whichever of I0 and R1.1 lands
    first), `unusedHandAtEnd` (cards in HQ at game end) and
    `reservedPlayMissedTurns` (R1.1);
  - `successfulRunsByServer`, `agendaExposureTurns`, `assetNetCredits` and
    `trapTriggers` (I0), and `threatPredictionError` (L5.1);
  - `bluffSingleVariableCorrelation` (defined in the L8.4 ticket, added by
    whichever of L8.2, L8.4 or L8.5 lands first), `postureDecisionsPerEpoch`,
    `postureLockedPastHorizon` (L8.4), `postureScriptWeights` (L8.5) and
    `postureShapeByCardClass` (L8.2);
  - `protectionWaitTurns` and `highConsequenceBreaches` (L3.5.1).

  F4 ships the extension point and one test collector.

**Telemetry: one path, shared with I0.** Decision logs and latency come from
the existing `DecisionSnapshots` recorder, extended rather than duplicated:
- Add a telemetry mode. It records every `Choice()` of both AIs (no
  `interesting` filter, no `max` bound, no `ReproductionCode()`) as `{n,
  side, identifier, choiceType, options, chosen, latencyMs}` and streams it to
  a sink the harness supplies.
- Latency is measured around the decision itself. In `CorpAI.Choice()` that
  is `_choiceInner()`; `RunnerAI` gets the same wrap. It does not measure the
  recorder's cost.
- I0's structured install-candidate records attach to the same entries. I0
  must not add a second logger.
- Telemetry must not change a decision or consume randomness.

**Game end.** Implement `CorpAI.GameEnded(winner)` / `RunnerAI.GameEnded`
and call them from `PlayerWin()`. They emit the `gameEnd` event.

**Report.** Each run writes one JSON file with:
- the git sha, the command line, the pool file and its hash, and the seed
  list;
- the `--start` fixtures and the effective options per side;
- the collectors used;
- per-game raw metric values (so a comparison can pair games), and per-pair
  and pooled aggregates.

**Comparison rule.** `--compare baseline candidate` applies the shared rule
(ai-planning.md, Acceptance gates):
- It refuses to compare reports whose pool hash, seed list, `--start`
  fixtures or collectors differ. Only the options may differ.
- It pairs games by `(deckPairId, seed)`, 200 games per deck pair by default.
- Per metric it prints the mean difference and a bootstrap 95% confidence
  interval, from 10,000 resamples of the paired differences drawn with a
  fixed bootstrap seed so the comparison itself is reproducible.
- A gate passes when each guarded metric's interval excludes a regression
  larger than its stated tolerance, and, for an improvement gate, the
  interval's lower bound is above zero.

**Baselines.** Committed under `tests/fixtures/ai-batch/baselines/`, named
`<pool id>-<sha>.json`, with all options off. F4 commits the first one. A
consumer's gate names the baseline file it compares against, and a consumer
that changes default behaviour commits a new baseline.

**Running gates: cost and who runs them.** Measured after F3: about 27 s per
game on 8 parallel processes, so a full gate (200 games × 6 pairs × baseline
and candidate = 2,400 games) takes about 2¼ hours. It costs no tokens, but it
must not tie up an agent session. The runner therefore supports:
- **Gates run from the terminal.** `implement-ticket` hands off with
  `**Gate:** pending` and records the exact command; the owner runs it when
  convenient and the result goes into the Resolution, as with
  `ticket.js check`.
- **Baseline reuse.** A baseline report is keyed by commit, pool hash, seed
  list, `--start` fixtures, collectors and options. When a matching report
  exists, `--compare` reuses it and plays only the candidate half.
- **Quick check first.** `--quick` plays 50 games per pair and reports the
  same intervals, marked "indicative". Only a full run can pass a gate.
- **Early stopping (optional, later).** Check the intervals as games finish
  and stop once every guarded metric is clearly inside or outside its
  threshold. It needs a stopping rule that keeps the 95% level honest
  (group-sequential bounds), so it is not part of the first version.

## Safety and information boundary
- Corp AI policy is seeded only through `CorpAI._random`, and Runner AI
  policy only through D2's seam. New AI policy code must not call global
  `Math.random`, `RandomRange` or `Shuffle`.
- Replacing `Math.random` is confined to the harness's own `vm` context. The
  shipped engine keeps its unseeded behaviour.
- Collectors and telemetry observe only. They must not change state, consume
  AI randomness or feed information to either AI.

## Test scenarios
1. Two runs with the same seed list, pool, options and `--start` produce
   identical reports, ignoring latency and timestamp fields.
2. An extra `corp.AI._random()` call made in a Corp decision does not change
   the engine stream: R&D and the Stack are in the same order at the first
   draw in both runs.
3. With D2's seam, the same seed reproduces the Runner AI's choices, and an
   extra Runner AI draw does not change the engine stream.
4. `--corp-option x=true` sets `corp.AI.options.x` for that run only, and the
   report records it. An unknown option name fails with an error. The
   comparison accepts a baseline/candidate pair that differs only in options
   and pairs games on the same seeds. It rejects a pair whose seed lists,
   pool, fixtures or collectors differ.
5. On two synthetic reports with a known per-game difference, `--compare`
   reports that mean difference and a deterministic bootstrap interval that
   contains it.
6. A test collector registered through the extension point receives the
   emitted events, and its metric appears in the report and in the
   comparison.
7. A batch started with `--start` from a green corp-decision fixture begins
   from that board, runs to `PlayerWin`, and is reproducible under scenario 1.
8. Every core metric, including `mulliganRate` and each `pointsStolenByServer`
   key, is present and correct in a scripted short game with a known outcome.
9. Enabling telemetry leaves every decision unchanged and consumes no
   randomness, compared with the same seeded game with telemetry off.
10. Every card in `tests/fixtures/ai-batch/deck-pool.json` belongs to a set
    marked `playable` and is defined in `sets/*.js`. The pool includes
    `Zwicky Supermodernism.js` and `LEO Glacier.js`.

## Acceptance gate
Not gated: F4 adds infrastructure and changes no AI decision. It is adopted
when:
- scenarios 1 to 10 pass;
- the first all-options-off baseline report is committed under
  `tests/fixtures/ai-batch/baselines/`;
- I0 references this runner and its telemetry path instead of creating its
  own.

## Things to consider
- **Consumers:** I0, I2, I4, I5, I9, R1.x, R2, L3.5.1, L5.1, L7.1, L8.2,
  L8.4, L8.5, F3 (evaluator call counts) and F5, mulligan weight calibration
  (`mulliganRate`).
- **Runtime:** 200 games for each of six pairs, for both baseline and
  candidate, is 2,400 games per gate. Measure games per minute early. The
  runner should be able to shard seeds across processes and merge the
  per-game results.
- **Dependency:** F4 depends on Runner item D2 (injectable Runner
  randomness). `scripts/roadmap.js` and `tests/ai-roadmaps.test.js` resolve
  dependencies across both roadmaps, so this Corp-to-Runner dependency is
  valid. The harness can be built before D2 lands, but no baseline is
  committed and no gate is judged until D2 is done. Until then, Runner draws
  share the engine stream and paired runs diverge.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] `tests/fixtures/ai-batch/deck-pool.json` and the first baseline report under `tests/fixtures/ai-batch/baselines/` are committed, and the Resolution records the command that produced the baseline.
- [ ] The collector extension point, the AI-option flags and the telemetry mode are described in `documentation/corp-ai/architecture.md` (Foundations), including how a consumer adds a collector.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] I0 references this runner and its telemetry path.
- [ ] Baseline reuse and `--quick` work as described under "Running gates", with tests.
- [ ] Once the runner works, the same change updates the process to match: `implement-ticket` and `review-ticket` (the gate is a terminal step the owner runs, not the agent), `documentation/workflow.md` (the gate command in the quick reference and helper table), and `documentation/judging-ai-changes.md` (how to run a gate, how long it takes, reading the report).
- [ ] `node tests/run-all-tests.js` passes.
