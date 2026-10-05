# Task: find WHERE and WHY the Corp AI regressed between H0 and the harness branch

Historical v1 runbook. [Runbook v2](runbook.md) supersedes
its execution/selection rules: the owner runs batches; agents never launch or
poll them. Use the [recovery inventory](assets/README.md)
for archived tooling, exact tags and current investigation state. Phase B's
trace/collector work remains proposed, not completed.

This runbook implements the decision in
[response-plan.md](response-plan.md).
Read that document first. This is a diagnostic investigation only: do not fix,
revert or redesign Corp policy in this task.

## Background

A frozen benchmark compared the original upstream Corp AI (H0, `625b008`) with the Corp AI on the harness branch (`b52d451`), using the same engine, Runner AI, pool and seeds. Only `ai_corp.js` differed. Result (current minus original, 1,000 games per arm, paired 95% intervals):

| Metric | Original | Current | Difference |
|---|---:|---:|---|
| `pointsStolen` (lower better) | 5.675 | 6.238 | +0.563 [+0.373, +0.753] |
| `winRate` | 0.433 | 0.253 | -0.180 [-0.218, -0.141] |
| `pointsScored` | 4.264 | 2.541 | -1.723 [-1.934, -1.505] |
| `gameLength` (turns) | 14.765 | 16.575 | +1.810 [+1.314, +2.314] |

Stolen points by server (current minus original): remote -0.776, HQ +0.637, R&D +0.600, Archives +0.102. `gateway` is the worst pair (Corp win rate 0.420 to 0.095, points scored 4.895 to 1.765).

**Working hypothesis (unproven):** the newer Corp policy is more reluctant to install or advance agendas (for example the "install agenda into unsecure remote" and "HQ draw gate vs server security" changes). Fewer remote agendas means less remote theft, but agendas then stay in HQ/R&D and get stolen there, and the Corp scores less and finishes games later. Do not assume this; test it.

The owner values a Corp that beats a human player and treats win rate against the Runner AI as only a proxy. Your job is to locate the change and explain the behaviour, not to judge whether the new behaviour is desirable and not to fix anything.

## Existing assets (do not modify)

- Reports: `~/bench/orig.json` (H0 plus shim), `~/bench/current.json` (harness tip). Plan and frozen thresholds: `~/bench/benchmark-plan.md`.
- Pool: `~/bench/beginner-pool.json` (id `beginner-v1`, hash `fe8cb821d04c9dd7`; pairs `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`). Seeds 1-200 per pair, 1,000 games per run, about 2 to 4 minutes each.
- Worktrees/branches (keep): `bench-orig`, `bench-current`.
- Chassis for every new run: the harness branch `roadmap/corp_ai_finding_12_seeded_batch_harness` (`b52d451`). The engine, Runner AI (`ai_runner.js`) and harness stay identical; only `ai_corp.js` changes.
- Read `documentation/ai-batch-harness.md` and `documentation/legacy-ai-stack-validation.md` first.
- Read `documentation/corp-ai-regression/response-plan.md` first; its pause and
  resume rules are authoritative for this investigation.

Owner decisions already made during the benchmark, which a fresh session must
not ask again unless the recorded state is missing or contradictory:

- Use H0 `625b008:ai_corp.js` as the original historical control. It was
  downloaded from upstream `drbo6/chiriboga` default branch `dev` and verified
  byte-identical. The owner's differently sized gitignored
  `ai_corp_original.js` is not the historical control.
- Run the harness-tip Corp AI with its default options
  (`evidenceBasedHostedCardRez: false`).
- On H0, three `tests/ai-batch.test.js` failures are approved known
  cross-version differences: the dedicated Corp random stream and two tests
  that try to enable the later `evidenceBasedHostedCardRez` option. Do not
  change H0 randomness, add that option, or edit the tests.
- Keep all benchmark and investigation worktrees, branches and `~/bench/`
  artifacts. Never push them.

## Rules

- Throwaway worktrees and branches only (`bisect-<shortsha>`). Never push. Never touch the owner's real branches, `bench-orig` or `bench-current`.
- Commit before every run so reports record a clean tree.
- Run batches one at a time. Never read `ai_corp.js` in full (use `grep -n` and narrow ranges).
- Do NOT change any Corp decision logic. The only edits allowed in a swapped-in `ai_corp.js` are the minimal harness shim below.
- Launch each batch in the background with its output redirected to the named
  log, keep an attached supervising shell waiting for that one PID if the
  execution environment kills detached jobs, and poll that same process/log.
  Never relaunch unless no process exists and no report was written. The first
  benchmark established that a bare detached `nohup` may be killed before it
  starts in this environment.
- Do not edit thresholds or reinterpret results after seeing them. Do not change `ai-batch.test.js`; failures there are expected on older AI files.
- If a swapped-in file cannot run on the current engine (errors, no winner), do not patch it. Record the commit as "skipped: <error>" and move on.
- Ask the owner at the review points below. Ask before guessing anything unclear.
- Observation-only diagnostic scripts, collectors and harness event wrappers
  are allowed only in throwaway worktrees, applied identically to both compared
  arms, and only after proving on repeated seeds that they preserve winner,
  errors and `logHash`. They must not read hidden information or change game or
  AI state.

