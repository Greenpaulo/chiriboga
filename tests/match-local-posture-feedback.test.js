// Real CorpAI/engine/card definitions. Public histories, choices and invariants.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const json = value => JSON.parse(JSON.stringify(value));
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + (error.stack || error)); }
}
function world(on = true, seed = 123) {
  const corp = {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []},
    archives: {cards: [], ice: [], root: []}, remoteServers: [], scoreArea: [], creditPool: 20,
    installingCards: [], identityCard: {}, badPublicity: 0};
  const runner = {rig: {programs: [], resources: [], hardware: []}, grip: [], stack: [],
    scoreArea: [], creditPool: 10, identityCard: {}, AI: null};
  const noOp = () => {};
  const ui = new Proxy({}, {get: () => () => ui});
  const deepCopy = obj => typeof obj !== 'object' || obj === null ? obj :
    Array.isArray(obj) ? obj.map(deepCopy) : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, deepCopy(v)]));
  const c = {console, corp, runner, playerTurn: corp, AIHypothetical: {depth: 0}, cardSet: {}, setIdentifiers: [],
    Log: noOp, PlaySound: noOp, UpdateCounters: noOp, Render: noOp, SetHistoryThumbnail: noOp,
    AddHistoryBreakIfRequired: noOp, RenderRewindOptions: noOp, ResolveAccess: noOp,
    AutomaticTriggers: noOp, Credits: p => p.creditPool, Counters: (card, field) => card[field] || 0,
    // This posture-only world has no run-entry modifiers; their payment is
    // exercised with the real utility/check functions in downfall-batch8.test.js.
    AdditionalRunCosts: () => ({clicks: 0, credits: 0}), CanPayAdditionalRunCosts: () => true,
    GetApproachEncounterIce: () => c.attackedServer ? c.attackedServer.ice[c.approachIce] : null,
    CheckCardType: (card, types) => types.includes(card.cardType), CheckSubType: (card, type) => (card.subTypes || []).includes(type),
    PlayerCanLook: (p, card) => p === corp || !!card.rezzed || !!card.faceUp,
    CheckAdvance: () => true, CheckInstalled: card => corp.remoteServers.some(s => s.root.includes(card)),
    AgendaPoints: p => p.agendaPoints || 0, AgendaPointsToWin: () => 7, GetTitle: card => card.title || 'Test card',
    AdvancementRequirement: card => card.advancementRequirement || 0,
    GetServer: card => [corp.HQ, corp.RnD, corp.archives, ...corp.remoteServers].find(s =>
      s.root.includes(card) || s.ice.includes(card) || (s.cards || []).includes(card)),
    $: () => ui, jQuery: {extend: (deep, target, source) => deepCopy(source)},
    rewinding: true, rewindStates: [], agendaStolenLocations: [], intended: {},
    document: {body: {classList: {add: noOp}}, querySelector: () => null},
  };
  vm.createContext(c);
  for (const file of ['ai_corp.js', 'mechanics.js', 'phase.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/vantagepoint.js'])
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
  // Scheduling/rendering are harness stubs; gameplay functions remain real.
  c.SetHistoryThumbnail = noOp; c.AddHistoryBreakIfRequired = noOp;
  c.TriggeredResponsePhase = (player, name, args, done) => { if (done) done(); return {}; };
  c.OpportunityForAvoidPrevent = (player, name, args, done) => done();
  c.MoveCard = (card, destination) => {
    const old = card.cardLocation;
    if (old && old.includes(card)) old.splice(old.indexOf(card), 1);
    destination.push(card); card.cardLocation = destination;
    corp.remoteServers = corp.remoteServers.filter(s => s.root.length || s.ice.length);
  };
  c.ai = vm.runInContext('new CorpAI()', c);
  corp.AI = c.ai;
  c.ai.options.matchLocalPostureFeedback = on;
  c.logs = [];
  c.ai._log = message => c.logs.push(message);
  c.events = [];
  c.ai._postureTelemetry = event => c.events.push(json(event));
  c.randomDraws = 0;
  c.ai._random = () => { c.randomDraws++; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  c.remote = (depth = 1, advances = 1, type = 'agenda') => {
    const renderer = {FaceUp: noOp, ToggleZoom: noOp, sprite: {x: 0, y: 0}, destinationPosition: {}};
    const card = {cardType: type, player: corp, advancement: advances, agendaPoints: 1, title: 'Test card', renderer};
    const s = {serverName: 'Remote', root: [card], ice: Array.from({length: depth}, () =>
      ({cardType: 'ice', player: corp, renderer, rezzed: false}))};
    card.cardLocation = s.root;
    s.ice.forEach(ice => ice.cardLocation = s.ice);
    corp.remoteServers.push(s);
    return {s, card};
  };
  c.activate = (s, card) => {
    c.ai._publicPostureTurnBegins('corp');
    c.ai._postureEpoch = c.ai._publicPostureTurn;
    c.ai._remoteDeceptionProfile(card);
    c.ai._epochPosture('bluff', s, card, () => 1);
  };
  c.challenge = s => { c.ai._recordPublicPostureEvent('runInitiated', s); c.ai._notePostureChallenge(s); };
  c.expose = () => { c.playerTurn = runner; c.ai._publicPostureTurnBegins('runner'); };
  c.settle = () => { c.playerTurn = corp; c.ai._publicPostureTurnBegins('corp'); c.ai._postureEpoch = c.ai._publicPostureTurn; };
  return c;
}
const mass = (ai, predicate) => ai._postureScriptDistribution().filter(predicate).reduce((sum, s) => sum + s.probability, 0);

