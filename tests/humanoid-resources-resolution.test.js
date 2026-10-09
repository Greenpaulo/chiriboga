'use strict';
// Exercise the card helpers with real install/payment/response/decision phases.
const assert = require('assert');
const {playBoard, OPENING} = require('./_headless-board');

async function scenario(mode) {
  const setupCode = `
    var hrChecks = [], hrFailure = null;
    __report = function() { return {checks: hrChecks, failure: hrFailure}; };
    StartGame = function() {
      function check(condition, message) {
        if (!condition) throw new Error(message);
        hrChecks.push(message);
      }
      function choose(command, predicate) {
        EnumeratePhase();
        var options = currentPhase.Enumerate[command]();
        var choice = options.find(predicate || function() { return true; });
        if (!choice) throw new Error('No choice for ' + command + ' in ' + currentPhase.title);
        currentPhase.Resolve[command](choice);
      }
      function settle(predicate) {
        for (var step = 0; step < 30 && !predicate(); step++) {
          EnumeratePhase();
          if (currentPhase.Enumerate.trigger && currentPhase.Enumerate.trigger().length)
            choose('trigger');
          else if (currentPhase.Enumerate.continue) choose('continue');
          else choose('n');
        }
        check(predicate(), 'resolution reaches expected phase');
      }
      try {
        ${OPENING}
        while (corp.HQ.cards.length) MoveCard(corp.HQ.cards[0], corp.archives.cards);
        corp.identityCard.responseOnInstall = undefined;
        corp.creditPool = 20; corp.clickTracker = 0; playerTurn = corp;
        corp.actionsCompletedThisTurn = 1;
        ChangePhase(phases.corpActionMain);
        var returnPhase = currentPhase;
        var first = InstanceCardsPush(31080, corp.HQ.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
        var second = InstanceCardsPush(31080, corp.HQ.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
        var hedge = InstanceCardsPush(30075, corp.HQ.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
        var petty = InstanceCardsPush(35081, corp.HQ.cards, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
        var hr = cardSet[35039];
        var responseCount = 0;
        if (${JSON.stringify(mode)} === 'responses') {
          // A real triggered response containing its own decision must finish first.
          corp.identityCard.responseOnInstall = {
            Enumerate: function(card) { return [{card: card}]; },
            Resolve: function() {
              DecisionPhase(corp, [{}], function() { responseCount++; }, 'Install response');
            }
          };
        }
        humanoidResourcesInstall(hr, 0);
        if (${JSON.stringify(mode)} === 'direct' || ${JSON.stringify(mode)} === 'skip-all' || ${JSON.stringify(mode)} === 'restrictions') {
          choose('install', function(p) { return p.card === null; });
        } else {
          choose('install', function(p) { return p.card === first && p.server === null; });
          settle(function() { return currentPhase.title === 'Trash Before Install'; });
          check(first.cardLocation === corp.installingCards, 'next menu waits for install');
          if (${JSON.stringify(mode)} === 'cancel') {
            currentPhase.Cancel.trash();
            check(first.cardLocation === corp.HQ.cards, 'cancellation restores card to HQ');
            check(currentPhase.text.install.indexOf('0/2') !== -1, 'cancellation preserves install allowance');
            choose('install', function(p) { return p.card === first && p.server === null; });
            settle(function() { return currentPhase.title === 'Trash Before Install'; });
          }
          choose('n');
          settle(function() { return currentPhase.title === 'Humanoid Resources'; });
          check(first.cardLocation !== corp.HQ.cards, 'first card installed');
          check(currentPhase.text.install.indexOf('1/2') !== -1, 'one completed install counted');
          if (${JSON.stringify(mode)} === 'responses') check(responseCount === 1, 'first response finishes before second menu');
          if (${JSON.stringify(mode)} === 'skip-second') {
            choose('install', function(p) { return p.card === null; });
            check(second.cardLocation === corp.HQ.cards, 'skipping second install preserves HQ');
          } else {
            choose('install', function(p) { return p.card === second && p.server === null; });
            settle(function() { return currentPhase.title === 'Trash Before Install'; });
            choose('n');
            settle(function() { return currentPhase.title === 'Humanoid Resources'; });
            check(second.cardLocation !== corp.HQ.cards, 'second card installed');
            if (${JSON.stringify(mode)} === 'responses') check(responseCount === 2, 'second response finishes before operation menu');
          }
        }
        var operations = currentPhase.Enumerate.continue();
        check(!operations.some(function(p) { return p.card === petty; }), 'Petty Cash excluded after completed action');
        check(operations.some(function(p) { return p.card === hedge; }), 'legal operation offered with zero clicks');
        if (${JSON.stringify(mode)} === 'restrictions') {
          choose('continue', function(p) { return p.card === null; });
          corp.creditPool = 0;
          humanoidResourcesPlayOp(hr);
          check(currentPhase.Enumerate.continue().length === 1, 'unaffordable operations excluded');
          choose('continue');
        } else if (${JSON.stringify(mode)} === 'skip-all') {
          choose('continue', function(p) { return p.card === null; });
        } else {
          var creditsBefore = corp.creditPool;
          choose('continue', function(p) { return p.card === hedge; });
          settle(function() { return currentPhase.title === 'Playing Hedge Fund'; });
          choose('continue');
          check(corp.creditPool === creditsBefore + 4, 'operation cost and effect resolve once');
          check(hedge.cardLocation === corp.resolvingCards, 'operation awaits normal action-phase cleanup');
        }
        check(currentPhase === returnPhase, 'original phase restored');
        check(corp.clickTracker === 0, 'operation consumes no extra click');
      } catch (error) { hrFailure = error.message; }
      PlayerWin(corp, 'Resolution test complete');
    };`;
  const game = await playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode});
  assert.strictEqual(game.report.failure, null, mode + ': ' + game.report.failure);
  assert.ok(game.report.checks.length >= 4, mode + ': checks completed');
  assert.ok(!game.errors.some(e => /^stalled/.test(e)), mode + ': engine stalled');
}

(async () => {
  for (const mode of ['two-installs', 'direct', 'skip-all', 'skip-second', 'cancel', 'responses', 'restrictions'])
    await scenario(mode);
  console.log('Humanoid Resources: 7 real-engine resolution scenarios passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
