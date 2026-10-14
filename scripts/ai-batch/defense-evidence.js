'use strict';
// F12 measurement evidence: batch workers retain one fresh VM per game.
// No adoption verdict and no relaxation of F11's matching-seed rules.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawnSync} = require('child_process');
const {calibrateReports} = require('./calibration');
const {compareReports} = require('./metrics');
const collector = require('./collectors/realizedIceByRootType');

function observationIdentity(first, second) {
  for (const field of ['poolHash', 'seeds', 'starts', 'collectors', 'options', 'codeHash', 'pairs'])
    if (JSON.stringify(first[field]) !== JSON.stringify(second[field])) throw Error(`Identity reports differ in ${field}`);
  const key = game => JSON.stringify([game.fixtureId || '', game.deckPairId, String(game.seed)]);
  const index = games => {
    const map = new Map();
    for (const game of games) { if (map.has(key(game))) throw Error('Duplicate identity game'); map.set(key(game), game); }
    return map;
  };
  const arms = [first, second].map(r => index(r.games));
  const mismatches = [], failures = [];
  for (const [id, game] of arms[0]) {
    const other = arms[1].get(id);
    if (!other) { mismatches.push({key: id, why: 'missing observer game'}); continue; }
    if (!game.ok || !other.ok) { failures.push({key: id, baseline: game.errors, observer: other.errors}); continue; }
    for (const field of ['winner', 'turns', 'logHash', 'decisionHash'])
      if (game[field] !== other[field]) mismatches.push({key: id, field});
  }
  for (const id of arms[1].keys()) if (!arms[0].has(id)) mismatches.push({key: id, why: 'extra observer game'});
  const expected = first.pairs.length * first.seeds.length * Math.max(1, first.starts.length);
  return {pass: !mismatches.length && !failures.length && arms.every(arm => arm.size === expected),
    expected, successfulPairs: arms[0].size - failures.length, mismatches, failures};
}

function measurementEvidence(off, first, second) {
  for (const [label, report, expected] of [['off', off, 'off'], ['first', first, 'on'], ['second', second, 'on']])
    if (report.defenseObserver !== expected) throw Error(`Expected ${label} report defenseObserver to be '${expected}'`);
  const identity = observationIdentity(off, first);
  const identityMetrics = compareReports(first, first,
    {guard: Object.fromEntries(Object.keys(collector.directions).map(name => [name, 0.01]))}, [collector]);
  const calibratedMetrics = {};
  for (const name of Object.keys(collector.directions)) {
    try { calibratedMetrics[name] = {status: 'valid', ...calibrateReports(first, second, [collector.forMetrics([name])]).metrics[name]}; }
    catch (error) { calibratedMetrics[name] = {status: 'insufficient or invalid', why: error.message}; }
  }
  const calibration = {kind: 'independent calibration', metrics: calibratedMetrics,
    status: Object.values(calibratedMetrics).every(metric => metric.status === 'valid') ? 'valid' : 'insufficient or invalid'};
  const arm = report => ({sha: report.sha, dirty: report.dirty, codeHash: report.codeHash, poolHash: report.poolHash,
    pairs: report.pairs, seeds: report.seeds, options: report.options, command: report.command,
    games: report.games.length, failures: report.failures.length, defenseObserver: report.defenseObserver,
    metrics: report.batchMetrics, diagnostics: report.batchDiagnostics[collector.name]});
  return {kind: 'F12 passive measurement evidence', coverageRules: collector.COVERAGE,
    identity, sameSeedStatistics: identityMetrics.batchMetrics, calibration,
    cohorts: {off: arm(off), first: arm(first), second: arm(second)},
    limits: ['No AI policy adopted or consumer margin selected.',
      'Invalid cohort/draw statistics fail closed; no invalid draws are replaced with zero or omitted.',
      'Exposure and first-commitment diagnostics describe survival differences, not causal allocation.',
      'TV plug-in bias is visible through class/bin counts and independent-cohort precision; no debiasing claim.']};
}

function main() {
  const argv = process.argv.slice(2);
  const value = (flag, fallback) => { const at = argv.indexOf(flag); return at < 0 ? fallback : argv[at + 1]; };
  const directory = value('--out', '.ai-batch-cache/f12-2306f82');
  const jobs = value('--jobs', '3');
  fs.mkdirSync(directory, {recursive: true});
  const files = ['off-1-200.json', 'on-1-200.json', 'on-201-400.json'].map(file => path.join(directory, file));
  const commands = files.map((file, i) => ['scripts/ai-batch.js', '--pool', 'tests/fixtures/ai-batch/deck-pool.json',
    '--seeds', i === 2 ? '201-400' : '1-200', '--collector', collector.name,
    '--defense-observer', i === 0 ? 'off' : 'on', '--jobs', jobs, '--out', file]);
  if (!argv.includes('--reuse')) for (const args of commands) {
    console.log('Running: node ' + args.join(' '));
    const result = spawnSync(process.execPath, args, {stdio: 'inherit', timeout: 1800000});
    if (result.error || result.status !== 0) throw result.error || Error(`Batch exited ${result.status}`);
  }
  const reports = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  const evidence = measurementEvidence(...reports);
  evidence.reports = files.map(file => ({path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
  const output = path.join(directory, 'evidence.json');
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Identity: ${evidence.identity.successfulPairs}/${evidence.identity.expected} pairs; ${evidence.identity.mismatches.length} mismatches; ${evidence.identity.failures.length} failures`);
  for (const label of ['first', 'second']) {
    const arm = evidence.cohorts[label];
    console.log(`${label}: ${arm.games} games; ${arm.failures} failures; known posture ${(arm.diagnostics.coverage.knownPostureFraction * 100).toFixed(1)}%`);
    for (const [name, metric] of Object.entries(arm.metrics))
      console.log(`  ${name}: ${metric.value}; ${metric.valid ? `[${metric.low}, ${metric.high}]` : metric.why}; ${metric.invalidDraws} invalid draws`);
  }
  console.log('Independent calibration: ' + evidence.calibration.status + (evidence.calibration.why ? ' — ' + evidence.calibration.why : ''));
  console.log('Evidence: ' + output);
  process.exitCode = evidence.identity.pass ? 0 : 1;
}
if (require.main === module) main();
module.exports = {observationIdentity, measurementEvidence};
