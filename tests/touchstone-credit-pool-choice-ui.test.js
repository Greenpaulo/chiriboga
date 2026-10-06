// Run with: node tests/touchstone-credit-pool-choice-ui.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runner = {side: 'runner', creditPool: 2, temporaryCredits: 0, AI: null};
const corp = {side: 'corp', creditPool: 5, AI: {}};
const context = {
  console: {log() {}, warn() {}, error() {}},
  runner,
  corp,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'), context);

const touchstone = {
  title: 'Touchstone',
  credits: 1,
  canUseCredits() {
    return true;
  },
};
let paymentDecision = null;
context.ActiveCards = () => [touchstone];
context.CreditPoolCanBeUsed = () => true;
context.DecisionPhase = (player, choices) => {
  paymentDecision = {player, choices};
};
context.GetTitle = (card) => card.title;
context.UpdateCounters = () => {};
context.Log = () => {};
context.LogError = () => {};
context.PlayerName = (player) => player.side;

context.SpendCredits(runner, 2, 'using', {});

const poolChoice = paymentDecision.choices.find((choice) => choice.card === null);
assert(poolChoice, 'the credit pool is a legal payment option');
assert.strictEqual(
  poolChoice.num,
  1,
  'the pool contributes one credit at a time so payment can be split between sources',
);
assert.strictEqual(
  poolChoice.button,
  'Spend 1[c] from pool',
  'the pool option is rendered as a footer button with the credit symbol',
);

console.log('Touchstone credit-pool UI reproduction passed.');
