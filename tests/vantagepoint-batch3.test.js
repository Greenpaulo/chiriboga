// Run with: node tests/vantagepoint-batch3.test.js
// Permanent batch 3 acceptance, adapted from the retained independent headless
// harness. Only browser rendering/audio are inert; engine and AI paths are real.
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
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/uprising.js', 'sets/elevation.js', 'sets/vantagepoint.js',
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



const c = context;
c.PlaySound = () => {}; c.PlayCreditGainSound = () => {}; c.Render = () => {}; c.UpdateCounters = () => {};
c.suppressCreditDrawSound = true; c.particleSystems = {breaksubroutine: {spawnRect: {}}};
function reset() {
  setUpBoard();
  run('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI._random = function () {return 0;}; corp.AI = null;');
  c.runner.grip = []; c.runner.rig = {programs: [], hardware: [], resources: []};
  c.corp.HQ.ice = []; c.corp.RnD.ice = []; c.corp.archives.ice = [];
  c.attackedServer = null; c.encountering = false; c.approachIce = -1; c.executingCommand = '';
}
function card(id, pile) {
  const x = c.InstanceCard(id, null, null); pile.push(x); x.cardLocation = pile; return x;
}
async function command(options) {
  const legal = options.filter(cmd => !c.currentPhase.Enumerate[cmd] ||
    c.currentPhase.Enumerate[cmd]().length > 0);
  return legal[await c.runner.AI.CommandChoice(legal)];
}
function passResponses() {
  for (let i = 0; i < 40; i++) {
    const phase = c.currentPhase;
    if (!phase.Enumerate.n || !phase.Enumerate.n.call(phase).length) break;
    phase.Resolve.n.call(phase, {});
  }
}
async function kompromatReward(mode, credits = 5) {
  reset(); const event = card(36010, c.runner.resolvingCards);
  event.runningWithThis = true; event.runWasSuccessful = mode !== 'failed';
  c.attackedServer = c.corp.HQ; c.corp.creditPool = credits;
  let ice = null;
  if (mode === 'derez' || mode === 'unfunded') ice = card(31077, c.corp.HQ.ice);
  if (ice) ice.rezzed = true;
  run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
  event.responseOnRunEnds.Resolve.call(event);
  if (mode !== 'failed') {
    const legal = c.currentPhase.Enumerate.continue();
    const selected = legal[await c.corp.AI.SelectChoice(legal)];
    if (ice && credits > 0) assert(selected.derez, 'funded cheap re-rez preserves defense without permanent publicity');
    else assert(selected.badPublicity);
    c.currentPhase.Resolve.continue(selected); passResponses();
  }
  assert.strictEqual(event.runningWithThis, false); assert.strictEqual(event.runWasSuccessful, false);
  assert(!c.runner.resolvingCards.includes(event), 'event removed only after reward completes');
  assert.strictEqual(c.corp.badPublicity, mode === 'publicity' || mode === 'unfunded' ? 1 : 0);
  if (ice) assert.strictEqual(ice.rezzed, mode === 'unfunded');
}
async function rotaryAccess(clicks, pool, win = false, taxed = false) {
  reset(); const rotary = card(36014, c.runner.rig.hardware);
  c.runner.clickTracker = clicks; c.runner.creditPool = pool; c.corp.RnD.cards = [];
  const extra = card(win ? 30070 : 30075, c.corp.RnD.cards);
  if (win) {extra.knownToRunner = true; c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];}
  card(30075, c.corp.RnD.cards);
  if (taxed) {card(31077, c.corp.RnD.ice).rezzed = true; card(30006, c.runner.rig.programs);}
  c.runner.AI.cachedPotentials = [];
  const predicted = c.runner.AI._calculateBestCompleteRun(c.corp.RnD, 0, 0, -1, 0, null, 0);
  const before = {pool: c.runner.creditPool, clicks: c.runner.clickTracker};
  c.attackedServer = c.corp.RnD; c.approachIce = -1;
  // Actual resources at breach after paying one click and any ICE costs.
  c.runner.clickTracker--; if (taxed) c.runner.creditPool--;
  c.currentPhase = {title: rotary.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
  const choices = rotary.responseOnBreach.Enumerate.call(rotary, c.corp.RnD);
  const selected = choices[await c.runner.AI.SelectChoice(choices)];
  if (verbose) console.log('Rotary', clicks, pool, win, taxed, selected.use, !!predicted);
  rotary.responseOnBreach.Resolve.call(rotary, selected); passResponses();
  assert.strictEqual(rotary.modifyBreachAccess.Resolve.call(rotary), selected.use ? 1 : 0);
  assert.strictEqual(c.runner.tags, selected.use ? 1 : 0);
  rotary.responseOnRunEnds.Resolve.call(rotary); assert.strictEqual(rotary.additionalAccessThisBreach, false);
  return {use: selected.use, predicted, before};
}
async function tailgateChoice(credits, blocked = false) {
  reset(); c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
  for (let i = 0; i < 5; i++) card(30075, c.corp.HQ.cards);
  const event = card(36012, c.runner.grip);
  for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  if (blocked) card(31079, c.corp.HQ.root).rezzed = true;
  c.runner.creditPool = credits;
  const action = await command(['play', 'run', 'gain']);
  if (action === 'play') assert.strictEqual(c.runner.AI.preferred.cardToPlay, event);
  return {action, event};
}
async function goodsChoice(memory, tagged, credits, clicks) {
  reset(); for (const id of [30005, 36015, 36005].slice(0, memory)) card(id, c.runner.rig.programs);
  const goods = card(36013, c.runner.grip); c.runner.tags = tagged;
  c.runner.creditPool = credits; c.runner.clickTracker = clicks;
  const action = await command(['install', 'gain']);
  if (action === 'install') {
    assert.strictEqual(c.runner.AI.preferred.cardToInstall, goods);
    c.executingCommand = 'install'; const legal = c.currentPhase.Enumerate.install();
    const choice = legal[await c.runner.AI.SelectChoice(legal)]; assert.strictEqual(choice.card, goods);
    c.executingCommand = ''; c.currentPhase.Resolve.install(choice);
    // Install's confirmation uses actual legal install options and trigger flow.
    if (c.currentPhase.Enumerate.continue) c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
    passResponses();
    assert.strictEqual(c.runner.tags, tagged || 1);
  }
  return action;
}
async function underdomeChoice(rezzed, clicks, grip = 0, future = false, corpCredits = 5) {
  reset(); const resource = card(36016, c.runner.grip); resource.iceRezzedThisTurn = rezzed;
  c.runner.creditPool = 1; c.runner.clickTracker = clicks; c.corp.creditPool = corpCredits;
  for (let i = 0; i < grip; i++) card(30020, c.runner.grip);
  if (future) {const ice = card(31077, c.corp.HQ.ice); ice.knownToRunner = true;
    await command(['run', 'gain']); c.runner.AI.preferred = null;}
  const action = await command(['install', 'gain']);
  if (action === 'install') assert.strictEqual(c.runner.AI.preferred.cardToInstall, resource);
  return action;
}
async function bakerChoice(used, fuel = 1) {
  reset(); const baker = card(36015, c.runner.rig.programs); baker.usedThisTurn = used;
  const stealth = card(36020, c.runner.rig.hardware); stealth.credits = fuel;
  card(31077, c.corp.HQ.ice).rezzed = true;
  c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30075, c.corp.HQ.cards);
  c.corp.RnD.cards = []; card(30075, c.corp.RnD.cards); c.corp.archives.cards = [];
  for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  c.runner.creditPool = 0;
  const action = await command(['run', 'trigger', 'gain']);
  if (action === 'trigger') assert.strictEqual(c.runner.AI.preferred.cardToTrigger, baker);
  return action;
}
async function main() {
  reset(); c.runner.identityCard = c.InstanceCard(36009, null, null);
  c.runner.tags = 1; c.runner.creditPool = 2;
  assert.strictEqual(await command(['trigger', 'remove', 'draw', 'gain']), 'trigger', 'Vic saves a credit and draws while removing the tag');
  assert.strictEqual(c.runner.AI.preferred.cardToTrigger, c.runner.identityCard);
  c.executingCommand = 'trigger';
  const legal = c.currentPhase.Enumerate.trigger();
  const selected = legal[await c.runner.AI.SelectChoice(legal)];
  assert.strictEqual(selected.card, c.runner.identityCard);
  c.executingCommand = ''; c.currentPhase.Resolve.trigger(selected);
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
  passResponses();
  assert.strictEqual(c.runner.tags, 0); assert.strictEqual(c.runner.creditPool, 1);
  assert.strictEqual(c.runner.clickTracker, 3); assert.strictEqual(c.runner.grip.length, 1);
  assert(c.runner.identityCard.usedThisTurn);
  for (const state of [{used: true, credits: 2}, {used: false, credits: 0}]) {
    reset(); c.runner.identityCard = c.InstanceCard(36009, null, null);
    c.runner.identityCard.usedThisTurn = state.used; c.runner.tags = 1; c.runner.creditPool = state.credits;
    assert.notStrictEqual(await command(['trigger', 'remove', 'gain']), 'trigger');
  }
  for (const size of [0, 8]) {
    reset(); c.runner.identityCard = c.InstanceCard(36009, null, null); c.runner.tags = 1;
    c.runner.creditPool = 1; c.runner.stack = [];
    for (let i = 0; i < size; i++) card(30020, c.runner.grip);
    assert.strictEqual(await command(['trigger', 'gain']), 'trigger', 'overdraw and empty Stack still save the removal credit');
  }
  reset(); c.runner.identityCard = c.InstanceCard(36009, null, null); c.runner.tags = 1;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  const remote = c.NewServer('Winning steal', false); c.corp.remoteServers.push(remote);
  card(30070, remote.root).knownToRunner = true;
  assert.strictEqual(await command(['trigger', 'remove', 'run', 'gain']), 'run');
  assert.strictEqual(c.runner.AI.preferred.serverToRun, remote);
  for (const mode of ['publicity', 'derez', 'failed']) await kompromatReward(mode);
  await kompromatReward('unfunded', 0);
  reset(); const preventedReward = card(36010, c.runner.resolvingCards);
  preventedReward.runningWithThis = true; c.attackedServer = c.corp.HQ;
  c.currentPhase = c.phases.runSuccessful; c.currentPhase.Init(); passResponses();
  assert(preventedReward.runWasSuccessful, 'real no-argument successful-run dispatch sets the reward');
  c.currentPhase = c.phases.runnerActionMain;
  const preventer = {title: 'Publicity prevention', player: c.corp, cardType: 'asset', rezzed: true,
    responsePreventableAddBadPublicity: {Resolve() {c.intended.badPublicity = 0;}}};
  c.corp.HQ.root.push(preventer); preventer.cardLocation = c.corp.HQ.root;
  preventedReward.responseOnRunEnds.Resolve.call(preventedReward);
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue().find(x => x.badPublicity));
  assert(c.runner.resolvingCards.includes(preventedReward), 'removal waits for prevention');
  if (!c.currentPhase.Enumerate.trigger().some(x => x.card === preventer)) c.currentPhase.Resolve.n({});
  c.currentPhase.Resolve.trigger(c.currentPhase.Enumerate.trigger().find(x => x.card === preventer));
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]); passResponses();
  assert.strictEqual(c.corp.badPublicity, 0); assert(c.removedFromGame.includes(preventedReward));
  reset(); const sell = card(36011, c.runner.grip);
  const keptResource = card(36008, c.runner.rig.resources);
  const exhausted = card(36016, c.runner.rig.resources); c.runner.clickTracker = 1;
  assert.strictEqual(c.runner.AI._wastefulToPlay(sell, sell.Enumerate()), false);
  assert.strictEqual(await command(['play', 'gain']), 'play');
  assert.strictEqual(c.runner.AI.preferred.cardToPlay, sell);
  c.executingCommand = 'play'; const plays = c.currentPhase.Enumerate.play();
  c.currentPhase.Resolve.play(plays[await c.runner.AI.SelectChoice(plays)]);
  const targets = c.currentPhase.Enumerate.continue();
  const target = targets[await c.runner.AI.SelectChoice(targets)];
  assert.strictEqual(target.card, exhausted);
  c.executingCommand = ''; c.currentPhase.Resolve.continue(target); passResponses();
  assert(c.runner.heap.includes(exhausted)); assert(c.runner.rig.resources.includes(keptResource));
  assert.strictEqual(c.runner.creditPool, 8);
  assert.strictEqual(c.runner.grip.length, 2);
  reset(); const valuableSell = card(36011, c.runner.grip);
  const valuable = card(36008, c.runner.rig.resources); // zero install cost, repeatable draw engine
  assert.strictEqual(await command(['play', 'gain']), 'gain', 'preserve useful zero-cost resource');
  assert.strictEqual(c.runner.AI._wastefulToPlay(valuableSell, valuableSell.Enumerate()), true);
  valuable.AIOkToTrash = () => true; valuable.hostedCards = [];
  const retainedChild = card(36007, valuable.hostedCards); retainedChild.host = valuable;
  assert.strictEqual(await command(['play', 'gain']), 'gain', 'useful hosted cards outweigh sacrificing their host');
  assert.strictEqual((await rotaryAccess(1, 0)).use, false, 'last-click tag liability declines unknown access');
  assert.strictEqual((await rotaryAccess(2, 2)).use, true, 'one cleanup click and two pool credits fund useful access');
  assert.strictEqual((await rotaryAccess(2, 1)).use, false, 'cannot clear the optional tag');
  assert.strictEqual((await rotaryAccess(1, 0, true)).use, true, 'known extra winning agenda outranks cleanup');
  assert.strictEqual((await rotaryAccess(2, 2, false, true)).use, false, 'ICE cost consumes the cleanup reserve');
  assert.strictEqual((await tailgateChoice(2)).action, 'run');
  assert.strictEqual((await tailgateChoice(10)).action, 'play');
  assert.notStrictEqual((await tailgateChoice(10, true)).action, 'play', 'Crisium removes the multiaccess success reward');
  reset(); c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
  const hqWin = card(30070, c.corp.HQ.cards); hqWin.knownToRunner = true;
  card(30075, c.corp.HQ.cards); card(30075, c.corp.HQ.cards);
  c.runner.AI.suspectedHQCards = [{title: hqWin.title, cardType: 'agenda', copies: 1, uncertainty: 0}];
  const multi = card(36012, c.runner.grip); for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.clickTracker = 1; c.runner.creditPool = 3;
  assert.strictEqual(await command(['play', 'run', 'gain']), 'play', 'multiaccess covers the whole known winning HQ');
  assert.strictEqual(c.runner.AI.preferred.cardToPlay, multi);
  c.executingCommand = 'play'; const legalMulti = c.currentPhase.Enumerate.play();
  const chosenMulti = legalMulti[await c.runner.AI.SelectChoice(legalMulti)]; assert.strictEqual(chosenMulti.card, multi);
  c.executingCommand = ''; c.currentPhase.Resolve.play(chosenMulti);
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]); passResponses();
  assert.strictEqual(c.attackedServer, c.corp.HQ);
  c.currentPhase = c.phases.runSuccessful; c.currentPhase.Init(); passResponses();
  assert.strictEqual(multi.modifyBreachAccess.Resolve.call(multi), 2);
  c.accessingCard = hqWin; c.currentPhase = c.phases.runAccessingCard;
  c.currentPhase.Resolve.steal(); passResponses(); assert.strictEqual(c.AgendaPoints(c.runner), 7);
  multi.responseOnRunEnds.Resolve.call(multi); assert.strictEqual(multi.modifyBreachAccess.Resolve.call(multi), 0);

  assert.strictEqual(await goodsChoice(2, 0, 13, 2), 'gain', 'spare memory does not warrant a tag');
  assert.strictEqual(await goodsChoice(3, 0, 13, 2), 'install');
  assert.strictEqual(await goodsChoice(3, 0, 0, 1), 'gain', 'no cleanup budget');
  assert.strictEqual(await goodsChoice(3, 1, 13, 2), 'install', 'already tagged adds no liability');
  assert.strictEqual(await underdomeChoice(false, 1), 'gain', 'guaranteed self-trash has no payoff');
  assert.strictEqual(await underdomeChoice(true, 1), 'install', 'remembered rez supplies useful end-phase draw');
  assert.strictEqual(await underdomeChoice(true, 1, 6), 'gain', 'avoid buying mandatory overdraw');
  assert.strictEqual(await underdomeChoice(false, 2, 0, true), 'gain', 'hold until an actual rez supports the conditional payoff');
  assert.strictEqual(await underdomeChoice(false, 2, 0, true, 0), 'gain', 'Corp cannot afford the known ICE');
  assert.strictEqual(await bakerChoice(false), 'trigger');
  const usefulBaker = c.runner.rig.programs.find(x => x.title === 'Baker');
  usefulBaker.runningWithThis = true; c.attackedServer = c.corp.archives; c.approachIce = -1;
  c.currentPhase = {title: usefulBaker.title, identifier: 'Run 4.3', Enumerate: {}, Resolve: {}};
  const usefulRedirects = usefulBaker.responseOnWouldApproachServer.Enumerate.call(usefulBaker);
  const usefulDestination = usefulRedirects[await c.runner.AI.SelectChoice(usefulRedirects)];
  assert.strictEqual(usefulDestination.server, c.corp.HQ, 'follow through on the chosen backdoor');
  usefulBaker.responseOnWouldApproachServer.Resolve.call(usefulBaker, usefulDestination); passResponses();
  assert.strictEqual(c.attackedServer, c.corp.HQ);
  assert.strictEqual(c.runner.rig.hardware[0].credits, 0);
  assert.strictEqual(await bakerChoice(true), 'run');
  assert.strictEqual(await bakerChoice(false, 0), 'run');
  reset(); const backdoor = card(36015, c.runner.rig.programs);
  card(36004, c.runner.rig.programs);
  const fuel = card(36020, c.runner.rig.hardware); fuel.credits = 1;
  card(31077, c.corp.archives.ice).rezzed = true;
  card(31077, c.corp.HQ.ice).rezzed = true; card(31077, c.corp.HQ.ice).rezzed = true;
  c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30075, c.corp.HQ.cards);
  c.corp.RnD.cards = []; c.corp.archives.cards = [];
  for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  c.runner.creditPool = 1;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30070, c.corp.HQ.cards);
  c.runner.AI.suspectedHQCards = [{title: 'Superconducting Hub', cardType: 'agenda', copies: 5, uncertainty: 0}];
  const exhaustedRedirectCommand = await command(['trigger', 'run', 'gain']);
  assert.notStrictEqual(exhaustedRedirectCommand, 'trigger',
    'the sole Stealth credit spent breaking Archives cannot also pay the redirect');
  // A known second R&D agenda must reach the ordinary immediate-win selector.
  reset(); const consoleCard = card(36014, c.runner.rig.hardware);
  c.corp.RnD.cards = []; const win = card(30070, c.corp.RnD.cards); win.knownToRunner = true;
  card(30075, c.corp.RnD.cards); c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.runner.creditPool = 0; c.runner.clickTracker = 1;
  assert.strictEqual(await command(['run', 'gain']), 'run');
  assert.strictEqual(c.runner.AI.preferred.serverToRun, c.corp.RnD);
  assert.strictEqual(c.runner.AI._evaluatingWinningRun, undefined);
  c.executingCommand = 'run'; const runs = c.currentPhase.Enumerate.run();
  const chosenRun = runs[await c.runner.AI.SelectChoice(runs)];
  assert.strictEqual(chosenRun.server, c.corp.RnD);
  c.executingCommand = ''; c.currentPhase.Resolve.run(chosenRun);
  c.approachIce = -1;
  const breachOptions = consoleCard.responseOnBreach.Enumerate.call(consoleCard, c.corp.RnD);
  c.currentPhase = {title: consoleCard.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
  const use = breachOptions[await c.runner.AI.SelectChoice(breachOptions)]; assert(use.use);
  consoleCard.responseOnBreach.Resolve.call(consoleCard, use); passResponses();
  c.currentPhase = c.phases.runAccessingCard; c.accessingCard = win;
  c.currentPhase.Resolve.steal(); passResponses();
  assert.strictEqual(c.AgendaPoints(c.runner), 7, 'actual funded tagged steal wins');

  // Baker retains a more valuable Archives breach without paying its final fuel.
  reset(); const retain = card(36015, c.runner.rig.programs);
  const reserve = card(36020, c.runner.rig.hardware); reserve.credits = 1;
  c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
  card(30070, c.corp.archives.cards).faceUp = true;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  await command(['run', 'trigger', 'gain']); // cache genuine board potentials
  retain.runningWithThis = true; c.attackedServer = c.corp.archives; c.approachIce = -1;
  c.currentPhase = {title: retain.title, identifier: 'Run 4.3', Enumerate: {}, Resolve: {}};
  const redirects = retain.responseOnWouldApproachServer.Enumerate.call(retain);
  const destination = redirects[await c.runner.AI.SelectChoice(redirects)];
  assert.strictEqual(destination.server, null);
  retain.responseOnWouldApproachServer.Resolve.call(retain, destination);
  assert.strictEqual(reserve.credits, 1); assert.strictEqual(c.attackedServer, c.corp.archives);

  // Restricted-payment forks must retain the tag probe guard and live caches.
  reset(); const forkConsole = card(36014, c.runner.rig.hardware);
  card(36065, c.corp.RnD.root).rezzed = true;
  c.corp.RnD.cards = []; card(30075, c.corp.RnD.cards); card(30070, c.corp.RnD.cards);
  c.runner.creditPool = 5; c.runner.clickTracker = 3;
  for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  const cachedPath = c.runner.AI.cachedBestPath;
  assert.strictEqual(forkConsole.AIAdditionalAccess(c.corp.RnD), 1);
  assert.strictEqual(c.runner.AI.cachedBestPath, cachedPath);
  assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.runner.tags, 0);
  const forkPath = c.runner.AI._calculateBestCompleteRun(c.corp.RnD, 0, 0, -1, 0, null, 0);
  assert(forkPath); assert.strictEqual(c.runner.AI.rc.TotalEffect(forkPath[forkPath.length - 1]).tag, 1);

  // Corp console denial yields to a real immediate kill.
  for (const kill of [false, true]) {
    reset(); const rotary = card(36014, c.runner.rig.hardware); c.runner.tags = 1;
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    c.corp.creditPool = 5; c.corp.clickTracker = 3;
    let operation = null;
    if (kill) {operation = card(30049, c.corp.HQ.cards); operation.printedAgendaPointsThisTurn = 2;}
    c.playerTurn = c.corp; c.activePlayer = c.corp; c.currentPhase = c.phases.corpActionMain;
    run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
    const options = ['trigger', 'play', 'gain'];
    const action = options[await c.corp.AI.CommandChoice(options)];
    assert.strictEqual(action, kill ? 'play' : 'trigger');
    if (kill) assert.strictEqual(c.corp.AI.preferred.cardToPlay, operation);
    else {
      assert.strictEqual(c.corp.AI.preferred.cardToTrigger, rotary);
      c.executingCommand = 'trigger'; const choices = c.currentPhase.Enumerate.trigger();
      const selected = choices[await c.corp.AI.SelectChoice(choices)]; assert.strictEqual(selected.card, rotary);
      c.executingCommand = ''; c.currentPhase.Resolve.trigger(selected);
      c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]); passResponses();
      assert(c.runner.heap.includes(rotary)); assert.strictEqual(c.corp.creditPool, 3);
      assert.strictEqual(c.corp.clickTracker, 2);
    }
  }

  // The remembered rez is reset each turn, and tag removal beats unusable overdraw.
  reset(); const irregular = card(36016, c.runner.rig.resources);
  irregular.automaticOnRez.Resolve.call(irregular, card(31077, c.corp.HQ.ice));
  c.runner.tags = 1; for (let i = 0; i < 6; i++) card(30020, c.runner.grip);
  const endOptions = irregular.responseOnRunnerActionPhaseEnds.Enumerate.call(irregular);
  c.currentPhase = {title: irregular.title, identifier: 'Runner 2.2', Enumerate: {}, Resolve: {}};
  const endChoice = endOptions[await c.runner.AI.SelectChoice(endOptions)]; assert(endChoice.removeTag);
  irregular.responseOnRunnerActionPhaseEnds.Resolve.call(irregular, endChoice);
  assert.strictEqual(c.runner.tags, 0); assert.strictEqual(c.runner.grip.length, 6);
  irregular.responseOnRunnerTurnBegins.Resolve.call(irregular);
  assert.strictEqual(irregular.iceRezzedThisTurn, false);
  irregular.responseOnRunnerActionPhaseEnds.Resolve.call(irregular, {}); passResponses();
  assert(c.runner.heap.includes(irregular));



}
async function installSelected(expected) {
  c.executingCommand = 'install';
  const legal = c.currentPhase.Enumerate.install();
  const choice = legal[await c.runner.AI.SelectChoice(legal)];
  assert.strictEqual(choice.card, expected);
  c.executingCommand = ''; c.currentPhase.Resolve.install(choice);
  if (c.currentPhase.Enumerate.continue) c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
  passResponses();
}
async function redirectedChoice(baker) {
  baker.runningWithThis = true; c.attackedServer = c.corp.archives; c.approachIce = -1;
  c.currentPhase = {title: baker.title, identifier: 'Run 4.3', Enumerate: {}, Resolve: {}};
  const options = baker.responseOnWouldApproachServer.Enumerate.call(baker);
  return options[await c.runner.AI.SelectChoice(options)];
}
async function repairedAcceptance() {
  // C3-4: a complete action transition, rather than a cached run opportunity.
  for (const pool of [1, 2]) for (const breaker of [false, true]) {
    reset(); c.runner.clickTracker = 2; c.runner.creditPool = pool;
    const irregular = card(36016, c.runner.grip);
    const ice = card(31077, c.corp.HQ.ice); ice.knownToRunner = true;
    card(31077, c.corp.RnD.ice).rezzed = true;
    card(31077, c.corp.archives.ice).rezzed = true;
    if (breaker) card(30006, c.runner.rig.programs);
    const action = await command(['install', 'run', 'gain']);
    assert.notStrictEqual(action, 'install', 'uncommitted future rez cannot justify buying a conditional resource');
    assert(c.runner.grip.includes(irregular));
  }
  reset(); c.runner.clickTracker = 2; c.runner.creditPool = 2;
  const paid = card(36016, c.runner.grip);
  paid.automaticOnRez.Resolve.call(paid, card(31077, c.corp.HQ.ice));
  assert.strictEqual(await command(['install', 'gain']), 'install');
  await installSelected(paid);
  assert.strictEqual(c.runner.creditPool, 1); assert.strictEqual(c.runner.clickTracker, 1);
  assert.strictEqual(await command(['gain']), 'gain');
  c.currentPhase.Resolve.gain({});
  const beforeDraw = c.runner.grip.length;
  paid.responseOnRunnerActionPhaseEnds.Resolve.call(paid, {draw: true}); passResponses();
  assert.strictEqual(c.runner.grip.length, beforeDraw + 2); assert(c.runner.rig.resources.includes(paid));

  // C3-6: stale Corp-turn clocks project the same ordinary cleanup opportunity.
  reset(); card(36014, c.runner.rig.hardware);
  run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
  c.playerTurn = c.corp; c.runner.clickTracker = 0; c.runner.creditPool = 5;
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 1);
  c.runner.clickTracker = 4;
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 1);
  c.playerTurn = c.runner; c.runner.clickTracker = 1; c.runner.creditPool = 0;
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 0, 'ordinary last-click tag is a liability');
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.corp.HQ.cards = []; const terminal = card(30070, c.corp.HQ.cards); terminal.knownToRunner = true;
  card(30075, c.corp.HQ.cards);
  assert.strictEqual(c.corp.AI._centralBreachLossRisk(c.corp.HQ).accessCount, 2);
  assert.strictEqual(c.corp.AI._centralBreachLossRisk(c.corp.HQ).probability, 1);
  // Last-click costly agenda cannot promise a terminal bonus; spare click can.
  c.corp.HQ.cards = []; card(36026, c.corp.HQ.cards); card(30075, c.corp.HQ.cards);
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 0);
  c.runner.clickTracker = 2;
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 1);
  c.corp.HQ.cards.pop();
  assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, 0, 'no additional card');
  // Hidden order and private Runner card identities have no role in public pressure.
  c.corp.RnD.cards = []; card(30070, c.corp.RnD.cards); card(30075, c.corp.RnD.cards);
  const publicRisk = c.corp.AI._centralBreachLossRisk(c.corp.RnD).probability;
  c.corp.RnD.cards.reverse(); c.runner.grip = [{title: 'private replacement', player: c.runner}];
  assert.strictEqual(c.corp.AI._centralBreachLossRisk(c.corp.RnD).probability, publicRisk);

  // Preserve the integration harness's exact valuation/restoration acceptance
  // through a real paid route calculation, rather than its removed AI stub.
  reset(); const valuedBaker = card(36015, c.runner.rig.programs);
  const valuedFuel = card(36021, c.runner.rig.hardware); valuedFuel.credits = 1;
  c.runner.AI.cachedPotentials = [{server: c.corp.HQ, potential: 4, breachPotential: 4},
    {server: c.corp.RnD, potential: 2, breachPotential: 2},
    {server: c.corp.archives, potential: 1, breachPotential: 1}];
  assert.strictEqual(valuedBaker.AIRunAbilityExtraPotential(c.corp.archives, 1), 3);
  assert.strictEqual(c.attackedServer, null); assert.strictEqual(valuedFuel.credits, 1);

  // C3-7: command and live destination must agree on mandatory destination damage.
  for (const initialGrip of [0, 5]) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30075, c.corp.HQ.cards);
    c.corp.RnD.cards = []; card(30075, c.corp.RnD.cards); c.corp.archives.cards = [];
    const grid = card(31059, c.corp.HQ.root); grid.rezzed = true;
    for (let i = 0; i < initialGrip; i++) card(30020, c.runner.grip);
    c.runner.creditPool = 0;
    await command(['trigger', 'run', 'gain']);
    c.runner.grip = [];
    const choice = await redirectedChoice(baker);
    assert.strictEqual(choice.server, c.corp.RnD, 'safe R&D outranks fatal HQ even after live Grip depletion');
    baker.responseOnWouldApproachServer.Resolve.call(baker, choice); passResponses();
    assert.strictEqual(c.attackedServer, c.corp.RnD); assert.strictEqual(fuel.credits, 0);
    assert.strictEqual(grid.responseOnRunSuccessful.Enumerate.call(grid).length, 0);
  }
  // The redirect is paid on Archives, before destination Shackleton is active.
  reset(); const b = card(36015, c.runner.rig.programs);
  const flexible = card(26088, c.runner.rig.programs); flexible.credits = 1;
  const runOnly = card(36021, c.runner.rig.hardware); runOnly.credits = 1;
  c.corp.HQ.cards = []; card(30070, c.corp.HQ.cards).knownToRunner = true;
  card(31077, c.corp.HQ.ice).rezzed = true;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.corp.RnD.cards = []; c.corp.archives.cards = []; c.runner.creditPool = 0;
  card(36065, c.corp.HQ.root).rezzed = true;
  assert.strictEqual(await command(['trigger', 'run', 'gain']), 'trigger');
  const dest = await redirectedChoice(b); assert.strictEqual(dest.server, c.corp.HQ);
  b.responseOnWouldApproachServer.Resolve.call(b, dest);
  const sources = c.currentPhase.Enumerate.continue();
  const payment = sources[await c.runner.AI.SelectChoice(sources)];
  assert.strictEqual(payment.card, runOnly, 'spend run-only fuel before flexible fuel through the actual selector');
  c.currentPhase.Resolve.continue(payment); passResponses();
  assert.strictEqual(runOnly.credits, 0); assert.strictEqual(flexible.credits, 1);
  assert.strictEqual(c.runner.grip.length, 0);

  // Both central destinations affect consequence, protection and stakes.
  for (const central of ['HQ', 'RnD']) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    card(30070, c.corp[central].cards); card(31077, c.corp[central].ice).rezzed = true;
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
    const consequence = c.corp.AI._breachConsequence(c.corp.archives);
    assert.strictEqual(consequence.weight, 1); assert.strictEqual(consequence.backdoorTo, c.corp[central]);
    assert.strictEqual(c.corp.AI._nothingWorthProtecting(c.corp.archives), false);
    assert.strictEqual(c.corp.AI._serverHasStakes(c.corp.archives), true);
    const liveProtection = c.corp.AI._protectionScore(c.corp.archives, {});
    baker.usedThisTurn = true;
    assert(c.corp.AI._protectionScore(c.corp.archives, {}) > liveProtection);
    fuel.credits = 0; baker.usedThisTurn = false;
    assert.strictEqual(c.corp.AI._breachConsequence(c.corp.archives).weight, 0);
  }
  // Named setup evidence: MU → cleanup → necessary program, with real costs.
  for (const pool of [2, 20]) {
    reset(); card(30005, c.runner.rig.programs); card(36015, c.runner.rig.programs);
    card(36005, c.runner.rig.programs).power = 1; card(30007, c.runner.rig.programs);
    const goods = card(36013, c.runner.grip); const breaker = card(30006, c.runner.grip);
    c.runner.creditPool = pool; c.runner.clickTracker = 4;
    for (const server of [c.corp.HQ, c.corp.RnD, c.corp.archives]) card(31077, server.ice).rezzed = true;
    const action = await command(['install', 'run', 'gain']);
    if (pool === 2) {
      assert.strictEqual(action, 'gain', 'cannot fund the program and clear the new tag');
      assert.strictEqual(goods.AIInstallBeforeInstall(breaker), false);
    } else {
      assert.strictEqual(action, 'install'); assert.strictEqual(c.runner.AI.preferred.cardToInstall, goods);
      await installSelected(goods); assert.strictEqual(c.runner.tags, 1);
      assert.strictEqual(await command(['install', 'remove', 'gain']), 'remove');
      c.currentPhase.Resolve.remove({}); passResponses();
      assert.strictEqual(c.runner.tags, 0); assert.strictEqual(c.runner.creditPool, pool - 2);
      assert.strictEqual(await command(['install', 'run', 'gain']), 'install');
      assert.strictEqual(c.runner.AI.preferred.cardToInstall, breaker);
      await installSelected(breaker);
      assert.strictEqual(c.runner.creditPool, pool - 5); assert.strictEqual(c.runner.clickTracker, 1);
      assert.strictEqual(c.InstalledMemoryCost(), c.MemoryUnits());
    }
  }
  // Rotary pays its setup click and three credits before valuing optional access.
  for (const pool of [4, 5]) {
    reset(); const rotary = card(36014, c.runner.grip); c.runner.creditPool = pool;
    c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30075, c.corp.HQ.cards);
    c.corp.RnD.cards = []; c.corp.archives.cards = [];
    for (let i = 0; i < 4; i++) card(30020, c.runner.grip);
    const action = await command(['install', 'run', 'gain']);
    assert.strictEqual(action, pool === 5 ? 'install' : 'run');
    if (pool === 5) {
      await installSelected(rotary);
      assert.strictEqual(c.runner.creditPool, 2); assert.strictEqual(c.runner.clickTracker, 3);
      assert.strictEqual(await command(['run', 'gain']), 'run');
      assert.strictEqual(c.runner.AI.preferred.serverToRun, c.corp.HQ);
      c.executingCommand = 'run'; const runs = c.currentPhase.Enumerate.run();
      const run = runs[await c.runner.AI.SelectChoice(runs)]; c.executingCommand = '';
      c.currentPhase.Resolve.run(run); c.approachIce = -1;
      c.currentPhase = {title: rotary.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
      const options = rotary.responseOnBreach.Enumerate.call(rotary, c.corp.HQ);
      const use = options[await c.runner.AI.SelectChoice(options)]; assert.strictEqual(use.use, true);
      rotary.responseOnBreach.Resolve.call(rotary, use); passResponses(); assert.strictEqual(c.runner.tags, 1);
    }
  }
  // Multi-source composition: Docklands exposes two HQ cards; Rotary's third
  // covers the known costly winning agenda only when the steal click remains.
  for (const clicks of [1, 2]) {
    reset(); const rotary = card(36014, c.runner.rig.hardware);
    card(30013, c.runner.rig.hardware); // Docklands Pass
    c.corp.HQ.cards = []; const costly = card(36026, c.corp.HQ.cards); costly.knownToRunner = true;
    card(30075, c.corp.HQ.cards); card(30075, c.corp.HQ.cards);
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.creditPool = 0; c.runner.clickTracker = clicks;
    assert.strictEqual(rotary._baseAccessCount(c.corp.HQ), 2);
    const action = await command(['run', 'gain']);
    if (clicks === 2) {
      assert.strictEqual(action, 'run'); assert.strictEqual(c.runner.AI.preferred.serverToRun, c.corp.HQ);
      assert.strictEqual(rotary.AIWinningBreachAgenda(c.corp.HQ), costly);
    } else assert.strictEqual(rotary.AIWinningBreachAgenda(c.corp.HQ), null);
  }
  // Tactical multi-ICE Kompromat ranking: preserving the funded cheap layer
  // avoids permanent publicity; when neither layer can be re-rezzed, keep both.
  for (const pool of [0, 1]) {
    reset(); const event = card(36010, c.runner.resolvingCards);
    event.runningWithThis = true; event.runWasSuccessful = true; c.attackedServer = c.corp.HQ;
    c.corp.creditPool = pool; card(30006, c.runner.rig.programs);
    const cheap = card(31077, c.corp.HQ.ice); cheap.rezzed = true;
    const expensive = card(30054, c.corp.HQ.ice); expensive.rezzed = true;
    run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
    event.responseOnRunEnds.Resolve.call(event);
    const options = c.currentPhase.Enumerate.continue(); const selected = options[await c.corp.AI.SelectChoice(options)];
    if (pool) assert.strictEqual(selected.card, cheap); else assert.strictEqual(selected.badPublicity, true);
    c.currentPhase.Resolve.continue(selected); passResponses();
    assert.strictEqual(expensive.rezzed, true); assert.strictEqual(cheap.rezzed, !pool);
    assert.strictEqual(c.corp.badPublicity, pool ? 0 : 1);
  }
  // Terminal paid redirects include destination damage and steal costs.
  for (const state of [{grip: 0, prevented: false}, {grip: 1, prevented: false}, {grip: 0, prevented: true}]) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; card(30070, c.corp.HQ.cards).knownToRunner = true;
    c.corp.RnD.cards = []; c.corp.archives.cards = []; card(31077, c.corp.HQ.ice).rezzed = true;
    card(31059, c.corp.HQ.root).rezzed = true;
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.creditPool = 0;
    for (let i = 0; i < state.grip; i++) card(30020, c.runner.grip);
    // Public finite prevention capability, consumed by the real run calculator.
    if (state.prevented) c.runner.rig.hardware.push({title: 'Public prevention fixture', player: c.runner,
      cardType: 'hardware', subTypes: [], AINetDamagePrevention: () => 1});
    const commandChoice = await command(['trigger', 'run', 'gain']);
    const safe = state.grip > 0 || state.prevented;
    if (verbose) console.log('Baker terminal damage', state, commandChoice, !!baker._redirectPlan(false), c.runner.AI.cachedPotentials.map(x=>[x.server.serverName,x.breachPotential]));
    assert.strictEqual(commandChoice === 'trigger', safe);
    const redirect = await redirectedChoice(baker);
    assert.strictEqual(redirect.server, safe ? c.corp.HQ : null);
  }
  for (const clicks of [1, 2]) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; card(36026, c.corp.HQ.cards).knownToRunner = true;
    c.corp.RnD.cards = []; c.corp.archives.cards = []; card(31077, c.corp.HQ.ice).rezzed = true;
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.creditPool = 0; c.runner.clickTracker = clicks;
    const action = await command(['trigger', 'run', 'gain']);
    assert.strictEqual(action === 'trigger', clicks === 2, 'reserve the additional steal click after paying to run');
  }
  // A failed query restores source counters, prospective server/depth and caches.
  reset(); const throwingBaker = card(36015, c.runner.rig.programs);
  const throwingFuel = card(36021, c.runner.rig.hardware); throwingFuel.credits = 1;
  c.runner.AI.cachedPotentials = [{server: c.corp.HQ, potential: 4, breachPotential: 4}];
  const pathCache = c.runner.AI.cachedBestPath, costCache = c.runner.AI.cachedCosts;
  const oldCost = c.StealCost;
  c.corp.HQ.cards = []; card(30070, c.corp.HQ.cards).knownToRunner = true;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.StealCost = () => {throw new Error('redirect cost failure');};
  assert.throws(() => throwingBaker.AIRunAbilityPlan(c.corp.archives), /redirect cost failure/);
  c.StealCost = oldCost;
  assert.strictEqual(throwingFuel.credits, 1); assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.approachIce, -1);
  assert.strictEqual(c.runner.AI.cachedBestPath, pathCache); assert.strictEqual(c.runner.AI.cachedCosts, costCache);

  // Public terminal credit costs are affordable only with an actual remaining pool.
  for (const pool of [0, 2]) {
    reset(); const rotary = card(36014, c.runner.rig.hardware);
    c.corp.HQ.cards = []; const costly = card(30070, c.corp.HQ.cards);
    costly.stealCost = {credits: 2}; costly.knownToRunner = true; card(30075, c.corp.HQ.cards);
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.creditPool = pool; c.runner.clickTracker = 1;
    run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
    assert.strictEqual(c.corp.AI._centralPressureSummary(c.corp.HQ).additionalAccess, pool ? 1 : 0);
    assert.strictEqual(!!rotary.AIWinningBreachAgenda(c.corp.HQ), !!pool);
  }
  // Public redirect accounting reserves fuel once, includes destination damage,
  // and refreshes used-on-previous-turn eligibility without reading private cards.
  reset(); const publicBaker = card(36015, c.runner.rig.programs);
  const publicFuel = card(36021, c.runner.rig.hardware); publicFuel.credits = 1;
  card(36004, c.runner.rig.programs);
  card(31077, c.corp.archives.ice).rezzed = true;
  c.runner.creditPool = 0; c.runner.clickTracker = 1; c.runner.grip = [];
  run('corp.AI = new CorpAI(); corp.AI._log = function() {};');
  assert.strictEqual(publicBaker.AIRedirectsRun(c.corp.archives, c.corp.HQ), false,
    'sole fuel cannot pay both Archives reduction and redirect on the last click');
  c.corp.archives.ice = []; card(31059, c.corp.HQ.root).rezzed = true;
  assert.strictEqual(publicBaker.AIRedirectsRun(c.corp.archives, c.corp.HQ), false, 'public fatal destination');
  assert.strictEqual(publicBaker.AIRedirectsRun(c.corp.archives, c.corp.RnD), true, 'safe alternative destination');
  publicBaker.usedThisTurn = true;
  assert.strictEqual(publicBaker.AIRedirectsRun(c.corp.archives, c.corp.RnD), false);
  c.playerTurn = c.corp; c.runner.clickTracker = 0;
  assert.strictEqual(publicBaker.AIRedirectsRun(c.corp.archives, c.corp.RnD), true, 'next-turn ability resets');
  assert.strictEqual(publicFuel.credits, 1); assert.strictEqual(c.attackedServer, null);
  // Destination finite defense requires a new ordinary central run and cannot
  // reuse the paid backdoor to skip the destination's ICE a second time.
  reset(); const finiteBaker = card(36015, c.runner.rig.programs);
  const finiteFuel = card(36021, c.runner.rig.hardware); finiteFuel.credits = 1;
  c.corp.HQ.cards = []; card(30070, c.corp.HQ.cards).knownToRunner = true;
  c.corp.RnD.cards = []; c.corp.archives.cards = []; card(31077, c.corp.HQ.ice).rezzed = true;
  const horizon = card(36058, c.corp.HQ.ice); horizon.rezzed = true;
  c.corp.creditPool = 5; c.runner.creditPool = 0; c.runner.clickTracker = 2;
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  assert.notStrictEqual(await command(['trigger', 'run', 'gain']), 'trigger', 'ordinary rerun remains locked by Ice Wall');
  assert.strictEqual(finiteFuel.credits, 1); assert.strictEqual(finiteBaker.usedThisTurn, false);

  // Affordable pressure is still pursued: run first and observe the paid rez,
  // then purchase Underdome while its conditional end-phase payoff is live.
  reset(); const afterRez = card(36016, c.runner.grip);
  card(30006, c.runner.rig.programs); c.runner.clickTracker = 3; c.runner.creditPool = 3;
  card(30020, c.runner.grip); card(30020, c.runner.grip);
  c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30070, c.corp.HQ.cards);
  c.corp.RnD.cards = []; c.corp.archives.cards = [];
  c.runner.AI.suspectedHQCards = [{title: 'Superconducting Hub', cardType: 'agenda', copies: 5, uncertainty: 0}];
  const pressureIce = card(31077, c.corp.HQ.ice); pressureIce.knownToRunner = true;
  assert.strictEqual(await command(['install', 'run', 'gain']), 'run');
  c.executingCommand = 'run'; const pressureRuns = c.currentPhase.Enumerate.run();
  const pressureRun = pressureRuns[await c.runner.AI.SelectChoice(pressureRuns)];
  assert.strictEqual(pressureRun.server, c.corp.HQ);
  c.executingCommand = ''; c.currentPhase.Resolve.run(pressureRun);
  c.Rez(pressureIce); passResponses();
  assert.strictEqual(pressureIce.rezzed, true); assert.strictEqual(afterRez.iceRezzedThisTurn, true);
  c.EndTheRun(false); passResponses();
  // No successful breach is required by the printed Underdome condition.
  c.attackedServer = null; c.encountering = false; c.currentPhase = c.phases.runnerActionMain;
  assert.strictEqual(await command(['install', 'gain']), 'install');
  await installSelected(afterRez);
  assert.strictEqual(c.runner.creditPool, 2); assert.strictEqual(c.runner.clickTracker, 1);
  assert.strictEqual(await command(['gain']), 'gain');
  c.currentPhase.Resolve.gain({});
  const postRunGrip = c.runner.grip.length;
  afterRez.responseOnRunnerActionPhaseEnds.Resolve.call(afterRez, {draw: true}); passResponses();
  assert.strictEqual(c.runner.grip.length, postRunGrip + 2);
  assert(c.runner.rig.resources.includes(afterRez));

  // A paid backdoor uses its actual complete route for Rotary's optional tag,
  // rather than attempting another hypothetical run through destination ICE.
  for (const pool of [1, 2]) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const rotary = card(36014, c.runner.rig.hardware);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; for (let i = 0; i < 5; i++) card(30070, c.corp.HQ.cards);
    c.runner.AI.suspectedHQCards = [{title: "Superconducting Hub", cardType: "agenda", copies: 5, uncertainty: 0}];
    card(31077, c.corp.HQ.ice).rezzed = true;
    c.corp.RnD.cards = []; c.corp.archives.cards = [];
    c.runner.creditPool = pool; c.runner.clickTracker = 3;
    for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
    const compositionAction = await command(['trigger', 'run', 'gain']);
    if (verbose) console.log('Baker Rotary composition', pool, compositionAction);
    assert.strictEqual(compositionAction, 'trigger');
    const plan = baker.AIRunAbilityPlan(c.corp.archives); assert(plan);
    assert.strictEqual(plan.calculator.TotalEffect(plan.path[plan.path.length - 1]).tag || 0, pool === 2 ? 1 : 0);
    assert.strictEqual(plan.path[plan.path.length - 1].runner_credits_spent, 1, 'redirect payment contributes to route cost');
    const redirect = await redirectedChoice(baker); assert.strictEqual(redirect.server, c.corp.HQ);
    baker.responseOnWouldApproachServer.Resolve.call(baker, redirect); passResponses();
    c.currentPhase = {title: rotary.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
    c.runner.clickTracker--; // actual run initiation, omitted by this live-window helper
    const options = rotary.responseOnBreach.Enumerate.call(rotary, c.corp.HQ);
    assert.strictEqual(options[await c.runner.AI.SelectChoice(options)].use, pool === 2);
  }

}

