#!/usr/bin/env node
'use strict';
// Build an F4 start board from a debug log (F10). Owner's guide:
// documentation/ai-batch-harness.md ("Building a start board").
//
//   node scripts/start-board.js <log> --list
//   node scripts/start-board.js <log> (--snapshot <n> | --dump) --out <name> [edits] [--force]
//
// Edits, the only changes allowed to a real board (each becomes a NOTE line
// ending in the flag that made it, so the board can be rebuilt):
//   --replace <fromId>=<toId> --reason "<text>"  a card that crashes the engine or is
//                                  outside the pool's sets; never the Runner's rig or a
//                                  hosted card. Installed ICE is allowed, and named.
//   --unsteal <agendaId>=<remote>  move a stolen agenda back into Remote <remote>'s root
//   --unscore <agendaId>=<remote>  the same for an agenda in the Corp's score area
//   --setup "<statements>"         credits and clicks only, e.g. "corp.creditPool=12"
//   --note "<text>"                a description; changes nothing
const fs = require('fs');
const os = require('os');
const path = require('path');
const {parseSnapshots} = require('../tests/extract-fixture');
const {playGame, readFixture, root} = require('./ai-batch/headless');

const STARTS_DIR = path.join(root, 'tests', 'fixtures', 'ai-batch', 'starts');
const POOL = require(path.join(root, 'tests', 'fixtures', 'ai-batch', 'deck-pool.json'));
const SETUP_STATEMENT = /^(corp|runner)\.(creditPool|clickTracker)=\d+$/;
const TEXTURES = {runner: 'cardBackTexturesRunner,glowTextures,strengthTextures',
  corp: 'cardBackTexturesCorp,glowTextures,strengthTextures'};
// RunnerTestField and CorpTestField data arguments, in order.
const RUNNER_ARGS = ['identity', 'heap', 'stack', 'grip', 'installed', 'stolen'];
const CORP_ARGS = ['identity', 'archivesCards', 'rndCards', 'hqCards', 'archivesInstalled', 'rndInstalled',
  'hqInstalled', 'remotes', 'scored'];

// ---- reading the source ----

function snapshotsOf(text) {
  return parseSnapshots(text);
}

