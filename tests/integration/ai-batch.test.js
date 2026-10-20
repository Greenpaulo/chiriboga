'use strict';
// Reproducibility produces report fixtures consumed by later metric scenarios.
const run = require('../_ai-batch-test-support');
run(async ({
  assert, fs, path, readFixture, metrics, batch, root, pool, ranges, tmp, scenario, gateway,
  TEST_OPTION, game, cli, stable, setupFile, RECORD, EXTRA_DRAW
}) => {
  await scenario('I2.2 passive probe preserves real choices and logs with either policy', async () => {
    for (const enabled of [false, true]) {
      const plainEvents = [], probeEvents = [];
      const options = {corpOptions: {iceMarginalSecurity: enabled}};
      const plain = await game({...options, onEvent: event => plainEvents.push(event)});
      const probe = await game({...options, onEvent: event => probeEvents.push(event),
        setupFile: path.join(root, 'scripts/ai-batch/rnd-protection-probe.js')});
      assert(plain.winner); assert(probe.winner);
      assert.deepStrictEqual(probe.errors, []);
      assert.strictEqual(probe.logHash, plain.logHash);
      const choices = events => events.filter(e => e.type === 'decision')
        .map(e => [e.n, e.side, e.identifier, e.choiceType, e.options, e.chosen]);
      // Labels originate in separate VM realms; compare their JSON values.
      assert.strictEqual(JSON.stringify(choices(probeEvents)), JSON.stringify(choices(plainEvents)));
      assert.deepStrictEqual(probeEvents.filter(e => e.type === 'iceInstalled'),
        plainEvents.filter(e => e.type === 'iceInstalled'));
      assert(probeEvents.some(e => e.rndProtectionProbe?.length));
      if (enabled) assert(probeEvents.some(e => e.rndProtectionProbe?.some(p => p.scores.length)));
    }
  });

  await scenario('F3 instrumented cache modes preserve real Gateway choices', async () => {
    const results = [];
    for (const mode of ['off', 'on', 'verify']) {
      const events = [];
      const result = await game({securityCache: mode, evaluatorTelemetry: true, onEvent: e => events.push(e)});
      assert(result.winner); assert.deepStrictEqual(result.errors, []);
      const choices = events.filter(e => e.type === 'decision').map(e =>
        [e.side, e.identifier, e.choiceType, Array.from(e.options), e.chosen]);
      const main = events.filter(e => e.type === 'decision' && e.side === 'corp' && e.identifier === 'Corp 2.2' && e.choiceType === 'command');
      assert(main.length > 0);
      const totals = main.reduce((s, e) => ({requests: s.requests + e.securityEvaluation.requests,
        computations: s.computations + e.securityEvaluation.computations}), {requests: 0, computations: 0});
      results.push({hash: result.logHash, choices, totals});
    }
    assert.deepStrictEqual(results[0].choices, results[1].choices);
    assert.deepStrictEqual(results[0].choices, results[2].choices);
    assert.strictEqual(results[0].hash, results[1].hash);
    assert.strictEqual(results[0].hash, results[2].hash);
    assert(results[1].totals.computations < results[0].totals.computations);
    assert.deepStrictEqual(results[0].totals, results[2].totals);
  });

  await scenario('1. identical runs give identical reports (ignoring timing)', async () => {
    const outs = [1, 2].map(i => path.join(tmp, `repro-${i}.json`));
    for (const out of outs) {
      const r = cli(['--pairs', 'gateway', '--seeds', '1-2', '--jobs', '2', '--collector', 'runs', '--out', out]);
      assert.strictEqual(r.status, 0, r.out);
    }
    const [a, b] = outs.map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
    assert.deepStrictEqual(stable(a), stable(b));
    assert.strictEqual(a.games.length, 2);
  });

  await scenario('worker exits with an outstanding job reject without publishing a report', async () => {
    // A preload intercepts the real worker's first dispatch, before playJob.
    // Seed 2 stays alive without replying: failure must also stop this sibling.
    for (const code of [0, 1]) {
      const preload = setupFile('worker-exit-' + code, `
        if (process.argv.includes('--worker')) {
          process.on('message', job => {
            if (job.seed === '1') process.exit(${code});
            else setInterval(() => {}, 1000);
          });
          process.on = function(name, listener) {
            if (name === 'message') return this;
            return require('events').EventEmitter.prototype.on.call(this, name, listener);
          };
        }
      `);
      const out = path.join(tmp, 'worker-exit-' + code + '.json');
      const r = cli(['--pairs', 'gateway', '--seeds', '1-3', '--jobs', '2', '--out', out],
        {NODE_OPTIONS: '--require ' + JSON.stringify(preload)});
      assert.strictEqual(r.status, 2, r.out);
      assert.match(r.out, /Worker exited before returning gateway seed 1/);
      assert.ok(!fs.existsSync(out), 'an incomplete report must not be published');
    }
  });

  await scenario('SIGSEGV retries the identical job once and rejects a repeated crash', () => {
    const baselineOut = path.join(tmp, 'retry-baseline.json');
    const args = ['--pairs', 'gateway', '--seeds', '1-3', '--jobs', '2'];
    const baseline = cli([...args, '--out', baselineOut]);
    assert.strictEqual(baseline.status, 0, baseline.out);
    for (const repeat of [false, true]) {
      const attempts = path.join(tmp, 'retry-attempts-' + repeat + '.jsonl');
      const preload = setupFile('worker-segv-' + repeat, `
        const fs = require('fs');
        const attempts = ${JSON.stringify(attempts)};
        if (process.argv.includes('--worker')) {
          process.prependListener('message', job => {
            if (job.seed !== '1') return;
            const first = !fs.existsSync(attempts);
            fs.appendFileSync(attempts, JSON.stringify(job) + '\\n');
            if (first || ${repeat}) process.exit(77);
          });
        } else {
          // Simulate a native signal in the parent without crashing Node itself.
          const cp = require('child_process');
          const fork = cp.fork;
          cp.fork = function(...args) {
            const child = fork.apply(this, args);
            const emit = child.emit;
            child.emit = function(event, ...values) {
              if (event === 'exit' && values[0] === 77) values = [null, 'SIGSEGV'];
              return emit.call(this, event, ...values);
            };
            return child;
          };
        }
      `);
      const out = path.join(tmp, 'worker-segv-' + repeat + '.json');
      const result = cli([...args, '--out', out], {NODE_OPTIONS: '--require ' + JSON.stringify(preload)});
      assert.match(result.out, /signal SIGSEGV\); retrying once in a fresh worker/);
      const dispatched = fs.readFileSync(attempts, 'utf8').trim().split('\n').map(JSON.parse);
      assert.strictEqual(dispatched.length, 2, 'at most one retry');
      assert.deepStrictEqual(dispatched[1], dispatched[0], 'retry preserves the entire job');
      if (repeat) {
        assert.strictEqual(result.status, 2, result.out);
        assert.match(result.out, /signal SIGSEGV\) after retry/);
        assert.ok(!fs.existsSync(out), 'a repeated crash must not publish an incomplete report');
      } else {
        assert.strictEqual(result.status, 0, result.out);
        assert.deepStrictEqual(stable(JSON.parse(fs.readFileSync(out, 'utf8'))).games,
          stable(JSON.parse(fs.readFileSync(baselineOut, 'utf8'))).games,
          'all games retain their seeded results, including completed sibling games');
      }
    }
  });

  await scenario('2. an extra Corp AI draw leaves the engine and Runner streams unchanged', async () => {
    const base = await game({setupFile: setupFile('record', RECORD)});
    const extra = await game({setupFile: setupFile('corp-extra', RECORD + EXTRA_DRAW('corp'))});
    assert.ok(extra.report.corpDraws > base.report.corpDraws, 'the extra Corp draws happened');
    assert.deepStrictEqual(extra.report.first, base.report.first, 'R&D and Stack order at the first draw');
    assert.ok(base.report.corpDraws > 0, 'Corp policy draws from its dedicated stream');
  });

  await scenario('3. Runner AI stream: same seed reproduces choices; an extra Runner draw keeps the engine stream', async () => {
    const a = await game({setupFile: setupFile('record', RECORD)});
    const b = await game({setupFile: setupFile('record', RECORD)});
    assert.strictEqual(a.logHash, b.logHash, 'same seed replays the same game');
    assert.ok(a.report.runnerDraws > 0, 'Runner policy draws from its dedicated stream, not the engine stream');
    const extra = await game({setupFile: setupFile('runner-extra', RECORD + EXTRA_DRAW('runner'))});
    assert.ok(extra.report.runnerDraws > a.report.runnerDraws, 'the extra Runner draws happened');
    assert.deepStrictEqual(extra.report.first, a.report.first, 'R&D and Stack order at the first draw');
  });

  await scenario('4. AI options: set per run, recorded, unknown names fail, comparison keys', async () => {
    const out = path.join(tmp, 'option.json');
    const r = cli(['--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--corp-option', TEST_OPTION + '=true', '--out', out]);
    assert.strictEqual(r.status, 0, r.out);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.strictEqual(report.options.corp[TEST_OPTION], true);
    const defaults = await game();
    assert.strictEqual(defaults.options.corp[TEST_OPTION], false, 'the option is off in other runs');
    const unknown = cli(['--pairs', 'gateway', '--seeds', '1-1', '--corp-option', 'noSuchOption=true', '--out', path.join(tmp, 'x.json')]);
    assert.notStrictEqual(unknown.status, 0);
    assert.ok(/Unknown corp AI option: noSuchOption/.test(unknown.out), unknown.out);
    const unknownRunner = cli(['--pairs', 'gateway', '--seeds', '1-1', '--runner-option', 'noSuchOption=true', '--out', path.join(tmp, 'x.json')]);
    assert.ok(/Unknown runner AI option: noSuchOption/.test(unknownRunner.out), unknownRunner.out);
    // Only options may differ between compared reports.
    const synthetic = (extra = {}) => Object.assign({poolHash: 'p', seeds: ['1'], starts: [], collectors: [],
      options: {corp: {}, runner: {}}, games: [{deckPairId: 'a', seed: '1', fixtureId: null, ok: true, metrics: {winRate: 1}}]}, extra);
    assert.strictEqual(metrics.compareReports(synthetic(), synthetic({options: {corp: {x: true}, runner: {}}})).pairedGames, 1);
    for (const field of ['seeds', 'poolHash', 'starts', 'collectors'])
      assert.throws(() => metrics.compareReports(synthetic(), synthetic({[field]: ['other']})), new RegExp('differ in ' + field));
  });

  await scenario('F11 pooled guards and improvements reach both CLI paths', () => {
    const f11cli = args => cli(args, {AI_BATCH_CACHE: path.join(tmp, 'f11-cache')});
    const corr = require('../../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
    const name = corr.name + '.max';
    const report = fair => {
      const rows = Array.from({length: 6}, (_, i) => ({k: 'p', postured: fair ? i % 2 : Number(i >= 3),
        isAgenda: 0, v: corr.VARIABLES.map(() => i)}));
      const value = corr.finishBatch([rows]).max;
      return {poolHash: 'f11-cli', seeds: [1], starts: [], collectors: [corr.name],
        games: [{ok: true, seed: 1, deckPairId: 'test', logHash: fair ? 'changed' : 'base',
          metrics: {}, samples: {[corr.name]: rows}}],
        batchMetrics: {[name]: {value, low: value, high: value, games: 1}}};
    };
    const baseline = path.join(tmp, 'f11-baseline.json'), candidate = path.join(tmp, 'f11-candidate.json');
    fs.writeFileSync(baseline, JSON.stringify(report(false)));
    fs.writeFileSync(candidate, JSON.stringify(report(true)));
    for (const checks of [['--guard', name + '=0.02'], ['--improve', name]]) {
      const result = f11cli(['--compare', baseline, candidate, ...checks, '--ceiling', name + '=1']);
      assert.strictEqual(result.status, 0, result.out);
      assert.match(result.out, /paired batch: baseline.*candidate.*difference.*95% interval/);
      assert.match(result.out, /lower is better; 200 resamples; 0 dropped pairs/);
      assert.match(result.out, /Gate: passed/);
    }
    const identity = f11cli(['--compare', baseline, baseline, '--improve', name]);
    assert.strictEqual(identity.status, 1, identity.out);
    assert.match(identity.out, /FAIL improve/);
    for (const checks of [['--guard', name + '=0.02'], ['--improve', name]]) {
      const gate = f11cli(['gate', '--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--quick',
        '--corp-option', TEST_OPTION + '=true', '--collector', corr.name, ...checks]);
      assert.strictEqual(gate.status, 1, gate.out);
      assert.match(gate.out, /paired batch:/);
      assert.doesNotMatch(gate.out, /unknown metric|Unknown collector/);
      assert.match(gate.out, /Gate: indicative only/);
    }
    // Synthetic cached reports exercise passing pooled statistics in gate's
    // orchestration. These are test data, never game evidence for adoption.
    const cache = path.join(tmp, 'f11-cache');
    for (const file of fs.readdirSync(cache).filter(file => file.endsWith('.json'))) {
      const cached = JSON.parse(fs.readFileSync(path.join(cache, file), 'utf8'));
      if (JSON.stringify(cached.collectors) !== JSON.stringify([corr.name])) continue;
      const synthetic = report(Boolean(cached.options.corp[TEST_OPTION]));
      cached.games.forEach(game => {
        game.ok = true; game.samples = synthetic.games[0].samples; game.logHash = synthetic.games[0].logHash;
      });
      cached.batchMetrics = synthetic.batchMetrics;
      fs.writeFileSync(path.join(cache, file), JSON.stringify(cached));
    }
    for (const checks of [['--guard', name + '=0.02'], ['--improve', name]]) {
      const gate = f11cli(['gate', '--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--quick',
        '--corp-option', TEST_OPTION + '=true', '--collector', corr.name, ...checks]);
      assert.strictEqual(gate.status, 1, gate.out);
      assert.match(gate.out, /PASS (guard|improve) bluffSingleVariableCorrelation.max/);
      assert.match(gate.out, /paired batch:/);
      assert.match(gate.out, /Gate: indicative only/);
    }
    const unsafe = {...report(false), collectors: ['../metrics']};
    fs.writeFileSync(baseline, JSON.stringify(unsafe));
    fs.writeFileSync(candidate, JSON.stringify(unsafe));
    const invalidName = f11cli(['--compare', baseline, candidate, '--improve', '../metrics.max']);
    assert.strictEqual(invalidName.status, 2, invalidName.out);
    assert.match(invalidName.out, /Invalid collector name/);
  });

  await scenario('5e. posture epochs: seeded games reproduce the same epoch sequence', async () => {
    const play = async () => {
      const seen = [];
      const g = await game({corpOptions: {postureEpochs: true}, onEvent: e => { if (e.type === 'posture') seen.push(e); }});
      return {g, seen};
    };
    const a = await play(), b = await play();
    assert.ok(a.seen.length > 0, 'the game reaches posture or profile decisions');
    assert.deepStrictEqual(a.seen, b.seen);
    assert.strictEqual(a.g.logHash, b.g.logHash);
    const perEpoch = require('../../scripts/ai-batch/collectors/postureDecisionsPerEpoch');
    const locked = require('../../scripts/ai-batch/collectors/postureLockedPastHorizon');
    const state = {};
    for (const e of a.seen) { perEpoch.onEvent(e, state); locked.onEvent(e, state); }
    assert.strictEqual(perEpoch.finish(state).violations, 0);
    assert.strictEqual(locked.finish(state).count, 0);
  });

  await scenario('6. a collector receives the events and its metric reaches the report and comparison', async () => {
    const seen = new Set();
    const g = await game({onEvent: e => seen.add(e.type)});
    for (const type of ['gameStart', 'decision', 'run', 'turnEnd', 'gameEnd']) assert.ok(seen.has(type), 'emits ' + type);
    assert.ok(seen.has('score') || seen.has('steal'), 'emits score or steal');
    assert.ok(g.winner);
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'repro-1.json'), 'utf8'));
    assert.deepStrictEqual(report.collectors, ['runs']);
    for (const game of report.games) assert.ok(game.metrics['runs.total'] >= game.metrics['runs.successful']);
    assert.ok('runs.successful' in metrics.compareReports(report, report).metrics);
    const unknown = cli(['--pairs', 'gateway', '--seeds', '1-1', '--collector', 'noSuchCollector', '--out', path.join(tmp, 'x.json')]);
    assert.ok(/Unknown collector: noSuchCollector/.test(unknown.out), unknown.out);
  });

  await scenario('7. --start begins from a fixture board, runs to PlayerWin and is reproducible', async () => {
    const file = path.join(root, 'tests/fixtures/corp-decisions/corp-draw-ok-when-hq-secure.txt');
    assert.strictEqual(batch.resolveStarts([file], ranges).length, 1, 'the fixture uses only pool cards');
    const identity = Number(/CorpTestField\((\d+)/.exec(readFixture(file).code)[1]);
    let start = null;
    const runs = [];
    for (let i = 0; i < 2; i++)
      runs.push(await game({start: file, onEvent: e => { if (e.type === 'gameStart') start = e; }}));
    assert.strictEqual(start.fixtureId, 'corp-draw-ok-when-hq-secure');
    assert.strictEqual(identity, 30035);
    assert.strictEqual(start.corpIdentity, 'Haas-Bioroid: Precision Design', 'the fixture identity replaced the pool deck identity');
    assert.ok(runs[0].winner && !runs[0].errors.length, JSON.stringify(runs[0].errors));
    assert.strictEqual(runs[0].logHash, runs[1].logHash);
    const outside = path.join(root, 'tests/fixtures/corp-decisions/corp-protects-baker-backdoor-after-rnd-layer-blocked.txt');
    assert.throws(() => batch.resolveStarts([outside], ranges), /outside the pool's sets/);
  });

  await scenario('8. core metrics from a scripted game, and consistency on a real game', async () => {
    const events = [
      {type: 'gameStart'}, {type: 'mulligan', side: 'corp'},
      {type: 'decision', side: 'corp', latencyMs: 2}, {type: 'decision', side: 'corp', latencyMs: 4},
      {type: 'decision', side: 'runner', latencyMs: 1},
      {type: 'run', server: 'hq', success: true}, {type: 'steal', server: 'hq', points: 2},
      {type: 'steal', server: 'rd', points: 1}, {type: 'steal', server: 'archives', points: 1},
      {type: 'steal', server: 'remote', points: 2}, {type: 'score', points: 3}, {type: 'turnEnd', side: 'corp'},
      {type: 'gameEnd', winner: 'corp', turns: 9},
    ];
    assert.deepStrictEqual(metrics.coreMetrics(events), {
      winRate: 1, pointsScored: 3, pointsStolen: 6, gameLength: 9,
      'pointsStolenByServer.hq': 2, 'pointsStolenByServer.rd': 1, 'pointsStolenByServer.archives': 1, 'pointsStolenByServer.remote': 2,
      'decisionLatencyMs.corp.mean': 3, 'decisionLatencyMs.corp.p95': 4, 'decisionLatencyMs.corp.max': 4,
      'decisionLatencyMs.runner.mean': 1, 'decisionLatencyMs.runner.p95': 1, 'decisionLatencyMs.runner.max': 1,
      'mulliganRate.corp': 1, 'mulliganRate.runner': 0,
    });
    for (const name of Object.keys(metrics.coreMetrics(events))) assert.ok(name in metrics.CORE_DIRECTIONS, 'direction declared for ' + name);
    const report = JSON.parse(fs.readFileSync(path.join(tmp, 'repro-1.json'), 'utf8'));
    for (const g of report.games) {
      assert.strictEqual(g.metrics.pointsStolen, g.runnerPoints, 'stolen points match the Runner score area');
      assert.strictEqual(g.metrics.pointsScored, g.corpPoints, 'scored points match the Corp score area');
      assert.strictEqual(g.metrics.winRate, g.winner === 'corp' ? 1 : 0);
      assert.strictEqual(g.metrics.gameLength, g.turns);
    }
  });

  await scenario('9. telemetry and observation change no decision and consume no randomness', async () => {
    const quiet = await game({telemetry: false, observe: false, setupFile: setupFile('record', RECORD)});
    let decisions = 0;
    const corr = require('../../scripts/ai-batch/collectors/bluffSingleVariableCorrelation');
    const collectorState = {};
    const loud = await game({onEvent: e => { corr.onEvent(e, collectorState); if (e.type === 'decision') decisions++; }, setupFile: setupFile('record', RECORD)});
    assert.ok(decisions > 0, 'telemetry recorded decisions');
    corr.finishBatch([corr.samples(collectorState)]);
    assert.strictEqual(loud.logHash, quiet.logHash);
    assert.deepStrictEqual(loud.report, quiet.report, 'same AI-stream consumption');
  });

  await scenario('gate: baseline reuse and --quick', async () => {
    assert.strictEqual(batch.resolveSeeds(batch.parseArgs(['--quick'])).length, 50);
    assert.strictEqual(batch.resolveSeeds(batch.parseArgs([])).length, 200);
    const args = ['gate', '--pairs', 'gateway', '--seeds', '1-2', '--jobs', '2', '--corp-option', TEST_OPTION + '=true',
      '--guard', 'winRate=1'];
    const first = cli(args);
    assert.ok(/baseline: playing 2 games/.test(first.out) && /candidate: playing 2 games/.test(first.out), first.out);
    // The option never comes into play in these two games: the guard holds,
    // but a gate whose option changed nothing fails.
    assert.ok(/0 changed by the options/.test(first.out) && /PASS guard winRate/.test(first.out), first.out);
    assert.ok(/FAIL changed option effect/.test(first.out) && /Gate: failed/.test(first.out), first.out);
    assert.notStrictEqual(first.status, 0, first.out);
    assert.strictEqual(batch.parseArgs(['gate', '--fresh', '--games', '2']).fresh, true);
    const readCachedGames = () => fs.readdirSync(path.join(tmp, 'cache'))
      .filter(file => file.endsWith('.json')).sort().map(file => {
        const report = JSON.parse(fs.readFileSync(path.join(tmp, 'cache', file), 'utf8'));
        return {key: report.key, seeds: report.seeds, games: report.games.map(g => [g.seed, g.logHash, g.decisionHash])};
      });
    const beforeFresh = readCachedGames();
    const fresh = cli([...args, '--fresh']);
    assert.match(fresh.out, /baseline: playing 2 games/);
    assert.match(fresh.out, /candidate: playing 2 games/);
    assert.doesNotMatch(fresh.out, /: reusing/);
    assert.strictEqual(fresh.status, first.status, fresh.out);
    assert.deepStrictEqual(readCachedGames(), beforeFresh, '--fresh replays the same seeds and preserves game results and cache keys');
    const second = cli(args);
    assert.ok(/baseline: reusing/.test(second.out) && /candidate: reusing/.test(second.out), second.out);
    // Simulate an incomplete cached report written by the old worker lifecycle.
    const cached = fs.readdirSync(path.join(tmp, 'cache')).map(file => path.join(tmp, 'cache', file))
      .filter(file => file.endsWith('.json'));
    const baselineFile = cached.find(file => {
      const report = JSON.parse(fs.readFileSync(file, 'utf8'));
      return report.options.corp[TEST_OPTION] === false;
    });
    assert.ok(baselineFile, 'the baseline was cached');
    const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    baseline.games.pop();
    fs.writeFileSync(baselineFile, JSON.stringify(baseline));
    const repaired = cli(args);
    assert.ok(/baseline: playing 2 games/.test(repaired.out) && /candidate: reusing/.test(repaired.out), repaired.out);
    const quick = cli(['gate', '--pairs', 'gateway', '--quick', '--seeds', '1-2', '--jobs', '2', '--guard', 'winRate=1']);
    assert.ok(/indicative only/.test(quick.out), quick.out);
    assert.notStrictEqual(quick.status, 0, 'a quick run cannot pass a gate');
  });

  await scenario('replay plays the batch game with its full log, and --diff shows only differing lines', async () => {
    const out = path.join(tmp, 'replay-batch.json');
    assert.strictEqual(cli(['--pairs', 'gateway', '--seeds', '1-1', '--jobs', '1', '--out', out]).status, 0);
    const batchGame = JSON.parse(fs.readFileSync(out, 'utf8')).games[0];
    const one = cli(['replay', '--pairs', 'gateway', '--seeds', '1']);
    assert.strictEqual(one.status, 0, one.out);
    assert.ok(one.out.includes('logHash ' + batchGame.logHash), 'replay reproduces the batch game: ' + one.out.split('\n')[0]);
    assert.ok(one.out.split('\n').length > 50, 'the full log is printed');
    const same = cli(['replay', '--pairs', 'gateway', '--seeds', '1', '--diff']);
    assert.ok(/Logs are identical/.test(same.out), same.out.slice(0, 300));
    const bad = cli(['replay', '--pairs', 'gateway', '--seeds', '1-2']);
    assert.notStrictEqual(bad.status, 0);
  });

  await scenario('failed replays exit non-zero and retain diagnostics, including either diff side', () => {
    const source = readFixture(path.join(root, 'tests/fixtures/corp-decisions/corp-draw-ok-when-hq-secure.txt')).code;
    const file = path.join(tmp, 'failed-replay.txt');
    const args = ['replay', '--pairs', 'gateway', '--seeds', '1', '--start', file,
      '--corp-option', TEST_OPTION + '=true'];
    for (const [condition, diff] of [
      ['true', false], ['corp.AI.options.' + TEST_OPTION, true], ['!corp.AI.options.' + TEST_OPTION, true],
    ]) {
      fs.writeFileSync(file, source + '\nLog("replay log retained");\nif (' + condition + ') throw new Error("replay regression diagnostic");\n');
      const result = cli([...args, ...(diff ? ['--diff'] : [])]);
      assert.strictEqual(result.status, 1, result.out.slice(0, 500));
      assert.match(result.out, /replay regression diagnostic/, 'fixture errors remain available');
      assert.ok(result.out.includes(diff ? 'candidate:' : 'game:'), 'game summary remains available');
      if (diff) {
        const summaries = result.out.split('\n').slice(0, 2);
        assert.match(summaries[0], /baseline \(options off\):/);
        const baselineFails = condition.startsWith('!');
        assert.strictEqual(summaries[0].includes('errors:'), baselineFails, 'only the intended baseline fails');
        assert.strictEqual(summaries[1].includes('errors:'), !baselineFails, 'only the intended candidate fails');
      }
      else assert.ok(result.out.split('\n').slice(1).includes('replay log retained'), 'the diagnostic log is printed after the summary');
    }
    const timeout = cli(['replay', '--pairs', 'gateway', '--seeds', '1', '--timeout', '0.001']);
    assert.strictEqual(timeout.status, 1, timeout.out.slice(0, 500));
    assert.match(timeout.out, /no winner \(timeout/);
  });

}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
