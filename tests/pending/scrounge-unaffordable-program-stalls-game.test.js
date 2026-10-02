'use strict';
// Pending reproduction: documentation/bugs/scrounge-unaffordable-program-stalls-game.md
// Scrounge must never open an empty install prompt (which deadlocks the game)
// when paying its play cost leaves no program in the Heap affordable.
const assert = require('assert');
const path = require('path');
// The shared board helper lives in tests/; this works from tests/pending/ and after a move to tests/.
const {playBoard, OPENING} = require(path.join(__dirname, path.basename(__dirname) === 'pending' ? '..' : '.', '_headless-board.js'));

const setupCode = `
  var __reproEmpty = [];
  var __reproDP = DecisionPhase;
  DecisionPhase = function(player, choices, resolve, title) {
    if (!choices || choices.length === 0) __reproEmpty.push(String(title));
    return __reproDP.apply(this, arguments);
  };
  StartGame = function() {${OPENING}
    // Scrounge (play cost 1) in the Grip; Mayfly (install cost 1) the only program in the Heap; 1 credit.
    var scrounge = InstanceCardsPush(35004, runner.grip, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    var mayflyId = Number(Object.keys(cardSet).filter(function(k) { return cardSet[k].title === "Mayfly"; })[0]);
    InstanceCardsPush(mayflyId, runner.heap, 1, cardBackTexturesRunner, glowTextures, strengthTextures);
    runner.creditPool = 1; runner.clickTracker = 4; playerTurn = runner;
    runner.AI.preferred = {command: "play", cardToPlay: scrounge};
    ChangePhase(phases.runnerActionMain);
    Main();
  };
  __report = function() { return __reproEmpty; };`;

playBoard({corp: 'Zwicky Supermodernism.js', runner: 'Magdalene CBB.js', setupCode}).then(game => {
  assert.deepStrictEqual(game.report, [], 'an empty decision prompt was opened by: ' + game.report.join(', '));
  assert.ok(!game.errors.some(e => /^stalled/.test(e)), 'the game stalled: ' + game.errors.join('; '));
  assert.ok(game.winner, 'the game finished');
  console.log('Scrounge never opens an empty install prompt.');
}).catch(error => { console.log(error.message); process.exit(1); });
