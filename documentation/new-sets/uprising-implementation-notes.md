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

### Batch 3 (26074–26078) — Criminal

No shared engine or AI helper changes; all logic is on the five cards. Tests:
`tests/uprising-batch3.test.js` (real engine, human menus and both AIs).

- **Bravado**: only servers with ice are offered. `responseOnPassesIce` records
  each distinct passed ice (ruling: a piece passed twice counts once); the
  automatic `responseOnRunEnds` pays 6 + that count whether or not the run was
  successful. Unrezzed ice the Corp does not rez is passed and counts.
- **Boomerang**: the install response chooses any installed ice (rezzed or not);
  the chosen ice is cleared if it is uninstalled. `[trash]` breaks 1 subroutine,
  then offers an optional second. The trash ability creates a delayed
  "when this run ends" ability, kept as flags read by `availableWhenInactive`
  `responseOnRunSuccessful`/`responseOnRunEnds` on the trashed card and cleared in
  `automaticOnRunEndCleanup`. It shuffles any heap copy (this one first).
- **Mu Safecracker**: credits come only from installed stealth cards that define
  `canUseCredits("using", mu)` and allow it (for example Mantle). Cloak is excluded because its credit is for icebreakers
  only; Penumbral Toolkit (batch 4) qualifies only once it defines
  `canUseCredits`. Payment uses `SpendHostedCredits` source by source, never the
  pool. The offer is a `responseOnRunSuccessful` choice; `modifyBreachAccess` adds
  1 on that server’s breach, cleared when the run ends.
- **Prognostic Q-Loop**: "first time each turn a run begins" is tracked while
  inactive too, so a run begun before installation uses it up. The look is an
  optional `responseOnRunBegins` choice; looked-at cards get `knownToRunner`. The
  once-per-turn ability pays 1, reveals the top card and offers installing a
  program or hardware at its normal cost.
- **Swift**: `memoryUnits: 1`; the first-run-event flag uses its own name
  (`usedThisTurn` is reset when a card changes zones) and is tracked while
  inactive, matching Ken Tenma/Touchstone.
- Test harness note: test-instanced cards need
  `InvalidateActiveTriggerCandidateCache()` for `modify*` callbacks to be seen.
