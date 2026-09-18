# Chiriboga Engine — Pattern Reference

> Read this file at the start of every card-implementation session. It is the
> compact pattern index; follow its links into `ai.md` only for hooks relevant
> to the current cards. For unusual mechanics, confirm the pattern against a
> current implemented card and the engine call site rather than assuming this
> reference replaces the source code.
>
> AI hook audit: 2026-09-18. The implemented hooks from the Corp server-security
> work are summarized below. Proposals in
> `corp_ai_install_decision_roadmap.md` are not available card APIs until that
> document explicitly marks their phase implemented.

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

### Turn / Phase

```js
responseOnCorpTurnBegins:  { Enumerate?, Resolve, text?, automatic? }
responseOnRunnerTurnBegins:{ Resolve, automatic: true }
responseOnCorpTurnEnds:    { Resolve, automatic: true }
responseOnRunnerTurnEnds:  { Resolve, automatic: true }
```

### Run

```js
automaticOnRunBegins:  { Resolve }          // fires at start of EVERY run, no Enumerate
responseOnRunSuccessful: { Resolve, automatic: true }
responseOnRunEnds:       { Resolve, automatic: true }
responseOnPassesIce:     { Resolve, automatic: true }
```

### Encounter

```js
responseOnEncounter:        { Resolve, automatic: true }   // runner hits this ice
responseOnEncounterEnds:    { Resolve, automatic: true }
responseOnSubroutineBroken: { Resolve, automatic: true }   // a sub on this ice is broken
automaticOnSubroutineResolved: { Resolve }                 // an unbroken sub resolves
```

### Install / Rez / Trash

```js
responseOnRez:     { Resolve, automatic: true }
responseOnInstall: { Resolve, automatic: true }
responseOnTrash:   { Enumerate, Resolve, text }   // optional choice on trash
```

### Score / Steal

```js
onScore: {
  Resolve;
}
onSteal: {
  Resolve;
}
```

### Modify Hooks (return a number, 0 = no change)

```js
modifyStrength: Resolve(card); // card = target card being checked
modifyInstallCost: Resolve(card),
  availableWhenInactive ? modifyTrashCost : Resolve(card);
modifyRezCost: Resolve(card);
modifyMaxHandSize: Resolve();
modifyCannot: Resolve(id, card); // id = "steal"|"trash"|"score"; return true to forbid
```

### Click Ability

```js
abilities: [{
  text: "[click]: ...",
  Enumerate: function() {
    if (!this.rezzed) return [];
    if (!CheckClicks(corp, 1)) return [];
    return [{}];
  },
  Resolve: function() { SpendClicks(corp, 1); /* effect */ },
}],
```

### canBeRezzed (conditional)

```js
canBeRezzed: function() { return currentPhase.identifier == "Corp 2.2"; }
```

---

## Engine Functions — Quick Reference

### Credits

```js
GainCredits(player, amount, reason, source);
LoseCredits(player, amount);
SpendCredits(player, amount, reason, source, callback, context);
CheckCredits(player, amount); // true if player can afford
```

### Clicks

```js
SpendClicks(player, n);
GainClicks(player, n);
CheckClicks(player, n); // alias CheckActionClicks
```

### Cards / Zones

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
  context
);
```

### Damage / Tags

```js
Damage('net' | 'meat' | 'brain', amount, preventable);
AddTags(n);
RemoveTags(n);
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
ChoicesEncounteredSubroutines(); // unbroken + unlocked subs (respects _lockedFromBreak)
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
InstalledCards(player)
ChoicesInstalledCards(player, filterFn)
ChoicesArrayCards(array, filterFn)
ChoicesHandInstall(player, filterFn)
```

### Decisions

```js
DecisionPhase(player, choices, callback, title, instruction, context, command?, cancelCallback?)
// choices: [{id, label, button}] for yes/no, or card-choice array from ChoicesXxx()
```

### Misc

```js
Log("message")
GetTitle(card, withArticle?)
AddBadPublicity(n)
ServerName(server)
```

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

- `AIIceInstallScore`, `AInumCompatibleIceInstalled`, `AIPreferredTarget`, `AIPlayedWithCost`, `AITurnsInstalled`, `AISuccessfulRuns` — engine-computed, read-only from a card-author's perspective.
- `AIIceEncounterSaveState` / `AIIceEncounterModifyState` / `AIIceEncounterRestoreState` — these are global engine functions in `ai_runner.js`/`runcalculator.js`, not per-card hooks at all.
- `AIEconomyCard` — not implemented. It only appears in a comment in `ai_corp.js` as an idea that was never built. Ignore it if you see it referenced anywhere.

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
legacy placement hook—not the unified candidate scorer proposed in
`corp_ai_install_decision_roadmap.md`. Check affordability and whether the
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

**`AIEconomyPlay: <number>`** — plain numeric property (not a function in existing usage) for prioritizing playing an economy operation/event.

**`AIEconomyTrigger: <number>`**, **`AIDrawTrigger: <number>`**, **`AIPlayWhenCan: <number>`**, **`AIPlayToDraw: <number>`** — plain numeric priority properties (not functions) used to rank competing trigger/play options in their respective decision loops. Higher wins.

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

### Ice weakens itself each encounter (Sandstone pattern)

```js
responseOnEncounter: { Resolve: function() { AddCounters(this, "virus", 1); }, automatic: true },
modifyStrength: { Resolve: function(card) { if (card==this) return -Counters(this,"virus"); return 0; } },
```

### Boost all co-protecting ice (Rime pattern)

```js
modifyStrength: {
  Resolve: function(card) {
    if (card != this && this.rezzed && CheckCardType(card, ["ice"])) {
      var s = GetServer(this);
      if (s != null && GetServer(card) == s) return 1;
    }
    return 0;
  },
},
```

### Prevent steal/trash for run duration (Trebuchet pattern)

```js
_flag: false,
modifyCannot:    { Resolve: function(id) { return this._flag && (id==="steal"||id==="trash"); } },
responseOnRunEnds: { Resolve: function() { this._flag = false; }, automatic: true },
```

### Asset with click ability (once per turn)

```js
usedThisTurn: false,
responseOnCorpTurnBegins: { Resolve: function() { this.usedThisTurn = false; }, automatic: true },
abilities: [{
  text: "[click]: Effect.",
  Enumerate: function() {
    if (!this.rezzed || this.usedThisTurn || !CheckClicks(corp, 1)) return [];
    return [{}];
  },
  Resolve: function() { SpendClicks(corp, 1); this.usedThisTurn = true; /* effect */ },
}],
```

### On-trash optional effect (Calvin / Nanoetching pattern)

```js
responseOnTrash: {
  Enumerate: function() {
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
