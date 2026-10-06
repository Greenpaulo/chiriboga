// Run with: node tests/decklauncher-copy-limit.test.js
// Regression coverage for the max-3-copies deckbuilding limit in decklauncher.php:
// the + button must disable at 3 and AddCardToDeck must not exceed 3 copies.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'decklauncher.php'), 'utf8');
function sourceBetween(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert(start >= 0 && end > start, 'Could not locate decklauncher source for: ' + startText);
  return source.slice(start, end);
}

assert(/var MAX_COPIES_PER_CARD = 3;/.test(source), 'decklauncher.php must declare a 3-copy limit');

const addCardSource = sourceBetween('function AddCardToDeck(id) {', 'function RemoveCardFromDeck');
const updateCountsSource = sourceBetween('function UpdateCardCountsUI() {', 'function ShowLightbox');

function addFixture() {
  const context = {
    MAX_COPIES_PER_CARD: 3,
    deckCounts: {},
    json: {cards: []},
    showingOnlySelected: false,
    MarkDeckModified() {},
    UpdateDeckTextareaFromCounts() {},
    Parse() {},
    ApplyFilter() {},
  };
  vm.createContext(context);
  vm.runInContext(addCardSource, context);
  return context;
}

function uiFixture(counts) {
  const cards = [];
  Object.keys(counts).forEach((id) => {
    const badge = {attrs: {'data-id': String(id)}, classes: {}, text: null};
    const cardItem = {classes: {}, addBtn: {disabled: false}};
    badge.parent = cardItem;
    cardItem.badge = badge;
    cards.push(cardItem);
  });

  function wrap(els) {
    return {
      each(cb) { els.forEach((el) => cb.call(el)); return this; },
      attr(name) { return els[0].attrs[name]; },
      text(value) { els.forEach((el) => { el.text = value; }); return this; },
      toggleClass(name, state) { els.forEach((el) => { el.classes[name] = state; }); return this; },
      closest() { return wrap(els.map((el) => el.parent)); },
      find(sel) {
        return wrap(els.filter((el) => sel === '.add-btn' && el.addBtn).map((el) => el.addBtn));
      },
      prop(name, value) {
        els.forEach((el) => { if (name === 'disabled') el.disabled = value; });
        return this;
      },
      is() { return false; },
      hide() { return this; },
    };
  }

  const $ = (arg) => {
    if (arg === '#cardcontainer .count-badge') return wrap(cards.map((card) => card.badge));
    if (arg && typeof arg === 'object') return wrap([arg]);
    return wrap([]);
  };

  const context = {
    $,
    MAX_COPIES_PER_CARD: 3,
    deckCounts: counts,
    showingOnlySelected: false,
    ApplyFilter() {},
  };
  vm.createContext(context);
  vm.runInContext(updateCountsSource, context);
  return {context, cards};
}

function cardFor(cards, id) {
  return cards.find((card) => card.badge.attrs['data-id'] === String(id));
}

{
  const context = addFixture();
  for (let i = 0; i < 6; i++) vm.runInContext('AddCardToDeck(7)', context);
  assert.strictEqual(context.deckCounts[7], 3, 'AddCardToDeck must stop at 3 copies');
  assert.strictEqual(context.json.cards.length, 3, 'json.cards must not receive a 4th copy');

  vm.runInContext('AddCardToDeck(8)', context);
  assert.strictEqual(context.deckCounts[8], 1, 'cards below the limit still add normally');
  assert.strictEqual(context.json.cards.length, 4, 'other cards are unaffected by the limit');
}

{
  const {context, cards} = uiFixture({1: 3, 2: 2, 3: 0});
  vm.runInContext('UpdateCardCountsUI()', context);
  assert.strictEqual(cardFor(cards, 1).addBtn.disabled, true, '+ must be disabled at 3 copies');
  assert.strictEqual(cardFor(cards, 2).addBtn.disabled, false, '+ must stay enabled at 2 copies');
  assert.strictEqual(cardFor(cards, 3).addBtn.disabled, false, '+ must stay enabled at 0 copies');
  assert.strictEqual(cardFor(cards, 1).badge.text, 3, 'badge shows the current count');

  context.deckCounts[2] = 3;
  vm.runInContext('UpdateCardCountsUI()', context);
  assert.strictEqual(cardFor(cards, 2).addBtn.disabled, true, '+ must disable once a count reaches 3');

  context.deckCounts[1] = 2;
  vm.runInContext('UpdateCardCountsUI()', context);
  assert.strictEqual(cardFor(cards, 1).addBtn.disabled, false, '+ must re-enable below 3 copies');
}

console.log('decklauncher copy-limit regression cases passed.');
