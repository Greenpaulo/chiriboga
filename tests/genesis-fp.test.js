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
    previousTurnEventCounts = {}; previousTurnEventPlayer = null; turnEventCounts = {}; turnEventCards = {}; accessedCards = {root: [], cards: []}; intended.addTags = 0; intended.steal = null; runSuccessDeclared = false;
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
    if (run(stopAt).includes(phase) || (phase.identifier === 'Corp 2.2' && phase.title === "Corporation's Action Phase")) return;
    if (phase.PreEnumerate) { phase.PreEnumerate(); phase.preEnumerated = true; }
    if (phase !== run('currentPhase')) continue;
    if (phase.title === "Corporation's Action Phase" && phase.identifier.startsWith("Corp 2.2")) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    const has = cmd => options(cmd).length > 0;
    if (phase.triggerCallbackName && has('trigger')) { phase.Resolve.trigger(options('trigger')[0]); continue; }
    const cmd = ['steal', 'access', 'continue', 'trace', 'trash', 'n'].find(cmd => (cmd !== 'trash' || phase !== run('phases.runAccessingCard')) && has(cmd));
    if (!cmd) throw new Error('settle stuck at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
    const choices = options(cmd);
    const picked = pick(choices, phase.context, phase, cmd) || (cmd === 'n' ? {} : choices[0]);
    phase.Resolve[cmd](picked);
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
  for (const m of meta) {
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
  const region = source.slice(source.indexOf("// cardSet[2101]"), source.length);
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
  run('ChangePhase(phases.corpStartDraw)');
  assert.strictEqual(dlr.installOnlyIf.call(dlr), false, 'condition resets each turn');
});

