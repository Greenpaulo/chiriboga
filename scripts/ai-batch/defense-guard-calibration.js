#!/usr/bin/env node
'use strict';
// L8.9 Stage 1: saved controls only. Never imports or runs the game engine.
const fs = require('fs');
const crypto = require('crypto');
const {calibrateReports} = require('./calibration');
const defense = require('./collectors/realizedIceByRootType');
const bluff = require('./collectors/bluffSingleVariableCorrelation');
const GUARDS = ['realizedIceByRootType.posturedCountDistance',
  'realizedIceByRootType.allCountCorrelation', 'realizedIceByRootType.posturedCountCorrelation',
  'bluffSingleVariableCorrelation.max'];

function mergeControls(reports, {completeCase = false} = {}) {
  if (!reports.length) throw Error('No control reports');
  const first = reports[0], seeds = new Set(), games = [], failures = [];
  for (const report of reports) {
    for (const field of ['codeHash', 'poolHash', 'options', 'starts', 'collectors', 'pairs'])
      if (JSON.stringify(report[field]) !== JSON.stringify(first[field])) throw Error(`Controls differ in ${field}`);
    if (report.defenseObserver !== 'on' || report.quick || !report.seeds?.length || !report.pairs?.length)
      throw Error('Requires full observer-on controls');
    if (!Array.isArray(report.failures) || !Array.isArray(report.games)) throw Error('Missing control records');
    if (!completeCase && (report.failures.length || report.games.some(g => !g.ok)))
      throw Error('Failed control games: do not freeze');
    const gameKey = g => JSON.stringify([g.fixtureId || '', g.deckPairId, String(g.seed)]);
    const failed = new Map();
    for (const failure of report.failures) {
      const key = gameKey(failure);
      if (failed.has(key)) throw Error('Duplicate failure records');
      failed.set(key, failure);
    }
    for (const seed of report.seeds) {
      if (seeds.has(String(seed))) throw Error('Overlapping control seeds');
      seeds.add(String(seed));
    }
    const starts = report.starts.length ? report.starts.map(s => s.id) : [''];
    const expected = new Set(starts.flatMap(start => report.pairs.flatMap(pair => report.seeds.map(seed =>
      JSON.stringify([start || '', pair, String(seed)])))));
    for (const g of report.games) {
      const key = JSON.stringify([g.fixtureId || '', g.deckPairId, String(g.seed)]);
      if (!expected.delete(key)) throw Error('Unexpected or duplicate control game');
      if (g.ok === false) {
        const failure = failed.get(key);
        if (!failure || failure.reason !== g.reason || JSON.stringify(failure.errors) !== JSON.stringify(g.errors))
          throw Error('Mismatched failure records');
        failed.delete(key);
        continue; // Retain the failed record, but never require or consume its partial samples.
      }
      if (g.ok !== true || g.errors?.length) throw Error('Successful control game has invalid status or errors');
      if (!g.samples?.realizedIceByRootType || g.samples.realizedIceByRootType.errors?.length ||
          !Object.prototype.hasOwnProperty.call(g.samples, 'bluffSingleVariableCorrelation'))
        throw Error('Missing or invalid control samples');
    }
    if (expected.size) throw Error('Incomplete control report');
    if (failed.size) throw Error('Unmatched failure records');
    games.push(...report.games);
    failures.push(...report.failures);
  }
  return {...first, seeds: [...seeds].map(Number).sort((a, b) => a - b), games, failures};
}

// Count scheduled records, not snapshots: games without roots remain whole games.
function controlCoverage(report) {
  const strata = new Map();
  for (const g of report.games) {
    const key = JSON.stringify([g.fixtureId || '', g.deckPairId]);
    if (!strata.has(key)) strata.set(key, {fixtureId: g.fixtureId || null, deckPairId: g.deckPairId,
      scheduled: 0, successful: 0, failed: 0});
    const counts = strata.get(key);
    counts.scheduled++;
    counts[g.ok ? 'successful' : 'failed']++;
  }
  return [...strata.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, counts]) => counts);
}

