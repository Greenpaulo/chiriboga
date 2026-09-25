// Run with: node tests/card-status.test.js
// documentation/card-status.md is generated from the code and must match what
// scripts/card-status.js produces now; card-sets.md must decide every set.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {generate, outFile} = require('../scripts/card-status.js');

const root = path.resolve(__dirname, '..');
const context = {console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'config.js'), 'utf8'), context);
const decisions = fs.readFileSync(path.join(root, 'documentation', 'card-sets.md'), 'utf8');
const undecided = Object.keys(context.setRegistry.availableSets).filter(key =>
  !new RegExp('^\\|\\s*`?' + key + '`?\\s*\\|\\s*(playable|in-progress|not-implemented|deprecated)\\s*\\|', 'm').test(decisions));
assert.deepStrictEqual(undecided, [], 'Add a decision for these sets to documentation/card-sets.md: ' + undecided.join(', '));

const current = fs.existsSync(outFile) ? fs.readFileSync(outFile, 'utf8') : '';
assert.strictEqual(current, generate(),
  'documentation/card-status.md is out of date. Run: node scripts/card-status.js');
console.log('Card status: documentation/card-status.md is current.');
