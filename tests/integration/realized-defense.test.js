'use strict';
const run = require('../_realized-defense-test-support');
run(async ({
  assert, fs, path, spawnSync, playGame, collector, batchMetrics, batch, check, cohort, report,
  clone, tmp
}) => {
  await check('--compare reconstructs all four pooled metrics', () => {
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
  });

  await check('real-engine gate rejects insufficient pooled coverage', () => {
    const guardArgs = Object.keys(collector.directions).flatMap(metric => ['--guard', `${metric}=0.01`]);
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
    for (const mode of ['off', 'on', 'throw', 'sinkThrow', 'sinkNull', 'sinkUndefined', 'sinkUnsafe']) {
      const events = [];
      const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner,
        setFiles, timeoutMs: 120000, observe: true, telemetry: true, setupFile: setup,
        realizedDefenseSnapshot: mode !== 'off', defenseObserver: mode, onEvent: event => {
          events.push(event);
          if (mode === 'sinkThrow' && event.type === 'realizedDefenseSnapshot') throw Error('snapshot sink failed');
          if (mode.startsWith('sink') && mode !== 'sinkThrow' &&
              ['realizedDefenseSnapshot', 'realizedDefenseError'].includes(event.type)) {
            if (mode === 'sinkNull') throw null;
            if (mode === 'sinkUndefined') throw undefined;
            throw {get message() { throw Error('unsafe error getter'); }};
          }
        }});
      assert.ok(game.winner); assert.deepStrictEqual(game.errors, []);
      if (mode === 'on') assert.ok(events.some(event => event.type === 'realizedDefenseSnapshot'));
      if (mode === 'throw' || mode.startsWith('sink')) {
        const reason = {sinkNull: 'null', sinkUndefined: 'undefined', sinkUnsafe: 'Unknown realized observer failure'}[mode];
        assert.ok(game.defenseErrors.length);
        if (reason) assert.ok(game.defenseErrors.includes(reason));
        assert.ok(events.some(event => event.type === 'realizedDefenseError'));
      }
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
}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
