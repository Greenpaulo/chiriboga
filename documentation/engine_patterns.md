# Chiriboga Engine — Pattern Reference

> This is the compact pattern index for card implementation. Read "Card Object
> Shape", then only the sections the current cards need (table below); search
> (`rg -n "Name" documentation/engine_patterns.md`) for a specific function or
> hook rather than reading the whole file. Follow links into `ai.md` only for
> hooks relevant to the current cards. For unusual mechanics, confirm the
> pattern against a current implemented card and the engine call site rather
> than assuming this reference replaces the source code.
>
> | Section | Read when the cards… |
> |---|---|
> | Card Object Shape | always |
> | Trigger Hooks | react to turns, runs, encounters, breaches, installs, scoring or bad publicity, modify costs/strength, or have click abilities |
> | Engine Functions — Quick Reference | need an engine call (credits, clicks, zones, damage, counters, servers, decisions); search it for the function |
> | Subroutine Shape | are ICE |
> | AI Decision-Making Hooks | need AI support; it summarises hooks, and `ai.md` holds the full contracts |
> | Common Patterns | match a listed pattern (optional trigger, once per turn, self-weakening ICE, cost discount…) |
> | Implemented Cards Quick-Reference | need a worked example from Downfall |
>
> AI hook audit: 2026-09-18. The implemented hooks from the Corp server-security
> work are summarized below. Hooks proposed by items in
> `documentation/corp-ai/roadmap.md` are not available card APIs until the item
> is `done`.

---

## Card Object Shape

```js
cardSet[NNNNN] = {
  title: '...',
  imageFile: 'NNNNN.png',
  player: corp | runner,
  faction:
    'Weyland Consortium' |
    'Haas-Bioroid' |
    'Jinteki' |
    'NBN' |
    'Anarch' |
    'Criminal' |
    'Shaper' |
    'Neutral',
  influence: N,
  cardType:
    'ice' |
    'asset' |
    'upgrade' |
    'operation' |
    'agenda' |
    'program' |
    'hardware' |
    'resource' |
    'event' |
    'identity',
  subTypes: ['...'],
  rezCost: N, // assets, upgrades, ice
  trashCost: N, // assets, upgrades
  strength: N, // ice / icebreakers
  playCost: N, // operations / events
  installCost: N, // runner cards
  memoryCost: N, // programs
  link: N, // identities
  advancementRequirement: N,
  agendaPoints: N, // agendas
};
```

---

## Trigger Hooks

All hooks are properties on the card object. `this` = the card in all Resolve/Enumerate functions.

Paid abilities normally go in `abilities`. For an ability controlled by the
opponent, use `runnerAbilities` on a Corp card or `corpAbilities` on a Runner
card; each entry has the same `text`, `Enumerate` and `Resolve` shape as a
normal paid ability.

### Turn / Phase

```js
responseOnCorpTurnBegins:  { Enumerate?, Resolve, text?, automatic? }
responseOnRunnerTurnBegins:{ Resolve, automatic: true }
responseOnCorpTurnEnds:    { Resolve, automatic: true }
responseOnRunnerTurnEnds:  { Resolve, automatic: true }
responseOnRunnerDiscardEnds: { Enumerate?, Resolve, text?, automatic? } // Runner 2.3
responseOnCorpDiscardEnds:   { Enumerate?, Resolve, text?, automatic? } // Corp 3.3
```

No engine phase fires `responseOnRunnerTurnEnds` or `responseOnCorpTurnEnds`
(checked 2026-10-16). Implement "when your turn ends" with the matching
`*DiscardEnds` hook, which fires at the point both conditions trigger.

`responseOnCorpActionCompletes: { Enumerate, Resolve, text }` fires once per
Corp action, when the Corp first passes the post-action window; it receives a
copy of `corp.actionsTakenThisTurn` (completed actions, oldest first). Compare
actions with `SameCorpAction(a, b)` (CR 5.2.5: same basic action, or same
ability on the same card). Setting `corp.restrictedNextAction = {excluded}`
hides those actions from the next Corp action; it clears once an action is
taken. `CorpHasDifferentActionAvailable(excluded, extraClicks)` is a read-only
legality check (MirrorMorph).

### Run

```js
automaticOnRunBegins:  { Resolve }          // fires at start of EVERY run, no Enumerate
responseOnRunSuccessful: { Resolve, automatic: true }
responseOnRunEnds:       { Resolve, automatic: true }
responseOnPassesIce:     { Resolve, automatic: true }
responseOnBypassed:      { Enumerate?, Resolve } // receives the bypassed ice, before encounter-end responses
responseOnWouldApproachServer: { Enumerate?, Resolve } // optional pre-approach redirect window
automaticOnRunEndCleanup: { Resolve } // receives a callback queue after responses and run state cleanup
```

### Encounter

```js
automaticOnEncounter:       { Resolve }                    // receives encountered ice
responseOnEncounter:        { Enumerate?, Resolve, automatic? }
responseOnEncounterEnds:    { Resolve, automatic: true }
responseOnSubroutineBroken: { Resolve, automatic: true }   // a sub on this ice is broken
automaticOnSubroutineFiring:   { Resolve }                 // an unbroken sub starts resolving
```

An automatic `responseOnEncounter` receives no parameters; use
`automaticOnEncounter` when the effect needs the encountered ice argument.

Ice derezzed during its encounter ("Baklan" Bochkin) stays encountered but its
subroutines no longer fire: `phases.runSubroutines` skips unrezzed ice.

### Trace

```js
responseOnTraceInitiated: { Enumerate(baseStrength), Resolve } // before the Corp raises strength
```

`Trace` opens this window (first priority to `playerTurn`) after setting the
global `traceStrength` and before either player raises strength; a response
may change `traceStrength` (Flip Switch sets it to 0). With no response the
trace continues synchronously.

### Drawing and private look decisions

`Draw(player, count, afterDraw, context)` applies `modifyDraw` once, then
offers `responseOnWouldDraw: { Enumerate(draw), Resolve, text }` before moving
cards. Its occurrence parameter is a read-only snapshot with `player`, `count`
(after modifiers) and `firstThisTurn`. The turn's draw occurrence is reserved
before interrupts, so nested draws and installation after an earlier draw do
not create a second first draw. A zero or modified-to-zero draw completes its
callback without recording an occurrence. An empty-stack positive draw still
records its occurrence.

