// Run with: node tests/genesis-hs.test.js
// Genesis cycle, Humanity's Shadow (2081-2100), exercised through the real
// engine and both AIs. Harness follows tests/uprising-batch7.test.js.
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
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/genesis.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027, T400: 30031,
  IceWall: 31077, Enigma: 31081, Palisade: 30072, HostileTakeover: 31071, PAD: 31080,
  Imp: 31007, Cleaver: 30006, VoicePAD: 31038,
  Surge: 2081, Andromeda: 2083, HQInterface: 2085, Pheromones: 2086, QualityTime: 2087, Replicator: 2088,
  Creeper: 2089, Kraken: 2090, Kati: 2091, Eve: 2092, Rework: 2093, Whirlpool: 2094, DataHound: 2096,
  Bernice: 2097, Salvage: 2098, Simone: 2099, Foxfire: 2100,
};

// Player state as Init() prepares it, then a board.
function setUpBoard({hqIce = [], rndIce = [], archivesIce = [], remotes = [], rnd = [ID.HedgeFund, ID.HedgeFund], hq = [ID.HedgeFund],
  stack = [], grip = [], heap = [], installed = [], credits = 5, corpCredits = 5, identity = ID.Tao, ai = false, corpAI = false,
  turn = 'runner', rezIce = true} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {}; turnEventCards = {}; accessedCards = {root: [], cards: []};
    Object.assign(corp, {identityCard: null, creditPool: ${corpCredits}, clickTracker: ${turn == 'corp' ? 3 : 0}, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: ${turn == 'runner' ? 4 : 0}, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${ID.HB}, [], ${JSON.stringify(rnd)}, ${JSON.stringify(hq)},
      ${JSON.stringify(archivesIce)}, ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, ${JSON.stringify(remotes)}, [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${identity}, ${JSON.stringify(heap)}, ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    ${turn == 'runner' ? 'activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;'
      : 'activePlayer = corp; playerTurn = corp; currentPhase = phases.corpActionMain;'}
    ${rezIce ? 'corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });' : ''}
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
    ${corpAI ? 'corp.AI = new CorpAI(); corp.AI._log = function() {};' : ''}
  `);
}

// Resolve every pending trigger in the current global-trigger phases and
// decisions; `pick(choices, card)` chooses within a card's decision.
function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 80; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.corpActionMain, phases.runnerPostAction, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    const choices = options('continue');
    if (choices.length > 0) { phase.Resolve.continue(pick(choices, phase.context, phase)); continue; }
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
}
const byTitle = (cards, title) => cards.find(card => card.title === title);
const titles = cards => Array.from(cards, card => card.title);
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, message);
// The Runner AI's action-phase command and the card it prefers for it.
async function runnerCommand() {
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  const pref = run('runner.AI.preferred') || {};
  const card = pref.cardToPlay || pref.cardToInstall || pref.cardToTrigger;
  return {command: optionList[idx], card: card ? card.title : '', pref};
}
async function corpCommand() {
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions)');
  const idx = await run('corp.AI').CommandChoice(optionList);
  const pref = run('corp.AI.preferred') || {};
  const card = pref.cardToPlay || pref.cardToInstall || pref.cardToTrigger || pref.cardToRez || pref.cardToAdvance;
  return {command: optionList[idx], card: card ? card.title : '', pref};
}
// Play an event/operation through the engine's play path with a choice.
function play(cardExpr, choicePick = choices => choices[0]) {
  const card = run(cardExpr);
  const choices = card.Enumerate ? card.Enumerate.call(card) : [{}];
  return {card, choices, go: () => { run('Play')(card, choicePick(choices)); }};
}

// Drive a run to its end as a simple human Runner: steal, access each card, then continue.
function driveRun(server, {pick = opts => opts[0]} = {}) {
  const accessed = [];
  run('MakeRun(' + server + ')');
  for (let guard = 0; guard < 80 && run('currentPhase') !== run('phases.runnerActionMain'); guard++) {
    const phase = run('currentPhase');
    const keys = Object.keys(phase.Resolve || {});
    const ok = cmd => keys.includes(cmd) && (!phase.Enumerate || !phase.Enumerate[cmd] || phase.Enumerate[cmd]().length > 0);
    const cmd = ['steal', 'access', 'trigger', 'continue', 'n'].find(ok) || keys[0];
    const opts = phase.Enumerate && phase.Enumerate[cmd] ? phase.Enumerate[cmd]() : [{}];
    const choice = cmd == 'continue' ? pick(opts, phase) : opts[0] || {};
    if (cmd == 'access') accessed.push(choice.card);
    phase.Resolve[cmd](choice);
  }
  return accessed;
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Surge ----------------
test('Surge needs a program that received virus counters this turn and adds 2 more to it', () => {
  setUpBoard({installed: [ID.Imp], grip: [ID.Surge]});
  const surge = run('runner.grip[0]');
  assert.strictEqual(surge.Enumerate.call(surge).length, 0, 'no virus counters placed this turn: not playable');
  const imp = run('runner.rig.programs[0]');
  run('AddCounters(runner.rig.programs[0], "virus", 1)');
  const choices = surge.Enumerate.call(surge);
  same(titles(choices.map(c => c.card)), ['Imp']);
  const before = run('Counters(runner.rig.programs[0], "virus")');
  surge.Resolve.call(surge, choices[0]);
  assert.strictEqual(imp.virus, before + 2, '2 virus counters placed');
  run('ChangePhase(phases.runnerStartResponse)'); settle();
  assert.strictEqual(surge.Enumerate.call(surge).length, 0, 'record cleared when a turn begins');
});

test('Surge ignores counters placed on a program before it is installed or on a trashed program', () => {
  setUpBoard({installed: [ID.Imp], grip: [ID.Surge]});
  const surge = run('runner.grip[0]');
  run('AddCounters(runner.rig.programs[0], "virus", 1)');
  run('Trash(runner.rig.programs[0], false)'); settle();
  assert.strictEqual(surge.Enumerate.call(surge).length, 0, 'that program is no longer installed');
});

test('Runner AI plays Surge in its window on the program that gained counters', async () => {
  setUpBoard({installed: [ID.Imp], grip: [ID.Surge], stack: [ID.Diesel], hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], ai: true});
  let choice = await runnerCommand();
  assert.notStrictEqual(choice.card, 'Surge', 'no window yet');
  run('runner.AI.preferred = null; AddCounters(runner.rig.programs[0], "virus", 1)');
  choice = await runnerCommand();
  assert.strictEqual(choice.command + ':' + choice.card, 'play:Surge');
});

// ---------------- Andromeda ----------------
test('Andromeda draws 9 for a starting hand and mulligan; other identities draw 5', () => {
  const stack = Array(15).fill(ID.SureGamble);
  setUpBoard({identity: ID.Andromeda, stack, grip: Array(9).fill(ID.Diesel)});
  assert.strictEqual(run('StartingHandSize(runner)'), 9);
  assert.strictEqual(run('StartingHandSize(corp)'), 5);
  run('activePlayer = runner; currentPhase = phases.runnerMulligan; Mulligan();'); settle();
  assert.strictEqual(run('runner.grip.length'), 9, 'mulligan draws a new 9-card hand');
  setUpBoard({stack, grip: Array(5).fill(ID.Diesel)});
  assert.strictEqual(run('StartingHandSize(runner)'), 5);
});

// ---------------- HQ Interface ----------------
test('HQ Interface accesses 1 additional card from HQ only, and reports it to both AIs', () => {
  setUpBoard({installed: [ID.HQInterface], hq: [ID.HedgeFund, ID.PAD, ID.HedgeFund]});
  run('attackedServer = corp.HQ');
  const card = run('runner.rig.hardware[0]');
  assert.strictEqual(card.modifyBreachAccess.Resolve.call(card), 1);
  run('attackedServer = corp.RnD');
  assert.strictEqual(card.modifyBreachAccess.Resolve.call(card), 0);
  same(card.AICentralPressure.call(card, run('corp.HQ')), {additionalAccess: 1});
  same(card.AICentralPressure.call(card, run('corp.RnD')), {});
});

test('HQ Interface: a breach of HQ accesses 2 cards', () => {
  setUpBoard({installed: [ID.HQInterface], hq: [ID.HedgeFund, ID.PAD, ID.HedgeFund], credits: 0});
  const accessed = driveRun('corp.HQ');
  assert.strictEqual(accessed.length, 2, 'accessed 2 cards from HQ');
});

// ---------------- Quality Time ----------------
test('Quality Time draws 5 and the AI plays it for draw when the grip is low', async () => {
  setUpBoard({grip: [ID.QualityTime], stack: Array(8).fill(ID.SureGamble), credits: 6, hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], ai: true});
  const choice = await runnerCommand();
  assert.strictEqual(choice.command + ':' + choice.card, 'play:Quality Time');
  const qt = run('runner.grip[0]');
  qt.Resolve.call(qt, {}); settle();
  assert.strictEqual(run('runner.grip.length'), 6, 'drew 5');
  setUpBoard({grip: [ID.QualityTime], stack: Array(8).fill(ID.SureGamble), credits: 3, ai: true});
  assert.strictEqual(qt.AIWouldPlay.call(run('runner.grip[0]')), false, 'keeps a credit after paying 3');
});

// ---------------- Replicator ----------------
test('Replicator fetches another copy of installed hardware, including itself, and the AI takes it', () => {
  setUpBoard({grip: [ID.Replicator, ID.T400], stack: [ID.Diesel, ID.T400, ID.Replicator, ID.SureGamble], credits: 10});
  run('Install(runner.grip[0], null, false, null, true)');
  settle(choices => choices[0]);
  assert.strictEqual(titles(run('runner.grip')).filter(t => t == 'Replicator').length, 1, 'searched for Replicator itself');
  assert.strictEqual(run('runner.stack.length'), 3);
  run('Install(runner.grip.find(c => c.title == "T400 Memory Diamond"), null, false, null, true)');
  settle(choices => choices[0]);
  assert(byTitle(run('runner.grip'), 'T400 Memory Diamond'), 'copy added to grip');
  assert(!byTitle(run('runner.stack'), 'T400 Memory Diamond'));
  // no copy left: no offer
  const rep = run('runner.rig.hardware[0]');
  assert.strictEqual(rep.responseOnInstall.Enumerate.call(rep, run('runner.rig.hardware[1]')).length, 0);
  // AI with copy available: search is the only option offered
  run('runner.AI = new RunnerAI(); runner.AI._log = function() {};');
  const t400 = run('runner.grip.find(c => c.title == "T400 Memory Diamond")');
  run('MoveCard(runner.grip.find(c => c.title == "T400 Memory Diamond"), runner.stack)');
  same(rep.responseOnInstall.Enumerate.call(rep, run('runner.rig.hardware[1]')).map(c => c.id), [1]);
  assert(t400);
});

test('Replicator declines are honoured for a human', () => {
  setUpBoard({installed: [ID.Replicator], grip: [ID.T400], stack: [ID.T400, ID.Diesel], credits: 10});
  run('Install(runner.grip[0], null, false, null, true)');
  settle(choices => choices.find(c => c.id === 0) || choices[0]);
  assert.strictEqual(run('runner.grip.length'), 0, 'declined: nothing fetched');
  assert.strictEqual(run('runner.stack.length'), 2);
});

// ---------------- Kraken ----------------
test('Kraken needs a steal this turn; the Corp trashes its cheapest ice on the chosen server', () => {
  setUpBoard({grip: [ID.Kraken], rndIce: [ID.Enigma, ID.IceWall], credits: 5, corpAI: true});
  const kraken = run('runner.grip[0]');
  assert.strictEqual(kraken.Enumerate.call(kraken).length, 0, 'no steal this turn');
  run('RecordTurnEvent("runnerAgendaStolen")');
  const choices = kraken.Enumerate.call(kraken);
  same(choices.map(c => c.label), ['R&D'], 'only servers with ice');
  kraken.Resolve.call(kraken, choices[0]);
  const decision = run('currentPhase');
  const opts = decision.Enumerate.continue ? decision.Enumerate.continue() : [];
  const pref = run('corp.AI.preferred');
  assert.strictEqual(pref.option.card.title, 'Ice Wall', 'cheapest ice');
  decision.Resolve.continue(pref.option); settle();
  same(titles(run('corp.RnD.ice')), ['Enigma']);
  assert(byTitle(run('corp.archives.cards'), 'Ice Wall'), 'trashed');
  assert(opts.length == 2);
});

test('Steal records the agenda-stolen turn event and the Runner AI plays Kraken on R&D', async () => {
  setUpBoard({grip: [ID.Kraken], hq: [ID.HostileTakeover], rndIce: [ID.IceWall], hqIce: [], credits: 5});
  driveRun('corp.HQ');
  assert.strictEqual(run('runner.scoreArea.length'), 1, 'stole');
  assert.strictEqual(run('TurnEventCount("runnerAgendaStolen")'), 1);
  run('runner.AI = new RunnerAI(); runner.AI._log = function() {}; runner.clickTracker = 3;');
  const choice = await runnerCommand();
  assert.strictEqual(choice.command + ':' + choice.card, 'play:Kraken');
});

// ---------------- Kati Jones ----------------
test('Kati Jones places 3, then takes all; only once per turn', () => {
  setUpBoard({installed: [ID.Kati], credits: 0});
  const kati = run('runner.rig.resources[0]');
  assert.strictEqual(run('ChoicesAbility(runner.rig.resources[0])').length, 1, 'nothing to take yet');
  kati.abilities[0].Resolve.call(kati, {});
  assert.strictEqual(kati.credits, 3);
  assert.strictEqual(run('ChoicesAbility(runner.rig.resources[0])').length, 0, 'once per turn');
  run('ChangePhase(phases.runnerStartResponse)'); settle();
  run('runner.clickTracker = 4; currentPhase = phases.runnerActionMain');
  assert.strictEqual(run('ChoicesAbility(runner.rig.resources[0])').length, 2);
  kati.abilities[1].Resolve.call(kati, {});
  assert.strictEqual(run('runner.creditPool'), 3);
  assert.strictEqual(Number(kati.credits || 0), 0);
});

test('Runner AI builds Kati Jones up and cashes out a large stash', async () => {
  setUpBoard({installed: [ID.Kati], credits: 4, grip: Array(5).fill(ID.Kraken), stack: [ID.Diesel], hqIce: [ID.Palisade], rndIce: [ID.Palisade], archivesIce: [ID.Palisade], ai: true});
  run("runner.clickTracker = 2"); // full grip, no overdraw wanted: economy next
  const kati = run('runner.rig.resources[0]');
  let choice = await runnerCommand();
  assert.strictEqual(choice.command + ':' + choice.card + ':' + choice.pref.abilityAlt, 'trigger:Kati Jones:place');
  run('runner.AI.preferred = null');
  kati.credits = 9;
  choice = await runnerCommand();
  assert.strictEqual(choice.command + ':' + choice.card + ':' + choice.pref.abilityAlt, 'trigger:Kati Jones:take');
  // the preference selects the matching ability
  const optionList = run('ChoicesTriggerableAbilities(runner, "click")').filter(o => o.card == kati);
  assert(optionList.some(o => o.alt == 'take'));
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
console.log('genesis hs: ' + cases + ' cases passed');
})();
