# F2 Guarded hypothetical evaluation: remaining migrations

**Roadmap item:** F2 · **Depends on:** none · **Sets:** vantagepoint (Baker)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Every Corp planning probe that temporarily changes game state goes through
one exception-safe helper, and that helper is the only place state is changed
by hand. Two things follow. A throw during evaluation can never leave credits,
clicks, tags, ICE arrays, rez state, run context or the phase altered. And F3
(the per-decision evaluation cache) can tell reliably when it is inside a
hypothetical, because every hypothetical passes through code that keeps a
depth count. This ticket also fixes the accidental array `<` comparison in
`Phase_Main` (review finding 10) and the unrestored phase in
`_potentialTagPunishment()`
([bug ticket](../bugs/potential-tag-punishment-never-restores-phase.md)).

## Current behaviour
`_withHypothetical(apply, evaluate, restore)` exists: `try { apply(); return
evaluate(); } finally { restore(); }`. Only `_ordinaryPurgeOutcome()` uses it.
Every other probe changes state by hand, some with a hand-written
`try/finally` and some with none. None of them is visible to a cache that
looks for `_withHypothetical()`. See
[architecture: foundations](../corp-ai/architecture.md#foundations).

Inventory, from `rg -n` over `ai_corp.js`, `runcalculator.js` and the `AI*`
and `_*` functions in `sets/*.js`. The patterns searched were assignments to
`creditPool`, `clickTracker`, `.rezzed`, `.tags`, `.virus`, `.notInstalled`,
`attackedServer`, `approachIce`, `encountering` and `currentPhase.identifier`;
`push`/`splice`/`pop` on `.ice` and `remoteServers`; and
`AIIceEncounterModifyState(`. Search by function name; line numbers drift.

| # | Function (file) | State changed by hand | Guard today | Evaluates inside | Migration |
|---|---|---|---|---|---|
| 1 | `_ordinaryPurgeOutcome` (ai_corp.js) | Runner virus counters, `notInstalled` | `_withHypothetical` | purge outcome | Done: the reference pattern |
| 2 | `_icePreventsGameWinningBreach` (ai_corp.js) | `card.rezzed`, `corp.creditPool`; `server.ice.splice` out and back | hand-written `try/finally` (two blocks) | `_evaluateServerSecurity` | Migrate both probes |
| 3 | `_iceWouldSecureServer` (ai_corp.js) | same as #2 (duplicate body) | hand-written `try/finally` | `_evaluateServerSecurity` | Migrate; share one with/without-ICE helper with #2 |
| 4 | `_criticalBreachDefenseAction` (ai_corp.js) | `corp.creditPool`; `risk.server.ice.push`/`pop` | hand-written `try/finally` | `_centralBreachLossRisk` (calls the security evaluator) | Migrate |
| 5 | `_effectiveRunnerCreditPool` (ai_corp.js) | `attackedServer` | hand-written `try/finally` | Runner `canUseCredits`, `AIRunPoolCreditOffset` hooks | Migrate to the shared run-context wrapper |
| 6 | `_effectiveIceSubtypes` (ai_corp.js) | `encountering`, `attackedServer`, `approachIce` via `AIIceEncounterSaveState`/`ModifyState`/`RestoreState` (ai_runner.js) | hand-written `try/finally` | `AIEffectiveIceSubtypes`, `modifySubTypes.Resolve` | Migrate to the shared encounter wrapper |
| 7 | `_potentialTagPunishment` (ai_corp.js) | `runner.tags`, `corp.clickTracker`, `corp.creditPool`, `currentPhase.identifier` | **none**; the phase is never restored (`==` for `=`) | `_useWhenTaggedCard` (card `AIWouldPlay`, `FullCheckPlay`) | Migrate; closes the [bug ticket](../bugs/potential-tag-punishment-never-restores-phase.md) |
| 8 | `Phase_Main` "gain a credit, then install" check (ai_corp.js) | `corp.creditPool += _clicksLeft() - 1` and manual rollback | **none** | `_rankedInstallOptions` (calls the security evaluator) | Migrate; compare `.length` instead of arrays with `<` |
| 9 | `_iceInstallScore` (ai_corp.js) | `serverToInstallTo.ice.push`/`splice`, or a fake remote pushed onto `corp.remoteServers` | **none** | `Strength`, `_aCompatibleBreakerIsInstalled` | Delete: its only caller, `_bestIceToInstall`, has no callers (and writes `AIIceInstallScore` onto card objects) |
| 10 | Baker `_stealthCreditCards` (sets/vantagepoint.js), used by Baker's `AIRedirectsRun` | `attackedServer` | hand-written `try/finally` | Runner `canUseCredits` | Migrate to the shared run-context wrapper |
| 11 | `RunCalculator.IceAI` (runcalculator.js; shared with the Runner AI, reached from Corp security through `_securityRunCalculator`/`_securityIceAI`) | `encountering`, `attackedServer`, `approachIce` via `AIIceEncounterModifyState` | **none** around `Strength(ice)` | `Strength` (card strength modifiers) | Migrate to the shared encounter wrapper |

Out of Corp scope, recorded so the ratchet below can list them: the Runner
AI's paired hooks `AIPrepareHypotheticalForRC`/`AIRestoreHypotheticalFromRC`
(Botulus) and `AIRunEventModify`/`AIRunEventRestore` (Tread Lightly,
Aircheck). `ai_runner.js` calls both pairs without `finally`. They belong to
the Runner's principle debt.

Correction to the earlier version of this ticket: it said
`_icePreventsGameWinningBreach()` and `_criticalBreachDefenseAction()`
"already restore correctly". They restore on a throw, but by hand. A cache
keyed on `_withHypothetical()` would not see them and would serve the
real-board result to both the with-ICE and the without-ICE probe (rows 2 to
4), which silently turns those checks off.

## Design
- **One guarded mechanism.** `_withHypothetical(apply, evaluate, restore)`
  stays the Corp entry point. It also maintains a hypothetical depth count:
  increment before `apply`, decrement in `finally`. Nested hypotheticals are
  allowed.
- **Shared wrappers for run and encounter context.** Rows 5, 6, 10 and 11
  need a prospective run or encounter context from code that is not a
  `CorpAI` method (Baker, `runcalculator.js`). Add one narrow wrapper for each:
  - a run context: `attackedServer = server`;
  - an encounter context: `encountering`, `attackedServer` and `approachIce`,
    built on the existing `AIIceEncounterSaveState`/`RestoreState`.

  Both wrappers restore in `finally` and update the **same** depth count as
  `_withHypothetical()`. Keep one counter, in a file that both AIs and
  `runcalculator.js` load (for example beside `AIIceEncounterSaveState` in
  `ai_runner.js`, or in `utility.js`), and have `_withHypothetical()` use it.
  Two counters would let F3 miss a hypothetical.
- **Rows 2 and 3:** one helper evaluates "this ICE rezzed and paid for" and
  "this ICE removed" as two `_withHypothetical()` calls. Both functions use it.
- **Row 7:** `restore` must reassign all four fields, including
  `currentPhase.identifier`.
- **Row 8:** replace `rankedInstallOptions < this._rankedInstallOptions(...)`
  with a comparison of `.length`. The array `<` works only because plain
  objects stringify to `"[object Object]"`, so a longer array compares greater
  as a string.
- **Row 9:** delete `_iceInstallScore()` and `_bestIceToInstall()`. The
  Palisade title check goes with them (P1 row, owner I2).
- **Ratchet test** `tests/corp-ai-hypothetical-mutation.test.js`, built the
  same way as `tests/corp-ai-card-titles.test.js`:
  - It scans `ai_corp.js`, `runcalculator.js`, and the `AI*` and `_*`
    functions in `sets/*.js`, using the patterns listed above.
  - Each match is keyed as `<file>: <function>`. A match is allowed only
    inside the `apply`/`restore` closures passed to `_withHypothetical()` or a
    shared wrapper, or inside the wrappers themselves.
  - An allowlist holds today's unmigrated keys (rows 2 to 11, plus the Runner
    hooks above, marked out of scope).
  - A new unguarded key fails the test. A listed key that disappears is
    reported in the one-line summary, so the list shrinks as rows migrate.
  - F2 is done when the allowlist holds only the Runner entries.
