'use strict';
// Genesis: What Lies Ahead (2001–2020) through the real engine, selectors and run calculator.
// Harness mirrors tests/uprising-batch6.test.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: stub, jQuery: stub, PIXI: stub,
  window: {}, location: {search: ''}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && value && typeof value === 'object'
      ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
c.jQuery = {extend};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'decks.js', 'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/genesis.js'])
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
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0, visible: true}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
// Real InstanceCard (decks.js) so InitInstance runs, as in a game.
const card = id => c.InstanceCard(id);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
c.MoveCard = (item, destination, position) => {
  const from = item.cardLocation;
  if (from) {const i = from.indexOf(item); if (i >= 0) from.splice(i, 1);}
  if (position == null) destination.push(item); else destination.splice(position, 0, item);
  item.cardLocation = destination;
  c.InvalidateActiveTriggerCandidateCache();
};
let trashed = [];
c.Trash = (cards, canBePrevented, after, ctx) => {
  cards = Array.isArray(cards) ? cards : [cards];
  for (const item of cards) {trashed.push(item); c.MoveCard(item, item.player === corp ? corp.archives.cards : runner.heap);}
  if (after) after.call(ctx, cards);
};
let damage = [];
c.Damage = (type, num, canBePrevented) => {damage.push({type, num, canBePrevented});};
// Resolve enumerated triggers immediately (first option), then continue.
c.TriggeredResponsePhase = (player, name, params, after) => {
  for (const choice of c.ChoicesActiveTriggers(name)) {
    const handler = choice.card[name];
    const options = handler.Enumerate ? handler.Enumerate.apply(choice.card, params || []) : [{}];
    if (options.length) handler.Resolve.call(choice.card, options[0]);
  }
  if (after) after();
};
const sub = () => ({text: 'End the run.', Resolve() {}});
const ice = (title, subType, strength, subs, extra = {}) => Object.assign({title, player: corp, cardType: 'ice', subTypes: [subType],
  strength, rezCost: 3, rezzed: true, knownToRunner: true, subroutines: Array.from({length: subs}, sub),
  AIImplementIce(rc, result) {result.sr = this.subroutines.map(() => [['endTheRun']]); return result;}}, extra);
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const reset = () => {
  runner.rig.programs = []; runner.rig.hardware = []; runner.rig.resources = []; runner.grip = []; runner.stack = []; runner.heap = [];
  for (const s of [corp.HQ, corp.RnD, corp.archives]) {s.ice = []; s.cards = []; s.root = [];}
  corp.remoteServers = []; corp.scoreArea = []; corp.creditPool = 10; corp.clickTracker = 3;
  runner.identityCard = {player: runner, title: 'Runner', subTypes: [], link: 0};
  c.lingeringEffects.length = 0; decisions = []; trashed = []; damage = []; c.InvalidateActiveTriggerCandidateCache();
  c.attackedServer = null; c.approachIce = -1; c.encountering = false; c.accessingCard = null; c.intended = {};
  runner.creditPool = 10; runner.clickTracker = 4; runner.tags = 0; runner.AI.preferred = null; runner.AI.cachedBestPath = null;
  c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runnerActionMain;
};
// Cheapest complete-run spend through the real run calculator, or Infinity.
const runCost = (server, credits = 20, other = 0) => {
  const paths = runner.AI.rc.Calculate(server, 4, credits, other, 5, 5, false);
  return paths.length ? Math.min(...paths.map(p => p[p.length - 1].runner_credits_spent)) : Infinity;
};
let passed = 0;
const tests = [];
const test = (name, fn) => tests.push({name, fn});

// ---------------------------------------------------------------- runner cards
test('Whizzard: recurring credits pay trash costs only, and the planner sees them', () => {
  reset();
  const whiz = card(2001); whiz.renderer = renderer(); runner.identityCard = whiz;
  assert.strictEqual(whiz.elo, 2015);
  c.ApplyToAllActiveCards(cardIn => {if (cardIn.recurringCredits !== undefined) cardIn.credits = cardIn.recurringCredits;}, runner);
  assert.strictEqual(whiz.credits, 3, 'refilled with other recurring credits');
  const asset = {title: 'Asset', player: corp, cardType: 'asset', trashCost: 4, rezzed: true};
  assert.strictEqual(c.AvailableCredits(runner, 'paying trash costs', asset), runner.creditPool + 3);
  assert.strictEqual(c.AvailableCredits(runner, 'installing', asset), runner.creditPool, 'not for installs');
  assert.strictEqual(whiz.AIReducesTrashCost(asset), 3);
  const server = remote(); put(asset, server.root);
  const withWhiz = runCost(server);
  runner.identityCard = {player: runner, title: 'Runner', subTypes: [], link: 0};
  assert.strictEqual(runCost(server), withWhiz + 3, 'identity trash-cost reduction is priced by the run calculator');
});