test('ignored visible light posture modestly reinforces its shape and explains the change', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  const before = mass(c.ai, p => p.targetIce === 1 && p.delayTurns === 0);
  c.expose(); c.settle();
  const after = mass(c.ai, p => p.targetIce === 1 && p.delayTurns === 0);
  assert(after > before && after - before < 0.02);
  assert.strictEqual(c.ai._postureFeedbackReasons[0].reason, 'ignored');
  assert.strictEqual(c.ai._postureFeedbackReasons[0].script, 'd1a1t0');
  assert(c.logs.some(line => line.includes('Posture feedback ignored')));
  const ignored = c.ai._publicPostureHistory.filter(e => e.action === 'ignored');
  assert.strictEqual(ignored.length, 1);
});

test('public feedback changes a later seeded profile choice at a shared distribution boundary', () => {
  const choices = [];
  for (const on of [false, true]) {
    const c = world(on), {s, card} = c.remote(); c.activate(s, card);
    c.expose(); c.settle();
    c.ai._random = () => 0.303;
    choices.push(c.ai._remoteDeceptionProfile(c.remote().card).targetIce);
    if (on) assert.strictEqual(c.ai._postureFeedbackReasons[0].reason, 'ignored');
  }
  assert.deepStrictEqual(choices, [2, 1]);
});

test('seeded feedback replay changes a later profile choice only after settlement', () => {
  function replay(on) {
    const c = world(on), {s, card} = c.remote(); c.activate(s, card);
    c.expose();
    assert.strictEqual(c.ai._postureFeedbackSamples, 0, 'exposure alone does not settle feedback');
    c.settle();
    assert.strictEqual(c.ai._postureFeedbackSamples, on ? 1 : 0);
    let profileSeed = 173;
    const rolls = [];
    c.ai._random = () => {
      profileSeed = (Math.imul(profileSeed, 1664525) + 1013904223) >>> 0;
      const roll = profileSeed / 4294967296;
      rolls.push(roll);
      return roll;
    };
    const profile = json(c.ai._remoteDeceptionProfile(c.remote().card));
    return {profile, rolls, reasons: json(c.ai._postureFeedbackReasons)};
  }
  const baseline = replay(false), candidate = replay(true);
  assert.deepStrictEqual(baseline.rolls, candidate.rolls, 'both choices use the same seeded random stream');
  assert.strictEqual(baseline.rolls.length, 3);
  assert.strictEqual(baseline.profile.targetIce, 2);
  assert.strictEqual(candidate.profile.targetIce, 1);
  assert.strictEqual(candidate.reasons[0].reason, 'ignored');
  assert.deepStrictEqual(replay(false), baseline);
  assert.deepStrictEqual(replay(true), candidate);
});

