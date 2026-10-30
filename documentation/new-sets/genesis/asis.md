# Genesis — A Study in Static (asis, 2061–2080)

Batch record for the parallel Genesis implementation. The coordinator folds
this into the set tracker.

ELO source: `data/elo.csv` (Trash or Busto scrape in the repo), matched by ID,
or by name for cards whose highest-vote printing is a reprint (Core 2.0 /
System Gateway-era IDs 20025, 20053, 20060, 20073, 25012, 25053, 25137).

Duplicates left alone: 2063 Scrubber (31011), 2080 False Lead (26129).

## Sub-batch 1 — Runner (2061, 2062, 2064–2069)

| ID | Card | ELO | Mechanics | Baseline AI |
| --- | --- | --- | --- | --- |
| 2061 | Disrupter | 1088 | `responseOnTraceInitiated` interrupt, trash to set `traceStrength = 0`; any turn | `AIWouldZeroTrace` (Flip Switch contract) |
| 2062 | Force of Nature | 1120 | 2[c] break up to 2 code gate subs (second optional, `continue` alt), 1[c] +1 str | `AIImplementBreaker` (1/1/2/2) |
| 2064 | Doppelgänger | 1449 | +1 MU console; once per turn after a successful run ends, may run any server (no click) via `automaticOnRunEndCleanup` | `AIDoppelgangerTarget` (highest cached potential with a complete path) |
| 2065 | Crescentus | 1438 | [trash]: derez the encountered ice when every subroutine is broken | new consumer `AITriggerDuringEncounter` (rez cost ≥ 3) |
| 2066 | Deus X | 1555 | [trash]: break any number of AP subs (str 10); [trash] prevent any amount of net damage (`responsePreventableDamage`) | `AIImplementBreaker` (free, once per run), `AIWouldPreventNetDamage` |
| 2067 | All-nighter | 1504 | [click],[trash]: gain [click][click] | `AIEconomyInstall` 1, `AITriggerInPaidWindow` once a later turn begins |
| 2068 | Inside Man | 1244 | 2 recurring credits, `canUseCredits` installing hardware | `AIEconomyInstall` 2 with hardware in grip |
| 2069 | Underworld Contact | 1655 | turn start: gain 1[c] if `Link() >= 2` | `AIEconomyInstall` 2 only with 2+ link |

Shared changes:

- `ai_runner.js`: mid-encounter consumer for the new Runner hook
  `AITriggerDuringEncounter()` (start of the `Run 3.1`/`Encounter` block).
  General; documented in `documentation/ai.md` §7.

Tests: `tests/genesis-asis.test.js` (headless real engine; human menus and AI
main loop / run calculator).

Deferred optimisation:

- Deus X: run calculator does not price trashing the program, so it may spend
  Deus X on AP ice a cheap breaker could handle; net-damage prevention is not
  modelled in run planning (damage limit).
- Disrupter: zeroes the first trace it would lose, not the most important one.
- Doppelgänger: target uses cached potentials from before the first run.
- All-nighter: used at the first opportunity of a later turn rather than when
  the extra click enables a specific plan.

## Sub-batch 2 — Corp (2070–2079)

| ID | Card | ELO | Mechanics | Baseline AI |
| --- | --- | --- | --- | --- |
| 2070 | Green Level Clearance | 1519 | gain 3[c], draw 1 | `AIEconomyPlay` 2 |
| 2071 | Hourglass | 1208 | 3× lose [click] | `AIImplementIce` 3× `loseClicks` |
| 2072 | Dedicated Server | 1169 | 2 recurring credits, `canUseCredits` rezzing ice | `AIWorthInstalling`, `AIRezWhenCan` while unrezzed ice exists |
| 2073 | Bullfrog | 1279 | psi game; different bids move it outermost on another server, run continues there (`attackedServer`/`approachIce` updated, Runner path cache cleared) | `AIBullfrogDestination`; sub modelled `misc_moderate` |
| 2074 | Uroboros | 1342 | Trace[4] no more runs this turn (lingering `modifyCannot("run")`, ends at next turn begin); Trace[4] ETR | traces modelled successful |
| 2075 | Net Police | 1048 | X recurring credits (= link) for traces via `variableRecurringCredits` | `AIWorthInstalling`/`AIRezWhenCan` with link ≥ 1 |
| 2076 | Weyland: Because We Built It | 1142 | 1 recurring credit, `canUseCredits` advancing ice | none needed (spent by the advance action) |
| 2077 | Government Contracts | 1301 | scored: [click][click] gain 4[c] | found by Corp click-economy search |
| 2078 | Tyrant | 967 | `canBeAdvanced` function (rezzed only); one ETR per advancement counter, synced on any change/advance/encounter | `AIAdvancementLimit`, `AIImplementIce` |
| 2079 | Oversight AI | 1585 | rez ice free; hosted as condition counter (moved to `hostedCards`, not trashed by play cleanup); trashes host when all its subroutines are broken in one encounter (`automaticOnSubroutineBroken`, `availableWhenInactive`) | `AIOversightTarget`, `AIWouldPlay` (rez cost ≥ 4) |

Shared helpers used (from other packs, merged from `sets/genesis-cycle`):
`RunForbidden`/`modifyCannot("run")` (Uroboros), `CheckAdvance` function form
(Tyrant), `RecurringCredits`/`variableRecurringCredits` (Net Police). No new
shared engine helpers in this sub-batch.

Deferred optimisation:

- Tyrant: the AI never rezzes it at 0 counters on approach (the run calculator
  sees no subroutines), so outside Oversight AI it stays unrezzed; ice can only
  be rezzed during runs in this engine.
- Weyland BWBI: the AI does not seek ice advancement to use its credit.
- Oversight AI: target is the most expensive unrezzed ice, ignoring how easily
  the Runner can fully break it.
- Uroboros/Bullfrog: traces and psi bids are not priced in the run calculator.
- Net Police/Dedicated Server: placed in a new remote; no trashing-risk policy.

Blocked: none.
