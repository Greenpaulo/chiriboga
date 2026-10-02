'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
const start = source.indexOf('var activeTriggerCandidateCache');
const end = source.indexOf('/**', start);
assert.ok(start >= 0 && end > start, 'active-trigger helper source not found');

const corp = {};
const runner = {};
const corpCards = [];
const runnerCards = [];
let allCardsCalls = 0;
const context = {
  corp,
  runner,
  lingeringEffects: [],
  AllCards(player) {
    allCardsCalls++;
    return player === corp ? corpCards.slice() : runnerCards.slice();
  },
  CheckCallback(card, callbackName) {
    const callback = card[callbackName];
    return !!callback && (!!card.active || !!callback.availableWhenInactive);
  },
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, {filename: 'utility.js'});

const inactiveModifier = {
  modifyStrength: {Resolve() {}, availableWhenInactive: true},
};
const liveModifier = {modifyStrength: {Resolve() {}}, active: false};
corpCards.push(inactiveModifier);
runnerCards.push(liveModifier);

assert.strictEqual(context.ChoicesActiveTriggers('modifyStrength').length, 1);
assert.strictEqual(allCardsCalls, 2);
assert.strictEqual(context.ChoicesActiveTriggers('modifyStrength').length, 1);
assert.strictEqual(allCardsCalls, 2, 'modifier candidates should be reused');

liveModifier.active = true;
assert.strictEqual(
  context.ChoicesActiveTriggers('modifyStrength').length,
  2,
  'candidate activity must be checked live',
);

const newModifier = {modifyStrength: {Resolve() {}, availableWhenInactive: true}};
runnerCards.push(newModifier);
context.InvalidateActiveTriggerCandidateCache();
assert.strictEqual(context.ChoicesActiveTriggers('modifyStrength').length, 3);
assert.strictEqual(allCardsCalls, 4, 'invalidation should discover new modifier cards');

const responseCard = {responseOnRunEnds: {Resolve() {}}, active: true};
corpCards.push(responseCard);
const beforeResponses = allCardsCalls;
assert.strictEqual(context.ChoicesActiveTriggers('responseOnRunEnds').length, 1);
assert.strictEqual(context.ChoicesActiveTriggers('responseOnRunEnds').length, 1);
assert.strictEqual(
  allCardsCalls,
  beforeResponses + 4,
  'dynamic response callbacks must continue to scan current cards',
);

console.log('5 active-trigger candidate cache cases passed.');
