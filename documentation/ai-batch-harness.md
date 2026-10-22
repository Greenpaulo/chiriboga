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

If a worker exits with `SIGSEGV`, the runner prints a warning and retries that
same seed, deck pair, fixture and options once in a fresh worker, retaining
completed games. A second crash for that game, or any other unexpected worker
exit, aborts the batch without publishing an incomplete report.

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
Before the first comparison, check that `bench/current/baseline.json` exists.
Benchmark JSON is ignored local evidence, so a fresh clone has no baseline.
If it is missing, run `node scripts/refresh-ai-baseline.js` on a clean,
committed checkout of the PR's target main build to initialise it (see
[baseline refresh](#refreshing-the-accepted-baseline-after-a-merge)). Then
return to the candidate branch before running the commands below. Use the
same checkout so its ignored `bench/` reports remain available; if using
separate worktrees, copy the target-main baseline into the candidate's
`bench/current/baseline.json` first. Do not initialise the comparison baseline
from the candidate build.

If the target-main build predates the refresh script, initialise the report
there with the harness directly instead:

```sh
node scripts/ai-batch.js \
  --pool documentation/corp-ai-regression/assets/beginner-pool.json \
  --seeds 1-200 \
  --out bench/current/baseline.json
```

Check that this initial report records a clean build, 1,000 games and zero
failures before using it as the baseline.

To benchmark the checked-out branch and print its comparison in one command:

```sh
node scripts/compare-ai-branch.js
```

This runs the five-pair pool with seeds 1–200, writes `bench/<branchname>.json`,
then compares it with `bench/current/baseline.json`. The branch name is used
as written: `bugs/example` writes to `bench/bugs/example.json`, creating
folders as needed. Re-running on the same branch replaces its report, so copy any earlier
report you want to keep first. The script checks that the baseline exists
before starting and stops if the benchmark fails. Run on a clean, committed
candidate branch so the report records the build being tested.

For manual runs, use a new output filename for
each PR/revision so earlier evidence is preserved:

```sh
node scripts/ai-batch.js \
  --pool documentation/corp-ai-regression/assets/beginner-pool.json \
  --seeds 1-200 \
  --out bench/pr-12-candidate.json

node scripts/ai-batch.js \
  --compare bench/current/baseline.json bench/pr-12-candidate.json
```

Replace `pr-12-candidate.json` with the ticket/PR and revision being tested.
Keep reports in the ignored `bench/` evidence folder. The saved benchmark
JSON is local evidence; it is not included in a fresh clone. Preserve/back up
that file rather than overwriting it with a new run.

The historical corrected-default benchmark was run on **2026-10-05**, at clean
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
`valuelessServerDebtReset`. PR #18 removes `evidenceBasedHostedCardRez`
after its failed acceptance gate; the other five options still default to false.
The command above uses the candidate's defaults;
check its report's effective options against the current baseline and explain any
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

The historical benchmark tracks cumulative changes. Compare new PRs against
`bench/current/baseline.json`, the accepted current-main baseline. If that
report does not represent the PR's target main build, also run the same command
on its target main commit with a distinct output such as `bench/pr-12-main.json`,
then compare that report with the candidate. This screen
supplements the full regression suite and any ticket-specific strategic gate.
See the [completed investigation handoff](corp-ai-regression/gated-fix-handoff.md)
for the evidence and remaining scoring deficit against the historical H0 build.

### Fresh main-versus-checkout timing comparison

```sh
node scripts/compare-ai-main.js --pool startup-v1
```

This runs local `main` first in a temporary detached worktree, then the current
checkout including uncommitted changes, then prints the paired comparison,
including decision latency. Both runs use seeds 1–200 and the same worker count.
It does not switch the current checkout, fetch main, or replace accepted baselines.
Reports are retained in `bench/pools/startup-v1/paired-main/<unique-run>/main.json` and
`candidate.json`; the temporary main worktree is removed after success or failure.
The deck pool and precons must match main, otherwise the command stops before
playing games rather than compare different inputs.

Use `--jobs 4` to pin concurrency. `--seeds 1-3` permits a small diagnostic run;
it is not a full acceptance benchmark. Use `--pool <id>` with the top-level `id` of any pool JSON file in
`tests/fixtures/ai-batch/`, such as `startup-v2`, `startup-v3`, or `standard-v1`.
Omitting `--pool` selects `beginner-v1`; reports are grouped under
`bench/pools/<pool-id>/paired-main/`. Sequential runs reduce stale-baseline
machine-load differences; changing load between runs can still affect timings.

### Refreshing the accepted baseline after a merge

Both `refresh-ai-baseline.js` and `compare-ai-branch.js` default to the beginner
pool. Use `--format startup` to select the existing startup
pool at `tests/fixtures/ai-batch/deck-pool-startup-format.json`:

```sh
# On the clean, committed target main build:
node scripts/refresh-ai-baseline.js --format startup
# On the candidate branch:
node scripts/compare-ai-branch.js --format startup
```

Startup uses `bench/startup/current/baseline.json` as its current benchmark,
`bench/startup/<branch>.json` for candidate reports, and
`bench/startup/archived-current/` for archives. Its staging report and refresh
lock also live under `bench/startup/`, independently of beginner runs. Both
formats use five deck pairs and seeds 1–200 (1,000 games). A missing startup
baseline must be refreshed on the target main build before comparing; the
comparison never falls back to beginner. `--format beginner` explicitly
selects the default paths described below.

After merging an accepted gameplay change, run this on the clean, committed
merged build:

```sh
node scripts/refresh-ai-baseline.js
```

The script runs the five-pair pool with seeds 1–200 and writes
`bench/baseline.json`. Once the report contains 1,000 games, zero failures and
a clean-build marker, it copies the previous current baseline into
`bench/archived-current/<archive-time>-<commit>.json`, then moves the new report
to `bench/current/baseline.json`. The historical `bench/corp-options-default.json`
is preserved. A single dated JSON filename already in `bench/current/` is
also supported; more than one report there is rejected as ambiguous.

If the run fails or the report is rejected, the previous baseline stays in
place. Any new `bench/baseline.json` is retained for inspection; move it aside
before retrying. The script also refuses to overwrite an existing report at
that staging path. Concurrent refreshes are blocked by
`bench/.baseline-refresh.lock`; if the process is forcibly terminated, remove
that lock only after checking no refresh is still running.

Refreshing records a change already accepted in review; it does not decide
whether a candidate should be accepted. A Runner fix can legitimately lower
Corp win rate. Record the merged commit, results and reason for the baseline
change in the PR or ticket. Reports in `bench/` remain local, ignored evidence
and should be backed up.

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

To replay one game from a report in detail, use `ai-batch.js replay` (see
"Reading why a result moved"); it reproduces the report's game exactly.

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
  exceeds `n` or lacks a finite measurement, including failed games. An empty
  batch fails too. Use this for conditions that must always hold rather than
  on average.
- `--guard <metric>=<tolerance>` and `--improve <metric>` also accept pooled
  collector metrics. They recompute the statistic on matched successful games
  and shared game-index bootstrap draws. A guard requires the oriented paired
  interval's lower bound strictly above `-tolerance`; an improvement requires
  it strictly above zero. Thresholds use unrounded values. Missing samples,
  undefined statistics or any invalid bootstrap draw fail the check.
- `--ceiling <metric>=<n>` checks a batch-level metric (a collector's
  `finishBatch`; see "For agents adding a metric"): it fails unless the
  candidate's 95% interval upper bound is at most `n`.
- `--no-worse <metric>` compares measured batch values, requiring candidate
  at most its fresh matching baseline. Both arms' intervals are printed for
  context; this is an exact measured-value rule, not a paired confidence-bound
  guard or evidence of statistical non-inferiority. Missing/nonfinite values
  or intervals and empty batches fail. Use it only when the source gate
  explicitly requires this statistic. L8.5 now retains correlation as a
  diagnostic under its owner-approved post-result gate redesign.

Pooled guards and improvements print matched baseline/candidate values, their
paired difference and 95% interval, direction, resample count and dropped pairs.
Other collected batch metrics print both arms' separate intervals, even without
`--ceiling` or `--no-worse`. Metrics without an acceptance check are labelled
`[diagnostic]` and do not affect the gate result. Absolute ceilings and measured
no-worse checks keep using the original separate-arm report statistics.

Every ticket's gate is written in one fixed form with exactly one flag per
row; see [ai-planning.md: Writing a gate](ai-planning.md#writing-a-gate).

A full gate is 2,800 games, about 15 to 20 minutes. The baseline half is
cached: running a second gate on the same code reuses it, and so does a
matching committed baseline. The cache key covers the code of every loaded
file, so any code change plays a fresh baseline. If you ran a pending gate
yourself, paste the output into Codex with `$implement-ticket <ticket>`. It
records the result and switches the option on only if the output says
`Gate: passed`.

Add `--fresh` to a `gate` command to replay both baseline and candidate,
bypassing local and committed report caches. The new reports are written to
the normal local cache. This keeps the same pool, options and seeds, so game
results should repeat; it does not draw a new sample. Use `--seeds 201-400`
(or another range) for a different paired sample, and `--pool <file>` to
select another deck pool.

`--quick` plays 50 seeds per pair (about 5 minutes) and marks the result
"indicative only". It can never pass a gate, but it is how a ticket proves its
gate is ready to run: the quick run completes, and its first line reports at
least one game changed by the options. The command exits non-zero so it cannot be mistaken for a pass.

### Reading why a result moved

Averages say whether an option helps; single games show how. To read one,
pick a pair and seed from the report and replay it:

```sh
node scripts/ai-batch.js replay --pool documentation/corp-ai-regression/assets/beginner-pool.json \
  --pairs pd-tao --seeds 2 \
  --start tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt \
  --corp-option <option>=true --diff
```

Use the report’s `--pool` value when it used a non-default pool, along with
its pair, seed, start and AI options.

`replay` plays exactly the batch's game (same seed streams, sets and start;
its `logHash` matches the report) and prints the full log, which the report
does not keep. `--diff` plays it with every option off and as given and
prints only the differing lines, so the first hunk is the decision the
option changed. It takes a few seconds. Later hunks usually diverge into a
different game, so read the first hunk for the cause, and the report's
averages for the effect.

For more than one game, use a batch (`--seeds 1-2 --out`), which runs in
parallel with the stall watchdog. Do not write scripts that call
`playGame()` in a loop: they run one game at a time, keep only the last 200
log lines, and print nothing until they finish.

### Comparing two reports by hand

```sh
node scripts/ai-batch.js --corp-option <option>=true --out on.json
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

### Building a start board

Gate start boards live in `tests/fixtures/ai-batch/starts/` and are built
from real logs, never by hand. Source logs must be trusted: the builder
executes their board statements in the headless engine. The VM is not a
security boundary, and the game timeout does not bound synchronous source
execution. Restricting imported statements is tracked in
[start-board-import-executes-source-code.md](backlog/start-board-import-executes-source-code.md).

```sh
node scripts/start-board.js <log> --list
node scripts/start-board.js <log> --dump --out <name> \
  --unsteal 35038=0 \
  --replace 35042=30072 --reason "Scatter Field's subroutine crashes the Corp AI" \
  --setup "corp.creditPool=12; runner.creditPool=0" \
  --note "what the board is for"
```

- **Source:** `--snapshot <n>` (a decision snapshot from `--list`, the board
  at the decision) or `--dump` (the end-of-log dump). One is required; use a
  snapshot when the log has one.
- **Edits:** only these, each recorded as a `NOTE` line ending in its flag:
  - `--replace`, with a `--reason`: only for a card that crashes the engine
    or is outside the pool's sets. Never the Runner's rig or a hosted card.
    Replaced installed ICE is named in the note.
  - `--unsteal` / `--unscore`: restore an agenda taken at the decision.
  - `--setup`: credits and clicks only.
  - `--note`: a description.
- **Tags:** the builder loads the board and writes `// TAGS:`
  (`hosted-card-on-ice`, `unrezzed-ice`, `breaker-installed`,
  `agenda-in-remote`, `tagged-runner`). A new tag goes into
  `scripts/start-board.js` in the change that first needs it.
- **No hand edits:** `tests/start-board.test.js` rebuilds every committed
  board from its recorded flags and fails if it differs.

To check that a board reaches the decision an option changes, replay one game
with `replay --diff` (see "Reading why a result moved"); the first differing
hunk should be that decision.

### Selecting boards and fixing the cost

```sh
node scripts/ai-batch.js gate --corp-option <name>=true \
  --start-tag hosted-card-on-ice --start-tag agenda-in-remote --budget 1400 ...
```

`--start-tag` (repeatable) selects every board whose tags include all those
given. `--budget <games>` gives every board and pair the same seeds 1 to
`max(10, floor(games / (boards × pairs)))`. So a board gate always plays
about 1,400 games per half, about 8 minutes each, however many boards match.
Without `--budget`, each board gets the full 200 seeds per pair.

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

**Batch-level metrics.** Some metrics only exist over the whole batch (a
correlation pooled over every decision, for example). Such a collector also
exports `samples(game)`, whose JSON value is kept in each game record as
`samples.<name>`, and `finishBatch(perGameSamples)`, which returns a number
or an object of numbers. The report's `batchMetrics` holds each one as
`{value, low, high, games}`: the interval resamples games (decisions within a
game are not independent), `batchResamples` times (default 200) with a seeded
stream. An absolute `--ceiling <metric>=<n>` passes only when the candidate's
interval upper bound is at most `n`. `--guard` and `--improve` instead recompute
both arms on matched successful games using the same sampled game indices;
these check a paired difference interval, never separate interval endpoints.
Collector `directions` or `--better` must declare higher/lower. Per-game metrics
retain precedence when a requested name is present in game metrics.

For paired checks, samples must be present in every retained game and contain
no nonfinite numbers. A cohort consisting entirely of empty arrays/null samples
is missing data. `finishBatch` must return consistent nonempty numeric columns,
all finite on the original cohort and every draw. The optional
`validateBatch(perGameSamples)` must return exactly `true` for usable data, or a
reason string (other results fail). Use it whenever a numeric result could mask
an undefined statistic or insufficient coverage. The correlation collector
validates its columns and requires at least one defined outcome/public-variable
correlation: constant columns are ignored individually, but an entirely
undefined maximum cannot pass. The validator runs on both original cohorts and
every resample; invalid draws fail the whole comparison rather than being
silently omitted. Keep validators and statistics pure and independent of game
state and policy randomness. `batchResamples` is a positive integer (default
200); the paired bootstrap uses its own fixed seeded stream. Separate-arm
report diagnostics, ceilings and measured no-worse checks retain their existing
semantics, including diagnostic correlation zeros. [collectors/bluffSingleVariableCorrelation.js](../scripts/ai-batch/collectors/bluffSingleVariableCorrelation.js)
is the example.

**Baseline-only precision calibration.** An identical-policy, matching-seed
comparison is an identity sanity check; it does not estimate independent-cohort
noise. `calibrateReports(first, second, collectors)` in
[scripts/ai-batch/calibration.js](../scripts/ai-batch/calibration.js) is a separate
API for two baseline reports with matching pool hash, starts, collectors,
effective options and code hash, and disjoint seed cohorts. Resolve collector
definitions from the trusted repository; never execute definitions embedded in
reports. It independently resamples successful games within each
`(fixtureId, deckPairId)` stratum, retaining each arm's original stratum game
counts, and recomputes the pooled statistic. Both arms must have the same
successful strata. It reports independent-cohort differences/intervals, cohort
sizes and failures; it returns no adoption verdict. Consumers must account for
cohort-size/composition differences and preregister their coverage, sample sizes
and margins. Calibration evidence belongs to each consumer; F11 chooses no
margin. Adoption `gate` and `--compare` still require matching seeds and retain
the changed-option-effect check. Disjoint reports must never be routed through
an adoption gate as matched observations.

**Posture events.** The Corp AI's bait, agenda-bluff and profile decisions
reach collectors as `posture` events (`kind` `bait`/`bluff`/`profile`,
`action` `roll`/`reuse`/`guard`/`profile`, `cardId`, `epoch`, `postured`,
`isAgenda`, `reason`, `expired`, `corpTurn` and the public variables in
`publicVars`), emitted through `CorpAI._postureTelemetry`, which the harness
sets only when observing a game.

Profile events include the opaque `cardId`; active roll events attach an
already-cached profile without creating one. The harness marks hypothetical
events explicitly. `postureShapeByCardClass` measures the initial requested
shape of each actual active commitment, separately for agendas and traps.
Profiles may precede or follow the first activation roll; cached shapes on later
rolls cover refreshes. Reuse and hypothetical events add no sample. Actual
later protection changes are measured by F12, not substituted for initial
profiles. Its pooled `tv` is total variation over depth/advancement/delay bins.
It fails closed with fewer than ten known commitments or five contributing
games per class, below 90% known shapes in either class, or an invalid bootstrap
draw. It declares `metricNames` for strict reporting; collector loading checks
that declaration before workers start.

L8.5 also emits `kind: weights`, `action: weights` events containing the
twelve scripts' ids, multipliers and normalized probabilities, with an initial
observation after `gameStart` and subsequent observations on feedback updates
and candidate profile selection. `postureScriptWeights` records per-script
minimum/maximum weights and probabilities and counts absolute-bound, floor,
normalization and movement-above-0.02 violations. Missing weight telemetry
also fails this invariant check. Movement is measured between observations;
this collector does not count exposures or prove telemetry completeness.
The deterministic feedback tests verify one matching observation per
settled exposure and the actual per-exposure multiplier change. Weight observations consume no randomness and are excluded from
the existing correlation collector's posture/profile choice samples.

## Realized defense measurement (F12)

Select `--collector realizedIceByRootType` to observe every remote agenda or
declared trap (`Ambush` or an `AIPunishesAccess` function, without calling it).
Agenda classification takes precedence. A dedicated passive snapshot runs once
per Runner turn at the first action phase, after turn-begin responses settle.
It does not use the security snapshot or any policy evaluator. Harness truth
never feeds AI decisions, and no hidden Runner identities are read.

Samples retain stable server/root IDs, a new commitment ID for each install,
actual integer ICE count, revelation, multi-root status, age, cached script,
horizon expiry and last observed safety-query status. Roots on a start board
are left-censored, with unknown installation age. Committed movement wrappers
capture leaves/reinstalls even within one main-loop step; hypotheticals are
excluded. Safety stops take precedence over cached scripts. Expired commitments
are separate from active ones; a cache without an observation in the current
installation remains unknown. `allowedAtLastQuery` does not claim current
safety. No activation record means `unrolled`: the AI has not selected a
deception commitment, including before its first query. This does not establish
safety, which remains unknown without evidence. A cached record without usable
query/event evidence remains unknown rather than being treated as neutral.
Tracker/collector errors invalidate observations while gameplay
continues.

Passive wrappers retain returns of bait/bluff queries the AI already made;
they never initiate a query. This includes silent eligibility/severity failures
and lifetime reuse without an event. Newer guard events override older query
evidence; a later successful query can clear an obsolete guard. Cached positive
scripts become unknown when current structural eligibility, root count or the
latest observed return contradicts activity. Samples retain that return and
root-count context separately. The observer also works without posture-event
telemetry, leaving unobserved safety unknown rather than enabling telemetry on
the AI just to fill labels.

### Install and lifecycle attribution (L8.9)

The same F12 observer now captures install-time defense and decision evidence;
this is passive instrumentation, not an adopted parity policy. The observer
switch controls these records along with snapshots. `observeInstallDecisions()`
wraps actual Corp helper returns in the harness, while a small internal
`_installAttribution` callback reports each already-returned `AIWorthInstalling`
result from the ranked and economy paths. This callback is not a card hook.
It never invokes a hook, security evaluator, posture query or profile generator
for measurement, and never sorts options or changes their objects.

`realizedDefenseLifecycle` now includes harness-only `rootType` labels and:

| Action | Added evidence |
| --- | --- |
| `install` | `iceCount` at the committed move, `requestedIceCount` before the install request, `observedIceCount`, revelation/multi-root/posture/safety labels and `placement` |
| `leave` | Original commitment and install metadata; departure is distinct from a settled destination |
| `endpoint` | Settled fate: scored, stolen, overwritten, trashed, returned, moved/reinstalled, game end or unknown; departure and settlement turns are separate |

For pre-existing start-board roots, the original install count and request are
null, while `observedIceCount` describes the start board. Original placement is
not reconstructed. Overwrite requires both a replacement request and its
committed root; unresolved locations stay unknown rather than being invented.

`placement` distinguishes actual legal engine selection, command preference,
a matching prior ranking, and unknown. A matching prior ranking is supporting
context, not proof that ranking selected the install. Records carry the
requested destination (zero denotes a prospective new remote), decision/choice
IDs, chosen rank/reason when observed, observed hook output/destination pool,
HVT classification when queried, actual offered preferences and alternatives.
Destination evidence distinguishes membership in the legacy empty protected
pool, queried scoring eligibility and actual legal choices. Protection
assessments retain their caller flags and are Corp-known assessments, not
Runner-visible strength or a claim that the last score decided placement.

Comparator inputs are captured only when the comparator actually called the
helpers. Never-compared singleton options keep explicit unknown inputs;
Infinity, negative Infinity and NaN export as strings. Actual comparator
windows can be zero for a destination outside the scoring-server list. The
reported rank is the preference's position in the final legacy list, including
higher-priority hook choices; observing comparator inputs does not imply those
inputs determined a higher-priority hook choice. Direct command choices retain
unknown inputs rather than replaying their evaluations.

`realizedDefenseChange` records each ICE addition/removal once per server,
with the commitments sharing that defense, and deduplicated observed posture,
safety or epoch transitions. A cached initial state is labelled as initial;
unrolled, unknown, expired and stopped states remain distinct. These records
never trigger posture evaluation. Query evidence is captured only after the
real query returns and carries the current game turn.

Per-game samples retain `lifecycle` and `changes`. The collector's
`batchDiagnostics.realizedIceByRootType.attribution` reports installation
histograms/TV, a separate unrevealed population, deck breakdowns, route/posture/
safety/multi-root counts, endpoint ages, server allocation totals and root-age
exposure to those allocations. Root change exposure can count a shared layer
for several roots; it is explicitly not a count of independent allocations.
Reports captured before the PR #65 review fix omit the first ICE addition when
ICE creates a new remote. Their server allocation totals undercount additions;
offline analysis cannot recover the missing events. This omission does not
affect root exposure for those ICE-only remotes, which have no commitments.
Unknown placement and left-censored coverage remain visible. The global installation-TV
interval describes unrevealed installs; per-deck installation distributions and
intervals include revealed installs as diagnostics. All 95% intervals resample
whole games within deck pairs, including games with no
qualifying install; insufficient classes or any invalid draw invalidate the
interval. These descriptive intervals do not replace F11's paired adoption
gate or establish a causal mechanism. Existing four headline metrics, their
coverage rules and their game-clustered inference are unchanged.

`node scripts/ai-batch/install-defense-summary.js <report.json> [...]` provides
offline L8.9 diagnostics from saved observer-on reports. It emits JSON with source
SHA-256 hashes, per-class/deck/route counts, last-snapshot distributions, actual
ICE-change exposure, posture splits, hidden age bands and lifecycle endpoints.
Its `install-defense-analysis.js` implementation rejects duplicate games,
mismatched report provenance and missing/invalid F12 samples. It resamples whole
games within deck-pair/fixture strata for 2,000 deterministic percentile draws;
games without relevant roots remain in the sampling population. Descriptive
intervals require five contributing games and no denominator-empty draws, without
replacing F12 gate readiness. Last look is one snapshot per observed commitment;
age-band rows retain repeated exposures. Game end is right censoring, endpoint
age uses departure rather than settlement, and actual ICE additions differ from
net gain at last look. Shared-root additions are exposure, not independent layers.
Zero-event bootstrap intervals do not bound unseen population events. Saved
`other` lifecycle rows lack asset/upgrade identity; routes cannot recover that
split. This tool neither plays games nor supplies alternative adoption metrics.

### Using install observations in the I tickets

L8.9 delivers passive measurement; it owns no installation restriction. I3 owns
remote roles and displaced scoring value, I4 owns agenda install/hold choices,
and I5 owns asset/trap install/hold choices. Their specs must use these tools
when investigating those choices, then choose their own policies and gates.
I3.1 supplies future read-only deck-plan evidence, not a prerequisite for using
the observer and not an implemented strategy selector.

**Collect on the consumer's current baseline.** When a consumer's experiment is
authorized, add these flags to its own batch/gate commands:

```sh
--defense-observer on \
--collector realizedIceByRootType \
--collector bluffSingleVariableCorrelation \
--collector installOutcomes
```

Record effective options, pool/source hashes, starts, seeds and failures. Use
current matched baseline/candidate arms for policy comparisons; do not treat
L8.9's old control reports as a matching baseline after a prerequisite changes.
Changing measurement itself requires focused coverage and observer identity.
No new L8.9 cohort is requested by this recipe.

**Analyze each arm offline.** For the saved successful L8.9 control cohorts:

```sh
node scripts/ai-batch/install-defense-summary.js \
  bench/L8.9-aac6ea9-attribution-v2/on-1-200.json \
  bench/L8.9-aac6ea9-attribution-v2/on-201-400.json > /tmp/install-defense-summary.json
node scripts/ai-batch/defense-attribution.js \
  bench/L8.9-aac6ea9-attribution-v2/on-1-200.json > /tmp/install-routes.json
```

For consumer work substitute that arm's saved reports. The summary rejects
mixed code/options/pool provenance; analyze baseline and candidate separately,
not as one cohort. It reports failed-game counts and uses successful whole
games only. Route attribution also uses successful games; consult the original
report's failures and the summary's coverage instead of inferring completion
from a route table. Neither diagnostic grants adoption. F11/F12 comparisons
remain the authority for the consumer's preregistered paired gate.

| Question | Existing evidence to inspect |
|---|---|
| Which destination was offered/selected, and why? | `samples.realizedIceByRootType.lifecycle`: install `placement`, request/commit ICE counts, eligibility, ranks, observed hook/comparator results; unknown inputs stay unknown |
| Did protection arrive later or get removed? | `changes`: per-server ICE changes and sharing commitments; summarize root exposure separately from independent server layers |
| Did scoring, access or survival change the sample? | Settled `endpoint` events; age bands, revelation, censoring and single/multi-root splits in the summary |
| Did installs pay off or trigger traps? | Existing `installOutcomes` payoff, scoring, exposure and trigger metrics; these are outcomes, not access probabilities |
| Did the agenda/trap defense association change? | F12 all/postured count distance and correlation, per-deck class/game coverage; public-variable roll correlation from `bluffSingleVariableCorrelation` |

Useful regressions to extend: `tests/L8.9-install-defense-attribution.test.js`,
`tests/realized-defense.test.js` and `tests/corp-install-decisions.test.js`.
Observer/collector changes also use `tests/integration/realized-defense.test.js`.

**Shell/asset-spam and holding limits.** An unprotected remote can be a deliberate
cheap/disposable deployment. Do not infer a bad choice from zero ICE, or demand
matching agenda/trap counts across different plans. Report per-deck and route
results beside pooled metrics, and establish representative shell-like coverage
or explicitly record its absence. A hybrid is not an invalid example.

Current headline snapshots cover agendas and traps; saved ordinary asset/upgrade
lifecycle records are combined as `other`, and do not reconstruct the entire
remote topology, ordinary-asset lifetimes or empty-remote creation rate. Existing
`installOutcomes` aggregates do not fill that gap. They also omit a full
denominator for held/never-installed cards, HQ entry/exit ages and deferred
opportunities. If a consumer claims effects on asset spam, holding or deployment
timing, scope and test the additional passive evidence before drawing that
conclusion. Do not reconstruct absent fields from names or pretend the stored
cohorts prove shell-plan effectiveness.

The [L8.9 calibration](corp-ai/measurements/L8.9-aac6ea9-stage1-calibration.json)
uses 2,800 versus 2,798 successful controls and retains both failed records.
Its four noise envelopes are baseline-specific and broad; they are not universal
I3/I5 tolerances or proof of acceptable strategic harm. The
[delivery ticket](backlog/code-review/L8.9-observable-defense-parity.md) links the findings,
full historical analysis and limitations.

`defense-guard-calibration.js <on-1-200> <on-201-400> <on-401-800> <output.json>`
is L8.9's Stage 1 control-only consumer of F11 calibration. It validates complete
observer-on controls, rejects failures/duplicate games/overlapping cohorts and
checks matching policy/pool/options before combining seeds 1–400. It compares
that cohort with 401–800 using unchanged F12 definitions. Its preregistered guard
rule is the larger absolute endpoint of the independent 95% difference interval,
rounded upward to six decimals. These noise allowances do not establish acceptable
strategic harm. The saved result contains input SHA-256 hashes, point statistics,
intervals and frozen margins. It also prints paired win-rate sample-size planning
scenarios; those require an assumed candidate/control Corp-win discordance rate,
which unchanged controls cannot estimate. This script runs no games or policy.

Failure exclusion is opt-in: `--complete-case` accepts fully accounted-for failed
games only after an explicit scope decision. Every scheduled key must still be
present; `games` and `failures` must agree, and successful samples must remain
valid. Failed records stay in the merged report and are passed intact to F11,
which excludes their whole-game samples from bootstrap draws. The result records
`failureTreatment`, `scheduledGames`, successful `games`, `droppedGames`, failed
records and per-stratum scheduled/successful/failed counts. It estimates the
successful-game population conditional on completion; it does not prove that
missingness is harmless. The default still rejects any failure. This exception
neither permits replacement games nor changes paired policy-gate failure handling.

The four lower-direction pooled metrics are absolute Spearman
`allCountCorrelation`/`posturedCountCorrelation` and total-variation
`allCountDistance`/`posturedCountDistance`. Headline observations are unrevealed
roots; postured observations have a known active commitment. Counts use exact
nonnegative integer bins. TV is one half the sum of per-bin absolute differences
between normalized agenda and trap distributions: identical distributions give
zero, disjoint support gives one. Signed rho, histograms, class prevalence and
root/commitment/server/game coverage are in `batchDiagnostics.realizedIceByRootType`,
along with revelation, deck pair, age, multi-root, posture/safety breakdowns and
first-observation-per-commitment diagnostics. Repeated roots and shared servers
are clustered by game, not treated as independent evidence. These statistics
do not establish causal allocation or absence of other tells.

Readiness rules are frozen in the collector: ten distinct commitments and five
contributing games per class in each population, and at least 90% known posture
labels in the unrevealed population. Repeated draws of the same original game
do not manufacture coverage. Missing classes, undefined correlations and
observation errors fail closed. TV can be diagnostically zero when rho is
undefined; rho fails closed while TV can retain a valid comparison interval.
The optional trusted collector `forMetrics(names)` view validates only requested
columns without changing their sample name or definitions. All original
cohorts and every bootstrap draw must validate. Invalid draws invalidate the
whole interval; none are replaced by zero or discarded. Separate-arm F12
diagnostics opt into `strictBatchDiagnostics`, reporting null interval bounds,
reasons and invalid-draw counts. Legacy collectors retain their diagnostic
semantics. Pooled F11 `gate`/`--compare` reconstruct all four metrics from these
samples with the existing matched-game and option-effect requirements.

For observation identity only, `--defense-observer off|on|throw` controls this
harness observer without changing AI options. Its value is recorded and part
of cache provenance; default is `on` when this collector is selected. The `throw`
mode injects observer failure for deterministic tests. Disabled or failed
observations cannot pass measurement checks.

`node scripts/ai-batch/defense-evidence.js --jobs 3 --out .ai-batch-cache/f12-2306f82`
collects the preregistered full committed pool: observer off and on on seeds
1–200, then a second on cohort on seeds 201–400, all with current default
options. It checks winner/turn/log/decision identity, same-seed statistical
identity, and F11 independent, deck-pair-stratified control calibration. It
writes raw batch reports and `evidence.json` with commands, report hashes,
effective options, class/bin coverage and validity/precision limits. `--reuse`
recomputes the evidence from those three existing reports without playing games.
Calibration may be insufficient; that is reported explicitly and supplies no
adoption verdict or consumer tolerance. Plug-in TV has finite-sample bias;
class/bin counts and independent-cohort widths expose its limits, without a
debiasing or human-exploitation claim. Any expanded sampling/starts must be
preregistered separately. Refresh controls after prerequisite policy changes.

The [recorded F12 control calibration](corp-ai/measurements/F12-2306f82-control-calibration.json)
passes all 1,400 observer-identity pairs. All-root TV is 0.207788/0.232917 and
absolute rho 0.224065/0.256823 for seeds 1–200/201–400. Postured statistics are
insufficient: known posture coverage 85.7705%/85.3816% is below the frozen 90%
rule. The second cohort has one independently reproduced observer-off/on
stall (BTL/Kit seed 257); calibration retains failure evidence and uses 1,399
successful games with that stratum's reduced count. No consumer margin or
policy adoption follows from this calibration. Lifecycle totals include all
tracked remote root cards; metric class counts cover agendas and declared traps.

## Install-series collectors and baselines (I0)

Corp roadmap I0 added these observation-only collectors. Every metric is per
game, and the report gives its mean over games. A single number is reported
under the collector's own name.

| Collector and metric | Meaning | Better |
|---|---|---|
| `installOutcomes.installToScoreTurns` | Mean turns from installing an agenda to scoring it, over agendas installed and scored this game; 0 if none | lower |
| `installOutcomes.agendaExposureTurns` | Mean Runner turns begun while an agenda installed this game was on the board, over those agendas; 0 if none | lower |
| `installOutcomes.assetNetCredits` | Credits gained from assets installed this game (`GainCredits` with the asset as source, `TakeCredits` from it) minus credits paid to rez them | higher |
| `installOutcomes.trapTriggers` | Times an installed Ambush card's ability was triggered | higher |
| `installOutcomes.abandoned` | Root cards that left the board through a trash outside a breach without ever being used or producing credits | lower |
| `installOutcomes.agendasInstalled` / `agendasScored` / `agendasStolen` | Agenda counts behind the means above | none / higher / lower |
| `installOutcomes.assetsInstalled` / `assetsTrashedBeforePayoff` | Assets installed, and assets trashed before paying off (credits covering their rez cost, or used if they produce no credits) | none / lower |
| `installOutcomes.upgradesInstalled` / `upgradesUsed` | Upgrades installed, and those used or producing credits | none |
| `successfulRunsByServer.hq` / `.rd` / `.archives` / `.remote` | Successful Runner runs | lower |
| `corpInsolventTurns` | Corp turns that began with 0 credits, or fewer than the cheapest printed rez cost among its installed unrezzed ICE | lower |
| `stallTurns` | Corp turns whose every main-phase action was the basic credit action although HQ held an ICE, agenda, asset or upgrade, or an operation whose printed play cost the Corp could pay (play restrictions are not modelled) | lower |
| `unusedCreditsAtEnd` | Corp credits at game end | lower |

`installOutcomes` follows only root cards installed during play (a start
board's cards are ignored until they leave and are installed again), from
the headless runner's `install`, `leave`,
`cardUsed`, `cardCredits` and `rez` events; passive effects (an upgrade that
never triggers an ability) do not count as use. Each reinstallation is a
separate commitment with its own fate, exposure, use, credits and rez costs;
card events outside a tracked installation are ignored. Empty observations
are 0 for the means, so read them with the counts beside them.

The corrected install-series baseline, with all five 2026-10-05 recovery
options off (they are recorded in the report's `options`), is
[`tests/fixtures/ai-batch/baselines/core-v1-64507f63a8bb962a.json`](../tests/fixtures/ai-batch/baselines/core-v1-64507f63a8bb962a.json) (commit 1f64f5d, clean tree, 7 pairs x 200 seeds, no failed games). It was produced with

```sh
node scripts/ai-batch.js --collector corpInsolventTurns --collector installOutcomes --collector stallTurns \
  --collector successfulRunsByServer --collector unusedCreditsAtEnd --out <file>
```

That report predates the PR #34 reinstallation fixes: its `installOutcomes`
metrics can undercount repeated installations and misattribute their fates or
payoff. Keep it as historical evidence; comparisons using these metrics need
a matching control generated with the corrected collector and tracker.

A later item that needs another collector back-fills it by re-running this
command with that collector added, at its own base commit. The baseline's
`codeHash` changes with the code, so a later gate reuses it only while the
code is unchanged; otherwise prepare a matching control as the install design
note says.

Install-decision snapshots for the same baseline are in
`tests/fixtures/corp-install-baseline.json`: for every green fixture in
`tests/fixtures/corp-decisions/` that offers `install`, the choice and the
recorded install notes. They are not part of the test suite. Compare the
current code with `node tests/corp-decision-fixtures.test.js --install-snapshots`
(it lists changed fixtures and exits non-zero); an item that intends changes
lists and justifies each delta, then rewrites the file with `--write`.
The same command also compares the I1 candidate records (the
`installCandidates` notes) with `tests/fixtures/corp-install-candidates.json`,
kept in a separate file so the I0 baseline above stays unchanged.

## Security calibration collector (L9.0)

`securityCalibration` measures how well the Corp's security verdict predicts
breaches. When it is selected, the headless runner emits one
`securitySnapshot` event per Runner turn, at the first step of that turn
where the Runner has clicks. The event records today's verdict (`isSecure`)
and the honest one (`honestIsSecure`, see
[architecture: server security evaluation](corp-ai/architecture.md#server-security-evaluation))
for HQ, R&D, Archives when it holds cards, and every remote with root cards.
It reads them through the uncached evaluator, so neither the security cache
nor `evaluatorCallCount` moves. A server counts as breached when a
successful run on it (run events carry `serverName`) happens before that
Runner turn ends.

| Metric | Meaning | Better |
|---|---|---|
| `securityCalibration.<verdict>.<scope>.secure` / `.insecure` | Server-turns judged secure / insecure | none |
| `securityCalibration.<verdict>.<scope>.secureBreached` / `.insecureBreached` | Of those, server-turns breached that turn | none |

`<verdict>` is `current` or `honest`; `<scope>` is `all` or `agendaRemote`
(remotes holding an agenda). The metrics are per-game counts. The pooled
breach rate of a group is `mean(secureBreached) / mean(secure)`, not the mean
of per-game rates.

## I2 stranded ICE collector

`--collector strandedUnrezzedIceCost` reports
`strandedUnrezzedIceCost.credits` (lower is better): per game, the credits the
Corp paid installing ICE that was never rezzed afterwards, whether it stayed
unrezzed to game end or was trashed or returned unrezzed. It reads two
observation-only events from the headless runner: `iceInstall` (a Corp
`SpendCredits(..., "installing", ice)` payment, with the card's tracker `id`
and `cost`) and `iceRez` (a completed ICE rez: `Rez(card, true)`, which both a
paid rez and a free rez reach). A rez clears every install payment recorded
for that card. ICE already installed on a start board paid nothing here, so
its rez is ignored. Neither event calls engine functions or changes play.

`--collector iceInstallsByServer` is a diagnostic (no gate direction): per
game, completed Corp ICE installs by destination kind (`hq`, `rd`,
`archives`, and remotes by harness-true root: `agendaRemote`, `trapRemote`,
`otherRemote`, `emptyRemote`), each with `count`, `firstTurn` (0 if none),
summed printed `rezCost` and `strength`, plus `thirdLayerOrDeeper`. It reads
the `iceInstalled` event, emitted when Corp ICE is first seen on the board
between engine steps (ICE on a start board is marked at game start without an
event; ICE moved between servers is not a new install).

## R&D allocation investigation probe (I2.2)

`node scripts/ai-batch/rnd-protection-probe.js <pair> <seed> <true|false>`
replays one committed-pool game with the specified `iceMarginalSecurity`
setting. It records turn-1/2 install rankings, Corp-held ICE and credits,
already-returned layer admission and affordability lists, and the marginal
stake, before/after hazards, costs and scores. It calls each wrapped method
once and adds no evaluator, card-hook or random calls. Its JSON also includes
completed ICE installs for the whole game and log/decision fingerprints.
`--plain` omits the probe for identity comparison in a separate process.
Scripted measurement checks live in the fast batch suite; the integration
suite compares choices, logs and installs with observation on/off under both
policies. This is diagnostic tooling, not an adoption gate.

For current-default I2 replay diffs use
`node scripts/ai-batch.js replay --pairs <pair> --seeds <seed> --corp-option iceMarginalSecurity=false --diff`.
The CLI's baseline is the current defaults (I2 **on**); its candidate is I2
**off**, despite the printed baseline label saying “options off”. Reverse
the interpretation when describing historical off-to-on effects.

## Checking the F3 security cache

`node scripts/ai-batch.js security-cache-gate --games 200 --jobs 8 --out /tmp/chiriboga-f3-gate`

This behaviour-identical comparison plays the complete committed pool at the
same code with the cache off, on, and on with every hit recomputed and verified.
It writes `off.json`, `on.json` and `verify.json` in the output directory.
The passive `evaluatorCallCount` collector counts requests and computations
inside main-phase command decisions. The command requires identical ordered
choice digests and full game-log hashes in all arms, no failed/missing games,
at least 50% fewer computations per main decision, and a nonpositive upper
bound of the paired 95% latency-difference interval. `--quick` is diagnostic
only. The strategic option `gate` command requires changed games and cannot
judge this comparison.

For diagnosis, ordinary batch and replay commands accept
`--security-cache off|on|verify`; omitting it preserves the game's default.
Batch reports record the mode and the report key includes it. Measurements
and cache toggles are harness-only and do not introduce strategic AI options.