test('Data Leak Reversal: Runner AI mills with its last click while tagged', async () => {
  setUpBoard({installed: [ID.DLR], rnd: [ID.HedgeFund, ID.HedgeFund, ID.HedgeFund], credits: 0, ai: true});
  const dlr = installedTitle('resources', 'Data Leak Reversal');
  run('runner.tags = 1; runner.clickTracker = 1');
  run('EnumeratePhase();');
  const optionList = run('Object.keys(phaseOptions).filter(k => phaseOptions[k].length > 0).filter(k => phaseOptions[k].length)');
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

test('Faerie: ending a run in the encounter paid window still trashes a used Faerie', () => {
  setUpBoard({installed: [ID.Faerie], hqIce: [ID.Tithe], grip: Array(4).fill(ID.SureGamble)});
  const faerie = installedTitle('programs', 'Faerie');
  run('MakeRun(corp.HQ)'); settle();
  run('phases.runApproachIce.Resolve.n({}); phases.runApproachIce.Resolve.n({})'); settle();
  assert.strictEqual(run('currentPhase'), run('phases.runEncounterIce'));
  const choice = faerie.abilities[0].Enumerate.call(faerie)[0];
  assert(choice);
  faerie.abilities[0].Resolve.call(faerie, choice);
  run('EndTheRun()'); settle();
  assert(!installedTitle('programs', 'Faerie'), 'encounter ended with run');
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
  setUpBoard({installed: [ID.RDI], rnd: [ID.Offworld, ID.Offworld, ID.Offworld], credits: 5});
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
  settle();
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

// Shared decision driver uses real AIs for card choices and trace bids.
async function settleAI(pick = choices => choices[0]) {
  for (let guard = 0; guard < 120; guard++) {
    const phase = run('currentPhase');
    if (run(STOP).includes(phase) || (phase.identifier === 'Corp 2.2' && phase.title === "Corporation's Action Phase")) return;
    if (phase.PreEnumerate) { phase.PreEnumerate(); phase.preEnumerated = true; }
    if (phase !== run('currentPhase')) continue;
    if (phase.title === "Corporation's Action Phase" && phase.identifier.startsWith("Corp 2.2")) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName && options('trigger').length) { phase.Resolve.trigger(options('trigger')[0]); continue; }
    const cmd = ['steal', 'access', 'continue', 'trace', 'trash', 'n'].find(k => (k !== 'trash' || phase !== run('phases.runAccessingCard')) && options(k).length);
    if (!cmd) throw new Error('AI driver stuck: ' + phase.title);
    const opts = options(cmd), ai = phase.player && phase.player.AI;
    let choice = pick(opts, phase.context, phase);
    if (ai && ['continue', 'trace', 'trash'].includes(cmd)) {
      run(`executingCommand = '${cmd}'`);
      choice = opts[await ai.SelectChoice(opts)];
      run('executingCommand = ""');
    }
    phase.Resolve[cmd](choice || opts[0]);
  }
  throw new Error('AI driver exceeded limit');
}
async function command(side) {
  run(side + '.AI.preferred = null; executingCommand = ""');
  run('EnumeratePhase()');
  const options = run('Object.keys(phaseOptions).filter(k => phaseOptions[k].length > 0)');
  const idx = await run(side + '.AI').CommandChoice(options);
  const pref = run(side + '.AI.preferred') || {};
  return {cmd: options[idx], pref};
}
function corpTurn() { run('playerTurn = corp; activePlayer = corp; corp.clickTracker = 3; currentPhase = phases.corpActionMain'); }
function rootCard(title) { return run('InstalledCards(corp)').find(c => c.title === title); }
function rezRoots() { run('[corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers).forEach(s => s.root.forEach(c => c.rezzed = true))'); }

// ---------------- Runner verification ----------------
test('Runner uniqueness and Data Leak Reversal use current public turn history, including a late draw', () => {
  setUpBoard();
  assert.strictEqual(run('cardSet[2105].unique'), true);
  assert.strictEqual(run('cardSet[2109].unique'), true);
  run('MakeRun(corp.archives)'); passRun();
  run('InstanceCardsPush(2103, runner.grip, 1, null, null, strengthTextures)');
  const dlr = run('runner.grip[runner.grip.length - 1]');
  assert(run('CheckInstall')(dlr), 'a card drawn after the run can be installed');
  run('ChangePhase(phases.corpStartDraw)');
  assert(!run('CheckInstall')(dlr), 'last turn does not qualify');
});

test('Mr. Li: real draw selector triggers him and installs him when draw is needed', async () => {
  setUpBoard({installed: [ID.MrLi], grip: [], stack: Array(8).fill(ID.Diesel), ai: true,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 0});
  const choice = await command('runner');
  assert.strictEqual(choice.cmd, 'trigger');
  assert.strictEqual(choice.pref.cardToTrigger.title, 'Mr. Li');
  setUpBoard({grip: [ID.MrLi], stack: Array(8).fill(ID.Diesel), ai: true,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 6});
  const install = await command('runner');
  assert.strictEqual(install.cmd, 'install');
  assert.strictEqual(install.pref.cardToInstall.title, 'Mr. Li');
});

test('R&D Interface and Deep Thought: real run-preparation selector installs each for R&D', async () => {
  for (const id of [ID.RDI, ID.DeepThought]) {
    setUpBoard({grip: [id], rnd: Array(8).fill(ID.HedgeFund), ai: true, credits: 9,
      hqIce: [ID.IceWall], archivesIce: [ID.IceWall]});
    const choice = await command('runner');
    assert.strictEqual(choice.cmd, 'install', id + ' install before R&D');
    assert.strictEqual(choice.pref.cardToInstall.setNumber, id);
  }
});

test('Indexing: real run-event selector plays it on R&D with a follow-up click', async () => {
  setUpBoard({grip: [ID.Indexing], rnd: Array(8).fill(ID.HedgeFund), ai: true,
    hqIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 0});
  const choice = await command('runner');
  assert.strictEqual(choice.cmd, 'play');
  assert.strictEqual(choice.pref.cardToPlay.title, 'Indexing');
  run('runner.clickTracker = 1');
  assert.strictEqual(run('runner.grip[0].AIRunEventExtraPotential(corp.RnD, 1)'), 0);
});

test('New Angeles City Hall: real prevention response spends affordable credits; planner prices tags', async () => {
  setUpBoard({installed: [ID.NACH], ai: true, credits: 5});
  run('AddTags(3)'); await settleAI();
  assert.strictEqual(run('runner.creditPool'), 1);
  assert.strictEqual(run('runner.tags'), 1);
  // A finite payment, never free immunity to arbitrary tags.
  setUpBoard({installed: [ID.NACH], ai: true, credits: 5});
  run('var calc = runner.AI.rc; calc._tagPreventionCost = 2; calc.baseClicks = 4; calc.basePoolCredits = 5; calc.baseOtherCredits = 0; var point = calc.EmptyPoint(1); var tagged = calc.ValidateEncounterPoint(0, point, false, ["tag", "tag", "tag"], []);');
  assert.strictEqual(run('tagged.runner_credits_spent'), 4);
  assert.strictEqual(run('calc.TotalEffect(tagged).tag'), 1);
  run('var alternatives = calc.ValidateEncounterPoints(0, point, false, ["tag", "payCredits", "payCredits", "payCredits", "payCredits"], [])');
  assert(run('alternatives.some(p => calc.TotalEffect(p).tag == 1 && p.runner_credits_spent == 4)'),
    'taking the tag preserves credits for the following payment');
  assert(!run('alternatives.some(p => !calc.TotalEffect(p).tag)'), 'cannot afford prevention and payment');
});

test('New Angeles City Hall and Data Leak Reversal: real selector installs protection and legal milling engine', async () => {
  for (const id of [ID.NACH, ID.DLR]) {
    setUpBoard({grip: [id], stack: [], hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall],
      credits: 13, ai: true});
    run('RecordTurnEvent("runnerSuccessfulRunArchives")');
    const choice = await command('runner');
    assert.strictEqual(choice.cmd, 'install', id + ' installed via keep-card selector');
    assert.strictEqual(choice.pref.cardToInstall.setNumber, id);
  }
});

// ---------------- Ruhr Valley ----------------
test('Ruhr Valley: run action and run events pay one extra click; planner includes it', () => {
  setUpBoard({rndIce: [ID.Ruhr], ai: true, grip: [ID.Indexing]}); rezRoots();
  assert.strictEqual(run('AdditionalRunCosts(corp.RnD).clicks'), 1);
  run('runner.clickTracker = 1');
  assert(!run('phases.runnerActionMain.Enumerate.run().some(c => c.server == corp.RnD)'));
  assert(!run('FullCheckPlay(runner.grip[0])'), 'cannot pay click to play plus run tax');
  run('runner.clickTracker = 4');
  const path = run('runner.AI._calculateBestCompleteRun(corp.RnD, 0, 0, 0, 0)');
  assert(path && path[path.length - 1].runner_clicks_spent >= 1);
  run('phases.runnerActionMain.Resolve.run({server: corp.RnD})'); passRun();
  assert.strictEqual(run('runner.clickTracker'), 2, 'action click plus Ruhr click');
  run('corp.RnD.root[0].rezzed = false');
  assert.strictEqual(run('AdditionalRunCosts(corp.RnD).clicks'), 0);
});

test('Ruhr Valley: Corp AI selects a legal scoring upgrade install and rez', async () => {
  setUpBoard({hq: [ID.Ruhr], remotes: [[ID.IceWall]], corpAI: true, corpCredits: 12}); corpTurn();
  const choice = await command('corp');
  assert.strictEqual(choice.cmd, 'install');
  assert.strictEqual(choice.pref.cardToInstall.title, 'Ruhr Valley');
  setUpBoard({remotes: [[ID.Ruhr, ID.IceWall]], corpAI: true, corpCredits: 6}); corpTurn();
  run('currentPhase = phases.corpPostAction');
  const rez = await command('corp');
  assert.strictEqual(rez.cmd, 'rez');
  assert.strictEqual(rez.pref.cardToRez.title, 'Ruhr Valley');
});

// ---------------- Midori ----------------
test('Midori: swap is once per run, returns old ice unrezzed and trashes hosted cards; may jack out', () => {
  setUpBoard({hqIce: [ID.Midori, ID.IceWall], hq: [ID.Karuna]}); rezRoots();
  run('InstanceCardsPush(2104, corp.HQ.ice[0].hostedCards = [], 1, null, null, strengthTextures); corp.HQ.ice[0].hostedCards[0].host = corp.HQ.ice[0]');
  const midori = rootCard('Midori'), old = run('corp.HQ.ice[0]'), replacement = run('corp.HQ.cards[0]');
  run('MakeRun(corp.HQ)');
  settle((choices, card) => card === midori ? choices.find(c => c.card === replacement) : choices.find(c => c.jack === false));
  assert.strictEqual(run('corp.HQ.ice[0]'), replacement);
  assert.strictEqual(replacement.rezzed, false);
  assert(run('corp.HQ.cards').includes(old));
  assert.strictEqual(old.rezzed, false);
  assert(titles(run('runner.heap')).includes('Faerie'), 'hosted program trashed');
  assert(midori.usedThisRun);
  same(midori.responseOnApproachIce.Enumerate.call(midori), []);
  run('JackOut()'); settle();
  assert.strictEqual(midori.usedThisRun, false);
  run('MakeRun(corp.HQ)');
  settle((choices, card) => card === midori && choices.some(c => c.card) ? choices.find(c => c.card) : choices.find(c => c.jack === true));
  assert.strictEqual(run('attackedServer'), null, 'jack-out choice ends run');
});

test('Midori: Corp AI swaps for affordable stronger ice, declines weak/no-target choices', async () => {
  setUpBoard({hqIce: [ID.Midori, ID.IceWall], hq: [ID.Karuna], corpAI: true, corpCredits: 8}); rezRoots();
  run('MakeRun(corp.HQ)'); await settleAI();
  assert.strictEqual(run('corp.HQ.ice[0].title'), 'Karunā');
  assert.strictEqual(run('corp.HQ.ice[0].rezzed'), false);
  run('JackOut()'); settle();
  setUpBoard({hqIce: [ID.Midori, ID.Karuna], hq: [ID.IceWall], corpAI: true}); rezRoots();
  run('MakeRun(corp.HQ)'); await settleAI();
  assert.strictEqual(run('corp.HQ.ice[0].title'), 'Karunā');
});

test('Midori: Corp AI installs it in an iced scoring remote and rezzes before a run', async () => {
  setUpBoard({hq: [ID.Midori, ID.Karuna], remotes: [[ID.Offworld, ID.IceWall]], hqIce: [ID.IceWall], rndIce: [ID.IceWall],
    archivesIce: [ID.IceWall], corpAI: true, corpCredits: 12}); corpTurn();
  const choices = run('corp.AI._upgradeInstallPreferences(undefined, corp.HQ.cards)');
  assert(choices.some(c => c.cardToInstall.title === 'Midori' && c.serverToInstallTo === run('corp.remoteServers[0]')),
    'normal upgrade consumer admits a useful legal install');
  setUpBoard({hq: [ID.Karuna], remotes: [[ID.Midori, ID.IceWall]], corpAI: true, corpCredits: 6}); corpTurn();
  run('currentPhase = phases.corpPostAction');
  const choice = await command('corp');
  assert.strictEqual(choice.cmd, 'rez');
  assert.strictEqual(choice.pref.cardToRez.title, 'Midori');
});

// ---------------- The World is Yours ----------------
test('The World is Yours: Corp has six-card hand; Runner hand and discard selector remain correct', async () => {
  setUpBoard({corpIdentity: ID.TWIY, hq: Array(7).fill(ID.HedgeFund), corpAI: true}); corpTurn();
  assert.strictEqual(run('MaxHandSize(corp)'), 6);
  assert.strictEqual(run('MaxHandSize(runner)'), 5);
  run('currentPhase = phases.corpDiscardStart');
  // The real discard selector must choose an HQ card when above the new limit.
  const choices = run('ChoicesArrayCards(corp.HQ.cards)');
  run('executingCommand = "trash"');
  const idx = await run('corp.AI').SelectChoice(choices);
  assert(idx >= 0 && idx < choices.length);
});

// ---------------- Midseason Replacements ----------------
test('Midseason: requires a steal on the previous Runner turn, trace uses the final margin, expires next turn', () => {
  setUpBoard({hq: [ID.Midseason], rnd: [ID.Offworld], corpCredits: 10, credits: 3});
  const mid = run('corp.HQ.cards[0]');
  same(mid.Enumerate.call(mid), []);
  run('MakeRun(corp.RnD)'); passRun();
  same(mid.Enumerate.call(mid), [], 'not this Runner turn');
  run('ChangePhase(phases.corpStartDraw)'); corpTurn();
  assert.strictEqual(mid.Enumerate.call(mid).length, 1);
  run('phases.corpActionMain.Resolve.play({card: corp.HQ.cards.find(c => c.title == "Midseason Replacements")})');
  settle(choices => choices.find(c => c.num === 2) || choices[0]);
  assert.strictEqual(run('runner.tags'), 6, '6+2 minus 2 link bid');
  assert.strictEqual(run('corp.creditPool'), 3, 'play cost and trace boost');
  run('ChangePhase(phases.runnerStartResponse)');
  same(mid.Enumerate.call(mid), [], 'previous turn is now Corp');
});

test('Midseason: Corp AI plays only after a steal with a fundable trace and bids through the real selector', async () => {
  setUpBoard({hq: [ID.Midseason], corpCredits: 10, credits: 0, corpAI: true,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall]}); corpTurn();
  run('previousTurnEventCounts = {runnerAgendaStolen: 1}; previousTurnEventPlayer = runner');
  const choice = await command('corp');
  assert.strictEqual(choice.cmd, 'play');
  assert.strictEqual(choice.pref.cardToPlay.title, 'Midseason Replacements');
  run('phases.corpActionMain.Resolve.play({card: corp.HQ.cards[0]})'); await settleAI();
  assert.strictEqual(run('runner.tags'), 6);
  setUpBoard({hq: [ID.Midseason], corpCredits: 5, credits: 20, corpAI: true}); corpTurn();
  run('previousTurnEventCounts = {runnerAgendaStolen: 1}; previousTurnEventPlayer = runner');
  const decline = await command('corp');
  assert.notStrictEqual(decline.cmd, 'play');
});

// ---------------- Flare and Burke Bugs ----------------
test('Flare: successful trace trashes hardware then unpreventable meat damage and ETR, even with no hardware', () => {
  for (const hardware of [true, false]) {
    setUpBoard({hqIce: [ID.Flare], installed: hardware ? [ID.RDI, 2009] : [], grip: Array(4).fill(ID.SureGamble)});
    if (hardware) run('runner.rig.hardware.find(c => c.title == "Plascrete Carapace").power = 4');
    run('MakeRun(corp.HQ)'); settle();
    const flare = run('corp.HQ.ice[0]');
    flare.subroutines[0].Resolve.call(flare); settle();
    assert.strictEqual(run('runner.grip.length'), 2);
    assert.strictEqual(run('attackedServer'), null);
    if (hardware) assert(!installedTitle('hardware', 'R&D Interface'));
  }
});

test('Flare: failed trace does nothing; planner does not prevent its meat damage', () => {
  setUpBoard({hqIce: [ID.Flare], installed: [2009], grip: Array(4).fill(ID.SureGamble), credits: 6, ai: true});
  run('runner.rig.hardware[0].power = 4; var flareAI = runner.AI.rc.IceAI(corp.HQ.ice[0], 20);');
  same(run('flareAI.sr[0][0]').slice(-3), ['unpreventableMeatDamage', 'unpreventableMeatDamage', 'endTheRun']);
  assert.strictEqual(run('runner.AI.rc.TotalDamage({unpreventableMeatDamage: 2})'), 2);
  run('MakeRun(corp.HQ)'); settle();
  run('corp.HQ.ice[0].subroutines[0].Resolve.call(corp.HQ.ice[0])');
  settle((choices, card, phase) => phase.player === run('runner') ? choices.find(c => c.num === 6) : choices[0]);
  assert.strictEqual(run('runner.grip.length'), 4);
  assert(run('attackedServer'), 'failed trace does not end run');
});

test('Burke Bugs: successful trace lets Runner choose program; failed trace and no target are harmless', () => {
  setUpBoard({hqIce: [ID.Burke], installed: [ID.Darwin, ID.DeepThought], corpCredits: 3});
  const bugs = run('corp.HQ.ice[0]');
  bugs.subroutines[0].Resolve.call(bugs);
  settle((choices, card, phase) => choices.find(c => c.card && c.card.title === 'Deep Thought') ||
    (phase.player === run('corp') ? choices.find(c => c.num === 1) : choices.find(c => c.num === 0)));
  same(titles(run('runner.rig.programs')), ['Darwin']);
  bugs.subroutines[0].Resolve.call(bugs); settle();
  same(titles(run('runner.rig.programs')), ['Darwin'], 'trace 0 without a bid fails');
  run('MoveCard(runner.rig.programs[0], runner.heap)');
  bugs.subroutines[0].Resolve.call(bugs);
  settle((choices, card, phase) => phase.player === run('corp') ? choices.find(c => c.num === 1) : choices[0]);
  assert.strictEqual(run('runner.rig.programs.length'), 0);
});

test('Burke Bugs: Corp trace selector boosts and Runner selector chooses an expendable program', async () => {
  setUpBoard({hqIce: [ID.Burke], installed: [ID.Darwin, ID.DeepThought], corpCredits: 5, credits: 0, corpAI: true, ai: true});
  run('corp.HQ.ice[0].subroutines[0].Resolve.call(corp.HQ.ice[0])');
  await settleAI();
  same(titles(run('runner.rig.programs')), ['Darwin']);
  assert.strictEqual(run('corp.creditPool'), 4, 'one credit wins trace 0');
});

test('Corp AI installs Flare and Burke Bugs through its normal ICE command selector', async () => {
  for (const id of [ID.Flare, ID.Burke]) {
    setUpBoard({hq: [id], corpAI: true, corpCredits: 12}); corpTurn();
    const choice = await command('corp');
    assert.strictEqual(choice.cmd, 'install');
    assert.strictEqual(choice.pref.cardToInstall.setNumber, id);
    assert.strictEqual(choice.pref.cardToInstall.player, run('corp'));
  }
});

// ---------------- Dedicated Response Team ----------------
test('Dedicated Response Team: any successful run ending while tagged deals damage; unsuccessful, untagged and trashed do not', () => {
  for (const mode of ['tagged', 'untagged', 'unsuccessful', 'trashed']) {
    setUpBoard({remotes: [[ID.DRT]], grip: Array(5).fill(ID.SureGamble)}); rezRoots();
    run(`runner.tags = ${mode === 'untagged' ? 0 : 1}; MakeRun(corp.archives)`);
    if (mode === 'unsuccessful') { settle(); run('JackOut()'); settle(); }
    else {
      if (mode === 'trashed') { run('Trash(corp.remoteServers[0].root[0], false)'); settle(); }
      passRun();
    }
    assert.strictEqual(run('runner.grip.length'), mode === 'tagged' ? 3 : 5, mode);
  }
});

test('Dedicated Response Team: planner includes global run-end damage once and normal meat prevention', () => {
  setUpBoard({remotes: [[ID.DRT]], grip: Array(5).fill(ID.SureGamble), ai: true}); rezRoots();
  run('runner.tags = 1');
  let path = run('runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0)');
  assert(path);
  context.__endpoint = path[path.length - 1];
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).meatDamage'), 2);
  run('runner.tags = 0');
  path = run('runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0)');
  context.__endpoint = path[path.length - 1];
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).meatDamage || 0'), 0);
  setUpBoard({remotes: [[ID.DRT]], hqIce: [30054], grip: Array(6).fill(ID.SureGamble), ai: true, credits: 6}); rezRoots();
  path = run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)');
  assert(path, 'can survive Funhouse plus run-end damage');
  context.__endpoint = path[path.length - 1];
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).meatDamage'), 2, 'includes a tag acquired on the route');
});

