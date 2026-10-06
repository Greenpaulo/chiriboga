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
// Second independent re-review: real selectors/planners, no decision stubs.
const results = [];
async function review() {
  // A winning access beats denying the Corp's own simultaneous winning score.
  for (const publicity of [0, 1]) {
    reset(); const event = card(36001, c.runner.grip); history(event);
    c.runner.clickTracker = 1; c.runner.creditPool = 1;
    c.runner.scoreArea = [{player: c.runner, agendaPoints: 6}];
    c.corp.scoreArea = [{player: c.corp, agendaPoints: 6}];
    c.corp.badPublicity = publicity;
    const target = c.NewServer('Both sides can win', false); c.corp.remoteServers.push(target);
    const agenda = card(30070, target.root); agenda.knownToRunner = true; agenda.advancement = 3;
    agenda.stealCost = {credits: 2};
    const options = ['play', 'run', 'gain'];
    const selected = options[await c.runner.AI.CommandChoice(options)];
    assert.strictEqual(selected, publicity ? 'run' : 'play');
    assert.strictEqual(c.attackedServer, null);
    if (publicity) {
      assert.strictEqual(c.runner.AI.preferred.serverToRun, target);
      c.executingCommand = 'run'; const servers = c.currentPhase.Enumerate.run();
      assert.strictEqual(servers[await c.runner.AI.SelectChoice(servers)].server, target);
      // Real access legality confirms the promised steal with run credits.
      c.runner.temporaryCredits = publicity; c.attackedServer = target; c.accessingCard = agenda;
      assert(c.CheckSteal());
    } else assert.strictEqual(c.runner.AI.preferred.cardToPlay, event);
    results.push({case: 'simultaneous winning threats / paid steal', publicity, selected});
  }
  // Test a longer route and a positive-strength route: rebate is conditional and once only.
  for (const strength of [0, 1, 2]) for (const pool of [1, 2, 3]) {
    reset(); card(31006, c.runner.rig.programs); const tailor = card(36003, c.runner.rig.hardware);
    for (let i = 0; i < 3; i++) { const wall = card(31077, c.corp.HQ.ice); wall.rezzed = true; wall.strength = strength; }
    c.runner.creditPool = pool; c.runner.clickTracker = 1;
    const cost = strength <= 1 ? 2 : 3;
    const route = await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ, null, null, false);
    assert.strictEqual(!!route, pool >= cost);
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    const ownAI = c.runner.AI; c.runner.AI = new Proxy({}, {get() {throw Error('private Runner state');}});
    for (const item of c.runner.grip) Object.defineProperty(item, 'title', {get() {throw Error('hidden grip identity');}, configurable:true});
    const security = c.corp.AI._evaluateServerSecurity(c.corp.HQ); c.runner.AI = ownAI;
    assert.strictEqual(security.isSecure, pool < cost);
    assert.strictEqual(tailor.usedThisTurn, false); assert.strictEqual(c.runner.creditPool, pool);
    assert.strictEqual(c.attackedServer, null);
    if (route) assert.strictEqual(route[route.length-1].runner_credits_lost, strength <= 1 ? -1 : 0);
    results.push({case: 'three ordinary-breaker barriers', strength, pool, feasible:!!route, corpSecure:security.isSecure});
  }
  // Restricted-only hosted credits reduce real ICE, cannot pay the ordinary break.
  reset(); const corsair = card(36004, c.runner.rig.programs);
  const source = {title:'Public stealth source', player:c.runner, cardType:'hardware', subTypes:['Stealth'], credits:1,
    canUseCredits(doing, target) {return doing === 'using' && target === null;}};
  c.runner.rig.hardware.push(source); source.cardLocation = c.runner.rig.hardware;
  const wall = card(31077, c.corp.HQ.ice); wall.rezzed = true; wall.strength = 3;
  c.runner.creditPool = 1; c.attackedServer = c.corp.HQ; c.approachIce = 0; c.encountering = true;
  assert.strictEqual(corsair.abilities[0].Enumerate.call(corsair).length, 0);
  assert.strictEqual(corsair.abilities[1].Enumerate.call(corsair).length, 1);
  corsair.abilities[1].Resolve.call(corsair, {});
  assert.strictEqual(source.credits, 0); assert.strictEqual(c.runner.creditPool, 1); assert.strictEqual(c.Strength(wall), 0);
  assert.strictEqual(corsair.abilities[1].Enumerate.call(corsair).length, 0);
  assert.strictEqual(corsair.abilities[0].Enumerate.call(corsair).length, 1);
  corsair.abilities[0].Resolve.call(corsair, {subroutine:wall.subroutines[0]});
  assert.strictEqual(c.runner.creditPool, 0); assert.strictEqual(wall.subroutines[0].broken, true);
  c.AutomaticTriggers('responseOnEncounterEnds');
  assert.strictEqual(corsair.barrierDebuff, 0); assert.strictEqual(c.Strength(wall), 3);
  results.push({case:'live restricted reduction then pool break and cleanup', sourceCredits:source.credits, pool:c.runner.creditPool});
  fs.writeFileSync(path.join(__dirname, 'vantagepoint-batch1-second-rereview-results.json'), JSON.stringify(results, null, 2)+'\n');
  console.log(results.length+' independent re-review scenarios passed.');
}
review().catch(e => {console.error(e.stack); process.exitCode = 1;});
