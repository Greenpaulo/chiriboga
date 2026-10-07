// Run with: node tests/run-calculator-cleanup.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const context = vm.createContext({Strength: card => card.strength, setTimeout});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../runcalculator.js'), 'utf8') + '\nthis.RunCalculator = RunCalculator;', context);

// Isolate the calculation lifetime from board setup. Each failure happens after
// a real strength read has populated the cache; direct reads must then refresh.
async function check(method, stage) {
  const rc = new context.RunCalculator();
  const card = {strength: 2};
  const failure = new Error('hook failure');
  let attempts = 0;
  rc.CalculatePieceBegin = data => {
    attempts++;
    rc.precalculated.cardStrengths = new Map();
    rc._calculationActive = true;
    assert.strictEqual(rc._baseStrength(card), 2);
    rc.paths = [];
    if (stage === 'begin' || (stage === 'fallback' && attempts === 2) ||
        (stage === 'damage fallback' && attempts === 3)) throw failure;
    return Object.assign(data, {doInnerLoop: true, todo: [1], num_loops_left: 1});
  };
  rc.CalculatePieceMiddle = data => {
    if (stage === 'middle') throw failure;
    data.todo.pop();
  };
  rc.CalculatePieceEnd = () => {
    if (stage === 'end') throw failure;
    rc._calculationActive = false;
    if (!stage.includes('fallback')) rc.paths = ['completed'];
  };
  const calculate = () => rc[method]({}, 4, 5, 0, 3, 0, true);
  if (stage === 'success') {
    assert.deepStrictEqual(await calculate(), ['completed']);
  } else if (method === 'CalculateAsync') {
    await assert.rejects(calculate, error => error === failure);
  } else {
    assert.throws(calculate, error => error === failure);
  }
  assert.strictEqual(rc._calculationActive, false, method + ': ' + stage);
  card.strength = 7;
  assert.strictEqual(rc._baseStrength(card), 7, 'failed calculation must not leak cached strength');
  if (stage === 'fallback') assert.strictEqual(attempts, 2);
  if (stage === 'damage fallback') assert.strictEqual(attempts, 3);
}
(async () => {
  for (const method of ['Calculate', 'CalculateAsync']) {
    for (const stage of ['begin', 'middle', 'end', 'fallback', 'damage fallback', 'success']) {
      await check(method, stage);
    }
  }
  console.log('12 run-calculator cleanup cases passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
