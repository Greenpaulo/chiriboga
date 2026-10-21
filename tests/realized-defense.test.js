'use strict';
const run = require('./_realized-defense-test-support');
run(async ({
  assert, fs, path, vm, createRealizedDefenseTracker, collector, batchMetrics, compareReports,
  calibrateReports, batch, observationIdentity, measurementEvidence, check, row, cohort,
  report, clone
}) => {
  await check('control guard freeze uses interval envelopes and rejects incomplete evidence', () => {
    const {GUARDS, mergeControls, freezeMargins, winRatePairs} = require('../scripts/ai-batch/defense-guard-calibration');
    const metrics = Object.fromEntries(GUARDS.map(name => [name, {low: -.0123451, high: .008, difference: -.001}]));
    assert.deepStrictEqual(Object.values(freezeMargins(metrics)), GUARDS.map(() => .012346));
    metrics[GUARDS[0]] = {low: -.001, high: .0234561};
    assert.strictEqual(freezeMargins(metrics)[GUARDS[0]], .023457);
    assert.throws(() => freezeMargins({}), /Invalid calibration/);
    assert.throws(() => freezeMargins({...metrics, [GUARDS[0]]: {low: 1, high: 0}}), /Invalid calibration/);
    const make = seed => ({codeHash: 'matching', poolHash: 'pool', options: {}, starts: [],
      collectors: ['realizedIceByRootType', 'bluffSingleVariableCorrelation'], pairs: ['deck'],
      seeds: [seed], failures: [], defenseObserver: 'on', games: [{ok: true, deckPairId: 'deck', seed,
        samples: {realizedIceByRootType: {errors: []}, bluffSingleVariableCorrelation: []}}]});
    const one = make(1), two = make(2);
    assert.deepStrictEqual(mergeControls([one, two]).seeds, [1, 2]);
    assert.throws(() => mergeControls([one, one]), /Overlapping/);
    assert.throws(() => mergeControls([one, {...two, codeHash: 'changed'}]), /codeHash/);
    assert.throws(() => mergeControls([{...one, games: []}]), /Incomplete/);
    assert.throws(() => mergeControls([{...one, games: [...one.games, ...one.games]}]), /duplicate/);
    assert.throws(() => mergeControls([{...one, failures: [{}]}]), /Failed control/);
    assert.throws(() => mergeControls([{...one, quick: true}]), /full observer/);
    assert.strictEqual(winRatePairs(.109, .101), 82); // Stata's published example
    assert.strictEqual(winRatePairs(.1), 1960);
    assert.ok(winRatePairs(.5) > winRatePairs(.1));
    assert.throws(() => winRatePairs(.01), /Invalid power/);
  });
  await check('explicit complete-case controls retain failures and validate scheduled records', () => {
    const {mergeControls, controlCoverage} = require('../scripts/ai-batch/defense-guard-calibration');
    const good = {ok: true, deckPairId: 'deck', seed: 1,
      samples: {realizedIceByRootType: {errors: []}, bluffSingleVariableCorrelation: []}};
    const failed = {ok: false, deckPairId: 'deck', seed: 2, reason: 'stalled', errors: ['stalled']};
    const failure = {deckPairId: 'deck', seed: '2', reason: 'stalled', errors: ['stalled']};
    const r = {codeHash: 'matching', poolHash: 'pool', options: {}, starts: [],
      collectors: ['realizedIceByRootType', 'bluffSingleVariableCorrelation'], pairs: ['deck'],
      seeds: [1, 2], failures: [failure], defenseObserver: 'on', games: [good, failed]};
    const mode = {completeCase: true};
    assert.throws(() => mergeControls([r]), /Failed control/);
    const merged = mergeControls([r], mode);
    assert.deepStrictEqual(merged.games, [good, failed]);
    assert.deepStrictEqual(merged.failures, [failure]);
    assert.deepStrictEqual(controlCoverage(merged), [{fixtureId: null, deckPairId: 'deck', scheduled: 2, successful: 1, failed: 1}]);
    assert.throws(() => mergeControls([{...r, failures: []}], mode), /failure records/i);
    assert.throws(() => mergeControls([{...r, failures: [failure, failure]}], mode), /failure records/i);
    assert.throws(() => mergeControls([{...r, failures: [{...failure, reason: 'other'}]}], mode), /failure records/i);
    assert.throws(() => mergeControls([{...r, games: [good]}], mode), /Incomplete/);
    assert.throws(() => mergeControls([{...r, games: [good, {...failed, seed: 3}]}], mode), /Unexpected/);
    assert.throws(() => mergeControls([{...r, games: [{...good, samples: {}}, failed]}], mode), /Missing or invalid/);
    assert.throws(() => mergeControls([{...r, games: [{...good, errors: ['observer error']}, failed]}], mode), /Successful control/);
    const next = {...r, seeds: [3], games: [{...good, seed: 3}], failures: []};
    const combined = mergeControls([r, next], mode);
    assert.strictEqual(combined.games.length, 3);
    assert.strictEqual(combined.failures.length, 1);
    assert.deepStrictEqual(controlCoverage(combined)[0], {fixtureId: null, deckPairId: 'deck', scheduled: 3, successful: 2, failed: 1});
  });
  await check('offline install analysis clusters games and retains endpoints and sparse coverage', () => {
    const {analyzeReports} = require('../scripts/ai-batch/install-defense-analysis');
    const make = copies => ({games: Array.from({length: 6}, (_, seed) => ({
      ok: true, seed, deckPairId: 'script', samples: {realizedIceByRootType: {
        lifecycle: Array.from({length: copies}, (_, id) => [
          {action: 'install', commitmentId: id, installedTurn: 2, rootType: 'trap', iceCount: seed < 3 ? 0 : 1,
            placement: {chosenReason: 'Specific case', requestedServerId: seed < 3 ? 0 : 3}},
          {action: 'endpoint', commitmentId: id, turn: 8, leftTurn: 5, fate: seed < 3 ? 'gameEnd' : 'trashed'},
        ]).flat(),
        rows: Array.from({length: copies}, (_, id) => ({commitmentId: id, turn: 4, rootAge: 2,
          rootType: 'trap', iceCount: 1, posture: 'neutral', revealed: false, multiRoot: copies > 1})),
        changes: [{action: 'iceAdded', count: 1, commitments: Array.from({length: copies}, (_, id) => id)}],
      }},
    }))});
    const first = analyzeReports([make(1)], {resamples: 200});
    const repeated = analyzeReports([make(20)], {resamples: 200});
    const c = first.buckets.find(b => b.group[0] === 'class');
    const d = repeated.buckets.find(b => b.group[0] === 'class');
    assert.deepStrictEqual(c.rates, d.rates); // Duplicating roots must not invent precision.
    assert.strictEqual(c.counts.bare, 3);
    assert.strictEqual(c.counts.rightCensored, 3);
    assert.strictEqual(c.counts['endpoint:trashed'], 3);
    assert.strictEqual(c.rates.meanEndpointAge.value, 3); // leftTurn, not settlement turn
    assert.strictEqual(c.rates.lastBareRate.value, 0);
    assert.strictEqual(c.rates.gainedNetRate.value, .5);
    assert.strictEqual(c.rates.addedRate.value, 1);
    assert.ok(first.otherSplit.startsWith('Unavailable'));
    const sparse = make(1); sparse.games = sparse.games.slice(0, 1);
    assert.strictEqual(analyzeReports([sparse], {resamples: 20}).buckets[0].rates.bareRate.valid, false);
    assert.throws(() => analyzeReports([make(1), make(1)]), /Duplicate game/);
    const missing = make(1); delete missing.games[0].samples;
    assert.throws(() => analyzeReports([missing]), /Missing or invalid/);
    const invalid = make(1); invalid.games[0].samples.realizedIceByRootType.lifecycle[0].iceCount = null;
    assert.throws(() => analyzeReports([invalid]), /Unknown install ICE/);
  });
  await check('installation attribution captures actual helper returns without reevaluation', () => {
    const {observeInstallDecisions} = require('../scripts/ai-batch/install-attribution');
    const card = {cardType: 'asset', AIPunishesAccess() { throw Error('do not evaluate punishment'); }};
    const blocked = {ice: [], root: [{}]}, low = {ice: [{}], root: []}, best = {ice: [{}, {}], root: []};
    const corp = {remoteServers: [blocked, low, best]};
    const rows = [], errors = [], tracker = createRealizedDefenseTracker((type, e) => rows.push({type, ...e}));
    tracker.start(corp, 0);
    let calls = 0, enabled = true;
    const ai = {
      _isAScoringServer(server) { calls++; return server === best; },
      _scoringServers(servers) { return servers.filter(server => this._isAScoringServer(server)); },
      _scoringWindow() { calls++; return 2; },
      _advancementLimit() { calls++; return Infinity; },
      _deceptionInstallDistance() { calls++; return 1; },
      _protectionScore() { calls++; return 4; },
      _isHVT() { return false; }, _uniqueCopyAlreadyInstalled() { return false; },
      _rankedInstallOptionsCore(cards) {
        this._scoringServers([low, best]); this._scoringWindow(best); this._protectionScore(best);
        this._isHVT(card); this._uniqueCopyAlreadyInstalled(card);
        if (this._installAttribution) this._installAttribution(card, [low, best], 1);
        this._advancementLimit(card, best); this._deceptionInstallDistance(card, best);
        return [{cardToInstall: card, serverToInstallTo: best, reason: 'actual hook choice'},
          {cardToInstall: card, serverToInstallTo: low, reason: 'actual alternative'}];
      },
      _bestInstallOption(options) { this._rankedInstallOptionsCore([card]); return 0; },
    };
    const attribution = observeInstallDecisions(ai, {tracker, corp: () => corp, turn: () => 1,
      active: () => enabled, safe: fn => { try { fn(); } catch (error) { errors.push(error.message); } }});
    const choice = [{card, server: best}, {card, server: low}];
    assert.strictEqual(ai._bestInstallOption(choice), 0);
    assert.strictEqual(calls, 6);
    attribution.request(card, best); best.root.push(card); tracker.observe(corp, 1);
    const install = rows.find(e => e.action === 'install' && e.rootType === 'trap');
    assert.strictEqual(install.placement.selection, 'legalSelection');
    const record = install.placement.decision;
    assert.deepStrictEqual(install.placement.legalDestinations, [tracker.serverId(best), tracker.serverId(low)]);
    assert.strictEqual(record.hvt, false); assert.strictEqual(record.hook.result, 1);
    assert.strictEqual(record.destinations.find(e => e.serverId === tracker.serverId(blocked)).emptyProtected, false);
    assert.strictEqual(record.destinations.find(e => e.serverId === tracker.serverId(low)).scoringEligible, false);
    assert.strictEqual(record.preferences[0].advancementLimit, 'Infinity');
    assert.strictEqual(record.preferences[0].scoringWindow, 2);
    assert.strictEqual(record.preferences[1].profileDistance, 'unknown');
    assert.strictEqual(record.preferences[1].rank, 1);
    assert.deepStrictEqual(errors, []);
    enabled = false; ai._bestInstallOption(choice);
    assert.strictEqual(calls, 12);
  });
  await check('server ICE changes, overwrite and game-end endpoints reconcile shared roots', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, e) => events.push({type, ...e}));
    const agenda = {cardType: 'agenda'}, trap = {cardType: 'asset', subTypes: ['Ambush']};
    const server = {ice: [{}], root: [agenda, trap]}, archives = [];
    const corp = {remoteServers: [server], scoreArea: [], archives: {cards: archives}};
    const runner = {scoreArea: []}; tracker.start(corp, 0);
    server.ice.push({}); tracker.observe(corp, 1);
    server.ice.pop(); tracker.observe(corp, 1); tracker.observe(corp, 1);
    const added = events.filter(e => e.action === 'iceAdded'), removed = events.filter(e => e.action === 'iceRemoved');
    assert.strictEqual(added.length, 1); assert.strictEqual(removed.length, 1);
    assert.strictEqual(added[0].count, 1); assert.strictEqual(added[0].commitments.length, 2);
    server.root.shift(); agenda.cardLocation = corp.scoreArea; corp.scoreArea.push(agenda);
    tracker.observe(corp, 2, false, runner);
    const replacement = {cardType: 'agenda'};
    tracker.request(replacement, server, {selection: 'unknown'});
    server.root.pop(); trap.cardLocation = archives; archives.push(trap);
    tracker.observe(corp, 3, false, runner);
    server.root.push(replacement); tracker.observe(corp, 3, false, runner);
    tracker.finish(corp, runner, 4);
    const endpoints = events.filter(e => e.action === 'endpoint');
    assert.deepStrictEqual(endpoints.map(e => e.fate), ['scored', 'overwritten', 'gameEnd']);
    const installed = events.filter(e => e.action === 'install');
    assert.strictEqual(installed[0].iceCount, null);
    assert.strictEqual(installed[0].leftCensored, true);
    assert.strictEqual(installed[2].iceCount, 1);
    const game = {deckPairId: 'script', seed: 1};
    for (const event of events) collector.onEvent(event, game);
    const stats = collector.summarize([collector.samples(game)]).attribution;
    assert.strictEqual(stats.serverIceChanges.iceAdded, 1);
    assert.strictEqual(stats.serverIceChanges.iceRemoved, 1);
    assert.strictEqual(stats.endpoints['trap:overwritten'], 1);
    assert.strictEqual(stats.installation.interval.valid, false);
    assert.strictEqual(stats.coverage.leftCensored, 2);
  });
  await check('new remote first ICE is counted once while start-board ICE remains censored', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, e) => events.push({type, ...e}));
    const existing = {ice: [{}], root: []}, corp = {remoteServers: [existing]};
    tracker.start(corp, 0);
    assert.deepStrictEqual(events, [], 'start-board ICE must not count as additions');
    const remote = {ice: [{}], root: []};
    corp.remoteServers.push(remote);
    tracker.observe(corp, 1);
    tracker.observe(corp, 1);
    const added = events.filter(e => e.action === 'iceAdded');
    assert.strictEqual(added.length, 1, 'first ICE must be emitted once, without a root commitment');
    assert.strictEqual(added[0].count, 1);
    assert.deepStrictEqual(added[0].commitments, []);
    assert.strictEqual(added[0].serverId, tracker.serverId(remote));
    corp.remoteServers.pop();
    tracker.observe(corp, 2);
    tracker.observe(corp, 2);
    const removed = events.filter(e => e.action === 'iceRemoved');
    assert.strictEqual(removed.length, 1);
    assert.strictEqual(removed[0].serverId, added[0].serverId);
    assert.strictEqual(removed[0].count, 1);
    const game = {deckPairId: 'script', seed: 1};
    for (const event of events) collector.onEvent(event, game);
    const stats = collector.summarize([collector.samples(game)]).attribution;
    assert.strictEqual(stats.serverIceChanges.iceAdded, 1);
    assert.strictEqual(stats.serverIceChanges.iceRemoved, 1);
    assert.deepStrictEqual(stats.rootChangeExposure, {}, 'ICE-only remotes create no root exposure');
  });
  await check('committed install defense differs from the pre-request count when a cost removes ICE', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, event) => events.push({type, ...event}));
    const card = {cardType: 'agenda'}, server = {ice: [{}, {}], root: []}, corp = {remoteServers: [server]};
    tracker.start(corp, 0); tracker.request(card, server, {selection: 'unknown'});
    server.ice.pop(); tracker.observe(corp, 1);
    server.root.push(card); tracker.observe(corp, 1);
    const event = events.find(e => e.action === 'install');
    assert.strictEqual(event.iceCount, 1);
    assert.strictEqual(event.requestedIceCount, 2);
    assert.strictEqual(event.observedIceCount, 1);
  });
  await check('installation TV uses game clusters and retains empty games and unknown placement', () => {
    const samples = cohort([0], [1], 30);
    for (const game of samples) game.lifecycle = game.rows.map(r => ({...r, action: 'install', installedTurn: 0,
      turn: 0, leftCensored: false, placement: null}));
    const empty = Array.from({length: 30}, (_, i) => ({gameId: `empty:${i}`, deckPairId: 'pair', rows: [], lifecycle: [], errors: []}));
    const stats = collector.summarize([...samples, ...empty]).attribution;
    assert.strictEqual(stats.installation.all.distance, 1);
    assert.strictEqual(stats.installation.interval.valid, true);
    assert.strictEqual(stats.installation.interval.low, 1);
    assert.strictEqual(stats.installation.interval.high, 1);
    assert.strictEqual(stats.coverage.unknownPlacement, 60);
    assert.strictEqual(stats.installation.route['agenda:unknown'], 30);
    assert.strictEqual(stats.installation.route['trap:unknown'], 30);
  });
  await check('overwrite attribution expires before a later reinstall and ordinary trash', () => {
    const events = [], tracker = createRealizedDefenseTracker((type, event) => events.push({type, ...event}));
    const trap = {cardType: 'asset', subTypes: ['Ambush']}, replacement = {cardType: 'agenda'};
    const server = {ice: [], root: [trap]}, corp = {remoteServers: [server], archives: {cards: []}, HQ: {cards: []}};
    tracker.start(corp, 0); tracker.request(replacement, server, {selection: 'unknown'});
    server.root.pop(); trap.cardLocation = corp.archives.cards; tracker.observe(corp, 1);
    server.root.push(replacement); tracker.observe(corp, 1);
    server.root.pop(); replacement.cardLocation = corp.HQ.cards;
    server.root.push(trap); trap.cardLocation = server.root; tracker.observe(corp, 2);
    server.root.pop(); trap.cardLocation = corp.archives.cards; tracker.observe(corp, 3);
    assert.deepStrictEqual(events.filter(e => e.action === 'endpoint' && e.rootType === 'trap').map(e => e.fate),
      ['overwritten', 'trashed']);
  });
  await check('direct command installs capture their hook result with unknown unqueried inputs', () => {
    const {observeInstallDecisions} = require('../scripts/ai-batch/install-attribution');
    const rows = [], errors = [], tracker = createRealizedDefenseTracker((type, event) => rows.push({type, ...event}));
    const card = {cardType: 'asset', subTypes: ['Ambush']}, server = {ice: [], root: []}, corp = {remoteServers: [server]};
    const ai = {
      _rankedInstallOptionsCore() { throw Error('direct route must not be ranked by observation'); },
      _returnPreference(options, command, preference) { this.preferred = preference; return 0; },
      Choice() {
        this._installAttribution(card, [server], 0);
        return this._returnPreference(['install'], 'install', {cardToInstall: card, serverToInstallTo: server});
      },
    };
    tracker.start(corp, 0);
    const observer = observeInstallDecisions(ai, {safe: fn => { try { fn(); } catch (e) { errors.push(e.message); } },
      active: () => true, tracker, turn: () => 1, corp: () => corp});
    assert.strictEqual(ai.Choice(), 0);
    observer.request(card, server); server.root.push(card); tracker.observe(corp, 1);
    const placement = rows.find(e => e.action === 'install').placement;
    assert.strictEqual(placement.selection, 'commandPreference');
    assert.strictEqual(placement.decision.source, 'directCommand');
    assert.strictEqual(placement.decision.hook.result, 0);
    assert.strictEqual(placement.decision.preferences[0].sortObserved, false);
    assert.strictEqual(placement.decision.preferences[0].advancementLimit, 'unknown');
    assert.strictEqual(placement.legalDestinations, null);
    assert.deepStrictEqual(errors, []);
  });
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
    assert.ok(rows.every(r => r.posture === 'unrolled' && r.safety === 'unknown'));
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
    // Failed whole games stay recorded, including unusable samples; F11 excludes
    // them from independent successful-game draws and reports unequal counts.
    second.seeds.push(999);
    second.games.push({ok: false, fixtureId: '', deckPairId: second.games[0].deckPairId, seed: 999,
      samples: {[collector.name]: {rows: [{iceCount: NaN}]}}});
    const completeCase = calibrateReports(first, second, [collector]);
    assert.deepStrictEqual(completeCase.games, [first.games.length, second.games.length - 1]);
    assert.deepStrictEqual(completeCase.droppedGames, [0, 1]);
    assert.strictEqual(completeCase.metrics[`${collector.name}.allCountDistance`].difference, 0);

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
  await check('measurement evidence requires off/on/on observer arms', () => {
    const first = report(cohort([0, 1], [0, 1]));
    Object.assign(first, {defenseObserver: 'on', pairs: ['pair'], failures: [],
      batchMetrics: batchMetrics([collector], first.games), batchDiagnostics: {}});
    const off = {...clone(first), defenseObserver: 'off'}, second = clone(first);
    second.seeds = second.seeds.map(n => n + 100);
    for (const game of second.games) { game.seed += 100; game.samples[collector.name].gameId += ':second'; }
    assert.strictEqual(measurementEvidence(off, first, second).identity.pass, true);
    for (const [index, label] of [[0, 'off'], [1, 'first'], [2, 'second']]) {
      for (const mode of [undefined, 'throw', index === 0 ? 'on' : 'off']) {
        const arms = [clone(off), clone(first), clone(second)];
        arms[index].defenseObserver = mode;
        assert.throws(() => measurementEvidence(...arms), new RegExp(`Expected ${label} report defenseObserver`));
      }
    }
    assert.throws(() => measurementEvidence(off, off, second), /Expected first report defenseObserver/);
  });
}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
