// Run with: node tests/flipped-identity.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const elevationSource = fs.readFileSync(path.join(root, 'sets/elevation.js'), 'utf8');

function extractCardDefinition(source, cardId) {
  const assignment = 'cardSet[' + cardId + '] = ';
  const start = source.indexOf(assignment);
  assert(start >= 0, 'Could not find card ' + cardId);
  const nextCard = source.indexOf('\ncardSet[', start + assignment.length);
  assert(nextCard > start, 'Could not find the end of card ' + cardId);
  return source.slice(start, nextCard);
}

const runner = {AI: null};
let installedMU = 4;
const loadedTextures = [];
const rewards = [];
const logs = [];
let renders = 0;
const context = {
  cardSet: [],
  runner,
  InstalledMemoryCost: () => installedMU,
  MemoryUnits: () => 4,
  cardRenderer: {
    LoadTexture(imagePath) {
      loadedTextures.push(imagePath);
      return {imagePath};
    },
  },
  Log: message => logs.push(message),
  GainCredits: (player, amount) => rewards.push({type: 'credits', player, amount}),
  Draw: (player, amount) => rewards.push({type: 'draw', player, amount}),
  Render: () => renders++,
};
vm.createContext(context);
vm.runInContext(extractCardDefinition(elevationSource, 35023), context);

const dewi = context.cardSet[35023];
let appliedFrontTexture = 0;
dewi.renderer = {
  frontTexture: null,
  loresTexture: null,
  dummy: {texture: null},
  SetTextureToFront() { appliedFrontTexture++; },
};

let choices = dewi.responseOnRunSuccessful.Enumerate.call(dewi);
assert.strictEqual(choices.length, 2, 'Side A should offer a flip when MU is full');
dewi.responseOnRunSuccessful.Resolve.call(dewi, choices[0]);
assert.strictEqual(dewi.flipped, true);
assert.deepStrictEqual(rewards[0], {type: 'credits', player: runner, amount: 1});

installedMU = 3;
choices = dewi.responseOnRunSuccessful.Enumerate.call(dewi);
assert.strictEqual(choices.length, 2, 'Side B should offer a flip when at least 1 MU is unused');
dewi.responseOnRunSuccessful.Resolve.call(dewi, choices[0]);
assert.strictEqual(dewi.flipped, false);
assert.deepStrictEqual(rewards[1], {type: 'draw', player: runner, amount: 1});
assert.strictEqual(appliedFrontTexture, 2);
assert.strictEqual(renders, 2);
assert.deepStrictEqual(logs, [
  'Dewi Subrotoputri flipped to Side B',
  'Dewi Subrotoputri flipped to Side A',
]);

console.log('Flipped-identity gameplay regressions passed.');
