// Run with: node tests/stowaway-successful-run-no-credits.test.js
//
// Reproduces documentation/debug-logs/bug_raised/stowaway_ability_doesnt_trigger_on_successful_run.txt
// (and didnt_gain_creds_from_stowaway_on_successful_run.txt).
//
// AddTriggersToTriggerList (phase.js) resolves automatic responseOnRunSuccessful
// triggers with Resolve.call(card) and no arguments; the run's server is the
// global attackedServer. Stowaway and Chain Reaction expect a server argument,
// so neither ever sees the successful run.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  ChangeImageFileToJPG: (name) => String(name),
  runner: {side: 'runner', AI: null, grip: [], stack: [], heap: [], resolvingCards: [], creditPool: 5},
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
vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context, {filename: 'config.js'});
vm.runInContext(fs.readFileSync(path.join(root, 'sets', 'vantagepoint.js'), 'utf8'), context, {
  filename: 'vantagepoint.js',
});

let creditsGained = 0;
context.Log = () => {};
context.GainCredits = (player, amount) => {
  if (player === context.runner) creditsGained += amount;
};
context.GetServer = (card) => card.server || null;

const failures = [];
function check(fn) {
  try {
    fn();
  } catch (e) {
    failures.push(e.message);
  }
}

// Engine dispatch: attackedServer is set, Resolve gets no arguments.
function runSucceeds(card, server) {
  context.attackedServer = server;
  card.responseOnRunSuccessful.Resolve.call(card);
}

// Stowaway hosted on R&D ice (log: Whitespace on R&D, two successful R&D runs).
const stowaway = context.cardSet[36024];
stowaway.host = {title: 'Whitespace', cardType: 'ice', server: context.corp.RnD};
check(() => {
  runSucceeds(stowaway, context.corp.RnD);
  assert.strictEqual(creditsGained, 2, 'Stowaway must gain 2 credits on a successful run on its host server');
});
check(() => {
  creditsGained = 0;
  runSucceeds(stowaway, context.corp.HQ);
  assert.strictEqual(creditsGained, 0, 'Stowaway must not pay for a run on another server');
});

// Chain Reaction: same automatic-dispatch defect.
const chainReaction = context.cardSet[36001];
check(() => {
  chainReaction._resetSuccessfulCentralRuns();
  runSucceeds(chainReaction, context.corp.HQ);
  runSucceeds(chainReaction, context.corp.RnD);
  runSucceeds(chainReaction, context.corp.archives);
  assert.strictEqual(
    chainReaction.Enumerate.call(chainReaction).length,
    1,
    'Chain Reaction must be playable after successful runs on HQ, R&D and Archives',
  );
});

if (failures.length) {
  failures.forEach((f) => console.log('FAIL: ' + f));
  console.log('stowaway-successful-run-no-credits: ' + failures.length + ' failure(s)');
  process.exit(1);
}
console.log('stowaway-successful-run-no-credits: PASS');
