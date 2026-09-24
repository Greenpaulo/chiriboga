// CARD DEFINITIONS FOR CREATIONANDCONTROL
setIdentifiers.push("cac");

//Cerebral Imaging: Infinite Frontiers (3001)
// Your maximum hand size is equal to the number of credits in your credit pool.
cardSet[3001] = {
  title: "Cerebral Imaging: Infinite Frontiers",
  imageFile: "3001.png",
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
  modifyMaxHandSize: {
    Resolve: function () {
      // Identity overrides base hand size based on credit pool
      return corp.credits - 5; // Adjusts default hand size of 5 to match credit count
    },
  },
};

//Custom Biotics: Engineered for Success (3002)
// You cannot include Jinteki cards in this deck.
cardSet[3002] = {
  title: "Custom Biotics: Engineered for Success",
  imageFile: "3002.png",
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 22,
  // Note: Deck construction restrictions (no Jinteki) are handled at deck-validation level.
};

//NEXT Design: Guarding the Net (3003)
// Before taking your first turn, you may install up to 3 pieces of ice, with no more than a single piece of ice per server. Draw until you have 5 cards in HQ.
cardSet[3003] = {
  title: "NEXT Design: Guarding the Net",
  imageFile: "3003.png",
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 12,
  responseOnGameBegins: {
    Resolve: function () {
      var installedServers = [];
      var installIceStep = function (countLeft) {
        if (countLeft <= 0) {
          // Draw back up to 5 cards in HQ
          var cardsToDraw = Math.max(0, 5 - corp.HQ.cards.length);
          if (cardsToDraw > 0) {
            Draw(corp, cardsToDraw);
          }
          return;
        }

        var iceInHand = ChoicesArrayCards(corp.HQ.cards, function (c) {
          return CheckCardType(c, ["ice"]);
        });

        if (iceInHand.length === 0) {
          installIceStep(0);
          return;
        }

        DecisionPhase(
          corp,
          iceInHand,
          function (selectedIce) {
            if (!selectedIce) {
              installIceStep(0);
              return;
            }
            // Prompt for server selection where ice has not been installed by NEXT Design yet
            var validServers = ChoicesServers().filter(function (s) {
              return installedServers.indexOf(s) === -1;
            });

            DecisionPhase(
              corp,
              validServers,
              function (selectedServer) {
                if (selectedServer) {
                  installedServers.push(selectedServer);
                  Install(
                    selectedIce,
                    selectedServer,
                    true,
                    null,
                    null,
                    function () {
                      installIceStep(countLeft - 1);
                    },
                  );
                } else {
                  installIceStep(0);
                }
              },
              "NEXT Design",
              "Choose a server to install " +
                GetTitle(selectedIce) +
                " (max 1 per server):",
            );
          },
          "NEXT Design",
          "Before your first turn, you may install up to " +
            countLeft +
            " ICE:",
          null,
          null,
          function () {
            installIceStep(0);
          }, // Pass/Skip choice
        );
      };

      installIceStep(3);
    },
  },
};

//Director Haas' Pet Project (3004)
// When you score this agenda, you may create a new remote server by installing up to 3 cards from HQ and/or Archives in the root of and/or protecting that server, ignoring all install costs.
// Limit 1 per deck.
cardSet[3004] = {
  title: "Director Haas' Pet Project",
  imageFile: "3004.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 3,
  agendaPoints: 1,
  onScore: {
    Resolve: function () {
      var installedCount = 0;
      var newRemote = CreateRemoteServer();

      var installNext = function () {
        if (installedCount >= 3) return;

        var availableCards = ChoicesArrayCards(
          corp.HQ.cards.concat(corp.archives.cards),
        );
        if (availableCards.length === 0) return;

        DecisionPhase(
          corp,
          availableCards,
          function (selectedCard) {
            if (!selectedCard) return;
            installedCount++;
            Install(selectedCard, newRemote, true, null, null, function () {
              installNext();
            });
          },
          "Director Haas' Pet Project",
          "Select card " +
            (installedCount + 1) +
            " of 3 to install in/protect new remote server:",
          null,
          null,
          function () {
            /* Done installing */
          },
        );
      };

      installNext();
    },
  },
};

//Efficiency Committee (3005)
// Place 3 agenda counters on Efficiency Committee when you score it.
// [click], hosted agenda counter: Gain [click][click]. You cannot advance cards for the remainder of this turn.
cardSet[3005] = {
  title: "Efficiency Committee",
  imageFile: "3005.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Initiative"],
  advancementRequirement: 4,
  agendaPoints: 2,
  onScore: {
    Resolve: function () {
      AddCounters(this, "agenda", 3);
    },
  },
  abilities: [
    {
      text: "[click], hosted agenda counter: Gain [click][click]. You cannot advance cards for the remainder of this turn.",
      Enumerate: function () {
        if (Counters(this, "agenda") < 1 || !CheckClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        AddCounters(this, "agenda", -1);
        GainClicks(corp, 2);
        corp.cannotAdvanceThisTurn = true;
        Log(
          GetTitle(corp) +
            " uses Efficiency Committee to gain [click][click]. Cannot advance cards this turn.",
        );
      },
    },
  ],
};

//Project Wotan (3006)
// When you score this agenda, place 3 agenda counters on it.
// Hosted agenda counter: The rezzed piece of bioroid ice the Runner is approaching gains "↳ End the run." after its other subroutines for the remainder of this run.
cardSet[3006] = {
  title: "Project Wotan",
  imageFile: "3006.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 5,
  agendaPoints: 3,
  onScore: {
    Resolve: function () {
      AddCounters(this, "agenda", 3);
    },
  },
  abilities: [
    {
      text: "Hosted agenda counter: Approached rezzed bioroid ice gains '↳ End the run.' for the remainder of this run.",
      Enumerate: function () {
        if (Counters(this, "agenda") < 1 || currentPhase.identifier !== "Run")
          return [];
        var ice = GetApproachedIce();
        if (!ice || !ice.rezzed || !CheckSubType(ice, "Bioroid")) return [];
        return [{}];
      },
      Resolve: function () {
        AddCounters(this, "agenda", -1);
        var ice = GetApproachedIce();
        if (ice) {
          ice.subroutines = ice.subroutines || [];
          ice.subroutines.push({
            text: "End the run.",
            Resolve: function () {
              EndTheRun();
            },
            visual: { y: 57 + ice.subroutines.length * 16, h: 16 },
          });
          Log(GetTitle(ice) + " gains '↳ End the run.' from Project Wotan.");
        }
      },
    },
  ],
};

//Sentinel Defense Program (3007)
// Whenever the Runner suffers at least 1 core damage, do 1 net damage.
cardSet[3007] = {
  title: "Sentinel Defense Program",
  imageFile: "3007.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 4,
  agendaPoints: 2,
  responseOnDamage: {
    automatic: true,
    Resolve: function (type, amount) {
      if (type === "brain" && amount >= 1) {
        Log("Sentinel Defense Program triggers net damage from core damage.");
        Damage("net", 1, true);
      }
    },
  },
};

//Alix T4LB07 (3008)
// Place 1 power counter on Alix T4LB07 whenever you install a card.
// [click],[trash]: Gain 2[c] for each power counter on Alix T4LB07.
cardSet[3008] = {
  title: "Alix T4LB07",
  imageFile: "3008.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: ["Bioroid"],
  rezCost: 1,
  trashCost: 2,
  responseOnInstall: {
    automatic: true,
    Resolve: function (card) {
      if (this.rezzed && card.player === corp) {
        AddCounters(this, "power", 1);
      }
    },
  },
  abilities: [
    {
      text: "[click], [trash]: Gain 2[c] for each power counter on Alix T4LB07.",
      Enumerate: function () {
        if (!this.rezzed || !CheckClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        var creditsToGain = Counters(this, "power") * 2;
        Trash(this, false);
        if (creditsToGain > 0) {
          GainCredits(corp, creditsToGain, "ability", this);
        }
      },
    },
  ],
};

//Cerebral Overwriter (3009)
// You can advance this asset.
// When the Runner accesses this asset while it is installed, you may pay 3[c] to do X core damage. X is equal to the number of hosted advancement counters.
cardSet[3009] = {
  title: "Cerebral Overwriter",
  imageFile: "3009.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "asset",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 0,
  advanceable: true,
  responseOnAccess: {
    Enumerate: function () {
      if (!this.installed) return [];
      var count = Counters(this, "advancement");
      if (count > 0 && CheckCredits(corp, 3)) {
        return [
          {
            id: 1,
            label: "Pay 3[c] to do " + count + " core damage",
            button: "Pay 3[c]",
          },
          { id: 0, label: "Pass", button: "Pass" },
        ];
      }
      return [];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        SpendCredits(
          corp,
          3,
          "ability",
          this,
          function () {
            var damageAmount = Counters(this, "advancement");
            Log(
              "Cerebral Overwriter triggers for " +
                damageAmount +
                " core damage!",
            );
            Damage("brain", damageAmount, true);
          }.bind(this),
        );
      }
    },
    text: "Cerebral Overwriter: Pay 3[c] to do core damage?",
  },
};

