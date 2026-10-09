#!/usr/bin/env node
'use strict';
// F4 seeded AI-vs-AI batch harness. Owner's guide: documentation/ai-batch-harness.md.
//
//   node scripts/ai-batch.js [batch options] [--out <report.json>]
//   node scripts/ai-batch.js --compare <baseline.json> <candidate.json> [gate options]
//   node scripts/ai-batch.js gate [batch options] [gate options]
//   node scripts/ai-batch.js replay --pairs <id> --seeds <n> [--start <fixture>] [options] [--diff]
//     plays one game exactly as a batch does and prints its full log; --diff
//     plays it with every option off and as given, and prints only the
//     differing log lines (use this to read why a gate result moved)
//
// Batch options:
//   --pool <file>                 deck pool (default tests/fixtures/ai-batch/deck-pool.json)
//   --games <n> | --quick         seeds 1..n per deck pair (default 200; --quick is 50, indicative only)
//   --seeds <from>-<to> | <file>  explicit seeds instead (file: JSON array or one per line)
//   --pairs <id,id>               only these deck pairs from the pool
//   --start <fixture.txt|dir>     begin every game from a saved board (repeatable)
//   --start-tag <tag>             every board under tests/fixtures/ai-batch/starts/ whose
//                                 TAGS include all given tags (repeatable; scripts/start-board.js)
//   --budget <games>              seeds per board and pair = max(10, floor(games / (boards x pairs)))
//   --corp-option <name>=<value>  set corp.AI.options.<name> (repeatable; unknown names fail)
//   --runner-option <name>=<value>
//   --security-cache off|on|verify  F3 comparison only; defaults to the game's setting
//   --collector <name>            scripts/ai-batch/collectors/<name>.js (repeatable)
//   --jobs <n>                    parallel processes (default: CPUs - 2)
//   --timeout <seconds>           per game (default 900)
// Gate options:
//   --guard <metric>=<tolerance>  fail if the interval admits a regression beyond tolerance
//   --improve <metric>            require the oriented interval's lower bound above zero
//   --better <metric>=higher|lower  direction for a metric without a default
//   --side runner                 a Runner item: flip the outcome metrics' directions
//   --max <metric>=<n>            hard check: fail if any candidate game exceeds n
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const {fork, execSync} = require('child_process');
const {playGame, readFixture, validateDeckPairs, root} = require('./ai-batch/headless');
const metricsLib = require('./ai-batch/metrics');

const DEFAULT_POOL = path.join(root, 'tests/fixtures/ai-batch/deck-pool.json');
const CACHE_DIR = process.env.AI_BATCH_CACHE ? path.resolve(process.env.AI_BATCH_CACHE) : path.join(root, '.ai-batch-cache');
const HARNESS_FILES = ['scripts/ai-batch/headless.js', 'scripts/ai-batch/metrics.js'];
const CODE_FILES = ['deck/seedrandom.min.js', 'config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js',
  'checks.js', 'mechanics.js', 'utility.js', 'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];

const sha1 = text => crypto.createHash('sha1').update(text).digest('hex');

function parseArgs(argv) {
  const out = {_: [], start: [], startTag: [], corpOption: [], runnerOption: [], collector: [], guard: [], improve: [], better: [], max: []};
  const repeatable = {'--start': 'start', '--start-tag': 'startTag', '--corp-option': 'corpOption', '--runner-option': 'runnerOption',
    '--collector': 'collector', '--guard': 'guard', '--improve': 'improve', '--better': 'better', '--max': 'max'};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const take = option => {
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('-')) throw new Error(option + ' needs an operand');
      i++;
      return value;
    };
    if (arg === '--compare') { out.compare = [take(arg), take(arg)]; }
    else if (arg === '--quick' || arg === '--worker' || arg === '--all' || arg === '--diff') out[arg.slice(2)] = true;
    else if (repeatable[arg]) out[repeatable[arg]].push(take(arg));
    else if (arg.startsWith('--')) out[arg.slice(2)] = take(arg);
    else out._.push(arg);
  }
  return out;
}

const parseValue = text => text === 'true' ? true : text === 'false' ? false :
  text !== '' && !isNaN(Number(text)) ? Number(text) : text;

function parseAssignments(list, what) {
  const out = {};
  for (const item of list) {
    const i = item.indexOf('=');
    if (i < 1) throw new Error(`${what} must be <name>=<value>: ${item}`);
    out[item.slice(0, i)] = parseValue(item.slice(i + 1));
  }
  return out;
}

