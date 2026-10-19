# I2 ICE selection by marginal security
**Outcome:** adopted — phase B gate run 2 passed; `iceMarginalSecurity` defaults to on; 100 full test files passed; ready for review

**Roadmap item:** I2 · **Depends on:** I1, F2, F4, L7.1, L9.0, L9.1, F11, F12 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [scoring-risk model](../../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16), [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 15d485d (2026-10-16)

## Hand-off (2026-10-19): start here

Gate run 2 passed on 2026-10-18; the owner supplied the result on
2026-10-19. The saved reports confirm **seeds 1601–2600, 1,000 per pair**,
not the old hand-off's 401–800 suggestion (which overlapped the diagnostic
sample). This uses the larger sample offered for the bluff guard and avoids
all earlier gate, diagnostic and calibration seeds. No tolerance changed.
`iceMarginalSecurity` now defaults to on. The implementation and fix 3 were
already committed in `63fb5df`; adoption starts from `596a264`.

**Remaining diagnostic concern:** the passing gate still redistributes central
theft: R&D 2.109 → 2.454 points, HQ 1.750 → 1.347. Overall central theft
3.858 → 3.800 passes its frozen guard. The earlier sample found late R&D
protection; this run does not establish that timing is fixed. Tracked by [I2.2](../I2.2-rnd-protection-lateness-investigation.md),
to investigate before I3 design freeze; changing the ranking would need a new gate.

**Verification:** focused security, fixture and snapshot tests pass. Full
regression verification passed after merging main: 100 test files, exit 0.
Legacy fixtures explicitly disable I2 to preserve their original decision
oracles; the existing I2 fixture and strategic cases opt in. The default test
now asserts the adopted setting.

**After I2: the I2 → L8.9 → I3 → I4 path.**
- **L8.9 (observable-defense parity)**, owner decision 2026-10-16: once I2 is
  adopted, take one control measurement of the remaining tell (default
  options, which then include I2; `--collector realizedIceByRootType`, full
  pool). If the residual tell is small, park L8.9 with that evidence and go
  straight to I3; if it is still large, do L8.9 first as its spec says. Its
  place before I3 is a sequencing preference, not a dependency, and gate
  run 1 already cut the tell by about 40% (all roots) and 70% (postured).
- **I3 (remote role and root suitability)** depends on I2, F4, L8.4.
  Re-ground its spec first (`.agents/skills/reground-spec/SKILL.md`). I3
  replaces I2's pre-I3 rules in `_iceStake()` (the designated empty scoring
  remote) and fix 3's `exposureTurns` delay with its persistent scoring-remote
  role and the agendas expected there.
- **I4 (agenda installation and scoring commitment)** depends on I3.
- **I2.1 (empty-Archives reward valuation)** is `proposed`, after I2; I2 keeps
  the empty-Archives exclusion.
- Any adopted I2 changes where agendas sit, so M2 needs recalibrating (I9).

## Resolution

Implemented from `15d485d` (phase A). Phase B implemented from `343b2be`.

**Gate run 2 (2026-10-18): passed; adopted 2026-10-19.** Verified the
owner's supplied output against the saved reports in `corp-gate-run2`.
Both arms use code hash `eb706847f8f6b37f` at `596a264`; `ai_corp.js` there
matches this branch before the default flip. Pool `core-v1`, hash
`0ee4865c35412106`, committed pairs pd-tao, btl-kit, neh-zahya, pe-steve,
gateway, zwicky-magdalene, leo-topan; paired seeds 1601–2600, 1,000 per
pair, 7,000 games per arm, no failures, 6,753 changed pairs. Reports:
`baseline-f716be1421aa817b.json`, `candidate-c27934cd43510e73.json`.

**Gate command:** `node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --seeds 1601-2600 --collector centralStolen --collector corpInsolventTurns --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --collector evaluatorCallCount --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.25 --guard centralStolen.points=0.2 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05 --better gameLength=lower`

Effective Corp options in both arms: `secureScoringServerGate=false`,
`serverAtRiskInstallOverride=false`, `committedAgendaReserveBypass=false`,
`emptyArchivesRunPressure=false`, `valuelessServerDebtReset=false`,
`postureEpochs=true`, `matchLocalPostureFeedback=true`; only
`iceMarginalSecurity` differs (baseline false, candidate true). No Runner
options overridden. No start boards, full (not quick) gate.

The improvement in points stolen is +0.198 [0.128, 0.268] when oriented so
positive means better; its lower bound exceeds zero. Every guard's paired
95% interval excludes regression beyond its unchanged tolerance. Full output:

```text
baseline: playing 7000 games
baseline: 7000 games, 0 failed, 2184 s; .ai-batch-cache/baseline-f716be1421aa817b.json
candidate: playing 7000 games
candidate: 7000 games, 0 failed, 1933 s; .ai-batch-cache/candidate-c27934cd43510e73.json
7000 paired games, 6753 changed by the options
  metric                               baseline  candidate  difference  95% interval
  centralStolen.points                    3.858      3.800      -0.058  [-0.129, +0.013] (lower is better)
  corpInsolventTurns                      1.365      1.540      +0.175  [+0.120, +0.231] (lower is better)
  gameLength                             15.337     14.906      -0.431  [-0.584, -0.276] (lower is better)
  pointsScored                            3.885      4.263      +0.378  [+0.299, +0.458] (higher is better)
  pointsStolen                            6.018      5.820      -0.198  [-0.268, -0.128] (lower is better)
  strandedUnrezzedIceCost.credits         1.841      1.946      +0.105  [+0.036, +0.173] (lower is better)
  winRate                                 0.350      0.397      +0.047  [+0.033, +0.062] (higher is better)
  bluffSingleVariableCorrelation.max   paired batch: baseline 0.2411752979 candidate 0.201308324 difference -0.03986697387 95% interval [-0.08343049802, 0.002790521174] (lower is better; 200 resamples; 0 dropped pairs)
  realizedIceByRootType.allCountCorrelation paired batch: baseline 0.2658256717 candidate 0.14879253 difference -0.1170331416 95% interval [-0.1422791892, -0.09274618384] (lower is better; 200 resamples; 0 dropped pairs)
  realizedIceByRootType.posturedCountCorrelation paired batch: baseline 0.204299994 candidate 0.08753030846 difference -0.1167696856 95% interval [-0.1641263339, -0.07286751358] (lower is better; 200 resamples; 0 dropped pairs)
  realizedIceByRootType.allCountDistance batch: baseline 0.217 [0.204, 0.230]  candidate 0.148 [0.138, 0.160] [diagnostic]
  realizedIceByRootType.posturedCountDistance batch: baseline 0.187 [0.167, 0.210]  candidate 0.152 [0.135, 0.192] [diagnostic]
  PASS changed option effect
  PASS guard winRate tolerance 0.03
  PASS guard pointsScored tolerance 0.25
  PASS guard centralStolen.points tolerance 0.2
  PASS guard gameLength tolerance 1.5
  PASS guard corpInsolventTurns tolerance 0.5
  PASS guard strandedUnrezzedIceCost.credits tolerance 1
  PASS guard bluffSingleVariableCorrelation.max tolerance 0.02
  PASS guard realizedIceByRootType.allCountCorrelation tolerance 0.05
  PASS guard realizedIceByRootType.posturedCountCorrelation tolerance 0.05
  PASS improve pointsStolen
Gate: passed
```

Diagnostics: `evaluatorCallCount.computationsPerMainDecision` 8.631 →
8.620; `installOutcomes.trapTriggers` 0.244 → 0.234. R&D/HQ theft and the
remaining timing concern are recorded in the Hand-off.

**Adoption verification (2026-10-19):** focused tests pass (193 security
cases, 72 fixture checks over 18 fixtures, 13 snapshot tests). The initial full suite failed in `corp-install-decisions.test.js` because
its I0/I1 harness inherited the newly enabled I2 policy. The harness now
explicitly selects its legacy policy, with all 16 telemetry cases passing.
After merging main (`e72232a`) and adding opt-in `--diagnose` timing output,
the full suite passed: 100 test files, exit 0; log `/tmp/i2-main-merge-tests.log`, exit status
`/tmp/i2-main-merge-tests.status`.

**Owner decisions (2026-10-16), after phase A.**
- The breach-hazard table is accepted as calibrated (option 1 of three
  offered): its held-out reliability check failed narrowly (below), but phase
  B only compares options with it, and phase B's own F4 gate decides adoption.
  The check's rule is not rewritten. If phase B's gate fails, a better M2
  (different cells or estimator) is the follow-up.
- No split: phase B continues in this ticket, on the same branch, as soon as
  phase A is committed; it does not wait for a phase-A merge.
