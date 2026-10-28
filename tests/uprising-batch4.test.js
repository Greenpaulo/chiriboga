// Run with: node tests/uprising-batch4.test.js
// Uprising batch 4 (26079–26082): Afterimage, Makler, Penumbral Toolkit and
// The Back, exercised through the real engine, run calculator and Runner AI.
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
  Ansel: 30038, Swordsman: 31056, Rototurret: 31046, IceWall: 31077, Pennyshaver: 30014,
  Fermenter: 30007, Abagnale: 31021,
  Afterimage: 26079, Makler: 26080, Toolkit: 26081, Back: 26082,
};

function setUpBoard({hqIce = [], centralIce = [], stack = [], grip = [], heap = [], installed = [], credits = 5, ai = false} = {}) {
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
      ${JSON.stringify(centralIce)}, ${JSON.stringify(centralIce)}, ${JSON.stringify(hqIce)}, [], [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, ${JSON.stringify(heap)}, ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
  `);
}

function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 50; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
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
function encounter(iceIdx = 0) {
  run(`attackedServer = corp.HQ; approachIce = ${iceIdx}; encountering = true;
    encounteredIce = corp.HQ.ice[${iceIdx}]; currentPhase = phases.runEncounterIce;
    AutomaticTriggers("automaticOnEncounter", [encounteredIce]);`);
}
function useAbility(card, index, choice = 0) {
  return run(`(function () {
    var card = ${card}; var ability = card.abilities[${index}];
    var choices = ability.Enumerate.call(card);
    if (choices.length <= ${choice}) return false;
    ability.Resolve.call(card, choices[${choice}]);
    return true;
  })()`);
}
const enumCount = (card, index) => run(`${card}.abilities[${index}].Enumerate.call(${card}).length`);
const titles = cards => Array.from(cards, card => card.title);
const program = title => `runner.rig.programs.find(function (c) { return c.title == "${title}"; })`;
const resource = title => `runner.rig.resources.find(function (c) { return c.title == "${title}"; })`;
// Best complete HQ path from the outermost ice.
const bestPath = () => run(`runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, corp.HQ.ice.length - 1)`);
const usesOf = (path, title) => {
  if (!path) return null;
  const last = path[path.length - 1];
  return {
    bypass: last.persistents.filter(p => p.use && p.use.title === title && p.action === 'bypass').length,
    pumps: Math.max(0, ...path.map(p => p.card_str_mods.filter(m => m.use && m.use.title === title).length)),
    breaks: Math.max(0, ...path.map(p => p.sr_broken.filter(b => b.use && b.use.title === title).length)),
    spent: last.runner_credits_spent,
    restricted: last.restrictedCreditsSpent || 0,
  };
};

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Afterimage ----------------
const AI_ = program('Afterimage');
const TK = resource('Penumbral Toolkit');

test('Afterimage +2 strength spends only stealth credits; breaks up to 2 for 1 from any source', () => {
  setUpBoard({installed: [ID.Afterimage], hqIce: [ID.Ansel], credits: 6});
  encounter(); settle();
  assert.strictEqual(enumCount(AI_, 1), 0, 'no stealth credits: no pump even with 6 in pool');
  assert.strictEqual(enumCount(AI_, 0), 0, 'strength 2 < 4: no break');
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel], credits: 6});
  run(`LoadCredits(${TK}, 4);`);
  encounter(); settle();
  assert(useAbility(AI_, 1)); settle();
  assert.strictEqual(run(`${TK}.credits`), 3, 'paid from the Toolkit');
  assert.strictEqual(run('runner.creditPool'), 6, 'pool untouched by the pump');
  assert.strictEqual(run(`Strength(${AI_})`), 4);
  assert.strictEqual(enumCount(AI_, 1), 0, 'already at strength');
  assert(useAbility(AI_, 0)); // break first, then the follow-up decision breaks a second
  settle((choices) => choices.find(c => c.subroutine) || choices[0]);
  assert.strictEqual(run('corp.HQ.ice[0].subroutines.filter(function (s) { return s.broken; }).length'), 2, 'two for one use');
  run(`${AI_}.responseOnEncounterEnds.Resolve.call(${AI_});`);
  assert.strictEqual(run(`Strength(${AI_})`), 2, 'boost ends with the encounter');
});

test('Afterimage bypasses one sentry per turn for 2 stealth credits', () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel, ID.IceWall], credits: 6});
  run(`LoadCredits(${TK}, 2);`);
  encounter(1);
  const offer = () => run(`${AI_}.responseOnEncounter.Enumerate.call(${AI_}, corp.HQ.ice[approachIce]).length`);
  assert.strictEqual(offer(), 0, 'Ice Wall is not a sentry');
  encounter(0);
  assert.strictEqual(offer(), 2, 'pay or continue');
  run(`${AI_}.responseOnEncounter.Resolve.call(${AI_}, {id: 0});`);
  assert.strictEqual(run('runner.creditPool'), 6, 'pool not used');
  assert.deepStrictEqual(titles(run('runner.heap')), ['Penumbral Toolkit'], 'emptied Toolkit is trashed');
  assert.strictEqual(run('phases.runEncounterEnd.next === phases.runPassesIce'), true, 'ice bypassed');
  run(`LoadCredits(${AI_}, 0);`);
  assert.strictEqual(offer(), 0, 'once per turn (and no stealth credits left)');
  run(`AutomaticTriggers("responseOnRunnerTurnBegins"); ${AI_}.responseOnRunnerTurnBegins.Resolve.call(${AI_});`);
  assert.strictEqual(run(`${AI_}.bypassUsedThisTurn`), false, 'resets each turn');
});

test('Afterimage bypass is not offered with fewer than 2 stealth credits', () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel], credits: 9});
  run(`LoadCredits(${TK}, 1);`);
  encounter(0);
  assert.strictEqual(run(`${AI_}.responseOnEncounter.Enumerate.call(${AI_}, corp.HQ.ice[0]).length`), 0);
});

test('Runner AI plans an Afterimage stealth bypass, once per path', () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel], credits: 5, ai: true});
  run(`LoadCredits(${TK}, 4); attackedServer = corp.HQ;`);
  let uses = usesOf(bestPath(), 'Afterimage');
  assert(uses && uses.bypass === 1, 'bypasses Ansel: ' + JSON.stringify(uses));
  assert.strictEqual(uses.restricted, 2, 'bypass recorded as restricted spending');
  run(`${AI_}.bypassUsedThisTurn = true;`);
  uses = usesOf(bestPath(), 'Afterimage');
  assert(uses && uses.bypass === 0 && uses.pumps === 1 && uses.breaks >= 3, 'used bypass: pump with stealth, then break: ' + JSON.stringify(uses));
  assert.strictEqual(uses.restricted, 1, 'pump is the restricted spend');
  // Two sentries: one bypass, the other is broken.
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel, ID.Ansel], credits: 6, ai: true});
  run(`LoadCredits(${TK}, 4); attackedServer = corp.HQ;`);
  uses = usesOf(bestPath(), 'Afterimage');
  assert(uses && uses.bypass === 1, 'only one bypass per turn: ' + JSON.stringify(uses));
});

test('Runner AI cannot plan Afterimage pumps or bypasses from pool credits', () => {
  setUpBoard({installed: [ID.Afterimage], hqIce: [ID.Ansel], credits: 20, ai: true});
  const uses = usesOf(bestPath(), 'Afterimage');
  assert(!uses || (uses.bypass === 0 && uses.pumps === 0), 'no stealth source: ' + JSON.stringify(uses));
  setUpBoard({installed: [ID.Afterimage], hqIce: [ID.Swordsman], credits: 5, ai: true});
  const swordsman = usesOf(bestPath(), 'Afterimage');
  assert(swordsman && swordsman.breaks === 2 && swordsman.pumps === 0, 'strength-2 sentry broken from pool: ' + JSON.stringify(swordsman));
});

test('Runner AI pre-run plan counts Toolkit credits through its run-credit offset', () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel], credits: 0, ai: true});
  run(`LoadCredits(${TK}, 2);`);
  assert.strictEqual(run(`${TK}.AIRunPoolCreditOffset.call(${TK}, corp.HQ, null)`), 2);
  const path = run(`runner.AI._calculateBestCompleteRun(corp.HQ, 2, 0, 0, 0, null, corp.HQ.ice.length - 1)`);
  const uses = usesOf(path, 'Afterimage');
  assert(uses && uses.bypass === 1, 'stealth bypass with Toolkit credits outside the run: ' + JSON.stringify(uses));
});

test('Runner AI takes the planned Afterimage bypass at the encounter', async () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel], credits: 5, ai: true});
  run(`LoadCredits(${TK}, 4);`);
  encounter(0);
  bestPath();
  const choices = run(`${AI_}.responseOnEncounter.Enumerate.call(${AI_}, corp.HQ.ice[0])`);
  const idx = await run('runner.AI').CommandChoice(choices);
  assert.strictEqual(choices[idx].alt, 'afterimage_bypass');
});

test('Corp security sees Afterimage bypass only on sentries with 2 stealth credits', () => {
  setUpBoard({installed: [ID.Afterimage, ID.Toolkit], hqIce: [ID.Ansel, ID.IceWall]});
  run(`LoadCredits(${TK}, 2);`);
  const can = i => run(`${AI_}.AIBypassesOneIce.call(${AI_}, corp.HQ.ice[${i}], corp.HQ, ${i})`);
  assert.strictEqual(can(0), true, 'run-only Toolkit credits counted in the prospective run');
  assert.strictEqual(can(1), false, 'not a sentry');
  run(`${TK}.credits = 1;`);
  assert.strictEqual(can(0), false);
  assert.strictEqual(run('attackedServer'), null, 'run context restored');
});

// ---------------- Makler ----------------
const MK = program('Makler');
test('Makler breaks up to 2 barrier subroutines and gains 1 the first time each turn it fully breaks ice', () => {
  setUpBoard({installed: [ID.Makler], hqIce: [ID.IceWall], credits: 6});
  encounter(); settle();
  assert.strictEqual(enumCount(MK, 0), 1, 'Ice Wall strength 1 <= 2');
  assert(useAbility(MK, 0)); settle();
  assert.strictEqual(run('runner.creditPool'), 5, 'paid 2, gained 1 for fully breaking');
  assert.strictEqual(run(`${MK}.hasFullyBrokenThisTurn`), true);
  run(`${MK}.responseOnEncounterEnds.Resolve.call(${MK}); corp.HQ.ice[0].subroutines.forEach(function (s) { s.broken = false; });`);
  encounter(); settle();
  useAbility(MK, 0); settle();
  assert.strictEqual(run('runner.creditPool'), 3, 'only once per turn');
  run(`${MK}.responseOnRunnerTurnBegins.Resolve.call(${MK});`);
  assert.strictEqual(run(`${MK}.hasFullyBrokenThisTurn`), false);
});

test('Makler gains nothing when another card broke a subroutine', () => {
  setUpBoard({installed: [ID.Makler], hqIce: [ID.IceWall], credits: 6});
  encounter(); settle();
  run('corp.HQ.ice[0].subroutines[0].broken = true;');
  assert.strictEqual(enumCount(MK, 0), 0, 'nothing left to break');
  assert.strictEqual(run('runner.creditPool'), 6);
});

test('Runner AI plans Makler through a barrier', () => {
  setUpBoard({installed: [ID.Makler], hqIce: [ID.IceWall], credits: 5, ai: true});
  const uses = usesOf(bestPath(), 'Makler');
  assert(uses && uses.breaks === 1 && uses.spent === 2, JSON.stringify(uses));
});

// ---------------- Penumbral Toolkit ----------------
test('Penumbral Toolkit loads 4, costs 2 less after an HQ success, and pays only during runs', () => {
  setUpBoard({grip: [ID.Toolkit], credits: 5});
  const tk = 'runner.grip[0]';
  assert.strictEqual(run(`InstallCost(${tk})`), 2);
  run('AutomaticTriggers("automaticOnRunSuccessful", [corp.RnD]);');
  assert.strictEqual(run(`InstallCost(${tk})`), 2, 'R&D does not count');
  run('AutomaticTriggers("automaticOnRunSuccessful", [corp.HQ]);');
  assert.strictEqual(run(`InstallCost(${tk})`), 0, 'HQ success discounts it');
  run(`Install(${tk}, null, false, null, true);`); settle();
  assert.strictEqual(run('runner.creditPool'), 5, 'installed for 0');
  assert.strictEqual(run(`${TK}.credits`), 4);
  assert.strictEqual(run('AvailableCredits(runner)'), 5, 'not spendable outside a run');
  run('attackedServer = corp.HQ;');
  assert.strictEqual(run('AvailableCredits(runner)'), 9, 'spendable during a run');
  run(`AutomaticTriggers("responseOnRunnerTurnBegins"); ${TK}.responseOnRunnerTurnBegins.Resolve.call(${TK});`);
  assert.strictEqual(run(`${TK}.madeSuccessfulRunOnHQThisTurn`), false, 'discount resets');
});

test('Penumbral Toolkit is trashed once spent empty during a run', () => {
  setUpBoard({installed: [ID.Toolkit], credits: 0});
  run(`LoadCredits(${TK}, 4); attackedServer = corp.HQ;`);
  run('SpendCredits(runner, 4, "using", null);'); settle();
  assert.deepStrictEqual(titles(run('runner.heap')), ['Penumbral Toolkit']);
  assert.strictEqual(run('runner.rig.resources.length'), 0);
});

test('Runner AI rates Penumbral Toolkit as economy, higher when free', () => {
  setUpBoard({grip: [ID.Toolkit]});
  assert.strictEqual(run('runner.grip[0].AIEconomyInstall.call(runner.grip[0])'), 1);
  run('AutomaticTriggers("automaticOnRunSuccessful", [corp.HQ]);');
  assert.strictEqual(run('runner.grip[0].AIEconomyInstall.call(runner.grip[0])'), 3);
});

// ---------------- The Back ----------------
const BK = resource('The Back');
const useHardware = () => run(`(function () {
  var hw = runner.rig.hardware[0];
  TriggerAbility(hw, hw.abilities[0]);
})()`);
test('The Back gains 1 power counter the first time each turn hardware is used during a run', () => {
  setUpBoard({installed: [ID.Back, ID.Pennyshaver], credits: 0});
  useHardware(); settle();
  assert.strictEqual(run(`Counters(${BK}, "power")`), 0, 'not during a run');
  run('attackedServer = corp.HQ;');
  useHardware(); settle();
  assert.strictEqual(run(`Counters(${BK}, "power")`), 1);
  useHardware(); settle();
  assert.strictEqual(run(`Counters(${BK}, "power")`), 1, 'first time each turn only');
  run(`${BK}.responseOnRunnerTurnBegins.Resolve.call(${BK});`);
  useHardware(); settle();
  assert.strictEqual(run(`Counters(${BK}, "power")`), 2, 'next turn');
});

test('The Back shuffles up to 2 trash-ability heap cards per counter into the stack and leaves the game', () => {
  setUpBoard({installed: [ID.Back], heap: [ID.Fermenter, ID.Abagnale, ID.Fermenter, ID.SureGamble], stack: [ID.Diesel]});
  run(`${BK}.power = 1;`);
  assert.strictEqual(run('HasTrashAbility(runner.heap.find(function (c) { return c.title == "Sure Gamble"; }))'), false);
  let offered = null;
  assert(useAbility(BK, 0));
  settle((choices, card) => {
    if (card && card.title === 'The Back' && !offered) offered = titles(choices.filter(c => c.card).map(c => c.card));
    return choices[0];
  });
  assert.deepStrictEqual(offered.sort(), ['Abagnale', 'Fermenter', 'Fermenter'], 'only cards with [trash] abilities');
  assert.strictEqual(run('runner.stack.length'), 3, 'two shuffled in (1 counter)');
  assert.strictEqual(run('runner.heap.length'), 2);
  assert.strictEqual(run('runner.clickTracker'), 3);
  assert.strictEqual(run('runner.rig.resources.length'), 0);
  assert.deepStrictEqual(titles(run('removedFromGame')).includes('The Back'), true);
});

test('The Back with no counters still leaves the game but shuffles nothing', () => {
  setUpBoard({installed: [ID.Back], heap: [ID.Fermenter], stack: [ID.Diesel]});
  assert(useAbility(BK, 0)); settle();
  assert.strictEqual(run('runner.stack.length'), 1);
  assert.strictEqual(run('runner.heap.length'), 1);
});

test('Runner AI triggers The Back when its counters cover the eligible heap, picking the best card', async () => {
  setUpBoard({installed: [ID.Back], heap: [ID.Fermenter, ID.Abagnale, ID.SureGamble], stack: [ID.Diesel], hqIce: [ID.IceWall], credits: 0, ai: true});
  const k = BK;
  assert.strictEqual(run(`${k}.AIWouldTrigger.call(${k})`), false, 'no counters');
  run(`${k}.power = 1;`);
  assert.strictEqual(run(`${k}.AIWouldTrigger.call(${k})`), true, '2 eligible, 1 counter');
  run('runner.heap.splice(0, runner.heap.length);');
  assert.strictEqual(run(`${k}.AIWouldTrigger.call(${k})`), false, 'nothing eligible');
  setUpBoard({installed: [ID.Back], heap: [ID.Fermenter, ID.Abagnale, ID.SureGamble], stack: [ID.Diesel], credits: 0, ai: true});
  run(`${BK}.power = 1; runner.AI._log = function () {};`);
  const order = run(`${BK}._AIHeapOrder(${BK}._eligibleHeapCards()).map(function (c) { return c.title; })`);
  assert.strictEqual(order.length, 2);
  assert(useAbility(BK, 0)); settle();
  assert.strictEqual(run('runner.stack.length'), 3, 'AI picks both eligible cards');
});

test('Runner AI selector uses The Back from the action phase', async () => {
  const choose = async power => {
    setUpBoard({installed: [ID.Back], heap: [ID.Fermenter, ID.Abagnale], stack: [ID.Diesel, ID.HedgeFund], grip: [ID.SureGamble, ID.SureGamble, ID.SureGamble, ID.SureGamble, ID.SureGamble],
      hqIce: [ID.IceWall], centralIce: [ID.IceWall], credits: 0, ai: true});
    run(`${BK}.power = ${power}; EnumeratePhase();`);
    const optionList = run('Object.keys(phaseOptions)');
    const idx = await run('runner.AI').CommandChoice(optionList);
    const card = run('runner.AI.preferred && runner.AI.preferred.cardToTrigger');
    return optionList[idx] + ':' + (card ? card.title : '');
  };
  assert.strictEqual(await choose(1), 'trigger:The Back');
  assert.notStrictEqual(await choose(0), 'trigger:The Back', 'no counters');
});

test('The Back is worth keeping only with hardware abilities installed', () => {
  setUpBoard({grip: [ID.Back], installed: [ID.Pennyshaver]});
  assert.strictEqual(run('runner.grip[0].AIWorthKeeping.call(runner.grip[0], InstalledCards(runner), 4)'), true);
  setUpBoard({grip: [ID.Back]});
  assert.strictEqual(run('runner.grip[0].AIWorthKeeping.call(runner.grip[0], InstalledCards(runner), 4)'), false);
});

test('HasTrashAbility recognises declared and text-named trash abilities', () => {
  assert.strictEqual(run(`HasTrashAbility(cardSet[${ID.Fermenter}])`), true, 'declared flag');
  assert.strictEqual(run(`HasTrashAbility(cardSet[${ID.Abagnale}])`), true);
  assert.strictEqual(run('HasTrashAbility(cardSet[26090])'), true, 'Self-modifying Code ability text');
  assert.strictEqual(run(`HasTrashAbility(cardSet[${ID.SureGamble}])`), false);
});

test('Every implemented Runner card with a [trash] ability satisfies HasTrashAbility', () => {
  // Fresh context with every set file, so the guard covers future heap targets.
  const all = {...context, cardSet: [], setIdentifiers: []};
  all.window = all;
  vm.createContext(all);
  vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', all);
  for (const file of ['config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js'])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), all, {filename: file});
  const sources = {};
  for (const file of fs.readdirSync(path.join(root, 'sets')).filter(name => name.endsWith('.js'))) {
    sources[file] = fs.readFileSync(path.join(root, 'sets', file), 'utf8');
    vm.runInContext(sources[file], all, {filename: file});
  }
  // Unfinished scaffold stubs (TODO markers) are checked once implemented.
  const stub = id => Object.values(sources).some(source => {
    const start = source.search(new RegExp('^cardSet\\[' + id + '\\]\\s*=', 'm'));
    if (start < 0) return false;
    const end = source.indexOf('\ncardSet[', start + 1);
    return /TODO/.test(source.slice(start, end < 0 ? undefined : end));
  });
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data;
  const missing = metadata.filter(meta => meta.side_code === 'runner' && /\[trash\][^\n:]*:/.test(meta.text || ''))
    .filter(meta => all.cardSet[Number(meta.code)] && !stub(Number(meta.code)))
    .filter(meta => !all.HasTrashAbility(all.cardSet[Number(meta.code)]))
    .map(meta => meta.code + ' ' + meta.title);
  assert.deepStrictEqual(missing, []);
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
console.log('uprising batch 4: ' + cases + ' cases passed');
})();
