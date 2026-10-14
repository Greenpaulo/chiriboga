# F12 Realized defense measurement

**Outcome:** adopted — passive measurement implementation; no AI policy/default change.

**Roadmap item:** F12 · **Depends on:** F4, F11, L8.4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/ai-batch-harness.md`, `documentation/ai-planning.md`, [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 2306f82 (2026-10-13)
**Reproduction:** `tests/pending/F12-realized-defense-measurement.test.js` — fails at 2306f82, 2026-10-13 (0/3 passed: collector and dedicated passive tracker absent). Moved to `tests/F12-realized-defense-measurement.test.js`; passes with `node tests/F12-realized-defense-measurement.test.js` (3/3).

## Resolution

Implemented from 2306f82, 2026-10-13.

- Added the harness-only realized-defense tracker and `realizedIceByRootType` collector. Stable root/server IDs and fresh installation IDs cover preexisting roots, departures/reinstalls within a step, revelation, multi-root servers and age censoring. Snapshots run at the first Runner action phase after turn-begin responses, rather than merely when clicks appear. They read cached state and actual non-hypothetical posture events; they never invoke security/profile/posture/safety/punishment evaluators. Expiry, unknown state, observed guard stops and last-query safety are separate labels. Reinstallation invalidates the observer's old query evidence even if policy caches still exist. No game object is mutated by observation.
- All four lower-direction metrics use exact-count class histograms: absolute Spearman rho and total variation for unrevealed all-root and known-active populations. Signed rho, class prevalence, root/commitment/server/game counts, safety/unknown coverage, deck/age/revelation/multi-root breakdowns, lifecycles and first-commitment distributions live in separate diagnostics. Coverage rules were frozen before collecting real data: ten distinct commitments and five contributing games per class/population, plus 90% known posture labels for postured metrics. They are readiness checks, not adoption tolerances.
- Extended the trusted collector contract with optional `forMetrics(names)` views so valid TV does not fail merely because rho is undefined, and all-root metrics do not depend on postured coverage. Each paired metric uses the same seeded game-index draws. F12 opts into `strictBatchDiagnostics`: original cohorts and every draw validate per metric, invalid draws are counted, and invalid intervals have null bounds instead of zero-filled values. Legacy F11 correlation diagnostics retain their original semantics. Observer mode is explicit in report/cache provenance; source hashes include the new tracker and imported statistical helpers. Tracker and collector failures invalidate observations without changing gameplay.
- Added `scripts/ai-batch/defense-evidence.js` to orchestrate ordinary batch workers, check complete observer off/on identity, and separately calibrate each metric through F11's independent deck-pair-stratified API. It does not relax adoption matching or return an adoption verdict. No policy gate, consumer threshold, card AI hook or option default changed. The owner explicitly authorized this implementation stacked on F11 while review remains unfinished; F11's formal dependency and generated blocker are retained, and review changes to F11 may require revalidation.
- The three pending assertions passed unchanged and moved to the green suite; only relative imports changed for the move. The reproduction was newly created during this uncommitted task and therefore has no original pending version in Git history at the starting commit. The workflow checker cannot perform its historical comparison without a commit, which this skill prohibits. The initial 0/3 failure and unchanged assertions are recorded here; this provenance limitation is not a test failure. `tests/realized-defense.test.js` adds 18 independently checked scenarios, including actual posture decisions, settled engine boundary timing, hidden-Runner substitutions, repeated exposure versus commitment distributions, per-metric undefined-statistic handling, invalid draws and both CLI comparison paths. Actual observer off/on/injected-failure/throwing-sink runs preserve winner, turns, gameplay logs, decisions, all three RNG draw counts and engine-context Map/WeakMap write counts.
- Focused tests: reproduction 3/3, realized defense 18/18, F11 reproduction 3/3, pooled/calibration tests, measured-no-worse checks, batch integration 29 scenarios and roadmap consistency passed. `node tests/run-all-tests.js`: all 92 files passed, including `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
- Updated the [harness guide](../../ai-batch-harness.md#realized-defense-measurement-f12), [architecture: Foundations](../../corp-ai/architecture.md#foundations), I2/L8.2/L8.9 shared-definition references and roadmap status column. F12 owns observations/calibration; consumers retain their own gates.

**Measurement evidence:** observer identity passed; all-root calibration is valid,
and postured calibration is insufficient under the frozen coverage rule.
Durable commands, full histograms/coverage/lifecycles, options, seeds, report paths
and SHA-256 checksums are in [F12 control calibration](../../corp-ai/measurements/F12-2306f82-control-calibration.json).

Corrected-source provenance: starting SHA `2306f82`, dirty working tree, runtime
code hash `44f57510eaa411dc`, pool hash `0ee4865c35412106`. The committed `core-v1`
pool contains `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`,
`zwicky-magdalene`, `leo-topan`. Effective Corp options: `postureEpochs=true`,
`matchLocalPostureFeedback=false`, and all five regression options false;
Runner options are empty. No controls with feedback adopted/on are claimed.

Commands (three independent cohorts, two workers each):

```sh
node scripts/ai-batch.js --pool tests/fixtures/ai-batch/deck-pool.json --seeds 1-200 --collector realizedIceByRootType --defense-observer off --jobs 2 --out .ai-batch-cache/f12-2306f82-validated/off-1-200.json
node scripts/ai-batch.js --pool tests/fixtures/ai-batch/deck-pool.json --seeds 1-200 --collector realizedIceByRootType --defense-observer on --jobs 2 --out .ai-batch-cache/f12-2306f82-validated/on-1-200.json
node scripts/ai-batch.js --pool tests/fixtures/ai-batch/deck-pool.json --seeds 201-400 --collector realizedIceByRootType --defense-observer on --jobs 2 --out .ai-batch-cache/f12-2306f82-validated/on-201-400.json
node scripts/ai-batch/defense-evidence.js --reuse --out .ai-batch-cache/f12-2306f82-validated
```

**Observation identity:** 1,400/1,400 complete successful pairs, zero mismatches
in winner/turns/logHash/decisionHash and zero failures in either arm. Separate
instrumented tests also verify all three RNG streams and engine-context
Map/WeakMap writes, including injected observer failures and throwing sinks.
On/on same-seed all-root rho and TV differences and all 95% bounds are exactly
zero; postured statistics refuse the cohort rather than claiming identity with
invalid coverage. No changed-game requirement is bypassed for policy adoption.

**Control calibration:** 1,400 requested games per cohort; first has 1,400
successful, second 1,399. Two hundred deterministic game-clustered resamples;
independent differences resample within each deck-pair stratum and retain its
successful count (BTL/Kit 199 versus 200). Values below are rounded only for
presentation; checks use full-precision values in the evidence artifact.

| Metric | Seeds 1–200 value [95% interval] | Seeds 201–400 value [95% interval] | Independent B−A [95% interval] |
|---|---|---|---|
| allCountCorrelation | 0.224065 [0.176015, 0.262108] | 0.256823 [0.217246, 0.298030] | 0.032757 [−0.021508, 0.090688] |
| allCountDistance | 0.207788 [0.178066, 0.238611] | 0.232917 [0.205372, 0.265443] | 0.025129 [−0.010238, 0.068822] |
| posturedCountCorrelation | 0.179482 diagnostic; insufficient | 0.229106 diagnostic; insufficient | Not run: original coverage fails |
| posturedCountDistance | 0.219073 diagnostic; insufficient | 0.219558 diagnostic; insufficient | Not run: original coverage fails |

First/second headline populations: 9,656/9,618 observations; agenda 6,705/6,602
and trap 2,951/3,016. Agenda commitments 4,037/4,094 across 1,269/1,277 games;
trap commitments 742/715 across 499/471 games. Active-subset agenda commitments
353/387 across 301/341 games and trap commitments 330/307 across 270/253 games
exceed the frozen class/game minima. However, known posture coverage is only
85.7705%/85.3816% (1,374/1,406 unknown rows), below 90%; both postured metrics
are therefore unavailable for adoption checks. Unknown safety counts are
6,938/6,981, retained in headline observations and diagnostic breakdowns.
All-root intervals have zero invalid draws; postured original cohorts fail
before resampling, so their zero invalid-draw count does not mean 200 usable
draws. Independent CI widths are 0.112197 rho and 0.079059 TV. No consumer
regression margin is chosen from these widths.

First-commitment TV is 0.405375/0.446107, versus exposure TV
0.207788/0.232917; commitment class prevalence is about 84.47%/85.13% agendas.
These differences expose survival/composition effects, not causal ICE allocation.
Exact class/bin counts and per-deck/age/revelation/multi-root splits are retained
in the artifact. Plug-in TV is biased upward with finite samples; the control
cohorts establish observed precision/composition limits, not a debiased estimate
or evidence of human exploitation. Coverage rather than sample count currently
blocks postured calibration; no post-hoc threshold or seed change was made.

**Out-of-scope findings:** BTL/Kit seed 257 fails in the second cohort. Both
single-seed observer-off/on probes reproduce the same 17-turn null-command
stall with identical logHash `5ca72f317fb9` and decisionHash
`a2abc578f89b8de85fcfb978daf7de81899affd8`. Their failed-only reports are saved,
then the existing summary formatter throws on absent successful metrics.
Neither failure is repaired here; [F13](../../corp-ai/specs/F13-seeded-stall-diagnostics.md)
records the evidence and proposed diagnostic work. Failed cohort records remain
in raw reports and the independent calibration accounts for the unequal
successful-game stratum; disjoint cohorts are never used as matched adoption data.

**Additional validation correction (2026-10-13):** A real-decision test exposed
cached agenda bluff state surviving addition of a second root even though
`_shouldBluffAgendaServer()` returns false without telemetry. Bait severity can
also reject silently, and successful lifetime reuse emits no event to replace
an older guard. Added passive query-return capture (calls already made by policy,
never new evaluation), event/query ordering, structural eligibility checks and
unknown labels for stale positive scripts. The expanded real-decision and
lifetime tests cover those counterexamples. Observer-disabled and enabled
1–200 cohorts from the first run each completed 1,400 games with zero failures,
but those snapshots use the superseded labeling code and are not calibration
evidence. Stopped the next cohort and restarted all three under the corrected
source hash in `.ai-batch-cache/f12-2306f82-validated`; no seeds, sample sizes,
coverage rules or policy defaults changed.

## Implementation plan

Proposed at `2306f82`, 2026-10-13. **Approved 2026-10-13.**

- **Validation:** Re-grounded current-behaviour claims against the correlation collector, root tracker, Runner-turn snapshot seam, posture cache/guard functions, and F11 pooled comparison/calibration consumers. The premise holds. This is objective measurement work: exact statistical oracles and observation identity, with no AI-choice change or strategic adoption option. On 2026-10-13 the owner authorized work stacked on the available F11 implementation despite its unfinished review; retain its formal dependency and generated blocker until F11 is done. F11 review changes may require revalidation. Existing separate-arm `batchMetrics()` replaces undefined bootstrap values with zero and does not invoke collector validation; F12 needs fail-closed diagnostics there as well as in paired checks. Guard events do not clear cached postures, and epoch expiry is reconsidered only on a later Corp query, so a cached script alone is insufficient to infer effective safety or activity.
- **Approach:** Add a harness-only `createRealizedDefenseTracker` in a dedicated module, exported through `headless.js`, with stable server IDs, fresh installation commitment IDs, start-board left-censoring, and lifecycle observation independent of the existing I0 tracker. Emit dedicated realized-defense snapshots at the settled Runner-click boundary without calling security, posture, profile or safety evaluators. Read existing epoch/lifetime state and reconcile actual guard/roll/reuse events; expose cached script, horizon expiry and observed safety separately, leaving unobserved effective state unknown. Isolate tracker/collector failures from gameplay and retain observation-error markers that invalidate measurements. Add `realizedIceByRootType` with exact count histograms, signed/absolute rank correlation, TV, lifecycle/coverage summaries and first-commitment versus exposure distributions. Keep nested diagnostics separate from the four numeric pooled metric columns. Wire snapshot selection through the batch worker and include new harness sources in report provenance hashes. Extend separate-arm batch diagnostics for collectors declaring validity, retaining legacy behavior for collectors without that contract; invalid cohorts/draws report reasons and invalid-draw counts, never zero-filled intervals. Use F11's existing paired and independent calibration APIs without relaxing matching rules.
- **Coverage and calibration:** Before any real runs, freeze minimum coverage at ten distinct installation commitments and five contributing games per class for each measured population; snapshots within one commitment do not satisfy that minimum. Require at least 90% known effective posture labels among eligible unrevealed roots for postured checks; report safety unknowns separately without dropping safety cases from headline metrics. These are measurement-readiness rules, not consumer regression tolerances. Report TV as defined when both classes exist even when count correlation is undefined; pooled adoption comparisons fail closed when required columns are unusable. Preregister the committed pool, current effective options (including default-off L8.5 feedback), seeds 1–200 for observation identity and the first control cohort, and disjoint seeds 201–400 for the second control cohort. Run 200 games per committed deck pair initially. Record all commands, report provenance, failures, class/bin/game counts, invalid draws and precision limitations. Insufficient coverage remains an explicit result; any expanded sampling or added starts must be documented before running them. Do not select consumer tolerances or claim absence of other tells.
- **Tests:** Preserve and move the three pending assertions unchanged after implementation; add independently specified TV/rho fixtures, missing/constant/thin populations, invalid resamples, paired identity/regression/improvement, independent calibration, and both CLI comparison paths. Exercise installs/removals/reinstalls, multi-root servers, revelation, start roots, survival effects and all cached/unknown/guard/expiry labels. Use throwing evaluators and hidden-Runner property sentinels to verify the information boundary; verify RNG/cache identity and observation-failure isolation. Run focused tests and `node tests/run-all-tests.js`, then record the full paired observer identity and control calibration evidence.
- **Risk:** This touches more than three source files, including shared measurement/reporting consumers, so the skill requires plan approval. Observation exceptions must invalidate reports without changing decisions; report summaries must not flatten diagnostic numbers into unintended gate metrics. Preserve existing collector semantics and policy defaults. Statistical coverage rules may expose insufficient evidence, which is a valid calibration outcome rather than permission to weaken validation.
- **Docs:** Update the harness guide and Foundations architecture, plus shared collector definitions in I2/L8.2/L8.9. Record the stacked dependency authorization here, set F12 in-progress, and keep the roadmap status column synchronized. No card-facing AI hooks change.

## Goal

Measure whether actual ICE count exposes unrevealed agenda-versus-trap roots.
Extract `realizedIceByRootType` from I2 so L8.2 can measure tell reduction before
I2 changes allocation. F11 owns generic paired statistical comparisons; F12
owns passive observations, metric definitions, validity and control-only
calibration. Neither changes policy or adopts a consumer's tolerance.

## Current behaviour

- `bluffSingleVariableCorrelation` consumes posture/profile events, retains
  per-game samples and computes a pooled maximum absolute Spearman correlation.
  It measures ICE count at posture decisions, not every remote's exposure to the
  Runner. Undefined outcome/variable correlations are skipped; an empty or
  entirely constant dataset can currently return zero.
- `headless.js` emits turn events and has a Runner-turn `securitySnapshot`
  seam, deferred until Runner clicks are granted. That snapshot calls the
  security evaluator and does not export per-root realized ICE observations.
- `createRootTracker()` emits installs/leaves, but identifies remotes generically
  and omits roots already installed on start boards. It cannot alone supply
  stable remote/commitment identity or complete exposure coverage.
- Corp posture state is cached in `_postureEpochRecords` and the lifetime bait/
  bluff maps. Calling `_deceptionPostureActive()` can reach a posture roll;
  observation must read existing state without invoking those decision helpers.
- No `realizedIceByRootType` collector exists. I2 currently specifies it;
  ownership is transferred here, preserving its two count-correlation metrics.

## Design

### Passive snapshots and coverage

Add a dedicated harness-only snapshot at the start of each Runner turn, after
Corp actions/responses settle and before the Runner acts. Reuse boundary timing,
not security evaluation. Include every remote root that is an agenda or a trap
identified by `Ambush`/`AIPunishesAccess` declarations, never title lists or
calling punishment hooks. Agenda takes precedence for an overlapping declaration.
Record actual server ICE count, root class, stable server and installation-
commitment IDs, root age when known, revealed/public status, single/multi-root,
cached posture state and safety status. Include start-board roots with left-
censoring labels; reinstalling a card creates a new commitment.

Class/revelation labels are harness-only truth, never decision inputs. Do not
call profile/posture/safety evaluators to fill a missing label. Missing cached
state is `unknown`, not evidence of an inactive posture. Specify how cached
commitment expiry and public guard events determine effective posture/safety
status; reconcile these labels against real decision events in tests. Keep
unknowns visible and fail a postured metric when coverage is inadequate.
Safety cases remain in headline metrics with diagnostic breakdowns.

Export JSON per-game samples through F4's `samples()`/`finishBatch()` contract.
Repeated roots, turns and multi-root observations are clustered within games;
shared server observations are labelled, not counted as independent evidence.
The headline population is unrevealed roots observed at Runner-turn boundaries.
Revealed-root distributions are separate diagnostics.

### Metrics

Declare `lower` for all four pooled metrics:

- `realizedIceByRootType.allCountCorrelation`: absolute Spearman rho of binary
  agenda-versus-trap class against actual ICE count across all unrevealed roots.
- `realizedIceByRootType.posturedCountCorrelation`: the same for roots with a
  known active posture.
- `realizedIceByRootType.allCountDistance`: total-variation distance between
  the agenda and trap ICE-count distributions in the headline population:
  `0.5 * sum_k abs(P(count=k | agenda) - P(count=k | trap))`.
- `realizedIceByRootType.posturedCountDistance`: the same for active postures.

Use exact nonnegative integer counts, without candidate-dependent bins. Zero
TV means identical observed count distributions; one means disjoint support.
TV catches nonmonotonic tells that Spearman can miss. It does not measure ICE
identity/strength, other public signals, human exploitation or causal allocation.
It is class-balanced rather than weighted by agenda/trap prevalence; report
class prevalence separately. Plug-in TV has finite-sample bias, especially with
rare count bins; expose bin counts and assess that bias during calibration.

Report signed rho, per-class histograms, root/commitment/server/game counts,
unknown posture/safety coverage, and breakdowns by deck pair, multi-root status,
root age and revelation. Report first-observation-per-commitment distributions
alongside exposure-weighted snapshots: agenda scoring and persistent traps can
create survival differences without extra ICE allocation. No causal attribution
is claimed here; L8.9 owns that investigation.

Fail closed on missing samples, missing either class, constant ICE columns for
rho, undefined statistics or inadequate coverage. A valid zero TV with both
classes is distinct from an undefined correlation. Specify minimum class/game
coverage and invalid-resample handling before calibration; never silently replace
invalid draws with zero or discard them to narrow intervals. Test and document
F11's collector validity contract and deterministic game-clustered resampling.

### Control-only calibration

After F11 is delivered, record adopted policy/options and revision, preregister
cohort seeds, sample size and coverage rules, then collect 200 games per committed
deck pair initially. Increase that planned size or add representative real-game-
derived starts if class coverage/precision is insufficient. Same-policy/same-seed
reports must give exactly zero paired differences; this tests implementation,
not sampling noise. Also use disjoint control cohorts with F11's independent,
deck-pair-stratified resampling to report precision and TV finite-sample behavior.
Do not pass disjoint cohorts as matching adoption reports.

Deliver values, game-clustered 95% intervals, calibration differences/widths,
class/bin counts, invalid draws and complete commands/report paths. State when
there is insufficient evidence; do not choose a policy regression margin from
noise alone. Consumers freeze their own metric, tolerance, sample size and
required coverage before policy implementation/candidate results. Regenerate
controls after a decision-changing prerequisite lands.

## Safety and information boundary

Observation does not change RNG, caches, hypothetical state, choices, timing of
gameplay callbacks or gameplay/decision hashes. Hidden Runner identities are
never inspected. Observer failures must not affect policy; invalid observation
reports cannot pass measurement checks. Use existing cached values or explicit
unknowns. No new card-facing AI hook is proposed.

## Test scenarios

1. Scripted agenda/trap remotes reconcile exact counts and timing after Corp
   installs, ICE removals and responses; preinstalled roots are included.
2. Shared servers, multiple roots, reveal transitions, root departures and
   reinstalls preserve stable server IDs and correct commitment lifetimes.
3. Independently specified histograms give TV 0 for equality, TV 1 for disjoint
   support and known intermediate values. Equal-median but nonmonotonic class
   distributions demonstrate zero rho with positive TV.
4. Missing classes/data, constant count columns, thin coverage and invalid
   bootstrap draws produce explicit insufficient/invalid results, not success.
5. Synthetic paired pooled resampling recomputes both arms on the same game
   indices; identity is zero, an introduced count tell fails, and a reduction
   passes F11's lower-direction improvement check with repeatable intervals.
6. Snapshot labels reconcile active, neutral, expired, unrolled and safety-
   stopped postures without creating records, caches or random draws.
7. Scored agendas versus persistent traps demonstrate the distinction between
   exposure-weighted and first-commitment distributions; uncertainty resamples
   games, not individual roots or turns.
8. Observer off/on and throwing-observer runs retain identical choices, RNG,
   caches and gameplay/decision hashes; hidden Runner substitutions are inert.
9. Both `gate` and `--compare` consume each metric through F11; calibration
   cohorts remain separate from strict matched-seed adoption validation.

## Acceptance gate

N/A — deterministic fix (principle 4): exact snapshot/statistical oracles and
passive observation identity. No AI policy is adopted. Run observer-disabled/
enabled games on the same revision/options with 200 paired seeds per committed
deck pair; every successful pair matches winner, turns, logHash and decisionHash,
with no new failures or policy RNG/cache changes. Record actual commands after
the observer switch exists. Control-only calibration measures readiness and may
report insufficient precision; it is not an AI adoption gate.

## Acceptance criteria

- [x] All scenarios have focused tests with independently specified expectations.
- [x] Dedicated snapshots include unrevealed/revealed, start-board, multi-root,
      safety and unknown cases without decision helpers or RNG/cache mutation.
- [x] All four metrics, histograms and coverage/lifecycle summaries work with
      F11's validity contract and paired `gate`/`--compare` support.
- [x] Observation identity evidence and control-only calibration are recorded,
      including limits, invalid draws, options, seeds and report provenance.
- [x] I2 consumes this collector; L8.2 and L8.9 share its definitions rather
      than implementing competing collectors. Consumer thresholds remain theirs.
- [x] Document delivered support in `documentation/ai-batch-harness.md` and
      [architecture: Foundations](../../corp-ai/architecture.md#foundations).
- [x] `node tests/run-all-tests.js` passes.