Enumerations must be safe to repeat, including the applicability check before
the window opens. Once all interrupts finish, the engine moves/logs the draw,
opens `responseOnCardsDrawn` with the actual cards, then calls `afterDraw` in
`context` exactly once. `Draw` returns the number moved immediately, or
`undefined` while an interrupt suspends movement. Use its callback for any
instruction that follows the draw; `BasicActionDraw` follows the same contract.
An inapplicable interrupt does not suspend a draw. Corp deck-out ends the game
instead of continuing the instruction.

An enumerated response may set `privateLook: true` to grant its controller a
private look at its card choices for that decision. Use ordinary `{card, label}`
choices, without `button`, for the shared selectable card grid. Build labels
from the privately looked-at cards' titles, rather than a public reveal. The
decision's `privateLook` holds its player and exact card references;
`PlayerCanLook` grants access only within that decision. The grid filters to
that player and those cards. Leaving the decision clears the grid and resize
cache, without setting persistent visibility flags. The Class Act uses this
path before bottoming a card and resuming the draw.

Automatic hooks cannot suspend for draws or other decisions. Keep synchronous
bookkeeping there, and perform draws in an enumerated response: Side Hustle
places credits automatically and pays out in its install/run-begin response;
Nurse Hạnh records the Archives turn-faceup event automatically and draws in
the ensuing breach response window.

### Response windows

Every enumerated trigger in a response window must be resolved before the
window can pass, so an optional effect must offer its own decline choice
(for example `{use: false, label: "Do not use", button: "Continue"}`) and ignore
it in `Resolve`. `responseOnRunSuccessful` receives no parameters; read
`attackedServer`. A played run event stays in `runner.resolvingCards`, and so
stays active, until the post-action window moves it to the heap.

### Breach

```js
automaticOnArchivesCardsTurnedFaceUp: { Resolve } // receives the facedown cards turned faceup as one array
```

The Archives hook fires once while the server is breached, before access
choices are enumerated. It does not fire when no facedown Archives cards were
turned faceup.

`specialOnInsteadOfBreaching: { Enumerate, Resolve }` replaces a breach
(Chastushka, Retrieval Run, Khusyuk); `Enumerate` returns `[{required: true}]`
for a mandatory replacement. It resolves after the engine has entered Run 6.4,
whose automatic `responseOnRunEnds` triggers have already fired, so keep the
replacement's state out of those triggers and clean up in
`automaticOnRunEndCleanup`. Khusyuk shows how to access a card from inside the
replacement without re-initialising Run 6.4.

### Install / Rez / Trash

```js
responseOnRez:     { Resolve, automatic: true }
responseOnInstall: { Resolve, automatic: true }
responseOnTrash:   { Enumerate, Resolve, text }   // optional choice on trash
```

`interruptOnUninstall: { Resolve(afterInterrupt) }` is a mandatory continuation
hook consumed by `UninstallInterrupts` from `Trash` and `Uninstall`. The card
must still be installed and its callback active. Call `afterInterrupt` exactly
once after prevention and responses finish; movement waits for that call.
Use `Uninstall` for installed-to-noninstalled movement requiring this timing.
Hosted bad publicity uses the `bad_publicity` counter property and existing
bad-publicity counter texture; clearing counters also clears that property.

### Score / Steal

```js
onScore: {
  Resolve;
}
onSteal: {
  Resolve;
}
```

### Bad publicity

`BadPublicity` fires `responseOnTakeBadPublicity` only after prevention has
resolved and the Corp actually takes at least 1 bad publicity. The response
receives the amount taken. Its optional continuation runs after all responses.

```js
BadPublicity(1, afterBadPublicity, context);
responseOnTakeBadPublicity: { Enumerate, Resolve, text? }
```

### Modify Hooks (return a number, 0 = no change)

```js
modifyStrength: Resolve(card); // card = target card being checked
modifyInstallCost: Resolve(card, destination); // destination is a server or host, null for a normal Runner install
modifyTrashCost: Resolve(card);
modifyRezCost: Resolve(card);
modifyPlayClickCost: Resolve(card); // modifies the 1-click/Double 2-click play cost
modifyStealCost: Resolve(card); // returns {credits, clicks, programs} additional costs
modifyMaxHandSize: Resolve(player);
modifyCannot: Resolve(id, card, selectedBreaks); // id = "steal"|"trash"|"score", or "break" with a subroutine as card (Afshar); return true to forbid; optional selectedBreaks includes pending selections for multi-break limits; "breakUsing" with the source card forbids that card from breaking (NEXT Activation Command)
```

### Click Ability

```js
abilities: [{
  text: "[click]: ...",
  Enumerate: function() {
    if (!this.rezzed) return [];
    if (!CheckActionClicks(corp, 1)) return [];
    return [{}];
  },
  Resolve: function() { SpendClicks(corp, 1); /* effect */ },
}],
```

An ability with `availableFromHQ: true` is included by Corp ability discovery
while its card is in HQ, even though the card is inactive there. Its enumeration
must check HQ location, action-click legality, credit/trash costs and targets.
The flag does not make other abilities on the card active.

`TriggerAbility` fires `automaticOnAbilityUsed(card, ability)` on active cards
(and on cards whose hook sets `availableWhenInactive`) after the ability's
choice is confirmed and before its `Resolve` runs. The Back (26082) uses it to
count the first hardware use during a run each turn. It covers paid abilities
used through the trigger command, not optional `responseOn*` triggers.

### canBeRezzed (conditional)

`CheckRez` consumes this rules permission for both humans and AI.

```js
canBeRezzed: function() { return currentPhase.identifier == "Corp 2.2"; }
```

Phase identifiers: `"Corp 2.2"` is `phases.corpActionMain` (the Corp's action phase) and `"Runner 1.3"` is `phases.runnerActionMain` (the Runner's action phase), both in `phase.js`.

### Corp install destination restriction

```js
installOnlyIn: function(server) {
  return server == corp.HQ || server == corp.RnD || server == corp.archives;
}
```

`ChoicesCardInstall` and Corp upgrade planning both respect this hook. Runner
card hosting restrictions continue to use `installOnlyOn(host)`.

