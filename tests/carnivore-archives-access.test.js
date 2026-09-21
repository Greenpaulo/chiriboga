// Run with: node tests/carnivore-archives-access.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const checksSource = fs.readFileSync(path.join(root, 'checks.js'), 'utf8');
const gatewaySource = fs.readFileSync(
  path.join(root, 'sets', 'systemgateway.js'),
  'utf8',
);

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'Could not find ' + name);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0)
      return source.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const carnivoreStart = gatewaySource.indexOf('cardSet[30003] = {');
const carnivoreEnd = gatewaySource.indexOf('cardSet[30004] = {', carnivoreStart);
assert(carnivoreStart >= 0 && carnivoreEnd > carnivoreStart, 'Could not extract Carnivore');

const corp = { archives: { cards: [] } };
const runner = { grip: [{ title: 'Grip card 1' }, { title: 'Grip card 2' }], AI: null };
const context = {
  cardSet: [],
  corp,
  runner,
  activePlayer: runner,
  accessingCard: null,
  checkedAccess: false,
  CardEffectsForbid: () => false,
  PlayerHand: player => player.grip,
  ChoicesArrayCards: cards => cards.map(card => ({ card })),
  Trash() {},
  TrashAccessedCard() {},
};
vm.createContext(context);
vm.runInContext(extractFunction(checksSource, 'CheckAccessing'), context);
vm.runInContext(extractFunction(checksSource, 'CheckTrash'), context);
vm.runInContext(gatewaySource.slice(carnivoreStart, carnivoreEnd), context);

const carnivore = context.cardSet[30003];
const ability = carnivore.abilities[0];
const archivedCard = { title: 'Archived asset', cardLocation: corp.archives.cards };
corp.archives.cards.push(archivedCard);
context.accessingCard = archivedCard;

assert.strictEqual(
  vm.runInContext('CheckTrash(accessingCard)', context),
  false,
  'cards already in Archives cannot be trashed',
);
assert.strictEqual(
  ability.Enumerate.call(carnivore).length,
  0,
  'Carnivore must not be offered while accessing a card in Archives',
);

const installedCard = { title: 'Installed upgrade', cardLocation: [] };
context.accessingCard = installedCard;
assert.strictEqual(
  ability.Enumerate.call(carnivore).length,
  2,
  'Carnivore must remain available on a trashable accessed card when its cost can be paid',
);

console.log('3 Carnivore Archives-access regression cases passed.');
