'use strict';
// Uprising batch 15 (26124–26127): Colossus, Winchester, Argus Crackdown and
// Cayambe Grid through the real engine helpers, Corp/Runner selectors and the
// run calculator.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const plain = v => v && typeof v === 'object' && (Array.isArray(v) || Object.getPrototypeOf(Object.getPrototypeOf(v) || {}) == null);
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && plain(value) ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jq = new Proxy(function () {}, {get: (t, k) => k === 'extend' ? extend : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: jq, jQuery: jq, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
c.particleSystems = {breaksubroutine: {spawnRect: {}}}; c.cardRenderer = {ParticleEffect() {}};
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  maxHandSize: 5, coreDamage: 0, grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = corp; c.activePlayer = corp; c.viewingPlayer = corp;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0, visible: true}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
// Deep enough copy for per-instance subroutine state (the game deep-copies definitions).
const card = id => {
  const def = c.cardSet[id];
  const copy = Object.assign({}, def);
  if (def.subroutines) copy.subroutines = def.subroutines.map(sr => Object.assign({}, sr));
  if (def._hqSubroutine) copy._hqSubroutine = Object.assign({}, def._hqSubroutine);
  return copy;
};
let decisions = [];
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command) => {
  const decision = {player, choices, title, command, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
c.TriggeredResponsePhase = (player, name, params, after) => { if (after) after(); };
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const wall = (title = 'Wall') => ({title, player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost: 2, strength: 4,
  subroutines: [{text: 'End the run.', Resolve() {c.EndTheRun();}}],
  AIImplementIce(rc, result) {result.sr = [[['endTheRun']]]; return result;}});
// Marjanah (strength 1 Fracter): breaks a strength-1 wall for 2 credits.
const breaker = () => Object.assign({}, c.cardSet[30016], {faceUp: true});
const weakWall = title => Object.assign(wall(title), {strength: 1});
const runnerCard = (title, cardType) => ({title, player: runner, cardType, subTypes: [], faceUp: true});
const gripCard = title => ({title, player: runner, cardType: 'event', subTypes: [], faceUp: true});
const reset = () => {
  decisions = []; ai.preferred = null; runner.AI.preferred = null; c.executingCommand = ''; c.attackedServer = null; c.approachIce = -1;
  c.encountering = false; c.movement = false; c.accessingCard = null; c.forcedEncounters = []; c.runSuccessDeclared = false;
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice,
    corp.archives.ice, corp.scoreArea, corp.resolvingCards, corp.installingCards,
    runner.scoreArea, runner.grip, runner.heap, runner.rig.programs, runner.rig.hardware, runner.rig.resources]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3; corp.HQ.root.length = 0;
  runner.creditPool = 5; runner.clickTracker = 4; runner.coreDamage = 0; runner.tags = 0; runner.temporaryCredits = 0;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
  c.turnEventCounts = {};
  runner.AI.cachedBestPath = null;
  c.InvalidateActiveTriggerCandidateCache();
};
const select = decision => {
  c.currentPhase = {title: decision.title, identifier: 'Decision', player: decision.player};
  const index = decision.player.AI.Choice(decision.choices, 'select');
  assert(index >= 0 && index < decision.choices.length, 'AI picks a legal option');
  const option = decision.choices[index]; decision.choose(option); return option;
};
// Count end-the-run effects without entering run cleanup.
const endRuns = fn => {const real = c.EndTheRun; let n = 0; c.EndTheRun = () => {n++;}; try {fn();} finally {c.EndTheRun = real;} return n;};
let cases = 0;
const test = (name, fn) => {
  try { reset(); fn(); cases++; if (process.env.VERBOSE) console.log('ok - ' + name); }
  catch (error) { console.error('FAIL - ' + name); throw error; }
};
// Win both trace bids at zero: base strength beats link 0.
const passTrace = () => {
  let d = decisions.shift(); assert.strictEqual(d.player, corp); d.choose(d.choices[0]);
  d = decisions.shift(); assert.strictEqual(d.player, runner); d.choose(d.choices[0]);
};

test('Colossus: advanceable, strength per counter, tag subroutine thresholds', () => {
  const col = put(card(26124), corp.HQ.ice); col.rezzed = true;
  assert.strictEqual(col.canBeAdvanced, true);
  assert.strictEqual(c.Strength(col), 4);
  c.PlaceAdvancement(col, 2);
  assert.strictEqual(c.Strength(col), 6, '+1 strength per hosted advancement counter');
  col.subroutines[0].Resolve.call(col);
  assert.strictEqual(runner.tags, 1, 'one tag below three counters');
  c.PlaceAdvancement(col, 1);
  col.subroutines[0].Resolve.call(col);
  assert.strictEqual(runner.tags, 3, 'two tags at three counters');
  assert.strictEqual(ai._advancementLimit(col), 3, 'rezzed Colossus advances to its threshold');
  col.rezzed = false;
  assert.strictEqual(ai._advancementLimit(col), 0, 'unrezzed Colossus stays secret');
});

test('Colossus: trash program, then program and resource at three counters', () => {
  const col = put(card(26124), corp.HQ.ice); col.rezzed = true;
  const prog = put(runnerCard('Prog', 'program'), runner.rig.programs);
  const prog2 = put(runnerCard('Prog 2', 'program'), runner.rig.programs);
  const res = put(runnerCard('Res', 'resource'), runner.rig.resources);
  col.subroutines[1].Resolve.call(col);
  let d = decisions.shift();
  assert(d.choices.every(o => o.card.cardType === 'program'), 'only programs offered');
  const first = select(d).card;
  assert(runner.heap.includes(first));
  assert.strictEqual(decisions.length, 0, 'no resource trash below three counters');
  assert(runner.rig.resources.includes(res));
  c.PlaceAdvancement(col, 3);
  col.subroutines[1].Resolve.call(col);
  select(decisions.shift());
  d = decisions.shift();
  assert(d && d.choices.every(o => o.card.cardType === 'resource'), 'then a resource');
  select(d);
  assert(runner.heap.includes(prog) && runner.heap.includes(prog2) && runner.heap.includes(res));
  // No program left: the resource is still trashed.
  const res2 = put(runnerCard('Res 2', 'resource'), runner.rig.resources);
  col.subroutines[1].Resolve.call(col);
  select(decisions.shift());
  assert(runner.heap.includes(res2));
  col.subroutines[1].Resolve.call(col);
  assert.strictEqual(decisions.length, 0, 'nothing to trash, no decision');
});

test('Colossus: run calculator sees tags, trash and advanced strength', () => {
  const col = put(card(26124), corp.HQ.ice); col.rezzed = true;
  let iceAI = runner.AI.rc.IceAI(col, 10);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(iceAI.sr)), [[['tag']], [[]]]);
  put(runnerCard('Res', 'resource'), runner.rig.resources);
  c.PlaceAdvancement(col, 3);
  iceAI = runner.AI.rc.IceAI(col, 10);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(iceAI.sr)), [[['tag', 'tag']], [['misc_moderate']]]);
  put(runnerCard('Prog', 'program'), runner.rig.programs);
  iceAI = runner.AI.rc.IceAI(col, 10);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(iceAI.sr[1])), [['misc_serious']]);
  assert.strictEqual(iceAI.strength, 7);
});

