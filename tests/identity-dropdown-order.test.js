// Run with: node tests/identity-dropdown-order.test.js
// Regression coverage for the faction-grouped identity dropdown ordering:
// factions A-Z, then the displayed identity title A-Z within each faction.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'decklauncher.php'), 'utf8');

function sourceBetween(startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, start);
  assert(start >= 0 && end > start, 'Could not locate decklauncher identity-order helpers');
  return source.slice(start, end);
}

const helperSource = sourceBetween(
  'function GetIdentityDisplayTitle(',
  'SortIdentitiesByFaction(playerIdentities);',
);

function makeCard(title, faction, side) {
  return {title, faction, player: side, cardType: 'identity'};
}

function fixture(side, cards, identityIdxs) {
  const runner = {side: 'runner'};
  const corp = {side: 'corp'};
  const context = {
    console: {log() {}, warn() {}},
    runner,
    corp,
    deckPlayer: side === 'corp' ? corp : runner,
    cardSet: cards,
    playerIdentities: identityIdxs.slice(),
  };
  vm.createContext(context);
  vm.runInContext(helperSource, context);
  vm.runInContext('SortIdentitiesByFaction(playerIdentities);', context);
  return context;
}

// --- Runner: factions A-Z (Anarch, Criminal, Neutral, Shaper) ---
{
  const cards = [];
  cards[0] = makeCard('Rielle "Kit" Peddler: Transhuman', 'Shaper', 'runner');
  cards[1] = makeCard('Reina Roja: Freedom Fighter', 'Anarch', 'runner');
  cards[2] = makeCard('Gabriel Santiago: Consummate Professional', 'Criminal', 'runner');
  cards[3] = makeCard('The Masque: Cyber General', 'Neutral', 'runner');
  cards[4] = makeCard('Noise: Hacker Extraordinaire', 'Anarch', 'runner');
  const context = fixture('runner', cards, [0, 1, 2, 3, 4]);
  // Anarch (Noise, Reina Roja), Criminal (Gabriel Santiago), Neutral (The Masque),
  // Shaper (Rielle "Kit" Peddler)
  assert.deepStrictEqual(Array.from(context.playerIdentities), [4, 1, 2, 3, 0]);
}

// --- Corp: factions A-Z (Haas-Bioroid, Jinteki, NBN, Neutral, Weyland) ---
{
  const cards = [];
  cards[10] = makeCard('NBN: Making News', 'NBN', 'corp');
  cards[11] = makeCard('Haas-Bioroid: Engineering the Future', 'Haas-Bioroid', 'corp');
  cards[12] = makeCard('Jinteki: Personal Evolution', 'Jinteki', 'corp');
  cards[13] = makeCard('Weyland Consortium: Building a Better World', 'Weyland Consortium', 'corp');
  cards[14] = makeCard('Near-Earth Hub: Broadcast Center', 'NBN', 'corp');
  cards[15] = makeCard('Sportsmetal: Go Big or Go Home', 'Haas-Bioroid', 'corp');
  cards[16] = makeCard('The Shadow: Pulling the Strings', 'Neutral', 'corp');
  const context = fixture('corp', cards, [10, 11, 12, 13, 14, 15, 16]);
  // Haas-Bioroid (Engineering the Future, Sportsmetal), Jinteki (Personal
  // Evolution), NBN (Making News, Near-Earth Hub), Neutral (The Shadow),
  // Weyland Consortium (Building a Better World)
  assert.deepStrictEqual(Array.from(context.playerIdentities), [11, 15, 12, 10, 14, 16, 13]);
}

// --- Display titles drop a Corp faction prefix only when it matches ---
{
  const cards = [];
  cards[0] = makeCard('Haas-Bioroid: Engineering the Future', 'Haas-Bioroid', 'corp');
  cards[1] = makeCard('Sportsmetal: Go Big or Go Home', 'Haas-Bioroid', 'corp');
  cards[2] = makeCard('Near-Earth Hub: Broadcast Center', 'NBN', 'corp');
  const context = fixture('corp', cards, [0, 1, 2]);
  assert.strictEqual(vm.runInContext('GetIdentityDisplayTitle(0)', context), 'Engineering the Future');
  assert.strictEqual(vm.runInContext('GetIdentityDisplayTitle(1)', context), 'Sportsmetal');
  assert.strictEqual(vm.runInContext('GetIdentityDisplayTitle(2)', context), 'Near-Earth Hub');
}

// --- The dropdown builder must render the same title the sort ranks by ---
assert(
  source.includes('var shortTitle = GetIdentityDisplayTitle(playerIdentities[i]);'),
  'Dropdown builder should reuse GetIdentityDisplayTitle so render and sort agree',
);
assert(
  !source.includes('playerIdentities.sort('),
  'Ad-hoc identity sort should be replaced by SortIdentitiesByFaction',
);

// --- Gauntlet groups identities by faction as well ---
const gauntletSource = fs.readFileSync(path.resolve(__dirname, '..', 'gauntlet.php'), 'utf8');
assert(
  gauntletSource.includes('factionCompare = factionA.localeCompare(factionB)'),
  'Gauntlet identity sort should group by faction before display title',
);

console.log('Identity dropdown faction-grouping regression cases passed.');
