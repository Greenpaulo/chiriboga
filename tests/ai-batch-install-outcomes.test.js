'use strict';
// I0 collectors (scripts/ai-batch/collectors/): a scripted sequence through
// the headless runner's root-card tracker (createRootTracker in
// scripts/ai-batch/headless.js) and turn events, checked against hand-counted
// values. Real-game use is covered by the F4 batch reports.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {createRootTracker, playGame} = require('../scripts/ai-batch/headless');
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

test('reinstalled roots retain separate fates, exposure and payoff', () => {
  const out = play(g => {
    const asset = {title: 'Reinstalled asset', cardType: 'asset', subTypes: ['Ambush']};
    const agenda = {title: 'Reinstalled agenda', cardType: 'agenda'};
    const root = g.corp.HQ.root;
    g.corpTurn(hand(5, []));
    for (const card of [asset, agenda]) { root.push(card); card.cardLocation = root; }
    g.step();
    const id = g.tracker.idOf(asset);
    g.emit('rez', {id, cost: 2});
    g.emit('cardCredits', {id, credits: 3});
    g.emit('cardUsed', {id});
    g.runnerTurn();
    for (const card of [asset, agenda]) move(card, root, g.corp.HQ.cards);
    g.step();
    // Off-board activity must not pay off the next installation.
    g.emit('cardCredits', {id, credits: 100});
    g.emit('cardUsed', {id});
    g.corpTurn(hand(5, []));
    for (const card of [asset, agenda]) move(card, g.corp.HQ.cards, root);
    g.step();
    g.emit('rez', {id, cost: 4});
    g.runnerTurn();
    g.corpTurn(hand(5, []));
    move(asset, root, g.corp.archives.cards);
    move(agenda, root, g.corp.scoreArea);
    g.end(0);
  }).installOutcomes;
  assert.strictEqual(out.assetsInstalled, 2);
  assert.strictEqual(out.assetNetCredits, -3);
  assert.strictEqual(out.trapTriggers, 1);
  assert.strictEqual(out.assetsTrashedBeforePayoff, 1);
  assert.strictEqual(out.abandoned, 1);
  assert.strictEqual(out.agendasInstalled, 2);
  assert.strictEqual(out.agendasScored, 1);
  assert.strictEqual(out.installToScoreTurns, 1);
  assert.strictEqual(out.agendaExposureTurns, 1);
});

test('a starting root enters metrics only after leaving and being reinstalled', () => {
  const out = play(g => {
    const card = {title: 'Starting asset', cardType: 'asset'};
    g.corp.HQ.root.push(card); card.cardLocation = g.corp.HQ.root;
    g.tracker.start(g.corp);
    g.corpTurn(hand(5, []));
    g.emit('cardCredits', {id: g.tracker.idOf(card), credits: 100});
    move(card, g.corp.HQ.root, g.corp.HQ.cards);
    g.step();
    move(card, g.corp.HQ.cards, g.corp.HQ.root);
    g.step();
    g.emit('rez', {id: g.tracker.idOf(card), cost: 2});
    move(card, g.corp.HQ.root, g.corp.archives.cards);
    g.end(0);
  }).installOutcomes;
  assert.strictEqual(out.assetsInstalled, 1);
  assert.strictEqual(out.assetNetCredits, -2);
  assert.strictEqual(out.assetsTrashedBeforePayoff, 1);
});

test('access-trash attribution resets on a later installation', () => {
  const events = [];
  const tracker = createRootTracker((type, data) => events.push({type, ...data}));
  const {corp, runner} = board();
  const card = {title: 'Trap', cardType: 'asset'};
  tracker.start(corp);
  corp.HQ.root.push(card); card.cardLocation = corp.HQ.root;
  tracker.observe(corp, runner, 1);
  tracker.trashing([card], card);
  move(card, corp.HQ.root, corp.archives.cards);
  tracker.observe(corp, runner, 1);
  move(card, corp.archives.cards, corp.HQ.root);
  tracker.observe(corp, runner, 2);
  move(card, corp.HQ.root, corp.archives.cards);
  tracker.observe(corp, runner, 2);
  assert.deepStrictEqual(events.filter(e => e.type === 'leave').map(e => e.fate), ['trashedOnAccess', 'trashed']);
});

