'use strict';
// Candidate-policy contract, not evidence that HQ-first plays better.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const server = serverName => ({serverName, ice: [], root: [], cards: []});
const corp = {HQ: server('HQ'), RnD: server('R&D'), archives: server('Archives')};
const remote = server('Server 1');
corp.remoteServers = [remote];
const context = {console, corp};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../ai_corp.js'), 'utf8') +
  '\nthis.CorpAI = CorpAI;', context);
const ai = new context.CorpAI();
ai.options.iceMarginalSecurity = true;
ai.options.openingHqThenRdIce = true;
const ice = {title: 'Test ICE', cardType: 'ice'};
ai._rankedServersToProtect = () => [remote, corp.HQ, corp.RnD].map(server => ({server}));
ai._nothingWorthProtecting = () => false;
ai._iceLayerPolicy = () => ({allowed: true});
ai._emptyProtectedRemotes = () => [];
ai._scoringServers = () => [];
ai._marginalIceServerCandidates = entry => [{card: ice, server: entry.server, group: 0,
  breakdown: {score: entry.server === remote ? 100 : entry.server === corp.HQ ? 2 : 1}}];
const options = ai._marginalIceInstallOptions([ice], true, true, {});
assert.strictEqual(options[0].serverToInstallTo, corp.HQ,
  'candidate first completed ICE must target HQ despite higher remote marginal score');
assert(options.every(option => option.serverToInstallTo === corp.HQ),
  'candidate must exclude other voluntary opening ICE destinations');
console.log('PASS I2.3 opening central ICE contract');
