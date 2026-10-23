# I4 Agenda installation and scoring commitment

**Outcome:** blocked — score-fast plan execution is ready behind `agendaCommitmentPlan`; its F4 gate is pending (the owner runs it). Agenda destination/hold is split to I4.1.

**Roadmap item:** I4 · **Depends on:** I2, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [install-decisions-design.md: Scoring-risk model](../../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16), [I2](../done/I2-ice-selection-by-marginal-security.md) phase A, [I3](../I3-remote-role-and-root-suitability.md) (now follows I4)
**Verified against code:** eb78846 (2026-10-23; after the Downfall merge, whose only relevant change is the band-3 `AICannotScoreOnInstallTurn` skip noted below)

## Resolution

Implemented from eb78846, 2026-10-23.

**Gate:** pending F4 — `agendaCommitmentPlan` defaults to off.

**Gate command:** `node scripts/ai-batch.js gate --pool tests/fixtures/ai-batch/deck-pool.json --corp-option agendaCommitmentPlan=true --corp-option iceMarginalSecurity=true --seeds 7001-8000 --collector installOutcomes --collector stallTurns --collector corpInsolventTurns --collector agendaCommitment --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --improve winRate --improve pointsScored --guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.5 --guard gameLength=1.5 --better gameLength=lower --guard corpInsolventTurns=0.5 --guard stallTurns=0.5 --guard installOutcomes.installToScoreTurns=0.5 --guard installOutcomes.agendaExposureTurns=0.5 --guard agendaCommitment.idleAgendaTurns=0.5 --guard agendaCommitment.hqHoldTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05`

**Quick run:** `350 paired games, 229 changed by the options [quick: indicative only, cannot pass a gate]` (2026-10-23, gate command without `--seeds`; `--quick` with `--seeds` plays the full range). Indicative only: win rate 0.309 → 0.320 [−0.034, +0.057]; points scored 4.049 → 3.800 [−0.483, −0.026]; remote points stolen 2.034 → 2.471 [+0.226, +0.657]; insolvent turns 1.717 → 2.031; idle agenda turns 3.020 → 1.857; agenda exposure turns 1.579 → 1.372. The quick sample failed the remote-theft, insolvency, two tell guards and both improvements. Likely cause, to check in the full run: advancing across turns shows counters, which the Runner AI targets, and I2's table does not condition on counters (the same blind spot I4.1 measures). If the full gate fails, follow "When a gate fails" and carry this into I4.1.

**Scope split (owner decision 2026-10-23).** The full design was built and
tried. Quick batches (7 pairs × 20 seeds, not gate evidence):

| Variant | Corp win | Scored | Stolen |
|---|---|---|---|
| Option off | 30.0% | 4.09 | 6.18 |
| Destination/hold + score fast (full design) | 22.9% | 2.78 | 6.57 |
| Same, destinations limited to remotes with ICE | 27.9% | 3.26 | 6.36 |
| Score fast only (shipped) | 32.9% | 3.81 | 6.00 |

Replays (gateway seed 4) show the destination/hold choice installing
agendas in bare new remotes, which were stolen on the next run. I2's
breach-hazard table rates a bare remote with a large Runner margin at about
0.24 per Runner turn and a one-ICE remote at about 0.20. It was measured
under a policy that seldom leaves agendas there, and the Runner AI attacks
advanced cards, so its absolute rates do not describe these boards (I2
accepted it for comparisons only). The design's install/hold EV compares
those absolute rates against HQ's, so it cannot be trusted until that risk is
measured. The destination/hold consumer, the hold-streak recording and I2's
empty-remote stake following I4's destination were removed; their design
and the replay evidence move to
[I4.1](../../corp-ai/specs/I4.1-agenda-destination-and-hold.md). Scenario 1
(the pending reproduction) is an install/hold case and stays pending there:
under the trial it passed with install 0.90 against hold 0.99 (the owner's
install-within-0.1 amendment).

**What ships behind `agendaCommitmentPlan`.**

