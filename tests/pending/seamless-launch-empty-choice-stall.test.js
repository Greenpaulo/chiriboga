'use strict';
// Recorded L8.9 baseline and I4 candidate stalls. No expectation workaround.
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const batch = require(path.join(root, 'scripts/ai-batch'));
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));
async function reproduce(seed, extraArgs = []) {
const config = batch.buildConfig(batch.parseArgs([
  '--pool', 'tests/fixtures/ai-batch/deck-pool.json', '--pairs', 'btl-kit',
  '--seeds', `${seed}-${seed}`, '--jobs', '1', '--defense-observer', 'off',
  '--corp-option', 'postureEpochs=true', '--corp-option', 'matchLocalPostureFeedback=true',
  '--collector', 'realizedIceByRootType', '--collector', 'bluffSingleVariableCorrelation', '--collector', 'installOutcomes',
  ...extraArgs,
]));
const pair = config.pairs[0];
const collectors = config.collectorNames.map(name => require(path.join(root, 'scripts/ai-batch/collectors', name)));
const states = collectors.map(() => ({seed, deckPairId: pair.id, fixtureId: null}));
  const game = await playGame({streamPrefix: `${seed}:btl-kit`, corpFile: pair.corp, runnerFile: pair.runner,
    setFiles: config.setFiles, timeoutMs: config.timeoutMs, corpOptions: config.corpOptions,
    runnerOptions: config.runnerOptions, securityCache: config.securityCache,
    realizedDefenseSnapshot: config.defenseObserver !== 'off',
    defenseObserver: config.defenseObserver, telemetry: true, observe: true,
    onEvent: event => collectors.forEach((c, i) => c.onEvent(Object.freeze({...event}), states[i])),
  });
  assert.notStrictEqual(game.reason, 'stalled', 'Seamless Launch must not leave a phase with no legal commands');
  assert.deepStrictEqual(game.errors, [], 'game must complete without errors');
  assert.ok(game.winner, 'game must finish with a valid winner');
}
(async () => {
  let failures = 0;
  const cases = [
    ['632', []],
    ['7203', ['--defense-observer', 'on',
      '--corp-option', 'iceMarginalSecurity=true',
      '--corp-option', 'agendaCommitmentPlan=true',
      '--corp-option', 'agendaExposureTable=true',
      '--corp-option', 'agendaDestinationPlan=false',
      '--collector', 'stallTurns', '--collector', 'corpInsolventTurns',
      '--collector', 'agendaCommitment', '--collector', 'strandedUnrezzedIceCost']],
  ];
  for (const [seed, args] of cases) {
    try { await reproduce(seed, args); }
    catch (error) { failures++; console.error(`FAIL btl-kit seed ${seed}: ${error.stack || error}`); }
  }
  console.log(`Seamless Launch completion: ${cases.length - failures} passed, ${failures} failed`);
  if (failures) process.exitCode = 1;
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
