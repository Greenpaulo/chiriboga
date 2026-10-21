#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const {randomUUID} = require('crypto');
const {spawnSync} = require('child_process');
const repositoryRoot = path.resolve(__dirname, '..');

function resolvePool(root, id) {
  const directory = 'tests/fixtures/ai-batch';
  const pools = fs.readdirSync(path.join(root, directory), {withFileTypes: true})
    .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
    .map(entry => {
      const pool = path.join(directory, entry.name);
      const data = JSON.parse(fs.readFileSync(path.join(root, pool), 'utf8'));
      return {pool, id: data.id, pairs: data.pairs};
    })
    .filter(data => typeof data.id === 'string' && Array.isArray(data.pairs));
  const matches = pools.filter(pool => pool.id === id);
  if (!matches.length)
    throw new Error(`Unknown pool ID: ${id}. Choose ${pools.map(pool => pool.id).sort().join(', ')}.`);
  if (matches.length > 1) throw new Error(`Duplicate pool ID: ${id}`);
  return matches[0].pool;
}

function parseArgs(args, root = repositoryRoot) {
  const options = {pool: 'beginner-v1'};
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (!['--pool', '--jobs', '--seeds'].includes(name) || !args[i + 1])
      throw new Error('Usage: node scripts/compare-ai-main.js [--pool ID] [--jobs N] [--seeds FROM-TO]');
    options[name.slice(2)] = args[++i];
  }
  resolvePool(root, options.pool);
  if (options.jobs !== undefined && !/^[1-9]\d*$/.test(options.jobs)) throw new Error('--jobs must be a positive integer');
  if (options.seeds !== undefined && (!/^[1-9]\d*-[1-9]\d*$/.test(options.seeds) ||
      Number(options.seeds.split('-')[0]) > Number(options.seeds.split('-')[1])))
    throw new Error('--seeds must be an ascending positive range, e.g. 1-200');
  return options;
}

function runBatch(cwd, args) {
  const result = spawnSync(process.execPath, args, {cwd, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`ai-batch failed (${result.signal || result.status}); reports retained.`);
}

function compareMain(root, options = {}, batch = runBatch) {
  const id = options.pool || 'beginner-v1';
  const pool = resolvePool(root, id);
  const bench = path.join('bench', 'pools', encodeURIComponent(id).replace(/\./g, '%2E'));
  const jobs = String(options.jobs || Math.max(1, os.cpus().length - 2));
  const seeds = options.seeds || '1-200';
  const git = args => {
    const result = spawnSync('git', args, {cwd: root, encoding: 'utf8'});
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr.trim() || 'git failed');
    return result.stdout.trim();
  };
  const mainSha = git(['rev-parse', '--verify', 'main^{commit}']);
  const reports = path.join(root, bench, 'paired-main', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID());
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'chiriboga-ai-main-'));
  const checkout = path.join(temporary, 'checkout');
  const mainReport = path.join(reports, 'main.json');
  const candidateReport = path.join(reports, 'candidate.json');
  let added = false;
  try {
    git(['worktree', 'add', '--detach', checkout, mainSha]);
    added = true;
    // Comparing different deck pools would confound the code/latency comparison.
    const poolData = JSON.parse(fs.readFileSync(path.join(root, pool), 'utf8'));
    // A newly added pool can exercise main's engine using the same decks.
    if (!fs.existsSync(path.join(checkout, pool))) {
      fs.mkdirSync(path.dirname(path.join(checkout, pool)), {recursive: true});
      fs.copyFileSync(path.join(root, pool), path.join(checkout, pool));
    }
    const inputs = [pool, ...new Set(poolData.pairs.flatMap(pair =>
      [path.join('precons', pair.corp), path.join('precons', pair.runner)]))];
    for (const file of inputs) {
      if (!fs.existsSync(path.join(checkout, file)) ||
          !fs.readFileSync(path.join(root, file)).equals(fs.readFileSync(path.join(checkout, file))))
        throw new Error('Main and candidate benchmark inputs differ: ' + file);
    }
    fs.mkdirSync(reports, {recursive: true});
    const args = ['scripts/ai-batch.js', '--pool', pool, '--seeds', seeds, '--jobs', jobs];
    console.log(`Fresh sequential comparison: main ${mainSha.slice(0, 8)}, then current checkout (including uncommitted changes).`);
    console.log(`Seeds ${seeds}; ${jobs} workers in both runs. Reports: ${reports}`);
    batch(checkout, [...args, '--out', mainReport]);
    batch(root, [...args, '--out', candidateReport]);
    batch(root, ['scripts/ai-batch.js', '--compare', mainReport, candidateReport]);
    return {reports, mainReport, candidateReport};
  } finally {
    if (added) {
      // This checkout is created and owned exclusively by this invocation.
      git(['worktree', 'remove', '--force', checkout]);
    }
    fs.rmSync(temporary, {recursive: true, force: true});
  }
}

if (require.main === module) {
  try { compareMain(path.resolve(__dirname, '..'), parseArgs(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = {compareMain, parseArgs};
