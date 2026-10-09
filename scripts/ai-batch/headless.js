'use strict';
// Play one seeded AI-vs-AI game headlessly with the real engine, main loop and
// both AIs, in a fresh vm context (F4). Used by scripts/ai-game.js (one game,
// log hash) and scripts/ai-batch.js (batches, events, metrics).
//
// Only browser globals are stubbed. Each game has three independent random
// streams named `<streamPrefix>:engine`, `:corp` and `:runner`, so the same
// prefix replays the same game and a policy change on one side cannot shift
// another side's draws. A game fails if it logs an engine error, because a
// missing browser stub silently changes AI choices.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const ENGINE_FILES = ['deck/seedrandom.min.js', 'config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js',
  'checks.js', 'mechanics.js', 'utility.js'];
const AI_FILES = ['decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];

const SERVER_KEYS = {'HQ': 'hq', 'R&D': 'rd', 'Archives': 'archives'};

// Read a corp-decision fixture: its directives and the code lines that build
// the board (see tests/fixtures/corp-decisions/).
function readFixture(file) {
  const text = fs.readFileSync(file, 'utf8');
  const directives = {};
  const code = [];
  for (const line of text.split('\n')) {
    const m = /^\/\/\s*([A-Z_]+):\s*(.*)$/.exec(line.trim());
    if (m) directives[m[1]] = m[2].trim();
    else if (line.trim() && !line.trim().startsWith('//')) code.push(line);
  }
  return {id: path.basename(file).replace(/\.txt$/, ''), directives, code: code.join('\n')};
}

function loadPrecon(file) {
  const context = {};
  context.registerPrecon = precon => { context.precon = precon; };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'precons', file), 'utf8'), context, {filename: file});
  return context.precon;
}

function validatePrecon(file, deck, hasCard) {
  const missing = [...new Set([deck.identity, ...Object.keys(deck.cards)].map(Number))]
    .filter(id => !hasCard(id));
  if (missing.length)
    throw new Error(`Precon ${file}: cards ${missing.join(', ')} have no definition in the loaded sets`);
}

// Set files declare their cards with literal cardSet[id] assignments.
// Check the selected decks before spawning workers or playing any games.
function validateDeckPairs(pairs, setFiles) {
  const defined = new Set();
  for (const file of setFiles)
    for (const match of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/^cardSet\[(\d+)\]\s*=/gm))
      defined.add(Number(match[1]));
  for (const file of new Set(pairs.flatMap(pair => [pair.corp, pair.runner])))
    validatePrecon(file, loadPrecon(file), id => defined.has(id));
}

// I0 root-commitment observation (observe mode only). Follows every Corp root
// card (agenda, asset, upgrade) installed during play, by object identity,
// from its install to where it leaves the board, and emits `install` and
// `leave` events. It reads only Corp-known or public state and never calls
// engine functions. Cards already installed when the game starts (a start
// board) are ignored.
function createRootTracker(emit) {
  const ids = new WeakMap();
  let next = 0;
  const idOf = card => {
    if (!ids.has(card)) ids.set(card, ++next);
    return ids.get(card);
  };
  const tracked = new Map(); // id -> card, installed during play
  const preexisting = new Set();
  const leaving = new Map(); // id -> {card, turn} until its destination settles
  const trashedOnAccess = new WeakSet();
  const roots = corp => {
    const out = [];
    const add = (server, key) => { for (const card of server.root || []) out.push([card, server, key]); };
    add(corp.HQ, 'hq'); add(corp.RnD, 'rd'); add(corp.archives, 'archives');
    for (const server of corp.remoteServers) add(server, 'remote');
    return out;
  };
  const fate = (corp, runner, card) => {
    const where = card.cardLocation;
    if (where === corp.scoreArea) return 'scored';
    if (where === runner.scoreArea) return 'stolen';
    if (where === corp.archives.cards) return trashedOnAccess.has(card) ? 'trashedOnAccess' : 'trashed';
    if (where === corp.HQ.cards || where === corp.RnD.cards) return 'returned';
    return null; // still resolving or being accessed: settle on a later step
  };
  return {
    idOf,
    // Cards trashed while the Runner is accessing them.
    trashing(cards, accessing) {
      for (const card of [].concat(cards || [])) if (card && card === accessing) trashedOnAccess.add(card);
    },
    start(corp) {
      for (const [card] of roots(corp)) preexisting.add(idOf(card));
    },
    observe(corp, runner, turn, final) {
      const present = new Set();
      for (const [card, server, key] of roots(corp)) {
        const id = idOf(card);
        present.add(id);
        if (preexisting.has(id) || tracked.has(id)) continue;
        leaving.delete(id);
        tracked.set(id, card);
        emit('install', {id, card: card.title, cardType: card.cardType,
          ambush: (card.subTypes || []).includes('Ambush'), server: key, serverName: server.serverName, turn});
      }
      for (const [id, card] of tracked)
        if (!present.has(id)) { tracked.delete(id); leaving.set(id, {card, turn}); }
      for (const [id, entry] of leaving) {
        const where = fate(corp, runner, entry.card);
        if (!where && !final) continue;
        leaving.delete(id);
        emit('leave', {id, card: entry.card.title, cardType: entry.card.cardType, fate: where || 'other', turn: entry.turn});
      }
    },
  };
}

