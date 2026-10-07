'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {refreshBaseline} = require('../scripts/refresh-ai-baseline');

let cases = 0;
function test(name, fn) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-baseline-'));
  try {
    fs.mkdirSync(path.join(root, 'bench/current'), {recursive: true});
    fn(root);
    cases++;
    if (process.env.VERBOSE) console.log(name);
  } finally { fs.rmSync(root, {recursive: true, force: true}); }
}
const oldText = JSON.stringify({sha: 'abc123', evidence: 'preserve exactly'});
const writeOld = (root, name = 'baseline.json') => {
  const file = path.join(root, 'bench/current', name);
  fs.writeFileSync(file, oldText);
  return file;
};
const writeReport = (root, changes = {}) => fs.writeFileSync(path.join(root, 'bench/baseline.json'),
  JSON.stringify({kind: 'ai-batch-report', dirty: false, games: Array(1000).fill({}), failures: [], ...changes}));

for (const name of ['baseline.json', '7th-Oct-baseline.json']) {
  test(`archives ${name} and promotes successful report`, root => {
    writeOld(root, name);
    const result = refreshBaseline(root, args => {
      assert.deepStrictEqual(args, ['scripts/ai-batch.js', '--pool',
        'documentation/corp-ai-regression/assets/beginner-pool.json', '--seeds', '1-200',
        '--out', 'bench/baseline.json']);
      writeReport(root);
    });
    assert.strictEqual(fs.readFileSync(result.archived, 'utf8'), oldText);
    assert.strictEqual(JSON.parse(fs.readFileSync(result.current)).games.length, 1000);
    assert.deepStrictEqual(fs.readdirSync(path.dirname(result.current)), ['baseline.json']);
    assert(!fs.existsSync(path.join(root, 'bench/baseline.json')));
  });
}
test('initial baseline needs no archive', root => {
  const result = refreshBaseline(root, () => writeReport(root));
  assert.strictEqual(result.archived, undefined);
  assert(fs.existsSync(result.current));
});
for (const changes of [{failures: [{}]}, {games: []}, {dirty: true}]) {
  test('rejects unsuccessful or dirty report without rotating baseline', root => {
    const previous = writeOld(root);
    assert.throws(() => refreshBaseline(root, () => writeReport(root, changes)));
    assert.strictEqual(fs.readFileSync(previous, 'utf8'), oldText);
    assert(!fs.existsSync(path.join(root, 'bench/archived-current')));
    assert(!fs.existsSync(path.join(root, 'bench/.baseline-refresh.lock')));
  });
}
test('batch exception preserves baseline', root => {
  const previous = writeOld(root);
  assert.throws(() => refreshBaseline(root, () => { throw new Error('batch failed'); }), /batch failed/);
  assert.strictEqual(fs.readFileSync(previous, 'utf8'), oldText);
});
test('existing pending report is never overwritten', root => {
  writeReport(root);
  assert.throws(() => refreshBaseline(root, () => assert.fail('must not run')), /already exists/);
});
test('ambiguous current folder is rejected', root => {
  writeOld(root);
  writeOld(root, 'other.json');
  assert.throws(() => refreshBaseline(root, () => assert.fail('must not run')), /at most one/);
});
test('concurrent refresh is rejected', root => {
  fs.writeFileSync(path.join(root, 'bench/.baseline-refresh.lock'), '');
  assert.throws(() => refreshBaseline(root, () => assert.fail('must not run')), /EEXIST/);
  assert(fs.existsSync(path.join(root, 'bench/.baseline-refresh.lock')));
});
console.log(`${cases} baseline refresh cases passed.`);
