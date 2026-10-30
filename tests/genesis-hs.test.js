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
  Imp: 31007, Rototurret: 31046, Cleaver: 30006, VoicePAD: 31038,
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
    const cmd = ['continue', 'trace'].find(k => options(k).length > 0);
    if (cmd) { phase.Resolve[cmd](pick(options(cmd), phase.context, phase)); continue; }
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
}
// As settle, but decisions belonging to a player with an AI are made by that AI's real selector.
async function settleAI(pick = choices => choices[0]) {
  for (let guard = 0; guard < 80; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.corpActionMain, phases.runnerPostAction, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    const cmd = ['continue', 'trace'].find(k => options(k).length > 0);
    if (cmd) {
      const opts = options(cmd);
      const ai = phase.player && phase.player.AI;
      let choice;
      if (ai) {
        run('executingCommand = "' + cmd + '"');
        choice = opts[await ai.SelectChoice(opts)];
        run('executingCommand = ""');
      } else choice = pick(opts, phase.context, phase);
      phase.Resolve[cmd](choice);
      continue;
    }
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settleAI did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
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
    const cmd = ['steal', 'access', 'trigger', 'continue', 'trace', 'n'].find(ok) || keys[0];
    const opts = phase.Enumerate && phase.Enumerate[cmd] ? phase.Enumerate[cmd]() : [{}];
    const choice = cmd == 'continue' || cmd == 'trace' ? pick(opts, phase) : opts[0] || {};
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

// ---------------- Pheromones ----------------
test('Pheromones gains a counter per successful HQ run and refills X credits usable only on HQ runs', () => {
  setUpBoard({installed: [ID.Pheromones], hq: [ID.HedgeFund, ID.HedgeFund], credits: 0});
  const ph = run('runner.rig.programs[0]');
  assert.strictEqual(Number(ph.credits || 0), 0, 'X = 0 at install');
  driveRun('corp.archives');
  assert.strictEqual(Number(ph.virus || 0), 0, 'Archives run: no counter');
  driveRun('corp.HQ');
  driveRun('corp.HQ');
  assert.strictEqual(ph.virus, 2, 'one counter per successful HQ run');
  run('ChangePhase(phases.runnerStartResponse)'); settle();
  assert.strictEqual(ph.credits, 2, 'refilled to the number of virus counters');
  run('attackedServer = corp.HQ');
  assert.strictEqual(run('AvailableCredits(runner, "using", null)'), 2, 'usable during a run on HQ');
  run('attackedServer = corp.RnD');
  assert.strictEqual(run('AvailableCredits(runner, "using", null)'), 0, 'not on other servers');
  run('attackedServer = null');
  assert.strictEqual(ph.AIRunPoolCreditOffset.call(ph, run('corp.HQ')), 2, 'Runner AI counts them for HQ');
  assert.strictEqual(ph.AIRunPoolCreditOffset.call(ph, run('corp.RnD')), 0);
});

// ---------------- Creeper ----------------
test('Creeper costs 0 MU with 2 link, breaks sentries for 2 and pumps for 1 for the encounter', () => {
  setUpBoard({grip: [ID.Creeper], installed: [ID.Imp, ID.Imp, ID.Imp, ID.Imp], credits: 10});
  const creeper = run('runner.grip[0]');
  assert.strictEqual(run('MemoryCost(runner.grip[0])'), 1);
  assert.strictEqual(run('ChoicesCardInstall(runner.grip[0], true).length > 0 && InstalledMemoryCost() + MemoryCost(runner.grip[0]) <= MemoryUnits()'), false, 'no MU with 1 link');
  run('runner.identityCard.link = 2');
  assert.strictEqual(run('MemoryCost(runner.grip[0])'), 0, '0 MU with 2 link, even in the grip');
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert(byTitle(run('runner.rig.programs'), 'Creeper'), 'installed alongside 4 MU of programs');
  assert.strictEqual(run('InstalledMemoryCost()'), 4);
  assert.deepStrictEqual(Array.from(creeper.abilities.map(a => a.text)), ['Break 1 sentry subroutine.', '+1 strength.']);
});

test('Run calculator uses Creeper against sentries', () => {
  setUpBoard({installed: [ID.Creeper], hqIce: [ID.Rototurret], credits: 10, ai: true});
  const withCreeper = run('runner.AI._getCachedCost(corp.HQ)');
  assert(withCreeper !== Infinity, 'HQ is runnable with Creeper');
  setUpBoard({installed: [], hqIce: [ID.Rototurret], credits: 10, ai: true});
  assert.strictEqual(run('runner.AI._getCachedCost(corp.HQ)'), Infinity, 'no breaker: not runnable');
});

// ---------------- Eve Campaign ----------------
test('Eve Campaign loads 16 on rez, pays 2 each Corp turn, then is trashed when empty', () => {
  setUpBoard({remotes: [[ID.Eve]], rnd: Array(12).fill(ID.HedgeFund), corpCredits: 5, turn: 'corp'});
  const eve = run('corp.remoteServers[0].root[0]');
  run('Rez(corp.remoteServers[0].root[0])'); settle();
  assert.strictEqual(eve.credits, 16, 'loaded 16');
  assert.strictEqual(run('corp.creditPool'), 0, 'paid 5');
  for (let turn = 1; turn <= 8; turn++) {
    run('ChangePhase(phases.corpStartDraw)'); settle();
    assert.strictEqual(run('corp.creditPool'), 2 * turn, 'turn ' + turn + ': took 2');
  }
  assert(!run('InstalledCards(corp)').some(c => c.title == 'Eve Campaign'), 'trashed when empty');
  assert(byTitle(run('corp.archives.cards'), 'Eve Campaign'));
});

test('Corp AI rezzes Eve Campaign at the end of the Runner turn, not mid-turn', () => {
  setUpBoard({remotes: [[ID.Eve]], corpCredits: 6, corpAI: true});
  const eve = run('corp.remoteServers[0].root[0]');
  run('var __saved = currentPhase; currentPhase = {identifier: "Runner 2.2", title: "x"}');
  assert.strictEqual(eve.AIRezWhenCan.call(eve), true);
  run('currentPhase = {identifier: "Corp 2.2", title: "x"}');
  assert.strictEqual(eve.AIRezWhenCan.call(eve), false);
  run('currentPhase = __saved');
  const choice = eve.AIWorthInstalling.call(eve, []);
  assert.strictEqual(choice, 0, 'asks for a new remote');
  run('corp.creditPool = 2');
  assert.strictEqual(eve.AIWorthInstalling.call(eve, []), -1, 'too poor to plan the 5-credit rez');
});

test('Corp AI installs Eve Campaign as economy', async () => {
  setUpBoard({hq: [ID.Eve], rnd: Array(6).fill(ID.HedgeFund), corpCredits: 4, turn: 'corp', corpAI: true,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall]});
  const choice = await corpCommand();
  assert.strictEqual(choice.command + ':' + choice.card, 'install:Eve Campaign');
});

// ---------------- Rework ----------------
test('Rework shuffles a chosen HQ card into R&D; the Corp AI hides an agenda', async () => {
  setUpBoard({hq: [ID.Rework, ID.HostileTakeover, ID.HedgeFund], rnd: [ID.HedgeFund, ID.HedgeFund], turn: 'corp', corpAI: true});
  const rework = run('corp.HQ.cards[0]');
  run('corp.clickTracker = 1');
  assert.strictEqual(rework.AIWouldPlay.call(rework), true, 'last click with an agenda in HQ');
  run('corp.clickTracker = 3');
  assert.strictEqual(rework.AIWouldPlay.call(rework), false, 'one agenda, clicks left to install it');
  run('MoveCard(corp.HQ.cards[0], corp.resolvingCards)');
  rework.Resolve.call(rework, {});
  await settleAI();
  same(titles(run('corp.HQ.cards')), ['Hedge Fund']);
  assert(byTitle(run('corp.RnD.cards'), 'Hostile Takeover'), 'agenda shuffled into R&D');
  assert.strictEqual(run('corp.RnD.cards.length'), 3);
});

test('Corp AI plays Rework on its last click with an agenda in HQ', async () => {
  setUpBoard({hq: [ID.Rework, ID.HostileTakeover], rnd: [ID.HedgeFund, ID.HedgeFund], turn: 'corp', corpAI: true,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall]});
  run('corp.clickTracker = 1; corp.creditPool = 0');
  const choice = await corpCommand();
  assert.strictEqual(choice.command + ':' + choice.card, 'play:Rework');
});

