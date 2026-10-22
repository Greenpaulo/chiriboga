'use strict';
// Replays one recorded L8.9 baseline game. No policy or expectation workaround.
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const batch = require(path.join(root, 'scripts/ai-batch'));
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));
const config = batch.buildConfig(batch.parseArgs([
  '--pool', 'tests/fixtures/ai-batch/deck-pool.json', '--pairs', 'zwicky-magdalene',
  '--seeds', '576-576', '--jobs', '1', '--defense-observer', 'off',
  '--corp-option', 'postureEpochs=true', '--corp-option', 'matchLocalPostureFeedback=true',
  '--collector', 'realizedIceByRootType', '--collector', 'bluffSingleVariableCorrelation', '--collector', 'installOutcomes',
]));
const pair = config.pairs[0];
const collectors = config.collectorNames.map(name => require(path.join(root, 'scripts/ai-batch/collectors', name)));
const states = collectors.map(() => ({seed: '576', deckPairId: pair.id, fixtureId: null}));
(async () => {
  const game = await playGame({streamPrefix: '576:zwicky-magdalene', corpFile: pair.corp, runnerFile: pair.runner,
    setFiles: config.setFiles, timeoutMs: config.timeoutMs, corpOptions: config.corpOptions,
    runnerOptions: config.runnerOptions, securityCache: config.securityCache,
    realizedDefenseSnapshot: false, defenseObserver: 'off', telemetry: true, observe: true,
    onEvent: event => collectors.forEach((c, i) => c.onEvent(Object.freeze({...event}), states[i])),
  });
  assert.deepStrictEqual(game.errors, [], 'KPI must install into a new remote without an undefined helper');
  assert.ok(game.winner, 'game must finish with a valid winner');
  console.log('KPI new remote: passed');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
