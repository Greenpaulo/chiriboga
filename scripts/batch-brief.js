#!/usr/bin/env node
'use strict';
// Compact starting brief for one card batch, so an agent does not read the
// 2 MB card metadata file or browse other sets for examples.
//
//   node scripts/batch-brief.js          the batch the tracker selects next
//   node scripts/batch-brief.js <n>      batch n
//
// For each card: printed stats and text, where its stub is and how many
// unfinished markers remain, and the most similar fully implemented cards in other sets. Read a
// suggested example with `node scripts/show.js card <id>`.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const tracker = read('documentation/new-sets/current-set-implementation.md');

const field = name => {
  const match = tracker.match(new RegExp('^\\|\\s*' + name + '\\s*\\|\\s*(.+?)\\s*\\|\\s*$', 'm'));
  return match ? match[1].replace(/`/g, '').trim() : null;
};
if (field('Status') !== 'Active') { console.log('Tracker status is not Active; no batch to brief.'); process.exit(1); }
const definitionFile = field('Definition file');
const metadataFile = field('Metadata file');
const packCode = field('Pack code');

const batches = [...tracker.matchAll(/^\|\s*(\d+)\s*\|\s*(\d+)\s*[–-]\s*(\d+)\s*\|\s*([A-Za-z ]+?)\s*\|/gm)]
  .map(m => ({n: Number(m[1]), first: Number(m[2]), last: Number(m[3]), status: m[4]}));
const requested = process.argv[2] ? Number(process.argv[2]) : null;
const batch = requested !== null
  ? batches.find(b => b.n === requested)
  : batches.find(b => b.status === 'In progress') || batches.find(b => b.status === 'Pending');
if (!batch) { console.log(requested !== null ? 'No batch ' + requested + ' in the tracker.' : 'No In progress or Pending batch.'); process.exit(1); }

// Index every card definition in sets/*.js: file, line, and unfinished markers
// (TODO comments or the scaffold's "..." placeholders).
const definitions = new Map();
for (const file of fs.readdirSync(path.join(root, 'sets')).filter(f => f.endsWith('.js'))) {
  const lines = read('sets/' + file).split('\n');
  const starts = [];
  lines.forEach((line, i) => { const m = line.match(/^cardSet\[(\d+)\]\s*=/); if (m) starts.push([m[1], i]); });
  starts.forEach(([id, start], k) => {
    const end = k + 1 < starts.length ? starts[k + 1][1] : lines.length;
    const todos = lines.slice(start, end).filter(line => /TODO|"\.\.\."/.test(line)).length;
    definitions.set(id, {file: 'sets/' + file, line: start + 1, todos});
  });
}

const cards = JSON.parse(read(metadataFile)).data;
const byCode = new Map(cards.map(card => [card.code, card]));
const words = text => (text || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean);
const bigrams = card => {
  const w = words(card.stripped_text);
  const set = new Set();
  for (let i = 0; i + 1 < w.length; i++) set.add(w[i] + ' ' + w[i + 1]);
  return set;
};
const implemented = [];
const seenTitles = new Set();
for (const card of cards) {
  const def = definitions.get(card.code);
  if (!def || def.todos || card.pack_code === packCode || seenTitles.has(card.title)) continue;
  seenTitles.add(card.title);
  implemented.push({card, def, grams: bigrams(card)});
}
function similar(card, count) {
  const grams = bigrams(card);
  if (!grams.size) return [];
  return implemented.map(entry => {
    let shared = 0;
    for (const g of grams) if (entry.grams.has(g)) shared++;
    const score = shared / (grams.size + entry.grams.size - shared) + (entry.card.type_code === card.type_code ? 0.05 : 0);
    return {entry, score};
  }).filter(r => r.score > 0.08).sort((a, b) => b.score - a.score).slice(0, count);
}

const stats = card => [
  card.cost !== undefined && card.cost !== null ? 'cost ' + card.cost : null,
  card.strength !== undefined && card.strength !== null ? 'str ' + card.strength : null,
  card.memory_cost ? 'mu ' + card.memory_cost : null,
  card.advancement_cost ? 'adv ' + card.advancement_cost : null,
  card.agenda_points ? 'pts ' + card.agenda_points : null,
  card.trash_cost !== undefined && card.trash_cost !== null ? 'trash ' + card.trash_cost : null,
  card.base_link !== undefined && card.base_link !== null ? 'link ' + card.base_link : null,
  card.minimum_deck_size ? 'deck ' + card.minimum_deck_size + '/' + card.influence_limit : null,
].filter(Boolean).join(', ');

console.log('Batch ' + batch.n + ' (' + batch.first + '–' + batch.last + ', ' + batch.status + ') of ' +
  field('Set name') + ' in ' + definitionFile + '\n');
for (let id = batch.first; id <= batch.last; id++) {
  const card = byCode.get(String(id));
  if (!card) { console.log(id + ': no metadata in ' + metadataFile + '\n'); continue; }
  const def = definitions.get(String(id));
  console.log(id + ' ' + card.title + (card.uniqueness ? ' (unique)' : '') + ' — ' + card.side_code + ' ' + card.type_code +
    (card.keywords ? ': ' + card.keywords : '') + ' | ' + card.faction_code +
    (card.faction_cost ? ' ' + card.faction_cost + ' inf' : '') + (stats(card) ? ' | ' + stats(card) : ''));
  console.log('  Text: ' + (card.stripped_text || '(none)'));
  console.log('  Stub: ' + (def ? def.file + ':' + def.line + (def.todos ? ' (' + def.todos + ' unfinished markers)' : ' (no unfinished markers)') : 'missing'));
  const matches = similar(card, 3);
  if (matches.length) console.log('  Similar: ' + matches.map(({entry}) =>
    entry.card.code + ' ' + entry.card.title + ' (' + entry.def.file + ':' + entry.def.line + ')').join('; '));
  console.log();
}
console.log('Read an example with: node scripts/show.js card <id>');