A Corp identity's `remoteServerLimit: N` ("Limit N remote servers", Earth
Station) makes `CheckInstallDestination(card, null)` reject a new remote once
`N` remotes exist (`CorpRemoteServerLimitReached()`); the Corp AI's install
ranking drops those options. Card effects that call `Install(card, null)`
directly must check it themselves.

---

## Engine Functions — Quick Reference

### Credits

```js
GainCredits(player, amount, reason, source);
LoseCredits(player, amount);
SpendCredits(player, amount, reason, source, callback, context);
CheckCredits(player, amount); // true if player can afford
CreditPoolCanBeUsed(player, action, reason, source); // pool only; hosted/temporary credits are separate
```

An active card can temporarily forbid pool spending or loss with
`preventCreditPoolUse(player, action, doing, card)`. Return `true` to lock the
pool for that action. `AvailableCredits` and `CheckCredits` will still count
eligible hosted credits and Runner temporary credits, and `SpendCredits` and
`LoseCredits` will leave the locked pool unchanged.

### Clicks

```js
SpendClicks(player, n);
GainClicks(player, n);
CheckClicks(player, n); // alias CheckActionClicks
PlayClickCost(card); // 1 normally, 2 for Double, including active modifiers
ClicksSpentThisTurn(player); // reset with allotted clicks; lost clicks are not spent ("first [click]" checks)
```

### Cards / Zones

`Uninstall(card, destination, afterUninstall?, context?)` moves an installed
card to a non-installed zone, trashes its hosted cards unpreventably, then
runs the optional continuation. Use it for returning an installed host to the
grip or shuffling it into the stack; the continuation can shuffle after hosted
trash responses finish.

```js
Draw(player, n);
Trash(card, runner_paid); // runner_paid=true if runner paid cost
MoveCard(card, destination); // destination = zone object
Shuffle(zone); // e.g. Shuffle(corp.RnD)
Install(
  card,
  destination,
  ignoreAllCosts,
  position,
  returnToPhase,
  onInstallResolve,
  context,
  onCancelResolve,
  onPaymentComplete,
  allowCancel,
  onInstallComplete
);
```

Use `onInstallComplete` when a follow-up effect must wait until the card has
moved to its install destination and all `responseOnInstall` triggers have
finished. `onInstallResolve` runs earlier, before payment and card movement.

### Damage / Tags

```js
Damage('net' | 'meat' | 'brain', amount, preventable);
AddTags(n);
RemoveTags(n);
Purge(afterPurge?, context?);
```

### Counters

```js
AddCounters(card, type, n); // type: "virus"|"power"|"advancement"|"agenda"
Counters(card, type); // returns count
```

### Ice / Runs

```js
EndTheRun();
Trace(strength, callback); // callback(successful: bool)
Break(subroutine);
CheckUnbrokenSubroutines();
ChoicesEncounteredSubroutines(selectedBreaks); // unbroken + unlocked subs; optional pending selections count toward break limits
Rez(card, ignoreAllCosts, onRezResolve, context, allowCancel, costReduction, afterRezResponses);
```

### Servers / Locations

```js
GetServer(card); // server object or null
attackedServer; // global: current run server
approachIce; // global: index of current ice in server.ice[]
corp.HQ / corp.RnD / corp.archives;
runner.grip / runner.stack / runner.heap;
```

### Card Checks

```js
CheckCardType(card, ["ice","asset",...])
CheckSubType(card, "Barrier")
StealCost(card); // {credits, clicks, programs}, including printed `stealCost` and active additional costs;
// programs = installed programs the Runner trashes (PayStealCostPrograms, unpreventable)
InstalledCards(player)
ChoicesInstalledCards(player, filterFn)
ChoicesArrayCards(array, filterFn)
ChoicesHandInstall(player, filterFn)
HasTrashAbility(card) // true for trashAbility: true, or an ability text naming [trash]
```

Cards whose [trash] ability is not named in an `abilities` text (prevention
interrupts, or abilities with a different label) declare `trashAbility: true`
so heap-recursion effects such as The Back can find them.

### Decisions

```js
DecisionPhase(player, choices, callback, title, instruction, context, command?, cancelCallback?)
// choices: [{id, label, button}] for yes/no, or card-choice array from ChoicesXxx()
```

### Misc

```js
Log("message")
GetTitle(card, withArticle?)
BadPublicity(n, afterBadPublicity?, context?)
ServerName(server)
```

`BadPublicity` opens prevention and take-bad-publicity response phases. Use its
completion callback for effects that must continue after those phases finish.

---

## Subroutine Shape

```js
subroutines: [
  { text: "End the run.",              Resolve: function() { EndTheRun(); },           visual: { y: 57, h: 16 } },
  { text: "Do 1 net damage.",          Resolve: function() { Damage("net", 1, true); },visual: { y: 73, h: 16 } },
  { text: "The Runner loses 1[c].",    Resolve: function() { LoseCredits(runner, 1); },visual: { y: 89, h: 16 } },
  { text: "Give the Runner 1 tag.",    Resolve: function() { AddTags(1); },            visual: { y: 105, h: 16 } },
],

AIImplementIce: function(rc, result, maxCorpCred, incomplete) {
  result.sr = [
    [["endTheRun"]], [["netDamage"]], [["tag"]], [["trashProgram"]],
    [["trace"]], [["bankroll"]], [["gainCreditsCorp"]], [["gainCreditsRunner"]],
  ];
  return result;
},
```

Visual y values (approximate): sub1=57, sub2=73/88, sub3=104/120. Increment by 16 per sub.

---

## AI Decision-Making Hooks

**Why this section exists:** the patterns above (Resolve, subroutines, triggers) make a card _function_. They do not make the AI _want_ to use it. Every hook below is optional, on-card, on top of a fully working `Resolve`. Skipping them is not a bug — the card still works for human vs AI — but the AI will treat it generically (usually: play/install it whenever legally possible with no strategic judgment, or never proactively at all for events/triggers).

**Rule of thumb — check these first for any new card:**

