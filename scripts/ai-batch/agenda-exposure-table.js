#!/usr/bin/env node
'use strict';
// I4: builds the agenda exposure table (CORP_AI_AGENDA_EXPOSURE_TABLE) from
// two remoteAgendaRisk batch reports and checks it on the held-out one.
//
//   node scripts/ai-batch/agenda-exposure-table.js --fit <report> --heldout <report> --out <calibration.json>
//
// Rows: advancement counters on the agenda (none, advanced = 1+) x public ICE
// (bare 0, single 1, multi 2+); columns: I2's margin buckets. Rate = agenda
// stolen in the Runner turn / remote-turns holding it. Each row is derived as
// I2's table is (thin cells merged, then non-decreasing in margin; see
// breach-hazard-table.js), so tests/agenda-exposure-table.test.js can
// re-derive it from the fit cells kept in the calibration file.
const fs = require('fs');
const hazard = require('./breach-hazard-table');

const COUNTER_GROUPS = ['none', 'advanced'];
const ICE_GROUPS = ['bare', 'single', 'multi'];
const counterGroup = counters => counters >= 1 ? 'advanced' : 'none';
const iceGroup = iceCount => iceCount >= 2 ? 'multi' : iceCount === 1 ? 'single' : 'bare';
const KEYS = COUNTER_GROUPS.flatMap(c => ICE_GROUPS.map(i => c + ':' + i));
const rowKey = row => counterGroup(row[2]) + ':' + iceGroup(row[0]);
const round = value => Math.round(value * 10000) / 10000;

// Pooled counts per row key x bucket. games: [{deckPairId, rows}].
function cellCounts(games) {
  const cells = Object.fromEntries(KEYS.map(key =>
    [key, Object.fromEntries(hazard.BUCKETS.map(bucket => [bucket, {turns: 0, breached: 0}]))]));
  for (const game of games) for (const row of game.rows) {
    const cell = cells[rowKey(row)][row[4]];
    cell.turns++; cell.breached += row[5];
  }
  return cells;
}

// {none: {bare: {bucket: rate}, single, multi}, advanced: {...}}
function deriveTable(fitCells) {
  return Object.fromEntries(COUNTER_GROUPS.map(c => [c, Object.fromEntries(ICE_GROUPS.map(i =>
    [i, hazard.deriveKind(fitCells[c + ':' + i])]))]));
}

// I2's held-out rule: every cell with RELIABILITY_MIN remote-turns contains its
// prediction in its game-clustered 95% interval; count-weighted MAE <= MAX_MAE.
function reliability(table, games) {
  const cells = cellCounts(games);
  const intervals = hazard.clusteredIntervals(games, row => [rowKey(row), row[4], row[5]]);
  const rows = [];
  let weighted = 0, total = 0, pass = true;
  for (const key of KEYS) {
    const [c, i] = key.split(':');
    for (const bucket of hazard.BUCKETS) {
      const cell = cells[key][bucket];
      if (!cell.turns) continue;
      const predicted = table[c][i][bucket], observed = cell.breached / cell.turns;
      const interval = intervals[key + '|' + bucket];
      const checked = cell.turns >= hazard.RELIABILITY_MIN;
      const contains = !!interval && interval[0] <= predicted && predicted <= interval[1];
      if (checked && !contains) pass = false;
      weighted += cell.turns * Math.abs(observed - predicted); total += cell.turns;
      rows.push({key, bucket, turns: cell.turns, predicted, observed: round(observed), interval, checked, contains});
    }
  }
  const mae = total ? round(weighted / total) : 0;
  if (mae > hazard.MAX_MAE) pass = false;
  return {pass, meanAbsoluteError: mae, rule: `every cell with >= ${hazard.RELIABILITY_MIN} remote-turns contains its prediction in its game-clustered 95% interval, and count-weighted MAE <= ${hazard.MAX_MAE}`, cells: rows};
}

const samplesOf = report => report.games.filter(game => game.ok).map(game =>
  ({deckPairId: game.deckPairId, seed: game.seed, rows: game.samples.remoteAgendaRisk}));

function build(fitReport, heldoutReport) {
  for (const field of ['poolHash', 'pairs', 'options'])
    if (JSON.stringify(fitReport[field]) !== JSON.stringify(heldoutReport[field]))
      throw new Error('Fit and held-out reports differ in ' + field);
  const fit = samplesOf(fitReport), heldout = samplesOf(heldoutReport);
  const fitCells = cellCounts(fit);
  const table = deriveTable(fitCells);
  const provenance = report => ({commit: report.sha, dirty: report.dirty, codeHash: report.codeHash,
    command: report.command, seeds: report.seeds[0] + '-' + report.seeds[report.seeds.length - 1],
    games: report.games.length, failures: report.failures.length});
  return {
    note: 'I4 agenda exposure calibration. Rows: advancement counters on the agenda (none / advanced = 1+) x public ICE on its remote (bare 0 / single 1 / multi 2+); columns: I2 breach-margin bucket at the start of the Runner turn. Rate = an agenda in the remote stolen that Runner turn / remote-turns. Measured against the stock Runner AI with default options (observational: the current policy chooses which agendas carry counters).',
    pool: fitReport.pool, poolHash: fitReport.poolHash, pairs: fitReport.pairs, options: fitReport.options,
    fitRun: provenance(fitReport), heldoutRun: provenance(heldoutReport),
    method: {minCell: hazard.MIN_CELL, reliabilityMin: hazard.RELIABILITY_MIN, maxMeanAbsoluteError: hazard.MAX_MAE,
      buckets: hazard.BUCKETS, counterGroups: COUNTER_GROUPS, iceGroups: ICE_GROUPS},
    fitCells, table,
    heldoutCells: cellCounts(heldout),
    reliability: reliability(table, heldout),
  };
}

module.exports = {COUNTER_GROUPS, ICE_GROUPS, KEYS, cellCounts, deriveTable, reliability, build};

if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
  const [fitFile, heldoutFile, outFile] = [arg('--fit'), arg('--heldout'), arg('--out')];
  if (!fitFile || !heldoutFile || !outFile) {
    console.error('usage: node scripts/ai-batch/agenda-exposure-table.js --fit <report> --heldout <report> --out <file>');
    process.exit(2);
  }
  const result = build(JSON.parse(fs.readFileSync(fitFile, 'utf8')), JSON.parse(fs.readFileSync(heldoutFile, 'utf8')));
  fs.writeFileSync(outFile, JSON.stringify(result, null, 1) + '\n');
  console.log('reliability ' + (result.reliability.pass ? 'passed' : 'failed') +
    ' (MAE ' + result.reliability.meanAbsoluteError + ')');
}