function freezeMargins(metrics) {
  return Object.fromEntries(GUARDS.map(name => {
    const m = metrics[name];
    if (!m || ![m.low, m.high].every(Number.isFinite) || m.low > m.high)
      throw Error('Invalid calibration interval: ' + name);
    // Predeclared before extension results: symmetric 95% noise envelope.
    return [name, Math.ceil(Math.max(Math.abs(m.low), Math.abs(m.high)) * 1e6) / 1e6];
  }));
}

// Large-sample McNemar planning approximation (Stata pairedproportions formula 3,
// alpha/2 for two-sided 5%, 80% power). q is P(different winner in the pair).
function winRatePairs(q, drop = .02, zAlpha = 1.959963984540054, zPower = .8416212335729143) {
  if (![q, drop, zAlpha, zPower].every(Number.isFinite) || drop <= 0 || q < drop || q > 1 ||
      zAlpha <= 0 || zPower <= 0) throw Error('Invalid power assumptions');
  return Math.ceil(((zAlpha * Math.sqrt(q) + zPower * Math.sqrt(q - drop * drop)) / drop) ** 2);
}

function calibration(first, second, {completeCase = false} = {}) {
  // Complete scheduled records are required even when failed games are excluded
  // explicitly from the successful-game estimand. F11 owns that exclusion.
  mergeControls([first], {completeCase}); mergeControls([second], {completeCase});
  if (JSON.stringify(first.pairs) !== JSON.stringify(second.pairs)) throw Error('Controls differ in pairs');
  const selected = defense.forMetrics(GUARDS.filter(n => n.startsWith(defense.name + '.')));
  const a = calibrateReports(first, second, [selected]);
  const b = calibrateReports(first, second, [bluff]);
  const metrics = {...a.metrics, ...b.metrics};
  return {kind: 'L8.9 Stage 1 control-only guard freeze',
    rule: 'max(abs(low), abs(high)) of independent game-stratified bootstrap 95% difference interval, rounded upward to 6 decimals; declared before extension results',
    limits: ['Noise allowances, not independently justified acceptable-harm ceilings.',
      'No candidate results examined; no repair implemented.',
      'Paired win-rate power needs candidate/control winner discordance, which controls do not estimate.',
      ...(completeCase ? ['Complete-case intervals condition on baseline game completion; missingness need not be ignorable.',
        'Failed records are retained and reported; no partial samples, zero filling or replacement games are used.'] : [])],
    failureTreatment: completeCase ? 'explicit complete-case' : 'reject failures',
    games: a.games, droppedGames: a.droppedGames,
    scheduledGames: [first.games.length, second.games.length],
    failures: [first.failures, second.failures],
    stratumCounts: [controlCoverage(first), controlCoverage(second)],
    strata: a.strata, metrics, margins: freezeMargins(metrics),
    winRatePlanning: [.05, .1, .2, .5, 1].map(q => {
      const pairs = winRatePairs(q);
      return {discordance: q, pairs, seedsPerDeckPair: Math.ceil(pairs / 7),
        balancedPairs: 7 * Math.ceil(pairs / 7), games: 14 * Math.ceil(pairs / 7)};
    })};
}
if (require.main === module) {
  const args = process.argv.slice(2);
  const completeCase = args.includes('--complete-case');
  const paths = args.filter(arg => arg !== '--complete-case');
  if (paths.some(arg => arg.startsWith('--')) || paths.length !== 4)
    throw Error('usage: defense-guard-calibration.js [--complete-case] <on-1-200> <on-201-400> <on-401-800> <output.json>');
  const [one, two, extension, output] = paths;
  if (!output) throw Error('usage: defense-guard-calibration.js <on-1-200> <on-201-400> <on-401-800> <output.json>');
  const inputs = [one, two, extension].map(file => ({file, bytes: fs.readFileSync(file)}));
  const reports = inputs.map(s => JSON.parse(s.bytes));
  const result = calibration(mergeControls(reports.slice(0, 2), {completeCase}), reports[2], {completeCase});
  result.sources = inputs.map(({file, bytes}) => ({file, sha256: crypto.createHash('sha256').update(bytes).digest('hex')}));
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({games: result.games, droppedGames: result.droppedGames, margins: result.margins}));
}
module.exports = {GUARDS, mergeControls, controlCoverage, freezeMargins, winRatePairs, calibration};
