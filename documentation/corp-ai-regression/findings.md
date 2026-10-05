# Corp AI regression: findings so far

Status: **Updated 2026-10-05. Historical early scoring losses localized to #3 and #8; tip and combined-build ablations completed. Residual scoring gap remains unresolved.**

## The question

Is the current Corp AI (harness branch `roadmap/corp_ai_finding_12_seeded_batch_harness`, `b52d451`) better than the original upstream Corp AI (H0, `625b008`), and if not, where and why did it change?

## Setup (so results can be reproduced)

- Same engine, Runner AI (`ai_runner.js` identical in every run), pool and seeds. Only `ai_corp.js` differs.
- Pool `beginner-v1` (hash `fe8cb821d04c9dd7`): `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`. Seeds 1-200 per pair, 1,000 games per run, default AI options.
- These are the decks that existed upstream, so the original AI is never asked about mechanics it predates. Only four distinct Corp identities.
- H0 is byte-identical to upstream `drbo6/chiriboga` `ai_corp.js` (default branch `dev`, `c863f5a`). The owner's gitignored `ai_corp_original.js` (3,985 lines, LF) is NOT H0 and was not used.
- Old `ai_corp.js` files were run on the harness chassis with a minimal harness shim (`DEFAULT_OPTIONS`, `this.options`, telemetry wrapper in `Choice`).
- Checkpoints: H0 `625b008`, H1 `6281d7e` (last `main` commit), H2 `1361c37`, H3 `f8aa2a5`, tip `b52d451`.

## Headline result: original vs current

Current minus original, pooled, paired 95% intervals:

| Metric | Original | Current | Difference |
|---|---:|---:|---|
| Corp win rate | 43.3% | 25.3% | -18.0 [-21.8, -14.1] pp |
| Corp points scored | 4.264 | 2.541 | -1.723 [-1.934, -1.505] |
| Runner points stolen (lower better) | 5.675 | 6.238 | +.563 [+.373, +.753] |
| Game length (turns) | 14.765 | 16.575 | +1.810 [+1.314, +2.314] |

Stolen points by server: remote -.776, HQ +.637, R&D +.600, Archives +.102. The drop is in every pair; `gateway` is worst (Corp wins 42.0% to 9.5%).

## Where it happened (checkpoints)

| Point | Win (%) | Scored | Stolen | HQ | R&D | Archives | Remote | Turns |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H0 | 43.3 | 4.264 | 5.675 | 2.060 | 2.058 | .010 | 1.547 | 14.765 |
| H1 | 35.9 | 3.638 | 6.029 | 1.828 | 1.943 | .028 | 2.230 | 14.992 |
| H2 | 27.7 | 2.676 | 6.157 | 2.720 | 2.438 | .143 | .856 | 16.742 |
| H3 | 26.8 | 2.580 | 6.199 | 2.703 | 2.548 | .094 | .854 | 16.447 |
| Tip | 25.3 | 2.541 | 6.238 | 2.697 | 2.658 | .112 | .771 | 16.575 |

Share of the 18-point win-rate loss: H0 to H1 about 41% (-7.4 pp), H1 to H2 about 46% (-8.2 pp), H2 to tip about 13% (-2.4 pp, small steps, none significant alone).

The two big steps look different. H0 to H1: remote theft UP (+0.68), central theft down (-0.33). H1 to H2: remote theft collapses (-1.37), central theft up (+1.50).

## H1 to H2 is one commit: `fa1182c`

Pooled batch results for the six `ai_corp.js` commits in H1..H2 (F3/F6 speed-up overlay applied):

| Commit | Win (%) | Scored | Stolen | Turns |
|---|---:|---:|---:|---:|
| `1b1dcc0` | 36.0 | 3.64 | 6.03 | 15.0 |
| `41a10b0` | 37.0 | 3.72 | 5.99 | 15.0 |
| `72accd2` | 37.5 | 3.74 | 5.95 | 15.0 |
| `4556eff` | 37.9 | 3.75 | 5.94 | 15.0 |
| `fbe132e` | 36.4 | 3.74 | 5.90 | 14.9 |
| **`fa1182c`** | **27.7** | **2.67** | **6.16** | **16.7** |

Paired `fbe132e` to `fa1182c`: win -8.7 pp [-11.7, -5.7], scored -1.069 [-1.238, -.896], stolen +.257 [+.109, +.406], turns +1.797 [+1.368, +2.244]. Server split: HQ +.948, R&D +.394, Archives +.130, remote -1.215. All earlier steps in the interval were flat (small effects at a few commits barely excluded zero; not material).

