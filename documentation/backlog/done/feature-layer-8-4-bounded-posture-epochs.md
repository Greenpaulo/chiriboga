# L8.4 Bounded posture epochs
**Outcome:** adopted — revised F4 gate passed; posture epochs enabled by default.

**Roadmap item:** L8.4 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 3c25455 (2026-10-09)

## Gate prerequisite update

The [Grip-size agenda-bluff fix](../../bugs/code-review/agenda-bluff-probability-tracks-runner-grip-size.md)
is now included from main. PR #43 conflict resolution preserves its probability
in both lifetime and epoch modes, with the green reproduction covering both.
A full 1,400-paired-game F4 run has now been reported (see below). The
absolute correlation ceiling is replaced by a baseline-relative no-regression
requirement on the measured batch value. The reported run passes that revised
requirement.

## Resolution

Implemented from `23d6052` (plan commit; code base `3c25455`), following the
approved plan.

**Gate:** passed — `postureEpochs` now defaults to on. The full-run evidence
below passes the user-approved measured-value correlation criterion and all
reported performance guards and hard checks. Code review passed, as confirmed
by the user on 2026-10-12. Default activation changes only
`CorpAI.DEFAULT_OPTIONS.postureEpochs`; explicit `false` preserves the legacy
path.


**Gate command:** `node scripts/ai-batch.js gate --corp-option postureEpochs=true --collector postureDecisionsPerEpoch --collector postureLockedPastHorizon --collector bluffSingleVariableCorrelation --guard winRate=0.02 --guard pointsStolen=0.2 --guard pointsScored=0.2 --max postureDecisionsPerEpoch.violations=0 --max postureLockedPastHorizon.count=0`

The gate command above records the pre-activation setup (default off). After
activation, rerunning `--corp-option postureEpochs=true` compares two enabled
arms; use the recorded pre-activation reports for this acceptance evidence.

- **AI (`ai_corp.js`):** option `postureEpochs` (default `true` after gate acceptance) in
  `CorpAI.DEFAULT_OPTIONS`. On: `_shouldBaitServer()` and
  `_shouldBluffAgendaServer()` keep their safety guards first, then call
  `_epochPosture()` (records `{epochId, selectedScript, commitmentHorizon,
  reevaluationReasons, …}`), with boundaries from `_postureBoundary()` /
  `_postureReevaluationReasons()`: `horizonExpired` (2 or 3 Corp turns, drawn
  at roll time), `challenged`, `runnerPressure` (credit band of 5, breaker
  count), `stakes` (root advancement), `matchPoint` (either side at
  `AgendaPointsToWin() - 2`). Boundaries are checked once per Corp turn, at the
  first posture query; Runner-turn queries reuse. `_postureEpoch` advances in
  `_prepareProtectionPrioritiesForCorpTurn()` after the F3 cache wrapper.
  Off: lifetime caches unchanged. `_remoteDeceptionProfile()` stays lifetime
  (disagreement 3). Telemetry `_postureTelemetryEvent()` is a harness-only sink.
- **Engine (`mechanics.js`):** `MakeRun()` calls
  `corp.AI._notePostureChallenge(server)` (guarded). Deviation from the plan,
  which named `phase.js`: run initiation lives in `MakeRun()`.
- **Harness:** `posture` events (`scripts/ai-batch/headless.js`); collectors
  `postureDecisionsPerEpoch`, `postureLockedPastHorizon`,
  `bluffSingleVariableCorrelation`; batch-level metrics
  (`samples`/`finishBatch`, `metricsLib.batchMetrics`, report `batchMetrics`)
  and `--ceiling` (`scripts/ai-batch.js`).
- **Tests:** scenarios 1–4 and 6–8, plus the two match-point regressions with
  the option on, in `tests/corp-server-security.test.js` (deviation: added to
  that file rather than a new one, to reuse its harness); scenario 5 and the
  collector and `--ceiling` tests in `tests/ai-batch.test.js` (5c–5e).