## The shim (apply only the parts a given file lacks)

Check with `grep -c`: `CorpAI.DEFAULT_OPTIONS`, `this.options = Object.assign`, `_choiceInner`, `DecisionSnapshots`. Preserve the file's own line endings (H0 is CRLF; some later files are LF). Use shell appends or `sed`/`printf`, not a search-and-replace edit tool.

- End of file (exact form, the harness reads it with a regex):
  ```js
  CorpAI.DEFAULT_OPTIONS = Object.freeze({
  });
  ```
- In `constructor()`: `this.options = Object.assign({}, CorpAI.DEFAULT_OPTIONS);`
- Telemetry wrapper: rename the existing `Choice(optionList, choiceType)` body to `_choiceInner(optionList, choiceType)`, and add:
  ```js
  Choice(optionList, choiceType) {
    var telemetry = typeof DecisionSnapshots !== "undefined" && DecisionSnapshots.telemetry;
    var startedAt = telemetry ? DecisionSnapshots.Now() : 0;
    var ret = this._choiceInner(optionList, choiceType);
    if (telemetry)
      DecisionSnapshots.Record("corp", choiceType, optionList, ret, DecisionSnapshots.Now() - startedAt);
    return ret;
  }
  ```

Write a helper script `~/bench/make-arm.sh <commit> <label>` that creates the worktree from the harness tip on a new branch `bisect-<label>`, writes `git show <commit>:ai_corp.js` over `ai_corp.js` (binary-safe, no line-ending conversion), applies only the missing shim parts, commits, and prints `git diff --stat` against the commit's own file so the shim size is visible (it should be a few lines). Reuse it for every point.

## Phase A: where did it regress?

Checkpoints (all ancestors of the harness tip; from [legacy stack validation](../legacy-ai-stack-validation.md)): H0 `625b008` (done, `orig.json`), H1 `6281d7e` (last `main` commit, about 6,263 lines), H2 `1361c37`, H3 `f8aa2a5`, harness tip `b52d451` (done, `current.json`). The owner's gitignored `ai_corp_original.js` is not on a known historical point and therefore cannot locate a bad interval. Do not run it during localisation. It may be run later as an explicitly unlabelled diagnostic only if the owner asks after review point A.

For each new point: make the arm, run the quick check (`node scripts/ai-game.js --corp "Gateway Corp.js" --runner "Gateway Runner.js" --seeds 1-10 --jobs 8`; every line needs a winner and an empty `errors` list; repeat Gateway seed 1 and confirm identical `logHash`), then run the full pool with default options:

```sh
node scripts/ai-batch.js --pool ~/bench/beginner-pool.json --games 200 --out ~/bench/<label>.json > ~/bench/<label>.log 2>&1 &
```

**Frozen localisation rule (write it into `~/bench/regression-plan.md` before
running H1):** the primary localisation metric is the paired change in
`pointsStolen`, where an increase is worse. Among consecutive checkpoint
intervals whose whole 95% interval is above zero, select the interval with the
largest mean increase for binary search. `winRate`, `pointsScored`, server
split and `gameLength` are supporting evidence and must not be substituted as
the selection metric after results are visible. If no single checkpoint
interval has a wholly positive `pointsStolen` interval despite the clear
H0-to-tip regression, classify the checkpoint result as distributed or
underpowered and ask the owner before choosing any interval.

**A1.** Run H1, H2 and H3. Compare consecutive points with `--compare
<earlier>.json <later>.json` (no `--improve` or `--guard` needed; read the
printed intervals): H0 to H1, H1 to H2, H2 to H3, H3 to tip. Produce a table
per checkpoint: pooled `winRate`, `pointsScored`, `pointsStolen`,
`pointsStolenByServer.*`, `gameLength`, and the per-pair values for `gateway`
and `pe-steve`.

**Owner review point A:** show the owner the table, apply the frozen
localisation rule explicitly, and identify the selected interval or report
that the deterioration is distributed/underpowered. Wait for OK before the
binary search.

**A2.** Take the interval selected by the frozen localisation rule. List its
commits: `git rev-list --reverse <good>..<bad> -- ai_corp.js`. At each split,
run the middle commit and compare good-to-middle and middle-to-bad using
`pointsStolen` as the primary localisation metric. Recurse only when one half
contains the statistically clear step. Stop when two adjacent commits straddle
the step, or after 7 runs. If both halves contain material deterioration, if
the confidence intervals no longer isolate one half, or if several checkpoint
intervals contribute, report "gradual slide, no single culprit", list the
contributing intervals and point estimates, and stop for the owner. Do not
force a binary-search answer from a non-monotonic history.

## Phase B: why did it regress?

Work on the boundary pair (good commit G, bad commit B), or, for a gradual slide, on H0 versus the harness tip.

