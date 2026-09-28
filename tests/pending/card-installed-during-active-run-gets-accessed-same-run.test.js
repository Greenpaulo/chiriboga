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

// AccessCardList() only touches corp.archives/HQ/RnD when attackedServer has a
// .cards property (i.e. it is a central server). A remote server object has
// only .root and .ice, so the central-server branch is never entered below
// and corp/ModifyingTriggers/Shuffle do not need to be stubbed.
const remoteServer = { root: [], ice: [] };
const accessedCards = { cards: [], root: [] };
const context = { attackedServer: remoteServer, accessedCards };
vm.createContext(context);
vm.runInContext(extractFunction(utilitySource, 'AccessCardList'), context);

function card(title) {
  return { title: title, cardLocation: remoteServer.root, renderer: { zoomed: false } };
}

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('control: a card already in the root when the run breaches is accessed', () => {
  const preExisting = card('Pre-existing upgrade');
  remoteServer.root.push(preExisting);
  const list = vm.runInContext('AccessCardList()', context);
  assert.strictEqual(list.length, 1);
  assert.strictEqual(list[0], preExisting);
  // simulate the runner accessing it, as phases.runAccessingCard.Init does
  accessedCards.root.push(preExisting);
});

test('a card the Corp installs into the root mid-run must not join this run\'s access', () => {
  // The run above is still open (Run ends has not fired). A Corp trigger that
  // resolves during the access window - e.g. Poetri Luxury Brands' "Whenever
  // an agenda is stolen, you may install 1 non-agenda card from HQ" - installs
  // a fresh card into the very server currently under attack.
  const midRunInstall = card('Freshly installed asset');
  remoteServer.root.push(midRunInstall);

  const list = vm.runInContext('AccessCardList()', context);
  assert.strictEqual(
    list.length,
    0,
    'AccessCardList() must not offer a card installed into the attacked server ' +
      'after this run already began accessing it, but it returned: ' +
      JSON.stringify(list.map(c => c.title))
  );
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Mid-run install access reproduction passes.');