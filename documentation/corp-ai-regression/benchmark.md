# Task: benchmark the ORIGINAL Corp AI vs the CURRENT Corp AI

Audited 2026-10-05. This is the original experiment plan; frozen thresholds
remain historical. For future investigation execution, use
[runbook v2](runbook.md) and the
[recovery inventory](assets/README.md). The agent prepares
a resumable queue and stops; only the owner runs batches. The recorded choice
is H0 `625b008:ai_corp.js` with unchanged randomness and empty shim options,
versus fixed tip `b52d451` with default options. Do not ask those choices again
or substitute the owner's differently sized `ai_corp_original.js`.

Use the seeded batch harness (`scripts/ai-batch.js`, `scripts/ai-game.js`) to answer one question: **does the current Corp AI beat the original Corp AI?** Games are plain JavaScript (no AI tokens, about 1-3 s each).

Both arms use the same engine, Runner AI (`ai_runner.js`), deck pool, seeds and collectors. **Only `ai_corp.js` differs.**

Read `documentation/ai-batch-harness.md` first, and `documentation/legacy-ai-stack-validation.md`, which is the repo's own plan for cross-revision audits. This task is a lightweight version of its comparison Z (H0 to now), so follow its rule: **write down the primary metric, guards and thresholds before looking at any candidate result.**

## Known facts (verified against the repo)

- `HARNESS_BRANCH` = `roadmap/corp_ai_finding_12_seeded_batch_harness` (tip `b52d451`). It contains the harness and is the chassis for BOTH arms, so the engine, Runner AI and harness are identical and only `ai_corp.js` differs. Do NOT use the top of the stack for now. The "current" arm is pinned to `b52d451:ai_corp.js`, even if the branch advances.
- The harness loads `decks.js`, `runcalculator.js`, `ai_corp.js`, `ai_runner.js` from the repo root (`AI_FILES` in `scripts/ai-batch/headless.js`). Swapping the Corp AI means overwriting root `ai_corp.js`.
- Current `ai_corp.js` is about 7,000 lines. The historical control is
  `625b008:ai_corp.js`. The owner's gitignored `ai_corp_original.js` differs and
  was not used; it is not needed in a fresh worktree.
- The first-commit version of `ai_corp.js` is `625b008` ("initial commit", H0, 3,410 lines, CRLF line endings). It is byte-identical to `ai_corp.js` on the default branch of upstream `github.com/drbo6/chiriboga` (checked; upstream last commit 2026-04-08). H0 is the original upstream Corp AI. The owner's `ai_corp_original.js` differs and is not used as the control.
- `--compare` requires only `poolHash`, `seeds`, `starts` and `collectors` to match. Differing code, `codeHash` and AI options are allowed, so `--compare` works directly.

### Deck pairs

Only decks that existed upstream, so the original is never asked about mechanics it predates. Checked against `625b008`: these precons exist there and are unchanged since (one exception, noted below).

| Pair id | Corp | Runner |
|---|---|---|
| `pd-tao` | `Duel PD vs Tao.js` | `Duel Tao vs PD.js` |
| `btl-kit` | `Duel BTL vs Kit.js` | `Duel Kit vs BTL.js` |
| `neh-zahya` | `Duel NEH vs Zahya.js` | `Duel Zahya vs NEH.js` |
| `pe-steve` | `Duel PE vs Steve.js` | `Duel Steve vs PE.js` |
| `gateway` | `Gateway Corp.js` | `Gateway Runner.js` |

`pe-steve` note: H0 has this Corp deck under the misnamed file `Duel PD vs Steve.js`. Its decklist is identical to today's `Duel PE vs Steve.js` (only the `name:` line differs; verified), so it is included. Excluded: `zwicky-magdalene` and `leo-topan` (none of their decks are in H0). Optional extra pair `my-first` (`My First Corp.js` / `My First Runner.js`, in H0 unchanged) only if the owner approves. Sets: keep `["systemgateway", "systemupdate2021", "elevation"]` unless `node tests/ai-batch.test.js` complains.

## Recorded owner choices

1. `HARNESS_BRANCH` as the chassis for both arms (see above). Only ask the owner if that branch is missing locally and on `origin`.
2. The fixed current arm is `b52d451` with default options (`evidenceBasedHostedCardRez: false`).
3. Use H0 `625b008:ai_corp.js`; the differently sized owner file is excluded.

## Rules

