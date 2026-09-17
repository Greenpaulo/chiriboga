// Run with: node tests/mycoweb-rez-discount.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const mechanicsSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
const elevationSource = fs.readFileSync(path.join(root, 'sets/elevation.js'), 'utf8');

function extractRez(source) {
  const start = source.indexOf('function Rez(');
  const nextFunction = source.indexOf('function RemoveFromGame(', start);
  const end = source.lastIndexOf('/**', nextFunction);
  assert(start >= 0 && end > start, 'Could not extract Rez');
  return source.slice(start, end);
}

const corp = {creditPool: 2, scoreArea: [], HQ: {cards: []}, AI: null};
const runner = {AI: null};
const spent = [];
const context = {
  console,
  corp,
  runner,
  playerTurn: runner,
  activePlayer: runner,
  currentPhase: {},
  PlaySound() {},
  RezCost: () => 4,
  SpendCredits(player, amount, doing, card, callback, callbackContext) {
    spent.push(amount);
    player.creditPool -= amount;
    callback.call(callbackContext);
  },
  GetTitle: card => card.title,
  Log() {},
  AutomaticTriggers() {},
  TriggeredResponsePhase(player, trigger, params, callback) { callback(); },
  CheckCardType: (card, types) => types.includes(card.cardType),
  InstalledCards: () => [],
};
vm.createContext(context);
vm.runInContext(extractRez(mechanicsSource), context);

const palisade = {
  title: 'Palisade',
  player: corp,
  cardType: 'ice',
  rezzed: false,
  renderer: {FaceUp() {}},
};
context.palisade = palisade;
vm.runInContext('Rez(palisade, false, null, null, true, 2)', context);

assert.deepStrictEqual(spent, [2], 'the discounted cost must be paid exactly once');
assert.strictEqual(corp.creditPool, 0);
assert.strictEqual(palisade.rezzed, true);
assert(
  elevationSource.includes('Rez(iceParams.card, false, null, null, true, 2);'),
  'Mycoweb must pass its reduction into the central Rez path',
);
console.log('4 Mycoweb discounted-rez regression cases passed.');
