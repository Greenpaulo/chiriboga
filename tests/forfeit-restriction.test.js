// Run with: node tests/forfeit-restriction.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const corp = {scoreArea: [], creditPool: 5};
const runner = {scoreArea: []};
const removedFromGame = [];
const logs = [];

const context = {
  console: {log() {}, error() {}},
  corp,
  runner,
  removedFromGame,
  activePlayer: corp,
  ChoicesArrayCards(cards, check) {
    return cards
      .filter((card) => !check || check(card))
      .map((card) => ({card, label: card.title}));
  },
  GetTitle(card) {
    return card.title;
  },
  Log(message) {
    logs.push(message);
  },
  TriggeredResponsePhase(player, hook, args, callback) {
    callback();
  },
  MoveCard(card, destination) {
    const index = card.cardLocation.indexOf(card);
    if (index > -1) card.cardLocation.splice(index, 1);
    destination.push(card);
    card.cardLocation = destination;
  },
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'utility.js'), 'utf8'),
  context,
  {filename: 'utility.js'},
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'),
  context,
  {filename: 'mechanics.js'},
);

// Replace display-aware production helpers with deterministic test versions.
context.GetTitle = (card) => card.title;
context.Log = (message) => logs.push(message);
context.ChoicesArrayCards = (cards, check) =>
  cards
    .filter((card) => !check || check(card))
    .map((card) => ({card, label: card.title}));
context.MoveCard = (card, destination) => {
  const index = card.cardLocation.indexOf(card);
  if (index > -1) card.cardLocation.splice(index, 1);
  destination.push(card);
  card.cardLocation = destination;
};
context.TriggeredResponsePhase = (player, hook, args, callback) => callback();

const penalty = {
  title: 'Word on the Street',
  agendaPoints: -1,
  cannotForfeit: true,
  cardLocation: corp.scoreArea,
};
const agenda = {
  title: 'Ordinary agenda',
  agendaPoints: 1,
  cardLocation: corp.scoreArea,
};
corp.scoreArea.push(penalty, agenda);

assert.deepStrictEqual(
  Array.from(context.ChoicesForfeitableAgendas(corp), (choice) => choice.card.title),
  ['Ordinary agenda'],
  'forfeit choices exclude cards that cannot be forfeited',
);

let result = null;
assert.strictEqual(
  context.Forfeit(penalty, (wasForfeited) => {
    result = wasForfeited;
  }),
  false,
);
assert.strictEqual(result, null, 'a rejected forfeit does not continue its effect');
assert(corp.scoreArea.includes(penalty));
assert.strictEqual(removedFromGame.length, 0);

assert.strictEqual(
  context.Forfeit(agenda, (wasForfeited) => {
    result = wasForfeited;
  }),
  true,
);
assert.strictEqual(result, true);
assert(!corp.scoreArea.includes(agenda));
assert(removedFromGame.includes(agenda));

console.log('Forfeit restriction checks passed.');
