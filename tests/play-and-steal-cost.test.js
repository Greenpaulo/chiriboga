// Run with: node tests/play-and-steal-cost.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const runner = {side: 'runner', creditPool: 3, temporaryCredits: 0, clickTracker: 1};
const corp = {side: 'corp'};
const context = {
  console: {log() {}, warn() {}, error() {}},
  runner,
  corp,
  accessingCard: null,
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'utility.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'checks.js'), 'utf8'), context);

let modifiers = [];
context.ModifyingTriggers = (name, card, lowerLimit) => {
  let total = 0;
  for (const source of modifiers) {
    if (source[name]) total += source[name].Resolve.call(source, card);
  }
  return Math.max(lowerLimit === undefined ? -Infinity : lowerLimit, total);
};
context.ChoicesActiveTriggers = (name) =>
  modifiers.filter((card) => card[name]).map((card) => ({card}));
context.CheckSubType = (card, subtype) => card.subTypes.includes(subtype);
context.CardEffectsForbid = () => false;
context.CheckCredits = (player, amount) => player.creditPool >= amount;
context.CheckClicks = (player, amount) => player.clickTracker >= amount;

const doubleOperation = {cardType: 'operation', subTypes: ['Double']};
assert.strictEqual(context.PlayClickCost(doubleOperation), 2);
modifiers = [
  {
    modifyPlayClickCost: {
      Resolve(card) {
        return card === doubleOperation ? -1 : 0;
      },
    },
  },
];
assert.strictEqual(context.PlayClickCost(doubleOperation), 1);
modifiers.push({modifyPlayClickCost: {Resolve: () => -5}});
assert.strictEqual(context.PlayClickCost(doubleOperation), 0, 'play click cost floors at 0');

const agenda = {cardType: 'agenda', stealCost: {clicks: 1}};
context.accessingCard = agenda;
modifiers = [
  {
    modifyStealCost: {
      Resolve(card) {
        return card === agenda ? {credits: 3} : null;
      },
    },
  },
];
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.StealCost(agenda))),
  {credits: 3, clicks: 1},
);
assert.strictEqual(context.CheckSteal(), true);
runner.clickTracker = 0;
assert.strictEqual(context.CheckSteal(), false, 'steal is unavailable without required clicks');
runner.clickTracker = 1;
runner.creditPool = 2;
assert.strictEqual(context.CheckSteal(), false, 'steal is unavailable without required credits');

const phaseSource = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
assert(
  phaseSource.includes('SpendClicks(corp, PlayClickCost(params.card))') &&
    phaseSource.includes('SpendClicks(runner, PlayClickCost(params.card))'),
  'basic play actions spend the computed click cost',
);
assert(
  phaseSource.includes('var cost = StealCost(agenda)') &&
    phaseSource.includes('SpendClicks(runner, cost.clicks)'),
  'access resolution pays additional steal costs',
);

console.log('Play-click and steal-cost regression checks passed.');
