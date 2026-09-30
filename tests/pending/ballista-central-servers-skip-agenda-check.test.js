// Reproduction for ticket ballista-central-servers-skip-agenda-check.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
//
// Ballista's live subroutine choice ("Trash 1 installed program or end the
// run.") is set via corp.AI.preferred = {title: "Ballista", option: choice},
// where `choice` is one of the literal option objects built inside the
// card's own Resolve(). The engine only matches that preference by object
// reference (ai_corp.js _choiceInner: optionList.indexOf(this.preferred.option)),
// so this decision cannot be replayed from a static OPTIONS string list the
// way tests/fixtures/corp-decisions-pending/*.txt fixtures are replayed
// (see tests/fixtures/README.md: "Decisions containing non-text options are
// labelled non-replayable and require a purpose-built test"). This file
// calls the card's own AIWouldTrigger() hook directly instead.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {rig: {programs: []}};
const corp = {AI: null};
const context = {console, runner, corp, cardSet: {}, setIdentifiers: []};
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckTrash = () => true;
context.ChoicesInstalledCards = (player, predicate) =>
  (player.rig ? player.rig.programs : []).filter(predicate).map(card => ({card}));
vm.createContext(context);
['sets/systemgateway.js', 'ai_corp.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;
corp.AI = ai;
// Ballista's AIWouldTrigger() calls Math.random() directly rather than the
// injectable corp.AI._random() (a separate, already-known principle-5 gap -
// see documentation/backlog/remediation/D2-injectable-runner-randomness.md).
// Forcing it to 0 makes any branch that actually consults
// corp.AI._agendasInServer() land on "protect the agenda" (return false),
// so the central-server branch's failure to do the same is deterministic
// rather than a 50/50 flake.
vm.runInContext('Math.random = function() { return 0; };', context);

const ballista = Object.assign({}, context.cardSet[30062]);
assert.strictEqual(ballista.title, 'Ballista');
const agenda = {cardType: 'agenda', agendaPoints: 1};

let failures = 0;
function test(name, fn) {
  try { fn(); console.log('ok   ' + name); } catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

test('control: a remote server holding the accessed agenda ends the run on this roll', () => {
  const remote = {root: [agenda]};
  context.GetServer = () => remote;
  assert.strictEqual(ballista.AIWouldTrigger.call(ballista), false,
    'remote-server branch should consult _agendasInServer() and end the run');
});

test('bug: HQ holding the accessed agenda still trashes a program instead of ending the run', () => {
  corp.HQ = {cards: [agenda], root: []};
  context.GetServer = () => corp.HQ;
  assert.strictEqual(ballista.AIWouldTrigger.call(ballista), false,
    'central-server branch (thisServer.cards defined) returns true before ' +
    'ever calling _agendasInServer(), so an agenda sitting in HQ, R&D or ' +
    'Archives is never weighed against trashing the program');
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Ballista AIWouldTrigger reproduction passes.');