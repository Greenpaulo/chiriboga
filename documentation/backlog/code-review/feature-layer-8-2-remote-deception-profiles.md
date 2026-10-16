# L8.2 Deception legibility signals

**Outcome:** not adopted — full gate failed 2026-10-15; no demonstrated all-root count-TV improvement, with correlation, active-subset rho, win-rate and shape-overlap failures.

**Roadmap item:** L8.2 · **Depends on:** F4, L8.5, F11, F12 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 2dc504d (2026-10-14)
**Reproduction:** `tests/pending/remote-deception-legibility.test.js` — original failure at 2dc504d (2 passed, 3 failed), preserved unchanged after the rejected experiment. Companion `tests/pending/remote-deception-legibility-details.test.js` also retains its committed assertions unchanged. Both were returned from the green suite after the gate failed; these are the rejected idea's expectations, not correctness requirements for a replacement. The next attribution work is recorded in [L8.9](../../corp-ai/specs/L8.9-observable-defense-parity.md).

## Resolution

Implemented from 2dc504d, 2026-10-15; resumed from the owner's WIP commit
`02ee020` in `/private/tmp/chiriboga-remote-deception-resume`. The approved plan
and frozen gate were unchanged throughout the experiment. No new commit has been made.

**Gate:** failed — `deceptionLegibility` removed. The owner ran the exact frozen full F4 command; output ended `Gate: failed`.

**Full gate, 2026-10-15:** Committed `tests/fixtures/ai-batch/deck-pool.json`,
seven pairs (`gateway`, `btl-kit`, `leo-topan`, `neh-zahya`, `pd-tao`, `pe-steve`,
`zwicky-magdalene`), matching seeds 1–200 (200 games per pair), no starts,
1,400 paired games, 211 changed, zero failed games and zero dropped pairs.
Both arms retained adopted epochs and feedback. Collector intervals use 200
seeded game resamples; all printed intervals are 95%. Baseline completed in
669 seconds; candidate in 668. The owner's printed output is the gate evidence.

| Full check | Baseline | Candidate | Candidate − baseline 95% interval | Result |
|---|---|---|---|---|
| all-root count TV | 0.2091684342 | 0.2039222294 | [-0.01201773263, 0.00178849666] | FAIL Improve: interval includes zero |
| active-subset count TV | 0.2257785155 | 0.2158158796 | [-0.02593002577, 0.01297639698] | PASS guard 0.02 |
| all-root count rho | 0.2292471512 | 0.2248449200 | [-0.01831197079, 0.01064992587] | PASS guard 0.02 |
| active-subset count rho | 0.2076383535 | 0.2162984096 | [-0.03057198855, 0.05076008063] | FAIL guard 0.015 |
| public-variable correlation maximum | 0.2503788563 | 0.7017945525 | [0.3728972806, 0.5123689700] | FAIL guard 0.02 |
| win rate | 0.358 | 0.347 | [-0.020, -0.002] (printed rounding) | FAIL guard 0.02, as reported by harness |
| points stolen | 5.951 | 5.999 | [0.010, 0.085] | PASS guard 0.2 |
| points scored | 3.836 | 3.801 | [-0.081, 0.009] | PASS guard 0.2 |
| trap triggers | 0.253 | 0.247 | [-0.014, 0.003] | PASS guard 0.05 |

Initial shape TV: baseline 0.069 [0.066, 0.149], candidate 0.062 [0.054, 0.146].
The candidate's full-precision upper bound 0.14617523092099363 fails the frozen
0.05 ceiling. Win-rate bounds are preserved as printed; a rounded -0.020 is
not substituted for the harness's full-precision failing comparison. Changed
option effect passed. No criterion or tolerance was weakened after results.

Reports and SHA-256:
- `.ai-batch-cache/baseline-d1ae88d13e70e840.json` — `9b151d771a7022adefd316c83cb499c8d3d996461e2ef81a39d51484a9a56029`.
- `.ai-batch-cache/candidate-7264db7c7a6e5aed.json` — `7b727cefcfc581aba3a6895481b745b6da291e92b129d8668f922fa7915bef9f`.

