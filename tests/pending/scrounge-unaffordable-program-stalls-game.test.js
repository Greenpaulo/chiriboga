'use strict';
// Pending reproduction: documentation/bugs/scrounge-unaffordable-program-stalls-game.md
// Scrounge must never open an empty install prompt (which deadlocks the game)
// when paying its play cost leaves no program in the Heap affordable.
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.join(__dirname, '_headless-board.js'));

const setupCode = `
  var __reproEmpty = [], __reproScrounge;
  var __reproDP = DecisionPhase;
  DecisionPhase = function(player, choices, resolve, title) {
    if (!choices || choices.length === 0) __reproEmpty.push(String(title));
    return __reproDP.apply(this, arguments);
  };
  StartGame = function() {${OPENING}
    // Scrounge (play cost 1) in the Grip; Mayfly (install cost 1) the only program in the Heap; 1 credit.
    var scrounge = __reproScrounge = InstanceCardsPush(35004, runner.grip, 1, cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    var mayflyId = Number(Object.keys(cardSet).filter(function(k) { return cardSet[k].title === "Mayfly"; })[0]);
    InstanceCardsPush(mayflyId, runner.heap, 1, cardBackTexturesRunner, glowTextures, strengthTextures);
    runner.creditPool = 1; runner.clickTracker = 4; playerTurn = runner;
    runner.AI.preferred = {command: "play", cardToPlay: scrounge};
    ChangePhase(phases.runnerActionMain);
    Main();
  };
  __report = function() {
    return {emptyPrompts: __reproEmpty,
      scroungePlayed: runner.resolvingCards.indexOf(__reproScrounge) > -1 ||
        runner.heap.indexOf(__reproScrounge) > -1};
  };`;

playBoard({corp: 'Zwicky Supermodernism.js', runner: 'Magdalene CBB.js', setupCode}).then(game => {
  assert.ok(game.report.scroungePlayed, 'Scrounge was not played');
  assert.deepStrictEqual(game.report.emptyPrompts, [], 'an empty decision prompt was opened by: ' + game.report.emptyPrompts.join(', '));
  assert.ok(!game.errors.some(e => /^stalled/.test(e)), 'the game stalled: ' + game.errors.join('; '));
  assert.ok(game.winner, 'the game finished');
  console.log('Scrounge never opens an empty install prompt.');
}).catch(error => { console.log(error.message); process.exit(1); });
