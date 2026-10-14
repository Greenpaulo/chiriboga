'use strict';
const assert = require('assert');
const {compareReports} = require('../scripts/ai-batch/metrics');
const correlation = require('../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');

// A pooled statistic must weight observations, rather than average game means.
const collector = {
  name: 'pooled', directions: {'pooled.mean': 'lower'},
  finishBatch: games => {
    const values = games.flat();
    return {mean: values.reduce((sum, value) => sum + value, 0) / values.length};
  },
};
const report = (values, name = 'pooled') => ({
  poolHash: 'synthetic', seeds: [1, 2], starts: [], collectors: [name],
  games: values.map((samples, i) => ({ok: true, deckPairId: 'pair', seed: i + 1,
    metrics: {}, samples: {[name]: samples}})),
});
let failures = 0;
function check(name, test) {
  try { test(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
check('pooled improvement uses paired samples', () => {
  const result = compareReports(report([[10], [10, 10, 10]]), report([[8], [8, 8, 8]]),
    {improve: ['pooled.mean']}, [collector]);
  assert.strictEqual(result.pass, true, 'a constant two-unit reduction must pass');
  const metric = result.batchMetrics['pooled.mean'];
  assert.strictEqual(metric.baseline, 10);
  assert.strictEqual(metric.candidate, 8);
  assert.strictEqual(metric.difference, -2);
  assert.strictEqual(metric.low, -2);
  assert.strictEqual(metric.high, -2);
});
check('guard excludes failed and unmatched games symmetrically', () => {
  const baseline = report([[10], [10]]), candidate = report([[9], [9]]);
  baseline.games.push({ok: true, deckPairId: 'pair', seed: 3, metrics: {}, samples: {pooled: [100]}});
  candidate.games[1].ok = false;
  const result = compareReports(baseline, candidate, {guard: {'pooled.mean': 0.1}}, [collector]);
  assert.strictEqual(result.droppedGames, 2, 'count failed pair and baseline-only game');
  assert.strictEqual(result.pass, true);
  assert.strictEqual(result.batchMetrics['pooled.mean'].difference, -1);
});
check('constant correlation columns are explicitly invalid', () => {
  const rows = Array.from({length: 6}, () => ({k: 'p', postured: 1, isAgenda: 0,
    v: correlation.VARIABLES.map(() => 1)}));
  assert.strictEqual(typeof correlation.validateBatch, 'function', 'collector must declare validity');
  assert.notStrictEqual(correlation.validateBatch([rows]), true, 'undefined correlation cannot validate');
});
console.log(`F11 paired pooled metric guards: ${3 - failures}/3 passed`);
process.exitCode = failures ? 1 : 0;
