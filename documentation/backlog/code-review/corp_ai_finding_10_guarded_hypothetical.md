# F2 Guarded hypothetical evaluation: remaining migrations

**Roadmap item:** F2 · **Depends on:** none · **Sets:** vantagepoint (Baker), systemupdate2021 (Atman, Chameleon)
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`
**Verified against code:** b52d451 (2026-10-02)

## Resolution

Implemented from `b52d451`.

**What changed.** One guarded mechanism with one depth count, used by every
planning probe; see
[architecture: foundations](../../corp-ai/architecture.md#foundations).
- `ai_runner.js` (utility prefix, loaded by the game, the headless harness and
  the test harnesses): `AIHypothetical.depth`, `AIWithHypothetical(apply,
  evaluate, restore)`, `AIWithRunContext(server, evaluate)` and
  `AIWithIceEncounter(iceCard, evaluate)`. Each restores in `finally` and
  raises the shared depth while `evaluate` runs. `AIWithRunContext()` keeps
  `_effectiveRunnerCreditPool()`'s tolerance of a context without the run
  globals.
- `CorpAI._withHypothetical()` delegates to `AIWithHypothetical()`;
  `_hypotheticalDepth` is now a getter on the shared count (the constructor no
  longer assigns it), so F3's cache checks see probes made in card hooks and
  `runcalculator.js`.
- Rows 2/3 share `_iceSecurityWithAndWithout()`. Rows 2, 3, 4, 7 and 8 restore
  saved values (credits, rez state, ICE array contents in place) instead of
  reversing arithmetic. Row 7 now restores `currentPhase.identifier` (closes
  [the bug ticket](../../bugs/potential-tag-punishment-never-restores-phase.md)).
  Row 8 compares install-option counts with `.length`.
- Rows 5 and 10 use `AIWithRunContext()`; Baker still sets the planning server
  only when no run is in progress. Rows 6, 11, 12, 13 and 14 use
  `AIWithIceEncounter()`; Atman's "no server, no strength check" behaviour is
  kept through its `entered` argument.
- Row 9: `_iceInstallScore()` and `_bestIceToInstall()` deleted, with the
  `_iceInstallScore: Palisade` entry in `tests/corp-ai-card-titles.test.js`
  (P1 row ticked).

**Cards updated per set in scope.** vantagepoint: Baker (`_stealthCreditCards`).
systemupdate2021: Atman (`AISharedPreferredX`, `AIMatchingBreakerInstalled`),
Chameleon (`AIMatchingBreakerInstalled`). None missed: the ratchet scans every
`AI*`/`_*` function in all `sets/*.js` files, and run against `b52d451` it
reports exactly rows 2 to 14 and nothing else unlisted. Corsair and Lampades
have `_stealthCreditCards` helpers that change no state.

**Departures from the ticket (all in the approved plan).** Rows 12 to 14 were
missing from the inventory. The ratchet has a permanent `REAL_EFFECTS` list for
three `_` helpers that make real game changes, so its allowlist ends with the
six Runner-debt entries plus those three, not the Runner entries alone.
Harness setup (no assertion changes): `tests/vantagepoint-integration.test.js`
and the pending
`tests/pending/corsair-stealth-offset-suppressed-by-lampades.test.js` now load
the `ai_runner.js` utility prefix that Baker's helper needs; the pending test
still fails exactly as it does at `b52d451`.

**Tests.**
- `tests/potential-tag-punishment-restores-state.test.js` (scenario 3; row 7
  of scenario 2): reproduction written at
  `tests/pending/potential-tag-punishment-restores-state.test.js`, failed at
  `b52d451`, moved unchanged; passes with
  `node tests/potential-tag-punishment-restores-state.test.js`.
- `tests/corp-ai-hypothetical-guards.test.js`, 33 cases: scenario 1 (gain when
  the count grows, including from none to one; install when counts are equal;
  logged reason asserted); scenario 2 for rows 2 to 6, 8, 10 to 14 (each row's
  fields and the depth after a normal return and after a throw, for both
  evaluations of rows 2/3); scenario 5; scenario 6 (Baker redirect through a
  run-only stealth credit, live `attackedServer` unchanged, including on a
  throw and during a live run); scenario 8 (nested wrappers share one count).
  Checked to fail when a restore is removed or Baker's old probe is restored.
- `tests/corp-ai-hypothetical-mutation.test.js`: the ratchet.
- Scenario 4: the Bran/Tithe boards in `tests/corp-server-security.test.js`
  pass unchanged. Scenario 7: the Baker/Touchstone fixture passes unchanged.
- Decision snapshots and corp decision fixtures: identical to the baseline (no
  deltas). `node tests/run-all-tests.js`: 45 test files passed.

**Left open.** The Runner-side paired hooks (Botulus, Tread Lightly, Aircheck)
remain in the ratchet as Runner principle debt, called by `ai_runner.js`
without `finally`.

## Implementation plan

Proposed at `b52d451`, 2026-10-02. **Approved 2026-10-02.**

- **Validation:**
  - Rows 1 to 11 hold up at `b52d451`; a scan of `ai_corp.js` and
    `runcalculator.js` with the ticket's patterns finds exactly those sites.
    Row 8's `<` claim holds: `_rankedInstallOptions()` returns arrays of plain
    objects, so the string comparison equals `a.length < b.length`. Row 7's
    defects are reproduced by
    `tests/pending/potential-tag-punishment-restores-state.test.js` (fails at
    `b52d451`: the phase stays `"Corp 2.2"`).
  - **The inventory misses three probes.** The same scan over `sets/*.js`
    finds unguarded `AIIceEncounterModifyState` probes in Atman
    `AISharedPreferredX`, Atman `AIMatchingBreakerInstalled` and Chameleon
    `AIMatchingBreakerInstalled` (`sets/systemupdate2021.js`, a playable set).
    The Corp calls `AIMatchingBreakerInstalled` from
    `_matchingBreakerForIce()` in `ai_corp.js`, so a throw there leaves the encounter state changed
    during Corp planning, outside the depth count. Add them as rows 12 to 14
    and migrate them to the encounter wrapper (one line each).
  - **The ratchet as written cannot reach "only Runner entries".** The scan
    also matches real game effects in `_`-prefixed set helpers, which are not
    probes: Read-Write Share `_hostFromGripResolve`, ezaM `_swapWith`,
    Mitra Aman/Mycoweb `_performSwap` (and Howler's subroutine, depending on
    how functions are scoped). They need a permanent, separately named
    "real effect, not a probe" list with a reason per entry.
  - **Counter location.** The ticket's suggestion (beside
    `AIIceEncounterSaveState` in the utility prefix of `ai_runner.js`) is the
    right home: test harnesses load that prefix but not `utility.js`. Some
    harnesses (`corp-mulligan`, `corp-overadvance`, `forfeit-restriction`, and
    pending `corsair-stealth-offset-suppressed-by-lampades`,
    `ballista-central-servers-skip-agenda-check`) load `ai_corp.js` or
    `vantagepoint.js` without it.
  - **Row 9 ownership.** I2's spec also says it deletes `_iceInstallScore()`
    and `_bestIceToInstall()`. F2 deletes them (dead code); I2's spec,
    `architecture.md`, `engine_patterns.md` (`AIIceInstallScore`), P1's table
    and `tests/corp-ai-card-titles.test.js` (`_iceInstallScore: Palisade`) are
    updated to match.
  - **Classification:** objective. A behaviour-identical refactor plus two
    invariant fixes (probes restore all state; row 8's comparison is by
    count). No AI choice changes, so no AI option. The Acceptance gate is
    rewritten to the N/A form.
- **Approach:**
  - `ai_runner.js` utility prefix: one counter, `AIHypothetical = {depth: 0}`,
    and three guarded functions that all use it:
    `AIWithHypothetical(apply, evaluate, restore)`;
    `AIWithRunContext(server, evaluate)` (sets `attackedServer`);
    `AIWithIceEncounter(iceCard, evaluate)` (built on
    `AIIceEncounterSaveState`/`ModifyState`/`RestoreState`; passes the
    `ModifyState` result to `evaluate` so Atman's "no server, no check" stays).
    Each increments before changing state and restores and decrements in
    `finally`.
  - `CorpAI._withHypothetical()` delegates to `AIWithHypothetical()`.
    `_hypotheticalDepth` becomes a getter reading `AIHypothetical.depth`, so
    F3's checks and the existing assertions read the shared counter; the
    constructor stops assigning it.
  - Rows 2/3: one helper, `_iceSecurityWithAndWithout(card, rezCost, server)`,
    runs both probes through `_withHypothetical()` and restores saved values
    (not `+=`). Rows 4, 7 and 8 use `_withHypothetical()` with saved values;
    row 8 compares `.length`. Rows 5 and 10 use `AIWithRunContext()` (Baker
    keeps its "only when no run is in progress" condition by passing the
    current `attackedServer` otherwise). Rows 6, 11 to 14 use
    `AIWithIceEncounter()`. Row 9 is deleted.
  - Harnesses that load `ai_corp.js` or `vantagepoint.js` without the prefix
    load it, as the existing fixture harnesses do (setup only, no assertion
    changes).
  - Rejected: a fallback counter inside `ai_corp.js` for prefix-less contexts
    (two counters, which the ticket rules out); putting the counter in
    `utility.js` (not loaded by test harnesses).
- **Tests:**
  - `tests/pending/potential-tag-punishment-restores-state.test.js` moves to
    `tests/` (scenario 3 and row 7 of scenario 2).
  - New `tests/corp-ai-hypothetical-guards.test.js`: scenario 2 for rows 2 to
    6, 8, 10 to 14 (throwing evaluator, every changed field and the depth
    restored), scenario 1 (gain vs equal counts), scenario 5 (functions gone),
    scenario 6 (Baker redirect detection, live `attackedServer` unchanged,
    including on a throw), scenario 8 (depth 0 before/after, above 0 inside
    each wrapper, nested).
  - Scenario 4: existing Bran/Tithe assertions in
    `tests/corp-server-security.test.js` stay unchanged. Scenario 7: the
    existing Baker fixture stays green.
  - New ratchet `tests/corp-ai-hypothetical-mutation.test.js` as designed,
    with brace-matched function scoping, a `RUNNER_DEBT` allowlist (Botulus,
    Tread Lightly, Aircheck hook pairs) and a permanent `REAL_EFFECTS` list.
- **Risk:** the refactor touches the security probes used by rezzing and
  critical-defence decisions, and every Corp evaluation's cache check. Checks:
  full suite, corp decision fixtures and decision snapshots with expected
  deltas of none; `_securityCacheVerify` stays green in the existing tests.
  Any snapshot delta stops the work for review.
- **Docs:** `documentation/ai.md` (the three shared wrappers, as the supported
  way for card hooks to evaluate prospective run or encounter state);
  `documentation/corp-ai/architecture.md` foundations; this ticket's inventory
  (rows 12 to 14) and ratchet design; I2 spec, P1 table and
  `engine_patterns.md` for row 9; the bug ticket's Resolution.

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
([bug ticket](../../bugs/potential-tag-punishment-never-restores-phase.md)).

## Current behaviour

**Update 2026-09-25 (F3):** `CorpAI._hypotheticalDepth` now exists. `_withHypothetical()` and sites #2 to #8 raise it around their changed-board evaluation (restore logic unchanged), so the F3 security cache is bypassed there. Migrating those sites into guarded helpers, deleting #9 and adding the ratchet test is still this item's work; new guarded helpers must keep the depth count.

`_withHypothetical(apply, evaluate, restore)` exists: `try { apply(); return
evaluate(); } finally { restore(); }`. Only `_ordinaryPurgeOutcome()` uses it.
Every other probe changes state by hand, some with a hand-written
`try/finally` and some with none. Sites 2–8 now raise `_hypotheticalDepth`
around their changed-board evaluations, so F3 bypasses its cache there, but
they still need guarded restoration and one consistent mechanism. Sites 9–11
remain outside that partial Corp-side protection. See
[architecture: foundations](../../corp-ai/architecture.md#foundations).

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
| 7 | `_potentialTagPunishment` (ai_corp.js) | `runner.tags`, `corp.clickTracker`, `corp.creditPool`, `currentPhase.identifier` | **none**; the phase is never restored (`==` for `=`) | `_useWhenTaggedCard` (card `AIWouldPlay`, `FullCheckPlay`) | Migrate; closes the [bug ticket](../../bugs/potential-tag-punishment-never-restores-phase.md) |
| 8 | `Phase_Main` "gain a credit, then install" check (ai_corp.js) | `corp.creditPool += _clicksLeft() - 1` and manual rollback | **none** | `_rankedInstallOptions` (calls the security evaluator) | Migrate; compare `.length` instead of arrays with `<` |
| 9 | `_iceInstallScore` (ai_corp.js) | `serverToInstallTo.ice.push`/`splice`, or a fake remote pushed onto `corp.remoteServers` | **none** | `Strength`, `_aCompatibleBreakerIsInstalled` | Delete: its only caller, `_bestIceToInstall`, has no callers (and writes `AIIceInstallScore` onto card objects) |
| 10 | Baker `_stealthCreditCards` (sets/vantagepoint.js), used by Baker's `AIRedirectsRun` | `attackedServer` | hand-written `try/finally` | Runner `canUseCredits` | Migrate to the shared run-context wrapper |
| 11 | `RunCalculator.IceAI` (runcalculator.js; shared with the Runner AI, reached from Corp security through `_securityRunCalculator`/`_securityIceAI`) | `encountering`, `attackedServer`, `approachIce` via `AIIceEncounterModifyState` | **none** around `Strength(ice)` | `Strength` (card strength modifiers) | Migrate to the shared encounter wrapper |
| 12 | Atman `AISharedPreferredX` (sets/systemupdate2021.js; added 2026-10-02) | `encountering`, `attackedServer`, `approachIce` via `AIIceEncounterModifyState` | **none** | `Strength` | Migrate to the shared encounter wrapper |
| 13 | Atman `AIMatchingBreakerInstalled` (sets/systemupdate2021.js; added 2026-10-02; called by the Corp from `_matchingBreakerForIce`) | same as #12 | **none** | `CheckStrength` | Migrate to the shared encounter wrapper |
| 14 | Chameleon `AIMatchingBreakerInstalled` (sets/systemupdate2021.js; added 2026-10-02; called by the Corp from `_matchingBreakerForIce`) | same as #12 | **none** | `CheckStrength` | Migrate to the shared encounter wrapper |

Out of Corp scope, recorded so the ratchet below can list them: the Runner
AI's paired hooks `AIPrepareHypotheticalForRC`/`AIRestoreHypotheticalFromRC`
(Botulus) and `AIRunEventModify`/`AIRunEventRestore` (Tread Lightly,
Aircheck). `ai_runner.js` calls both pairs without `finally`. They belong to
the Runner's principle debt.

Correction to the earlier version of this ticket: sites 2–8 already raise
`_hypotheticalDepth`, and `_evaluateServerSecurity()` bypasses F3's cache at
that depth. Their remaining migration is about guaranteed restoration and a
single guarded mechanism, not a current risk of cached real-board security
results. Rows 9–11 still lack the shared depth protection and must either be
deleted or migrated as specified.

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
  - A second, permanent list holds `_` helpers in `sets/*.js` that make a
    real game change rather than a probe (Mitra Aman `_performSwap`,
    Read-Write Share `_hostFromGripResolve`, ezaM `_swapWith`), each with its
    reason. (Added 2026-10-02: the scan matches them, so without this list the
    allowlist could never shrink to the Runner entries.)
  - A new unguarded key fails the test. A listed key that disappears is
    reported in the one-line summary, so the list shrinks as rows migrate.
  - F2 is done when the allowlist holds only the Runner entries (plus the
    real-effect list).
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
2. For every migrated row (2 to 8, 10 to 14), a test makes the evaluated
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
N/A — deterministic fix (principle 4): every probe leaves the board exactly as it found it, after a normal return and after a throw, and decision snapshots are identical to the recorded baseline (expected deltas: none; row 8's count comparison equals the string comparison for arrays of plain objects, and the phase fix matters only on the latent path in the bug ticket).

## Things to consider
- F3's cache is already protected at sites 2–8 by their explicit depth bumps.
  Completing this ticket removes the fragile hand-written restoration and
  closes the unprotected rows 9–11 without leaving two mechanisms to maintain.
- The Runner-side hook pairs listed above need the same treatment under the
  Runner's principle debt. The ratchet keeps them visible.
- Rows 2 to 4 each run the full security evaluator twice per candidate. F3
  must not try to cache them. The depth count ensures it does not.

## Acceptance criteria
- [x] Every test scenario above is covered by a deterministic test. Assert the
  logged reason and selected choice only for scenarios that make a decision;
  restoration-after-throw and function-removal scenarios instead assert their
  state and structural outcomes directly.
- [x] Every row in the inventory is migrated (or, for row 9, deleted), and `tests/corp-ai-hypothetical-mutation.test.js` exists and passes with only the out-of-scope Runner entries left in its allowlist. (Plus the permanent real-effect list added by the approved plan; see Resolution.)
- [x] Every mutated collection or field has a regression test showing it is restored after a throw (scenario 2).
- [x] Decision snapshots are identical to the recorded baseline except for listed, justified deltas.
- [x] The shared run-context and encounter wrappers are documented in `documentation/ai.md`.
- [x] The Resolution lists the cards updated in each set in scope (Baker in vantagepoint) and confirms none were missed.
- [x] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [x] `node tests/run-all-tests.js` passes.
