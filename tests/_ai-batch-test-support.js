'use strict';
// Each test file gets fresh counters, fixtures and temporary files.
module.exports = async function run(define) {
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

  try {
    await define({
      assert,
      fs,
      os,
      path,
      spawnSync,
      playGame,
      readFixture,
      loadPrecon,
      metrics,
      batch,
      root,
      script,
      poolFile,
      pool,
      setFiles,
      ranges,
      tmp,
      verbose,
      scenario,
      gateway,
      TEST_OPTION,
      game,
      cli,
      stable,
      setupFile,
      RECORD,
      EXTRA_DRAW
    });
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`ai-batch: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exitCode = 1;
  } else console.log(`ai-batch: ${passed} scenarios passed`);
};