- Phase B uses horizon `H = 1`, because the next-turn check failed.
- `_breachHazard()` picks the table's `single` (0–1 ICE) or `multi` (2+ ICE)
  row from the server's ICE count, so a hypothetical install that adds the
  second ICE moves the server to the `multi` row automatically.
- L8.2 was not adopted (its gate failed; PR #55 closes it), so the L8.2/I2
  ordering decision is: I2 does not wait for L8.2, and its control needs no
  L8.2 policy. PR #55 does keep a passive observer correction: roots with no
  activation record are labelled `unrolled`, which raised known posture labels
  from about 86% to about 99.6% in L8.2's control runs. **First step of phase
  B:** PR #55's branch (`backlog/feature-layer-8-2-remote-deception-profiles`)
  is already merged into this branch (2026-10-16, while #55 awaits review;
  merge it again after any further review fixes). Run a
  control-only pool batch with `realizedIceByRootType` and check F12's
  readiness rule (≥90% known posture labels, ≥10 commitments and ≥5 games per
  class). If the pool meets it, move the
  `realizedIceByRootType.posturedCountCorrelation` guard back onto the pool
  command and drop the `i2-posture` start boards and their criterion. Record
  that before any phase B gate result exists. If the pool still fails the
  rule, keep the posture command as written.

**What changed (observation-only).**
- **M4.** `AIApproachDefense(server, context)` on Manegarm Skunkworks and
  Anoetic Void (`sets/systemgateway.js`, at the bottom with their AI hooks),
  documented in `documentation/ai.md` 5.5. Void's `AIWouldTrigger` takes an
  optional `server` (existing no-argument callers unchanged). `_approachDefenses()`
  feeds `_addHonestVerdict()` only: runner options are a layer after the
  innermost ICE, Corp end-the-run uses add to global ETR. Compatibility fields
  and `_hasDefensiveUpgrade()` unchanged.
- **M1.** `_addHonestVerdict()` records `honestRoute`, `honestClickBudget`,
  `honestClickCredits`, `approachDefense`; `_breachMargin()` per the spec.
- **M2.** `_breachMarginBucket()`, `_breachKind()`, `_projectedRunnerIncome()`,
  `_breachHazard()`, `CORP_AI_BREACH_HAZARD_TABLE` and `CORP_AI_POINT_VALUE`
  (4.4) at the top of `ai_corp.js`.
- **Calibration.** `securitySnapshot` (headless.js) emits `kind`, `margin`,
  `upperBound`, `bucket`, `bucket2`, `iceCount`, `publicThreatRisk`,
  `approachDefense` and a server `signature`; `securityCalibration` keeps
  per-game rows through `samples()` and pooled cells through `summarize()`
  (its `finish()` metrics are unchanged). `scripts/ai-batch/breach-hazard-table.js`
  builds the table and runs the checks.

**Departures from the spec / plan.**
- Manegarm's hook returns `null` when the breach would be lethal (its own
  `AIWouldTrigger` policy). Void's credits are `spendableCredits` after the ICE
  rez plan (plan, approved). The restricted-credit path gets M4 through a
  single priced route layer and its margin is clamped to the calculator's own
  feasibility (plan, approved).
- Scenario 2's "one with neither is honestly locked out": in M1 terms the
  route is infeasible (`honestIsSecure` true, negative margin), not
  `honestLockout`; the test asserts that.
- The AI's default `_breachKind()` uses public state: a remote with any root
  card uses the `agendaRemote` row. The table itself is measured on true
  agenda remotes (harness-only), as the spec allows.
- One-ICE check differed (below), so, as the spec requires, the table is split
  by public ICE count: `single` (0–1 ICE; the spec's "1" group also takes
  0-ICE servers, which need a row) and `multi` (2+). Next-turn rows carry no
  ICE count, so the next-turn check uses the unsplit table.
- Thin-cell rule: the thinnest cell merges first, into its thinner neighbour.

**Calibration** (`documentation/corp-ai/measurements/I2-15d485d-breach-hazard-calibration.json`,
raw reports kept locally; built on the phase-A working tree over `15d485d`,
game play identical to `15d485d` per the identity run). Pool `core-v1`
(7 pairs), default options, `--collector securityCalibration`; fit seeds
1001–1400 (2,800 games), held-out 1401–1600 (1,400 games), 0 failures.
`POINT_VALUE` 4.4 over 67 agenda copies.
- **Reliability check: failed.** Unsplit table: count-weighted MAE 0.0063
  (limit 0.05) but 7 cells with ≥100 held-out server-turns miss their
  game-clustered 95% interval (largest: `agendaRemote >=10` predicted 0.260,
  observed 0.299 [0.278, 0.320]; `hq 5..9` 0.147 vs 0.136 [0.127, 0.145]).
  Split table rerun: MAE 0.0071, 7 of 47 checked cells miss
  (e.g. `agendaRemote:multi >=10` 0.245 vs 0.294 [0.261, 0.329]). One miss in
  each run is a zero-event cell whose bootstrap interval is [0, 0]. The misses
  are a few points, mostly where isotonic pooling or the fit/held-out
  difference exceeds narrow large-cell intervals; the rule does not allow for
  the prediction's own sampling error. Per the spec, **phase B is blocked**.
- **Next-turn check: failed** (MAE 0.0287; 15 cells miss). Turn-2 hazard at
  `margin + income` overpredicts systematically (e.g. `otherRemote >=10`
  0.146 vs 0.076). If phase B proceeds it uses horizon 1.
- **One-ICE split: differs** in 9 kind × bucket cells (e.g. `rd 5..9`
  one-ICE 0.174 vs multi 0.260; `agendaRemote 2..4` 0.192 vs 0.141).

**Identity run.** I0's F4 configuration
(`node scripts/ai-batch.js --jobs 4 --collector corpInsolventTurns --collector installOutcomes --collector stallTurns --collector successfulRunsByServer --collector unusedCreditsAtEnd --collector securityCalibration`,
7 pairs × 200 seeds) at `15d485d` (clean worktree) and at the phase-A working
tree: 1,400 of 1,400 games identical in `winner`, `turns`, `logHash` and
`decisionHash`; 0 failures either side. Decision snapshots are identical to the
recorded baseline (`tests/decision-snapshots.test.js` and
`tests/corp-decision-fixtures.test.js` pass unchanged). Corp
`decisionLatencyMs` mean 6.53 → 6.49 ms, p95 32.8 → 32.5 ms (no measurable
change).

**Tests.** `tests/corp-server-security.test.js` (scenarios 1–3, 6),
`tests/L9.1-unpriceable-breakers.test.js` (unknown margin and `upperBound`),
`tests/security-calibration-collector.test.js` (scenario 4),
new `tests/breach-hazard-table.test.js` (scenario 5). New
`tests/breach-margin-invariant.js` checks the M1 invariant on every security
evaluation in the security, L9.1 pricing and L9.1 unpriceable suites
(all L9.0/L9.1 fixtures). On real games the invariant also held exactly:
1,185 of 1,185 honest-insecure server-turns in a 21-game smoke run had
non-negative margins.

**Audit (playable sets).** Corp approach-time root costs: Manegarm Skunkworks
and Anoetic Void (System Gateway), both updated. System Update 2021, Elevation
and Vantage Point have none; Maintenance Access (Elevation) and Baker (Vantage
Point) hook server approach but are Runner cards; Flagship is breach
prevention (out of scope). None missed.

**Gate:** passed — `iceMarginalSecurity` now defaults to on. Phase B F4 gate run 2 evidence follows; the earlier run remains below for provenance.

**Phase B first step: posture coverage (2026-10-16, before any phase B code
or result).** PR #55's branch is merged here (`343b2be`). Control-only pool
batch at `343b2be`, default options, seeds 1–200, `--collector
realizedIceByRootType`: 1,400 games, 0 failures; known posture labels 99.66%
(33 unknown of 9,672 unrevealed observations); postured agenda/trap 360/312
commitments in 309/268 games; `validateBatch` passes for
`posturedCountCorrelation` and `allCountCorrelation`
([evidence](../../corp-ai/measurements/I2-343b2be-posture-coverage.json)). The pool
meets F12's readiness rule, so the
`realizedIceByRootType.posturedCountCorrelation=0.05` guard is on the pool
command, and the posture command, its `i2-posture` boards and their criterion
are dropped (`## Acceptance gate`). This also removes the replay
snapshot-saving work the boards needed.

