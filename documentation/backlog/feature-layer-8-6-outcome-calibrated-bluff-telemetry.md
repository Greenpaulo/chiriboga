# L8.6 Outcome-calibrated bluff telemetry

**Roadmap item:** L8.6 · **Depends on:** L8.4, L8.5 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Validate and tune long-run bait/bluff frequencies against humans rather than inferring success from deterministic games, using opt-in, anonymous local telemetry for offline calibration.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). Bait frequency (`_calculateBaitFrequency()`), agenda-bluff probability (`_shouldBluffAgendaServer()`) and profile bounds (`_remoteDeceptionProfile()`) are fixed in code and have never been measured against human play. The only recording mechanism is the opt-in `DecisionSnapshots` record in `utility.js`, which captures choice points for reproduction, not posture decisions or their outcomes.

## Design
- Add opt-in, anonymous local telemetry recording: posture probability, roll bucket, epoch id (L8.4), visible server shape, current match-local feedback weights (L8.5), whether the server was run, and the resulting agenda/punishment outcome.
- Compare policy versions before changing the present bounds.
- Telemetry must not itself alter decisions or game state; any match-local adaptation belongs to L8.5.
- Document the telemetry flags and record schema in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Never record card identities from the Runner's hidden zones, player identifiers, or free text.
- Keep telemetry disabled by default.
- Preserve injectable randomness for reproducible tests.
- Offline tuning may change global coefficients only; the AI must not fingerprint or learn an individual opponent.

## Test scenarios
1. Telemetry records exactly one posture record per eligible card per L8.4 epoch.
2. Fixed seeded rolls reproduce identical telemetry records.
3. Enabling telemetry produces no side effects on AI decisions: with injectable randomness, outputs are identical with telemetry enabled and disabled.
4. No hidden Runner zone information is captured in telemetry records, including when hidden Runner cards are replaced.
5. Telemetry is off in a default configuration and writes nothing.

Regression guard (owned by other items, not acceptance for this one): match-winning agendas never bluff, known traps stop baiting (`PlayerCanLook`), and disabled or unaffordable punishment returns zero (L8.7).

## Acceptance gate
Human gate, not F4. Frequencies or bounds change only when opt-in human telemetry holds at least 500 postured-server records from at least 100 games, and a bootstrap 95% CI over games shows:

- `runRateSingleVariableCorrelation` (largest absolute Spearman correlation between whether the human ran a postured server and any one public variable listed for `bluffSingleVariableCorrelation` in the L8.4 ticket): CI upper bound at most 0.10;
- `bluffNetAgendaPoints` (agenda points gained by scored bluffed agendas plus trap outcomes, minus agenda points lost from bluffed servers, per game): CI lower bound at or above 0 for the proposed coefficients.

## Things to consider
- Parked until human play data exists: the gate cannot be evaluated without a human sample, so do not start this item before there is a way to collect one.
- Extend the existing opt-in recording path rather than building a separate one where the record shapes allow it.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test.
- [ ] Gate evidence (sample size, metrics, CIs, coefficients before and after) is recorded in the Resolution before any frequency changes.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
- [ ] Telemetry is disabled by default.
