#!/usr/bin/env node
'use strict';
// Read and update the AI roadmaps (documentation/corp-ai/roadmap.md and
// documentation/runner-ai/roadmap.md). See documentation/ai-planning.md.
//
//   node scripts/roadmap.js list          every item with its status
//   node scripts/roadmap.js next          items whose dependencies are all done
//                                         (ready, proposed, or in-progress with an open ticket)
//   node scripts/roadmap.js gates         items with an acceptance gate, grouped by
//                                         what is left to do (see
//                                         documentation/judging-ai-changes.md)
//   node scripts/roadmap.js blockers      list tickets whose roadmap dependencies or
//                                         recorded gate are unresolved; fail if their
//                                         generated blocker headers are stale
//   node scripts/roadmap.js blockers --fix
//                                         add, update or remove generated headers
//   node scripts/roadmap.js raise <ID>    move a proposed item's spec into
//                                         documentation/backlog/ and mark it ready;
//                                         refuses a spec not re-verified against
//                                         the current code (**Verified against code:**)
//
// tests/ai-roadmaps.test.js uses these parsers to keep the roadmaps, specs and
// tickets consistent.
const fs = require('fs');
const path = require('path'); 
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const readText = file => fs.readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');
const rel = file => path.relative(root, file).split(path.sep).join('/');
const AREAS = ['corp-ai', 'runner-ai'].map(name => path.join(root, 'documentation', name))
  .filter(dir => fs.existsSync(path.join(dir, 'roadmap.md')));
const STATUSES = ['proposed', 'ready', 'in-progress', 'done', 'parked'];
const ID = /^[A-Z]\d+(?:\.\d+)*$/;
const BLOCKER_START = '<!-- roadmap-blocker:start -->';
const BLOCKER_END = '<!-- roadmap-blocker:end -->';

const linkTargets = text => {
  const targets = [];
  const pattern = /\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(String(text || '')))) targets.push(match[1]);
  return targets;
};
const resolveFrom = (dir, target) => path.resolve(dir, target.split('#')[0]);

