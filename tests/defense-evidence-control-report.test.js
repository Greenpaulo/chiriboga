'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const batch = require('../scripts/ai-batch');
const {runControlBatch, checkControlReport} = require('../scripts/ai-batch/defense-evidence');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'defense-control-report-'));
const output = path.join(directory, 'report.json');
const args = ['scripts/ai-batch.js', '--pairs', 'gateway', '--seeds', '1-2',
  '--collector', 'realizedIceByRootType', '--defense-observer', 'on', '--out', output];
const config = batch.buildConfig(batch.parseArgs(args.slice(1)));
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
function report() {
  return {kind: 'ai-batch-report', command: 'node ' + args.join(' '), createdAt: new Date().toISOString(),
    poolHash: config.poolInfo.hash, pairs: config.pairs.map(pair => pair.id), seeds: config.seeds,
    starts: [], collectors: config.collectorNames, defenseObserver: config.defenseObserver, failures: [],
    games: config.seeds.map(seed => ({fixtureId: null, deckPairId: 'gateway', seed, ok: true}))};
}
const saved = (alter, status) => () => {
  const value = report(); alter(value);
  fs.writeFileSync(output, JSON.stringify(value));
  return {status};
};
try {
  test('completed successful controls remain usable', () => {
    assert.strictEqual(runControlBatch(args, output, saved(() => {}, 0)).games.length, 2);
  });
  test('completed controls retain recorded game failures for calibration', () => {
    const value = runControlBatch(args, output, saved(r => {
      r.games[1].ok = false; r.games[1].reason = 'known stall';
      r.failures = [{deckPairId: 'gateway', seed: r.games[1].seed, reason: 'known stall'}];
    }, 1));
    assert.strictEqual(value.games.length, 2);
    assert.strictEqual(value.games[1].ok, false);
    assert.strictEqual(value.failures.length, 1);
  });
  test('missing, duplicate, stale and mismatched reports cannot pass as completed', () => {
    for (const alter of [r => r.games.pop(), r => r.games.push(r.games[0]),
      r => { r.createdAt = '2000-01-01T00:00:00Z'; }, r => { r.poolHash = 'wrong'; },
      r => { r.command = 'other command'; }, r => { r.games[0].ok = false; }])
      assert.throws(() => runControlBatch(args, output, saved(alter, 0)), /report|records/);
  });
  test('process errors and unexplained exit statuses still stop the run', () => {
    assert.throws(() => runControlBatch(args, output, () => ({status: 2})), /Batch exited 2/);
    assert.throws(() => runControlBatch(args, output, () => ({status: null, error: Error('timeout')})), /timeout/);
    assert.throws(() => runControlBatch(args, output, saved(() => {}, 1)), /inconsistent/);
  });
  test('loaded controls must match requested collectors, Corp options and samples', () => {
    const shape = require('../scripts/ai-batch/collectors/postureShapeByCardClass');
    const realized = require('../scripts/ai-batch/collectors/realizedIceByRootType');
    const reuseArgs = args.concat(['--collector', 'postureShapeByCardClass', '--corp-option', 'postureEpochs=true']);
    const reuseConfig = batch.buildConfig(batch.parseArgs(reuseArgs.slice(1)));
    const good = () => Object.assign(report(), {collectors: reuseConfig.collectorNames,
      options: {corp: {postureEpochs: true}, runner: {}},
      games: config.seeds.map(seed => ({fixtureId: null, deckPairId: 'gateway', seed, ok: true,
        samples: {realizedIceByRootType: {}, postureShapeByCardClass: {}}}))});
    const check = value => checkControlReport(reuseArgs, value, 'reused.json', [realized, shape]);
    check(good());
    for (const [alter, why] of [
      [r => { r.collectors = ['realizedIceByRootType']; }, /missing collector postureShapeByCardClass/],
      [r => { delete r.games[0].samples.postureShapeByCardClass; }, /without postureShapeByCardClass samples/],
      [r => { r.options.corp.postureEpochs = false; }, /Corp option postureEpochs=true not used/],
      [r => { r.defenseObserver = 'off'; }, /cohort or observer differs/],
      [r => { r.seeds = ['1']; }, /cohort or observer differs/]]) {
      const value = good(); alter(value);
      assert.throws(() => check(value), why);
    }
    // A failed game has no samples and is reported by calibration, not rejected here.
    const failedGame = good(); failedGame.games[0].ok = false; delete failedGame.games[0].samples;
    check(failedGame);
  });
} finally { fs.rmSync(directory, {recursive: true, force: true}); }
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
