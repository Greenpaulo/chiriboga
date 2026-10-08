# Runner AI / Engine: Lionsmane choice crashes after subroutine counter drift

**Source log:** `documentation/debug-logs/bug_raised/lionsmane-subroutine-choice-startup-seeds-6-85.txt`
**Reproduction:** `tests/pending/lionsmane-subroutine-choice-crashes.test.js` — `node tests/pending/lionsmane-subroutine-choice-crashes.test.js` (fails at `c47f80d`, 2026-10-08; working-tree changes present).

## Summary
Startup `jin-anarch` seeds 6 and 85 fail during Lionsmane's third subroutine,
which offers jack out or take 2 net damage. The Runner AI enters this choice
with global `subroutine` equal to 4 although Lionsmane has three subroutines.
Its fallback reads `.sr[3]`, then accesses `.length` on undefined.
The game must resolve an offered legal choice and continue normally.

## Evidence
The archived diagnostic record identifies the two failures at lines 4–6 and
the matching choice boundary at lines 19–25. Lines 27–32 give the crash stack.
Independent instrumented replays of both seeds produced the same state.

## Reproduction
The pending test loads the real RunnerAI and Lionsmane definition in a VM,
reconstructs the observed third-subroutine decision with counter 4, and isolates
the no-acceptable-path fallback. Hand evaluation and path planning are stubbed;
the choice method and modeled subroutine rows are real. It asserts that the
method returns an index into the offered choices without rejecting. Today it
fails at `RunnerAI._internalChoiceDetermination` with the reported TypeError.
This proves the choice-boundary crash, not how the counter reached 4.
It requires no untracked Startup precons; full seeded replays do require them.

## Root cause
- [Verified] The fallback in `RunnerAI._internalChoiceDetermination` assumes
  `.sr[subroutine - 1]` exists and crashes when it does not — pending test.
- [Verified] Both full-game diagnostic replays enter the choice with counter 4
  and three modeled rows — archived diagnostic record.
- [Verified] Lionsmane's model has the same three rows as its printed
  subroutines; adding a fourth row would conceal the invalid counter — card
  definition and pending test.
- [Inferred] The firing/decision sequence advances or reuses the counter beyond
  the intended subroutine. Trace `phases.runSubroutines.Resolve.trigger`,
  `Enumerate.trigger`, `Trigger` and `DecisionPhase` before choosing a repair.
- [Inferred] Returning model choice indexes directly also needs checking:
  affordability can omit offered choices, and cached paths can retain indexes
  for a different subroutine. A bounds guard alone does not establish correct
  resolution or fix the earlier sequencing.

## Proposed fix
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
- [ ] The pending reproduction passes and moves into `tests/`, unchanged.
- [ ] A real-engine test reproduces and fixes the counter drift; every printed
      subroutine fires at most once and the third decision refers to row 2.
- [ ] Cover cached paths, no-path fallback, missing model rows and affordability
      filtering; returned indexes always refer to offered legal choices.
- [ ] Replay Startup `jin-anarch` seeds 6 and 85 to normal completion where the
      source precons are available.
- [ ] New or changed AI hooks, if any, are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
Strategic tuning of Lionsmane choices is separate from preventing this crash.
The invalid `AddBadPublicity` calls were fixed separately; this error existed
in the preceding batch report too. Promise rejection propagation in
`RunnerAI._computeChoice` is another resilience concern to assess separately.