**Design/implementation audit:** The reviewed paths implement the ticket's
single-root parity, relative HQ/R&D depth and bounded public-history top-up as
specified; their deterministic tests passed. A direct real-class probe holding
all profile rolls at 0.5, with central depths [1, 2, 3], yields targets [2, 2, 2]
without the option and [1, 2, 3] with it. Thus the deliberate relative-depth rule
creates the public association by construction. This is consistent with the
large measured correlation increase, not a causal ablation of all three signals.
The gate does not establish which signal accounts for every change. No separate
implementation defect was identified in the paths checked; that is not proof
that every line was defect-free. The poor result is evidence against this
combined strategy, not a reason to reinterpret its acceptance gate. The design
conflict was already visible before implementation and should have received
stronger scrutiny before the costly experiment.

**Failed-gate disposition:** Removed the strategy, its defaults, top-up memory,
notes and option-only green tests. Returned the original committed feature
reproductions to pending without changing their expectations. Kept the passive
observer correction, shape collector, attribution telemetry, reporting repairs,
control evidence and their independent green tests. Live AI choices are back to
the adopted pre-experiment policy. A backup of the rejected candidate diff is
at `/private/tmp/chiriboga-l82-rejected-3t7anpj2/candidate-ai.patch`; the owner's
WIP commit also preserves the candidate. L8.9 already owns attribution before a
replacement is selected, so no duplicate or unsupported replacement strategy
has been invented. The pending experiment files are linked there as comparison
evidence, not future acceptance criteria. Review should close this ticket as a
rejected experiment and retire/park L8.2 rather than adopting it. The roadmap
status remains in-progress while the ticket is in code-review, as required by
the current workflow consistency checks.

**Final cleanup verification:** `node scripts/ticket.js check documentation/backlog/code-review/feature-layer-8-2-remote-deception-profiles.md`
passes, including `node tests/run-all-tests.js` (all 95 retained green test files,
including Corp decision fixtures and decision snapshots). The ticket check
confirms the rejected option is absent and the archived reproduction is pending.
The four unmet strategy/adoption criteria remain unticked intentionally. Focused
checks pass: 172 existing server-security regressions, shape/reporting 6/6,
observer reproduction 2/2, complete-control handling 4/4, roadmap consistency and
hook documentation. No new gameplay experiment or commit was made. Git diff
against the starting AI confirms that the only retained class changes are
passive profile attribution and cached-profile telemetry.

### Candidate implementation record (before rejection)


