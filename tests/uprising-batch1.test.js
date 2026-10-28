'use strict';
// Uprising batch 1 (26066–26069): Hoshiko Shiro, Moshing, Devil Charm and Gachapon
// through the real engine helpers, Runner AI selectors and run calculator.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: stub, jQuery: stub, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0, maxHandSize: 5, coreDamage: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = runner; c.activePlayer = runner; c.viewingPlayer = runner;
c.currentPhase = c.phases.runnerActionMain;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
c.MoveCard = (item, destination, position) => {
  if (item.cardLocation) {const i = item.cardLocation.indexOf(item); if (i >= 0) item.cardLocation.splice(i, 1);}
  if (position == null) destination.push(item); else destination.splice(position, 0, item);
  item.cardLocation = destination; c.InvalidateActiveTriggerCandidateCache();
};
c.MoveCardByIndex = (index, from, to, position) => {c.MoveCard(from[index], to, position); return true;};
let responseQueue = [];
c.TriggeredResponsePhase = (player, name, params, after) => {responseQueue.push({name, params, after});};
function flush() {
  while (responseQueue.length) {
    const event = responseQueue.shift();
    for (const option of c.ChoicesActiveTriggers(event.name)) {
      const hook = option.card[event.name];
      if (hook.automatic) hook.Resolve.apply(option.card, event.params);
    }
    if (event.after) event.after();
  }
}
const fire = (name, params = []) => {responseQueue.push({name, params}); flush();};
let installs = [];
c.Install = (item, host, ignore, pos, rtp, onResolve, ctx, onCancel, onPay, allowCancel, onComplete) => {
  const cost = c.InstallCost(item, host);
  installs.push({card: item, cost});
  runner.creditPool -= cost;
  c.MoveCard(item, item.cardType === 'program' ? runner.rig.programs : item.cardType === 'hardware' ? runner.rig.hardware : runner.rig.resources);
  if (onComplete) onComplete.call(ctx);
};
const plain = (title, extra = {}) => Object.assign({title, player: runner, cardType: 'event', subTypes: [], playCost: 0}, extra);
const program = (title, installCost, extra = {}) => Object.assign({title, player: runner, cardType: 'program', subTypes: [],
  installCost, memoryCost: 1, elo: 1500}, extra);
const sub = () => ({text: 'End the run.', Resolve() {}});
const ice = (title, subType, strength, subs) => ({title, player: corp, cardType: 'ice', subTypes: [subType],
  strength, rezCost: 3, rezzed: true, subroutines: Array.from({length: subs}, sub),
  AIImplementIce(rc, result) {result.sr = this.subroutines.map(() => [['endTheRun']]); return result;}});
// A fracter: 1[c] break 1 barrier subroutine, 1[c] +1 strength (strength 2).
const fracter = () => program('Fracter', 2, {subTypes: ['Icebreaker', 'Fracter'], strength: 2, strengthBoost: 0,
  AIImplementBreaker(rc, result, point, server, cardStrength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    return result.concat(rc.ImplementIcebreaker(point, this, cardStrength, iceAI, iceStrength, ['Barrier'], 1, 1, 1, 1, creditsLeft));
  }});
const reset = () => {
  runner.rig.programs = []; runner.rig.hardware = []; runner.rig.resources = []; runner.grip = []; runner.stack = []; runner.heap = []; runner.resolvingCards = [];
  corp.HQ.ice = []; corp.HQ.cards = []; corp.HQ.root = []; corp.RnD.cards = []; corp.remoteServers = [];
  c.lingeringEffects.length = 0; c.removedFromGame.length = 0; decisions = []; responseQueue = []; installs = [];
  c.attackedServer = null; c.approachIce = -1; c.encountering = false; c.accessingCard = null;
  runner.creditPool = 10; runner.clickTracker = 4; if (runner.AI) {runner.AI.preferred = null; runner.AI.cachedBestPath = null;}
  runner.identityCard = {player: runner, title: 'Runner', subTypes: [], link: 0};
  c.playerTurn = runner; c.currentPhase = c.phases.runnerActionMain; c.InvalidateActiveTriggerCandidateCache();
};

