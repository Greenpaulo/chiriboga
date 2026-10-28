// Run with: node tests/uprising-batch5.test.js
// Uprising batch 5 (26083–26087): Harmony AR Therapy, Aniccam, Simulchip, Cordyceps
// and Euler, exercised through the real engine and Runner AI.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;

// ---- headless engine: real engine files, browser globals stubbed ----
const stub = new Proxy(function() {}, {
  get: (target, key) => key === Symbol.toPrimitive ? () => 0 : key === 'length' ? 0 : stub,
  apply: () => stub, construct: () => stub,
});
const extend = (deep, target, ...sources) => {
  if (typeof deep !== 'boolean') { sources.unshift(target); target = deep; deep = false; }
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && value && typeof value === 'object' ?
      extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jQuery = () => stub;
jQuery.extend = extend;
const context = {
  console: {log() {}, warn() {}, error: verbose ? console.error : () => {}},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  cardSet: [], setIdentifiers: [], accessibilityMode: 'text',
  $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
  localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
  location: {search: '', href: '', hostname: 'localhost'},
  PlaySound() {}, PlayCreditGainSound() {}, suppressCreditDrawSound: false, particleSystems: stub,
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/downfall.js', 'sets/uprising.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027, IceWall: 31077,
  Enigma: 31081, Funhouse: 30054, Cleaver: 30006, Unity: 30026, Mayfly: 30032, Leech: 30008, Imp: 31007, Tranquilizer: 30017, Echelon: 30025,
  Harmony: 26083, Aniccam: 26084, Simulchip: 26085, Cordyceps: 26086, Euler: 26087,
};

// Player state as Init() prepares it, then a board.
function setUpBoard({identity = ID.Tao, rnd = [ID.HedgeFund], hq = [ID.HedgeFund, ID.HedgeFund], hqIce = [], rndIce = [],
  stack = [], grip = [], installed = [], credits = 5, corpCredits = 5, ai = false} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = []; accessedCards = {root: [], cards: []};
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    Object.assign(corp, {identityCard: null, creditPool: ${corpCredits}, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: 4, clicksSpentThisTurn: 0, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${ID.HB}, [], ${JSON.stringify(rnd)}, ${JSON.stringify(hq)},
      [], ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, [], [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${identity}, [], ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.concat(corp.RnD.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
  `);
}

// Resolve pending triggers, decisions and accesses until the Runner's action
// phase; `pick(choices, card)` chooses within a decision.
function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 80; guard++) {
    const phase = run('currentPhase');
    if (phase === run('phases.runnerActionMain')) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    if (options('steal').length > 0) { phase.Resolve.steal({}); continue; }
    const cmd = ['continue', 'install'].find(c => options(c).length > 0);
    if (cmd) { phase.Resolve[cmd](pick(options(cmd), phase.context)); continue; }
    const n = options('n');
    if (n.length > 0) { phase.Resolve.n(n[0]); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}) +
    (verbose ? ' ' + JSON.stringify(Object.keys(phase.Enumerate || {}).map(k => [k, String(phase.Enumerate[k]().map(c => c.label))])) : ''));
}
// The Runner's "when your discard phase ends" window (Runner 2.3).
function discardPhaseEnds(pick) {
  run('TriggeredResponsePhase(runner, phases.runnerEndOfTurn.triggerCallbackName, [], function () {}, "Discard ends");');
  settle(pick);
}
const enumerateTrigger = (card, hook, args = '') => run(`(function () { var c = ${card};
  return c.${hook}.Enumerate.call(c${args ? ', ' + args : ''}); })()`);
const play = title => run(`phases.runnerActionMain.Resolve.play({card: runner.grip.find(function (c) { return c.title == ${JSON.stringify(title)}; })});`);
const install = title => run(`Install(runner.grip.find(function (c) { return c.title == ${JSON.stringify(title)}; }), null, false, null, true);`);
const byTitle = (cards, title) => Array.from(cards).find(card => card.title === title);
const titles = cards => Array.from(cards, card => card.title);
async function aiCommand() {
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  const preferred = run('runner.AI.preferred') || {};
  const card = preferred.cardToPlay || preferred.cardToInstall;
  return optionList[idx] + ':' + (card ? card.title : '');
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }
const toHeap = ids => ids.forEach(id => run(`InstanceCardsPush(${id}, runner.heap, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0].faceUp = true;`));
const card = (zone, title) => `${zone}.find(function (c) { return c.title == ${JSON.stringify(title)}; })`;
const trigger = (expr, alt) => run(`(function () { var c = ${expr}; TriggerAbility(c, c.abilities.find(function (a) { return a.alt == ${JSON.stringify(alt)}; })); })()`);
const newTurn = () => run('turnEventCounts = {};');

// ---------------- Harmony AR Therapy ----------------
test('Harmony AR Therapy shuffles up to 5 differently named heap cards in and removes itself', () => {
  setUpBoard({grip: [ID.Harmony], credits: 4});
  toHeap([ID.Cleaver, ID.Cleaver, ID.Unity, ID.SureGamble]);
  play('Harmony AR Therapy');
  let step = 0;
  settle(choices => {
    if (!('card' in choices[0])) return choices[0]; // the play decision
    step++;
    const labels = Array.from(choices, c => c.card ? c.card.title : 'Done');
    if (step === 1) { assert.deepStrictEqual(labels, ['Cleaver', 'Cleaver', 'Unity', 'Sure Gamble', 'Done']); return choices[0]; }
    if (step === 2) { assert.deepStrictEqual(labels, ['Unity', 'Sure Gamble', 'Done'], 'a chosen name is not offered again'); return choices[0]; }
    return choices.find(c => !c.card);
  });
  assert.deepStrictEqual(titles(run('runner.stack')).sort(), ['Cleaver', 'Unity']);
  assert.deepStrictEqual(titles(run('runner.heap')).sort(), ['Cleaver', 'Sure Gamble']);
  assert(byTitle(run('removedFromGame'), 'Harmony AR Therapy'), 'removed from the game, not trashed');
  assert.strictEqual(run('runner.creditPool'), 2);
});

test('Harmony AR Therapy can be played with an empty heap', () => {
  setUpBoard({grip: [ID.Harmony], stack: [ID.Diesel], credits: 2});
  play('Harmony AR Therapy'); settle();
  assert(byTitle(run('removedFromGame'), 'Harmony AR Therapy'));
  assert.strictEqual(run('runner.stack.length'), 1);
});

test('Runner AI plays Harmony AR Therapy to recover a needed breaker, choosing at most 5 names', async () => {
  // Rich (no economy priority) and at hand size on the last two clicks: worth-keeping cards are used.
  const board = {grip: [ID.Harmony, ID.Leech, ID.Imp, ID.Tranquilizer, ID.Mayfly], stack: [ID.Diesel, ID.Diesel], credits: 13,
    hqIce: [ID.Funhouse], rndIce: [ID.Funhouse], installed: [ID.Echelon, ID.Unity], ai: true};
  setUpBoard(board); run('runner.clickTracker = 2;');
  toHeap([ID.Cleaver]);
  assert.strictEqual(await aiCommand(), 'play:Harmony AR Therapy', 'recovers the missing fracter');
  setUpBoard(Object.assign({}, board, {installed: [ID.Echelon, ID.Unity, ID.Cleaver]})); run('runner.clickTracker = 2;');
  toHeap([ID.Cleaver]);
  assert.notStrictEqual(await aiCommand(), 'play:Harmony AR Therapy', 'nothing needed and a full stack');
  setUpBoard({grip: [ID.Harmony], credits: 5, ai: true});
  toHeap([ID.SureGamble, ID.SureGamble, ID.Diesel, ID.Leech, ID.Imp, ID.Mayfly, ID.Cleaver]);
  const chosen = titles(run('runner.grip[0].AIHeapCards()'));
  assert.strictEqual(chosen.length, 5);
  assert.strictEqual(new Set(chosen).size, 5, 'different names');
  assert(chosen.includes('Cleaver'), 'the needed fracter is recovered');
  setUpBoard({grip: [ID.Harmony], stack: [ID.Diesel, ID.Diesel, ID.Diesel, ID.Diesel, ID.Diesel], credits: 5, ai: true});
  toHeap([ID.SureGamble]);
  assert.strictEqual(run('runner.grip[0].AIWouldPlay()'), false, 'nothing worth recovering');
});

// ---------------- Aniccam ----------------
test('Aniccam draws the first time each turn an event is trashed, including played events', () => {
  setUpBoard({installed: [ID.Aniccam], grip: [ID.SureGamble, ID.SureGamble], stack: [ID.Diesel, ID.Diesel, ID.Diesel, ID.Diesel], credits: 10});
  assert.strictEqual(run('MemoryUnits()'), 5, '+1 MU');
  play('Sure Gamble'); settle();
  assert(byTitle(run('runner.heap'), 'Sure Gamble'), 'played event trashed');
  assert.strictEqual(run('runner.grip.length'), 2, 'drew 1');
  play('Sure Gamble'); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'second event this turn does not draw');
  newTurn();
  run(`Trash(${card('runner.grip', 'Diesel')}, true)`); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'trashed from the grip: Diesel gone, 1 drawn');
  run(`Discard(runner.grip[0]);`);
  newTurn();
  run(`Trash(runner.stack[0], true)`); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'an event trashed from the stack draws');
});

test('Aniccam ignores discards, non-events, removed-from-game events and earlier event trashes', () => {
  setUpBoard({installed: [ID.Aniccam], grip: [ID.Diesel, ID.Harmony, ID.Cleaver], stack: [ID.Diesel, ID.Diesel], credits: 5});
  run('Discard(runner.grip[0]);'); settle();
  run(`Trash(${card('runner.grip', 'Cleaver')}, true)`); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'no draw for a discard or a program');
  play('Harmony AR Therapy'); settle();
  assert.strictEqual(run('runner.grip.length'), 0, 'Harmony removes itself instead of being trashed');
  setUpBoard({grip: [ID.Diesel, ID.Aniccam, ID.SureGamble], stack: [ID.Diesel], credits: 10});
  run(`Trash(${card('runner.grip', 'Diesel')}, true)`); settle();
  install('Aniccam'); settle();
  play('Sure Gamble'); settle();
  assert.strictEqual(run('runner.grip.length'), 0, 'an event was already trashed this turn before Aniccam');
});

test('Runner AI installs Aniccam as its console', async () => {
  setUpBoard({grip: [ID.Aniccam, ID.Leech, ID.Imp, ID.Tranquilizer, ID.Mayfly], stack: [ID.Diesel, ID.Diesel], credits: 13,
    hqIce: [ID.Funhouse], rndIce: [ID.Funhouse], installed: [ID.Echelon, ID.Unity, ID.Cleaver], ai: true});
  run('runner.clickTracker = 2;');
  assert.strictEqual(await aiCommand(), 'install:Aniccam');
});

// ---------------- Simulchip ----------------
test('Simulchip trashes a program as its cost and installs a heap program 3 cheaper', () => {
  setUpBoard({installed: [ID.Simulchip, ID.Mayfly], credits: 0});
  toHeap([ID.Unity]);
  trigger(card('runner.rig.hardware', 'Simulchip'), 'simulchip_install');
  let step = 0;
  settle(choices => {
    if (!choices[0].card) return choices[0]; // the ability trigger
    step++;
    if (step === 1) { assert.deepStrictEqual(Array.from(choices, c => c.card.title), ['Mayfly']); return choices[0]; }
    assert.deepStrictEqual(Array.from(choices, c => c.card.title).sort(), ['Mayfly', 'Unity'], 'the trashed program may be chosen');
    return choices.find(c => c.card.title === 'Unity');
  });
  assert.deepStrictEqual(titles(run('runner.rig.programs')), ['Unity']);
  assert.deepStrictEqual(titles(run('runner.heap')).sort(), ['Mayfly', 'Simulchip']);
  assert.strictEqual(run('runner.creditPool'), 0, 'Unity cost 3 - 3');
  assert.strictEqual(run(`${card('runner.heap', 'Simulchip')}._discountCard`), null, 'discount cleared');
  assert.strictEqual(run('InstallCost(runner.heap.find(function (c) { return c.title == "Mayfly"; }))'), 1, 'no lingering discount');
});

test('Simulchip waives the program cost after an installed program was trashed this turn', () => {
  setUpBoard({installed: [ID.Simulchip, ID.Cleaver], credits: 0});
  const chip = card('runner.rig.hardware', 'Simulchip');
  run(`Trash(${card('runner.rig.programs', 'Cleaver')}, true)`); settle();
  assert(run(`ChoicesAbility(${chip}).length`) > 0, 'usable with no installed program');
  trigger(chip, 'simulchip_install'); settle();
  assert.deepStrictEqual(titles(run('runner.rig.programs')), ['Cleaver'], 'reinstalled for 0');
  assert.strictEqual(run('runner.creditPool'), 0);
});

test('Simulchip cannot be used without a program to trash, and resolves with an empty heap', () => {
  setUpBoard({installed: [ID.Simulchip], credits: 5});
  assert.strictEqual(run(`ChoicesAbility(${card('runner.rig.hardware', 'Simulchip')}).length`), 0);
  setUpBoard({installed: [ID.Simulchip, ID.Cordyceps], credits: 0});
  run(`${card('runner.rig.programs', 'Cordyceps')}.installCost = 4;`); // 4 - 3 = 1: unaffordable
  trigger(card('runner.rig.hardware', 'Simulchip'), 'simulchip_install'); settle();
  assert.strictEqual(run('runner.rig.programs.length'), 0, 'nothing affordable to install');
  assert.strictEqual(run('runner.rig.hardware.length'), 0);
  run(`${card('runner.heap', 'Cordyceps')}.installCost = 3;`);
});

test('Runner AI uses Simulchip in a paid window only when the cost is waived and a breaker is needed', async () => {
  setUpBoard({installed: [ID.Simulchip, ID.Cleaver], credits: 0, hqIce: [ID.IceWall], ai: true});
  const chip = card('runner.rig.hardware', 'Simulchip');
  assert.strictEqual(run(`${chip}.AITriggerInPaidWindow()`), null, 'cost not waived');
  run(`Trash(${card('runner.rig.programs', 'Cleaver')}, true)`); settle();
  toHeap([ID.Mayfly]);
  assert.strictEqual(run(`${chip}.AITriggerInPaidWindow()`), 'simulchip_install');
  run('currentPhase = phases.runnerPostAction; activePlayer = runner;');
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  assert.strictEqual(optionList[idx], 'trigger');
  assert.strictEqual(run('runner.AI.preferred.cardToTrigger.title'), 'Simulchip');
  run('currentPhase = phases.runnerActionMain;');
  trigger(chip, 'simulchip_install'); settle();
  assert.deepStrictEqual(titles(run('runner.rig.programs')), ['Cleaver'], 'the needed fracter, not the higher-listed Mayfly');
});

// ---------------- Cordyceps ----------------
const successfulRun = (server, pick) => {
  run(`attackedServer = ${server}; TriggeredResponsePhase(runner, "responseOnRunSuccessful", [], function () {}, "Run Successful");`);
  settle(pick); run('attackedServer = null;');
};
test('Cordyceps gets 2 counters and swaps ice on a central once per turn', () => {
  setUpBoard({grip: [ID.Cordyceps], hqIce: [ID.Enigma], rndIce: [ID.IceWall], credits: 5});
  install('Cordyceps'); settle();
  const cordyceps = card('runner.rig.programs', 'Cordyceps');
  assert.strictEqual(run(`Counters(${cordyceps}, "virus")`), 2);
  let step = 0;
  successfulRun('corp.HQ', choices => {
    step++;
    if (step === 1) { assert.deepStrictEqual(Array.from(choices, c => c.use), [true, false], 'optional'); return choices[0]; }
    return choices[0]; // the HQ ice, then the only other ice
  });
  assert.deepStrictEqual(titles(run('corp.HQ.ice')), ['Ice Wall']);
  assert.deepStrictEqual(titles(run('corp.RnD.ice')), ['Enigma']);
  assert.strictEqual(run(`Counters(${cordyceps}, "virus")`), 1);
  successfulRun('corp.RnD', () => { throw new Error('once per turn'); });
  run(`${cordyceps}.responseOnRunnerTurnBegins.Resolve.call(${cordyceps})`);
  assert.strictEqual(run(`${cordyceps}.CanSwapAt(corp.RnD)`), true, 'reset next turn');
  run('var remote = NewServer("Remote 0", false); corp.remoteServers.push(remote);');
  assert.strictEqual(run(`${cordyceps}.CanSwapAt(remote)`), false, 'central servers only');
});

test('Cordyceps swaps ice within one server and keeps a remote that loses its ice', () => {
  setUpBoard({installed: [ID.Cordyceps], hqIce: [ID.Enigma, ID.IceWall], credits: 5});
  const cordyceps = card('runner.rig.programs', 'Cordyceps');
  run(`AddCounters(${cordyceps}, "virus", 1);`);
  run(`${cordyceps}.SwapIce(corp.HQ.ice[0], corp.HQ.ice[1]);`);
  assert.deepStrictEqual(titles(run('corp.HQ.ice')), ['Ice Wall', 'Enigma']);
  run('var remote = NewServer("Remote 0", false); corp.remoteServers.push(remote); MoveCard(corp.HQ.ice[0], remote.ice);');
  run(`${cordyceps}.SwapIce(corp.HQ.ice[0], remote.ice[0]);`);
  assert.deepStrictEqual(titles(run('remote.ice')), ['Enigma']);
  assert.strictEqual(run('corp.remoteServers.length'), 1);
});

test('Runner AI with Cordyceps moves strong central ice out for weaker ice, otherwise declines', () => {
  setUpBoard({installed: [ID.Cordyceps], hqIce: [ID.Funhouse], rndIce: [ID.IceWall], credits: 5, ai: true});
  const cordyceps = card('runner.rig.programs', 'Cordyceps');
  run(`AddCounters(${cordyceps}, "virus", 2);`);
  successfulRun('corp.HQ');
  assert.deepStrictEqual(titles(run('corp.HQ.ice')), ['Ice Wall'], 'Funhouse moved off HQ');
  setUpBoard({installed: [ID.Cordyceps], hqIce: [ID.IceWall], rndIce: [ID.Funhouse], credits: 5, ai: true});
  run(`AddCounters(${card('runner.rig.programs', 'Cordyceps')}, "virus", 2);`);
  successfulRun('corp.HQ');
  assert.deepStrictEqual(titles(run('corp.HQ.ice')), ['Ice Wall'], 'no swap that strengthens HQ');
  assert.strictEqual(run(`Counters(${card('runner.rig.programs', 'Cordyceps')}, "virus")`), 2);
  assert.strictEqual(run(`${card('runner.rig.programs', 'Cordyceps')}.AIWastefulToInstall()`), false);
  setUpBoard({hqIce: [ID.IceWall], grip: [ID.Cordyceps], ai: true});
  assert.strictEqual(run('runner.grip[0].AIWastefulToInstall()'), true, 'one installed ice: nothing to swap');
});

// ---------------- Euler ----------------
const encounter = server => run(`attackedServer = ${server}; approachIce = 0; encountering = true; encounteredIce = ${server}.ice[0];`);
const endEncounter = () => run('attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;');
test('Euler breaks for free only on the turn it was installed, otherwise 2 for up to 2', () => {
  setUpBoard({grip: [ID.Euler], hqIce: [ID.Enigma], credits: 4});
  install('Euler'); settle();
  const euler = card('runner.rig.programs', 'Euler');
  assert.strictEqual(run('runner.creditPool'), 2);
  encounter('corp.HQ');
  assert.deepStrictEqual(Array.from(run(`ChoicesAbility(${euler})`), a => a.alt), ['euler_free', 'euler_break2']);
  run(`(function () { var e = ${euler}; e.abilities[0].Resolve.call(e, {subroutine: corp.HQ.ice[0].subroutines[0]}); })()`);
  assert.strictEqual(run('corp.HQ.ice[0].subroutines[0].broken'), true);
  assert.strictEqual(run('runner.creditPool'), 2, 'free');
  run('UnbreakAll(corp.HQ.ice[0]);');
  run(`${euler}.responseOnCorpTurnBegins.Resolve.call(${euler})`);
  assert.deepStrictEqual(Array.from(run(`ChoicesAbility(${euler})`), a => a.alt), ['euler_break2']);
  run(`(function () { var e = ${euler}; e.abilities[1].Resolve.call(e, {subroutine: corp.HQ.ice[0].subroutines[0]}); })()`);
  const phase = run('currentPhase');
  const second = phase.Enumerate.continue().find(c => c.subroutine);
  phase.Resolve.continue(second);
  assert.strictEqual(run('corp.HQ.ice[0].subroutines.every(function (s) { return s.broken; })'), true, 'both broken');
  assert.strictEqual(run('runner.creditPool'), 0);
  assert.strictEqual(run(`ChoicesAbility(${euler}).length`), 0, 'cannot afford, nothing to break');
  endEncounter();
});

test('Euler pumps 1 for +1 strength against stronger code gates and resets after the encounter', () => {
  setUpBoard({installed: [ID.Euler], hqIce: [ID.Funhouse], credits: 5});
  const euler = card('runner.rig.programs', 'Euler');
  encounter('corp.HQ');
  assert.deepStrictEqual(Array.from(run(`ChoicesAbility(${euler})`), a => a.label), ['1[c]: +1 strength.']);
  run(`(function () { var e = ${euler}; e.abilities[2].Resolve.call(e, {}); e.abilities[2].Resolve.call(e, {}); })()`);
  assert.strictEqual(run(`Strength(${euler})`), 4);
  assert.strictEqual(run('runner.creditPool'), 3);
  run(`${euler}.responseOnEncounterEnds.Resolve.call(${euler})`);
  assert.strictEqual(run(`Strength(${euler})`), 2);
  endEncounter();
});

test('Run calculator prices Euler at 0 on its install turn and 2 afterwards', () => {
  setUpBoard({installed: [ID.Euler], hqIce: [ID.Enigma], credits: 5, ai: true});
  const euler = card('runner.rig.programs', 'Euler');
  const cheapest = () => {
    const paths = run('runner.AI.rc.Calculate(corp.HQ, 1, 5, 0, Infinity, Infinity, false, null)');
    assert(paths.length > 0, 'a path exists');
    return Math.min(...Array.from(paths, p => p[p.length - 1].runner_credits_spent));
  };
  assert.strictEqual(cheapest(), 2);
  run(`${euler}.installedThisTurn = true;`);
  assert.strictEqual(cheapest(), 0);
});

(async () => {
for (const {name, fn} of tests) {
  try { await fn(); cases++; if (verbose) console.log('ok   ' + name); }
  catch (error) { failures.push(name + ': ' + (verbose ? error.stack : error.message)); }
}
if (failures.length) {
  console.error(failures.length + ' failure(s):\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('uprising batch 5: ' + cases + ' cases passed');
})();
