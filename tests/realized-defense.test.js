'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {spawnSync} = require('child_process');
const {createRealizedDefenseTracker, playGame} = require('../scripts/ai-batch/headless');
const collector = require('../scripts/ai-batch/collectors/realizedIceByRootType');
const {batchMetrics, compareReports} = require('../scripts/ai-batch/metrics');
const {calibrateReports} = require('../scripts/ai-batch/calibration');
const batch = require('../scripts/ai-batch');
const {observationIdentity} = require('../scripts/ai-batch/defense-evidence');
let passed = 0;
const failures = [];
async function check(name, test) {
  try { await test(); passed++; if (process.env.VERBOSE) console.log('ok ' + name); }
  catch (error) { failures.push(`FAIL ${name}: ${error.stack || error}`); }
}
const row = (rootType, iceCount, extra = {}) => ({rootType, iceCount, rootId: 1, commitmentId: 1, serverId: 1,
  turn: 1, rootAge: 0, revealed: false, multiRoot: false, posture: 'active', safety: 'allowedAtLastQuery', ...extra});
function cohort(agenda, trap, count = 30) {
  return Array.from({length: count}, (_, i) => ({gameId: `pair:${i + 1}`, deckPairId: 'pair', errors: [], lifecycle: [],
    rows: [...agenda.map(n => row('agenda', n)), ...trap.map(n => row('trap', n))]
      .map((r, j) => ({...r, rootId: j + 1, commitmentId: j + 1, serverId: j + 1}))}));
}
function report(samples) {
  return {poolHash: 'synthetic', collectors: [collector.name], codeHash: 'synthetic', options: {}, starts: [],
    seeds: samples.map((_, i) => i + 1), games: samples.map((s, i) => ({ok: true, deckPairId: s.deckPairId, seed: i + 1,
      logHash: JSON.stringify(s.rows), metrics: {}, samples: {[collector.name]: s}}))};
}
const clone = value => JSON.parse(JSON.stringify(value));
(async () => {
  await check('exact TV histograms and nonmonotonic tell', () => {
    const stats = collector.distribution([row('agenda', 0), row('agenda', 2), row('trap', 1), row('trap', 1)]);
    assert.strictEqual(stats.distance, 1);
    assert.strictEqual(stats.signedCorrelation, 0);
    assert.deepStrictEqual(stats.histograms, {agenda: {0: 1, 2: 1}, trap: {1: 2}});
    assert.strictEqual(collector.distribution([row('agenda', 0), row('agenda', 1), row('trap', 0), row('trap', 1)]).distance, 0);
    assert.strictEqual(collector.distribution([row('agenda', 0), row('agenda', 0), row('trap', 0), row('trap', 1)]).distance, 0.5);
  });
  await check('signed Spearman, tied ranks, and valid zero TV versus undefined rho', () => {
    assert.strictEqual(collector.distribution([row('agenda', 0), row('agenda', 0), row('trap', 2), row('trap', 2)]).signedCorrelation, -1);
    const stats = collector.distribution([row('agenda', 1), row('agenda', 1), row('trap', 1), row('trap', 1)]);
    assert.strictEqual(stats.distance, 0); assert.strictEqual(stats.correlation, null);
    assert.strictEqual(collector.distribution([row('agenda', 1)]).distance, null);
  });
  await check('headline excludes revealed rows and safety stays included', () => {
    const games = cohort([0, 2], [1, 1]);
    for (const game of games) {
      game.rows[0].safety = 'stopped'; game.rows[0].posture = 'safetyStopped';
      game.rows.push(row('trap', 10, {revealed: true, commitmentId: 9}));
    }
    const stats = collector.summarize(games);
    assert.strictEqual(stats.all.distance, 1);
    assert.strictEqual(stats.all.classes.agenda.observations, 60);
    assert.strictEqual(stats.postured.classes.agenda.observations, 30);
    assert.strictEqual(stats.revealed.classes.trap.observations, 30);
    assert.strictEqual(stats.breakdowns.safety.stopped.classes.agenda.observations, 30);
  });
  await check('start roots, multi-root classification and passive hidden boundary', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, data) => events.push({type, ...data}));
    const trap = {cardType: 'asset', subTypes: ['Ambush'], AIPunishesAccess() { throw Error('hook called'); }};
    const agenda = {cardType: 'agenda', subTypes: ['Ambush'], faceUp: false};
    const server = {ice: [{}, {}], root: [agenda, trap]};
    const corp = {remoteServers: [server], AI: {options: {postureEpochs: true}, _postureEpochRecords: new WeakMap()}};
    Object.defineProperty(corp, 'runner', {get() { throw Error('hidden runner accessed'); }});
    corp.AI._random = corp.AI._deceptionPostureActive = corp.AI._evaluateServerSecurity = () => { throw Error('policy called'); };
    tracker.start(corp, 0);
    const rows = tracker.snapshot(corp, 1);
    assert.deepStrictEqual(rows.map(r => r.rootType), ['agenda', 'trap']);
    assert.ok(rows.every(r => r.leftCensored && r.rootAge === null && r.iceCount === 2 && r.multiRoot));
    assert.strictEqual(rows[0].serverId, rows[1].serverId);
    assert.notStrictEqual(rows[0].commitmentId, rows[1].commitmentId);
    assert.ok(rows.every(r => r.posture === 'unknown' && r.safety === 'unknown'));
    assert.deepStrictEqual(Object.keys(corp.AI).sort(), ['_deceptionPostureActive', '_evaluateServerSecurity', '_postureEpochRecords', '_random', 'options'].sort());
  });
  await check('stable server IDs, leave/reinstall commitments and reveal transitions', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, data) => events.push({type, ...data}));
    const card = {cardType: 'agenda'}, a = {ice: [{}], root: []}, b = {ice: [], root: []};
    const corp = {remoteServers: [a, b], AI: {options: {}}};
    tracker.start(corp, 0); a.root.push(card); tracker.observe(corp, 1);
    const initial = tracker.snapshot(corp, 1)[0];
    a.ice.pop(); card.knownToRunner = true;
    const revealed = tracker.snapshot(corp, 2)[0];
    assert.strictEqual(revealed.iceCount, 0); assert.strictEqual(revealed.revealed, true);
    assert.strictEqual(revealed.rootAge, 1); assert.strictEqual(revealed.commitmentId, initial.commitmentId);
    a.root.pop(); tracker.observe(corp, 2); a.root.push(card); tracker.observe(corp, 2);
    const reinstalled = tracker.snapshot(corp, 2)[0];
    assert.strictEqual(reinstalled.serverId, initial.serverId);
    assert.notStrictEqual(reinstalled.commitmentId, initial.commitmentId);
    assert.strictEqual(reinstalled.rootId, initial.rootId);
    a.root.pop(); b.root.push(card); tracker.observe(corp, 3);
    assert.notStrictEqual(tracker.snapshot(corp, 3)[0].serverId, initial.serverId);
    assert.strictEqual(events.filter(e => e.action === 'leave').length, 2);
  });
  await check('cached epoch labels, public guard events, expiry and cache identity', () => {
    const tracker = createRealizedDefenseTracker(() => {}), card = {cardType: 'agenda'}, server = {ice: [], root: [card]};
    const records = new WeakMap(), record = {selectedScript: 'bluff', epochId: 1, commitmentHorizon: 3}; records.set(card, record);
    const ai = {options: {postureEpochs: true}, _postureEpochRecords: new WeakMap([[server, records]]),
      _postureCardIds: new WeakMap([[card, 7]]), _postureEpoch: 1};
    const corp = {remoteServers: [server], AI: ai}; tracker.start(corp, 0);
    tracker.onPosture({kind: 'bluff', action: 'roll', cardId: 7, epoch: 1});
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'active');
    ai._postureEpoch = 3;
    const expired = tracker.snapshot(corp, 2)[0];
    assert.strictEqual(expired.posture, 'expired'); assert.strictEqual(expired.cachedPostured, true);
    tracker.onPosture({kind: 'bluff', action: 'guard', cardId: 7, epoch: 3});
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'safetyStopped');
    record.selectedScript = 'neutral'; record.commitmentHorizon = 5;
    tracker.onPosture({kind: 'bluff', action: 'roll', cardId: 7, epoch: 3});
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'neutral');
    assert.strictEqual(ai._postureEpochRecords.get(server).get(card), record);
    assert.deepStrictEqual(record, {selectedScript: 'neutral', epochId: 1, commitmentHorizon: 5});
  });
  await check('lifetime active state and guard-only unrolled state', () => {
    const tracker = createRealizedDefenseTracker(() => {}), card = {cardType: 'asset', subTypes: ['Ambush']}, server = {ice: [], root: [card]};
    const ai = {options: {postureEpochs: false}, _serverBaitDecisions: new WeakMap([[server, {card, bait: true}]]),
      _postureCardIds: new WeakMap([[card, 4]])};
    const corp = {remoteServers: [server], AI: ai}; tracker.start(corp, 0);
    tracker.onPosture({kind: 'bait', action: 'roll', cardId: 4, epoch: 1});
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'active');
    tracker.onPosture({kind: 'bait', action: 'guard', cardId: 4, epoch: 1});
    tracker.onQuery('bait', server, card, false, corp);
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'safetyStopped');
    // Lifetime reuse returns true without emitting a new posture event.
    tracker.onQuery('bait', server, card, true, corp);
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'active');
    ai._serverBaitDecisions.delete(server);
    tracker.onPosture({kind: 'bait', action: 'guard', cardId: 4, epoch: 2});
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'safetyStopped');
    tracker.onPosture({kind: 'bait', action: 'reuse', cardId: 4, epoch: 2});
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'unrolled');
  });
  await check('snapshot labels reconcile real posture decisions without extra RNG or cache writes', () => {
    const agenda = {cardType: 'agenda', agendaPoints: 2}, server = {ice: [], root: [agenda]};
    const corp = {remoteServers: [server], creditPool: 10, scoreArea: [], HQ: {cards: []}, RnD: {ice: []}, archives: {ice: []}};
    corp.HQ.ice = [];
    const runner = {creditPool: 0, grip: [], rig: {programs: []}, agendaPoints: 0};
    const context = {corp, runner, playerTurn: corp, Math, console,
      Credits: p => p.creditPool, Counters: () => 0, AgendaPoints: p => p.agendaPoints || 0,
      AgendaPointsToWin: () => 7, PlayerCanLook: () => false, CheckAdvance: () => true,
      CheckCardType: (card, types) => types.includes(card.cardType), CheckSubType: () => false};
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../ai_corp.js'), 'utf8'), context);
    vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {}; reviewAI._runnerMayWinIfServerBreached = function() { return false; };', context);
    const ai = corp.AI = context.reviewAI, tracker = createRealizedDefenseTracker(() => {});
    tracker.start(corp, 0); ai.options.postureEpochs = true; ai._postureEpoch = 1;
    ai._postureTelemetry = event => tracker.onPosture(event);
    const originalBluff = ai._shouldBluffAgendaServer;
    ai._shouldBluffAgendaServer = function(server) {
      const result = originalBluff.call(this, server);
      tracker.onQuery('bluff', server, null, result, corp);
      return result;
    };
    let draws = 0; const rolls = [0, 0, 0.99, 0];
    ai._random = () => { draws++; return rolls.shift(); };
    assert.strictEqual(ai._shouldBluffAgendaServer(server), true);
    const record = ai._postureEpochRecords.get(server).get(agenda);
    const before = JSON.stringify(record);
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'active');
    assert.strictEqual(draws, 2); assert.strictEqual(JSON.stringify(record), before);
    server.root.push({cardType: 'upgrade'});
    assert.strictEqual(ai._shouldBluffAgendaServer(server), false, 'multi-root agendas cannot use this posture');
    assert.strictEqual(tracker.snapshot(corp, 1)[0].posture, 'unknown', 'cached script must not claim effective activity after eligibility changes');
    server.root.pop();
    ai._postureEpoch = 3;
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'expired');
    assert.strictEqual(ai._shouldBluffAgendaServer(server), false);
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'neutral');
    corp.agendaPoints = 6;
    assert.strictEqual(ai._shouldBluffAgendaServer(server), false);
    assert.strictEqual(tracker.snapshot(corp, 2)[0].posture, 'safetyStopped');
    assert.strictEqual(draws, 4);
    const saved = clone(tracker.snapshot(corp, 2));
    runner.grip = [new Proxy({}, {get() { throw Error('hidden grip identity read'); }})];
    runner.stack = [new Proxy({}, {get() { throw Error('hidden stack identity read'); }})];
    assert.deepStrictEqual(clone(tracker.snapshot(corp, 2)), saved);
    const trap = {cardType: 'asset', player: corp, AIPunishesAccess() { throw Error('punishment hook invoked by observer'); }}, trapServer = {ice: [], root: [trap]};
    corp.remoteServers.push(trapServer); tracker.observe(corp, 3);
    let severity = 2;
    ai._accessPunishmentSeverity = () => severity; ai._calculateBaitFrequency = () => 1;
    const originalBait = ai._shouldBaitServer;
    ai._shouldBaitServer = function(server, card) {
      const result = originalBait.call(this, server, card);
      tracker.onQuery('bait', server, card, result, corp);
      return result;
    };
    ai._random = () => { draws++; return 0; };
    assert.strictEqual(ai._shouldBaitServer(trapServer, trap), true);
    assert.strictEqual(tracker.snapshot(corp, 3).find(row => row.rootType === 'trap').posture, 'active');
    severity = 0;
    assert.strictEqual(ai._shouldBaitServer(trapServer, trap), false, 'severity rejects before guard/roll telemetry');
    const quiet = tracker.snapshot(corp, 3).find(row => row.rootType === 'trap');
    assert.strictEqual(quiet.posture, 'unknown'); assert.strictEqual(quiet.lastQueryResult, false);
    assert.strictEqual(quiet.cachedPostured, true); assert.strictEqual(draws, 6);
  });
  await check('coverage cannot be manufactured by repeating roots or turns', () => {
    const games = cohort([0, 2], [1, 1]); assert.strictEqual(collector.validateBatch(games), true);
    assert.notStrictEqual(collector.validateBatch(games.slice(0, 4)), true);
    const one = clone(games[0]); one.rows = Array(100).fill(one.rows[0]);
    assert.notStrictEqual(collector.validateBatch([one]), true);
    for (const game of games) game.rows[0].posture = 'unknown';
    assert.match(collector.validateBatch(games), /known posture/);
  });
  await check('invalid columns, observation errors and undefined cohorts fail closed', () => {
    for (const mutate of [g => g.rows[0].iceCount = -1, g => g.rows[0].iceCount = 0.5,
      g => g.rows[0].iceCount = NaN, g => g.rows[0].posture = 'invented', g => g.errors.push('observer failed')]) {
      const games = cohort([0, 2], [1, 1]); mutate(games[0]); assert.notStrictEqual(collector.validateBatch(games), true);
    }
    assert.match(collector.validateBatch(cohort([1, 1], [1, 1])), /undefined/);
    assert.notStrictEqual(collector.validateBatch(cohort([0, 1], [])), true);
    const constant = report(cohort([1, 1], [1, 1]));
    const diagnostics = batchMetrics([collector], constant.games);
    const tv = diagnostics[`${collector.name}.allCountDistance`];
    assert.strictEqual(tv.value, 0); assert.strictEqual(tv.valid, true); assert.strictEqual(tv.high, 0);
    assert.strictEqual(diagnostics[`${collector.name}.allCountCorrelation`].valid, false);
    assert.strictEqual(batch.applyCeilingChecks({checks: []}, constant, {batchMetrics: diagnostics}, {[`${collector.name}.allCountCorrelation`]: 1}).pass, false);
    const tvOnly = compareReports(constant, constant, {guard: {[`${collector.name}.allCountDistance`]: 0.01}}, [collector]);
    assert.strictEqual(tvOnly.checks.find(check => check.name.endsWith('.allCountDistance')).pass, true);
  });
  await check('exposure weighting differs from first-commitment weighting', () => {
    const game = cohort([0], [0, 1], 1)[0];
    for (let turn = 2; turn <= 10; turn++) game.rows.push({...game.rows[2], turn});
    const stats = collector.summarize([game]);
    assert.strictEqual(stats.firstCommitment.classes.trap.observations, 2);
    assert.strictEqual(stats.all.classes.trap.observations, 11);
    assert.strictEqual(stats.all.classes.trap.commitments, 2);
    assert.strictEqual(stats.all.classes.trap.games, 1);
    assert.strictEqual(stats.firstCommitment.distance, 0.5);
    assert.strictEqual(stats.all.distance, 10 / 11);
  });
  await check('paired identity, introduced tell and lower improvement use game clusters', () => {
    const fair = report(cohort([0, 1], [0, 1])), tell = report(cohort([1, 1], [0, 0]));
    const metric = `${collector.name}.allCountDistance`;
    const options = {guard: {[metric]: 0.01}};
    const identical = compareReports(fair, clone(fair), options, [collector]);
    assert.strictEqual(identical.checks.find(check => check.name === metric).pass, true);
    assert.strictEqual(identical.pass, false, 'unchanged policy cannot pass an adoption gate');
    assert.strictEqual(identical.batchMetrics[metric].difference, 0);
    assert.strictEqual(identical.batchMetrics[metric].low, 0); assert.strictEqual(identical.batchMetrics[metric].high, 0);
    assert.strictEqual(compareReports(fair, tell, options, [collector]).pass, false);
    const reduced = compareReports(tell, fair, {improve: [metric]}, [collector]);
    assert.strictEqual(reduced.pass, true); assert.strictEqual(reduced.batchMetrics[metric].difference, -1);
    assert.strictEqual(reduced.batchMetrics[metric].improvement.low, 1);
    assert.deepStrictEqual(compareReports(tell, fair, {improve: [metric]}, [collector]), reduced);
  });
  await check('invalid draws invalidate the whole interval and are counted', () => {
    const games = report(cohort([0, 1], [0, 1], 5)).games;
    // Five unique contributing games satisfy point coverage; a draw repeating
    // one of them loses unique-game coverage rather than adding pseudo-games.
    const out = batchMetrics([collector], games)[`${collector.name}.allCountDistance`];
    assert.strictEqual(out.valid, false); assert.ok(out.invalidDraws > 0);
    assert.strictEqual(out.low, null); assert.strictEqual(out.high, null);
    const r = {...report([]), seeds: [1, 2, 3, 4, 5], games};
    assert.strictEqual(compareReports(r, r, {guard: {[`${collector.name}.allCountDistance`]: 0.1}}, [collector]).pass, false);
  });
  await check('calibration draws disjoint control cohorts independently', () => {
    const first = report(cohort([0, 1], [0, 1])), second = clone(first);
    second.seeds = second.seeds.map(n => n + 100);
    for (const game of second.games) { game.seed += 100; game.samples[collector.name].gameId += ':second'; }
    const result = calibrateReports(first, second, [collector]);
    assert.strictEqual(result.kind, 'independent calibration');
    assert.strictEqual(result.metrics[`${collector.name}.allCountDistance`].difference, 0);
    assert.throws(() => compareReports(first, second), /seeds/);
    assert.throws(() => calibrateReports(first, first, [collector]), /disjoint/);
  });
  await check('observation identity rejects missing games, failures and changed decisions', () => {
    const first = report(cohort([0, 1], [0, 1])); first.pairs = ['pair'];
    for (const game of first.games) Object.assign(game, {winner: 'corp', turns: 1, decisionHash: 'same'});
    assert.strictEqual(observationIdentity(first, clone(first)).pass, true);
    for (const alter of [r => r.games.pop(), r => r.games[0].decisionHash = 'changed', r => r.games[0].ok = false]) {
      const second = clone(first); alter(second); assert.strictEqual(observationIdentity(first, second).pass, false);
    }
    assert.throws(() => observationIdentity(first, {...first, codeHash: 'changed'}), /codeHash/);
  });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'realized-defense-'));
  await check('gate and --compare reconstruct all four pooled metrics', () => {
    const fair = report(cohort([0, 1], [0, 1], 200)), tell = report(cohort([1, 1], [0, 0], 200));
    for (const [label, r] of [['baseline', tell], ['candidate', fair]]) {
      Object.assign(r, {directions: collector.directions, batchMetrics: batchMetrics([collector], r.games)});
      for (const g of r.games) g.logHash += label;
    }
    const a = path.join(tmp, 'a.json'), b = path.join(tmp, 'b.json');
    fs.writeFileSync(a, JSON.stringify(tell)); fs.writeFileSync(b, JSON.stringify(fair));
    const guardArgs = Object.keys(collector.directions).flatMap(metric => ['--guard', `${metric}=0.01`]);
    const comparison = spawnSync(process.execPath, ['scripts/ai-batch.js', '--compare', a, b, ...guardArgs], {encoding: 'utf8'});
    assert.strictEqual(comparison.status, 0, comparison.stdout + comparison.stderr);
    assert.strictEqual((comparison.stdout.match(/PASS guard realizedIceByRootType/g) || []).length, 4);
    // gate uses the same trusted collector/comparison path; use a real one-game
    // batch with unavailable coverage to verify it fails closed, not a fabricated
    // policy result. The comparison above supplies exact synthetic statistics.
    const gate = spawnSync(process.execPath, ['scripts/ai-batch.js', 'gate', '--pairs', 'gateway', '--games', '1',
      '--collector', collector.name, ...guardArgs], {encoding: 'utf8', timeout: 120000,
      env: {...process.env, AI_BATCH_CACHE: path.join(tmp, 'cache')}});
    assert.strictEqual(gate.status, 1, gate.stdout + gate.stderr);
    assert.strictEqual((gate.stdout.match(/FAIL guard realizedIceByRootType/g) || []).length, 4);
    assert.match(gate.stdout, /insufficient|coverage/);
  });
  await check('real-engine observation on/off/throw preserves gameplay, decisions and RNG draws', async () => {
    const {pool, setFiles} = batch.loadPool('tests/fixtures/ai-batch/deck-pool.json');
    const pair = pool.pairs.find(p => p.id === 'gateway');
    const setup = path.join(tmp, 'count.js');
    fs.writeFileSync(setup, `var defenseTestCorpDraws = 0, defenseTestRunnerDraws = 0;
      var defenseTestEngineDraws = 0, defenseTestMapWrites = 0, defenseTestWeakWrites = 0;
      var defenseTestCorpRandom = corp.AI._random, defenseTestRunnerRandom = runner.AI._random;
      var defenseTestEngineRandom = Math.random, defenseTestMapSet = Map.prototype.set, defenseTestWeakSet = WeakMap.prototype.set;
      corp.AI._random = function() { defenseTestCorpDraws++; return defenseTestCorpRandom(); };
      runner.AI._random = function() { defenseTestRunnerDraws++; return defenseTestRunnerRandom(); };
      Math.random = function() { defenseTestEngineDraws++; return defenseTestEngineRandom(); };
      Map.prototype.set = function() { defenseTestMapWrites++; return defenseTestMapSet.apply(this, arguments); };
      WeakMap.prototype.set = function() { defenseTestWeakWrites++; return defenseTestWeakSet.apply(this, arguments); };
      __report = function() { return {corpDraws: defenseTestCorpDraws, runnerDraws: defenseTestRunnerDraws,
        engineDraws: defenseTestEngineDraws, mapWrites: defenseTestMapWrites, weakWrites: defenseTestWeakWrites}; };`);
    const records = [];
    for (const mode of ['off', 'on', 'throw', 'sinkThrow']) {
      const events = [];
      const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner,
        setFiles, timeoutMs: 120000, observe: true, telemetry: true, setupFile: setup,
        realizedDefenseSnapshot: mode !== 'off', defenseObserver: mode, onEvent: event => {
          events.push(event);
          if (mode === 'sinkThrow' && event.type === 'realizedDefenseSnapshot') throw Error('snapshot sink failed');
        }});
      assert.ok(game.winner); assert.deepStrictEqual(game.errors, []);
      if (mode === 'on') assert.ok(events.some(event => event.type === 'realizedDefenseSnapshot'));
      if (['throw', 'sinkThrow'].includes(mode)) assert.ok(game.defenseErrors.length);
      records.push({winner: game.winner, turns: game.turns, logHash: game.logHash, report: game.report,
        decisions: events.filter(e => e.type === 'decision').map(e => [e.n, e.side, e.identifier, e.choiceType, e.options, e.chosen])});
    }
    for (const record of records.slice(1)) assert.deepStrictEqual(clone(record), clone(records[0]));
  });
  await check('real engine samples start-board roots after turn-begin responses settle', async () => {
    const {pool, setFiles} = batch.loadPool('tests/fixtures/ai-batch/deck-pool.json');
    const pair = pool.pairs.find(p => p.id === 'gateway'), start = path.join(tmp, 'start.txt'), setup = path.join(tmp, 'boundary.js');
    fs.writeFileSync(start, '// NOTE: Synthetic boundary test, not an adoption/calibration start board.\n' +
      'CorpTestField(30059, [], [], [], [], [], [], [[30067,30045,30072]], [], cardBackTexturesCorp,glowTextures,strengthTextures);\n');
    fs.writeFileSync(setup, `var defenseBoundaryPhase = ChangePhase, defenseBoundaryAdded = false;
      ChangePhase = function(phase) {
        var value = defenseBoundaryPhase.apply(this, arguments);
        if (phase === phases.runnerActionMain && !defenseBoundaryAdded) {
          defenseBoundaryAdded = true;
          InstanceCardsPush(30072,corp.remoteServers[0].ice,1,cardBackTexturesCorp,glowTextures,strengthTextures);
        }
        return value;
      };
      var defenseBoundaryMain = Main;
      Main = function() { if (defenseBoundaryAdded) { __stop(); PlayerWin(corp, 'boundary test complete'); return; } return defenseBoundaryMain(); };`);
    const events = [];
    const game = await playGame({streamPrefix: 'boundary:gateway', corpFile: pair.corp, runnerFile: pair.runner, setFiles,
      start, setupFile: setup, timeoutMs: 120000, observe: true, realizedDefenseSnapshot: true, onEvent: e => events.push(e)});
    assert.deepStrictEqual(game.errors, []);
    const snapshot = events.find(e => e.type === 'realizedDefenseSnapshot');
    assert.ok(snapshot, 'snapshot must precede the first Runner action');
    assert.strictEqual(snapshot.rows.length, 2);
    assert.ok(snapshot.rows.every(r => r.iceCount === 2 && r.leftCensored && r.multiRoot));
    assert.deepStrictEqual(snapshot.rows.map(r => r.rootType), ['agenda', 'trap']);
  });
  fs.rmSync(tmp, {recursive: true, force: true});
  for (const failure of failures) console.error(failure);
  console.log(`Realized defense: ${passed}/${passed + failures.length} scenarios passed`);
  process.exitCode = failures.length ? 1 : 0;
})();
