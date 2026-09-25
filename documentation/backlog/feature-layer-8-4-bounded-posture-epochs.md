# L8.4 Bounded posture epochs

**Roadmap item:** L8.4 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Preserve one stable bait or bluff decision during an AI planning window without permanently committing an installed card to a stale posture. Today a trap or agenda stays locked to the posture it rolled on install for the rest of the game.

## Current behaviour
`_shouldBaitServer()` makes one injectable random roll per installed trap/server and caches it, and `_remoteDeceptionProfile(card)` caches the shared agenda/trap profile; both are cached for the installed card's lifetime, and nothing reevaluates them. Match-winning safety guards already disable bait and agenda postures when a breach could win. See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence).

## Design
- Replace lifetime booleans with a posture record containing an epoch id, the selected public script, a commitment horizon, and reevaluation reasons (for example `epochId`, `selectedScript`, `commitmentHorizon`, `reevaluationReasons`).
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
5. Reaching match point immediately disables an unsafe agenda or trap posture.
6. Seeded games reproduce the same epoch sequence.
7. An installed card does not remain locked to a posture after its commitment horizon expires.

## Acceptance gate
No installed card remains locked to a posture after its commitment horizon, and instrumentation confirms exactly one posture decision per eligible card per epoch.

## Things to consider
- The F3 ticket notes that its per-decision evaluation cache pairs with posture epochs. Both define decision lifetimes, so decide explicitly how they interact rather than letting a cache clear trigger a posture reroll.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
