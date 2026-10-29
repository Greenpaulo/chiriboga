//CARD DEFINITIONS FOR UPRISING
//Card ID range: 26066-26130
// ELO: Trash or Busto ranking (https://trash-or-busto.herokuapp.com/ranking), checked
// 2026-10-23 for the 59 scaffolded cards; Uprising Booster Pack cards (Mystic Maemi, Swift,
// Megaprix Qualifier, La Costa Grid, Digital Rights Management, Cayambe Grid) are ranked
// under codes 27001-27007. Existing ratings preserved (Daily Casts 1877; ranking showed 1870).
setIdentifiers.push('ur');

//Paladin Poemu (26073)
//Anarch Resource: Companion - Virtual, cost 1, influence 3
//When your turn begins and whenever you steal an agenda, place 1 credit on this resource.
//You can spend hosted credits to install non-connection cards.
//When your turn ends, if there are 3 or more hosted credits, trash 1 of your installed cards.
cardSet[26073] = {
  title: "Paladin Poemu",
  elo: 1852,
  imageFile: "26073.png",
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Companion", "Virtual"],
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
    return doing == "installing" && !!card && !CheckSubType(card, "Connection");
  },
  // Mandatory: Poemu itself is installed, so there is always a legal target.
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (!CheckCounters(this, "credits", 3)) return [];
      return [{}];
    },
    Resolve: function () {
      var choices = ChoicesInstalledCards(runner);
      if (choices.length < 1) return;
      if (runner.AI != null) choices = [this.AITrashChoice(choices)];
      DecisionPhase(
        runner,
        choices,
        function (params) {
          Trash(params.card, true);
        },
        "Paladin Poemu",
        "Trash 1 of your installed cards",
        this,
      );
    },
    text: "Paladin Poemu: Trash 1 installed card (3+ hosted credits)",
  },
  // Lowest value: AIOkToTrash cards first, then by install cost plus hosted
  // credits and counters; icebreakers and consoles are protected. Poemu itself
  // is a candidate valued with its hosted credits.
  AITrashChoice: function (choices) {
    var score = function (card) {
      var value = (card.installCost || 0) + Counters(card, "credits") + Counters(card, "virus") + Counters(card, "power");
      if (typeof card.AIOkToTrash == "function" && card.AIOkToTrash.call(card)) value -= 100;
      if (CheckSubType(card, "Icebreaker")) value += 20;
      if (CheckSubType(card, "Console")) value += 15;
      return value;
    };
    var best = choices[0];
    for (var i = 1; i < choices.length; i++)
      if (score(choices[i].card) < score(best.card)) best = choices[i];
    return best;
  },
  AIEconomyInstall: function () {
    return 2;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Daily Casts (26094)
//Neutral Resource, cost 3, influence 0
//When you install this resource, load 8 credits onto it. When it is empty, trash it.
//When your turn begins, take 2 credits from this resource.
cardSet[26094] = {
  title: "Daily Casts",
  elo: 1877,
  imageFile: "26094.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: [],
  installCost: 3,

  //When you install this resource, load 8 credits onto it.
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) LoadCredits(this, 8);
    },
  },

  //When your turn begins, take 2 credits from this resource. When it is empty, trash it.
  //Not automatic: the empty trash opens trash interrupt/response windows (e.g. Buffer Drive).
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      if (!CheckCounters(this, "credits", 1)) return [];
      return [{}];
    },
    Resolve: function () {
      //take as many as possible (only 2 is reachable unless another effect removed one)
      TakeCredits(runner, this, 2);
      if (!CheckCounters(this, "credits", 1)) {
        Log(GetTitle(this, true) + " is empty");
        Trash(this, true);
      }
    },
    text: "Daily Casts: take 2[c]",
  },

  //AI evaluation functions
  AIEconomyInstall: function () {
    //Excellent drip economy: pay 3, get 8 over 4 turns = 5 credit profit
    //High priority economy card
    return 3;
  },

  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Always worth keeping - excellent economy card
    return true;
  },
};

//Self-modifying Code (26090)
//Shaper Program, cost 0, MU 2, influence 3
//2 credits, trash: Search your stack for 1 program. Install it. (Shuffle your stack after searching it.)
cardSet[26090] = {
  title: "Self-modifying Code",
  elo: 1988,
  imageFile: "26090.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 0,
  memoryCost: 2,
  //AI: the program chosen by AIAbilityInstallBreakers for the next use
  _aiTutorTarget: null,
  _programChoices: function () {
    return ChoicesArrayInstall(runner.stack, false, function (card) {
      return CheckCardType(card, ["program"]);
    });
  },
  abilities: [
    {
      text: "2[c], [trash]: Search your stack for 1 program. Install it. (Shuffle your stack after searching it.)",
      alt: "smc_tutor",
      Enumerate: function () {
        //the search may fail to find, so an empty stack does not prevent the ability
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckTrash(this)) return [];
        if (runner.AI != null && this._aiTutorTarget && !runner.stack.includes(this._aiTutorTarget)) return [];
        return [{}];
      },
      Resolve: function () {
        var smc = this;
        var target = runner.AI != null ? this._aiTutorTarget : null;
        this._aiTutorTarget = null;
        SpendCredits(
          runner,
          2,
          "using",
          this,
          function () {
            //trashing is part of the cost, so it cannot be prevented (and frees this program's MU first)
            Trash(
              smc,
              false,
              function () {
                //install costs are paid after the ability's 2[c]
                var choices = smc._programChoices();
                var finish = function () {
                  Shuffle(runner.stack);
                  Log("Stack shuffled");
                };
                if (runner.AI != null) {
                  var preferred = target || runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, InstalledCards(runner));
                  var targeted = choices.filter(function (choice) {
                    return choice.card == preferred;
                  });
                  if (targeted.length > 0) choices = targeted;
                }
                if (choices.length < 1) {
                  Log("Self-modifying Code found no program it can install");
                  finish();
                  return;
                }
                //a hidden-zone search may fail to find
                if (runner.AI == null) choices.push({ card: null, label: "Install nothing", button: "Install nothing" });
                DecisionPhase(
                  runner,
                  choices,
                  function (params) {
                    finish();
                    if (!params || !params.card) return;
                    Install(params.card, params.host, false, null, true, null, smc, null, null, false);
                  },
                  "Self-modifying Code",
                  "Choose a program to install",
                  smc,
                  "install",
                );
              },
              smc,
            );
          },
          this,
        );
      },
    },
  ],

  //AI: install before a run when the stack holds a breaker it could fetch
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    if (spareMU < 2) return false;
    return !!runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, installedRunnerCards);
  },
  AIPreferredInstallChoice: function (choices) {
    if (MemoryUnits() - InstalledMemoryCost() < 2) return -1;
    return 0;
  },
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (MemoryUnits() - InstalledMemoryCost() < 2) return 0;
    if (!runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, InstalledCards(runner))) return 0;
    return 1;
  },
  //AI: run planner offers (stack icebreakers, priced at 2[c] plus the install cost)
  AIAbilityInstallBreakers: function (installedRunnerCards) {
    if (!CheckInstalled(this)) return [];
    var smc = this;
    var installedTitles = installedRunnerCards.map(function (card) {
      return card.title;
    });
    var seen = [];
    return runner.stack
      .filter(function (card) {
        if (!CheckCardType(card, ["program"]) || !CheckSubType(card, "Icebreaker")) return false;
        if (installedTitles.includes(card.title) || seen.includes(card.title)) return false;
        seen.push(card.title);
        return true;
      })
      .map(function (card) {
        return {
          card: card,
          cost: 2 + InstallCost(card),
          alt: "smc_tutor",
          select: function () {
            smc._aiTutorTarget = card;
          },
        };
      });
  },
};

//DreamNet (26095)
//Neutral Resource: Virtual, cost 3, influence 0, unique
//The first time each turn you make a successful run, draw 1 card.
//If your identity is digital or you have at least 2 link, also gain 1 credit.
cardSet[26095] = {
  title: "DreamNet",
  elo: 1813,
  imageFile: "26095.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: ["Virtual"],
  installCost: 3,
  unique: true,

  //The first time each turn you make a successful run, draw 1 card.
  //If your identity is digital or you have at least 2 link, also gain 1 credit.
  //TurnEventCount includes successful runs made before this resource was installed.
  //Not automatic: Draw can open the cards-drawn response window.
  responseOnRunSuccessful: {
    Enumerate: function () {
      if (TurnEventCount("runnerSuccessfulRun") != 1) return [];
      return [{}];
    },
    Resolve: function (params) {
      var gainsCredit = this.AIDreamNetGainsCredit();
      Draw(runner, 1, function () {
        if (gainsCredit) GainCredits(runner, 1, "", this);
      }, this);
    },
    text: "DreamNet: draw 1 card",
  },

  //AI evaluation functions
  //True when the credit clause applies (digital identity or at least 2 link).
  AIDreamNetGainsCredit: function () {
    return CheckSubType(runner.identityCard, "Digital") || Link() >= 2;
  },
  //Primarily a draw engine for a Runner who runs every turn.
  AIDrawInstall: function () {
    return 2;
  },
  //Also economy when the credit clause applies.
  AIEconomyInstall: function () {
    return this.AIDreamNetGainsCredit() ? 1 : 0;
  },

  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Always worth keeping - solid card draw for runners who run
    return true;
  },
};

//Mantle (26088)
//Shaper Program: Stealth, cost 1, MU 1, influence 2
//1 recurring credit. You can spend hosted credits to use hardware and programs.
cardSet[26088] = {
  title: "Mantle",
  elo: 1529,
  imageFile: "26088.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Stealth"],
  memoryCost: 1,
  installCost: 1,
  
  //1 recurring credit
  recurringCredits: 1,
  
  //You can spend hosted credits to use hardware and programs.
  canUseCredits: function (doing, card) {
    if (doing == "using") {
      if (!card) return false;
      //Can use for hardware
      if (card.cardType == "hardware") return true;
      //Can use for programs (includes icebreakers)
      if (card.cardType == "program") return true;
      //Also check subtypes for icebreakers explicitly
      if (CheckSubType(card, "Icebreaker")) return true;
    }
    return false;
  },
  
  //AI evaluation
  AIEconomyInstall: function () {
    //Useful stealth credit for icebreakers
    return 1.5;
  },
  
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Worth keeping if we have programs that can use the credits (icebreakers, etc)
    if (spareMU < 1) return false;
    
    //Check if we have icebreakers or other programs that cost credits to use
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Icebreaker")) return true;
    }
    //Check grip for icebreakers
    for (var i = 0; i < runner.grip.length; i++) {
      if (CheckSubType(runner.grip[i], "Icebreaker")) return true;
    }
    return true; //generally useful
  },
};

//Cybertrooper Talut (26091)
//Shaper Resource: Connection - Virtual, cost 2, influence 2, unique
//+1 link
//Whenever you install a non-AI icebreaker, that icebreaker gets +2 strength for the remainder of the turn.
cardSet[26091] = {
  title: "Cybertrooper Talut",
  elo: 1421,
  imageFile: "26091.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection", "Virtual"],
  installCost: 2,
  unique: true,

  //+1 link
  link: 1,

  //Icebreakers boosted this turn (per copy). The boost is a lingering effect: it
  //outlasts this resource, ends with the turn or when the breaker leaves play.
  boostedCards: [],

  //Whenever you install a non-AI icebreaker, that icebreaker gets +2 strength for the remainder of the turn.
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this || card.player != runner) return;
      if (!CheckSubType(card, "Icebreaker") || CheckSubType(card, "AI")) return;
      if (this.boostedCards.includes(card)) return;
      this.boostedCards.push(card);
      Log(GetTitle(card, true) + " gets +2 strength for the remainder of the turn");
    },
  },
  modifyStrength: {
    Resolve: function (card) {
      if (this.boostedCards.includes(card)) return 2;
      return 0;
    },
    availableWhenInactive: true,
  },
  automaticOnUninstall: {
    Resolve: function (card) {
      var index = this.boostedCards.indexOf(card);
      if (index > -1) this.boostedCards.splice(index, 1);
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //The turn ends after its discard step.
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      this.boostedCards = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpDiscardEnds: {
    Resolve: function () {
      this.boostedCards = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },

  //AI: link is passive; install when it can boost a breaker installed this turn
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    return true;
  },
  AIEconomyInstall: function () {
    //install ahead of a non-AI icebreaker waiting in the grip, otherwise only for link
    for (var i = 0; i < runner.grip.length; i++) {
      if (CheckSubType(runner.grip[i], "Icebreaker") && !CheckSubType(runner.grip[i], "AI")) return 1;
    }
    return 0;
  },
};

//Hoshiko Shiro: Untold Protagonist (26066)
// When your turn ends, if you accessed a card this turn, gain 2[c] and flip this identity.
// Flip side:
// When your turn begins, draw 1 card and lose 1[c].
// When your turn ends, if you did not access any cards this turn, flip this identity.
// No flip-side image or printed back-side stats are in the local data, so the
// face stays 26066 and the link stays 0; the flip state is logged.
cardSet[26066] = {
  title: "Hoshiko Shiro: Untold Protagonist",
  imageFile: "26066.png",
  elo: 1936,
  player: runner,
  faction: "Anarch",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 0,
  //false = front (Untold Protagonist), true = flip side
  flipped: false,
  //cards accessed during the current Runner turn
  accessedThisTurn: 0,
  _flip: function () {
    this.flipped = !this.flipped;
    Log(this.title + " flipped to its " + (this.flipped ? "flip" : "front") + " side");
  },
  automaticOnAccess: {
    Resolve: function () {
      if (playerTurn == runner) this.accessedThisTurn++;
    },
  },
  //Flip side: when your turn begins, draw 1 card and lose 1[c].
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.accessedThisTurn = 0;
      if (!this.flipped) return;
      Draw(runner, 1);
      if (Credits(runner) > 0 || runner.temporaryCredits > 0) LoseCredits(runner, 1);
    },
    automatic: true,
  },
  //"When your turn ends" fires at the end of the Runner discard step.
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      var accessed = this.accessedThisTurn > 0;
      this.accessedThisTurn = 0;
      if (!this.flipped) {
        if (!accessed) return;
        GainCredits(runner, 2, "", this);
        this._flip();
      } else if (!accessed) this._flip();
    },
    automatic: true,
  },
};

//Moshing (26067)
// As an additional cost to play this event, trash 3 cards from your grip.
// Gain 3[c] and draw 3 cards.
cardSet[26067] = {
  title: "Moshing",
  imageFile: "26067.png",
  elo: 1859,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  //Additional cost: choose exactly 3 other grip cards (multi-select for a human).
  Enumerate: function () {
    var moshing = this;
    var choices = ChoicesHandCards(runner, function (card) {
      return card != moshing;
    });
    if (choices.length < 3) return [];
    if (runner.AI != null) {
      var picked = this._aiCardsToTrash();
      if (!picked) return [];
      return [{ cards: picked, label: "Trash " + picked.map(function (card) { return card.title; }).join(", ") }];
    }
    choices.push({
      label: "Trash selected cards",
      button: "Trash 0/3 cards",
      multiSelectDynamicButtonText: function (numSelected) {
        return "Trash " + numSelected + "/3 cards";
      },
      multiSelectDynamicButtonEnabler: function (numSelected) {
        return numSelected === 3;
      },
    });
    for (var i = 0; i < choices.length; i++) choices[i].cards = [null, null, null];
    return choices;
  },
  Resolve: function (params) {
    var moshing = this;
    var cards = (params && params.cards ? params.cards : []).filter(function (card) {
      return card && card != moshing && runner.grip.includes(card);
    });
    if (cards.length != 3) {
      LogError("Moshing requires exactly 3 grip cards to trash");
      return;
    }
    //Trashing is a cost, so it cannot be prevented.
    Trash(
      cards,
      false,
      function () {
        GainCredits(runner, 3, "", moshing);
        Draw(runner, 3);
      },
      this,
    );
  },
  //AI: the three grip cards the discard ranking would drop first, but only when
  //none of them is worth keeping (otherwise null: do not play).
  _aiCardsToTrash: function () {
    var moshing = this;
    var ai = runner.AI;
    var pool = runner.grip.filter(function (card) {
      return card != moshing;
    });
    if (pool.length < 3) return null;
    var keep = ai._cardsWorthKeeping(pool);
    var saved = ai.cardsWorthKeeping;
    var picked = [];
    ai.cardsWorthKeeping = keep;
    try {
      while (picked.length < 3) {
        var options = pool
          .filter(function (card) {
            return !picked.includes(card);
          })
          .map(function (card) {
            return { card: card };
          });
        picked.push(options[ai._indexOfBestDiscardOption(options)].card);
      }
    } finally {
      ai.cardsWorthKeeping = saved;
    }
    if (picked.some(function (card) { return keep.includes(card); })) return null;
    return picked;
  },
  AIWouldPlay: function () {
    return this._aiCardsToTrash() != null;
  },
  AIOrdinaryEconomyPlay: true,
  AIPlayToDraw: 1,
};