test('Dedicated Response Team: Corp AI installs and rezzes it for tagged Runner; never installs with no tag', async () => {
  setUpBoard({hq: [ID.DRT], corpAI: true, corpCredits: 5, hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall]}); corpTurn();
  run('runner.tags = 1');
  let choice = await command('corp');
  assert.strictEqual(choice.cmd, 'install');
  assert.strictEqual(choice.pref.cardToInstall.title, 'Dedicated Response Team');
  setUpBoard({remotes: [[ID.DRT]], corpAI: true, corpCredits: 2});
  run('runner.tags = 1; MakeRun(corp.HQ)'); settle();
  run('ChangePhase(phases.runResponseBeforeApproach); activePlayer = corp');
  choice = await command('corp');
  assert.strictEqual(choice.cmd, 'rez');
  assert.strictEqual(choice.pref.cardToRez.title, 'Dedicated Response Team');
});

test('Dedicated Response Team: planner can trash it before run end or spend finite meat prevention', () => {
  setUpBoard({remotes: [[ID.DRT]], grip: Array(5).fill(ID.SureGamble), ai: true, credits: 6}); rezRoots();
  run('runner.tags = 1');
  let path = run('runner.AI._calculateBestCompleteRun(corp.remoteServers[0], 0, 0, 0, 0)');
  assert(path);
  context.__endpoint = path[path.length - 1];
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).meatDamage || 0'), 0, 'paid trash removes this source');
  assert.strictEqual(path[path.length - 1].runner_credits_spent, 3);
  setUpBoard({remotes: [[ID.DRT]], installed: [2009], grip: Array(5).fill(ID.SureGamble), ai: true}); rezRoots();
  run('runner.tags = 1; runner.rig.hardware[0].power = 4');
  path = run('runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0)');
  assert(path);
  context.__endpoint = path[path.length - 1];
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).meatDamage || 0'), 0);
  assert.strictEqual(run('runner.rig.hardware[0].power'), 4, 'planning never spends live counters');
});