async function main() {
// --- Hoshiko Shiro: access-driven flip, flip-side draw/lose, flip back without access ---
reset();
const hoshiko = card(26066);
hoshiko.renderer = renderer(); runner.identityCard = hoshiko; c.InvalidateActiveTriggerCandidateCache();
for (let i = 0; i < 5; i++) put(plain('Stack ' + i), runner.stack);
runner.creditPool = 3;
fire('responseOnRunnerTurnBegins');
assert.strictEqual(runner.grip.length, 0, 'front side draws nothing');
fire('responseOnRunnerDiscardEnds');
assert.strictEqual(hoshiko.flipped, false, 'no access: front side stays');
assert.strictEqual(runner.creditPool, 3);
c.playerTurn = corp;
c.AutomaticTriggers('automaticOnAccess', [{title: 'Corp-turn access', player: corp}]);
c.playerTurn = runner;
fire('responseOnRunnerTurnBegins');
fire('responseOnRunnerDiscardEnds');
assert.strictEqual(hoshiko.flipped, false, 'an access on the Corp turn does not count');
fire('responseOnRunnerTurnBegins');
c.AutomaticTriggers('automaticOnAccess', [{title: 'Agenda', player: corp}]);
fire('responseOnRunnerDiscardEnds');
assert.strictEqual(hoshiko.flipped, true, 'access flips the identity');
assert.strictEqual(runner.creditPool, 5, 'gain 2 when flipping');
fire('responseOnRunnerTurnBegins');
assert.strictEqual(runner.grip.length, 1, 'flip side draws 1');
assert.strictEqual(runner.creditPool, 4, 'flip side loses 1');
c.AutomaticTriggers('automaticOnAccess', [{title: 'Card', player: corp}]);
fire('responseOnRunnerDiscardEnds');
assert.strictEqual(hoshiko.flipped, true, 'flip side with an access stays flipped');
assert.strictEqual(runner.creditPool, 4, 'flip side gains nothing at turn end');
runner.creditPool = 0;
fire('responseOnRunnerTurnBegins');
assert.strictEqual(runner.creditPool, 0, 'cannot lose a credit it does not have');
assert.strictEqual(runner.grip.length, 2);
fire('responseOnRunnerDiscardEnds');
assert.strictEqual(hoshiko.flipped, false, 'no access on the flip side flips back');
assert.strictEqual(runner.creditPool, 0, 'flipping back gains nothing');

// --- Moshing: additional cost of exactly 3 other grip cards; gain 3, draw 3 ---
reset();
const moshing = put(card(26067), runner.grip);
put(plain('A'), runner.grip); put(plain('B'), runner.grip);
runner.AI = null;
assert.strictEqual(moshing.Enumerate.call(moshing).length, 0, 'needs 3 other grip cards');
const cCard = put(plain('C'), runner.grip);
let choices = moshing.Enumerate.call(moshing);
assert.strictEqual(choices.length, 4, '3 cards plus the confirm button');
assert(!choices.some(x => x.card === moshing), 'Moshing is not its own cost');
const confirm = choices[3];
assert.strictEqual(confirm.multiSelectDynamicButtonEnabler(2), false);
assert.strictEqual(confirm.multiSelectDynamicButtonEnabler(3), true);
for (let i = 0; i < 5; i++) put(plain('Draw ' + i), runner.stack);
runner.creditPool = 0;
c.MoveCard(moshing, runner.resolvingCards);
moshing.Resolve.call(moshing, {cards: runner.grip.slice(0, 3)});
flush();
assert.strictEqual(runner.heap.length, 3, 'three grip cards trashed');
assert(runner.heap.includes(cCard));
assert.strictEqual(runner.creditPool, 3, 'gain 3');
assert.strictEqual(runner.grip.length, 3, 'draw 3');
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};', c);
// AI: trashes only cards not worth keeping; the real economy selector plays it.
reset();
const moshingAI = put(card(26067), runner.grip);
const keeper = put(plain('Keeper', {AIWorthKeeping: () => true}), runner.grip);
const junk = ['J1', 'J2'].map(t => put(plain(t), runner.grip));
assert.strictEqual(moshingAI.AIWouldPlay(), false, 'would have to trash a card worth keeping');
assert.strictEqual(moshingAI.Enumerate.call(moshingAI).length, 0, 'no AI play option');
junk.push(put(plain('J3'), runner.grip));
const aiChoices = moshingAI.Enumerate.call(moshingAI);
assert.strictEqual(aiChoices.length, 1);
assert.deepStrictEqual([...aiChoices[0].cards].map(x => x.title).sort(), ['J1', 'J2', 'J3'], 'keeps the card worth keeping');
assert(!aiChoices[0].cards.includes(keeper));
runner.creditPool = 4;
c.executingCommand = '';
let ret = await runner.AI._computeChoice(['play', 'gain', 'draw'], 'command');
assert.strictEqual(ret, 0, 'AI plays an event');
assert.strictEqual(runner.AI.preferred.cardToPlay, moshingAI, 'Moshing is the economy play');
runner.AI.preferred = null;

