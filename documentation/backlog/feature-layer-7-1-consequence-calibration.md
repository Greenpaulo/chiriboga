# L7.1 Consequence-calibrated central pressure

**Roadmap item:** L7.1 · **Depends on:** F4 · **Sets:** playable sets (`documentation/card-sets.md`)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Scale the mechanic-level central-pressure penalty by the actual consequence of the next central breach, rather than treating every extra access as equally dangerous, and provide the one breach-consequence signal every other item uses. This completes the non-lethal consequence weighting that remains after the tactical loss interrupt.

## Current behaviour
See [architecture: central pressure and breach-loss risk](../corp-ai/architecture.md#central-pressure-and-breach-loss-risk). Verified details:

- Installed Runner cards expose `AICentralPressure(server)` (a number, or `{additionalAccess, persistentPressure, growth}`), and `AICentralPressureAfterPurge(server)` for purge-dependent cards. `_centralServerThreat()` turns these into `penalty = min(8, 1.5 × additionalAccess + 2 × persistentPressure + min(2, growth))`, which `_protectionScore()` subtracts for HQ and R&D only. Nothing weights it by what a breach would expose.
- `_centralBreachLossRisk(server)` computes, for HQ or R&D, the order-agnostic probability that one breach with `1 + floor(additionalAccess)` accesses gives the Runner enough points to win, from the Corp-known contents of that server. It returns 0 when the server is currently secure. At `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` (0.35) or more, `_criticalBreachDefenseAction()` may interrupt non-winning advancement.
- Remotes have only a win/no-win check, `_runnerMayWinIfServerBreached(server)`, based on `_agendaPointsInServer(server)`. There is no shared function that reports what a breach of an arbitrary server would expose.

## Design
- **Owned consequence signal.** Add `_breachConsequence(server)` returning `{pointsExposed, winProbability, advancedAgenda, backdoorTo, weight}` for every server, computed "if breached", independent of current security:
  - remote: `pointsExposed = _agendaPointsInServer(server)`, `winProbability` 1 when `_runnerMayWinIfServerBreached(server)`, else 0, `advancedAgenda` when a root agenda has advancement counters;
  - HQ and R&D: expected agenda points from one breach with the public access count, and the win probability from the same dynamic programme `_centralBreachLossRisk()` uses (refactor so both share it; `_centralBreachLossRisk()` keeps its security early return);
  - Archives: agenda points it holds; while `_archivesIsBackdoorToHQ()` is true, the larger of that and HQ's consequence, with `backdoorTo` set to HQ.
  - `weight` in `[0, 1]`: `max(winProbability, min(1, pointsExposed / max(1, AgendaPointsToWin() - AgendaPoints(runner))))`, the single scalar that I2's `consequenceWeight` (`0.25 + 0.75 × weight`, in `specs/install-decisions-design.md`) reads.
  L3.5.1 (debt rate) and I2 (marginal-security weighting) consume this function; neither re-derives these values.
- **Central penalty.** Behind `this.options.consequenceWeightedCentralPressure` (default `false`), scale `_centralServerThreat()`'s access component by `_breachConsequence(server).pointsExposed` and `winProbability`, keeping the eight-point bound. Inputs: agenda points needed to win, HQ size and Corp-known agenda density, R&D size, top cards only where a game effect revealed them to the Corp, and remaining uses/counters reported by the hook.
- Keep the hook mechanical; consequence weighting belongs in the evaluator.
- A zero-counter scaling engine (for example Conduit) may contribute bounded growth pressure but must not claim current multi-access.
- Tactical threshold: candidate values of `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` are compared under the same gate; the constant changes only for a value that passes it.
- Keep `documentation/ai.md` accurate for `AICentralPressure` and `AICentralPressureAfterPurge` if their semantics change.

## Safety and information boundary
- The Corp may use its own HQ and R&D knowledge, but must never inspect hidden Runner cards in Grip or Stack.
- Known top cards may be used only where a game effect has revealed those positions to the Corp.
- Do not double-count the existing HQ agenda-flood terms in `_protectionScore()` or successful-run history. L3.5.1 consumes `_breachConsequence()` for its debt rate only; this item adds no cross-turn accumulation.

## Test scenarios
1. With the option on, one extra HQ access is more urgent when HQ is agenda-rich than when it holds no agendas.
2. R&D multi-access becomes critical when a breach could win.
3. Exhausted limited-use hardware contributes zero current access pressure.
4. Zero-counter scaling pressure stays below live multi-access.
5. Changing hidden Runner Grip/Stack identities changes nothing.
6. `_breachConsequence()` reports the same `winProbability` for HQ as `_centralBreachLossRisk()` does when HQ is insecure, and keeps that value when HQ becomes secure (it is "if breached"), where `_centralBreachLossRisk()` returns 0.
7. `_breachConsequence(corp.archives)` reports HQ's consequence only while `_archivesIsBackdoorToHQ()` is true.
8. With the option off, `_centralServerThreat()` penalties are unchanged from today.
9. `weight` is 1 for a remote whose breach wins the game, 0 for an empty remote, and strictly between for a remote exposing fewer points than the Runner needs.

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on.

- Improvement: `pointsStolenByServer` for HQ plus R&D per game decreases: the CI of (baseline − candidate) has a lower bound above 0.
- Guard (viable remote scoring): `pointsScored` per game: CI lower bound of (candidate − baseline) at least −0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.
- Guard (over-protecting exhausted tools): `exhaustedPressureProtectionInstalls` per game: CI upper bound of (candidate − baseline) at most +0.1.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collector `exhaustedPressureProtectionInstalls` (ICE installed on HQ or R&D in a Corp turn when every public central-pressure source on that server reports zero current `additionalAccess` because its uses or counters are spent) is added through F4's collector extension point.
- [ ] `_breachConsequence(server)` exists and is the only breach-consequence calculation; L3.5.1 and I2 are told to consume it.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
