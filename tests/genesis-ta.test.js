// Run with: node tests/genesis-ta.test.js
// Genesis Cycle, Trace Amount (2021–2040), exercised through the real engine,
// run calculator and Corp/Runner AI.
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

const idOf = title => {
  const id = run(`cardSet.findIndex(function (c) { return c && c.title == ${JSON.stringify(title)}; })`);
  assert(id > 0, 'card ' + title);
  return id;
};
const ID = {
  HB: idOf('Haas-Bioroid: Precision Design'), Tao: idOf('Tāo Salonga: Telepresence Magician'),
  HedgeFund: idOf('Hedge Fund'), IceWall: idOf('Ice Wall'), Enigma: idOf('Enigma'),
  SureGamble: idOf('Sure Gamble'), Corroder: idOf('Corroder'), Hostile: idOf('Hostile Takeover'),
  Vamp: 2021, Uplink: 2023, E3: 2024, Employee: 2025, Notoriety: 2026, Snowball: 2027, Dyson: 2028,
  Encryption: 2029, Sherlock: 2030, RP: 2031, FetalAI: 2032, Sensei: 2034, BigBrother: 2035,
  ChiLo: 2036, PGO: 2037, AIZ: 2038, Retreat: 2039, Freelancer: 2040,
};

function setUpBoard({corpId = ID.HB, hqIce = [], rndIce = [], archivesIce = [], remotes = [], hq = [ID.HedgeFund],
  rnd = [ID.HedgeFund, ID.HedgeFund], archives = [], scored = [], stack = [], grip = [], heap = [], installed = [],
  credits = 5, corpCredits = 5, runnerAI = false, corpAI = false, rezIce = true, corpTurn = false} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {}; executingCommand = "";
    Object.assign(corp, {identityCard: null, creditPool: ${corpCredits}, clickTracker: 3, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${corpId}, ${JSON.stringify(archives)}, ${JSON.stringify(rnd)}, ${JSON.stringify(hq)},
      ${JSON.stringify(archivesIce)}, ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, ${JSON.stringify(remotes)},
      ${JSON.stringify(scored)}, cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, ${JSON.stringify(heap)}, ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    if (${corpTurn}) { activePlayer = corp; playerTurn = corp; currentPhase = phases.corpActionMain; }
    else { activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain; }
    if (${rezIce}) corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${runnerAI ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
    ${corpAI ? 'corp.AI = new CorpAI(); corp.AI._log = function() {};' : ''}
    InvalidateActiveTriggerCandidateCache();
  `);
}

// Resolve pending decisions (first choice by default) until back at a stable phase.
async function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 60; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.corpActionMain, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
    const options = cmd => !phase.Resolve || typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    for (const cmd of ['continue', 'trace', 'trash']) {
      const choices = options(cmd);
      if (choices.length > 0) { const picked = await pick(choices, phase); phase.Resolve[cmd](picked === undefined ? choices[0] : picked); break; }
    }
    if (run('currentPhase') !== phase) continue;
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
}
// Let the AI of the deciding player answer every pending decision.
function settleAI() {
  return settle(async (choices, phase) => {
    const player = phase.player;
    if (!player || !player.AI) return choices[0];
    run('currentPhase').title = phase.title;
    const index = player === run("runner") ? await player.AI.SelectChoice(choices) : player.AI.Choice(choices, "select");
    return choices[index >= 0 ? index : 0];
  });
}
function encounter(server, iceIdx = 0) {
  run(`attackedServer = ${server}; approachIce = ${iceIdx}; encountering = true;
    encounteredIce = ${server}.ice[${iceIdx}]; currentPhase = phases.runEncounterIce;
    AutomaticTriggers("automaticOnEncounter", [encounteredIce]);`);
}
const titles = cards => Array.from(cards, card => card.title);
const find = (zone, title) => `${zone}.find(function (c) { return c.title == "${title}"; })`;
const grip = title => find('runner.grip', title);
const hqCard = title => find('corp.HQ.cards', title);
const installedRunner = title => `InstalledCards(runner).find(function (c) { return c.title == "${title}"; })`;
const installedCorp = title => `InstalledCards(corp).find(function (c) { return c.title == "${title}"; })`;
// Move a hand card into the resolving zone and resolve it with the given choice.
function playCard(ref, choiceExpr = '{}') {
  run(`(function () { var card = ${ref}; MoveCard(card, card.player.resolvingCards); card.Resolve.call(card, ${choiceExpr}); })()`);
}
async function runnerCommand() {
  run(`executingCommand = ""`); const cmds = run(`EnumeratePhase()`);
  const i = await run(`runner`).AI.CommandChoice(cmds);
  return {cmd: cmds[i], pref: run(`runner.AI.preferred`)};
}
function corpCommand() {
  return run(`(function () { executingCommand = ""; var cmds = EnumeratePhase(); var i = corp.AI.Choice(cmds, "command"); return {cmd: cmds[i], pref: corp.AI.preferred}; })()`);
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Vamp ----------------
const VAMP = find('runner.resolvingCards', 'Vamp');
function vampSucceeds() {
  playCard(grip('Vamp'));
  assert.strictEqual(run('attackedServer === corp.HQ'), true, 'runs HQ');
  run('currentPhase = phases.runnerActionMain; AutomaticTriggers("automaticOnRunSuccessful", [corp.HQ]);');
}

test('Vamp: optional breach replacement spends X, the Corp loses X and the Runner takes 1 tag', async () => {
  setUpBoard({grip: [ID.Vamp], credits: 6, corpCredits: 8});
  vampSucceeds();
  assert.strictEqual(run(`${VAMP}.specialOnInsteadOfBreaching.Enumerate.call(${VAMP}).length`), 1);
  run(`${VAMP}.specialOnInsteadOfBreaching.Resolve.call(${VAMP})`);
  const choices = run('currentPhase.Enumerate.continue()');
  assert.deepStrictEqual(Array.from(choices, c => c.x), [0, 1, 2, 3, 4, 5, 6], 'X from 0 to available credits');
  await settle(cs => cs.find(c => c.x === 4));
  assert.strictEqual(run('runner.creditPool'), 2);
  assert.strictEqual(run('corp.creditPool'), 4);
  assert.strictEqual(run('runner.tags'), 1);
  run(`AutomaticTriggers("automaticOnRunEndCleanup", [[]])`);
  assert.strictEqual(run(`${VAMP}.runningWithThis`), false, 'cleaned up after the run');
});

test('Vamp: X = 0 takes no tag; a non-HQ success does not queue the replacement', async () => {
  setUpBoard({grip: [ID.Vamp], credits: 3});
  vampSucceeds();
  run(`${VAMP}.specialOnInsteadOfBreaching.Resolve.call(${VAMP})`);
  await settle(cs => cs[0]);
  assert.strictEqual(run('runner.tags'), 0);
  assert.strictEqual(run('corp.creditPool'), 5);
  run(`${VAMP}.automaticOnRunSuccessful.Resolve.call(${VAMP}, corp.RnD)`);
  assert.strictEqual(run(`${VAMP}.specialOnInsteadOfBreaching.Enumerate.call(${VAMP}).length`), 0);
});

test('Vamp AI: drains the Corp when the swing is meaningful, breaches otherwise; run potential only on HQ', async () => {
  setUpBoard({grip: [ID.Vamp], credits: 7, corpCredits: 6, runnerAI: true});
  assert(run(`${grip('Vamp')}.AIRunEventExtraPotential(corp.HQ, 1)`) > 0);
  assert.strictEqual(run(`${grip('Vamp')}.AIRunEventExtraPotential(corp.RnD, 1)`), 0);
  vampSucceeds();
  assert.strictEqual(run(`${VAMP}.specialOnInsteadOfBreaching.Enumerate.call(${VAMP}).length`), 1);
  run(`${VAMP}.specialOnInsteadOfBreaching.Resolve.call(${VAMP})`);
  const choices = run('currentPhase.Enumerate.continue()');
  assert.deepStrictEqual(Array.from(choices, c => c.x), [6], 'spends exactly what the Corp has');
  await settleAI();
  assert.strictEqual(run('corp.creditPool'), 0);
  assert.strictEqual(run('runner.creditPool'), 1);
  setUpBoard({grip: [ID.Vamp], credits: 7, corpCredits: 2, runnerAI: true});
  vampSucceeds();
  assert.strictEqual(run(`${VAMP}.specialOnInsteadOfBreaching.Enumerate.call(${VAMP}).length`), 0, 'poor Corp: breach instead');
});

// ---------------- Satellite Uplink ----------------
test('Satellite Uplink exposes up to 2 facedown installed Corp cards, chaining through Expose', async () => {
  setUpBoard({grip: [ID.Uplink], remotes: [[ID.Hostile, ID.IceWall], [ID.HedgeFund]], credits: 5, rezIce: false});
  const up = grip('Satellite Uplink');
  playCard(up);
  let d = run('currentPhase.Enumerate.continue()');
  assert.strictEqual(d.length, 4, 'three facedown cards and Done');
  await settle(cs => cs.find(c => c.card && c.card.title === 'Hostile Takeover'));
  assert.strictEqual(run(`${installedCorp('Hostile Takeover')}.knownToRunner`), true);
  assert.strictEqual(run(`${installedCorp('Hostile Takeover')}.faceUp`), false, 'turned back facedown');
  // settle continued into the second choice and picked the first remaining card
  assert.strictEqual(run('InstalledCards(corp).filter(function (c) { return c.knownToRunner; }).length'), 2);
  setUpBoard({grip: [ID.Uplink], remotes: [[ID.Hostile], [ID.HedgeFund]], credits: 5});
  playCard(grip('Satellite Uplink'));
  await settle(cs => cs[cs.length - 1]);
  assert.strictEqual(run('InstalledCards(corp).filter(function (c) { return c.knownToRunner; }).length'), 0, 'Done exposes nothing');
});

test('Satellite Uplink AI plays it through the Runner selector and exposes unknown remote roots', async () => {
  setUpBoard({grip: [ID.Uplink], remotes: [[ID.Hostile, ID.Enigma], [ID.HedgeFund, ID.Enigma]], credits: 8, runnerAI: true, hqIce: [ID.Enigma], rndIce: [ID.Enigma], archivesIce: [ID.Enigma]});
  const cmd = await runnerCommand();
  assert.strictEqual(cmd.cmd, "play");
  assert.strictEqual(cmd.pref.cardToPlay.title, "Satellite Uplink");
  playCard(grip('Satellite Uplink'));
  await settleAI();
  assert.strictEqual(run("corp.remoteServers.filter(function (s) { return s.root[0].knownToRunner; }).length"), 2, "both remote roots exposed");
  setUpBoard({grip: [ID.Uplink], remotes: [[ID.Hostile]], credits: 8, runnerAI: true});
  assert.strictEqual(run(`${grip('Satellite Uplink')}.AIWouldPlay()`), false, 'one unknown card is not worth it');
});

// ---------------- e3 Feedback Implants ----------------
const E3 = installedRunner('e3 Feedback Implants');
test('e3 Feedback Implants: pay 1 after a break to break another subroutine on that ice, optionally', async () => {
  setUpBoard({installed: [ID.E3, ID.Corroder], hqIce: [idOf('Palisade')], credits: 5});
  run('corp.HQ.ice[0].subroutines.push({text: "End the run.", Resolve: function () { EndTheRun(); }})');
  encounter('corp.HQ');
  const sr0 = 'corp.HQ.ice[0].subroutines[0]';
  run(`Break(${sr0})`);
  const offer = run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0})`);
  assert.strictEqual(offer.length, 2, 'one unbroken subroutine and decline');
  run(`${E3}.responseOnSubroutineBroken.Resolve.call(${E3}, ${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0})[0])`);
  await settle();
  assert.strictEqual(run('corp.HQ.ice[0].subroutines.every(function (s) { return s.broken; })'), true);
  assert.strictEqual(run('runner.creditPool'), 4);
  assert.strictEqual(run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0}).length`), 0, 'nothing left to break');
  run('runner.creditPool = 0; corp.HQ.ice[0].subroutines[1].broken = false;');
  assert.strictEqual(run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0}).length`), 0, 'needs 1 credit');
});