**Phase B: what changed** (option `iceMarginalSecurity`, initially default off; plan
approved 2026-10-16).
- `CorpAI.DEFAULT_OPTIONS.iceMarginalSecurity = true` after gate run 2 passed (initially false).
- With the option on, `_rankedInstallOptionsCore()` builds both ICE groups
  (protection, new-server fallback) from `_marginalIceInstallOptions()`
  instead of `_serverToProtect(…, targetIsEligible)`: every
  `_rankedServersToProtect()` row that is not `_nothingWorthProtecting()` and
  whose `_iceLayerPolicy()` allows a layer, with that server's legacy
  `_iceInstallOptions()` list (now optionally tagged with its legacy group).
  Sort: legacy group, then `_marginalIceScore()`, then walk order. Option off,
  both paths are the legacy code.
- `_iceStake()`, `_isAgendaOrTrap()`, `_meanAgendaPoints()`,
  `_highestAgendaPointsInHQ()`, `_marginalIceBefore()`,
  `_detachedRemoteEvaluation()`, `_marginalHazard()` (H = 1),
  `_marginalIceScore()`; `scoreBreakdown` fields `stake`, `kind`,
  `hazardBefore`, `hazardAfter`, `stolenBefore`, `stolenAfter`,
  `rawRiskReduction`, `riskReduction`, `installCost`, `plannedRezCost`,
  `score`. I1 records for these options are band 1 and carry the breakdown;
  the snapshot trace adds `score`.
- Option-independent refactors (decision-identical): `_hazardForMargin()`
  split out of `_breachHazard()`; the evaluator records `plannedRezIce`;
  `_criticalBreachDefenseAction()` evaluates candidates through
  `_hypotheticalServerAfterInstall()`.
- Harness: observation-only `iceInstall` / `iceRez` events
  (`scripts/ai-batch/headless.js`) and the `strandedUnrezzedIceCost`
  collector (`credits`), documented in `documentation/ai-batch-harness.md`.
- Empty-Archives disposition: exclusion kept; follow-up
  [I2.1](../../corp-ai/specs/I2.1-empty-archives-reward-valuation.md) filed as
  `proposed` with an F4 gate; the design note's gap row now names it.

**Phase B: departures from the plan / spec.**
- Plan item 5: the critical interrupt shares the hypothetical builder but not
  I2's memoised evaluation. It measures `_centralBreachLossRisk()`, not M1/M2,
  so reusing I2's result would change its oracle; scenario 20 asserts the
  shared builder and an unchanged pick instead.
- Scenario 8: the honest model lets the Runner find a missing breaker while
  the Grip holds cards, so the lockout board has an empty Grip.
- Scenario 16's band-2 part asserts that centrals (the interrupt's only
  targets) are never posture-capped (validation 2).
- Scenario 17: no declared-reserve term exists (validation 3), so there is no
  reserve difference to log.
- Scenario 18: new green fixture
  `tests/fixtures/corp-decisions/i2-baker-backdoor-marginal-security.txt`
  (the Baker board with the option on, all cache modes).
- Test isolation: earlier cases in `tests/corp-server-security.test.js` leave
  instance stubs over prototype methods (`_evaluateServerSecurity` among
  them); the phase B board helper removes them before each case.

**Phase B: tests.** `tests/corp-server-security.test.js`: option default,
scenarios 7–20 and "ordinary ICE generation does not call the filtered
`_serverToProtect`" (176 → 192 cases). `tests/ai-batch-install-outcomes.test.js`:
scripted `strandedUnrezzedIceCost` case and real-engine `iceInstall`/`iceRez`
wrapper checks (paid install, free rez). Scenario 21: decision snapshots and
corp-decision fixtures pass unchanged with the option off.

**Phase B: cards.** No card hook is added or changed; I2 reads existing
hooks (`AIWorthwhileIce`, and M4's `AIApproachDefense` through the
evaluator). No card in the playable sets needs an update.

**Phase B: verification before the gate.** `node tests/run-all-tests.js`:
98 test files passed. Option-off identity: the full pool (seeds 1–200,
`--collector realizedIceByRootType`) at the phase B working tree matches the
`343b2be` coverage report on `winner`, `turns`, `logHash` and `decisionHash`
for 1,400 of 1,400 games, 0 failures. Quick gate (`--quick`, 350 games, not
evidence): `PASS changed option effect`. Indicative only: `pointsStolen`
+0.137 [−0.186, +0.466], `centralStolen.points` +0.354 [+0.011, +0.700].

**Gate command:** `node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --games 400 --collector centralStolen --collector corpInsolventTurns --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --collector evaluatorCallCount --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.25 --guard centralStolen.points=0.2 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05 --better gameLength=lower`

**Gate run 1 (2026-10-16): failed** — `iceMarginalSecurity` remained off at that stage.
Command above, run in a separate worktree of the phase B tree over `343b2be`.
Committed pool (7 pairs: pd-tao, btl-kit, neh-zahya, pe-steve, gateway,
zwicky-magdalene, leo-topan), paired seeds 1–400, 2,800 games per arm; 1
baseline game failed, so 2,799 pairs; 2,706 changed by the option. Baseline
→ candidate, difference [bootstrap 95%]:

| Check | Metric | Baseline | Candidate | Difference | Result |
|---|---|---|---|---|---|
| Improve | `pointsStolen` | 5.980 | 5.860 | −0.120 [−0.230, −0.009] | PASS |
| Guard 0.03 | `winRate` | 0.357 | 0.392 | +0.034 [+0.011, +0.057] | PASS |
| Guard 0.25 | `pointsScored` | 3.898 | 4.204 | +0.306 [+0.180, +0.434] | PASS |
| Guard 0.2 | `centralStolen.points` | 3.755 | 3.864 | +0.109 [−0.005, +0.224] | **FAIL** |
| Guard 1.5 | `gameLength` | 15.362 | 14.722 | −0.640 [−0.888, −0.392] | PASS |
| Guard 0.5 | `corpInsolventTurns` | 1.474 | 1.619 | +0.144 [+0.054, +0.235] | PASS |
| Guard 1 | `strandedUnrezzedIceCost.credits` | 1.837 | 1.970 | +0.133 [+0.021, +0.245] | PASS |
| Guard 0.02 | `bluffSingleVariableCorrelation.max` | 0.2469 | 0.2094 | −0.0375 [−0.0918, +0.0350] | **FAIL** |
| Guard 0.05 | `realizedIceByRootType.allCountCorrelation` | 0.2419 | 0.1474 | −0.0945 [−0.1337, −0.0555] | PASS |
| Guard 0.05 | `realizedIceByRootType.posturedCountCorrelation` | 0.2033 | 0.0553 | −0.1480 [−0.2158, −0.0870] | PASS |

Diagnostics: `allCountDistance` 0.221 → 0.148, `posturedCountDistance`
0.213 → 0.185. Output ends `Gate: failed`.

Reading: the central-theft guard fails on a real direction (central theft
up, remote theft down by more), the pattern this ticket's design was meant
to avoid. The bluff guard fails on width: its point estimate improves, and
at 400 seeds per pair its interval is wider than the 0.02 tolerance allows.
**Owner decision (2026-10-16):** do not close as not adopted yet; diagnose
where ICE moved between servers before deciding a fix. Any rerun uses fresh
seeds (not 1–400).

