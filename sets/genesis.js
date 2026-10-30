// CARD DEFINITIONS FOR GENESIS
setIdentifiers.push('gen');



//Whizzard: Master Gamer (2001)
// 3[recurring-c]
// Use these credits to trash cards.
cardSet[2001] = {
  title: "Whizzard: Master Gamer",
  imageFile: "02001.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 0,
  // TODO: Add abilities or responseOn triggers
};

//Spinal Modem (2002)
// +1[mu], 2[recurring-c]
// You can spend hosted credits to use icebreakers.
// Whenever there is a successful trace during a run, suffer 1 core damage.
// Limit 1 console per player.
cardSet[2002] = {
  title: "Spinal Modem",
  imageFile: "02002.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2003] = Imp - DUPLICATE: systemupdate2021.js has Imp (card 31007)

//Morning Star (2004)
// Interface → 1[c]: Break any number of barrier subroutines.
cardSet[2004] = {
  title: "Morning Star",
  imageFile: "02004.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 4,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 8,
  memoryCost: 2,
  strength: 5,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//Cortez Chip (2005)
// [trash]: Choose a piece of ice. The Corp must pay 2[c] as an additional cost to rez that ice until the end of the turn.
cardSet[2005] = {
  title: "Cortez Chip",
  imageFile: "02005.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//Peacock (2006)
// Interface → 2[c]: Break 1 code gate subroutine.
// 2[c]: +3 strength.
cardSet[2006] = {
  title: "Peacock",
  imageFile: "02006.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 3,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//ZU.13 Key Master (2007)
// If you have at least 2[link], the memory cost of this program is 0[mu], even if it is not installed.
// Interface → 1[c]: Break 1 code gate subroutine.
// 1[c]: +1 strength.
cardSet[2007] = {
  title: "ZU.13 Key Master",
  imageFile: "02007.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder", "Cloud"],
  installCost: 1,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//The Helpful AI (2008)
// +1[link]
// [trash]: Choose an icebreaker. That icebreaker has +2 strength until the end of the turn.
cardSet[2008] = {
  title: "The Helpful AI",
  imageFile: "02008.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection", "Link", "Virtual"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Plascrete Carapace (2009)
// When you install this hardware, load 4 power counters onto it. When it is empty, trash it.
// [interrupt] → Hosted power counter: Prevent 1 meat damage.
cardSet[2009] = {
  title: "Plascrete Carapace",
  imageFile: "02009.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Haas-Bioroid: Stronger Together (2010)
// All bioroid ice has +1 strength.
cardSet[2010] = {
  title: "Haas-Bioroid: Stronger Together",
  imageFile: "02010.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  // TODO: Add abilities or responseOn triggers
};

//Mandatory Upgrades (2011)
// You have 1 additional [click] to spend each turn.
cardSet[2011] = {
  title: "Mandatory Upgrades",
  imageFile: "02011.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 6,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Janus 1.0 (2012)
// Lose [click]: Break 1 subroutine on this ice. Only the Runner can use this ability.
// ↳ Do 1 core damage.
// ↳ Do 1 core damage.
// ↳ Do 1 core damage.
// ↳ Do 1 core damage.
cardSet[2012] = {
  title: "Janus 1.0",
  imageFile: "02012.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "AP"],
  rezCost: 15,
  strength: 8,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Ash 2X3ZB9CY (2013)
// Whenever there is a successful run on this server, Trace[4]. If successful, the Runner cannot access any cards other than Ash 2X3ZB9CY for the remainder of this run.
cardSet[2013] = {
  title: "Ash 2X3ZB9CY",
  imageFile: "02013.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Bioroid"],
  rezCost: 2,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Braintrust (2014)
// When you score Braintrust, place 1 agenda counter on it for every 2 advancement tokens on it over 3.
// The rez cost of all ice is lowered by 1 for each agenda counter on Braintrust.
cardSet[2014] = {
  title: "Braintrust",
  imageFile: "02014.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 3,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Snowflake (2015)
// ↳ You and the Runner secretly spend 0[c], 1[c], or 2[c]. Reveal spent credits. End the run if you and the Runner spent a different number of credits.
cardSet[2015] = {
  title: "Snowflake",
  imageFile: "02015.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier", "Psi"],
  rezCost: 1,
  strength: 3,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Restructured Datapool (2016)
// [click]: Trace[2]. If successful, give the Runner 1 tag.
cardSet[2016] = {
  title: "Restructured Datapool",
  imageFile: "02016.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//TMI (2017)
// When you rez TMI, Trace[2]. If unsuccessful, derez TMI.
// ↳ End the run.
cardSet[2017] = {
  title: "TMI",
  imageFile: "02017.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

// cardSet[2018] = Project Atlas - DUPLICATE: systemupdate2021.js has Project Atlas (card 31073)

//Caduceus (2019)
// ↳ Trace[3]. If successful, the Corp gains 3[c].
// ↳ Trace[2]. If successful, end the run.
cardSet[2019] = {
  title: "Caduceus",
  imageFile: "02019.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 3,
  strength: 3,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Dracō (2020)
// When you rez this ice, you may spend any number of credits to place that many power counters on it.
// This ice gets +1 strength for each hosted power counter.
// ↳ Trace[2]. If successful, give the Runner 1 tag and end the run.
cardSet[2020] = {
  title: "Dracō",
  imageFile: "02020.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 1,
  strength: 0,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Vamp (2021)
// Run HQ. If successful, instead of breaching HQ, you may spend X[c]. If you do, the Corp loses X[c]. If you spent credits, take 1 tag.
cardSet[2021] = {
  title: "Vamp",
  imageFile: "02021.png",
  elo: 1745,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "event",
  subTypes: ["Run", "Sabotage"],
  playCost: 0,
  runningWithThis: false,
  breachReplacementQueued: false,
  Resolve: function (params) {
    this.runningWithThis = true;
    this.breachReplacementQueued = false;
    MakeRun(corp.HQ);
  },
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      this.breachReplacementQueued = this.runningWithThis && server === corp.HQ;
    },
  },
  specialOnInsteadOfBreaching: {
    Enumerate: function () {
      if (!this.breachReplacementQueued) return [];
      // Optional replacement: the engine also offers a normal breach.
      if (runner.AI != null && this._vampAIAmount() < 1) return [];
      return [{}];
    },
    Resolve: function () {
      this.breachReplacementQueued = false;
      var max = AvailableCredits(runner);
      var choices = [];
      for (var x = 0; x <= max; x++)
        choices.push({ x: x, label: "Spend " + x + "[c]", button: x + "[c]" });
      //**AI code
      if (runner.AI != null) {
        var amount = this._vampAIAmount();
        choices = [choices[Math.min(amount, choices.length - 1)]];
      }
      DecisionPhase(
        runner,
        choices,
        function (params) {
          if (params.x < 1) {
            Log(GetTitle(this) + ": no credits spent");
            return;
          }
          SpendCredits(runner, params.x, "using", this, function () {
            var lost = LoseCredits(corp, params.x);
            Log(GetTitle(this) + ": Corp loses " + lost + "[c]");
            AddTags(1);
          }, this);
        },
        "Vamp",
        "Choose X",
        this,
      );
    },
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this.runningWithThis = false;
      this.breachReplacementQueued = false;
    },
    availableWhenInactive: true,
  },
  // Spend up to the Corp's credits; worth a tag only for a meaningful swing.
  _vampAIAmount: function () {
    var x = Math.min(corp.creditPool, AvailableCredits(runner));
    return x >= 4 ? x : 0;
  },
  AIBreachReplacementValue: 2,
  AIBreachNotRequired: true,
  AIRunEventExtraPotential: function (server, potential) {
    if (server != corp.HQ || ServerSuccessfulRunPrevented(server)) return 0;
    var x = Math.min(corp.creditPool, AvailableCredits(runner));
    if (x < 4) return 0;
    return x >= 8 ? 2.0 : x >= 6 ? 1.0 : 0.5;
  },
};

// cardSet[2022] = Liberated Account - DUPLICATE: systemupdate2021.js has Liberated Account (card 31010)

//Satellite Uplink (2023)
// Expose up to 2 cards.
cardSet[2023] = {
  title: "Satellite Uplink",
  imageFile: "02023.png",
  elo: 1150,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "event",
  subTypes: [],
  playCost: 2,
  // Only facedown installed Corp cards can be exposed.
  _exposeTargets: function (excluded) {
    return ChoicesInstalledCards(corp, function (card) {
      return !card.rezzed && !card.faceUp && excluded.indexOf(card) < 0;
    });
  },
  // Unknown remote roots first (agenda or trap?), then unknown ice outermost first.
  _exposeAIChoice: function (choices) {
    var best = null, bestScore = -Infinity;
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      if (!card) continue;
      var score = card.knownToRunner ? -10 : 0;
      if (card.cardType != "ice") score += 5 + Counters(card, "advancement");
      else {
        var server = GetServer(card);
        if (server) score += server.ice.indexOf(card) / 10;
      }
      if (score > bestScore) { bestScore = score; best = choices[i]; }
    }
    return best && bestScore > -10 ? best : null;
  },
  Resolve: function (params) {
    this._exposeNext([], 2);
  },
  _exposeNext: function (exposed, remaining) {
    if (remaining < 1) return;
    var choices = this._exposeTargets(exposed);
    if (choices.length < 1) return;
    choices.push({ card: null, label: "Done", button: "Done" });
    //**AI code
    if (runner.AI != null) {
      var pick = this._exposeAIChoice(choices);
      choices = [pick || choices[choices.length - 1]];
    }
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (!params.card) return;
        exposed.push(params.card);
        Expose(params.card, function () {
          this._exposeNext(exposed, remaining - 1);
        }, this);
      },
      "Satellite Uplink",
      "Expose up to " + remaining + " card" + (remaining == 1 ? "" : "s"),
      this,
    );
  },
  AIWouldPlay: function () {
    var unknown = this._exposeTargets([]).filter(function (choice) {
      return !choice.card.knownToRunner;
    });
    // Information is worth a click and 2[c] only with spare resources.
    return unknown.length >= 2 && runner.clickTracker >= 2 && Credits(runner) >= 5;
  },
};

//e3 Feedback Implants (2024)
// Whenever you break a subroutine on a piece of ice, you may pay 1[c] to break 1 subroutine on that ice.
cardSet[2024] = {
  title: "e3 Feedback Implants",
  imageFile: "02024.png",
  elo: 1595,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Mod"],
  installCost: 2,
  responseOnSubroutineBroken: {
    Enumerate: function (subroutine) {
      if (!CheckEncounter()) return [];
      var ice = GetApproachEncounterIce();
      if (!ice || ice.subroutines.indexOf(subroutine) < 0) return [];
      if (!CheckCredits(runner, 1, "using", this)) return [];
      var choices = ChoicesEncounteredSubroutines().map(function (choice) {
        return { subroutine: choice.subroutine, label: '1[c]: Break "' + choice.subroutine.text + '"' };
      });
      if (choices.length < 1) return [];
      var decline = { subroutine: null, label: "Do not use e3 Feedback Implants", button: "Continue" };
      //**AI code
      if (runner.AI != null) {
        var planned = this._e3PlannedSubroutine(ice, choices);
        return [planned || decline];
      }
      choices.push(decline);
      return choices;
    },
    Resolve: function (params) {
      if (!params || !params.subroutine) return;
      SpendCredits(runner, 1, "using", this, function () {
        Break(params.subroutine);
      }, this);
    },
    text: "e3 Feedback Implants: pay 1[c] to break 1 subroutine",
  },
  // A subroutine the current run plan still means to break on this ice: e3
  // replaces that planned breaker use (the plan skips subroutines already broken).
  _e3PlannedSubroutine: function (ice, choices) {
    var path = runner.AI && runner.AI.cachedBestPath;
    if (!path) return null;
    for (var i = 0; i < path.length; i++) {
      if (path[i].iceIdx != approachIce || !path[i].sr_broken) continue;
      for (var j = 0; j < path[i].sr_broken.length; j++) {
        var sr = ice.subroutines[path[i].sr_broken[j].idx];
        for (var k = 0; k < choices.length; k++) if (choices[k].subroutine === sr) return choices[k];
      }
    }
    return null;
  },
};

//Compromised Employee (2025)
// 1[recurring-c]
// Use this credit during traces.
// Gain 1[c] whenever the Corp rezzes a piece of ice.
cardSet[2025] = {
  title: "Compromised Employee",
  imageFile: "02025.png",
  elo: 1361,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "resource",
  subTypes: ["Connection", "Link"],
  installCost: 2,
  recurringCredits: 1,
  canUseCredits: function (doing, card) {
    return doing == "trace";
  },
  automaticOnRez: {
    Resolve: function (card) {
      if (card && card.player == corp && CheckCardType(card, ["ice"])) GainCredits(runner, 1, "", this);
    },
  },
  AIEconomyInstall: function () {
    // Pays back over the Corp's coming ice rezzes; one copy is enough.
    if (runner.rig.resources.some(function (card) { return card.title == "Compromised Employee"; })) return 0;
    return 1;
  },
};

//Notoriety (2026)
// Play only if you made a successful run on R&D, HQ, and Archives this turn.
// Add Notoriety to your score area as an agenda worth 1 agenda point.
cardSet[2026] = {
  title: "Notoriety",
  imageFile: "02026.png",
  elo: 1671,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 1,
  _eligible: function () {
    return TurnEventCount("runnerSuccessfulRunHQ") > 0 && TurnEventCount("runnerSuccessfulRunRnD") > 0 &&
      TurnEventCount("runnerSuccessfulRunArchives") > 0;
  },
  Enumerate: function () {
    return this._eligible() ? [{}] : [];
  },
  Resolve: function (params) {
    this.agendaPoints = 1;
    this.faceUp = true;
    MoveCard(this, runner.scoreArea);
    Log(GetTitle(this) + " added to the Runner's score area (1 point)");
  },
  AIWouldPlay: function () {
    return this._eligible();
  },
  AIPlayWhenCan: 3,
};

//Snowball (2027)
// Interface → 1[c]: Break 1 barrier subroutine.
// 1[c]: +1 strength.
// Whenever you use this program to break a subroutine, this program gets +1 strength for the remainder of this run.
cardSet[2027] = {
  title: "Snowball",
  imageFile: "02027.png",
  elo: 1269,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 4,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  runStrengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost + this.runStrengthBoost;
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 barrier subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(runner, 1, "using", this, function () {
          Break(params.subroutine);
          if (params.subroutine.broken) {
            this.runStrengthBoost++;
            Log(GetTitle(this) + " gets +1 strength for the remainder of this run");
          }
        }, this);
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function (params) {
        SpendCredits(runner, 1, "using", this, function () {
          BoostStrength(this, 1);
        }, this);
      },
    },
  ],
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this.runStrengthBoost = 0;
    },
    availableWhenInactive: true,
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    // Current strength already includes this run's snowball bonus; later
    // in-route growth is not modelled (conservative).
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Barrier"], 1, 1, 1, 1, creditsLeft),
    );
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Dyson Mem Chip (2028)
// +1[mu], +1[link]
cardSet[2028] = {
  title: "Dyson Mem Chip",
  imageFile: "02028.png",
  elo: 1281,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "hardware",
  subTypes: ["Chip", "Link"],
  installCost: 3,
  memoryUnits: 1,
  link: 1,
  AIWorthKeeping: function (installed, spareMU) {
    // Keep it while memory is tight.
    return spareMU < 1;
  },
};

//Encryption Protocol (2029)
// The trash cost of all installed cards is increased by 1.
cardSet[2029] = {
  title: "Encryption Protocol",
  imageFile: "02029.png",
  elo: 1499,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: [],
  rezCost: 0,
  trashCost: 2,
  modifyTrashCost: {
    Resolve: function (card) {
      if (card && CheckInstalled(card)) return 1;
      return 0;
    },
  },
  // A free tax on every installed card: one copy at a time, in its own remote.
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (InstalledCards(corp).some(function (card) { return card.title == "Encryption Protocol"; })) return -1;
    if (corp.clickTracker < 2) return -1;
    return emptyProtectedRemotes.length;
  },
  AIRezWhenCan: function () {
    return true;
  },
};

//Sherlock 1.0 (2030)
// Lose [click]: Break 1 subroutine on this ice. Only the Runner can use this ability.
// ↳ Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.
// ↳ Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.
cardSet[2030] = {
  title: "Sherlock 1.0",
  imageFile: "02030.png",
  elo: 1282,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "Tracer"],
  rezCost: 6,
  strength: 5,
  subroutines: [
    {
      text: "Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.",
      Resolve: function () {
        this._sherlockTrace();
      },
      visual: { y: 80, h: 32 },
    },
    {
      text: "Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.",
      Resolve: function () {
        this._sherlockTrace();
      },
      visual: { y: 115, h: 32 },
    },
  ],
  _sherlockTrace: function () {
    Trace(4, function (successful) {
      if (!successful) return;
      var choices = ChoicesInstalledCards(runner, function (card) {
        return CheckCardType(card, ["program"]);
      });
      if (choices.length < 1) return;
      //**AI code: the most valuable program
      if (corp.AI) {
        var best = choices.slice().sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); })[0];
        corp.AI.preferred = { title: "Sherlock 1.0", option: best };
      }
      DecisionPhase(corp, choices, function (params) {
        Uninstall(params.card, runner.stack, function () {
          Log(GetTitle(params.card) + " added to the top of the Runner's stack");
        });
      }, "Sherlock 1.0", "Add 1 installed program to the top of the Runner's stack", this);
    }, this);
  },
  //Lose [click]: Break 1 subroutine on this ice. Only the Runner can use this ability.
  abilities: [
    {
      text: "Break 1 subroutine on this ice",
      Enumerate: function () {
        if (!CheckClicks(runner, 1)) return [];
        if (activePlayer !== runner) return [];
        if (!encountering) return [];
        if (GetApproachEncounterIce() != this) return [];
        var choices = [];
        for (var i = 0; i < this.subroutines.length; i++) {
          var subroutine = this.subroutines[i];
          if (!subroutine.broken)
            choices.push({ subroutine: subroutine, label: 'Lose [click]: Break "' + subroutine.text + '"' });
        }
        return choices;
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        Break(params.subroutine);
      },
      opponentOnly: true,
    },
  ],
  activeForOpponent: true,
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // Each trace bounces an installed program (a moderate setback).
    result.sr = [[["misc_moderate"]], [["misc_moderate"]]];
    return result;
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (this == iceAI.ice && clicksLeft > 0) {
      var breakresult = rc.SrBreak(this, iceAI, point, 1);
      for (var j = 0; j < breakresult.length; j++) breakresult[j].runner_clicks_spent += 1;
      result = result.concat(breakresult);
    }
    return result;
  },
  AIBreakCost: function (iceCard, subroutineCount, server) {
    if (iceCard != this) return null;
    return { credits: 0, clicks: subroutineCount, counters: 0 };
  },
};

