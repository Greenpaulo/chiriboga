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
  automaticOnSubroutineFiring: {
    Resolve: function (ice, firingSubroutine) {
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
  usedThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  abilities: [
    {
      text: "[click], 1[c]: Draw 1 card and remove 1 tag.",
      Enumerate: function () {
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        if (!CheckCredits(runner, 1, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        this.usedThisTurn = true;
        SpendClicks(runner, 1);
        SpendCredits(
          runner,
          1,
          "using",
          this,
          function () {
            Draw(runner, 1);
            RemoveTags(1);
          },
          this,
        );
      },
    },
  ],
  AIDrawTrigger: 2,
  AIWouldTrigger: function () {
    if (runner.tags > 0) return true;
    return runner.AI._currentOverDraw() < runner.AI._maxOverDraw();
  },
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
  runningWithThis: false,
  runWasSuccessful: false,
  Enumerate: function () {
    return ChoicesExistingServers().filter(function (choice) {
      return choice.server.ice.length > 0;
    });
  },
  Resolve: function (params) {
    this.runningWithThis = true;
    this.runWasSuccessful = false;
    MakeRun(params.server);
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (this.runningWithThis) this.runWasSuccessful = true;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      if (!this.runningWithThis) return;
      var kompromat = this;
      var finish = function () {
        kompromat.runningWithThis = false;
        kompromat.runWasSuccessful = false;
        RemoveFromGame(kompromat);
      };
      if (!this.runWasSuccessful) {
        finish();
        return;
      }
      var choices = ChoicesArrayCards(
        attackedServer.ice.filter(function (ice) {
          return ice.rezzed;
        }),
      );
      for (var i = 0; i < choices.length; i++) {
        choices[i].derez = true;
        choices[i].label = "Derez " + GetTitle(choices[i].card);
      }
      choices.push({
        badPublicity: true,
        label: "Take 1 bad publicity",
        button: "Take bad publicity",
      });
      if (corp.AI) {
        var rezzedChoice = null;
        for (var j = 0; j < choices.length; j++) {
          if (
            choices[j].derez &&
            (!rezzedChoice || choices[j].card.rezCost < rezzedChoice.card.rezCost)
          )
            rezzedChoice = choices[j];
        }
        if (rezzedChoice && rezzedChoice.card.rezCost <= 3)
          choices = [rezzedChoice];
        else choices = [choices[choices.length - 1]];
      }
      DecisionPhase(
        corp,
        choices,
        function (params) {
          if (params.derez) Derez(params.card);
          else AddBadPublicity(1);
          finish();
        },
        "Kompromat",
        "Derez ice protecting " + ServerName(attackedServer) + "?",
        kompromat,
      );
    },
    automatic: true,
  },
  AIBreachNotRequired: true,
  AIRunEventExtraPotential: function (server) {
    if (!server || server.ice.length < 1) return 0;
    return 0.4;
  },
  AIWorthKeeping: function () {
    return true;
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
  Enumerate: function () {
    return ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["resource"]) && CheckTrash(card);
    });
  },
  Resolve: function (params) {
    var sellOut = this;
    Trash(
      params.card,
      false,
      function () {
        GainCredits(runner, 4, "", sellOut);
        Draw(runner, 2);
      },
      this,
    );
  },
  AIPreferredPlayChoice: function (card, choices) {
    for (var i = 0; i < choices.length; i++) {
      if (
        typeof choices[i].card.AIOkToTrash === "function" &&
        choices[i].card.AIOkToTrash.call(choices[i].card)
      )
        return i;
    }
    var preferred = -1;
    var lowestCost = Infinity;
    for (var j = 0; j < choices.length; j++) {
      var cost = InstallCost(choices[j].card);
      if (cost < lowestCost) {
        lowestCost = cost;
        preferred = j;
      }
    }
    return preferred;
  },
  AIWouldPlay: function () {
    var choices = this.Enumerate();
    for (var i = 0; i < choices.length; i++) {
      if (
        (typeof choices[i].card.AIOkToTrash === "function" &&
          choices[i].card.AIOkToTrash.call(choices[i].card)) ||
        InstallCost(choices[i].card) <= 1
      )
        return true;
    }
    return false;
  },
  AIEconomyPlay: 2,
  AIPlayToDraw: 2,
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
  runWasSuccessful: false,
  modifyPlayCost: {
    Resolve: function (card) {
      if (card == this) return -corp.HQ.ice.length;
      return 0;
    },
    availableWhenInactive: true,
  },
  Resolve: function (params) {
    this.runWasSuccessful = false;
    MakeRun(corp.HQ);
  },
  responseOnRunSuccessful: {
    Resolve: function (server) {
      if (server == corp.HQ) this.runWasSuccessful = true;
    },
    automatic: true,
  },
  modifyBreachAccess: {
    Resolve: function () {
      if (this.runWasSuccessful && attackedServer == corp.HQ) return 2;
      return 0;
    },
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.runWasSuccessful = false;
    },
    automatic: true,
  },
  AIAdditionalAccess: function (server) {
    if (server != corp.HQ) return 0;
    if (runner.AI._rootKnownToContainCopyOfCard(server, "Crisium Grid"))
      return 0;
    return 2;
  },
  AIRunEventExtraPotential: function (server) {
    if (server != corp.HQ) return 0;
    if (runner.AI._rootKnownToContainCopyOfCard(server, "Crisium Grid"))
      return 0;
    return 0.5 * runner.AI._additionalHQAccessValue(this);
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
  memoryUnits: 1,
  automaticOnInstall: {
    Resolve: function (card) {
      if (card == this && runner.tags < 1) AddTags(1);
    },
  },
  AIPreferredInstallChoice: function () {
    if (MemoryUnits() - InstalledMemoryCost() >= 2) return -1;
    return 0;
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    return spareMU < 2;
  },
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
  unique: true,
  memoryUnits: 1,
  additionalAccessThisBreach: false,
  responseOnBreach: {
    Enumerate: function (server) {
      if (server != corp.HQ && server != corp.RnD) return [];
      return [
        { use: true, label: "Take 1 tag to access 1 additional card" },
        { use: false, label: "Continue without taking a tag", button: "Continue" },
      ];
    },
    Resolve: function (params) {
      if (!params.use) return;
      AddTags(
        1,
        function () {
          this.additionalAccessThisBreach = true;
        },
        this,
      );
    },
    text: "Take 1 tag to access 1 additional card?",
  },
  modifyBreachAccess: {
    Resolve: function () {
      if (this.additionalAccessThisBreach) return 1;
      return 0;
    },
  },
  automaticOnBreach: {
    Resolve: function () {
      this.additionalAccessThisBreach = false;
    },
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.additionalAccessThisBreach = false;
    },
    automatic: true,
  },
  corpAbilities: [
    {
      text: "[click], 2[c]: Trash Rotary.",
      Enumerate: function () {
        if (runner.tags < 1) return [];
        if (!CheckActionClicks(corp, 1)) return [];
        if (!CheckCredits(corp, 2, "using", this)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        SpendCredits(
          corp,
          2,
          "using",
          this,
          function () {
            Trash(this, false);
          },
          this,
        );
      },
    },
  ],
  AITriggerWhenCan: true,
  AIAdditionalAccess: function (server) {
    if (server != corp.HQ && server != corp.RnD) return 0;
    return 1;
  },
  AICentralPressure: function (server) {
    if (server != corp.HQ && server != corp.RnD) return {};
    return { additionalAccess: 1 };
  },
  AIInstallBeforeRun: function (server) {
    return server == corp.HQ || server == corp.RnD ? 1 : 0;
  },
  AIWorthKeeping: function () {
    return true;
  },
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
  usedThisTurn: false,
  runningWithThis: false,
  _stealthCreditCards: function () {
    var baker = this;
    return InstalledCards(runner).filter(function (card) {
      if (!CheckSubType(card, "Stealth") || (card.credits || 0) < 1)
        return false;
      return (
        typeof card.canUseCredits !== "function" ||
        card.canUseCredits("using", baker)
      );
    });
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  abilities: [
    {
      text: "[click]: Run Archives.",
      Enumerate: function () {
        if (this.usedThisTurn) return [];
        if (!CheckActionClicks(runner, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        this.usedThisTurn = true;
        this.runningWithThis = true;
        MakeRun(corp.archives);
      },
    },
  ],
  responseOnWouldApproachServer: {
    Enumerate: function () {
      if (!this.runningWithThis || attackedServer != corp.archives) return [];
      if (this._stealthCreditCards().length < 1) return [];
      var choices = [
        { server: corp.HQ, label: "Pay 1 stealth credit and approach HQ" },
        { server: corp.RnD, label: "Pay 1 stealth credit and approach R&D" },
      ];
      if (runner.AI) {
        var hqPotential = runner.AI._getCachedPotential(corp.HQ);
        var rndPotential = runner.AI._getCachedPotential(corp.RnD);
        return [hqPotential >= rndPotential ? choices[0] : choices[1]];
      }
      return choices;
    },
    Resolve: function (params) {
      var baker = this;
      var creditChoices = ChoicesArrayCards(this._stealthCreditCards());
      var spendAndRedirect = function (creditParams) {
        creditParams.card.credits -= 1;
        UpdateCounters();
        attackedServer = params.server;
        Log("Attacked server changed to " + ServerName(params.server));
      };
      if (creditChoices.length == 1) spendAndRedirect(creditChoices[0]);
      else
        DecisionPhase(
          runner,
          creditChoices,
          spendAndRedirect,
          "Baker",
          "Choose a Stealth card to spend 1 credit from",
          baker,
        );
    },
    text: "Pay 1 stealth credit to change the attacked server?",
  },
  responseOnRunEnds: {
    Resolve: function () {
      this.runningWithThis = false;
    },
    automatic: true,
  },
  AIRedirectsRun: function (fromServer, toServer) {
    return (
      !this.usedThisTurn &&
      fromServer == corp.archives &&
      (toServer == corp.HQ || toServer == corp.RnD) &&
      this._stealthCreditCards().length > 0
    );
  },
  AIRunAbilityExtraPotential: function (server, potential) {
    if (server != corp.archives || this.usedThisTurn) return 0;
    if (this._stealthCreditCards().length < 1) return 0;
    var redirectedPotential = Math.max(
      runner.AI._getCachedPotential(corp.HQ),
      runner.AI._getCachedPotential(corp.RnD),
    );
    return Math.max(0, redirectedPotential - potential);
  },
  AIWouldTrigger: function () {
    if (this.usedThisTurn || this._stealthCreditCards().length < 1) return false;
    return (
      Math.max(
        runner.AI._getCachedPotential(corp.HQ),
        runner.AI._getCachedPotential(corp.RnD),
      ) > 0
    );
  },
  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    return spareMU >= 1;
  },
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
  iceRezzedThisTurn: false,
  automaticOnRez: {
    Resolve: function (card) {
      if (CheckCardType(card, ["ice"])) this.iceRezzedThisTurn = true;
    },
    availableWhenInactive: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.iceRezzedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.iceRezzedThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerActionPhaseEnds: {
    Enumerate: function () {
      if (!this.iceRezzedThisTurn) return [{}];
      var choices = [{ draw: true, label: "Draw 2 cards" }];
      if (runner.tags > 0)
        choices.push({ removeTag: true, label: "Remove 1 tag" });
      if (runner.AI) {
        if (runner.tags > 0) return [choices[choices.length - 1]];
        return [choices[0]];
      }
      return choices;
    },
    Resolve: function (params) {
      if (!this.iceRezzedThisTurn) {
        Trash(this, true);
      } else if (params.removeTag) {
        RemoveTags(1);
      } else {
        Draw(runner, 2);
      }
    },
    text: "Resolve Underdome Irregulars",
  },
  AIDrawInstall: function () {
    return 1;
  },
  AIWorthKeeping: function () {
    return true;
  },
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
  _lookAtTopOfRnD: function () {
    if (corp.RnD.cards.length < 1) return;
    var topCard = corp.RnD.cards[corp.RnD.cards.length - 1];
    topCard.knownToRunner = true;
    Log(GetTitle(this) + " looks at the top card of R&D");
  },
  responseOnInstall: {
    Enumerate: function (card) {
      if (
        card &&
        card.player == runner &&
        CheckCardType(card, ["hardware"]) &&
        corp.RnD.cards.length > 0
      )
        return [{}];
      return [];
    },
    Resolve: function () {
      this._lookAtTopOfRnD();
    },
    text: "Look at the top card of R&D",
  },
  responseOnTrash: {
    Enumerate: function (cards) {
      if (corp.RnD.cards.length < 1) return [];
      for (var i = 0; i < cards.length; i++) {
        if (
          cards[i].player == runner &&
          CheckCardType(cards[i], ["hardware"])
        )
          return [{}];
      }
      return [];
    },
    Resolve: function () {
      this._lookAtTopOfRnD();
    },
    text: "Look at the top card of R&D",
  },
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
  runningWithThis: false,
  primaryRun: false,
  primaryRunWasSuccessful: false,
  pendingRunServer: null,
  credits: 0,
  Enumerate: function () {
    return [
      {server: corp.HQ, label: "HQ"},
      {server: corp.RnD, label: "R&D"},
    ];
  },
  Resolve: function (params) {
    PlaceCredits(this, 4);
    this.runningWithThis = true;
    this.primaryRun = true;
    this.primaryRunWasSuccessful = false;
    this.pendingRunServer = null;
    MakeRun(params.server);
  },
  canUseCredits: function () {
    return this.runningWithThis;
  },
  preventCreditPoolUse: function (player, action) {
    return this.runningWithThis && player == runner &&
      (action == "spend" || action == "lose");
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (this.runningWithThis && this.primaryRun)
        this.primaryRunWasSuccessful = true;
    },
    automatic: true,
  },
  responseOnRunEnds: {
    Enumerate: function () {
      if (!this.runningWithThis || !this.primaryRun)
        return [];
      if (!this.primaryRunWasSuccessful) return [];
      var choices = ChoicesExistingServers().filter(function (choice) {
        return typeof choice.server.cards === "undefined";
      });
      choices.push({server: null, label: "Do not run", button: "Continue"});
      if (runner.AI && choices.length > 1) {
        var bestChoice = choices[choices.length - 1];
        var bestPotential = 0;
        for (var i = 0; i < choices.length - 1; i++) {
          var potential = runner.AI._getCachedPotential(choices[i].server);
          if (potential > bestPotential) {
            bestPotential = potential;
            bestChoice = choices[i];
          }
        }
        return [bestChoice];
      }
      return choices;
    },
    Resolve: function (params) {
      this.primaryRun = false;
      this.primaryRunWasSuccessful = false;
      this.pendingRunServer = params.server;
    },
    text: "You may run a remote server",
  },
  automaticOnRunEndCleanup: {
    Resolve: function () {
      if (!this.runningWithThis) return;
      if (this.pendingRunServer) {
        var nextServer = this.pendingRunServer;
        this.pendingRunServer = null;
        MakeRun(nextServer);
      } else {
        this.runningWithThis = false;
        this.primaryRun = false;
        this.primaryRunWasSuccessful = false;
      }
    },
  },
  AIRunEventExtraPotential: function (server, potential) {
    if (server != corp.HQ && server != corp.RnD) return 0;
    return potential > 1.5 ? 0.2 : 0.05;
  },
  AIRunEventExtraCredits: 4,
  AIRunEventModify: function () {
    this.storedAIRunnerCreditPool = runner.creditPool;
    runner.creditPool = this.playCost;
  },
  AIRunEventRestore: function () {
    runner.creditPool = this.storedAIRunnerCreditPool;
    this.storedAIRunnerCreditPool = null;
  },
  AIWorthKeeping: function () {
    return true;
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
  lingeringEffectTarget: null,
  runningWithThis: false,
  Enumerate: function () {
    var programs = ChoicesArrayInstall(runner.stack, true, function (card) {
      return CheckCardType(card, ["program"]) && !CheckSubType(card, "Virus");
    });
    var servers = ChoicesExistingServers();
    var choices = [];
    for (var i = 0; i < programs.length; i++) {
      for (var j = 0; j < servers.length; j++) {
        choices.push({
          card: programs[i].card,
          host: programs[i].host,
          server: servers[j].server,
          label:
            programs[i].label + "; run " + ServerName(servers[j].server),
        });
      }
    }
    return choices;
  },
  Resolve: function (params) {
    Shuffle(runner.stack);
    var betaBuild = this;
    Install(
      params.card,
      params.host,
      true,
      null,
      true,
      function () {
        betaBuild.lingeringEffectTarget = params.card;
        betaBuild.runningWithThis = true;
        MakeRun(params.server);
      },
      this,
      null,
      null,
      false,
    );
  },
  automaticOnUninstall: {
    Resolve: function (card) {
      if (card == this.lingeringEffectTarget)
        this.lingeringEffectTarget = null;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunEnds: {
    Resolve: function () {
      if (!this.runningWithThis) return;
      this.runningWithThis = false;
      if (!this.lingeringEffectTarget) return;
      var target = this.lingeringEffectTarget;
      this.lingeringEffectTarget = null;
      MoveCard(target, runner.stack);
      Log(GetTitle(target) + " added to top of the stack");
    },
    automatic: true,
  },
  AIPreferredPlayChoice: function (choices) {
    var preferredCard = runner.AI._icebreakerInPileNotInHandOrArray(
      runner.stack,
      InstalledCards(runner),
    );
    var preferredServer = null;
    if (runner.AI.serverList && runner.AI.serverList.length > 0)
      preferredServer = runner.AI.serverList[0].server;
    for (var i = 0; i < choices.length; i++) {
      if (
        (!preferredCard || choices[i].card == preferredCard) &&
        (!preferredServer || choices[i].server == preferredServer)
      )
        return i;
    }
    return choices.length > 0 ? 0 : -1;
  },
  AIIcebreakerTutor: function () {
    return runner.stack.filter(function (card) {
      return CheckCardType(card, ["program"]) &&
        CheckSubType(card, "Icebreaker") &&
        !CheckSubType(card, "Virus");
    });
  },
  AIWorthKeeping: function (installedRunnerCards) {
    return this.AIIcebreakerTutor(installedRunnerCards).length > 0;
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
  unique: true,
  memoryUnits: 1,
  credits: 0,
  responseOnRunBegins: {
    Enumerate: function () {
      var choices = ChoicesArrayCards(runner.grip, function (card) {
        return CheckCardType(card, ["hardware"]) && CheckTrash(card);
      });
      if (choices.length < 1) return [];
      choices.push({card: null, label: "Do not trash hardware", button: "Continue"});
      if (runner.AI) {
        var trashChoices = choices.slice(0, choices.length - 1);
        var index = runner.AI._indexOfBestDiscardOption(trashChoices);
        var runCost = runner.AI._getCachedCost(attackedServer);
        if (
          index > -1 &&
          (runCost > AvailableCredits(runner) ||
            !runner.AI.cardsWorthKeeping.includes(trashChoices[index].card))
        )
          return [trashChoices[index]];
        return [choices[choices.length - 1]];
      }
      return choices;
    },
    Resolve: function (params) {
      if (!params.card) return;
      Trash(
        params.card,
        false,
        function () {
          PlaceCredits(this, 2);
        },
        this,
      );
    },
    text: "You may trash hardware from your grip to place 2[c]",
  },
  canUseCredits: function () {
    return attackedServer !== null;
  },
  AIRunPoolCreditOffset: function () {
    return this.credits;
  },
  AIInstallBeforeRun: function (server, potential, useRunEvent, runCreditCost) {
    if (runCreditCost <= AvailableCredits(runner)) return 0;
    for (var i = 0; i < runner.grip.length; i++) {
      if (runner.grip[i] != this && CheckCardType(runner.grip[i], ["hardware"]))
        return 2;
    }
    return 0;
  },
  AIEconomyInstall: 2,
  AIWorthKeeping: function () {
    for (var i = 0; i < runner.grip.length; i++) {
      if (runner.grip[i] != this && CheckCardType(runner.grip[i], ["hardware"]))
        return true;
    }
    return false;
  },
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
  unique: true,
  credits: 0,
  playedEventThisTurn: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.playedEventThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.playedEventThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnPlay: {
    Resolve: function (card) {
      if (card.player != runner || !CheckCardType(card, ["event"])) return;
      if (this.playedEventThisTurn) return;
      this.playedEventThisTurn = true;
      if (CheckActive(this)) PlaceCredits(this, 1);
    },
    availableWhenInactive: true,
  },
  canUseCredits: function () {
    return attackedServer !== null;
  },
  AIRunPoolCreditOffset: function () {
    return this.credits;
  },
  AIEconomyInstall: 2,
  AIWorthKeeping: function () {
    return true;
  },
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
  hostedCards: [],
  _hostFromGripChoices: function () {
    if (this.hostedCards.length >= 4 || runner.grip.length < 1) return [];
    var choices = ChoicesArrayCards(runner.grip);
    choices.push({ card: null, label: "Decline", button: "Decline" });
    if (runner.AI != null) {
      if (runner.grip.length < 3) return [choices[choices.length - 1]];
      var lowestEloChoice = choices[0];
      for (var i = 1; i < choices.length - 1; i++) {
        if ((choices[i].card.elo || 1500) < (lowestEloChoice.card.elo || 1500))
          lowestEloChoice = choices[i];
      }
      return [lowestEloChoice];
    }
    return choices;
  },
  _hostFromGripResolve: function (params) {
    if (!params || !params.card) return;
    MoveCard(params.card, this.hostedCards);
    params.card.host = this;
    params.card.faceUp = false;
    params.card.notInstalled = true;
    Draw(runner, 1);
  },
  responseOnInstall: {
    Enumerate: function (installedCard) {
      if (installedCard != this) return [];
      return this._hostFromGripChoices();
    },
    Resolve: function (params) {
      this._hostFromGripResolve(params);
    },
    text: "Read-Write Share: host a card from the grip to draw 1 card?",
  },
  responseOnRunnerTurnBegins: {
    Enumerate: function () {
      return this._hostFromGripChoices();
    },
    Resolve: function (params) {
      this._hostFromGripResolve(params);
    },
    text: "Read-Write Share: host a card from the grip to draw 1 card?",
  },
  abilities: [
    {
      text: "[trash]: Shuffle all hosted cards into your stack.",
      Enumerate: function () {
        if (this.hostedCards.length < 1) return [];
        return [{}];
      },
      Resolve: function () {
        var hosted = this.hostedCards.slice();
        for (var i = 0; i < hosted.length; i++) {
          hosted[i].host = null;
          hosted[i].notInstalled = false;
          MoveCard(hosted[i], runner.stack);
        }
        Trash(
          this,
          false,
          function () {
            Shuffle(runner.stack);
          },
          this,
        );
      },
    },
  ],
  AIWorthKeeping: function () {
    return true;
  },
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
  usedThisTurn: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedThisTurn = false;
    },
    automatic: true,
  },
  responseOnPassesIce: {
    Enumerate: function () {
      if (this.usedThisTurn || !attackedServer || approachIce < 0) return [];
      var passedIce = attackedServer.ice[approachIce];
      if (!passedIce || approachIce != attackedServer.ice.length - 1) return [];
      if (!passedIce.subroutines || passedIce.subroutines.length < 1) return [];
      for (var i = 0; i < passedIce.subroutines.length; i++) {
        if (!passedIce.subroutines[i].broken) return [];
      }
      var choices = ChoicesInstalledCards(corp, function (card) {
        return CheckCardType(card, ["ice"]) && card != passedIce;
      });
      var declineChoice = { card: null, label: "Decline", button: "Decline" };
      choices.push(declineChoice);
      if (runner.AI != null) {
        var passedScore = runner.AI._iceComparisonScore(passedIce);
        var bestChoice = declineChoice;
        var bestScore = passedScore;
        for (var j = 0; j < choices.length - 1; j++) {
          var targetScore = runner.AI._iceComparisonScore(choices[j].card);
          if (targetScore < bestScore) {
            bestScore = targetScore;
            bestChoice = choices[j];
          }
        }
        runner.AI.preferred = { title: "Sipa", option: bestChoice };
      }
      return choices;
    },
    Resolve: function (params) {
      this.usedThisTurn = true;
      if (!params || !params.card) return;
      var passedIce = attackedServer.ice[approachIce];
      var passedServer = GetServer(passedIce);
      var otherServer = GetServer(params.card);
      if (!passedServer || !otherServer) return;
      var passedIndex = passedServer.ice.indexOf(passedIce);
      var otherIndex = otherServer.ice.indexOf(params.card);
      var passedRemoteIndex = corp.remoteServers.indexOf(passedServer);
      MoveCard(passedIce, otherServer.ice, otherIndex);
      // Moving the only card out briefly empties a remote, but a swap must not
      // destroy that server before the replacement card moves in.
      if (
        passedRemoteIndex > -1 &&
        corp.remoteServers.indexOf(passedServer) < 0
      )
        corp.remoteServers.splice(passedRemoteIndex, 0, passedServer);
      MoveCard(params.card, passedServer.ice, passedIndex);
      Log(
        GetTitle(this) + " swapped " + GetTitle(passedIce) + " with " +
          GetTitle(params.card),
      );
    },
    text: "Sipa: swap the fully broken outermost ice?",
  },
  AIWorthKeeping: function () {
    return true;
  },
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
  installOnlyOn: function (card) {
    return card.player == corp && CheckCardType(card, ["ice"]);
  },
  responseOnRunSuccessful: {
    Resolve: function (server) {
      if (this.host && GetServer(this.host) == server) GainCredits(runner, 2, "", this);
    },
    automatic: true,
  },
  AIPreferredInstallChoice: function (choices) {
    if (choices.length < 1) return -1;
    var bestIndex = 0;
    var bestIceCount = -1;
    for (var i = 0; i < choices.length; i++) {
      var server = GetServer(choices[i].host);
      var iceCount = server && server.ice ? server.ice.length : 0;
      if (iceCount > bestIceCount) {
        bestIceCount = iceCount;
        bestIndex = i;
      }
    }
    return bestIndex;
  },
  AIRunExtraPotential: function (server) {
    return this.host && GetServer(this.host) == server ? 0.6 : 0;
  },
  AIBreachNotRequired: true,
  AIWorthKeeping: function () {
    return InstalledCards(corp).some(function (card) {
      return CheckCardType(card, ["ice"]);
    });
  },
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
  unique: true,
  corpCardsInstalledThisTurn: [],
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.corpCardsInstalledThisTurn = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.corpCardsInstalledThisTurn = [];
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnInstall: {
    Resolve: function (card) {
      if (card.player == corp && !this.corpCardsInstalledThisTurn.includes(card))
        this.corpCardsInstalledThisTurn.push(card);
    },
    availableWhenInactive: true,
  },
  responsePreventableScore: {
    Resolve: function () {
      if (!intended.score || !this.corpCardsInstalledThisTurn.includes(intended.score))
        return;
      this.agendaPoints = -1;
      this.cannotForfeit = true;
      this.faceUp = true;
      MoveCard(this, corp.scoreArea);
      Log(GetTitle(this) + " was added to the Corp's score area as an agenda worth -1 point");
    },
    automatic: true,
  },
  responseOnScored: {
    Enumerate: function () {
      return [{}];
    },
    Resolve: function () {
      Trash(
        this,
        true,
        function () {
          GainCredits(runner, 4, "", this);
          Draw(runner, 1);
        },
        this,
      );
    },
  },
  AIWorthKeeping: function () {
    return true;
  },
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
  stealCost: { clicks: 1 },
  responseOnScored: {
    Resolve: function () {
      if (intended.score == this) GainClicks(corp, 1);
    },
    automatic: true,
  },
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
  unique: true,
  playedDoubleOperationThisTurn: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.playedDoubleOperationThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.playedDoubleOperationThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  automaticOnPlay: {
    Resolve: function (card) {
      if (
        card.player == corp &&
        CheckCardType(card, ["operation"]) &&
        CheckSubType(card, "Double")
      )
        this.playedDoubleOperationThisTurn = true;
    },
    availableWhenInactive: true,
  },
  modifyPlayClickCost: {
    Resolve: function (card) {
      if (
        !this.playedDoubleOperationThisTurn &&
        card.player == corp &&
        CheckCardType(card, ["operation"]) &&
        CheckSubType(card, "Double")
      )
        return -1;
      return 0;
    },
  },
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.creditPool < this.rezCost) return -1;
    var doubles = corp.HQ.cards.filter(function (card) {
      return CheckCardType(card, ["operation"]) && CheckSubType(card, "Double");
    });
    if (doubles.length < 1) return -1;
    for (var i = 0; i < emptyProtectedRemotes.length; i++) {
      if (!corp.AI._isAScoringServer(emptyProtectedRemotes[i])) return i;
    }
    return emptyProtectedRemotes.length;
  },
  AIAvoidInstallingOverThis: true,
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
  runnerAbilities: [
    {
      text: "Lose [click][click]: Break up to 2 subroutines on this ice.",
      runnerAbility: true,
      Enumerate: function () {
        if (!CheckEncounter() || GetApproachEncounterIce() != this) return [];
        if (!CheckClicks(runner, 2)) return [];
        return ChoicesEncounteredSubroutines();
      },
      Resolve: function (params) {
        LoseClicks(runner, 2);
        Break(params.subroutine);
        var choices = ChoicesEncounteredSubroutines();
        if (choices.length < 1) return;
        choices.push({ id: -1, label: "Done", button: "Done" });
        DecisionPhase(
          runner,
          choices,
          function (choice) {
            if (choice && choice.subroutine) Break(choice.subroutine);
          },
          "Ansel 2.0",
          "Break up to 1 more subroutine",
          this,
        );
      },
    },
  ],
  subroutines: [
    {
      text: "Trash 1 installed Runner card.",
      Resolve: function () {
        var choices = ChoicesInstalledCards(runner, CheckTrash);
        if (choices.length < 1) return;
        if (corp.AI != null) {
          var best = choices[0];
          for (var i = 1; i < choices.length; i++) {
            if ((choices[i].card.elo || 0) > (best.card.elo || 0)) best = choices[i];
          }
          corp.AI.preferred = { title: "Ansel 2.0", option: best };
        }
        DecisionPhase(
          corp,
          choices,
          function (choice) {
            if (choice && choice.card) Trash(choice.card, true);
          },
          "Ansel 2.0",
          "Trash 1 installed Runner card",
          this,
          "trash",
        );
      },
      visual: { y: 103, h: 16 },
    },
    {
      text: "Remove 1 card in the heap from the game.",
      Resolve: function () {
        var choices = ChoicesArrayCards(runner.heap);
        if (choices.length < 1) return;
        if (corp.AI != null) {
          var best = choices[0];
          for (var i = 1; i < choices.length; i++) {
            if ((choices[i].card.elo || 0) > (best.card.elo || 0)) best = choices[i];
          }
          corp.AI.preferred = { title: "Ansel 2.0", option: best };
        }
        DecisionPhase(
          corp,
          choices,
          function (choice) {
            if (choice && choice.card) RemoveFromGame(choice.card);
          },
          "Ansel 2.0",
          "Remove 1 card in the heap from the game",
          this,
        );
      },
      visual: { y: 128, h: 32 },
    },
    {
      text: "You may install 1 card from HQ or Archives.",
      Resolve: function () {
        var handOptions = ChoicesHandInstall(corp);
        var archivesOptions = ChoicesArrayInstall(corp.archives.cards);
        var sourceChoices = [];
        if (handOptions.length > 0)
          sourceChoices.push({ id: 0, label: "Install from HQ", button: "HQ" });
        if (archivesOptions.length > 0)
          sourceChoices.push({ id: 1, label: "Install from Archives", button: "Archives" });
        sourceChoices.push({ id: -1, label: "Do not install", button: "Continue" });
        var ansel = this;
        if (corp.AI != null && typeof corp.AI._bestInstallOption === "function") {
          var archiveIndex = corp.AI._bestInstallOption(archivesOptions, false);
          var handIndex = corp.AI._bestInstallOption(handOptions, true);
          var preferred = sourceChoices[sourceChoices.length - 1];
          if (archiveIndex > -1)
            preferred = sourceChoices.find(function (choice) { return choice.id === 1; });
          else if (handIndex > -1)
            preferred = sourceChoices.find(function (choice) { return choice.id === 0; });
          corp.AI.preferred = { title: "Ansel 2.0", option: preferred };
        }
        DecisionPhase(
          corp,
          sourceChoices,
          function (source) {
            if (!source || source.id < 0) return;
            var installChoices = source.id === 0 ? handOptions : archivesOptions;
            DecisionPhase(
              corp,
              installChoices,
              function (choice) {
                if (choice && choice.card) Install(choice.card, choice.server);
              },
              "Ansel 2.0",
              "Choose a card to install",
              ansel,
              "install",
            );
          },
          "Ansel 2.0",
          "You may install 1 card from HQ or Archives",
          this,
        );
      },
      visual: { y: 159, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 182, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    var installed = ChoicesInstalledCards(runner);
    var programs = ChoicesInstalledCards(runner, function (card) {
      return CheckCardType(card, ["program"]);
    });
    result.sr = [
      installed.length < 1
        ? [[]]
        : programs.length > 0
          ? [["misc_serious"]]
          : [["misc_moderate"]],
      runner.heap.length > 0 ? [["misc_moderate"]] : [[]],
      corp.HQ.cards.length + corp.archives.cards.length > 0
        ? [["misc_moderate"]]
        : [[]],
      [["endTheRun"]],
    ];
    return result;
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
  ) {
    if (this == iceAI.ice && clicksLeft >= 2) {
      var breakresult = rc.SrBreak(this, iceAI, point, 2);
      for (var i = 0; i < breakresult.length; i++)
        breakresult[i].runner_clicks_spent += 2;
      result = result.concat(breakresult);
    }
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
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 94, h: 16 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 114, h: 16 },
    },
  ],
  modifyRezCost: {
    Resolve: function (card) {
      if (card != this) return 0;
      var otherUnrezzedIce = ChoicesInstalledCards(corp, function (installedCard) {
        return (
          installedCard != card &&
          CheckCardType(installedCard, ["ice"]) &&
          !installedCard.rezzed
        );
      });
      return -otherUnrezzedIce.length;
    },
    availableWhenInactive: true,
  },
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]], [["endTheRun"]]];
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
    {
      text: "You may draw 1 card.",
      Resolve: function () {
        var choices = [{ id: 0, label: "Do not draw", button: "Continue" }];
        if (corp.RnD.cards.length > 0)
          choices.unshift({ id: 1, label: "Draw 1 card", button: "Draw" });
        if (corp.AI != null)
          corp.AI.preferred = { title: "Sleipnir", option: choices[0] };
        DecisionPhase(
          corp,
          choices,
          function (choice) {
            if (choice && choice.id === 1) Draw(corp, 1);
          },
          "Sleipnir",
          "You may draw 1 card",
          this,
        );
      },
      visual: { y: 60, h: 16 },
    },
    {
      text: "You may shuffle 1 card from HQ or Archives into R&D.",
      Resolve: function () {
        var choices = ChoicesArrayCards(corp.HQ.cards.concat(corp.archives.cards));
        choices.push({ card: null, label: "Do not shuffle a card", button: "Continue" });
        if (corp.AI != null) {
          var preferred = choices[choices.length - 1];
          for (var i = 0; i < choices.length - 1; i++) {
            if (
              choices[i].card.cardLocation == corp.archives.cards &&
              (!preferred.card || (choices[i].card.elo || 0) > (preferred.card.elo || 0))
            )
              preferred = choices[i];
          }
          corp.AI.preferred = { title: "Sleipnir", option: preferred };
        }
        DecisionPhase(
          corp,
          choices,
          function (choice) {
            if (!choice || !choice.card) return;
            MoveCard(choice.card, corp.RnD.cards);
            Shuffle(corp.RnD.cards);
          },
          "Sleipnir",
          "You may shuffle 1 card from HQ or Archives into R&D",
          this,
        );
      },
      visual: { y: 87, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 114, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      corp.RnD.cards.length > 0 ? [["misc_minor"]] : [[]],
      corp.HQ.cards.length + corp.archives.cards.length > 0
        ? [["misc_moderate"]]
        : [[]],
      [["endTheRun"]],
    ];
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
  responseOnPassesIce: {
    Resolve: function () {
      if (
        !attackedServer ||
        approachIce < 0 ||
        attackedServer.ice[approachIce] != this ||
        runner.clickTracker > 0
      )
        return;
      AddLingeringEffect({
        modifyCannot: {
          Resolve: function (id, card) {
            return (
              card &&
              card.player == corp &&
              (id == "steal" || id == "trash")
            );
          },
        },
        responseOnRunEnds: {
          Resolve: function () {
            RemoveLingeringEffect(this);
          },
          automatic: true,
        },
      });
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "The Runner loses [click].",
      Resolve: function () {
        LoseClicks(runner, 1);
      },
      visual: { y: 57, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseClicks", "iceSpecificEffect"]]];
    return result;
  },
  AIIceSpecificEffect: function (poolCreditsLeft, otherCreditsLeft, clicksLeft) {
    if (clicksLeft < 1) return ["misc_serious"];
    return [];
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
  Enumerate: function () {
    var choices = [
      {
        credits: 6,
        clicks: -1,
        label: "Gain 6[c]; Runner gets -1 allotted click next turn",
        button: "Gain 6[c]",
      },
      {
        credits: 10,
        clicks: 1,
        label: "Gain 10[c]; Runner gets +1 allotted click next turn",
        button: "Gain 10[c]",
      },
    ];
    if (corp.AI != null) {
      var preferred = choices[1];
      if (
        typeof AgendaPoints == "function" &&
        typeof AgendaPointsToWin == "function" &&
        AgendaPoints(runner) >= AgendaPointsToWin() - 1
      )
        preferred = choices[0];
      return [preferred];
    }
    return choices;
  },
  Resolve: function (params) {
    GainCredits(corp, params.credits, "", this);
    AddTempBonusClicks(runner, params.clicks);
  },
  AIEconomyPlay: 2,
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
  Enumerate: function () {
    var iceChoices = ChoicesInstalledCards(corp, function (card) {
      return card.rezzed && CheckCardType(card, ["ice"]);
    });
    var pairs = [];
    for (var i = 0; i < iceChoices.length; i++) {
      for (var j = i + 1; j < iceChoices.length; j++) {
        pairs.push({
          cards: [iceChoices[i].card, iceChoices[j].card],
          label:
            GetTitle(iceChoices[i].card) +
            " and " +
            GetTitle(iceChoices[j].card),
        });
      }
    }
    if (corp.AI != null && pairs.length > 0) {
      var best = pairs[0];
      var bestValue = -Infinity;
      for (var k = 0; k < pairs.length; k++) {
        var value =
          (pairs[k].cards[0].rezCost || 0) +
          (pairs[k].cards[1].rezCost || 0);
        if (typeof corp.AI._cardProtectionValue == "function") {
          value -= 0.5 * corp.AI._cardProtectionValue(pairs[k].cards[0]);
          value -= 0.5 * corp.AI._cardProtectionValue(pairs[k].cards[1]);
        }
        if (value > bestValue) {
          bestValue = value;
          best = pairs[k];
        }
      }
      if (bestValue < 3) return [];
      return [best];
    }
    return pairs;
  },
  Resolve: function (params) {
    if (!params || !params.cards || params.cards.length != 2) return;
    for (var i = 0; i < params.cards.length; i++) {
      GainCredits(corp, params.cards[i].rezCost || 0, "", this);
      Derez(params.cards[i]);
    }
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  AIEconomyPlay: 1,
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
  Enumerate: function () {
    var choices = ChoicesArrayInstall(
      corp.archives.cards,
      false,
      function (card) {
        return CheckCardType(card, ["agenda", "asset", "ice"]);
      },
    );
    if (
      corp.AI != null &&
      choices.length > 0 &&
      typeof corp.AI._bestInstallOption == "function"
    ) {
      var bestIndex = corp.AI._bestInstallOption(choices, true);
      if (bestIndex < 0) return [];
      return [choices[bestIndex]];
    }
    return choices;
  },
  Resolve: function (params) {
    if (params && params.card) Install(params.card, params.server);
  },
  command: "install",
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  AIPlayWhenCan: 1,
  AIIsRecurOrTutor: true,
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
  _scoringServer: null,
  responseOnRez: {
    Resolve: function () {
      AddCounters(this, "power", 1);
    },
    automatic: true,
  },
  responsePreventableScore: {
    Resolve: function () {
      this._scoringServer = intended.score ? GetServer(intended.score) : null;
    },
    automatic: true,
  },
  responseOnScored: {
    Resolve: function () {
      if (this._scoringServer && this._scoringServer == GetServer(this))
        AddCounters(this, "power", 1);
      this._scoringServer = null;
    },
    automatic: true,
  },
  responseOnStolen: {
    Resolve: function () {
      if (attackedServer && attackedServer == GetServer(this))
        AddCounters(this, "power", 1);
    },
    automatic: true,
  },
  abilities: [
    {
      text: "Hosted power counter: Reveal 1 card in HQ and protect copies for this run.",
      Enumerate: function () {
        if (!attackedServer || !CheckCounters(this, "power", 1)) return [];
        var choices = ChoicesArrayCards(corp.HQ.cards);
        if (corp.AI != null) {
          var cardsAtRisk = attackedServer.root.concat(attackedServer.cards || []);
          var best = null;
          var bestScore = 0;
          for (var i = 0; i < choices.length; i++) {
            var score = 0;
            if (attackedServer == corp.HQ) score += 1;
            for (var j = 0; j < cardsAtRisk.length; j++) {
              if (GetTitle(cardsAtRisk[j]) == GetTitle(choices[i].card))
                score += 20;
            }
            if (CheckCardType(choices[i].card, ["agenda"]))
              score += 10 + (choices[i].card.agendaPoints || 0);
            else score += choices[i].card.trashCost || 0;
            if (score > bestScore) {
              bestScore = score;
              best = choices[i];
            }
          }
          if (!best || bestScore < 1) return [];
          return [best];
        }
        return choices;
      },
      Resolve: function (params) {
        if (!params || !params.card) return;
        RemoveCounters(this, "power", 1);
        var protectedTitle = GetTitle(params.card);
        Reveal(
          params.card,
          function () {
            if (runner.AI != null && typeof runner.AI.GainInfoAboutHQCards == "function")
              runner.AI.GainInfoAboutHQCards([params.card]);
            AddLingeringEffect({
              titleToProtect: protectedTitle,
              modifyCannot: {
                Resolve: function (id, card) {
                  return (
                    card &&
                    card.player == corp &&
                    GetTitle(card) == this.titleToProtect &&
                    (id == "steal" || id == "trash")
                  );
                },
              },
              responseOnRunEnds: {
                Resolve: function () {
                  RemoveLingeringEffect(this);
                },
                automatic: true,
              },
            });
          },
          this,
        );
      },
    },
  ],
  AIIsScoringUpgrade: true,
  AIDefensiveValue: function (server) {
    if (!server || corp.HQ.cards.length < 1) return 0;
    return 2;
  },
  AILimitPerServer: function () {
    return 1;
  },
  AIWouldRezBeforeScore: function (cardToScore, serverToScoreIn) {
    return serverToScoreIn == GetServer(this) || GetServer(cardToScore) == GetServer(this);
  },
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
  department: "HQ",
  flipped: false,
  _departmentChoices: function () {
    return [
      { department: "HQ", label: "Tenure Floors (HQ)" },
      { department: "R&D", label: "Subsurface Labs (R&D)" },
      { department: "Archives", label: "Disposal Grounds (Archives)" },
    ];
  },
  _serverForDepartment: function (department) {
    if (department == "HQ") return corp.HQ;
    if (department == "R&D") return corp.RnD;
    return corp.archives;
  },
  _departmentForServer: function (server) {
    if (server == corp.HQ) return "HQ";
    if (server == corp.RnD) return "R&D";
    if (server == corp.archives) return "Archives";
    return null;
  },
  _departmentTitle: function () {
    if (this.department == "HQ") return "Tenure Floors";
    if (this.department == "R&D") return "Subsurface Labs";
    return "Disposal Grounds";
  },
  _departmentImageFile: function () {
    if (this.department == "HQ") return "36036-0.webp";
    if (this.department == "R&D") return "36036-1.webp";
    return "36036-2.webp";
  },
  _showIdentityFace: function (imageFile) {
    this.imageFile = imageFile;
    if (
      typeof this.renderer !== "undefined" &&
      typeof cardRenderer !== "undefined"
    ) {
      var texture = cardRenderer.LoadTexture(
        "images/" + ChangeImageFileToJPG(imageFile),
      );
      this.renderer.frontTexture = texture;
      this.renderer.loresTexture = texture;
      if (this.renderer.dummy) this.renderer.dummy.texture = texture;
      if (typeof this.renderer.SetTextureToFront == "function")
        this.renderer.SetTextureToFront();
    }
  },
  _setDepartment: function (department) {
    this.department = department;
    this.flipped = false;
    this.subTypes = ["Division"];
    this._showIdentityFace("36036.png");
  },
  _flipToDepartment: function () {
    this.flipped = true;
    this.subTypes = ["Department"];
    this._showIdentityFace(this._departmentImageFile());
    Log(GetTitle(this) + " flipped to " + this._departmentTitle());
  },
  _flipToFront: function () {
    this.flipped = false;
    this.subTypes = ["Division"];
    this._showIdentityFace("36036.png");
    Log(GetTitle(this) + " flipped to its front side");
  },
  _bestArchiveCard: function () {
    if (corp.archives.cards.length < 1) return null;
    var choices = ChoicesArrayCards(corp.archives.cards);
    if (corp.AI && typeof corp.AI._bestRecurToHQOption == "function") {
      var preferred = corp.AI._bestRecurToHQOption(choices, corp.archives, true);
      if (preferred) return preferred.card;
    }
    var best = corp.archives.cards[0];
    for (var i = 1; i < corp.archives.cards.length; i++) {
      if ((corp.archives.cards[i].elo || 0) > (best.elo || 0))
        best = corp.archives.cards[i];
    }
    return best;
  },
  _resolveDepartmentEffect: function () {
    if (corp.RnD.cards.length < 1) return;
    var topCard = corp.RnD.cards[corp.RnD.cards.length - 1];
    var trashChoice = {
      id: 1,
      label: "Trash " + GetTitle(topCard),
      button: "Trash",
    };
    var keepChoice = { id: 0, label: "Keep the card", button: "Keep" };
    var choices = [trashChoice, keepChoice];
    if (corp.AI) {
      var archiveCard = this._bestArchiveCard();
      var topValue = topCard.elo || 1500;
      var archiveValue = archiveCard ? archiveCard.elo || 1500 : 0;
      corp.AI.preferred = {
        title: this.title,
        option: archiveCard && archiveValue > topValue ? trashChoice : keepChoice,
      };
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (!params || params.id !== 1) return;
        Trash(
          topCard,
          true,
          function (cardsTrashed) {
            if (!cardsTrashed || !cardsTrashed.includes(topCard)) return;
            if (corp.archives.cards.length < 1) return;
            var archiveChoices = ChoicesArrayCards(corp.archives.cards);
            if (corp.AI) {
              var preferredCard = this._bestArchiveCard();
              for (var i = 0; i < archiveChoices.length; i++) {
                if (archiveChoices[i].card == preferredCard) {
                  corp.AI.preferred = { title: this.title, option: archiveChoices[i] };
                  break;
                }
              }
            }
            DecisionPhase(
              corp,
              archiveChoices,
              function (archiveParams) {
                if (!archiveParams || !archiveParams.card) return;
                MoveCard(archiveParams.card, corp.HQ.cards);
                Log(GetTitle(archiveParams.card) + " added from Archives to HQ");
              },
              this._departmentTitle(),
              "Choose a card in Archives to add to HQ",
              this,
            );
          },
          this,
        );
      },
      this._departmentTitle(),
      "Look at the top card of R&D: " + GetTitle(topCard),
      this,
    );
  },
  responseOnCorpDiscardEnds: {
    Enumerate: function () {
      if (this.flipped) return [];
      var choices = this._departmentChoices();
      if (corp.AI) {
        var preferred = choices[0];
        var fewestIce = corp.HQ.ice.length;
        for (var i = 1; i < choices.length; i++) {
          var server = this._serverForDepartment(choices[i].department);
          if (server.ice.length < fewestIce) {
            preferred = choices[i];
            fewestIce = server.ice.length;
          }
        }
        corp.AI.preferred = { title: this.title, option: preferred };
      }
      return choices;
    },
    Resolve: function (params) {
      if (params && params.department) this._setDepartment(params.department);
    },
    text: "Secretly set Méliès U",
  },
  responseOnRunSuccessful: {
    Enumerate: function (server) {
      if (!this.flipped && this._departmentForServer(server || attackedServer))
        return [{}];
      return [];
    },
    Resolve: function (server) {
      var successfulServer = this._departmentForServer(server) ? server : attackedServer;
      if (!this._departmentForServer(successfulServer)) return;
      this._flipToDepartment();
      if (this.department == this._departmentForServer(successfulServer))
        this._resolveDepartmentEffect();
    },
  },
  responseOnRunnerActionPhaseEnds: {
    Resolve: function () {
      if (!this.flipped) GainCredits(corp, 1, "", this);
    },
    automatic: true,
  },
  responseOnRunnerDiscardEnds: {
    Resolve: function () {
      if (this.flipped) this._flipToFront();
    },
    automatic: true,
  },
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
  responseOnScored: {
    Resolve: function () {
      if (intended.score == this) AddCounters(this, "agenda", 3);
    },
    automatic: true,
  },
  _destinationChoices: function (upgrade) {
    var source = GetServer(upgrade);
    var choices = ChoicesExistingServers();
    for (var i = choices.length - 1; i > -1; i--) {
      var server = choices[i].server;
      var legal = server != source;
      if (legal && CheckSubType(upgrade, "Region")) {
        for (var j = 0; j < server.root.length; j++) {
          if (CheckSubType(server.root[j], "Region")) {
            legal = false;
            break;
          }
        }
      }
      if (!legal) choices.splice(i, 1);
    }
    return choices;
  },
  _upgradeChoices: function () {
    var cardDef = this;
    return ChoicesInstalledCards(corp, function (card) {
      return (
        card.rezzed &&
        CheckCardType(card, ["upgrade"]) &&
        cardDef._destinationChoices(card).length > 0
      );
    });
  },
  _aiDestinationScore: function (upgrade, server) {
    var score = server.ice.length;
    if (server.root) {
      for (var i = 0; i < server.root.length; i++) {
        if (CheckCardType(server.root[i], ["agenda"])) score += 4;
      }
    }
    if (
      corp.AI &&
      typeof upgrade.AIDefensiveValue == "function"
    )
      score += upgrade.AIDefensiveValue.call(upgrade, server) || 0;
    return score;
  },
  abilities: [
    {
      text: "Hosted agenda counter: Move 1 rezzed upgrade to another server.",
      Enumerate: function () {
        if (!CheckCounters(this, "agenda", 1)) return [];
        var choices = this._upgradeChoices();
        if (corp.AI && choices.length > 0) {
          var bestChoice = choices[0];
          var bestGain = -Infinity;
          for (var i = 0; i < choices.length; i++) {
            var source = GetServer(choices[i].card);
            var sourceScore = this._aiDestinationScore(choices[i].card, source);
            var destinations = this._destinationChoices(choices[i].card);
            for (var j = 0; j < destinations.length; j++) {
              var gain =
                this._aiDestinationScore(choices[i].card, destinations[j].server) -
                sourceScore;
              if (gain > bestGain) {
                bestGain = gain;
                bestChoice = choices[i];
              }
            }
          }
          if (bestGain <= 0) return [];
          return [bestChoice];
        }
        return choices;
      },
      Resolve: function (params) {
        if (!params || !params.card) return;
        var upgrade = params.card;
        var choices = this._destinationChoices(upgrade);
        if (choices.length < 1) return;
        if (corp.AI) {
          var best = choices[0];
          var bestScore = this._aiDestinationScore(upgrade, best.server);
          for (var i = 1; i < choices.length; i++) {
            var score = this._aiDestinationScore(upgrade, choices[i].server);
            if (score > bestScore) {
              best = choices[i];
              bestScore = score;
            }
          }
          corp.AI.preferred = { title: this.title, option: best };
        }
        DecisionPhase(
          corp,
          choices,
          function (serverParams) {
            if (!serverParams || !serverParams.server) return;
            RemoveCounters(this, "agenda", 1);
            MoveCard(upgrade, serverParams.server.root);
            Log(GetTitle(upgrade) + " moved to the root of " + ServerName(serverParams.server));
          },
          this.title,
          "Choose another server",
          this,
        );
      },
    },
  ],
  AITriggerWhenCan: true,
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
  storedFaceUp: false,
  _resolveAccessEffect: function () {
    LoseCredits(runner, 1);
    if (CheckTags(1)) Damage("net", 1, true);
  },
  automaticOnAccess: {
    Resolve: function (card) {
      if (card != this) return;
      this.storedFaceUp = this.faceUp;
      if (this.cardLocation == corp.RnD.cards) {
        this.faceUp = true;
        this.knownToRunner = true;
        Log(GetTitle(this) + " revealed");
      }
      this._resolveAccessEffect();
    },
  },
  automaticOnAccessComplete: {
    Resolve: function (card) {
      if (
        card == this &&
        card.cardLocation != corp.archives.cards &&
        !this.storedFaceUp
      )
        this.faceUp = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  AIPunishesAccess: function (server) {
    if (!server) return 0;
    var installedHere = server.root && server.root.includes(this);
    var inCentral = server.cards && server.cards.includes(this);
    if (!installedHere && !inCentral) return 0;
    return CheckTags(1) ? 2 : 1;
  },
  AIAvoidInstallingOverThis: true,
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
  _swapWith: function (otherIce) {
    var firstServer = GetServer(this);
    var secondServer = GetServer(otherIce);
    if (!firstServer || !secondServer || otherIce == this) return;
    var firstIndex = firstServer.ice.indexOf(this);
    var secondIndex = secondServer.ice.indexOf(otherIce);
    var firstRemoteIndex = corp.remoteServers.indexOf(firstServer);
    MoveCard(this, secondServer.ice, secondIndex);
    if (
      firstRemoteIndex > -1 &&
      corp.remoteServers.indexOf(firstServer) < 0
    )
      corp.remoteServers.splice(firstRemoteIndex, 0, firstServer);
    MoveCard(otherIce, firstServer.ice, firstIndex);
    Log(GetTitle(this) + " swapped with " + GetTitle(otherIce));
  },
  abilities: [
    {
      text: "[click]: Swap this ice with another installed piece of ice.",
      Enumerate: function () {
        if (!CheckActionClicks(corp, 1)) return [];
        var choices = ChoicesInstalledCards(corp, function (card) {
          return CheckCardType(card, ["ice"]) && card != this;
        }.bind(this));
        if (corp.AI && choices.length > 0) {
          var currentServer = GetServer(this);
          var best = null;
          var bestGain = 0;
          for (var i = 0; i < choices.length; i++) {
            var otherServer = GetServer(choices[i].card);
            if (!currentServer || !otherServer) continue;
            var gain = otherServer.ice.length - currentServer.ice.length;
            if (gain > bestGain) {
              bestGain = gain;
              best = choices[i];
            }
          }
          return best ? [best] : [];
        }
        return choices;
      },
      Resolve: function (params) {
        if (!params || !params.card) return;
        SpendClicks(corp, 1);
        this._swapWith(params.card);
      },
    },
  ],
  subroutines: [
    {
      text: "Look at the top card of R&D. You may add that card to the bottom of R&D.",
      Resolve: function () {
        if (corp.RnD.cards.length < 1) return;
        var topCard = corp.RnD.cards[corp.RnD.cards.length - 1];
        var bottomChoice = {
          id: 1,
          label: "Add " + GetTitle(topCard) + " to the bottom of R&D",
          button: "Move to bottom",
        };
        var keepChoice = { id: 0, label: "Leave it on top", button: "Keep" };
        var choices = [bottomChoice, keepChoice];
        if (corp.AI) {
          var moveToBottom = CheckCardType(topCard, ["agenda"]);
          corp.AI.preferred = {
            title: this.title,
            option: moveToBottom ? bottomChoice : keepChoice,
          };
        }
        DecisionPhase(
          corp,
          choices,
          function (params) {
            if (params && params.id === 1) {
              MoveCard(topCard, corp.RnD.cards, 0);
              Log("The top card of R&D was added to the bottom of R&D");
            }
          },
          this.title,
          "Look at the top card of R&D: " + GetTitle(topCard),
          this,
        );
      },
      visual: { y: 73, h: 32 },
    },
    {
      text: "Each piece of ice gets +1 strength for the remainder of this run.",
      Resolve: function () {
        var affectedIce = ChoicesInstalledCards(corp, function (card) {
          return CheckCardType(card, ["ice"]);
        }).map(function (choice) {
          return choice.card;
        });
        var effect = {
          affectedIce: affectedIce,
          createdDuringRun: attackedServer != null,
          modifyStrength: {
            Resolve: function (card) {
              return this.affectedIce.includes(card) ? 1 : 0;
            },
          },
          responseOnRunEnds: {
            Resolve: function () {
              RemoveLingeringEffect(this);
            },
            automatic: true,
          },
          responseOnEncounterEnds: {
            Resolve: function () {
              if (!this.createdDuringRun) RemoveLingeringEffect(this);
            },
            automatic: true,
          },
        };
        AddLingeringEffect(effect);
      },
      visual: { y: 105, h: 32 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["misc_minor"]], [["strengthenAllIce"]]];
    return result;
  },
  AITriggerWhenCan: true,
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
  _cardValueForRnD: function (card) {
    var value = card.elo || 1500;
    if (CheckCardType(card, ["agenda"])) value += 300;
    return value;
  },
  _applyRnDOrder: function (bottomToTop) {
    for (var i = 0; i < bottomToTop.length; i++) {
      bottomToTop[i].faceUp = false;
      MoveCard(bottomToTop[i], corp.RnD.cards);
    }
    Log(bottomToTop.length + " cards on top of R&D were arranged");
  },
  _arrangeTopOfRnD: function () {
    var count = Math.min(4, corp.RnD.cards.length);
    if (count < 2) return;
    var cards = corp.RnD.cards.slice(corp.RnD.cards.length - count);
    for (var i = 0; i < cards.length; i++) cards[i].faceUp = true;
    if (corp.AI) {
      var cardDef = this;
      cards.sort(function (a, b) {
        return cardDef._cardValueForRnD(a) - cardDef._cardValueForRnD(b);
      });
      this._applyRnDOrder(cards);
      return;
    }
    var ordered = [];
    var remaining = cards.slice();
    var chooseNext = function () {
      if (remaining.length == 1) {
        ordered.push(remaining[0]);
        this._applyRnDOrder(ordered);
        return;
      }
      var choices = ChoicesArrayCards(remaining);
      DecisionPhase(
        corp,
        choices,
        function (params) {
          if (!params || !params.card || !remaining.includes(params.card)) return;
          ordered.push(params.card);
          remaining.splice(remaining.indexOf(params.card), 1);
          chooseNext.call(this);
        },
        this.title,
        "Choose the next card from the bottom of the arranged group",
        this,
      );
    };
    chooseNext.call(this);
  },
  responseOnEncounterEnds: {
    Enumerate: function () {
      if (CheckCounters(this, "virus", 3)) return [{}];
      return [];
    },
    Resolve: function () {
      Purge(
        function () {
          Derez(this);
        },
        this,
      );
    },
    text: "Purge virus counters and derez Knowledge Seeker",
  },
  subroutines: [
    {
      text: "Place 1 virus counter on this ice.",
      Resolve: function () {
        AddCounters(this, "virus", 1);
      },
      visual: { y: 57, h: 16 },
    },
    {
      text: "Look at the top 4 cards of R&D and arrange them in any order.",
      Resolve: function () {
        this._arrangeTopOfRnD();
      },
      visual: { y: 73, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 105, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      [[CheckCounters(this, "virus", 2) ? "misc_moderate" : "misc_minor"]],
      [["misc_minor"]],
      [["endTheRun"]],
    ];
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
    {
      text: "Do 2 net damage.",
      Resolve: function () {
        Damage("net", 2, true);
      },
      visual: { y: 57, h: 16 },
    },
    {
      text: "Do 2 net damage unless the Runner pays 3[c].",
      Resolve: function () {
        var choices = [];
        if (CheckCredits(runner, 3, "using", this))
          choices.push({ id: 1, label: "Pay 3[c]", button: "Pay 3[c]" });
        choices.push({ id: 0, label: "Take 2 net damage", button: "Take damage" });
        DecisionPhase(
          runner,
          choices,
          function (params) {
            if (params && params.id == 1)
              SpendCredits(runner, 3, "using", this);
            else Damage("net", 2, true);
          },
          this.title,
          "Pay 3[c] to avoid 2 net damage?",
          this,
        );
      },
      visual: { y: 73, h: 32 },
    },
    {
      text: "Do 2 net damage unless the Runner jacks out.",
      Resolve: function () {
        if (!CheckRunning()) {
          Damage("net", 2, true);
          return;
        }
        DecisionPhase(
          runner,
          [
            { id: 1, label: "Jack out", button: "Jack out" },
            { id: 0, label: "Take 2 net damage", button: "Take damage" },
          ],
          function (params) {
            if (params && params.id == 1) JackOut();
            else Damage("net", 2, true);
          },
          this.title,
          "Jack out to avoid 2 net damage?",
          this,
        );
      },
      visual: { y: 105, h: 32 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      [["netDamage", "netDamage"]],
      [
        ["payCredits", "payCredits", "payCredits"],
        ["netDamage", "netDamage"],
      ],
      [["endTheRun"], ["netDamage", "netDamage"]],
    ];
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
    {
      text: "Do X net damage and give the Runner X tags. X is equal to the number of tags the Runner has.",
      Resolve: function () {
        var tagCount = runner.tags;
        if (tagCount < 1) return;
        Damage(
          "net",
          tagCount,
          true,
          function () {
            AddTags(tagCount);
          },
          this,
        );
      },
      visual: { y: 57, h: 48 },
    },
    {
      text: "Give the Runner 1 tag. Trash this ice.",
      Resolve: function () {
        AddTags(
          1,
          function () {
            Trash(this, false);
          },
          this,
        );
      },
      visual: { y: 105, h: 32 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    var effects = [];
    for (var i = 0; i < runner.tags; i++) effects.push("netDamage");
    for (var j = 0; j < runner.tags; j++) effects.push("tag");
    result.sr = [[effects], [["tag"]]];
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
  _cardValueForRnD: function (card) {
    var value = card.elo || 1500;
    if (CheckCardType(card, ["agenda"])) value += 300;
    return value;
  },
  _finishArrangement: function (bottomToTop) {
    for (var i = 0; i < bottomToTop.length; i++) {
      bottomToTop[i].faceUp = false;
      MoveCard(bottomToTop[i], corp.RnD.cards);
    }
    Log(bottomToTop.length + " cards on top of R&D were arranged");
  },
  _arrangeRemaining: function (cards) {
    if (cards.length < 2) {
      if (cards.length == 1) this._finishArrangement(cards);
      return;
    }
    if (corp.AI) {
      var cardDef = this;
      cards.sort(function (a, b) {
        return cardDef._cardValueForRnD(a) - cardDef._cardValueForRnD(b);
      });
      this._finishArrangement(cards);
      return;
    }
    var ordered = [];
    var remaining = cards.slice();
    var chooseNext = function () {
      if (remaining.length == 1) {
        ordered.push(remaining[0]);
        this._finishArrangement(ordered);
        return;
      }
      DecisionPhase(
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
        this,
      );
    };
    chooseNext.call(this);
  },
  _chooseForHQ: function (cards) {
    if (cards.length < 1) return;
    var choices = ChoicesArrayCards(cards);
    if (corp.AI) {
      var cardDef = this;
      choices.sort(function (a, b) {
        return cardDef._cardValueForRnD(b.card) - cardDef._cardValueForRnD(a.card);
      });
      choices = [choices[0]];
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (!params || !params.card || !cards.includes(params.card)) return;
        var remaining = cards.filter(function (card) {
          return card != params.card;
        });
        params.card.faceUp = false;
        MoveCard(params.card, corp.HQ.cards);
        this._arrangeRemaining(remaining);
      },
      this.title,
      "Choose 1 card to add to HQ",
      this,
    );
  },
  Enumerate: function () {
    if (corp.RnD.cards.length < 1) return [];
    return [{}];
  },
  Resolve: function () {
    var count = Math.min(5, corp.RnD.cards.length);
    var cards = corp.RnD.cards.slice(corp.RnD.cards.length - count);
    for (var i = 0; i < cards.length; i++) cards[i].faceUp = true;
    var choices = ChoicesArrayCards(cards);
    if (corp.AI) {
      var cardDef = this;
      choices.sort(function (a, b) {
        return cardDef._cardValueForRnD(a.card) - cardDef._cardValueForRnD(b.card);
      });
      choices = [choices[0]];
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (!params || !params.card || !cards.includes(params.card)) return;
        var remaining = cards.filter(function (card) {
          return card != params.card;
        });
        params.card.faceUp = false;
        Trash(
          params.card,
          false,
          function () {
            this._chooseForHQ(remaining);
          },
          this,
        );
      },
      this.title,
      "Choose 1 card to trash",
      this,
    );
  },
  AIWouldPlay: function () {
    return corp.RnD.cards.length > 1;
  },
  AIPlayWhenCan: 1,
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
  _subroutineThreatScore: function (subroutine) {
    var text = subroutine && subroutine.text ? subroutine.text : "";
    var score = 1;
    if (/end the run/i.test(text)) score += 100;
    if (/net damage/i.test(text)) {
      var match = text.match(/([0-9]+) net damage/i);
      score += 20 * (match ? Number(match[1]) : 1);
    }
    if (/tag/i.test(text)) score += 15;
    if (/trash/i.test(text)) score += 20;
    return score;
  },
  _offerSubroutine: function (ice) {
    if (!ice || !ice.rezzed || !ice.subroutines || ice.subroutines.length < 1)
      return;
    var choices = ice.subroutines.map(function (subroutine) {
      return { card: ice, subroutine: subroutine, label: subroutine.text };
    });
    if (corp.AI) {
      var cardDef = this;
      choices.sort(function (a, b) {
        return (
          cardDef._subroutineThreatScore(b.subroutine) -
          cardDef._subroutineThreatScore(a.subroutine)
        );
      });
      choices = [choices[0]];
    } else {
      choices.push({ decline: true, label: "Decline", button: "Decline" });
    }
    DecisionPhase(
      corp,
      choices,
      function (params) {
        if (!params || params.decline || !params.subroutine) return;
        var subroutineChoices = ChoicesSubroutine(params.card, params.subroutine);
        if (!subroutineChoices || subroutineChoices.length < 1) return;
        DecisionPhase(
          corp,
          subroutineChoices,
          function (subParams) {
            AutomaticTriggers("automaticOnSubroutineFiring", [
              subParams.card,
              subParams.ability,
            ]);
            Trigger(
              subParams.card,
              subParams.ability,
              subParams.choice,
              "Firing",
            );
          },
          params.card.title,
          "Choose option for: " + params.subroutine.text,
          params.card,
        );
      },
      this.title,
      "Choose a subroutine to resolve",
      this,
    );
  },
  Enumerate: function () {
    if (runner.tags < 1) return [];
    var choices = ChoicesInstalledCards(corp, function (card) {
      return (
        CheckCardType(card, ["ice"]) &&
        !card.rezzed
      );
    });
    if (corp.AI && choices.length > 0) {
      var cardDef = this;
      choices.sort(function (a, b) {
        var aBest = 0;
        var bBest = 0;
        var aSubs = a.card.subroutines || [];
        var bSubs = b.card.subroutines || [];
        for (var i = 0; i < aSubs.length; i++)
          aBest = Math.max(
            aBest,
            cardDef._subroutineThreatScore(aSubs[i]),
          );
        for (var j = 0; j < bSubs.length; j++)
          bBest = Math.max(
            bBest,
            cardDef._subroutineThreatScore(bSubs[j]),
          );
        return (
          (b.card.rezCost || 0) + bBest - ((a.card.rezCost || 0) + aBest)
        );
      });
      return [choices[0]];
    }
    return choices;
  },
  Resolve: function (params) {
    if (!params || !params.card || runner.tags < 1 || params.card.rezzed) return;
    RemoveTags(1);
    var source = this;
    var target = params.card;
    Rez(
      target,
      true,
      null,
      source,
      true,
      0,
      function () {
        this._offerSubroutine(target);
      },
    );
  },
  AIWouldPlay: function () {
    return this.Enumerate().length > 0;
  },
  AITagPunishment: 1,
  AIPlayWhenCan: 2,
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
  unique: true,
  triggeredThisTurn: false,
  installOnlyIn: function (server) {
    return server == corp.HQ || server == corp.RnD || server == corp.archives;
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.triggeredThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.triggeredThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  _placePowerCounter: function () {
    if (this.triggeredThisTurn) return;
    this.triggeredThisTurn = true;
    AddCounters(this, "power", 1);
  },
  responseOnScored: {
    Resolve: function () {
      this._placePowerCounter();
    },
    automatic: true,
  },
  responseOnStolen: {
    Resolve: function () {
      this._placePowerCounter();
    },
    automatic: true,
  },
  _AIShouldEndRun: function (server) {
    if (!corp.AI || !server || server == GetServer(this)) return false;
    if (typeof corp.AI._runnerMayWinIfServerBreached == "function")
      return corp.AI._runnerMayWinIfServerBreached(server);
    return true;
  },
  abilities: [
    {
      text: "Hosted power counter: End the run.",
      Enumerate: function () {
        if (!attackedServer || attackedServer == GetServer(this)) return [];
        if (!CheckCounters(this, "power", 1)) return [];
        if (corp.AI && !this._AIShouldEndRun(attackedServer)) return [];
        return [{}];
      },
      Resolve: function () {
        RemoveCounters(this, "power", 1);
        EndTheRun();
      },
    },
  ],
  AIDefensiveValue: function (server) {
    if (!this.installOnlyIn(server)) return 0;
    // This is an install-placement signal only: Red Room cannot defend the
    // central where it is installed.
    if (GetServer(this) == server) return 0;
    return 2;
  },
  AILimitPerServer: function () {
    return 1;
  },
  AIGlobalETRUses: function (server) {
    if (!this._AIShouldEndRun(server)) return 0;
    return Counters(this, "power");
  },
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
  tookBadPublicityThisTurn: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.tookBadPublicityThisTurn = false;
    },
    automatic: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.tookBadPublicityThisTurn = false;
    },
    automatic: true,
  },
  responseOnTakeBadPublicity: {
    Enumerate: function () {
      if (this.tookBadPublicityThisTurn) return [];
      var choices = ChoicesArrayCards(corp.RnD.cards, function (card) {
        return (
          !CheckCardType(card, ["agenda"]) &&
          (CheckSubType(card, "Black Ops") ||
            CheckSubType(card, "Gray Ops") ||
            CheckSubType(card, "Liability"))
        );
      });
      choices.push({ card: null, label: "Do not add a card", button: "Continue" });
      if (corp.AI != null) {
        if (corp.RnD.cards.length < 3) return [choices[choices.length - 1]];
        var tutorChoices = choices.slice(0, choices.length - 1);
        if (tutorChoices.length > 0)
          return [corp.AI._bestNonAgendaTutorOption(tutorChoices)];
        return [choices[choices.length - 1]];
      }
      return choices;
    },
    Resolve: function (params) {
      this.tookBadPublicityThisTurn = true;
      Shuffle(corp.RnD.cards);
      Log("R&D shuffled");
      if (!params || !params.card) return;
      MoveCard(params.card, corp.RnD.cards);
      Render();
      Reveal(
        params.card,
        function () {
          Log(GetTitle(params.card) + " added to HQ");
          MoveCard(params.card, corp.HQ.cards);
        },
        this,
      );
    },
    text: "Search R&D for a non-agenda Black Ops, Gray Ops, or Liability card",
  },
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
  scoredThisTurn: false,
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.scoredThisTurn = false;
    },
    automatic: true,
  },
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.scoredThisTurn = false;
    },
    automatic: true,
  },
  responseOnScored: {
    Resolve: function () {
      if (intended.score != this) return;
      this.scoredThisTurn = true;
      BadPublicity(1);
    },
    automatic: true,
  },
  responseOnStolen: {
    Resolve: function () {
      if (intended.steal == this) BadPublicity(1);
    },
    automatic: true,
  },
  responseOnCorpActionPhaseEnds: {
    Resolve: function () {
      if (!this.scoredThisTurn) return;
      RemoveTags(runner.tags);
      AddTags(3);
    },
    automatic: true,
  },
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
  unique: true,
  modifyStealCost: {
    Resolve: function () {
      return { credits: 3, clicks: 0 };
    },
  },
  responseOnScored: {
    Resolve: function () {
      LoseCredits(runner, 3);
    },
    automatic: true,
  },
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.creditPool < this.rezCost) return -1;
    return emptyProtectedRemotes.length > 0 ? 0 : emptyProtectedRemotes.length;
  },
  AIAvoidInstallingOverThis: true,
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
  responseOnRez: {
    Resolve: function (card) {
      if (card == this) AddCounters(this, "power", 3);
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      RemoveTags(1);
      if (corp.badPublicity > 0) {
        corp.badPublicity -= 1;
        Log("1 bad publicity removed");
        UpdateCounters();
      }
    },
    automatic: true,
  },
  responseOnCorpDiscardEnds: {
    Resolve: function () {
      AddTags(
        1,
        function () {
          BadPublicity(
            1,
            function () {
              RemoveCounters(this, "power", 1);
              if (!CheckCounters(this, "power", 1)) Trash(this, false);
            },
            this,
          );
        },
        this,
      );
    },
    automatic: true,
  },
  RezUsability: function () {
    return currentPhase.identifier == "Corp 3.2";
  },
  AIWorthInstalling: function (emptyProtectedRemotes) {
    if (corp.creditPool < this.rezCost) return -1;
    return emptyProtectedRemotes.length > 0 ? 0 : emptyProtectedRemotes.length;
  },
  AIAvoidInstallingOverThis: true,
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
  responseOnRez: {
    Resolve: function (card) {
      if (card != this) return;
      var server = GetServer(this);
      if (server == corp.HQ || server == corp.RnD || server == corp.archives)
        BadPublicity(1);
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "End the run unless the Runner pays 3[c].",
      Resolve: function () {
        var choices = [];
        if (CheckCredits(runner, 3, "using", this))
          choices.push({ id: 1, label: "Pay 3[c]", button: "Pay 3[c]" });
        choices.push({ id: 0, label: "End the run", button: "End the run" });
        DecisionPhase(
          runner,
          choices,
          function (params) {
            if (params && params.id == 1)
              SpendCredits(runner, 3, "using", this);
            else EndTheRun();
          },
          this.title,
          "Pay 3[c] to avoid ending the run?",
          this,
        );
      },
      visual: { y: 74, h: 16 },
    },
    {
      text: "End the run unless the Runner pays 3[c].",
      Resolve: function () {
        var choices = [];
        if (CheckCredits(runner, 3, "using", this))
          choices.push({ id: 1, label: "Pay 3[c]", button: "Pay 3[c]" });
        choices.push({ id: 0, label: "End the run", button: "End the run" });
        DecisionPhase(
          runner,
          choices,
          function (params) {
            if (params && params.id == 1)
              SpendCredits(runner, 3, "using", this);
            else EndTheRun();
          },
          this.title,
          "Pay 3[c] to avoid ending the run?",
          this,
        );
      },
      visual: { y: 90, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      [["payCredits", "payCredits", "payCredits"], ["endTheRun"]],
      [["payCredits", "payCredits", "payCredits"], ["endTheRun"]],
    ];
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
