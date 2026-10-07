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

function invoke(session = 'review-regression', runtimeMode) {
  let output = '';
  const context = {
    __dirname: path.join(__dirname, '../scripts/agent-hooks'),
    process: {
      execPath: process.execPath,
      versions: runtimeMode ? {node: '8.17.0'} : undefined,
      env: runtimeMode === 'retry' ? {CHIRIBOGA_HOOK_RUNTIME_RETRY: '1'} : {},
      exit(code) { assert.strictEqual(code, 0); throw exit; },
      stdout: {write(text) { output += text; }},
      stderr: {write(text) { assert.fail('unexpected stderr: ' + text); }},
    },
    require(name) {
      if (name === 'path') return path;
      if (name === 'os') return {tmpdir: () => '/virtual-temp'};
      if (name === 'fs') return {
        readFileSync(file) {
          if (file === 0) return JSON.stringify({session_id: session});
          if (!counts.has(file)) throw new Error('missing counter');
          return counts.get(file);
        },
        writeFileSync(file, value) { counts.set(file, value); },
        unlinkSync(file) { counts.delete(file); },
      };
      if (name === 'child_process') return {
        spawnSync(command, args, options) {
          if (command === '/bin/zsh') {
            assert.deepStrictEqual(Array.from(args), ['-lc', 'command -v node']);
            return {status: 0, stdout: 'shell startup message\n/modern-node\n'};
          }
          if (command === '/modern-node') {
            assert.deepStrictEqual(Array.from(args), [path.join(hookRoot, 'scripts/agent-hooks/verify-on-stop.js')]);
            assert.strictEqual(JSON.parse(options.input).session_id, session);
            assert.strictEqual(options.env.CHIRIBOGA_HOOK_RUNTIME_RETRY, '1');
            return {status: 0, stdout: JSON.stringify({decision: 'block', reason: 'forwarded'})};
          }
          if (command === 'git') return {status: 0, stdout: relevant ? ' M ai_corp.js\n' : ''};
          assert.strictEqual(command, process.execPath, 'run the suite with Node');
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
  try { vm.runInNewContext(source, context); }
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
assert.strictEqual(invoke('old-runtime', 'old').reason, 'forwarded',
  'an inherited old runtime forwards the newer runtime result and session input');
assert.match(invoke('old-runtime', 'retry').reason, /still older than Node 18/,
  'an old login-shell runtime cannot cause an infinite retry');
console.log('Stop hook: repeated failures stay capped and successful checks reset the limit.');
