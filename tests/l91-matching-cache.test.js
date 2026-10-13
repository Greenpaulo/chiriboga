// Matching work must have the same public-board lifetime as preferred-breaker work.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {}, corp = {};
let installed = [];
const context = {runner, corp, console, cardSet: [], setIdentifiers: [],
  attackedServer: null, approachIce: -1, encountering: false,
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

test('preferred choice retains the complete list and caller mutation cannot alter it', () => {
  let calls = 0;
  const make = cost => ({player: runner, cost, AIMatchingBreakerInstalled() { calls++; return this; }});
  const expensive = make(9), cheap = make(1);
  installed = [expensive, cheap];
  ai._hostedBreakerForIce = () => null;
  ai._estimateBreakCost = (target, breaker) => breaker.cost;
  const scope = ai._securityEvaluationContext(server);
  assert.strictEqual(ai._matchingBreakerForIce(ice, server, 0, scope), cheap);
  const list = ai._matchingBreakersForIce(ice, server, 0, scope);
  assert.deepStrictEqual(Array.from(list), [expensive, cheap]);
  list.splice(0, list.length, {});
  assert.deepStrictEqual(Array.from(ai._matchingBreakersForIce(ice, server, 0, scope)), [expensive, cheap]);
  assert.strictEqual(calls, 2);
});
test('nested hypothetical matching observes changed ability availability', () => {
  const breaker = {player: runner, AIMatchingBreakerInstalled() { return this; }};
  installed = [breaker];
  const scope = ai._securityEvaluationContext(server);
  assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, scope)[0], breaker);
  ai._withHypothetical(() => { breaker.disabled = true; }, () => {
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, scope).length, 0);
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, ai._securityEvaluationContext(server)).length, 0);
  }, () => { delete breaker.disabled; });
  assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, scope)[0], breaker);
  assert.strictEqual(ai._hypotheticalDepth, 0);
});
test('real Magnet ability suppression is refreshed for a new public board', () => {
  vm.runInContext(fs.readFileSync(path.join(root, 'sets/systemupdate2021.js'), 'utf8'), context);
  context.CheckCardType = (card, types) => types.includes(card.cardType);
  const magnet = Object.assign({}, context.cardSet[31044], {hostedCards: []});
  const breaker = {player: runner, cardType: 'program', AIMatchingBreakerInstalled() { return this; }};
  installed = [breaker];
  const original = context.CheckHasAbilities;
  context.CheckHasAbilities = card => magnet.modifyHasAbilities.Resolve.call(magnet, card);
  try {
    const before = ai._securityEvaluationContext(server);
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, before)[0], breaker);
    magnet.hostedCards.push(breaker);
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, ai._securityEvaluationContext(server)).length, 0);
    magnet.hostedCards.pop();
    assert.strictEqual(ai._matchingBreakersForIce(ice, server, 0, ai._securityEvaluationContext(server))[0], breaker);
  } finally { context.CheckHasAbilities = original; }
});
console.log('L9.1 matching cache: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
