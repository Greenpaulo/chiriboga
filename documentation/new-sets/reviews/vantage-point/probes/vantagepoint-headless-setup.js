// Headless setup only: generate legal Startup decks using VP identities.
// The alternate setup supplies vpReviewCorpId and vpReviewRunnerId first.
var vpReviewCorpId = typeof vpReviewCorpId === 'number' ? vpReviewCorpId : 36036;
var vpReviewRunnerId = typeof vpReviewRunnerId === 'number' ? vpReviewRunnerId : 36017;
corp.identityCard = InstanceCard(vpReviewCorpId, cardBackTexturesCorp, glowTextures, strengthTextures);
runner.identityCard = InstanceCard(vpReviewRunnerId, cardBackTexturesRunner, glowTextures, strengthTextures);
if (corp.identityCard.cardType !== 'identity' || corp.identityCard.player !== corp ||
    runner.identityCard.cardType !== 'identity' || runner.identityCard.player !== runner)
  throw new Error('Smoke setup requires Corp and Runner identities');
// Retain every console engine error, including ones that leave the log tail.
var vpReviewEngineErrors = [];
var vpReviewConsoleError = console.error;
console.error = function() {
  vpReviewEngineErrors.push('ERROR ' + Array.prototype.join.call(arguments, ' '));
  vpReviewConsoleError.apply(console, arguments);
};
corp.identityCard.faceUp = true; runner.identityCard.faceUp = true;
var vpReviewCorpDeck = DeckBuild(corp.identityCard, undefined, undefined, undefined, undefined, formatRegistry.startup.sets);
var vpReviewRunnerDeck = DeckBuild(runner.identityCard, undefined, undefined, undefined, undefined, formatRegistry.startup.sets);
[ [corp.identityCard, vpReviewCorpDeck], [runner.identityCard, vpReviewRunnerDeck] ].forEach(function(pair) {
  var identity = pair[0], deck = pair[1], counts = {};
  if (deck.length < identity.deckSize || CountInfluence(identity, deck) > identity.influenceLimit)
    throw new Error('Illegal smoke deck size or influence');
  deck.forEach(function(id) {
    var card = cardSet[id];
    if (!card) throw new Error('Unknown smoke deck card ' + id);
    counts[id] = (counts[id] || 0) + 1;
    var limit = typeof card.AILimitPerDeck === 'number' ? card.AILimitPerDeck : typeof card.limitPerDeck === 'number' ? card.limitPerDeck : 3;
    if (card.cardType === 'identity' || card.player !== identity.player ||
        !formatRegistry.startup.sets.includes(DeckBuildSetCodeForCard(id)) || counts[id] > limit)
      throw new Error('Illegal smoke deck card ' + id);
  });
  if (identity.player === corp) {
    var points = deck.reduce(function(sum, id) { return sum + (cardSet[id].agendaPoints || 0); }, 0);
    var min = 2 * Math.floor(deck.length / 5) + 2;
    if (points < min || points > min + 1) throw new Error('Illegal smoke agenda points');
  }
});
corp.RnD.cards.length = 0; runner.stack.length = 0;
vpReviewCorpDeck.forEach(function(id) { InstanceCardsPush(id, corp.RnD.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures); });
vpReviewRunnerDeck.forEach(function(id) { InstanceCardsPush(id, runner.stack, 1, cardBackTexturesRunner, glowTextures, strengthTextures); });
Shuffle(corp.RnD.cards); Shuffle(runner.stack);
function __report() {
  return {corpIdentity: vpReviewCorpId, runnerIdentity: vpReviewRunnerId,
    corpDeck: vpReviewCorpDeck, runnerDeck: vpReviewRunnerDeck, engineErrors: vpReviewEngineErrors,
    scope: 'Seeded legal random Startup decks; real headless engine and both AIs; no browser/UI playthrough.'};
}
