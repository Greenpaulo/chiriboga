# Corp AI: Méliès U secret department choice is ignored, AI falls back to HQ

**Source log:** `documentation/debug-logs/bug_raised/css_bug_after_melies_identity_flips.txt`
**Reproduction:** `tests/pending/melies-secret-department-choice-ignored.test.js` — `node tests/pending/melies-secret-department-choice-ignored.test.js` (fails at `2dc504d`, 2026-10-14)

## Summary
After each Corp discard phase ends, Méliès U: Only the Brightest (36036) must secretly set its department to HQ, R&D or Archives. The card's `Enumerate` picks the least-iced central server and stores it as `corp.AI.preferred`, but the Corp AI never honours it: `_choiceInner` only matches a title preference when `preferred.title == currentPhase.title`, and the stored card title never equals the trigger decision title ("Secretly set Méliès U"). The AI logs `I don't have code to handle this situation` and returns index 0, so the identity is always secretly set to HQ regardless of ice placement. The Runner later ran R&D (line 132) and the flip went to the HQ side instead of the R&D side.

## Evidence
Log lines (Corp AI acted in both cases):
- `54: Secretly set Méliès U triggered`
- `55: AI: I don't have code to handle this situation: [Secretly set Méliès U,Corp 3.3,continue,[{department:HQ,...},{department:R&D,...},{department:Archives,...}]]`
- `118-119`: identical trigger + fallback one turn later.
- `132-138`: `Run initiated attacking R&D` … `Méliès U: Only the Brightest flipped to Tenure Floors` (the HQ side) — the wrong face for an R&D run under the card text ("When you flip this identity to this side during a run on R&D…", Side 2; HQ is Side 1).
- `145`: `0 recorded` decision snapshots, so no fixture extraction was possible.

## Reproduction
Purpose-built pending test (object-identity options can't replay from a static `OPTIONS` list): calls the card's real `responseOnCorpDiscardEnds.Enumerate` with HQ holding 2 ice and R&D/Archives empty, then replays the decision through the real `CorpAI.Choice(choices, 'select')` under `currentPhase.title = 'Secretly set Méliès U'`, `executingCommand = 'continue'` (exactly the logged tuple). Control case passes (preference stored = R&D option). Bug case fails: the AI logs the unhandled-situation fallback and returns 0 (HQ) instead of 1 (R&D):
`FAIL bug: CorpAI.Choice ignores the stored department and falls back to index 0 … 0 !== 1`.

## Root cause
- [Verified] `responseOnCorpDiscardEnds.Enumerate` (sets/vantagepoint.js) stores the least-iced central as `corp.AI.preferred = {title: <card title>, option}` — pending test control case.
- [Verified] `CorpAI.Choice` on those options logs the fallback and returns index 0 — pending test bug case.
- [Verified] The preference can't match: `_choiceInner` (ai_corp.js) requires `preferred.title == currentPhase.title`, but the stored title is the card title while the decision title is the response `text` "Secretly set Méliès U" (phase.js trigger `Resolve` passes the response text as the `DecisionPhase` title).
- [Inferred] Same mismatch pattern affects the follow-up decisions: `_resolveDepartmentEffect` and the Archives-recur choice store `title: this.title` but open their `DecisionPhase` under `this._departmentTitle()` — so keep/trash and recur-to-HQ preferences likely fall through the same way (not yet reproduced).

## Proposed fix
Fix the general mechanism, not this card: make trigger-opened `DecisionPhase` preferences matchable — e.g. match a stored `preferred.option` by object identity when it is one of the offered objects, or align the stored title with the decision title at the call sites. Touchpoints: `_choiceInner` (ai_corp.js), `DecisionPhase` + trigger `Resolve` (phase.js), `SelectChoice` path (command.js), Méliès U hooks (sets/vantagepoint.js). Rejected: hardcoding a department, or choosing by hidden information (the inputs here — ice counts, R&D top card vs Archives elo — are all Corp-visible). Fixing the mechanism also shifts every other card that stores `title: this.title` against a differently-titled `DecisionPhase`; audit those call sites in the same change.

## Acceptance gate
N/A — deterministic fix (principle 4): a `corp.AI.preferred` option stored by a card's own `Enumerate` from the offered option objects must be the decision returned by `CorpAI.Choice`.

## Acceptance criteria
- [ ] The reproduction passes and has moved into the green suite (`tests/`), expectation unchanged.
- [ ] A variation covers a second shape of the same mechanism (e.g. Archives least-iced, or the department-effect keep/trash decision).
- [ ] New or changed AI hooks are documented in `documentation/ai.md`.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Whether least-iced-central is the *best* secret-set strategy is untouched; this ticket only restores the AI's ability to execute its stored choice.
- No existing ticket covers Méliès U (searched `documentation/bugs/` and `documentation/backlog/`).
