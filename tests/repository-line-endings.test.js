// Run with: node tests/repository-line-endings.test.js
// Git must not turn repository text into CRLF on Windows: several tests parse
// Markdown structure or compare generated documentation byte-for-byte.
const assert = require('assert');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const files = ['scripts/ticket.js', 'documentation/ai-planning.md', 'carddata/carddata.json'];
const result = spawnSync('git', ['check-attr', 'text', 'eol', '--', ...files], {
  cwd: root,
  encoding: 'utf8',
});

assert.strictEqual(result.status, 0, 'git check-attr failed:\n' + result.stderr);
for (const file of files) {
  assert(result.stdout.includes(file + ': text: auto'), file + ' must be treated as text');
  assert(result.stdout.includes(file + ': eol: lf'), file + ' must be checked out with LF endings');
}

console.log('Repository line endings: tracked text is checked out as LF on every platform.');
