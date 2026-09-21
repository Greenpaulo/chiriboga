'use strict';
// Checks the DecisionSnapshots recorder (utility.js) and that its output round-trips through extract-fixture.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {parseSnapshots, buildFixture} = require('./extract-fixture.js');
const source = fs.readFileSync(path.join(__dirname, '..', 'utility.js'), 'utf8');
const aiSource = fs.readFileSync(path.join(__dirname, '..', 'ai_corp.js'), 'utf8');
const start = source.indexOf('// BEGIN DecisionSnapshots'), end = source.indexOf('// END DecisionSnapshots');
assert(start > -1 && end > start, 'DecisionSnapshots markers not found in utility.js');
const remote = [{}, {}];
const calls = [];
let clock = 0;
const context = {performance: {now: () => (clock += 2)}, corp: {HQ: {}, RnD: {}, archives: {}, remoteServers: remote}, currentPhase: {identifier: 'Corp 2.2', title: "Corporation's Action Phase"},
  executingCommand: '', attackedServer: remote[1], approachIce: 0,
  ReproductionCode: full => { calls.push(full); return 'RunnerTestField(1, [], [], [], [], []);\nCorpTestField(2, [], [], [], [], [], [], [], []);\n'; }};
vm.createContext(context);
vm.runInContext(source.slice(start, end) + '\nthis.DS = DecisionSnapshots;', context);
const DS = context.DS;
let tests = 0;
const test = (name, body) => { body(); tests++; console.log('PASS ' + name); };

test('CorpAI Choice wraps decisions with the snapshot recorder', () => {
  assert(aiSource.includes('DecisionSnapshots.Before(choiceType, optionList)'));
  assert(aiSource.includes('DecisionSnapshots.After(snapshot, ret)'));
  assert(aiSource.includes('_choiceInner(optionList, choiceType)'));
});

test('records options, choice, run state and asks for a full dump', () => {
  const entry = DS.Before('', ['install', 'play', 'gain']);
  DS.After(entry, 0);
  assert.strictEqual(entry.chosen, 'install');
  assert.deepStrictEqual(calls, [true]);
  const text = DS.Text();
  ['// IDENTIFIER: Corp 2.2', '// OPTIONS: install, play, gain', '// CHOSEN: install', '// REPLAYABLE: true',
    '// SETUP: attackedServer = corp.remoteServers[1]; approachIce = 0;'].forEach(line => assert(text.includes(line), line));
});
test('skips forced choices and phases that are not real decisions', () => {
  const before = DS.count;
  assert.strictEqual(DS.Before('', ['only option']), null);
  context.currentPhase.identifier = 'Corp 1.1';
  assert.strictEqual(DS.Before('', ['a', 'b']), null);
  context.currentPhase.identifier = 'Corp 2.2';
  assert.strictEqual(DS.count, before);
});
test('reports its own time cost in the log header', () => {
  assert(/recorder cost [\d.]+ms total, [\d.]+ms worst/.test(DS.Text()), DS.Text().split('\n')[1]);
});
test('non-text options are flagged as not replayable', () => {
  DS.Before('select', [{label: 'Trash a card'}, {card: {title: 'Hedge Fund'}}]);
  assert(DS.Text().includes('// REPLAYABLE: false') && DS.Text().includes('Trash a card, Hedge Fund'));
});
test('keeps only the most recent snapshots', () => {
  DS.max = 3; for (let i = 0; i < 6; i++) DS.After(DS.Before('', ['a', 'b']), 1);
  assert.strictEqual(DS.list.length, 3);
  assert.strictEqual(DS.list[2].n - DS.list[0].n, 2);
});
test('a failing dump never breaks the game', () => {
  context.ReproductionCode = () => { throw new Error('boom'); };
  assert.strictEqual(DS.Before('', ['a']), null);
});
test('output round-trips through the extractor into a fixture', () => {
  context.ReproductionCode = () => 'RunnerTestField(1, [], [], [], [], []);\n';
  DS.list = []; DS.Before('', ['install', 'gain']);
  const parsed = parseSnapshots(DS.Text());
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].identifier, 'Corp 2.2');
  const fixture = buildFixture(parsed[0], 'some-log.txt', '!install');
  assert(fixture.startsWith('// EXPECT: !install\n// SOURCE: some-log.txt decision ') && fixture.includes('RunnerTestField('));
});
console.log(tests + ' snapshot tests passed.');