test('repeated challenges favor deeper or delayed shapes; one turn is one sample', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  const before = mass(c.ai, p => p.targetIce >= 2 || p.delayTurns === 1);
  for (let turn = 0; turn < 4; turn++) {
    c.expose();
    for (let run = 0; run < 5; run++) c.challenge(s);
    c.settle();
  }
  assert(mass(c.ai, p => p.targetIce >= 2 || p.delayTurns === 1) > before);
  assert.strictEqual(c.ai._postureFeedbackSamples, 4);
  assert(c.ai._postureFeedbackReasons.every(r => r.reason === 'challenged'));
  assert.strictEqual(c.ai._postureOutcomeCounts.d1a1t0.runInitiated, 20);
});

test('prior bounds limit a single outcome, preserve every script and reset in a fresh game', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  c.expose(); c.challenge(s); c.settle();
  assert(Object.values(c.ai._postureScriptWeights).every(w => Math.abs(w - 1) <= 0.02));
  for (let i = 0; i < 150; i++) { c.expose(); c.challenge(s); c.settle(); }
  for (const script of c.ai._postureScriptDistribution()) {
    assert(script.weight >= 0.8 && script.weight <= 1.2);
    assert(script.probability >= 0.015);
  }
  const fresh = world();
  assert.deepStrictEqual(Object.values(fresh.ai._postureScriptWeights), Array(12).fill(1));
  assert.strictEqual(fresh.ai._publicPostureHistory.length, 0);
  assert.strictEqual(fresh.ai._postureFeedbackSamples, 0);
});

test('each settled exposure moves weights by at most 0.02 and emits one matching observation', () => {
  for (const history of [Array(60).fill(false), Array(60).fill(true),
    Array.from({length: 60}, (_, i) => i % 2 === 0)]) {
    const c = world(), {s, card} = c.remote(); c.activate(s, card);
    for (const challenged of history) {
      const before = json(c.ai._postureScriptWeights), samples = c.ai._postureFeedbackSamples;
      const observations = c.events.filter(e => e.action === 'weights').length;
      c.expose();
      if (challenged) for (let i = 0; i < 5; i++) c.challenge(s);
      assert.deepStrictEqual(json(c.ai._postureScriptWeights), before, 'public events do not update weights before settlement');
      c.settle();
      assert.strictEqual(c.ai._postureFeedbackSamples, samples + 1, 'multiple runs still settle one sample');
      for (const [id, weight] of Object.entries(c.ai._postureScriptWeights))
        assert(Math.abs(weight - before[id]) <= 0.02 + 1e-12, `${id}: one exposure exceeds the movement limit`);
      const events = c.events.filter(e => e.action === 'weights');
      assert.strictEqual(events.length, observations + 1, 'every settled exposure emits exactly one weight observation');
      assert.deepStrictEqual(events[events.length - 1].scripts, json(c.ai._postureScriptDistribution()));
      assert.strictEqual(c.ai._postureFeedbackReasons[samples].reason, challenged ? 'challenged' : 'ignored');
      const settled = json(c.ai._postureScriptWeights);
      c.settle();
      assert.strictEqual(c.ai._postureFeedbackSamples, samples + 1);
      assert.deepStrictEqual(json(c.ai._postureScriptWeights), settled, 'repeated settlement cannot update the same exposure again');
      assert.strictEqual(c.events.filter(e => e.action === 'weights').length, events.length);
    }
  }
});

test('hidden Grip/Stack identities and hidden payloads do not enter history or weights', () => {
  const outcomes = [];
  for (const hiddenTitle of ['hidden agenda', 'hidden breaker']) {
    const c = world(), {s, card} = c.remote();
    const hidden = new Proxy({title: hiddenTitle}, {get() { throw new Error('hidden identity read'); }});
    c.runner.grip = [hidden]; c.runner.stack = [hidden];
    c.activate(s, card); c.expose(); c.challenge(s); c.settle();
    outcomes.push(json({weights: c.ai._postureScriptWeights, reasons: c.ai._postureFeedbackReasons,
      history: c.ai._publicPostureHistory}));
  }
  assert.deepStrictEqual(outcomes[0], outcomes[1]);
});