- Throwaway worktrees and branches only. Never push them or touch real branches.
- Commit before each run so the report records a clean tree.
- Run batches one at a time (latency numbers), same `--games` for both.
- Keep the Runner AI identical on both sides.
- Never read `ai_corp.js` in full (about 7,000 lines). Use `grep -n` and read narrow line ranges.
- Add the shim with `printf`/`sed`/shell appends, not a search-and-replace edit tool, because the file has CRLF line endings. Check with `git diff` and `file ai_corp.js` that line endings are still CRLF.
- The owner runs sequential batches using the prepared resumable queue, with
  output to named logs and an attached shell waiting on each child. The agent
  must not launch or poll them. Preserve failed reports; do not automatically rerun.
- Keep the shim to the few lines in step 4. If more is needed, stop and report. Do not alter the original's decision logic.

## Steps

**1. Extract the pinned H0 control.**

```sh
mkdir -p ~/bench
git show 625b008:ai_corp.js > ~/bench/ai_corp_H0.js
wc -l ~/bench/ai_corp_H0.js
```

The original comparison found that H0 and the owner file differ. The owner selected H0 after
upstream identity verification; use `git show 625b008:ai_corp.js`. An optional
backup of the owner file records provenance only and is not a rerun dependency.

**2. Freeze the experiment, then create the shared pool.** Write `~/bench/benchmark-plan.md` containing: both SHAs, pool path, seeds (1-200 per pair), the metrics and tolerances below, and the exact commands. Get owner approval before the first run if the owner has not already approved the defaults below.

The owner's goal is Corp **defence** (the offensive scoring I layers are not yet implemented), so the primary metric is `pointsStolen`. Defaults, based on the committed baseline `tests/fixtures/ai-batch/baselines/core-v1-*.json` (current code, pooled std errors at 1,000 games: `winRate` about 0.014, `pointsScored` about 0.09, `pointsStolen` about 0.07, `gameLength` about 0.23 turns; paired comparisons should be tighter):

| Check | Setting | Why |
|---|---|---|
| Improve | `pointsStolen` (lower is better); passes only if the whole 95% interval is below zero | Defence goal |
| Guard | `winRate=0.03` | About two standard errors; tighter fails on noise |
| Guard | `pointsScored=0.4` (about 15% of the 2.7 mean) | A defensive Corp may score a little less; a bigger drop suggests turtling |
| Guard | `gameLength=2` with `--better gameLength=lower` | Catches stalling; the metric has no built-in direction |
| Report only | Corp decision latency (`decisionLatencyMs.corp.mean`, `.p95`) | The original is simpler, so the current AI is probably slower by design |
| Triage | Failed or engine-error games | Do not auto-fail; the committed baseline itself had 3 failed games in 1,400. List them, replay them, and report whether they are in both arms |

