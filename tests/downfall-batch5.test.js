// Run with: node tests/downfall-batch5.test.js
// Downfall batch 5 (26019–26023): Lat, In the Groove, Khusyuk, Spec Work and
// Supercorridor, exercised through the real engine and Runner AI.
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
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/downfall.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027, IceWall: 31077,
  Offworld: 30067, Nico: 30037,
  Cleaver: 30006, Echelon: 30025, Unity: 30026, Fermenter: 30007, Marjanah: 30016, T400: 30031,
  Lat: 26019, Groove: 26020, Khusyuk: 26021, SpecWork: 26022, Supercorridor: 26023,
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
    const choices = options('continue');
    if (choices.length > 0) { phase.Resolve.continue(pick(choices, phase.context)); continue; }
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

// ---------------- Lat: Ethical Freelancer ----------------
test('Lat may draw 1 when the grip matches HQ as the discard phase ends', () => {
  setUpBoard({identity: ID.Lat, grip: [ID.SureGamble, ID.Diesel], hq: [ID.HedgeFund, ID.HedgeFund], stack: [ID.T400]});
  const lat = 'runner.identityCard';
  assert.deepStrictEqual(Array.from(enumerateTrigger(lat, 'responseOnRunnerDiscardEnds'), c => c.id), [1, 0], 'optional');
  discardPhaseEnds(choices => choices.find(c => c.id === 0));
  assert.strictEqual(run('runner.grip.length'), 2, 'declined');
  discardPhaseEnds();
  assert.strictEqual(run('runner.grip.length'), 3, 'drew 1');
  discardPhaseEnds();
  assert.strictEqual(run('runner.grip.length'), 3, 'counts differ (3 vs 2): no trigger');
});

test('Runner AI with Lat always draws', () => {
  setUpBoard({identity: ID.Lat, grip: [ID.SureGamble], hq: [ID.HedgeFund], stack: [ID.T400], ai: true});
  assert.deepStrictEqual(Array.from(enumerateTrigger('runner.identityCard', 'responseOnRunnerDiscardEnds'), c => c.id), [1]);
  discardPhaseEnds();
  assert.strictEqual(run('runner.grip.length'), 2);
});

// ---------------- In the Groove ----------------
test('In the Groove can only be played as the first click', () => {
  setUpBoard({grip: [ID.Groove]});
  assert(run('FullCheckPlay(runner.grip[0])'), 'playable before any click is spent');
  run('phases.runnerActionMain.Resolve.gain();'); settle();
  assert.strictEqual(run('ClicksSpentThisTurn(runner)'), 1);
  assert.strictEqual(run('FullCheckPlay(runner.grip[0])'), null, 'not after the first click');
  run('ResetClicks(runner)');
  assert.strictEqual(run('ClicksSpentThisTurn(runner)'), 0, 'reset when the turn begins');
  assert(run('FullCheckPlay(runner.grip[0])'));
});

test('In the Groove draws or gains on installs with a printed cost of 1 or more, this turn only', () => {
  setUpBoard({grip: [ID.Groove, ID.Cleaver, ID.Marjanah, ID.Fermenter, ID.Unity], stack: [ID.T400, ID.Diesel, ID.HedgeFund], credits: 10});
  play('In the Groove'); settle();
  assert.strictEqual(run('runner.clickTracker'), 3);
  assert(byTitle(run('runner.heap'), 'In the Groove'), 'in the heap');
  install('Cleaver'); settle(choices => choices.find(c => c.id === 1));
  assert.strictEqual(run('runner.creditPool'), 8, '10 - 3 + 1');
  install('Fermenter'); settle(choices => choices.find(c => c.id === 0));
  assert.strictEqual(run('runner.grip.length'), 3, 'Marjanah, Unity and the drawn card');
  install('Marjanah'); settle(() => { throw new Error('a 0-cost install does not trigger'); });
  discardPhaseEnds();
  install('Unity'); settle(() => { throw new Error('the effect ended with the turn'); });
  assert.strictEqual(run('runner.creditPool'), 4, '8 - 1 - 0 - 3, no gain');
});

