'use strict';
// Corp AI choice helpers must accept a null-card option ("Skip install",
// "Decline", "Done"), which many cards offer; documentation/bugs/corp-install-choice-crashes-on-null-skip-option.md.
// Each helper is called directly inside a real headless game context.
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.join(__dirname, '_headless-board.js'));

const setupCode = `
  var __reproResults = {};
  StartGame = function() {${OPENING}
    playerTurn = corp; corp.creditPool = 5; corp.clickTracker = 3;
    ChangePhase(phases.corpActionMain);
    var skip = {card: null, label: "Skip install", button: "Skip install"};
    var hand = corp.HQ.cards.slice(0, 3).map(function(c) { return {card: c, label: c.title}; });
    var run = function(name, fn) {
      try { __reproResults[name] = {ok: true, value: fn()}; }
      catch (e) { __reproResults[name] = {ok: false, error: String(e)}; }
    };
    run("bestInstallOnlySkip", function() { return corp.AI._bestInstallOption([skip]); });
    run("bestInstallWithCards", function() {
      var options = [skip].concat(hand);
      var i = corp.AI._bestInstallOption(options);
      return i < 0 ? "none" : options[i].card === null ? "skip" : "card";
    });
    run("reducedDiscard", function() { return corp.AI._reducedDiscardList([skip].concat(hand), 1, 1).length; });
    PlayerWin(corp, "test finished");
  };
  __report = function() { return __reproResults; };`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  const r = game.report;
  const failures = [];
  for (const [name, result] of Object.entries(r)) if (!result.ok) failures.push(name + ' threw ' + result.error);
  if (!failures.length) {
    if (r.bestInstallOnlySkip.value !== -1) failures.push('only a skip option: expected -1 (nothing to rank), got ' + r.bestInstallOnlySkip.value);
    if (r.bestInstallWithCards.value === 'skip') failures.push('the skip option was ranked as a card to install');
    if (r.reducedDiscard.value !== 1) failures.push('reduced discard list should keep exactly 1 option, got ' + r.reducedDiscard.value);
  }
  if (process.env.VERBOSE) console.log(JSON.stringify(r));
  assert.deepStrictEqual(failures, []);
  console.log('Corp AI choice helpers accept null-card options.');
}).catch(error => { console.log(error.message); process.exit(1); });
