// Run with: node tests/mode-identity-exclusion.test.js
// The System Gateway tutorial identities (The Catalyst 30076 / The Syndicate
// 30077) must never be offered by Quick Game or Custom Game.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const count = (haystack, needle) => haystack.split(needle).length - 1;

// --- Helper behaviour ---------------------------------------------------
const utility = read('utility.js');
const helperStart = utility.indexOf('var quickCustomExcludedIdentities');
const helperEnd = utility.indexOf('function RandomRange(', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart, 'Could not locate the quick/custom exclusion helper in utility.js');

const helperContext = {console: {log() {}}};
vm.createContext(helperContext);
vm.runInContext(utility.slice(helperStart, helperEnd), helperContext);
const isExcluded = helperContext.IsIdentityExcludedFromQuickCustom;

assert.strictEqual(isExcluded(30076), true, 'The Catalyst must be excluded');
assert.strictEqual(isExcluded(30077), true, 'The Syndicate must be excluded');
assert.strictEqual(isExcluded('30076'), true, 'string identity ids must be excluded');
assert.strictEqual(isExcluded('30077'), true, 'string identity ids must be excluded');
assert.strictEqual(isExcluded(30001), false, 'normal identities stay selectable');
assert.strictEqual(isExcluded(undefined), false, 'missing identity is not excluded');
assert.strictEqual(isExcluded(null), false, 'null identity is not excluded');
assert.strictEqual(isExcluded('random'), false, '"random" is not an identity');

// --- Compressed deck-string guard (decklauncher.php) --------------------
const decklauncher = read('decklauncher.php');
const guardStart = decklauncher.indexOf('function IsDeckStringUsingExcludedIdentity(');
const guardEnd = decklauncher.indexOf('function IdentityImageFromDeckString(', guardStart);
assert(guardStart >= 0 && guardEnd > guardStart, 'Could not locate IsDeckStringUsingExcludedIdentity');

const deckStrings = {
  catalyst: JSON.stringify({identity: 30076, cards: [30006]}),
  syndicate: JSON.stringify({identity: 30077, cards: [30039]}),
  normal: JSON.stringify({identity: 30001, cards: [30002]}),
  broken: 'this is not json',
};
const guardContext = {
  console: {log() {}},
  IsIdentityExcludedFromQuickCustom: isExcluded,
  LZString: {decompressFromEncodedURIComponent: (s) => deckStrings[s]},
};
vm.createContext(guardContext);
vm.runInContext(decklauncher.slice(guardStart, guardEnd), guardContext);
const deckUsesExcluded = guardContext.IsDeckStringUsingExcludedIdentity;
assert.strictEqual(deckUsesExcluded('catalyst'), true);
assert.strictEqual(deckUsesExcluded('syndicate'), true);
assert.strictEqual(deckUsesExcluded('normal'), false);
assert.strictEqual(deckUsesExcluded('broken'), false, 'malformed deck strings are not treated as excluded');
assert.strictEqual(deckUsesExcluded('random'), false);
assert.strictEqual(deckUsesExcluded(''), false);

// --- Every selection path applies the filter ---------------------------
const index = read('index.php');
assert.strictEqual(
  count(index, 'if (IsIdentityExcludedFromQuickCustom(d.identity)) return false;'),
  4,
  'Quick Game and Custom Game pools must both filter excluded identities',
);

assert.strictEqual(
  count(decklauncher, 'if (IsIdentityExcludedFromQuickCustom(i)) continue;'),
  2,
  'decklauncher identity list must skip excluded identities',
);
assert.strictEqual(
  count(decklauncher, 'if (IsIdentityExcludedFromQuickCustom(pre.identity)) continue;'),
  2,
  'decklauncher random opponent selection must skip excluded identities',
);
assert(
  decklauncher.includes('if (IsDeckStringUsingExcludedIdentity(specifiedPlayerDeck)) {'),
  'decklauncher must reject player decks built on excluded identities',
);
assert(
  decklauncher.includes('!IsDeckStringUsingExcludedIdentity(uric)') &&
    decklauncher.includes('!IsDeckStringUsingExcludedIdentity(urir)'),
  'decklauncher must reject opponent decks built on excluded identities',
);
assert(
  count(decklauncher, 'reserved for Tutorial mode and cannot be played') >= 2,
  'saved decks and JS deck imports must refuse excluded identities',
);

const decks = read('decks.js');
assert(
  decks.includes('cardSet[i].player == runner && !IsIdentityExcludedFromQuickCustom(i)') &&
    decks.includes('cardSet[i].player == corp && !IsIdentityExcludedFromQuickCustom(i)'),
  'engine random-deck fallbacks must skip excluded identities',
);

console.log('Mode identity exclusion regression cases passed.');
