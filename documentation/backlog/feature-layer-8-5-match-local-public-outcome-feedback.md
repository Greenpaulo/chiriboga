# L8.5 Match-local public outcome feedback

**Roadmap item:** L8.5 · **Depends on:** L8.4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`

## Goal
Let the Corp adjust later mixed bait/bluff strategies when the human repeatedly challenges or ignores particular visible remote postures during the current game, so a human cannot exploit a fixed posture distribution within one match.

## Current behaviour
Bait and agenda postures are rolled from fixed distributions (`_calculateBaitFrequency()`, `_remoteDeceptionProfile()`), and the AI does not feed public outcomes back into later posture weights. See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence).

## Design
- Record public outcomes by posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen and agendas scored.
- Maintain bounded match-local weights or Beta-style priors for the shared scripts, and use those weights when selecting later profiles (at L8.4 epoch boundaries).
- Reset all opponent-response memory when a new game begins.
- Document the match-local feedback weight structures and public signals in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Learn only from public actions and Corp-known outcomes.
- Never inspect Runner Grip/Stack identities or persist a player fingerprint across games or sessions.
- Never allow a small sample to collapse any script's probability to zero: every script keeps a non-zero exploration floor.
- Agenda and trap cards must continue drawing from overlapping distributions.

## Test scenarios
1. Ignored light postures modestly increase their later use during the current match.
2. Repeated challenges shift some weight toward deeper or delayed scripts.
3. One outcome cannot dominate the weights.
4. Starting a new game resets all outcome memory to baseline priors.
5. Changing hidden Runner cards changes nothing.
6. Identical seeded public histories produce identical weights.
7. Agenda and trap profile distributions remain overlapping after adaptation.

## Acceptance gate
Public-history adaptation changes future script weights within configured bounds, while every script retains a non-zero exploration floor and agenda/trap trace distributions remain overlapping.

## Things to consider
- Sample size drift: in a typical match the Runner might run a remote only 3 to 6 times, and Beta-style priors can swing wildly on tiny samples (for example two wrong guesses in a row). Use strong, conservative prior weights so one or two runs adjust probabilities modestly rather than swinging posture selection.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