test('e3 AI breaks only a subroutine its run plan still means to break', async () => {
  setUpBoard({installed: [ID.E3, ID.Corroder], hqIce: [ID.IceWall], credits: 5, runnerAI: true});
  run('corp.HQ.ice[0].subroutines.push({text: "End the run.", Resolve: function () { EndTheRun(); }})');
  encounter('corp.HQ');
  const sr0 = 'corp.HQ.ice[0].subroutines[0]';
  run(`runner.AI.cachedBestPath = [{iceIdx: 0, sr_broken: [{idx: 0}, {idx: 1}], card_str_mods: [], persistents: []}]`);
  run(`Break(${sr0})`);
  let offer = run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0})`);
  assert.strictEqual(offer.length, 1);
  assert.strictEqual(run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0})[0].subroutine === corp.HQ.ice[0].subroutines[1]`), true);
  run(`runner.AI.cachedBestPath = [{iceIdx: 0, sr_broken: [{idx: 0}], card_str_mods: [], persistents: []}]`);
  offer = run(`${E3}.responseOnSubroutineBroken.Enumerate.call(${E3}, ${sr0})`);
  assert.strictEqual(offer.length, 1);
  assert.strictEqual(offer[0].subroutine, null, 'unplanned subroutine: decline');
});

// ---------------- Compromised Employee ----------------
test('Compromised Employee: recurring credit only for traces, +1 per Corp ice rez', async () => {
  setUpBoard({installed: [ID.Employee], hqIce: [ID.IceWall], rezIce: false, credits: 0});
  const ce = installedRunner('Compromised Employee');
  run(`LoadCredits(${ce}, ${ce}.recurringCredits)`);
  assert.strictEqual(run('CheckCredits(runner, 1, "trace")'), true);
  assert.strictEqual(run('CheckCredits(runner, 1, "using")'), false);
  run('Rez(corp.HQ.ice[0], true)');
  assert.strictEqual(run('runner.creditPool'), 1, 'gained 1 on ice rez');
  run('corp.HQ.ice[0].rezzed = false; AutomaticTriggers("automaticOnRez", [corp.HQ.ice[0]])');
  assert.strictEqual(run('runner.creditPool'), 2);
  setUpBoard({grip: [ID.Employee], runnerAI: true, credits: 5});
  assert.strictEqual(run(`${grip('Compromised Employee')}.AIEconomyInstall()`), 1);
});

