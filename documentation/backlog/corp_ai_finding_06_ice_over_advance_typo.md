# Corp AI finding 6: Typo means the ICE over-advance check never fires

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 6.
**File:** `ai_corp.js` — `Phase_Main` (~5452): `installedCards[i].advancement.AIOverAdvance`. Line numbers drift; search by function name.
**Belongs in:** Bug ticket under `documentation/bugs/` (the findings' `documentation/backlog/bugs.md` path does not exist).
**Suggested order:** Step 2 of 5 — quick fixes.
**Depends on:** Nothing.

---

## Problem

`advancement` is a number, so `installedCards[i].advancement.AIOverAdvance` is always `undefined`. It is latent: no ICE currently sets `AIOverAdvance`, so no live behaviour depends on it. It will silently do nothing the first time an ICE declares the hook.

## Proposed fix

- Change `installedCards[i].advancement.AIOverAdvance` to `installedCards[i].AIOverAdvance`.

## Tests / acceptance criteria

- An installed ICE with `AIOverAdvance` set is detected by the check (assert the branch is reached), whereas the old property access is not.
- A test that would have failed against `advancement.AIOverAdvance` guards against the typo returning.

## Related

Findings 5 and 7 concern the same hook; confirm the hook's shape (finding 7) before/with this fix.
