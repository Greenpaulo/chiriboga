# L8.5 Match-local public outcome feedback

**Outcome:** adopted — implementation complete and revised F4 gate passed; ready for code review in the same PR as the completed engine repair. Feedback remains default-off during review.

**Roadmap item:** L8.5 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [deception gate reconciliation](../../corp-ai/deception-gates.md)
**Verified against code:** 04fbe4c (2026-10-12)
**Reproduction:** `tests/pending/match-local-public-outcome-feedback.test.js` — fails at 484edd3, 2026-10-12 (missing public event recorder and match-local history).

## Resolution

Implemented from 04fbe4c (2026-10-12).

The public recorder is independent of feedback and keeps committed gameplay
events with stable opaque ids and scalar metadata. Engine instrumentation
distinguishes run initiation, encounters and accesses; covers installs,
ICE rezzes and every positive advancement placement path; and records scores
and steals only after prevention resolves, preserving the originating server
before movement/access completion. Urtica Cipher (`systemgateway.js`), Snare!
(`systemupdate2021.js`) and Esca (`vantagepoint.js`) notify the actual public
trap effect, including optional payment, without adding/changing any AI hook.
These are the existing access-punishment declarers; no card-policy hook changes
or newly playable sets are part of this ticket.

Feedback uses the public shape actually exposed to a Runner turn, not a
private profile or payload. One exposed root supplies at most one settled
sample per Runner turn. Removed/overwritten roots are not counted as ignored.
Ten prior exposure-equivalents, bounded multipliers and positive normalized
script probabilities prevent small samples from dominating. New cards use
current weights; existing shapes refresh at later active commitments, while
epochs off retains lifetime shape caches. Every new AI instance resets the
record, counts, weights and reasons. The separate protection-run history is
unchanged.

The latest owner-approved gate revision makes correlation report-only.
Both arms' values and intervals print as diagnostics, without affecting the
gate result. Information integrity and feedback reachability are deterministic
prerequisites; batch acceptance retains the adaptation invariants and all
three performance guards. This supports bounded adaptation, without claiming
statistical non-inferiority of correlation or effectiveness against learning
humans. Weight telemetry initializes only after
`gameStart`; this preserves existing collectors' initialization order. The
isolated legacy rez harness remains supported when no observer is loaded.
Mixed line endings are preserved; ordinary and CR-ignoring diff statistics
match.

The original two-case reproduction was moved unchanged to
`tests/match-local-public-outcome-feedback.test.js` and passes with
`node tests/match-local-public-outcome-feedback.test.js`. Additional tests in
`tests/match-local-posture-feedback.test.js` cover the nine scenarios, actual
engine transitions, committed/cancelled installs, optional traps, prevention,
removed remotes and hypothetical events. A seeded boundary case demonstrates
that an ignored posture changes a later shape choice, not just the weights
or logs. `tests/ai-batch-measured-no-worse.test.js` exercises equality,
regression, missing/nonfinite metrics and unchanged-game rejection.
`postureScriptWeights` and the existing correlation collector are tested.
Acceptance audit (2026-10-12): 25 public outcome feedback cases and
28 harness scenarios passed. Full regression run: 88 test files passed,
including `tests/corp-decision-fixtures.test.js` and
`tests/decision-snapshots.test.js`.

**Gate:** passed — `matchLocalPostureFeedback`; complete owner-supplied revised F4 output and report paths are recorded below. Implementation is ready for code review alongside the completed engine repair in the same PR; feedback remains default-off during review.

**Gate command:** `node scripts/ai-batch.js gate --fresh --jobs 3 --pool tests/fixtures/ai-batch/deck-pool.json --games 200 --corp-option matchLocalPostureFeedback=true --collector postureScriptWeights --collector bluffSingleVariableCorrelation --max postureScriptWeights.violations=0 --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard winRate=0.02`

