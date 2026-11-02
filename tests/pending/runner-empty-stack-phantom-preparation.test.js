// Reconstructs the final board in runner_with_no_stack_does_nothing_except_gain_creds.txt.
// Assumptions: first click of a Runner turn, 24 credits (last logged Runner turn),
// Corp 6 credits (same turn), fresh AI caches and fixed jitter. Final dump includes
// the following Corp mandatory draw; keep it because no hidden card identities
// are used by this regression. The narrower oracle is impossible damage prep,
// not that a lethal run should replace gaining credits.
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
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js', 'sets/downfall.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);


run(`    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: 5, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: []});

runner.AI = new RunnerAI(); runner.AI._random = function() {return 0.5;};
RunnerTestField(35002, [30020,30007,35014,35004,30004,30028,30007,30002,35006,30025,30002,30007,30034,35006,30028,35004,30004,30008,30002,30005,30008,30025,30005,30034,35009,30020,35014,30030,30020,30030,35009,30030,30028,30013,30004,30008,30025,35007], [], [], [30034,30031,30031,35006,30031,35009,30005,35007,35007], [26041,30069], cardBackTexturesRunner,glowTextures,strengthTextures);
CorpTestField(26039, [30075,30075,30045,35055,30045,30045,35055,30049,35078,26045], [26041,30069,30072,26046,26042,26036,30075,36041,35055,26044,35056,26040,26042,35078,30069,26044,35054,35052,35052], [26040,26043,35078,35054,36045,26043], [], [36045,35053], [26046,30072,36041], [[26042,35053,35054],[35048,35053]], [26041,26040], cardBackTexturesCorp,glowTextures,strengthTextures);
runner.scoreArea[0].AITurnsInstalled=1;
runner.scoreArea[0].rezzed=false;
runner.scoreArea[1].AITurnsInstalled=5;
runner.scoreArea[1].rezzed=false;
runner.heap[1].host=null;
runner.heap[3].host=null;
runner.heap[4].host=null;
runner.heap[5].host=null;
runner.heap[6].host=null;
runner.heap[8].hostedCards = [];
runner.heap[9].host=null;
runner.heap[11].host=null;
runner.heap[13].hostedCards = [];
runner.heap[14].host=null;
runner.heap[15].host=null;
runner.heap[16].host=null;
runner.heap[17].host=null;
runner.heap[19].host=null;
runner.heap[20].host=null;
runner.heap[21].host=null;
runner.heap[22].host=null;
runner.heap[23].host=null;
runner.heap[23].notInstalled=false;
runner.heap[24].host=null;
runner.heap[25].host=null;
runner.heap[27].host=null;
runner.heap[27].notInstalled=false;
runner.heap[29].host=null;
runner.heap[30].host=null;
runner.heap[32].host=null;
runner.heap[33].host=null;
runner.heap[34].host=null;
runner.heap[35].host=null;
runner.heap[36].host=null;
runner.heap[37].host=null;
runner.rig.hardware[2].hostedCards = [];
corp.scoreArea[0].faceUp=true;
corp.scoreArea[0].AITurnsInstalled=2;
corp.scoreArea[1].faceUp=true;
corp.scoreArea[1].AITurnsInstalled=2;
corp.archives.cards[0].faceUp=true;
corp.archives.cards[1].faceUp=true;
corp.archives.cards[2].rezzed=true;
corp.archives.cards[2].host=null;
corp.archives.cards[3].faceUp=true;
corp.archives.cards[4].faceUp=true;
corp.archives.cards[4].host=null;
corp.archives.cards[5].faceUp=true;
corp.archives.cards[5].host=null;
corp.archives.cards[6].faceUp=true;
corp.archives.cards[8].faceUp=true;
corp.archives.cards[9].faceUp=true;
corp.RnD.root[0].rezzed=true;
corp.RnD.root[0].power=2;
corp.RnD.cards[3].firstApproach=false;
corp.HQ.root[0].firstApproach=false;
corp.HQ.ice[0].rezzed=true;
corp.HQ.ice[1].rezzed=true;
corp.remoteServers[0].root[0].rezzed=true;
corp.remoteServers[0].root[0].AITurnsInstalled=22;
corp.remoteServers[0].ice[0].rezzed=true;
corp.remoteServers[1].root[0].advancement=2;
corp.remoteServers[1].root[0].AITurnsInstalled=4;
corp.remoteServers[1].ice[0].rezzed=true;
corp.remoteServers[1].AISuccessfulRuns=4;
corp.archives.AISuccessfulRuns=1;
if (runner.AI) runner.AI.suspectedHQCards = [{title:'Neurospike',cardType:'operation',copies:2,uncertainty:0.3911111111111111},{title:'Project Yagi-Uda',cardType:'agenda',copies:1,uncertainty:0.2926933333333334},{title:'Measured Response',cardType:'operation',copies:1,uncertainty:0.4303111111111111},];

runner.creditPool = 24; corp.creditPool = 6; runner.clickTracker = 4;
activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
`);

