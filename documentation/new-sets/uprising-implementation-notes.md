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

### Batch 6 — Shaper programs and resources (26088–26092), 2026-10-23

- **Mantle**: existing definition verified unchanged (1 recurring credit; pays
  only for using programs and hardware, not installs or general spending).
- **Penrose**: implemented. Barrier break only while `installedThisTurn` (set
  on its own install, cleared at either turn's discard end, as Gauss). The +3
  pump is paid only from hosted credits on installed Stealth cards
  (`SpendHostedCredits`, as Corsair) and, following the engine convention, is
  offered only during an encounter with ice it can break and while too weak.
  Pump lasts for the encounter.
- **Self-modifying Code**: repaired. Payment is "using" the program (Mantle can
  pay), trash is an unpreventable cost, and the install choices are computed
  after paying 2[c]. Usable with an empty or program-less stack (a hidden-zone
  search may fail to find); humans get "Install nothing". Ability text keeps
  `[trash]` for the cross-set trash-cost check.
- **Cybertrooper Talut**: repaired. Its `responseOnRunnerTurnEnds`/
  `responseOnCorpTurnEnds` cleanup hooks do not exist in the engine, so the
  boost never expired; it now clears at either turn's discard end. The boost is
  a lingering effect (`modifyStrength` and cleanup are `availableWhenInactive`),
  so it outlasts Talut, and it ends early if the breaker leaves play.
  `boostedCards` is per copy (InstanceCard deep-copies definitions).
- **Paule's Café**: implemented. Hosted cards are faceup, `notInstalled` (no
  MU, not installed). Install is a paid ability (usable in any paid ability
  window); the first install through it each Runner turn is reduced by the
  number of installed unique Connection resources (`modifyInstallCost` on the
  card being installed). Affordability checks the 1[c] ability cost and the
  install cost against shared and restricted credit sources separately.
- **Shared AI change** (`ai_runner.js`, ~60 lines): new hook
  `AIAbilityInstallBreakers` feeds the run planner's bonus-breaker step. The
  action phase offers click abilities only, so a chosen paid-ability install is
  stored as `runner.AI._pendingAbilityInstall` and triggered by
  `_pendingAbilityTrigger` in the next paid ability window (first approach of
  the run, or Runner 1.3* after an action); it expires off the Runner's turn.
  `AIInstallDiscountAbility` offers may add a `followUp` stored the same way
  (Café host, then install). Removed SMC's uncalled ability-use hook and
  mis-typed `AIIcebreakerTutor`.
- Baseline AI evidence (tests/uprising-batch6.test.js): the real run planner
  runs HQ planning SMC, then triggers SMC at Run 2.1 and fetches the planned
  decoder; Penrose's stealth pump funds a strength-5 code gate route only with
  Mantle credit; Talut's boost removes a pump from a route; CommandChoice turns
  a grip install into Café host plus discounted install in Runner 1.3*.
