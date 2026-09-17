// Run with: node tests/decklauncher-identity-change.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'decklauncher.php'), 'utf8');
function sourceBetween(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert(start >= 0 && end > start, 'Could not locate decklauncher helper source');
  return source.slice(start, end);
}

const helperSource =
  sourceBetween('function ApplyGeneratedDeck(', '// Random Deck function') +
  sourceBetween('function GenerateDeckForIdentity(', 'function GenerateDeck()');

function fixture(precon, generatedCards) {
  const runner = {side: 'runner'};
  const corp = {side: 'corp'};
  const identity = {title: 'New Identity', cardType: 'identity', player: runner};
  const context = {
    console: {warn() {}},
    runner,
    corp,
    deckPlayer: runner,
    cardSet: [identity, {title: 'Runner card', player: runner}, {title: 'Corp card', player: corp}],
    json: {identity: 0, cards: [2, 2]},
    deckCounts: {2: 2},
    preconDecks: precon ? [precon] : [],
    SelectPreconForIdentity: () => precon ? 0 : -1,
    DeckBuildCalls: 0,
    generatedCards,
    generatedForIdentity: null,
    MarkDeckModified() {},
    UpdateDeckTextareaFromCounts() {},
    Parse() {},
    UpdateCardCountsUI() {},
  };
  vm.createContext(context);
  vm.runInContext(
    'function DeckBuild(selectedIdentity) { DeckBuildCalls++; generatedForIdentity = selectedIdentity; return generatedCards.slice(); }',
    context,
  );
  vm.runInContext(helperSource, context);
  return context;
}

{
  const context = fixture(null, [1, 1]);
  vm.runInContext('GenerateDeckForIdentity(0)', context);
  assert.deepStrictEqual(Array.from(context.json.cards), [1, 1]);
  assert.strictEqual(context.DeckBuildCalls, 1);
  assert.strictEqual(context.generatedForIdentity, context.cardSet[0]);
}

{
  const context = fixture({identity: 0, cards: {1: 2}}, [1]);
  vm.runInContext('GenerateDeckForIdentity(0)', context);
  assert.deepStrictEqual(Array.from(context.json.cards), [1, 1]);
  assert.strictEqual(context.DeckBuildCalls, 0);
}

{
  const context = fixture({identity: 0, cards: {2: 3}}, [1, 1]);
  vm.runInContext('GenerateDeckForIdentity(0)', context);
  assert.deepStrictEqual(Array.from(context.json.cards), [1, 1]);
  assert.strictEqual(context.DeckBuildCalls, 1);
  assert(!context.json.cards.includes(2));
}

assert(source.includes('GenerateDeckForIdentity(json.identity);'));
console.log('3 decklauncher identity-change regression cases passed.');