test('ReproductionCode restores previous-turn history including its player and empty history', () => {
  for (const owner of ['runner', 'corp', 'null']) {
    setUpBoard({stack: [ID.SureGamble]});
    run('previousTurnEventCounts = {runnerAgendaStolen: 1}; previousTurnEventPlayer = ' + owner);
    const code = run('ReproductionCode(true)');
    run('previousTurnEventCounts = {runnerAgendaStolen: 7}; previousTurnEventPlayer = corp');
    run(code);
    assert.strictEqual(run('previousTurnEventCounts.runnerAgendaStolen'), 1);
    assert.strictEqual(run('previousTurnEventPlayer'), run(owner));
  }
  run('previousTurnEventCounts = {}; previousTurnEventPlayer = null');
  const code = run('ReproductionCode(true)');
  run('previousTurnEventCounts = {runnerAgendaStolen: 9}; previousTurnEventPlayer = runner');
  run(code);
  assert.strictEqual(run('PreviousTurnEventCount("runnerAgendaStolen", runner)'), 0);
});

test('Dedicated Response Team continuation prices successful run-end damage once', () => {
  setUpBoard({remotes: [[ID.DRT], [ID.DRT]], grip: Array(5).fill(ID.SureGamble), ai: true});
  rezRoots();
  run('runner.tags = 1; corp.remoteServers[1].root[0].AIRunExtraRuns = function() {return 1;}; corp.remoteServers[1].root[0].AIRunEndMeatDamage = function() {return 0;}');
  const paths = run('runner.AI.rc.Calculate(corp.archives, 4, 5, 0, 2, Infinity, false, null)');
  assert(paths.length > 0, 'two damage fits the actual damage limit');
  context.__endpoint = paths[paths.length - 1].at(-1);
  assert.strictEqual(run('runner.AI.rc.TotalDamage(runner.AI.rc.TotalEffect(__endpoint))'), 2);
});