//Jinteki: Replicating Perfection (2031)
// The Runner cannot run on remote servers. Ignore this ability until the end of the turn whenever the Runner runs on a central server.
cardSet[2031] = {
  title: "Jinteki: Replicating Perfection",
  imageFile: "02031.png",
  elo: 1887,
  player: corp,
  faction: "Jinteki",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  // Consumed by RunForbidden (basic run action, MakeRun, run events and the Runner AI's server list).
  modifyCannot: {
    Resolve: function (id, server) {
      if (id !== "run" || !server || typeof server.cards !== "undefined") return false;
      return TurnEventCount("runnerCentralRunInitiated") < 1;
    },
  },
};

//Fetal AI (2032)
// While the Runner is accessing this agenda in R&D, they must reveal it.
// When the Runner accesses this agenda anywhere except in Archives, do 2 net damage.
// As an additional cost to steal this agenda, the Runner must pay 2[c].
cardSet[2032] = {
  title: "Fetal AI",
  imageFile: "02032.png",
  elo: 1693,
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Ambush"],
  advancementRequirement: 5,
  agendaPoints: 2,
  stealCost: { credits: 2 },
  storedFaceUp: false,
  automaticOnAccess: {
    Resolve: function (card) {
      if (card != this) return;
      this.storedFaceUp = this.faceUp;
      if (this.cardLocation == corp.RnD.cards) {
        this.faceUp = true;
        this.knownToRunner = true;
        Log(GetTitle(this) + " revealed");
      }
    },
  },
  responseOnAccess: {
    Enumerate: function () {
      if (accessingCard != this || this.cardLocation == corp.archives.cards) return [];
      return [{}];
    },
    Resolve: function () {
      if (typeof RecordPublicPostureEvent === "function") RecordPublicPostureEvent("trapFired", this);
      Damage("net", 2, true);
    },
    text: "Fetal AI: do 2 net damage",
  },
  automaticOnAccessComplete: {
    Resolve: function (card) {
      if (card == this && this.cardLocation == corp.RnD.cards && !this.storedFaceUp) this.faceUp = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
};

// cardSet[2033] = Trick of Light - DUPLICATE: systemupdate2021.js has Trick of Light (card 31058)

//Sensei (2034)
// ↳ For the remainder of this run, while the Runner is encountering another piece of ice, it gains "↳ End the run." after its other subroutines.
cardSet[2034] = {
  title: "Sensei",
  imageFile: "02034.png",
  elo: 1107,
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 3,
  strength: 5,
  senseiActive: false,
  senseiIce: null,
  senseiSubroutine: null,
  subroutines: [
    {
      text: "For the remainder of this run, while the Runner is encountering another piece of ice, it gains \"↳ End the run.\" after its other subroutines.",
      Resolve: function () {
        this.senseiActive = true;
        Log("For the remainder of this run, other encountered ice gains \"End the run.\"");
      },
      visual: { y: 80, h: 48 },
    },
  ],
  // A lasting effect: it applies even if Sensei is derezzed or trashed later in the run.
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (!this.senseiActive || !ice) return;
      this._removeGrantedSubroutine();
      if (ice == this) return;
      this.senseiIce = ice;
      this.senseiSubroutine = {
        text: "End the run.",
        Resolve: function () { EndTheRun(); },
        grantedBy: this,
      };
      ice.subroutines.push(this.senseiSubroutine);
      Log(GetTitle(ice) + " gains \"End the run.\" from Sensei");
    },
    availableWhenInactive: true,
  },
  responseOnEncounterEnds: {
    Resolve: function () {
      this._removeGrantedSubroutine();
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this._removeGrantedSubroutine();
      this.senseiActive = false;
    },
    availableWhenInactive: true,
  },
  _removeGrantedSubroutine: function () {
    if (this.senseiIce && this.senseiSubroutine) {
      var index = this.senseiIce.subroutines.indexOf(this.senseiSubroutine);
      if (index > -1) this.senseiIce.subroutines.splice(index, 1);
    }
    this.senseiIce = null;
    this.senseiSubroutine = null;
  },
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // Serious only while ice inward of Sensei is still to be encountered.
    var server = GetServer(this);
    var inward = server ? server.ice.indexOf(this) > 0 : false;
    result.sr = [[[inward ? "misc_serious" : "misc_minor"]]];
    return result;
  },
  // Once fired, every other ice still to be encountered this run ends the run unless broken.
  AIModifyIceAI: function (iceAI, startIceIdx) {
    if (!this.senseiActive || !iceAI.ice || iceAI.ice == this) return iceAI;
    var index = iceAI.ice.subroutines.indexOf(this.senseiSubroutine);
    if (index > -1 && typeof iceAI.ice.AIImplementIce !== "function" && index < iceAI.sr.length) {
      iceAI.sr[index] = [["endTheRun"]];
      return iceAI;
    }
    iceAI.sr.push([["endTheRun"]]);
    return iceAI;
  },
};

