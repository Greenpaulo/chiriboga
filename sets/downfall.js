//CARD DEFINITIONS FOR DOWNFALL
// Batch 1 ELO: Trash or Busto ranking, 2026-10-16; preserve existing values elsewhere.
// Batches 2, 4 and 6 missing ELO values (including Pelangi):
// https://trash-or-busto.herokuapp.com/ranking, checked 2026-10-20; existing ratings preserved.
setIdentifiers.push("df");

//Chisel (26003)
//Anarch Program: Virus - Trojan, cost 2, MU 1, influence 4
//Install only on a piece of ice.
//Host ice gets -1 strength for each hosted virus counter.
//Whenever you encounter host ice, if its strength is 0 or less, trash it.
//Otherwise, place 1 virus counter on this program.
cardSet[26003] = {
  title: "Chisel",
  imageFile: "26003.png",
  elo: 1663,
  player: runner,
  faction: "Anarch",
  influence: 4,
  cardType: "program",
  subTypes: ["Virus", "Trojan"],
  installCost: 2,
  memoryCost: 1,
  encounterResolved: false,
  installOnlyOn: function (card) { return CheckCardType(card, ["ice"]); },
  modifyStrength: {
    Resolve: function (card) {
      return this.host && card === this.host && !card.strengthCannotBeLowered ? -Counters(this, "virus") : 0;
    },
  },
  automaticOnEncounter: {
    Resolve: function () { this.encounterResolved = false; },
  },
  responseOnEncounter: {
    Enumerate: function () {
      if (!CheckEncounter() || !this.host || GetApproachEncounterIce() !== this.host) return [];
      return [{}];
    },
    Resolve: function () {
      this.encounterResolved = true;
      if (Strength(this.host) <= 0) {
        if (CheckTrash(this.host)) Trash(this.host, true, null, this);
      } else AddCounters(this, "virus", 1);
    },
    text: "Chisel: trash host ice or place 1 virus counter",
  },
  responseOnEncounterEnds: {
    Resolve: function () { this.encounterResolved = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  _encounterPending: function (ice) {
    return !(CheckEncounter() && GetApproachEncounterIce() === ice && this.encounterResolved);
  },
  AISpecialBreaker: true,
  AIMatchingBreakerInstalled: function (ice) {
    if (ice === this.host && Strength(ice) <= 0 && CheckTrash(ice)) return this;
    return null;
  },
  AIModifyIceAI: function (iceAI) {
    if (!CheckHasAbilities(this) || !iceAI.knownToEvaluator || iceAI.ice !== this.host || !this._encounterPending(iceAI.ice)) return iceAI;
    // Evaluate the condition BEFORE placing a counter: reaching zero this
    // encounter does not trash the ice until the next encounter.
    if (iceAI.strength <= 0) {
      if (CheckTrash(iceAI.ice)) iceAI.sr = [];
    } else if (!iceAI.ice.strengthCannotBeLowered) {
      iceAI.strength = Math.max(0, iceAI.strength - 1);
    }
    return iceAI;
  },
  AIReducesIceStrength: function (ice) {
    // Existing hosted counters already contribute through Strength(). Only
    // report the prospective counter that the Corp's shortcut has not seen.
    return ice === this.host && this._encounterPending(ice) && Strength(ice) > 0 ? 1 : 0;
  },
  AIPreferredInstallChoice: function (choices) {
    var best = -1, value = -Infinity;
    for (var i = 0; i < choices.length; i++) {
      var ice = choices[i].host;
      if (!ice || (ice.hostedCards || []).some(function (card) { return card.title === "Chisel"; })) continue;
      var score = 1;
      if (PlayerCanLook(runner, ice)) {
        if (ice.AIDisablesHostedPrograms || ice.strengthCannotBeLowered) continue;
        score = RezCost(ice) + 4 / (Strength(ice) + 1);
      }
      if (score > value) { best = i; value = score; }
    }
    return best;
  },
  AIWorthKeeping: function () {
    return InstalledCards(corp).some(function (card) { return CheckCardType(card, ["ice"]); });
  },
  AIOkToTrash: function () {
    return !!(this.host && PlayerCanLook(runner, this.host) && this.host.AIDisablesHostedPrograms);
  },
};

//Rezeki (26026)
//Shaper Program, cost 2, MU 1, influence 1
//When your turn begins, gain 1 credit.
cardSet[26026] = {
  title: "Rezeki",
  elo: 1981,
  imageFile: "26026.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 2,
  memoryCost: 1,

  //When your turn begins, gain 1 credit.
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      GainCredits(runner, 1, "", this);
    },
    automatic: true,
  },

  //AI: This is a good drip economy card
  AIEconomyInstall: function () {
    //High priority - consistent drip economy
    return 2;
  },

  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Always worth keeping - cheap drip economy
    //Check if we have MU for it
    if (spareMU >= 1) return true;
    //Even without MU, might be worth keeping if we expect to get more MU
    return true;
  },
};

//Bukhgalter (26016)
//Criminal Program: Icebreaker - Killer, cost 3, MU 1, strength 1, influence 4
//Interface → 1 credit: Break 1 sentry subroutine.
//1 credit: +1 strength.
//The first time each turn this program fully breaks a piece of ice, gain 2 credits.
cardSet[26016] = {
  title: "Bukhgalter",
  elo: 1947,
  imageFile: "26016.png",
  player: runner,
  faction: "Criminal",
  influence: 4,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 3,
  memoryCost: 1,
  strength: 1,

  //Track strength boost for encounter
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },

  //Track if fully broken an ice this turn
  hasFullyBrokenThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.hasFullyBrokenThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.hasFullyBrokenThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },

  //Subroutines this program broke during the current encounter
  brokenThisEncounter: [],
  automaticOnEncounter: {
    Resolve: function () {
      this.brokenThisEncounter = [];
    },
  },

  //Helper function to check if ice is fully broken and trigger credit gain
  //This program fully breaks the ice only if it broke every subroutine (CR 6.5.7b)
  _checkFullyBroken: function () {
    if (this.hasFullyBrokenThisTurn) return; //Already triggered this turn
    if (!CheckEncounter()) return;
    var ice = attackedServer.ice[approachIce];
    var cardRef = this;
    var allBrokenByThis = ice.subroutines.every(function (sr) {
      return sr.broken && cardRef.brokenThisEncounter.includes(sr);
    });
    if (allBrokenByThis) {
      //Ice is fully broken!
      this.hasFullyBrokenThisTurn = true;
      GainCredits(runner, 2, "", this);
      Log(
        GetTitle(this) +
          " fully broke " +
          GetTitle(attackedServer.ice[approachIce]) +
          ", gaining 2[c]",
      );
    }
  },

  abilities: [
    {
      text: "Break 1 sentry subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        var cardRef = this;
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            cardRef.brokenThisEncounter = cardRef.brokenThisEncounter.concat([params.subroutine]);
            Break(params.subroutine);
            //Check if ice is now fully broken
            cardRef._checkFullyBroken();
          },
          this,
        );
      },
    },
    {
      text: "+1 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return []; //Don't over-boost for usability
        if (!CheckUnbrokenSubroutines()) return []; //Don't boost if nothing to break
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
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
          this,
        );
      },
    },
  ],

  //Reset strength boost and break tracking when encounter ends
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
      this.brokenThisEncounter = [];
    },
    automatic: true,
  },

  //AI: Standard icebreaker implementation
  AIImplementBreaker: function (
    rc,
    result,
    point,
    server,
    cardStrength,
    iceAI,
    iceStrength,
    clicksLeft,
    creditsLeft,
  ) {
    //Args for ImplementIcebreaker: point, card, cardStrength, iceAI, iceStrength, iceSubTypes, costToUpStr, amtToUpStr, costToBreak, amtToBreak, creditsLeft
    result = result.concat(
      rc.ImplementIcebreaker(
        point,
        this,
        cardStrength,
        iceAI,
        iceStrength,
        ["Sentry"],
        1, //cost to boost strength
        1, //amount to boost strength
        1, //cost to break
        1, //amount to break
        creditsLeft,
      ),
    );
    return result;
  },

  AIPreferredInstallChoice: function (choices) {
    //Standard install - just install in the rig
    return 0;
  },

  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Worth keeping - efficient killer with economy bonus
    //Check if we already have a killer
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Killer")) {
        //Already have a killer, less important
        return spareMU >= 2;
      }
    }
    //No killer yet - definitely keep
    return true;
  },
};

//Isolation (26001)
// As an additional cost to play this event, trash 1 installed resource.
// Gain 7[c].
cardSet[26001] = {
  title: "Isolation",
  imageFile: "26001.png",
  elo: 1269,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 2,
  additionalPlayCostTrash: true,
  Enumerate: function () {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["resource"]) && CheckTrash(card);
    });
  },
  Resolve: function () {
    GainCredits(runner, 7, "", this);
  },
  AIPreferredPlayChoice: function (choices) {
    // Cash out exhausted resources; do not sacrifice a live engine for income.
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      if (typeof card.AIOkToTrash === "function" && card.AIOkToTrash.call(card))
        return i;
    }
    return -1;
  },
  AIWouldPlay: function () {
    return this.AIPreferredPlayChoice(this.Enumerate()) >= 0;
  },
  AIWorthKeeping: function () {
    return this.AIWouldPlay();
  },
  AIEconomyPlay: 2,
  AIOrdinaryEconomyPlay: true,
};

//Demolisher (26002)
// +1[mu]
// The trash cost of each Corp card is lowered by 1[c].
// The first time each turn you trash a Corp card, gain 1[c].
// Limit 1 console per player.
cardSet[26002] = {
  title: "Demolisher",
  imageFile: "26002.png",
  elo: 1371,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 4,
  unique: true,
  memoryUnits: 1,
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
  modifyTrashCost: {
    Resolve: function (card) {
      return card && card.player === corp ? -1 : 0;
    },
  },
  automaticOnTrash: {
    Resolve: function (cards, trashingPlayer, directlyTrashed) {
      if (trashingPlayer !== runner || this.usedThisTurn) return;
      if (!(directlyTrashed || cards).some(function (card) { return card.player === corp; })) return;
      // "First time" is tracked even while inactive; installing later does not reset it.
      this.usedThisTurn = true;
      if (CheckActive(this) && CheckHasAbilities(this)) GainCredits(runner, 1, "", this);
    },
    availableWhenInactive: true,
  },
  AIWorthKeeping: function () { return !this.AIWastefulToInstall(); },
  AIWastefulToInstall: function () {
    return InstalledCards(runner).some(function (card) { return CheckSubType(card, "Console"); });
  },
  AIEconomyInstall: function () { return this.AIWastefulToInstall() ? 0 : 1; },
};

//Stargate (26004)
// Once per turn → [click]: Run R&D. If successful, instead of breaching R&D, reveal the top 3 cards of R&D. Trash 1 of the revealed cards.
cardSet[26004] = {
  title: "Stargate",
  imageFile: "26004.png",
  elo: 1710,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 4,
  memoryCost: 2,
  usedThisTurn: false,
  runningWithThis: false,
  breachReplacementQueued: false,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card === this) this.usedThisTurn = false;
    },
  },
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
  abilities: [{
    text: "[click]: Run R&D with Stargate",
    Enumerate: function () {
      if (this.usedThisTurn || !CheckActionClicks(runner, 1)) return [];
      return [{}];
    },
    Resolve: function () {
      SpendClicks(runner, 1);
      this.usedThisTurn = true;
      this.runningWithThis = true;
      this.breachReplacementQueued = false;
      MakeRun(corp.RnD);
    },
  }],
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      this.breachReplacementQueued = this.runningWithThis && server === corp.RnD;
    },
    availableWhenInactive: true,
  },
  specialOnInsteadOfBreaching: {
    Enumerate: function () {
      return this.breachReplacementQueued ? [{required: true}] : [];
    },
    Resolve: function () {
      this.breachReplacementQueued = false;
      var cards = corp.RnD.cards.slice(-Math.min(3, corp.RnD.cards.length)).reverse();
      var priorFaceUp = cards.map(function (card) { return card.faceUp; });
      var restore = function () {
        cards.forEach(function (card, i) {
          if (card.cardLocation === corp.RnD.cards) card.faceUp = priorFaceUp[i];
        });
      };
      var chooseTrash = function () {
        var choices = ChoicesArrayCards(cards, function (card) { return CheckTrash(card); });
        if (!choices.length) { restore(); return; }
        if (runner.AI) {
          var best = 0;
          for (var i = 1; i < choices.length; i++) {
            if ((choices[i].card.elo || 0) > (choices[best].card.elo || 0)) best = i;
          }
          runner.AI.preferred = {title: "Stargate: trash a revealed card", index: best};
        }
        DecisionPhase(runner, choices, function (params) {
          restore();
          params.card.faceUp = true;
          Trash(params.card, true, function () { restore(); }, this);
        }, "Stargate: trash a revealed card", "Trash 1 revealed card", this);
      };
      var revealNext = function (index) {
        if (index >= cards.length) { chooseTrash.call(this); return; }
        Reveal(cards[index], function () {
          cards[index].faceUp = true;
          cards[index].knownToRunner = true;
          revealNext.call(this, index + 1);
        }, this);
      };
      revealNext.call(this, 0);
    },
    // The delayed effect survives Stargate leaving play during its run.
    availableWhenInactive: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.runningWithThis = false;
      this.breachReplacementQueued = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  AIRunAbilityExtraPotential: function (server, potential) {
    if (server !== corp.RnD || this.usedThisTurn || !server.cards.length || ServerSuccessfulRunPrevented(server)) return 0;
    // This replaces the access value; do not add that value to the trash reward.
    return Math.max(0, 1.6 - potential);
  },
  AIBreachNotRequired: true,
  AIBreachReplacementValue: 2,
  AIWastefulToInstall: function () {
    return InstalledCards(runner).some(function (card) { return card.title === "Stargate"; });
  },
  AIPreferredInstallChoice: function (choices) {
    return !this.AIWastefulToInstall() && runner.clickTracker >= 2 && choices.length ? 0 : -1;
  },
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (server !== corp.RnD || !server.cards.length || ServerSuccessfulRunPrevented(server)) return 0;
    if (runner.clickTracker <= runClickCost + 1 || this.AIWastefulToInstall()) return 0;
    if (runner.creditPool < InstallCost(this) + runCreditCost) return 0;
    return 1;
  },
  AIWorthKeeping: function () { return !this.AIWastefulToInstall() && corp.RnD.cards.length > 0; },
};

//Utae (26005)
// Interface → X[c]: Break X code gate subroutines. Use this ability only once per run.
// Interface → 1[c]: Break 1 code gate subroutine. Use this ability only if you have 3 or more installed virtual resources.
// 1[c]: +1 strength.
cardSet[26005] = {
  title: "Utae",
  elo: 1205,
  imageFile: "26005.png",
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 2,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  usedThisRun: false,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.usedThisRun = false;
    },
    automatic: true,
  },
  VirtualResourceCount: function () {
    return runner.rig.resources.filter(function (card) {
      return CheckSubType(card, "Virtual");
    }).length;
  },
  CanBreakCodeGate: function () {
    if (!CheckEncounter()) return false;
    if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return false;
    return CheckStrength(this);
  },
  // X is chosen by selecting the subroutines before paying; nothing changes
  // between the choice and the single X-credit payment.
  ChooseXSubroutines: function (selected) {
    var affordable = AvailableCredits(runner, "using", this);
    var choices = ChoicesEncounteredSubroutines().filter(function (choice) {
      return !selected.includes(choice.subroutine);
    });
    if (selected.length >= affordable || choices.length < 1) {
      this.PayXAndBreak(selected);
      return;
    }
    for (var i = 0; i < choices.length; i++)
      choices[i].label = "(Utae) Break another subroutine. -> " + choices[i].label;
    choices.push({
      label: "Pay " + selected.length + "[c] and break",
      button: "Pay " + selected.length + "[c]",
      alt: "continue",
    });
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (params.subroutine) this.ChooseXSubroutines(selected.concat([params.subroutine]));
        else this.PayXAndBreak(selected);
      },
      "Utae",
      "Break X code gate subroutines",
      this,
    );
  },
  PayXAndBreak: function (selected) {
    this.usedThisRun = true;
    SpendCredits(
      runner,
      selected.length,
      "using",
      this,
      function () {
        for (var i = 0; i < selected.length; i++) Break(selected[i]);
      },
      this,
    );
  },
  abilities: [
    {
      text: "Break X code gate subroutines (once per run).",
      Enumerate: function () {
        if (this.usedThisRun) return [];
        if (!this.CanBreakCodeGate()) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        this.ChooseXSubroutines([params.subroutine]);
      },
    },
    {
      text: "Break 1 code gate subroutine.",
      Enumerate: function () {
        if (this.VirtualResourceCount() < 3) return [];
        if (!this.CanBreakCodeGate()) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            Break(params.subroutine);
          },
          this,
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
      Resolve: function () {
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            BoostStrength(this, 1);
          },
          this,
        );
      },
    },
  ],
  // Interface uses the first enumerated break ability: X-break while unused,
  // otherwise the 1[c] break when 3+ virtual resources are installed.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (!iceAI.subTypes.includes("Code Gate")) return result;
    if (cardStrength < iceStrength) {
      if (creditsLeft >= 1) {
        var pumped = rc.StrModify(this, this, point, 1);
        pumped.runner_credits_spent += 1;
        result.push(pumped);
      }
      return result;
    }
    if (!this.usedThisRun && !rc.PersistentsUse(point, this)) {
      for (var x = 1; x <= Math.min(iceAI.sr.length, creditsLeft); x++) {
        var breaks = rc.SrBreak(this, iceAI, point, x);
        for (var i = 0; i < breaks.length; i++) {
          breaks[i].runner_credits_spent += x;
          breaks[i].persistents = breaks[i].persistents.concat([{ use: this }]);
        }
        result = result.concat(breaks);
      }
    } else if (this.VirtualResourceCount() >= 3) {
      result = result.concat(
        rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Code Gate"], 1, 1, 1, 1, creditsLeft),
      );
    }
    return result;
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Climactic Showdown (26006)
// When your turn begins, remove this resource from the game. Choose a server protected by ice. The Corp may trash 1 piece of ice protecting that server. If they do not, the first time this turn you breach either R&D or HQ, access 2 additional cards.
cardSet[26006] = {
  title: "Climactic Showdown",
  elo: 1194,
  imageFile: "26006.png",
  player: runner,
  faction: "Anarch",
  influence: 5,
  cardType: "resource",
  subTypes: [],
  installCost: 2,
  unique: true,
  ServersProtectedByIce: function () {
    return ChoicesExistingServers().filter(function (choice) {
      return choice.server.ice.length > 0;
    });
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      var showdown = this;
      RemoveFromGame(this);
      var choices = this.ServersProtectedByIce();
      if (choices.length < 1) return;
      if (runner.AI != null) choices = [this.ChooseServerForAI(choices)];
      DecisionPhase(
        runner,
        choices,
        function (params) {
          showdown.OfferIceTrash(params.server);
        },
        "Climactic Showdown",
        "Choose a server protected by ice",
        this,
      );
    },
    automatic: true,
  },
  OfferIceTrash: function (server) {
    var showdown = this;
    var choices = ChoicesArrayCards(server.ice);
    for (var i = 0; i < choices.length; i++) choices[i].label = "Trash " + GetTitle(choices[i].card);
    choices.push({ label: "Do not trash ice", button: "Decline" });
    if (corp.AI != null) choices = [this.CorpChoiceForAI(choices)];
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (params.card) Trash(params.card, true, null, this, undefined, corp);
        else showdown.AddBreachBonus();
      },
      "Climactic Showdown",
      "Trash 1 piece of ice protecting " + ServerName(server) + "?",
      this,
    );
  },
  // The bonus outlives this card, which is already removed from the game.
  AddBreachBonus: function () {
    AddLingeringEffect({
      title: "Climactic Showdown",
      player: runner,
      breachingNow: false,
      modifyBreachAccess: {
        Resolve: function () {
          if (attackedServer != corp.HQ && attackedServer != corp.RnD) return 0;
          return 2;
        },
      },
      automaticOnBreach: {
        Resolve: function (server) {
          if (server == corp.HQ || server == corp.RnD) this.breachingNow = true;
        },
      },
      responseOnRunEnds: {
        Resolve: function () {
          if (this.breachingNow) RemoveLingeringEffect(this);
        },
        automatic: true,
      },
      responseOnRunnerDiscardEnds: {
        Resolve: function () {
          RemoveLingeringEffect(this);
        },
        automatic: true,
      },
      // 0.5 potential per additional access, as other access boosters.
      AIRunExtraPotential: function (server) {
        if (server != corp.HQ && server != corp.RnD) return 0;
        return 1.0;
      },
    });
  },
  // Runner AI: the Corp sacrifices its cheapest ice, so pick the server whose
  // cheapest public ice is dearest (facedown ice is valued as 3), centrals first.
  ChooseServerForAI: function (choices) {
    var score = function (server) {
      var cheapest = Infinity;
      for (var i = 0; i < server.ice.length; i++) {
        var ice = server.ice[i];
        cheapest = Math.min(cheapest, PlayerCanLook(runner, ice) ? RezCost(ice) : 3);
      }
      return cheapest + (typeof server.cards !== "undefined" ? 0.5 : 0);
    };
    var best = choices[0];
    for (var i = 1; i < choices.length; i++) if (score(choices[i].server) > score(best.server)) best = choices[i];
    return best;
  },
  // Corp AI: two extra central accesses outweigh losing cheap ice.
  CorpChoiceForAI: function (choices) {
    var best = null;
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].card && (!best || RezCost(choices[i].card) < RezCost(best.card))) best = choices[i];
    }
    if (best && RezCost(best.card) <= 3) return best;
    return choices[choices.length - 1];
  },
  AIWorthKeeping: function () {
    return this.ServersProtectedByIce().length > 0;
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    if (this.ServersProtectedByIce().length < 1) return -1;
    return 0;
  },
};