test('Run search can take a tag to preserve credits for inner ICE', () => {
  setUpBoard({installed: [ID.NACH], hqIce: [ID.IceWall, ID.IceWall], credits: 5, ai: true});
  run('corp.HQ.ice[1].AIImplementIce = function(rc, result) {result.sr = [[["tag"]]]; return result;}; corp.HQ.ice[0].AIImplementIce = function(rc, result) {result.sr = [[["payCredits", "payCredits", "payCredits", "payCredits"]]]; return result;}');
  const paths = run('runner.AI.rc.Calculate(corp.HQ, 4, 5, 0, 5, Infinity, false, null)');
  assert(paths.length > 0, 'route survives by declining affordable tag prevention');
  context.__endpoint = paths[paths.length - 1].at(-1);
  assert.strictEqual(run('runner.AI.rc.TotalEffect(__endpoint).tag'), 1);
  assert.strictEqual(context.__endpoint.runner_credits_spent, 4);
});

// ---------------- Corporate War ----------------
test('Corporate War: scores for +7 with 7 credits, otherwise loses only pool; stolen has no effect', () => {
  for (const credits of [6, 7]) {
    setUpBoard({remotes: [[ID.CorpWar]], corpCredits: credits}); corpTurn();
    run('corp.remoteServers[0].root[0].advancement = 4; Score(corp.remoteServers[0].root[0])'); settle();
    assert.strictEqual(run('corp.creditPool'), credits === 7 ? 14 : 0);
    assert.strictEqual(run('corp.scoreArea.length'), 1);
  }
  setUpBoard({rnd: [ID.CorpWar], corpCredits: 9}); run('MakeRun(corp.RnD)'); passRun();
  assert.strictEqual(run('corp.creditPool'), 9);
});

