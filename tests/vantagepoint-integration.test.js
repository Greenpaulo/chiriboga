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
  runner: {side: 'runner', AI: null, grip: [], clickTracker: 4},
  corp: {
    side: 'corp',
    AI: null,
    HQ: {serverName: 'HQ'},
    RnD: {serverName: 'R&D'},
    archives: {serverName: 'Archives', cards: []},
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
takeADive.automaticOnSubroutineResolved.Resolve.call(takeADive, {}, {});
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
  phaseSource.includes('AutomaticTriggers("automaticOnSubroutineResolved"'),
  '36002 engine hook records a resolved subroutine',
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
const mechanicsSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
assert(
  /cards\.length < 1[\s\S]*afterTrashing\.call\(context, cards\)/.test(
    mechanicsSource,
  ),
  'zero prevented damage still continues its resolution callback',
);

console.log('Vantage Point integration and Batch 1-2 behavior checks passed.');
