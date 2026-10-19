'use strict';
// Exercise scheduling and failure reporting in a disposable suite, without games.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-runner-'));
try {
  const runner = path.join(dir, 'run-all-tests.js');
  fs.copyFileSync(path.join(__dirname, 'run-all-tests.js'), runner);
  const write = (name, source) => fs.writeFileSync(path.join(dir, name + '.test.js'), source);
  const run = args => spawnSync(process.execPath, [runner, ...args], {
    cwd: dir, encoding: 'utf8', timeout: 15000, env: {...process.env, VERBOSE: ''},
  });
  write('agent-scripts', `const fs = require('fs');
    fs.writeFileSync('exclusive', 'running');
    setTimeout(() => { fs.unlinkSync('exclusive'); fs.writeFileSync('exclusive-done', ''); }, 50);`);
  for (const name of ['a', 'b']) write(name, `const fs = require('fs');
    const assert = require('assert');
    assert(fs.existsSync('exclusive-done') && !fs.existsSync('exclusive'));
    fs.writeFileSync('${name}-started', '');
    const deadline = Date.now() + 5000;
    const timer = setInterval(() => {
      if (fs.existsSync('a-started') && fs.existsSync('b-started')) clearInterval(timer);
      else if (Date.now() > deadline) { clearInterval(timer); throw Error('workers did not overlap'); }
    }, 10);`);
  let result = run(['--jobs', '2', '--timings', 'timings.json']);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  const report = JSON.parse(fs.readFileSync(path.join(dir, 'timings.json'), 'utf8'));
  assert.strictEqual(report.jobs, 2);
  assert.strictEqual(report.tests.length, 3);
  assert(report.tests.every(row => row.passed && row.status === 0 && row.ms >= 0));
  assert(report.tests.every((row, i, rows) => i === 0 || rows[i - 1].ms >= row.ms));
  assert(report.wallMs > 0);

  write('a', ''); write('b', '');
  fs.mkdirSync(path.join(dir, 'integration'));
  // Both formerly expensive files still contribute cheap cases to the fast tier.
  write('ai-batch', "require('fs').writeFileSync('batch-fast-ran', '');");
  write('realized-defense', "require('fs').writeFileSync('defense-fast-ran', '');");
  write('corp-decision-fixtures', ''); write('decision-snapshots', '');
  write('integration/ai-batch', 'throw Error("integration included");');
  result = run(['--fast', '--jobs', '1', '--timings', 'fast.json']);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  assert(fs.existsSync(path.join(dir, 'batch-fast-ran')));
  assert(fs.existsSync(path.join(dir, 'defense-fast-ran')));
  const fast = JSON.parse(fs.readFileSync(path.join(dir, 'fast.json'), 'utf8'));
  assert.strictEqual(fast.tier, 'fast');
  assert(fast.tests.some(row => row.file === 'corp-decision-fixtures.test.js'));
  assert(fast.tests.some(row => row.file === 'decision-snapshots.test.js'));
  assert(fast.tests.every(row => !row.file.startsWith('integration/')));
  assert.strictEqual(run(['--unit-only']).status, 0, 'legacy flag selects fast tier');
  result = run(['--jobs', '1']);
  assert.strictEqual(result.status, 1);
  assert(result.stdout.includes('FAILED integration/ai-batch.test.js') && result.stdout.includes('integration included'));
  write('a', 'throw Error("fast test must not run in integration tier");');
  write('integration/ai-batch', '');
  result = run(['--integration', '--timings', 'integration.json']);
  assert.strictEqual(result.status, 0, result.stdout + result.stderr);
  const integration = JSON.parse(fs.readFileSync(path.join(dir, 'integration.json'), 'utf8'));
  assert.strictEqual(integration.tier, 'integration');
  assert.deepStrictEqual(integration.tests.map(row => row.file), ['integration/ai-batch.test.js']);
  write('a', '');
  write('a', "console.log('line\\n'.repeat(6));");
  result = run([]);
  assert.strictEqual(result.status, 1);
  assert(result.stdout.includes('NOISY a.test.js'));
  write('a', 'process.kill(process.pid, "SIGTERM");');
  result = run([]);
  assert.strictEqual(result.status, 1);
  assert(result.stdout.includes('Terminated by SIGTERM'));
  assert.strictEqual(run(['--jobs', '0']).status, 2);
  assert.strictEqual(run(['--unknown']).status, 2);
  assert.strictEqual(run(['--fast', '--integration']).status, 2);
  console.log('Test runner: scheduling, isolation, timings and failure reporting passed.');
} finally { fs.rmSync(dir, {recursive: true, force: true}); }
