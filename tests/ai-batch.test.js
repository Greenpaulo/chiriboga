'use strict';
// F4 seeded AI-vs-AI batch harness (scripts/ai-batch.js): reproducibility,
// independent random streams, options, comparison rule, collectors, fixture
// starts, core metrics, telemetry, the committed deck pool, baseline reuse and
// --quick. Real games use short Gateway seeds to keep the suite fast.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {playGame, readFixture, loadPrecon} = require('../scripts/ai-batch/headless');
const metrics = require('../scripts/ai-batch/metrics');
const batch = require('../scripts/ai-batch');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts', 'ai-batch.js');
const poolFile = path.join(root, 'tests/fixtures/ai-batch/deck-pool.json');
const {pool, setFiles, ranges} = batch.loadPool(poolFile);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-batch-test-'));
const verbose = !!process.env.VERBOSE;
let passed = 0;
const failures = [];

async function scenario(name, fn) {
  try {
    await fn();
    passed++;
    if (verbose) console.log('ok   ' + name);
  } catch (error) {
    failures.push(name + ': ' + (error.stack || error.message));
  }
}

const gateway = pool.pairs.find(p => p.id === 'gateway');
const game = (extra = {}) => playGame(Object.assign({streamPrefix: '1:gateway', corpFile: gateway.corp,
  runnerFile: gateway.runner, setFiles, timeoutMs: 120000, observe: true, telemetry: true}, extra));

function cli(args, env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8',
    env: Object.assign({}, process.env, {AI_BATCH_CACHE: path.join(tmp, 'cache')}, env)});
  return {status: result.status, out: (result.stdout || '') + (result.stderr || '')};
}

// A report without the fields that legitimately vary between identical runs.
function stable(report) {
  const copy = JSON.parse(JSON.stringify(report));
  delete copy.createdAt; delete copy.wallMs; delete copy.command;
  for (const g of copy.games) {
    delete g.ms;
    for (const name of Object.keys(g.metrics || {})) if (metrics.isTimingMetric(name)) delete g.metrics[name];
  }
  for (const group of Object.values(copy.aggregates))
    for (const name of Object.keys(group.metrics)) if (metrics.isTimingMetric(name)) delete group.metrics[name];
  return copy;
}

// A setup file run inside the game context before the game starts.
function setupFile(name, code) {
  const file = path.join(tmp, name + '.js');
  fs.writeFileSync(file, code);
  return file;
}

// Records the deck orders at the opening draw and counts draws from each AI stream.
const RECORD = `
  var __first = null, __corpDraws = 0, __runnerDraws = 0;
  var __startGame = StartGame;
  StartGame = function() {
    __first = {rnd: corp.RnD.cards.map(function(c) { return c.title; }), stack: runner.stack.map(function(c) { return c.title; })};
    return __startGame.apply(this, arguments);
  };
  var __corpRandom = corp.AI._random; corp.AI._random = function() { __corpDraws++; return __corpRandom(); };
  var __runnerRandom = runner.AI._random; runner.AI._random = function() { __runnerDraws++; return __runnerRandom(); };
  __report = function() { return {first: __first, corpDraws: __corpDraws, runnerDraws: __runnerDraws}; };
`;
// An extra draw from one AI's stream at every decision of that side.
const EXTRA_DRAW = side => `
  var __choice = ${side === 'corp' ? 'CorpAI.prototype.Choice' : 'RunnerAI.prototype._computeChoice'};
  ${side === 'corp' ? 'CorpAI.prototype.Choice' : 'RunnerAI.prototype._computeChoice'} = function() {
    this._random(); return __choice.apply(this, arguments);
  };
`;