**The commit:** `fa1182c34cfb0299c913161ef5bb440fed409c96` (2026-09-23), "Addressed installing agenda into unsecure remote issue". About 36 changed lines in `ai_corp.js`, two changes:
1. `_isAScoringServer` returns false for any remote that `_evaluateServerSecurity` calls not secure ("never offer an insecure remote for scoring").
2. The protection score counts ICE without an end-the-run effect as 0.25 instead of 1.

`ai_corp.js` is identical at `fa1182c` and H2.

## Causal test (on the harness tip)

Paired against the tip, 1,000 games each (variant B 999; `pd-tao` seed 117 dropped from both arms):

| Variant | Win Δ (pp) | Scored | Stolen | Turns |
|---|---|---|---|---|
| A: remove only the `isSecure` gate | +7.6 [+4.8, +10.3] | +.787 [+.638, +.934] | -.145 [-.274, -.010] | -1.526 [-1.894, -1.171] |
| B: restore legacy ICE weighting only | +0.7 [-1.1, +2.6] | +.052 [-.049, +.157] | +.037 [-.055, +.129] | +.032 [-.273, +.333] |

Variant A server split: HQ -.841, R&D -.320, Archives -.076, remote +1.092. Variant B: all flat.

**Conclusion:** the `isSecure` gate is the main cause of the H1 to H2 step. Removing it recovers about 87% of that step's win-rate loss (the rest is probably the small later changes; not proven). The ICE-weighting ablation is inconclusive; its outcome intervals include zero. The server split and scoring changes support an agenda-holding mechanism, but first-divergence traces and an agenda collector have not been run to demonstrate it directly.

## Other facts worth keeping

- With the gate removed, `pointsStolen` did not get worse (it was slightly better). So against this Runner AI the gate did not improve defence overall. It is a blunt rule: "never unless secure" costs scoring.
- The owner reports the current Corp beats them in person. The harness measures the Corp against the Runner AI only, so win rate here is a proxy for strength against a human.
- Variant B seed 117 (`pd-tao`) timed out at 900 s: a 187-turn stalemate (Marilyn Campaign installs, rezzes, reshuffles) ending when R&D ran out. Not a Corp AI loop. Not investigated further.
- Early F3/F6-ported checkpoint runs matched the earlier unpatched H2 report on 998 of 1,000 `logHash` values. The two differences were `btl-kit` seeds 56 (same outcome) and 83 (3-9 in 17 turns became 0-9 in 19). Averages match; individual games do not match exactly.
- Run times: unpatched H1/H2/H3 batches took 17.3, 33.5 and 30.8 minutes; with the F3/F6 overlay, about 2.5 to 3.3 minutes. F6 is commit `806922f` (built on branch `roadmap/F6-cheaper-security-evaluation.md`); F3 is `cd95844`. F6 needs hand-merging onto older checkpoints (one conflict in `_evaluateServerSecurity`).

## Caveats

- Win rate depends on a single Runner AI, and the pool has only a few Corp identities and the upstream-era decks. A flat result would not prove newer logic useless.
- Latency rose (Corp mean 1.8 to 6.8 ms) partly by design; it was report-only.
- Numbers quoted from terminal summaries are unpaired point estimates; the intervals above come from paired `--compare`.

## Open

1. **H0 to H1** (28 `ai_corp.js` commits, about 41% of the loss, remote theft up): Round 2 localized the late changes and causal runs are complete. Early #2/#3/#6/#7/#10 runs and their causal variants are now complete; see the updated evidence below.
2. **H2 to tip** (about 13%): small steps, none significant alone. Probably not worth chasing unless the H0 to H1 result suggests it.
3. **Fix design** (a proposal, not a finding): keep the protection against bad installs but allow scoring when no remote can be made secure, for example allow a remote install when its security is at least as good as HQ's or R&D's, or when the Runner cannot afford to run it. Put it behind an option, default off, and judge it with `gate`: `--improve pointsScored`, with guards on `pointsStolen` and `pointsStolenByServer.remote` to confirm the old bug does not come back. A human playtest is the real test.

## H0 to H1 Round 1

Round 1 ran commits #4, #8, #12, #16, #20 and #24. All reports contain 1,000 paired games with identical inputs and zero failures. H0 and those six midpoints could not take the saved overlay cleanly; H1 can, but was left unpatched, so the entire H0→H1 experiment is consistent.