- **Docs:** `documentation/ai.md` §5.10 (no new card-facing hook),
  [architecture: baits, bluffs and deterrence](../../corp-ai/architecture.md#baits-bluffs-and-deterrence),
  `documentation/corp-ai/principles.md` §3, `documentation/ai-batch-harness.md`
  and `documentation/ai-planning.md` (ceiling rows).

**Gate-ready smoke run (indicative only, `--quick --jobs 3`, 2026-10-09):**
first line `350 paired games, 87 changed by the options [quick: indicative
only, cannot pass a gate]`. Guards and both hard checks passed;
`bluffSingleVariableCorrelation.max` was baseline 0.314 [0.197, 0.498],
candidate 0.197 [0.165, 0.342], so the ceiling failed.

**Historical finding: the 0.10 ceiling may be out of reach for L8.4.** In both arms the
largest pair is `isAgenda` × the server's ICE count (baseline ρ 0.314 over 118
postured decisions, candidate 0.197 over 243). Among postured servers, agendas
sit behind more ICE than traps. That comes from install and protection policy
(the profile depth and scoring-remote choice), not from epoch timing. The
Grip-size bug fix will not remove it. If the full gate fails only on this row,
the remaining tell needs investigation across deception profiles, ICE allocation
(I2) and remote roles (I3). L8.4 does not own all of these policies. The original
threshold was set before results; the explicitly approved revision below
replaces it for L8.4 only.


## Acceptance-gate revision (2026-10-12)

User-approved change: L8.4 requires **no worse than baseline** on
`bluffSingleVariableCorrelation.max`, rather than an absolute 0.10 (or 0.30)
ceiling. This is a deliberate relaxation of the original acceptance gate.
Epoch timing owns bounded commitment and reevaluation, not the entire policy
that allocates ICE or selects remote roles. A reduction is welcome but is not
required by the revised no-regression criterion.

Compare the measured batch values: **candidate must be less than or equal to
baseline**. Keep each arm's 95% interval for context; a paired difference
interval is not an additional acceptance requirement. This does not claim
statistically established non-inferiority. The harness currently implements
batch ceilings, not a baseline-relative batch guard, so evaluate this row
manually from the reports alongside the automated checks below.

Decision counts, agenda/trap proportions and initial-roll versus reevaluation
breakdowns are useful diagnostics, not additional blockers for this agreed
gate. The metric describes the strongest recorded single-variable correlation;
it does not establish overall bluff guessability.

**Full run reported by the user:** 1,400 paired games, zero failed games in
either arm, 320 games changed. Baseline cache
`.ai-batch-cache/baseline-70deaf97ac5f303b.json`; candidate cache
`.ai-batch-cache/candidate-d952cbd7685a1595.json`.

| Metric | Baseline | Candidate | Reported comparison |
|---|---|---|---|
| `bluffSingleVariableCorrelation.max` | 0.329 [0.253, 0.413] | 0.229 [0.163, 0.307] | PASS: measured candidate 0.229 ≤ baseline 0.329 |
| `winRate` | 0.371 | 0.382 | +0.011 [−0.001, +0.024]; guard passed |
| `pointsStolen` | 5.886 | 5.835 | −0.051 [−0.102, +0.001]; guard passed |
| `pointsScored` | 3.908 | 3.949 | +0.041 [−0.016, +0.095]; guard passed |
| `postureDecisionsPerEpoch.violations` | 0 | 0 | Hard check passed |
| `postureLockedPastHorizon.count` | 0 | 0 | Hard check passed |

The reported command used `--ceiling bluffSingleVariableCorrelation.max=0.30`
and failed only that ceiling. Under the user-approved revised criterion,
the correlation row passes, as do all reported automated guards and hard checks.

