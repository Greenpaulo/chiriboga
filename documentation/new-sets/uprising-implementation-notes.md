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

### Batch 9 (26101–26105) — 2026-10-29, Codex

Gameplay and shared contracts:

- **Drafter** offers optional Archives recovery and an optional HQ/Archives
  install ignoring all costs through the existing free-install engine path.
  Install legality and Region/unique replacement remain with `Install`.
- **Týr** has a Runner-only encounter ability, losing one click per break and
  using `AddTempBonusClicks(corp, 1)` for each activation. The bonus stacks,
  survives removal of the ICE and is consumed by the next `ResetClicks(corp)`.
  Its second subroutine still gains three credits if no target exists or trash
  is prevented; gain follows the trash/prevention sequence. Core damage is
  represented as `coreDamage` in the run calculator.
- **Lockdown** shared support keeps these operations in `corp.resolvingCards`,
  where they remain active, while ordinary resolved operations leave as before.
  `CheckPlay` prevents another Lockdown. The local Comprehensive Rules v26.03,
  **3.5.1c** and **11.2**, require expiry after recurring refill at the next
  Corp turn-begins checkpoint, before pending conditional abilities resolve;
  the opening Corp paid window is earlier and keeps the Lockdown active.
- **NEXT Activation Command** raises all ICE strength by two. The source-card
  prohibition is `modifyCannot("breakUsing", sourceCard)`, consumed by ability
  discovery, activation and Runner decision choices, Runner `IceAct`, and Corp
  matching/native/hosted break accounting. This includes Runner-paid abilities
  on Corp ICE and leaves unrelated non-breaking abilities available. Restrictions
  disappear when the operation leaves play; no permanent ICE flags are added.
- **Scapenet** tracks successful Runner-turn runs, resets on the next Runner
  turn, traces at base seven, and removes an installed Chip/Virtual only after
  success. `Uninstall(card, removedFromGame)` preserves uninstall interrupts
  and normal hosted-card cleanup rather than leaving a removed host installed.
- **Tranquility Home Grid** installs only in remote roots. The engine records
  `server.rootInstallsThisTurn` at completed installs before install responses,
  including unrezzed cards and the Grid's own install, and resets it each turn.
  Only the first root install qualifies; installing ICE never qualifies.
- ICE overlay positions were measured with `scripts/subvis/audit.js` and
  checked with its ASCII gutter view: Drafter `(67,32), (102,32)`; Týr
  `(108,16), (127,16), (148,16)`. No card artwork was opened.

Baseline AI evidence (`tests/uprising-integration.test.js`): real Corp choices
recover an agenda and perform a useful free install; real rez selection uses
both ICE with credit guards; Týr's Runner ability and `IceAct` pay the click
and account for the Corp benefit without mutating sibling paths; the real
operation command consumer selects NEXT and Scapenet; trace failure/no-target
paths and removal work; the upgrade planner selects a protected remote and the
response selector chooses useful credits/draw through real engine helpers.
Existing Corp security/pricing focused suites also pass.

Queued optimisation (implementation is complete separately): Drafter uses the
existing recurrence/install rankings without comparing a recover-then-install
sequence or correcting their paid-install inhibition for every free install.
Týr values each extra future Corp click as `misc_moderate`, without planning
that turn or comparing breaker payments against the benefit given to the Corp.
NEXT is played opportunistically with useful ICE, without comparing a scoring
window or competing actions. Scapenet ranks targets by ELO and uses existing
trace bids, without comparing credit attrition or saving it for a better target.
Tranquility uses protected-remote placement and simple hand/credit thresholds,
without predicting repeated installs or the best time to rez for the next one.
Independent strategic review and owner adoption are not claimed.

Final validation: Node **20.19.0** (`.nvmrc`), `node tests/run-all-tests.js`:
**135 full test files passed**, exit **0**, including Corp decision fixtures
and decision snapshots. The first full attempt exposed three older isolated
harnesses without `command.js`; the shared restriction helper now tolerates
that test environment. All three affected files and the Uprising integration
checks passed before the repaired full run. Final logs and collected exit status:
`/tmp/chiriboga-uprising9-full-repaired.log` and
`/tmp/chiriboga-uprising9-full-repaired.exit`.

