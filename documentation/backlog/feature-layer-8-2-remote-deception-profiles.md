# L8.2 Deception legibility signals

**Roadmap item:** L8.2 · **Depends on:** none · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Make agenda bluffs read like traps to a human by basing bluff legibility on the generic public signals a human actually reads: server card count, remote-versus-central framing, and protection posture relative to the Corp's recent actions. There is no card-level hook to hang bluffing on the way `AIPunishesAccess` supports baiting, so the signals must be generic rather than specific to any trap card.

## Current behaviour
`_remoteDeceptionProfile()` already gives agendas and traps shared, independently rolled profiles (ICE depth 1–3, opening advancement 1–2, optional one-turn delay), never creates naked agenda servers, and is disabled when a breach could win. These are covered by the tests in `tests/corp-server-security.test.js` named 'agenda bluff supports variable ice depth and never risks the winning steal', 'shared remote posture varies install shape and advancement cadence' and 'bait posture is disabled when breaching the same root could win the game'. See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence).

## Design
- Extend profile selection so the visible shape of a bluffed agenda server is judged against generic public signals: installed server card count, remote-versus-central framing, and protection posture relative to the Corp's recent actions.
- Use no card-title checks and no trap-specific logic.
- Tactical scoring-window value remains the primary install signal; legibility adjusts profiles within that, it does not override it.
- Agenda and trap cards continue to draw from shared, overlapping profile distributions.
- Document `_remoteDeceptionProfile` parameters, the legibility inputs and the safety overrides in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Bluffing acts against the Corp's otherwise-optimal install/protection pattern purely to create a false signal, which risks measurably worse average play if the bluff does not land (unlike baiting, which is contained to a server that is already a trap).
- Deception profiles must never create naked agenda servers and must be disabled when a breach could give the Runner enough agenda points to win.
- Unpredictability: the random roll must never observably correlate with any single game-state variable a human could learn over repeated games (for example always bluffing on turn 3, or only when a specific card is in hand).
- Use only public signals and Corp-known information; never inspect hidden Runner cards.
- Keep `_random` injectable.

## Test scenarios
1. The existing variable-depth, shared-posture and winning-breach tests named above still pass unchanged.
2. Agenda bluffs vary across 1-, 2- and 3-ICE server depths rather than stopping deterministically at one ICE.
3. Agenda deception is suppressed immediately when a central or remote breach could win the game for the Runner.
4. Traps and agendas draw from identical, overlapping profile distributions.
5. Changing hidden Runner cards without a public-state change produces no change in profile selection.

## Acceptance gate
The Corp AI plays against a human, not the Runner AI, so this item's correctness is long-run unpredictability across many games against a human trying to learn its patterns, not any single decision being locally optimal. Adopt when the scenarios above hold and agenda and trap profile distributions remain overlapping; frequency tuning against human outcomes belongs to L8.6.

## Things to consider
- The earlier ticket asked for deception postures to suppress or exempt value-weighted protection debt. That criterion has moved to L3.5.1, because the interaction only exists once weighted debt exists.
- The legacy Layer 8.2 text defines no deterministic scenario for the legibility signals themselves. When implementing, add one that fixes how each signal moves profile selection before writing the code.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] No card titles are hardcoded in `ai_corp.js` for bluff legibility.
