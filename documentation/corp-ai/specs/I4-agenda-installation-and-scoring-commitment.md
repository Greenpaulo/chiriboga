# I4 Agenda installation and scoring commitment

**Roadmap item:** I4 · **Depends on:** I3, F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** bf8bed4 (2026-10-05)

## Goal

Commit an agenda only when the destination stays safe for as long as the agenda
is exposed and the Corp has a plan to finish it, weighting the required margin
by what a steal would cost.

## Current behaviour

The security floor is optional. `_isAScoringServer()` calls
`_evaluateServerSecurity()` but rejects a remote solely for not being
`isSecure` only when `secureScoringServerGate` is enabled. It defaults to
`false` on the corrected regression branch. The strict behavior originated
in `fa1182c`; fixtures
`corp-no-agenda-into-insecure-remote.txt`, `corp-no-agenda-behind-no-etr-ice.txt`,
`corp-no-agenda-behind-conditional-etr-ice.txt` and the control
`corp-agenda-into-secure-remote-still-ok.txt` retain their expectations, with
the insecure-remote fixtures explicitly enabling the gate. With the gate
off, an insecure remote can qualify. A remote that already
holds an agenda, scoring upgrade or Ambush qualifies outright after the
optional check; any other remote must pass the old relative test (protection
score at least HQ's, or Archives' under agenda flood), have no rival remote holding a scoring
upgrade, and be the strongest empty protected remote.

`_isHVT()` agendas, Ambush and Hostile cards are offered to those scoring
servers and sorted by the gap between advancement requirement and
`_scoringWindow()`, plus `_deceptionInstallDistance()`. A winning agenda that
can be installed and fast-advanced this turn is emitted first.

Completion pieces exist: `_returnPreference()` marks an agenda selected for
install `AIScoringPlanCommitted`, and `_installedAgendaCanBeCompleted()`
can admit the advance-selection block past the global rez reserve only when
`committedAgendaReserveBypass` is enabled (also default `false`). The helper
checks whether a committed, advanceable agenda has remaining advancements
that `_potentialAdvancement(card, limit, false)` can fund; it does not derive
an exposure duration or prove completion this turn. Ordinary advance paths
remain available with the bypass off.