//Fencer Fueno (26007)
// When your turn begins and whenever you steal an agenda, place 1[c] on this resource.
// Whenever you make a successful run, you can spend hosted credits for the remainder of that run.
// When your turn ends, if there are 3 or more hosted credits, you must pay 1[c] or trash this resource.
cardSet[26007] = {
  title: "Fencer Fueno",
  elo: 1557,
  imageFile: "26007.png",
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Companion", "Virtual"],
  installCost: 0,
  unique: true,
  hostedCreditsUsable: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      PlaceCredits(this, 1);
    },
    automatic: true,
  },
  responseOnStolen: {
    Resolve: function () {
      PlaceCredits(this, 1);
    },
    automatic: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      this.hostedCreditsUsable = true;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.hostedCreditsUsable = false;
    },
    automatic: true,
  },
  canUseCredits: function (doing, card) {
    return this.hostedCreditsUsable && attackedServer !== null;
  },
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (!CheckCounters(this, "credits", 3)) return [];
      return [{}];
    },
    Resolve: function () {
      var choices = [];
      if (CheckCredits(runner, 1)) choices.push({ pay: true, label: "Pay 1[c]", button: "Pay 1[c]" });
      choices.push({ pay: false, label: "Trash Fencer Fueno", button: "Trash" });
      // AI: keep the stash; paying matches the next turn's drip.
      if (runner.AI != null) choices = [choices[0]];
      DecisionPhase(
        runner,
        choices,
        function (params) {
          if (params.pay) SpendCredits(runner, 1);
          else Trash(this, true);
        },
        "Fencer Fueno",
        "Pay 1[c] or trash Fencer Fueno",
        this,
      );
    },
    text: "Fencer Fueno: Pay 1[c] or trash (3+ hosted credits)",
  },
  AIEconomyInstall: function () {
    return 2;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//The Nihilist (26008)
// The first time each turn you install a virus program, place 2 virus counters on this resource.
// When your turn begins, you may remove any 2 virus counters from your installed cards. If you do, draw 2 cards unless the Corp trashes the top card of R&D.
cardSet[26008] = {
  title: "The Nihilist",
  elo: 1364,
  imageFile: "26008.png",
  player: runner,
  faction: "Anarch",
  influence: 5,
  cardType: "resource",
  subTypes: ["Connection", "Seedy"],
  installCost: 4,
  unique: true,
  // Tracked while inactive: an earlier virus install this turn uses up the "first time".
  virusInstalledThisTurn: false,
  responseOnInstall: {
    Resolve: function (card) {
      if (!card || card.player != runner || !CheckCardType(card, ["program"]) || !CheckSubType(card, "Virus")) return;
      if (this.virusInstalledThisTurn) return;
      this.virusInstalledThisTurn = true;
      if (CheckInstalled(this)) AddCounters(this, "virus", 2);
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      this.virusInstalledThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpDiscardEnds: {
    Resolve: function () {
      this.virusInstalledThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  CardsWithVirusCounters: function () {
    return InstalledCards(runner).filter(function (card) {
      return Counters(card, "virus") > 0;
    });
  },
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      var total = 0;
      var hosts = this.CardsWithVirusCounters();
      for (var i = 0; i < hosts.length; i++) total += Counters(hosts[i], "virus");
      if (total < 2) return [];
      // AI: spend only this card's own counters, which have no other use.
      if (runner.AI != null) return Counters(this, "virus") >= 2 ? [{ use: true }] : [];
      return [
        { use: true, label: "Remove 2 virus counters" },
        { use: false, label: "Do not remove counters", button: "Decline" },
      ];
    },
    Resolve: function (params) {
      if (!params.use) return;
      this.RemoveVirusCounters(2);
    },
    text: "The Nihilist: Remove 2 virus counters",
  },
  RemoveVirusCounters: function (remaining) {
    if (remaining < 1) {
      this.OfferDraw();
      return;
    }
    var choices = ChoicesArrayCards(this.CardsWithVirusCounters());
    for (var i = 0; i < choices.length; i++) choices[i].label = "Remove 1 virus counter from " + GetTitle(choices[i].card);
    if (runner.AI != null) {
      var own = this;
      choices = [choices.find(function (choice) { return choice.card == own; }) || choices[0]];
    }
    DecisionPhase(
      runner,
      choices,
      function (params) {
        RemoveCounters(params.card, "virus", 1);
        this.RemoveVirusCounters(remaining - 1);
      },
      "The Nihilist",
      "Remove a virus counter",
      this,
    );
  },
  OfferDraw: function () {
    var choices = [];
    if (corp.RnD.cards.length > 0) choices.push({ trash: true, label: "Trash the top card of R&D", button: "Trash" });
    choices.push({ trash: false, label: "Let the Runner draw 2 cards", button: "Allow draw" });
    // Corp AI: mill unless R&D is short enough for decking to matter.
    if (corp.AI != null) choices = [corp.RnD.cards.length > 5 ? choices[0] : choices[choices.length - 1]];
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (params.trash) Trash(corp.RnD.cards[corp.RnD.cards.length - 1], true, null, this, undefined, corp);
        else Draw(runner, 2);
      },
      "The Nihilist",
      "Trash the top card of R&D, or the Runner draws 2 cards",
      this,
    );
  },
  AIWorthKeeping: function () {
    var cards = InstalledCards(runner).concat(runner.grip);
    for (var i = 0; i < cards.length; i++) {
      if (cards[i] != this && CheckCardType(cards[i], ["program"]) && CheckSubType(cards[i], "Virus")) return true;
    }
    return false;
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Trickster Taka (26009)
// When your turn begins and whenever you steal an agenda, place 1[c] on this resource.
// You can spend hosted credits to use programs during runs.
// When your turn ends, if there are 3 or more hosted credits, you must take 1 tag or trash this resource.
cardSet[26009] = {
  title: "Trickster Taka",
  elo: 1659,
  imageFile: "26009.png",
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Companion", "Stealth", "Virtual"],
  installCost: 1,
  unique: true,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      PlaceCredits(this, 1);
    },
    automatic: true,
  },
  responseOnStolen: {
    Resolve: function () {
      PlaceCredits(this, 1);
    },
    automatic: true,
  },
  canUseCredits: function (doing, card) {
    return doing == "using" && attackedServer !== null && !!card && CheckCardType(card, ["program"]);
  },
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (!CheckCounters(this, "credits", 3)) return [];
      return [{}];
    },
    Resolve: function () {
      var choices = [
        { tag: true, label: "Take 1 tag", button: "Take tag" },
        { tag: false, label: "Trash Trickster Taka", button: "Trash" },
      ];
      // AI: keep it only if untagged and able to clear the tag next turn.
      if (runner.AI != null) choices = [runner.tags < 1 && Credits(runner) >= 2 ? choices[0] : choices[1]];
      DecisionPhase(
        runner,
        choices,
        function (params) {
          if (params.tag) AddTags(1);
          else Trash(this, true);
        },
        "Trickster Taka",
        "Take 1 tag or trash Trickster Taka",
        this,
      );
    },
    text: "Trickster Taka: Take 1 tag or trash (3+ hosted credits)",
  },
  // Hosted credits pay for breakers and other program abilities on any run.
  AIRunPoolCreditOffset: function (server, runEventCardToUse) {
    return this.credits || 0;
  },
  AIEconomyInstall: function () {
    return 2;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Az McCaffrey: Mechanical Prodigy (26010)
// The first job resource, connection resource, or piece of hardware you install each turn costs 1[c] less to install.
cardSet[26010] = {
  title: "Az McCaffrey: Mechanical Prodigy",
  imageFile: "26010.png",
  elo: 1521,
  player: runner,
  faction: "Criminal",
  cardType: "identity",
  subTypes: ["Cyborg"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
  //The opportunity is used by the first qualifying install even if that install
  //ignores costs or the discount was not needed.
  installedQualifyingCardThisTurn: false,
  _qualifiesForDiscount: function (card) {
    if (!card || card.player != runner) return false;
    if (CheckCardType(card, ["hardware"])) return true;
    return (
      CheckCardType(card, ["resource"]) &&
      (CheckSubType(card, "Job") || CheckSubType(card, "Connection"))
    );
  },
  modifyInstallCost: {
    Resolve: function (card) {
      if (this.installedQualifyingCardThisTurn) return 0;
      if (CheckInstalled(card)) return 0;
      if (this._qualifiesForDiscount(card)) return -1;
      return 0;
    },
  },
  automaticOnInstall: {
    Resolve: function (card) {
      if (this._qualifiesForDiscount(card))
        this.installedQualifyingCardThisTurn = true;
    },
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.installedQualifyingCardThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.installedQualifyingCardThisTurn = false;
    },
    automatic: true,
  },
};

//Always Have a Backup Plan (26011)
// Run any server. When that run ends, if it was unsuccessful, you may run the attacked server again, ignoring any additional costs to run. During the second run, whenever you encounter the last piece of ice you encountered during the first run, bypass it.
cardSet[26011] = {
  title: "Always Have a Backup Plan",
  imageFile: "26011.png",
  elo: 1312,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 2,
  //The second run waives additional run-entry costs through MakeRun.
  runningWithThis: false,
  firstRun: false,
  firstRunSuccessful: false,
  lastEncounteredIce: null,
  pendingRunServer: null,
  secondRun: false,
  bypassIce: null,
  _reset: function () {
    this.runningWithThis = false;
    this.firstRun = false;
    this.firstRunSuccessful = false;
    this.lastEncounteredIce = null;
    this.pendingRunServer = null;
    this.secondRun = false;
    this.bypassIce = null;
  },
  Enumerate: function () {
    return ChoicesExistingServers();
  },
  Resolve: function (params) {
    this._reset();
    this.runningWithThis = true;
    this.firstRun = true;
    MakeRun(params.server);
  },
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (this.runningWithThis && this.firstRun) this.lastEncounteredIce = ice;
    },
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (this.runningWithThis && this.firstRun) this.firstRunSuccessful = true;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Enumerate: function () {
      if (!this.runningWithThis || !this.firstRun || this.firstRunSuccessful)
        return [];
      var server = attackedServer;
      if (!server) return [];
      //a remote server may no longer exist
      var exists = ChoicesExistingServers().some(function (choice) {
        return choice.server == server;
      });
      if (!exists) return [];
      var choices = [
        { server: server, label: "Run " + ServerName(server) + " again", button: "Run again" },
        { server: null, label: "Do not run again", button: "Continue" },
      ];
      if (runner.AI) return [this.AIWouldRunAgain(server) ? choices[0] : choices[1]];
      return choices;
    },
    Resolve: function (params) {
      this.firstRun = false;
      this.pendingRunServer = params.server;
    },
    text: "You may run the attacked server again",
  },
  automaticOnRunEndCleanup: {
    Resolve: function (postCleanupCallbacks) {
      if (!this.runningWithThis) return;
      if (this.pendingRunServer) {
        var nextServer = this.pendingRunServer;
        var bypassIce = this.lastEncounteredIce;
        this._reset();
        this.runningWithThis = true;
        this.secondRun = true;
        this.bypassIce = bypassIce;
        postCleanupCallbacks.push(function () {
          MakeRun(nextServer, true);
        });
      } else this._reset();
    },
  },
  responseOnEncounter: {
    Enumerate: function () {
      if (!this.runningWithThis || !this.secondRun || !this.bypassIce) return [];
      if (attackedServer.ice[approachIce] != this.bypassIce) return [];
      return [{ alt: "backupplan_bypass", label: "Bypass " + GetTitle(this.bypassIce, true) }];
    },
    Resolve: function () {
      Bypass();
    },
    text: "Bypass the last ice encountered during the first run",
  },
  //AI: the bypass is a second chance after an unsuccessful run, so prefer it
  //against servers worth running that have ice capable of stopping the run.
  AIRunEventExtraPotential: function (server, potential) {
    if (server.ice.length < 1) return 0;
    if (potential > 1.5) return 0.05;
    if (potential > 0.5 && runner.AI._currentOverDraw() > runner.AI._maxOverDraw())
      return 0.01;
    return 0;
  },
  //Uses the run calculator with the second-run bypass applied.
  AIWouldRunAgain: function (server) {
    var stored = { secondRun: this.secondRun, bypassIce: this.bypassIce };
    this.secondRun = true;
    this.bypassIce = this.lastEncounteredIce;
    var path = null;
    try {
      path = runner.AI._calculateBestCompleteRun(server, 0, 0, 0, 0, null, server.ice.length - 1);
    } finally {
      this.secondRun = stored.secondRun;
      this.bypassIce = stored.bypassIce;
    }
    if (!path || path.length < 1) return false;
    return runner.AI._getCachedPotential(server) > 0;
  },
  AIEncounterOptions: function (iceIdx, iceAI) {
    if (!this.secondRun || !this.bypassIce || iceAI.ice != this.bypassIce) return [];
    return [{
      effects: [],
      persistents: [{ use: this, target: iceAI.ice, iceIdx: iceIdx, action: "bypass", alt: "backupplan_bypass" }],
    }];
  },
};

//Blueberry!™ Diesel (26012)
// Look at the top 2 cards of your stack. You may add 1 of those cards to the bottom of your stack. Draw 2 cards.
cardSet[26012] = {
  title: "Blueberry!™ Diesel",
  imageFile: "26012.png",
  elo: 1412,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    //the top of the stack is the end of the array
    var top = runner.stack.slice(-2).reverse();
    if (top.length < 1) {
      Draw(runner, 2);
      return;
    }
    var choices = top.map(function (card) {
      return { card: card, label: "Add " + GetTitle(card) + " to the bottom of your stack" };
    });
    choices.push({ card: null, label: "Leave both on top", button: "Continue" });
    if (runner.AI) choices = [choices[this.AIBottomChoice(choices)]];
    DecisionPhase(
      runner,
      choices,
      function (choice) {
        if (choice.card && runner.stack.includes(choice.card)) {
          MoveCard(choice.card, runner.stack, 0);
          Log("Runner added 1 card to the bottom of the stack");
        }
        Draw(runner, 2);
      },
      "Blueberry!™ Diesel",
      "You may add 1 card to the bottom of your stack",
      this,
    );
  },
  //Bottom a card the Runner already has enough of; otherwise keep both.
  AIBottomChoice: function (choices) {
    var keepIndex = choices.length - 1;
    var have = InstalledCards(runner).concat(runner.grip);
    for (var i = 0; i < keepIndex; i++) {
      var card = choices[i].card;
      if (card.unique && runner.AI._copyOfCardExistsIn(card.title, have, [card])) return i;
      if (CheckSubType(card, "Console") && have.some(function (c) {
        return c != card && CheckSubType(c, "Console") && CheckInstalled(c);
      })) return i;
    }
    return keepIndex;
  },
  AIWouldPlay: function () {
    return runner.stack.length > 0;
  },
  AIPlayToDraw: 2,
};

