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
assert.strictEqual(Number(zoomLayer[1]), 3, 'zoomed canvas must remain above the menu');
for (const panel of ['footer', 'passpriority']) {
  const layer = css.match(new RegExp('body\\.card-zoom-active\\s+#' + panel + '\\s*\\{[^}]*z-index:\\s*(\\d+)', 's'));
  assert(layer && Number(layer[1]) > Number(zoomLayer[1]),
    `${panel} controls must stay above the canvas during forced subroutine zoom`);
}
assert(rendererSource.includes('pixi_setCardZoomLayer(this, true);'));
assert(rendererSource.includes('pixi_setCardZoomLayer(this, false);'));
// Exercise the real scale/animation block, including screen caps and drag overrides.
const scaleStart = rendererSource.indexOf('var scalingratio = pixi_cardBaseScale(this.card);');
const scaleEnd = rendererSource.indexOf('var hideDummy = true;', scaleStart);
assert(scaleStart >= 0 && scaleEnd > scaleStart);
const scaleContext = {
  window: {innerWidth: 1440, innerHeight: 1000}, fieldZoom: 1,
  localStorage: {getItem: () => null}, strengthInfo: {ice: false},
  pixi_holdCard: null, pixi_holdZoom: false, pixi_dragMoved: false, delta: 1,
  OptionsAreOnlyUniqueSubroutines: () => false,
  pixi_cardBaseScale: context.pixi_cardBaseScale,
};
const runner = {grip: []}, corp = {HQ: {cards: []}};
Object.assign(context, {runner, corp, viewingPlayer: runner});
vm.createContext(scaleContext);
vm.runInContext('function animateScale() {' + rendererSource.slice(scaleStart, scaleEnd) + '}', scaleContext);
const preview = ({width = 1440, height = 1000, zoom = 1, enlarged = true, faceUp = true, canView = false, dragging = false, pressed = false, hand = false, side = runner, rotated = false} = {}) => {
  Object.assign(scaleContext.window, {innerWidth: width, innerHeight: height});
  scaleContext.fieldZoom = zoom;
  context.viewingPlayer = side;
  const card = {zoomed: enlarged, faceUp, canView, flipProgress: 1, forceIceRotation: rotated,
    card: {cardType: 'event', cardLocation: hand ? (side === runner ? runner.grip : corp.HQ.cards) : []}, sprite: {scale: {x: 0.5, y: 0.5}}, SetTextureToBack() {}};
  scaleContext.pixi_holdCard = dragging || pressed ? card : null;
  scaleContext.pixi_dragMoved = dragging;
  for (let frame = 0; frame < 120; frame++) scaleContext.animateScale.call(card);
  const scale = card.sprite.scale.y / zoom;
  return {width: (rotated ? 419 : 300) * scale, height: (rotated ? 300 : 419) * scale};
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
for (const zoom of [1, 2, 4]) {
  for (const size of [{width: 500, height: 800}, {width: 844, height: 390}]) {
    const bounds = preview({...size, zoom, rotated: true});
    assert(bounds.width <= size.width && bounds.height <= size.height, 'sideways preview must fit both screen dimensions');
    assert(Math.abs(bounds.width / bounds.height - 419 / 300) < 0.001, 'sideways fitting preserves aspect ratio');
  }
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
  assert.strictEqual(preview({enlarged: false, hand: true, side, pressed: true}).width, 165,
    'stationary presses retain the own-hand size');
  assert.strictEqual(preview({hand: true, side, pressed: true}).width, 150,
    'zoomed held cards retain their previous sizing');
}
assert.strictEqual(preview({enlarged: false, pressed: true}).width, 150, 'pressed board cards retain their size');
context.viewingPlayer = runner;
assert.strictEqual(context.pixi_cardBaseScale({cardLocation: corp.HQ.cards}), 0.5, 'opponent hand keeps its size');
const moved = {cardLocation: runner.grip};
assert.strictEqual(context.pixi_cardBaseScale(moved), 0.55);
moved.cardLocation = [];
assert.strictEqual(context.pixi_cardBaseScale(moved), 0.5, 'leaving the hand restores board size');

// Use the actual pointer handlers: availability 2 alone must not count as movement.
const pointerContext = {clearTimeout() {}};
vm.createContext(pointerContext);
vm.runInContext(rendererSource.slice(rendererSource.indexOf('var pixi_draggingData = null;'),
  rendererSource.indexOf('function pixi_SqDistToPile(')), pointerContext);
for (const availability of [0, 1, 2]) {
  const card = {availability, zoomed: false, storedPosition: {x: 0, y: 0},
    sprite: {}, UpdateGlow() {}};
  const sprite = {card, position: {x: 0, y: 0}};
  const event = x => ({data: {pointerType: 'mouse', getLocalPosition: () => ({x, y: 0})}});
  pointerContext.pixi_onDragStart.call(sprite, event(0));
  assert.strictEqual(pointerContext.pixi_dragMoved, false);
  assert.strictEqual(pointerContext.pixi_draggingCard === card, availability === 2);
  pointerContext.pixi_onDragMove.call(sprite, event(10));
  assert.strictEqual(pointerContext.pixi_dragMoved, false, 'movement below threshold keeps press sizing');
  pointerContext.pixi_onDragMove.call(sprite, event(32));
  assert.strictEqual(pointerContext.pixi_dragMoved, availability === 2, 'only a movable card crossing the threshold starts dragging');
  pointerContext.pixi_onDragMove.call(sprite, event(0));
  assert.strictEqual(pointerContext.pixi_dragMoved, availability === 2, 'returning to the starting point must retain drag sizing');
  pointerContext.pixi_onDragEnd.call(sprite, event(0));
  assert.strictEqual(pointerContext.pixi_dragMoved, false, 'release resets movement for the next press');
}

const initSource = fs.readFileSync(path.join(root, 'init.js'), 'utf8');
const gripStart = initSource.indexOf('  var gripCascade;');
const gripEnd = initSource.indexOf('  var identityCascade', gripStart);
const gripContext = {runner, viewingPlayer: runner, spreadXStep: 100, hostingX: 0,
  FaceUpNoTint: {}, NoTint: {}, RenderCards: cards => cards,
  CardRenderer: {Cascade: function(cards, step) { this.step = step; }}};
vm.createContext(gripContext);
vm.runInContext(initSource.slice(gripStart, gripEnd), gripContext);
assert.strictEqual(gripContext.gripCascade.step, 100, 'viewed Grip uses its original spacing to avoid increasing clipping');
console.log('Card zoom layer, preview-size and hand-size regressions passed.');