//Devil Charm (26068)
// Whenever you encounter a piece of ice, you may remove this hardware from the game. If you do, that ice gets −6 strength for the remainder of this run.
cardSet[26068] = {
  title: "Devil Charm",
  imageFile: "26068.png",
  elo: 1761,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  unique: true,
  //the ice whose encounter window has already been answered (not offered again this encounter)
  _windowPassedIce: null,
  //AI decision for the current encounter, fixed at the first Enumerate
  _aiChoice: null,
  automaticOnEncounter: {
    Resolve: function () {
      this._windowPassedIce = null;
      this._aiChoice = null;
    },
  },
  responseOnEncounter: {
    Enumerate: function (card) {
      if (!card || !CheckCardType(card, ["ice"])) return [];
      var choices = [
        {
          id: 0,
          label: "Remove Devil Charm from the game: " + GetTitle(card, true) + " gets -6 strength for the remainder of this run",
          button: "Use Devil Charm",
          alt: "devilcharm_use",
        },
        { id: 1, label: "Decline", button: "Decline", alt: "continue" },
      ];
      if (runner.AI) runner.AI.preferred = { title: this.title, option: choices[this._aiUse(card) ? 0 : 1] };
      return choices;
    },
    Resolve: function (params) {
      var ice = GetApproachEncounterIce();
      this._windowPassedIce = ice;
      if (!params || params.id !== 0 || !ice) return;
      RemoveFromGame(this);
      AddLingeringEffect({
        title: "Devil Charm",
        player: runner,
        ice: ice,
        modifyStrength: {
          Resolve: function (card) {
            return card == this.ice ? -6 : 0;
          },
        },
        responseOnRunEnds: {
          Resolve: function () {
            RemoveLingeringEffect(this);
          },
          automatic: true,
        },
      });
      Log(GetTitle(ice, true) + " gets -6 strength for the remainder of this run");
      //the live strength now includes the reduction; replan without Devil Charm
      if (runner.AI) runner.AI.cachedBestPath = null;
    },
    text: "Devil Charm",
  },
  //AI: use it when the best route through the run uses Devil Charm on this ice.
  _aiUse: function (ice) {
    if (this._aiChoice && this._aiChoice.ice == ice) return this._aiChoice.use;
    var use = false;
    if (attackedServer && !runner.AI.rc._calculationActive) {
      runner.AI._cachedOrBestRun(attackedServer, approachIce);
      var path = runner.AI.cachedBestPath || [];
      var charm = this;
      use = path.some(function (point) {
        return point.persistents.some(function (p) {
          return p.use == charm && p.target == ice;
        });
      });
    }
    this._aiChoice = { ice: ice, use: use };
    return use;
  },
  //Run Calculator: at the start of an encounter, remove Devil Charm for -6
  //strength on that ice for the rest of the route. One use per route; the lost
  //hardware is charged as a moderate cost.
  AIEncounterAbility: function (rc, result, point, iceAI) {
    if (!CheckInstalled(this) || rc.PersistentsUse(point, this)) return result;
    if (point.sr_broken.length > 0) return result;
    for (var i = 0; i < point.card_str_mods.length; i++) {
      if (point.card_str_mods[i].iceIdx == point.iceIdx) return result;
    }
    if (!iceAI.ice || iceAI.ice.strengthCannotBeLowered || iceAI.strength <= 0) return result;
    if (CheckEncounter() && iceAI.ice == this._windowPassedIce) return result;
    var p = rc.CopyPoint(point);
    p.persistents = p.persistents.concat([{ use: this, target: iceAI.ice, iceIdx: point.iceIdx, strengthMod: -6 }]);
    p.effects = p.effects.concat([["misc_moderate"]]);
    result.push(p);
    return result;
  },
  //Corp security: one ice the Runner encounters can be 6 weaker (single use; see notes).
  AIReducesIceStrength: function (iceCard) {
    return CheckInstalled(this) ? 6 : 0;
  },
  //Install before running a server protected by visible ice of strength 4 or more.
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    if (!server || !server.ice) return 0;
    for (var i = 0; i < server.ice.length; i++) {
      var ice = server.ice[i];
      if (PlayerCanLook(runner, ice) && !ice.strengthCannotBeLowered && Strength(ice) >= 4) return 1;
    }
    return 0;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Gachapon (26069)
// [trash]: Set aside the top 6 cards of your stack faceup. You may install 1 program or virtual resource from among those cards, paying 2[c] less. Shuffle 3 of the remaining cards into your stack, then remove the rest from the game.
cardSet[26069] = {
  title: "Gachapon",
  imageFile: "26069.png",
  elo: 1659,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 0,
  //cards set aside by the current resolution
  setAsideCards: [],
  gachaponDiscount: false,
  gachaponInstalling: null,
  abilities: [
    {
      text: "[trash]: Set aside the top 6 cards of your stack faceup.",
      Enumerate: function () {
        if (!CheckInstalled(this)) return [];
        return [{}];
      },
      Resolve: function () {
        var gachapon = this;
        //Trashing is a cost, so it cannot be prevented.
        Trash(this, false, function () {
          gachapon._setAside();
        }, this);
      },
    },
  ],
  //paying 2[c] less (Gachapon is in the heap while this applies)
  modifyInstallCost: {
    Resolve: function (card) {
      if (!this.gachaponDiscount || !card) return 0;
      if (card == this.gachaponInstalling || this.setAsideCards.includes(card)) return -2;
      return 0;
    },
    availableWhenInactive: true,
  },
  _setAside: function () {
    this.setAsideCards = [];
    var n = Math.min(6, runner.stack.length);
    for (var i = 0; i < n; i++) {
      var top = runner.stack[runner.stack.length - 1];
      MoveCard(top, this.setAsideCards);
      top.faceUp = true;
    }
    Log("Gachapon set aside " + (n ? this.setAsideCards.map(function (card) { return GetTitle(card); }).join(", ") : "no cards"));
    this.gachaponDiscount = true;
    var choices = ChoicesArrayInstall(this.setAsideCards, false, function (card) {
      return CheckCardType(card, ["program"]) || (CheckCardType(card, ["resource"]) && CheckSubType(card, "Virtual"));
    });
    if (choices.length < 1) {
      this._afterInstall();
      return;
    }
    var skip = { card: null, label: "Install nothing", button: "Install nothing" };
    if (runner.AI != null) {
      var pick = this._aiInstallChoice(choices);
      choices = pick ? [pick] : [];
    }
    choices.push(skip);
    var gachapon = this;
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (!params || !params.card) {
          gachapon._afterInstall();
          return;
        }
        var done = false;
        var finish = function () {
          if (done) return;
          done = true;
          gachapon._afterInstall();
        };
        gachapon.gachaponInstalling = params.card;
        Install(params.card, params.host, false, null, true, null, gachapon, finish, null, false, finish);
      },
      "Gachapon",
      "You may install 1 program or virtual resource, paying 2[c] less",
      this,
      "install",
    );
  },
  _afterInstall: function () {
    this.gachaponDiscount = false;
    this.gachaponInstalling = null;
    var remaining = this.setAsideCards.slice();
    if (remaining.length <= 3) {
      this._shuffleAndRemove(remaining);
      return;
    }
    if (runner.AI != null) {
      this._shuffleAndRemove(this._aiCardsToShuffle(remaining));
      return;
    }
    var choices = ChoicesArrayCards(remaining);
    choices.push({
      label: "Shuffle selected cards into the stack",
      button: "Shuffle 0/3 cards",
      multiSelectDynamicButtonText: function (numSelected) {
        return "Shuffle " + numSelected + "/3 cards";
      },
      multiSelectDynamicButtonEnabler: function (numSelected) {
        return numSelected === 3;
      },
    });
    for (var i = 0; i < choices.length; i++) choices[i].cards = [null, null, null];
    DecisionPhase(
      runner,
      choices,
      function (params) {
        var chosen = (params && params.cards ? params.cards : []).filter(function (card) {
          return card && remaining.includes(card);
        });
        if (chosen.length != 3) chosen = remaining.slice(0, 3);
        this._shuffleAndRemove(chosen);
      },
      "Gachapon",
      "Choose 3 cards to shuffle into your stack; the rest are removed from the game",
      this,
    );
  },
  _shuffleAndRemove: function (toShuffle) {
    var rest = this.setAsideCards.filter(function (card) {
      return !toShuffle.includes(card);
    });
    for (var i = 0; i < toShuffle.length; i++) {
      toShuffle[i].faceUp = false;
      MoveCard(toShuffle[i], runner.stack);
    }
    for (var j = 0; j < rest.length; j++) RemoveFromGame(rest[j]);
    Shuffle(runner.stack);
    Log("Gachapon: " + toShuffle.length + " card(s) shuffled into the stack");
    this.setAsideCards = [];
  },
  //missing basic breaker types (installed or in grip)
  _aiMissingBreakerTypes: function () {
    var have = InstalledCards(runner).concat(runner.grip);
    return ["Fracter", "Decoder", "Killer"].filter(function (type) {
      return !have.some(function (card) {
        return CheckSubType(card, type);
      });
    });
  },
  //AI: an icebreaker of a missing type first, otherwise the highest-rated
  //non-wasteful card; null installs nothing.
  _aiInstallChoice: function (choices) {
    var missing = this._aiMissingBreakerTypes();
    var best = null;
    var bestScore = -Infinity;
    for (var i = 0; i < choices.length; i++) {
      var card = choices[i].card;
      if (runner.AI._wastefulToInstall(card)) continue;
      if (typeof card.AIPreferredInstallChoice == "function" &&
          card.AIPreferredInstallChoice(ChoicesCardInstall(card, true)) < 0) continue;
      var score = Number(card.elo) || 1500;
      if (missing.some(function (type) { return CheckSubType(card, type); })) score += 1000;
      if (choices[i].host) score -= 1;
      if (score > bestScore) {
        best = choices[i];
        bestScore = score;
      }
    }
    return best;
  },
  //AI: keep the three cards it most wants to draw later.
  _aiCardsToShuffle: function (cards) {
    var keep = runner.AI._cardsWorthKeeping(cards);
    var missing = this._aiMissingBreakerTypes();
    var score = function (card) {
      var s = (Number(card.elo) || 1500) / 1000;
      if (keep.includes(card)) s += 10;
      if (missing.some(function (type) { return CheckSubType(card, type); })) s += 20;
      return s;
    };
    return cards.slice().sort(function (a, b) {
      return score(b) - score(a);
    }).slice(0, 3);
  },
  //Dig when a basic breaker type is missing, the stack is deep enough and an
  //install can be afforded after the discount.
  AIWouldTrigger: function () {
    if (runner.stack.length < 6) return false;
    if (AvailableCredits(runner, "installing") < 1) return false;
    return this._aiMissingBreakerTypes().length > 0;
  },
  AIDrawTrigger: 1,
  AIDrawInstall: function () {
    return 1;
  },
};

//Keiko (26070)
// +2[mu]
// The first time each turn you install a companion card or spend credits from an installed companion card, gain 1[c].
// Limit 1 console per player.
cardSet[26070] = {
  title: "Keiko",
  imageFile: "26070.png",
  elo: 1751,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Console", "Companion"],
  installCost: 3,
  unique: true,
  memoryUnits: 2,
  // "The first time each turn" is a game event that may precede Keiko's
  // install, so both triggers read the engine's turn counter. The engine
  // records "runnerCompanionUse" once per companion install (before install
  // responses, so Keiko's own install counts) and once per payment that spent
  // hosted credits from a companion (before responseOnCreditsSpent).
  responseOnInstall: {
    Enumerate: function (card) {
      if (!card || card.player != runner || !CheckSubType(card, "Companion")) return [];
      if (TurnEventCount("runnerCompanionUse") != 1) return [];
      return [{}];
    },
    Resolve: function () {
      GainCredits(runner, 1, "", this);
    },
    text: "Keiko: Gain 1[c]",
  },
  responseOnCreditsSpent: {
    Enumerate: function (player, outsideAmount, doing, card, sources) {
      if (player != runner || !sources) return [];
      if (!sources.some(function (source) { return CheckSubType(source, "Companion"); })) return [];
      if (TurnEventCount("runnerCompanionUse") != 1) return [];
      return [{}];
    },
    Resolve: function () {
      GainCredits(runner, 1, "", this);
    },
    text: "Keiko: Gain 1[c]",
  },
  AIWastefulToInstall: function () {
    var self = this;
    return InstalledCards(runner).some(function (card) {
      return card != self && CheckSubType(card, "Console");
    });
  },
  AIWorthKeeping: function () {
    return !this.AIWastefulToInstall();
  },
  // A console with drip from companions: higher priority once one is in play or in hand.
  AIEconomyInstall: function () {
    if (this.AIWastefulToInstall()) return 0;
    var companion = function (card) { return CheckSubType(card, "Companion") && card.cardType != "hardware"; };
    return InstalledCards(runner).some(companion) || runner.grip.some(companion) ? 2 : 1;
  },
};

//Odore (26071)
// Interface → 2[c]: Break any number of sentry subroutines.
// Interface → 0[c]: Break 1 sentry subroutine. Use this ability only if you have 3 or more installed virtual resources.
// 3[c]: +3 strength.
cardSet[26071] = {
  title: "Odore",
  imageFile: "26071.png",
  elo: 1368,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 4,
  memoryCost: 1,
  strength: 0,
  strengthBoost: 0,
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
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  VirtualResourceCount: function () {
    return InstalledCards(runner).filter(function (card) {
      return card.cardType == "resource" && CheckSubType(card, "Virtual");
    }).length;
  },
  CanBreakSentry: function () {
    if (!CheckEncounter()) return false;
    if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return false;
    return CheckStrength(this);
  },
  // "Any number": the first subroutine is chosen with the ability, then each
  // further one is optional. "Continue" carries alt "continue" so the AI
  // run-path executor stops after its planned subroutines.
  BreakMore: function () {
    var choices = ChoicesEncounteredSubroutines();
    if (choices.length < 1) return;
    for (var i = 0; i < choices.length; i++)
      choices[i].label = "(Odore) Break another subroutine. -> " + choices[i].label;
    choices.push({ label: "Continue", button: "Continue", alt: "continue" });
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (!params.subroutine) return;
        Break(params.subroutine);
        this.BreakMore();
      },
      "Odore",
      "Break any number of sentry subroutines",
      this,
    );
  },
  // The free break is listed first so that the AI's card-level trigger uses it
  // whenever it is legal; the printed order is 2[c] break, 0[c] break, pump.
  abilities: [
    {
      text: "Break 1 sentry subroutine (3 or more installed virtual resources).",
      Enumerate: function () {
        if (this.VirtualResourceCount() < 3) return [];
        if (!this.CanBreakSentry()) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        Break(params.subroutine);
      },
    },
    {
      text: "Break any number of sentry subroutines.",
      Enumerate: function () {
        if (!this.CanBreakSentry()) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
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
            this.BreakMore();
          },
          this,
        );
      },
    },
    {
      text: "+3 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return []; //interface usability, as Corroder
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
        if (!CheckCredits(runner, 3, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(
          runner,
          3,
          "using",
          this,
          function () {
            BoostStrength(this, 3);
          },
          this,
        );
      },
    },
  ],
  // 3[c] for +3 strength; 2[c] breaks any number of sentry subroutines. With
  // 3+ installed virtual resources the 0[c] single break can be repeated, so
  // every sentry subroutine is free.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var breakCost = this.VirtualResourceCount() >= 3 ? 0 : 2;
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Sentry"], 3, 3, breakCost, iceAI.sr.length, creditsLeft),
    );
  },
};

