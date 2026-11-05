// CARD DEFINITIONS FOR GENESIS
setIdentifiers.push('gen');



//Whizzard: Master Gamer (2001)
// 3[recurring-c]
// Use these credits to trash cards.
cardSet[2001] = {
  title: "Whizzard: Master Gamer",
  imageFile: "02001.png",
  elo: 2015,
  player: runner,
  faction: "Anarch",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 0,
  //Refilled with other recurring credits when the Runner's turn begins (phase.js Runner 1.2).
  recurringCredits: 3,
  credits: 0,
  canUseCredits: function (doing, card) {
    return doing == "paying trash costs" || doing == "trashing";
  },
  AIReducesTrashCost: function (card) {
    return Math.min(TrashCost(card), this.credits || 0);
  },
};

//Spinal Modem (2002)
// +1[mu], 2[recurring-c]
// You can spend hosted credits to use icebreakers.
// Whenever there is a successful trace during a run, suffer 1 core damage.
// Limit 1 console per player.
cardSet[2002] = {
  title: "Spinal Modem",
  imageFile: "02002.png",
  elo: 1416,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 4,
  unique: true,
  memoryUnits: 1,
  recurringCredits: 2,
  canUseCredits: function (doing, card) {
    return doing == "using" && !!card && CheckSubType(card, "Icebreaker");
  },
  //Fired by TraceStrengthDecisions before the trace's own success effect resolves.
  responseOnTraceSuccessful: {
    Enumerate: function () {
      return attackedServer !== null ? [{}] : [];
    },
    Resolve: function () {
      Damage("core", 1, true);
    },
    automatic: true,
    text: "Spinal Modem: suffer 1 core damage",
  },
};

// cardSet[2003] = Imp - DUPLICATE: systemupdate2021.js has Imp (card 31007)

//Morning Star (2004)
// Interface → 1[c]: Break any number of barrier subroutines.
cardSet[2004] = {
  title: "Morning Star",
  imageFile: "02004.png",
  elo: 1393,
  player: runner,
  faction: "Anarch",
  influence: 4,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 8,
  memoryCost: 2,
  strength: 5,
  //Repeated optional breaks after the first (pattern from Begemot).
  SharedDecisionCallback: function (params) {
    if (typeof params != "undefined") {
      if (typeof params.subroutine != "undefined") Break(params.subroutine);
      else return; //done breaking
    }
    var choices = ChoicesEncounteredSubroutines();
    if (choices.length < 1) return;
    for (var i = 0; i < choices.length; i++)
      choices[i].label = "(Morning Star) Break another subroutine. -> " + choices[i].label;
    choices.push({ id: choices.length, label: "Continue", button: "Continue" });
    DecisionPhase(runner, choices, this.SharedDecisionCallback, "Break any number of barrier subroutines", "Morning Star", this);
  },
  abilities: [
    {
      text: "Break any number of barrier subroutines",
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
          this.SharedDecisionCallback();
        }, this);
      },
    },
  ],
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    return result.concat(rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Barrier"],
      Infinity, 0, 1, iceAI.sr.length, creditsLeft)); //fixed strength, break any number for 1
  },
};

//Cortez Chip (2005)
// [trash]: Choose a piece of ice. The Corp must pay 2[c] as an additional cost to rez that ice until the end of the turn.
cardSet[2005] = {
  title: "Cortez Chip",
  imageFile: "02005.png",
  elo: 1206,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 0,
  _aiTarget: null,
  abilities: [
    {
      text: "[trash]: The Corp must pay 2[c] more to rez a piece of ice this turn.",
      alt: "cortez_tax",
      Enumerate: function () {
        if (!CheckTrash(this)) return [];
        var choices = ChoicesInstalledCards(corp, function (card) {
          return CheckCardType(card, ["ice"]);
        });
        if (runner.AI && this._aiTarget) {
          var target = this._aiTarget;
          var preferred = choices.filter(function (choice) { return choice.card == target; });
          if (preferred.length) return preferred;
        }
        return choices;
      },
      Resolve: function (params) {
        var ice = params.card;
        this._aiTarget = null;
        Trash(this, false, function () {
          //Additional costs are added after ordinary rez-cost reductions are clamped.
          var effect = {
            title: "Cortez Chip",
            player: runner,
            ice: ice,
            modifyAdditionalRezCost: {
              Resolve: function (card) {
                return card == this.ice ? 2 : 0;
              },
            },
            responseOnRunnerTurnEnds: { Resolve: function () { RemoveLingeringEffect(this); }, automatic: true },
            responseOnCorpTurnEnds: { Resolve: function () { RemoveLingeringEffect(this); }, automatic: true },
          };
          AddLingeringEffect(effect);
          Log("The Corp must pay 2[c] more to rez " + GetTitle(ice, true) + " this turn");
        }, this);
      },
    },
  ],
  //Use on an unrezzed ice being approached while the Corp's public credits are in a range
  //where 2 more credits plausibly price out the rez.
  AITriggerOnIceApproach: function (ice) {
    if (!CheckInstalled(this) || !ice || ice.rezzed || !CheckCardType(ice, ["ice"])) return null;
    var credits = AvailableCredits(corp);
    if (credits < 1 || credits > 7) return null;
    this._aiTarget = ice;
    return "cortez_tax";
  },
};

//Peacock (2006)
// Interface → 2[c]: Break 1 code gate subroutine.
// 2[c]: +3 strength.
cardSet[2006] = {
  title: "Peacock",
  imageFile: "02006.png",
  elo: 1146,
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
    {
      text: "Break 1 code gate subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(runner, 2, "using", this, function () {
          Break(params.subroutine);
        }, this);
      },
    },
    {
      text: "+3 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(runner, 2, "using", this, function () {
          BoostStrength(this, 3);
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
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    return result.concat(rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Code Gate"],
      2, 3, 2, 1, creditsLeft)); //cost to str, amt to str, cost to brk, amt to brk
  },
};

//ZU.13 Key Master (2007)
// If you have at least 2[link], the memory cost of this program is 0[mu], even if it is not installed.
// Interface → 1[c]: Break 1 code gate subroutine.
// 1[c]: +1 strength.
cardSet[2007] = {
  title: "ZU.13 Key Master",
  imageFile: "02007.png",
  elo: 1604,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder", "Cloud"],
  installCost: 1,
  memoryCost: 1,
  //MemoryCost (utility.js) reads this, as for Creeper.
  variableMemoryCost: function () {
    if (Link() >= 2) return 0;
    return this.memoryCost;
  },
  strength: 1,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 code gate subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(runner, 1, "using", this, function () {
          Break(params.subroutine);
        }, this);
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
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
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    return result.concat(rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Code Gate"],
      1, 1, 1, 1, creditsLeft));
  },
};

//The Helpful AI (2008)
// +1[link]
// [trash]: Choose an icebreaker. That icebreaker has +2 strength until the end of the turn.
cardSet[2008] = {
  title: "The Helpful AI",
  imageFile: "02008.png",
  elo: 1222,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection", "Link", "Virtual"],
  installCost: 2,
  unique: true,
  link: 1,
  abilities: [
    {
      text: "[trash]: Choose an icebreaker. It has +2 strength until the end of the turn.",
      alt: "helpfulai_boost",
      Enumerate: function () {
        if (!CheckTrash(this)) return [];
        var choices = ChoicesInstalledCards(runner, function (card) {
          return CheckSubType(card, "Icebreaker");
        });
        if (runner.AI && choices.length > 1) {
          var target = this._aiTarget();
          var preferred = choices.filter(function (choice) { return choice.card == target; });
          if (preferred.length) return preferred;
        }
        return choices;
      },
      Resolve: function (params) {
        var breaker = params.card;
        Trash(this, false, function () {
          AddLingeringEffect({
            title: "The Helpful AI",
            player: runner,
            breaker: breaker,
            modifyStrength: {
              Resolve: function (card) {
                return card == this.breaker ? 2 : 0;
              },
            },
            responseOnRunnerTurnEnds: { Resolve: function () { RemoveLingeringEffect(this); }, automatic: true },
            responseOnCorpTurnEnds: { Resolve: function () { RemoveLingeringEffect(this); }, automatic: true },
          });
          Log(GetTitle(breaker, true) + " has +2 strength until the end of the turn");
          if (runner.AI) runner.AI.cachedBestPath = null;
        }, this);
      },
    },
  ],
  //The icebreaker the planned route boosts, else the strongest matching breaker.
  _aiTarget: function () {
    var self = this, path = runner.AI ? runner.AI.cachedBestPath || [] : [];
    for (var i = 0; i < path.length; i++) {
      for (var j = 0; j < path[i].card_str_mods.length; j++) {
        if (path[i].card_str_mods[j].use == self) return path[i].card_str_mods[j].card;
      }
    }
    var ice = GetApproachEncounterIce(), best = null;
    InstalledCards(runner).forEach(function (card) {
      if (!CheckSubType(card, "Icebreaker")) return;
      var matches = !ice || (card.subTypes || []).some(function (t) { return CheckSubType(ice, { Fracter: "Barrier", Decoder: "Code Gate", Killer: "Sentry" }[t] || "-"); });
      if (matches && (!best || Strength(card) > Strength(best))) best = card;
    });
    return best;
  },
  //Run Calculator: once per route, trash for +2 strength on one icebreaker for the rest of the run
  //(the route is shorter than the turn). Losing the link is charged as a minor cost.
  AIEncounterAbility: function (rc, result, point, iceAI) {
    if (!CheckInstalled(this) || point.sr_broken.length > 0) return result;
    for (var i = 0; i < point.card_str_mods.length; i++) {
      if (point.card_str_mods[i].use == this) return result;
    }
    var self = this;
    InstalledCards(runner).forEach(function (card) {
      if (!CheckSubType(card, "Icebreaker")) return;
      var p = rc.StrModify(self, card, point, 2, true);
      p.effects = p.effects.concat([["misc_minor"]]);
      result.push(p);
    });
    return result;
  },
};

//Plascrete Carapace (2009)
// When you install this hardware, load 4 power counters onto it. When it is empty, trash it.
// [interrupt] → Hosted power counter: Prevent 1 meat damage.
cardSet[2009] = {
  title: "Plascrete Carapace",
  imageFile: "02009.png",
  elo: 1754,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 3,
  power: 0,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) AddCounters(this, "power", 4);
    },
  },
  responsePreventableDamage: {
    Enumerate: function () {
      if (intended.damageType != "meat" || intended.damage < 1) return [];
      if (!CheckCounters(this, "power", 1)) return [];
      var max = Math.min(Counters(this, "power"), intended.damage);
      var choices = [];
      for (var i = 1; i <= max; i++)
        choices.push({ prevent: i, label: "Spend " + i + " power counter(s): prevent " + i + " meat damage" });
      choices.push({ prevent: 0, label: "Don't use Plascrete Carapace", button: "Continue" });
      if (runner.AI) return [choices[max - 1]]; //prevent as much as possible
      return choices;
    },
    Resolve: function (params) {
      if (!params || !params.prevent) return;
      RemoveCounters(this, "power", params.prevent);
      intended.damage -= params.prevent;
      Log(params.prevent + " meat damage prevented");
      if (!CheckCounters(this, "power", 1)) Trash(this, false);
    },
    text: "Plascrete Carapace: prevent meat damage",
  },
  AIMeatDamagePrevention: function () {
    return CheckInstalled(this) ? Counters(this, "power") : 0;
  },
};

//Haas-Bioroid: Stronger Together (2010)
// All bioroid ice has +1 strength.
cardSet[2010] = {
  title: "Haas-Bioroid: Stronger Together",
  imageFile: "02010.png",
  elo: 1288,
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  //Read through Strength() by the engine, the run calculator and Corp security.
  modifyStrength: {
    Resolve: function (card) {
      if (card && CheckCardType(card, ["ice"]) && CheckSubType(card, "Bioroid")) return 1;
      return 0;
    },
  },
};

//Mandatory Upgrades (2011)
// You have 1 additional [click] to spend each turn.
// Ruling (NSG 2026.04): allotted clicks are gained in the draw phase, so scoring or
// forfeiting mid-turn does not change clicks already gained that turn.
cardSet[2011] = {
  title: "Mandatory Upgrades",
  imageFile: "02011.png",
  elo: 1420,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 6,
  agendaPoints: 2,
  //Active only while in the Corp's score area (read by ResetClicks).
  modifyAllottedClicks: {
    Resolve: function (player) {
      return player == corp && corp.scoreArea.includes(this) ? 1 : 0;
    },
  },
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
  elo: 1372,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "AP"],
  rezCost: 15,
  strength: 8,
  subroutines: [
    { text: "Do 1 core damage.", Resolve: function () { Damage("core", 1, true); }, visual: { y: 101, h: 16 } },
    { text: "Do 1 core damage.", Resolve: function () { Damage("core", 1, true); }, visual: { y: 119, h: 16 } },
    { text: "Do 1 core damage.", Resolve: function () { Damage("core", 1, true); }, visual: { y: 136, h: 16 } },
    { text: "Do 1 core damage.", Resolve: function () { Damage("core", 1, true); }, visual: { y: 154, h: 16 } },
  ],
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
    result.sr = [[["coreDamage"]], [["coreDamage"]], [["coreDamage"]], [["coreDamage"]]];
    return result;
  },
  //Runner click-break, as Eli 1.0.
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

//Ash 2X3ZB9CY (2013)
// Whenever there is a successful run on this server, Trace[4]. If successful, the Runner cannot access any cards other than Ash 2X3ZB9CY for the remainder of this run.
cardSet[2013] = {
  title: "Ash 2X3ZB9CY",
  imageFile: "02013.png",
  elo: 1789,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Bioroid"],
  rezCost: 2,
  trashCost: 3,
  unique: true,
  //The server whose run is restricted; lasts for the run even if Ash leaves play.
  lockedServer: null,
  responseOnRunSuccessful: {
    Enumerate: function () {
      if (!attackedServer || attackedServer != GetServer(this)) return [];
      return [{}];
    },
    Resolve: function () {
      var server = attackedServer;
      Trace(4, function (successful) {
        if (!successful) return;
        this.lockedServer = server;
        Log("The Runner cannot access cards other than " + GetTitle(this, true) + " for the remainder of this run");
      }, this);
    },
    text: "Ash 2X3ZB9CY: Trace[4]",
  },
  modifyAccessCardAllowed: {
    Resolve: function (card) {
      if (!this.lockedServer || attackedServer != this.lockedServer || card == this) return 0;
      return 1;
    },
    availableWhenInactive: true,
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this.lockedServer = null;
    },
    availableWhenInactive: true,
  },
  //Traces are modelled as successful (conservative for the Runner; link and bids are not priced).
  AIAccessLimit: function (server) {
    return CheckInstalled(this) && this.rezzed && GetServer(this) == server ? 0 : Infinity;
  },
  AIDefensiveValue: function (server) {
    if (!server) return 0;
    if (server == corp.HQ) return 3;
    if (typeof server.cards == "undefined") return 2; //remote: protects its agenda or asset
    return 1;
  },
  AILimitPerServer: function () {
    return 1;
  },
  //Rez during a run on this server, before it is declared successful.
  AIRezWhenCan: function () {
    return CheckInstalled(this) && attackedServer !== null && attackedServer == GetServer(this);
  },
};

