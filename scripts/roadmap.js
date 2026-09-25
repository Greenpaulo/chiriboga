#!/usr/bin/env node
'use strict';
// Read and update the AI roadmaps (documentation/corp-ai/roadmap.md and
// documentation/runner-ai/roadmap.md). See documentation/ai-planning.md.
//
//   node scripts/roadmap.js list          every item with its status
//   node scripts/roadmap.js next          items whose dependencies are all done
//                                         (ready, proposed, or in-progress with an open ticket)
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
const AREAS = ['corp-ai', 'runner-ai'].map(name => path.join(root, 'documentation', name))
  .filter(dir => fs.existsSync(path.join(dir, 'roadmap.md')));
const STATUSES = ['proposed', 'ready', 'in-progress', 'done', 'parked'];
const ID = /^[A-Z]\d+(?:\.\d+)*$/;

const linkTargets = text => [...String(text || '').matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]);
const resolveFrom = (dir, target) => path.resolve(dir, target.split('#')[0]);

function parseRoadmap(dir) {
  const file = path.join(dir, 'roadmap.md');
  const items = [];
  let section = null;
  let current = null;
  let inDoneTable = false;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, index) => {
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

const parseAll = () => AREAS.flatMap(parseRoadmap);

function itemPath(item) {
  const target = linkTargets(item.fields.Ticket || item.fields.Spec)[0];
  return target ? resolveFrom(item.dir, target) : null;
}

const areaName = item => path.basename(item.dir);

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

// A spec may be raised only when its claims were checked against the current
// game and AI code (documentation/ai-planning.md, "Re-grounding a spec").
function checkVerified(file) {
  const where = path.relative(root, file);
  const sha = (fs.readFileSync(file, 'utf8').match(VERIFIED) || [])[1];
  const redo = '\nRe-verify its Current behaviour and every function or hook it names against the code' +
    ' (node scripts/show.js fn <name>, rg -n), fix what is stale, then set\n  **Verified against code:** ' +
    git('rev-parse', '--short', 'HEAD').stdout.trim() + ' (' + new Date().toISOString().slice(0, 10) + ')' +
    '\ndirectly under its **Read first:** line.';
  if (!sha) throw new Error(where + ' has no **Verified against code:** line.' + redo);
  if (git('cat-file', '-e', sha + '^{commit}').status !== 0) throw new Error(where + ' was verified at unknown commit ' + sha + '.' + redo);
  const changed = git('diff', '--name-only', sha, '--', ':(glob)*.js', 'sets').stdout.trim();
  if (changed) throw new Error(where + ' was verified at ' + sha + ', but the code has changed since:\n  ' +
    changed.split('\n').join('\n  ') + redo);
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
  fs.writeFileSync(to, rebaseLinks(fs.readFileSync(to, 'utf8'), path.dirname(from), backlog));

  const lines = fs.readFileSync(item.file, 'utf8').split('\n');
  const link = path.relative(item.dir, to).split(path.sep).join('/');
  for (let i = item.line; i < lines.length && !/^#/.test(lines[i]); i++) {
    if (/^- \*\*Status:\*\*/.test(lines[i])) lines[i] = '- **Status:** ready';
    if (/^- \*\*Spec:\*\*/.test(lines[i])) lines[i] = '- **Ticket:** [' + path.basename(to) + '](' + link + ')';
  }
  fs.writeFileSync(item.file, lines.join('\n'));
  console.log('Raised ' + id + ': ' + path.relative(root, to) + ' (status ready)');
  console.log('Its claims were verified at ' + verified + ' and no game or AI code has changed since;' +
    ' implement-ticket re-verifies them when it picks the ticket up.');
}

module.exports = {parseRoadmap, parseAll, itemPath, linkTargets, resolveFrom, rebaseLinks, VERIFIED,
  STATUSES, ID, AREAS, root};

if (require.main === module) {
  const [command, id] = process.argv.slice(2);
  try {
    const items = parseAll();
    if (command === 'list') list(items);
    else if (command === 'next') next(items);
    else if (command === 'raise' && id) raise(items, id);
    else { console.log('usage: node scripts/roadmap.js list | next | raise <ID>'); process.exitCode = 1; }
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
  }
}
