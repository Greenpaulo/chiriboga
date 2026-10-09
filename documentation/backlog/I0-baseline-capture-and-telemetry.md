# I0 Baseline capture and telemetry

**Roadmap item:** I0 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 3c25455 (2026-10-09)

## Implementation plan

Proposed at `3c25455`, 2026-10-09. **Awaiting approval.**

- **Validation:** Re-grounded at 3c25455 (see the dated notes in Current
  behaviour and Design). The ticket holds up with four corrections: (1) servers
  are skipped only for being valueless, secure, already protected this turn,
  rejected by the layer policy or outranked (Archives redirect); cost and rez
  shortfall show up as empty candidate lists on the chosen server, so they are
  recorded as candidate counts, not skip reasons; (2) F4 always runs with
  telemetry on, so recording must reuse the security/scores
  `_rankedServersToProtect()` already computed (an extra `_evaluateServerSecurity()`
  call would move `evaluatorCallCount` in every batch) and must skip
  `_withHypothetical()` probes; (3) the harness has no install, trash,
  ability-use or credit-source events, so collectors need observation-only
  hooks in `headless.js`; (4) `corpInsolventTurns` is undefined anywhere and
  consuming specs disagree on metric paths. Classification: observation-only,
  ungated (invariant oracle in Acceptance gate).
- **Approach:**
  1. `utility.js` `DecisionSnapshots`: add a per-decision notes frame
     (`BeginNotes()`/`EndNotes()`, `Recording()`, `Note(key, data)`).
     `CorpAI.Choice()` opens a frame when a snapshot entry exists or telemetry
     is on and restores the previous frame in `finally` (nested decisions keep
     their own notes). `After()` stores the notes on the entry and `Text()`
     prints each as a `// INSTALL: <json>` line, so `extract-fixture.js`
     round-trips unchanged; `Record()` adds them to the streamed entry.
  2. `ai_corp.js`: `_shouldInstallIceLayer()` delegates to a new
     `_iceLayerPolicy()` returning `{allowed, reason}` (identical logic; the
     boolean API stays for its tests). `_serverToProtect()` accepts either a
     boolean or that object from its action filter and, only while
     `DecisionSnapshots.Recording()` and outside hypotheticals, notes the ranked
     entries with their skip reasons from values it already computed.
     `_rankedInstallOptions()` notes each preference (card, destination,
     group derived from its existing `reason`, printed install/rez cost and
     credit check), the protection traces and the chosen target's candidate
     counts; `_bestInstallOption()` notes the chosen index and preferences
     with no legal engine option. No option object is mutated and no extra
     evaluator or `_random` call is made.
  3. `scripts/ai-batch/headless.js` (observe mode only, all wrappers call the
     original unchanged and ignore hypotheticals): a root-card tracker in
     `observe()` emits `install`/`leave` events keyed by card identity (fate:
     corp score area, runner score area, trashed on access, trashed, returned);
     wrappers on `Trash`, `TriggerAbility` and `GainCredits` (source card)
     record use and credits; `rez` gains a card id; new `turnStart` event with
     Corp-known state (credits, HQ card types and costs, installed unrezzed ICE
     rez costs); `gameEnd` gains Corp credits.
  4. Collectors under `scripts/ai-batch/collectors/`:
     `installOutcomes` (`.installToScoreTurns`, `.agendaExposureTurns` — per-game
     means, 0 with no observation, alongside counts so empties are visible —
     `.assetNetCredits`, `.trapTriggers`, `.abandoned`, plus fate counts);
     `successfulRunsByServer` (`.hq`/`.rd`/`.archives`/`.remote`);
     `corpInsolventTurns` (number: Corp turns beginning with 0 credits, or
     below the cheapest printed rez cost of its installed unrezzed ICE);
     `stallTurns` (number, R1.1 definition: every main-phase action chose the
     basic credit action although HQ held a root/ICE card or an operation whose
     printed play cost was affordable; play restrictions are not modelled);
     `unusedCreditsAtEnd` (number). Bare numbers export as the collector name,
     matching the design guard table, R1.1 and I7.1; I2/I4/I7.2 `.mean` paths
     and I5/I9/L8.2 unprefixed `assetNetCredits`/`trapTriggers` are updated to
     the real paths.
  5. Baselines: on a clean commit, `node scripts/ai-batch.js --jobs 4
     --collector` (all five) `--out tests/fixtures/ai-batch/baselines/<pool>-<codeHash>.json`
     (1,400 games); reproducibility re-run of a paired subset; and a paired
     subset run before and after instrumentation comparing `logHash` and
     `decisionHash`. Install snapshots: a new mode
     `node tests/corp-decision-fixtures.test.js --install-snapshots [--write]`
     writes/compares `tests/fixtures/corp-install-baseline.json` (chosen
     option, server, card and install notes per install fixture) for I1 to diff.
     Representative new install fixtures, limited to cases whose current choice
     is defensible as correct (so no questionable behaviour is locked into the
     green suite): agenda into a protected remote, economy asset into a
     non-scoring remote, ICE on naked HQ with agendas in hand, and a top-ranked
     server with no affordable ICE; the existing six install fixtures are reused.
  Rejected: a second logger (spec forbids it); tagging option objects with a
  `group` field (they flow into `preferred`; deriving from `reason` is free);
  a green-suite assertion on the snapshot file (it would fail every later AI
  change, including the in-flight L7.1, rather than recording a baseline).