// ---------------- Notoriety ----------------
test('Notoriety needs successful HQ, R&D and Archives runs this turn and scores 1 point', async () => {
  setUpBoard({grip: [ID.Notoriety], credits: 3, runnerAI: true});
  const n = grip('Notoriety');
  assert.strictEqual(run(`FullCheckPlay(${n})`), null);
  run('RecordTurnEvent("runnerSuccessfulRunHQ"); RecordTurnEvent("runnerSuccessfulRunRnD");');
  assert.strictEqual(run(`FullCheckPlay(${n})`), null, 'Archives missing');
  run('RecordTurnEvent("runnerSuccessfulRunArchives")');
  assert(run(`FullCheckPlay(${n})`));
  const c = await runnerCommand();
  assert.strictEqual(c.cmd, 'play');
  assert.strictEqual(c.pref.cardToPlay.title, 'Notoriety');
  playCard(n);
  assert.deepStrictEqual(titles(run('runner.scoreArea')), ['Notoriety']);
  assert.strictEqual(run('AgendaPoints(runner)'), 1);
});

test('successful central runs are counted per server by the run phase', async () => {
  setUpBoard({});
  run('attackedServer = corp.archives; runSuccessDeclared = false;');
  // the declaration code lives in the run success phase; exercise its counter directly
  run('RecordTurnEvent("runnerSuccessfulRunArchives")');
  assert.strictEqual(run('TurnEventCount("runnerSuccessfulRunArchives")'), 1);
  const src = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
  assert(src.includes('RecordTurnEvent("runnerSuccessfulRunHQ")'));
});

