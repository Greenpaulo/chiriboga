// Run with: node tests/corp-ai-card-titles.test.js
// Enforces documentation/ai-principles.md principle 2 (hooks, not card titles)
// for ai_corp.js. Every string literal that equals a card title (from
// carddata/carddata.json, the metadata scripts/card-status.js uses, plus the
// titles defined in sets/*.js) is reported as "<method>: <title>".
//
// LEGACY_TITLES is a ratchet over roadmap item P1
// (documentation/backlog/corp_ai_finding_13_legacy_title_lists.md):
// - a pair not listed here fails the test (do not add title checks; add a hook);
// - a listed pair that no longer occurs is reported in the summary line, so the
//   entry can be deleted and the matching P1 row ticked.
// Comments are ignored. Set VERBOSE=1 to list every occurrence with its line.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;

const LEGACY_TITLES = [
  '_iceIsDisabled: Femme Fatale',
  '_iceInstallScore: Palisade',
  '_advancementLimit: SanSan City Grid',
  '_bestRecurToHQOption: Snare!',
  '_potentialDamageOnBreach: Hokusai Grid',
  '_potentialDamageOnBreach: House of Knives',
  '_potentialDamageOnBreach: Jinteki: Personal Evolution',
  '_potentialDamageOnBreach: Snare!',
  '_potentialDamageOnBreach: Urtica Cipher',
  '_cardProtectionValue: Ice Wall',
  '_emptyProtectedRemotes: Trick of Light',
  '_economyCards: Celebrity Gift',
  '_economyCards: Government Subsidy',
  '_economyCards: Hansei Review',
  '_economyCards: Hedge Fund',
  '_economyCards: Marilyn Campaign',
  '_economyCards: Nico Campaign',
  '_economyCards: PAD Campaign',
  '_economyCards: Predictive Planogram',
  '_economyCards: Regolith Mining License',
  '_economyCards: Subliminal Messaging',
  '_bestMainPhaseEconomyOption: Daily Business Show',
  '_bestMainPhaseEconomyOption: Oaktown Renovation',
  '_bestMainPhaseEconomyOption: Predictive Planogram',
  '_bestMainPhaseEconomyOption: Spin Doctor',
  '_bestMainPhaseEconomyOption: Sprint',
  '_rankedInstallOptions: Snare!',
  '_iceWorthRezzing: Inside Job',
  'Phase_Movement: Spin Doctor',
  'Phase_EOT: Clearinghouse',
  'Phase_EOT: Corporate Town',
  'Phase_EOT: Daily Business Show',
  'Phase_EOT: Marilyn Campaign',
  'Phase_EOT: Nico Campaign',
  'Phase_EOT: PAD Campaign',
  'Phase_EOT: Spin Doctor',
  'Phase_PostAction: Regolith Mining License',
  'Phase_PostAction: Reversed Accounts',
  'Phase_PostAction: Ronin',
  'Phase_PostAction: SanSan City Grid',
  '_potentialOperationDamageDirections: Archived Memories',
  '_potentialOperationDamageDirections: Biotic Labor',
  '_potentialOperationDamageDirections: Neurospike',
  '_potentialOperationDamageDirections: Punitive Counterstrike',
  '_potentialOperationDamageThisTurn: Neurospike',
  '_potentialOperationDamageThisTurn: Punitive Counterstrike',
  '_potentialAdvancementDirections: Biotic Labor',
  '_potentialAdvancementDirections: Oaktown Renovation',
  '_potentialAdvancementDirections: Psychographics',
  '_potentialAdvancementDirections: Seamless Launch',
  '_potentialAdvancementDirections: Trick of Light',
  '_potentialAdvancementDirections: Weyland Consortium: Built to Last',
  '_useWhenTaggedCard: Predictive Planogram',
  '_useWhenTaggedCard: Retribution',
  'Phase_Main: Archived Memories',
  'Phase_Main: Biotic Labor',
  'Phase_Main: Haas-Bioroid: Precision Design',
  'Phase_Main: Hostile Takeover',
  'Phase_Main: Neurospike',
  'Phase_Main: Offworld Office',
  'Phase_Main: Orbital Superiority',
  'Phase_Main: Public Trail',
  'Phase_Main: Punitive Counterstrike',
  "Phase_Main: Tomorrow's Headline",
];

const normalise = s => s.replace(/[ʼ‘’]/g, "'").normalize('NFC');

function cardTitles() {
  const titles = new Set();
  const data = JSON.parse(fs.readFileSync(path.join(root, 'carddata', 'carddata.json'), 'utf8')).data;
  for (const card of data) if (card.title) titles.add(normalise(card.title));
  for (const file of fs.readdirSync(path.join(root, 'sets')).filter(f => f.endsWith('.js'))) {
    const source = fs.readFileSync(path.join(root, 'sets', file), 'utf8');
    for (const m of source.matchAll(/^\s*title:\s*"((?:[^"\\]|\\.)+)"/gm)) titles.add(normalise(m[1]));
  }
  return titles;
}

// String literals with their line numbers, skipping comments. ai_corp.js has
// no regular-expression literal containing a quote or comment marker.
function stringLiterals(source) {
  const out = [];
  let line = 1;
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === '\n') { line++; continue; }
    if (c === '/' && source[i + 1] === '/') {
      while (i < source.length && source[i] !== '\n') i++;
      i--;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) {
        if (source[i] === '\n') line++;
        i++;
      }
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const start = line;
      let value = '';
      let j = i + 1;
      for (; j < source.length && source[j] !== c; j++) {
        if (source[j] === '\\') { value += source[++j]; continue; }
        if (source[j] === '\n') line++;
        value += source[j];
      }
      out.push({value, line: start});
      i = j;
    }
  }
  return out;
}

// Class methods of CorpAI sit at two-space indentation.
function methodAt(lines) {
  const starts = [];
  lines.forEach((text, i) => {
    const m = text.match(/^  (?:static\s+)?([A-Za-z_$][\w$]*)\s*\(/);
    if (m && !/^(if|for|while|switch|catch|return)$/.test(m[1])) starts.push([i + 1, m[1]]);
  });
  return line => {
    let name = '(top level)';
    for (const [start, method] of starts) {
      if (start > line) break;
      name = method;
    }
    return name;
  };
}

const source = fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8');
const titles = cardTitles();
const methodFor = methodAt(source.split('\n'));
const found = new Map();
for (const {value, line} of stringLiterals(source)) {
  if (!titles.has(normalise(value))) continue;
  const key = methodFor(line) + ': ' + normalise(value);
  if (!found.has(key)) found.set(key, []);
  found.get(key).push(line);
}

if (verbose) for (const [key, lines] of found) console.log(key + ' (ai_corp.js:' + lines.join(',') + ')');

const allowed = new Set(LEGACY_TITLES);
assert.strictEqual(allowed.size, LEGACY_TITLES.length, 'LEGACY_TITLES has duplicate entries');
const added = [...found.keys()].filter(key => !allowed.has(key));
assert.deepStrictEqual(added, [],
  'New card-title literals in ai_corp.js. Express the mechanic as a card hook ' +
  '(documentation/ai-principles.md principle 2) instead of naming the card:\n  ' +
  added.map(key => key + ' (ai_corp.js:' + found.get(key).join(',') + ')').join('\n  '));

const gone = LEGACY_TITLES.filter(key => !found.has(key));
console.log('corp-ai-card-titles: ' + found.size + ' legacy title uses in ai_corp.js, none new' +
  (gone.length ? '; no longer present, delete from LEGACY_TITLES and tick P1: ' + gone.join('; ') : '.'));
