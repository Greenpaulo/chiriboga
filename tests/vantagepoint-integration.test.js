// Run with: node tests/vantagepoint-integration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, 'carddata', 'carddata.json'), 'utf8'),
).data.filter((card) => card.pack_code === 'vp');

assert.strictEqual(metadata.length, 66, 'Vantage Point metadata count');

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  ChangeImageFileToJPG: (name) =>
    String(name).replace(/^(\d+)/, (digits) => digits.padStart(5, '0')).replace(/\.png$/i, '.jpg'),
  runner: {
    side: 'runner',
    AI: null,
    grip: [],
    stack: [],
    heap: [],
    resolvingCards: [],
    creditPool: 5,
    temporaryCredits: 0,
    clickTracker: 4,
  },
  corp: {
    side: 'corp',
    AI: null,
    HQ: {serverName: 'HQ', cards: [], root: [], ice: []},
    RnD: {serverName: 'R&D', cards: [], root: [], ice: []},
    archives: {serverName: 'Archives', cards: [], root: [], ice: []},
    remoteServers: [],
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'config.js'), 'utf8'),
  context,
  {filename: 'config.js'},
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'sets', 'vantagepoint.js'), 'utf8'),
  context,
  {filename: 'vantagepoint.js'},
);

const registry = context.setRegistry.availableSets.vantagepoint;
assert(registry, 'Vantage Point must be registered');
assert.strictEqual(registry.file, 'vantagepoint');
assert.strictEqual(registry.code, 'vp');
assert.deepStrictEqual(Array.from(registry.idRange), [36000, 36999]);
assert.strictEqual(registry.hidden, true, 'unfinished set must stay hidden');
assert.strictEqual(registry.untested, true, 'unfinished set must stay untested');
assert(context.setIdentifiers.includes('vp'), 'set identifier');

const metadataCodes = new Set(metadata.map((card) => Number(card.code)));
const definedCodes = [];
for (let code = registry.idRange[0]; code <= registry.idRange[1]; code++) {
  if (context.cardSet[code]) definedCodes.push(code);
}
assert.deepStrictEqual(definedCodes, Array.from(metadataCodes).sort((a, b) => a - b));

metadata.forEach((data) => {
  const code = Number(data.code);
  const card = context.cardSet[code];
  assert(card, 'missing definition for ' + data.code + ' ' + data.title);
  assert.strictEqual(card.title, data.title, data.code + ': title');
  assert.strictEqual(card.imageFile, data.code + '.png', data.code + ': image');
  assert(
    fs.existsSync(path.join(root, 'images', data.code + '.jpg')),
    data.code + ': local image',
  );
  assert.strictEqual(card.cardType, data.type_code, data.code + ': card type');
  assert(
    typeof card.elo === 'number' && Number.isFinite(card.elo),
    data.code + ': finite ELO',
  );
  assert(Array.isArray(card.subTypes), data.code + ': subtypes');

  if (data.type_code === 'identity') {
    assert(Number.isFinite(card.deckSize), data.code + ': deck size');
    assert(Number.isFinite(card.influenceLimit), data.code + ': influence limit');
  } else if (data.type_code === 'agenda') {
    assert(Number.isFinite(card.advancementRequirement), data.code + ': advancement');
    assert(Number.isFinite(card.agendaPoints), data.code + ': agenda points');
  } else {
    assert(Number.isFinite(card.influence), data.code + ': influence');
  }
});

['startup', 'standard', 'eternal'].forEach((format) => {
  assert(
    context.formatRegistry[format].sets.includes('vp'),
    format + ' must include Vantage Point',
  );
});

let installed = {runner: [], corp: []};
let decisions = [];
let trashCalls = [];
let creditsGained = 0;
let cardsDrawn = 0;

context.InstalledCards = (player) => installed[player.side];
context.ChoicesArrayCards = (cards, check) =>
  cards
    .filter((card) => !check || check(card))
    .map((card) => ({card, label: card.title}));
context.ChoicesInstalledCards = (player, check) =>
  context.ChoicesArrayCards(context.InstalledCards(player), check);
context.CheckTrash = (card) => card.trashable !== false;
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckSubType = (card, subtype) => card.subTypes.includes(subtype);
context.GetTitle = (card) => card.title;
context.DecisionPhase = (player, choices, callback, title, instruction, card) => {
  const decision = {
    player,
    choices,
    title,
    instruction,
    choose(params) {
      callback.call(card, params);
    },
  };
  decisions.push(decision);
  return decision;
};
context.Trash = (cards, canBePrevented, callback, callbackContext) => {
  const list = Array.isArray(cards) ? cards : [cards];
  trashCalls.push({cards: list, canBePrevented});
  if (callback) callback.call(callbackContext, list);
};
context.Log = () => {};
context.GainCredits = (player, amount) => {
  creditsGained += amount;
};
context.UpdateCounters = () => {};
context.Strength = (card) => card.currentStrength;
context.CheckEncounter = () => true;
context.CheckCredits = () => true;
context.CheckCounters = (card, type, amount) => (card[type] || 0) >= amount;
context.AddCounters = (card, type, amount) => {
  card[type] = (card[type] || 0) + amount;
};
context.RemoveCounters = (card, type, amount) => {
  card[type] = (card[type] || 0) - amount;
};
context.CheckAccessing = () => !!context.accessingCard;
context.TrashCost = (card) => card.trashCost;
context.TrashAccessedCard = (canBePrevented) => {
  trashCalls.push({cards: [context.accessingCard], canBePrevented});
};
context.Draw = (player, amount) => {
  cardsDrawn += amount;
};
context.InstallCost = (card) => card.installCost;
context.CheckStrength = () => true;
context.ChoicesEncounteredSubroutines = () => [{subroutine: {text: 'End the run'}}];
context.SpendCredits = (player, amount, doing, card, callback, callbackContext) =>
  callback.call(callbackContext);
context.Break = () => {};
context.GetServer = (card) => card.server || null;
context.PlaceCredits = (card, amount) => {
  card.credits = (card.credits || 0) + amount;
};
let activeCards = new Set();
context.CheckActive = (card) => activeCards.has(card);

const chainReaction = context.cardSet[36001];
chainReaction.responseOnRunSuccessful.Resolve.call(chainReaction, context.corp.HQ);
chainReaction.responseOnRunSuccessful.Resolve.call(chainReaction, context.corp.RnD);
chainReaction.responseOnRunSuccessful.Resolve.call(
  chainReaction,
  context.corp.archives,
);
assert.strictEqual(chainReaction.Enumerate.call(chainReaction).length, 1);
chainReaction.responseOnRunnerTurnBegins.Resolve.call(chainReaction);
assert.strictEqual(
  chainReaction.Enumerate.call(chainReaction).length,
  0,
  '36001 successful-central state resets each turn',
);
assert.strictEqual(
  chainReaction.responseOnRunSuccessful.availableWhenInactive,
  true,
  '36001 tracks successful runs while in the grip',
);
chainReaction.madeSuccessfulRunOnHQThisTurn = true;
chainReaction.responseOnCorpTurnBegins.Resolve.call(chainReaction);
assert.strictEqual(
  chainReaction.madeSuccessfulRunOnHQThisTurn,
  false,
  '36001 also resets when a Corp turn begins',
);

const corpCard1 = {title: 'Rezzed asset', cardType: 'asset', rezzed: true, trashCost: 4};
const corpCard2 = {title: 'Facedown card', cardType: 'asset', rezzed: false};
const protectedCorpCard = {
  title: 'Untrashable card',
  cardType: 'asset',
  trashable: false,
};
const runnerCard = {title: 'Runner program', cardType: 'program', installCost: 5};
installed = {
  corp: [corpCard1, corpCard2, protectedCorpCard],
  runner: [runnerCard],
};
decisions = [];
trashCalls = [];
chainReaction.Resolve.call(chainReaction, {});
assert.strictEqual(decisions.length, 1, '36001 first asks the Runner for Corp cards');
assert.strictEqual(
  decisions[0].choices.some((choice) => choice.card === protectedCorpCard),
  false,
  '36001 excludes cards that cannot be trashed',
);
decisions[0].choose({cards: [corpCard1, corpCard2]});
assert.deepStrictEqual(trashCalls[0].cards, [corpCard1, corpCard2]);
assert.strictEqual(trashCalls[0].canBePrevented, true);
assert.strictEqual(decisions.length, 2, '36001 waits for both Corp cards to trash');
decisions[1].choose({card: runnerCard});
assert.strictEqual(trashCalls[1].canBePrevented, true);
context.corp.AI = {};
decisions = [];
chainReaction._corpTrashRunnerCard.call(chainReaction);
assert.strictEqual(context.corp.AI.preferred.option.card, runnerCard);
assert.strictEqual(context.corp.AI.preferred.option.card.card, undefined);
context.corp.AI = null;

const takeADive = context.cardSet[36002];
let runTarget = null;
let badPublicityGained = 0;
let removedCard = null;
context.MakeRun = (server) => {
  runTarget = server;
  context.attackedServer = server;
};
context.AddBadPublicity = (amount) => {
  badPublicityGained += amount;
};
context.RemoveFromGame = (card) => {
  removedCard = card;
};
takeADive.Resolve.call(takeADive, {server: context.corp.RnD});
assert.strictEqual(runTarget, context.corp.RnD);
takeADive.responseOnRunSuccessful.Resolve.call(takeADive, context.corp.RnD);
assert.strictEqual(badPublicityGained, 0);
takeADive.automaticOnSubroutineFiring.Resolve.call(takeADive, {}, {});
context.attackedServer = context.corp.HQ;
takeADive.responseOnRunSuccessful.Resolve.call(takeADive, context.corp.RnD);
assert.strictEqual(badPublicityGained, 1, '36002 survives an attacked-server redirect');
takeADive.responseOnRunEnds.Resolve.call(takeADive);
assert.strictEqual(removedCard, takeADive, '36002 removes itself when its run ends');
assert.strictEqual(takeADive.AIRunEventExtraPotential.call(takeADive, context.corp.HQ), 0.3);
assert.strictEqual(takeADive.AIBreachNotRequired, true);

const tungstenTailor = context.cardSet[36003];
assert.strictEqual(tungstenTailor.unique, true, '36003 is unique');
const zeroStrengthIce = {
  title: 'Zero-strength ice',
  player: context.corp,
  cardType: 'ice',
  subTypes: ['Barrier'],
  currentStrength: 0,
};
context.attackedServer = {ice: [zeroStrengthIce]};
context.approachIce = 0;
assert.strictEqual(tungstenTailor.modifyStrength.Resolve.call(tungstenTailor, zeroStrengthIce), -1);
assert.strictEqual(tungstenTailor.AIReducesIceStrength.call(tungstenTailor, zeroStrengthIce), 1);
creditsGained = 0;
tungstenTailor.usedThisTurn = false;
tungstenTailor.responseOnSubroutineBroken.Resolve.call(tungstenTailor, {});
tungstenTailor.responseOnSubroutineBroken.Resolve.call(tungstenTailor, {});
assert.strictEqual(creditsGained, 1, '36003 pays only for the first break each turn');
tungstenTailor.responseOnCorpTurnBegins.Resolve.call(tungstenTailor);
tungstenTailor.responseOnSubroutineBroken.Resolve.call(tungstenTailor, {});
assert.strictEqual(creditsGained, 2, '36003 resets on the next turn');