//Big Brother (2035)
// Play only if the Runner is tagged.
// Give the Runner 2 tags.
cardSet[2035] = {
  title: "Big Brother",
  imageFile: "02035.png",
  elo: 1287,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  Enumerate: function () {
    return CheckTags(1) ? [{}] : [];
  },
  Resolve: function (params) {
    AddTags(2);
  },
  AITagPunishment: 1,
  // Extra tags pay off when the Corp can punish them: a resource to trash or another punishment in HQ.
  AIWouldPlay: function () {
    if (!CheckTags(1)) return false;
    var self = this;
    return runner.rig.resources.length > 0 || corp.HQ.cards.some(function (card) {
      return card !== self && card.AITagPunishment && card.title !== self.title;
    });
  },
  AIPlayWhenCan: 1,
};

//ChiLo City Grid (2036)
// Whenever there is a successful trace during a run on this server, give the Runner 1 tag.
// Limit 1 region per server.
cardSet[2036] = {
  title: "ChiLo City Grid",
  imageFile: "02036.png",
  elo: 1285,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 3,
  trashCost: 6,
  responseOnTraceSuccessful: {
    Enumerate: function (margin) {
      if (!attackedServer || attackedServer != GetServer(this)) return [];
      return [{}];
    },
    Resolve: function () {
      AddTags(1);
    },
    text: "ChiLo City Grid: give the Runner 1 tag",
  },
  _tracerIce: function (server) {
    return server ? server.ice.filter(function (ice) { return CheckSubType(ice, "Tracer"); }) : [];
  },
  AILimitPerServer: function () { return 1; },
  // Only useful behind tracer ice: the server with the most tracers, else hold.
  AIPreferredUpgradeServer: function (legalServers) {
    var best = null, bestCount = 0;
    for (var i = 0; i < legalServers.length; i++) {
      var count = this._tracerIce(legalServers[i]).length;
      if (count > bestCount) { bestCount = count; best = legalServers[i]; }
    }
    return best;
  },
  // Rez while its server is being run and it has tracer ice to back.
  AIRezWhenCan: function () {
    var server = GetServer(this);
    return !!attackedServer && attackedServer == server && this._tracerIce(server).length > 0 &&
      CheckCredits(corp, RezCost(this), "rezzing", this);
  },
};

