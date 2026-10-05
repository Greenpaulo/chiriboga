# F4 Seeded AI-vs-AI batch harness

## Resolution

Implemented from `f795a63`.

**Separate investigation.** The `documentation/corp-ai-regression/` tree was
added in `7b28f2a` after the harness was used. It preserves historical benchmark
findings, runbooks and evidence; it is tracked in
[corp_ai_regression_investigation.md](corp_ai_regression_investigation.md),
not claimed as F4 implementation or a production AI fix.

**What was built.**
- `scripts/ai-batch/headless.js` is the shared headless game module,
  extracted from `scripts/ai-game.js`; `ai-game.js` now uses it with its old
  set list and seed naming, so F6's hashes still hold.
- `scripts/ai-batch.js` runs batches, `--compare` and `gate`. It sets AI
  options (an unknown name is an error), loads collectors from
  `scripts/ai-batch/collectors/` (`runs` is the example), starts from
  fixtures with `--start`, and offers `--quick`, `--side runner` and
  `--max`. It reuses a cached or committed baseline by code-hash key and
  writes reports with one game per line.
- `scripts/ai-batch/metrics.js` holds the core metrics from the event
  stream, the aggregation and the paired, fixed-seed bootstrap rule.
- The pool is `tests/fixtures/ai-batch/deck-pool.json` (`core-v1`): seven
  pairs over the trusted sets System Gateway, System Update 2021 and
  Elevation.
- The first baseline is
  `tests/fixtures/ai-batch/baselines/core-v1-a0ab675e420ce8b0.json`.

**Engine and AI changes**, all off unless the harness enables them or
behaviour-neutral:
- `AIGameEnded()` is called from `PlayerWin()`.
- Telemetry mode on `DecisionSnapshots` (`telemetry`, `Record()`), timed
  around `_choiceInner()` and the Runner's `_computeChoice()`.
- `RunnerAI.DEFAULT_OPTIONS`.
- `Steal()` now records the real stolen-from server. It compared
  `attackedServer` with the servers' `.cards` arrays, so it always said
  "remote". Its only consumer is the debug log.
- Out of scope, but it blocked a required pool deck: Off the Books (35071,
  Elevation) called an undefined `ShuffleArray()`, so it threw instead of
  shuffling R&D. It now calls `Shuffle()`.

**Departures from the ticket, all agreed with the owner unless noted:**
- The trusted sets live in the pool file, not "playable" in `card-sets.md`.
- Seven pairs, adding Duel PE vs Steve. `Duel PD vs Steve.js` was renamed to
  `Duel PE vs Steve.js` because it misnamed its identity; the duplicate
  imports were removed.
- Gates are run by the implementing agent as one blocking command, with the
  owner running them only as a fallback (cheapest in tokens).
- `gameEnd` is emitted by the harness; `GameEnded()` stays an empty AI hook.
- Baselines are named `<pool id>-<code hash>`, not `<sha>`, because the reuse
  key is a hash of every loaded file (line endings ignored). The sha and a
  dirty flag are recorded inside.
- Not agreed in advance: a stall watchdog fails a game whose main loop stops
  for 10 s instead of waiting 900 s. Without it, the first baseline took
  1,205 s; with it, 344 s.
- A gate template was added ("Writing a gate" in `ai-planning.md`), with
  `--side runner` and `--max` so every row maps to one flag.
- Added after the first real use (owner request, 2026-10-02): every gate also
  checks that the option changed at least one paired game's `logHash`
  (`changed option effect`), and the first output line counts them. The
  hosted-Trojan option's pool run had changed none of 1,397 paired games yet
  printed `Gate: passed`, because zero differences pass every guard. With
  the same run, it now fails. Gate setup (collectors and start boards) is now an
  acceptance criterion of the gated item itself, proven by a `--quick` run
  that changes at least one game, and `ticket.js check` fails a gate command
  naming a missing collector or start board. The template, skills and owner
  guides were updated to match.
  Because `metrics.js` is in the code hash, the baseline was regenerated
  under its new key; all 1,400 games have the same `logHash` as before.

