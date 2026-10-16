// Run with: node tests/vantagepoint-batch1.test.js
// Permanent batch 1 acceptance, adapted from the retained independent headless
// harness. Only browser rendering/audio are inert; engine and AI paths are real.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../../../../..');
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



// Batch 1 acceptance: real dispatch, payments, command selectors and planners.
const c = context;
c.PlaySound = () => {};
c.PlayCreditGainSound = () => {};
c.particleSystems = {breaksubroutine: {spawnRect: {}}};
c.Render = () => {};
c.UpdateCounters = () => {};
c.LogError = message => {throw Error(message);};
function reset() {
  setUpBoard();
  run('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI._random = function () {return 0;}; corp.AI = null;');
  c.runner.grip = []; c.runner.rig = {programs: [], hardware: [], resources: []};
  c.corp.HQ.ice = []; c.corp.RnD.ice = []; c.corp.archives.ice = [];
  c.attackedServer = null; c.encountering = false; c.approachIce = -1;
  c.removedFromGame = [];
}
function card(id, pile) {
  const x = c.InstanceCard(id, null, null); pile.push(x); x.cardLocation = pile; return x;
}
function success(server) {
  c.attackedServer = server; c.currentPhase = c.phases.runSuccessful;
  c.currentPhase.Init();
}
function history(chain) {
  for (const server of [c.corp.HQ, c.corp.RnD, c.corp.archives]) success(server);
  c.attackedServer = null; c.currentPhase = c.phases.runnerActionMain;
  assert.strictEqual(chain.Enumerate().length, 1);
}
// Independent re-review probes. Assertions describe observed decisions, not repair acceptance.
async function review() {
  reset();
  const chain = card(36001, c.runner.grip); history(chain);
  c.runner.clickTracker = 1; c.runner.creditPool = 10;
  c.runner.scoreArea = [{player: c.runner, agendaPoints: 6}];
  const remote = c.NewServer('Known winning steal', false); c.corp.remoteServers.push(remote);
  card(30070, remote.root).knownToRunner = true;
  for (let i = 0; i < 2; i++) {
    const padServer = c.NewServer('Economy ' + i, false); c.corp.remoteServers.push(padServer);
    card(31080, padServer.root).rezzed = true;
  }
  const options = ['play', 'run', 'gain'];
  const withChain = options[await c.runner.AI.CommandChoice(options)];
  assert.strictEqual(withChain, 'play'); assert.strictEqual(c.runner.AI.preferred.cardToPlay, chain);
  c.runner.grip = []; c.runner.AI.preferred = null;
  const withoutChain = options[await c.runner.AI.CommandChoice(options)];
  assert.strictEqual(withoutChain, 'run'); assert.strictEqual(c.runner.AI.preferred.serverToRun, remote);
  const findings = [{case: 'CR4 last-click winning access', withChain, withoutChain}];
  for (const breakerId of [31006, 36004]) {
    reset(); card(breakerId, c.runner.rig.programs); card(36003, c.runner.rig.hardware);
    for (let i = 0; i < 2; i++) card(31077, c.corp.HQ.ice).rezzed = true;
    c.runner.creditPool = 1; c.runner.clickTracker = 1;
    const path = c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null);
    assert(path, 'two zero-strength walls cost two paid breaks minus one rebate');
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    const security = c.corp.AI._evaluateServerSecurity(c.corp.HQ);
    assert.strictEqual(security.isSecure, breakerId === 31006);
    findings.push({case: 'TT1 opposing income', breakerId, runnerComplete: !!path,
      corpSecure: security.isSecure, totalMandatoryBreakCost: security.totalMandatoryBreakCost});
    c.runner.rig.hardware[0].usedThisTurn = true;
    assert.strictEqual(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null), null);
    assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, true);
    c.runner.rig.hardware[0].usedThisTurn = false; c.runner.creditPool = 0;
    assert.strictEqual(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null), null);
    assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, true);
  }
  console.log(JSON.stringify(findings, null, 2));
}
review().catch(e => {console.error(e.stack); process.exitCode = 1;});