- **Tests:** fixture runner adds a recording-on pass for every green fixture,
  asserting identical choice, reasons and `_random` call count (scenario 1),
  and an `EXPECT_SKIPPED: <server>=<reason>` directive used by the Baker
  fixture (scenario 2); `decision-snapshots.test.js` covers notes framing,
  `Text()` output and extractor round-trip into a replaying fixture
  (scenario 3); new `tests/ai-batch-install-outcomes.test.js` drives the
  tracker on real engine objects through a scripted install/steal/score
  sequence and checks fates, turns and every collector (scenario 4).
- **Risk:** `_serverToProtect()`/`_shouldInstallIceLayer()` feed every
  protection decision; the refactor is behaviour-identical and is checked by
  all fixtures in three cache modes plus `corp-server-security.test.js`, and
  by unchanged `logHash`/`decisionHash` on paired seeds. Recording latency is
  inside the measured `decisionLatencyMs` in batches (both arms equally); the
  baseline report records it. Merge conflicts with the concurrent L7.1 branch
  in `ai_corp.js` are possible but local.
- **Docs:** `documentation/ai-batch-harness.md` (collectors, events,
  baseline), `documentation/corp-ai/architecture.md` (install telemetry),
  install-decisions design note (baseline paths), consuming specs' metric
  paths. No card hooks change, so `documentation/ai.md` is untouched.

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
on the hand-pressure path). `_rankedInstallOptions()` runs several times per
decision, including once inside a `_withHypothetical()` probe on the
hand-pressure path ("Just need a tiny bit more cash").

The ICE protection target inside `_rankedInstallOptions()` is chosen by
`_serverToProtect()` with `_shouldInstallIceLayer()` as its action filter. It
walks `_rankedServersToProtect()` (which already computes each server's
`_evaluateServerSecurity()` result and `_protectionScore()`) and passes over a
server only because it is valueless (`_nothingWorthProtecting()`), already
secure while an insecure server is eligible, already protected this turn
(`_protectionInstallsThisTurn`), rejected by the layer policy, or (Archives
only) outranked by a naturally insecure eligible server. Install cost and rez
shortfall never skip a server today: `_iceInstallOptions()` returns the chosen
server's affordable ICE and, unless `priorityOnly`, its unaffordable ICE, and
never falls back to a lower-ranked server. *(Corrected 2026-10-09: the earlier
text listed cost, rez shortfall and "no useful candidate" as skip reasons.)*