Also passed: all edited JavaScript syntax checks, Uprising integration,
`corp-server-security` (197 cases), `L9.1-breaker-pricing` (44 cases), AI hook
documentation, subroutine visuals, Eternal format, format-pool deck generation,
decklauncher identity changes, regenerated card status and `git diff --check`.
The batch brief reports no unfinished markers for all five cards. All five
existing ELO values are unchanged. No browser playtest or independent review
is claimed. Next implementation batch: **10 (26106–26108)**.

### Batch 10 (26106–26108) — 2026-10-29, Codex

- Flower Sermon gains five counters on its own score, spends a counter without
  a click, reveals before drawing two, and returns a mandatory HQ choice only
  after the draw and its responses finish. Either turn boundary resets use.
  Human activation can deck out, including an empty R&D; the counter is still
  spent and the return instruction does not continue after a failed Corp draw.
  The baseline AI uses its ordinary trigger selector for a safe action-phase
  draw with room in HQ, then returns a low-ELO non-agenda from its own hand.
- Prāna Condenser is unique. Its optional interrupt uses the existing
  `responsePreventableDamage` window: once per packet, prevent one remaining net
  damage, add one power counter and gain three credits. Declining, damage of
  another type, fully prevented and unpreventable damage give no reward.
  `Damage` now records `intended.damageSourcePlayer` from the source card's
  context (`context.player`), defaulting to Corp for legacy callers that omit
  context. Explicit Runner-sourced damage cannot feed Prāna. Callers using this
  distinction must pass their source card as the existing context argument.
  Its two-click cash-out snapshots counters and trashes the asset as a cost
  before dealing preventable net damage. Baseline AI installs/rezzes it, takes
  nonlethal economy exchanges, preserves lethal damage, and cashes out when
  counters exceed the public grip size. It does not model prevention tools when
  judging the apparent kill.
- Engram Flush chooses from all card types before revealing the grip, reveals
  every card with the existing reveal API (including actor notifications), then
  optionally trashes one legal matching card. A second subroutine reveals the
  current grip anew. Reveals clear temporary face-up state; a decision-scoped
  `privateLook` grants access to the revealed grip only while choosing a target.
  The chosen type clears on encounter and run end, even if inactive. The Corp
  chooses a type from public installed/heap frequencies and ranks revealed
  targets by ELO; it never reads the hidden grip to select the encounter type.
- Shared calculator addition: `trashGripCard` with `gripTrashLimit` caps finite
  targeted grip loss across the surviving subroutines and the remaining grip
  after earlier modeled damage, draws and targeted trashes. Card loss has its own
  route cost, reduces later damage capacity and finite-run continuation budgets,
  and never counts as damage or a flatline by itself. The Runner calculator may
  count matching types; the Corp calculator uses only grip size. No new AI hook
  name is introduced.

Baseline evidence: `tests/uprising-integration.test.js` exercises useful real
Corp draw/trigger, install, rez and revealed-card choices, the real prevention
window's once-per-packet consumption, full mechanics/cost ordering and guards,
cleanup, and both run calculators. No browser/manual-play evidence is claimed.

Optional deeper strategy: Flower Sermon activation during the Runner's turn,
HQ access defense and return-card sequencing; Prāna damage-versus-economy and
prevention-aware kill combinations; Engram type prediction from previously
revealed hands and contextual target value. Run modeling uses a type-count
prior rather than maintaining exact hypothetical grip contents through earlier
ICE, targeted trashes or subsequent runs.

Final verification: syntax checks for all edited JavaScript, the Uprising focused
integration test, AI-hook documentation, Eternal format, format-aware deck pool,
deck-launcher identity changes, batch brief (all three cards have no unfinished
markers), regenerated card status, and `git diff --check` passed. The initial
Node 20.19.0 full run passed all 135 files. A subsequent focused depletion
regression exposed overcounting grip trash after earlier damage; it was fixed
and its focused tests passed before repeating final validation on the final
source state.
The final full rerun also exited 0: **135 full test files passed**, including
Corp decision fixtures and decision snapshots. Output and exit status were
saved to `/tmp/uprising-batch10-final-full.log` and
`/tmp/uprising-batch10-final-full.exit` respectively.