test('Runner AI plays In the Groove first click only with two installs to make', async () => {
  setUpBoard({grip: [ID.Groove, ID.Cleaver, ID.Unity], stack: [ID.T400, ID.Diesel], credits: 7,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], ai: true});
  assert.strictEqual(await aiCommand(), 'play:In the Groove');
  setUpBoard({grip: [ID.Groove, ID.Cleaver, ID.Unity], stack: [ID.T400, ID.Diesel], credits: 4,
    hqIce: [ID.IceWall], rndIce: [ID.IceWall], ai: true});
  assert.notStrictEqual(await aiCommand(), 'play:In the Groove', 'can pay for only one install');
  setUpBoard({grip: [ID.Groove, ID.Cleaver, ID.Unity], credits: 7, ai: true});
  run('runner.clicksSpentThisTurn = 1;');
  assert.strictEqual(run('runner.AI') && run('FullCheckPlay(runner.grip[0])'), null, 'not after the first click');
});

test('Runner AI In the Groove choice: credits when poor, cards otherwise', () => {
  setUpBoard({grip: [ID.Groove], credits: 2, ai: true});
  run('runner.grip[0].grooveActive = true;');
  const choice = () => Array.from(enumerateTrigger('runner.grip[0]', 'responseOnInstall', 'runner.grip[0]'), c => c.id);
  run('runner.grip[0].installCost = 1;'); // the event stands in for an installed card here
  assert.deepStrictEqual(choice(), [1], 'gain when poor');
  run('runner.creditPool = 8;');
  assert.deepStrictEqual(choice(), [0], 'draw otherwise');
  run('delete runner.grip[0].installCost;');
});

// ---------------- Khusyuk ----------------
const RND = [ID.HedgeFund, ID.Nico, ID.HedgeFund, ID.Offworld, ID.Diesel, ID.HedgeFund];
test('Khusyuk sets aside X cards for the chosen cost, accesses 1 and shuffles them back', () => {
  setUpBoard({grip: [ID.Khusyuk], installed: [ID.Cleaver, ID.Echelon, ID.Unity, ID.Fermenter], rnd: RND, credits: 5});
  const rndTitles = titles(run('corp.RnD.cards'));
  let costChoices = null, accessChoices = null, rootAccess = 0;
  play('Khusyuk');
  settle((choices, card) => {
    if (card && card.title === 'Khusyuk' && choices[0].x !== undefined) {
      costChoices = Array.from(choices, c => c.id + ':' + c.x);
      return choices.find(c => c.id === 3);
    }
    if (card && card.title === 'Khusyuk' && choices[0].card) {
      accessChoices = titles(choices.map(c => c.card));
      assert(choices.every(c => c.card.faceUp), 'set aside faceup');
      return choices.find(c => c.card.title === 'Offworld Office');
    }
    return choices[0];
  });
  assert.deepStrictEqual(costChoices, ['1:1', '3:3']);
  assert.deepStrictEqual(accessChoices, ['Hedge Fund', 'Diesel', 'Offworld Office'], 'top 3, top first');
  assert(byTitle(run('runner.scoreArea'), 'Offworld Office'), 'stole the accessed agenda');
  assert.strictEqual(run('corp.RnD.cards.length'), RND.length - 1);
  assert.deepStrictEqual(titles(run('corp.RnD.cards')).sort(), rndTitles.filter(t => t !== 'Offworld Office').sort());
  assert(run('corp.RnD.cards.every(function (c) { return !c.faceUp && !c.knownToRunner; })'), 'shuffled back facedown');
  assert.strictEqual(run('phases.runAccessingCard.next'), run('phases.runEnds'), 'access phase restored');
  assert.strictEqual(run('attackedServer'), null, 'run over');
  assert.strictEqual(run('runner.heap.concat(runner.resolvingCards)[0].restrictAccessToSetAside'), false);
});

test('Khusyuk accesses only the chosen card, not the R&D root', () => {
  setUpBoard({grip: [ID.Khusyuk], installed: [ID.Cleaver, ID.Echelon], rnd: RND, hq: [ID.Nico], credits: 5});
  run('MoveCard(corp.HQ.cards[0], corp.RnD.root);');
  let accessed = 0;
  play('Khusyuk');
  settle((choices, card) => {
    if (choices[0].card) accessed++;
    return choices[0];
  });
  assert.strictEqual(accessed, 1, 'one access choice only');
  assert(!run('corp.RnD.root[0].knownToRunner'), 'root card not accessed');
  assert.strictEqual(run('runner.heap.concat(runner.resolvingCards)[0].restrictAccessToSetAside'), false);
});

