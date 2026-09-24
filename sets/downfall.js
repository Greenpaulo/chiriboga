//CARD DEFINITIONS FOR DOWNFALL
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
  player: runner,
  faction: "Anarch",
  influence: 4,
  cardType: "program",
  subTypes: ["Virus", "Trojan"],
  installCost: 2,
  memoryCost: 1,

  //Install only on a piece of ice.
  installOnlyOn: function (card) {
    if (!CheckCardType(card, ["ice"])) return false;
    return true;
  },

  //Host ice gets -1 strength for each hosted virus counter.
  modifyStrength: {
    Resolve: function (card) {
      //Only affect host ice, with null check for when host is trashed
      if (this.host && card == this.host) {
        return -Counters(this, "virus");
      }
      return 0; //no modification to strength
    },
  },

  //Whenever you encounter host ice, if its strength is 0 or less, trash it.
  //Otherwise, place 1 virus counter on this program.
  responseOnEncounter: {
    Enumerate: function (card) {
      //Only trigger when encountering host ice
      if (!CheckEncounter()) return [];
      if (!this.host) return [];
      if (attackedServer.ice[approachIce] != this.host) return [];
      return [{}]; //Mandatory trigger - one option
    },
    Resolve: function (params) {
      var hostIce = this.host;
      if (!hostIce) return; //Safety check
      var iceStrength = Strength(hostIce);

      if (iceStrength <= 0) {
        //Trash the host ice
        Log(GetTitle(this) + " trashes " + GetTitle(hostIce));
        Trash(hostIce, false);
        //End the encounter since the ice is gone
        //The runner will pass this position per CR rule 8.5.10
        encountering = false;
      } else {
        //Place 1 virus counter
        AddCounters(this, "virus", 1);
      }
    },
    text: "Chisel triggers",
    //Note: NOT automatic because Trash() causes phase changes for responseOnWouldTrash
  },

  //AI: Marks Chisel as a special breaker (non-icebreaker that deals with ice)
  AISpecialBreaker: true,

  //AI: Check if Chisel can handle specific ice (will trash it on encounter)
  AIMatchingBreakerInstalled: function (iceCard) {
    if (this.host && this.host == iceCard) {
      //Check if Chisel will trash the ice (strength <= 0 after virus reduction)
      var iceStrength = Strength(iceCard);
      if (iceStrength <= 0) {
        return this; //Chisel will trash this ice
      }
    }
    return null;
  },

  //AI: Prefer to install on high-value ice
  AIPreferredInstallChoice: function (choices) {
    //Don't install on ice that already has Chisel or similar trojans
    var htsi = runner.AI._highestThreatScoreIce(
      [this].concat(runner.AI._iceHostingSpecialBreakers()),
    );

    //Find the best target
    var bestIndex = -1;
    var bestValue = 0;

    for (var i = 0; i < choices.length; i++) {
      var targetIce = choices[i].host;
      if (!targetIce) continue;

      //Calculate value based on ice strength and rez cost
      var value = 0;

      //Prefer ice we know about (rezzed or known)
      if (targetIce.rezzed || targetIce.knownToRunner) {
        var iceStrength = Strength(targetIce);
        var iceCost = RezCost(targetIce);

        //Value based on how hard the ice is to deal with
        value = iceStrength + iceCost / 2;

        //Bonus for ice we can destroy quickly (low strength)
        if (iceStrength <= 3) {
          value += 3;
        }

        //Bonus for expensive ice
        if (iceCost >= 5) {
          value += 2;
        }
      } else {
        //Unknown ice - moderate value
        value = 2;
      }

      //Prefer the highest threat score ice if available
      if (targetIce == htsi) {
        value += 5;
      }

      if (value > bestValue) {
        bestValue = value;
        bestIndex = i;
      }
    }

    //Only install if we found a reasonable target
    if (bestValue >= 2) {
      return bestIndex;
    }

    return -1; //don't install if no good target
  },

  AIWorthKeeping: function (installedRunnerCards, spareMU) {
    //Worth keeping if there's rezzed ice to target
    var installedCorpCards = InstalledCards(corp);
    for (var i = 0; i < installedCorpCards.length; i++) {
      var card = installedCorpCards[i];
      if (CheckCardType(card, ["ice"]) && (card.rezzed || card.knownToRunner)) {
        return true;
      }
    }
    //Also worth keeping if there's any ice at all
    for (var i = 0; i < installedCorpCards.length; i++) {
      if (CheckCardType(installedCorpCards[i], ["ice"])) {
        return true;
      }
    }
    return false;
  },
};

