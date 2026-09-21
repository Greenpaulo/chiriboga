# Corp AI finding 4: Mulligan is aggressive, redundant and never compares to a fresh hand

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 4.
**File:** `ai_corp.js` — `Phase_Mulligan()` (~3527). Line numbers drift; search by function name.
**Belongs in:** Install roadmap (`documentation/corp-ai/roadmaps/corp_ai_install_decision_roadmap.md`), new `### Phase 10: Opening-Hand Evaluation and Mulligan [PROPOSED]`, after Phase 9.
**Suggested order:** Step 5 of 5 — after the harness, quick fixes, evaluator fixes and Install Phase 2.
**Depends on:** The seeded AI-vs-AI harness (finding 12) and its Phase 0 baseline, for calibration; the opening-hand EV model should reuse the deck composition data (`decks.js`).

---

## Problem

- It mulligans unless the hand has at least 2 affordable ICE and no more than 2 agendas. With 15 ICE in 45 cards, about 45% of opening hands have fewer than 2 ICE, and the affordability filter makes it more.
- Economy cards are ignored.
- Condition 2 and the later `< 2` check are already covered by Condition 3.
- It never compares the hand with the alternative, a fresh five.

## Proposed fix

- Score the hand: ICE by cost, economy presence, agenda count.
- Compare that score with the expected value of a fresh hand, computed from the Corp's own deck composition (not a fixed heuristic).
- Calibrate the thresholds/weights with the harness (finding 12).

## Tests / acceptance criteria

- A hand with a strong economy start but one ICE is not automatically mulliganed when its EV beats a fresh five.
- Redundant conditions 2 and `< 2` are removed; behaviour is unchanged where they overlapped with condition 3.
- Deterministic under a fixed seed.
- Harness run before/after shows the mulligan rate and opening-hand quality are measured, not guessed.
