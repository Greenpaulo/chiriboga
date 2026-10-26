'use strict';
// Downfall batch 11: NBN grip/steal punishment, R&D ambush and Weyland steal-protection agendas.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
// Phase templates are copied with jQuery.extend, so the real phase chain needs a working deep extend.
const plain = v => v && typeof v == 'object' && (Array.isArray(v) || Object.getPrototypeOf(Object.getPrototypeOf(v) || {}) == null);
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && plain(value) ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jq = new Proxy(function () {}, {get: (t, k) => k == 'extend' ? extend : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: jq, jQuery: jq, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/downfall.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = corp; c.activePlayer = corp; c.viewingPlayer = corp;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command) => {
  const d = {player, choices, title, command, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
let responseQueue = [];
// Windows under test are queued for inspection; other windows continue at once.
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
const watched = new Set();
c.TriggeredResponsePhase = (player, name, params, after) => {
  if (watched.has(name)) responseQueue.push({name, params, after});
  else if (after) after();
};
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const takeResponse = name => {
  const i = responseQueue.findIndex(event => event.name == name);
  assert(i >= 0, 'expected ' + name + ' response window');
  return responseQueue.splice(i, 1)[0];
};
const offered = (event, target) => c.ChoicesActiveTriggers(event.name)
  .filter(option => option.card == target)
  .map(option => option.card[event.name].Enumerate ? option.card[event.name].Enumerate.apply(option.card, event.params) : [{}])
  .flat();
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, message);
const withAI = (side, value, fn) => {const saved = side.AI; side.AI = value; try {return fn();} finally {side.AI = saved;}};
const program = (title, subTypes) => ({title, player: runner, cardType: 'program', subTypes, memoryCost: 1, installCost: 1});
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
// Drive the engine's trash-before-install window as a player passing it.
const finishInstall = () => {for (let k = 0; k < 5 && c.currentPhase.title == 'Trash Before Install'; k++) c.currentPhase.Resolve.n();};
const reset = () => {
  c.turnEventCounts = {}; runner.grip.length = 0; runner.scoreArea.length = 0; corp.scoreArea.length = 0;
  corp.resolvingCards.length = 0; runner.stack.length = 0;
  c.attackedServer = null; c.encountering = false; c.encounteredIce = null;
  runner.identityCard.faction = 'Shaper'; c.intended.score = null; c.intended.steal = null;
  decisions = []; responseQueue = []; ai.preferred = null; c.executingCommand = '';
  for (const zone of [corp.HQ.root, corp.RnD.root, corp.archives.root, corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice, corp.archives.ice,
    runner.rig.programs, runner.rig.hardware, runner.rig.resources, runner.heap]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
};

const filler = (title = 'Sure Gamble', type = 'event', faction = 'Shaper') =>
  ({title, player: runner, cardType: type, faction, subTypes: [], installCost: 1});
const grip = n => {for (let i = 0; i < n; i++) put(filler(), runner.grip);};
const chooseAI = async side => {
  const decision = decisions.shift(); assert(decision, 'expected decision');
  const old = c.currentPhase;
  c.currentPhase = {identifier: old.identifier, title: decision.title};
  const index = await side.AI.SelectChoice(decision.choices);
  c.currentPhase = old;
  const choice = decision.choices[index]; assert(choice, 'legal AI choice'); decision.choose(choice); return choice;
};
const fire = (name, params = []) => {
  for (const option of c.ChoicesActiveTriggers(name)) {
    const hook = option.card[name];
    if (hook.automatic) hook.Resolve.apply(option.card, params);
  }
};
const breaker = (title, cost = 2) => Object.assign(program(title, ['Icebreaker', 'Fracter']), {installCost: cost});
const resource = (title, cost) => ({title, player: runner, cardType: 'resource', subTypes: [], installCost: cost});
const reveals = () => {while (decisions.length && /^Revealing /.test(decisions[0].title)) decisions.shift().choose({});};
async function main() {
// ---- Focus Group: last-turn condition, reveal, bounded X and placement.
reset(); grip(3);
const focus = put(card(26052), corp.HQ.cards);
assert.strictEqual(focus.Enumerate().length, 0, 'needs a successful run last turn');
focus.responseOnRunSuccessful.Resolve.call(focus);
assert.strictEqual(focus.Enumerate().length, 0, 'Corp-turn runs do not count');
c.playerTurn = runner; focus.responseOnRunnerTurnBegins.Resolve.call(focus); focus.responseOnRunSuccessful.Resolve.call(focus);
c.playerTurn = corp; assert.strictEqual(focus.Enumerate().length, 1);
const dest = remote(); const sds = put(card(26056), dest.root); sds.advancement = 1;
put(program('Rig program', []), runner.rig.programs);
runner.grip[0].cardType = 'program';
withAI(corp, null, () => {
  focus.Resolve();
  let d = decisions.shift(); same(d.choices.map(choice => choice.cardType), ['event', 'hardware', 'program', 'resource']);
  d.choose(d.choices[0]); reveals();
  d = decisions.shift(); same(d.choices.map(choice => choice.id), [2, 1, 0], 'X is bounded by revealed events');
  d.choose(d.choices[0]);
  d = decisions.shift();
  assert(d.choices.some(option => option.card == runner.rig.programs[0]), 'any installed card is a legal target');
  d.choose(d.choices.find(option => option.card == sds));
});
assert.strictEqual(sds.advancement, 3); assert.strictEqual(corp.creditPool, 8);
corp.creditPool = 1;
withAI(corp, null, () => {
  focus.Resolve(); decisions.shift().choose({cardType: 'event'}); reveals();
  const d = decisions.shift(); same(d.choices.map(choice => choice.id), [1, 0], 'X is bounded by credits');
  d.choose(d.choices[1]);
});
assert.strictEqual(decisions.length, 0, 'X = 0 declines to pay'); assert.strictEqual(sds.advancement, 3);
withAI(corp, null, () => {focus.Resolve(); decisions.shift().choose({cardType: 'hardware'}); reveals();});
assert.strictEqual(decisions.length, 0, 'no matching cards ends the effect');
c.playerTurn = runner; focus.responseOnRunnerTurnBegins.Resolve.call(focus); c.playerTurn = corp;
assert.strictEqual(focus.Enumerate().length, 0, 'the condition expires with the next Runner turn');
// Corp AI: real play selector, type guess from public cards and capped placement.
reset(); grip(4); corp.creditPool = 10;
const fg = put(card(26052), corp.HQ.cards); fg.successfulRunLastTurn = true;
const agenda = put(card(26056), remote().root); agenda.advancement = 1; agenda.canBeAdvanced = true;
for (let i = 0; i < 3; i++) put(program('Seen ' + i, []), runner.heap);
runner.grip[0].cardType = runner.grip[1].cardType = 'program';
assert.strictEqual(await ai.CommandChoice(['play', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToPlay, fg);
ai.preferred = null; c.MoveCard(fg, corp.resolvingCards);
fg.Resolve();
assert.strictEqual((await chooseAI(corp)).cardType, 'program', 'guesses from the heap, not the grip');
reveals();
assert.strictEqual((await chooseAI(corp)).id, 2);
assert.strictEqual((await chooseAI(corp)).card, agenda);
assert.strictEqual(agenda.advancement, 3);
agenda.advancement = 4; corp.creditPool = 10; ai.preferred = null; c.MoveCard(fg, corp.HQ.cards);
fg.Resolve(); await chooseAI(corp); reveals();
assert.strictEqual((await chooseAI(corp)).id, 1, 'never over-places beyond the requirement');
decisions.length = 0; ai.preferred = null;
fg.successfulRunLastTurn = false;
assert.strictEqual(await ai.CommandChoice(['play', 'gain']), 1, 'held without the condition');
fg.successfulRunLastTurn = true; c.MoveCard(agenda, corp.archives.cards);
assert(!fg.AIWouldPlay(), 'no useful target');
c.MoveCard(agenda, remote().root); corp.creditPool = 4;
assert(!fg.AIWouldPlay(), 'cannot afford a useful X');

// ---- Game Over: steal condition, icebreaker exemption, per-card prevention, bad publicity.
reset(); runner.creditPool = 4;
const over = put(card(26053), corp.HQ.cards);
same(over.subTypes, ['Gray Ops', 'Liability']);
assert.strictEqual(over.Enumerate().length, 0);
over.responseOnStolen.Resolve.call(over); assert.strictEqual(over.Enumerate().length, 0, 'Corp-turn steals do not count');
c.playerTurn = runner; over.responseOnStolen.Resolve.call(over); c.playerTurn = corp;
assert.strictEqual(over.Enumerate().length, 1);
const ice = put(breaker('Breaker', 4), runner.rig.programs);
const util = put(program('Utility', []), runner.rig.programs);
const rich = put(resource('Rich resource', 5), runner.rig.resources);
const cheap = put(resource('Cheap resource', 1), runner.rig.resources);
withAI(runner, null, () => withAI(corp, null, () => {
  over.Resolve(); decisions.shift().choose({cardType: 'program'});
  const d = decisions.shift(); assert.strictEqual(d.player, runner); d.choose(d.choices[1]);
}));
assert(runner.heap.includes(util) && runner.rig.programs.includes(ice), 'icebreakers are exempt');
assert.strictEqual(corp.badPublicity, 1);
// Runner AI saves the valuable card, lets the cheap one go, and cannot pay twice.
withAI(corp, null, () => {
  over.Resolve(); decisions.shift().choose({cardType: 'resource'});
});
let d = decisions[0]; assert(/Rich/.test(d.choices[0].label), 'valuable cards are offered first');
assert.strictEqual((await chooseAI(runner)).id, 1);
assert.strictEqual(decisions.length, 0, 'the Runner cannot afford a second prevention');
assert(runner.rig.resources.includes(rich) && runner.heap.includes(cheap));
assert.strictEqual(runner.creditPool, 1); assert.strictEqual(corp.badPublicity, 2);
// Corp AI picks the type with the largest unsaved loss and plays only when worthwhile.
reset(); runner.creditPool = 0;
const go = put(card(26053), corp.HQ.cards); go.stoleAgendaLastTurn = true;
put(resource('R1', 3), runner.rig.resources); put(resource('R2', 3), runner.rig.resources);
put(breaker('Big breaker', 8), runner.rig.programs);
assert.strictEqual(go._aiBestType().cardType, 'resource', 'icebreaker value is ignored');
assert.strictEqual(await ai.CommandChoice(['play', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToPlay, go);
ai.preferred = null; c.MoveCard(go, corp.resolvingCards); go.Resolve();
assert.strictEqual((await chooseAI(corp)).cardType, 'resource');
assert.strictEqual(runner.rig.resources.length, 0);
c.MoveCard(go, corp.HQ.cards); put(resource('R3', 2), runner.rig.resources);
assert(!go.AIWouldPlay(), 'too little to destroy for the bad publicity');
go.stoleAgendaLastTurn = false; put(resource('R4', 6), runner.rig.resources);
assert(!go.AIWouldPlay(), 'needs a steal last turn');

// ---- Increased Drop Rates: R&D reveal, Runner choice and AI placement.
reset(); corp.badPublicity = 1;
const drop = put(card(26054), corp.RnD.cards); drop.faceUp = false;
c.accessingCard = drop;
c.AutomaticTriggers('automaticOnAccess', [drop]);
assert(drop.faceUp && drop.knownToRunner, 'revealed while accessed in R&D');
assert.strictEqual(drop.responseOnAccess.Enumerate.call(drop).length, 1);
drop.responseOnAccess.Resolve.call(drop);
assert.strictEqual((await chooseAI(runner)).id, 0, 'untagged Runner lets the bad publicity go');
assert.strictEqual(corp.badPublicity, 0); assert.strictEqual(runner.tags, 0);
drop.automaticOnAccessComplete.Resolve.call(drop, drop); assert(!drop.faceUp);
corp.badPublicity = 1; runner.tags = 1;
drop.responseOnAccess.Resolve.call(drop);
assert.strictEqual((await chooseAI(runner)).id, 1, 'tagged Runner takes another tag');
assert.strictEqual(runner.tags, 2); assert.strictEqual(corp.badPublicity, 1);
runner.tags = 0; corp.badPublicity = 0;
withAI(runner, null, () => {drop.responseOnAccess.Resolve.call(drop); decisions.shift().choose({id: 0});});
assert.strictEqual(corp.badPublicity, 0, 'no bad publicity to remove');
c.accessingCard = null; assert.strictEqual(drop.responseOnAccess.Enumerate.call(drop).length, 0);
// Corp AI holds it without bad publicity, otherwise installs it with an agenda.
c.MoveCard(drop, corp.HQ.cards);
assert.strictEqual(ai._upgradeInstallPreferences(undefined, [drop]).length, 0);
corp.badPublicity = 1;
const agendaServer = remote(); put(card(26055), agendaServer.root);
const prefs = ai._upgradeInstallPreferences(undefined, [drop]);
assert.strictEqual(prefs.length, 1); assert.strictEqual(prefs[0].serverToInstallTo, agendaServer);
c.MoveCard(drop, agendaServer.root);
assert.strictEqual(drop.AIPunishesAccess(agendaServer), 1);
corp.badPublicity = 0; assert.strictEqual(drop.AIPunishesAccess(agendaServer), 0);

// ---- Divested Trust: forfeit on another steal, regain the stolen agenda.
reset();
const trust = put(card(26055), corp.scoreArea);
const stolenServer = remote(); const stolen = put(card(26056), stolenServer.root);
put(program('Fodder', []), runner.rig.programs);
c.attackedServer = stolenServer; c.accessingCard = stolen; c.playerTurn = runner;
watched.add('responseOnStolen');
c.Steal();
let ev = takeResponse('responseOnStolen');
assert(runner.scoreArea.includes(stolen));
assert.strictEqual(offered(ev, trust).length, 1);
trust.responseOnStolen.Resolve.call(trust);
assert.strictEqual((await chooseAI(corp)).id, 1, 'Corp AI forfeits to regain points');
ev.after();
assert(corp.HQ.cards.includes(stolen) && !runner.scoreArea.includes(stolen));
assert(!corp.scoreArea.includes(trust)); assert.strictEqual(corp.creditPool, 15);
assert.strictEqual(c.intended.steal, null);
// Human may decline; it never triggers for itself or while not scored.
reset();
const trust2 = put(card(26055), corp.scoreArea); const other = put(card(26056), remote().root);
c.accessingCard = other; c.attackedServer = corp.remoteServers[0]; c.Steal();
ev = takeResponse('responseOnStolen');
withAI(corp, null, () => {trust2.responseOnStolen.Resolve.call(trust2); decisions.shift().choose({id: 0});});
assert(corp.scoreArea.includes(trust2) && runner.scoreArea.includes(other)); ev.after();
c.MoveCard(trust2, corp.HQ.cards); c.intended.steal = other;
assert.strictEqual(offered({name: 'responseOnStolen', params: []}, trust2).length, 0, 'unscored');
c.MoveCard(trust2, runner.scoreArea); c.intended.steal = trust2;
assert.strictEqual(offered({name: 'responseOnStolen', params: []}, trust2).length, 0, 'itself');
c.intended.steal = null; watched.delete('responseOnStolen');

// ---- SDS Drone Deployment: program-trash steal cost and on-score trash.
reset(); c.playerTurn = runner;
const drone = put(card(26056), remote().root); c.attackedServer = corp.remoteServers[0];
c.accessingCard = drone;
const access = c.phases.runAccessingCard;
assert.strictEqual(access.Enumerate.steal().length, 0, 'cannot steal without an installed program');
assert.strictEqual(access.Enumerate.n().length, 1);
same(c.StealCost(drone), {credits: 0, clicks: 0, programs: 1});
const keep = put(breaker('Key breaker', 3), runner.rig.programs);
const spare = put(program('Spare', []), runner.rig.programs);
assert.strictEqual(access.Enumerate.steal().length, 1);
assert.strictEqual(access.Enumerate.n().length, 1, 'the Runner may decline to pay the cost');
access.Resolve.steal();
d = decisions[0]; assert.strictEqual(d.player, runner); assert.strictEqual(d.choices.length, 2);
assert.strictEqual((await chooseAI(runner)).card, spare, 'Runner AI keeps its icebreaker');
assert(runner.heap.includes(spare) && runner.rig.programs.includes(keep));
assert(runner.scoreArea.includes(drone), 'stolen after paying');
// Priority tiers must hold even when hosted counters overwhelm the old offsets.
const cheapBreaker = breaker('Cheap breaker', 1);
const valuableUtility = program('Counter-heavy utility', []);
valuableUtility.virus = 30;
const disposable = breaker('Disposable breaker', 5);
disposable.credits = 150; disposable.AIOkToTrash = function () {return true;};
const cheaperDisposable = program('Cheaper disposable', []);
cheaperDisposable.virus = 120; cheaperDisposable.AIOkToTrash = function () {return true;};
const stealPick = cards => runner.AI._stealCostProgramOption(cards.map(card => ({card}))).card;
for (const cards of [[cheapBreaker, valuableUtility], [valuableUtility, cheapBreaker]])
  assert.strictEqual(stealPick(cards), valuableUtility, 'non-Icebreaker tier precedes counter cost');
for (const cards of [[cheapBreaker, valuableUtility, disposable], [disposable, valuableUtility, cheapBreaker]])
  assert.strictEqual(stealPick(cards), disposable, 'AIOkToTrash tier precedes counter cost and subtype');
assert.strictEqual(stealPick([disposable, cheaperDisposable]), cheaperDisposable, 'cost breaks ties inside a tier');
assert.strictEqual(stealPick([valuableUtility, program('Cheap utility', [])]).title, 'Cheap utility');
// Scoring trashes the most threatening program through the Corp trash selector.
reset();
const scoreMe = put(card(26056), remote().root); scoreMe.advancement = 5;
const small = put(program('Small', []), runner.rig.programs);
const big = put(breaker('Big', 5), runner.rig.programs);
watched.add('responseOnScored');
c.Score(scoreMe);
ev = takeResponse('responseOnScored');
assert.strictEqual(offered(ev, scoreMe).length, 1);
scoreMe.responseOnScored.Resolve.call(scoreMe);
d = decisions[0]; assert.strictEqual(d.command, 'trash'); assert.strictEqual(d.choices.length, 2);
c.executingCommand = 'trash';
assert.strictEqual((await chooseAI(corp)).card, big);
c.executingCommand = ''; ev.after();
assert(runner.heap.includes(big) && runner.rig.programs.includes(small));
c.intended.score = scoreMe; runner.rig.programs.length = 0;
assert.strictEqual(offered(ev, scoreMe).length, 0, 'no program to trash');
c.intended.score = {}; put(program('P', []), runner.rig.programs);
assert.strictEqual(offered(ev, scoreMe).length, 0, 'only its own score');
watched.delete('responseOnScored');
console.log('Downfall batch 11: mechanics, resource guards, cleanup and real AI consumers passed.');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
