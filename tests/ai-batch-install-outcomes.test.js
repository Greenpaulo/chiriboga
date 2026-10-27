'use strict';
// I0 collectors (scripts/ai-batch/collectors/): a scripted sequence through
// the headless runner's root-card tracker (createRootTracker in
// scripts/ai-batch/headless.js) and turn events, checked against hand-counted
// values. Real-game use is covered by the F4 batch reports.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {createRootTracker, playGame, agendaTurnSnapshot} = require('../scripts/ai-batch/headless');
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

test('central ICE observations do not create root commitments', () => {
  const outcomes = collector('installOutcomes');
  const state = {};
  outcomes.onEvent({type: 'gameStart'}, state);
  outcomes.onEvent({type: 'install', card: 'Central ICE', cardType: 'ice', server: 'hq', pressureSources: []}, state);
  assert.strictEqual(state.installOutcomes.installs.length, 0);
  assert.strictEqual(state.installOutcomes.active.size, 0);
  outcomes.onEvent({type: 'install', id: 1, cardType: 'agenda', turn: 1}, state);
  outcomes.onEvent({type: 'turnStart', side: 'runner'}, state);
  outcomes.onEvent({type: 'leave', id: 1, fate: 'scored', turn: 2}, state);
  assert.strictEqual(outcomes.finish(state).agendasScored, 1);
  assert.strictEqual(outcomes.finish(state).agendaExposureTurns, 1);
});

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

test('reinstalled agendas retain separate fates and exposure windows', () => {
  const out = play(g => {
    const agenda = {title: 'Returned agenda', cardType: 'agenda'};
    g.corpTurn(hand(5, []));
    g.corp.HQ.root.push(agenda); agenda.cardLocation = g.corp.HQ.root;
    g.step(); g.runnerTurn();
    move(agenda, g.corp.HQ.root, g.corp.HQ.cards); g.step();
    g.corpTurn(hand(5, [])); g.runnerTurn(); // no agenda installed
    g.corpTurn(hand(5, []));
    move(agenda, g.corp.HQ.cards, g.corp.HQ.root); g.step(); g.runnerTurn();
    g.corpTurn(hand(5, [])); g.runnerTurn();
    g.corpTurn(hand(5, []));
    move(agenda, g.corp.HQ.root, g.corp.scoreArea); g.end(5);
  }).installOutcomes;
  assert.strictEqual(out.agendasInstalled, 2);
  assert.strictEqual(out.agendasScored, 1);
  assert.strictEqual(out.installToScoreTurns, 2);
  assert.strictEqual(out.agendaExposureTurns, 1.5);
});

test('reinstalled assets reset access fate and keep payoff per installation', () => {
  const out = play(g => {
    const asset = {title: 'Recurring trap', cardType: 'asset', subTypes: ['Ambush']};
    g.corpTurn(hand(5, []));
    g.corp.HQ.root.push(asset); asset.cardLocation = g.corp.HQ.root; g.step();
    const id = g.tracker.idOf(asset);
    g.emit('rez', {id, cost: 2});
    g.emit('cardCredits', {id, credits: 3});
    g.emit('cardUsed', {id});
    g.tracker.trashing([asset], asset);
    move(asset, g.corp.HQ.root, g.corp.archives.cards); g.step();
    // Events off the board must not pay off the next installation.
    g.emit('cardCredits', {id, credits: 10}); g.emit('cardUsed', {id});
    move(asset, g.corp.archives.cards, g.corp.HQ.cards); g.step();
    move(asset, g.corp.HQ.cards, g.corp.HQ.root); g.step();
    assert.strictEqual(g.tracker.idOf(asset), id);
    g.emit('rez', {id, cost: 4});
    g.tracker.trashing([asset], null);
    move(asset, g.corp.HQ.root, g.corp.archives.cards); g.end(0);
  }).installOutcomes;
  assert.strictEqual(out.assetsInstalled, 2);
  assert.strictEqual(out.assetNetCredits, -3, '3 credits minus two independent rez costs');
  assert.strictEqual(out.trapTriggers, 1);
  assert.strictEqual(out.assetsTrashedBeforePayoff, 1, 'earlier payoff does not carry over');
  assert.strictEqual(out.abandoned, 1, 'the second trash occurred outside access and before use');
});

