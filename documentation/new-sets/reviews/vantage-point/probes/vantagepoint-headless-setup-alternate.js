var vpReviewCorpId = 36046; var vpReviewRunnerId = 36026;
// Headless setup only: generate legal Startup decks using VP identities.
// The alternate setup supplies vpReviewCorpId and vpReviewRunnerId first.
var vpReviewCorpId = typeof vpReviewCorpId === 'number' ? vpReviewCorpId : 36036;
var vpReviewRunnerId = typeof vpReviewRunnerId === 'number' ? vpReviewRunnerId : 36017;
corp.identityCard = InstanceCard(vpReviewCorpId, cardBackTexturesCorp, glowTextures, strengthTextures);
runner.identityCard = InstanceCard(vpReviewRunnerId, cardBackTexturesRunner, glowTextures, strengthTextures);
corp.identityCard.faceUp = true; runner.identityCard.faceUp = true;
var vpReviewCorpDeck = DeckBuild(corp.identityCard, undefined, undefined, undefined, undefined, formatRegistry.startup.sets);
var vpReviewRunnerDeck = DeckBuild(runner.identityCard, undefined, undefined, undefined, undefined, formatRegistry.startup.sets);
corp.RnD.cards.length = 0; runner.stack.length = 0;
vpReviewCorpDeck.forEach(function(id) { InstanceCardsPush(id, corp.RnD.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures); });
vpReviewRunnerDeck.forEach(function(id) { InstanceCardsPush(id, runner.stack, 1, cardBackTexturesRunner, glowTextures, strengthTextures); });
Shuffle(corp.RnD.cards); Shuffle(runner.stack);
function __report() {
  return {corpIdentity: vpReviewCorpId, runnerIdentity: vpReviewRunnerId,
    corpDeck: vpReviewCorpDeck, runnerDeck: vpReviewRunnerDeck,
    scope: 'Seeded legal random Startup decks; real headless engine and both AIs; no browser/UI playthrough.'};
}
