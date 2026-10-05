// Run with: node tests/subroutine-visual.test.js
//
// The click overlay used to choose subroutines (and the 'broken' marker) is
// positioned from a hand-measured `visual: { y, h }` on each printed
// subroutine — y is the centre of the subroutine's printed text block in the
// 300x420 card image, h is 16 per printed line (see cardrenderer.js:
// `sub_y = -209 + visual.y`). Missing or template-guessed values put the
// overlay above/below the printed subroutine text (the 26035/26058/26060 bug).
// To re-measure positions from card images, run:
// node scripts/measure-subroutine-visual.js [CODE...] (see scripts/subvis/README.md).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');

const context = {
  console,
  cardSet: [],
  setIdentifiers: [],
  runner: {
    side: 'runner',
    AI: null,
    grip: [],
    stack: [],
    heap: [],
    resolvingCards: [],
    creditPool: 5,
    temporaryCredits: 0,
    clickTracker: 4,
  },
  corp: {
    side: 'corp',
    AI: null,
    HQ: {serverName: 'HQ', cards: [], root: [], ice: []},
    RnD: {serverName: 'R&D', cards: [], root: [], ice: []},
    archives: {serverName: 'Archives', cards: [], root: [], ice: []},
    remoteServers: [],
  },
};
vm.createContext(context);
vm.runInContext(
  fs.readFileSync(path.join(root, 'config.js'), 'utf8'),
  context,
  {filename: 'config.js'},
);
const setFiles = fs
  .readdirSync(path.join(root, 'sets'))
  .filter((f) => f.endsWith('.js'))
  .sort();
for (const f of setFiles) {
  vm.runInContext(fs.readFileSync(path.join(root, 'sets', f), 'utf8'), context, {
    filename: f,
  });
}

const VALID_HEIGHTS = [16, 32, 48, 64, 80, 96, 112];
let checked = 0;
for (let i = 0; i < context.cardSet.length; i++) {
  const card = context.cardSet[i];
  if (!card || card.cardType !== 'ice') continue;
  const subs = card.subroutines || [];
  if (subs.length === 0) continue; // unimplemented stub (no overlay is ever created)
  let prevY = -Infinity;
  for (let s = 0; s < subs.length; s++) {
    const where = card.title + ' (#' + i + ') subroutine ' + (s + 1);
    const v = subs[s].visual;
    assert(v, where + ' is missing visual { y, h }');
    assert(Number.isFinite(v.y), where + ' visual.y must be a number, got ' + v.y);
    assert(v.y >= 50 && v.y <= 200, where + ' visual.y=' + v.y + ' outside text box');
    assert(
      VALID_HEIGHTS.includes(v.h),
      where + ' visual.h=' + v.h + ' must be 16 x printed lines',
    );
    assert(
      v.y + v.h / 2 <= 212,
      where + ' visual block extends below the text box',
    );
    assert(
      v.y > prevY,
      where + ' is not below the previous subroutine (y=' + v.y + ' after ' + prevY + ')',
    );
    prevY = v.y;
  }
  checked++;
}
assert(checked >= 40, 'expected the implemented ice cards, found only ' + checked);

// Visually verified canary values, including the original bug-report cards:
const canary = JSON.parse(
  JSON.stringify(
    [26035, 26058, 26060, 3019, 30038, 30046].map((code) =>
      context.cardSet[code].subroutines.map((sub) => [sub.visual.y, sub.visual.h]),
    ),
  ),
);
assert.deepStrictEqual(
  canary,
  [
    [[102, 32], [129, 16]], // Hagen
    [[124, 16], [144, 16]], // Afshar
    [[94, 16], [129, 48]],  // Trebuchet
    [[158, 32], [183, 16]], // Viktor 2.0
    [[94, 16], [122, 32], [174, 64]], // Ansel 1.0
    [[83, 64]], // Diviner
  ],
  'verified cards must keep their measured overlay positions',
);

console.log('subroutine-visual: ' + checked + ' ice cards checked.');