//Braintrust (2014)
// When you score Braintrust, place 1 agenda counter on it for every 2 advancement tokens on it over 3.
// The rez cost of all ice is lowered by 1 for each agenda counter on Braintrust.
cardSet[2014] = {
  title: "Braintrust",
  imageFile: "02014.png",
  elo: 1443,
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 3,
  agendaPoints: 2,
  responseOnScored: {
    Resolve: function () {
      if (intended.score != this) return;
      var over = Counters(this, "advancement") - 3;
      if (over >= 2) AddCounters(this, "agenda", Math.floor(over / 2));
    },
    automatic: true,
  },
  //Active only while in the Corp's score area. RezCost() feeds the AI rez decisions.
  modifyRezCost: {
    Resolve: function (card) {
      if (!corp.scoreArea.includes(this) || !card || !CheckCardType(card, ["ice"])) return 0;
      return -Counters(this, "agenda");
    },
  },
};

//Snowflake (2015)
// ↳ You and the Runner secretly spend 0[c], 1[c], or 2[c]. Reveal spent credits. End the run if you and the Runner spent a different number of credits.
cardSet[2015] = {
  title: "Snowflake",
  imageFile: "02015.png",
  elo: 1279,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier", "Psi"],
  rezCost: 1,
  strength: 3,
  subroutines: [
    {
      text: "Psi game: end the run if the bids differ.",
      Resolve: function () {
        PsiGame(function (different) {
          if (different) EndTheRun();
        }, this);
      },
      visual: { y: 89, h: 64 },
    },
  ],
  //The Psi game is modelled as ending the run (conservative, as traces are modelled as successful).
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]]];
    return result;
  },
};

//Restructured Datapool (2016)
// [click]: Trace[2]. If successful, give the Runner 1 tag.
cardSet[2016] = {
  title: "Restructured Datapool",
  imageFile: "02016.png",
  elo: 1275,
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 5,
  agendaPoints: 3,
  _aiUsedThisTurn: false,
  responseOnCorpTurnBegins: { Resolve: function () { this._aiUsedThisTurn = false; }, automatic: true },
  abilities: [
    {
      text: "[click]: Trace[2]. If successful, give the Runner 1 tag.",
      Enumerate: function () {
        if (!corp.scoreArea.includes(this) || !CheckActionClicks(corp, 1)) return [];
        if (corp.AI && !this._aiWouldUse()) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this._aiUsedThisTurn = true;
        Trace(2, function (successful) {
          if (successful) AddTags(1);
        }, this);
      },
    },
  ],
  //Once per turn against an untagged Runner when the Corp can outbid the public link plus a
  //2-credit Runner boost and still keep 2 credits.
  _aiWouldUse: function () {
    if (this._aiUsedThisTurn || runner.tags > 0) return false;
    var needed = Math.max(0, Link() + 2 + 1 - 2);
    return AvailableCredits(corp, "trace") >= needed + 2;
  },
  AITriggerWhenCan: true,
};

//TMI (2017)
// When you rez TMI, Trace[2]. If unsuccessful, derez TMI.
// ↳ End the run.
cardSet[2017] = {
  title: "TMI",
  imageFile: "02017.png",
  elo: 1215,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 5,
  responseOnRez: {
    Enumerate: function (card) {
      return card == this ? [{}] : [];
    },
    Resolve: function () {
      Trace(2, function (successful) {
        if (!successful && this.rezzed) Derez(this);
      }, this);
    },
    text: "TMI: Trace[2]",
  },
  subroutines: [
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 100, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]]];
    return result;
  },
  //AI: rez only with enough left after the rez cost to beat the public link.
  RezUsability: function () {
    return AvailableCredits(corp, "rezzing", this) >= RezCost(this) + Math.max(0, Link() + 1 - 2);
  },
};

// cardSet[2018] = Project Atlas - DUPLICATE: systemupdate2021.js has Project Atlas (card 31073)

//Caduceus (2019)
// ↳ Trace[3]. If successful, the Corp gains 3[c].
// ↳ Trace[2]. If successful, end the run.
cardSet[2019] = {
  title: "Caduceus",
  imageFile: "02019.png",
  elo: 1544,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 3,
  strength: 3,
  subroutines: [
    {
      text: "Trace[3]. If successful, the Corp gains 3[c].",
      Resolve: function () {
        Trace(3, function (successful) {
          if (successful) GainCredits(corp, 3);
        }, this);
      },
      visual: { y: 73, h: 32 },
    },
    {
      text: "Trace[2]. If successful, end the run.",
      Resolve: function () {
        Trace(2, function (successful) {
          if (successful) EndTheRun();
        }, this);
      },
      visual: { y: 98, h: 16 },
    },
  ],
  //Traces are modelled as successful (conservative for the Runner; link and bids are not priced).
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["misc_minor"]], [["endTheRun"]]];
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
  elo: 1255,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 1,
  strength: 0,
  power: 0,
  responseOnRez: {
    Enumerate: function (card) {
      return card == this ? [{}] : [];
    },
    Resolve: function () {
      var choices = [];
      for (var x = 0; x <= 20 && CheckCredits(corp, x, ""); x++)
        choices.push({ id: x, label: "Spend " + x + "[c] for " + x + " power counters", button: x + "[c]" });
      if (corp.AI) corp.AI.preferred = { title: this.title, option: choices[Math.min(this._aiCounters(), choices.length - 1)] };
      DecisionPhase(corp, choices, function (params) {
        var x = params.id;
        if (x < 1) return;
        SpendCredits(corp, x, "", null, function () {
          AddCounters(this, "power", x);
        }, this);
      }, this.title, "Spend credits to place power counters", this);
    },
    text: "Dracō: place power counters",
  },
  modifyStrength: {
    Resolve: function (card) {
      return card == this ? Counters(this, "power") : 0;
    },
  },
  subroutines: [
    {
      text: "Trace[2]. If successful, give the Runner 1 tag and end the run.",
      Resolve: function () {
        Trace(2, function (successful) {
          if (successful) AddTags(1, function () { EndTheRun(); }, this);
        }, this);
      },
      visual: { y: 143, h: 32 },
    },
  ],
  //Counters to buy: one above the strongest installed killer or AI breaker (2 if none),
  //keeping 2 credits back. Read-only.
  _aiCounters: function () {
    var strongest = 0, found = false;
    InstalledCards(runner).forEach(function (card) {
      if (CheckSubType(card, "Icebreaker") && (CheckSubType(card, "Killer") || CheckSubType(card, "AI"))) {
        found = true;
        strongest = Math.max(strongest, Strength(card));
      }
    });
    var target = found ? Math.min(strongest + 1, 6) : 2;
    return Math.max(0, Math.min(target, AvailableCredits(corp) - 2));
  },
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["tag", "endTheRun"]]];
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
  elo: 1515,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 3,
  memoryCost: 1,
  accessAdditional: 0,
  responseOnRunSuccessful: {
    Resolve: function () {
      if (attackedServer == corp.HQ) AddCounters(this, "virus", 1);
    },
    automatic: true,
  },
  //The number is chosen as HQ is breached (after any purge or counter change during the run).
  responseOnBreach: {
    Enumerate: function (server) {
      if (server != corp.HQ || !CheckCounters(this, "virus", 2)) return [];
      return [{}];
    },
    Resolve: function () {
      var choices = [];
      for (var i = 0; i < Counters(this, "virus"); i++) {
        choices.push({ num: i, label: "Access " + i + " additional card" + (i == 1 ? "" : "s"), button: "" + i });
      }
      //**AI code: access as many as possible
      if (runner.AI) runner.AI.preferred = { title: this.title, option: choices[choices.length - 1] };
      DecisionPhase(runner, choices, function (params) {
        this.accessAdditional = params.num;
      }, this.title, "Access additional cards from HQ", this);
    },
    text: "Nerve Agent: access additional cards",
  },
  modifyBreachAccess: {
    Resolve: function () {
      return attackedServer == corp.HQ ? this.accessAdditional : 0;
    },
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.accessAdditional = 0;
    },
    automatic: true,
  },
  //A successful HQ run adds a counter before the breach, so up to the current count can be chosen.
  AIAdditionalAccess: function (server) {
    if (server != corp.HQ || ServerSuccessfulRunPrevented(server)) return 0;
    return Counters(this, "virus");
  },
};

//Joshua B. (2042)
// When your turn begins, you may gain [click]. If you do, take 1 tag when this turn ends.
cardSet[2042] = {
  title: "Joshua B.",
  imageFile: "02042.png",
  elo: 1629,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 1,
  tagAtTurnEnd: false,
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      if (runner.AI != null) return this.AIWouldTrigger() ? [{ use: true }] : [];
      return [
        { use: true, label: "Gain [click] (take 1 tag when this turn ends)", button: "Gain [click]" },
        { use: false, label: "Decline", button: "Decline" },
      ];
    },
    Resolve: function (params) {
      if (!params || !params.use) return;
      GainClicks(runner, 1);
      this.tagAtTurnEnd = true;
    },
    text: "Joshua B.: gain [click]",
  },
  //The delayed tag is a lasting effect: it applies even if Joshua B. leaves play this turn.
  //Not automatic: taking a tag opens tag response windows.
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      return this.tagAtTurnEnd ? [{}] : [];
    },
    Resolve: function () {
      if (!this.tagAtTurnEnd) return;
      this.tagAtTurnEnd = false;
      AddTags(1);
    },
    text: "Joshua B.: take 1 tag",
    availableWhenInactive: true,
  },
  //Take the click only while untagged with enough credits to clear the tag next turn.
  AIWouldTrigger: function () {
    return runner.tags < 1 && Credits(runner) >= 4;
  },
};

// cardSet[2043] = Emergency Shutdown - DUPLICATE: systemupdate2021.js has Emergency Shutdown (card 31016)

//Muresh Bodysuit (2044)
// [interrupt] → The first time each turn you would suffer meat damage, prevent 1 meat damage.
cardSet[2044] = {
  title: "Muresh Bodysuit",
  imageFile: "02044.png",
  elo: 1182,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 1,
  usedThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.usedThisTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () { this.usedThisTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  //Mandatory: fires on the first meat damage each turn.
  responsePreventableDamage: {
    Resolve: function () {
      if (this.usedThisTurn || intended.damageType != "meat" || intended.damage < 1) return;
      this.usedThisTurn = true;
      intended.damage--;
      Log("Muresh Bodysuit prevented 1 meat damage");
    },
    automatic: true,
  },
  AIMeatDamagePrevention: function () {
    return this.usedThisTurn ? 0 : 1;
  },
};

//Snitch (2045)
// Once per run, you may expose an unrezzed piece of ice when you approach it. You may then jack out.
cardSet[2045] = {
  title: "Snitch",
  imageFile: "02045.png",
  elo: 1526,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: [],
  installCost: 3,
  memoryCost: 1,
  usedThisRun: false,
  automaticOnRunBegins: {
    Resolve: function () { this.usedThisRun = false; },
  },
  responseOnApproachIce: {
    Enumerate: function (ice) {
      if (this.usedThisRun || !CheckRunning() || !ice || ice.rezzed) return [];
      //**AI code: nothing to learn from ice it already knows
      if (runner.AI != null) return ice.knownToRunner ? [] : [{ use: true }];
      return [
        { use: true, label: "Expose " + GetTitle(ice, true), button: "Expose" },
        { use: false, label: "Decline", button: "Decline" },
      ];
    },
    Resolve: function (params) {
      if (!params || !params.use) return;
      var ice = attackedServer.ice[approachIce];
      if (!ice || ice.rezzed) return;
      this.usedThisRun = true;
      Expose(ice, function () {
        this._offerJackOut();
      }, this);
    },
    text: "Snitch: expose approached ice",
  },
  _offerJackOut: function () {
    if (!CheckRunning() || !CheckJackOut()) return;
    var choices = [
      { id: 1, label: "Jack out", button: "Jack out" },
      { id: 0, label: "Continue the run", button: "Continue" },
    ];
    if (runner.AI) runner.AI.preferred = { title: this.title, option: choices[this._AIShouldJackOut() ? 0 : 1] };
    DecisionPhase(runner, choices, function (params) {
      if (params && params.id == 1 && CheckJackOut()) JackOut();
    }, this.title, "Jack out?", this);
  },
  //Jack out when the run, now planned with the exposed ice known, cannot be completed.
  _AIShouldJackOut: function () {
    if (!runner.AI || !attackedServer) return false;
    runner.AI.cachedBestPath = null;
    runner.AI._cachedOrBestRun(attackedServer, approachIce);
    return !runner.AI.cachedBestPath || !runner.AI.cachedComplete;
  },
};

//Chaos Theory: Wünderkind (2046)
// +1[mu]
cardSet[2046] = {
  title: "Chaos Theory: Wünderkind",
  imageFile: "02046.png",
  elo: 1566,
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["G-mod"],
  deckSize: 40,
  influenceLimit: 15,
  link: 0,
  memoryUnits: 1,
};

// cardSet[2047] = Test Run - DUPLICATE: systemupdate2021.js has Test Run (card 31028)

//Dinosaurus (2048)
// Dinosaurus can host a single non-AI icebreaker. The memory cost of the hosted icebreaker does not count against your memory limit.
// Hosted icebreaker has +2 strength.
// Limit 1 console per player.
cardSet[2048] = {
  title: "Dinosaurus",
  imageFile: "02048.png",
  elo: 1454,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 5,
  hostedCards: [],
  //Own memory pool, so the hosted breaker never counts against the general limit;
  //canHost limits it to a single card.
  hostingMU: 99,
  canHost: function (card) {
    if (!CheckCardType(card, ["program"]) || !CheckSubType(card, "Icebreaker") || CheckSubType(card, "AI")) return false;
    return !this.hostedCards || this.hostedCards.length == 0;
  },
  modifyStrength: {
    Resolve: function (card) {
      return card && card.host == this ? 2 : 0;
    },
  },
};

//Personal Workshop (2049)
// [click]: Host a program or piece of hardware from your grip on Personal Workshop and place power counters on it equal to its install cost.
// 1[c]: Remove 1 power counter from a hosted card.
// When your turn begins, remove 1 power counter from a hosted card.
// When there are no power counters left on a hosted card, install it, ignoring all costs.
cardSet[2049] = {
  title: "Personal Workshop",
  imageFile: "02049.png",
  elo: 1739,
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "resource",
  subTypes: ["Location"],
  installCost: 1,
  hostedCards: [],
  _hostableChoices: function () {
    return ChoicesArrayCards(runner.grip, function (card) {
      return CheckCardType(card, ["program", "hardware"]);
    });
  },
  _counterChoices: function () {
    return ChoicesArrayCards(this.hostedCards || [], function (card) {
      return CheckCounters(card, "power", 1);
    });
  },
  //Hosted cards are not installed until their counters run out.
  hostCard: function (card) {
    var counters = InstallCost(card, null, false);
    card.notInstalled = true;
    MoveCard(card, this.hostedCards);
    card.faceUp = true;
    Log(GetTitle(card, true) + " hosted on Personal Workshop");
    if (counters > 0) AddCounters(card, "power", counters);
    this.installIfEmpty(card);
  },
  _removeCounter: function (card) {
    if (!card || !(this.hostedCards || []).includes(card) || !CheckCounters(card, "power", 1)) return;
    RemoveCounters(card, "power", 1);
    this.installIfEmpty(card);
  },
  installIfEmpty: function (card) {
    if (!(this.hostedCards || []).includes(card) || CheckCounters(card, "power", 1)) return;
    card.notInstalled = false;
    Log(GetTitle(card, true) + " has no power counters left");
    Install(card, null, true, null, true);
  },
  _chooseCounterToRemove: function (callback) {
    var choices = this._counterChoices();
    if (!choices.length) return;
    if (choices.length == 1) {
      callback.call(this, choices[0].card);
      return;
    }
    //**AI code: finish the card closest to installing
    if (runner.AI) {
      var best = choices.slice().sort(function (a, b) {
        return Counters(a.card, "power") - Counters(b.card, "power");
      })[0];
      runner.AI.preferred = { title: this.title, option: best };
    }
    DecisionPhase(runner, choices, function (params) {
      callback.call(this, params.card);
    }, this.title, "Remove 1 power counter from a hosted card", this);
  },
  abilities: [
    {
      text: "Host a program or piece of hardware from your grip on Personal Workshop.",
      Enumerate: function () {
        if (!CheckActionClicks(runner, 1)) return [];
        var choices = this._hostableChoices();
        //**AI code: host only the chosen target
        if (runner.AI != null) {
          var target = this._AIHostTarget();
          choices = choices.filter(function (choice) { return choice.card == target; });
        }
        return choices;
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this.hostCard(params.card);
      },
    },
    {
      text: "1[c]: Remove 1 power counter from a hosted card.",
      alt: "personalworkshop_remove",
      Enumerate: function () {
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return this._counterChoices();
      },
      Resolve: function (params) {
        SpendCredits(runner, 1, "using", this, function () {
          this._removeCounter(params.card);
        }, this);
      },
    },
  ],
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      return this._counterChoices().length ? [{}] : [];
    },
    Resolve: function () {
      this._chooseCounterToRemove(this._removeCounter);
    },
    text: "Personal Workshop: remove 1 power counter",
  },
  //Most expensive program or hardware the Runner would install anyway (not wasteful, MU fits).
  _AIHostTarget: function () {
    var best = null;
    for (var i = 0; i < runner.grip.length; i++) {
      var card = runner.grip[i];
      if (!CheckCardType(card, ["program", "hardware"])) continue;
      if (InstallCost(card, null, false) < 2) continue;
      if (runner.AI && runner.AI._wastefulToInstall(card)) continue;
      if (!best || InstallCost(card, null, false) > InstallCost(best, null, false)) best = card;
    }
    return best;
  },
  AIEconomyTrigger: 1,
  AIWouldTrigger: function () {
    return !!this._AIHostTarget();
  },
  AIWorthKeeping: function () {
    return !!this._AIHostTarget();
  },
};

