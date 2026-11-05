// Run with: node tests/decklauncher-set-filter.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'decklauncher.php'), 'utf8');
const start = source.indexOf('function ApplyFilter()');
const end = source.indexOf('function ToggleOtherCards()', start);
assert(start >= 0 && end > start);
const context = {
  runner: {}, corp: {}, cardSet: [], setIdentifiers: [],
  cardData: JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')),
  currentFilter: 'gen', currentFactionFilter: 'all', showingOnlySelected: false,
  UpdateFactionFilterButton() {},
};
vm.createContext(context);
for (const file of ['config.js', 'utility.js', 'sets/systemgateway.js', 'sets/genesis.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
const rows = [];
context.cardSet.forEach((card, id) => {
  if (card.cardType !== 'identity') rows.push({id, visible: false});
});
context.$ = (target) => {
  if (target === '#cardcontainer .card-item') {
    return {each(fn) { rows.forEach(row => fn.call(row)); }};
  }
  return {
    find() { return {attr() { return String(target.id); }}; },
    toggle(visible) { target.visible = visible; },
  };
};
vm.runInContext(source.slice(start, end), context);

// Exercise the actual UI filter against loaded definitions and real pack metadata.
context.ApplyFilter();
const packs = new Set();
for (const row of rows) {
  const genesis = row.id >= 2001 && row.id <= 2120;
  assert.strictEqual(row.visible, genesis, 'Genesis filter: ' + context.cardSet[row.id].title);
  if (genesis) {
    const info = context.cardData.data.find(card => card.code === String(row.id).padStart(5, '0'));
    packs.add(info.pack_code);
  }
}
assert.deepStrictEqual([...packs].sort(), ['asis', 'ce', 'fp', 'hs', 'ta', 'wla']);

// Filtering must work before the asynchronous metadata fetch finishes as well.
context.cardData = null;
context.currentFilter = 'sg';
context.ApplyFilter();
for (const row of rows) {
  assert.strictEqual(row.visible, row.id >= 30000 && row.id <= 30999);
}
context.currentFilter = 'gen';
context.currentFactionFilter = 'anarch';
context.ApplyFilter();
for (const row of rows) {
  assert.strictEqual(row.visible, row.id >= 2001 && row.id <= 2120 && context.cardSet[row.id].faction === 'Anarch');
}
context.currentFilter = 'all';
context.currentFactionFilter = 'all';
context.ApplyFilter();
assert(rows.every(row => row.visible));
console.log('Decklauncher set filter tests passed.');
