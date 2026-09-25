# I4 Agenda installation and scoring commitment

**Roadmap item:** I4 · **Depends on:** I3, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Commit an agenda only when the destination stays safe for as long as the agenda
is exposed and the Corp has a plan to finish it, weighting the required margin
by what a steal would cost.

## Current behaviour
The security floor exists. `_isAScoringServer()` first calls
`_evaluateServerSecurity()` and rejects any remote that is not `isSecure`,
regardless of how weak HQ or Archives are (commit `fa1182c`; fixtures
`corp-no-agenda-into-insecure-remote.txt`, `corp-no-agenda-behind-no-etr-ice.txt`,
`corp-no-agenda-behind-conditional-etr-ice.txt` and the control
`corp-agenda-into-secure-remote-still-ok.txt`). A secure remote that already
holds an agenda, scoring upgrade or Ambush then qualifies outright; any other
secure remote must also pass the old relative test (protection score at least
HQ's, or Archives' under agenda flood), have no rival remote holding a scoring
upgrade, and be the strongest empty protected remote.

`_isHVT()` agendas, Ambush and Hostile cards are offered to those scoring
servers and sorted by the gap between advancement requirement and
`_scoringWindow()`, plus `_deceptionInstallDistance()`. A winning agenda that
can be installed and fast-advanced this turn is emitted first.

Completion pieces exist after install: `_returnPreference()` marks every
installed agenda `AIScoringPlanCommitted`, and `_installedAgendaCanBeCompleted()`
lets `Phase_Main` advance such an agenda past the global rez reserve when
`_potentialAdvancement()` covers the remaining advancements.

What is missing:

- **Time exposed.** `isSecure` is judged against the Runner's current
  effective credits (`_effectiveRunnerCreditPool()`), with no projection of
  what the Runner can gain over the turns the agenda will sit there. A soft
  credit lockout with a small margin passes.
- **Completion plan before commitment.** No test asks, before installing,
  whether the Corp can finish the agenda; `AIScoringPlanCommitted` is set on
  every agenda install, plan or not.
- **Consequence weighting.** The required margin is the same for a 1-point
  agenda and one whose steal gives the Runner match point.
- **Agenda flood.** Flood only relaxes the relative bar to Archives; the
  security floor still applies, so an agenda that will be discarded to
  Archives can never go to a stronger-than-Archives but insecure remote.

See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
- **Completion plan.** Before committing, run the same test
  `_installedAgendaCanBeCompleted()` runs, hypothetically, for the candidate
  agenda in the candidate server (`_advancementLimit()` and
  `_potentialAdvancement()`, including fast-advance tools in HQ), and derive
  `exposedRunnerTurns`: how many Runner turns pass before the score at the
  Corp's click and credit rate, after reserving what defence of the plan
  needs. Replace the boolean with a plan record on the card (turns, credits
  reserved); keep `AIScoringPlanCommitted` true only when a plan exists, so
  `_installedAgendaCanBeCompleted()` keeps working unchanged.
- **Time exposed.** A server is acceptable only if it stays secure against the
  Runner's projected public credits over `exposedRunnerTurns`: current
  effective credits plus a conservative public income bound per Runner turn
  (clicks available at one credit each, plus public recurring and drip
  sources). Zero exposed turns (fast advance) needs only current security.
- **Consequence weighting.** Use `scoringValue` (design note) and a required
  security margin that grows with steal consequence, from the evaluator's
  `breachConsequence` signal (the one I2 consumes). A steal that would win the
  game for the Runner is a hard constraint: reject unless secure over the whole
  exposure window.
- **Agenda flood.** When an agenda would otherwise be discarded to Archives,
  permit a remote that is harder to breach than Archives even if not secure,
  labelled `floodRisk` with its risk in the breakdown; never when the steal
  would lose the game, and never with an agenda bluff posture.
- The deception system (depth and advancement cadence) stays a bounded input
  (`deceptionValue`); I4 does not duplicate it.

## Safety and information boundary
Game-winning scores and game-losing steals are hard tactical constraints, not
score components. The projected Runner income uses only public cards and
counters. Existing agenda bluff guards (no bluff when the Corp would win or a
breach would lose, in `_shouldBluffAgendaServer()`) stay authoritative.

## Test scenarios
Already green and kept as regressions: an insecure remote is rejected even when
HQ is weaker (`corp-no-agenda-into-insecure-remote.txt`), and a
deterministically secure remote accepts an agenda
(`corp-agenda-into-secure-remote-still-ok.txt`).

1. **Time exposed.** A remote secure only by a soft credit lockout, with the
   Runner 3 credits short, is rejected for a 5-advancement agenda that will be
   exposed for one Runner turn, and accepted for an agenda the Corp can install
   and score this turn.
2. **Completion plan.** With a secure remote, 2 credits and no fast advance,
   the Corp installs the 3-advancement agenda it can finish rather than the
   5-advancement one it cannot, and the installed card's plan record names the
   turns and credits reserved.
3. **Consequence.** With the same small soft-lockout margin, a 1-point agenda
   is accepted while an agenda whose steal gives the Runner match point is
   held.
4. **Game-losing steal.** An agenda whose steal would win the game is rejected
   from a remote that is secure now but not over the projected exposure window.
5. **Fast advance.** A fast-advance line chooses the agenda it can complete
   rather than a higher-value agenda it must expose.
6. **Agenda flood.** With more agendas in HQ than the hand limit keeps, the
   excess agenda goes to a remote stronger than Archives (labelled
   `floodRisk`) only when scoring, operation play or a safe discard is worse,
   and never when its steal would lose the game.

## Acceptance gate
Improvement gate: candidate `this.options.agendaCommitmentPlan` on against
I0's baseline, with the standard guards (design note) and:

- Improvement: `pointsStolenByServer.remote` per game falls (candidate minus
  baseline upper bound below 0).
- Guards: `installToScoreTurns` mean upper bound at most +0.5 turns;
  `agendaExposureTurns` mean upper bound at most +0.5 turns; `stallTurns` upper
  bound at most +0.5 turns per game.

## Things to consider
- The "derelict remote" edge case (design note) affects whether an existing
  1-ICE remote is considered for agendas; I3 owns the role, I4 the plan.
- The in-hand winning line pre-empted by the critical-central interrupt
  (design note edge case 3) is a `Phase_Main` ordering problem and belongs to
  I7.2, not here.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
