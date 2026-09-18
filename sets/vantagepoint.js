// CARD DEFINITIONS FOR VANTAGE POINT
// Trash or Busto ELO values retrieved 2026-09-18.
setIdentifiers.push("vp");

//Chain Reaction (36001)
// Play only if you made a successful run on HQ, R&D, and Archives this turn.
// Trash 2 installed Corp cards. The Corp trashes 1 installed Runner card.
cardSet[36001] = {
  title: "Chain Reaction",
  imageFile: "36001.png",
  elo: 1301,
  player: runner,
  faction: "Anarch",
  influence: 5,
  cardType: "event",
  subTypes: [],
  playCost: 1,
  madeSuccessfulRunOnHQThisTurn: false,
  madeSuccessfulRunOnRnDThisTurn: false,
  madeSuccessfulRunOnArchivesThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this._resetSuccessfulCentralRuns();
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this._resetSuccessfulCentralRuns();
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function (server) {
      if (server == corp.HQ) this.madeSuccessfulRunOnHQThisTurn = true;
      else if (server == corp.RnD) this.madeSuccessfulRunOnRnDThisTurn = true;
      else if (server == corp.archives)
        this.madeSuccessfulRunOnArchivesThisTurn = true;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  _resetSuccessfulCentralRuns: function () {
    this.madeSuccessfulRunOnHQThisTurn = false;
    this.madeSuccessfulRunOnRnDThisTurn = false;
    this.madeSuccessfulRunOnArchivesThisTurn = false;
  },
  Enumerate: function () {
    if (
      !this.madeSuccessfulRunOnHQThisTurn ||
      !this.madeSuccessfulRunOnRnDThisTurn ||
      !this.madeSuccessfulRunOnArchivesThisTurn
    )
      return [];
    return [{}];
  },
  Resolve: function (params) {
    var choices = ChoicesInstalledCards(corp, CheckTrash);
    var requiredCount = Math.min(2, choices.length);
    if (requiredCount < 1) {
      this._corpTrashRunnerCard();
      return;
    }

    if (runner.AI != null) {
      choices.sort(function (a, b) {
        var aScore = a.card.rezzed ? 100 + (a.card.trashCost || 0) : 0;
        var bScore = b.card.rezzed ? 100 + (b.card.trashCost || 0) : 0;
        return bScore - aScore;
      });
      this._trashCorpCards(
        choices.slice(0, requiredCount).map(function (choice) {
          return choice.card;
        }),
      );
      return;
    }

    choices.push({
      id: choices.length,
      label: "Trash selected cards",
      button: "Trash 0/" + requiredCount + " cards",
      multiSelectDynamicButtonText: function (numSelected) {
        return "Trash " + numSelected + "/" + requiredCount + " cards";
      },
      multiSelectDynamicButtonEnabler: function (numSelected) {
        return numSelected === requiredCount;
      },
    });
    for (var i = 0; i < choices.length; i++) {
      choices[i].cards = Array(requiredCount).fill(null);
    }
    DecisionPhase(
      runner,
      choices,
      function (selection) {
        this._trashCorpCards(
          selection.cards.filter(function (card) {
            return card != null;
          }),
        );
      },
      "Chain Reaction",
      "Choose " + requiredCount + " installed Corp cards to trash",
      this,
    );
  },
  _trashCorpCards: function (cards) {
    Trash(
      cards,
      true,
      function () {
        this._corpTrashRunnerCard();
      },
      this,
    );
  },
  _corpTrashRunnerCard: function () {
    var runnerCards = ChoicesInstalledCards(runner, CheckTrash);
    if (runnerCards.length > 0) {
      if (corp.AI != null) {
        var preferred = runnerCards[0];
        for (var i = 0; i < runnerCards.length; i++) {
          if (
            (runnerCards[i].card.installCost || 0) >
            (preferred.card.installCost || 0)
          ) {
            preferred = runnerCards[i];
          }
        }
        corp.AI.preferred = {
          title: "Chain Reaction",
          option: preferred,
        };
      }
      DecisionPhase(
        corp,
        runnerCards,
        function (params) {
          if (params && params.card) Trash(params.card, true);
        },
        "Chain Reaction",
        "Choose 1 installed Runner card to trash",
        this,
      );
    }
  },
  AIWouldPlay: function () {
    if (
      !this.madeSuccessfulRunOnHQThisTurn ||
      !this.madeSuccessfulRunOnRnDThisTurn ||
      !this.madeSuccessfulRunOnArchivesThisTurn
    )
      return false;
    return ChoicesInstalledCards(corp, CheckTrash).length >= 1;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Take a Dive (36002)
// Run HQ or R&D. If successful, and if a subroutine resolved during this run, give the Corp 1 bad publicity.
// Remove this event from the game.
cardSet[36002] = {
  title: "Take a Dive",
  imageFile: "36002.png",
  elo: 1442,
  player: runner,
  faction: "Anarch",
  influence: 4,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 2,
  runningWithThis: false,
  subroutineResolvedThisRun: false,
  Enumerate: function () {
    var choices = [];
    choices.push({ id: 0, server: corp.HQ, label: "Run HQ", button: "Run HQ" });
    choices.push({
      id: 1,
      server: corp.RnD,
      label: "Run R&D",
      button: "Run R&D",
    });
    return choices;
  },
  Resolve: function (params) {
    this.runningWithThis = true;
    this.subroutineResolvedThisRun = false;
    var targetServer =
      params && params.server
        ? params.server
        : params && params.id === 1
          ? corp.RnD
          : corp.HQ;
    if (targetServer) {
      MakeRun(targetServer);
    }
  },
  automaticOnSubroutineResolved: {
    Resolve: function (ice, resolvedSubroutine) {
      if (this.runningWithThis) this.subroutineResolvedThisRun = true;
    },
  },
  responseOnRunSuccessful: {
    Resolve: function (server) {
      if (this.runningWithThis) {
        if (this.subroutineResolvedThisRun) {
          Log(
            GetTitle(this) +
              ": a subroutine resolved during this run; giving Corp 1 bad publicity.",
          );
          AddBadPublicity(1);
        }
      }
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      if (this.runningWithThis) {
        this.runningWithThis = false;
        RemoveFromGame(this);
      }
    },
    automatic: true,
  },
  AIBreachNotRequired: true,
  AIRunEventExtraPotential: function (server, potential) {
    if (server == corp.HQ || server == corp.RnD) return 0.3;
    return 0;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//The Tungsten Tailor (36003)
// Each piece of ice gets −1 strength.
// The first time each turn you break a subroutine on a piece of ice with 0 or less strength, gain 1[c].
cardSet[36003] = {
  title: "The Tungsten Tailor",
  imageFile: "36003.png",
  elo: 1746,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "hardware",
  subTypes: [],
  installCost: 3,
  unique: true,
  usedThisTurn: false,
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
  modifyStrength: {
    Resolve: function (card) {
      if (card.player == corp && CheckCardType(card, ["ice"])) {
        return -1;
      }
      return 0;
    },
  },
  AIReducesIceStrength: function (iceCard) {
    return 1;
  },
  responseOnSubroutineBroken: {
    Resolve: function (subroutine) {
      if (this.usedThisTurn) return;
      if (!CheckEncounter()) return;
      var currentIce = attackedServer.ice[approachIce];
      if (currentIce && Strength(currentIce) <= 0) {
        this.usedThisTurn = true;
        Log(
          GetTitle(this) +
            " triggers: gained 1[c] for breaking subroutine on ice with strength <= 0.",
        );
        GainCredits(runner, 1, "", this);
      }
    },
    automatic: true,
  },
  AIEconomyInstall: function () {
    return 2;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Corsair (36004)
// Interface → 1[c]: Break 1 barrier subroutine.
// 1[c]: The barrier you are encountering gets −3 strength for the remainder of this encounter. Spend credits only from stealth cards to use this ability.
cardSet[36004] = {
  title: "Corsair",
  imageFile: "36004.png",
  elo: 1232,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 3,
  memoryCost: 1,
  strength: 0,
  strengthBoost: 0,
  barrierDebuff: 0,
  AIUsesStealthCredits: true,
  _stealthCreditCards: function () {
    var corsair = this;
    return InstalledCards(runner).filter(function (card) {
      if (!CheckSubType(card, "Stealth") || (card.credits || 0) < 1)
        return false;
      return (
        typeof card.canUseCredits !== "function" ||
        card.canUseCredits("using", corsair)
      );
    });
  },
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      if (
        CheckEncounter() &&
        card == attackedServer.ice[approachIce] &&
        CheckSubType(card, "Barrier") &&
        this.barrierDebuff
      ) {
        return -this.barrierDebuff;
      }
      return 0;
    },
  },
  abilities: [
    {
      text: "1[c]: Break 1 barrier subroutine.",
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
      text: "1[c]: Encountered barrier gets -3 strength. (Stealth credits only)",
      Enumerate: function () {
        if (!CheckEncounter()) return [];
        if (!CheckSubType(attackedServer.ice[approachIce], "Barrier"))
          return [];
        if (this._stealthCreditCards().length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        var stealthCards = ChoicesArrayCards(this._stealthCreditCards());
        if (stealthCards.length === 0) return;
        var self = this;
        var applyDebuff = function (selection) {
          if (!selection || !selection.card || selection.card.credits < 1)
            return;
          selection.card.credits -= 1;
          UpdateCounters();
          self.barrierDebuff = (self.barrierDebuff || 0) + 3;
          var targetIce = attackedServer.ice[approachIce];
          if (targetIce) {
            Log(
              GetTitle(self) +
                " spent 1 credit from " +
                GetTitle(selection.card) +
                ": " +
                GetTitle(targetIce) +
                " gets -3 strength for this encounter.",
            );
          }
        };
        if (stealthCards.length === 1) {
          applyDebuff(stealthCards[0]);
        } else {
          DecisionPhase(
            runner,
            stealthCards,
            applyDebuff,
            "Corsair",
            "Select a Stealth card to spend 1 credit from:",
            self,
          );
        }
      },
    },
  ],
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
      this.barrierDebuff = 0;
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
    if (!iceAI.subTypes.includes("Barrier")) return result;
    if (cardStrength >= iceStrength) {
      return result.concat(
        rc.ImplementIcebreaker(
          point,
          this,
          cardStrength,
          iceAI,
          iceStrength,
          ["Barrier"],
          Infinity,
          0,
          1,
          1,
          creditsLeft,
        ),
      );
    }

    var stealthCredits = this._stealthCreditCards().reduce(function (
      total,
      card,
    ) {
      return total + card.credits;
    }, 0);
    var reductionsUsed = point.card_str_mods.filter(
      function (modification) {
        return (
          modification.use &&
          modification.use.AIUsesStealthCredits &&
          modification.card == iceAI.ice &&
          modification.amt == -3
        );
      },
    ).length;
    if (reductionsUsed < stealthCredits) {
      var reduction = rc.StrModify(iceAI.ice, this, point, -3, false);
      reduction.runner_credits_spent += 1;
      result.push(reduction);
    }
    return result;
  },
  AIRunPoolCreditOffset: function (server, runEventCardToUse) {
    var corsair = this;
    var installedCorsairs = InstalledCards(runner).filter(function (card) {
      return card.AIUsesStealthCredits;
    });
    if (installedCorsairs[0] != this) return 0;
    return this._stealthCreditCards().reduce(function (total, card) {
      if (
        typeof card.canUseCredits === "function" &&
        card.canUseCredits("using", corsair)
      )
        return total;
      return total + card.credits;
    }, 0);
  },
  AIPreferredInstallChoice: function (choices) {
    if (runner.clickTracker < 2) return -1;
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    for (var i = 0; i < installedRunnerCards.length; i++) {
      if (CheckSubType(installedRunnerCards[i], "Fracter")) return spareMU >= 1;
    }
    return true;
  },
};

//Lampades (36005)
// When you install this program, place 3 power counters on it.
// Access → Hosted power counter, pay the printed rez or play cost of the card you are accessing: Trash that card. Spend credits only from stealth cards to use this ability.
cardSet[36005] = {
  title: "Lampades",
  imageFile: "36005.png",
  elo: 1387,
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 1,
  AIUsesStealthCredits: true,
  _printedAccessCost: function (card) {
    if (CheckCardType(card, ["operation"])) return card.playCost;
    if (CheckCardType(card, ["asset", "upgrade", "ice"]))
      return card.rezCost;
    return undefined;
  },
  _stealthCreditCards: function () {
    var lampades = this;
    return InstalledCards(runner).filter(function (card) {
      if (!CheckSubType(card, "Stealth") || (card.credits || 0) < 1)
        return false;
      return (
        typeof card.canUseCredits !== "function" ||
        card.canUseCredits("using", lampades)
      );
    });
  },
  _availableStealthCredits: function () {
    return this._stealthCreditCards().reduce(function (total, card) {
      return total + card.credits;
    }, 0);
  },
  _spendStealthCredits: function (amount, callback) {
    var lampades = this;
    if (amount < 1) {
      callback.call(lampades);
      return;
    }
    var choices = [];
    var sources = this._stealthCreditCards();
    for (var i = 0; i < sources.length; i++) {
      var maximum = Math.min(amount, sources[i].credits);
      for (var spend = 1; spend <= maximum; spend++) {
        choices.push({
          card: sources[i],
          amount: spend,
          label:
            "Spend " +
            spend +
            " credit" +
            (spend == 1 ? "" : "s") +
            " from " +
            GetTitle(sources[i]),
        });
      }
    }
    if (choices.length < 1) return;
    if (runner.AI) {
      choices = [choices[choices.length - 1]];
    }
    var spendFromChoice = function (params) {
      params.card.credits -= params.amount;
      UpdateCounters();
      Log(
        GetTitle(lampades) +
          " spent " +
          params.amount +
          " credit" +
          (params.amount == 1 ? "" : "s") +
          " from " +
          GetTitle(params.card),
      );
      lampades._spendStealthCredits(amount - params.amount, callback);
    };
    if (choices.length == 1) spendFromChoice(choices[0]);
    else {
      DecisionPhase(
        runner,
        choices,
        spendFromChoice,
        "Lampades",
        "Pay " + amount + " more credit" + (amount == 1 ? "" : "s"),
        lampades,
      );
    }
  },
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this) AddCounters(this, "power", 3);
    },
  },
  abilities: [
    {
      text: "Hosted power counter, printed rez or play cost (Stealth credits only): Trash the accessed card.",
      Enumerate: function () {
        if (!CheckAccessing()) return [];
        if (!CheckTrash(accessingCard)) return [];
        if (!CheckCounters(this, "power", 1)) return [];
        var cost = this._printedAccessCost(accessingCard);
        if (typeof cost !== "number") return [];
        if (this._availableStealthCredits() < cost) return [];
        return [{}];
      },
      Resolve: function () {
        var cost = this._printedAccessCost(accessingCard);
        RemoveCounters(this, "power", 1);
        this._spendStealthCredits(cost, function () {
          TrashAccessedCard(true);
        });
      },
    },
  ],
  AIInstallBeforeRun: function () {
    return 1;
  },
  AIOkToTrash: function () {
    return !CheckCounters(this, "power", 1);
  },
  AIAccessTriggerPriority: function (optionList) {
    var printedCost = this._printedAccessCost(accessingCard);
    if (typeof printedCost !== "number") return 0;
    if (!optionList.includes("trash") || TrashCost(accessingCard) > printedCost)
      return 3;
    return 0;
  },
  AIReducesTrashCost: function (card) {
    if (!CheckCounters(this, "power", 1)) return 0;
    var printedCost = this._printedAccessCost(card);
    if (
      typeof printedCost !== "number" ||
      this._availableStealthCredits() < printedCost
    )
      return 0;
    return Math.max(0, TrashCost(card) - printedCost);
  },
};

//Hackerspace (36006)
// You can install unique (♦) companion resources and unique (♦) connection resources onto this resource. Each resource installed this way costs 1[c] less to install.
// While this resource has a hosted companion and a hosted connection, you get +2 maximum hand size.
cardSet[36006] = {
  title: "Hackerspace",
  imageFile: "36006.png",
  elo: 1323,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Location"],
  installCost: 2,
  unique: true,
  hostedCards: [],
  _hostableCard: function (card) {
    return (
      card.player == runner &&
      card.cardType == "resource" &&
      card.unique === true &&
      (CheckSubType(card, "Companion") || CheckSubType(card, "Connection"))
    );
  },
  canHost: function (card) {
    return this._hostableCard(card);
  },
  modifyInstallCost: {
    Resolve: function (card, destination) {
      if (destination == this && this._hostableCard(card)) return -1;
      return 0;
    },
    automatic: true,
  },
  modifyMaxHandSize: {
    Resolve: function (player) {
      if (player != runner) return 0;
      var hasCompanion = false;
      var hasConnection = false;
      for (var i = 0; i < this.hostedCards.length; i++) {
        if (CheckSubType(this.hostedCards[i], "Companion")) hasCompanion = true;
        if (CheckSubType(this.hostedCards[i], "Connection")) hasConnection = true;
      }
      return hasCompanion && hasConnection ? 2 : 0;
    },
  },
  AIWorthKeeping: function () {
    return true;
  },
  AIOkToTrash: function () {
    return this.hostedCards.length < 1;
  },
};

//Nurse Hạnh (36007)
// Whenever 2 or more facedown cards in Archives are turned faceup, draw 2 cards.
cardSet[36007] = {
  title: "Nurse Hạnh",
  imageFile: "36007.png",
  elo: 1368,
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 1,
  unique: true,
  automaticOnArchivesCardsTurnedFaceUp: {
    Resolve: function (cards) {
      if (cards.length >= 2) Draw(runner, 2);
    },
  },
  AIWorthKeeping: function () {
    return corp.archives.cards.filter(function (card) {
      return !card.faceUp;
    }).length >= 2;
  },
  AIInstallBeforeRun: function (server) {
    if (server != corp.archives) return 0;
    return this.AIWorthKeeping() ? 2 : 0;
  },
  AIDrawInstall: function () {
    return this.AIWorthKeeping() ? 2 : 0;
  },
};

//Stick and Poke (36008)
// The first time each turn you encounter a piece of ice, it gains “↳ Do 1 net damage. The Runner draws 1 card.”, before its other subroutines, for the remainder of that encounter.
cardSet[36008] = {
  title: "Stick and Poke",
  imageFile: "36008.png",
  elo: 1328,
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Companion", "Virtual"],
  installCost: 0,
  unique: true,
  usedThisTurn: false,
  modifiedIce: null,
  addedSubroutine: null,
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
  automaticOnEncounter: {
    Resolve: function (ice) {
      if (this.usedThisTurn) return;
      this.usedThisTurn = true;
      this.modifiedIce = ice;
      this.addedSubroutine = {
        text: "Do 1 net damage. The Runner draws 1 card.",
        Resolve: function () {
          Damage(
            "net",
            1,
            true,
            function () {
              Draw(runner, 1);
            },
            this,
          );
        },
      };
      ice.subroutines.unshift(this.addedSubroutine);
    },
  },
  responseOnEncounterEnds: {
    Resolve: function () {
      if (this.modifiedIce && this.addedSubroutine) {
        var index = this.modifiedIce.subroutines.indexOf(this.addedSubroutine);
        if (index > -1) this.modifiedIce.subroutines.splice(index, 1);
      }
      this.modifiedIce = null;
      this.addedSubroutine = null;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  AIModifyIceAI: function (iceAI, startIceIdx) {
    if (this.usedThisTurn) return iceAI;
    var server = GetServer(iceAI.ice);
    if (!server) return iceAI;
    for (var i = startIceIdx; i > -1; i--) {
      if (server.ice[i] == iceAI.ice) {
        // The run calculator has no draw token, so retain the immediately
        // flatline-relevant net damage as the conservative route effect.
        iceAI.sr.unshift([["netDamage"]]);
        return iceAI;
      }
      if (server.ice[i].rezzed) return iceAI;
    }
    return iceAI;
  },
  AIInstallBeforeRun: function () {
    return 2;
  },
  AIWorthKeeping: function () {
    return true;
  },
};

//Virtual Intelligence, P.I.: “You Can Call Me Vic” (36009)
// Once per turn → [click], 1[c]: Draw 1 card and remove 1 tag.
cardSet[36009] = {
  title: "Virtual Intelligence, P.I.: “You Can Call Me Vic”",
  imageFile: "36009.png",
  elo: 1561,
  player: runner,
  faction: "Criminal",
  cardType: "identity",
  subTypes: ["Digital"],
  deckSize: 45,
  influenceLimit: 15,
  link: 0,
};

//Kompromat (36010)
// Run a server protected by ice. When that run ends, if it was successful, give the Corp 1 bad publicity unless they derez 1 piece of ice protecting the attacked server.
// Remove this event from the game.
cardSet[36010] = {
  title: "Kompromat",
  imageFile: "36010.png",
  elo: 1379,
  player: runner,
  faction: "Criminal",
  influence: 4,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 2,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Sell Out (36011)
// As an additional cost to play this event, trash 1 installed resource.
// Gain 4[c] and draw 2 cards.
cardSet[36011] = {
  title: "Sell Out",
  imageFile: "36011.png",
  elo: 1524,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Tailgate (36012)
// The play cost of this event is lowered by 1[c] for each piece of ice protecting HQ.
// Run HQ. If successful, access 2 additional cards when you breach HQ.
cardSet[36012] = {
  title: "Tailgate",
  imageFile: "36012.png",
  elo: 1625,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Borrowed Goods (36013)
// +1[mu]
// When you install this hardware, if you are not tagged, take 1 tag.
cardSet[36013] = {
  title: "Borrowed Goods",
  imageFile: "36013.png",
  elo: 1236,
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//Rotary (36014)
// +1[mu]
// Whenever you breach HQ or R&D, you may take 1 tag to access 1 additional card.
// [click], 2[c]: Trash this hardware. Only the Corp can use this ability, and only if the Runner is tagged.
// Limit 1 console per player.
cardSet[36014] = {
  title: "Rotary",
  imageFile: "36014.png",
  elo: 1427,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Baker (36015)
// Once per turn → [click]: Run Archives. When you would approach Archives (after passing all ice), you may pay 1[c] to instead change the attacked server to HQ or R&D and approach that server. Spend credits only from stealth cards to pay this cost.
cardSet[36015] = {
  title: "Baker",
  imageFile: "36015.png",
  elo: 1606,
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 3,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Underdome Irregulars (36016)
// When your action phase ends, if a piece of ice was rezzed this turn, draw 2 cards or remove 1 tag. If no ice was rezzed this turn, trash this resource.
cardSet[36016] = {
  title: "Underdome Irregulars",
  imageFile: "36016.png",
  elo: 1501,
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Hiram “0mission” Svensson: Shadow of the Past (36017)
// Whenever you install or trash a piece of hardware (from any location), look at the top card of R&D.
cardSet[36017] = {
  title: "Hiram “0mission” Svensson: Shadow of the Past",
  imageFile: "36017.png",
  elo: 1527,
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 0,
};

//Aircheck (36018)
// Place 4[c] on this event. While this event is active, you can spend hosted credits, and you cannot lose or spend credits from your credit pool.
// Run HQ or R&D.
// When that run ends, if it was successful, you may run a remote server.
cardSet[36018] = {
  title: "Aircheck",
  imageFile: "36018.png",
  elo: 1333,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "event",
  subTypes: ["Run", "Stealth"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Beta Build (36019)
// Search your stack for 1 non-virus program. Install it, ignoring all costs. (Shuffle your stack after searching it.)
// Run any server. When that run ends, if that program has not been uninstalled, add it to the top of your stack.
cardSet[36019] = {
  title: "Beta Build",
  imageFile: "36019.png",
  elo: 1436,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Methuselah (36020)
// +1[mu]
// Whenever a run begins, you may trash 1 piece of hardware from your grip to place 2[c] on this hardware.
// You can spend hosted credits during runs.
// Limit 1 console per player.
cardSet[36020] = {
  title: "Methuselah",
  imageFile: "36020.png",
  elo: 1472,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Console", "Stealth"],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Touchstone (36021)
// The first time each turn you play an event, place 1[c] on this hardware.
// You can spend hosted credits during runs.
cardSet[36021] = {
  title: "Touchstone",
  imageFile: "36021.png",
  elo: 1503,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Stealth"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Read-Write Share (36022)
// Limit 4 hosted cards.
// When you install this program and when your turn begins, you may host 1 card from your grip facedown on this program to draw 1 card.
// [trash]: Shuffle all hosted cards into your stack.
cardSet[36022] = {
  title: "Read-Write Share",
  imageFile: "36022.png",
  elo: 1606,
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: [],
  installCost: 0,
  memoryCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Sipa (36023)
// The first time each turn you pass the outermost piece of ice protecting a server after fully breaking it, you may swap it with another installed piece of ice.
cardSet[36023] = {
  title: "Sipa",
  imageFile: "36023.png",
  elo: 1418,
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 1,
  memoryCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Stowaway (36024)
// Install only on a piece of ice.
// Whenever you make a successful run on this server, gain 2[c].
cardSet[36024] = {
  title: "Stowaway",
  imageFile: "36024.png",
  elo: 1659,
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Trojan"],
  installCost: 0,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Word on the Street (36025)
// As an additional cost to score an agenda the Corp installed this turn, they must add this resource to their score area as an agenda worth −1 agenda points with “You cannot forfeit this agenda.”.
// When the Corp scores an agenda they did not install this turn, trash this resource, gain 4[c], and draw 1 card.
cardSet[36025] = {
  title: "Word on the Street",
  imageFile: "36025.png",
  elo: 1413,
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "resource",
  subTypes: [],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Méliès City Luxury Line (36026)
// As an additional cost to steal this agenda, the Runner must spend [click].
// When you score this agenda, gain [click].
cardSet[36026] = {
  title: "Méliès City Luxury Line",
  imageFile: "36026.png",
  elo: 1803,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//Synchrocyclotron (36027)
// The first double operation you play each turn costs [click] less to play.
cardSet[36027] = {
  title: "Synchrocyclotron",
  imageFile: "36027.png",
  elo: 1551,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "asset",
  subTypes: ["Facility"],
  rezCost: 3,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Ansel 2.0 (36028)
// Lose [click][click]: Break up to 2 subroutines on this ice. Only the Runner can use this ability.
// ↳ Trash 1 installed Runner card.
// ↳ Remove 1 card in the heap from the game.
// ↳ You may install 1 card from HQ or Archives.
// ↳ End the run.
cardSet[36028] = {
  title: "Ansel 2.0",
  imageFile: "36028.png",
  elo: 1501,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 4,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "Destroyer"],
  rezCost: 8,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Reverb (36029)
// The rez cost of this ice is lowered by 1[c] for each other unrezzed piece of ice.
// ↳ End the run.
// ↳ End the run.
cardSet[36029] = {
  title: "Reverb",
  imageFile: "36029.png",
  elo: 1419,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "ice",
  subTypes: ["Barrier", "Harmonic"],
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

//Sleipnir (36030)
// ↳ You may draw 1 card.
// ↳ You may shuffle 1 card from HQ or Archives into R&D.
// ↳ End the run.
cardSet[36030] = {
  title: "Sleipnir",
  imageFile: "36030.png",
  elo: 1704,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
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

//Vertigo (36031)
// When the Runner passes this ice, if they have no [click] remaining, they cannot steal or trash Corp cards for the remainder of this run.
// ↳ The Runner loses [click].
cardSet[36031] = {
  title: "Vertigo",
  imageFile: "36031.png",
  elo: 1379,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 1,
  strength: 1,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Caveat Emptor (36032)
// Resolve 1 of the following:
// Gain 6[c]. The Runner gets −1 allotted [click] for their next turn.Gain 10[c]. The Runner gets +1 allotted [click] for their next turn.
cardSet[36032] = {
  title: "Caveat Emptor",
  imageFile: "36032.png",
  elo: 1541,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 5,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//realloc() (36033)
// As an additional cost to play this operation, spend [click].
// Choose 2 rezzed pieces of ice. For each chosen piece of ice, gain credits equal to its printed rez cost, then derez it.
cardSet[36033] = {
  title: "realloc()",
  imageFile: "36033.png",
  elo: 1375,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "operation",
  subTypes: ["Double"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Retirement Plan (36034)
// As an additional cost to play this operation, spend [click].
// Install 1 agenda, asset, or piece of ice from Archives.
cardSet[36034] = {
  title: "Retirement Plan",
  imageFile: "36034.png",
  elo: 1504,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "operation",
  subTypes: ["Double"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Perfect Recall (36035)
// When you rez this upgrade and whenever an agenda is scored or stolen from this server or its root, place 1 power counter on this upgrade.
// Hosted power counter: Reveal 1 card in HQ. The Runner cannot steal or trash copies of that card for the remainder of this run. Use this ability only during a run.
cardSet[36035] = {
  title: "Perfect Recall",
  imageFile: "36035.png",
  elo: 1422,
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "upgrade",
  subTypes: [],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Méliès U: Only the Brightest (36036)
// When your discard phase ends, secretly set your identity to any copy of Méliès U: Only the Brightest.
// When the Runner makes a successful run on a central server, flip this identity.
// When the Runner’s action phase ends, gain 1[c].
// Side 1: When you flip this identity to this side during a run on HQ, look at the top card of R&D. You may trash that card. If you do, add 1 card from Archives to HQ.
// When the Runner’s discard phase ends, flip this identity.
// Side 2: When you flip this identity to this side during a run on R&D, look at the top card of R&D. You may trash that card. If you do, add 1 card from Archives to HQ.
// When the Runner’s discard phase ends, flip this identity.
// Side 3: When you flip this identity to this side during a run on Archives, look at the top card of R&D. You may trash that card. If you do, add 1 card from Archives to HQ.
// When the Runner’s discard phase ends, flip this identity.
cardSet[36036] = {
  title: "Méliès U: Only the Brightest",
  imageFile: "36036.png",
  elo: 1581,
  player: corp,
  faction: "Jinteki",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
};

//Lotus Haze (36037)
// When you score this agenda, place 3 agenda counters on it.
// Hosted agenda counter: Move 1 rezzed upgrade to the root of another server.
cardSet[36037] = {
  title: "Lotus Haze",
  imageFile: "36037.png",
  elo: 1599,
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Esca (36038)
// While the Runner is accessing this asset in R&D, they must reveal it.
// When the Runner accesses this asset, they lose 1[c]. If they are tagged, do 1 net damage.
cardSet[36038] = {
  title: "Esca",
  imageFile: "36038.png",
  elo: 1500,
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "asset",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//ezaM (36039)
// [click]: Swap this ice with another installed piece of ice.
// ↳ Look at the top card of R&D. You may add that card to the bottom of R&D.
// ↳ Each piece of ice gets +1 strength for the remainder of this run.
cardSet[36039] = {
  title: "ezaM",
  imageFile: "36039.png",
  elo: 1364,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
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

//Knowledge Seeker (36040)
// Whenever an encounter with this ice ends, if it has 3 or more hosted virus counters, purge virus counters and derez this ice.
// ↳ Place 1 virus counter on this ice.
// ↳ Look at the top 4 cards of R&D and arrange them in any order.
// ↳ End the run.
cardSet[36040] = {
  title: "Knowledge Seeker",
  imageFile: "36040.png",
  elo: 1518,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 5,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Lionsmane (36041)
// ↳ Do 2 net damage.
// ↳ Do 2 net damage unless the Runner pays 3[c].
// ↳ Do 2 net damage unless the Runner jacks out.
cardSet[36041] = {
  title: "Lionsmane",
  imageFile: "36041.png",
  elo: 1612,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "AP"],
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

//Vicsek (36042)
// ↳ Do X net damage and give the Runner X tags. X is equal to the number of tags the Runner has.
// ↳ Give the Runner 1 tag. Trash this ice.
cardSet[36042] = {
  title: "Vicsek",
  imageFile: "36042.png",
  elo: 1351,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Trap", "AP", "Observer"],
  rezCost: 2,
  strength: 3,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Cultivate (36043)
// Look at the top 5 cards of R&D. Trash 1 of those cards, add 1 of them to HQ, and arrange the rest in any order.
cardSet[36043] = {
  title: "Cultivate",
  imageFile: "36043.png",
  elo: 1455,
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

//Unleash (36044)
// As an additional cost to play this operation, remove 1 tag.
// Rez 1 installed piece of ice, ignoring all costs. You may resolve 1 subroutine on that ice.
cardSet[36044] = {
  title: "Unleash",
  imageFile: "36044.png",
  elo: 1619,
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//The Red Room (36045)
// Central server only.
// The first time each turn an agenda is scored or stolen, place 1 power counter on this upgrade.
// Hosted power counter: End the run. Use this ability only during a run against another server.
cardSet[36045] = {
  title: "The Red Room",
  imageFile: "36045.png",
  elo: 1605,
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Facility"],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Editorial Division: Ad Nihilum (36046)
// The first time each turn you take bad publicity, you may search R&D for 1 non-agenda black ops, gray ops, or liability card and reveal it. (Shuffle R&D after searching it.) Add that card to HQ.
cardSet[36046] = {
  title: "Editorial Division: Ad Nihilum",
  imageFile: "36046.png",
  elo: 1487,
  player: corp,
  faction: "NBN",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
};

//Witch Hunt (36047)
// When this agenda is scored or stolen, take 1 bad publicity.
// When your action phase ends, if you scored this agenda this turn, remove all tags, then give the Runner 3 tags.
cardSet[36047] = {
  title: "Witch Hunt",
  imageFile: "36047.png",
  elo: 1547,
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative", "Liability"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Magistrate Revontulet (36048)
// As an additional cost to steal an agenda, the Runner must pay 3[c].
// Whenever you score an agenda, the Runner loses 3[c].
cardSet[36048] = {
  title: "Magistrate Revontulet",
  imageFile: "36048.png",
  elo: 1725,
  player: corp,
  faction: "NBN",
  influence: 4,
  cardType: "asset",
  subTypes: ["Executive"],
  rezCost: 2,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Nihilo Agent (36049)
// When you rez this asset, load 3 power counters onto it. When it is empty, trash it.
// When your turn begins, remove 1 tag and 1 bad publicity.
// When your discard phase ends, give the Runner 1 tag, take 1 bad publicity, and remove 1 hosted power counter.
cardSet[36049] = {
  title: "Nihilo Agent",
  imageFile: "36049.png",
  elo: 1480,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "asset",
  subTypes: ["Enforcer", "Liability"],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Grubber (36050)
// When you rez this ice, if it is protecting a central server, take 1 bad publicity.
// ↳ End the run unless the Runner pays 3[c].
// ↳ End the run unless the Runner pays 3[c].
cardSet[36050] = {
  title: "Grubber",
  imageFile: "36050.png",
  elo: 1567,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "ice",
  subTypes: ["Barrier", "Liability"],
  rezCost: 5,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Lethe (36051)
// Whenever the Runner bypasses or fully breaks this ice, give them 1 tag.
// ↳ You may add 1 card from Archives to the top or bottom of R&D.
// ↳ Add 1 installed Runner card to the grip.
cardSet[36051] = {
  title: "Lethe",
  imageFile: "36051.png",
  elo: 1381,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Observer"],
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

//Paywall (36052)
// When the Runner encounters this ice, they lose 1[c].
// ↳ End the run unless the Runner pays 1[c].
cardSet[36052] = {
  title: "Paywall",
  imageFile: "36052.png",
  elo: 1520,
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 1,
  strength: 1,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Flood the Market (36053)
// As an additional cost to play this operation, spend [click].
// Choose 1 installed card you can advance. Place 1 advancement counter on that card for each remote server that has a card in its root and is protected by ice.
cardSet[36053] = {
  title: "Flood the Market",
  imageFile: "36053.png",
  elo: 1832,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: ["Double"],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Scapegoat (36054)
// Resolve 1 of the following of the Runner’s choice:Remove 2 bad publicity.Choose 1 installed Runner card. The Runner shuffles it into the stack.
cardSet[36054] = {
  title: "Scapegoat",
  imageFile: "36054.png",
  elo: 1425,
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Hype Machine (36055)
// As long as an agenda was scored or stolen this turn, the rez cost of this upgrade is lowered by 6[c].
// [trash]: Place 1 advancement counter on a card you can advance in the root of this server.
cardSet[36055] = {
  title: "Hype Machine",
  imageFile: "36055.png",
  elo: 1477,
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Advertisement"],
  rezCost: 6,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Sacrifice Zone Expansion (36056)
// Install only faceup. (This agenda is neither rezzed nor unrezzed.)
// The first time each turn you advance this agenda, gain 3[c].
// Once per turn → When the Runner makes a successful run on another server, you may remove 1 hosted advancement counter to do 1 meat damage.
cardSet[36056] = {
  title: "Sacrifice Zone Expansion",
  imageFile: "36056.png",
  elo: 1609,
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Public", "Expansion"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Luana Campos (36057)
// When your turn begins, you may host 1 of your bad publicity counters on this asset. (It has no effect while hosted.) If you do, gain 3[c] and draw 1 card.
// [interrupt] → When this asset would be uninstalled, take all hosted bad publicity.
cardSet[36057] = {
  title: "Luana Campos",
  imageFile: "36057.png",
  elo: 1433,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "asset",
  subTypes: ["Executive", "Liability"],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Event Horizon (36058)
// [trash]: End the run. Use this ability only during a run against this server.
// ↳ Trash 1 installed program unless the Runner pays 3[c].
// ↳ End the run unless the Runner pays 3[c].
cardSet[36058] = {
  title: "Event Horizon",
  imageFile: "36058.png",
  elo: 1875,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Destroyer"],
  rezCost: 4,
  strength: 0,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Flywheel (36059)
// ↳ Gain 1[c]. You may draw 1 card.
// ↳ Gain 1[c]. You may draw 1 card.
cardSet[36059] = {
  title: "Flywheel",
  imageFile: "36059.png",
  elo: 1539,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry"],
  rezCost: 2,
  strength: 3,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Tocsin (36060)
// [click], 1[c], reveal and trash this ice from HQ: Search R&D for up to 1 barrier and up to 1 sentry and reveal them. (Shuffle R&D after searching it.) Add those cards to HQ.
// ↳ The Runner loses 2[c].
// ↳ End the run.
// ↳ End the run.
cardSet[36060] = {
  title: "Tocsin",
  imageFile: "36060.png",
  elo: 1621,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate", "Expendable"],
  rezCost: 8,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Myōshu (36061)
// Play only if you scored an agenda this turn that you did not install this turn.
// Add this operation to your score area as an agenda worth 2 agenda points.
cardSet[36061] = {
  title: "Myōshu",
  imageFile: "36061.png",
  elo: 1737,
  player: corp,
  faction: "Weyland Consortium",
  influence: 4,
  cardType: "operation",
  subTypes: [],
  playCost: 10,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Reanimation Protocol (36062)
// Install and rez 1 piece of ice from Archives, paying a total of 10[c] less. If you rezzed a piece of non-liability ice this way, take 1 bad publicity.
cardSet[36062] = {
  title: "Reanimation Protocol",
  imageFile: "36062.png",
  elo: 1523,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "operation",
  subTypes: ["Liability"],
  playCost: 2,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Vulture Fund (36063)
// Gain 14[c] and take 1 bad publicity.
cardSet[36063] = {
  title: "Vulture Fund",
  imageFile: "36063.png",
  elo: 1645,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "operation",
  subTypes: ["Transaction", "Liability"],
  playCost: 7,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Flagship (36064)
// HQ or R&D only.
// Runs against this server cannot be declared successful. (This effect does not cause runs to become unsuccessful.)
// Persistent → During each run against this server, the Runner cannot access more than 1 card other than this upgrade.
cardSet[36064] = {
  title: "Flagship",
  imageFile: "36064.png",
  elo: 1618,
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Ritzy"],
  rezCost: 3,
  trashCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Shackleton Grid (36065)
// Once per turn → When the Runner spends credits from outside their credit pool during a run against this server, you may do 4 meat damage.
// Limit 1 region per server.
cardSet[36065] = {
  title: "Shackleton Grid",
  imageFile: "36065.png",
  elo: 1416,
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 1,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Let Them Dream (36066)
// When you score this agenda, you may search HQ, R&D, or Archives for 1 agenda and reveal it. (Shuffle R&D after searching it.) Add that agenda to HQ or the bottom of R&D.
// While this agenda is in the Runner’s score area, it is worth 1 less agenda point.
cardSet[36066] = {
  title: "Let Them Dream",
  imageFile: "36066.png",
  elo: 1801,
  player: corp,
  faction: "Neutral",
  influence: 1,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};
