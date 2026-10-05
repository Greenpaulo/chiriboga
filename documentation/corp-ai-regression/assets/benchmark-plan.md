# Original vs current Corp AI benchmark plan

Frozen before any candidate smoke or batch result was generated.

## Inputs

- Harness/current chassis: `roadmap/corp_ai_finding_12_seeded_batch_harness`
- Harness/current SHA: `b52d45123c10201572aaf837714dd019bd9bdfcc`
- Original Corp AI source SHA: `625b008ccfc0113d29a2d358d3a40e2377699bd7`
- Original source: `625b008:ai_corp.js`, byte-identical to `drbo6/chiriboga` default branch `dev` when verified
- Pool: `/Users/paulbingham/bench/beginner-pool.json`
- Pool id: `beginner-v1`
- Seeds: `1-200` per pair (`--games 200`), 1,000 games per arm
- Sets: `systemgateway`, `systemupdate2021`, `elevation`
- Pairs: `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`
- Starts: none
- Collectors: default harness collectors
- Current Corp options: defaults (`evidenceBasedHostedCardRez: false`)
- Original Corp options: empty default-options object supplied by the minimal harness shim
- Runner AI: identical current `ai_runner.js` in both arms; default options (`{}`)
- Original random call: leave `RandomRange(virus_min, virus_max)` unchanged
- Original decision latency: add only the current telemetry timing wrapper to `Choice`

## Frozen metrics and thresholds

- Primary improvement: `pointsStolen`, lower is better; pass only if the whole paired 95% interval is below zero.
- Guard: `winRate=0.03`, higher is better.
- Guard: `pointsScored=0.4`, higher is better.
- Guard: `gameLength=2`, with lower declared better.
- Report only: `decisionLatencyMs.corp.mean` and `decisionLatencyMs.corp.p95`, lower is better.
- Triage rather than automatic failure: failed or engine-error games; list and replay every failure and report whether it occurs in one or both arms.
- These tolerances are frozen and will not be changed after results are observed.

## Exact commands

### Worktrees

```sh
git worktree add ../bench-current -b bench-current roadmap/corp_ai_finding_12_seeded_batch_harness
git worktree add ../bench-orig -b bench-orig roadmap/corp_ai_finding_12_seeded_batch_harness
cd ../bench-orig
cp /Users/paulbingham/bench/ai_corp_H0.js ai_corp.js
# Add only the documented minimal default-options, constructor-options, and Choice telemetry shim.
git add -A
git commit -m "bench: original ai_corp with harness shim"
git status
```

### Smoke tests (run in each worktree)

```sh
node tests/ai-batch.test.js
node scripts/ai-game.js --corp "Gateway Corp.js" --runner "Gateway Runner.js" --seeds 1-10 --jobs 8
node scripts/ai-game.js --corp "Duel PD vs Tao.js" --runner "Duel Tao vs PD.js" --seeds 1-10 --jobs 8
node scripts/ai-game.js --corp "Gateway Corp.js" --runner "Gateway Runner.js" --seed 1
node scripts/ai-game.js --corp "Gateway Corp.js" --runner "Gateway Runner.js" --seed 1
```

### Sequential batches

Each command is launched in the background, redirected to its named log, and allowed to finish before the next begins.

```sh
cd /Users/paulbingham/apps/netrunner/bench-orig
node scripts/ai-batch.js --pool /Users/paulbingham/bench/beginner-pool.json --games 200 --out /Users/paulbingham/bench/orig.json > /Users/paulbingham/bench/orig.log 2>&1 &

cd /Users/paulbingham/apps/netrunner/bench-current
node scripts/ai-batch.js --pool /Users/paulbingham/bench/beginner-pool.json --games 200 --out /Users/paulbingham/bench/current.json > /Users/paulbingham/bench/current.log 2>&1 &
```

### Comparison

```sh
cd /Users/paulbingham/apps/netrunner/bench-current
node scripts/ai-batch.js --compare /Users/paulbingham/bench/orig.json /Users/paulbingham/bench/current.json \
  --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.4 \
  --better gameLength=lower --guard gameLength=2
```

