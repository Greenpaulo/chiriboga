// Run with: node tests/credit-pool-lock.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runner = {side: 'runner', creditPool: 6, temporaryCredits: 1, AI: {}};
const corp = {side: 'corp', creditPool: 5, AI: {}};
const context = {
  console: {log() {}, warn() {}, error() {}},
  runner,
  corp,
  cardSet: [],
  setIdentifiers: [],
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'utility.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'checks.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'), context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'sets', 'elevation.js'), 'utf8'),
  context,
  {filename: 'elevation.js'},
);

const hostedSource = {
  credits: 4,
  canUseCredits() {
    return true;
  },
};
const poolLock = {
  preventCreditPoolUse(player, action) {
    return player === runner && (action === 'spend' || action === 'lose');
  },
};
context.ActiveCards = (player) =>
  player === runner ? [hostedSource, poolLock] : [];
context.UpdateCounters = () => {};
context.Log = () => {};
context.PlayerName = (player) => player.side;
context.GetTitle = () => 'hosted source';

assert.strictEqual(
  context.AvailableCredits(runner, 'using', {}),
  5,
  'locked pool is excluded while temporary and hosted credits remain available',
);
assert.strictEqual(context.CheckCredits(runner, 5, 'using', {}), true);
assert.strictEqual(context.CheckCredits(runner, 6, 'using', {}), false);

context.SpendCredits(runner, 5, 'using', {});
assert.strictEqual(runner.temporaryCredits, 0);
assert.strictEqual(hostedSource.credits, 0);
assert.strictEqual(runner.creditPool, 6, 'spending cannot touch a locked pool');

runner.temporaryCredits = 1;
assert.strictEqual(context.LoseCredits(runner, 3), 1);
assert.strictEqual(runner.temporaryCredits, 0);
assert.strictEqual(runner.creditPool, 6, 'credit loss cannot touch a locked pool');

hostedSource.credits = 3;
let brokenSubroutine = null;
context.Break = (subroutine) => {
  brokenSubroutine = subroutine;
};
const nPotSubroutine = {text: 'End the run'};
context.cardSet[35064].runnerAbilities[0].Resolve.call(
  context.cardSet[35064],
  {subroutine: nPotSubroutine},
);
assert.strictEqual(hostedSource.credits, 0, 'N-Pot uses eligible hosted credits');
assert.strictEqual(runner.creditPool, 6, 'N-Pot respects the locked pool');
assert.strictEqual(brokenSubroutine, nPotSubroutine);

context.ActiveCards = () => [];
context.SpendCredits(runner, 2);
assert.strictEqual(runner.creditPool, 4, 'ordinary pool spending is unchanged');
assert.strictEqual(context.LoseCredits(runner, 2), 2);
assert.strictEqual(runner.creditPool, 2, 'ordinary pool loss is unchanged');

const touchstone = {
  title: 'Touchstone',
  credits: 1,
  canUseCredits() {
    return true;
  },
};
const otherSource = {
  title: 'Other source',
  credits: 1,
  spent: 0,
  canUseCredits() {
    return true;
  },
  onCreditsSpent(amount) {
    this.spent += amount;
  },
};
context.GetTitle = (card) => card.title;
let paymentDecision = null;
context.DecisionPhase = (player, choices, callback, title, instruction) => {
  paymentDecision = {player, choices, callback, title, instruction};
  return paymentDecision;
};
runner.AI = null;
runner.temporaryCredits = 0;
runner.creditPool = 2;
context.ActiveCards = () => [touchstone];
let paymentsCompleted = 0;
context.SpendCredits(runner, 1, 'using', {}, () => paymentsCompleted++);
assert.strictEqual(touchstone.credits, 1, 'Touchstone is not spent before the choice');
assert.strictEqual(runner.creditPool, 2, 'the pool is not spent before the choice');
assert.strictEqual(paymentDecision.choices.length, 2, 'Touchstone and the pool are both offered');
paymentDecision.callback(paymentDecision.choices.find((choice) => choice.card === null));
assert.strictEqual(runner.creditPool, 1, 'the Runner can choose the credit pool');
assert.strictEqual(touchstone.credits, 1, 'choosing the pool preserves Touchstone');
assert.strictEqual(paymentsCompleted, 1, 'payment continuation runs after allocation');

runner.creditPool = 2;
paymentsCompleted = 0;
context.SpendCredits(runner, 1, 'using', {}, () => paymentsCompleted++);
paymentDecision.callback(paymentDecision.choices.find((choice) => choice.card === touchstone));
assert.strictEqual(touchstone.credits, 0, 'the Runner can choose Touchstone');
assert.strictEqual(runner.creditPool, 2, 'choosing Touchstone preserves the pool');
assert.strictEqual(paymentsCompleted, 1);

touchstone.credits = 1;
context.ActiveCards = () => [touchstone, otherSource];
context.SpendCredits(runner, 2, 'using', {});
assert(
  paymentDecision.choices.some((choice) => choice.card === touchstone) &&
    paymentDecision.choices.some((choice) => choice.card === otherSource) &&
    paymentDecision.choices.some((choice) => choice.card === null),
  'two hosted sources and the credit pool are separate initial options',
);
paymentDecision.callback(paymentDecision.choices.find((choice) => choice.card === touchstone));
assert(
  paymentDecision.choices.some((choice) => choice.card === otherSource) &&
    paymentDecision.choices.some((choice) => choice.card === null),
  'remaining payment can come from another hosted source or the pool',
);
paymentDecision.callback(paymentDecision.choices.find((choice) => choice.card === otherSource));
assert.strictEqual(otherSource.spent, 1, 'chosen hosted sources fire their callback');

touchstone.credits = 1;
paymentDecision = null;
context.ActiveCards = () => [touchstone, poolLock];
runner.creditPool = 3;
context.SpendCredits(runner, 1, 'using', {});
assert.strictEqual(paymentDecision, null, 'a forced single-source payment needs no prompt');
assert.strictEqual(runner.creditPool, 3, 'a locked pool is not used');
assert.strictEqual(touchstone.credits, 0, 'the only legal source pays automatically');

console.log('Credit-pool lock regression test passed.');