## Batch 11 — 2026-10-29

Implemented Konjin (26109), Hyoubu Precog Manifold (26110), Kakurenbo (26111)
and La Costa Grid (26112), preserving printed metadata and existing ELO values.

- Konjin is unique and correctly has no subroutines. Its mandatory encounter
  Psi game offers another rezzed ICE or decline on different bids. The shared
  `ForceEncounter` stack leaves the attacked server/run position intact, fires
  the child's encounter effects, and returns through encounter-end responses
  to the suspended parent without passing the child or retriggering Konjin.
  Bypass, run ending, removed targets, broken-state restoration, path-cache
  invalidation and hypothetical-probe restoration use the same lifecycle.
  Its live AI target and calculator use the same public ranking. The ordinary
  breaker/effect search prices the child with remaining resources and shares
  finite-use persistents with later ordinary encounters. It retains calculator
  ownership for side-aware hooks and restores local pricing state in `finally`.
  A graded matching-bid
  branch prevents the stochastic defense becoming a guaranteed lockout.
- Manifold uses the shared Lockdown lifecycle, only triggers on successful
  runs against its chosen server, and can trigger on repeated runs. The Corp
  proactively plays it for a remote agenda, otherwise HQ, with legal Lockdown
  checks. Runner access potential uses the public matching-bid probability
  under the existing uniform affordable Psi policy. Expiry removes the risk;
  zero-credit bids cannot create a fictitious lockout. A shared success flag
  ensures an end-the-run effect after success goes to run-end responses
  without declaring the already-successful run unsuccessful.
- Kakurenbo pays all three clicks through `PlayClickCost`, trashes any number
  from HQ, conceals all Archives cards, optionally installs an asset, agenda
  or upgrade in a remote root at normal install costs, places two counters
  after installation/responses, and removes itself even after decline/cancel.
  The AI uses real legal install ranking to identify an agenda/advanceable
  ambush in HQ or Archives. Its multi-select supplies an actual option object;
  a preferred object containing a different `cards` array is not consumed by
  the Corp selector. No useful target means hold the operation.
- La Costa is remote-only and uses the engine's Region install restriction.
  Its mandatory turn response can put a counter on any root card, including
  itself or another card which cannot be advanced normally. The real trigger
  window selects a useful agenda for the AI. It installs in an agenda/protected
  remote and rezzes during the Runner turn for the next turn's counter. Future
  counters are not treated as a permanent requirement reduction or booked early.

Baseline evidence in `tests/uprising-integration.test.js`: real Corp play and
rez commands, actual card/target choices, a real mandatory turn-begin response
window, the real Runner command planner's stochastic access discount, nested
encounter return/bypass/end timing, both affordable and illegal/no-target
cases, Psi-restricted funding, Triple costs, Archives concealment, cancellation and removal, Region
replacement, actual child calculator pricing, finite breaker use across child
and ordinary encounters, and exception-safe hypothetical state restoration. Supplemental conditional
pricing regressions distinguish Runner-owned and Corp-owned child calculations.
No browser/manual-play evidence or independent review approval is claimed.

Queued deeper strategy: Konjin target ranking ignores contextual breaker/kill
value, Psi bids retain the shared uniform policy, matching-bid threat weight
is heuristic, and child pricing retains one cheapest conditional route rather
than jointly allocating alternatives across the whole run. Manifold server
selection does not compare all future threats. Kakurenbo does not optimise
Archives bluffing, all competing scoring lines, or its two-counter bonus in
install ranking. La Costa does not forecast future turn counters in scoring
search, and its AI target ranking prioritises agendas over advanceable assets.
These are separate from completed baseline implementation and owner adoption.

Verification: focused Uprising integration, AI-hook documentation, Eternal
format, format-aware deck pool, deck-launcher identity changes, JavaScript
syntax and diff whitespace checks passed. Batch brief reports no unfinished
markers for all four cards; Konjin's empty subroutine list is intentional and
printed. Generated card status refreshed. Final full-suite result is recorded
below after collection.