const corsair = context.cardSet[36004];
const cloak = {title: 'Cloak', subTypes: ['Stealth'], credits: 1, recurringCredits: 1};
installed = {corp: [], runner: [corsair, cloak]};
context.attackedServer = {ice: [zeroStrengthIce]};
context.approachIce = 0;
corsair.barrierDebuff = 0;
assert.strictEqual(corsair.abilities[1].Enumerate.call(corsair).length, 1);
corsair.abilities[1].Resolve.call(corsair);
assert.strictEqual(cloak.credits, 0, '36004 spends the current hosted stealth credit');
assert.strictEqual(cloak.recurringCredits, 1, '36004 does not reduce recurring capacity');
assert.strictEqual(corsair.barrierDebuff, 3);
assert.strictEqual(corsair.abilities[1].Enumerate.call(corsair).length, 0);
corsair.responseOnEncounterEnds.Resolve.call(corsair);
assert.strictEqual(corsair.barrierDebuff, 0, '36004 clears its encounter reduction');
context.attackedServer = {
  ice: [{title: 'Code gate', subTypes: ['Code Gate'], currentStrength: 0}],
};
assert.strictEqual(
  corsair.abilities[1].Enumerate.call(corsair).length,
  0,
  '36004 cannot reduce non-barrier ice',
);
context.attackedServer = {ice: [zeroStrengthIce]};

cloak.credits = 1;
const point = {runner_credits_spent: 0, card_str_mods: []};
const iceAI = {ice: zeroStrengthIce, subTypes: ['Barrier']};
const fakeRunCalculator = {
  ImplementIcebreaker() {
    return [{kind: 'break'}];
  },
  StrModify(target, source, originalPoint, amount) {
    return {
      runner_credits_spent: originalPoint.runner_credits_spent,
      card_str_mods: originalPoint.card_str_mods.concat([
        {card: target, use: source, amt: amount},
      ]),
    };
  },
};
let paths = corsair.AIImplementBreaker.call(
  corsair,
  fakeRunCalculator,
  [],
  point,
  context.corp.HQ,
  0,
  iceAI,
  3,
  4,
  10,
);
assert.strictEqual(paths.length, 1);
assert.strictEqual(paths[0].card_str_mods[0].card, zeroStrengthIce);
assert.strictEqual(paths[0].card_str_mods[0].amt, -3);
paths = corsair.AIImplementBreaker.call(
  corsair,
  fakeRunCalculator,
  [],
  paths[0],
  context.corp.HQ,
  0,
  iceAI,
  3,
  4,
  9,
);
assert.strictEqual(paths.length, 0, '36004 AI cannot reuse one stealth credit');

const phaseSource = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
assert(
  phaseSource.includes('AutomaticTriggers("automaticOnSubroutineFiring"'),
  '36002 engine hook records a subroutine as it starts firing',
);

const lampades = context.cardSet[36005];
const ghostRunner = {
  title: 'Ghost Runner',
  player: context.runner,
  cardType: 'resource',
  subTypes: ['Stealth'],
  credits: 2,
};
installed = {corp: [], runner: [lampades, ghostRunner]};
lampades.power = 0;
lampades.automaticOnInstall.Resolve.call(lampades, lampades);
assert.strictEqual(lampades.power, 3, '36005 enters with 3 power counters');
context.accessingCard = {
  title: 'Expensive asset',
  player: context.corp,
  cardType: 'asset',
  subTypes: [],
  rezCost: 2,
  trashCost: 5,
};
assert.strictEqual(lampades.abilities[0].Enumerate.call(lampades).length, 1);
decisions = [];
trashCalls = [];
lampades.abilities[0].Resolve.call(lampades);
assert.strictEqual(decisions.length, 1, '36005 prompts for a Stealth credit source');
decisions[0].choose(
  decisions[0].choices.find((choice) => choice.amount === 2),
);
assert.strictEqual(ghostRunner.credits, 0);
assert.strictEqual(lampades.power, 2);
assert.strictEqual(trashCalls[0].cards[0], context.accessingCard);
assert.strictEqual(trashCalls[0].canBePrevented, true);
context.accessingCard = {
  title: 'Agenda',
  player: context.corp,
  cardType: 'agenda',
  subTypes: [],
};
assert.strictEqual(
  lampades.abilities[0].Enumerate.call(lampades).length,
  0,
  '36005 cannot pay a nonexistent printed rez or play cost',
);

const hackerspace = context.cardSet[36006];
const companion = {
  title: 'Unique companion',
  player: context.runner,
  cardType: 'resource',
  subTypes: ['Companion'],
  unique: true,
  installCost: 3,
};
const ordinaryResource = {
  title: 'Ordinary resource',
  player: context.runner,
  cardType: 'resource',
  subTypes: ['Companion'],
  unique: false,
  installCost: 1,
};
context.runner.grip = [companion, ordinaryResource];
assert.strictEqual(hackerspace.canHost.call(hackerspace, companion), true);
assert.strictEqual(
  hackerspace.canHost.call(hackerspace, ordinaryResource),
  false,
  '36006 only hosts unique matching resources',
);
assert.strictEqual(
  hackerspace.modifyInstallCost.Resolve.call(
    hackerspace,
    companion,
    hackerspace,
  ),
  -1,
);
assert.strictEqual(
  hackerspace.modifyInstallCost.Resolve.call(hackerspace, companion, null),
  0,
  '36006 does not discount an ordinary install',
);
const hostedConnection = {subTypes: ['Connection']};
hackerspace.hostedCards = [companion];
assert.strictEqual(
  hackerspace.modifyMaxHandSize.Resolve.call(hackerspace, context.runner),
  0,
);
hackerspace.hostedCards.push(hostedConnection);
assert.strictEqual(
  hackerspace.modifyMaxHandSize.Resolve.call(hackerspace, context.runner),
  2,
  '36006 grants hand size only with both hosted subtypes',
);

const nurseHanh = context.cardSet[36007];
cardsDrawn = 0;
nurseHanh.automaticOnArchivesCardsTurnedFaceUp.Resolve.call(nurseHanh, [
  {title: 'One'},
]);
assert.strictEqual(cardsDrawn, 0);
nurseHanh.automaticOnArchivesCardsTurnedFaceUp.Resolve.call(nurseHanh, [
  {title: 'One'},
  {title: 'Two'},
]);
assert.strictEqual(cardsDrawn, 2, '36007 draws for one group of 2 or more cards');
context.corp.archives.cards = [{faceUp: false}, {faceUp: false}];
assert.strictEqual(nurseHanh.AIInstallBeforeRun.call(nurseHanh, context.corp.archives), 2);
assert.strictEqual(nurseHanh.AIInstallBeforeRun.call(nurseHanh, context.corp.HQ), 0);
assert(
  phaseSource.includes('automaticOnArchivesCardsTurnedFaceUp'),
  '36007 breach hook is wired into the run engine',
);
const utilitySource = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
assert(
  !utilitySource.includes('attackedServer.cards[cardIndex].faceUp = true'),
  'Archives cards are turned faceup once at breach, not while enumerating access choices',
);
assert(
  utilitySource.includes(
    'GetCardProperty(installingCard, "installCost", [destination])',
  ),
  '36006 install-cost modifiers receive the selected host destination',
);

const stickAndPoke = context.cardSet[36008];
const originalSubroutine = {text: 'End the run.'};
const firstIce = {title: 'First ice', subTypes: [], subroutines: [originalSubroutine]};
const secondIce = {title: 'Second ice', subTypes: [], subroutines: []};
let damageCalls = 0;
context.Damage = (type, amount, preventable, callback, callbackContext) => {
  damageCalls++;
  assert.strictEqual(type, 'net');
  assert.strictEqual(amount, 1);
  assert.strictEqual(preventable, true);
  callback.call(callbackContext, []);
};
cardsDrawn = 0;
stickAndPoke.usedThisTurn = false;
stickAndPoke.automaticOnEncounter.Resolve.call(stickAndPoke, firstIce);
assert.strictEqual(firstIce.subroutines[0], stickAndPoke.addedSubroutine);
firstIce.subroutines[0].Resolve.call(firstIce);
assert.strictEqual(damageCalls, 1);
assert.strictEqual(cardsDrawn, 1);
stickAndPoke.automaticOnEncounter.Resolve.call(stickAndPoke, secondIce);
assert.strictEqual(secondIce.subroutines.length, 0, '36008 is limited to once per turn');
stickAndPoke.responseOnEncounterEnds.Resolve.call(stickAndPoke);
assert.deepStrictEqual(firstIce.subroutines, [originalSubroutine]);
stickAndPoke.responseOnCorpTurnBegins.Resolve.call(stickAndPoke);
stickAndPoke.automaticOnEncounter.Resolve.call(stickAndPoke, secondIce);
assert.strictEqual(secondIce.subroutines.length, 1, '36008 resets on the next turn');
const routeServer = {ice: [firstIce, secondIce]};
firstIce.server = routeServer;
secondIce.server = routeServer;
stickAndPoke.usedThisTurn = false;
const firstIceAI = {ice: firstIce, sr: [[['endTheRun']]]};
stickAndPoke.AIModifyIceAI.call(stickAndPoke, firstIceAI, 1);
assert.strictEqual(JSON.stringify(firstIceAI.sr[0]), '[["netDamage"]]');
// Batch 3: Criminal cards 36009-36016.
context.runner.tags = 1;
context.runner.clickTracker = 4;
context.corp.clickTracker = 3;
context.CheckActionClicks = (player, amount) => player.clickTracker >= amount;
context.SpendClicks = (player, amount) => {
  player.clickTracker -= amount;
};
context.RemoveTags = (amount) => {
  context.runner.tags = Math.max(0, context.runner.tags - amount);
};
context.AddTags = (amount, callback, callbackContext) => {
  context.runner.tags += amount;
  if (callback) callback.call(callbackContext);
};
context.MemoryUnits = () => 4;
context.InstalledMemoryCost = () => 4;
context.ServerName = (server) => server.serverName;
context.ChoicesExistingServers = () => [
  {server: context.corp.HQ, label: 'HQ'},
  {server: context.corp.RnD, label: 'R&D'},
  {server: context.corp.archives, label: 'Archives'},
];