| Interval | Win Δ (pp) | Scored | Stolen | HQ | R&D | Archives | Remote | Turns |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| H0→#4 | +0.1 | -.075 | +.074 | -.170 | +.011 | -.007 | +.240 | -.047 |
| #4→#8 | -1.4 | -.148 | -.027 | +.046 | -.087 | +.007 | +.007 | +.206 |
| #8→#12 | +0.7 | +.071 | +.038 | -.106 | -.036 | -.005 | +.185 | -.633 |
| #12→#16 | +0.4 | +.069 | +.015 | -.065 | +.005 | +.008 | +.067 | -.074 |
| #16→#20 | -0.9 | -.096 | -.057 | +.117 | -.105 | +.007 | -.076 | +.679 |
| **#20→#24** | **-3.4** | **-.214** | **+.281** | **-.143** | **+.095** | **-.003** | **+.332** | **-.196** |
| #24→H1 | -2.9 | -.233 | +.030 | +.089 | +.002 | +.011 | -.072 | +.292 |

The pattern is **several discrete steps**:

- Remote theft rises clearly at H0→#4 (+.240 [+.098, +.378]), #8→#12 (+.185 [+.051, +.321]), and #20→#24 (+.332 [+.208, +.459]). This is the defining H0→H1 server-shift signature and cannot be attributed to only the late interval.
- Scoring falls clearly at #20→#24 (-.214 [-.367, -.060]) and #24→H1 (-.233 [-.423, -.046]); #4→#8 also has a smaller -0.148 point estimate.
- Win-rate loss is concentrated late: #20→#24 is -3.4 pp [-6.4, -0.4], followed by #24→H1 at -2.9 pp [-6.4, +0.6].
- At Round 1, the largest combined outcome gap was #20 `bd9bd79`→#24 `3c59ec1`; Round 2 below localized it to #21. Repeated Gateway and PD–Tao seeds 1–10 matched all hashes on both boundary arms.

Round 2 resolved every individual `ai_corp.js` transition in both late intervals. Commit #28 `4dfe261` needs no separate arm because its `ai_corp.js` is identical to H1.

| Transition | Changed games | Win Δ (pp) | Scored | Stolen | HQ | R&D | Archives | Remote | Turns |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **#20→#21** | 642 | **-4.4** | **-.238** | **+.291** | **-.130** | **+.102** | -.003 | **+.322** | -.221 |
| #21→#22 | 0 | 0.0 | .000 | .000 | .000 | .000 | .000 | .000 | .000 |
| #22→#23 | 64 | +1.0 | +.024 | -.010 | -.013 | -.007 | .000 | +.010 | +.025 |
| #23→#24 | 0 | 0.0 | .000 | .000 | .000 | .000 | .000 | .000 | .000 |
| **#24→#25** | 532 | -2.0 | **-.164** | +.068 | +.083 | +.062 | +.013 | -.090 | +.238 |
| #25→#26 | 0 | 0.0 | .000 | .000 | .000 | .000 | .000 | .000 | .000 |
| #26→#27 | 15 | 0.0 | +.006 | -.005 | +.004 | -.001 | .000 | -.008 | +.007 |
| #27→H1 (#28) | 970 | -0.9 | -.075 | -.033 | +.002 | -.059 | -.002 | +.026 | +.047 |

The clear #20→#24 regression is commit #21 `5e6af68`, "Resolved documentation/bugs/code-review/semak-samun-held-and-send-a-message-delay.md": win -4.4 pp [-7.3, -1.5], scored -.238 [-.390, -.086], stolen +.291 [+.154, +.429], and remote theft +.322 [+.199, +.447]. It adds `serverAtRisk` as an override for another protection install and adds an `AIScoringPlanCommitted` path that can bypass the global advancement reserve. The commit contains multiple policy changes, so this localization does not yet identify which sub-change causes the regression.

The main #24→H1 scoring loss is commit #25 `a3d57d3`, "Addressed documentation/bugs/action-needed/pointless-archives-ice-install.md remediation points": scored -.164 [-.299, -.035], with win -2.0 pp [-4.7, +0.5] and stolen +.068 [-.049, +.185]. It introduces public/recent successful-run pressure, principally allowing valuable or repeatedly-run Archives to enter protection allocation, and changes protection-debt aging. Commit #28 changes many games but has no clear pooled outcome effect in this run.

Repeated Gateway and PD–Tao seeds 1–10 matched all hashes on both sides of the #20/#21 and #24/#25 boundaries, with winners and no errors.

The early intervals were subsequently split with #2, #6 and #10, then #3 and #7. The updated historical and causal comparisons below supersede this earlier proposed round; #9 and #11 have not been run separately.

