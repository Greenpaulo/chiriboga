// Shared engine paths required by Vantage Point Batch 11.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const corp = {
  side: 'corp', creditPool: 3, clickTracker: 2, badPublicity: 0,
  HQ: {cards: []}, RnD: {cards: []}, archives: {cards: []},
  resolvingCards: [], remoteServers: [], identityCard: {title: 'Test identity'},
};
const runner = {side: 'runner', creditPool: 5, temporaryCredits: 0, grip: [], tags: 0};
let installed = [];
const context = {
  console, corp, runner, cardSet: [], setIdentifiers: [],
  attackedServer: null, approachIce: 0, playerTurn: runner,
  phases: {runEncounterEnd: {}, runPassesIce: {}},
  Log: () => {}, GetTitle: (card) => card.title,
  CheckCardType: (card, types) => types.includes(card.cardType),
  CheckAdvance: (card) => !!card.canBeAdvanced,
  CheckTrash: (card) => card.trashable !== false,
  CheckInstalled: (card) => installed.includes(card),
  CheckHasAbilities: (card) => !card.disabled,
  Counters: (card, type) => card[type] || 0,
  InstalledCards: () => installed,
  ChoicesInstalledCards: (player) => [],
  GetServer: (card) => corp.remoteServers.find((s) => s.root.includes(card) || s.ice.includes(card)),
  Credits: (player) => player.creditPool,
  PlayCost: (card) => card.playCost,
  PlayClickCost: (card) => card.subTypes.includes('Double') ? 2 : 1,
  RezCost: (card) => card.rezCost + (card.modifyRezCost ? card.modifyRezCost.Resolve.call(card, card) : 0),
};
const testStubs = {...context};
vm.createContext(context);
for (const file of ['config.js', 'sets/vantagepoint.js', 'mechanics.js', 'utility.js', 'ai_runner.js', 'ai_corp.js', 'runcalculator.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
Object.assign(context, testStubs);
context.CheckCredits = (player, amount) => player.creditPool >= amount;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed;
context.AdvancementRequirement = (card) => card.advancementRequirement;
context.activePlayer = corp;
vm.runInContext('this.testAI = new CorpAI(); this.testRC = new RunCalculator();', context);
const ai = context.testAI;
corp.AI = ai;
const rc = context.testRC;
ai._log = () => {};
ai._clicksLeft = () => corp.clickTracker;

//Bypass waits for responses (including tag prevention) before encounter-end.
const lethe = context.cardSet[36051];
context.attackedServer = {ice: [lethe]};
runner.AI = {cachedBestPath: [{}]};
const bypassOrder = [];
let finishBypass;
context.TriggeredResponsePhase = (player, name, args, callback) => {
  assert.strictEqual(name, 'responseOnBypassed');
  assert.strictEqual(args[0], lethe);
  bypassOrder.push('response');
  finishBypass = callback;
};
context.ChangePhase = (phase) => {
  assert.strictEqual(phase, context.phases.runEncounterEnd);
  bypassOrder.push('encounter end');
};
context.Bypass();
assert.strictEqual(runner.AI.cachedBestPath, null);
assert.deepStrictEqual(bypassOrder, ['response']);
finishBypass();
assert.deepStrictEqual(bypassOrder, ['response', 'encounter end']);
assert.strictEqual(context.phases.runEncounterEnd.next, context.phases.runPassesIce);
runner.AI = null;
context.attackedServer = null;

//Return the host before trashing its hosted cards, then run the continuation.
const hosted = {title: 'Hosted program'};
const host = {title: 'Returning host', hostedCards: [hosted]};
const uninstallOrder = [];
context.MoveCard = (card, destination) => {
  assert.strictEqual(card, host);
  assert.strictEqual(destination, runner.stack);
  uninstallOrder.push('move');
};
let finishHostedTrash;
context.Trash = (cards, preventable, callback) => {
  assert.deepStrictEqual(Array.from(cards), [hosted]);
  assert.strictEqual(preventable, false);
  uninstallOrder.push('trash hosted');
  finishHostedTrash = callback;
};
const callbackContext = {};
context.Uninstall(host, runner.stack, function () {
  assert.strictEqual(this, callbackContext);
  uninstallOrder.push('shuffle');
}, callbackContext);
assert.deepStrictEqual(uninstallOrder, ['move', 'trash hosted']);
assert.strictEqual(host.hostedCards.length, 1, 'hosted trash receives a copy');
finishHostedTrash();
assert.deepStrictEqual(uninstallOrder, ['move', 'trash hosted', 'shuffle']);
let emptyHostFinished = false;
context.MoveCard = () => {};
context.Trash = () => { throw new Error('empty host must not start a trash phase'); };
context.Uninstall({hostedCards: []}, runner.grip, () => { emptyHostFinished = true; });
assert(emptyHostFinished);

//Run calculation charges the tag only for a full break or bypass.
const iceAI = {ice: lethe, sr: [[[]], [[]]], fullyBrokenEffects: ['tag'], bypassEffects: ['tag']};
rc.precalculated.iceAIs = [iceAI];
rc.baseClicks = 4;
rc.basePoolCredits = 5;
const complete = (point) => rc.Directions({}, point, Infinity, Infinity, 4, 5, 0, Infinity, false)
  .find((p) => p.iceIdx === -1);
const fullBreak = rc.EmptyPoint(0);
fullBreak.sr_broken = [{idx: 0}, {idx: 1}];
assert.strictEqual(rc.TotalEffect(complete(fullBreak)).tag, 1);
const partialBreak = rc.EmptyPoint(0);
partialBreak.sr_broken = [{idx: 1}];
assert.strictEqual(rc.TotalEffect(complete(partialBreak)).tag || 0, 0);
lethe.subroutines[0].broken = true;
assert.strictEqual(rc.TotalEffect(complete(partialBreak)).tag, 1, 'recalculation combines actual earlier breaks with planned remaining breaks');
lethe.subroutines[0].broken = false;
context.encountering = true;
context.attackedServer = {ice: [lethe]};
lethe.fullyBrokenThisEncounter = true;
const alreadyTaggedAI = {sr: []};
lethe.AIImplementIce.call(lethe, rc, alreadyTaggedAI, 0, false);
assert.strictEqual(alreadyTaggedAI.fullyBrokenEffects.length, 0, 'recalculation does not charge a tag already resolved this encounter');
context.encountering = false;
context.attackedServer = null;
lethe.AIImplementIce.call(lethe, rc, alreadyTaggedAI, 0, false);
assert.strictEqual(alreadyTaggedAI.fullyBrokenEffects.length, 1, 'future encounters still model the tag');
lethe.fullyBrokenThisEncounter = false;
const bypassPoint = rc.EmptyPoint(0);
bypassPoint.persistents = [{iceIdx: 0, action: 'bypass'}];
assert.strictEqual(rc.TotalEffect(complete(bypassPoint)).tag, 1);
bypassPoint.sr_broken = [{idx: 0}, {idx: 1}];
assert.strictEqual(rc.TotalEffect(complete(bypassPoint)).tag, 1, 'bypass branch never double-charges a full-break effect');
const unrelatedAI = {ice: {}, sr: [[[]]]};
rc.precalculated.iceAIs = [unrelatedAI];
const unrelatedBreak = rc.EmptyPoint(0);
unrelatedBreak.sr_broken = [{idx: 0}];
assert.strictEqual(rc.TotalEffect(complete(unrelatedBreak)).tag || 0, 0);

//Flood the Market consumes exactly three credits and two clicks, once.
const flood = context.cardSet[36053];
const agenda = {title: 'Target', cardType: 'agenda', canBeAdvanced: true, advancement: 0, advancementRequirement: 3};
corp.remoteServers = [
  {root: [agenda], ice: [{}]}, {root: [{}], ice: [{}]}, {root: [{}], ice: [{}]},
];
installed = [agenda];
corp.HQ.cards = [flood];
const starting = {corpCredits: 3, corpClicks: 2, handCards: [flood], advancementSoFar: 0, persist: []};
const options = {card: agenda, thisTurn: true, limit: 3};
const direction = ai._potentialAdvancementDirections(starting, options).find((p) => p.using === flood);
assert(direction);
assert.strictEqual(direction.corpCredits, 0);
assert.strictEqual(direction.corpClicks, 0);
assert.strictEqual(direction.advancementSoFar, 3);
assert.strictEqual(direction.handCards.length, 0);
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpClicks: 1}, options).some((p) => p.using === flood), false);
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpCredits: 2}, options).some((p) => p.using === flood), false);
const plan = [];
assert.strictEqual(ai._potentialAdvancement(agenda, 3, true, [flood], 2, plan), 3);
assert.strictEqual(plan[0], flood, 'actual advancement search selects Flood the Market');
corp.resolvingCards = [flood];
const resolving = ai._potentialAdvancementDirections({...starting, corpCredits: 0, corpClicks: 0}, options).find((p) => p.using === flood);
assert.strictEqual(resolving.advancementSoFar, 3, 'already-paid operation places counters without charging again');
corp.resolvingCards = [];

