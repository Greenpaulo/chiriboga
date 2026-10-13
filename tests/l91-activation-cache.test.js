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
const rc = {StrModify: (card, target, point) => point};
ai._securityIceAI = () => ({subTypes: ['Barrier']});
ai._effectiveIceSubtypes = () => ['Barrier'];
ai._securityCardStrength = breaker => breaker.strength;
ai._effectiveIceStrength = target => target.strength;
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}

function evaluation() { return {breakerPrices: new Map(), runCalculator: rc}; }
function install(breaker, extras = []) { context.ActiveCards = () => [breaker, ice].concat(extras); }
function price(breaker, count, scope) { return ai._breakerPrice(ice, breaker, count, server, 0, scope); }
function standard(declare) {
  return {strength: 1, AIImplementBreaker(calculator, result, point, target, strength, wall, iceStrength) {
    return declare.call(this, calculator, point, strength, wall, iceStrength);
  }};
}
test('every count considers all activation alternatives', () => {
  let calls = 0;
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    calls++;
    calculator.ImplementIcebreaker(point, this, 3, wall, iceStrength, ['Barrier'], 0, 1, 3, 1);
    return calculator.ImplementIcebreaker(point, this, strength, wall, iceStrength, ['Barrier'], 2, 1, 1, 2);
  });
  install(breaker);
  const scope = evaluation();
  assert.strictEqual(price(breaker, 1, scope).credits, 3);
  assert.strictEqual(price(breaker, 4, scope).credits, 6);
  assert.strictEqual(price(breaker, 3, scope).credits, 6);
  assert.strictEqual(calls, 1);
});
test('uncached calls and fresh contexts see changed public strength', () => {
  let calls = 0;
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    calls++;
    return calculator.ImplementIcebreaker(point, this, strength, wall, iceStrength, ['Barrier'], 2, 1, 3, 2);
  });
  install(breaker);
  ai._securityRunCalculator = () => rc;
  assert.strictEqual(price(breaker, 1, evaluation()).credits, 7);
  breaker.strength = 3;
  assert.strictEqual(price(breaker, 3, evaluation()).credits, 6);
  assert.strictEqual(price(breaker, 1, null).credits, 3);
  assert.strictEqual(price(breaker, 3, null).credits, 6);
  assert.strictEqual(calls, 4);
});
test('nested hypothetical context observes and restores its own board', () => {
  let calls = 0;
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    calls++;
    return calculator.ImplementIcebreaker(point, this, 3, wall, iceStrength, ['Barrier'], 0, 1, runner.creditPool, 1);
  });
  install(breaker);
  const scope = evaluation();
  assert.strictEqual(price(breaker, 1, scope).credits, 10);
  ai._withHypothetical(() => { runner.creditPool = 4; }, () => {
    const nested = evaluation();
    assert.strictEqual(price(breaker, 2, nested).credits, 8);
    assert.strictEqual(price(breaker, 3, nested).credits, 12);
    // Even accidental reuse of the outer context must not share observations
    // across hypothetical depth for a previously unpriced count.
    assert.strictEqual(price(breaker, 4, scope).credits, 16);
    assert.strictEqual(runner.creditPool, 4);
  }, () => { runner.creditPool = 10; });
  assert.strictEqual(price(breaker, 5, scope).credits, 50);
  assert.strictEqual(calls, 4);
  assert.strictEqual(ai._hypotheticalDepth, 0);
});
test('throwing activation is retried and leaves calculator methods intact', () => {
  let calls = 0;
  const originalModify = Object.getOwnPropertyDescriptor(rc, 'StrModify');
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    calls++;
    runner.clickTracker = 0;
    if (calls === 1) throw Error('probe failed');
    return calculator.ImplementIcebreaker(point, this, 3, wall, iceStrength, ['Barrier'], 0, 1, 1, 1);
  });
  install(breaker);
  const scope = evaluation();
  assert.strictEqual(price(breaker, 1, scope).status, 'unknown');
  assert.strictEqual(price(breaker, 2, scope).credits, 2);
  assert.strictEqual(calls, 2);
  assert.strictEqual(runner.clickTracker, 4);
  assert.deepStrictEqual(Object.getOwnPropertyDescriptor(rc, 'StrModify'), originalModify);
  assert.strictEqual(Object.hasOwn(rc, 'ImplementIcebreaker'), false);
});
for (const kind of ['malformed', 'incompatible', 'silent', 'witness']) test(kind + ' retains classification and witness for another count', () => {
  let calls = 0;
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    calls++;
    if (kind === 'silent') return [];
    if (kind === 'witness') return [calculator.StrModify(this, ice, point, -1)];
    return calculator.ImplementIcebreaker(point, this, 3, wall, iceStrength,
      kind === 'incompatible' ? ['Sentry'] : ['Barrier'], 0, 1,
      kind === 'malformed' ? NaN : 1, 1);
  });
  install(breaker);
  const scope = evaluation();
  const first = price(breaker, 1, scope), next = price(breaker, 3, scope);
  assert.strictEqual(first.status, kind === 'incompatible' ? 'incapable' : 'unknown');
  assert.strictEqual(next.status, first.status);
  assert.strictEqual(next.fullRouteSupported, kind === 'witness');
  assert.strictEqual(calls, 1);
});
test('descriptor snapshots preserve symbols, accessors and property flags', () => {
  let reads = 0;
  const symbol = Symbol('counter');
  const spectator = {};
  Object.defineProperty(spectator, 'unread', {get() { reads++; return 99; }, configurable: true});
  Object.defineProperty(spectator, 'signedZero', {value: -0, writable: false, configurable: true});
  Object.defineProperty(spectator, symbol, {value: 3, enumerable: false, configurable: true});
  const before = Object.getOwnPropertyDescriptors(spectator);
  const breaker = standard(function(calculator, point, strength, wall, iceStrength) {
    Object.defineProperty(spectator, 'unread', {value: 0, configurable: true});
    delete spectator.signedZero;
    Object.defineProperty(spectator, symbol, {value: 0, configurable: true});
    spectator.extra = true;
    context.encountering = true; context.approachIce = 99;
    return calculator.ImplementIcebreaker(point, this, 3, wall, iceStrength, ['Barrier'], 0, 1, 1, 1);
  });
  install(breaker, [spectator]);
  const scope = evaluation();
  assert.strictEqual(price(breaker, 1, scope).credits, 1);
  assert.strictEqual(price(breaker, 2, scope).credits, 2);
  assert.deepStrictEqual(Object.getOwnPropertyDescriptors(spectator), before);
  assert.strictEqual(reads, 0);
  assert.strictEqual(context.encountering, false);
  assert.strictEqual(context.approachIce, -1);
});
test('hook accessors run inside the restoring guard for each count', () => {
  const breaker = {strength: 3};
  const activation = function(calculator, result, point, target, strength, wall, iceStrength) {
    return calculator.ImplementIcebreaker(point, this, strength, wall, iceStrength,
      ['Barrier'], 0, 1, 1, 1);
  };
  Object.defineProperty(breaker, 'AIImplementBreaker', {get() {
    assert.ok(ai._hypotheticalDepth > 0);
    runner.creditPool = 0;
    return activation;
  }, configurable: true});
  install(breaker);
  const scope = evaluation();
  assert.strictEqual(price(breaker, 1, scope).credits, 1);
  assert.strictEqual(price(breaker, 2, scope).credits, 2);
  assert.strictEqual(runner.creditPool, 10);
});
for (const throwing of [false, true]) test('fresh descriptor guard restores all own keys, throwing=' + throwing, () => {
  const symbol = Symbol('introduced');
  const target = {counter: 3};
  let reads = 0;
  Object.defineProperty(target, 'hidden', {value: -0, configurable: true});
  Object.defineProperty(target, 'unread', {get() { reads++; return 7; }, configurable: true});
  const before = Object.getOwnPropertyDescriptors(target);
  context.ActiveCards = () => [target, ice];
  const evaluate = () => {
    delete target.hidden;
    Object.defineProperty(target, 'counter', {value: 0, writable: false});
    Object.defineProperty(target, 'unread', {value: 0, configurable: true});
    Object.defineProperty(target, 'introducedHidden', {value: 1, configurable: true});
    target[symbol] = 1;
    runner.creditPool = 4;
    // Nested probes must snapshot the temporary board freshly, then restore it.
    ai._withBreakerPricingState(runner, ice, server, () => {
      assert.strictEqual(runner.creditPool, 4);
      runner.creditPool = 0;
    });
    assert.strictEqual(runner.creditPool, 4);
    if (throwing) throw Error('guard failure');
    return 'route result';
  };
  if (throwing) assert.throws(() => ai._withBreakerPricingState(runner, ice, server, evaluate), /guard failure/);
  else assert.strictEqual(ai._withBreakerPricingState(runner, ice, server, evaluate), 'route result');
  assert.deepStrictEqual(Object.getOwnPropertyDescriptors(target), before);
  assert.strictEqual(runner.creditPool, 10);
  assert.strictEqual(reads, 0);
  assert.strictEqual(ai._hypotheticalDepth, 0);
});
console.log('L9.1 activation cache: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
