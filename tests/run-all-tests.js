#!/usr/bin/env node
'use strict';
// Each file runs in its own process. Passing files stay quiet; VERBOSE streams
// their output. Default to two workers to bound CPU/memory use during ticket work.
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {performance} = require('perf_hooks');

const testsDir = __dirname;
const verbose = !!process.env.VERBOSE;
const QUIET_MAX_LINES = 5;
const QUIET_MAX_BYTES = 600;
const MAX_OUTPUT_BYTES = 64 * 1024 * 1024;

// This test creates transient files in sets/ and documentation/. Other tests
// enumerate those directories, so it must finish before any workers start.
const exclusiveFiles = new Set(['agent-scripts.test.js']);
const args = process.argv.slice(2);
let tier = 'full', jobs = 2, timingsFile, diagnose = false;
let selectedTier;
function selectTier(value) {
  if (selectedTier && selectedTier !== value) {
    console.error('Choose one suite tier: --fast or --integration');
    process.exit(2);
  }
  tier = selectedTier = value;
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--fast' || args[i] === '--unit-only') selectTier('fast');
  else if (args[i] === '--diagnose') diagnose = true;
  else if (args[i] === '--integration') selectTier('integration');
  else if (args[i] === '--jobs' && /^[1-9]\d*$/.test(args[i + 1] || '')) jobs = Number(args[++i]);
  else if (args[i] === '--timings' && args[i + 1] && !args[i + 1].startsWith('--')) timingsFile = args[++i];
  else {
    console.error('Usage: node tests/run-all-tests.js [--fast | --integration | --unit-only] [--jobs N] [--timings file.json] [--diagnose]');
    process.exit(2);
  }
}
const discover = dir => fs.existsSync(dir) ? fs.readdirSync(dir)
  .filter(file => file.endsWith('.test.js')).sort() : [];
const fastFiles = discover(testsDir);
const integrationFiles = discover(path.join(testsDir, 'integration'))
  .map(file => 'integration/' + file);
const files = tier === 'fast' ? fastFiles : tier === 'integration' ? integrationFiles
  : [...fastFiles, ...integrationFiles];
const failed = [];
const timings = [];
const started = performance.now();

function run(file) {
  return new Promise(resolve => {
    const start = performance.now();
    const child = spawn(process.execPath, [path.join(testsDir, file)], {
      stdio: verbose ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });
    const chunks = [];
    let bytes = 0, error;
    function collect(chunk) {
      bytes += chunk.length;
      if (bytes <= MAX_OUTPUT_BYTES) chunks.push(chunk);
      else { error = 'Output exceeded 64 MiB'; child.kill(); }
    }
    if (!verbose) { child.stdout.on('data', collect); child.stderr.on('data', collect); }
    child.on('error', err => { error = err.message; });
    child.on('close', (status, signal) => {
      const output = Buffer.concat(chunks).toString('utf8');
      const lines = output.trim() ? output.trim().split('\n').length : 0;
      const noisy = !verbose && (lines > QUIET_MAX_LINES || bytes > QUIET_MAX_BYTES);
      const passed = status === 0 && !error && !noisy;
      timings.push({file, ms: Math.round(performance.now() - start), status, signal, passed});
      if (!passed) {
        failed.push(file);
        console.log('--- ' + (noisy && status === 0 && !error ? 'NOISY ' : 'FAILED ') + file + ' ---');
        if (error) console.log(error);
        if (signal) console.log('Terminated by ' + signal);
        if (noisy) console.log('Passing tests may print at most ' + QUIET_MAX_LINES + ' lines / ' + QUIET_MAX_BYTES + ' bytes; use VERBOSE for per-case output.');
        process.stdout.write(output);
        console.log();
      }
      resolve();
    });
  });
}

(async () => {
  for (const file of files.filter(file => exclusiveFiles.has(file))) await run(file);
  const queue = files.filter(file => !exclusiveFiles.has(file));
  await Promise.all(Array.from({length: Math.min(jobs, queue.length)}, async () => {
    while (queue.length) await run(queue.shift());
  }));
  const wallMs = Math.round(performance.now() - started);
  timings.sort((a, b) => b.ms - a.ms || a.file.localeCompare(b.file));
  if (timingsFile) fs.writeFileSync(timingsFile, JSON.stringify({tier, jobs, wallMs, tests: timings}, null, 2) + '\n');
  if (failed.length) console.log(failed.length + ' of ' + files.length + ' test files failed: ' + failed.join(', '));
  else console.log(files.length + ' ' + tier + ' test files passed.');
  if (diagnose) {
    console.log('Wall time: ' + (wallMs / 1000).toFixed(2) + 's (' + jobs + ' workers). Slowest files:');
    for (const row of timings.slice(0, 10)) console.log('  ' + (row.ms / 1000).toFixed(2) + 's  ' + row.file);
  }
  process.exitCode = failed.length ? 1 : 0;
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