//Director Haas (3010)
// You get +1 allotted [click] for each of your turns.
// When this asset is trashed from anywhere while being accessed, add it to the Runner's score area as an agenda worth 2 agenda points.
cardSet[3010] = {
  title: "Director Haas",
  imageFile: "3010.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 5,
  cardType: "asset",
  subTypes: ["Executive"],
  rezCost: 3,
  trashCost: 5,
  responseOnCorpTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.rezzed) {
        GainClicks(corp, 1);
      }
    },
  },
  responseOnTrash: {
    automatic: true,
    Resolve: function () {
      if (currentPhase.identifier === "Access") {
        Log(
          "Director Haas was trashed during access and added to Runner's score area as 2 agenda points.",
        );
        // Move to Runner's score area as an agenda
        this.agendaPoints = 2;
        MoveCard(this, runner.scoreArea);
      }
    },
  },
};

//Haas Arcology AI (3011)
// You can advance this asset if it is unrezzed.
// Once per turn → [click], hosted advancement counter: Gain [click][click].
cardSet[3011] = {
  title: "Haas Arcology AI",
  imageFile: "3011.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 4,
  cardType: "asset",
  subTypes: [],
  rezCost: 2,
  trashCost: 1,
  advanceable: true,
  advanceableUnrezzed: true,
  usedThisTurn: false,
  responseOnCorpTurnBegins: {
    automatic: true,
    Resolve: function () {
      this.usedThisTurn = false;
    },
  },
  abilities: [
    {
      text: "[click], hosted advancement counter: Gain [click][click].",
      Enumerate: function () {
        if (
          !this.rezzed ||
          this.usedThisTurn ||
          Counters(this, "advancement") < 1 ||
          !CheckClicks(corp, 1)
        )
          return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        AddCounters(this, "advancement", -1);
        GainClicks(corp, 2);
        this.usedThisTurn = true;
        Log(GetTitle(this) + " used: Gained [click][click].");
      },
    },
  ],
};

//Thomas Haas (3012)
// Thomas Haas can be advanced.
// [trash]: Gain 2[c] for each advancement token on Thomas Haas.
cardSet[3012] = {
  title: "Thomas Haas",
  imageFile: "3012.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: ["Executive"],
  rezCost: 1,
  trashCost: 1,
  advanceable: true,
  abilities: [
    {
      text: "[trash]: Gain 2[c] for each advancement token on Thomas Haas.",
      Enumerate: function () {
        if (!this.rezzed) return [];
        return [{}];
      },
      Resolve: function () {
        var creditsToGain = Counters(this, "advancement") * 2;
        Trash(this, false);
        if (creditsToGain > 0) {
          GainCredits(corp, creditsToGain, "ability", this);
        }
      },
    },
  ],
};

//Bioroid Efficiency Research (3013)
// Rez a piece of bioroid ice, ignoring all costs, and install Bioroid Efficiency Research on that ice as a hosted condition counter with the text "Trash Bioroid Efficiency Research and derez host ice if all of its subroutines are broken during a single encounter."
cardSet[3013] = {
  title: "Bioroid Efficiency Research",
  imageFile: "3013.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "operation",
  subTypes: ["Condition"],
  playCost: 3,
  Resolve: function (params) {
    var unrezzedBioroidIce = ChoicesInstalledCards(corp, function (card) {
      return (
        CheckCardType(card, ["ice"]) &&
        !card.rezzed &&
        CheckSubType(card, "Bioroid")
      );
    });

    if (unrezzedBioroidIce.length === 0) return;

    var conditionCard = this;

    DecisionPhase(
      corp,
      unrezzedBioroidIce,
      function (selectedIce) {
        if (!selectedIce) return;

        // Rez ice ignoring costs
        selectedIce.rezzed = true;

        // Attach condition tracking to the host ice
        conditionCard.hostIce = selectedIce;
        selectedIce.hostedConditions = selectedIce.hostedConditions || [];
        selectedIce.hostedConditions.push(conditionCard);

        // Define encounter break listener on the target ice
        selectedIce.responseOnEncounterEnds = {
          automatic: true,
          Resolve: function () {
            var unbroken = ChoicesEncounteredSubroutines();
            if (
              unbroken.length === 0 &&
              selectedIce.subroutines &&
              selectedIce.subroutines.length > 0
            ) {
              Log(
                GetTitle(selectedIce) +
                  " had all subroutines broken. Bioroid Efficiency Research trashed and host derezzed.",
              );
              selectedIce.rezzed = false;
              Trash(conditionCard, false);
            }
          },
        };
      },
      "Bioroid Efficiency Research",
      "Select an unrezzed Bioroid ICE to rez for free:",
    );
  },
};

//Successful Demonstration (3014)
// Play only if the Runner made an unsuccessful run during their last turn.
// Gain 7[c].
cardSet[3014] = {
  title: "Successful Demonstration",
  imageFile: "3014.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 2,
  canBePlayed: function () {
    return runner.unsuccessfulRunLastTurn === true;
  },
  Resolve: function (params) {
    GainCredits(corp, 7, "operation", this);
  },
};

//Heimdall 2.0 (3015)
// Lose [click][click]: Break up to 2 subroutines on this ice. Only the Runner can use this ability.
// ↳ Do 1 core damage.
// ↳ Do 1 core damage and end the run.
// ↳ End the run.
cardSet[3015] = {
  title: "Heimdall 2.0",
  imageFile: "3015.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Barrier", "Bioroid", "AP"],
  rezCost: 11,
  strength: 7,
  bioroidBreakCost: 2,
  bioroidBreakSubs: 2,
  subroutines: [
    {
      text: "Do 1 core damage.",
      Resolve: function () {
        Damage("brain", 1, true);
      },
      visual: { y: 116, h: 16 },
    },
    {
      text: "Do 1 core damage and end the run.",
      Resolve: function () {
        Damage("brain", 1, true);
        EndTheRun();
      },
      visual: { y: 142, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 166, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      [["brainDamage"]],
      [["brainDamage"], ["endTheRun"]],
      [["endTheRun"]],
    ];
    return result;
  },
};

//Howler (3016)
// ↳ You may install and rez 1 piece of bioroid ice from HQ or Archives directly inward from this ice, ignoring all costs. When this run ends, if you installed a piece of ice this way, trash this ice and derez the ice you installed.
cardSet[3016] = {
  title: "Howler",
  imageFile: "3016.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "ice",
  subTypes: ["Trap"],
  rezCost: 1,
  strength: 0,
  subroutines: [
    {
      text: "You may install and rez 1 piece of bioroid ice from HQ or Archives directly inward from this ice, ignoring all costs.",
      Resolve: function () {
        var thisIce = this;
        var server = GetServer(thisIce);
        if (!server) return;

        var availableBioroids = ChoicesArrayCards(
          corp.HQ.cards.concat(corp.archives.cards),
          function (card) {
            return (
              CheckCardType(card, ["ice"]) && CheckSubType(card, "Bioroid")
            );
          },
        );

        if (availableBioroids.length === 0) return;

        DecisionPhase(
          corp,
          availableBioroids,
          function (selectedIce) {
            if (!selectedIce) return;

            var howlerIndex = server.ice.indexOf(thisIce);
            Install(selectedIce, server, true, howlerIndex, null, function () {
              selectedIce.rezzed = true;
              Log(
                GetTitle(selectedIce) +
                  " installed and rezzed inward from Howler.",
              );

              // Register end-of-run cleanup
              thisIce.responseOnRunEnds = {
                automatic: true,
                Resolve: function () {
                  selectedIce.rezzed = false;
                  Trash(thisIce, false);
                },
              };
            });
          },
          "Howler",
          "Select a Bioroid ICE from HQ/Archives to install inward:",
        );
      },
      visual: { y: 96, h: 80 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["special"]]];
    return result;
  },
};

