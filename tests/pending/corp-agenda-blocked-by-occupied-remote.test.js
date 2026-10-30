// Known-red triage reproduction: agendas stranded behind an occupied remote.
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
  'sets/elevation.js', 'sets/vantagepoint.js', 'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);


// The standard Corp fixture runner does not load Downfall. Use the real
// engine here, preserving the reconstruction assumptions with the dump.
const fixture = String.raw`
// PHASE: Phase_Main
// OPTIONS: install, advance, gain, draw, play, trigger, purge
// EXPECT: install
// EXPECT_SERVER: Remote 0
// SETUP: corp.creditPool=13; corp.clickTracker=2; corp.identityCard.usedThisTurn=true; runner.creditPool=8; runner.clickTracker=0; reviewAI._completedIceInstalls=6; Object.assign(reviewAI.options,{openingHqThenRdIce:true,secureScoringServerGate:false,serverAtRiskInstallOverride:false,committedAgendaReserveBypass:false,emptyArchivesRunPressure:true,valuelessServerDebtReset:false,postureEpochs:true,matchLocalPostureFeedback:true,iceMarginalSecurity:true,agendaCommitmentPlan:true,agendaExposureTable:true,agendaDestinationPlan:false});
// SOURCE: documentation/debug-logs/bug_raised/corp_wont_play_an_agenda.txt lines 1216-1247 and final dump 1302-1344.
// NOTE: Reconstruction from the final dump, not a captured decision. Restore 13 credits and two clicks after the first gain in the final Corp action phase; assume Hyoubu has already used its once-per-turn reward to isolate agenda placement; omit the unknown sixth card drawn and discarded that turn. Post-turn resource counters are kept; no prior pressure/posture history was captured. Explicitly use the owner's preferred flags; the log itself does not serialize them. Expected policy: replace the asset in the only protected remote rather than holding every agenda indefinitely; this is strategic, not a legality oracle.
CorpTestField(26039, [26036,26042,35055,35055,30075,26042,35055,30045,35078,35078,35078,26044,26044], [30075,26042,35048,26046,35054,26041,26040,35053,30049,30045,26045,35053,26046,26043,35052,36045,30069,35056,30075,35052,26041,30072,30045], [26040,26041,26040,30069,30069], [30072], [36045,35053], [36041,35054], [[26043,35054,36041]], [], cardBackTexturesCorp,glowTextures,strengthTextures);
RunnerTestField(26010, [26012,30020,26028,30020,30029,30016,35018,26018,30030,30031,26012,30020,35021,26024,26029,30011,36016,30030,26017,26011,30030,26011], [26014,26013,26028,26014,26013,35018,26016,30018,35020,26011], [26015], [26018,35021,26027,30018,35022,26017,35022,26015,30031,26014,35020,30015], [], cardBackTexturesRunner,glowTextures,strengthTextures);
runner.stack[6].brokenThisEncounter=[];
runner.heap[4].host=null;
runner.heap[5].host=null;
runner.heap[6].hostedCards = [];
runner.heap[6].host=null;
runner.heap[13].host=null;
runner.heap[14].host=null;
runner.heap[15].installingCard=runner.rig.programs[1];
runner.heap[16].host=null;
runner.heap[18].encounteredThisRun=true;
runner.heap[18].host=null;
runner.rig.resources[3].credits=9;
runner.rig.resources[4].credits=1;
runner.rig.resources[5].power=3;
runner.rig.resources[5].encounteredThisRun=true;
runner.rig.resources[6].credits=5;
corp.archives.ice[0].rezzed=true;
corp.archives.cards[0].faceUp=true;
corp.archives.cards[1].faceUp=true;
corp.archives.cards[1].host=null;
corp.archives.cards[2].faceUp=true;
corp.archives.cards[3].faceUp=true;
corp.archives.cards[4].faceUp=true;
corp.archives.cards[5].faceUp=true;
corp.archives.cards[6].faceUp=true;
corp.archives.cards[7].faceUp=true;
corp.archives.cards[8].faceUp=true;
corp.archives.cards[9].faceUp=true;
corp.archives.cards[10].faceUp=true;
corp.archives.cards[11].faceUp=true;
corp.RnD.root[0].knownToRunner=true;
corp.RnD.ice[0].rezzed=true;
corp.RnD.cards[3].firstApproach=false;
corp.RnD.cards[12].firstApproach=false;
corp.HQ.ice[0].rezzed=true;
corp.HQ.ice[1].rezzed=true;
corp.remoteServers[0].root[0].rezzed=true;
corp.remoteServers[0].root[0].AITurnsInstalled=17;
corp.remoteServers[0].ice[0].knownToRunner=true;
corp.remoteServers[0].AISuccessfulRuns=1;
corp.archives.AISuccessfulRuns=2;
corp.RnD.AISuccessfulRuns=1;
`;
function setUpBoard(emptyRoot = false) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {};
    Object.assign(corp, {identityCard: null, creditPool: 12, clickTracker: 3, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: 8, temporaryCredits: 0,
      clickTracker: 0, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    corp.AI = new CorpAI(); var reviewAI = corp.AI;
    reviewAI._random = function() { return 0.5; };
    reviewAI._log = function(message) { decisionLog.push(message); };
    activePlayer = corp; playerTurn = corp; currentPhase = phases.corpActionMain;
  `);
  run(fixture);
  run(fixture.match(/^\/\/ SETUP: (.*)$/m)[1]);
  run('activePlayer = corp; playerTurn = corp; currentPhase = phases.corpActionMain; executingCommand = "";');
  if (emptyRoot) run('var removed = corp.remoteServers[0].root.pop(); corp.archives.cards.push(removed); removed.cardLocation = corp.archives.cards;');
}

context.decisionLog = [];
context.options = ['install', 'advance', 'gain', 'draw', 'play', 'trigger', 'purge'];
const failures = [];
let passed = 0;
for (const emptyRoot of [false, true]) {
  const name = emptyRoot ? 'asset removed: secure remote still rejected' : 'captured asset occupancy: agenda placement stalls';
  try {
    context.decisionLog.length = 0;
    setUpBoard(emptyRoot);
    const facts = run(`({
      room: corp.AI._remoteHasRoom(corp.remoteServers[0]),
      secure: corp.AI._evaluateServerSecurity(corp.remoteServers[0]).isSecure,
      emptyProtected: corp.AI._emptyProtectedRemotes().length,
      remoteScore: corp.AI._protectionScore(corp.remoteServers[0], {}),
      hqScore: corp.AI._protectionScore(corp.HQ, {returnArchivesLowerScoreForHQIfBackdoor:true}),
      archivesScore: corp.AI._protectionScore(corp.archives, {ignoreBackdoorFromArchives:true}),
      agendas: corp.AI._agendasInHand(),
      agendaOptions: corp.AI._rankedInstallOptions(corp.HQ.cards).filter(o => o.cardToInstall.cardType === 'agenda').length,
      legalAgendaTarget: ChoicesCardInstall(corp.HQ.cards[0]).some(o => o.server === corp.remoteServers[0])
    })`);
    assert.strictEqual(facts.legalAgendaTarget, true, 'engine must offer the remote as a legal agenda destination');
    const chosen = run('options[corp.AI.Choice(options.slice(), "command")]');
    if (verbose) console.log(name + ': ' + JSON.stringify(facts) + '\n' + context.decisionLog.join('\n'));
    assert.strictEqual(chosen, 'install', name + ': ' + JSON.stringify(facts));
    const preferred = run('corp.AI.preferred');
    assert.ok(preferred && preferred.cardToInstall, 'must select an agenda install, not an arbitrary fallback');
    assert.strictEqual(preferred.cardToInstall.cardType, 'agenda');
    assert.strictEqual(preferred.serverToInstallTo, run('corp.remoteServers[0]'));
    passed++;
  } catch (error) {
    failures.push(name + ': ' + error.message);
  }
}
for (const failure of failures) console.error('FAIL ' + failure);
console.log('Agenda placement stall: ' + passed + ' passed, ' + failures.length + ' failed');
if (failures.length) process.exitCode = 1;
