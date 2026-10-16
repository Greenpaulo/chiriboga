// Run with: node tests/security-calibration-collector.test.js
// L9.0 securityCalibration collector, driven through a scripted event sequence.
const assert = require('assert');
const collector = require('../scripts/ai-batch/collectors/securityCalibration.js');
const {flattenCollector} = require('../scripts/ai-batch/metrics.js');
const verbose = !!process.env.VERBOSE;
let tests = 0;
function test(name, body) {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (verbose) console.log('PASS ' + name);
}
const play = events => {
  const game = {};
  for (const event of events) collector.onEvent(Object.freeze(event), game);
  return collector.finish(game);
};
const snapshot = servers => ({type: 'securitySnapshot', turn: 1, servers});
const server = (serverName, isSecure, honestIsSecure, agenda = false) => ({serverName, isSecure, honestIsSecure, agenda});

test('counts a breached secure server and an unbreached insecure server under both verdicts', () => {
  const out = play([
    {type: 'gameStart'},
    snapshot([server('Server 1', true, false, true), server('HQ', false, false)]),
    {type: 'run', server: 'remote', serverName: 'Server 1', success: true},
    {type: 'run', server: 'hq', serverName: 'HQ', success: false},
    {type: 'turnEnd', side: 'runner'},
  ]);
  assert.deepStrictEqual(out.current.all, {secure: 1, secureBreached: 1, insecure: 1, insecureBreached: 0});
  assert.deepStrictEqual(out.honest.all, {secure: 0, secureBreached: 0, insecure: 2, insecureBreached: 1});
  assert.deepStrictEqual(out.current.agendaRemote, {secure: 1, secureBreached: 1, insecure: 0, insecureBreached: 0});
  assert.deepStrictEqual(out.honest.agendaRemote, {secure: 0, secureBreached: 0, insecure: 1, insecureBreached: 1});
});

test('runs outside the snapshotted Runner turn are not counted; game end closes the turn', () => {
  const out = play([
    {type: 'gameStart'},
    {type: 'run', server: 'hq', serverName: 'HQ', success: true},
    snapshot([server('HQ', true, true)]),
    {type: 'turnEnd', side: 'runner'},
    {type: 'run', server: 'hq', serverName: 'HQ', success: true},
    snapshot([server('HQ', true, true)]),
    {type: 'run', server: 'hq', serverName: 'HQ', success: true},
    {type: 'gameEnd', winner: 'runner', turns: 2},
  ]);
  assert.deepStrictEqual(out.current.all, {secure: 2, secureBreached: 1, insecure: 0, insecureBreached: 0});
});

test('every metric has a declared direction and flattens to numbers', () => {
  const flat = flattenCollector(collector.name, play([{type: 'gameStart'}]));
  assert.deepStrictEqual(Object.keys(flat).sort(), Object.keys(collector.directions).sort());
});
const playSamples = events => {
  const game = {};
  for (const event of events) collector.onEvent(Object.freeze(event), game);
  return {finish: collector.finish(game), samples: collector.samples(game)};
};
// I2 snapshot fields: kind, margin buckets (now and next turn) and a signature.
const i2 = (serverName, kind, bucket, bucket2, signature, extra = {}) => Object.assign(
  server(serverName, bucket === 'lockout', bucket === 'lockout' || bucket.startsWith('<') || bucket.startsWith('-'),
    kind === 'agendaRemote'), {kind, bucket, bucket2, signature, iceCount: 1, approachDefense: false}, extra);

test('I2: kind x bucket rows, next-turn rows only for unchanged servers, lockout and unknown kept', () => {
  const {finish, samples} = playSamples([
    {type: 'gameStart'},
    snapshot([i2('Server 1', 'agendaRemote', 'lockout', 'lockout', 'a', {approachDefense: true}),
      i2('HQ', 'hq', '2..4', '5..9', 'h', {iceCount: 2}), i2('R&D', 'rd', 'unknown', 'unknown', 'r')]),
    {type: 'run', server: 'hq', serverName: 'HQ', success: true},
    {type: 'turnEnd', side: 'runner'},
    snapshot([i2('Server 1', 'agendaRemote', 'lockout', 'lockout', 'a'),
      i2('HQ', 'hq', '-3..-1', '0..1', 'h2'), i2('R&D', 'rd', 'unknown', 'unknown', 'r')]),
    {type: 'run', server: 'rd', serverName: 'R&D', success: true},
    {type: 'gameEnd', winner: 'runner', turns: 2},
  ]);
  assert.deepStrictEqual(samples.rows, [
    ['agendaRemote', 'lockout', 1, 0, 1], ['hq', '2..4', 2, 1, 0], ['rd', 'unknown', 1, 0, 0],
    ['agendaRemote', 'lockout', 1, 0, 0], ['hq', '-3..-1', 1, 0, 0], ['rd', 'unknown', 1, 1, 0],
  ]);
  // HQ changed its ICE, so only Server 1 and R&D carry a next-turn prediction.
  assert.deepStrictEqual(samples.next, [['agendaRemote', 'lockout', 0], ['rd', 'unknown', 1]]);
  const summary = collector.summarize([samples, samples]);
  assert.deepStrictEqual(summary.cells.hq, {'2..4': {turns: 2, breached: 2}, '-3..-1': {turns: 2, breached: 0}});
  assert.deepStrictEqual(summary.cells.agendaRemote.lockout, {turns: 4, breached: 0});
  assert.deepStrictEqual(summary.next.rd.unknown, {turns: 2, breached: 2});
  // Existing per-game outputs are unchanged by the new rows.
  assert.deepStrictEqual(finish.honest.all, {secure: 3, secureBreached: 0, insecure: 3, insecureBreached: 2});
  assert.deepStrictEqual(finish.current.agendaRemote, {secure: 2, secureBreached: 0, insecure: 0, insecureBreached: 0});
});

test('I2: snapshots without kind (older harness) add no rows', () => {
  const {samples} = playSamples([{type: 'gameStart'}, snapshot([server('HQ', true, true)]), {type: 'gameEnd'}]);
  assert.deepStrictEqual(samples, {rows: [], next: []});
});
console.log(tests + ' securityCalibration cases passed.');
