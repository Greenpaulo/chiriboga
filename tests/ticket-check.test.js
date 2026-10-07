'use strict';
// Exercise the real check CLI without recursively launching the full suite.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const script = path.join(root, 'scripts/ticket.js');
const source = fs.readFileSync(script, 'utf8');
const ticket = 'documentation/bugs/code-review/review-fixture.md';
const pending = 'tests/pending/review-fixture.test.js';

function check({reproduction = pending, exists = true, option = 'removedOption', code = '', gate} = {}) {
  const files = new Map([
    [path.join(root, ticket), '# Fixture\n\n**Outcome:** not adopted — failed gate\n' +
      '**Reproduction:** `' + reproduction + '`\n\n## Resolution\n\nImplemented from `1fdb396`.\n\n' +
      '**Gate:** ' + (gate || 'failed — `' + option + '` removed.') + '\n'],
    [path.join(root, 'ai_corp.js'), code],
    [path.join(root, 'ai_runner.js'), ''],
  ]);
  if (exists) files.set(path.join(root, reproduction), '// reproduction');
  const output = [];
  let suiteRuns = 0;
  const processStub = {execPath: process.execPath, argv: [process.execPath, script, 'check', ticket], exitCode: 0};
  const moduleStub = {exports: {}};
  function requireStub(name) {
    if (name === 'fs') return {
      existsSync: file => files.has(file),
      readFileSync: file => {
        assert(files.has(file), 'unexpected file read: ' + file);
        return files.get(file);
      },
    };
    if (name === 'child_process') return {spawnSync: (command, args) => {
      if (command === process.execPath) {
        assert.deepStrictEqual(Array.from(args), ['tests/run-all-tests.js']);
        suiteRuns++;
        return {status: 0, stdout: '54 test files passed.\n', stderr: ''};
      }
      assert.strictEqual(command, 'git');
      assert(['cat-file', 'diff', 'ls-files', 'remote', 'rev-parse'].includes(args[0]),
        'unexpected git command: ' + args.join(' '));
      return {status: 0, stdout: '', stderr: ''};
    }};
    if (name === './roadmap.js') return require('../scripts/roadmap.js');
    return require(name);
  }
  requireStub.main = moduleStub;
  vm.runInNewContext(source, {
    require: requireStub, module: moduleStub, __dirname: path.dirname(script),
    process: processStub, console: {log: message => output.push(message)},
  }, {filename: script});
  assert.strictEqual(suiteRuns, 1, 'check still runs the regression suite');
  return {status: processStub.exitCode, output: output.join('\n')};
}

const retained = check();
assert.strictEqual(retained.status, 0, retained.output);
assert.match(retained.output, /PASS.*Not adopted/);
assert.match(retained.output, /PASS.*removedOption has been removed/);

const missing = check({exists: false});
assert.strictEqual(missing.status, 1, missing.output);
assert.match(missing.output, /FAIL.*pending reproduction.*does not exist/);

const green = check({reproduction: 'tests/review-fixture.test.js'});
assert.strictEqual(green.status, 1, green.output);
assert.match(green.output, /FAIL.*not a pending path/);

for (const code of [
  'const options = {removedOption: false};',
  'if (this.options.removedOption) act();',
  'if (this.options["removedOption"]) act();',
  'const {removedOption} = this.options;',
]) {
  const present = check({code});
  assert.strictEqual(present.status, 1, present.output);
  assert.match(present.output, /FAIL.*removedOption is still in the code/);
}
const unrelated = check({code: 'if (this.options.removedOptionExtra) act();'});
assert.strictEqual(unrelated.status, 0, unrelated.output);

const malformed = check({gate: 'failed — see `ai_corp.js`'});
assert.strictEqual(malformed.status, 1, malformed.output);
assert.match(malformed.output, /FAIL.*does not name its AI option/);

console.log('Ticket check: pending reproduction and failed gate integration checks passed.');
