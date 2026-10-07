# Corp AI regression localisation plan

Frozen before running H1 on 2026-10-04.

## Inputs

- Harness chassis: `b52d45123c10201572aaf837714dd019bd9bdfcc`
- H0: `625b008ccfc0113d29a2d358d3a40e2377699bd7` (`orig.json`, already complete)
- H1: `6281d7e3382e4aa503f42bcef07b6513ccbfa3b1`
- H2: `1361c37c4c85e5dc01bb0d24d5c8a3d14c8ce803`
- H3: `f8aa2a5b4cf6722ac0d080af12302bb2bfbc07c4`
- Tip: `b52d45123c10201572aaf837714dd019bd9bdfcc` (`current.json`, already complete)
- Pool: `/Users/paulbingham/bench/beginner-pool.json`, id `beginner-v1`, pool hash `fe8cb821d04c9dd7`
- Seeds: 1–200 for each of five pairs; 1,000 games per full run
- Corp options: each arm's defaults; tip keeps `evidenceBasedHostedCardRez: false`
- Engine, Runner AI, decks, sets and harness: fixed at the harness chassis

## Frozen localisation rule

The primary localisation metric is the paired change in `pointsStolen`, where an increase is worse. Among consecutive checkpoint intervals whose whole 95% interval is above zero, select the interval with the largest mean increase for binary search. `winRate`, `pointsScored`, server split and `gameLength` are supporting evidence and must not be substituted as the selection metric after results are visible.

If no single checkpoint interval has a wholly positive `pointsStolen` interval despite the clear H0-to-tip regression, classify the checkpoint result as distributed or underpowered and ask the owner before choosing any interval.

## Commands

For each new arm, run the Gateway seeds 1–10 smoke check, repeat seed 1 to verify `logHash`, then run:

```sh
node scripts/ai-batch.js --pool /Users/paulbingham/bench/beginner-pool.json --games 200 --out /Users/paulbingham/bench/<label>.json > /Users/paulbingham/bench/<label>.log 2>&1
```

Run arms sequentially. Compare H0→H1, H1→H2, H2→H3 and H3→tip with the harness `--compare` command and no improvement or guard flags.