Tolerances only decide the PASS/FAIL labels. The reports and the 95% intervals are the same whatever tolerances are used. Freeze the values above (or the owner's edits) before the first `--compare`; do not change them afterwards to turn a fail into a pass. If the owner wants to explore first, run a first comparison for information only, then freeze tolerances and confirm on fresh seeds (e.g. `--seeds 201-400`).

Create `~/bench/beginner-pool.json` outside both worktrees, in the format of `tests/fixtures/ai-batch/deck-pool.json`, with id `beginner-v1`, the sets above and the five pairs.

**3. Create worktrees.**

```sh
git worktree add ../bench-current -b bench-current b52d451
git worktree add ../bench-orig -b bench-orig b52d451
cd ../bench-orig
git show 625b008:ai_corp.js > ai_corp.js
```

**4. Add the minimal harness shim to the original `ai_corp.js`.** Preserve CRLF line endings. The harness needs exactly:

- Last lines of the file (the harness reads these with a regex, so keep the exact form):
  ```js
  CorpAI.DEFAULT_OPTIONS = Object.freeze({
  });
  ```
- In `CorpAI`'s `constructor()`: `this.options = Object.assign({}, CorpAI.DEFAULT_OPTIONS);` (the harness reads and validates `corp.AI.options`).
- Optional but recommended, so Corp decision latency is comparable: in `Choice(optionList, choiceType)`, time the call to the inner decision and record it exactly as the current file does (`DecisionSnapshots.telemetry`, `DecisionSnapshots.Now()`, `DecisionSnapshots.Record("corp", choiceType, optionList, ret, elapsed)`; see current `ai_corp.js` near `Choice(`). Copy only that timing block, not the security cache or hypothetical-depth code. If you skip it, report Corp latency as n/a.

Randomness: the original has no `Math.random` and no `_random`. Its only live random call is `RandomRange(virus_min, virus_max)` (about line 2988, in `utility.js`, which calls `Math.random`). The harness seeds `Math.random` per game (engine stream), so this is deterministic, but in the original arm that call consumes the engine stream, so engine draws after it can differ from the current arm. Pairing is slightly looser than for option-off/on gates but still unbiased. Do NOT edit this call unless the owner asks (optional: replace it with `Math.floor(this._random() * (virus_max - virus_min + 1)) + virus_min`, and record that in the report). All Runner randomness is in `ai_runner.js`, which is the same current file in both arms.

Notes: the original already has `_log`. The harness assigns `_random`, which the original ignores; it uses `RandomRange` (engine `Math.random`), which the harness seeds per game, so games remain reproducible.

```sh
git add -A && git commit -m "bench: original ai_corp with harness shim" && git status
```

**Owner review point 1:** show the owner `git diff 625b008 -- ai_corp.js` for the shim (it should be a few lines) and wait for approval before continuing.

**5. Quick check that both worktrees run ("smoke test").** This takes seconds and catches a broken setup before the long batches.

```sh
node tests/ai-batch.test.js
node scripts/ai-game.js --corp "Gateway Corp.js" --runner "Gateway Runner.js" --seeds 1-10 --jobs 8
node scripts/ai-game.js --corp "Duel PD vs Tao.js" --runner "Duel Tao vs PD.js" --seeds 1-10 --jobs 8
```

Every line needs a `winner` and an empty `errors` list. The old Corp AI may hit engine API drift (functions or hooks added after H0). Fix with the smallest possible shim, or report that the original cannot run. Also run one seed twice and confirm identical `logHash`.

**Owner review point 2:** show the owner this step's output for both worktrees and wait for approval before starting the batches.

**6. Prepare the owner's sequential batch queue.**

The commands below belong in the owner-run queue, not agent tool calls.

```sh
cd ../bench-orig    && node scripts/ai-batch.js --pool ~/bench/beginner-pool.json --games 200 --out ~/bench/orig.json
cd ../bench-current && node scripts/ai-batch.js --pool ~/bench/beginner-pool.json --games 200 --out ~/bench/current.json
```

(`--quick` first is optional and indicative only.) Expect 1,000 games per arm (5 pairs x 200), a few minutes each.

**7. Validate.** Expect empty `failures` and 1,000 valid games per report. If
failures appear, preserve and disclose them; `--compare` uses common completed
pairs. `ai-batch.js replay` does not exist, and `ai-game.js` uses different
streams. Use the recovery inventory's headless replay recipe and verify hashes
before reasoning from a reproduction. `poolHash`, `seeds`, `starts` and collectors
must match; record the intentional H0-versus-tip options difference.

**8. Compare** (baseline first), using the guards and tolerances frozen in step 2:

```sh
node scripts/ai-batch.js --compare ~/bench/orig.json ~/bench/current.json \
  --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.4 \
  --better gameLength=lower --guard gameLength=2
```

Do not change thresholds after seeing results. If the result is inconclusive, predeclare an expanded seed range (normally 400 per pair, keeping the original games) rather than adding seeds until it looks good.

**9. Report.**

- Inputs, SHAs, the diff (if any) between `ai_corp_original.js` and H0, and the shim diff.
- Table: metric, original, current, difference, 95% interval, better direction (`winRate`, `pointsScored`, `pointsStolen`, `gameLength`, Corp latency mean and p95), plus per-pair results.
- Verdict: improved (whole `pointsStolen` interval below zero and every guard passes), inconclusive, or regressed. Interpret the pattern: `pointsStolen` down, `pointsScored` slightly down, `winRate` flat or up is the intended defensive trade-off. `pointsStolen` down but `winRate` and `pointsScored` both clearly down is a turtling Corp (the gap the I layers should close). `pointsStolen` flat or up means the defence work is not doing what was intended; investigate before building on it.
- Caveats: AI-vs-AI win rate also reflects Runner AI strength; these decks do not exercise post-upstream mechanics, so a flat result does not prove newer logic is useless; latency differs partly because of efficiency work and telemetry.

## Cleanup

Leave worktrees until the owner has read the report. Do not delete anything unless the owner asks. Keep `~/bench/` and the branches `bench-orig` and `bench-current` so the test can be re-run (`git worktree remove <dir>` deletes only the folder; the branch stays and `git worktree add <dir> <branch>` restores it). Never push `bench-orig` or `bench-current`.

To investigate a later version, declare and record its fixed chassis first,
create throwaway arms from it, swap `625b008:ai_corp.js` into the control with
the minimal shim, and let the owner run both on the same pool and seeds. A new
chassis is a new experiment, not a continuation of the b52d451 measurements.
