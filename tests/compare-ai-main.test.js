'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {compareMain, parseArgs} = require('../scripts/compare-ai-main');
const {benchmarkFormat} = require('../scripts/ai-benchmark-format');
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
    for (const format of ['beginner', 'startup', 'startup2']) {
      const {pool} = benchmarkFormat(format);
      fs.mkdirSync(path.dirname(path.join(root, pool)), {recursive: true});
      fs.writeFileSync(path.join(root, pool), JSON.stringify({pairs: [{corp: 'corp.js', runner: 'runner.js'}]}));
    }
    fs.mkdirSync(path.join(root, 'precons'));
    for (const file of ['corp.js', 'runner.js']) fs.writeFileSync(path.join(root, 'precons', file), 'deck');
    fs.writeFileSync(path.join(root, 'engine.js'), 'main');
    git(['add', '.']);
    git(['-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '--quiet', '-m', 'fixture']);
    git(['switch', '-c', 'candidate']);
    fs.writeFileSync(path.join(root, 'engine.js'), 'uncommitted candidate');
    fn(root, git);
    assert.strictEqual(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), 'uncommitted candidate');
    assert.strictEqual(git(['worktree', 'list', '--porcelain']).split('\n').filter(x => x.startsWith('worktree ')).length, 1);
    cases++;
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
}
try {
  for (const format of ['beginner', 'startup', 'startup2']) fixture((root, git) => {
    if (format === 'beginner') git(['switch', 'main']); // main can also be the candidate checkout
    const calls = [];
    const result = compareMain(root, {format, jobs: '2', seeds: '1-3'}, (cwd, args) => {
      calls.push({cwd, args});
      if (calls.length === 1) assert.strictEqual(fs.readFileSync(path.join(cwd, 'engine.js'), 'utf8'), 'main');
      if (!args.includes('--compare')) fs.writeFileSync(args[args.length - 1], '{}');
    });
    assert.strictEqual(calls.length, 3);
    assert.strictEqual(calls[0].args[2], benchmarkFormat(format).pool);
    assert.strictEqual(path.relative(root, result.reports).split(path.sep).slice(0, -1).join('/'),
      benchmarkFormat(format).bench + '/paired-main');
    assert.notStrictEqual(calls[0].cwd, root);
    assert.strictEqual(calls[1].cwd, root);
    assert.deepStrictEqual(calls[0].args.slice(0, -1), calls[1].args.slice(0, -1));
    assert.deepStrictEqual(calls[2], {cwd: root, args: ['scripts/ai-batch.js', '--compare', result.mainReport, result.candidateReport]});
    assert(fs.existsSync(result.mainReport) && fs.existsSync(result.candidateReport));
    assert(!fs.existsSync(calls[0].cwd));
    assert.strictEqual(git(['branch', '--show-current']), format === 'beginner' ? 'main' : 'candidate');
  });
  for (const failAt of [1, 2]) fixture(root => {
    let count = 0;
    assert.throws(() => compareMain(root, {}, () => {
      if (++count === failAt) throw Error('benchmark failed');
    }), /benchmark failed/);
    assert.strictEqual(count, failAt, 'failure stops later runs and comparison');
  });
  fixture(root => {
    const pool = benchmarkFormat('startup2').pool;
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
    compareMain(root, {format: 'startup2'}, (cwd, args) => {
      if (!args.includes('--compare')) assert(fs.readFileSync(path.join(cwd, pool)).equals(newPool));
    });
  });
  fixture(root => {
    fs.writeFileSync(path.join(root, 'precons/corp.js'), 'different deck');
    assert.throws(() => compareMain(root, {}, () => assert.fail('must not run')), /inputs differ/);
  });
  assert.deepStrictEqual(parseArgs(['--format', 'startup', '--jobs', '4']), {format: 'startup', jobs: '4'});
  assert.deepStrictEqual(parseArgs(['--format', 'startup2']), {format: 'startup2'});
  for (const args of [['--format', 'unknown'], ['--jobs', '0'], ['--seeds', '3-1'], ['--other']])
    assert.throws(() => parseArgs(args));
} finally { console.log = log; }
console.log(`${cases} fresh-main workflow cases and CLI validation passed.`);
