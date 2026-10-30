# Genesis: Humanity's Shadow (hs, 2081-2100) batch record

Branch `genesis/hs`. Duplicates left alone: Xanadu (2082), Networking (2084),
Hokusai Grid (2095). ELO: exact Trash or Busto values from `data/elo.csv`
(scraped by `scripts/scrape-elo.mjs`), matched by ID, else by normalized name
per `scripts/fill-elo.mjs` (HQ Interface 25031, Pheromones 20031, Kati Jones
25065, Whirlpool 20103, Bernice Mai 20123). Lookup date: 2026-10-30.

Tests: `tests/genesis-hs.test.js` (real engine + both AIs).

## Sub-batch A (Runner): Surge, Andromeda, HQ Interface, Quality Time, Replicator, Kraken, Kati Jones

| Card | ELO | Mechanics | Baseline AI |
| --- | --- | --- | --- |
| Surge 2081 | 1443 | Targets an installed program that received virus counters this turn (`TurnEventCards("runnerProgramVirusCounters")`); +2 virus counters | `AIPlayWhenCan` 2 + `AIWouldPlay` (target exists), `AIPreferredPlayChoice` (most counters), `AIWorthKeeping` (virus program in rig/grip) |
| Andromeda 2083 | 2063 | `startingHandSize: 9`, read by the opening draw and `Mulligan` | Existing mulligan heuristic |
| HQ Interface 2085 | 1520 | `modifyBreachAccess` +1 on HQ | `AIAdditionalAccess`, `AICentralPressure`, `AIInstallBeforeRun` (HQ), `AIWorthKeeping` |
| Quality Time 2087 | 1599 | Draw 5 | `AIPlayToDraw` 2, overdraw/credit guard |
| Replicator 2088 | 1382 | `responseOnInstall` on any hardware (incl. itself): optional search for a copy, reveal, add to grip, shuffle. Offered only when a copy exists | AI takes the copy unless the grip is at max hand size; `AIWorthKeeping` when a copy is fetchable |
| Kraken 2090 | 1305 | Needs a steal this turn (`TurnEventCount("runnerAgendaStolen")`); choose a server with ice; the Corp chooses and trashes 1 of its ice | Runner: `AIPlayWhenCan` 2, server choice prefers fewest ice and R&D/HQ/loaded remotes. Corp: trashes its lowest rez-cost ice |
| Kati Jones 2091 | 1652 | Unique; two click abilities, card shares one use per turn | `AIEconomyTrigger` 2 with new `AIEconomyTriggerAlt` (place until 9 hosted or credits < 3, then take) |

## Sub-batch B (Runner): Pheromones, Creeper

| Card | ELO | Mechanics | Baseline AI |
| --- | --- | --- | --- |
| Pheromones 2086 | 1370 | `recurringCredits: 0` + `variableRecurringCredits()` = virus counters; `canUseCredits` only while `attackedServer == corp.HQ`; +1 virus counter on each successful HQ run | `AIRunPoolCreditOffset` (HQ only), `AIWorthKeeping`/`AIInstallBeforeRun` for HQ |
| Creeper 2089 | 1051 | `variableMemoryCost()`: 0 MU with 2+ link (also uninstalled); 2[c] break 1 sentry sub, 1[c] +1 strength for the encounter | `AIImplementBreaker` (Sentry, 1/1 pump, 2/1 break), `AIPreferredInstallChoice` |

## Sub-batch C (Corp): Eve Campaign, Rework, Whirlpool, Data Hound, Bernice Mai, Salvage, Simone Diego, Foxfire