// ---------------- Whirlpool ----------------
test('Whirlpool stops jacking out for the rest of the run and trashes itself', () => {
  setUpBoard({rndIce: [ID.Whirlpool, ID.IceWall], credits: 0});
  const whirl = run('corp.RnD.ice[0]');
  assert.strictEqual(run('CheckJackOut()'), true);
  run('attackedServer = corp.RnD');
  whirl.subroutines[0].Resolve.call(whirl); settle();
  assert.strictEqual(run('CheckJackOut()'), false, 'cannot jack out');
  assert.strictEqual(run('corp.RnD.ice.length'), 1, 'Whirlpool trashed');
  run('currentPhase = phases.runDecideContinue; activePlayer = runner;');
  assert.strictEqual(run('phases.runDecideContinue.Enumerate.jack().length'), 0, 'no jack-out option');
  run('ChangePhase(phases.runEnds)'); settle();
  assert.strictEqual(run('CheckJackOut()'), true, 'effect ends with the run');
});

// ---------------- Data Hound ----------------
test('Data Hound: margin 2 looks at 2 cards; the Corp AI trashes the best and puts the other back on top', async () => {
  setUpBoard({hqIce: [ID.DataHound], stack: [ID.SureGamble, ID.Diesel, ID.QualityTime, ID.Cleaver], credits: 0, corpCredits: 0, corpAI: true});
  const hound = run('corp.HQ.ice[0]');
  run('attackedServer = corp.HQ');
  hound.subroutines[0].Resolve.call(hound);
  await settleAI();
  assert.strictEqual(run('runner.stack.length'), 3, 'trashed 1 of the top 2');
  assert.strictEqual(run('runner.heap.length'), 1);
  const top2 = ['Quality Time', 'Cleaver'];
  assert(top2.includes(run('runner.heap[0].title')), 'trashed from the top 2');
  const eloOf = t => run('cardSet').find(c => c && c.title == t).elo;
  const kept = top2.find(t => t != run('runner.heap[0].title'));
  assert(eloOf(run('runner.heap[0].title')) >= eloOf(kept), 'higher-ranked card trashed');
  assert.strictEqual(run('runner.stack[runner.stack.length - 1].title'), kept, 'other card back on top');
  same(titles(run('runner.stack')).slice(0, 2), ['Sure Gamble', 'Diesel'], 'rest of the stack untouched');
});

