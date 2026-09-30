# I1 Unified install candidate model

**Roadmap item:** I1 · **Depends on:** I0 · **Sets:** none
**Read first:** `documentation/ai-principles.md`, `documentation/corp-ai/principles.md`, `documentation/corp-ai/specs/install-decisions-design.md`
**Verified against code:** 376f32c (2026-09-25)

## Goal
Replace implicit concatenation priority with explicit, inspectable install
candidate records, with identical choices. This is the foundation every later
I item scores against; it must not change card selection policy.

## Current behaviour
`_rankedInstallOptions(cards, priorityOnly, inhibit)` concatenates
independently generated groups in a fixed order: the "could be installed and
fast-advanced to win" agenda candidate; `AIWorthInstalling` assets; ICE for the
server `_serverToProtect(false, false, targetIsEligible)` picks (the
eligibility predicate is L3.5.2's interim bridge around
`_shouldInstallIceLayer()`); HVTs into `_scoringServers()` and assets into
`_assetDestinationOrder()` remotes, sorted by scoring window and
`_deceptionInstallDistance()`; upgrades from `_upgradeInstallPreferences()`
(only when the economy check passes; ahead of the root group when a scoring
upgrade targets the same server); ICE for the most-needy server, or for a new
remote when no empty protected remote exists; then a Snare! title case. ICE within a group follow input
order. See [architecture.md: install planning today](../architecture.md#install-planning-today).

Consumers, all of which must keep working unchanged:

- `_bestInstallOption(optionList, inhibit)`, which returns the index of the
  first ranked preference matching an engine option (or -1). Besides
  `ai_corp.js`, card code calls it: Ansel 1.0 (`sets/systemgateway.js`),
  License Acquisition (`sets/systemupdate2021.js`), Ansel 2.0 and Retirement
  Plan (`sets/vantagepoint.js`), with `inhibit` false for Archives or free
  installs.
- `Phase_Main`: the priority-only path returns `priorityRankedInstallOptions[0]`
  through `_returnPreference()`; the hand-pressure path reads
  `rankedInstallOptions[0]` to decide whether a non-ICE install into an
  unprotected server is acceptable, and compares two ranked lists in its
  gain-credit probe.
- `_criticalBreachDefenseAction()`, which scans `_rankedInstallOptions(corp.HQ.cards, true)`
  for ICE on the at-risk central.
- Side effects in `_returnPreference()`: an installed agenda gets
  `AIScoringPlanCommitted` (read by `_installedAgendaCanBeCompleted()`), and a
  preference carrying `AIProtectionInstall` (set on both ICE groups) calls
  `_recordProtectionInstall()`, which drives same-turn rotation and resets
  protection debt.

## Design
- Normalize every generated preference into the design note's candidate
  record, with `reasons`, `rejectionReasons` and relevant security diagnostics.
- **Enumerate jointly, rank as today.** Enumerate all legal `(card, server)`
  pairs, including ICE on every server `_rankedServersToProtect()` lists, but
  rank only by compatibility bands that reproduce the legacy order exactly:
  `compatibilityOrder` is the legacy group position then the in-group
  position. The fast-advance-to-win candidate is band 3 (design note), which
  is where the legacy order already puts it.
- **Candidates legacy would not generate** (for example ICE for a server
  `_serverToProtect()` did not pick) are recorded with `eligible: false` and a
  rejection reason such as "legacy: server not selected", ordered after all
  eligible candidates by `_rankedServersToProtect()` rank, then input-card
  order. The compatibility wrapper never returns them, so `_bestInstallOption()`
  still returns -1 where it did. They exist so I2 can switch them on and so
  snapshots show what was skipped.
- Remove duplicate `(card, server)` candidates, merging their reasons; the
  first legacy occurrence keeps its position.
- Carry `AIProtectionInstall` and the agenda commitment through unchanged, so
  `_returnPreference()` side effects fire exactly as before.
- Build hypothetical servers only through `_hypotheticalServerAfterInstall()`
  (design note), including the detached new-remote equivalence test; I1 itself
  needs it only for diagnostics.
- Keep `_rankedInstallOptions()` as the compatibility wrapper returning
  `{cardToInstall, serverToInstallTo, reason, ...}`; card-driven and non-HQ
  sources keep working.
- Add `tests/corp-install-decisions.test.js`.
- **Title cases.** Own the rows tagged I1 in the P1 ticket
  (`documentation/backlog/corp_ai_finding_13_legacy_title_lists.md`): the
  Snare! install case and the Trick of Light case in `_emptyProtectedRemotes()`
  are carried over only as compatibility bands marked `legacy` in the score
  breakdown, never as title checks in candidate scoring. I9 removes the bands.

## Safety and information boundary
Hypothetical evaluation must not change card locations, server contents,
counters, protection debt, `_protectionInstallsThisTurn`, cached deception
decisions or randomness. Priority-only and free install/rez (`inhibit` false)
behaviour must be preserved exactly.

## Test scenarios
1. Priority-only calls still exclude unaffordable ICE and unsafe new-server
   root installs.
2. Free install/rez effects (`inhibit` false, as Ansel 1.0 and Ansel 2.0 use)
   preserve their less-inhibited behaviour.
3. The same legal option is not emitted twice when two legacy groups generate
   it, and its reasons are merged.
4. Candidate ranking is stable when unrelated cards are reordered outside the
   relevant option group.
5. No evaluation changes card locations, server contents, counters, protection
   debt, `_protectionInstallsThisTurn` or cached deception decisions, including
   when an evaluation throws.
6. When the top-ranked server has no viable ICE, the lower-ranked server's
   candidate is still selected (as L3.5.2 does today) and the top server's
   candidates appear with their rejection reasons.
7. An ICE for a server legacy did not select is recorded with `eligible: false`
   and is never returned, so `_bestInstallOption()` returns -1 on a board where
   it returned -1 before.
8. `AIScoringPlanCommitted` and `_recordProtectionInstall()` fire for the same
   installs as before.

## Acceptance gate
Behaviour-identical refactor, not flagged: the install-fixture decision
snapshots are identical to I0's committed baseline except for listed, justified
deltas, every existing fixture and focused AI test passes unchanged, and every
returned preference carries a score breakdown and reason. Re-running I0's F4
configuration reproduces the baseline's per-game outcomes exactly, with
`decisionLatencyMs` within the standard guard (+25% mean).

## Things to consider
- Joint enumeration is what later allows `_serverToProtect(..., targetIsEligible)`
  to leave ordinary ICE-install generation; that retirement is I2's, not I1's.
- The card-code callers pass engine option lists built from Archives, R&D or a
  card-generated list; candidate enumeration must take its cards from the
  option list, as `_bestInstallOption()` does now.

## Acceptance criteria
- [ ] Every test scenario above is covered by a deterministic test that asserts the logged reason as well as the choice.
- [ ] Decision snapshots are identical to the recorded I0 baseline except for listed, justified deltas (recorded in the Resolution).
- [ ] New or changed card-facing hooks are documented in `documentation/ai.md`.
- [ ] `documentation/corp-ai/architecture.md` describes the new behaviour.
- [ ] `node tests/run-all-tests.js` passes.
