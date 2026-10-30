# Genesis: Cyber Exodus (`ce`, 2041–2060) — batch record

Branch `genesis/ce`, 2026-10-30, Claude. For the coordinator to consolidate
into the Genesis tracker.

## Cards

| ID | Card | Status | ELO |
| --: | ---- | ------ | --: |
| 2041 | Nerve Agent | Implemented | 1515 |
| 2042 | Joshua B. | Implemented | 1629 |
| 2043 | Emergency Shutdown | Reprint: now a `DUPLICATE` comment (systemupdate2021.js 31016) | — |
| 2044 | Muresh Bodysuit | Implemented | 1182 |
| 2045 | Snitch | Implemented | 1526 |
| 2046 | Chaos Theory: Wünderkind | Implemented (subtype fixed to `G-mod`) | 1566 |
| 2047 | Test Run | Duplicate (unchanged) | — |
| 2048 | Dinosaurus | Implemented | 1454 |
| 2049 | Personal Workshop | Implemented | 1739 |
| 2050 | Public Sympathy | Implemented | 1303 |
| 2051 | Project Vitruvius | Duplicate (unchanged) | — |
| 2052 | Viper | Implemented (visuals measured with `--preset ffg`) | 1533 |
| 2053 | Edge of World | Implemented | 1420 |
| 2054 | Sunset | Implemented | 1045 |
| 2055 | Marked Accounts | Implemented | 1373 |
| 2056 | Pop-up Window | Duplicate (unchanged) | — |
| 2057 | Woodcutter | Implemented (no printed subroutines) | 1005 |
| 2058 | Commercialization | Implemented | 1430 |
| 2059 | Private Contracts | Implemented | 1323 |
| 2060 | Chimera | Implemented | 1433 |

Blocked: none.

ELO source: `data/elo.csv` (the repository's Trash or Busto scrape). Matched
by ID, except 2046, 2048 and 2055, which match by name (25040, 25049, 25110),
the rule `scripts/fill-elo.mjs` uses.

Scaffold note: the duplicate detector missed Emergency Shutdown because
31016 uses a single-quoted `title`. Other packs may have the same miss.

## Shared engine/AI changes (de-duplicate on merge)

- `checks.js` `CheckAdvance`: `canBeAdvanced` may be a function (Woodcutter:
  only while rezzed). `ai_corp.js` advanceable-ice loop now calls
  `CheckAdvance` rather than reading the property as truthy.
- `mechanics.js` `Expose(card, afterExpose, context)`: optional callback after
  the viewing decision, or immediately with `false` if prevented (Snitch).
- `utility.js` `cardPropertyResets`: `notInstalled` resets to false when a
  card moves to a hand/deck/discard zone, so hosted-not-installed cards
  (Personal Workshop, Detente) lose the flag when they leave.
- `ai_corp.js` `_bestMainPhaseEconomyOptionCore`: Corp consumer for
  `AIEconomyTrigger` (number) + optional `AIWouldTrigger()` on active Corp
  cards whose click economy text misses the gain/take pattern. Documented in
  `documentation/ai.md` §5.6 and the Corp quick-reference table.

## Mechanics notes and rulings

- Nerve Agent: counter on successful HQ run; the number is chosen in
  `responseOnBreach` (0 to counters−1) and applied with `modifyBreachAccess`.
- Joshua B.: optional turn-begin click; the end-of-turn tag is a lasting
  effect (`availableWhenInactive`) taken at `responseOnRunnerDiscardEnds`.
  It's a forced non-automatic trigger because `AddTags` opens response windows.
- Muresh Bodysuit: mandatory automatic prevention of 1 on the first meat
  damage each turn (either player's turn).
- Snitch: once per run (reset at run start) on approaching unrezzed ice.
  Expose, then offer to jack out.
- Dinosaurus: `hostingMU: 99` (own pool) with `canHost` limited to one non-AI
  icebreaker; +2 strength via `modifyStrength`.
- Personal Workshop: hosted cards are `notInstalled` with power counters equal
  to `InstallCost`; reaching 0 (including a 0-cost card on hosting) calls
  `Install(card, null, true)`. The turn-begin removal is forced and asks for a
  choice when more than one card is hosted.
- Sunset: index 0 is innermost. A human picks the order from the outermost
  inwards.
- Woodcutter: subroutines rebuilt per advancement counter on any change and at
  encounter (Winchester pattern). Gained subroutines have no `visual`.
- Chimera: subtype through `modifySubTypes` while rezzed; cleared on derez.
  It derezzes at either player's discard-ends step (a forced trigger, because
  `Derez` opens response windows).
- Traces on Viper resolve through the shared `Trace`. The AI models them as
  successful.

## Tests

`tests/genesis-ce.test.js` covers human mechanics, AI selections (Sunset via
`Choice`; Marked Accounts, Private Contracts and Commercialization via the
Corp economy policy), guards and cleanup. `tests/subroutine-visual.test.js`
and `tests/ai-hook-docs.test.js` pass.

## Deferred optimisation

- Joshua B.: the tag-risk heuristic is crude (untagged, 4+ credits). It
  ignores the Corp's tag punishment.
- Personal Workshop: the AI never uses the 1[c] removal (for example, to
  finish a breaker before a run). It also doesn't weigh hosting against
  installing outright.
- Chimera: Corp planning of unrezzed Chimera sees no breakable subtype. The
  rez choice ignores multi-type breakers other than AI.
- Sunset: the heuristic is strength-only. It ignores the Runner's breakers
  and ETR order.
- Viper: trace link and bids aren't priced in run planning.
- Snitch: the expose and jack-out choice uses a fresh full-path recompute and
  no cost threshold.
- `documentation/card-status.md` wasn't regenerated here, to avoid tracker
  conflicts. Run `node scripts/card-status.js` after merge.
