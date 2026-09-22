# Corp AI finding 3: Purge is a random roll instead of a value decision

**Status:** Implemented after design review on 22 September 2026.

**Source:** `documentation/backlog/corp_ai_review_findings.md`, item 3.
**File:** `ai_corp.js` — `Phase_Main` purge branch (~5238) and `_criticalBreachDefenseAction()` (~4950). Line numbers drift; search by function name.
**Belongs in:** Security roadmap, new `#### Layer 7.3 ... [FOLLOW-UP]`, after 7.2.
**Suggested order:** Step 5 of 5 — after the harness, quick fixes, evaluator fixes and Install Phase 2.
**Depends on:** Findings 2 and 11 (guarded hypothetical and the evaluation cache), plus the harness (12) for calibration.

---

## Problem

`Phase_Main` rolls `RandomRange(2, 10)` per Runner card against its virus counters, with a `Clot` title check. It ignores whether the counters matter and spends all three clicks on a coin flip. The tactical purge in `_criticalBreachDefenseAction()` is already evidence-based, but only for central pressure.

## Proposed fix

- Add `_purgeValue()`.
  - Use a guarded hypothetical that zeroes the virus counters on installed Runner cards and restores them exactly (see finding 11's `_withHypothetical()` helper).
  - Compare `_evaluateServerSecurity()` before and after, plus `_centralBreachLossRisk(server, { afterPurge: true })`.
  - Weight by server value. Purge only above a threshold.
  - Drop the RNG and the `Clot` check.
- Virus counters currently matter through `_virusCountersReduceStrength()`, hosted virus breakers, and `AICentralPressureAfterPurge`.

## Tests / acceptance criteria

- Counters that make a route breakable: purge chosen.
- Counters the evaluator does not model: no purge, whatever the count.
- Same state gives the same decision with `Math.random` stubbed.
- Counters are restored even if the evaluator throws.

## Related change: install roadmap Phase 7 note

Add a note in Install roadmap Phase 7: purge and tag-trash sit above install in the `Phase_Main` ladder, so they must be part of the install-vs-other-actions comparison.

## Resolution

The proposed weighted `_purgeValue()` was not adopted. Review found that its
server weights and threshold had no calibration basis, and merely zeroing virus
counters missed cards such as Clot and Physarum Entangler that are trashed by a
purge even with no counters.

The ordinary main-phase decision now uses `_ordinaryPurgeOutcome()` and requires
one concrete, full-turn-worthy state transition:

- a currently unavailable immediate agenda score becomes available; or
- a currently breachable server with real stakes becomes secure.

The guarded hypothetical clears virus counters and disables cards declaring
`AIDisabledByPurge`, then restores both own-property state and values in a
`finally` block. Clot and Physarum Entangler declare that hook. The separate
critical-central path remains probability based because it compares a specific
immediate game-loss risk before and after purge.

Regression coverage includes Botulus counters, a zero-counter purge-trash card,
Clot opening a score window, deterministic repeat evaluation, and restoration
after an evaluator exception. Raw counter totals, card-title checks and RNG no
longer decide the ordinary purge.
