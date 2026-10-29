# I3 Remote role and root suitability

**Roadmap item:** I3 · **Depends on:** I2, I4, F4, L8.4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** [L8.9 tool recipe](../ai-batch-harness.md#using-install-observations-in-the-i-tickets), [L8.9 delivery](done/L8.9-observable-defense-parity.md), `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [install-decisions-design.md: Scoring-risk model](../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16), [I2](done/I2-ice-selection-by-marginal-security.md), [deception gate reconciliation](../corp-ai/deception-gates.md)
**Verified against code:** faccb78 (2026-10-23)

## Current scope — owner playtesting, 2026-10-28

Follow [the owner-playtesting workflow](../ai-playtesting.md). This scope
amendment supersedes conflicting sequencing, candidate exclusions and batch
adoption requirements below. The older code-verification line and design are
historical; this amendment is not a claim that the whole proposal has been
re-grounded or approved for implementation.

The owner currently prefers I4 advancement and exposure on, destination
planning off. Do not make I4's destination flag a prerequisite for benefiting
from I3, silently enable it, or replace the disabled behaviour under another
flag. Decide the smallest supported I3 change from observed problems.

**Evidence:** [agenda-stall ticket](../bugs/corp-agenda-held-while-secure-remote-available.md),
`corp_wont_play_an_agenda.txt` and
`tests/pending/corp-agenda-blocked-by-occupied-remote.test.js`.
The log records six ICE installs, two protecting the asset remote, before the
final agenda-heavy hand. A difficult draw is a contributing possibility, not a
sufficient diagnosis. The reconstructed board has a counterless Storgotic
Resonator occupying the only protected remote. Current replacement logic can
reuse some aging assets, but excludes Hostile assets such as this one. Clearing
the asset still leaves a relative Archives-score rejection with five agendas
in HQ. Neither observation proves that installing an agenda is the best move.

**Ownership and design questions before implementation:**

- I3 owns whether a protected remote should remain available for scoring,
  including considering replacement of a still-installed asset. The older
  scenario about a remote left empty after an asset goes away is insufficient.
- Compare retaining the asset, replacing it and preparing another scoring
  remote, using its remaining usefulness and the available clicks/credits.
  A Hostile subtype or zero counters alone must not decide replacement.
  Do not force agenda installation when drawing or waiting is reasonable.
- I4 owns the agenda install/hold choice and its timing. The relative-bar bug
  is linked evidence for the I3/I4 plan, not authorization for an independent
  bypass of the old scoring-server predicate. Keep the destination/hold
  option independent; the owner's reported undefended last-click agenda
  installs remain an I4 follow-up, not something this log demonstrates.
- I5 owns a general asset-value system. I3 should not invent that entire system
  merely to address this example; document a narrow missing input or split
  required work before implementation. Use card hooks, not title exceptions.
- Keep the agenda/trap information boundary, retain useful assets in
  contrasting positions, and account for the runner's resources using only
  information available to the Corp.

First re-ground the affected candidate generation and consumer paths, then
revise the design around the selected behaviour. Persistent roles, new value
formulas and collectors in the older proposal are possible means, not work
that must all be built to close this playtest weakness.

## Earlier grounding and proposal context

Dependency state at faccb78: L8.4 is done and adopted (`postureEpochs`
defaults to `true`); F4 is done; I2 is done and adopted (`iceMarginalSecurity`
defaults to `true`). I2 delivered M1 (`_breachMargin()`), M2's next-turn
lookup (`_hazardForMargin()`, `_breachKind()`) and M4 (`AIApproachDefense`),
all read in production through `_marginalHazard()`/`_marginalIceScore()`, and
its phase B points-based ICE consumer. Three corrections to the earlier
assumptions (re-grounded 2026-10-23):

- **No I3 slot exists in I2.** Phase B's stake for an empty remote is a
  pre-I3 placeholder in `_iceStake()`: only the designated next scoring remote
  (`memo.designated = _scoringServers()[0]` in `_marginalIceInstallOptions()`)
  gets a stake, the highest-point agenda in HQ, delayed by fix 3's
  `exposureTurns` (horizon − 1). I3 replaces that rule; it does not feed an
  existing input.
- **M2 is a constant next-turn hazard.** I2's M2 reliability and next-turn
  checks failed; the owner accepted the table for comparisons only and the
  code holds the next-turn hazard over `CORP_AI_I2_HORIZON_RUNNER_TURNS` (2)
  with no projected-income drift. `_breachHazard()`/`_projectedRunnerIncome()`
  exist but no decision reads them. I9 owns M2 recalibration under I3's roles.
- **M3 and M5 were absent at that earlier revision.** I4 has since delivered
  completion plans and HQ holding-risk estimates. Reuse those implementations
  where the selected consumer needs them; do not recreate them in I3.
  `POINT_VALUE` is `CORP_AI_POINT_VALUE` (4.4) in `ai_corp.js`.

**Before design freeze:** incorporate the [I2.2 retain disposition](../corp-ai/measurements/I2.2-rnd-protection-lateness.md)
and its review. This is a sequencing requirement, not an additional formal
dependency. Its paired replays establish an opening-ranking mechanism for
delayed R&D protection, alongside beneficial remote/HQ counterexamples;
they do not justify a mandatory central-first policy. When replacing the
designated-remote stake and exposure rule, account for competing HQ/R&D
agenda exposure and install timing. Preserve early, late and never-protected
R&D cases, and report per-central theft, never-protected counts and the share
bare through turn 2 (including early game-end censoring), not just conditional
first-ICE means. Use a fresh matched control for I3's separate policy gates.

The owner's [I2.3 HQ-then-R&D opening comparison](done/I2.3-hq-then-rnd-opening-ice-gate.md)
is complete: its F4 gate failed (seeds 5001–6000; R&D theft improved but
combined central theft, scoring and Corp wins regressed), so I3's control
keeps adopted I2 placement with `openingHqThenRdIce` off. That option remains
default-off only for the owner's manual playtests; I3 does not read it.
Seeds 5001–6000 are exposed and cannot be I3 adoption evidence. I2.3's
`openingCentralCoverage` collector and exact ICE-completion events are
available for I2.2's central-timing reports below.

**Sequencing change (owner decision 2026-10-23): I4 now runs first and I3
depends on it.** I4 takes over the piece of I3 that is needed regardless:
under its own option, its chosen agenda destination replaces I2's pre-I3
designated empty-remote stake in `_iceStake()`, re-chosen every turn from the
board. I3's remaining scope is the persistent role (`server.AIRemoteRole`)
and the opportunity cost for non-agenda roots in the scoring remote. Before
implementation, re-scope this ticket against I4's gate evidence and the
owner's playtests: proceed only if the Corp still drifts away from a safe
remote or crowds it with assets, and re-ground §2 and §5 against I4's code.
Seeds 6001–7000 stay reserved for I3.

## Goal
Name one scoring remote and keep it: the remote with the best projected
per-turn breach hazard (M2) after investment the Corp can afford, kept across
scores so that, once the Corp has built a remote the Runner cannot profitably
breach, it keeps installing and scoring agendas there. Supply that remote's
expected future agenda points to I2 (so maintaining it ranks by points saved)
and its identity and projected hazard to I4. Charge any non-scoring root
install that would occupy it the scoring value it displaces, in agenda points.

**Why this design.** Two earlier changes weakened the Corp by turning a
security measurement into a shared yes/no gate (`fa1182c`, and the
[L9.0.1 gate failure](done/L9.0.1-adopt-honest-lockout.md#resolution)),
and the owner's 2026-10-14 playtests saw agendas held in HQ and agendas left
unadvanced in weak remotes. The [scoring-risk model](../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16)
replaces "is this server secure?" with expected points lost by waiting versus
installing; I3's share is the remote role, in the model's words "the scoring
remote is the one with the best projected M2 after affordable investment; its
role persists across scores. An economy install that would occupy it pays the
lost scoring EV as opportunity cost." Owner's playtest note: "if it manages to
build a secure remote then keep getting agendas in and keep scoring."

## Current behaviour
Historical snapshot; use the current scope above and re-ground before building.
Verified at faccb78 in `ai_corp.js` (re-grounded 2026-10-23; previously 60fa0d7).

- `_emptyProtectedRemotes()` lists remotes with ICE and no agenda/asset root
  (an obsolete bluff counts as room unless it has two or more advancements and
  Trick of Light is in HQ or R&D), sorted by `_protectionScore()` descending.
  `_bestProtectedRemote()` returns the remote with the highest positive
  `_protectionScore()`, otherwise `null`.
- `_isAScoringServer(server)` (remotes only) always evaluates
  `_evaluateServerSecurity(server)` for `_protectionScore`; with
  `secureScoringServerGate` (default `false`) it also rejects
  `!isSecure`. It returns `true` if the root holds a scoring upgrade
  (`AIIsScoringUpgrade`), an agenda or an Ambush; otherwise it requires
  `_protectionScore` at least HQ's (Archives' when `_agendasInHand()` exceeds
  hand size − 1), no other empty protected remote holding a scoring upgrade,
  and being the strongest empty protected remote. The role is recomputed every
  call; nothing persists it.
- `_scoringServers()` filters the empty protected remotes through
  `_isAScoringServer()`. Readers: `_rankedInstallOptionsCore()`, I2's
  `_marginalIceInstallOptions()` (`memo.designated`, the pre-I3 stake seam
  above) and Vantage Point's `_preferredSearch` (`sets/vantagepoint.js`).
- In `_rankedInstallOptionsCore()` a game-winning fast-advance option into
  `strongestEmptyRemote` comes first; HVTs (`_isHVT()`) are offered into each
  scoring server; generic assets are offered into empty protected remotes in
  `_assetDestinationOrder()` order (a new remote only when installing from
  Archives or resolving cards with fewer than two empty remotes) and skip
  `strongestEmptyRemote`; options are sorted by
  `|_advancementLimit(card, server) − window| + 0.75 × _deceptionInstallDistance()`,
  where `window` is `_scoringWindow(server)` for scoring servers and 0
  otherwise. I2 changed only this function's ICE block; I2.3's
  `openingHqThenRdIce` lives elsewhere.
- `AIWorthInstalling(emptyProtectedRemotes)` lets 13 assets choose their own
  index (previously counted as 11 in four files): two each in
  `systemgateway.js`, `elevation.js` and `downfall.js` (Downfall is not yet a
  playable set), three in `systemupdate2021.js` and four in `vantagepoint.js`.
  Twelve call `_isAScoringServer()` to avoid scoring remotes; one in
  `vantagepoint.js` does not.
- `_isAScoringServer()` is also read by `_shouldUpgradeServerWithCard()`
  (scoring upgrades only into scoring servers), by
  `_rankedServersToProtect()` (scoring remotes get `−_agendasInHand()` as a
  protection-priority adjustment) and wrapped by
  `scripts/ai-batch/install-attribution.js`.
- `_bestServerToUpgrade()` uses a legal `AIPreferredUpgradeServer` when a card
  has it, and the weakest legal server under `installOnlyIn`. Otherwise it
  keeps the first non-empty protected remote only if R&D's `_protectionScore()`
  is at least the remote's, else R&D, then HQ, then Archives when it backdoors
  a stronger HQ. No role input.
- `_classifyRunnerMacroThreat()` returns `focus`
  (`balanced`/`hq`/`rd`/`centrals`) and `nonInteractive` from
  `_centralServerThreat()` penalties, growth and persistent pressure with fixed
  thresholds; only tests call it.
- `_breachConsequence()` (L7.1; L7.1's policy was not adopted) now has a
  production reader: I2's `_iceStake()` uses its `pointsExposed` for central
  stakes.
- Posture: `postureEpochs` defaults to `true` (L8.4 adopted).
  `_remoteDeceptionProfile()` caches per card in a WeakMap; with
  `matchLocalPostureFeedback` (default `true`, L8.5) the profile is rerolled
  at a new active posture commitment.
- L9.0's `honestLockout`/`honestIsSecure` fields feed `_breachMargin()` (M1)
  and so I2's marginal ICE score; L9.0.1's global `isSecure` adoption failed
  its gate and was removed.
- I1 candidate records carry `role` = the legacy preference group (for
  example `protectionIce`), not a remote role.

## Design

Earlier proposal, subject to the current scope amendment above. In particular,
excluding every occupied asset root would not address the new reuse question.

All values are in expected agenda points over the design note's short horizon
`H` Runner turns; credits convert only through the design note's single
`POINT_VALUE`. No new weights. `isSecure` is not consulted.

**1. Scoring remote: `_scoringRemote(context)`.** Candidates are every remote
whose root holds no asset and no agenda other than one already being scored
there, plus a new remote. The incumbent scoring remote remains eligible
when its agenda is replaced by an Ambush asset, preserving its persisted role
and expected scoring stakes under that substitution (scenario 6). For each, project M2 (server kind "agenda
remote") after the best ICE investment affordable from projected Corp credits
within `H`, using I2's `(ICE, server)` hypothetical evaluation and the same
hazard I2 adopted: `_hazardForMargin()` on `_breachMargin()`, held over
`CORP_AI_I2_HORIZON_RUNNER_TURNS` (re-grounded 2026-10-23: the design note's
per-turn re-evaluation against projected Runner income is not used, because
`_breachHazard()`'s projection failed I2's reliability check and no decision
reads it; using one hazard keeps I3's role choice and I2's ICE stakes on the
same scale). The scoring remote is the candidate with the
lowest projected cumulative hazard over `H`. Ties go to the current scoring
remote, then more installed ICE, then server order. Persistence needs no
hysteresis constant: sunk ICE keeps the incumbent's projected M2 low, and the
role is recorded on the server (`server.AIRemoteRole`, cleared when the server
is removed) so it survives empty roots between scores. A role changes only when
another candidate's projected hazard is strictly lower; the change is logged
with both hazards. An empty remote left by a spent asset (design note edge
case 1) is a normal candidate.

**2. Expected future agendas: `_expectedScoringStakes(server, context)`.**
Zero unless `server` is the scoring remote. Otherwise the expected agenda
points that will pass through it within `H`: agenda points in HQ (Corp-known)
plus expected agenda points drawn from R&D (R&D agenda density × planned
draws), minus the expected points stolen from HQ/R&D before they are installed
(for HQ, the design note's M5 formula M2(HQ) × min(1, accesses ÷ HQ size);
for R&D, M2 × accesses × density). I4 owns and implements M5; I3 reuses it. Discount only theft
attributable to that projected supply, rather than unrelated agendas remaining
in R&D. Cap the result by what the Corp can advance in `H`
(`_potentialAdvancement()` per turn), then floor the final stakes at zero. The stolen-from-centrals
discount is how "stop investing in remotes while centrals collapse" survives:
when centrals leak, fewer agendas reach the remote, so I2 values remote ICE
less and central ICE more, in the same unit. `_classifyRunnerMacroThreat().focus`
stays diagnostic (its thresholds are uncalibrated); the previous rule that
consumed it is dropped.

**3. Opportunity cost for occupying the scoring remote.** A root candidate
that is not an agenda and not a scoring upgrade, targeting the scoring remote,
gets `opportunityCost` (points) =
`_expectedScoringStakes(scoringRemote) × (P(score | scoring remote) −
P(score | next-best remote))`, with `P(score) = Π(1 − M2 per exposed turn)`
over M3's exposure turns once I4 ships M3 (until then, one exposed turn per
agenda). The candidate is kept and ranked by its value minus this cost; it is
not forbidden. Before I5 supplies `economyValue`, the root's value is
its printed rez cost at `POINT_VALUE` (see open questions). This applies to
candidates from every generator, including `AIWorthInstalling` hooks, inside
I3's candidate layer; `_isAScoringServer()` and the hooks are unchanged
(principle 6: no shared verdict changes meaning).

**4. Roles on candidates.** Each remote gets one observed role: `scoring`
(the scoring remote), `economy` (holds an asset that is not a trap), `trap`
(holds an Ambush or `AIPunishesAccess` root, value owned by I5), or `spare`
(protected, empty, not scoring). Root candidates record the target's current
role, the proposed role after install and `opportunityCost`; a
`scoring`→other change appears in `rejectionReasons`/`reasons` naming the
displaced role. Bluff and bait remain L8 inputs, not roles.

**5. What I3 supplies.**
- To I2 phase B: with `remoteRoles` on, `_iceStake()`'s pre-I3 empty-remote
  rule (designated `_scoringServers()[0]`, highest-point HQ agenda, fix 3's
  `exposureTurns` delay) is replaced by `_expectedScoringStakes(server)` for
  the scoring remote and zero for other empty remotes. It must depend only on
  the remote's role and the Corp's agenda supply, never on whether the current
  root is an agenda or a trap, so I2's equivalent-board substitution invariant
  holds. Per I2.2, the replacement must be weighed against competing HQ/R&D
  exposure and install timing (the stolen-from-centrals discount in 2 is that
  term), not simply add remote points; no mandatory central-first rule.
- To I4: `_scoringRemote()` (server or new remote), its per-turn projected M2
  over `H` and the ICE investment that projection assumed, as the
  "install in s" destination and as next turn's improvement for `EV(hold)`.
  Repeat scoring then needs no rule: after a score the remote keeps its role
  and low M2.

**Deception input ownership.** [L8.8](../corp-ai/specs/L8.8-marginal-deception-value.md)
owns any marginal concealment value and I5 owns `trapValue`; I3 adds neither
and does not feed private trap payoff into ICE ranking. Placing a trap in the
scoring remote pays the same `opportunityCost` as any non-agenda root. Read
[L8.9](done/L8.9-observable-defense-parity.md)'s post-I2 attribution before
implementing (a sequencing preference, not a dependency).

**Measurement handoff from L8.9 (2026-10-19).** L8.9 delivers observation and
findings, not an admission rule. Its proposed restriction on new bare trap
remotes was withdrawn without implementation. I3 owns role/occupancy decisions
for every candidate, while I5 owns whether/where installing an asset or trap is
worthwhile. Do not inherit a “must have ICE” condition from that experiment.

Use the [tool recipe](../ai-batch-harness.md#using-install-observations-in-the-i-tickets)
on fresh I3 baseline/candidate reports: collect `realizedIceByRootType`,
`bluffSingleVariableCorrelation` and `installOutcomes`; run
`node scripts/ai-batch/install-defense-summary.js <one-arm-report.json>` offline.
Inspect requested/committed install ICE, placement eligibility/rank/reason,
per-deck/routes, shared ICE changes, root ages and endpoints. Compare whether
scoring-room occupancy changes allocation or merely which roots survive. Keep
unknown inputs and failed-game coverage visible; use the existing L8.9 focused
regressions for observation changes. These diagnostics supplement I3's own
role collector and paired gate; they do not add or replace an improvement target.

Include a shell/asset-spam counterexample: many cheap roots can legitimately
occupy bare remotes while one scoring remote stays protected. A count difference
or a new remote is not itself an error. Current L8.9 samples do not establish
representative shell-plan coverage or a full ordinary-asset/topology history;
state those gaps and add scoped passive evidence if a claim depends on them.
[I3.1](../corp-ai/specs/I3.1-deck-game-plan-profile.md) owns future starting-deck evidence, but
I3 need not wait for that profile or invent an archetype rule now. L8.9's
calibrated noise allowances belong to its old baseline; reconcile fresh coverage
and consumer-specific thresholds before candidate results.

Option: `remoteRoles` (Corp AI), default `false`. With it off, nothing above is
computed and decisions are identical.

## Safety and information boundary
Roles and stakes use only Corp-visible information (its own HQ, root cards
and public Runner state); no Runner Grip or hidden card identities. The
expected-stakes input to I2 must be identical for equivalent boards whose
remote root is an agenda versus a trap. Band 3 (game-winning score) and
game-losing steal rules stay boolean and outrank `opportunityCost`. Changing a
remote's role clears or re-evaluates its posture at the next L8.4 epoch
boundary; no deception safety rule is weakened.

## Test scenarios
1. Two protected empty remotes with ICE, Runner credits fixed: the one with
   lower projected M2 after affordable investment is `scoring`; after an
   agenda is scored from it (root empty again) it is still `scoring`.
2. The scoring remote has projected M2 lower than any alternative; an economy
   asset with a new-remote alternative goes to the new remote, logging
   `opportunityCost` and the displaced `scoring` role. With HQ holding no
   agendas and R&D density 0, `_expectedScoringStakes` is 0 and the asset may
   take the remote.
3. An `AIWorthInstalling` asset that returns the scoring remote's index
   receives the same `opportunityCost` as a generic asset.
4. Same Corp board, R&D breached every turn (high R&D M2) versus not:
   `_expectedScoringStakes(scoringRemote)` is lower in the leaking case, and
   I2's ranking moves toward the R&D ICE candidate.
5. Reuse a protected remote left empty after an asset departs. Also exercise
   the new log's still-installed, counterless Hostile asset: compare replacement
   with keeping it and building elsewhere. Include an asset with useful remaining
   abilities/counters that should be kept, an ordinary aging asset, and a remote
   where an exposed agenda would be a bad risk. Test the selected behaviour
   with I4 destination planning off, not just with all I4 flags on.
6. After removing the asset from the reconstructed board, exercise the separate
   Archives-relative rejection. Record which I3/I4 consumer owns any changed
   placement decision; do not silently change every `_isAScoringServer()` reader.
7. Agenda/trap substitution: replacing the scoring remote's agenda with an
   Ambush leaves its role and `_expectedScoringStakes` unchanged.
8. Information boundary: substituting hidden Runner Grip cards leaves every
   role, stake and cost unchanged.
9. `remoteRoles` off: install decisions and decision snapshots are identical
   to the baseline.

## Acceptance gate
Human gate. Option `remoteRoles` (Corp AI), new behaviour off unless the owner
requests otherwise. Owner-controlled playtesting under
`documentation/ai-playtesting.md`; no fixed sample or numerical thresholds.
Assess: making and reusing a protected scoring remote without discarding useful
assets, starving central defence or forcing exposed agenda installs.
Adoption: Paul decides after playtesting; record the tested flags and decision.
The reported working setup has `agendaCommitmentPlan=true`,
`agendaExposureTable=true`, `agendaDestinationPlan=false` and
`openingHqThenRdIce=true`; capture the actual configuration used for each test.

## Historical F4 comparison proposal

Not a current adoption requirement or an instruction to build every collector.
Retained for provenance and an optional comparison if the owner requests it.
The baseline/default assumptions and start-board availability below predate the
current playtest evidence and must be refreshed before any such run. Seeds
6001–7000 remain reserved; this documentation change runs no games.

Expected effect: small direct redirection in pool games. Legacy code already
keeps generic assets off the strongest empty remote and 12 of the 13
`AIWorthInstalling` hooks avoid scoring servers. Most of I3's effect reaches
play through its replacement of I2's pre-I3 empty-remote stake in
`_iceStake()`, which changes which ICE is installed where, and later through
I4's destinations. Command 1 is therefore non-inferiority only; command 2 must
show the persistent scoring remote improves scoring on boards where it matters.

F4 gate. Option `remoteRoles` (Corp AI), off in the baseline and on in the
candidate. Both arms use current defaults, which include I2's adopted
`iceMarginalSecurity=true` and `openingHqThenRdIce=false`; the command states
`iceMarginalSecurity` explicitly. Committed deck pool, paired seeds 6001–7000
(1,000 games per deck pair; unused by any earlier gate; I2 and I2.3 used 1,000
per pair), bootstrap 95% intervals. Fresh matched control: run on the I3
branch after `main` (Downfall, I2.3) is merged in, never reusing I2 or I2.3
reports.
Collectors: `remoteRoles` (adds `remoteRoles.scoringRemoteSwitches` and
`remoteRoles.scoringRemoteOccupiedTurns`, report-only, defined in this ticket),
`centralStolen`, `corpInsolventTurns`, `strandedUnrezzedIceCost`,
`bluffSingleVariableCorrelation`, `realizedIceByRootType` (F12),
`installOutcomes` (L8.9 recipe) and `openingCentralCoverage` (I2.3; report-only,
for I2.2's turn-1/2 central coverage).
Starts: boards this ticket builds with `scripts/start-board.js` from benchmark
game logs (`ai-batch.js replay` of a pool seed reaching this state; no human
logs exist),
tagged `scoring-remote`: the Corp has a protected remote with no root, an
agenda in HQ and an economy asset in HQ.

Command 1 (deck pool; non-inferiority only):

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsStolenByServer.remote` | lower | regression at most 0.15 |
| Guard | `pointsStolenByServer.hq` | lower | regression at most 0.1 |
| Guard | `pointsStolenByServer.rd` | lower | regression at most 0.1 |
| Guard | `gameLength` | lower | regression at most 1.5 |
| Guard | `corpInsolventTurns` | lower | regression at most 0.5 |
| Guard | `strandedUnrezzedIceCost.credits` | lower | regression at most 1 |
| Guard | `bluffSingleVariableCorrelation.max` | lower | regression at most 0.02 |
| Guard | `realizedIceByRootType.allCountCorrelation` | lower | regression at most 0.05 |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | regression at most 0.05 |

Gate command: `node scripts/ai-batch.js gate --pool tests/fixtures/ai-batch/deck-pool.json --corp-option remoteRoles=true --corp-option iceMarginalSecurity=true --seeds 6001-7000 --collector remoteRoles --collector centralStolen --collector corpInsolventTurns --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --collector installOutcomes --collector openingCentralCoverage --guard winRate=0.02 --guard pointsScored=0.2 --guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.15 --guard pointsStolenByServer.hq=0.1 --guard pointsStolenByServer.rd=0.1 --guard gameLength=1.5 --guard corpInsolventTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05 --better gameLength=lower`

Command 2 (start boards):

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsScored` | higher | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsStolenByServer.remote` | lower | regression at most 0.15 |

Gate command: `node scripts/ai-batch.js gate --corp-option remoteRoles=true --corp-option iceMarginalSecurity=true --start-tag scoring-remote --budget 1400 --collector remoteRoles --collector realizedIceByRootType --improve pointsScored --guard winRate=0.02 --guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.15`

The gate passes only when both commands pass. The `pointsStolenByServer.remote`
guard is tightened from the standard 0.2 because I3 directly changes what sits
in remotes; the HQ and R&D guards (previously one combined +0.1 bound) check
that stakes-weighted remote ICE does not starve the centrals.

**Re-grounding changes (2026-10-23).** The earlier
`realizedIceByRootType.allCountDistance` guard at 0.02 is replaced: that metric
is total variation, and [deception-gates.md](../corp-ai/deception-gates.md) forbids
copying I2's rho margin into TV units or leaving a provisional threshold to be
frozen later. I3 instead keeps I2's adopted tell and performance guard set
(rho count/posture at 0.05, bluff correlation, game length, insolvency and
stranded ICE), which I2 and I2.3 both ran. The earlier rejection of the bluff
row depended on the TV guard and is withdrawn. Seeds, pool, explicit prior
option, `--budget 1400` and the command 2 remote guard are added; no existing
metric threshold was loosened. Any TV-based tell guard needs control-only
calibration recorded here before any candidate run.

I2.2 report requirements (report-only, in the Resolution): R&D and HQ theft
separately; conditional first-ICE timing per central together with
never-protected counts and the share bare through turn 2, including early
game-end censoring; early, late and never-protected R&D cases preserved in
the evidence. `openingCentralCoverage` gives turn-1/2 occupancy; add a passive
per-central never-protected count if the existing collectors do not supply it.

## Things to consider
- `_isAScoringServer()` keeps its meaning; I3 adds `_scoringRemote()`
  alongside it. Migrating its other consumers (`_rankedServersToProtect()`,
  `_shouldUpgradeServerWithCard()`, the `systemupdate2021.js` hooks) belongs
  to their owners (I2, I6, I5) under their own gates.
- M2 is calibrated under today's Corp policy; once roles persist, the Runner
  AI's targeting of the scoring remote may shift. Recalibrate before I4's gate
  (design note, known risks).
- A remote that holds an agenda being advanced stays `scoring`; trashing an
  advanced agenda to reuse a remote is out of scope.

## Acceptance criteria
- [ ] When this work fixes `corp-agenda-held-while-secure-remote-available.md`, update that bug's Resolution and validation evidence, move its passing reproduction into the green suite, and run `node scripts/ticket.js move documentation/bugs/corp-agenda-held-while-secure-remote-available.md code-review` as part of the I3 handoff. Hand off both tickets for review; do not leave the fixed bug in the open folder or move it directly to `done/`.
- [ ] Resolve the linked bug `documentation/bugs/corp-agenda-held-while-secure-remote-available.md` as part of this work, not a separate future pickup. Run `tests/pending/corp-agenda-blocked-by-occupied-remote.test.js`, record the disposition of both cases in that bug, and carry it through review/closure alongside the relevant I3/I4 change. A fixed case must pass unchanged and enter the green suite; if its strategic expectation is refuted, record the evidence and the resulting disposition. Do not close I3 with this bug silently left open: any genuinely separate remaining work needs an explicit owner and tracked follow-up.
- [ ] Re-ground the affected I3/I4 code paths and agree a scoped design against the current playtest evidence before implementation; do not build the older full role/value proposal by default.
- [ ] Record whether the agenda-heavy hand justifies waiting, drawing, preparing another remote or replacing the asset, distinguishing test facts from strategic preference.
- [ ] Exercise the source board and asset-removed variation; record how the selected I3/I4 change handles each. If an expectation is unsupported, document the evidence rather than weakening it to obtain a pass.
- [ ] Any fixed pending reproduction passes unchanged and moves into the green suite. Evidence that remains unresolved is explicitly tracked, not claimed fixed by a partial change.
- [ ] Test retained useful assets, ordinary aging assets, Hostile assets with and without useful remaining abilities, and agenda/trap substitution. No card-title special cases or blanket Hostile/zero-counter replacement rule.
- [ ] The chosen behaviour works with I4 destination planning off; installing or holding an agenda stays an explicit I4 ownership decision.
- [ ] New strategic behaviour ships under a named AI flag, initially off unless Paul requests otherwise; its comment describes the playtest behaviour plainly. Unrelated decisions retain their existing meaning.
- [ ] Record the tested flags, useful logs and contrasting outcomes, and hand off the behaviour for owner playtesting. Record Paul's adoption decision separately from implementation completion; leave it pending if not yet given.
- [ ] Preserve lawful hidden-information use, hypothetical restoration, deterministic randomness and relevant central-defence/tactical regressions.
- [ ] New or changed AI card hooks are documented in `documentation/ai.md`, and affected playable sets are covered.
- [ ] `documentation/corp-ai/architecture.md` describes only the behaviour actually implemented.
- [ ] Required focused tests and the final full ticket check pass under `tests/README.md`.