Final validation on Node **20.19.0** exited **0**: **135 full test files
passed**, including Corp decision fixtures, decision snapshots and integration
coverage. The first run identified missing dependencies in three older isolated
harnesses; those harnesses were updated without weakening their assertions.
After a passing full run, final side-ownership and restricted-Psi-funding
regressions also passed, followed by this full validation of the final source.
Stdout/stderr: `/tmp/uprising-batch11-verified-full.log`; separately recorded
exit status: `/tmp/uprising-batch11-verified-full.exit`.

## Batch 12 — 2026-10-29

Implemented 26113–26116, preserving exact ELO and metadata. GameNET gains once
per actual positive Corp-caused Runner payment/loss during a run. Source
attribution survives ordinary triggers, paid abilities, automatic responses,
trace/Psi decisions and delayed payment continuations. It excludes zero losses,
Runner breaker costs, off-run payments and basic access trash costs. Bellona
uses the standard five-credit steal cost and mandatory five-credit score gain.
F2P offers untagged Runner-only two-credit breaks during its own encounter,
mandatory Corp-selected installed-card bounce (including hosted-card cleanup),
and a tag subroutine. Gold Farmer taxes each printed break, with a marker that
excludes granted subroutines, and offers two independent pay-three-or-end choices.

Baseline evidence in `tests/uprising-integration.test.js`: real Runner command
and subroutine selection for F2P; Corp target selection for its bounce; normal
Corp rez selection with affordability guards for both ICE; Bellona steal/score
commands and automatic score responses; Runner run search with known/unknown
Bellona, F2P native breaks and tagged/resource exclusions, Gold Farmer breaker
losses and payment alternatives; Corp native/breaker pricing. Tests also exercise
GameNET through actual triggers, delayed DecisionPhase callbacks and trace/Psi
payments, saturation at zero, repeated/granted breaks and temporary-credit loss.
No browser/manual play evidence is claimed.

Shared changes are scoped card-ability source propagation and automatic credit
notifications, a newly-broken-subroutine automatic notification, target-aware
calculator payment budgeting, known-root agenda steal costs, and the ICE-owned
`AIBreakCreditLoss` consumer in Runner search and Corp pricing. Target-aware
payments use the existing pool-debit ledger, so breaker-only credits cannot
subsidise F2P/Gold Farmer/Bellona and losses never consume hosted credits.

Optimisation queued: GameNET future income versus current rez reserves and
payment/bid incentives; Bellona score-income sequencing and central random or
multiaccess cost forecasts; F2P contextual bounce/reinstall disruption and tag
trade-offs; Gold Farmer mixed break/pay planning with scarce/shared credit
sources and repeated-run forecasts. These are separate from implementation and
owner adoption; no independent review is claimed.

Validation: Node v20.19.0 (`.nvmrc`), focused Uprising integration, AI-hook
documentation, Eternal format, format-aware deckbuilding and identity-change
checks passed. The final `node tests/run-all-tests.js` passed all **135 full
test files** (exit 0), including Corp decision fixtures and snapshots. The
first full run exposed three isolated test-harness dependencies on new credit
source context; their globals/helper extraction were updated without changing
assertions, and all three focused checks passed before the successful rerun.
`node --check` passed for changed implementation JavaScript; generated card
status is current, batch 12 has no unfinished markers or empty effects, and
`git diff --check` passed. Batch 13 (26117–26119) is next; Uprising stays hidden
and untested until its remaining implementation batches complete.

## Batch 13 — 2026-10-30, Claude

Implemented Digital Rights Management (26117), SYNC Rerouting (26118) and
Ganked! (26119), preserving metadata and existing ELO values.

- **Digital Rights Management** tracks a successful HQ run during the Runner's
  turn from any zone (Scapenet pattern), resetting when the next Runner turn
  begins. Resolution records the `corpCannotScore` turn event first, then
  searches R&D for an agenda (a "find nothing" choice is allowed: searching for
  a characteristic may fail), shuffles R&D, reveals the agenda to the Runner,
  adds it to HQ, and offers an optional install of any agenda, asset or upgrade
  from HQ in a remote root (including a new remote) at normal install costs.
  `CheckScore` refuses while the turn event is set; turn events reset at each
  turn begin, which ends "for the remainder of the turn". A turn event avoids
  an always-present `modifyCannot` candidate on every copy in the deck, so
  `CardEffectsForbid` callers (including run-calculator break checks) do no
  extra work.
