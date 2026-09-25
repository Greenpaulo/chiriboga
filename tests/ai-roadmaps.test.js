// Run with: node tests/ai-roadmaps.test.js
// Keeps the AI roadmaps (documentation/corp-ai, documentation/runner-ai)
// consistent so agents can trust them: statuses match where tickets live,
// every spec and ticket belongs to exactly one item, dependencies exist, and
// each architecture.md names only real code. See documentation/ai-planning.md.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {parseAll, itemPath, gatedItems, linkTargets, resolveFrom, VERIFIED, STATUSES, AREAS, root} =
  require('../scripts/roadmap.js');

const problems = [];
const check = (ok, message) => { if (!ok) problems.push(message); };
const rel = file => path.relative(root, file);
const inDone = file => file.split(path.sep).includes('done');

const items = parseAll();
const byId = new Map();
for (const item of items) {
  check(!byId.has(item.id), item.id + ' appears more than once across the roadmaps');
  byId.set(item.id, item);
}

// Headings in each area's architecture.md, as GitHub anchors.
const architectures = new Map(AREAS.map(dir => [dir, fs.existsSync(path.join(dir, 'architecture.md')) ?
  fs.readFileSync(path.join(dir, 'architecture.md'), 'utf8') : '']));
const anchorsOf = dir => new Set(architectures.get(dir).split('\n').filter(line => /^#{1,6} /.test(line)).map(line =>
  line.replace(/^#+ /, '').trim().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-')));

const TEMPLATE = ['## Goal', '## Current behaviour', '## Design', '## Safety and information boundary',
  '## Test scenarios', '## Acceptance gate', '## Acceptance criteria'];
function checkTemplate(file, id) {
  const text = fs.readFileSync(file, 'utf8');
  const header = text.match(/^\*\*Roadmap item:\*\* (\S+) · \*\*Depends on:\*\* (.+?) · \*\*Sets:\*\* .+$/m);
  check(header, rel(file) + ' lacks the "**Roadmap item:** … · **Depends on:** … · **Sets:** …" header');
  if (!header) return;
  check(header[1] === id, rel(file) + ' says Roadmap item ' + header[1] + ' but roadmap.md links it from ' + id);
  const deps = header[2].trim() === 'none' ? [] : header[2].split(',').map(s => s.trim());
  const listed = byId.get(id).depends;
  check(deps.join(',') === listed.join(','), rel(file) + ' depends on "' + deps.join(', ') +
    '" but roadmap.md says "' + (listed.join(', ') || 'none') + '"');
  // Optional until every spec is re-grounded: when present, it sits directly
  // under **Read first:** and names a real commit (ai-planning.md, "Re-grounding a spec").
  const verified = text.match(/^\*\*Verified against code:\*\*.*$/m);
  if (verified) {
    const sha = (verified[0].match(VERIFIED) || [])[1];
    check(sha && spawnSync('git', ['cat-file', '-e', sha + '^{commit}'], {cwd: root}).status === 0,
      rel(file) + ' has "' + verified[0] + '"; use "**Verified against code:** <short sha> (<date>)" with a real commit');
    check(/^\*\*Read first:\*\*.*\n\*\*Verified against code:\*\*/m.test(text),
      rel(file) + ' must put its **Verified against code:** line directly under **Read first:**');
  }
  let last = -1;
  for (const heading of TEMPLATE) {
    const at = text.indexOf('\n' + heading + '\n');
    check(at > last, rel(file) + ' is missing "' + heading + '" or has it out of template order');
    if (at > last) last = at;
  }
}

const referenced = new Set();
for (const item of items) {
  const where = path.basename(item.dir) + '/roadmap.md ' + item.id;
  check(STATUSES.includes(item.status), where + ' has unknown status "' + item.status + '"');
  for (const dep of item.depends) check(byId.has(dep), where + ' depends on unknown item ' + dep);

  if (item.status === 'done' && !item.fields.Status) {
    // Done-table row: delivered-by links must point at closed tickets, and the
    // architecture link must resolve.
    for (const target of linkTargets(item.fields['Delivered by'])) {
      const file = resolveFrom(item.dir, target);
      check(fs.existsSync(file), where + ' links to missing ' + rel(file));
      check(!/documentation\/(backlog|bugs)\//.test(rel(file)) || inDone(file),
        where + ' is done but its ticket ' + rel(file) + ' is not in a done/ folder');
      referenced.add(file);
    }
    const arch = linkTargets(item.fields.Architecture)[0] || '';
    const anchor = arch.split('#')[1];
    check(arch.startsWith('architecture.md#') && anchorsOf(item.dir).has(anchor),
      where + ' needs an Architecture link to an existing architecture.md section (got "' + arch + '")');
    continue;
  }

  check(item.fields.Goal, where + ' needs a Goal');
  check(item.fields['Depends on'] !== undefined, where + ' needs "Depends on" (use "none")');
  const hasTicket = !!item.fields.Ticket;
  const hasSpec = !!item.fields.Spec;
  check(hasTicket !== hasSpec, where + ' needs exactly one of Ticket or Spec');
  if (item.status === 'proposed') check(hasSpec, where + ' is proposed, so it needs a Spec (not a Ticket)');
  if (['ready', 'in-progress'].includes(item.status)) check(hasTicket, where + ' is ' + item.status + ', so it needs a Ticket');
  if (item.status === 'parked') check(item.fields['Parked because'], where + ' is parked, so it needs "Parked because"');

  const file = itemPath(item);
  if (!file) continue;
  referenced.add(file);
  check(fs.existsSync(file), where + ' links to missing ' + rel(file));
  if (!fs.existsSync(file)) continue;
  if (hasSpec) check(path.dirname(file) === path.join(item.dir, 'specs'), where + ' spec must live in its area\'s specs/ folder');
  if (hasTicket) check(!inDone(file), where + ' is ' + item.status + ' but its ticket is in done/; mark it done');
  const inReview = ['code-review', 'remediation'].some(folder => file.split(path.sep).includes(folder));
  if (hasTicket && inReview) check(item.status === 'in-progress', where + ' has its ticket in ' +
    path.basename(path.dirname(file)) + '/ but status ' + item.status + '; set it to in-progress');
  if (hasSpec || /\*\*Roadmap item:\*\*/.test(fs.readFileSync(file, 'utf8'))) checkTemplate(file, item.id);
}

// Every spec file and every ticket that declares a roadmap item must be linked from that item.
for (const dir of AREAS) {
  const specDir = path.join(dir, 'specs');
  if (!fs.existsSync(specDir)) continue;
  for (const name of fs.readdirSync(specDir).filter(f => /^[A-Z]\d/.test(f))) {
    check(referenced.has(path.join(specDir, name)), rel(path.join(specDir, name)) + ' is not linked from any roadmap item');
  }
}
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry =>
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
}
for (const file of walk(path.join(root, 'documentation', 'backlog')).filter(f => f.endsWith('.md'))) {
  const declared = (fs.readFileSync(file, 'utf8').match(/^\*\*Roadmap item:\*\* (\S+)/m) || [])[1];
  if (!declared) continue;
  const item = byId.get(declared);
  check(item, rel(file) + ' declares unknown roadmap item ' + declared);
  if (!item) continue;
  check(referenced.has(file), rel(file) + ' declares ' + declared + ' but no roadmap links it');
  check(inDone(file) === (item.status === 'done'), rel(file) + ' is ' + (inDone(file) ? '' : 'not ') +
    'in done/ but ' + declared + ' is ' + item.status);
}

// An item judged by seeded games (an on/off comparison or another F4 check)
// must depend on F4, directly or through its dependencies, so that
// `roadmap.js next` never offers it before its gate can be run.
const reachesF4 = (id, seen = new Set()) => (byId.get(id) || {depends: []}).depends.some(dep =>
  dep === 'F4' || (!seen.has(dep) && seen.add(dep) && reachesF4(dep, seen)));
for (const gated of gatedItems(items)) {
  if (['on/off', 'other'].includes(gated.kind))
    check(reachesF4(gated.item.id), gated.item.id + ' is judged by seeded games but does not depend on F4');
}

// Every code-like name in each architecture.md must exist in the code.
const code = ['ai_corp.js', 'ai_runner.js', 'runcalculator.js', 'utility.js', 'mechanics.js', 'phase.js', 'checks.js']
  .map(f => fs.readFileSync(path.join(root, f), 'utf8'))
  .concat(fs.readdirSync(path.join(root, 'sets')).map(f => fs.readFileSync(path.join(root, 'sets', f), 'utf8')))
  .join('\n');
let nameCount = 0;
for (const [dir, architecture] of architectures) {
  const names = new Set();
  for (const match of architecture.replace(/```[\s\S]*?```/g, '').matchAll(/`([^`\n]+)`/g)) {
    const id = match[1].trim().match(/^([A-Za-z_$][\w$]*)(\(.*\))?$/);
    if (id) names.add(id[1]);
  }
  nameCount += names.size;
  const missing = [...names].filter(name => !new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b').test(code));
  check(!missing.length, path.basename(dir) + '/architecture.md names code that does not exist: ' + missing.join(', '));
}

assert.deepStrictEqual(problems, [], 'AI roadmaps are inconsistent:\n  ' + problems.join('\n  '));
console.log('AI roadmaps: ' + items.length + ' items and ' + nameCount + ' architecture names consistent.');
