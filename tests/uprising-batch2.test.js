// Run with: node tests/uprising-batch2.test.js
// Uprising batch 2 (26070–26073): Keiko, Odore, Mystic Maemi and Paladin Poemu,
// exercised through the real engine, payment path, run calculator and Runner AI.
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
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Wildcat: 30002, Creative: 30020,
  Cookbook: 30009, IceCarver: 31009, Xanadu: 31012, Smartware: 30033, ProContacts: 31036,
  Rototurret: 31046, Tithe: 30073, IceWall: 31077, Mimic: 31008, T400: 30031, Docklands: 30013,
  Keiko: 26070, Odore: 26071, Maemi: 26072, Poemu: 26073,
};

function setUpBoard({hqIce = [], rndIce = [], archivesIce = [], stack = [], grip = [], installed = [], credits = 5, ai = false} = {}) {
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
    RunnerTestField(${ID.Tao}, [], ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {}; runner.AI.rc._log = function() {};' : ''}
  `);
}

// Resolve pending triggers and decisions; `pick(choices, card)` chooses within a decision.
const restingPhases = () => run('[phases.runnerActionMain, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]');
function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 50; guard++) {
    const phase = run('currentPhase');
    if (restingPhases().includes(phase)) return;
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
const byTitle = (cards, title) => Array.from(cards).find(card => card.title === title);
const install = title => { run(`Install(runner.grip.find(function (c) { return c.title == ${JSON.stringify(title)}; }), null, false, null, true)`); settle(); };
// The pending decision (a DecisionPhase) and its choices, if any.
const decision = () => {
  const phase = run('currentPhase');
  return phase.Enumerate && typeof phase.Enumerate.continue === 'function' ? {phase, choices: phase.Enumerate.continue()} : null;
};
// Start an encounter with HQ's outermost ice through the real run phases.
function encounterHQ() {
  run('MakeRun(corp.HQ)'); settle();
  for (let guard = 0; guard < 5 && run('currentPhase') !== run('phases.runEncounterIce'); guard++) {
    run('currentPhase').Resolve.n({}); settle();
  }
  assert.strictEqual(run('currentPhase'), run('phases.runEncounterIce'), 'encountering');
}

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Keiko ----------------
test('Keiko: +2 MU and its own install is the first companion install', () => {
  setUpBoard({grip: [ID.Keiko, ID.Poemu], credits: 5});
  install('Keiko');
  assert.strictEqual(run('MemoryUnits(runner)'), 6, '+2 MU');
  assert.strictEqual(run('runner.creditPool'), 3, '5 - 3 install + 1 Keiko');
  install('Paladin Poemu');
  assert.strictEqual(run('runner.creditPool'), 2, 'second companion event this turn: no gain');
});

test('Keiko: an earlier companion install this turn uses up the trigger', () => {
  setUpBoard({grip: [ID.Poemu, ID.Keiko], credits: 5});
  install('Paladin Poemu');
  install('Keiko');
  assert.strictEqual(run('runner.creditPool'), 1, 'no gain: Keiko was not the first companion event');
});

test('Keiko: first spend from a companion each turn gains 1; non-companion events do not', () => {
  setUpBoard({installed: [ID.Keiko, ID.Poemu], grip: [ID.Cookbook, ID.Xanadu], credits: 0});
  run('turnEventCounts = {};');
  const poemu = byTitle(run('runner.rig.resources'), 'Paladin Poemu');
  poemu.credits = 2;
  run('runner.creditPool = 0;');
  install('Cookbook');
  assert.strictEqual(poemu.credits, 1, 'Cookbook paid from Poemu');
  assert.strictEqual(run('runner.creditPool'), 1, 'Keiko gained 1 after the payment');
  run('runner.creditPool = 2;');
  install('Xanadu');
  assert.strictEqual(run('runner.creditPool'), 0, 'pool + Poemu pay Xanadu; second companion spend: no gain');
  assert.strictEqual(poemu.credits, 0);
  assert.strictEqual(run('TurnEventCount("runnerCompanionUse")'), 2);
});

test('Keiko: pool-only payments and non-companion installs do not trigger', () => {
  setUpBoard({installed: [ID.Keiko], grip: [ID.Cookbook], credits: 3});
  run('turnEventCounts = {};');
  install('Cookbook');
  assert.strictEqual(run('runner.creditPool'), 2, 'paid 1, no gain');
  assert.strictEqual(run('TurnEventCount("runnerCompanionUse")'), 0);
});

test('Keiko AI: limit-one console and companion-aware economy priority', () => {
  setUpBoard({grip: [ID.Keiko, ID.Poemu], installed: [], credits: 5, ai: true});
  const keiko = byTitle(run('runner.grip'), 'Keiko');
  assert.strictEqual(keiko.AIWastefulToInstall(), false);
  assert.strictEqual(keiko.AIEconomyInstall(), 2, 'companion in grip');
  assert.strictEqual(run('runner.AI._cardsWorthKeeping(runner.grip).some(function (c) { return c.title == "Keiko"; })'), true);
  setUpBoard({grip: [ID.Keiko], installed: [ID.Keiko], credits: 5, ai: true});
  const second = run('runner.grip[0]');
  assert.strictEqual(second.AIWastefulToInstall(), true, 'a console is already installed');
  assert.strictEqual(second.AIEconomyInstall(), 0);
});

test('Runner AI installs Keiko through the real command selector', async () => {
  const choose = async installed => {
    setUpBoard({grip: [ID.Keiko, ID.Poemu], installed, stack: [ID.SureGamble, ID.Creative, ID.Wildcat],
      hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits: 8, ai: true});
    run('EnumeratePhase();');
    const optionList = run('Object.keys(phaseOptions)');
    const idx = await run('runner.AI').CommandChoice(optionList);
    const card = run('runner.AI.preferred && runner.AI.preferred.cardToInstall');
    return optionList[idx] + ':' + (card ? card.title : '');
  };
  assert.strictEqual(await choose([]), 'install:Keiko');
  assert.notStrictEqual(await choose([ID.Keiko]), 'install:Keiko', 'no second console');
});

// ---------------- Odore ----------------
test('Odore: 2[c] breaks any number of sentry subroutines; pump lasts the encounter', () => {
  setUpBoard({installed: [ID.Odore], hqIce: [ID.Rototurret], credits: 6});
  const odore = run('runner.rig.programs[0]');
  encounterHQ();
  const ice = run('corp.HQ.ice[0]');
  assert.strictEqual(odore.abilities[0].Enumerate.call(odore).length, 0, 'free break needs 3 virtual resources');
  const options = odore.abilities[1].Enumerate.call(odore);
  assert.strictEqual(options.length, 2);
  assert.strictEqual(odore.abilities[2].Enumerate.call(odore).length, 0, 'no pump at equal strength');
  odore.abilities[1].Resolve.call(odore, options[0]);
  let d = decision();
  assert.strictEqual(d.choices.length, 2, 'one more subroutine plus Continue');
  assert.strictEqual(d.choices[1].alt, 'continue');
  d.phase.Resolve.continue(d.choices[0]);
  assert(ice.subroutines.every(s => s.broken), 'both broken');
  assert.strictEqual(run('runner.creditPool'), 4, '2[c] once');
  run('runner.creditPool = 6;');
  setUpBoard({installed: [ID.Odore], hqIce: [ID.Tithe], credits: 6});
  const o2 = run('runner.rig.programs[0]');
  encounterHQ();
  assert.strictEqual(o2.abilities[1].Enumerate.call(o2).length, 0, 'interface needs strength');
  assert.strictEqual(o2.abilities[2].Enumerate.call(o2).length, 1);
  o2.abilities[2].Resolve.call(o2); settle();
  assert.strictEqual(run('Strength(runner.rig.programs[0])'), 3, '+3 strength');
  assert.strictEqual(run('runner.creditPool'), 3);
  const b = o2.abilities[1].Enumerate.call(o2);
  o2.abilities[1].Resolve.call(o2, b[0]);
  d = decision(); d.phase.Resolve.continue(d.choices.find(c => c.alt === 'continue'));
  assert.strictEqual(run('corp.HQ.ice[0]').subroutines.filter(s => s.broken).length, 1, 'stops when Runner continues');
  assert.strictEqual(run('runner.creditPool'), 1);
  o2.responseOnEncounterEnds.Resolve.call(o2);
  assert.strictEqual(run('Strength(runner.rig.programs[0])'), 0, 'boost ends with the encounter');
});

test('Odore: 0[c] break with 3+ installed virtual resources, only on sentries', () => {
  setUpBoard({installed: [ID.Odore, ID.Cookbook, ID.IceCarver], hqIce: [ID.Rototurret], credits: 0});
  const odore = run('runner.rig.programs[0]');
  encounterHQ();
  assert.strictEqual(odore.abilities[0].Enumerate.call(odore).length, 0, 'two virtual resources are not enough');
  run(`(function () { var x = InstanceCard(${ID.Xanadu}, runner); x.cardLocation = runner.rig.resources; runner.rig.resources.push(x); })()`);
  const options = odore.abilities[0].Enumerate.call(odore);
  assert.strictEqual(options.length, 2);
  odore.abilities[0].Resolve.call(odore, options[0]);
  odore.abilities[0].Resolve.call(odore, odore.abilities[0].Enumerate.call(odore)[0]);
  assert(run('corp.HQ.ice[0]').subroutines.every(s => s.broken), 'repeatable free break');
  assert.strictEqual(odore.abilities[1].Enumerate.call(odore).length, 0, 'nothing left; 2[c] unaffordable anyway');
  setUpBoard({installed: [ID.Odore, ID.Cookbook, ID.IceCarver, ID.Xanadu], hqIce: [ID.IceWall], credits: 5});
  const o2 = run('runner.rig.programs[0]');
  encounterHQ();
  assert.strictEqual(o2.abilities[0].Enumerate.call(o2).length, 0, 'not a sentry');
});

test('Odore run calculator: 2[c] break, 3[c] pump, free with 3 virtual resources', () => {
  const cost = (installed, ice, credits) => {
    setUpBoard({installed, hqIce: [ice], credits, ai: true});
    run('corp.HQ.cards.push(InstanceCard(' + ID.HedgeFund + ', corp))');
    const route = run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)');
    return route ? route[route.length - 1].runner_credits_spent : null;
  };
  assert.strictEqual(cost([ID.Odore], ID.Rototurret, 5), 2, 'one 2[c] break for both subroutines');
  assert.strictEqual(cost([ID.Odore], ID.Tithe, 5), 5, '3[c] pump + 2[c] break');
  assert.strictEqual(cost([ID.Odore], ID.Tithe, 4), null, 'unaffordable');
  assert.strictEqual(cost([ID.Odore, ID.Cookbook, ID.IceCarver, ID.Xanadu], ID.Rototurret, 0), 0, 'free breaks');
});

test('Runner AI uses the planned Odore break during a real encounter', async () => {
  for (const [installed, credits, expectCredits] of [[[ID.Odore], 4, 2], [[ID.Odore, ID.Cookbook, ID.IceCarver, ID.Xanadu], 1, 1]]) {
    setUpBoard({installed, hqIce: [ID.Rototurret], credits, ai: true});
    run('corp.HQ.cards.push(InstanceCard(' + ID.HedgeFund + ', corp))');
    const ai = run('runner.AI');
    run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0)');
    encounterHQ();
    run('runner.AI._cachedOrBestRun(corp.HQ, approachIce);');
    for (let step = 0; step < 8 && !run('corp.HQ.ice[0]').subroutines.every(s => s.broken); step++) {
      const phase = run('currentPhase');
      if (phase === run('phases.runEncounterIce')) {
        const options = run('EnumeratePhase()');
        const idx = await ai.CommandChoice(options);
        assert.strictEqual(options[idx], 'trigger', 'AI triggers a breaker');
        const triggers = phase.Enumerate.trigger();
        const sel = await ai.SelectChoice(triggers);
        assert.strictEqual(triggers[sel].card.title, 'Odore');
        phase.Resolve.trigger(triggers[sel]);
      } else {
        const choices = phase.Enumerate.continue();
        phase.Resolve.continue(choices[await ai.SelectChoice(choices)]);
      }
    }
    assert(run('corp.HQ.ice[0]').subroutines.every(s => s.broken), 'all subroutines broken');
    assert.strictEqual(run('runner.creditPool'), expectCredits, 'paid as planned');
  }
});

// ---------------- Mystic Maemi ----------------
test('Mystic Maemi: drip, event-only credits and the turn-end choice', () => {
  setUpBoard({installed: [ID.Maemi], grip: [ID.Wildcat, ID.Cookbook, ID.SureGamble], credits: 0});
  const maemi = run('runner.rig.resources[0]');
  maemi.responseOnRunnerTurnBegins.Resolve.call(maemi);
  maemi.responseOnStolen.Resolve.call(maemi);
  assert.strictEqual(maemi.credits, 2);
  const wildcat = byTitle(run('runner.grip'), 'Wildcat Strike');
  const cookbook = byTitle(run('runner.grip'), 'Cookbook');
  assert.strictEqual(run('CheckCredits')(run('runner'), 2, 'playing', wildcat), true, 'pays events');
  assert.strictEqual(run('CheckCredits')(run('runner'), 1, 'installing', cookbook), false, 'not installs');
  assert.strictEqual(maemi.canUseCredits('using', run('runner.rig.resources[0]')), false, 'not abilities');
  assert.strictEqual(maemi.responseOnRunnerDiscardEnds.Enumerate.call(maemi).length, 0, 'fewer than 3 hosted');
  maemi.credits = 3;
  assert.strictEqual(maemi.responseOnRunnerDiscardEnds.Enumerate.call(maemi).length, 1);
  maemi.responseOnRunnerDiscardEnds.Resolve.call(maemi);
  const d = decision();
  assert.strictEqual(d.choices.length, 2, 'human chooses');
  d.phase.Resolve.continue(d.choices[0]); settle();
  assert.strictEqual(run('runner.grip.length'), 2, 'one random grip card trashed');
  assert.strictEqual(run('runner.heap.length'), 1);
  assert(run('runner.rig.resources').includes(maemi));
  run('runner.grip = [];');
  maemi.responseOnRunnerDiscardEnds.Resolve.call(maemi);
  const empty = decision();
  assert.strictEqual(empty.choices.length, 1, 'empty grip: must trash Maemi');
  empty.phase.Resolve.continue(empty.choices[0]); settle();
  assert(run('runner.heap').includes(maemi));
});

test('Mystic Maemi: real event play spends hosted credits', () => {
  setUpBoard({installed: [ID.Maemi], grip: [ID.Creative], credits: 0});
  const maemi = run('runner.rig.resources[0]');
  maemi.credits = 2;
  run(`(function () { var card = runner.grip[0]; SpendCredits(runner, PlayCost(card), "playing", card); })()`);
  assert.strictEqual(maemi.credits, 1, 'Creative Commission paid from Maemi');
});

test('Mystic Maemi AI: keeps the stash only when a random discard is cheap', () => {
  setUpBoard({installed: [ID.Maemi], grip: [ID.Wildcat, ID.Cookbook], credits: 0, ai: true});
  const maemi = run('runner.rig.resources[0]');
  maemi.credits = 3;
  const choose = () => { maemi.responseOnRunnerDiscardEnds.Resolve.call(maemi); const d = decision(); assert.strictEqual(d.choices.length, 1); return d; };
  let d = choose();
  assert.strictEqual(d.choices[0].grip, true, 'two cards in grip: lose a random one');
  d.phase.Resolve.continue(d.choices[0]); settle();
  assert.strictEqual(run('runner.grip.length'), 1);
  run(`runner.grip = []; (function () { var x = InstanceCard(${ID.Mimic}, runner); x.cardLocation = runner.grip; runner.grip.push(x); })()`);
  d = choose();
  assert.strictEqual(d.choices[0].grip, false, 'lone card worth keeping: trash Maemi');
  assert.strictEqual(maemi.AIEconomyInstall(), 1);
  run(`(function () { var x = InstanceCard(${ID.SureGamble}, runner); x.cardLocation = runner.grip; runner.grip.push(x); })()`);
  assert.strictEqual(maemi.AIEconomyInstall(), 2, 'events in grip');
});

test('Runner AI installs Maemi and Poemu; event affordability counts Maemi credits', async () => {
  const choose = async (grip, installed = [], credits = 4, hosted = 0) => {
    setUpBoard({grip, installed, stack: [ID.SureGamble, ID.Creative, ID.Wildcat],
      hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits, ai: true});
    if (hosted) run('runner.rig.resources[0].credits = ' + hosted + ';');
    run('EnumeratePhase();');
    const optionList = run('Object.keys(phaseOptions)');
    const idx = await run('runner.AI').CommandChoice(optionList);
    const p = run('runner.AI.preferred') || {};
    const card = p.cardToInstall || p.cardToPlay;
    return optionList[idx] + ':' + (card ? card.title : '');
  };
  assert.strictEqual(await choose([ID.Maemi]), 'install:Mystic Maemi');
  assert.strictEqual(await choose([ID.Poemu, ID.Cookbook]), 'install:Paladin Poemu');
  // The economy selector gates event plays on FullCheckPlay, which sees Maemi's credits.
  const playable = hosted => {
    setUpBoard({grip: [ID.SureGamble], installed: [ID.Maemi], credits: 3, ai: true});
    run('runner.rig.resources[0].credits = ' + hosted + ';');
    return !!run('FullCheckPlay(runner.grip[0])');
  };
  assert.strictEqual(playable(0), false, 'Sure Gamble unaffordable from the pool alone');
  assert.strictEqual(playable(2), true, 'Maemi credits make it affordable');
});

// ---------------- Paladin Poemu ----------------
test('Paladin Poemu: drip and non-connection installs', () => {
  setUpBoard({installed: [ID.Poemu], grip: [ID.Cookbook, ID.Smartware, ID.Wildcat], credits: 0});
  const poemu = run('runner.rig.resources[0]');
  poemu.responseOnRunnerTurnBegins.Resolve.call(poemu);
  poemu.responseOnStolen.Resolve.call(poemu);
  assert.strictEqual(poemu.credits, 2);
  assert.strictEqual(poemu.canUseCredits('installing', byTitle(run('runner.grip'), 'Smartware Distributor')), false, 'connection');
  assert.strictEqual(poemu.canUseCredits('playing', byTitle(run('runner.grip'), 'Wildcat Strike')), false, 'events');
  assert.strictEqual(poemu.canUseCredits('using', poemu), false);
  install('Cookbook');
  assert.strictEqual(poemu.credits, 1, 'Cookbook paid from Poemu');
});

test('Paladin Poemu: turn end with 3+ credits trashes an installed card (human and AI)', () => {
  setUpBoard({installed: [ID.Poemu, ID.Mimic, ID.Smartware], credits: 0});
  const poemu = run('runner.rig.resources[0]');
  poemu.credits = 2;
  assert.strictEqual(poemu.responseOnRunnerDiscardEnds.Enumerate.call(poemu).length, 0);
  poemu.credits = 3;
  poemu.responseOnRunnerDiscardEnds.Resolve.call(poemu);
  let d = decision();
  assert.strictEqual(d.choices.length, 3, 'any installed card');
  d.phase.Resolve.continue(d.choices.find(c => c.card.title === 'Mimic')); settle();
  assert(byTitle(run('runner.heap'), 'Mimic'));
  run('runner.AI = new RunnerAI(); runner.AI._log = function() {};');
  run(`(function () { var x = InstanceCard(${ID.Mimic}, runner); x.cardLocation = runner.rig.programs; runner.rig.programs.push(x); })()`);
  poemu.responseOnRunnerDiscardEnds.Resolve.call(poemu);
  d = decision();
  assert.strictEqual(d.choices.length, 1);
  assert.strictEqual(d.choices[0].card.title, 'Smartware Distributor', 'AI trashes the cheapest non-breaker');
  d.phase.Resolve.continue(d.choices[0]); settle();
  poemu.responseOnRunnerDiscardEnds.Resolve.call(poemu);
  d = decision();
  assert.strictEqual(d.choices[0].card, poemu, 'Poemu itself rather than the breaker');
});

test('Runner AI pays installs from Poemu before its pool', () => {
  setUpBoard({installed: [ID.Poemu], grip: [ID.Cookbook], credits: 3, ai: true});
  const poemu = run('runner.rig.resources[0]');
  poemu.credits = 1;
  install('Cookbook');
  assert.strictEqual(poemu.credits, 0);
  assert.strictEqual(run('runner.creditPool'), 3);
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
console.log('uprising batch 2: ' + cases + ' cases passed');
})();
