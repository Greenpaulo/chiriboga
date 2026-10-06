// Run with: node tests/verify-on-stop.test.js
// Exercise the real Stop hook across repeated invocations without recursively
// running the suite. Only its filesystem, git status and suite process are fake.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../scripts/agent-hooks/verify-on-stop.js'), 'utf8');
const hookRoot = path.resolve(__dirname, '..');
const counts = new Map();
const exit = {};
let relevant = true;
let suitePasses = false;
let suiteRuns = 0;

function invoke(session = 'review-regression', runtime = {}) {
  const installed = runtime.installed !== false;
  const version = runtime.version || '20.19.0';
  const pinnedNode = path.join('/virtual-nvm', 'versions', 'node', 'v20.19.0', 'bin', 'node');
  let output = '';
  const context = {
    __dirname: path.join(__dirname, '../scripts/agent-hooks'),
    process: {
      execPath: process.execPath,
      versions: {node: version},
      env: {NVM_DIR: '/virtual-nvm', PATH: '/old-node/bin'},
      exit(code) { assert.strictEqual(code, 0); throw exit; },
      stdout: {write(text) { output += text; }},
    },
    require(name) {
      if (name === 'path') return path;
      if (name === 'os') return {tmpdir: () => '/virtual-temp', homedir: () => '/virtual-home'};
      if (name === 'fs') return {
        readFileSync(file) {
          if (file === path.join(hookRoot, '.nvmrc')) return '20.19.0\n';
          if (file === 0) return JSON.stringify({session_id: session});
          if (!counts.has(file)) throw new Error('missing counter');
          return counts.get(file);
        },
        existsSync(file) { assert.strictEqual(file, pinnedNode); return installed; },
        writeFileSync(file, value) { counts.set(file, value); },
        unlinkSync(file) { counts.delete(file); },
      };
      if (name === 'child_process') return {
        spawnSync(command, args, options) {
          if (command === 'git') return {status: 0, stdout: relevant ? ' M ai_corp.js\n' : ''};
          assert.strictEqual(command, installed ? pinnedNode : process.execPath, 'use the pinned Node when installed');
          assert.strictEqual(options.env.PATH.split(path.delimiter)[0], path.dirname(command), 'child scripts inherit the same Node');
          assert.deepStrictEqual(Array.from(args), [path.join(hookRoot, 'tests/run-all-tests.js')],
            'run the complete regression suite');
          assert.strictEqual(options.cwd, hookRoot, 'run from the repository root');
          suiteRuns++;
          return {status: suitePasses ? 0 : 1, stdout: 'suite result', stderr: ''};
        },
      };
      throw new Error('unexpected require: ' + name);
    },
  };
  try { vm.runInNewContext(source.replace(/^#![^\n]*\n/, ''), context); }
  catch (error) { if (error !== exit) throw error; }
  return output ? JSON.parse(output) : null;
}

assert.strictEqual(invoke().decision, 'block');
assert.strictEqual(invoke().decision, 'block');
for (let attempt = 0; attempt < 4; attempt++) {
  assert.strictEqual(invoke(), null, 'a capped session must not start blocking again');
  assert.strictEqual([...counts.values()][0], '2', 'retain the capped counter');
}
assert.strictEqual(suiteRuns, 6, 'still verify changes on attempts past the block limit');
assert.strictEqual(invoke('another-session').decision, 'block', 'session limits are independent');
suitePasses = true;
assert.strictEqual(invoke(), null);
suitePasses = false;
assert.strictEqual(invoke().decision, 'block', 'a passing suite resets the session counter');
relevant = false;
const runsBefore = suiteRuns;
assert.strictEqual(invoke(), null);
assert.strictEqual(suiteRuns, runsBefore, 'skip the suite when relevant changes disappear');
relevant = true;
assert.strictEqual(invoke().decision, 'block', 'no relevant changes resets the session counter');
suitePasses = true;
assert.strictEqual(invoke('old-shell', {version: '8.17.0'}), null,
  'an old hook shell runs the complete suite under the installed pinned Node');
assert.strictEqual(invoke('modern-without-nvm', {installed: false}), null,
  'a supported current runtime works without nvm');
const beforeMissingRuntime = suiteRuns;
const mismatch = invoke('old-without-nvm', {version: '8.17.0', installed: false});
assert.strictEqual(mismatch.decision, 'block');
assert(mismatch.reason.includes('runtime mismatch'));
assert(mismatch.reason.includes('nvm install 20.19.0'));
assert.strictEqual(suiteRuns, beforeMissingRuntime, 'never misreport old-runtime errors as failing regressions');
console.log('Stop hook: repeated failures stay capped and successful checks reset the limit.');