test('Data Hound: a matched trace looks at nothing', () => {
  setUpBoard({hqIce: [ID.DataHound], stack: [ID.SureGamble, ID.Diesel], credits: 5, corpCredits: 0});
  const hound = run('corp.HQ.ice[0]');
  hound.subroutines[0].Resolve.call(hound);
  settle((choices, ctx, phase) => phase.player === run('runner') ? choices[choices.length - 1] : choices[0]);
  assert.strictEqual(run('runner.stack.length'), 2);
  assert.strictEqual(run('runner.heap.length'), 0);
});

// ---------------- Bernice Mai ----------------
test('Bernice Mai traces on a successful run on its server: tag, or trashed when matched', () => {
  setUpBoard({remotes: [[ID.Bernice]], credits: 0, corpCredits: 0});
  run('corp.remoteServers[0].root[0].rezzed = true');
  driveRun('corp.remoteServers[0]');
  assert.strictEqual(run('runner.tags'), 1, 'trace 5 vs link 0: tagged');
  setUpBoard({remotes: [[ID.Bernice]], credits: 6, corpCredits: 0});
  run('corp.remoteServers[0].root[0].rezzed = true');
  driveRun('corp.remoteServers[0]', {pick: (opts, phase) => phase.player === run('runner') ? opts[opts.length - 1] : opts[0]});
  assert.strictEqual(run('runner.tags'), 0, 'matched');
  assert(byTitle(run('corp.archives.cards'), 'Bernice Mai'), 'trashed on an unsuccessful trace');
  setUpBoard({remotes: [[ID.Bernice], []], credits: 0, corpCredits: 0});
  run('corp.remoteServers[0].root[0].rezzed = true');
  driveRun('corp.archives');
  assert.strictEqual(run('runner.tags'), 0, 'other servers do not trigger');
});

test('Corp AI spends on the Bernice Mai trace only when it can beat the Runner', () => {
  setUpBoard({remotes: [[ID.Bernice]], credits: 3, corpCredits: 10, corpAI: true});
  assert.strictEqual(run('corp.AI._traceSpendToBeat(5)'), 0, 'base 5 already beats 0 link + 3 credits');
  run('runner.creditPool = 8');
  assert.strictEqual(run('corp.AI._traceSpendToBeat(5)'), 4, 'outbid 0 link + 8 credits');
  run('corp.creditPool = 3');
  assert.strictEqual(run('corp.AI._traceSpendToBeat(5)'), 0, 'cannot outbid: keep the money');
  // through the real trace decision: the Corp AI raises by 4 and the run tags
  setUpBoard({remotes: [[ID.Bernice]], credits: 8, corpCredits: 10, corpAI: true});
  run('corp.remoteServers[0].root[0].rezzed = true; attackedServer = corp.remoteServers[0]');
  const bern = run('corp.remoteServers[0].root[0]');
  bern.responseOnRunSuccessful.Resolve.call(bern);
  return settleAI((opts, ctx, phase) => opts[opts.length - 1]).then(() => {
    assert.strictEqual(run('corp.creditPool'), 6, 'Corp spent 4');
    assert.strictEqual(run('runner.tags'), 1, 'still tagged after the Runner matched what it could');
  });
});

