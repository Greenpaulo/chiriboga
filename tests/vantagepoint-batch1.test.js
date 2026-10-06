// Run with: node tests/vantagepoint-batch1.test.js
// Permanent batch 1 acceptance, adapted from the retained independent headless
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
async function main() {
  reset();
  const chains = [card(36001, c.runner.grip), card(36001, c.runner.grip)];
  success(c.corp.HQ); success(c.corp.RnD);
  for (const chain of chains) assert.strictEqual(chain.Enumerate().length, 0, 'partial central history is illegal');
  success(c.corp.archives);
  for (const chain of chains) assert.strictEqual(chain.Enumerate().length, 1, 'real dispatch enables every grip copy');
  c.AddTriggersToTriggerList('responseOnCorpTurnBegins');
  for (const chain of chains) assert.strictEqual(chain.Enumerate().length, 0, 'Corp turn clears history');
  history(chains[0]); c.AddTriggersToTriggerList('responseOnRunnerTurnBegins');
  assert.strictEqual(chains[0].Enumerate().length, 0, 'Runner turn clears history');

  // The reward must open prevention without an automatic-trigger phase change.
  for (const fired of [false, true]) {
    reset(); const dive = card(36002, c.runner.resolvingCards);
    dive.runningWithThis = true;
    if (fired) c.AutomaticTriggers('automaticOnSubroutineFiring', [{}, {}]);
    success(c.corp.HQ);
    const choices = c.currentPhase.Enumerate.trigger();
    assert.strictEqual(choices.some(x => x.card === dive), fired);
    if (fired) {
      c.currentPhase.Resolve.trigger(choices.find(x => x.card === dive));
      c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
      assert.strictEqual(c.corp.badPublicity, 1, 'supported helper adds actual publicity');
      assert.strictEqual(c.currentPhase, c.phases.runSuccessful, 'returns to successful-run timing');
    } else assert.strictEqual(c.corp.badPublicity, 0);
    c.currentPhase = c.phases.runEnds; c.currentPhase.Init();
    assert(c.removedFromGame.includes(dive), 'real run-end dispatch removes the event');
    assert.strictEqual(dive.runningWithThis, false);
  }
  reset(); const failed = card(36002, c.runner.resolvingCards); failed.runningWithThis = true;
  c.AutomaticTriggers('automaticOnSubroutineFiring', [{}, {}]);
  c.attackedServer = c.corp.HQ; c.currentPhase = c.phases.runEnds; c.currentPhase.Init();
  assert.strictEqual(c.corp.badPublicity, 0, 'fired subroutine on failed run grants no publicity');
  assert(c.removedFromGame.includes(failed));

  // Real selector spends its expiring opportunity to deny a known immediate win.
  reset(); const chain = card(36001, c.runner.grip); history(chain);
  c.corp.scoreArea = [{player: c.corp, agendaPoints: 6}];
  const remote = c.NewServer('Winning agenda', false); c.corp.remoteServers.push(remote);
  const agenda = card(30070, remote.root); agenda.knownToRunner = true; agenda.advancement = 3;
  const pad1 = card(31080, c.corp.HQ.root); pad1.rezzed = true;
  const pad2 = card(31080, c.corp.RnD.root); pad2.rezzed = true;
  let options = ['play', 'run', 'gain'];
  assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'play');
  assert.strictEqual(c.runner.AI.preferred.cardToPlay, chain);
  const realTrash = c.Trash; let selected;
  c.Trash = cards => { selected = cards; };
  chain.Resolve({}); c.Trash = realTrash;
  assert(selected.includes(agenda), 'known winning agenda displaces generic economy');
  assert(selected.includes(pad1) || selected.includes(pad2));
  // Hidden identity/cost must not leak into ranking, even if it is an agenda.
  agenda.knownToRunner = false;
  Object.defineProperty(agenda, 'agendaPoints', {get() {throw Error('hidden points read');}, configurable: true});
  assert.doesNotThrow(() => chain._corpTargetValue(agenda));

  reset(); const ordinary = card(36001, c.runner.grip); history(ordinary);
  card(31080, c.corp.HQ.root).rezzed = true;
  const corsair = card(36004, c.runner.rig.programs); card(31077, c.corp.HQ.ice).rezzed = true;
  options = ['play', 'gain'];
  assert.notStrictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'preserve sole fracter for ordinary denial');
  c.runner.rig.programs = []; c.runner.AI.preferred = null;
  assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'economy denial without sacrifice is useful');
  c.AddTriggersToTriggerList('responseOnRunnerTurnBegins'); c.currentPhase = c.phases.runnerActionMain; c.runner.AI.preferred = null;
  assert.notStrictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'expired opportunity is declined');

  // CR4: an affordable known winning steal takes precedence over expiring denial.
  for (const mode of ['win', 'ordinary', 'unaffordable', 'click-cost', 'blocked', 'hidden', 'forbidden']) {
    reset(); const event = card(36001, c.runner.grip); history(event);
    c.runner.creditPool = 10; c.runner.clickTracker = 1;
    c.runner.scoreArea = [{player: c.runner, agendaPoints: mode === 'ordinary' ? 0 : 6}];
    const target = c.NewServer('Public agenda', false); c.corp.remoteServers.push(target);
    const prize = card(30070, target.root); prize.knownToRunner = mode !== 'hidden';
    if (mode === 'hidden') Object.defineProperty(prize, 'agendaPoints', {get() {throw Error('read hidden agenda points');}});
    if (mode === 'unaffordable') prize.stealCost = {credits: 11};
    if (mode === 'click-cost') prize.stealCost = {clicks: 1};
    if (mode === 'blocked') card(31077, target.ice).rezzed = true;
    if (mode === 'forbidden') {
      const restriction = {title: 'Steal restriction', player: c.corp, cardType: 'upgrade', rezzed: true,
        modifyCannot: {Resolve(id, targetCard) { return id === 'steal' && targetCard === prize; }}};
      target.root.push(restriction); restriction.cardLocation = target.root;
    }
    for (let i = 0; i < 2; i++) {
      const economy = c.NewServer('Economy ' + i, false); c.corp.remoteServers.push(economy);
      card(31080, economy.root).rezzed = true;
    }
    options = ['play', 'run', 'gain'];
    const command = options[await c.runner.AI.CommandChoice(options)];
    assert.strictEqual(command, mode === 'win' ? 'run' : 'play', 'only an immediate legal affordable win displaces denial: ' + mode);
    if (mode === 'win') {
      assert.strictEqual(c.runner.AI.preferred.serverToRun, target);
      assert.strictEqual(c.runner.AI.cachedPathServer, target);
      assert(c.runner.AI.cachedComplete);
      c.executingCommand = 'run';
      const legalServers = c.phases.runnerActionMain.Enumerate.run();
      assert.strictEqual(legalServers[await c.runner.AI.SelectChoice(legalServers)].server, target);
    } else assert.strictEqual(c.runner.AI.preferred.cardToPlay, event);
    assert.strictEqual(c.attackedServer, null, 'prospective steal checks restore live run context');
  }

  // A rebate earned on the winning route can pay a later steal cost.
  reset(); const expiring = card(36001, c.runner.grip); history(expiring);
  c.runner.creditPool = 1; c.runner.clickTracker = 1; c.runner.scoreArea = [{player: c.runner, agendaPoints: 6}];
  card(31006, c.runner.rig.programs); card(36003, c.runner.rig.hardware);
  const rebateWin = c.NewServer('Rebate funds access', false); c.corp.remoteServers.push(rebateWin);
  const paidPrize = card(30070, rebateWin.root); paidPrize.knownToRunner = true; paidPrize.advancement = 3;
  paidPrize.stealCost = {credits: 1}; card(31077, rebateWin.ice).rezzed = true;
  c.corp.scoreArea = [{player: c.corp, agendaPoints: 6}]; // event is also a justified defensive action
  options = ['play', 'run', 'gain'];
  assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'run', 'rebate funds steal after paying the first break');
  assert.strictEqual(c.runner.AI.preferred.serverToRun, rebateWin);
  c.runner.rig.hardware[0].usedThisTurn = true; c.runner.AI.preferred = null;
  assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'without rebate the steal payment is unaffordable; deny Corp win');

  // A first paid break supplies the second payment, never its own payment.
  for (const used of [false, true]) {
    reset(); card(36004, c.runner.rig.programs);
    const tailor = card(36003, c.runner.rig.hardware); tailor.usedThisTurn = used;
    for (let i = 0; i < 2; i++) card(31077, c.corp.HQ.ice).rezzed = true;
    c.runner.creditPool = 1;
    const path = c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null);
    if (process.env.VERBOSE) console.log('income', used, path && path.map(p => [p.iceIdx,p.runner_credits_spent,p.runner_credits_lost,p.persistents.map(x=>x.action)]));
    assert.strictEqual(Boolean(path), !used, 'once-only income changes two-barrier affordability');
    assert.strictEqual(c.runner.creditPool, 1); assert.strictEqual(tailor.usedThisTurn, used, 'planning is read-only');
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    c.runner.clickTracker = 1;
    assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, used, 'opposing public planner agrees');
    if (path) assert.strictEqual(path[path.length - 1].runner_credits_lost, -1, 'reward counted once across encounters');
    c.runner.creditPool = 0;
    assert.strictEqual(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null), null, 'income cannot prepay first break');
  }
  // TT1: ordinary breakers must get the same public income route as Corsair.
  for (const breakerId of [31006, 36004]) for (const used of [false, true]) for (const pool of [0, 1]) {
    reset(); card(breakerId, c.runner.rig.programs);
    const rebate = card(36003, c.runner.rig.hardware); rebate.usedThisTurn = used;
    for (let i = 0; i < 2; i++) card(31077, c.corp.HQ.ice).rezzed = true;
    c.runner.creditPool = pool; c.runner.clickTracker = 1;
    const feasible = pool === 1 && !used;
    assert.strictEqual(Boolean(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null)), feasible);
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    // Corp gets public resources and Grip size, never the Runner's planner or cards.
    const ownAI = c.runner.AI;
    c.runner.AI = new Proxy({}, {get() {throw Error('Corp read Runner-private planner');}});
    const security = c.corp.AI._evaluateServerSecurity(c.corp.HQ);
    c.runner.AI = ownAI;
    assert.strictEqual(security.isSecure, !feasible, 'ordinary/restricted planners agree on income: ' + [breakerId, used, pool]);
    if (feasible) assert.strictEqual(security.totalMandatoryBreakCost, 1);
    assert.strictEqual(rebate.usedThisTurn, used); assert.strictEqual(c.runner.creditPool, pool);
    assert.strictEqual(c.attackedServer, null);
  }

  // Live pool payments agree with the model: the first break earns the rebate.
  reset(); const liveBreaker = card(36004, c.runner.rig.programs);
  const liveTailor = card(36003, c.runner.rig.hardware);
  const inner = card(31077, c.corp.HQ.ice); inner.rezzed = true;
  const outer = card(31077, c.corp.HQ.ice); outer.rezzed = true;
  c.runner.creditPool = 1; c.attackedServer = c.corp.HQ; c.encountering = true;
  c.approachIce = 1;
  liveBreaker.abilities[0].Resolve.call(liveBreaker, {subroutine: outer.subroutines[0]});
  assert.strictEqual(c.runner.creditPool, 1, 'first real payment returns a pool credit');
  assert.strictEqual(liveTailor.usedThisTurn, true);
  c.approachIce = 0;
  liveBreaker.abilities[0].Resolve.call(liveBreaker, {subroutine: inner.subroutines[0]});
  assert.strictEqual(c.runner.creditPool, 0, 'second real break earns no further income');

  // Corp sacrifice includes hosted resources and threatened ICE, beyond cost.
  reset(); const sacrifice = card(36001, c.runner.resolvingCards);
  const expensive = card(36003, c.runner.rig.hardware);
  const rich = card(36004, c.runner.rig.programs); rich.credits = 6;
  run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
  sacrifice._corpTrashRunnerCard();
  assert.strictEqual(c.corp.AI.preferred.option.card, rich, 'public resource threat outranks printed cost');
  assert.notStrictEqual(c.corp.AI.preferred.option.card, expensive);

  // Installation competes with saving scarce credits and immediate access.
  for (const credits of [1, 10]) {
    reset(); const tailor = card(36003, c.runner.grip); c.runner.creditPool = credits;
    options = ['install', 'gain'];
    assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], credits === 1 ? 'gain' : 'install');
    if (credits === 10) assert.strictEqual(c.runner.AI.preferred.cardToInstall, tailor);
  }
  for (const credits of [2, 10]) {
    reset(); const breaker = card(36004, c.runner.grip); card(31077, c.corp.HQ.ice).rezzed = true; card(36003, c.runner.rig.hardware); c.runner.creditPool = credits; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    options = ['install', 'run', 'gain'];
    const command = options[await c.runner.AI.CommandChoice(options)];
    if (process.env.VERBOSE) console.log('corsair install', credits, command);
    assert.strictEqual(command, credits === 2 ? 'gain' : 'install');
    if (credits === 10) assert.strictEqual(c.runner.AI.preferred.cardToInstall, breaker);
  }
  // Tithe's gain-credit subroutine is harmless; the real run plan lets it fire
  // rather than paying Mimic to break it. Its damage subroutine still matters.
  for (const credits of [2, 10]) {
    reset(); const dive = card(36002, c.runner.grip); card(31008, c.runner.rig.programs);
    card(30073, c.corp.HQ.ice).rezzed = true;
    c.corp.RnD.cards = []; c.corp.archives.cards = [];
    c.runner.creditPool = credits;
    if (credits === 10) for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
    options = ['play', 'run', 'gain'];
    const command = options[await c.runner.AI.CommandChoice(options)];
    if (process.env.VERBOSE) console.log('dive command', credits, command, c.runner.AI.preferred);
    assert.strictEqual(command, credits === 10 ? 'play' : 'gain', 'scarce hand and payment budget decline the reward run');
    if (credits === 10) {
      assert.strictEqual(c.runner.AI.preferred.cardToPlay, dive);
      const path = await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ, dive, null, false);
      assert(path);
      assert(!path.some(p => p.sr_broken.some(sr => sr.idx === 1)), 'do not break the harmless reward-enabling subroutine');
    }
  }
  reset(); const noReward = card(36002, c.runner.grip); c.runner.creditPool = 10;
  options = ['play', 'run', 'gain'];
  assert.notStrictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'empty ICE route is no reason to spend the event');
  card(31077, c.corp.HQ.ice).rezzed = true; c.runner.AI.preferred = null;
  assert.notStrictEqual(options[await c.runner.AI.CommandChoice(options)], 'play', 'ETR is no safe reward opportunity');
  // A winning access takes the last click ahead of a future income install.
  reset(); const heldTailor = card(36003, c.runner.grip); c.runner.creditPool = 10; c.runner.clickTracker = 1;
  c.runner.scoreArea = [{player: c.runner, agendaPoints: 6}];
  const openRemote = c.NewServer('Immediate win', false); c.corp.remoteServers.push(openRemote);
  card(30070, openRemote.root).knownToRunner = true;
  options = ['run', 'install', 'gain'];
  assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'run', 'winning access precedes economy');
  assert.strictEqual(c.runner.AI.preferred.serverToRun, openRemote);
  assert(c.runner.grip.includes(heldTailor));

  // Reward prevention goes through the actual nested response phases.
  reset(); const prevented = card(36002, c.runner.resolvingCards);
  prevented.runningWithThis = true; prevented.subroutineResolvedThisRun = true;
  const preventer = {title: 'Publicity prevention', player: c.corp, cardType: 'asset', rezzed: true,
    responsePreventableAddBadPublicity: {Resolve() {c.intended.badPublicity = 0;}}};
  c.corp.HQ.root.push(preventer); preventer.cardLocation = c.corp.HQ.root;
  success(c.corp.HQ);
  c.currentPhase.Resolve.trigger(c.currentPhase.Enumerate.trigger().find(x => x.card === prevented));
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
  assert.strictEqual(c.currentPhase.triggerCallbackName, 'responsePreventableAddBadPublicity');
  if (!c.currentPhase.Enumerate.trigger().some(x => x.card === preventer)) c.currentPhase.Resolve.n({});
  c.currentPhase.Resolve.trigger(c.currentPhase.Enumerate.trigger().find(x => x.card === preventer));
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
  for (let i = 0; i < 3 && c.currentPhase !== c.phases.runSuccessful; i++) c.currentPhase.Resolve.n({});
  assert.strictEqual(c.corp.badPublicity, 0, 'prevention completes before applying reward');
  assert.strictEqual(c.currentPhase, c.phases.runSuccessful);
  c.currentPhase = c.phases.runEnds; c.currentPhase.Init();
  assert(c.removedFromGame.includes(prevented));

  // Finite-repeat continuation carries the spent once-per-turn rebate.
  for (const pool of [1, 2]) {
    reset(); card(36004, c.runner.rig.programs); card(36003, c.runner.rig.hardware);
    card(31077, c.corp.HQ.ice).rezzed = true;
    const stop = card(31077, c.corp.HQ.ice); stop.rezzed = true; stop.AIRunExtraRuns = () => 1;
    run('this.finiteRC = new RunCalculator(); finiteRC.suppressOutput = true; finiteRC._runnerPlanning = true;');
    const paths = c.finiteRC.Calculate(c.corp.HQ, 2, pool, 0, 0, 0, false, null);
    assert.strictEqual(paths.length > 0, pool === 2, 'repeat needs another payment and grants no second rebate');
    assert.strictEqual(c.runner.rig.hardware[0].usedThisTurn, false);
  }
  for (const breakerId of [31006, 36004]) for (const pool of [1, 2]) {
    reset(); card(breakerId, c.runner.rig.programs); card(36003, c.runner.rig.hardware);
    card(31077, c.corp.HQ.ice).rezzed = true;
    const finite = card(31077, c.corp.HQ.ice); finite.rezzed = true; finite.AIRunExtraRuns = () => 1;
    c.runner.creditPool = pool; c.runner.clickTracker = 2;
    const route = await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ, null, null, false);
    assert.strictEqual(Boolean(route), pool === 2, 'repeat exhausts income with either breaker');
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, pool === 1, 'opposing finite-repeat budget agrees');
    assert.strictEqual(c.runner.rig.hardware[0].usedThisTurn, false);
  }
  // Pure debuff contrast, preserved from independent evidence.
  for (const installed of [false, true]) {
    reset(); card(36004, c.runner.rig.programs); if (installed) card(36003, c.runner.rig.hardware);
    card(31077, c.corp.HQ.ice).rezzed = true; c.runner.creditPool = 1;
    assert.strictEqual(Boolean(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null)), installed);
  }
}
main().then(() => console.log('Vantage Point batch 1 acceptance passed.')).catch(e => {console.error(e.stack); process.exitCode = 1;});