test('Winchester: gains the HQ subroutine only while protecting HQ', () => {
  const win = put(card(26125), corp.HQ.ice); win.rezzed = true;
  const printed = c.cardSet[26125].subroutines;
  c.AutomaticTriggers('automaticOnAnyChange', []);
  assert.strictEqual(win.subroutines.length, 3);
  assert.strictEqual(win.subroutines[2], win._hqSubroutine, 'gained after its other subroutines');
  assert.strictEqual(c.cardSet[26125].subroutines, printed); assert.strictEqual(printed.length, 2, 'definition untouched');
  c.AutomaticTriggers('automaticOnAnyChange', []);
  assert.strictEqual(win.subroutines.length, 3, 'idempotent');
  const server = remote();
  corp.HQ.ice.length = 0; put(win, server.ice);
  c.AutomaticTriggers('automaticOnAnyChange', []);
  assert.strictEqual(win.subroutines.length, 2, 'lost when not protecting HQ');
  // Encounter resync covers a move since the last command.
  server.ice.length = 0; put(win, corp.HQ.ice);
  c.AutomaticTriggers('automaticOnEncounter', [win]);
  assert.strictEqual(win.subroutines.length, 3);
  // Unrezzed ice keeps the sync (inactive abilities do not matter until encountered).
  const other = put(card(26125), corp.HQ.ice);
  c.AutomaticTriggers('automaticOnAnyChange', []);
  assert.strictEqual(other.subroutines.length, 3);
  assert.notStrictEqual(other._hqSubroutine, win._hqSubroutine);
});

