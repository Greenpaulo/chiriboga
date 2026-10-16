// Reproduction for ticket shred-empty-root-end-run-unexplained.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const elevationSource = fs.readFileSync(path.join(root, 'sets', 'elevation.js'), 'utf8');

// Shred's end-run interrupt with the engine calls it uses stubbed: the Corp's
// DecisionPhase answer is applied immediately.
function shredRun({rootCards, hqCards, corpChoice}) {
  const logs = [];
  const context = {
    cardSet: {}, setIdentifiers: [], runner: {AI: null}, corp: {AI: null, HQ: {cards: hqCards}},
    attackedServer: {root: rootCards, ice: []}, intended: {endRun: true},
    Log: text => logs.push(text),
    CheckCardType: (card, types) => types.includes(card.cardType),
    DecisionPhase: (player, choices, callback) => callback(choices[corpChoice]),
    MakeRun: () => {}, Shuffle: () => {}, Reveal: (card, cb) => cb(), Trash: (card, x, cb) => cb(),
  };
  vm.createContext(context);
  vm.runInContext(elevationSource, context, {filename: 'elevation.js'});
  const shred = context.cardSet[35005];
  shred.Resolve.call(shred, {server: context.attackedServer});
  assert.strictEqual(shred.responsePreventableEndRun.Enumerate.call(shred).length, 1, 'Shred offers its interrupt');
  shred.responsePreventableEndRun.Resolve.call(shred, {});
  return {endRun: context.intended.endRun, logs};
}

let failures = 0;
function test(name, fn) {
  try { fn(); if (process.env.VERBOSE) console.log('ok   ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

const upgrade = {cardType: 'upgrade'};
const operation = {cardType: 'operation'};

test('control: X=1 and the Corp declines to trash, so Shred prevents the run ending', () => {
  const result = shredRun({rootCards: [upgrade], hqCards: [operation, operation], corpChoice: 0});
  assert.strictEqual(result.endRun, false);
  assert(result.logs.some(l => /Shred prevents the run from ending/.test(l)), result.logs.join(' | '));
});

test('X=0 (empty root): the run still ends, and the log says why Shred did not stop it', () => {
  const result = shredRun({rootCards: [], hqCards: [operation, operation], corpChoice: 0});
  assert.strictEqual(result.endRun, true, 'a 0-card cost is paid, so the run ends');
  assert(result.logs.some(l => /Shred/.test(l) && /0 cards/.test(l)),
    'expected a Shred log line explaining X=0; got: [' + result.logs.join(' | ') + ']');
});

if (failures) { console.log(failures + ' failed'); process.exit(1); }
console.log('shred-empty-root-end-run-unexplained: all passed');
