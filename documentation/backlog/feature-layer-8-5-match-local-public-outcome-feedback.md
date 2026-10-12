# L8.5 Match-local public outcome feedback

**Roadmap item:** L8.5 · **Depends on:** F4 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, [deception gate reconciliation](../plans/2026-10-09-merge-and-roadmap-order.md#deception-gate-reconciliation-before-implementation)
**Verified against code:** 484edd3 (2026-10-12)
**Reproduction:** `tests/pending/match-local-public-outcome-feedback.test.js` — fails at 484edd3, 2026-10-12 (missing public event recorder and match-local history).

## Implementation plan

Proposed at `484edd3`, 2026-10-12. **Awaiting approval.**

**Gate decision still required:** The [merge plan's reconciliation table](../plans/2026-10-09-merge-and-roadmap-order.md#deception-gate-reconciliation-before-implementation) proposes replacing this item's absolute 0.10 ceiling with no worse than a fresh matching control. That proposal was missed in the initial pickup; the plan below preserves the recorded ceiling and is not approved. Before approving implementation, reconcile this proposal in this source ticket and specify whether “no worse” means measured batch maxima (as in L8.4) or a paired-interval rule (requiring F11 and a preregistered margin). No candidate gate results have been viewed. Retain weight bounds, exploration floors and performance guards whichever statistic is selected.

- **Validation:** The premise holds: no public outcome feedback or whole-match action record exists. Checked the complete bait-frequency, agenda-bluff, profile, epoch, boundary, telemetry and recent-run-history methods and their consumers. F4 and L8.4 are done; `postureEpochs` defaults on. Contrary to the older design's implication, L8.4 keeps profile shapes lifetime-cached and only rerolls bait/bluff activation. Its `_postureChallenges` is an additional public history beyond `_recentSuccessfulRunPressure`, but neither records visible installs or outcomes. The pending feature reproduction fails on both missing record requirements. Classification: the sanitized record and reset have objective invariants; adaptive probabilities and suggested responses to ignored/challenged postures are strategic preferences, requiring F4 even with deterministic tests. The gate remains a safety/unpredictability test, not evidence of improvement against a learning human.
- **Approach:** Add a per-instance public event record with opaque server/card ids, Corp turn, acting side, action and amount; no live card objects or facedown identities in exported entries. Proposed `_recordPublicPostureEvent(action, server, card, amount)` and `_publicPostureHistory` do not currently exist. Keep recording available with feedback off for L8.2. Instrument committed installs/rezzes, all three advancement paths (`Advance`, `PlaceAdvancement`, advancement `AddCounters`), run initiation, actual encounters/accesses and completed scores/steals. Capture the originating server before movement and preserve ids after a remote is destroyed or its display index changes. A successful-run declaration is not an access. Count a trap firing only at the actual public effect execution, including after optional payment, using the existing access-punishing card implementations (Urtica Cipher, Snare!, Esca); do not infer it from an access, a trigger offer, or damage alone. Keep the decaying protection history separate. Exclude hypothetical planning mutations and count only committed events.
- **Feedback and lifetime:** Add default-off `matchLocalPostureFeedback`. Classify exposures by the shared public shape (ICE depth, opening advancement, delay), never agenda/trap identity. At the next Corp turn, settle each exposed posture once: an ignored turn requires a real Runner turn with that installed root available; repeated accesses/runs must not manufacture extra ignored exposures. Keep historical outcomes for all named public responses. Use conservative prior strength of at least ten exposure-equivalents, script multipliers bounded to 0.8–1.2, and at most 0.02 movement from one settled exposure. Normalize against the existing shared shape distribution, retaining a probability floor of 0.015 for each of its twelve depth/advancement/delay combinations. Ignored light shapes modestly reinforce light shapes; challenges modestly favor deeper or delayed alternatives. These coefficients are provisional and remain behind the option until the unchanged gate passes. New cards use current weights; already installed cards refresh their shape only when L8.4 actually creates a later commitment, at most once per card/epoch. Repeated queries, cache clears, same-turn actions and Runner-turn queries cannot reroll. With epochs explicitly disabled, adapt only newly profiled cards. Preserve option-off results and random draw counts exactly. Reject immediate per-event rerolls, merging protection-pressure history, and card-class-specific distributions.
- **Tests:** Extend the pending reproduction to cover all nine scenarios, including structured reasons and weights, strong-prior bounds after single/repeated outcomes, exploration, agenda/trap overlap, seeded replay, guarded hidden Grip/Stack identities, independent fresh games, real engine events, optional trap declined/paid, advancement placement versus advancing, unsuccessful/bypassed runs, access without success, prevented score/steal, overwritten/destroyed remotes and hypothetical probes. Move it unchanged to the green suite only after it passes. Test `postureScriptWeights` extrema/violation reporting and the existing correlation collector with adapted profile events. Run focused tests then the full regression suite.
- **Risk:** Shared profile consumers affect install distance, protection depth and advancement cadence. Engine event sites have many callers and asynchronous resolution callbacks; emit only after effects commit and never alter callback timing. The source scope exceeds three files (AI, mechanics, phases, actual trap effects and F4 collector), so this plan requires approval. L8.4's recorded historical correlations exceed 0.10 and its approved relaxation applied to L8.4 only; retain L8.5's 0.10 ceiling and report any failure rather than relax it. A failed gate follows the skill's rejection workflow; any independently useful public record is retained with explicit acceptance-scope accounting.
- **Docs:** Update `documentation/ai.md` shared posture documentation, the linked architecture section, ticket evidence and roadmap. No new card-facing AI hook is proposed; the trap notification is a gameplay event, not a planning hook. Build/test the weights collector; reuse the correlation collector. Gate setup must demonstrate changed games with `--quick` before a full run or review hand-off.

## Goal
Let the Corp adjust later mixed bait/bluff strategies when the human repeatedly challenges or ignores particular visible remote postures during the current game, so a human cannot exploit a fixed posture distribution within one match. This item also owns the match-local public record that L8.2 reads.

## Current behaviour
See [architecture: baits, bluffs and deterrence](../corp-ai/architecture.md#baits-bluffs-and-deterrence). Confirmed at 484edd3: `_calculateBaitFrequency()` returns 0 without a live access punishment, otherwise a probability bounded to 0.08–0.35. `_shouldBluffAgendaServer()` uses `0.22 / agendaPoints + 0.02`, bounded to 0.05–0.18, subject to eligibility and winning-breach/score guards. `_remoteDeceptionProfile()` uses fixed thresholds for depth (1/2/3: 30%/48%/22%), opening advancement (1/2: 55%/45%) and delay (one turn/none: 30%/70%), cached for the card's lifetime. L8.4 is implemented: `postureEpochs` defaults on and `_epochPosture()` bounds bait/bluff activation commitments, but does not resample profile shapes. Public runs already affect reevaluation reasons through `_postureChallenges`; they do not change selection probabilities. `_recentSuccessfulRunPressure` separately tracks recent successful runs for protection. Neither record keeps the Corp's visible actions or whole-match outcome feedback.

## Design
- **Match-local public record** (owned here, reset when a new game begins): per server and turn, the Corp's own visible actions (root card installed, ICE installed, ICE rezzed, advancement counters placed) and the Runner's public responses (runs initiated, ICE encountered, successful accesses, traps fired, agendas stolen and scored). L8.2's "recent actions" signal reads the Corp half; this item's feedback reads both. Record only what both players saw.
- Record public outcomes by posture class: turns ignored, runs initiated, ICE exposed, successful accesses, traps fired, agendas stolen and agendas scored.
- Behind `this.options.matchLocalPostureFeedback` (default `false`), maintain bounded match-local weights or Beta-style priors for the shared scripts. L8.4 now exists, but its profile cache is lifetime-scoped: adaptation of existing shapes requires an explicit option-on refresh at an actual later commitment boundary, not merely at every new Corp turn. New cards use current weights; with epochs disabled, installed profiles stay lifetime-scoped. This is a design clarification from re-grounding, not existing behaviour.
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
F4 gate. Option `matchLocalPostureFeedback` (Corp AI), off in the baseline
and on in the candidate. Committed deck pool, paired seeds, 200 games per deck
pair, bootstrap 95% intervals. This item requires only safety and
unpredictability, without a measured strategic improvement: the Runner AI
does not learn postures, so F4 cannot establish a benefit against a learning human.
Collectors: `postureScriptWeights` (per-game minimum/maximum multipliers and normalized probabilities for each shared script; adds `postureScriptWeights.violations`, counting out-of-bounds multipliers or probabilities below their exploration floor), existing `bluffSingleVariableCorrelation` (batch metric `bluffSingleVariableCorrelation.max`).
Starts: none; feedback is expected to be reached in ordinary remote play in the committed pool. A quick run must demonstrate changed games before this setup is accepted.

| Check | Metric | Better | Threshold |
|---|---|---|---|
| Hard check | `postureScriptWeights.violations` | — | at most 0 in every candidate game; multipliers 0.8–1.2, each normalized script probability at least 0.015 |
| Ceiling | `bluffSingleVariableCorrelation.max` | lower | candidate interval upper bound at most 0.10 |
| Guard | `pointsStolen` | lower | regression at most 0.2 |
| Guard | `pointsScored` | higher | regression at most 0.2 |
| Guard | `winRate` | higher | regression at most 0.02 |

Gate command: `node scripts/ai-batch.js gate --corp-option matchLocalPostureFeedback=true --collector postureScriptWeights --collector bluffSingleVariableCorrelation --max postureScriptWeights.violations=0 --ceiling bluffSingleVariableCorrelation.max=0.10 --guard pointsStolen=0.2 --guard pointsScored=0.2 --guard winRate=0.02`

Re-grounding retained all original thresholds and added the standard
`pointsScored` guard because profile depth and advancement cadence can affect
scoring as well as defence. The correlation collector already exists after
L8.4; its approved threshold relaxation was specific to L8.4 and is not applied here.

## Things to consider
- Sample size drift: in a typical match the Runner might run a remote only 3 to 6 times, and Beta-style priors can swing wildly on tiny samples (for example two wrong guesses in a row). Use strong, conservative prior weights so one or two runs adjust probabilities modestly rather than swinging posture selection.
- `_recentSuccessfulRunPressure` decays and serves protection pressure; do not merge it into the record, which keeps whole-match history for posture feedback.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] The behaviour change ships behind an AI option that defaults to off (named in the Resolution).
- [ ] The gate is ready to run: every collector and start board it names exists and is tested, and a `--quick` run of each gate command completes and reports at least one game changed by the options.
- [ ] Gate evidence is recorded in the Resolution: F4 command, deck pairs, seed count, metrics, baseline vs candidate, and the threshold met. Only then is the option switched on by default.
- [ ] Collector `postureScriptWeights` is built and tested for each script's minimum/maximum weight, normalized probability and per-game bound/floor violations.
- [ ] Existing collector `bluffSingleVariableCorrelation` is validated for adapted profile events through F4's posture telemetry.
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