//Public Sympathy (2050)
// Your maximum hand size is increased by 2.
cardSet[2050] = {
  title: "Public Sympathy",
  imageFile: "02050.png",
  elo: 1303,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: [],
  installCost: 2,
  modifyMaxHandSize: {
    Resolve: function (player) {
      return player == runner ? 2 : 0;
    },
  },
  //Worth it when the grip already exceeds or reaches the unmodified limit.
  AIWorthKeeping: function () {
    return runner.grip.length > MaxHandSize(runner);
  },
};

// cardSet[2051] = Project Vitruvius - DUPLICATE: systemupdate2021.js has Project Vitruvius (card 31041)

//Viper (2052)
// ↳ Trace[3]. If successful, the Runner loses [click], if able.
// ↳ Trace[3]. If successful, end the run.
cardSet[2052] = {
  title: "Viper",
  imageFile: "02052.png",
  elo: 1533,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate", "Tracer"],
  rezCost: 3,
  strength: 4,
  subroutines: [
    {
      text: "Trace[3]. If successful, the Runner loses [click], if able.",
      Resolve: function () {
        Trace(3, function (successful) {
          if (successful) LoseClicks(runner, 1);
        }, this);
      },
      visual: { y: 74, h: 32 },
    },
    {
      text: "Trace[3]. If successful, end the run.",
      Resolve: function () {
        Trace(3, function (successful) {
          if (successful) EndTheRun();
        }, this);
      },
      visual: { y: 99, h: 16 },
    },
  ],
  //Traces are modelled as successful (conservative for the Runner; link and bids are not priced).
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseClicks"]], [["endTheRun"]]];
    return result;
  },
};

//Edge of World (2053)
// When the Runner accesses this asset while it is installed, you may pay 3[c]. If you do, do 1 core damage for each piece of ice protecting this server.
cardSet[2053] = {
  title: "Edge of World",
  imageFile: "02053.png",
  elo: 1420,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 0,
  _iceCount: function () {
    var server = GetServer(this);
    return server && server.ice ? server.ice.length : 0;
  },
  responseOnAccess: {
    Enumerate: function () {
      if (accessingCard != this || !CheckInstalled(this)) return [];
      //paying for 0 damage has no effect
      if (this._iceCount() < 1 || !CheckCredits(corp, 3, "using", this)) return [];
      return [{}];
    },
    Resolve: function () {
      var damage = this._iceCount();
      var choices = [
        { id: 0, label: "Pay 3[c]: do " + damage + " core damage", button: "Pay 3[c]: " + damage + " core damage" },
        { id: 1, label: "Continue", button: "Continue" },
      ];
      //**AI code: always fire
      if (corp.AI) corp.AI.preferred = { title: this.title, option: choices[0] };
      DecisionPhase(corp, choices, function (params) {
        if (params.id != 0 || !CheckCredits(corp, 3, "using", this)) return;
        SpendCredits(corp, 3, "using", this, function () {
          if (typeof RecordPublicPostureEvent === "function") RecordPublicPostureEvent("trapFired", this);
          Damage("core", this._iceCount(), true);
        }, this);
      }, this.title, this.title, this);
    },
  },
  RezUsability: function () {
    return false;
  }, //never rez (for usability rather than legality)
  AIPunishesAccess: function (server) {
    if (!server || !server.root || !server.root.includes(this)) return 0;
    if (Credits(corp) < 3) return 0;
    return server.ice.length;
  },
};

//Sunset (2054)
// Choose a server. Arrange the ice protecting that server in any order.
cardSet[2054] = {
  title: "Sunset",
  imageFile: "02054.png",
  elo: 1045,
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  _servers: function () {
    return [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers).filter(function (server) {
      return server.ice.length > 1;
    });
  },
  //AI order (innermost first): ascending strength, so the strongest ice is outermost.
  _AIOrder: function (server) {
    return server.ice.map(function (ice, index) { return { ice: ice, index: index }; })
      .sort(function (a, b) { return (Strength(a.ice) - Strength(b.ice)) || (a.index - b.index); })
      .map(function (entry) { return entry.ice; });
  },
  _AIImproves: function (server) {
    var order = this._AIOrder(server);
    return order.some(function (ice, i) { return ice != server.ice[i] && Strength(ice) != Strength(server.ice[i]); });
  },
  Enumerate: function () {
    var servers = this._servers();
    if (corp.AI != null) {
      var self = this;
      servers = servers.filter(function (server) { return self._AIImproves(server); }).slice(0, 1);
    }
    return servers.map(function (server) {
      return { server: server, label: server.serverName };
    });
  },
  //Reorder in place: index 0 is innermost.
  _applyOrder: function (server, innermostFirst) {
    for (var i = 0; i < innermostFirst.length; i++) server.ice[i] = innermostFirst[i];
    InvalidateActiveTriggerCandidateCache();
    Log("Ice protecting " + server.serverName + " arranged");
  },
  Resolve: function (params) {
    var server = params.server;
    if (!server || server.ice.length < 2) return;
    if (corp.AI != null) {
      this._applyOrder(server, this._AIOrder(server));
      return;
    }
    //Human: pick from outermost inwards.
    var outermostFirst = [];
    var remaining = server.ice.slice();
    var chooseNext = function () {
      if (remaining.length == 1) {
        outermostFirst.push(remaining[0]);
        this._applyOrder(server, outermostFirst.reverse());
        return;
      }
      DecisionPhase(corp, ChoicesArrayCards(remaining), function (choice) {
        outermostFirst.push(choice.card);
        remaining.splice(remaining.indexOf(choice.card), 1);
        chooseNext.call(this);
      }, this.title, outermostFirst.length ? "Choose the next piece of ice (outermost to innermost)" : "Choose the outermost piece of ice", this);
    };
    chooseNext.call(this);
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  AIPlayWhenCan: 1,
};

//Marked Accounts (2055)
// When your turn begins, take 1[c] from Marked Accounts, if able.
// [click]: Place 3[c] from the bank on Marked Accounts.
cardSet[2055] = {
  title: "Marked Accounts",
  imageFile: "02055.png",
  elo: 1373,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "asset",
  subTypes: ["Transaction"],
  rezCost: 0,
  trashCost: 5,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      if (CheckCounters(this, "credits", 1)) TakeCredits(corp, this, 1);
    },
    automatic: true,
  },
  abilities: [
    {
      text: "Place 3[c] from the bank on Marked Accounts.",
      Enumerate: function () {
        if (!CheckActionClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        LoadCredits(this, 3);
      },
    },
  ],
  AIEconomyCard: true,
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (!corp.AI._economyAssetWanted() && this.cardLocation != corp.archives.cards) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++)
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    return emptyProtectedRemotes.length;
  },
  AIRezWhenCan: function () { return true; },
  //Reload once the stored credits run low (one is taken per turn).
  AIEconomyTrigger: 1,
  AIWouldTrigger: function () {
    return Counters(this, "credits") < 2;
  },
};

// cardSet[2056] = Pop-up Window - DUPLICATE: systemupdate2021.js has Pop-up Window (card 31065)

//Woodcutter (2057)
// You can advance this ice if it is rezzed. It gains "↳ Do 1 net damage." for each hosted advancement counter.
cardSet[2057] = {
  title: "Woodcutter",
  imageFile: "02057.png",
  elo: 1005,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "AP"],
  rezCost: 4,
  strength: 2,
  //CheckAdvance accepts a function: only while rezzed.
  canBeAdvanced: function () {
    return !!this.rezzed;
  },
  //No printed subroutines; one gained per hosted advancement counter (no printed overlay position).
  subroutines: [],
  _gainedSubroutine: function () {
    return {
      text: "Do 1 net damage.",
      woodcutterGained: true,
      Resolve: function () {
        Damage("net", 1, true);
      },
    };
  },
  _syncSubroutines: function () {
    var wanted = Math.max(0, Counters(this, "advancement") || 0);
    var current = this.subroutines.filter(function (sr) { return sr.woodcutterGained; }).length;
    if (wanted == current) return;
    var kept = this.subroutines.filter(function (sr) { return sr.woodcutterGained; }).slice(0, wanted);
    while (kept.length < wanted) kept.push(this._gainedSubroutine());
    this.subroutines = kept;
  },
  automaticOnAnyChange: {
    Resolve: function () {
      this._syncSubroutines();
    },
    availableWhenInactive: true,
  },
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (ice == this) this._syncSubroutines();
    },
  },
  AIAdvancementLimit: function () {
    return this.rezzed ? 3 : 0;
  },
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    var n = Math.max(0, Counters(this, "advancement") || 0);
    result.sr = [];
    for (var i = 0; i < n; i++) result.sr.push([["netDamage"]]);
    return result;
  },
};

//Commercialization (2058)
// Choose a piece of ice. Gain 1[c] for each advancement token on that ice.
cardSet[2058] = {
  title: "Commercialization",
  imageFile: "02058.png",
  elo: 1430,
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 0,
  Enumerate: function () {
    var choices = ChoicesInstalledCards(corp, function (card) {
      return CheckCardType(card, ["ice"]);
    });
    //**AI code: the ice with the most advancement tokens
    if (corp.AI != null && choices.length > 1) {
      choices = [choices.slice().sort(function (a, b) {
        return Counters(b.card, "advancement") - Counters(a.card, "advancement");
      })[0]];
    }
    return choices;
  },
  Resolve: function (params) {
    GainCredits(corp, Counters(params.card, "advancement") || 0, "", this);
  },
  _AIBestGain: function () {
    var choices = this.Enumerate();
    return choices.length ? Counters(choices[0].card, "advancement") || 0 : 0;
  },
  AIEconomyPlay: 2,
  //Better than the basic click for credits.
  AIWouldPlay: function () {
    return this._AIBestGain() >= 2;
  },
};

//Private Contracts (2059)
// Place 14[c] from the bank on Private Contracts when it is rezzed. When there are no credits left on Private Contracts, trash it.
// [click]: Take 2[c] from Private Contracts.
cardSet[2059] = {
  title: "Private Contracts",
  imageFile: "02059.png",
  elo: 1323,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "asset",
  subTypes: ["Transaction"],
  rezCost: 3,
  trashCost: 5,
  automaticOnRez: {
    Resolve: function (card) {
      if (card == this) LoadCredits(this, 14);
    },
  },
  abilities: [
    {
      text: "Take 2[c] from Private Contracts.",
      Enumerate: function () {
        if (!CheckActionClicks(corp, 1)) return [];
        if (!CheckCounters(this, "credits", 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        TakeCredits(corp, this, 2);
        if (!CheckCounters(this, "credits", 1)) Trash(this, true);
      },
    },
  ],
  AIEconomyCard: true,
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (!corp.AI._economyAssetWanted() && this.cardLocation != corp.archives.cards) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++)
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    return emptyProtectedRemotes.length;
  },
  //Rez in the Corp's own action phase with a click left to start drawing on it.
  RezUsability: function () {
    return currentPhase.identifier.substring(0, 6) == "Corp 2" && CheckClicks(corp, 1);
  },
  AIRezWhenCan: function () {
    return playerTurn == corp && currentPhase.identifier.substring(0, 6) == "Corp 2" && CheckClicks(corp, 1);
  },
};

//Chimera (2060)
// When you rez Chimera, choose sentry, code gate, or barrier. Chimera gains that subtype until derezzed.
// When a turn ends, derez Chimera.
// ↳ End the run.
cardSet[2060] = {
  title: "Chimera",
  imageFile: "02060.png",
  elo: 1433,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Mythic"],
  rezCost: 2,
  strength: 0,
  chimeraSubtype: "",
  responseOnRez: {
    Enumerate: function (card) {
      if (card != this) return [];
      var choices = ["Sentry", "Code Gate", "Barrier"].map(function (subtype) {
        return { subtype: subtype, label: "Chimera gains " + subtype, button: subtype };
      });
      //**AI code: a subtype the Runner has no matching installed breaker for
      if (corp.AI != null) {
        var pick = this._AISubtype();
        choices = choices.filter(function (choice) { return choice.subtype == pick; });
      }
      return choices;
    },
    Resolve: function (params) {
      this.chimeraSubtype = params.subtype;
      Log("Chimera gains " + params.subtype);
    },
  },
  modifySubTypes: {
    Resolve: function (card) {
      if (card == this && this.rezzed && this.chimeraSubtype) return { add: [this.chimeraSubtype] };
      return {};
    },
    automatic: true,
  },
  automaticOnDerez: {
    Resolve: function (card) {
      if (card == this) this.chimeraSubtype = "";
    },
    availableWhenInactive: true,
  },
  _derezAtTurnEnd: function () {
    if (this.rezzed && CheckInstalled(this)) Derez(this);
    this.chimeraSubtype = "";
  },
  //Not automatic: Derez opens derez response windows.
  responseOnRunnerDiscardEnds: {
    Enumerate: function () { return this.rezzed ? [{}] : []; },
    Resolve: function () { this._derezAtTurnEnd(); },
    text: "Chimera: derez",
  },
  responseOnCorpDiscardEnds: {
    Enumerate: function () { return this.rezzed ? [{}] : []; },
    Resolve: function () { this._derezAtTurnEnd(); },
    text: "Chimera: derez",
  },
  subroutines: [
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 150, h: 16 },
    },
  ],
  _AISubtype: function () {
    var breakerFor = { "Sentry": "Killer", "Code Gate": "Decoder", "Barrier": "Fracter" };
    var installed = InstalledCards(runner);
    var order = ["Barrier", "Code Gate", "Sentry"];
    for (var i = 0; i < order.length; i++) {
      var matched = installed.some(function (card) {
        return CheckSubType(card, breakerFor[order[i]]) || (CheckSubType(card, "Icebreaker") && CheckSubType(card, "AI"));
      });
      if (!matched) return order[i];
    }
    return order[0];
  },
  //Unrezzed planning sees no subtype, so it is treated as unbreakable by type-specific breakers;
  //the rez choice picks a subtype with no matching installed breaker.
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]]];
    return result;
  },
};

