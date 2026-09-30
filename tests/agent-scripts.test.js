// Run with: node tests/agent-scripts.test.js
// The helper scripts agents rely on to keep context small must keep working as
// the tracker, set files and engine change.
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {pendingGate, codeChangesSince, blockerState, validateBlockerMarkers, next: nextRoadmap,
  hasManualBlocker} = require('../scripts/roadmap.js');
const {ticketSummary, ticketInventory, move} = require('../scripts/ticket.js');

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
assert(/(?:No tickets are blocked\.|documentation\/(?:bugs|backlog)\/[^\n]+\.md: [A-Z]\d)/.test(blockers),
  'roadmap.js blockers reports either no blockers or grouped ticket dependencies');
assert(/Generated blocker sections are in sync\./.test(blockers),
  'roadmap.js blockers verifies the generated ticket headers');

const nextBugs = run('scripts/ticket.js', 'next', 'bugs');
assert(/^Actionable bugs:\n/.test(nextBugs),
  'ticket.js next bugs prints the actionable-bugs group');
assert(!/documentation\/bugs\/code-review\//.test(nextBugs),
  'ticket.js next bugs excludes tickets awaiting review');

const ticketList = run('scripts/ticket.js', 'list');
assert(/Actionable bugs:[\s\S]*Actionable backlog:[\s\S]*Blocked:[\s\S]*In code review:[\s\S]*In remediation:/.test(ticketList),
  'ticket.js list groups tickets by actionable and workflow state');
assert(/Blocked:\n(?:  \(none\)|  documentation\/(?:bugs|backlog)\/)/.test(ticketList),
  'ticket.js list prints the blocked group without depending on live roadmap state');

assert.strictEqual(pendingGate('# Ticket\n\n**Gate:** pending F4\n\n## Resolution\n\nNot decided.\n'), undefined,
  'roadmap blocker discovery ignores pending-gate examples outside Resolution');
assert.strictEqual(pendingGate('# Ticket\n\n## Resolution\n\n**Gate:** pending F4\n'), 'F4',
  'roadmap blocker discovery reads pending gates from Resolution');

const fixtureSuffix = process.pid + '-' + crypto.randomBytes(8).toString('hex');
const untrackedSet = path.join(root, 'sets', 'agent-script-untracked-test-' + fixtureSuffix + '.js');
const untrackedSetData = path.join(root, 'sets', 'agent-script-untracked-test-' + fixtureSuffix + '.txt');
const untrackedRoot = path.join(root, 'agent-script-untracked-test-' + fixtureSuffix + '.js');
const blockerFixture = path.join(root, 'documentation', 'bugs', 'agent-script-blocker-test-' + fixtureSuffix + '.md');
const nonMarkdownBlockerFixture = path.join(root, 'documentation', 'bugs',
  'agent-script-blocker-test-' + fixtureSuffix + '.txt');
const movedBlockerFixture = path.join(root, 'documentation', 'bugs', 'code-review', path.basename(blockerFixture));
const alreadyMovedBlockerFixture = path.join(root, 'documentation', 'bugs', 'code-review',
  'agent-script-already-moved-test-' + fixtureSuffix + '.md');
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

  createFixture(blockerFixture);
  fs.writeFileSync(blockerFixture, '# Blocker fixture\n');
  const currentBlockers = new Map([[blockerFixture, ['F4']]]);
  assert(ticketSummary(blockerFixture, currentBlockers).blocked,
    'ticket discovery uses current roadmap blockers even when the generated header is missing');
  fs.writeFileSync(blockerFixture, '# Blocker fixture\n\n## Additional blocker\n\nWaiting for evidence.\n');
  assert(hasManualBlocker(blockerFixture),
    'roadmap next excludes ticket-backed items with an additional blocker');
  const roadmapOutput = [];
  const originalLog = console.log;
  try {
    console.log = message => roadmapOutput.push(message);
    nextRoadmap([{id: 'X1', status: 'ready', depends: [], title: 'Blocked fixture',
      dir: path.join(root, 'documentation', 'corp-ai'),
      fields: {Ticket: '[fixture](../bugs/' + path.basename(blockerFixture) + ')'}}]);
  } finally {
    console.log = originalLog;
  }
  assert(!roadmapOutput.join('\n').includes('X1'),
    'roadmap next does not advertise a ticket with an additional blocker');

  assert.throws(() => blockerState([
    {id: 'X1', status: 'ready', depends: ['X2'], dir: path.join(root, 'documentation', 'corp-ai'),
      fields: {Ticket: '[outside](../../README.md)'}},
  ]), /Ticket link is not a regular Markdown file under documentation\/bugs\/ or documentation\/backlog\//,
  'roadmap blocker destinations are confined to the canonical ticket roots');

  createFixture(nonMarkdownBlockerFixture);
  assert.throws(() => blockerState([
    {id: 'X1', status: 'ready', depends: ['X2'], dir: path.dirname(nonMarkdownBlockerFixture),
      fields: {Ticket: '[' + path.basename(nonMarkdownBlockerFixture) + '](' +
        path.basename(nonMarkdownBlockerFixture) + ')'}},
  ]), /Ticket link is not a regular Markdown file/,
  'roadmap blocker destinations must be regular Markdown files');

  fs.writeFileSync(blockerFixture, '# Blocker fixture\n\n<!-- roadmap-blocker:start -->\n');
  assert.throws(() => validateBlockerMarkers([blockerFixture]), /unmatched generated blocker markers/,
    'roadmap raise preflight rejects malformed blocker markers before mutation');
  assert.throws(() => ticketInventory(), /unmatched generated blocker markers/,
    'ticket list and next reject malformed blocker markers before building inventory');
  assert.throws(() => move(blockerFixture, 'code-review'), /unmatched generated blocker markers/,
    'ticket move rejects malformed blocker markers');
  assert(fs.existsSync(blockerFixture) && !fs.existsSync(movedBlockerFixture),
    'ticket move validates blocker markers before relocating the ticket');

  createFixture(alreadyMovedBlockerFixture);
  fs.writeFileSync(alreadyMovedBlockerFixture, '# Already moved fixture\n\n<!-- roadmap-blocker:start -->\n');
  assert.throws(() => move(alreadyMovedBlockerFixture, 'code-review'), /unmatched generated blocker markers/,
    'repeating a ticket move validates and reconciles blocker state instead of exiting early');
} finally {
  for (const file of createdFixtures) if (fs.existsSync(file)) fs.unlinkSync(file);
  if (fs.existsSync(movedBlockerFixture)) fs.unlinkSync(movedBlockerFixture);
}

console.log('Agent helper scripts: show.js, batch-brief.js, roadmap blockers and ticket lists work.');
