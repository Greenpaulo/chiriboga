# I4 Agenda installation and scoring commitment

**Roadmap item:** I4 · **Depends on:** I3, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md` (principle 6), [install-decisions-design.md: Scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16), [I2](I2-ice-selection-by-marginal-security.md) phase A, [I3](I3-remote-role-and-root-suitability.md)
**Verified against code:** 60fa0d7 (2026-10-16)

Dependency state at 60fa0d7: F4, I0 and I1 are done; I2 and I3 are proposed.
I4 reads I2 phase A's `_breachMargin()` (M1), `_breachHazard()` (M2, after
its reliability check), `_projectedRunnerIncome()`,
`CORP_AI_RISK_HORIZON_RUNNER_TURNS` (`H`) and `CORP_AI_POINT_VALUE`, and
I3's `_scoringRemote()`. None exists yet.

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
[L9.0.1 gate failure](../../backlog/done/L9.0.1-adopt-honest-lockout.md#resolution)
(−2.9 pp win rate, −0.28 points scored, +0.18 stolen). The owner's 2026-10-14
playtests (one tester, not a measurement) found the Corp easy to beat: it
holds agendas too long, plays some into weak remotes and then leaves them
unadvanced, and does not exploit a remote it has locked. The owner asked for
better-calculated risks: find the best remote rather than never installing,
score fast once installed, keep scoring through a secure remote, count
lockout cards such as Manegarm Skunkworks and Anoetic Void, and count
scoring tools such as Seamless Launch and SanSan City Grid the way a human
does, through AI hooks rather than titles. The
[scoring-risk model](install-decisions-design.md#scoring-risk-model-2026-10-16)
is the shared plan; I4 owns M3 `exposureTurns`, M5 `hqStealHazard` and the
agenda-commitment consumer, and is the I-layer item expected to move win rate.

## Current behaviour

Verified at 60fa0d7.

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
design note).

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
above `0.5 × Credits(runner)` or strictly above HQ's, and
`_potentialAdvancement(card, Infinity, false) ≥` its limit.
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
Manegarm Skunkworks and Anoetic Void declare only `AIDefensiveValue`; their
approach costs are invisible to the evaluator until I2's M4.

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
turns install-to-score and 1.44 exposed Runner turns.

### Why installed agendas sit unadvanced

Measured at 60fa0d7 with default options: a scratch probe wrapped
`Phase_Main` in 280 headless games (7 pool pairs × seeds 1–40; Corp won 93)
and classified each of 3,546 Corp actions taken while an installed agenda
was unfinished. The probe's helper calls may perturb caches, so the games
are not the batch's games; the proportions are the evidence.

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
`CORP_AI_RISK_HORIZON_RUNNER_TURNS`: 2, or 1 if I2's next-turn check
failed). No other coefficient is introduced. Everything below is behind the
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
`_breachHazard(corp.HQ, t) × min(1, a / n)`, where `a` is
`_centralAccessCount(corp.HQ)` and `n` is HQ's size after this turn's
planned plays (the Corp knows its hand). The per-agenda rate is `a / n`,
not the agenda fraction of HQ (that is the probability of hitting *some*
agenda). Holding over turns: `1 − Π(1 − m5_t)` (HQ is repeatable).

**Discard loss.** If the Corp must discard at end of turn and HQ holds more
agendas than it can keep, the excess agenda is lost to Archives:
`points × (1 − Π_t(1 − _breachHazard(corp.archives, t)))` stolen, and no
score within `H`.

### Decision: install where, or hold

For each agenda in HQ (highest points first; a later agenda sees earlier
choices as hypothetically made):

- **Destinations:** every remote whose root holds no agenda or asset (current
  obsolete-bluff rule kept), with or without ICE, plus a new remote. I3's
  `_scoringRemote()` is one of these, not a filter. Hazard
  `h_s,t = _breachHazard(s after this turn's planned defence, t)` over the
  plan's exposed turns (the server holds one agenda, so a successful run
  accesses it).
- `EV(install in s) = points × P(score) − points × P(stolen)`, with
  `P(stolen) = 1 − Π_{t ≤ min(E,H)}(1 − h_s,t)` and
  `P(score) = 1 − P(stolen)` when `E ≤ H`, else 0. `E = 0` gives `points`.
- `EV(hold) = −points × m5_1 − discardLoss + (1 − m5_1) × D`, where `D` is
  `max(0, max_s EV(install in s at startTurn 1))` over horizon `H − 1`, after
  this turn's planned improvement (I3's projected investment or I2's best
  ICE for that remote) and one turn of `_projectedRunnerIncome()`. The
  shorter horizon is the cost of delay.
- **Indefinite-hold guard.** `D` counts only if (a) the improvement it assumes
  is an action the Corp schedules this turn and is recorded with the hold,
  and (b) the agenda was not held with deferred credit on each of the
  previous two Corp turns. Otherwise `D = 0`, so holding is pure hazard and
  any destination with higher EV wins. If the scheduled improvement did not
  happen, the next turn's hold has `D = 0`.
