// Run with: node tests/card-status.test.js
// documentation/card-status.md is generated from the code and must match what
// scripts/card-status.js produces now; card-sets.md must decide every set, and
// config.js flags must follow those decisions.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {generate, configMismatches, playabilityMismatches, outFile} = require('../scripts/card-status.js');

const root = path.resolve(__dirname, '..');
const context = {console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
const decisions = fs.readFileSync(path.join(root, 'documentation', 'card-sets.md'), 'utf8');
const undecided = Object.keys(context.setRegistry.availableSets).filter(key =>
  !new RegExp('^\\|\\s*`?' + key + '`?\\s*\\|\\s*(playable|in-progress|not-implemented|deprecated)\\s*\\|', 'm').test(decisions));
assert.deepStrictEqual(undecided, [], 'Add a decision for these sets to documentation/card-sets.md: ' + undecided.join(', '));

const disagreements = configMismatches();
assert.deepStrictEqual(disagreements, [], 'config.js disagrees with documentation/card-sets.md:\n  ' + disagreements.join('\n  '));

const playability = playabilityMismatches();
assert.deepStrictEqual(playability, [], 'Playable sets contain unfinished or unaccepted missing cards:\n  ' + playability.join('\n  '));
const card = code => ({code, title: 'Regression card'});
const playableSet = (key, missing = [], unfinished = []) =>
  ({key, decision: 'playable', missing, unfinished});
assert.strictEqual(playabilityMismatches([playableSet('example', [], [card('99999')])]).length, 1,
  'playable sets may not contain scaffolds');
assert.strictEqual(playabilityMismatches([playableSet('example', [card('99999')])]).length, 1,
  'playable sets may not contain missing definitions');
const completedElevation = ['35057', '35058', '35059', '35060', '35065', '35066'].map(card);
assert.strictEqual(playabilityMismatches([playableSet('elevation', completedElevation)]).length, 1,
  'the completed Elevation cards are no longer exempt from missing-definition checks');
assert.strictEqual(playabilityMismatches([playableSet('elevation',
  completedElevation.slice(1).concat(card('35001')))]).length, 1,
  'any newly missing Elevation card fails the check');
assert.strictEqual(playabilityMismatches([playableSet('elevation', [], [card('35057')])]).length, 1,
  'missing-definition exemptions do not permit scaffold placeholders');
assert.deepStrictEqual(playabilityMismatches([
  {...playableSet('example', [card('99999')], [card('99998')]), decision: 'in-progress'},
]), [], 'in-progress sets may retain unfinished work');
const genesisReprints = ['2003', '2018', '2022', '2033', '2043', '2047', '2051',
  '2056', '2063', '2080', '2082', '2084', '2095', '2101', '2110', '2112', '2115'].map(card);
assert.deepStrictEqual(playabilityMismatches([playableSet('genesis', genesisReprints)]), [],
  'only the 17 Genesis duplicate reprints have accepted missing definitions');
assert.strictEqual(playabilityMismatches([playableSet('genesis', genesisReprints.concat(card('2102')))]).length, 1,
  'Genesis exemption must not hide an intended new definition');
assert.strictEqual(playabilityMismatches([playableSet('genesis', genesisReprints, [card('2102')])]).length, 1,
  'Genesis exemption must not hide unfinished mechanics');
assert.strictEqual(configMismatches([{key: 'example', decision: 'in-progress',
  set: {hidden: false, untested: false}, launcher: false}]).length, 1,
  'in-progress sets must be hidden and untested');

const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
assert.strictEqual(current, generate(),
  'documentation/card-status.md is out of date. Run: node scripts/card-status.js');
console.log('Card status: documentation/card-status.md is current.');
