// Run with: node tests/genesis-fp.test.js
// Genesis Cycle, Future Proof pack (2101-2120), exercised through the real
// engine, phases and AIs. Retrieval Run, Eli 1.0, Ronin and Project Beale are
// reprints defined in System Update 2021.
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
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027,
  IceWall: 31077, Tithe: 30073, Karuna: 30047, Offworld: 30067,
  Darwin: 2102, DLR: 2103, Faerie: 2104, MrLi: 2105, Indexing: 2106, RDI: 2107, DeepThought: 2108, NACH: 2109,
  Ruhr: 2111, Midori: 2113, TWIY: 2114, Midseason: 2116, Flare: 2117, DRT: 2118, Burke: 2119, CorpWar: 2120,
};

// Player state as Init() prepares it, then a board. Installed ice is rezzed and known.
function setUpBoard({hqIce = [], rndIce = [], archivesIce = [], rnd = [ID.HedgeFund, ID.HedgeFund], hq = [ID.HedgeFund],
  archives = [], remotes = [], stack = [ID.Diesel, ID.SureGamble], grip = [ID.SureGamble], heap = [], installed = [],
  credits = 5, corpCredits = 5, corpIdentity = ID.HB, ai = false, corpAI = false, rezIce = true} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {}; intended.addTags = 0; intended.steal = null; runSuccessDeclared = false;
    Object.assign(corp, {identityCard: null, creditPool: ${corpCredits}, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${corpIdentity}, ${JSON.stringify(archives)}, ${JSON.stringify(rnd)}, ${JSON.stringify(hq)},
      ${JSON.stringify(archivesIce)}, ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, ${JSON.stringify(remotes)}, [],
      cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, ${JSON.stringify(heap)}, ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    ${rezIce ? `corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).concat(...corp.remoteServers.map(s => s.ice))
      .forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });` : ''}
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
    ${corpAI ? 'corp.AI = new CorpAI(); corp.AI._log = function() {};' : ''}
  `);
}

// Resolve pending trigger/decision phases. `pick(choices, card, phase)` chooses
// within a decision; return undefined to take the first choice.
const STOP = '[phases.runnerActionMain, phases.runnerPostAction, phases.corpActionMain, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines, phases.runDecideContinue]';
function settle(pick = () => undefined, stopAt = STOP) {
  for (let guard = 0; guard < 120; guard++) {
    const phase = run('currentPhase');
    if (run(stopAt).includes(phase)) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    const has = cmd => options(cmd).length > 0;
    if (phase.triggerCallbackName && has('trigger')) { phase.Resolve.trigger(options('trigger')[0]); continue; }
    const cmd = ['steal', 'access', 'continue', 'n'].find(has);
    if (!cmd) throw new Error('settle stuck at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
    const choices = options(cmd);
    phase.Resolve[cmd](pick(choices, phase.context, phase, cmd) || (cmd === 'n' ? {} : choices[0]));
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title);
}
const titles = cards => Array.from(cards, card => card.title);
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, message);
const installedTitle = (zone, title) => run(`runner.rig.${zone}`).find(card => card.title === title);
// Pass through the encounter/approach windows of a run, breaking with `breakWith(phase)`.
function passRun(breakWith = () => {}) {
  for (let guard = 0; guard < 60; guard++) {
    settle();
    const phase = run('currentPhase');
    if (phase === run('phases.runnerActionMain') || phase === run('phases.runnerPostAction')) return;
    if (phase === run("phases.runEncounterIce") && run("CheckUnbrokenSubroutines()")) breakWith(phase);
    const p = run('currentPhase');
    if (p.Resolve.n) p.Resolve.n({}); else throw new Error('cannot pass ' + p.identifier);
  }
  throw new Error('run did not finish');
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { if (!process.env.ONLY || process.env.ONLY.split("|").some(o => name.includes(o))) tests.push({name, fn}); }

// ---------------- Structure ----------------
test('every Future Proof card has one definition or a DUPLICATE note, with exact local ELO', () => {
  const source = fs.readFileSync(path.join(root, 'sets/genesis.js'), 'utf8');
  const meta = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data.filter(c => c.pack_code === 'fp');
  assert.strictEqual(meta.length, 20);
  const elo = new Map(fs.readFileSync(path.join(root, 'data/elo.csv'), 'utf8').split(/\r?\n/).slice(1).filter(Boolean)
    .map(line => /^(\d+),"((?:[^"]|"")*)",(\d+),/.exec(line)).filter(Boolean).map(m => [m[2].replace(/""/g, '"'), +m[3]]));
  const dupes = [2101, 2110, 2112, 2115];
  for (const m of meta.filter(m => Number(m.code) < 2111)) {
    const id = Number(m.code);
    if (dupes.includes(id)) {
      assert(new RegExp('^// cardSet\\[' + id + '\\] = .* - DUPLICATE', 'm').test(source), id + ' duplicate note');
      assert(!run(`cardSet[${id}]`), id + ' not redefined');
      continue;
    }
    const card = run(`cardSet[${id}]`);
    assert(card && card.title === m.title, id + ' title');
    assert.strictEqual(card.elo, elo.get(m.title), id + ' ELO matches the Trash-or-Busto snapshot');
  }
  const region = source.slice(source.indexOf("// cardSet[2101]"), source.indexOf("//Ruhr Valley (2111)"));
  assert(!/TODO/.test(region), 'no unfinished markers in the Future Proof region');
});

// ---------------- Darwin ----------------
test('Darwin: strength is its virus counters; 2[c] breaks any subroutine; turn-begin counter is optional', () => {
  setUpBoard({installed: [ID.Darwin], hqIce: [ID.IceWall], credits: 5});
  const darwin = installedTitle('programs', 'Darwin');
  assert.strictEqual(run('Strength')(darwin), 0);
  run('AddCounters')(darwin, 'virus', 2);
  assert.strictEqual(run('Strength')(darwin), 2);
  // human: offered pay or decline; paying places a counter
  const turnBegin = darwin.responseOnRunnerTurnBegins;
  const offered = turnBegin.Enumerate.call(darwin);
  same(offered.map(o => o.use), [true, false]);
  turnBegin.Resolve.call(darwin, offered[1]);
  assert.strictEqual(run('Counters')(darwin, 'virus'), 2, 'decline keeps counters');
  turnBegin.Resolve.call(darwin, offered[0]); settle();
  assert.strictEqual(run('Counters')(darwin, 'virus'), 3);
  assert.strictEqual(run('runner.creditPool'), 4);
  // break Ice Wall (strength 1) during a real encounter for 2[c]
  run('MakeRun(corp.HQ)');
  passRun(() => {
    const ab = darwin.abilities[0];
    const choices = ab.Enumerate.call(darwin);
    assert(choices.length > 0, 'can break at equal-or-greater strength');
    ab.Resolve.call(darwin, choices[0]); settle();
  });
  assert.strictEqual(run('runner.creditPool'), 2, 'break cost 2');
  run('runner.creditPool = 0');
  assert.strictEqual(turnBegin.Enumerate.call(darwin).length, 0, 'cannot pay with no credits');
});

test('Darwin: Runner AI grows counters and the run calculator needs enough counters', () => {
  setUpBoard({installed: [ID.Darwin], hqIce: [ID.Karuna], credits: 8, ai: true});
  const darwin = installedTitle('programs', 'Darwin');
  same(darwin.responseOnRunnerTurnBegins.Enumerate.call(darwin), [{use: true}], 'AI buys a counter towards Karunā strength 3');
  assert.strictEqual(run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)'), null, 'strength 0 cannot break strength 3');
  run('AddCounters')(darwin, 'virus', 3);
  assert.notStrictEqual(run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)'), null, 'strength 3 breaks for 2[c] per subroutine');
  same(darwin.responseOnRunnerTurnBegins.Enumerate.call(darwin), [], 'no more counters needed');
});

// ---------------- Data Leak Reversal ----------------
test('Data Leak Reversal: install only after a successful central run; mills only while tagged', () => {
  setUpBoard({grip: [ID.DLR], rnd: [ID.HedgeFund, ID.HedgeFund, ID.HedgeFund], credits: 5});
  const dlr = run('runner.grip[0]');
  assert(!run('CheckInstall')(dlr), 'no successful central run yet');
  assert.strictEqual(run('ChoicesHandInstall(runner)').length, 0);
  run('MakeRun(corp.archives)'); passRun();
  assert(run('CheckInstall')(dlr), 'installable after successful Archives run');
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert(installedTitle('resources', 'Data Leak Reversal'));
  const ab = dlr.abilities[0];
  assert.strictEqual(ab.Enumerate.call(dlr).length, 0, 'untagged: no ability');
  run('runner.tags = 1; currentPhase = phases.runnerActionMain');
  assert.strictEqual(ab.Enumerate.call(dlr).length, 1);
  const clicks = run('runner.clickTracker');
  ab.Resolve.call(dlr); settle();
  assert.strictEqual(run('corp.RnD.cards.length'), 2, 'top card trashed');
  assert.strictEqual(run('corp.archives.cards.length'), 1);
  assert.strictEqual(run('runner.clickTracker'), clicks - 1);
  dlr.responseOnCorpTurnBegins.Resolve.call(dlr);
  assert.strictEqual(dlr.madeSuccessfulCentralRunThisTurn, false, 'condition resets each turn');
});

test('Data Leak Reversal: Runner AI mills with its last click while tagged', async () => {
  setUpBoard({installed: [ID.DLR], rnd: [ID.HedgeFund, ID.HedgeFund, ID.HedgeFund], credits: 0, ai: true});
  const dlr = installedTitle('resources', 'Data Leak Reversal');
  run('runner.tags = 1; runner.clickTracker = 1');
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions).filter(k => phaseOptions[k].length)');
  const idx = await run('runner.AI').CommandChoice(optionList);
  assert.strictEqual(optionList[idx], 'trigger');
  assert.strictEqual(run('runner.AI.preferred.cardToTrigger'), dlr);
  run('runner.tags = 0');
  assert(!dlr.AITriggerInPaidWindow(), 'not without tags');
});

// ---------------- Faerie ----------------
test('Faerie: breaks a sentry for free, then is trashed when that encounter ends', () => {
  setUpBoard({installed: [ID.Faerie], hqIce: [ID.Karuna], credits: 3});
  const faerie = installedTitle('programs', 'Faerie');
  run('MakeRun(corp.HQ)');
  passRun(() => {
    const [breakAb, pump] = faerie.abilities;
    assert.strictEqual(breakAb.Enumerate.call(faerie).length, 0, 'strength 2 < 3');
    pump.Resolve.call(faerie); settle();
    for (let i = 0; i < 2; i++) { const ch = breakAb.Enumerate.call(faerie); breakAb.Resolve.call(faerie, ch[0]); settle(); }
  });
  assert.strictEqual(run('runner.creditPool'), 2, 'only the pump cost a credit');
  assert(!installedTitle('programs', 'Faerie'), 'trashed after the encounter');
  assert(titles(run('runner.heap')).includes('Faerie'));
});

test('Faerie: unused, it survives; the run calculator uses it on only one ice per run', () => {
  setUpBoard({installed: [ID.Faerie], hqIce: [ID.IceWall], credits: 3});
  run('MakeRun(corp.HQ)'); passRun();
  assert(installedTitle('programs', 'Faerie'), 'not used, not trashed');
  setUpBoard({installed: [ID.Faerie], hqIce: [ID.Tithe], credits: 0, ai: true});
  assert.notStrictEqual(run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)'), null, 'one sentry: free break');
  setUpBoard({installed: [ID.Faerie], hqIce: [ID.Tithe, ID.Tithe], credits: 0, ai: true});
  const path = run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)');
  const faerie = installedTitle('programs', 'Faerie');
  const brokenIce = path ? new Set(path.filter(p => p.sr_broken.some(sr => sr.use === faerie)).map(p => p.iceIdx)) : new Set();
  assert(brokenIce.size <= 1, 'Faerie breaks on at most one ice in a planned run');
});

// ---------------- Mr. Li ----------------
test('Mr. Li: draws 2 and puts a chosen drawn card on the bottom of the stack', () => {
  setUpBoard({installed: [ID.MrLi], stack: [ID.HedgeFund, ID.Diesel, ID.SureGamble], grip: [ID.SureGamble]});
  const li = installedTitle('resources', 'Mr. Li');
  li.abilities[0].Resolve.call(li);
  settle((choices, card) => card === li ? choices.find(c => c.card && c.card.title === 'Diesel') : undefined);
  same(titles(run('runner.grip')), ['Sure Gamble', 'Sure Gamble']);
  assert.strictEqual(run('runner.stack[0].title'), 'Diesel', 'bottom of stack');
  assert.strictEqual(run('runner.clickTracker'), 3);
});

test('Mr. Li: AI bottoms the lower-value drawn card and only triggers with 2+ stack cards', () => {
  setUpBoard({installed: [ID.MrLi], stack: [ID.HedgeFund, ID.Diesel, ID.Karuna], grip: [ID.SureGamble], ai: true});
  const li = installedTitle('resources', 'Mr. Li');
  run('cardSet[30047].elo = cardSet[30047].elo');
  li.abilities[0].Resolve.call(li);
  const decision = run('currentPhase');
  const choices = decision.Enumerate.continue ? decision.Enumerate.continue() : [];
  assert.strictEqual(choices.length, 1, 'AI decision has a single choice');
  const expected = ['Karunā', 'Diesel'].sort((a, b) => run(`runner.grip.find(c => c.title == ${JSON.stringify(a)}).elo`) -
    run(`runner.grip.find(c => c.title == ${JSON.stringify(b)}).elo`))[0];
  assert.strictEqual(choices[0].card.title, expected);
  settle();
  assert.strictEqual(run('runner.stack[0].title'), expected);
  run('runner.stack = runner.stack.slice(0, 1)');
  assert(!li.AIWouldTrigger(), 'not with 1 card left');
});

// ---------------- Indexing ----------------
test('Indexing: replaces the breach and arranges the top 5 cards of R&D (human order)', () => {
  setUpBoard({grip: [ID.Indexing], rnd: [ID.HedgeFund, ID.IceWall, ID.Offworld, ID.Tithe, ID.Karuna, ID.Diesel]});
  const top5 = run('corp.RnD.cards.slice(1)');
  run('Play(runner.grip[0])');
  const order = ['Karunā', 'Offworld Office', 'Ice Wall', 'Tithe', 'Diesel']; // bottom to top
  let replaced = false;
  for (let guard = 0; guard < 40 && run('currentPhase') !== run('phases.runnerActionMain'); guard++) {
    settle((choices, card, phase, cmd) => {
      if (cmd === 'n' && choices.some(c => c.card && c.card.title === 'Indexing')) { replaced = true; return choices.find(c => c.card); }
      if (card && card.title === 'Indexing') return choices.find(c => c.card && c.card.title === order.find(t => choices.some(x => x.card && x.card.title === t)));
      return undefined;
    }, '[phases.runnerActionMain, phases.runApproachIce, phases.runDecideContinue]');
    const p = run('currentPhase');
    if (p !== run('phases.runnerActionMain') && p.Resolve.n) p.Resolve.n({});
  }
  assert(replaced, 'replacement offered and chosen');
  same(titles(run('corp.RnD.cards.slice(1)')), order, 'arranged as chosen');
  assert.strictEqual(run('corp.RnD.cards[0].title'), 'Hedge Fund', 'sixth card untouched');
  assert(top5.every(card => card.knownToRunner), 'Runner looked at the five cards');
  assert.strictEqual(run('runner.scoreArea.length'), 0, 'no access');
});

test('Indexing: AI puts agendas on top and only replaces the breach with a click left', () => {
  setUpBoard({grip: [ID.Indexing], rnd: [ID.HedgeFund, ID.Offworld, ID.Tithe], ai: true});
  const indexing = run('runner.grip[0]');
  indexing.runWasSuccessful = true;
  run('attackedServer = corp.RnD; runner.clickTracker = 1');
  same(indexing.specialOnInsteadOfBreaching.Enumerate.call(indexing).length, 1);
  indexing.specialOnInsteadOfBreaching.Resolve.call(indexing);
  assert.strictEqual(run('corp.RnD.cards[corp.RnD.cards.length - 1].title'), 'Offworld Office', 'agenda on top');
  run('runner.clickTracker = 0');
  assert.strictEqual(indexing.specialOnInsteadOfBreaching.Enumerate.call(indexing).length, 0, 'no click left: breach instead');
  run('runner.clickTracker = 3; attackedServer = null');
  assert(indexing.AIRunEventExtraPotential(run('corp.RnD'), 1) > 0, 'worth playing on R&D with clicks to return');
  assert.strictEqual(indexing.AIRunEventExtraPotential(run('corp.HQ'), 1), 0);
});

// ---------------- R&D Interface ----------------
test('R&D Interface: R&D breaches access 1 additional card', () => {
  setUpBoard({installed: [ID.RDI], rnd: [ID.HedgeFund, ID.Offworld, ID.Offworld], credits: 5});
  const rdi = installedTitle('hardware', 'R&D Interface');
  run('MakeRun(corp.RnD)'); passRun();
  assert.strictEqual(run('runner.scoreArea.length'), 2, 'both top agendas accessed and stolen');
  run('attackedServer = corp.HQ');
  assert.strictEqual(rdi.modifyBreachAccess.Resolve.call(rdi), 0, 'HQ unaffected');
  run('attackedServer = null');
  same(rdi.AICentralPressure(run('corp.RnD')), {additionalAccess: 1});
});

// ---------------- Deep Thought ----------------
test('Deep Thought: counter per successful R&D run; at 3 it looks at the top card each turn', () => {
  setUpBoard({installed: [ID.DeepThought], rnd: [ID.HedgeFund, ID.HedgeFund, ID.HedgeFund, ID.HedgeFund]});
  const dt = installedTitle('programs', 'Deep Thought');
  run('MakeRun(corp.archives)'); passRun();
  assert.strictEqual(run('Counters')(dt, 'virus'), 0, 'Archives does not count');
  for (let i = 0; i < 3; i++) { run('MakeRun(corp.RnD)'); passRun(); }
  assert.strictEqual(run('Counters')(dt, 'virus'), 3);
  run('corp.RnD.cards.forEach(c => c.knownToRunner = false)');
  const offered = dt.responseOnRunnerTurnBegins.Enumerate.call(dt);
  same(offered.map(o => o.use), [true, false]);
  dt.responseOnRunnerTurnBegins.Resolve.call(dt, offered[0]);
  assert(run('corp.RnD.cards[corp.RnD.cards.length - 1].knownToRunner'), 'top card known');
  run('RemoveCounters')(dt, 'virus', 1);
  same(dt.responseOnRunnerTurnBegins.Enumerate.call(dt), [], 'not below 3 counters');
});

// ---------------- New Angeles City Hall ----------------
test('New Angeles City Hall: pays 2[c] per prevented tag; trashed when an agenda is stolen', () => {
  setUpBoard({installed: [ID.NACH], rnd: [ID.HedgeFund, ID.Offworld], credits: 5});
  const nach = installedTitle('resources', 'New Angeles City Hall');
  run('AddTags(3)');
  settle((choices, card) => card === nach ? choices.find(c => c.prevent === 2) : undefined);
  assert.strictEqual(run('runner.tags'), 1);
  assert.strictEqual(run('runner.creditPool'), 1);
  run('AddTags(1)'); settle();
  assert.strictEqual(run('runner.tags'), 2, 'cannot afford: tag taken');
  run('MakeRun(corp.RnD)'); passRun();
  assert.strictEqual(run('runner.scoreArea.length'), 1);
  assert(!installedTitle('resources', 'New Angeles City Hall'), 'trashed on steal');
});

test('New Angeles City Hall: Runner AI prevents every affordable tag', () => {
  setUpBoard({installed: [ID.NACH], credits: 5, ai: true});
  const nach = installedTitle('resources', 'New Angeles City Hall');
  run('intended.addTags = 3');
  same(nach.responsePreventableAddTags.Enumerate.call(nach), [{prevent: 2}]);
  run('intended.addTags = 0');
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
console.log('genesis fp: ' + cases + ' cases passed');
})();