//Ichi 2.0 (3017)
// Lose [click][click]: Break up to 2 subroutines on this ice. Only the Runner can use this ability.
// ↳ Trash 1 installed program.
// ↳ Trash 1 installed program.
// ↳ Trace[3]. If successful, do 1 core damage and give the Runner 1 tag.
cardSet[3017] = {
  title: "Ichi 2.0",
  imageFile: "3017.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "Destroyer", "Tracer"],
  rezCost: 8,
  strength: 5,
  bioroidBreakCost: 2,
  bioroidBreakSubs: 2,
  subroutines: [
    {
      text: "Trash 1 installed program.",
      Resolve: function () {
        var installedProgs = ChoicesInstalledCards(runner, function (c) {
          return CheckCardType(c, ["program"]);
        });
        if (installedProgs.length === 0) return;

        DecisionPhase(
          corp,
          installedProgs,
          function (selectedProg) {
            if (selectedProg) Trash(selectedProg, false);
          },
          "Ichi 2.0",
          "Select an installed program to trash:",
        );
      },
      visual: { y: 102, h: 16 },
    },
    {
      text: "Trash 1 installed program.",
      Resolve: function () {
        var installedProgs = ChoicesInstalledCards(runner, function (c) {
          return CheckCardType(c, ["program"]);
        });
        if (installedProgs.length === 0) return;

        DecisionPhase(
          corp,
          installedProgs,
          function (selectedProg) {
            if (selectedProg) Trash(selectedProg, false);
          },
          "Ichi 2.0",
          "Select an installed program to trash:",
        );
      },
      visual: { y: 120, h: 16 },
    },
    {
      text: "Trace[3]. If successful, do 1 core damage and give the Runner 1 tag.",
      Resolve: function () {
        Trace(3, function (successful) {
          if (successful) {
            Damage("brain", 1, true);
            AddTags(1);
          }
        });
      },
      visual: { y: 152, h: 48 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [
      [["trashProgram"]],
      [["trashProgram"]],
      [["trace"], ["brainDamage"], ["tag"]],
    ];
    return result;
  },
};

//Minelayer (3018)
// ↳ You may install 1 piece of ice from HQ protecting this server, ignoring the install cost.
cardSet[3018] = {
  title: "Minelayer",
  imageFile: "3018.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 1,
  strength: 4,
  subroutines: [
    {
      text: "You may install 1 piece of ice from HQ protecting this server, ignoring the install cost.",
      Resolve: function () {
        var thisIce = this;
        var server = GetServer(thisIce);
        if (!server) return;

        var iceInHand = ChoicesArrayCards(corp.HQ.cards, function (c) {
          return CheckCardType(c, ["ice"]);
        });

        if (iceInHand.length === 0) return;

        DecisionPhase(
          corp,
          iceInHand,
          function (selectedIce) {
            if (selectedIce) {
              Install(selectedIce, server, true);
            }
          },
          "Minelayer",
          "Select an ICE from HQ to install on this server:",
        );
      },
      visual: { y: 88, h: 64 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["installIce"]]];
    return result;
  },
};

//Viktor 2.0 (3019)
// Lose [click][click]: Break up to 2 subroutines on this ice. Only the Runner can use this ability.
// Hosted power counter: Do 1 core damage.
// ↳ Trace[2]. If successful, place 1 power counter on this ice.
// ↳ End the run.
cardSet[3019] = {
  title: "Viktor 2.0",
  imageFile: "3019.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Code Gate", "Bioroid", "Tracer", "AP"],
  rezCost: 5,
  strength: 5,
  bioroidBreakCost: 2,
  bioroidBreakSubs: 2,
  abilities: [
    {
      text: "Hosted power counter: Do 1 core damage.",
      Enumerate: function () {
        if (!this.rezzed || Counters(this, "power") < 1) return [];
        return [{}];
      },
      Resolve: function () {
        AddCounters(this, "power", -1);
        Damage("brain", 1, true);
      },
    },
  ],
  subroutines: [
    {
      text: "Trace[2]. If successful, place 1 power counter on this ice.",
      Resolve: function () {
        var thisIce = this;
        Trace(2, function (successful) {
          if (successful) {
            AddCounters(thisIce, "power", 1);
          }
        });
      },
      visual: { y: 158, h: 32 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 183, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["trace"], ["bankroll"]], [["endTheRun"]]];
    return result;
  },
};

//Zed 1.0 (3020)
// Lose [click]: Break 1 subroutine on this ice. Only the Runner can use this ability.
// ↳ If the Runner has lost [click] to break a subroutine during this run, do 1 core damage.
// ↳ If the Runner has lost [click] to break a subroutine during this run, do 1 core damage.
cardSet[3020] = {
  title: "Zed 1.0",
  imageFile: "3020.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "AP"],
  rezCost: 2,
  strength: 1,
  bioroidBreakCost: 1,
  bioroidBreakSubs: 1,
  subroutines: [
    {
      text: "If the Runner has lost [click] to break a subroutine during this run, do 1 core damage.",
      Resolve: function () {
        if (runner.clicksSpentToBreakSubroutinesThisRun > 0) {
          Damage("brain", 1, true);
        }
      },
      visual: { y: 116, h: 48 },
    },
    {
      text: "If the Runner has lost [click] to break a subroutine during this run, do 1 core damage.",
      Resolve: function () {
        if (runner.clicksSpentToBreakSubroutinesThisRun > 0) {
          Damage("brain", 1, true);
        }
      },
      visual: { y: 163, h: 48 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["brainDamage"]], [["brainDamage"]]];
    return result;
  },
};

//Awakening Center (3021)
// You can install bioroid ice onto this upgrade at no install cost.
// Whenever the Runner passes all of the ice protecting this server, you may rez 1 hosted piece of ice, paying 7[c] less. If you do, the Runner encounters that ice. When this run ends, trash that ice.
cardSet[3021] = {
  title: "Awakening Center",
  imageFile: "3021.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "upgrade",
  subTypes: [],
  rezCost: 2,
  trashCost: 3,
  hostedCards: [],
  responseOnPassesIce: {
    Enumerate: function () {
      if (!this.rezzed || attackedServer !== GetServer(this)) return [];
      var currentIceIndex = approachIce;
      var serverIce = GetServer(this).ice;
      // Triggers only when passing the innermost piece of ice
      if (currentIceIndex === serverIce.length - 1) {
        var hostedBioroids = ChoicesArrayCards(this.hostedCards, function (c) {
          return !c.rezzed;
        });
        if (hostedBioroids.length > 0) {
          return [
            {
              id: 1,
              label: "Rez hosted Bioroid ICE (-7[c])",
              button: "Use Awakening Center",
            },
            { id: 0, label: "Pass", button: "Pass" },
          ];
        }
      }
      return [];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        var hostedBioroids = ChoicesArrayCards(this.hostedCards, function (c) {
          return !c.rezzed;
        });
        var upgradeCard = this;

        DecisionPhase(
          corp,
          hostedBioroids,
          function (selectedIce) {
            if (!selectedIce) return;

            var discountedCost = Math.max(0, selectedIce.rezCost - 7);
            SpendCredits(corp, discountedCost, "rez", selectedIce, function () {
              selectedIce.rezzed = true;
              Log(
                "Awakening Center rezzes " +
                  GetTitle(selectedIce) +
                  " for " +
                  discountedCost +
                  "[c].",
              );

              // Force encounter with hosted ice
              TriggerEncounter(selectedIce);

              // Schedule trash at run end
              upgradeCard.responseOnRunEnds = {
                automatic: true,
                Resolve: function () {
                  Trash(selectedIce, false);
                },
              };
            });
          },
          "Awakening Center",
          "Select a hosted Bioroid ICE to rez:",
        );
      }
    },
    text: "Awakening Center: Rez a hosted Bioroid ICE?",
  },
};

