#!/usr/bin/env node
'use strict';
// Generate documentation/card-status.md from the code, so it cannot drift:
// config.js (registry flags), sets/*.js (definitions and unfinished markers),
// the card metadata (expected cards) and documentation/card-sets.md (the
// human playability decision). tests/card-status.test.js fails when the
// committed file differs from what this script generates.
//
//   node scripts/card-status.js           rewrite documentation/card-status.md
//   node scripts/card-status.js --check   exit 1 if it is out of date
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const outFile = path.join(root, 'documentation', 'card-status.md');
const DECISIONS = ['playable', 'in-progress', 'not-implemented', 'deprecated'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// Placeholders written by scripts/scaffold_set.py. Ordinary developer TODOs in
// finished cards (for example AI improvement notes) are not unfinished work.
const SCAFFOLD_MARKER = new RegExp([
  'TODO: (Add the exact ELO|Implement effect|Add abilities or responseOn triggers|Add break and strength pump abilities)',
  '"\\.\\.\\."',
  'Resolve: function \\(\\) \\{ \\.\\.\\. \\}',
].join('|'));
const isScaffoldMarker = line => SCAFFOLD_MARKER.test(line);

function registry() {
  const context = {console};
  vm.createContext(context);
  vm.runInContext(read('config.js'), context, {filename: 'config.js'});
  return context.setRegistry;
}

function decisions() {
  const rows = new Map();
  for (const m of read('documentation/card-sets.md').matchAll(/^\|\s*`?(\w+)`?\s*\|\s*([\w-]+)\s*\|(.*)\|\s*$/gm)) {
    if (m[1] !== 'Set' && DECISIONS.includes(m[2])) rows.set(m[1], m[2]);
  }
  return rows;
}

// Map of card id -> number of scaffold markers; block text is kept in `texts`.
function definitions(file, texts = new Map()) {
  const lines = read(file).split('\n');
  const starts = [];
  lines.forEach((line, i) => { const m = line.match(/^(?:cardSet|coreSet)\[(\d+)\]\s*=/); if (m) starts.push([m[1], i]); });
  return new Map(starts.map(([id, start], k) => {
    const end = k + 1 < starts.length ? starts[k + 1][1] : lines.length;
    const block = lines.slice(start, end);
    texts.set(String(Number(id)), block.join('\n'));
    return [String(Number(id)), block.filter(isScaffoldMarker).length];
  }));
}

// How the Runner AI's keep/discard gate (_cardsWorthKeeping in ai_runner.js)
// sees each Runner Grip card: an explicit AIWorthKeeping hook, the subtype
// fallback (Console, Fracter, Decoder, Killer, AI, other Icebreaker, or
// AISpecialBreaker), or neither (excluded, so discarded first).
function runnerKeepTier(text) {
  if (!/player:\s*runner/.test(text)) return null;
  const type = (text.match(/cardType:\s*"(\w+)"/) || [])[1];
  if (!['event', 'hardware', 'program', 'resource'].includes(type)) return null;
  const subTypes = (text.match(/subTypes:\s*\[([^\]]*)\]/) || [, ''])[1];
  const intent = /\b(AIEconomyInstall|AIEconomyPlay|AIDrawInstall|AIDrawTrigger)\s*:/.test(text);
  if (/\bAIWorthKeeping\s*:/.test(text)) return {tier: 'hook', intent};
  if (/"(Console|Fracter|Decoder|Killer|AI|Icebreaker)"/.test(subTypes) || /\bAISpecialBreaker\s*:/.test(text))
    return {tier: 'fallback', intent};
  return {tier: 'none', intent};
}

function collect() {
  const reg = registry();
  const decided = decisions();
  const metadata = JSON.parse(read('carddata/carddata.json')).data;
  const sets = Object.entries(reg.availableSets).map(([key, set]) => {
    const file = 'sets/' + set.file + '.js';
    const texts = new Map();
    const defs = fs.existsSync(path.join(root, file)) ? definitions(file, texts) : new Map();
    const [lo, hi] = set.idRange || [0, -1];
    const cards = metadata.filter(card => /^\d+$/.test(card.code) && +card.code >= lo && +card.code <= hi)
      .sort((a, b) => +a.code - +b.code);
    const id = card => String(Number(card.code));
    const missing = cards.filter(card => !defs.has(id(card)));
    const unfinished = cards.filter(card => defs.get(id(card)) > 0);
    const runnerKeep = cards.map(card => ({card, keep: texts.has(id(card)) ? runnerKeepTier(texts.get(id(card))) : null}))
      .filter(entry => entry.keep);
    return {key, set, file, decision: decided.get(key) || '(none)', cards, defs, missing, unfinished, runnerKeep,
      launcher: (reg.decklauncherSets || []).includes(key)};
  });
  return sets;
}

// config.js must follow the decisions in card-sets.md; tests fail on these.
function configMismatches(sets = collect()) {
  const found = [];
  for (const s of sets) {
    const offered = s.set.hidden === false || s.launcher;
    if (s.decision === '(none)') found.push('`' + s.key + '` has no decision in card-sets.md.');
    if (s.decision === 'playable' && (s.set.hidden || s.set.untested))
      found.push('`' + s.key + '` is playable, but config.js marks it hidden: ' + s.set.hidden + ', untested: ' + s.set.untested + '.');
    if (['not-implemented', 'deprecated'].includes(s.decision) && offered)
      found.push('`' + s.key + '` is ' + s.decision + ', but config.js offers it to players (hidden: ' + s.set.hidden +
        (s.launcher ? ', in decklauncherSets' : '') + ').');
  }
  return found;
}

