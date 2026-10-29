// Run with: node tests/play-area-background.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'engine.php'), 'utf8');
const start = source.indexOf('    var playAreaBackgroundRequest');
const end = source.indexOf('    // Start loading the saved background', start);
assert(start >= 0 && end > start, 'background controls must be defined');
function harness(savedFilename = null, storageBlocked = false) {
  const classes = new Set();
  const properties = new Map();
  const images = [];
  const saved = new Map([['chiriboga-background', savedFilename]]);
  const selector = {value: '', options: [], appendChild(option) {this.options.push(option);}};
  const listeners = {};
  let selectorReady = false;
  const context = {
    playAreaBackgrounds: ['Apex.jpg', 'TheRoot.jpg', 'A "quoted" image.png'],
    playAreaBackgroundDarkness: {'Apex.jpg': 0.55, 'TheRoot.jpg': 2},
    document: {
      body: {
        classList: {add: name => classes.add(name), remove: name => classes.delete(name)},
        style: {setProperty: (name, value) => properties.set(name, value), removeProperty: name => properties.delete(name)},
      },
      getElementById: id => id === 'background-select' && selectorReady ? selector : null,
      createElement: () => ({}),
      addEventListener: (name, listener) => {listeners[name] = listener;},
    },
    Image: function() {images.push(this);},
    localStorage: {
      getItem: key => saved.get(key) ?? null,
      setItem: (key, value) => {
        if (storageBlocked) throw new Error('Storage unavailable');
        saved.set(key, value);
      },
    },
  };
  vm.createContext(context);
  const scriptEnd = source.indexOf('</script>', end);
  assert(scriptEnd > end, 'background bootstrap script must exist');
  // Execute the actual startup and DOMContentLoaded registration, including CRT setup.
  vm.runInContext(source.slice(start, scriptEnd), context);
  const ready = () => {selectorReady = true; listeners.DOMContentLoaded();};
  return {classes, properties, images, saved, selector, context, ready};
}
const {classes, properties, images, saved, selector, context, ready} = harness();
ready();
const hasArtwork = () => classes.has('image-background');
const load = image => image.onload();
const fail = image => { if (image.onerror) image.onerror(); };
const assertDefault = () => {
  assert.strictEqual(hasArtwork(), false, 'grid and watermark stay visible');
  assert.strictEqual(properties.size, 0, 'artwork CSS properties are cleared');
};

assert.strictEqual(context.applyPlayAreaBackground('Apex.jpg'), 'Apex.jpg');
assertDefault();
fail(images[0]);
assertDefault();
context.changePlayAreaBackground('Apex.jpg');
assert.strictEqual(saved.get('chiriboga-background'), 'Apex.jpg');
assertDefault();
load(images[1]);
assert(hasArtwork());
assert.strictEqual(properties.get('--play-area-background'), 'url("images/bg/Apex.jpg")');
assert.strictEqual(properties.get('--play-area-background-darkness'), 0.55);

context.applyPlayAreaBackground('Apex.jpg');
const older = images.at(-1);
context.applyPlayAreaBackground('TheRoot.jpg');
const newer = images.at(-1);
load(newer);
load(older);
assert.strictEqual(properties.get('--play-area-background'), 'url("images/bg/TheRoot.jpg")', 'stale success cannot replace latest artwork');
assert.strictEqual(properties.get('--play-area-background-darkness'), 1);
selector.value = 'TheRoot.jpg';
saved.set('chiriboga-background', 'TheRoot.jpg');
fail(older);
assert(hasArtwork(), 'stale failure cannot clear latest artwork');
assert.strictEqual(selector.value, 'TheRoot.jpg', 'stale failure cannot reset selector');
assert.strictEqual(saved.get('chiriboga-background'), 'TheRoot.jpg', 'stale failure cannot erase latest preference');

context.applyPlayAreaBackground('Apex.jpg');
const pending = images.at(-1);
context.changePlayAreaBackground('');
load(pending);
assertDefault();
assert.strictEqual(saved.get('chiriboga-background'), '');
const count = images.length;
assert.strictEqual(context.applyPlayAreaBackground('../missing.jpg'), '');
assert.strictEqual(images.length, count, 'unlisted files are never requested');
assertDefault();
context.applyPlayAreaBackground('A "quoted" image.png');
assert.strictEqual(images.at(-1).src, 'images/bg/A%20%22quoted%22%20image.png');
load(images.at(-1));
assert.strictEqual(properties.get('--play-area-background-darkness'), 0.35);
context.applyPlayAreaBackground('TheRoot.jpg');
fail(images.at(-1));
assertDefault();

// A current failure clears both persisted preference and visible selection.
context.changePlayAreaBackground('Apex.jpg');
selector.value = 'Apex.jpg';
fail(images.at(-1));
assertDefault();
assert.strictEqual(saved.get('chiriboga-background'), '');
assert.strictEqual(selector.value, '');

for (const completeBeforeReady of [false, true]) {
  const restored = harness('Apex.jpg');
  assert.strictEqual(restored.images.length, 1, 'startup requests saved artwork');
  assert.strictEqual(restored.images[0].src, 'images/bg/Apex.jpg');
  if (completeBeforeReady) load(restored.images[0]);
  restored.ready();
  assert.strictEqual(restored.images.length, 1, 'selector setup must reuse the startup request');
  assert.strictEqual(restored.selector.value, 'Apex.jpg');
  assert.deepStrictEqual(restored.selector.options.map(o => [o.value, o.textContent]),
    [['Apex.jpg', 'Apex'], ['TheRoot.jpg', 'The Root'], ['A "quoted" image.png', 'A "quoted" image']]);
  assert.strictEqual(restored.classes.has('image-background'), completeBeforeReady,
    'selector setup preserves already-loaded artwork');
  if (!completeBeforeReady) load(restored.images[0]);
  assert(restored.classes.has('image-background'), 'saved artwork is restored');
  assert.strictEqual(restored.properties.get('--play-area-background'), 'url("images/bg/Apex.jpg")');
}
for (const storageBlocked of [false, true]) {
  for (const failBeforeReady of [false, true]) {
    const restored = harness('Apex.jpg', storageBlocked);
    if (failBeforeReady) fail(restored.images[0]);
    restored.ready();
    if (!failBeforeReady) fail(restored.images[0]);
    assert.strictEqual(restored.selector.value, '', 'failed startup selects default even without storage access');
    assert.strictEqual(restored.classes.has('image-background'), false);
    assert.strictEqual(restored.images.length, 1, 'failed startup is not retried during selector setup');
    if (!storageBlocked) assert.strictEqual(restored.saved.get('chiriboga-background'), '');
  }
}
const invalid = harness('../missing.jpg');
invalid.ready();
assert.strictEqual(invalid.images.length, 0, 'invalid saved filenames are never requested');
assert.strictEqual(invalid.selector.value, '');

const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const artworkRule = css.match(/body\.image-background \.content:before\s*\{[^}]*\}/);
assert(artworkRule, 'stylesheet must define the artwork rule');
assert.match(artworkRule[0], /var\(--play-area-background\)/);
assert.match(artworkRule[0], /var\(--play-area-background-darkness,\s*0\.35\)/);

console.log('Play-area background load, fallback, persistence and request-order regressions passed.');