Four current-tip causal variants were compared directly with `~/bench/current.json`. Differences below are variant minus current; brackets are paired 95% intervals.

| Behavior disabled | Win-rate change (percentage points) | Scored | Stolen | Turns |
|---|---:|---:|---:|---:|
| `serverAtRisk` final install override | +2.1 [0.0, +4.2] | +.208 [+.091, +.326] | -.094 [-.188, -.001] | -.212 [-.515, +.090] |
| Committed-agenda advancement-reserve bypass | +2.0 [+.1, +4.0] | +.084 [-.005, +.173] | -.081 [-.161, -.001] | +.148 [-.105, +.395] |
| Run-pressure admission of empty Archives | +1.7 [-.3, +3.7] | +.181 [+.064, +.296] | -.044 [-.134, +.049] | +.347 [+.003, +.686] |
| Valueless-server debt reset (restore legacy aging) | +.7 [-1.2, +2.6] | +.005 [-.087, +.094] | -.077 [-.164, +.008] | -.011 [-.248, +.230] |

| Behavior disabled | HQ theft | R&D theft | Archives theft | Remote theft |
|---|---:|---:|---:|---:|
| `serverAtRisk` final install override | -.050 [-.144, +.044] | -.108 [-.203, -.014] | -.016 [-.047, +.014] | +.080 [+.019, +.140] |
| Committed-agenda advancement-reserve bypass | +.010 [-.050, +.071] | -.060 [-.140, +.017] | +.011 [.000, +.024] | -.042 [-.102, +.018] |
| Run-pressure admission of empty Archives | -.007 [-.113, +.097] | -.069 [-.168, +.029] | +.021 [-.016, +.058] | +.011 [-.047, +.067] |
| Valueless-server debt reset | -.121 [-.202, -.042] | +.021 [-.059, +.099] | +.024 [-.008, +.058] | -.001 [-.052, +.051] |

The first three comparisons use 1,000 completed pairs. Legacy debt aging timed out on `pd-tao` seed 67 after 900 seconds (no recorded errors); `--compare` dropped that game from both arms and used 999 pairs. The report was retained and no batch was rerun.

These results support both #21 sub-changes contributing to weaker current-tip outcomes: removing the install override clearly improves scoring, while removing the advancement bypass gives a smaller win-rate improvement. Its scoring interval includes zero. Removing run-pressure admission for empty Archives also clearly improves scoring. The debt-reset change has no clear pooled scoring or win-rate effect on completed games. These effects are conditional on the rest of current-tip policy and must not be added together or assumed to reproduce the historical commit effects.

Isolation limitation: the Archives-admission variant changes `_nothingWorthProtecting()`, which is also consumed by debt aging. Thus excluding an empty Archives additionally causes its debt to reset under the unchanged aging rule. It is a test of the shared eligibility rule, not a pure allocation-only intervention independent of debt. A stricter allocation-only arm would need to change the allocation consumer while preserving the aging consumer.

Full comparison logs are `~/bench/compare-current-h0h1-{no-server-at-risk,no-scoring-reserve-bypass,no-archives-pressure-allocation,legacy-debt-aging}.log`.

All four individual variants start from `b52d451` with the scoring-server `isSecure` gate ON and default options unchanged. The first three completed 1,000 games each; debt aging completed 999 plus one timeout. Separate combinations of both #21 changes, both #25 changes, or all four have not run.

At owner request, combined variant `edc177a` from `b52d451` disables the `isSecure` gate and all four behaviors together. It completed 1,000 games with zero failures, clean-tree metadata and matching pool/seeds/options/collectors. Separate combinations of only both #21 changes or only both #25 changes remain untested. The early follow-up results are recorded below.

## Combined gate-and-four-off result

| Metric | H0 | Tip | Combined | Combined minus tip (95% interval) | Combined minus H0 (95% interval) |
|---|---:|---:|---:|---|---|
| Corp win rate | 43.3% | 25.3% | 39.8% | +14.5 [+11.1, +17.9] pp | -3.5 [-7.5, +0.4] pp |
| Points scored | 4.264 | 2.541 | 3.920 | +1.379 [+1.194, +1.559] | -.344 [-.564, -.124] |
| Points stolen | 5.675 | 6.238 | 5.767 | -.471 [-.627, -.311] | +.092 [-.098, +.286] |
| Turns | 14.765 | 16.575 | 14.931 | -1.644 [-2.084, -1.219] | +.166 [-.281, +.597] |
| HQ theft | 2.060 | 2.697 | 1.756 | -.941 [-1.092, -.794] | -.304 [-.464, -.143] |
| R&D theft | 2.058 | 2.658 | 2.044 | -.614 [-.767, -.461] | -.014 [-.185, +.156] |
| Archives theft | .010 | .112 | .008 | -.104 [-.139, -.072] | -.002 [-.015, +.010] |
| Remote theft | 1.547 | .771 | 1.959 | +1.188 [+1.053, +1.325] | +.412 [+.247, +.581] |

