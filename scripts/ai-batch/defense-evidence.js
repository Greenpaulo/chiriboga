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

function measurementEvidence(off, first, second, supplementalCollectors = []) {
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
  const supplementalCalibration = {};
  for (const extra of supplementalCollectors.filter(extra => typeof extra.finishBatch === 'function')) {
    try { supplementalCalibration[extra.name] = {status: 'valid', ...calibrateReports(first, second, [extra])}; }
    catch (error) { supplementalCalibration[extra.name] = {status: 'insufficient or invalid', why: error.message}; }
  }
  const arm = report => ({sha: report.sha, dirty: report.dirty, codeHash: report.codeHash, poolHash: report.poolHash,
    pairs: report.pairs, seeds: report.seeds, options: report.options, command: report.command,
    games: report.games.length, failures: report.failures.length, defenseObserver: report.defenseObserver,
    metrics: report.batchMetrics, diagnostics: report.batchDiagnostics[collector.name],
    supplementalDiagnostics: Object.fromEntries(supplementalCollectors.map(extra => [extra.name, report.batchDiagnostics[extra.name] || null]))});
  return {kind: 'F12 passive measurement evidence', coverageRules: collector.COVERAGE,
    identity, sameSeedStatistics: identityMetrics.batchMetrics, calibration, supplementalCalibration,
    cohorts: {off: arm(off), first: arm(first), second: arm(second)},
    limits: ['No AI policy adopted or consumer margin selected.',
      'Invalid cohort/draw statistics fail closed; no invalid draws are replaced with zero or omitted.',
      'Exposure and first-commitment diagnostics describe survival differences, not causal allocation.',
      'TV plug-in bias is visible through class/bin counts and independent-cohort precision; no debiasing claim.']};
}

// A game failure is a recorded observation, not a missing batch. Independent
// control calibration already accounts for failed games by deck-pair stratum.
// Process errors, stale files and incomplete reports must still stop the run.
function runControlBatch(args, output, invoke = spawnSync) {
  const config = require('../ai-batch').buildConfig(require('../ai-batch').parseArgs(args.slice(1)));
  const started = Date.now();
  const result = invoke(process.execPath, args, {stdio: 'inherit', timeout: 1800000});
  if (result.error || ![0, 1].includes(result.status)) throw result.error || Error(`Batch exited ${result.status}`);
  const report = JSON.parse(fs.readFileSync(output, 'utf8'));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if (report.kind !== 'ai-batch-report' || !(Date.parse(report.createdAt) >= started) ||
      report.command !== 'node ' + args.join(' ') || report.poolHash !== config.poolInfo.hash ||
      !same(report.pairs, config.pairs.map(pair => pair.id)) || !same(report.seeds, config.seeds) ||
      !same(report.starts, config.starts.map(start => ({id: start.id, hash: start.hash}))) ||
      !same(report.collectors, config.collectorNames) || report.defenseObserver !== config.defenseObserver)
    throw Error('Control batch did not save a fresh matching report: ' + output);
  const key = game => JSON.stringify([game.fixtureId || null, game.deckPairId, String(game.seed)]);
  const expected = new Set((report.starts.length ? report.starts : [{id: null}]).flatMap(start =>
    report.pairs.flatMap(pair => report.seeds.map(seed => key({fixtureId: start.id, deckPairId: pair, seed})))));
  const actual = new Set();
  for (const game of report.games || []) {
    const id = key(game);
    if (!expected.has(id) || actual.has(id) || typeof game.ok !== 'boolean')
      throw Error('Control report has invalid or duplicate game records: ' + output);
    actual.add(id);
  }
  const failures = report.games.filter(game => !game.ok).length;
  if (actual.size !== expected.size || !Array.isArray(report.failures) || report.failures.length !== failures ||
      result.status !== (failures ? 1 : 0)) throw Error('Control report is incomplete or inconsistent: ' + output);
  if (failures) console.log(`Retained completed control report with ${failures} failed game(s); calibration will report the missing games.`);
  return report;
}