//Mystic Maemi (26072)
// When your turn begins and whenever you steal an agenda, place 1[c] on this resource.
// You can spend hosted credits to play events.
// When your turn ends, if there are 3 or more hosted credits, you must trash 1 card from your grip at random or trash this resource.
cardSet[26072] = {
  title: "Mystic Maemi",
  imageFile: "26072.png",
  elo: 1776,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "resource",
  subTypes: ["Companion", "Virtual"],
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
    return doing == "playing" && !!card && CheckCardType(card, ["event"]);
  },
  responseOnRunnerDiscardEnds: {
    Enumerate: function () {
      if (!CheckCounters(this, "credits", 3)) return [];
      return [{}];
    },
    Resolve: function () {
      // An empty grip cannot pay the first option, so Maemi must be trashed.
      var choices = [];
      if (runner.grip.length > 0)
        choices.push({ grip: true, label: "Trash 1 card from your grip at random", button: "Trash from grip" });
      choices.push({ grip: false, label: "Trash Mystic Maemi", button: "Trash Maemi" });
      if (runner.AI != null) choices = [this.AIKeepsStash() ? choices[0] : choices[choices.length - 1]];
      DecisionPhase(
        runner,
        choices,
        function (params) {
          if (params.grip) {
            var copyOfGrip = runner.grip.concat([]);
            Shuffle(copyOfGrip);
            Trash(copyOfGrip[0], true);
          } else Trash(this, true);
        },
        "Mystic Maemi",
        "Trash 1 card from your grip at random or trash Mystic Maemi",
        this,
      );
    },
    text: "Mystic Maemi: Trash a random grip card or trash Maemi (3+ hosted credits)",
  },
  // Keep the stash (3+ credits for events) when losing a random card is cheap:
  // at least two cards in grip, or a lone card not worth keeping.
  AIKeepsStash: function () {
    if (runner.grip.length < 1) return false;
    if (runner.grip.length >= 2) return true;
    return runner.AI._cardsWorthKeeping(runner.grip).length < 1;
  },
  AIEconomyInstall: function () {
    return runner.grip.some(function (card) { return CheckCardType(card, ["event"]); }) ? 2 : 1;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Bravado (26074)
// Run a server protected by ice. When that run ends, gain 6[c] plus 1[c] for each piece of ice you passed during that run.
cardSet[26074] = {
  title: "Bravado",
  imageFile: "26074.png",
  elo: 1880,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  runningWithThis: false,
  icePassed: [],
  Enumerate: function () {
    return ChoicesExistingServers().filter(function (choice) {
      return choice.server.ice.length > 0;
    });
  },
  Resolve: function (params) {
    this.runningWithThis = true;
    this.icePassed = [];
    MakeRun(params.server);
  },
  //Each distinct piece of ice counts once, even if passed again during the run.
  responseOnPassesIce: {
    Resolve: function () {
      if (!this.runningWithThis) return;
      var ice = attackedServer ? attackedServer.ice[approachIce] : null;
      if (ice && !this.icePassed.includes(ice)) this.icePassed.push(ice);
    },
    automatic: true,
  },
  //Successful or not, the payout happens when the run ends.
  responseOnRunEnds: {
    Resolve: function () {
      if (!this.runningWithThis) return;
      var amount = 6 + this.icePassed.length;
      this.runningWithThis = false;
      this.icePassed = [];
      GainCredits(runner, amount, "", this);
      Log(GetTitle(this) + ": gained " + amount + " credits");
    },
    automatic: true,
  },
  //AI: economy on any iced server it is already willing to run; it pays out
  //even if the run fails, plus 1 credit per ice it expects to pass.
  AIBreachNotRequired: true,
  AIRunEventExtraPotential: function (server, potential) {
    if (!server || server.ice.length < 1) return 0;
    return 0.6 + 0.1 * server.ice.length;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Boomerang (26075)
// When you install this hardware, choose 1 installed piece of ice. Use this hardware only during encounters with that ice.
// [trash]: Break up to 2 subroutines. When this run ends, if it was successful, you may shuffle 1 copy of Boomerang from your heap into your stack.
cardSet[26075] = {
  title: "Boomerang",
  imageFile: "26075.png",
  elo: 1985,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: [],
  installCost: 2,
  unique: true,
  chosenCard: null,
  //delayed "when this run ends" ability created by the trash ability
  boomerangReturnPending: false,
  boomerangRunSuccessful: false,
  automaticOnUninstall: {
    Resolve: function (card) {
      if (card == this.chosenCard) this.chosenCard = null;
    },
  },
  //When you install this hardware, choose 1 installed piece of ice.
  responseOnInstall: {
    Enumerate: function (card) {
      if (card != this) return [];
      var choices = ChoicesInstalledCards(corp, function (corpCard) {
        return CheckCardType(corpCard, ["ice"]);
      });
      if (choices.length > 0 && runner.AI != null) return [choices[this._aiIceChoice(choices)]];
      return choices;
    },
    Resolve: function (params) {
      this.chosenCard = params.card;
      Log("Runner chose " + GetTitle(params.card, true) + " protecting " + ServerName(GetServer(params.card)) + " for Boomerang");
    },
    text: "Boomerang: choose 1 installed piece of ice",
  },
  abilities: [
    {
      text: "[trash]: Break up to 2 subroutines.",
      alt: "boomerang_break",
      Enumerate: function () {
        if (!CheckInstalled(this) || !CheckTrash(this)) return [];
        if (!CheckEncounter() || !this.chosenCard) return [];
        if (GetApproachEncounterIce() != this.chosenCard) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        var boomerang = this;
        Trash(this, false, function () {
          boomerang.boomerangReturnPending = true;
          boomerang.boomerangRunSuccessful = false;
          Break(params.subroutine);
          var choices = ChoicesEncounteredSubroutines();
          if (choices.length < 1) return;
          choices.push({ id: -1, label: "Done", button: "Done" });
          if (runner.AI != null) choices = [boomerang._aiSecondBreak(choices)];
          DecisionPhase(
            runner,
            choices,
            function (choice) {
              if (choice && choice.subroutine) Break(choice.subroutine);
            },
            "Boomerang",
            "Break up to 1 more subroutine",
            boomerang,
          );
        }, this);
      },
    },
  ],
  responseOnRunSuccessful: {
    Resolve: function () {
      if (this.boomerangReturnPending) this.boomerangRunSuccessful = true;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunEnds: {
    Enumerate: function () {
      if (!this.boomerangReturnPending || !this.boomerangRunSuccessful) return [];
      if (!this._heapCopy()) return [];
      var choices = [
        { use: true, label: "Shuffle 1 copy of Boomerang from your heap into your stack", button: "Shuffle" },
        { use: false, label: "Leave Boomerang in your heap", button: "Continue" },
      ];
      if (runner.AI != null) return [choices[0]];
      return choices;
    },
    Resolve: function (params) {
      this.boomerangReturnPending = false;
      this.boomerangRunSuccessful = false;
      if (!params.use) return;
      var copy = this._heapCopy();
      if (!copy) return;
      MoveCard(copy, runner.stack);
      Shuffle(runner.stack);
      Log("Boomerang shuffled from the heap into the stack");
    },
    text: "Boomerang: you may shuffle 1 copy from your heap into your stack",
    availableWhenInactive: true,
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      this.boomerangReturnPending = false;
      this.boomerangRunSuccessful = false;
    },
    availableWhenInactive: true,
  },
  _heapCopy: function () {
    if (runner.heap.includes(this)) return this;
    for (var i = 0; i < runner.heap.length; i++) {
      if (runner.heap[i].title == this.title) return runner.heap[i];
    }
    return null;
  },
  //AI: choose the most threatening rezzed ice on the server it is about to run,
  //otherwise the most threatening ice overall.
  _aiIceChoice: function (choices) {
    var target = null;
    var server = runner.AI.cachedPathServer || null;
    if (server && server.ice.length > 0) {
      var best = -1;
      for (var i = 0; i < server.ice.length; i++) {
        var score = runner.AI._iceThreatScore(server.ice[i]);
        if (score > best) {
          best = score;
          target = server.ice[i];
        }
      }
    }
    if (!target) target = runner.AI._highestThreatScoreIcePermitExcludedIce();
    for (var j = 0; j < choices.length; j++) {
      if (choices[j].card == target) return j;
    }
    return 0;
  },
  //AI: break the next subroutine its planned path assigned to Boomerang, else the first unbroken one.
  _aiSecondBreak: function (choices) {
    var path = runner.AI.cachedBestPath || [];
    var ice = GetApproachEncounterIce();
    for (var i = 0; i < path.length; i++) {
      if (path[i].iceIdx != approachIce) continue;
      for (var j = 0; j < path[i].sr_broken.length; j++) {
        if (path[i].sr_broken[j].use != this) continue;
        var sr = ice ? ice.subroutines[path[i].sr_broken[j].idx] : null;
        for (var k = 0; k < choices.length; k++) {
          if (sr && choices[k].subroutine == sr) return choices[k];
        }
      }
    }
    return choices[0];
  },
  //Run calculator: a free, one-use break of up to 2 subroutines on the chosen ice.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (!this.chosenCard || iceAI.ice != this.chosenCard) return result;
    for (var i = 0; i < point.sr_broken.length; i++) {
      if (point.sr_broken[i].use == this) return result;
    }
    return result.concat(rc.SrBreak(this, iceAI, point, 2)).concat(rc.SrBreak(this, iceAI, point, 1));
  },
  //Install before running a server with rezzed ice no installed breaker matches.
  AIInstallBeforeRun: function (server) {
    if (!server || server.ice.length < 1) return 0;
    for (var i = 0; i < server.ice.length; i++) {
      if (server.ice[i].rezzed && !runner.AI._matchingBreakerInstalled(server.ice[i])) return 1;
    }
    return 0;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Mu Safecracker (26076)
// Spend credits only from stealth cards to use this hardware.
// Whenever you make a successful run on HQ, you may pay 1[c] to access 1 additional card when you breach HQ.
// Whenever you make a successful run on R&D, you may pay 2[c] to access 1 additional card when you breach R&D.
cardSet[26076] = {
  title: "Mu Safecracker",
  imageFile: "26076.png",
  elo: 1231,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "hardware",
  subTypes: [],
  installCost: 2,
  unique: true,
  additionalAccessServer: null,
  //Stealth cards whose hosted credits may pay for this hardware. A stealth
  //card without canUseCredits (Cloak) has its own, narrower restriction.
  _stealthCreditCards: function () {
    var mu = this;
    return InstalledCards(runner).filter(function (card) {
      return CheckSubType(card, "Stealth") && (card.credits || 0) > 0 &&
        typeof card.canUseCredits === "function" && card.canUseCredits("using", mu);
    });
  },
  _stealthCredits: function () {
    return this._stealthCreditCards().reduce(function (sum, card) {
      return sum + card.credits;
    }, 0);
  },
  _cost: function (server) {
    if (server == corp.HQ) return 1;
    if (server == corp.RnD) return 2;
    return 0;
  },
  //Pay from stealth cards only, one source at a time.
  _payStealth: function (amount, afterPay) {
    var mu = this;
    if (amount < 1) {
      afterPay.call(mu);
      return;
    }
    var sources = this._stealthCreditCards();
    if (sources.length < 1) return;
    var paySource = function (choice) {
      var source = choice.card;
      var paid = Math.min(amount, source.credits);
      SpendHostedCredits(runner, source, paid, function () {
        mu._payStealth(amount - paid, afterPay);
      }, mu);
    };
    var choices = ChoicesArrayCards(sources);
    if (choices.length == 1 || runner.AI != null) paySource(choices[0]);
    else
      DecisionPhase(runner, choices, paySource, "Mu Safecracker",
        "Choose a stealth card to spend credits from", mu);
  },
  responseOnRunSuccessful: {
    Enumerate: function () {
      var cost = this._cost(attackedServer);
      if (cost < 1 || this._stealthCredits() < cost) return [];
      var choices = [
        { use: true, label: "Pay " + cost + " stealth credit" + (cost > 1 ? "s" : "") + " to access 1 additional card", button: "Pay" },
        { use: false, label: "Do not pay", button: "Continue" },
      ];
      if (runner.AI != null) return [choices[0]];
      return choices;
    },
    Resolve: function (params) {
      if (!params.use) return;
      var server = attackedServer;
      this._payStealth(this._cost(server), function () {
        this.additionalAccessServer = server;
        Log("Mu Safecracker: access 1 additional card when breaching " + ServerName(server));
      });
    },
    text: "Mu Safecracker: pay stealth credits to access 1 additional card?",
  },
  modifyBreachAccess: {
    Resolve: function () {
      if (this.additionalAccessServer && this.additionalAccessServer == attackedServer) return 1;
      return 0;
    },
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.additionalAccessServer = null;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //Public stealth credits available on the next breach; recurring credits refill
  //when the Runner's turn begins, so outside it report the refilled amount.
  _aiStealthCreditsForNextRun: function () {
    var mu = this;
    var refill = playerTurn != runner;
    return InstalledCards(runner).reduce(function (sum, card) {
      if (!CheckSubType(card, "Stealth") || typeof card.canUseCredits !== "function") return sum;
      if (!card.canUseCredits("using", mu)) return sum;
      var credits = card.credits || 0;
      if (refill && typeof card.recurringCredits === "number") credits = Math.max(credits, card.recurringCredits);
      return sum + credits;
    }, 0);
  },
  AIAdditionalAccess: function (server) {
    var cost = this._cost(server);
    if (cost < 1 || this._stealthCredits() < cost) return 0;
    return 1;
  },
  AICentralPressure: function (server) {
    var cost = this._cost(server);
    if (cost < 1 || this._aiStealthCreditsForNextRun() < cost) return {};
    return { additionalAccess: 1 };
  },
  AIInstallBeforeRun: function (server) {
    var cost = this._cost(server);
    if (cost < 1 || this._stealthCredits() < cost) return 0;
    return 1;
  },
  AIWorthKeeping: function () {
    return InstalledCards(runner).some(function (card) {
      return CheckSubType(card, "Stealth");
    });
  },
};

//Prognostic Q-Loop (26077)
// The first time each turn a run begins, you may look at the top 2 cards of your stack.
// Once per turn → 1[c]: Reveal the top card of your stack. If that card is a program or piece of hardware, you may install it.
cardSet[26077] = {
  title: "Prognostic Q-Loop",
  imageFile: "26077.png",
  elo: 1616,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  unique: true,
  usedThisTurn: false,
  //"First time each turn" counts runs begun before this was installed too.
  runBeganThisTurn: false,
  lookPending: false,
  lookedAt: [],
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.runBeganThisTurn = false;
      this.usedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.runBeganThisTurn = false;
      this.usedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnRunBegins: {
    Resolve: function () {
      this.lookPending = !this.runBeganThisTurn && CheckActive(this) && CheckHasAbilities(this);
      this.runBeganThisTurn = true;
    },
    availableWhenInactive: true,
  },
  responseOnRunBegins: {
    Enumerate: function () {
      if (!this.lookPending || runner.stack.length < 1) return [];
      var choices = [
        { use: true, label: "Look at the top 2 cards of your stack", button: "Look" },
        { use: false, label: "Do not look", button: "Continue" },
      ];
      //looking is free information
      if (runner.AI != null) return [choices[0]];
      return choices;
    },
    Resolve: function (params) {
      this.lookPending = false;
      if (!params.use) return;
      //the top of the stack is the end of the array
      var top = runner.stack.slice(-2).reverse();
      for (var i = 0; i < top.length; i++) top[i].knownToRunner = true;
      this.lookedAt = top;
      Log("Runner looked at the top " + top.length + " card" + (top.length > 1 ? "s" : "") + " of the stack");
      if (runner.AI != null) return;
      var label = "Top: " + GetTitle(top[0]) + (top.length > 1 ? "; next: " + GetTitle(top[1]) : "");
      DecisionPhase(runner, [{ id: 0, label: label, button: "Continue" }], function () {},
        "Prognostic Q-Loop", label, this);
    },
    text: "Prognostic Q-Loop: you may look at the top 2 cards of your stack",
  },
  abilities: [
    {
      text: "1[c]: Reveal the top card of your stack. If it is a program or hardware, you may install it.",
      alt: "qloop_reveal",
      Enumerate: function () {
        if (!CheckInstalled(this) || this.usedThisTurn) return [];
        if (runner.stack.length < 1) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        var qloop = this;
        this.usedThisTurn = true;
        SpendCredits(runner, 1, "using", this, function () {
          qloop._revealTop();
        }, this);
      },
    },
  ],
  _revealTop: function () {
    var qloop = this;
    var top = runner.stack[runner.stack.length - 1];
    if (!top) return;
    Reveal(top, function () {
      top.knownToRunner = true;
      if (!CheckCardType(top, ["program", "hardware"])) return;
      var choices = ChoicesCardInstall(top);
      if (choices.length < 1) {
        Log(GetTitle(top) + " cannot be installed");
        return;
      }
      choices.push({ card: null, label: "Do not install", button: "Continue" });
      if (runner.AI != null) choices = [qloop._aiInstallTarget() == top ? qloop._aiInstallChoice(choices) : choices[choices.length - 1]];
      DecisionPhase(
        runner,
        choices,
        function (choice) {
          if (!choice || !choice.card || runner.stack[runner.stack.length - 1] != choice.card) return;
          Install(choice.card, choice.host || null, false, null, true);
        },
        "Prognostic Q-Loop",
        "You may install " + GetTitle(top),
        qloop,
      );
    }, this);
  },
  _aiInstallChoice: function (choices) {
    var card = choices[0].card;
    if (typeof card.AIPreferredInstallChoice == "function") {
      var index = card.AIPreferredInstallChoice(choices.slice(0, -1));
      if (index > -1 && index < choices.length - 1) return choices[index];
    }
    return choices[0];
  },
  //AI: the known top card, if it is a program or hardware worth installing now
  //and the Runner can pay this ability and its install cost.
  _aiInstallTarget: function () {
    var top = runner.stack[runner.stack.length - 1];
    if (!top || !top.knownToRunner || !this.lookedAt.includes(top)) return null;
    if (!CheckCardType(top, ["program", "hardware"])) return null;
    if (AvailableCredits(runner) < 1 + InstallCost(top)) return null;
    if (!runner.AI || !runner.AI._commonCardToInstallChecks(top, true)) return null;
    return top;
  },
  AIDrawTrigger: 2,
  AIWouldTrigger: function () {
    return this._aiInstallTarget() !== null;
  },
  AIDrawInstall: function () {
    return 1;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Swift (26078)
// +1[mu]
// The first time each turn you play a run event, gain [click].
// Limit 1 console per player.
cardSet[26078] = {
  title: "Swift",
  imageFile: "26078.png",
  elo: 1684,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console", "Vehicle"],
  installCost: 2,
  unique: true,
  memoryUnits: 1,
  //"First time each turn" counts run events played before this was installed too.
  playedRunEventThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.playedRunEventThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.playedRunEventThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnPlay: {
    Resolve: function (card) {
      if (card.player != runner || !CheckCardType(card, ["event"]) || !CheckSubType(card, "Run")) return;
      if (this.playedRunEventThisTurn) return;
      this.playedRunEventThisTurn = true;
      if (CheckActive(this) && CheckHasAbilities(this)) {
        GainClicks(runner, 1);
        Log(GetTitle(this) + ": gained [click]");
      }
    },
    availableWhenInactive: true,
  },
  AIWastefulToInstall: function () {
    return InstalledCards(runner).some(function (card) {
      return CheckSubType(card, "Console");
    });
  },
  AIEconomyInstall: function () {
    if (this.AIWastefulToInstall()) return 0;
    var runEvents = runner.grip.filter(function (card) {
      return CheckCardType(card, ["event"]) && CheckSubType(card, "Run");
    }).length;
    return runEvents > 0 ? 2 : 1;
  },
  AIWorthKeeping: function () {
    return !this.AIWastefulToInstall();
  },
};

//Afterimage (26079)
// Once per turn → When you encounter a sentry, you may pay 2[c] to bypass it. Spend credits only from stealth cards to use this ability.
// Interface → 1[c]: Break up to 2 sentry subroutines.
// 1[c]: +2 strength. Spend credits only from stealth cards to use this ability.
cardSet[26079] = {
  title: "Afterimage",
  imageFile: "26079.png",
  elo: 1639,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 4,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  bypassUsedThisTurn: false,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  // Installed stealth cards whose hosted credits can pay this program's abilities.
  _stealthCreditCards: function () {
    var afterimage = this;
    return InstalledCards(runner).filter(function (card) {
      if (!CheckSubType(card, "Stealth") || (card.credits || 0) < 1) return false;
      return typeof card.canUseCredits !== "function" || card.canUseCredits("using", afterimage);
    });
  },
  _stealthCredits: function () {
    return this._stealthCreditCards().reduce(function (total, card) {
      return total + card.credits;
    }, 0);
  },
  // Pay amount credits from stealth cards one source at a time, then call done.
  _payStealthCredits: function (amount, done) {
    var self = this;
    if (amount < 1) {
      done.call(self);
      return;
    }
    var sources = this._stealthCreditCards();
    if (sources.length < 1) return;
    var payFrom = function (source) {
      if (!source || source.credits < 1) return;
      var spend = Math.min(amount, source.credits);
      SpendHostedCredits(runner, source, spend, function () {
        self._payStealthCredits(amount - spend, done);
      }, self);
    };
    if (sources.length == 1 || runner.AI) {
      payFrom(sources[0]);
      return;
    }
    DecisionPhase(
      runner,
      ChoicesArrayCards(sources),
      function (params) {
        payFrom(params.card);
      },
      "Afterimage",
      "Select a Stealth card to spend credits from:",
      self,
    );
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.bypassUsedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.bypassUsedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //Once per turn → When you encounter a sentry, you may pay 2[c] (stealth only) to bypass it.
  responseOnEncounter: {
    Enumerate: function (card) {
      if (this.bypassUsedThisTurn) return [];
      if (!card || !CheckSubType(card, "Sentry")) return [];
      if (this._stealthCredits() < 2) return [];
      return [
        { id: 0, label: "2[c] (stealth): Bypass", button: "2[c]: Bypass", alt: "afterimage_bypass" },
        { id: 1, label: "Continue", button: "Continue", alt: "continue" },
      ];
    },
    Resolve: function (params) {
      if (params.id != 0) return;
      this.bypassUsedThisTurn = true;
      this._payStealthCredits(2, function () {
        Bypass();
      });
    },
    text: "Afterimage: pay 2[c] from stealth cards to bypass",
  },
  abilities: [
    {
      text: "1[c]: Break up to 2 sentry subroutines.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
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
            var choices = ChoicesEncounteredSubroutines();
            if (choices.length < 1) return;
            for (var i = 0; i < choices.length; i++) {
              choices[i].label = "(Afterimage) Break another subroutine. -> " + choices[i].label;
            }
            choices.push({ id: choices.length, label: "Continue", button: "Continue" });
            DecisionPhase(
              runner,
              choices,
              function (params) {
                if (typeof params.subroutine !== "undefined") Break(params.subroutine);
              },
              "Break up to 2 sentry subroutines",
              "Afterimage",
              this,
            );
          },
          this,
        );
      },
    },
    {
      text: "1[c]: +2 strength. (Stealth credits only)",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Sentry")) return [];
        if (this._stealthCreditCards().length < 1) return [];
        return [{}];
      },
      Resolve: function () {
        this._payStealthCredits(1, function () {
          BoostStrength(this, 2);
        });
      },
    },
  ],
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  // Stealth credits for a prospective run on server (run-only sources such as
  // Penumbral Toolkit answer in that context). Read-only.
  _AIStealthCredits: function (server) {
    var self = this;
    if (!server || typeof AIWithRunContext != "function") return this._stealthCredits();
    return AIWithRunContext(server, function () {
      return self._stealthCredits();
    });
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    if (!iceAI.subTypes.includes("Sentry")) return result;
    if (cardStrength >= iceStrength) {
      //pump unavailable here (Infinity); 1[c] breaks up to 2
      return result.concat(
        rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Sentry"], Infinity, 0, 1, 2, creditsLeft),
      );
    }
    //+2 strength paid only from stealth credits (shared restricted-spend accounting with Corsair)
    if (rc._poolOnly) return result;
    var spent = (point.restrictedCreditsSpent || 0) + (rc._restrictedCreditsUsed || 0);
    if (spent + 1 > this._AIStealthCredits(server)) return result;
    var boost = rc.StrModify(this, this, point, 2, false);
    boost.runner_credits_spent += 1;
    boost.restrictedCreditsSpent = (point.restrictedCreditsSpent || 0) + 1;
    boost.restrictedCreditsPaid = Math.min(boost.restrictedCreditsSpent, rc._restrictedStealthCredits || 0);
    if (creditsLeft - 1 + boost.restrictedCreditsPaid - (point.restrictedCreditsPaid || 0) < 0) return result;
    result.push(boost);
    return result;
  },
  //Stealth-paid bypass of one sentry per turn; once per path, 2 restricted credits.
  AIEncounterOptions: function (iceIdx, iceAI, point, rc) {
    if (this.bypassUsedThisTurn || !iceAI || !iceAI.subTypes.includes("Sentry")) return [];
    if (rc && rc._poolOnly) return [];
    var self = this;
    if (point && point.persistents.some(function (p) { return p.use == self && p.action == "bypass"; })) return [];
    var spent = (point ? point.restrictedCreditsSpent || 0 : 0) + (rc ? rc._restrictedCreditsUsed || 0 : 0);
    if (spent + 2 > this._AIStealthCredits(GetServer(iceAI.ice))) return [];
    return [{
      effects: [],
      persistents: [{ use: this, target: iceAI.ice, iceIdx: iceIdx, action: "bypass", alt: "afterimage_bypass", restrictedCredits: 2 }],
    }];
  },
  AIRunRestrictedCredits: function (server) {
    var self = this;
    var count = function () {
      return self._stealthCreditCards().reduce(function (total, card) {
        // Generic run sources (AIRunPoolCreditOffset) are already in the route budget.
        if (typeof card.AIRunPoolCreditOffset == "function") return total;
        return typeof card.canUseCredits == "function" && card.canUseCredits("", null) ? total : total + card.credits;
      }, 0);
    };
    return count();
  },
  //Corp security: one sentry per turn can be bypassed while 2 public stealth credits remain.
  AIBypassesOneIce: function (iceCard, server) {
    if (this.bypassUsedThisTurn || !iceCard || !CheckSubType(iceCard, "Sentry")) return false;
    return this._AIStealthCredits(server) >= 2;
  },
  AIMatchingBreakerInstalled: function (iceCard, effectiveSubTypes) {
    return (effectiveSubTypes || iceCard.subTypes || []).includes("Sentry") ? this : null;
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Killer")) return spareMU >= 2;
    }
    return true;
  },
};

//Makler (26080)
// Interface → 2[c]: Break up to 2 barrier subroutines.
// 2[c]: +2 strength.
// The first time each turn this program fully breaks a piece of ice, gain 1[c].
cardSet[26080] = {
  title: "Makler",
  imageFile: "26080.png",
  elo: 1297,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 5,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  hasFullyBrokenThisTurn: false,
  brokenThisEncounter: [],
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
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
  automaticOnEncounter: {
    Resolve: function () {
      this.brokenThisEncounter = [];
    },
  },
  _break: function (subroutine) {
    this.brokenThisEncounter = this.brokenThisEncounter.concat([subroutine]);
    Break(subroutine);
  },
  //Fully breaks only if this program broke every subroutine (CR 6.5.7b).
  _checkFullyBroken: function () {
    if (this.hasFullyBrokenThisTurn || !CheckEncounter()) return;
    var ice = attackedServer.ice[approachIce];
    var self = this;
    if (!ice || !ice.subroutines || ice.subroutines.length < 1) return;
    var all = ice.subroutines.every(function (sr) {
      return sr.broken && self.brokenThisEncounter.includes(sr);
    });
    if (!all) return;
    this.hasFullyBrokenThisTurn = true;
    Log(GetTitle(this) + " fully broke " + GetTitle(ice) + ", gaining 1[c]");
    GainCredits(runner, 1, "", this);
  },
  abilities: [
    {
      text: "2[c]: Break up to 2 barrier subroutines.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        if (!CheckStrength(this)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        SpendCredits(
          runner,
          2,
          "using",
          this,
          function () {
            this._break(params.subroutine);
            var choices = ChoicesEncounteredSubroutines();
            if (choices.length < 1) {
              this._checkFullyBroken();
              return;
            }
            for (var i = 0; i < choices.length; i++) {
              choices[i].label = "(Makler) Break another subroutine. -> " + choices[i].label;
            }
            choices.push({ id: choices.length, label: "Continue", button: "Continue" });
            DecisionPhase(
              runner,
              choices,
              function (params) {
                if (typeof params.subroutine !== "undefined") this._break(params.subroutine);
                this._checkFullyBroken();
              },
              "Break up to 2 barrier subroutines",
              "Makler",
              this,
            );
          },
          this,
        );
      },
    },
    {
      text: "2[c]: +2 strength.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier")) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
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
      this.brokenThisEncounter = [];
    },
    automatic: true,
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    //cost to str, amt to str, cost to brk, amt to brk
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Barrier"], 2, 2, 2, 2, creditsLeft),
    );
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Fracter")) return spareMU >= 2;
    }
    return true;
  },
};