const vic = context.cardSet[36009];
cardsDrawn = 0;
vic.usedThisTurn = false;
vic.abilities[0].Resolve.call(vic);
assert.strictEqual(context.runner.clickTracker, 3);
assert.strictEqual(cardsDrawn, 1);
assert.strictEqual(context.runner.tags, 0);
assert.strictEqual(vic.abilities[0].Enumerate.call(vic).length, 0);
vic.responseOnRunnerTurnBegins.Resolve.call(vic);
assert.strictEqual(vic.usedThisTurn, false, '36009 resets once-per-turn state');

context.corp.HQ.ice = [{title: 'HQ ice', rezzed: true}];
context.corp.RnD.ice = [];
context.corp.archives.ice = [{title: 'Archives ice', rezzed: false}];
const kompromat = context.cardSet[36010];
assert.deepStrictEqual(
  Array.from(kompromat.Enumerate.call(kompromat), (choice) => choice.server),
  [context.corp.HQ, context.corp.archives],
  '36010 only targets servers protected by ice',
);
kompromat.Resolve.call(kompromat, {server: context.corp.HQ});
kompromat.responseOnRunSuccessful.Resolve.call(kompromat);
decisions = [];
removedCard = null;
let derezzedCard = null;
context.Derez = (card) => {
  derezzedCard = card;
  card.rezzed = false;
};
kompromat.responseOnRunEnds.Resolve.call(kompromat);
assert.strictEqual(decisions.length, 1);
assert.strictEqual(decisions[0].choices.length, 2);
decisions[0].choose(decisions[0].choices.find((choice) => choice.derez));
assert.strictEqual(derezzedCard.title, 'HQ ice');
assert.strictEqual(removedCard, kompromat, '36010 removes itself after its run');
kompromat.Resolve.call(kompromat, {server: context.corp.archives});
removedCard = null;
decisions = [];
kompromat.responseOnRunEnds.Resolve.call(kompromat);
assert.strictEqual(decisions.length, 0, '36010 has no Corp choice after a failed run');
assert.strictEqual(removedCard, kompromat);

const sellOut = context.cardSet[36011];
const cheapResource = {
  title: 'Cheap resource',
  cardType: 'resource',
  subTypes: [],
  installCost: 0,
};
const protectedResource = {
  title: 'Protected resource',
  cardType: 'resource',
  subTypes: [],
  installCost: 1,
  trashable: false,
};
installed = {corp: [], runner: [cheapResource, protectedResource, runnerCard]};
assert.deepStrictEqual(
  Array.from(sellOut.Enumerate.call(sellOut), (choice) => choice.card),
  [cheapResource],
  '36011 requires a trashable installed resource',
);
creditsGained = 0;
cardsDrawn = 0;
trashCalls = [];
sellOut.Resolve.call(sellOut, {card: cheapResource});
assert.strictEqual(trashCalls[0].canBePrevented, false);
assert.strictEqual(creditsGained, 4);
assert.strictEqual(cardsDrawn, 2);

const tailgate = context.cardSet[36012];
context.corp.HQ.ice = [{}, {}, {}];
assert.strictEqual(
  tailgate.modifyPlayCost.Resolve.call(tailgate, tailgate),
  -3,
  '36012 discounts itself for every HQ ice',
);
assert.strictEqual(tailgate.modifyPlayCost.Resolve.call(tailgate, sellOut), 0);
tailgate.Resolve.call(tailgate);
assert.strictEqual(runTarget, context.corp.HQ);
context.attackedServer = context.corp.HQ;
assert.strictEqual(tailgate.modifyBreachAccess.Resolve.call(tailgate), 0);
tailgate.responseOnRunSuccessful.Resolve.call(tailgate, context.corp.HQ);
assert.strictEqual(tailgate.modifyBreachAccess.Resolve.call(tailgate), 2);

const borrowedGoods = context.cardSet[36013];
assert.strictEqual(borrowedGoods.memoryUnits, 1);
context.runner.tags = 0;
borrowedGoods.automaticOnInstall.Resolve.call(borrowedGoods, borrowedGoods);
assert.strictEqual(context.runner.tags, 1, '36013 tags an untagged Runner');
borrowedGoods.automaticOnInstall.Resolve.call(borrowedGoods, borrowedGoods);
assert.strictEqual(context.runner.tags, 1, '36013 does not tag an already-tagged Runner');

const rotary = context.cardSet[36014];
assert.strictEqual(rotary.unique, true);
assert.strictEqual(rotary.memoryUnits, 1);
rotary.automaticOnBreach.Resolve.call(rotary, context.corp.HQ);
rotary.responseOnBreach.Resolve.call(rotary, {use: true});
assert.strictEqual(rotary.modifyBreachAccess.Resolve.call(rotary), 1);
rotary.responseOnRunEnds.Resolve.call(rotary);
assert.strictEqual(rotary.modifyBreachAccess.Resolve.call(rotary), 0);
context.runner.tags = 1;
context.corp.clickTracker = 3;
trashCalls = [];
rotary.corpAbilities[0].Resolve.call(rotary);
assert.strictEqual(context.corp.clickTracker, 2);
assert.strictEqual(trashCalls[0].cards[0], rotary);
assert.strictEqual(trashCalls[0].canBePrevented, false);
assert.strictEqual(rotary.AIAdditionalAccess.call(rotary, context.corp.HQ), 1);
assert.strictEqual(
  JSON.stringify(rotary.AICentralPressure.call(rotary, context.corp.RnD)),
  '{"additionalAccess":1}',
);
assert(
  utilitySource.includes('"corpAbilities"'),
  '36014 Corp-only Runner-card abilities are exposed by the engine',
);
const triggerFunctionStart = utilitySource.indexOf(
  'function ChoicesTriggerableAbilities',
);
const triggerFunctionEnd = utilitySource.indexOf(
  '/**\n * Gets choices of card to access',
  triggerFunctionStart,
);
const abilityContext = {
  corp: context.corp,
  runner: context.runner,
  ActiveCards(player) {
    return player === context.runner ? [rotary] : [];
  },
  ChoicesAbility(card, limitTo, property = 'abilities') {
    if (!card[property]) return [];
    return card[property]
      .filter((ability) => ability.Enumerate.call(card).length > 0)
      .map((ability) => ({ability}));
  },
};
vm.createContext(abilityContext);
vm.runInContext(
  utilitySource.slice(triggerFunctionStart, triggerFunctionEnd),
  abilityContext,
);
assert.strictEqual(
  abilityContext.ChoicesTriggerableAbilities(context.corp, 'click')[0].card,
  rotary,
  '36014 appears among Corp triggerable abilities',
);

const baker = context.cardSet[36015];
const stealthSource = {
  title: 'Stealth source',
  cardType: 'resource',
  subTypes: ['Stealth'],
  credits: 1,
  recurringCredits: 1,
};
installed = {corp: [], runner: [baker, stealthSource]};
context.runner.clickTracker = 3;
baker.usedThisTurn = false;
baker.abilities[0].Resolve.call(baker);
assert.strictEqual(runTarget, context.corp.archives);
decisions = [];
context.attackedServer = context.corp.archives;
const bakerRedirects = baker.responseOnWouldApproachServer.Enumerate.call(baker);
assert.strictEqual(bakerRedirects.length, 2);
baker.responseOnWouldApproachServer.Resolve.call(baker, bakerRedirects[0]);
assert.strictEqual(context.attackedServer, context.corp.HQ);
assert.strictEqual(stealthSource.credits, 0);
assert.strictEqual(stealthSource.recurringCredits, 1);
baker.responseOnRunEnds.Resolve.call(baker);
assert.strictEqual(baker.runningWithThis, false);
assert.strictEqual(
  baker.AIRedirectsRun.call(baker, context.corp.archives, context.corp.HQ),
  false,
  '36015 public redirect model respects its once-per-turn use',
);
baker.responseOnRunnerTurnBegins.Resolve.call(baker);
stealthSource.credits = 1;
assert.strictEqual(
  baker.AIRedirectsRun.call(baker, context.corp.archives, context.corp.RnD),
  true,
);
stealthSource.credits = 0;
assert.strictEqual(
  baker.AIRedirectsRun.call(baker, context.corp.archives, context.corp.RnD),
  false,
  '36015 cannot redirect without a current Stealth credit',
);
assert(
  phaseSource.includes('"responseOnWouldApproachServer"'),
  '36015 uses a decision-safe response window before server approach',
);

const underdome = context.cardSet[36016];
underdome.responseOnRunnerTurnBegins.Resolve.call(underdome);
trashCalls = [];
underdome.responseOnRunnerActionPhaseEnds.Resolve.call(underdome, {});
assert.strictEqual(trashCalls[0].cards[0], underdome);
assert.strictEqual(trashCalls[0].canBePrevented, true);
underdome.responseOnRunnerTurnBegins.Resolve.call(underdome);
underdome.automaticOnRez.Resolve.call(underdome, {
  title: 'Rezzed ice',
  cardType: 'ice',
});
context.runner.tags = 0;
cardsDrawn = 0;
const underdomeChoices = underdome.responseOnRunnerActionPhaseEnds.Enumerate.call(underdome);
assert.strictEqual(underdomeChoices.length, 1);
underdome.responseOnRunnerActionPhaseEnds.Resolve.call(underdome, underdomeChoices[0]);
assert.strictEqual(cardsDrawn, 2);
assert.strictEqual(
  underdome.automaticOnRez.availableWhenInactive,
  true,
  '36016 remembers ice rezzed before it was installed',
);

// Batch 4: Shaper cards 36017-36020.
const hiram = context.cardSet[36017];
const hiddenTopCard = {title: 'Hidden agenda', knownToRunner: false};
context.corp.RnD.cards = [hiddenTopCard];
const installedHardware = {
  title: 'Installed hardware',
  player: context.runner,
  cardType: 'hardware',
  subTypes: [],
};
assert.strictEqual(hiram.responseOnInstall.Enumerate.call(hiram, installedHardware).length, 1);
hiram.responseOnInstall.Resolve.call(hiram);
assert.strictEqual(hiddenTopCard.knownToRunner, true, '36017 looks at R&D after hardware install');
hiddenTopCard.knownToRunner = false;
assert.strictEqual(hiram.responseOnTrash.Enumerate.call(hiram, [installedHardware]).length, 1);
hiram.responseOnTrash.Resolve.call(hiram);
assert.strictEqual(hiddenTopCard.knownToRunner, true, '36017 looks at R&D after hardware trash');
assert.strictEqual(
  hiram.responseOnTrash.Enumerate.call(hiram, [{player: context.runner, cardType: 'program'}]).length,
  0,
  '36017 ignores non-hardware trash events',
);

