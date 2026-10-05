// Run with: node tests/verify-on-stop.test.js
// Exercise the real Stop hook across repeated invocations without recursively
// running the suite. Only its filesystem, git status and suite process are fake.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../scripts/agent-hooks/verify-on-stop.js'), 'utf8');
const counts = new Map();
const exit = {};
let relevant = true;
let suitePasses = false;
let suiteRuns = 0;

function invoke(session = 'review-regression') {
  let output = '';
  const context = {
    __dirname: path.join(__dirname, '../scripts/agent-hooks'),
    process: {
      execPath: process.execPath,
      exit(code) { assert.strictEqual(code, 0); throw exit; },
      stdout: {write(text) { output += text; }},
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
        spawnSync(command) {
          if (command === 'git') return {status: 0, stdout: relevant ? ' M ai_corp.js\n' : ''};
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
console.log('Stop hook: repeated failures stay capped and successful checks reset the limit.');