//Tyr's Hand (3022)
// [interrupt] → When a subroutine would be broken on a piece of bioroid ice protecting this server, you may rez this upgrade.
// [interrupt] → [trash]: Prevent 1 subroutine from being broken on a piece of bioroid ice protecting this server.
cardSet[3022] = {
  title: "Tyr's Hand",
  imageFile: "3022.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "upgrade",
  subTypes: ["Hostile"],
  rezCost: 1,
  trashCost: 1,
  abilities: [
    {
      text: "[trash]: Prevent 1 subroutine from being broken on a piece of bioroid ice protecting this server.",
      Enumerate: function () {
        if (!this.rezzed || currentPhase.identifier !== "Encounter") return [];
        var ice = GetApproachedIce();
        if (
          !ice ||
          GetServer(ice) !== GetServer(this) ||
          !CheckSubType(ice, "Bioroid")
        )
          return [];
        return [{}];
      },
      Resolve: function () {
        Trash(this, false);
        PreventSubroutineBreak(1);
        Log(
          "Tyr's Hand trashed to prevent 1 subroutine break on " +
            GetTitle(GetApproachedIce()) +
            ".",
        );
      },
    },
  ],
};

//Gila Hands Arcology (3023)
// [click], [click]: Gain 3[c].
cardSet[3023] = {
  title: "Gila Hands Arcology",
  imageFile: "3023.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 3,
  agendaPoints: 1,
  abilities: [
    {
      text: "[click], [click]: Gain 3[c].",
      Enumerate: function () {
        if (!this.scored || !CheckClicks(corp, 2)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 2);
        GainCredits(corp, 3, "ability", this);
        Log(GetTitle(corp) + " uses Gila Hands Arcology to gain 3[c].");
      },
    },
  ],
};

//Levy University (3024)
// [click], 1[c]: Search R&D for a piece of ice, reveal it, and add it to HQ. Shuffle R&D.
cardSet[3024] = {
  title: "Levy University",
  imageFile: "3024.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "asset",
  subTypes: ["Ritzy"],
  rezCost: 3,
  trashCost: 1,
  abilities: [
    {
      text: "[click], 1[c]: Search R&D for a piece of ICE, reveal it, and add it to HQ. Shuffle R&D.",
      Enumerate: function () {
        if (!this.rezzed || !CheckClicks(corp, 1) || !CheckCredits(corp, 1))
          return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        SpendCredits(
          corp,
          1,
          "ability",
          this,
          function () {
            var iceInRnD = ChoicesArrayCards(corp.RnD.cards, function (c) {
              return CheckCardType(c, ["ice"]);
            });

            if (iceInRnD.length === 0) {
              Shuffle(corp.RnD);
              return;
            }

            DecisionPhase(
              corp,
              iceInRnD,
              function (selectedIce) {
                if (selectedIce) {
                  Log(
                    "Levy University found " +
                      GetTitle(selectedIce) +
                      " from R&D.",
                  );
                  MoveCard(selectedIce, corp.HQ);
                }
                Shuffle(corp.RnD);
              },
              "Levy University",
              "Select a piece of ICE from R&D to add to HQ:",
            );
          }.bind(this),
        );
      },
    },
  ],
};

//Server Diagnostics (3025)
// Gain 2[c] when your turn begins.
// Trash Server Diagnostics when you install a piece of ice.
cardSet[3025] = {
  title: "Server Diagnostics",
  imageFile: "3025.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "asset",
  subTypes: [],
  rezCost: 3,
  trashCost: 2,
  responseOnCorpTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.rezzed) {
        GainCredits(corp, 2, "ability", this);
        Log("Server Diagnostics gained 2[c] at turn start.");
      }
    },
  },
  responseOnInstall: {
    automatic: true,
    Resolve: function (installedCard) {
      if (this.installed && CheckCardType(installedCard, ["ice"])) {
        Log("ICE installed; Server Diagnostics is trashed.");
        Trash(this, false);
      }
    },
  },
};

//Bastion (3026)
// ↳ End the run.
cardSet[3026] = {
  title: "Bastion",
  imageFile: "3026.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 4,
  strength: 4,
  subroutines: [
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 65, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]]];
    return result;
  },
};

//Datapike (3027)
// ↳ The Runner must pay 2[c], if able. If the Runner cannot pay 2[c], end the run.
// ↳ End the run.
cardSet[3027] = {
  title: "Datapike",
  imageFile: "3027.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 4,
  strength: 2,
  subroutines: [
    {
      text: "The Runner must pay 2[c], if able. If the Runner cannot pay 2[c], end the run.",
      Resolve: function () {
        if (CheckCredits(runner, 2)) {
          SpendCredits(runner, 2, "subroutine", this);
          Log("Runner pays 2[c] for Datapike subroutine.");
        } else {
          Log("Runner cannot pay 2[c] for Datapike. Run ended.");
          EndTheRun();
        }
      },
      visual: { y: 81, h: 48 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 113, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["drainRunnerCredits"], ["endTheRun"]], [["endTheRun"]]];
    return result;
  },
};

//Rielle “Kit” Peddler: Transhuman (3028)
// The first time each turn you encounter a piece of ice, it gains code gate for the remainder of this run.
cardSet[3028] = {
  title: "Rielle “Kit” Peddler: Transhuman",
  imageFile: "3028.png",
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Cyborg"],
  deckSize: 45,
  influenceLimit: 10,
  link: 0,
  _usedThisTurn: false,
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      this._usedThisTurn = false;
    },
  },
  responseOnCorpTurnBegins: {
    automatic: true,
    Resolve: function () {
      this._usedThisTurn = false;
    },
  },
  responseOnEncounter: {
    automatic: true,
    Resolve: function () {
      if (!this._usedThisTurn) {
        this._usedThisTurn = true;
        var ice = GetApproachedIce();
        if (ice) {
          ice.subTypes = ice.subTypes || [];
          if (ice.subTypes.indexOf("Code Gate") === -1) {
            ice.subTypes.push("Code Gate");
            Log(
              "Kit ID gives Code Gate subtype to " +
                GetTitle(ice) +
                " for this run.",
            );
          }
        }
      }
    },
  },
};

//The Professor: Keeper of Knowledge (3029)
// The first copy of each program in this deck does not count against your influence limit.
cardSet[3029] = {
  title: "The Professor: Keeper of Knowledge",
  imageFile: "3029.png",
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 1,
  link: 0,
  // Note: Influence calculation rules are validated during deck building.
};

//Exile: Streethawk (3030)
// Whenever you install a program from your heap, draw 1 card.
cardSet[3030] = {
  title: "Exile: Streethawk",
  imageFile: "3030.png",
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
  responseOnInstall: {
    automatic: true,
    Resolve: function (installedCard, sourceZone) {
      if (
        CheckCardType(installedCard, ["program"]) &&
        sourceZone === runner.heap
      ) {
        Log("Exile ID triggers on program install from Heap: Draw 1 card.");
        Draw(runner, 1);
      }
    },
  },
};