// Which set files a pool's trusted set keys load, from config.js setRegistry.
function setRegistry() {
  const vm = require('vm');
  const context = {window: {}, console: {log() {}}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8') + ';this.__registry = setRegistry;', context);
  return context.__registry.availableSets;
}

function loadPool(file) {
  const text = fs.readFileSync(file, 'utf8');
  const pool = JSON.parse(text);
  const pairIds = new Set();
  for (const pair of pool.pairs) {
    if (pairIds.has(pair.id)) throw new Error('Duplicate deck pair id in pool: ' + pair.id);
    pairIds.add(pair.id);
  }
  const registry = setRegistry();
  const setFiles = pool.sets.map(key => {
    if (!registry[key]) throw new Error(`Pool set ${key} is not in config.js setRegistry`);
    return 'sets/' + registry[key].file + '.js';
  });
  // The pool hash covers the pool file, the trusted set list and every deck list.
  const decks = pool.pairs.flatMap(p => [p.corp, p.runner]).sort()
    .map(f => f + '\n' + fs.readFileSync(path.join(root, 'precons', f), 'utf8')).join('\n');
  const ranges = pool.sets.map(key => registry[key].idRange);
  return {pool, setFiles, ranges, hash: sha1(text + '\n' + decks).slice(0, 16), file: path.relative(root, path.resolve(file))};
}

// Card ids a fixture board uses (the numbers inside its TestField calls).
const fixtureCardIds = code => (code.match(/TestField\([^;]*\)/g) || [])
  .flatMap(call => call.match(/\b\d{4,5}\b/g) || []).map(Number);

function resolveSeeds(args) {
  if (args.seeds) {
    const range = /^(\d+)-(\d+)$/.exec(args.seeds);
    if (range) {
      const seeds = [];
      for (let s = Number(range[1]); s <= Number(range[2]); s++) seeds.push(String(s));
      return seeds;
    }
    const text = fs.readFileSync(args.seeds, 'utf8').trim();
    return text.startsWith('[') ? JSON.parse(text).map(String) : text.split(/\s+/);
  }
  const n = args.quick ? 50 : Number(args.games || 200);
  return Array.from({length: n}, (_, i) => String(i + 1));
}

// --start files and directories. A fixture that uses a card outside the
// pool's trusted sets is an error when named directly and skipped (with a
// note) when it comes from a directory.
function resolveStarts(list, ranges) {
  const out = [];
  const inPool = id => ranges.some(([from, to]) => id >= from && id <= to);
  for (const item of list) {
    const full = path.resolve(item);
    const directory = fs.statSync(full).isDirectory();
    const files = directory ? fs.readdirSync(full).filter(f => f.endsWith('.txt')).sort().map(f => path.join(full, f)) : [full];
    for (const file of files) {
      const fixture = readFixture(file);
      const outside = [...new Set(fixtureCardIds(fixture.code).filter(id => !inPool(id)))];
      if (outside.length) {
        const message = `Fixture ${fixture.id} uses cards outside the pool's sets: ${outside.join(', ')}`;
        if (!directory) throw new Error(message);
        console.error('Skipping: ' + message);
        continue;
      }
      out.push({id: fixture.id, file, hash: sha1(fs.readFileSync(file, 'utf8')).slice(0, 12)});
    }
  }
  return [...new Map(out.map(start => [start.file, start])).values()];
}

function loadCollectors(names) {
  return names.map(name => {
    const file = path.join(__dirname, 'ai-batch', 'collectors', name + '.js');
    if (!fs.existsSync(file)) throw new Error(`Unknown collector: ${name} (expected ${path.relative(root, file)})`);
    const collector = require(file);
    if (collector.name !== name) throw new Error(`Collector ${file} must export name "${name}"`);
    return collector;
  });
}

function codeHash(setFiles, collectorNames) {
  const files = [...CODE_FILES, ...setFiles, ...HARNESS_FILES,
    ...collectorNames.map(n => `scripts/ai-batch/collectors/${n}.js`)];
  // Line endings are ignored, so a checkout's CRLF settings do not change the key.
  return sha1(files.map(f => f + '\n' + fs.readFileSync(path.join(root, f), 'utf8').replace(/\r/g, '')).join('\n')).slice(0, 16);
}

function git(command) {
  try { return execSync('git ' + command, {cwd: root, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim(); }
  catch (e) { return null; }
}

// ---- worker: plays one game per message ----
async function playJob(job) {
  const collectors = loadCollectors(job.collectors);
  const events = [];
  const states = collectors.map(() => ({seed: job.seed, deckPairId: job.deckPairId, fixtureId: job.fixtureId}));
  const onEvent = event => {
    events.push(event);
    collectors.forEach((c, i) => c.onEvent(Object.freeze(Object.assign({}, event)), states[i]));
  };
  const game = await playGame({
    streamPrefix: `${job.seed}:${job.deckPairId}`, corpFile: job.corp, runnerFile: job.runner,
    setFiles: job.setFiles, timeoutMs: job.timeoutMs, start: job.start, corpOptions: job.corpOptions,
    runnerOptions: job.runnerOptions, securityCache: job.securityCache,
    evaluatorTelemetry: job.collectors.includes('evaluatorCallCount'), telemetry: true, observe: true, onEvent, testOption: process.env.AI_BATCH_TEST_OPTION,
  });
  const ok = Boolean(game.winner) && !game.errors.length;
  const record = {fixtureId: job.fixtureId, deckPairId: job.deckPairId, seed: job.seed, ok,
    winner: game.winner, reason: game.reason, turns: game.turns, corpPoints: game.corpPoints, runnerPoints: game.runnerPoints,
    logHash: game.logHash, ms: game.ms, errors: game.errors,
    decisionHash: sha1(JSON.stringify(events.filter(e => e.type === 'decision')
      .map(e => [e.n, e.side, e.identifier, e.choiceType, e.options, e.chosen])))};
  if (ok) {
    record.metrics = metricsLib.coreMetrics(events);
    collectors.forEach((c, i) => Object.assign(record.metrics, metricsLib.flattenCollector(c.name, c.finish(states[i]))));
  }
  return {record, options: game.options};
}

if (require.main === module && process.argv.includes('--worker')) {
  process.on('uncaughtException', error => playGame.fail('uncaught: ' + error.message));
  process.on('message', async job => {
    try { process.send(await playJob(job)); }
    catch (error) { process.send({error: error.message}); }
  });
  return;
}

// ---- batch ----
function runBatch(config) {
  const jobs = [];
  for (const start of config.starts.length ? config.starts : [null])
    for (const pair of config.pairs)
      for (const seed of config.seeds)
        jobs.push({fixtureId: start ? start.id : null, start: start ? start.file : null, deckPairId: pair.id,
          corp: pair.corp, runner: pair.runner, seed, setFiles: config.setFiles, timeoutMs: config.timeoutMs,
          corpOptions: config.corpOptions, runnerOptions: config.runnerOptions, collectors: config.collectorNames,
          securityCache: config.securityCache});
  const total = jobs.length;
  const games = [];
  let effective = null;
  const started = Date.now();
  return new Promise((resolve, reject) => {
    let active = 0;
    let failed = false;
    const children = [];
    const retried = new Set();
    const fail = error => {
      if (failed) return;
      failed = true;
      for (const child of children) child.kill();
      reject(error);
    };
    const workers = Math.max(1, Math.min(config.jobs, jobs.length));
    const progress = () => {
      if (process.stderr.isTTY) process.stderr.write(`\r${games.length}/${total} games, ${Math.round((Date.now() - started) / 1000)} s`);
    };
    const spawnWorker = () => {
      const child = fork(__filename, ['--worker'], {stdio: ['ignore', 'ignore', 'inherit', 'ipc']});
      children.push(child);
      active++;
      let pending = null;
      const next = () => {
        if (failed) return;
        if (!jobs.length) { child.kill(); return; }
        const job = jobs.shift();
        pending = job;
        child.once('message', message => {
          pending = null;
          if (failed) return;
          if (message.error) { fail(new Error(message.error)); return; }
          games.push(message.record);
          effective = effective || message.options;
          progress();
          next();
        });
        child.send(job, error => { if (error) fail(error); });
      };
      child.on('error', fail);
      child.on('exit', (code, signal) => {
        if (failed) return;
        if (pending) {
          const detail = `Worker exited before returning ${pending.deckPairId} seed ${pending.seed}` +
            `${pending.fixtureId ? ' start ' + pending.fixtureId : ''} (code ${code}, signal ${signal})`;
          // A native V8 crash can depend on a long-lived worker's history.
          // Replay the identical job once in a fresh process; never skip it.
          if (signal === 'SIGSEGV' && !retried.has(pending)) {
            retried.add(pending);
            jobs.unshift(pending);
            active--;
            if (process.stderr.isTTY) process.stderr.write('\n');
            console.error(detail + '; retrying once in a fresh worker');
            spawnWorker();
            return;
          }
          fail(new Error(detail + (retried.has(pending) ? ' after retry' : '')));
          return;
        }
        if (--active) return;
        if (jobs.length || games.length !== total) { fail(new Error('Incomplete batch results')); return; }
        if (process.stderr.isTTY) process.stderr.write('\n');
        resolve({games, effective, wallMs: Date.now() - started});
      });
      next();
    };
    for (let w = 0; w < workers; w++) spawnWorker();
  });
}

function buildConfig(args, overrides = {}) {
  const poolInfo = loadPool(args.pool || DEFAULT_POOL);
  let pairs = poolInfo.pool.pairs;
  if (args.pairs) {
    const wanted = args.pairs.split(',');
    pairs = pairs.filter(p => wanted.includes(p.id));
    if (pairs.length !== wanted.length) throw new Error('Unknown deck pair in --pairs: ' + args.pairs);
  }
  if (args['security-cache'] && !['off', 'on', 'verify'].includes(args['security-cache']))
    throw new Error('--security-cache must be off, on or verify');
  const collectorNames = args.collector.slice().sort();
  const collectors = loadCollectors(collectorNames);
  const starts = resolveStarts([...new Set([...args.start, ...taggedStarts(args.startTag || [])])], poolInfo.ranges);
  const config = Object.assign({
    poolInfo, pairs, setFiles: poolInfo.setFiles, seeds: budgetSeeds(args, starts, pairs) || resolveSeeds(args), starts,
    budget: args.budget ? Number(args.budget) : null,
    corpOptions: parseAssignments(args.corpOption, '--corp-option'),
    runnerOptions: parseAssignments(args.runnerOption, '--runner-option'),
    collectorNames, directions: Object.assign({}, ...collectors.map(c => c.directions || {})),
    jobs: Number(args.jobs || Math.max(1, os.cpus().length - 2)), timeoutMs: Number(args.timeout || 900) * 1000,
    quick: Boolean(args.quick), securityCache: args['security-cache'],
  }, overrides);
  validateDeckPairs(config.pairs, config.setFiles);
  return config;
}

const STARTS_DIR = path.join(root, 'tests', 'fixtures', 'ai-batch', 'starts');

// Boards whose TAGS line (scripts/start-board.js) includes every given tag.
function taggedStarts(tags) {
  if (!tags.length) return [];
  const files = fs.existsSync(STARTS_DIR) ? fs.readdirSync(STARTS_DIR).filter(f => f.endsWith('.txt')).sort() : [];
  const matches = files.filter(f => {
    const line = (fs.readFileSync(path.join(STARTS_DIR, f), 'utf8').match(/^\/\/ TAGS:(.*)$/m) || [])[1] || '';
    const has = line.split(',').map(t => t.trim()).filter(Boolean);
    return tags.every(t => has.includes(t));
  }).map(f => path.join(STARTS_DIR, f));
  if (!matches.length) throw new Error('No start board has the tags: ' + tags.join(', '));
  return matches;
}

// --budget: the same seeds 1..k for every board and pair, so a board gate's
// cost does not grow with the number of boards and pairing is unchanged.
function budgetSeeds(args, starts, pairs) {
  if (!args.budget) return null;
  if (args.seeds || args.games || args.quick) throw new Error('--budget cannot be combined with --seeds, --games or --quick');
  const games = Number(args.budget);
  if (!(games > 0)) throw new Error('--budget needs a number of games');
  const k = Math.max(10, Math.floor(games / (Math.max(1, starts.length) * pairs.length)));
  return Array.from({length: k}, (_, i) => String(i + 1));
}

// Everything that decides a report's games except wall time.
function reportKey(config) {
  return sha1(JSON.stringify([codeHash(config.setFiles, config.collectorNames), config.poolInfo.hash,
    config.pairs.map(p => p.id), config.seeds, config.starts.map(s => s.hash), config.collectorNames,
    config.corpOptions, config.runnerOptions, config.securityCache])).slice(0, 16);
}

// Validate option names before playing any game: unknown names are errors.
function checkOptions(config) {
  const context = {};
  const vm = require('vm');
  const corpDefaults = /CorpAI\.DEFAULT_OPTIONS = Object\.freeze\((\{[\s\S]*?\})\);/.exec(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'));
  const runnerDefaults = /RunnerAI\.DEFAULT_OPTIONS = Object\.freeze\((\{[\s\S]*?\})\);/.exec(fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8'));
  vm.createContext(context);
  const defaults = {corp: vm.runInContext('(' + corpDefaults[1] + ')', context),
    runner: vm.runInContext('(' + runnerDefaults[1] + ')', context)};
  // AI_BATCH_TEST_OPTION adds a no-op Corp option, so the harness's own tests
  // need no real (gated) option.
  if (process.env.AI_BATCH_TEST_OPTION) defaults.corp[process.env.AI_BATCH_TEST_OPTION] = false;
  for (const [side, values] of [['corp', config.corpOptions], ['runner', config.runnerOptions]])
    for (const name in values)
      if (!Object.prototype.hasOwnProperty.call(defaults[side], name)) throw new Error(`Unknown ${side} AI option: ${name}`);
}

async function batch(config, command) {
  checkOptions(config);
  const {games, effective, wallMs} = await runBatch(config);
  games.sort((a, b) => [a.fixtureId || '', a.deckPairId, Number(a.seed)].join('|')
    .localeCompare([b.fixtureId || '', b.deckPairId, Number(b.seed)].join('|'), undefined, {numeric: true}));
  const dirtyText = git('status --porcelain');
  return {
    kind: 'ai-batch-report', format: 1,
    sha: git('rev-parse --short HEAD'), dirty: dirtyText === null ? null : dirtyText.length > 0,
    codeHash: codeHash(config.setFiles, config.collectorNames), key: reportKey(config),
    securityCache: config.securityCache, command, createdAt: new Date().toISOString(), wallMs,
    pool: {file: config.poolInfo.file, id: config.poolInfo.pool.id, sets: config.poolInfo.pool.sets},
    poolHash: config.poolInfo.hash, pairs: config.pairs.map(p => p.id), seeds: config.seeds,
    starts: config.starts.map(s => ({id: s.id, hash: s.hash})), collectors: config.collectorNames,
    directions: config.directions, quick: config.quick, budget: config.budget,
    options: effective || {corp: config.corpOptions, runner: config.runnerOptions},
    failures: games.filter(g => !g.ok).map(g => ({fixtureId: g.fixtureId, deckPairId: g.deckPairId, seed: g.seed,
      reason: g.reason, errors: g.errors})),
    aggregates: metricsLib.aggregate(games),
    games,
  };
}

// One game per line keeps committed baselines readable in diffs.
function writeReport(file, report) {
  const {games, ...head} = report;
  const body = JSON.stringify(head, null, 2).replace(/\n}$/, ',\n  "games": [\n' +
    games.map(g => '    ' + JSON.stringify(g)).join(',\n') + '\n  ]\n}\n');
  fs.mkdirSync(path.dirname(path.resolve(file)), {recursive: true});
  fs.writeFileSync(file, body);
}

function cachedReport(key) {
  for (const dir of [CACHE_DIR, path.join(root, 'tests/fixtures/ai-batch/baselines')]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
      try {
        const report = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        if (report.key === key && completeReport(report)) return {report, file: path.join(dir, file)};
      } catch (e) {}
    }
  }
  return null;
}

// Older interrupted runs could cache a full configuration key with missing games.
// Require exactly one terminal record for every configured job before reuse.
function completeReport(report) {
  if (!Array.isArray(report.games) || !Array.isArray(report.pairs) ||
      !Array.isArray(report.seeds) || !Array.isArray(report.starts)) return false;
  const expected = new Set();
  for (const start of report.starts.length ? report.starts : [{id: null}])
    for (const pair of report.pairs)
      for (const seed of report.seeds) expected.add(JSON.stringify([start.id, pair, String(seed)]));
  if (!expected.size || report.games.length !== expected.size) return false;
  for (const game of report.games) {
    if (typeof game.ok !== 'boolean' ||
        !expected.delete(JSON.stringify([game.fixtureId || null, game.deckPairId, String(game.seed)]))) return false;
  }
  return expected.size === 0;
}

// ---- printing ----
const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(3);

function printSummary(report) {
  const lines = [`${report.games.length} games (${report.failures.length} failed) in ${Math.round(report.wallMs / 1000)} s` +
    `${report.quick ? ' [quick: indicative only]' : ''}`];
  for (const key of Object.keys(report.aggregates)) {
    const games = report.games.filter(g => g.ok && (key === 'pooled' || (g.fixtureId ? g.fixtureId + '/' : '') + g.deckPairId === key));
    const wins = games.map(g => g.metrics.winRate);
    const ci = metricsLib.bootstrap(wins, 'winRate:' + key);
    const m = report.aggregates[key].metrics;
    lines.push(`  ${key.padEnd(24)} corp win ${(m.winRate * 100).toFixed(1)}% [${(ci.low * 100).toFixed(1)}, ${(ci.high * 100).toFixed(1)}]` +
      `  scored ${m.pointsScored.toFixed(2)}  stolen ${m.pointsStolen.toFixed(2)}  turns ${m.gameLength.toFixed(1)}  (${games.length} games)`);
  }
  for (const f of report.failures.slice(0, 10))
    lines.push(`  FAILED ${f.fixtureId ? f.fixtureId + '/' : ''}${f.deckPairId} seed ${f.seed}: ${f.errors.join('; ') || f.reason}`);
  console.log(lines.join('\n'));
}

// A gate prints only the metrics it names (agents read this output, so it is
// kept short); --compare, or gate --all, prints every metric.
function printComparison(result, quick, only = null) {
  const lines = [`${result.pairedGames} paired games${result.droppedGames ? `, ${result.droppedGames} unpaired or failed dropped` : ''}` +
    `${result.changedGames !== null ? `, ${result.changedGames} changed by the options` : ''}` +
    `${quick ? ' [quick: indicative only, cannot pass a gate]' : ''}`,
  '  metric                               baseline  candidate  difference  95% interval'];
  for (const [name, m] of Object.entries(result.metrics)) {
    if (only && !only.includes(name)) continue;
    lines.push(`  ${name.padEnd(36)} ${m.baseline.toFixed(3).padStart(8)}  ${m.candidate.toFixed(3).padStart(9)}  ${fmt(m.difference).padStart(10)}` +
      `  [${fmt(m.low)}, ${fmt(m.high)}]${m.direction ? ' (' + m.direction + ' is better)' : ''}`);
  }
  for (const c of result.checks)
    lines.push(`  ${c.pass ? 'PASS' : 'FAIL'} ${c.kind} ${c.name}${c.tolerance !== undefined ? (c.kind === 'max' ? ' at most ' : ' tolerance ') + c.tolerance : ''}${c.why ? ' (' + c.why + ')' : ''}`);
  if (result.pass !== null) lines.push(`Gate: ${result.pass && !quick ? 'passed' : quick ? 'indicative only' : 'failed'}`);
  console.log(lines.join('\n'));
}

// Outcome metrics are oriented for the Corp; a Runner item flips them.
const OUTCOME_METRICS = ['winRate', 'pointsScored', 'pointsStolen', 'pointsStolenByServer.hq',
  'pointsStolenByServer.rd', 'pointsStolenByServer.archives', 'pointsStolenByServer.remote'];

function gateSpec(args) {
  const guard = parseAssignments(args.guard, '--guard');
  const better = {};
  if (args.side && !['corp', 'runner'].includes(args.side)) throw new Error('--side must be corp or runner');
  if (args.side === 'runner')
    for (const name of OUTCOME_METRICS)
      better[name] = metricsLib.CORE_DIRECTIONS[name] === 'higher' ? 'lower' : 'higher';
  Object.assign(better, parseAssignments(args.better, '--better'));
  return {guard, improve: args.improve, better, max: parseAssignments(args.max, '--max')};
}

// Hard checks: a condition that must hold in every candidate game, not on average.
function applyMaxChecks(result, candidate, max) {
  for (const [name, limit] of Object.entries(max)) {
    const games = candidate.games.filter(g => g.ok);
    const over = games.filter(g => (g.metrics[name] || 0) > limit);
    const known = games.some(g => name in g.metrics);
    result.checks.push({name, kind: 'max', tolerance: limit, pass: known && !over.length,
      why: !known ? 'unknown metric' : over.length ? over.length + ' games exceed it, e.g. ' + over[0].deckPairId + ' seed ' + over[0].seed : undefined});
  }
  if (result.checks.length) result.pass = result.checks.every(c => c.pass);
  return result;
}

// One game, played as playJob() plays it, with its full log.
function replayGame(config, options) {
  const pair = config.pairs[0], seed = config.seeds[0], start = config.starts[0];
  return playGame({streamPrefix: `${seed}:${pair.id}`, corpFile: pair.corp, runnerFile: pair.runner,
    setFiles: config.setFiles, timeoutMs: config.timeoutMs, start: start ? start.file : null,
    corpOptions: options.corp, runnerOptions: options.runner, securityCache: config.securityCache,
    telemetry: true, observe: true, fullLog: true,
    testOption: process.env.AI_BATCH_TEST_OPTION});
}

async function replay(args) {
  if (/^\d+$/.test(args.seeds || '')) args.seeds = args.seeds + '-' + args.seeds;
  const config = buildConfig(args);
  if (config.pairs.length !== 1 || config.seeds.length !== 1 || config.starts.length > 1)
    throw new Error('replay needs exactly one --pairs id, one --seeds value and at most one --start');
  checkOptions(config);
  const describe = (label, g) => `${label}: ${g.winner || 'no winner'} (${g.reason}), Corp ${g.corpPoints}-${g.runnerPoints} Runner, ` +
    `${g.turns} turns, ${g.logLines} log lines, logHash ${g.logHash}${g.errors.length ? ', errors: ' + g.errors.join('; ') : ''}`;
  const candidate = await replayGame(config, {corp: config.corpOptions, runner: config.runnerOptions});
  if (!candidate.winner || candidate.errors.length) process.exitCode = 1;
  if (!args.diff) {
    console.log(describe('game', candidate));
    console.log(candidate.log.join('\n'));
    return;
  }
  const baseline = await replayGame(config, {corp: {}, runner: {}});
  if (!baseline.winner || baseline.errors.length) process.exitCode = 1;
  console.log(describe('baseline (options off)', baseline));
  console.log(describe('candidate', candidate));
  console.log(diffLogs(baseline.log, candidate.log));
}

// Compare replay logs; only diff's normal exit codes produce a verdict.
function diffLogs(baseline, candidate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-replay-'));
  try {
    fs.writeFileSync(path.join(dir, 'baseline.log'), baseline.join('\n') + '\n');
    fs.writeFileSync(path.join(dir, 'candidate.log'), candidate.join('\n') + '\n');
    const result = require('child_process').spawnSync('diff', ['-U2', 'baseline.log', 'candidate.log'], {cwd: dir, encoding: 'utf8'});
    if (result.error || (result.status !== 0 && result.status !== 1)) {
      throw new Error('diff failed: ' + (result.error ? result.error.message :
        result.stderr || (result.signal ? 'signal ' + result.signal : 'exit status ' + result.status)));
    }
    return result.status === 0 ? 'Logs are identical.' : result.stdout;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

// Behaviour-identical F3 gate: unlike a strategic option gate, any changed
// decision or game log is a failure. Reuse F4 paired bootstrap intervals.
function checkSecurityCacheGate(baseline, candidate, verified) {
  const comparison = metricsLib.compareReports(baseline, candidate);
  metricsLib.compareReports(candidate, verified); // validate paired configurations
  const expected = baseline.games.length;
  const byKey = report => new Map(report.games.map(g => [[g.deckPairId, g.seed, g.fixtureId || ''].join('|'), g]));
  const on = byKey(candidate), verify = byKey(verified);
  const complete = [baseline, candidate, verified].every(completeReport) &&
    JSON.stringify(baseline.pairs) === JSON.stringify(candidate.pairs) &&
    JSON.stringify(baseline.pairs) === JSON.stringify(verified.pairs);
  const modes = baseline.securityCache === 'off' && candidate.securityCache === 'on' && verified.securityCache === 'verify';
  const healthy = complete && [baseline, candidate, verified].every(r => !r.failures.length && r.games.every(g => g.ok));
  const identical = expected > 0 && on.size === expected && verify.size === expected && baseline.games.every(b => {
      const c = on.get([b.deckPairId, b.seed, b.fixtureId || ''].join('|'));
      const v = verify.get([b.deckPairId, b.seed, b.fixtureId || ''].join('|'));
      return c && v && b.logHash && b.decisionHash &&
        b.logHash === c.logHash && b.logHash === v.logHash &&
        b.decisionHash === c.decisionHash && b.decisionHash === v.decisionHash;
    });
  const calls = comparison.metrics['evaluatorCallCount.computationsPerMainDecision'];
  const latency = comparison.metrics['decisionLatencyMs.corp.mean'];
  const counted = [...baseline.games, ...candidate.games, ...verified.games].every(g =>
    g.metrics && g.metrics['evaluatorCallCount.mainDecisions'] > 0);
  const countName = 'evaluatorCallCount.computationsPerMainDecision';
  const finite = [...baseline.games, ...candidate.games, ...verified.games].every(g => g.metrics &&
    Number.isFinite(g.metrics[countName]) && Number.isFinite(g.metrics['decisionLatencyMs.corp.mean']));
  // Evaluate thresholds before rounding the human-readable summary.
  const sum = report => report.games.reduce((total, g) => total + g.metrics[countName], 0);
  const latencyInterval = finite && complete ? metricsLib.bootstrap(candidate.games.map(c => {
    const b = baseline.games.find(b => b.deckPairId === c.deckPairId && b.seed === c.seed &&
      (b.fixtureId || '') === (c.fixtureId || ''));
    return c.metrics['decisionLatencyMs.corp.mean'] - b.metrics['decisionLatencyMs.corp.mean'];
  }), 'decisionLatencyMs.corp.mean') : null;
  const pass = identical && healthy && modes && baseline.codeHash === candidate.codeHash && baseline.codeHash === verified.codeHash &&
    !baseline.quick && !candidate.quick && !verified.quick && counted && finite && calls && calls.baseline > 0 &&
    sum(candidate) <= sum(baseline) * 0.5 && latencyInterval && latencyInterval.high <= 0;
  return {pass: Boolean(pass), identical, healthy, counted, games: expected, calls, latency};
}

async function securityCacheGate(args) {
  if (args.games && (!Number.isInteger(Number(args.games)) || Number(args.games) < 200) && !args.quick)
    throw new Error('F3 gate requires at least 200 games per pair');
  if (args.pairs || args.seeds || args.start.length || args.startTag.length || args.pool)
    throw new Error('F3 gate uses the full committed deck pool and seeds 1..games');
  if (args.budget || args['security-cache'] || args.corpOption.length || args.runnerOption.length)
    throw new Error('F3 gate fixes cache modes and uses default AI options');
  const config = buildConfig(Object.assign({}, args, {collector: ['evaluatorCallCount']}));
  const reports = [];
  const directory = args.out || path.join(CACHE_DIR, 'f3-security-cache');
  for (const mode of ['off', 'on', 'verify']) {
    console.log(`cache ${mode}: playing ${config.pairs.length * config.seeds.length} games`);
    const report = await batch(Object.assign({}, config, {securityCache: mode}),
      'node scripts/ai-batch.js ' + process.argv.slice(2).join(' ') + ` [${mode}]`);
    writeReport(path.join(directory, mode + '.json'), report);
    console.log(`cache ${mode}: ${report.games.length} games, ${report.failures.length} failed, ${Math.round(report.wallMs / 1000)} s`);
    reports.push(report);
  }
  const result = checkSecurityCacheGate(...reports);
  console.log(`F3: ${result.games} paired games; decisions and logs identical: ${result.identical}; error-free complete reports: ${result.healthy}; main decisions measured: ${result.counted}`);
  for (const [name, metric] of [['computations/main decision', result.calls], ['Corp decision latency ms', result.latency]])
    console.log(`${name}: ${metric ? `${metric.baseline} -> ${metric.candidate}; difference ${metric.difference} [${metric.low}, ${metric.high}]` : 'missing'}`);
  console.log('Gate: ' + (args.quick ? 'indicative only (--quick)' : result.pass ? 'passed' : 'failed'));
  process.exitCode = result.pass && !args.quick ? 0 : 1;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args._[0] === 'replay') return replay(args);
  if (args._[0] === 'security-cache-gate') return securityCacheGate(args);
  const command = 'node scripts/ai-batch.js ' + process.argv.slice(2).join(' ');
  if (args.compare) {
    const [a, b] = args.compare.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
    const spec = gateSpec(args);
    const result = applyMaxChecks(metricsLib.compareReports(a, b, spec), b, spec.max);
    printComparison(result, a.quick || b.quick);
    process.exitCode = result.pass === false ? 1 : 0;
    return;
  }
  if (args._[0] === 'gate') {
    const candidateConfig = buildConfig(args);
    const baselineConfig = Object.assign({}, candidateConfig, {corpOptions: {}, runnerOptions: {}});
    checkOptions(candidateConfig);
    fs.mkdirSync(CACHE_DIR, {recursive: true});
    const reports = [];
    for (const [label, config] of [['baseline', baselineConfig], ['candidate', candidateConfig]]) {
      const hit = cachedReport(reportKey(config));
      if (hit) { console.log(`${label}: reusing ${path.relative(root, hit.file)}`); reports.push(hit.report); continue; }
      console.log(`${label}: playing ${config.pairs.length * config.seeds.length * Math.max(1, config.starts.length)} games`);
      const report = await batch(config, command + ` [${label}]`);
      const file = path.join(CACHE_DIR, `${label}-${report.key}.json`);
      writeReport(file, report);
      console.log(`${label}: ${report.games.length} games, ${report.failures.length} failed, ${Math.round(report.wallMs / 1000)} s; ` +
        path.relative(root, file));
      reports.push(report);
    }
    const spec = gateSpec(args);
    const result = applyMaxChecks(metricsLib.compareReports(reports[0], reports[1], spec), reports[1], spec.max);
    printComparison(result, candidateConfig.quick, args.all ? null : result.checks.map(c => c.name));
    process.exitCode = result.pass === false || candidateConfig.quick ? 1 : 0;
    return;
  }
  const config = buildConfig(args);
  const report = await batch(config, command);
  const out = args.out || path.join(CACHE_DIR, `report-${report.pool.id}-${report.key}.json`);
  writeReport(out, report);
  printSummary(report);
  console.log(`Report: ${path.relative(process.cwd(), out)}`);
  process.exitCode = report.failures.length ? 1 : 0;
}

module.exports = {checkSecurityCacheGate, diffLogs, parseArgs, resolveSeeds, loadPool, resolveStarts, taggedStarts, budgetSeeds, buildConfig, fixtureCardIds, writeReport, gateSpec, applyMaxChecks};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 2; });