//Power Grid Overload (2037)
// Play only if the Runner made a successful run during their last turn.
// Trace[2]. If successful, trash 1 installed piece of hardware with an install cost of X or less, where X is equal to the amount by which your trace strength exceeded the Runner's link strength.
cardSet[2037] = {
  title: "Power Grid Overload",
  imageFile: "02037.png",
  elo: 1375,
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 1,
  successfulRunLastTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.successfulRunLastTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () { if (playerTurn === runner) this.successfulRunLastTurn = true; },
    automatic: true,
    availableWhenInactive: true,
  },
  _hardware: function (maxCost) {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["hardware"]) && (card.installCost || 0) <= maxCost && CheckTrash(card);
    });
  },
  // The most valuable hardware the Corp can afford to reach, with the trace
  // boost that reaches it even if the Runner spends all trace credits on link.
  _aiPlan: function (corpCredits) {
    var targets = this._hardware(Infinity).sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); });
    var runnerTrace = AvailableCredits(runner, "trace");
    for (var i = 0; i < targets.length; i++) {
      var cost = targets[i].card.installCost || 0;
      var minimum = Math.max(0, cost + Link() - 2);
      if (minimum > corpCredits) continue;
      return { card: targets[i].card, boost: Math.min(corpCredits, minimum + runnerTrace) };
    }
    return null;
  },
  Enumerate: function () {
    return this.successfulRunLastTurn ? [{}] : [];
  },
  Resolve: function (params) {
    //**AI code: trace strength preference (matched by option.num)
    var plan = null;
    if (corp.AI) {
      plan = this._aiPlan(AvailableCredits(corp, "trace"));
      if (plan) corp.AI.preferred = { command: "trace", strengthToIncrease: plan.boost };
    }
    Trace(2, function (successful) {
      if (!successful) return;
      var x = traceStrength - linkStrength;
      var choices = this._hardware(x);
      if (choices.length < 1) {
        Log("No hardware with install cost " + x + " or less");
        return;
      }
      if (corp.AI) {
        var best = choices.slice().sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); })[0];
        corp.AI.preferred = { title: this.title, option: best };
      }
      DecisionPhase(corp, choices, function (target) {
        Trash(target.card, true);
      }, this.title, "Trash 1 installed piece of hardware with install cost " + x + " or less", this);
    }, this);
  },
  AIWouldPlay: function () {
    if (!this.successfulRunLastTurn) return false;
    return !!this._aiPlan(AvailableCredits(corp, "trace") - PlayCost(this));
  },
  AIPlayWhenCan: 1,
};

