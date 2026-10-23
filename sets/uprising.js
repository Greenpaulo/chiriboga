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
  
  //When your turn begins, take 2 credits from this resource.
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      if (CheckCounters(this, "credits", 2)) {
        TakeCredits(runner, this, 2);
        //When it is empty, trash it (use MoveCard to avoid phase change in automatic trigger)
        if (!CheckCounters(this, "credits", 1)) {
          Log(GetTitle(this, true) + " trashed (empty)");
          MoveCard(this, runner.heap);
          this.faceUp = true;
        }
      }
    },
    automatic: true,
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
  
  abilities: [
    {
      text: "2[c], [trash]: Search your stack for 1 program. Install it.",
      Enumerate: function () {
        //Check if we can pay 2 credits
        if (!CheckCredits(runner, 2, "using", this)) return [];
        //Check if this card can be trashed (not prevented somehow)
        if (!CheckTrash(this)) return [];
        //Check if there are any programs in stack that can be installed
        var choices = ChoicesArrayInstall(runner.stack, false, function (card) {
          return CheckCardType(card, ["program"]);
        });
        if (choices.length == 0) return [];
        return [{}];
      },
      Resolve: function (params) {
        var cardRef = this;
        //Pay 2 credits as cost
        SpendCredits(runner, 2, "using", this, function () {
          //Trash self as cost (unpreventable since it's a cost)
          Trash(cardRef, false, function (cardsTrashed) {
            //Get installable programs from stack
            var choices = ChoicesArrayInstall(runner.stack, false, function (card) {
              return CheckCardType(card, ["program"]);
            });
            
            //**AI code
            if (runner.AI != null) {
              //Prefer icebreakers we don't have installed
              var installedRunnerCards = InstalledCards(runner);
              var preferredCard = runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, installedRunnerCards);
              if (preferredCard) {
                for (var i = 0; i < choices.length; i++) {
                  if (choices[i].card == preferredCard) {
                    choices = [choices[i]];
                    break;
                  }
                }
              }
            }
            
            DecisionPhase(
              runner,
              choices,
              function (paramsB) {
                Shuffle(runner.stack);
                Log("Stack shuffled");
                //Install the selected program (paying normal costs, disallow cancel)
                Install(paramsB.card, paramsB.host, false, null, true, null, cardRef, null, null, false);
              },
              "Self-modifying Code",
              "Self-modifying Code",
              cardRef,
              "install"
            );
          }, cardRef);
        }, cardRef);
      },
      //AI: Determine when to use this ability
      AIWouldUse: function () {
        //Don't use outside of a run unless we really need a program
        if (!CheckRunning()) {
          //Only use outside run if we're desperate for a specific program
          return -1; //don't use outside of runs
        }
        
        //During a run, check if we need a breaker for current ice
        if (CheckEncounter()) {
          var ice = attackedServer.ice[approachIce];
          if (ice && ice.rezzed) {
            //Check if we can already break this ice
            var dominated = runner.AI._iceDominated(ice);
            if (!dominated) {
              //We can't break this ice - check if SMC can help
              var installedRunnerCards = InstalledCards(runner);
              var neededBreaker = runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, installedRunnerCards);
              if (neededBreaker) {
                //Check if the needed breaker can handle this ice
                return 5; //high priority - we need this breaker now!
              }
            }
          }
        }
        
        //During approach, might want to preemptively fetch
        if (CheckApproaching()) {
          var ice = attackedServer.ice[approachIce];
          if (ice && ice.rezzed) {
            var dominated = runner.AI._iceDominated(ice);
            if (!dominated) {
              return 4; //fetch before encounter
            }
          }
        }
        
        return -1; //don't use if not needed
      },
    },
  ],
  
  //AI evaluation functions
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Worth keeping if there are icebreakers in stack we might need
    if (spareMU >= 2) {
      var targetCard = runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, installedRunnerCards);
      if (targetCard) return true;
    }
    return false;
  },
  
  //Get list of icebreakers that AI might tutor by this
  AIIcebreakerTutor: function (installedRunnerCards) {
    return runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, installedRunnerCards);
  },
  
  //AI: Prefer to install SMC early to have tutor available
  AIPreferredInstallChoice: function (choices) {
    //Install if we have spare MU
    if (MemoryUnits() - InstalledMemoryCost() >= 2) return 0;
    return -1;
  },
  
  //AI: Can use this during runs to fetch needed breakers
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost, runClickCost) {
    //Install before run if we might need to fetch a breaker mid-run
    if (MemoryUnits() - InstalledMemoryCost() >= 2) return 1;
    return 0;
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
  
  //Track if triggered this turn
  triggeredThisTurn: false,
  
  //Reset flag at start of each turn
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.triggeredThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.triggeredThisTurn = false;
    },
    automatic: true,
  },
  
  //The first time each turn you make a successful run, draw 1 card.
  //If your identity is digital or you have at least 2 link, also gain 1 credit.
  responseOnRunSuccessful: {
    Enumerate: function () {
      if (this.triggeredThisTurn) return [];
      return [{}];
    },
    Resolve: function (params) {
      this.triggeredThisTurn = true;
      
      //Draw 1 card
      Draw(runner, 1);
      
      //Check for digital identity or 2+ link
      var isDigital = CheckSubType(runner.identityCard, "Digital");
      var hasEnoughLink = Link() >= 2;
      
      if (isDigital || hasEnoughLink) {
        GainCredits(runner, 1, "", this);
      }
    },
    text: "DreamNet: Draw 1 card",
    automatic: true,
  },
  
  //AI evaluation functions
  AIEconomyInstall: function () {
    //Good drip card draw (and potentially credits)
    //Higher priority if we have 2+ link or digital identity
    var isDigital = CheckSubType(runner.identityCard, "Digital");
    var hasEnoughLink = Link() >= 2;
    if (isDigital || hasEnoughLink) return 3; //high priority - draw + credit
    return 2; //moderate priority - just draw
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
  
  //Track icebreakers boosted this turn
  boostedCards: [],
  
  //Whenever you install a non-AI icebreaker, that icebreaker gets +2 strength for the remainder of the turn.
  automaticOnInstall: {
    Resolve: function (card) {
      //Check if installed card is a non-AI icebreaker
      if (!CheckSubType(card, "Icebreaker")) return;
      if (CheckSubType(card, "AI")) return;
      //Boost it
      this.boostedCards.push(card);
      Log(GetTitle(card, true) + " gets +2 strength for the remainder of the turn");
    },
  },
  
  //Modify strength for boosted cards
  modifyStrength: {
    Resolve: function (card) {
      if (this.boostedCards.includes(card)) return 2;
      return 0;
    },
  },
  
  //Clear boosted cards at end of turn
  responseOnRunnerTurnEnds: {
    Resolve: function () {
      this.boostedCards = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnEnds: {
    Resolve: function () {
      this.boostedCards = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },
  
  //AI evaluation
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Worth keeping if we have non-AI icebreakers or plan to install them
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Icebreaker") && 
          !CheckSubType(installedRunnerCards[i], "AI")) {
        return true;
      }
    }
    //Check grip for non-AI icebreakers
    for (var i = 0; i < runner.grip.length; i++) {
      if (CheckSubType(runner.grip[i], "Icebreaker") && 
          !CheckSubType(runner.grip[i], "AI")) {
        return true;
      }
    }
    //Link is always useful
    return true;
  },
  
  AIEconomyInstall: function () {
    //This card is most valuable when installed BEFORE icebreakers
    //so we get the +2 strength bonus when installing them
    
    //Check hand for non-AI icebreakers we plan to install
    var breakersInHand = 0;
    for (var i = 0; i < runner.grip.length; i++) {
      if (CheckSubType(runner.grip[i], "Icebreaker") && 
          !CheckSubType(runner.grip[i], "AI")) {
        breakersInHand++;
      }
    }
    
    //High priority if we have icebreakers in hand to install after this
    if (breakersInHand >= 2) return 3;
    if (breakersInHand >= 1) return 2;
    
    //Low priority for just the +1 link
    //Still useful but not urgent
    return 1;
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
  Resolve: function (params) {
    // TODO: Implement effect
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  Resolve: function (params) {
    // TODO: Implement effect
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // onScore: { Resolve: function () { ... } },
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
  // onScore: { Resolve: function () { ... } },
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  // TODO: Add abilities or responseOn triggers
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
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
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
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
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
  Resolve: function (params) {
    // TODO: Implement effect
  },
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
  Resolve: function (params) {
    // TODO: Implement effect
  },
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
  // TODO: Add abilities or responseOn triggers
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