test('Winchester: traces trash program/hardware and end the run on HQ', () => {
  const win = put(card(26125), corp.HQ.ice); win.rezzed = true;
  c.AutomaticTriggers('automaticOnAnyChange', []);
  const prog = put(runnerCard('Prog', 'program'), runner.rig.programs);
  const hw = put(runnerCard('Rig', 'hardware'), runner.rig.hardware);
  win.subroutines[0].Resolve.call(win); passTrace();
  let d = decisions.shift();
  assert(d.choices.every(o => o.card.cardType === 'program'));
  assert.strictEqual(select(d).card, prog); assert(runner.heap.includes(prog));
  win.subroutines[1].Resolve.call(win); passTrace();
  d = decisions.shift(); assert.strictEqual(select(d).card, hw); assert(runner.heap.includes(hw));
  win.subroutines[1].Resolve.call(win); passTrace();
  assert.strictEqual(decisions.length, 0, 'successful trace with no target needs no choice');
  // Runner beats the trace with link: no effect.
  const prog2 = put(runnerCard('Prog 2', 'program'), runner.rig.programs);
  runner.identityCard.link = 5;
  win.subroutines[0].Resolve.call(win); passTrace();
  assert.strictEqual(decisions.length, 0); assert(runner.rig.programs.includes(prog2));
  runner.identityCard.link = 0;
  assert.strictEqual(endRuns(() => {win.subroutines[2].Resolve.call(win); passTrace();}), 1, 'successful Trace[3] ends the run');
  runner.identityCard.link = 5;
  assert.strictEqual(endRuns(() => {win.subroutines[2].Resolve.call(win); passTrace();}), 0, 'beaten trace does not');
  runner.identityCard.link = 0;
});

test('Winchester: run calculator gains end the run only on HQ', () => {
  const win = put(card(26125), corp.HQ.ice); win.rezzed = true;
  put(runnerCard('Prog', 'program'), runner.rig.programs);
  let sr = JSON.parse(JSON.stringify(runner.AI.rc.IceAI(win, 10).sr));
  assert.deepStrictEqual(sr, [[['misc_serious']], [[]], [['endTheRun']]]);
  const server = remote(); corp.HQ.ice.length = 0; put(win, server.ice);
  put(runnerCard('Rig', 'hardware'), runner.rig.hardware);
  sr = JSON.parse(JSON.stringify(runner.AI.rc.IceAI(win, 10).sr));
  assert.deepStrictEqual(sr, [[['misc_serious']], [['misc_moderate']]]);
});

test('Argus Crackdown: real Corp play route, Lockdown limit, iced-server damage', () => {
  const argus = put(card(26126), corp.HQ.cards);
  let commands = c.EnumeratePhase();
  assert(!(commands[ai.Choice(commands, 'command')] === 'play' && ai.preferred && ai.preferred.cardToPlay === argus),
    'no ice: nothing to protect, not played');
  ai.preferred = null;
  const server = remote(); const iced = put(wall(), server.ice); iced.rezzed = true;
  commands = c.EnumeratePhase();
  assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
  assert.strictEqual(ai.preferred.cardToPlay, argus); ai.preferred = null;
  c.Play(argus);
  assert.strictEqual(c.ActiveLockdown(), argus);
  c.CleanupCorpResolvingCards(); assert(corp.resolvingCards.includes(argus), 'not trashed until the next Corp turn');
  const next = put(card(26103), corp.HQ.cards);
  assert(!c.FullCheckPlay(next), 'one active Lockdown at a time');
  assert(!argus.AIWouldPlay(), 'AI does not try to play a second Lockdown');
  c.attackedServer = corp.RnD; c.runSuccessDeclared = true;
  assert.strictEqual(argus.responseOnRunSuccessful.Enumerate.call(argus).length, 0, 'unprotected server: no damage');
  c.attackedServer = server;
  assert.strictEqual(argus.responseOnRunSuccessful.Enumerate.call(argus).length, 1);
  for (let i = 0; i < 3; i++) put(gripCard('Grip ' + i), runner.grip);
  argus.responseOnRunSuccessful.Resolve.call(argus);
  assert.strictEqual(runner.grip.length, 1, '2 meat damage');
  c.CleanupCorpResolvingCards(true);
  assert.strictEqual(c.ActiveLockdown(), null); assert(corp.archives.cards.includes(argus));
});