test('Spinal Modem: +1 MU, credits for icebreakers, core damage on a successful trace during a run', () => {
  reset();
  const modem = put(card(2002), runner.rig.hardware); modem.credits = 2;
  assert.strictEqual(c.MemoryUnits(), 5);
  const breaker = put({title: 'B', player: runner, cardType: 'program', subTypes: ['Icebreaker']}, runner.rig.programs);
  assert.strictEqual(c.AvailableCredits(runner, 'using', breaker), runner.creditPool + 2);
  assert.strictEqual(c.AvailableCredits(runner, 'using', {cardType: 'program', subTypes: ['Virus']}), runner.creditPool);
  const trace = run => {
    c.attackedServer = run ? corp.HQ : null;
    let result = null;
    c.Trace(3, s => {result = s;});
    decisions.shift().choose({num: 0}); decisions.shift().choose({num: 0});
    return result;
  };
  assert.strictEqual(trace(true), true);
  assert.deepStrictEqual(damage.map(d => ({...d})), [{type: 'core', num: 1, canBePrevented: true}]);
  damage = [];
  assert.strictEqual(trace(false), true);
  assert.deepStrictEqual(damage.map(d => ({...d})), [], 'no damage outside a run');
  runner.identityCard.link = 5;
  assert.strictEqual(trace(true), false);
  assert.deepStrictEqual(damage.map(d => ({...d})), [], 'no damage on an unsuccessful trace');
});

test('Morning Star: breaks every barrier subroutine for 1 credit (planner and human)', () => {
  reset();
  const server = remote();
  const wall = put(ice('Wall', 'Barrier', 5, 3), server.ice);
  const ms = put(card(2004), runner.rig.programs);
  assert.strictEqual(runCost(server), 1, 'one payment breaks all three subroutines');
  wall.strength = 6;
  assert.strictEqual(runCost(server), Infinity, 'fixed strength 5');
  wall.strength = 5;
  c.attackedServer = server; c.approachIce = 0; c.encountering = true;
  c.currentPhase = c.phases.runEncounterIce;
  const choices = ms.abilities[0].Enumerate.call(ms);
  assert.strictEqual(choices.length, 3);
  ms.abilities[0].Resolve.call(ms, choices[0]);
  let d = decisions.shift(); d.choose(d.choices[0]);
  d = decisions.shift(); d.choose(d.choices[0]);
  assert(wall.subroutines.every(sr => sr.broken), 'all broken');
  assert.strictEqual(runner.creditPool, 9);
  const gate = ice('Gate', 'Code Gate', 1, 1); corp.HQ.ice.push(gate);
  c.attackedServer = corp.HQ; c.approachIce = 0;
  assert.strictEqual(ms.abilities[0].Enumerate.call(ms).length, 0, 'barriers only');
});

test('Cortez Chip: +2 rez cost on the chosen ice until the end of the turn; AI uses it on approach', async () => {
  reset();
  const server = remote();
  const target = put(ice('Unrezzed', 'Barrier', 3, 1, {rezzed: false, knownToRunner: false}), server.ice);
  const chip = put(card(2005), runner.rig.hardware);
  assert.strictEqual(c.RezCost(target), 3);
  corp.creditPool = 4;
  c.currentPhase = {identifier: 'Run 2.1', title: 'Approach Ice'};
  c.attackedServer = server; c.approachIce = 0;
  const ret = await runner.AI._internalChoiceDetermination(['trigger', 'n'], 'command');
  assert.strictEqual(ret, 0, 'AI triggers Cortez Chip while approaching unrezzed ice');
  assert.strictEqual(runner.AI.preferred.cardToTrigger, chip);
  assert.strictEqual(runner.AI.preferred.abilityAlt, 'cortez_tax');
  const choices = chip.abilities[0].Enumerate.call(chip);
  assert.ok(choices.length === 1 && choices[0].card === target, 'AI targets the approached ice');
  chip.abilities[0].Resolve.call(chip, choices[0]);
  assert(runner.heap.includes(chip), 'trashed as a cost');
  assert.strictEqual(c.RezCost(target), 5);
  assert.strictEqual(c.FullCheckRez(target, ['ice']), false, 'the Corp can no longer afford it');
  c.TriggeredResponsePhase(runner, 'responseOnRunnerTurnEnds', []);
  assert.strictEqual(c.RezCost(target), 3, 'expires at end of turn');
  // Rich Corp or rezzed ice: no trigger.
  reset();
  const s2 = remote();
  const rezzed = put(ice('Rezzed', 'Barrier', 3, 1), s2.ice);
  const chip2 = put(card(2005), runner.rig.hardware);
  assert.strictEqual(chip2.AITriggerOnIceApproach(rezzed), null);
  rezzed.rezzed = false; corp.creditPool = 20;
  assert.strictEqual(chip2.AITriggerOnIceApproach(rezzed), null);
});

