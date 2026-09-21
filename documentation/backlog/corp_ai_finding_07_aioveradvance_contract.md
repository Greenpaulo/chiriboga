# Corp AI finding 7: `AIOverAdvance` is documented boolean but is a function on two cards

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 7.
**File:** `documentation/ai.md` (~1528, and the hook table ~1860) says boolean; `sets/elevation.js` defines `AIOverAdvance` as a function returning 2 (_Project Ingatan_ ~3339, _Sericulture Expansion_ ~8804). Consumers: `ai_corp.js` and `phase.js`.
**Belongs in:** Bug ticket under `documentation/bugs/` (the findings' `documentation/backlog/bugs.md` path does not exist).
**Suggested order:** Step 2 of 5 — quick fixes.
**Depends on:** Nothing, but fixes the contract that findings 5 and 6 rely on.

---

## Problem

- `ai_corp.js` and `phase.js` only test truthiness, so the returned "2" is ignored.
- Neither card declares `AIAdvancementLimit`, so nothing appears to cap their advancement — unlike the other 7 cards using the hook, which are boolean and pair it with `AIAdvancementLimit`.

## Proposed fix (choose one and make the docs match)

- Honour the numeric value in `_advancementLimit()`, so `AIOverAdvance` returning N means "advance to N", **or**
- Change _Project Ingatan_ and _Sericulture Expansion_ to boolean plus an explicit `AIAdvancementLimit`, matching the other 7 cards.
- Update `documentation/ai.md` (the `AIOverAdvance` section and the hook summary table) to state the chosen schema.

## Tests / acceptance criteria

- Both cards are advanced to the intended counter count.
- `ai.md`'s stated schema matches what the cards declare and what the AI reads.
- A test asserts the cap actually stops advancement (guards the "nothing caps them" case).
