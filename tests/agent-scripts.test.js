// Run with: node tests/agent-scripts.test.js
// The helper scripts agents rely on to keep context small must keep working as
// the tracker, set files and engine change.
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {pendingGate, codeChangesSince} = require('../scripts/roadmap.js');

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

const blockers = run('scripts/roadmap.js', 'blockers');
assert(/corp_ai_finding_11_evaluate_once_per_decision\.md: F2, F4/.test(blockers),
  'roadmap.js blockers lists unresolved dependencies');
assert(/Generated blocker sections are in sync\./.test(blockers),
  'roadmap.js blockers verifies the generated ticket headers');

const nextBugs = run('scripts/ticket.js', 'next', 'bugs');
assert(/documentation\/bugs\/ballista-central-servers-skip-agenda-check\.md/.test(nextBugs),
  'ticket.js next bugs lists open actionable bugs');
assert(!/documentation\/bugs\/code-review\//.test(nextBugs),
  'ticket.js next bugs excludes tickets awaiting review');

const ticketList = run('scripts/ticket.js', 'list');
assert(/Actionable bugs:[\s\S]*Actionable backlog:[\s\S]*Blocked:[\s\S]*In code review:[\s\S]*In remediation:/.test(ticketList),
  'ticket.js list groups tickets by actionable and workflow state');
assert(/Blocked:[\s\S]*corp_ai_finding_11_evaluate_once_per_decision\.md/.test(ticketList),
  'ticket.js list puts generated blockers in the blocked group');

assert.strictEqual(pendingGate('# Ticket\n\n**Gate:** pending F4\n\n## Resolution\n\nNot decided.\n'), undefined,
  'roadmap blocker discovery ignores pending-gate examples outside Resolution');
assert.strictEqual(pendingGate('# Ticket\n\n## Resolution\n\n**Gate:** pending F4\n'), 'F4',
  'roadmap blocker discovery reads pending gates from Resolution');

const fixtureSuffix = process.pid + '-' + crypto.randomBytes(8).toString('hex');
const untrackedSet = path.join(root, 'sets', 'agent-script-untracked-test-' + fixtureSuffix + '.js');
const untrackedSetData = path.join(root, 'sets', 'agent-script-untracked-test-' + fixtureSuffix + '.txt');
const untrackedRoot = path.join(root, 'agent-script-untracked-test-' + fixtureSuffix + '.js');
const createdFixtures = [];
const createFixture = file => {
  const descriptor = fs.openSync(file, 'wx');
  createdFixtures.push(file);
  try { fs.writeFileSync(descriptor, '// created by tests/agent-scripts.test.js\n'); }
  finally { fs.closeSync(descriptor); }
};
try {
  createFixture(untrackedSet);
  createFixture(untrackedSetData);
  createFixture(untrackedRoot);
  const head = spawnSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).stdout.trim();
  const changes = codeChangesSince(head);
  assert(changes.includes(path.relative(root, untrackedSet)),
    'raise verification includes untracked JavaScript under sets/');
  assert(!changes.includes(path.relative(root, untrackedSetData)),
    'raise verification ignores non-JavaScript files under sets/');
  assert(!changes.includes(path.relative(root, untrackedRoot)),
    'raise verification ignores arbitrary untracked root JavaScript');
} finally {
  for (const file of createdFixtures) fs.unlinkSync(file);
}

console.log('Agent helper scripts: show.js, batch-brief.js, roadmap blockers and ticket lists work.');