- **SYNC Rerouting** uses the shared Lockdown lifecycle (`ActiveLockdown`,
  `CheckPlay`, expiry at the next Corp turn) and keeps its printed 3 trash cost
  for access from HQ (CR 3.5.3). Its `responseOnRunBegins` fires for every run
  while it is active, offering "Pay 4[c]" only when affordable.
- **Ganked!** reveals itself when accessed in R&D and restores its facedown state
  afterwards elsewhere (Increased Drop Rates pattern). On access during a run,
  in a root, HQ or R&D (not Archives: a card already there cannot be trashed),
  the Corp may trash it (a cost, not preventable) to choose a rezzed ICE
  protecting that server. Its access is then completed (`ResolveAccess`) and
  `ForceEncounter(ice, position)` starts the encounter at that ICE's position.
  When the encounter ends the access window resumes and further accesses
  continue. If the run ends during it, encounter-end windows unwind and the
  run goes to Run 6.4 (the run stays successful). Remaining accesses are
  skipped. Run 6.4 cleanup restores R&D card visibility hidden during
  multi-access.

Shared changes: `checks.js` `CheckScore` (turn event); `mechanics.js`
`ForceEncounter` optional `approachIndex` saved/restored in the frame,
`ForcedEncounterReturnPhase` sends a post-success run end to `runEnds`, and
`RunUnsuccessful` unwinds forced encounters before the success-declared
shortcut; `phase.js` Run 6.4 cleanup; `runcalculator.js`
`_applyRunBeginTaxes` (new `AIRunBeginTax` hook, scanned only on
`corp.resolvingCards` once per calculation) and the start point's tag effect.

Baseline AI evidence (`tests/uprising-batch13.test.js`): real Corp command
selection plays DRM and SYNC; the real Corp selector tutors the highest-point
agenda and installs it through `_bestInstallOption`; DRM guards (agenda in HQ,
none in R&D, scorable agenda installed, last-turn HQ run) and the scoring
restriction/reset; Lockdown exclusivity; the real async Runner selector pays
SYNC's 4 credits and takes the tag when it cannot; the Runner run calculator
charges 4 credits or one tag at the start point and nothing after expiry;
Ganked!'s real Corp choice targets the strongest rezzed ICE, the encounter
resumes access or ends the run without an unsuccessful run, decline/no-ice/no-run
guards; Corp upgrade placement through `_bestServerToUpgrade` and
`AIPunishesAccess`.

Queued optimisation: DRM ranks agendas by points only and does not compare
the tutor with scoring windows beyond "no scorable agenda" or plan the follow-up
advance; SYNC is played on a Runner credit threshold or tag-punishment card,
and the Runner always pays when affordable (tags are only priced by the
generic tag limit when unaffordable); Ganked! ranks targets by subroutine
count/strength without considering installed breakers, and the Runner's run
planning does not anticipate forced encounters from access (the live encounter
search sees the forced ICE, then inner ICE it will not meet). No browser
playtest or independent review is claimed.

Validation: `tests/uprising-batch13.test.js`, `tests/uprising-integration.test.js`
(Konjin forced-encounter regressions), `tests/ai-hook-docs.test.js`,
`corp-server-security` (197), `L9.1-breaker-pricing` (44), Eternal format,
format-aware deck pool and identity-change checks passed; `node --check` for
every changed JavaScript file. Batch brief reports no unfinished markers.
The full suite is deferred to the coordinator's consolidated run.
## Batch 14 — 2026-10-30, Claude

Implemented 26120–26123, preserving exact ELO and metadata.

- **Earth Station: SEA Headquarters.** Run taxes use `modifyRunCreditCost`
  (front: 1 credit for HQ; flip side: 6 credits for any remote). The engine
  charges them through `AdditionalRunCosts`, and the Runner run calculator
  charges them as a run-start loss. The front's click ability flips it. On the
  flip side, a successful HQ run flips it back (`automaticOnRunSuccessful`).
  No flip-side image exists locally, so the face stays 26120 and the flip is
  logged, as for Hoshiko. "Limit 1 remote server" is a new identity property,
  `remoteServerLimit`. The engine helper `CorpRemoteServerLimitReached()`
  (checks.js) makes `CheckInstallDestination(card, null)` reject new remotes,
  so `ChoicesCardInstall` stops offering them. `CorpAI._rankedInstallOptions`
  filters new-remote options through `_withoutBlockedNewRemotes`. Empty remotes
  are already removed by the engine, so they do not count. Card effects that
  call `Install(card, null)` directly bypass the limit (optimisation/audit
  item). AI: `AITriggerWhenCan`, offered when a remote
  root holds a card and no installed agenda needs exactly the remaining clicks.