The five 2026-10-05 recovery policies (`secureScoringServerGate`,
`serverAtRiskInstallOverride`, `committedAgendaReserveBypass`,
`emptyArchivesRunPressure`, `valuelessServerDebtReset`) are keys of
`CorpAI.DEFAULT_OPTIONS`, all `false`. F4 reports already record every
effective Corp and Runner option, the commit, `codeHash` and `poolHash`. The
committed `tests/fixtures/ai-batch/baselines/core-v1-a0ab675e420ce8b0.json`
(sha b693753, dirty tree, no collectors) predates those options, so it is not
a matching control for I-layer work.

Observation pieces already exist:

- `DecisionSnapshots` (`utility.js`, opt-in via `enabled`) records, per
  interesting Corp decision, the phase, offered options, chosen option and a
  `ReproductionCode()` dump, plus recorder cost; `CorpAI.Choice()` calls
  `Before`/`After`. Its F4 telemetry mode (`DecisionSnapshots.telemetry`)
  streams every Corp and Runner `Choice()` through `Record()` after
  `_choiceInner()` returns. `tests/decision-snapshots.test.js` checks both and
  the round-trip through `tests/extract-fixture.js`.
- `tests/corp-decision-fixtures.test.js` replays board fixtures from
  `tests/fixtures/corp-decisions/` with `EXPECT`, `EXPECT_SERVER` and
  `EXPECT_CARD` directives, in all three F3 cache modes.
- `tests/corp-install-destination.test.js` checks destination legality through
  `ChoicesCardInstall()` (which applies `CheckInstallDestination()`).
- The F4 headless runner (`scripts/ai-batch/headless.js`) emits `gameStart`,
  `turnEnd`, `run`, `score`, `steal`, `rez`, `mulligan`, `decision` and
  `gameEnd` events. Nothing reports Corp installs, root-card trashes, card
  ability use or credits gained from a card.