Full gate evidence is recorded below. The committed `core-v1`
pool has seven pairs: `pd-tao`, `btl-kit`, `neh-zahya`, `pe-steve`, `gateway`,
`zwicky-magdalene`, `leo-topan`. Full evaluation uses paired seeds 1–200 for
every pair (1,400 paired games), with prerequisite defaults identical across
arms and only feedback changed. Operational runs use three workers and an
outer one-hour subprocess timeout. The latest gate keeps the pool and seed
count; its correlation row is diagnostic, as explained below.

**Gate attempt blocked (2026-10-12):** The `--quick --jobs 3` run never reached
its comparison: baseline `zwicky-magdalene` seed 24 repeatedly attempted an
unaffordable Magdalene/Principia install. The owner also reported the full
run stalling. Fresh replay with feedback off and a read-only `HEAD` source
overlay reproduced the same failure, establishing that it predates L8.5.
The worker was stopped, so this attempt provides no gate metrics or adoption
evidence. A two-second replay probe confirms the normal timeout does fire;
continued callbacks bypass the no-callback watchdog and the default timeout
is 900 seconds. See the [engine ticket](../../bugs/done/runner-install-cost-increases-after-trash.md)
and its original pending reproduction. No seed/pair was excluded and no gate
threshold changed. Feedback remained off; the gate-ready criterion was unticked for that attempt.

**Quick setup after engine repair (2026-10-12, original gate):** The original gate command,
with `--quick --jobs 3`, now completes: baseline 350 games, zero failed, 160 s;
candidate 350 games, zero failed, 159 s. Its comparison reports
`350 paired games, 18 changed by the options [quick: indicative only, cannot pass a gate]`.
All core guards and the zero weight-violation check pass indicatively; the
measured-no-worse correlation check flags a baseline maximum of 0.192 versus
candidate 0.228. Output ends `Gate: indicative only` (expected non-zero exit).
This establishes option reachability and removes the baseline execution stall;
it supplies no full-gate adoption evidence. Feedback stayed off; the subsequent owner-supplied full run is recorded below.


**Original full gate, owner-supplied evidence (2026-10-12):**
Command: `node scripts/ai-batch.js gate --corp-option matchLocalPostureFeedback=true --collector postureScriptWeights --collector bluffSingleVariableCorrelation --max postureScriptWeights.violations=0 --no-worse bluffSingleVariableCorrelation.max --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard winRate=0.02`.
The committed seven-pair `core-v1` pool used paired seeds 1–200 (1,400 paired
games); zero failures in each arm, 69 differing gameplay logs, baseline 277 s,
candidate 275 s. Reports: `.ai-batch-cache/baseline-eea65a460d37b42a.json` and
`.ai-batch-cache/candidate-a732030e22ef0be0.json`.

| Metric | Baseline | Candidate | Difference and 95% interval | Original check |
|---|---:|---:|---|---|
| `pointsScored` | 3.829 | 3.836 | +0.007 [−0.018, +0.033] | guard 0.2 passed |
| `pointsStolen` | 5.942 | 5.951 | +0.009 [−0.014, +0.033] | guard 0.2 passed |
| `winRate` | 0.360 | 0.358 | −0.002 [−0.008, +0.004] | guard 0.02 passed |
| `postureScriptWeights.violations` | 0 | 0 | 0 [0, 0] | hard maximum 0 passed |
| `bluffSingleVariableCorrelation.max` | 0.228 [0.167, 0.304] | 0.250 [0.180, 0.318] | measured increase 0.022; no paired interval computed | measured no-worse failed |

The original command ended `Gate: failed`. This remains a failed result under
its original criteria; it is not relabelled as a pass.

**Owner-approved gate redesign (2026-10-12, after viewing the failure):**
The owner authorized this revision after discussing the mismatch between the
statistic and L8.5's intended guarantees. Feedback intentionally changes shape
probabilities in response to public history. The collector maximizes absolute
correlation over five outcomes and ten public-state variables, including
turn number, credits and ICE depth. An increase does not directly establish
payload leakage or loss of exploration; a decrease would not prove their
absence either. The feature therefore retains this metric as a visible
report-only diagnostic, with values and intervals recorded in the Resolution.
We do not infer that the observed increase is harmless or statistically
insignificant. Strict `--no-worse` remains available for gates that explicitly
require it; no tolerance was added.

