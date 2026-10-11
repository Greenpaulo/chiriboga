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
const verbose = !!process.env.VERBOSE; // passing cases are silent by default to keep agent context small
const test = (name, body) => {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (verbose) console.log('PASS ' + name);
};

test('CorpAI Choice wraps decisions with the snapshot recorder', () => {
  assert(aiSource.includes('DecisionSnapshots.Before(choiceType, optionList)'));
  assert(aiSource.includes('DecisionSnapshots.After(snapshot, ret, notes)'));
  assert(aiSource.includes('recorder.BeginNotes(') && aiSource.includes('recorder.EndNotes(previousNotes)'));
  assert(aiSource.includes('_choiceInner(optionList, choiceType)'));
});

test('snapshot recording is opt-in', () => {
  assert.strictEqual(DS.enabled, false);
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
test('Corp telemetry retains pre-filter discard options and the chosen original index', () => {
  const events = [];
  DS.telemetry = {sink: entry => events.push(entry)};
  DS.enabled = false;
  const aiContext = vm.createContext({console, corp: context.corp, runner: {},
    DecisionSnapshots: DS, CheckCardType: (card, types) => types.includes(card.cardType)});
  vm.runInContext(aiSource + '\nthis.CorpAI = CorpAI;', aiContext);
  const ai = new aiContext.CorpAI();
  ai._log = () => {};
  ai._bestNonAgendaTutorOption = options => options[0];
  ai._choiceInner = function(options) { return this._bestDiscardOption(options); };
  const options = [
    {card: {title: 'Keep agenda', cardType: 'agenda'}},
    {card: {title: 'Keep asset', cardType: 'asset'}},
    {card: {title: 'Discard asset', cardType: 'asset'}},
  ];
  assert.strictEqual(ai.Choice(options, 'select'), 0, 'engine index still refers to the filtered list');
  assert.strictEqual(options.length, 1, 'the actual discard helper removed alternatives');
  assert.strictEqual(options[0].card.title, 'Discard asset');
  assert.deepStrictEqual(Array.from(events[0].options), ['Keep agenda', 'Keep asset', 'Discard asset']);
  assert.strictEqual(events[0].chosen, 2, 'telemetry index refers to the original alternatives');
  DS.telemetry = null;
});
test('Corp telemetry snapshots labels before an option object changes', () => {
  const events = [];
  DS.telemetry = {sink: entry => events.push(entry)};
  const aiContext = vm.createContext({console, corp: context.corp, runner: {}, DecisionSnapshots: DS});
  vm.runInContext(aiSource + '\nthis.CorpAI = CorpAI;', aiContext);
  const ai = new aiContext.CorpAI();
  ai._choiceInner = options => { options[1].label = 'Changed after selection'; return 1; };
  assert.strictEqual(ai.Choice([{label: 'First'}, {label: 'Second'}], 'select'), 1);
  assert.deepStrictEqual(Array.from(events[0].options), ['First', 'Second']);
  assert.strictEqual(events[0].chosen, 1);
  DS.telemetry = null;
});
test('notes frames are per decision and restore the outer frame', () => {
  assert.strictEqual(DS.Recording(), false);
  DS.Note('install', {ignored: true}); // no frame: nothing is recorded
  const outer = DS.BeginNotes(true);
  DS.Note('install', {a: 1});
  const inner = DS.BeginNotes(true);
  DS.Note('install', {b: 2});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(DS.EndNotes(inner))), {install: [{b: 2}]});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(DS.EndNotes(outer))), {install: [{a: 1}]});
  assert.strictEqual(DS.Recording(), false);
  const events = [];
  DS.telemetry = {sink: entry => events.push(entry)};
  DS.Record('corp', '', ['a', 'b'], 1, 0, {install: [{c: 3}]});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(events[0].install)), [{c: 3}]);
  DS.telemetry = null;
});
// I0 scenario 3: a snapshot carrying an install block still becomes a fixture
// that the fixture runner replays to the same choice.
test('a snapshot with install notes round-trips into a replaying fixture', () => {
  const {execFileSync} = require('child_process');
  const os = require('os');
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'corp-decisions',
    'corp-protects-baker-backdoor-after-rnd-layer-blocked.txt'), 'utf8').replace(/\r/g, '');
  const setup = /^\/\/\s*SETUP:\s*(.*)$/m.exec(fixture)[1];
  const board = fixture.split('\n').filter(line => line.trim() && !line.startsWith('//')).join('\n');
  context.ReproductionCode = () => board + '\n' + setup + ';\n';
  context.currentPhase = {identifier: 'Corp 2.2', title: "Corporation's Action Phase"};
  DS.list = [];
  const entry = DS.Before('', ['gain', 'draw', 'install', 'advance', 'n']);
  DS.After(entry, 2, {install: [{call: 'rankedInstallOptions', preferences: [{card: 'Empiricist', server: 'Archives'}]}]});
  const text = DS.Text();
  assert(text.includes('// INSTALL: {"call":"rankedInstallOptions"'), 'install notes are printed as comment lines');
  const parsed = parseSnapshots(text);
  assert.strictEqual(parsed.length, 1);
  assert.strictEqual(parsed[0].chosen, 'install');
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'i0-snapshot-')), 'round-trip.txt');
  fs.writeFileSync(file, buildFixture(parsed[0], 'round-trip-log.txt', 'install').replace('// EXPECT: install\n',
    '// EXPECT: install\n// EXPECT_SERVER: Archives\n'));
  const output = execFileSync(process.execPath, [path.join(__dirname, 'corp-decision-fixtures.test.js'), file], {encoding: 'utf8'});
  assert(/ 0 failed, 1 fixtures\./.test(output), output);
});
console.log(tests + ' snapshot tests passed.');