// --- Devil Charm: optional encounter removal, -6 strength for the run, run calculator ---
reset();
const charm = put(card(26068), runner.rig.hardware);
const wall = put(ice('Wall', 'Barrier', 7, 2), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
const breaker = put(fracter(), runner.rig.programs);
runner.creditPool = 3;
let route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route, 'Devil Charm makes the strength 7 barrier breakable with 3 credits');
let last = route[route.length - 1];
assert(last.persistents.some(p => p.use === charm && p.target === wall && p.strengthMod === -6));
assert.strictEqual(last.runner_credits_spent, 2, 'break both subroutines at strength 2');
assert.strictEqual(charm.AIReducesIceStrength(wall), 6, 'Corp security sees the reduction');
// Live encounter: the AI accepts because the route uses it.
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true;
c.AutomaticTriggers('automaticOnEncounter', [wall]);
runner.AI.cachedBestPath = null;
choices = charm.responseOnEncounter.Enumerate.call(charm, wall);
assert.strictEqual(choices.length, 2);
assert.strictEqual(runner.AI.preferred.title, 'Devil Charm');
assert.strictEqual(runner.AI.preferred.option, choices[0], 'AI uses Devil Charm');
// Response window: command, then trigger selection, keep the preference for the decision.
c.currentPhase = {identifier: 'Encounter', title: 'Encounter', player: runner};
c.executingCommand = '';
assert.strictEqual(await runner.AI._computeChoice(['trigger'], 'command'), 0);
c.executingCommand = 'trigger';
assert.strictEqual(await runner.AI._computeChoice([{card: charm, choices}], 'select'), 0);
choices = charm.responseOnEncounter.Enumerate.call(charm, wall);
assert.strictEqual(runner.AI.preferred.option, choices[0], 'decision fixed for this encounter');
c.currentPhase = {identifier: 'Devil Charm', title: 'Devil Charm', player: runner};
ret = await runner.AI._computeChoice(choices, 'select');
assert.strictEqual(ret, 0, 'decision selector follows the preference');
charm.responseOnEncounter.Resolve.call(charm, choices[ret]);
assert(c.removedFromGame.includes(charm), 'removed from the game');
assert.strictEqual(c.Strength(wall), 1, '7 - 6');
assert.strictEqual(runner.AI.cachedBestPath, null, 'route recalculated from the live strength');
route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, 0);
assert(route && !route[route.length - 1].persistents.some(p => p.use === charm), 'replanned without Devil Charm');
c.encountering = false;
fire('responseOnRunEnds');
assert.strictEqual(c.Strength(wall), 7, 'reduction ends with the run');
assert.strictEqual(c.lingeringEffects.length, 0);
// Weak ice: not worth the hardware, so the AI declines.
reset();
const charm2 = put(card(26068), runner.rig.hardware);
const weak = put(ice('Weak', 'Barrier', 2, 1), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
put(fracter(), runner.rig.programs);
route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route && !route[route.length - 1].persistents.some(p => p.use === charm2), 'not used on weak ice');
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true;
c.AutomaticTriggers('automaticOnEncounter', [weak]);
choices = charm2.responseOnEncounter.Enumerate.call(charm2, weak);
assert.strictEqual(runner.AI.preferred.option, choices[1], 'AI declines');
charm2.responseOnEncounter.Resolve.call(charm2, choices[1]);
assert(c.CheckInstalled(charm2), 'declining keeps it installed');
assert.strictEqual(c.Strength(weak), 2);
const point = runner.AI.rc.EmptyPoint(0);
assert.strictEqual(charm2.AIEncounterAbility(runner.AI.rc, [], point, runner.AI.rc.IceAI(weak, 0)).length, 0,
  'not offered again after its window passed');
assert.strictEqual(charm2.responseOnEncounter.Enumerate.call(charm2, {title: 'Not ice', cardType: 'asset'}).length, 0);
c.encountering = false;
assert.strictEqual(charm2.AIInstallBeforeRun(corp.HQ), 0, 'no strong ice: no install');
weak.strength = 5;
assert.strictEqual(charm2.AIInstallBeforeRun(corp.HQ), 1, 'strong visible ice: install before running');

