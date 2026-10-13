// Matching work must have the same public-board lifetime as preferred-breaker work.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {}, corp = {};
let installed = [];
const context = {runner, corp, console,
  ActiveCards: () => installed,
  CheckHasAbilities: card => !card.disabled,
  CheckSubType: (card, type) => (card.subTypes || []).includes(type)};
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
const ai = vm.runInContext('new CorpAI()', context);
const ice = {subTypes: ['Barrier']}, server = {ice: [ice], root: []};
ai._effectiveIceSubtypes = card => card.subTypes;
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
for (const matches of [true, false]) test('repeated ' + (matches ? 'positive' : 'negative') + ' match uses one public-board scan', () => {
  let calls = 0;
  const breaker = {player: runner, AIMatchingBreakerInstalled(target, subtypes) {
    calls++;
    assert.strictEqual(target, ice);
    assert.deepStrictEqual(subtypes, ice.subTypes);
    return matches ? this : null;
  }};
  installed = [breaker];
  const scope = ai._securityEvaluationContext(server);
  const first = ai._matchingBreakersForIce(ice, server, 0, scope);
  const second = ai._matchingBreakersForIce(ice, server, 0, scope);
  assert.strictEqual(first.length, matches ? 1 : 0);
  assert.strictEqual(second.length, first.length);
  if (matches) assert.strictEqual(second[0], breaker);
  assert.strictEqual(calls, 1, 'same ICE and public board must not repeat matching hooks');
});
test('fresh contexts and uncached calls observe current public state', () => {
  let calls = 0;
  const breaker = {player: runner, AIMatchingBreakerInstalled() { calls++; return this; }};
  installed = [breaker];
  assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, ai._securityEvaluationContext(server)).length, 1);
  breaker.disabled = true;
  assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, ai._securityEvaluationContext(server)).length, 0);
  breaker.disabled = false;
  ai._matchingBreakersForIce(ice, server, 0, null);
  ai._matchingBreakersForIce(ice, server, 0, null);
  assert.strictEqual(calls, 3);
});
test('different ICE share public ability availability within one board context', () => {
  let checks = 0;
  const original = context.CheckHasAbilities;
  const breaker = {player: runner, AIMatchingBreakerInstalled() { return this; }};
  installed = [breaker];
  const scope = ai._securityEvaluationContext(server);
  context.CheckHasAbilities = card => { checks++; return original(card); };
  try {
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, scope)[0], breaker);
    const otherIce = {subTypes: ['Barrier']};
    assert.strictEqual(ai._matchingBreakersForIce(otherIce, server, 1, scope)[0], breaker);
    assert.strictEqual(checks, 1, 'ability availability is the same public board fact for both ICE');
  } finally { context.CheckHasAbilities = original; }
});
console.log('L9.1 repeated breaker matching: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