- Choose the highest EV. A remote the evaluator calls insecure can win, and
  so can holding. Destinations whose EVs differ by less than 0.1 points may
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

### Hard constraints (lexicographic, before EV)

- **Band 3, game-winning:** unchanged. The "could be installed and
  fast-advanced to win" candidate and an `almostDoneAgenda` that wins are
  not EV-scored; an `E = 0` plan never needs a breach check.
- **Band 2, game-losing steal.** Applies when
  `AgendaPoints(runner) + points ≥ AgendaPointsToWin()`. For each option let
  `W` be the probability the Runner wins by taking this agenda within `H`:
  `P(stolen)` for a destination (0 when `E = 0`, or when M1 is an honest
  lockout, `−Infinity`, on every exposed turn); for hold, `1 − Π(1 − m5_t)`
  plus `discardLoss`'s probability. Refusing to install can also lose, so
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
| **`AIScoringSupport(agenda, server)`** | **new** | Read-only, on an installed or HQ upgrade: `{requirementDelta, requiresRez}` for scoring `agenda` in `server` while active there (SanSan City Grid: `{requirementDelta: -1, requiresRez: true}`); the plan pays `RezCost()` when unrezzed. Returns null when it does not apply |
| `AIIsScoringUpgrade` | boolean, unchanged | Not read by I4. It conflates requirement reduction (SanSan), one-shot counters (Hype Machine), score riders (Malapert, via `AIWouldRezBeforeScore`), steal deterrence (AMAZE) and Perfect Recall. I6 retires it once each card's effect is covered by `AIScoringSupport`, `AIFastAdvanceCounters`, score-time hooks or I2's M4 |
| `AIFastAdvance` | boolean, unchanged | Not read by I4 |

Title cases to migrate ([P1](../../backlog/corp_ai_finding_13_legacy_title_lists.md)
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
in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals. Both arms keep the five 2026-10-05 recovery
options off and the I2/I3 options at their adopted values.
Collectors: `installOutcomes`, `stallTurns`, `corpInsolventTurns` (I0;
definitions in `documentation/ai-batch-harness.md`); `agendaCommitment`
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

Gate command: `node scripts/ai-batch.js gate --corp-option agendaCommitmentPlan=true
--collector installOutcomes --collector stallTurns --collector corpInsolventTurns
--collector agendaCommitment --improve winRate --improve pointsScored
--guard pointsStolen=0.2 --guard pointsStolenByServer.remote=0.5
--guard gameLength=1.5 --better gameLength=lower --guard corpInsolventTurns=0.5
--guard stallTurns=0.5 --guard installOutcomes.installToScoreTurns=0.5
--guard installOutcomes.agendaExposureTurns=0.5
--guard agendaCommitment.idleAgendaTurns=0.5 --guard agendaCommitment.hqHoldTurns=0.5`

`winRate` and `pointsScored` are Improve rows rather than the standard
guards, because this item exists to move them; dropping either needs a spec
update before the run. Remote theft has a wider tolerance than the standard
0.2 because the design deliberately moves agendas from HQ into remotes; total
`pointsStolen` keeps the standard tolerance. The older 0.03/0.25 exception and
the remote-theft Improve row are retired with the old design. M2 describes the
stock Runner AI (aggressive, runs constantly); a human may breach more or
less often, so a passing gate is necessary but not sufficient: the owner
playtests before `agendaCommitmentPlan` defaults to on.

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
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The pending reproduction `corp-agenda-held-while-secure-remote-available.txt` passes under the option with its expectation unchanged; its ticket records how I4 resolves it.
- [ ] Phase A identity run (7 pairs × 20 seeds, option on with consumer disabled) matches every `logHash`; the hook migrations are behaviour-preserving.
- [ ] The behaviour change ships behind an AI option that defaults to off (`agendaCommitmentPlan`, named in the Resolution).
- [ ] The gate is ready to run: every collector it names exists and is tested, and a `--quick` run of the gate command completes and reports at least one game changed by the option.
- [ ] The `agendaCommitment` collector is verified against scripted boards (idle, advanced, scored, held with and without an empty remote) and back-filled into a fresh baseline without changing decisions.
- [ ] I0's `installOutcomes`, `stallTurns` and `corpInsolventTurns` are back-filled into the same fresh baseline with the corrected PR #34 tracker.
- [ ] Gate evidence is recorded in the Resolution: exact command, committed deck pairs, paired seeds, seed count, every metric's baseline/candidate result and bootstrap 95% confidence interval, guarded-regression result, pass conditions and thresholds; each improvement interval's lower bound is above zero.
- [ ] An owner playtest against the option is recorded before the default changes.
- [ ] New or changed card-facing hooks (`AIScoringSupport`, extended `AIFastAdvanceCounters` and `AIAdvanceCreditGain`) are documented in `documentation/ai.md`, and migrated titles are removed from `LEGACY_TITLES` and ticked in P1.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