//Escher (3031)
// Run HQ. If successful, instead of breaching HQ, rearrange any number of ice protecting all servers. (Do not rez or derez any ice or change the number of ice protecting any server.)
cardSet[3031] = {
  title: "Escher",
  imageFile: "3031.png",
  player: runner,
  faction: "Shaper",
  influence: 5,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  Resolve: function (params) {
    SpendCredits(runner, 3, "play", this, function () {
      InitiateRun(corp.HQ, function (successful) {
        if (!successful) return;

        // Collect all currently installed ice and their original servers/positions
        var allInstalledIce = [];
        var serverCounts = [];

        var servers = GetAllServers();
        for (var s = 0; s < servers.length; s++) {
          var serverIce = servers[s].ice || [];
          serverCounts[s] = serverIce.length;
          for (var i = 0; i < serverIce.length; i++) {
            allInstalledIce.push(serverIce[i]);
          }
        }

        if (allInstalledIce.length === 0) {
          Log("Escher: No installed ICE to rearrange.");
          return;
        }

        // Loop through servers and prompt the user to reassign ICE back to server positions
        var assignIceForServer = function (serverIndex) {
          if (serverIndex >= servers.length) {
            Log("Escher: Rearranged ICE across all servers.");
            return;
          }

          var neededCount = serverCounts[serverIndex];
          if (neededCount === 0) {
            assignIceForServer(serverIndex + 1);
            return;
          }

          var placeNextIce = function (placedInServer) {
            if (placedInServer === neededCount) {
              assignIceForServer(serverIndex + 1);
              return;
            }

            DecisionPhase(
              runner,
              allInstalledIce,
              function (selectedIce) {
                if (selectedIce) {
                  // Remove selected ice from unassigned pool
                  var idx = allInstalledIce.indexOf(selectedIce);
                  if (idx !== -1) allInstalledIce.splice(idx, 1);

                  // Move to target server position
                  MoveCard(selectedIce, servers[serverIndex].ice);
                  placeNextIce(placedInServer + 1);
                }
              },
              "Escher",
              "Select ICE to place on " +
                ServerName(servers[serverIndex]) +
                " (Position " +
                (placedInServer + 1) +
                " of " +
                neededCount +
                "):",
            );
          };

          placeNextIce(0);
        };

        // Replace breach action
        ReplaceBreach(function () {
          assignIceForServer(0);
        });
      });
    });
  },
};

//Exploratory Romp (3032)
// Run any server. If successful, instead of breaching that server, remove up to 3 advancement counters from 1 card in the root of or protecting the attacked server.
cardSet[3032] = {
  title: "Exploratory Romp",
  imageFile: "3032.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 1,
  Resolve: function (params) {
    SpendCredits(runner, 1, "play", this, function () {
      DecisionPhase(
        runner,
        ChoicesServers(),
        function (targetServer) {
          if (!targetServer) return;

          InitiateRun(targetServer, function (successful) {
            if (!successful) return;

            ReplaceBreach(function () {
              var validCards = [];
              var serverCards = GetServerCards(targetServer);

              for (var i = 0; i < serverCards.length; i++) {
                if (Counters(serverCards[i], "advancement") > 0) {
                  validCards.push(serverCards[i]);
                }
              }

              if (validCards.length === 0) {
                Log(
                  "Exploratory Romp: No cards with advancement counters in root/protecting target server.",
                );
                return;
              }

              DecisionPhase(
                runner,
                validCards,
                function (selectedCard) {
                  if (selectedCard) {
                    var current = Counters(selectedCard, "advancement");
                    var removeCount = Math.min(3, current);
                    AddCounters(selectedCard, "advancement", -removeCount);
                    Log(
                      "Exploratory Romp removed " +
                        removeCount +
                        " advancement counter(s) from " +
                        GetTitle(selectedCard) +
                        ".",
                    );
                  }
                },
                "Exploratory Romp",
                "Select a card to remove up to 3 advancement counters from:",
              );
            });
          });
        },
        "Exploratory Romp",
        "Select a server to run:",
      );
    });
  },
};

//Freelance Coding Contract (3033)
// Trash up to 5 programs from your grip. Gain 2[c] for each program trashed.
cardSet[3033] = {
  title: "Freelance Coding Contract",
  imageFile: "3033.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: ["Job"],
  playCost: 0,
  Resolve: function (params) {
    var programChoices = ChoicesArrayCards(runner.grip.cards, function (c) {
      return CheckCardType(c, ["program"]);
    });

    if (programChoices.length === 0) {
      Log("Freelance Coding Contract: No programs in grip to trash.");
      return;
    }

    var trashedCount = 0;

    var selectProgramToTrash = function () {
      if (trashedCount >= 5) {
        GainCredits(runner, trashedCount * 2, "ability", this);
        return;
      }

      var choices = ChoicesArrayCards(runner.grip.cards, function (c) {
        return CheckCardType(c, ["program"]);
      });

      if (choices.length === 0) {
        GainCredits(runner, trashedCount * 2, "ability", this);
        return;
      }

      // Add option to stop trashing
      choices.push({ id: 0, label: "Done (Trash no more)", button: "Done" });

      DecisionPhase(
        runner,
        choices,
        function (selection) {
          if (!selection || selection.id === 0) {
            GainCredits(runner, trashedCount * 2, "ability", this);
            return;
          }

          Trash(selection, true);
          trashedCount++;
          selectProgramToTrash();
        },
        "Freelance Coding Contract",
        "Select a program to trash (" + trashedCount + "/5 trashed):",
      );
    };

    selectProgramToTrash();
  },
};

//Scavenge (3034)
// As an additional cost to play this event, trash 1 installed program.
// Install 1 program from your grip or heap, paying X[c] less. X is equal to the install cost of the program you trashed.
cardSet[3034] = {
  title: "Scavenge",
  imageFile: "3034.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    var installedPrograms = ChoicesInstalledCards(runner, function (c) {
      return CheckCardType(c, ["program"]);
    });

    if (installedPrograms.length === 0) {
      Log("Scavenge: No installed programs to trash.");
      return;
    }

    DecisionPhase(
      runner,
      installedPrograms,
      function (trashedProg) {
        if (!trashedProg) return;

        var discount = trashedProg.installCost || 0;
        Trash(trashedProg, true);
        Log(
          "Scavenge: Trashed " +
            GetTitle(trashedProg) +
            " (Discount: " +
            discount +
            "[c]).",
        );

        var validTargetPrograms = ChoicesArrayCards(
          runner.grip.cards.concat(runner.heap.cards),
          function (c) {
            return CheckCardType(c, ["program"]);
          },
        );

        if (validTargetPrograms.length === 0) {
          Log("Scavenge: No programs in Grip or Heap to install.");
          return;
        }

        DecisionPhase(
          runner,
          validTargetPrograms,
          function (selectedProg) {
            if (selectedProg) {
              var finalCost = Math.max(
                0,
                (selectedProg.installCost || 0) - discount,
              );
              SpendCredits(
                runner,
                finalCost,
                "install",
                selectedProg,
                function () {
                  Install(selectedProg, runner.rig);
                  Log(
                    "Scavenge installed " +
                      GetTitle(selectedProg) +
                      " for " +
                      finalCost +
                      "[c].",
                  );
                },
              );
            }
          },
          "Scavenge",
          "Select a program from Grip or Heap to install:",
        );
      },
      "Scavenge",
      "Select an installed program to trash as an additional cost:",
    );
  },
};

//Levy AR Lab Access (3035)
// Shuffle your grip and heap into your stack. Draw 5 cards. Remove Levy AR Lab Access from the game instead of trashing it.
cardSet[3035] = {
  title: "Levy AR Lab Access",
  imageFile: "3035.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "event",
  subTypes: [],
  playCost: 5,
  Resolve: function (params) {
    SpendCredits(
      runner,
      5,
      "play",
      this,
      function () {
        // Move all cards from Grip and Heap to Stack
        while (runner.grip.cards.length > 0) {
          MoveCard(runner.grip.cards[0], runner.stack);
        }
        while (runner.heap.cards.length > 0) {
          MoveCard(runner.heap.cards[0], runner.stack);
        }

        Shuffle(runner.stack);
        Log("Levy AR Lab Access: Shuffled Grip and Heap into Stack.");

        Draw(runner, 5);

        // Remove self from the game instead of trashing
        MoveCard(this, runner.removedFromGame);
        Log("Levy AR Lab Access removed from the game.");
      }.bind(this),
    );
  },
};