//Penumbral Toolkit (26081)
// If you made a successful run on HQ this turn, this resource costs 2[c] less to install.
// When you install this resource, load 4[c] onto it. When it is empty, trash it.
// You can spend hosted credits during runs.
cardSet[26081] = {
  title: "Penumbral Toolkit",
  imageFile: "26081.png",
  elo: 1367,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "resource",
  subTypes: ["Stealth", "Virtual"],
  installCost: 2,
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
  automaticOnRunSuccessful: {
    Resolve: function (server) {
      if (server == corp.HQ) this.madeSuccessfulRunOnHQThisTurn = true;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  modifyInstallCost: {
    Resolve: function (card) {
      if (card == this && !CheckInstalled(card) && this.madeSuccessfulRunOnHQThisTurn) return -2;
      return 0;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) LoadCredits(this, 4);
    },
  },
  //You can spend hosted credits during runs.
  canUseCredits: function () {
    return attackedServer !== null;
  },
  //When it is empty, trash it (MoveCard avoids a phase change mid-payment).
  onCreditsSpent: function () {
    if (!CheckInstalled(this)) return;
    if (typeof this.credits === "undefined" || this.credits <= 0) {
      Log(GetTitle(this, true) + " trashed (empty)");
      MoveCard(this, runner.heap);
      this.faceUp = true;
    }
  },
  AIRunPoolCreditOffset: function () {
    return this.credits || 0;
  },
  //Free after an HQ success (4 run credits for 0), otherwise 2 for 4.
  AIEconomyInstall: function () {
    return this.madeSuccessfulRunOnHQThisTurn ? 3 : 1;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//The Back (26082)
// The first time each turn you use a piece of hardware during a run, place 1 power counter on this resource.
// [click], remove this resource from the game: For each hosted power counter, choose up to 2 cards in your heap with [trash] abilities. Shuffle the chosen cards into your stack.
cardSet[26082] = {
  title: "The Back",
  imageFile: "26082.png",
  elo: 1380,
  player: runner,
  faction: "Criminal",
  influence: 4,
  cardType: "resource",
  subTypes: ["Job", "Location"],
  installCost: 1,
  unique: true,
  usedHardwareDuringRunThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedHardwareDuringRunThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedHardwareDuringRunThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //"Use" = resolving an ability of a Runner hardware card (via TriggerAbility).
  //Tracked while inactive so a use before install still counts as the first.
  automaticOnAbilityUsed: {
    Resolve: function (card) {
      if (this.usedHardwareDuringRunThisTurn || !card || card.player != runner) return;
      if (!CheckCardType(card, ["hardware"]) || !CheckRunning()) return;
      this.usedHardwareDuringRunThisTurn = true;
      if (CheckInstalled(this)) AddCounters(this, "power", 1);
    },
    automatic: true,
    availableWhenInactive: true,
  },
  _eligibleHeapCards: function (exclude) {
    return runner.heap.filter(function (card) {
      return HasTrashAbility(card) && !(exclude || []).includes(card);
    });
  },
  _AIHeapOrder: function (cards) {
    return cards.slice().sort(function (a, b) {
      return (b.elo || 0) - (a.elo || 0);
    });
  },
  abilities: [
    {
      text: "[click], remove this resource from the game: Shuffle up to 2 heap cards with [trash] abilities into your stack per hosted power counter.",
      Enumerate: function () {
        if (!CheckActionClicks(runner, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        //last known information: counters hosted when the cost was paid
        var limit = 2 * Counters(this, "power");
        RemoveFromGame(this);
        var self = this;
        var chosen = [];
        var finish = function () {
          if (chosen.length > 0) ShuffleInto(chosen, runner.stack);
        };
        var choose = function () {
          var eligible = self._eligibleHeapCards(chosen);
          if (chosen.length >= limit || eligible.length < 1) {
            finish();
            return;
          }
          if (runner.AI) eligible = self._AIHeapOrder(eligible).slice(0, 1);
          var choices = ChoicesArrayCards(eligible);
          if (!runner.AI) choices.push({ card: null, label: "Done", button: "Done" });
          DecisionPhase(
            runner,
            choices,
            function (params) {
              if (!params.card) {
                finish();
                return;
              }
              chosen.push(params.card);
              choose();
            },
            "The Back",
            "Choose a heap card with a [trash] ability (" + (limit - chosen.length) + " left)",
            self,
          );
        };
        choose();
      },
    },
  ],
  //Trigger once the counters can recover every eligible heap card, or at 3+.
  AIEconomyTrigger: 1,
  AIWouldTrigger: function () {
    var counters = Counters(this, "power");
    if (counters < 1) return false;
    var eligible = this._eligibleHeapCards().length;
    if (eligible < 1) return false;
    return eligible <= 2 * counters || counters >= 3;
  },
  AIWorthKeeping: function (installedRunnerCards) {
    return (installedRunnerCards || []).some(function (card) {
      return CheckCardType(card, ["hardware"]) && (card.abilities || []).length > 0;
    });
  },
};

//Harmony AR Therapy (26083)
// Choose up to 5 cards with different names in your heap. Shuffle those cards into your stack.
// Remove this event from the game.
cardSet[26083] = {
  title: "Harmony AR Therapy",
  imageFile: "26083.png",
  elo: 1537,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "event",
  subTypes: [],
  playCost: 2,
  //heap cards that can still be chosen: not chosen yet and not sharing a chosen name
  HeapChoices: function (chosen) {
    var names = chosen.map(function (card) {
      return card.title;
    });
    return ChoicesArrayCards(runner.heap, function (card) {
      return !chosen.includes(card) && !names.includes(card.title);
    });
  },
  //Playable with an empty heap or stack: it still shuffles and removes itself.
  Resolve: function () {
    if (runner.AI != null) {
      this.ShuffleIntoStack(this.AIHeapCards());
      return;
    }
    this.ChooseHeapCards([]);
  },
  ChooseHeapCards: function (chosen) {
    var choices = this.HeapChoices(chosen);
    if (chosen.length >= 5 || choices.length < 1) {
      this.ShuffleIntoStack(chosen);
      return;
    }
    for (var i = 0; i < choices.length; i++)
      choices[i].label = "(Harmony AR Therapy) Shuffle into stack -> " + choices[i].label;
    choices.push({
      card: null,
      label: "Shuffle " + chosen.length + " chosen card(s) into the stack",
      button: "Done",
    });
    DecisionPhase(
      runner,
      choices,
      function (params) {
        if (params.card) this.ChooseHeapCards(chosen.concat([params.card]));
        else this.ShuffleIntoStack(chosen);
      },
      "Harmony AR Therapy",
      "Choose up to 5 cards with different names in your heap",
      this,
    );
  },
  ShuffleIntoStack: function (chosen) {
    for (var i = 0; i < chosen.length; i++) MoveCard(chosen[i], runner.stack);
    Shuffle(runner.stack);
    Log(
      "Harmony AR Therapy shuffled " +
        (chosen.length > 0 ? chosen.map(function (card) { return GetTitle(card, true); }).join(", ") : "no cards") +
        " into the stack",
    );
    RemoveFromGame(this);
  },
  //AI: up to 5 differently named heap cards, a needed icebreaker first, then by ELO
  AIHeapCards: function () {
    var needed = runner.AI._icebreakerInPileNotInHandOrArray(runner.heap, InstalledCards(runner));
    var ranked = runner.heap.concat([]).sort(function (a, b) {
      if (a == needed) return -1;
      if (b == needed) return 1;
      return (b.elo || 0) - (a.elo || 0);
    });
    var chosen = [];
    for (var i = 0; i < ranked.length && chosen.length < 5; i++) {
      if (!chosen.some(function (card) { return card.title == ranked[i].title; })) chosen.push(ranked[i]);
    }
    return chosen;
  },
  //AI: recover a needed icebreaker, or refill a short stack from a stocked heap
  AIWouldPlay: function () {
    if (runner.AI._icebreakerInPileNotInHandOrArray(runner.heap, InstalledCards(runner))) return true;
    return runner.stack.length < 5 && runner.heap.length >= 3;
  },
  AIWorthKeeping: function () {
    return this.AIWouldPlay();
  },
};

//Aniccam (26084)
// +1[mu]
// The first time each turn an event is trashed (from any location), draw 1 card.
// Limit 1 console per player.
cardSet[26084] = {
  title: "Aniccam",
  imageFile: "26084.png",
  elo: 1829,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 3,
  unique: true,
  memoryUnits: 1,
  //The engine numbers event trashes each turn (runnerEventOrdinal), including
  //trashes before this console was installed and played events trashed as they
  //finish resolving; only the first one draws. Discarding is not trashing.
  responseOnTrash: {
    Enumerate: function (cards, trashingPlayer, directlyTrashed, trashEvent) {
      if (!trashEvent || trashEvent.runnerEventOrdinal !== 1) return [];
      return [{}];
    },
    Resolve: function () {
      Draw(runner, 1);
    },
    text: "Aniccam: Draw 1 card",
  },
  responseOnPlayedEventTrashed: {
    Enumerate: function (events, trashEvent) {
      if (!trashEvent || trashEvent.runnerEventOrdinal !== 1) return [];
      return [{}];
    },
    Resolve: function () {
      Draw(runner, 1);
    },
    text: "Aniccam: Draw 1 card",
  },
};

//Simulchip (26085)
// As an additional cost to use this hardware, trash 1 installed program. Ignore this cost if an installed program has already been trashed this turn.
// [trash]: Install 1 program from your heap, paying 3[c] less.
cardSet[26085] = {
  title: "Simulchip",
  imageFile: "26085.png",
  elo: 1953,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  //true while listing heap installs; the chosen program keeps the discount while it installs
  _discountActive: false,
  _discountCard: null,
  //the chip is in the heap by the time its install resolves
  modifyInstallCost: {
    Resolve: function (card) {
      if (!card || !CheckCardType(card, ["program"])) return 0;
      if (this._discountActive && runner.heap.includes(card)) return -3;
      if (card == this._discountCard) return -3;
      return 0;
    },
    availableWhenInactive: true,
  },
  //Installed programs trashed earlier this turn, by either player, waive the additional cost.
  CostWaived: function () {
    return TurnEventCount("runnerInstalledProgramTrashed") > 0;
  },
  CostPrograms: function () {
    return InstalledCards(runner).filter(function (card) {
      return CheckCardType(card, ["program"]) && CheckTrash(card);
    });
  },
  HeapInstallChoices: function () {
    var previous = this._discountActive;
    this._discountActive = true;
    try {
      return ChoicesArrayInstall(runner.heap, false, function (card) {
        return CheckCardType(card, ["program"]);
      });
    } finally {
      this._discountActive = previous;
    }
  },
  //Usable with no program in the heap (the no-change rule no longer applies).
  //The trashed cost program reaches the heap first and may be the one installed.
  abilities: [
    {
      text: "[trash]: Install 1 program from your heap, paying 3[c] less.",
      alt: "simulchip_install",
      Enumerate: function () {
        if (!CheckInstalled(this) || !CheckTrash(this)) return [];
        if (!this.CostWaived() && this.CostPrograms().length < 1) return [];
        return [{}];
      },
      Resolve: function () {
        var chip = this;
        var payCosts = function (program) {
          Trash(program ? [chip, program] : [chip], false, function () {
            chip.InstallFromHeap();
          }, chip);
        };
        if (this.CostWaived()) {
          payCosts(null);
          return;
        }
        var choices = ChoicesArrayCards(this.CostPrograms());
        if (runner.AI != null) choices = [this.AICostChoice(choices)];
        DecisionPhase(
          runner,
          choices,
          function (params) {
            payCosts(params.card);
          },
          "Simulchip",
          "Trash 1 installed program",
          this,
        );
      },
    },
  ],
  InstallFromHeap: function () {
    var choices = this.HeapInstallChoices();
    if (choices.length < 1) {
      Log("Simulchip: no program in the heap can be installed");
      return;
    }
    if (runner.AI != null) choices = [this.AIHeapInstallChoice(choices)];
    var chip = this;
    DecisionPhase(
      runner,
      choices,
      function (params) {
        var finish = function () {
          chip._discountCard = null;
        };
        chip._discountCard = params.card;
        Install(params.card, params.host || null, false, null, true, null, chip, finish, null, false, finish);
      },
      "Simulchip",
      "Install 1 program from your heap, paying 3[c] less",
      this,
      "install",
    );
  },
  //AI: give up the least valuable program, keeping icebreakers where possible
  AICostChoice: function (choices) {
    var score = function (card) {
      return (CheckSubType(card, "Icebreaker") ? 10000 : 0) + (card.elo || 0);
    };
    return choices.concat([]).sort(function (a, b) {
      return score(a.card) - score(b.card);
    })[0];
  },
  //AI: a needed icebreaker, otherwise the highest-ELO installable program
  AIHeapInstallChoice: function (choices) {
    var needed = runner.AI._icebreakerInPileNotInHandOrArray(runner.heap, InstalledCards(runner));
    for (var i = 0; i < choices.length; i++) if (choices[i].card == needed) return choices[i];
    return choices.concat([]).sort(function (a, b) {
      return (b.card.elo || 0) - (a.card.elo || 0);
    })[0];
  },
  //AI: once an installed program was trashed this turn, recover a needed icebreaker
  //it can afford outside a run. Paying the program cost is left to optimisation.
  AITriggerInPaidWindow: function () {
    if (!CheckInstalled(this) || !this.CostWaived()) return null;
    var needed = runner.AI._icebreakerInPileNotInHandOrArray(runner.heap, InstalledCards(runner));
    if (!needed) return null;
    var affordable = this.HeapInstallChoices().some(function (choice) {
      return choice.card == needed;
    });
    return affordable ? "simulchip_install" : null;
  },
};

//Cordyceps (26086)
// When you install this program, place 2 virus counters on it.
// Once per turn → When you make a successful run on a central server, you may remove 1 hosted virus counter to swap 1 piece of ice protecting that server with another installed piece of ice.
cardSet[26086] = {
  title: "Cordyceps",
  imageFile: "26086.png",
  elo: 1227,
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 3,
  memoryCost: 1,
  usedThisTurn: false,
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
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  //Ice protecting servers. Ice hosted elsewhere (Awakening Center) is not offered.
  ServerIce: function () {
    var servers = [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers);
    var ret = [];
    for (var i = 0; i < servers.length; i++) ret = ret.concat(servers[i].ice);
    return ret;
  },
  OtherIce: function (iceCard) {
    return this.ServerIce().filter(function (card) {
      return card != iceCard;
    });
  },
  CanSwapAt: function (server) {
    if (this.usedThisTurn || !CheckInstalled(this) || !CheckCounters(this, "virus", 1)) return false;
    if (server != corp.HQ && server != corp.RnD && server != corp.archives) return false;
    return server.ice.length > 0 && this.ServerIce().length > 1;
  },
  responseOnRunSuccessful: {
    Enumerate: function () {
      //the engine passes no parameters; the run is still attacking its server
      if (!this.CanSwapAt(attackedServer)) return [];
      //response windows require every listed trigger, so offer a decline
      var decline = { use: false, label: "Do not use Cordyceps", button: "Continue" };
      if (runner.AI != null) {
        var swap = this.AIChooseSwap(attackedServer);
        if (!swap) return [decline];
        return [{ use: true, swap: swap, label: "Cordyceps: swap " + GetTitle(swap[0], true) + " with " + GetTitle(swap[1], true) }];
      }
      return [{ use: true, label: "Cordyceps: remove 1 virus counter to swap ice" }, decline];
    },
    Resolve: function (params) {
      if (!params.use) return;
      var server = attackedServer;
      this.usedThisTurn = true;
      RemoveCounters(this, "virus", 1);
      if (params.swap) {
        this.SwapIce(params.swap[0], params.swap[1]);
        return;
      }
      DecisionPhase(
        runner,
        ChoicesArrayCards(server.ice),
        function (first) {
          DecisionPhase(
            runner,
            ChoicesArrayCards(this.OtherIce(first.card)),
            function (second) {
              this.SwapIce(first.card, second.card);
            },
            "Cordyceps",
            "Choose another installed piece of ice",
            this,
          );
        },
        "Cordyceps",
        "Choose a piece of ice protecting " + ServerName(server),
        this,
      );
    },
    text: "Cordyceps: you may swap ice",
  },
  //Swapped ice stay installed and keep hosted cards (CR 8.8.3).
  SwapIce: function (iceA, iceB) {
    var serverA = GetServer(iceA);
    var serverB = GetServer(iceB);
    var indexA = serverA.ice.indexOf(iceA);
    var indexB = serverB.ice.indexOf(iceB);
    var savedApproachIce = approachIce;
    var remoteIndexB = corp.remoteServers.indexOf(serverB);
    MoveCard(iceA, serverB.ice, indexB);
    MoveCard(iceB, serverA.ice, indexA);
    //moving ice out of a remote server must not destroy it (CR 8.5.9)
    if (remoteIndexB > -1 && corp.remoteServers.indexOf(serverB) < 0)
      corp.remoteServers.splice(remoteIndexB, 0, serverB);
    approachIce = savedApproachIce;
    Log(
      "Cordyceps swapped " + GetTitle(iceA, true) + " in " + ServerName(serverA) +
        " with " + GetTitle(iceB, true) + (serverA == serverB ? "" : " in " + ServerName(serverB)),
    );
  },
  //AI: weaken the central just run by moving its most threatening known ice
  //out for the least threatening ice protecting another server.
  AIChooseSwap: function (server) {
    var ai = runner.AI;
    var best = null;
    var bestGain = 0;
    var others = this.ServerIce().filter(function (card) {
      return GetServer(card) != server;
    });
    for (var i = 0; i < server.ice.length; i++) {
      var iceA = server.ice[i];
      if (!PlayerCanLook(runner, iceA)) continue;
      var threatA = ai._iceThreatScore(iceA, [], true);
      for (var j = 0; j < others.length; j++) {
        var gain = threatA - ai._iceThreatScore(others[j], [], true);
        if (gain > bestGain) {
          bestGain = gain;
          best = [iceA, others[j]];
        }
      }
    }
    return best;
  },
  //AI: nothing to swap without ice on a central and a second installed ice
  AIWastefulToInstall: function () {
    var centralIce = corp.HQ.ice.length + corp.RnD.ice.length + corp.archives.ice.length;
    return centralIce < 1 || this.ServerIce().length < 2;
  },
};

//Euler (26087)
// Interface → 0[c]: Break 1 code gate subroutine. Use this ability only if this program was installed this turn.
// Interface → 2[c]: Break up to 2 code gate subroutines.
// 1[c]: +1 strength.
cardSet[26087] = {
  title: "Euler",
  imageFile: "26087.png",
  elo: 1726,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 2,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  installedThisTurn: false,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
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
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
    },
    automatic: true,
  },
  CanBreakCodeGate: function () {
    if (!CheckEncounter()) return false;
    if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return false;
    return CheckStrength(this);
  },
  //The free break is listed first, so a breaker trigger uses it while it is available.
  abilities: [
    {
      text: "0[c]: Break 1 code gate subroutine (installed this turn).",
      alt: "euler_free",
      Enumerate: function () {
        if (!this.installedThisTurn) return [];
        if (!this.CanBreakCodeGate()) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        Break(params.subroutine);
      },
    },
    {
      text: "2[c]: Break up to 2 code gate subroutines.",
      alt: "euler_break2",
      Enumerate: function () {
        if (!this.CanBreakCodeGate()) return [];
        if (!CheckCredits(runner, 2, "using", this)) return [];
        //choose the first subroutine, then the second is optional
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
            for (var i = 0; i < choices.length; i++)
              choices[i].label = "(Euler) Break another subroutine. -> " + choices[i].label;
            //the AI uses both breaks when a second subroutine remains
            if (runner.AI == null || choices.length == 0)
              choices.push({ id: choices.length, label: "Continue", button: "Continue" });
            DecisionPhase(
              runner,
              choices,
              function (second) {
                if (typeof second.subroutine !== "undefined") Break(second.subroutine);
              },
              "Break up to 2 code gate subroutines",
              "Euler",
              this,
            );
          },
          this,
        );
      },
    },
    {
      text: "1[c]: +1 strength.",
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
  //Installed this turn: free single breaks; otherwise 2[c] for up to 2.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var breakCost = this.installedThisTurn ? 0 : 2;
    var breakAmount = this.installedThisTurn ? 1 : 2;
    return result.concat(
      rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ["Code Gate"], 1, 1, breakCost, breakAmount, creditsLeft),
    );
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
};

//Penrose (26089)
// Interface → 1[c]: Break 1 barrier subroutine. Use this ability only if this program was installed this turn.
// Interface → 1[c]: Break 1 code gate subroutine.
// 1[c]: +3 strength. Spend credits only from stealth cards to use this ability.
cardSet[26089] = {
  title: "Penrose",
  imageFile: "26089.png",
  elo: 1514,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder", "Fracter"],
  installCost: 3,
  memoryCost: 1,
  strength: 2,
  strengthBoost: 0,
  //true from this program's install until the end of that turn (barrier interface)
  installedThisTurn: false,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) this.installedThisTurn = true;
    },
  },
  //The turn ends after its discard step.
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      this.installedThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpDiscardEnds: {
    Resolve: function () {
      this.installedThisTurn = false;
    },
    automatic: true,
  },
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  //Installed stealth cards whose hosted credits may pay for this program.
  _stealthCreditCards: function () {
    var penrose = this;
    return InstalledCards(runner).filter(function (card) {
      if (!CheckSubType(card, "Stealth") || (card.credits || 0) < 1) return false;
      return typeof card.canUseCredits !== "function" || card.canUseCredits("using", penrose);
    });
  },
  //Ice this program can interface with right now.
  _canInterface: function (ice) {
    if (!ice) return false;
    if (CheckSubType(ice, "Code Gate")) return true;
    return this.installedThisTurn && CheckSubType(ice, "Barrier");
  },
  abilities: [
    {
      text: "Interface → 1[c]: Break 1 barrier subroutine. Use this ability only if this program was installed this turn.",
      Enumerate: function () {
        if (!this.installedThisTurn) return [];
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier")) return [];
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
      text: "Interface → 1[c]: Break 1 code gate subroutine.",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Code Gate")) return [];
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
      text: "1[c]: +3 strength. Spend credits only from stealth cards to use this ability.",
      Enumerate: function () {
        if (!CheckEncounter()) return []; //interface usability, as Corroder
        if (CheckStrength(this)) return [];
        if (!CheckUnbrokenSubroutines()) return [];
        if (!this._canInterface(attackedServer.ice[approachIce])) return [];
        if (this._stealthCreditCards().length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        var penrose = this;
        var sources = ChoicesArrayCards(this._stealthCreditCards());
        if (sources.length === 0) return;
        var pump = function (selection) {
          if (!selection || !selection.card || selection.card.credits < 1) return;
          SpendHostedCredits(
            runner,
            selection.card,
            1,
            function () {
              BoostStrength(penrose, 3);
            },
            penrose,
          );
        };
        if (sources.length === 1) pump(sources[0]);
        else
          DecisionPhase(
            runner,
            sources,
            pump,
            "Penrose",
            "Select a Stealth card to spend 1 credit from:",
            penrose,
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
  //AI: 1[c] breaks for code gates (and barriers in its install turn, including a
  //hypothetical install by the run planner); the +3 pump is a restricted stealth payment.
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    var breakTypes = [];
    if (iceAI.subTypes.includes("Code Gate")) breakTypes.push("Code Gate");
    if (iceAI.subTypes.includes("Barrier") &&
        (this.installedThisTurn || (rc.bonusBreaker && rc.bonusBreaker.card == this)))
      breakTypes.push("Barrier");
    if (breakTypes.length == 0) return result;
    if (cardStrength >= iceStrength)
      return result.concat(
        rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, breakTypes, Infinity, 0, 1, 1, creditsLeft),
      );
    var stealthCredits = this._stealthCreditCards().reduce(function (total, card) {
      return total + card.credits;
    }, 0);
    var restrictedSpent = (point.restrictedCreditsSpent || 0) + (rc._restrictedCreditsUsed || 0);
    if (!rc._poolOnly && restrictedSpent < stealthCredits) {
      var pumped = rc.StrModify(this, this, point, 3);
      pumped.runner_credits_spent += 1;
      pumped.restrictedCreditsSpent = (point.restrictedCreditsSpent || 0) + 1;
      pumped.restrictedCreditsPaid = Math.min(pumped.restrictedCreditsSpent, rc._restrictedStealthCredits || 0);
      result.push(pumped);
    }
    return result;
  },
  AIRunRestrictedCredits: function (server) {
    //stealth credits excluded from the generic route budget (e.g. Mantle) pay only the pump
    return this._stealthCreditCards().reduce(function (total, card) {
      return typeof card.canUseCredits == "function" && card.canUseCredits("", null) ? total : total + card.credits;
    }, 0);
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Decoder")) return spareMU >= 1;
    }
    return true;
  },
};

//Pauleʼs Café (26092)
// [click]: Host 1 program or piece of hardware from your grip faceup on this resource.
// 1[c]: Install 1 hosted card. The first card you install this way during each of your turns costs 1[c] less to install for each unique (♦) connection resource you have installed.
cardSet[26092] = {
  title: "Pauleʼs Café",
  imageFile: "26092.png",
  elo: 1328,
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "resource",
  subTypes: ["Location", "Seedy"],
  installCost: 1,
  unique: true,
  //hosted faceup but not installed (notInstalled), so they use no MU
  hostedCards: [],
  //the first install through this card on each Runner turn gets the connection discount
  installedThisWayThisTurn: false,
  //the card currently being installed with the discount
  _discountCard: null,
  //AI targets for the next host/install
  _aiHostTarget: null,
  _aiInstallTarget: null,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.installedThisWayThisTurn = false;
    },
    automatic: true,
  },
  //Unique (♦) connection resources currently installed.
  _uniqueConnections: function () {
    return InstalledCards(runner).filter(function (card) {
      return CheckCardType(card, ["resource"]) && CheckSubType(card, "Connection") && card.unique === true && card.faceUp !== false;
    }).length;
  },
  //Discount the next install through this card would receive now.
  _nextDiscount: function () {
    if (playerTurn != runner || this.installedThisWayThisTurn) return 0;
    return this._uniqueConnections();
  },
  modifyInstallCost: {
    Resolve: function (card) {
      if (card && card == this._discountCard) return -this._uniqueConnections();
      return 0;
    },
  },
  //Install cost of a hosted card through this card (not counting the ability's 1[c]).
  _hostedInstallCost: function (card, host) {
    var previous = this._discountCard;
    if (this._nextDiscount() > 0) this._discountCard = card;
    try {
      return InstallCost(card, host || null);
    } finally {
      this._discountCard = previous;
    }
  },
  _hostChoices: function () {
    return ChoicesArrayCards(runner.grip, function (card) {
      return CheckCardType(card, ["program", "hardware"]);
    });
  },
  //Whether 1[c] for this ability and then the install cost can both be paid:
  //shared credits (pool and unrestricted sources) cover whatever restricted ones cannot.
  _canPay: function (card, installCost) {
    var shared = AvailableCredits(runner);
    var abilityOnly = Math.max(0, AvailableCredits(runner, "using", this) - shared);
    var installOnly = Math.max(0, AvailableCredits(runner, "installing", card) - shared);
    return Math.max(0, 1 - abilityOnly) + Math.max(0, installCost - installOnly) <= shared;
  },
  _installChoices: function () {
    var ret = [];
    for (var i = 0; i < this.hostedCards.length; i++) {
      var hosted = this.hostedCards[i];
      var destinations = ChoicesCardInstall(hosted, true);
      for (var j = 0; j < destinations.length; j++) {
        if (this._canPay(hosted, this._hostedInstallCost(hosted, destinations[j].host))) ret.push(destinations[j]);
      }
    }
    return ret;
  },
  abilities: [
    {
      text: "[click]: Host 1 program or piece of hardware from your grip faceup on this resource.",
      alt: "paule_host",
      Enumerate: function () {
        if (!CheckActionClicks(runner, 1)) return [];
        var choices = this._hostChoices();
        var target = this._aiHostTarget;
        if (runner.AI != null && target) {
          var targeted = choices.filter(function (choice) {
            return choice.card == target;
          });
          if (targeted.length > 0) return targeted;
        }
        return choices;
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this._aiHostTarget = null;
        if (!params || !params.card) return;
        MoveCard(params.card, this.hostedCards);
        params.card.host = this;
        params.card.faceUp = true;
        params.card.notInstalled = true;
        Log(GetTitle(params.card, true) + " hosted on " + GetTitle(this, true));
      },
    },
    {
      text: "1[c]: Install 1 hosted card.",
      alt: "paule_install",
      Enumerate: function () {
        var choices = this._installChoices();
        var target = this._aiInstallTarget;
        if (runner.AI != null && target) {
          var targeted = choices.filter(function (choice) {
            return choice.card == target;
          });
          if (targeted.length > 0) return targeted;
        }
        return choices;
      },
      Resolve: function (params) {
        var cafe = this;
        this._aiInstallTarget = null;
        if (!params || !params.card || !this.hostedCards.includes(params.card)) return;
        var card = params.card;
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            if (playerTurn == runner && !cafe.installedThisWayThisTurn) {
              cafe.installedThisWayThisTurn = true;
              cafe._discountCard = card;
            }
            var finish = function () {
              cafe._discountCard = null;
            };
            Install(
              card,
              params.host,
              false,
              null,
              true,
              null,
              cafe,
              finish,
              function () {
                //no longer merely hosted: it leaves this resource as it is installed
                card.notInstalled = false;
              },
              false,
              finish,
            );
          },
          this,
        );
      },
    },
  ],

  //AI: host a grip card and install it at once when unique connections make that cheaper
  //than a direct install; hosted icebreakers are offered to the run planner.
  AIInstallDiscountAbility: function (card, host) {
    if (!CheckCardType(card, ["program", "hardware"]) || !runner.grip.includes(card)) return null;
    if (!CheckActionClicks(runner, 1)) return null;
    var discount = this._nextDiscount();
    if (discount < 2) return null; //the 1[c] ability cost cancels one point of discount
    host = host || null;
    var previous = this._discountCard;
    this._discountCard = card;
    var discountedCost;
    try {
      discountedCost = InstallCost(card, host);
    } finally {
      this._discountCard = previous;
    }
    var saving = InstallCost(card, host) - discountedCost - 1;
    if (saving < 1) return null;
    if (!this._canPay(card, discountedCost)) return null;
    var cafe = this;
    return {
      alt: "paule_host",
      discount: saving,
      select: function () {
        cafe._aiHostTarget = card;
      },
      followUp: {
        source: cafe,
        alt: "paule_install",
        card: card,
        select: function () {
          cafe._aiInstallTarget = card;
        },
      },
    };
  },
  AIAbilityInstallBreakers: function (installedRunnerCards) {
    var cafe = this;
    var installedTitles = installedRunnerCards.map(function (card) {
      return card.title;
    });
    return this.hostedCards
      .filter(function (card) {
        return CheckSubType(card, "Icebreaker") && !installedTitles.includes(card.title);
      })
      .map(function (card) {
        return {
          card: card,
          cost: 1 + cafe._hostedInstallCost(card, null),
          alt: "paule_install",
          select: function () {
            cafe._aiInstallTarget = card;
          },
        };
      });
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    return this._uniqueConnections() >= 1;
  },
};

