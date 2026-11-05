# Genesis: What Lies Ahead (wla, 2001–2020) — batch record

Branch `genesis/wla`. Implemented 2026-10-30. Definitions in `sets/genesis.js`;
tests in `tests/genesis-wla.test.js` (17 cases, real engine, run calculator and
AI selectors).

## Cards

| ID | Card | Status |
|---|---|---|
| 2001 | Whizzard: Master Gamer | Done |
| 2002 | Spinal Modem | Done |
| 2003 | Imp | Duplicate (31007), untouched |
| 2004 | Morning Star | Done |
| 2005 | Cortez Chip | Done |
| 2006 | Peacock | Done |
| 2007 | ZU.13 Key Master | Done |
| 2008 | The Helpful AI | Done |
| 2009 | Plascrete Carapace | Done |
| 2010 | Haas-Bioroid: Stronger Together | Done |
| 2011 | Mandatory Upgrades | Done |
| 2012 | Janus 1.0 | Done |
| 2013 | Ash 2X3ZB9CY | Done |
| 2014 | Braintrust | Done |
| 2015 | Snowflake | Done |
| 2016 | Restructured Datapool | Done |
| 2017 | TMI | Done |
| 2018 | Project Atlas | Duplicate (31073), untouched |
| 2019 | Caduceus | Done |
| 2020 | Dracō | Done |

Blocked: none.

## ELO sources

`data/elo.csv` (Trash or Busto snapshot in the repo), looked up 2026-10-30.
By Genesis ID: Whizzard 2015, Cortez Chip 1206, ZU.13 1604, The Helpful AI
1222, Plascrete 1754, Mandatory Upgrades 1420, Janus 1372, Snowflake 1279,
Restructured Datapool 1275, TMI 1215, Dracō 1255. Not ranked under their
Genesis IDs, so matched by exact title to the reprint row (as `fill-elo.mjs`
does): Spinal Modem 1416 (20007), Morning Star 1393 (20014), Peacock 1146
(20030), HB: Stronger Together 1288 (25066), Ash 1789 (25082), Braintrust 1443
(20094), Caduceus 1544 (25131). The set-file header lookup date was not edited
(shared region); the coordinator may add it.

## Shared engine/AI changes (for merge de-duplication)

- `mechanics.js` `TraceStrengthDecisions`: new trigger `responseOnTraceSuccessful`
  (no params), fired via `TriggeredResponsePhase` after a successful trace and
  before the trace's success callback; synchronous when nothing responds.
- (Replaced at merge by `variableMemoryCost` read through `MemoryCost()`, shared with Creeper.) - `decks.js` `InstanceCard`: calls optional `card.InitInstance()` after the deep
  copy (needed for accessors such as ZU.13's link-dependent `memoryCost`, which
  `jQuery.extend` would flatten).
- `runcalculator.js`: trash-cost pricing also reads `AIReducesTrashCost` from
  `runner.identityCard` (Whizzard).
- `ai_runner.js`: new Runner hook `AITriggerOnIceApproach(ice)` consumed at Run
  2.1 during a run (Cortez Chip). Documented in `documentation/ai.md`.
- First consumer card of the existing `modifyAllottedClicks` (Mandatory Upgrades)
  and first identity with `recurringCredits` (Whizzard; the existing Runner 1.2
  refill already covers identities).

## Rulings and modelling decisions

- Mandatory Upgrades: NSG ruling (2026.04) — allotted clicks are gained in the
  draw phase; scoring/forfeiting mid-turn does not change that turn's clicks.
  Implemented with `modifyAllottedClicks`, which only `ResetClicks` reads.
- Cortez Chip uses a lingering `modifyAdditionalRezCost` until either turn
  ends. `RezCost` adds this after clamping ordinary reductions to zero, so
  Braintrust cannot reduce the additional payment.
- Spinal Modem's damage resolves before the trace's own success effect (the
  trigger fires between success and callback); the printed order is after.
- The Helpful AI's boost is a lingering effect removed at the end of either
  player's turn.
- Subroutine `visual` values come from `scripts/subvis/audit.js --preset ffg`. Snowflake was
  checked with `zoom.js`: its subroutine prints on 4 lines (rows 61–118), so it
  uses `{y: 89, h: 64}`; the audit still flags it (detector read 1 line).
- Ash's lock is stored as `lockedServer` (availableWhenInactive) so it lasts for
  the run even if Ash is trashed on access; cleared by
  `automaticOnRunEndCleanup`.

## AI baseline

- Whizzard: `AIReducesTrashCost` (planner) + recurring credits via
  `AvailableCredits` for trash payments.
- Breakers: `AIImplementBreaker` (Morning Star break-any-number fixed strength;
  Peacock 2/+3 for 2; ZU.13 1/1).
- Cortez Chip: `AITriggerOnIceApproach` — unrezzed approached ice while Corp has
  1–7 public credits.
- The Helpful AI: `AIEncounterAbility` adds a once-per-route +2 strength mod on
  an icebreaker (`misc_minor` cost); encounter selector triggers it.
- Plascrete: max prevention for AI; `AIMeatDamagePrevention`.
- Janus 1.0 / Snowflake / TMI / Caduceus / Dracō: `AIImplementIce` (traces and
  psi modelled as successful, as Winchester does); Janus click-break hooks;
  TMI `RezUsability`; Dracō counter purchase.
- Ash: `AIAccessLimit`, `AIDefensiveValue`, `AILimitPerServer`, `AIRezWhenCan`.
- Restructured Datapool: `AITriggerWhenCan` with gated `Enumerate`.
- HB: Stronger Together, Mandatory Upgrades, Braintrust: passive, read by
  `Strength`/`ResetClicks`/`RezCost`.

## Deferred optimisation

- Spinal Modem: Runner run planning does not price core damage from traced
  subroutines during runs.
- Cortez Chip: credit window heuristic ignores the ice's (hidden) rez cost and
  whether the run actually needs the ice unrezzed.
- The Helpful AI: planner uses it only within one run; it does not value the
  remaining-turn boost or the lost link for future traces.
- Braintrust: no over-advancement plan (`AIOverAdvance`) to earn counters.
- Restructured Datapool: triggered at main-phase priority every turn the gate
  allows, before scoring/econ plans; no tag-punishment synergy check.
- Snowflake / traces: planner treats psi and traces as always successful;
  Corp/Runner bid strategy is the engine default (random psi bids).
- Ash: Runner AI does not reduce run potential for an Ash-protected server
  beyond HQ access counting.
- Dracō: counter purchase ignores competing rez/score needs.

## Validation

- Focused: `node tests/genesis-wla.test.js` (17/17), `node tests/ai-hook-docs.test.js`.
- `node tests/run-all-tests.js --fast`: exit 0, 139 files passed (after regenerating
  `documentation/card-status.md` and adding subroutine visuals).
