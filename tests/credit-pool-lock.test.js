// Run with: node tests/credit-pool-lock.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runner = {side: 'runner', creditPool: 6, temporaryCredits: 1};
const corp = {side: 'corp', creditPool: 5};
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

console.log('Credit-pool lock regression test passed.');