(async () => {
  await scenario('1. identical runs give identical reports (ignoring timing)', async () => {
    const outs = [1, 2].map(i => path.join(tmp, `repro-${i}.json`));
    for (const out of outs) {
      const r = cli(['--pairs', 'gateway', '--seeds', '1-2', '--jobs', '2', '--collector', 'runs', '--out', out]);
      assert.strictEqual(r.status, 0, r.out);
    }
    const [a, b] = outs.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
    assert.deepStrictEqual(stable(a), stable(b));
    assert.strictEqual(a.games.length, 2);
  });

  await scenario('2. an extra Corp AI draw leaves the engine and Runner streams unchanged', async () => {
    const base = await game({setupFile: setupFile('record', RECORD)});
    const extra = await game({setupFile: setupFile('corp-extra', RECORD + EXTRA_DRAW('corp'))});
    assert.ok(extra.report.corpDraws > base.report.corpDraws, 'the extra Corp draws happened');
    assert.deepStrictEqual(extra.report.first, base.report.first, 'R&D and Stack order at the first draw');
    assert.ok(base.report.corpDraws > 0, 'Corp policy draws from its dedicated stream');
  });

  await scenario('3. Runner AI stream: same seed reproduces choices; an extra Runner draw keeps the engine stream', async () => {
    const a = await game({setupFile: setupFile('record', RECORD)});
    const b = await game({setupFile: setupFile('record', RECORD)});
    assert.strictEqual(a.logHash, b.logHash, 'same seed replays the same game');
    assert.ok(a.report.runnerDraws > 0, 'Runner policy draws from its dedicated stream, not the engine stream');
    const extra = await game({setupFile: setupFile('runner-extra', RECORD + EXTRA_DRAW('runner'))});
    assert.ok(extra.report.runnerDraws > a.report.runnerDraws, 'the extra Runner draws happened');
    assert.deepStrictEqual(extra.report.first, a.report.first, 'R&D and Stack order at the first draw');
  });

  await scenario('4. AI options: set per run, recorded, unknown names fail, comparison keys', async () => {
    const out = path.join(tmp, 'option.json');
    const r = cli(['--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--corp-option', 'evidenceBasedHostedCardRez=true', '--out', out]);
    assert.strictEqual(r.status, 0, r.out);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(report.options.corp.evidenceBasedHostedCardRez, true);
    const defaults = await game();
    assert.strictEqual(defaults.options.corp.evidenceBasedHostedCardRez, false, 'the option is off in other runs');
    const unknown = cli(['--pairs', 'gateway', '--seeds', '1-1', '--corp-option', 'noSuchOption=true', '--out', path.join(tmp, 'x.json')]);
    assert.notStrictEqual(unknown.status, 0);
    assert.ok(/Unknown corp AI option: noSuchOption/.test(unknown.out), unknown.out);
    const unknownRunner = cli(['--pairs', 'gateway', '--seeds', '1-1', '--runner-option', 'noSuchOption=true', '--out', path.join(tmp, 'x.json')]);
    assert.ok(/Unknown runner AI option: noSuchOption/.test(unknownRunner.out), unknownRunner.out);
    // Only options may differ between compared reports.
    const synthetic = (extra = {}) => Object.assign({poolHash: 'p', seeds: ['1'], starts: [], collectors: [],
      options: {corp: {}, runner: {}}, games: [{deckPairId: 'a', seed: '1', fixtureId: null, ok: true, metrics: {winRate: 1}}]}, extra);
    assert.strictEqual(metrics.compareReports(synthetic(), synthetic({options: {corp: {x: true}, runner: {}}})).pairedGames, 1);
    for (const field of ['seeds', 'poolHash', 'starts', 'collectors'])
      assert.throws(() => metrics.compareReports(synthetic(), synthetic({[field]: ['other']})), new RegExp('differ in ' + field));
  });

  await scenario('5. comparison: known paired difference, deterministic bootstrap interval', async () => {
    const games = shift => Array.from({length: 60}, (_, i) => ({deckPairId: 'a', seed: String(i + 1), fixtureId: null, ok: true,
      metrics: {pointsScored: (i % 7) + shift + (shift ? (i % 3) - 1 : 0), pointsStolen: i % 5}}));
    const report = g => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: g});
    const a = metrics.compareReports(report(games(0)), report(games(1)), {improve: ['pointsScored'], guard: {pointsStolen: 0.5}});
    const b = metrics.compareReports(report(games(0)), report(games(1)), {improve: ['pointsScored'], guard: {pointsStolen: 0.5}});
    assert.deepStrictEqual(a, b, 'the comparison is reproducible');
    const m = a.metrics.pointsScored;
    assert.ok(Math.abs(m.difference - 1) < 1e-9, 'mean paired difference is 1, got ' + m.difference);
    assert.ok(m.low <= 1 && m.high >= 1 && m.low < m.high, `interval [${m.low}, ${m.high}] contains 1`);
    assert.strictEqual(a.pass, true);
    // Lower-is-better metrics are oriented so positive means improvement.
    const worse = metrics.compareReports(report(games(0)), report(games(0).map(g => Object.assign({}, g,
      {metrics: Object.assign({}, g.metrics, {pointsStolen: g.metrics.pointsStolen + 1})}))), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(worse.metrics.pointsStolen.improvement.mean, -1);
    assert.strictEqual(worse.pass, false);
  });

  await scenario('5b. --side runner flips outcome directions; --max is a hard check on every game', async () => {
    const games = shift => Array.from({length: 40}, (_, i) => ({deckPairId: 'a', seed: String(i + 1), fixtureId: null, ok: true,
      metrics: {winRate: (i % 2) && shift ? 0 : i % 2, 'x.violations': shift && i === 7 ? 2 : 0}}));
    const report = g => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: g});
    const base = report(games(0)), cand = report(games(1));
    const corp = metrics.compareReports(base, cand, batch.gateSpec(batch.parseArgs(['--improve', 'winRate'])));
    assert.strictEqual(corp.pass, false, 'a lower Corp win rate is not a Corp improvement');
    const runner = metrics.compareReports(base, cand, batch.gateSpec(batch.parseArgs(['--side', 'runner', '--improve', 'winRate'])));
    assert.strictEqual(runner.pass, true, 'a lower Corp win rate is a Runner improvement');
    const spec = batch.gateSpec(batch.parseArgs(['--max', 'x.violations=0']));
    const hard = batch.applyMaxChecks(metrics.compareReports(base, cand, spec), cand, spec.max);
    assert.strictEqual(hard.pass, false);
    assert.ok(/1 games exceed it, e.g. a seed 8/.test(hard.checks[0].why), hard.checks[0].why);
    const ok = batch.applyMaxChecks(metrics.compareReports(base, base, spec), base, spec.max);
    assert.strictEqual(ok.pass, true);
  });

  await scenario('6. a collector receives the events and its metric reaches the report and comparison', async () => {
    const seen = new Set();
    const g = await game({onEvent: e => seen.add(e.type)});
    for (const type of ['gameStart', 'decision', 'run', 'turnEnd', 'gameEnd']) assert.ok(seen.has(type), 'emits ' + type);
    assert.ok(seen.has('score') || seen.has('steal'), 'emits score or steal');
    assert.ok(g.winner);
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'repro-1.json'), 'utf8'));
    assert.deepStrictEqual(report.collectors, ['runs']);
    for (const game of report.games) assert.ok(game.metrics['runs.total'] >= game.metrics['runs.successful']);
    assert.ok('runs.successful' in metrics.compareReports(report, report).metrics);
    const unknown = cli(['--pairs', 'gateway', '--seeds', '1-1', '--collector', 'noSuchCollector', '--out', path.join(tmp, 'x.json')]);
    assert.ok(/Unknown collector: noSuchCollector/.test(unknown.out), unknown.out);
  });

  await scenario('7. --start begins from a fixture board, runs to PlayerWin and is reproducible', async () => {
    const file = path.join(root, 'tests/fixtures/corp-decisions/corp-draw-ok-when-hq-secure.txt');
    assert.strictEqual(batch.resolveStarts([file], ranges).length, 1, 'the fixture uses only pool cards');
    const identity = Number(/CorpTestField\((\d+)/.exec(readFixture(file).code)[1]);
    let start = null;
    const runs = [];
    for (let i = 0; i < 2; i++)
      runs.push(await game({start: file, onEvent: e => { if (e.type === 'gameStart') start = e; }}));
    assert.strictEqual(start.fixtureId, 'corp-draw-ok-when-hq-secure');
    assert.strictEqual(identity, 30035);
    assert.strictEqual(start.corpIdentity, 'Haas-Bioroid: Precision Design', 'the fixture identity replaced the pool deck identity');
    assert.ok(runs[0].winner && !runs[0].errors.length, JSON.stringify(runs[0].errors));
    assert.strictEqual(runs[0].logHash, runs[1].logHash);
    const outside = path.join(root, 'tests/fixtures/corp-decisions/corp-protects-baker-backdoor-after-rnd-layer-blocked.txt');
    assert.throws(() => batch.resolveStarts([outside], ranges), /outside the pool's sets/);
  });

  await scenario('8. core metrics from a scripted game, and consistency on a real game', async () => {
    const events = [
      {type: 'gameStart'}, {type: 'mulligan', side: 'corp'},
      {type: 'decision', side: 'corp', latencyMs: 2}, {type: 'decision', side: 'corp', latencyMs: 4},
      {type: 'decision', side: 'runner', latencyMs: 1},
      {type: 'run', server: 'hq', success: true}, {type: 'steal', server: 'hq', points: 2},
      {type: 'steal', server: 'rd', points: 1}, {type: 'steal', server: 'archives', points: 1},
      {type: 'steal', server: 'remote', points: 2}, {type: 'score', points: 3}, {type: 'turnEnd', side: 'corp'},
      {type: 'gameEnd', winner: 'corp', turns: 9},
    ];
    assert.deepStrictEqual(metrics.coreMetrics(events), {
      winRate: 1, pointsScored: 3, pointsStolen: 6, gameLength: 9,
      'pointsStolenByServer.hq': 2, 'pointsStolenByServer.rd': 1, 'pointsStolenByServer.archives': 1, 'pointsStolenByServer.remote': 2,
      'decisionLatencyMs.corp.mean': 3, 'decisionLatencyMs.corp.p95': 4, 'decisionLatencyMs.corp.max': 4,
      'decisionLatencyMs.runner.mean': 1, 'decisionLatencyMs.runner.p95': 1, 'decisionLatencyMs.runner.max': 1,
      'mulliganRate.corp': 1, 'mulliganRate.runner': 0,
    });
    for (const name of Object.keys(metrics.coreMetrics(events))) assert.ok(name in metrics.CORE_DIRECTIONS, 'direction declared for ' + name);
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'repro-1.json'), 'utf8'));
    for (const g of report.games) {
      assert.strictEqual(g.metrics.pointsStolen, g.runnerPoints, 'stolen points match the Runner score area');
      assert.strictEqual(g.metrics.pointsScored, g.corpPoints, 'scored points match the Corp score area');
      assert.strictEqual(g.metrics.winRate, g.winner === 'corp' ? 1 : 0);
      assert.strictEqual(g.metrics.gameLength, g.turns);
    }
  });

  await scenario('9. telemetry and observation change no decision and consume no randomness', async () => {
    const quiet = await game({telemetry: false, observe: false, setupFile: setupFile('record', RECORD)});
    let decisions = 0;
    const loud = await game({onEvent: e => { if (e.type === 'decision') decisions++; }, setupFile: setupFile('record', RECORD)});
    assert.ok(decisions > 0, 'telemetry recorded decisions');
    assert.strictEqual(loud.logHash, quiet.logHash);
    assert.deepStrictEqual(loud.report, quiet.report, 'same AI-stream consumption');
  });

  await scenario('10. the committed pool uses only its trusted sets and defined cards', async () => {
    const registry = {systemgateway: 1, systemupdate2021: 1, elevation: 1};
    assert.deepStrictEqual(pool.sets.slice().sort(), Object.keys(registry).sort());
    const defined = new Set();
    for (const file of setFiles)
      for (const m of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/^cardSet\[(\d+)\]\s*=/gm)) defined.add(Number(m[1]));
    const problems = [];
    for (const pair of pool.pairs) for (const file of [pair.corp, pair.runner]) {
      const deck = loadPrecon(file);
      for (const id of [deck.identity, ...Object.keys(deck.cards)].map(Number)) {
        if (!ranges.some(([from, to]) => id >= from && id <= to)) problems.push(`${file}: ${id} is outside the pool's sets`);
        else if (!defined.has(id)) problems.push(`${file}: ${id} has no cardSet definition`);
      }
    }
    assert.deepStrictEqual(problems, []);
    const files = pool.pairs.map(p => p.corp);
    assert.ok(files.includes('Zwicky Supermodernism.js') && files.includes('LEO Glacier.js'));
    assert.strictEqual(new Set(pool.pairs.map(p => p.id)).size, pool.pairs.length, 'pair ids are unique');
  });

  await scenario('gate: baseline reuse and --quick', async () => {
    assert.strictEqual(batch.resolveSeeds(batch.parseArgs(['--quick'])).length, 50);
    assert.strictEqual(batch.resolveSeeds(batch.parseArgs([])).length, 200);
    const args = ['gate', '--pairs', 'gateway', '--seeds', '1-2', '--jobs', '2', '--corp-option', 'evidenceBasedHostedCardRez=true',
      '--guard', 'winRate=1'];
    const first = cli(args);
    assert.strictEqual(first.status, 0, first.out);
    assert.ok(/baseline: playing 2 games/.test(first.out) && /candidate: playing 2 games/.test(first.out), first.out);
    assert.ok(/PASS guard winRate/.test(first.out) && /Gate: passed/.test(first.out), first.out);
    const second = cli(args);
    assert.ok(/baseline: reusing/.test(second.out) && /candidate: reusing/.test(second.out), second.out);
    const quick = cli(['gate', '--pairs', 'gateway', '--quick', '--seeds', '1-2', '--jobs', '2', '--guard', 'winRate=1']);
    assert.ok(/indicative only/.test(quick.out), quick.out);
    assert.notStrictEqual(quick.status, 0, 'a quick run cannot pass a gate');
  });

  fs.rmSync(tmp, {recursive: true, force: true});
  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`ai-batch: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`ai-batch: ${passed} scenarios passed`);
})();
