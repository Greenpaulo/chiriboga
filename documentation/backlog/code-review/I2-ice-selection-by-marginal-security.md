# I2 ICE selection by marginal security
**Outcome:** blocked — phase A delivered; phase B blocked because the breach-hazard reliability check failed (see Resolution)

**Roadmap item:** I2 · **Depends on:** I1, F2, F4, L7.1, L9.0, L9.1, F11, F12 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [scoring-risk model](../../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16), [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 15d485d (2026-10-16)

## Additional blocker

Phase B cannot start: the preregistered held-out reliability check of the
breach-hazard table failed (phase A Resolution). The owner decides whether to
redesign M2 (for example a different estimator, cells or rule) or proceed
without it. Remove this section when that decision is recorded.

## Resolution

Implemented from `15d485d` (phase A only; phase B not started).

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

**Gate:** pending F4 — `iceMarginalSecurity` (phase B; not implemented, so no option exists yet).

**Open.** Phase B, its gate setup and the empty-Archives disposition are
untouched. Architecture: [server security evaluation](../../corp-ai/architecture.md#server-security-evaluation).

## Implementation plan

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
passed. Phase A ships no option: nothing reads its outputs, so there is
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
   2; 1 if the next-turn check failed), with `h_t = _breachHazard(s, t)`:
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
in the candidate. Committed deck pool, paired seeds, 1,000 games per deck pair
(see "Sample size" below), bootstrap 95% intervals.
Collectors: `centralStolen`, `corpInsolventTurns`, `strandedUnrezzedIceCost`
(adds `strandedUnrezzedIceCost.credits`: credits spent installing ICE never
rezzed before game end, defined in this ticket),
`bluffSingleVariableCorrelation`, `realizedIceByRootType`, `installOutcomes`,
`evaluatorCallCount`.
Starts: pool command none; posture command `--start-tag i2-posture` (boards
this ticket builds with `scripts/start-board.js`). No human logs exist for
these; build them from benchmark game logs (`node scripts/ai-batch.js replay`
for a pool seed where a posture is active, then `start-board.js --snapshot`).
If replay cannot save a log with decision snapshots, adding that output is
part of this ticket.

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

Gate command: `node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --games 1000 --collector centralStolen --collector corpInsolventTurns --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --collector evaluatorCallCount --improve pointsStolen --guard winRate=0.03 --guard pointsScored=0.25 --guard centralStolen.points=0.2 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --better gameLength=lower`

Posture command:

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Guard | `winRate` | higher | regression at most 0.03 |
| Guard | `pointsStolen` | lower | regression at most 0.25 |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | regression at most 0.05 |

Gate command: `node scripts/ai-batch.js gate --corp-option iceMarginalSecurity=true --start-tag i2-posture --budget 2800 --collector realizedIceByRootType --guard winRate=0.03 --guard pointsStolen=0.25 --guard realizedIceByRootType.posturedCountCorrelation=0.05`

Both commands must pass. Both arms keep the five legacy regression options off
and every other option at its default (`postureEpochs` and
`matchLocalPostureFeedback` are `true`); record effective options in both
arms. `evaluatorCallCount.computationsPerMainDecision` and
`installOutcomes.trapTriggers` are diagnostics, not rows.

**Expected effect.** I2 only reallocates ICE among servers the legacy policy
already admits, so it should not move `winRate` measurably; I4 is the
win-rate item. The target is `pointsStolen` −0.1 to −0.2 per game. L9.0.1's
1,400-pair interval half-width was 0.13 points; at 7,000 pairs it is about
0.06, so a true −0.1 passes with roughly 90% probability.

**Changes from the previous gate, and why.**

- **Sample size 200 → 1,000 per pair.** Needed for the count guard (below) and
  gives the improvement row the power above. About 40 minutes per arm.
- **`realizedIceByRootType.allCountCorrelation` tolerance 0.02 → 0.05.** F12's
  independent control calibration at 1,400 games per arm put
  control-minus-control at +0.033 [−0.022, +0.091]. Even scaled to 7,000
  games the half-width is about 0.025, so 0.02 would fail an unchanged policy
  about half the time, which measures noise, not I2. 0.05 against a 0.22
  baseline tell is the largest residual increase this item accepts (owner
  accepted 2026-10-16; holding 0.02 would need about 4,000 seeds per pair).
  The common agenda/trap stake (step 3) should keep this guard from failing.
- **Postured-count guard moved to a start-board command.** On the pool it
  fails closed: F12 measured known posture labels at 85.8%/85.4%, below its
  frozen 90% readiness rule. That is a coverage limit, not noise, and more pool
  games do not fix it. The guard is kept on real-game-derived boards with
  active agenda and trap postures, tolerance 0.05 for the same reason as above.
- **`centralStolen.points` guard added** (standard 0.2 points tolerance): the
  L7.1 and L9.0.1 failures both bought remote safety with central theft.
- **`pointsStolen` guard dropped from the pool command**: the improve row on the
  same metric is stricter. It stays as a guard on the posture command.
- **Latency check replaced** by the diagnostic `evaluatorCallCount`
  (ai-planning: latency is not a standard guard because `gate` may reuse a
  baseline timed on another machine).
- `winRate` 0.03 and `pointsScored` 0.25 keep the install track's tolerances
  ([design note](../../corp-ai/specs/install-decisions-design.md#acceptance-gates)), not the
  0.02/0.2 defaults.

**Before the first gate run (freeze, then never change).**

1. Control-only calibration: two disjoint control cohorts (seeds 2001–3000
   and 3001–4000, default options) with independent deck-pair-stratified
   bootstrap. For `allCountCorrelation` and `bluffSingleVariableCorrelation.max`,
   the control-minus-control interval half-width must be at most half the row's
   tolerance; if not, increase `--games` for both, never the tolerance. Commit
   the evidence to `documentation/corp-ai/measurements/`.
2. Posture boards: a control-only run on `i2-posture` must meet F12's
   readiness rule (≥90% known posture labels, ≥10 commitments and ≥5 games per
   class). If no real-log boards can meet it, I2 cannot gate; record that here
   and ask the owner. Do not invent boards to reach coverage.
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

- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Ordinary ICE-install generation no longer calls `_serverToProtect(..., targetIsEligible)`.
- [ ] The `strandedUnrezzedIceCost` collector and its `credits` metric are added and verified against scripted install/rez outcomes.
- [ ] The `i2-posture` start boards are built from benchmark game logs with `scripts/start-board.js`, each `NOTE` naming its source, and meet F12's readiness rule on a control-only run.
- [ ] The pre-gate calibration evidence and the L8.2/I2 ordering decision are recorded before the first gate run.
- [ ] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [ ] Applicable gate evidence is recorded in the Resolution. For F4: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% confidence interval, guarded-regression result, pass conditions and thresholds; an improvement interval's lower bound must be above zero. Only then is the option switched on by default.
- [ ] The empty-Archives reward-valuation gap is disposed of as described above.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