// Evidence may only come from controls run with this measurement's cohort,
// observer, explicit Corp options and collectors. --reuse skips the batch run,
// so every loaded report is checked here, and every successful game must carry
// a sample for each sampled collector.
function checkControlReport(args, report, file, collectors) {
  const config = require('../ai-batch').buildConfig(require('../ai-batch').parseArgs(args.slice(1)));
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const corp = (report.options && report.options.corp) || {};
  const problems = [];
  if (report.kind !== 'ai-batch-report' || report.poolHash !== config.poolInfo.hash ||
      !same(report.pairs, config.pairs.map(pair => pair.id)) || !same(report.seeds, config.seeds) ||
      !same(report.starts, config.starts.map(start => ({id: start.id, hash: start.hash}))) ||
      report.defenseObserver !== config.defenseObserver) problems.push('cohort or observer differs');
  const missing = config.collectorNames.filter(name => !(report.collectors || []).includes(name));
  if (missing.length) problems.push('missing collector ' + missing.join(', '));
  const options = Object.entries(config.corpOptions).filter(([name, value]) => corp[name] !== value);
  if (options.length) problems.push('Corp option ' + options.map(([name, value]) => name + '=' + value).join(', ') + ' not used');
  for (const sampled of collectors.filter(c => typeof c.samples === 'function' && config.collectorNames.includes(c.name))) {
    if ((report.games || []).some(game => game.ok && !(game.samples && game.samples[sampled.name])))
      problems.push('games without ' + sampled.name + ' samples');
  }
  if (problems.length) throw Error('Control report does not match the requested measurement (' + problems.join('; ') + '): ' + file);
}

function main() {
  const argv = process.argv.slice(2);
  const value = (flag, fallback) => { const at = argv.indexOf(flag); return at < 0 ? fallback : argv[at + 1]; };
  const directory = value('--out', '.ai-batch-cache/f12-2306f82');
  const jobs = value('--jobs', '3');
  const extraNames = argv.flatMap((arg, i) => arg === '--collector' ? [argv[i + 1]] : []);
  const extras = [...new Set(extraNames)].filter(name => name !== collector.name).map(name => {
    if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9]*$/.test(name)) throw Error('Invalid collector name');
    const extra = require(path.join(__dirname, 'collectors', name + '.js'));
    if (extra.name !== name) throw Error('Collector name mismatch: ' + name);
    return extra;
  });
  fs.mkdirSync(directory, {recursive: true});
  const files = ['off-1-200.json', 'on-1-200.json', 'on-201-400.json'].map(file => path.join(directory, file));
  const commands = files.map((file, i) => ['scripts/ai-batch.js', '--pool', 'tests/fixtures/ai-batch/deck-pool.json',
    '--seeds', i === 2 ? '201-400' : '1-200', '--collector', collector.name,
    ...extras.flatMap(extra => ['--collector', extra.name]),
    '--corp-option', 'postureEpochs=true', '--corp-option', 'matchLocalPostureFeedback=true',
    '--defense-observer', i === 0 ? 'off' : 'on', '--jobs', jobs, '--out', file]);
  if (!argv.includes('--reuse')) for (const [index, args] of commands.entries()) {
    console.log('Running: node ' + args.join(' '));
    runControlBatch(args, files[index]);
  }
  const reports = files.map(file => JSON.parse(fs.readFileSync(file, 'utf8')));
  reports.forEach((report, index) => checkControlReport(commands[index], report, files[index], [collector, ...extras]));
  const evidence = measurementEvidence(...reports, extras);
  evidence.reports = files.map(file => ({path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}));
  const output = path.join(directory, 'evidence.json');
  fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + '\n');
  console.log(`Identity: ${evidence.identity.successfulPairs}/${evidence.identity.expected} pairs; ${evidence.identity.mismatches.length} mismatches; ${evidence.identity.failures.length} failures`);
  for (const label of ['first', 'second']) {
    const arm = evidence.cohorts[label];
    console.log(`${label}: ${arm.games} games; ${arm.failures} failures; known posture ${(arm.diagnostics.coverage.knownPostureFraction * 100).toFixed(1)}%`);
    for (const [name, metric] of Object.entries(arm.metrics)) {
      const interval = metric.valid === false ? metric.why : `[${metric.low}, ${metric.high}]`;
      const invalid = Number.isInteger(metric.invalidDraws) ? `; ${metric.invalidDraws} invalid draws` : '';
      console.log(`  ${name}: ${metric.value}; ${interval}${invalid}`);
    }
  }
  console.log('Independent calibration: ' + evidence.calibration.status + (evidence.calibration.why ? ' — ' + evidence.calibration.why : ''));
  for (const [name, result] of Object.entries(evidence.supplementalCalibration || {}))
    console.log(`${name}: ${JSON.stringify(result)}`);
  console.log('Evidence: ' + output);
  process.exitCode = evidence.identity.pass ? 0 : 1;
}
if (require.main === module) main();
module.exports = {observationIdentity, measurementEvidence, runControlBatch, checkControlReport};