//Monolith (3036)
// +3[mu]
// When you install this hardware, install up to 3 programs from your grip, paying 4[c] less for each.
// [interrupt] → Trash 1 program from your grip: Prevent 1 core damage or 1 net damage.
// Limit 1 console per player.
cardSet[3036] = {
  title: "Monolith",
  imageFile: "3036.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 18,
  modifyMaxMU: function () {
    if (this.installed) return 3;
    return 0;
  },
  responseOnInstall: {
    automatic: true,
    Resolve: function () {
      var installedCount = 0;

      var installNextProgram = function () {
        if (installedCount >= 3) return;

        var availablePrograms = ChoicesArrayCards(
          runner.grip.cards,
          function (c) {
            return CheckCardType(c, ["program"]);
          },
        );

        if (availablePrograms.length === 0) return;

        availablePrograms.push({ id: 0, label: "Pass / Done", button: "Pass" });

        DecisionPhase(
          runner,
          availablePrograms,
          function (selectedProg) {
            if (!selectedProg || selectedProg.id === 0) return;

            var discountedCost = Math.max(
              0,
              (selectedProg.installCost || 0) - 4,
            );
            SpendCredits(
              runner,
              discountedCost,
              "install",
              selectedProg,
              function () {
                Install(selectedProg, runner.rig);
                Log(
                  "Monolith installed " +
                    GetTitle(selectedProg) +
                    " with a 4[c] discount.",
                );
                installedCount++;
                installNextProgram();
              },
            );
          },
          "Monolith",
          "Select a program from Grip to install (-4[c] discount, " +
            installedCount +
            "/3 installed):",
        );
      };

      installNextProgram();
    },
  },
  abilities: [
    {
      text: "Trash 1 program from your grip: Prevent 1 core damage or 1 net damage.",
      Enumerate: function () {
        if (!this.installed) return [];
        var programsInGrip = ChoicesArrayCards(runner.grip.cards, function (c) {
          return CheckCardType(c, ["program"]);
        });
        if (programsInGrip.length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        var programsInGrip = ChoicesArrayCards(runner.grip.cards, function (c) {
          return CheckCardType(c, ["program"]);
        });

        DecisionPhase(
          runner,
          programsInGrip,
          function (selectedProg) {
            if (selectedProg) {
              Trash(selectedProg, true);
              PreventDamage(1);
              Log(
                "Monolith trashed " +
                  GetTitle(selectedProg) +
                  " from Grip to prevent 1 damage.",
              );
            }
          },
          "Monolith",
          "Select a program from Grip to trash to prevent 1 damage:",
        );
      },
    },
  ],
};

//Feedback Filter (3037)
// [interrupt] → 3[c]: Prevent 1 net damage.
// [interrupt] → [trash]: Prevent up to 2 core damage.
cardSet[3037] = {
  title: "Feedback Filter",
  imageFile: "3037.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 2,
  abilities: [
    {
      text: "3[c]: Prevent 1 net damage.",
      Enumerate: function () {
        if (
          !this.installed ||
          !CheckCredits(runner, 3) ||
          pendingDamageType !== "net"
        )
          return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(runner, 3, "ability", this, function () {
          PreventDamage(1);
          Log("Feedback Filter paid 3[c] to prevent 1 net damage.");
        });
      },
    },
    {
      text: "[trash]: Prevent up to 2 core damage.",
      Enumerate: function () {
        if (!this.installed || pendingDamageType !== "brain") return [];
        return [{}];
      },
      Resolve: function () {
        Trash(this, true);
        PreventDamage(2);
        Log("Feedback Filter trashed to prevent up to 2 core damage.");
      },
    },
  ],
};

//Clone Chip (3038)
// [trash]: Install a program from your heap (paying the install cost).
cardSet[3038] = {
  title: "Clone Chip",
  imageFile: "3038.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  abilities: [
    {
      text: "[trash]: Install a program from your heap (paying the install cost).",
      Enumerate: function () {
        if (!this.installed) return [];
        var programsInHeap = ChoicesArrayCards(runner.heap.cards, function (c) {
          return CheckCardType(c, ["program"]);
        });
        if (programsInHeap.length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        var programsInHeap = ChoicesArrayCards(runner.heap.cards, function (c) {
          return CheckCardType(c, ["program"]);
        });

        Trash(this, true);

        DecisionPhase(
          runner,
          programsInHeap,
          function (selectedProg) {
            if (selectedProg) {
              var cost = selectedProg.installCost || 0;
              SpendCredits(runner, cost, "install", selectedProg, function () {
                Install(selectedProg, runner.rig);
                Log(
                  "Clone Chip installed " +
                    GetTitle(selectedProg) +
                    " from Heap.",
                );
              });
            }
          },
          "Clone Chip",
          "Select a program from Heap to install:",
        );
      },
    },
  ],
};

//Omni-drive (3039)
// Omni-drive can host a single program of 1[mu] or less. The memory cost of the hosted program does not count against your memory limit.
// 1[recurring-c]
// Use this credit to pay for using the hosted program.
cardSet[3039] = {
  title: "Omni-drive",
  imageFile: "3039.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "hardware",
  subTypes: ["Gear"],
  installCost: 3,
  recurringCredits: 1,
  hostedCards: [],
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.installed) {
        this.recurringCredits = 1;
      }
    },
  },
};

//Atman (3040)
// When you install this program, you may spend any number of credits to place that many power counters on it.
// This program gets +1 strength for each hosted power counter, and it can only interface with ice of exactly equal strength.
// Interface → 1[c]: Break 1 subroutine.
cardSet[3040] = {
  title: "Atman",
  imageFile: "3040.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "AI"],
  installCost: 3,
  memoryCost: 1,
  strength: 0,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return Counters(this, "power");
      return 0;
    },
  },
  responseOnInstall: {
    automatic: true,
    Resolve: function () {
      var maxCredits = runner.credits;
      if (maxCredits === 0) return;

      var options = [];
      for (var i = 0; i <= maxCredits; i++) {
        options.push({
          id: i,
          label:
            i +
            " Credit(s) (" +
            i +
            " Power Counter" +
            (i === 1 ? "" : "s") +
            ")",
          button: "Pay " + i,
        });
      }

      DecisionPhase(
        runner,
        options,
        function (choice) {
          if (choice && choice.id > 0) {
            SpendCredits(
              runner,
              choice.id,
              "ability",
              this,
              function () {
                AddCounters(this, "power", choice.id);
                Log(
                  "Atman placed " + choice.id + " power counter(s) on install.",
                );
              }.bind(this),
            );
          }
        }.bind(this),
        "Atman",
        "Select number of credits to spend for power counters:",
      );
    },
  },
  abilities: [
    {
      text: "1[c]: Break 1 subroutine on ICE of equal strength.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 1)) return [];
        var ice = GetApproachedIce();
        if (!ice) return [];

        var iceStrength = ice.strength + (ice.strengthBoost || 0);
        var atmanStrength = Counters(this, "power");

        if (iceStrength !== atmanStrength) return [];

        var unbroken = ChoicesEncounteredSubroutines();
        if (unbroken.length === 0) return [];

        return [{}];
      },
      Resolve: function () {
        var unbroken = ChoicesEncounteredSubroutines();
        DecisionPhase(
          runner,
          unbroken,
          function (selectedSub) {
            if (selectedSub) {
              SpendCredits(runner, 1, "ability", this, function () {
                Break(selectedSub);
                Log("Atman broke 1 subroutine.");
              });
            }
          },
          "Atman",
          "Select a subroutine to break:",
        );
      },
    },
  ],
};

//Cloak (3041)
// 1[recurring-c]
// Use this credit to pay for using icebreakers.
cardSet[3041] = {
  title: "Cloak",
  imageFile: "3041.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Stealth"],
  installCost: 1,
  memoryCost: 1,
  recurringCredits: 1,
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.installed) {
        this.recurringCredits = 1;
      }
    },
  },
};