//Hype Machine is a same-server one-shot, with its actual rez cost.
const hype = context.cardSet[36055];
corp.remoteServers[0].root.push(hype);
installed.push(hype);
hype.rezzed = false;
let upgradeDirection = ai._potentialAdvancementDirections({...starting, handCards: []}, options).find((p) => p.using === hype);
assert.strictEqual(upgradeDirection, undefined, 'cannot afford six-credit rez');
hype.agendaScoredOrStolenThisTurn = true;
upgradeDirection = ai._potentialAdvancementDirections({...starting, handCards: []}, options).find((p) => p.using === hype);
assert.strictEqual(upgradeDirection.advancementSoFar, 1);
assert.strictEqual(upgradeDirection.corpClicks, 2);
assert.strictEqual(upgradeDirection.corpCredits, 3);
assert.strictEqual(ai._potentialAdvancementDirections(upgradeDirection, options).some((p) => p.using === hype), false);
assert.strictEqual(hype.AIFastAdvanceCounters.call(hype, {canBeAdvanced: true}), 0, 'different-server cards receive no counters');
const hypePlan = [];
assert.strictEqual(ai._potentialAdvancement(agenda, 1, true, [], 0, hypePlan), 1);
assert.strictEqual(hypePlan[0], hype);
assert.strictEqual(starting.persist.length, 0);
assert.strictEqual(hype.rezzed, false, 'planning does not rez or consume the upgrade');
assert.strictEqual(agenda.advancement, 0, 'planning does not advance the target');
hype.disabled = true;
assert.strictEqual(ai._potentialAdvancementDirections({...starting, handCards: []}, options).some((p) => p.using === hype), false, 'disabled upgrades contribute no counters');
hype.disabled = false;
hype.agendaScoredOrStolenThisTurn = false;
context.playerTurn = corp;
const paidUpgrade = ai._potentialAdvancementDirections({...starting, corpCredits: 8, handCards: []}, options).find((p) => p.using === hype);
assert.strictEqual(paidUpgrade.corpCredits, 2, 'unrezzed upgrade pays exactly six credits');
hype.rezzed = true;
const rezzedUpgrade = ai._potentialAdvancementDirections({...starting, corpCredits: 0, handCards: []}, options).find((p) => p.using === hype);
assert.strictEqual(rezzedUpgrade.corpCredits, 0, 'rezzed upgrade never pays rez costs again');
hype.rezzed = false;
//Full rez policy must see simulated resources and counters, not the live board.
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpCredits: 6, handCards: []}, options).some((p) => p.using === hype), false, 'rez leaves too few credits to finish the agenda');
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpCredits: 8, corpClicks: 3, handCards: []}, options).some((p) => p.using === hype), false, 'ordinary clicks suffice without paying for the upgrade');
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpCredits: 8, advancementSoFar: 1, handCards: []}, options).some((p) => p.using === hype), false, 'simulated advancement makes the paid upgrade unnecessary');
const originalRezUsability = hype.RezUsability;
hype.RezUsability = () => false;
assert.strictEqual(ai._potentialAdvancementDirections({...starting, corpCredits: 8, handCards: []}, options).some((p) => p.using === hype), false, 'policy rejection removes the upgrade from the plan');
hype.rezzed = true;
assert(ai._potentialAdvancementDirections({...starting, corpCredits: 0, handCards: []}, options).some((p) => p.using === hype), 'already rezzed upgrades bypass rez policy');
hype.rezzed = false;
context.activePlayer = runner;
const liveState = [corp.creditPool, corp.clickTracker, agenda.advancement, context.activePlayer];
hype.RezUsability = () => {
  assert.deepStrictEqual([corp.creditPool, corp.clickTracker, agenda.advancement, context.activePlayer], [8, 2, 1, corp]);
  assert.strictEqual(context.AIHypothetical.depth, 1);
  throw new Error('rez probe failure');
};
assert.throws(() => ai._potentialAdvancementDirections({...starting, corpCredits: 8, advancementSoFar: 1, handCards: []}, options), /rez probe failure/);
assert.deepStrictEqual([corp.creditPool, corp.clickTracker, agenda.advancement, context.activePlayer], liveState, 'exception restores every simulated field');
assert.strictEqual(context.AIHypothetical.depth, 0);
delete agenda.advancement;
assert.throws(() => ai._potentialAdvancementDirections({...starting, corpCredits: 8, advancementSoFar: 1, handCards: []}, options), /rez probe failure/);
assert.strictEqual(Object.hasOwn(agenda, 'advancement'), false, 'probe restores an absent advancement property');
agenda.advancement = 0;
hype.RezUsability = originalRezUsability;
context.activePlayer = corp;
assert.deepStrictEqual([corp.creditPool, corp.clickTracker, agenda.advancement], liveState.slice(0, 3));
//The final command gate independently rechecks a supplied advancement plan.
const selectionAI = vm.runInContext('new CorpAI()', context);
selectionAI._log = () => {};
selectionAI._sufficientEconomy = () => true;
selectionAI.Phase_PostAction = (choices) => choices.indexOf('n');
selectionAI._isFullyAdvanceableAgenda = (card) => card === agenda;
selectionAI._isFullyAdvanceableHostileAsset = () => false;
selectionAI._criticalBreachDefenseAction = () => -1;
selectionAI._obsoleteBluff = () => false;
selectionAI._advancementLimit = () => 3;
selectionAI._deceptionAdvancementTarget = (card, server, limit) => limit;
selectionAI._protectionScore = () => 10;
selectionAI._potentialAdvancement = (card, limit, thisTurn, hand, clicks, output) => {
  if (output) output.push(hype);
  return 3;
};
context.CheckSubType = () => false;
context.FullCheckPlay = () => false;
corp.HQ.cards = [];
hype.RezUsability = () => false;
corp.creditPool = 8;
const selectionOptions = ['rez', 'advance', 'n'];
assert.strictEqual(selectionAI.Phase_Main(selectionOptions), 1, 'unusable planned upgrade falls back to ordinary advancement');
assert.strictEqual(selectionAI.preferred.cardToRez, undefined);
hype.RezUsability = () => true;
//Affordability is still required by the real FullCheckRez.
corp.creditPool = 8;
selectionAI.preferred = null;
assert.strictEqual(selectionAI.Phase_Main(selectionOptions), 0, 'usable planned upgrade is rezzed');
assert.strictEqual(selectionAI.preferred.cardToRez, hype);
corp.creditPool = liveState[0];
hype.RezUsability = originalRezUsability;
//Actual command selection banks the free rez in post-action and Runner EOT.
context.CheckCredits = (player, amount) => player.creditPool >= amount;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed;
context.executingCommand = '';
hype.rezzed = false;
hype.agendaScoredOrStolenThisTurn = true;
corp.remoteServers[0].root = [hype]; //the agenda was just scored
installed = [hype];
for (const identifier of ['Corp 2.2*', 'Runner 2.2']) {
  context.currentPhase = {identifier, title: 'Rez window'};
  context.playerTurn = identifier === 'Runner 2.2' ? runner : corp;
  ai.preferred = null;
  assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 0, identifier + ' banks the free Hype Machine rez');
  assert.strictEqual(ai.preferred.cardToRez, hype);
  context.executingCommand = 'rez';
  assert.strictEqual(ai.Choice([{card: hype}], 'select'), 0, 'the command preference selects the actual upgrade');
  context.executingCommand = '';
}
context.currentPhase = {identifier: 'Corp 2.2*', title: 'Rez window'};
context.playerTurn = corp;
hype.agendaScoredOrStolenThisTurn = false;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1, 'no gratuitous six-credit rez');
hype.agendaScoredOrStolenThisTurn = true;
hype.rezzed = true;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1, 'already-rezzed upgrade is not selected again');
hype.rezzed = false;
assert.strictEqual(ai.Choice(['n'], 'command'), 0, 'a rez is never selected outside a legal rez window');
console.log('Vantage Point Batch 11 shared engine checks passed.');
