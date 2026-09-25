// Run with: node tests/runner-ai-randomness.test.js
// D2: all Runner AI policy randomness goes through the injectable
// RunnerAI._random seam, so seeded tests and the F4 batch harness can
// reproduce Runner decisions. Loads the real engine headlessly (browser
// globals stubbed) and runs real Runner command decisions.
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
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

// Player state as Init() prepares it, then a small board. Tāo Salonga with
// Cleaver and Buzzsaw; Haas-Bioroid with Palisade on HQ and Funhouse on R&D.
function setUpBoard() {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: 5, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: []});
    CorpTestField(30035, [], [30070, 30070, 30070, 30070], [30070, 30070], [], [30054], [30072], [], [],
      cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(30019, [], [30020, 30020, 30020], [30020, 30020, 30020, 30020], [30006, 30005], [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
  `);
}

const seeded = seed => run(`(function() { var r = new Math.seedrandom(${JSON.stringify(String(seed))});
  return function() { return r(); }; })()`);

// One Runner command decision from a fresh RunnerAI with a seeded _random,
// while global Math.random throws.
async function decide(seed) {
  run('runner.AI = new RunnerAI(); runner.AI._log = function() {};');
  const ai = context.runner.AI;
  const source = seeded(seed);
  let rolls = 0;
  ai._random = () => { rolls++; return source(); };
  run('var savedMathRandom = Math.random; Math.random = function() { throw new Error("global Math.random used"); };');
  try {
    const options = run('EnumeratePhase()');
    const index = await ai._computeChoice(options, 'command');
    const target = ai.preferred && ai.preferred.serverToRun ? ai.preferred.serverToRun.serverName : null;
    return {choice: options[index], target, rolls};
  } finally {
    run('Math.random = savedMathRandom;');
  }
}

const failures = [];
async function test(name, fn) {
  try { await fn(); if (verbose) console.log('ok   ' + name); }
  catch (error) { failures.push(name + ': ' + error.message); }
}

(async () => {
  setUpBoard();
  const serverCount = run('corp.remoteServers.length + 3');

  await test('the same seed gives the same Runner decision', async () => {
    const first = await decide(1), second = await decide(1);
    assert.strictEqual(first.choice, 'run');
    assert.deepStrictEqual(second, first);
  });

  await test('the seed, not global randomness, breaks the HQ/R&D tie', async () => {
    // HQ and R&D have equal potential on this board, so the jitter decides.
    const targets = new Set();
    for (const seed of [1, 2, 3, 4, 5, 6]) targets.add((await decide(seed)).target);
    assert.deepStrictEqual([...targets].sort(), ['HQ', 'R&D']);
  });

  await test('one jitter roll per server per decision', async () => {
    assert.strictEqual((await decide(7)).rolls, serverCount);
  });

  await test('_randomIndex stays within 0..n-1 and uses _random', async () => {
    const ai = run('new RunnerAI()');
    for (const [roll, expected] of [[0, 0], [0.5, 2], [0.99999, 4], [1, 4]]) {
      ai._random = () => roll;
      assert.strictEqual(ai._randomIndex(5), expected, 'roll ' + roll);
    }
  });

  await test('no Runner AI policy code calls global randomness', async () => {
    const global = /Math\.random\s*\(|RandomRange\s*\(|Shuffle\s*\(/;
    const source = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
    const classSource = source.slice(source.indexOf('class RunnerAI'));
    const offenders = classSource.split(/\r?\n/).filter(line => global.test(line));
    // Runner card AI hooks (functions named AI*) in the loaded sets.
    for (const [id, card] of Object.entries(context.cardSet)) {
      if (!card || card.player !== context.runner) continue;
      for (const [key, value] of Object.entries(card))
        if (/^AI/.test(key) && typeof value === 'function' && global.test(value.toString()))
          offenders.push(id + ' ' + card.title + ' ' + key);
    }
    assert.deepStrictEqual(offenders, [], 'use this._random / runner.AI._random / runner.AI._randomIndex');
  });

  assert.deepStrictEqual(failures, [], 'Runner AI randomness:\n  ' + failures.join('\n  '));
  console.log('Runner AI randomness: 5 checks passed (seeded decisions reproducible, ' + serverCount +
    ' rolls per decision).');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
