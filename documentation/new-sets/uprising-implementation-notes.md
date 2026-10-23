# Uprising Implementation Notes

Rulings, engine changes and AI decisions for Uprising (`uprising`, pack `ur`,
26066–26130). The batch queue, completion log and optimisation queue are in
[the tracker](current-set-implementation.md).

## Setup — 2026-10-23

Selected by the user as the next set after Downfall was marked Implemented.

- `sets/uprising.js` already defined six cards: 26073 Paladin Poemu,
  26088 Mantle, 26090 Self-modifying Code, 26091 Cybertrooper Talut,
  26094 Daily Casts and 26095 DreamNet. They have no scaffold markers and no
  tests, so they are not credited. Their batches (2, 6 and 7) must verify the
  printed mechanics and baseline AI through real consumers before Complete;
  for example, confirm Talut's per-instance `boostedCards` state is not shared
  between copies and its strength boost ends with the turn.
- `python3 scripts/scaffold_set.py ur` added the other 59 cards. The scaffolder
  now also writes a `TODO` marker on identities with rules text, so the three
  identity stubs (26066, 26113, 26120) are counted as unfinished.
- ELO: the six existing ratings are preserved. The 59 new values were copied
  from the [Trash or Busto ranking](https://trash-or-busto.herokuapp.com/ranking)
  on 2026-10-23. The ranking lists six Uprising Booster Pack cards (Mystic
  Maemi, Swift, Megaprix Qualifier, La Costa Grid, Digital Rights Management,
  Cayambe Grid) under codes 27001–27007, so those were matched by exact title.
  Daily Casts keeps its existing 1877; the ranking showed 1870 on that date.
- `tests/uprising-integration.test.js` is a structural skeleton: the set loads
  and every ID in range has exactly one definition with matching metadata
  title and numeric ELO. Batches append their mechanics/AI cases to it or to a
  per-batch test file.

## Batch boundaries and known risks

Batches follow faction, then complexity. Mechanics that are new to the engine
and need a shared design in the first batch that meets them:

- **Flip identities** (batch 1 Hoshiko Shiro, batch 14 Earth Station): the only
  precedent is per-card `flipped` state on 35023 Dewi Subrotoputri
  (`sets/elevation.js`); there is no shared flip helper. Check whether the two
  Uprising identities justify a small shared one.
- **Companions** (batch 2): Keiko and Mystic Maemi share Paladin Poemu's
  hosted-credit pattern; Vantage Point and Downfall already contain companion
  cards to reuse.
- **Lockdown** (batch 9 NEXT Activation Command; reused by 26110, 26118, 26126
  and 26130): no engine support exists for "no active lockdown" or operations
  that stay in play until the Corp's next turn. Batch 9 should add one shared
  helper and AI consumer rather than per-card state.
- **Encounter/run redirects**: Konjin (batch 11) forces an encounter with
  another ice; Ganked! (batch 13) forces an encounter from an access.
- **Runner-usable ICE abilities** (Týr, F2P): System Update 2021 and Elevation
  bioroid ICE already implement "Lose [click]: Break 1 subroutine"; reuse that
  path.

## Batch notes

### Batch 4 — 26079–26082 (Claude, 2026-10-23)

Rulings:

- Afterimage: the metadata text restricts both the sentry bypass and the +2
  strength ability to stealth credits; the 1[c] break uses any credits. The
  bypass is chosen when the sentry is encountered, once per turn, paid 2 from
  stealth cards (possibly two sources, chosen one at a time).
- Penumbral Toolkit: the discount checks a successful run on HQ this turn
  (the server at success). Credits are spendable on anything while
  `attackedServer` is set; spending it empty trashes it (Open Market pattern).
- The Back: "use a piece of hardware" is counted when a Runner hardware ability
  resolves through `TriggerAbility` while a run is in progress. The first such
  use each turn is tracked even while The Back is not installed, so a later
  use the same turn after installing it gives no counter. Optional hardware
  `responseOn*` triggers and spending hosted credits are not counted (baseline).
  Its ability uses last-known information: counters hosted when the cost is
  paid set the limit (2 per counter), and it can be used with no counters.

Shared engine/AI changes (kept minimal for merges):

- `mechanics.js` `TriggerAbility`: fires
  `AutomaticTriggers("automaticOnAbilityUsed", [card, ability])` just before an
  ability resolves (2 lines).
- `utility.js`: new `HasTrashAbility(card)` — true for `trashAbility: true`
  or an ability whose text names `[trash]`. One-line `trashAbility: true`
  flags added to Crash Space, Decoy, Sacrificial Construct (coreset), Fermenter
  (systemgateway), Abagnale (systemupdate2021), Revolver, No Free Lunch,
  Stoneship Chart Room (midnightsun), Rent Rioters, Gourmand (elevation) and
  “Baklan” Bochkin (downfall). `tests/uprising-batch4.test.js` guards every
  implemented Runner card whose metadata has a [trash] cost; scaffolds with
  TODO markers are exempt, so batches 1, 3 and 5 (Gachapon, Boomerang,
  Simulchip) must name `[trash]` in the ability text or set the flag.
- `runcalculator.js`: `EncounterOptions` passes `(iceIdx, iceAI, point, rc)`
  to `AIEncounterOptions` (extra args ignored by existing cards), and
  `ValidateEncounterPoint` honours `restrictedCredits: n` on encounter
  persistents with Corsair's restricted-spend accounting (pool-only and
  unaffordable branches excluded).

AI decisions:

- Afterimage: Corsair-style restricted pump in `AIImplementBreaker`, bypass via
  `AIEncounterOptions` (one per route, not after use), `AIBypassesOneIce` for
  Corp security. Stealth credits are read under `AIWithRunContext` so
  run-only sources count for the prospective run.
- Makler: standard fracter pricing; Penumbral Toolkit: Touchstone-style run
  credit offset and economy install (priority 3 when free); The Back:
  `AIEconomyTrigger` gated by `AIWouldTrigger` and highest-ELO heap picks.
- Evidence: `tests/uprising-batch4.test.js` (22 cases) — real encounters and
  payments, run-calculator routes (bypass, restricted pump, once per route, no
  pool substitution, pre-run Toolkit offset), the AI's live encounter choice,
  Corp bypass hook, and the action-phase selector triggering The Back.