test('seeded histories produce identical weights, profile choices and structured reasons', () => {
  function replay() {
    const c = world(), {s, card} = c.remote(); c.activate(s, card);
    for (let i = 0; i < 5; i++) {
      c.expose(); if (i % 2) c.challenge(s); c.settle();
    }
    const next = c.remote(2).card;
    return json({weights: c.ai._postureScriptWeights, profile: c.ai._remoteDeceptionProfile(next),
      reasons: c.ai._postureFeedbackReasons, events: c.events});
  }
  assert.deepStrictEqual(replay(), replay());
});

test('agendas and traps retain overlapping identical profile distributions after adaptation', () => {
  const profiles = [];
  for (const type of ['agenda', 'asset']) {
    const c = world(), {s, card} = c.remote(); c.activate(s, card);
    c.expose(); c.challenge(s); c.settle();
    const next = c.remote(2, 1, type).card;
    if (type === 'asset') next.AIPunishesAccess = () => 3;
    profiles.push(json(c.ai._remoteDeceptionProfile(next)));
    assert(c.ai._postureScriptDistribution().every(script => script.probability >= 0.015));
  }
  assert.deepStrictEqual(profiles[0], profiles[1]);
});

test('all twelve sampler probabilities are payload-independent for matched public histories', () => {
  const histories = [[], Array(20).fill(false), Array(20).fill(true),
    Array.from({length: 24}, (_, i) => i % 2 === 0), Array(120).fill(true), Array(120).fill(false)];
  for (const history of histories) {
    const observations = [];
    for (const type of ['agenda', 'asset']) {
      const c = world(), {s, card} = c.remote(1, 1, type);
      if (type === 'asset') card.AIPunishesAccess = () => 3;
      c.activate(s, card);
      for (const challenged of history) {
        c.expose(); if (challenged) c.challenge(s); c.settle();
      }
      const next = c.remote(2, 1, type).card;
      if (type === 'asset') next.AIPunishesAccess = () => 3;
      let probabilities;
      const sample = c.ai._weightedPostureValue;
      c.ai._weightedPostureValue = function(scripts, field, roll) {
        if (!probabilities) probabilities = json(scripts.map(s => ({id: s.id, probability: s.probability})));
        return sample.call(this, scripts, field, roll);
      };
      c.ai._remoteDeceptionProfile(next);
      assert.strictEqual(probabilities.length, 12);
      assert(probabilities.every(s => s.probability >= 0.015));
      assert(Math.abs(probabilities.reduce((sum, s) => sum + s.probability, 0) - 1) < 1e-12);
      observations.push({probabilities, history: json(c.ai._publicPostureHistory)});
    }
    assert.deepStrictEqual(observations[0], observations[1], 'matched public history gives exactly equal probabilities for both payloads');
  }
});

test('option off preserves baseline shapes, three draws and lifetime caches after public histories', () => {
  const c = world(false), {s, card} = c.remote();
  c.ai._random = (() => { const values = [0.29, 0.54, 0.29]; let n = 0; return () => { c.randomDraws++; return values[n++ % 3]; }; })();
  const profile = c.ai._remoteDeceptionProfile(card);
  assert.deepStrictEqual(json(profile), {targetIce: 1, openingAdvances: 1, delayTurns: 1});
  assert.strictEqual(c.randomDraws, 3);
  c.ai._epochPosture('bluff', s, card, () => 1);
  c.expose(); c.challenge(s); c.settle();
  const draws = c.randomDraws;
  assert.strictEqual(c.ai._remoteDeceptionProfile(card), profile);
  assert.strictEqual(c.randomDraws, draws);
  assert(Object.values(c.ai._postureScriptWeights).every(w => w === 1));
  assert.strictEqual(c.ai._postureFeedbackReasons.length, 0);
});

