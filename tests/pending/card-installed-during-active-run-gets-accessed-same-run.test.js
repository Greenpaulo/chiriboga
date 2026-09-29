// Reproduction for ticket card-installed-during-active-run-gets-accessed-same-run.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const utilitySource = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'Could not find ' + name);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0)
      return source.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

// Proposed contract: breachAccessCandidates records the Runner's rule 7.4.6a
// choice for root cards that enter during the breach. AccessCardList must read
// this run-scoped state rather than treating every card in the live root as a
// candidate. The exact production wiring may change, but both choices below
// must remain observable.
function breach() {
  const remoteServer = { root: [], ice: [] };
  const accessedCards = { cards: [], root: [] };
  const breachAccessCandidates = { cards: [], root: [] };
  const context = { attackedServer: remoteServer, accessedCards, breachAccessCandidates };
  vm.createContext(context);
  vm.runInContext(extractFunction(utilitySource, 'AccessCardList'), context);
  const card = title => ({title, cardLocation: remoteServer.root, renderer: {zoomed: false}});
  return {remoteServer, accessedCards, breachAccessCandidates, context, card};
}

let failures = 0;
function test(name, fn) {
  try { fn(); if (process.env.VERBOSE) console.log('ok   ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('control: a card already in the root when the run breaches is accessed', () => {
  const {remoteServer, breachAccessCandidates, context, card} = breach();
  const preExisting = card('Pre-existing upgrade');
  remoteServer.root.push(preExisting);
  breachAccessCandidates.root.push(preExisting);
  const list = vm.runInContext('AccessCardList()', context);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0], preExisting);
});

test('the Runner may decline a root card installed during the breach', () => {
  const {remoteServer, accessedCards, breachAccessCandidates, context, card} = breach();
  const preExisting = card('Pre-existing upgrade');
  remoteServer.root.push(preExisting);
  breachAccessCandidates.root.push(preExisting);
  accessedCards.root.push(preExisting);

  const midRunInstall = card('Freshly installed asset');
  remoteServer.root.push(midRunInstall);
  // Rule 7.4.6a choice: decline, so do not add it to breachAccessCandidates.

  const list = vm.runInContext('AccessCardList()', context);
  assert.strictEqual(
    list.length,
    0,
    'AccessCardList() must not offer a mid-breach root install the Runner declined, but returned: ' +
      JSON.stringify(list.map(c => c.title))
  );
});

test('the Runner may accept a root card installed during the breach', () => {
  const {remoteServer, breachAccessCandidates, context, card} = breach();
  const midRunInstall = card('Freshly installed asset');
  remoteServer.root.push(midRunInstall);
  // Rule 7.4.6a choice: accept it as a candidate.
  breachAccessCandidates.root.push(midRunInstall);
  // The card remains in the breached server; the recorded choice makes it a
  // candidate. The preceding decline case uses the same live root state.

  const list = vm.runInContext('AccessCardList()', context);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0], midRunInstall);
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Mid-run install access reproduction passes.');