//Buffer Drive (26093)
// The first time each turn 1 or more cards are trashed from your grip or stack, you may add 1 of those cards to the bottom of your stack.
// Remove this hardware from the game: Add 1 card from your heap to the top of your stack.
cardSet[26093] = {
  title: "Buffer Drive",
  imageFile: "26093.png",
  elo: 1588,
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "hardware",
  subTypes: [],
  installCost: 3,
  unique: true,
  //The first time each turn 1 or more cards are trashed from your grip or stack, you may add 1 of those cards to the bottom of your stack.
  //Trash() records that event once per turn (including before this was installed); discarding is not trashing (CR 1.19.3).
  responseOnTrash: {
    Enumerate: function (cards, trashingPlayer, directlyTrashed, trashEvent) {
      if (!trashEvent || trashEvent.runnerGripOrStackOrdinal !== 1) return [];
      var candidates = trashEvent.runnerGripOrStackCards.filter(function (card) {
        return card.cardLocation == runner.heap;
      });
      if (candidates.length < 1) return [];
      var choices = candidates.map(function (card) {
        return { card: card, label: "Add " + GetTitle(card, true) + " to the bottom of your stack" };
      });
      //**AI code: bottom the most useful card (there is no downside)
      if (runner.AI != null) {
        var preferred = this.AIBufferDriveChoice(candidates);
        return choices.filter(function (choice) {
          return choice.card == preferred;
        });
      }
      choices.push({ card: null, label: "Do not add a card", button: "Pass" });
      return choices;
    },
    Resolve: function (params) {
      if (!params || !params.card || params.card.cardLocation != runner.heap) return;
      MoveCard(params.card, runner.stack, 0);
      Log(GetTitle(params.card, true) + " added to the bottom of the stack");
    },
    text: "Buffer Drive: add a trashed card to the bottom of your stack?",
  },
  abilities: [
    {
      text: "Remove this hardware from the game: Add 1 card from your heap to the top of your stack.",
      Enumerate: function () {
        if (!CheckInstalled(this)) return [];
        var choices = runner.heap.map(function (card) {
          return { card: card, label: "Add " + GetTitle(card, true) + " to the top of your stack" };
        });
        //**AI code: only the needed card (AIWouldTrigger gates use)
        if (runner.AI != null) {
          var preferred = this.AIBufferDriveHeapChoice();
          return choices.filter(function (choice) {
            return choice.card == preferred;
          });
        }
        return choices;
      },
      Resolve: function (params) {
        RemoveFromGame(this);
        if (!params || !params.card || params.card.cardLocation != runner.heap) return;
        MoveCard(params.card, runner.stack);
        Log(GetTitle(params.card, true) + " added to the top of the stack");
      },
    },
  ],
  //AI: prefer a needed icebreaker, then a card worth keeping, else the first.
  AIBufferDriveChoice: function (cards) {
    var installed = InstalledCards(runner);
    var breaker = runner.AI._icebreakerInPileNotInHandOrArray(cards, installed);
    if (breaker) return breaker;
    var keep = runner.AI._cardsWorthKeeping(cards);
    if (keep.length > 0) return keep[0];
    return cards[0];
  },
  //AI: recover only a needed icebreaker that is in the heap (null otherwise).
  AIBufferDriveHeapChoice: function () {
    return runner.AI._icebreakerInPileNotInHandOrArray(runner.heap, InstalledCards(runner));
  },
  //Consumed by the Runner AI's draw-trigger loop: put the breaker on top before drawing.
  AIDrawTrigger: 1,
  AIWouldTrigger: function () {
    return this.AIBufferDriveHeapChoice() != null;
  },
};