// --- Gachapon: trash, set aside 6, discounted install, shuffle 3, remove the rest ---
reset();
runner.AI = null;
let gacha = put(card(26069), runner.rig.hardware);
const bottom = put(plain('Bottom'), runner.stack);
const prog = program('Prog', 3);
const virt = {title: 'Virtual', player: runner, cardType: 'resource', subTypes: ['Virtual'], installCost: 4};
const res = {title: 'Plain Resource', player: runner, cardType: 'resource', subTypes: [], installCost: 0};
const hw = {title: 'HW', player: runner, cardType: 'hardware', subTypes: [], installCost: 0};
for (const x of [plain('E1'), plain('E2'), hw, res, virt, prog]) put(x, runner.stack); //prog is on top
runner.creditPool = 1;
assert.strictEqual(gacha.abilities[0].Enumerate.call(gacha).length, 1);
gacha.abilities[0].Resolve.call(gacha, {}); flush();
assert(runner.heap.includes(gacha), 'trashed as the cost');
assert.strictEqual(runner.stack.length, 1, 'top 6 set aside');
let d = decisions.pop();
assert.deepStrictEqual([...d.choices].map(x => x.card && x.card.title), ['Prog', null],
  'only affordable programs/virtual resources (Prog costs 1 after the discount), plus decline');
d.choose(d.choices[0]);
assert.strictEqual(installs[0].cost, 1, 'paid 2 less');
assert(runner.rig.programs.includes(prog));
d = decisions.pop();
assert.strictEqual(d.choices.length, 6, '5 remaining cards plus confirm');
const shuffled = [hw, res, virt];
d.choose({cards: shuffled});
assert.strictEqual(runner.stack.length, 4, 'three shuffled in');
assert(shuffled.every(x => runner.stack.includes(x)) && runner.stack.includes(bottom));
assert.strictEqual(c.removedFromGame.length, 2, 'the rest are removed from the game');
assert.strictEqual(c.InstallCost(prog), 3, 'discount ends');
// Small stack: everything left is shuffled back.
reset();
runner.AI = null;
gacha = put(card(26069), runner.rig.hardware);
put(plain('Only'), runner.stack);
gacha.abilities[0].Resolve.call(gacha, {}); flush();
assert.strictEqual(decisions.length, 0, 'nothing to install or choose');
assert.strictEqual(runner.stack.length, 1);
assert.strictEqual(c.removedFromGame.length, 0);
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};', c);
// AI: digs when a breaker type is missing, installs the missing breaker, keeps the best 3.
reset();
gacha = put(card(26069), runner.rig.hardware);
for (let i = 0; i < 3; i++) put(plain('Filler ' + i), runner.stack);
const killer = program('Killer', 3, {subTypes: ['Icebreaker', 'Killer'], elo: 1600});
const otherProg = program('Other', 1, {elo: 1900});
const decoder = program('Decoder', 9, {subTypes: ['Icebreaker', 'Decoder']});
for (const x of [plain('E1'), plain('E2'), decoder, otherProg, killer, plain('E3')]) put(x, runner.stack);
runner.creditPool = 1;
assert.strictEqual(gacha.AIWouldTrigger(), true, 'missing breakers and a deep stack');
assert(gacha.AIDrawTrigger > 0 && gacha.AIDrawInstall() > 0);
// Action-phase draw triggers are limited to click abilities; the free [trash] ability is used in the
// post-action paid-ability window (Runner 1.4).
c.currentPhase = {identifier: 'Runner 1.4', title: 'Runner post-action', player: runner};
ret = await runner.AI._computeChoice(['trigger', 'n'], 'command');
assert.strictEqual(ret, 0, 'AI triggers an ability');
assert.strictEqual(runner.AI.preferred.cardToTrigger, gacha, 'Gachapon is the dig');
runner.AI.preferred = null;
gacha.abilities[0].Resolve.call(gacha, {}); flush();
d = decisions.pop();
assert.strictEqual(d.choices[0].card, killer, 'missing Killer preferred over a higher-rated program');
d.choose(d.choices[0]);
assert.strictEqual(installs[0].cost, 1);
assert(runner.stack.includes(decoder), 'unaffordable missing Decoder is shuffled back');
assert(runner.stack.includes(otherProg));
assert.strictEqual(c.removedFromGame.length, 2);
runner.creditPool = 0;
assert.strictEqual(gacha.AIWouldTrigger(), false, 'no credits for an install');

if (process.env.VERBOSE) console.log('uprising-batch1: all checks passed');
}
main().catch(error => {console.error(error); process.exit(1);});