//Disrupter (2061)
// [interrupt] → [trash]: Reduce the base trace strength of a trace to 0.
cardSet[2061] = {
  title: "Disrupter",
  imageFile: "02061.png",
  elo: 1088,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 1,
  trashAbility: true,
  //Unlike Flip Switch, Disrupter has no timing restriction: it can zero a
  //trace on either player's turn (e.g. SEA Source or a Tracer subroutine).
  responseOnTraceInitiated: {
    Enumerate: function (baseStrength) {
      if (!CheckInstalled(this) || !CheckTrash(this)) return [];
      if (traceStrength < 1) return [];
      //response windows require every listed trigger, so offer a decline
      var choices = [
        { use: true, label: "Trash Disrupter: reduce the base trace strength to 0" },
        { use: false, label: "Do not use Disrupter", button: "Continue" },
      ];
      if (runner.AI) return [this.AIWouldZeroTrace() ? choices[0] : choices[1]];
      return choices;
    },
    Resolve: function (params) {
      if (!params.use) return;
      Trash(this, false, function () {
        traceStrength = 0;
        Log("Base trace strength reduced to 0");
      }, this);
    },
    text: "Disrupter: you may reduce the base trace strength to 0",
  },
  //AI: zero a trace the Runner could not otherwise beat without paying.
  AIWouldZeroTrace: function () {
    return traceStrength > Link();
  },
};

//Force of Nature (2062)
// Interface → 2[c]: Break up to 2 code gate subroutines.
// 1[c]: +1 strength.
cardSet[2062] = {
  title: "Force of Nature",
  imageFile: "02062.png",
  elo: 1120,
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
  //Interface -> 2[c]: Break up to 2 code gate subroutines.
  //1[c]: +1 strength.
  abilities: [
    {
      text: "Break up to 2 code gate subroutines.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        //choose the first subroutine with the ability; the second is optional
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          2,
          "using",
          this,
          function () {
            Break(params.subroutine);
            var choices = ChoicesEncounteredSubroutines();
            if (choices.length < 1) return;
            for (var i = 0; i < choices.length; i++)
              choices[i].label = "(Force of Nature) Break another subroutine. -> " + choices[i].label;
            //"continue" alt lets the AI path executor stop after its planned breaks
            choices.push({ label: "Continue", button: "Continue", alt: "continue" });
            DecisionPhase(
              runner,
              choices,
              function (params) {
                if (typeof params.subroutine !== "undefined") Break(params.subroutine);
              },
              "Force of Nature",
              "Break up to 2 code gate subroutines",
              this
            );
          },
          this
        );
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return []; //interface usability, as Corroder
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            BoostStrength(this, 1);
          },
          this
        );
      },
    },
  ],
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    //cost to str, amt to str, cost to brk, amt to brk
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Code Gate"], 1, 1, 2, 2, creditsLeft)
    );
  },
};

// cardSet[2063] = Scrubber - DUPLICATE: systemupdate2021.js has Scrubber (card 31011)

//Doppelgänger (2064)
// +1[mu]
// Once per turn → When a successful run ends, you may run any server.
// Limit 1 console per player.
cardSet[2064] = {
  title: "Doppelgänger",
  imageFile: "02064.png",
  elo: 1449,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 3,
  memoryUnits: 1,
  //Once per turn -> When a successful run ends, you may run any server.
  usedThisTurn: false,
  runWasSuccessful: false,
  pendingRunServer: null,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      this.runWasSuccessful = true;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Enumerate: function () {
      if (this.usedThisTurn || !this.runWasSuccessful) return [];
      if (!CheckInstalled(this)) return [];
      var choices = [];
      var servers = ChoicesExistingServers();
      for (var i = 0; i < servers.length; i++) {
        choices.push({
          server: servers[i].server,
          label: "Run " + ServerName(servers[i].server),
          button: "Run " + ServerName(servers[i].server),
        });
      }
      choices.push({ server: null, label: "Do not run", button: "Continue" });
      if (runner.AI) {
        var target = this.AIDoppelgangerTarget();
        for (var j = 0; j < choices.length; j++) {
          if (choices[j].server == target) return [choices[j]];
        }
      }
      return choices;
    },
    Resolve: function (params) {
      this.runWasSuccessful = false;
      if (!params.server) return;
      this.usedThisTurn = true;
      this.pendingRunServer = params.server;
    },
    text: "Doppelgänger: you may run any server",
  },
  automaticOnRunEndCleanup: {
    Resolve: function (postCleanupCallbacks) {
      this.runWasSuccessful = false;
      if (!this.pendingRunServer) return;
      var nextServer = this.pendingRunServer;
      this.pendingRunServer = null;
      postCleanupCallbacks.push(function () {
        MakeRun(nextServer);
      });
    },
  },
  //AI: run the highest-potential server that has a complete affordable path,
  //or decline (null). The follow-up run needs no click.
  AIDoppelgangerTarget: function () {
    if (!runner.AI) return null;
    var best = null;
    var bestPotential = 0;
    var servers = ChoicesExistingServers();
    for (var i = 0; i < servers.length; i++) {
      var server = servers[i].server;
      var potential = runner.AI._getCachedPotential(server);
      if (potential <= bestPotential) continue;
      var path = runner.AI._calculateBestCompleteRun(server, 0, 0, 0, 0, null, server.ice.length - 1);
      if (!path || path.length < 1) continue;
      best = server;
      bestPotential = potential;
    }
    return best;
  },
};

//Crescentus (2065)
// [trash]: Derez 1 piece of ice you fully broke during this encounter.
cardSet[2065] = {
  title: "Crescentus",
  imageFile: "02065.png",
  elo: 1438,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 1,
  trashAbility: true,
  //Ice is fully broken when every subroutine on it is broken (CR 6.5.7b);
  //only the currently encountered ice can be fully broken "during this encounter".
  _fullyBrokenIce: function () {
    if (!CheckEncounter()) return null;
    var ice = GetApproachEncounterIce();
    if (!ice || !ice.rezzed) return null;
    if (!ice.subroutines || ice.subroutines.length < 1) return null;
    for (var i = 0; i < ice.subroutines.length; i++) {
      if (!ice.subroutines[i].broken) return null;
    }
    return ice;
  },
  abilities: [
    {
      text: "[trash]: Derez 1 piece of ice you fully broke during this encounter.",
      alt: "crescentus_derez",
      Enumerate: function () {
        if (!CheckInstalled(this) || !CheckTrash(this)) return [];
        if (!this._fullyBrokenIce()) return [];
        return [{}];
      },
      Resolve: function () {
        var ice = this._fullyBrokenIce();
        Trash(this, false, function () {
          if (ice && ice.rezzed) Derez(ice);
        }, this);
      },
    },
  ],
  //AI: derez a fully broken ice whose rez cost the Corp would have to pay again.
  AITriggerDuringEncounter: function () {
    var ice = this._fullyBrokenIce();
    if (!ice) return null;
    if (RezCost(ice) < 3) return null;
    return "crescentus_derez";
  },
};

//Deus X (2066)
// Interface → [trash]: Break any number of AP subroutines.
// [interrupt] → [trash]: Prevent any amount of net damage.
cardSet[2066] = {
  title: "Deus X",
  imageFile: "02066.png",
  elo: 1555,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker"],
  installCost: 3,
  memoryCost: 1,
  strength: 10,
  strengthBoost: 0,
  trashAbility: true,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  //"Any number": the first subroutine is chosen with the ability, then each
  //further one is optional ("continue" alt stops the AI path executor).
  BreakMore: function () {
    var choices = ChoicesEncounteredSubroutines();
    if (choices.length < 1) return;
    for (var i = 0; i < choices.length; i++)
      choices[i].label = "(Deus X) Break another subroutine. -> " + choices[i].label;
    choices.push({ label: "Continue", button: "Continue", alt: "continue" });
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (!params.subroutine) return;
        Break(params.subroutine);
        this.BreakMore();
      },
      "Deus X",
      "Break any number of AP subroutines",
      this
    );
  },
  //Interface -> [trash]: Break any number of AP subroutines.
  abilities: [
    {
      text: "[trash]: Break any number of AP subroutines.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "AP")) return [];
        if (!CheckStrength(this)) return [];
        if (!CheckTrash(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        Trash(this, false, function () {
          Break(params.subroutine);
          this.BreakMore();
        }, this);
      },
    },
  ],
  //[interrupt] -> [trash]: Prevent any amount of net damage.
  responsePreventableDamage: {
    Enumerate: function () {
      if (intended.damageType != "net" || intended.damage <= 0) return [];
      if (!CheckInstalled(this) || !CheckTrash(this)) return [];
      var choices = [
        { prevent: true, label: "Trash Deus X: prevent " + intended.damage + " net damage" },
        { prevent: false, label: "Do not use Deus X", button: "Continue" },
      ];
      if (runner.AI) return [this.AIWouldPreventNetDamage() ? choices[0] : choices[1]];
      return choices;
    },
    Resolve: function (params) {
      if (!params.prevent) return;
      Trash(this, false, function () {
        Log(intended.damage + " net damage prevented");
        intended.damage = 0;
      }, this);
    },
    text: "Deus X: you may prevent any amount of net damage",
  },
  //Run calculator: one use per run (the program is trashed), free, any number
  //of subroutines on AP ice regardless of other subtypes.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (!iceAI.subTypes.includes("AP")) return result;
    if (cardStrength < iceStrength) return result;
    if (rc.PersistentsUse(point, this)) return result;
    for (var x = 1; x <= iceAI.sr.length; x++) {
      var breaks = rc.SrBreak(this, iceAI, point, x);
      for (var i = 0; i < breaks.length; i++) {
        breaks[i].persistents = breaks[i].persistents.concat([{ use: this }]);
      }
      result = result.concat(breaks);
    }
    return result;
  },
  //AI: spend the one-shot prevention on lethal or multi-card net damage.
  AIWouldPreventNetDamage: function () {
    if (intended.damage >= runner.grip.length) return true;
    return intended.damage >= 2;
  },
};

//All-nighter (2067)
// [click], [trash]: Gain [click][click].
cardSet[2067] = {
  title: "All-nighter",
  imageFile: "02067.png",
  elo: 1504,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: [],
  installCost: 0,
  trashAbility: true,
  //Set at the start of each Runner turn while installed: installing and using
  //All-nighter in the same turn is click-neutral, so the AI waits a turn.
  readyToUse: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.readyToUse = true;
    },
    automatic: true,
  },
  abilities: [
    {
      text: "[click], [trash]: Gain [click][click].",
      alt: "allnighter_gain",
      Enumerate: function () {
        if (!CheckActionClicks(runner, 1)) return [];
        if (!CheckTrash(this)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        Trash(this, false, function () {
          GainClicks(runner, 2);
        }, this);
      },
    },
  ],
  AIEconomyInstall: function () {
    return 1; //cheap tempo for a later turn
  },
  //AI: use it at the first action-phase opportunity of a later turn (net +1 click).
  AITriggerInPaidWindow: function () {
    return this.readyToUse ? "allnighter_gain" : null;
  },
};

//Inside Man (2068)
// 2[recurring-c]
// Use these credits to install hardware.
cardSet[2068] = {
  title: "Inside Man",
  imageFile: "02068.png",
  elo: 1244,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 3,
  recurringCredits: 2,
  //Use these credits to install hardware.
  canUseCredits: function (doing, card) {
    if (doing != "installing" || !card) return false;
    return card.cardType == "hardware";
  },
  //AI: worth installing when hardware is waiting to be installed.
  AIEconomyInstall: function () {
    for (var i = 0; i < runner.grip.length; i++) {
      if (runner.grip[i].cardType == "hardware") return 2;
    }
    return 0;
  },
};

//Underworld Contact (2069)
// When your turn begins, gain 1[c] if you have at least 2[link].
cardSet[2069] = {
  title: "Underworld Contact",
  imageFile: "02069.png",
  elo: 1655,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  //When your turn begins, gain 1[c] if you have at least 2[link].
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      if (Link() < 2) return;
      GainCredits(runner, 1, "", this);
    },
    automatic: true,
  },
  //AI: income only exists with 2 or more link.
  AIEconomyInstall: function () {
    return Link() >= 2 ? 2 : 0;
  },
};

//Green Level Clearance (2070)
// Gain 3[c] and draw 1 card.
cardSet[2070] = {
  title: "Green Level Clearance",
  imageFile: "02070.png",
  elo: 1519,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 1,
  Resolve: function (params) {
    GainCredits(corp, 3, "", this);
    Draw(corp, 1);
  },
  //net +2[c] and a card: a modest main-phase economy play
  AIEconomyPlay: 2,
};

//Hourglass (2071)
// ↳ The Runner loses [click], if able.
// ↳ The Runner loses [click], if able.
// ↳ The Runner loses [click], if able.
cardSet[2071] = {
  title: "Hourglass",
  imageFile: "02071.png",
  elo: 1208,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 5,
  strength: 4,
  subroutines: [
    {
      text: "The Runner loses [click], if able.",
      Resolve: function () {
        LoseClicks(runner, 1);
      },
      visual: { y: 59, h: 16 },
    },
    {
      text: "The Runner loses [click], if able.",
      Resolve: function () {
        LoseClicks(runner, 1);
      },
      visual: { y: 79, h: 16 },
    },
    {
      text: "The Runner loses [click], if able.",
      Resolve: function () {
        LoseClicks(runner, 1);
      },
      visual: { y: 99, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseClicks"]], [["loseClicks"]], [["loseClicks"]]];
    return result;
  },
};

//Dedicated Server (2072)
// 2[recurring-c]
// Use these credits to rez ice.
cardSet[2072] = {
  title: "Dedicated Server",
  imageFile: "02072.png",
  elo: 1169,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Facility"],
  rezCost: 3,
  trashCost: 3,
  recurringCredits: 2,
  //Use these credits to rez ice.
  canUseCredits: function (doing, card) {
    if (doing != "rezzing" || !card) return false;
    return CheckCardType(card, ["ice"]);
  },
  _unrezzedIce: function () {
    return InstalledCards(corp).some(function (card) {
      return CheckCardType(card, ["ice"]) && !card.rezzed;
    });
  },
  //AI: an economy asset for decks with unrezzed ice to pay for, in its own remote.
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (!corp.AI._economyAssetWanted()) return -1;
    if (!this._unrezzedIce()) return -1;
    return emptyProtectedRemotes.length;
  },
  AIRezWhenCan: function () {
    return this._unrezzedIce();
  },
};

//Bullfrog (2073)
// ↳ You and the Runner secretly spend 0[c], 1[c] or 2[c]. Reveal spent credits. If you and the Runner spent a different number of credits and this ice is installed, move this ice to the outermost position protecting another server. (The run continues from this new position.)
cardSet[2073] = {
  title: "Bullfrog",
  imageFile: "02073.png",
  elo: 1279,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Deflector", "Psi"],
  rezCost: 3,
  strength: 4,
  _otherServers: function () {
    var here = GetServer(this);
    return ChoicesExistingServers().filter(function (choice) {
      return choice.server != here;
    });
  },
  //Move to the outermost position of another server; a run through this ice
  //continues from its new position (CR: the attacked server changes).
  MoveToServer: function (server) {
    var from = GetServer(this);
    if (!from || !server || server == from) return;
    var wasAttacked = attackedServer == from && from.ice[approachIce] == this;
    MoveCard(this, server.ice);
    Log(GetTitle(this, true) + " moved to the outermost position protecting " + ServerName(server));
    if (wasAttacked) {
      attackedServer = server;
      approachIce = server.ice.length - 1;
      Log("The run continues against " + ServerName(server));
      if (runner.AI != null) runner.AI.cachedBestPath = null;
    }
  },
  subroutines: [
    {
      text: "You and the Runner secretly spend 0[c], 1[c] or 2[c]. Reveal spent credits. If you and the Runner spent a different number of credits and this ice is installed, move this ice to the outermost position protecting another server.",
      Resolve: function () {
        PsiGame(function (different) {
          if (!different || !CheckInstalled(this)) return;
          var choices = this._otherServers();
          if (choices.length < 1) return;
          if (corp.AI) {
            var best = this.AIBullfrogDestination();
            var picked = choices.find(function (c) { return c.server == best; });
            if (picked) choices = [picked];
          }
          DecisionPhase(
            corp,
            choices,
            function (params) {
              if (params && params.server && CheckInstalled(this)) this.MoveToServer(params.server);
            },
            "Bullfrog",
            "Choose another server to move Bullfrog to",
            this
          );
        }, this);
      },
      visual: { y: 104, h: 64 },
    },
  ],
  //The psi game cannot be priced; the redirect is treated as a moderate threat.
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["misc_moderate"]]];
    return result;
  },
  //AI: send the run to the other server with the most ice, avoiding remotes
  //that hold an agenda (Corp-known).
  AIBullfrogDestination: function () {
    var best = null;
    var bestScore = -Infinity;
    var choices = this._otherServers();
    for (var i = 0; i < choices.length; i++) {
      var server = choices[i].server;
      var hasAgenda = (server.root || []).some(function (card) {
        return CheckCardType(card, ["agenda"]);
      });
      var score = server.ice.length * 2 - (hasAgenda ? 10 : 0);
      for (var j = 0; j < server.ice.length; j++) if (server.ice[j].rezzed) score++;
      if (score > bestScore) {
        bestScore = score;
        best = server;
      }
    }
    return best;
  },
};