// The board code: snapshot n's reproduction lines, or the end-of-log dump.
function sourceCode(text, source) {
  let lines;
  if (source.snapshot !== undefined) {
    const snapshot = snapshotsOf(text).find(s => String(s.n) === String(source.snapshot));
    if (!snapshot) throw new Error('No decision snapshot ' + source.snapshot + ' in the log (--list shows them)');
    // Directives (including a SETUP describing the run in progress) do not
    // apply to a board that starts at the Corp's action phase.
    lines = snapshot.body.split('\n').filter(l => l.trim() && !/^\/\//.test(l.trim()));
  } else {
    const all = text.replace(/\r/g, '').split('\n');
    const start = all.map((l, i) => /^RunnerTestField\(/.test(l) ? i : -1).filter(i => i >= 0).pop();
    if (start === undefined) throw new Error('The log has no RunnerTestField(...) dump');
    lines = [];
    for (let i = start; i < all.length && !/^Version reference:/.test(all[i]); i++) if (all[i].trim()) lines.push(all[i]);
  }
  if (!/^RunnerTestField\(/.test(lines[0] || '') || !/^CorpTestField\(/.test(lines[1] || ''))
    throw new Error('The board must start with RunnerTestField(...) and CorpTestField(...) lines');
  return lines;
}

function parseField(line, names) {
  const inner = line.slice(line.indexOf('(') + 1, line.lastIndexOf(')'));
  const values = JSON.parse('[' + inner.replace(/\b(cardBackTextures(Runner|Corp)|glowTextures|strengthTextures)\b/g, 'null') + ']');
  const out = {};
  names.forEach((name, i) => { out[name] = values[i]; });
  return out;
}

function writeField(name, field, names, textures) {
  return name + '(' + names.map(n => JSON.stringify(field[n])).join(', ') + ', ' + textures + ');';
}

function parseBoard(lines) {
  return {runner: parseField(lines[0], RUNNER_ARGS), corp: parseField(lines[1], CORP_ARGS), rest: lines.slice(2)};
}

function boardLines(board) {
  return [writeField('RunnerTestField', board.runner, RUNNER_ARGS, TEXTURES.runner),
    writeField('CorpTestField', board.corp, CORP_ARGS, TEXTURES.corp), ...board.rest];
}

// ---- loading a board in the engine (tags and validation) ----

const PROBE = `
  var __probeIce = [], __probeServers = [['HQ', corp.HQ], ['R&D', corp.RnD], ['Archives', corp.archives]];
  for (var __i = 0; __i < corp.remoteServers.length; __i++) __probeServers.push(['Remote ' + __i, corp.remoteServers[__i]]);
  __probeServers.forEach(function(s) { s[1].ice.forEach(function(c) { __probeIce.push({id: c.setNumber, server: s[0], ice: c}); }); });
  var __probeRig = runner.rig.programs.concat(runner.rig.hardware, runner.rig.resources);
  var __probeHosted = [];
  __probeIce.forEach(function(e) { (e.ice.hostedCards || []).forEach(function(h) { __probeHosted.push(h.setNumber); }); });
  var __probeResult = {
    iceIds: __probeIce.map(function(e) { return [e.id, e.server]; }),
    runnerIds: __probeRig.map(function(c) { return c.setNumber; }).concat(__probeHosted),
    tags: {
      'hosted-card-on-ice': __probeIce.some(function(e) { return (e.ice.hostedCards || []).length > 0; }),
      'unrezzed-ice': __probeIce.some(function(e) { return !e.ice.rezzed; }),
      'breaker-installed': runner.rig.programs.some(function(c) { return CheckSubType(c, 'Icebreaker'); }),
      'agenda-in-remote': corp.remoteServers.some(function(s) { return s.root.some(function(c) { return c.cardType === 'agenda'; }); }),
      'tagged-runner': runner.tags > 0,
    },
  };
  __report = function() { return __probeResult; };`;

// Load the board's code as a start fixture, before any turn is played.
async function inspect(code, setup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'start-board-'));
  try {
    const fixture = path.join(dir, 'board.txt'), probe = path.join(dir, 'probe.js');
    fs.writeFileSync(fixture, (setup ? '// SETUP: ' + setup + '\n' : '') + code.join('\n') + '\n');
    fs.writeFileSync(probe, PROBE);
    const pair = POOL.pairs[0];
    const game = await playGame({streamPrefix: 'start-board', corpFile: pair.corp, runnerFile: pair.runner,
      setFiles: POOL.sets.map(s => 'sets/' + s + '.js'), timeoutMs: 1, start: fixture, setupFile: probe});
    const fixtureErrors = game.errors.filter(e => /^fixture |TypeError|ReferenceError|SyntaxError/.test(e));
    if (fixtureErrors.length || !game.report) throw new Error('The board does not load: ' + (fixtureErrors.join('; ') || 'no probe result'));
    return game.report;
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

// ---- edits ----

function replaceIds(value, from, to) {
  if (Array.isArray(value)) return value.map(v => replaceIds(v, from, to));
  return value === from ? to : value;
}

function moveAgenda(list, board, id, remote, what) {
  const index = list.indexOf(id);
  if (index < 0) throw new Error(`Card ${id} is not in the ${what}`);
  if (!Array.isArray(board.corp.remotes[remote])) throw new Error('No Remote ' + remote + ' on the board');
  list.splice(index, 1);
  board.corp.remotes[remote].push(id);
  return index;
}

// Lines that refer to a score-area entry that moved: drop that entry's lines
// and shift later indices down.
function shiftScoreArea(rest, owner, removed) {
  const pattern = new RegExp('\\b' + owner + '\\.scoreArea\\[(\\d+)\\]', 'g');
  return rest.filter(line => ![...line.matchAll(pattern)].some(m => Number(m[1]) === removed))
    .map(line => line.replace(pattern, (m, i) => owner + '.scoreArea[' + (Number(i) > removed ? Number(i) - 1 : i) + ']'));
}

function applyEdits(board, edits, original) {
  const notes = [];
  let setup = null;
  for (const edit of edits) {
    if (edit.flag === '--replace') {
      const [from, to] = edit.value.split('=').map(Number);
      if (!from || !to) throw new Error('--replace needs <fromId>=<toId>');
      if (!edit.reason) throw new Error('--replace needs --reason (an engine crash, or a card outside the pool\'s sets)');
      if (original.runnerIds.includes(from)) throw new Error(`--replace ${from}: the Runner's rig and hosted cards decide outcomes and cannot be replaced`);
      board.runner = Object.fromEntries(Object.entries(board.runner).map(([k, v]) => [k, replaceIds(v, from, to)]));
      board.corp = Object.fromEntries(Object.entries(board.corp).map(([k, v]) => [k, replaceIds(v, from, to)]));
      board.rest = board.rest.map(l => l.replace(new RegExp('InstanceCardsPush\\(' + from + ','), 'InstanceCardsPush(' + to + ','));
      const iceAt = original.iceIds.filter(([id]) => id === from).map(([, server]) => server);
      notes.push(edit.reason + (iceAt.length ? ` (installed ICE on ${[...new Set(iceAt)].join(', ')})` : '') + ` [--replace ${from}=${to}]`);
    } else if (edit.flag === '--unsteal' || edit.flag === '--unscore') {
      const [id, remote] = edit.value.split('=').map(Number);
      const runnerSide = edit.flag === '--unsteal';
      const list = runnerSide ? board.runner.stolen : board.corp.scored;
      const removed = moveAgenda(list, board, id, remote, runnerSide ? "Runner's score area" : "Corp's score area");
      board.rest = shiftScoreArea(board.rest, runnerSide ? 'runner' : 'corp', removed);
      notes.push(`Card ${id} moved from the ${runnerSide ? "Runner's" : "Corp's"} score area back to Remote ${remote}, as before the decision [${edit.flag} ${edit.value}]`);
    } else if (edit.flag === '--setup') {
      const statements = edit.value.split(';').map(s => s.trim()).filter(Boolean);
      const bad = statements.filter(s => !SETUP_STATEMENT.test(s));
      if (bad.length) throw new Error('--setup allows credits and clicks only (corp|runner.creditPool|clickTracker=<n>): ' + bad.join('; '));
      setup = statements.join('; ');
    } else if (edit.flag === '--note') {
      notes.push(edit.value + ' [--note]');
    } else throw new Error('Unknown edit ' + edit.flag);
  }
  return {notes, setup};
}

// ---- building ----

async function build({log, source, edits}) {
  const text = fs.readFileSync(path.resolve(root, log), 'utf8');
  const board = parseBoard(sourceCode(text, source));
  const original = await inspect(boardLines(board), null);
  const {notes, setup} = applyEdits(board, edits, original);
  const code = boardLines(board);
  const final = await inspect(code, setup);
  const tags = Object.keys(final.tags).filter(t => final.tags[t]);
  return [
    `// SOURCE: ${path.relative(root, path.resolve(root, log))} ${source.snapshot !== undefined ? 'snapshot ' + source.snapshot : 'dump'}`,
    `// TAGS: ${tags.join(', ')}`,
    ...notes.map(n => '// NOTE: ' + n),
    ...(setup ? ['// SETUP: ' + setup] : []),
    ...code,
  ].join('\n') + '\n';
}

// The build arguments recorded in a board's SOURCE, NOTE and SETUP lines.
function recordedArgs(boardText) {
  const lines = boardText.split('\n');
  const source = (/^\/\/ SOURCE: (\S+) (dump|snapshot (\S+))$/.exec(lines.find(l => l.startsWith('// SOURCE: ')) || '') || []);
  if (!source[1]) throw new Error('The board has no builder SOURCE line');
  const edits = [];
  for (const line of lines) {
    const note = /^\/\/ NOTE: (.*) \[(--\w+)(?: ([^\]]+))?\]$/.exec(line);
    if (note) {
      if (note[2] === '--replace') edits.push({flag: '--replace', value: note[3], reason: note[1].replace(/ \(installed ICE on [^)]*\)$/, '')});
      else if (note[2] === '--note') edits.push({flag: '--note', value: note[1]});
      else edits.push({flag: note[2], value: note[3]});
    }
    const setup = /^\/\/ SETUP: (.*)$/.exec(line);
    if (setup) edits.push({flag: '--setup', value: setup[1]});
  }
  return {log: source[1], source: source[3] !== undefined ? {snapshot: source[3]} : {dump: true}, edits};
}

// True when a committed board is exactly what the builder makes from its
// recorded arguments, i.e. it was not edited by hand.
async function rebuildMatches(file) {
  const text = fs.readFileSync(file, 'utf8');
  return (await build(recordedArgs(text))) === text;
}

function parseCli(argv) {
  const out = {edits: []};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--list' || arg === '--dump' || arg === '--force') out[arg.slice(2)] = true;
    else if (arg === '--snapshot' || arg === '--out') out[arg.slice(2)] = argv[++i];
    else if (arg === '--reason') {
      const last = out.edits[out.edits.length - 1];
      if (!last || last.flag !== '--replace') throw new Error('--reason must follow a --replace');
      last.reason = argv[++i];
    } else if (['--replace', '--unsteal', '--unscore', '--setup', '--note'].includes(arg)) out.edits.push({flag: arg, value: argv[++i]});
    else if (arg.startsWith('--')) throw new Error('Unknown option ' + arg);
    else out.log = arg;
  }
  return out;
}

async function main() {
  const args = parseCli(process.argv.slice(2));
  if (!args.log) throw new Error('usage: node scripts/start-board.js <log> --list | (--snapshot <n> | --dump) --out <name> [edits]');
  const text = fs.readFileSync(path.resolve(args.log), 'utf8');
  if (args.list) {
    const snapshots = snapshotsOf(text);
    if (!snapshots.length) console.log('No decision snapshots; use --dump for the end-of-log board.');
    for (const s of snapshots) console.log(`${s.n}: ${s.identifier} options [${s.options}] chose ${s.chosen}`);
    return;
  }
  if ((args.snapshot !== undefined) === Boolean(args.dump)) {
    const n = snapshotsOf(text).map(s => s.n);
    throw new Error('Choose the source: --snapshot <n>' + (n.length ? ' (this log has ' + n.join(', ') + ')' : ' (this log has none)') + ' or --dump');
  }
  if (!args.out) throw new Error('--out <name> is required');
  const out = path.join(STARTS_DIR, args.out.replace(/\.txt$/, '') + '.txt');
  if (fs.existsSync(out) && !args.force) throw new Error(path.relative(root, out) + ' exists (use --force to replace it)');
  const board = await build({log: args.log, source: args.dump ? {dump: true} : {snapshot: args.snapshot}, edits: args.edits});
  fs.mkdirSync(STARTS_DIR, {recursive: true});
  fs.writeFileSync(out, board);
  console.log('Wrote ' + path.relative(root, out));
  console.log(board.split('\n').filter(l => /^\/\/ (TAGS|NOTE|SETUP):/.test(l)).join('\n'));
}

module.exports = {build, recordedArgs, rebuildMatches, parseCli, STARTS_DIR};

if (require.main === module) main().then(() => process.exit(0), error => { console.error(error.message); process.exit(1); });
