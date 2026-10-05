#!/usr/bin/env node
'use strict';
// Turn one decision snapshot from a downloaded debug log into a Corp AI fixture.
//   node tests/extract-fixture.js <log> --list
//   node tests/extract-fixture.js <log> <n|last> <fixture-name> [--expect "!install"] [--pending]
//   --pending writes to corp-decisions-pending/ (a known-red reproduction for an open ticket).
// Snapshots are written by DecisionSnapshots (utility.js) into every downloaded log.
const fs = require('fs');
const path = require('path');

function parseSnapshots(text) {
  const out = [];
  const re = /^### DECISION (\d+)\r?\n([\s\S]*?)^### END DECISION \1\r?$/gm;
  let m;
  while ((m = re.exec(text))) {
    const body = m[2].replace(/\r/g, '').replace(/\n+$/, '\n');
    const get = key => { const d = body.match(new RegExp('^//\\s*' + key + ':[ \\t]*(.*)$', 'm')); return d ? d[1].trim() : ''; };
    out.push({n: Number(m[1]), body, identifier: get('IDENTIFIER'), chosen: get('CHOSEN'),
      options: get('OPTIONS'), replayable: get('REPLAYABLE') === 'true'});
  }
  return out;
}

function buildFixture(snapshot, logName, expect) {
  return '// EXPECT: ' + (expect || '') + '\n' +
    '// SOURCE: ' + logName + ' decision ' + snapshot.n + ' (the AI chose: ' + (snapshot.chosen || '?') + ')\n' +
    snapshot.body;
}

module.exports = {parseSnapshots, buildFixture};

if (require.main === module) {
  const [logPath, pick, name] = process.argv.slice(2);
  const args = process.argv.slice(2);
  const expectAt = args.indexOf('--expect');
  const expect = expectAt > -1 ? args[expectAt + 1] : '';
  if (!logPath) { console.log('usage: extract-fixture.js <log> --list | <n|last> <name> [--expect X] [--pending]'); process.exit(1); }
  const snapshots = parseSnapshots(fs.readFileSync(logPath, 'utf8'));
  if (!snapshots.length) { console.log('No decision snapshots in this log (it predates the recorder, or no Corp decisions were made).'); process.exit(1); }
  if (pick === '--list') {
    snapshots.forEach(s => console.log(String(s.n).padStart(4) + ' | ' + s.identifier.padEnd(14) + ' | chose: ' + (s.chosen || '?').padEnd(12) +
      ' | options: ' + s.options + (s.replayable ? '' : '   [not replayable: non-text options]')));
    process.exit(0);
  }
  const snapshot = pick === 'last' ? snapshots[snapshots.length - 1] : snapshots.find(s => s.n === Number(pick));
  if (!snapshot || !name) { console.log('Decision not found, or no fixture name given. Use --list.'); process.exit(1); }
  if (!expect) {
    console.log('A fixture expectation is required. Pass --expect X or --expect "!X".');
    process.exit(1);
  }
  if (!snapshot.replayable) {
    console.log('This decision used non-text options and cannot be replayed exactly by the fixture runner. Write a purpose-built test instead.');
    process.exit(1);
  }
  const dir = path.join(__dirname, 'fixtures', args.includes('--pending') ? 'corp-decisions-pending' : 'corp-decisions');
  fs.mkdirSync(dir, {recursive: true});
  const file = path.join(dir, path.basename(name).replace(/\.txt$/, '') + '.txt');
  if (fs.existsSync(file)) {
    console.log('Refusing to overwrite existing fixture ' + file);
    process.exit(1);
  }
  fs.writeFileSync(file, buildFixture(snapshot, path.basename(logPath), expect));
  console.log('Wrote ' + file);
}
