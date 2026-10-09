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
// A no-op Corp option the harness adds for its own tests (AI_BATCH_TEST_OPTION).
const TEST_OPTION = 'harnessTestOption';
const game = (extra = {}) => playGame(Object.assign({streamPrefix: '1:gateway', corpFile: gateway.corp,
  runnerFile: gateway.runner, setFiles, timeoutMs: 120000, observe: true, telemetry: true, testOption: TEST_OPTION}, extra));

function cli(args, env = {}) {
  const result = spawnSync(process.execPath, [script, ...args], {encoding: 'utf8',
    timeout: 180000,
    env: Object.assign({}, process.env, {AI_BATCH_CACHE: path.join(tmp, 'cache'), AI_BATCH_TEST_OPTION: TEST_OPTION}, env)});
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
  await scenario('F3 collector distinguishes requests from work and filters main commands', () => {
    const collector = require('../scripts/ai-batch/collectors/evaluatorCallCount');
    const state = {};
    collector.onEvent({type: 'gameStart'}, state);
    const event = {type: 'decision', side: 'corp', identifier: 'Corp 2.2', choiceType: 'command',
      securityEvaluation: {requests: 12, computations: 3}};
    collector.onEvent(event, state);
    collector.onEvent(Object.assign({}, event, {securityEvaluation: {requests: 8, computations: 1}}), state);
    for (const change of [{side: 'runner'}, {identifier: 'Corp 2.1'}, {choiceType: 'select'}])
      collector.onEvent(Object.assign({}, event, change), state);
    assert.deepStrictEqual(collector.finish(state), {mainDecisions: 2, requests: 20, computations: 4,
      requestsPerMainDecision: 10, computationsPerMainDecision: 2});
    assert.throws(() => collector.onEvent(Object.assign({}, event, {securityEvaluation: null}), state), /Missing/);
    assert.throws(() => collector.finish(state), /Missing/);
  });
  await scenario('F3 gate fails on changed decisions, missing evidence, poor savings or latency', () => {
    const report = (computations, ms) => ({poolHash: 'pool', seeds: [1], starts: [], collectors: ['evaluatorCallCount'],
      failures: [], pairs: ['gateway'], codeHash: 'same-code', games: [{deckPairId: 'gateway', seed: 1, ok: true, logHash: 'same', decisionHash: 'choices',
        metrics: {'evaluatorCallCount.mainDecisions': 2, 'evaluatorCallCount.computationsPerMainDecision': computations,
          'decisionLatencyMs.corp.mean': ms}}]});
    const off = report(10, 10), on = report(4, 3), verify = report(10, 11);
    off.securityCache = 'off'; on.securityCache = 'on'; verify.securityCache = 'verify';
    assert(batch.checkSecurityCacheGate(off, on, verify).pass);
    for (const arm of [0, 1, 2]) {
      for (const metric of ['evaluatorCallCount.computationsPerMainDecision', 'decisionLatencyMs.corp.mean']) {
        for (const value of [undefined, null, NaN, Infinity, -Infinity]) {
          const reports = [off, on, verify].map(r => JSON.parse(JSON.stringify(r)));
          reports[arm].games[0].metrics[metric] = value;
          assert.strictEqual(batch.checkSecurityCacheGate(...reports).pass, false,
            `${reports[arm].securityCache} arm must reject ${metric}=${value}`);
        }
      }
    }
    for (const change of [r => {r.games[0].decisionHash = 'changed';}, r => {r.games[0].logHash = 'changed';},
      r => {r.quick = true;}, r => {r.games[0].ok = false;}, r => {r.games = [];},
      r => {r.games[0].metrics['evaluatorCallCount.computationsPerMainDecision'] = 6;},
      r => {r.games[0].metrics['decisionLatencyMs.corp.mean'] = 11;},
      r => {r.games[0].metrics['evaluatorCallCount.mainDecisions'] = 0;}]) {
      const bad = JSON.parse(JSON.stringify(on)); change(bad);
      assert(!batch.checkSecurityCacheGate(off, bad, verify).pass);
    }
    verify.games[0].decisionHash = 'bad verification';
    assert(!batch.checkSecurityCacheGate(off, on, verify).pass);
  });
  await scenario('F3 instrumented cache modes preserve real Gateway choices', async () => {
    const results = [];
    for (const mode of ['off', 'on', 'verify']) {
      const events = [];
      const result = await game({securityCache: mode, evaluatorTelemetry: true, onEvent: e => events.push(e)});
      assert(result.winner); assert.deepStrictEqual(result.errors, []);
      const choices = events.filter(e => e.type === 'decision').map(e =>
        [e.side, e.identifier, e.choiceType, Array.from(e.options), e.chosen]);
      const main = events.filter(e => e.type === 'decision' && e.side === 'corp' && e.identifier === 'Corp 2.2' && e.choiceType === 'command');
      assert(main.length > 0);
      const totals = main.reduce((s, e) => ({requests: s.requests + e.securityEvaluation.requests,
        computations: s.computations + e.securityEvaluation.computations}), {requests: 0, computations: 0});
      results.push({hash: result.logHash, choices, totals});
    }
    assert.deepStrictEqual(results[0].choices, results[1].choices);
    assert.deepStrictEqual(results[0].choices, results[2].choices);
    assert.strictEqual(results[0].hash, results[1].hash);
    assert.strictEqual(results[0].hash, results[2].hash);
    assert(results[1].totals.computations < results[0].totals.computations);
    assert.deepStrictEqual(results[0].totals, results[2].totals);
  });

  await scenario('missing deck definitions fail before games; pair ids must be unique', () => {
    const invalidDeck = setupFile('missing-cards', 'registerPrecon(' + JSON.stringify({
      identity: '99999', cards: {'99998': 3},
    }) + ');');
    const invalidFile = path.relative(path.join(root, 'precons'), invalidDeck);
    const testPool = Object.assign({}, pool, {pairs: [gateway,
      {id: 'missing', corp: invalidFile, runner: gateway.runner}]});
    const file = path.join(tmp, 'missing-pool.json');
    fs.writeFileSync(file, JSON.stringify(testPool));
    const missing = /cards 99999, 99998 have no definition in the loaded sets/;
    assert.throws(() => batch.buildConfig(batch.parseArgs(['--pool', file])), missing);
    const selectedArgs = batch.parseArgs(['--pool', file, '--pairs', gateway.id]);
    assert.throws(() => batch.buildConfig(selectedArgs, {pairs: [testPool.pairs[1]]}), missing,
      'overridden pairs must be validated even when the selected pool pair is valid');
    assert.throws(() => batch.buildConfig(selectedArgs, {setFiles: []}), /have no definition in the loaded sets/,
      'overridden sets must supply the selected decks');
    assert.deepStrictEqual(batch.buildConfig(batch.parseArgs(['--pool', file]), {pairs: [gateway]}).pairs,
      [gateway], 'valid overrides replace invalid pool pairs before validation');
    assert.throws(() => game({corpFile: invalidFile}), missing,
      'direct headless games also explain missing definitions');
    const result = cli(['--pool', file, '--seeds', '1-1']);
    assert.strictEqual(result.status, 2, result.out);
    assert.match(result.out, missing);
    assert.ok(!/games,/.test(result.out), 'validation happens before batch progress');
    const selected = batch.buildConfig(batch.parseArgs(['--pool', file, '--pairs', gateway.id]));
    assert.deepStrictEqual(selected.pairs, [gateway], 'unselected missing decks do not block a batch');
    fs.writeFileSync(file, JSON.stringify(Object.assign({}, pool, {pairs: [gateway, gateway]})));
    assert.throws(() => batch.loadPool(file), /Duplicate deck pair id in pool: gateway/);
  });

  await scenario('CLI value options require operands, including both comparison reports', () => {
    for (const option of ['--budget', '--pool', '--games', '--seeds', '--pairs', '--jobs', '--timeout', '--out',
      '--side', '--start', '--start-tag', '--corp-option', '--runner-option', '--collector', '--guard',
      '--improve', '--better', '--max', '--compare']) {
      for (const suffix of [[], ['--quick']]) {
        assert.throws(() => batch.parseArgs([option, ...suffix]), new RegExp(option + ' needs an operand'));
      }
    }
    for (const suffix of [[], ['--quick']]) {
      assert.throws(() => batch.parseArgs(['--compare', 'baseline.json', ...suffix]), /--compare needs an operand/);
    }
    const parsed = batch.parseArgs(['--compare', 'baseline.json', 'candidate.json', '--budget', '1400',
      '--start-tag', 'hosted-card-on-ice', '--start-tag', 'unrezzed-ice']);
    assert.deepStrictEqual(parsed.compare, ['baseline.json', 'candidate.json']);
    assert.strictEqual(parsed.budget, '1400');
    assert.deepStrictEqual(parsed.startTag, ['hosted-card-on-ice', 'unrezzed-ice']);
    const invalid = cli(['--budget']);
    assert.strictEqual(invalid.status, 2, invalid.out);
    assert.match(invalid.out, /--budget needs an operand/);
  });

  await scenario('replay diff distinguishes equal, changed and failed comparisons and cleans up', () => {
    const childProcess = require('child_process');
    const original = childProcess.spawnSync;
    let dir;
    try {
      for (const result of [
        {status: 0, stdout: ''}, {status: 1, stdout: '-baseline\n+candidate\n'},
        {status: null, error: new Error('spawn diff ENOENT')},
        {status: 2, stderr: 'cannot read file'}, {status: null, signal: 'SIGTERM'},
      ]) {
        childProcess.spawnSync = (command, args, options) => {
          assert.strictEqual(command, 'diff');
          assert.deepStrictEqual(args, ['-U2', 'baseline.log', 'candidate.log']);
          dir = options.cwd;
          assert.strictEqual(fs.readFileSync(path.join(dir, 'baseline.log'), 'utf8'), 'baseline\n');
          assert.strictEqual(fs.readFileSync(path.join(dir, 'candidate.log'), 'utf8'), 'candidate\n');
          return result;
        };
        if (result.status === 0 || result.status === 1) {
          assert.strictEqual(batch.diffLogs(['baseline'], ['candidate']),
            result.status === 0 ? 'Logs are identical.' : result.stdout);
        } else {
          assert.throws(() => batch.diffLogs(['baseline'], ['candidate']), /diff failed: (spawn diff ENOENT|cannot read file|signal SIGTERM)/);
        }
        assert.ok(!fs.existsSync(dir), 'temporary logs are removed even on failure');
      }
    } finally {
      childProcess.spawnSync = original;
    }
  });

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

  await scenario('worker exits with an outstanding job reject without publishing a report', async () => {
    // A preload intercepts the real worker's first dispatch, before playJob.
    // Seed 2 stays alive without replying: failure must also stop this sibling.
    for (const code of [0, 1]) {
      const preload = setupFile('worker-exit-' + code, `
        if (process.argv.includes('--worker')) {
          process.on('message', job => {
            if (job.seed === '1') process.exit(${code});
            else setInterval(() => {}, 1000);
          });
          process.on = function(name, listener) {
            if (name === 'message') return this;
            return require('events').EventEmitter.prototype.on.call(this, name, listener);
          };
        }
      `);
      const out = path.join(tmp, 'worker-exit-' + code + '.json');
      const r = cli(['--pairs', 'gateway', '--seeds', '1-3', '--jobs', '2', '--out', out],
        {NODE_OPTIONS: '--require ' + JSON.stringify(preload)});
      assert.strictEqual(r.status, 2, r.out);
      assert.match(r.out, /Worker exited before returning gateway seed 1/);
      assert.ok(!fs.existsSync(out), 'an incomplete report must not be published');
    }
  });

  await scenario('SIGSEGV retries the identical job once and rejects a repeated crash', () => {
    const baselineOut = path.join(tmp, 'retry-baseline.json');
    const args = ['--pairs', 'gateway', '--seeds', '1-3', '--jobs', '2'];
    const baseline = cli([...args, '--out', baselineOut]);
    assert.strictEqual(baseline.status, 0, baseline.out);
    for (const repeat of [false, true]) {
      const attempts = path.join(tmp, 'retry-attempts-' + repeat + '.jsonl');
      const preload = setupFile('worker-segv-' + repeat, `
        const fs = require('fs');
        const attempts = ${JSON.stringify(attempts)};
        if (process.argv.includes('--worker')) {
          process.prependListener('message', job => {
            if (job.seed !== '1') return;
            const first = !fs.existsSync(attempts);
            fs.appendFileSync(attempts, JSON.stringify(job) + '\\n');
            if (first || ${repeat}) process.exit(77);
          });
        } else {
          // Simulate a native signal in the parent without crashing Node itself.
          const cp = require('child_process');
          const fork = cp.fork;
          cp.fork = function(...args) {
            const child = fork.apply(this, args);
            const emit = child.emit;
            child.emit = function(event, ...values) {
              if (event === 'exit' && values[0] === 77) values = [null, 'SIGSEGV'];
              return emit.call(this, event, ...values);
            };
            return child;
          };
        }
      `);
      const out = path.join(tmp, 'worker-segv-' + repeat + '.json');
      const result = cli([...args, '--out', out], {NODE_OPTIONS: '--require ' + JSON.stringify(preload)});
      assert.match(result.out, /signal SIGSEGV\); retrying once in a fresh worker/);
      const dispatched = fs.readFileSync(attempts, 'utf8').trim().split('\n').map(JSON.parse);
      assert.strictEqual(dispatched.length, 2, 'at most one retry');
      assert.deepStrictEqual(dispatched[1], dispatched[0], 'retry preserves the entire job');
      if (repeat) {
        assert.strictEqual(result.status, 2, result.out);
        assert.match(result.out, /signal SIGSEGV\) after retry/);
        assert.ok(!fs.existsSync(out), 'a repeated crash must not publish an incomplete report');
      } else {
        assert.strictEqual(result.status, 0, result.out);
        assert.deepStrictEqual(stable(JSON.parse(fs.readFileSync(out, 'utf8'))).games,
          stable(JSON.parse(fs.readFileSync(baselineOut, 'utf8'))).games,
          'all games retain their seeded results, including completed sibling games');
      }
    }
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
    const r = cli(['--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--corp-option', TEST_OPTION + '=true', '--out', out]);
    assert.strictEqual(r.status, 0, r.out);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(report.options.corp[TEST_OPTION], true);
    const defaults = await game();
    assert.strictEqual(defaults.options.corp[TEST_OPTION], false, 'the option is off in other runs');
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
    // A gate fails when the option changed no game, even if every guard holds.
    const hashed = g => g.map(x => Object.assign({}, x, {logHash: 'h' + x.seed}));
    const inert = metrics.compareReports(report(hashed(games(0))), report(hashed(games(0))), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(inert.changedGames, 0);
    assert.strictEqual(inert.pass, false, 'an option that changed nothing cannot pass');
    assert.ok(inert.checks.some(c => c.kind === 'changed' && !c.pass && /no game differs/.test(c.why)));
    const changed = hashed(games(0)).map((x, i) => i === 3 ? Object.assign({}, x, {logHash: 'other'}) : x);
    const live = metrics.compareReports(report(hashed(games(0))), report(changed), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(live.changedGames, 1);
    assert.strictEqual(live.pass, true);
    assert.strictEqual(metrics.compareReports(report(hashed(games(0))), report(hashed(games(0)))).pass, null, 'no gate, no check');
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

  await scenario('5c. batch metrics bootstrap over games; --ceiling checks the candidate upper bound', async () => {
    const collector = {name: 'demo', samples: g => g.values, finishBatch: perGame => ({mean: [].concat(...perGame).reduce((a, b) => a + b, 0) /
      Math.max(1, [].concat(...perGame).length)}), batchResamples: 100};
    const games = Array.from({length: 30}, (_, i) => ({ok: true, samples: {demo: [i % 3 === 0 ? 1 : 0, 0]}}));
    const out = metrics.batchMetrics([collector], games);
    assert.strictEqual(out['demo.mean'].games, 30);
    assert.ok(out['demo.mean'].low <= out['demo.mean'].value && out['demo.mean'].value <= out['demo.mean'].high);
    assert.deepStrictEqual(metrics.batchMetrics([collector], games), out, 'seeded and reproducible');
    const report = value => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: [],
      batchMetrics: {'demo.mean': {value, low: value - 0.05, high: value + 0.05, games: 30}}});
    const spec = batch.gateSpec(batch.parseArgs(['--ceiling', 'demo.mean=0.10']));
    const fail = batch.applyCeilingChecks({checks: []}, report(0), report(0.2), spec.ceiling);
    assert.strictEqual(fail.pass, false);
    assert.ok(/upper bound 0.25/.test(fail.checks[0].why), fail.checks[0].why);
    assert.strictEqual(batch.applyCeilingChecks({checks: []}, report(0.2), report(0.04), spec.ceiling).pass, true);
    const missing = batch.applyCeilingChecks({checks: []}, report(0), {games: []}, spec.ceiling);
    assert.strictEqual(missing.checks[0].why, 'unknown batch metric');
  });

  await scenario('5d. posture collectors: violations, horizon locks and single-variable correlation', async () => {
    const perEpoch = require('../scripts/ai-batch/collectors/postureDecisionsPerEpoch');
    const locked = require('../scripts/ai-batch/collectors/postureLockedPastHorizon');
    const corr = require('../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
    const vars = (grip, turn) => ({turn, corpCredits: 5, runnerCredits: 5, gripSize: grip, hqSize: 5, rootCount: 1,
      iceCount: 1, deepestCentralIce: 1, corpPoints: 0, runnerPoints: 0});
    const events = [
      {type: 'posture', kind: 'bait', action: 'roll', cardId: 1, epoch: 2, postured: 1, isAgenda: 0, publicVars: vars(1, 2)},
      {type: 'posture', kind: 'bait', action: 'roll', cardId: 1, epoch: 2, postured: 0, isAgenda: 0, publicVars: vars(2, 2)},
      {type: 'posture', kind: 'bluff', action: 'roll', cardId: 2, epoch: 2, postured: 1, isAgenda: 1, publicVars: vars(3, 2)},
      {type: 'posture', kind: 'bait', action: 'reuse', cardId: 1, epoch: 3, corpTurn: 1, expired: 1, publicVars: vars(4, 3)},
      {type: 'posture', kind: 'bait', action: 'reuse', cardId: 1, epoch: 3, corpTurn: 0, expired: 0, publicVars: vars(4, 3)},
      {type: 'posture', kind: 'bluff', action: 'guard', cardId: 2, epoch: 3, publicVars: vars(9, 3)},
      {type: 'posture', kind: 'profile', action: 'profile', profile: {targetIce: 2, openingAdvances: 1, delayTurns: 0}, publicVars: vars(5, 1)},
    ];
    const state = {};
    for (const e of events) [perEpoch, locked, corr].forEach(c => c.onEvent(e, state));
    assert.deepStrictEqual(perEpoch.finish(state), {violations: 1, rolls: 3});
    assert.deepStrictEqual(locked.finish(state), {count: 1});
    assert.deepStrictEqual(corr.finish(state), {decisions: 4}, 'guard stops and reuses are excluded');
    assert.strictEqual(corr.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
    assert.strictEqual(corr.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
    assert.strictEqual(corr.spearman([1, 1, 1, 1], [1, 2, 3, 4]), null, 'a constant column has no correlation');
    // Posture tracking Grip size exactly is a perfect single-variable tell.
    const tell = Array.from({length: 40}, (_, i) => ({k: 'p', postured: i < 20 ? 1 : 0, isAgenda: 0,
      v: corr.VARIABLES.map(name => name === 'gripSize' ? i : 3)}));
    assert.ok(corr.finishBatch([tell]).max > 0.8);
    const fair = Array.from({length: 40}, (_, i) => ({k: 'p', postured: i % 2, isAgenda: 0,
      v: corr.VARIABLES.map(name => name === 'gripSize' ? Math.floor(i / 2) : 3)}));
    assert.ok(corr.finishBatch([fair]).max < 0.1, String(corr.finishBatch([fair]).max));
  });

  await scenario('5e. posture epochs: seeded games reproduce the same epoch sequence', async () => {
    const play = async () => {
      const seen = [];
      const g = await game({corpOptions: {postureEpochs: true}, onEvent: e => { if (e.type === 'posture') seen.push(e); }});
      return {g, seen};
    };
    const a = await play(), b = await play();
    assert.ok(a.seen.length > 0, 'the game reaches posture or profile decisions');
    assert.deepStrictEqual(a.seen, b.seen);
    assert.strictEqual(a.g.logHash, b.g.logHash);
    const perEpoch = require('../scripts/ai-batch/collectors/postureDecisionsPerEpoch');
    const locked = require('../scripts/ai-batch/collectors/postureLockedPastHorizon');
    const state = {};
    for (const e of a.seen) { perEpoch.onEvent(e, state); locked.onEvent(e, state); }
    assert.strictEqual(perEpoch.finish(state).violations, 0);
    assert.strictEqual(locked.finish(state).count, 0);
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

  await scenario('expanded directories and tagged starts each get one share of the budget', () => {
    const dir = path.join(root, 'tests/fixtures/ai-batch/starts');
    const tagged = batch.taggedStarts(['hosted-card-on-ice']);
    const onlyDirectory = batch.buildConfig(batch.parseArgs(['--start', dir, '--budget', '1400']));
    const overlap = batch.buildConfig(batch.parseArgs(['--start', dir, '--start-tag', 'hosted-card-on-ice', '--budget', '1400']));
    assert.ok(tagged.length, 'the tag selects a committed board');
    assert.deepStrictEqual(overlap.starts, onlyDirectory.starts, 'tag overlap does not duplicate expanded boards');
    assert.deepStrictEqual(overlap.seeds, onlyDirectory.seeds, 'budget allocation follows unique boards');
    const file = tagged[0];
    assert.strictEqual(batch.resolveStarts([file, path.relative(root, file)], overlap.poolInfo.ranges).length, 1,
      'relative and absolute paths resolve to the same file');
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
    const args = ['gate', '--pairs', 'gateway', '--seeds', '1-2', '--jobs', '2', '--corp-option', TEST_OPTION + '=true',
      '--guard', 'winRate=1'];
    const first = cli(args);
    assert.ok(/baseline: playing 2 games/.test(first.out) && /candidate: playing 2 games/.test(first.out), first.out);
    // The option never comes into play in these two games: the guard holds,
    // but a gate whose option changed nothing fails.
    assert.ok(/0 changed by the options/.test(first.out) && /PASS guard winRate/.test(first.out), first.out);
    assert.ok(/FAIL changed option effect/.test(first.out) && /Gate: failed/.test(first.out), first.out);
    assert.notStrictEqual(first.status, 0, first.out);
    const second = cli(args);
    assert.ok(/baseline: reusing/.test(second.out) && /candidate: reusing/.test(second.out), second.out);
    // Simulate an incomplete cached report written by the old worker lifecycle.
    const cached = fs.readdirSync(path.join(tmp, 'cache')).map(file => path.join(tmp, 'cache', file))
      .filter(file => file.endsWith('.json'));
    const baselineFile = cached.find(file => {
      const report = JSON.parse(fs.readFileSync(file, 'utf8'));
      return report.options.corp[TEST_OPTION] === false;
    });
    assert.ok(baselineFile, 'the baseline was cached');
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    baseline.games.pop();
    fs.writeFileSync(baselineFile, JSON.stringify(baseline));
    const repaired = cli(args);
    assert.ok(/baseline: playing 2 games/.test(repaired.out) && /candidate: reusing/.test(repaired.out), repaired.out);
    const quick = cli(['gate', '--pairs', 'gateway', '--quick', '--seeds', '1-2', '--jobs', '2', '--guard', 'winRate=1']);
    assert.ok(/indicative only/.test(quick.out), quick.out);
    assert.notStrictEqual(quick.status, 0, 'a quick run cannot pass a gate');
  });

  await scenario('replay plays the batch game with its full log, and --diff shows only differing lines', async () => {
    const out = path.join(tmp, 'replay-batch.json');
    assert.strictEqual(cli(['--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--out', out]).status, 0);
    const batchGame = JSON.parse(fs.readFileSync(out, 'utf8')).games[0];
    const one = cli(['replay', '--pairs', 'gateway', '--seeds', '1']);
    assert.strictEqual(one.status, 0, one.out);
    assert.ok(one.out.includes('logHash ' + batchGame.logHash), 'replay reproduces the batch game: ' + one.out.split('\n')[0]);
    assert.ok(one.out.split('\n').length > 50, 'the full log is printed');
    const same = cli(['replay', '--pairs', 'gateway', '--seeds', '1', '--diff']);
    assert.ok(/Logs are identical/.test(same.out), same.out.slice(0, 300));
    const bad = cli(['replay', '--pairs', 'gateway', '--seeds', '1-2']);
    assert.notStrictEqual(bad.status, 0);
  });

  await scenario('failed replays exit non-zero and retain diagnostics, including either diff side', () => {
    const source = readFixture(path.join(root, 'tests/fixtures/corp-decisions/corp-draw-ok-when-hq-secure.txt')).code;
    const file = path.join(tmp, 'failed-replay.txt');
    const args = ['replay', '--pairs', 'gateway', '--seeds', '1', '--start', file,
      '--corp-option', TEST_OPTION + '=true'];
    for (const [condition, diff] of [
      ['true', false], ['corp.AI.options.' + TEST_OPTION, true], ['!corp.AI.options.' + TEST_OPTION, true],
    ]) {
      fs.writeFileSync(file, source + '\nLog("replay log retained");\nif (' + condition + ') throw new Error("replay regression diagnostic");\n');
      const result = cli([...args, ...(diff ? ['--diff'] : [])]);
      assert.strictEqual(result.status, 1, result.out.slice(0, 500));
      assert.match(result.out, /replay regression diagnostic/, 'fixture errors remain available');
      assert.ok(result.out.includes(diff ? 'candidate:' : 'game:'), 'game summary remains available');
      if (diff) {
        const summaries = result.out.split('\n').slice(0, 2);
        assert.match(summaries[0], /baseline \(options off\):/);
        const baselineFails = condition.startsWith('!');
        assert.strictEqual(summaries[0].includes('errors:'), baselineFails, 'only the intended baseline fails');
        assert.strictEqual(summaries[1].includes('errors:'), !baselineFails, 'only the intended candidate fails');
      }
      else assert.ok(result.out.split('\n').slice(1).includes('replay log retained'), 'the diagnostic log is printed after the summary');
    }
    const timeout = cli(['replay', '--pairs', 'gateway', '--seeds', '1', '--timeout', '0.001']);
    assert.strictEqual(timeout.status, 1, timeout.out.slice(0, 500));
    assert.match(timeout.out, /no winner \(timeout/);
  });

  fs.rmSync(tmp, {recursive: true, force: true});
  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`ai-batch: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`ai-batch: ${passed} scenarios passed`);
})();
