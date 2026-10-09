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
console.log(tests + ' securityCalibration cases passed.');