// ---------------- Salvage ----------------
test('Salvage is advanceable only while rezzed and gains a trace-tag subroutine per counter', () => {
  setUpBoard({hqIce: [ID.Salvage], credits: 0, corpCredits: 5, rezIce: false});
  const salvage = run('corp.HQ.ice[0]');
  run('InvalidateActiveTriggerCandidateCache && InvalidateActiveTriggerCandidateCache()');
  run('AutomaticTriggers("automaticOnAnyChange")');
  assert.strictEqual(run('CheckAdvance(corp.HQ.ice[0])'), false, 'unrezzed: cannot advance');
  assert.strictEqual(salvage.subroutines.length, 0);
  run('corp.HQ.ice[0].rezzed = true; AutomaticTriggers("automaticOnAnyChange")');
  assert.strictEqual(run('CheckAdvance(corp.HQ.ice[0])'), true, 'rezzed: can advance');
  run('Advance(corp.HQ.ice[0]); Advance(corp.HQ.ice[0]); AutomaticTriggers("automaticOnAnyChange")'); settle();
  assert.strictEqual(salvage.subroutines.length, 2, 'one subroutine per counter');
  assert.notStrictEqual(salvage.subroutines[0], salvage.subroutines[1], 'separate subroutine objects');
  same(run('corp.HQ.ice[0].AIImplementIce(null, {sr: []}, 0, false)').sr, [[['tag']], [['tag']]]);
  salvage.subroutines[0].Resolve.call(salvage); settle();
  assert.strictEqual(run('runner.tags'), 1, 'trace 2 vs link 0: tagged');
});

// ---------------- Simone Diego ----------------
test('Simone Diego credits pay only to advance cards in its server', () => {
  setUpBoard({remotes: [[ID.Simone, ID.HostileTakeover, ID.IceWall], [ID.HostileTakeover]], corpCredits: 0, turn: 'corp'});
  run('corp.remoteServers[0].root[0].rezzed = true; corp.remoteServers[0].root[0].credits = 2; corp.remoteServers[0].ice[0].rezzed = true;');
  assert.strictEqual(run('AvailableCredits(corp, "advancing", corp.remoteServers[0].root[1])'), 2, 'root card in its server');
  assert.strictEqual(run('AvailableCredits(corp, "advancing", corp.remoteServers[0].ice[0])'), 2, 'ice protecting its server');
  assert.strictEqual(run('AvailableCredits(corp, "advancing", corp.remoteServers[1].root[0])'), 0, 'not other servers');
  assert.strictEqual(run('AvailableCredits(corp, "rezzing", corp.remoteServers[0].root[1])'), 0, 'only for advancing');
  const options = run('phases.corpActionMain.Enumerate.advance()');
  assert(options.some(o => o.card === run('corp.remoteServers[0].root[1]')), 'advance offered with only hosted credits');
  assert(!options.some(o => o.card === run('corp.remoteServers[1].root[0]')), 'not elsewhere');
});

test('Simone Diego refills 2 when the Corp turn begins and the AI rezzes it with an agenda to advance', () => {
  setUpBoard({remotes: [[ID.Simone, ID.HostileTakeover]], rnd: Array(4).fill(ID.HedgeFund), corpCredits: 5, turn: 'corp', corpAI: true});
  const simone = run('corp.remoteServers[0].root[0]');
  assert.strictEqual(simone.AIRezWhenCan.call(simone), true);
  run('corp.remoteServers[0].root[0].rezzed = true; corp.remoteServers[0].root[0].credits = 0');
  run('ChangePhase(phases.corpStartDraw)'); settle();
  assert.strictEqual(simone.credits, 2);
});

// ---------------- Foxfire ----------------
test('Foxfire trashes a link card or virtual resource on a successful trace; the AI plays it when it can win', async () => {
  setUpBoard({installed: [ID.Kati], hq: [ID.Foxfire], credits: 0, corpCredits: 3, turn: 'corp', corpAI: true});
  const fox = run('corp.HQ.cards[0]');
  assert.strictEqual(fox.AIWouldPlay.call(fox), false, 'Kati Jones is not virtual and has no link');
  run('runner.rig.resources[0].subTypes = ["Connection", "Virtual"]');
  assert.strictEqual(fox.AIWouldPlay.call(fox), true, 'virtual target, trace 7 beats 0 link + 0 credits');
  run('runner.creditPool = 20');
  assert.strictEqual(fox.AIWouldPlay.call(fox), false, 'the Runner could match it');
  run('runner.creditPool = 0; MoveCard(corp.HQ.cards[0], corp.resolvingCards)');
  fox.Resolve.call(fox, {});
  await settleAI();
  assert.strictEqual(run('runner.rig.resources.length'), 0, 'trashed');
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