- **Transport Monopoly.** Scores with 2 agenda counters. Its once-per-turn
  ability works only from the Corp's score area during a run. It adds a
  lingering `modifyDeclareSuccess` effect, which phase.js reads at Run 5.1 as
  for Crisium Grid. The effect is removed on `responseOnRunEnds` (Trebuchet
  pattern), so it survives the agenda leaving the score area mid-run. The run
  is then neither successful nor unsuccessful. AI: gated in `Enumerate` at
  Run 4.5 just before the server approach (House of Knives pattern), and only
  for remotes with agendas, HQ that is at least half agendas, or a known
  game-winning breach. Never for R&D.
- **Wall to Wall.** A mandatory turn-begin trigger, checked on resolution:
  with another rezzed asset it resolves exactly 1 option and offers no
  Done/skip; otherwise up to 3 options, with Done available. Each option can
  be used once. The ICE option targets any installed ICE. Effects continue
  after "Add this asset to HQ", because the triggered ability is independent
  of its source. AI: useful ICE counter (below `AIAdvancementLimit`), then
  credit, then draw; never bounces it. Install and rez timing follow CSR
  Campaign.
- **Akhet.** Advanceable. At 3+ counters it gets +3 strength (`modifyStrength`)
  and the Afshar printed-break limit (`modifyCannot` plus `maxSrBroken`). The
  first subroutine gains 1 credit and places a counter on any installed card
  (Runner cards included). AI target: an agenda within 2 of scoring, then
  itself, then another agenda or advanceable ICE below its limit.

Evidence is in `tests/uprising-batch14.test.js`:

- Engine and run-calculator taxes, and Runner run legality.
- Flip and flip-back, the human limit, and the AI ranking without new remotes.
- Corp AI flipping through `Phase_Main`.
- Transport Monopoly counters, once-per-turn reset, lingering cleanup and the
  stolen-copy guard. The AI's `Phase_Movement` use and its negative cases.
- Wall to Wall both modes, ordering, bounce, and AI choices, rez and install.
- Akhet strength, the live break limit, `IceAI` `maxSrBroken`, and subroutine
  targets.

Focused checks passed:

- The batch test.
- AI hook docs.
- Uprising integration.
- Eternal format, format pool and identity change.
- Corp install-destination and install-decision tests.
- Hypothetical guards.
- Corp decision fixtures and snapshots.

The full suite was not run in this parallel batch session. Optimisation is
queued in the tracker.
## Batch 15 — 2026-10-30, Claude

Weyland Colossus, Winchester, Argus Crackdown and Cayambe Grid. Focused
regressions: `tests/uprising-batch15.test.js` (real Corp/Runner selectors,
turn-begin response window, run calculator and Corp security evaluation).

- **Colossus** is advanceable while unrezzed (CR 1.18.3) and gets +1 strength
  per counter. The 3-counter check is made when each subroutine resolves. At
  3+ counters the second subroutine trashes a program and then a resource;
  either is skipped if there is no target or the trash is prevented.
- **Winchester** has a gained (not printed) third subroutine while protecting
  HQ. Card instances are deep copies, so the gained subroutine is a card-owned
  `_hqSubroutine` object kept last in `subroutines` by `automaticOnAnyChange`
  and, as a fallback for ice moved mid-command, `automaticOnEncounter`. A new
  array is assigned instead of mutating the printed one.
- **Argus Crackdown** uses the shared Lockdown lifecycle (`trashCost: 4` is for
  access from HQ/R&D, CR 3.5.3). "Protected by ice" is checked when the
  successful-run trigger fires.
- **Cayambe Grid**: an advanced card has at least one advancement counter
  (CR 1.18.4); the counter can go on any ice in the server, including ice that
  cannot be advanced. The approach cost is calculated at payment as one
  aggregate payment (CR 1.16.2b, whose example is this card), and a cost of 0
  is paid automatically (CR 1.16.1d). Region limit uses the shared install
  check.
