'use strict';
const run = require('./_ai-batch-test-support');
run(async ({
  assert, fs, path, spawnSync, loadPrecon, metrics, batch, root, pool, setFiles, ranges, tmp,
  scenario, gateway, game, cli, setupFile
}) => {
  await scenario('I2.2 probe records returned measurements without reevaluating or changing results', () => {
    const {installProbe} = require('../scripts/ai-batch/rnd-protection-probe');
    const card = {title: 'ICE', cardType: 'ice', rezCost: 3};
    const server = {serverName: 'R&D'};
    const score = {stake: 0.4, hazardBefore: 0.3, hazardAfter: 0.1, score: -2.648};
    const policy = {allowed: true, reason: 'noUnrezzedIce'};
    const options = [{cardToInstall: card, serverToInstallTo: server, iceMarginalScore: score}];
    const corp = {creditPool: 5, clickTracker: 3, HQ: {cards: [card]}};
    const before = JSON.stringify(corp), notes = [], calls = [];
    const ai = {
      _marginalIceScore(c, s) { calls.push('score'); assert.strictEqual(this, ai); return score; },
      _iceLayerPolicy(s) { calls.push('policy'); return policy; },
      _iceInCardsCommon(s, affordable, cards) { calls.push('affordability'); return cards; },
      _rankedInstallOptions(cards) {
        assert.strictEqual(cards, corp.HQ.cards);
        this._iceLayerPolicy(server);
        this._iceInCardsCommon(server, true, cards);
        this._marginalIceScore(card, server);
        return options;
      },
    };
    installProbe(ai, corp, {Note(key, value) { notes.push({key, value}); }});
    assert.strictEqual(ai._rankedInstallOptions(corp.HQ.cards), options);
    assert.deepStrictEqual(calls, ['policy', 'affordability', 'score']);
    assert.strictEqual(JSON.stringify(corp), before);
    assert.deepStrictEqual(notes[0].value.scores, [{card: 'ICE', server: 'R&D', ...score}]);
    assert.deepStrictEqual(notes[0].value.admission, [{server: 'R&D', ...policy}]);
    assert.deepStrictEqual(notes[0].value.affordability, [{server: 'R&D', affordable: true, cards: ['ICE']}]);
    assert.strictEqual(ai._marginalIceScore(card, server), score);
    assert.strictEqual(notes[0].value.scores.length, 1, 'completed frame must not receive later calls');
  });

  await scenario('I2.2 probe restores its observation frame after an exception', () => {
    const {installProbe} = require('../scripts/ai-batch/rnd-protection-probe');
    const failure = new Error('ranking failed'), notes = [];
    const ai = {_marginalIceScore() { return {}; }, _iceLayerPolicy() { return {}; },
      _iceInCardsCommon() { return []; }, _rankedInstallOptions() { throw failure; }};
    installProbe(ai, {HQ: {cards: []}}, {Note(key, value) { notes.push(value); }});
    assert.throws(() => ai._rankedInstallOptions([]), error => error === failure);
    assert.deepStrictEqual(ai._iceInCardsCommon(null, true, []), []);
    assert.deepStrictEqual(notes, []);
  });

  await scenario('F3 collector distinguishes requests from work and filters main commands', () => {
    const collector = require('../scripts/ai-batch/collectors/evaluatorCallCount');
    const state = {};
    collector.onEvent({type: 'gameStart'}, state);
    const event = {type: 'decision', side: 'corp', identifier: 'Corp 2.2', choiceType: 'command',
      securityEvaluation: {requests: 12, computations: 3}};
    collector.onEvent(event, state);
    collector.onEvent(Object.assign({}, event, {securityEvaluation: {requests: 8, computations: 1}}), state);
    for (const change of [{side: 'runner'}, {identifier: 'Corp 2.1'}, {choiceType: 'select'}])
      collector.onEvent(Object.assign({}, event, change), state);
    assert.deepStrictEqual(collector.finish(state), {mainDecisions: 2, requests: 20, computations: 4,
      requestsPerMainDecision: 10, computationsPerMainDecision: 2});
    assert.throws(() => collector.onEvent(Object.assign({}, event, {securityEvaluation: null}), state), /Missing/);
    assert.throws(() => collector.finish(state), /Missing/);
  });
  await scenario('F3 gate fails on changed decisions, missing evidence, poor savings or latency', () => {
    const report = (computations, ms) => ({poolHash: 'pool', seeds: [1], starts: [], collectors: ['evaluatorCallCount'],
      failures: [], pairs: ['gateway'], codeHash: 'same-code', games: [{deckPairId: 'gateway', seed: 1, ok: true, logHash: 'same', decisionHash: 'choices',
        metrics: {'evaluatorCallCount.mainDecisions': 2, 'evaluatorCallCount.computationsPerMainDecision': computations,
          'decisionLatencyMs.corp.mean': ms}}]});
    const off = report(10, 10), on = report(4, 3), verify = report(10, 11);
    off.securityCache = 'off'; on.securityCache = 'on'; verify.securityCache = 'verify';
    assert(batch.checkSecurityCacheGate(off, on, verify).pass);
    for (const arm of [0, 1, 2]) {
      for (const metric of ['evaluatorCallCount.computationsPerMainDecision', 'decisionLatencyMs.corp.mean']) {
        for (const value of [undefined, null, NaN, Infinity, -Infinity]) {
          const reports = [off, on, verify].map(r => JSON.parse(JSON.stringify(r)));
          reports[arm].games[0].metrics[metric] = value;
          assert.strictEqual(batch.checkSecurityCacheGate(...reports).pass, false,
            `${reports[arm].securityCache} arm must reject ${metric}=${value}`);
        }
      }
    }
    for (const change of [r => {r.games[0].decisionHash = 'changed';}, r => {r.games[0].logHash = 'changed';},
      r => {r.quick = true;}, r => {r.games[0].ok = false;}, r => {r.games = [];},
      r => {r.games[0].metrics['evaluatorCallCount.computationsPerMainDecision'] = 6;},
      r => {r.games[0].metrics['decisionLatencyMs.corp.mean'] = 11;},
      r => {r.games[0].metrics['evaluatorCallCount.mainDecisions'] = 0;}]) {
      const bad = JSON.parse(JSON.stringify(on)); change(bad);
      assert(!batch.checkSecurityCacheGate(off, bad, verify).pass);
    }
    verify.games[0].decisionHash = 'bad verification';
    assert(!batch.checkSecurityCacheGate(off, on, verify).pass);
  });
  await scenario('missing deck definitions fail before games; pair ids must be unique', () => {
    const invalidDeck = setupFile('missing-cards', 'registerPrecon(' + JSON.stringify({
      identity: '99999', cards: {'99998': 3},
    }) + ');');
    const invalidFile = path.relative(path.join(root, 'precons'), invalidDeck);
    const testPool = Object.assign({}, pool, {pairs: [gateway,
      {id: 'missing', corp: invalidFile, runner: gateway.runner}]});
    const file = path.join(tmp, 'missing-pool.json');
    fs.writeFileSync(file, JSON.stringify(testPool));
    const missing = /cards 99999, 99998 have no definition in the loaded sets/;
    assert.throws(() => batch.buildConfig(batch.parseArgs(['--pool', file])), missing);
    const selectedArgs = batch.parseArgs(['--pool', file, '--pairs', gateway.id]);
    assert.throws(() => batch.buildConfig(selectedArgs, {pairs: [testPool.pairs[1]]}), missing,
      'overridden pairs must be validated even when the selected pool pair is valid');
    assert.throws(() => batch.buildConfig(selectedArgs, {setFiles: []}), /have no definition in the loaded sets/,
      'overridden sets must supply the selected decks');
    assert.deepStrictEqual(batch.buildConfig(batch.parseArgs(['--pool', file]), {pairs: [gateway]}).pairs,
      [gateway], 'valid overrides replace invalid pool pairs before validation');
    assert.throws(() => game({corpFile: invalidFile}), missing,
      'direct headless games also explain missing definitions');
    const result = cli(['--pool', file, '--seeds', '1-1']);
    assert.strictEqual(result.status, 2, result.out);
    assert.match(result.out, missing);
    assert.ok(!/games,/.test(result.out), 'validation happens before batch progress');
    const selected = batch.buildConfig(batch.parseArgs(['--pool', file, '--pairs', gateway.id]));
    assert.deepStrictEqual(selected.pairs, [gateway], 'unselected missing decks do not block a batch');
    fs.writeFileSync(file, JSON.stringify(Object.assign({}, pool, {pairs: [gateway, gateway]})));
    assert.throws(() => batch.loadPool(file), /Duplicate deck pair id in pool: gateway/);
  });

  await scenario('game timeout must fit a positive finite Node timer', () => {
    for (const timeout of ['0', '-1', 'NaN', 'Infinity', '2147483'])
      assert.throws(() => batch.buildConfig(batch.parseArgs(['--timeout', timeout])), /timeout/);
  });

  await scenario('CLI value options require operands, including both comparison reports', () => {
    for (const option of ['--budget', '--pool', '--games', '--seeds', '--pairs', '--jobs', '--timeout', '--out',
      '--side', '--start', '--start-tag', '--corp-option', '--runner-option', '--collector', '--guard',
      '--improve', '--better', '--max', '--compare']) {
      for (const suffix of [[], ['--quick']]) {
        assert.throws(() => batch.parseArgs([option, ...suffix]), new RegExp(option + ' needs an operand'));
      }
    }
    for (const suffix of [[], ['--quick']]) {
      assert.throws(() => batch.parseArgs(['--compare', 'baseline.json', ...suffix]), /--compare needs an operand/);
    }
    const parsed = batch.parseArgs(['--compare', 'baseline.json', 'candidate.json', '--budget', '1400',
      '--start-tag', 'hosted-card-on-ice', '--start-tag', 'unrezzed-ice']);
    assert.deepStrictEqual(parsed.compare, ['baseline.json', 'candidate.json']);
    assert.strictEqual(parsed.budget, '1400');
    assert.deepStrictEqual(parsed.startTag, ['hosted-card-on-ice', 'unrezzed-ice']);
    const invalid = cli(['--budget']);
    assert.strictEqual(invalid.status, 2, invalid.out);
    assert.match(invalid.out, /--budget needs an operand/);
  });

  await scenario('replay diff distinguishes equal, changed and failed comparisons and cleans up', () => {
    const childProcess = require('child_process');
    const original = childProcess.spawnSync;
    let dir;
    try {
      for (const result of [
        {status: 0, stdout: ''}, {status: 1, stdout: '-baseline\n+candidate\n'},
        {status: null, error: new Error('spawn diff ENOENT')},
        {status: 2, stderr: 'cannot read file'}, {status: null, signal: 'SIGTERM'},
      ]) {
        childProcess.spawnSync = (command, args, options) => {
          assert.strictEqual(command, 'diff');
          assert.deepStrictEqual(args, ['-U2', 'baseline.log', 'candidate.log']);
          dir = options.cwd;
          assert.strictEqual(fs.readFileSync(path.join(dir, 'baseline.log'), 'utf8'), 'baseline\n');
          assert.strictEqual(fs.readFileSync(path.join(dir, 'candidate.log'), 'utf8'), 'candidate\n');
          return result;
        };
        if (result.status === 0 || result.status === 1) {
          assert.strictEqual(batch.diffLogs(['baseline'], ['candidate']),
            result.status === 0 ? 'Logs are identical.' : result.stdout);
        } else {
          assert.throws(() => batch.diffLogs(['baseline'], ['candidate']), /diff failed: (spawn diff ENOENT|cannot read file|signal SIGTERM)/);
        }
        assert.ok(!fs.existsSync(dir), 'temporary logs are removed even on failure');
      }
    } finally {
      childProcess.spawnSync = original;
    }
  });

  await scenario('5. comparison: known paired difference, deterministic bootstrap interval', async () => {
    const games = shift => Array.from({length: 60}, (_, i) => ({deckPairId: 'a', seed: String(i + 1), fixtureId: null, ok: true,
      metrics: {pointsScored: (i % 7) + shift + (shift ? (i % 3) - 1 : 0), pointsStolen: i % 5}}));
    const report = g => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: g});
    const a = metrics.compareReports(report(games(0)), report(games(1)), {improve: ['pointsScored'], guard: {pointsStolen: 0.5}});
    const b = metrics.compareReports(report(games(0)), report(games(1)), {improve: ['pointsScored'], guard: {pointsStolen: 0.5}});
    assert.deepStrictEqual(a, b, 'the comparison is reproducible');
    const m = a.metrics.pointsScored;
    assert.ok(Math.abs(m.difference - 1) < 1e-9, 'mean paired difference is 1, got ' + m.difference);
    assert.ok(m.low <= 1 && m.high >= 1 && m.low < m.high, `interval [${m.low}, ${m.high}] contains 1`);
    assert.strictEqual(a.pass, true);
    // Lower-is-better metrics are oriented so positive means improvement.
    const worse = metrics.compareReports(report(games(0)), report(games(0).map(g => Object.assign({}, g,
      {metrics: Object.assign({}, g.metrics, {pointsStolen: g.metrics.pointsStolen + 1})}))), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(worse.metrics.pointsStolen.improvement.mean, -1);
    assert.strictEqual(worse.pass, false);
    // A gate fails when the option changed no game, even if every guard holds.
    const hashed = g => g.map(x => Object.assign({}, x, {logHash: 'h' + x.seed}));
    const inert = metrics.compareReports(report(hashed(games(0))), report(hashed(games(0))), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(inert.changedGames, 0);
    assert.strictEqual(inert.pass, false, 'an option that changed nothing cannot pass');
    assert.ok(inert.checks.some(c => c.kind === 'changed' && !c.pass && /no game differs/.test(c.why)));
    const changed = hashed(games(0)).map((x, i) => i === 3 ? Object.assign({}, x, {logHash: 'other'}) : x);
    const live = metrics.compareReports(report(hashed(games(0))), report(changed), {guard: {pointsStolen: 0.5}});
    assert.strictEqual(live.changedGames, 1);
    assert.strictEqual(live.pass, true);
    assert.strictEqual(metrics.compareReports(report(hashed(games(0))), report(hashed(games(0)))).pass, null, 'no gate, no check');
  });

  await scenario('5b. --side runner flips outcome directions; --max is a hard check on every game', async () => {
    const games = shift => Array.from({length: 40}, (_, i) => ({deckPairId: 'a', seed: String(i + 1), fixtureId: null, ok: true,
      metrics: {winRate: (i % 2) && shift ? 0 : i % 2, 'x.violations': shift && i === 7 ? 2 : 0}}));
    const report = g => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: g});
    const base = report(games(0)), cand = report(games(1));
    const corp = metrics.compareReports(base, cand, batch.gateSpec(batch.parseArgs(['--improve', 'winRate'])));
    assert.strictEqual(corp.pass, false, 'a lower Corp win rate is not a Corp improvement');
    const runner = metrics.compareReports(base, cand, batch.gateSpec(batch.parseArgs(['--side', 'runner', '--improve', 'winRate'])));
    assert.strictEqual(runner.pass, true, 'a lower Corp win rate is a Runner improvement');
    const spec = batch.gateSpec(batch.parseArgs(['--max', 'x.violations=0']));
    const hard = batch.applyMaxChecks(metrics.compareReports(base, cand, spec), cand, spec.max);
    assert.strictEqual(hard.pass, false);
    assert.ok(/1 games exceed it, e.g. a seed 8/.test(hard.checks[0].why), hard.checks[0].why);
    const ok = batch.applyMaxChecks(metrics.compareReports(base, base, spec), base, spec.max);
    assert.strictEqual(ok.pass, true);
  });

  await scenario('--max fails when any candidate game lacks a finite measurement', () => {
    const check = games => batch.applyMaxChecks({checks: []}, {games}, {'x.violations': 0});
    const measured = {ok: true, metrics: {'x.violations': 0}};
    assert.strictEqual(check([measured]).pass, true, 'zero is a measured value');
    for (const ok of [true, false]) {
      for (const missing of [undefined, null, {}, {'x.violations': undefined}, {'x.violations': NaN}]) {
        const result = check([measured, {ok, metrics: missing}]);
        assert.strictEqual(result.pass, false, 'every game must supply the requested measurement');
        assert.match(result.checks[0].why, /1 games have no finite metric/);
      }
    }
    assert.strictEqual(check([]).pass, false, 'an empty batch is not evidence');
    assert.strictEqual(check([{ok: false, metrics: {'x.violations': 2}}]).pass, false,
      'a failed game with a measurement is still checked against the limit');
  });

  await scenario('5c. batch metrics bootstrap over games; --ceiling checks the candidate upper bound', async () => {
    const collector = {name: 'demo', samples: g => g.values, finishBatch: perGame => ({mean: [].concat(...perGame).reduce((a, b) => a + b, 0) /
      Math.max(1, [].concat(...perGame).length)}), batchResamples: 100};
    const games = Array.from({length: 30}, (_, i) => ({ok: true, samples: {demo: [i % 3 === 0 ? 1 : 0, 0]}}));
    const out = metrics.batchMetrics([collector], games);
    assert.strictEqual(out['demo.mean'].games, 30);
    assert.ok(out['demo.mean'].low <= out['demo.mean'].value && out['demo.mean'].value <= out['demo.mean'].high);
    assert.deepStrictEqual(metrics.batchMetrics([collector], games), out, 'seeded and reproducible');
    const report = value => ({poolHash: 'p', seeds: [], starts: [], collectors: [], games: [],
      batchMetrics: {'demo.mean': {value, low: value - 0.05, high: value + 0.05, games: 30}}});
    for (const limit of ['Infinity', '-Infinity', '1e309', 'NaN', 'true', 'false', '', 'invalid'])
      assert.throws(() => batch.gateSpec(batch.parseArgs(['--ceiling', 'demo.mean=' + limit])),
        /--ceiling value must be a finite number/, limit + ' must be rejected');
    for (const limit of ['0', '-0.1', '1e-2'])
      assert.strictEqual(batch.gateSpec(batch.parseArgs(['--ceiling', 'demo.mean=' + limit])).ceiling['demo.mean'], Number(limit));
    const spec = batch.gateSpec(batch.parseArgs(['--ceiling', 'demo.mean=0.10']));
    const fail = batch.applyCeilingChecks({checks: []}, report(0), report(0.2), spec.ceiling);
    assert.strictEqual(fail.pass, false);
    assert.ok(/upper bound 0.25/.test(fail.checks[0].why), fail.checks[0].why);
    assert.strictEqual(batch.applyCeilingChecks({checks: []}, report(0.2), report(0.04), spec.ceiling).pass, true);
    const missing = batch.applyCeilingChecks({checks: []}, report(0), {games: []}, spec.ceiling);
    assert.strictEqual(missing.checks[0].why, 'unknown batch metric');
  });

  await scenario('batch diagnostics print both intervals without imposing a no-worse gate', () => {
    const report = (value, logHash) => ({poolHash: 'diagnostic-test', seeds: [1], starts: [], collectors: ['demo'],
      games: [{ok: true, deckPairId: 'test', seed: 1, logHash, metrics: {winRate: 1, 'weights.violations': 0}}],
      batchMetrics: {'demo.max': {value, low: value - 0.05, high: value + 0.05, games: 1}}});
    const baseline = path.join(tmp, 'diagnostic-baseline.json'), candidate = path.join(tmp, 'diagnostic-candidate.json');
    fs.writeFileSync(baseline, JSON.stringify(report(0.1, 'baseline')));
    fs.writeFileSync(candidate, JSON.stringify(report(0.3, 'candidate')));
    const args = ['--compare', baseline, candidate, '--max', 'weights.violations=0', '--guard', 'winRate=0.02'];
    const diagnostic = cli(args);
    assert.strictEqual(diagnostic.status, 0, diagnostic.out);
    assert.match(diagnostic.out, /demo.max\s+batch: baseline 0.100 \[0.050, 0.150\]\s+candidate 0.300 \[0.250, 0.350\] \[diagnostic\]/);
    assert.doesNotMatch(diagnostic.out, /(?:PASS|FAIL).*demo.max/);
    assert.match(diagnostic.out, /Gate: passed/);
    const strict = cli([...args, '--no-worse', 'demo.max']);
    assert.notStrictEqual(strict.status, 0, strict.out);
    assert.match(strict.out, /FAIL measured no-worse demo.max/);
  });

  await scenario('5d. posture collectors: violations, horizon locks and single-variable correlation', async () => {
    const perEpoch = require('../scripts/ai-batch/collectors/postureDecisionsPerEpoch');
    const locked = require('../scripts/ai-batch/collectors/postureLockedPastHorizon');
    const corr = require('../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
    const vars = (grip, turn) => ({turn, corpCredits: 5, runnerCredits: 5, gripSize: grip, hqSize: 5, rootCount: 1,
      iceCount: 1, deepestCentralIce: 1, corpPoints: 0, runnerPoints: 0});
    const events = [
      {type: 'posture', kind: 'bait', action: 'roll', cardId: 1, epoch: 2, postured: 1, isAgenda: 0, publicVars: vars(1, 2)},
      {type: 'posture', kind: 'bait', action: 'roll', cardId: 1, epoch: 2, postured: 0, isAgenda: 0, publicVars: vars(2, 2)},
      {type: 'posture', kind: 'bluff', action: 'roll', cardId: 2, epoch: 2, postured: 1, isAgenda: 1, publicVars: vars(3, 2)},
      {type: 'posture', kind: 'bait', action: 'reuse', cardId: 1, epoch: 3, corpTurn: 1, expired: 1, publicVars: vars(4, 3)},
      {type: 'posture', kind: 'bait', action: 'reuse', cardId: 1, epoch: 3, corpTurn: 0, expired: 0, publicVars: vars(4, 3)},
      {type: 'posture', kind: 'bluff', action: 'guard', cardId: 2, epoch: 3, publicVars: vars(9, 3)},
      {type: 'posture', kind: 'profile', action: 'profile', profile: {targetIce: 2, openingAdvances: 1, delayTurns: 0}, publicVars: vars(5, 1)},
    ];
    const state = {};
    for (const e of events) [perEpoch, locked, corr].forEach(c => c.onEvent(e, state));
    assert.deepStrictEqual(perEpoch.finish(state), {violations: 1, rolls: 3});
    assert.deepStrictEqual(locked.finish(state), {count: 1});
    assert.deepStrictEqual(corr.finish(state), {decisions: 4}, 'guard stops and reuses are excluded');
    assert.strictEqual(corr.spearman([1, 2, 3, 4], [10, 20, 30, 40]), 1);
    assert.strictEqual(corr.spearman([1, 2, 3, 4], [4, 3, 2, 1]), -1);
    assert.strictEqual(corr.spearman([1, 1, 1, 1], [1, 2, 3, 4]), null, 'a constant column has no correlation');
    // Posture tracking Grip size exactly is a perfect single-variable tell.
    const tell = Array.from({length: 40}, (_, i) => ({k: 'p', postured: i < 20 ? 1 : 0, isAgenda: 0,
      v: corr.VARIABLES.map(name => name === 'gripSize' ? i : 3)}));
    assert.ok(corr.finishBatch([tell]).max > 0.8);
    const fair = Array.from({length: 40}, (_, i) => ({k: 'p', postured: i % 2, isAgenda: 0,
      v: corr.VARIABLES.map(name => name === 'gripSize' ? Math.floor(i / 2) : 3)}));
    assert.ok(corr.finishBatch([fair]).max < 0.1, String(corr.finishBatch([fair]).max));
  });

  await scenario('expanded directories and tagged starts each get one share of the budget', () => {
    const dir = path.join(root, 'tests/fixtures/ai-batch/starts');
    const tagged = batch.taggedStarts(['hosted-card-on-ice']);
    const onlyDirectory = batch.buildConfig(batch.parseArgs(['--start', dir, '--budget', '1400']));
    const overlap = batch.buildConfig(batch.parseArgs(['--start', dir, '--start-tag', 'hosted-card-on-ice', '--budget', '1400']));
    assert.ok(tagged.length, 'the tag selects a committed board');
    assert.deepStrictEqual(overlap.starts, onlyDirectory.starts, 'tag overlap does not duplicate expanded boards');
    assert.deepStrictEqual(overlap.seeds, onlyDirectory.seeds, 'budget allocation follows unique boards');
    const file = tagged[0];
    assert.strictEqual(batch.resolveStarts([file, path.relative(root, file)], overlap.poolInfo.ranges).length, 1,
      'relative and absolute paths resolve to the same file');
  });

  await scenario('10. the committed pool uses only its trusted sets and defined cards', async () => {
    const registry = {systemgateway: 1, systemupdate2021: 1, elevation: 1};
    assert.deepStrictEqual(pool.sets.slice().sort(), Object.keys(registry).sort());
    const defined = new Set();
    for (const file of setFiles)
      for (const m of fs.readFileSync(path.join(root, file), 'utf8').matchAll(/^cardSet\[(\d+)\]\s*=/gm)) defined.add(Number(m[1]));
    const problems = [];
    for (const pair of pool.pairs) for (const file of [pair.corp, pair.runner]) {
      const deck = loadPrecon(file);
      for (const id of [deck.identity, ...Object.keys(deck.cards)].map(Number)) {
        if (!ranges.some(([from, to]) => id >= from && id <= to)) problems.push(`${file}: ${id} is outside the pool's sets`);
        else if (!defined.has(id)) problems.push(`${file}: ${id} has no cardSet definition`);
      }
    }
    assert.deepStrictEqual(problems, []);
    const files = pool.pairs.map(p => p.corp);
    assert.ok(files.includes('Zwicky Supermodernism.js') && files.includes('LEO Glacier.js'));
    assert.strictEqual(new Set(pool.pairs.map(p => p.id)).size, pool.pairs.length, 'pair ids are unique');
  });

}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
