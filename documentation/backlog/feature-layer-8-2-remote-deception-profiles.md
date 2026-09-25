# L8.2 Deception legibility signals

**Roadmap item:** L8.2 · **Depends on:** F4, L8.5 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Make agenda bluffs read like traps to a human by basing bluff legibility on the generic public signals a human actually reads: server card count, remote-versus-central framing, and protection posture relative to the Corp's recent actions. There is no card-level hook to hang bluffing on the way `AIPunishesAccess` supports baiting, so the signals must be generic rather than specific to any trap card.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). The shared profiles are done; none of the three legibility signals is implemented. Verified details:

- `_remoteDeceptionProfile(card)` rolls, per eligible agenda or trap, a target ICE depth of 1 (30%), 2 (48%) or 3 (22%), an opening advancement of 1 or 2, and an optional one-turn delay. The depth is absolute: it ignores how heavily the Corp has iced its centrals.
- **Card count is not treated alike.** `_shouldBluffAgendaServer()` and `_deceptionProtectionTarget()` require exactly one root card, but `_shouldBaitServer()` does not, so `_deceptionAdvancementTarget()` gives a trap sharing a remote with another root card (for example an upgrade) the posture's delayed or partial advancement cadence, while an agenda in the same shape advances normally. That difference is a learnable tell.
- **No recent-action input.** Once a postured server reaches its target depth it is excluded from protection for as long as the posture lasts, however much ICE the Corp adds elsewhere. Nothing records the Corp's own visible actions per server and turn; L8.5 adds that record.
- The winning-breach guard in `_shouldBluffAgendaServer()` and `_shouldBaitServer()` checks only that server (`_runnerMayWinIfServerBreached(server)`) and, for agendas, whether scoring it would win for the Corp. It does not look at central breaches. The earlier text claimed it did.
- The agenda-bluff probability decreases with the Runner's Grip size, which breaks `principles.md` §5: see [`documentation/bugs/agenda-bluff-probability-tracks-runner-grip-size.md`](../bugs/agenda-bluff-probability-tracks-runner-grip-size.md).

## Design
All three signals sit behind `this.options.deceptionLegibility` (default `false`). They apply identically to agendas and traps, because both read the same `_remoteDeceptionProfile()`.

- **Card count (parity).** A posture applies only to a remote with exactly one root card, for traps as well as agendas: `_deceptionPostureActive()` returns false for any multi-root server, so advancement cadence and protection target follow the same rule for both card types.
- **Remote-versus-central framing (relative depth).** Roll the depth as an offset from the deepest central instead of an absolute count: `targetIce = clamp(centralDepth + offset, 1, 3)`, where `centralDepth` is the larger ICE count of HQ and R&D when the profile is rolled, and `offset` is −1, 0 or +1 with the existing 30/48/22 split. A bluffed remote then looks light or heavy relative to how this Corp builds in this game. The clamp keeps "never naked".
- **Protection posture relative to recent actions (top-up).** Read the Corp half of L8.5's match-local public record. When a postured server is at its target depth and, in each of the last `legibilityTopUpTurns` (default 2) Corp turns, the Corp installed ICE on another server but not on this one, raise the target by one (at most 3, at most once per posture), so the postured remote is not the one server the Corp conspicuously never touches.
- Use no card-title checks and no trap-specific logic.
- Tactical scoring-window value remains the primary install signal; legibility adjusts profiles within it and never overrides it.
- Document `_remoteDeceptionProfile` parameters, the legibility inputs and the safety overrides in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Bluffing acts against the Corp's otherwise-optimal install/protection pattern purely to create a false signal, which risks measurably worse average play if the bluff does not land (unlike baiting, which is contained to a server that is already a trap).
- Deception profiles must never create naked agenda servers and must be disabled when a breach of that server could give the Runner enough agenda points to win. No legibility adjustment may reactivate a posture the guard disabled.
- Unpredictability: whether a posture is active, and whether a postured card is an agenda or a trap, must never observably correlate with any single game-state variable a human could learn over repeated games (checked by `bluffSingleVariableCorrelation`).
- Use only public signals and Corp-known information; never inspect hidden Runner cards.
- Keep `_random` injectable.

## Test scenarios
All with the option on unless stated, and with injected rolls.

1. **Card count parity.** With identical rolls, an agenda and a trap each sharing a remote with one upgrade both get the ordinary advancement target and no protection target; alone in a remote, both get the same posture cadence and target.
2. **Relative depth.** With the offset roll giving 0, the target is 1 when the deepest central has 1 ICE and 2 when it has 2; an offset of −1 with a central depth of 1 gives 1 (never 0), and +1 with a central depth of 3 gives 3.
3. **Overlap.** In scenario 2, an agenda and a trap with the same rolls and public state receive the same target.
4. **Top-up.** A postured server at target 1: with L8.5's record showing ICE installed on HQ in each of the last 2 Corp turns and none on this server, `_NoMoreProtectionForThisServer(server)` becomes false (target 2); with ICE elsewhere in only 1 of those turns it stays true; after one raise, further turns of ICE elsewhere do not raise it again.
5. No legibility adjustment reactivates a posture disabled by the winning-breach guard, and no target drops below 1.
6. Changing hidden Runner cards without a public-state change produces no change in any legibility input or profile.
7. With the option off, scenarios 1–4 behave exactly as today.

Regression guard (existing behaviour, not acceptance for this item): variable 1–3 ICE depth, no naked agenda servers, disabling when breaching that server could win, and agendas and traps drawing from the same profile rolls. These are covered by 'agenda bluff supports variable ice depth and never risks the winning steal', 'shared remote posture varies install shape and advancement cadence' and 'bait posture is disabled when breaching the same root could win the game' in `tests/corp-server-security.test.js`, which must keep passing with the option on and off.

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on. The Runner AI does not learn tells, so this gate shows the signals are safe and not learnable from one variable; long-run success against humans belongs to L8.6.

- Unpredictability: `bluffSingleVariableCorrelation`: candidate CI upper bound at most 0.10.
- Overlap: `postureShapeByCardClass` total-variation distance between agenda and trap shapes (target depth, opening advancement, delay) at most 0.05.
- Guard: `pointsStolen` per game: CI upper bound of (candidate − baseline) at most +0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.
- Guard: `trapTriggers` per game: CI lower bound of (candidate − baseline) at least −0.05.

## Things to consider
- The earlier ticket asked for deception postures to suppress or exempt value-weighted protection debt. L3.5.1 now handles this by relying on the existing `_NoMoreProtectionForThisServer()` exclusion; the top-up rule above changes when that exclusion ends, so check L3.5.1's scenario 7 still holds.
- The recent-action record is L8.5's, not this item's, so there is one match-local record and one reset rule.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collectors `postureShapeByCardClass` and, unless L8.4 or L8.5 already added it, `bluffSingleVariableCorrelation` (defined in the L8.4 ticket) are added through F4's collector extension point; `trapTriggers` is added if F4 does not already have it.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] No card titles are hardcoded in `ai_corp.js` for bluff legibility.
