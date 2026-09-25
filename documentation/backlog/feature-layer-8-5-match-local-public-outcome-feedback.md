# L8.5 Match-local public outcome feedback

**Roadmap item:** L8.5 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Let the Corp adjust later mixed bait/bluff strategies when the human repeatedly challenges or ignores particular visible remote postures during the current game, so a human cannot exploit a fixed posture distribution within one match. This item also owns the match-local public record that L8.2 reads.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). Verified details: bait probability comes from `_calculateBaitFrequency()` (bounded 0.08–0.35), agenda-bluff probability from fixed constants in `_shouldBluffAgendaServer()`, and profile shape from fixed thresholds in `_remoteDeceptionProfile()`. No outcome feeds back. The only per-server public history kept is `_recentSuccessfulRunPressure` (recent successful Runner runs, used for protection pressure); nothing records the Corp's own visible actions per server and turn.

## Design
- **Match-local public record** (owned here, reset when a new game begins): per server and turn, the Corp's own visible actions (root card installed, ICE installed, ICE rezzed, advancement counters placed) and the Runner's public responses (runs initiated, ICE encountered, successful accesses, traps fired, agendas stolen and scored). L8.2's "recent actions" signal reads the Corp half; this item's feedback reads both. Record only what both players saw.
- Record public outcomes by posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen and agendas scored.
- Behind `this.options.matchLocalPostureFeedback` (default `false`), maintain bounded match-local weights or Beta-style priors for the shared scripts, and use them when selecting later profiles (at L8.4 epoch boundaries once L8.4 exists; otherwise when new cards are profiled).
- Document the record, the feedback weight structures and the public signals in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Learn only from public actions and Corp-known outcomes.
- Never inspect Runner Grip/Stack identities or persist a player fingerprint across games or sessions.
- Never allow a small sample to collapse any script's probability to zero: every script keeps a non-zero exploration floor.
- Agenda and trap cards must continue drawing from overlapping distributions.

## Test scenarios
1. Ignored light postures modestly increase their later use during the current match.
2. Repeated challenges shift some weight toward deeper or delayed scripts.
3. One outcome cannot dominate the weights.
4. Starting a new game resets all outcome memory, and the public record, to baseline.
5. Changing hidden Runner cards changes nothing.
6. Identical seeded public histories produce identical weights.
7. Agenda and trap profile distributions remain overlapping after adaptation.
8. The public record lists, for a scripted two-turn sequence, exactly the Corp's visible installs, rezzes and advancements per server and turn, and nothing about facedown card identities.
9. With the option off, posture selection is unchanged from today (the record may still be kept).

## Acceptance gate
F4 comparison (paired seeds, committed deck pool, 200 games per deck pair, bootstrap 95% CI): baseline option off, candidate option on. The Runner AI does not learn postures, so this gate shows adaptation is bounded and safe; it cannot show that it beats a learning human.

- Bounds: `postureScriptWeights` stay within the configured bounds and every script's weight stays at or above its exploration floor in every candidate game.
- Unpredictability: `bluffSingleVariableCorrelation`: candidate CI upper bound at most 0.10.
- Guard: `pointsStolen` per game: CI upper bound of (candidate − baseline) at most +0.2.
- Guard: `winRate`: CI lower bound of (candidate − baseline) at least −0.02.

## Things to consider
- Sample size drift: in a typical match the Runner might run a remote only 3 to 6 times, and Beta-style priors can swing wildly on tiny samples (for example two wrong guesses in a row). Use strong, conservative prior weights so one or two runs adjust probabilities modestly rather than swinging posture selection.
- `_recentSuccessfulRunPressure` decays and serves protection pressure; do not merge it into the record, which keeps whole-match history for posture feedback.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] The F4 collectors `postureScriptWeights` (per game: each script's minimum and maximum weight) and, unless L8.4 or L8.2 already added it, `bluffSingleVariableCorrelation` are added through F4's collector extension point. `bluffSingleVariableCorrelation` is defined in the L8.4 ticket.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