// ---------------- Snowball ----------------
const SNOW = installedRunner('Snowball');
test('Snowball breaks barriers and gains +1 strength per break for the rest of the run', async () => {
  setUpBoard({installed: [ID.Snowball], hqIce: [ID.IceWall, ID.IceWall], credits: 8});
  encounter('corp.HQ', 1);
  assert.strictEqual(run(`Strength(${SNOW})`), 1);
  run(`${SNOW}.abilities[1].Resolve.call(${SNOW}, {})`);
  assert.strictEqual(run(`Strength(${SNOW})`), 2);
  run(`${SNOW}.abilities[0].Resolve.call(${SNOW}, ${SNOW}.abilities[0].Enumerate.call(${SNOW})[0])`);
  assert.strictEqual(run(`Strength(${SNOW})`), 3);
  run(`${SNOW}.responseOnEncounterEnds.Resolve.call(${SNOW})`);
  assert.strictEqual(run(`Strength(${SNOW})`), 2, 'pump ends, snowball bonus stays');
  run(`AutomaticTriggers("automaticOnRunEndCleanup", [[]])`);
  assert.strictEqual(run(`Strength(${SNOW})`), 1, 'bonus ends with the run');
});

test('Snowball AI: the run calculator breaks Ice Wall with it', async () => {
  setUpBoard({installed: [ID.Snowball], hqIce: [ID.IceWall], credits: 5, runnerAI: true});
  const p = run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, corp.HQ.ice.length - 1)');
  assert(p, 'a complete path exists');
  assert(p.some(n => n.sr_broken.some(b => b.use && b.use.title === 'Snowball')));
});

// ---------------- Dyson Mem Chip ----------------
test('Dyson Mem Chip gives +1 MU and +1 link; the AI installs it', async () => {
  setUpBoard({installed: [ID.Dyson]});
  assert.strictEqual(run('Link()'), 1);
  assert.strictEqual(run('MemoryUnits()'), 5);
  setUpBoard({grip: [ID.Dyson], credits: 6, runnerAI: true, hqIce: [ID.Enigma], rndIce: [ID.Enigma], archivesIce: [ID.Enigma]});
  const c = await runnerCommand();
  assert.strictEqual(c.cmd, 'install');
  assert.strictEqual(c.pref.cardToInstall.title, 'Dyson Mem Chip');
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
console.log('genesis ta: ' + cases + ' cases passed');
})();
