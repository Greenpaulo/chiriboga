# Corp AI regression bisect — owner review point A

Generated 2026-10-04. Phase A2 has not started.

## Validation

All three new checkpoint arms used harness chassis `b52d451`, the frozen `beginner-v1` pool (`fe8cb821d04c9dd7`), seeds 1–200 across five pairs, and each arm's default Corp options. Every arm was committed and clean before its run. Each Gateway seeds 1–10 smoke completed with a winner and no errors; repeated seed 1 reproduced its `logHash`.

| Point | Historical `ai_corp.js` | Shim commit | Shim vs historical file | Valid games | Failures | Runtime |
|---|---|---|---:|---:|---:|---:|
| H0 | `625b008` | `4cd91d1` | previously approved | 1,000 | 0 | existing |
| H1 | `6281d7e` | `f3b0d76` | 3 lines | 1,000 | 0 | 1,039 s |
| H2 | `1361c37` | `2b0a0a3` | 3 lines | 1,000 | 0 | 2,010 s |
| H3 | `f8aa2a5` | `ef4ef09` | 3 lines | 1,000 | 0 | 1,847 s |
| Tip | `b52d451` | `b52d451` | none | 1,000 | 0 | existing |

## Checkpoint metrics

`win` is Corp win rate. Server columns are points stolen from that server.

| Point | Scope | win | scored | stolen | HQ | R&D | Archives | Remote | turns |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H0 | pooled | 0.433 | 4.264 | 5.675 | 2.060 | 2.058 | 0.010 | 1.547 | 14.765 |
| H0 | gateway | 0.420 | 4.895 | 5.640 | 1.735 | 2.315 | 0.010 | 1.580 | 16.200 |
| H0 | pe-steve | 0.425 | 3.945 | 5.605 | 2.705 | 1.500 | 0.000 | 1.400 | 15.105 |
| H1 | pooled | 0.359 | 3.638 | 6.029 | 1.828 | 1.943 | 0.028 | 2.230 | 14.992 |
| H1 | gateway | 0.280 | 3.675 | 6.280 | 1.565 | 2.680 | 0.100 | 1.935 | 16.870 |
| H1 | pe-steve | 0.355 | 3.245 | 5.945 | 2.610 | 1.280 | 0.020 | 2.035 | 15.000 |
| H2 | pooled | 0.277 | 2.676 | 6.157 | 2.720 | 2.438 | 0.143 | 0.856 | 16.742 |
| H2 | gateway | 0.135 | 2.130 | 6.510 | 2.395 | 3.065 | 0.380 | 0.670 | 18.695 |
| H2 | pe-steve | 0.235 | 2.015 | 6.455 | 4.015 | 1.615 | 0.175 | 0.650 | 15.680 |
| H3 | pooled | 0.268 | 2.580 | 6.199 | 2.703 | 2.548 | 0.094 | 0.854 | 16.447 |
| H3 | gateway | 0.110 | 1.845 | 6.795 | 2.305 | 3.565 | 0.270 | 0.655 | 18.685 |
| H3 | pe-steve | 0.230 | 1.970 | 6.395 | 4.010 | 1.675 | 0.065 | 0.645 | 15.805 |
| Tip | pooled | 0.253 | 2.541 | 6.238 | 2.697 | 2.658 | 0.112 | 0.771 | 16.575 |
| Tip | gateway | 0.095 | 1.765 | 6.810 | 2.345 | 3.695 | 0.325 | 0.445 | 18.605 |
| Tip | pe-steve | 0.220 | 1.825 | 6.480 | 3.920 | 1.795 | 0.090 | 0.675 | 15.435 |

## Frozen-rule application

| Interval | Paired `pointsStolen` change | 95% interval | Whole interval above zero? |
|---|---:|---:|---|
| H0 → H1 | +0.354 | [+0.171, +0.538] | yes |
| H1 → H2 | +0.128 | [-0.040, +0.294] | no |
| H2 → H3 | +0.042 | [-0.053, +0.137] | no |
| H3 → Tip | +0.039 | [-0.055, +0.133] | no |

The frozen localisation rule therefore selects **H0 `625b008` → H1 `6281d7e`** for Phase A2. It is the only consecutive interval whose entire paired 95% interval for the primary metric is above zero, and it consequently also has the largest qualifying mean increase.

Supporting evidence: across H0 → H1, Corp win rate fell 0.433 → 0.359 and points scored fell 4.264 → 3.638. The theft shift in this first interval is toward remotes (+0.683) while HQ (-0.232) and R&D (-0.115) improved; the later H1 → H2 interval reverses that server distribution sharply despite its pooled `pointsStolen` interval crossing zero.

## Artifacts

- Frozen plan: `~/bench/regression-plan.md`
- Helper: `~/bench/make-arm.sh`
- Reports: `~/bench/{orig,h1,h2,h3,current}.json`
- Batch logs: `~/bench/{h1,h2,h3}.log`
- Comparison logs: `~/bench/compare-{h0-h1,h1-h2,h2-h3,h3-tip}.log`