async function composedTerminalAcceptance() {
  // Destination ICE cannot be broken: only the paid backdoor plus Rotary
  // guarantees the extra known winning card on the final click.
  for (const dest of ['HQ', 'RnD']) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const rotary = card(36014, c.runner.rig.hardware);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = 1;
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    const server = c.corp[dest];
    const agenda = card(30070, server.cards); agenda.knownToRunner = true;
    card(30075, server.cards); card(31077, server.ice).rezzed = true;
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    c.runner.creditPool = 0; c.runner.clickTracker = 1;
    assert.strictEqual(await command(['trigger', 'run', 'gain']), 'trigger', dest + ' terminal backdoor');
    const plan = baker.AIRunAbilityPlan();
    assert.strictEqual(plan.winningAgenda, agenda);
    assert.strictEqual(plan.server, server);
    assert.strictEqual(plan.calculator.TotalEffect(plan.path[plan.path.length - 1]).tag, 1);
    const options = c.ChoicesTriggerableAbilities(c.runner, 'click');
    c.executingCommand = 'trigger';
    const ability = options[await c.runner.AI.SelectChoice(options)]; c.executingCommand = '';
    assert.strictEqual(ability.card, baker);
    ability.ability.Resolve.call(baker, ability.choice);
    assert.strictEqual(c.runner.clickTracker, 0);
    const redirect = await redirectedChoice(baker); assert.strictEqual(redirect.server, server);
    baker.responseOnWouldApproachServer.Resolve.call(baker, redirect); passResponses();
    assert.strictEqual(c.attackedServer, server); assert.strictEqual(fuel.credits, 0);
    c.currentPhase = {title: rotary.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
    const accessOptions = rotary.responseOnBreach.Enumerate.call(rotary, server);
    const bonus = accessOptions[await c.runner.AI.SelectChoice(accessOptions)];
    assert.strictEqual(bonus.use, true);
    rotary.responseOnBreach.Resolve.call(rotary, bonus); passResponses();
    assert.strictEqual(c.runner.tags, 1);
    assert.strictEqual(rotary.modifyBreachAccess.Resolve.call(rotary), 1);
    c.currentPhase = c.phases.runAccessingCard; c.accessingCard = agenda;
    assert(c.currentPhase.Enumerate.steal().length);
    c.currentPhase.Resolve.steal(); passResponses();
    assert.strictEqual(c.AgendaPoints(c.runner), 7);
    assert.strictEqual(c.runner.creditPool, 0); assert.strictEqual(fuel.credits, 0);
  }
  function composedBoard(options = {}) {
    reset(); const baker = card(36015, c.runner.rig.programs);
    const rotary = card(36014, c.runner.rig.hardware);
    const fuel = card(36021, c.runner.rig.hardware); fuel.credits = options.noFuel ? 0 : 1;
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    const server = c.corp[options.dest || 'HQ'];
    const agenda = card(options.clickCost ? 36026 : 30070, server.cards);
    agenda.knownToRunner = !options.unknown;
    if (options.creditCost) agenda.stealCost = {credits: options.creditCost};
    card(30075, server.cards); card(31077, server.ice).rezzed = true;
    if (options.docklands) {card(30013, c.runner.rig.hardware); card(30075, server.cards);}
    if (options.moreCards) card(30075, server.cards);
    if (options.damage) card(31059, server.root).rezzed = true;
    for (let i = 0; i < (options.grip || 0); i++) card(30020, c.runner.grip);
    if (options.prevented) c.runner.rig.hardware.push({title: 'Public prevention fixture', player: c.runner,
      cardType: 'hardware', subTypes: [], AINetDamagePrevention: () => 1});
    if (options.finite) {card(36058, server.ice).rezzed = true; c.corp.creditPool = 5;}
    if (options.limit) card(36064, server.root).rezzed = true;
    baker.usedThisTurn = !!options.used;
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    c.runner.creditPool = options.pool || 0; c.runner.clickTracker = options.clicks || 1;
    return {baker, rotary, fuel, server, agenda};
  }
  const cases = [
    {name: 'Docklands third card', docklands: true, wins: true},
    {name: 'Docklands scarce steal click', docklands: true, clickCost: true, wins: false},
    {name: 'Docklands funded steal click', docklands: true, clickCost: true, clicks: 2, wins: true},
    {name: 'scarce steal pool', creditCost: 2, pool: 1, wins: false},
    {name: 'exact steal pool', creditCost: 2, pool: 2, wins: true},
    {name: 'R&D exact steal pool', dest: 'RnD', creditCost: 2, pool: 2, wins: true},
    {name: 'surviving destination', damage: true, grip: 1, wins: true},
    {name: 'prevented destination', damage: true, prevented: true, wins: true},
    {name: 'fatal destination', damage: true, wins: false},
    {name: 'outside/pool policies preserve exact steal reserve', damage: true, grip: 1, creditCost: 2, pool: 2, wins: true},
    {name: 'outside/pool policies cannot fund scarce steal reserve', damage: true, grip: 1, creditCost: 2, pool: 1, wins: false},
    {name: 'unknown agenda', unknown: true, wins: false},
    {name: 'empty fuel', noFuel: true, wins: false},
    {name: 'used ability', used: true, wins: false},
    {name: 'ordinary finite rerun locked by destination ICE', finite: true, clicks: 2, wins: false},
    {name: 'access limit', limit: true, wins: false},
    {name: 'probable HQ access is not guaranteed', moreCards: true, wins: false},
  ];
  for (const state of cases) {
    const {baker, rotary, fuel, server, agenda} = composedBoard(state);
    const original = {pool: c.runner.creditPool, clicks: c.runner.clickTracker};
    const action = await command(['trigger', 'run', 'gain']);
    const plan = baker.AIRunAbilityPlan();
    assert.strictEqual(!!(plan && plan.winningAgenda), state.wins, state.name);
    if (!state.wins) continue; // a nonterminal pressure run may still be useful
    assert.strictEqual(action, 'trigger', state.name);
    const last = plan.path[plan.path.length - 1];
    assert.strictEqual(last.runner_credits_reserved || 0, state.creditCost || 0, 'reserve steal credits once');
    assert.strictEqual(last.runner_clicks_spent, state.clickCost ? 1 : 0, 'reserve steal clicks once');
    assert.strictEqual(fuel.credits, 1); assert.strictEqual(c.runner.creditPool, original.pool);
    assert.strictEqual(c.runner.clickTracker, original.clicks);
    // Live resources include the initiation cost, then the mandatory payment.
    baker.abilities[0].Resolve.call(baker, {});
    const redirect = await redirectedChoice(baker); assert.strictEqual(redirect.server, server, state.name);
    baker.responseOnWouldApproachServer.Resolve.call(baker, redirect); passResponses();
    if (state.damage) continue; // actual damage/prevention resolution has separate retained tests
    c.currentPhase = {title: rotary.title, identifier: 'Run 5.2', Enumerate: {}, Resolve: {}};
    const choices = rotary.responseOnBreach.Enumerate.call(rotary, server);
    const bonus = choices[await c.runner.AI.SelectChoice(choices)]; assert.strictEqual(bonus.use, true, state.name);
    rotary.responseOnBreach.Resolve.call(rotary, bonus); passResponses();
    c.currentPhase = c.phases.runAccessingCard; c.accessingCard = agenda;
    assert(c.currentPhase.Enumerate.steal().length, state.name);
    c.currentPhase.Resolve.steal(); passResponses();
    assert.strictEqual(c.AgendaPoints(c.runner), 6 + c.AgendaPointsForCard(agenda, c.runner), state.name);
    assert.strictEqual(c.runner.creditPool, original.pool - (state.creditCost || 0));
    assert.strictEqual(c.runner.clickTracker, original.clicks - 1 - (state.clickCost ? 1 : 0));
    assert.strictEqual(fuel.credits, 0);
  }
  // A plan is not a promise after resources change at the approach window.
  for (const depleted of ['grip', 'pool', 'fuel']) {
    const state = depleted === 'grip' ? {damage: true, grip: 1} :
      depleted === 'pool' ? {creditCost: 2, pool: 2} : {};
    const {baker, fuel} = composedBoard(state);
    assert.strictEqual(await command(['trigger', 'run', 'gain']), 'trigger');
    baker.abilities[0].Resolve.call(baker, {});
    if (depleted === 'grip') c.runner.grip = [];
    if (depleted === 'pool') c.runner.creditPool = 0;
    if (depleted === 'fuel') fuel.credits = 0;
    const redirect = await redirectedChoice(baker);
    assert.strictEqual(redirect ? redirect.server : null, null, 'live depleted ' + depleted);
  }
  // Terminal victory beats valuable Archives; an unknown bonus retains it.
  for (const unknown of [false, true]) {
    const {baker, fuel, server} = composedBoard({unknown});
    card(30070, c.corp.archives.cards).faceUp = true;
    c.runner.AI.cachedPotentials = [{server: c.corp.archives, potential: 10, breachPotential: 10},
      {server, potential: 1, breachPotential: 1}];
    const redirect = await redirectedChoice(baker);
    assert.strictEqual(redirect.server, unknown ? null : server);
    assert.strictEqual(fuel.credits, 1);
  }
  // Mandatory origin payment still fires Shackleton exactly once even when
  // Corsair spends Stealth to pass Archives; Rotary cannot waive that damage.
  for (const grip of [3, 4]) {
    const {baker, fuel, server} = composedBoard({grip, pool: 1});
    server.ice[0].advancement = 10; // even Corsair cannot fund the ordinary destination
    card(36004, c.runner.rig.programs); fuel.credits = 2;
    card(31077, c.corp.archives.ice).rezzed = true;
    card(36065, c.corp.archives.root).rezzed = true;
    const action = await command(['trigger', 'run', 'gain']);
    const plan = baker.AIRunAbilityPlan();
    if (verbose) console.log('Origin composition', grip, action, !!(plan && plan.winningAgenda), plan && plan.calculator.TotalEffect(plan.path[plan.path.length - 1]));
    assert.strictEqual(!!(plan && plan.winningAgenda), grip === 4);
    assert.strictEqual(action === 'trigger', grip === 4);
    if (plan) assert.strictEqual(plan.calculator.TotalEffect(plan.path[plan.path.length - 1]).meatDamage, 4);
    assert.strictEqual(fuel.credits, 2);
  }
  // Candidate-only discovery never relaxes Rotary's ordinary route safety.
  const {rotary, server} = composedBoard();
  assert.strictEqual(rotary.AIWinningBreachAgenda(server), null);
  assert.strictEqual(c.runner.AI._publicBreachAgendaCandidates(server).length, 0);

}

main().then(repairedAcceptance).then(composedTerminalAcceptance).then(() => console.log('Vantage Point batch 3 tests passed.')).catch(e => {console.error(e.stack); process.exitCode = 1;});
