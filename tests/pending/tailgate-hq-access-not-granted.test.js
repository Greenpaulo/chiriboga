// Run with: node tests/pending/tailgate-hq-access-not-granted.test.js
//
// Reproduces documentation/debug-logs/bug_raised/tailgate_access_2_additional_hq_cards_didnt_fire.txt
//
// Tailgate's responseOnRunSuccessful.Resolve (sets/vantagepoint.js:1054-1059)
// expects a `server` argument so it can check `server == corp.HQ` before
// setting this.runWasSuccessful. But the real engine dispatches automatic
// "responseOnRunSuccessful" triggers via AddTriggersToTriggerList's
// automatic branch (phase.js:332):
//
//   initialList[i].card[triggerName].Resolve.call(initialList[i].card);
//
// — called with NO arguments. So in real play `server` is always undefined,
// the check always fails, and modifyBreachAccess never grants the 2
// additional HQ accesses Tailgate's card text promises.
//
// tests/vantagepoint-integration.test.js does not catch this because it
// calls tailgate.responseOnRunSuccessful.Resolve.call(tailgate, context.corp.HQ)
// directly, manually supplying the parameter the real dispatch never does.
// This test instead dispatches the hook exactly the way phase.js:332 does.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..', '..');

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  ChangeImageFileToJPG: (name) =>
    String(name).replace(/^(\d+)/, (digits) => digits.padStart(5, '0')).replace(/\.png$/i, '.jpg'),
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

// Runner plays Tailgate; its own Resolve always runs HQ.
tailgate.Resolve.call(tailgate);

// Run succeeds. Reproduce AddTriggersToTriggerList's exact automatic-branch
// dispatch (phase.js:332): Resolve is called on the card with NO arguments.
tailgate.responseOnRunSuccessful.Resolve.call(tailgate);

// Breaching HQ should now grant 2 additional accesses (3 total) per
// Tailgate's card text. It does not, because runWasSuccessful was never set.
const additionalAccess = tailgate.modifyBreachAccess.Resolve.call(tailgate);
assert.strictEqual(
  additionalAccess,
  2,
  'Tailgate should grant 2 additional HQ accesses after a successful run; ' +
  'got ' + additionalAccess + '. responseOnRunSuccessful never sets ' +
  'runWasSuccessful because the real dispatch never passes it a `server` ' +
  'argument to check against corp.HQ (see phase.js:332).',
);

console.log('tailgate-hq-access-not-granted: PASS');