test('installed shape refreshes only on a later active commitment, not repeats or cache clears', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  const first = c.ai._remoteDeceptionProfile(card);
  c.expose(); c.challenge(s); c.settle();
  c.ai._securityCache = null;
  assert.strictEqual(c.ai._remoteDeceptionProfile(card), first);
  c.ai._epochPosture('bluff', s, card, () => 1);
  const later = c.ai._remoteDeceptionProfile(card);
  assert.notStrictEqual(later, first);
  const draws = c.randomDraws;
  c.ai._epochPosture('bluff', s, card, () => 1); c.ai._securityCache = null;
  assert.strictEqual(c.ai._remoteDeceptionProfile(card), later);
  assert.strictEqual(c.randomDraws, draws);
  assert(c.events.some(e => e.action === 'roll' && e.reason.includes('challenged')));
});

test('epochs disabled adapts new cards only, and safety overrides prevent refresh', () => {
  const c = world(), {s, card} = c.remote();
  c.ai.options.postureEpochs = false;
  c.ai._agendaBluffDecisions.set(s, {card, bluff: true});
  c.ai._publicPostureTurnBegins('corp');
  const profile = c.ai._remoteDeceptionProfile(card);
  c.expose(); c.challenge(s); c.settle();
  assert.strictEqual(c.ai._remoteDeceptionProfile(card), profile);
  c.ai._runnerMayWinIfServerBreached = () => true;
  const draws = c.randomDraws;
  assert.strictEqual(c.ai._shouldBluffAgendaServer(s), false);
  assert.strictEqual(c.randomDraws, draws);
});

test('removed roots are not ignored, remote ids survive destruction and replacement', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  c.ai._recordPublicPostureEvent('rootInstalled', s, card);
  c.expose(); s.root.length = 0; c.corp.remoteServers.length = 0; c.settle();
  assert.strictEqual(c.ai._postureFeedbackSamples, 0);
  const other = c.remote(); c.ai._recordPublicPostureEvent('rootInstalled', other.s, other.card);
  c.ai._recordPublicPostureEvent('agendaScored', s, card);
  const history = c.ai._publicPostureHistory;
  assert(history[0].serverId !== history[1].serverId);
  assert.strictEqual(history[0].serverId, history[2].serverId);
});

test('hypothetical engine actions and turn notifications do not enter learning or public memory', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  c.expose();
  const before = json({history: c.ai._publicPostureHistory, weights: c.ai._postureScriptWeights,
    side: c.ai._publicPostureSide, turn: c.ai._publicPostureTurn});
  c.AIHypothetical.depth = 1;
  c.challenge(s); c.ai._publicPostureTurnBegins('corp');
  assert.deepStrictEqual(json({history: c.ai._publicPostureHistory, weights: c.ai._postureScriptWeights,
    side: c.ai._publicPostureSide, turn: c.ai._publicPostureTurn}), before);
});

test('real advancement, placement and committed ICE rez record once with public amounts', () => {
  const c = world(), {s, card} = c.remote();
  c.Advance(card); c.PlaceAdvancement(card, 2); c.AddCounters(card, 'advancement', 3);
  c.AddCounters(card, 'credits', 2); c.PlaceAdvancement(card, 0);
  c.Rez(s.ice[0], true);
  assert.deepStrictEqual(json(c.ai._publicPostureHistory).map(e => [e.action, e.amount]),
    [['advancementPlaced', 1], ['advancementPlaced', 2], ['advancementPlaced', 3], ['iceRezzed', 1]]);
});