const remote = {serverName: 'Remote 1', root: [], ice: []};
context.corp.remoteServers = [remote];
context.ChoicesExistingServers = () => [
  {server: context.corp.HQ, label: 'HQ'},
  {server: context.corp.RnD, label: 'R&D'},
  {server: context.corp.archives, label: 'Archives'},
  {server: remote, label: 'Remote 1'},
];
const aircheck = context.cardSet[36018];
aircheck.credits = 0;
aircheck.Resolve.call(aircheck, {server: context.corp.HQ});
assert.strictEqual(runTarget, context.corp.HQ);
assert.strictEqual(aircheck.credits, 4);
assert.strictEqual(aircheck.canUseCredits.call(aircheck, 'using', corsair), true);
assert.strictEqual(
  aircheck.preventCreditPoolUse.call(aircheck, context.runner, 'spend'),
  true,
);
aircheck.responseOnRunSuccessful.Resolve.call(aircheck);
const aircheckRunChoices = aircheck.responseOnRunEnds.Enumerate.call(aircheck);
assert.deepStrictEqual(
  Array.from(aircheckRunChoices, (choice) => choice.server),
  [remote, null],
  '36018 offers only remote servers after its successful central run',
);
aircheck.responseOnRunEnds.Resolve.call(aircheck, aircheckRunChoices[0]);
aircheck.automaticOnRunEndCleanup.Resolve.call(aircheck);
assert.strictEqual(runTarget, remote, '36018 launches the chosen run after cleanup');
assert.strictEqual(aircheck.runningWithThis, true);
aircheck.automaticOnRunEndCleanup.Resolve.call(aircheck);
assert.strictEqual(aircheck.runningWithThis, false, '36018 unlocks the pool after its final run');
aircheck.Resolve.call(aircheck, {server: context.corp.RnD});
aircheck.automaticOnRunEndCleanup.Resolve.call(aircheck);
assert.strictEqual(aircheck.runningWithThis, false, '36018 cleans up after an unsuccessful run');
context.runner.creditPool = 8;
aircheck.AIRunEventModify.call(aircheck);
assert.strictEqual(context.runner.creditPool, 1, '36018 AI excludes the inaccessible pool');
aircheck.AIRunEventRestore.call(aircheck);
assert.strictEqual(context.runner.creditPool, 8);

const betaBuild = context.cardSet[36019];
const nonVirusBreaker = {
  title: 'Decoder',
  player: context.runner,
  cardType: 'program',
  subTypes: ['Icebreaker', 'Decoder'],
  memoryCost: 1,
};
const virusProgram = {
  title: 'Virus',
  player: context.runner,
  cardType: 'program',
  subTypes: ['Virus'],
  memoryCost: 1,
};
context.runner.stack = [virusProgram, nonVirusBreaker];
let shuffled = false;
context.Shuffle = () => {
  shuffled = true;
};
context.ChoicesArrayInstall = (cards, ignoreCost, check) =>
  cards
    .filter((card) => !check || check(card))
    .map((card) => ({card, host: null, label: 'Install ' + card.title}));
context.Install = (card, host, ignoreCosts, position, returnToPhase, callback, callbackContext) => {
  assert.strictEqual(ignoreCosts, true);
  const stackIndex = context.runner.stack.indexOf(card);
  if (stackIndex > -1) context.runner.stack.splice(stackIndex, 1);
  installed.runner.push(card);
  card.cardLocation = installed.runner;
  callback.call(callbackContext);
};
context.MoveCard = (card, destination, position) => {
  if (card.cardLocation) {
    const index = card.cardLocation.indexOf(card);
    if (index > -1) card.cardLocation.splice(index, 1);
  }
  if (Number.isInteger(position)) destination.splice(position, 0, card);
  else destination.push(card);
  card.cardLocation = destination;
};
const betaChoices = betaBuild.Enumerate.call(betaBuild);
assert.strictEqual(betaChoices.some((choice) => choice.card === virusProgram), false);
const betaChoice = betaChoices.find(
  (choice) => choice.card === nonVirusBreaker && choice.server === context.corp.HQ,
);
installed = {corp: [], runner: []};
betaBuild.Resolve.call(betaBuild, betaChoice);
assert.strictEqual(shuffled, true);
assert.strictEqual(runTarget, context.corp.HQ);
assert.strictEqual(betaBuild.lingeringEffectTarget, nonVirusBreaker);
betaBuild.responseOnRunEnds.Resolve.call(betaBuild);
assert.strictEqual(context.runner.stack[context.runner.stack.length - 1], nonVirusBreaker);
assert.strictEqual(betaBuild.lingeringEffectTarget, null);
betaBuild.lingeringEffectTarget = nonVirusBreaker;
betaBuild.automaticOnUninstall.Resolve.call(betaBuild, nonVirusBreaker);
assert.strictEqual(betaBuild.lingeringEffectTarget, null, '36019 does not return an uninstalled target');
assert.deepStrictEqual(
  Array.from(betaBuild.AIIcebreakerTutor.call(betaBuild)),
  [nonVirusBreaker],
  '36019 AI tutors only eligible non-virus icebreakers',
);
const runnerAISource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
assert.strictEqual(
  runnerAISource.includes('this.tutorableIcebreakers'),
  false,
  '36019 tutor candidates are read from the local hook result',
);

const methuselah = context.cardSet[36020];
const fodderHardware = {
  title: 'Spare hardware',
  player: context.runner,
  cardType: 'hardware',
  subTypes: [],
};
context.runner.grip = [fodderHardware, nonVirusBreaker];
context.runner.AI = null;
methuselah.credits = 0;
const methuselahChoices = methuselah.responseOnRunBegins.Enumerate.call(methuselah);
assert.deepStrictEqual(
  Array.from(methuselahChoices, (choice) => choice.card),
  [fodderHardware, null],
  '36020 offers only hardware from the grip plus a decline option',
);
trashCalls = [];
methuselah.responseOnRunBegins.Resolve.call(methuselah, methuselahChoices[0]);
assert.strictEqual(trashCalls[0].canBePrevented, false);
assert.strictEqual(methuselah.credits, 2);
context.attackedServer = remote;
assert.strictEqual(methuselah.canUseCredits.call(methuselah), true);
assert.strictEqual(methuselah.AIRunPoolCreditOffset.call(methuselah, remote), 2);
context.attackedServer = null;
assert.strictEqual(methuselah.canUseCredits.call(methuselah), false);
assert.strictEqual(methuselah.unique, true);
assert.strictEqual(methuselah.memoryUnits, 1);

assert(
  phaseSource.includes('AutomaticTriggers("automaticOnRunEndCleanup"'),
  '36018 has a post-cleanup hook for safely starting its optional second run',
);

// Batch 5: Shaper and neutral-runner cards 36021-36025.
const touchstone = context.cardSet[36021];
touchstone.credits = 0;
touchstone.responseOnRunnerTurnBegins.Resolve.call(touchstone);
touchstone.automaticOnPlay.Resolve.call(touchstone, {
  player: context.runner,
  cardType: 'event',
  subTypes: [],
});
assert.strictEqual(touchstone.credits, 0, '36021 records the first event while inactive');
activeCards.add(touchstone);
touchstone.automaticOnPlay.Resolve.call(touchstone, {
  player: context.runner,
  cardType: 'event',
  subTypes: [],
});
assert.strictEqual(touchstone.credits, 0, '36021 does not reward a later event that turn');
touchstone.responseOnCorpTurnBegins.Resolve.call(touchstone);
touchstone.automaticOnPlay.Resolve.call(touchstone, {
  player: context.runner,
  cardType: 'event',
  subTypes: [],
});
assert.strictEqual(touchstone.credits, 1);
context.attackedServer = remote;
assert.strictEqual(touchstone.canUseCredits.call(touchstone), true);
assert.strictEqual(touchstone.AIRunPoolCreditOffset.call(touchstone, remote), 1);
context.attackedServer = null;
assert.strictEqual(touchstone.canUseCredits.call(touchstone), false);
assert.strictEqual(touchstone.unique, true);

const readWriteShare = context.cardSet[36022];
const lowValueCard = {
  title: 'Low value',
  player: context.runner,
  cardType: 'event',
  subTypes: [],
  elo: 1200,
};
const highValueCard = {
  title: 'High value',
  player: context.runner,
  cardType: 'event',
  subTypes: [],
  elo: 1800,
};
context.runner.grip = [lowValueCard, highValueCard];
lowValueCard.cardLocation = context.runner.grip;
highValueCard.cardLocation = context.runner.grip;
readWriteShare.hostedCards = [];
cardsDrawn = 0;
const shareChoices = readWriteShare.responseOnInstall.Enumerate.call(
  readWriteShare,
  readWriteShare,
);
assert.strictEqual(shareChoices.length, 3);
readWriteShare.responseOnInstall.Resolve.call(readWriteShare, shareChoices[0]);
assert.strictEqual(readWriteShare.hostedCards[0], lowValueCard);
assert.strictEqual(lowValueCard.faceUp, false);
assert.strictEqual(lowValueCard.notInstalled, true);
assert.strictEqual(cardsDrawn, 1);
readWriteShare.hostedCards.push(highValueCard);
highValueCard.cardLocation = readWriteShare.hostedCards;
highValueCard.host = readWriteShare;
highValueCard.notInstalled = true;
context.runner.stack = [];
shuffled = false;
trashCalls = [];
readWriteShare.abilities[0].Resolve.call(readWriteShare);
assert.deepStrictEqual(Array.from(context.runner.stack), [lowValueCard, highValueCard]);
assert.strictEqual(lowValueCard.notInstalled, false);
assert.strictEqual(highValueCard.host, null);
assert.strictEqual(trashCalls[0].canBePrevented, false);
assert.strictEqual(shuffled, true);

const sipa = context.cardSet[36023];
const passedIce = {
  title: 'Passed ice',
  player: context.corp,
  cardType: 'ice',
  subTypes: ['Barrier'],
  subroutines: [{broken: true}, {broken: true}],
};
const swapIce = {
  title: 'Swap ice',
  player: context.corp,
  cardType: 'ice',
  subTypes: ['Code Gate'],
  subroutines: [{broken: false}],
};
remote.ice = [passedIce];
context.corp.HQ.ice = [swapIce];
passedIce.cardLocation = remote.ice;
swapIce.cardLocation = context.corp.HQ.ice;
passedIce.server = remote;
swapIce.server = context.corp.HQ;
installed = {corp: [passedIce, swapIce], runner: [sipa]};
context.attackedServer = remote;
context.approachIce = 0;
sipa.responseOnRunnerTurnBegins.Resolve.call(sipa);
context.runner.AI = {
  preferred: null,
  _iceComparisonScore(ice) {
    return ice === passedIce ? 5 : 1;
  },
};
const sipaChoices = sipa.responseOnPassesIce.Enumerate.call(sipa);
assert.strictEqual(sipaChoices.length, 2);
assert.strictEqual(context.runner.AI.preferred.option.card, swapIce);
context.runner.AI = null;
sipa.responseOnPassesIce.Resolve.call(sipa, sipaChoices[0]);
assert.strictEqual(remote.ice[0], swapIce);
assert.strictEqual(context.corp.HQ.ice[0], passedIce);
passedIce.server = context.corp.HQ;
swapIce.server = remote;
assert.strictEqual(sipa.usedThisTurn, true);
sipa.responseOnRunnerTurnBegins.Resolve.call(sipa);
swapIce.subroutines[0].broken = false;
assert.strictEqual(
  sipa.responseOnPassesIce.Enumerate.call(sipa).length,
  0,
  '36023 requires every subroutine on the outermost ice to be broken',
);