test('upgrade uses belong to the active installation only', () => {
  const out = play(g => {
    const upgrade = {title: 'Returned upgrade', cardType: 'upgrade'};
    g.corpTurn(hand(5, []));
    g.corp.HQ.root.push(upgrade); upgrade.cardLocation = g.corp.HQ.root; g.step();
    const id = g.tracker.idOf(upgrade);
    g.emit('cardUsed', {id});
    move(upgrade, g.corp.HQ.root, g.corp.HQ.cards); g.step();
    move(upgrade, g.corp.HQ.cards, g.corp.HQ.root); g.step();
    g.end(5);
  }).installOutcomes;
  assert.strictEqual(out.upgradesInstalled, 2);
  assert.strictEqual(out.upgradesUsed, 1);
});

test('I4 agendaCommitment counts idle installed agendas and HQ holds with a free remote', () => {
  const c = collector('agendaCommitment');
  const state = {};
  const counters = new WeakMap();
  const {corp} = board();
  const remote = {serverName: 'Remote 0', ice: [], root: []};
  corp.remoteServers.push(remote);
  const agenda = {title: 'A', cardType: 'agenda', advancement: 0};
  const asset = {title: 'B', cardType: 'asset'};
  const endTurn = () => c.onEvent({type: 'turnEnd', side: 'corp', agendas: agendaTurnSnapshot(corp, counters)}, state);
  c.onEvent({type: 'gameStart'}, state);
  corp.HQ.cards.push(agenda);
  endTurn(); // held while Remote 0 is empty: hold
  corp.HQ.cards.splice(0, 1); remote.root.push(agenda);
  endTurn(); // installed, no counter: idle; no free remote
  agenda.advancement = 2;
  endTurn(); // advanced: not idle
  endTurn(); // not advanced again: idle
  remote.root.splice(0, 1); corp.scoreArea.push(agenda);
  remote.root.push(asset); corp.HQ.cards.push({title: 'C', cardType: 'agenda'});
  endTurn(); // scored; agenda held but the only remote holds an asset: neither
  c.onEvent({type: 'turnEnd', side: 'runner'}, state);
  assert.deepStrictEqual(c.finish(state), {idleAgendaTurns: 2, hqHoldTurns: 1});
  assert.deepStrictEqual(Object.keys(c.directions).sort(),
    ['agendaCommitment.hqHoldTurns', 'agendaCommitment.idleAgendaTurns']);
});