//Uroboros (2074)
// ↳ Trace[4]. If successful, the Runner cannot make another run this turn.
// ↳ Trace[4]. If successful, end the run.
cardSet[2074] = {
  title: "Uroboros",
  imageFile: "02074.png",
  elo: 1342,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer"],
  rezCost: 6,
  strength: 4,
  subroutines: [
    {
      text: "Trace[4]. If successful, the Runner cannot make another run this turn.",
      Resolve: function () {
        Trace(4, function (successful) {
          if (!successful) return;
          Log("Uroboros: the Runner cannot make another run this turn");
          //A lingering effect survives Uroboros being derezzed or trashed; it
          //ends when the next turn begins (whichever player's turn that is).
          var effect = {
            title: "Uroboros",
            modifyCannot: {
              Resolve: function (id) {
                return id == "run";
              },
            },
            responseOnCorpTurnBegins: {
              Resolve: function () {
                RemoveLingeringEffect(effect);
              },
              automatic: true,
            },
            responseOnRunnerTurnBegins: {
              Resolve: function () {
                RemoveLingeringEffect(effect);
              },
              automatic: true,
            },
          };
          AddLingeringEffect(effect);
        }, this);
      },
      visual: { y: 104, h: 32 },
    },
    {
      text: "Trace[4]. If successful, end the run.",
      Resolve: function () {
        Trace(4, function (successful) {
          if (successful) EndTheRun();
        }, this);
      },
      visual: { y: 140, h: 32 },
    },
  ],
  //Traces are modelled as successful (conservative for the Runner; link and bids are not priced).
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["misc_moderate"]], [["endTheRun"]]];
    return result;
  },
};

//Net Police (2075)
// X[recurring-c]
// Use these credits during traces. X is the number of links the Runner has.
cardSet[2075] = {
  title: "Net Police",
  imageFile: "02075.png",
  elo: 1048,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "asset",
  subTypes: [],
  rezCost: 1,
  trashCost: 1,
  //X[recurring-c], X = the Runner's link, read by the shared refills through RecurringCredits().
  recurringCredits: 0,
  variableRecurringCredits: function () {
    return Link();
  },
  //Use these credits during traces.
  canUseCredits: function (doing, card) {
    return doing == "trace";
  },
  //AI: only worth a slot against a Runner with link, in its own remote.
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (Link() < 1) return -1;
    if (!corp.AI._economyAssetWanted()) return -1;
    return emptyProtectedRemotes.length;
  },
  AIRezWhenCan: function () {
    return Link() >= 1;
  },
};

//Weyland Consortium: Because We Built It (2076)
// 1[recurring-c]
// Use this credit to advance ice.
cardSet[2076] = {
  title: "Weyland Consortium: Because We Built It",
  imageFile: "02076.png",
  elo: 1142,
  player: corp,
  faction: "Weyland Consortium",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  recurringCredits: 1,
  //Use this credit to advance ice.
  canUseCredits: function (doing, card) {
    if (doing != "advancing" || !card) return false;
    return CheckCardType(card, ["ice"]);
  },
};

//Government Contracts (2077)
// [click], [click]: Gain 4[c].
cardSet[2077] = {
  title: "Government Contracts",
  imageFile: "02077.png",
  elo: 1301,
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 5,
  agendaPoints: 3,
  //Usable while scored. The label's "Gain 4[c]" is matched by the Corp AI's
  //click-economy ability search (_clickAbilityLikeAvailable).
  abilities: [
    {
      text: "[click], [click]: Gain 4[c].",
      Enumerate: function () {
        if (this.cardLocation !== corp.scoreArea) return [];
        if (!CheckActionClicks(corp, 2)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 2);
        GainCredits(corp, 4, "", this);
      },
    },
  ],
};

//Tyrant (2078)
// You can advance this ice if it is rezzed. It gains "↳ End the run." for each hosted advancement counter.
cardSet[2078] = {
  title: "Tyrant",
  imageFile: "02078.png",
  elo: 967,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 7,
  strength: 4,
  advancement: 0,
  //You can advance this ice if it is rezzed (CheckAdvance accepts a function).
  canBeAdvanced: function () {
    return !!this.rezzed;
  },
  //It gains "End the run." for each hosted advancement counter. Gained
  //subroutine objects are kept so a count change never mutates shared arrays.
  subroutines: [],
  _gained: [],
  _syncSubroutines: function () {
    var n = Counters(this, "advancement");
    if (this.subroutines.length == n) return;
    var gained = this._gained.slice();
    while (gained.length < n) {
      gained.push({
        text: "End the run.",
        Resolve: function () {
          EndTheRun();
        },
        visual: { y: 104 + 20 * (gained.length % 5), h: 16 },
      });
    }
    this._gained = gained;
    this.subroutines = gained.slice(0, n);
  },
  automaticOnAnyChange: {
    Resolve: function () {
      this._syncSubroutines();
    },
    availableWhenInactive: true,
  },
  automaticOnAdvance: {
    Resolve: function (card) {
      if (card == this) this._syncSubroutines();
    },
  },
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (ice == this) this._syncSubroutines();
    },
  },
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [];
    var n = Counters(this, "advancement");
    for (var i = 0; i < n; i++) result.sr.push([["endTheRun"]]);
    return result;
  },
  //AI: give a rezzed Tyrant its first subroutine; add more while its server
  //needs protection and no other ice is affordable (Ice Wall policy).
  AIAdvancementLimit: function () {
    if (!this.rezzed) return 0;
    var counters = Counters(this, "advancement");
    if (counters < 1) return 1;
    var thisServer = GetServer(this);
    if (corp.AI._affordableIce(thisServer) < 1 && corp.AI._serverToProtect() == thisServer) return counters + 1;
    return 0;
  },
};

//Oversight AI (2079)
// Rez a piece of ice, ignoring all costs, and install Oversight AI on that ice as a hosted condition counter with the text "Trash host ice if all its subroutines are broken during a single encounter."
cardSet[2079] = {
  title: "Oversight AI",
  imageFile: "02079.png",
  elo: 1585,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "operation",
  subTypes: ["Condition"],
  playCost: 1,
  _targets: function () {
    return InstalledCards(corp).filter(function (card) {
      return CheckCardType(card, ["ice"]) && !card.rezzed && !card.host;
    });
  },
  Enumerate: function () {
    var choices = ChoicesArrayCards(this._targets());
    if (corp.AI) {
      var best = this.AIOversightTarget();
      choices = choices.filter(function (c) { return c.card == best; });
    }
    return choices;
  },
  //Rez a piece of ice, ignoring all costs, then host this operation on it as
  //a condition counter (faceUp, not trashed by the play cleanup).
  Resolve: function (params) {
    var ice = params.card;
    if (!ice) return;
    Rez(ice, true, function () {
      if (!CheckInstalled(ice)) return;
      if (!ice.hostedCards) ice.hostedCards = [];
      MoveCard(this, ice.hostedCards);
      this.host = ice;
      this.faceUp = true;
      Log("Oversight AI hosted on " + GetTitle(ice, true) + " as a condition counter");
    }, this);
  },
  //"Trash host ice if all its subroutines are broken during a single encounter."
  //Breaks only happen during an encounter and reset when it ends.
  automaticOnSubroutineBroken: {
    Resolve: function (subroutine) {
      var host = this.host;
      if (!host || !host.hostedCards || !host.hostedCards.includes(this)) return;
      if (!CheckEncounter() || GetApproachEncounterIce() != host) return;
      if (!host.subroutines || host.subroutines.length < 1) return;
      for (var i = 0; i < host.subroutines.length; i++) {
        if (!host.subroutines[i].broken) return;
      }
      Log("Oversight AI: every subroutine on " + GetTitle(host, true) + " was broken");
      Trash(host, true);
    },
    availableWhenInactive: true,
  },
  //AI: the free rez is worth a card when it saves at least 4[c].
  AIOversightTarget: function () {
    var best = null;
    var targets = this._targets();
    for (var i = 0; i < targets.length; i++) {
      if (!best || RezCost(targets[i]) > RezCost(best)) best = targets[i];
    }
    return best;
  },
  AIWouldPlay: function () {
    var best = this.AIOversightTarget();
    return !!best && RezCost(best) >= 4;
  },
};

// cardSet[2080] = False Lead - DUPLICATE: uprising.js has False Lead (card 26129)

//Surge (2081)
// Play only if you placed at least 1 virus counter on a program this turn.
// Place 2 virus counters on that program.
cardSet[2081] = {
  title: "Surge",
  imageFile: "02081.png",
  elo: 1443,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  //AddCounters records installed Runner programs that received virus counters this turn.
  //Limitation: the record does not distinguish who placed the counters (in practice only Runner effects do).
  Enumerate: function () {
    return ChoicesArrayCards(TurnEventCards("runnerProgramVirusCounters"), function (card) {
      return CheckInstalled(card) && CheckCardType(card, ["program"]);
    });
  },
  Resolve: function (params) {
    AddCounters(params.card, "virus", 2);
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //only useful with a virus program that gains counters
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Virus")) return true;
    }
    for (var j = 0; j < runner.grip.length; j++) {
      if (CheckCardType(runner.grip[j], ["program"]) && CheckSubType(runner.grip[j], "Virus")) return true;
    }
    return false;
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  //prefer the program that already has the most virus counters (usually the one being built up)
  AIPreferredPlayChoice: function (choices) {
    var best = 0;
    for (var i = 1; i < choices.length; i++) {
      if (Counters(choices[i].card, "virus") > Counters(choices[best].card, "virus")) best = i;
    }
    return best;
  },
  AIPlayWhenCan: 2, //window closes at end of turn
};

// cardSet[2082] = Xanadu - DUPLICATE: systemupdate2021.js has Xanadu (card 31012)

//Andromeda: Dispossessed Ristie (2083)
// You draw a starting hand of 9 cards.
cardSet[2083] = {
  title: "Andromeda: Dispossessed Ristie",
  imageFile: "02083.png",
  elo: 2063,
  player: runner,
  faction: "Criminal",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
  //StartingHandSize (init.js) reads this for the opening draw and mulligan.
  startingHandSize: 9,
};

// cardSet[2084] = Networking - DUPLICATE: systemupdate2021.js has Networking (card 31020)

//HQ Interface (2085)
// Whenever you breach HQ, access 1 additional card.
cardSet[2085] = {
  title: "HQ Interface",
  imageFile: "02085.png",
  elo: 1520,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 4,
  modifyBreachAccess: {
    //NOTE: modifyBreachAccess may be called multiple times (e.g. when determining new candidates)
    Resolve: function () {
      if (attackedServer == corp.HQ) return 1;
      return 0;
    },
  },
  //passive bonus to HQ accesses (assumes the card is or will be active)
  AIAdditionalAccess: function (server) {
    if (server == corp.HQ) return 1;
    return 0;
  },
  //public, out-of-run description for Corp central-security planning
  AICentralPressure: function (server) {
    if (server == corp.HQ) return { additionalAccess: 1 };
    return {};
  },
  AIWastefulToInstall: function () {
    //effects stack, but a second copy is rarely worth 4 credits more than other cards
    for (var i = 0; i < runner.rig.hardware.length; i++) {
      if (runner.rig.hardware[i].title == this.title) return true;
    }
    return false;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //keep if HQ can be run
    return runner.AI._getCachedCost(corp.HQ) != Infinity;
  },
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (server != corp.HQ) return 0;
    if (!runner.AI.cardsWorthKeeping.includes(this)) return 0;
    return 1; //the consumer checks the run remains affordable after installing
  },
};

//Pheromones (2086)
// X[recurring-c]
// Use these credits during runs on HQ. X is the number of virus counters on Pheromones.
// Whenever you make a successful run on HQ, place 1 virus counter on Pheromones.
cardSet[2086] = {
  title: "Pheromones",
  imageFile: "02086.png",
  elo: 1370,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 2,
  memoryCost: 1,
  //X recurring credits: RecurringCredits (utility.js) refills to the current virus counters
  recurringCredits: 0,
  variableRecurringCredits: function () {
    return Counters(this, "virus");
  },
  canUseCredits: function (doing, card) {
    //only during runs on HQ
    return attackedServer == corp.HQ;
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (attackedServer == corp.HQ) AddCounters(this, "virus", 1);
    },
    automatic: true,
  },
  //hosted credits pay for anything during HQ runs
  AIRunPoolCreditOffset: function (server, runEventCardToUse) {
    if (server != corp.HQ) return 0;
    return this.credits || 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //grows with HQ runs, so keep if HQ can be run
    return runner.AI._getCachedCost(corp.HQ) != Infinity;
  },
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (server != corp.HQ) return 0;
    if (!runner.AI.cardsWorthKeeping.includes(this)) return 0;
    return 1; //a counter from this run starts the credits
  },
  AIWastefulToInstall: function () {
    return runner.rig.programs.some(card => card.title == this.title);
  },
};

//Quality Time (2087)
// Draw 5 cards.
cardSet[2087] = {
  title: "Quality Time",
  imageFile: "02087.png",
  elo: 1599,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 3,
  Resolve: function (params) {
    Draw(runner, 5);
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //keep if need card draw
    return runner.grip.length < 4;
  },
  AIWouldPlay: function () {
    //prevent wild overdraw (5 cards in, this card out) and keep a little money afterwards
    if (runner.AI._currentOverDraw() + 4 > runner.AI._maxOverDraw()) return false;
    return AvailableCredits(runner, "playing", this) >= PlayCost(this) + 1;
  },
  AIPlayToDraw: 2, //strong draw, but costs credits
};

