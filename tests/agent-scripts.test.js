// Run with: node tests/agent-scripts.test.js
// The helper scripts agents rely on to keep context small must keep working as
// the tracker, set files and engine change.
const assert = require('assert');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const run = (...args) => {
  const result = spawnSync(process.execPath, args, {cwd: root, encoding: 'utf8'});
  assert.strictEqual(result.status, 0, args.join(' ') + ' failed:\n' + result.stdout + result.stderr);
  return result.stdout;
};

const card = run('scripts/show.js', 'card', '3041');
assert(/^cardSet\[3041\] = \{/m.test(card) && /^\};$/m.test(card), 'show.js card prints one whole definition');
assert(!/cardSet\[3042\]/.test(card), 'show.js card stops at the end of the definition');

const fn = run('scripts/show.js', 'fn', 'InstalledCards');
assert(/^function InstalledCards\(/m.test(fn) && /^\}$/m.test(fn), 'show.js fn prints one whole function');
assert(/_effectiveRunnerCreditPool\(server\) \{/.test(run('scripts/show.js', 'fn', '_effectiveRunnerCreditPool')),
  'show.js fn finds class methods');

const brief = run('scripts/batch-brief.js', '3');
assert(/^Batch 3 \(/.test(brief), 'batch-brief.js reads the tracker batch queue');
const cardLines = brief.split('\n').filter(line => /^\d{5} /.test(line));
assert(cardLines.length >= 1, 'batch-brief.js lists the batch cards');
assert.strictEqual((brief.match(/Text: /g) || []).length, cardLines.length, 'each card has rules text');
assert.strictEqual((brief.match(/no unfinished markers/g) || []).length, cardLines.length,
  'a completed batch shows no unfinished markers');

console.log('Agent helper scripts: show.js and batch-brief.js work.');
