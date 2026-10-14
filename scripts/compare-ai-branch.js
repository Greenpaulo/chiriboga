#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {benchmarkFormat, benchmarkBaselines, parseFormat} = require('./ai-benchmark-format');

function compareBranch(root, runBatch = args => {
  const result = spawnSync(process.execPath, args, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ai-batch failed (${result.signal || result.status}).`);
}, format = 'beginner') {
  const {pool, bench} = benchmarkFormat(format);
  const git = spawnSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
    cwd: root, encoding: 'utf8',
  });
  if (git.error) throw git.error;
  if (git.status !== 0) throw new Error('Check out a named branch before running the benchmark (HEAD may be detached).');
  const branch = git.stdout.trim();
  const output = `${bench}/${branch}.json`;
  const baseline = `${bench}/current/baseline.json`;
  const protectedBaseline = benchmarkBaselines().find(candidate =>
    path.resolve(root, output) === path.resolve(root, candidate));
  if (protectedBaseline) {
    throw new Error('Branch output would overwrite ' + protectedBaseline + '; use a different branch name.');
  }
  if (!fs.existsSync(path.join(root, baseline))) {
    const flag = format === 'beginner' ? '' : ` --format ${format}`;
    throw new Error(`Missing ${baseline}. Run node scripts/refresh-ai-baseline.js${flag} on the target main build first, then return to this branch.`);
  }
  console.log(`Benchmarking ${branch}: ${output}`);
  runBatch(['scripts/ai-batch.js', '--pool',
    pool,
    '--seeds', '1-200', '--out', output]);
  runBatch(['scripts/ai-batch.js', '--compare', baseline, output]);
  return output;
}

if (require.main === module) {
  try {
    const format = parseFormat(process.argv.slice(2), 'compare-ai-branch.js');
    compareBranch(path.resolve(__dirname, '..'), undefined, format);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {compareBranch};
