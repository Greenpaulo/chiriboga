#!/usr/bin/env node
'use strict';
// I2 M2: builds the breach-hazard table (CORP_AI_BREACH_HAZARD_TABLE) and
// CORP_AI_POINT_VALUE from securityCalibration batch reports, and runs the
// held-out reliability, next-turn and one-ICE checks.
//
//   node scripts/ai-batch/breach-hazard-table.js --fit <report> --heldout <report> --out <calibration.json>
//
// The table is derived only from the fit cells kept in the calibration file,
// so tests/breach-hazard-table.test.js can re-derive it without the reports.
// Within each server kind, buckets are ordered by margin (lockout lowest);
// cells under MIN_CELL server-turns are merged with a neighbour, then
// pool-adjacent-violators makes the rates non-decreasing in margin. The
// `unknown` bucket has no margin order: it keeps its own rate when it has
// MIN_CELL server-turns, else the kind's pooled rate.
// When one-ICE and multi-ICE servers differ at equal margin (oneIceSplit),
// each kind is split by public ICE count, `single` (0 or 1 ICE) and `multi`
// (2 or more), and the reliability check is rerun on the split table. The
// next-turn rows carry no ICE count, so that check uses the unsplit table.
const fs = require('fs');
const path = require('path');

const KINDS = ['agendaRemote', 'otherRemote', 'hq', 'rd', 'archives'];
const ORDERED = ['lockout', '<=-4', '-3..-1', '0..1', '2..4', '5..9', '>=10'];
const BUCKETS = ORDERED.concat(['unknown']);
const MIN_CELL = 200;
const RELIABILITY_MIN = 100;
const MAX_MAE = 0.05;
const RESAMPLES = 2000;
const root = path.resolve(__dirname, '../..');

const ICE_GROUPS = ['single', 'multi'];
const iceGroup = iceCount => iceCount >= 2 ? 'multi' : 'single';
const SPLIT_KEYS = KINDS.flatMap(kind => ICE_GROUPS.map(group => kind + ':' + group));
const blankCells = keys => Object.fromEntries(keys.map(key =>
  [key, Object.fromEntries(BUCKETS.map(bucket => [bucket, {turns: 0, breached: 0}]))]));

// Pooled counts per kind (or kind:iceGroup) x bucket of one kind of sample row.
function cellCounts(games, field = 'rows', split = false) {
  const cells = blankCells(split ? SPLIT_KEYS : KINDS);
  for (const game of games) {
    for (const row of game[field]) {
      const breached = field === 'rows' ? row[3] : row[2];
      const cell = cells[split ? row[0] + ':' + iceGroup(row[2]) : row[0]][row[1]];
      cell.turns++; cell.breached += breached;
    }
  }
  return cells;
}

const rate = cell => cell.turns ? cell.breached / cell.turns : 0;
const round = value => Math.round(value * 10000) / 10000;

function deriveKind(cells) {
  // Merge thin blocks: the thinnest first, into its thinner neighbour
  // (ties go to the lower-margin side).
  let blocks = ORDERED.map(bucket => ({buckets: [bucket], turns: cells[bucket].turns, breached: cells[bucket].breached}));
  for (;;) {
    let thin = -1;
    blocks.forEach((block, i) => {
      if (block.turns < MIN_CELL && blocks.length > 1 && (thin < 0 || block.turns < blocks[thin].turns)) thin = i;
    });
    if (thin < 0) break;
    const left = thin - 1, right = thin + 1;
    const into = left < 0 ? right : right >= blocks.length ? left
      : blocks[left].turns <= blocks[right].turns ? left : right;
    const [a, b] = [Math.min(thin, into), Math.max(thin, into)];
    blocks.splice(a, 2, {buckets: blocks[a].buckets.concat(blocks[b].buckets),
      turns: blocks[a].turns + blocks[b].turns, breached: blocks[a].breached + blocks[b].breached});
  }
  // Pool adjacent violators (weighted by server-turns).
  const pooled = [];
  for (const block of blocks) {
    pooled.push(Object.assign({}, block));
    while (pooled.length > 1 && rate(pooled[pooled.length - 2]) > rate(pooled[pooled.length - 1])) {
      const last = pooled.pop(), previous = pooled.pop();
      pooled.push({buckets: previous.buckets.concat(last.buckets),
        turns: previous.turns + last.turns, breached: previous.breached + last.breached});
    }
  }
  const out = {};
  for (const block of pooled) for (const bucket of block.buckets) out[bucket] = round(rate(block));
  const all = BUCKETS.reduce((sum, bucket) => ({turns: sum.turns + cells[bucket].turns,
    breached: sum.breached + cells[bucket].breached}), {turns: 0, breached: 0});
  out.unknown = round(cells.unknown.turns >= MIN_CELL ? rate(cells.unknown) : rate(all));
  return out;
}

