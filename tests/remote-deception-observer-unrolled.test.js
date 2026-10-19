'use strict';
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const {createRealizedDefenseTracker} = require(path.join(root, 'scripts/ai-batch/realized-defense'));
let passed = 0, failed = 0;
for (const epochs of [false, true]) {
  try {
    const roots = [{cardType: 'agenda'}, {cardType: 'asset', subTypes: ['Ambush']}];
    const server = {root: roots, ice: [{}]};
    const ai = {options: {postureEpochs: epochs}, _postureEpochRecords: new WeakMap(),
      _serverBaitDecisions: new WeakMap(), _agendaBluffDecisions: new WeakMap()};
    for (const name of ['_random', '_remoteDeceptionProfile', '_deceptionPostureActive', '_evaluateServerSecurity'])
      ai[name] = () => { throw Error('observer invoked ' + name); };
    const corp = {AI: ai, remoteServers: [server]};
    const tracker = createRealizedDefenseTracker(() => {});
    tracker.start(corp, 0);
    const first = tracker.snapshot(corp, 1);
    assert(first.every(row => row.posture === 'unrolled'), 'absent activation records mean no posture has been selected');
    assert(first.every(row => row.safety === 'unknown'), 'absence of a roll does not establish tactical safety');
    assert(first.every(row => row.cachedPostured === null));
    assert.deepStrictEqual(tracker.snapshot(corp, 1), first);
    assert.strictEqual(ai._postureEpochRecords.get(server), undefined);
    assert.strictEqual(ai._serverBaitDecisions.get(server), undefined);
    assert.strictEqual(ai._agendaBluffDecisions.get(server), undefined);
    passed++;
  } catch (error) { failed++; console.error('FAIL observer epochs=' + epochs + ': ' + error.message); }
}
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
