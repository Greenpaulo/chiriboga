#!/usr/bin/env node
'use strict';
// Play seeded AI-vs-AI games headlessly with the real engine, main loop and
// both AIs (F4 step 1; the batch harness builds on this). One JSON line per game.
//
//   node scripts/ai-game.js [--seed <s> | --seeds <from>-<to> [--jobs <n>]]
//                           [--corp "<precon file>"] [--runner "<precon file>"]
//                           [--timeout <seconds>] [--tail <lines>] [--setup <file.js>]
//
// Defaults: seed 1, "Duel PD vs Tao.js" against "Duel Tao vs PD.js", 900 s.
// Each seed drives three independent streams (engine, Corp AI, Runner AI), so
// the same seed replays the same game; `logHash` fingerprints the game log.
// A game fails (exit code 1) if it ends without a winner or logs an engine
// error, because a missing browser stub silently changes AI choices.
// --setup runs a file inside the game context before StartGame (for
// measurements); if it defines __report(), its result is added as `report`.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const {spawn} = require('child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const corpFile = option('corp', 'Duel PD vs Tao.js');
const runnerFile = option('runner', 'Duel Tao vs PD.js');
const timeoutMs = Number(option('timeout', '900')) * 1000;
const tail = Number(option('tail', '0'));
const setupFile = option('setup', null);

const range = option('seeds', null);
if (range) {
  // Several seeds: one child process per game, `--jobs` at a time.
  const [from, to] = range.split('-').map(Number);
  const jobs = Number(option('jobs', String(Math.max(1, require('os').cpus().length - 2))));
  const seeds = [];
  for (let s = from; s <= (to || from); s++) seeds.push(String(s));
  const passOn = ['corp', 'runner', 'timeout', 'setup'].flatMap(name => args.includes('--' + name) ? ['--' + name, option(name)] : []);
  let running = 0, failed = false;
  const next = () => {
    while (running < jobs && seeds.length) {
      running++;
      const child = spawn(process.execPath, [__filename, '--seed', seeds.shift(), ...passOn], {stdio: ['ignore', 'pipe', 'inherit']});
      let out = '';
      child.stdout.on('data', chunk => { out += chunk; });
      child.on('close', code => {
        process.stdout.write(out);
        if (code !== 0) failed = true;
        running--;
        if (seeds.length) next(); else if (!running) process.exitCode = failed ? 1 : 0;
      });
    }
  };
  next();
  return;
}
const seed = option('seed', '1');

// ---- headless engine: real files, browser globals stubbed ----
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
const logTail = [];
const hash = crypto.createHash('sha1');
let logLines = 0, steps = 0;
const context = {
  console: {log() {}, warn() {}, error: (...parts) => {
    const message = parts.join(' ');
    logTail.push('ERROR ' + message);
    if (/Error/.test(message)) errors.add(message.split('\n')[0].slice(0, 120));
  }},
  // The main loop reschedules itself with window.setTimeout; run it on the next tick.
  setTimeout: fn => { steps++; return setImmediate(fn); }, clearTimeout: handle => clearImmediate(handle),
  setInterval: () => 0, clearInterval() {},
  cardSet: [], setIdentifiers: [], accessibilityMode: 'text', particleSystems: stub,
  $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
  localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
  location: {search: '', href: '', hostname: 'localhost'},
};
context.window = context;
vm.createContext(context);
for (const file of ['deck/seedrandom.min.js', 'config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js',
  'mechanics.js', 'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js',
  'sets/vantagepoint.js', 'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const precons = [];
context.registerPrecon = precon => precons.push(precon);
for (const file of [corpFile, runnerFile])
  vm.runInContext(fs.readFileSync(path.join(root, 'precons', file), 'utf8'), context, {filename: file});
context.__decks = {corp: precons[0], runner: precons[1]};

let result = null, turns = 0, lastTurn = null;
const started = Date.now();
context.__onWin = (player, reason) => {
  if (!result) result = {winner: player === context.corp ? 'corp' : 'runner', reason};
};
context.__log = line => {
  hash.update(line + '\n'); logLines++;
  logTail.push(line); if (logTail.length > 200) logTail.shift();
};
context.__stop = () => {
  if (result) return true;
  const side = run('playerTurn === corp ? "corp" : "runner"');
  if (side !== lastTurn) { lastTurn = side; turns++; }
  return false;
};

// Player state as Init() prepares it, decks as LoadDecks() builds them, then
// the real StartGame() and Main() loop.
run(`
  Math.random = new Math.seedrandom(${JSON.stringify(seed + ':engine')});
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
  corp.AI = new CorpAI(); corp.AI._random = new Math.seedrandom(${JSON.stringify(seed + ':corp')}); corp.AI._log = function() {};
  runner.AI = new RunnerAI(); runner.AI._random = new Math.seedrandom(${JSON.stringify(seed + ':runner')}); runner.AI._log = function() {};
  corp.identityCard = InstanceCard(Number(__decks.corp.identity), cardBackTexturesCorp, glowTextures, strengthTextures);
  runner.identityCard = InstanceCard(Number(__decks.runner.identity), cardBackTexturesRunner, glowTextures, strengthTextures);
  for (var id in __decks.corp.cards)
    InstanceCardsPush(Number(id), corp.RnD.cards, __decks.corp.cards[id], cardBackTexturesCorp, glowTextures, strengthTextures);
  for (var id in __decks.runner.cards)
    InstanceCardsPush(Number(id), runner.stack, __decks.runner.cards[id], cardBackTexturesRunner, glowTextures, strengthTextures);
  corp.identityCard.faceUp = true; runner.identityCard.faceUp = true;
  Shuffle(corp.RnD.cards); Shuffle(runner.stack);
  corp.creditPool = 5; runner.creditPool = 5;
  PlayerWin = function(player, reason) { __onWin(player, reason); };
  Log = function(message) { __log(String(message)); };
  var __main = Main;
  Main = function() { if (__stop()) return; return __main(); };
`);

function finish() {
  if (finish.done) return;
  finish.done = true;
  const summary = Object.assign({seed, corp: context.__decks.corp.name, runner: context.__decks.runner.name},
    result || {winner: null, reason: 'timeout after ' + timeoutMs / 1000 + ' s'}, {
      turns: Math.ceil(turns / 2), ms: Date.now() - started, steps,
      corpPoints: run('AgendaPoints(corp)'), runnerPoints: run('AgendaPoints(runner)'),
      logLines, logHash: hash.digest('hex').slice(0, 12), errors: [...errors],
    }, typeof context.__report === 'function' ? {report: context.__report()} : {});
  console.log(JSON.stringify(summary));
  if (tail) console.log(logTail.slice(-tail).join('\n'));
  process.exit(summary.winner && !summary.errors.length ? 0 : 1);
}
process.on('uncaughtException', error => { errors.add('uncaught: ' + error.message); finish(); });
const poll = setInterval(() => { if (result) { clearInterval(poll); finish(); } }, 5);
setTimeout(finish, timeoutMs);
if (setupFile) vm.runInContext(fs.readFileSync(path.resolve(setupFile), 'utf8'), context, {filename: setupFile});
run('StartGame()');
