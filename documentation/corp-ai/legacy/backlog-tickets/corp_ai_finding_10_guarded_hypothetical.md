# Corp AI finding 10: Unguarded hypothetical in `Phase_Main`, plus an array `<` comparison

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 10.
**File:** `ai_corp.js` — `Phase_Main` (~5512); `_iceInstallScore()` (~121, currently unused). Line numbers drift; search by function name.
**Belongs in:** Bug ticket for the `<` comparison, under `documentation/bugs/`. Shared infrastructure → Foundations doc F2: one guarded `_withHypothetical()` helper.
**Suggested order:** Step 2 of 5 — quick fixes (the `<` comparison and the try/finally are cheap, local changes).
**Depends on:** Finding 11 owns the shared helper; this finding is one of its first conversions.

---

## Problem

- `corp.creditPool += this._clicksLeft() - 1` is rolled back manually, not in `try/finally`. If anything in between throws, the Corp's credits are left inflated. `_icePreventsGameWinningBreach()` and `_criticalBreachDefenseAction()` already do this correctly.
- `_iceInstallScore()` (~121, currently unused) mutates without a guard too.
- `rankedInstallOptions < this._rankedInstallOptions(...)` compares arrays with `<`. It works only because plain objects stringify to `"[object Object]"`. It is accidental, not intentional.

## Proposed fix

- Compare `.length` instead of the arrays themselves.
- Route all hypotheticals through one guarded `_withHypothetical()` helper (finding 11 / foundations F2).
- Convert `_iceInstallScore()`'s mutation to the same helper, or delete it with Install Phase 2 if still unused.

## Tests / acceptance criteria

- The install-option comparison reflects relative counts, not string coercion.
- Throwing inside the hypothetical leaves credits (and any other mutated state) exactly as they were.
- `_iceInstallScore()`'s mutation is guarded (or the function is gone).