//Megaprix Qualifier (26096)
// When you score this agenda, if there is another copy of Megaprix Qualifier in either playerʼs score area, place 1 agenda counter on this agenda.
// While this agenda has a hosted agenda counter, it is worth 1 more agenda point.
cardSet[26096] = {
  title: "Megaprix Qualifier",
  imageFile: "26096.png",
  elo: 1672,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 3,
  agendaPoints: 1,
  responseOnScored: {
    Resolve: function () {
      if (intended.score != this) return;
      var self = this;
      var otherCopy = corp.scoreArea.concat(runner.scoreArea).some(function (card) {
        return card != self && card.title == self.title;
      });
      if (otherCopy) AddCounters(this, "agenda", 1);
    },
    automatic: true,
  },
  //The bonus applies to whoever holds it, wherever its counter came from.
  agendaPointsForPlayer: function () {
    return this.agendaPoints + (Counters(this, "agenda") > 0 ? 1 : 0);
  },
};

//Project Vacheron (26097)
// [interrupt] → When this agenda would be added to the Runnerʼs score area from anywhere except Archives, instead it is added to their score area with 4 hosted agenda counters.
// While this agenda is in the Runnerʼs score area with 1 or more hosted agenda counters, it is worth 0 agenda points and gains “When the Runnerʼs turn begins, remove 1 hosted agenda counter.“
cardSet[26097] = {
  title: "Project Vacheron",
  imageFile: "26097.png",
  elo: 2081,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 5,
  agendaPoints: 3,
  //Called by MoveCardTriggers as the card enters a score area, before any win check.
  interruptOnAddedToScoreArea: function (scoreArea, locationfrom) {
    if (scoreArea != runner.scoreArea || locationfrom == corp.archives.cards) return;
    AddCounters(this, "agenda", 4);
  },
  agendaPointsForPlayer: function () {
    if (runner.scoreArea.includes(this) && Counters(this, "agenda") > 0) return 0;
    return this.agendaPoints;
  },
  //Score-area cards are inactive, so the gained ability is enabled explicitly.
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      if (!runner.scoreArea.includes(this) || !CheckCounters(this, "agenda", 1)) return [];
      return [{}];
    },
    Resolve: function () {
      if (!runner.scoreArea.includes(this) || !CheckCounters(this, "agenda", 1)) return;
      RemoveCounters(this, "agenda", 1);
    },
    text: "Project Vacheron: remove 1 hosted agenda counter",
    automatic: true,
    availableWhenInactive: true,
  },
};

