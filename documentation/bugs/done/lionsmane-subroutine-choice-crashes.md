# Runner AI: Stick and Poke model mismatch crashes subroutine choices

**Outcome:** adopted

**Source log:** `documentation/debug-logs/bug_raised/lionsmane-subroutine-choice-startup-seeds-6-85.txt`
**Reproduction:** `tests/pending/lionsmane-subroutine-choice-crashes.test.js` — `node tests/pending/lionsmane-subroutine-choice-crashes.test.js` (fails at `c47f80d`, 2026-10-08; working-tree changes present).


## Resolution

Implemented from e894637, 2026-10-08.

Both reported cases are the same model-alignment defect. Instrumented baseline
replays of `jin-anarch` seeds 6 and 85 confirm Stick and Poke is active on
Lionsmane: four actual subroutines, three modeled rows, and the added row at
index 0. Counter 4 correctly identifies the last actual row. The old claim of
engine counter drift was mistaken; engine sequencing is unchanged.

Stick and Poke's existing `AIModifyIceAI` retains the added damage row for its
active encounter after `usedThisTurn` becomes true. Default ICE models already
contain all actual rows, so their added row is replaced rather than duplicated.
The calculator applies broken flags after passive modifiers so breaking the
added or printed rows cannot blank the wrong modeled row. Runner choice
selection rejects out-of-range cached/positional indexes and returns legal
menu index 0 when the modeled row is missing. This fallback makes no claim of
strategic superiority. The hook contract and prospective route rule are unchanged.

**Classification:** objective invariant repair: actual and modeled subroutine
identities align, and selections refer to offered legal choices. Strategic
tuning is excluded, so no seeded strategic acceptance gate or AI option is needed.

**Tests:** both original reproductions pass with assertions unchanged, moved to
`tests/lionsmane-subroutine-choice-crashes.test.js` and
`tests/stick-and-poke-active-encounter-model.test.js`. Commands:
`node tests/lionsmane-subroutine-choice-crashes.test.js` and
`node tests/stick-and-poke-active-encounter-model.test.js`.
`node tests/stick-and-poke-subroutine-alignment.test.js` covers prospective/live/
ended encounters, other ice, default ICE models, every broken row, real phase
subroutine enumeration/firing and Trigger dispatch, cached/no-path selection,
missing rows and payment filtering. It confirms all four actual Lionsmane rows
fire once and the third printed decision uses actual/model index 3 (index 2
only when unmodified). The original counter-drift acceptance criterion was
corrected to this verified invariant.

**Seeded verification:** separate `playGame()` processes using Startup sets
(systemgateway, elevation, vantagepoint), stream prefixes `<seed>:<pair>`,
30-second timeout, `[Startup] High Pressure Ryo.js` and the source Corp precons.
An observation wrapper records actual/model lengths at Runner subroutine
choices. Baseline diagnostic runs caught the crash and returned menu index 0
only to let diagnostics finish; their completion is not fix evidence. After
implementation the wrapper only observes and delegates, with no catch or
substituted choices. All five games completed with zero errors:

| Pair / Corp precon | Seed | Winner / reason | Turns | Actual/model rows at modified decision |
| --- | --- | --- | --- | --- |
| jin-anarch / [Startup] Going to School.js | 6 | Corp / agenda points | 20 | Lionsmane 4/4 |
| jin-anarch / [Startup] Going to School.js | 85 | Runner / Corp deck-out | 41 | Lionsmane 4/4 |
| btl-ryo / [Startup] De Profundis (3-0 Worlds 2026).js | 101 | Runner / Corp deck-out | 37 | Event Horizon 3/3 |
| btl-ryo / [Startup] De Profundis (3-0 Worlds 2026).js | 167 | Corp / agenda points | 23 | Event Horizon 3/3 |
| btl-ryo / [Startup] De Profundis (3-0 Worlds 2026).js | 171 | Corp / agenda points | 26 | Event Horizon 3/3 |