The revised acceptance contract combines deterministic public-input and
payload-independent probability tests, deterministic settled-feedback
reachability, hard adaptation bounds and the existing performance guards.
The exact twelve probabilities delivered to the sampler are compared for
agenda/trap payloads under matching initial, ignored, challenged, mixed and
long repeated histories. The existing paired option-on/off boundary test
shows a settled ignored exposure changes a later profile choice; commitment
lifetime tests prevent premature rerolls. These are correctness and
reachability witnesses, not evidence of strategic benefit.

The weights collector now counts missing telemetry as a violation and checks
at most 0.02 multiplier movement between observations, in addition to its
absolute bounds, floors and normalization checks. Initial observations occur
after `gameStart`; each settled exposure emits its own weight observation.
The complete owner-supplied revised full gate output below confirms a pass.
Feedback stays off during code review; this audit does not mark the ticket
done or enable the option.


**Revised gate quick check (2026-10-12):** The current Gate command with
`--quick` completed on fresh reports: baseline 350 games, zero failed, 160 s;
candidate 350 games, zero failed, 170 s. Reports:
`.ai-batch-cache/baseline-e547795b60b765ce.json` and
`.ai-batch-cache/candidate-1420f871177dc572.json`.
Output reports `350 paired games, 18 changed by the options`.

| Metric | Baseline | Candidate | Difference and 95% interval | Indicative check |
|---|---:|---:|---|---|
| `pointsScored` | 3.700 | 3.674 | −0.026 [−0.106, +0.046] | guard 0.2 passed |
| `pointsStolen` | 6.031 | 6.040 | +0.009 [−0.040, +0.069] | guard 0.2 passed |
| `winRate` | 0.337 | 0.334 | −0.003 [−0.017, +0.011] | guard 0.02 passed |
| `postureScriptWeights.violations` | 0 | 0 | 0 [0, 0] | hard maximum 0 passed, including the strengthened telemetry/movement checks |
| `bluffSingleVariableCorrelation.max` | 0.192 [0.146, 0.356] | 0.228 [0.159, 0.373] | measured increase 0.036 | report-only `[diagnostic]` |

The changed-option check also passed. Output ends `Gate: indicative only`
and exits 1 as designed for `--quick`; this establishes setup readiness,
not full-gate adoption evidence. The subsequent owner-reported full result
is recorded below.


**Revised full gate, complete owner-supplied output (2026-10-12):**
The exact revised Gate command above ran with `--fresh --jobs 3`, the committed
seven-pair `core-v1` pool and paired seeds 1–200 per pair. Both arms completed
1,400 games with zero failures; 69 paired gameplay logs changed. Every required
check passed. Correlation remains report-only; its increase of 0.022 does not
determine acceptance. This successful revised run is recorded separately from
the preserved original failed gate.

```text
baseline: playing 1400 games
1400/1400 games, 614 s
baseline: 1400 games, 0 failed, 614 s; .ai-batch-cache/baseline-7cf7378f77934ac4.json
candidate: playing 1400 games
1400/1400 games, 601 s
candidate: 1400 games, 0 failed, 601 s; .ai-batch-cache/candidate-0501a969b2ef96ac.json
1400 paired games, 69 changed by the options
  metric                               baseline  candidate  difference  95% interval
  pointsScored                            3.829      3.836      +0.007  [-0.018, +0.033] (higher is better)
  pointsStolen                            5.942      5.951      +0.009  [-0.014, +0.033] (lower is better)
  postureScriptWeights.violations         0.000      0.000      +0.000  [+0.000, +0.000] (lower is better)
  winRate                                 0.360      0.358      -0.002  [-0.008, +0.004] (higher is better)
  bluffSingleVariableCorrelation.max   batch: baseline 0.228 [0.167, 0.304]  candidate 0.250 [0.180, 0.318] [diagnostic]
  PASS changed option effect
  PASS guard pointsStolen tolerance 0.2
  PASS guard pointsScored tolerance 0.2
  PASS guard winRate tolerance 0.02
  PASS max postureScriptWeights.violations at most 0
Gate: passed
```