- Document the shared run-context and encounter wrappers in
  `documentation/ai.md` as the supported way for a card hook to evaluate
  prospective run-only costs.

## Safety and information boundary
- Migrated probes stay read-only. After evaluation, no credits are spent, no
  counters change, nothing is rezzed and no state is left different.
- Restoration happens after a throw as well as on a normal return.
- Results computed at hypothetical depth above zero must never populate or be
  served from F3's per-decision cache.
- A wrapper supplies only public context (the server being considered, the
  ICE position). It must not expose the Runner's hidden cards.

## Test scenarios
1. The `Phase_Main` "gain then install" check chooses `gain` when one more
   credit makes an extra install option legal, and does not when the counts
   are equal. The comparison uses counts, not string coercion.
2. For every migrated row (2 to 8, 10, 11), a test makes the evaluated
   function throw and checks that every field in that row's "State changed"
   column, and the hypothetical depth, are exactly as before.
3. `_potentialTagPunishment()` called from a phase other than "Corp 2.2", on a
   board without the resource-trash shortcut, leaves `currentPhase.identifier`
   unchanged.
4. `_icePreventsGameWinningBreach()` and `_iceWouldSecureServer()` return the
   same results as before on the existing boards in
   `tests/corp-server-security.test.js` (Bran on R&D is `true`; Tithe is
   `false`).
