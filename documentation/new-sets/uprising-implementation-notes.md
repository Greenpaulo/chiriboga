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

No batches implemented yet.

### Batch 5 — 2026-10-23

Harmony AR Therapy, Aniccam, Simulchip, Cordyceps, Euler (26083–26087).
Focused tests: `tests/uprising-batch5.test.js`.

Rulings (NetrunnerDB/NSG rulings and CR v26.03):

- Aniccam: events trashed as they finish resolving count, events that remove
  themselves from the game do not, and facedown installed cards have no card
  type. Discarding is not trashing (CR 1.19.3), so hand-size discards do not draw.
- Simulchip can be used with no program in the heap. The program trashed to pay
  its cost reaches the heap first and may be the one it installs.
- Harmony AR Therapy can be played with an empty heap or stack.
- Cordyceps follows CR 8.8.3: swapped ice stay installed and keep hosted cards.
  It does not offer ice hosted on Awakening Center; that card is in the
  non-playable Creation and Control set.

Shared engine/AI changes (kept minimal):

- `mechanics.js` `Trash()`: before cards move, records whether a faceup
  Runner event or a faceup installed program is trashed. It then sets
  `trashEvent.runnerEventOrdinal = RecordTurnEvent("runnerEventTrashed")` and
  records `RecordTurnEvent("runnerInstalledProgramTrashed")`. No existing
  trigger changes.
- `phase.js`: the post-action cleanup that moves resolved Runner cards to the
  heap (`TrashResolvedRunnerCard`) also records `runnerEventTrashed` for events.
  When the post-action window closes, `Resolve.n` opens one
  `responseOnPlayedEventTrashed(events, trashEvent)` window before continuing.
  It does not wait for the next action's Init, because `IncrementPhase` enters
  the post-action phase before the event resolves. Only Aniccam uses the new
  callback; other "whenever trashed" cards still see only `Trash()`.
- `ai_runner.js`: a Runner consumer for `AITriggerInPaidWindow()` (already a
  Corp hook). It runs outside runs when `trigger` is offered, and only click
  abilities count during `Runner 1.3`.

Card decisions:

- Harmony AR Therapy chooses one card at a time (names already chosen are not
  offered) with a Done option, then shuffles and removes itself from the game.
- Aniccam's draw is mandatory and uses the shared per-turn ordinal, so an event
  trashed before Aniccam was installed still uses up the "first time".
- Simulchip discounts through `modifyInstallCost` with `availableWhenInactive`,
  because it is already in the heap while the install resolves. The cost and the
  chip are trashed together and cannot be prevented. The install is mandatory
  when any program is affordable.
- Cordyceps swaps through a once-per-turn optional success response. Human
  players choose an ice on the central, then any other installed ice. The AI
  offers only its best threat-lowering swap.
- Euler tracks `installedThisTurn`, reset when either turn begins. Its 2[c]
  break, like Buzzsaw's, makes the AI break a second subroutine when one remains.
