// Run with: node tests/card-zoom-layer.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const rendererSource = fs.readFileSync(path.join(root, 'cardrenderer/cardrenderer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');

const start = rendererSource.indexOf('var pixi_zoomedCards = new Set();');
const end = rendererSource.indexOf('var pixi_holdZoom = false;', start);
assert(start >= 0 && end > start);

let active = false;
const context = {
  Set,
  document: {body: {classList: {toggle(name, value) {
    assert.strictEqual(name, 'card-zoom-active');
    active = value;
  }}}},
};
vm.createContext(context);
vm.runInContext(rendererSource.slice(start, end), context);

const first = {}, second = {};
context.pixi_setCardZoomLayer(first, true);
assert.strictEqual(active, true);
context.pixi_setCardZoomLayer(second, true);
context.pixi_setCardZoomLayer(first, false);
assert.strictEqual(active, true, 'another zoomed card must keep the canvas raised');
context.pixi_setCardZoomLayer(second, false);
assert.strictEqual(active, false);

const zoomLayer = css.match(/body\.card-zoom-active\s+canvas\s*\{[^}]*z-index:\s*(\d+)/s);
const footerLayer = css.match(/#footer\s*\{[^}]*z-index:\s*(\d+)/s);
assert(zoomLayer, 'zoomed canvas must have an explicit stacking layer');
const priorityLayer = css.match(/#passpriority\s*\{[^}]*z-index:\s*(\d+)/s);
assert(footerLayer && priorityLayer, 'both bottom panels must have explicit stacking layers');
assert(!/body\.card-zoom-active\s+#(?:footer|passpriority)\s*\{/.test(css),
  'zooming must not raise the bottom panels');
assert.strictEqual(Number(zoomLayer[1]), 3, 'zoomed canvas must remain above the menu');
assert(
  Number(footerLayer[1]) < Number(zoomLayer[1]) && Number(priorityLayer[1]) < Number(zoomLayer[1]),
  'both bottom panels must stay underneath zoomed cards'
);
assert(rendererSource.includes('pixi_setCardZoomLayer(this, true);'));
assert(rendererSource.includes('pixi_setCardZoomLayer(this, false);'));
// Exercise the real scale/animation block, including screen caps and drag overrides.
const scaleStart = rendererSource.indexOf('var scalingratio = pixi_cardBaseScale(this.card);');
const scaleEnd = rendererSource.indexOf('var hideDummy = true;', scaleStart);
assert(scaleStart >= 0 && scaleEnd > scaleStart);
const scaleContext = {
  window: {innerWidth: 1440, innerHeight: 1000}, fieldZoom: 1,
  localStorage: {getItem: () => null}, strengthInfo: {ice: false},
  pixi_holdCard: null, pixi_holdZoom: false, delta: 1,
  OptionsAreOnlyUniqueSubroutines: () => false,
  pixi_cardBaseScale: context.pixi_cardBaseScale,
};
const runner = {grip: []}, corp = {HQ: {cards: []}};
Object.assign(context, {runner, corp, viewingPlayer: runner});
vm.createContext(scaleContext);
vm.runInContext('function animateScale() {' + rendererSource.slice(scaleStart, scaleEnd) + '}', scaleContext);
const preview = ({width = 1440, height = 1000, zoom = 1, enlarged = true, faceUp = true, canView = false, dragging = false, hand = false, side = runner} = {}) => {
  Object.assign(scaleContext.window, {innerWidth: width, innerHeight: height});
  scaleContext.fieldZoom = zoom;
  context.viewingPlayer = side;
  const card = {zoomed: enlarged, faceUp, canView, flipProgress: 1,
    card: {cardType: 'event', cardLocation: hand ? (side === runner ? runner.grip : corp.HQ.cards) : []}, sprite: {scale: {x: 0.5, y: 0.5}}, SetTextureToBack() {}};
  scaleContext.pixi_holdCard = dragging ? card : null;
  for (let frame = 0; frame < 120; frame++) scaleContext.animateScale.call(card);
  const scale = card.sprite.scale.y / zoom;
  return {width: 300 * scale, height: 419 * scale};
};
for (const zoom of [1, 2, 4]) {
  const bounds = preview({zoom});
  assert(Math.abs(bounds.width - 450) < 0.01, 'preview width must be independent of board zoom');
  assert(Math.abs(bounds.height - 628.5) < 0.01, 'preview height must match 150% reading size');
}
for (const size of [{width: 320, height: 568}, {width: 844, height: 390}]) {
  const bounds = preview(size);
  assert(bounds.width <= size.width && bounds.height <= size.height, 'preview must fit the screen');
  assert(Math.abs(bounds.width / bounds.height - 300 / 419) < 0.001, 'screen caps preserve aspect ratio');
}
assert.strictEqual(preview({enlarged: false}).width, 150, 'ordinary cards retain their size');
assert.strictEqual(preview({faceUp: false}).width, 150, 'hidden cards stay small');
assert.strictEqual(preview({faceUp: false, canView: true}).width, 450, 'viewable facedown cards enlarge');
assert.strictEqual(preview({dragging: true}).width, 150, 'dragging retains its ordinary size');
for (const side of [runner, corp]) {
  assert(Math.abs(preview({enlarged: false, hand: true, side}).width - 165) < 0.001,
    'the viewing player hand is 10% larger for either side');
  assert.strictEqual(preview({hand: true, side}).width, 450, 'hand enlargement does not compound the reading preview');
  assert.strictEqual(preview({hand: true, side, dragging: true}).width, 150, 'dragged hand cards keep the ordinary drag size');
}
context.viewingPlayer = runner;
assert.strictEqual(context.pixi_cardBaseScale({cardLocation: corp.HQ.cards}), 0.5, 'opponent hand keeps its size');
const moved = {cardLocation: runner.grip};
assert.strictEqual(context.pixi_cardBaseScale(moved), 0.55);
moved.cardLocation = [];
assert.strictEqual(context.pixi_cardBaseScale(moved), 0.5, 'leaving the hand restores board size');
console.log('Card zoom layer, preview-size and hand-size regressions passed.');