Nothing records the candidates considered, the servers skipped and why, or the
fate of a root commitment. No collector named below exists yet; R1.1 (which
would also add `stallTurns` and `unusedCreditsAtEnd`) is still `proposed`, and
no document defines `corpInsolventTurns`.
See [architecture.md: install planning today](../corp-ai/architecture.md#install-planning-today).

## Design
No new telemetry system. Extend the existing pieces:

Capture the [corrected regression default](../corp-ai/specs/install-decisions-design.md#corrected-regression-baseline-and-ownership),
with all five legacy regression gates off, and record their effective settings
alongside the build/pool hashes. The old unconditional policies are not the
baseline for future I-layer work. Observation-only additions must preserve
that corrected policy's outcomes. Later layers compare matching controls with
their prerequisite options identical, back-filling collectors as required.

- **Candidate record in snapshots.** When `DecisionSnapshots.enabled`, attach
  an `install` block to the current snapshot entry (a small `Note(key, data)`
  method on the recorder, called from `_rankedInstallOptions()` and
  `_bestInstallOption()`, recording nothing when the current decision has no
  entry, for example a phase outside `DecisionSnapshots.interesting`): each generated preference's card, destination,
  generating group and `reason`, affordability, the chosen option, the
  destination's `_protectionScore()` and `_evaluateServerSecurity()` result.
  `Text()` prints it as `//` comment lines so `extract-fixture.js` round-trips
  unchanged. In F4 batches the same `Note()` data also attaches to the
  decision's telemetry entry: F4's telemetry mode
  (`DecisionSnapshots.telemetry`, entries streamed by `DecisionSnapshots.Record()`
  after `_choiceInner()` returns) is the single decision-log path, so `Note()`
  buffers its data while telemetry is on and `Record()` adds it to the entry it
  streams. There is no second logger. See
  [architecture: Foundations](../corp-ai/architecture.md#foundations) and
  [ai-batch-harness.md](../ai-batch-harness.md).
- **Skipped servers.** Record each server ranked above the chosen protection
  target by `_rankedServersToProtect()` and the exact reason `_serverToProtect()`
  passed over it, in the current code's terms: valueless, secure, already
  protected this turn, layer-policy rejection (with the `_shouldInstallIceLayer()`
  sub-reason, for example existing unrezzed ICE), or the Archives redirect.
  For the chosen target also record its affordable and unaffordable ICE
  candidate counts, and in `_bestInstallOption()` the preferences passed over
  for lack of a legal engine option. This distinguishes "the server is urgent"
  from "the hand has an executable response". *(Re-grounded 2026-10-09: install
  cost and rez shortfall are recorded as candidate counts on the chosen server,
  not as skip reasons, because the current code never skips a server for them.
  Reuse the security and scores `_rankedServersToProtect()` already computed:
  extra `_evaluateServerSecurity()` calls would move F3's `evaluatorCallCount`
  metrics in every batch, since F4 always runs with telemetry on. Record
  nothing inside a hypothetical probe.)*
- **Outcome collector.** Add an F4 collector, `installOutcomes`, that follows
  each root commitment from install to its fate: agenda scored or stolen, trap
  fired, asset used or trashed before payoff, upgrade used, or server
  abandoned. From it derive the collectors later I gates use:
  `agendaExposureTurns`, `installToScoreTurns`, `assetNetCredits`,
  `trapTriggers`. Also add `successfulRunsByServer`, `corpInsolventTurns`,
  and, unless R1.1 already added them, `stallTurns` and `unusedCreditsAtEnd`
  (definitions in the R1.1 spec). *(Re-grounded 2026-10-09: the harness has no
  install, trash or ability-use events, so this needs observation-only
  additions to `headless.js`; `corpInsolventTurns` has no definition anywhere
  and I0 must define it; later specs disagree on metric paths (`stallTurns`
  versus `stallTurns.mean`, `assetNetCredits` versus
  `installOutcomes.<metric>`), so I0 fixes the exported paths and updates the
  consuming specs' gate commands to match.)*
- **Baseline report.** Run F4 (`node scripts/ai-batch.js`) on the committed
  deck pool, `tests/fixtures/ai-batch/deck-pool.json`, whose trusted sets are
  listed in the pool file, not `card-sets.md`. Use all I0 collectors
  (`--collector <name>` each) and commit the JSON report under
  `tests/fixtures/ai-batch/baselines/`, as F4 defines.
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
N/A — deterministic fix (principle 4): observation-only; invariant oracle that recording on and off gives identical choices, logged reasons and `CorpAI._random` call counts on every fixture, and that the instrumented build reproduces the uninstrumented build's per-game `logHash` and `decisionHash` on the same seeds.

*(Reclassified 2026-10-09: the previous text stated deliverables rather than a
gate form. I0 changes no Corp choice, so it is not a strategic change; its
deliverables, the committed baseline report and snapshots, are acceptance
criteria below.)*

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The F4 baseline report and baseline snapshots are committed, and their paths are recorded in the Resolution and in the design note. The report covers F4's core metrics (`winRate`, `pointsScored`, `pointsStolen`, `pointsStolenByServer`, `gameLength`, `decisionLatencyMs`, `mulliganRate`) plus every collector listed under Design, with all five recovery options recorded as `false`.
- [ ] Re-running F4 with the same seeds reproduces the committed report's per-game outcomes (`logHash`, `decisionHash`) exactly, and the instrumented build matches the uninstrumented build on a paired sample.
- [ ] Each collector (`installOutcomes`, `successfulRunsByServer`, `corpInsolventTurns`, `stallTurns`, `unusedCreditsAtEnd`) is built and tested, and its exported metric paths and directions are documented in `documentation/ai-batch-harness.md` and used consistently by the consuming specs.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
