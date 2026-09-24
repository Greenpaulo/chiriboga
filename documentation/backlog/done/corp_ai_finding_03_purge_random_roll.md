# Corp AI finding 3: Purge is a random roll instead of a value decision

**Status:** Corrected after implementation review on 23 September 2026; ready for code review.

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

The guarded hypothetical clears virus counters and removes cards declaring
`AIDisabledByPurge` from the hypothetical installed state, then restores their
exact locations, ordering, own-property state, and values in a `finally` block.
Clot and Physarum Entangler declare that hook. The separate
critical-central path remains probability based because it compares a specific
immediate game-loss risk before and after purge.

Regression coverage includes Botulus counters, a zero-counter purge-trash card,
Clot opening a score window, deterministic repeat evaluation, and restoration
after an evaluator exception. Raw counter totals, card-title checks and RNG no
longer decide the ordinary purge.

## Implementation review correction — 23 September 2026

Review against the production engine found that the initial hypothetical was
not valid: it set an ad-hoc `card.disabled` property, while the real
`CheckHasAbilities()` does not consult that property. The focused test harness
did, masking the discrepancy. A purge-trash card could therefore remain active
in real AI evaluation.

The corrected hypothetical temporarily detaches cards declaring
`AIDisabledByPurge` from their actual installed arrays and marks them
`notInstalled`. It restores their exact array positions, prior `notInstalled`
ownership/value, and virus counters in `finally`, including when evaluation
throws. This represents the post-purge absence consumed by `InstalledCards()`,
`ActiveCards()`, and `CheckInstalled()` without invoking live move/trash
triggers during planning.

The review also narrowed central-server stakes. A nonempty R&D or Archives no
longer justifies spending the whole Corp turn on an ordinary purge by itself;
the central must contain agenda points. HQ still requires an agenda in hand,
and remotes still require an agenda, ambush, or hostile card. Added regressions
cover unmodeled counters regardless of quantity, deterministic behavior with
`Math.random` made unusable, a central with no agenda, real installed-location
removal, exact restoration, and exception safety.

Finally, purge-triggered trash is preventable. _Sacrificial Construct_ now
declares `AIPreventsPurgeTrash`. While public prevention is active, the
hypothetical conservatively keeps purge-trash cards installed but still clears
virus counters. This prevents the Corp from spending its turn for a security or
scoring transition the Runner can publicly stop.

## Verification

- `node -c ai_corp.js`: passed.
- `node tests/corp-server-security.test.js`: **112 regression cases passed**.
- `node tests/run-all-tests.js`: **19 test files passed**, including the Corp decision-fixture and decision-snapshot suites.
- `git diff --check`: passed.
