// Reproduction for documentation/bugs/melies-secret-department-choice-ignored.md.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
//
// Méliès U: Only the Brightest (36036) secretly sets its department via
// responseOnCorpDiscardEnds.Enumerate, which stores the least-iced central
// server as corp.AI.preferred = {title: <card title>, option: choice} where
// `choice` is one of the literal option objects ({department, label}).
// The engine replays that decision through CorpAI.Choice(optionList,
// "select") (command.js ResolveChoice -> SelectChoice), but _choiceInner
// (ai_corp.js) only honours a title preference when
// this.preferred.title == currentPhase.title. Here currentPhase.title is the
// trigger instruction "Secretly set Méliès U" (phase.js trigger Resolve uses
// the response `text` as the DecisionPhase title) while the stored title is
// the card title "Méliès U: Only the Brightest", so the preference never
// matches and the AI falls through to the "I don't have code to handle this
// situation" fallback, which returns index 0 (HQ) regardless of the board.
//
// Object-identity options cannot be replayed from a static OPTIONS string
// list, so this decision needs a purpose-built test rather than a
// tests/fixtures/corp-decisions-pending/*.txt fixture (see
// tests/fixtures/README.md: "Decisions containing non-text options are
// labelled non-replayable and require a purpose-built test"). This file
// calls the card's own Enumerate hook and then the real CorpAI.Choice path.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const corp = {AI: null, HQ: {ice: [{}, {}]}, RnD: {ice: []}, archives: {ice: []}};
const context = {console, corp, runner: {}, cardSet: {}, setIdentifiers: []};
context.Log = () => {};
context.LogError = () => {};
vm.createContext(context);
['sets/vantagepoint.js', 'ai_corp.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI();', context);
const ai = context.reviewAI;
corp.AI = ai;
const logged = [];
ai._log = message => { logged.push(String(message)); };
// The trigger decision runs under the response text as its phase title with
// the "continue" command, exactly as logged in the source log:
// [Secretly set Méliès U, Corp 3.3, continue, [...]].
context.currentPhase = {title: 'Secretly set Méliès U', identifier: 'Corp 3.3'};
context.executingCommand = 'continue';

const melies = Object.assign({}, context.cardSet[36036]);
assert.strictEqual(melies.title, 'Méliès U: Only the Brightest');

let failures = 0;
function test(name, fn) {
  try { fn(); if (process.env.VERBOSE) console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('card intent: least-iced central (R&D here) is stored as the preference', () => {
  const choices = melies.responseOnCorpDiscardEnds.Enumerate.call(melies);
  assert.strictEqual(choices.length, 3);
  assert.ok(corp.AI.preferred, 'Enumerate should store a preference');
  assert.strictEqual(corp.AI.preferred.option, choices[1],
    'with HQ holding 2 ice and R&D/Archives empty, the preference should be the R&D option');
});

test('bug: CorpAI.Choice ignores the stored department and falls back to index 0', () => {
  const choices = melies.responseOnCorpDiscardEnds.Enumerate.call(melies);
  const expected = choices.indexOf(corp.AI.preferred.option);
  assert.strictEqual(expected, 1, 'test setup: the stored preference should be R&D (index 1)');
  logged.length = 0;
  const chosen = ai.Choice(choices, 'select');
  // NOTE (PR #50 review): no assertion on the "I don't have code to handle
  // this situation" fallback log — it fires only on the buggy path, so it
  // would fail once the fix returns the stored preference before the
  // fallback. The selection assertion below is the pinned expectation.
  assert.strictEqual(chosen, expected,
    'Choice fell through to the index-0 fallback (HQ) instead of the stored R&D preference');
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Melies secret department reproduction passes.');
