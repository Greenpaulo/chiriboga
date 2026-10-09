// Run with: node tests/runner-information-boundary.test.js
// D3: Runner AI decisions must not depend on information a human Runner could
// not have (documentation/runner-ai/principles.md §1). Each scenario swaps the
// hidden card (or hidden order) for another with the same public state and
// asserts the Runner's result is identical. Loads the real engine headlessly.
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
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);
// the engine replaces JSON.stringify inside the context, so copy results out with Node's
const plain = value => JSON.parse(JSON.stringify(value));

// Card ids (playable sets).
const ID = {
  HB: 30035, Tao: 30019, SureGamble: 30030, HedgeFund: 30075, HostileTakeover: 31071,
  Palisade: 30072, Enigma: 31081, Reverb: 36029, IceWall: 31077,
  Cleaver: 30006, Corroder: 31006, Buzzsaw: 30005, GordianBlade: 31033, Carmen: 30015, Echelon: 30025,
  MutualFavor: 30011, Xanadu: 31012,
};

// Player state as Init() prepares it, then a board: Corp ice on HQ, an HQ
// hand, and the Runner's stack, grip and installed cards as given.
function setUpBoard({hqIce = [], hqHand = [ID.HedgeFund], stack = [], grip = [], installed = []} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: 5, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: []});
    CorpTestField(${ID.HB}, [], [${ID.HedgeFund}, ${ID.HedgeFund}], ${JSON.stringify(hqHand)}, [], [],
      ${JSON.stringify(hqIce)}, [], [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, [], ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.forEach(function (c) { c.rezzed = false; c.knownToRunner = false; c.faceUp = false; });
    corp.HQ.cards.forEach(function (c) { c.knownToRunner = false; c.faceUp = false; });
    runner.stack.forEach(function (c) { c.knownToRunner = false; c.faceUp = false; });
    runner.AI = new RunnerAI(); runner.AI._log = function() {};
  `);
  assert.strictEqual(run('viewAllFronts'), false, 'tests must run with viewAllFronts off');
}

const failures = [];
function test(name, fn) {
  try { fn(); if (verbose) console.log('ok   ' + name); }
  catch (error) { failures.push(name + ': ' + error.message); }
}
let cases = 0;

// 1. Trashing a facedown card from HQ changes the HQ model identically
// whichever hidden card it was.
function hqModelAfterTrash(trashTitle, accessed) {
  setUpBoard({hqHand: [ID.HedgeFund, ID.HostileTakeover, ID.SureGamble]});
  run(`runner.AI.suspectedHQCards = [
    {title: "Hedge Fund", cardType: "operation", copies: 1, uncertainty: 0},
    {title: "Hostile Takeover", cardType: "agenda", copies: 1, uncertainty: 0.5}];`);
  run(`var d3Card = corp.HQ.cards.find(function (c) { return c.title == ${JSON.stringify(trashTitle)}; });
    ${accessed ? 'accessingCard = d3Card;' : ''}
    Trash(d3Card, false);
    accessingCard = null;`);
  assert.strictEqual(run('corp.HQ.cards.length'), 2, 'card left HQ');
  return plain(run('runner.AI.suspectedHQCards'));
}
test('facedown HQ trash updates the HQ model independently of the hidden card', () => {
  const results = ['Hedge Fund', 'Hostile Takeover', 'Sure Gamble'].map(t => hqModelAfterTrash(t, false));
  assert.deepStrictEqual(results[1], results[0]);
  assert.deepStrictEqual(results[2], results[0]);
  assert.strictEqual(results[0].length, 2, 'no title removed from the model');
  cases++;
});
test('an accessed (seen) card trashed from HQ is still removed by title', () => {
  const seen = hqModelAfterTrash('Hedge Fund', true);
  assert.deepStrictEqual(seen.map(e => e.title), ['Hostile Takeover']);
  cases++;
});

// 2. The estimate for an unseen ICE is identical when the hidden ICE is
// replaced by a different ICE with the same public state.
function unseenIceEstimate(hiddenIce, withXanadu) {
  // the hidden ice is outermost; unrezzed Palisade gives a hidden Reverb a self-discount
  setUpBoard({hqIce: [ID.Palisade, hiddenIce], installed: withXanadu ? [ID.Xanadu] : []});
  run('runner.rig.resources.forEach(function (c) { c.faceUp = true; });');
  return plain(run(`(function () {
    var ice = corp.HQ.ice[corp.HQ.ice.length - 1];
    var r = runner.AI.rc.IceAI(ice, corp.creditPool);
    return ({subTypes: r.subTypes, sr: r.sr, strength: r.strength, encounterEffects: r.encounterEffects,
      extra: runner.AI.rc._publicRezCostModifier(ice)});
  })()`));
}
test('unseen ICE estimate ignores the hidden card and its own rez-cost effects', () => {
  for (const xanadu of [false, true]) {
    const results = [ID.Reverb, ID.Enigma, ID.IceWall].map(id => unseenIceEstimate(id, xanadu));
    assert.deepStrictEqual(results[1], results[0], 'Reverb vs Enigma' + (xanadu ? ' with Xanadu' : ''));
    assert.deepStrictEqual(results[2], results[0], 'Reverb vs Ice Wall' + (xanadu ? ' with Xanadu' : ''));
    assert.strictEqual(results[0].extra, xanadu ? 1 : 0, 'public modifiers still count');
    cases++;
  }
});

// 3. A tutor's chosen breaker is identical for two Stack orders with the same
// contents.
function tutorPick(stack, grip) {
  setUpBoard({stack, grip});
  return run(`(function () {
    var card = runner.AI._icebreakerInPileNotInHandOrArray(runner.stack, InstalledCards(runner));
    return card ? card.title : null;
  })()`);
}
test('Stack tutor choice does not depend on hidden Stack order', () => {
  // one missing breaker type (Fracter), then all three types missing
  const boards = [
    {stack: [ID.Corroder, ID.SureGamble, ID.Cleaver], grip: [ID.Buzzsaw, ID.Carmen]},
    {stack: [ID.Corroder, ID.GordianBlade, ID.Cleaver, ID.Buzzsaw, ID.Echelon, ID.Carmen], grip: []},
  ];
  for (const board of boards) {
    const forward = tutorPick(board.stack, board.grip);
    const reversed = tutorPick(board.stack.slice().reverse(), board.grip);
    const rotated = tutorPick(board.stack.slice(1).concat(board.stack[0]), board.grip);
    assert.ok(forward, 'a breaker is found');
    assert.strictEqual(reversed, forward);
    assert.strictEqual(rotated, forward);
    cases++;
  }
  // a card hook (Mutual Favor's tutor target) gets the same order-independent choice
  const viaHook = order => {
    setUpBoard({stack: order, grip: [ID.Buzzsaw, ID.Carmen]});
    return run(`cardSet[${ID.MutualFavor}].AIIcebreakerTutor(InstalledCards(runner)).title`);
  };
  assert.strictEqual(viaHook([ID.Corroder, ID.Cleaver]), viaHook([ID.Cleaver, ID.Corroder]));
  cases++;
});

// 4. Breaker-matching helpers return no match for unrezzed, unexposed ICE.
function matchState(hiddenIce, state) {
  setUpBoard({hqIce: [hiddenIce], installed: [ID.Cleaver, ID.Buzzsaw, ID.Carmen]});
  return plain(run(`(function () {
    var ice = corp.HQ.ice[0];
    ${state === 'rezzed' ? 'ice.rezzed = true;' : state === 'exposed' ? 'ice.knownToRunner = true;' : ''}
    var m = runner.AI._matchingBreakerInstalled(ice);
    return ({installed: m ? m.title : null,
      direct: runner.rig.programs.map(function (b) { return runner.AI._breakerMatchesIce(b, ice); })});
  })()`));
}
test('breaker-matching helpers see nothing on unrezzed, unexposed ICE', () => {
  const hidden = [ID.Palisade, ID.Enigma, ID.Reverb].map(id => matchState(id, 'hidden'));
  assert.deepStrictEqual(hidden[1], hidden[0]);
  assert.deepStrictEqual(hidden[2], hidden[0]);
  assert.deepStrictEqual(hidden[0], {installed: null, direct: [false, false, false]});
  cases++;
  assert.strictEqual(matchState(ID.Palisade, 'rezzed').installed, 'Cleaver');
  assert.strictEqual(matchState(ID.Enigma, 'exposed').installed, 'Buzzsaw');
  cases++;
});

if (failures.length) {
  for (const failure of failures) console.error('FAIL ' + failure);
  console.error(failures.length + ' Runner information-boundary check(s) failed.');
  process.exit(1);
}
console.log(cases + ' Runner information-boundary substitution checks passed.');
