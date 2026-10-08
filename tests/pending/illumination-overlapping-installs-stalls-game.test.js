'use strict';
// Pending reproduction: documentation/bugs/illumination-overlapping-installs-stalls-game.md
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));

const setupCode = `
  var reproPrompts = [];
  var reproDecisionPhase = DecisionPhase;
  DecisionPhase = function(player, choices, callback, title) {
    if (title === 'Illumination') {
      reproPrompts.push({
        pendingInstalls: runner.installingCards.map(function(card) { return card.title; }),
        credits: runner.creditPool,
        choices: choices.filter(function(choice) { return choice.card; }).map(function(choice) {
          return {card: choice.card.title, cost: InstallCost(choice.card)};
        })
      });
    }
    return reproDecisionPhase.apply(this, arguments);
  };
  __report = function() {
    return {prompts: reproPrompts, pendingInstalls: runner.installingCards.map(function(card) {
      return card.title;
    }), credits: runner.creditPool};
  };
  StartGame = function() {
    // Minimal reconstruction of seed 133's successful Illumination run:
    // 3 credits afford Principia (3 after discount) or Unity (2 after discount).
    runner.grip = [];
    runner.creditPool = 3;
    playerTurn = runner;
    ChangePhase(phases.runnerActionMain);
    var illumination = InstanceCardsPush(35025, runner.resolvingCards, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    var principia = InstanceCardsPush(35032, runner.grip, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    InstanceCardsPush(30026, runner.grip, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures);
    illumination.runningWithThis = true;
    illumination.responseOnRunSuccessful.Resolve.call(illumination);
    // Resolve an actual offered choice through the engine's decision phase.
    var choice = currentPhase.Enumerate.install().filter(function(option) {
      return option.card === principia;
    })[0];
    if (!choice) throw new Error('reproduction setup: Principia was not offered');
    currentPhase.Resolve.install(choice);
    // Stop at the sequencing boundary, before any payment. Install itself is real.
    __onWin(corp, 'reproduction observed install sequencing');
  };
`;

(async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'illumination-repro-'));
  const setupFile = path.join(directory, 'setup.js');
  try {
    fs.writeFileSync(setupFile, setupCode);
    const game = await playGame({streamPrefix: 'illumination-install-sequencing',
      corpFile: 'Gateway Corp.js', runnerFile: 'Gateway Runner.js',
      setFiles: ['sets/systemgateway.js', 'sets/elevation.js'],
      setupFile, timeoutMs: 5000});
    assert.deepStrictEqual(game.errors, [], 'reproduction must run without harness errors');
    assert.ok(game.report, 'reproduction must reach its report');
    assert.strictEqual(game.report.prompts.length >= 1, true, 'Illumination must offer the first install');
    assert.deepStrictEqual(game.report.pendingInstalls, ['Principia'], 'first install must be pending');
    assert.strictEqual(game.report.credits, 3, 'first install has not paid yet');
    if (process.env.VERBOSE) console.log(JSON.stringify(game.report));
    const premature = game.report.prompts.filter(prompt => prompt.pendingInstalls.length > 0);
    assert.deepStrictEqual(premature, [],
      'Illumination must wait for install completion before offering another install; premature prompts: ' +
      JSON.stringify(premature));
    console.log('Illumination install sequencing: 1 passed.');
  } finally {
    fs.rmSync(directory, {recursive: true, force: true});
  }
})().catch(error => {
  console.error('FAIL: ' + error.message);
  console.error('Illumination install sequencing: 1 failed.');
  process.exitCode = 1;
});