test('Khusyuk accesses nothing when no installed card costs more than 0', () => {
  setUpBoard({grip: [ID.Khusyuk], installed: [ID.Marjanah], rnd: RND, credits: 5});
  play('Khusyuk');
  settle(choices => { if (choices[0].x !== undefined || choices[0].card) throw new Error('no choice expected'); return choices[0]; });
  assert.strictEqual(run('corp.RnD.cards.length'), RND.length);
  assert.strictEqual(run('runner.scoreArea.length'), 0);
  assert.strictEqual(run('runner.creditPool'), 2);
});

test('Runner AI values Khusyuk on R&D with matching installs and takes the agenda', () => {
  setUpBoard({grip: [ID.Khusyuk], installed: [ID.Cleaver, ID.Echelon, ID.Unity], rnd: RND, credits: 6, ai: true});
  const k = 'runner.grip[0]';
  assert(run(`${k}.AIRunEventExtraPotential(corp.RnD, 1)`) > 0.7, 'best of 3');
  assert.strictEqual(run(`${k}.AIRunEventExtraPotential(corp.HQ, 1)`), 0);
  play('Khusyuk'); settle();
  assert(byTitle(run('runner.scoreArea'), 'Offworld Office'), 'AI chose the agenda');
  setUpBoard({grip: [ID.Khusyuk], installed: [ID.Cleaver, ID.Fermenter], rnd: RND, ai: true});
  assert.strictEqual(run(`${k}.AIRunEventExtraPotential(corp.RnD, 1)`), 0, 'X of 1 is no better than a breach');
});

// ---------------- Spec Work ----------------
test('Spec Work trashes an installed program as a cost, then gains 4 and draws 2', () => {
  setUpBoard({grip: [ID.SpecWork], installed: [ID.Fermenter, ID.T400], stack: [ID.Diesel, ID.HedgeFund, ID.T400]});
  assert.deepStrictEqual(titles(run('runner.grip[0].Enumerate().map(function (c) { return c.card; })')), ['Fermenter'], 'programs only');
  play('Spec Work'); settle();
  assert(byTitle(run('runner.heap'), 'Fermenter'));
  assert.strictEqual(run('runner.creditPool'), 8, '5 - 1 + 4');
  assert.strictEqual(run('runner.grip.length'), 2);
  setUpBoard({grip: [ID.SpecWork], installed: [ID.T400]});
  assert.strictEqual(run('FullCheckPlay(runner.grip[0])'), null, 'no program to trash');
});

test('Runner AI plays Spec Work only with a program it can spare', () => {
  setUpBoard({grip: [ID.SpecWork], installed: [ID.Cleaver, ID.Unity, ID.Fermenter], ai: true});
  assert.deepStrictEqual(titles(run('runner.grip[0].Enumerate().map(function (c) { return c.card; })')), ['Fermenter']);
  assert.strictEqual(run('runner.grip[0].AIWouldPlay()'), true);
  setUpBoard({grip: [ID.SpecWork], installed: [ID.Cleaver, ID.Unity], ai: true});
  assert.strictEqual(run('runner.grip[0].AIWouldPlay()'), false, 'keeps its only fracter and decoder');
  setUpBoard({grip: [ID.SpecWork], installed: [ID.Cleaver, ID.Cleaver], ai: true});
  assert.strictEqual(run('runner.grip[0].AIWouldPlay()'), true, 'duplicate breaker');
});

// ---------------- Supercorridor ----------------
test('Supercorridor gives +2 MU, +1 hand size and may gain 2 when credits are equal at turn end', () => {
  setUpBoard({installed: [ID.Supercorridor], credits: 5, corpCredits: 5});
  assert.strictEqual(run('MemoryUnits(runner)'), 6);
  assert.strictEqual(run('MaxHandSize(runner)'), 6);
  assert.deepStrictEqual(Array.from(enumerateTrigger('runner.rig.hardware[0]', 'responseOnRunnerDiscardEnds'), c => c.id), [1, 0]);
  discardPhaseEnds();
  assert.strictEqual(run('runner.creditPool'), 7);
  discardPhaseEnds();
  assert.strictEqual(run('runner.creditPool'), 7, 'credits differ: no trigger');
});

test('Runner AI with Supercorridor always gains', () => {
  setUpBoard({installed: [ID.Supercorridor], credits: 3, corpCredits: 3, ai: true});
  assert.deepStrictEqual(Array.from(enumerateTrigger('runner.rig.hardware[0]', 'responseOnRunnerDiscardEnds'), c => c.id), [1]);
  discardPhaseEnds();
  assert.strictEqual(run('runner.creditPool'), 5);
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
console.log('downfall batch 5: ' + cases + ' cases passed');
})();