**Baseline.** Produced with `node scripts/ai-batch.js --jobs 8 --out
tests/fixtures/ai-batch/baselines/core-v1-a0ab675e420ce8b0.json` (all options
off; seeds 1–200 per pair; 1,400 games in 344 s).
- Pooled Corp win rate: 25.0% [22.8, 27.3].
- Per pair: pd-tao 51.5%, zwicky-magdalene 43.4%, btl-kit 34.0%, pe-steve
  22.0%, gateway 9.5%, neh-zahya 9.5%, leo-topan 5.0%.
- 3 games failed. These are real engine bugs, now ticketed (out of scope):
[corp-install-choice-crashes-on-null-skip-option.md](../../bugs/corp-install-choice-crashes-on-null-skip-option.md),
[humanoid-resources-install-stalls-game.md](../../bugs/humanoid-resources-install-stalls-game.md)
and [scrounge-unaffordable-program-stalls-game.md](../../bugs/scrounge-unaffordable-program-stalls-game.md),
each with a failing pending reproduction:
  - `leo-topan` seed 101: `TypeError: Cannot read properties of null
    (reading 'unique')` during a Corp select choice. The AI falls back to an
    arbitrary option, then "No valid commands available". The same error
    appeared in one fixture-start game.
  - `zwicky-magdalene` seeds 68 and 139: the main loop stops on "No valid
    commands available" / "Null command" (seed 68 right after the Runner
    plays Scrounge).
  - Replay any of them with, for example, `node scripts/ai-game.js --seed
    68:zwicky-magdalene --corp "Zwicky Supermodernism.js" --runner
    "Magdalene CBB.js" --tail 30`.

**Tests.** `tests/ai-batch.test.js` covers scenarios 1–10, plus baseline
reuse, `--quick`, `--side` and `--max`.
- `tests/ai-roadmaps.test.js` now scans the harness scripts for
  architecture names.
- `tests/agent-scripts.test.js` now creates empty status folders it needs
  (`bugs/code-review/` vanished from the checkout when it emptied; this
  failure was pre-existing).
- Behaviour checks on the final code:
  - F6's hashes are unchanged: PD/Tao seeds 1–3 `7fd342dbe6a8`,
    `56b2c48622d9`, `4f89d7cde989`; BTL/Kit seed 1 `5f85d9269838`;
    NEH/Zahya seed 1 `03b8c00f468a`.
  - Telemetry on vs off gives identical hashes and AI-stream draw counts.
  - Over 42 games, scored and stolen points match the final score areas.
- `node tests/run-all-tests.js` passes.

