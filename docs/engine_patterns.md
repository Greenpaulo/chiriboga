# Chiriboga Engine — Pattern Reference

> Read this file at the START of every card-implementation session.
> Do NOT read systemgateway.js / elevation.js / mechanics.js for pattern lookups — use this instead.

---

## Card Object Shape

```js
cardSet[NNNNN] = {
  title: "...",
  imageFile: "NNNNN.png",
  player: corp | runner,
  faction: "Weyland Consortium" | "Haas-Bioroid" | "Jinteki" | "NBN" | "Anarch" | "Criminal" | "Shaper" | "Neutral",
  influence: N,
  cardType: "ice" | "asset" | "upgrade" | "operation" | "agenda" | "program" | "hardware" | "resource" | "event" | "identity",
  subTypes: ["..."],
  rezCost: N,       // assets, upgrades, ice
  trashCost: N,     // assets, upgrades
  strength: N,      // ice / icebreakers
  playCost: N,      // operations / events
  installCost: N,   // runner cards
  memoryCost: N,    // programs
  link: N,          // identities
  advancementRequirement: N, agendaPoints: N,  // agendas
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
```

### Install / Rez / Trash

```js
responseOnRez:     { Resolve, automatic: true }
responseOnInstall: { Resolve, automatic: true }
responseOnTrash:   { Enumerate, Resolve, text }   // optional choice on trash
```

### Score / Steal

```js
onScore: { Resolve }
onSteal: { Resolve }
```

### Modify Hooks (return a number, 0 = no change)

```js
modifyStrength:    Resolve(card)           // card = target card being checked
modifyInstallCost: Resolve(card), availableWhenInactive?
modifyTrashCost:   Resolve(card)
modifyRezCost:     Resolve(card)
modifyMaxHandSize: Resolve()
modifyCannot:      Resolve(id, card)       // id = "steal"|"trash"|"score"; return true to forbid
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
GainCredits(player, amount, reason, source)
LoseCredits(player, amount)
SpendCredits(player, amount, reason, source, callback, context)
CheckCredits(player, amount)          // true if player can afford
```

### Clicks
```js
SpendClicks(player, n)
GainClicks(player, n)
CheckClicks(player, n)               // alias CheckActionClicks
```

### Cards / Zones
```js
Draw(player, n)
Trash(card, runner_paid)             // runner_paid=true if runner paid cost
MoveCard(card, destination)          // destination = zone object
Shuffle(zone)                        // e.g. Shuffle(corp.RnD)
Install(card, destination, ignoreAllCosts, position, returnToPhase, onInstallResolve, context)
```

### Damage / Tags
```js
Damage("net"|"meat"|"brain", amount, preventable)
AddTags(n)
RemoveTags(n)
```

### Counters
```js
AddCounters(card, type, n)           // type: "virus"|"power"|"advancement"|"agenda"
Counters(card, type)                 // returns count
```

### Ice / Runs
```js
EndTheRun()
Trace(strength, callback)            // callback(successful: bool)
Break(subroutine)
CheckUnbrokenSubroutines()
ChoicesEncounteredSubroutines()      // unbroken + unlocked subs (respects _lockedFromBreak)
```

### Servers / Locations
```js
GetServer(card)          // server object or null
attackedServer           // global: current run server
approachIce              // global: index of current ice in server.ice[]
corp.HQ / corp.RnD / corp.archives
runner.grip / runner.stack / runner.heap
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

| ID    | Title                 | Status |
|-------|-----------------------|--------|
| 26001 | Isolation             | ✅ |
| 26002 | Demolisher            | ✅ |
| 26022 | Spec Work             | ✅ |
| 26023 | Supercorridor         | ✅ |
| 26024 | Gauss                 | ✅ |
| 26027 | The Artist            | ✅ |
| 26033 | Calvin B4L3Y          | ✅ |
| 26034 | Nanoetching Matrix    | ✅ |
| 26035 | Hagen                 | ✅ |
| 26036 | Fully Operational     | ✅ |
| 26037 | Red Level Clearance   | ✅ |
| 26048 | Daily Quest           | ✅ |
| 26049 | Tiered Subscription   | ✅ |
| 26050 | Congratulations!      | ✅ |
| 26051 | Loot Box              | ✅ |
| 26057 | Roughneck Repair Squad| ✅ |
| 26058 | Afshar                | ✅ |
| 26059 | Sandstone             | ✅ |
| 26060 | Trebuchet             | ✅ |
| 26064 | CSR Campaign          | ✅ |
| 26065 | Rime                  | ✅ |
