'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const corp = {creditPool: 5, HQ: {cards: []}, RnD: {cards: []}};
const context = {
  console,
  corp,
  runner: {},
  GetTitle: card => card.title,
  RezCost: card => card.rezCost || 0,
  CheckSubType: (card, subtype) => (card.subTypes || []).includes(subtype),
  AllCards: player => player === corp ? corp.HQ.cards.concat(corp.RnD.cards) : [],
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;

const ice = rezCost => ({title: 'Test ice', cardType: 'ice', rezCost});
const economy = () => ({title: 'Test transaction', cardType: 'operation', subTypes: ['Transaction']});
const agenda = () => ({title: 'Test agenda', cardType: 'agenda'});
const filler = () => ({title: 'Test utility', cardType: 'operation'});

const strongHand = [ice(2), economy(), economy(), economy(), agenda()];
corp.HQ.cards = strongHand;
corp.RnD.cards = Array.from({length: 40}, filler);
assert.strictEqual(ai.Phase_Mulligan(['m', 'n']), 1,
  'a one-ICE hand with strong economy should beat a weak fresh-five expectation');

const weakHand = Array.from({length: 5}, filler);
corp.HQ.cards = weakHand;
corp.RnD.cards = [
  ...Array.from({length: 12}, () => ice(2)),
  ...Array.from({length: 12}, economy),
  ...Array.from({length: 16}, filler),
];
assert.strictEqual(ai.Phase_Mulligan(['m', 'n']), 0,
  'a weak hand should mulligan when the deck offers a better fresh five');

assert.ok(
  ai._openingHandScore([ice(1), filler(), filler(), filler(), filler()]) >
    ai._openingHandScore([ice(8), filler(), filler(), filler(), filler()]),
  'cheap opening ICE should be worth more than unaffordable ICE',
);
assert.ok(
  ai._openingHandScore([ice(2), ice(2), agenda(), agenda(), agenda()]) <
    ai._openingHandScore([ice(2), ice(2), agenda(), filler(), filler()]),
  'agenda flood should reduce opening-hand value',
);

console.log('PASS corp mulligan evaluation');