**Acceptance-contract audit (2026-10-12):** No threshold, collector setting,
AI option default or batch gate flag changed during this audit. The batch
command covers hard adaptation invariants and outcome guards; deterministic
information-integrity and reachability tests are additional prerequisites.
Together these implement the four agreed checks: bounded adaptation,
information integrity, feedback reachability and performance safety. The
correlation diagnostic remains visible evidence, not a fifth acceptance gate.
This contract verifies bounded, functioning adaptation and safety against the
fixed Runner AI; it does not prove improved deception or human-facing
unpredictability.

`postureScriptWeights` checks finite weights in 0.8–1.2, finite probabilities
at least 0.015 and at most 1, total probability 1 within 1e-9, twelve distinct
script ids, movement at most 0.02 between observations (1e-12 roundoff allowance)
and the presence of telemetry. It does not identify/count exposures or verify
that every exposure was observed. The new deterministic test
`each settled exposure moves weights by at most 0.02 and emits one matching observation`
closes that contract gap over repeated ignored/challenged/mixed histories,
measuring every multiplier before/after each settlement and checking exactly
one matching telemetry observation. The existing one-turn/sample and real
transition tests also prevent repeat settlement.

The new test `weight collector independently enforces weight limits, exploration floors and normalization`
checks those constraints separately, without another violation masking a
missing check. `all twelve sampler probabilities are payload-independent for matched public histories`
compares the actual twelve probabilities passed to the sampler for agenda/trap
payloads with identical public histories. `hidden Grip/Stack identities and hidden payloads do not enter history or weights`
uses throwing proxies for hidden Runner cards and compares histories, weights
and reasons. The added `seeded feedback replay changes a later profile choice only after settlement`
uses the same seeded LCG stream in both arms, asserts zero feedback before
settlement, then target ICE 2 with feedback off versus 1 with feedback on,
and reproduces both runs exactly. All these tests are in
`tests/match-local-posture-feedback.test.js`.

The output-only `[diagnostic]` suffix is in `printComparison` in
`scripts/ai-batch.js`; it changes neither `result.pass` nor `result.checks`.
`batch diagnostics print both intervals without imposing a no-worse gate`
in `tests/ai-batch.test.js` verifies a worse unchecked statistic still passes
the other checks, while explicitly adding strict `--no-worse` makes it fail.
`documentation/ai-batch-harness.md` documents the label and `--fresh` cache
bypass semantics. Audit verification: `node tests/match-local-posture-feedback.test.js`
passed all 25 cases; `node tests/run-all-tests.js` passed all 88 test files,
including Corp fixtures and decision snapshots. No test failed, and no
threshold, gate flag or AI option default changed.

## Related engine repair — complete, included in the same PR

The engine fix is implemented and recorded in
[Runner install cost increases after trashing a discount source](../../bugs/done/runner-install-cost-increases-after-trash.md),
originally reproduced on baseline `zwicky-magdalene` seed 24. The repaired
fresh baseline replay completes normally (Corp 7–0 Runner, 10 turns,
`logHash 82ca07d82291`), with the unchanged pool/seed and feedback off.
Both completed implementations are ready for review together in the same PR.
The engine repair requires no separate PR or prerequisite review before the
L8.5 hand-off. The revised full gate passed with the repair present.

## Implementation plan

Proposed at `484edd3`, 2026-10-12. **Approved 2026-10-12.**

**Original approved gate revision (2026-10-12; superseded by the post-result redesign above):** The user's approval adopts the reconciliation plan's no-worse-than-fresh-matching-control direction. Compare measured `bluffSingleVariableCorrelation.max` batch values (candidate ≤ baseline), as in L8.4; report both arms' 95% intervals for context. This is not paired statistical non-inferiority and requires no F11 dependency. Automate this measured-value check with `--no-worse`, preserving weight bounds, exploration floors and performance guards. No candidate results have been viewed. Implementation resumes from `04fbe4c`; only documentation and the pending reproduction changed since the original code check at `484edd3`.

