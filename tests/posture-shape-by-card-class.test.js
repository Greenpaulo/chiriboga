'use strict';
const assert = require('assert');
const collector = require('../scripts/ai-batch/collectors/postureShapeByCardClass');
const {batchMetrics} = require('../scripts/ai-batch/metrics');
const batch = require('../scripts/ai-batch');
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
const shape = depth => ({targetIce: depth, openingAdvances: 1, delayTurns: 0});
const event = data => ({type: 'posture', ...data});
function samples(agendaDepth, trapDepth) {
  return Array.from({length: 10}, (_, i) => ({gameId: 'game-' + i, rows: [
    {rootType: 'agenda', cardId: 1, epoch: 1, shape: shape(agendaDepth(i))},
    {rootType: 'trap', cardId: 2, epoch: 1, shape: shape(trapDepth(i))},
  ]}));
}
test('independent histogram oracle: same, half overlap and disjoint', () => {
  for (const [a, b, expected] of [[() => 1, () => 1, 0], [() => 1, i => i < 5 ? 1 : 2, 0.5], [() => 1, () => 3, 1]]) {
    const games = samples(a, b);
    assert.strictEqual(collector.validateBatch(games), true);
    assert.strictEqual(collector.finishBatch(games).tv, expected);
  }
});
test('missing classes, few games, invalid shapes and unknown shapes fail closed', () => {
  const games = samples(() => 1, () => 2);
  assert.notStrictEqual(collector.validateBatch(games.slice(0, 4)), true);
  assert.notStrictEqual(collector.validateBatch(games.map(g => ({...g, rows: g.rows.slice(0, 1)}))), true);
  games[0].rows[0].shape.targetIce = 0;
  assert.notStrictEqual(collector.validateBatch(games), true);
  games[0].rows[0].shape = null;
  games[1].rows[0].shape = null;
  assert.notStrictEqual(collector.validateBatch(games), true);
});
test('count actual active commitments once; profiles may precede or follow the roll', () => {
  const game = {deckPairId: 'pair', seed: 1};
  const send = data => collector.onEvent(event(data), game);
  send({action: 'profile', cardId: 1, profile: shape(1)});
  send({action: 'roll', kind: 'bluff', isAgenda: 1, postured: 1, cardId: 1, epoch: 1});
  send({action: 'reuse', kind: 'bluff', postured: 1, cardId: 1, epoch: 1});
  send({action: 'roll', kind: 'bait', isAgenda: 0, postured: 1, cardId: 2, epoch: 1});
  send({action: 'profile', cardId: 2, profile: shape(2)});
  send({action: 'guard', kind: 'bait', cardId: 2, epoch: 2});
  send({action: 'roll', kind: 'bait', isAgenda: 0, postured: 0, cardId: 2, epoch: 2});
  send({action: 'profile', cardId: 1, profile: shape(3)});
  send({action: 'roll', kind: 'bluff', isAgenda: 1, postured: 1, cardId: 1, epoch: 3, profile: shape(3)});
  const rows = collector.samples(game).rows;
  assert.deepStrictEqual(rows.map(r => [r.rootType, r.shape.targetIce]), [['agenda', 1], ['trap', 2], ['agenda', 3]]);
  assert.strictEqual(collector.finish(game).commitments, 3);
});
test('hypothetical rolls and profiles cannot supply real shape evidence', () => {
  const game = {};
  collector.onEvent(event({action: 'profile', cardId: 1, profile: shape(3), hypothetical: true}), game);
  collector.onEvent(event({action: 'roll', kind: 'bluff', isAgenda: 1, postured: 1, cardId: 1, epoch: 1, hypothetical: true}), game);
  assert.strictEqual(collector.finish(game).commitments, 0);
  collector.onEvent(event({action: 'roll', kind: 'bluff', isAgenda: 1, postured: 1, cardId: 1, epoch: 1}), game);
  assert.strictEqual(collector.samples(game).rows[0].shape, null);
});
test('report aggregation computes strict intervals and refuses unusable samples', () => {
  const cohort = samples(() => 1, () => 1);
  const records = Array.from({length: 30}, (_, i) => ({ok: true,
    samples: {[collector.name]: {...cohort[i % cohort.length], gameId: 'record-' + i}}}));
  const result = batchMetrics([collector], records)[`${collector.name}.tv`];
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.value, 0);
  assert.strictEqual(result.low, 0);
  assert.strictEqual(result.high, 0);
  const absent = batchMetrics([collector], records.map(record => ({...record,
    samples: {[collector.name]: {...record.samples[collector.name], rows: []}}})))[`${collector.name}.tv`];
  assert.strictEqual(absent.valid, false);
  assert.strictEqual(absent.low, null);
  assert.strictEqual(absent.high, null);
});
test('missing strict reporting declarations are rejected before playing games', () => {
  const original = collector.metricNames;
  try {
    delete collector.metricNames;
    assert.throws(() => batch.buildConfig({collector: [collector.name]}), /must declare metricNames/);
  } finally { collector.metricNames = original; }
});
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