5. `_iceInstallScore()` and `_bestIceToInstall()` are gone, and no caller
   remains.
6. During Corp-turn planning, Baker's `AIRedirectsRun` still detects a
   redirect paid by a run-only credit source. The live `attackedServer` is
   unchanged afterwards, including when the probed credit source throws.
7. The existing Baker/Touchstone Archives-backdoor fixture
   (`corp-protects-baker-backdoor-after-rnd-layer-blocked.txt`) still passes.
8. The hypothetical depth is 0 before and after each probe, and above 0 while
   `evaluate` runs, including inside the shared wrappers.

## Acceptance gate
Behaviour-identical refactor, apart from the two bug fixes (rows 7 and 8).
Decision snapshots are identical to the recorded baseline except for listed,
justified deltas. Expected deltas: none. The phase fix matters only on the
latent path in the bug ticket, and the `.length` comparison gives the same
result as the string comparison for arrays of plain objects.

## Things to consider
- F3 depends on this ticket being complete, not partly done. Any row still
  changing state by hand is a place where the cache can serve a real-board
  result inside a hypothetical.
- The Runner-side hook pairs listed above need the same treatment under the
  Runner's principle debt. The ratchet keeps them visible.
- Rows 2 to 4 each run the full security evaluator twice per candidate. F3
  must not try to cache them. The depth count ensures it does not.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Every row in the inventory is migrated (or, for row 9, deleted), and `tests/corp-ai-hypothetical-mutation.test.js` exists and passes with only the out-of-scope Runner entries left in its allowlist.
- [ ] Every mutated collection or field has a regression test showing it is restored after a throw (scenario 2).
- [ ] Decision snapshots are identical to the recorded baseline except for listed, justified deltas.
- [ ] The shared run-context and encounter wrappers are documented in `documentation/ai.md`.
- [ ] The Resolution lists the cards updated in each set in scope (Baker in vantagepoint) and confirms none were missed.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