//Replicator (2088)
// Whenever you install a piece of hardware (including Replicator), you may search your stack for another copy of that hardware, reveal it, and add it your grip. Shuffle your stack.
cardSet[2088] = {
  title: "Replicator",
  imageFile: "02088.png",
  elo: 1382,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 2,
  _replicatorCopyInStack: function (card) {
    for (var i = runner.stack.length - 1; i >= 0; i--) {
      if (runner.stack[i] != card && runner.stack[i].title == card.title) return runner.stack[i];
    }
    return null;
  },
  responseOnInstall: {
    Enumerate: function (card) {
      if (!card || card.player != runner || !CheckCardType(card, ["hardware"])) return [];
      //searching without a copy only shuffles, so the option is offered only when a copy exists
      if (!this._replicatorCopyInStack(card)) return [];
      var choices = [
        { id: 1, label: "Search stack for another " + GetTitle(card), button: "Search", replicatorTarget: card },
        { id: 0, label: "Do not search", button: "Continue" },
      ];
      //**AI code: always take the copy unless the grip is already over-full
      if (runner.AI != null) {
        if (runner.grip.length >= MaxHandSize(runner)) return [choices[1]];
        return [choices[0]];
      }
      return choices;
    },
    Resolve: function (params) {
      if (!params || params.id !== 1) return;
      var copy = this._replicatorCopyInStack(params.replicatorTarget);
      if (!copy) {
        Shuffle(runner.stack);
        return;
      }
      MoveCard(copy, runner.grip);
      Reveal(copy, function () {
        Shuffle(runner.stack);
        Log("Runner added " + GetTitle(copy) + " to grip and shuffled the stack");
      }, this);
    },
    text: "Replicator: search stack for another copy",
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //worth it when hardware in grip or rig has a copy left in the stack
    var hardware = runner.rig.hardware.concat(runner.grip);
    for (var i = 0; i < hardware.length; i++) {
      if (hardware[i] != this && CheckCardType(hardware[i], ["hardware"]) && this._replicatorCopyInStack(hardware[i])) return true;
    }
    return false;
  },
};

//Creeper (2089)
// If you have at least 2[link], the memory cost of this program is 0[mu], even if it is not installed.
// Interface → 2[c]: Break 1 sentry subroutine.
// 1[c]: +1 strength.
cardSet[2089] = {
  title: "Creeper",
  imageFile: "02089.png",
  elo: 1051,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer", "Cloud"],
  installCost: 5,
  memoryCost: 1,
  //MemoryCost (utility.js) reads this for install legality and MU totals, installed or not.
  //Limitation: losing link after install does not force a program trash for exceeded MU.
  variableMemoryCost: function () {
    if (Link() >= 2) return 0;
    return this.memoryCost;
  },
  strength: 2,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 sentry subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(runner, 2, "using", this, function () {
          Break(params.subroutine);
        }, this);
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return []; //interface usability, as other breakers
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
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
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    result = result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Sentry"],
        1, 1, 2, 1, creditsLeft)
    ); //cost to str, amt to str, cost to brk, amt to brk
    return result;
  },
  AIPreferredInstallChoice: function (choices) {
    //don't install if this is last click
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Kraken (2090)
// Play only if you stole an agenda this turn.
// Choose a server. The Corp trashes 1 piece of ice protecting that server.
cardSet[2090] = {
  title: "Kraken",
  imageFile: "02090.png",
  elo: 1305,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "event",
  subTypes: [],
  playCost: 3,
  //Steal records the "runnerAgendaStolen" turn event.
  Enumerate: function () {
    if (TurnEventCount("runnerAgendaStolen") < 1) return [];
    var choices = [];
    var servers = ChoicesExistingServers();
    for (var i = 0; i < servers.length; i++) {
      if (servers[i].server.ice.length > 0) choices.push(servers[i]);
    }
    return choices;
  },
  Resolve: function (params) {
    var server = params.server;
    if (!server || server.ice.length < 1) return;
    var choices = ChoicesArrayCards(server.ice);
    DecisionPhase(
      corp,
      choices,
      function (choice) {
        Log("Corp trashes " + GetTitle(choice.card, true) + " for Kraken");
        Trash(choice.card, true, null, null, null, corp);
      },
      "Kraken",
      "Choose ice to trash",
      this
    );
    //**AI code: the Corp keeps its most expensive ice and trashes the cheapest (outermost on ties)
    if (corp.AI != null) {
      var choice = choices[0];
      for (var i = 1; i < choices.length; i++) {
        if (choices[i].card.rezCost <= choice.card.rezCost) choice = choices[i];
      }
      corp.AI.preferred = { title: "Kraken", option: choice };
    }
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  //prefer to open the most valuable server: fewest ice, R&D/HQ or a loaded remote
  AIPreferredPlayChoice: function (choices) {
    var best = -1;
    var bestScore = -Infinity;
    for (var i = 0; i < choices.length; i++) {
      var server = choices[i].server;
      var score = 2 / server.ice.length;
      if (server == corp.RnD) score += 3;
      else if (server == corp.HQ) score += 2;
      else if (server == corp.archives) score += 0;
      else if (server.root.length > 0) score += 2;
      else score += 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  },
  AIPlayWhenCan: 2, //window closes at end of turn
};

//Kati Jones (2091)
// You cannot use this resource more than once per turn.
// [click]: Place 3[c] on this resource.
// [click]: Take all credits from this resource.
cardSet[2091] = {
  title: "Kati Jones",
  imageFile: "02091.png",
  elo: 1652,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  unique: true,
  usedThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  abilities: [
    {
      text: "[click]: Place 3[c] on this resource.",
      alt: "place",
      Enumerate: function () {
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        return [{}];
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this.usedThisTurn = true;
        AddCounters(this, "credits", 3);
      },
    },
    {
      text: "[click]: Take all credits from this resource.",
      alt: "take",
      Enumerate: function () {
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        if (!CheckCounters(this, "credits", 1)) return [];
        return [{}];
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this.usedThisTurn = true;
        var amount = Counters(this, "credits");
        RemoveCounters(this, "credits", amount);
        GainCredits(runner, amount, "", this);
      },
    },
  ],
  //take once the stash is large or money is needed now; otherwise keep building it
  AIEconomyTriggerAlt: function () {
    var hosted = Counters(this, "credits");
    if (hosted >= 9) return "take";
    if (hosted >= 3 && Credits(runner) < 3) return "take";
    return "place";
  },
  AIWouldTrigger: function () {
    return !this.usedThisTurn;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    return true;
  },
  AIWastefulToInstall: function () {
    return this.unique && runner.rig.resources.some(card => card.title == this.title);
  },
  AIEconomyInstall: function () {
    return 2; //good long-term economy
  },
  AIEconomyTrigger: 2, //priority 2 (moderate)
};

//Eve Campaign (2092)
// Place 16[c] from the bank on Eve Campaign when it is rezzed. When there are no credits left on Eve Campaign, trash it.
// When your turn begins, take 2[c] from Eve Campaign.
cardSet[2092] = {
  title: "Eve Campaign",
  imageFile: "02092.png",
  elo: 1486,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 5,
  trashCost: 5,
  automaticOnRez: {
    Resolve: function (card) {
      if (card == this) LoadCredits(this, 16);
    },
  },
  responseOnCorpTurnBegins: {
    Enumerate: function () {
      if (!this.rezzed || !CheckCounters(this, "credits", 1)) return [];
      return [{}];
    },
    Resolve: function (params) {
      TakeCredits(corp, this, 2);
      //When there are no credits left, trash it.
      if (!CheckCounters(this, "credits", 1)) Trash(this, true);
    },
  },
  AIEconomyCard: true,
  AIAvoidInstallingOverThis: true,
  //install in a new or non-scoring remote while the rez cost is within reach
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (Credits(corp) < 3) return -1;
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
  //rez at the end of the Runner's turn so the first payout comes straight away
  AIRezWhenCan: function () {
    return currentPhase.identifier == "Runner 2.2";
  },
};

//Rework (2093)
// Shuffle 1 card from HQ into R&D.
cardSet[2093] = {
  title: "Rework",
  imageFile: "02093.png",
  elo: 1028,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  Enumerate: function () {
    //Rework itself is not in HQ while resolving, so another card is needed
    for (var i = 0; i < corp.HQ.cards.length; i++) {
      if (corp.HQ.cards[i] != this) return [{}];
    }
    return [];
  },
  Resolve: function (params) {
    var choices = ChoicesArrayCards(corp.HQ.cards);
    if (choices.length < 1) return;
    //**AI code: hide the most valuable agenda
    if (corp.AI != null) {
      var choice = choices[0];
      for (var i = 0; i < choices.length; i++) {
        var card = choices[i].card;
        if (!CheckCardType(card, ["agenda"])) continue;
        if (!CheckCardType(choice.card, ["agenda"]) || card.agendaPoints > choice.card.agendaPoints) choice = choices[i];
      }
      corp.AI.preferred = { title: "Rework", option: choice };
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        MoveCard(params.card, corp.RnD.cards);
        Shuffle(corp.RnD.cards);
        Log("Corp shuffled 1 card from HQ into R&D");
      },
      "Rework",
      "Choose a card to shuffle into R&D",
      this
    );
  },
  //an agenda would otherwise be left in HQ: on the last click, or with several agendas in hand
  AIWouldPlay: function () {
    var agendas = corp.AI._agendasInHand();
    if (agendas < 1) return false;
    return agendas >= 2 || corp.clickTracker == 1;
  },
  AIPlayWhenCan: 1,
};

//Whirlpool (2094)
// ↳ The Runner cannot jack out for the remainder of this run. Trash Whirlpool.
cardSet[2094] = {
  title: "Whirlpool",
  imageFile: "02094.png",
  elo: 1242,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Trap"],
  rezCost: 0,
  strength: 1,
  subroutines: [
    {
      text: "The Runner cannot jack out for the remainder of this run. Trash Whirlpool.",
      Resolve: function () {
        Log("The Runner cannot jack out for the remainder of this run");
        //CheckJackOut reads modifyCannot("jackOut"); the lingering effect outlives Whirlpool
        AddLingeringEffect({
          title: "Whirlpool",
          modifyCannot: {
            Resolve: function (id, card) {
              return id == "jackOut";
            },
          },
          responseOnRunEnds: {
            Resolve: function () {
              RemoveLingeringEffect(this);
            },
            automatic: true,
          },
        });
        Trash(this, true);
      },
      visual: { y: 57, h: 32 },
    },
  ],
  //no direct cost to the Runner; the run calculator does not plan jack-outs
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[[]]];
    return result;
  },
};

// cardSet[2095] = Hokusai Grid - DUPLICATE: systemupdate2021.js has Hokusai Grid (card 31059)

//Data Hound (2096)
// ↳ Trace[2]. If successful, look at the top X cards of the stack, where X is equal to the amount by which your trace strength exceeded the Runner's link strength. Trash 1 of those cards and arrange the rest in any order.
cardSet[2096] = {
  title: "Data Hound",
  imageFile: "02096.png",
  elo: 1246,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer", "Observer"],
  rezCost: 1,
  strength: 2,
  _applyStackOrder: function (bottomToTop) {
    for (var i = 0; i < bottomToTop.length; i++) {
      bottomToTop[i].faceUp = false;
      MoveCard(bottomToTop[i], runner.stack);
    }
    if (bottomToTop.length > 0) Log(bottomToTop.length + " cards on top of the stack were arranged");
  },
  //arrange: the AI puts its least-wanted (lowest ELO) cards for the Runner on top
  _arrangeStack: function (cards) {
    if (cards.length < 2 || corp.AI != null) {
      cards.sort(function (a, b) {
        return (b.elo || 1500) - (a.elo || 1500);
      });
      this._applyStackOrder(cards);
      return;
    }
    var ordered = [];
    var remaining = cards.slice();
    var chooseNext = function () {
      if (remaining.length == 1) {
        ordered.push(remaining[0]);
        this._applyStackOrder(ordered);
        return;
      }
      var decision = DecisionPhase(
        corp,
        ChoicesArrayCards(remaining),
        function (params) {
          if (!params || !params.card || !remaining.includes(params.card)) return;
          ordered.push(params.card);
          remaining.splice(remaining.indexOf(params.card), 1);
          chooseNext.call(this);
        },
        this.title,
        "Choose the next card from the bottom of the arranged group",
        this
      );
      decision.privateLook = {player: corp, cards: remaining.slice()};
    };
    chooseNext.call(this);
  },
  _lookAndTrash: function (x) {
    var count = Math.min(x, runner.stack.length);
    if (count < 1) return;
    var cards = runner.stack.slice(runner.stack.length - count);
    var choices = ChoicesArrayCards(cards);
    //**AI code: trash the highest-ranked card
    if (corp.AI != null) {
      var choice = choices[0];
      for (var j = 1; j < choices.length; j++) {
        if ((choices[j].card.elo || 1500) > (choice.card.elo || 1500)) choice = choices[j];
      }
      corp.AI.preferred = { title: "Data Hound", option: choice };
    }
    var decision = DecisionPhase(
      corp,
      choices,
      function (params) {
        params.card.faceUp = true;
        cards.splice(cards.indexOf(params.card), 1);
        Trash(params.card, true, function () {
          this._arrangeStack(cards);
        }, this);
      },
      "Data Hound",
      "Trash 1 of the top " + count + " cards of the stack",
      this
    );
    decision.privateLook = {player: corp, cards: cards.slice()};
  },
  subroutines: [
    {
      text: "Trace[2]. If successful, look at the top X cards of the stack (X is the amount your trace strength exceeded the Runner's link strength). Trash 1 of those cards and arrange the rest in any order.",
      Resolve: function () {
        Trace(2, function (successful) {
          if (!successful) return;
          this._lookAndTrash(traceStrength - linkStrength);
        }, this);
        //**AI code: each credit over the link is one more card seen
        if (corp.AI != null) corp.AI._preferTraceToBeat(2, 3);
      },
      visual: { y: 57, h: 64 },
    },
  ],
  //Stack disruption: modelled as a minor cost (no effect on the run itself)
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["misc_minor"]]];
    return result;
  },
};

//Bernice Mai (2097)
// Whenever there is a successful run on this server, Trace[5]. If successful, give the Runner 1 tag. If unsuccessful, trash Bernice Mai.
cardSet[2097] = {
  title: "Bernice Mai",
  imageFile: "02097.png",
  elo: 1471,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 0,
  trashCost: 3,
  unique: true,
  responseOnRunSuccessful: {
    Enumerate: function () {
      if (!this.rezzed || attackedServer == null || GetServer(this) != attackedServer) return [];
      return [{}];
    },
    Resolve: function () {
      Trace(5, function (successful) {
        if (successful) AddTags(1);
        else if (CheckInstalled(this)) {
          Log("Bernice Mai trashed");
          Trash(this, true);
        }
      }, this);
      //**AI code: spend to win when affordable, otherwise keep the money (losing only costs Bernice)
      if (corp.AI != null) corp.AI._preferTraceToBeat(5);
    },
    text: "Bernice Mai: Trace[5]",
  },
  AILimitPerServer: function (server) {
    return 1;
  },
  //free to rez, so rez it as soon as the Runner approaches this server
  AIRezWhenCan: function () {
    return attackedServer != null && GetServer(this) == attackedServer;
  },
  //a likely tag on access, unless the Runner can match the trace
  AIDefensiveValue: function (server) {
    return 1;
  },
};