test('real install records only the committed root/ICE move, not staging or cancellation', () => {
  for (const kind of ['agenda', 'ice']) {
    const c = world(), {s, card} = c.remote();
    const candidate = Object.assign({}, card, {cardType: kind, cardLocation: c.corp.HQ.cards});
    c.corp.HQ.cards.push(candidate);
    c.currentPhase = {identifier: 'Corp 2.2', title: 'Action'};
    c.ChangePhase = phase => { c.currentPhase = phase; };
    c.InstallDestination = card => card.cardType === 'ice' ? s.ice : s.root;
    c.InstallCost = () => 0;
    c.PlayerName = () => 'Corp'; c.CardServerName = () => 'Remote';
    c.IncrementPhase = () => {}; c.Cancel = () => {};
    c.SpendCredits = (player, amount, purpose, card, callback, owner) => callback.call(owner);
    c.Install(candidate, s);
    assert.strictEqual(c.ai._publicPostureHistory.length, 0, 'staging is not installation');
    c.currentPhase.Cancel.trash();
    assert.strictEqual(c.ai._publicPostureHistory.length, 0, 'cancelled install is not public outcome');
    c.Install(candidate, s);
    c.currentPhase.Resolve.n();
    assert.strictEqual(c.ai._publicPostureHistory.length, 1);
    assert.strictEqual(c.ai._publicPostureHistory[0].action, kind === 'ice' ? 'iceInstalled' : 'rootInstalled');
  }
});

test('real turn transitions settle once; resuming a phase never creates another exposure', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  c.ChangePhase({identifier: 'Runner 1.1', title: 'Runner'});
  c.ChangePhase({identifier: 'Runner 1.1', title: 'Runner'}, true);
  c.ChangePhase({identifier: 'Corp 1.1', title: 'Corp'});
  assert.strictEqual(c.ai._postureFeedbackSamples, 1);
  c.ChangePhase({identifier: 'Corp 1.1', title: 'Corp'}, true);
  assert.strictEqual(c.ai._postureFeedbackSamples, 1);
  assert.strictEqual(c.ai._publicPostureTurn, 2);
});

test('real run/access paths record declaration and actual encounter/access separately', () => {
  const c = world(), {s, card} = c.remote();
  c.ChangePhase = phase => { c.currentPhase = phase; };
  c.GainCredits = () => {};
  c.MakeRun(s);
  assert.deepStrictEqual(json(c.ai._publicPostureHistory).map(e => e.action), ['runInitiated']);
  c.currentPhase = {identifier: 'Run 3.1'}; c.approachIce = 0;
  c.phaseTemplates.standardResponse.Init.call(c.currentPhase);
  c.accessingCard = card; c.accessedCards = {root: [], cards: []}; c.viewingPlayer = c.corp;
  c.phases.runAccessingCard.Init();
  assert.deepStrictEqual(json(c.ai._publicPostureHistory).map(e => e.action), ['runInitiated', 'iceEncountered', 'access']);
});

test('prevented score/steal emits nothing; committed results retain originating server', () => {
  for (const action of ['score', 'steal']) {
    const c = world(), {s, card} = c.remote(0);
    c.currentPhase = {title: 'Test phase'}; c.accessingCard = card; c.attackedServer = s;
    c.OpportunityForAvoidPrevent = (player, name, args, done) => { c.intended[action] = null; done(); };
    if (action === 'score') c.Score(card); else c.Steal();
    assert.strictEqual(c.ai._publicPostureHistory.length, 0);
    c.OpportunityForAvoidPrevent = (player, name, args, done) => done();
    c.ai._recordPublicPostureEvent('rootInstalled', s, card);
    if (action === 'score') c.Score(card); else c.Steal();
    assert.strictEqual(c.corp.remoteServers.length, 0);
    const history = c.ai._publicPostureHistory;
    assert.strictEqual(history[1].serverId, history[0].serverId);
    assert.strictEqual(history[1].action, action === 'score' ? 'agendaScored' : 'agendaStolen');
  }
});

