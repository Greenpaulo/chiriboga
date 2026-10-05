// Run with: node tests/tailgate-hq-access-not-granted.test.js
//
// Reproduces documentation/debug-logs/bug_raised/tailgate_access_2_additional_hq_cards_didnt_fire.txt
//
// Guards the original regression: automatic responseOnRunSuccessful triggers
// call Resolve with no server argument. Tailgate now tracks its own run with
// runningWithThis, records success only for that run, and grants two additional
// HQ accesses during the breach. Dispatch the real automatic hook without
// arguments and guard against unrelated runs and leftover run state.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
let requestedServer = null;

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  ChangeImageFileToJPG: (name) =>
    String(name).replace(/^(\d+)/, (digits) => digits.padStart(5, '0')).replace(/\.png$/i, '.jpg'),
  MakeRun: (server) => {
    requestedServer = server;
    context.attackedServer = server;
  },
  runner: {
    side: 'runner',
    AI: null,
    grip: [],
    stack: [],
    heap: [],
    resolvingCards: [],
    creditPool: 5,
    temporaryCredits: 0,
    clickTracker: 4,
  },
  corp: {
    side: 'corp',
    AI: null,
    HQ: {serverName: 'HQ', cards: [], root: [], ice: []},
    RnD: {serverName: 'R&D', cards: [], root: [], ice: []},
    archives: {serverName: 'Archives', cards: [], root: [], ice: []},
    remoteServers: [],
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'config.js'), 'utf8'),
  context,
  {filename: 'config.js'},
);
vm.runInContext(
  fs.readFileSync(path.join(root, 'sets', 'vantagepoint.js'), 'utf8'),
  context,
  {filename: 'vantagepoint.js'},
);

const tailgate = context.cardSet[36012];
context.attackedServer = context.corp.HQ;

// A successful run not initiated by Tailgate must not enable its bonus.
tailgate.responseOnRunSuccessful.Resolve.call(tailgate);
assert.strictEqual(
  tailgate.modifyBreachAccess.Resolve.call(tailgate),
  0,
  'Tailgate must ignore successful runs it did not initiate',
);

// Runner plays Tailgate; its own Resolve always runs HQ.
tailgate.Resolve.call(tailgate);
assert.strictEqual(
  requestedServer,
  context.corp.HQ,
  'Tailgate must initiate its run on HQ',
);

// Run succeeds. Reproduce AddTriggersToTriggerList's exact automatic-branch
// dispatch (phase.js:332): Resolve is called on the card with NO arguments.
tailgate.responseOnRunSuccessful.Resolve.call(tailgate);

// Breaching HQ should now grant 2 additional accesses (3 total) per
// Tailgate's card text.
const additionalAccess = tailgate.modifyBreachAccess.Resolve.call(tailgate);
assert.strictEqual(
  additionalAccess,
  2,
  'Tailgate should grant 2 additional HQ accesses after a successful run; ' +
  'got ' + additionalAccess + '. responseOnRunSuccessful never sets ' +
  'runWasSuccessful because the real dispatch never passes it a `server` ' +
  'argument to check against corp.HQ (see phase.js:332).',
);

tailgate.responseOnRunEnds.Resolve.call(tailgate);
tailgate.responseOnRunSuccessful.Resolve.call(tailgate);
assert.strictEqual(
  tailgate.modifyBreachAccess.Resolve.call(tailgate),
  0,
  'Tailgate must stop tracking its run when that run ends',
);

console.log('tailgate-hq-access-not-granted: PASS');