//Salvage (2098)
// You can advance this ice if it is rezzed. It gains "↳ Trace[2]. If successful, give the Runner 1 tag." for each hosted advancement counter.
cardSet[2098] = {
  title: "Salvage",
  imageFile: "02098.png",
  elo: 891,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Tracer"],
  rezCost: 2,
  strength: 0,
  canBeAdvanced: false,
  _gainedSubroutine: function () {
    return {
      text: "Trace[2]. If successful, give the Runner 1 tag.",
      salvageGained: true,
      Resolve: function () {
        Trace(2, function (successful) {
          if (successful) AddTags(1);
        }, this);
        if (corp.AI != null) corp.AI._preferTraceToBeat(2, 2);
      },
      visual: { y: 57, h: 32 },
    };
  },
  //Advanceable only while rezzed; one gained subroutine per advancement counter.
  //A new array is assigned so copies never share a mutated printed array.
  _syncSalvage: function () {
    this.canBeAdvanced = !!this.rezzed;
    var want = Counters(this, "advancement");
    if (this.subroutines.length == want) return;
    var subs = this.subroutines.slice(0, Math.min(want, this.subroutines.length));
    while (subs.length < want) subs.push(this._gainedSubroutine());
    this.subroutines = subs;
  },
  automaticOnAnyChange: {
    Resolve: function () {
      this._syncSalvage();
    },
    availableWhenInactive: true,
  },
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (ice == this) this._syncSalvage();
    },
  },
  subroutines: [], //none printed: one gained per advancement counter (_syncSalvage)
  //like Ice Wall: advance once rezzed when this server needs protection and no ice is affordable
  AIAdvancementLimit: function () {
    if (!this.rezzed) return 0;
    var thisServer = GetServer(this);
    if (corp.AI._affordableIce(thisServer) < 1 && corp.AI._serverToProtect() == thisServer) return Counters(this, "advancement") + 1;
    return 0;
  },
  //traces are modelled as successful tags (conservative for the Runner)
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [];
    var n = Counters(this, "advancement");
    for (var i = 0; i < n; i++) result.sr.push([["tag"]]);
    return result;
  },
};

//Simone Diego (2099)
// 2[recurring-c]
// You can spend hosted credits to take the basic action to advance cards in the root of or protecting this server.
cardSet[2099] = {
  title: "Simone Diego",
  imageFile: "02099.png",
  elo: 1236,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 4,
  trashCost: 3,
  unique: true,
  recurringCredits: 2,
  canUseCredits: function (doing, card) {
    if (doing != "advancing" || !card) return false;
    var server = GetServer(this);
    if (server == null) return false;
    return server.root.includes(card) || server.ice.includes(card);
  },
  AIIsScoringUpgrade: true,
  AILimitPerServer: function (server) {
    return 1;
  },
  //rez in the Corp's own turn once there is something here to advance
  AIRezWhenCan: function () {
    if (playerTurn != corp) return false;
    var server = GetServer(this);
    if (server == null) return false;
    return server.root.some(function (card) {
      return card != this && CheckAdvance(card);
    }, this);
  },
};

//Foxfire (2100)
// Trace[7]. If successful, trash 1 virtual resource or 1 link.
cardSet[2100] = {
  title: "Foxfire",
  imageFile: "02100.png",
  elo: 1335,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "operation",
  subTypes: [],
  playCost: 0,
  //"1 link" means an installed card that provides link (CR: a card with a link value)
  _foxfireTargets: function () {
    return ChoicesInstalledCards(runner, function (card) {
      if (!CheckTrash(card)) return false;
      if (CheckCardType(card, ["resource"]) && CheckSubType(card, "Virtual")) return true;
      return typeof card.link !== "undefined" && card.link > 0 && !CheckCardType(card, ["identity"]);
    });
  },
  Resolve: function (params) {
    Trace(7, function (successful) {
      if (!successful) return;
      var choices = this._foxfireTargets();
      if (choices.length < 1) return;
      //**AI code: trash the most expensive target
      if (corp.AI != null) {
        var choice = choices[0];
        for (var i = 1; i < choices.length; i++) {
          if ((choices[i].card.installCost || 0) > (choice.card.installCost || 0)) choice = choices[i];
        }
        corp.AI.preferred = { title: "Foxfire", option: choice };
      }
      DecisionPhase(
        corp,
        choices,
        function (params) {
          Trash(params.card, true);
        },
        "Foxfire",
        "Trash 1 virtual resource or 1 link",
        this
      );
    }, this);
    if (corp.AI != null) corp.AI._preferTraceToBeat(7);
  },
  //play only with a target and a trace the Runner cannot match
  AIWouldPlay: function () {
    if (this._foxfireTargets().length < 1) return false;
    return Link() + AvailableCredits(runner, "trace") < 7 || corp.AI._traceSpendToBeat(7) > 0;
  },
  AIPlayWhenCan: 1,
};

// cardSet[2101] = Retrieval Run - DUPLICATE: systemupdate2021.js has Retrieval Run (card 31004)

//Darwin (2102)
// Interface → 2[c]: Break 1 subroutine.
// X is equal to the number of hosted virus counters.
// When your turn begins, you may pay 1[c] to place 1 virus counter on this program.
cardSet[2102] = {
  title: "Darwin",
  imageFile: "02102.png",
  elo: 1313,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "AI", "Virus"],
  installCost: 3,
  memoryCost: 1,
  strength: 0, //X: hosted virus counters (modifyStrength)
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return Counters(this, "virus");
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        if (GetApproachEncounterIce().cannotBreakUsingAIPrograms) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(runner, 2, "using", this, function () {
          Break(params.subroutine);
        }, this);
      },
    },
  ],
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      if (!CheckInstalled(this) || !CheckCredits(runner, 1, "using", this)) return [];
      if (runner.AI != null) return this.AIWantsCounter() ? [{ use: true }] : [];
      return [
        { use: true, label: "Pay 1[c]: place 1 virus counter on Darwin" },
        { use: false, label: "Do not pay", button: "Decline" },
      ];
    },
    Resolve: function (params) {
      if (!params || !params.use) return;
      SpendCredits(runner, 1, "using", this, function () {
        AddCounters(this, "virus", 1);
      }, this);
    },
    text: "Darwin: pay 1[c] to place 1 virus counter",
  },
  //AI: grow towards the strongest rezzed ice the Runner can see, keeping 2[c] spare.
  AIWantsCounter: function () {
    if (!CheckCredits(runner, 3, "using", this)) return false;
    var target = 3;
    var ice = InstalledCards(corp).filter(function (card) {
      return CheckCardType(card, ["ice"]) && card.rezzed;
    });
    for (var i = 0; i < ice.length; i++) target = Math.max(target, Strength(ice[i]));
    return Counters(this, "virus") < target;
  },
  AIFixedStrength: true,
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (iceAI.ice.cannotBreakUsingAIPrograms) return result;
    //no strength pump: Infinity cost never applies
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, [], Infinity, 0, 2, 1, creditsLeft),
    );
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Data Leak Reversal (2103)
// Install only if you made a successful run on a central server this turn.
// If you are tagged, Data Leak Reversal gains "[click]: The Corp trashes the top card of R&D."
cardSet[2103] = {
  title: "Data Leak Reversal",
  imageFile: "02103.png",
  elo: 1886,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Virtual", "Sabotage"],
  installCost: 0,
  installOnlyIf: function () {
    return playerTurn == runner && (TurnEventCount("runnerSuccessfulRunHQ") > 0 ||
      TurnEventCount("runnerSuccessfulRunRnD") > 0 || TurnEventCount("runnerSuccessfulRunArchives") > 0);
  },
  abilities: [
    {
      text: "[click]: The Corp trashes the top card of R&D.",
      alt: "dlr_mill",
      Enumerate: function () {
        if (!CheckInstalled(this) || runner.tags < 1) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        if (corp.RnD.cards.length < 1) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        var top = corp.RnD.cards[corp.RnD.cards.length - 1];
        Trash(top, true, null, this, undefined, corp);
      },
    },
  ],
  AIWorthKeeping: function () {
    return true;
  },
  //AI: while tagged, mill with the last click of the turn.
  AITriggerInPaidWindow: function () {
    if (!CheckInstalled(this) || runner.tags < 1) return null;
    if (runner.clickTracker != 1 || corp.RnD.cards.length < 1) return null;
    return "dlr_mill";
  },
};

//Faerie (2104)
// Interface → 0[c]: Break 1 sentry subroutine.
// 1[c]: +1 strength.
// Whenever an encounter ends, if you used this program to break a subroutine during that encounter, trash this program.
cardSet[2104] = {
  title: "Faerie",
  imageFile: "02104.png",
  elo: 1676,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 0,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  usedThisEncounter: false,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 sentry subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(GetApproachEncounterIce(), "Sentry")) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        this.usedThisEncounter = true;
        Break(params.subroutine);
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return []; //usability: only during encounters
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(GetApproachEncounterIce(), "Sentry")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(runner, 1, "using", this, function () {
          BoostStrength(this, 1);
        }, this);
      },
    },
  ],
  //a new encounter starts with no boost and no use
  automaticOnEncounter: {
    Resolve: function () {
      this.strengthBoost = 0;
      this.usedThisEncounter = false;
    },
  },
  responseOnEncounterEnds: {
    Enumerate: function () {
      if (!this.usedThisEncounter) {
        return [];
      }
      return [{}];
    },
    Resolve: function () {
      this.usedThisEncounter = false;
      this.strengthBoost = 0;
      if (CheckInstalled(this)) Trash(this, true);
    },
    text: "Faerie: trash this program",
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this.strengthBoost = 0;
      this.usedThisEncounter = false;
    },
  },
  //A break consumes Faerie for later ice in the same run ({use, faerieIce} persistent).
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var self = this;
    var usedOnOtherIce = point.persistents.some(function (p) {
      return p.use == self && p.faerieIce && p.faerieIce != iceAI.ice;
    });
    if (usedOnOtherIce) return result;
    var options = rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Sentry"], 1, 1, 0, 1, creditsLeft);
    for (var i = 0; i < options.length; i++) {
      var brokeHere = options[i].sr_broken.some(function (sr) { return sr.use == self; });
      var marked = options[i].persistents.some(function (p) { return p.use == self && p.faerieIce == iceAI.ice; });
      if (brokeHere && !marked)
        options[i].persistents = options[i].persistents.concat([{ use: this, faerieIce: iceAI.ice }]);
    }
    return result.concat(options);
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Mr. Li (2105)
// [click]: Draw 2 cards. When you do, add 1 of those cards to the bottom of your stack.
cardSet[2105] = {
  title: "Mr. Li",
  unique: true,
  imageFile: "02105.png",
  elo: 1315,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 3,
  abilities: [
    {
      text: "[click]: Draw 2 cards. Add 1 of those cards to the bottom of your stack.",
      Enumerate: function () {
        if (!CheckInstalled(this) || !CheckActionClicks(runner, 1)) return [];
        if (runner.stack.length < 1) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        var before = runner.grip.slice();
        Draw(runner, 2, function () {
          var drawn = runner.grip.filter(function (card) {
            return !before.includes(card);
          });
          this.BottomOneDrawn(drawn);
        }, this);
      },
    },
  ],
  BottomOneDrawn: function (drawn) {
    if (drawn.length < 1) return;
    var choices = ChoicesArrayCards(drawn);
    if (runner.AI != null) choices = [this.AIBottomChoice(choices)];
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (!params || !params.card || params.card.cardLocation != runner.grip) return;
        MoveCard(params.card, runner.stack, 0);
        Log("Mr. Li: 1 card added to the bottom of the stack");
      },
      "Mr. Li",
      "Add 1 of the drawn cards to the bottom of your stack",
      this,
    );
  },
  //AI: bottom a card not worth keeping, lowest ELO first.
  AIBottomChoice: function (choices) {
    var keep = runner.AI._cardsInHandWorthKeeping();
    var best = choices[0];
    var score = function (choice) {
      return (keep.includes(choice.card) ? 10000 : 0) + (choice.card.elo || 1500);
    };
    for (var i = 1; i < choices.length; i++) if (score(choices[i]) < score(best)) best = choices[i];
    return best;
  },
  AIDrawInstall: function () { return runner.stack.length > 1 ? 1 : 0; },
  AIDrawTrigger: 1,
  AIWouldTrigger: function () {
    return runner.stack.length > 1;
  },
};

//Indexing (2106)
// Run R&D. If successful, instead of breaching R&D, you may look at the top 5 cards of R&D and arrange them in any order.
cardSet[2106] = {
  title: "Indexing",
  imageFile: "02106.png",
  elo: 1837,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 0,
  Enumerate: function () { return [{server: corp.RnD}]; },
  runWasSuccessful: false,
  responseOnRunSuccessful: {
    Resolve: function () {
      this.runWasSuccessful = true;
    },
    automatic: true,
  },
  Resolve: function (params) {
    this.runWasSuccessful = false;
    MakeRun(corp.RnD);
  },
  specialOnInsteadOfBreaching: {
    Enumerate: function () {
      if (!this.runWasSuccessful || attackedServer != corp.RnD) return [];
      if (corp.RnD.cards.length < 1) return [];
      //AI: arranging only pays off with a click left to run R&D again
      if (runner.AI != null && runner.clickTracker < 1) return [];
      return [{}];
    },
    Resolve: function () {
      this.ArrangeTopOfRnD();
    },
  },
  ApplyRnDOrder: function (bottomToTop) {
    for (var i = 0; i < bottomToTop.length; i++) {
      MoveCard(bottomToTop[i], corp.RnD.cards);
      bottomToTop[i].knownToRunner = true; //moving resets what the Runner knows
    }
    Log("Indexing: the top " + bottomToTop.length + " cards of R&D were arranged");
  },
  ArrangeTopOfRnD: function () {
    var count = Math.min(5, corp.RnD.cards.length);
    var cards = corp.RnD.cards.slice(corp.RnD.cards.length - count);
    for (var i = 0; i < cards.length; i++) cards[i].knownToRunner = true;
    Log("Indexing: the Runner looks at the top " + count + " card" + (count == 1 ? "" : "s") + " of R&D");
    if (count < 2) return;
    if (runner.AI != null) {
      //AI: agendas on top for the follow-up R&D run
      var ordered = cards.filter(function (card) { return !CheckCardType(card, ["agenda"]); }).concat(
        cards.filter(function (card) { return CheckCardType(card, ["agenda"]); }).sort(function (a, b) {
          return (a.agendaPoints || 0) - (b.agendaPoints || 0);
        }),
      );
      this.ApplyRnDOrder(ordered);
      return;
    }
    var ordered = [];
    var remaining = cards.slice();
    var chooseNext = function () {
      if (remaining.length == 1) {
        ordered.push(remaining[0]);
        this.ApplyRnDOrder(ordered);
        return;
      }
      DecisionPhase(
        runner,
        ChoicesArrayCards(remaining),
        function (params) {
          if (!params || !params.card || !remaining.includes(params.card)) return;
          ordered.push(params.card);
          remaining.splice(remaining.indexOf(params.card), 1);
          chooseNext.call(this);
        },
        "Indexing",
        "Choose the next card from the bottom of the arranged group",
        this,
      );
    };
    chooseNext.call(this);
  },
  AIBreachReplacementValue: 1,
  //AI: an R&D setup run when a click remains afterwards to run R&D again.
  AIRunEventExtraPotential: function (server, potential) {
    if (server != corp.RnD) return 0;
    if (ServerSuccessfulRunPrevented(server)) return 0;
    if (corp.RnD.cards.length < 2 || runner.clickTracker < 2) return 0;
    return 0.5;
  },
};

