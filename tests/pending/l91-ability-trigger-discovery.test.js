// The engine predicate can reuse a caller's freshly collected modifier list.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
let discoveries = 0, modifiers = [];
const context = {console, ChoicesActiveTriggers(name) {
  assert.strictEqual(name, 'modifyHasAbilities');
  discoveries++;
  return modifiers.filter(card => card.active).map(card => ({card}));
}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'checks.js'), 'utf8'), context);
let passed = 0, failed = 0;
function test(name, body) {
  discoveries = 0; modifiers = [];
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
test('one fresh discovery serves a stable public-board batch', () => {
  modifiers = [{active: true, modifyHasAbilities: {Resolve(card) {return !card.blocked;}}}];
  const choices = context.ChoicesActiveTriggers('modifyHasAbilities');
  assert.strictEqual(context.CheckHasAbilities({blocked: false}, choices), true);
  assert.strictEqual(context.CheckHasAbilities({blocked: true}, choices), false);
  assert.strictEqual(context.CheckHasAbilities({blocked: false}, choices), true);
  assert.strictEqual(discoveries, 1, 'same synchronous board must not rediscover modifiers for every card');
});
test('ordinary one-argument callers always discover current modifiers', () => {
  const modifier = {active: true, modifyHasAbilities: {Resolve() {return false;}}};
  modifiers = [modifier];
  assert.strictEqual(context.CheckHasAbilities({}), false);
  modifier.active = false;
  assert.strictEqual(context.CheckHasAbilities({}), true);
  assert.strictEqual(discoveries, 2);
});
test('supplied choices preserve receiver, order and early rejection', () => {
  const calls = [];
  const first = {active: true, modifyHasAbilities: {Resolve(card) {
    assert.strictEqual(this, first); calls.push('first'); return !card.blocked;
  }}};
  const second = {active: true, modifyHasAbilities: {Resolve() {
    assert.strictEqual(this, second); calls.push('second'); return true;
  }}};
  modifiers = [first, second];
  const choices = context.ChoicesActiveTriggers('modifyHasAbilities');
  assert.strictEqual(context.CheckHasAbilities({blocked: true}, choices), false);
  assert.deepStrictEqual(calls, ['first']);
  calls.length = 0;
  assert.strictEqual(context.CheckHasAbilities({blocked: false}, choices), true);
  assert.deepStrictEqual(calls, ['first', 'second']);
});
console.log('L9.1 ability trigger discovery: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
