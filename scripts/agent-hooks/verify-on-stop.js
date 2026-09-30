#!/usr/bin/env node
'use strict';
// Agent Stop hook (wired up in .codex/hooks.json). When the working tree has
// code or test changes, run the full regression suite and refuse to let the
// agent end its turn while it fails. The agent is sent back at most
// MAX_BLOCKS times per session before it may stop and report the failure.
//
// Manual check: echo '{}' | node scripts/agent-hooks/verify-on-stop.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const MAX_BLOCKS = 2;
const root = path.resolve(__dirname, '..', '..');

let input = {};
try { input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch (e) { /* no payload */ }

const counterFile = path.join(os.tmpdir(),
  'chiriboga-stop-hook-' + String(input.session_id || 'manual').replace(/[^\w-]/g, '') + '.count');
const readCount = () => { try { return Number(fs.readFileSync(counterFile, 'utf8')) || 0; } catch (e) { return 0; } };
const resetCount = () => { try { fs.unlinkSync(counterFile); } catch (e) { /* none */ } };

const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=all'], {cwd: root, encoding: 'utf8'});
if (status.status !== 0) process.exit(0);
const changed = status.stdout.split('\n').filter(Boolean)
  .map(line => line.slice(3).replace(/^.* -> /, '').replace(/^"|"$/g, ''));
const relevant = changed.filter(file =>
  file.endsWith('.js') || file.startsWith('tests/') || file === 'documentation/ai.md');
if (!relevant.length) { resetCount(); process.exit(0); }

const run = spawnSync(process.execPath, [path.join(root, 'tests', 'run-all-tests.js')],
  {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
if (run.status === 0) { resetCount(); process.exit(0); }

const blocks = readCount();
if (blocks >= MAX_BLOCKS) { resetCount(); process.exit(0); }
fs.writeFileSync(counterFile, String(blocks + 1));

const tail = ((run.stdout || '') + (run.stderr || '')).trim().split('\n').slice(-60).join('\n');
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: 'node tests/run-all-tests.js fails with the current working-tree changes (' +
    relevant.length + ' changed code/test files). Fix the failure before finishing. ' +
    'If it is pre-existing and unrelated to your change, say so explicitly in your final ' +
    'message with the failing test name instead of claiming success.\n\n' + tail,
}));