//Flip Switch (26013)
// Use this hardware only during your turn.
// [trash]: Jack out.
// [trash]: Remove 1 tag.
// [interrupt] → [trash]: Reduce the base trace strength of a trace to 0.
cardSet[26013] = {
  title: "Flip Switch",
  imageFile: "26013.png",
  elo: 1428,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "hardware",
  subTypes: [],
  installCost: 1,
  _usable: function () {
    return playerTurn == runner && CheckInstalled(this) && CheckTrash(this);
  },
  abilities: [
    {
      text: "[trash]: Jack out.",
      alt: "flipswitch_jackout",
      Enumerate: function () {
        if (!this._usable()) return [];
        if (attackedServer === null) return [];
        return [{}];
      },
      Resolve: function () {
        Trash(this, false, function () {
          if (attackedServer !== null) JackOut();
        }, this);
      },
    },
    {
      text: "[trash]: Remove 1 tag.",
      alt: "flipswitch_removetag",
      Enumerate: function () {
        if (!this._usable()) return [];
        if (runner.tags < 1) return [];
        return [{}];
      },
      Resolve: function () {
        Trash(this, false, function () {
          RemoveTags(1);
        }, this);
      },
    },
  ],
  responseOnTraceInitiated: {
    Enumerate: function (baseStrength) {
      if (!this._usable()) return [];
      if (traceStrength < 1) return [];
      //response windows require every listed trigger, so offer a decline
      var choices = [
        { use: true, label: "Trash Flip Switch: reduce the base trace strength to 0" },
        { use: false, label: "Do not use Flip Switch", button: "Continue" },
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
    text: "Flip Switch: you may reduce the base trace strength to 0",
  },
  //AI: zero a trace the Runner could not otherwise beat without paying.
  AIWouldZeroTrace: function () {
    return traceStrength > Link();
  },
  AITriggerToRemoveTags: function () {
    return "flipswitch_removetag";
  },
};

//Lucky Charm (26014)
// [interrupt] → Remove this hardware from the game: Prevent a Corp card ability from ending the run. Use this ability only if you made a successful run on HQ this turn.
cardSet[26014] = {
  title: "Lucky Charm",
  imageFile: "26014.png",
  elo: 1451,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  unique: true,
  //tracked while inactive because the condition is about the Runner's turn
  madeSuccessfulRunOnHQThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.madeSuccessfulRunOnHQThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.madeSuccessfulRunOnHQThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      //the engine passes no parameters; the run is still attacking its server
      if (attackedServer == corp.HQ) this.madeSuccessfulRunOnHQThisTurn = true;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //EndTheRun is called only by Corp card abilities (subroutines and other
  //Corp effects), so every preventable end-the-run qualifies.
  responsePreventableEndRun: {
    Enumerate: function () {
      if (!CheckInstalled(this)) return [];
      if (!this.madeSuccessfulRunOnHQThisTurn) return [];
      if (attackedServer === null || !intended.endRun) return [];
      //response windows require every listed trigger, so offer a decline
      var choices = [
        { use: true, label: "Remove Lucky Charm from the game: prevent the run from ending" },
        { use: false, label: "Do not use Lucky Charm", button: "Continue" },
      ];
      if (runner.AI) return [this.AIWouldPreventEndRun() ? choices[0] : choices[1]];
      return choices;
    },
    Resolve: function (params) {
      if (!params.use) return;
      RemoveFromGame(this);
      intended.endRun = false;
      Log("Lucky Charm prevents the run from ending");
    },
    text: "Lucky Charm: you may prevent the run from ending",
  },
  //AI: keep the run going when the attacked server is worth reaching.
  AIWouldPreventEndRun: function () {
    return runner.AI._getCachedPotential(attackedServer) > 0;
  },
};

//Masterwork (v37) (26015)
// +1[mu]
// The first time each turn you install a piece of hardware, draw 1 card.
// Whenever a run begins, you may install 1 piece of hardware from your grip, paying 1[c] more.
// Limit 1 console per player.
cardSet[26015] = {
  title: "Masterwork (v37)",
  elo: 1576,
  imageFile: "26015.png",
  player: runner,
  faction: "Criminal",
  influence: 4,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 2,
  unique: true,
  memoryUnits: 1,
  //The first time each turn you install a piece of hardware, draw 1 card.
  //TurnEventCount includes installs made before this console was active.
  responseOnInstall: {
    Enumerate: function (card) {
      if (!card || card.player != runner || !CheckCardType(card, ["hardware"])) return [];
      if (TurnEventCount("runnerHardwareInstall") != 1) return [];
      return [{}];
    },
    Resolve: function () {
      Draw(runner, 1);
    },
    text: "Masterwork (v37): Draw 1 card",
  },
  //Whenever a run begins, you may install 1 piece of hardware from your grip, paying 1[c] more.
  extraCostCard: null,
  modifyInstallCost: {
    Resolve: function (card) {
      if (card == this.extraCostCard) return 1;
      return 0;
    },
    automatic: true,
  },
  // Evaluate a hypothetical run-start install without leaking its surcharge.
  _withExtraCostCard: function (card, evaluate) {
    var previous = this.extraCostCard;
    this.extraCostCard = card;
    try {
      return evaluate(card);
    } finally {
      this.extraCostCard = previous;
    }
  },
  _runInstallChoices: function () {
    var ret = [];
    for (var i = 0; i < runner.grip.length; i++) {
      if (!CheckCardType(runner.grip[i], ["hardware"])) continue;
      ret = ret.concat(this._withExtraCostCard(runner.grip[i], function (card) {
        return ChoicesCardInstall(card);
      }));
    }
    return ret;
  },
  responseOnRunBegins: {
    Enumerate: function () {
      var choices = this._runInstallChoices();
      if (choices.length < 1) return [];
      var decline = {card: null, label: "Continue without install", button: "Continue without install"};
      if (runner.AI) return [this._aiRunInstallChoice(choices) || decline];
      return choices.concat([decline]);
    },
    Resolve: function (params) {
      if (!params.card) return;
      var cardRef = this;
      var clearExtraCost = function () {
        cardRef.extraCostCard = null;
      };
      this.extraCostCard = params.card;
      Install(params.card, params.host || null, false, null, true, undefined, this,
        clearExtraCost, clearExtraCost, true, clearExtraCost);
    },
    text: "Masterwork (v37): You may install 1 piece of hardware",
  },
  //AI: install hardware it would keep anyway, if the planned run stays affordable after paying
  _aiRunInstallChoice: function (choices) {
    if (!runner.AI.cachedBestPath || runner.AI.cachedPathServer != attackedServer) return null;
    var path = runner.AI.cachedBestPath;
    var runCreditCost = 0;
    if (path.length > 0)
      runCreditCost = path[path.length - 1].runner_credits_spent + path[path.length - 1].runner_credits_lost;
    var worthKeeping = runner.AI._cardsInHandWorthKeeping();
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      if (!worthKeeping.includes(card)) continue;
      if (typeof card.AIPreferredInstallChoice == "function" && card.AIPreferredInstallChoice([choices[i]]) < 0) continue;
      var host = choices[i].host || null;
      var cost = this._withExtraCostCard(card, function (target) {
        return InstallCost(target, host);
      });
      if (AvailableCredits(runner, "installing", card) - cost < runCreditCost) continue;
      return choices[i];
    }
    return null;
  },
};

//“Baklan” Bochkin (26017)
// The first time you encounter a piece of ice during each run, place 1 power counter on this resource.
// [trash], X hosted power counters: Derez the ice you are encountering if its strength is X or less. Take 1 tag.
cardSet[26017] = {
  title: "“Baklan” Bochkin",
  trashAbility: true, //[trash] ability (HasTrashAbility)
  elo: 1448,
  imageFile: "26017.png",
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  unique: true,
  power: 0,
  //The first time you encounter a piece of ice during each run, place 1 power counter on this resource.
  encounteredThisRun: false,
  automaticOnRunBegins: {
    Resolve: function () {
      this.encounteredThisRun = false;
    },
  },
  automaticOnEncounter: {
    Resolve: function () {
      if (this.encounteredThisRun) return;
      this.encounteredThisRun = true;
      AddCounters(this, "power", 1);
    },
  },
  //[trash], X hosted power counters: Derez the ice you are encountering if its strength is X or less. Take 1 tag.
  //Only X equal to the ice's strength is offered: the card is trashed either way, so a larger X gains nothing.
  abilities: [
    {
      text: "Derez the ice you are encountering. Take 1 tag.",
      alt: "baklan_derez",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        var ice = GetApproachEncounterIce();
        if (!ice || !ice.rezzed) return [];
        var x = Math.max(0, Strength(ice));
        if (!CheckCounters(this, "power", x)) return [];
        return [{id: x, label: "Remove " + x + " power counter" + (x == 1 ? "" : "s"), button: "Derez"}];
      },
      Resolve: function (params) {
        var ice = GetApproachEncounterIce();
        var x = params.id;
        RemoveCounters(this, "power", x);
        Trash(this, false, function () {
          if (ice && ice.rezzed && Strength(ice) <= x) Derez(ice);
          AddTags(1);
        }, this);
      },
    },
  ],
  //AI: a one-shot derez acts like a bypass of the encountered ice, costing this card and a tag
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (rc.PersistentsUse(point, this)) return result; //already trashed earlier in this run
    var counters = Counters(this, "power");
    if (!this.encounteredThisRun || !attackedServer) counters++; //the first encounter of the run adds one first
    if (Math.max(0, iceStrength) > counters) return result;
    if (runner.AI && runner.AI._getCachedPotential(server) < 1.5) return result; //save it for valuable runs
    var pointCopy = rc.CopyPoint(point);
    pointCopy.persistents = pointCopy.persistents.concat([
      {use: this, target: iceAI.ice, iceIdx: point.iceIdx, action: "bypass", alt: "baklan_derez"},
    ]);
    pointCopy.effects = pointCopy.effects.concat([["tag", "misc_moderate"]]);
    return result.concat([pointCopy]);
  },
  AIWorthKeeping: function () {
    return true; //cheap, accumulates a single-use answer to ice
  },
};

//The Class Act (26018)
// When a discard phase ends, if you installed this resource this turn, draw 4 cards.
// [interrupt] → The first time each turn you would draw any number of cards, look at the top X cards of your stack. Add 1 of those cards to the bottom of your stack. X is equal to the number of cards you would draw plus 1.
cardSet[26018] = {
  title: "The Class Act",
  elo: 1942,
  imageFile: "26018.png",
  player: runner,
  faction: "Criminal",
  influence: 5,
  cardType: "resource",
  subTypes: ["Connection", "Ritzy"],
  installCost: 4,
  unique: true,
  //When a discard phase ends, if you installed this resource this turn, draw 4 cards.
  installedThisTurn: false,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) this.installedThisTurn = true;
    },
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.installedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.installedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (!this.installedThisTurn) return [];
      return [{}];
    },
    Resolve: function () {
      Draw(runner, 4);
    },
    text: "The Class Act: Draw 4 cards",
  },
  responseOnCorpDiscardEnds: {
    Enumerate: function () {
      if (!this.installedThisTurn) return [];
      return [{}];
    },
    Resolve: function () {
      Draw(runner, 4);
    },
    text: "The Class Act: Draw 4 cards",
  },
  //Interrupt -> The first time each turn you would draw any number of cards, look at the top X cards
  //of your stack. Add 1 of those cards to the bottom of your stack. X is the number you would draw plus 1.
  //Draw moves the cards before its responses, so this resolves as the equivalent choice afterwards:
  //the drawn cards plus the new top card of the stack. Choosing a drawn card swaps it for that top card.
  //With no card left in the stack, every looked-at card would be drawn anyway, so nothing changes.
  responseOnCardsDrawn: {
    Enumerate: function (cards) {
      if (TurnEventCount("runnerDraw") != 1) return [];
      if (!cards || cards.length < 1 || cards[0].player != runner) return [];
      if (runner.stack.length < 1) return [];
      var looked = cards.filter(function (card) {
        return runner.grip.includes(card);
      });
      if (looked.length < cards.length) return []; //a drawn card already left the grip
      looked.push(runner.stack[runner.stack.length - 1]);
      var choices = ChoicesArrayCards(looked);
      choices.forEach(function (choice) {
        choice.label = "Bottom of stack: " + GetTitle(choice.card, true);
        choice.button = choice.label;
      });
      if (runner.AI) return [choices[this._aiBottomIndex(looked)]];
      return choices;
    },
    Resolve: function (params) {
      var top = runner.stack[runner.stack.length - 1];
      MoveCard(params.card, runner.stack, 0); //bottom of the stack
      if (params.card != top) MoveCard(top, runner.grip);
      Log("The Class Act: a card was added to the bottom of the stack");
    },
    text: "The Class Act: Add 1 card to the bottom of your stack",
  },
  //AI: send the least useful card to the bottom
  _aiBottomIndex: function (cards) {
    var keep = runner.AI._cardsWorthKeeping(cards);
    var alreadyHave = InstalledCards(runner).concat(runner.grip);
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].unique && runner.AI._copyOfCardExistsIn(cards[i].title, alreadyHave, [cards[i]])) return i;
    }
    for (var i = 0; i < cards.length; i++) {
      if (!keep.includes(cards[i])) return i;
    }
    var lowest = 0;
    for (var i = 1; i < cards.length; i++) {
      if ((cards[i].elo || 1500) < (cards[lowest].elo || 1500)) lowest = i;
    }
    return lowest;
  },
  AIDrawInstall: function () {
    return 2; //four cards at the end of the turn
  },
  AIWorthKeeping: function () {
    return runner.grip.length < 4;
  },
};

//Lat: Ethical Freelancer (26019)
// When your discard phase ends, if you have the same number of cards in your grip as the Corp has in HQ, you may draw 1 card.
cardSet[26019] = {
  title: "Lat: Ethical Freelancer",
  imageFile: "26019.png",
  elo: 1766,
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (runner.grip.length != corp.HQ.cards.length) return [];
      var choices = [
        { id: 1, label: "Draw 1 card", button: "Draw 1" },
        { id: 0, label: "Do not draw", button: "Pass" },
      ];
      //**AI code: an extra card at the end of the turn is always useful
      if (runner.AI != null) return [choices[0]];
      return choices;
    },
    Resolve: function (params) {
      if (params && params.id === 1) Draw(runner, 1);
    },
    text: "Lat: Draw 1 card?",
  },
};

//In the Groove (26020)
// Play only as your first [click].
// For the remainder of this turn, whenever you install a card with a printed install cost of 1[c] or greater, draw 1 card or gain 1[c].
cardSet[26020] = {
  title: "In the Groove",
  imageFile: "26020.png",
  elo: 1477,
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "event",
  subTypes: ["Priority"],
  playCost: 0,
  grooveActive: false,
  Enumerate: function () {
    if (ClicksSpentThisTurn(runner) > 0) return [];
    return [{}];
  },
  Resolve: function (params) {
    this.grooveActive = true;
  },
  // The lingering effect lives on this card, which is in the heap by then.
  responseOnInstall: {
    Enumerate: function (card) {
      if (!this.grooveActive || !card || card.player != runner) return [];
      if (!(card.installCost >= 1)) return [];
      var choices = [
        { id: 0, label: "Draw 1 card", button: "Draw 1" },
        { id: 1, label: "Gain 1[c]", button: "Gain 1[c]" },
      ];
      //**AI code
      if (runner.AI != null) return [choices[this._grooveChoice()]];
      return choices;
    },
    Resolve: function (params) {
      if (params && params.id === 1) GainCredits(runner, 1, "", this);
      else Draw(runner, 1);
    },
    text: "In the Groove: Draw 1 card or gain 1[c]",
    availableWhenInactive: true,
  },
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      this.grooveActive = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.grooveActive = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  // Grip cards with a printed cost of 1 or more the AI wants installed and
  // can pay for this turn, cheapest first.
  _grooveInstalls: function () {
    var installs = [];
    var keeping = runner.AI ? runner.AI._cardsInHandWorthKeeping() : [];
    for (var i = 0; i < keeping.length; i++) {
      var card = keeping[i];
      if (card.cardType == "event" || !(card.installCost >= 1)) continue;
      if (!CheckInstall(card) || ChoicesCardInstall(card).length < 1) continue;
      installs.push(card);
    }
    installs.sort(function (a, b) {
      return InstallCost(a) - InstallCost(b);
    });
    var credits = AvailableCredits(runner);
    var affordable = [];
    for (var j = 0; j < installs.length && affordable.length < runner.clickTracker - 1; j++) {
      var cost = InstallCost(installs[j]);
      if (cost > credits) break;
      credits -= cost;
      affordable.push(installs[j]);
    }
    return affordable;
  },
  _grooveChoice: function () {
    if (runner.AI._currentOverDraw() + 1 > runner.AI._maxOverDraw()) return 1;
    if (Credits(runner) < 4) return 1;
    return 0;
  },
  AIWouldPlay: function () {
    // Costs a click; it pays off from the second triggering install.
    return this._grooveInstalls().length >= 2;
  },
  AIPlayWhenCan: 1,
};

//Khusyuk (26021)
// Run R&D. If successful, instead of breaching R&D, choose an install cost greater than 0[c]. The Corp sets aside the top X cards of R&D faceup, where X is equal to the number of your installed cards with that printed install cost, up to 6. Access 1 of the set-aside cards. The Corp shuffles the set-aside cards into R&D.
cardSet[26021] = {
  title: "Khusyuk",
  imageFile: "26021.png",
  elo: 1491,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  runningWithThis: false,
  breachReplacementQueued: false,
  restrictAccessToSetAside: false,
  Resolve: function (params) {
    this.runningWithThis = true;
    this.breachReplacementQueued = false;
    MakeRun(corp.RnD);
  },
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      this.breachReplacementQueued = this.runningWithThis && server === corp.RnD;
    },
  },
  specialOnInsteadOfBreaching: {
    Enumerate: function () {
      return this.breachReplacementQueued ? [{ required: true }] : [];
    },
    Resolve: function () {
      this.breachReplacementQueued = false;
      var counts = this._khusyukCostCounts();
      var choices = [];
      var costs = Object.keys(counts).map(Number).sort(function (a, b) {
        return a - b;
      });
      for (var i = 0; i < costs.length; i++) {
        var x = Math.min(6, counts[costs[i]]);
        choices.push({
          id: costs[i],
          x: x,
          label: costs[i] + "[c] (" + x + " card" + (x == 1 ? "" : "s") + ")",
          button: costs[i] + "[c]",
        });
      }
      if (choices.length < 1) {
        // No installed card has a printed cost above 0, so X is 0.
        Log(GetTitle(this) + ": no cards set aside");
        return;
      }
      //**AI code: the cost with the most installed cards
      if (runner.AI != null) {
        var best = choices[0];
        for (var j = 1; j < choices.length; j++) {
          if (choices[j].x > best.x) best = choices[j];
        }
        choices = [best];
      }
      DecisionPhase(
        runner,
        choices,
        function (params) {
          this.KhusyukSetAsideAndAccess(params.x);
        },
        "Khusyuk",
        "Choose an install cost",
        this,
      );
    },
  },
  // Printed install costs above 0 of installed Runner cards, with how many share each.
  _khusyukCostCounts: function () {
    var counts = {};
    var installed = InstalledCards(runner);
    for (var i = 0; i < installed.length; i++) {
      var cost = installed[i].installCost;
      if (typeof cost === "number" && cost > 0) counts[cost] = (counts[cost] || 0) + 1;
    }
    return counts;
  },
  // The set-aside cards stay on top of R&D, faceup, until they are shuffled in.
  KhusyukSetAsideAndAccess: function (x) {
    var setAside = corp.RnD.cards.slice(-Math.min(x, corp.RnD.cards.length)).reverse();
    if (setAside.length < 1) return;
    for (var i = 0; i < setAside.length; i++) {
      setAside[i].faceUp = true;
      setAside[i].knownToRunner = true;
    }
    Log(
      "Set aside " +
        setAside
          .map(function (card) {
            return GetTitle(card, true);
          })
          .join(", "),
    );
    var khusyuk = this;
    var choices = ChoicesArrayCards(setAside);
    //**AI code
    if (runner.AI != null) choices = [choices[this._khusyukAccessChoice(choices)]];
    DecisionPhase(
      runner,
      choices,
      function (params) {
        khusyuk.restrictAccessToSetAside = true;
        khusyuk.setAsideCards = setAside;
        // The breach replacement resolves inside Run 6.4, whose automatic
        // triggers have already fired: return there without re-initialising it.
        phases.runAccessingCard.next = {
          player: runner,
          title: "Run: End",
          identifier: "Run 6.4",
          Init: function () {
            phases.runAccessingCard.next = phases.runEnds;
            khusyuk.restrictAccessToSetAside = false;
            khusyuk.KhusyukShuffleIn();
            ChangePhase(phases.runEnds, true);
          },
        };
        accessingCard = params.card;
        phases.runAccessingCard.requireHumanInput = true;
        ChangePhase(phases.runAccessingCard);
      },
      "Khusyuk",
      "Access 1 of the set-aside cards",
      this,
    );
  },
  KhusyukShuffleIn: function () {
    if (!this.setAsideCards) return;
    for (var i = 0; i < this.setAsideCards.length; i++) {
      if (this.setAsideCards[i].cardLocation == corp.RnD.cards) this.setAsideCards[i].faceUp = false;
    }
    this.setAsideCards = null;
    Shuffle(corp.RnD.cards);
    // Positions in R&D are no longer known.
    for (var j = 0; j < corp.RnD.cards.length; j++) corp.RnD.cards[j].knownToRunner = false;
    Log("The set-aside cards are shuffled into R&D");
  },
  // Only the chosen set-aside card is accessed: no R&D root or further cards.
  modifyAccessCardAllowed: {
    Resolve: function (card) {
      return this.restrictAccessToSetAside ? 1 : 0;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  // Not responseOnRunEnds: its automatic triggers fire before breach replacements.
  automaticOnRunEndCleanup: {
    Resolve: function () {
      if (phases.runAccessingCard.next != phases.runEnds) phases.runAccessingCard.next = phases.runEnds;
      this.KhusyukShuffleIn();
      this.runningWithThis = false;
      this.breachReplacementQueued = false;
      this.restrictAccessToSetAside = false;
    },
    availableWhenInactive: true,
  },
  // Agendas first (most points), then a card worth trashing, otherwise the first.
  _khusyukAccessChoice: function (choices) {
    var best = 0;
    var bestScore = -Infinity;
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      var score = 0;
      if (CheckCardType(card, ["agenda"])) score = 100 + AgendaPointsForCard(card, runner);
      else if (typeof card.trashCost !== "undefined" && TrashCost(card) <= Credits(runner) - 3) score = 10 - TrashCost(card);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  },
  AIBreachReplacementValue: 2,
  AIRunEventExtraPotential: function (server, potential) {
    if (server != corp.RnD || corp.RnD.cards.length < 2) return 0;
    if (ServerSuccessfulRunPrevented(server)) return 0;
    var counts = this._khusyukCostCounts();
    var x = 0;
    for (var cost in counts) x = Math.max(x, Math.min(6, counts[cost]));
    x = Math.min(x, corp.RnD.cards.length);
    // Choosing 1 of X cards instead of the top card.
    if (x < 2) return 0;
    return 0.4 * (x - 1);
  },
};

//Spec Work (26022)
// As an additional cost to play this event, trash 1 installed program.
// Gain 4[c] and draw 2 cards.
cardSet[26022] = {
  title: "Spec Work",
  imageFile: "26022.png",
  elo: 1585,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: ["Job"],
  playCost: 1,
  Enumerate: function () {
    var choices = ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["program"]) && CheckTrash(card);
    });
    //**AI code: only the program it is willing to trash
    if (runner.AI != null && choices.length > 0) {
      var index = this.AIPreferredPlayChoice(choices);
      return index > -1 ? [choices[index]] : [];
    }
    return choices;
  },
  Resolve: function (params) {
    var specWork = this;
    // Trashing is a cost, so it cannot be prevented.
    Trash(
      params.card,
      false,
      function () {
        GainCredits(runner, 4, "", specWork);
        Draw(runner, 2);
      },
      this,
    );
  },
  // A program marked OK to trash, otherwise a non-icebreaker costing 1 or less,
  // otherwise an icebreaker another installed breaker duplicates.
  AIPreferredPlayChoice: function (choices) {
    var cheapest = -1;
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      if (typeof card.AIOkToTrash === "function" && card.AIOkToTrash.call(card)) return i;
      if (!CheckSubType(card, "Icebreaker") && InstallCost(card) <= 1) {
        if (cheapest < 0 || InstallCost(card) < InstallCost(choices[cheapest].card)) cheapest = i;
      }
    }
    if (cheapest > -1) return cheapest;
    for (var j = 0; j < choices.length; j++) {
      var breaker = choices[j].card;
      if (!CheckSubType(breaker, "Icebreaker")) continue;
      var duplicated = InstalledCards(runner).some(function (other) {
        if (other == breaker || !CheckSubType(other, "Icebreaker")) return false;
        if (other.title == breaker.title) return true;
        return ["Fracter", "Decoder", "Killer"].some(function (type) {
          return CheckSubType(breaker, type) && CheckSubType(other, type);
        });
      });
      if (duplicated) return j;
    }
    return -1;
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  AIEconomyPlay: 2,
  AIPlayToDraw: 2,
};