test('I4 remoteAgendaRisk pools steal rates by ICE count and counters', () => {
  const c = collector('remoteAgendaRisk');
  const row = (iceCount, counters, stolen, bucket = '0..1') =>
    ({serverName: 'Remote 0', iceCount, rezzedIce: 0, counters, points: 2, bucket, stolen});
  const games = [[row(0, 0, true), row(1, 2, false)], [row(1, 0, false), row(3, 1, true, '>=10')]].map(servers => {
    const state = {};
    c.onEvent({type: 'gameStart'}, state);
    servers.forEach((server, turn) => c.onEvent({type: 'remoteAgendaTurn', turn, servers: [server]}, state));
    return state;
  });
  assert.deepStrictEqual(c.finish(games[0]), {turns: 2, stolen: 1});
  const out = c.summarize(games.map(c.samples));
  assert.deepStrictEqual(Object.fromEntries(Object.entries(out.byIceAndCounters).map(([k, v]) => [k, [v.turns, v.stolen, v.games]])),
    {'0 ice / 0 counters': [1, 1, 1], '1 ice / 0 counters': [1, 0, 1], '1 ice / 1+ counters': [1, 0, 1],
      '2+ ice / 1+ counters': [1, 1, 1]});
  assert.deepStrictEqual(Object.keys(out.byBucket), ['0..1', '>=10']);
  const [low, high] = c._test.wilson(5, 50);
  assert.ok(low > 0.04 && low < 0.05 && high > 0.21 && high < 0.22);
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

// I2: credits paid installing ICE that is never rezzed afterwards.
test('strandedUnrezzedIceCost counts install credits of ICE never rezzed', () => {
  const stranded = collector('strandedUnrezzedIceCost');
  const state = {};
  const on = (type, data) => stranded.onEvent(Object.assign({type}, data), state);
  on('gameStart', {});
  on('iceInstall', {id: 1, cost: 0});  // outermost layer, later rezzed
  on('iceInstall', {id: 2, cost: 1});  // never rezzed
  on('iceInstall', {id: 3, cost: 2});  // rezzed
  on('iceInstall', {id: 4, cost: 3});  // trashed unrezzed: no rez follows
  on('iceRez', {id: 1}); on('iceRez', {id: 3});
  on('iceRez', {id: 9});               // ICE from a start board: nothing paid here
  assert.deepStrictEqual(stranded.finish(state), {credits: 4});
  assert.strictEqual(stranded.directions['strandedUnrezzedIceCost.credits'], 'lower');
});

test('openingCentralCoverage records occupancy, censored boundaries and raw printed hand supply', () => {
  const c = collector('openingCentralCoverage');
  for (const [hq, rd, both] of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 1]]) {
    const state = {};
    c.onEvent({type: 'gameStart'}, state);
    c.onEvent({type: 'turnEnd', side: 'runner', turn: 1, centralIce: {hq: 9, rd: 9}}, state);
    c.onEvent({type: 'turnEnd', side: 'corp', turn: 1, centralIce: {hq, rd}}, state);
    assert.deepStrictEqual(c.finish(state), {turn1: {observed: 1, both}, turn2: {observed: 0, both: 0}});
    const offered = [{card: 'Expensive', cardType: 'ice', rezCost: 15}, {card: 'Unsuitable', cardType: 'ice', rezCost: 0}];
    c.onEvent({type: 'openingHand', stage: 'offered', mulligan: true, credits: 5, cards: offered}, state);
    c.onEvent({type: 'openingHand', stage: 'kept', mulligan: true, credits: 5, cards: []}, state);
    c.onEvent({type: 'openingHand', stage: 'firstDraw', mulligan: null, credits: 5, cards: [offered[0]]}, state);
    offered[0].rezCost = 1;
    assert.strictEqual(c.samples(state).hands.offered.cards[0].rezCost, 15, 'sample is detached');
    assert.strictEqual(c.samples(state).hands.kept.cards.length, 0);
    assert.strictEqual(c.samples(state).hands.firstDraw.cards.length, 1);
    assert.strictEqual(c.samples(state).hands.firstDraw.cards[0].rezCost, 15, 'first draw is detached');
    c.onEvent({type: 'gameEnd'}, state);
    assert.strictEqual(c.finish(state).turn2.observed, 0, 'early end does not fabricate a boundary');
  }
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
        // Real deck ICE (Rez() needs a renderable card), moved onto HQ.
        var deckIce = corp.RnD.cards.filter(function(c) { return c.cardType === "ice"; });
        var wall = deckIce[0], stranded = deckIce[1];
        [wall, stranded].forEach(function(c) { MoveCard(c, corp.HQ.ice); });
        SpendCredits(corp, 1, "installing", wall);
        SpendCredits(corp, 2, "installing", stranded);
        Rez(wall, true);
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
    assert.strictEqual(result.report.credits, 12, 'real engine functions still update credits (15 less 3 paid for ICE)');
    assert.strictEqual(result.report.trapResolved, true);
    const asset = events.find(e => e.type === 'install' && e.card === 'Observed asset');
    const trap = events.find(e => e.type === 'install' && e.card === 'Observed trap');
    assert.ok(asset && trap);
    assert.deepStrictEqual(events.filter(e => e.type === 'rez').map(e => [e.id, e.cost]), [[asset.id, 2]]);
    assert.deepStrictEqual(events.filter(e => e.type === 'cardCredits').map(e => [e.id, e.credits]),
      [[asset.id, 3], [asset.id, 2]]);
    assert.deepStrictEqual(events.filter(e => e.type === 'cardUsed').map(e => e.id), [asset.id, trap.id]);
    const iceIds = events.filter(e => e.type === 'iceInstall').map(e => e.id);
    assert.deepStrictEqual(events.filter(e => e.type === 'iceInstall').map(e => [e.id, e.cost]), [[iceIds[0], 1], [iceIds[1], 2]]);
    assert.deepStrictEqual(events.filter(e => e.type === 'iceRez').map(e => e.id), [iceIds[0]], 'a free rez is observed');
    assert.deepStrictEqual(events.filter(e => e.type === 'iceInstalled').map(e => [e.server, e.iceCount]), [['hq', 2], ['hq', 2]],
      'ICE newly seen on the board is reported once, with its server kind');
    const stranded = collector('strandedUnrezzedIceCost'), strandedState = {};
    events.forEach(event => stranded.onEvent(event, strandedState));
    assert.deepStrictEqual(stranded.finish(strandedState), {credits: 2});
    const outcomes = installs.finish(state);
    assert.strictEqual(outcomes.assetsInstalled, 2);
    assert.strictEqual(outcomes.assetNetCredits, 3);
    assert.strictEqual(outcomes.trapTriggers, 1);
    tests++;
    console.log(tests + ' I0 collector tests passed.');
  } finally { fs.rmSync(tmp, {recursive: true, force: true}); }
}
main().catch(error => { console.error('FAIL observed headless wrappers\n' + error.stack); process.exitCode = 1; });