const stowaway = context.cardSet[36024];
creditsGained = 0;
stowaway.host = passedIce;
assert.strictEqual(stowaway.installOnlyOn.call(stowaway, passedIce), true);
assert.strictEqual(stowaway.installOnlyOn.call(stowaway, sipa), false);
stowaway.responseOnRunSuccessful.Resolve.call(stowaway, context.corp.HQ);
assert.strictEqual(creditsGained, 2);
stowaway.responseOnRunSuccessful.Resolve.call(stowaway, remote);
assert.strictEqual(creditsGained, 2, '36024 only pays for its host server');
assert.strictEqual(stowaway.AIRunExtraPotential.call(stowaway, context.corp.HQ), 0.6);
assert.strictEqual(stowaway.AIBreachNotRequired, true);

const wordOnTheStreet = context.cardSet[36025];
const newAgenda = {
  title: 'New agenda',
  player: context.corp,
  cardType: 'agenda',
  agendaPoints: 2,
};
const oldAgenda = {
  title: 'Old agenda',
  player: context.corp,
  cardType: 'agenda',
  agendaPoints: 2,
};
context.corp.scoreArea = [];
context.intended = {score: newAgenda};
wordOnTheStreet.corpCardsInstalledThisTurn = [];
wordOnTheStreet.automaticOnInstall.Resolve.call(wordOnTheStreet, newAgenda);
wordOnTheStreet.responsePreventableScore.Resolve.call(wordOnTheStreet);
assert.strictEqual(context.corp.scoreArea[0], wordOnTheStreet);
assert.strictEqual(wordOnTheStreet.agendaPoints, -1);
assert.strictEqual(wordOnTheStreet.cannotForfeit, true);
assert.strictEqual(trashCalls.some((call) => call.cards.includes(wordOnTheStreet)), false);

context.intended.score = oldAgenda;
wordOnTheStreet.cardLocation = installed.runner;
wordOnTheStreet.corpCardsInstalledThisTurn = [];
creditsGained = 0;
cardsDrawn = 0;
trashCalls = [];
wordOnTheStreet.responsePreventableScore.Resolve.call(wordOnTheStreet);
assert.strictEqual(wordOnTheStreet.responseOnScored.Enumerate.call(wordOnTheStreet).length, 1);
wordOnTheStreet.responseOnScored.Resolve.call(wordOnTheStreet);
assert.strictEqual(trashCalls[0].cards[0], wordOnTheStreet);
assert.strictEqual(trashCalls[0].canBePrevented, true);
assert.strictEqual(creditsGained, 4);
assert.strictEqual(cardsDrawn, 1);

const mechanicsSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
assert(
  mechanicsSource.includes('card.cannotForfeit'),
  '36025 score-area penalty cannot be selected or resolved as a forfeit',
);

// Batch 6: Haas-Bioroid cards 36026-36030.
context.corp.creditPool = 10;
context.GainClicks = (player, amount) => {
  player.clickTracker += amount;
};
context.LoseClicks = (player, amount) => {
  const lost = Math.min(player.clickTracker, amount);
  player.clickTracker -= lost;
  return lost;
};
context.CheckClicks = (player, amount) => player.clickTracker >= amount;

const melies = context.cardSet[36026];
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(melies.stealCost)),
  {clicks: 1},
  '36026 requires an additional click to steal',
);
context.intended.score = melies;
context.corp.clickTracker = 0;
melies.responseOnScored.Resolve.call(melies);
assert.strictEqual(context.corp.clickTracker, 1, '36026 gains a click when scored');
context.intended.score = oldAgenda;
melies.responseOnScored.Resolve.call(melies);
assert.strictEqual(context.corp.clickTracker, 1, '36026 ignores other scored agendas');

const synchrocyclotron = context.cardSet[36027];
const doubleOperation = {
  player: context.corp,
  cardType: 'operation',
  subTypes: ['Double'],
};
synchrocyclotron.playedDoubleOperationThisTurn = false;
assert.strictEqual(
  synchrocyclotron.modifyPlayClickCost.Resolve.call(
    synchrocyclotron,
    doubleOperation,
  ),
  -1,
  '36027 discounts the first double operation',
);
synchrocyclotron.automaticOnPlay.Resolve.call(
  synchrocyclotron,
  doubleOperation,
);
assert.strictEqual(
  synchrocyclotron.modifyPlayClickCost.Resolve.call(
    synchrocyclotron,
    doubleOperation,
  ),
  0,
  '36027 does not discount later double operations that turn',
);
synchrocyclotron.responseOnRunnerTurnBegins.Resolve.call(synchrocyclotron);
assert.strictEqual(synchrocyclotron.playedDoubleOperationThisTurn, false);
context.corp.HQ.cards = [doubleOperation];
context.corp.AI = {_isAScoringServer: () => false};
assert.strictEqual(
  synchrocyclotron.AIWorthInstalling.call(synchrocyclotron, [remote]),
  0,
  '36027 AI installs when a double operation can benefit',
);

const ansel = context.cardSet[36028];
context.GetApproachEncounterIce = () => ansel;
context.runner.clickTracker = 3;
context.ChoicesEncounteredSubroutines = () =>
  ansel.subroutines
    .filter((subroutine) => !subroutine.broken)
    .map((subroutine) => ({subroutine, label: subroutine.text}));
const brokenSubroutines = [];
context.Break = (subroutine) => {
  subroutine.broken = true;
  brokenSubroutines.push(subroutine);
};
decisions = [];
ansel.runnerAbilities[0].Resolve.call(ansel, {
  subroutine: ansel.subroutines[0],
});
assert.strictEqual(context.runner.clickTracker, 1);
assert.strictEqual(decisions.length, 1, '36028 offers an optional second break');
decisions[0].choose({subroutine: ansel.subroutines[1]});
assert.deepStrictEqual(brokenSubroutines, [ansel.subroutines[0], ansel.subroutines[1]]);
assert.strictEqual(
  ansel.runnerAbilities[0].Enumerate.call(ansel).length,
  0,
  '36028 cannot use its Runner ability without 2 clicks',
);
ansel.subroutines.forEach((subroutine) => {
  subroutine.broken = false;
});

const installedProgram = {
  title: 'Valuable program',
  cardType: 'program',
  subTypes: [],
  elo: 1800,
};
installed = {corp: [], runner: [installedProgram]};
trashCalls = [];
decisions = [];
ansel.subroutines[0].Resolve.call(ansel);
assert.strictEqual(decisions.length, 1);
decisions[0].choose(decisions[0].choices[0]);
assert.strictEqual(trashCalls[0].cards[0], installedProgram);
assert.strictEqual(trashCalls[0].canBePrevented, true);

const heapCard = {title: 'Heap card', elo: 1600};
context.runner.heap = [heapCard];
heapCard.cardLocation = context.runner.heap;
let removedFromGame = null;
context.RemoveFromGame = (card) => {
  removedFromGame = card;
};
decisions = [];
ansel.subroutines[1].Resolve.call(ansel);
decisions[0].choose(decisions[0].choices[0]);
assert.strictEqual(removedFromGame, heapCard);

const installCard = {title: 'Install target', cardType: 'asset', subTypes: []};
const installChoice = {card: installCard, server: remote, label: 'Install target'};
context.ChoicesHandInstall = () => [installChoice];
context.ChoicesArrayInstall = () => [];
let installedChoice = null;
context.Install = (card, server) => {
  installedChoice = {card, server};
};
context.corp.AI = null;
decisions = [];
ansel.subroutines[2].Resolve.call(ansel);
assert.strictEqual(decisions[0].choices.some((choice) => choice.id === -1), true);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 0));
decisions[1].choose(installChoice);
assert.deepStrictEqual(installedChoice, {card: installCard, server: remote});

const anselIceAI = {ice: ansel, sr: []};
const runPoint = {runner_clicks_spent: 0};
const fakeRc = {
  precalculated: {runnerInstalledCardsLength: 1},
  SrBreak(card, iceAI, point, count) {
    assert.strictEqual(count, 2);
    return [{runner_clicks_spent: point.runner_clicks_spent}];
  },
};
const breakerResults = ansel.AIImplementBreaker.call(
  ansel,
  fakeRc,
  [],
  runPoint,
  remote,
  ansel.strength,
  anselIceAI,
  ansel.strength,
  2,
  0,
);
assert.strictEqual(breakerResults[0].runner_clicks_spent, 2);
assert.strictEqual(
  ansel.AIImplementBreaker.call(
    ansel,
    fakeRc,
    [],
    runPoint,
    remote,
    ansel.strength,
    anselIceAI,
    ansel.strength,
    1,
    0,
  ).length,
  0,
  '36028 run calculator requires both clicks',
);

const reverb = context.cardSet[36029];
const otherUnrezzedIce = {cardType: 'ice', rezzed: false, subTypes: []};
const rezzedIce = {cardType: 'ice', rezzed: true, subTypes: []};
installed = {corp: [reverb, otherUnrezzedIce, rezzedIce], runner: []};
assert.strictEqual(
  reverb.modifyRezCost.Resolve.call(reverb, reverb),
  -1,
  '36029 counts only other unrezzed ice',
);
let endedRuns = 0;
context.EndTheRun = () => {
  endedRuns++;
};
reverb.subroutines[0].Resolve.call(reverb);
reverb.subroutines[1].Resolve.call(reverb);
assert.strictEqual(endedRuns, 2);

const sleipnir = context.cardSet[36030];
const rndCard = {title: 'R&D card'};
context.corp.RnD.cards = [rndCard];
cardsDrawn = 0;
decisions = [];
sleipnir.subroutines[0].Resolve.call(sleipnir);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 1));
assert.strictEqual(cardsDrawn, 1);
context.corp.RnD.cards = [];
decisions = [];
sleipnir.subroutines[0].Resolve.call(sleipnir);
assert.strictEqual(
  decisions[0].choices.some((choice) => choice.id === 1),
  false,
  '36030 cannot choose to draw from empty R&D',
);

const archiveCard = {title: 'Archived card', elo: 1700};
context.corp.HQ.cards = [];
context.corp.archives.cards = [archiveCard];
archiveCard.cardLocation = context.corp.archives.cards;
context.corp.RnD.cards = [];
shuffled = false;
context.MoveCard = (card, destination) => {
  const sourceIndex = card.cardLocation.indexOf(card);
  if (sourceIndex > -1) card.cardLocation.splice(sourceIndex, 1);
  destination.push(card);
  card.cardLocation = destination;
};
context.Shuffle = () => {
  shuffled = true;
};
context.corp.AI = {preferred: null};
decisions = [];
sleipnir.subroutines[1].Resolve.call(sleipnir);
assert.strictEqual(context.corp.AI.preferred.option.card, archiveCard);
decisions[0].choose(decisions[0].choices.find((choice) => choice.card === archiveCard));
assert.strictEqual(context.corp.RnD.cards[0], archiveCard);
assert.strictEqual(shuffled, true);
sleipnir.subroutines[2].Resolve.call(sleipnir);
assert.strictEqual(endedRuns, 3);