**B1. Read the change.** `git show B --stat` and the commit message, then only B's own diff of `ai_corp.js` (if over about 300 lines, summarise by function). Say which Corp decisions it changes.

**B2. Find the first divergent decision.** The current harness has no
`ai-batch.js replay` command, and `ai-game.js` uses a different stream prefix,
so it cannot reproduce a batch report's hash. Do not use either as though it
could.

First pair the boundary reports' `gateway` games by seed. Rank seeds by this
predeclared harm score, descending, with numeric seed as the tie-break:

```text
(B pointsStolen - G pointsStolen) + (G pointsScored - B pointsScored)
```

Take the first five. Write one observation-only helper,
`~/bench/trace-batch-game.js`, which accepts a worktree path and seed, requires
that worktree's `scripts/ai-batch/headless.js`, and calls `playGame()` with:

- `streamPrefix: "<seed>:gateway"` (exactly the batch naming scheme);
- Corp `Gateway Corp.js` and Runner `Gateway Runner.js`;
- set files `sets/systemgateway.js`, `sets/systemupdate2021.js`, and
  `sets/elevation.js`;
- `telemetry: true`, `observe: true`, the arm's default options, and an
  `onEvent` sink that records all events in order.

Write a small JSON trace containing the final summary and ordered events. For
each arm and seed, require the trace's winner, errors and `logHash` to match
the corresponding batch-report game. If they do not, stop; do not reason from
a non-reproduction.

Compare the G and B event streams and report the first divergent Corp decision
per seed: Corp turn (derived from `turnEnd` events), phase identifier, choice
type, option labels, chosen index and chosen label (`options[chosen]`). Follow
immediately subsequent select decisions when necessary to understand a
command such as install. Ignore `latencyMs` when locating behavioural
divergence because it is wall-clock telemetry. Summarise the common pattern
across the five seeds.

**B3. Measure agenda behaviour with a small collector.** Create
`scripts/ai-batch/collectors/agenda.js` in a shared diagnostic overlay copied
identically into both worktrees; follow `collectors/runs.js`. A collector sees
frozen plain events only: `gameStart`, `decision` (`{n, side, identifier,
choiceType, options, chosen, latencyMs}`), `run`, `score`, `steal`, `mulligan`,
`turnEnd`, and `gameEnd`.

The existing `decision` event contains labels and a chosen index, not reliable
card type plus destination-server identity. Do not infer agenda installs or
remote destinations from titles, `[object]` labels or phase assumptions.
Record the directly observable metrics first:

- `scoredCount`: number of `score` events
- `scoredAny`: 1 if the Corp scored at least once, else 0
- `turnsToFirstScore`: Corp turn of the first `score` (count `turnEnd` events), censored to the game's total turns if none
- `agendaInstalls` and `agendaInstallsRemote`, but only if a real sampled event
  proves both can be identified without guessing.

If existing events are insufficient, add a neutral `install` observation to
the shared diagnostic harness overlay rather than inventing a proxy. Inspect
the current engine's actual install function and arguments first. The emitted
frozen event may contain only public/Corp-known facts required here: side,
card title, card type and destination class (`hq`, `rd`, `archives`, or
`remote`). The wrapper must call the real engine function unchanged. Apply the
identical overlay to both arms and prove on Gateway seeds 1–10 that winner,
errors and `logHash` match the corresponding no-overlay runs before collecting
data. If neutral instrumentation cannot be proved, omit install counts, say
why, and leave the hypothesis verdict `unclear` unless other evidence settles
it.

Run the collector (`--collector agenda`) on the boundary pair G and B, and on H0 versus the harness tip, all with the same pool and seeds (collectors must match for `--compare`). Report whether the bad version installs and scores fewer agendas, and later.

**Owner review point B:** before the final report, show the owner the culprit commit (or intervals), the first-divergence findings and the collector comparison, and wait for OK or direction.

## Final report (write to `~/bench/regression-report.md`)

- Inputs, SHAs, shim diffs, and any skipped commits with their errors.
- Phase A table across all checkpoints, and the identified interval or commit(s).
- The change in that commit (what Corp decisions it alters).
- Trace findings: the first divergent decision in each of the 5 seeds and the common pattern, with batch-report hash reproduction confirmed.
- Collector table: agenda installs, installs into remotes, scored count, turns to first score, for G, B, H0 and the harness tip.
- Verdict: does the evidence support the hypothesis (fewer or later agenda installs shifting theft from remotes to HQ/R&D)? Say "supported", "not supported" or "unclear", and what would settle it.
- Suggested directions only (for example which gate or threshold looks too strict, and that any fix should land behind an option and be judged with `gate`, using `--improve pointsScored --guard pointsStolen=...` or the equivalent). Do not implement fixes.
- Caveats: AI-vs-AI results depend on the single Runner AI; the pool has only a few Corp identities; the mid-history files run on today's engine, not the engine they shipped with.

## Cleanup

Leave worktrees, branches and `~/bench/` in place. Do not delete anything unless the owner asks. Never push.
