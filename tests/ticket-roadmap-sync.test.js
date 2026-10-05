// Run with: node tests/ticket-roadmap-sync.test.js
// scripts/ticket.js move keeps a linked roadmap item's status in step with its
// ticket: code-review/ sets it to in-progress, done/ turns the entry into a
// Done-table row whose Architecture cell comes from the ticket's own link.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {parseRoadmap} = require('../scripts/roadmap.js');
const {setRoadmapStatus, closeRoadmapItem} = require('../scripts/ticket.js');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ticket-roadmap-'));
const area = path.join(tmp, 'documentation', 'corp-ai');
const done = path.join(tmp, 'documentation', 'backlog', 'done');
fs.mkdirSync(area, {recursive: true});
fs.mkdirSync(done, {recursive: true});

const roadmap = path.join(area, 'roadmap.md');
fs.writeFileSync(roadmap, [
  '# Roadmap', '', '## Server security (L)', '',
  '### L1 First item', '- **Status:** ready', '- **Depends on:** none',
  '- **Ticket:** [a.md](../backlog/done/a.md)', '- **Goal:** First.', '',
  '### L2 Second item', '- **Status:** ready', '- **Depends on:** none',
  '- **Ticket:** [b.md](../backlog/b.md)', '- **Goal:** Second.', '',
  '### Done', '', '| ID | Item | Delivered by | Architecture |', '|---|---|---|---|',
  '| L0 | Old | Legacy | [X](architecture.md#x) |', '',
  '## Foundations (F)', '',
  '### F1 Only item', '- **Status:** ready', '- **Depends on:** none',
  '- **Ticket:** [c.md](../backlog/done/c.md)', '- **Goal:** Third.', '',
].join('\n'));
fs.writeFileSync(path.join(done, 'a.md'), 'See [Server security](../../corp-ai/architecture.md#server-security).\n');
fs.writeFileSync(path.join(done, 'c.md'), 'No architecture link.\n');

const item = id => parseRoadmap(area).find(entry => entry.id === id);
const log = console.log;
console.log = () => {};
try {
  setRoadmapStatus(item('L2'), 'in-progress');
  closeRoadmapItem(item('L1'), path.join(done, 'a.md'));
  closeRoadmapItem(item('F1'), path.join(done, 'c.md'));
} finally {
  console.log = log;
}

const items = parseRoadmap(area);
const text = fs.readFileSync(roadmap, 'utf8');
assert.strictEqual(item('L2').status, 'in-progress');
assert.ok(!/^### L1 /m.test(text) && !/^### F1 /m.test(text), 'closed entries are removed');
assert.deepStrictEqual(items.filter(entry => entry.status === 'done').map(entry => entry.id), ['L0', 'L1', 'F1']);
assert.ok(text.includes('| L1 | First item | [a](../backlog/done/a.md) | [Server security](architecture.md#server-security) |'));
assert.ok(text.includes('### Done\n\n| ID | Item | Delivered by | Architecture |\n|---|---|---|---|\n' +
  '| F1 | Only item | [c](../backlog/done/c.md) |  |\n'), 'a section without a Done table gets one');
assert.strictEqual(item('L1').section, 'Server security (L)');
fs.rmSync(tmp, {recursive: true, force: true});
console.log('Ticket roadmap sync: status and Done-table updates correct.');
