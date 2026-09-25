# I2 ICE selection by marginal security

**Roadmap item:** I2 · **Depends on:** I1, F2, F4, L7.1 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Choose the `(ICE, server)` pair that most improves security, weighted by what a
breach would cost, using the existing security evaluator rather than input-card
order. This is the first intentional policy change on the I1 candidate
framework.

## Current behaviour
`_iceInstallOptions()` lists affordable ICE in input-card order, then
unaffordable ICE when low-priority options are permitted, for the one server
`_serverToProtect(false, false, targetIsEligible)` picks; the predicate
(L3.5.2's interim bridge) wraps `_shouldInstallIceLayer()`. Optional
`AIWorthwhileIce(server, "install")` hooks filter candidates. No ICE is
compared with another by its effect.

Two pieces of hypothetical ICE scoring already exist:

- `_criticalBreachDefenseAction()` scores post-install risk for each ICE on
  the at-risk central: it subtracts the install cost from `corp.creditPool`,
  pushes the ICE onto `server.ice`, reads `_centralBreachLossRisk()` and
  restores in `try/finally`, installing the best ICE when the loss probability
  (at least `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD`) falls by
  `CORP_AI_CRITICAL_BREACH_MINIMUM_IMPROVEMENT`.
- `_iceInstallScore()` (printed strength plus rez cost, a Palisade title case,
  halved for a compatible breaker) pushes a fake remote onto
  `corp.remoteServers` unguarded. Only `_bestIceToInstall()` calls it, and
  nothing calls that.

See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
1. Switch on the I1 candidates for every strategically relevant server
   (`eligible` true for ICE on any server `_rankedServersToProtect()` lists),
   instead of one server chosen in advance.
2. Evaluate each candidate through `_hypotheticalServerAfterInstall()` (design
   note) with the ICE as the new outermost layer, including the detached
   server for a new remote.
3. Score with the design note's `securityGain` (lockout, break cost, bypass),
   `futureValue`, `installCost` and `reserveCost` components. Rez affordability
   uses the evaluator's shared unrezzed-ICE budget (L1.1); ICE outside that
   budget earns no `lockout` or `breakCost`.
4. **Consequence comes from the evaluator.** `consequenceWeight` is
   `0.25 + 0.75 × _breachConsequence(server).weight`, the breach-consequence
   signal L7.1 (consequence-calibrated central pressure) owns and L3.5.1 also
   consumes. I2 reads it as is, adds no weights, and install planning must
   not invent its own.
5. **Generalise the critical-breach check, do not duplicate it.**
   `_criticalBreachDefenseAction()` reads `lossRiskAfter` from I2's candidate
   evaluation (computed through the shared helper) instead of its own
   push/pop loop; its thresholds and behaviour stay the same.
6. Delete `_iceInstallScore()` and `_bestIceToInstall()`.
7. Same-turn multi-server allocation stays authoritative: a server already in
   `_protectionInstallsThisTurn` keeps its current treatment.
8. Retire `_serverToProtect(..., targetIsEligible)` from ordinary ICE-install
   generation (design note migration step 7); the server ranking stays for
   diagnostics.

Distinctions the score must respect:

- A hard lockout is not printed strength.
- Optional punishment raises deterrent value (`deterrence`) but never
  `lockout`.
- Subtype diversity counts only through public Runner capabilities and
  effective subtype shifts.
- A second layer can matter against outermost or one-ICE bypass even when raw
  break cost barely changes.
- `AIWorthwhileIce` hooks may reject or modify candidates but not set their
  whole ordering.
- On a server with an active bait or bluff posture, rank only within the
  posture's bounded depth and visible-strength envelope; tactical safety
  overrides the posture when the lighter choice could enable a game-winning
  breach.

**Title cases.** Own the rows tagged I2 in the P1 ticket
(`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`): Palisade
in `_iceInstallScore()` (deleted with the function) and the other ICE-selection
titles.

## Safety and information boundary
Hypothetical outermost-layer evaluation uses only public Runner capabilities
and must not mutate live server contents or credits. Candidate evaluation must
be unchanged when hidden Runner Grip cards are substituted. Unrezzable ICE must
not receive active-security credit.

## Test scenarios
1. Against a publicly installed Fracter only, otherwise comparable Code Gate or
   Sentry ICE outranks an efficiently broken Barrier.
2. An affordable ETR ICE that creates a hard lockout outranks higher
   printed-strength ICE that leaves the route open.
3. A second affordable layer outranks deepening another server when it
   neutralizes public outermost-bypass risk on a valuable remote, subject to
   multi-server safety.
4. ICE that cannot be rezzed within the projected defense budget does not
   receive active-security credit (L1.1's shared budget, not a reimplementation).
5. An ICE with only optional punishment increases deterrent value but does not
   claim a lockout.
6. Effective subtype changes and targeted bypass hooks affect hypothetical
   results exactly as they affect installed ICE.
7. Candidate evaluation is unchanged when hidden Runner Grip cards are
   substituted.
8. A bait-postured remote receives an ICE choice consistent with its bounded
   light-defense script. (What happens once the posture ends is I3's scenario,
   because postures last for the card's lifetime until L8.4.)
9. The Baker-backdoor fixture
   (`corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`) still installs
   on Archives with the bridge removed.
10. If the highest-urgency server has no ICE in hand that materially improves
    its outcome, a useful candidate on another insecure server is chosen, with
    the bridge removed.
11. With the same two ICE and two equally insecure servers, the ICE goes to the
    server with the higher `breachConsequence`; changing only that signal
    changes the choice.
12. `_criticalBreachDefenseAction()` picks the same ICE as before on its
    existing tests while reading I2's candidate evaluation.

## Acceptance gate
Improvement gate with the standard guards (design note). Candidate:
`this.options.iceMarginalSecurity` on; baseline: I0's report. Collector added:
`strandedUnrezzedIceCost` (credits spent installing ICE never rezzed before the
game ends); `successfulRunsByServer` comes from I0.

- Improvement: `pointsStolen` per game falls; the interval's upper bound for
  candidate minus baseline is below 0.
- Guards: the standard tolerances, plus `strandedUnrezzedIceCost` upper bound
  at most +1 credit per game.

## Things to consider
- L4.1 (unified bypass allocation) changes the evaluator results that
  scenarios 3 and 6 rest on. Assert orderings, not numbers, and if L4.1 lands
  first build those fixtures on its hook format.
- Protection debt versus a winning line (design note edge case 3): central ICE
  scored by consequence must stay below the band-3 fast-advance-to-win
  candidate.
- Performance: every pair costs an evaluator call. F3's cache will help later;
  it is not a dependency, and the latency guard applies now.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Ordinary ICE-install generation no longer calls `_serverToProtect(..., targetIsEligible)`; the L3.5.2 regressions (scenarios 9 and 10) pass without it.
- [ ] `_criticalBreachDefenseAction()` consumes I2's candidate evaluation; `_iceInstallScore()` and `_bestIceToInstall()` are deleted.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The `strandedUnrezzedIceCost` collector is added through F4's collector extension point.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
