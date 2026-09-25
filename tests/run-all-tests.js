#!/usr/bin/env node
'use strict';
// Runs every tests/*.test.js file. Output is shown only for failing files so an
// agent's context stays small; set VERBOSE=1 to stream every file's output.
// A passing file must stay quiet (a short summary at most): per-case output
// belongs behind process.env.VERBOSE, and noisy files fail here.

const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const testsDir = __dirname;
const verbose = !!process.env.VERBOSE;
const QUIET_MAX_LINES = 5;
const QUIET_MAX_BYTES = 600;
const files = fs.readdirSync(testsDir)
  .filter(file => file.endsWith('.test.js'))
  .sort();

const failed = [];
for (const file of files) {
  const result = spawnSync(process.execPath, [path.join(testsDir, file)], {
    stdio: verbose ? 'inherit' : 'pipe',
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  const output = verbose ? '' : (result.stdout || '') + (result.stderr || '');
  if (result.status !== 0) {
    failed.push(file);
    if (!verbose) {
      console.log('--- FAILED ' + file + ' ---');
      process.stdout.write(output);
      console.log();
    }
    continue;
  }
  const lines = output.trim() ? output.trim().split('\n').length : 0;
  if (!verbose && (lines > QUIET_MAX_LINES || output.length > QUIET_MAX_BYTES)) {
    failed.push(file);
    console.log('--- NOISY ' + file + ' ---\n' + file + ' passed but printed ' + lines +
      ' lines (' + output.length + ' bytes). Passing tests may print at most ' + QUIET_MAX_LINES +
      ' lines / ' + QUIET_MAX_BYTES + ' bytes; print per-case output only when process.env.VERBOSE is set.\n');
  }
}

if (failed.length) {
  console.log(failed.length + ' of ' + files.length + ' test files failed: ' + failed.join(', '));
  process.exit(1);
}
console.log(files.length + ' test files passed.');