Together these removals recover about 81% of the observed H0-to-tip win-rate loss, 80% of the scoring loss and 84% of the increased total theft (ratios of point estimates, without uncertainty intervals). They also bring game length close to H0. The residual win-rate and total-theft intervals include zero; this does not establish equivalence to H0. Scoring remains clearly lower and remote theft clearly higher than H0.

This supports the five behaviors together accounting for much of the measured regression on this pool. It does not apportion the combined gain among them or establish additivity: policy interactions remain possible, and the shared Archives eligibility/debt caveat in the individual arm still applies. It is diagnostic evidence, not a production fix or proof of strength against a human.

Reports: `~/bench/causal-gate-and-four-off.json`; comparisons: `~/bench/compare-current-gate-and-four-off.log` and `~/bench/compare-orig-gate-and-four-off.log`. The subsequent early follow-up queues are complete; no further experiment is authorized by this document.

Options match the tip exactly. H0 predates `evidenceBasedHostedCardRez` and has no such option in its metadata; tip/combined keep it false, consistent with the approved original-versus-current experiment. Pool, seeds, starts and collectors match both baselines.

## Files

For future agents, [runbook v2](runbook.md) and the
[recovery/asset inventory](assets/README.md) are the entry
points. The inventory includes annotated tag targets, the full 28-commit list,
saved shim/overlays/queues/runbooks and a checksum manifest of raw evidence.
Repository documentation copies are prepared but uncommitted at the 2026-10-05
audit. A full, initially byte-verified working copy now exists in gitignored
repository `bench/`; its six shell scripts use repository-relative paths.
Original `~/bench/` is retained untouched. Neither ignored files nor these local
copies replace a separate backup of the raw reports/logs.

All under `~/bench/`: `orig.json`/`current.json` (H0 and tip), `h2.json` and the other checkpoint reports, `a2-<sha>.json` (H1..H2 commits), `causal-a-no-is-secure-gate.json`, `causal-b-legacy-ice-weighting.json`, `benchmark-plan.md`, `review-point-a.md`, `bisect-state.md`, `beginner-pool.json`, `regression-report.md`. Runbooks: `original-vs-current-corp-ai-benchmark.md`, `runbook-v1.md`.

## Updated early localization and gating assessment (2026-10-05)

All differences below are later/variant minus baseline, with paired 95% intervals.
Win-rate changes are percentage points (pp). Historical early arms are unpatched,
with the same minimal shim and harness chassis. Tip variants retain native F3/F6.
Every report contains 1,000 attempted games on beginner-v1 (fe8cb821d04c9dd7),
seeds 1–200 per pair, default options and a 900-second game timeout.

Historical #2→#3 (`95f2c15`) accounts for the measured #2→#4 scoring loss;
#3→#4 changes zero game hashes. Historical #7→#8 (`752dbf0`) accounts for the
#6→#8 scoring loss; #6→#7 changes zero hashes. These establish the historical
commit boundaries on this pool, not that reverting either behaviour improves
the current tip. #8→#10's remote-theft increase still spans #9 `82d1387`
and #10 `cc2777e`; neither has a separate historical midpoint report.

### Evidence for gating at the fixed tip b52d451