| Card | ELO | Mechanics | Baseline AI |
| --- | --- | --- | --- |
| Eve Campaign 2092 | 1486 | Loads 16 on rez; takes 2 each Corp turn; trashed when empty | `AIWorthInstalling` (non-scoring remote, 3+ credits), `AIRezWhenCan` at Runner 2.2, `AIEconomyCard`, `AIAvoidInstallingOverThis` |
| Rework 2093 | 1028 | Shuffle a chosen HQ card into R&D | `AIPlayWhenCan` 1 + `AIWouldPlay` (an agenda in HQ and either 2+ agendas or last click); hides the highest-point agenda |
| Whirlpool 2094 | 1242 | Sub: lingering `modifyCannot("jackOut")` until the run ends, then trashes itself | `AIImplementIce` (no direct Runner cost) |
| Data Hound 2096 | 1246 | Trace[2]; margin X = `traceStrength - linkStrength`; Corp trashes 1 of the top X stack cards and arranges the rest (human: card-by-card order) | Corp trashes the highest-ELO card, puts lowest-ELO on top; trace bid via `_preferTraceToBeat(2, 3)`; `AIImplementIce` misc_minor |
| Bernice Mai 2097 | 1471 | Unique; mandatory `responseOnRunSuccessful` on its server: Trace[5], tag or trash itself | `_preferTraceToBeat(5)`, `AIRezWhenCan` during runs on its server (rez 0), `AILimitPerServer`, `AIDefensiveValue` |
| Salvage 2098 | 891 | `canBeAdvanced` tracks `rezzed`; one gained "Trace[2]: 1 tag" subroutine object per advancement counter (synced on any change and on encounter, Winchester pattern) | `AIAdvancementLimit` (Ice Wall policy), `AIImplementIce` one `tag` per counter |
| Simone Diego 2099 | 1236 | Unique; 2 recurring credits; `canUseCredits` only for `"advancing"` cards in its root or protecting ice | `AIIsScoringUpgrade`, `AILimitPerServer`, `AIRezWhenCan` (Corp turn, advanceable card in its root) |
| Foxfire 2100 | 1335 | Trace[7]; on success the Corp trashes 1 installed virtual resource or card with link > 0 (not the identity) | `AIPlayWhenCan` 1 + `AIWouldPlay` (target exists and the trace can be won), trashes the most expensive target |

## Shared engine/AI helpers added (for de-duplication on merge)

- `StartingHandSize(player)` (init.js): identity `startingHandSize` or 5; used by `StartGame` opening draw and `Mulligan` (command.js).
- `turnEventCards`, `RecordTurnEventCard(name, card)`, `TurnEventCards(name)` (utility.js), cleared with `turnEventCounts` in `ChangePhase` (phase.js).
- `AddCounters` (mechanics.js) records `"runnerProgramVirusCounters"` (count and card) for virus counters placed on installed Runner programs.
- `Steal` (mechanics.js) records turn event `"runnerAgendaStolen"`.
- `MemoryCost(card)` (utility.js): `variableMemoryCost()` or `memoryCost`; replaces direct `memoryCost` reads in `InstalledMemoryCost`, `ChoicesCardInstall` MU checks, the install MU check (mechanics.js) and `RunnerAI._installWouldExceedMU`.
- `RecurringCredits(card)` (utility.js): `variableRecurringCredits()` or `recurringCredits`; used by the install and turn-begin refills (mechanics.js, phase.js).
- `CheckJackOut()` (checks.js): `!CardEffectsForbid("jackOut", null)`; gates the Run 4.3 jack-out option (phase.js).
- `CorpAI._traceSpendToBeat(baseStrength, reserve)` / `_preferTraceToBeat(baseStrength, reserve)` (ai_corp.js): bid that beats the Runner's link plus all credits, else 0; sets the `trace` preference.
- `AIEconomyTriggerAlt()` hook consumed in RunnerAI's economy trigger path (ai_runner.js); documented in `documentation/ai.md`.

## Deferred optimisation notes

- Surge: the virus-counter record does not check who placed the counters (Corp effects placing virus counters on Runner programs do not exist in playable sets).
- Kraken: Runner server choice ignores agenda-scoring threat; Corp choice is rez cost only, not positional value.
- Replicator: AI always fetches a copy, even of unique/console hardware it cannot use twice.
- Creeper: dropping below 2 link after install does not force trashing programs over the MU limit (engine has no general MU re-check).
- Whirlpool: card-granted "may jack out" options in other sets (systemgateway 3750, vantagepoint 3547, downfall 1383/3643/3959) call `JackOut()` directly and do not consult `CheckJackOut()`.
- Data Hound / Salvage / Bernice Mai: Runner trace bidding uses the default Runner AI; the Corp bid is all-or-nothing.
- Data Hound look-at cards are turned faceup briefly (Knowledge Seeker pattern), not a private-look decision.
- Simone Diego: Corp advance planning does not count her hosted credits as extra budget.
- Rework: no read of Runner HQ pressure; play rule is agenda count / last click only.
- Kati Jones: fixed 9-credit cash-out threshold; no planning of a big turn.

## Status

All 17 non-duplicate cards implemented; none blocked. `documentation/card-status.md` was not regenerated here (shared generated file; coordinator to regenerate after merge).
