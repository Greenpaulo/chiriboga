// L8.2 acceptance reproduction. Run: node tests/pending/remote-deception-legibility.test.js
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
function setup(enabled = true, centralDepth = 1, depthRoll = 0) {
  const corp = {HQ: {cards: [], ice: Array(centralDepth).fill({})},
    RnD: {cards: [], ice: []}, archives: {cards: [], ice: []}, remoteServers: []};
  const runner = {grip: [], stack: []};
  const context = {console, corp, runner, playerTurn: corp,
    CheckCardType: (card, types) => types.includes(card.cardType),
    CheckSubType: (card, type) => (card.subTypes || []).includes(type),
    PlayerCanLook: (player, card) => player === corp || !!card.rezzed,
    CheckAdvance: card => card.cardType === 'agenda' || card.canBeAdvanced,
    AgendaPoints: player => player.agendaPoints || 0, AgendaPointsToWin: () => 7,
    Counters: (card, type) => card[type] || 0};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
  const ai = vm.runInContext('new CorpAI()', context);
  ai.options.deceptionLegibility = enabled;
  // Isolate the existing lifetime sampler; epoch/feedback combinations are
  // additional implementation tests, not a replacement for these assertions.
  ai.options.postureEpochs = false;
  ai.options.matchLocalPostureFeedback = false;
  ai._random = () => depthRoll;
  ai._log = () => {};
  ai._runnerMayWinIfServerBreached = server => !!server.winningBreach;
  function remote(type, extraRoot = false) {
    const card = {player: corp, cardType: type, agendaPoints: type === 'agenda' ? 2 : 0,
      canBeAdvanced: true, advancement: 0, AITurnsInstalled: 0};
    if (type === 'asset') card.AIPunishesAccess = () => 2;
    const server = {ice: [{}], root: [card]};
    if (extraRoot) server.root.push({player: corp, cardType: 'upgrade'});
    corp.remoteServers.push(server);
    return {card, server};
  }
  return {ai, corp, runner, remote};
}

test('multi-root agendas and traps both use ordinary advancement', () => {
  for (const type of ['agenda', 'asset']) {
    const {ai, remote} = setup();
    const {card, server} = remote(type, true);
    assert.strictEqual(ai._deceptionAdvancementTarget(card, server, 4), 4, type);
    assert.strictEqual(ai._deceptionProtectionTarget(server), null, type);
  }
});
test('relative depth uses HQ/R&D and clamps offsets for both payload classes', () => {
  for (const type of ['agenda', 'asset']) {
    for (const [depth, roll, expected] of [[1, 0.5, 1], [2, 0.5, 2], [1, 0, 1], [3, 0.9, 3]]) {
      const {ai, remote} = setup(true, depth, roll);
      const {card} = remote(type);
      assert.strictEqual(ai._remoteDeceptionProfile(card).targetIce, expected, `${type}, central ${depth}, roll ${roll}`);
    }
  }
});
test('two completed Corp turns with ICE elsewhere top up a reached target once', () => {
  for (const type of ['agenda', 'asset']) {
    const {ai, corp, remote} = setup();
    const {server} = remote(type);
    assert.strictEqual(ai._NoMoreProtectionForThisServer(server), true);
    ai._publicPostureTurn = 1;
    ai._recordPublicPostureEvent('iceInstalled', corp.HQ, {}, 1);
    ai._publicPostureTurn = 2;
    ai._recordPublicPostureEvent('iceInstalled', corp.HQ, {}, 1);
    ai._publicPostureTurn = 3;
    assert.strictEqual(ai._NoMoreProtectionForThisServer(server), false, type);
    assert.strictEqual(ai._deceptionProtectionTarget(server), 2);
    server.ice.push({});
    ai._recordPublicPostureEvent('iceInstalled', corp.HQ, {}, 1);
    ai._publicPostureTurn = 4;
    assert.strictEqual(ai._deceptionProtectionTarget(server), 2, 'one raise per lifetime posture');
  }
});
test('winning-breach safety remains authoritative', () => {
  const {ai, remote} = setup();
  for (const type of ['agenda', 'asset']) {
    const {card, server} = remote(type);
    server.winningBreach = true;
    assert.strictEqual(ai._deceptionAdvancementTarget(card, server, 4), 4);
    assert.strictEqual(ai._deceptionProtectionTarget(server), null);
  }
});
test('option off preserves absolute profiles and multi-root trap cadence', () => {
  const {ai, remote} = setup(false, 1, 0.5);
  assert.strictEqual(ai._remoteDeceptionProfile(remote('agenda').card).targetIce, 2);
  ai._random = () => 0;
  const {card, server} = remote('asset', true);
  assert.strictEqual(ai._deceptionAdvancementTarget(card, server, 4), 0);
  assert.strictEqual(ai._deceptionProtectionTarget(server), null);
});
console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exitCode = 1;