function parseRoadmap(dir) {
  const file = path.join(dir, 'roadmap.md');
  const items = [];
  let section = null;
  let current = null;
  let inDoneTable = false;
  readText(file).split('\n').forEach((line, index) => {
    const sectionMatch = line.match(/^## (.+)$/);
    if (sectionMatch) { section = sectionMatch[1]; current = null; inDoneTable = false; return; }
    const heading = line.match(/^### (\S+) (.+)$/);
    if (heading && ID.test(heading[1])) {
      current = {id: heading[1], title: heading[2].trim(), dir, file, section, line: index + 1,
        fields: {}, status: null, depends: []};
      items.push(current);
      inDoneTable = false;
      return;
    }
    if (/^### Done\s*$/.test(line)) { current = null; inDoneTable = true; return; }
    const field = line.match(/^- \*\*(.+?):\*\*\s*(.*)$/);
    if (field && current) {
      current.fields[field[1]] = field[2].trim();
      if (field[1] === 'Status') current.status = field[2].trim();
      if (field[1] === 'Depends on') current.depends = field[2].trim() === 'none' ? [] :
        field[2].split(',').map(s => s.trim()).filter(Boolean);
      return;
    }
    const row = line.match(/^\|\s*([A-Z]\d+(?:\.\d+)*)\s*\|(.*)\|\s*$/);
    if (row && inDoneTable) {
      const cells = row[2].split('|').map(s => s.trim());
      items.push({id: row[1], title: cells[0], dir, file, section, line: index + 1, status: 'done', depends: [],
        fields: {'Delivered by': cells[1] || '', Architecture: cells[2] || ''}});
    }
  });
  return items;
}

const parseAll = () => [].concat(...AREAS.map(parseRoadmap));

function itemPath(item) {
  const target = linkTargets(item.fields.Ticket || item.fields.Spec)[0];
  return target ? resolveFrom(item.dir, target) : null;
}

const areaName = item => path.basename(item.dir);

const sectionOf = (text, heading) => {
  const start = text.indexOf('\n' + heading + '\n');
  if (start < 0) return '';
  const rest = text.slice(start + heading.length + 2);
  const end = rest.search(/^## /m);
  return end < 0 ? rest : rest.slice(0, end);
};

const pendingGate = text =>
  (sectionOf(text, '## Resolution').match(/^\*\*Gate:\*\*\s*pending\s+([A-Z]\d+(?:\.\d+)*)\b/im) || [])[1];

const ticketRoots = () => ['backlog', 'bugs'].map(name => path.join(root, 'documentation', name));
const markdownFiles = dir => fs.existsSync(dir) ? [].concat(...fs.readdirSync(dir).map(name => {
  const file = path.join(dir, name);
  const stat = fs.lstatSync(file);
  return stat.isDirectory() ? markdownFiles(file) : (stat.isFile() && name.endsWith('.md') ? [file] : []);
})) : [];

const isWithin = (parent, child) => child === parent || child.startsWith(parent + path.sep);
function canonicalTicketPath(file) {
  if (!file || !fs.existsSync(file)) return null;
  const canonical = fs.realpathSync(file);
  if (!fs.statSync(canonical).isFile() || path.extname(canonical) !== '.md') return null;
  return ticketRoots().some(dir => isWithin(fs.realpathSync(dir), canonical)) ? canonical : null;
}

function generatedBlockerRange(text) {
  const starts = text.split(BLOCKER_START).length - 1;
  const ends = text.split(BLOCKER_END).length - 1;
  if (starts !== ends) return {invalid: true};
  if (!starts) return null;
  const start = text.indexOf(BLOCKER_START);
  const end = text.indexOf(BLOCKER_END);
  if (end < start) return {invalid: true};
  const after = end + BLOCKER_END.length;
  return {start, end: after + (text.slice(after).startsWith('\n\n') ? 2 : text.slice(after).startsWith('\n') ? 1 : 0),
    count: starts};
}

function withGeneratedBlocker(text, section) {
  let range = generatedBlockerRange(text);
  if (range && range.invalid) return null;
  while (range) {
    text = text.slice(0, range.start) + text.slice(range.end);
    range = generatedBlockerRange(text);
    if (range && range.invalid) return null;
  }
  if (!section) return text;
  const firstSection = text.search(/^## /m);
  const at = firstSection < 0 ? text.length : firstSection;
  const before = text.slice(0, at).replace(/\s*$/, '\n\n');
  const after = text.slice(at).replace(/^\s*/, '');
  return before + section + '\n\n' + after;
}

function blockerState(items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const desired = new Map();
  const reasons = new Map();
  for (const item of items) {
    const file = itemPath(item);
    if (!item.fields.Ticket || item.status === 'done' || !file || !fs.existsSync(file)) continue;
    const ticket = canonicalTicketPath(file);
    if (!ticket) throw new Error(item.id + ' Ticket link is not a regular Markdown file under ' +
      'documentation/bugs/ or documentation/backlog/: ' + path.relative(root, file));
    const blockers = item.depends.filter(id => !byId.has(id) || byId.get(id).status !== 'done');
    if (blockers.length) reasons.set(ticket, blockers);
  }

  // A reviewed gated bug need not have a roadmap item. Its Resolution line is
  // still machine-readable, so keep its blocker visible until that roadmap
  // dependency is done.
  for (const file of [].concat(...ticketRoots().map(markdownFiles))) {
    const text = readText(file);
    const pending = pendingGate(text);
    if (pending && (!byId.has(pending) || byId.get(pending).status !== 'done')) {
      const current = reasons.get(file) || [];
      if (!current.includes(pending)) reasons.set(file, current.concat(pending));
    }
  }

  for (const [file, ids] of reasons) {
    const labels = ids.map(id => {
      const dependency = byId.get(id);
      return '**' + id + '**' + (dependency ? ' (`' + dependency.status + '`)' : ' (missing from the roadmaps)');
    });
    desired.set(file, BLOCKER_START + '\n## Blocker\n\n**Blocked on:** ' + labels.join(', ') + '.\n\n' +
      'This ticket cannot proceed until ' + (ids.length === 1 ? 'that item is' : 'those items are') +
      ' `done`. This section is generated by `node scripts/roadmap.js blockers --fix`.\n' + BLOCKER_END);
  }
  return {desired, reasons};
}

function blockerMismatches(items) {
  const {desired} = blockerState(items);
  const files = new Set([].concat(...ticketRoots().map(markdownFiles)));
  for (const file of desired.keys()) files.add(file);
  const mismatches = [];
  for (const file of files) {
    const text = readText(file);
    const expected = withGeneratedBlocker(text, desired.get(file) || '');
    if (expected === null) mismatches.push({file, reason: 'has unmatched generated blocker markers'});
    else if (expected !== text) mismatches.push({file, expected,
      reason: desired.has(file) ? 'has a missing or stale generated blocker' : 'has a generated blocker but is no longer blocked'});
  }
  return mismatches;
}

function blockers(items, fix = false, quiet = false) {
  const {reasons} = blockerState(items);
  if (!quiet) {
    if (!reasons.size) console.log('No tickets are blocked.');
    else for (const [file, ids] of reasons)
      console.log(rel(file) + ': ' + ids.join(', '));
  }

  const mismatches = blockerMismatches(items);
  if (fix) {
    for (const mismatch of mismatches) {
      if (!mismatch.expected) throw new Error(path.relative(root, mismatch.file) + ' ' + mismatch.reason);
      fs.writeFileSync(mismatch.file, mismatch.expected);
    }
    if (!quiet || mismatches.length)
      console.log('Updated ' + mismatches.length + ' generated blocker section' + (mismatches.length === 1 ? '.' : 's.'));
  } else if (mismatches.length) {
    console.log('\nGenerated blocker sections are out of sync:');
    for (const mismatch of mismatches) console.log('  ' + rel(mismatch.file) + ': ' + mismatch.reason);
    console.log('Run `node scripts/roadmap.js blockers --fix`.');
    process.exitCode = 1;
  } else console.log('\nGenerated blocker sections are in sync.');
  return mismatches;
}

function list(items) {
  let area = null;
  for (const item of items) {
    if (areaName(item) !== area) { area = areaName(item); console.log('\n' + area); }
    console.log('  ' + item.id.padEnd(7) + item.status.padEnd(12) + item.title);
  }
}

function next(items) {
  const byId = new Map(items.map(item => [item.id, item]));
  // In-progress items whose ticket is back in the open backlog (a gate waiting
  // for F4, or unfinished work) are listed too.
  const resumable = item => item.status === 'in-progress' && itemPath(item) &&
    !['code-review', 'remediation'].some(folder => itemPath(item).split(path.sep).includes(folder));
  const ready = items.filter(item => (['ready', 'proposed'].includes(item.status) || resumable(item)) &&
    item.depends.every(dep => byId.has(dep) && byId.get(dep).status === 'done'));
  if (!ready.length) { console.log('No item has all its dependencies done.'); return; }
  for (const item of ready) {
    const file = itemPath(item);
    console.log(areaName(item).padEnd(10) + item.id.padEnd(7) + item.status.padEnd(12) + item.title +
      (file ? '\n' + ' '.repeat(29) + path.relative(root, file) : ''));
  }
}

// Acceptance gates (documentation/judging-ai-changes.md). An item is gated when
// its spec or ticket says how adoption is judged beyond deterministic tests.
function gateInfo(item) {
  const file = itemPath(item);
  if (item.id === 'F4' || !file || !fs.existsSync(file)) return null;
  const text = readText(file);
  const gate = sectionOf(text, '## Acceptance gate');
  const criteria = sectionOf(text, '## Acceptance criteria');
  let kind = null;
  if (/behind an AI option/.test(criteria)) kind = 'on/off';
  else if (/snapshots?\b[^.\n]*\bidentical/i.test(criteria + gate)) kind = 'no-change';
  else if (/^\s*Human gate/.test(gate)) kind = 'human';
  else if (/\bF4\b/.test(gate) || (/\bbaseline\b/.test(gate) && /\bF4\b/.test(text))) kind = 'other';
  if (!kind) return null;
  const option = ((text.match(/options\.(\w+)/) || text.match(/option\s+`(\w+)`/) || [])[1]) || '';
  const result = ((sectionOf(text, '## Resolution').match(/^\*\*Gate:\*\*\s*(.+)$/m) || [])[1] || '').trim();
  let state = 'not built';
  if (/^passed\b/i.test(result)) state = 'passed';
  else if (/^failed\b/i.test(result)) state = 'failed';
  else if (result) state = 'waiting';
  else if (item.status === 'in-progress') state = 'being built';
  else if (item.status === 'done') state = 'passed';
  return {item, file, kind, option, state, result};
}

const gatedItems = items => items.map(gateInfo).filter(Boolean);

function gates(items) {
  const f4 = items.find(item => item.id === 'F4');
  const f4Done = f4 && f4.status === 'done';
  console.log('F4 batch harness: ' + (f4 ? f4.status : 'missing') +
    (f4Done ? '. Gates can be run.' : '. Not built yet, so no F4 gate can be run.'));
  const all = gatedItems(items);
  const kinds = {'on/off': 'switched on only if an on/off comparison passes',
    'no-change': 'decisions must match the recorded snapshots, except changes the ticket lists', other: 'other seeded-game (F4) check', human: 'judged on human game data'};
  const groups = [
    ['Built, option off, gate waiting to be run' + (f4Done ? ' (run these now)' : ' (run when F4 is done)'),
      g => g.state === 'waiting'],
    ['Gate failed (option stays off; see the ticket)', g => g.state === 'failed'],
    ['Being built', g => g.state === 'being built'],
    ['Not built yet', g => g.state === 'not built'],
    ['Gate passed', g => g.state === 'passed'],
  ];
  for (const [title, test] of groups) {
    const group = all.filter(test);
    console.log('\n' + title + ': ' + (group.length ? '' : 'none'));
    for (const g of group) {
      console.log('  ' + g.item.id.padEnd(7) + g.item.status.padEnd(12) + g.item.title +
        '\n' + ' '.repeat(9) + kinds[g.kind] + (g.option ? '; option `' + g.option + '`' : '') +
        (g.result ? '\n' + ' '.repeat(9) + 'Gate: ' + g.result : ''));
    }
  }
}

// Rewrite relative Markdown links in a moved file so they still resolve.
function rebaseLinks(text, fromDir, toDir) {
  return text.replace(/\]\((?!https?:|#|\/)([^)]+)\)/g, (match, target) => {
    const [file, anchor] = target.split('#');
    const moved = path.relative(toDir, path.resolve(fromDir, file)).split(path.sep).join('/');
    return '](' + moved + (anchor ? '#' + anchor : '') + ')';
  });
}

const VERIFIED = /^\*\*Verified against code:\*\* `?([0-9a-f]{7,40})`?/m;
const git = (...args) => spawnSync('git', args, {cwd: root, encoding: 'utf8'});

function codeChangesSince(sha) {
  const changed = git('diff', '--name-only', sha, '--', ':(glob)*.js', ':(glob)sets/**/*.js')
    .stdout.trim().split('\n').filter(Boolean);
  const untrackedSets = git('ls-files', '--others', '--exclude-standard', '--', ':(glob)sets/**/*.js')
    .stdout.trim().split('\n').filter(Boolean);
  return [...new Set(changed.concat(untrackedSets))];
}

// A spec may be raised only when its claims were checked against the current
// game and AI code (documentation/ai-planning.md, "Re-grounding a spec").
function checkVerified(file) {
  const where = path.relative(root, file);
  const sha = (readText(file).match(VERIFIED) || [])[1];
  const redo = '\nRe-verify its Current behaviour and every function or hook it names against the code' +
    ' (node scripts/show.js fn <name>, rg -n), fix what is stale, then set\n  **Verified against code:** ' +
    git('rev-parse', '--short', 'HEAD').stdout.trim() + ' (' + new Date().toISOString().slice(0, 10) + ')' +
    '\ndirectly under its **Read first:** line.';
  if (!sha) throw new Error(where + ' has no **Verified against code:** line.' + redo);
  if (git('cat-file', '-e', sha + '^{commit}').status !== 0) throw new Error(where + ' was verified at unknown commit ' + sha + '.' + redo);
  const changed = codeChangesSince(sha);
  if (changed.length) throw new Error(where + ' was verified at ' + sha + ', but the code has changed since:\n  ' +
    changed.join('\n  ') + redo);
  return sha;
}

function raise(items, id) {
  const item = items.find(entry => entry.id === id);
  if (!item) throw new Error('No roadmap item ' + id);
  if (item.status !== 'proposed' || !item.fields.Spec) throw new Error(id + ' is ' + item.status + ', not a proposed item with a spec');
  const from = itemPath(item);
  const verified = checkVerified(from);
  const backlog = path.join(root, 'documentation', 'backlog');
  const to = path.join(backlog, path.basename(from));
  if (fs.existsSync(to)) throw new Error(path.relative(root, to) + ' already exists');
  const moved = spawnSync('git', ['mv', from, to], {cwd: root, encoding: 'utf8'});
  if (moved.status !== 0) fs.renameSync(from, to);
  fs.writeFileSync(to, rebaseLinks(readText(to), path.dirname(from), backlog));

  const lines = readText(item.file).split('\n');
  const link = path.relative(item.dir, to).split(path.sep).join('/');
  for (let i = item.line; i < lines.length && !/^#/.test(lines[i]); i++) {
    if (/^- \*\*Status:\*\*/.test(lines[i])) lines[i] = '- **Status:** ready';
    if (/^- \*\*Spec:\*\*/.test(lines[i])) lines[i] = '- **Ticket:** [' + path.basename(to) + '](' + link + ')';
  }
  fs.writeFileSync(item.file, lines.join('\n'));
  blockers(parseAll(), true, true);
  console.log('Raised ' + id + ': ' + path.relative(root, to) + ' (status ready)');
  console.log('Its claims were verified at ' + verified + ' and no game or AI code has changed since;' +
    ' implement-ticket re-verifies them when it picks the ticket up.');
}

module.exports = {parseRoadmap, parseAll, itemPath, gatedItems, linkTargets, resolveFrom, rebaseLinks, blockerState,
  blockerMismatches, blockers, pendingGate, codeChangesSince, readText, rel, VERIFIED, STATUSES, ID, AREAS, root};

if (require.main === module) {
  const [command, argument] = process.argv.slice(2);
  try {
    const items = parseAll();
    if (command === 'list') list(items);
    else if (command === 'next') next(items);
    else if (command === 'gates') gates(items);
    else if (command === 'blockers' && (!argument || argument === '--fix')) blockers(items, argument === '--fix');
    else if (command === 'raise' && argument) raise(items, argument);
    else { console.log('usage: node scripts/roadmap.js list | next | gates | blockers [--fix] | raise <ID>'); process.exitCode = 1; }
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
  }
}
