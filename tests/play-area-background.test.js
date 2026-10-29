// Run with: node tests/play-area-background.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'engine.php'), 'utf8');
const start = source.indexOf('    var playAreaBackgroundRequest');
const end = source.indexOf('    // Start loading the saved background', start);
assert(start >= 0 && end > start, 'background controls must be defined');
const classes = new Set();
const properties = new Map();
const images = [];
const saved = new Map();
const context = {
  playAreaBackgrounds: ['Apex.jpg', 'TheRoot.jpg', 'A "quoted" image.png'],
  playAreaBackgroundDarkness: {'Apex.jpg': 0.55, 'TheRoot.jpg': 2},
  document: {body: {
    classList: {add: name => classes.add(name), remove: name => classes.delete(name)},
    style: {setProperty: (name, value) => properties.set(name, value), removeProperty: name => properties.delete(name)},
  }},
  Image: function() { images.push(this); },
  localStorage: {setItem: (key, value) => saved.set(key, value)},
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
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
fail(older);
assert(hasArtwork(), 'stale failure cannot clear latest artwork');

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

console.log('Play-area background load, fallback, persistence and request-order regressions passed.');
