# Corp AI: winning agenda in HQ pre-empted by the critical-breach interrupt

**Source:** code inspection while auditing the I7.2 spec (no debug log)
**Reproduction:** none committed; needs a pending fixture or test (see Reproduction). Read against `376f32c`, 2026-09-25.

## Summary
`Phase_Main()` runs the critical-central interrupt
(`_criticalBreachDefenseAction()`) before any install is considered. Its
game-winning exemption covers only an agenda already installed in a remote
(`almostDoneAgenda`). A winning agenda still in HQ that could be installed and
fast-advanced this turn is not exempt, so when HQ or R&D is above the
critical-risk threshold the Corp is expected to spend the click (and credits)
on a defensive ICE install, purge or emergency ICE search instead, and can lose
the win it had this turn.

## Evidence
- `ai_corp.js`, `Phase_Main()`: after rez, priority triggers and kill combos,
  it looks for `almostDoneAgenda` only among `corp.remoteServers[i].root`
  (`CheckAdvance()` and `_isFullyAdvanceableAgenda()`), then calls
  `_criticalBreachDefenseAction(optionList, almostDoneAgenda)` and returns its
  choice when it is not -1. The install path comes later.
- `ai_corp.js`, `_criticalBreachDefenseAction()`: returns -1 early only when
  `almostDoneAgenda` would reach `AgendaPointsToWin()`. Otherwise, with a
  central at `CORP_AI_CRITICAL_BREACH_RISK_THRESHOLD` or above, it returns an
  ICE install on that central, a purge, or `_emergencyProtectionRecoveryAction()`.
- `ai_corp.js`, `_rankedInstallOptions()`: the "could be installed and
  fast-advanced to win" candidate (an HQ agenda reaching the win with
  `_advancementLimit(card, strongestEmptyRemote) <= _potentialAdvancement(...)`)
  exists, but only the later install path acts on it. The interrupt calls
  `_rankedInstallOptions()` itself and keeps only ICE options on the risky
  central.
- `documentation/corp-ai/specs/I7.2-root-operation-and-advance-versus-other-actions.md`
  scenario 4 and the install design note's edge case 3 describe the same gap.

## Reproduction
Needed: a pending test in `tests/pending/` (or a pending fixture in
`tests/fixtures/corp-decisions-pending/` extracted from a live log) with the
Corp at `AgendaPointsToWin() - 2` points, three clicks, a 2-point agenda with
advancement requirement 2 in HQ, an empty remote, enough credits to install and
advance it twice, R&D or HQ breachable by the Runner with a breach-loss risk of
at least 35% (Runner one agenda from winning), and an affordable ICE in HQ that
lowers that risk by at least `CORP_AI_CRITICAL_BREACH_MINIMUM_IMPROVEMENT`.
Expected: `install` of the agenda (reason "could be installed and
fast-advanced to win"); the current code is expected to install the ICE on the
central.

## Root cause
- [Verified by reading] The interrupt runs before the install path and its
  exemption tests only `almostDoneAgenda`, which is found only in remote roots.
- [Inferred] The lost win depends on the spent click or credits being needed
  for the install-and-advance line; with spare clicks the Corp may still win
  on a later action in the same turn.

## Proposed fix
Extend the exemption to a winning install-and-advance line from HQ: before the
interrupt, find an HQ agenda that `_rankedInstallOptions()` would offer as
"could be installed and fast-advanced to win" (factor that check into a helper
both call) and pass it to `_criticalBreachDefenseAction()` so the early return
covers it. No title checks. Longer term, I7.2's forced/winning band replaces
this ordering.

## Acceptance criteria
- [ ] Writing the reproduction above is the first step; it fails before the fix.
- [ ] The reproduction passes and has moved into the green suite (`tests/fixtures/corp-decisions/` or `tests/`), expectation unchanged.
- [ ] A test shows the interrupt still fires when the HQ agenda cannot reach the win this turn.
- [ ] Every new test asserts the logged reason as well as the choice.
- [ ] `node tests/run-all-tests.js` passes.

## Out of scope / related
- Comparing root installs, operations and advancing on one scale is roadmap
  item I7.2, whose scenario 4 covers this case.
