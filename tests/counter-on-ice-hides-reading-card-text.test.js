// Reproduction for: counter on ice hides reading card text (zoomed reading, not
// subroutine choice). Runs unchanged from tests/pending/ (known red) or tests/
// (green) once fixed.
// Run with: node tests/pending/counter-on-ice-hides-reading-card-text.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
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
const hide = context.pixi_shouldHideCounterDuringSubroutineChoice;
const dim = context.pixi_shouldDimCounterWhileReadingZoom;
assert.strictEqual(typeof dim, 'function', 'dim predicate must exist');

// A zoomed ice card as the renderer holds it: the counter's address is the
// card, and the card carries renderer.zoomed.
const zoomedIce = { advancement: 1, renderer: { zoomed: true } };
const unzoomedIce = { advancement: 1, renderer: { zoomed: false } };
const noRendererIce = { advancement: 1 };
const otherZoomedIce = { advancement: 1, renderer: { zoomed: true } };

let failures = 0;
function test(name, fn) {
  try {
    fn();
    if (process.env.VERBOSE) console.log('ok   ' + name);
  } catch (e) {
    failures++;
    console.log('FAIL ' + name + '\n     ' + e.message);
  }
}

test('zoomed ice advancement counter dims while reading (no subroutine choice)', () => {
  assert.strictEqual(
    dim({ key: 'advancement', address: zoomedIce }),
    true,
    'advancement counter covers the enlarged card text when the ice is zoomed for reading'
  );
});

test('control: hiding predicate untouched by reading zoom', () => {
  assert.strictEqual(hide({ key: 'advancement', address: zoomedIce }, false, zoomedIce), false);
});

test('control: unzoomed ice counter stays fully opaque', () => {
  assert.strictEqual(dim({ key: 'advancement', address: unzoomedIce }), false);
});

test('control: card without renderer does not dim', () => {
  assert.strictEqual(dim({ key: 'advancement', address: noRendererIce }), false);
});

test('control: subroutine-choice hiding still applies', () => {
  assert.strictEqual(hide({ key: 'advancement', address: unzoomedIce }, true, unzoomedIce), true);
});

test('control: counter on unzoomed card stays fully opaque', () => {
  assert.strictEqual(dim({ key: 'advancement', address: unzoomedIce }), false);
  assert.strictEqual(hide({ key: 'advancement', address: otherZoomedIce }, false, zoomedIce), false);
});

test('control: all counter types on zoomed card dim (credits, virus, power)', () => {
  assert.strictEqual(dim({ key: 'credits', address: zoomedIce }), true);
  assert.strictEqual(dim({ key: 'virus', address: zoomedIce }), true);
  assert.strictEqual(dim({ key: 'power', address: zoomedIce }), true);
});

test('control: counters on unzoomed cards stay fully opaque', () => {
  assert.strictEqual(dim({ key: 'credits', address: unzoomedIce }), false);
  assert.strictEqual(dim({ key: 'virus', address: unzoomedIce }), false);
  assert.strictEqual(dim({ key: 'power', address: unzoomedIce }), false);
});

test('wiring: per-frame path dims and restores alpha', () => {
  assert(
    rendererSource.includes('pixi_shouldDimCounterWhileReadingZoom(this.counters[i])'),
    'the per-frame counter update must apply the reading-zoom dim rule'
  );
});

// Behavioural coverage for Counter.UpdateVisibility: extract the method body
// and run it against sprite/richText stubs. The full per-frame UpdateCounters
// path needs PIXI, so the call-site wiring assertion above stays.
function loadUpdateVisibility() {
  const marker = 'UpdateVisibility(forceHidden = false, dimmed = false) {';
  const start = rendererSource.indexOf(marker);
  assert(start >= 0, 'expected UpdateVisibility(forceHidden, dimmed) in cardrenderer');
  let depth = 1;
  let i = start + marker.length;
  for (; i < rendererSource.length && depth > 0; i++) {
    if (rendererSource[i] === '{') depth++;
    else if (rendererSource[i] === '}') depth--;
  }
  assert.strictEqual(depth, 0, 'UpdateVisibility body must be balanced');
  const body = rendererSource.slice(start + marker.length, i - 1);
  return new Function('forceHidden', 'dimmed', body);
}
const updateVisibility = loadUpdateVisibility();

function stubCounter(address) {
  return {
    address,
    key: 'advancement',
    hideWhenZero: false,
    sprite: { visible: true, alpha: 1.0 },
    richText: { visible: true, alpha: 1.0 },
  };
}

test('behaviour: dimmed zoomed counter stays visible at reduced alpha', () => {
  const counter = stubCounter(zoomedIce);
  updateVisibility.call(counter, false, true);
  assert.strictEqual(counter.sprite.visible, true, 'dimmed counter must stay visible');
  assert.strictEqual(counter.richText.visible, true, 'dimmed counter text must stay visible');
  assert.strictEqual(counter.sprite.alpha, 0.3, 'dimmed icon must render translucently');
  assert.strictEqual(counter.richText.alpha, 0.3, 'dimmed number must render translucently');
});

test('behaviour: unzoomed counter restores full opacity', () => {
  const counter = stubCounter(unzoomedIce);
  updateVisibility.call(counter, false, true);
  updateVisibility.call(counter, false, false);
  assert.strictEqual(counter.sprite.visible, true);
  assert.strictEqual(counter.sprite.alpha, 1.0, 'unzoomed icon must restore full opacity');
  assert.strictEqual(counter.richText.alpha, 1.0, 'unzoomed number must restore full opacity');
});

test('behaviour: forced hiding still hides even while dimmed', () => {
  const counter = stubCounter(zoomedIce);
  updateVisibility.call(counter, true, true);
  assert.strictEqual(counter.sprite.visible, false, 'forceHidden must take precedence over dim');
  assert.strictEqual(counter.richText.visible, false, 'forceHidden must hide the number too');
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Counter-on-ice reading-zoom reproduction passes.');
