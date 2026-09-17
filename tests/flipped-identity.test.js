// Run with: node tests/flipped-identity.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const elevationSource = fs.readFileSync(path.join(root, 'sets/elevation.js'), 'utf8');
const reverseImagePath = path.join(root, 'images/35023-0.jpg');

function extractCardDefinition(source, cardId) {
  const assignment = 'cardSet[' + cardId + '] = ';
  const start = source.indexOf(assignment);
  assert(start >= 0, 'Could not find card ' + cardId);
  const nextCard = source.indexOf('\ncardSet[', start + assignment.length);
  assert(nextCard > start, 'Could not find the end of card ' + cardId);
  return source.slice(start, nextCard);
}

function jpegDimensions(buffer) {
  assert.strictEqual(buffer.readUInt16BE(0), 0xffd8, 'reverse identity art must be a JPEG');
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = buffer[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7)};
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) offset += 2;
    else offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  throw new Error('Could not read reverse identity art dimensions');
}

assert(fs.existsSync(reverseImagePath), 'Dewi reverse-side art must exist at the path used by the card');
assert.deepStrictEqual(jpegDimensions(fs.readFileSync(reverseImagePath)), {width: 300, height: 420});

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
assert.strictEqual(dewi.imageFile, '35023-0.jpg');
assert.strictEqual(loadedTextures[0], 'images/35023-0.jpg');
assert.strictEqual(dewi.renderer.frontTexture, dewi.renderer.loresTexture);
assert.strictEqual(dewi.renderer.dummy.texture, dewi.renderer.frontTexture);
assert.deepStrictEqual(rewards[0], {type: 'credits', player: runner, amount: 1});

installedMU = 3;
choices = dewi.responseOnRunSuccessful.Enumerate.call(dewi);
assert.strictEqual(choices.length, 2, 'Side B should offer a flip when at least 1 MU is unused');
dewi.responseOnRunSuccessful.Resolve.call(dewi, choices[0]);
assert.strictEqual(dewi.flipped, false);
assert.strictEqual(dewi.imageFile, '35023.jpg');
assert.strictEqual(loadedTextures[1], 'images/35023.jpg');
assert.deepStrictEqual(rewards[1], {type: 'draw', player: runner, amount: 1});
assert.strictEqual(appliedFrontTexture, 2);
assert.strictEqual(renders, 2);
assert.deepStrictEqual(logs, [
  'Dewi Subrotoputri flipped to Side B',
  'Dewi Subrotoputri flipped to Side A',
]);

console.log('15 flipped-identity regression cases passed.');
