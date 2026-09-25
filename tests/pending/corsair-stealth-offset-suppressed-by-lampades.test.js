// Reproduction for ticket corsair-stealth-offset-suppressed-by-lampades.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {creditPool: 0, temporaryCredits: 0, clickTracker: 0, rig: {programs: []}, AI: null};
const corp = {creditPool: 5, badPublicity: 0, AI: null};
const context = {console, runner, corp, playerTurn: runner, attackedServer: null,
  approachIce: -1, cardSet: [], setIdentifiers: []};
// Minimal public-board engine: the Runner's installed and active cards are its programs,
// in install order, as InstalledCards() returns them.
context.InstalledCards = player => (player === runner ? runner.rig.programs.slice() : []);
context.ActiveCards = context.InstalledCards;
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.AllottedClicks = () => 4;
vm.createContext(context);
['config.js', 'sets/creationandcontrol.js', 'sets/vantagepoint.js', 'ai_corp.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;

// decks.js InstanceCard() uses jQuery.extend(true, {}, definition): own copies of data,
// shared function references. A shallow copy is equivalent for these cards.
const instance = id => Object.assign({}, context.cardSet[id]);
const cloak = () => Object.assign(instance(3041), {credits: 1}); // credits = recurringCredits on install
const remote = {ice: [], root: []};
const stealthPool = () => ai._effectiveRunnerCreditPool(remote).recurringCredits;

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('control: Corsair installed before Lampades counts Cloak\'s stealth credit', () => {
  runner.rig.programs = [instance(36004), instance(36005), cloak()];
  assert.strictEqual(stealthPool(), 1);
});

test('control: two Corsairs count Cloak\'s stealth credit once', () => {
  runner.rig.programs = [instance(36004), instance(36004), cloak()];
  assert.strictEqual(stealthPool(), 1);
});

test('Lampades installed before Corsair must not hide Cloak\'s stealth credit', () => {
  runner.rig.programs = [instance(36005), instance(36004), cloak()];
  assert.strictEqual(stealthPool(), 1,
    'Corp credit model lost the stealth credit Corsair can spend on its barrier reduction');
});

test('Corsair\'s offset hook itself reports the credit regardless of Lampades', () => {
  const corsair = instance(36004);
  runner.rig.programs = [instance(36005), corsair, cloak()];
  assert.strictEqual(corsair.AIRunPoolCreditOffset.call(corsair, remote, null), 1);
});

assert.strictEqual(context.attackedServer, null, 'credit probing must restore attackedServer');
if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Corsair stealth offset reproduction passes.');