- **Validation:** The premise holds: no public outcome feedback or whole-match action record exists. Checked the complete bait-frequency, agenda-bluff, profile, epoch, boundary, telemetry and recent-run-history methods and their consumers. F4 and L8.4 are done; `postureEpochs` defaults on. Contrary to the older design's implication, L8.4 keeps profile shapes lifetime-cached and only rerolls bait/bluff activation. Its `_postureChallenges` is an additional public history beyond `_recentSuccessfulRunPressure`, but neither records visible installs or outcomes. The pending feature reproduction fails on both missing record requirements. Classification: the sanitized record and reset have objective invariants; adaptive probabilities and suggested responses to ignored/challenged postures are strategic preferences, requiring F4 even with deterministic tests. The latest gate tests bounded adaptation and performance safety, not strategic improvement or empirical unpredictability against a learning human.
- **Approach:** Add a per-instance public event record with opaque server/card ids, Corp turn, acting side, action and amount; no live card objects or facedown identities in exported entries. Proposed `_recordPublicPostureEvent(action, server, card, amount)` and `_publicPostureHistory` do not currently exist. Keep recording available with feedback off for L8.2. Instrument committed installs/rezzes, all three advancement paths (`Advance`, `PlaceAdvancement`, advancement `AddCounters`), run initiation, actual encounters/accesses and completed scores/steals. Capture the originating server before movement and preserve ids after a remote is destroyed or its display index changes. A successful-run declaration is not an access. Count a trap firing only at the actual public effect execution, including after optional payment, using the existing access-punishing card implementations (Urtica Cipher, Snare!, Esca); do not infer it from an access, a trigger offer, or damage alone. Keep the decaying protection history separate. Exclude hypothetical planning mutations and count only committed events.
- **Feedback and lifetime:** Add default-off `matchLocalPostureFeedback`. Classify exposures by the shared public shape (ICE depth, opening advancement, delay), never agenda/trap identity. At the next Corp turn, settle each exposed posture once: an ignored turn requires a real Runner turn with that installed root available; repeated accesses/runs must not manufacture extra ignored exposures. Keep historical outcomes for all named public responses. Use conservative prior strength of at least ten exposure-equivalents, script multipliers bounded to 0.8–1.2, and at most 0.02 movement from one settled exposure. Normalize against the existing shared shape distribution, retaining a probability floor of 0.015 for each of its twelve depth/advancement/delay combinations. Ignored light shapes modestly reinforce light shapes; challenges modestly favor deeper or delayed alternatives. These coefficients are provisional and remain behind the option until the approved gate passes. New cards use current weights; already installed cards refresh their shape only when L8.4 actually creates a later commitment, at most once per card/epoch. Repeated queries, cache clears, same-turn actions and Runner-turn queries cannot reroll. With epochs explicitly disabled, adapt only newly profiled cards. Preserve option-off results and random draw counts exactly. Reject immediate per-event rerolls, merging protection-pressure history, and card-class-specific distributions.
- **Tests:** Extend the pending reproduction to cover all nine scenarios, including structured reasons and weights, strong-prior bounds after single/repeated outcomes, exploration, agenda/trap overlap, seeded replay, guarded hidden Grip/Stack identities, independent fresh games, real engine events, optional trap declined/paid, advancement placement versus advancing, unsuccessful/bypassed runs, access without success, prevented score/steal, overwritten/destroyed remotes and hypothetical probes. Move it unchanged to the green suite only after it passes. Test `postureScriptWeights` extrema/violation reporting and the existing correlation collector with adapted profile events. Run focused tests then the full regression suite.
- **Risk:** Shared profile consumers affect install distance, protection depth and advancement cadence. Engine event sites have many callers and asynchronous resolution callbacks; emit only after effects commit and never alter callback timing. The source scope exceeds three files (AI, mechanics, phases, actual trap effects and F4 collector), so this plan requires approval. The latest owner-approved revision supersedes the original measured-correlation rejection rule; the Resolution preserves the original failure and post-result chronology. Report failures of the revised hard checks and performance guards for reconsideration with the owner; any independently useful public record is retained with explicit acceptance-scope accounting.
- **Docs:** Update `documentation/ai.md` shared posture documentation, the linked architecture section, ticket evidence and roadmap. No new card-facing AI hook is proposed; the trap notification is a gameplay event, not a planning hook. Build/test the weights collector; reuse the correlation collector. Gate setup must demonstrate changed games with `--quick` before a full run or review hand-off.