| Source commit / behaviour | Tip code | Evidence and classification |
|---|---|---|
| `fa1182c`: strict remote security admission | `_isAScoringServer`: `if (!security.isSecure) return false` | Strong candidate: removing it improves win rate +7.6 pp [4.8, 10.3], scoring +0.787 [0.638, 0.934]. Mechanism remains inferred, without traces. |
| #21 `5e6af68`: final protection-install override | `_shouldInstallIceLayer`: final `\|\| serverAtRisk` | Candidate: removal improves scoring +0.208 [0.091, 0.326]; win +2.1 pp [0.0, 4.2]. Preserve the earlier affordability/stakes checks when isolating this expression. |
| #21 `5e6af68`: committed-agenda reserve bypass | `Phase_Main`: `\|\| this._installedAgendaCanBeCompleted()`; commitment set in `_returnPreference` | Candidate: removal improves win +2.0 pp [0.1, 4.0]; scoring +0.084 [-0.005, 0.173] is inconclusive. |
| #25 `a3d57d3`: empty-Archives run-pressure eligibility | `_nothingWorthProtecting`, consumed by `_serverToProtect` and `_ageProtectionPriorities` | Shared-rule candidate: removal improves scoring +0.181 [0.064, 0.296]. This also affects debt resets; a pure allocation-only gate needs a separately isolated test. |
| #9 `82d1387`: protection-debt ranking subtraction | `_rankedServersToProtect`: `adjustedScore: score - debt` | Conditional tip candidate: removal improves scoring +0.154 [0.024, 0.282]. On the combined build the gain is +0.037 [-0.100, 0.173], inconclusive. Not a confirmed explanation of the residual gap. |
| #8 `752dbf0`: relative HQ penalty | `_protectionScore`: `hqRealProtection < rndRealProtection` | Historical scoring-loss boundary, but reverting to no ICE gives inconclusive tip/combined scoring changes. No positive current gating evidence. |
| #3 `95f2c15`: secure-server +2 bonus | `_protectionScore`: `if (security.isSecure) ret += 2` | Historical scoring-loss boundary. Removing the bonus at the tip worsens scoring -0.128 [-0.213, -0.047]; combined scoring +0.002 [-0.097, 0.099] is inconclusive. No evidence for disabling it at the tip. |
| #10 `cc2777e`: single-ICE structural-risk penalty | `_protectionScore`: `ret -= this._serverStructuralRisk(server)` | Removal changes zero hashes on this pool. No measured outcome support for gating this penalty. |
| `fa1182c`: non-ETR ICE weighting; #25 debt-reset change | `_cardProtectionValue`; `_ageProtectionPriorities` | Individual ablations have inconclusive scoring/win-rate effects; do not classify as demonstrated harmful sub-changes. |

These are diagnostic candidates, not production options or accepted defaults.
The combined build `edc177a` disables the security gate and four #21/#25
behaviours together, recovering scoring +1.379 [1.194, 1.559] against the tip.
It still scores -0.344 [-0.564, -0.124] below H0. Effects must not be added
across arms: the combined follow-ups demonstrate their dependence on other policy.
An option-based implementation must reproduce the intended arm and pass
predeclared guards before a production/default decision.

Neither the HQ-penalty nor bonus ablation demonstrates that it closes the
combined residual scoring gap. Combined c1 also leaves a clear scoring deficit
against H0: -0.307 [-0.526, -0.091]. H2→tip scoring is -0.135 [-0.268, -0.006]
(win -2.4 pp [-4.9, 0.1]); H2 is unpatched and tip has native F3/F6. This is
another contributing interval to investigate, not proof that the residual gap
is distributed or that its contributions are additive.

### Remaining code added by 95f2c15

Beyond the bonus, #3 adds `_textEndsTheRun`, `_iceHasETR`, `_damageInText`,
`_iceIsLethal`, `_hasDefensiveUpgrade`, `_hasGlobalETR`,
`_matchingBreakerForIce`, `_hostedBreakerForIce`, `_isHostedVirusBreaker`,
`_effectiveIceStrength`, `_virusCountersReduceStrength`, `_countETRSubroutines`,
`_runnerIdentityTitle`, `_breakerBreakCost`, `_breakerBoostCost`,
`_estimateBreakCost` and `_evaluateServerSecurity`. They estimate stopping
subroutines, damage, prevention, breaker matching/cost, hosted breakers,
strength reductions and the Quetzal exception. Misestimates can alter allocation
and scoring-server eligibility through their consumers. The bonus is their only
new decision consumer inside historical #3; there is no separate install,
advance or score policy in that diff. The fixed chassis's LEO identity also
consumes security, but LEO and Quetzal are absent from this frozen pool.

### Paired follow-up evidence

Labels a/b are the tip HQ/bonus ablations; ap/bp are their combined-build equivalents (a′/b′). c1 removes debt ranking; c2 removes the structural-risk penalty. `current` means b52d451, `combined` means edc177a, and `orig` means H0.


#### Early checkpoints