//Supercorridor (26023)
// +2[mu]
// You get +1 maximum hand size.
// When your turn ends, if you and the Corp have the same number of credits, you may gain 2[c].
// Limit 1 console per player.
cardSet[26023] = {
  title: "Supercorridor",
  imageFile: "26023.png",
  elo: 1295,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 4,
  unique: true,
  memoryUnits: 2,
  modifyMaxHandSize: {
    Resolve: function (player) {
      if (player == runner) return 1;
      return 0;
    },
  },
  // "When your turn ends" triggers with "when your discard phase ends" (Runner 2.3).
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (runner.creditPool != corp.creditPool) return [];
      var choices = [
        { id: 1, label: "Gain 2 credits", button: "Gain 2[c]" },
        { id: 0, label: "Do not gain credits", button: "Pass" },
      ];
      //**AI code: always take the credits
      if (runner.AI != null) return [choices[0]];
      return choices;
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        Log(
          GetTitle(this) +
            " triggers (credits equal at " +
            runner.creditPool +
            "[c]), gaining 2[c]",
        );
        GainCredits(runner, 2, "", this);
      }
    },
    text: "Supercorridor: Gain 2 credits?",
  },
};

//Gauss (26024)
// When you install this program, it gets +3 strength for the remainder of the turn.
// Interface → 1[c]: Break 1 barrier subroutine.
// 2[c]: +2 strength.
cardSet[26024] = {
  title: "Gauss",
  elo: 1639,
  imageFile: "26024.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 2,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  installedTurnBonus: false,
  //When you install this program, it gets +3 strength for the remainder of the turn.
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) this.installedTurnBonus = true;
    },
  },
  //The turn ends after its discard step.
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      this.installedTurnBonus = false;
    },
    automatic: true,
  },
  responseOnCorpDiscardEnds: {
    Resolve: function () {
      this.installedTurnBonus = false;
    },
    automatic: true,
  },
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) {
        var str = this.strengthBoost;
        if (this.installedTurnBonus) str += 3;
        return str;
      }
      return 0;
    },
  },
  abilities: [
    {
      text: "Break 1 barrier subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier"))
          return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            Break(params.subroutine);
          },
          this,
        );
      },
    },
    {
      text: "+2 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier"))
          return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        return [{}];
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          2,
          "using",
          this,
          function () {
            BoostStrength(this, 2);
          },
          this,
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
  AIImplementBreaker: function (
    rc,
    result,
    point,
    server,
    cardStrength,
    iceAI,
    iceStrength,
    clicksLeft,
    creditsLeft,
  ) {
    result = result.concat(
      rc.ImplementIcebreaker(
        point,
        this,
        cardStrength,
        iceAI,
        iceStrength,
        ["Barrier"],
        2, // cost to boost
        2, // amount to boost
        1, // cost to break
        1, // amount to break
        creditsLeft,
      ),
    );
    return result;
  },
  AIPreferredInstallChoice: function (choices) {
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Fracter")) {
        return spareMU >= 2;
      }
    }
    return true;
  },
};

//Pelangi (26025)
// When you install this program, place 2 virus counters on it.
// Once per turn → Hosted virus counter: Choose an ice subtype. The ice you are encountering gains that subtype for the remainder of this encounter.
cardSet[26025] = {
  title: "Pelangi",
  elo: 1604,
  imageFile: "26025.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 1,
  memoryCost: 1,
  usedThisTurn: false,
  //the subtype effect currently applied (a lingering effect, so it outlasts this program)
  encounterEffect: null,
  //When you install this program, place 2 virus counters on it.
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) AddCounters(this, "virus", 2);
    },
  },
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
  //Every ice subtype in the card pool; the breaker-matching subtypes first.
  IceSubTypeChoices: function () {
    var first = ["Barrier", "Code Gate", "Sentry"];
    if (!this._pooledIceSubTypes) {
      var pooled = [];
      for (var id in cardSet) {
        var def = cardSet[id];
        if (def && def.cardType == "ice" && def.subTypes) pooled = pooled.concat(def.subTypes);
      }
      this._pooledIceSubTypes = pooled;
    }
    var others = [];
    var add = function (card) {
      if (!card || card.cardType != "ice" || !card.subTypes) return;
      for (var i = 0; i < card.subTypes.length; i++) {
        var st = card.subTypes[i];
        if (!first.includes(st) && !others.includes(st)) others.push(st);
      }
    };
    add({ cardType: "ice", subTypes: this._pooledIceSubTypes });
    InstalledCards(corp).forEach(add);
    return first.concat(others.sort());
  },
  abilities: [
    {
      text: "Hosted virus counter: The encountered ice gains a subtype for the remainder of this encounter.",
      Enumerate: function () {
        if (this.usedThisTurn) return [];
        if (!CheckEncounter()) return [];
        if (!CheckCounters(this, "virus", 1)) return [];
        var ice = GetApproachEncounterIce();
        if (!ice) return [];
        //choosing a subtype the ice already has would change nothing
        return this.IceSubTypeChoices()
          .filter(function (st) {
            return !CheckSubType(ice, st);
          })
          .map(function (st) {
            return { subType: st, label: st, alt: "pelangi_" + st };
          });
      },
      Resolve: function (params) {
        this.usedThisTurn = true;
        RemoveCounters(this, "virus", 1);
        var effect = {
          ice: GetApproachEncounterIce(),
          subType: params.subType,
          modifySubTypes: {
            Resolve: function (card) {
              if (card == this.ice) return { add: [this.subType] };
              return {};
            },
            automatic: true,
          },
          responseOnEncounterEnds: {
            Resolve: function () {
              RemoveLingeringEffect(this);
            },
            automatic: true,
          },
          responseOnRunEnds: {
            Resolve: function () {
              RemoveLingeringEffect(this);
            },
            automatic: true,
          },
        };
        this.encounterEffect = effect;
        AddLingeringEffect(effect);
        Log(GetTitle(effect.ice, true) + " gains " + params.subType + " for the remainder of this encounter");
      },
    },
  ],
  //Live encounters: the Run Calculator reads printed subtypes, so add the applied one.
  AIModifyIceAI: function (iceAI, startIceIdx) {
    var effect = this.encounterEffect;
    if (!effect || !lingeringEffects.includes(effect) || iceAI.ice != effect.ice) return iceAI;
    if (!iceAI.subTypes.includes(effect.subType))
      iceAI.subTypes = iceAI.subTypes.concat([effect.subType]);
    return iceAI;
  },
  //Run Calculator: before any other action on this ice, spend a counter so an
  //installed breaker's type applies. Once per turn, so once per route.
  AIEncounterAbility: function (rc, result, point, iceAI) {
    if (this.usedThisTurn || !CheckCounters(this, "virus", 1)) return result;
    if (rc.PersistentsUse(point, this)) return result;
    if (point.sr_broken.length > 0) return result;
    for (var i = 0; i < point.card_str_mods.length; i++) {
      if (point.card_str_mods[i].iceIdx == point.iceIdx) return result;
    }
    var breakerTypes = { Fracter: "Barrier", Decoder: "Code Gate", Killer: "Sentry" };
    var breakers = rc.precalculated.activeCards.concat(rc.bonusBreaker ? [rc.bonusBreaker.card] : []);
    var gained = [];
    for (var j = 0; j < breakers.length; j++) {
      if (!CheckSubType(breakers[j], "Icebreaker")) continue;
      for (var type in breakerTypes) {
        var st = breakerTypes[type];
        if (CheckSubType(breakers[j], type) && !iceAI.subTypes.includes(st) && !gained.includes(st))
          gained.push(st);
      }
    }
    for (var k = 0; k < gained.length; k++) {
      var p = rc.CopyPoint(point);
      p.virus_counters_spent += 1;
      //the first persistent triggers the ability, the second picks the subtype
      p.persistents = p.persistents.concat([
        { use: this, target: iceAI.ice, iceIdx: point.iceIdx, addSubTypes: [gained[k]] },
        { use: this, iceIdx: point.iceIdx, alt: "pelangi_" + gained[k] },
      ]);
      result.push(p);
    }
    return result;
  },
  AIOkToTrash: function () {
    return !CheckCounters(this, "virus", 1);
  },
  AIWastefulToInstall: function () {
    return runner.rig.programs.some(function (card) {
      return card.title == "Pelangi" && CheckCounters(card, "virus", 1);
    });
  },
};

//The Artist (26027)
// Once per turn → [click]: Gain 2[c].
// Once per turn → [click]: Install 1 program or piece of hardware from your grip, paying 1[c] less.
cardSet[26027] = {
  title: "The Artist",
  elo: 1334,
  imageFile: "26027.png",
  player: runner,
  faction: "Shaper",
  influence: 5,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 4,
  unique: true,
  usedCreditThisTurn: false,
  usedInstallThisTurn: false,
  //true while listing grip installs; the chosen card keeps the discount while it installs
  _discountActive: false,
  _discountCard: null,
  //AI: the card to install, set by AIInstallDiscountAbility
  _aiInstallTarget: null,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedCreditThisTurn = false;
      this.usedInstallThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedCreditThisTurn = false;
      this.usedInstallThisTurn = false;
    },
    automatic: true,
  },
  modifyInstallCost: {
    Resolve: function (card) {
      if (!card || !CheckCardType(card, ["program", "hardware"])) return 0;
      if (this._discountActive && runner.grip.includes(card)) return -1;
      if (card == this._discountCard) return -1;
      return 0;
    },
  },
  InstallChoices: function () {
    var previous = this._discountActive;
    this._discountActive = true;
    try {
      return ChoicesHandInstall(runner, false, function (card) {
        return CheckCardType(card, ["program", "hardware"]);
      });
    } finally {
      this._discountActive = previous;
    }
  },
  abilities: [
    {
      text: "[click]: Gain 2[c].",
      Enumerate: function () {
        if (this.usedCreditThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        this.usedCreditThisTurn = true;
        GainCredits(runner, 2, "", this);
      },
    },
    {
      text: "[click]: Install 1 program or piece of hardware from your grip, paying 1[c] less.",
      alt: "artist_install",
      Enumerate: function () {
        if (this.usedInstallThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        var choices = this.InstallChoices();
        var target = this._aiInstallTarget;
        if (runner.AI != null && target) {
          var targeted = choices.filter(function (choice) {
            return choice.card == target.card && (choice.host || null) == target.host;
          });
          if (targeted.length > 0) return targeted;
        }
        return choices;
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this.usedInstallThisTurn = true;
        this._aiInstallTarget = null;
        var artist = this;
        var finish = function () {
          artist._discountCard = null;
        };
        this._discountCard = params.card;
        Install(params.card, params.host, false, null, true, null, this, finish, null, false, finish);
      },
    },
  ],
  //AI: click for 2 credits beats the basic action; the install ability is
  //used through AIInstallDiscountAbility instead of as economy.
  AIEconomyTrigger: 3,
  AIWouldTrigger: function () {
    return !this.usedCreditThisTurn;
  },
  AIInstallDiscountAbility: function (card, host) {
    if (this.usedInstallThisTurn || !CheckCardType(card, ["program", "hardware"])) return null;
    if (!runner.grip.includes(card) || !CheckActionClicks(runner, 1)) return null;
    host = host || null;
    var listed = this.InstallChoices().some(function (choice) {
      return choice.card == card && (choice.host || null) == host;
    });
    if (!listed) return null;
    var artist = this;
    return {
      alt: "artist_install",
      discount: 1,
      select: function () {
        artist._aiInstallTarget = { card: card, host: host };
      },
    };
  },
  AIEconomyInstall: function () {
    return 1;
  },
};

//Direct Access (26028)
// While you are resolving this event, each playerʼs identity loses all abilities.
// Run any server. When that run ends, you may shuffle this event into your stack.
cardSet[26028] = {
  title: "Direct Access",
  elo: 1337,
  imageFile: "26028.png",
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 1,
  //true from resolution until the run-end ability resolves (also set for AI run hypotheticals)
  blankingIdentities: false,
  Enumerate: function () {
    return ChoicesExistingServers();
  },
  Resolve: function (params) {
    this.blankingIdentities = true;
    MakeRun(params.server);
  },
  //While you are resolving this event, each player's identity loses all abilities.
  modifyHasAbilities: {
    Resolve: function (card) {
      if (!this.blankingIdentities) return true;
      return card != corp.identityCard && card != runner.identityCard;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //When that run ends, you may shuffle this event into your stack.
  responseOnRunEnds: {
    Enumerate: function () {
      if (!this.blankingIdentities) return [];
      return [{}];
    },
    Resolve: function () {
      var choices = [
        { shuffle: true, label: "Shuffle Direct Access into your stack", button: "Shuffle into stack" },
        { shuffle: false, label: "Decline", button: "Decline" },
      ];
      if (runner.AI != null)
        runner.AI.preferred = { title: "Direct Access", option: choices[this.ShufflesBackForAI() ? 0 : 1] };
      DecisionPhase(
        runner,
        choices,
        function (params) {
          //the event finishes resolving with this ability
          this.blankingIdentities = false;
          if (params.shuffle && this.cardLocation == runner.resolvingCards) {
            MoveCard(this, runner.stack);
            Shuffle(runner.stack);
            Log("Direct Access shuffled into the stack");
          }
        },
        "Direct Access",
        "Shuffle Direct Access into your stack?",
        this,
      );
    },
    text: "Shuffle Direct Access into your stack",
  },
  ShufflesBackForAI: function () {
    return true;
  },
  //AI: the run calculator sees both identities blank while modelling this run
  AIRunEventModify: function (server) {
    this._storedBlanking = this.blankingIdentities;
    this.blankingIdentities = true;
  },
  AIRunEventRestore: function (server) {
    this.blankingIdentities = this._storedBlanking;
  },
  //Identities with run-time effects; printed link is not an ability.
  IdentityHasRunEffects: function (identity) {
    if (!identity) return false;
    for (var key in identity) {
      if (typeof identity[key] != "object" || identity[key] === null) continue;
      if (/^(responseOn|automaticOn|modify|interruptOn)/.test(key)) return true;
    }
    return false;
  },
  AIRunEventExtraPotential: function (server, potential) {
    if (ServerSuccessfulRunPrevented(server)) return 0;
    if (potential < 0.5) return 0;
    //worth 1 credit only when it blanks a Corp identity without blanking a Runner one
    if (!this.IdentityHasRunEffects(corp.identityCard)) return 0;
    if (this.IdentityHasRunEffects(runner.identityCard)) return 0;
    return 0.2;
  },
};

//Rejig (26029)
// As an additional cost to play this event, add 1 installed program or piece of hardware to your grip.
// Install 1 program or piece of hardware from your grip, paying X[c] less. X is equal to the printed install cost of the card you added to your grip.
cardSet[26029] = {
  title: "Rejig",
  elo: 1552,
  imageFile: "26029.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "event",
  subTypes: ["Mod"],
  playCost: 0,
  rejigDiscount: 0,
  rejigInstalling: null,
  _aiPlan: null,
  //As an additional cost to play this event, add 1 installed program or piece of hardware to your grip.
  Enumerate: function () {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["program", "hardware"]);
    });
  },
  Resolve: function (params) {
    var rejig = this;
    //X is the printed install cost of the returned card
    var discount = Number(params.card.installCost) || 0;
    Uninstall(params.card, runner.grip, function () {
      rejig.rejigDiscount = discount;
      var choices = ChoicesHandInstall(runner, false, function (card) {
        return CheckCardType(card, ["program", "hardware"]);
      });
      var plan = rejig._aiPlan;
      rejig._aiPlan = null;
      if (choices.length < 1) {
        rejig.rejigDiscount = 0;
        Log("Rejig: no program or hardware can be installed");
        return;
      }
      if (runner.AI != null && plan) {
        var planned = choices.filter(function (choice) {
          return choice.card == plan.installCard;
        });
        if (planned.length > 0) choices = planned;
      }
      var finish = function () {
        rejig.rejigDiscount = 0;
        rejig.rejigInstalling = null;
      };
      DecisionPhase(
        runner,
        choices,
        function (installParams) {
          rejig.rejigInstalling = installParams.card;
          Install(installParams.card, installParams.host, false, null, true, null, rejig, finish, null, false, finish);
        },
        "Rejig",
        "Install 1 program or piece of hardware, paying " + discount + "[c] less",
        rejig,
        "install",
      );
    });
  },
  //Install 1 program or piece of hardware from your grip, paying X[c] less.
  modifyInstallCost: {
    Resolve: function (card) {
      if (this.rejigDiscount < 1 || !card || !CheckCardType(card, ["program", "hardware"])) return 0;
      if (this.rejigInstalling ? card == this.rejigInstalling : runner.grip.includes(card))
        return -this.rejigDiscount;
      return 0;
    },
  },
  //AI: return a spent or obsolete card and install the most expensive useful
  //card that fits; reinstalling the returned card itself refreshes install effects.
  ChooseAIPlan: function () {
    var best = null;
    var returns = this.Enumerate();
    var credits = AvailableCredits(runner, "installing");
    for (var i = 0; i < returns.length; i++) {
      var back = returns[i].card;
      if (typeof back.AIOkToTrash != "function" || !back.AIOkToTrash.call(back)) continue;
      var discount = Number(back.installCost) || 0;
      var targets = runner.grip.filter(function (card) {
        return CheckCardType(card, ["program", "hardware"]);
      });
      if (back.automaticOnInstall) targets.push(back);
      for (var j = 0; j < targets.length; j++) {
        var target = targets[j];
        if (target != back) {
          if (runner.AI._wastefulToInstall(target)) continue;
          if (typeof target.AIPreferredInstallChoice == "function" &&
              target.AIPreferredInstallChoice(ChoicesCardInstall(target, true)) < 0) continue;
        }
        var cost = target == back ? discount : InstallCost(target);
        if (Math.max(0, cost - discount) > credits) continue;
        var saving = Math.min(cost, discount);
        if (saving < 1) continue;
        if (!best || saving > best.saving) best = { returnCard: back, installCard: target, saving: saving };
      }
    }
    return best;
  },
  AIWouldPlay: function () {
    this._aiPlan = this.ChooseAIPlan();
    return this._aiPlan != null;
  },
  AIPreferredPlayChoice: function (choices) {
    var plan = this._aiPlan || this.ChooseAIPlan();
    if (!plan) return -1;
    this._aiPlan = plan;
    for (var i = 0; i < choices.length; i++) {
      if (choices[i].card == plan.returnCard) return i;
    }
    return -1;
  },
};