test('Argus Crackdown: Runner run planning prices the successful-run damage', () => {
  const server = remote(); const iced = put(weakWall(), server.ice); iced.rezzed = true; iced.knownToRunner = true;
  put(breaker(), runner.rig.programs);
  put(gripCard('Grip 1'), runner.grip);
  const rc = runner.AI.rc;
  const best = target => runner.AI._calculateBestCompleteRun(target, 0, 0, 0, 0);
  const meat = path => rc.TotalEffect(path[path.length - 1]).meatDamage || 0;
  assert(best(server), 'breakable server is runnable');
  const argus = put(card(26126), corp.resolvingCards);
  assert.strictEqual(best(server), null, '2 meat damage with 1 card in grip is lethal');
  put(gripCard('Grip 2'), runner.grip); put(gripCard('Grip 3'), runner.grip);
  let path = best(server);
  assert(path && meat(path) === 2, 'survivable damage is carried by the planned path');
  path = best(corp.archives);
  assert(path && meat(path) === 0, 'unprotected server carries no damage');
  c.MoveCard(argus, corp.archives.cards);
  path = best(server);
  assert(path && meat(path) === 0, 'expired Lockdown has no effect');
});

test('Cayambe Grid: turn-begin counter placement through the real response window', () => {
  const server = remote();
  const inner = put(wall('Inner'), server.ice); inner.rezzed = true; // ice[0] is innermost
  const outer = put(wall('Outer'), server.ice); outer.rezzed = true;
  c.PlaceAdvancement(outer, 1);
  const grid = put(card(26127), server.root); grid.rezzed = true;
  corp.AI = null;
  assert.strictEqual(grid.responseOnCorpTurnBegins.Enumerate.call(grid).length, 2, 'human may choose any ice protecting the server');
  corp.AI = ai;
  c.TriggeredResponsePhase = realTriggeredResponsePhase;
  try {
    c.TriggeredResponsePhase(corp, 'responseOnCorpTurnBegins', [], () => {}, 'Corp turn begins');
    const window = c.currentPhase;
    const trigger = window.Enumerate.trigger().find(o => o.card === grid);
    assert(trigger, 'rezzed Grid reaches the turn-begin response window');
    window.Resolve.trigger(trigger);
    assert(select(decisions.shift()).card === inner, 'AI prefers unadvanced ice, which raises the tax');
  } finally {
    c.TriggeredResponsePhase = (player, name, params, after) => { if (after) after(); };
  }
  assert.strictEqual(inner.advancement, 1, 'mandatory placement resolved');
  c.currentPhase = c.phases.corpActionMain;
  assert(grid.responseOnCorpTurnBegins.Enumerate.call(grid)[0].card === outer, 'all advanced: outermost');
  const colossus = put(card(26124), server.ice); colossus.rezzed = true; c.PlaceAdvancement(colossus, 1);
  assert(grid.responseOnCorpTurnBegins.Enumerate.call(grid)[0].card === colossus, 'then ice that gains from counters');
  grid.responseOnCorpTurnBegins.Resolve.call(grid, {card: corp.HQ.cards[0] || null});
  assert.strictEqual(colossus.advancement, 1, 'a card outside the server is ignored');
  const empty = remote(); const lonely = put(card(26127), empty.root); lonely.rezzed = true;
  assert.strictEqual(lonely.responseOnCorpTurnBegins.Enumerate.call(lonely).length, 0, 'no ice, no placement');
});

test('Cayambe Grid: approach tax, payment, decline and unaffordable', () => {
  const server = remote();
  const a = put(wall('A'), server.ice); const b = put(wall('B'), server.ice); put(wall('C'), server.ice);
  const grid = put(card(26127), server.root); grid.rezzed = true;
  c.attackedServer = corp.HQ;
  assert.strictEqual(grid.responseOnApproachServer.Enumerate.call(grid).length, 0, 'other servers unaffected');
  c.attackedServer = server; c.approachIce = -1;
  grid.responseOnApproachServer.Resolve.call(grid);
  assert.strictEqual(decisions.length, 0, 'no advanced ice: a cost of 0, the run continues');
  c.PlaceAdvancement(a, 1); c.PlaceAdvancement(b, 2);
  const savedAI = runner.AI; runner.AI = null;
  try {
    runner.creditPool = 5;
    grid.responseOnApproachServer.Resolve.call(grid);
    let d = decisions.shift();
    assert.strictEqual(d.choices.map(o => o.id).join(), '0,1');
    assert.strictEqual(d.choices[0].label, 'Pay 4[c]', '2 per advanced ice, not per counter');
    assert.strictEqual(endRuns(() => d.choose(d.choices[0])), 0);
    assert.strictEqual(runner.creditPool, 1, 'paid 4');
    grid.responseOnApproachServer.Resolve.call(grid);
    d = decisions.shift();
    assert.strictEqual(d.choices.map(o => o.id).join(), '1', 'cannot afford: only end the run');
    runner.creditPool = 6;
    grid.responseOnApproachServer.Resolve.call(grid);
    d = decisions.shift();
    assert.strictEqual(endRuns(() => d.choose(d.choices[1])), 1, 'declining ends the run');
    assert.strictEqual(runner.creditPool, 6, 'declining pays nothing');
  } finally {
    runner.AI = savedAI;
  }
});

