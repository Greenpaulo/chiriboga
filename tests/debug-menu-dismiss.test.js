// Run with: node tests/debug-menu-dismiss.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const initSource = fs.readFileSync(path.join(root, 'init.js'), 'utf8');
const engineSource = fs.readFileSync(path.join(root, 'engine.php'), 'utf8');

const start = initSource.indexOf('function debugCloseOnBackdrop(event)');
const end = initSource.indexOf('function debugToggleViewAllFronts()', start);
assert(start >= 0 && end > start, 'debug backdrop handler must be defined');

const context = {};
vm.createContext(context);
vm.runInContext(initSource.slice(start, end), context);

const modal = {style: {display: 'flex'}};
context.debugCloseOnBackdrop({target: modal, currentTarget: modal});
assert.strictEqual(modal.style.display, 'none', 'clicking the backdrop must close the debug menu');

modal.style.display = 'flex';
context.debugCloseOnBackdrop({target: {}, currentTarget: modal});
assert.strictEqual(modal.style.display, 'flex', 'clicking inside the popup must leave the debug menu open');

assert(
  /<div id="debug-modal" class="modal" onclick="debugCloseOnBackdrop\(event\);">/.test(engineSource),
  'the debug modal must invoke the backdrop handler'
);

console.log('3 debug-menu dismissal regression cases passed.');
