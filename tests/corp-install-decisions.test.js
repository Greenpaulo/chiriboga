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
const context = {console, corp, runner: {},
  NewServer: (name, isCentral) => Object.assign({isServer: true, root: [], ice: [], serverName: name}, isCentral ? {cards: []} : {}),
  CheckCardType: (card, types) => types.includes(card.cardType)};
vm.createContext(context);
const utility = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
vm.runInContext(utility.slice(utility.indexOf('// BEGIN DecisionSnapshots'), utility.indexOf('// END DecisionSnapshots')) +
  '\nthis.DecisionSnapshots = DecisionSnapshots;', context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(runnerSource.indexOf('var AIHypothetical'), runnerSource.indexOf('//evaluate with a prospective run')) +
  '\nthis.AIHypothetical = AIHypothetical; this.AIWithHypothetical = AIWithHypothetical;', context);
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

// I1 candidate records. The real legacy generator runs over stubbed board
// queries, so each scenario controls exactly which option groups emit.
// Ranking (protectionAI): Archives valueless, R&D layer-blocked (unrezzed ICE,
// poor), HQ secure, Server 1 selected.
const plain = value => JSON.parse(JSON.stringify(value));
const same = (actual, expected, message) => assert.deepStrictEqual(plain(actual), plain(expected), message);
function candidateAI(setup = {}) {
  const ai = protectionAI();
  const affordable = setup.affordable || [iceA];
  ai._emptyProtectedRemotes = () => setup.emptyRemotes || [];
  ai._potentialAdvancement = () => 0;
  ai._uniqueCopyAlreadyInstalled = () => false;
  ai._sufficientEconomy = () => !!setup.economy;
  ai._HVTsInstalled = () => 0;
  ai._clicksLeft = () => 3;
  ai._affordableIce = (target, cards) => cards.filter(c => c.cardType === 'ice' && affordable.includes(c));
  ai._notAffordableIce = (target, cards) => cards.filter(c => c.cardType === 'ice' && !affordable.includes(c));
  ai._scoringServers = () => [];
  ai._isHVT = () => false;
  ai._assetDestinationOrder = destinations => destinations.slice();
  ai._bestProtectedRemote = () => null;
  ai._upgradeInstallPreferences = (target, cards, inhibit) => { ai.upgradeInhibit = inhibit; return []; };
  ai._scoringWindow = () => 0;
  ai._copyOfCardExistsIn = () => null;
  ai._agendasInHand = () => 0;
  return ai;
}
const pairs = list => list.map(o => [o.cardToInstall.title, o.serverToInstallTo ? o.serverToInstallTo.serverName : 'new remote']);
const recordPairs = list => list.map(r => [r.card.title, r.server ? r.server.serverName : 'new remote']);
const assetCard = {title: 'Asset X', cardType: 'asset'};

test('I1 scenario 1: priority-only excludes unaffordable ICE and new-server ICE on a poor economy', () => {
  const ai = candidateAI();
  const priority = ai._rankedInstallCandidates([iceA, iceB], true);
  same(pairs(priority.options), [['Ice A', 'Server 1']]);
  const any = ai._rankedInstallCandidates([iceA, iceB], false);
  same(pairs(any.options), [['Ice A', 'Server 1'], ['Ice B', 'Server 1']]);
  assert.ok(!any.options.some(o => o.serverToInstallTo === null), 'no new remote without economy');
  const offered = priority.candidates.find(r => r.card === iceB && r.server === remote);
  assert.strictEqual(offered.eligible, false);
  same(offered.rejectionReasons, ['legacy: not offered for the selected server']);
  const rich = candidateAI({economy: true})._rankedInstallCandidates([iceA], true);
  assert.ok(rich.options.some(o => o.serverToInstallTo === null && o.reason === 'returned by _iceInstallOptions for new server'),
    'a sufficient economy may open a new remote');
});

test('I1 scenario 2: inhibit false reaches the generator and the wrapper returns its list unchanged', () => {
  const ai = candidateAI();
  const core = ai._rankedInstallOptionsCore([iceA, iceB], false, false);
  assert.strictEqual(ai.upgradeInhibit, false);
  const previous = DS.BeginNotes(true);
  const wrapped = ai._rankedInstallOptions([iceA, iceB], false, false);
  DS.EndNotes(previous);
  assert.strictEqual(ai.upgradeInhibit, false);
  same(pairs(wrapped), pairs(core));
  same(wrapped.map(o => o.reason), core.map(o => o.reason));
});

test('I1 scenario 3: a pair emitted by two groups is one record with merged reasons; the list keeps both', () => {
  // An empty protected remote makes the fallback ICE group repeat the protection group.
  const ai = candidateAI({emptyRemotes: [server('Server 2', [{rezzed: true}])]});
  const ranked = ai._rankedInstallCandidates([iceA], true);
  same(pairs(ranked.options), [['Ice A', 'Server 1'], ['Ice A', 'Server 1']], 'Phase_Main compares list lengths');
  const eligible = ranked.candidates.filter(r => r.eligible);
  assert.strictEqual(eligible.length, 1);
  same(eligible[0].reasons, ['returned by _iceInstallOptions for server that needs protection',
    'returned by _iceInstallOptions for new server']);
  assert.strictEqual(eligible[0].option, ranked.options[0], 'the first occurrence keeps its option object');
  same([eligible[0].compatibilityOrder, eligible[0].band, eligible[0].scoreBreakdown.legacy], [0, 0, 'protectionIce']);
});