//Dagger (3042)
// Interface → 1[c]: Break 1 sentry subroutine.
// 1[c]: +5 strength. Spend credits only from stealth cards to use this ability.
cardSet[3042] = {
  title: "Dagger",
  imageFile: "3042.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Killer"],
  installCost: 3,
  memoryCost: 1,
  strength: 0,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  responseOnRunEnds: {
    automatic: true,
    Resolve: function () {
      this.strengthBoost = 0;
    },
  },
  abilities: [
    {
      text: "1[c]: Break 1 Sentry subroutine.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 1)) return [];
        var ice = GetApproachedIce();
        if (!ice || !CheckSubType(ice, "Sentry")) return [];

        var iceStrength = ice.strength + (ice.strengthBoost || 0);
        var daggerStrength = this.strength + this.strengthBoost;
        if (daggerStrength < iceStrength) return [];

        var unbroken = ChoicesEncounteredSubroutines();
        if (unbroken.length === 0) return [];

        return [{}];
      },
      Resolve: function () {
        var unbroken = ChoicesEncounteredSubroutines();
        DecisionPhase(
          runner,
          unbroken,
          function (selectedSub) {
            if (selectedSub) {
              SpendCredits(runner, 1, "ability", this, function () {
                Break(selectedSub);
                Log("Dagger broke 1 Sentry subroutine.");
              });
            }
          },
          "Dagger",
          "Select a Sentry subroutine to break:",
        );
      },
    },
    {
      text: "1[c]: +5 strength (stealth credits only).",
      Enumerate: function () {
        if (!this.installed) return [];

        // Find installed stealth sources with available recurring credits
        var stealthCreditsAvailable = false;
        var installedCards = InstalledCards(runner);
        for (var i = 0; i < installedCards.length; i++) {
          var card = installedCards[i];
          if (
            CheckSubType(card, "Stealth") &&
            (card.recurringCredits || 0) > 0
          ) {
            stealthCreditsAvailable = true;
            break;
          }
        }

        if (!stealthCreditsAvailable) return [];
        return [{}];
      },
      Resolve: function () {
        var stealthCards = ChoicesInstalledCards(runner, function (c) {
          return CheckSubType(c, "Stealth") && (c.recurringCredits || 0) > 0;
        });

        DecisionPhase(
          runner,
          stealthCards,
          function (selectedStealthCard) {
            if (selectedStealthCard) {
              selectedStealthCard.recurringCredits -= 1;
              this.strengthBoost += 5;
              Log(
                "Dagger used 1 credit from " +
                  GetTitle(selectedStealthCard) +
                  " for +5 strength.",
              );
            }
          }.bind(this),
          "Dagger",
          "Select a Stealth card to spend 1 credit from:",
        );
      },
    },
  ],
};

//Chakana (3043)
// Whenever you make a successful run on R&D, place 1 virus counter on Chakana.
// If there are at least 3 virus counters on Chakana, the advancement requirement of all agendas is increased by 1.
cardSet[3043] = {
  title: "Chakana",
  imageFile: "3043.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 2,
  memoryCost: 1,
  responseOnRunSuccessful: {
    automatic: true,
    Resolve: function () {
      if (this.installed && attackedServer === corp.RnD) {
        AddCounters(this, "virus", 1);
        Log("Chakana gained 1 virus counter from successful R&D run.");
      }
    },
  },
  modifyAdvancementRequirement: {
    Resolve: function (agendaCard) {
      if (this.installed && Counters(this, "virus") >= 3) {
        return 1;
      }
      return 0;
    },
  },
};

//Cyber-Cypher (3044)
// When you install this program, choose a server. Use this program only during runs on the chosen server.
// Interface → 1[c]: Break 1 code gate subroutine.
// 1[c]: +1 strength.
cardSet[3044] = {
  title: "Cyber-Cypher",
  imageFile: "3044.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: ["Icebreaker", "Decoder"],
  installCost: 2,
  memoryCost: 1,
  strength: 4,
  strengthBoost: 0,
  targetServer: null,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  responseOnInstall: {
    automatic: true,
    Resolve: function () {
      DecisionPhase(
        runner,
        ChoicesServers(),
        function (selectedServer) {
          if (selectedServer) {
            this.targetServer = selectedServer;
            Log("Cyber-Cypher assigned to " + ServerName(selectedServer) + ".");
          }
        }.bind(this),
        "Cyber-Cypher",
        "Choose a server for Cyber-Cypher:",
      );
    },
  },
  responseOnRunEnds: {
    automatic: true,
    Resolve: function () {
      this.strengthBoost = 0;
    },
  },
  abilities: [
    {
      text: "1[c]: Break 1 Code Gate subroutine.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 1)) return [];
        if (attackedServer !== this.targetServer) return [];

        var ice = GetApproachedIce();
        if (!ice || !CheckSubType(ice, "Code Gate")) return [];

        var iceStrength = ice.strength + (ice.strengthBoost || 0);
        var breakerStrength = this.strength + this.strengthBoost;
        if (breakerStrength < iceStrength) return [];

        var unbroken = ChoicesEncounteredSubroutines();
        if (unbroken.length === 0) return [];

        return [{}];
      },
      Resolve: function () {
        var unbroken = ChoicesEncounteredSubroutines();
        DecisionPhase(
          runner,
          unbroken,
          function (selectedSub) {
            if (selectedSub) {
              SpendCredits(runner, 1, "ability", this, function () {
                Break(selectedSub);
                Log("Cyber-Cypher broke 1 Code Gate subroutine.");
              });
            }
          },
          "Cyber-Cypher",
          "Select a Code Gate subroutine to break:",
        );
      },
    },
    {
      text: "1[c]: +1 strength.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 1)) return [];
        if (attackedServer !== this.targetServer) return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(
          runner,
          1,
          "ability",
          this,
          function () {
            this.strengthBoost += 1;
            Log("Cyber-Cypher gains +1 strength.");
          }.bind(this),
        );
      },
    },
  ],
};

//Paricia (3045)
// 2[recurring-c] (When you install this card and before your turn begins, refill to 2 hosted credits.)
// You can spend hosted credits to pay trash costs of assets.
cardSet[3045] = {
  title: "Paricia",
  imageFile: "3045.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: [],
  installCost: 0,
  memoryCost: 1,
  recurringCredits: 2,
  responseOnInstall: {
    automatic: true,
    Resolve: function () {
      this.recurringCredits = 2;
    },
  },
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.installed) {
        this.recurringCredits = 2;
      }
    },
  },
};

//Self-modifying Code (3046)
// 2[c], [trash]: Search your stack for 1 program. Install it. (Shuffle your stack after searching it.)
cardSet[3046] = {
  title: "Self-modifying Code",
  imageFile: "3046.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 0,
  memoryCost: 2,
  abilities: [
    {
      text: "2[c], [trash]: Search Stack for 1 program and install it.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 2)) return [];
        var programsInStack = ChoicesArrayCards(
          runner.stack.cards,
          function (c) {
            return CheckCardType(c, ["program"]);
          },
        );
        if (programsInStack.length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(
          runner,
          2,
          "ability",
          this,
          function () {
            Trash(this, true);

            var programsInStack = ChoicesArrayCards(
              runner.stack.cards,
              function (c) {
                return CheckCardType(c, ["program"]);
              },
            );

            if (programsInStack.length === 0) {
              Shuffle(runner.stack);
              return;
            }

            DecisionPhase(
              runner,
              programsInStack,
              function (selectedProg) {
                if (selectedProg) {
                  var cost = selectedProg.installCost || 0;
                  SpendCredits(
                    runner,
                    cost,
                    "install",
                    selectedProg,
                    function () {
                      Install(selectedProg, runner.rig);
                      Log(
                        "Self-modifying Code installed " +
                          GetTitle(selectedProg) +
                          " from Stack.",
                      );
                    },
                  );
                }
                Shuffle(runner.stack);
              },
              "Self-modifying Code",
              "Select a program from Stack to install:",
            );
          }.bind(this),
        );
      },
    },
  ],
};

//Sahasrara (3047)
// 2[recurring-c]
// Use these credits to install programs (you cannot use Sahasrara to install a program that trashes Sahasrara).
cardSet[3047] = {
  title: "Sahasrara",
  imageFile: "3047.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: [],
  installCost: 2,
  memoryCost: 1,
  recurringCredits: 2,
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.installed) {
        this.recurringCredits = 2;
      }
    },
  },
};