//Whistleblower (26030)
// Whenever you make a successful run, you may trash this resource to choose a card name. The next time this run you access an agenda with the chosen name, steal it, ignoring all costs. (You are no longer accessing it.)
cardSet[26030] = {
  title: "Whistleblower",
  elo: 1164,
  imageFile: "26030.png",
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  unique: true,
  //Whenever you make a successful run, you may trash this resource to choose a card name.
  responseOnRunSuccessful: {
    Enumerate: function () {
      if (!CheckTrash(this)) return [];
      return [{}];
    },
    Resolve: function () {
      var whistleblower = this;
      var choices = this.AgendaNameChoices();
      choices.push({ name: null, label: "Decline", button: "Decline" });
      if (runner.AI != null) {
        var name = this.ChooseAIName(attackedServer);
        var preferred = choices[choices.length - 1];
        for (var i = 0; i < choices.length; i++) {
          if (choices[i].name == name) preferred = choices[i];
        }
        runner.AI.preferred = { title: "Whistleblower", option: preferred };
      }
      DecisionPhase(
        runner,
        choices,
        function (params) {
          if (!params.name) return;
          var name = params.name;
          Trash(this, false, function () {
            Log("Whistleblower names " + name);
            AddLingeringEffect(whistleblower.NamedStealEffect(name));
          });
        },
        "Whistleblower",
        "Trash Whistleblower to choose a card name?",
        this,
      );
    },
    text: "Trash Whistleblower to choose a card name",
  },
  //Only agendas can be stolen, so only agenda names are offered.
  AgendaNameChoices: function () {
    var names = [];
    for (var id in cardSet) {
      var card = cardSet[id];
      if (card && card.cardType == "agenda" && !names.includes(card.title)) names.push(card.title);
    }
    return names.sort().map(function (name) {
      return { name: name, label: name };
    });
  },
  //The next time this run you access an agenda with the chosen name, steal it,
  //ignoring all costs. (You are no longer accessing it.)
  NamedStealEffect: function (name) {
    return {
      title: "Whistleblower",
      chosenName: name,
      pending: null,
      used: false,
      automaticOnAccess: {
        Resolve: function (card) {
          if (this.used || !card || card.cardType != "agenda" || card.title != this.chosenName) return;
          this.used = true;
          this.pending = card;
        },
      },
      responseOnAccess: {
        Enumerate: function () {
          if (!this.pending || this.pending != accessingCard) return [];
          return [{}];
        },
        Resolve: function () {
          this.pending = null;
          if (CardEffectsForbid("steal", accessingCard)) {
            Log(GetTitle(accessingCard, true) + " cannot be stolen");
            return;
          }
          Steal();
        },
        text: "Steal the named agenda, ignoring all costs",
      },
      responseOnRunEnds: {
        Resolve: function () {
          RemoveLingeringEffect(this);
        },
        automatic: true,
      },
    };
  },
  //AI: name a known agenda this breach can reach when its steal costs matter.
  KnownReachableAgendas: function (server) {
    var known = [];
    if (!server) return known;
    var cards = (server.root || []).concat(server == corp.archives ? server.cards : []);
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      if (card.cardType == "agenda" && (card.faceUp || card.knownToRunner)) known.push(card);
    }
    if (server == corp.HQ) {
      runner.AI.suspectedHQCards.forEach(function (entry) {
        if (entry.cardType != "agenda" || entry.uncertainty > 0) return;
        var card = corp.HQ.cards.find(function (c) {
          return c.title == entry.title;
        });
        if (card) known.push(card);
      });
    }
    return known;
  },
  ChooseAIName: function (server) {
    var best = null;
    var known = this.KnownReachableAgendas(server);
    for (var i = 0; i < known.length; i++) {
      var cost = StealCost(known[i]);
      if (cost.credits < 1 && cost.clicks < 1 && cost.programs < 1) continue;
      if (!best || (known[i].agendaPoints || 0) > (best.agendaPoints || 0)) best = known[i];
    }
    return best ? best.title : null;
  },
};

// Batch 7 (26031–26035) ELO: Trash or Busto ranking, 2026-10-16.

//MirrorMorph: Endless Iteration (26031)
// If the first, second, and third actions you take on your turn are each different from one another, when the third action completes, you may gain 1[c] or take another different action, paying [click] less.
cardSet[26031] = {
  title: "MirrorMorph: Endless Iteration",
  imageFile: "26031.png",
  elo: 1607,
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
  //CR 5.2.5: actions differ when initiated by different basic actions or card abilities.
  _firstThreeActionsDiffer: function () {
    var actions = corp.actionsTakenThisTurn || [];
    if (actions.length != 3 || corp.actionsCompletedThisTurn != 3) return false;
    return (
      !SameCorpAction(actions[0], actions[1]) &&
      !SameCorpAction(actions[0], actions[2]) &&
      !SameCorpAction(actions[1], actions[2])
    );
  },
  responseOnCorpActionCompletes: {
    Enumerate: function () {
      if (!this._firstThreeActionsDiffer()) return [];
      var gainChoice = { id: 0, label: "Gain 1[c]", button: "Gain 1[c]" };
      var actionChoice = {
        id: 1,
        label: "Take another different action, paying [click] less",
        button: "Take another action",
      };
      var declineChoice = { id: 2, label: "Do nothing", button: "Pass" };
      var excluded = corp.actionsTakenThisTurn.slice();
      var actionLegal = CorpHasDifferentActionAvailable(excluded, 1);
      //**AI code: an extra action is worth at least the click-for-credit it replaces
      if (corp.AI != null) return [actionLegal ? actionChoice : gainChoice];
      var ret = [gainChoice];
      if (actionLegal) ret.push(actionChoice);
      ret.push(declineChoice);
      return ret;
    },
    Resolve: function (params) {
      if (!params) return;
      if (params.id === 0) GainCredits(corp, 1, "", this);
      else if (params.id === 1) {
        //Paying [click] less: one click of the next action is covered here,
        //and that action must differ from the first three.
        corp.restrictedNextAction = {
          excluded: corp.actionsTakenThisTurn.slice(),
          source: this,
        };
        corp.clickTracker += 1;
        Log("MirrorMorph: the Corp takes another different action, paying [click] less");
      }
    },
    text: "MirrorMorph: Endless Iteration",
  },
};

//Architect Deployment Test (26032)
// When you score this agenda, look at the top 5 cards of R&D. You may install and rez 1 of those cards, ignoring all costs.
cardSet[26032] = {
  title: "Architect Deployment Test",
  imageFile: "26032.png",
  elo: 1566,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 4,
  agendaPoints: 2,
  _installAndRez: function (card, server) {
    Install(card, server, true, null, true, null, this, null, null, false, function () {
      if (CheckCardType(card, ["ice", "asset", "upgrade"]) && !card.rezzed && CheckInstalled(card))
        Rez(card, true, null, null, false);
    });
  },
  responseOnScored: {
    Enumerate: function () {
      if (intended.score != this || corp.RnD.cards.length < 1) return [];
      return [{}];
    },
    Resolve: function () {
      var count = Math.min(5, corp.RnD.cards.length);
      //R&D's top card is the last element; list the looked-at cards top first
      var cards = corp.RnD.cards.slice(corp.RnD.cards.length - count).reverse();
      Log("Corp looks at the top " + count + " cards of R&D");
      var installable = cards.filter(function (card) {
        return ChoicesCardInstall(card).length > 0;
      });
      var choices = ChoicesArrayCards(installable);
      var declineChoice = { id: 0, card: null, label: "Install nothing", button: "Install nothing" };
      choices.push(declineChoice);
      //Only the human Corp needs the cards visible while choosing.
      if (!corp.AI) for (var i = 0; i < cards.length; i++) cards[i].faceUp = true;
      //**AI code: the shared install ranking picks the card and destination, more willingly since it is free
      var aiPlan = null;
      if (corp.AI) {
        var installOptions = [];
        for (var j = 0; j < installable.length; j++)
          installOptions = installOptions.concat(ChoicesCardInstall(installable[j]));
        var best = installOptions.length > 0 ? corp.AI._bestInstallOption(installOptions, false) : -1;
        aiPlan = best > -1 ? installOptions[best] : null;
        choices = [aiPlan ? choices[installable.indexOf(aiPlan.card)] : declineChoice];
      }
      DecisionPhase(
        corp,
        choices,
        function (params) {
          for (var i = 0; i < cards.length; i++) cards[i].faceUp = false;
          if (!params || !params.card || !installable.includes(params.card)) {
            Log("Corp chose not to install a card");
            return;
          }
          var card = params.card;
          if (aiPlan && aiPlan.card == card) {
            this._installAndRez(card, aiPlan.server);
            return;
          }
          DecisionPhase(
            corp,
            ChoicesCardInstall(card),
            function (installParams) {
              this._installAndRez(installParams.card, installParams.server);
            },
            this.title,
            "Choose where to install the card",
            this,
            "install",
          );
        },
        this.title,
        "You may install and rez 1 card, ignoring all costs",
        this,
      );
    },
    text: "Architect Deployment Test: look at the top 5 cards of R&D",
  },
};

//Calvin B4L3Y (26033)
// Once per turn → [click]: Draw 2 cards.
// When the Runner trashes this asset, you may draw 2 cards.
cardSet[26033] = {
  title: "Calvin B4L3Y",
  imageFile: "26033.png",
  elo: 1469,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: ["Bioroid"],
  rezCost: 0,
  trashCost: 3,
  unique: true,
  usedThisTurn: false,
  _wasRezzedWhenTrashed: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  abilities: [
    {
      text: "[click]: Draw 2 cards.",
      Enumerate: function () {
        if (!this.rezzed) return [];
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this.usedThisTurn = true;
        Draw(corp, 2);
      },
    },
  ],
  //An unrezzed asset's ability is inactive, so remember its state before it moves.
  automaticOnWouldTrash: {
    Resolve: function (cards) {
      if (cards.includes(this)) this._wasRezzedWhenTrashed = this.rezzed && CheckInstalled(this);
    },
    availableWhenInactive: true,
  },
  responseOnTrash: {
    Enumerate: function (cards, trashingPlayer) {
      if (!cards || !cards.includes(this)) return [];
      if (trashingPlayer != runner || !this._wasRezzedWhenTrashed) return [];
      var drawChoice = { id: 1, label: "Draw 2 cards", button: "Draw 2" };
      var passChoice = { id: 0, label: "Do not draw", button: "Pass" };
      //**AI code: draw unless it would empty R&D
      if (corp.AI != null) return [corp.RnD.cards.length > 2 ? drawChoice : passChoice];
      return [drawChoice, passChoice];
    },
    Resolve: function (params) {
      this._wasRezzedWhenTrashed = false;
      if (params && params.id === 1) Draw(corp, 2);
    },
    text: "Calvin B4L3Y trashed: draw 2 cards?",
    availableWhenInactive: true,
  },
  AIDrawAbility: 2,
  AIRezWhenCan: function () {
    return true;
  },
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    var installed = InstalledCards(corp);
    for (var i = 0; i < installed.length; i++) {
      if (installed[i] != this && GetTitle(installed[i]) == GetTitle(this)) return -1;
    }
    if (corp.RnD.cards.length < 4) return -1;
    //Draw engine for a short hand; its trash cost and reward both tax the Runner
    if (PlayerHand(corp).length > MaxHandSize(corp) - 2) return -1;
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
};

//Nanoetching Matrix (26034)
// Once per turn → [click]: Gain 2[c].
// When the Runner trashes this asset, you may gain 2[c].
cardSet[26034] = {
  title: "Nanoetching Matrix",
  imageFile: "26034.png",
  elo: 1487,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "asset",
  subTypes: ["Industrial"],
  rezCost: 0,
  trashCost: 3,
  usedThisTurn: false,
  _wasRezzedWhenTrashed: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  abilities: [
    {
      text: "[click]: Gain 2[c].",
      Enumerate: function () {
        if (!this.rezzed) return [];
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this.usedThisTurn = true;
        GainCredits(corp, 2, "", this);
      },
    },
  ],
  //An unrezzed asset's ability is inactive, so remember its state before it moves.
  automaticOnWouldTrash: {
    Resolve: function (cards) {
      if (cards.includes(this)) this._wasRezzedWhenTrashed = this.rezzed && CheckInstalled(this);
    },
    availableWhenInactive: true,
  },
  responseOnTrash: {
    Enumerate: function (cards, trashingPlayer) {
      if (!cards || !cards.includes(this)) return [];
      if (trashingPlayer != runner || !this._wasRezzedWhenTrashed) return [];
      var gainChoice = { id: 1, label: "Gain 2 credits", button: "Gain 2[c]" };
      var passChoice = { id: 0, label: "Do not gain credits", button: "Pass" };
      //**AI code: free credits
      if (corp.AI != null) return [gainChoice];
      return [gainChoice, passChoice];
    },
    Resolve: function (params) {
      this._wasRezzedWhenTrashed = false;
      if (params && params.id === 1) GainCredits(corp, 2, "", this);
    },
    text: "Nanoetching Matrix trashed: gain 2[c]?",
    availableWhenInactive: true,
  },
  AIRezWhenCan: function () {
    return true;
  },
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    //Repeatable click economy at no rez cost: worth a non-scoring remote
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
};

//Hagen (26035)
// This ice gets −1 strength for each installed icebreaker.
// ↳ Trash 1 installed program that is not a decoder, fracter, or killer.
// ↳ End the run.
cardSet[26035] = {
  title: "Hagen",
  imageFile: "26035.png",
  elo: 1649,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Barrier", "Destroyer"],
  rezCost: 4,
  strength: 6,
  _installedIcebreakers: function () {
    var installed = InstalledCards(runner);
    var count = 0;
    for (var i = 0; i < installed.length; i++) {
      if (CheckCardType(installed[i], ["program"]) && CheckSubType(installed[i], "Icebreaker")) count++;
    }
    return count;
  },
  _trashablePrograms: function () {
    return ChoicesInstalledCards(runner, function (card) {
      if (!CheckCardType(card, ["program"]) || !CheckTrash(card)) return false;
      return !(
        CheckSubType(card, "Decoder") ||
        CheckSubType(card, "Fracter") ||
        CheckSubType(card, "Killer")
      );
    });
  },
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return -this._installedIcebreakers();
      return 0;
    },
  },
  subroutines: [
    {
      text: "Trash 1 installed program that is not a decoder, fracter, or killer.",
      Resolve: function () {
        var choices = this._trashablePrograms();
        if (choices.length < 1) return;
        DecisionPhase(
          corp,
          choices,
          function (params) {
            if (params && params.card) {
              Log("Hagen trashes " + GetTitle(params.card));
              Trash(params.card, true);
            }
          },
          "Hagen",
          "Choose a program that is not a decoder, fracter or killer to trash",
          this,
          "trash",
        );
      },
      visual: { y: 102, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 129, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [];
    //Like Rototurret, a program trash is serious, but only an eligible program can be lost
    if (this._trashablePrograms().length > 0) result.sr.push([["misc_serious"]]);
    else result.sr.push([[]]); //blank keeps subroutine indices aligned
    result.sr.push([["endTheRun"]]);
    return result;
  },
};

//Fully Operational (26036)
// Gain 2[c] or draw 2 cards. Repeat this process for each remote server that has a card in its root and is protected by ice.
cardSet[26036] = {
  title: "Fully Operational",
  elo: 1879,
  imageFile: "26036.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "operation",
  subTypes: [],
  playCost: 1,
  Resolve: function () {
    var card = this;
    var remaining = null;
    function choose() {
      var choices = [
        { id: "credits", label: "Gain 2 credits" },
        { id: "draw", label: "Draw 2 cards" },
      ];
      if (corp.AI) {
        var draw = corp.RnD.cards.length > 2 && corp.HQ.cards.length < 3 && corp.creditPool >= 4;
        corp.AI.preferred = { title: card.title, option: choices[draw ? 1 : 0] };
      }
      DecisionPhase(corp, choices, function (params) {
        function next() {
          // Count only after the initial effect (including draw responses) finishes.
          if (remaining === null) remaining = corp.remoteServers.filter(function (server) {
            return server.root.length > 0 && server.ice.length > 0;
          }).length;
          else remaining--;
          if (remaining > 0) choose();
        }
        if (params.id == "draw") Draw(corp, 2, next);
        else GainCredits(corp, 2, "", card, next);
      }, card.title, "Gain credits or draw cards", card);
    }
    choose();
  },
  AIEconomyPlay: 2,
  AIWouldPlay: function () { return true; },
};

//Red Level Clearance (26037)
// Resolve 2 of the following in any order: Draw 2 cards. Gain 2[c]. Install 1 non-agenda card from HQ. Gain [click].
cardSet[26037] = {
  title: "Red Level Clearance",
  elo: 1831,
  imageFile: "26037.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 1,
  Resolve: function () {
    var card = this;
    var used = [];
    function choose() {
      var choices = [
        {id: "draw", label: "Draw 2 cards"},
        {id: "credits", label: "Gain 2 credits"},
        {id: "install", label: "Install 1 non-agenda card from HQ"},
        {id: "click", label: "Gain 1 click"},
      ].filter(function (choice) { return used.indexOf(choice.id) < 0; });
      if (corp.AI) {
        var preferred = choices.find(function (choice) { return choice.id == "credits"; });
        if (!preferred) preferred = choices.find(function (choice) {
          return choice.id == (corp.HQ.cards.length < 3 && corp.RnD.cards.length > 2 ? "draw" : "click");
        });
        corp.AI.preferred = {title: card.title, option: preferred || choices[0]};
      }
      DecisionPhase(corp, choices, function (params) {
        function next() { if (used.length < 2) choose(); }
        used.push(params.id);
        if (params.id == "draw") Draw(corp, 2, next);
        else if (params.id == "credits") GainCredits(corp, 2, "", card, next);
        else if (params.id == "click") { GainClicks(corp, 1); next(); }
        else {
          var installs = ChoicesHandInstall(corp, false, function (target) {
            return target.cardType != "agenda";
          });
          // An impossible instruction resolves without an effect; it still counts.
          if (!installs.length) { next(); return; }
          if (corp.AI) {
            var best = corp.AI._bestInstallOption(installs, false);
            corp.AI.preferred = {title: card.title, option: installs[Math.max(0, best)]};
          }
          DecisionPhase(corp, installs, function (install) {
            Install(install.card, install.server, false, null, true,
              null, card, next, null, false, next);
          }, card.title, "Choose non-agenda card to install", card, "install");
        }
      }, card.title, "Choose effect " + (used.length + 1) + " of 2", card);
    }
    choose();
  },
  AIEconomyPlay: 1,
  AIWouldPlay: function () { return true; },
};

//Cold Site Server (26038)
// [click]: Place 1 power counter on this upgrade.
// As an additional cost to run this server, the Runner must spend [click] and 1[c] for each hosted power counter.
// When your turn begins, remove all hosted power counters.
cardSet[26038] = {
  title: "Cold Site Server",
  elo: 1455,
  imageFile: "26038.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Facility"],
  rezCost: 0,
  trashCost: 3,
  power: 0,
  abilities: [{
    text: "[click]: Place 1 power counter on this upgrade.",
    Enumerate: function () {
      if (!this.rezzed || !CheckActionClicks(corp, 1)) return [];
      if (corp.AI && !this._usefulCounter()) return [];
      return [{}];
    },
    Resolve: function () { SpendClicks(corp, 1); AddCounters(this, "power", 1); },
  }],
  modifyRunClickCost: {
    Resolve: function (server) { return GetServer(this) == server ? Counters(this, "power") : 0; },
  },
  modifyRunCreditCost: {
    Resolve: function (server) { return GetServer(this) == server ? Counters(this, "power") : 0; },
  },
  automaticOnCorpTurnBegins: {
    Resolve: function () { RemoveCounters(this, "power", Counters(this, "power")); },
  },
  _usefulCounter: function () {
    var server = GetServer(this);
    return server && server.root.some(function (card) { return card.cardType == "agenda"; }) &&
      Counters(this, "power") < 3;
  },
  AITriggerWhenCan: true,
  AITriggerAfterTactics: true,
  AIRezWhenCan: function () { return playerTurn == corp && this._usefulCounter(); },
  AIDefensiveValue: function (server) {
    return server && typeof server.cards == "undefined" && server.ice.length ? 2 : 0;
  },
  AILimitPerServer: function () { return 1; },
};