//R&D Interface (2107)
// Whenever you breach R&D, access 1 additional card.
cardSet[2107] = {
  title: "R&D Interface",
  imageFile: "02107.png",
  elo: 1635,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 4,
  modifyBreachAccess: {
    //may be called repeatedly while breach candidates are determined
    Resolve: function () {
      return attackedServer == corp.RnD ? 1 : 0;
    },
  },
  AIWorthKeeping: function () { return runner.AI._getCachedCost(corp.RnD) != Infinity; },
  AIInstallBeforeRun: function (server) {
    return server == corp.RnD && runner.AI.cardsWorthKeeping.includes(this) ? 1 : 0;
  },
  AIRunExtraPotential: function (server, potential) {
    if (server != corp.RnD || !runner.AI) return 0;
    var extra = runner.AI._countNewCardsThatWouldBeAccessedInRnD(2) - runner.AI._countNewCardsThatWouldBeAccessedInRnD(1);
    return 0.5 * Math.max(0, extra);
  },
  AICentralPressure: function (server) {
    if (server != corp.RnD) return {};
    return { additionalAccess: 1 };
  },
};

//Deep Thought (2108)
// Whenever you make a successful run on R&D, place 1 virus counter on Deep Thought.
// If there are at least 3 virus counters on Deep Thought, it gains "When your turn begins, you may look at the top card of R&D."
cardSet[2108] = {
  title: "Deep Thought",
  imageFile: "02108.png",
  elo: 1279,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 1,
  memoryCost: 1,
  responseOnRunSuccessful: {
    Resolve: function () {
      if (CheckInstalled(this) && attackedServer == corp.RnD) AddCounters(this, "virus", 1);
    },
    automatic: true,
  },
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      if (!CheckInstalled(this) || !CheckCounters(this, "virus", 3)) return [];
      if (corp.RnD.cards.length < 1) return [];
      if (runner.AI != null) return [{ use: true }];
      return [
        { use: true, label: "Look at the top card of R&D" },
        { use: false, label: "Do not look", button: "Decline" },
      ];
    },
    Resolve: function (params) {
      if (!params || !params.use || corp.RnD.cards.length < 1) return;
      var top = corp.RnD.cards[corp.RnD.cards.length - 1];
      top.knownToRunner = true;
      if (!runner.AI) DecisionPhase(runner, [{card: top}], function () {}, this.title, "Look at the top card of R&D", this);
      Log("Deep Thought: the Runner looks at the top card of R&D");
    },
    text: "Deep Thought: look at the top card of R&D",
  },
  AIWorthKeeping: function () { return true; },
  AIInstallBeforeRun: function (server) { return server == corp.RnD ? 1 : 0; },
  //AI: small bonus for R&D runs while the counters are still building.
  AIRunExtraPotential: function (server, potential) {
    if (server != corp.RnD || CheckCounters(this, "virus", 3)) return 0;
    return 0.2;
  },
  AIPublicRunPressure: function (server) {
    if (server != corp.RnD) return {};
    return { growth: 1 };
  },
};

//New Angeles City Hall (2109)
// [interrupt] → 2[c]: Prevent 1 tag.
// When you steal an agenda, trash this resource.
cardSet[2109] = {
  title: "New Angeles City Hall",
  unique: true,
  imageFile: "02109.png",
  elo: 1572,
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Location", "Government"],
  installCost: 1,
  //The repeatable interrupt is offered once per tag event, for any affordable number of tags.
  responsePreventableAddTags: {
    Enumerate: function () {
      if (!CheckInstalled(this) || intended.addTags < 1) return [];
      var max = 0;
      while (max < intended.addTags && CheckCredits(runner, 2 * (max + 1), "using", this)) max++;
      if (max < 1) return [];
      if (runner.AI != null) return [{ prevent: max }];
      var choices = [];
      for (var k = 1; k <= max; k++)
        choices.push({ prevent: k, label: "Pay " + 2 * k + "[c]: prevent " + k + " tag" + (k == 1 ? "" : "s") });
      choices.push({ prevent: 0, label: "Do not prevent", button: "Decline" });
      return choices;
    },
    Resolve: function (params) {
      if (!params || !params.prevent) return;
      var prevent = params.prevent;
      SpendCredits(runner, 2 * prevent, "using", this, function () {
        intended.addTags = Math.max(0, intended.addTags - prevent);
        Log("New Angeles City Hall: " + prevent + " tag" + (prevent == 1 ? "" : "s") + " prevented");
      }, this);
    },
    text: "New Angeles City Hall: pay 2[c] per tag to prevent",
  },
  responseOnStolen: {
    Enumerate: function () {
      return CheckInstalled(this) ? [{}] : [];
    },
    Resolve: function () {
      if (CheckInstalled(this)) Trash(this, true);
    },
    text: "New Angeles City Hall: trash this resource",
  },
  AIWorthKeeping: function () { return true; },
  AITagPreventionCost: function () { return 2; },
};

// cardSet[2110] = Eli 1.0 - DUPLICATE: systemupdate2021.js has Eli 1.0 (card 31043)

//Ruhr Valley (2111)
// As an additional cost to make a run on this server, the Runner must spend [click].
// Limit 1 region per server.
cardSet[2111] = {
  title: "Ruhr Valley",
  imageFile: "02111.png",
  elo: 1387,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 6,
  trashCost: 4,
  modifyRunClickCost: {
    Resolve: function (server) { return GetServer(this) == server ? 1 : 0; },
  },
  AIPreferredUpgradeServer: function () {
    if (!CheckCredits(corp, this.rezCost, "rezzing", this)) return null;
    return corp.remoteServers.find(function (server) {
      return server.ice.length > 0 && corp.AI._isAScoringServer(server);
    }) || null;
  },
  AIIsScoringUpgrade: true,
  AILimitPerServer: function () { return 1; },
  AIRezWhenCan: function () { return playerTurn == corp && GetServer(this).ice.length > 0; },
  AIDefensiveValue: function (server) { return server && server.ice.length ? 2 : 0; },
};

// cardSet[2112] = Ronin - DUPLICATE: systemupdate2021.js has Ronin (card 31053)

//Midori (2113)
// Whenever the Runner approaches a piece of ice protecting this server, you may swap that ice with 1 piece of ice from HQ. (The new ice is installed unrezzed.) If you do, the Runner may jack out. Use this ability only once per run.
cardSet[2113] = {
  title: "Midori",
  imageFile: "02113.png",
  elo: 1253,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Sysop"],
  rezCost: 0,
  trashCost: 3,
  unique: true,
  usedThisRun: false,
  automaticOnRunBegins: { Resolve: function () { this.usedThisRun = false; } },
  automaticOnRunEndCleanup: { Resolve: function () { this.usedThisRun = false; }, availableWhenInactive: true },
  _swapChoices: function () {
    if (this.usedThisRun || !this.rezzed || attackedServer != GetServer(this) || !GetApproachEncounterIce()) return [];
    return ChoicesArrayCards(corp.HQ.cards.filter(function (card) { return CheckCardType(card, ["ice"]); }));
  },
  _aiSwap: function (choices) {
    var current = GetApproachEncounterIce();
    var best = null;
    for (var choice of choices) {
      var ice = choice.card;
      if (!CheckCredits(corp, RezCost(ice), "rezzing", ice)) continue;
      if (Strength(ice) <= Strength(current) && ice.subroutines.length <= current.subroutines.length) continue;
      if (!best || ice.elo > best.card.elo) best = choice;
    }
    return best;
  },
  responseOnApproachIce: {
    Enumerate: function () {
      var choices = this._swapChoices();
      if (corp.AI) { var best = this._aiSwap(choices); return best ? [best] : []; }
      return choices;
    },
    Resolve: function (params) {
      var server = attackedServer, index = approachIce, oldIce = GetApproachEncounterIce(), newIce = params.card;
      this.usedThisRun = true;
      var swap = function () {
        //Midori remains in the root, so the server cannot disappear during this swap.
        MoveCard(oldIce, corp.HQ.cards);
        MoveCard(newIce, server.ice, index);
        newIce.rezzed = false;
        newIce.faceUp = false;
        approachIce = index;
        Log("Midori swapped the approached ice with ice from HQ");
        if (!CheckJackOut()) return;
        var choices = [{jack: false, label: "Continue the run"}, {jack: true, label: "Jack out"}];
        if (runner.AI) {
          var path = runner.AI._calculateBestCompleteRun(server, 0, 0, 0, 0);
          runner.AI.preferred = {title: this.title, option: choices[path ? 0 : 1]};
        }
        DecisionPhase(runner, choices, function (choice) { if (choice.jack) JackOut(); }, this.title, "You may jack out", this);
      };
      if (oldIce.hostedCards && oldIce.hostedCards.length)
        Trash(oldIce.hostedCards.slice(), false, swap, this);
      else swap.call(this);
    },
    text: "Midori: swap the approached ice with ice from HQ",
  },
  AIPreferredUpgradeServer: function () {
    if (!corp.HQ.cards.some(function (card) {
      return CheckCardType(card, ["ice"]) && CheckCredits(corp, RezCost(card), "rezzing", card);
    })) return null;
    return corp.remoteServers.find(function (server) {
      return server.ice.length > 0 && corp.AI._isAScoringServer(server);
    }) || null;
  },
  AIIsScoringUpgrade: true,
  AILimitPerServer: function () { return 1; },
  AIDefensiveValue: function (server) { return server && server.ice.length && corp.HQ.cards.some(function (c) { return CheckCardType(c, ["ice"]); }) ? 1 : 0; },
  AIRezWhenCan: function () {
    return !!GetServer(this) && (playerTurn == corp || (attackedServer == GetServer(this) && currentPhase.identifier == "Run 4.5")) &&
      corp.HQ.cards.some(function (c) { return CheckCardType(c, ["ice"]) && CheckCredits(corp, RezCost(c), "rezzing", c); });
  },
};

//NBN: The World is Yours* (2114)
// Your maximum hand size is increased by 1.
cardSet[2114] = {
  title: "NBN: The World is Yours*",
  imageFile: "02114.png",
  elo: 1245,
  player: corp,
  faction: "NBN",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 40,
  influenceLimit: 12,
  modifyMaxHandSize: { Resolve: function (player) { return player == corp ? 1 : 0; } },
};

// cardSet[2115] = Project Beale - DUPLICATE: systemupdate2021.js has Project Beale (card 31062)

//Midseason Replacements (2116)
// Play only if the Runner stole an agenda during their last turn.
// Trace[6]. If successful, give the Runner X tags. X is equal to the amount by which your trace strength exceeded their link strength.
cardSet[2116] = {
  title: "Midseason Replacements",
  imageFile: "02116.png",
  elo: 1976,
  player: corp,
  faction: "NBN",
  influence: 4,
  cardType: "operation",
  subTypes: [],
  playCost: 5,
  Enumerate: function () { return PreviousTurnEventCount("runnerAgendaStolen", runner) > 0 ? [{}] : []; },
  Resolve: function () {
    Trace(6, function (successful) { if (successful) AddTags(traceStrength - linkStrength); }, this);
    if (corp.AI) corp.AI._preferTraceToBeat(6);
  },
  AIPlayWhenCan: 1,
  AIWouldPlay: function () {
    if (!this.Enumerate().length || runner.tags > 0) return false;
    return AvailableCredits(corp, "trace") - PlayCost(this) + 6 > Link() + AvailableCredits(runner, "trace");
  },
};

//Flare (2117)
// ↳Trace[6]. If successful, trash 1 piece of hardware, do 2 meat damage (cannot be prevented), and end the run.
cardSet[2117] = {
  title: "Flare",
  imageFile: "02117.png",
  elo: 1309,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Tracer", "AP"],
  rezCost: 9,
  strength: 6,
  subroutines: [{
    text: "Trace[6]. If successful, trash 1 piece of hardware, do 2 meat damage (cannot be prevented), and end the run.",
    Resolve: function () {
      Trace(6, function (successful) {
        if (!successful) return;
        var finish = function () { Damage("meat", 2, false, function () { EndTheRun(); }, this); };
        var choices = ChoicesInstalledCards(runner, function (c) { return CheckCardType(c, ["hardware"]) && CheckTrash(c); });
        if (!choices.length) { finish.call(this); return; }
        if (corp.AI) {
          var best = choices.slice().sort(function (a, b) { return b.card.elo - a.card.elo; })[0];
          corp.AI.preferred = {title: this.title, option: best};
        }
        DecisionPhase(corp, choices, function (params) { Trash(params.card, true, finish, this); }, this.title, "Trash 1 piece of hardware", this, "trash");
      }, this);
      if (corp.AI) corp.AI._preferTraceToBeat(6);
    },
    visual: {y: 92, h: 64},
  }],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    //Like Winchester, model the trace as successful; damage is unpreventable.
    var effects = ["unpreventableMeatDamage", "unpreventableMeatDamage", "endTheRun"];
    if (runner.rig.hardware.length) effects.unshift("misc_moderate");
    result.sr = [[effects]];
    return result;
  },
};

//Dedicated Response Team (2118)
// If the Runner is tagged, Dedicated Response Team gains "Whenever a successful run ends, do 2 meat damage."
cardSet[2118] = {
  title: "Dedicated Response Team",
  imageFile: "02118.png",
  elo: 1377,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "asset",
  subTypes: ["Hostile"],
  rezCost: 2,
  trashCost: 3,
  responseOnRunEnds: {
    Enumerate: function () { return runner.tags > 0 && runSuccessDeclared ? [{}] : []; },
    Resolve: function () { Damage("meat", 2, true); },
    text: "Dedicated Response Team: do 2 meat damage",
  },
  AIWorthInstalling: function (remotes) {
    if (runner.tags < 1 || !CheckCredits(corp, this.rezCost, "rezzing", this)) return -1;
    for (var i = 0; i < remotes.length; i++) if (!corp.AI._isAScoringServer(remotes[i])) return i;
    return remotes.length;
  },
  AIRezWhenCan: function () { return runner.tags > 0 && !!attackedServer; },
  AIAvoidInstallingOverThis: true,
  AIRunEndMeatDamage: function (server, tags, context) {
    if (context && context.trashCard == this) return 0;
    return this.rezzed && tags > 0 ? 2 : 0;
  },
};

//Burke Bugs (2119)
// ↳ Trace[0]. If successful, the Runner trashes 1 program.
cardSet[2119] = {
  title: "Burke Bugs",
  imageFile: "02119.png",
  elo: 1146,
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer"],
  rezCost: 0,
  strength: 0,
  subroutines: [{
    text: "Trace[0]. If successful, the Runner trashes 1 program.",
    Resolve: function () {
      Trace(0, function (successful) {
        if (!successful) return;
        var choices = ChoicesInstalledCards(runner, function (c) { return CheckCardType(c, ["program"]) && CheckTrash(c); });
        if (!choices.length) return;
        if (runner.AI) {
          var best = choices.slice().sort(function (a, b) { return a.card.elo - b.card.elo; })[0];
          runner.AI.preferred = {title: this.title, option: best};
        }
        DecisionPhase(runner, choices, function (params) { Trash(params.card, true); }, this.title, "Trash 1 program", this, "trash");
      }, this);
      if (corp.AI) corp.AI._preferTraceToBeat(0);
    },
    visual: {y: 80, h: 32},
  }],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[runner.rig.programs.length ? ["misc_moderate"] : []]];
    return result;
  },
};

//Corporate War (2120)
// If you have at least 7[c] when you score Corporate War, gain 7[c]; otherwise, lose all credits in your credit pool.
cardSet[2120] = {
  title: "Corporate War",
  imageFile: "02120.png",
  elo: 1276,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 4,
  agendaPoints: 2,
  responseOnScored: {
    Resolve: function () {
      if (intended.score != this) return;
      if (corp.creditPool >= 7) GainCredits(corp, 7, "", this);
      else LoseCredits(corp, corp.creditPool, this);
    },
    automatic: true,
  },
  AIWouldScore: function () { return corp.creditPool >= 7 || corp.creditPool == 0; },
};