- Added lone-root parity, HQ/R&D-relative depth and one-time public-history
  protection top-up. The shared weighted sampler retains the same draws and
  safety guards. Top-up state is separate from the base profile, follows actual
  commitment/installation changes and cannot be created by hypothetical queries.
  No card hook, engine event, hidden Runner identity or card-title special case
  was added. See [architecture: baits, bluffs and deterrence](../../corp-ai/architecture.md#baits-bluffs-and-deterrence)
  and the shared-posture guidance in `documentation/ai.md`.
- Corrected observer labeling for roots with no activation record: they are
  unrolled, not active and not evidence of safety. Genuine stale/ambiguous state
  remains unknown. Updated one green expectation with a separate failing-then-
  passing observer reproduction; no gameplay decision is changed by observation.
- Added tested initial active-commitment shape measurement, cached profile
  attribution and hypothetical-event exclusion. Reporting validates strict
  collector declarations before starting workers. Complete control reports with
  recorded game failures proceed to calibration; process errors and incomplete,
  stale or mismatched reports still stop. The two control-run failures and their
  repairs are recorded below; no failed game was changed into a success.
- Recovered and analysed all saved control reports without replaying games.
  Observer identity: 1,400/1,400 identical outcomes/decision hashes/log hashes,
  no failures. Known labels: 99.659% / 99.626%, above the unchanged 90% rule;
  all required statistics and bootstrap draws valid. The second independent
  cohort retains BTL/Kit seed 257's known stall. Full commands, options, seeds,
  histograms, coverage, intervals and report SHA-256 hashes are in
  [the control evidence](../../corp-ai/measurements/L8.2-2dc504d-control-calibration.json).
- Moved the committed feature reproductions into the green suite. Their original
  assertions are unchanged; added cadence, feedback refresh, safety restoration,
  existing-top-up hypothetical reads and full option-off-path variations. Focused
  checks pass: base feature 5/5, detailed/hidden-information 8/8, added lifecycle/real-safety 6/6, control-report
  handling 4/4, shape/reporting 6/6, hook documentation 127 hooks checked.
- `node tests/run-all-tests.js` passes all 98 green test files, including
  `tests/corp-decision-fixtures.test.js` and `tests/decision-snapshots.test.js`.
  The ticket-script comparison also confirms both committed reproductions retain
  all original assertions. Quick reachability evidence will be recorded before
  handing the owner the full gate command; the full comparison remains pending.

**Ticket validation:** `node scripts/ticket.js check documentation/backlog/code-review/feature-layer-8-2-remote-deception-profiles.md`
passes, including another full run of all 98 files. The primary reproduction's
one non-assertion change updates its run-command comment from the pending path
to its green path; this accounts for the informational comparison warning.
The original assertions are unchanged. Expected warnings remain for the
unperformed full gate and its unticked evidence criterion. Generated roadmap
blocker headers are in sync; L8.2 has no unresolved dependency blocker. No
commit was made during this resumed work.

**Quick reachability:** Ran the frozen gate command below with `--quick`.
Printed first comparison line: `350 paired games, 57 changed by the options [quick: indicative only, cannot pass a gate]`.
Both sides completed 350 games with zero failures (baseline 153 s, candidate
150 s). All metric/interval calculations completed, with zero dropped pairs.
Reports: `.ai-batch-cache/baseline-c50cd39953aa4761.json` and
`.ai-batch-cache/candidate-e7db386b05aa5590.json`. The run ends `Gate: indicative only`;
its exit 1 is expected and supplies no adoption verdict. No thresholds were
changed after this result.

The short results are unfavorable and are retained explicitly:

| Quick check | Baseline | Candidate | Candidate − baseline 95% interval | Indicative result |
|---|---|---|---|---|
| all-root count TV | 0.222066 | 0.223341 | [-0.013517, 0.017664] | Improve not demonstrated |
| active-subset count TV | 0.269080 | 0.252210 | [-0.050441, 0.108688] | Guard missed |
| all-root count rho | 0.216669 | 0.210699 | [-0.035952, 0.015289] | Guard met |
| active-subset count rho | 0.185079 | 0.234716 | [-0.039826, 0.141965] | Guard missed |
| public-variable correlation maximum | 0.227529 | 0.691926 | [0.285916, 0.560819] | Guard missed |
| win rate | 0.334 | 0.329 | [-0.023, 0.011] | Guard missed |
| points stolen | 6.040 | 6.117 | [0.000, 0.166] | Guard met |
| points scored | 3.674 | 3.643 | [-0.126, 0.060] | Guard met |
| trap triggers | 0.269 | 0.266 | [-0.017, 0.011] | Guard met |

Initial shape TV is 0.114 [0.121, 0.295] versus 0.082 [0.110, 0.283]; the
candidate ceiling 0.05 is missed. These quick intervals are reported by the
harness, including its finite-sample TV behavior, not reinterpreted as a full
gate. The deliberate relative-depth input was already identified as a risk to
the public-variable correlation metric before implementation. It is not a
reason to weaken that frozen guard after observing this result. The owner
requested commands for long runs; leave the default off and hand over the full
1,400-games-per-side command. If the full gate fails, remove the policy and its
option-only tests and follow the documented non-adoption workflow.

**Gate command:** `node scripts/ai-batch.js gate --fresh --games 200 --jobs 3 --corp-option deceptionLegibility=true --collector realizedIceByRootType --collector bluffSingleVariableCorrelation --collector postureShapeByCardClass --collector installOutcomes --improve realizedIceByRootType.allCountDistance --guard realizedIceByRootType.posturedCountDistance=0.02 --guard realizedIceByRootType.allCountCorrelation=0.02 --guard realizedIceByRootType.posturedCountCorrelation=0.015 --guard bluffSingleVariableCorrelation.max=0.02 --ceiling postureShapeByCardClass.tv=0.05 --guard winRate=0.02 --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard installOutcomes.trapTriggers=0.05`

**Resume note:** Work was paused by the owner for the WIP commit and resumed
on request on 2026-10-15. The original main working directory now contains
unrelated work and was left unchanged. Saved ignored control reports and local
art needed by regression tests were copied into the new temporary worktree.

## Implementation plan

Proposed at `2dc504d`, 2026-10-14. **Approved 2026-10-14.**

**Control sampling frozen (2026-10-14, before any candidate exists):** Use the
committed pool, seeds 1–200 and 201–400, 200 games per deck pair, epochs and
feedback both explicitly on. Collect actual defense, posture correlation,
initial active-commitment shape overlap and install outcomes in each cohort.
Keep F12's 90% known labels, ten commitments/five games per class, and fail-closed
original/resample checks. Shape observations use each actual active commitment's
initial requested profile, one sample per roll; reuse and hypothetical rolls
are excluded. Later top-ups are evaluated in the actual-count measurement,
not substituted for an earlier initial shape. Require ten known commitments,
five contributing games per class and 90% known shapes in both classes for
shape measurements. Preserve the source overlap ceiling of 0.05 on its 95%
upper bound. The control-only command is:
`node scripts/ai-batch/defense-evidence.js --out .ai-batch-cache/l82-controls --jobs 3 --collector bluffSingleVariableCorrelation --collector postureShapeByCardClass --collector installOutcomes`.
Its three ordinary batch runs each have a 30-minute process timeout. This
collects evidence under current defaults; it does not enable a candidate or
relax any acceptance check. Numeric tell-regression tolerances will be frozen
with control precision and a policy rationale before candidate implementation.

**Control-run reporting repair (2026-10-15):** The owner's first 1,400-game
observer-off run completed in 679 seconds, then report construction failed
because the new strict shape collector omitted its required `metricNames`
list. Reproduced the exact error through `batchMetrics()` without playing games,
added the declaration, and tested valid intervals and fail-closed missing data.
Collector loading now checks this declaration before any workers start; a
focused test verifies the early rejection. No thresholds, gameplay or sample
selection changed. The run had not written a report, so its in-memory games
cannot be recovered and it must be repeated. The previous 94-file suite did
not exercise the new collector through report aggregation; this regression
coverage now does. Verification after the repair: shape/report tests 6/6;
`node tests/run-all-tests.js` passes all 94 green test files, including Corp
decision fixtures and decision snapshots.

**Batch scheduling (2026-10-14):** The owner reported another gate running
and requested avoiding concurrent AI batches. Stopped this control command
and all four descendant processes; no other gate was touched. The control run
did not finish and supplies no calibration/adoption evidence. Do not launch
another batch or the batch-playing full suite until the other gate has finished.
Observer/overlap groundwork passed all 94 green test files before interruption.
The detailed pending L8.2 scenarios additionally reproduce 7 failures/1 pass;
no candidate policy or candidate game run exists yet.

**Owner clarification (2026-10-14):** Approved proceeding with all changes needed
for L8.2, including correcting observer coverage first. Old control report
inspection found 1,343 of 1,374 unknown rows have neither an activation record
nor a query. Both policy modes require an activation record before deception
can be active, so classify these as `unrolled`, retaining unknown safety and
all genuinely stale/ambiguous records. This objective observer correction
changes one existing green expectation (never-queried roots: unknown →
unrolled); no gameplay choice changes. A separate pending reproduction failed
2/2 before the correction and passed 2/2 afterward, without evaluator calls or
cache writes. Keep the 90% threshold unchanged.

**Pre-plan checks:** `node tests/run-all-tests.js` passes all 92 green test
files, including `corp-decision-fixtures.test.js` and
`decision-snapshots.test.js`. The first worktree run failed only because ignored
local card art was absent; copied Dewi's reverse JPEG and the 66 Vantage Point
JPEGs from the original workspace, verified both affected focused tests, then
reran the full suite successfully. The pending feature reproduction remains
intentionally red (2 passed, 3 failed); no policy implementation or candidate
gate run has occurred.

- **Validation / classification:** This is a strategic change between legal advancement, install and protection choices, so deterministic examples are reproduction evidence, not an optimality oracle. The three missing signals are confirmed by the new pending reproduction. F12 has merged and was moved to done with `ticket.js move` before pickup; generated blockers are clear for L8.2. The current public history already records `iceInstalled` with opaque stable server IDs, turn, acting side and turn side. Use that record; add no engine event path. Both epoch and feedback options now default on. Profiles are cached by card, but feedback can refresh them on a later active commitment, so the older lifetime-only description needs qualification.
- **Gate prerequisites / disagreement (at initial planning; resolved by the frozen control evidence below):** The proposed realized-count gate cannot yet be frozen honestly. F12's control cohorts explicitly set feedback **off**, whereas current defaults enable it, and their known-posture fractions (85.7705% / 85.3816%) fail the frozen 90% subset requirement. No paired subset margins are calibrated. `postureShapeByCardClass` does not exist; profile-roll telemetry has no payload class/card ID, unlike activation events. The relative-depth policy also deliberately links target depth to a public variable that the existing correlation collector measures; sharing a sampler does not establish a 0.05 observed class-overlap bound. Do not treat unavailable statistics as zero, pick tolerances from candidate data, or silently drop a gate row.
- **Approach, stage 1 (before policy implementation):** Preregister fresh control-only cohorts with `postureEpochs=true`, `matchLocalPostureFeedback=true`, legibility absent/off, the committed pool and disjoint seeds 1–200 / 201–400 (200 games per pair). Verify observer identity and regenerate F12 evidence with `scripts/ai-batch/defense-evidence.js` under those defaults. Diagnose unknown posture coverage passively; if it remains below 90%, record why and propose a separately supported measurement repair or real-game starts before candidate runs. Build and test an overlap collector with payload-class attribution at actual active commitments, including epoch refreshes and top-up interpretation; exclude hypothetical events, fail closed on inadequate class coverage, and retain the proposed TV ceiling 0.05. Calibrate the posture-correlation guard from these same controls. Freeze numeric TV/rho/correlation regression margins with an explicit policy rationale, sample sizes, any real-game starts, and the complete gate table/commands in this ticket **before implementing or viewing a candidate**. If usable controls cannot support those rows, stop and report rather than weakening measurement readiness. These prerequisites are now satisfied; the final frozen gate below supersedes the historical proposal.
- **Approach, stage 2:** Add default-off `deceptionLegibility` and `legibilityTopUpTurns` (2) to `CorpAI.DEFAULT_OPTIONS`. Enforce single-root remote parity at `_deceptionPostureActive`; preserve the existing activation/safety guards. In `_remoteDeceptionProfile`, sample the existing shared distribution (including feedback weights), interpret depth 1/2/3 as offsets −1/0/+1 from the HQ/R&D maximum at profile creation, and clamp to 1–3. Preserve draw count and option-off behavior. Add a separate top-up commitment state keyed by server/root and actual epoch commitment; permit one raise per active commitment (per installed-root lifetime when epochs are off), only after reaching the base target and ICE elsewhere on each of the last two **completed** Corp turns with no ICE here. Ignore Runner-turn installs and the incomplete current turn. Do not mutate a shared cached base profile during speculative evaluation; no top-up in hypotheticals. Effective target feeds `_deceptionProtectionTarget` / `_NoMoreProtectionForThisServer` and normal protection filtering. Emit structured reasons for parity, relative depth, qualifying/nonqualifying top-up and safety. Preserve current install comparator/tactical guards rather than expanding this into install-ranking redesign.
- **Tests:** Keep the three failing pending assertions unchanged and move them to the green suite only after passing. Extend coverage for lone-root agenda/trap cadence, missing/recent/same-server/Runner-turn events, depth cap, exactly-once top-up, epoch renewal and feedback profile refresh, repeat-query/cache stability, hypothetical nonmutation and injectable RNG counts. Test epochs/feedback on and off, hidden Grip/Stack replacements and throwing hidden getters, safety restoration after a guard, scoring-win priority and option-off decision snapshots. Test overlap collector validity and F12 subset evidence separately. Preserve existing security and deception/protection-debt cases. Run focused tests, `node tests/run-all-tests.js` (including decision fixtures/snapshots), quick reachability checks and then every frozen full gate command.
- **Risk:** Shared protection exclusion, advancement cadence and scoring-remote distance affect many choices. Relative depth/top-up may increase the tell instead of reducing it; adoption requires the all-root TV improvement and all frozen subset/correlation/performance/overlap guards. Neither a deterministic fixture nor a quick gate justifies turning the option on. Leave it off until every full gate passes; remove rejected policy under the documented failed-gate workflow.
- **Docs / scope:** Update this ticket with calibration, frozen gate and final evidence, mark L8.2 in-progress in the roadmap, and update the linked architecture section only when behavior is implemented. Document parameters and existing card-facing consumers in `documentation/ai.md`; no new card hook or card-title special case is proposed. Expected source work is `ai_corp.js`, a new overlap collector and only the minimal telemetry/tracker consumers needed for reliable attribution; any unsupported coverage repair is recorded for a separate decision. No commit.

## Goal
Make agenda bluffs read like traps to a human by basing bluff legibility on the generic public signals a human actually reads: server card count, remote-versus-central framing, and protection posture relative to the Corp's recent actions. There is no card-level hook to hang bluffing on the way `AIPunishesAccess` supports baiting, so the signals must be generic rather than specific to any trap card.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../../corp-ai/architecture.md#baits-bluffs-and-deterrence). The shared profiles are done; none of the three legibility signals is implemented. Verified details:

- `_remoteDeceptionProfile(card)` rolls, per eligible agenda or trap, a target ICE depth of 1 (30%), 2 (48%) or 3 (22%), an opening advancement of 1 or 2, and an optional one-turn delay. The depth is absolute: it ignores how heavily the Corp has iced its centrals. With the default-on `matchLocalPostureFeedback`, the shared script weights can change these probabilities; `_epochPosture()` refreshes the cached profile only on a later active commitment. With feedback off, the profile stays cached for the card lifetime.
- **Card count is not treated alike.** `_shouldBluffAgendaServer()` and `_deceptionProtectionTarget()` require exactly one root card, but `_shouldBaitServer()` does not, so `_deceptionAdvancementTarget()` gives a trap sharing a remote with another root card (for example an upgrade) the posture's delayed or partial advancement cadence, while an agenda in the same shape advances normally. That difference is a learnable tell.
- **No recent-action input.** Once a postured server reaches its target depth it is excluded from protection for as long as the posture lasts, however much ICE the Corp adds elsewhere. L8.5 now supplies `_publicPostureHistory`, including `iceInstalled` actions, opaque stable server IDs, Corp turn numbers and acting/turn sides. These events are recorded even with feedback off, but no protection top-up consumes them yet. The previous claim that no record existed is stale.
- The winning-breach guard in `_shouldBluffAgendaServer()` and `_shouldBaitServer()` checks only that server (`_runnerMayWinIfServerBreached(server)`) and, for agendas, whether scoring it would win for the Corp. It does not look at central breaches. The earlier text claimed it did.
- The former Grip-size probability term was removed by the merged fix: see [`documentation/bugs/agenda-bluff-probability-tracks-runner-grip-size.md`](../../bugs/done/agenda-bluff-probability-tracks-runner-grip-size.md).

## Design
All three signals sit behind `this.options.deceptionLegibility` (default `false`). They apply identically to agendas and traps, because both read the same `_remoteDeceptionProfile()`.

- **Card count (parity).** A posture applies only to a remote with exactly one root card, for traps as well as agendas: `_deceptionPostureActive()` returns false for any multi-root server, so advancement cadence and protection target follow the same rule for both card types.
- **Remote-versus-central framing (relative depth).** Roll the depth as an offset from the deepest central instead of an absolute count: `targetIce = clamp(centralDepth + offset, 1, 3)`, where `centralDepth` is the larger ICE count of HQ and R&D when the profile is rolled, and `offset` is −1, 0 or +1 with the existing 30/48/22 split. A bluffed remote then looks light or heavy relative to how this Corp builds in this game. The clamp keeps "never naked".
- **Protection posture relative to recent actions (top-up).** Read the Corp half of L8.5's match-local public record. When a postured server is at its target depth and, in each of the last `legibilityTopUpTurns` (default 2) Corp turns, the Corp installed ICE on another server but not on this one, raise the target by one (at most 3, at most once per active epoch commitment, or installed-root lifetime with epochs off), so the postured remote is not the one server the Corp conspicuously never touches.
- Use no card-title checks and no trap-specific logic.
- Tactical scoring-window value remains the primary install signal; legibility adjusts profiles within it and never overrides it.
- Document `_remoteDeceptionProfile` parameters, the legibility inputs and the safety overrides in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Bluffing acts against the Corp's otherwise-optimal install/protection pattern purely to create a false signal, which risks measurably worse average play if the bluff does not land (unlike baiting, which is contained to a server that is already a trap).
- Deception profiles must never create naked agenda servers and must be disabled when a breach of that server could give the Runner enough agenda points to win. No legibility adjustment may reactivate a posture the guard disabled.
- Unpredictability: among eligible bait and agenda-bluff decisions that reach a
  random roll, whether a posture is active, and whether a postured card is an
  agenda or a trap, must not observably correlate with any single game-state
  variable a human could learn over repeated games (checked by
  `bluffSingleVariableCorrelation`). Safety-guarded remotes are outside this
  metric; the guards remain unconditional.
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
F4 gate. Option `deceptionLegibility` (Corp AI), off in the baseline and on in
the candidate. Committed deck pool, paired seeds 1–200, 200 games per deck pair,
bootstrap 95% intervals. Both arms retain `postureEpochs=true` and
`matchLocalPostureFeedback=true`. Collectors: `realizedIceByRootType`,
`bluffSingleVariableCorrelation`, `postureShapeByCardClass`, `installOutcomes`.
Starts: none; the full-pool quick check must demonstrate changed decisions.

**Frozen 2026-10-15, before policy implementation or candidate results.**
[Control-only evidence](../../corp-ai/measurements/L8.2-2dc504d-control-calibration.json)
contains full histograms, coverage, options, commands, report hashes and intervals.
Observer identity is 1,400/1,400 identical games. Known posture coverage is
99.659% / 99.626%, with no invalid original statistics or bootstrap draws.
The cohorts contain 1,400 / 1,399 successful games; the second retains the
known BTL/Kit seed 257 stall. Independent calibration accounts for that missing
game within its deck-pair stratum; it does not substitute unpaired adoption
comparisons. Both shape classes have 100% known profiles (547/451 and 601/464
agenda/trap commitments), and exceed five contributing games per class.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Improve | `realizedIceByRootType.allCountDistance` | lower | paired candidate-minus-baseline 95% upper bound < 0 |
| Guard | `realizedIceByRootType.posturedCountDistance` | lower | regression < 0.02 at the paired 95% upper bound |
| Guard | `realizedIceByRootType.allCountCorrelation` | lower | regression < 0.02 at the paired 95% upper bound |
| Guard | `realizedIceByRootType.posturedCountCorrelation` | lower | regression < 0.015 at the paired 95% upper bound |
| Guard | `bluffSingleVariableCorrelation.max` | lower | regression < 0.02 at the paired 95% upper bound |
| Ceiling | `postureShapeByCardClass.tv` | lower | candidate 95% upper bound <= 0.05 |
| Guard | `winRate` | higher | regression < 0.02 at the paired 95% lower bound |
| Guard | `pointsStolen` | lower | regression < 0.2 at the paired 95% upper bound |
| Guard | `pointsScored` | higher | regression < 0.2 at the paired 95% lower bound |
| Guard | `installOutcomes.trapTriggers` | higher | regression < 0.05 at the paired 95% lower bound |

**Tell-margin policy:** Require actual all-root count-distance reduction, while
allowing no secondary tell statistic to worsen by 10% of its smaller observed
control value. Round that allowance down to the next 0.005 in **each metric's
own units**. This produces TV 0.02 (control minimum 0.20986), all-root rho 0.02
(0.22925), postured rho 0.015 (0.19904), and posture-correlation maximum 0.02
(0.24406). These are conservative policy limits, not error bars copied between
TV/rho units or tolerances widened to match noise. Independent control-difference
95% intervals are respectively [-0.09056, 0.05203], [-0.02732, 0.07640],
[-0.11285, 0.09882] and [-0.11905, 0.09563]; they establish that unpaired sampling
would be too noisy for these limits. Adoption uses paired games and must report
insufficient precision as failure rather than widening a margin afterward.
The source 0.05 shape-overlap ceiling is retained despite control upper bounds
0.14882/0.15695: this is a demanding candidate requirement, not something the
control has already proved attainable. The old unreconciled absolute 0.10
single-variable ceiling is replaced by the explicitly proposed calibrated paired
guard above. Scoring and defence both receive the standard points guards because
this policy changes advancement as well as protection.

**Gate command:** `node scripts/ai-batch.js gate --fresh --games 200 --jobs 3 --corp-option deceptionLegibility=true --collector realizedIceByRootType --collector bluffSingleVariableCorrelation --collector postureShapeByCardClass --collector installOutcomes --improve realizedIceByRootType.allCountDistance --guard realizedIceByRootType.posturedCountDistance=0.02 --guard realizedIceByRootType.allCountCorrelation=0.02 --guard realizedIceByRootType.posturedCountCorrelation=0.015 --guard bluffSingleVariableCorrelation.max=0.02 --ceiling postureShapeByCardClass.tv=0.05 --guard winRate=0.02 --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard installOutcomes.trapTriggers=0.05`

All required original/draw statistics must be valid. Missing trap samples,
unknown labels or constant rho cannot pass. Keep all-root, active-subset,
class prevalence, age/commitment and per-deck diagnostics together so changing
membership cannot masquerade as a reduction in the all-root tell. A quick run
is reachability evidence only. Passing does not prove absence of other tells or
success against a learning human. Do not relax the Improve row or any frozen
threshold after candidate results; a failed design follows the failed-gate
workflow and informs L8.9.

## Things to consider
- The earlier ticket asked for deception postures to suppress or exempt value-weighted protection debt. L3.5.1 now handles this by relying on the existing `_NoMoreProtectionForThisServer()` exclusion; the top-up rule above changes when that exclusion ends, so check L3.5.1's scenario 7 still holds.
- The recent-action record is L8.5's, not this item's, so there is one match-local record and one reset rule.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution). Rejected candidate removed after gate failure.
- [ ] The gate is ready to run: every named collector/start board exists and is tested, and each exact gate command completes with `--quick` and reports at least one changed game.
- [x] The `realizedIceByRootType` collector is tested for all four required metrics, with valid original/draw coverage in both arms and frozen control-only calibration under the adopted epoch/feedback options.
- [x] The `bluffSingleVariableCorrelation` collector is tested under the frozen paired margin and candidate/control policy inputs.
- [x] The new `postureShapeByCardClass` collector is built and tested with valid agenda/trap attribution and a frozen batch TV ceiling of 0.05.
- [x] The existing `installOutcomes` collector and trap-trigger guard are tested.
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. FAILED: full evidence is recorded, adoption criteria were not met; the option was removed.
- [x] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.
- [x] No card titles are hardcoded in `ai_corp.js` for bluff legibility.