//Rezeki (26026)
//Shaper Program, cost 2, MU 1, influence 1
//When your turn begins, gain 1 credit.
cardSet[26026] = {
  title: "Rezeki",
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

  //Helper function to check if ice is fully broken and trigger credit gain
  _checkFullyBroken: function () {
    if (this.hasFullyBrokenThisTurn) return; //Already triggered this turn
    if (!CheckEncounter()) return;
    //Check if all subroutines are broken
    if (!CheckUnbrokenSubroutines()) {
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

  //Reset strength boost when encounter ends
  responseOnEncounterEnds: {
    Resolve: function () {
      this.strengthBoost = 0;
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
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 2,
  Enumerate: function () {
    return ChoicesArrayCards(runner.rig.resources);
  },
  Resolve: function (params) {
    if (params && params.card) {
      Log(GetTitle(this) + " trashes " + GetTitle(params.card));
      Trash(params.card, false);
    }
    GainCredits(runner, 7, "", this);
  },
};

//Demolisher (26002)
// +1[mu]
// The trash cost of each Corp card is lowered by 1[c].
// The first time each turn you trash a Corp card, gain 1[c].
// Limit 1 console per player.
cardSet[26002] = {
  title: "Demolisher",
  imageFile: "26002.png",
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
  modifyTrashCost: {
    Resolve: function (card) {
      if (card && card.player == corp) return -1;
      return 0;
    },
  },
  responseOnTrash: {
    Resolve: function (card) {
      if (card && card.player == corp && !this.usedThisTurn) {
        this.usedThisTurn = true;
        Log(GetTitle(this) + " triggers, gaining 1[c]");
        GainCredits(runner, 1, "", this);
      }
    },
    automatic: true,
  },
};

//Stargate (26004)
// Once per turn → [click]: Run R&D. If successful, instead of breaching R&D, reveal the top 3 cards of R&D. Trash 1 of the revealed cards.
cardSet[26004] = {
  title: "Stargate",
  imageFile: "26004.png",
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "program",
  subTypes: [],
  installCost: 4,
  memoryCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Utae (26005)
// Interface → X[c]: Break X code gate subroutines. Use this ability only once per run.
// Interface → 1[c]: Break 1 code gate subroutine. Use this ability only if you have 3 or more installed virtual resources.
// 1[c]: +1 strength.
cardSet[26005] = {
  title: "Utae",
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

//Climactic Showdown (26006)
// When your turn begins, remove this resource from the game. Choose a server protected by ice. The Corp may trash 1 piece of ice protecting that server. If they do not, the first time this turn you breach either R&D or HQ, access 2 additional cards.
cardSet[26006] = {
  title: "Climactic Showdown",
  imageFile: "26006.png",
  player: runner,
  faction: "Anarch",
  influence: 5,
  cardType: "resource",
  subTypes: [],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Fencer Fueno (26007)
// When your turn begins and whenever you steal an agenda, place 1[c] on this resource.
// Whenever you make a successful run, you can spend hosted credits for the remainder of that run.
// When your turn ends, if there are 3 or more hosted credits, you must pay 1[c] or trash this resource.
cardSet[26007] = {
  title: "Fencer Fueno",
  imageFile: "26007.png",
  player: runner,
  faction: "Anarch",
  influence: 1,
  cardType: "resource",
  subTypes: ["Companion", "Virtual"],
  installCost: 0,
  // TODO: Add abilities or responseOn triggers
};

//The Nihilist (26008)
// The first time each turn you install a virus program, place 2 virus counters on this resource.
// When your turn begins, you may remove any 2 virus counters from your installed cards. If you do, draw 2 cards unless the Corp trashes the top card of R&D.
cardSet[26008] = {
  title: "The Nihilist",
  imageFile: "26008.png",
  player: runner,
  faction: "Anarch",
  influence: 5,
  cardType: "resource",
  subTypes: ["Connection", "Seedy"],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Trickster Taka (26009)
// When your turn begins and whenever you steal an agenda, place 1[c] on this resource.
// You can spend hosted credits to use programs during runs.
// When your turn ends, if there are 3 or more hosted credits, you must take 1 tag or trash this resource.
cardSet[26009] = {
  title: "Trickster Taka",
  imageFile: "26009.png",
  player: runner,
  faction: "Anarch",
  influence: 3,
  cardType: "resource",
  subTypes: ["Companion", "Stealth", "Virtual"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Az McCaffrey: Mechanical Prodigy (26010)
// The first job resource, connection resource, or piece of hardware you install each turn costs 1[c] less to install.
cardSet[26010] = {
  title: "Az McCaffrey: Mechanical Prodigy",
  imageFile: "26010.png",
  player: runner,
  faction: "Criminal",
  cardType: "identity",
  subTypes: ["Cyborg"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
};

//Always Have a Backup Plan (26011)
// Run any server. When that run ends, if it was unsuccessful, you may run the attacked server again, ignoring any additional costs to run. During the second run, whenever you encounter the last piece of ice you encountered during the first run, bypass it.
cardSet[26011] = {
  title: "Always Have a Backup Plan",
  imageFile: "26011.png",
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 2,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Blueberry!™ Diesel (26012)
// Look at the top 2 cards of your stack. You may add 1 of those cards to the bottom of your stack. Draw 2 cards.
cardSet[26012] = {
  title: "Blueberry!™ Diesel",
  imageFile: "26012.png",
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "event",
  subTypes: [],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Flip Switch (26013)
// Use this hardware only during your turn.
// [trash]: Jack out.
// [trash]: Remove 1 tag.
// [interrupt] → [trash]: Reduce the base trace strength of a trace to 0.
cardSet[26013] = {
  title: "Flip Switch",
  imageFile: "26013.png",
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "hardware",
  subTypes: [],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Lucky Charm (26014)
// [interrupt] → Remove this hardware from the game: Prevent a Corp card ability from ending the run. Use this ability only if you made a successful run on HQ this turn.
cardSet[26014] = {
  title: "Lucky Charm",
  imageFile: "26014.png",
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Chip"],
  installCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//Masterwork (v37) (26015)
// +1[mu]
// The first time each turn you install a piece of hardware, draw 1 card.
// Whenever a run begins, you may install 1 piece of hardware from your grip, paying 1[c] more.
// Limit 1 console per player.
cardSet[26015] = {
  title: "Masterwork (v37)",
  imageFile: "26015.png",
  player: runner,
  faction: "Criminal",
  influence: 4,
  cardType: "hardware",
  subTypes: ["Console"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//“Baklan” Bochkin (26017)
// The first time you encounter a piece of ice during each run, place 1 power counter on this resource.
// [trash], X hosted power counters: Derez the ice you are encountering if its strength is X or less. Take 1 tag.
cardSet[26017] = {
  title: "“Baklan” Bochkin",
  imageFile: "26017.png",
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//The Class Act (26018)
// When a discard phase ends, if you installed this resource this turn, draw 4 cards.
// [interrupt] → The first time each turn you would draw any number of cards, look at the top X cards of your stack. Add 1 of those cards to the bottom of your stack. X is equal to the number of cards you would draw plus 1.
cardSet[26018] = {
  title: "The Class Act",
  imageFile: "26018.png",
  player: runner,
  faction: "Criminal",
  influence: 5,
  cardType: "resource",
  subTypes: ["Connection", "Ritzy"],
  installCost: 4,
  // TODO: Add abilities or responseOn triggers
};

//Lat: Ethical Freelancer (26019)
// When your discard phase ends, if you have the same number of cards in your grip as the Corp has in HQ, you may draw 1 card.
cardSet[26019] = {
  title: "Lat: Ethical Freelancer",
  imageFile: "26019.png",
  player: runner,
  faction: "Shaper",
  cardType: "identity",
  subTypes: ["Natural"],
  deckSize: 45,
  influenceLimit: 15,
  link: 1,
};

//In the Groove (26020)
// Play only as your first [click].
// For the remainder of this turn, whenever you install a card with a printed install cost of 1[c] or greater, draw 1 card or gain 1[c].
cardSet[26020] = {
  title: "In the Groove",
  imageFile: "26020.png",
  player: runner,
  faction: "Shaper",
  influence: 4,
  cardType: "event",
  subTypes: ["Priority"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Khusyuk (26021)
// Run R&D. If successful, instead of breaching R&D, choose an install cost greater than 0[c]. The Corp sets aside the top X cards of R&D faceup, where X is equal to the number of your installed cards with that printed install cost, up to 6. Access 1 of the set-aside cards. The Corp shuffles the set-aside cards into R&D.
cardSet[26021] = {
  title: "Khusyuk",
  imageFile: "26021.png",
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Spec Work (26022)
// As an additional cost to play this event, trash 1 installed program.
// Gain 4[c] and draw 2 cards.
cardSet[26022] = {
  title: "Spec Work",
  imageFile: "26022.png",
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: ["Job"],
  playCost: 1,
  Enumerate: function () {
    return ChoicesArrayCards(runner.rig.programs);
  },
  Resolve: function (params) {
    if (params && params.card) {
      Log(GetTitle(this) + " trashes " + GetTitle(params.card));
      Trash(params.card, false);
    }
    GainCredits(runner, 4, "", this);
    Draw(runner, 2);
  },
};

//Supercorridor (26023)
// +2[mu]
// You get +1 maximum hand size.
// When your turn ends, if you and the Corp have the same number of credits, you may gain 2[c].
// Limit 1 console per player.
cardSet[26023] = {
  title: "Supercorridor",
  imageFile: "26023.png",
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
  responseOnRunnerTurnEnds: {
    Enumerate: function () {
      if (runner.creditPool == corp.creditPool) {
        return [
          { id: 1, label: "Gain 2 credits", button: "Gain 2[c]" },
          { id: 0, label: "Do not gain credits", button: "Pass" },
        ];
      }
      return [];
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
  installedTurnBonus: true,
  responseOnRunnerTurnEnds: {
    Resolve: function () {
      this.installedTurnBonus = false;
    },
    automatic: true,
  },
  responseOnCorpTurnEnds: {
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
  imageFile: "26025.png",
  player: runner,
  faction: "Shaper",
  influence: 3,
  cardType: "program",
  subTypes: ["Virus"],
  installCost: 1,
  memoryCost: 1,
  // TODO: Add abilities or responseOn triggers
};

//The Artist (26027)
// Once per turn → [click]: Gain 2[c].
// Once per turn → [click]: Install 1 program or piece of hardware from your grip, paying 1[c] less.
cardSet[26027] = {
  title: "The Artist",
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
  _discountActive: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.usedCreditThisTurn = false;
      this.usedInstallThisTurn = false;
      this._discountActive = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.usedCreditThisTurn = false;
      this.usedInstallThisTurn = false;
      this._discountActive = false;
    },
    automatic: true,
  },
  modifyInstallCost: {
    Resolve: function (card) {
      if (
        this._discountActive &&
        card &&
        CheckCardType(card, ["program", "hardware"])
      ) {
        return -1;
      }
      return 0;
    },
  },
  abilities: [
    {
      text: "[click]: Gain 2[c].",
      Enumerate: function () {
        if (this.usedCreditThisTurn) return [];
        if (!CheckClicks(runner, 1)) return [];
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
      Enumerate: function () {
        if (this.usedInstallThisTurn) return [];
        if (!CheckClicks(runner, 1)) return [];
        var choices = ChoicesHandInstall(runner, function (card) {
          return CheckCardType(card, ["program", "hardware"]);
        });
        return choices;
      },
      Resolve: function (params) {
        SpendClicks(runner, 1);
        this.usedInstallThisTurn = true;
        var cardRef = this;
        cardRef._discountActive = true;
        Install(params.card, params.host, false, null, true, function () {
          cardRef._discountActive = false;
        });
      },
    },
  ],
};

//Direct Access (26028)
// While you are resolving this event, each playerʼs identity loses all abilities.
// Run any server. When that run ends, you may shuffle this event into your stack.
cardSet[26028] = {
  title: "Direct Access",
  imageFile: "26028.png",
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "event",
  subTypes: ["Run"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Rejig (26029)
// As an additional cost to play this event, add 1 installed program or piece of hardware to your grip.
// Install 1 program or piece of hardware from your grip, paying X[c] less. X is equal to the printed install cost of the card you added to your grip.
cardSet[26029] = {
  title: "Rejig",
  imageFile: "26029.png",
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "event",
  subTypes: ["Mod"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Whistleblower (26030)
// Whenever you make a successful run, you may trash this resource to choose a card name. The next time this run you access an agenda with the chosen name, steal it, ignoring all costs. (You are no longer accessing it.)
cardSet[26030] = {
  title: "Whistleblower",
  imageFile: "26030.png",
  player: runner,
  faction: "Neutral",
  influence: 1,
  cardType: "resource",
  subTypes: ["Connection"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//MirrorMorph: Endless Iteration (26031)
// If the first, second, and third actions you take on your turn are each different from one another, when the third action completes, you may gain 1[c] or take another different action, paying [click] less.
cardSet[26031] = {
  title: "MirrorMorph: Endless Iteration",
  imageFile: "26031.png",
  player: corp,
  faction: "Haas-Bioroid",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
};

//Architect Deployment Test (26032)
// When you score this agenda, look at the top 5 cards of R&D. You may install and rez 1 of those cards, ignoring all costs.
cardSet[26032] = {
  title: "Architect Deployment Test",
  imageFile: "26032.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 4,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Calvin B4L3Y (26033)
// Once per turn → [click]: Draw 2 cards.
// When the Runner trashes this asset, you may draw 2 cards.
cardSet[26033] = {
  title: "Calvin B4L3Y",
  imageFile: "26033.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: ["Bioroid"],
  rezCost: 0,
  trashCost: 3,
  unique: true,
  usedThisTurn: false,
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
        if (!CheckClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this.usedThisTurn = true;
        Draw(corp, 2);
      },
    },
  ],
  responseOnTrash: {
    Enumerate: function () {
      return [
        { id: 1, label: "Draw 2 cards", button: "Draw 2" },
        { id: 0, label: "Do not draw", button: "Pass" },
      ];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        Draw(corp, 2);
      }
    },
    text: "Calvin B4L3Y trashed: draw 2 cards?",
  },
};

//Nanoetching Matrix (26034)
// Once per turn → [click]: Gain 2[c].
// When the Runner trashes this asset, you may gain 2[c].
cardSet[26034] = {
  title: "Nanoetching Matrix",
  imageFile: "26034.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "asset",
  subTypes: ["Industrial"],
  rezCost: 0,
  trashCost: 3,
  usedThisTurn: false,
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
        if (!CheckClicks(corp, 1)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        this.usedThisTurn = true;
        GainCredits(corp, 2, "", this);
      },
    },
  ],
  responseOnTrash: {
    Enumerate: function () {
      return [
        { id: 1, label: "Gain 2 credits", button: "Gain 2[c]" },
        { id: 0, label: "Do not gain credits", button: "Pass" },
      ];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        GainCredits(corp, 2, "", this);
      }
    },
    text: "Nanoetching Matrix trashed: gain 2[c]?",
  },
};

//Hagen (26035)
// This ice gets −1 strength for each installed icebreaker.
// ↳ Trash 1 installed program that is not a decoder, fracter, or killer.
// ↳ End the run.
cardSet[26035] = {
  title: "Hagen",
  imageFile: "26035.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "ice",
  subTypes: ["Barrier", "Destroyer"],
  rezCost: 4,
  strength: 6,
  modifyStrength: {
    Resolve: function (card) {
      if (card == this) {
        var breakers = 0;
        for (var i = 0; i < runner.rig.programs.length; i++) {
          if (CheckSubType(runner.rig.programs[i], "Icebreaker")) {
            breakers++;
          }
        }
        return -breakers;
      }
      return 0;
    },
  },
  subroutines: [
    {
      text: "Trash 1 installed program that is not a decoder, fracter, or killer.",
      Resolve: function () {
        var choices = ChoicesInstalledCards(runner, function (card) {
          if (!CheckCardType(card, ["program"])) return false;
          if (
            CheckSubType(card, "Decoder") ||
            CheckSubType(card, "Fracter") ||
            CheckSubType(card, "Killer")
          ) {
            return false;
          }
          return true;
        });
        if (choices.length > 0) {
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
            "Choose a non-icebreaker program to trash",
            this,
            "trash",
          );
        }
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
    result.sr = [[["trashProgram"]], [["endTheRun"]]];
    return result;
  },
};

//Fully Operational (26036)
// Gain 2[c] or draw 2 cards. Repeat this process for each remote server that has a card in its root and is protected by ice.
cardSet[26036] = {
  title: "Fully Operational",
  imageFile: "26036.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "operation",
  subTypes: [],
  playCost: 1,
  Resolve: function (params) {
    var validServers = 0;
    for (var i = 0; i < corp.remoteServers.length; i++) {
      var s = corp.remoteServers[i];
      if (s.root.length > 0 && s.ice.length > 0) {
        validServers++;
      }
    }
    var totalTimes = 1 + validServers;
    var currentIteration = 0;
    var cardRef = this;
    function promptChoice() {
      currentIteration++;
      DecisionPhase(
        corp,
        [
          { id: 1, label: "Gain 2 credits", button: "Gain 2[c]" },
          { id: 2, label: "Draw 2 cards", button: "Draw 2" },
        ],
        function (p) {
          if (p.id === 1) {
            GainCredits(corp, 2, "", cardRef);
          } else {
            Draw(corp, 2);
          }
          if (currentIteration < totalTimes) {
            promptChoice();
          }
        },
        "Fully Operational (" + currentIteration + "/" + totalTimes + ")",
        "Choose to gain 2[c] or draw 2 cards",
        cardRef,
      );
    }
    promptChoice();
  },
};

//Red Level Clearance (26037)
// Resolve 2 of the following in any order: Draw 2 cards. Gain 2[c]. Install 1 non-agenda card from HQ. Gain [click].
cardSet[26037] = {
  title: "Red Level Clearance",
  imageFile: "26037.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "operation",
  subTypes: ["Transaction"],
  playCost: 1,
  Resolve: function (params) {
    var cardRef = this;
    var chosenOptions = [];
    function chooseNextEffect(stepNum) {
      var choices = [];
      if (!chosenOptions.includes("draw"))
        choices.push({ id: "draw", label: "Draw 2 cards", button: "Draw 2" });
      if (!chosenOptions.includes("credits"))
        choices.push({
          id: "credits",
          label: "Gain 2 credits",
          button: "Gain 2[c]",
        });
      if (!chosenOptions.includes("click"))
        choices.push({
          id: "click",
          label: "Gain 1 click",
          button: "+1 Click",
        });
      if (!chosenOptions.includes("install")) {
        var hasNonAgenda = corp.HQ.cards.some(function (c) {
          return c.cardType !== "agenda";
        });
        if (hasNonAgenda) {
          choices.push({
            id: "install",
            label: "Install 1 non-agenda card from HQ",
            button: "Install Card",
          });
        }
      }
      DecisionPhase(
        corp,
        choices,
        function (p) {
          chosenOptions.push(p.id);
          if (p.id === "draw") {
            Draw(corp, 2);
            if (stepNum === 1) chooseNextEffect(2);
          } else if (p.id === "credits") {
            GainCredits(corp, 2, "", cardRef);
            if (stepNum === 1) chooseNextEffect(2);
          } else if (p.id === "click") {
            GainClicks(corp, 1);
            if (stepNum === 1) chooseNextEffect(2);
          } else if (p.id === "install") {
            var installChoices = ChoicesHandInstall(corp, function (c) {
              return c.cardType !== "agenda";
            });
            DecisionPhase(
              corp,
              installChoices,
              function (instP) {
                Install(instP.card, instP.server);
                if (stepNum === 1) chooseNextEffect(2);
              },
              "Red Level Clearance",
              "Choose non-agenda card from HQ to install",
              cardRef,
              "install",
            );
          }
        },
        "Red Level Clearance (" + stepNum + "/2)",
        "Choose effect " + stepNum + " of 2",
        cardRef,
      );
    }
    chooseNextEffect(1);
  },
};

//Cold Site Server (26038)
// [click]: Place 1 power counter on this upgrade.
// As an additional cost to run this server, the Runner must spend [click] and 1[c] for each hosted power counter.
// When your turn begins, remove all hosted power counters.
cardSet[26038] = {
  title: "Cold Site Server",
  imageFile: "26038.png",
  player: corp,
  faction: "Haas-Bioroid",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Facility"],
  rezCost: 0,
  trashCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Hyoubu Institute: Absolute Clarity (26039)
// The first time each turn you reveal a card, gain 1[c].
// [click]: Reveal 1 card from the grip at random or the top card of the stack.
cardSet[26039] = {
  title: "Hyoubu Institute: Absolute Clarity",
  imageFile: "26039.png",
  player: corp,
  faction: "Jinteki",
  cardType: "identity",
  subTypes: ["Division"],
  deckSize: 45,
  influenceLimit: 15,
};

//Project Yagi-Uda (26040)
// When you score this agenda, place 1 agenda counter on it for each hosted advancement counter past 3.
// Hosted agenda counter: Swap 1 card from HQ with 1 card in the root of or protecting the attacked server. The Runner may jack out. Use this ability only during a run.
cardSet[26040] = {
  title: "Project Yagi-Uda",
  imageFile: "26040.png",
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 3,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

//Sting! (26041)
// When a player scores or steals this agenda, do X net damage. X is equal to 1 plus the number of copies of Sting! in the other playerʼs score area.
cardSet[26041] = {
  title: "Sting!",
  imageFile: "26041.png",
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Ambush"],
  advancementRequirement: 3,
  agendaPoints: 1,
  // onScore: { Resolve: function () { ... } },
};

//Public Health Portal (26042)
// When your turn begins, reveal the top card of R&D and gain 2[c].
cardSet[26042] = {
  title: "Public Health Portal",
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
      if (!this.rezzed) return;
      if (corp.RnD.cards.length > 0) {
        var top = corp.RnD.cards[corp.RnD.cards.length - 1];
        Log("Public Health Portal reveals top of R&D: " + GetTitle(top));
      }
      GainCredits(corp, 2, "", this);
      Log("Public Health Portal: Corp gains 2[c]");
    },
    automatic: true,
  },
};

//Storgotic Resonator (26043)
// The first time each turn you trash a card that matches the faction of the Runnerʼs identity (from any location), place 1 power counter on this asset.
// [click], hosted power counter: Do 1 net damage.
cardSet[26043] = {
  title: "Storgotic Resonator",
  imageFile: "26043.png",
  player: corp,
  faction: "Jinteki",
  influence: 2,
  cardType: "asset",
  subTypes: ["Hostile"],
  rezCost: 2,
  trashCost: 2,
  // NOTE: "first time you trash a card matching Runner faction" needs a global trash hook
  // not currently in engine. Counter placement omitted; click ability implemented.
  abilities: [
    {
      text: "[click], hosted power counter: Do 1 net damage.",
      Enumerate: function () {
        if (!this.rezzed) return [];
        if (!CheckClicks(corp, 1)) return [];
        if (Counters(this, "power") < 1) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 1);
        AddCounters(this, "power", -1);
        Log("Storgotic Resonator: doing 1 net damage");
        Damage("net", 1, true);
      },
    },
  ],
};

//Saisentan (26044)
// When the Runner encounters this ice, choose a card type. For the remainder of the encounter, whenever you trash a card of the chosen type with net damage from a subroutine on this ice, do 1 net damage.
// ↳ Do 1 net damage.
// ↳ Do 1 net damage.
// ↳ Do 1 net damage.
cardSet[26044] = {
  title: "Saisentan",
  imageFile: "26044.png",
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "AP", "Observer"],
  rezCost: 5,
  strength: 2,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Complete Image (26045)
// Play only if the Runner has 3 or more agenda points and they made a successful run during their last turn.
// After you resolve this operation, your action phase ends.
// Choose a card name, then do 1 net damage. If you trash a card with the chosen name this way, repeat this process.
cardSet[26045] = {
  title: "Complete Image",
  imageFile: "26045.png",
  player: corp,
  faction: "Jinteki",
  influence: 4,
  cardType: "operation",
  subTypes: ["Terminal", "Gray Ops"],
  playCost: 4,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Letheia Nisei (26046)
// The first time the Runner approaches this server during each run, play a Psi Game. (Players secretly bid 0–2[c]. Then each player reveals and spends their bid.) If the bids differ, you may trash this upgrade. If you do, the Runner moves to the outermost position of this server. They may jack out.
cardSet[26046] = {
  title: "Letheia Nisei",
  imageFile: "26046.png",
  player: corp,
  faction: "Jinteki",
  influence: 3,
  cardType: "upgrade",
  subTypes: ["Psi", "Clone"],
  rezCost: 1,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Remastered Edition (26047)
// When you score this agenda, place 1 agenda counter on it.
// Hosted agenda counter: Place 1 advancement counter on an installed card.
cardSet[26047] = {
  title: "Remastered Edition",
  imageFile: "26047.png",
  player: corp,
  faction: "NBN",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Expansion"],
  advancementRequirement: 4,
  agendaPoints: 2,
  onScore: {
    Resolve: function () {
      AddCounters(this, "agenda", 1);
      Log("Remastered Edition scored: placed 1 agenda counter");
    },
  },
  abilities: [
    {
      text: "Hosted agenda counter: Place 1 advancement counter on an installed card.",
      Enumerate: function () {
        if (Counters(this, "agenda") < 1) return [];
        var choices = ChoicesInstalledCards(corp, function (card) {
          return true;
        });
        if (choices.length === 0) return [];
        return choices;
      },
      Resolve: function (params) {
        if (params && params.card) {
          AddCounters(this, "agenda", -1);
          AddCounters(params.card, "advancement", 1);
          Log(
            "Remastered Edition: placed 1 advancement counter on " +
              GetTitle(params.card),
          );
        }
      },
    },
  ],
};

//Daily Quest (26048)
// Rez only during your action phase.
// Whenever the Runner makes a successful run on this server, they gain 2[c].
// When your turn begins, if the Runner did not make a successful run on this server during their last turn, gain 3[c].
cardSet[26048] = {
  title: "Daily Quest",
  imageFile: "26048.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "asset",
  subTypes: [],
  rezCost: 1,
  trashCost: 3,
  runnerRanThisServerLastTurn: false,
  runnerRanThisServerThisTurn: false,
  canBeRezzed: function () {
    return (
      currentPhase &&
      (currentPhase.identifier == "Corp 2.2" ||
        currentPhase == phases.corpActionMain)
    );
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      if (this.rezzed && attackedServer == GetServer(this)) {
        this.runnerRanThisServerThisTurn = true;
        Log(
          "Daily Quest: Runner made successful run on this server, gaining 2[c]",
        );
        GainCredits(runner, 2, "", this);
      }
    },
    automatic: true,
  },
  responseOnRunnerTurnEnds: {
    Resolve: function () {
      this.runnerRanThisServerLastTurn = this.runnerRanThisServerThisTurn;
      this.runnerRanThisServerThisTurn = false;
    },
    automatic: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      if (this.rezzed && !this.runnerRanThisServerLastTurn) {
        Log(
          GetTitle(this) +
            " triggers (no successful run last turn), gaining 3[c]",
        );
        GainCredits(corp, 3, "", this);
      }
    },
    automatic: true,
  },
};

//Tiered Subscription (26049)
// The first time each turn a run begins, gain 1[c].
cardSet[26049] = {
  title: "Tiered Subscription",
  imageFile: "26049.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "asset",
  subTypes: ["Advertisement"],
  rezCost: 0,
  trashCost: 3,
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
  automaticOnRunBegins: {
    Resolve: function () {
      if (this.rezzed && !this.usedThisTurn) {
        this.usedThisTurn = true;
        Log(GetTitle(this) + " triggers on run, gaining 1[c]");
        GainCredits(corp, 1, "", this);
      }
    },
  },
};

//Congratulations! (26050)
// When the Runner passes this ice, gain 1[c].
// ↳ Gain 2[c]. The Runner gains 1[c].
cardSet[26050] = {
  title: "Congratulations!",
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
      if (
        attackedServer &&
        attackedServer.ice &&
        attackedServer.ice[approachIce] == this
      ) {
        Log("Congratulations! passed, Corp gains 1[c]");
        GainCredits(corp, 1, "", this);
      }
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "Gain 2[c]. The Runner gains 1[c].",
      Resolve: function () {
        GainCredits(corp, 2, "", this);
        GainCredits(runner, 1, "", this);
      },
      visual: { y: 94, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["gainCreditsCorp"], ["gainCreditsRunner"]]];
    return result;
  },
};

//Loot Box (26051)
// ↳ End the run unless the Runner pays 2[c].
// ↳ Reveal the top 3 cards of the stack. Add 1 of those cards to the grip and gain X[c], where X is equal to that cardʼs play or install cost. The Runner shuffles the stack. Trash this ice.
cardSet[26051] = {
  title: "Loot Box",
  imageFile: "26051.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "ice",
  subTypes: ["Trap"],
  rezCost: 0,
  strength: 3,
  subroutines: [
    {
      text: "End the run unless the Runner pays 2[c].",
      Resolve: function () {
        if (CheckCredits(runner, 2)) {
          DecisionPhase(
            runner,
            [
              { id: 1, label: "Pay 2 credits", button: "Pay 2[c]" },
              { id: 0, label: "End the run", button: "End run" },
            ],
            function (p) {
              if (p.id === 1) {
                SpendCredits(runner, 2, "paying to continue", this);
              } else {
                EndTheRun();
              }
            },
            "Loot Box",
            "Pay 2[c] to avoid ending the run?",
            this,
          );
        } else {
          EndTheRun();
        }
      },
      visual: { y: 59, h: 16 },
    },
    {
      text: "Reveal top 3 cards of stack, add 1 to grip and gain X[c] (cost of card). Runner shuffles. Trash this ice.",
      Resolve: function () {
        var cardsToReveal = Math.min(3, runner.stack.cards.length);
        var cardRef = this;
        if (cardsToReveal > 0) {
          var revealed = [];
          for (var i = 0; i < cardsToReveal; i++) {
            revealed.push(
              runner.stack.cards[runner.stack.cards.length - 1 - i],
            );
          }
          var choices = ChoicesArrayCards(revealed);
          DecisionPhase(
            runner,
            choices,
            function (params) {
              if (params && params.card) {
                var chosen = params.card;
                MoveCard(chosen, runner.grip);
                var cost =
                  typeof chosen.playCost !== "undefined"
                    ? chosen.playCost
                    : typeof chosen.installCost !== "undefined"
                      ? chosen.installCost
                      : 0;
                if (typeof cost === "number" && cost > 0) {
                  GainCredits(runner, cost, "", cardRef);
                }
              }
              Shuffle(runner.stack);
              Trash(cardRef, false);
            },
            "Loot Box",
            "Choose 1 revealed card to add to grip",
            this,
          );
        } else {
          Trash(cardRef, false);
        }
      },
      visual: { y: 106, h: 80 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["endTheRun"]], [["trashProgram"]]];
    return result;
  },
};

//Focus Group (26052)
// Play only if the Runner made a successful run during their last turn.
// Choose a card type, then reveal the grip. Choose a value for X equal to or less than the number of revealed cards of the chosen type. You may pay X[c] to place X advancement counters on 1 installed card.
cardSet[26052] = {
  title: "Focus Group",
  imageFile: "26052.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: [],
  playCost: 3,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Game Over (26053)
// Play only if the Runner stole an agenda during their last turn.
// Choose a Runner card type. Trash all installed non-icebreaker cards of the chosen type. For each card that would be trashed this way, the Runner may pay 3[c] to prevent that card from being trashed.
// Take 1 bad publicity.
cardSet[26053] = {
  title: "Game Over",
  imageFile: "26053.png",
  player: corp,
  faction: "NBN",
  influence: 3,
  cardType: "operation",
  subTypes: ["Illicit", "Gray Ops"],
  playCost: 4,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Increased Drop Rates (26054)
// While the Runner is accessing this upgrade in R&D, they must reveal it.
// When the Runner accesses this upgrade, remove 1 bad publicity unless they take 1 tag.
cardSet[26054] = {
  title: "Increased Drop Rates",
  imageFile: "26054.png",
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "upgrade",
  subTypes: ["Ambush"],
  rezCost: 0,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Divested Trust (26055)
// Whenever the Runner steals another agenda, you may forfeit this agenda to gain 5[c] and add the stolen agenda to HQ.
cardSet[26055] = {
  title: "Divested Trust",
  imageFile: "26055.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 3,
  agendaPoints: 1,
  // onScore: { Resolve: function () { ... } },
};

//SDS Drone Deployment (26056)
// As an additional cost to steal this agenda, the Runner must trash 1 installed program.
// When you score this agenda, trash 1 installed program.
cardSet[26056] = {
  title: "SDS Drone Deployment",
  imageFile: "26056.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Security"],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//Roughneck Repair Squad (26057)
// [click][click][click]: Gain 6[c]. You may remove 1 bad publicity.
cardSet[26057] = {
  title: "Roughneck Repair Squad",
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
        if (!CheckClicks(corp, 3)) return [];
        return [{}];
      },
      Resolve: function () {
        SpendClicks(corp, 3);
        GainCredits(corp, 6, "", this);
        if (corp.badPublicity > 0) {
          DecisionPhase(
            corp,
            [
              {
                id: 1,
                label: "Remove 1 bad publicity",
                button: "Remove Bad Pub",
              },
              { id: 0, label: "Do not remove", button: "Pass" },
            ],
            function (p) {
              if (p && p.id === 1) {
                corp.badPublicity = Math.max(0, corp.badPublicity - 1);
                Log("1 bad publicity removed");
              }
            },
            "Roughneck Repair Squad",
            "Remove 1 bad publicity?",
            this,
          );
        }
      },
    },
  ],
};

//Afshar (26058)
// While this ice is protecting HQ, the Runner cannot break more than 1 of its printed subroutines during each encounter.
// ↳ The Runner loses 2[c].
// ↳ End the run.
cardSet[26058] = {
  title: "Afshar",
  imageFile: "26058.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Code Gate"],
  rezCost: 3,
  strength: 1,
  brokenCount: 0,
  responseOnEncounter: {
    Resolve: function () {
      this.brokenCount = 0;
    },
    automatic: true,
  },
  responseOnSubroutineBroken: {
    Resolve: function () {
      if (
        attackedServer &&
        attackedServer == corp.HQ &&
        attackedServer.ice &&
        attackedServer.ice[approachIce] == this
      ) {
        this.brokenCount++;
        if (this.brokenCount >= 1) {
          for (var i = 0; i < this.subroutines.length; i++) {
            if (!this.subroutines[i].broken) {
              this.subroutines[i]._lockedFromBreak = true;
            }
          }
        }
      }
    },
    automatic: true,
  },
  responseOnEncounterEnds: {
    Resolve: function () {
      this.brokenCount = 0;
      for (var i = 0; i < this.subroutines.length; i++) {
        delete this.subroutines[i]._lockedFromBreak;
      }
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "The Runner loses 2[c].",
      Resolve: function () {
        LoseCredits(runner, 2);
      },
      visual: { y: 124, h: 16 },
    },
    {
      text: "End the run.",
      Resolve: function () {
        EndTheRun();
      },
      visual: { y: 144, h: 16 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["loseCreditsRunner"]], [["endTheRun"]]];
    return result;
  },
};

//Sandstone (26059)
// When the Runner encounters this ice, place 1 virus counter on it.
// This ice gets −1 strength for each hosted virus counter.
// ↳ End the run.
cardSet[26059] = {
  title: "Sandstone",
  imageFile: "26059.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 2,
  cardType: "ice",
  subTypes: ["Barrier"],
  rezCost: 3,
  strength: 6,
  responseOnEncounter: {
    Resolve: function () {
      Log("Sandstone: placing 1 virus counter (strength -1)");
      AddCounters(this, "virus", 1);
    },
    automatic: true,
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
  imageFile: "26060.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "ice",
  subTypes: ["Sentry", "Illicit", "Destroyer", "Tracer"],
  rezCost: 7,
  strength: 6,
  _cannotStealTrashActive: false,
  responseOnRez: {
    Resolve: function () {
      Log("Trebuchet rezzed: Corp takes 1 bad publicity");
      AddBadPublicity(1);
    },
    automatic: true,
  },
  modifyCannot: {
    Resolve: function (id, card) {
      if (this._cannotStealTrashActive && (id === "steal" || id === "trash")) {
        return true;
      }
      return false;
    },
  },
  responseOnRunEnds: {
    Resolve: function () {
      this._cannotStealTrashActive = false;
    },
    automatic: true,
  },
  subroutines: [
    {
      text: "Trash 1 installed Runner card.",
      Resolve: function () {
        var choices = ChoicesInstalledCards(runner, function (card) {
          return CheckTrash(card);
        });
        if (choices.length > 0) {
          DecisionPhase(
            corp,
            choices,
            function (params) {
              if (params && params.card) {
                Log("Trebuchet trashes " + GetTitle(params.card));
                Trash(params.card, true);
              }
            },
            "Trebuchet",
            "Choose an installed Runner card to trash",
            this,
            "trash",
          );
        }
      },
      visual: { y: 94, h: 16 },
    },
    {
      text: "Trace[6]. If successful, the Runner cannot steal or trash Corp cards for the remainder of this run.",
      Resolve: function () {
        var cardRef = this;
        Trace(6, function (successful) {
          if (successful) {
            cardRef._cannotStealTrashActive = true;
            Log(
              "Trebuchet trace successful: Runner cannot steal or trash Corp cards for remainder of run",
            );
          }
        });
      },
      visual: { y: 129, h: 48 },
    },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    result.sr = [[["trashProgram"]], [["trace"]]];
    return result;
  },
};

//Secure and Protect (26061)
// As an additional cost to play this operation, spend [click].
// Search R&D for 1 piece of ice and reveal it. (Shuffle R&D after searching it.) Install that ice protecting a central server, paying 3[c] less.
cardSet[26061] = {
  title: "Secure and Protect",
  imageFile: "26061.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "operation",
  subTypes: ["Double"],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Reduced Service (26062)
// When you rez this upgrade, you may pay up to 4[c] to place that many power counters on it.
// As an additional cost to run this server, the Runner must pay 2[c] for each hosted power counter.
// Whenever the Runner makes a successful run on a central server, remove 1 hosted power counter.
cardSet[26062] = {
  title: "Reduced Service",
  imageFile: "26062.png",
  player: corp,
  faction: "Weyland Consortium",
  influence: 3,
  cardType: "upgrade",
  subTypes: [],
  rezCost: 0,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Vulnerability Audit (26063)
// You cannot score this agenda if it was installed this turn.
cardSet[26063] = {
  title: "Vulnerability Audit",
  imageFile: "26063.png",
  player: corp,
  faction: "Neutral",
  influence: 1,
  cardType: "agenda",
  subTypes: ["Research"],
  advancementRequirement: 4,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//CSR Campaign (26064)
// When your turn begins, you may draw 1 card.
cardSet[26064] = {
  title: "CSR Campaign",
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
      return [
        { id: 1, label: "Draw 1 card", button: "Draw 1" },
        { id: 0, label: "Do not draw", button: "Pass" },
      ];
    },
    Resolve: function (params) {
      if (params && params.id === 1) {
        Log("CSR Campaign: Corp draws 1 card");
        Draw(corp, 1);
      }
    },
    text: "CSR Campaign: draw 1 card?",
  },
};

//Rime (26065)
// During runs against this server, you can rez this ice any time you could rez non-ice cards.
// Each piece of ice protecting this server gets +1 strength.
// ↳ The Runner loses 1[c].
cardSet[26065] = {
  title: "Rime",
  imageFile: "26065.png",
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "ice",
  subTypes: ["Mythic"],
  rezCost: 0,
  strength: 0,
  modifyStrength: {
    Resolve: function (card) {
      // Boost all other rezzed ice protecting the same server by +1
      if (card != this && this.rezzed && CheckCardType(card, ["ice"])) {
        var rimeServer = GetServer(this);
        if (rimeServer != null && GetServer(card) == rimeServer) {
          return 1;
        }
      }
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
    result.sr = [[["bankroll"]]]; // minor drain effect
    return result;
  },
};
