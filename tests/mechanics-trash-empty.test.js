// Run with: node tests/mechanics-trash-empty.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const logs = [];
const context = {
  console: {log() {}, warn() {}, error() {}},
  Log(message) {
    logs.push(message);
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'),
  context,
  {filename: 'mechanics.js'},
);

const callbackContext = {name: 'continuation owner'};
const emptyCards = [];
let callbackCalls = 0;
context.Trash(
  emptyCards,
  false,
  function (cardsTrashed) {
    callbackCalls++;
    assert.strictEqual(this, callbackContext);
    assert.strictEqual(cardsTrashed, emptyCards);
  },
  callbackContext,
);

assert.strictEqual(callbackCalls, 1, 'empty trash invokes its continuation once');
assert.deepStrictEqual(logs, ['No cards trashed']);

console.log('Empty-trash continuation regression test passed.');
