// Run with: node tests/vantagepoint-batch2.test.js
// Permanent batch 2 acceptance, adapted from the retained independent headless
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



const c = context;
c.PlaySound = () => {}; c.PlayCreditGainSound = () => {}; c.Render = () => {}; c.UpdateCounters = () => {};
c.suppressCreditDrawSound = true;
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
async function access(credits, power, normalTrash, trashCost = 4) {
  reset();
  const lamp = card(36005, c.runner.rig.programs); lamp.power = power;
  const source = card(36020, c.runner.rig.hardware); source.credits = credits;
  c.attackedServer = c.corp.HQ;
  c.accessingCard = card(36057, c.corp.HQ.cards); c.accessingCard.trashCost = trashCost;
  c.currentPhase = c.phases.runAccessingCard;
  const options = ['n'];
  if (lamp.abilities[0].Enumerate.call(lamp).length) options.unshift('trigger');
  if (normalTrash) options.unshift('trash');
  return {action: options[await c.runner.AI.CommandChoice(options)], lamp, source};
}
async function nurse(credits, facedown, companion = true, eligible = true, extras = {}) {
  reset();
  const host = card(36006, c.runner.rig.resources);
  if (companion) {const stick = card(36008, host.hostedCards); stick.host = host;}
  const n = card(36007, c.runner.grip);
  if (!eligible) n.unique = false;
  c.runner.creditPool = credits; c.corp.archives.cards = [];
  for (let i = 0; i < facedown; i++) card(30070, c.corp.archives.cards).faceUp = false;
  if (extras.stack !== undefined) c.runner.stack = c.runner.stack.slice(0, extras.stack);
  if (extras.clicks !== undefined) c.runner.clickTracker = extras.clicks;
  for (let i = 0; i < (extras.grip || 0); i++) card(30020, c.runner.grip);
  if (extras.blocked) card(30072, c.corp.archives.ice).rezzed = true;
  const options = ['install', 'draw', 'gain'];
  const action = options[await c.runner.AI.CommandChoice(options)];
  let chosen = null;
  if (action === 'install') {
    c.executingCommand = 'install';
    const legal = c.ChoicesCardInstall(n);
    chosen = legal[await c.runner.AI.SelectChoice(legal)];
  }
  return {action, chosen, host, n};
}
function drawRoute(grip, stack, used = false) {
  reset(); c.runner.stack = [];
  for (let i = 0; i < grip; i++) card(30020, c.runner.grip);
  for (let i = 0; i < stack; i++) card(30020, c.runner.stack);
  c.runner.creditPool = 10;
  const stick = card(36008, c.runner.rig.resources); stick.usedThisTurn = used;
  card(30073, c.corp.HQ.ice).rezzed = true;
  card(36039, c.corp.HQ.ice).rezzed = true;
  const path = c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1);
  run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
  const security = c.corp.AI._evaluateServerSecurity(c.corp.HQ);
  return {path, security, stick};
}
async function stickSetup(winning, stack = 0, paired = false, clicks = 4) {
  reset(); c.runner.stack = [];
  const stick = card(36008, c.runner.grip); card(30020, c.runner.grip);
  for (let i = 0; i < stack; i++) card(30020, c.runner.stack);
  if (paired) {
    const host = card(36006, c.runner.rig.resources);
    const n = card(36007, host.hostedCards); n.host = host;
  }
  c.runner.creditPool = 10; c.runner.clickTracker = clicks;
  if (winning) c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  const server = c.NewServer('Known agenda', false); c.corp.remoteServers.push(server);
  card(30070, server.root).knownToRunner = true;
  card(30073, server.ice).rezzed = true;
  const before = {grip: c.runner.grip.slice(), stack: c.runner.stack.slice(), credits: c.runner.creditPool,
    clicks: c.runner.clickTracker, location: stick.cardLocation, host: stick.host};
  const options = ['install', 'run', 'gain'];
  const action = options[await c.runner.AI.CommandChoice(options)];
  assert.deepStrictEqual(Array.from(c.runner.grip), Array.from(before.grip), 'preparation cannot mutate Grip');
  assert.deepStrictEqual(Array.from(c.runner.stack), Array.from(before.stack), 'planning cannot draw hidden cards');
  assert.strictEqual(c.runner.creditPool, before.credits); assert.strictEqual(c.runner.clickTracker, before.clicks);
  assert.strictEqual(stick.cardLocation, before.location); assert.strictEqual(stick.host, before.host);
  if (action === 'run') {
    c.executingCommand = 'run'; const choices = c.currentPhase.Enumerate.run();
    const selectedServer = choices[await c.runner.AI.SelectChoice(choices)].server;
    if (winning) assert.strictEqual(selectedServer, server);
  } else if (action === 'install') {
    c.executingCommand = 'install'; const choices = c.ChoicesCardInstall(stick);
    const selected = choices[await c.runner.AI.SelectChoice(choices)];
    assert.strictEqual(selected.card, stick);
    assert(selected.host, 'useful paired hand-space installation uses its host');
  }
  return {action, server, stick};
}
// C2-4: positive pool savings must not consume funding for a public winning
// steal. Exercise actual access command/card selection and payment resolution.
async function decisiveAccess(stealth, normalTrash = 3, pool = 10, points = 6, flexible = false, extras = {}) {
  reset();
  const lamp = extras.noLampades ? null : card(36005, c.runner.rig.programs);
  if (lamp) lamp.power = 1;
  const source = card(36020, c.runner.rig.hardware); source.credits = stealth;
  card(36004, c.runner.rig.programs);
  const remote = c.NewServer('Public winning agenda', false); c.corp.remoteServers.push(remote);
  const agenda = card(extras.clickAgenda ? 36026 : 30070, remote.root); agenda.knownToRunner = true;
  card(30072, remote.ice).rezzed = true;
  c.runner.temporaryCredits = extras.temporary || 0;
  const azimat = extras.azimat ? card(35029, c.runner.rig.programs) : null;
  if (azimat) azimat.credits = 2;
  c.runner.creditPool = pool; c.runner.clickTracker = extras.clicks === undefined ? 3 : extras.clicks;
  if (extras.stealCost !== undefined) agenda.stealCost = {credits: extras.stealCost};
  if (extras.hidden) agenda.knownToRunner = false;
  c.runner.scoreArea = [{agendaPoints: points, player: c.runner}];
  for (let i = 0; i < 7; i++) card(30020, c.runner.grip);
  if (flexible) c.runner.rig.hardware.unshift({title: 'Access-only stealth', player: c.runner,
    cardType: 'hardware', subTypes: ['Stealth'], credits: 1,
    canUseCredits: (doing, target) => doing === 'using' && target === lamp});
  if (extras.lockAccessPool) c.runner.rig.resources.push({title: 'Trash payment pool lock',
    player: c.runner, cardType: 'resource',
    preventCreditPoolUse: (player, action, doing) => player === c.runner &&
      action === 'spend' && doing === 'paying trash costs'});
  const hiddenRemote = c.NewServer('Concealed', false); c.corp.remoteServers.push(hiddenRemote);
  hiddenRemote.root.push({player: c.corp, faceUp: false, knownToRunner: false,
    get title() {throw Error('hidden Corp title read');},
    get cardType() {throw Error('hidden Corp type read');}});
  c.runner.stack = [{player: c.runner, get title() {throw Error('hidden Stack title read');}}];
  c.attackedServer = c.corp.HQ;
  c.accessingCard = card(36057, c.corp.HQ.cards); c.accessingCard.trashCost = normalTrash;
  c.currentPhase = c.phases.runAccessingCard;
  const options = ['trash', 'steal', 'trigger', 'n'].filter(command => c.currentPhase.Enumerate[command]().length);
  const old = {rc: c.runner.AI.rc, path: c.runner.AI.cachedBestPath,
    costs: c.runner.AI.cachedCosts, runs: c.runner.AI.runsEverCalculated,
    server: c.attackedServer, phase: c.currentPhase,
    costsJSON: JSON.stringify(c.runner.AI.cachedCosts), runsJSON: JSON.stringify(c.runner.AI.runsEverCalculated)};
  const action = options[await c.runner.AI.CommandChoice(options)];
  assert.strictEqual(c.runner.creditPool, pool); assert.strictEqual(source.credits, stealth);
  if (lamp) assert.strictEqual(lamp.power, 1);
  assert.strictEqual(c.attackedServer, old.server);
  assert.strictEqual(c.currentPhase, old.phase); assert.strictEqual(c.runner.AI.rc, old.rc);
  assert.strictEqual(c.runner.AI.cachedBestPath, old.path);
  assert.strictEqual(c.runner.AI.cachedCosts, old.costs);
  assert.strictEqual(c.runner.AI.runsEverCalculated, old.runs);
  assert.strictEqual(JSON.stringify(c.runner.AI.cachedCosts), old.costsJSON);
  assert.strictEqual(JSON.stringify(c.runner.AI.runsEverCalculated), old.runsJSON);
  if (action === 'trigger') {
    c.executingCommand = 'trigger';
    const legal = c.currentPhase.Enumerate.trigger();
    const selected = legal[await c.runner.AI.SelectChoice(legal)];
    assert.strictEqual(selected.card, lamp);
    c.executingCommand = '';
    c.phases.runAccessingCard.Resolve.trigger(selected);
    const parameters = c.currentPhase.Enumerate.continue();
    const parameter = parameters[await c.runner.AI.SelectChoice(parameters)];
    c.currentPhase.Resolve.continue(parameter);
  } else if (action === 'trash') {
    c.phases.runAccessingCard.Resolve.trash.call(c.phases.runAccessingCard);
  }
  c.attackedServer = remote;
  const route = c.runner.AI._calculateBestCompleteRun(remote, 0, 0, 0, 0, null, 0);
  return {action, route, lamp, source, agenda, remote, azimat};
}
async function main() {
  let decisive = await decisiveAccess(2);
  assert.strictEqual(decisive.action, 'trash', 'positive savings cannot destroy the winning steal');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  assert.strictEqual(decisive.lamp.power, 1); assert.strictEqual(c.runner.creditPool, 7);
  decisive = await decisiveAccess(3);
  assert.strictEqual(decisive.action, 'trigger', 'spare stealth makes the savings useful');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  assert.strictEqual(decisive.lamp.power, 0); assert.strictEqual(c.runner.creditPool, 10);
  decisive = await decisiveAccess(2, 3, 1);
  assert.strictEqual(decisive.action, 'n', 'decline when ordinary trash is unaffordable');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  decisive = await decisiveAccess(2, 0);
  assert.strictEqual(decisive.action, 'trash'); assert(decisive.route);
  decisive = await decisiveAccess(2, 3, 10, 6, true);
  assert.strictEqual(decisive.action, 'trigger', 'actual access-only allocation preserves both breaker credits');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  assert.strictEqual(c.runner.rig.hardware[0].credits, 0);
  decisive = await decisiveAccess(2, 3, 10, 0);
  assert.strictEqual(decisive.action, 'trigger', 'no decisive public opportunity requires this reserve');
  decisive = await decisiveAccess(2, 3, 10, 6, false, {stealCost: 8});
  assert.strictEqual(decisive.action, 'n', 'ordinary pool trash also loses an expensive winning steal');
  assert(decisive.route); assert.strictEqual(c.runner.creditPool, 10);
  decisive = await decisiveAccess(3, 3, 10, 6, false, {stealCost: 8});
  assert.strictEqual(decisive.action, 'trigger', 'spare stealth preserves the pool for the steal cost');
  assert(decisive.route);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {hidden: true});
  assert.strictEqual(decisive.action, 'trigger', 'concealed agendas cannot drive the reserve decision');
  decisive = await decisiveAccess(2, 3, 10, 6, false, {clicks: 0});
  assert.strictEqual(decisive.action, 'trigger', 'no follow-up click means no immediate winning opportunity');
  // Real trash-only recurring credits can pay safely with a scarce pool.
  // Azimat precedes Methuselah in ActiveCards just as in live SpendCredits.
  decisive = await decisiveAccess(2, 2, 1, 6, false, {azimat: true});
  assert.strictEqual(decisive.action, 'trash', 'legal Azimat funding preserves the winning run');
  assert(decisive.route); assert.strictEqual(decisive.azimat.credits, 0);
  assert.strictEqual(decisive.source.credits, 2); assert.strictEqual(c.runner.creditPool, 1);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {temporary: 3});
  assert.strictEqual(decisive.action, 'trash'); assert(decisive.route);
  assert.strictEqual(c.runner.temporaryCredits, 0); assert.strictEqual(c.runner.creditPool, 10);
  assert.strictEqual(decisive.source.credits, 2);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {noLampades: true});
  assert.strictEqual(decisive.action, 'trash', 'ordinary access without Lampades preserves decisive funding');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  assert.strictEqual(c.runner.creditPool, 7);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {clickAgenda: true, clicks: 2});
  assert.strictEqual(decisive.action, 'trash'); assert(decisive.route);
  assert.strictEqual(decisive.source.credits, 2); assert.strictEqual(c.runner.creditPool, 7);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {clickAgenda: true, clicks: 1});
  assert.strictEqual(decisive.action, 'trigger', 'additional steal click removes the expired winning reserve');
  assert.strictEqual(decisive.source.credits, 1); assert.strictEqual(decisive.lamp.power, 0);
  decisive = await decisiveAccess(2, 3, 10, 6, false, {lockAccessPool: true});
  assert.strictEqual(decisive.action, 'n', 'locked pool cannot replace indispensable stealth');
  assert(decisive.route); assert.strictEqual(decisive.source.credits, 2);
  assert.strictEqual(c.runner.creditPool, 10);
  decisive = await decisiveAccess(2, 2, 10, 6, false, {lockAccessPool: true, azimat: true});
  assert.strictEqual(decisive.action, 'trash', 'eligible trash credits remain usable with a locked pool');
  assert(decisive.route); assert.strictEqual(decisive.azimat.credits, 0);
  assert.strictEqual(decisive.source.credits, 2); assert.strictEqual(c.runner.creditPool, 10);
  // A throwing resource consumer after hypothetical debit must restore funding
  // and encounter context, too. No decision/planner method is replaced.
  decisive = await decisiveAccess(3);
  const source = decisive.source;
  const originalEligibility = source.canUseCredits;
  source.canUseCredits = function () {
    if (this.credits === 1) throw Error('hypothetical source failure');
    return originalEligibility.apply(this, arguments);
  };
  c.attackedServer = c.corp.HQ; c.encountering = true; c.approachIce = 2;
  c.runner.temporaryCredits = 4;
  const rc = c.runner.AI.rc;
  assert.throws(() => c.runner.AI._accessPaymentPreservesWinningRun({hosted: [{card: source, amount: 1}]}),
    /hypothetical source failure/);
  assert.strictEqual(source.credits, 2); assert.strictEqual(c.runner.creditPool, 10);
  assert.strictEqual(c.runner.temporaryCredits, 4); assert.strictEqual(c.attackedServer, c.corp.HQ);
  assert.strictEqual(c.encountering, true); assert.strictEqual(c.approachIce, 2);
  assert.strictEqual(c.runner.AI.rc, rc);
  assert.strictEqual((await access(1, 3, true)).action, 'trigger');
  assert.strictEqual((await access(0, 3, true)).action, 'trash');
  assert.strictEqual((await access(1, 0, true)).action, 'trash');
  assert.strictEqual((await access(1, 3, false)).action, 'trigger');
  // A cheap ordinary trash preserves the last stealth credit and finite power
  // for a subsequent barrier run. Compare the actual Corsair route below.
  let result = await access(2, 1, true, 0);
  assert.strictEqual(result.action, 'trash');
  const corsair = card(36004, c.runner.rig.programs);
  const remote = c.NewServer('Urgent steal', false); c.corp.remoteServers.push(remote);
  card(30070, remote.root).knownToRunner = true;
  card(30072, remote.ice).rezzed = true;
  c.runner.creditPool = 10; c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  c.attackedServer = remote;
  assert(c.runner.AI._calculateBestCompleteRun(remote, 0, 0, 0, 0, null, 0), 'saved stealth funds Corsair');
  result.source.credits = 0;
  assert.strictEqual(c.runner.AI._calculateBestCompleteRun(remote, 0, 0, 0, 0, null, 0), null, 'pool cannot replace Corsair stealth');
  // Real hosted-payment callbacks preserve a breaker-capable source even
  // when it appears last in installed-card order.
  result = await access(2, 3, false);
  const narrow = {title: 'Access-only stealth', player: c.runner, cardType: 'hardware',
    subTypes: ['Stealth'], credits: 1, canUseCredits: (doing, target) => doing === 'using' && target === result.lamp};
  c.runner.rig.hardware.unshift(narrow);
  let paid = false;
  result.lamp._spendStealthCredits(1, () => {paid = true;});
  assert(paid); assert.strictEqual(narrow.credits, 0); assert.strictEqual(result.source.credits, 2);
  for (const credits of [0, 1]) {
    const n = await nurse(credits, 2);
    assert.strictEqual(n.action, 'install'); assert.strictEqual(n.chosen.card, n.n);
    assert.strictEqual(n.chosen.host, n.host, 'free paired hosting preserves scarce credits');
    assert.strictEqual(c.InstallCost(n.n, n.chosen.host), 0);
    c.MoveCard(n.n, n.host.hostedCards); n.n.host = n.host;
    assert.strictEqual(c.MaxHandSize(c.runner), 7);
  }
  const ordinary = await nurse(1, 2, true, false);
  assert.strictEqual(ordinary.action, 'install'); assert.strictEqual(ordinary.chosen.host, null);
  for (const facedown of [0, 1]) assert.notStrictEqual((await nurse(1, facedown)).action, 'install');
  reset();
  const host = card(36006, c.runner.grip); card(36007, c.runner.grip);
  // One discount cannot repay a two-credit, one-click setup.
  const options = ['install', 'draw', 'gain'];
  assert.notStrictEqual(options[await c.runner.AI.CommandChoice(options)], 'install');
  // C2-1: the first damage precedes a finite draw, replenishing the card
  // needed to survive inner Tithe. Both actual planners agree.
  for (const [grip, stack, used, feasible] of [[1, 1, false, true], [0, 1, false, false],
    [1, 0, false, false], [1, 0, true, true], [2, 0, false, true]]) {
    const route = drawRoute(grip, stack, used);
    assert.strictEqual(Boolean(route.path), feasible, `Runner ordered draw ${grip}/${stack}/${used}`);
    assert.strictEqual(route.security.isSecure, !feasible, `Corp ordered draw ${grip}/${stack}/${used}`);
  }
  // Hidden Stack identities do not affect the public route resource model.
  let route = drawRoute(1, 1);
  const expected = c.runner.AI.rc.PathCost(route.path);
  c.runner.stack[0] = {get title() {throw Error('hidden Stack title read');}, player: c.runner};
  assert.strictEqual(c.runner.AI.rc.PathCost(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1)), expected);
  // C2-3: no Stack means setup destroys the run; run directly, including
  // the known winning steal. With a pair and finite draw, setup is useful.
  for (const winning of [false, true]) assert.strictEqual((await stickSetup(winning)).action, 'run');
  assert.strictEqual((await stickSetup(false, 2, true)).action, 'install');
  assert.notStrictEqual((await stickSetup(false, 2, true, 1)).action, 'install');
  // Live breach dispatch moves the actual cards, once per reveal group.
  for (const facedown of [0, 1, 2]) {
    reset(); card(36007, c.runner.rig.resources); c.runner.stack = [];
    card(30020, c.runner.stack); card(30020, c.runner.stack);
    c.corp.archives.cards = [];
    for (let i = 0; i < facedown; i++) card(30070, c.corp.archives.cards).faceUp = false;
    c.attackedServer = c.corp.archives; c.currentPhase = c.phases.runBreachServer;
    c.currentPhase.Init();
    assert.strictEqual(c.runner.grip.length, facedown >= 2 ? 2 : 0);
    assert(c.corp.archives.cards.every(x => x.faceUp));
  }
  for (const extras of [{stack: 0}, {stack: 1}, {clicks: 1}, {grip: 7}, {blocked: true}]) {
    const n = await nurse(1, 2, false, true, extras);
    assert.notStrictEqual(n.action, 'install', `decline unusable Nurse setup: ${JSON.stringify(extras)}`);
  }
  // Once installed, useful public draw changes the actual server selection;
  // empty Stack and already faceup Archives remove that bonus.
  reset(); card(36007, c.runner.rig.resources); c.corp.archives.cards = [];
  card(30070, c.corp.archives.cards).faceUp = false; card(30070, c.corp.archives.cards).faceUp = false;
  let optionsRun = ['run', 'draw', 'gain'];
  assert.strictEqual(optionsRun[await c.runner.AI.CommandChoice(optionsRun)], 'run');
  c.executingCommand = 'run'; let legalRun = c.currentPhase.Enumerate.run();
  assert.strictEqual(legalRun[await c.runner.AI.SelectChoice(legalRun)].server, c.corp.archives);
  c.executingCommand = ''; c.runner.stack = [];
  const exhaustedAction = optionsRun[await c.runner.AI.CommandChoice(optionsRun)];
  if (exhaustedAction === 'run') {
    c.executingCommand = 'run'; legalRun = c.currentPhase.Enumerate.run();
    assert.notStrictEqual(legalRun[await c.runner.AI.SelectChoice(legalRun)].server, c.corp.archives, 'no draw bonus after Stack exhaustion');
  }
  // C2-5: a complete public winning steal outranks Nurse's useful draw.
  // Ordinary run choices must retain that outcome tier without relying on an
  // expiring event in Grip. Controls preserve the useful draw-only alternative.
  for (const mode of ['installed', 'grip', 'absent', 'empty-stack', 'faceup',
      'draw-only', 'blocked', 'unaffordable', 'click-cost', 'forbidden', 'hidden', 'breach-blocked']) {
    reset();
    if (mode !== 'absent') card(36007, mode === 'grip' ? c.runner.grip : c.runner.rig.resources);
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    c.corp.archives.cards = []; c.corp.HQ.cards = []; c.corp.RnD.cards = [];
    for (let i = 0; i < 2; i++) card(30054, c.corp.archives.cards).faceUp = mode === 'faceup';
    const target = c.NewServer('Immediate win', false); c.corp.remoteServers.push(target);
    const prize = card(30070, target.root); prize.knownToRunner = mode !== 'hidden';
    if (mode === 'hidden') Object.defineProperty(prize, 'agendaPoints', {get() {throw Error('hidden agenda points');}});
    c.runner.clickTracker = 1;
    if (mode === 'empty-stack') c.runner.stack = [];
    if (mode === 'draw-only') c.runner.scoreArea = [];
    if (mode === 'blocked') card(31077, target.ice).rezzed = true;
    if (mode === 'unaffordable') prize.stealCost = {credits: 6};
    if (mode === 'click-cost') prize.stealCost = {clicks: 1};
    if (mode === 'forbidden') {
      const restriction = {title: 'Public steal restriction', player: c.corp, cardType: 'upgrade', rezzed: true,
        modifyCannot: {Resolve(id, x) {return id === 'steal' && x === prize;}}};
      target.root.push(restriction); restriction.cardLocation = target.root;
    }
    if (mode === 'breach-blocked') {
      c.runner.rig.resources.push({title: 'Public breach replacement', player: c.runner,
        cardType: 'resource', AIPreventBreach(server) {return server === target;}});
    }
    const grip = c.runner.grip.slice(), stack = c.runner.stack.slice();
    const credits = c.runner.creditPool;
    const options = ['run', 'draw', 'gain'];
    assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'run', mode);
    c.executingCommand = 'run';
    const choices = c.currentPhase.Enumerate.run();
    const selected = choices[await c.runner.AI.SelectChoice(choices)].server;
    const win = ['installed', 'grip', 'absent', 'empty-stack', 'faceup'].includes(mode);
    assert.strictEqual(selected, win ? target : c.corp.archives,
      'only a public legal affordable immediate win displaces useful draw: ' + mode);
    if (win) {
      assert.strictEqual(c.runner.AI.cachedPathServer, target);
      assert(c.runner.AI.cachedComplete, 'chosen win has a complete route');
    }
    assert.strictEqual(c.attackedServer, null, 'prospective route restores run context');
    assert.strictEqual(c.encountering, false);
    assert.strictEqual(c.runner.clickTracker, 1);
    assert.strictEqual(c.runner.creditPool, credits);
    assert.deepStrictEqual(c.runner.grip, grip, 'no hypothetical preparation consumes Grip');
    assert.deepStrictEqual(c.runner.stack, stack, 'no hypothetical draw consumes Stack');
    c.executingCommand = '';
  }
  // Real restricted route funding and later steal costs must both fit.
  for (const stealth of [0, 2]) {
    reset(); card(36007, c.runner.rig.resources);
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    c.runner.clickTracker = 1; c.corp.HQ.cards = []; c.corp.RnD.cards = [];
    c.corp.archives.cards = [];
    for (let i = 0; i < 2; i++) card(30054, c.corp.archives.cards).faceUp = false;
    card(36004, c.runner.rig.programs);
    for (let i = 0; i < 2; i++) card(30020, c.runner.grip); // retain Grip during last-click route planning
    const source = card(36020, c.runner.rig.hardware); source.credits = stealth;
    const target = c.NewServer('Funded public win', false); c.corp.remoteServers.push(target);
    const prize = card(30070, target.root); prize.knownToRunner = true; prize.stealCost = {credits: 1};
    card(30072, target.ice).rezzed = true;
    const options = ['run', 'draw', 'gain'];
    assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'run');
    c.executingCommand = 'run'; const legal = c.currentPhase.Enumerate.run();
    assert.strictEqual(legal[await c.runner.AI.SelectChoice(legal)].server,
      stealth ? target : c.corp.archives, 'winning route requires its real stealth payment');
    assert.strictEqual(source.credits, stealth, 'planning never spends hosted credits');
    assert.strictEqual(c.runner.creditPool, 5);
    assert.strictEqual(c.attackedServer, null);
    c.executingCommand = '';
  }
  // A failing prospective steal-cost hook restores the live context and never
  // invokes hypothetical install/run-event preparation or consumes resources.
  reset(); card(36007, c.runner.rig.resources);
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
  const exceptionServer = c.NewServer('Throwing public cost', false); c.corp.remoteServers.push(exceptionServer);
  const exceptionPrize = card(30070, exceptionServer.root); exceptionPrize.knownToRunner = true;
  Object.defineProperty(exceptionPrize, 'stealCost', {get() {throw Error('prospective steal cost');}});
  const exceptionGrip = c.runner.grip.slice(), exceptionStack = c.runner.stack.slice();
  await assert.rejects(c.runner.AI._winningRunBeforeOpportunity(), /prospective steal cost/);
  assert.strictEqual(c.attackedServer, null);
  assert.strictEqual(c.runner.creditPool, 5);
  assert.strictEqual(c.runner.clickTracker, 4);
  assert.deepStrictEqual(c.runner.grip, exceptionGrip);
  assert.deepStrictEqual(c.runner.stack, exceptionStack);
  // The extra subroutine can be broken or bypassed. Neither promises its draw
  // to fund damage on the inner ICE. A live broken insertion stays broken.
  route = drawRoute(1, 1);
  card(30015, c.runner.rig.programs);
  const withBreaker = c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1);
  assert(withBreaker);
  const originalCount = c.corp.HQ.ice[1].subroutines.length;
  route.stick.automaticOnEncounter.Resolve.call(route.stick, c.corp.HQ.ice[1]);
  route.stick.addedSubroutine.broken = true;
  let description = c.runner.AI.rc.IceAI(c.corp.HQ.ice[1], 20, false, 1);
  assert.strictEqual(description.sr[0][0].length, 0, 'live broken injected subroutine is masked');
  route.stick.responseOnEncounterEnds.Resolve.call(route.stick);
  assert.strictEqual(c.corp.HQ.ice[1].subroutines.length, originalCount);
  route = drawRoute(0, 1);
  // Inside Job is a real bypass consumer; it prevents both damage and draw,
  // so inner Tithe remains lethal with an empty Grip.
  const job = card(31018, c.runner.resolvingCards);
  c.runner.AI.rc.runEvent = job;
  assert.strictEqual(c.runner.AI.rc.Calculate(c.corp.HQ, 3, 10, 0, 0, 0, false, null).length, 0);
  c.runner.grip.push(c.InstanceCard(30020, null, null));
  const bypass = c.runner.AI.rc.Calculate(c.corp.HQ, 3, 10, 0, 1, 0, false, null);
  assert(bypass.length);
  assert(bypass.some(path => !path.at(-1).effects.flat().includes('drawCard')));
  // A finite free prevention source supplies the public budget understood by
  // both planners. Its real engine response consumes exactly that budget.
  route = drawRoute(0, 1);
  const preventer = {title: 'Finite net prevention', player: c.runner, cardType: 'hardware', remaining: 1,
    AINetDamagePrevention() {return this.remaining;},
    responsePreventableDamage: {
      Enumerate() {return c.intended.damageType === 'net' && this.remaining > 0 ? [{}] : [];},
      Resolve() {const amount = Math.min(this.remaining, c.intended.damage); c.intended.damage -= amount; this.remaining -= amount;}
    }};
  c.runner.rig.hardware.push(preventer); preventer.cardLocation = c.runner.rig.hardware;
  assert(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1), 'prevented first damage still draws');
  assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, false);
  preventer.remaining = 0;
  assert.strictEqual(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1), null);
  assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, true);
  preventer.remaining = 1; c.runner.AI = null; c.corp.AI = null;
  const ice = c.corp.HQ.ice[1];
  route.stick.automaticOnEncounter.Resolve.call(route.stick, ice);
  route.stick.addedSubroutine.Resolve.call(ice);
  for (let i = 0; i < 20 && c.currentPhase !== c.phases.runnerActionMain; i++) {
    const triggers = c.currentPhase.Enumerate.trigger ? c.currentPhase.Enumerate.trigger() : [];
    const prevention = triggers.find(x => x.card === preventer);
    if (prevention) c.currentPhase.Resolve.trigger(prevention);
    else if (c.currentPhase.Enumerate.continue) c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
    else if (c.currentPhase.Resolve.n) c.currentPhase.Resolve.n({});
    else throw Error('unexpected damage response phase');
  }
  assert.strictEqual(preventer.remaining, 0);
  assert.strictEqual(c.runner.grip.length, 1, 'real zero-damage continuation still draws the actual Stack card');
  assert.strictEqual(c.runner.stack.length, 0);
  route.stick.responseOnEncounterEnds.Resolve.call(route.stick);
  assert.strictEqual(ice.subroutines.length, originalCount);
  // Setup pays off through durable hand capacity when both members are in
  // an overfull Grip; a lone future discount above was correctly declined.
  reset(); const setupHost = card(36006, c.runner.grip);
  card(36007, c.runner.grip); card(36008, c.runner.grip);
  for (let i = 0; i < 5; i++) card(30020, c.runner.grip);
  c.runner.creditPool = 2;
  let setupOptions = ['install', 'draw', 'gain'];
  assert.strictEqual(setupOptions[await c.runner.AI.CommandChoice(setupOptions)], 'install');
  assert.strictEqual(c.runner.AI.preferred.cardToInstall, setupHost, 'fund setup before the paired resources');
  c.executingCommand = 'install'; let setups = c.ChoicesCardInstall(setupHost);
  assert.strictEqual(setups[await c.runner.AI.SelectChoice(setups)].card, setupHost);
  // A sacrificial Event Horizon requires a second traversal. The first
  // encounter's draw and prevention are finite resources, not fresh per run.
  for (const grip of [1, 2]) {
    reset(); c.runner.stack = [];
    for (let i = 0; i < grip; i++) card(30020, c.runner.grip);
    card(30020, c.runner.stack); card(30020, c.runner.stack);
    const stick = card(36008, c.runner.rig.resources);
    c.runner.creditPool = 20; c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    const target = c.NewServer('Finite rerun', false); c.corp.remoteServers.push(target);
    card(30070, target.root).knownToRunner = true;
    card(30073, target.ice).rezzed = true; card(36058, target.ice).rezzed = true;
    run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
    const finite = c.runner.AI._calculateBestCompleteRun(target, 0, 0, 0, 0, null, 1);
    assert.strictEqual(Boolean(finite), grip === 2);
    assert.strictEqual(c.corp.AI._evaluateServerSecurity(target).isSecure, grip !== 2);
    if (finite) assert.strictEqual(finite.at(-1).effects.flat().filter(effect => effect === 'drawCard').length, 1);
    assert.strictEqual(stick.usedThisTurn, false, 'hypothetical rerun cannot consume live opportunity');
    assert.strictEqual(c.runner.stack.length, 2, 'draw count never moves hidden cards during planning');
  }
  // Hypothetical evaluation restores own zones/resources even on an error.
  reset(); const pending = card(36008, c.runner.grip); card(30020, c.runner.grip);
  const savedGrip = c.runner.grip.slice(), savedLocation = pending.cardLocation;
  const bad = card(30073, c.corp.HQ.ice); bad.rezzed = true;
  bad.AIImplementIce = () => {throw Error('deliberate read-only probe');};
  assert.throws(() => c.runner.AI._runAfterInstall(pending, null, c.corp.HQ), /deliberate read-only probe/);
  assert.deepStrictEqual(Array.from(c.runner.grip), Array.from(savedGrip));
  assert.strictEqual(pending.cardLocation, savedLocation); assert.strictEqual(pending.host, undefined);
  assert.strictEqual(c.runner.rig.resources.length, 0); assert.strictEqual(c.runner.clickTracker, 4);
  assert.strictEqual(c.runner.creditPool, 5); assert.strictEqual(c.attackedServer, null);
  // A later outside-credit payment happens after the first damage/draw.
  // Moving Shackleton's damage ahead of that draw would falsely require five
  // cards rather than the four actually needed to survive its payment.
  reset(); c.runner.stack = []; c.runner.creditPool = 0;
  for (let i = 0; i < 4; i++) card(30020, c.runner.grip);
  card(30020, c.runner.stack); card(36008, c.runner.rig.resources);
  const funding = card(36020, c.runner.rig.hardware); funding.credits = 5;
  card(30006, c.runner.rig.programs);
  card(30072, c.corp.HQ.ice).rezzed = true; card(36039, c.corp.HQ.ice).rezzed = true;
  card(36065, c.corp.HQ.root).rezzed = true;
  c.attackedServer = c.corp.HQ; c.runner.clickTracker = 0;
  run('corp.AI = new CorpAI(); corp.AI._log = function () {};');
  assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, false);
  assert(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1), 'later source damage uses replenished hand');
  c.runner.grip.pop();
  assert.strictEqual(c.runner.AI._calculateBestCompleteRun(c.corp.HQ, 0, 0, 0, 0, null, 1), null, 'four payment damage still needs four cards');
  assert.strictEqual(c.corp.AI._evaluateServerSecurity(c.corp.HQ).isSecure, true);
  // C2-6: an immediate win may spend retained Grip cards. Soft keep
  // preferences and cold/warm potential caches cannot change survivability.
  for (const [pool, clicks, spare] of [[0, 1, false], [4, 1, false],
      [5, 1, false], [0, 2, false], [0, 1, true]]) {
    reset(); card(36007, c.runner.rig.resources);
    c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}];
    c.runner.creditPool = pool; c.runner.clickTracker = clicks;
    card(30020, c.runner.grip); // Creative Commission is retained below five credits
    if (spare) card(36007, c.runner.grip);
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    for (let i = 0; i < 2; i++) card(30054, c.corp.archives.cards).faceUp = false;
    const target = c.NewServer('Retained Grip winning steal', false); c.corp.remoteServers.push(target);
    card(30070, target.root).knownToRunner = true;
    card(30073, target.ice).rezzed = true; // Tithe: one net damage, no mandatory payment
    const grip = c.runner.grip.slice(), stack = c.runner.stack.slice();
    for (let repeat = 0; repeat < 2; repeat++) {
      const options = ['run', 'draw', 'gain'];
      assert.strictEqual(options[await c.runner.AI.CommandChoice(options)], 'run');
      c.executingCommand = 'run';
      const choices = c.currentPhase.Enumerate.run();
      assert.strictEqual(choices[await c.runner.AI.SelectChoice(choices)].server, target,
        'survivable immediate win precedes draw regardless of retained cards or cache');
      c.executingCommand = '';
      assert.strictEqual(c.runner.AI.cachedPathServer, target);
      assert(c.runner.AI.cachedComplete);
      assert.strictEqual(c.runner.creditPool, pool); assert.strictEqual(c.runner.clickTracker, clicks);
      assert.deepStrictEqual(c.runner.grip, grip); assert.deepStrictEqual(c.runner.stack, stack);
      assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.encountering, false);
      assert.strictEqual(c.runner.AI._evaluatingWinningRun, undefined, 'tactical budget ends after planning');
    }
  }
  for (const expiring of [false, true]) for (const mode of
      ['win', 'lethal', 'unaffordable', 'click-cost', 'forbidden', 'hidden', 'draw-only', 'ordered', 'empty-stack']) {
    reset(); card(36007, c.runner.rig.resources);
    const event = expiring ? card(36001, c.runner.grip) : null;
    if (event) {
      // Make the opportunity legal through the real successful-run dispatcher.
      for (const server of [c.corp.HQ, c.corp.RnD, c.corp.archives]) {
        c.attackedServer = server; c.currentPhase = c.phases.runSuccessful; c.currentPhase.Init();
      }
      c.attackedServer = null; c.currentPhase = c.phases.runnerActionMain;
      assert.strictEqual(event.Enumerate().length, 1);
    }
    c.runner.scoreArea = [{agendaPoints: mode === 'draw-only' ? 0 : 6, player: c.runner}];
    c.runner.clickTracker = 1; c.runner.creditPool = expiring ? 4 : 0;
    card(30020, c.runner.grip);
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    for (let i = 0; i < 2; i++) card(30054, c.corp.archives.cards).faceUp = false;
    const target = c.NewServer('Tactical damage budget', false); c.corp.remoteServers.push(target);
    const prize = card(30070, target.root); prize.knownToRunner = mode !== 'hidden';
    const count = expiring ? 2 : 1; // every retained card is required for survival
    for (let i = 0; i < count + (mode === 'lethal' ? 1 : 0); i++) card(30073, target.ice).rezzed = true;
    if (mode === 'ordered' || mode === 'empty-stack') card(36008, c.runner.rig.resources);
    if (mode === 'empty-stack') c.runner.stack = [];
    if (mode === 'unaffordable') prize.stealCost = {credits: c.runner.creditPool + 1};
    if (mode === 'click-cost') prize.stealCost = {clicks: 1};
    if (mode === 'forbidden') {
      const restriction = {title: 'Public steal restriction', player: c.corp, cardType: 'upgrade', rezzed: true,
        modifyCannot: {Resolve(id, x) {return id === 'steal' && x === prize;}}};
      target.root.push(restriction); restriction.cardLocation = target.root;
    }
    if (mode === 'hidden') Object.defineProperty(prize, 'agendaPoints', {get() {throw Error('hidden points');}});
    if (event) {
      for (let i = 0; i < 2; i++) {
        const economy = c.NewServer('Denial alternative ' + i, false); c.corp.remoteServers.push(economy);
        card(31080, economy.root).rezzed = true;
      }
      assert(event.AIWouldPlay(), 'real expiring alternative is strategically useful');
    }
    const grip = c.runner.grip.slice(), stack = c.runner.stack.slice();
    const options = event ? ['play', 'run', 'draw', 'gain'] : ['run', 'draw', 'gain'];
    const command = options[await c.runner.AI.CommandChoice(options)];
    const win = mode === 'win' || mode === 'ordered';
    assert.strictEqual(command, !win && event ? 'play' : mode === 'empty-stack' ? 'draw' : 'run',
      mode + ' expiring=' + expiring);
    if (command === 'run') {
      c.executingCommand = 'run'; const choices = c.currentPhase.Enumerate.run();
      assert.strictEqual(choices[await c.runner.AI.SelectChoice(choices)].server,
        win ? target : c.corp.archives, 'tactical survival and legality: ' + mode);
    } else if (command === 'play') {
      assert.strictEqual(c.runner.AI.preferred.cardToPlay, event, 'decline win and retain expiring denial');
      c.executingCommand = 'play'; const choices = c.currentPhase.Enumerate.play();
      assert.strictEqual(choices[await c.runner.AI.SelectChoice(choices)].card, event);
    }
    c.executingCommand = '';
    assert.deepStrictEqual(c.runner.grip, grip); assert.deepStrictEqual(c.runner.stack, stack);
    assert.strictEqual(c.runner.clickTracker, 1); assert.strictEqual(c.runner.creditPool, expiring ? 4 : 0);
    assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.runner.AI._evaluatingWinningRun, undefined);
  }
  // Exception cleanup must restore the tactical context as well as run state.
  reset(); card(36007, c.runner.rig.resources); card(30020, c.runner.grip);
  c.runner.scoreArea = [{agendaPoints: 6, player: c.runner}]; c.runner.creditPool = 0;
  const throwing = c.NewServer('Throwing ICE model', false); c.corp.remoteServers.push(throwing);
  card(30070, throwing.root).knownToRunner = true;
  const badIce = card(30073, throwing.ice); badIce.rezzed = true;
  badIce.AIImplementIce = () => {throw Error('tactical ICE model');};
  c.runner.AI.cardsWorthKeeping = c.runner.grip.slice();
  await assert.rejects(c.runner.AI._winningRunBeforeOpportunity(), /tactical ICE model/);
  assert.strictEqual(c.runner.AI._evaluatingWinningRun, undefined);
  assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.encountering, false);
  assert.strictEqual(c.runner.grip.length, 1); assert.strictEqual(c.runner.creditPool, 0);
  // Ordinary low-potential routes still preserve useful cards after an exception.
  const data = c.runner.AI._calculateRunPathPieceBegin({server: throwing,
    clickOffset: 0, poolCreditOffset: 0, otherCreditOffset: 0, damageOffset: 0});
  assert.strictEqual(data.damageLimit, 0, 'exception cannot leak the immediate-win budget into ordinary planning');
  assert.strictEqual(data.tagLimit, 0, 'exception cannot leak the relaxed tag budget');
  // C2-7: post-win tag removal is optional; survival and real route costs are not.
  for (const [clicks, pool, mode, expiring] of [[1, 0, 'win', false],
      [2, 4, 'win', false], [3, 4, 'win', false], [1, 4, 'win', true],
      [1, 0, 'nonwinning', false], [1, 0, 'lethal', false],
      [1, 4, 'lethal', true], [1, 0, 'etr', false], [1, 0, 'tag-damage', false],
      [1, 0, 'steal-credit', false], [1, 0, 'steal-click', false]]) {
    reset(); card(36007, c.runner.rig.resources);
    c.runner.scoreArea = [{agendaPoints: mode === 'nonwinning' ? 0 : 6, player: c.runner}];
    c.runner.clickTracker = clicks; c.runner.creditPool = pool;
    c.corp.HQ.cards = []; c.corp.RnD.cards = []; c.corp.archives.cards = [];
    for (let i = 0; i < 2; i++) card(30054, c.corp.archives.cards).faceUp = false;
    const event = expiring ? card(36001, c.runner.grip) : null;
    if (event) {
      for (const server of [c.corp.HQ, c.corp.RnD, c.corp.archives]) {
        c.attackedServer = server; c.currentPhase = c.phases.runSuccessful; c.currentPhase.Init();
      }
      c.attackedServer = null; c.currentPhase = c.phases.runnerActionMain;
      for (let i = 0; i < 2; i++) {
        const economy = c.NewServer('Expiring denial ' + i, false); c.corp.remoteServers.push(economy);
        card(31080, economy.root).rezzed = true;
      }
      assert(event.AIWouldPlay(), 'legal expiring denial competes with the winning run');
    }
    const target = c.NewServer('Win before tag cleanup', false); c.corp.remoteServers.push(target);
    const agenda = card(30070, target.root); agenda.knownToRunner = true;
    if (mode === 'tag-damage') {
      c.runner.tags = 1;
      card(36007, c.runner.grip); card(36007, c.runner.grip);
      card(35063, target.ice).rezzed = true; // Doomscroll: live tag enables lethal net damage
    }
    if (mode === 'steal-credit') agenda.stealCost = {credits: 1};
    if (mode === 'steal-click') agenda.stealCost = {clicks: 1};
    // Resolve Funhouse first, then an inner lethal/ETR obstacle in losing controls.
    if (mode === 'lethal') for (let i = 0; i < c.runner.grip.length + 1; i++)
      card(30073, target.ice).rezzed = true;
    if (mode === 'etr') card(30072, target.ice).rezzed = true;
    const ice = card(30054, target.ice); ice.rezzed = true;
    const grip = c.runner.grip.slice(), stack = c.runner.stack.slice();
    for (let repeat = 0; repeat < 2; repeat++) {
      const options = event ? ['play', 'run', 'draw', 'gain'] : ['run', 'draw', 'gain'];
      const command = options[await c.runner.AI.CommandChoice(options)];
      assert.strictEqual(command, event && mode !== 'win' ? 'play' : 'run', mode);
      c.executingCommand = command;
      const choices = c.currentPhase.Enumerate[command]();
      const selected = choices[await c.runner.AI.SelectChoice(choices)];
      if (command === 'play') assert.strictEqual(selected.card, event);
      else assert.strictEqual(selected.server, mode === 'win' ? target : c.corp.archives,
        'take affordable surviving win before draw; decline real losing routes: ' + mode);
      c.executingCommand = '';
      assert.strictEqual(c.runner.AI._evaluatingWinningRun, undefined);
      assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.encountering, false);
      assert.strictEqual(c.runner.tags, mode === 'tag-damage' ? 1 : 0); assert.strictEqual(c.runner.creditPool, pool);
      assert.strictEqual(c.runner.clickTracker, clicks);
      assert.deepStrictEqual(c.runner.grip, grip); assert.deepStrictEqual(c.runner.stack, stack);
    }
    if (mode === 'win' && clicks === 1 && pool === 0) {
      // Follow the AI's cached branches through real encounter/steal decisions.
      c.attackedServer = target; c.encountering = true; c.approachIce = 0;
      c.runner.clickTracker = 0;
      function passResponses() {
        for (let i = 0; i < 20; i++) {
          const phase = c.currentPhase;
          if (!phase.Enumerate.n || !phase.Enumerate.n.call(phase).length) break;
          phase.Resolve.n.call(phase, {});
        }
      }
      ice.responseOnEncounter.Resolve.call(ice, {});
      let choices = c.currentPhase.Enumerate.continue();
      let chosen = choices[await c.runner.AI.SelectChoice(choices)];
      assert.strictEqual(chosen.id, 0, 'AI commits to the encounter tag');
      c.currentPhase.Resolve.continue(chosen); passResponses();
      c.currentPhase = c.phases.runSubroutines; c.subroutine = 1;
      ice.subroutines[0].Resolve.call(ice);
      choices = c.currentPhase.Enumerate.continue();
      chosen = choices[await c.runner.AI.SelectChoice(choices)];
      assert.strictEqual(chosen.id, 1, 'AI takes the subroutine tag');
      c.currentPhase.Resolve.continue(chosen); passResponses();
      assert.strictEqual(c.runner.tags, 2); assert.strictEqual(c.runner.creditPool, 0);
      c.encountering = false; c.approachIce = -1;
      c.accessingCard = agenda; c.currentPhase = c.phases.runAccessingCard;
      const commands = ['steal', 'n'];
      assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)], 'steal');
      assert.strictEqual(c.currentPhase.Enumerate.steal().length, 1);
      c.currentPhase.Resolve.steal(); passResponses();
      assert(c.runner.scoreArea.includes(agenda));
      assert.strictEqual(c.AgendaPoints(c.runner), c.AgendaPointsToWin());
    }
  }
  // Ordinary complete routes keep finite tag cleanup, even after a tactical win/error.
  const ordinaryTags = c.runner.AI._calculateRunPathPieceBegin({server: c.corp.archives,
    clickOffset: -1, poolCreditOffset: 0, otherCreditOffset: 0, damageOffset: 0});
  assert.strictEqual(ordinaryTags.tagLimit, 0);
  reset();
  c.runner.clickTracker = 1; c.runner.creditPool = 0;
  const ordinaryTarget = c.NewServer('Ordinary tag avoidance', false); c.corp.remoteServers.push(ordinaryTarget);
  card(30054, ordinaryTarget.ice).rezzed = true;
  assert.strictEqual(c.runner.AI._calculateBestCompleteRun(ordinaryTarget, 0, 0, -1, 0, null), null,
    'real ordinary calculator still rejects tags without cleanup resources');

  console.log('Vantage Point batch 2: strategic acceptance passed');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