| Comparison | Win Δ (pp) | Scored Δ | Stolen Δ | HQ Δ | R&D Δ | Archives Δ | Remote Δ | Turns Δ | Pairs | Changed |
|---|---|---|---|---|---|---|---|---|---|---|
| H0→#2 | +1.6 [-1.7, +5.0] | +0.120 [-0.052, +0.297] | -0.047 [-0.213, +0.114] | -0.096 [-0.224, +0.034] | +0.045 [-0.099, +0.186] | +0.008 [+0.000, +0.019] | -0.004 [-0.134, +0.122] | +0.371 [+0.052, +0.691] | 1000 | 804 |
| #2→#4 | -1.5 [-4.8, +1.9] | -0.195 [-0.361, -0.028] | +0.121 [-0.032, +0.273] | -0.074 [-0.189, +0.043] | -0.034 [-0.167, +0.096] | -0.015 [-0.029, -0.003] | +0.244 [+0.117, +0.369] | -0.418 [-0.707, -0.129] | 1000 | 795 |
| #4→#6 | +2.0 [-0.4, +4.5] | +0.062 [-0.053, +0.179] | -0.036 [-0.147, +0.073] | +0.099 [+0.016, +0.178] | -0.028 [-0.120, +0.065] | +0.005 [+0.000, +0.013] | -0.112 [-0.203, -0.023] | +0.111 [-0.072, +0.295] | 1000 | 427 |
| #6→#8 | -3.4 [-7.1, +0.2] | -0.210 [-0.397, -0.027] | +0.009 [-0.162, +0.184] | -0.053 [-0.194, +0.085] | -0.059 [-0.219, +0.096] | +0.002 [+0.000, +0.006] | +0.119 [-0.021, +0.257] | +0.095 [-0.239, +0.434] | 1000 | 908 |
| #8→#10 | +0.0 [-3.4, +3.3] | +0.101 [-0.070, +0.271] | +0.010 [-0.145, +0.166] | -0.140 [-0.258, -0.025] | -0.020 [-0.147, +0.106] | -0.005 [-0.015, +0.004] | +0.175 [+0.042, +0.311] | -0.709 [-1.034, -0.389] | 1000 | 859 |
| #10→#12 | +0.7 [-1.7, +3.0] | -0.030 [-0.135, +0.076] | +0.028 [-0.067, +0.125] | +0.034 [-0.033, +0.101] | -0.016 [-0.101, +0.073] | +0.000 [+0.000, +0.000] | +0.010 [-0.076, +0.094] | +0.076 [-0.107, +0.265] | 1000 | 484 |

#### Historical single-commit boundaries

| Comparison | Win Δ (pp) | Scored Δ | Stolen Δ | HQ Δ | R&D Δ | Archives Δ | Remote Δ | Turns Δ | Pairs | Changed |
|---|---|---|---|---|---|---|---|---|---|---|
| #2→#3 | -1.5 [-4.8, +1.9] | -0.195 [-0.361, -0.028] | +0.121 [-0.032, +0.273] | -0.074 [-0.189, +0.043] | -0.034 [-0.167, +0.096] | -0.015 [-0.029, -0.003] | +0.244 [+0.117, +0.369] | -0.418 [-0.707, -0.129] | 1000 | 795 |
| #3→#4 | +0.0 [+0.0, +0.0] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | 1000 | 0 |
| #6→#7 | +0.0 [+0.0, +0.0] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | 1000 | 0 |
| #7→#8 | -3.4 [-7.1, +0.2] | -0.210 [-0.397, -0.027] | +0.009 [-0.162, +0.184] | -0.053 [-0.194, +0.085] | -0.059 [-0.219, +0.096] | +0.002 [+0.000, +0.006] | +0.119 [-0.021, +0.257] | +0.095 [-0.239, +0.434] | 1000 | 908 |

#### Tip ablations

| Comparison | Win Δ (pp) | Scored Δ | Stolen Δ | HQ Δ | R&D Δ | Archives Δ | Remote Δ | Turns Δ | Pairs | Changed |
|---|---|---|---|---|---|---|---|---|---|---|
| current→a | +1.6 [-1.4, +4.6] | +0.071 [-0.106, +0.248] | -0.029 [-0.176, +0.119] | -0.009 [-0.189, +0.176] | +0.008 [-0.164, +0.180] | +0.044 [-0.002, +0.091] | -0.072 [-0.169, +0.028] | -0.227 [-0.724, +0.272] | 999 | 900 |
| current→b | -0.4 [-2.0, +1.2] | -0.128 [-0.213, -0.047] | +0.005 [-0.073, +0.083] | +0.047 [-0.018, +0.112] | -0.025 [-0.097, +0.045] | +0.031 [+0.006, +0.059] | -0.048 [-0.094, -0.005] | +0.154 [-0.070, +0.375] | 998 | 272 |
| current→c1 | +1.9 [-0.4, +4.2] | +0.154 [+0.024, +0.282] | -0.034 [-0.138, +0.070] | -0.091 [-0.208, +0.023] | +0.042 [-0.079, +0.159] | +0.014 [-0.027, +0.055] | +0.001 [-0.066, +0.070] | +0.069 [-0.347, +0.477] | 1000 | 680 |
| current→c2 | +0.0 [+0.0, +0.0] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | +0.000 [+0.000, +0.000] | 1000 | 0 |