test('trap offers and declines do not fire; actual optional/automatic effects do', () => {
  const c = world(), {s, card} = c.remote();
  const urtica = Object.assign(card, c.cardSet[30045]);
  c.Damage = () => {};
  urtica.responseOnAccess.Resolve.call(urtica);
  assert.strictEqual(c.ai._publicPostureHistory.filter(e => e.action === 'trapFired').length, 1);
  const snareDef = Object.values(c.cardSet).find(def => def.title === 'Snare!');
  const snare = Object.assign({}, snareDef, {player: c.corp, cardLocation: s.root}); s.root.push(snare);
  c.accessingCard = snare; c.CheckCredits = () => true; c.Reveal = () => {};
  c.DecisionPhase = (player, choices, callback, title, instruction, owner) => { c.decisions.push({player, choices, callback, owner}); return {}; };
  c.decisions = [];
  snare.responseOnAccess.Resolve.call(snare);
  c.decisions.shift().callback.call(snare);
  const decision = c.decisions.shift();
  const before = c.ai._publicPostureHistory.length;
  decision.callback.call(snare, {id: 1});
  assert.strictEqual(c.ai._publicPostureHistory.length, before);
  c.SpendCredits = (player, amount, purpose, card, callback, owner) => callback.call(owner);
  c.AddTags = (n, callback, owner) => callback.call(owner);
  decision.callback.call(snare, {id: 0});
  assert.strictEqual(c.ai._publicPostureHistory.filter(e => e.action === 'trapFired').length, 2);
  const esca = Object.assign({}, c.cardSet[36038], {player: c.corp, cardLocation: s.root}); s.root.push(esca);
  c.LoseCredits = () => {}; c.CheckTags = () => false;
  esca._resolveAccessEffect();
  assert.strictEqual(c.ai._publicPostureHistory.filter(e => e.action === 'trapFired').length, 3);
});

test('weight collector records all scripts and rejects a floor/bound/normalization violation', () => {
  const c = world();
  const collector = require('../scripts/ai-batch/collectors/postureScriptWeights');
  const game = {}, scripts = json(c.ai._postureScriptDistribution());
  collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
  assert.strictEqual(collector.finish(game).violations, 0);
  assert.strictEqual(Object.keys(collector.finish(game).scripts).length, 12);
  scripts[0].weight = 1.3; scripts[0].probability = 0;
  collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
  assert(collector.finish(game).violations > 0);
});

test('weight collector fails missing telemetry and excessive per-exposure movement', () => {
  const c = world(), collector = require('../scripts/ai-batch/collectors/postureScriptWeights');
  assert(collector.finish({}).violations > 0, 'missing observations cannot pass the invariant gate');
  const game = {}, scripts = json(c.ai._postureScriptDistribution());
  collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
  scripts[0].weight += 0.02;
  collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
  assert.strictEqual(collector.finish(game).violations, 0, 'movement at the bound is allowed');
  scripts[0].weight += 0.021;
  collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
  assert(collector.finish(game).violations > 0, 'excessive movement fails even within absolute bounds');
});

test('weight collector independently enforces weight limits, exploration floors and normalization', () => {
  const c = world(), collector = require('../scripts/ai-batch/collectors/postureScriptWeights');
  const cases = [
    ['lower weight limit', scripts => { scripts[0].weight = 0.79; }],
    ['upper weight limit', scripts => { scripts[0].weight = 1.21; }],
    ['exploration floor with normalized total', scripts => {
      scripts[1].probability += scripts[0].probability - 0.014;
      scripts[0].probability = 0.014;
    }],
    ['normalization with valid individual probabilities', scripts => { scripts[0].probability += 0.001; }],
  ];
  for (const [name, mutate] of cases) {
    const scripts = json(c.ai._postureScriptDistribution()), game = {};
    mutate(scripts);
    collector.onEvent({type: 'posture', action: 'weights', scripts}, game);
    assert(collector.finish(game).violations > 0, `${name} must fail independently`);
  }
});

test('correlation collector accepts adapted shape rolls without counting weight observations as choices', () => {
  const c = world(), {s, card} = c.remote(); c.activate(s, card);
  c.expose(); c.challenge(s); c.settle();
  c.ai._epochPosture('bluff', s, card, () => 1);
  const collector = require('../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
  const game = {};
  for (const event of c.events) collector.onEvent({type: 'posture', ...event}, game);
  const samples = collector.samples(game);
  assert.strictEqual(samples.filter(s => s.k === 'f').length, 2);
  assert.strictEqual(samples.filter(s => s.k === 'p').length, 2);
});

console.log(passed + ' passed, ' + failed + ' failed public outcome feedback cases.');
if (failed) process.exitCode = 1;
