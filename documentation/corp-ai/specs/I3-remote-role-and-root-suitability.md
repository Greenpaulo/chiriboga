# I3 Remote role and root suitability

**Roadmap item:** I3 · **Depends on:** I2, F4, L8.4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [install-decisions-design.md: Scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16), [I2](I2-ice-selection-by-marginal-security.md), [deception gate reconciliation](../deception-gates.md)
**Verified against code:** 60fa0d7 (2026-10-16)

Dependency state at 60fa0d7: L8.4 is done and adopted (`postureEpochs`
defaults to `true`); F4 is done; I2 is proposed. I3 needs I2 phase A
(measurements M1, M2, M4 and the M2 reliability check) and I2's phase B
expected-points ICE consumer, which reads I3's expected future agendas.

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
[L9.0.1 gate failure](../../backlog/done/L9.0.1-adopt-honest-lockout.md#resolution)),
and the owner's 2026-10-14 playtests saw agendas held in HQ and agendas left
unadvanced in weak remotes. The [scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16)
replaces "is this server secure?" with expected points lost by waiting versus
installing; I3's share is the remote role, in the model's words "the scoring
remote is the one with the best projected M2 after affordable investment; its
role persists across scores. An economy install that would occupy it pays the
lost scoring EV as opportunity cost." Owner's playtest note: "if it manages to
build a secure remote then keep getting agendas in and keep scoring."

## Current behaviour
Verified at 60fa0d7 in `ai_corp.js`.

- `_emptyProtectedRemotes()` lists remotes with ICE and no agenda/asset root
  (obsolete bluffs count as room unless kept for Trick of Light), sorted by
  `_protectionScore()` descending. `_bestProtectedRemote()` returns the remote
  with the highest `_protectionScore()`.
- `_isAScoringServer(server)` (remotes only): with
  `secureScoringServerGate` (default `false`) it first rejects
  `!_evaluateServerSecurity(server).isSecure`; then it returns `true` if the
  root holds a scoring upgrade (`AIIsScoringUpgrade`), an agenda or an Ambush;
  otherwise it requires `_protectionScore` at least HQ's (Archives' when the
  hand is about to overflow with agendas), no other empty protected remote
  holding a scoring upgrade, and being the strongest empty protected remote.
  The role is recomputed from scratch every call; nothing persists it.
- `_scoringServers()` filters the empty protected remotes through
  `_isAScoringServer()`. In `_rankedInstallOptionsCore()` HVTs (`_isHVT()`)
  are offered into each scoring server; generic assets are offered into empty
  protected remotes in `_assetDestinationOrder()` order (a new remote only when
  installing from Archives or resolving cards with fewer than two empty
  remotes) and skip `strongestEmptyRemote`; options are sorted by
  `|advancement requirement − _scoringWindow()| + 0.75 × _deceptionInstallDistance()`.
  Assets with `AIWorthInstalling(emptyProtectedRemotes)` (11 cards across
  `systemupdate2021.js`, `systemgateway.js`, `elevation.js`, `vantagepoint.js`)
  choose their own index; the three in `systemupdate2021.js` call
  `_isAScoringServer()` to pick the first non-scoring remote.
- `_isAScoringServer()` is also read by `_shouldUpgradeServerWithCard()`
  (scoring upgrades only into scoring servers) and by
  `_rankedServersToProtect()` (scoring remotes get `−_agendasInHand()` as a
  protection-priority adjustment).
- `_bestServerToUpgrade()` uses `AIPreferredUpgradeServer` when a card has
  it; otherwise the first non-empty protected remote, falling back to the
  weakest of R&D/HQ/Archives by `_protectionScore()`. No role input.
- `_classifyRunnerMacroThreat()` returns `focus`
  (`balanced`/`hq`/`rd`/`centrals`) from `_centralServerThreat()` penalties
  with fixed thresholds; only tests call it.
- `_breachConsequence()` exists (L7.1) but L7.1 was **not adopted** (gate
  failed 2026-10-09); no production decision reads it.
- Posture: `postureEpochs` defaults to `true` (L8.4 adopted), so bait/bluff
  commitments are re-evaluated at epoch boundaries; `_remoteDeceptionProfile()`
  still caches the profile shape per card lifetime.
- L9.0's `honestLockout`/`honestIsSecure` fields are observation-only;
  L9.0.1's global adoption failed its gate and was removed.
- I1 candidate records carry `role` = the legacy preference group (for
  example `protectionIce`), not a remote role.

## Design

All values are in expected agenda points over the design note's short horizon
`H` Runner turns; credits convert only through the design note's single
`POINT_VALUE`. No new weights. `isSecure` is not consulted.

