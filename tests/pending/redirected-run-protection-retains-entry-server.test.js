// Run with: node tests/pending/redirected-run-protection-retains-entry-server.test.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(
  __dirname,
  path.basename(__dirname) === 'pending' ? '../..' : '..',
);
const corp = {
  HQ: {serverName: 'HQ', cards: [], ice: [], root: []},
  RnD: {serverName: 'R&D', cards: [], ice: [], root: []},
  archives: {serverName: 'Archives', cards: [], ice: [], root: []},
  remoteServers: [],
  scoreArea: [],
};
const runner = {cards: [], identityCard: null};
const context = {
  console,
  corp,
  runner,
  ActiveCards: () => [],
};

vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'),
  context,
  {filename: 'ai_corp.js'},
);
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;

// The run was declared against Archives, redirected after passing its ICE,
// and declared successful against HQ. Protection history must retain both
// factual endpoints so consumers can attribute route security to Archives
// without mislabelling the successful access as an Archives access.
ai._recordSuccessfulRunForProtection(corp.HQ, corp.archives);
ai._rollRecentSuccessfulRunPressure();

const destination = ai._serverRunPressure(corp.HQ, {isSecure: false});
const entry = ai._serverRunPressure(corp.archives, {isSecure: false});
assert.strictEqual(destination.recentRuns, 1, 'HQ remains the successful-run destination');
assert.strictEqual(
  entry.recentRuns,
  1,
  'Archives must remain attributable as the ICE route traversed to reach HQ',
);

console.log('1 redirected-run route-provenance case passed.');