test('Corporate War: real scoring consumer waits for 7 credits, but takes the winning score immediately', async () => {
  setUpBoard({remotes: [[ID.CorpWar]], corpCredits: 6, corpAI: true}); corpTurn();
  run('corp.remoteServers[0].root[0].advancement = 4; currentPhase = phases.corpPostAction');
  let choice = await command('corp');
  assert.notStrictEqual(choice.cmd, 'score');
  run('corp.creditPool = 7'); choice = await command('corp');
  assert.strictEqual(choice.cmd, 'score');
  run('corp.creditPool = 6; InstanceCardsPush(30067, corp.scoreArea, 3, null, null, strengthTextures)');
  choice = await command('corp');
  assert.strictEqual(choice.cmd, 'score', 'game-winning score overrides economy guard');
  run('corp.creditPool = 3; corp.scoreArea.pop(); InstanceCardsPush(30067, corp.remoteServers[0].root, 1, null, null, strengthTextures); corp.remoteServers[0].root[1].advancement = 4; corp.remoteServers[0].root[1].agendaPoints = 3');
  choice = await command('corp');
  assert.strictEqual(choice.cmd, 'score', 'later winning agenda overrides first agenda veto');
  assert.strictEqual(choice.pref.cardToScore, run('corp.remoteServers[0].root[1]'));
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
