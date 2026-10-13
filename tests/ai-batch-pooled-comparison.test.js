'use strict';
const assert = require('assert');
const {compareReports, seededRandom} = require('../scripts/ai-batch/metrics');
const {calibrateReports} = require('../scripts/ai-batch/calibration');
const corr = require('../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
const collector = {name: 'pool', directions: {'pool.mean': 'lower'}, batchResamples: 1000,
  finishBatch: games => { const values = games.flat(); return {mean: values.reduce((a, b) => a + b, 0) / values.length}; }};
const report = values => ({poolHash: 'p', seeds: values.map((_, i) => i + 1), starts: [], collectors: ['pool'],
  options: {}, codeHash: 'code', games: values.map((samples, i) => ({ok: true, deckPairId: 'a', seed: i + 1,
    metrics: {}, samples: {pool: samples}}))});
const compare = (a, b, gate = {improve: ['pool.mean']}, c = collector) => compareReports(a, b, gate, [c]);
const base = report([[1], [3, 3, 3]]), shifted = report([[0], [2, 2, 2]]);
const result = compare(base, shifted);
assert.strictEqual(result.pass, true);
assert.strictEqual(result.batchMetrics['pool.mean'].baseline, 2.5, 'pooled mean is not mean of game means');
assert.deepStrictEqual([result.batchMetrics['pool.mean'].low, result.batchMetrics['pool.mean'].high], [-1, -1],
  'identical indices preserve a constant shift even with unequal game sample sizes');
assert.deepStrictEqual(compare(base, shifted), result);
assert.strictEqual(compare(base, base).pass, false, 'identity cannot improve');
assert.strictEqual(compare(base, base, {guard: {'pool.mean': 0}}).pass, false, 'strict zero tolerance');
assert.strictEqual(compare(base, base, {guard: {'pool.mean': 0.00001}}).pass, true);
for (const tolerance of [NaN, Infinity, -1, '1'])
  assert.strictEqual(compare(base, shifted, {guard: {'pool.mean': tolerance}}).pass, false);
assert.strictEqual(compare(shifted, base, {guard: {'pool.mean': 1}}).pass, false, 'equality fails');
assert.strictEqual(compare(shifted, base, {guard: {'pool.mean': 1.00001}}).pass, true, 'no rounding of bounds');
assert.strictEqual(compare(base, shifted, {improve: ['pool.mean'], better: {'pool.mean': 'higher'}}).pass, false);
assert.strictEqual(compare(shifted, base, {improve: ['pool.mean'], better: {'pool.mean': 'higher'}}).pass, true);
assert.strictEqual(compare(base, shifted, {improve: ['pool.mean']}, {...collector, directions: {}}).pass, false);
assert.strictEqual(compare(base, report([[0], [4, 4, 4]])).pass, false, 'crossing-zero interval fails improvement');
for (const field of ['poolHash', 'seeds', 'starts', 'collectors'])
  assert.throws(() => compare(base, {...shifted, [field]: ['different']}), new RegExp('differ in ' + field));
const clone = value => JSON.parse(JSON.stringify(value));
for (const mutate of [r => delete r.games[0].samples, r => r.games[0].samples.pool = [NaN], r => r.games.forEach(g => g.samples.pool = []),
  r => r.games.forEach(g => g.ok = false)]) {
  const bad = clone(base); mutate(bad);
  assert.strictEqual(compare(bad, shifted).pass, false, 'missing/invalid/empty comparisons fail');
}
assert.strictEqual(compare(base, shifted, {guard: {'pool.absent': 1}}).pass, false);
assert.strictEqual(compare(base, shifted, undefined, {...collector, finishBatch: () => ({mean: Infinity})}).pass, false);
assert.strictEqual(compare(base, shifted, undefined, {...collector, batchResamples: 0}).pass, false);
const duplicated = clone(base); duplicated.games.push(duplicated.games[0]);
assert.throws(() => compare(duplicated, shifted), /Duplicate game key/);
const hashed = clone(base); hashed.games.forEach(g => g.logHash = 'same');
assert.strictEqual(compare(hashed, hashed, {guard: {'pool.mean': 1}}).pass, false, 'option effect still required');
const perGame = clone(base); perGame.games.forEach(g => g.metrics['pool.decisions'] = 2);
assert.strictEqual(compare(perGame, perGame, {guard: {'pool.decisions': 1}, better: {'pool.decisions': 'lower'}}).pass, true);

// Independently enumerate the nonlinear two-game pooled statistic's support.
const nonlinear = {...collector, name: 'square', directions: {'square.value': 'higher'},
  finishBatch: games => ({value: (games.flat().reduce((a, b) => a + b, 0) / games.flat().length) ** 2})};
const squareReport = values => { const r = report(values); r.collectors = ['square'];
  r.games.forEach(g => {g.samples = {square: g.samples.pool};}); return r; };
const squared = compare(squareReport([[0], [2]]), squareReport([[1], [3]]), {improve: ['square.value']}, nonlinear);
assert.strictEqual(squared.batchMetrics['square.value'].difference, 3);
assert.strictEqual(squared.batchMetrics['square.value'].low, 1);
assert.strictEqual(squared.batchMetrics['square.value'].high, 5);

const rows = Array.from({length: 6}, (_, i) => ({k: 'p', postured: i % 2, isAgenda: 0,
  v: corr.VARIABLES.map(() => i)}));
assert.strictEqual(corr.validateBatch([rows]), true);
assert.notStrictEqual(corr.validateBatch([rows.map(row => ({...row, postured: 1}))]), true);
assert.notStrictEqual(corr.validateBatch([[{...rows[0], v: [1]}]]), true);
const correlationReport = values => {const r = report(values); r.collectors = [corr.name];
  r.games.forEach(g => {g.samples = {[corr.name]: g.samples.pool};}); return r;};
const invalidDraw = correlationReport([rows.slice(0, 3).map(row => ({...row, postured: 0})),
  rows.slice(3).map(row => ({...row, postured: 1}))]);
const failedDraw = compare(invalidDraw, invalidDraw, {guard: {[corr.name + '.max']: 1}}, corr);
assert.strictEqual(failedDraw.pass, false, 'an undefined bootstrap draw fails instead of being omitted');
assert.match(failedDraw.batchMetrics[corr.name + '.max'].why, /no usable correlation/);

// Calibration must draw each cohort independently and preserve stratum sizes.
const cohort = (seedOffset, shift) => {
  const r = report([[0 + shift], [2 + shift], [10 + shift], [12 + shift]]);
  r.seeds = r.seeds.map(seed => seed + seedOffset);
  r.games.forEach((g, i) => {g.seed += seedOffset; g.deckPairId = i < 2 ? 'a' : 'b';});
  return r;
};
const first = cohort(0, 0), second = cohort(10, 0);
const calibrated = calibrateReports(first, second, [collector]);
assert.deepStrictEqual(calibrated, calibrateReports(first, second, [collector]));
assert.strictEqual(calibrated.kind, 'independent calibration');
assert.strictEqual(calibrated.metrics['pool.mean'].difference, 0);
assert.ok(calibrated.metrics['pool.mean'].low < 0 && calibrated.metrics['pool.mean'].high > 0,
  'same-policy disjoint cohorts measure noise instead of identity');
const draws = [], random = seededRandom('f11-independent-calibration:pool');
for (let n = 0; n < collector.batchResamples; n++) {
  const armMeans = [0, 1].map(() => {
    const selected = [0, 0, 10, 10].map(offset => offset + 2 * Math.floor(random() * 2));
    return selected.reduce((a, b) => a + b, 0) / 4;
  });
  draws.push(armMeans[1] - armMeans[0]);
}
draws.sort((a, b) => a - b);
assert.strictEqual(calibrated.metrics['pool.mean'].low, draws[25]);
assert.strictEqual(calibrated.metrics['pool.mean'].high, draws[974]);
assert.throws(() => compare(first, second), /differ in seeds/, 'calibration never bypasses adoption matching');
assert.throws(() => calibrateReports(first, first, [collector]), /disjoint/);
const stringSeeds = clone(first); stringSeeds.seeds = stringSeeds.seeds.map(String);
assert.throws(() => calibrateReports(first, stringSeeds, [collector]), /disjoint/);
for (const field of ['poolHash', 'starts', 'collectors', 'codeHash'])
  assert.throws(() => calibrateReports(first, {...second, [field]: ['different']}, [collector]), new RegExp(field));
const failedCohort = clone(second); failedCohort.games[0].ok = false;
assert.deepStrictEqual(calibrateReports(first, failedCohort, [collector]).droppedGames, [0, 1]);
const fixtures = clone(second); fixtures.games[0].fixtureId = 'other';
assert.throws(() => calibrateReports(first, fixtures, [collector]), /matching.*strata/);
const differentPolicy = clone(second); differentPolicy.options = {corp: {option: true}};
assert.throws(() => calibrateReports(first, differentPolicy, [collector]), /options/);
const missingStratum = clone(second); missingStratum.games = missingStratum.games.filter(g => g.deckPairId === 'a');
assert.throws(() => calibrateReports(first, missingStratum, [collector]), /matching.*strata/);
const missingSamples = clone(second); delete missingSamples.games[0].samples;
assert.throws(() => calibrateReports(first, missingSamples, [collector]), /Missing calibration samples/);
console.log('Paired pooled statistics and independent calibration passed.');