**Docs:** the existing hook behavior is documented in `documentation/ai.md`;
[run calculation](../../runner-ai/architecture.md#run-selection-and-the-run-calculator) and
[encounters and breaking](../../runner-ai/architecture.md#encounters-and-breaking)
describe the aligned rows and legal menu handling. No new hooks or contracts.
No known issue remains in scope. Unrelated Humanoid Resources edits are preserved.

**Full regression:** `node tests/run-all-tests.js` passed: 69 test files,
including `tests/corp-decision-fixtures.test.js` and
`tests/decision-snapshots.test.js`. The final
`node scripts/ticket.js check documentation/bugs/code-review/lionsmane-subroutine-choice-crashes.md`
passed, including the complete suite and unchanged reproduction comparison.

## Implementation plan

Proposed at `e894637`, 2026-10-08. **Approved 2026-10-08.**

- **Validation:** Startup `btl-ryo` seeds 101, 167 and 171 independently crash
  at `ai_runner.js:1694`. Instrumented seed 101 identifies Event Horizon with
  three actual subroutines, counter 3, and only two modeled rows. Stick and
  Poke is active, `usedThisTurn` is true, and its added damage/draw subroutine
  is the first actual row. The final payment menu offers `srChoice` 0 and 1.
  Thus an out-of-range model row does not establish engine counter drift.
  The original Lionsmane reproduction still fails, but its explanation of
  counter 4 needs rechecking for this same modifier before changing sequencing.
- **Approach:** repair Stick and Poke's existing `AIModifyIceAI` implementation
  so its added row remains modeled throughout the active encounter, including
  the damage and broken-row alignment. Preserve prospective route behavior and
  remove the row when the encounter ends. Independently verify the actual
  firing identity and cached/fallback mappings; add bounds resilience to
  `RunnerAI._internalChoiceDetermination` only if still necessary after model
  alignment, without claiming an arbitrary legal fallback is strategically
  better. Do not change shared engine sequencing without evidence of a
  remaining sequencing defect. Do not pad the printed card's model permanently.
- **Tests:** new pending
  `tests/pending/stick-and-poke-active-encounter-model.test.js` fails at this
  commit with `2 !== 3`, using the real encounter callback and both card
  hooks. Cover before/during/after encounters, modified and unmodified ice,
  broken rows, payment filtering and cached/no-path choices. Move passing
  reproductions unchanged; replay all three reported seeds and the original
  Lionsmane seeds; run the full regression suite.
- **Risk:** changing model alignment can affect run planning as well as the
  immediate choice. The invariant is actual/model subroutine identity and
  legal offered indexes, an objective correctness repair, with strategic
  tuning excluded. Retain the existing hook contract.
- **Docs:** document the hook behavior in `documentation/ai.md` and update
  Runner architecture where appropriate. Record the verified correction to
  the original counter-drift hypothesis in the resolution.

## Additional Startup evidence (2026-10-08)

All three `btl-ryo` seeds (101, 167, 171) reproduced the same crash on
`e894637`, with Event Horizon, counter 3 and three actual rows at the offered
payment decision. A further instrumented seed 101 reported two model rows
and identified Stick and Poke as the live encounter modifier. The new pending
reproduction proves its `AIModifyIceAI` returns before adding the live row
because `usedThisTurn` is true. This is a verified model mismatch. Pickup replays of the original Lionsmane
seeds confirm the same modifier and disprove the earlier engine-counter
diagnosis, as recorded in the Resolution.

## Summary
Startup `jin-anarch` seeds 6 and 85 fail during Lionsmane's third subroutine,
which offers jack out or take 2 net damage. The Runner AI enters this choice
with global `subroutine` equal to 4 although Lionsmane has three printed subroutines.
Its fallback reads `.sr[3]`, then accesses `.length` on undefined.
Replays now verify four actual subroutines because Stick and Poke prepends one;
the counter is valid, but the live AI model omits the added row. The additional
Event Horizon evidence is the same defect with two printed rows and three actual
rows. The game must resolve an offered legal choice and continue normally.

## Evidence
The archived diagnostic record identifies the two failures at lines 4–6 and
the matching choice boundary at lines 19–25. Lines 27–32 give the crash stack.
Independent instrumented replays of both seeds produced the same state.

## Original reproduction
The pending test loads the real RunnerAI and Lionsmane definition in a VM,
reconstructs the observed third-subroutine decision with counter 4, and isolates
the no-acceptable-path fallback. Hand evaluation and path planning are stubbed;
the choice method and modeled subroutine rows are real. It asserts that the
method returns an index into the offered choices without rejecting. At pickup it
failed at `RunnerAI._internalChoiceDetermination` with the reported TypeError.
This proves the choice-boundary crash, not how the counter reached 4.
It requires no untracked Startup precons; full seeded replays do require them.

## Root cause
- [Verified] The fallback in `RunnerAI._internalChoiceDetermination` assumes
  `.sr[subroutine - 1]` exists and crashes when it does not — pending test.
- [Verified] Both full-game diagnostic replays enter the choice with counter 4
  and three modeled rows — archived diagnostic record.
- [Superseded] The original diagnosis said adding a fourth modeled row would
  conceal an invalid counter. Seeded replays prove Stick and Poke adds a real
  fourth row; the model must include it for this encounter.
- [Superseded inference] The firing/decision sequence advances or reuses the counter beyond
  the intended subroutine. Trace `phases.runSubroutines.Resolve.trigger`,
  `Enumerate.trigger`, `Trigger` and `DecisionPhase` before choosing a repair.
- [Inferred] Returning model choice indexes directly also needs checking:
  affordability can omit offered choices, and cached paths can retain indexes
  for a different subroutine. A bounds guard alone does not establish correct
  resolution or fix the earlier sequencing.

## Original proposed fix (superseded by approved plan)
Preserve the identity of the subroutine whose decision is pending across
firing, nested phases and AI evaluation. Correct the counter sequencing at its
source, and ensure the Runner AI fallback tolerates missing/stale model data
without returning an invalid offered-choice index. Check cached-path and
fallback choice mapping together. Do not add a Lionsmane title exception,
clamp the counter to the final row, or add a fictitious modeled subroutine.

## Acceptance gate
N/A — deterministic fix (principle 4): legal subroutine choices resolve without
exceptions, using the pending subroutine's identity and offered options.

## Acceptance criteria
- [x] The pending reproduction passes and moves into `tests/`, unchanged.
- [x] A real-engine phase test verifies valid sequencing; every actual
      subroutine fires at most once and the third printed decision refers to
      row 3 with Stick and Poke's added row (row 2 without it).
- [x] Cover cached paths, no-path fallback, missing model rows and affordability
      filtering; returned indexes always refer to offered legal choices.
- [x] Replay Startup `jin-anarch` seeds 6 and 85 to normal completion where the
      source precons are available.
- [x] New or changed AI hooks, if any, are documented in `documentation/ai.md`.
- [x] `node tests/run-all-tests.js` passes.

## Out of scope / related
Strategic tuning of Lionsmane choices is separate from preventing this crash.
The invalid `AddBadPublicity` calls were fixed separately; this error existed
in the preceding batch report too. Promise rejection propagation in
`RunnerAI._computeChoice` is another resilience concern to assess separately.