async function observedWrappers() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'install-outcomes-'));
  try {
    const setupFile = path.join(tmp, 'setup.js');
    fs.writeFileSync(setupFile, `
      StartGame = function() {
        playerTurn = corp;
        ChangePhase(phases.corpActionMain);
        var asset = {title: "Observed asset", cardType: "asset", player: corp, credits: 2};
        var trap = {title: "Observed trap", cardType: "asset", player: corp, subTypes: ["Ambush"]};
        corp.HQ.root.push(asset, trap);
        asset.cardLocation = trap.cardLocation = corp.HQ.root;
        __stop();
        SpendCredits(corp, 2, "rezzing", asset);
        GainCredits(corp, 3, false, asset);
        TakeCredits(corp, asset, 5);
        TriggerAbility(asset, {text: "Use asset", Resolve: function() {}}).Resolve.continue({});
        trap.responseOnAccess = {Resolve: function() { this.resolved = true; }};
        var phase = DecisionPhase(corp, [{}], trap.responseOnAccess.Resolve, "Trap", "Trap", trap);
        // Creating a decision alone must not count as resolving the trap.
        if (trap.resolved) throw new Error("trap resolved before choosing");
        phase.Resolve.continue({});
        AIHypothetical.depth++;
        GainCredits(corp, 7, false, asset);
        TakeCredits(corp, asset, 1);
        TriggerAbility(asset, {Resolve: function() {}}).Resolve.continue({});
        DecisionPhase(corp, [{}], trap.responseOnAccess.Resolve, "Trap", "Trap", trap).Resolve.continue({});
        AIHypothetical.depth--;
        __report = function() { return {credits: corp.creditPool, trapResolved: trap.resolved}; };
        PlayerWin(corp, "scripted observation");
      };
    `);
    const events = [];
    const state = {};
    const installs = collector('installOutcomes');
    const result = await playGame({streamPrefix: 'install-wrapper-test', corpFile: 'Gateway Corp.js',
      runnerFile: 'Gateway Runner.js', setFiles: ['sets/systemgateway.js'], timeoutMs: 10000,
      observe: true, setupFile, onEvent: event => { events.push(event); installs.onEvent(event, state); }});
    assert.deepStrictEqual(result.errors, []);
    assert.strictEqual(result.winner, 'corp');
    assert.strictEqual(result.report.credits, 15, 'real engine functions still update credits');
    assert.strictEqual(result.report.trapResolved, true);
    const asset = events.find(e => e.type === 'install' && e.card === 'Observed asset');
    const trap = events.find(e => e.type === 'install' && e.card === 'Observed trap');
    assert.ok(asset && trap);
    assert.deepStrictEqual(events.filter(e => e.type === 'rez').map(e => [e.id, e.cost]), [[asset.id, 2]]);
    assert.deepStrictEqual(events.filter(e => e.type === 'cardCredits').map(e => [e.id, e.credits]),
      [[asset.id, 3], [asset.id, 2]]);
    assert.deepStrictEqual(events.filter(e => e.type === 'cardUsed').map(e => e.id), [asset.id, trap.id]);
    const outcomes = installs.finish(state);
    assert.strictEqual(outcomes.assetsInstalled, 2);
    assert.strictEqual(outcomes.assetNetCredits, 3);
    assert.strictEqual(outcomes.trapTriggers, 1);
    tests++;
    console.log(tests + ' I0 collector tests passed.');
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
}
observedWrappers().catch(error => { console.error('FAIL observed headless wrappers\n' + error.stack); process.exitCode = 1; });
