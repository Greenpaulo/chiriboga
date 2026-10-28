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
const jQuery = selector => selector === '#narration' ? {prop: () => false} : stub;
jQuery.extend = extend;
const timers = [];
const context = {
  console: {log() {}, warn() {}, error: verbose ? console.error : () => {}},
  setTimeout: (fn, ms) => { timers.push({fn, ms}); return timers.length; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  cardSet: [], setIdentifiers: [], accessibilityMode: 'text',
  $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
  localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
  location: {search: '', href: '', hostname: 'localhost'},
  PlaySound() {}, PlayCreditGainSound() {}, suppressCreditDrawSound: false, particleSystems: stub,
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

run(`
  Render = function() {};
  SetHistoryThumbnail = function() { thumbnails++; };
  AddHistoryBreakIfRequired = function() {};
  RecordPublicPostureEvent = function(kind, card) { events.push({kind: kind, card: card}); };
  Narrate = function() { return false; };
  Log = function() {};
  countersUI = new Proxy({}, {get: function() { return countersUI; }});
  rewinding = true;
  var thumbnails = 0, events = [], automaticCount = 0, completeCount = 0;
  function reset() {
    autoAccessing = false; accessingCard = null; attackedServer = null;
    accessedCards = {cards: [], root: []}; lingeringEffects = [];
    intended = {}; rewindStates = []; thumbnails = 0; events = [];
    automaticCount = 0; completeCount = 0;
    Object.assign(corp, {identityCard: {title: 'Corp', cardType: 'identity', player: corp}, creditPool: 5, scoreArea: [],
      HQ: NewServer('HQ', true), RnD: NewServer('R&D', true), archives: NewServer('Archives', true),
      remoteServers: [], resolvingCards: [], installingCards: [], AI: null});
    Object.assign(runner, {identityCard: {title: 'Runner', cardType: 'identity', player: runner}, creditPool: 5, temporaryCredits: 0,
      clickTracker: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, resolvingCards: [], installingCards: [], AI: null});
    activePlayer = runner; playerTurn = runner; viewingPlayer = runner;
    attackedServer = corp.archives;
  }
  function card(type, zone) {
    var c = {title: 'Test ' + type, cardType: type, player: corp, faceUp: true,
      imageFile: 'test.png', agendaPoints: type === 'agenda' ? 1 : 0, cardLocation: zone};
    c.renderer = {zoomed: false, zooms: 0, sprite: {visible: true},
      ToggleZoom: function() { this.zoomed = !this.zoomed; if (this.zoomed) this.zooms++; }};
    c.renderer.card = c;
    zone.push(c);
    return c;
  }
  function begin(c, bulk) {
    accessingCard = c; autoAccessing = bulk;
    currentPhase = phases.runAccessingCard; activePlayer = runner;
    currentPhase.Init();
  }
`);

let cases = 0;
function test(name, body) {
  timers.length = 0;
  run('reset();');
  body();
  cases++;
  if (verbose) console.log(name);
}

test('global automatic access counters remain silent and complete normally', () => {
  run(`
    runner.identityCard.automaticOnAccess = {Resolve: function() { automaticCount++; }};
    runner.identityCard.automaticOnAccessComplete = {Resolve: function() { completeCount++; }};
    var c = card('operation', corp.archives.cards); begin(c, true);
  `);
  assert.strictEqual(run('c.renderer.zooms'), 0);
  assert.strictEqual(run('thumbnails'), 0, 'routine cards must not flash in thumbnails either');
  assert.strictEqual(run('automaticCount'), 1);
  run('ResolveAccess();');
  assert.strictEqual(run('completeCount'), 1);
  assert.strictEqual(run('c.knownToRunner'), true);
});

test('an archived card with an automatic effect is shown and resolves its effect', () => {
  run(`
    var c = card('asset', corp.archives.cards);
    c.automaticOnAccess = {Resolve: function() { automaticCount++; }};
    c.automaticOnAccessComplete = {availableWhenInactive: true, Resolve: function() { completeCount++; }};
    begin(c, true);
  `);
  assert.strictEqual(run('c.renderer.zooms'), 1);
  assert.strictEqual(run('automaticCount'), 1);
  run('ResolveAccess();');
  assert.strictEqual(run('completeCount'), 1);
});

test('optional access responses interrupt bulk access', () => {
  run(`
    var c = card('asset', corp.archives.cards);
    c.responseOnAccess = {Enumerate: function() { return [{}]; },
      Resolve: function() { automaticCount++; }, text: 'Access response'};
    begin(c, true);
  `);
  assert.strictEqual(run('c.renderer.zooms'), 1);
  assert.strictEqual(run('currentPhase.triggerCallbackName'), 'responseOnAccess');
  run('currentPhase.Resolve.n.call(currentPhase);'); //pass priority to Corp
  assert.strictEqual(run('currentPhase.Enumerate.trigger.call(currentPhase).length'), 1);
  run('currentPhase.Resolve.trigger.call(currentPhase, {card: c, id: 0});');
  assert.strictEqual(run('currentPhase.player'), context.corp);
  run('currentPhase.Resolve.continue(currentPhase.Enumerate.continue()[0]);');
  assert.strictEqual(run('automaticCount'), 1, 'the selected access response must resolve');
});

test('an optional installed access ability remains available', () => {
  run(`
    var tool = {title: 'Access tool', player: runner, cardType: 'hardware',
      abilities: [{text: 'Do something', opponentOnly: false,
        Enumerate: function() { return CheckAccessing() ? [{}] : []; },
        Resolve: function() {}, limitTo: 'access'}]};
    runner.rig.hardware.push(tool); tool.cardLocation = runner.rig.hardware;
    var c = card('operation', corp.archives.cards); begin(c, true);
  `);
  assert.strictEqual(run('c.renderer.zooms'), 1);
  assert.strictEqual(run('phases.runAccessingCard.Enumerate.trigger().length'), 1);
});

test('root cards retain their popup, trash choice and normal timing', () => {
  run(`var c = card('upgrade', corp.archives.root); c.trashCost = 3; begin(c, true);`);
  assert.strictEqual(run('c.renderer.zooms'), 1);
  assert.strictEqual(run('phases.runAccessingCard.Enumerate.trash().length'), 1);
  assert.strictEqual(choose('n'), 350);
});

test('global automatic effects can enable a new access ability', () => {
  run(`
    var enabled = false;
    runner.identityCard.automaticOnAccess = {Resolve: function() { enabled = true; }};
    runner.identityCard.abilities = [{text: 'New access ability', limitTo: 'access',
      Enumerate: function() { return enabled && CheckAccessing() ? [{}] : []; }, Resolve: function() {}}];
    var c = card('operation', corp.archives.cards); begin(c, true);
  `);
  assert.strictEqual(run('c.renderer.zooms'), 1);
  assert.strictEqual(run('phases.runAccessingCard.Enumerate.trigger().length'), 1);
});

function choose(command, choice = {}) {
  context.executingCommand = command;
  context.validOptions = [choice];
  context.phaseOptions = {};
  context.ResolveChoice(0);
  return timers.at(-1).ms;
}

test('routine continuation and selection timers yield without the usual delay', () => {
  run(`var c = card('operation', corp.archives.cards); begin(c, true);`);
  assert.strictEqual(choose('n'), 0);
  run(`autoAccessing = true; var c2 = card('operation', corp.archives.cards);
    currentPhase = {context: phases.runAccessingCard, Resolve: {access: function() {}}};`);
  assert.strictEqual(choose('access', {card: context.c2}), 0);
  assert.strictEqual(run('mainLoopDelay'), 350, 'global speed must remain unchanged');
});

test('manual access, other servers and interrupt decisions keep normal timing', () => {
  run(`var c = card('operation', corp.archives.cards); begin(c, false);`);
  assert.strictEqual(choose('n'), 350);
  run(`attackedServer = corp.HQ; var c = card('operation', corp.HQ.cards); begin(c, true);`);
  assert.strictEqual(choose('n'), 350);
  run(`attackedServer = corp.archives; var c = card('operation', corp.archives.cards); begin(c, true);
    currentPhase = {Resolve: {continue: function() {}}};`);
  assert.strictEqual(choose('continue'), 350);
});

test('large breach silently accesses routine cards and shows the agenda', () => {
  run(`
    var cards = [];
    for (var i = 0; i < 25; i++) cards.push(card('operation', corp.archives.cards));
    var agenda = card('agenda', corp.archives.cards);
    //Give stealing a cost so the UI must wait for a human decision.
    agenda.stealCost = {credits: 1};
    corp.archives.cards.pop(); corp.archives.cards.splice(12, 0, agenda);
    ChangePhase(phases.runBreachServer);
    EnumeratePhase(); Execute('access'); AccessAllInArchives();
  `);
  //Drive the real scheduler until it pauses at the agenda amongst routine cards.
  for (let guard = 0; timers.length && guard < 100; guard++) timers.shift().fn();
  assert.strictEqual(run('accessingCard'), context.agenda);
  assert.strictEqual(run('agenda.renderer.zooms'), 1);
  assert.strictEqual(run('phases.runAccessingCard.Enumerate.steal().length'), 1);
  assert.strictEqual(run('phases.runAccessingCard.Enumerate.n().length'), 1);
  assert.strictEqual(run('cards.every(c => c.renderer.zooms === 0)'), true);
  assert.strictEqual(timers.length, 0, 'must wait for the agenda decision');
  //Stealing mechanics have their own regression coverage: resolve this access
  //normally, then drive the real scheduler/Main/decision flow for the rest.
  choose('n');
  for (let guard = 0; timers.length && guard < 100; guard++) {
    if (run('currentPhase === phases.runEnds')) break;
    const timer = timers.shift();
    timer.fn();
  }
  assert.strictEqual(run('currentPhase === phases.runEnds'), true);
  assert.strictEqual(run('accessedCards.cards.length'), 26);
  assert.strictEqual(run('cards.every(c => c.renderer.zooms === 0 && c.knownToRunner)'), true);
  assert.strictEqual(run('events.filter(e => e.kind === "access").length'), 26);
  assert.strictEqual(run('autoAccessing'), false);
  assert.strictEqual(run('thumbnails'), 1, 'only the agenda should change the thumbnail');
});

test('run cleanup and a new breach clear stale bulk mode', () => {
  run(`
    autoAccessing = true;
    ChangePhase(phases.runEnds);
  `);
  //Run-end trigger handling uses both players' passes before cleanup.
  for (let guard = 0; run('attackedServer !== null') && guard < 5; guard++)
    run('currentPhase.Resolve.n.call(currentPhase);');
  assert.strictEqual(run('autoAccessing'), false);
  run('attackedServer = corp.archives; autoAccessing = true; ChangePhase(phases.runBreachServer);');
  assert.strictEqual(run('autoAccessing'), false);
});

console.log(`${cases} Archives fast-access flow cases passed.`);

