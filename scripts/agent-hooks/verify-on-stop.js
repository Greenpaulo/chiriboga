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

// A running Codex session may retain the old hook command and its inherited
// Node PATH. Resolve the login-shell runtime before using modern test APIs.
if (process.versions && Number(process.versions.node.split('.')[0]) < 18) {
  if (process.env.CHIRIBOGA_HOOK_RUNTIME_RETRY) {
    process.stdout.write(JSON.stringify({decision: 'block', reason: 'The login-shell Node runtime is still older than Node 18.'}));
    process.exit(0);
  }
  const lookup = spawnSync('/bin/zsh', ['-lc', 'command -v node'], {cwd: root, encoding: 'utf8'});
  const executable = (lookup.stdout || '').trim().split('\n').pop();
  if (lookup.status !== 0 || !executable || executable === process.execPath) {
    process.stdout.write(JSON.stringify({decision: 'block',
      reason: 'The Stop hook requires Node 18 or newer. Its inherited runtime is ' +
        process.versions.node + '; the login shell did not provide a newer runtime.'}));
    process.exit(0);
  }
  const rerun = spawnSync(executable, [path.join(root, 'scripts/agent-hooks/verify-on-stop.js')],
    {cwd: root, encoding: 'utf8', input: JSON.stringify(input), maxBuffer: 64 * 1024 * 1024,
      env: Object.assign({}, process.env, {CHIRIBOGA_HOOK_RUNTIME_RETRY: '1'})});
  process.stdout.write(rerun.stdout || '');
  if (rerun.stderr) process.stderr.write(rerun.stderr);
  process.exit(rerun.status === null ? 1 : rerun.status);
}

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

// Hook shells may inherit an old global Node even when interactive terminals
// use nvm. Resolve the repository pin directly, without changing that shell.
const nodeVersion = fs.readFileSync(path.join(root, '.nvmrc'), 'utf8').trim().replace(/^v/, '');
const nvmRoot = process.env.NVM_DIR || path.join(os.homedir(), '.nvm');
const pinnedNode = path.join(nvmRoot, 'versions', 'node', 'v' + nodeVersion, 'bin', 'node');
let suiteNode = process.execPath;
if (fs.existsSync(pinnedNode)) suiteNode = pinnedNode;
else if (Number(process.versions.node.split('.')[0]) < Number(nodeVersion.split('.')[0])) {
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: 'Stop-hook runtime mismatch: Node ' + process.versions.node +
      " cannot run this repository's regression suite. Install the pinned runtime with " +
      '`nvm install ' + nodeVersion + '` or put Node ' + nodeVersion.split('.')[0] +
      '+ on the hook PATH. No tests were run.',
  }));
  process.exit(0);
}
const suiteEnv = Object.assign({}, process.env, {
  PATH: path.dirname(suiteNode) + path.delimiter + (process.env.PATH || ''),
});

const run = spawnSync(suiteNode, [path.join(root, 'tests', 'run-all-tests.js')],
  {cwd: root, env: suiteEnv, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
if (run.status === 0) { resetCount(); process.exit(0); }

const blocks = readCount();
if (blocks >= MAX_BLOCKS) process.exit(0);
fs.writeFileSync(counterFile, String(blocks + 1));

const tail = ((run.stdout || '') + (run.stderr || '')).trim().split('\n').slice(-60).join('\n');
process.stdout.write(JSON.stringify({
  decision: 'block',
  reason: 'Regression suite (Node ' + (suiteNode === pinnedNode ? nodeVersion : process.versions.node) + ') fails with the current working-tree changes (' +
    relevant.length + ' changed code/test files). Fix the failure before finishing. ' +
    'If it is pre-existing and unrelated to your change, say so explicitly in your final ' +
    'message with the failing test name instead of claiming success.\n\n' + tail,
}));
