'use strict';
// F10 start-board builder (scripts/start-board.js) and board selection in
// scripts/ai-batch.js (--start-tag, --budget).
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const sb = require('../scripts/start-board');
const batch = require('../scripts/ai-batch');

const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;
let passed = 0;
const failures = [];
async function scenario(name, fn) {
  try { await fn(); passed++; if (verbose) console.log('ok   ' + name); }
  catch (error) { failures.push(name + ': ' + (error.stack || error.message)); }
}

// A small log: one decision snapshot (agenda still in the remote, no hosted
// card) and an end-of-log dump (agenda stolen, Tranquilizer hosted on the HQ
// ICE, a tagged Runner). Cards: Carmen (30015, a Killer) in the rig, Flyswatter
// (35079) on HQ, Project Ingatan (35038), Tranquilizer (30017).
const T = 'cardBackTexturesRunner,glowTextures,strengthTextures', C = 'cardBackTexturesCorp,glowTextures,strengthTextures';
const LOG = [
  'Runner spent one click',
  '### DECISION 1',
  '// IDENTIFIER: Corp 1.1',
  '// OPTIONS: gain, draw',
  '// CHOSEN: draw',
  '// REPLAYABLE: true',
  '// SETUP: attackedServer = corp.HQ',
  `RunnerTestField(30019, [], [], [], [30015], [], ${T});`,
  `CorpTestField(30035, [], [], [35048,35049], [], [], [35079], [[30075,35038]], [], ${C});`,
  '### END DECISION 1',
  `RunnerTestField(30019, [], [], [], [30015], [35038], ${T});`,
  `CorpTestField(30035, [], [], [35048,35049], [], [], [35079], [[30075]], [], ${C});`,
  'corp.HQ.ice[0].hostedCards = [];',
  `InstanceCardsPush(30017,corp.HQ.ice[0].hostedCards,1,${T})[0].host = corp.HQ.ice[0];`,
  'runner.scoreArea[0].AITurnsInstalled=1;',
  'runner.tags=1;',
  '',
  'Version reference: test',
].join('\n') + '\n';

(async () => {
  const dir = fs.mkdtempSync(path.join(root, '.start-board-test-'));
  const log = path.relative(root, path.join(dir, 'log.txt'));
  fs.writeFileSync(path.join(root, log), LOG);
  const tagsOf = text => text.match(/^\/\/ TAGS: (.*)$/m)[1].split(', ').filter(Boolean);
  try {
    await scenario('1. snapshot and dump sources build boards that load; card lists match the source', async () => {
      const snap = await sb.build({log, source: {snapshot: '1'}, edits: []});
      assert.ok(snap.includes('// SOURCE: ' + log + ' snapshot 1'));
      assert.ok(!/attackedServer/.test(snap), 'the snapshot SETUP (a run in progress) is dropped');
      assert.ok(snap.includes(LOG.split('\n')[7]) && snap.includes(LOG.split('\n')[8]), 'snapshot card lists unchanged');
      const dump = await sb.build({log, source: {dump: true}, edits: [{flag: '--unsteal', value: '35038=0'}]});
      assert.ok(dump.includes('[[30075,35038]]') && dump.includes('[30015], [],'), 'the stolen agenda is back in Remote 0');
      assert.ok(!/runner\.scoreArea\[0\]/.test(dump), 'lines about the moved score-area entry are dropped');
      assert.ok(/\[--unsteal 35038=0\]$/m.test(dump));
    });

    await scenario('2. refused edits: rig and hosted cards, missing reason, setup outside credits and clicks', async () => {
      const refuse = (edits, pattern) => assert.rejects(sb.build({log, source: {dump: true}, edits}), pattern);
      await refuse([{flag: '--replace', value: '30015=30016', reason: 'x'}], /Runner's rig/);
      await refuse([{flag: '--replace', value: '30017=30016', reason: 'x'}], /Runner's rig and hosted cards/);
      await refuse([{flag: '--replace', value: '35049=35048'}], /--reason/);
      await refuse([{flag: '--setup', value: 'corp.creditPool=5; runner.tags=0'}], /credits and clicks only/);
      const replaced = await sb.build({log, source: {dump: true},
        edits: [{flag: '--replace', value: '35079=30072', reason: 'test crash'}, {flag: '--setup', value: 'corp.creditPool=5'}]});
      assert.ok(/^\/\/ NOTE: test crash \(installed ICE on HQ\) \[--replace 35079=30072\]$/m.test(replaced), 'replaced ICE is named');
      assert.ok(/^\/\/ SETUP: corp.creditPool=5$/m.test(replaced));
      const cli = spawnSync(process.execPath, ['scripts/start-board.js', log, '--out', 'x'], {cwd: root, encoding: 'utf8'});
      assert.notStrictEqual(cli.status, 0);
      assert.ok(/Choose the source: --snapshot <n> \(this log has 1\) or --dump/.test(cli.stderr), cli.stderr);
    });

    await scenario('3. every committed start board rebuilds exactly from its recorded flags', async () => {
      const files = fs.readdirSync(sb.STARTS_DIR).filter(f => f.endsWith('.txt'));
      assert.ok(files.length > 0);
      for (const f of files) assert.ok(await sb.rebuildMatches(path.join(sb.STARTS_DIR, f)), f + ' differs from its rebuild (edited by hand?)');
    });

    await scenario('4. tags are computed from the loaded board', async () => {
      const snap = tagsOf(await sb.build({log, source: {snapshot: '1'}, edits: []}));
      assert.deepStrictEqual(snap, ['unrezzed-ice', 'breaker-installed', 'agenda-in-remote']);
      const dump = tagsOf(await sb.build({log, source: {dump: true}, edits: []}));
      assert.deepStrictEqual(dump, ['hosted-card-on-ice', 'unrezzed-ice', 'breaker-installed', 'tagged-runner']);
    });

    await scenario('5. --start-tag selects boards with every given tag', async () => {
      const hosted = batch.taggedStarts(['hosted-card-on-ice', 'agenda-in-remote']).map(f => path.basename(f));
      assert.ok(hosted.includes('hosted-chromatophores-on-remote-ice.txt'));
      assert.deepStrictEqual(hosted, hosted.slice().sort());
      assert.throws(() => batch.taggedStarts(['no-such-tag']), /No start board has the tags/);
      const config = batch.buildConfig(batch.parseArgs(['--start-tag', 'hosted-card-on-ice']));
      assert.ok(config.starts.some(s => s.id === 'hosted-chromatophores-on-remote-ice'));
    });

    await scenario('6. --budget fixes the games per half; it is opt-in', async () => {
      const seeds = batch.budgetSeeds({budget: '1400'}, [{}, {}], new Array(7));
      assert.strictEqual(seeds.length, 100);
      assert.strictEqual(seeds[0], '1');
      assert.strictEqual(batch.budgetSeeds({budget: '10'}, [{}], new Array(7)).length, 10, 'at least 10 seeds');
      assert.throws(() => batch.budgetSeeds({budget: '1400', seeds: '1-5'}, [], new Array(7)), /cannot be combined/);
      const plain = batch.buildConfig(batch.parseArgs([]));
      assert.strictEqual(plain.seeds.length, 200);
      assert.strictEqual(plain.budget, null);
    });
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`start-board: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`start-board: ${passed} scenarios passed`);
})();
