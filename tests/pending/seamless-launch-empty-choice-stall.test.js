'use strict';
// Replays one recorded L8.9 baseline game. No policy or expectation workaround.
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const batch = require(path.join(root, 'scripts/ai-batch'));
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));
const config = batch.buildConfig(batch.parseArgs([
  '--pool', 'tests/fixtures/ai-batch/deck-pool.json', '--pairs', 'btl-kit',
  '--seeds', '632-632', '--jobs', '1', '--defense-observer', 'off',
  '--corp-option', 'postureEpochs=true', '--corp-option', 'matchLocalPostureFeedback=true',
  '--collector', 'realizedIceByRootType', '--collector', 'bluffSingleVariableCorrelation', '--collector', 'installOutcomes',
]));
const pair = config.pairs[0];
const collectors = config.collectorNames.map(name => require(path.join(root, 'scripts/ai-batch/collectors', name)));
const states = collectors.map(() => ({seed: '632', deckPairId: pair.id, fixtureId: null}));
(async () => {
  const game = await playGame({streamPrefix: '632:btl-kit', corpFile: pair.corp, runnerFile: pair.runner,
    setFiles: config.setFiles, timeoutMs: config.timeoutMs, corpOptions: config.corpOptions,
    runnerOptions: config.runnerOptions, securityCache: config.securityCache,
    realizedDefenseSnapshot: false, defenseObserver: 'off', telemetry: true, observe: true,
    onEvent: event => collectors.forEach((c, i) => c.onEvent(Object.freeze({...event}), states[i])),
  });
  assert.notStrictEqual(game.reason, 'stalled', 'Seamless Launch must not leave a phase with no legal commands');
  assert.deepStrictEqual(game.errors, [], 'game must complete without errors');
  assert.ok(game.winner, 'game must finish with a valid winner');
  console.log('Seamless Launch completion: passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
