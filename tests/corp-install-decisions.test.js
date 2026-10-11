'use strict';
// Install-decision telemetry (Corp roadmap I0): what _serverToProtect(),
// _rankedInstallOptions() and _bestInstallOption() record while a
// DecisionSnapshots notes frame is open, and that recording never changes
// the choice. Board-level replays live in tests/fixtures/corp-decisions/.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

const server = (name, ice = []) => ({serverName: name, cards: [], ice, root: []});
const corp = {HQ: server('HQ'), RnD: server('R&D', [{title: 'Unrezzed wall', rezzed: false, rezCost: 3}]),
  archives: server('Archives'), remoteServers: [], creditPool: 2};
corp.remoteServers.push({serverName: 'Server 1', ice: [], root: [{title: 'Asset', cardType: 'asset'}]});
const context = {console, corp, runner: {}, AIHypothetical: {depth: 0},
  CheckCardType: (card, types) => types.includes(card.cardType)};
vm.createContext(context);
const utility = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
vm.runInContext(utility.slice(utility.indexOf('// BEGIN DecisionSnapshots'), utility.indexOf('// END DecisionSnapshots')) +
  '\nthis.DecisionSnapshots = DecisionSnapshots;', context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8') + '\nthis.CorpAI = CorpAI;', context, {filename: 'ai_corp.js'});
const DS = context.DecisionSnapshots;

let tests = 0;
const test = (name, body) => {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (process.env.VERBOSE) console.log('PASS ' + name);
};

function newAI() {
  const ai = new context.CorpAI();
  ai._log = () => {};
  ai._securityCacheEnabled = false;
  ai._random = () => { throw new Error('telemetry must not consume randomness'); };
  return ai;
}
const remote = corp.remoteServers[0];
const insecure = {isSecure: false, totalBreakCost: 1};
const secure = {isSecure: true, totalBreakCost: 9};
// Most urgent first: an empty Archives, R&D with an unrezzed ICE, a secure
// HQ, then an insecure remote with nothing installed in front of it.
const ranking = () => [
  {server: corp.archives, name: 'archives', score: -5, adjustedScore: -5, debt: 0, security: insecure, isSecure: false},
  {server: corp.RnD, name: 'R&D', score: 1, adjustedScore: 1, debt: 0, security: insecure, isSecure: false},
  {server: corp.HQ, name: 'HQ', score: 2, adjustedScore: 2, debt: 0, security: secure, isSecure: true},
  {server: remote, name: 'Server 1', score: 3, adjustedScore: 3, debt: 0, security: insecure, isSecure: false},
];
function protectionAI() {
  const ai = newAI();
  ai._rankedServersToProtect = ranking;
  ai._nothingWorthProtecting = target => target === corp.archives;
  ai._serverHasStakes = () => false;
  return ai;
}
const layerFilter = ai => (target, security) => ai._iceLayerPolicy(target, false, security);

// I0 scenario 2: the top-ranked servers are skipped with their exact reasons,
// separating "the server is urgent" from "an ICE layer is allowed there".
test('a skipped protection target records why it was passed over', () => {
  const ai = protectionAI();
  const previous = DS.BeginNotes(true);
  ai._installTrace = [];
  const target = ai._serverToProtect(false, false, layerFilter(ai));
  const trace = ai._installTrace[0];
  ai._installTrace = null;
  DS.EndNotes(previous);
  assert.strictEqual(target, remote, 'the insecure remote is the first eligible target');
  assert.strictEqual(trace.selected, 'Server 1');
  assert.strictEqual(trace.filtered, true);
  const row = name => trace.ranked.find(r => r.server === name);
  assert.strictEqual(row('Archives').skipped, 'valueless');
  assert.strictEqual(row('R&D').skipped, 'layerPolicy');
  assert.strictEqual(row('R&D').layerPolicy, 'existingUnrezzedIceAndPoor');
  assert.strictEqual(row('HQ').skipped, 'secure');
  assert.strictEqual(row('Server 1').skipped, undefined);
  assert.strictEqual(row('R&D').security.isSecure, false, 'security comes from the ranking, not a new evaluation');
});

test('the same walk without a trace gives the same target', () => {
  const ai = protectionAI();
  assert.strictEqual(ai._serverToProtect(false, false, layerFilter(ai)), remote);
  assert.strictEqual(ai._serverToProtect(false, false, (s, sec) => ai._shouldInstallIceLayer(s, false, sec)), remote);
});

test('_iceLayerPolicy agrees with _shouldInstallIceLayer and names its reason', () => {
  const ai = protectionAI();
  for (const [target, rich, reason] of [[corp.RnD, false, 'existingUnrezzedIceAndPoor'], [corp.RnD, true, 'economySufficient'],
    [corp.HQ, false, 'noUnrezzedIce'], [null, false, 'noUnrezzedIce']]) {
    const verdict = ai._iceLayerPolicy(target, rich, insecure);
    assert.strictEqual(verdict.reason, reason);
    assert.strictEqual(verdict.allowed, ai._shouldInstallIceLayer(target, rich, insecure));
  }
  const rezzed = server('Rezzed', [{rezzed: true, rezCost: 1}]);
  assert.deepStrictEqual(Object.assign({}, ai._iceLayerPolicy(rezzed, false, insecure)),
    {allowed: false, reason: 'rezzedIceNotAtRiskAndPoor'});
});

const iceA = {title: 'Ice A', cardType: 'ice', rezCost: 1};
const iceB = {title: 'Ice B', cardType: 'ice', rezCost: 5};
function installAI() {
  const ai = newAI();
  ai._rankedInstallOptionsCore = () => [
    {cardToInstall: iceA, serverToInstallTo: corp.RnD, reason: 'returned by _iceInstallOptions for server that needs protection'},
    {cardToInstall: iceB, serverToInstallTo: corp.HQ, reason: 'returned by _iceInstallOptions for new server'},
  ];
  return ai;
}

test('_bestInstallOption records preferences, the choice and those with no legal option', () => {
  const ai = installAI();
  const options = [{card: iceB, server: corp.HQ}];
  const previous = DS.BeginNotes(true);
  const choice = ai._bestInstallOption(options);
  const notes = DS.EndNotes(previous);
  assert.strictEqual(choice, 0);
  const [ranked, best] = notes.install;
  assert.strictEqual(ranked.call, 'rankedInstallOptions');
  assert.deepStrictEqual(ranked.preferences.map(p => [p.card, p.server, p.group]),
    [['Ice A', 'R&D', 'protectionIce'], ['Ice B', 'HQ', 'fallbackIce']]);
  // R&D already holds a 3-credit unrezzed ICE; 2 credits cover neither.
  assert.deepStrictEqual([ranked.preferences[0].pendingRez, ranked.preferences[0].affordable], [3, false]);
  assert.strictEqual(best.call, 'bestInstallOption');
  assert.strictEqual(best.chosen.card, 'Ice B');
  assert.deepStrictEqual(best.noLegalOption.map(p => p.card), ['Ice A']);
  assert.deepStrictEqual(Object.keys(options[0]), ['card', 'server'], 'engine options are not modified');
});

test('nothing is recorded without a frame or inside a hypothetical probe', () => {
  const ai = installAI();
  assert.strictEqual(ai._bestInstallOption([{card: iceB, server: corp.HQ}]), 0);
  const previous = DS.BeginNotes(true);
  context.AIHypothetical.depth = 1;
  try { ai._rankedInstallOptions([iceA, iceB]); } finally { context.AIHypothetical.depth = 0; }
  const notes = DS.EndNotes(previous);
  assert.deepStrictEqual(Object.keys(notes), []);
});

console.log(tests + ' install-decision telemetry tests passed.');
