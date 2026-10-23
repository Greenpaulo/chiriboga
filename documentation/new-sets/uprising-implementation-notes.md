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

### Batch 2 — 26070–26073 (Claude, 2026-10-23)

Shared engine change (`mechanics.js`, small and additive; merge note for other
batches):

- `Install` records turn event `"runnerCompanionUse"` when a Runner card with
  the Companion subtype is installed (next to `"runnerHardwareInstall"`).
- `SpendCredits` tracks the hosted sources it spent from (`spentSources`);
  `CreditSpendResponses(..., sources = [])` takes them as a new trailing
  argument, records `"runnerCompanionUse"` once per payment that spent
  companion credits (printed subtypes, so payment never needs the active-trigger
  scan; no effect grants Companion), and passes `sources` as a fifth `responseOnCreditsSpent`
  parameter. `SpendHostedCredits` passes `[source]`; the psi-bid deferred
  payments carry `sources` too. Existing callers and Shackleton are unchanged.

Rulings and decisions:

- Keiko: "the first time each turn" is one shared event across installing a
  companion and spending credits from an installed companion, and it may have
  happened before Keiko was installed, so both triggers read
  `TurnEventCount("runnerCompanionUse") == 1`. Keiko is itself a companion, so
  installing it as the turn's first companion event gains 1[c]. The gain from a
  spend resolves after the payment completes, so the gained credit cannot pay
  that cost. Limit 1 console is the engine's existing console replacement.
- Odore: Interface only marks the break abilities (CR 3.9.5e–g). The 0[c]
  single break has no use limit, so with 3+ installed virtual resources (any
  installed resource with the Virtual subtype, hosted ones included) every
  sentry subroutine is free. Its ability order puts the free break first for the
  AI executor; the strength boost resets at encounter and run end.
- Mystic Maemi: credits pay only for playing events. With an empty grip the
  random-trash option cannot be chosen, so Maemi must be trashed.
- Paladin Poemu: the pre-existing definition was rewritten: the steal drip is
  now automatic (it is mandatory), the trash goes through one `DecisionPhase`
  for both human and AI, the AI choice values Poemu's own credits, and the
  no-op `AIPreferredInstallChoice` and debug logging were removed. The trash is
  mandatory and always has a target (Poemu itself).

AI evidence (`tests/uprising-batch2.test.js`, 17 cases): the real command
selector installs Keiko (and not a second console), Mystic Maemi and Paladin
Poemu; `FullCheckPlay` counts Maemi credits for Sure Gamble; AI payment uses
Poemu credits before the pool; the run calculator plans Odore at 2[c] per
sentry, 3[c] pump + 2[c] break, and 0[c] with 3 virtual resources; a real
encounter driven by `CommandChoice`/`SelectChoice` breaks Rototurret with Odore
at the planned cost both ways.

Optimisation candidates: Poemu/Maemi do not plan to spend the stash before it
reaches 3 (for example, installing a cheap card to avoid Poemu's trash);
Maemi's keep/trash choice ignores the value of the stash against the grip;
Keiko's economy priority ignores how often companions will actually be used.

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

### Batch 7 — 2026-10-23

Buffer Drive, Daily Casts and DreamNet. Focused tests:
`tests/uprising-batch7.test.js`.

Shared engine changes (small, used by these cards only so far):

- `Trash()` (`mechanics.js`) now records which trashed cards came from the
  Runner's grip or stack, before they move. It adds
  `trashEvent.runnerGripOrStackCards` and
  `trashEvent.runnerGripOrStackOrdinal` (turn event `runnerGripOrStackTrash`,
  0 when no such card). Existing `trashEvent` consumers are unaffected.
- The successful-run declaration (`phase.js`, `Run 5.1`) records the turn
  event `runnerSuccessfulRun` before `automaticOnRunSuccessful`.

Rulings and decisions:

- Buffer Drive: "first time each turn" counts trash events from before it was
  installed, as `TurnEventCount` does for Masterwork. Discarding (hand size,
  `Discard()`) is not trashing (CR 1.19.3), so it does not trigger. Net damage,
  stack trashes and grip trashes as costs do. Only cards from the grip/stack
  that are still in the heap are offered. The human may pass; the AI always
  bottoms a card. Its remove-from-game ability needs a heap card and is a cost
  paid on activation; the card is removed from the game, not trashed. It has no
  [trash] cost, so the `trashAbility` cross-set rule does not apply. Marked
  `unique` per metadata.
- Daily Casts: the turn-start take was automatic and moved the empty card to the
  heap with `MoveCard`, so no trash windows opened. It is now a non-automatic
  mandatory trigger, so the human resolves it each turn, and it uses
  `Trash(this, true)`. It takes as many credits as remain, up to 2.
- DreamNet: the existing trigger was `automatic` with an `Enumerate`, which the
  engine ignores (it logs an error), so it drew on every successful run. Now it
  is non-automatic and uses `TurnEventCount("runnerSuccessfulRun") == 1`, so a
  successful run before installation uses up the first time. The credit
  (Digital identity or 2+ link) is checked on resolution and gained after the
  draw. AI: `AIDrawInstall` 2, and `AIEconomyInstall` 1 only with the credit
  clause. Before, it was a priority-economy install even without it.

Baseline AI evidence (real consumers): the AI installs Daily Casts as priority
economy and DreamNet when it wants cards. Buffer Drive's trash response gives
the AI a needed icebreaker. In the post-action paid-ability window, the
draw-trigger loop removes Buffer Drive to put a needed heap breaker on top. It
does not trigger with no needed breaker in the heap.

Queued for optimisation:

- Buffer Drive recovery happens only in a paid-ability window, so an
  action-phase draw can come first.
- Install has no damage/mill-aware value.
- DreamNet's draw is not in run potential.
