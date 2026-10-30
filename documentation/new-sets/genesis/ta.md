# Genesis Cycle — Trace Amount (`ta`, 2021–2040)

Branch `genesis/ta` from `ce0fca6`. Implemented by Claude, 2026-10-30.

## Cards

| ID | Card | Status | ELO (Trash or Busto, 2026-10-30) |
| --- | --- | --- | --- |
| 2021 | Vamp | Implemented | 1745 (02021) |
| 2022 | Liberated Account | Duplicate (31010), untouched | — |
| 2023 | Satellite Uplink | Implemented | 1150 (02023) |
| 2024 | e3 Feedback Implants | Implemented | 1595 (reprint 29003) |
| 2025 | Compromised Employee | Implemented | 1361 (02025) |
| 2026 | Notoriety | Implemented | 1671 (reprint 25044) |
| 2027 | Snowball | Implemented | 1269 (02027) |
| 2028 | Dyson Mem Chip | Implemented | 1281 (reprint 20057) |
| 2029 | Encryption Protocol | Implemented | 1499 (02029) |
| 2030 | Sherlock 1.0 | Implemented | 1282 (02030) |
| 2031 | Jinteki: Replicating Perfection | Implemented | 1887 (reprint 25085) |
| 2032 | Fetal AI | Implemented | 1693 (reprint 25086) |
| 2033 | Trick of Light | Duplicate (31058), untouched | — |
| 2034 | Sensei | Implemented | 1107 (02034) |
| 2035 | Big Brother | Implemented | 1287 (02035) |
| 2036 | ChiLo City Grid | Implemented | 1285 (02036) |
| 2037 | Power Grid Overload | Implemented | 1375 (02037) |
| 2038 | Amazon Industrial Zone | Implemented | 1270 (02038) |
| 2039 | Executive Retreat | Implemented | 1248 (02039) |
| 2040 | Freelancer | Implemented | 1271 (02040) |

Five cards have no Genesis-code ranking entry; their ELO is the ranking of the
same card under its reprint code (noted above). No card is blocked.

## Shared engine / AI changes (check for duplicates when merging)

- `mechanics.js` `Expose(card, afterExpose, context)`: optional callback after
  the expose finishes or is prevented (Satellite Uplink chains two exposes).
- `mechanics.js` `Trace`: after a successful trace opens
  `responseOnTraceSuccessful` (`Enumerate(margin)`), then calls the trace
  callback. **Spinal Modem (2002, another pack) needs the same "successful
  trace during a run" event — reuse this hook rather than adding a second.**
- `mechanics.js` `MakeRun`: records turn event `runnerCentralRunInitiated`.
- `phase.js` run success (Run 5.1): records `runnerSuccessfulRunHQ`,
  `runnerSuccessfulRunRnD`, `runnerSuccessfulRunArchives` beside the existing
  `runnerSuccessfulRun`. Other "made a successful run on X this turn" cards can
  use these.
- `utility.js` `RunForbidden(server)` = `CardEffectsForbid("run", server)`,
  checked first in `CanPayAdditionalRunCosts` (basic run, MakeRun, run event
  server choices). New `modifyCannot` id: `"run"` with the server.
- `ai_runner.js`: the Runner's run server list drops `RunForbidden` servers.
- `runcalculator.js` `IceAI`: `AIModifyIceAI` is now also read from active Corp
  cards (excluding those already active for the Runner).

Documented in `documentation/ai.md` ("Genesis Trace Amount card hooks") and the
Trace section of `documentation/engine_patterns.md`. No new `AI*` hook names.

## Rulings / decisions

- Vamp: X may be 0 (no tag); X is offered up to the Runner's available
  credits, independent of the Corp's pool. Uses the Khusyuk breach-replacement
  pattern with `automaticOnRunEndCleanup`.
- Satellite Uplink exposes only facedown (unrezzed) installed Corp cards.
- e3 can chain: its own break triggers it again.
- Sensei's grant is a lasting run effect (hooks `availableWhenInactive`); the
  granted ETR is attached on encounter and removed at encounter end/run end.
- Replicating Perfection: any run initiated on a central server this turn
  (successful or not) unlocks remotes until the turn ends.
- Fetal AI uses `stealCost: {credits: 2}` and the Ganked! R&D reveal pattern.
- Power Grid Overload compares the hardware's printed `installCost` to X.
- Freelancer chooses up to 2 resources, then trashes them together.

## Tests

`tests/genesis-ta.test.js` (30 cases): human mechanics plus real selectors —
Runner `CommandChoice` (Satellite Uplink, Notoriety, Dyson Mem Chip,
Replicating Perfection server list), Corp `Choice` (Encryption Protocol,
Big Brother, Power Grid Overload, Executive Retreat, Freelancer), run
calculator paths/IceAI (Snowball, Sherlock, Sensei), AI decision filtering
(Vamp, e3, AIZ, PGO trace boost, Freelancer targets).

`documentation/card-status.md` was not regenerated (shared generated file;
coordinator to run `node scripts/card-status.js`).

## Deferred optimisation

- Vamp: fixed 4-credit threshold; no comparison with breaching HQ value.
- e3: run calculator does not price e3 breaks; AI only substitutes e3 for
  already-planned breaks (can cost more than a multi-break breaker).
- Snowball: in-route strength growth not modelled (conservative).
- Notoriety: Runner AI does not plan the three central runs to enable it.
- Replicating Perfection: Runner AI does not plan a central run to unlock a
  valuable remote; Corp security evaluation does not credit the restriction.
- Sherlock 1.0 / ChiLo City Grid: Corp AI does not boost trace strength.
- Amazon Industrial Zone: Corp ICE placement does not prefer the AIZ server.
- Fetal AI: no Corp-side valuation of its access damage/steal tax.
- Encryption Protocol: simple one-copy placement heuristic.
