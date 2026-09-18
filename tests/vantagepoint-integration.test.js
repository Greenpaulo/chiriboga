// Run with: node tests/vantagepoint-integration.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const metadata = JSON.parse(
  fs.readFileSync(path.join(root, 'carddata', 'carddata.json'), 'utf8'),
).data.filter((card) => card.pack_code === 'vp');

assert.strictEqual(metadata.length, 66, 'Vantage Point metadata count');

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  runner: {side: 'runner'},
  corp: {side: 'corp'},
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'config.js'), 'utf8'),
  context,
  {filename: 'config.js'},
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'sets', 'vantagepoint.js'), 'utf8'),
  context,
  {filename: 'vantagepoint.js'},
);

const registry = context.setRegistry.availableSets.vantagepoint;
assert(registry, 'Vantage Point must be registered');
assert.strictEqual(registry.file, 'vantagepoint');
assert.strictEqual(registry.code, 'vp');
assert.deepStrictEqual(Array.from(registry.idRange), [36000, 36999]);
assert.strictEqual(registry.hidden, true, 'unfinished set must stay hidden');
assert.strictEqual(registry.untested, true, 'unfinished set must stay untested');
assert(context.setIdentifiers.includes('vp'), 'set identifier');

const metadataCodes = new Set(metadata.map((card) => Number(card.code)));
const definedCodes = [];
for (let code = registry.idRange[0]; code <= registry.idRange[1]; code++) {
  if (context.cardSet[code]) definedCodes.push(code);
}
assert.deepStrictEqual(definedCodes, Array.from(metadataCodes).sort((a, b) => a - b));

metadata.forEach((data) => {
  const code = Number(data.code);
  const card = context.cardSet[code];
  assert(card, 'missing definition for ' + data.code + ' ' + data.title);
  assert.strictEqual(card.title, data.title, data.code + ': title');
  assert.strictEqual(card.imageFile, data.code + '.png', data.code + ': image');
  assert(
    fs.existsSync(path.join(root, 'images', data.code + '.jpg')),
    data.code + ': local image',
  );
  assert.strictEqual(card.cardType, data.type_code, data.code + ': card type');
  assert(
    typeof card.elo === 'number' && Number.isFinite(card.elo),
    data.code + ': finite ELO',
  );
  assert(Array.isArray(card.subTypes), data.code + ': subtypes');

  if (data.type_code === 'identity') {
    assert(Number.isFinite(card.deckSize), data.code + ': deck size');
    assert(Number.isFinite(card.influenceLimit), data.code + ': influence limit');
  } else if (data.type_code === 'agenda') {
    assert(Number.isFinite(card.advancementRequirement), data.code + ': advancement');
    assert(Number.isFinite(card.agendaPoints), data.code + ': agenda points');
  } else {
    assert(Number.isFinite(card.influence), data.code + ': influence');
  }
});

['startup', 'standard', 'eternal'].forEach((format) => {
  assert(
    context.formatRegistry[format].sets.includes('vp'),
    format + ' must include Vantage Point',
  );
});

console.log('Vantage Point integration checks passed for all 66 cards.');
