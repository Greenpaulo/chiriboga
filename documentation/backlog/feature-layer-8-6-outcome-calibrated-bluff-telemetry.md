# L8.6 Outcome-calibrated bluff telemetry

**Roadmap item:** L8.6 · **Depends on:** L8.5 · **Sets:** none
**Read first:** `documentation/corp-ai/principles.md`

## Goal
Validate and tune long-run bait/bluff frequencies against humans rather than inferring success from deterministic games, using opt-in, anonymous local telemetry for offline calibration.

## Current behaviour
Bait frequency and deception profile bounds are fixed in code and have never been measured against human play; there is no telemetry for posture decisions or their outcomes. See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence).

## Design
- Add opt-in, anonymous local telemetry recording: posture probability, roll bucket, visible server shape, current match-local feedback weights (L8.5), whether the server was run, and the resulting agenda/punishment outcome.
- Compare policy versions before changing the present bounds.
- Telemetry must not itself alter decisions or game state; any match-local adaptation belongs to L8.5.
- Document the telemetry flags and record schema in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Never record card identities from the Runner's hidden zones, player identifiers, or free text.
- Keep telemetry disabled by default.
- Preserve injectable randomness for reproducible tests.
- Offline tuning may change global coefficients only; the AI must not fingerprint or learn an individual opponent.

## Test scenarios
1. A posture is rolled once per decision epoch.
2. Replacing hidden Runner cards changes no decision.
3. Match-winning agendas never bluff.
4. Known traps stop baiting.
5. Disabled or unaffordable punishment returns zero.
6. Fixed seeded rolls reproduce identical postures.
7. Enabling telemetry produces no side effects on AI decisions: with injectable randomness, outputs are identical with telemetry enabled and disabled.
8. No hidden Runner zone information is captured in telemetry records.

## Acceptance gate
Change frequencies only after a sufficiently large human sample shows that run rates are not predictable from any single visible variable, and that agenda losses caused by bluffs are offset by improved scoring or trap outcomes.

## Things to consider
- Parked until human play data exists: the acceptance gate cannot be evaluated without a human sample, so do not start this item before there is a way to collect one.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] Telemetry is disabled by default.