function generate() {
  const sets = collect();
  const out = [];
  out.push('# Card status', '');
  out.push('> Generated by `node scripts/card-status.js` from `config.js`, `sets/*.js`, the card');
  out.push('> metadata and [card-sets.md](card-sets.md). Do not edit by hand:');
  out.push('> `tests/card-status.test.js` fails when this file is out of date.', '');
  out.push('"Unfinished" means the definition still contains a placeholder written by');
  out.push('`scripts/scaffold_set.py`. A set with no unfinished markers can still be incomplete,');
  out.push('which is why playability is a decision recorded in card-sets.md.', '');
  out.push('## Sets', '');
  out.push('| Set | Decision | Cards | Defined | Missing | Unfinished | config.js hidden / untested | Deck launcher |');
  out.push('|---|---|---:|---:|---:|---:|---|---|');
  for (const s of sets) {
    out.push('| `' + s.key + '` | ' + s.decision + ' | ' + s.cards.length + ' | ' + s.defs.size + ' | ' +
      s.missing.length + ' | ' + s.unfinished.length + ' | ' + s.set.hidden + ' / ' + s.set.untested + ' | ' +
      (s.launcher ? 'yes' : 'no') + ' |');
  }

  const mismatches = configMismatches(sets);
  out.push('', '## config.js disagreements', '');
  out.push('config.js must follow card-sets.md; `tests/card-status.test.js` fails on any of these.', '');
  out.push(...(mismatches.length ? mismatches.map(m => '- ' + m) : ['None.']));

  const incomplete = sets.filter(s => s.decision === 'playable' && (s.missing.length || s.unfinished.length));
  out.push('', '## Incomplete playable sets', '');
  out.push(...(incomplete.length ? incomplete.map(s => '- `' + s.key + '`: ' + s.missing.length + ' missing and ' +
    s.unfinished.length + ' unfinished cards (listed below).') : ['None.']));

  out.push('', '## Missing and unfinished cards in playable and in-progress sets');
  for (const s of sets.filter(entry => ['playable', 'in-progress'].includes(entry.decision))) {
    out.push('', '### `' + s.key + '` (' + s.file + ')', '');
    if (!s.missing.length && !s.unfinished.length) { out.push('None.'); continue; }
    for (const card of s.missing) out.push('- ' + card.code + ' ' + card.title + ': no definition');
    for (const card of s.unfinished) out.push('- ' + card.code + ' ' + card.title + ': ' + s.defs.get(String(Number(card.code))) + ' unfinished marker(s)');
  }

  const playableSets = sets.filter(entry => entry.decision === 'playable');
  out.push('', '## Runner keep coverage (playable sets)', '');
  out.push('How `_cardsWorthKeeping()` in `ai_runner.js` sees each Runner Grip card (event,');
  out.push('hardware, program, resource): an explicit `AIWorthKeeping` hook, the subtype');
  out.push('fallback (breakers, consoles, `AISpecialBreaker`), or neither, which means the card');
  out.push('is never "worth keeping" and is discarded first. Runner roadmap items W0-W5 use these numbers.', '');
  out.push('| Set | Grip cards | AIWorthKeeping | Subtype fallback only | Neither | Intent hook without AIWorthKeeping |');
  out.push('|---|---:|---:|---:|---:|---:|');
  const total = {grip: 0, hook: 0, fallback: 0, none: 0, dead: 0};
  for (const s of playableSets) {
    const count = tier => s.runnerKeep.filter(entry => entry.keep.tier === tier).length;
    const dead = s.runnerKeep.filter(entry => entry.keep.intent && entry.keep.tier !== 'hook').length;
    const row = {grip: s.runnerKeep.length, hook: count('hook'), fallback: count('fallback'), none: count('none'), dead};
    Object.keys(total).forEach(k => { total[k] += row[k]; });
    out.push('| `' + s.key + '` | ' + row.grip + ' | ' + row.hook + ' | ' + row.fallback + ' | ' + row.none + ' | ' + row.dead + ' |');
  }
  out.push('| **Total** | ' + total.grip + ' | ' + total.hook + ' | ' + total.fallback + ' | ' + total.none + ' | ' + total.dead + ' |');
  const titled = filter => playableSets.flatMap(s => s.runnerKeep.filter(filter)
    .map(entry => entry.card.code + ' ' + entry.card.title));
  out.push('', '**Intent hook (`AIEconomyInstall`, `AIEconomyPlay`, `AIDrawInstall`, `AIDrawTrigger`) but no `AIWorthKeeping`:**', '');
  out.push(...titled(entry => entry.keep.intent && entry.keep.tier !== 'hook').map(t => '- ' + t));
  out.push('', '**Neither hook nor subtype fallback (discarded first):**', '');
  out.push(...titled(entry => entry.keep.tier === 'none').map(t => '- ' + t));
  return out.join('\n') + '\n';
}

module.exports = {generate, configMismatches, outFile, isScaffoldMarker};

if (require.main === module) {
  const text = generate();
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
    if (current !== text) { console.log('documentation/card-status.md is out of date; run node scripts/card-status.js'); process.exitCode = 1; }
    else console.log('documentation/card-status.md is up to date.');
  } else {
    fs.writeFileSync(outFile, text);
    console.log('Wrote documentation/card-status.md');
  }
}