- `_plannedAgendaToAdvance()` admits one installed agenda to `Phase_Main`'s
  advance block without `_sufficientEconomy()` or the start rule when its M3
  plan (`_agendaCompletionPlan(..., installed = true)`) scores within
  `CORP_AI_I2_HORIZON_RUNNER_TURNS`, advances this turn, and leaves at least
  the server's planned ICE rez cost (`defenceReserve`) after the advance.
  Advancing must gain more points (exposure E rather than E + 1 at the
  server's held next-turn hazard) than I2's best ICE for that server saves
  (`_bestDefencePoints()`). `almostDoneAgenda` still takes precedence.
- Observation only: `_agendaCommitmentOptions()` (every destination and
  hold, with EV, `W`, M3 and M5) is logged on agenda install decisions.
- `AIScoringPlanCommitted` keeps its legacy meaning; the "only when E ≤ H"
  rule belonged to the destination consumer and moved with it.

**Phase A (hooks, measurements, collector).** Six title cases moved to
hooks with an identity run (7 pairs × 20 seeds, every log and decision hash
unchanged): Built to Last and Oaktown Renovation declare
`AIAdvanceCreditGain` (now read from `corp.identityCard` as well, with an
`advancementSoFar` context); Seamless Launch, Psychographics and Biotic
Labor declare `AIFastAdvanceCounters`, which may now return
`{counters, credits, clicks}` and receives a search context; SanSan City
Grid declares the new `AIScoringSupport`. Trick of Light stays a title case
(its room check moved into `_remoteHasRoom()`). With the option on and no
consumer, the identity run also matched; after the split, option-off games
are again identical to the pre-I4 baseline (140 of 140).

**Cards updated:** System Gateway: Weyland Consortium: Built to Last,
Seamless Launch. System Update 2021: Oaktown Renovation, Psychographics,
Biotic Labor, SanSan City Grid. No other card in the playable sets has an
advancement title case in `_potentialAdvancementDirections()` or
`_advancementLimit()` except Trick of Light (kept).

**Departures from the ticket.**
- `rezPlanCost` is computed inside M3 from `plannedRezIce` rather than added
  to `_evaluateServerSecurity()`, to leave cached evaluations unchanged.
- M3 keeps only the reserve-respecting plan; the second plan that spends
  `defenceReserve` to finish faster is not built.
- `AIFastAdvanceCounters`' object form reports gains beyond the printed play
  cost (an X cost as negative credits), not the net change including it, so
  the search keeps applying `PlayCost`/`PlayClickCost` as before.
- The advance/defend comparison counts ICE net of its install and rez cost
  (I2's score) and advancing gross, since advancing's credits are spent
  whenever the agenda is scored.

**Tests.** Green fixtures: `i4-score-fast-advances-planned-agenda.txt`
(reserve-blocked board advances), `i4-score-fast-off-keeps-reserve.txt`
(same board, option off), `i4-score-fast-keeps-defence-reserve.txt`,
`i4-advance-beats-defence.txt`, `i4-almost-done-agenda-unchanged.txt`
(band 3). `ai-batch-install-outcomes.test.js` covers the `agendaCommitment`
collector on scripted boards (idle, advanced, scored, held with and without
a free remote). Reproduction: `tests/fixtures/corp-decisions-pending/corp-agenda-held-while-secure-remote-available.txt`
stays pending for I4.1.

**Left open:** the full gate (owner); I4.1; the owner playtest before any
default change.

## Implementation plan

Proposed at `eb78846`, 2026-10-23. **Approved 2026-10-23**, with one owner
amendment: when the best install and hold differ by less than 0.1 points
(the same band the design uses for deception ordering), install. This is
the tempo and aggressive play the points-only EV misses; it also settles
scenario 1's near-tie.

- **Validation:** Strategic change; the F4 gate stands. The re-grounding at
  65251a5 holds after the Downfall merge. The pending reproduction fails as
  described at eb78846 (`Phase_Main -> gain`, expected install of Hostile
  Takeover into Remote 0). **Disagreement — scenario 1 may not follow from the
  design.** At the fixture's state (2 clicks, 5 credits, Runner 0 credits, no
  programs) installing now gives `E = 1`, while holding gives
  `D = EV(install next turn with E = 0) = 2`. With `H = 2`, `EV(install) ≈ 2 − 4h_remote`
  and `EV(hold) ≈ 2 − 4·m5`, where `m5 = h_HQ × a/n` (HQ has 5 cards, so
  about 0.2·h_HQ). Both servers fall in low lockout buckets, so the points-only
  EV probably prefers holding, by a margin within the M2 table's noise. The fixture's
  install is justified by tempo (this turn's clicks do useful work and next
  turn is freed), which a points-only EV does not see. The indefinite-hold
  guard's rule (a) is also ambiguous when `D` needs no improvement. Phase A
  logs the exact EVs for this board before any consumer is written. If hold
  wins, I stop and ask, rather than tune the design or the fixture.
- **Approach (two checkpoints):**
  1. **Phase A, observation only.**
     - `_evaluateServerSecurity()` gains `rezPlanCost`.
     - New helpers: `_agendaCompletionPlan()` (M3), `_hqStealHazard()` (M5,
       held next-turn hazard) and `_agendaCommitmentOptions()` (every
       destination plus hold, with EV, `W`, plan and reasons).
     - The options are logged on each agenda decision with
       `agendaCommitmentPlan` off.
     - Hook migrations from the table below. Five title cases leave
       `LEGACY_TITLES`: SanSan City Grid in `_advancementLimit`, and Built to
       Last, Oaktown, Seamless Launch, Psychographics and Biotic Labor in
       `_potentialAdvancementDirections`. Trick of Light stays.
     - `agendaCommitment` collector plus the headless events it needs.
     - Identity run: 7 pairs × 20 seeds, comparing `logHash` with and
       without the phase A code.
     - **Checkpoint:** report the scenario 1 EVs, the identity run and the
       share of agenda decisions where the plan would differ.
  2. **Phase B, consumer behind `agendaCommitmentPlan`.**
     - Destination-or-hold choice in the agenda branch of
       `_rankedInstallOptionsCore()`, bypassing `_isAScoringServer()` for
       agendas only.
     - Band 2 and band 3 constraints.
     - `AIScoringPlan` on install. The `Phase_Main` advance block admits a
       planned agenda against its `defenceReserve` instead of
       `_sufficientEconomy()`.
     - The advance-versus-defend comparison.
     - The I2 stake seam: `memo.designated`, `_iceStake()` and the fix 3
       `exposureTurns` (ai_corp.js around 5454, 5532 and 5585).
     - Deterministic tests, `--quick` gate, then the full gate with one
       blocking command.

  Rejected alternatives:
  - Patching only `_sufficientEconomy()` for committed agendas
    (`committedAgendaReserveBypass` already exists and stays off). It fixes
    the "score fast" part but not destinations or holding.
  - Waiting for I3's role.
- **Tests:**
  - `tests/corp-install-decisions.test.js` gets scenarios 2–9 as cases,
    asserting the logged EV, `W` and reason as well as the choice.
  - The pending fixture moves to green unchanged if scenario 1 holds.
  - Hook-migration cases go in the existing card or advancement tests.
  - New collector test next to the existing collector tests.
  - The fixtures listed under Test scenarios stay green with the option off,
    or with `secureScoringServerGate` on where stated.
- **Risk:**
  - Phase A's hook migrations change shared advancement math for six cards.
    The identity run and existing fixtures check this.
  - Phase B changes destinations, holding, the advance gate and I2's ICE
    target together. The gate's guards cover theft, insolvency, stranded
    ICE and layout tells.
  - The M2 table was accepted only for comparisons. Install-versus-hold
    compares absolute hazards across server kinds (agenda remote against HQ
    times a/n), so calibration error between kinds biases the choice. The
    gate measures the net effect, and I9 owns recalibration.
- **Docs:**
  - `ai.md`: new `AIScoringSupport`, the extended `AIFastAdvanceCounters` and
    `AIAdvanceCreditGain`.
  - `corp-ai/architecture.md`: install planning, plan execution and the I2
    stake.
  - `ai-batch-harness.md`: the `agendaCommitment` collector.
  - P1 rows ticked, roadmap status, and the fixture's bug ticket.

Dependency state at 65251a5 (re-grounded 2026-10-23; previously 60fa0d7):
F4, I0, I1 and I2 are done; I2's `iceMarginalSecurity` defaults to `true`.
**I4 now runs before I3** (owner decision 2026-10-23) and does not depend on
it. I4 reads I2's `_breachMargin()` (M1), `_hazardForMargin()`/`_breachKind()`
(M2's table), `CORP_AI_I2_HORIZON_RUNNER_TURNS` (`H` = 2) and
`CORP_AI_POINT_VALUE` (4.4). I2's M2 reliability and next-turn checks failed;
the owner accepted the table for comparisons and kept `H` = 2, and production
holds the next-turn hazard over `H` with no projected-income drift.
`_breachHazard(server, t)` exists but adds `(t − 1) ×`
`_projectedRunnerIncome()` drift for `t > 1`, which is the unvalidated
projection; I4 uses `_breachHazard(s, 1)` (equivalently I2's
`_marginalHazard()`) for every turn of `H`. The table is not
lockout-safe: a lockout bucket still has a small non-zero hazard, so only
band 2's explicit rule makes a steal impossible.

I4 also takes over the one piece of I3 every agenda plan needs: under
`agendaCommitmentPlan`, I2's empty-remote ICE stake follows I4's chosen
destination (see "I2 ICE stake" below).

## Goal

For each agenda in HQ, choose between installing it now in each possible
destination and holding it, by **expected agenda points over `H` Runner
turns: points the Corp expects to score minus points it expects the Runner
to steal**. Once an agenda is committed, execute its completion plan so it
is scored in the fewest Runner turns, and keep reusing a remote the Runner
cannot profitably breach. Scoring tools in HQ and on the board (operations,
upgrades, identities) enter the plan through card hooks. A game-winning score
and a game-losing steal stay hard tactical rules.

**Why this design.** Turning a security measurement into a yes/no admission
gate has twice made the Corp weaker:
[`fa1182c`](../../corp-ai-regression/findings.md#causal-test-on-the-harness-tip)
("never score into an insecure remote"; removing only that gate recovered
+7.6 pp win rate and +0.79 points scored per game) and the
[L9.0.1 gate failure](../done/L9.0.1-adopt-honest-lockout.md#resolution)
(−2.9 pp win rate, −0.28 points scored, +0.18 stolen). The owner's 2026-10-14
playtests (one tester, not a measurement) found the Corp easy to beat: it
holds agendas too long, plays some into weak remotes and then leaves them
unadvanced, and does not exploit a remote it has locked. The owner asked for
better-calculated risks: find the best remote rather than never installing,
score fast once installed, keep scoring through a secure remote, count
lockout cards such as Manegarm Skunkworks and Anoetic Void, and count
scoring tools such as Seamless Launch and SanSan City Grid the way a human
does, through AI hooks rather than titles. The
[scoring-risk model](../../corp-ai/specs/install-decisions-design.md#scoring-risk-model-2026-10-16)
is the shared plan; I4 owns M3 `exposureTurns`, M5 `hqStealHazard` and the
agenda-commitment consumer, and is the I-layer item expected to move win rate.

## Current behaviour

Verified at 65251a5 (previously 60fa0d7). No commit since 60fa0d7 touched
admission, `_scoringWindow()`, `_sufficientEconomy()`, the advance block or
`AIScoringPlanCommitted`; I2's ICE ranking is now on by default, which
changes the game states the measured shares below came from.

**Destination.** `_rankedInstallOptionsCore()` offers each `_isHVT()` card
(agenda, Ambush, Hostile; not an obsolete bluff) only to
`_scoringServers(_emptyProtectedRemotes())`. `_emptyProtectedRemotes()` lists
remotes with at least one ICE and no agenda or asset in root (obsolete
bluffs excepted, unless kept for Trick of Light), strongest
`_protectionScore()` first. A new remote and an unprotected remote are never
agenda destinations. `_isAScoringServer()` calls `_evaluateServerSecurity()`
and rejects an insecure remote only when `secureScoringServerGate` is on
(default `false`). It then accepts a remote whose root holds an
`AIIsScoringUpgrade` card, an agenda or an Ambush; otherwise it requires
`protScore ≥` HQ's `_protectionScore()` (Archives' when
`_agendasInHand() > MaxHandSize(corp) − 1`), no other empty protected remote
holding a scoring upgrade, and being the strongest empty protected remote. In
practice one destination is offered. HQ's score grows with hand size, so a
large hand can reject every remote, including one the evaluator calls secure
(pending bug [corp-agenda-held-while-secure-remote-available](../../bugs/corp-agenda-held-while-secure-remote-available.md)).

Candidates are sorted by `|_advancementLimit() − _scoringWindow()|` plus
`0.75 × _deceptionInstallDistance()`. `_scoringWindow()` is an unitless sum
(protection difference to HQ, `0.3 × _clicksLeft()`, a credit ratio, −1).
Before every other group, "could be installed and fast-advanced to win" is
emitted when `_potentialAdvancement(null, Infinity, true)` covers the
agenda's `_advancementLimit()` in the strongest empty remote (band 3 in the
design note). Agendas with `AICannotScoreOnInstallTurn` (Downfall, merged
into the I4 branch at 3592967) are skipped there; M3 must likewise give such
an agenda no `E = 0` plan.

**Commitment.** `_returnPreference()` sets `AIScoringPlanCommitted = true` on
every agenda chosen for install, plan or not. The flag is read only by
`_installedAgendaCanBeCompleted()`, which tests whether
`_potentialAdvancement(card, limit, false)` (20 assumed clicks, current
credits) covers the remaining advancements. That helper admits the advance
block only when `committedAgendaReserveBypass` is on (default `false`).

**Advancing (`Phase_Main`).** After rez, priority triggers, kill combos,
`_criticalBreachDefenseAction()`, opportunity plays, tag punishment, trashing
and `_ordinaryPurgeOutcome()`, the advance block runs only if one of these
holds: an installed agenda (`almostDoneAgenda`) or Hostile asset can be
finished this turn; `_sufficientEconomy()`; or the bypass. Inside it, an
agenda with no counters starts only if its remote's `_protectionScore()` is
above `0.5 × Credits(runner)` or strictly above HQ's (skipped when it is
`almostDoneAgenda`), and `_potentialAdvancement(card, Infinity, false) ≥` its
limit as adjusted by `_deceptionAdvancementTarget()`.
`_sufficientEconomy()` is a global reserve: credits must cover the three
largest rez costs among installed unrezzed assets and upgrades and ICE
protecting a non-empty server, plus every `AIReserveCredits`; the total is
capped at 12 only when the Corp has more credits than the Runner.

**Scoring support today.** `_potentialAdvancement()` searches
`_potentialAdvancementDirections()`. Hook-driven: `AIFastAdvanceCounters`
(operations in HQ; installed one-shot upgrades: Flood the Market, Hype
Machine) and `AIAdvanceCreditGain` (Sacrifice Zone Expansion). Title cases:
Weyland Consortium: Built to Last and Oaktown Renovation (advance income),
Seamless Launch, Psychographics, Trick of Light, Biotic Labor (none of
these four declares `AIFastAdvanceCounters`). `_advancementLimit()` reads `AIAdvancementLimit` and has a SanSan City Grid
title case (−1 when rezzed, or unrezzed and affordable together with the
remaining advancements). `AIFastAdvance` (boolean; Seamless Launch,
Nanomanagement, Biotic Labor, Trick of Light, Psychographics, Flood the
Market) is read only by
operation-play ordering, not by the advancement search. `AIIsScoringUpgrade`
(boolean; AMAZE Amusements, Malapert Data Vault, SanSan City Grid, Perfect
Recall, Hype Machine) is a placement tag read by `_isAScoringServer()`,
`_shouldUpgradeServerWithCard()` and score-time rez/install; it does not say
what the upgrade does to scoring, and those five do different things.
Manegarm Skunkworks and Anoetic Void declare `AIDefensiveValue` and
`AIWouldTrigger`; neither exposes an approach cost (`AIApproachDefense`, I2's
M4). The identity hook `AIOperationPlayClickGain` (Nebula Talent Management,
`sets/elevation.js`) is now read by `_potentialAdvancementDirections()`.

**Safety.** No point-sensitive install veto exists. `_breachConsequence()`
(L7.1, done) publishes points exposed and win probability per server,
including HQ via `_centralAccessCount()` and `_centralWinProbability()`.
`_runnerMayWinIfServerBreached()` guards the agenda bluff
(`_shouldBluffAgendaServer()` never bluffs when the Corp would win or a
breach would lose) and ICE rez. The [PR 19 follow-up](../../corp-ai-regression/implementation.md#pr-19-review-proposed-winning-steal-install-guard)
assigns the winning-steal install risk to I4, measured against the corrected
default rather than the old blanket floor.

**Baseline numbers** (corrected install-series baseline, 1f64f5d, 1,400
games; its `installOutcomes` predates the PR #34 tracker fixes, so treat as
indicative): win rate 0.37; per game 3.14 agendas installed, 1.98 scored,
0.99 stolen; points stolen 5.87 (remote 2.16, R&D 1.92, HQ 1.74); mean 1.13
turns install-to-score and 1.44 exposed Runner turns. These predate I2's
adoption; phase A's fresh baseline replaces them.

### Why installed agendas sit unadvanced

Measured at 60fa0d7 with default options: a scratch probe wrapped
`Phase_Main` in 280 headless games (7 pool pairs × seeds 1–40; Corp won 93)
and classified each of 3,546 Corp actions taken while an installed agenda
was unfinished. The probe's helper calls may perturb caches, so the games
are not the batch's games; the proportions are the evidence. The probe was
not committed and predates I2's adoption, so the shares are indicative;
the `agendaCommitment` back-fill on the fresh baseline re-measures them.

| Outcome of the action | Share |
|---|---|
| Agenda advanced, or finished with a played tool | 60.4% |
| **Advance block skipped: `_sufficientEconomy()` false** | **29.7%** |
| Not started: remote not above HQ's score or `0.5 × Credits(runner)` | 6.2% |
| Not started: current credits below the advancement limit | 2.7% |
| Advance block open but an earlier step acted (purge, draw, install…) | 1.0% |

In the reserve-blocked actions the Corp mostly clicked for credits (52%),
installed (18%) or drew (15%). In 61% of them it already held enough credits
for every remaining advancement, and in 97% the agenda needed more clicks
than were left this turn. The mechanism behind "score fast" is therefore
the global rez reserve, not ordering: `almostDoneAgenda` bypasses the
reserve only for an agenda finishable this turn, so a multi-turn agenda (4
or 5 advancements, or 3 with clicks already spent) is never partly advanced
while unrelated rez costs elsewhere exceed the Corp's credits, and its
exposure grows turn after turn. The start rule is a smaller second cause
and is inconsistent with admission (admission accepts `≥` HQ, starting
needs `>`).

## Design

All values are expected agenda points over `H` (I2's
`CORP_AI_I2_HORIZON_RUNNER_TURNS` = 2). No other coefficient is introduced. Everything below is behind the
Corp option `agendaCommitmentPlan` (default `false`); with it off, play is
identical (phase A identity run).

### Measurements

**M3 `_agendaCompletionPlan(agenda, destination, startTurn)`** returns
`{exposureTurns, steps, defenceReserve, tools}` or `exposureTurns: Infinity`.
`exposureTurns` is the smallest `E ∈ {0..H}` such that an executable plan
installs the agenda (one click, at `startTurn`: 0 = this turn, 1 = next
turn) and scores it after `E` Runner turns have begun. Per Corp turn `k`:

- clicks: this turn `_clicksLeft()` minus the install click; later turns
  the Corp's allotted clicks;
- credits: carried from the previous step, plus credits gained by spending
  a click on the basic credit action (an explicit search direction for
  turns after the first); no speculative draws or future income other than
  hook-declared advance income;
- `defenceReserve`: the rez cost of the unrezzed ICE in the destination's
  chosen rez plan in `_evaluateServerSecurity()` (L1.1); M2 assumed those
  rezzes, so the plan may not spend those credits before the Runner turns
  they defend. The evaluator must expose this sum (new observation-only
  field, `rezPlanCost`);
- advancement per turn from `_potentialAdvancement(agenda, limit,
  thisTurn = (k == 0), HQ cards and installed upgrades, clicks, output,
  counters so far)` under `_withHypothetical()` with the step's credits;
- the limit from `_advancementLimit(agenda, destination)`, including
  `AIScoringSupport` effects of upgrades in the destination (below).

A plan that also must spend `defenceReserve` to finish faster is a second
candidate plan; the destination EV evaluates both with their own hazards.

**M5 `_hqStealHazard(agenda, t)`**, per Runner turn `t`:
`_breachHazard(corp.HQ, 1) × min(1, a / n)` (next-turn hazard held for every `t`), where `a` is
`_centralAccessCount(corp.HQ)` and `n` is HQ's size after this turn's
planned plays (the Corp knows its hand). The per-agenda rate is `a / n`,
not the agenda fraction of HQ (that is the probability of hitting *some*
agenda). Holding over turns: `1 − Π(1 − m5_t)` (HQ is repeatable).

**Discard loss.** If the Corp must discard at end of turn and HQ holds more
agendas than it can keep, the excess agenda is lost to Archives:
`points × (1 − Π_t(1 − _breachHazard(corp.archives, 1)))` stolen, and no
score within `H`.

### Decision: install where, or hold

For each agenda in HQ (highest points first; a later agenda sees earlier
choices as hypothetically made):

- **Destinations:** every remote whose root holds no agenda or asset (current
  obsolete-bluff rule kept), with or without ICE, plus a new remote. I3's
  `_scoringRemote()` (if later adopted) would be one of these, not a filter. Hazard
  `h_s,t = _breachHazard(s after this turn's planned defence, 1)`, held for every `t`, over the
  plan's exposed turns (the server holds one agenda, so a successful run
  accesses it).
- `EV(install in s) = points × P(score) − points × P(stolen)`, with
  `P(stolen) = 1 − Π_{t ≤ min(E,H)}(1 − h_s,t)` and
  `P(score) = 1 − P(stolen)` when `E ≤ H`, else 0. `E = 0` gives `points`.
- `EV(hold) = −points × m5_1 − discardLoss + (1 − m5_1) × D`, where `D` is
  `max(0, max_s EV(install in s at startTurn 1))` over horizon `H − 1`, after
  this turn's planned improvement (I2's best ICE for that remote), with the
  same held next-turn hazard (no `_projectedRunnerIncome()` drift: that
  projection failed I2's check). The shorter horizon and the HQ hold hazard
  are the cost of delay.
- **Indefinite-hold guard.** `D` counts only if (a) the improvement it assumes
  is an action the Corp schedules this turn and is recorded with the hold,
  and (b) the agenda was not held with deferred credit on each of the
  previous two Corp turns. Otherwise `D = 0`, so holding is pure hazard and
  any destination with higher EV wins. If the scheduled improvement did not
  happen, the next turn's hold has `D = 0`.
- Choose the highest EV. A remote the evaluator calls insecure can win, and
  so can holding. Owner amendment (2026-10-23): if the best install's EV is
  within 0.1 points of hold's, install. Destinations whose EVs differ by less than 0.1 points may
  be reordered by `_deceptionInstallDistance()`; deception never decides
  install versus hold (it remains L8's bounded input, not part of this EV).
- Under the option, this replaces `_isAScoringServer()`'s admission,
  including the flood relaxation, and `_scoringWindow()` sorting for
  agendas only. Ambush and Hostile placement stays with I5. The install
  candidate keeps its I1 band and legacy relative order; I7.2 compares it
  across classes.

**Agenda flood** needs no special rule: hold carries `discardLoss`, so an
excess agenda goes to the best remote, even an unprotected one, when that
loses fewer expected points than Archives.

**Repeat scoring** needs no special rule: after a score the remote is empty
again, its hazard is still low, so the next agenda chooses it. Scenario 7
proves this.

### I2 ICE stake

Added at re-grounding (2026-10-23), replacing what I3 was to supply. With
`agendaCommitmentPlan` on, I2's empty-remote ICE stake follows this
decision instead of the legacy designated remote:

- `memo.designated` in `_marginalIceInstallOptions()` (today
  `_scoringServers(_emptyProtectedRemotes())[0]`) becomes the chosen
  destination of the highest-EV committed or planned agenda: an existing
  remote (with or without ICE), `null` for a new remote, or no remote when
  every agenda's best choice is to hold.
- `_iceStake()` uses that agenda's points instead of
  `_highestAgendaPointsInHQ()`.
- Fix 3's `exposureTurns` (`horizon − 1` when the install is pending and
  fewer than two clicks remain) is replaced by M3's `startTurn` and
  `exposureTurns` for that plan.
- The choice is recomputed every Corp decision from the board; nothing is
  persisted on the server. Reuse of a safe remote follows from its low
  hazard. A persistent role and the asset opportunity cost stay with I3,
  which now follows I4.
- `_rankedServersToProtect()` may not list an unprotected chosen remote;
  pass it explicitly when ranking ICE for it.

With the option off, I2's stake rule is unchanged.

### Hard constraints (lexicographic, before EV)

- **Band 3, game-winning:** unchanged. The "could be installed and
  fast-advanced to win" candidate and an `almostDoneAgenda` that wins are
  not EV-scored; an `E = 0` plan never needs a breach check.
- **Band 2, game-losing steal.** Applies when
  `AgendaPoints(runner) + points ≥ AgendaPointsToWin()`. For each option let
  `W` be the probability the Runner wins by taking this agenda within `H`:
  `P(stolen)` for a destination (0 when `E = 0`, or when M1 is an honest
  lockout, `−Infinity`, on every exposed turn). For hold, let `d_t` be
  the discard-loss probability conditional on surviving HQ theft and all prior
  turns: `W(hold) = 1 − Π_t((1 − m5_t) × (1 − d_t))`, where `m5_t`
  is also conditional on prior survival. For one turn this is
  `m5_1 + (1 − m5_1) × d_1`, bounded by one. Refusing to install can also lose, so
  this is not a one-sided veto: keep the options with the smallest `W`
  (within 0.01), then rank those by EV. When other agendas in HQ already let
  the Runner win from an HQ breach, `W(hold)` uses
  `_breachConsequence(corp.HQ).winProbability` per breach instead of `a / n`.
  This decides the [PR 19 follow-up](../../corp-ai-regression/implementation.md#pr-19-review-proposed-winning-steal-install-guard):
  a game-losing install is rejected exactly when a lower-loss option exists.
- Existing guards stay authoritative: `_shouldBluffAgendaServer()`,
  `_criticalBreachDefenseAction()`, `_icePreventsGameWinningBreach()` rez
  logic.

### Plan execution ("score fast")

Owned by I4, not I7.2. M3 and `P(score)` assume the plan is executed; the
measurement above shows the legacy global reserve blocks it in 30% of
actions. Leaving execution to I7.2 (which depends on I4, I5 and I6) would
make I4's gate measure installs that then sit, so I4's EV would be fiction.
I4 owns only the execution of its own plan; I7.2 later replaces this rule
when it compares advancing with every other action class on one scale.

- On install, store the plan on the card as `AIScoringPlan` (`steps`,
  `exposureTurns`, `defenceReserve`, `createdTurn`) and set
  `AIScoringPlanCommitted` only when a plan with `E ≤ H` exists, so
  `_installedAgendaCanBeCompleted()` keeps its meaning.
- In `Phase_Main`'s advance block, an agenda with an `AIScoringPlan` is
  admitted when this turn's step calls for advancing and the Corp's credits
  after the step stay at or above `defenceReserve` plus any band-2 reserve.
  This replaces `_sufficientEconomy()` and the start rule for that agenda
  only; the reserve for other servers no longer blocks it. Recompute the
  plan at the start of each Corp turn; if it no longer has `E ≤ H`, drop the
  record and fall back to legacy behaviour.
- "Unless defending improves EV more": before an advance step, compare the
  EV gain of advancing (fewer exposed turns) with the EV gain of the best
  defence action for the same server (I2's best ICE or a rez for it, via
  the drop in `h_s,t`). Both are this agenda's points; take the larger.
  Comparisons with other servers' defence or economy belong to I7.2.
- `committedAgendaReserveBypass` stays off in both arms and is not reused.

### Scoring-support hooks

The plan reads only hooks; I4 adds no title case (design note: "Do not copy
title cases into the new scoring").

| Hook | Status | I4 use |
|---|---|---|
| `AIFastAdvanceCounters(card)` | exists (Flood the Market, Hype Machine) | Counters from operations in HQ and one-shot upgrades. Extend: may return `{counters, credits, clicks}` (net change including play cost) and receive `{thisTurn}` as a second argument |
| `AIAdvanceCreditGain(thisTurn, advancedInPlan)` | exists (Sacrifice Zone Expansion) | Advance income. Also read from `corp.identityCard` |
| `AIAdvancementLimit()` | exists | Agenda's own target |
| `AIOperationPlayClickGain` | exists (identity: Nebula Talent Management) | Already read by `_potentialAdvancement()`; M3 counts it as clicks in later-turn plans |
| **`AIScoringSupport(agenda, server)`** | **new** | Read-only, on an installed or HQ upgrade: `{requirementDelta, requiresRez}` for scoring `agenda` in `server` while active there (SanSan City Grid: `{requirementDelta: -1, requiresRez: true}`); the plan pays `RezCost()` when unrezzed. Returns null when it does not apply |
| `AIIsScoringUpgrade` | boolean, unchanged | Not read by I4. It conflates requirement reduction (SanSan), one-shot counters (Hype Machine), score riders (Malapert, via `AIWouldRezBeforeScore`), steal deterrence (AMAZE) and Perfect Recall. I6 retires it once each card's effect is covered by `AIScoringSupport`, `AIFastAdvanceCounters`, score-time hooks or I2's M4 |
| `AIFastAdvance` | boolean, unchanged | Not read by I4 |

Title cases to migrate ([P1](../corp_ai_finding_13_legacy_title_lists.md)
rows `_advancementLimit` and `_potentialAdvancementDirections` are tagged I4
(owner decision 2026-10-16); the rest of P1 stays later work):

- `_advancementLimit`: SanSan City Grid → `AIScoringSupport` (P1 row
  "`_advancementLimit`", which already requires keeping the unrezzed plan).
- `_potentialAdvancementDirections`: Built to Last (identity) and Oaktown
  Renovation → `AIAdvanceCreditGain`; Seamless Launch (2 counters, not on a
  card installed this turn), Psychographics (X = min(credits, tags), costs
  X), Biotic Labor (net +1 click for 4 credits) → extended
  `AIFastAdvanceCounters`. Trick of Light moves counters from another card
  and is also I1's band; keep its title case unless P1/I1 have migrated it.
  P1's row says "Extend `AIFastAdvance`", but the graded hook that already
  exists is `AIFastAdvanceCounters`.
- If P1 has not migrated these when I4 starts, I4 phase A does it, with a
  log-hash identity run. The `Phase_Main` expensive fast-advance combo list
  (P1 row "`Phase_Main`") stays with P1.

Lockout cards (Manegarm Skunkworks, Anoetic Void) reach I4 only through
I2's M4 in `_breachMargin()`; I4 adds nothing for them.

### Phases

1. **Phase A (observation-only).** Hook migrations above; `rezPlanCost`;
   `_agendaCompletionPlan()`, `_hqStealHazard()` and
   `_agendaCommitmentOptions()` (every destination and hold with EV, `W`,
   plan and rejection reasons) logged on each agenda decision with the
   option off. Identity run: option on with the consumer disabled gives the
   same `logHash` for 7 pairs × 20 seeds. Build the `agendaCommitment`
   collector and back-fill it into a fresh baseline.
2. **Phase B (consumer).** Destination/hold choice, hard constraints and
   plan execution behind `agendaCommitmentPlan`, then the gate.

Functions to touch: `_rankedInstallOptionsCore()` (agenda branch),
`_isAScoringServer()` (bypassed for agendas under the option, unchanged
otherwise), `_returnPreference()`, `_installedAgendaCanBeCompleted()`,
`Phase_Main` advance block, `_advancementLimit()`,
`_potentialAdvancementDirections()`, `_evaluateServerSecurity()`
(`rezPlanCost`), the affected cards in the playable sets, and
`documentation/ai.md`.

## Safety and information boundary

Game-winning scores and game-losing steals are lexicographic constraints,
not EV terms. Runner projections use only public cards and counters
(through I2's M1/M2). M5 uses the Corp's own hand, which it knows. Bluff
posture never enters the EV. M2 is calibrated on the stock Runner AI.

## Test scenarios

Each asserts the logged options (EV, `W`, plan) and reason as well as the
choice. Kept green: `corp-agenda-into-secure-remote-still-ok.txt`,
`corp-installs-agenda-in-protected-remote.txt`, `advance-agenda-one-short.txt`;
with `secureScoringServerGate=true`, `corp-no-agenda-into-insecure-remote.txt`
and the two no-ETR fixtures (the legacy gate is untouched).

1. **Held agenda with a good remote.** The pending reproduction
   `corp-agenda-held-while-secure-remote-available.txt` installs under the
   option (its expectation unchanged), because `EV(install) > EV(hold)` even
   though HQ's protection score is higher.
2. **Weak remote beats holding.** Breachable remote (M2 0.3) and HQ with a
   high M5 and a forced discard: install wins; with a quiet HQ (M5 near 0)
   and the same remote, hold wins with a recorded improvement.
3. **Score fast.** A 5-advancement agenda installed under a plan, Corp at
   6 credits with an unrelated unrezzed 5-cost ICE elsewhere: the Corp
   advances (legacy: clicks for credits). With credits only for its own
   remote's `defenceReserve`, it does not spend them.
4. **Scoring tools.** Seamless Launch in HQ shortens `exposureTurns` by
   one; SanSan City Grid (unrezzed, affordable) in a remote lowers its limit
   by one and makes it the best destination; the same via a test card
   declaring only the hooks (no title).
5. **Game-losing steal.** Runner at 5 points, 2-point agenda: a
   breachable remote is rejected when HQ's `W` is lower; when HQ is wide open
   and a remote has the lower `W`, the agenda is installed there. A
   hard-locked remote or an `E = 0` line is always allowed.
6. **Indefinite hold.** A board where `D` is always slightly higher: the
   agenda is held at most twice with deferred credit, then installed or
   held only on hazard terms; a hold whose scheduled ICE was not installed
   gets `D = 0` next turn.
7. **Repeat scoring.** After scoring from a locked remote with another
   agenda in HQ, the next agenda goes to the same remote on the next
   decision.
8. **Agenda flood.** More agendas than hand space and no protected remote:
   the excess goes to a new or weak remote when `discardLoss` is larger,
   never when its `W` is higher than holding/discarding.
9. **Band 3 preserved.** A winning install-and-fast-advance line is still
   chosen first with the option on.
10. **Identity.** Option off: decisions and `logHash` unchanged on the pool
    (phase A identity run).

## Acceptance gate
F4 gate. Option `agendaCommitmentPlan` (Corp AI), off in the baseline and on
in the candidate. Committed deck pool, paired seeds 7001–8000 (1,000 games
per deck pair; unused by any earlier gate, 6001–7000 being reserved for I3),
bootstrap 95% intervals. Both arms use current defaults: the five 2026-10-05
recovery options off, I2's `iceMarginalSecurity` on (stated explicitly in the
command) and I2.3's `openingHqThenRdIce` off. I3 is not a prerequisite
(re-grounded 2026-10-23). Fresh matched control on the I4 branch after `main`
(Downfall, I2.3) is merged in.
Collectors: `installOutcomes`, `stallTurns`, `corpInsolventTurns` (I0;
definitions in `documentation/ai-batch-harness.md`); `strandedUnrezzedIceCost`,
`bluffSingleVariableCorrelation`, `realizedIceByRootType` (I2's guard set,
because I4 changes which empty remote I2's ICE stake protects); `agendaCommitment`
(new, built by this item from public and Corp-known turn-end state, the same
definition in both arms): `agendaCommitment.idleAgendaTurns`, Corp turns
ending with an installed unscored agenda that gained no advancement counter
that turn (lower); `agendaCommitment.hqHoldTurns`, Corp turns ending with an
agenda in HQ while a remote with an empty root existed (lower).
Starts: none. Every pool game reaches agenda decisions; Seamless Launch is in
6 of 7 Corp decks, Manegarm Skunkworks in 3, Anoetic Void in 2, SanSan City
Grid and Biotic Labor in NEH, Oaktown Renovation in BTL, Trick of Light in PE.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `winRate` | higher | interval of the improvement above 0 |
| Improve | `pointsScored` | higher | interval of the improvement above 0 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsStolenByServer.remote` | lower | regression at most 0.5 |
| Guard | `gameLength` | lower | regression at most 1.5 turns |
| Guard | `corpInsolventTurns` | lower | regression at most 0.5 turns |
| Guard | `stallTurns` | lower | regression at most 0.5 turns |
| Guard | `installOutcomes.installToScoreTurns` | lower | regression at most 0.5 turns |
| Guard | `installOutcomes.agendaExposureTurns` | lower | regression at most 0.5 turns |
| Guard | `agendaCommitment.idleAgendaTurns` | lower | regression at most 0.5 turns |
| Guard | `agendaCommitment.hqHoldTurns` | lower | regression at most 0.5 turns |
| Guard | `strandedUnrezzedIceCost.credits` | lower | regression at most 1 |
| Guard | `bluffSingleVariableCorrelation.max` | lower | regression at most 0.02 |
| Guard | `realizedIceByRootType.allCountCorrelation` | lower | regression at most 0.05 |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | regression at most 0.05 |

Gate command: `node scripts/ai-batch.js gate --pool tests/fixtures/ai-batch/deck-pool.json --corp-option agendaCommitmentPlan=true --corp-option iceMarginalSecurity=true --seeds 7001-8000 --collector installOutcomes --collector stallTurns --collector corpInsolventTurns --collector agendaCommitment --collector strandedUnrezzedIceCost --collector bluffSingleVariableCorrelation --collector realizedIceByRootType --improve winRate --improve pointsScored --guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.5 --guard gameLength=1.5 --better gameLength=lower --guard corpInsolventTurns=0.5 --guard stallTurns=0.5 --guard installOutcomes.installToScoreTurns=0.5 --guard installOutcomes.agendaExposureTurns=0.5 --guard agendaCommitment.idleAgendaTurns=0.5 --guard agendaCommitment.hqHoldTurns=0.5 --guard strandedUnrezzedIceCost.credits=1 --guard bluffSingleVariableCorrelation.max=0.02 --guard realizedIceByRootType.allCountCorrelation=0.05 --guard realizedIceByRootType.posturedCountCorrelation=0.05`

`winRate` and `pointsScored` are Improve rows rather than the standard
guards, because this item exists to move them; dropping either needs a spec
update before the run. Remote theft has a wider tolerance than the standard
0.2 because the design deliberately moves agendas from HQ into remotes; total
`pointsStolen` keeps the standard tolerance. The older 0.03/0.25 exception and
the remote-theft Improve row are retired with the old design. M2 describes the
stock Runner AI (aggressive, runs constantly); a human may breach more or
less often, so a passing gate is necessary but not sufficient: the owner
playtests before `agendaCommitmentPlan` defaults to on.

**Re-grounding changes (2026-10-23).** Added seeds, pool and the explicit I2
option; dropped the I3 arm. Added I2's stranded-ICE and tell guards at I2's
thresholds because I4 now redirects I2's empty-remote stake; no existing
threshold was loosened. `agendaCommitment` declares lower-is-better directions
for both metrics.

## Things to consider

- `H` is short (2). A 5-advancement agenda with few credits has `E > H` and
  scores 0 within the horizon even if it would score in three turns. If
  phase A logs show this often, raise it with I2 before changing `H`.
- M2 counts successful runs, not steals; a single-agenda remote access is a
  steal, but Ambush-heavy or access-replacing runs are not.
- Once agendas move, the Runner AI's targeting may shift; recalibrate M2
  (I9) after adoption.
- The in-hand winning line pre-empted by the critical-central interrupt
  (design note edge case 3) is I7.2's `Phase_Main` ordering problem.
- Installing an agenda shrinks HQ and slightly raises the other agendas'
  `a / n`; the sequential per-agenda evaluation accounts for it.

## Acceptance criteria
- [x] Every test scenario that remains in I4 (3 score fast, 9 band 3, 10 identity) is covered by a deterministic test that asserts the logged reason as well as the choice; scenarios 1, 2 and 4–8 moved to I4.1 with the destination/hold consumer.
- [ ] ~~The pending reproduction passes under the option~~ — moved to I4.1 (install/hold case; see Resolution).
- [x] Phase A identity run (7 pairs × 20 seeds, option on with consumer disabled) matches every `logHash`; the hook migrations are behaviour-preserving.
- [x] The behaviour change ships behind an AI option that defaults to off (`agendaCommitmentPlan`, named in the Resolution).
- [x] The gate is ready to run: every collector it names exists and is tested, and a `--quick` run of the gate command completes and reports at least one game changed by the option.
- [ ] ~~With the option on, I2's empty-remote stake follows I4's chosen destination~~ — moved to I4.1 with the destination consumer.
- [x] The `agendaCommitment` collector declares lower-is-better directions for both metrics and is verified against scripted boards (idle, advanced, scored, held with and without an empty remote) and back-filled into a fresh baseline without changing decisions.
- [ ] I0's `installOutcomes`, `stallTurns` and `corpInsolventTurns` are back-filled into the same fresh baseline with the corrected PR #34 tracker.
- [ ] Gate evidence is recorded in the Resolution: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% confidence interval, guarded-regression result, pass conditions and thresholds; each improvement interval's lower bound is above zero.
- [ ] An owner playtest against the option is recorded before the default changes.
- [x] New or changed card-facing hooks (`AIScoringSupport`, extended `AIFastAdvanceCounters` and `AIAdvanceCreditGain`) are documented in `documentation/ai.md`, and migrated titles are removed from `LEGACY_TITLES` and ticked in P1.
- [x] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour ([Agenda scoring plans (I4)](../../corp-ai/architecture.md#agenda-scoring-plans-i4)).
- [ ] `node tests/run-all-tests.js` passes.