## Goal
Let the Corp adjust later mixed bait/bluff strategies when the human repeatedly challenges or ignores particular visible remote postures during the current game, so a human cannot exploit a fixed posture distribution within one match. This item also owns the match-local public record that L8.2 reads.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../../corp-ai/architecture.md#baits-bluffs-and-deterrence). Confirmed at 484edd3: `_calculateBaitFrequency()` returns 0 without a live access punishment, otherwise a probability bounded to 0.08–0.35. `_shouldBluffAgendaServer()` uses `0.22 / agendaPoints + 0.02`, bounded to 0.05–0.18, subject to eligibility and winning-breach/score guards. `_remoteDeceptionProfile()` uses fixed thresholds for depth (1/2/3: 30%/48%/22%), opening advancement (1/2: 55%/45%) and delay (one turn/none: 30%/70%), cached for the card's lifetime. L8.4 is implemented: `postureEpochs` defaults on and `_epochPosture()` bounds bait/bluff activation commitments, but does not resample profile shapes. Public runs already affect reevaluation reasons through `_postureChallenges`; they do not change selection probabilities. `_recentSuccessfulRunPressure` separately tracks recent successful runs for protection. Neither record keeps the Corp's visible actions or whole-match outcome feedback.

## Design
- **Match-local public record** (owned here, reset when a new game begins): per server and turn, the Corp's own visible actions (root card installed, ICE installed, ICE rezzed, advancement counters placed) and the Runner's public responses (runs initiated, ICE encountered, successful accesses, traps fired, agendas stolen and scored). L8.2's "recent actions" signal reads the Corp half; this item's feedback reads both. Record only what both players saw.
- Record public outcomes by posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen and agendas scored.
- Behind `this.options.matchLocalPostureFeedback` (default `false`), maintain bounded match-local weights or Beta-style priors for the shared scripts. L8.4 now exists, but its profile cache is lifetime-scoped: adaptation of existing shapes requires an explicit option-on refresh at an actual later commitment boundary, not merely at every new Corp turn. New cards use current weights; with epochs disabled, installed profiles stay lifetime-scoped. This is a design clarification from re-grounding, not existing behaviour.
- Document the record, the feedback weight structures and the public signals in `documentation/ai.md` where they are card-facing.

## Safety and information boundary
- Learn only from public actions and Corp-known outcomes.
- Never inspect Runner Grip/Stack identities or persist a player fingerprint across games or sessions.
- Never allow a small sample to collapse any script's probability to zero: every script keeps a non-zero exploration floor.
- Agenda and trap cards must draw from exactly the same twelve-script
  distribution given identical public histories; every script retains its floor.

## Test scenarios
1. Ignored light postures modestly increase their later use during the current match.
2. Repeated challenges shift some weight toward deeper or delayed scripts.
3. One outcome cannot dominate the weights.
4. Starting a new game resets all outcome memory, and the public record, to baseline.
5. Changing hidden Runner cards changes nothing.
6. Identical seeded public histories produce identical weights.
7. Agenda and trap sampler probabilities are exactly equal for matched public histories across all twelve scripts, including repeated adaptation.
8. The public record lists, for a scripted two-turn sequence, exactly the Corp's visible installs, rezzes and advancements per server and turn, and nothing about facedown card identities.
9. With the option off, posture selection is unchanged from today (the record may still be kept).