The [regression handoff](../../corp-ai-regression/gated-fix-handoff.md) records
why these two policies were gated. The [PR 19 follow-up](../../corp-ai-regression/implementation.md#pr-19-review-proposed-winning-steal-install-guard)
belongs to I4: there is currently no separate point-sensitive install veto.
Its remaining risk must be investigated against the corrected default, rather
than treating the old unconditional security floor as the baseline. The
existing agenda-bluff and game-winning-breach rez guards remain enabled.

What is missing:

- **Time exposed.** `isSecure` is judged against the Runner's current
  effective credits (`_effectiveRunnerCreditPool()`), including public run
  credit sources and projected click-for-credit before a run. It does not
  project income across multiple exposed Runner turns. Even with the strict
  gate enabled, a soft credit lockout with a small margin passes.
- **Completion plan before commitment.** No test asks, before installing,
  whether the Corp can finish the agenda; `AIScoringPlanCommitted` is set on
  every agenda install, plan or not.
- **Consequence weighting.** Install admission has no point-sensitive safety
  margin distinguishing a 1-point agenda from a game-winning steal.
- **Agenda flood.** Flood relaxes the relative bar to Archives. With the
  strict gate off, an insecure remote can qualify, but no explicit completion
  plan or comparison of HQ retention, discard and install loss risks justifies
  the choice. With the gate on, the blanket floor still applies.

See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design

- **Completion plan.** Before committing, run the same test
  `_installedAgendaCanBeCompleted()` runs, hypothetically, for the candidate
  agenda in the candidate server (`_advancementLimit()` and
  `_potentialAdvancement()`, including fast-advance tools in HQ), and derive
  `exposedRunnerTurns`: how many Runner turns pass before the score at the
  Corp's click and credit rate, after reserving what defence of the plan
  needs. The existing helper's `thisTurn=false` search is a funding estimate,
  not a timing oracle: build an executable click/credit plan, account for the
  install, and compare retaining the agenda in HQ with installing it. Replace
  the boolean with a plan record on the card (turns, credits
  reserved); keep `AIScoringPlanCommitted` true only when a plan exists, so
  `_installedAgendaCanBeCompleted()` can still read the commitment flag.
  Any changed reserve-bypass behavior belongs behind the I4 option and must
  be measured; do not silently re-enable `committedAgendaReserveBypass`.
- **Time exposed.** A server is acceptable only if it stays secure against the
  Runner's projected public credits over `exposedRunnerTurns`: current
  effective credits plus a conservative public income bound per Runner turn
  (clicks available at one credit each, plus public recurring and drip
  sources), without double-counting click credits already in the evaluator.
  A verified install-and-score line with zero exposed Runner turns requires
  no Runner breach check before the score; preserve game-winning fast advance.
- **Consequence weighting.** Use `scoringValue` (design note) and a required
  security margin that grows with steal consequence, from the evaluator's
  `breachConsequence` signal (the one I2 consumes). A steal that would win the
  game for the Runner is a hard constraint over the exposed Runner turns:
  reject unless secure over that window. Compare executable scoring and
  reinforcement alternatives and HQ retention risk; a current `!isSecure`
  result alone does not establish a forced immediate loss. The shared
  `_breachConsequence` signal is still planned under L7.1, not present today.
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

Already green and kept as regressions: with `secureScoringServerGate=true`,
an insecure remote is rejected even when HQ is weaker
(`corp-no-agenda-into-insecure-remote.txt`), and a
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
7. **Recovered baseline and counterexamples.** With both legacy options off,
   reproduce the PR 19 risk using a decision trace and show the I4 plan prevents
   an avoidable losing install. Contrast with a currently breachable remote
   whose agenda can be scored or whose defense can be completed before any
   Runner turn, and with unsafe HQ retention. Assert plan timing and the reason
   for the choice; point totals plus current breachability are insufficient.

## Acceptance gate

F4 gate. Option `agendaCommitmentPlan` (Corp AI), off in the baseline and on
in the candidate. I0's committed deck pool and paired seeds, 200 games per
deck pair, bootstrap 95% intervals. I0 must capture the corrected default;
both arms keep the five regression gates off and hold prerequisite I-layer
options identical. Back-fill observation-only collectors in the baseline.
Collectors: `installOutcomes`, `stallTurns`, `corpInsolventTurns` (added by
I0; definitions in `documentation/ai-batch-harness.md`). `installOutcomes`
exposes `installOutcomes.installToScoreTurns` and
`installOutcomes.agendaExposureTurns`, the mean per-game durations (0 when a
game has no observation, beside the `agendasScored`/`agendasInstalled`
counts). The other two export the per-game counts `stallTurns` and
`corpInsolventTurns`. All duration/count metrics declare
`lower` as better. Empty observations must be defined consistently in both
arms and must not hide stalled or stolen agendas.
Starts: none initially; if the pool does not exercise the option in `--quick`,
add real-game-derived starts and a separate gate command before implementation
is handed off. Record their paths and provenance in this spec.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `pointsStolenByServer.remote` | lower | interval of the improvement above 0 |
| Guard | `winRate` | higher | regression at most 0.03 |
| Guard | `pointsScored` | higher | regression at most 0.25 |
| Guard | `pointsStolen` | lower | regression at most 0.25 |
| Guard | `gameLength` | lower | regression at most 1.5 turns |
| Guard | `corpInsolventTurns` | lower | regression at most 0.5 turns |
| Guard | `installOutcomes.installToScoreTurns` | lower | regression at most 0.5 turns |
| Guard | `installOutcomes.agendaExposureTurns` | lower | regression at most 0.5 turns |
| Guard | `stallTurns` | lower | regression at most 0.5 turns |

Gate command (after I0 supplies the collectors):
`node scripts/ai-batch.js gate --corp-option agendaCommitmentPlan=true --collector installOutcomes --collector stallTurns --collector corpInsolventTurns --improve pointsStolenByServer.remote --guard winRate=0.03 --guard pointsScored=0.25 --guard pointsStolen=0.25 --guard gameLength=1.5 --better gameLength=lower --guard corpInsolventTurns=0.5 --guard installOutcomes.installToScoreTurns=0.5 --guard installOutcomes.agendaExposureTurns=0.5 --guard stallTurns=0.5`

Re-grounding retains the remote-theft improvement and all three original
0.5-turn guards. The core guards retain the shared design's preregistered
3-percentage-point/0.25-point tolerances as an explicit exception to today's
2-point/0.2-point defaults: this refresh preserves I4's thresholds rather
than changing its adoption contract. Retain that design's supplemental latency check
(mean upper bound at most +25% of baseline) using fresh paired runs on the same
machine; cached timing is not an adoption gate. This remains a strategic
improvement gate, not an ungated deterministic fix.

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
- [ ] I0's `installOutcomes` collector and its two duration metrics are verified against scripted scored, stolen and stalled commitments, then back-filled into the corrected baseline without changing decisions.
- [ ] I0's `stallTurns` collector is verified and back-filled into the baseline.
- [ ] I0's `corpInsolventTurns` collector is verified and back-filled into the baseline.
- [ ] The gate's `--quick` run changes at least one game; if starts are required, their provenance, focused tests and separate passing gate command are recorded before hand-off.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
