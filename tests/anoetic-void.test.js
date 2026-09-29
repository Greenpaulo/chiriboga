// Run with: node tests/anoetic-void.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const corp = {HQ: {cards: []}, AI: null};
const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  corp,
  runner: {},
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'sets', 'systemgateway.js'), 'utf8'),
  context,
  {filename: 'systemgateway.js'},
);

const anoeticVoid = context.cardSet[30050];
let payments = 0;
let discardDecisions = 0;
context.BinaryDecision = (player, act, skip, title, card, activate) => {
  activate.call(card);
  return [{id: 0}, {id: 1}];
};
context.SpendCredits = (player, amount, doing, card, callback, callbackContext) => {
  payments++;
  callback.call(callbackContext);
};
context.ChoicesHandCards = (player) =>
  player.HQ.cards.map((card) => ({card}));
context.DecisionPhase = () => {
  discardDecisions++;
};

corp.HQ.cards = [{title: 'Only card'}];
anoeticVoid.responseOnApproachServer.Resolve.call(anoeticVoid);
assert.strictEqual(payments, 0, 'Anoetic Void cannot pay with fewer than two HQ cards');
assert.strictEqual(discardDecisions, 0, 'Anoetic Void does not open an impossible discard');

corp.HQ.cards = [{title: 'First card'}, {title: 'Second card'}];
anoeticVoid.responseOnApproachServer.Resolve.call(anoeticVoid);
assert.strictEqual(payments, 1, 'Anoetic Void pays when two HQ cards are available');
assert.strictEqual(discardDecisions, 1, 'Anoetic Void begins its legal discard flow');

console.log('2 Anoetic Void regression cases passed.');
