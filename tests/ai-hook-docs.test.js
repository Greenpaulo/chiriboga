// Run with: node tests/ai-hook-docs.test.js
// Enforces AGENTS.md: every AI card hook defined in sets/*.js is documented in
// documentation/ai.md. LEGACY_UNDOCUMENTED is a ratchet: it may only shrink.
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const setsDir = path.join(root, 'sets');
const aiDoc = fs.readFileSync(path.join(root, 'documentation', 'ai.md'), 'utf8');

// Hooks that predate the documentation rule. Document one, then delete it here.
const LEGACY_UNDOCUMENTED = [
  'AIAccessTriggerPriority', 'AIBreachReplacementValue',
  'AIBreaksRegardlessOfStrength', 'AIBypassCost', 'AICardsDiscarded',
  'AIChooseBestInstall', 'AIDrawTrigger', 'AIEncounterOptions',
  'AIGripRunPotential', 'AIHostedDoesNotPreventRez', 'AIImplementIcebreaker',
  'AILimitPerDeck', 'AIPerformRun', 'AIPlayBeforeRun', 'AIPlayForInstall',
  'AIPlayPriority', 'AIPlayToRemoveTags', 'AIPlayedWithCost', 'AIPriority',
  'AIRezReasons', 'AIRunEventDiscount', 'AIRushToFinish',
  'AISelectBestProgramToInstall', 'AISharedBestFromOptions', 'AISharedChoose',
  'AISharedPreferredWord', 'AISharedPreferredX', 'AISharedWouldTrash',
  'AIShouldBypass', 'AIShouldFlipToA', 'AIShouldFlipToB',
  'AIShouldInstallOnRez', 'AIShouldTakeCard', 'AIWouldTrashProgram',
  'AIWouldTrashResource', 'AIWouldTriggerArchivesAbility', 'AIWouldUse',
  'AIWouldRez', 'AIWouldUseAbility',
  // Added with Vantage Point batch 1 after the rule existed. Corsair's
  // AIRunPoolCreditOffset treats any card with this marker as a Corsair, so an
  // earlier-installed Lampades suppresses Corsair's offset. Document the
  // contract when that is resolved rather than enshrining it.
  'AIUsesStealthCredits',
];

// Hook definitions are object-literal keys: `  AIName: ...` on their own line.
const definedIn = new Map();
for (const file of fs.readdirSync(setsDir).filter(f => f.endsWith('.js')).sort()) {
  const source = fs.readFileSync(path.join(setsDir, file), 'utf8');
  for (const m of source.matchAll(/^\s+(AI[A-Z][A-Za-z0-9]*)\s*:/gm)) {
    if (!definedIn.has(m[1])) definedIn.set(m[1], file);
  }
}

const documented = hook => new RegExp('\\b' + hook + '\\b').test(aiDoc);
const legacy = new Set(LEGACY_UNDOCUMENTED);

const undocumented = [...definedIn.keys()]
  .filter(hook => !legacy.has(hook) && !documented(hook))
  .map(hook => hook + ' (first defined in sets/' + definedIn.get(hook) + ')');
assert.deepStrictEqual(undocumented, [],
  'AI hooks missing from documentation/ai.md. Document each hook contract ' +
  '(signature, return value, when it is called, read-only constraints) as AGENTS.md requires:\n  ' +
  undocumented.join('\n  '));

const nowDocumented = LEGACY_UNDOCUMENTED.filter(documented);
assert.deepStrictEqual(nowDocumented, [],
  'These hooks are now documented in ai.md; remove them from LEGACY_UNDOCUMENTED ' +
  'in tests/ai-hook-docs.test.js:\n  ' + nowDocumented.join('\n  '));

const gone = LEGACY_UNDOCUMENTED.filter(hook => !definedIn.has(hook));
assert.deepStrictEqual(gone, [],
  'These hooks are no longer defined in sets/*.js; remove them from ' +
  'LEGACY_UNDOCUMENTED in tests/ai-hook-docs.test.js:\n  ' + gone.join('\n  '));

console.log('AI hook documentation: ' + definedIn.size + ' hooks checked, ' +
  LEGACY_UNDOCUMENTED.length + ' legacy exceptions remaining.');
