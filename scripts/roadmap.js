#!/usr/bin/env node
'use strict';
// Read and update documentation/corp-ai/roadmap.md.
//
//   node scripts/roadmap.js list          every item with its status
//   node scripts/roadmap.js next          items whose dependencies are all done
//   node scripts/roadmap.js raise <ID>    move a proposed item's spec into
//                                         documentation/backlog/ and mark it ready
//
// tests/corp-ai-roadmap.test.js uses parseRoadmap() to keep the roadmap,
// specs and tickets consistent.
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const docDir = path.join(root, 'documentation', 'corp-ai');
const roadmapFile = path.join(docDir, 'roadmap.md');
const STATUSES = ['proposed', 'ready', 'in-progress', 'done', 'parked'];
const ID = /^[LFIRP]\d+(?:\.\d+)*$/;

const linkTargets = text => [...String(text || '').matchAll(/\]\(([^)]+)\)/g)].map(m => m[1]);
const resolveFromDocs = target => path.resolve(docDir, target.split('#')[0]);

function parseRoadmap(text = fs.readFileSync(roadmapFile, 'utf8')) {
  const items = [];
  let area = null;
  let current = null;
  let inDoneTable = false;
  text.split('\n').forEach((line, index) => {
    const areaMatch = line.match(/^## (.+)$/);
    if (areaMatch) { area = areaMatch[1]; current = null; inDoneTable = false; return; }
    const heading = line.match(/^### (\S+) (.+)$/);
    if (heading && ID.test(heading[1])) {
      current = {id: heading[1], title: heading[2].trim(), area, line: index + 1, fields: {}, status: null, depends: []};
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
    const row = line.match(/^\|\s*([LFIRP]\d+(?:\.\d+)*)\s*\|(.*)\|\s*$/);
    if (row && inDoneTable) {
      const cells = row[2].split('|').map(s => s.trim());
      items.push({id: row[1], title: cells[0], area, line: index + 1, status: 'done', depends: [],
        fields: {'Delivered by': cells[1] || '', Architecture: cells[2] || ''}});
    }
  });
  return items;
}

function itemPath(item) {
  const target = linkTargets(item.fields.Ticket || item.fields.Spec)[0];
  return target ? resolveFromDocs(target) : null;
}

function list(items) {
  for (const item of items)
    console.log(item.id.padEnd(7) + item.status.padEnd(12) + item.title);
}

function next(items) {
  const byId = new Map(items.map(item => [item.id, item]));
  const ready = items.filter(item => ['ready', 'proposed'].includes(item.status) &&
    item.depends.every(dep => byId.has(dep) && byId.get(dep).status === 'done'));
  if (!ready.length) { console.log('No item has all its dependencies done.'); return; }
  for (const item of ready) {
    const file = itemPath(item);
    console.log(item.id.padEnd(7) + item.status.padEnd(10) + item.title +
      (file ? '\n       ' + path.relative(root, file) : ''));
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

function raise(items, id) {
  const item = items.find(entry => entry.id === id);
  if (!item) throw new Error('No roadmap item ' + id);
  if (item.status !== 'proposed' || !item.fields.Spec) throw new Error(id + ' is ' + item.status + ', not a proposed item with a spec');
  const from = itemPath(item);
  const backlog = path.join(root, 'documentation', 'backlog');
  const to = path.join(backlog, path.basename(from));
  if (fs.existsSync(to)) throw new Error(path.relative(root, to) + ' already exists');
  const moved = spawnSync('git', ['mv', from, to], {cwd: root, encoding: 'utf8'});
  if (moved.status !== 0) fs.renameSync(from, to);
  fs.writeFileSync(to, rebaseLinks(fs.readFileSync(to, 'utf8'), path.dirname(from), backlog));

  const lines = fs.readFileSync(roadmapFile, 'utf8').split('\n');
  const start = item.line - 1;
  for (let i = start + 1; i < lines.length && !/^#/.test(lines[i]); i++) {
    if (/^- \*\*Status:\*\*/.test(lines[i])) lines[i] = '- **Status:** ready';
    if (/^- \*\*Spec:\*\*/.test(lines[i])) {
      lines[i] = '- **Ticket:** [' + path.basename(to) + '](../backlog/' + path.basename(to) + ')';
    }
  }
  fs.writeFileSync(roadmapFile, lines.join('\n'));
  console.log('Raised ' + id + ': ' + path.relative(root, to) + ' (status ready)');
}

module.exports = {parseRoadmap, itemPath, linkTargets, resolveFromDocs, STATUSES, ID, docDir, root};

if (require.main === module) {
  const [command, id] = process.argv.slice(2);
  try {
    const items = parseRoadmap();
    if (command === 'list') list(items);
    else if (command === 'next') next(items);
    else if (command === 'raise' && id) raise(items, id);
    else { console.log('usage: node scripts/roadmap.js list | next | raise <ID>'); process.exitCode = 1; }
  } catch (error) {
    console.log(error.message);
    process.exitCode = 1;
  }
}
