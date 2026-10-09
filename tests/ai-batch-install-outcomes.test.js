'use strict';
// I0 collectors (scripts/ai-batch/collectors/): a scripted sequence through
// the headless runner's root-card tracker (createRootTracker in
// scripts/ai-batch/headless.js) and turn events, checked against hand-counted
// values. Real-game use is covered by the F4 batch reports.
const assert = require('assert');
const path = require('path');
const {createRootTracker} = require('../scripts/ai-batch/headless');
const collector = name => require(path.join(__dirname, '..', 'scripts', 'ai-batch', 'collectors', name + '.js'));
const COLLECTORS = ['installOutcomes', 'successfulRunsByServer', 'corpInsolventTurns', 'stallTurns', 'unusedCreditsAtEnd'].map(collector);

let tests = 0;
const test = (name, body) => {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (process.env.VERBOSE) console.log('PASS ' + name);
};

// A minimal board with the fields the tracker reads.
function board() {
  const central = name => ({serverName: name, cards: [], ice: [], root: []});
  const corp = {HQ: central('HQ'), RnD: central('R&D'), archives: central('Archives'), remoteServers: [], scoreArea: []};
  const runner = {scoreArea: []};
  return {corp, runner};
}
const move = (card, from, to) => { from.splice(from.indexOf(card), 1); to.push(card); card.cardLocation = to; };

function play(script) {
  const states = COLLECTORS.map(() => ({}));
  const emit = (type, data) => {
    const event = Object.freeze(Object.assign({type}, data));
    COLLECTORS.forEach((c, i) => c.onEvent(event, states[i]));
  };
  const tracker = createRootTracker(emit);
  const {corp, runner} = board();
  let turn = 0;
  const api = {
    corp, runner, tracker, emit,
    corpTurn(state) { turn++; tracker.observe(corp, runner, turn, false); emit('turnStart', {side: 'corp', turn, corp: state}); },
    runnerTurn() { tracker.observe(corp, runner, turn, false); emit('turnEnd', {side: 'corp', turn}); emit('turnStart', {side: 'runner', turn}); },
    step() { tracker.observe(corp, runner, turn, false); },
    end(corpCredits) { tracker.observe(corp, runner, turn, true); emit('gameEnd', {winner: 'runner', turns: turn, corpCredits}); },
  };
  emit('gameStart', {});
  tracker.start(corp);
  script(api);
  const out = {};
  COLLECTORS.forEach((c, i) => { out[c.name] = c.finish(states[i]); });
  return out;
}
const hand = (credits, cards) => ({credits, hand: cards, unrezzedIceRezCosts: []});

// I0 scenario 4.
test('installOutcomes follows a stolen and a scored agenda to their fates', () => {
  const out = play(g => {
    const remote1 = {serverName: 'Server 1', ice: [], root: []};
    const remote2 = {serverName: 'Server 2', ice: [], root: []};
    const stolen = {title: 'Stolen agenda', cardType: 'agenda'};
    const scored = {title: 'Scored agenda', cardType: 'agenda'};
    g.corpTurn(hand(5, []));                       // turn 1: install both
    g.corp.remoteServers.push(remote1, remote2);
    remote1.root.push(stolen); stolen.cardLocation = remote1.root;
    remote2.root.push(scored); scored.cardLocation = remote2.root;
    g.step();
    g.runnerTurn();                                // Runner turn 1 (both exposed)
    g.corpTurn(hand(5, []));                       // turn 2: score one
    move(scored, remote2.root, g.corp.scoreArea);
    g.step();
    g.runnerTurn();                                // Runner turn 2: steal the other
    move(stolen, remote1.root, g.runner.scoreArea);
    g.end(3);
  }).installOutcomes;
  assert.strictEqual(out.agendasInstalled, 2);
  assert.strictEqual(out.agendasScored, 1);
  assert.strictEqual(out.agendasStolen, 1);
  assert.strictEqual(out.installToScoreTurns, 1, 'scored the turn after install');
  // Stolen agenda exposed to Runner turns 1 and 2, scored one to turn 1 only.
  assert.strictEqual(out.agendaExposureTurns, 1.5);
});

test('assets, traps and abandoned commitments', () => {
  const out = play(g => {
    const remote = {serverName: 'Server 1', ice: [], root: []};
    const trapRemote = {serverName: 'Server 2', ice: [], root: []};
    const asset = {title: 'Economy asset', cardType: 'asset', subTypes: []};
    const trap = {title: 'Trap', cardType: 'asset', subTypes: ['Ambush']};
    const preexisting = {title: 'Start-board asset', cardType: 'asset'};
    g.corp.HQ.root.push(preexisting); // already on the board: ignored
    g.tracker.start(g.corp);
    g.corpTurn(hand(5, []));
    g.corp.remoteServers.push(remote, trapRemote);
    remote.root.push(asset); asset.cardLocation = remote.root;
    trapRemote.root.push(trap); trap.cardLocation = trapRemote.root;
    g.step();
    g.emit('rez', {id: g.tracker.idOf(asset), cardType: 'asset', cost: 2, hosted: []});
    g.emit('cardCredits', {id: g.tracker.idOf(asset), credits: 3});
    g.emit('cardUsed', {id: g.tracker.idOf(trap)});
    g.runnerTurn();
    g.tracker.trashing([trap], trap);            // trashed while accessed
    move(trap, trapRemote.root, g.corp.archives.cards);
    move(asset, remote.root, g.corp.archives.cards); // Corp-side trash after paying off
    g.end(0);
  }).installOutcomes;
  assert.strictEqual(out.assetsInstalled, 2);
  assert.strictEqual(out.assetNetCredits, 1, '3 credits gained minus 2 to rez; the trap made none');
  assert.strictEqual(out.trapTriggers, 1);
  assert.strictEqual(out.assetsTrashedBeforePayoff, 0, 'both paid off before leaving');
  assert.strictEqual(out.abandoned, 0, 'the used asset is not abandoned');
});

test('turn collectors count runs, insolvency, stalls and credits left', () => {
  const out = play(g => {
    g.corpTurn({credits: 0, hand: [{cardType: 'ice', playCost: null}], unrezzedIceRezCosts: []}); // insolvent, able
    for (let i = 0; i < 3; i++)
      g.emit('decision', {side: 'corp', identifier: 'Corp 2.2', options: ['gain', 'draw', 'install'], chosen: 0});
    g.runnerTurn();
    g.emit('run', {server: 'rd', success: true});
    g.emit('run', {server: 'hq', success: false});
    g.corpTurn({credits: 2, hand: [{cardType: 'operation', playCost: 5}], unrezzedIceRezCosts: [3]}); // insolvent, unable
    for (let i = 0; i < 3; i++)
      g.emit('decision', {side: 'corp', identifier: 'Corp 2.2', options: ['gain', 'draw'], chosen: 0});
    g.runnerTurn();
    g.corpTurn({credits: 4, hand: [{cardType: 'operation', playCost: 1}], unrezzedIceRezCosts: [3]});
    g.emit('decision', {side: 'corp', identifier: 'Corp 2.2', options: ['gain', 'play'], chosen: 1});
    g.end(7);
  });
  assert.deepStrictEqual(out.successfulRunsByServer, {hq: 0, rd: 1, archives: 0, remote: 0});
  assert.strictEqual(out.corpInsolventTurns, 2);
  assert.strictEqual(out.stallTurns, 1, 'only the turn that could have installed but clicked for credits');
  assert.strictEqual(out.unusedCreditsAtEnd, 7);
});

console.log(tests + ' I0 collector tests passed.');
