# Running the AI batch harness

This guide is for you, the project owner. It covers how to play seeded
AI-vs-AI games from the terminal, run a gate, read a report and change the
decks the harness uses. Why gates exist and how to judge one is in
[judging-ai-changes.md](judging-ai-changes.md). How the harness works inside is
in [architecture: Foundations](corp-ai/architecture.md#foundations).

Everything here runs on your machine with plain Node. It uses no AI tokens:
both AIs are ordinary JavaScript. All commands run from the repository root.

## The two scripts

| Script | Use it to |
|---|---|
| `scripts/ai-game.js` | Watch or replay **one** game: who won, how long it took, and a fingerprint of its log |
| `scripts/ai-batch.js` | Play **many** games on the committed deck pool, write a report, compare two reports, or run a gate |

Both play the real game engine and both AIs with no screen. A game takes about
1 to 3 seconds.

## One game

```sh
node scripts/ai-game.js                       # seed 1, Duel PD vs Tao
node scripts/ai-game.js --seed 7
node scripts/ai-game.js --seeds 1-20 --jobs 8  # one line per seed, 8 at a time
node scripts/ai-game.js --corp "LEO Glacier.js" --runner "Topan CBB.js" --seed 3
node scripts/ai-game.js --seed 3 --tail 40     # also print the last 40 log lines
```

Each line is JSON: `winner`, `reason`, `turns`, `ms`, the agenda points, and
`logHash`. The same seed always replays the same game, so the same `logHash`
means the same game. If a change was meant to leave play unchanged, the hashes
before and after must match. A game that logs an engine error exits with code 1
and lists the error, because a hidden error silently changes what the AI does.

`ai-game.js` keeps its own fixed set list and seed naming so old recorded
hashes stay valid. Its games are therefore not the same as the batch's games
for the same seed number.

## A batch

```sh
node scripts/ai-batch.js                          # the whole pool, 200 seeds per pair
node scripts/ai-batch.js --pairs pd-tao,gateway   # only these pairs
node scripts/ai-batch.js --games 50               # seeds 1-50 per pair
node scripts/ai-batch.js --seeds 101-300          # an explicit seed range (or a file)
node scripts/ai-batch.js --out my-report.json     # where to write the report
```

The full pool (7 pairs × 200 seeds = 1,400 games) takes about 6 to 8 minutes
on 8 processes. `--jobs <n>` sets the number of processes; the default is your
CPU count minus 2. Without `--out`, the report goes to `.ai-batch-cache/`,
which Git ignores.

The terminal shows a summary for each deck pair:

```
1400 games (0 failed) in 412 s
  pooled                   corp win 31.4% [29.0, 33.9]  scored 3.10  stolen 5.92  turns 17.3  (1400 games)
  btl-kit                  corp win 24.0% [18.0, 30.0]  scored 2.71  stolen 6.30  turns 15.8  (200 games)
  ...
```

`corp win` is the Corp's win rate with its 95% range in brackets. `scored` and
`stolen` are the average agenda points per game, and `turns` is the average
game length.

### Five-pair regression benchmark (including N/A tickets)

Use the frozen `beginner-v1` pool from the Corp AI regression investigation
to screen gameplay changes, including tickets whose acceptance gate is
`N/A`. It contains PD–Tao, BTL–Kit, NEH–Zahya, PE–Steve and Gateway, using
System Gateway, System Update 2021 and Elevation. Seeds 1–200 give 1,000 games.
Run on a clean, committed candidate branch, using a new output filename for
each PR/revision so earlier evidence is preserved:

```sh
node scripts/ai-batch.js \
  --pool documentation/corp-ai-regression/assets/beginner-pool.json \
  --seeds 1-200 \
  --out bench/pr-12-candidate.json

node scripts/ai-batch.js \
  --compare bench/corp-options-default.json bench/pr-12-candidate.json
```

Replace `pr-12-candidate.json` with the ticket/PR and revision being tested.
Keep reports in the ignored `bench/` evidence folder. The saved benchmark
JSON is local evidence; it is not included in a fresh clone. Preserve/back up
that file rather than overwriting it with a new run.

The latest corrected-default benchmark was run on **2026-10-05**, at clean
commit **`28cc665`**, with **1,000 games and zero failures**, pool hash
`fe8cb821d04c9dd7` and code hash `83dee8ba06045827`. Its report is
`bench/corp-options-default.json`. This is the corrected default intended for
integration into main, rather than the investigation's old tip `b52d451`
(`bench/current.json`, 25.3% Corp wins).

| Pooled metric | Corrected-default benchmark |
|---|---:|
| Corp win rate | **39.8%** |
| Corp points scored per game | 3.920 |
| Runner points stolen per game | 5.767 |
| Points stolen from HQ per game | 1.756 |
| Points stolen from R&D per game | 2.044 |
| Points stolen from Archives per game | 0.008 |
| Points stolen from remotes per game | 1.959 |
| Game length (turns) | 14.931 |

The report used no start fixtures or collectors, Runner options `{}`, and
all six Corp options false: `evidenceBasedHostedCardRez`,
`secureScoringServerGate`, `serverAtRiskInstallOverride`,
`committedAgendaReserveBypass`, `emptyArchivesRunPressure` and
`valuelessServerDebtReset`. The command above uses the candidate's defaults;
check its report's effective options against these settings and explain any
intentional difference. Keep the pool, decks, seeds, fixtures and collectors
identical; the comparator rejects mismatches in pool hash, seeds, starts or
collectors. Different source commits/code hashes are allowed.

Read both reports' failure counts before interpreting the paired comparison:
failed games are dropped from paired metrics and must be investigated, not
treated as ordinary losses. Inspect pooled and per-pair results, win rate,
scoring, total and per-server theft, and game length together. The plain
comparison reports differences and paired 95% intervals; it does not award a
regression pass/fail. Its phrase "changed by the options" counts differing
game log hashes even when comparing code revisions.

For a behaviour-preserving refactor, require zero changed games and unchanged
decision snapshots. For an objective bug fix, changed games are expected when
the fixed path is reached: investigate adverse outcome differences and record
their explanation alongside the deterministic reproduction. A correctness
fix is not rejected solely because one side's win rate falls. Pure documentation
and human-only UI changes need not run this gameplay screen.

This frozen benchmark tracks cumulative changes. To attribute a difference
to one PR, also run the same command on its target main commit with a distinct
output such as `bench/pr-12-main.json`, then compare that report with the
candidate. After main integration, verify the merged build against the saved
benchmark rather than assuming it reproduces the recorded result. This screen
supplements the full regression suite and any ticket-specific strategic gate.
See the [completed investigation handoff](corp-ai-regression/gated-fix-handoff.md)
for the evidence and remaining scoring deficit against the historical H0 build.

### What a report contains

The JSON report has one line per game, plus:

- the commit, whether the working tree was dirty, the exact command, and a
  `codeHash` of every file the games loaded;
- the pool file, its trusted sets and a `poolHash` covering the pool and every
  deck list;
- the seeds, any `--start` fixtures, the collectors, and the effective AI
  options for both sides;
- `aggregates`, the per-pair and pooled averages of every metric, and
  `failures`, every game that ended without a winner or logged an engine error.

The core metrics are:

| Metric | Meaning |
|---|---|
| `winRate` | Corp wins / games |
| `pointsScored` | Corp agenda points scored per game |
| `pointsStolen` | Runner agenda points stolen per game |
| `pointsStolenByServer.hq` / `.rd` / `.archives` / `.remote` | Where the stolen points came from |
| `gameLength` | Turns until the game ended |
| `decisionLatencyMs.corp.mean` / `.p95` / `.max` (and `.runner`) | How long each AI took per decision |
| `mulliganRate.corp` / `.runner` | Games in which that side took a mulligan |

`winRate` and `pointsScored` are better when higher, `pointsStolen` and the
latencies when lower. `gameLength` and `mulliganRate` have no better
direction.

To replay one game from a report in detail, run `ai-game.js` with the same
decks. That uses different random streams, so compare outcomes, not hashes.

## Running a gate

Codex normally runs a ticket's gate itself, in the session that implements it,
and records the result. That is the cheapest route in tokens: the games cost
nothing and the output is a few lines. You run a gate yourself only when a
ticket was handed off with `**Gate:** pending F4` and a `**Gate command:**`
line, or when you want to check a result. `node scripts/roadmap.js gates`
lists the pending ones under "Built, option off, gate waiting to be run". To
run one, copy its command, for example:

```sh
node scripts/ai-batch.js gate --corp-option weightedProtectionDebt=true \
  --collector protection --improve protection.highConsequenceBreaches \
  --guard pointsStolen=0.2 --guard winRate=0.02
```

`gate` plays the pool twice on the same seeds: once with every option off (the
**baseline**) and once with the ticket's option on (the **candidate**). It then
compares them game by game. It prints only the metrics the gate names (`--all`
prints every metric):

```
2800 paired games, 412 changed by the options
  metric                               baseline  candidate  difference  95% interval
  pointsStolen                            5.920      5.880      -0.040  [-0.150, +0.070] (lower is better)
  winRate                                 0.314      0.318      +0.004  [-0.010, +0.018] (higher is better)
  PASS changed option effect
  PASS guard pointsStolen tolerance 0.2
  PASS guard winRate tolerance 0.02
Gate: passed
```

- **Changed games.** The first line counts the paired games whose log differs
  from the baseline's. If the option changed no game, the gate fails with
  `FAIL changed option effect`, even when every guard passes: the option never
  came into play, so the run is no evidence for or against it. Either the
  option is not wired up, or the deck pool rarely reaches the board it is
  about. Add start boards that reach it (`--start`), rather than more seeds.
- `--improve <metric>` passes only if the whole 95% interval is on the better
  side of zero.
- `--guard <metric>=<tolerance>` passes if the interval rules out a regression
  larger than the tolerance (in the metric's own units: 0.02 of `winRate` is 2
  percentage points).
- `--better <metric>=higher|lower` gives a direction to a metric that has none.
- `--side runner` marks a Runner item. Directions are Corp-centred by default
  (a higher `winRate` is better), and this flips them for the outcome metrics.
- `--max <metric>=<n>` is a hard check: it fails if any single candidate game
  exceeds `n`, for conditions that must always hold rather than on average.

Every ticket's gate is written in one fixed form with exactly one flag per
row; see [ai-planning.md: Writing a gate](ai-planning.md#writing-a-gate).

A full gate is 2,800 games, about 15 to 20 minutes. The baseline half is
cached: running a second gate on the same code reuses it, and so does a
matching committed baseline. The cache key covers the code of every loaded
file, so any code change plays a fresh baseline. If you ran a pending gate
yourself, paste the output into Codex with `$implement-ticket <ticket>`. It
records the result and switches the option on only if the output says
`Gate: passed`.

`--quick` plays 50 seeds per pair (about 5 minutes) and marks the result
"indicative only". It can never pass a gate, but it is how a ticket proves its
gate is ready to run: the quick run completes, and its first line reports at
least one game changed by the options. The command exits non-zero so it cannot be mistaken for a pass.

### Comparing two reports by hand

```sh
node scripts/ai-batch.js --corp-option evidenceBasedHostedCardRez=true --out on.json
node scripts/ai-batch.js --out off.json
node scripts/ai-batch.js --compare off.json on.json --guard winRate=0.02
```

`--compare` refuses two reports whose pool, seeds, fixtures or collectors
differ. Only the AI options may differ, because otherwise the games would not
be pairs.

## AI options

`--corp-option <name>=<value>` and `--runner-option <name>=<value>` change one
option for that run only. The available names are the keys of
`CorpAI.DEFAULT_OPTIONS` (bottom of `ai_corp.js`) and
`RunnerAI.DEFAULT_OPTIONS` (bottom of `ai_runner.js`). An unknown name is an
error, so a typo cannot quietly run the baseline twice. Values `true`, `false`
and numbers are parsed; anything else is a string.

## Starting from a saved board

```sh
node scripts/ai-batch.js --start tests/fixtures/corp-decisions/corp-draw-ok-when-hq-secure.txt --pairs pd-tao
node scripts/ai-batch.js --start tests/fixtures/corp-decisions --games 20
```

`--start` begins every game from a corp-decision fixture board instead of the
opening. The pool's decks still fill R&D and the Stack unless the fixture
lists cards for them. The fixture's identities and cards are laid on top, its
`SETUP` line is applied, and play begins at the Corp's action phase. Points
already in a fixture's score area are not counted as scored. With a directory,
every fixture is used and the report keys results by fixture. A fixture that
uses cards outside the pool's trusted sets is rejected, or skipped with a note
when it comes from a directory.

Many fixtures use small hand-made decks, so their games can end quickly when
R&D runs out. That is expected.

## Changing the decks

The pool is [tests/fixtures/ai-batch/deck-pool.json](../tests/fixtures/ai-batch/deck-pool.json):

```json
{
  "id": "core-v1",
  "sets": ["systemgateway", "systemupdate2021", "elevation"],
  "pairs": [
    {"id": "pd-tao", "corp": "Duel PD vs Tao.js", "runner": "Duel Tao vs PD.js"},
    ...
  ]
}
```

- `sets` is the list of **trusted** sets, the registry keys from `config.js`.
  The harness loads only these set files. This is deliberately separate from
  "playable" in [card-sets.md](card-sets.md): a set can be playable in the UI
  for testing while still too unfinished to measure the AI on.
- Each pair names a Corp and a Runner precon file in `precons/` and a short
  `id` that appears in reports.

### Swap or add a deck pair

1. Put the precon in `precons/`, using `node scripts/import-precon.js` or by
   hand. Prefer short file names without special characters, because you type
   them in commands.
2. Add or edit the pair in `deck-pool.json`. Give it a new, unique `id`.
3. Check it plays cleanly: `node scripts/ai-game.js --corp "<corp>.js"
   --runner "<runner>.js" --seeds 1-10 --jobs 8`. Every line must have a
   winner and an empty `errors` list. Fix or drop a deck that logs errors.
4. Run `node tests/ai-batch.test.js`. It fails if any card in any pool deck is
   outside the trusted sets or has no definition, and it names the card.
5. Change the pool `id` (for example `core-v1` to `core-v2`) and commit a new
   baseline (below).

### Add a set once you trust it

1. Add its registry key to `sets` (for example `"vantagepoint"`).
2. Add or swap in decks that use it, then follow the steps above.

Any change to the pool changes its `poolHash`. Reports from the old pool can no
longer be compared with new ones, and a gate in progress simply plays a fresh
baseline. That costs a few minutes, not a problem, but avoid changing the pool
casually because every comparison resets.

### Commit a new baseline

```sh
node scripts/ai-batch.js --out tests/fixtures/ai-batch/baselines/<pool id>-<code hash>.json
```

Run it on a clean, committed tree with every option off. Name the file after
the pool id and the report's `codeHash` (printed in the report; the commit sha
is recorded inside). Commit the file. Later gates reuse it automatically while
the code is unchanged, and it is the reference for how much each metric
varies between deck pairs.

## Screening decks for balance

To try candidate pairs without touching the committed pool, write your own
pool file and point the harness at it:

```sh
node scripts/ai-batch.js --pool my-candidates.json --games 200
```

Each pair's line shows the Corp win rate with its 95% range. A pair whose range
sits far from 50% (say entirely above 65% or below 35%) is lopsided for the
current AIs.

Keep two things in mind:

- **AI-vs-AI win rate is not pure deck balance.** It also reflects how strong
  each AI is relative to the other. A pair at 70% Corp wins may be balanced
  decks with a stronger Corp AI, and the numbers will move as the AIs
  improve.
- **Balance matters less for gates than you might expect.** Gates compare the
  same seeds with an option off and on, so a lopsided pair still measures the
  change fairly. A very lopsided pair (say 95% one way) is mostly a waste of
  games, because its win rate can barely move.

How to pick pool pairs from screening results, and how often to re-screen, is
roadmap item F8.

## When something goes wrong

- **`FAILED <pair> seed <n>: <error>`.** That game logged an engine error or
  ran out of time (900 s by default, `--timeout` to change). Failed games are
  listed in the report and left out of comparisons. Reproduce it with
  `ai-game.js` and the same decks, then triage the error like any other bug.
- **`Unknown corp AI option`.** Check the name against `DEFAULT_OPTIONS`.
- **`Reports differ in seeds`** (or pool, starts, collectors). The two reports
  were not played on the same games; re-run one of them.
- **A gate is slower than expected.** Lower the job count if your machine is
  busy, or check `decisionLatencyMs` in the report: a change that makes the AI
  slower shows there.

## For agents adding a metric

A ticket that needs a metric beyond the core ones adds a collector:
`scripts/ai-batch/collectors/<name>.js` exporting `{name, onEvent(event,
game), finish(game)}` and optional `directions`, and lists it in its gate
command with `--collector <name>`. [collectors/runs.js](../scripts/ai-batch/collectors/runs.js)
is the example. Details are in
[architecture: Foundations](corp-ai/architecture.md#foundations).