//Bass CH1R180G4 (26098)
// [click], [trash]: Gain [click][click].
cardSet[26098] = {
  title: "Bass CH1R180G4",
  imageFile: "26098.png",
  elo: 1598,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "asset",
  subTypes: ["Bioroid"],
  rezCost: 3,
  trashCost: 4,
  unique: true,
  abilities: [
    {
      text: "[click], [trash]: Gain [click][click].",
      Enumerate: function () {
        if (!this.rezzed || !CheckInstalled(this)) return [];
        if (!CheckActionClicks(corp, 1)) return [];
        //**AI code: spend it to finish an agenda this turn, or as the last click (+1 click either way)
        if (corp.AI && !this._aiScoreBurstAgenda() && corp.clickTracker != 1) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        //the trash is a cost, so it cannot be prevented
        Trash(this, false, function () {
          GainClicks(corp, 2);
        }, this);
      },
    },
  ],
  //An installed agenda that exactly one extra click (with its advancement credits) would finish this turn.
  _aiScoreBurstAgenda: function () {
    if (playerTurn != corp || !currentPhase.identifier || currentPhase.identifier.indexOf("Corp 2") != 0) return null;
    var clicks = corp.clickTracker;
    if (clicks < 1) return null;
    var spare = Credits(corp) - (this.rezzed ? 0 : RezCost(this));
    var agendas = InstalledCards(corp).filter(function (card) {
      if (!CheckCardType(card, ["agenda"]) || !CheckAdvance(card)) return false;
      var remaining = AdvancementRequirement(card) - Counters(card, "advancement");
      return remaining == clicks + 1 && remaining <= spare;
    });
    return agendas.length ? agendas[0] : null;
  },
  AITriggerWhenCan: true,
  AIRezWhenCan: function () {
    if (this._aiScoreBurstAgenda()) return true;
    //otherwise only to use as the last click, with credits to spare
    return playerTurn == corp && !!currentPhase.identifier && currentPhase.identifier.indexOf("Corp 2") == 0 &&
      corp.clickTracker == 1 && Credits(corp) >= RezCost(this) + 5;
  },
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    var installed = InstalledCards(corp);
    for (var i = 0; i < installed.length; i++) {
      if (installed[i] != this && GetTitle(installed[i]) == GetTitle(this)) return -1;
    }
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
};

//Cerebral Overwriter (26099)
// You can advance this asset.
// When the Runner accesses this asset while it is installed, you may pay 3[c] to do X core damage. X is equal to the number of hosted advancement counters.
cardSet[26099] = {
  title: "Cerebral Overwriter",
  imageFile: "26099.png",
  elo: 1549,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "asset",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 0,
  canBeAdvanced: true,
  advancement: 0,
  responseOnAccess: {
    Enumerate: function () {
      if (accessingCard != this || !CheckInstalled(this)) return [];
      //paying for 0 damage has no effect
      if (Counters(this, "advancement") < 1 || !CheckCredits(corp, 3, "using", this)) return [];
      return [{}];
    },
    Resolve: function () {
      var damage = Counters(this, "advancement");
      var choices = [
        { id: 0, label: "Pay 3[c]: do " + damage + " core damage", button: "Pay 3[c]: " + damage + " core damage" },
        { id: 1, label: "Continue", button: "Continue" },
      ];
      //**AI code: always fire; the counters are only worth anything when it does
      if (corp.AI) corp.AI.preferred = { title: this.title, option: choices[0] };
      DecisionPhase(corp, choices, function (params) {
        if (params.id != 0 || !CheckCredits(corp, 3, "using", this)) return;
        SpendCredits(corp, 3, "using", this, function () {
          if (typeof RecordPublicPostureEvent === "function") RecordPublicPostureEvent("trapFired", this);
          //damage can be prevented
          Damage("core", damage, true);
        }, this);
      }, this.title, this.title, this);
    },
  },
  RezUsability: function () {
    return false;
  }, //never rez (for usability rather than legality)
  AIAdvancementLimit: function () {
    return 3;
  },
  AIPunishesAccess: function (server) {
    if (!server || !server.root || !server.root.includes(this)) return 0;
    if (Credits(corp) < 3) return 0;
    return Counters(this, "advancement");
  },
};

//Vaporframe Fabricator (26100)
// Once per turn → [click]: Install 1 card from HQ, ignoring all costs.
// When the Runner trashes this asset, you may install 1 card from HQ, ignoring all costs. You cannot install that card in the root of this server.
cardSet[26100] = {
  title: "Vaporframe Fabricator",
  imageFile: "26100.png",
  elo: 1260,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "asset",
  subTypes: ["Industrial"],
  rezCost: 2,
  trashCost: 3,
  usedThisTurn: false,
  _wasRezzedWhenTrashed: false,
  _serverWhenTrashed: null,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  //HQ install options ignoring all costs; excludedRoot bans (only) that server's root.
  _installChoices: function (excludedRoot) {
    return ChoicesHandInstall(corp, true).filter(function (option) {
      return !(excludedRoot && option.server == excludedRoot && !CheckCardType(option.card, ["ice"]));
    });
  },
  _installFree: function (choices, instruction) {
    if (corp.AI) {
      var best = corp.AI._bestInstallOption(choices, false);
      var decline = choices.find(function (option) { return !option.card; });
      corp.AI.preferred = { title: this.title, option: best >= 0 ? choices[best] : decline || choices[0] };
    }
    DecisionPhase(corp, choices, function (params) {
      if (!params || !params.card) return;
      Install(params.card, params.server, true, null, true, null, this, null, null, false);
    }, this.title, instruction, this, "install");
  },
  abilities: [
    {
      text: "[click]: Install 1 card from HQ, ignoring all costs.",
      Enumerate: function () {
        if (!this.rezzed || this.usedThisTurn) return [];
        if (!CheckActionClicks(corp, 1)) return [];
        var choices = this._installChoices(null);
        if (!choices.length) return [];
        //**AI code: only for an install the shared ranking wants, and not while clicks are needed to finish an agenda
        if (corp.AI) {
          var clicks = corp.clickTracker;
          var finishing = InstalledCards(corp).some(function (card) {
            if (!CheckCardType(card, ["agenda"])) return false;
            var remaining = AdvancementRequirement(card) - Counters(card, "advancement");
            return remaining > 0 && remaining == clicks && remaining <= Credits(corp);
          });
          if (finishing || corp.AI._bestInstallOption(choices, true) < 0) return [];
        }
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this.usedThisTurn = true;
        var choices = this._installChoices(null);
        if (!choices.length) return;
        this._installFree(choices, "Install 1 card from HQ, ignoring all costs");
      },
    },
  ],
  //An unrezzed asset's ability is inactive, so remember its state and server before it moves.
  automaticOnWouldTrash: {
    Resolve: function (cards) {
      if (!cards.includes(this)) return;
      this._wasRezzedWhenTrashed = this.rezzed && CheckInstalled(this);
      this._serverWhenTrashed = GetServer(this);
    },
    availableWhenInactive: true,
  },
  responseOnTrash: {
    Enumerate: function (cards, trashingPlayer) {
      if (!cards || !cards.includes(this)) return [];
      if (trashingPlayer != runner || !this._wasRezzedWhenTrashed) return [];
      var choices = this._installChoices(this._serverWhenTrashed);
      if (!choices.length) return [];
      //**AI code: only when the shared ranking accepts a free install
      if (corp.AI && corp.AI._bestInstallOption(choices, false) < 0) return [];
      return [{}];
    },
    Resolve: function () {
      this._wasRezzedWhenTrashed = false;
      var choices = this._installChoices(this._serverWhenTrashed);
      this._serverWhenTrashed = null;
      if (!choices.length) return;
      choices.push({ card: null, label: "Install nothing", button: "Install nothing" });
      this._installFree(choices, "You may install 1 card from HQ, ignoring all costs");
    },
    text: "Vaporframe Fabricator trashed: install 1 card from HQ?",
    availableWhenInactive: true,
  },
  AIRezWhenCan: function () {
    return Credits(corp) >= RezCost(this) + 3;
  },
  AIAvoidInstallingOverThis: true,
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.HQ.cards.length < 3) return -1;
    for (var j = 0; j < emptyProtectedRemotes.length; j++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[j])) return j;
    }
    return emptyProtectedRemotes.length;
  },
};

//Drafter (26101)
// ↳ You may add 1 card from Archives to HQ.
// ↳ You may install 1 card from Archives or HQ, ignoring all costs.
cardSet[26101] = {
  title: "Drafter",
  imageFile: "26101.png",
  elo: 1881,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry"],
  rezCost: 3,
  strength: 3,
  _installChoices: function () {
    return ChoicesArrayInstall(corp.archives.cards.concat(corp.HQ.cards), true);
  },
  subroutines: [
    {
      text: "You may add 1 card from Archives to HQ.",
      visual: { y: 67, h: 32 },
      Resolve: function () {
        var choices = ChoicesArrayCards(corp.archives.cards);
        if (!choices.length) return;
        choices.push({ card: null, label: "Continue", button: "Continue" });
        if (corp.AI) {
          var best = corp.AI._bestRecurToHQOption(choices.filter(function (c) { return c.card; }), null, true);
          corp.AI.preferred = { title: this.title, option: best || choices[choices.length - 1] };
        }
        DecisionPhase(corp, choices, function (params) {
          if (params.card) MoveCard(params.card, corp.HQ.cards);
        }, this.title, "Add 1 card from Archives to HQ?", this);
      },
    },
    {
      text: "You may install 1 card from Archives or HQ, ignoring all costs.",
      visual: { y: 102, h: 32 },
      Resolve: function () {
        var choices = this._installChoices();
        if (!choices.length) return;
        choices.push({ card: null, label: "Continue", button: "Continue" });
        if (corp.AI) {
          var best = corp.AI._bestInstallOption(choices, false);
          corp.AI.preferred = { title: this.title, option: best >= 0 ? choices[best] : choices[choices.length - 1] };
        }
        DecisionPhase(corp, choices, function (params) {
          if (params.card) Install(params.card, params.server, true, null, true, null, this, null, null, false);
        }, this.title, "Install 1 card, ignoring all costs?", this, "install");
      },
    },
  ],
  AIImplementIce: function (rc, result) {
    result.sr = [
      [corp.archives.cards.length ? ["misc_moderate"] : []],
      [this._installChoices().length ? ["misc_moderate"] : []],
    ];
    return result;
  },
};

