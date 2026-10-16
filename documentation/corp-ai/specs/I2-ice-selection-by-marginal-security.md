# I2 ICE selection by marginal security

**Roadmap item:** I2 · **Depends on:** I1, F2, F4, L7.1, L9.0, L9.1, F11, F12 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16), [deception gate reconciliation](../deception-gates.md)
**Verified against code:** 60fa0d7 (2026-10-16)

All formal prerequisites are `done` as of 2026-10-16. L7.1 closed **not
adopted**: its `_breachConsequence()` signal exists and is tested but no
production decision reads it. F11 delivered paired pooled batch-metric guards;
F12 delivered the `realizedIceByRootType` collector and a control calibration.

## Goal

Choose the `(ICE, server)` pair that most reduces the agenda points the Runner
is expected to steal, net of the ICE's cost, instead of the first affordable
ICE in input-card order for one pre-chosen server. I2 is the first consumer of
the shared [scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16):
it builds the shared measurements M1, M2 and M4 (phase A, observation-only),
then ranks ICE with them behind its own option (phase B).

**Why this design.** Turning a security measurement into a shared yes/no gate
has twice made the Corp weaker: [`fa1182c`](../../corp-ai-regression/findings.md#causal-test-on-the-harness-tip)
("never score into an insecure remote") and the
[L9.0.1 gate failure](../../backlog/done/L9.0.1-adopt-honest-lockout.md#resolution)
(global honest verdict: winRate −0.029, pointsScored −0.282, pointsStolen
+0.176; remote theft fell while central theft rose). The owner's 2026-10-14
playtests saw agendas held in HQ and agendas left in weak remotes. The redesign
asks "how many points do I expect to lose?" in real units: a graded breach
margin (M1), a measured breach probability per margin (M2), and points at
stake. The previous draft's uncalibrated `securityDelta` weights
(0.6/0.25/0.15), soft-lockout 0.7, ×8 scale, `consequenceWeight` floor and
`futureValue` are **not** used by I2. Per [principle 6](../principles.md#6-shared-measurements-consumer-owned-decisions),
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
gives `Infinity`. [L9.0.2](L9.0.2-consumer-specific-honest-security.md)
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

See [architecture.md: install planning today](../architecture.md#install-planning-today).

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
   - Archives and remotes: agenda points installed there
     (`pointsExposed`; Archives includes its HQ backdoor via `_breachConsequence`).
   - Before I3: the one designated next scoring remote (first of
     `_scoringServers(_emptyProtectedRemotes())`, else the new remote) gets
     the points of the highest-point agenda in HQ when HQ holds one; every
     other empty remote has stake 0. I3 replaces this with its
     scoring-remote role and the agendas expected there within the horizon.
   - Active bait/bluff posture: a common stake, the mean points per agenda in
     the Corp's deck list, and the `agendaRemote` row for agenda and trap
     roots alike. True stakes remain for band-2 safety and diagnostics only.
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
this ticket builds with `scripts/start-board.js`).

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
  baseline tell is the largest residual increase this item accepts (an owner
  question). The guard is kept, not dropped: outside a posture, true stakes
  give trap remotes no ICE value, so this is the guard most likely to fail.
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
  ([design note](install-decisions-design.md#acceptance-gates)), not the
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
   [deception-gates control refresh guidance](../deception-gates.md). Any
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

- [ ] `AIApproachDefense` is implemented for Manegarm Skunkworks and Anoetic Void, placed with the cards' AI hooks, documented in `documentation/ai.md`, and the playable sets are audited for other approach-time root costs (listed in the Resolution).
- [ ] `_breachMargin()`, `_breachHazard()`, `_projectedRunnerIncome()`, `CORP_AI_BREACH_HAZARD_TABLE` and `CORP_AI_POINT_VALUE` exist; scenarios 1–6 pass.
- [ ] The calibration report, table and provenance are committed under `documentation/corp-ai/measurements/`, and the held-out reliability, next-turn and one-ICE checks are recorded with their outcome.
- [ ] Identity run (observation-only invariant, as L9.0): I0's F4 configuration with `--collector securityCalibration` at the commit before phase A and at phase A's head gives identical per-game `winner`, `turns`, `logHash` and `decisionHash` on every pair, and decision snapshots are identical to the recorded baseline. Corp `decisionLatencyMs` change is recorded.

**Phase B**

- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Ordinary ICE-install generation no longer calls `_serverToProtect(..., targetIsEligible)`.
- [ ] The `strandedUnrezzedIceCost` collector and its `credits` metric are added and verified against scripted install/rez outcomes.
- [ ] The `i2-posture` start boards are built from real logs with `scripts/start-board.js`, each `NOTE` naming its source, and meet F12's readiness rule on a control-only run.
- [ ] The pre-gate calibration evidence and the L8.2/I2 ordering decision are recorded before the first gate run.
- [ ] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [ ] Applicable gate evidence is recorded in the Resolution. For F4: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% confidence interval, guarded-regression result, pass conditions and thresholds; an improvement interval's lower bound must be above zero. Only then is the option switched on by default.
- [ ] The empty-Archives reward-valuation gap is disposed of as described above.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