//Hyoubu Institute: Absolute Clarity (26039)
// The first time each turn you reveal a card, gain 1[c].
// [click]: Reveal 1 card from the grip at random or the top card of the stack.
cardSet[26039] = {
  title: "Hyoubu Institute: Absolute Clarity",
  elo: 1147,
  imageFile: "26039.png",
  player: corp,
  faction: "Jinteki",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
  usedThisTurn: false,
  automaticOnCorpTurnBegins: { Resolve: function () { this.usedThisTurn = false; }, availableWhenInactive: true },
  automaticOnRunnerTurnBegins: { Resolve: function () { this.usedThisTurn = false; }, availableWhenInactive: true },
  automaticOnReveal: {
    Resolve: function (card, revealingPlayer) {
      if (revealingPlayer != corp || this.usedThisTurn) return;
      this.usedThisTurn = true;
      GainCredits(corp, 1, "", this);
    },
  },
  abilities: [{
    text: "[click]: Reveal a random card from the grip or the top card of the stack.",
    Enumerate: function () {
      if (!CheckActionClicks(corp, 1)) return [];
      if (corp.AI && this.usedThisTurn) return [];
      var choices = [];
      if (runner.grip.length) choices.push({id: "grip", label: "Reveal a random card from the grip"});
      if (runner.stack.length) choices.push({id: "stack", label: "Reveal the top card of the stack"});
      // Choosing the zone does not inspect its hidden contents.
      if (corp.AI) return choices.slice(0, 1);
      return choices;
    },
    Resolve: function (params) {
      var cards = params.id == "grip" ? runner.grip : runner.stack;
      if (!cards.length) return;
      SpendClicks(corp, 1);
      var index = params.id == "grip" ? Math.floor(Math.random() * cards.length) : cards.length - 1;
      Reveal(cards[index], function () {}, this, corp, false, corp);
    },
  }],
  AITriggerWhenCan: true,
  AITriggerAfterTactics: true,
};

//Project Yagi-Uda (26040)
// When you score this agenda, place 1 agenda counter on it for each hosted advancement counter past 3.
// Hosted agenda counter: Swap 1 card from HQ with 1 card in the root of or protecting the attacked server. The Runner may jack out. Use this ability only during a run.
cardSet[26040] = {
  title: "Project Yagi-Uda",
  elo: 1536,
  imageFile: "26040.png",
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 3,
  agendaPoints: 2,
  responseOnScored: {
    Resolve: function () {
      if (intended.score == this) AddCounters(this, "agenda", Math.max(0, Counters(this, "advancement") - 3));
    },
    automatic: true,
  },
  _swapChoices: function () {
    if (!attackedServer || corp.scoreArea.indexOf(this) < 0 || !CheckCounters(this, "agenda", 1)) return [];
    var server = attackedServer;
    var choices = [];
    server.root.concat(server.ice).forEach(function (installed) {
      corp.HQ.cards.forEach(function (hand) {
        if (!CheckInstallDestination(hand, server)) return;
        if (server.ice.indexOf(installed) >= 0) {
          if (hand.cardType != "ice") return;
        } else {
          if (["asset", "agenda", "upgrade"].indexOf(hand.cardType) < 0) return;
          if (hand.cardType != "upgrade" && (typeof server.cards != "undefined" || server.root.some(function (other) {
            return other != installed && (other.cardType == "asset" || other.cardType == "agenda");
          }))) return;
          if (CheckSubType(hand, "Region") && server.root.some(function (other) {
            return other != installed && CheckSubType(other, "Region");
          })) return;
        }
        choices.push({card: hand, target: installed,
          label: GetTitle(hand, true) + " ↔ " + GetTitle(installed, true)});
      });
    });
    return choices;
  },
  _preferredSwap: function (choices) {
    return choices.find(function (choice) {
      // Rescue an exposed agenda without installing another one in its place.
      return choice.target.cardType == "agenda" && choice.card.cardType != "agenda";
    }) || choices.find(function (choice) {
      return !encountering && attackedServer.ice[approachIce] == choice.target &&
        choice.card.cardType == "ice" && CheckCredits(corp, RezCost(choice.card), "rezzing", choice.card) &&
        choice.card.strength > choice.target.strength;
    });
  },
  abilities: [{
    text: "Hosted agenda counter: Swap a card from HQ with an installed card in the attacked server. The Runner may jack out.",
    Enumerate: function () {
      var choices = this._swapChoices();
      if (corp.AI) {
        var best = this._preferredSwap(choices);
        return best ? [best] : [];
      }
      return choices;
    },
    Resolve: function (params) {
      if (!this._swapChoices().some(function (choice) {
        return choice.card == params.card && choice.target == params.target;
      })) return;
      var card = this, server = attackedServer, incoming = params.card, outgoing = params.target;
      var destination = outgoing.cardLocation, position = destination.indexOf(outgoing);
      var endedEncounter = encountering && server.ice[approachIce] == outgoing;
      RemoveCounters(this, "agenda", 1);
      UninstallInterrupts([outgoing], function () {
        var hosted = (outgoing.hostedCards || []).slice();
        // Atomic exchange: moving either card separately could destroy a server
        // or expose a temporarily illegal root. Use normal movement notifications.
        var hqIndex = corp.HQ.cards.indexOf(incoming);
        destination[position] = incoming;
        corp.HQ.cards[hqIndex] = outgoing;
        incoming.rezzed = false;
        incoming.faceUp = false;
        MoveCardTriggers(outgoing, destination, corp.HQ.cards);
        MoveCardTriggers(incoming, corp.HQ.cards, destination);
        function installed() {
          AutomaticTriggers("automaticOnInstall", [incoming]);
          TriggeredResponsePhase(playerTurn, "responseOnInstall", [incoming], function () {
            var choices = [
              {id: "continue", label: "Continue the run"},
              {id: "jack", label: "Jack out"},
            ];
            if (runner.AI) {
              var path = runner.AI._calculateBestCompleteRun(server, 0, 0, 0, 0, null,
                endedEncounter ? approachIce - 1 : approachIce);
              runner.AI.preferred = {title: card.title, option: choices[path ? 0 : 1]};
            }
            DecisionPhase(runner, choices, function (choice) {
              if (choice.id == "jack") JackOut();
              else if (endedEncounter) {
                phases.runEncounterEnd.next = phases.runPassesIce;
                ChangePhase(phases.runEncounterEnd);
              }
            }, card.title, "Jack out?", card);
          }, "Installed");
        }
        if (hosted.length) Trash(hosted, false, installed);
        else installed();
      });
    },
  }],
  AIOverAdvance: true,
  AIAdvancementLimit: function () { return 4; },
  AITriggerInPaidWindow: function () { return !!this._preferredSwap(this._swapChoices()); },
};

//Sting! (26041)
// When a player scores or steals this agenda, do X net damage. X is equal to 1 plus the number of copies of Sting! in the other playerʼs score area.
cardSet[26041] = {
  title: "Sting!",
  elo: 1827,
  imageFile: "26041.png",
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Ambush"],
  advancementRequirement: 3,
  agendaPoints: 1,
  _stingDamage: function (otherPlayer) {
    return 1 + otherPlayer.scoreArea.filter(function (card) { return card.title == "Sting!"; }).length;
  },
  responseOnScored: {
    Enumerate: function () { return intended.score == this ? [{}] : []; },
    Resolve: function () { Damage("net", this._stingDamage(runner), true, null, this); },
    text: "Sting! net damage",
  },
  responseOnStolen: {
    Enumerate: function () { return intended.steal == this ? [{}] : []; },
    Resolve: function () { Damage("net", this._stingDamage(corp), true, null, this); },
    text: "Sting! net damage",
  },
  AIOnStealDamage: function () { return this._stingDamage(corp); },
  AIPunishesAccess: function (server) { return server && server.root.includes(this) ? this.AIOnStealDamage() : 0; },
};

//Public Health Portal (26042)
// When your turn begins, reveal the top card of R&D and gain 2[c].
cardSet[26042] = {
  title: "Public Health Portal",
  elo: 1181,
  imageFile: "26042.png",
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "asset",
  subTypes: ["Facility"],
  rezCost: 3,
  trashCost: 2,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      if (!corp.RnD.cards.length) { GainCredits(corp, 2, "", this); return; }
      Reveal(corp.RnD.cards[corp.RnD.cards.length - 1], function () {
        GainCredits(corp, 2, "", this);
      }, this, runner, false, corp);
    },
    text: "Reveal the top card of R&D and gain 2[c]",
  },
  RezUsability: function () { return currentPhase.identifier == "Runner 2.2"; },
  AIRezWhenCan: function () { return true; },
  AIAvoidInstallingOverThis: true,
  AIEconomyCard: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.AI._sufficientEconomy(false) && this.cardLocation != corp.archives.cards) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    }
    return emptyProtectedRemotes.length;
  },
};

//Storgotic Resonator (26043)
// The first time each turn you trash a card that matches the faction of the Runnerʼs identity (from any location), place 1 power counter on this asset.
// [click], hosted power counter: Do 1 net damage.
cardSet[26043] = {
  title: "Storgotic Resonator",
  elo: 1313,
  imageFile: "26043.png",
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Hostile"],
  rezCost: 2,
  trashCost: 2,
  unique: true,
  power: 0,
  automaticOnTrash: {
    Resolve: function (cards, trashingPlayer, directlyTrashed, trashEvent) {
      if (trashingPlayer != corp || !trashEvent || trashEvent.corpRunnerFactionOrdinal != 1) return;
      if (directlyTrashed.some(function (card) { return card.faction == runner.identityCard.faction; }))
        AddCounters(this, "power", 1);
    },
  },
  abilities: [{
    text: "[click], hosted power counter: Do 1 net damage.",
    Enumerate: function () {
      if (!this.rezzed || !CheckActionClicks(corp, 1) || !CheckCounters(this, "power", 1)) return [];
      return [{}];
    },
    Resolve: function () {
      SpendClicks(corp, 1);
      RemoveCounters(this, "power", 1);
      Damage("net", 1, true, null, this);
    },
  }],
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (InstalledCards(corp).some(function (card) { return card.title == "Storgotic Resonator"; })) return -1;
    return emptyProtectedRemotes.length;
  },
  AIRezWhenCan: function () { return true; },
  AITriggerWhenCan: true,
};

//Saisentan (26044)
// When the Runner encounters this ice, choose a card type. For the remainder of the encounter, whenever you trash a card of the chosen type with net damage from a subroutine on this ice, do 1 net damage.
// ↳ Do 1 net damage.
// ↳ Do 1 net damage.
// ↳ Do 1 net damage.
cardSet[26044] = {
  title: "Saisentan",
  elo: 1748,
  imageFile: "26044.png",
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "AP", "Observer"],
  rezCost: 5,
  strength: 2,
  chosenType: null,
  responseOnEncounter: {
    Enumerate: function () { return GetApproachEncounterIce() == this ? [{}] : []; },
    Resolve: function () {
      var choices = ["event", "hardware", "program", "resource", "identity", "agenda", "asset", "ice", "operation", "upgrade"]
        .map(function (type) { return {type: type, label: type}; });
      if (corp.AI) {
        // Public board only: use observed card types as a rough deck prior.
        var observed = runner.heap.concat(InstalledCards(runner));
        var best = choices[0], highest = -1;
        choices.forEach(function (choice) {
          var count = observed.filter(function (card) { return card.cardType == choice.type; }).length;
          if (count > highest) { best = choice; highest = count; }
        });
        corp.AI.preferred = {title: this.title, option: best};
      }
      DecisionPhase(corp, choices, function (params) { this.chosenType = params.type; },
        this.title, "Choose a card type", this);
    },
    text: "Choose a card type",
  },
  responseOnEncounterEnds: {
    Resolve: function () { this.chosenType = null; },
    automatic: true,
    availableWhenInactive: true,
  },
  _subroutineDamage: function () {
    var chosen = this.chosenType;
    Damage("net", 1, true, function (cards) {
      // Only damage from the subroutine qualifies; this bonus is an ability,
      // so a matching card trashed by it cannot recursively cause more damage.
      if (chosen && cards.some(function (card) { return card.cardType == chosen; }))
        Damage("net", 1, true, null, this);
    }, this);
  },
  subroutines: [
    {text: "Do 1 net damage.", Resolve: function () { this._subroutineDamage(); }, visual: {y: 155, h: 16}},
    {text: "Do 1 net damage.", Resolve: function () { this._subroutineDamage(); }, visual: {y: 175, h: 16}},
    {text: "Do 1 net damage.", Resolve: function () { this._subroutineDamage(); }, visual: {y: 195, h: 16}},
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // Budget the possible bonus conservatively, once per subroutine. Only the
    // Runner-owned calculator may rule it out using the contents of the grip.
    var bonus = true;
    if (runner.AI && runner.AI.rc == rc && this.chosenType)
      bonus = runner.grip.some(function (card) { return card.cardType == this.chosenType; }, this);
    result.sr = Array.from({length: 3}, function () {
      return [bonus ? ["netDamage", "netDamage"] : ["netDamage"]];
    });
    return result;
  },
};

//Complete Image (26045)
// Play only if the Runner has 3 or more agenda points and they made a successful run during their last turn.
// After you resolve this operation, your action phase ends.
// Choose a card name, then do 1 net damage. If you trash a card with the chosen name this way, repeat this process.
cardSet[26045] = {
  title: "Complete Image",
  elo: 1356,
  imageFile: "26045.png",
  player: corp,
  faction: "Jinteki",
  influence: 4,
  cardType: "operation",
  subTypes: ["Terminal", "Gray Ops"],
  playCost: 4,
  successfulRunLastTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.successfulRunLastTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () { if (playerTurn == runner) this.successfulRunLastTurn = true; },
    automatic: true,
    availableWhenInactive: true,
  },
  Enumerate: function () {
    return AgendaPoints(runner) >= 3 && this.successfulRunLastTurn ? [{}] : [];
  },
  Resolve: function () { this._nameAndDamage(); },
  _nameAndDamage: function () {
    var names = [];
    for (var id in cardSet) {
      var card = cardSet[id];
      if (card && card.player == runner && !names.includes(card.title)) names.push(card.title);
    }
    var choices = names.sort().map(function (name) { return {name: name, label: name}; });
    if (corp.AI) {
      // Guess an observed title with copies plausibly still in the deck.
      // Never inspect the grip, stack, or their card names.
      var publicCards = runner.heap.concat(InstalledCards(runner));
      var preferred = choices.find(function (choice) { return choice.name == "Sure Gamble"; }) || choices[0];
      for (var i = 0; i < publicCards.length; i++) {
        var seen = publicCards.filter(function (card) { return card.title == publicCards[i].title; }).length;
        if (seen < 3) {
          var observed = choices.find(function (choice) { return choice.name == publicCards[i].title; });
          if (observed) { preferred = observed; break; }
        }
      }
      corp.AI.preferred = {title: this.title, option: preferred};
    }
    DecisionPhase(corp, choices, function (params) {
      Log("Complete Image names " + params.name);
      Damage("net", 1, true, function (cards) {
        if (cards.some(function (card) { return card.title == params.name; })) this._nameAndDamage();
        else {
          // Terminal ends the phase after the complete damage chain resolves.
          if (corp.resolvingCards.includes(this)) MoveCard(this, corp.archives.cards);
          if (playerTurn == corp && currentPhase.identifier.indexOf("Corp 2.") == 0)
            ChangePhase(phases.corpActionPhaseEnds);
        }
      }, this);
    }, this.title, "Choose a card name", this);
  },
  AIDamageOperation: true,
  AIPlayWhenCan: 1,
  AIWouldPlay: function () { return runner.grip.length <= 1; },
};

//Letheia Nisei (26046)
// The first time the Runner approaches this server during each run, play a Psi Game. (Players secretly bid 0–2[c]. Then each player reveals and spends their bid.) If the bids differ, you may trash this upgrade. If you do, the Runner moves to the outermost position of this server. They may jack out.
cardSet[26046] = {
  title: "Letheia Nisei",
  elo: 1394,
  imageFile: "26046.png",
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Psi", "Clone"],
  rezCost: 1,
  trashCost: 2,
  unique: true,
  approachedThisRun: false,
  automaticOnRunBegins: {
    Resolve: function () { this.approachedThisRun = false; this.firstApproach = false; },
    availableWhenInactive: true,
  },
  // Track the first approach even while unrezzed; rezzing after it does not
  // make a later approach this run count as the first one.
  automaticOnApproachServer: {
    Resolve: function () {
      if (attackedServer == GetServer(this)) {
        this.firstApproach = !this.approachedThisRun;
        this.approachedThisRun = true;
      }
    },
    availableWhenInactive: true,
  },
  responseOnApproachServer: {
    Enumerate: function () {
      return attackedServer == GetServer(this) && this.firstApproach ? [{}] : [];
    },
    Resolve: function () {
      this.firstApproach = false;
      PsiGame(function (different) {
        if (!different) return;
        var choices = [{use: true, label: "Trash Letheia Nisei"}, {use: false, label: "Continue"}];
        if (corp.AI) corp.AI.preferred = {title: this.title, option: choices[this.AIWouldTrigger() ? 0 : 1]};
        DecisionPhase(corp, choices, function (params) {
          if (!params.use || !CheckTrash(this)) return;
          Trash(this, false, function () {
            approachIce = attackedServer.ice.length - 1;
            encountering = false;
            encounteredIce = null;
            UnbreakAll(null);
            var choices = [{jack: false, label: "Continue the run"}, {jack: true, label: "Jack out"}];
            if (runner.AI) {
              var path = runner.AI._calculateBestCompleteRun(attackedServer, 0, 0, 0, 0, null, approachIce);
              runner.AI.preferred = {title: this.title, option: choices[path ? 0 : 1]};
            }
            DecisionPhase(runner, choices, function (choice) {
              if (choice.jack) JackOut();
              else ChangePhase(approachIce >= 0 ? phases.runApproachIce : phases.runDecideContinue);
            }, this.title, "Jack out?", this);
          }, this);
        }, this.title, "Trash this upgrade to move the Runner?", this);
      }, this);
    },
    text: "Play a Psi Game",
  },
  RezUsability: function () {
    return currentPhase.identifier == "Run 4.5" && attackedServer == GetServer(this) && !this.approachedThisRun;
  },
  AIWouldTrigger: function (server) {
    server = server || GetServer(this);
    return !!server && server.ice.length > 0;
  },
  AIRezWhenCan: function () { return this.AIWouldTrigger(); },
  AIPreferredUpgradeServer: function (legalServers) {
    var useful = legalServers.filter(function (server) { return this.AIWouldTrigger(server); }, this);
    useful.sort(function (a, b) { return b.ice.length - a.ice.length; });
    return useful[0] || null;
  },
  AIDefensiveValue: function (server) { return this.AIWouldTrigger(server) ? 2 : 0; },
  AILimitPerServer: function () { return 1; },
  AIRunRepeatIce: function (server) {
    return server && server.root.includes(this) && !this.approachedThisRun && this.AIWouldTrigger(server) ? 1 : 0;
  },
};

