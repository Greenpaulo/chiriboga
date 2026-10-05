# Corp AI finding 4: Mulligan is aggressive, redundant and never compares to a fresh hand

**Status:** Fixed and regression-tested on 23 September 2026.

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

## Resolution

The diagnosis was correct, but the seeded batch harness is not a correctness
dependency for this decision. On a mulligan, the five cards in HQ return to
R&D before the Corp draws again, so the exact redraw population is already
known to the Corp AI: `HQ + R&D`. The implementation now compares the current
hand with the analytically calculated expected score of a fresh hand from that
population. It uses hypergeometric probabilities and contains no random roll.

The score rewards cheap ICE more than expensive or initially unaffordable ICE,
rewards economy presence with diminishing returns, and applies an escalating
penalty to the second and later agendas. Transactions and Advertisements are
recognized from card subtypes. Nonstandard economy assets can declare the new
boolean `AIEconomyCard` hook; Regolith Mining License and Anthill Excavation
Contract now do so. This avoids extending the legacy economy title list.

All duplicated ICE-count and agenda-count branches in `Phase_Mulligan()` were
removed. A focused regression proves both directions of the comparison, cheap
versus unaffordable ICE valuation, and the agenda-flood penalty. The previously
pending one-ICE/three-economy fixture is now green and has moved into the normal
fixture suite.

The proposed batch harness remains useful for later empirical calibration of
the score weights and for reporting aggregate mulligan rate, but blocking the
deterministic fix on that separate infrastructure would be unnecessary. Thus
the final acceptance bullet is retained as calibration follow-up rather than a
prerequisite for this bug fix.

## Verification

- `node tests/corp-mulligan.test.js`: passed.
- `node tests/corp-decision-fixtures.test.js`: passed, including the promoted mulligan fixture.
- `node tests/decision-snapshots.test.js`: passed.
- `node tests/run-all-tests.js`: passed.
- `git diff --check`: passed.
