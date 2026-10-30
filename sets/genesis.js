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
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Anarch",
  influence: 2,
  cardType: "event",
  subTypes: ["Run", "Sabotage"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

// cardSet[2022] = Liberated Account - DUPLICATE: systemupdate2021.js has Liberated Account (card 31010)

//Satellite Uplink (2023)
// Expose up to 2 cards.
cardSet[2023] = {
  title: "Satellite Uplink",
  imageFile: "02023.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 3,
  cardType: "event",
  subTypes: [],
  playCost: 2,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//e3 Feedback Implants (2024)
// Whenever you break a subroutine on a piece of ice, you may pay 1[c] to break 1 subroutine on that ice.
cardSet[2024] = {
  title: "e3 Feedback Implants",
  imageFile: "02024.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 2,
  cardType: "hardware",
  subTypes: ["Mod"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Compromised Employee (2025)
// 1[recurring-c]
// Use this credit during traces.
// Gain 1[c] whenever the Corp rezzes a piece of ice.
cardSet[2025] = {
  title: "Compromised Employee",
  imageFile: "02025.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Criminal",
  influence: 1,
  cardType: "resource",
  subTypes: ["Connection", "Link"],
  installCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Notoriety (2026)
// Play only if you made a successful run on R&D, HQ, and Archives this turn.
// Add Notoriety to your score area as an agenda worth 1 agenda point.
cardSet[2026] = {
  title: "Notoriety",
  imageFile: "02026.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 1,
  cardType: "event",
  subTypes: [],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Snowball (2027)
// Interface → 1[c]: Break 1 barrier subroutine.
// 1[c]: +1 strength.
// Whenever you use this program to break a subroutine, this program gets +1 strength for the remainder of this run.
cardSet[2027] = {
  title: "Snowball",
  imageFile: "02027.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Shaper",
  influence: 2,
  cardType: "program",
  subTypes: ["Icebreaker", "Fracter"],
  installCost: 4,
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

//Dyson Mem Chip (2028)
// +1[mu], +1[link]
cardSet[2028] = {
  title: "Dyson Mem Chip",
  imageFile: "02028.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: runner,
  faction: "Neutral",
  influence: 0,
  cardType: "hardware",
  subTypes: ["Chip", "Link"],
  installCost: 3,
  // TODO: Add abilities or responseOn triggers
};

//Encryption Protocol (2029)
// The trash cost of all installed cards is increased by 1.
cardSet[2029] = {
  title: "Encryption Protocol",
  imageFile: "02029.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 1,
  cardType: "asset",
  subTypes: [],
  rezCost: 0,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Sherlock 1.0 (2030)
// Lose [click]: Break 1 subroutine on this ice. Only the Runner can use this ability.
// ↳ Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.
// ↳ Trace[4]. If successful, add 1 installed program to the top of the Runner's stack.
cardSet[2030] = {
  title: "Sherlock 1.0",
  imageFile: "02030.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Haas-Bioroid",
  influence: 2,
  cardType: "ice",
  subTypes: ["Sentry", "Bioroid", "Tracer"],
  rezCost: 6,
  strength: 5,
  subroutines: [
    // { text: "...", Resolve: function () { ... } },
  ],
  AIImplementIce: function (rc, result, maxCorpCred, incomplete) {
    // result.sr = [[["..."]]];
    return result;
  },
};

//Jinteki: Replicating Perfection (2031)
// The Runner cannot run on remote servers. Ignore this ability until the end of the turn whenever the Runner runs on a central server.
cardSet[2031] = {
  title: "Jinteki: Replicating Perfection",
  imageFile: "02031.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  cardType: "identity",
  subTypes: ["Megacorp"],
  deckSize: 45,
  influenceLimit: 15,
  // TODO: Add abilities or responseOn triggers
};

//Fetal AI (2032)
// While the Runner is accessing this agenda in R&D, they must reveal it.
// When the Runner accesses this agenda anywhere except in Archives, do 2 net damage.
// As an additional cost to steal this agenda, the Runner must pay 2[c].
cardSet[2032] = {
  title: "Fetal AI",
  imageFile: "02032.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 0,
  cardType: "agenda",
  subTypes: ["Ambush"],
  advancementRequirement: 5,
  agendaPoints: 2,
  // onScore: { Resolve: function () { ... } },
};

// cardSet[2033] = Trick of Light - DUPLICATE: systemupdate2021.js has Trick of Light (card 31058)

//Sensei (2034)
// ↳ For the remainder of this run, while the Runner is encountering another piece of ice, it gains "↳ End the run." after its other subroutines.
cardSet[2034] = {
  title: "Sensei",
  imageFile: "02034.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Jinteki",
  influence: 1,
  cardType: "ice",
  subTypes: ["Code Gate"],
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

//Big Brother (2035)
// Play only if the Runner is tagged.
// Give the Runner 2 tags.
cardSet[2035] = {
  title: "Big Brother",
  imageFile: "02035.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 1,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//ChiLo City Grid (2036)
// Whenever there is a successful trace during a run on this server, give the Runner 1 tag.
// Limit 1 region per server.
cardSet[2036] = {
  title: "ChiLo City Grid",
  imageFile: "02036.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "NBN",
  influence: 2,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 3,
  trashCost: 6,
  // TODO: Add abilities or responseOn triggers
};

//Power Grid Overload (2037)
// Play only if the Runner made a successful run during their last turn.
// Trace[2]. If successful, trash 1 installed piece of hardware with an install cost of X or less, where X is equal to the amount by which your trace strength exceeded the Runner's link strength.
cardSet[2037] = {
  title: "Power Grid Overload",
  imageFile: "02037.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "operation",
  subTypes: [],
  playCost: 1,
  Resolve: function (params) {
    // TODO: Implement effect
  },
};

//Amazon Industrial Zone (2038)
// Whenever you install a piece of ice protecting this server, you may immediately rez it, lowering its rez cost by 3.
// Limit 1 region per server.
cardSet[2038] = {
  title: "Amazon Industrial Zone",
  imageFile: "02038.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Weyland Consortium",
  influence: 1,
  cardType: "upgrade",
  subTypes: ["Region"],
  rezCost: 4,
  trashCost: 2,
  // TODO: Add abilities or responseOn triggers
};

//Executive Retreat (2039)
// When you score Executive Retreat, place 1 agenda counter on it and shuffle HQ into R&D.
// [click], hosted agenda counter: Draw 5 cards.
cardSet[2039] = {
  title: "Executive Retreat",
  imageFile: "02039.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "agenda",
  subTypes: [],
  advancementRequirement: 5,
  agendaPoints: 3,
  // onScore: { Resolve: function () { ... } },
};

//Freelancer (2040)
// Play only if the Runner is tagged.
// Trash up to 2 resources.
cardSet[2040] = {
  title: "Freelancer",
  imageFile: "02040.png",
  // TODO: Add the exact ELO from https://trash-or-busto.herokuapp.com/ranking
  player: corp,
  faction: "Neutral",
  influence: 0,
  cardType: "operation",
  subTypes: ["Gray Ops"],
  playCost: 0,
  Resolve: function (params) {
    // TODO: Implement effect
  },
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
  madeSuccessfulCentralRunThisTurn: false,
  responseOnRunnerTurnBegins: {
    Resolve: function () {
      this.madeSuccessfulCentralRunThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnCorpTurnBegins: {
    Resolve: function () {
      this.madeSuccessfulCentralRunThisTurn = false;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  responseOnRunSuccessful: {
    Resolve: function () {
      //central servers are the ones with a .cards pile
      if (attackedServer && typeof attackedServer.cards !== "undefined")
        this.madeSuccessfulCentralRunThisTurn = true;
    },
    automatic: true,
    availableWhenInactive: true,
  },
  installOnlyIf: function () {
    return this.madeSuccessfulCentralRunThisTurn;
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
      corp.RnD.cards[corp.RnD.cards.length - 1].knownToRunner = true;
      Log("Deep Thought: the Runner looks at the top card of R&D");
    },
    text: "Deep Thought: look at the top card of R&D",
  },
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