//Remastered Edition (26047)
// When you score this agenda, place 1 agenda counter on it.
// Hosted agenda counter: Place 1 advancement counter on an installed card.
cardSet[26047] = {
  title: "Remastered Edition",
  elo: 1513,
  imageFile: "26047.png",
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 4,
  agendaPoints: 2,
  responseOnScored: {
    Resolve: function () {
      if (intended.score == this) AddCounters(this, "agenda", 1);
    },
    automatic: true,
  },
  abilities: [{
    text: "Hosted agenda counter: Place 1 advancement counter on an installed card.",
    Enumerate: function () {
      if (!CheckCounters(this, "agenda", 1)) return [];
      var choices = ChoicesInstalledCards(null, function () { return true; });
      if (corp.AI) {
        if (playerTurn != corp || !currentPhase.identifier.startsWith("Corp 2.")) return [];
        var useful = choices.filter(function (option) {
          var target = option.card;
          return target.player == corp && CheckCardType(target, ["agenda"]) &&
            Counters(target, "advancement") < AdvancementRequirement(target) &&
            AdvancementRequirement(target) - Counters(target, "advancement") <=
              1 + Math.min(corp.clickTracker, Credits(corp));
        });
        if (this.AIPreferredTarget) {
          var preferred = useful.find(function (option) { return option.card == this.AIPreferredTarget; }, this);
          if (preferred) return [preferred];
        }
        useful.sort(function (a, b) {
          return (AdvancementRequirement(a.card) - Counters(a.card, "advancement")) -
            (AdvancementRequirement(b.card) - Counters(b.card, "advancement"));
        });
        return useful.slice(0, 1);
      }
      return choices;
    },
    Resolve: function (params) {
      RemoveCounters(this, "agenda", 1);
      AddCounters(params.card, "advancement", 1);
      delete this.AIPreferredTarget;
    },
  }],
  AITriggerWhenCan: true,
  AIFastAdvanceCounters: function (card) {
    return corp.scoreArea.includes(this) && CheckCounters(this, "agenda", 1) &&
      card && card.player == corp && CheckInstalled(card) ? 1 : 0;
  },
};

//Daily Quest (26048)
cardSet[26048] = {
  title: "Daily Quest",
  elo: 1535,
  imageFile: "26048.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "asset",
  subTypes: [],
  rezCost: 1,
  trashCost: 3,
  successfulServersLastTurn: [],
  _runnerSucceededLastTurn: function () {
    return this.successfulServersLastTurn.includes(GetServer(this));
  },
  canBeRezzed: function () {
    return playerTurn == corp && currentPhase.identifier.startsWith("Corp 2.");
  },
  automaticOnRunnerTurnBegins: {
    Resolve: function () { this.successfulServersLastTurn = []; },
    availableWhenInactive: true,
  },
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      // History belongs to the server, including runs before this card is installed.
      if (playerTurn == runner && !this.successfulServersLastTurn.includes(server))
        this.successfulServersLastTurn = this.successfulServersLastTurn.concat([server]);
    },
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (attackedServer == GetServer(this)) GainCredits(runner, 2, "", this);
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      if (!this._runnerSucceededLastTurn()) GainCredits(corp, 3, "", this);
    },
    automatic: true,
  },
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.AI._sufficientEconomy(false) && this.cardLocation != corp.archives.cards) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++)
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    return emptyProtectedRemotes.length;
  },
  AIAvoidInstallingOverThis: true,
  AIEconomyCard: true,
  AIRezWhenCan: function () { return this.canBeRezzed(); },
  AIRunExtraPotential: function (server) {
    return server == GetServer(this) ? 1 + (this._runnerSucceededLastTurn() ? 0 : 0.5) : 0;
  },
  AIBreachNotRequired: true,
};

//Tiered Subscription (26049)
cardSet[26049] = {
  title: "Tiered Subscription",
  elo: 1478,
  imageFile: "26049.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 0,
  trashCost: 3,
  usedThisTurn: false,
  automaticOnRunnerTurnBegins: {
    Resolve: function () { this.usedThisTurn = false; },
    availableWhenInactive: true,
  },
  automaticOnCorpTurnBegins: {
    Resolve: function () { this.usedThisTurn = false; },
    availableWhenInactive: true,
  },
  automaticOnRunBegins: {
    Resolve: function () {
      if (this.usedThisTurn) return;
      this.usedThisTurn = true;
      if (CheckActive(this)) GainCredits(corp, 1, "", this);
    },
    availableWhenInactive: true,
  },
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.AI._sufficientEconomy(false) && this.cardLocation != corp.archives.cards) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++)
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    return emptyProtectedRemotes.length;
  },
  AIAvoidInstallingOverThis: true,
  AIRezWhenCan: function () { return !this.usedThisTurn; },
};

//Congratulations! (26050)
cardSet[26050] = {
  title: "Congratulations!",
  elo: 1249,
  imageFile: "26050.png",
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Advertisement"],
  rezCost: 1,
  strength: 3,
  responseOnPassesIce: {
    Resolve: function () {
      if (attackedServer && attackedServer.ice[approachIce] == this)
        GainCredits(corp, 1, "", this);
    },
    automatic: true,
  },
  subroutines: [{
    text: "Gain 2[c]. The Runner gains 1[c].",
    Resolve: function () {
      GainCredits(corp, 2, "", this);
      GainCredits(runner, 1, "", this);
    },
    visual: { y: 94, h: 16 },
  }],
  AIImplementIce: function (rc, result) {
    result.sr = [[["misc_minor", "misc_minor", "gainCredits"]]];
    result.passEffects = ["misc_minor"];
    return result;
  },
};

//Loot Box (26051)
cardSet[26051] = {
  title: "Loot Box",
  elo: 1377,
  imageFile: "26051.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Trap"],
  rezCost: 0,
  strength: 3,
  subroutines: [{
    text: "End the run unless the Runner pays 2[c].",
    Resolve: function () {
      var choices = [];
      if (CheckCredits(runner, 2, "using", this))
        choices.push({id: 1, label: "Pay 2[c]", button: "Pay 2[c]"});
      choices.push({id: 0, label: "End the run", button: "End run"});
      if (runner.AI) runner.AI.preferred = {title: this.title,
        option: runner.AI.cachedComplete && runner.AI.cachedBestPath ? choices[0] : choices[choices.length - 1]};
      DecisionPhase(runner, choices, function (params) {
        if (params.id == 1) SpendCredits(runner, 2, "using", this);
        else EndTheRun();
      }, this.title, "Pay 2[c] to avoid ending the run?", this);
    },
    visual: { y: 59, h: 16 },
  }, {
    text: "Reveal the top 3 cards of the stack. Add 1 to the grip and gain its printed cost in credits. The Runner shuffles the stack. Trash this ice.",
    Resolve: function () {
      var source = this;
      var revealed = runner.stack.slice(-3).reverse();
      function finish() {
        Shuffle(runner.stack);
        Trash(source, true);
      }
      function revealNext(index) {
        if (index < revealed.length) {
          Reveal(revealed[index], function () { revealNext(index + 1); }, source, corp, false, corp);
          return;
        }
        if (!revealed.length) { finish(); return; }
        var choices = ChoicesArrayCards(revealed);
        if (corp.AI) {
          var best = choices[0];
          for (var i = 1; i < choices.length; i++)
            if (source._printedCost(choices[i].card) > source._printedCost(best.card)) best = choices[i];
          corp.AI.preferred = {title: source.title, option: best};
        }
        DecisionPhase(corp, choices, function (params) {
          MoveCard(params.card, runner.grip);
          GainCredits(corp, source._printedCost(params.card), "", source);
          finish();
        }, source.title, "Choose 1 revealed card to add to the grip", source);
      }
      revealNext(0);
    },
    visual: { y: 106, h: 80 },
  }],
  _printedCost: function (card) {
    var cost = CheckCardType(card, ["event"]) ? card.playCost : card.installCost;
    return typeof cost == "number" && cost > 0 ? cost : 0;
  },
  AIImplementIce: function (rc, result) {
    result.sr = [[["payCredits", "payCredits"], ["endTheRun"]], [["gainGripCard", "misc_minor", "trashIce"]]];
    return result;
  },
};

// Batch 11 (26052–26056) ELO: Trash or Busto ranking values preserved from the scaffold.

//Focus Group (26052)
// Play only if the Runner made a successful run during their last turn.
// Choose a card type, then reveal the grip. Choose a value for X equal to or less than the number of revealed cards of the chosen type. You may pay X[c] to place X advancement counters on 1 installed card.
cardSet[26052] = {
  title: "Focus Group",
  elo: 1374,
  imageFile: "26052.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: [],
  playCost: 3,
  successfulRunLastTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.successfulRunLastTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () { if (playerTurn == runner) this.successfulRunLastTurn = true; },
    automatic: true,
    availableWhenInactive: true,
  },
  _gripTypes: ["event", "hardware", "program", "resource"],
  Enumerate: function () {
    return this.successfulRunLastTurn ? [{}] : [];
  },
  Resolve: function () {
    var source = this;
    var choices = this._gripTypes.map(function (type) {
      var name = type.charAt(0).toUpperCase() + type.slice(1);
      return { cardType: type, label: name, button: name };
    });
    if (corp.AI) {
      var guess = this._aiGuessGripType();
      corp.AI.preferred = { title: this.title, option: choices.find(function (choice) { return choice.cardType == guess; }) };
    }
    DecisionPhase(corp, choices, function (params) {
      Log("Focus Group chooses " + params.cardType);
      var revealed = runner.grip.slice();
      function revealNext(index) {
        if (index < revealed.length) {
          Reveal(revealed[index], function () { revealNext(index + 1); }, source, corp);
          return;
        }
        var count = revealed.filter(function (card) { return CheckCardType(card, [params.cardType]); }).length;
        source._chooseX(count);
      }
      revealNext(0);
    }, this.title, "Choose a card type", this);
  },
  //X is at most the matching count; only affordable values are offered, and 0 declines to pay.
  _chooseX: function (count) {
    var source = this;
    var targets = ChoicesInstalledCards(null, function () { return true; });
    var max = targets.length > 0 ? count : 0;
    while (max > 0 && !CheckCredits(corp, max, "using", this)) max--;
    if (max < 1) {
      Log("Focus Group places no advancement counters");
      return;
    }
    var choices = [];
    for (var x = max; x >= 0; x--)
      choices.push(x > 0
        ? { id: x, label: "Pay " + x + "[c] to place " + x + " advancement counters", button: "X = " + x }
        : { id: 0, label: "Do not pay", button: "Do not pay" });
    var aiTarget = null;
    if (corp.AI) {
      aiTarget = this._aiBestTarget(targets);
      var wanted = aiTarget ? Math.max(0, Math.min(max, corp.AI._advancementStillRequired(aiTarget.card))) : 0;
      corp.AI.preferred = { title: this.title, option: choices.find(function (choice) { return choice.id == wanted; }) };
    }
    DecisionPhase(corp, choices, function (params) {
      var x = params.id;
      if (x < 1) return;
      if (corp.AI && aiTarget) corp.AI.preferred = { title: source.title, option: aiTarget };
      DecisionPhase(corp, targets, function (target) {
        SpendCredits(corp, x, "using", source, function () {
          AddCounters(target.card, "advancement", x);
        }, source);
      }, source.title, "Choose 1 installed card to place " + x + " advancement counters on", source);
    }, this.title, "Choose X", this);
  },
  //AI: guess the most common type from public Runner cards (heap and rig), never the grip.
  _aiGuessGripType: function () {
    var weights = { event: 2, hardware: 1, program: 1.5, resource: 1.5 };
    var seen = runner.heap.concat(InstalledCards(runner));
    for (var i = 0; i < seen.length; i++)
      if (typeof weights[seen[i].cardType] == "number") weights[seen[i].cardType]++;
    var best = this._gripTypes[0];
    for (var j = 1; j < this._gripTypes.length; j++)
      if (weights[this._gripTypes[j]] > weights[best]) best = this._gripTypes[j];
    return best;
  },
  //AI: an advanceable Corp card worth fast advancing, else an unfinished Corp agenda.
  _aiBestTarget: function (targets) {
    var best = null;
    for (var i = 0; i < targets.length; i++) {
      var card = targets[i].card;
      if (card.player != corp || !CheckAdvance(card)) continue;
      if (corp.AI._advancementStillRequired(card) < 1) continue;
      var rank = corp.AI._cardShouldBeFastAdvanced(card) ? 2 : CheckCardType(card, ["agenda"]) ? 1 : 0;
      if (rank < 1) continue;
      if (!best || rank > best.rank || (rank == best.rank &&
          Counters(card, "advancement") > Counters(best.option.card, "advancement")))
        best = { rank: rank, option: targets[i] };
    }
    return best ? best.option : null;
  },
  AIWouldPlay: function () {
    if (runner.grip.length < 2) return false;
    if (Credits(corp) < PlayCost(this) + 2) return false;
    return !!this._aiBestTarget(ChoicesInstalledCards(corp, function () { return true; }));
  },
  AIPlayWhenCan: 1,
};

//Game Over (26053)
// Play only if the Runner stole an agenda during their last turn.
// Choose a Runner card type. Trash all installed non-icebreaker cards of the chosen type. For each card that would be trashed this way, the Runner may pay 3[c] to prevent that card from being trashed.
// Take 1 bad publicity.
cardSet[26053] = {
  title: "Game Over",
  elo: 1286,
  imageFile: "26053.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: ["Gray Ops", "Liability"],
  playCost: 4,
  stoleAgendaLastTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.stoleAgendaLastTurn = false; },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnStolen: {
    Resolve: function () { if (playerTurn == runner) this.stoleAgendaLastTurn = true; },
    automatic: true,
    availableWhenInactive: true,
  },
  _runnerTypes: ["hardware", "program", "resource", "event"],
  _targetsOfType: function (type) {
    return InstalledCards(runner).filter(function (card) {
      return CheckCardType(card, [type]) && !CheckSubType(card, "Icebreaker") && CheckTrash(card);
    });
  },
  _cardValue: function (card) {
    var value = (card.installCost || 0) + Counters(card, "credits") + Counters(card, "virus");
    if (card.hostedCards) value += 2 * card.hostedCards.length;
    if (CheckSubType(card, "Console")) value += 2;
    return value;
  },
  Enumerate: function () {
    return this.stoleAgendaLastTurn ? [{}] : [];
  },
  Resolve: function () {
    var source = this;
    var choices = this._runnerTypes.map(function (type) {
      var name = type.charAt(0).toUpperCase() + type.slice(1);
      return { cardType: type, label: name, button: name };
    });
    if (corp.AI) {
      var best = this._aiBestType().cardType;
      corp.AI.preferred = { title: this.title, option: choices.find(function (choice) { return choice.cardType == best; }) };
    }
    DecisionPhase(corp, choices, function (params) {
      Log("Game Over chooses " + params.cardType);
      //offer the most valuable cards first, so shared credits protect those
      var targets = source._targetsOfType(params.cardType).sort(function (a, b) {
        return source._cardValue(b) - source._cardValue(a);
      });
      source._offerPrevention(targets, 0, []);
    }, this.title, "Choose a Runner card type", this);
  },
  _offerPrevention: function (targets, index, toTrash) {
    var source = this;
    if (index >= targets.length) {
      Trash(toTrash, true, function () { BadPublicity(1, null, source); }, source, undefined, corp);
      return;
    }
    var card = targets[index];
    var next = function () { source._offerPrevention(targets, index + 1, toTrash); };
    if (!CheckCredits(runner, 3)) {
      toTrash.push(card);
      next();
      return;
    }
    var choices = [
      { id: 1, label: "Pay 3[c] to prevent " + GetTitle(card) + " from being trashed", button: "Pay 3[c]" },
      { id: 0, label: "Allow " + GetTitle(card) + " to be trashed", button: "Allow" },
    ];
    if (runner.AI) runner.AI.preferred = { title: this.title, option: this._cardValue(card) >= 3 ? choices[0] : choices[1] };
    DecisionPhase(runner, choices, function (params) {
      if (params.id == 1) SpendCredits(runner, 3, "", null, next, source);
      else {
        toTrash.push(card);
        next();
      }
    }, this.title, "Pay 3[c] to prevent " + GetTitle(card) + " from being trashed?", this);
  },
  //AI: credit-equivalent loss per type; a Runner save costs them 3[c] (they save cards worth 3+).
  _aiTypeGain: function (type) {
    var source = this;
    var values = this._targetsOfType(type).map(function (card) { return source._cardValue(card); })
      .sort(function (a, b) { return b - a; });
    var saves = Math.floor(Credits(runner) / 3);
    var gain = 0;
    for (var i = 0; i < values.length; i++) {
      if (values[i] >= 3 && saves > 0) {
        saves--;
        gain += 3;
      } else gain += Math.max(1, values[i]);
    }
    return gain;
  },
  _aiBestType: function () {
    var best = { cardType: this._runnerTypes[0], gain: this._aiTypeGain(this._runnerTypes[0]) };
    for (var i = 1; i < this._runnerTypes.length; i++) {
      var gain = this._aiTypeGain(this._runnerTypes[i]);
      if (gain > best.gain) best = { cardType: this._runnerTypes[i], gain: gain };
    }
    return best;
  },
  AIWouldPlay: function () {
    if (!this.stoleAgendaLastTurn) return false;
    return this._aiBestType().gain >= 5;
  },
  AIPlayWhenCan: 2,
};

