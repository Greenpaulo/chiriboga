// Run with: node tests/uprising-batch7.test.js
// Uprising batch 7 (26093–26095): Buffer Drive, Daily Casts and DreamNet,
// exercised through the real engine and Runner AI.
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
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/uprising.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027,
  IceWall: 31077, Cleaver: 30006, Carmen: 30015, T400: 30031,
  BufferDrive: 26093, DailyCasts: 26094, DreamNet: 26095,
};

// Player state as Init() prepares it, then a board.
function setUpBoard({hqIce = [], rndIce = [], archivesIce = [], stack = [], grip = [], heap = [], installed = [], credits = 5, ai = false} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {};
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${ID.HB}, [], [${ID.HedgeFund}, ${ID.HedgeFund}], [${ID.HedgeFund}],
      ${JSON.stringify(archivesIce)}, ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, [], [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, ${JSON.stringify(heap)}, ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
  `);
}

// Resolve every pending trigger in the current global-trigger phases and
// decisions; `pick(choices, card)` chooses within a card's decision.
function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 80; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.runnerPostAction, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    const choices = options('continue');
    if (choices.length > 0) { phase.Resolve.continue(pick(choices, phase.context)); continue; }
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
}
const byTitle = (cards, title) => cards.find(card => card.title === title);
const titles = cards => Array.from(cards, card => card.title);
// Compare values from the vm realm by structure.
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, message);
// Human choice for Buffer Drive: record the offered cards and pick by title (or pass).
function bufferPick(record, title) {
  return (choices, card) => {
    if (card && card.title === 'Buffer Drive') {
      record.push(choices.map(choice => choice.card ? choice.card.title : 'pass'));
      return choices.find(choice => title ? choice.card && choice.card.title === title : !choice.card);
    }
    return choices[0];
  };
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Buffer Drive ----------------
test('Buffer Drive bottoms 1 card trashed from the grip, only for the first such trash each turn', () => {
  setUpBoard({installed: [ID.BufferDrive], grip: [ID.SureGamble, ID.Cleaver], stack: [ID.Diesel, ID.T400]});
  const offered = [];
  run('Trash(runner.grip.slice(), false)');
  settle(bufferPick(offered, 'Cleaver'));
  same(offered, [['Sure Gamble', 'Cleaver', 'pass']], 'offers each trashed grip card and a pass');
  assert.strictEqual(run('runner.stack[0].title'), 'Cleaver', 'added to the bottom of the stack');
  same(titles(run('runner.heap')), ['Sure Gamble']);
  run('Trash(runner.stack[runner.stack.length - 1], false)');
  settle(bufferPick(offered, 'Diesel'));
  assert.strictEqual(offered.length, 1, 'second grip/stack trash this turn does not trigger');
});

test('Buffer Drive triggers on stack trashes and net damage, may pass, and ignores other trashes', () => {
  setUpBoard({installed: [ID.BufferDrive, ID.DailyCasts], grip: [ID.SureGamble], stack: [ID.Diesel, ID.T400]});
  const offered = [];
  run('Trash(runner.rig.resources[0], false)'); settle(bufferPick(offered, null));
  run('Discard(runner.grip[0])'); settle(bufferPick(offered, null));
  assert.strictEqual(offered.length, 0, 'installed trash and discarding (CR 1.19.3) do not trigger');
  run('Trash(runner.stack.slice(-2), false)'); settle(bufferPick(offered, null));
  same(offered, [['Diesel', 'T400 Memory Diamond', 'pass']], 'stack trash triggers');
  assert.strictEqual(run('runner.stack.length'), 0, 'passing leaves both in the heap');
  // net damage on a new turn
  run('turnEventCounts = {}; runner.grip = []; runner.stack = [];');
  run(`MoveCard(runner.heap.find(function (c) { return c.title == "Diesel"; }), runner.grip);`);
  run('Damage("net", 1, false)'); settle(bufferPick(offered, 'Diesel'));
  same(offered[1], ['Diesel', 'pass'], 'net damage trashes from the grip');
  assert.strictEqual(run('runner.stack[0].title'), 'Diesel');
});

test('Buffer Drive does not trigger when an earlier grip/stack trash this turn preceded its install', () => {
  setUpBoard({grip: [ID.SureGamble, ID.BufferDrive], stack: [ID.Diesel, ID.T400], credits: 5});
  run('Trash(runner.grip[0], false)'); settle();
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert(byTitle(run('runner.rig.hardware'), 'Buffer Drive'));
  const offered = [];
  run('Trash(runner.stack[runner.stack.length - 1], false)'); settle(bufferPick(offered, 'T400 Memory Diamond'));
  assert.strictEqual(offered.length, 0, 'not the first grip/stack trash this turn');
});

test('Buffer Drive removes itself to add a heap card to the top of the stack', () => {
  setUpBoard({installed: [ID.BufferDrive], heap: [ID.SureGamble, ID.Cleaver], stack: [ID.Diesel]});
  const card = run('runner.rig.hardware[0]');
  const choices = run('ChoicesAbility(runner.rig.hardware[0])')[0].choices;
  same(titles(choices.map(choice => choice.card)), ['Sure Gamble', 'Cleaver']);
  card.abilities[0].Resolve.call(card, choices[1]);
  assert.strictEqual(run('runner.stack[runner.stack.length - 1].title'), 'Cleaver', 'top of stack');
  assert.strictEqual(run('runner.rig.hardware.length'), 0);
  same(titles(run('removedFromGame')).filter(t => t === 'Buffer Drive'), ['Buffer Drive'], 'removed from the game, not trashed');
  setUpBoard({installed: [ID.BufferDrive]});
  assert.strictEqual(run('ChoicesAbility(runner.rig.hardware[0]).length'), 0, 'no heap card: no ability');
});

test('Runner AI bottoms the needed icebreaker from a trash', () => {
  setUpBoard({installed: [ID.BufferDrive], grip: [ID.SureGamble, ID.Cleaver], stack: [ID.Diesel], hqIce: [ID.IceWall], rndIce: [ID.IceWall], ai: true});
  const card = run('runner.rig.hardware[0]');
  run('Trash(runner.grip.slice(), false)');
  const event = {runnerGripOrStackOrdinal: 1, runnerGripOrStackCards: run('runner.heap.slice()')};
  const choices = card.responseOnTrash.Enumerate.call(card, [], null, [], event);
  same(titles(choices.map(choice => choice.card)), ['Cleaver'], 'needed fracter, no pass offered to the AI');
  settle();
  assert.strictEqual(run('runner.stack[0].title'), 'Cleaver', 'real trigger resolved with the AI choice');
});

// Free paid abilities are offered in paid ability windows (post-action), not the click-limited action phase.
test('Runner AI triggers Buffer Drive in a paid ability window for a needed breaker in the heap when it wants to draw', async () => {
  const choose = async heap => {
    setUpBoard({installed: [ID.BufferDrive], heap, stack: [ID.Diesel, ID.T400, ID.SureGamble],
      hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 8, ai: true});
    run('currentPhase = phases.runnerPostAction; EnumeratePhase();');
    const optionList = run('Object.keys(phaseOptions)');
    const idx = await run('runner.AI').CommandChoice(optionList);
    const card = run('runner.AI.preferred && runner.AI.preferred.cardToTrigger');
    return optionList[idx] + ':' + (card ? card.title : '');
  };
  assert.strictEqual(await choose([ID.SureGamble, ID.Cleaver]), 'trigger:Buffer Drive', 'recovers the needed fracter');
  const card = run('runner.rig.hardware[0]');
  const choices = run('ChoicesAbility(runner.rig.hardware[0])')[0].choices;
  same(titles(choices.map(choice => choice.card)), ['Cleaver'], 'AI target');
  assert.notStrictEqual(await choose([ID.SureGamble, ID.Diesel]), 'trigger:Buffer Drive', 'no needed breaker in the heap');
});

// ---------------- Daily Casts ----------------
test('Daily Casts loads 8, pays 2 each turn start, then is trashed when empty', () => {
  setUpBoard({grip: [ID.DailyCasts], credits: 3});
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  const casts = run('runner.rig.resources[0]');
  assert.strictEqual(casts.credits, 8, 'loaded 8');
  assert.strictEqual(run('runner.creditPool'), 0);
  for (let turn = 1; turn <= 4; turn++) {
    run('ChangePhase(phases.runnerTurnBegin)'); settle();
    assert.strictEqual(run('runner.creditPool'), 2 * turn, 'turn ' + turn + ': took 2');
  }
  assert.strictEqual(run('runner.rig.resources.length'), 0, 'trashed when empty');
  assert(byTitle(run('runner.heap'), 'Daily Casts'), 'in the heap');
});

test('Runner AI installs Daily Casts as priority economy', async () => {
  setUpBoard({grip: [ID.DailyCasts], stack: [ID.Diesel, ID.T400], hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 4, ai: true});
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  assert.strictEqual(optionList[idx] + ':' + run('runner.AI.preferred.cardToInstall.title'), 'install:Daily Casts');
});

// ---------------- DreamNet ----------------
test('DreamNet draws on the first successful run each turn only', () => {
  setUpBoard({installed: [ID.DreamNet], stack: [ID.Diesel, ID.T400, ID.SureGamble], credits: 0});
  run('MakeRun(corp.archives)'); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'drew 1');
  assert.strictEqual(run('runner.creditPool'), 0, 'no credit without 2 link or a digital identity');
  run('MakeRun(corp.archives)'); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'second successful run does not draw');
});

test('DreamNet gains 1 credit with a digital identity, and ignores runs before its install', () => {
  setUpBoard({installed: [ID.DreamNet], stack: [ID.Diesel, ID.T400], credits: 0});
  run('runner.identityCard.subTypes = ["Digital"]');
  run('MakeRun(corp.archives)'); settle();
  assert.strictEqual(run('runner.grip.length'), 1);
  assert.strictEqual(run('runner.creditPool'), 1, 'digital identity: +1');
  setUpBoard({grip: [ID.DreamNet], stack: [ID.Diesel, ID.T400], credits: 3});
  run('MakeRun(corp.archives)'); settle();
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  run('MakeRun(corp.archives)'); settle();
  assert.strictEqual(run('runner.grip.length'), 0, 'a successful run earlier this turn already used the first time');
});

test('DreamNet gains 1 credit with 2 link', () => {
  setUpBoard({installed: [ID.DreamNet], stack: [ID.Diesel], credits: 0});
  run('runner.identityCard.link = 2');
  run('MakeRun(corp.archives)'); settle();
  assert.strictEqual(run('runner.creditPool'), 1);
});

test('Runner AI installs DreamNet when it wants cards', async () => {
  setUpBoard({grip: [ID.DreamNet], stack: [ID.Diesel, ID.T400, ID.SureGamble], hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 8, ai: true});
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  const card = run('runner.AI.preferred && runner.AI.preferred.cardToInstall');
  assert.strictEqual(optionList[idx] + ':' + (card ? card.title : ''), 'install:DreamNet');
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
console.log('uprising batch 7: ' + cases + ' cases passed');
})();