// Batch 7: Haas-Bioroid cards 36031-36035.
const lingering = [];
context.AddLingeringEffect = (effect) => lingering.push(effect);
context.RemoveLingeringEffect = (effect) => {
  const index = lingering.indexOf(effect);
  if (index > -1) lingering.splice(index, 1);
};

const vertigo = context.cardSet[36031];
const vertigoServer = {serverName: 'HQ', root: [], cards: [], ice: [vertigo]};
context.attackedServer = vertigoServer;
context.approachIce = 0;
context.runner.clickTracker = 1;
vertigo.subroutines[0].Resolve.call(vertigo);
assert.strictEqual(context.runner.clickTracker, 0, '36031 subroutine removes 1 click');
vertigo.responseOnPassesIce.Resolve.call(vertigo);
assert.strictEqual(lingering.length, 1, '36031 creates a run-duration restriction');
const vertigoCorpCard = {title: 'Corp card', player: context.corp};
assert.strictEqual(
  lingering[0].modifyCannot.Resolve.call(lingering[0], 'steal', vertigoCorpCard),
  true,
);
assert.strictEqual(
  lingering[0].modifyCannot.Resolve.call(lingering[0], 'trash', {player: context.runner}),
  false,
  '36031 only restricts Corp cards',
);
lingering[0].responseOnRunEnds.Resolve.call(lingering[0]);
assert.strictEqual(lingering.length, 0, '36031 restriction cleans up at run end');
context.runner.clickTracker = 1;
vertigo.responseOnPassesIce.Resolve.call(vertigo);
assert.strictEqual(lingering.length, 0, '36031 does not restrict with a click remaining');
const vertigoAI = {sr: []};
vertigo.AIImplementIce.call(vertigo, {}, vertigoAI, 0, false);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(vertigoAI.sr)),
  [[['loseClicks', 'iceSpecificEffect']]],
);
assert.deepStrictEqual(
  Array.from(vertigo.AIIceSpecificEffect.call(vertigo, 0, 0, 0)),
  ['misc_serious'],
);
assert.deepStrictEqual(
  Array.from(vertigo.AIIceSpecificEffect.call(vertigo, 0, 0, 1)),
  [],
);

const clickAdjustments = [];
context.AddTempBonusClicks = (player, amount) => {
  player.tempBonusClicks = (player.tempBonusClicks || 0) + amount;
  clickAdjustments.push(amount);
};
const caveatEmptor = context.cardSet[36032];
creditsGained = 0;
context.runner.tempBonusClicks = 0;
context.corp.AI = null;
const caveatChoices = caveatEmptor.Enumerate.call(caveatEmptor);
caveatEmptor.Resolve.call(caveatEmptor, caveatChoices[0]);
caveatEmptor.Resolve.call(caveatEmptor, caveatChoices[1]);
assert.strictEqual(creditsGained, 16);
assert.deepStrictEqual(clickAdjustments, [-1, 1]);
assert.strictEqual(context.runner.tempBonusClicks, 0);
context.AgendaPoints = () => 0;
context.AgendaPointsToWin = () => 7;
context.corp.AI = {};
assert.strictEqual(
  caveatEmptor.Enumerate.call(caveatEmptor)[0].credits,
  10,
  '36032 AI normally chooses the larger credit gain',
);
context.AgendaPoints = () => 6;
assert.strictEqual(
  caveatEmptor.Enumerate.call(caveatEmptor)[0].clicks,
  -1,
  '36032 AI denies a click when the Runner is at match point',
);

const realloc = context.cardSet[36033];
const cheapIce = {title: 'Cheap ICE', cardType: 'ice', subTypes: [], rezzed: true, rezCost: 1};
const mediumIce = {title: 'Medium ICE', cardType: 'ice', subTypes: [], rezzed: true, rezCost: 4};
const expensiveIce = {title: 'Expensive ICE', cardType: 'ice', subTypes: [], rezzed: true, rezCost: 7};
installed = {corp: [cheapIce, mediumIce, expensiveIce], runner: []};
context.corp.AI = null;
assert.strictEqual(realloc.Enumerate.call(realloc).length, 3);
const derezzed = [];
context.Derez = (card) => {
  card.rezzed = false;
  derezzed.push(card);
};
creditsGained = 0;
realloc.Resolve.call(realloc, {cards: [mediumIce, expensiveIce]});
assert.strictEqual(creditsGained, 11, '36033 gains printed rez costs');
assert.deepStrictEqual(derezzed, [mediumIce, expensiveIce]);
installed = {corp: [cheapIce], runner: []};
assert.strictEqual(realloc.Enumerate.call(realloc).length, 0, '36033 needs two targets');
mediumIce.rezzed = true;
expensiveIce.rezzed = true;
installed = {corp: [cheapIce, mediumIce, expensiveIce], runner: []};
context.corp.AI = {_cardProtectionValue: () => 0};
assert.deepStrictEqual(
  Array.from(realloc.Enumerate.call(realloc)[0].cards),
  [mediumIce, expensiveIce],
  '36033 AI selects the best economic pair',
);

const retirementPlan = context.cardSet[36034];
const archivedAgenda = {title: 'Archived agenda', cardType: 'agenda', subTypes: []};
const archivedUpgrade = {title: 'Archived upgrade', cardType: 'upgrade', subTypes: []};
const retirementInstall = {card: archivedAgenda, server: remote, label: 'Archived agenda'};
context.corp.archives.cards = [archivedAgenda, archivedUpgrade];
context.ChoicesArrayInstall = (cards, ignoreCreditCost, check) =>
  cards
    .filter((card) => !check || check(card))
    .map((card) => ({card, server: remote, label: card.title}));
context.corp.AI = null;
assert.deepStrictEqual(
  retirementPlan.Enumerate.call(retirementPlan).map((choice) => choice.card),
  [archivedAgenda],
  '36034 only offers agendas, assets, and ICE',
);
installedChoice = null;
retirementPlan.Resolve.call(retirementPlan, retirementInstall);
assert.deepStrictEqual(installedChoice, {card: archivedAgenda, server: remote});
context.corp.AI = {_bestInstallOption: () => 0};
assert.strictEqual(retirementPlan.Enumerate.call(retirementPlan).length, 1);
assert.strictEqual(retirementPlan.AIPlayWhenCan, 1);
assert.strictEqual(retirementPlan.AIIsRecurOrTutor, true);

const perfectRecall = context.cardSet[36035];
const recallServer = {serverName: 'Remote', root: [perfectRecall], cards: [], ice: []};
perfectRecall.server = recallServer;
perfectRecall.power = 0;
perfectRecall.responseOnRez.Resolve.call(perfectRecall);
assert.strictEqual(perfectRecall.power, 1);
const scoredFromRecall = {title: 'Scored agenda', cardType: 'agenda', server: recallServer};
context.intended.score = scoredFromRecall;
perfectRecall.responsePreventableScore.Resolve.call(perfectRecall);
scoredFromRecall.server = null;
perfectRecall.responseOnScored.Resolve.call(perfectRecall);
assert.strictEqual(perfectRecall.power, 2, '36035 remembers the pre-score server');
context.attackedServer = recallServer;
perfectRecall.responseOnStolen.Resolve.call(perfectRecall);
assert.strictEqual(perfectRecall.power, 3, '36035 gains a counter on a local steal');

const protectedAgenda = {
  title: 'Protected title',
  player: context.corp,
  cardType: 'agenda',
  subTypes: [],
  agendaPoints: 2,
};
const otherHQCard = {
  title: 'Other title',
  player: context.corp,
  cardType: 'operation',
  subTypes: [],
};
context.corp.HQ.cards = [protectedAgenda, otherHQCard];
context.corp.AI = null;
let revealedCard = null;
context.Reveal = (card, callback, callbackContext) => {
  revealedCard = card;
  callback.call(callbackContext);
};
lingering.length = 0;
perfectRecall.abilities[0].Resolve.call(perfectRecall, {card: protectedAgenda});
assert.strictEqual(revealedCard, protectedAgenda);
assert.strictEqual(perfectRecall.power, 2);
assert.strictEqual(lingering.length, 1);
assert.strictEqual(
  lingering[0].modifyCannot.Resolve.call(lingering[0], 'steal', protectedAgenda),
  true,
);
assert.strictEqual(
  lingering[0].modifyCannot.Resolve.call(lingering[0], 'trash', otherHQCard),
  false,
  '36035 protects only copies of the revealed title',
);
lingering[0].responseOnRunEnds.Resolve.call(lingering[0]);
assert.strictEqual(lingering.length, 0, '36035 protection cleans up at run end');
context.attackedServer = context.corp.HQ;
context.corp.HQ.root = [];
context.corp.AI = {};
assert.strictEqual(
  perfectRecall.abilities[0].Enumerate.call(perfectRecall)[0].card,
  protectedAgenda,
  '36035 AI prioritizes an agenda in HQ',
);

