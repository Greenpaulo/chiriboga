// Duplicate count-independent breaker work, without wall-clock assertions.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {creditPool: 10, clickTracker: 4};
const corp = {creditPool: 20};
const context = {runner, corp, console, attackedServer: null, approachIce: -1, encountering: false};
vm.createContext(context);
const source = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(source.slice(0, source.indexOf('//actual class')), context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
const ai = vm.runInContext('new CorpAI()', context);
const ice = {strength: 3};
const server = {ice: [ice], root: []};
context.GetServer = () => server;
const rc = {StrModify: point => point};
ai._securityIceAI = () => ({subTypes: ['Barrier']});
ai._effectiveIceSubtypes = () => ['Barrier'];
ai._securityCardStrength = breaker => breaker.strength;
ai._effectiveIceStrength = target => target.strength;
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
test('different counts reuse count-independent activation work and preserve state', () => {
  let calls = 0;
  const breaker = {strength: 1, AIImplementBreaker(calculator, result, point, target, strength, wall, iceStrength) {
    calls++;
    runner.creditPool = 0;
    this.accidentalField = true;
    return calculator.ImplementIcebreaker(point, this, strength, wall, iceStrength,
      ['Barrier'], 2, 1, 3, 2);
  }};
  context.ActiveCards = () => [breaker, ice];
  const evaluation = {breakerPrices: new Map(), runCalculator: rc};
  assert.strictEqual(ai._breakerPrice(ice, breaker, 1, server, 0, evaluation).credits, 7);
  assert.strictEqual(runner.creditPool, 10);
  assert.strictEqual('accidentalField' in breaker, false);
  assert.strictEqual(ai._breakerPrice(ice, breaker, 3, server, 0, evaluation).credits, 10);
  assert.strictEqual(runner.creditPool, 10);
  assert.strictEqual('accidentalField' in breaker, false);
  assert.strictEqual(context.attackedServer, null);
  assert.strictEqual(ai._hypotheticalDepth, 0);
  assert.strictEqual(calls, 1, 'identical activation inputs must not repeat the guarded hook for another count');
});
test('count-bearing hooks retain distinct count probes', () => {
  let calls = 0;
  const breaker = {AIBreakCost(target, count) { calls++; return {credits: count, clicks: 0}; }};
  context.ActiveCards = () => [breaker, ice];
  const evaluation = {breakerPrices: new Map(), runCalculator: rc};
  assert.strictEqual(ai._breakerPrice(ice, breaker, 1, server, 0, evaluation).credits, 1);
  assert.strictEqual(ai._breakerPrice(ice, breaker, 3, server, 0, evaluation).credits, 3);
  assert.strictEqual(calls, 2);
});
console.log('L9.1 count-independent pricing: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
