// Known-red triage reproduction: Class Act must look/bottom before drawing.
// Harness modelled on tests/downfall-batch4.test.js; no shared support changed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
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
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/downfall.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027,
  Tithe: 30073, Rototurret: 31046, IceWall: 31077,
  DocklandsPass: 30013, T400: 30031,
  Masterwork: 26015, Bukhgalter: 26016, Baklan: 26017, ClassAct: 26018,
};

// Player state as Init() prepares it, then a board.
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
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
  `);
}

// Resolve every pending trigger in the current global-trigger phases and
// decisions; `pick(choices, card)` chooses within a card's decision.
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
const noClassAct = (choices, card) => {
  if (card && card.title === 'The Class Act') throw new Error('unexpected The Class Act choice');
  return choices[0];
};
const byTitle = (cards, title) => cards.find(card => card.title === title);
const titles = cards => Array.from(cards, card => card.title);

const failures = [];
let cases = 0;
function test(name, fn) {
  cases++;
  try { fn(); if (verbose) console.log('ok ' + name); }
  catch (error) { failures.push(name + ': ' + (verbose ? error.stack : error.message)); }
}

function atBottomChoice(check, count = 1) {
  // Stack top is last: T400, Sure Gamble, Diesel, Docklands Pass.
  setUpBoard({installed: [ID.ClassAct],
    stack: [ID.DocklandsPass, ID.Diesel, ID.SureGamble, ID.T400]});
  run('viewingPlayer = runner;');
  const originalStack = Array.from(run('runner.stack'));
  run(`Draw(runner, ${count})`);
  let reached = false;
  settle((choices, card) => {
    if (card && card.title === 'The Class Act') {
      reached = true;
      assert.strictEqual(choices.length, count + 1, 'offer exactly the top draw-count + 1 cards');
      assert.deepStrictEqual(Array.from(choices, choice => choice.card),
        originalStack.slice(-(count + 1)).reverse(), 'offer the correct card identities');
      check(choices, originalStack);
      return choices[0];
    }
    return choices[0];
  });
  assert.ok(reached, 'must reach the mandatory Class Act bottoming choice');
}

for (const count of [1, 3]) {
  test(`bottoming choice precedes movement into grip (draw ${count})`, () => {
    atBottomChoice((choices, originalStack) => {
      assert.strictEqual(run('runner.grip.length'), 0,
        'cards entered grip before the interrupt choice');
      assert.deepStrictEqual(Array.from(run('runner.stack')), originalStack,
        'all looked-at cards must still be in stack before bottoming');
    }, count);
  });
}

test('text choices identify each looked-at card to the Runner', () => {
  atBottomChoice(choices => {
    for (const choice of choices) {
      assert.strictEqual(context.PlayerCanLook(context.corp, choice.card), false,
        'looking must not reveal cards to Corp');
      assert.ok(choice.label.includes(choice.card.title),
        'Runner sees an unidentified choice: ' + choice.label);
    }
  });
});

test('graphical bottoming uses the existing card selection grid', () => {
  atBottomChoice(choices => {
    // Exercise the real choice UI dispatcher, with DOM/renderer calls stubbed.
    // Positive control: ordinary card options (as tutors use) reach the grid.
    context.validOptions = choices.map(choice => ({card: choice.card, label: choice.card.title}));
    run('accessibilityMode = "graphical"; executingCommand = "continue"; viewingGrid = null; MakeChoice();');
    assert.ok(choices.every(choice => context.viewingGrid && context.viewingGrid.includes(choice.card)),
      'harness control: ordinary card choices must reach the grid');
    context.validOptions = choices;
    run('viewingGrid = null; MakeChoice();');
    assert.deepStrictEqual(Array.from(run('viewingGrid') || [], card => card.title),
      Array.from(choices, choice => choice.card.title),
      'looked-at cards are absent from the card selection grid');
  });
});

for (const failure of failures) console.error('FAIL ' + failure);
console.log(`Class Act pre-draw/display: ${cases - failures.length}/${cases} passed`);
if (failures.length) process.exitCode = 1;
