// Run with: node tests/advancement-counter-subroutine.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rendererSource = fs.readFileSync(
  path.join(root, 'cardrenderer/cardrenderer.js'),
  'utf8'
);

const start = rendererSource.indexOf(
  'function pixi_shouldHideCounterDuringSubroutineChoice('
);
const end = rendererSource.indexOf('var pixi_draggingData = null;', start);
assert(start >= 0 && end > start);

const context = {};
vm.createContext(context);
vm.runInContext(rendererSource.slice(start, end), context);

const ice = {};
const otherIce = {};
const advancement = { key: 'advancement', address: ice };

assert.strictEqual(
  context.pixi_shouldHideCounterDuringSubroutineChoice(advancement, true, ice),
  true,
  'advancement counters on the ICE being inspected must be hidden'
);
assert.strictEqual(
  context.pixi_shouldHideCounterDuringSubroutineChoice(advancement, false, ice),
  false,
  'the advancement counter must return after subroutine selection'
);
assert.strictEqual(
  context.pixi_shouldHideCounterDuringSubroutineChoice(
    advancement,
    true,
    otherIce
  ),
  false,
  'counters on other cards must remain visible'
);
assert.strictEqual(
  context.pixi_shouldHideCounterDuringSubroutineChoice(
    { key: 'power', address: ice },
    true,
    ice
  ),
  false,
  'unrelated counter types must not be hidden'
);
assert(
  rendererSource.includes('this.counters[i].UpdateVisibility('),
  'the per-frame counter update must apply the subroutine-choice visibility rule'
);

console.log('5 advancement-counter subroutine regression cases passed.');