**Other documentation.**
- The owner's guide, `documentation/ai-batch-harness.md`.
- Foundations in [architecture.md](../../corp-ai/architecture.md#foundations).
- `ai-planning.md`: AI options and the gate template.
- `judging-ai-changes.md`, `workflow.md`, the `implement-ticket`,
  `review-ticket`, `triage-log` and `reground-spec` skills, and the I0 spec.
- New proposed item F8 (balanced deck-pool screening, owner request).
- F7 spec: two further local speed ideas measured and rejected.

## Implementation plan

Proposed at `f795a63`, 2026-10-02. **Approved 2026-10-02** (amended: trusted pool sets, Duel PE/Steve pair, owner guide, F8 screening follow-up).

- **Validation:** Not an AI-choice change: F4 adds infrastructure, and its
  oracle is objective (same seeds give identical reports; telemetry and
  collectors change no decision or `logHash`). The ticket is ungated, as it
  says. D2 and F6 are `done`, so F4 is unblocked. Where the ticket is stale or
  wrong:
  1. **Runtime.** After F6 a Duel PD vs Tao game averages about 2.3 s on 8
     jobs, not 27 s. A 2,400-game gate takes about 15–20 minutes, not 2¼
     hours. "Running gates" is corrected below. Running gates from the terminal
     and reusing baselines are still worth having; `--quick` matters less.
  2. **Stolen-from server is always "remote".** `Steal()` (`mechanics.js`)
     compares `attackedServer` with `corp.HQ.cards`/`corp.RnD.cards`/
     `corp.archives.cards`, but `attackedServer` is a server object
     (`mechanics.js:14`; `phase.js` compares it with `corp.HQ`). So
     `agendaStolenLocations` always records `"remote"`. Its only consumer is
     the debug log text (`utility.js`). `pointsStolenByServer` needs the real
     server, so fix the comparison. This is an objective fix with no gameplay
     or AI effect.
  3. **AI options.** `CorpAI.DEFAULT_OPTIONS` already exists
     (`evidenceBasedHostedCardRez`). `RunnerAI` has none, and
     `ai-planning.md` still says neither has one. F4 adds an empty frozen
     `RunnerAI.DEFAULT_OPTIONS`, copies it in the constructor and corrects
     that paragraph.
  4. **Runner choices are asynchronous.** `RunnerAI` has no `Choice()`. Its
     single funnel is `_computeChoice()` (a Promise over the async
     `_internalChoiceDetermination()`, which uses only microtasks, no timers).
     Telemetry wraps it there; latency is measured from call to resolve.
  5. **Fixture boards are partial.** Corp-decision fixtures list only some
     cards (often an empty R&D and Stack) and start at `Phase_Main`. A game
     from one alone would end on the first empty-deck draw. `--start`
     therefore builds the deck pair as normal, overlays the fixture with the
     real `CorpTestField`/`RunnerTestField` (which replace R&D/Stack only when
     the fixture lists them), applies its `// SETUP:` line, skips the opening
     shuffle and draw, and enters `corpActionMain`. The report records this.
  6. **`gameEnd` source.** The ticket has `CorpAI.GameEnded()` emit the
     harness event. That couples the AI to the harness. Instead `PlayerWin()`
     calls both `GameEnded(winner)` hooks, which stay empty and available to
     later AI items such as L8.5, and the harness emits `gameEnd` from its own
     observation of `PlayerWin`.
  7. **Stream names.** `scripts/ai-game.js` seeds `<seed>:engine` with no
     deck-pair id. The batch uses `<seed>:<deckPairId>:<stream>` as the ticket
     requires. `ai-game.js` keeps its naming, so F6's recorded hashes remain a
     valid regression oracle.
- **Approach:**
  - **Shared headless module** `scripts/ai-batch/headless.js`, extracted from
    `ai-game.js`. It takes the set files to load as a parameter. The batch
    loads exactly the pool's own `sets` list. `ai-game.js` keeps its current
    four files so F6's hashes stay valid. It plays one game and exposes
    an event bus. Events come from harness-local wrappers in the `vm` context:
    `MakeRun`/run end, `Score`/`Steal` (detected from score-area growth),
    `Mulligan`, turn change and `PlayerWin`. There is no engine change for
    observation apart from fix 2.
  - **Telemetry mode** on `DecisionSnapshots` (`telemetry: null | {sink}`),
    separate from the bounded `interesting` recorder. It records `{n, side,
    identifier, choiceType, options, chosen, latencyMs}` for every
    `CorpAI.Choice()` (timing `_choiceInner()`) and every
    `RunnerAI._computeChoice()`. It uses no randomness and no
    `ReproductionCode()`.
  - **`scripts/ai-batch.js`.** It plays the pool × seeds (× `--start`
    fixtures) in child processes (`--jobs`), applies `--corp-option`/
    `--runner-option` (an unknown name exits with an error), runs collectors
    from `scripts/ai-batch/collectors/<name>.js`, and writes the report. The
    report holds the sha, a dirty flag, the command, the pool hash, seeds,
    fixtures, effective options, collectors, per-game metrics, and per-pair
    and pooled aggregates.
  - **Metrics** are computed from the event stream by a pure function, so they
    can be tested on scripted events.
  - **`--compare a b`** uses the shared rule: refuse mismatched keys, pair by
    `(fixtureId, deckPairId, seed)`, and compute a 10,000-resample bootstrap
    from a fixed-seed PRNG. Metric direction is declared per metric.
  - **`gate` subcommand** (`--corp-option x=true [--quick]`). It plays the
    all-off baseline, or reuses a cached report with a matching key in
    git-ignored `.ai-batch-cache/` (clean tree only), plays the candidate and
    compares.
  - **Pool (amended with the owner, 2026-10-02):** `deck-pool.json` declares
    its own trusted `sets`: `systemgateway`, `systemupdate2021` and
    `elevation`. Being marked `playable` in `card-sets.md` means only "usable
    in the UI for testing" and is not the harness criterion. The pool test
    checks every card against that list and checks that each card is defined.
    The pairs are Duel PD/Tao, Duel BTL/Kit, Duel NEH/Zahya, Duel PE/Steve
    (`Duel PE vs Steve.js`/`Duel Steve vs PE.js`; the Corp file was renamed
    from `Duel PD vs Steve.js`, which misnamed its Personal Evolution
    identity), Gateway Corp/Runner, Zwicky vs
    Magdalene CBB and LEO Glacier vs Topan CBB. The CBB decks use only System
    Gateway and Elevation cards, none of them undefined. Each pair is confirmed
    to play without engine errors; if one fails, I'll swap in another
    candidate and record why. Adding a set or deck later means: extend
    `sets`, edit the pool, run the pool test and commit a new baseline.
  - **First baseline:** 200 seeds × 7 pairs, committed.
  - **Deck screening (owner request).** `--pool` accepts any pool file, so
    candidate pairs can be screened outside the committed pool. The report's
    per-pair `winRate` carries a bootstrap 95% interval. Balance selection
    itself is recorded as a proposed follow-up, F8, with a spec, not built
    here: AI-vs-AI win rate mixes deck balance with the two AIs' relative
    strength, and changing the pool resets baselines, so the selection rule
    and how often to re-screen need their own design.
  - Rejected alternatives: a separate logger for telemetry (the ticket forbids
    it); replacing `PlayerWin` with no `GameEnded` call (F4 requires the
    hooks); deriving steal location from log text (fragile).
- **Tests:** a new `tests/ai-batch.test.js` covers scenarios 1–10. Real games
  use the fastest pair and few seeds to keep the suite short. Scenarios 5 and 8
  use synthetic reports and scripted event streams, plus one real game
  cross-check (`pointsStolen` equals the Runner's final agenda points, and so
  on). It prints only failures and a summary. `ai-game.js` seeds 1–3 must keep
  F6's hashes.
- **Risk:** The engine and AI edits are small: the `Steal()` comparison,
  `GameEnded` calls in `PlayerWin()`, the telemetry wraps in both AIs and
  `RunnerAI.DEFAULT_OPTIONS`. Telemetry is off unless the harness enables it,
  and scenario 9 proves it changes no decision. Decision snapshots, fixtures,
  and F6 hashes (PD/Tao seeds 1–3, plus seed 1 of BTL/Kit and NEH/Zahya)
  guard against drift. The full suite runs after the change.
- **Docs:** a new owner's guide, `documentation/ai-batch-harness.md`, on
  running the harness from the terminal: single games, batches, options,
  gates, reading a report, changing decks, adding a set to the pool,
  re-baselining and screening candidate pairs. Also architecture.md
  Foundations (runner, options, collectors,
  telemetry, how to add a collector); `ai-planning.md` AI options; I0 spec
  references this runner and its telemetry; `implement-ticket`,
  `review-ticket`, `workflow.md`, and `judging-ai-changes.md` (gate command,
  real runtime, reading the report). `ai.md` is unchanged because no card hook
  changes.

**Roadmap item:** F4 · **Depends on:** D2, F6 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-planning.md` (Acceptance gates, AI options)
**Verified against code:** f795a63 (2026-10-02)

## Goal
A repeatable, headless batch runner, after F6 meets the headless-performance
prerequisite, that plays the Corp AI against the Runner
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
- **Runner AI:** Runner item D2 adds the injectable `_random` seam and routes
  Runner policy, card hooks and dynamically assigned Runner preference
  callbacks through it. The default still captures `Math.random` at
  construction time; the harness must assign its dedicated stream after
  constructing `RunnerAI`.
- `deck/seedrandom.min.js` (which provides `Math.seedrandom`) is loaded by
  the engine pages. `gauntlet.php` and `sets/tutorial.js` use it.

See [architecture: foundations](../../corp-ai/architecture.md#foundations).

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
  replaced by `new Math.seedrandom(seed + ':' + deckPairId + ':engine')`. This covers
  `RandomRange`, `Shuffle` and every card effect. Replacing the global is safe
  here because the context belongs to the harness.
- **Corp AI stream:** after `CorpAI` is constructed, the harness assigns
  `corp.AI._random = new Math.seedrandom(seed + ':' + deckPairId + ':corp')`. Replacing the
  global alone would not reach it, because the constructor has already
  captured `Math.random`.
- **Runner AI stream:** assigned through D2's seam from
  `new Math.seedrandom(seed + ':' + deckPairId + ':runner')`. Until D2 is
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

Start with about six pairs (seven were chosen; see the plan), covering at least one duel and the tutorial pair.
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
- It pairs games by `(fixtureId, deckPairId, seed)`, 200 games per deck pair
  and starting fixture by default.
- Per metric it prints the mean difference and a bootstrap 95% confidence
  interval, from 10,000 resamples of the paired differences drawn with a
  fixed bootstrap seed so the comparison itself is reproducible.
- A gate passes when each guarded metric's interval excludes a regression
  larger than its stated tolerance. For an improvement gate, each metric
  declares whether higher or lower is better; the paired difference is
  oriented so positive means improvement before requiring its interval's
  lower bound to be above zero (so lower latency is handled correctly).

**Baselines.** Committed under `tests/fixtures/ai-batch/baselines/`, named
`<pool id>-<sha>.json`, with all options off. F4 commits the first one. A
consumer's gate names the baseline file it compares against, and a consumer
that changes default behaviour commits a new baseline.

**Running gates: cost and who runs them.** *(Corrected 2026-10-02.)* The
historical F3 figure was about 27 s per game, which made a gate about 2¼ hours.
After F6 a game takes about 2 s, so a full gate (200 games × 7 pairs ×
baseline and candidate = 2,800 games) takes about 15–20 minutes on 8
processes. The games cost no tokens. The runner therefore supports:
- **Agent-run gates, owner fallback.** `implement-ticket` records the exact
  `**Gate command:**` and runs it as one blocking command in the same session; the
  compact output is the evidence. Only if it cannot finish does it hand off
  with `**Gate:** pending F4` for the owner to run. The owner chose this as the
  cheapest route in tokens: a second session to record an owner-run result
  costs more than the agent waiting.
- **Baseline reuse.** A report is keyed by a hash of every loaded code file,
  the pool hash, pairs, seeds, `--start` fixtures, collectors and options.
  `gate` reuses a matching cached or committed report and plays only the
  missing half.
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
- **Runtime:** 200 games for each of seven pairs, for both baseline and
  candidate, is 2,800 games per gate (about 15–20 minutes after F6). The
  runner shards games across processes (`--jobs`).
- **Dependency:** F4 depends on Runner item D2 (injectable Runner
  randomness). `scripts/roadmap.js` and `tests/ai-roadmaps.test.js` resolve
  dependencies across both roadmaps, so this Corp-to-Runner dependency is
  valid. D2 is done, with its ticket in `documentation/backlog/done/`. F4's
  committed baseline and complete gate workflow are recorded in this ticket's
  Resolution. The harness retains a regression check that Runner policy draws
  use the dedicated stream rather than silently falling back to the engine
  stream.

## Acceptance criteria
- [x] Every test scenario above is covered by a deterministic test.
- [x] `tests/fixtures/ai-batch/deck-pool.json` and the first baseline report under `tests/fixtures/ai-batch/baselines/` are committed, and the Resolution records the command that produced the baseline.
- [x] The collector extension point, the AI-option flags and the telemetry mode are described in `documentation/corp-ai/architecture.md` (Foundations), including how a consumer adds a collector.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`. (None: no card hook changed.)
- [x] I0 references this runner and its telemetry path.
- [x] Baseline reuse and `--quick` work as described under "Running gates", with tests.
- [x] Once the runner works, the same change updates the process to match: `implement-ticket` and `review-ticket` (amended with the owner, 2026-10-02: after F6 a gate takes 15–20 minutes, so the implementing agent runs it as one blocking command and the owner runs it only as a fallback, which is cheaper in tokens than a second session), `documentation/workflow.md` (the gate command in the quick reference and helper table), and `documentation/judging-ai-changes.md` (how to run a gate, how long it takes, reading the report).
- [x] `node tests/run-all-tests.js` passes.