//Amazon Industrial Zone (2038)
// Whenever you install a piece of ice protecting this server, you may immediately rez it, lowering its rez cost by 3.
// Limit 1 region per server.
cardSet[2038] = {
  title: "Amazon Industrial Zone",
  imageFile: "02038.png",
  elo: 1270,
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 4,
  trashCost: 2,
  responseOnInstall: {
    Enumerate: function (card) {
      if (!card || !CheckCardType(card, ["ice"]) || card.rezzed) return [];
      var server = GetServer(this);
      if (!server || server.ice.indexOf(card) < 0) return [];
      var cost = Math.max(0, RezCost(card) - 3);
      var decline = { id: 1, card: card, label: "Do not rez", button: "Do not rez" };
      if (!CheckCredits(corp, cost, "rezzing", card)) return [decline];
      var rez = { id: 0, card: card, label: "Rez " + GetTitle(card, true) + " for " + cost + "[c]", button: "Rez (" + cost + "[c])" };
      //**AI code: a discounted rez is worth taking whenever affordable
      if (corp.AI) return [rez];
      return [rez, decline];
    },
    Resolve: function (params) {
      if (!params || params.id !== 0 || params.card.rezzed) return;
      Rez(params.card, false, null, null, false, 3);
    },
    text: "Amazon Industrial Zone: rez the installed ice, lowering its rez cost by 3",
  },
  AILimitPerServer: function () { return 1; },
  // Where future ice goes: a scoring remote first, then HQ.
  AIPreferredUpgradeServer: function (legalServers) {
    for (var i = 0; i < legalServers.length; i++) {
      if (typeof legalServers[i].cards === "undefined" && corp.AI._isAScoringServer(legalServers[i])) return legalServers[i];
    }
    return legalServers.indexOf(corp.HQ) > -1 ? corp.HQ : null;
  },
  // Rez ahead of the next ice install when there is ice in HQ to follow it.
  AIRezWhenCan: function () {
    var iceInHQ = corp.HQ.cards.some(function (card) { return CheckCardType(card, ["ice"]); });
    return iceInHQ && CheckCredits(corp, RezCost(this) + 1, "rezzing", this);
  },
};

//Executive Retreat (2039)
// When you score Executive Retreat, place 1 agenda counter on it and shuffle HQ into R&D.
// [click], hosted agenda counter: Draw 5 cards.
cardSet[2039] = {
  title: "Executive Retreat",
  imageFile: "02039.png",
  elo: 1248,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 5,
  agendaPoints: 3,
  onScore: {
    Resolve: function () {
      AddCounters(this, "agenda", 1);
      var hand = corp.HQ.cards.slice();
      for (var i = 0; i < hand.length; i++) {
        MoveCard(hand[i], corp.RnD.cards);
        hand[i].knownToRunner = false;
      }
      Shuffle(corp.RnD.cards);
      Log("HQ shuffled into R&D");
    },
  },
  abilities: [
    {
      text: "[click], hosted agenda counter: Draw 5 cards.",
      Enumerate: function () {
        if (this.cardLocation != corp.scoreArea) return [];
        if (!CheckActionClicks(corp, 1) || !CheckCounters(this, "agenda", 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        RemoveCounters(this, "agenda", 1);
        Draw(corp, 5);
      },
    },
  ],
  AIDrawAbility: 5,
};

//Freelancer (2040)
// Play only if the Runner is tagged.
// Trash up to 2 resources.
cardSet[2040] = {
  title: "Freelancer",
  imageFile: "02040.png",
  elo: 1271,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  _targets: function (excluded) {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["resource"]) && CheckTrash(card) && excluded.indexOf(card) < 0;
    });
  },
  Enumerate: function () {
    if (!CheckTags(1)) return [];
    //**AI code: only worth a card with a resource to trash
    if (corp.AI && this._targets([]).length < 1) return [];
    return [{}];
  },
  Resolve: function (params) {
    this._trashNext([], 2);
  },
  _trashNext: function (chosen, remaining) {
    var choices = this._targets(chosen);
    if (remaining < 1 || choices.length < 1) {
      if (chosen.length > 0) Trash(chosen, true);
      return;
    }
    choices.push({ card: null, label: "Done", button: "Done" });
    if (corp.AI) {
      var best = choices.slice(0, -1).sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); })[0];
      corp.AI.preferred = { title: this.title, option: best };
    }
    DecisionPhase(corp, choices, function (params) {
      if (!params.card) {
        if (chosen.length > 0) Trash(chosen, true);
        return;
      }
      chosen.push(params.card);
      this._trashNext(chosen, remaining - 1);
    }, this.title, "Trash up to " + remaining + " resource" + (remaining == 1 ? "" : "s"), this);
  },
  AITagPunishment: 1,
  AIWouldPlay: function () {
    return CheckTags(1) && this._targets([]).length > 0;
  },
  AIPlayWhenCan: 2,
};

