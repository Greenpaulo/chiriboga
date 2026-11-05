# Genesis Cycle — Future Proof (`fp`, 2101–2120)

Branch `genesis/fp`, resumed by Codex on 2026-10-30 from 6ef6b2c.
Merged `sets/genesis-cycle` (e0b4b22) first; Git merged without conflicts.
Earlier pack code and every pack's AI documentation were preserved. Shared
files were edited as bytes to preserve their mixed line endings.

## Cards

ELO comes from the repository's dated Trash or Busto snapshot, `data/elo.csv`,
looked up 2026-10-30. Existing Runner ELO is unchanged. Flare uses its exact
reprint ranking (25113); Dedicated Response Team uses 20081. Other implemented
cards match by title to their Genesis ranking.

| ID | Card | ELO | Gameplay / baseline AI evidence |
| --- | --- | ---: | --- |
| 2101 | Retrieval Run | — | Duplicate 31004, untouched |
| 2102 | Darwin | 1313 | Optional paid turn-begin virus counter; strength equals counters; 2[c] breaks any legal subroutine. AI grows toward visible ice with a credit reserve; real run calculator distinguishes insufficient/sufficient strength. |
| 2103 | Data Leak Reversal | 1886 | Central-success install restriction uses shared turn history, including when drawn later; tagged click mills R&D with Corp trash attribution. Real keep-card install and last-click trigger selectors, with no-tag/empty-R&D guards. |
| 2104 | Faerie | 1676 | Free sentry break, paid pump, trash after a used encounter (including a run ended during its paid window); unused copy survives. Real run calculator limits each copy to one ice per run. |
| 2105 | Mr. Li | 1315 | Unique; draw two, bottom one actually drawn. Real draw install/trigger selectors and low-value bottoming, with short-stack guard. |
| 2106 | Indexing | 1837 | Optional R&D breach replacement; private top-five ordering, short R&D supported. Real event selector and inline agenda ordering; last-click replacement declined. Explicit R&D target passes shared run-cost legality. |
| 2107 | R&D Interface | 1635 | +1 R&D access, stacking modifier. Real breach steals both agendas; run-preparation selector installs it, public central evaluator sees +1 access. |
| 2108 | Deep Thought | 1279 | R&D successes add virus counters; optional private top-card look at three counters, disabled by purge/removal below three. Real run-preparation install path and run-pressure hooks. |
| 2109 | New Angeles City Hall | 1572 | Unique; repeatable paid tag prevention; mandatory trash on steal. Real install/prevention selectors; finite per-tag payments in the run calculator. |
| 2110 | Eli 1.0 | — | Duplicate 31043, untouched |
| 2111 | Ruhr Valley | 1387 | Shared extra-run-click modifier gates/pays basic runs and events and reaches the planner. Real Corp install/rez selectors; scoring remote and rez affordability guards. Existing Region rules apply. |
| 2112 | Ronin | — | Duplicate 31053, untouched |
| 2113 | Midori | 1253 | Unique; optional HQ ice swap on approach, once per run; old hosted cards trashed, old ice returned to HQ and new ice unrezzed at the same index. Optional jack-out uses `CheckJackOut`. Real upgrade placement/rez and approach choice consumers; stronger affordable ice only for AI. |
| 2114 | NBN: The World is Yours* | 1245 | Corp max hand size +1, 40/12 identity. Real max-hand-size/discard consumer; no Runner hand modification. |
| 2115 | Project Beale | — | Duplicate 31062, untouched |
| 2116 | Midseason Replacements | 1976 | Previous Runner-turn steal restriction; Trace[6], tags equal final margin; expiry at next turn. Real paid play and trace selectors with steal/trace-budget guards. |
| 2117 | Flare | 1309 | Trace[6]; hardware trash (Corp choice), then unpreventable two meat damage and ETR, including no-hardware case. Real Corp ICE install; shared trace bids, highest-ELO hardware; conservative successful-trace run model. |
| 2118 | Dedicated Response Team | 1377 | Any successful run ending while tagged does two preventable meat damage; unsuccessful/untagged/trashed sources do nothing. Real install/rez consumers and global run-end planner costs, including tags gained en route, finite meat prevention and paid trash of this source before run end. |
| 2119 | Burke Bugs | 1146 | Trace[0]; Runner chooses a program to trash; failure/no target are harmless. Real ICE install, Corp trace bid and Runner program-trash selectors. |
| 2120 | Corporate War | 1276 | Score with at least seven pool credits: gain seven; otherwise lose pool only. No stolen effect. Real scoring selector waits for seven (or empty pool), with a game-winning-score override. |

## Shared engine / AI changes