**1. Scoring remote: `_scoringRemote(context)`.** Candidates are every remote
whose root holds no asset and no agenda other than one already being scored
there, plus a new remote. For each, project M2 (`breachHazard`, server kind
"agenda remote") after the best ICE investment affordable from projected Corp
credits within `H`, using I2's `(ICE, server)` hypothetical evaluation and
re-evaluating M1 against projected Runner income each turn (as the design note
says; never assume independence). The scoring remote is the candidate with the
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
(M5 for HQ, M2 × accesses × density for R&D), capped by what the Corp can
advance in `H` (`_potentialAdvancement()` per turn). The stolen-from-centrals
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
- To I2 phase B: `_expectedScoringStakes(server)` as the "I3's expected future
  agendas" term of points through the server. It must depend only on the
  remote's role and the Corp's agenda supply, never on whether the current
  root is an agenda or a trap, so I2's equivalent-board substitution invariant
  holds.
- To I4: `_scoringRemote()` (server or new remote), its per-turn projected M2
  over `H` and the ICE investment that projection assumed, as the
  "install in s" destination and as next turn's improvement for `EV(hold)`.
  Repeat scoring then needs no rule: after a score the remote keeps its role
  and low M2.

**Deception input ownership.** [L8.8](L8.8-marginal-deception-value.md)
owns any marginal concealment value and I5 owns `trapValue`; I3 adds neither
and does not feed private trap payoff into ICE ranking. Placing a trap in the
scoring remote pays the same `opportunityCost` as any non-agenda root. Read
[L8.9](L8.9-observable-defense-parity.md)'s post-I2 attribution before
implementing (a sequencing preference, not a dependency).

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
5. A spent-asset remote with one ICE becomes the scoring remote rather than a
   new remote being opened when its projected M2 is lower (design note edge
   case 1).
6. Agenda/trap substitution: replacing the scoring remote's agenda with an
   Ambush leaves its role and `_expectedScoringStakes` unchanged.
7. Information boundary: substituting hidden Runner Grip cards leaves every
   role, stake and cost unchanged.
8. `remoteRoles` off: install decisions and decision snapshots are identical
   to the baseline.

## Acceptance gate
Expected effect: small in pool games. Legacy code already keeps generic assets
off the strongest empty remote and the `systemupdate2021.js` hooks avoid
scoring servers, so the direct redirection rarely fires; most of I3's value
reaches play through I2's points-based ICE ranking and I4's destinations.
Command 1 is therefore non-inferiority only; command 2 must show the persistent
scoring remote improves scoring on boards where it matters.

F4 gate. Option `remoteRoles` (Corp AI), off in the baseline and on in the
candidate, both arms with I2's adopted options and current defaults. Committed
deck pool, paired seeds, 200 games per deck pair, bootstrap 95% intervals.
Collectors: `remoteRoles` (adds `remoteRoles.scoringRemoteSwitches` and
`remoteRoles.scoringRemoteOccupiedTurns`, report-only, defined in this ticket),
`realizedIceByRootType` (F12).
Starts: boards this ticket builds with `scripts/start-board.js` from real logs,
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
| Guard | `realizedIceByRootType.allCountDistance` | lower | paired pooled regression at most 0.02 (provisional; frozen from F12 control calibration before any candidate run) |

Gate command: `node scripts/ai-batch.js gate --corp-option remoteRoles=true
--collector remoteRoles --collector realizedIceByRootType --guard winRate=0.02
--guard pointsScored=0.2 --guard pointsStolen=0.2
--guard pointsStolenByServer.remote=0.15 --guard pointsStolenByServer.hq=0.1
--guard pointsStolenByServer.rd=0.1 --guard realizedIceByRootType.allCountDistance=0.02`

Command 2 (start boards):

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsScored` | higher | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |

Gate command: `node scripts/ai-batch.js gate --corp-option remoteRoles=true
--collector remoteRoles --start-tag scoring-remote --improve pointsScored
--guard winRate=0.02 --guard pointsStolen=0.2`

The gate passes only when both commands pass. The `pointsStolenByServer.remote`
guard is tightened from the standard 0.2 because I3 directly changes what sits
in remotes; the HQ and R&D guards (previously one combined +0.1 bound) check
that stakes-weighted remote ICE does not starve the centrals. The earlier proposal to add a `bluffSingleVariableCorrelation.max`
no-worse row is not adopted; the F12 paired TV guard above replaces it, per
[deception-gates.md](../deception-gates.md).

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
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Every root install candidate carries the target remote's current and proposed role and its `opportunityCost` in points; a displaced `scoring` role is named in its reasons.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [ ] Applicable gate evidence is recorded in the Resolution.
      For F4: exact command, committed deck pairs, paired seeds, seed count,
      every metric's baseline/candidate result and bootstrap 95% confidence
      interval, guarded-regression result, pass conditions and thresholds; an
      improvement interval's lower bound must be above zero. Only then is the
      option switched on by default.
- [ ] The `remoteRoles` collector exists, declares its metrics report-only, and is tested.
- [ ] The `scoring-remote` start boards exist, each `NOTE` names its source log or what was adapted, and they are tested.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the scoring remote, its persistence and the stakes it supplies to I2 and I4, and no longer says I3 will consume `_classifyRunnerMacroThreat().focus`.
- [ ] `node tests/run-all-tests.js` passes.
