'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
let failures = 0;
const collectorPath = path.resolve(__dirname, '../scripts/ai-batch/collectors/realizedIceByRootType.js');
function check(name, test) {
  try { test(); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}
check('realized defense collector supplies four lower-direction pooled metrics', () => {
  assert.ok(fs.existsSync(collectorPath), 'realizedIceByRootType collector is missing');
  const collector = require(collectorPath);
  for (const metric of ['allCountCorrelation', 'posturedCountCorrelation', 'allCountDistance', 'posturedCountDistance'])
    assert.strictEqual(collector.directions[`realizedIceByRootType.${metric}`], 'lower');
  for (const method of ['onEvent', 'samples', 'finishBatch', 'validateBatch'])
    assert.strictEqual(typeof collector[method], 'function');
});
check('dedicated passive tracker is available without invoking security evaluation', () => {
  const headless = require('../scripts/ai-batch/headless');
  assert.strictEqual(typeof headless.createRealizedDefenseTracker, 'function', 'passive tracker is missing');
});
check('missing realized observations are explicitly invalid', () => {
  assert.ok(fs.existsSync(collectorPath), 'realizedIceByRootType collector is missing');
  assert.notStrictEqual(require(collectorPath).validateBatch([[], []]), true);
});
console.log(`F12 realized defense measurement: ${3 - failures}/3 passed`);
process.exitCode = failures ? 1 : 0;