const corpAISource = fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8');
assert(corpAISource.includes('typeof card.AIEconomyPlay != "number"'));
assert(corpAISource.includes('typeof card.AIPlayWhenCan == "number"'));
const runCalculatorSource = fs.readFileSync(path.join(root, 'runcalculator.js'), 'utf8');
assert(/AIIceSpecificEffect\.call\([\s\S]{0,200}clicksLeft/.test(runCalculatorSource));

// Batch 8: Jinteki cards 36036-36040.
context.CheckTags = (amount) => context.runner.tags >= amount;
let creditsLost = 0;
context.LoseCredits = (player, amount) => {
  const lost = Math.min(player.creditPool || 0, amount);
  player.creditPool -= lost;
  creditsLost += lost;
};
context.Reveal = (card, callback, callbackContext) => {
  card.faceUp = false;
  callback.call(callbackContext);
};
context.MoveCard = (card, destination, position) => {
  if (card.cardLocation) {
    const index = card.cardLocation.indexOf(card);
    if (index > -1) card.cardLocation.splice(index, 1);
  }
  if (Number.isInteger(position)) destination.splice(position, 0, card);
  else destination.push(card);
  card.cardLocation = destination;
};

const meliesU = context.cardSet[36036];
context.corp.AI = null;
let loadedIdentityTexture = null;
let identityFaceUpdates = 0;
context.cardRenderer = {
  LoadTexture: (imagePath) => {
    loadedIdentityTexture = imagePath;
    return {imagePath};
  },
};
meliesU.renderer = {
  frontTexture: null,
  loresTexture: null,
  dummy: {texture: null},
  SetTextureToFront: () => {
    identityFaceUpdates++;
  },
};
meliesU._setDepartment.call(meliesU, 'R&D');
assert.deepStrictEqual(Array.from(meliesU.subTypes), ['Division']);
assert.strictEqual(meliesU.imageFile, '36036.png');
assert.strictEqual(loadedIdentityTexture, 'images/36036.jpg');
assert.strictEqual(
  meliesU.responseOnRunSuccessful.Enumerate.call(meliesU, context.corp.archives).length,
  1,
  '36036 flips after any successful central run',
);
decisions = [];
meliesU.responseOnRunSuccessful.Resolve.call(meliesU, context.corp.archives);
assert.strictEqual(meliesU.flipped, true);
assert.deepStrictEqual(Array.from(meliesU.subTypes), ['Department']);
assert.strictEqual(meliesU.imageFile, '36036-1.webp');
assert.strictEqual(loadedIdentityTexture, 'images/36036-1.webp');
assert.strictEqual(meliesU.renderer.frontTexture.imagePath, 'images/36036-1.webp');
assert.strictEqual(meliesU.renderer.loresTexture.imagePath, 'images/36036-1.webp');
assert.strictEqual(meliesU.renderer.dummy.texture.imagePath, 'images/36036-1.webp');
assert.strictEqual(decisions.length, 0, '36036 only resolves the matching department effect');
const creditsBeforeMelies = creditsGained;
meliesU.responseOnRunnerActionPhaseEnds.Resolve.call(meliesU);
assert.strictEqual(creditsGained, creditsBeforeMelies, '36036 front ability is inactive while flipped');
meliesU.responseOnRunnerDiscardEnds.Resolve.call(meliesU);
assert.strictEqual(meliesU.flipped, false);
assert.strictEqual(meliesU.imageFile, '36036.png');
assert.strictEqual(loadedIdentityTexture, 'images/36036.jpg');
assert(identityFaceUpdates >= 3, '36036 refreshes its renderer when its face changes');
for (const mapping of [
  ['HQ', '36036-0.webp'],
  ['R&D', '36036-1.webp'],
  ['Archives', '36036-2.webp'],
]) {
  meliesU._setDepartment.call(meliesU, mapping[0]);
  meliesU._flipToDepartment.call(meliesU);
  assert.strictEqual(meliesU.imageFile, mapping[1]);
}
meliesU._flipToFront.call(meliesU);
meliesU.responseOnRunnerActionPhaseEnds.Resolve.call(meliesU);
assert.strictEqual(creditsGained, creditsBeforeMelies + 1);

const meliesTopCard = {title: 'Weak R&D card', cardType: 'operation', subTypes: [], elo: 1200};
const meliesArchiveCard = {title: 'Strong Archives card', cardType: 'ice', subTypes: [], elo: 1800};
context.corp.RnD.cards = [meliesTopCard];
meliesTopCard.cardLocation = context.corp.RnD.cards;
context.corp.archives.cards = [meliesArchiveCard];
meliesArchiveCard.cardLocation = context.corp.archives.cards;
context.corp.HQ.cards = [];
meliesU._setDepartment.call(meliesU, 'R&D');
decisions = [];
trashCalls = [];
meliesU.responseOnRunSuccessful.Resolve.call(meliesU, context.corp.RnD);
assert.strictEqual(decisions.length, 1);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 1));
assert.strictEqual(trashCalls[0].cards[0], meliesTopCard);
assert.strictEqual(trashCalls[0].canBePrevented, true);
assert.strictEqual(decisions.length, 2);
decisions[1].choose(decisions[1].choices[0]);
assert.strictEqual(context.corp.HQ.cards[0], meliesArchiveCard);

const lotusHaze = context.cardSet[36037];
lotusHaze.agenda = 0;
context.intended.score = lotusHaze;
lotusHaze.responseOnScored.Resolve.call(lotusHaze);
assert.strictEqual(lotusHaze.agenda, 3);
const secondRemote = {serverName: 'Remote 2', root: [], ice: [{title: 'Protecting ICE'}]};
context.corp.remoteServers = [remote, secondRemote];
context.ChoicesExistingServers = () => [
  {server: context.corp.HQ, label: 'HQ'},
  {server: context.corp.RnD, label: 'R&D'},
  {server: context.corp.archives, label: 'Archives'},
  {server: remote, label: 'Remote 1'},
  {server: secondRemote, label: 'Remote 2'},
];
const movableUpgrade = {
  title: 'Movable upgrade',
  cardType: 'upgrade',
  subTypes: [],
  rezzed: true,
  server: remote,
};
remote.root = [movableUpgrade];
movableUpgrade.cardLocation = remote.root;
installed = {corp: [movableUpgrade], runner: []};
decisions = [];
lotusHaze.abilities[0].Resolve.call(lotusHaze, {card: movableUpgrade});
assert.strictEqual(
  decisions[0].choices.some((choice) => choice.server === remote),
  false,
  '36037 requires another server',
);
decisions[0].choose(decisions[0].choices.find((choice) => choice.server === secondRemote));
assert.strictEqual(secondRemote.root.includes(movableUpgrade), true);
assert.strictEqual(lotusHaze.agenda, 2);
const regionUpgrade = {
  title: 'Region',
  cardType: 'upgrade',
  subTypes: ['Region'],
  rezzed: true,
  server: remote,
};
const existingRegion = {title: 'Existing Region', cardType: 'upgrade', subTypes: ['Region']};
remote.root = [regionUpgrade];
regionUpgrade.cardLocation = remote.root;
secondRemote.root = [existingRegion];
assert.strictEqual(
  lotusHaze._destinationChoices.call(lotusHaze, regionUpgrade).some(
    (choice) => choice.server === secondRemote,
  ),
  false,
  '36037 cannot move a Region into a server that already has one',
);

const esca = context.cardSet[36038];
context.runner.tags = 0;
context.runner.creditPool = 3;
creditsLost = 0;
damageCalls = 0;
context.Damage = (type, amount, preventable, callback, callbackContext) => {
  assert.strictEqual(type, 'net');
  assert.strictEqual(amount, 1);
  assert.strictEqual(preventable, true);
  damageCalls++;
  if (callback) callback.call(callbackContext, []);
};
esca.cardLocation = remote.root;
esca.automaticOnAccess.Resolve.call(esca, esca);
assert.strictEqual(creditsLost, 1);
assert.strictEqual(damageCalls, 0);
context.runner.tags = 1;
context.corp.RnD.cards = [esca];
esca.cardLocation = context.corp.RnD.cards;
esca.faceUp = false;
esca.automaticOnAccess.Resolve.call(esca, esca);
assert.strictEqual(creditsLost, 2);
assert.strictEqual(damageCalls, 1, '36038 does net damage only to a tagged Runner');
assert.strictEqual(esca.faceUp, true, '36038 remains revealed through its R&D access');
esca.automaticOnAccessComplete.Resolve.call(esca, esca);
assert.strictEqual(esca.faceUp, false);
assert.strictEqual(esca.AIPunishesAccess.call(esca, context.corp.RnD), 2);

const ezam = context.cardSet[36039];
const ezamSwapIce = {
  title: 'Swap target',
  cardType: 'ice',
  subTypes: ['Barrier'],
  rezzed: true,
  server: secondRemote,
};
remote.root = [];
remote.ice = [ezam];
secondRemote.root = [];
secondRemote.ice = [ezamSwapIce];
ezam.cardLocation = remote.ice;
ezam.server = remote;
ezamSwapIce.cardLocation = secondRemote.ice;
context.corp.remoteServers = [remote, secondRemote];
installed = {corp: [ezam, ezamSwapIce], runner: []};
context.corp.clickTracker = 3;
ezam.abilities[0].Resolve.call(ezam, {card: ezamSwapIce});
assert.strictEqual(context.corp.clickTracker, 2);
assert.strictEqual(remote.ice[0], ezamSwapIce);
assert.strictEqual(secondRemote.ice[0], ezam);
const topAgenda = {title: 'Top agenda', cardType: 'agenda', subTypes: [], elo: 1600};
const lowerCard = {title: 'Lower card', cardType: 'operation', subTypes: [], elo: 1500};
context.corp.RnD.cards = [lowerCard, topAgenda];
lowerCard.cardLocation = context.corp.RnD.cards;
topAgenda.cardLocation = context.corp.RnD.cards;
context.corp.AI = {preferred: null};
decisions = [];
ezam.subroutines[0].Resolve.call(ezam);
assert.strictEqual(context.corp.AI.preferred.option.id, 1);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 1));
assert.strictEqual(context.corp.RnD.cards[0], topAgenda);
lingering.length = 0;
ezam.subroutines[1].Resolve.call(ezam);
assert.strictEqual(lingering[0].modifyStrength.Resolve.call(lingering[0], ezamSwapIce), 1);
assert.strictEqual(
  lingering[0].modifyStrength.Resolve.call(lingering[0], {cardType: 'ice'}),
  0,
  '36039 snapshots the ICE present when its subroutine resolves',
);
lingering[0].responseOnRunEnds.Resolve.call(lingering[0]);
assert.strictEqual(lingering.length, 0);
const ezamAI = {sr: []};
ezam.AIImplementIce.call(ezam, {}, ezamAI, 0, false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(ezamAI.sr)), [
  [['misc_minor']],
  [['strengthenAllIce']],
]);
vm.runInContext(
  runCalculatorSource + '\nthis.Batch8RunCalculator = RunCalculator;',
  context,
  {filename: 'runcalculator.js'},
);
const routeCalculator = new context.Batch8RunCalculator();
const routeOuterIce = {title: 'Outer route ICE'};
const routeInnerIce = {title: 'Inner route ICE'};
routeCalculator.precalculated.iceAIs = [
  {ice: routeInnerIce},
  {ice: routeOuterIce},
];
const strengthenedRoute = routeCalculator.ValidateEncounterPoint(
  0,
  routeCalculator.EmptyPoint(1),
  false,
  ['strengthenAllIce'],
  [],
  {ice: routeOuterIce},
  [],
  [],
);
assert.deepStrictEqual(
  Array.from(strengthenedRoute.card_str_mods, (mod) => [mod.card.title, mod.amt, mod.persist]),
  [
    ['Inner route ICE', 1, true],
    ['Outer route ICE', 1, true],
  ],
  '36039 run model carries the strength gain to later ICE',
);