- **Shared Runner calculator change** (`runcalculator.js`,
  `CalculatePieceBegin`, complete-run approach block): two additive loops,
  once per calculation (not per search node): `AIRunSuccessfulMeatDamage` on
  `corp.resolvingCards` and `AIRunApproachCredits` on the server's root cards.
  No new hooks run inside the breaker search.
- **Baseline AI**: Corp plays Argus when no Lockdown is active and any server
  has ice; advances rezzed Colossus to 3; installs Cayambe in iced servers,
  rezzes it during the Runner's turn, and places counters on unadvanced ice
  first. The Runner planner pays the Cayambe tax and avoids lethal Argus damage.
  The Corp security evaluator adds 2 credits per advanced ice to the honest
  break cost.
- **Limitations (optimisation)**: Winchester traces are modelled as certain
  in both evaluators (no link/bid pricing). Argus play timing is not linked to
  Runner grip size or kill combos. Cayambe target choice does not plan around
  derez/trash risk. The Runner pays the approach tax only when the planner's
  complete run (which budgets known root trash costs) is still affordable.
## Batch 16 — 2026-10-30, Claude

Neutral Corp: Cyberdex Sandbox (26128), False Lead (26129), NAPD Cordon (26130).
Focused tests: `tests/uprising-batch16.test.js`.

- **Shared engine:** `Purge()` (`mechanics.js`) records a `corpPurge` turn
  event and passes its ordinal as the second `responseOnPurge` parameter.
  Existing purge responses ignore it. Purges before Sandbox was scored count,
  so a second purge in the turn (including the on-score purge after an earlier
  one) gains nothing.
- **Shared Corp AI:** `_purgeIncome()` sums `AIPurgeIncome()` from active Corp
  cards; `Phase_Main` takes the basic purge when no ordinary purge outcome
  applies, income exceeds 3 and `_sufficientEconomy()` is false. Evaluated
  only when purge is legal (start of turn, three clicks); no run-calculator
  cost.
- **Cyberdex Sandbox:** optional on-score purge through a Corp decision; the
  scored Sandbox is active when the purge resolves, so a first purge pays 4.
  The AI purges while the income is available, otherwise only against public
  virus counters or purge-disabled Runner cards.
- **False Lead:** score-area paid ability, no click cost, usable in any Corp
  paid window. The forfeit is paid even with fewer than two Runner clicks
  (then nothing is lost). The AI ability is hidden unless
  `AITriggerInPaidWindow()` agrees (Runner turn, outside a run, at least two
  Runner clicks, Runner within two points of winning or a remote agenda
  installed), so generic default "trigger" choices cannot forfeit it.
- **NAPD Cordon:** shared Lockdown lifecycle (stays in `corp.resolvingCards`
  until the next Corp turn begins; no second Lockdown). `modifyStealCost`
  returns 4 + 2 per advancement counter on the accessed agenda; `StealCost`,
  `CheckSteal` and the access phase already consume it, so an unaffordable
  steal leaves only the decline option. Printed trash cost 2 is recorded as
  metadata, as with NEXT; no engine path lets the Runner trash an active
  Lockdown.
- **Baseline evidence:** real `Score()` purge decision; real Corp command
  selector chooses purge (Sandbox scored, Corp short of rez credits) and not
  without Sandbox; real `Runner 1.1` paid window selects False Lead's trigger
  only with stakes; real Corp command selector plays Cordon with an agenda in
  HQ; real access phase enumerates, pays and declines the 8-credit steal, and
  the Runner access selector steals when affordable; expiry removes the cost.
- **Optimisation:** purge-for-income ignores competing install/advance plans;
  False Lead uses a turn-start heuristic and lost Runner clicks are absent
  from Corp security; Cordon plays at the first opportunity, and neither Corp
  security nor Runner run planning prices steal costs on unknown cards.
- **Validation:** focused tests only (batch file, `ai-hook-docs`, purge/steal
  consumers, Corp decision fixtures and snapshots). The full suite and §5
  integration checks are deferred to the batches 13–16 merge.