//Inti (3048)
// Interface → 1[c]: Break 1 barrier subroutine.
// 2[c]: +1 strength for the remainder of this run.
cardSet[3048] = {
  title: "Inti",
  imageFile: "3048.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 0,
  memoryCost: 1,
  strength: 1,
  strengthBoost: 0,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) return this.strengthBoost;
      return 0;
    },
  },
  responseOnRunEnds: {
    automatic: true,
    Resolve: function () {
      this.strengthBoost = 0;
    },
  },
  abilities: [
    {
      text: "1[c]: Break 1 Barrier subroutine.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 1)) return [];
        var ice = GetApproachedIce();
        if (!ice || !CheckSubType(ice, "Barrier")) return [];

        var iceStrength = ice.strength + (ice.strengthBoost || 0);
        var breakerStrength = this.strength + this.strengthBoost;
        if (breakerStrength < iceStrength) return [];

        var unbroken = ChoicesEncounteredSubroutines();
        if (unbroken.length === 0) return [];

        return [{}];
      },
      Resolve: function () {
        var unbroken = ChoicesEncounteredSubroutines();
        DecisionPhase(
          runner,
          unbroken,
          function (selectedSub) {
            if (selectedSub) {
              SpendCredits(runner, 1, "ability", this, function () {
                Break(selectedSub);
                Log("Inti broke 1 Barrier subroutine.");
              });
            }
          },
          "Inti",
          "Select a Barrier subroutine to break:",
        );
      },
    },
    {
      text: "2[c]: +1 strength for the remainder of this run.",
      Enumerate: function () {
        if (!this.installed || !CheckCredits(runner, 2) || !attackedServer)
          return [];
        return [{}];
      },
      Resolve: function () {
        SpendCredits(
          runner,
          2,
          "ability",
          this,
          function () {
            this.strengthBoost += 1;
            Log("Inti gains +1 strength for remainder of run.");
          }.bind(this),
        );
      },
    },
  ],
};

//Professional Contacts (3049)
// [click]: Gain 1[c] and draw 1 card.
cardSet[3049] = {
  title: "Professional Contacts",
  imageFile: "3049.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 5,
  abilities: [
    {
      text: "[click]: Gain 1[c] and draw 1 card.",
      Enumerate: function () {
        if (!this.installed || !CheckClicks(runner, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(runner, 1);
        PlaySound('professionalContacts');
        suppressCreditDrawSound = true;
        GainCredits(runner, 1, "ability", this);
        Draw(runner, 1);
        suppressCreditDrawSound = false;
        Log("Professional Contacts used: Gained 1[c] and drew 1 card.");
      },
    },
  ],
};

//Borrowed Satellite (3050)
// +1[link]
// Your maximum hand size is increased by 1.
cardSet[3050] = {
  title: "Borrowed Satellite",
  imageFile: "3050.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "resource",
  subTypes: ["Link"],
  installCost: 3,
  modifyLink: function () {
    if (this.installed) return 1;
    return 0;
  },
  modifyMaxHandSize: {
    Resolve: function () {
      if (this.installed) return 1;
      return 0;
    },
  },
};

//Ice Analyzer (3051)
// Whenever the Corp rezzes a piece of ice, place 1[c] on Ice Analyzer.
// You may use credits on Ice Analyzer to install programs.
cardSet[3051] = {
  title: "Ice Analyzer",
  imageFile: "3051.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "resource",
  subTypes: ["Virtual"],
  installCost: 0,
  hostedCredits: 0,
  responseOnRez: {
    automatic: true,
    Resolve: function (rezzedCard) {
      if (this.installed && CheckCardType(rezzedCard, ["ice"])) {
        this.hostedCredits = (this.hostedCredits || 0) + 1;
        Log(
          "Ice Analyzer gained 1[c] from Corp rezzing " +
            GetTitle(rezzedCard) +
            ".",
        );
      }
    },
  },
};

//Dirty Laundry (3052)
// Run any server. When that run ends, if it was successful, gain 5[c].
cardSet[3052] = {
  title: "Dirty Laundry",
  imageFile: "3052.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 2,
  Resolve: function (params) {
    SpendCredits(runner, 2, "play", this, function () {
      DecisionPhase(
        runner,
        ChoicesServers(),
        function (targetServer) {
          if (!targetServer) return;

          InitiateRun(targetServer, function (successful) {
            if (successful) {
              GainCredits(runner, 5, "event", this);
              Log("Dirty Laundry: Run was successful, gained 5[c].");
            }
          });
        },
        "Dirty Laundry",
        "Select a server to run:",
      );
    });
  },
};

//Daily Casts (3053)
// When you install this resource, load 8[c] onto it. When it is empty, trash it.
// When your turn begins, take 2[c] from this resource.
cardSet[3053] = {
  title: "Daily Casts",
  imageFile: "3053.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: [],
  installCost: 3,
  hostedCredits: 0,
  responseOnInstall: {
    automatic: true,
    Resolve: function () {
      this.hostedCredits = 8;
      Log("Daily Casts loaded with 8[c].");
    },
  },
  responseOnRunnerTurnBegins: {
    automatic: true,
    Resolve: function () {
      if (this.installed && this.hostedCredits > 0) {
        var takeAmount = Math.min(2, this.hostedCredits);
        this.hostedCredits -= takeAmount;
        GainCredits(runner, takeAmount, "resource", this);
        Log("Daily Casts: Took " + takeAmount + "[c] from card.");

        if (this.hostedCredits <= 0) {
          Log("Daily Casts is empty and was trashed.");
          Trash(this, false);
        }
      }
    },
  },
};

//Same Old Thing (3054)
// [click], [click], [trash]: Play an event from your heap (paying its play cost).
cardSet[3054] = {
  title: "Same Old Thing",
  imageFile: "3054.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "resource",
  subTypes: [],
  installCost: 0,
  abilities: [
    {
      text: "[click], [click], [trash]: Play an event from your heap.",
      Enumerate: function () {
        if (!this.installed || !CheckClicks(runner, 2)) return [];
        var eventsInHeap = ChoicesArrayCards(runner.heap.cards, function (c) {
          return CheckCardType(c, ["event"]);
        });
        if (eventsInHeap.length === 0) return [];
        return [{}];
      },
      Resolve: function () {
        var eventsInHeap = ChoicesArrayCards(runner.heap.cards, function (c) {
          return CheckCardType(c, ["event"]);
        });

        DecisionPhase(
          runner,
          eventsInHeap,
          function (selectedEvent) {
            if (selectedEvent) {
              SpendClicks(runner, 2);
              Trash(this, true);
              Log(
                "Same Old Thing trashed to play " +
                  GetTitle(selectedEvent) +
                  " from Heap.",
              );

              // Remove from heap and execute card's Resolve function
              var heapIndex = runner.heap.cards.indexOf(selectedEvent);
              if (heapIndex !== -1) {
                runner.heap.cards.splice(heapIndex, 1);
              }

              if (selectedEvent.Resolve) {
                selectedEvent.Resolve();
              }

              // Move event to Heap after resolution (unless removed from game by its own effect)
              if (selectedEvent.zone !== runner.removedFromGame) {
                MoveCard(selectedEvent, runner.heap);
              }
            }
          }.bind(this),
          "Same Old Thing",
          "Select an event from Heap to play:",
        );
      },
    },
  ],
};

//The Source (3055)
// The advancement requirement of all agendas is increased by 1.
// As an additional cost to steal an agenda, you must pay 3[c].
// Trash The Source when an agenda is scored or stolen.
cardSet[3055] = {
  title: "The Source",
  imageFile: "3055.png",
  player: runner,
  faction: "Neutral",
  influence: 2,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  modifyAdvancementRequirement: {
    Resolve: function (agendaCard) {
      if (this.installed) {
        return 1;
      }
      return 0;
    },
  },
  modifyStealCost: {
    Resolve: function (agendaCard) {
      if (this.installed) {
        return { credits: 3 };
      }
      return null;
    },
  },
  onScore: {
    Resolve: function () {
      if (this.installed) {
        Log("An agenda was scored; The Source is trashed.");
        Trash(this, false);
      }
    },
  },
  onSteal: {
    Resolve: function () {
      if (this.installed) {
        Log("An agenda was stolen; The Source is trashed.");
        Trash(this, false);
      }
    },
  },
};