- Reused `Expose(..., afterExpose, context)`, `responseOnTraceSuccessful`,
  `MemoryCost`/`variableMemoryCost`, `RecurringCredits`, `RunForbidden`,
  `CheckJackOut`, `StartingHandSize`, `CheckAdvance`, turn-event and economy
  helpers from the merged packs. No parallel versions were retained.
- Data Leak Reversal's WIP per-instance history was replaced by existing
  `runnerSuccessfulRunHQ/RnD/Archives` events. Its existing `CheckInstall`
  `installOnlyIf` gate is retained.
- `PreviousTurnEventCount(name, player)` extends shared event bookkeeping:
  player-turn boundaries snapshot the preceding turn before resetting current
  counts. Midseason can be drawn after the relevant steal.
- `RunUnsuccessful` now resolves encounter-end responses when a run is ended
  in an encounter paid window, before run-end responses. A failing Faerie
  reproduction established the missing timing path.
- `AITagPreventionCost()` prices repeatable paid prevention per new encounter
  tag, consuming finite route credits rather than granting immunity.
- `AIRunEndMeatDamage(server, tags, context)` is evaluated once after approach
  effects on complete successful routes; endpoint values survive calculator
  reuse. Shares finite meat prevention, includes acquired tags, and excludes
  a source the approach model pays to trash.
- `unpreventableMeatDamage` is a separate run-calculator effect, counted in
  damage/validation/Corp classification without meat-prevention deductions.
- `AIWouldScore()` can defer a non-winning score; immediate wins override it.
  All new hook contracts and each card's AI decisions are in `documentation/ai.md`.

## Verification

`tests/genesis-fp.test.js`: 41 cases passed, using the real headless engine,
phases and both AIs. The original two failing expectations were preserved:
the test driver now calls `PreEnumerate`, resets breach state between boards,
and supplies only legal commands to the AIs. Printed mechanics were verified
alongside real command/choice/planner consumers, not ELO or hook returns alone.

Other pack tests passed: WLA, TA, CE, ASIS and HS. Shared focused checks passed:
`tests/ai-hook-docs.test.js`, `tests/eternal-format.test.js`,
`tests/deckbuild-format-pool.test.js`, `tests/decklauncher-identity-change.test.js`
and `tests/card-status.test.js`. The first full run found four integration
failures: an invalid Flare overlay height and missing optional state/helpers in
isolated run-calculator/phase harnesses. The overlay and initialization guards
were corrected; the four affected regressions and all 41 FP cases then passed.
Final `node tests/run-all-tests.js` on Node 20.19.0 passed all 146 files
(exit 0), including decision fixtures/snapshots and integration tests. The
tracker records the log and exit-status paths.

Set-wide §8 checks: 120 metadata cards resolve to 103 unique definitions and
17 existing reprints; titles, image filenames, local JPG images and finite ELO
match. No scaffolds or empty effects remain. The three empty printed ICE
subroutine arrays are intentional (Woodcutter, Tyrant and Salvage generate
subroutines from advancement counters). The format-pool test generates decks
for every eligible identity in every legal format and checks size, agenda
points, influence, copy limits, side and set legality, including Genesis in
Eternal. Syntax and whitespace checks cover the edited files. No browser or
manual-playtest evidence is claimed.

## Deferred optimisation

- Darwin grows toward the strongest rezzed ice, without forecasting purge or
  comparing growth against installing a different breaker.
- DLR mills only on the last click; tag-float plans and resource-trash risk
  are not optimised. Mr. Li uses keep-value/ELO rather than combo forecasting.
- Indexing sets up agenda accesses without costing the complete second run
  or modelling Corp draws/reordering between runs. R&D Interface's marginal
  potential uses the first extra access rather than optimising multiple copies.
- NACH prevents every affordable tag; saving credits for stronger competing
  plays, intentional tags and entry-tax prevention planning are not optimised.
- Midori ranks affordable stronger ice by ELO. It does not quantify replacement
  security against each breaker or the value of allowing a jack-out.
- Flare/Burke use established conservative successful-trace ICE models, without
  pricing bid alternatives. Runner bidding retains the shared default policy.
- Midseason seeks tags on an untagged Runner without planning the entire
  punishment combo. Corporate War waits for seven without evaluating the
  opponent's next-turn threat against delaying a non-winning score.
- DRT plans public, currently active sources. It does not anticipate a concealed
  DRT rez, tag-prevention/reaction sequences during access, or a coordinated
  future tag-and-damage setup.

## Status

All 16 non-duplicate cards implemented; no implementation blocker. Independent
strategic review remains separate. Paul enabled Genesis for Eternal on
2026-10-30: `card-sets.md` marks it playable and the registry now has
`hidden: false`, `untested: false`. Eternal includes the `gen` set code.