async function openingCompletedWrappers() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'opening-completion-'));
  try {
    const setupFile = path.join(tmp, 'setup.js');
    fs.writeFileSync(setupFile, `
      StartGame = function() {
        playerTurn = corp; corp.creditPool = 30;
        ChangePhase(phases.corpActionMain); __stop();
        var parent = currentPhase;
        var cards = corp.RnD.cards.filter(function(c) {return c.cardType === "ice";});
        var wall = cards[0], other = cards[1];
        var counts = [];
        function settle(target) {
          for (var hops = 0; currentPhase !== target && hops < 40; hops++) {
            if (currentPhase.Resolve.n) currentPhase.Resolve.n.call(currentPhase, {});
            else if (currentPhase.Resolve.continue) currentPhase.Resolve.continue.call(currentPhase, {});
            else throw Error('Unexpected install response: ' + currentPhase.identifier);
          }
          if (currentPhase !== target) throw Error('Install response did not finish');
        }
        function install(card, server) {
          Install(card, server, true);
          var phase = currentPhase;
          phase.Resolve.n(); settle(parent);
          phase.Resolve.n(); // stale continuation must not count a second time
          counts.push(corp.AI._completedIceInstalls);
        }
        install(wall, corp.HQ);
        Install(other, corp.RnD, true);
        currentPhase.Cancel.trash();
        counts.push(corp.AI._completedIceInstalls);
        ChangePhase(parent);
        Rez(wall, true); settle(parent);
        MoveCard(wall, corp.RnD.ice);
        counts.push(corp.AI._completedIceInstalls);
        MoveCard(wall, corp.HQ.cards);
        install(wall, corp.RnD);
        Trash(wall, false); settle(parent);
        counts.push(corp.AI._completedIceInstalls);
        install(wall, corp.HQ);
        AIHypothetical.depth++;
        try {corp.AI._recordCompletedIceInstall(other, corp.RnD);} finally {AIHypothetical.depth--;}
        ChangePhase(phases.runnerStartResponse); __stop();
        MoveCard(wall, corp.RnD.ice);
        ChangePhase(phases.corpStartDraw); __stop();
        MoveCard(other, corp.HQ.ice); // movement is not installation
        ChangePhase(phases.runnerStartResponse); __stop();
        __report = function() {return {counts: counts, ordinal: corp.AI._completedIceInstalls,
          hq: corp.HQ.ice.length, rd: corp.RnD.ice.length};};
        PlayerWin(corp, 'Opening installation completion observation');
      };
    `);
    const results = [];
    let observed;
    for (const observe of [false, true]) {
      const events = [], state = {};
      const coverage = collector('openingCentralCoverage');
      const result = await playGame({streamPrefix: 'opening-completion-test', corpFile: 'Gateway Corp.js',
        runnerFile: 'Gateway Runner.js', setFiles: ['sets/systemgateway.js'], timeoutMs: 10000,
        observe, setupFile, onEvent: event => {events.push(event); coverage.onEvent(event, state);}});
      assert.deepStrictEqual(result.errors, []);
      assert.strictEqual(result.winner, 'corp');
      assert.deepStrictEqual(result.report.counts, [1, 1, 1, 2, 2, 3]);
      assert.strictEqual(result.report.ordinal, 3);
      results.push(result);
      if (observe) observed = {events, metrics: coverage.finish(state), samples: coverage.samples(state)};
    }
    assert.strictEqual(results[0].logHash, results[1].logHash, 'passive events preserve engine logs');
    assert.deepStrictEqual(results[0].report, results[1].report);
    assert.deepStrictEqual(observed.samples.installs.map(i => [i.ordinal, i.actual]), [[1, 'hq'], [2, 'rd'], [3, 'hq']]);
    assert.deepStrictEqual(observed.metrics, {turn1: {observed: 1, both: 0}, turn2: {observed: 1, both: 1}});
    tests++;
  } finally {fs.rmSync(tmp, {recursive: true, force: true});}
}

async function main() {
  await observedWrappers();
  await openingCompletedWrappers();
  console.log('I2.3 real completion, cancellation, reinstall, movement and boundary identity passed.');
}
