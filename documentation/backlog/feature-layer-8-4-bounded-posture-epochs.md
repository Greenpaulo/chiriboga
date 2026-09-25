# L8.4 Bounded posture epochs

**Roadmap item:** L8.4 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Preserve one stable bait or bluff decision during an AI planning window without permanently committing an installed card to a stale posture. Today a trap or agenda stays locked to the posture it rolled on install for the rest of the game.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). Verified details: three lifetime caches, all `WeakMap`s created in the `CorpAI` constructor and never cleared during a game:

- `_shouldBaitServer(server)` rolls once per server and trap card and stores `{card, probability, roll, bait}` in `_serverBaitDecisions`;
- `_shouldBluffAgendaServer(server)` rolls once per server and agenda and stores `{card, probability, roll, bluff}` in `_agendaBluffDecisions`;
- `_remoteDeceptionProfile(card)` rolls depth, opening advancement and delay once per card into `_cardDeceptionProfiles`.

Nothing reevaluates them. Both roll functions check `_runnerMayWinIfServerBreached(server)` (and, for agendas, whether scoring it wins for the Corp) *before* reading the cache, so the winning-breach guard already applies immediately on every call. L3.5.1 relies on the resulting `_NoMoreProtectionForThisServer()` exclusion, whose lifetime this item bounds.

## Design
- Replace the lifetime records with a posture record containing an epoch id, the selected public script, a commitment horizon, and reevaluation reasons (for example `epochId`, `selectedScript`, `commitmentHorizon`, `reevaluationReasons`), behind `this.options.postureEpochs` (default `false`; off keeps the lifetime caches).
- Roll once on install or at the start of a Corp planning epoch.
- Reevaluate only after a meaningful boundary: the Runner turn ends, the server is challenged, credits or public Runner pressure materially change, advancement changes the server's stakes, or either player reaches match point.
- Repeated evaluator calls inside the same epoch reuse the existing result without consuming extra randomness.
- A reevaluation may retain the old posture.
- Document posture-epoch signatures and reevaluation boundaries in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Keep `_random` injectable.
- Never reroll because `_NoMoreProtectionForThisServer()` or another scorer happened to run again.
- Match-winning safety overrides remain authoritative: never bait or bluff when a breach wins the game.
- Hidden Runner card identities remain forbidden.

## Test scenarios
1. Repeated calls in one epoch consume no extra randomness.
2. A new Corp turn permits at most one reevaluation.
3. A material threat change can abandon a bait.
4. Irrelevant state changes do not reroll.
5. Seeded games reproduce the same epoch sequence.
6. An installed card does not remain locked to a posture after its commitment horizon expires.
7. Clearing F3's per-decision cache (once F3 exists) does not start a new epoch.
8. With the option off, the three caches behave exactly as today.

Regression guard (existing behaviour, not acceptance for this item): reaching match point immediately disables an unsafe agenda or trap posture. This already holds because the guard runs before the cache, and the tests 'bait posture is disabled when breaching the same root could win the game' and 'agenda bluff supports variable ice depth and never risks the winning steal' in `tests/corp-server-security.test.js` must keep passing with the option on.

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on.

- Hard checks: `postureDecisionsPerEpoch` shows exactly one posture decision per eligible card per epoch, and `postureLockedPastHorizon` is 0, in every candidate game.
- Unpredictability: `bluffSingleVariableCorrelation`: candidate CI upper bound at most 0.10.
- Guard: `pointsStolen` per game: CI upper bound of (candidate − baseline) at most +0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.

## Things to consider
- The F3 ticket notes that its per-decision evaluation cache pairs with posture epochs. Both define decision lifetimes, so decide explicitly how they interact rather than letting a cache clear trigger a posture reroll (scenario 7).
- **`bluffSingleVariableCorrelation`** (shared by L8.2, L8.4 and L8.5; whichever lands first adds it). For every posture decision that reached a random roll (bait, agenda bluff, profile, and each epoch reevaluation), record the outcome (`postured` 0/1 and, for postured decisions, `isAgenda` 0/1) and the public variables at decision time: turn number, Corp credits, Runner credits, Runner Grip size, HQ size, the server's root card count and ICE count, the deepest central's ICE count, and both players' agenda points. The metric is the largest absolute Spearman correlation over all (outcome, variable) pairs in the batch, with a bootstrap 95% CI. Decisions stopped by a safety guard are excluded, because guards are allowed to depend on game state.
- The shipped agenda-bluff probability already fails this rule for Grip size: [`documentation/bugs/agenda-bluff-probability-tracks-runner-grip-size.md`](../bugs/agenda-bluff-probability-tracks-runner-grip-size.md). Fix it before measuring the baseline, or the baseline carries the defect.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collectors `postureDecisionsPerEpoch`, `postureLockedPastHorizon` and, unless L8.5 or L8.2 already added it, `bluffSingleVariableCorrelation` are added through F4's collector extension point.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
