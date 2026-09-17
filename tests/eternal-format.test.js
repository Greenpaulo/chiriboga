// Run with: node tests/eternal-format.test.js
//
// Verifies the "Eternal" custom-game format:
//   1. Is enabled in formatRegistry.
//   2. Covers every set in setRegistry.availableSets (Eternal = all cards ever
//      released).
//   3. Still yields at least one eligible runner + corp precon, since
//      selectFormat() aborts if either side has no legal precon.
//   4. The Eternal menu button in index.php is no longer CSS-disabled.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

// --- Load config.js (setRegistry + formatRegistry) ------------------------
const configContext = { console };
vm.createContext(configContext);
vm.runInContext(
  fs.readFileSync(path.join(root, 'config.js'), 'utf8'),
  configContext,
  { filename: 'config.js' },
);
const setRegistry = configContext.setRegistry;
const formatRegistry = configContext.formatRegistry;

const eternal = formatRegistry.eternal;
assert(eternal, 'formatRegistry.eternal must be defined');
assert.strictEqual(eternal.enabled, true, 'Eternal must be enabled');

// --- Eternal must include EVERY registered set ----------------------------
const registeredCodes = Object.keys(setRegistry.availableSets).map(
  (key) => setRegistry.availableSets[key].code,
);
const eternalSets = eternal.sets;
assert(
  Array.isArray(eternalSets) && eternalSets.length > 0,
  'Eternal must declare a non-empty sets array',
);
assert.strictEqual(
  new Set(eternalSets).size,
  eternalSets.length,
  'Eternal sets array must not contain duplicates',
);

const missing = registeredCodes.filter((code) => eternalSets.indexOf(code) === -1);
assert.deepStrictEqual(
  missing,
  [],
  'Eternal must include every set code in setRegistry.availableSets (missing: ' +
    missing.join(', ') +
    ')',
);

// Guard against regression: the codes used by the shipped precons must remain
// legal in Eternal, otherwise only some precons would be selectable.
['sg', 'su21', 'core', 'elev'].forEach((code) => {
  assert(
    eternalSets.indexOf(code) !== -1,
    'Eternal must include precon set code "' + code + '"',
  );
});

// --- Load all sets so identity sides can be resolved ----------------------
const cardContext = {
  console,
  cardSet: [],
  setIdentifiers: [],
  runner: 'runner',
  corp: 'corp',
};
vm.createContext(cardContext);
fs.readdirSync(path.join(root, 'sets'))
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => {
    vm.runInContext(
      fs.readFileSync(path.join(root, 'sets', f), 'utf8'),
      cardContext,
      { filename: f },
    );
  });
const cardSet = cardContext.cardSet;

// --- Load all precons -----------------------------------------------------
const preconDecks = [];
// Dedicated context that shares the loaded cardSet but only needs to supply
// registerPrecon (precon files are plain data + that one call).
const preconContext = {
  console,
  cardSet,
  runner: cardContext.runner,
  corp: cardContext.corp,
  registerPrecon: (deck) => preconDecks.push(deck),
};
vm.createContext(preconContext);
fs.readdirSync(path.join(root, 'precons'))
  .filter((f) => f.endsWith('.js'))
  .forEach((f) => {
    vm.runInContext(
      fs.readFileSync(path.join(root, 'precons', f), 'utf8'),
      preconContext,
      { filename: f },
    );
  });

assert(preconDecks.length > 0, 'Expected precons to load');

// --- Mirror selectFormat()'s precon filter ---------------------------------
function eligibleForSide(side) {
  return preconDecks.filter((d) => {
    if (d.useForCustomGame !== true) return false;
    if (!Array.isArray(d.sets)) return false;
    const covered = d.sets.every((code) => eternalSets.indexOf(code) !== -1);
    const identityCard = cardSet[d.identity];
    return covered && identityCard && identityCard.player === side;
  });
}

const runners = eligibleForSide(cardContext.runner);
const corps = eligibleForSide(cardContext.corp);
assert(
  runners.length > 0,
  'Eternal must have at least one eligible runner precon',
);
assert(corps.length > 0, 'Eternal must have at least one eligible corp precon');

// --- index.php Eternal button is no longer disabled -----------------------
const indexSource = fs.readFileSync(path.join(root, 'index.php'), 'utf8');
const buttonRe = /<div class="([^"]*)" id="format-btn-eternal"[^>]*>/;
const buttonMatch = indexSource.match(buttonRe);
assert(buttonMatch, 'Could not find the Eternal format button in index.php');
assert(
  buttonMatch[1].split(/\s+/).indexOf('disabled') === -1,
  'The Eternal format button must not carry the "disabled" class',
);

console.log('eternal-format.test.js: all assertions passed');
console.log(
  '  Eternal sets (' +
    eternalSets.length +
    '): ' +
    eternalSets.join(', '),
);
console.log(
  '  Eligible precons — runner: ' +
    runners.length +
    ', corp: ' +
    corps.length,
);
