'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {compareMain, parseArgs} = require('../scripts/compare-ai-main');
const poolFiles = {
  'beginner-v1': 'deck-pool-beginner-pool.json',
  'core-v1': 'deck-pool.json',
  'startup-v1': 'deck-pool-startup-format.json',
  'custom-v9': 'arbitrary-name.json',
};
const poolPath = id => 'tests/fixtures/ai-batch/' + poolFiles[id];
let cases = 0;
const log = console.log;
console.log = () => {};
function fixture(fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-main-test-'));
  const git = args => {
    const r = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
    assert.strictEqual(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  try {
    git(['init', '--quiet', '--initial-branch=main']);
    for (const id of Object.keys(poolFiles)) {
      const pool = poolPath(id);
      fs.mkdirSync(path.dirname(path.join(root, pool)), {recursive: true});
      fs.writeFileSync(path.join(root, pool), JSON.stringify({id, pairs: [{corp: 'corp.js', runner: 'runner.js'}]}));
    }
    fs.mkdirSync(path.join(root, 'precons'));
    for (const file of ['corp.js', 'runner.js']) fs.writeFileSync(path.join(root, 'precons', file), 'deck');
    fs.writeFileSync(path.join(root, 'engine.js'), 'main');
    fs.mkdirSync(path.join(root, 'scripts/ai-batch'), {recursive: true});
    for (const file of ['scripts/ai-batch.js', 'scripts/ai-batch/headless.js'])
      fs.writeFileSync(path.join(root, file), 'old harness');
    git(['add', '.']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '--quiet', '-m', 'fixture']);
    git(['switch', '-c', 'candidate']);
    fs.writeFileSync(path.join(root, 'engine.js'), 'uncommitted candidate');
    for (const file of ['scripts/ai-batch.js', 'scripts/ai-batch/headless.js'])
      fs.writeFileSync(path.join(root, file), 'current diagnostic harness');
    fn(root, git);
    assert.strictEqual(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), 'uncommitted candidate');
    assert.strictEqual(git(['worktree', 'list', '--porcelain']).split('\n').filter(x => x.startsWith('worktree ')).length, 1);
    cases++;
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
}
try {
  for (const id of Object.keys(poolFiles)) fixture((root, git) => {
    if (id === 'beginner-v1') git(['switch', 'main']); // main can also be the candidate checkout
    const calls = [];
    const result = compareMain(root, {pool: id, jobs: '2', seeds: '1-3'}, (cwd, args) => {
      calls.push({cwd, args});
      if (calls.length === 1) assert.strictEqual(fs.readFileSync(path.join(cwd, 'engine.js'), 'utf8'), 'main');
      if (!args.includes('--compare')) {
        for (const file of ['scripts/ai-batch.js', 'scripts/ai-batch/headless.js'])
          assert.strictEqual(fs.readFileSync(path.join(cwd, file), 'utf8'), 'current diagnostic harness');
        assert.strictEqual(args[args.indexOf('--timeout') + 1], '60');
      }
      if (!args.includes('--compare')) fs.writeFileSync(args[args.length - 1], '{}');
    });
    assert.strictEqual(calls.length, 3);
    assert.strictEqual(calls[0].args[2], poolPath(id));
    assert.strictEqual(path.relative(root, result.reports).split(path.sep).slice(0, -1).join('/'),
      'bench/pools/' + id + '/paired-main');
    assert.notStrictEqual(calls[0].cwd, root);
    assert.strictEqual(calls[1].cwd, root);
    assert.deepStrictEqual(calls[0].args.slice(0, -1), calls[1].args.slice(0, -1));
    assert.deepStrictEqual(calls[2], {cwd: root, args: ['scripts/ai-batch.js', '--compare', result.mainReport, result.candidateReport]});
    assert(fs.existsSync(result.mainReport) && fs.existsSync(result.candidateReport));
    assert(!fs.existsSync(calls[0].cwd));
    assert.strictEqual(git(['branch', '--show-current']), id === 'beginner-v1' ? 'main' : 'candidate');
  });
  fixture(root => {
    const calls = [];
    assert.throws(() => compareMain(root, {timeout: '5'}, (cwd, args) => {
      calls.push(args);
      assert.strictEqual(args[args.indexOf('--timeout') + 1], '5');
      return calls.length === 1 ? 1 : 0;
    }), /Games failed; inspect failures and diagnostic tails/);
    assert.strictEqual(calls.length, 2, 'both reports are collected before skipping comparison');
  });
  fixture(root => {
    let calls = 0;
    assert.throws(() => compareMain(root, {}, () => ++calls === 3 ? 1 : 0),
      /Comparison failed; reports retained/);
    assert.strictEqual(calls, 3, 'comparison failure is reported after both game runs');
  });
  for (const failAt of [1, 2]) fixture(root => {
    let count = 0;
    assert.throws(() => compareMain(root, {}, () => {
      if (++count === failAt) throw Error('benchmark failed');
    }), /benchmark failed/);
    assert.strictEqual(count, failAt, 'failure stops later runs and comparison');
  });
  fixture(root => {
    const pool = poolPath('custom-v9');
    // Simulate a new, uncommitted pool that does not exist on main.
    const newPool = fs.readFileSync(path.join(root, pool));
    const removed = spawnSync('git', ['rm', pool], {cwd: root, encoding: 'utf8'});
    assert.strictEqual(removed.status, 0, removed.stderr);
    const committed = spawnSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.test',
      'commit', '--quiet', '-m', 'remove pool'], {cwd: root, encoding: 'utf8'});
    assert.strictEqual(committed.status, 0, committed.stderr);
    const updated = spawnSync('git', ['branch', '-f', 'main', 'HEAD'], {cwd: root, encoding: 'utf8'});
    assert.strictEqual(updated.status, 0, updated.stderr);
    fs.writeFileSync(path.join(root, pool), newPool);
    compareMain(root, {pool: 'custom-v9'}, (cwd, args) => {
      if (!args.includes('--compare')) assert(fs.readFileSync(path.join(cwd, pool)).equals(newPool));
    });
  });
  fixture(root => {
    fs.writeFileSync(path.join(root, 'precons/corp.js'), 'different deck');
    assert.throws(() => compareMain(root, {}, () => assert.fail('must not run')), /inputs differ/);
  });
  assert.deepStrictEqual(parseArgs([]), {pool: 'beginner-v1'});
  assert.deepStrictEqual(parseArgs(['--pool', 'startup-v1', '--jobs', '4']), {pool: 'startup-v1', jobs: '4'});
  for (const file of fs.readdirSync(path.join(__dirname, 'fixtures/ai-batch'))) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ai-batch', file), 'utf8'));
    if (data.id && Array.isArray(data.pairs))
      assert.deepStrictEqual(parseArgs(['--pool', data.id]), {pool: data.id});
  }
  fixture(root => {
    assert.deepStrictEqual(parseArgs(['--pool', 'custom-v9'], root), {pool: 'custom-v9'});
    fs.writeFileSync(path.join(root, 'tests/fixtures/ai-batch/duplicate.json'),
      fs.readFileSync(path.join(root, poolPath('beginner-v1'))));
    assert.throws(() => compareMain(root, {}, () => assert.fail('must not run')), /Duplicate pool ID/);
  });
  for (const args of [['--pool', 'unknown'], ['--format', 'startup'], ['--pool'],
    ['--jobs', '0'], ['--seeds', '3-1'], ['--timeout', '0'], ['--timeout', '-1'],
    ['--timeout', 'NaN'], ['--timeout', 'Infinity'], ['--timeout', '2147483'], ['--other']])
    assert.throws(() => parseArgs(args));
} finally { console.log = log; }
console.log(`${cases} fresh-main workflow cases and CLI validation passed.`);