test('Peacock and ZU.13 Key Master: code gate breakers; ZU.13 is free with 2 link', () => {
  reset();
  const server = remote();
  put(ice('Gate', 'Code Gate', 4, 2), server.ice);
  const peacock = put(card(2006), runner.rig.programs);
  assert.strictEqual(runCost(server), 6, '2 for +3 strength, 2 per subroutine');
  runner.rig.programs = []; c.InvalidateActiveTriggerCandidateCache();
  const zu = put(card(2007), runner.rig.programs);
  assert.strictEqual(runCost(server), 5, '3 to pump, 1 per subroutine');
  assert.strictEqual(zu.memoryCost, 1);
  assert.strictEqual(c.InstalledMemoryCost(), 1);
  runner.identityCard.link = 2;
  assert.strictEqual(zu.memoryCost, 0, 'with 2 link');
  assert.strictEqual(c.InstalledMemoryCost(), 0);
  const inGrip = card(2007);
  assert.strictEqual(inGrip.memoryCost, 0, 'even if not installed');
  assert.strictEqual(peacock.elo + zu.elo, 1146 + 1604);
});

test('The Helpful AI: +1 link, trash for +2 breaker strength this turn; planner routes through it', () => {
  reset();
  const server = remote();
  const wall = put(ice('Big Wall', 'Barrier', 7, 2), server.ice);
  const ms = put(card(2004), runner.rig.programs);
  assert.strictEqual(runCost(server), Infinity, 'Morning Star alone is too weak');
  const helpful = put(card(2008), runner.rig.resources);
  assert.strictEqual(c.Link(), 1);
  const paths = runner.AI.rc.Calculate(server, 4, 20, 0, 5, 5, false);
  assert(paths.length, 'route found with The Helpful AI');
  const last = paths[0][paths[0].length - 1];
  assert(last.card_str_mods.some(m => m.use === helpful && m.card === ms && m.amt === 2), 'planned on Morning Star');
  runner.AI.cachedBestPath = paths[0];
  const choices = helpful.abilities[0].Enumerate.call(helpful);
  assert.ok(choices.length === 1 && choices[0].card === ms);
  helpful.abilities[0].Resolve.call(helpful, choices[0]);
  assert(runner.heap.includes(helpful));
  assert.strictEqual(c.Strength(ms), 7);
  assert.strictEqual(c.Link(), 0);
  c.TriggeredResponsePhase(runner, 'responseOnRunnerTurnEnds', []);
  assert.strictEqual(c.Strength(ms), 5, 'until the end of the turn');
  assert.strictEqual(wall.strength, 7);
});

test('Plascrete Carapace: 4 power counters prevent meat damage, trashed when empty', () => {
  reset();
  const pc = put(card(2009), runner.rig.hardware);
  pc.automaticOnInstall.Resolve.call(pc, pc);
  assert.strictEqual(c.Counters(pc, 'power'), 4);
  assert.strictEqual(c.PublicMeatDamagePrevention(), 4, 'public prevention seen by Corp planning');
  c.intended = {damageType: 'net', damage: 2};
  assert.strictEqual(pc.responsePreventableDamage.Enumerate.call(pc).length, 0, 'meat only');
  c.intended = {damageType: 'meat', damage: 3};
  let options = pc.responsePreventableDamage.Enumerate.call(pc);
  assert.deepStrictEqual([...options.map(o => o.prevent)], [3], 'AI prevents as much as it can');
  pc.responsePreventableDamage.Resolve.call(pc, options[0]);
  assert.strictEqual(c.intended.damage, 0);
  assert.strictEqual(c.Counters(pc, 'power'), 1);
  const savedAI = runner.AI; runner.AI = null;
  c.intended = {damageType: 'meat', damage: 2};
  options = pc.responsePreventableDamage.Enumerate.call(pc);
  runner.AI = savedAI;
  assert.deepStrictEqual([...options.map(o => o.prevent)], [1, 0], 'human may decline');
  pc.responsePreventableDamage.Resolve.call(pc, options[0]);
  assert.strictEqual(c.intended.damage, 1);
  assert(runner.heap.includes(pc), 'trashed when empty');
});

(async () => {
  for (const {name, fn} of tests) {
    try {
      await fn();
      passed++;
      if (process.env.VERBOSE) console.log('ok - ' + name);
    } catch (error) {
      console.error('FAIL - ' + name);
      console.error(error && error.stack || error);
      process.exitCode = 1;
    }
  }
  console.log(`genesis-wla: ${passed}/${tests.length} passed`);
})();
