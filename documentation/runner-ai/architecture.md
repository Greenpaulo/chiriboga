# Runner AI architecture

How the implemented Runner AI (`ai_runner.js`, with the run calculator in
`runcalculator.js`) works today; the code is the source of truth, so when this
file and the code disagree, fix this file. Every backticked function, method,
property or hook name here must exist in the code, and
`tests/ai-roadmaps.test.js` checks this. Plans live in
[roadmap.md](roadmap.md); rules every change obeys live in
[principles.md](principles.md) and
[documentation/ai-principles.md](../ai-principles.md).

Read only the section you need:

| Section | Covers |
|---|---|
| [Decision flow](#decision-flow) | Entry points, dispatch order, preferences, temporary values, caches |
| [Run selection and the run calculator](#run-selection-and-the-run-calculator) | Server potential, run cost, bonus breakers, credit offsets, randomness |
| [Keep and discard decisions](#keep-and-discard-decisions) | Which grip cards are kept and which are discarded first |
| [Mulligan](#mulligan) | The opening-hand decision |
| [Installing and playing cards](#installing-and-playing-cards) | Economy, draw, install/play order, wasteful checks, MU, title lists |
| [Encounters and breaking](#encounters-and-breaking) | Following the planned path through encounters and subroutines |
| [Access decisions](#access-decisions) | Breach replacement, access order, steal/trash/trigger |
| [What the Runner AI knows](#what-the-runner-ai-knows) | Tracked information and every read of hidden information |
| [Known limits](#known-limits) | Factual gaps in the current code |
| [Hook reference](#hook-reference) | Card-facing hooks the Runner AI consumes |

## Decision flow

The engine calls `CommandChoice(inputOptionList)` or `SelectChoice(optionList)`.
Both go through `_computeChoice(optionList, choiceType)`, which awaits
`_internalChoiceDetermination(optionList, choiceType)` and then always calls
`_RestoreTemporaryValueModifications()`. `CommandChoice` copies the option list
so pretend options can be added, and clamps an out-of-range result to 0.
`_internalChoiceDetermination` is one long function; the first branch that
returns wins:

```text
CommandChoice / SelectChoice
  └─ _computeChoice ─ _internalChoiceDetermination ─ restore temporary values
       1. this.preferred (plan from an earlier decision or from card code)
       2. only one option → 0
       3. pre-plan play-for-install; cardsWorthKeeping; priorityEcon
       4. phases: Runner Mulligan, Runner Install, discard, tags, jack out,
          Run Accessing, Run Subroutines, Run 3.1 / Encounter, Run 5.1, Run 5.2
       5. window-of-opportunity events (AIPlayWhenCan)
       6. run offered → score servers, maybe prep, run
       7. not running → draw, hand size, economy, worth-keeping cards,
          generic installs/plays, click for credits
       8. fallback: RandomRange over the options
```

**Preferences.** `_returnPreference(optionList, cmd, prefs)` stores `prefs` in
`this.preferred` and returns the index of `cmd`, else of the pass option (the
command may come next phase). Later calls honour, in order: the preferred
command for a command choice (not cleared); `title` plus `option` or `index`
when `currentPhase.title` matches; `chooseServer`; and, when `executingCommand`
equals the preferred command, option fields matched by key (`serverToRun`,
`cardToTrigger`, `abilityAlt`, `cardToPlay`, `cardToInstall`,
`hostToInstallTo`, `cardToTrash`). A match moves to `nextPrefs` or clears the
preference; `useAsCommand` and a trace preference's `IncreaseStrengthChoice`
are special cases. Card code also writes `runner.AI.preferred` directly.

**Temporary values.** `_SetTemporaryValueModification(obj, prop, val)` is safe
only inside `_internalChoiceDetermination`, because `_computeChoice` restores
every recorded value afterwards. Its one use is play-for-install: a playable
grip card with `AIPlayForInstall` gets `availableWhenInactive` set on its
`modifyInstallCost` and a pretend install option is added; if install is chosen,
`CommandChoice` plays a card whose `AIPlayForInstall(cardToInstall)` is true and
chains the install through `nextPrefs`. Run hypotheticals instead modify and
restore state through hooks in `_commonRunCalculationChecksAsync()`.

**Caches.** `cachedPotentials` (read by `_getCachedPotential()`,
`_highestPotentialServer()`, `_priorityIceList()` and many cards) and
`cachedCosts` are rebuilt whenever run is offered; `_calculateRunPathPieceEnd()`
overwrites a server's cost after every path calculation, complete or exit
strategy, with whatever offsets it used. `_getCachedCost(server)` calculates
only for servers missing from `runsEverCalculated` (never cleared).
`cachedBestPath`, `cachedComplete` and `cachedPathServer` hold the latest path;
`_cachedOrBestRun(server, startIceIdx)` reuses it for the same server, else
calculates a complete run with `_calculateBestExitStrategy()` as fallback.
`runsReady` turns true once run evaluation has finished; card code reads it.

## Run selection and the run calculator

**Server potential.** When run is offered, `serverList` holds HQ, R&D, Archives
(this order matters for Sneakdoor Beta) and the remotes. Base potential:

- R&D 1.0 (1.5 if HQ is empty); if the top card is known, agenda points plus 1
  for an agenda, else 0. Archives: 0.2 per facedown card.
- HQ: the unknown fraction of HQ from `_infoHQScore()`, plus 1 per suspected
  agenda with zero uncertainty, plus 0.5 × `_additionalHQAccessValue(null)` when
  positive; at least 0.5 when HQ holds one little-known card.
- Remote root cards the Runner can see: agenda points plus 1; Clearinghouse
  max(1, advancement); Corporate Town 1 plus installed resources; PAD Campaign
  0.5; unrezzed Regolith Mining License, Nico Campaign or Marilyn Campaign 1.0;
  other rezzed cards 0.1 per hosted credit. Unseen root cards: 1.5 if advanced
  above 3, 5.0 if advanced at all, else 1.0.

`_breachWouldBePrevented()` (any active `AIPreventBreach(server)`) zeroes the
potential; active cards add `AIRunExtraPotential(server, potential)` (only with
`AIBreachNotRequired` when breach is prevented). The best Run-subtype event by
`AIRunEventExtraPotential` (less the base potential if the event's own
`AIPreventBreach` is true; must pass `FullCheckPlay`) or click ability by
`AIRunAbilityExtraPotential` (wins when higher) is added and remembered as
`useRunEvent` or `useRunAbility`. The potential is then cached.

**Bonus breakers.** With two or more clicks, candidates are installable
Icebreaker or `AISpecialBreaker` cards in `this.cardsWorthKeeping` (install
cost) and, with three or more, breakers from `AIIcebreakerTutor()` on playable
worth-keeping cards (tutor play cost). Rank = visible ICE on the server lacking
`_matchingBreakerInstalled()` that the candidate matches
(`_breakerMatchesIce()`), times its `elo`; the best positive rank wins.

**Cost.** `_commonRunCalculationChecksAsync(server, runEventCardToUse, ...)`
sets offsets and calls `_calculateBestCompleteRunAsync()`:

- the pool offset starts at Corp bad publicity; one click starts the run;
  foresight adds a fixed +3 pool credits, −1 click and +3 damage allowance;
- each active card adds `AIRunPoolCreditOffset(server, runEventCardToUse)` to
  the pool and `AIRunEventDiscount(server, runEventCardToUse)` to the discount;
- a bonus breaker costs its cost, two clicks and one card of damage allowance,
  around `AIPrepareHypotheticalForRC(host)` / `AIRestoreHypotheticalFromRC()`;
- a run event adds `AIRunEventExtraCredits` to non-pool credits, pays play cost
  minus discount (minimum 0) from the pool, costs one card of damage allowance,
  is exposed as `rc.runEvent`, and wraps the search in
  `AIRunEventModify(server)` / `AIRunEventRestore(server)`.

`_calculateRunPathPieceBegin()` turns offsets into limits: clicks, pool, other
credits (`AvailableCredits(runner)` minus the pool), damage (grip size, less the
worth-keeping count when cached potential is below 2) and tags (min(clicks, half
the pool) minus current tags). If a click would remain after the run, grip
cards' `AIGripRunPotential(server)` add potential (after caching).

**Choosing.** Each potential gets `0.2 * Math.random() - 0.1` of jitter (the
only other randomness is the final `RandomRange` fallback). A server above
potential 2 with no complete path is recalculated with foresight; if that
succeeds the AI does not run this click. `SortCardsWorthKeeping()` reorders
`this.cardsWorthKeeping`. Servers below 0.5 or with infinite cost are dropped;
the rest are sorted by potential only. Below 0.75, T400 Memory Diamond is
installed when the grip is over size with under two clicks, else the run goes
ahead. From 0.75 without a bonus breaker, running yields to economy
(`priorityEcon`, potential below 1.5, two or more clicks) or setup (potential
below 1.1, cost above 1.0, worth-keeping cards in hand).

For the chosen server, a bonus breaker is kept only if the run costs more
without it, and is then installed or tutored. Otherwise, with a click to spare,
the best valid, affordable `AIInstallBeforeRun(server, ...)` card is installed,
else a higher-priority `AIPlayBeforeRun(server, ...)` card is played. Then the
run event (if path damage is below grip size plus 1; an event with
`AIRunEventExtraCredits` is held when the run is affordable without it) or run
ability is used with a `chooseServer` follow-up; otherwise the basic run.

**RunCalculator.** `Calculate()` and `CalculateAsync()` share
`CalculatePieceBegin()`, `CalculatePieceMiddle()` and `CalculatePieceEnd()`.

- Approach costs (complete runs): one net damage per scored Corp card with an
  unused agenda counter (House of Knives); breach handling is skipped when
  `_breachWouldBePrevented()` holds; unseen root cards advanced above 4 against
  Weyland add 3 credits (Clearinghouse; an unused Carnivore cancels it), other
  advanced unseen cards add 2 plus advancement net damage (Urtica Cipher);
  Jinteki: Personal Evolution and a possible Hokusai Grid add one net damage;
  the highest visible trash cost less the best `AIReducesTrashCost(card)` is
  added; Manegarm Skunkworks forks into two clicks or five credits.
- `IceAI(ice, maxCorpCred, ...)` describes each ICE from the start inward. Seen
  ICE that is rezzed or affordable uses `AIImplementIce` (default one
  `misc_moderate` per subroutine); seen but unaffordable ICE is empty. Unseen
  ICE are guessed from advancement and Corp credits (Pharos, Hortum, Ice Wall,
  or a Sentry with net damage plus pay-or-ETR); ICE behind the first unseen one
  are assumed weaker. Active cards' `AIModifyIceAI(iceAI, startIceIdx)` adjust
  the result.
- Search is a depth-first stack with best-cost pruning, capped at 1000 loops.
  `Directions()` collects `IceAct()` moves (`AIImplementBreaker`) from active
  cards and the bonus breaker, rejects unused pumps and expands subroutine
  choices; `ValidateEncounterPoint()` applies effects (ETR and `misc_serious`
  end complete paths; `AIIceSpecificEffect` expands); `EncounterOptions()` adds
  `AIEncounterOptions` from active cards and the run event.
- `PointCost()` weights credits spent 0.6, lost 0.7, clicks 0.8, virus
  counters 0.3, damage 1.3, tags 2.4 and serious/moderate/minor effects
  3.0/0.8/0.3. `ValidPoint()` enforces the limits. A failed exit-strategy search
  retries with unlimited tags, then unlimited damage.

## Keep and discard decisions

`_cardsWorthKeeping(cards)` returns the cards worth keeping, one copy per title,
in input order. `_cardsInHandWorthKeeping()` applies it to the grip and is
stored in `this.cardsWorthKeeping` at the start of every decision. Per card:

1. If `_wastefulToInstall(card)` is true, the card is not kept, whatever its
   hook says (this also runs for events).
2. Otherwise it is kept if **any** of these holds:
   - its `AIWorthKeeping(installedRunnerCards, spareMU)` returns true;
   - it has a Console, Fracter, Decoder or Killer subtype no installed card has;
   - it is an AI, an `AISpecialBreaker` or an Icebreaker that is not a Fracter,
     Decoder or Killer, and `_essentialBreakerTypesNotInHandOrArray()` still
     reports a missing type.

The subtype rules run after the hook and only set keep to true, so a card whose
`AIWorthKeeping` returned false is still kept when a subtype rule matches. A card
matching neither is excluded, which puts it among the first discarded. Coverage
counts are generated in `documentation/card-status.md`.

`_essentialBreakerTypesNotInHandOrArray()` lists Fracter/Decoder/Killer types
(or an override list) missing from the array and grip.
`_icebreakerInPileNotInHandOrArray(pile, installed)` returns the first pile card
of a missing type (sorted first when several are missing), else an AI.

`SortCardsWorthKeeping(cards)` (default `this.cardsWorthKeeping`) groups cards by
`EstimateCardPriority(card, priorityIceList)` over `_priorityIceList()`: high
when the card matches visible ICE on the highest-potential server (else any
installed ICE) that lacks an installed matching breaker, low when it has one.
With Rielle "Kit" Peddler, Decoders move to the front of each group.

`_indexOfBestDiscardOption(optionList)` discards, in order: a unique card already
installed or duplicated in the grip; a non-kept card with a copy installed or in
the grip; any non-kept card; any card with such a copy; the first option.

Consumers of `this.cardsWorthKeeping`: `priorityEcon`, the mulligan,
bonus-breaker and tutor candidates, the favour-setup check, the worth-keeping
install/play loop and the generic-install gate (all in
`_internalChoiceDetermination`); `_calculateRunPathPieceBegin()`;
`_indexOfBestDiscardOption()`; and Running Hot, Carnivore, Docklands Pass
(temporarily clears it), Pantograph, Conduit, Sneakdoor Beta and Methuselah.
Steve Cambridge and Ayla "Bios" Rahim call `_cardsWorthKeeping()` on other piles.

## Mulligan

The AI mulligans (option 0) when `this.cardsWorthKeeping` is empty, else keeps
(option 1); economy, cost curve and hand size are ignored.

## Installing and playing cards

Before running is considered: when tagged, the grip card with the highest
`AIPlayToRemoveTags()` that passes `FullCheckPlay` is played, else the basic
remove-tag action is taken whenever offered. The playable event with the highest
`AIPlayWhenCan` (and `AIWouldPlay`, if defined) is played. In the Runner Install
phase, an installed program whose `AIOkToTrash()` is true is trashed for room.

**priorityEcon.** The worth-keeping card with the highest `AIEconomyInstall()`
or `AIEconomyPlay` suppresses drawing, can suppress running, and prompts
clicking for credits when it is within reach.

**When not running**, in order:

1. With no `priorityEcon` and room under `_maxOverDraw()` (clicks minus two,
   when not broke): the highest `AIDrawTrigger` card (`AIWouldTrigger`), the
   highest `AIDrawInstall()` card (`AIWouldInstall`), the highest `AIPlayToDraw`
   event (`AIWouldPlay`), or draw; over it, a `maxHandIncreasers` title.
2. Economy while the credit pool is 12 or less: the first playable
   `economyPlay` title (`_wastefulToPlay()`, `AIWouldPlay`); the highest
   `AIEconomyTrigger` card (`AIWouldTrigger`; in the Runner 1.3 phase only
   click abilities); click for credits towards `priorityEcon`; the highest
   `AIEconomyInstall()` card (`_commonCardToInstallChecks()`, `AIWouldInstall`).
3. When economy is not needed or the grip is over the allowance: worth-keeping
   cards in sorted order.
4. Only when nothing is worth keeping: any non-wasteful install, or an event
   whose `AIWouldPlay()` is true (`AIPreferredPlayChoice` as follow-up).
5. Click for credits (draw instead when rich), else a random option.

**Wasteful checks.** `_passBasicWastefulInstallCheck()` rejects a second copy of
an installed unique, a second Console, and resources while tagged or while a
visible Corporate Town is installed. `_wastefulToInstall()` adds MU overflow
(`_installWouldExceedMU()` tries each destination and, through
`_spareMemoryUnits()`, ignores MU of cards whose `AIOkToTrash()` is true), a
second Fracter, Decoder or Killer, an AI when no essential breaker type is
missing, and `AIWastefulToInstall()`. `_wastefulToPlay()` uses
`AIWastefulToPlay()` and a negative `AIPreferredPlayChoice(choices)`.
`_commonCardToInstallChecks()` also needs a legal install choice and defers to
another installable grip card declaring `AIInstallBeforeInstall(card)`. Several
install paths pass a null host.

**Hardcoded titles.** `economyPlay` (Sure Gamble, Creative Commission, Wildcat
Strike), `maxHandIncreasers` (T400 Memory Diamond, also used when potential is
low), the potential and resource-check titles above, Conduit, Rielle "Kit"
Peddler and the approach-cost cards in `runcalculator.js`.

## Encounters and breaking

Breaking follows the path chosen at run start (`cachedBestPath`, via
`_cachedOrBestRun()`). After an ICE rez or a card leaving the attacked root, the
engine calls `RecalculateRunIfNeeded()`, which keeps a complete path when the
server is central, still has root cards, cannot be breached anyway, or the path
costs under 0.8, and otherwise switches to an exit strategy.

- **Jack out.** Past the last ICE (Run 4.3 at index 0) the AI approaches,
  except after a Conduit run when the known top of R&D is not an agenda.
  Elsewhere it jacks out when no complete path from the next ICE exists.
- **Run 3.1 / Encounter.** From the first node for the current ICE with pending
  `card_str_mods`, `sr_broken` or `persistents` (already applied or broken
  entries removed) it returns a trigger for the next strength change or break,
  the planned subroutine, or a persistent's trigger or choice (such as a
  bypass); else continue or pass. With no path at all it triggers any ability.
- **Run Subroutines.** Choices come from the `alt` on the first node for the
  next ICE; without one, `IceAI()` is re-read and an end-the-run option is
  picked, else one without a tag.

## Access decisions

- **Run 5.1**: the option whose card has the highest `AIBreachReplacementValue`;
  with none, option 0, so any offered replacement beats the basic breach.
- **Run 5.2** access order: a visible upgrade first; if the first visible card
  is not an upgrade, another card first; otherwise the next card.
- **Run Accessing**: cards from `ChoicesTriggerableAbilities(runner, "access")`
  are scored by `AIAccessTriggerPriority(optionList)` (default 1). Above 3 beats
  stealing; otherwise steal whenever offered. An installed Ambush that cannot be
  advanced is left alone. Otherwise above 2 beats trashing; trash is chosen
  whenever offered, with no value comparison; then a card trigger above 1, any
  trigger at 1, a card trigger above 0, else no action.

## What the Runner AI knows

**HQ memory.** `suspectedHQCards` holds title, card type, copies and
uncertainty; `_infoHQScore()` sums copies × (1 − uncertainty). `phase.js` calls
`GainInfoAboutHQCards(cards)` with HQ cards accessed in a breach; `MoveCard`
calls `GainInfoAboutHQCard(card)` for a visible card entering HQ.
`LoseInfoAboutHQCards(card, cardType)` decrements a title on rez, play, score,
steal and trash, and on install from HQ adds uncertainty to entries of the same
combined type (`_combinedCardType()`).

**Visibility checks.** Corp card reads normally go through
`PlayerCanLook(runner, card)`, `knownToRunner` or `rezzed`: server potential,
`_iceThreatScore()` (printed rez cost if seen, else 3 capped by Corp credits),
`_highestThreatScoreIce()`, `_serverIsProtected()`, bonus-breaker ranking,
`EstimateCardPriority()`, access order, the R&D top card, and `IceAI()` and root
handling in the run calculator. Unseen cards are modelled from advancement,
Corp credits, faction and identity. `PlayerCanLook()` returns true for every
card while the debug flag `viewAllFronts` is on.

**Reads of information a human Runner could not know:**

- `Trash()` in `mechanics.js` calls `LoseInfoAboutHQCards(card)` for any card
  trashed from HQ, passing its identity even when it leaves HQ facedown, so the
  AI removes exactly that title from its HQ model.
- `IceAI()` for unseen ICE computes `RezCost(ice) - ice.rezCost` from the hidden
  card; a cost modifier that depends on the hidden card's identity or subtype
  changes the guess.
- `CalculatePieceBegin()` compares every root card's title with Hokusai Grid
  when no unadvanced unseen card is present, including advanced unseen cards
  (no practical effect, since Hokusai Grid cannot be advanced).
- `_icebreakerInPileNotInHandOrArray()` scans the pile it is given; card hooks
  (`AIWorthKeeping`, `AIIcebreakerTutor`) pass the Stack. Contents follow from
  the decklist, but which of several matches is returned depends on hidden Stack
  order, and bonus-breaker ranking evaluates that card.
- `_matchingBreakerInstalled()` and `_breakerMatchesIce()` read ICE subtypes
  without a visibility check; every caller in `ai_runner.js` checks first, some
  card callers do not.
- `Print()` logs strength-change and bypass target titles through `GetTitle()`
  without hiding (log output only).

## Known limits

- `Math.random()` and `RandomRange` are called directly, so decisions cannot be
  seeded; jitter is added after caching and can cross any threshold.
- Server ranking ignores cost; its comparator never returns 0.
  `AIGripRunPotential` is not in `cachedPotentials`.
- Bonus-breaker ranking reads `AISpecialBreaker` from the candidate wrapper, not
  its card, so special breakers rank only through `_breakerMatchesIce()`.
- `_highestThreatScoreIcePermitExcludedIce()` drops its `minimumRezCost`.
- Foresight offsets, limits, the 12-credit threshold and all potentials are
  fixed constants. Below potential 0.75 the AI still runs unless it installs
  T400 Memory Diamond. Accessed cards are trashed whenever trash is offered.
- One copy per title is kept; a second Fracter, Decoder or Killer is always
  wasteful; no resource is installed while tagged. `AIEconomyPlay` only selects
  `priorityEcon`; the economy branch plays only `economyPlay` titles.
- End-of-turn Corp discards (`Discard()`) do not update `suspectedHQCards`; a
  rezzed card with a suspected title is assumed to have left HQ.
- Hypothetical hooks restore without try/finally; `GameEnded(winner)` is empty.

## Hook reference

Contracts are in `documentation/ai.md`, which has no entry yet for
`AIAccessTriggerPriority`, `AIBreachReplacementValue`, `AIDrawTrigger`,
`AIGripRunPotential`, `AIPlayBeforeRun`, `AIPlayForInstall`,
`AIPlayToRemoveTags`, `AIRunEventDiscount`, `AIWouldInstall` or
`AIEncounterOptions`.

| Hook | Where consumed | Purpose |
|---|---|---|
| `AIWorthKeeping` | `_cardsWorthKeeping()` | Card-specific reason to keep |
| `AIWastefulToInstall`, `AIWastefulToPlay` | wasteful checks | Veto an install or play |
| `AIPreferredInstallChoice`, `AIPreferredPlayChoice` | install and play paths | Choice index, −1 to decline |
| `AIOkToTrash` | Runner Install phase, `_spareMemoryUnits()` | Program may be trashed for room |
| `AIInstallBeforeInstall`, `AIPlayForInstall` | `_commonCardToInstallChecks()`, `CommandChoice` | Install ordering; play to install |
| `AIEconomyInstall`, `AIEconomyPlay`, `AIEconomyTrigger` | `priorityEcon`, economy branch | Economy priorities |
| `AIDrawTrigger`, `AIDrawInstall`, `AIPlayToDraw` | draw branch | Draw priorities |
| `AIWouldPlay`, `AIWouldInstall`, `AIWouldTrigger` | several branches | Final yes/no gate |
| `AIPlayWhenCan`, `AIPlayToRemoveTags` | pre-run checks | Opportunity plays; tag removal |
| `AIRunExtraPotential`, `AIBreachNotRequired`, `AIGripRunPotential` | server potential | Passive and grip potential |
| `AIRunEventExtraPotential`, `AIRunAbilityExtraPotential` | server potential | Run event or ability value |
| `AIAdditionalAccess` | `_additionalHQAccessValue()` | Extra HQ accesses |
| `AIPreventBreach` | `_breachWouldBePrevented()` | Breach will not happen |
| `AIRunPoolCreditOffset`, `AIRunEventDiscount`, `AIRunEventExtraCredits` | `_commonRunCalculationChecksAsync()` | Route credits and run-event cost |
| `AIRunEventModify`, `AIRunEventRestore`, `AIPrepareHypotheticalForRC`, `AIRestoreHypotheticalFromRC` | `_commonRunCalculationChecksAsync()` | Hypothetical state |
| `AIIcebreakerTutor` | bonus breakers | Breaker a tutor would fetch |
| `AISpecialBreaker`, `AIFixedStrength`, `AIMatchingBreakerInstalled` | keep, `_breakerMatchesIce()`, `_matchingBreakerInstalled()` | Breaker coverage |
| `AIInstallBeforeRun`, `AIPlayBeforeRun` | chosen-server prep | Prep priority before running |
| `AIImplementBreaker` | `IceAct()` | Breaker moves in the run calculator |
| `AIImplementIce`, `AIIceSpecificEffect`, `AIModifyIceAI`, `AIEncounterOptions` | `IceAI()`, `ValidateEncounterPoint()`, `EncounterOptions()` | ICE description, effects, encounter options |
| `AIReducesTrashCost` | `CalculatePieceBegin()` | Trash-cost discount |
| `AIAccessTriggerPriority`, `AIBreachReplacementValue` | Run Accessing, Run 5.1 | Access and breach choices |
| `AIDefensiveValue` | `_serverIsProtected()` | Visible root defence |
