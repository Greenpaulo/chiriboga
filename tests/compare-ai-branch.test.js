'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {compareBranch} = require('../scripts/compare-ai-branch');

let cases = 0;
function test(name, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-branch-'));
  try {
    const git = spawnSync('git', ['init', '--quiet', root], {encoding: 'utf8'});
    assert.strictEqual(git.status, 0, git.stderr);
    fs.writeFileSync(path.join(root, '.git/HEAD'), 'ref: refs/heads/pr/fix-11\n');
    fs.mkdirSync(path.join(root, 'bench/current'), {recursive: true});
    fs.writeFileSync(path.join(root, 'bench/current/baseline.json'), '{}');
    fn(root);
    cases++;
    if (process.env.VERBOSE) console.log(name);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
}

test('benchmarks the branch then compares against current baseline', root => {
  const calls = [];
  assert.strictEqual(compareBranch(root, args => calls.push(args)), 'bench/pr/fix-11.json');
  assert.deepStrictEqual(calls, [
    ['scripts/ai-batch.js', '--pool', 'documentation/corp-ai-regression/assets/beginner-pool.json',
      '--seeds', '1-200', '--out', 'bench/pr/fix-11.json'],
    ['scripts/ai-batch.js', '--compare', 'bench/current/baseline.json', 'bench/pr/fix-11.json'],
  ]);
  assert.strictEqual(fs.readFileSync(path.join(root, 'bench/current/baseline.json'), 'utf8'), '{}');
});
test('baseline branch collision stops before publication', root => {
  fs.writeFileSync(path.join(root, '.git/HEAD'), 'ref: refs/heads/current/baseline\n');
  assert.throws(() => compareBranch(root, () => assert.fail('must not run')), /would overwrite.*baseline/);
  assert.strictEqual(fs.readFileSync(path.join(root, 'bench/current/baseline.json'), 'utf8'), '{}');
});
test('missing baseline stops before running games', root => {
  fs.unlinkSync(path.join(root, 'bench/current/baseline.json'));
  assert.throws(() => compareBranch(root, () => assert.fail('must not run')), /Missing.*baseline/);
});
test('detached HEAD stops before running games', root => {
  fs.writeFileSync(path.join(root, '.git/HEAD'), '0123456789012345678901234567890123456789\n');
  assert.throws(() => compareBranch(root, () => assert.fail('must not run')), /named branch/);
});
test('failed benchmark never runs comparison', root => {
  let calls = 0;
  assert.throws(() => compareBranch(root, () => {
    calls++;
    throw new Error('benchmark failed');
  }), /benchmark failed/);
  assert.strictEqual(calls, 1);
});
console.log(`${cases} branch comparison cases passed.`);