// options: {streamPrefix, corpFile, runnerFile, setFiles, timeoutMs, start (fixture file),
//   corpOptions, runnerOptions, telemetry, onEvent(event), setupFile, tail, fullLog,
//   testOption (a no-op Corp option name, for the harness's own tests)}
// Resolves to a summary: {winner, reason, turns, ms, steps, corpPoints,
//   runnerPoints, logLines, logHash, errors, tail, log (with fullLog), report}.
function playGame(options) {
  const onEvent = options.onEvent || (() => {});
  const emit = (type, data) => onEvent(Object.assign({type}, data));
  const roots = options.observe ? createRootTracker(emit) : null;
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
  const errors = new Set();
  let lastError = null;
  const logTail = [];
  const fullLog = options.fullLog ? [] : null;
  const hash = crypto.createHash('sha1');
  let logLines = 0, steps = 0;
  const immediates = new Set();
  const context = {
    console: {log() {}, warn() {}, error: (...parts) => {
      const message = parts.join(' ');
      logTail.push('ERROR ' + message);
      lastError = message.split('\n')[0].slice(0, 120);
      if (/Error/.test(message)) errors.add(message.split('\n')[0].slice(0, 120));
    }},
    // The main loop reschedules itself with window.setTimeout; run it on the next tick.
    setTimeout: fn => {
      steps++;
      const handle = setImmediate(() => { immediates.delete(handle); fn(); });
      immediates.add(handle);
      return handle;
    },
    clearTimeout: handle => { immediates.delete(handle); clearImmediate(handle); },
    setInterval: () => 0, clearInterval() {},
    cardSet: [], setIdentifiers: [], accessibilityMode: 'text', particleSystems: stub,
    $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
    localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
    location: {search: '', href: '', hostname: 'localhost'},
    performance: options.telemetry ? {now: () => Number(process.hrtime.bigint()) / 1e6} : undefined,
  };
  context.window = context;
  vm.createContext(context);
  for (const file of [...ENGINE_FILES, ...options.setFiles, ...AI_FILES])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  const run = code => vm.runInContext(code, context);

  context.__decks = {corp: loadPrecon(options.corpFile), runner: loadPrecon(options.runnerFile)};
  for (const side of ['corp', 'runner'])
    validatePrecon(options[side + 'File'], context.__decks[side], id => Boolean(context.cardSet[id]));
  const fixture = options.start ? readFixture(options.start) : null;

  let result = null, turns = 0, lastTurn = null;
  // Observed state, compared at every main-loop step and at the win.
  const seen = {corpScored: 0, runnerScored: 0, stolenLocations: 0, run: null};
  const serverKey = server => {
    if (!server) return 'remote';
    return SERVER_KEYS[server.serverName] || 'remote';
  };
  const observe = () => {
    const corpScore = run('corp.scoreArea');
    for (; seen.corpScored < corpScore.length; seen.corpScored++) {
      const card = corpScore[seen.corpScored];
      emit('score', {card: card.title, points: card.agendaPoints || 0});
    }
    const runnerScore = run('runner.scoreArea');
    const locations = run('agendaStolenLocations');
    for (; seen.runnerScored < runnerScore.length; seen.runnerScored++) {
      const card = runnerScore[seen.runnerScored];
      const where = seen.stolenLocations < locations.length ? locations[seen.stolenLocations++] : 'remote';
      emit('steal', {card: card.title, server: SERVER_KEYS[where] || 'remote', points: card.agendaPoints || 0});
    }
    // The engine clears attackedServer when a run ends.
    if (seen.run && !run('attackedServer')) {
      emit('run', {server: seen.run.server, success: seen.run.success});
      seen.run = null;
    }
    if (roots) roots.observe(run('corp'), run('runner'), Math.ceil(turns / 2), false);
  };
  // Corp-known state when a Corp turn begins (I0 stall and insolvency collectors).
  const corpTurnState = () => JSON.parse(JSON.stringify(run(`({credits: corp.creditPool,
    hand: corp.HQ.cards.map(function (c) { return {cardType: c.cardType, playCost: typeof c.playCost == "number" ? c.playCost : null}; }),
    unrezzedIceRezCosts: [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers).reduce(function (costs, s) {
      s.ice.forEach(function (ice) { if (!ice.rezzed) costs.push(ice.rezCost || 0); }); return costs; }, [])})`)));
  context.__onWin = (player, reason) => {
    if (result) return;
    observe();
    result = {winner: player === context.corp ? 'corp' : 'runner', reason};
    if (seen.run) { emit('run', {server: seen.run.server, success: seen.run.success}); seen.run = null; }
    if (roots) roots.observe(run('corp'), run('runner'), Math.ceil(turns / 2), true);
    emit('gameEnd', {winner: result.winner, reason, turns: Math.ceil(turns / 2), corpCredits: run('corp.creditPool')});
    setImmediate(done);
  };
  context.__log = line => {
    hash.update(line + '\n'); logLines++;
    if (fullLog) fullLog.push(line);
    logTail.push(line); if (logTail.length > 200) logTail.shift();
  };
  context.__stop = () => {
    if (result) return true;
    observe();
    const side = run('playerTurn === corp ? "corp" : "runner"');
    if (side !== lastTurn) {
      if (lastTurn) emit('turnEnd', {side: lastTurn, turn: Math.ceil(turns / 2)});
      lastTurn = side; turns++;
      if (options.observe) emit('turnStart', side === 'corp' ? {side, turn: Math.ceil(turns / 2), corp: corpTurnState()} :
        {side, turn: Math.ceil(turns / 2)});
    }
    return false;
  };
  context.__runBegins = server => {
    if (seen.run) emit('run', {server: seen.run.server, success: seen.run.success});
    seen.run = {server: serverKey(server), success: false};
  };
  context.__runSuccessful = () => { if (seen.run) seen.run.success = true; };
  context.__mulligan = side => emit('mulligan', {side});
  // A paid rez (Rez() pays through SpendCredits with "rezzing"), with the
  // cards hosted on the rezzed card at that moment.
  context.__rez = (card, cost) => emit('rez', {card: card.title, cardType: card.cardType, cost,
    id: roots ? roots.idOf(card) : undefined,
    hosted: (card.hostedCards || []).map(h => ({title: h.title, exempt: Boolean(h.AIHostedDoesNotPreventRez)}))});
  if (options.telemetry) context.__decision = entry => {
    const counts = entry.side === 'corp' && context.__securityDecisionCounts;
    emit('decision', counts ? Object.assign({}, entry, {securityEvaluation: Object.assign({}, counts)}) : entry);
  };

  const json = value => JSON.stringify(value);
  const prefix = options.streamPrefix;
  // Player state as Init() prepares it, decks as LoadDecks() builds them, then
  // the real StartGame() and Main() loop.
  run(`
    Math.random = new Math.seedrandom(${json(prefix + ':engine')});
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    mainLoopDelay = 0; // Render() returns early below 1
    Object.assign(corp, {identityCard: null, creditPool: 0, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0});
    Object.assign(runner, {identityCard: null, creditPool: 0, temporaryCredits: 0, clickTracker: 0, tempBonusClicks: 0,
      startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [], rig: {programs: [], hardware: [], resources: []},
      maxHandSize: 5, tags: 0, coreDamage: 0, resolvingCards: [], installingCards: []});
    viewingPlayer = runner;
    corp.AI = new CorpAI(); corp.AI._random = new Math.seedrandom(${json(prefix + ':corp')}); corp.AI._log = function() {};
    runner.AI = new RunnerAI(); runner.AI._random = new Math.seedrandom(${json(prefix + ':runner')}); runner.AI._log = function() {};
    corp.identityCard = InstanceCard(Number(__decks.corp.identity), cardBackTexturesCorp, glowTextures, strengthTextures);
    runner.identityCard = InstanceCard(Number(__decks.runner.identity), cardBackTexturesRunner, glowTextures, strengthTextures);
    for (var id in __decks.corp.cards)
      InstanceCardsPush(Number(id), corp.RnD.cards, __decks.corp.cards[id], cardBackTexturesCorp, glowTextures, strengthTextures);
    for (var id in __decks.runner.cards)
      InstanceCardsPush(Number(id), runner.stack, __decks.runner.cards[id], cardBackTexturesRunner, glowTextures, strengthTextures);
    corp.identityCard.faceUp = true; runner.identityCard.faceUp = true;
    Shuffle(corp.RnD.cards); Shuffle(runner.stack);
    corp.creditPool = 5; runner.creditPool = 5;
    PlayerWin = function(player, reason) { __onWin(player, reason); AIGameEnded(player); };
    Log = function(message) { __log(String(message)); };
    var __main = Main;
    Main = function() { if (__stop()) return; return __main(); };
  `);
  if (options.observe) {
    context.__trashing = (cards, accessing) => roots.trashing(cards, accessing);
    context.__cardUsed = card => emit('cardUsed', {id: roots.idOf(card), card: card.title});
    context.__cardCredits = (card, credits) => emit('cardCredits', {id: roots.idOf(card), card: card.title, credits});
    // Event wrappers: they call the real functions unchanged and only record.
    run(`
      var __makeRun = MakeRun;
      MakeRun = function(server) { __runBegins(server); return __makeRun.apply(this, arguments); };
      var __automaticTriggers = AutomaticTriggers;
      AutomaticTriggers = function(name) {
        if (name === "automaticOnRunSuccessful") __runSuccessful();
        return __automaticTriggers.apply(this, arguments);
      };
      var __spendCredits = SpendCredits;
      SpendCredits = function(player, num, doing, card) {
        if (player === corp && doing === "rezzing" && card) __rez(card, num);
        return __spendCredits.apply(this, arguments);
      };
      var __mulliganFn = Mulligan;
      Mulligan = function() { __mulligan(activePlayer === corp ? "corp" : "runner"); return __mulliganFn.apply(this, arguments); };
      // I0: card use, credits from a card and trashes; never during an AI probe.
      var __trashFn = Trash;
      Trash = function(cards) {
        if (AIHypothetical.depth === 0) __trashing(cards, accessingCard);
        return __trashFn.apply(this, arguments);
      };
      var __triggerAbilityFn = TriggerAbility;
      TriggerAbility = function(card) {
        if (AIHypothetical.depth === 0 && card && card.player === corp) __cardUsed(card);
        return __triggerAbilityFn.apply(this, arguments);
      };
      var __gainCreditsFn = GainCredits;
      GainCredits = function(player, num, temporary, sourceCard) {
        if (AIHypothetical.depth === 0 && player === corp && sourceCard && num > 0) __cardCredits(sourceCard, num);
        return __gainCreditsFn.apply(this, arguments);
      };
      // A Corp card's own response/automatic trigger (for example an Ambush
      // asset's access trigger) resolves through a DecisionPhase whose callback
      // is that trigger's Resolve; count it as a use when it resolves.
      var __decisionPhaseFn = DecisionPhase;
      DecisionPhase = function(player, choices, callback, title, instruction, context) {
        if (typeof callback === "function" && context && context.player === corp && context.cardType &&
            Object.keys(context).some(function(key) {
              return /^(response|automatic)On/.test(key) && context[key] && context[key].Resolve === callback;
            })) {
          var original = callback;
          arguments[2] = function() {
            if (AIHypothetical.depth === 0) __cardUsed(context);
            return original.apply(this, arguments);
          };
        }
        return __decisionPhaseFn.apply(this, arguments);
      };
      var __takeCreditsFn = TakeCredits;
      TakeCredits = function(player, card, num) {
        var taken = card && typeof card.credits === "number" ? Math.min(card.credits, num) : 0;
        if (AIHypothetical.depth === 0 && player === corp && taken >= 1) __cardCredits(card, taken);
        return __takeCreditsFn.apply(this, arguments);
      };
    `);
  }
  if (options.securityCache !== undefined) {
    if (!['off', 'on', 'verify'].includes(options.securityCache)) throw new Error('Invalid security-cache mode');
    run(`corp.AI._securityCacheEnabled = ${options.securityCache !== 'off'};
      corp.AI._securityCacheVerify = ${options.securityCache === 'verify'};`);
  }
  // F3 instrumentation exists only in the harness. Frames follow Choice(),
  // including nested decisions and throws; turn-start/card calls are excluded.
  if (options.evaluatorTelemetry) run(`
    var __securityDecisionCounts = null;
    var __securityChoice = corp.AI.Choice;
    corp.AI.Choice = function() {
      var previous = __securityDecisionCounts;
      __securityDecisionCounts = {requests: 0, computations: 0};
      try { return __securityChoice.apply(this, arguments); }
      finally { __securityDecisionCounts = previous; }
    };
    var __securityRequest = corp.AI._evaluateServerSecurity;
    corp.AI._evaluateServerSecurity = function() {
      if (__securityDecisionCounts) __securityDecisionCounts.requests++;
      return __securityRequest.apply(this, arguments);
    };
    var __securityCompute = corp.AI._evaluateServerSecurityCounted;
    corp.AI._evaluateServerSecurityCounted = function() {
      if (__securityDecisionCounts) __securityDecisionCounts.computations++;
      return __securityCompute.apply(this, arguments);
    };
  `);
  if (options.telemetry) run('DecisionSnapshots.telemetry = {sink: __decision};');
  if (options.testOption) run(`corp.AI.options[${json(options.testOption)}] = false`);
  for (const [side, values] of [['corp', options.corpOptions], ['runner', options.runnerOptions]]) {
    for (const [name, value] of Object.entries(values || {})) {
      if (!run(`Object.prototype.hasOwnProperty.call(${side}.AI.options, ${json(name)})`))
        throw new Error(`Unknown ${side} AI option: ${name}`);
      run(`${side}.AI.options[${json(name)}] = ${json(value)}`);
    }
  }
  const effectiveOptions = {corp: run('Object.assign({}, corp.AI.options)'), runner: run('Object.assign({}, runner.AI.options)')};

  if (fixture) {
    // The pool decks fill R&D and the Stack; the fixture board is laid over
    // them (CorpTestField/RunnerTestField replace R&D/Stack only when the
    // fixture lists cards for them) and play begins at the Corp's main phase.
    // SETUP lines name the Corp AI under test `reviewAI`, as the fixture suite does.
    try {
      run(fixture.code);
      run('playerTurn = corp; corp.clickTracker = 3; var reviewAI = corp.AI;');
      if (fixture.directives.SETUP) run(fixture.directives.SETUP);
    } catch (error) {
      errors.add(`fixture ${fixture.id}: ${error.message}`);
    }
  }

  let resolveGame;
  const finished = new Promise(resolve => { resolveGame = resolve; });
  const started = Date.now();
  let timer = null, watchdog = null, stalled = false;
  function done() {
    if (done.called) return;
    done.called = true;
    clearTimeout(timer);
    clearInterval(watchdog);
    for (const handle of immediates) clearImmediate(handle);
    immediates.clear();
    const unfinished = {winner: null, reason: stalled ? 'stalled' : 'timeout after ' + options.timeoutMs / 1000 + ' s'};
    const summary = Object.assign({}, result || unfinished, {
      turns: Math.ceil(turns / 2), ms: Date.now() - started, steps,
      corpPoints: run('AgendaPoints(corp)'), runnerPoints: run('AgendaPoints(runner)'),
      logLines, logHash: hash.digest('hex').slice(0, 12), errors: [...errors],
      options: effectiveOptions,
    }, typeof context.__report === 'function' ? {report: JSON.parse(JSON.stringify(context.__report()))} : {});
    if (options.tail) summary.tail = logTail.slice(-options.tail);
    if (fullLog) summary.log = fullLog;
    resolveGame(summary);
  }
  playGame.fail = message => { errors.add(message); done(); };
  timer = setTimeout(done, options.timeoutMs);
  // A main loop that stops scheduling itself (for example after "No valid
  // commands available") never ends the game; fail it quickly instead of
  // waiting for the timeout. The check runs only while the event loop is idle,
  // so a long synchronous AI decision cannot trip it.
  const stallMs = options.stallMs || 10000;
  let lastSteps = -1, lastProgress = Date.now();
  watchdog = setInterval(() => {
    if (steps !== lastSteps) { lastSteps = steps; lastProgress = Date.now(); return; }
    if (Date.now() - lastProgress >= stallMs && !result) {
      stalled = true;
      errors.add('stalled: no main-loop step for ' + stallMs / 1000 + ' s' + (lastError ? ' after: ' + lastError : ''));
      done();
    }
  }, 1000);
  if (options.setupFile) vm.runInContext(fs.readFileSync(path.resolve(options.setupFile), 'utf8'), context, {filename: options.setupFile});
  // Count only points that change hands during play, not a fixture's starting score areas.
  seen.corpScored = run('corp.scoreArea.length');
  seen.runnerScored = run('runner.scoreArea.length');
  seen.stolenLocations = run('agendaStolenLocations.length');
  if (roots) roots.start(run('corp'));
  emit('gameStart', {fixtureId: fixture ? fixture.id : null, corpIdentity: run('corp.identityCard.title'),
    runnerIdentity: run('runner.identityCard.title')});
  if (errors.size) { done(); return finished; }
  try {
    if (fixture) run('ChangePhase(phases.corpActionMain); Main();');
    else run('StartGame()');
  } catch (error) {
    errors.add('uncaught: ' + error.message);
    done();
  }
  return finished;
}

module.exports = {playGame, readFixture, loadPrecon, validateDeckPairs, createRootTracker, root};
