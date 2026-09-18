// Run with: node tests/deckbuild-format-pool.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const context = {
  console: {log() {}, warn() {}, error() {}},
  runner: {side: 'runner'},
  corp: {side: 'corp'},
  cardSet: [],
  setIdentifiers: [],
  Math,
  Date,
};
vm.createContext(context);
vm.runInContext(
  'if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };',
  context,
);

['config.js', 'utility.js'].forEach((file) => {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {
    filename: file,
  });
});
Object.keys(context.setRegistry.availableSets).forEach((key) => {
  const file = context.setRegistry.availableSets[key].file + '.js';
  vm.runInContext(
    fs.readFileSync(path.join(root, 'sets', file), 'utf8'),
    context,
    {filename: file},
  );
});

function cardLimit(card) {
  if (typeof card.AILimitPerDeck === 'number') return card.AILimitPerDeck;
  if (typeof card.limitPerDeck === 'number') return card.limitPerDeck;
  return 3;
}

function validateDeck(identityId, allowedSetCodes) {
  const identity = context.cardSet[identityId];
  const deck = context.DeckBuild(
    identity,
    undefined,
    undefined,
    undefined,
    undefined,
    allowedSetCodes,
  );
  const targetSize =
    identity.player === context.corp ? identity.deckSize + 4 : identity.deckSize;
  assert.strictEqual(deck.length, targetSize, identity.title + ': deck size');
  assert(
    context.CountInfluence(identity, deck) <= identity.influenceLimit,
    identity.title + ': influence limit',
  );

  const counts = {};
  deck.forEach((cardId) => {
    const card = context.cardSet[cardId];
    assert(card, identity.title + ': undefined card ' + cardId);
    assert.strictEqual(card.player, identity.player, identity.title + ': side');
    assert(
      allowedSetCodes.indexOf(context.DeckBuildSetCodeForCard(cardId)) !== -1,
      identity.title + ': card from a set outside the selected format',
    );
    counts[cardId] = (counts[cardId] || 0) + 1;
  });
  Object.keys(counts).forEach((cardId) => {
    assert(
      counts[cardId] <= cardLimit(context.cardSet[cardId]),
      identity.title + ': copy limit for ' + context.cardSet[cardId].title,
    );
  });

  if (identity.player === context.corp) {
    const agendaPoints = deck.reduce(
      (total, cardId) => total + (context.cardSet[cardId].agendaPoints || 0),
      0,
    );
    const agendaMin = 2 * Math.floor(targetSize / 5) + 2;
    assert(
      agendaPoints >= agendaMin && agendaPoints <= agendaMin + 1,
      identity.title + ': agenda points',
    );
  }
}

// The derived Eternal pools must contain every eligible loaded card, including
// cards outside the old SG/SU21/MS hardcoded lists.
const eternalCodes = context.formatRegistry.eternal.sets;
const runnerIdentityId = 1001;
const corpIdentityId = 1080;
[runnerIdentityId, corpIdentityId].forEach((identityId) => {
  const identity = context.cardSet[identityId];
  const pool = context.DeckBuildCollectSetCards(identity, eternalCodes);
  const expected = [];
  for (let cardId = 0; cardId < context.cardSet.length; cardId++) {
    const card = context.cardSet[cardId];
    if (!card || card.player !== identity.player || card.cardType === 'identity')
      continue;
    if (eternalCodes.indexOf(context.DeckBuildSetCodeForCard(cardId)) === -1)
      continue;
    if (
      card.cardType !== 'agenda' &&
      (typeof card.influence !== 'number' || !isFinite(card.influence))
    )
      continue;
    expected.push(cardId);
  }
  const actual = pool.nonAgenda.concat(pool.agendas).sort((a, b) => a - b);
  assert.deepStrictEqual(Array.from(actual), expected);
});

// Exercise the real generator for every identity legal in every declared
// custom-game format.
Object.keys(context.formatRegistry).forEach((formatKey) => {
  const allowedSetCodes = context.formatRegistry[formatKey].sets;
  for (let cardId = 0; cardId < context.cardSet.length; cardId++) {
    const card = context.cardSet[cardId];
    if (!card || card.cardType !== 'identity') continue;
    if (allowedSetCodes.indexOf(context.DeckBuildSetCodeForCard(cardId)) === -1)
      continue;
    validateDeck(cardId, allowedSetCodes);
  }
});

// The Professor's first copy of each off-faction program is influence-free.
for (let run = 0; run < 5; run++) validateDeck(3029, eternalCodes);

// Generic agenda selection must work without the legacy forced agenda.
const agendasWithoutSendAMessage = context
  .DeckBuildCollectSetCards(context.cardSet[corpIdentityId], eternalCodes)
  .agendas.filter((cardId) => cardId !== 30069);
const chosenAgendas = context.DeckBuildChooseAgendas(
  context.cardSet[corpIdentityId],
  agendasWithoutSendAMessage,
  49,
);
assert(chosenAgendas.length > 0);
assert(!chosenAgendas.includes(30069));

// The legacy agenda helper must also respect its supplied pool instead of
// injecting Send a Message or any other hardcoded agenda.
const legacyAgendaPool = agendasWithoutSendAMessage.filter((cardId) => {
  const faction = context.cardSet[cardId].faction;
  return faction === context.cardSet[corpIdentityId].faction || faction === 'Neutral';
});
const legacyAgendas = [];
context.DeckBuildRandomAgendas(
  context.cardSet[corpIdentityId],
  legacyAgendaPool,
  legacyAgendas,
  49,
);
const legacyAgendaPoints = legacyAgendas.reduce(
  (total, cardId) => total + context.cardSet[cardId].agendaPoints,
  0,
);
assert(legacyAgendas.length > 0);
assert(!legacyAgendas.includes(30069));
assert(legacyAgendaPoints >= 20 && legacyAgendaPoints <= 21);

console.log('Format-aware random deck generation tests passed.');
