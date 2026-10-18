'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
function world(type = 'agenda', epochs = false, feedback = false) {
  const corp = {creditPool: 20, HQ: {cards: [], ice: [{}]}, RnD: {cards: [], ice: []},
    archives: {cards: [], ice: []}, remoteServers: []};
  const runner = {creditPool: 0, grip: [], stack: [], rig: {programs: []}};
  const notes = [], logs = [];
  const c = {console, corp, runner, playerTurn: corp, AIHypothetical: {depth: 0},
    Credits: p => p.creditPool, Counters: (card, field) => card[field] || 0,
    CheckCardType: (card, types) => types.includes(card.cardType),
    CheckSubType: (card, type) => (card.subTypes || []).includes(type),
    CheckAdvance: () => true, PlayerCanLook: (p, card) => p === corp || !!card.rezzed,
    AgendaPoints: p => p.agendaPoints || 0, AgendaPointsToWin: () => 7,
    DecisionSnapshots: {Note: (kind, data) => notes.push({kind, ...data})}};
  vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), c);
  const ai = corp.AI = vm.runInContext('new CorpAI()', c);
  Object.assign(ai.options, {deceptionLegibility: true, postureEpochs: epochs, matchLocalPostureFeedback: feedback});
  ai._log = text => logs.push(text);
  ai._runnerMayWinIfServerBreached = server => !!server.winningBreach;
  let draws = 0;
  ai._random = () => { draws++; return 0; };
  const card = {player: corp, cardType: type, agendaPoints: type === 'agenda' ? 2 : 0,
    advancement: 0, AITurnsInstalled: 0};
  if (type === 'asset') card.AIPunishesAccess = () => 2;
  const server = {root: [card], ice: [{}]}; corp.remoteServers.push(server);
  function install(turn, destination = corp.HQ, side = 'corp') {
    ai._publicPostureTurn = turn; c.playerTurn = side === 'corp' ? corp : runner;
    ai._recordPublicPostureEvent('iceInstalled', destination, {}, 1);
    c.playerTurn = corp;
  }
  const reason = name => notes.some(note => note.kind === 'deceptionLegibility' && note.reason === name);
  return {ai, corp, runner, c, card, server, notes, logs, install, reason, draws: () => draws};
}
test('single roots share cadence and relative target; multi-root rejection explains ordinary cadence', () => {
  for (const type of ['agenda', 'asset']) {
    const w = world(type);
    assert.strictEqual(w.ai._deceptionAdvancementTarget(w.card, w.server, 4), 0);
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1);
    assert(w.reason('relativeDepth'));
    w.server.root.push({cardType: 'upgrade'});
    assert.strictEqual(w.ai._deceptionAdvancementTarget(w.card, w.server, 4), 4);
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), null);
    assert(w.reason('ineligibleRoot'));
  }
});
test('HQ/R&D frame excludes Archives and is cached without another draw', () => {
  const w = world(); w.corp.archives.ice = Array(4).fill({});
  w.ai._random = () => 0.5;
  assert.strictEqual(w.ai._remoteDeceptionProfile(w.card).targetIce, 1);
  w.corp.RnD.ice = Array(3).fill({});
  assert.strictEqual(w.ai._remoteDeceptionProfile(w.card).targetIce, 1);
  const fresh = {...w.card};
  assert.strictEqual(w.ai._remoteDeceptionProfile(fresh).targetIce, 3);
});
test('top-up requires each completed turn and excludes current, Runner and same-server installs', () => {
  for (const situation of ['missing', 'current', 'runner', 'sameServer']) {
    const w = world();
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1);
    w.install(1);
    if (situation === 'current') w.install(3);
    if (situation === 'runner') w.install(2, w.corp.HQ, 'runner');
    if (situation === 'sameServer') { w.install(2); w.install(2, w.server); }
    w.ai._publicPostureTurn = 3;
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1, situation);
    assert(w.reason(situation === 'sameServer' ? 'sameServerIce' : 'historyIncomplete'), situation);
  }
});
test('top-up does not change the base profile and repeats do not raise or reroll', () => {
  for (const type of ['agenda', 'asset']) for (const epochs of [false, true]) for (const feedback of [false, true]) {
    const w = world(type, epochs, feedback);
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1);
    const base = w.ai._cardDeceptionProfiles.get(w.card), original = JSON.stringify(base);
    w.install(1); w.install(2); w.ai._publicPostureTurn = 3;
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 2);
    const draws = w.draws();
    for (let i = 0; i < 3; i++) assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 2);
    assert.strictEqual(w.draws(), draws);
    assert.strictEqual(JSON.stringify(base), original);
    assert(w.reason('topUp')); assert(w.reason('topUpAlreadyApplied'));
  }
});
test('hypothetical queries cannot consume the one top-up', () => {
  const w = world(); w.ai._deceptionProtectionTarget(w.server);
  w.install(1); w.install(2); w.ai._publicPostureTurn = 3;
  w.c.AIHypothetical.depth = 1;
  assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1);
  w.c.AIHypothetical.depth = 0;
  assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 2);
  assert(w.reason('topUp'));
});
test('safety and game-winning scoring override eligible top-up with a reason', () => {
  for (const type of ['agenda', 'asset']) {
    const w = world(type); w.ai._deceptionProtectionTarget(w.server);
    w.install(1); w.install(2); w.ai._publicPostureTurn = 3; w.server.winningBreach = true;
    assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), null);
    assert.strictEqual(w.ai._deceptionAdvancementTarget(w.card, w.server, 4), 4);
    assert(w.reason('tacticalSafety'));
  }
  const w = world(); w.corp.agendaPoints = 6;
  assert.strictEqual(w.ai._deceptionAdvancementTarget(w.card, w.server, 4), 4);
  assert(w.reason('tacticalSafety'));
});
test('top-up waits until base depth, caps at three and resets on an actual later commitment', () => {
  const w = world('agenda', true); w.ai._postureEpoch = 1;
  w.ai._deceptionProtectionTarget(w.server); w.server.ice = [];
  w.install(1); w.install(2); w.ai._publicPostureTurn = 3;
  assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 1);
  w.server.ice = [{}]; assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 2);
  w.server.ice.push({});
  w.ai._postureEpoch = 3; w.install(3); w.ai._publicPostureTurn = 4;
  assert.strictEqual(w.ai._deceptionProtectionTarget(w.server), 2, 'new commitment gets one raise from the base');
  w.corp.HQ.ice = [{}, {}, {}];
  w.ai._cardDeceptionProfiles.delete(w.card); w.ai._random = () => 0.9;
  assert.strictEqual(w.ai._remoteDeceptionProfile(w.card).targetIce, 3);
});
test('hidden Runner identities do not affect profile, cadence or top-up', () => {
  const results = [];
  for (const hidden of ['first', 'second']) {
    const w = world('asset', true, true);
    const card = new Proxy({}, {get() { throw Error('hidden ' + hidden + ' identity read'); }});
    w.runner.grip = [card]; w.runner.stack = [card, card];
    const target = w.ai._deceptionProtectionTarget(w.server);
    w.install(1); w.install(2); w.ai._publicPostureTurn = 3;
    results.push([target, w.ai._deceptionAdvancementTarget(w.card, w.server, 4),
      w.ai._deceptionProtectionTarget(w.server), JSON.stringify(w.ai._remoteDeceptionProfile(w.card)), w.draws()]);
  }
  assert.deepStrictEqual(results[0], results[1]);
});
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
