'use strict';
// Real engine reproduction for the zwicky-magdalene seed 24 gate stall.
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.join(__dirname,
  path.basename(__dirname) === 'pending' ? '..' : '.', '_headless-board.js'));
const setupCode = `
  var installCostRepro = {};
  __report = function() { return installCostRepro; };
  StartGame = function() {${OPENING}
    var echelon = InstanceCardsPush(30025, runner.rig.programs, 2,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    InstanceCardsPush(35032, runner.rig.programs, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures);
    var principia = InstanceCardsPush(35032, runner.heap, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    runner.rig.programs.forEach(function(card) {card.faceUp = true;});
    runner.creditPool = 1; runner.clickTracker = 0; playerTurn = runner;
    ChangePhase(phases.runnerActionMain);
    var choices = runner.identityCard.responseOnDiscardToMaxHandSize.Enumerate.call(
      runner.identityCard, [principia]);
    var chosen = choices.find(function(choice) { return choice.card === principia; });
    installCostRepro.offered = Boolean(chosen);
    installCostRepro.costBeforeTrash = InstallCost(principia);
    runner.identityCard.responseOnDiscardToMaxHandSize.Resolve.call(runner.identityCard, chosen);
    var installPhase = currentPhase;
    installCostRepro.sourceTrashOffered = installPhase.Enumerate.trash().some(function(choice) {
      return choice.card === echelon;
    });
    if (installCostRepro.sourceTrashOffered) installPhase.Resolve.trash({card: echelon});
    // Resolve the real trash/prevention/response windows without starting the
    // main loop that retries the unaffordable payment indefinitely.
    var hops = 0;
    while (currentPhase !== installPhase && hops++ < 10) {
      if (!currentPhase.Resolve || typeof currentPhase.Resolve.n !== 'function') break;
      currentPhase.Resolve.n.call(currentPhase, {});
    }
    installCostRepro.returnedToInstall = currentPhase === installPhase;
    installCostRepro.sourceTrashed = runner.heap.includes(echelon);
    installCostRepro.alreadyInstalled = InstalledCards(runner).includes(principia);
    installCostRepro.costAfterTrash = InstallCost(principia);
    installCostRepro.credits = runner.creditPool;
    installCostRepro.affordable = CheckCredits(runner, InstallCost(principia), 'installing', principia);
    installCostRepro.continueChoices = currentPhase === installPhase ? installPhase.Enumerate.n().length : null;
    installCostRepro.cancelAvailable = Boolean(installPhase.Cancel);
    installCostRepro.pending = runner.installingCards.includes(principia);
    PlayerWin(corp, 'Focused install affordability observation complete');
  };`;

playBoard({corp: 'Zwicky Supermodernism.js', runner: 'Magdalene CBB.js', setupCode}).then(game => {
  const r = game.report;
  assert(r.offered, 'Magdalene must offer the initially affordable discarded Principia: ' + JSON.stringify(r));
  assert.strictEqual(r.costBeforeTrash, 1);
  if (r.sourceTrashed) {
    assert.strictEqual(r.costAfterTrash, 2);
    assert.strictEqual(r.credits, 1);
    assert.strictEqual(r.affordable, false);
    assert.strictEqual(r.alreadyInstalled, false, 'a two-credit install cannot complete with only one available credit');
  }
  // Filtering an unsafe optional trash or aborting an unaffordable install
  // are valid repairs; the invariant does not require one recovery design.
  if (r.pending && !r.affordable) assert.strictEqual(r.continueChoices, 0,
    'Runner install must not offer an unaffordable continuation after trashing a discount source');
  console.log('Runner install rechecks affordability after trashing.');
}).catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; });
