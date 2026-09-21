# Corp AI finding 5: Over-advance hold has no win exemption

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 5.
**File:** `ai_corp.js` — `Phase_Score()` (~4170). Line numbers drift; search by function name.
**Belongs in:** Bug ticket. The findings say `documentation/backlog/bugs.md`; that path does not exist (the old file lives at `documentation/bugs/done/bugs.md`). Live tickets are raised under `documentation/bugs/` (see the `code-review/*.md` ticket format used by the recent "Added fixture files, raised bug tickets" commits). Raise it there.
**Suggested order:** Step 2 of 5 — quick fixes.
**Depends on:** Nothing.

---

## Problem

For `AIOverAdvance` cards, `Phase_Score` returns "don't score yet" until `AIAdvancementLimit`, even when scoring the agenda wins the game. The AI can therefore hold a game-winning score.

## Proposed fix

- If `AgendaPoints(corp) + card points >= AgendaPointsToWin()`, always score.

## Tests / acceptance criteria

- An over-advance agenda that reaches the winning agenda-point total is scored immediately, ignoring `AIAdvancementLimit`.
- Below the winning total, the existing over-advance hold behaviour is unchanged.
- Uses the engine's own agenda-point helpers rather than a duplicated constant.

## Related

Findings 6 and 7 are also about the `AIOverAdvance` hook and should be fixed in the same pass; finding 7 decides the hook's final contract (boolean vs numeric).
