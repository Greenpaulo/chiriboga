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