test('I1 scenario 4: unrelated cards do not reorder the ICE candidates', () => {
  const order = cards => recordPairs(candidateAI({affordable: [iceA, iceB]})._rankedInstallCandidates(cards, false).candidates);
  same(order([assetCard, iceA, iceB]), order([iceA, iceB, assetCard]));
  same(order([iceA, assetCard, iceB]).slice(0, 2), [['Ice A', 'Server 1'], ['Ice B', 'Server 1']]);
});

test('I1 scenario 5: a hypothetical install restores the board, including when evaluation throws', () => {
  const ai = candidateAI();
  ai._protectionInstallsThisTurn = [];
  const credits = corp.creditPool;
  const rndIce = corp.RnD.ice.slice();
  const seen = ai._hypotheticalServerAfterInstall(iceA, corp.RnD, target => ({
    outermost: target.ice[target.ice.length - 1], credits: corp.creditPool, depth: context.AIHypothetical.depth}));
  same(seen, {outermost: iceA, credits: credits - 1, depth: 1}, 'install cost is one per existing layer');
  assert.throws(() => ai._hypotheticalServerAfterInstall(iceA, corp.RnD, () => { throw new Error('probe'); }), /probe/);
  const root = ai._hypotheticalServerAfterInstall(assetCard, remote, target => target.root.includes(assetCard));
  assert.strictEqual(root, true);
  const detached = ai._hypotheticalServerAfterInstall(iceA, null, target =>
    [target.AIHypothetical, target.ice.length, corp.remoteServers.includes(target), corp.creditPool]);
  same(detached, [true, 1, false, credits]);
  same(corp.RnD.ice, rndIce);
  assert.ok(!remote.root.includes(assetCard));
  assert.strictEqual(corp.creditPool, credits);
  assert.strictEqual(context.AIHypothetical.depth, 0);
  same(ai._protectionInstallsThisTurn, []);
});

test('I1 scenario 6: a layer-policy rejection falls through, and the rejected server is recorded with its reason', () => {
  const ai = candidateAI();
  const ranked = ai._rankedInstallCandidates([iceA], true);
  same(pairs(ranked.options), [['Ice A', 'Server 1']]);
  const rnd = ranked.candidates.find(r => r.server === corp.RnD);
  same([rnd.eligible, rnd.rejectionReasons],
    [false, ['legacy: server not selected', 'layerPolicy:existingUnrezzedIceAndPoor']]);
  const reasons = name => ranked.candidates.find(r => r.server && r.server.serverName === name).rejectionReasons;
  same(reasons('Archives'), ['legacy: server not selected', 'valueless']);
  same(reasons('HQ'), ['legacy: server not selected', 'secure']);
});

test('I1 scenario 6 (cost case) and 7: ICE for a server legacy did not select is recorded but never chosen', () => {
  // Nothing is affordable: legacy keeps Server 1 and offers no ICE priority-only.
  const ai = candidateAI({affordable: []});
  const ranked = ai._rankedInstallCandidates([iceB], true);
  same(ranked.options, []);
  assert.ok(ranked.candidates.every(r => !r.eligible));
  assert.ok(ranked.candidates.some(r => r.server === corp.RnD && r.card === iceB));
  const previous = DS.BeginNotes(true);
  const index = ai._bestInstallOption([{card: iceB, server: corp.RnD}]);
  const notes = DS.EndNotes(previous);
  assert.strictEqual(index, -1, 'an ineligible record is never returned');
  assert.ok(notes.installCandidates[0].some(r => r.server === 'R&D' && r.eligible === false));
});

test('I1 scenario 8: returned preferences keep their protection flags and side effects', () => {
  const ai = candidateAI({emptyRemotes: [server('Server 2', [{rezzed: true}])]});
  const recorded = [];
  ai._recordProtectionInstall = target => recorded.push(target);
  const previous = DS.BeginNotes(true);
  const options = ai._rankedInstallOptions([iceA], true);
  DS.EndNotes(previous);
  assert.ok(options.every(o => o.AIProtectionInstall === true));
  ai._returnPreference(['install'], 'install', options[0]);
  same(recorded, [remote]);
  const agenda = {title: 'Agenda', cardType: 'agenda'};
  ai._returnPreference(['install'], 'install', {cardToInstall: agenda, serverToInstallTo: null});
  assert.strictEqual(agenda.AIScoringPlanCommitted, true);
});

test('I1: every eligible record carries a score breakdown and a reason, and notes are serialisable', () => {
  const ai = candidateAI({affordable: [iceA, iceB], economy: true});
  const previous = DS.BeginNotes(true);
  ai._rankedInstallOptions([iceA, iceB], false);
  const notes = DS.EndNotes(previous);
  const ranked = ai._rankedInstallCandidates([iceA, iceB], false);
  for (const record of ranked.candidates.filter(r => r.eligible)) {
    assert.ok(record.scoreBreakdown && typeof record.scoreBreakdown.compatibilityOrder === 'number');
    assert.ok(record.reasons.length > 0 && record.reasons.every(Boolean));
  }
  assert.strictEqual(JSON.stringify(notes.installCandidates[0]), JSON.stringify(ranked.candidates.map(r => ai._traceInstallCandidate(r))));
});

console.log(tests + ' install-decision telemetry tests passed.');