//Increased Drop Rates (26054)
// While the Runner is accessing this upgrade in R&D, they must reveal it.
// When the Runner accesses this upgrade, remove 1 bad publicity unless they take 1 tag.
cardSet[26054] = {
  title: "Increased Drop Rates",
  elo: 1216,
  imageFile: "26054.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "upgrade",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 2,
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
      return accessingCard == this ? [{}] : [];
    },
    Resolve: function () {
      var choices = [
        { id: 0, label: "The Corp removes 1 bad publicity", button: "Remove bad publicity" },
        { id: 1, label: "Take 1 tag", button: "Take 1 tag" },
      ];
      if (runner.AI) runner.AI.preferred = { title: this.title, option: choices[this._aiRunnerTakesTag() ? 1 : 0] };
      DecisionPhase(runner, choices, function (params) {
        if (typeof RecordPublicPostureEvent === "function") RecordPublicPostureEvent("trapFired", this);
        if (params.id == 1) AddTags(1);
        else if (corp.badPublicity > 0) {
          corp.badPublicity--;
          Log("1 bad publicity removed");
          UpdateCounters();
        } else Log("The Corp has no bad publicity to remove");
      }, this.title, "Take 1 tag, or the Corp removes 1 bad publicity", this);
    },
    text: "Increased Drop Rates: remove 1 bad publicity unless the Runner takes 1 tag",
  },
  automaticOnAccessComplete: {
    Resolve: function (card) {
      if (card == this && card.cardLocation != corp.archives.cards && !this.storedFaceUp) this.faceUp = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //Runner AI: a tag matters less when already tagged; with no bad publicity, refusing costs nothing.
  _aiRunnerTakesTag: function () {
    return corp.badPublicity > 0 && runner.tags > 0;
  },
  //Corp AI: only worth installing with bad publicity to remove; sit with a Corp agenda, else in HQ.
  AIPreferredUpgradeServer: function (legalServers) {
    if (corp.badPublicity < 1) return null;
    for (var i = 0; i < legalServers.length; i++) {
      var root = legalServers[i].root || [];
      if (typeof legalServers[i].cards == "undefined" &&
          root.some(function (card) { return CheckCardType(card, ["agenda"]); }))
        return legalServers[i];
    }
    return legalServers.includes(corp.HQ) ? corp.HQ : null;
  },
  AIPunishesAccess: function (server) {
    if (!server) return 0;
    var here = (server.root && server.root.includes(this)) || (server.cards && server.cards.includes(this));
    return here && corp.badPublicity > 0 ? 1 : 0;
  },
};

//Divested Trust (26055)
// Whenever the Runner steals another agenda, you may forfeit this agenda to gain 5[c] and add the stolen agenda to HQ.
cardSet[26055] = {
  title: "Divested Trust",
  elo: 1434,
  imageFile: "26055.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 3,
  agendaPoints: 1,
  responseOnStolen: {
    Enumerate: function () {
      var stolen = intended.steal;
      if (!stolen || stolen == this || this.cannotForfeit) return [];
      if (!corp.scoreArea.includes(this) || !runner.scoreArea.includes(stolen)) return [];
      return [{}];
    },
    Resolve: function () {
      var source = this;
      var stolen = intended.steal;
      var choices = [
        { id: 1, label: "Forfeit to gain 5[c] and add " + GetTitle(stolen, true) + " to HQ", button: "Forfeit" },
        { id: 0, label: "Decline", button: "Decline" },
      ];
      if (corp.AI) corp.AI.preferred = { title: this.title, option: choices[(stolen.agendaPoints || 0) >= 1 ? 0 : 1] };
      DecisionPhase(corp, choices, function (params) {
        if (params.id != 1) return;
        Forfeit(source, function () {
          GainCredits(corp, 5, "", source);
          if (!runner.scoreArea.includes(stolen)) return;
          MoveCard(stolen, corp.HQ.cards);
          stolen.faceUp = false;
          stolen.advancement = 0;
          Log(GetTitle(stolen, true) + " added to HQ");
        });
      }, this.title, "Forfeit Divested Trust?", this);
    },
    text: "Divested Trust: forfeit to gain 5[c] and add the stolen agenda to HQ",
  },
};

//SDS Drone Deployment (26056)
// As an additional cost to steal this agenda, the Runner must trash 1 installed program.
// When you score this agenda, trash 1 installed program.
cardSet[26056] = {
  title: "SDS Drone Deployment",
  elo: 1759,
  imageFile: "26056.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 5,
  agendaPoints: 3,
  //StealCost/CheckSteal/the access steal option pay this through PayStealCostPrograms.
  stealCost: { programs: 1 },
  _trashablePrograms: function () {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["program"]) && CheckTrash(card);
    });
  },
  responseOnScored: {
    Enumerate: function () {
      return intended.score == this && this._trashablePrograms().length > 0 ? [{}] : [];
    },
    Resolve: function () {
      var choices = this._trashablePrograms();
      if (choices.length < 1) return;
      //the Corp AI resolves the "trash" command with _bestTrashOption (ranked threats)
      DecisionPhase(corp, choices, function (params) {
        Log("SDS Drone Deployment trashes " + GetTitle(params.card));
        Trash(params.card, true, null, this, undefined, corp);
      }, this.title, "Choose 1 installed program to trash", this, "trash");
    },
    text: "SDS Drone Deployment: trash 1 installed program",
  },
};

//Roughneck Repair Squad (26057)
// [click][click][click]: Gain 6[c]. You may remove 1 bad publicity.
cardSet[26057] = {
  title: "Roughneck Repair Squad",
  elo: 1392,
  imageFile: "26057.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "asset",
  subTypes: ["Industrial"],
  rezCost: 0,
  trashCost: 3,
  abilities: [
    {
      text: "[click][click][click]: Gain 6[c]. You may remove 1 bad publicity.",
      Enumerate: function () {
        if (!this.rezzed) return [];
        if (!CheckActionClicks(corp, 3)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 3);
        GainCredits(corp, 6, "", this);
        if (corp.badPublicity < 1) return;
        var choices = [
          { id: 1, label: "Remove 1 bad publicity", button: "Remove" },
          { id: 0, label: "Do not remove bad publicity", button: "Pass" },
        ];
        // Bad publicity only helps the Runner, so the Corp AI always removes it.
        if (corp.AI != null)
          corp.AI.preferred = { title: "Roughneck Repair Squad", option: choices[0] };
        DecisionPhase(
          corp,
          choices,
          function (params) {
            if (params && params.id === 1 && corp.badPublicity > 0) {
              corp.badPublicity--;
              Log("1 bad publicity removed");
            }
          },
          "Roughneck Repair Squad",
          "You may remove 1 bad publicity",
          this,
        );
      },
    },
  ],
  // Economy remote: decline when the economy is already sufficient.
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.AI._sufficientEconomy(false)) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    }
    return emptyProtectedRemotes.length;
  },
  AIEconomyCard: true,
  // Rezzing is free and only enables the click ability.
  AIRezWhenCan: function () {
    return true;
  },
};

//Afshar (26058)
// While this ice is protecting HQ, the Runner cannot break more than 1 of its printed subroutines during each encounter.
// ↳ The Runner loses 2[c].
// ↳ End the run.
cardSet[26058] = {
  title: "Afshar",
  elo: 1703,
  imageFile: "26058.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 3,
  strength: 1,
  // Printed subroutines broken this encounter (broken flags reset when an encounter begins).
  _printedBroken: function () {
    var count = 0;
    for (var i = 0; i < this.subroutines.length; i++) {
      if (this.subroutines[i].printed && this.subroutines[i].broken) count++;
    }
    return count;
  },
  _breakLimitApplies: function () {
    return this.rezzed && GetServer(this) == corp.HQ;
  },
  // CardEffectsForbid("break", subroutine) is checked by ChoicesEncounteredSubroutines and Break.
  modifyCannot: {
    Resolve: function (id, subroutine) {
      if (id !== "break" || !subroutine || !subroutine.printed) return false;
      if (this.subroutines.indexOf(subroutine) < 0) return false;
      if (!this._breakLimitApplies()) return false;
      return this._printedBroken() >= 1;
    },
  },
  subroutines: [
    {
      text: "The Runner loses 2[c].",
      printed: true,
      Resolve: function () {
        LoseCredits(runner, 2);
      },
      visual: { y: 124, h: 16 },
    },
    {
      text: "End the run.",
      printed: true,
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 144, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseCredits", "loseCredits"]], [["endTheRun"]]];
    // SrBreak never plans more breaks than maxSrBroken on this encounter.
    if (this._breakLimitApplies())
      result.maxSrBroken = Math.max(0, 1 - this._printedBroken());
    return result;
  },
};

//Sandstone (26059)
// When the Runner encounters this ice, place 1 virus counter on it.
// This ice gets −1 strength for each hosted virus counter.
// ↳ End the run.
cardSet[26059] = {
  title: "Sandstone",
  elo: 1612,
  imageFile: "26059.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 6,
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (ice != this) return;
      Log("Sandstone: placing 1 virus counter (strength -1)");
      AddCounters(this, "virus", 1);
    },
  },
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) {
        return -Counters(this, "virus");
      }
      return 0;
    },
  },
  subroutines: [
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 129, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // Before its encounter, the counter it gains on encounter is still to come.
    if (!(CheckEncounter() && GetApproachEncounterIce() == this))
      result.strength = Math.max(0, result.strength - 1);
    result.sr = [[["endTheRun"]]];
    return result;
  },
};

//Trebuchet (26060)
// When you rez this ice, take 1 bad publicity.
// ↳ Trash 1 installed Runner card.
// ↳ Trace[6]. If successful, the Runner cannot steal or trash Corp cards for the remainder of this run.
cardSet[26060] = {
  title: "Trebuchet",
  elo: 1512,
  imageFile: "26060.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer", "Tracer", "Liability"],
  rezCost: 7,
  strength: 6,
  responseOnRez: {
    Resolve: function (card) {
      if (card != this) return;
      Log("Trebuchet rezzed: Corp takes 1 bad publicity");
      BadPublicity(1);
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "Trash 1 installed Runner card.",
      Resolve: function () {
        var choices = ChoicesInstalledCards(runner, CheckTrash);
        if (choices.length < 1) return;
        DecisionPhase(
          corp,
          choices,
          function (params) {
            if (params && params.card) Trash(params.card, true);
          },
          "Trebuchet",
          "Choose an installed Runner card to trash",
          this,
          "trash",
        );
      },
      visual: { y: 94, h: 16 },
    },
    {
      text: "Trace[6]. If successful, the Runner cannot steal or trash Corp cards for the remainder of this run.",
      Resolve: function () {
        Trace(6, function (successful) {
          if (!successful) return;
          Log("Trebuchet: the Runner cannot steal or trash Corp cards for the remainder of this run");
          // A lingering effect survives Trebuchet being derezzed or trashed later this run.
          AddLingeringEffect({
            title: "Trebuchet",
            modifyCannot: {
              Resolve: function (id, card) {
                return card && card.player == corp && (id == "steal" || id == "trash");
              },
            },
            responseOnRunEnds: {
              Resolve: function () {
                RemoveLingeringEffect(this);
              },
              automatic: true,
            },
          });
        });
      },
      visual: { y: 129, h: 48 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // Trash: serious with a program to lose, moderate otherwise (Ansel 1.0 model).
    var programs = ChoicesInstalledCards(runner, function (c) {
      return CheckCardType(c, ["program"]);
    });
    if (rc.precalculated.runnerInstalledCardsLength > 0) {
      if (programs.length > 0) result.sr.push([["misc_serious"]]);
      else result.sr.push([["misc_moderate"]]);
    } else result.sr.push([[]]);
    // A successful trace denies all steals and trashes for the rest of the run.
    if (incomplete) result.sr.push([[]]);
    else result.sr.push([["misc_serious"]]);
    return result;
  },
};

//Secure and Protect (26061)
// As an additional cost to play this operation, spend [click].
// Search R&D for 1 piece of ice and reveal it. (Shuffle R&D after searching it.) Install that ice protecting a central server, paying 3[c] less.
cardSet[26061] = {
  title: "Secure and Protect",
  elo: 1364,
  imageFile: "26061.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "operation",
  subTypes: ["Double"],
  playCost: 1,
  installingIce: null,
  modifyInstallCost: {
    Resolve: function (card) {
      return card == this.installingIce ? -3 : 0;
    },
  },
  // Installable (ice, central server) pairs; the discount is applied locally,
  // so probing from HQ needs no active modifier and changes no state.
  _choices: function (credits) {
    var choices = [];
    var centrals = [corp.HQ, corp.RnD, corp.archives];
    for (var i = 0; i < corp.RnD.cards.length; i++) {
      var ice = corp.RnD.cards[i];
      if (!CheckCardType(ice, ["ice"])) continue;
      for (var j = 0; j < centrals.length; j++) {
        if (!CheckInstallDestination(ice, centrals[j])) continue;
        var cost = Math.max(0, InstallCost(ice, centrals[j]) - 3);
        if (cost > credits) continue;
        choices.push({
          card: ice,
          server: centrals[j],
          cost: cost,
          label: GetTitle(ice) + " → " + ServerName(centrals[j]),
        });
      }
    }
    return choices;
  },
  Resolve: function () {
    var choices = this._choices(Credits(corp));
    if (choices.length < 1) {
      Log("Secure and Protect found no ice that can be installed");
      Shuffle(corp.RnD.cards);
      return;
    }
    if (corp.AI != null) {
      var preferred = this._preferredChoice(choices, 0);
      if (preferred) corp.AI.preferred = { title: this.title, option: preferred };
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        var ice = params.card;
        var server = params.server;
        Reveal(
          ice,
          function () {
            this.installingIce = ice;
            var clearDiscount = function () {
              this.installingIce = null;
            };
            Install(ice, server, false, null, true, null, this, clearDiscount, clearDiscount, false, clearDiscount);
            // Install has moved the ice out of R&D; shuffle after searching.
            Shuffle(corp.RnD.cards);
          },
          this,
          undefined,
          false,
          corp,
        );
      },
      this.title,
      "Reveal 1 piece of ice from R&D and install it protecting a central server",
      this,
    );
  },
  // The central that most needs protection; prefer stopping ice the Runner
  // cannot yet break and can be rezzed after installation.
  _preferredChoice: function (choices, extraCost) {
    var ai = corp.AI;
    if (!ai) return null;
    var centrals = [corp.HQ, corp.RnD, corp.archives];
    var server = ai._serverToProtect(false, false, function (s) {
      return centrals.includes(s);
    });
    if (!server) return null;
    var credits = Credits(corp) - extraCost;
    var candidates = choices.filter(function (choice) {
      return choice.server == server && choice.cost <= credits;
    });
    candidates.sort(function (a, b) {
      var stopping = Number(ai._iceHasETR(b.card)) - Number(ai._iceHasETR(a.card));
      if (stopping) return stopping;
      var rezA = Number(credits - a.cost >= RezCost(a.card));
      var rezB = Number(credits - b.cost >= RezCost(b.card));
      if (rezA != rezB) return rezB - rezA;
      var covered = Number(ai._aCompatibleBreakerIsInstalled(a.card)) - Number(ai._aCompatibleBreakerIsInstalled(b.card));
      if (covered) return covered;
      return (b.card.elo || 0) - (a.card.elo || 0);
    });
    return candidates[0] || null;
  },
  AIWouldPlay: function () {
    var extra = PlayCost(this);
    var preferred = this._preferredChoice(this._choices(Math.max(0, Credits(corp) - extra)), extra);
    if (!preferred || !corp.AI._iceHasETR(preferred.card)) return false;
    // A one-click install of stopping ice from HQ is cheaper than this Double tutor.
    return !corp.AI._affordableIce(preferred.server, corp.HQ.cards).some(function (ice) {
      return corp.AI._iceHasETR(ice);
    });
  },
  AIPlayWhenCan: 1,
  AIIsRecurOrTutor: true,
};

//Reduced Service (26062)
// When you rez this upgrade, you may pay up to 4[c] to place that many power counters on it.
// As an additional cost to run this server, the Runner must pay 2[c] for each hosted power counter.
// Whenever the Runner makes a successful run on a central server, remove 1 hosted power counter.
cardSet[26062] = {
  title: "Reduced Service",
  elo: 1380,
  imageFile: "26062.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "upgrade",
  subTypes: [],
  rezCost: 0,
  trashCost: 2,
  unique: true,
  power: 0,
  responseOnRez: {
    Enumerate: function (card) {
      if (card != this) return [];
      var max = Math.min(4, AvailableCredits(corp, "using", this));
      //**AI code: offer only the preferred amount
      if (corp.AI != null) {
        var x = Math.min(max, this._AIPreferredCounters());
        return [{ id: x, label: "Pay " + x + "[c]", button: "Pay " + x }];
      }
      var choices = [];
      for (var i = 0; i <= max; i++)
        choices.push({ id: i, label: "Pay " + i + "[c]", button: "Pay " + i });
      return choices;
    },
    Resolve: function (params) {
      var x = params && params.id ? params.id : 0;
      if (x < 1) return;
      SpendCredits(corp, x, "using", this, function () {
        AddCounters(this, "power", x);
      }, this);
    },
    text: "Reduced Service: pay up to 4[c] for power counters",
  },
  modifyRunCreditCost: {
    Resolve: function (server) {
      return GetServer(this) == server ? 2 * Counters(this, "power") : 0;
    },
  },
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      if (server != corp.HQ && server != corp.RnD && server != corp.archives) return;
      if (Counters(this, "power") > 0) RemoveCounters(this, "power", 1);
    },
  },
  //Counters bought at rez, keeping credits to rez this server's unrezzed ICE.
  _AIPreferredCounters: function () {
    var server = GetServer(this);
    var reserve = 0;
    if (server) server.ice.forEach(function (ice) { if (!ice.rezzed) reserve += RezCost(ice); });
    return Math.max(0, Math.min(4, AvailableCredits(corp, "using", this) - reserve));
  },
  AIDefensiveValue: function (server) {
    return server && typeof server.cards == "undefined" && server.ice.length ? 2 : 0;
  },
  AILimitPerServer: function () { return 1; },
  //Rez between runs on the Runner's turn so the tax applies to the next run.
  AIRezWhenCan: function () {
    var server = GetServer(this);
    if (!server || CheckRunning() || playerTurn != runner) return false;
    var self = this;
    if (typeof server.cards == "undefined" &&
        !server.root.some(function (card) { return card != self; })) return false;
    return this._AIPreferredCounters() > 0;
  },
};

//Vulnerability Audit (26063)
// You cannot score this agenda if it was installed this turn.
cardSet[26063] = {
  title: "Vulnerability Audit",
  elo: 1581,
  imageFile: "26063.png",
  player: corp,
  faction: "Neutral",
  influence: 1,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 4,
  agendaPoints: 3,
  installedThisTurn: false,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) this.installedThisTurn = true;
    },
    availableWhenInactive: true,
  },
  automaticOnCorpTurnBegins: {
    Resolve: function () { this.installedThisTurn = false; },
    availableWhenInactive: true,
  },
  automaticOnRunnerTurnBegins: {
    Resolve: function () { this.installedThisTurn = false; },
    availableWhenInactive: true,
  },
  modifyCannot: {
    Resolve: function (str, card) {
      return str == "score" && card == this && this.installedThisTurn && CheckInstalled(this);
    },
    availableWhenInactive: true,
  },
  AICannotScoreOnInstallTurn: true,
};

//CSR Campaign (26064)
// When your turn begins, you may draw 1 card.
cardSet[26064] = {
  title: "CSR Campaign",
  elo: 1311,
  imageFile: "26064.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 2,
  trashCost: 2,
  responseOnCorpTurnBegins: {
    Enumerate: function () {
      if (!this.rezzed) return [];
      var drawChoice = { id: 1, label: "Draw 1 card", button: "Draw 1" };
      var passChoice = { id: 0, label: "Do not draw", button: "Pass" };
      //**AI code: draw unless it would leave R&D too thin for the mandatory draw
      if (corp.AI != null) return [corp.RnD.cards.length > 2 ? drawChoice : passChoice];
      return [drawChoice, passChoice];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        Log("CSR Campaign: Corp draws 1 card");
        Draw(corp, 1);
      }
    },
    text: "CSR Campaign: draw 1 card?",
  },
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.RnD.cards.length < 4 || PlayerHand(corp).length > MaxHandSize(corp) - 2) return -1;
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
  //Rez at the end of the Runner's turn, just before the first draw trigger.
  AIRezWhenCan: function () {
    return currentPhase.identifier == "Runner 2.2" && corp.RnD.cards.length > 2;
  },
};

//Rime (26065)
// During runs against this server, you can rez this ice any time you could rez non-ice cards.
// Each piece of ice protecting this server gets +1 strength.
// ↳ The Runner loses 1[c].
cardSet[26065] = {
  title: "Rime",
  elo: 1425,
  imageFile: "26065.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Mythic"],
  rezCost: 0,
  strength: 0,
  //During runs against this server, rez like a non-ice card (CheckRezAsNonIceDuringRun).
  rezAsNonIceDuringRunsOnServer: true,
  //Each piece of ice protecting this server, including this one, gets +1 strength.
  modifyStrength: {
    Resolve: function (card) {
      if (!this.rezzed || !CheckCardType(card, ["ice"])) return 0;
      var rimeServer = GetServer(this);
      if (rimeServer != null && rimeServer.ice.includes(card)) return 1;
      return 0;
    },
  },
  subroutines: [
    {
      text: "The Runner loses 1[c].",
      Resolve: function () {
        Log("Rime: Runner loses 1[c]");
        LoseCredits(runner, 1);
      },
      visual: { y: 144, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseCredits"]]];
    return result;
  },
  //Rez as early as possible in a run on this server so every layer gets +1 strength.
  AIRezWhenCan: function () {
    return CheckRezAsNonIceDuringRun(this);
  },
};
