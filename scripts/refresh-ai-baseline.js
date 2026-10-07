#!/usr/bin/env node
'use strict';

// After merging an accepted gameplay change: node scripts/refresh-ai-baseline.js
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

function refreshBaseline(root, runBatch = args => {
  const result = spawnSync(process.execPath, args, {cwd: root, stdio: 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error('Benchmark failed; current baseline was preserved.');
}) {
  const bench = path.join(root, 'bench');
  const current = path.join(bench, 'current');
  const archive = path.join(bench, 'archived-current');
  const pending = path.join(bench, 'baseline.json');
  const target = path.join(current, 'baseline.json');
  fs.mkdirSync(current, {recursive: true});
  const lock = path.join(bench, '.baseline-refresh.lock');
  const descriptor = fs.openSync(lock, 'wx');
  try {
    const files = fs.readdirSync(current).filter(file => file.endsWith('.json'));
    if (files.length > 1) throw new Error('Expected at most one report in bench/current/.');
    if (fs.existsSync(pending)) {
      throw new Error('bench/baseline.json already exists; move it aside before retrying.');
    }
    const previous = files.length ? path.join(current, files[0]) : null;
    runBatch(['scripts/ai-batch.js', '--pool',
      'documentation/corp-ai-regression/assets/beginner-pool.json',
      '--seeds', '1-200', '--out', 'bench/baseline.json']);
    const report = JSON.parse(fs.readFileSync(pending, 'utf8'));
    if (report.kind !== 'ai-batch-report' || !Array.isArray(report.games) || report.games.length !== 1000 ||
        !Array.isArray(report.failures) || report.failures.length !== 0) {
      throw new Error('Expected 1,000 games and zero failures; current baseline was preserved.');
    }
    if (report.dirty !== false) {
      throw new Error('Run on a clean, committed build; current baseline was preserved.');
    }
    let archived;
    if (previous) {
      const old = JSON.parse(fs.readFileSync(previous, 'utf8'));
      const label = String(old.sha || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      fs.mkdirSync(archive, {recursive: true});
      archived = path.join(archive, `${timestamp}-${label}.json`);
      // Exclusive copy protects earlier evidence even if a filename collides.
      fs.copyFileSync(previous, archived, fs.constants.COPYFILE_EXCL);
    }
    // On the same filesystem rename replaces baseline.json atomically.
    fs.renameSync(pending, target);
    if (previous && previous !== target) fs.unlinkSync(previous);
    return {current: target, archived};
  } finally {
    fs.closeSync(descriptor);
    fs.unlinkSync(lock);
  }
}

if (require.main === module) {
  try {
    if (process.argv.length !== 2) throw new Error('Usage: node scripts/refresh-ai-baseline.js');
    const root = path.resolve(__dirname, '..');
    const result = refreshBaseline(root);
    if (result.archived) console.log(`Archived: ${path.relative(root, result.archived)}`);
    console.log(`Current baseline: ${path.relative(root, result.current)}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {refreshBaseline};