// Unsplit cells give {kind: {bucket: rate}}; split cells (kind:group keys)
// give {kind: {single: {bucket: rate}, multi: {...}}}.
function deriveTable(fitCells) {
  if (!Object.keys(fitCells).some(key => key.includes(':')))
    return Object.fromEntries(KINDS.map(kind => [kind, deriveKind(fitCells[kind])]));
  return Object.fromEntries(KINDS.map(kind => [kind, Object.fromEntries(ICE_GROUPS.map(group =>
    [group, deriveKind(fitCells[kind + ':' + group])]))]));
}

// Deterministic generator for the bootstrap.
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Game-clustered 95% interval of each kind x bucket rate (games resampled
// within deck pairs). `select(row)` returns [kind, bucket, breached] or null.
function clusteredIntervals(games, select) {
  const strata = new Map();
  for (const game of games) {
    const counts = new Map();
    for (const row of game.rows) {
      const picked = select(row);
      if (!picked) continue;
      const key = picked[0] + '|' + picked[1];
      const cell = counts.get(key) || {turns: 0, breached: 0};
      cell.turns++; cell.breached += picked[2];
      counts.set(key, cell);
    }
    if (!strata.has(game.deckPairId)) strata.set(game.deckPairId, []);
    strata.get(game.deckPairId).push(counts);
  }
  const keys = new Set();
  for (const list of strata.values()) for (const counts of list) for (const key of counts.keys()) keys.add(key);
  const random = rng(20261016);
  const samples = new Map([...keys].map(key => [key, []]));
  for (let r = 0; r < RESAMPLES; r++) {
    const totals = new Map();
    for (const list of strata.values()) {
      for (let i = 0; i < list.length; i++) {
        for (const [key, cell] of list[Math.floor(random() * list.length)]) {
          const total = totals.get(key) || {turns: 0, breached: 0};
          total.turns += cell.turns; total.breached += cell.breached;
          totals.set(key, total);
        }
      }
    }
    for (const key of keys) {
      const total = totals.get(key);
      if (total && total.turns) samples.get(key).push(total.breached / total.turns);
    }
  }
  const out = {};
  for (const [key, values] of samples) {
    values.sort((a, b) => a - b);
    out[key] = values.length ? [round(values[Math.floor(0.025 * (values.length - 1))]),
      round(values[Math.ceil(0.975 * (values.length - 1))])] : null;
  }
  return out;
}

// Predicted versus observed per cell; passes when every cell with at least
// RELIABILITY_MIN server-turns contains its prediction in its interval and the
// count-weighted mean absolute error is at most MAX_MAE.
function reliability(table, games, field) {
  const pick = field === 'next'
    ? games.map(game => ({deckPairId: game.deckPairId, rows: game.next.map(row => [row[0], row[1], 0, row[2]])}))
    : games;
  const split = typeof table.hq.single == 'object';
  if (split && field === 'next') throw new Error('next-turn rows carry no ICE count');
  const cells = cellCounts(pick, 'rows', split);
  const intervals = clusteredIntervals(pick, row => [split ? row[0] + ':' + iceGroup(row[2]) : row[0], row[1], row[3]]);
  const rows = [];
  let weighted = 0, total = 0, pass = true;
  for (const kind of Object.keys(cells)) {
    const row = split ? table[kind.split(':')[0]][kind.split(':')[1]] : table[kind];
    for (const bucket of BUCKETS) {
      const cell = cells[kind][bucket];
      if (!cell.turns) continue;
      const predicted = row[bucket], observed = rate(cell);
      const interval = intervals[kind + '|' + bucket];
      const checked = cell.turns >= RELIABILITY_MIN;
      const contains = !!interval && interval[0] <= predicted && predicted <= interval[1];
      if (checked && !contains) pass = false;
      weighted += cell.turns * Math.abs(observed - predicted); total += cell.turns;
      rows.push({kind, bucket, turns: cell.turns, predicted, observed: round(observed), interval, checked, contains});
    }
  }
  const mae = total ? round(weighted / total) : 0;
  if (mae > MAX_MAE) pass = false;
  return {pass, meanAbsoluteError: mae, rule: `every cell with >= ${RELIABILITY_MIN} server-turns contains its prediction in its game-clustered 95% interval, and count-weighted MAE <= ${MAX_MAE}`, cells: rows};
}

// One-ICE versus multi-ICE servers at equal kind x bucket: the interval of the
// difference in breach rate, where both groups have RELIABILITY_MIN server-turns.
function oneIceSplit(games) {
  const group = iceCount => iceCount === 1 ? 'one' : iceCount >= 2 ? 'multi' : null;
  const intervals = clusteredIntervals(games, row => group(row[2]) && [row[0] + ':' + group(row[2]), row[1], row[3]]);
  const counts = {};
  for (const game of games) for (const row of game.rows) {
    const g = group(row[2]);
    if (!g) continue;
    const cell = ((counts[row[0] + ':' + g] ||= {})[row[1]] ||= {turns: 0, breached: 0});
    cell.turns++; cell.breached += row[3];
  }
  const rows = [];
  for (const kind of KINDS) for (const bucket of BUCKETS) {
    const one = counts[kind + ':one']?.[bucket], multi = counts[kind + ':multi']?.[bucket];
    if (!one || !multi || one.turns < RELIABILITY_MIN || multi.turns < RELIABILITY_MIN) continue;
    const a = intervals[kind + ':one|' + bucket], b = intervals[kind + ':multi|' + bucket];
    const separated = !!a && !!b && (a[0] > b[1] || b[0] > a[1]);
    rows.push({kind, bucket, one: {turns: one.turns, rate: round(rate(one)), interval: a},
      multi: {turns: multi.turns, rate: round(rate(multi)), interval: b}, separated});
  }
  return {differ: rows.some(row => row.separated),
    rule: 'one-ICE and multi-ICE intervals do not overlap in a kind x bucket where both have >= ' + RELIABILITY_MIN + ' server-turns', cells: rows};
}

// Credit-equivalents per agenda point over the agenda copies in the pool's
// Corp decks: (advancementRequirement x 2 + 1) / agendaPoints.
function pointValue(poolFile) {
  const pool = JSON.parse(fs.readFileSync(poolFile, 'utf8'));
  const config = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
  const agendas = new Map();
  for (const key of pool.sets) {
    const file = new RegExp(key + '\\s*:\\s*\\{[^}]*?file\\s*:\\s*"([^"]+)"').exec(config);
    const source = fs.readFileSync(path.join(root, 'sets', (file ? file[1] : key) + '.js'), 'utf8');
    for (const block of source.split(/\ncardSet\[/).slice(1)) {
      const id = /^(\d+)\]/.exec(block);
      if (!id || !/cardType:\s*"agenda"/.test(block)) continue;
      const points = /agendaPoints:\s*(\d+)/.exec(block), advance = /advancementRequirement:\s*(\d+)/.exec(block);
      if (points && advance) agendas.set(id[1], {points: Number(points[1]), advance: Number(advance[1])});
    }
  }
  let sum = 0, copies = 0;
  for (const pair of pool.pairs) {
    const deck = fs.readFileSync(path.join(root, 'precons', pair.corp), 'utf8');
    for (const [, id, count] of deck.matchAll(/"(\d+)":\s*(\d+)/g)) {
      const agenda = agendas.get(id);
      if (!agenda || !agenda.points) continue;
      sum += Number(count) * (agenda.advance * 2 + 1) / agenda.points; copies += Number(count);
    }
  }
  return {value: Math.round(sum / copies * 100) / 100, agendaCopies: copies,
    formula: 'mean over agenda copies in the pool Corp decks of (advancementRequirement x 2 + 1) / agendaPoints'};
}

const samplesOf = report => report.games.filter(game => game.ok).map(game =>
  Object.assign({deckPairId: game.deckPairId, seed: game.seed}, game.samples.securityCalibration));

function build(fitReport, heldoutReport) {
  for (const field of ['poolHash', 'pairs', 'options'])
    if (JSON.stringify(fitReport[field]) !== JSON.stringify(heldoutReport[field]))
      throw new Error('Fit and held-out reports differ in ' + field);
  const fit = samplesOf(fitReport), heldout = samplesOf(heldoutReport);
  const unsplitFitCells = cellCounts(fit);
  const unsplitTable = deriveTable(unsplitFitCells);
  const oneIce = oneIceSplit(fit.concat(heldout));
  const fitCells = oneIce.differ ? cellCounts(fit, 'rows', true) : unsplitFitCells;
  const table = oneIce.differ ? deriveTable(fitCells) : unsplitTable;
  const provenance = report => ({commit: report.sha, dirty: report.dirty, codeHash: report.codeHash,
    command: report.command, seeds: report.seeds[0] + '-' + report.seeds[report.seeds.length - 1],
    games: report.games.length, failures: report.failures.length});
  return {
    note: 'I2 phase A breach-hazard calibration. Table rows: server kind (true root type, harness-only); columns: breach-margin bucket. Rate = successful runs on the server in the Runner turn after the snapshot / server-turns. Measured against the stock Runner AI with default options.',
    pool: fitReport.pool, poolHash: fitReport.poolHash, pairs: fitReport.pairs, options: fitReport.options,
    fitRun: provenance(fitReport), heldoutRun: provenance(heldoutReport),
    method: {minCell: MIN_CELL, reliabilityMin: RELIABILITY_MIN, maxMeanAbsoluteError: MAX_MAE, resamples: RESAMPLES,
      buckets: BUCKETS, kinds: KINDS},
    pointValue: pointValue(path.join(root, fitReport.pool.file)),
    unsplit: {fitCells: unsplitFitCells, table: unsplitTable, heldoutCells: cellCounts(heldout),
      reliability: reliability(unsplitTable, heldout, 'rows')},
    oneIce,
    split: oneIce.differ,
    fitCells, table,
    heldoutCells: cellCounts(heldout, 'rows', oneIce.differ),
    reliability: reliability(table, heldout, 'rows'),
    nextTurn: reliability(unsplitTable, heldout, 'next'),
  };
}

module.exports = {KINDS, ORDERED, BUCKETS, ICE_GROUPS, MIN_CELL, cellCounts, deriveTable, reliability, oneIceSplit, pointValue, build};

if (require.main === module) {
  const args = process.argv.slice(2);
  const arg = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1]; };
  const [fitFile, heldoutFile, outFile] = [arg('--fit'), arg('--heldout'), arg('--out')];
  if (!fitFile || !heldoutFile || !outFile) {
    console.error('usage: node scripts/ai-batch/breach-hazard-table.js --fit <report> --heldout <report> --out <file>');
    process.exit(2);
  }
  const result = build(JSON.parse(fs.readFileSync(fitFile, 'utf8')), JSON.parse(fs.readFileSync(heldoutFile, 'utf8')));
  fs.writeFileSync(outFile, JSON.stringify(result, null, 1) + '\n');
  console.log('POINT_VALUE ' + result.pointValue.value + '; unsplit reliability ' +
    (result.unsplit.reliability.pass ? 'passed' : 'failed') + ' (MAE ' + result.unsplit.reliability.meanAbsoluteError +
    '); table reliability ' + (result.reliability.pass ? 'passed' : 'failed') +
    ' (MAE ' + result.reliability.meanAbsoluteError + '); next-turn ' + (result.nextTurn.pass ? 'passed' : 'failed') +
    ' (MAE ' + result.nextTurn.meanAbsoluteError + '); one-ICE split ' + (result.oneIce.differ ? 'differs' : 'does not differ'));
}