Absolute deception limits belong to combined-policy acceptance in I9, with I2
and I3 responsible for measuring their effects on public tells. I9 currently
specifies 0.20 with documented-input exceptions, while L8.2/L8.5 retain 0.10;
reconciling those standards remains separate work. This revision changes only
L8.4 and does not silently adopt I9's looser threshold or exempt the ICE-count
tell. No additional correlation check is required before default activation;
the usual implementation review and final regression checks still apply.

## Implementation plan

Proposed at `3c25455`, 2026-10-09. **Approved.** 

- **Validation:** Current behaviour re-grounded at `3c25455`: confirmed
  unchanged. The three `WeakMap`s are created in the `CorpAI` constructor and
  never cleared; `_shouldBaitServer()` and `_shouldBluffAgendaServer()` run
  `_runnerMayWinIfServerBreached()` (and the agenda's own winning-score check)
  before reading the cache; `_remoteDeceptionProfile()` has no guard. Posture
  consumers: `_deceptionPostureActive()` → `_deceptionProtectionTarget()` →
  `_NoMoreProtectionForThisServer()`, and `_deceptionAdvancementTarget()`
  (advancement limit in `Phase_Main`); `_deceptionInstallDistance()` reads only
  the profile. Classification: strategic preference (when to reconsider a
  bluff is not fixed by the rules), so F4-gated; scenarios 1, 2, 4, 5, 7, 8 and
  the horizon part of 6 are deterministic invariants of the option and are
  tested as such. Disagreements:
  1. **`bluffSingleVariableCorrelation` cannot be measured by F4 today.** The
     collector extension point (`scripts/ai-batch/metrics.js`) produces
     per-game numbers, aggregates means and bootstraps paired
     candidate−baseline differences; `--max` is a per-game hard check. A
     Spearman correlation pooled over every decision in the batch, with an
     absolute ceiling on the candidate's interval upper bound, needs a new
     batch-level collector hook (`finishBatch(gameValues)`, bootstrap by
     resampling games) and a gate flag (proposed `--ceiling <metric>=<n>`).
     This is shared F4 work (L8.2 and L8.5 need it too); the plan adds it here
     as its first consumer.
  2. **The Grip-size bug is an unrecorded gate dependency.** The ticket says to
     fix [agenda-bluff-probability-tracks-runner-grip-size](../../bugs/code-review/agenda-bluff-probability-tracks-runner-grip-size.md)
     before measuring, but it is still open in `bugs/` with no reproduction,
     and L8.4 lists only F4. With epochs every reevaluation re-draws that
     Grip-dependent probability, so the correlation ceiling would measure the
     bug, not this item. Proposal: implement and test L8.4 now, run the gate
     only after that bug is fixed, and record it as an `## Additional blocker`
     at hand-off if it is still open.
  3. **`_remoteDeceptionProfile()` stays lifetime.** It picks a shape (ICE
     depth, opening advances, delay), not whether a card is postured, and
     install ranking calls it for cards still in HQ. Re-rolling depth after ICE
     was placed for it, or delay after `AITurnsInstalled` passed it, only moves
     the target. The Goal ("locked to the posture") is met by bounding the
     bait and bluff decisions. Scenario 8 still covers it.

  The old gate was not in "Writing a gate" form; it is rewritten below with
  its metrics and thresholds unchanged, plus one added standard guard,
  `pointsScored` (0.2), because a bluff posture changes agenda advancement
  cadence. The second hard check ("an expired commitment is reevaluated at the
  next decision that requires a posture") is the same condition as
  `postureLockedPastHorizon` and is merged into it.
- **Approach:** add `postureEpochs: false` to `CorpAI.DEFAULT_OPTIONS`. Off:
  today's code paths, untouched. On: `_shouldBaitServer()` and
  `_shouldBluffAgendaServer()` keep their guards first, then call one shared
  helper (working name `_epochPosture(kind, server, card, probability)`) that
  keeps a per-server record `{card, epochId, selectedScript,
  commitmentHorizon, reevaluationReasons, probability, roll, boundary}` in a
  new `WeakMap`.
  - **Epoch id:** a Corp-turn counter incremented in
    `_prepareProtectionPrioritiesForCorpTurn()` (already called by `phase.js`
    at each Corp turn start). The first roll happens at the first posture query
    after install.
  - **Commitment horizon:** expiry = roll turn + 2 or 3 Corp turns, drawn from
    `_random()` at roll time (a fixed cadence would itself be learnable).
  - **Reevaluation reasons:** `horizonExpired`; `challenged` (a run on the
    server since the roll, recorded by a new `_notePostureChallenge(server)`
    called from `phase.js` at run initiation, beside the existing
    `_recordSuccessfulRunForProtection` hook); `runnerPressure` (Runner credit
    band `floor(credits / 5)` or installed-breaker count changed since the
    roll); `stakes` (root advancement differs from what the posture's own
    cadence placed); `matchPoint` (either side is now one score or steal from
    winning, using `AgendaPointsToWin()`).
  - **At most one reevaluation per Corp turn:** a record is reconsidered only
    at the first posture query of a Corp turn whose epoch id is newer than the
    record's and for which a reason holds. Within an epoch, and on the
    Runner's turn, the stored result is reused with no `_random()` call. A
    reevaluation re-rolls at the current probability, so it may retain the old
    script. Grip size, HQ size, Corp credits and cache clears are not reasons
    (scenarios 4 and 7).
  - **Telemetry:** a harness-only `__posture` hook (no-op when absent, like
    `__rez`) receives `{kind, epochId, reason, postured, isAgenda, profile,
    publicVars}` for each roll, reuse and guard stop.
  - **Rejected:** clearing the old caches every Corp turn (rerolls each turn,
    so the posture flickers and correlation exposure multiplies); tying epochs
    to F3's `_withSecurityCache()` lifetime (scenario 7 forbids it; F3's cache
    is per decision, epochs are per Corp turn).
- **Tests:** new `tests/corp-posture-epochs.test.js` on the
  `corp-server-security` harness with an injected counting `_random`, one test
  per scenario 1–8, each asserting the logged `reevaluationReasons` and the
  choice. Scenario 5 plays two seeded headless games
  (`scripts/ai-batch/headless.js`) and compares the `__posture` sequence. The
  two match-point regression tests in `tests/corp-server-security.test.js` run
  a second time with the option on. Unit tests for the three collectors and the
  batch-metric/`--ceiling` extension in `tests/ai-batch.test.js`.
- **Risk:** with the option off, every snapshot and corp-decision fixture must
  stay unchanged (full suite). With it on, the posture feeds
  `_NoMoreProtectionForThisServer()` (protection allocation, L3.5.1) and the
  advancement limit, so a flip can change ICE placement and advancement on
  postured servers; the gate guards `winRate`, `pointsStolen` and
  `pointsScored`. The `phase.js` hook is one guarded call. The harness change
  must keep existing reports comparable (new hook optional, existing
  collectors unchanged).
- **Docs:** `documentation/ai.md`: no new card-facing hook (recorded
  explicitly). `documentation/corp-ai/architecture.md` "Baits, bluffs and
  deterrence" and `documentation/corp-ai/principles.md` §3 ("Persistent
  postures cache their roll with the card or server") describe epochs.
  `documentation/ai-batch-harness.md` documents `finishBatch` and `--ceiling`.
  Roadmap L8.4 set to `in-progress`.

## Goal
Preserve one stable bait or bluff decision during an AI planning window without permanently committing an installed card to a stale posture. Today a trap or agenda stays locked to the posture it rolled on install for the rest of the game.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../../corp-ai/architecture.md#baits-bluffs-and-deterrence). Verified details: three lifetime caches, all `WeakMap`s created in the `CorpAI` constructor and never cleared during a game:

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
F4 gate. Option `postureEpochs` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals.
Collectors: `postureDecisionsPerEpoch` (adds `postureDecisionsPerEpoch.violations`: posture rolls beyond one per eligible card per epoch), `postureLockedPastHorizon` (adds `postureLockedPastHorizon.count`: posture reuses at a Corp decision after the commitment horizon expired without a reevaluation), `bluffSingleVariableCorrelation` (adds the batch metric `bluffSingleVariableCorrelation.max`, defined under Things to consider; needs the batch-level extension in the plan).
Starts: none (if the `--quick` run shows no changed game, add boards from real logs with an installed trap or advanceable agenda).

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Guard | `bluffSingleVariableCorrelation.max` | lower | measured candidate batch value ≤ measured baseline batch value |
| Guard | `winRate` | higher | regression at most 0.02 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Hard check | `postureDecisionsPerEpoch.violations` | — | at most 0 in every candidate game |
| Hard check | `postureLockedPastHorizon.count` | — | at most 0 in every candidate game |

No Improve row: the item must bound posture lifetime without regressions, including no worsening of the recorded single-variable correlation. The absolute end-state deception target is outside this item’s gate.

Gate command (compare recorded batch values manually for the correlation row): `node scripts/ai-batch.js gate --corp-option postureEpochs=true
--collector postureDecisionsPerEpoch --collector postureLockedPastHorizon
--collector bluffSingleVariableCorrelation
--guard winRate=0.02
--guard pointsStolen=0.2 --guard pointsScored=0.2
--max postureDecisionsPerEpoch.violations=0 --max postureLockedPastHorizon.count=0`

## Things to consider
- The F3 ticket notes that its per-decision evaluation cache pairs with posture epochs. Both define decision lifetimes, so decide explicitly how they interact rather than letting a cache clear trigger a posture reroll (scenario 7).
- **`bluffSingleVariableCorrelation`** (shared by L8.2, L8.4 and L8.5;
  whichever lands first adds it). For every bait or agenda-bluff decision that
  reached a random posture roll, including each epoch reevaluation, record
  `postured` 0/1 and, for postured decisions, `isAgenda` 0/1. Record profile
  rolls separately as `profileRolled` plus the selected ICE depth, advancement
  and delay; `_remoteDeceptionProfile()` chooses a shape, not whether a card is
  postured, and install ranking may call it before installation. Each record
  includes the public variables at decision time: turn number, Corp credits,
  Runner credits, Runner Grip size, HQ size, the server's root card count and
  ICE count, the deepest central's ICE count, and both players' agenda points.
  The metric is the largest absolute Spearman correlation over each applicable
  outcome/variable pair in the batch, with a bootstrap 95% CI. Decisions
  stopped by a safety guard are excluded, because guards may depend on state.
- At design time, the agenda-bluff probability failed this rule for Grip size: [`documentation/bugs/code-review/agenda-bluff-probability-tracks-runner-grip-size.md`](../../bugs/code-review/agenda-bluff-probability-tracks-runner-grip-size.md). The fix is now included in both modes; generate a fresh baseline before measuring.

## Acceptance criteria
- [x] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [x] The behaviour change was evaluated behind a default-off AI option; the accepted option now defaults to on (named in the Resolution).
- [x] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [x] Collector `postureDecisionsPerEpoch` is built and tested.
- [x] Collector `postureLockedPastHorizon` is built and tested.
- [x] Collector `bluffSingleVariableCorrelation` is built and tested with batch-level samples and absolute-ceiling support.
- [x] Evaluate the revised measured-value no-regression check for `bluffSingleVariableCorrelation.max`: candidate 0.229 ≤ baseline 0.329; PASS on the reported full run.
- [x] The gate setup is ready: a `--quick` run of the gate command reports at least one game changed by the option.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes: 80 test files, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`, with `postureEpochs` enabled by default (2026-10-12).
