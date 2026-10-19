'use strict';
// Each test file gets fresh counters, fixtures and temporary files.
module.exports = async function run(define) {
  const assert = require('assert');
  const fs = require('fs');
  const os = require('os');
  const path = require('path');
  const vm = require('vm');
  const {spawnSync} = require('child_process');
  const {createRealizedDefenseTracker, playGame} = require('../scripts/ai-batch/headless');
  const collector = require('../scripts/ai-batch/collectors/realizedIceByRootType');
  const {batchMetrics, compareReports} = require('../scripts/ai-batch/metrics');
  const {calibrateReports} = require('../scripts/ai-batch/calibration');
  const batch = require('../scripts/ai-batch');
  const {observationIdentity, measurementEvidence} = require('../scripts/ai-batch/defense-evidence');
  let passed = 0;
  const failures = [];
  async function check(name, test) {
    try { await test(); passed++; if (process.env.VERBOSE) console.log('ok ' + name); }
    catch (error) { failures.push(`FAIL ${name}: ${error.stack || error}`); }
  }
  const row = (rootType, iceCount, extra = {}) => ({rootType, iceCount, rootId: 1, commitmentId: 1, serverId: 1,
    turn: 1, rootAge: 0, revealed: false, multiRoot: false, posture: 'active', safety: 'allowedAtLastQuery', ...extra});
  function cohort(agenda, trap, count = 30) {
    return Array.from({length: count}, (_, i) => ({gameId: `pair:${i + 1}`, deckPairId: 'pair', errors: [], lifecycle: [],
      rows: [...agenda.map(n => row('agenda', n)), ...trap.map(n => row('trap', n))]
        .map((r, j) => ({...r, rootId: j + 1, commitmentId: j + 1, serverId: j + 1}))}));
  }
  function report(samples) {
    return {poolHash: 'synthetic', collectors: [collector.name], codeHash: 'synthetic', options: {}, starts: [],
      seeds: samples.map((_, i) => i + 1), games: samples.map((s, i) => ({ok: true, deckPairId: s.deckPairId, seed: i + 1,
        logHash: JSON.stringify(s.rows), metrics: {}, samples: {[collector.name]: s}}))};
  }
  const clone = value => JSON.parse(JSON.stringify(value));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'realized-defense-'));
  try {
    await define({
      assert,
      fs,
      os,
      path,
      vm,
      spawnSync,
      createRealizedDefenseTracker,
      playGame,
      collector,
      batchMetrics,
      compareReports,
      calibrateReports,
      batch,
      observationIdentity,
      measurementEvidence,
      check,
      row,
      cohort,
      report,
      clone,
      tmp
    });
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
  for (const failure of failures) console.error(failure);
  console.log(`Realized defense: ${passed}/${passed + failures.length} scenarios passed`);
  process.exitCode = failures.length ? 1 : 0;
};
