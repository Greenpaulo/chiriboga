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

### Batch 8 — Haas-Bioroid (26096–26100), 2026-10-23

Shared changes (kept minimal; both are needed by these cards only):

- `utility.js` `MoveCardTriggers`: new card hook
  `interruptOnAddedToScoreArea(scoreArea, locationfrom)`, called when a card
  enters either score area, after `cardLocation` is set. Project Vacheron uses
  it so its 4 counters exist before the after-command win check. A
  `responseOnStolen` placement would let a 3-point steal win first. Because it
  runs inside `MoveCard`, it also covers non-`Steal` moves into the Runner's
  score area, such as a swap from the Corp's score area.
- `mechanics.js` `Damage`: `runner.coreDamage` now increases by the damage
  dealt, not by 1 per call. Every existing caller does 1 core damage, so only
  Cerebral Overwriter's X > 1 changes behaviour.

Rulings and decisions:

- Megaprix Qualifier counts any other copy in either score area. The +1 is
  computed from the hosted counter through `agendaPointsForPlayer`.
- Project Vacheron: "from anywhere except Archives" is tested against the
  card's location as it moves. The gained ability uses
  `responseOnRunnerTurnBegins` with `availableWhenInactive`, because cards in
  the Runner's score area are not active. Several older readers use raw
  `agendaPoints` (Data Dealer AI, some run-calculator and Corp-AI estimates),
  so they see 3. That is the same accepted limitation as Let Them Dream.
- Bass CH1R180G4 trashes itself as an unpreventable cost, then gains 2 clicks.
- Cerebral Overwriter works unrezzed, like other ambushes. It is offered only
  with at least one advancement counter and 3[c] available; paying for 0 damage
  has no effect.
- Vaporframe Fabricator installs without rezzing. Its trash response needs the
  Runner to trash it while it is rezzed, using the Calvin B4L3Y pattern. "Not in
  the root of this server" excludes asset, upgrade and agenda options for that
  server, but ice can still be installed protecting it.

Baseline AI evidence: `tests/uprising-batch8.test.js`. It drives the real Corp
action-phase selector for Bass (score burst) and Cerebral Overwriter (advance
up to 3), and uses AI `preferred` choices for Overwriter's payment and
Vaporframe's installs. Deeper strategy is queued in the tracker's optimisation
queue.
