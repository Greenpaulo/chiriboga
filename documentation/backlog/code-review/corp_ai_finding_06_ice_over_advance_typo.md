# Corp AI finding 6: Typo means the ICE over-advance check never fires

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 6.
**File:** `ai_corp.js` — `Phase_Main` (~5452): `installedCards[i].advancement.AIOverAdvance`. Line numbers drift; search by function name.
**Belongs in:** Bug ticket under `documentation/bugs/` (the findings' `documentation/backlog/bugs.md` path does not exist).
**Suggested order:** Step 2 of 5 — quick fixes.
**Depends on:** Nothing.
**Status:** Resolved with a different fix on 23 September 2026; the proposed property substitution was rejected after validating the hook contract.

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

## Resolution — 23 September 2026

The dead property access was confirmed, but changing it to `installedCards[i].AIOverAdvance` would not be correct. `AIOverAdvance` is an agenda-only boolean that keeps the advance action available after an agenda is scoreable; it is not an alternate advancement target and should not override `AIAdvancementLimit()` for ICE.

The invalid ICE clause was removed. Advancement selection now uses the computed advancement limit consistently for agendas, ICE, and generic advance choices, so a card at its limit is skipped even if it has an extraneous truthy `AIOverAdvance` property. Regression coverage verifies that a capped card is skipped in favour of an eligible target.
