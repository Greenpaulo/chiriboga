// Run with: node tests/precon-metadata.test.js
// Precon metadata hygiene. The deck launcher renders "Name (Deck Set)", so a
// placeholder deck_set like "none" would show as "Name (none)". Unset must be
// an empty string (or the property omitted).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

const precons = [];
const context = {
  console,
  cardSet: [],
  runner: {side: 'runner'},
  corp: {side: 'corp'},
  registerPrecon: (deck) => precons.push(deck),
};
vm.createContext(context);

const files = fs
  .readdirSync(path.join(root, 'precons'))
  .filter((f) => f.endsWith('.js'))
  .sort();
assert(files.length > 0, 'Expected precon files to exist');

for (const f of files) {
  vm.runInContext(fs.readFileSync(path.join(root, 'precons', f), 'utf8'), context, {filename: f});
}
assert.strictEqual(precons.length, files.length, 'Every precon file must register exactly one deck');

const placeholderDeckSets = ['none', 'None', 'N/A', 'n/a', 'undefined', 'null'];
const problems = [];
for (const deck of precons) {
  const label = deck.name || deck.identity;
  if (typeof deck.name !== 'string' || !deck.name.trim()) {
    problems.push(label + ': missing name');
  }
  if (typeof deck.identity === 'undefined' || deck.identity === '') {
    problems.push(label + ': missing identity');
  }
  if (!Array.isArray(deck.sets) || deck.sets.length === 0) {
    problems.push(label + ': missing or empty sets array');
  }
  if (typeof deck.deck_set !== 'undefined') {
    if (typeof deck.deck_set !== 'string') {
      problems.push(label + ': deck_set must be a string');
    } else if (placeholderDeckSets.indexOf(deck.deck_set) !== -1) {
      problems.push(
        label + ': deck_set "' + deck.deck_set + '" is a placeholder; use "" for unset',
      );
    }
  }
}
assert.deepStrictEqual(problems, [], 'Precon metadata problems:\n  ' + problems.join('\n  '));

const withDeckSet = precons.filter((d) => d.deck_set);
const withoutDeckSet = precons.filter((d) => !d.deck_set);
assert(withDeckSet.length > 0, 'At least some precons should declare a real deck_set');
assert(withoutDeckSet.length > 0, 'Some precons are expected to leave deck_set unset');

// The launcher must only append the parenthesised set for a truthy deck_set, so
// an empty string renders as just the deck name.
const decklauncher = fs.readFileSync(path.join(root, 'decklauncher.php'), 'utf8');
assert(
  decklauncher.includes("var deckSetLabel = deck.deck_set ? ' (' + deck.deck_set + ')' : '';"),
  'decklauncher must only append the deck set when it is set',
);

console.log(
  'Precon metadata regression cases passed (' +
    precons.length +
    ' precons: ' +
    withDeckSet.length +
    ' named sets, ' +
    withoutDeckSet.length +
    ' unset).',
);
