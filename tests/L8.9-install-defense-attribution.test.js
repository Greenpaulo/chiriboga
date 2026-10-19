'use strict';
const assert = require('assert');
const {createRealizedDefenseTracker} = require('../scripts/ai-batch/realized-defense');

// L8.9: the install observation must retain the actual defense at commitment,
// even when ICE changes before the first Runner-turn snapshot.
const events = [];
const tracker = createRealizedDefenseTracker((type, data) => events.push({type, ...data}));
const server = {ice: [{}], root: []};
const corp = {remoteServers: [server], AI: {options: {}}};
tracker.start(corp, 0);
server.root.push({cardType: 'agenda'});
tracker.observe(corp, 1);
server.ice.push({});
const snapshot = tracker.snapshot(corp, 2)[0];
const install = events.find(event => event.type === 'realizedDefenseLifecycle' && event.action === 'install');
assert.strictEqual(install.commitmentId, snapshot.commitmentId);
assert.strictEqual(snapshot.iceCount, 2);
assert.strictEqual(install.iceCount, 1, 'install defense must be recorded separately from later exposure');
console.log('L8.9 install-defense attribution: passed');
