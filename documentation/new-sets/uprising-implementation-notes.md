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

### Batch 1 (26066–26069) — 2026-10-23, Claude

Rulings and mechanics:

- **Hoshiko Shiro** keeps per-card `flipped` state (Dewi/Nebula precedent; no
  shared flip helper — Earth Station in batch 14 can decide whether one is
  worth adding). The identity's `automaticOnAccess` counts accesses only while
  `playerTurn == runner`; the count resets when the Runner turn begins.
  "When your turn ends" uses `responseOnRunnerDiscardEnds`. Only the current
  side's end-of-turn ability is checked, so a front-side flip does not
  immediately flip back. The flip side loses 1[c] only when the Runner has one.
  Open data question: neither the local metadata nor the NetrunnerDB API gives
  a flip-side title, image or link, so the face stays 26066 with link 0 and the
  flip is logged.
- **Moshing**: the additional cost is chosen in `Enumerate` (multi-select of
  exactly 3 other grip cards for a human; unplayable with fewer) and paid as an
  unpreventable trash before gaining 3[c] and drawing 3.
- **Devil Charm**: optional `responseOnEncounter` (use/decline; decline has
  `alt: "continue"`). Use removes it from the game and adds a Runner lingering
  effect giving that ice -6 strength until the run ends.
- **Gachapon**: the trash cost is paid first; up to 6 top cards move to a
  card-local `setAsideCards` zone (not `resolvingCards`, which would make them
  active). The -2[c] discount is an `availableWhenInactive` `modifyInstallCost`
  on the trashed Gachapon, limited to the set-aside card being installed. With
  3 or fewer cards left all are shuffled back; otherwise exactly 3 are chosen
  and the rest removed from the game.

Shared change (merge note): `runcalculator.js` `IceAct` now adds a persistent's
`strengthMod` to the strength of its `target` ice (5 lines after the
`card_str_mods` loop, CRLF preserved). Nothing else sets `strengthMod`, so
existing routes are unchanged. `AIDrawTrigger` is now documented in `ai.md` §7
and removed from `LEGACY_UNDOCUMENTED` in `tests/ai-hook-docs.test.js`.

Baseline AI evidence (`tests/uprising-batch1.test.js`): Moshing is chosen by the
real command selector and trashes the three non-keepers, but not a card worth
keeping; Devil Charm appears in the Run Calculator route through a strength 7
barrier with 3 credits, is accepted through the encounter window's command,
trigger and decision steps, is not used on weak ice and is not re-offered after
its window; Gachapon is triggered from the post-action window when a breaker
type is missing and installs the missing Killer over a higher-rated program.

Optimisation findings (queued):

- Hoshiko: run planning does not value keeping or losing the flip (the flip
  side's draw versus the front side's 2[c]).
- Moshing: plays only when three grip cards are not worth keeping; no
  hand-quality or tempo comparison.
- Devil Charm: `AIReducesIceStrength` reports 6 on every ice although it is
  single-use (same simplification as Leech); `AIInstallBeforeRun` keys only on
  visible strength 4+ ice. With several simultaneous encounter responders the
  path logic may prefer another card first.
- Gachapon: digs only for a missing basic breaker type; it does not value
  economy programs, virtual resources or the shuffle-back/removal trade-off.
  The action-phase draw consumer only considers click abilities, so the free
  ability is used in the post-action window.