**Open.** R&D lateness remains a diagnostic concern (Hand-off); no additional I2 policy change is included. Architecture: [server security evaluation](../../corp-ai/architecture.md#server-security-evaluation),
[install planning today](../../corp-ai/architecture.md#install-planning-today).

## Implementation plan (phase B)

Proposed at `343b2be`, 2026-10-16. **Approved 2026-10-16**, amended by the
owner: gate at 400 seeds per pair (2,800 games per arm) and no separate
control-calibration cohorts (see `## Acceptance gate`).

- **Classification:** strategic preference (which legal ICE/server pair is
  better) → F4 gated behind `iceMarginalSecurity`, default off. Ungated
  parts: none that change a choice; the option-independent refactors below
  must be decision-identical.
- **Validation** (where the design does not match code at `343b2be`):
  1. *Bands.* I1 assigns only band 0 (compatibility) and band 3 (win); the
     records are telemetry, and `_rankedInstallOptions()` still returns legacy
     list order to `_bestInstallOption()`. Phase B therefore has to reorder
     the real option list, not only records. Per the design note's band rule,
     protection ICE becomes the first class migrated to band 1 and is ranked
     only within its class; class/group positions in
     `_rankedInstallOptionsCore()` stay as they are. "Band 2" is the existing
     `_criticalBreachDefenseAction()` interrupt, not a record band.
  2. *Posture cap already exists.* `_NoMoreProtectionForThisServer()` drops a
     postured remote from `_rankedServersToProtect()` once `ice.length >=
     targetIce` (equivalent to the spec's `ice.length + 1 <= targetIce`), from
     the authoritative `_deceptionPostureActive()` read. No new cap code;
     scenario 16 asserts it with the option on. The band-2 override is
     unreachable for remotes today: the critical interrupt only covers HQ and
     R&D, which carry no posture. Scenario 16's band-2 part asserts that the
     cap never touches the interrupt; a remote band-2 path is I4's, not I2's.
  3. *`reserveCost` and extra-click `opportunityCost` do not exist* (only
     `_reserveCreditsForCard()` in a reserve list). An ICE install always
     costs exactly one click, so `opportunityCost` is 0 by construction.
     Proposal: omit both terms rather than invent them; cross-action costs
     are I7.1's. Score = `riskReduction − installCost − plannedRezCost`.
  4. *Rez plan not exposed.* The evaluator picks `bestCards` but returns only
     totals and reasons. Add one observation-only result field
     (`rezPlanIce`, the planned unrezzed ICE); compatibility and honest fields
     unchanged.
  5. *Shared hypothetical.* `_hypotheticalServerAfterInstall()` has no
     production caller; `_criticalBreachDefenseAction()` runs its own inline
     `_withHypothetical()` with the same charge (`ice.length`, outermost
     layer). Step 7 becomes an option-independent refactor: the critical path
     calls the shared helper (decision-identical, checked below); with the
     option on it reuses I2's memoised after-evaluation for the same
     `(card, server)` in the same decision. Thresholds unchanged.
  6. *`AIWorthwhileIce` rejections* sit in the low-priority
     (`_notAffordableIce`) group and are still offered when `!priorityOnly`.
     To keep admission and "may reject but not order" honest, sort key is
     `(legacy group: affordable before low-priority, score,
     compatibilityOrder)`. Departure from step 6's "score, then
     compatibilityOrder": without it a card-rejected ICE could outrank every
     worthwhile one on an evaluator that does not know why it was rejected.
  7. *`_protectionInstallsThisTurn`.* Legacy uses it as a soft preference
     (first insecure server not protected this turn). With the option on that
     preference is replaced by the marginal score: a second same-turn layer
     is re-evaluated on the live server after the first install, so its value
     falls naturally. Recording (`_recordProtectionInstall()`, debt aging)
     stays authoritative and unchanged. Reading step 8 this way is a
     judgement call; flagging it.
  8. *Row switch can make raw reduction negative.* `_breachHazard()` picks
     `single`/`multi` from `server.ice.length`, and some `multi` cells sit
     above `single` ones (e.g. `rd 5..9` 0.260 vs 0.174), so a second layer
     that does not change the bucket can raise predicted hazard. Clamp
     `riskReduction` to its stated bound `[0, POINT_VALUE × pointsToWin]` and
     log the unclamped value in `scoreBreakdown`.
  9. *H = 1* collapses step 4's two formulas to `P × h_1` for every server.
  10. *Mean agenda points.* No deck-list helper exists. Add
      `_meanAgendaPoints()` over the Corp's own agenda cards in all zones
      (the Corp's own deck list, not hidden Runner state), memoised per game.
  11. *Baker interim.* Roadmap still lists L3.5.2's Baker play-test as
      failing ("Interim until I1–I2"). Scenario 18 covers the committed
      fixture; the play-test is not claimed fixed unless its board also
      passes with the option on.
- **Approach:**
  1. `CorpAI.DEFAULT_OPTIONS.iceMarginalSecurity = false` (the batch CLI
     validates names against this object).
  2. New `_marginalIceCandidates(cards, priorityOnly, economyCheck)`:
     servers = `_rankedServersToProtect()` entries (including the `null` new
     remote when legacy admits it) not `_nothingWorthProtecting()` and with
     `_iceLayerPolicy().allowed`; ICE = exactly the legacy
     `_iceInstallOptions(server, …)` list for that server. Per decision,
     memoise the before-evaluation per server and the after-evaluation per
     pair via `_hypotheticalServerAfterInstall()`.
  3. `_iceStake(server)`: step 3 rules. Common agenda/trap stake
     `_meanAgendaPoints()` (also active bait/bluff posture); pre-I3 designated
     scoring remote gets HQ's highest agenda points; centrals use
     `_breachConsequence().pointsExposed`; all capped at points to win. Kind
     passed explicitly: stake > 0 → `agendaRemote`, else `otherRemote`.
     Stake feeds only this score (never `_protectionScore()`,
     `_isAScoringServer()`, `_scoringWindow()`).
  4. `_marginalIceScore(pair)`: `stolen = P × h_1`; unknown rules from step 5
     (needs a pure `margin → hazard` lookup split out of `_breachHazard()`,
     identity-preserving, so `upperBound` can be used without coercing
     `null`). `scoreBreakdown`: `stake`, `hazardBefore`, `hazardAfter`,
     `rawRiskReduction`, `riskReduction`, `installCost`, `plannedRezCost`,
     `score`; option reason string names server, margins and score.
  5. In `_rankedInstallOptionsCore()`, with the option on: the protection
     group (5884) offers existing-server pairs in I2 order; the new-server
     fallback (6042) offers `null`-server pairs in I2 order, or, when an
     empty protected remote exists, the same I2 list. Neither calls
     `_serverToProtect(…, targetIsEligible)`; option off, both paths are
     byte-for-byte legacy. `_serverToProtect()` stays for its other callers
     (upgrades, card hooks, debug).
  6. `_installCandidateRecords()`: option on, protection-ICE records carry
     `band: 1` and the I2 `scoreBreakdown`.
  7. Collector `strandedUnrezzedIceCost` (`credits`, lower): sum of install
     costs of ICE instances never rezzed between install and game end or
     leaving play, from the existing `install`/`rez`/`leave` events (as
     `installOutcomes` uses).
  8. Empty-Archives disposition: keep the exclusion; file a `proposed`
     roadmap follow-up with a spec and gate for non-agenda reward valuation,
     and update the design note's gap reference. Not implemented in I2.
  - *Rejected:* scoring inside `_serverToProtect()` (it returns one server;
    I2 compares pairs across servers); a new posture cap (duplicates
    `_NoMoreProtectionForThisServer()`); dropping legacy group order (see 6).
- **Tests:** new `tests/I2-ice-marginal-security.test.js`, option on,
  scenarios 7–20, each asserting the choice and the logged reason /
  `scoreBreakdown` ordering (not numbers); scenario 21 is the existing
  decision-snapshot and corp-decision fixture suites, unchanged. Unit tests
  for `_iceStake()`, the hazard lookup split (identical to `_breachHazard()`
  on all table cells), the clamp, and `null` handling. Collector test with
  scripted install/rez/leave events. Option default-off check beside the
  existing defaults test.
- **Risk:** option on changes ordinary protection server and ICE choice
  everywhere, which the gate measures. Option off: the refactors (critical
  path via shared helper, hazard lookup split, `rezPlanIce` field) must be
  decision-identical; check with the snapshot/fixture suites and a 1,400-game
  option-off pool run compared on `winner`, `turns`, `logHash`,
  `decisionHash` with the coverage report already recorded at `343b2be`.
  Cost: one before-evaluation per allowed server plus one hypothetical per
  pair per decision; watch `evaluatorCallCount` in the quick run.
- **Gate setup, then gate:** after the full suite passes: (a) `--quick`
  gate run, record its first line; (b) full gate (400 seeds per pair, 5,600
  games, about 25 minutes), run in a separate worktree so other work can
  continue, launched once in the background with completion notification. If it cannot finish in the session, hand off
  `**Gate:** pending F4` with the ready command.
- **Docs:** `documentation/corp-ai/architecture.md` install-planning section
  (option-on behaviour); `documentation/ai-batch-harness.md` for the new
  collector; `documentation/ai.md` only if a hook contract changes (none
  planned: `AIWorthwhileIce` keeps its contract); roadmap follow-up for
  empty-Archives; design-note gap reference.

## Implementation plan (phase A, done)

Phase B needs its own `## Implementation plan` (plan gate: it changes a shared
decision heuristic); this approved plan covers phase A only.

Proposed at `15d485d`, 2026-10-16, for **phase A only** (phase B is a later
pickup). **Approved 2026-10-16.**

- **Validation:** Current behaviour re-checked at `15d485d` (no `*.js` change
  since `60fa0d7`): `_addHonestVerdict()`, `_honestRouteVerdict()`,
  `_hasDefensiveUpgrade()`, `_globalETRUses()`, `_projectedRunnerRuns()`,
  `_canFundRezPlan()` match the text; the honest fields are read only by
  `headless.js` `securitySnapshot` and `securityCalibration`, so phase A
  cannot move a decision. `_breachMargin`, `_breachHazard`,
  `_projectedRunnerIncome`, `AIApproachDefense` and both constants do not exist.
  Gate classification: phase A's oracle is objective (observation-only
  identity, log/decision-hash parity); phase B stays F4-gated as written.
  Approach-time audit of the playable sets: only Manegarm Skunkworks and
  Anoetic Void (System Gateway) are Corp root approach effects; Maintenance
  Access (Elevation) and Baker (Vantage Point) also hook server approach but
  are Runner cards. Where I disagree or the spec is underspecified:
  1. **Manegarm is conditional in this engine.** Its `AIWouldTrigger` declines
     when `_potentialDamageOnBreach()` exceeds the Grip (the Corp prefers the
     lethal breach). Its hook returns `null` in that case, computed from the
     `server` argument (the existing `AIWouldTrigger` reads `attackedServer`).
  2. **Void's credits compete with the ICE rez plan.** "Spendable credits" is
     `Credits(corp)` minus the chosen plan's unrezzed ICE rez cost and the rez
     cost of counted unrezzed root defences, passed to the hook as
     `AIApproachDefense(server, {spendableCredits})` (Void's own 2-credit
     reserve is the use cost, so it is not subtracted again).
  3. **Restricted-credit path.** That path has no honest layers and its
     `RunCalculator` route exposes no click split. M1 there is
     `C − honestMandatoryBreakCost` when the route is feasible, and
     `−Infinity` when no route exists (cost is `Infinity`; bucket `lockout`).
     M4 on that path: `corpEndsRunUses` lockout applies; `runnerOptions` are
     appended as a second layer after a single `{credits: cost, clicks: 0}`
     route layer. This path is rare; the M1 invariant test covers it.
- **Approach:**
  1. `AIApproachDefense(server, context)` on Manegarm and Void, placed with
     their AI hooks; pure. Document in `ai.md` 5.5.
  2. `_approachDefenses(server, plan)` in `ai_corp.js`: collects hook results
     for root cards (rezzed, or unrezzed and `_canFundRezPlan(planUnrezzedIce
     + [card])`). `_addHonestVerdict()` appends one `{card, options:
     runnerOptions}` layer after the innermost ICE (repeated under global ETR
     like ICE layers) and adds `corpEndsRunUses` to `globalETRUses` for the
     honest route only (covering `_projectedRunnerRuns()` → `honestLockout`).
     Compatibility fields and `_hasDefensiveUpgrade()` untouched.
     `_addHonestVerdict()` also records `honestRoute {credits, clicks}`,
     `honestClickBudget`, `honestClickCredits`, `approachDefense` (bool).
  3. `_breachMargin(server, evaluation)` → `{margin, upperBound}` per the spec;
     `_projectedRunnerIncome()`; `_breachHazard(server, turnsAhead,
     evaluation)` table lookup by kind × bucket. Kind from public state:
     `agendaRemote` = remote with an installed root card (the AI cannot see
     whether it is an agenda; phase B's common stake handles agenda/trap).
     The collector uses the true root type, as the spec allows.
  4. `CORP_AI_BREACH_HAZARD_TABLE` and `CORP_AI_POINT_VALUE` frozen at the top
     of `ai_corp.js`.
  5. `securitySnapshot` adds `kind`, `margin`, `upperBound`, `iceCount`,
     `publicThreatRisk`, `approachDefense`; `securityCalibration` adds
     `byBucket[kind][bucket] = {turns, breached}` (existing outputs unchanged).
  6. `scripts/ai-batch/breach-hazard-table.js`: report(s) → table (isotonic per
     kind, cells under 200 merged with a neighbour), POINT_VALUE from the pool's
     Corp decks, and the held-out reliability, next-turn and one-ICE checks.
  7. Runs: fit seeds 1001–1400 and held-out 1401–1600 on the committed pool,
     default options, `--collector securityCalibration`. Commit report, table
     and provenance to `documentation/corp-ai/measurements/I2-<sha>-breach-hazard-calibration.json`.
  Rejected: calling Manegarm's existing `AIWouldTrigger` from the evaluator
  (reads the live `attackedServer`); a hook with no context (Void would
  double-spend the ICE rez plan's credits).
- **Tests:** new `tests/corp-breach-margin.test.js` (scenarios 1–3, 6, incl.
  the margin/`honestIsSecure` invariant over the L9.0/L9.1 fixtures),
  extend `tests/security-calibration-collector.test.js` (scenario 4), new
  `tests/breach-hazard-table.test.js` (scenario 5, constant equals script
  output). No existing expectation changes.
- **Risk:** M4 shifts the `honest` collector group on Manegarm/Void boards
  (observation only). Evaluator cost rises slightly (one hook pass per root
  card); measured as Corp `decisionLatencyMs` in the identity run. Identity:
  I0's F4 configuration with `--collector securityCalibration` at `15d485d`
  (git worktree) and at phase A's head, 7 pairs × 200 seeds; every per-game
  `winner`, `turns`, `logHash`, `decisionHash` must match, and decision
  snapshots must equal the baseline. If the reliability check fails, phase A
  still hands off with the evidence and phase B is recorded as blocked.
- **Docs:** `ai.md` 5.5 (new hook; `tests/ai-hook-docs.test.js`),
  `architecture.md` honest-security section (M1/M2/M4 observation fields),
  roadmap entry, this ticket's Resolution.

All formal prerequisites are `done` as of 2026-10-16. L7.1 closed **not
adopted**: its `_breachConsequence()` signal exists and is tested but no
production decision reads it. F11 delivered paired pooled batch-metric guards;
F12 delivered the `realizedIceByRootType` collector and a control calibration.

## Goal

Choose the `(ICE, server)` pair that most reduces the agenda points the Runner
is expected to steal, net of the ICE's cost, instead of the first affordable
ICE in input-card order for one pre-chosen server. I2 is the first consumer of
the shared [scoring-risk model](../../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16):
it builds the shared measurements M1, M2 and M4 (phase A, observation-only),
then ranks ICE with them behind its own option (phase B).

**Why this design.** Turning a security measurement into a shared yes/no gate
has twice made the Corp weaker: [`fa1182c`](../../corp-ai-regression/findings.md#causal-test-on-the-harness-tip)
("never score into an insecure remote") and the
[L9.0.1 gate failure](../done/L9.0.1-adopt-honest-lockout.md#resolution)
(global honest verdict: winRate −0.029, pointsScored −0.282, pointsStolen
+0.176; remote theft fell while central theft rose). The owner's 2026-10-14
playtests saw agendas held in HQ and agendas left in weak remotes. The redesign
asks "how many points do I expect to lose?" in real units: a graded breach
margin (M1), a measured breach probability per margin (M2), and points at
stake. The previous draft's uncalibrated `securityDelta` weights
(0.6/0.25/0.15), soft-lockout 0.7, ×8 scale, `consequenceWeight` floor and
`futureValue` are **not** used by I2. Per [principle 6](../../corp-ai/principles.md#6-shared-measurements-consumer-owned-decisions),
M1/M2/M4 are shared; only I2's ranking consumes them here. I3 and I4 adopt
them through their own options and gates.

## Current behaviour

For ordinary protection, `_iceInstallOptions()` lists affordable ICE in
input-card order, then low-priority ICE when `priorityOnly` is false, for the
one server `_serverToProtect(false, false, targetIsEligible)` picks; the
predicate (L3.5.2's interim bridge) calls `_iceLayerPolicy()`, whose `allowed`
result `_shouldInstallIceLayer()` also wraps. The low-priority group includes
ICE rejected by `AIWorthwhileIce(server, "install")`; `_iceInCardsCommon()`
applies a combined install/existing-unrezzed-cost admission check. No ICE is
compared with another by its effect. A separate path offers ICE for a new
remote; when an empty protected remote exists it re-runs `_serverToProtect()`.
`serverAtRiskInstallOverride` (the final admission OR term) defaults to
`false`. Empty Archives without an HQ backdoor is excluded by
`_nothingWorthProtecting()` while `emptyArchivesRunPressure` is `false`.

I1's `_installCandidateRecords()` preserves legacy ordering, records unoffered
pairs as ineligible diagnostics (`band`, `compatibilityOrder`,
`scoreBreakdown`, `eligible`, `rejectionReasons`) and scores nothing.
`_hypotheticalServerAfterInstall()` adds the ICE as the outermost layer,
subtracts install cost and restores through `_withHypothetical()`, or
evaluates a detached `AIHypothetical` remote.

`_evaluateServerSecurityUncached()` returns the compatibility verdict
(`isSecure`, `hasHardLockout`, `totalMandatoryBreakCost`) that decisions read,
plus L9.0's observation-only honest fields (`honestIsSecure`, `honestLockout`,
`honestMandatoryBreakCost`, `honestKnownMandatoryBreakCost`). No decision reads
the honest fields; only the harness `securitySnapshot` and the
`securityCalibration` collector do. `_addHonestVerdict()` picks one route with
`_honestRouteVerdict(layers, credits, clickBudget, clickCredits)` but stores
only its total. Unknown breaker prices give `null` costs; an unpassable route
gives `Infinity`. [L9.0.2](../../corp-ai/specs/L9.0.2-consumer-specific-honest-security.md)
proposes separate per-consumer honest options (`honestIceLayerAdmission`,
`honestCriticalRez`).

`securityCalibration` buckets each server-turn only by verdict
(`current`/`honest` × `all`/`agendaRemote`): secure or not, breached or not.

Approach-time root defences are invisible to the evaluator. Manegarm Skunkworks
(Runner pays [click][click] or 5[c] on approach, else the run ends) and
Anoetic Void (Corp may pay 2[c] and trash 2 HQ cards to end the run; its
`AIWouldTrigger` declines with an ambush in the server, fewer than 2 cards in
the server, or fewer than 2 non-agenda HQ cards) have only `AIDefensiveValue`
(install preference) and `responseOnApproachServer`. `_hasDefensiveUpgrade()`
reads only the boolean `AIPreventBreach` (no Corp root in the playable sets
declares it) and sets compatibility `hasHardLockout`. Both cards are in the
pool's PD, Gateway and LEO Corp decks.

`_criticalBreachDefenseAction()` hypothetically installs each affordable ICE
from `_rankedInstallOptions(corp.HQ.cards, true)` on an at-risk central and
reads `_centralBreachLossRisk()` (zero when compatibility `isSecure` holds),
installing when risk ≥ 0.35 falls by ≥ 0.15.

See [architecture.md: install planning today](../../corp-ai/architecture.md#install-planning-today).

## Design

### Phase boundaries

| Phase | PR | Changes decisions? | Acceptance |
|---|---|---|---|
| A | M1, M2, M4, calibration table, extended collector | No | Identity run (below) and reliability check |
| B | I2's ranking reads M1/M2 behind `this.options.iceMarginalSecurity` | Yes, option on only | F4 gate (`## Acceptance gate`) |

Phase B may not start until phase A is merged and its reliability check has
passed. (Owner decision 2026-10-16: phase B starts once phase A is committed
on this branch, and the table is accepted despite the failed check; see
Resolution.) Phase A ships no option: nothing reads its outputs, so there is
nothing to switch. Identity is shown, as L9.0 did, by comparing the commit
before phase A with phase A's head.

### Phase A: shared measurements (observation-only)

**M4 approach-time defence hook.** Add a generic root-card hook
`AIApproachDefense(server)` returning `null` or
`{runnerOptions: [{credits, clicks}, ...], corpEndsRunUses: n}`:

- `runnerOptions`: alternative costs the Runner must pay on approach to
  continue (Manegarm: `[{credits: 5, clicks: 0}, {credits: 0, clicks: 2}]`).
- `corpEndsRunUses`: how many approaches the Corp would actually end with its
  own resources, following the card's own AI policy (Anoetic Void: 0 when
  `AIWouldTrigger()` is false, else `min(floor(spendable credits / 2),
  floor(non-agenda HQ cards / 2))`; spendable excludes its own
  `AIReserveCredits` only once).

Read it for each root card in `_addHonestVerdict()` only. A rezzed card counts;
an unrezzed one counts only when its rez cost can be funded together with the
chosen ICE rez plan (`_canFundRezPlan`), mirroring `_hasDefensiveUpgrade()`'s
affordability rule. `runnerOptions` become one extra honest layer after the
innermost ICE, repeated like ICE layers under global ETR. `corpEndsRunUses`
combine with `_globalETRUses()` exactly as global ETR does: covering
`_projectedRunnerRuns()` is an honest lockout, fewer uses repeat the route.
Compatibility fields (`isSecure`, `hasHardLockout`, `totalMandatoryBreakCost`)
and `_hasDefensiveUpgrade()` stay unchanged, so no decision moves. The hook
must be pure (no state, logging or `preferred`). Document it in
`documentation/ai.md` (section 5.5) and audit the playable sets for other
approach-time root costs; Flagship (runs cannot be declared successful) is a
breach-prevention effect, not an approach cost, and is out of scope.

**M1 `_breachMargin(server, evaluation)`.** From the honest route, in
credit-equivalents (`CLICK_VALUE = 1`). `_addHonestVerdict()` additionally
records the chosen `honestRoute {credits, clicks}`, `honestClickBudget` and
`honestClickCredits`. With `C = runnerCredits`:

- `creditSlack = C − min(route.clicks, clickCredits) − route.credits`;
  `clickSlack = clickBudget − route.clicks`.
- `margin = creditSlack` when `clickSlack ≥ 0`, else
  `min(creditSlack, 0) + clickSlack`.
- `−Infinity` for `honestLockout`; `null` when `honestMandatoryBreakCost` is
  `null`, with `upperBound = C − honestKnownMandatoryBreakCost`. On the
  restricted-credit path (no honest layers) use `C − honestMandatoryBreakCost`.

Invariant: outside lockout and unknown cost, `margin ≥ 0` exactly when
`honestIsSecure` is false. Positive margin is the Runner's spare after a breach.
(The design note's "+Infinity for lockout" contradicts its own
credits-minus-cost definition; I2 uses −Infinity.)

**M2 `_breachHazard(server, runnerTurnsAhead)`.** Probability of a successful
run on the server in one Runner turn, looked up in a checked-in table by
server kind × margin bucket. Kinds: `agendaRemote`, `otherRemote`, `hq`, `rd`,
`archives`. Buckets (preregistered): `lockout` (−Infinity), `≤−4`, `−3..−1`,
`0..1`, `2..4`, `5..9`, `≥10`, `unknown` (null). Turn `t > 1` re-evaluates
the bucket at `margin + (t − 1) × _projectedRunnerIncome()`, where
`_projectedRunnerIncome()` is the public click-for-credit floor
`max(0, AllottedClicks(runner) − 1)`. Never assume turns are independent of
margin.

**Calibration.** Extend `securitySnapshot` (headless.js) to emit per server
`kind`, `margin`, `upperBound`, ICE count, `publicThreatRisk` and the M4 flag,
and extend `securityCalibration` to count server-turns and breaches per
`kind × bucket` (existing outputs unchanged; the `honest` group may shift on
M4 boards, which is an observation change only). Run the committed pool with
default options on preregistered seeds 1001–1400 per pair (fit) and 1401–1600
(held out), disjoint from gate seeds. Build the table with a script
(`scripts/ai-batch/breach-hazard-table.js`): within each kind, pool-adjacent
isotonic regression (non-decreasing in margin, `lockout` lowest), merging any
cell under 200 server-turns with its neighbour. Commit the raw report and
derived table to
`documentation/corp-ai/measurements/I2-<sha>-breach-hazard-calibration.json`
with provenance (commit, pool hash, pairs, seeds, command). Expose the table to
the AI as the frozen constant `CORP_AI_BREACH_HAZARD_TABLE` at the top of
`ai_corp.js` (the AI runs in the browser and cannot read JSON); a test asserts
the constant equals the table the script derives from the committed report.

**Reliability check (held-out seeds, before any consumer).** Report per cell:
predicted rate, observed rate, game-clustered 95% interval, count. Pass when
every cell with ≥100 held-out server-turns contains its prediction in that
interval and the count-weighted mean absolute error is ≤ 0.05. Also report:

- **Next-turn check:** for servers whose ICE and root are unchanged between
  consecutive snapshots, `breachHazard(server, 2)` predicted at turn T versus
  breach at T+1. If it fails the same rule, phase B uses horizon 1.
- **One-ICE split:** whether one-ICE and multi-ICE servers differ at equal
  margin beyond their intervals (hidden one-ICE bypass is not in M1). If they
  do, add an ICE-count split (1 / ≥2) to the table and rerun the check.

If the reliability check fails, phase B is blocked; record the evidence here.

**`POINT_VALUE`.** The design note names it but sets no value. Phase A
computes it once from the pool's Corp decks as the mean over agenda copies of
`(advancementRequirement × 2 + 1) / agendaPoints` credit-equivalents per
point (one credit and one click per advance, one click to install), records
it beside the table and defines `CORP_AI_POINT_VALUE`. Only I9 retunes it.

### Phase B: ICE ranking (behind `iceMarginalSecurity`)

1. **Candidates.** For every server in `_rankedServersToProtect()` whose
   `_iceLayerPolicy()` allows a layer, plus the new-remote path, generate an
   I1 record per affordable ICE. Retire `_serverToProtect(...,
   targetIsEligible)` from ordinary generation (server ranking stays for
   diagnostics). Admission is unchanged: I2 never offers a pair the legacy
   layer policy, empty-Archives exclusion, legality, affordability or posture
   cap rejects, and does not restore `serverAtRiskInstallOverride`. Whether an
   ICE install beats a non-ICE action is I7.1's question.
2. **Evaluate** each pair through `_hypotheticalServerAfterInstall()`
   (detached server for a new remote), reading M1/M2 before and after.
3. **Stake** `P(s)`, agenda points expected through the server per breach,
   capped at the points the Runner needs to win:
   - HQ, R&D: `_breachConsequence(s).pointsExposed` (agenda density × accesses).
   - Archives: `pointsExposed` (includes its HQ backdoor via `_breachConsequence`).
   - Remotes whose root holds an agenda or a trap (Ambush or Hostile),
     postured or not: a common stake, the mean points per agenda in the
     Corp's deck list, and the `agendaRemote` row. Owner decision
     (2026-10-16): hide the agenda/trap ICE-count tell, because a trap can win
     the game too. Whether a trap is worth installing at all is I5's
     `trapValue`, not I2's. True stakes remain for band-2 safety and
     diagnostics only.
   - Before I3: the one designated next scoring remote (first of
     `_scoringServers(_emptyProtectedRemotes())`, else the new remote) gets
     the points of the highest-point agenda in HQ when HQ holds one; every
     other empty remote has stake 0. I3 replaces this with its
     scoring-remote role and the agendas expected there within the horizon.
   - Active bait/bluff posture on an empty or other remote: the same common
     stake and row.
   - Remotes with stake > 0 use the `agendaRemote` row, others `otherRemote`.
4. **Expected points stolen** over horizon `H` (`CORP_AI_RISK_HORIZON_RUNNER_TURNS`,
   2; 1 if the next-turn check failed — it failed, so `H = 1`), with `h_t = _breachHazard(s, t)`:
   remotes and Archives (one-shot) `P × (1 − Π(1 − h_t))`; HQ and R&D
   (repeatable) `P × Σ h_t`.
5. **Score** (credit-equivalents, recorded in `scoreBreakdown`):
   `riskReduction = POINT_VALUE × (stolenBefore − stolenAfter)` (0 to
   `POINT_VALUE ×` points to win), minus `installCost`, minus the ICE's rez
   cost when the after-evaluation's rez plan includes it, minus the existing
   bounded `reserveCost` and extra-click `opportunityCost`. Unknown cost: if
   the before margin is `null`, `riskReduction` is 0; if only the after
   margin is `null`, use its `upperBound` (a conservative lower bound on the
   drop, since hazard rises with margin). Never coerce `null` to a number.
6. **Rank** band 1 by score, then `compatibilityOrder`. Bands 3 and 2 are
   unchanged and unscored; a game-losing breach is band 2.
7. `_criticalBreachDefenseAction()` reads its `lossRiskAfter` from I2's
   candidate evaluation (same hypothetical install) but keeps computing it
   with `_centralBreachLossRisk()` and its 0.35/0.15 thresholds: a shared
   computation, not a new oracle.
8. Same-turn allocation in `_protectionInstallsThisTurn` stays authoritative.

**Constraints kept from the previous draft.**

- `_breachConsequence()` and any stake feed only I2's candidate score, never
  `_protectionScore()`, `_isAScoringServer()` or `_scoringWindow()` (L7.1's
  failure: weighting HQ's protection score moved the remote-scoring bar,
  `centralStolen.points` +0.048 [+0.011, +0.085]).
- **Posture cap.** On an actively postured remote, ordinary candidates need
  `server.ice.length + 1 <= targetIce` from `_deceptionProtectionTarget()`;
  at the cap offer no ordinary layer. Read the authoritative posture; never
  reroll or cache one. A neutral script removes the cap. Band-2 safety
  overrides it.
- **Substitution invariant.** On equivalent postured boards (same public
  state, profile, ICE, defensive mechanics, costs, declared reserves, random
  stream), swapping an agenda for a trap or changing agenda points changes no
  component, rejection, admission, allocation or choice. Real mechanical
  differences (a declared reserve, an M4 defence) may differ and are logged.
  I2 emits no `scoringValue`, `futureValue`, `deceptionValue` or
  role-displacement value.
- Optional punishment never lowers margin; unrezzable ICE adds nothing to the
  after-margin (the L1.1 rez budget decides); effective subtypes and public
  bypass act through the honest route; `AIWorthwhileIce` may reject or modify
  candidates but not order them.

**Title cases.** The only I2-tagged row in P1
(`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`), Palisade
in `_iceInstallScore()`, was completed when F2 deleted that function. M4
replaces no title list.

## Safety and information boundary

Hypothetical evaluation uses only public Runner state and the Corp's own
cards, must not mutate live servers or credits, and is unchanged when hidden
Grip cards are substituted. The calibration table is measured against the
stock Runner AI; it is a property of that opponent, not a rule. The collector
may read true root types (harness-only); the AI may not read anything the
Corp could not know.

## Test scenarios

**Phase A**

1. M1: a priced route gives the defined margin; honest lockout gives
   −Infinity; an unpriced breaker gives `null` with the known-part
   `upperBound`; a click-breakable bioroid lowers margin through `clickSlack`.
   Margin ≥ 0 iff `honestIsSecure` is false, across the L9.0/L9.1 fixtures.
2. Manegarm: a Runner with 2 spare clicks pays clicks, one without pays 5
   credits, one with neither is honestly locked out; an unrezzed Manegarm the
   Corp cannot fund alongside the ICE plan has no effect; compatibility fields
   are unchanged in every case.
3. Anoetic Void: uses follow its `AIWouldTrigger` (ambush, fewer than 2 cards,
   fewer than 2 non-agenda HQ cards each give 0), Corp credits and HQ size;
   uses ≥ projected runs is an honest lockout, fewer repeat the route.
4. Collector: scripted snapshots and runs produce correct `kind × bucket`
   counts, including `lockout` and `unknown`; existing outputs unchanged.
5. Table script: deterministic from a committed report; isotonic within kind;
   thin cells merged; `CORP_AI_BREACH_HAZARD_TABLE` equals its output.
6. `_breachHazard()` is non-decreasing in margin and uses projected income for
   turn 2.

**Phase B** (option on; assert choice and logged reason; orderings, not numbers)

7. Against a public Fracter only, comparable Code Gate or Sentry outranks an
   efficiently broken Barrier.
8. ETR ICE that creates an honest lockout outranks higher-strength ICE that
   leaves a route.
9. A second layer on a one-ICE remote under public outermost bypass outranks
   deepening a lower-stake server.
10. ICE outside the L1.1 rez budget, or with only optional punishment, earns no
    risk reduction.
11. Effective subtype changes and targeted bypass hooks affect hypothetical
    results exactly as installed ICE.
12. Hidden Grip substitution changes no candidate.
13. With two servers at equal margin, the ICE goes to the higher stake;
    changing only the stake changes the choice. A locked remote holding 3
    points whose lockout the Runner's income will break next turn outranks
    low-density R&D.
14. Pre-I3 stake: the designated empty scoring remote earns stake only while
    HQ holds an agenda; other empty remotes earn none.
15. Unknown pricing: `null` before-margin gives 0; `null` after-margin uses
    `upperBound`; no `null` becomes a number.
16. Posture cap at 1, 2 and 3 layers (below, at, above), epoch reevaluation
    and neutral script; band-2 override when a lighter choice allows a winning
    breach.
17. Substitution invariant on equivalent postured agenda/trap boards (all
    record fields, admission, allocation, choice; agenda points varied
    separately); a declared-reserve difference is logged, not hidden.
18. Baker-backdoor fixture (`corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`)
    still installs on Archives without the bridge; if the top server has no
    useful ICE, another allowed server gets one.
19. Empty Archives without agendas or HQ backdoor stays excluded.
20. `_criticalBreachDefenseAction()` picks the same ICE as before on its
    existing tests while reading I2's evaluation.
21. Option off: decision snapshots identical to the baseline.

## Acceptance gate
F4 gate. Option `iceMarginalSecurity` (Corp AI), off in the baseline and on
in the candidate. Committed deck pool; run 1 used paired seeds 1–400, 400
games per deck pair. Run 2 used the offered larger sample of 1,000 per pair
on fresh seeds 1601–2600 (owner-run command recorded in Resolution).
Bootstrap 95% intervals and all tolerances are unchanged.
Collectors: `centralStolen`, `corpInsolventTurns`, `strandedUnrezzedIceCost`
(adds `strandedUnrezzedIceCost.credits`: credits spent installing ICE never
rezzed before game end, defined in this ticket),
`bluffSingleVariableCorrelation`, `realizedIceByRootType`, `installOutcomes`,
`evaluatorCallCount`.
Starts: none. (The `i2-posture` start-board command was dropped on
2026-10-16, before any phase B code or gate result: the pool now meets F12's
readiness rule; see Resolution.)

Pool command:

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolen` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.03 |
| Guard | `pointsScored` | higher | regression at most 0.25 |
| Guard | `centralStolen.points` | lower | regression at most 0.2 |
| Guard | `gameLength` | lower | regression at most 1.5 |
| Guard | `corpInsolventTurns` | lower | regression at most 0.5 |
| Guard | `strandedUnrezzedIceCost.credits` | lower | regression at most 1 |
| Guard | `bluffSingleVariableCorrelation.max` | lower | regression at most 0.02 |
| Guard | `realizedIceByRootType.allCountCorrelation` | lower | regression at most 0.05 |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | regression at most 0.05 |

Gate command: `node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --games 400 --collector centralStolen --collector corpInsolventTurns --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --collector evaluatorCallCount --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.25 --guard centralStolen.points=0.2 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05 --better gameLength=lower`

The command must pass. Both arms keep the five legacy regression options off
and every other option at its default (`postureEpochs` and
`matchLocalPostureFeedback` are `true`); record effective options in both
arms. `evaluatorCallCount.computationsPerMainDecision` and
`installOutcomes.trapTriggers` are diagnostics, not rows.

**Expected effect.** I2 only reallocates ICE among servers the legacy policy
already admits, so it should not move `winRate` measurably; I4 is the
win-rate item. The target is `pointsStolen` −0.1 to −0.2 per game (an
estimate, not a measurement). L9.0.1's 1,400-pair interval half-width was
0.13 points; at 2,800 pairs it is about 0.09, so a true −0.14 or larger
passes with roughly 80% probability, and a true −0.1 more often fails to be
shown than not. A gain too small to show at this size is recorded as not
adopted, not as a regression.

**Changes from the previous gate, and why.**

- **Sample size 200 → 400 per pair** (owner decision 2026-10-16, replacing
  this ticket's earlier 1,000: 14,000 gate games plus 14,000 calibration
  games was too long). About 12 minutes per arm. Guards still need their
  paired interval to rule out a regression beyond tolerance, so a noisier
  sample can fail a guard but cannot pass one it should not.
- **`realizedIceByRootType.allCountCorrelation` tolerance 0.02 → 0.05.** F12's
  independent control calibration at 1,400 games per arm put
  control-minus-control at +0.033 [−0.022, +0.091]. Even scaled to 7,000
  games the half-width is about 0.025, so 0.02 would fail an unchanged policy
  about half the time, which measures noise, not I2. 0.05 against a 0.22
  baseline tell is the largest residual increase this item accepts (owner
  accepted 2026-10-16; holding 0.02 would need about 4,000 seeds per pair).
  The common agenda/trap stake (step 3) should keep this guard from failing.
- **Postured-count guard on the pool, tolerance 0.05.** F12 measured known
  posture labels at 85.8%/85.4%, below its frozen 90% readiness rule, so an
  earlier draft moved this guard to `i2-posture` start boards. PR #55's
  `unrolled` observer correction fixed the coverage: a control-only pool run at
  `343b2be` gives 99.66% known labels and 360/312 agenda/trap postured
  commitments in 309/268 games
  ([evidence](../../corp-ai/measurements/I2-343b2be-posture-coverage.json)), so
  per the owner decision the guard is back on the pool and the posture command
  and its boards are dropped (2026-10-16, before any phase B result).
  Tolerance 0.05 for the same reason as above.
- **`centralStolen.points` guard added** (standard 0.2 points tolerance): the
  L7.1 and L9.0.1 failures both bought remote safety with central theft.
- **`pointsStolen` guard dropped from the pool command**: the improve row on the
  same metric is stricter.
- **Latency check replaced** by the diagnostic `evaluatorCallCount`
  (ai-planning: latency is not a standard guard because `gate` may reuse a
  baseline timed on another machine).
- `winRate` 0.03 and `pointsScored` 0.25 keep the install track's tolerances
  ([design note](../../corp-ai/specs/install-decisions-design.md#acceptance-gates)), not the
  0.02/0.2 defaults.

**Before the first gate run (freeze, then never change).**

1. Control-only calibration cohorts: dropped (owner decision 2026-10-16).
   The paired guard intervals already carry the noise; the cohorts only
   checked the tolerances and would not change the verdict.
2. Posture coverage: met on seeds 1–200 at `343b2be` (Resolution); the
   collector's readiness check fails closed in the gate if a 400-seed arm
   misses it. Do not invent boards to reach coverage.
3. Record the L8.2/I2 ordering decision per the
   [deception-gates control refresh guidance](../../corp-ai/deception-gates.md). Any
   decision-changing merge (L8.2, L9.0.2) during evaluation invalidates the
   control; refresh it.

**Failure disposition.** Any failed row closes this attempt **not adopted**
under ai-planning's failed-gate lifecycle: remove the option and branch, keep
phase A (it is useful without the policy), the collectors and the boards.
L8.2, L8.9 or I9 may investigate a count tell but cannot waive a failed guard.
Missing samples are incomplete setup, not a pass.

## Things to consider

- **Under-installing.** `POINT_VALUE` anchored on the cost of advancing is a
  low value of a point, and empty remotes earn stake only through the pre-I3
  rule, so ranking may favour cheap ICE and loaded centrals over scoring
  remote preparation. Admission is unchanged, so volume should be similar; the
  `pointsScored` guard watches the scoring side.
- **Snapshot timing.** The table is measured at Runner turn start, after
  turn-begin income; the consumer evaluates during the Corp turn. Margins are
  therefore slightly understated by the Runner's turn-start drip.
- **Breach is not steal.** M2 counts successful runs; centrals with few
  accesses overstate theft risk. Stake already multiplies by per-breach points.
- **Recalibrate** M2 after any adoption that changes where agendas sit (I9).
- **Empty-Archives reward valuation** (owned gap). Keep the exclusion; before
  hand-off either implement and gate a scoped policy or file a follow-up with
  a roadmap owner and gate, and update the design note's gap reference.
- **L4.1** changes evaluator routes scenarios 9 and 11 rest on; assert
  orderings, and use its hook format if it lands first.
- **L9.0.2** arms touch the same admission and critical-defence paths; whichever
  adopts first is part of the other's control. Phase A's M4 changes honest
  fields L9.0.2 would read; that is a correction, but its evidence must be
  rerun after phase A.
- **L8.8** owns any marginal deception value after I2 adoption.
- Every pair costs `H` hypothetical evaluations; F3's cache bypasses
  hypotheticals. Memoize per decision if `evaluatorCallCount` rises sharply.

## Acceptance criteria

**Phase A**

- [x] `AIApproachDefense` is implemented for Manegarm Skunkworks and Anoetic Void, placed with the cards' AI hooks, documented in `documentation/ai.md`, and the playable sets are audited for other approach-time root costs (listed in the Resolution).
- [x] `_breachMargin()`, `_breachHazard()`, `_projectedRunnerIncome()`, `CORP_AI_BREACH_HAZARD_TABLE` and `CORP_AI_POINT_VALUE` exist; scenarios 1–6 pass.
- [x] The calibration report, table and provenance are committed under `documentation/corp-ai/measurements/`, and the held-out reliability, next-turn and one-ICE checks are recorded with their outcome.
- [x] Identity run (observation-only invariant, as L9.0): I0's F4 configuration with `--collector securityCalibration` at the commit before phase A and at phase A's head gives identical per-game `winner`, `turns`, `logHash` and `decisionHash` on every pair, and decision snapshots are identical to the recorded baseline. Corp `decisionLatencyMs` change is recorded.

**Phase B**

- [x] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [x] The behaviour change was evaluated behind the default-off `iceMarginalSecurity` option; after the recorded gate passed, adoption changed its default to on (see Resolution).
- [x] Ordinary ICE-install generation no longer calls `_serverToProtect(..., targetIsEligible)`.
- [x] The `strandedUnrezzedIceCost` collector and its `credits` metric are added and verified against scripted install/rez outcomes.
- [x] Posture-label coverage is checked on the pool before any phase B result: it meets F12's readiness rule, so the posture guard is on the pool command and the `i2-posture` boards are dropped (owner decision 2026-10-16; [evidence](../../corp-ai/measurements/I2-343b2be-posture-coverage.json)).
- [x] The posture-coverage evidence and the L8.2/I2 ordering decision are recorded before the first gate run (calibration cohorts dropped by the owner).
- [x] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [x] Applicable gate evidence is recorded in the Resolution. For F4: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% confidence interval, guarded-regression result, pass conditions and thresholds; an improvement interval's lower bound must be above zero. Only then is the option switched on by default.
- [x] The empty-Archives reward-valuation gap is disposed of as described above.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [x] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.