let passed = 0, failed = 0;
async function test(name, fn) {
  try { await fn(); passed++; if (verbose) console.log('PASS: ' + name); }
  catch (error) { failed++; console.error('FAIL: ' + name + ': ' + error.message); }
}
async function main() {
  const ai = context.runner.AI;
  const rnd = context.corp.RnD;
  await test('log reconstruction has no cards to draw or hold and chooses gain', async () => {
    assert.strictEqual(context.runner.stack.length, 0);
    assert.strictEqual(context.runner.grip.length, 0);
    const options = run('EnumeratePhase()');
    assert(!options.includes('draw'));
    const index = await ai._computeChoice(options, 'command');
    assert.strictEqual(options[index], 'gain');
    assert.strictEqual(await ai._commonRunCalculationChecksAsync(rnd, null, null, false), null);
  });
  await test('R&D rejection models its unrezzed unknown ICE as a sentry', async () => {
    const ice = rnd.ice[0];
    assert.strictEqual(context.PlayerCanLook(context.runner, ice), false);
    const model = ai.rc.IceAI(ice, context.corp.creditPool);
    assert(model.subTypes.includes('Sentry'));
    assert(!model.subTypes.includes('Code Gate'));
  });
  await test('Buzzsaw permits a safe run once R&D Mycoweb is known and rezzed', async () => {
    const ice = rnd.ice[0];
    const wasRezzed = ice.rezzed;
    ice.rezzed = true;
    try {
      const path = await ai._commonRunCalculationChecksAsync(rnd, null, null, false);
      assert(path && path.length > 0);
      assert(path[path.length - 1].runner_credits_spent <= context.runner.creditPool);
      assert(path.some(point => point.sr_broken.length > 0));
    } finally { ice.rezzed = wasRezzed; }
  });
  await test('empty stack cannot supply the two cards needed to survive R&D after prep', async () => {
    const prep = await ai._commonRunCalculationChecksAsync(rnd, null, null, true);
    assert(!prep,
      'foresight accepts a two-net-damage R&D route with empty grip/stack and no card recovery');
  });
  await test('actual cards in grip allow the damaging R&D route', async () => {
    run('for (var i=0; i<3; i++) MoveCard(runner.heap[0], runner.grip);');
    try {
      const path = await ai._commonRunCalculationChecksAsync(rnd, null, null, false);
      assert(path && path.length > 0);
    } finally { run('while (runner.grip.length) MoveCard(runner.grip[0], runner.heap);'); }
  });
  await test('empty grip still allows the safe Archives route', async () => {
    const path = await ai._commonRunCalculationChecksAsync(context.corp.archives, null, null, false);
    assert(path && path.length > 0);
  });
  console.log('Runner empty-stack preparation: ' + passed + ' passed, ' + failed + ' failed');
  process.exitCode = failed ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