Tip a drops pd-tao seed 38 (999 pairs); tip b drops seeds 15 and 34 (998 pairs). All were 900-second timeouts, retained without retries. Other follow-ups have 1,000 pairs and zero failures.

#### Combined-build ablations and H0 controls

| Comparison | Win Δ (pp) | Scored Δ | Stolen Δ | HQ Δ | R&D Δ | Archives Δ | Remote Δ | Turns Δ | Pairs | Changed |
|---|---|---|---|---|---|---|---|---|---|---|
| combined→ap | -1.1 [-4.7, +2.4] | -0.024 [-0.225, +0.177] | +0.063 [-0.100, +0.229] | +0.185 [+0.040, +0.328] | +0.235 [+0.075, +0.400] | +0.025 [+0.005, +0.047] | -0.382 [-0.527, -0.242] | +0.334 [-0.037, +0.711] | 1000 | 920 |
| orig→ap | -4.6 [-8.7, -0.4] | -0.368 [-0.591, -0.146] | +0.155 [-0.047, +0.354] | -0.119 [-0.288, +0.050] | +0.221 [+0.040, +0.405] | +0.023 [+0.002, +0.046] | +0.030 [-0.123, +0.186] | +0.500 [+0.071, +0.931] | 1000 | 1000 |
| combined→bp | -0.8 [-2.8, +1.3] | +0.002 [-0.097, +0.099] | +0.062 [-0.024, +0.149] | +0.034 [-0.023, +0.093] | -0.033 [-0.106, +0.042] | +0.026 [+0.010, +0.046] | +0.035 [-0.038, +0.111] | +0.234 [+0.057, +0.412] | 1000 | 342 |
| orig→bp | -4.3 [-8.2, -0.4] | -0.342 [-0.556, -0.123] | +0.154 [-0.038, +0.350] | -0.270 [-0.431, -0.109] | -0.047 [-0.216, +0.126] | +0.024 [+0.003, +0.048] | +0.447 [+0.278, +0.617] | +0.400 [-0.055, +0.844] | 1000 | 997 |
| combined→c1 | +0.3 [-2.3, +2.9] | +0.037 [-0.100, +0.173] | +0.068 [-0.046, +0.184] | +0.021 [-0.074, +0.113] | +0.097 [-0.011, +0.203] | +0.002 [-0.009, +0.014] | -0.052 [-0.163, +0.059] | +0.019 [-0.242, +0.283] | 1000 | 609 |
| orig→c1 | -3.2 [-7.1, +0.8] | -0.307 [-0.526, -0.091] | +0.160 [-0.034, +0.359] | -0.283 [-0.441, -0.122] | +0.083 [-0.095, +0.258] | +0.000 [-0.014, +0.013] | +0.360 [+0.194, +0.524] | +0.185 [-0.239, +0.602] | 1000 | 996 |

### Exact arms and report locations

| Intervention | Tip arm | Combined arm | Combined report under ~/bench/ |
|---|---|---|---|
| a: no-ICE HQ penalty | `6ad9f04` | `d1b4c93` | `causal-combined-early-a-hq-no-ice.json` |
| b: remove secure bonus | `dca880c` | `e27dee6` | `causal-combined-early-b-no-secure-bonus.json` |
| c1: remove debt subtraction | `fbc0121` | `c7f2069` | `causal-combined-early-c1-no-debt-ranking.json` |
| c2: remove structural-risk penalty | `c196adc` | Not built | — |

Tip reports are `causal-early-a-hq-no-ice.json`,
`causal-early-b-no-secure-bonus.json`, `causal-early-c1-no-debt-ranking.json`
and `causal-early-c2-no-structural-penalty.json`. Historical #3 is arm
`3b80a49`, report `a2-early-3.json`; #7 is `21f93d5`, report `a2-early-7.json`.
The other early reports are `a2-early-{2,6,10}.json`, reusing the existing
`h0h1-04-b28b7bf.json`, `h0h1-08-752dbf0.json`, `h0h1-12-5de59ce.json`.
Logs are `compare-a2-early-*.log`, `compare-early-causes-*.log`, and
`compare-combined-early-*.log`. All listed follow-up reports are complete;
no queue is started or polled by this documentation update.