//Týr (26102)
// Lose [click]: Break 1 subroutine on this ice. The Corp gets +1 allotted [click] for their next turn. Only the Runner can use this ability.
// ↳ Do 2 core damage.
// ↳ Trash 1 installed Runner card. Gain 3[c].
// ↳ End the run.
cardSet[26102] = {
  title: "Týr",
  imageFile: "26102.png",
  elo: 1580,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 5,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "AP", "Destroyer"],
  rezCost: 10,
  strength: 7,
  unique: true,
  runnerAbilities: [
    {
      text: "Lose [click]: Break 1 subroutine on this ice. The Corp gets +1 allotted [click] next turn.",
      runnerAbility: true,
      Enumerate: function () {
        if (!CheckEncounter() || GetApproachEncounterIce() !== this || !CheckClicks(runner, 1)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        LoseClicks(runner, 1);
        Break(params.subroutine);
        AddTempBonusClicks(corp, 1);
      },
    },
  ],
  subroutines: [
    { text: "Do 2 core damage.", visual: { y: 108, h: 16 }, Resolve: function () { Damage("core", 2, true); } },
    {
      text: "Trash 1 installed Runner card. Gain 3[c].",
      visual: { y: 127, h: 16 },
      Resolve: function () {
        var choices = ChoicesInstalledCards(runner, CheckTrash);
        if (!choices.length) { GainCredits(corp, 3, "", this); return; }
        if (corp.AI) {
          var best = choices.slice().sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); })[0];
          corp.AI.preferred = { title: this.title, option: best };
        }
        DecisionPhase(corp, choices, function (params) {
          Trash(params.card, true, function () { GainCredits(corp, 3, "", this); }, this);
        }, this.title, "Trash 1 installed Runner card", this, "trash");
      },
    },
    { text: "End the run.", visual: { y: 148, h: 16 }, Resolve: function () { EndTheRun(); } },
  ],
  AIImplementIce: function (rc, result) {
    result.sr = [[["coreDamage", "coreDamage"]],
      [[InstalledCards(runner).length ? "misc_serious" : "misc_moderate"]], [["endTheRun"]]];
    return result;
  },
  AIImplementBreaker: function (rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft) {
    if (iceAI.ice !== this || clicksLeft < 1) return result;
    var breaks = rc.SrBreak(this, iceAI, point, 1);
    for (var i = 0; i < breaks.length; i++) {
      breaks[i].runner_clicks_spent += 1;
      // A real consequence in addition to the click cost: the Corp gains a click.
      breaks[i].effects = breaks[i].effects.concat([["misc_moderate"]]);
    }
    return result.concat(breaks);
  },
  AIBreakCost: function (iceCard, count) {
    if (iceCard !== this) return null;
    return { credits: 0, clicks: count };
  },
};

//NEXT Activation Command (26103)
// Play only if there is no active lockdown. This operation is not trashed until your next turn begins.
// Each piece of ice gets +2 strength.
// The Runner cannot use non-icebreaker cards to break subroutines.
cardSet[26103] = {
  title: "NEXT Activation Command",
  imageFile: "26103.png",
  elo: 1594,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "operation",
  subTypes: ["Lockdown"],
  playCost: 0,
  trashCost: 4,
  Enumerate: function () {
    var active = ActiveLockdown();
    return !active || active === this ? [{}] : [];
  },
  Resolve: function () { Log("NEXT Activation Command is active until the next Corp turn"); },
  modifyStrength: {
    Resolve: function (card) { return CheckCardType(card, ["ice"]) ? 2 : 0; },
  },
  modifyCannot: {
    Resolve: function (id, card) {
      return id === "breakUsing" && !CheckSubType(card, "Icebreaker");
    },
  },
  AIWouldPlay: function () {
    if (ActiveLockdown()) return false;
    // A temporary defence is useful for the immediately following Runner turn.
    return InstalledCards(corp).some(function (card) {
      return card.cardType === "ice" && (card.rezzed || CheckCredits(corp, RezCost(card)));
    });
  },
  AIPlayWhenCan: 1,
};

//Scapenet (26104)
// Play only if the Runner made a successful run during their last turn.
// Trace[7]. If successful, remove 1 installed chip or virtual card from the game.
cardSet[26104] = {
  title: "Scapenet",
  imageFile: "26104.png",
  elo: 1515,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 1,
  successfulRunLastTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () { this.successfulRunLastTurn = false; },
    automatic: true, availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () { if (playerTurn === runner) this.successfulRunLastTurn = true; },
    automatic: true, availableWhenInactive: true,
  },
  _targets: function () {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckSubType(card, "Chip") || CheckSubType(card, "Virtual");
    });
  },
  Enumerate: function () { return this.successfulRunLastTurn ? [{}] : []; },
  Resolve: function () {
    Trace(7, function (successful) {
      if (!successful) return;
      var choices = this._targets();
      if (!choices.length) return;
      if (corp.AI) {
        var best = choices.slice().sort(function (a, b) { return (b.card.elo || 0) - (a.card.elo || 0); })[0];
        corp.AI.preferred = { title: this.title, option: best };
      }
      DecisionPhase(corp, choices, function (params) {
        Uninstall(params.card, removedFromGame);
      }, this.title, "Remove 1 installed chip or virtual card from the game", this);
    }, this);
  },
  AIWouldPlay: function () { return this.successfulRunLastTurn && this._targets().length > 0; },
  AIPlayWhenCan: 2,
};

//Tranquility Home Grid (26105)
// Remote server only.
// The first time each turn you install a card in the root of this server, gain 2[c] or draw 1 card.
// Limit 1 region per server.
cardSet[26105] = {
  title: "Tranquility Home Grid",
  imageFile: "26105.png",
  elo: 1902,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 1,
  trashCost: 4,
  installOnlyIn: function (server) { return !server || typeof server.cards === "undefined"; },
  responseOnInstall: {
    Enumerate: function (card) {
      var server = GetServer(this);
      if (!server || card.cardLocation !== server.root || server.rootInstallsThisTurn !== 1) return [];
      var choices = [
        { id: 0, label: "Gain 2[c]", button: "Gain 2[c]" },
        { id: 1, label: "Draw 1 card", button: "Draw 1 card" },
      ];
      if (corp.AI) {
        var draw = corp.HQ.cards.length < 3 && Credits(corp) >= 6 && corp.RnD.cards.length > 1;
        corp.AI.preferred = { title: this.responseOnInstall.text, option: choices[draw ? 1 : 0] };
      }
      return choices;
    },
    Resolve: function (params) {
      if (params.id === 0) GainCredits(corp, 2, "", this);
      else Draw(corp, 1);
    },
    text: "Tranquility Home Grid: gain 2[c] or draw 1 card",
  },
  AIWorthInstalling: function (remotes) {
    for (var i = 0; i < remotes.length; i++) {
      if (!remotes[i].root.some(function (card) { return CheckSubType(card, "Region"); })) return i;
    }
    return -1;
  },
  AIPreferredUpgradeServer: function (servers) {
    return servers.find(function (server) {
      return typeof server.cards === "undefined" && server.ice.length > 0 &&
        !server.root.some(function (card) { return CheckSubType(card, "Region"); });
    }) || null;
  },
  AIRezWhenCan: function () { return CheckCredits(corp, RezCost(this)); },
};

//Flower Sermon (26106)
// When you score this agenda, place 5 agenda counters on it.
// Once per turn → Hosted agenda counter: Reveal the top card of R&D. Draw 2 cards. Add 1 card from HQ to the top of R&D.
cardSet[26106] = {
  title: "Flower Sermon",
  imageFile: "26106.png",
  elo: 1469,
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Prāna Condenser (26107)
// [interrupt] → Whenever you would do 1 or more net damage, you may prevent 1 net damage. If you do, place 1 power counter on this asset and gain 3[c].
// [click][click], [trash]: Do 1 net damage for each hosted power counter.
cardSet[26107] = {
  title: "Prāna Condenser",
  imageFile: "26107.png",
  elo: 1579,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "asset",
  subTypes: [],
  rezCost: 1,
  trashCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Engram Flush (26108)
// When the Runner encounters this ice, choose a card type. For the remainder of the encounter, whenever you reveal the grip with a subroutine on this ice, you may trash 1 revealed card of the chosen type.
// ↳ Reveal the grip.
// ↳ Reveal the grip.
cardSet[26108] = {
  title: "Engram Flush",
  imageFile: "26108.png",
  elo: 1935,
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate", "Observer"],
  rezCost: 2,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Konjin (26109)
// When the Runner encounters this ice, play a Psi Game. (Players secretly bid 0–2[c]. Then each player reveals and spends their bid.) If the bids differ, you may choose another rezzed piece of ice. The Runner encounters that ice. (When that encounter ends, if the run has not ended, finish encountering this ice.)
cardSet[26109] = {
  title: "Konjin",
  imageFile: "26109.png",
  elo: 1502,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Mythic", "Psi"],
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

//Hyoubu Precog Manifold (26110)
// Play only if there is no active lockdown. This operation is not trashed until your next turn begins.
// When you play this operation, choose a server.
// Whenever the Runner makes a successful run on the chosen server, play a Psi Game. (Players secretly bid 0–2[c]. Then each player reveals and spends their bid.) If the bids differ, end the run.
cardSet[26110] = {
  title: "Hyoubu Precog Manifold",
  imageFile: "26110.png",
  elo: 1339,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "operation",
  subTypes: ["Lockdown", "Psi"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Kakurenbo (26111)
// As an additional cost to play this operation, spend [click][click].
// Trash any number of cards from HQ. Turn all cards in Archives facedown. You may install 1 card from Archives in the root of a remote server and place 2 advancement counters on it.
// Remove this operation from the game.
cardSet[26111] = {
  title: "Kakurenbo",
  imageFile: "26111.png",
  elo: 1466,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "operation",
  subTypes: ["Triple"],
  playCost: 2,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//La Costa Grid (26112)
// Remote server only.
// When your turn begins, place 1 advancement counter on a card in the root of this server.
// Limit 1 region per server.
cardSet[26112] = {
  title: "La Costa Grid",
  imageFile: "26112.png",
  elo: 1820,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Region", "Seedy"],
  rezCost: 3,
  trashCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//GameNET: Where Dreams are Real (26113)
// Whenever a Corp card ability causes the Runner to spend or lose at least 1[c] during a run, gain 1[c].
cardSet[26113] = {
  title: "GameNET: Where Dreams are Real",
  imageFile: "26113.png",
  elo: 1396,
  player: corp,
  faction: "NBN",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 17,
  // TODO: Add abilities or responseOn triggers
};

//Bellona (26114)
// As an additional cost to steal this agenda, the Runner must pay 5[c].
// When you score this agenda, gain 5[c].
cardSet[26114] = {
  title: "Bellona",
  imageFile: "26114.png",
  elo: 2038,
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//F2P (26115)
// 2[c]: Break 1 subroutine on this ice. Only the Runner can use this ability, and only if they are not tagged.
// ↳ Add 1 installed Runner card to the grip.
// ↳ Give the Runner 1 tag.
cardSet[26115] = {
  title: "F2P",
  imageFile: "26115.png",
  elo: 1545,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry"],
  rezCost: 4,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Gold Farmer (26116)
// Whenever the Runner breaks a printed subroutine on this ice, they lose 1[c].
// ↳ End the run unless the Runner pays 3[c].
// ↳ End the run unless the Runner pays 3[c].
cardSet[26116] = {
  title: "Gold Farmer",
  imageFile: "26116.png",
  elo: 2011,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 1,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Digital Rights Management (26117)
// Play only if the Runner did not make a successful run on HQ during their last turn.
// Search R&D for 1 agenda and reveal it. (Shuffle R&D after searching it.) Add that agenda to HQ. You may install 1 card from HQ in the root of a remote server.
// You cannot score agendas for the remainder of the turn.
cardSet[26117] = {
  title: "Digital Rights Management",
  imageFile: "26117.png",
  elo: 1500,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//SYNC Rerouting (26118)
// Play only if there is no active lockdown. This operation is not trashed until your next turn begins.
// Whenever a run begins, give the Runner 1 tag unless they pay 4[c].
cardSet[26118] = {
  title: "SYNC Rerouting",
  imageFile: "26118.png",
  elo: 1402,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: ["Lockdown"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Ganked! (26119)
// While the Runner is accessing this upgrade in R&D, they must reveal it.
// When the Runner accesses this upgrade, you may trash it to choose a rezzed piece of ice protecting this server. The Runner encounters that ice.
cardSet[26119] = {
  title: "Ganked!",
  imageFile: "26119.png",
  elo: 1624,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Earth Station: SEA Headquarters (26120)
// Limit 1 remote server.
// As an additional cost to run HQ, the Runner must pay 1[c].
// [click]: Flip this identity.
// Flip side:
// Limit 1 remote server.
// As an additional cost to run a remote server, the Runner must pay 6[c].
// When the Runner makes a successful run on HQ, flip this identity.
cardSet[26120] = {
  title: "Earth Station: SEA Headquarters",
  imageFile: "26120.png",
  elo: 1520,
  player: corp,
  faction: "Weyland Consortium",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
  // TODO: Add abilities or responseOn triggers
};

//Transport Monopoly (26121)
// When you score this agenda, place 2 agenda counters on it.
// Once per turn → Hosted agenda counter: This run cannot be declared successful. (This effect does not cause the run to become unsuccessful.) Use this ability only during a run.
cardSet[26121] = {
  title: "Transport Monopoly",
  imageFile: "26121.png",
  elo: 1355,
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Wall to Wall (26122)
// When your turn begins, if you have any other rezzed assets, resolve 1 of the following; otherwise, resolve up to 3 in any order:Draw 1 card.Gain 1[c].Place 1 advancement counter on an installed piece of ice.Add this asset to HQ.
cardSet[26122] = {
  title: "Wall to Wall",
  imageFile: "26122.png",
  elo: 1659,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Akhet (26123)
// You can advance this ice.
// While there are 3 or more hosted advancement counters, this ice gets +3 strength and the Runner cannot break more than 1 of its printed subroutines during each encounter.
// ↳ Gain 1[c]. Place 1 advancement counter on an installed card.
// ↳ End the run.
cardSet[26123] = {
  title: "Akhet",
  imageFile: "26123.png",
  elo: 1641,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 2,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Colossus (26124)
// You can advance this ice. It gets +1 strength for each hosted advancement counter.
// ↳ Give the Runner 1 tag. If there are 3 or more hosted advancement counters, instead give the Runner 2 tags.
// ↳ Trash 1 installed program. If there are 3 or more hosted advancement counters, instead trash 1 installed program and 1 installed resource.
cardSet[26124] = {
  title: "Colossus",
  imageFile: "26124.png",
  elo: 1497,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer"],
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

//Winchester (26125)
// ↳ Trace[4]. If successful, trash 1 installed program.
// ↳ Trace[3]. If successful, trash 1 installed piece of hardware.
// While this ice is protecting HQ, it gains “↳ Trace[3]. If successful, end the run.” after its other subroutines.
cardSet[26125] = {
  title: "Winchester",
  imageFile: "26125.png",
  elo: 1716,
  player: corp,
  faction: "Weyland Consortium",
  influence: 4,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer", "Tracer"],
  rezCost: 4,
  strength: 4,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Argus Crackdown (26126)
// Play only if there is no active lockdown. This operation is not trashed until your next turn begins.
// Whenever the Runner makes a successful run on a server protected by ice, do 2 meat damage.
cardSet[26126] = {
  title: "Argus Crackdown",
  imageFile: "26126.png",
  elo: 1412,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "operation",
  subTypes: ["Lockdown", "Gray Ops"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Cayambe Grid (26127)
// When your turn begins, place 1 advancement counter on a piece of ice protecting this server.
// Whenever the Runner approaches this server, end the run unless they pay 2[c] for each advanced piece of ice protecting this server.
// Limit 1 region per server.
cardSet[26127] = {
  title: "Cayambe Grid",
  imageFile: "26127.png",
  elo: 1830,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 3,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Cyberdex Sandbox (26128)
// The first time each turn you purge virus counters, gain 4[c].
// When you score this agenda, you may purge virus counters.
cardSet[26128] = {
  title: "Cyberdex Sandbox",
  imageFile: "26128.png",
  elo: 1909,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//False Lead (26129)
// Forfeit this agenda: If the Runner has 2 or more [click] remaining, they lose [click][click].
cardSet[26129] = {
  title: "False Lead",
  imageFile: "26129.png",
  elo: 1848,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 3,
  agendaPoints: 1,
  // onScore: { Resolve: function () { ... } },
};

//NAPD Cordon (26130)
// Play only if there is no active lockdown. This operation is not trashed until your next turn begins.
// As an additional cost to steal an agenda, the Runner must pay 4[c] plus 2[c] for each advancement counter on that agenda.
cardSet[26130] = {
  title: "NAPD Cordon",
  imageFile: "26130.png",
  elo: 1488,
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "operation",
  subTypes: ["Lockdown"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};
