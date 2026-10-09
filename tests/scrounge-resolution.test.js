'use strict';
// Scrounge's real install/trigger phases and optional continuation, including
// a Heap that changes after play enumeration. No shared engine functions stubbed.
const assert = require('assert');
const {playBoard, OPENING} = require('./_headless-board');

async function scenario(mode) {
  const setupCode = `
    var scroungeChecks = [], scroungeFailure = null;
    __report = function() { return {checks: scroungeChecks, failure: scroungeFailure}; };
    StartGame = function() {
      function check(condition, message) {
        if (!condition) throw new Error(message);
        scroungeChecks.push(message);
      }
      function choose(command, predicate) {
        EnumeratePhase();
        var choices = currentPhase.Enumerate[command]();
        var choice = choices.find(predicate || function() { return true; });
        if (!choice) throw new Error('No choice for ' + command + ' in ' + currentPhase.title);
        currentPhase.Resolve[command](choice);
      }
      function settle(predicate) {
        for (var step = 0; step < 60 && !predicate(); step++) {
          EnumeratePhase();
          if (currentPhase.Enumerate.trigger && currentPhase.Enumerate.trigger().length) choose('trigger');
          else if (currentPhase.Enumerate.continue) choose('continue');
          else choose('n');
        }
        check(predicate(), 'resolution reaches optional step');
      }
      try {
        ${OPENING}
        runner.AI = null; // exercise the human menu, including choosing/declining
        runner.identityCard.responseOnInstall = undefined;
        runner.creditPool = 1; runner.clickTracker = 2; playerTurn = runner;
        ChangePhase(phases.runnerActionMain);
        var returnPhase = currentPhase;
        var scrounge = InstanceCardsPush(35004, runner.resolvingCards, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0];
        var first = InstanceCardsPush(30032, runner.heap, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0];
        check(scrounge.Enumerate().length === 1, 'program installable before costs');
        // Model the paid play cost, or a target leaving the Heap between
        // enumeration and resolution. The promoted reproduction plays it fully.
        var mode = ${JSON.stringify(mode)};
        runner.creditPool = mode === 'affordable' || mode === 'last-program' ? 2 : 0;
        if (mode === 'empty-heap') MoveCard(first, runner.stack);
        var second = mode === 'affordable' ?
          InstanceCardsPush(30032, runner.heap, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0] : null;
        scrounge.Resolve({});
        if (mode === 'affordable' || mode === 'last-program') {
          check(currentPhase.title === 'Scrounge' && !!currentPhase.Enumerate.install, 'affordable install offered');
          choose('install', function(p) { return p.card === first; });
          settle(function() { return currentPhase.identifier === 'Scrounge Add to Stack'; });
          check(first.cardLocation === runner.rig.programs, 'program installed from Heap');
          check(runner.creditPool === 1, 'install cost paid once');
        } else {
          check(currentPhase.identifier === 'Scrounge Add to Stack', 'impossible install skips directly to optional step');
          check(first.cardLocation === (mode === 'empty-heap' ? runner.stack : runner.heap), 'impossible install preserves card location');
        }
        check(scrounge.pendingAddToStack === false, 'no pending install trigger remains');
        var choices = currentPhase.Enumerate.add();
        check(choices.some(function(p) { return p.card === null; }), 'Done always offered');
        var toAdd = mode === 'affordable' ? second : mode === 'unaffordable-add' ? first : null;
        if (toAdd) {
          check(choices.some(function(p) { return p.card === toAdd; }), 'remaining Heap program offered');
          choose('add', function(p) { return p.card === toAdd; });
          check(runner.stack[0] === toAdd, 'program added to bottom of Stack');
        } else {
          if (mode === 'empty-heap' || mode === 'last-program') check(choices.length === 1, 'empty Heap offers only Done');
          choose('add', function(p) { return p.card === null; });
        }
        settle(function() { return currentPhase === returnPhase; });
        check(runner.clickTracker === 2, 'effect consumes no extra clicks');
      } catch (error) { scroungeFailure = error.message; }
      PlayerWin(corp, 'Resolution test complete');
    };`;
  const game = await playBoard({corp: 'Zwicky Supermodernism.js', runner: 'Magdalene CBB.js', setupCode});
  assert.strictEqual(game.report.failure, null, mode + ': ' + game.report.failure);
  assert(game.report.checks.length >= 6, mode + ': checks completed');
  assert.deepStrictEqual(game.errors, [], mode + ': engine errors');
}
(async () => {
  for (const mode of ['affordable', 'last-program', 'unaffordable-add', 'unaffordable-decline', 'empty-heap'])
    await scenario(mode);
  console.log('Scrounge: 5 real-engine resolution scenarios passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
