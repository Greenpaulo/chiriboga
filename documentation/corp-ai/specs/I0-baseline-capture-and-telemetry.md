# I0 Baseline capture and telemetry

**Roadmap item:** I0 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Commit a measurable baseline of current install behaviour before any install
policy changes: an F4 baseline report that later I items compare against, and
decision snapshots that show exactly which install choices a later change
moved. Without both, "intended" and "unintended" changes cannot be told apart.

## Current behaviour
`_rankedInstallOptions()` builds install preferences from independently
generated option groups whose effective priority comes largely from
concatenation order, and `_bestInstallOption()` selects the first generated
preference matching a legal engine option. `Phase_Main` also reads the ranked
list directly (`priorityRankedInstallOptions[0]`, and `rankedInstallOptions[0]`
on the hand-pressure path).

Observation pieces already exist:

- `DecisionSnapshots` (`utility.js`, opt-in via `enabled`) records, per
  interesting Corp decision, the phase, offered options, chosen option and a
  `ReproductionCode()` dump, plus recorder cost; `CorpAI.Choice()` calls
  `Before`/`After`. `tests/decision-snapshots.test.js` checks it and its
  round-trip through `tests/extract-fixture.js`.
- `tests/corp-decision-fixtures.test.js` replays board fixtures from
  `tests/fixtures/corp-decisions/` with `EXPECT`, `EXPECT_SERVER` and
  `EXPECT_CARD` directives.
- `tests/corp-install-destination.test.js` checks destination legality
  (`CheckInstallDestination`).

Nothing records the candidates considered, the servers skipped and why, or the
fate of a root commitment. There is no seeded batch runner yet (F4).
See [architecture.md: install planning today](../architecture.md#install-planning-today).

## Design
No new telemetry system. Extend the existing pieces:

- **Candidate record in snapshots.** When `DecisionSnapshots.enabled`, attach
  an `install` block to the current snapshot entry (a small `Note(key, data)`
  method on the recorder, called from `_rankedInstallOptions()` and
  `_bestInstallOption()`, recording nothing when the current decision has no
  entry, for example a phase outside `DecisionSnapshots.interesting`): each generated preference's card, destination,
  generating group and `reason`, affordability, the chosen option, the
  destination's `_protectionScore()` and `_evaluateServerSecurity()` result.
  `Text()` prints it as `//` comment lines so `extract-fixture.js` round-trips
  unchanged.
- **Skipped servers.** Record each server ranked above the chosen protection
  target by `_rankedServersToProtect()` and the exact reason it was skipped:
  illegal destination, layer-policy rejection (`_shouldInstallIceLayer()`),
  install cost, projected rez shortfall, existing unrezzed obligations, or no
  materially useful candidate. This distinguishes "the server is urgent" from
  "the hand has an executable response".
- **Outcome collector.** Add an F4 collector, `installOutcomes`, that follows
  each root commitment from install to its fate: agenda scored or stolen, trap
  fired, asset used or trashed before payoff, upgrade used, or server
  abandoned. From it derive the collectors later I gates use:
  `agendaExposureTurns`, `installToScoreTurns`, `assetNetCredits`,
  `trapTriggers`. Also add `successfulRunsByServer`, `corpInsolventTurns`,
  and, unless R1.1 already added them, `stallTurns` and `unusedCreditsAtEnd`
  (definitions in the R1.1 spec).
- **Baseline report.** Run F4 on the committed deck pool (every playable set
  in `documentation/card-sets.md` represented) with all collectors and commit
  the JSON report at the location F4 defines for baselines.
- **Baseline snapshots.** Add representative install fixtures to
  `tests/fixtures/corp-decisions/` (the design note's fixture matrix), then
  record their snapshots with candidate blocks and commit them as the I1
  comparison baseline.

## Safety and information boundary
Recording must not inspect hidden Runner card identities, alter decisions,
consume randomness (`CorpAI._random`) or remain enabled by default. The
outcome collector reads only engine events and public or Corp-known state.

## Test scenarios
1. Recording on and off gives the same selected option and the same
   `CorpAI._random` call count for every install fixture.
2. A fixture where the top-ranked server is skipped records it with its exact
   feasibility reason, distinguishing urgency from the absence of an
   executable response (for example the R&D layer blocked by an existing
   unrezzed ICE in `corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`).
3. A snapshot with an `install` block still round-trips through
   `tests/extract-fixture.js` into a fixture that replays the same choice.
4. In a scripted headless sequence where one AI-installed agenda is stolen two
   Runner turns after install and another is scored the turn after install,
   `installOutcomes` records `stolen` and `scored` with their install and
   resolution turns, and `agendaExposureTurns` and `installToScoreTurns`
   equal the scripted values.

## Acceptance gate
Both baselines are committed: the F4 baseline report (F4 core metrics `winRate`,
`pointsScored`, `pointsStolen`, `pointsStolenByServer`, `gameLength`,
`decisionLatencyMs`, `mulliganRate`, plus every collector listed under Design)
and the install-fixture decision snapshots. Re-running F4 with the same seeds
reproduces the committed report's per-game outcomes exactly.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The F4 baseline report and baseline snapshots are committed, and their paths are recorded in the Resolution and in the design note.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