- **Ice** → `AIWorthwhileIce` (does the corp think it's worth installing/rezzing here)
- **Event / Operation** → `AIWouldPlay` (corp) or `AIWorthKeeping` + played automatically if kept (runner)
- **Resource / Hardware / Asset with ongoing value (esp. economy)** → `AIWorthKeeping` (runner) and/or `AIEconomyInstall`
- **Anything with a manually-triggered ability** → `AIWouldTrigger` (corp) — without it, the ability is simply never used defensively/proactively
- **Ice with subroutines** → `AIImplementIce` (already covered above — needed so the runner's run-cost calculator understands what it does)

Everything else below is situational — add it only if the card's effect genuinely needs that specific nuance.

### Do not author these on a card

A handful of `AI*`-named properties are **written by the engine at runtime as caches/counters**, not something a card definition sets. Setting them yourself will be overwritten or ignored:

- `AInumCompatibleIceInstalled`, `AIPreferredTarget`, `AIPlayedWithCost`, `AITurnsInstalled`, `AISuccessfulRuns` — engine-computed, read-only from a card-author's perspective.
- `AIIceEncounterSaveState` / `AIIceEncounterModifyState` / `AIIceEncounterRestoreState` and the guarded wrappers `AIWithHypothetical` / `AIWithRunContext` / `AIWithIceEncounter` — these are global functions in the utility prefix of `ai_runner.js`, not per-card hooks at all. A card that needs a pretend run or encounter calls the guarded wrappers (see `documentation/ai.md` §2 "Evaluating hypothetical state"), never the save/modify/restore trio directly.

---

### Ice hooks

**`AIWorthwhileIce: function(server, purpose) { ... }`** — return `false` to tell the corp this ice isn't worth installing/rezzing right now. `purpose` is `"install"` or `"rez"`. Default if omitted: always worthwhile.

```js
// Real example (System Update 2021) — only worthwhile if it's actually
// disabling a hosted runner program right now
AIWorthwhileIce: function(server, purpose) {
  var installedCards = InstalledCards(runner);
  for (var i = 0; i < installedCards.length; i++) {
    var card = installedCards[i];
    if (card.host && CheckCardType(card, ["program"]) && CheckCardType(card.host, ["ice"])) {
      if (!card.host.AIDisablesHostedPrograms) return true;
    }
  }
  return false;
},
```

**`AIImplementIce: function(rc, result, maxCorpCred, incomplete) { return result; }`** — already documented above; tells the runner's run-calculator what subroutines to expect. Treat as close to mandatory for any ice.

**`AIFixedStrength: true`** (icebreaker-side flag, boolean) — tells the runner AI this breaker's strength should be compared against a fixed assumed value rather than the ice's real (possibly unknown) strength.

**`AIDisablesHostedPrograms: true`** (boolean) — put on ice whose effect disables/exiles hosted runner programs (e.g. Magnet-likes), so the AI doesn't miscount a hosted program's value.

**`AIHostedDoesNotPreventRez: true`** (boolean, on a runner card that hosts on ice) — tells the corp AI this hosted card isn't a rez-blocking threat.

**`AILimitPerServer: function(server) { return 1; }`** — for upgrades/ice that should be capped per server; return the max count.

### Public Runner capabilities used by Corp security planning

These hooks are called outside an active run, so they must be read-only, use
only public state and rely on their arguments rather than `attackedServer` or
`approachIce`. See `ai.md` §§4.16–4.21 for full contracts and examples.

| Hook | Use |
| --- | --- |
| `AIReducesIceStrength(iceCard)` | Current amount by which an active Runner card reduces that ice's strength. |
| `AIHostedBreakContribution(iceCard)` | Number of subroutines a hosted breaker can currently break for free. |
| `AIEffectiveIceSubtypes(iceCard, server, iceIndex)` | Add/remove effective subtypes for security evaluation. |
| `AIModifyIceAI(iceAI, startIceIdx)` | Apply route-aware changes to the Run Calculator's ice model. |
| `AIBypassesIce(iceCard, server, iceIndex)` | `false`, `true`, or the credit cost of a targeted bypass. |
| `AIBypassesOutermostIce(server)` | Whether the next outermost ice can be skipped. |
| `AIBypassesOneIce(iceCard, server, iceIndex)` | Whether a once-per-run bypass can target this ice. |
| `AIRedirectsRun(fromServer, toServer)` | Whether one server's route can redirect to another. |
| `AIHiddenThreat` | Bounded profile for a hidden event that threatens a single-ice server. |
| `AIRunPoolCreditOffset(server, runEvent)` | Route-specific credits not expressible through `canUseCredits`. |
| `AICentralPressure(server)` | Public additional access, persistent pressure and growth on HQ/R&D. |
| `AICentralPressureAfterPurge(server)` | The same pressure profile immediately after a purge. |

Do not duplicate standard mechanics unnecessarily: the evaluator already reads
normal `modifySubTypes`, `canUseCredits`, `AIImplementBreaker`,
`AIMatchingBreakerInstalled` and `AIImplementIce` hooks.

---

### "Should the AI use this at all" hooks

**`AIWorthInstalling: function(emptyProtectedRemotes) { return index; }`**
(Corp assets) — return `-1` to decline installation, an index into the supplied
protection-ranked remote list to use that server, or
`emptyProtectedRemotes.length` to request a new remote. This is a current,
legacy placement hook—not the unified candidate scorer proposed by roadmap
items I1 and I5 in `documentation/corp-ai/roadmap.md`. Check affordability and whether the
effect has a plausible payoff inside the hook.

**`AIWorthKeeping: function(installedRunnerCards, spareMU) { return true/false; }`** (runner side — events, resources, hardware, programs) — should the runner treat this as something to hold onto and use? Cards judged "worth keeping" get proactively played/installed by the generic AI loop; cards without it are just along for the ride.

```js
// Real example (Core Set — Sure Gamble)
AIWorthKeeping: function (installedRunnerCards, spareMU) {
  return true; // we love Sure Gamble, always keep it
},
```

```js
// Real example (System Gateway) — conditional: only worth it if a
// specific combo isn't already covered, and a target run is possible
AIWorthKeeping: function (installedRunnerCards, spareMU) {
  if (!this.AIWastefulToInstall()) {
    if (runner.AI._getCachedCost(corp.RnD) != Infinity) return true;
  }
  return false;
},
```

**`AIWouldPlay: function() { return true/false; }`** (both sides — events/operations) — should the AI play this right now given the board state? Default if omitted: play whenever legally possible.

```js
// Real example (Core Set — Tinkering-style card)
// AI: Use when we have a decoder but no fracter/killer, and there's ice we can't break
AIWouldPlay: function () {
  var installedIce = ChoicesInstalledCards(corp, function (card) {
    return CheckCardType(card, ["ice"]) && card.rezzed;
  });
  if (installedIce.length == 0) return false;
  // ...further checks...
},
```

**`AIWouldInstall: function() { return true/false; }`** (runner side — hardware/resource/program). Default if omitted: install whenever possible.

**`AIWastefulToInstall: function() { return true/false; }`** / **`AIWastefulToPlay: function() { return true/false; }`** — the inverse framing: is installing/playing this _pointless_ right now (e.g. a duplicate effect already installed)? Checked before spending the click.

```js
// Real example (System Gateway) — don't install a 2nd copy of an
// effect that doesn't stack
AIWastefulToInstall: function() {
  for (var j = 0; j < runner.rig.programs.length; j++) {
    if (runner.rig.programs[j].title == "Conduit") return true;
  }
  return false;
},
```

**`AIWouldTrigger: function() { return true/false; }`** — for a manually-activated ability. **Default if omitted is `false`** — the ability is simply never used. This is the single highest-value hook to check for any card with a triggerable ability, since its absence is silent (no error, the ability just never fires).

```js
// Real example (Core Set) — only forfeit for value under real pressure
// AI: Only use when desperate for credits and have a low-value agenda
AIWouldTrigger: function () {
  if (Credits(runner) >= 10) return false;
  // ...only forfeit 1-point agendas...
},
```

**`AITriggerWhenCan: true`** (boolean, corp side) — simpler alternative to `AIWouldTrigger` for abilities that should just always fire when legal, no judgment needed.

**`AIOkToTrash: function() { return true/false; }`** (runner side, installed cards) — is it fine for the AI to let/cause this to be trashed (e.g. it's already lost its usefulness)?

```js
// Real example (System Gateway)
AIOkToTrash: function() {
  if (this.host && this.host.AIDisablesHostedPrograms) return true;
  return false;
},
```

---

### Priority / "which of several options" hooks

These return a **number**; the AI compares candidates and picks the highest. Where noted, a **negative number means "don't do this at all"**, not just "low priority."

**`AIPreferredPlayChoice: function(card, choices) { return n; }`** — when a played card has sub-choices (targets, modes). Returning `< 0` means "don't play it" (checked as part of the wasteful-to-play flow).

**`AIPreferredInstallChoice: function(choices) { return n; }`** — same idea for install-time choices. `< 0` means don't install.

**`AIEconomyInstall: function() { return n; }`** or plain number **`AIEconomyInstall: 1`** — priority for installing as an economy piece. Both forms exist in the codebase; a function lets you make it conditional.

```js
// Real example (Core Set — Desperado)
AIEconomyInstall: function() {
  // High priority - Desperado is one of the best consoles
  return 3;
},
```

**`AIEconomyPlay: <number>`** — plain numeric property (not a function in existing usage) for prioritizing playing an economy operation/event. Both AI sides consume it; Corp declarations join the main-phase economy list after the established core economy cards.

**`AIEconomyTrigger: <number>`**, **`AIDrawTrigger: <number>`**, **`AIPlayWhenCan: <number>`**, **`AIPlayToDraw: <number>`** — plain numeric priority properties (not functions) used to rank competing trigger/play options in their respective decision loops. Higher wins. Corp operations with `AIPlayWhenCan` are proactively checked after the built-in urgent-operation list and should also validate their opportunity with `AIWouldPlay` or `Enumerate`.

**`AIPlayToRemoveTags: function() { return n; }`** — how many tags this removes if played; used to prioritize tag-removal.

**`AIDrawInstall: function() { return n; }`** — install priority specifically evaluated right after a draw.

**`AIInstallBeforeRun: function(server, potential, useRunEvent, runCreditCost, runClickCost) { return n; }`** / **`AIPlayBeforeRun: function(server, potential, runCreditCost, runClickCost) { return n; }`** — priority for installing/playing something _before_ committing to a specific run (e.g. a breaker you need first).

**`AIInstallBeforeInstall: function(cardToInstall) { return true/false; }`** — "don't install `cardToInstall` until I'm installed first."

**`AIPlayForInstall: function() { ... }`** — for cards that are played specifically to enable installing something else afterward (checked after confirming the card can be played).

---

### Value-estimation hooks (runs, agendas, upgrades)

**`AIRunExtraPotential: function(server, potential) { return bonus; }`** (installed cards, runner side) — extra estimated value of running `server`, added to the run calculator's reward estimate.

```js
// Real example (Core Set — Bank Job style card)
AIRunExtraPotential: function(server, potential) {
  if (typeof server.cards === "undefined" && CheckCounters(this, "credits", 1)) {
    var creditsAvailable = Counters(this, "credits");
    return creditsAvailable * 0.3;
  }
},
```

**`AIRunEventExtraPotential: function(server, potential) { return bonus; }`** — same idea, for a run event card in hand (Legwork, Emergency Shutdown-style).

**`AIRunAbilityExtraPotential: function(server, potential) { return bonus; }`** — same idea, for a triggerable ability used during a run.

**`AIGripRunPotential: function(server) { return bonus; }`** — a card just sitting in hand (not played) that still adds run-value (e.g. "if you have this in hand, running is safer").

**`AIRunEventDiscount: function(server, runEventCardToUse) { return credits; }`** / **`AIRunPoolCreditOffset: function(server, runEventCardToUse) { return credits; }`** — reduce the calculated credit cost of a run.

**`AIRunEventExtraCredits: <number>`** — plain property, extra credits a run event provides (added directly, not a function).

**`AIRunEventModify: function(server) { ... }`** / **`AIRunEventRestore: function(server) { ... }`** — paired hooks to temporarily mutate state for a run-event's hypothetical effect, then undo it, for run-calculation purposes only.

**`AIPreventBreach: function(server) { return true/false; }`** — card replaces/skips the normal breach entirely (both sides can define this).

**`AIBreachNotRequired: true`** (boolean flag alongside `AIRunExtraPotential`/etc.) — extra potential should still count even if breach is prevented.

**`AIBreachReplacementValue: <number>`** — plain property; when multiple breach-replacement effects are available, the highest value wins (not the default basic breach).

**`AIAdditionalAccess: function(server) { return n; }`** — extra number of cards accessed from `server`.

**`AIAccessTriggerPriority: function(optionList) { return n; }`** — when multiple access-triggered effects are available, which fires first.

**`AIPrepareHypotheticalForRC: function(host) { ... }`** / **`AIRestoreHypotheticalFromRC: function() { ... }`** — paired hooks for a bonus/hypothetical breaker install during run-cost calculation only (advanced — only relevant to breaker-like cards being simulated mid-calculation).

**`AIMatchingBreakerInstalled: function(iceCard) { return value; }`** — for AI-type/special breakers, whether this counts as "the matching breaker" against `iceCard`.

**`AIIcebreakerTutor: function(installedRunnerCards) { return [...]; }`** — for cards that can fetch/tutor a breaker; return the list of breakers it could get.

**`AISpecialBreaker: true`** (boolean, hosted card) — marks a hosted card as breaker-like for matching purposes (e.g. Botulus).

---

### Corp-specific: agendas, advancement, scoring

**`AIAdvancementLimit: function() { return n; }`** — override how many advancement tokens the corp AI treats as "enough" (defaults to the card's real advancement requirement).

**`AIFastAdvance: true`** (boolean) — marks a card as a fast-advance enabler.

```js
// Real example, appears verbatim across several cards:
AIFastAdvance: true, //is a card for fast advancing
```

**`AIOverAdvance: true`** (boolean, on an agenda) — ok to advance past its requirement (e.g. for a bluff or an over-advance payoff).

**`AIRushToFinish: true`** (boolean) **or** **`AIRushToFinish: function() { return true/false; }`** — both forms exist in the codebase (checked as a plain truthy value in one call site, as a function via `typeof`/`.call()` in another). Use whichever fits; a plain `true` is simpler if there's no condition to evaluate.

**`AIWouldPlayBeforeScore: function(cardToScore, serverToScoreIn) { return true/false; }`** / **`AIWouldRezBeforeScore: function(cardToScore, serverToScoreIn) { return true/false; }`** — should the corp play this card / rez this card specifically before scoring `cardToScore`?

**`AIIsScoringUpgrade: true`** (boolean, on an upgrade) — marks it as something that helps scoring (e.g. a scoring-remote upgrade), used when the corp AI judges whether a remote is "ready" to score in.

```js
// Real example, appears verbatim across several cards:
AIIsScoringUpgrade: true,
```

**`AITagPunishment: 1`** (truthy/number) — marks an operation as tag-punishment, prioritized once the runner is tagged.

```js
// Real example (System Gateway)
AITagPunishment: 1, //can be used to punish if at least 1 tag
```

**`AIDamageOperation: true`** (boolean) — marks an operation as a damage-dealing play, prioritized similarly to tag punishment.

**`AIIsRecurOrTutor: true`** (boolean) — excludes a card from being treated as a normal "opportunity" play (used for recursion/tutor effects that shouldn't be double-counted).

**`AIAvoidInstallingOverThis: true`** (boolean, on an installed asset) — corp AI will avoid replacing it when picking what to trash-and-replace in a server.

**`AIDefensiveValue: function(server) { return n; }`** (upgrades) — return `< 1` to tell the corp this upgrade isn't worth it in `server` right now.

**`AIPunishesAccess: function(server) { return n; }`** (assets/upgrades) —
return a non-negative severity for the consequence of accessing this installed
card, or `0` when it cannot currently fire. This informs bait planning; it does
not make the server deterministically secure. The hook must be read-only and
safe while the card is unrezzed. See `ai.md` §5.9.

**`AIEmergencyDraw: n`** (Corp assets/upgrades) — positive number of cards
drawn immediately and reliably after install-and-rez. The critical-protection
planner may use it when HQ contains no ice. Do not use it for delayed,
conditional or click-ability draw. See `ai.md` §5.10.

## Common Patterns (copy-paste ready)

### Optional "may do X" trigger

```js
responseOnCorpTurnBegins: {
  Enumerate: function() {
    if (!this.rezzed) return [];
    return [{ id: 1, label: "Do X", button: "Do X" }, { id: 0, label: "Skip", button: "Pass" }];
  },
  Resolve: function(params) { if (params && params.id === 1) { /* effect */ } },
  text: "CardName: do X?",
},
```

### Once-per-turn guard

```js
usedThisTurn: false,
responseOnCorpTurnBegins:   { Resolve: function() { this.usedThisTurn = false; }, automatic: true },
responseOnRunnerTurnBegins: { Resolve: function() { this.usedThisTurn = false; }, automatic: true },
// in Enumerate: if (this.usedThisTurn) return [];
```

Use this card-local guard for the card's own once-per-turn uses. When "the first
time each turn" refers to a game event (you install hardware, you would draw),
the event may have happened before the card became active. Check the engine's
turn counter instead: `TurnEventCount(name)` is 1 during the first such event,
and `ChangePhase` clears every count when a turn begins. Recorded names:
`"runnerHardwareInstall"` (in `Install`, before install triggers),
`"runnerCompanionUse"` (in `Install` for a Runner companion, and once per
payment that spent hosted credits from a companion, before
`responseOnCreditsSpent(player, outsideAmount, doing, card, sources)`),
`"runnerSuccessfulRun"` (Run 5.1 in `phase.js`, after declaring success and
before `automaticOnRunSuccessful`),
`"runnerEventTrashed"` (once per `Trash` batch containing a Runner event that
was not installed facedown, before trash callbacks; also recorded by
`TrashResolvedRunnerCard` when the first resolved event enters the pending
post-action batch),
`"runnerInstalledProgramTrashed"` (once per `Trash` batch containing a Runner
program that was installed faceup, before trash callbacks),
`"runnerGripOrStackTrash"` (once per `Trash` batch with cards originating in
the Runner's grip or Stack, before trash callbacks),
`"runnerDraw"` and `"corpDraw"` (in `Draw`, before cards move). Record a new
event with `RecordTurnEvent(name)` at the engine event boundary, independently
of whether an interested card is active.

```js
responseOnInstall: { Enumerate: function (card) {
  if (!CheckCardType(card, ["hardware"]) || TurnEventCount("runnerHardwareInstall") != 1) return [];
  return [{}];
}, Resolve: function () { Draw(runner, 1); } },
```

### Ice weakens itself each encounter (Sandstone pattern)

```js
automaticOnEncounter: { Resolve: function(ice) { if (ice == this) AddCounters(this, "virus", 1); } },
modifyStrength: { Resolve: function(card) { if (card==this) return -Counters(this,"virus"); return 0; } },
```

### Boost all co-protecting ice (Rime pattern)

```js
modifyStrength: {
  Resolve: function(card) {
    if (this.rezzed && CheckCardType(card, ["ice"])) {
      var s = GetServer(this);
      if (s != null && GetServer(card) == s) return 1;
    }
    return 0;
  },
},
```

### Prevent steal/trash for run duration (Trebuchet pattern)

```js
// In the subroutine: a lingering effect survives the ICE being trashed or derezzed.
AddLingeringEffect({
  modifyCannot: { Resolve: function(id, card) { return card && card.player == corp && (id=="steal"||id=="trash"); } },
  responseOnRunEnds: { Resolve: function() { RemoveLingeringEffect(this); }, automatic: true },
});
```

### Asset with click ability (once per turn)

```js
usedThisTurn: false,
responseOnCorpTurnBegins: { Resolve: function() { this.usedThisTurn = false; }, automatic: true },
abilities: [{
  text: "[click]: Effect.",
  Enumerate: function() {
    if (!this.rezzed || this.usedThisTurn || !CheckActionClicks(corp, 1)) return []; // CheckActionClicks marks a main-phase click ability
    return [{}];
  },
  Resolve: function() { SpendClicks(corp, 1); this.usedThisTurn = true; /* effect */ },
}],
```

### On-trash optional effect (Calvin / Nanoetching pattern)

Record the card's rezzed/installed state in an `availableWhenInactive`
`automaticOnWouldTrash`, because the response fires after the card is in
Archives. See `sets/downfall.js` 26033 for the full version.

```js
responseOnTrash: {
  availableWhenInactive: true,
  Enumerate: function(cards, trashingPlayer) {
    if (!cards.includes(this) || trashingPlayer != runner || !this._wasRezzedWhenTrashed) return [];
    return [{ id: 1, label: "Do X", button: "Do X" }, { id: 0, label: "Skip", button: "Pass" }];
  },
  Resolve: function(params) { if (params && params.id === 1) { /* effect */ } },
  text: "CardName trashed: do X?",
},
```

### Modify install cost (first card per turn discount)

```js
_usedDiscount: false,
responseOnCorpTurnBegins:   { Resolve: function() { this._usedDiscount = false; }, automatic: true },
responseOnRunnerTurnBegins: { Resolve: function() { this._usedDiscount = false; }, automatic: true },
modifyInstallCost: {
  availableWhenInactive: true,
  Resolve: function(card) {
    if (!this._usedDiscount && CheckCardType(card, ["hardware"])) {
      this._usedDiscount = true;
      return -1;
    }
    return 0;
  },
},
```

---

## Implemented Cards Quick-Reference (Downfall)

| ID    | Title                  | Status |
| ----- | ---------------------- | ------ |
| 26001 | Isolation              | ✅     |
| 26002 | Demolisher             | ✅     |
| 26019 | Lat: Ethical Freelancer | ✅    |
| 26020 | In the Groove          | ✅     |
| 26021 | Khusyuk                | ✅     |
| 26022 | Spec Work              | ✅     |
| 26023 | Supercorridor          | ✅     |
| 26024 | Gauss                  | ✅     |
| 26027 | The Artist             | ✅     |
| 26033 | Calvin B4L3Y           | ✅     |
| 26034 | Nanoetching Matrix     | ✅     |
| 26035 | Hagen                  | ✅     |
| 26036 | Fully Operational      | ✅     |
| 26037 | Red Level Clearance    | ✅     |
| 26048 | Daily Quest            | ✅     |
| 26049 | Tiered Subscription    | ✅     |
| 26050 | Congratulations!       | ✅     |
| 26051 | Loot Box               | ✅     |
| 26057 | Roughneck Repair Squad | ✅     |
| 26058 | Afshar                 | ✅     |
| 26059 | Sandstone              | ✅     |
| 26060 | Trebuchet              | ✅     |
| 26064 | CSR Campaign           | ✅     |
| 26065 | Rime                   | ✅     |

Subroutine payment menus may attach `srChoice` to each option to identify the
corresponding `AIImplementIce` OR branch. `RunnerAI` matches that stable index
when unaffordable choices disappear. Keep the model branch order consistent and
do not override its selected branch with an unconditional inline preference.


## Downfall additional play costs and trash attribution

`additionalPlayCostTrash: true` on an event uses its `Enumerate()` selected
`params.card` as an unpreventable additional play cost. `Play()` pays normal
credit/click costs through its existing callback, then finishes that trash and
its responses before firing `automaticOnPlay` or resolving the event. Cancelling
before payment does not trash the selected card. The card's Enumerate must
restrict choices to legal, trashable targets (Isolation: installed resources).

`Trash(cards, canBePrevented, afterTrashing, context, fromDamage, trashingPlayer)`
accepts an optional explicit effect controller. Otherwise it captures the
currently resolving automatic source's owner, the callback context's owner,
or the active player before response/prevention windows change priority.
`AutomaticTriggers()` restores its scoped source in `finally`, including
nested effects. The captured actor survives prevention recursion.
`automaticOnTrash` and `responseOnTrash` receive `(cards, trashingPlayer,
directlyTrashed)`: the first array includes hosted casualties; the third
contains the directly selected cards after prevention. Existing one-argument
callbacks remain compatible. Demolisher uses the actor and direct-card array
to distinguish Runner trashes from Corp sacrifices and collateral host cleanup.
Callers that make another player trash a card must pass that player explicitly.

### Elevation tag removal and score-area abilities

`RemoveTags(num, afterRemoval?, context?)` removes up to `num` tags, invokes
`automaticOnRemoveTags` with the number actually removed, then opens
`responseOnRemoveTags`. The optional continuation runs after that window;
zero removal opens no window and immediately runs the continuation. Effects
that continue with another decision must use this callback. Turn-trigger
abilities that can open this window must not be marked `automatic`.

An operation may define `payAdditionalPlayCosts(params, callback)`. `Play`
calls it after the ordinary play costs and before `automaticOnPlay` or the
operation's effect. It must pay its declared costs, then invoke `callback`;
its enumeration must already exclude choices that cannot pay those costs.
IP Enforcement removes tags through this contract.

A Corp paid ability may declare `availableInRunnerScoreArea: true`.
`ChoicesTriggerableAbilities(corp)` then includes that ability on a stolen Corp
agenda. This does not activate the agenda's other abilities or triggers and
never grants its paid ability to the Runner.

`Score` snapshots `intended.scoreAdvancement` and
`intended.scoreAdvancementRequirement` before moving the agenda out of its
server, then clears both when score responses finish. Dividends uses this
snapshot (CR 10.13.2), including the requirement's server modifiers.

## Run initiation and reveal notifications

`AdditionalRunCosts(server)` returns `{clicks, credits}` from active
`modifyRunClickCost` and `modifyRunCreditCost` hooks (each `Resolve(server)`
returns a nonnegative cost). These hooks must be read-only and safe during
hypothetical run calculations. `CanPayAdditionalRunCosts(server, clicksRequired,
creditsRequired, event = null)` reserves the initiating action/event costs as
well. When checking a run event, `FullCheckPlay` first verifies its play cost
with `"playing", event`, then passes the event to this helper. Event-only
credits can cover that play cost but cannot pay additional run costs; credits
usable for both payments are reserved once, so shared funds are not counted
twice. When paying to play a Run event, `SpendCredits` uses event-only hosted
sources before shared credits, for both human and AI players, so the later
run-entry payment retains the shared funding assumed by the check.
`MakeRun(server, ignoreAdditionalCosts = false)` pays additional costs before
setting the attacked server or granting bad-publicity credits; it returns false
if payment is impossible. Recalculating an ongoing run owes no entry costs.

`Reveal(card, callback, context, playerToRevealTo, skipHumanInput,
revealingPlayer)` emits `automaticOnReveal(card, revealingPlayer)`. The actor
normally defaults to the active player; mandatory R&D access reveals use the
Runner. Explicitly pass the actor for effects resolving on behalf of another
player. Hyoubu's action passes Corp even though the revealed card is Runner-owned.

`GainCredits(player, amount, temporary, sourceCard, afterGain)` optionally calls
`afterGain` after operation/agenda credit-gain responses. Repeated instructions
should use this callback rather than starting a decision while responses remain.

## Downfall Psi bids and approach tracking

`PsiGame(callback, context)` resolves secret legal 0–2 credit bids, then calls
`callback(different)` after payment and spend responses. Bids are not logged or
paid before both players commit. Payment-source choices follow active-player
order; both payments finish before either spend-response window opens (CR
10.14.4–10.14.6). `SpendCredits` accepts an optional seventh argument, an array
of deferred response records, for this atomic payment. Its usual continuation
then runs after deduction; the caller must flush `CreditSpendResponses` after
all linked payments, before continuing the effect. Ordinary payments retain
their existing wait-for-responses behaviour.

`automaticOnApproachServer.Resolve(server)` fires after would-approach redirects
and before approach response triggers are collected, including when
`availableWhenInactive` is set. Its server argument is the current attacked
server after any redirect. Letheia Nisei uses it to consume the first approach
even while unrezzed; run-begin
cleanup resets the guard independently of active status.

Trash callbacks also receive a fourth argument, `trashEvent`, whose
`corpRunnerFactionOrdinal` is the turn's stable ordinal of this Corp trash
matching the Runner identity's faction (zero for nonmatching events). The
engine records it once per simultaneous direct trash, before automatic
callbacks. It includes earlier trashes while the interested card was inactive
and survives nested callbacks. Hosted collateral does not count as a direct
player trash. This event counter resets with the other turn counters.

`trashEvent.runnerEventOrdinal` is the stable turn ordinal of a batch that
trashed a Runner event (absent on other `Trash` batches).
`trashEvent.runnerGripOrStackCards` captures the cards originating in the grip
or Stack before movement; `runnerGripOrStackOrdinal`
is that batch's turn ordinal, or zero when the list is empty. These fields are
recorded before `automaticOnTrash` and `responseOnTrash`, so nested responses
do not change the original event's ordinal.

Resolved played events use `TrashResolvedRunnerCard` rather than `Trash`:
post-action cleanup batches them and opens
`responseOnPlayedEventTrashed(cards, trashEvent)` when the Runner passes the
post-action window, before continuing to the next action or ending the action
phase. This separate response receives the batched events and their
`runnerEventOrdinal`; it does not emit the ordinary trash callbacks or the
other `trashEvent` fields. Cards responding to any trashed event must support
both windows (Aniccam pattern).

## Uprising forced encounters and Triple operations

`ForceEncounter(ice)` suspends the current response/encounter phase and starts
an encounter with another installed, rezzed ICE. The attacked server and run
position stay unchanged. `GetApproachEncounterIce()` returns the child while
it is active. Subroutine resolution and bypass use that accessor; after the
child's encounter-end responses, the saved phase, encountered ICE, subroutine
index and broken flags are restored without firing a pass or another encounter
trigger for the parent. Ending the run unwinds encounter-end responses for the
child and parent before the unsuccessful-run phase. Run cleanup clears the
stack. Hypothetical ICE probes temporarily clear and then restore the overlay.

`PlayClickCost(card)` includes Triple's two additional clicks (3 total), as
well as Double's one additional click. Active modifiers apply afterward.
`runSuccessDeclared` is set when success is declared, reset at run initiation
and cleanup, and prevents later end-the-run effects from emitting an
unsuccessful-run event. They go to run-end responses instead.

## Uprising Corp-caused credit changes

`WithCardAbilitySource(card, callback)` scopes the cause of a card ability,
restoring it in `finally`. `Trigger`, paid abilities, automatic responses and
nested `DecisionPhase`/trigger-response continuations preserve this source.
`SpendCredits` captures it before payment-source choices; explicit `using` a
Corp card and additional `stealing` costs also attribute that Corp source.
Basic access trash costs do not count as Corp abilities.

`LoseCredits(player, amount, source?)` accepts an explicit cause, otherwise
using the scoped card/automatic trigger. After a positive Runner payment or
actual loss during a run, `automaticOnCorpCausedRunnerCreditChange` receives
`(amount, source)`. GameNET gains one credit per event, regardless of amount.
The event is synchronous and automatic; its handlers must not open phases.
`automaticOnSubroutineBroken(subroutine)` fires for a newly broken subroutine
before the ordinary response window. Gold Farmer checks ownership and its
printed-subroutine marker, then loses a credit with itself as the cause.