const knowledgeSeeker = context.cardSet[36040];
knowledgeSeeker.virus = 0;
knowledgeSeeker.rezzed = true;
knowledgeSeeker.subroutines[0].Resolve.call(knowledgeSeeker);
assert.strictEqual(knowledgeSeeker.virus, 1);
const rndLow = {title: 'Low', cardType: 'operation', subTypes: [], elo: 1100};
const rndAgenda = {title: 'Agenda', cardType: 'agenda', subTypes: [], elo: 1400};
const rndHigh = {title: 'High', cardType: 'ice', subTypes: [], elo: 1800};
const rndMiddle = {title: 'Middle', cardType: 'asset', subTypes: [], elo: 1500};
context.corp.RnD.cards = [rndHigh, rndAgenda, rndLow, rndMiddle];
for (const card of context.corp.RnD.cards) card.cardLocation = context.corp.RnD.cards;
context.corp.AI = {};
knowledgeSeeker.subroutines[1].Resolve.call(knowledgeSeeker);
assert.strictEqual(
  context.corp.RnD.cards[context.corp.RnD.cards.length - 1],
  rndHigh,
  '36040 AI arranges the highest-value card on top',
);
let purges = 0;
context.Purge = (callback, callbackContext) => {
  purges++;
  knowledgeSeeker.virus = 0;
  if (callback) callback.call(callbackContext);
};
context.Derez = (card) => {
  card.rezzed = false;
};
knowledgeSeeker.virus = 3;
knowledgeSeeker.responseOnEncounterEnds.Resolve.call(knowledgeSeeker);
assert.strictEqual(purges, 1);
assert.strictEqual(knowledgeSeeker.rezzed, false);
assert.strictEqual(knowledgeSeeker.virus, 0);
const seekerAI = {sr: []};
knowledgeSeeker.virus = 2;
knowledgeSeeker.AIImplementIce.call(knowledgeSeeker, {}, seekerAI, 0, false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(seekerAI.sr)), [
  [['misc_moderate']],
  [['misc_minor']],
  [['endTheRun']],
]);
const purgeMechanicsSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
vm.runInContext(purgeMechanicsSource, context, {filename: 'mechanics.js'});
const purgeOrder = [];
const purgedCard = {virus: 2};
context.ApplyToAllCards = (callback) => callback(purgedCard);
context.PlaySound = () => {};
context.playerTurn = context.corp;
context.TriggeredResponsePhase = (player, hook, params, continuation) => {
  assert.strictEqual(hook, 'responseOnPurge');
  assert.strictEqual(params[0], 2);
  purgeOrder.push('responses');
  continuation();
};
const purgeCallbackContext = {};
context.Purge(function (numPurged) {
  assert.strictEqual(this, purgeCallbackContext);
  assert.strictEqual(numPurged, 2);
  purgeOrder.push('callback');
}, purgeCallbackContext);
assert.deepStrictEqual(purgeOrder, ['responses', 'callback']);
assert.strictEqual(purgedCard.virus, 0, 'Purge callback runs after counters are removed');

// Batch 9: Jinteki cards 36041-36045.
const batch9Damage = [];
context.Damage = (type, amount, preventable, callback, callbackContext) => {
  batch9Damage.push({type, amount, preventable});
  if (callback) callback.call(callbackContext, []);
};
context.AddTags = (amount, callback, callbackContext) => {
  context.runner.tags += amount;
  if (callback) callback.call(callbackContext);
};
context.RemoveTags = (amount) => {
  context.runner.tags = Math.max(0, context.runner.tags - amount);
};
context.runner.creditPool = 5;
context.CheckCredits = (player, amount) => player.creditPool >= amount;
context.SpendCredits = (player, amount, doing, card, callback, callbackContext) => {
  player.creditPool -= amount;
  if (callback) callback.call(callbackContext);
};
let jackOuts = 0;
context.CheckRunning = () => true;
context.JackOut = () => {
  jackOuts++;
};

const lionsmane = context.cardSet[36041];
lionsmane.subroutines[0].Resolve.call(lionsmane);
assert.deepStrictEqual(batch9Damage.pop(), {type: 'net', amount: 2, preventable: true});
decisions = [];
lionsmane.subroutines[1].Resolve.call(lionsmane);
assert.strictEqual(decisions[0].choices.length, 2);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 1));
assert.strictEqual(context.runner.creditPool, 2, '36041 accepts the 3-credit alternative');
decisions = [];
lionsmane.subroutines[2].Resolve.call(lionsmane);
decisions[0].choose(decisions[0].choices.find((choice) => choice.id === 1));
assert.strictEqual(jackOuts, 1, '36041 lets the Runner jack out instead of taking damage');
const lionsmaneAI = {sr: []};
lionsmane.AIImplementIce.call(lionsmane, {}, lionsmaneAI, 0, false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(lionsmaneAI.sr)), [
  [['netDamage', 'netDamage']],
  [['payCredits', 'payCredits', 'payCredits'], ['netDamage', 'netDamage']],
  [['endTheRun'], ['netDamage', 'netDamage']],
]);

const vicsek = context.cardSet[36042];
context.runner.tags = 2;
batch9Damage.length = 0;
vicsek.subroutines[0].Resolve.call(vicsek);
assert.deepStrictEqual(batch9Damage[0], {type: 'net', amount: 2, preventable: true});
assert.strictEqual(context.runner.tags, 4, '36042 snapshots X before damage and adds X tags');
let vicsekTrashed = false;
context.Trash = (card, preventable, callback, callbackContext) => {
  assert.strictEqual(preventable, false);
  if (card === vicsek) vicsekTrashed = true;
  if (callback) callback.call(callbackContext, [card]);
};
vicsek.subroutines[1].Resolve.call(vicsek);
assert.strictEqual(context.runner.tags, 5);
assert.strictEqual(vicsekTrashed, true);
const vicsekAI = {sr: []};
context.runner.tags = 2;
vicsek.AIImplementIce.call(vicsek, {}, vicsekAI, 0, false);
assert.deepStrictEqual(JSON.parse(JSON.stringify(vicsekAI.sr)), [
  [['netDamage', 'netDamage', 'tag', 'tag']],
  [['tag']],
]);

const cultivate = context.cardSet[36043];
const cultivateLow = {title: 'Low', cardType: 'operation', subTypes: [], elo: 1000};
const cultivateMid = {title: 'Mid', cardType: 'asset', subTypes: [], elo: 1400};
const cultivateHigh = {title: 'High', cardType: 'ice', subTypes: [], elo: 1900};
const cultivateAgenda = {
  title: 'Agenda',
  cardType: 'agenda',
  subTypes: [],
  elo: 1700,
};
const cultivateOther = {title: 'Other', cardType: 'operation', subTypes: [], elo: 1500};
context.corp.RnD.cards = [
  cultivateLow,
  cultivateMid,
  cultivateHigh,
  cultivateAgenda,
  cultivateOther,
];
context.corp.HQ.cards = [];
context.corp.archives.cards = [];
for (const card of context.corp.RnD.cards) card.cardLocation = context.corp.RnD.cards;
context.Trash = (card, preventable, callback, callbackContext) => {
  assert.strictEqual(preventable, false);
  context.MoveCard(card, context.corp.archives.cards);
  if (callback) callback.call(callbackContext, [card]);
};
context.corp.AI = {};
decisions = [];
cultivate.Resolve.call(cultivate);
assert.strictEqual(decisions[0].choices[0].card, cultivateLow);
decisions[0].choose(decisions[0].choices[0]);
assert.strictEqual(decisions[1].choices[0].card, cultivateAgenda);
decisions[1].choose(decisions[1].choices[0]);
assert.strictEqual(context.corp.archives.cards[0], cultivateLow);
assert.strictEqual(context.corp.HQ.cards[0], cultivateAgenda);
assert.strictEqual(
  context.corp.RnD.cards[context.corp.RnD.cards.length - 1],
  cultivateHigh,
  '36043 AI leaves the highest-value remaining card on top',
);
assert.strictEqual(cultivate.AIWouldPlay.call(cultivate), true);

const unleash = context.cardSet[36044];
let unleashedSubroutine = 0;
const unleashIce = {
  title: 'Expensive ice',
  cardType: 'ice',
  subTypes: ['Sentry'],
  rezCost: 8,
  rezzed: false,
  subroutines: [
    {
      text: 'End the run.',
      Resolve() {
        unleashedSubroutine++;
      },
    },
  ],
};
installed = {corp: [unleashIce], runner: []};
context.runner.tags = 1;
context.ChoicesSubroutine = (card, ability) => [{card, ability, choice: null}];
context.AutomaticTriggers = () => {};
context.Trigger = (card, ability, params) => ability.Resolve.call(card, params);
context.Rez = (
  card,
  ignoreAllCosts,
  onRezResolve,
  callbackContext,
  allowCancel,
  costReduction,
  afterRezResponses,
) => {
  assert.strictEqual(ignoreAllCosts, true);
  card.rezzed = true;
  if (afterRezResponses) afterRezResponses.call(callbackContext);
};
decisions = [];
unleash.Resolve.call(unleash, {card: unleashIce});
assert.strictEqual(context.runner.tags, 0, '36044 removes a tag as an additional cost');
assert.strictEqual(unleashIce.rezzed, true);
decisions[0].choose(decisions[0].choices[0]);
decisions[1].choose(decisions[1].choices[0]);
assert.strictEqual(unleashedSubroutine, 1);
context.runner.tags = 0;
unleashIce.rezzed = false;
assert.strictEqual(unleash.Enumerate.call(unleash).length, 0);

const redRoom = context.cardSet[36045];
redRoom.server = context.corp.HQ;
redRoom.power = 0;
context.Counters = (card, type) => card[type] || 0;
context.EndTheRun = () => {
  endedRuns++;
};
redRoom.triggeredThisTurn = false;
redRoom.responseOnScored.Resolve.call(redRoom);
redRoom.responseOnStolen.Resolve.call(redRoom);
assert.strictEqual(redRoom.power, 1, '36045 triggers only once per turn');
redRoom.responseOnRunnerTurnBegins.Resolve.call(redRoom);
redRoom.responseOnStolen.Resolve.call(redRoom);
assert.strictEqual(redRoom.power, 2, '36045 resets on the next turn');
context.attackedServer = context.corp.HQ;
assert.strictEqual(redRoom.abilities[0].Enumerate.call(redRoom).length, 0);
context.attackedServer = context.corp.RnD;
context.corp.AI = null;
assert.strictEqual(redRoom.abilities[0].Enumerate.call(redRoom).length, 1);
redRoom.abilities[0].Resolve.call(redRoom);
assert.strictEqual(redRoom.power, 1);
assert.strictEqual(endedRuns, 4);
context.corp.AI = {_runnerMayWinIfServerBreached: () => true};
assert.strictEqual(redRoom.AIGlobalETRUses.call(redRoom, context.corp.RnD), 1);
assert.strictEqual(redRoom.AIGlobalETRUses.call(redRoom, context.corp.HQ), 0);
assert.strictEqual(redRoom.installOnlyIn.call(redRoom, context.corp.archives), true);
assert.strictEqual(redRoom.installOnlyIn.call(redRoom, remote), false);
assert.strictEqual(
  redRoom.AIDefensiveValue.call(redRoom, context.corp.HQ),
  0,
  '36045 does not count as local protection for its own server',
);
assert.strictEqual(redRoom.AIDefensiveValue.call(redRoom, context.corp.RnD), 2);

console.log('Vantage Point integration and Batch 1-9 behavior checks passed.');
