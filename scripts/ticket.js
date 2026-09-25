#!/usr/bin/env node
'use strict';
// Mechanical ticket checks and moves, so no agent spends tokens on them.
//
//   node scripts/ticket.js check <ticket.md>
//   node scripts/ticket.js move <ticket.md> <open|code-review|remediation|done>
//
// check verifies a fixed ticket: Resolution records its starting commit, the
// pending reproduction moved into the green suite without changing what it
// asserts, the reproduction and the full suite pass, and acceptance criteria are
// ticked. It also prints the changed files and a GitHub compare link for review.
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const STAGES = ['open', 'code-review', 'remediation', 'done'];

const run = (cmd, args) => spawnSync(cmd, args, {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const git = (...args) => run('git', args);
const rel = file => path.relative(root, path.resolve(root, file));

function ticketFamily(ticket) {
  const match = rel(ticket).match(/^documentation\/(bugs|backlog)\//);
  if (!match) throw new Error('Not a ticket under documentation/bugs/ or documentation/backlog/: ' + ticket);
  return 'documentation/' + match[1];
}

function stageOf(ticket) {
  const parts = rel(ticket).split('/');
  return parts.length > 3 && STAGES.includes(parts[2]) ? parts[2] : 'open';
}

function move(ticket, stage) {
  if (!STAGES.includes(stage)) throw new Error('Stage must be one of: ' + STAGES.join(', '));
  const from = rel(ticket);
  const dir = stage === 'open' ? ticketFamily(from) : ticketFamily(from) + '/' + stage;
  const to = path.join(dir, path.basename(from));
  if (from === to) { console.log('Already in ' + dir + '/'); return; }
  fs.mkdirSync(path.join(root, dir), {recursive: true});
  const tracked = git('ls-files', '--error-unmatch', from).status === 0;
  if (tracked) {
    const result = git('mv', from, to);
    if (result.status !== 0) throw new Error(result.stderr);
  } else {
    fs.renameSync(path.join(root, from), path.join(root, to));
  }
  console.log('Moved to ' + to);

  // Keep the Corp AI roadmap's link to this ticket pointing at its new folder.
  const roadmap = path.join(root, 'documentation', 'corp-ai', 'roadmap.md');
  if (fs.existsSync(roadmap)) {
    const linkFrom = file => path.relative(path.dirname(roadmap), path.join(root, file)).split(path.sep).join('/');
    const text = fs.readFileSync(roadmap, 'utf8');
    const updated = text.split('](' + linkFrom(from) + ')').join('](' + linkFrom(to) + ')');
    if (updated !== text) {
      fs.writeFileSync(roadmap, updated);
      console.log('Updated its link in documentation/corp-ai/roadmap.md');
    }
  }
}

function section(text, heading) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.startsWith(heading));
  if (start < 0) return null;
  const end = lines.findIndex((line, i) => i > start && /^## /.test(line));
  return lines.slice(start, end < 0 ? lines.length : end).join('\n');
}

function greenPathFor(pending) {
  if (pending.startsWith('tests/pending/')) return 'tests/' + pending.slice('tests/pending/'.length);
  if (pending.startsWith('tests/fixtures/corp-decisions-pending/'))
    return 'tests/fixtures/corp-decisions/' + pending.slice('tests/fixtures/corp-decisions-pending/'.length);
  return null;
}

function check(ticket) {
  const results = [];
  const report = (level, message) => results.push([level, message]);
  const file = rel(ticket);
  if (!fs.existsSync(path.join(root, file))) throw new Error('No such ticket: ' + file);
  const text = fs.readFileSync(path.join(root, file), 'utf8');

  if (stageOf(file) !== 'code-review') report('WARN', 'Ticket is in ' + stageOf(file) + '/, not code-review/.');

  const resolution = section(text, '## Resolution');
  const baseMatch = resolution && resolution.match(/Implemented from `?([0-9a-f]{7,40})`?/);
  const base = baseMatch ? baseMatch[1] : null;
  if (!resolution) report('FAIL', 'No "## Resolution" section.');
  else if (!base) report('FAIL', 'Resolution does not start with "Implemented from <sha>".');
  else if (git('cat-file', '-e', base + '^{commit}').status !== 0) report('FAIL', 'Unknown commit ' + base + '.');

  const reproLine = (text.match(/^\*\*Reproduction:\*\*(.*)$/m) || [])[1] || '';
  const pending = (reproLine.match(/`(tests\/[^`]+)`/) || [])[1];
  const green = pending && greenPathFor(pending);
  if (!pending) {
    report('WARN', 'No reproduction path on the **Reproduction:** line; reproduction checks skipped.');
  } else if (!green) {
    report('WARN', 'Reproduction ' + pending + ' is not a pending path; reproduction checks skipped.');
  } else {
    if (fs.existsSync(path.join(root, pending))) report('FAIL', pending + ' is still pending; move it to ' + green + '.');
    if (!fs.existsSync(path.join(root, green))) {
      report('FAIL', green + ' does not exist.');
    } else {
      let original = base ? git('show', base + ':' + pending) : {status: 1};
      if (original.status !== 0) {
        const added = git('log', '--diff-filter=A', '--format=%H', '--', pending).stdout.trim().split('\n').pop();
        if (added) original = git('show', added + ':' + pending);
      }
      if (original.status !== 0) {
        report('WARN', 'Could not find the pending version of ' + pending + ' to compare.');
      } else {
        const before = original.stdout.split('\n');
        const after = fs.readFileSync(path.join(root, green), 'utf8').split('\n');
        const removed = before.filter(line => !after.includes(line));
        const addedLines = after.filter(line => !before.includes(line));
        const isExpectation = line => green.endsWith('.txt') ? /^\/\/\s*(EXPECT|OPTIONS)/.test(line) : /assert/.test(line);
        const changedExpectations = removed.concat(addedLines).filter(isExpectation);
        if (changedExpectations.length) {
          report('FAIL', 'Reproduction expectations changed:\n      ' + changedExpectations.map(l => l.trim()).join('\n      '));
        } else if (removed.length || addedLines.length) {
          report('WARN', 'Reproduction changed outside its expectations (' + removed.length + ' lines removed, ' +
            addedLines.length + ' added); the Resolution should explain why.');
        } else {
          report('PASS', 'Reproduction moved to ' + green + ' unchanged.');
        }
      }
      const repro = green.endsWith('.txt')
        ? run(process.execPath, ['tests/corp-decision-fixtures.test.js', path.basename(green)])
        : run(process.execPath, [green]);
      report(repro.status === 0 ? 'PASS' : 'FAIL', 'Reproduction ' + (repro.status === 0 ? 'passes.' :
        'fails:\n' + (repro.stdout + repro.stderr).trim().split('\n').slice(-15).join('\n')));
    }
  }

  const suite = run(process.execPath, ['tests/run-all-tests.js']);
  report(suite.status === 0 ? 'PASS' : 'FAIL', suite.status === 0 ? 'Full suite: ' + suite.stdout.trim() :
    'Full suite fails:\n' + (suite.stdout + suite.stderr).trim().split('\n').slice(-25).join('\n'));

  const criteria = section(text, '## Acceptance criteria');
  const unticked = criteria ? criteria.split('\n').filter(line => /^\s*- \[ \]/.test(line)) : [];
  if (unticked.length) report('WARN', unticked.length + ' acceptance criteria not ticked:\n      ' +
    unticked.map(line => line.replace(/^\s*- \[ \]\s*/, '')).join('\n      '));

  for (const [level, message] of results) console.log(level.padEnd(4) + ' ' + message);

  if (base) {
    const changed = git('diff', '--name-status', '-M', base).stdout.trim();
    const untracked = git('ls-files', '--others', '--exclude-standard').stdout.trim();
    console.log('\nChanged since ' + base + ':\n' + (changed || '(none committed or staged)') +
      (untracked ? '\nUntracked:\n' + untracked : ''));
    const remote = git('remote', 'get-url', 'origin').stdout.trim()
      .replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '');
    const branch = git('rev-parse', '--abbrev-ref', 'HEAD').stdout.trim();
    if (/^https:\/\/github\.com\//.test(remote)) {
      const ahead = git('rev-list', '--count', '@{u}..HEAD');
      console.log('\nReview link: ' + remote + '/compare/' + base + '...' + branch);
      if (ahead.status !== 0) console.log('     Branch has no upstream: push it before a GitHub-based review.');
      else if (ahead.stdout.trim() !== '0') console.log('     ' + ahead.stdout.trim() + ' commit(s) not pushed yet.');
      if (git('status', '--porcelain').stdout.trim()) console.log('     Uncommitted changes are not visible on GitHub.');
    }
  }

  const failed = results.some(([level]) => level === 'FAIL');
  console.log('\n' + (failed ? 'Ticket check FAILED.' : 'Ticket check passed.'));
  process.exitCode = failed ? 1 : 0;
}

const [command, ticket, stage] = process.argv.slice(2);
try {
  if (command === 'check' && ticket) check(ticket);
  else if (command === 'move' && ticket && stage) move(ticket, stage);
  else {
    console.log('usage: node scripts/ticket.js check <ticket.md>\n       node scripts/ticket.js move <ticket.md> <' + STAGES.join('|') + '>');
    process.exitCode = 1;
  }
} catch (error) {
  console.log(error.message);
  process.exitCode = 1;
}