//Nerve Agent (2041)
// Whenever you make a successful run on HQ, place 1 virus counter on this program.
// Whenever you breach HQ, choose a number less than the number of hosted virus counters. Access that many additional cards.
cardSet[2041] = {
  title: "Nerve Agent",
  imageFile: "02041.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 3,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Joshua B. (2042)
// When your turn begins, you may gain [click]. If you do, take 1 tag when this turn ends.
cardSet[2042] = {
  title: "Joshua B.",
  imageFile: "02042.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Emergency Shutdown (2043)
// Play only if you made a successful run on HQ this turn.
// Derez 1 installed piece of ice.
cardSet[2043] = {
  title: "Emergency Shutdown",
  imageFile: "02043.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "event",
  subTypes: ["Sabotage"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Muresh Bodysuit (2044)
// [interrupt] → The first time each turn you would suffer meat damage, prevent 1 meat damage.
cardSet[2044] = {
  title: "Muresh Bodysuit",
  imageFile: "02044.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Snitch (2045)
// Once per run, you may expose an unrezzed piece of ice when you approach it. You may then jack out.
cardSet[2045] = {
  title: "Snitch",
  imageFile: "02045.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: [],
  installCost: 3,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Chaos Theory: Wünderkind (2046)
// +1[mu]
cardSet[2046] = {
  title: "Chaos Theory: Wünderkind",
  imageFile: "02046.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["G", "mod"],
  deckSize: 40,
  influenceLimit: 15,
  link: 0,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2047] = Test Run - DUPLICATE: systemupdate2021.js has Test Run (card 31028)

//Dinosaurus (2048)
// Dinosaurus can host a single non-AI icebreaker. The memory cost of the hosted icebreaker does not count against your memory limit.
// Hosted icebreaker has +2 strength.
// Limit 1 console per player.
cardSet[2048] = {
  title: "Dinosaurus",
  imageFile: "02048.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 5,
  // TODO: Add abilities or responseOn triggers
};

//Personal Workshop (2049)
// [click]: Host a program or piece of hardware from your grip on Personal Workshop and place power counters on it equal to its install cost.
// 1[c]: Remove 1 power counter from a hosted card.
// When your turn begins, remove 1 power counter from a hosted card.
// When there are no power counters left on a hosted card, install it, ignoring all costs.
cardSet[2049] = {
  title: "Personal Workshop",
  imageFile: "02049.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "resource",
  subTypes: ["Location"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Public Sympathy (2050)
// Your maximum hand size is increased by 2.
cardSet[2050] = {
  title: "Public Sympathy",
  imageFile: "02050.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: [],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2051] = Project Vitruvius - DUPLICATE: systemupdate2021.js has Project Vitruvius (card 31041)

//Viper (2052)
// ↳ Trace[3]. If successful, the Runner loses [click], if able.
// ↳ Trace[3]. If successful, end the run.
cardSet[2052] = {
  title: "Viper",
  imageFile: "02052.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate", "Tracer"],
  rezCost: 3,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Edge of World (2053)
// When the Runner accesses this asset while it is installed, you may pay 3[c]. If you do, do 1 core damage for each piece of ice protecting this server.
cardSet[2053] = {
  title: "Edge of World",
  imageFile: "02053.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//Sunset (2054)
// Choose a server. Arrange the ice protecting that server in any order.
cardSet[2054] = {
  title: "Sunset",
  imageFile: "02054.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Marked Accounts (2055)
// When your turn begins, take 1[c] from Marked Accounts, if able.
// [click]: Place 3[c] from the bank on Marked Accounts.
cardSet[2055] = {
  title: "Marked Accounts",
  imageFile: "02055.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "asset",
  subTypes: ["Transaction"],
  rezCost: 0,
  trashCost: 5,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2056] = Pop-up Window - DUPLICATE: systemupdate2021.js has Pop-up Window (card 31065)

//Woodcutter (2057)
// You can advance this ice if it is rezzed. It gains "↳ Do 1 net damage." for each hosted advancement counter.
cardSet[2057] = {
  title: "Woodcutter",
  imageFile: "02057.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "AP"],
  rezCost: 4,
  strength: 2,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Commercialization (2058)
// Choose a piece of ice. Gain 1[c] for each advancement token on that ice.
cardSet[2058] = {
  title: "Commercialization",
  imageFile: "02058.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Private Contracts (2059)
// Place 14[c] from the bank on Private Contracts when it is rezzed. When there are no credits left on Private Contracts, trash it.
// [click]: Take 2[c] from Private Contracts.
cardSet[2059] = {
  title: "Private Contracts",
  imageFile: "02059.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "asset",
  subTypes: ["Transaction"],
  rezCost: 3,
  trashCost: 5,
  // TODO: Add abilities or responseOn triggers
};

//Chimera (2060)
// When you rez Chimera, choose sentry, code gate, or barrier. Chimera gains that subtype until derezzed.
// When a turn ends, derez Chimera.
// ↳ End the run.
cardSet[2060] = {
  title: "Chimera",
  imageFile: "02060.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Mythic"],
  rezCost: 2,
  strength: 0,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Disrupter (2061)
// [interrupt] → [trash]: Reduce the base trace strength of a trace to 0.
cardSet[2061] = {
  title: "Disrupter",
  imageFile: "02061.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Force of Nature (2062)
// Interface → 2[c]: Break up to 2 code gate subroutines.
// 1[c]: +1 strength.
cardSet[2062] = {
  title: "Force of Nature",
  imageFile: "02062.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 5,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

// cardSet[2063] = Scrubber - DUPLICATE: systemupdate2021.js has Scrubber (card 31011)

//Doppelgänger (2064)
// +1[mu]
// Once per turn → When a successful run ends, you may run any server.
// Limit 1 console per player.
cardSet[2064] = {
  title: "Doppelgänger",
  imageFile: "02064.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Crescentus (2065)
// [trash]: Derez 1 piece of ice you fully broke during this encounter.
cardSet[2065] = {
  title: "Crescentus",
  imageFile: "02065.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Deus X (2066)
// Interface → [trash]: Break any number of AP subroutines.
// [interrupt] → [trash]: Prevent any amount of net damage.
cardSet[2066] = {
  title: "Deus X",
  imageFile: "02066.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker"],
  installCost: 3,
  memoryCost: 1,
  strength: 10,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//All-nighter (2067)
// [click], [trash]: Gain [click][click].
cardSet[2067] = {
  title: "All-nighter",
  imageFile: "02067.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: [],
  installCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//Inside Man (2068)
// 2[recurring-c]
// Use these credits to install hardware.
cardSet[2068] = {
  title: "Inside Man",
  imageFile: "02068.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Underworld Contact (2069)
// When your turn begins, gain 1[c] if you have at least 2[link].
cardSet[2069] = {
  title: "Underworld Contact",
  imageFile: "02069.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Green Level Clearance (2070)
// Gain 3[c] and draw 1 card.
cardSet[2070] = {
  title: "Green Level Clearance",
  imageFile: "02070.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Hourglass (2071)
// ↳ The Runner loses [click], if able.
// ↳ The Runner loses [click], if able.
// ↳ The Runner loses [click], if able.
cardSet[2071] = {
  title: "Hourglass",
  imageFile: "02071.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 5,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Dedicated Server (2072)
// 2[recurring-c]
// Use these credits to rez ice.
cardSet[2072] = {
  title: "Dedicated Server",
  imageFile: "02072.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Facility"],
  rezCost: 3,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Bullfrog (2073)
// ↳ You and the Runner secretly spend 0[c], 1[c] or 2[c]. Reveal spent credits. If you and the Runner spent a different number of credits and this ice is installed, move this ice to the outermost position protecting another server. (The run continues from this new position.)
cardSet[2073] = {
  title: "Bullfrog",
  imageFile: "02073.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Deflector", "Psi"],
  rezCost: 3,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Uroboros (2074)
// ↳ Trace[4]. If successful, the Runner cannot make another run this turn.
// ↳ Trace[4]. If successful, end the run.
cardSet[2074] = {
  title: "Uroboros",
  imageFile: "02074.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 6,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Net Police (2075)
// X[recurring-c]
// Use these credits during traces. X is the number of links the Runner has.
cardSet[2075] = {
  title: "Net Police",
  imageFile: "02075.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "asset",
  subTypes: [],
  rezCost: 1,
  trashCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Weyland Consortium: Because We Built It (2076)
// 1[recurring-c]
// Use this credit to advance ice.
cardSet[2076] = {
  title: "Weyland Consortium: Because We Built It",
  imageFile: "02076.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  // TODO: Add abilities or responseOn triggers
};

//Government Contracts (2077)
// [click], [click]: Gain 4[c].
cardSet[2077] = {
  title: "Government Contracts",
  imageFile: "02077.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//Tyrant (2078)
// You can advance this ice if it is rezzed. It gains "↳ End the run." for each hosted advancement counter.
cardSet[2078] = {
  title: "Tyrant",
  imageFile: "02078.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 7,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Oversight AI (2079)
// Rez a piece of ice, ignoring all costs, and install Oversight AI on that ice as a hosted condition counter with the text "Trash host ice if all its subroutines are broken during a single encounter."
cardSet[2079] = {
  title: "Oversight AI",
  imageFile: "02079.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "operation",
  subTypes: ["Condition"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

// cardSet[2080] = False Lead - DUPLICATE: uprising.js has False Lead (card 26129)

//Surge (2081)
// Play only if you placed at least 1 virus counter on a program this turn.
// Place 2 virus counters on that program.
cardSet[2081] = {
  title: "Surge",
  imageFile: "02081.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

// cardSet[2082] = Xanadu - DUPLICATE: systemupdate2021.js has Xanadu (card 31012)

//Andromeda: Dispossessed Ristie (2083)
// You draw a starting hand of 9 cards.
cardSet[2083] = {
  title: "Andromeda: Dispossessed Ristie",
  imageFile: "02083.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2084] = Networking - DUPLICATE: systemupdate2021.js has Networking (card 31020)

//HQ Interface (2085)
// Whenever you breach HQ, access 1 additional card.
cardSet[2085] = {
  title: "HQ Interface",
  imageFile: "02085.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Pheromones (2086)
// X[recurring-c]
// Use these credits during runs on HQ. X is the number of virus counters on Pheromones.
// Whenever you make a successful run on HQ, place 1 virus counter on Pheromones.
cardSet[2086] = {
  title: "Pheromones",
  imageFile: "02086.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 2,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Quality Time (2087)
// Draw 5 cards.
cardSet[2087] = {
  title: "Quality Time",
  imageFile: "02087.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Replicator (2088)
// Whenever you install a piece of hardware (including Replicator), you may search your stack for another copy of that hardware, reveal it, and add it your grip. Shuffle your stack.
cardSet[2088] = {
  title: "Replicator",
  imageFile: "02088.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Creeper (2089)
// If you have at least 2[link], the memory cost of this program is 0[mu], even if it is not installed.
// Interface → 2[c]: Break 1 sentry subroutine.
// 1[c]: +1 strength.
cardSet[2089] = {
  title: "Creeper",
  imageFile: "02089.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer", "Cloud"],
  installCost: 5,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//Kraken (2090)
// Play only if you stole an agenda this turn.
// Choose a server. The Corp trashes 1 piece of ice protecting that server.
cardSet[2090] = {
  title: "Kraken",
  imageFile: "02090.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "event",
  subTypes: [],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Kati Jones (2091)
// You cannot use this resource more than once per turn.
// [click]: Place 3[c] on this resource.
// [click]: Take all credits from this resource.
cardSet[2091] = {
  title: "Kati Jones",
  imageFile: "02091.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Eve Campaign (2092)
// Place 16[c] from the bank on Eve Campaign when it is rezzed. When there are no credits left on Eve Campaign, trash it.
// When your turn begins, take 2[c] from Eve Campaign.
cardSet[2092] = {
  title: "Eve Campaign",
  imageFile: "02092.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 5,
  trashCost: 5,
  // TODO: Add abilities or responseOn triggers
};

//Rework (2093)
// Shuffle 1 card from HQ into R&D.
cardSet[2093] = {
  title: "Rework",
  imageFile: "02093.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Whirlpool (2094)
// ↳ The Runner cannot jack out for the remainder of this run. Trash Whirlpool.
cardSet[2094] = {
  title: "Whirlpool",
  imageFile: "02094.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Trap"],
  rezCost: 0,
  strength: 1,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

// cardSet[2095] = Hokusai Grid - DUPLICATE: systemupdate2021.js has Hokusai Grid (card 31059)

//Data Hound (2096)
// ↳ Trace[2]. If successful, look at the top X cards of the stack, where X is equal to the amount by which your trace strength exceeded the Runner's link strength. Trash 1 of those cards and arrange the rest in any order.
cardSet[2096] = {
  title: "Data Hound",
  imageFile: "02096.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer", "Observer"],
  rezCost: 1,
  strength: 2,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Bernice Mai (2097)
// Whenever there is a successful run on this server, Trace[5]. If successful, give the Runner 1 tag. If unsuccessful, trash Bernice Mai.
cardSet[2097] = {
  title: "Bernice Mai",
  imageFile: "02097.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 0,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Salvage (2098)
// You can advance this ice if it is rezzed. It gains "↳ Trace[2]. If successful, give the Runner 1 tag." for each hosted advancement counter.
cardSet[2098] = {
  title: "Salvage",
  imageFile: "02098.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Tracer"],
  rezCost: 2,
  strength: 0,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Simone Diego (2099)
// 2[recurring-c]
// You can spend hosted credits to take the basic action to advance cards in the root of or protecting this server.
cardSet[2099] = {
  title: "Simone Diego",
  imageFile: "02099.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 4,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Foxfire (2100)
// Trace[7]. If successful, trash 1 virtual resource or 1 link.
cardSet[2100] = {
  title: "Foxfire",
  imageFile: "02100.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Retrieval Run (2101)
// Run Archives. If successful, instead of breaching Archives, you may install 1 program from your heap, ignoring all costs.
cardSet[2101] = {
  title: "Retrieval Run",
  imageFile: "02101.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Darwin (2102)
// Interface → 2[c]: Break 1 subroutine.
// X is equal to the number of hosted virus counters.
// When your turn begins, you may pay 1[c] to place 1 virus counter on this program.
cardSet[2102] = {
  title: "Darwin",
  imageFile: "02102.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "AI", "Virus"],
  installCost: 3,
  memoryCost: 1,
  strength: 0, // TODO: X value in card data
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//Data Leak Reversal (2103)
// Install only if you made a successful run on a central server this turn.
// If you are tagged, Data Leak Reversal gains "[click]: The Corp trashes the top card of R&D."
cardSet[2103] = {
  title: "Data Leak Reversal",
  imageFile: "02103.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Virtual", "Sabotage"],
  installCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//Faerie (2104)
// Interface → 0[c]: Break 1 sentry subroutine.
// 1[c]: +1 strength.
// Whenever an encounter ends, if you used this program to break a subroutine during that encounter, trash this program.
cardSet[2104] = {
  title: "Faerie",
  imageFile: "02104.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 0,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    // TODO: Add break and strength pump abilities
  ],
};

//Mr. Li (2105)
// [click]: Draw 2 cards. When you do, add 1 of those cards to the bottom of your stack.
cardSet[2105] = {
  title: "Mr. Li",
  imageFile: "02105.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Indexing (2106)
// Run R&D. If successful, instead of breaching R&D, you may look at the top 5 cards of R&D and arrange them in any order.
cardSet[2106] = {
  title: "Indexing",
  imageFile: "02106.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//R&D Interface (2107)
// Whenever you breach R&D, access 1 additional card.
cardSet[2107] = {
  title: "R&D Interface",
  imageFile: "02107.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Deep Thought (2108)
// Whenever you make a successful run on R&D, place 1 virus counter on Deep Thought.
// If there are at least 3 virus counters on Deep Thought, it gains "When your turn begins, you may look at the top card of R&D."
cardSet[2108] = {
  title: "Deep Thought",
  imageFile: "02108.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 1,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//New Angeles City Hall (2109)
// [interrupt] → 2[c]: Prevent 1 tag.
// When you steal an agenda, trash this resource.
cardSet[2109] = {
  title: "New Angeles City Hall",
  imageFile: "02109.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Location", "Government"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2110] = Eli 1.0 - DUPLICATE: systemupdate2021.js has Eli 1.0 (card 31043)

//Ruhr Valley (2111)
// As an additional cost to make a run on this server, the Runner must spend [click].
// Limit 1 region per server.
cardSet[2111] = {
  title: "Ruhr Valley",
  imageFile: "02111.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 6,
  trashCost: 4,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2112] = Ronin - DUPLICATE: systemupdate2021.js has Ronin (card 31053)

//Midori (2113)
// Whenever the Runner approaches a piece of ice protecting this server, you may swap that ice with 1 piece of ice from HQ. (The new ice is installed unrezzed.) If you do, the Runner may jack out. Use this ability only once per run.
cardSet[2113] = {
  title: "Midori",
  imageFile: "02113.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 0,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//NBN: The World is Yours* (2114)
// Your maximum hand size is increased by 1.
cardSet[2114] = {
  title: "NBN: The World is Yours*",
  imageFile: "02114.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 40,
  influenceLimit: 12,
  // TODO: Add abilities or responseOn triggers
};

// cardSet[2115] = Project Beale - DUPLICATE: systemupdate2021.js has Project Beale (card 31062)

//Midseason Replacements (2116)
// Play only if the Runner stole an agenda during their last turn.
// Trace[6]. If successful, give the Runner X tags. X is equal to the amount by which your trace strength exceeded their link strength.
cardSet[2116] = {
  title: "Midseason Replacements",
  imageFile: "02116.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 4,
  cardType: "operation",
  subTypes: [],
  playCost: 5,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Flare (2117)
// ↳Trace[6]. If successful, trash 1 piece of hardware, do 2 meat damage (cannot be prevented), and end the run.
cardSet[2117] = {
  title: "Flare",
  imageFile: "02117.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer", "AP"],
  rezCost: 9,
  strength: 6,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Dedicated Response Team (2118)
// If the Runner is tagged, Dedicated Response Team gains "Whenever a successful run ends, do 2 meat damage."
cardSet[2118] = {
  title: "Dedicated Response Team",
  imageFile: "02118.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "asset",
  subTypes: ["Hostile"],
  rezCost: 2,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Burke Bugs (2119)
// ↳ Trace[0]. If successful, the Runner trashes 1 program.
cardSet[2119] = {
  title: "Burke Bugs",
  imageFile: "02119.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer"],
  rezCost: 0,
  strength: 0,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Corporate War (2120)
// If you have at least 7[c] when you score Corporate War, gain 7[c]; otherwise, lose all credits in your credit pool.
cardSet[2120] = {
  title: "Corporate War",
  imageFile: "02120.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};