test('Cayambe Grid: Runner planner and approach decision price the tax', () => {
  const server = remote();
  const a = put(weakWall('A'), server.ice); a.rezzed = true; a.knownToRunner = true;
  const grid = put(card(26127), server.root); grid.rezzed = true;
  put(breaker(), runner.rig.programs);
  const rc = runner.AI.rc;
  // Cheapest complete-run spend (the planner also budgets the Grid trash cost).
  const spend = credits => Math.min(...rc.Calculate(server, 4, credits, 0, 5, 5, false).map(p => p[p.length - 1].runner_credits_spent));
  const base = spend(20);
  assert(Number.isFinite(base), 'no advanced ice: runnable');
  c.PlaceAdvancement(a, 1);
  assert.strictEqual(spend(20), base + 2, '2 credits per advanced ice is added to the path cost');
  assert.strictEqual(rc.Calculate(server, 4, base + 1, 0, 5, 5, false).length, 0, 'unaffordable tax: no complete run');
  grid.rezzed = false;
  assert(rc.Calculate(server, 4, base + 1, 0, 5, 5, false).length, 'unrezzed Grid is not charged');
  grid.rezzed = true;
  // Real approach decision: pay when the rest of the run is completable, otherwise end.
  c.attackedServer = server; c.approachIce = -1; c.playerTurn = runner; runner.creditPool = base + 2;
  grid.responseOnApproachServer.Resolve.call(grid);
  let d = decisions.shift();
  assert.strictEqual(runner.AI.preferred.option.id, 0, 'AI pays an affordable tax');
  runner.AI.preferred = null;
  // A lethal successful run (Argus Crackdown, 1 card in grip): ending the run beats paying.
  put(card(26126), corp.resolvingCards); put(gripCard('Last card'), runner.grip);
  runner.creditPool = base + 2;
  grid.responseOnApproachServer.Resolve.call(grid);
  d = decisions.shift();
  assert.strictEqual(runner.AI.preferred.option.id, 1, 'AI does not pay into a run it cannot survive');
});

test('Cayambe Grid: Corp security, install value and rez consumers', () => {
  const server = remote();
  const a = put(wall('A'), server.ice); a.rezzed = true;
  const grid = put(card(26127), server.root);
  assert.strictEqual(grid.AIApproachDefense(server), null, 'no advanced ice: no approach defence');
  c.PlaceAdvancement(a, 2);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(grid.AIApproachDefense(server))), {runnerOptions: [{credits: 2, clicks: 0}], corpEndsRunUses: 0});
  assert.strictEqual(grid.AIDefensiveValue(remote()), 0); assert.strictEqual(grid.AIDefensiveValue(server), 3);
  assert.strictEqual(grid.AIDefensiveValue(null), 0);
  // Real rez selection during the Runner's turn.
  c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runnerDiscardResponse;
  const commands = c.EnumeratePhase();
  assert.strictEqual(commands[ai.Choice(commands, 'command')], 'rez');
  assert.strictEqual(ai.preferred.cardToRez, grid); ai.preferred = null;
  c.playerTurn = corp;
  assert(!grid.AIRezWhenCan(), 'not proactively rezzed during the Corp turn');
  assert(grid.AIWouldTrigger(), 'last-moment rez at approach when the tax is non-zero');
  // Real Corp security evaluation: the tax adds 2 per advanced ice to the honest break cost.
  put(breaker(), runner.rig.programs); a.strength = 1; grid.rezzed = true;
  const cost = () => { ai._securityCache = null; return ai._evaluateServerSecurity(server).honestMandatoryBreakCost; };
  const taxed = cost();
  a.advancement = 0;
  assert.strictEqual(taxed - cost(), 2, 'one advanced ice (2 counters): a 2-credit tax');
});

if (process.env.VERBOSE) console.log('uprising-batch15: ' + cases + ' cases');
console.log('uprising-batch15: ' + cases + ' passed');