## Acceptance gate
F4 gate. Option `matchLocalPostureFeedback` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals. This item requires bounded adaptation and
performance safety, without a measured strategic improvement: the Runner AI
does not learn postures, so F4 cannot establish a benefit against a learning human.
Collectors: `postureScriptWeights` (per-game minimum/maximum multipliers and normalized probabilities for each shared script; adds `postureScriptWeights.violations`, counting missing telemetry, out-of-bounds multipliers, movement above 0.02 between observations, probability-floor violations and normalization failures), existing `bluffSingleVariableCorrelation` (batch metric `bluffSingleVariableCorrelation.max`, report-only).
Starts: none; feedback is expected to be reached in ordinary remote play in the committed pool. A quick run must demonstrate changed games before this setup is accepted.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Hard check | `postureScriptWeights.violations` | — | at most 0 in every candidate game; multipliers 0.8–1.2, each normalized script probability at least 0.015, sum 1, per-observation multiplier movement at most 0.02, telemetry required |
| Diagnostic (no gate flag) | `bluffSingleVariableCorrelation.max` | lower | report baseline/candidate values and intervals; no acceptance threshold |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Guard | `winRate` | higher | regression at most 0.02 |

Gate command: `node scripts/ai-batch.js gate --fresh --jobs 3 --pool tests/fixtures/ai-batch/deck-pool.json --games 200 --corp-option matchLocalPostureFeedback=true --collector postureScriptWeights --collector bluffSingleVariableCorrelation --max postureScriptWeights.violations=0 --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard winRate=0.02`

Deterministic prerequisites (not noisy batch metrics), exercised by
`node tests/match-local-posture-feedback.test.js`:

| Contract | Acceptance oracle |
|---|---|
| Information integrity | Identical public histories produce exactly identical probabilities for all twelve scripts for agenda/trap payloads; hidden Runner identities do not affect history or weights |
| Feedback reachability | A real exposed posture settles once; paired feedback-off/on execution changes a later profile choice; existing profiles refresh only at a later active commitment |
| Bounded adaptation | Strong prior, one sample per exposure, per-exposure movement at most 0.02, weights 0.8–1.2, probabilities at least 0.015 and normalized; new games reset all memory |

Performance safety is measured by the three F4 guards above. The full
regression suite must pass before the full gate is run. Correlation remains
visible diagnostic evidence; it does not measure all sources of payload
leakage or prove human-facing unpredictability. Capture a fresh control with
identical prerequisites, pool, seeds and collectors; only feedback differs.
A passing batch is required alongside these deterministic contracts before
adoption. Review the completed engine repair and L8.5 together in the same PR.

## Things to consider
- Sample size drift: in a typical match the Runner might run a remote only 3 to 6 times, and Beta-style priors can swing wildly on tiny samples (for example two wrong guesses in a row). Use strong, conservative prior weights so one or two runs adjust probabilities modestly rather than swinging posture selection.
- `_recentSuccessfulRunPressure` decays and serves protection pressure; do not merge it into the record, which keeps whole-match history for posture feedback.

## Acceptance criteria
- [x] All nine scenarios are covered by deterministic tests of their applicable contracts: probabilities, choices, structured reasons, resets and public event records.
- [x] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [x] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [x] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the thresholds met. Feedback remains default-off during code review; enabling it is deferred until review is complete.
- [x] Collector `postureScriptWeights` is built and tested for per-script extrema, normalized probabilities, absolute bounds, 0.02 movement limits and missing telemetry.
- [x] Deterministic information-integrity tests compare all twelve sampler probabilities for matched agenda/trap histories.
- [x] Deterministic reachability tests demonstrate settled feedback changes a later shape choice and respect commitment boundaries.
- [x] Existing collector `bluffSingleVariableCorrelation` accepts adapted profile events and is displayed as report-only evidence with both intervals; its results are recorded above.
- [x] `documentation/ai.md` documents the public record and shared feedback; no card-facing AI hook contract changed.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour and revised acceptance scope.
- [x] `node tests/run-all-tests.js` passes (88 test files, 2026-10-12).
