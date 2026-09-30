#!/usr/bin/env node
'use strict';
// Mechanical ticket checks and moves, so no agent spends tokens on them.
//
//   node scripts/ticket.js check <ticket.md>
//   node scripts/ticket.js move <ticket.md> <open|code-review|remediation|done>
//   node scripts/ticket.js next [bugs|backlog|all]
//   node scripts/ticket.js list
//
// check verifies a fixed ticket: Resolution records its starting commit, the
// pending reproduction moved into the green suite without changing what it
// asserts, the reproduction and the full suite pass, and acceptance criteria are
// ticked. It also prints the changed files and a GitHub compare link for review.
//
// move rebases the ticket's relative links, rewrites roadmap links to it, and
// keeps a linked roadmap item's status in step: code-review/ or remediation/
// set it to in-progress, and done/ turns its entry into a Done-table row.
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {parseRoadmap, parseAll, itemPath, resolveFrom, rebaseLinks, blockerState,
  blockerMismatches, blockers, readText} = require('./roadmap.js');

const root = path.resolve(__dirname, '..');
const STAGES = ['open', 'code-review', 'remediation', 'done'];
const FAMILIES = ['bugs', 'backlog'];

const run = (cmd, args) => spawnSync(cmd, args, {cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
const git = (...args) => run('git', args);
const rel = file => path.relative(root, path.resolve(root, file)).split(path.sep).join('/');

function ticketFamily(ticket) {
  const match = rel(ticket).match(/^documentation\/(bugs|backlog)\//);
  if (!match) throw new Error('Not a ticket under documentation/bugs/ or documentation/backlog/: ' + ticket);
  return 'documentation/' + match[1];
}

function stageOf(ticket) {
  const parts = rel(ticket).split('/');
  return parts.length > 3 && STAGES.includes(parts[2]) ? parts[2] : 'open';
}

function filesAt(stage, family) {
  const dir = path.join(root, 'documentation', family, stage === 'open' ? '' : stage);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(name => name.endsWith('.md') &&
    fs.statSync(path.join(dir, name)).isFile()).sort().map(name => path.join(dir, name));
}

function ticketSummary(file, currentBlockers = new Map()) {
  const text = readText(file);
  const title = (text.match(/^#\s+(.+)$/m) || [])[1] || path.basename(file, '.md');
  const hasGeneratedMarker = /<!-- roadmap-blocker:start -->/.test(text);
  const hasManualBlocker = /^## Additional blocker\s*$/m.test(text) ||
    (!hasGeneratedMarker && /^## Blocker\s*$/m.test(text));
  const blocked = currentBlockers.has(path.resolve(file)) || hasManualBlocker;
  return {file, title, blocked};
}

function ticketInventory() {
  const items = parseAll();
  validateBlockerMarkers(items);
  const currentBlockers = blockerState(items).reasons;
  const inventory = [];
  for (const family of FAMILIES) for (const stage of STAGES)
    for (const file of filesAt(stage, family))
      inventory.push(Object.assign({family, stage}, ticketSummary(file, currentBlockers)));
  return inventory;
}

function printTickets(tickets) {
  if (!tickets.length) { console.log('  (none)'); return; }
  for (const ticket of tickets)
    console.log('  ' + rel(ticket.file) + ' — ' + ticket.title);
}

function nextTickets(family = 'all') {
  if (family !== 'all' && !FAMILIES.includes(family))
    throw new Error('Ticket family must be one of: bugs, backlog, all');
  const tickets = ticketInventory().filter(ticket => ticket.stage === 'open' && !ticket.blocked &&
    (family === 'all' || ticket.family === family));
  console.log('Actionable ' + (family === 'all' ? 'tickets' : family) + ':');
  printTickets(tickets);
}

function listTickets() {
  const tickets = ticketInventory();
  const groups = [
    ['Actionable bugs', ticket => ticket.family === 'bugs' && ticket.stage === 'open' && !ticket.blocked],
    ['Actionable backlog', ticket => ticket.family === 'backlog' && ticket.stage === 'open' && !ticket.blocked],
    ['Blocked', ticket => ticket.stage === 'open' && ticket.blocked],
    ['In code review', ticket => ticket.stage === 'code-review'],
    ['In remediation', ticket => ticket.stage === 'remediation'],
  ];
  for (const [heading, include] of groups) {
    console.log(heading + ':');
    printTickets(tickets.filter(include));
    console.log('');
  }
}

function validateBlockerMarkers(items) {
  const malformed = blockerMismatches(items).filter(mismatch => !mismatch.expected);
  if (malformed.length) throw new Error(malformed.map(mismatch =>
    rel(mismatch.file) + ' ' + mismatch.reason).join('\n'));
}

function move(ticket, stage) {
  if (!STAGES.includes(stage)) throw new Error('Stage must be one of: ' + STAGES.join(', '));
  const from = rel(ticket);
  const dir = stage === 'open' ? ticketFamily(from) : ticketFamily(from) + '/' + stage;
  const to = path.posix.join(dir, path.basename(from));
  if (from === to) {
    validateBlockerMarkers(parseAll());
    blockers(parseAll(), true, true);
    console.log('Already in ' + dir + '/; reconciled generated blocker sections.');
    return;
  }
  // A failed blocker refresh must not leave the ticket or its roadmap entry
  // half-moved. Validate every generated marker before the first write.
  validateBlockerMarkers(parseAll());
  fs.mkdirSync(path.join(root, dir), {recursive: true});
  const tracked = git('ls-files', '--error-unmatch', from).status === 0;
  if (tracked) {
    const result = git('mv', from, to);
    if (result.status !== 0) throw new Error(result.stderr);
  } else {
    fs.renameSync(path.join(root, from), path.join(root, to));
  }
  const moved = path.join(root, to);
  const text = fs.readFileSync(moved, 'utf8');
  const rebased = rebaseLinks(text, path.dirname(path.join(root, from)), path.dirname(moved));
  if (rebased !== text) fs.writeFileSync(moved, rebased);
  console.log('Moved to ' + to);

  // Keep the AI roadmaps' links to this ticket pointing at its new folder, and
  // the linked item's status in step with it (documentation/ai-planning.md).
  for (const area of ['corp-ai', 'runner-ai']) {
    const roadmap = path.join(root, 'documentation', area, 'roadmap.md');
    if (!fs.existsSync(roadmap)) continue;
    const linkFrom = file => path.relative(path.dirname(roadmap), path.join(root, file)).split(path.sep).join('/');
    const text = fs.readFileSync(roadmap, 'utf8');
    const updated = text.split('](' + linkFrom(from) + ')').join('](' + linkFrom(to) + ')');
    if (updated === text) continue;
    fs.writeFileSync(roadmap, updated);
    console.log('Updated its link in documentation/' + area + '/roadmap.md');
    const item = parseRoadmap(path.dirname(roadmap)).find(entry => entry.fields.Ticket && itemPath(entry) === path.join(root, to));
    if (!item) continue;
    if (stage === 'done') closeRoadmapItem(item, to);
    else if (stage !== 'open') setRoadmapStatus(item, 'in-progress');
  }
  blockers(parseAll(), true, true);
}

// The open entry of a roadmap item: its ### heading up to the next heading.
function entryRange(lines, item) {
  let end = item.line;
  while (end < lines.length && !/^#/.test(lines[end])) end++;
  return [item.line - 1, end];
}

function setRoadmapStatus(item, status) {
  const lines = readText(item.file).split('\n');
  const [start, end] = entryRange(lines, item);
  const at = lines.findIndex((line, i) => i > start && i < end && /^- \*\*Status:\*\*/.test(line));
  if (at < 0 || lines[at] === '- **Status:** ' + status) return;
  lines[at] = '- **Status:** ' + status;
  fs.writeFileSync(item.file, lines.join('\n'));
  console.log('Set ' + item.id + ' to ' + status + ' in ' + rel(item.file));
}

// Replace a finished item's entry with a row in its section's Done table.
function closeRoadmapItem(item, ticket) {
  const lines = readText(item.file).split('\n');
  const [start, end] = entryRange(lines, item);
  lines.splice(start, end - start);
  const link = file => path.relative(item.dir, file).split(path.sep).join('/');
  const ticketFile = path.resolve(root, ticket);
  const architecture = path.join(item.dir, 'architecture.md');
  const ticketText = readText(ticketFile);
  const links = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkPattern.exec(ticketText))) links.push(match);
  const archLink = links.find(m => /^[^#]+#./.test(m[2]) && resolveFrom(path.dirname(ticketFile), m[2]) === architecture);
  const archCell = archLink ? '[' + archLink[1] + '](architecture.md#' + archLink[2].split('#')[1] + ')' : '';
  const row = '| ' + item.id + ' | ' + item.title + ' | [' + path.basename(ticket, '.md') + '](' + link(ticketFile) + ') | ' +
    archCell + ' |';

  const sectionStart = lines.findIndex(line => line === '## ' + item.section);
  let sectionEnd = lines.findIndex((line, i) => i > sectionStart && /^## /.test(line));
  if (sectionEnd < 0) sectionEnd = lines.length;
  const done = lines.findIndex((line, i) => i > sectionStart && i < sectionEnd && /^### Done\s*$/.test(line));
  if (done < 0) {
    while (sectionEnd > 0 && lines[sectionEnd - 1] === '') sectionEnd--;
    lines.splice(sectionEnd, 0, '', '### Done', '', '| ID | Item | Delivered by | Architecture |', '|---|---|---|---|', row);
  } else {
    let last = done + 1;
    while (lines[last] === '') last++;
    while (last < lines.length && lines[last].startsWith('|')) last++;
    lines.splice(last, 0, row);
  }
  fs.writeFileSync(item.file, lines.join('\n'));
  console.log('Moved ' + item.id + ' to the Done table in ' + rel(item.file) +
    (archCell ? '' : '\n     The ticket links no ' + path.basename(item.dir) + '/architecture.md section: fill the row\'s' +
      ' Architecture cell, or tests/ai-roadmaps.test.js fails.'));
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
  const text = readText(path.join(root, file));

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
        const added = git('log', '--diff-filter=A', '--format=%H', '--', pending).stdout.trim().split(/\r?\n/).pop();
        if (added) original = git('show', added + ':' + pending);
      }
      if (original.status !== 0) {
        report('WARN', 'Could not find the pending version of ' + pending + ' to compare.');
      } else {
        const before = original.stdout.split(/\r?\n/);
        const after = readText(path.join(root, green)).split('\n');
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

  // Gated tickets (documentation/ai-planning.md, "Acceptance gates") ship behind
  // a default-off AI option until their applicable gate evidence is recorded.
  if (criteria && /behind an AI option/.test(criteria)) {
    const gate = ((resolution || '').match(/^\*\*Gate:\*\*\s*(.+)$/m) || [])[1];
    const option = gate && (gate.match(/`(\w+)`/) || [])[1];
    const code = ['ai_corp.js', 'ai_runner.js'].map(f => readText(path.join(root, f))).join('\n');
    const setting = option && (code.match(new RegExp('\\b' + option + '\\s*:\\s*(true|false)\\b')) || [])[1];
    const passed = gate && /^passed\b/i.test(gate);
    if (!gate) report('FAIL', 'Gated ticket: the Resolution needs a "**Gate:** passed | pending <gate> | failed — `<option>` …" line.');
    else if (!option) report('FAIL', 'The **Gate:** line does not name its AI option in backticks.');
    else if (!setting) report('FAIL', 'AI option ' + option + ' has no default in ai_corp.js or ai_runner.js.');
    else if (!passed && setting === 'true') report('FAIL', 'Gate not passed but ' + option + ' defaults to on: ' + gate);
    else if (!passed) report('WARN', 'Gate not passed; ' + option + ' defaults to off: ' + gate);
    else report(setting === 'true' ? 'PASS' : 'WARN', 'Gate: ' + gate + ' (' + option + ' defaults to ' + setting + ')');
  }

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

module.exports = {ticketSummary, ticketInventory, validateBlockerMarkers, move, setRoadmapStatus, closeRoadmapItem};

if (require.main === module) {
  const [command, ticket, stage] = process.argv.slice(2);
  try {
    if (command === 'check' && ticket) check(ticket);
    else if (command === 'move' && ticket && stage) move(ticket, stage);
    else if (command === 'next' && !stage) nextTickets(ticket || 'all');
    else if (command === 'list' && !ticket) listTickets();
    else {
      console.log('usage: node scripts/ticket.js check <ticket.md>\n' +
        '       node scripts/ticket.js move <ticket.md> <' + STAGES.join('|') + '>\n' +
        '       node scripts/ticket.js next [bugs|backlog|all]\n' +
        '       node scripts/ticket.js list');
      process.exitCode = 1;
    }
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
  }
}
