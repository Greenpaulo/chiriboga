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
const scaleEnd = rendererSource.indexOf('//and dummy needs to be positioned correctly', scaleStart);
assert(scaleStart >= 0 && scaleEnd > scaleStart);
const scaleContext = {
  window: {innerWidth: 1440, innerHeight: 1000}, fieldZoom: 1,
  localStorage: {getItem: () => null}, strengthInfo: {ice: false},
  pixi_holdCard: null, pixi_holdZoom: false, pixi_dragMoved: false, delta: 1,
  OptionsAreOnlyUniqueSubroutines: () => false,
  pixi_browserZoom: context.pixi_browserZoom,
  pixi_cardBaseScale: context.pixi_cardBaseScale,
  pixi_cardPreviewArea: context.pixi_cardPreviewArea,
  forceCropped: false, showFace: true,
};
let panels = {};
Object.assign(context, {window: scaleContext.window, fieldZoom: 1,
  cardRenderer: {openingPixelRatio: 1, app: {stage: {toLocal: point => point}}}});
context.document.getElementById = id => panels[id] ? {getBoundingClientRect: () => panels[id]} : null;
const runner = {grip: []}, corp = {HQ: {cards: []}};
Object.assign(context, {runner, corp, viewingPlayer: runner});
vm.createContext(scaleContext);
vm.runInContext('function animateScale() {' + rendererSource.slice(scaleStart, scaleEnd) + '}', scaleContext);
const rotationStart = rendererSource.indexOf('if (dispDiff.r > Math.PI)');
const rotationEnd = rendererSource.indexOf('this.UpdateGlow();', rotationStart);
vm.runInContext('function animateRotation(target) { var dispDiff = {r: target - this.sprite.rotation}; var deltaVec = {x: 0, y: 0, r: 0};' +
  rendererSource.slice(rotationStart, rotationEnd) + '}', scaleContext);
const preview = ({width = 1440, height = 1000, zoom = 1, browserZoom = 1, pixelRatio, enlarged = true, faceUp = true, canView = false, dragging = false, pressed = false, hand = false, side = runner, rotated = false, transition = false, controls = {}} = {}) => {
  Object.assign(scaleContext.window, {innerWidth: width, innerHeight: height, devicePixelRatio: pixelRatio ?? browserZoom * context.cardRenderer.openingPixelRatio});
  scaleContext.fieldZoom = zoom;
  context.fieldZoom = zoom;
  panels = controls;
  context.cardRenderer.app.stage.toLocal = point => side === runner ? point :
    {x: width * zoom - point.x, y: height * zoom - point.y};
  context.viewingPlayer = side;
  scaleContext.viewingPlayer = side;
  const card = {zoomed: enlarged, faceUp, canView, flipProgress: 1, forceIceRotation: rotated,
    card: {player: side, cardType: 'event', cardLocation: hand ? (side === runner ? runner.grip : corp.HQ.cards) : []},
    sprite: {x: width * zoom, y: side === runner ? height * zoom : 0, rotation: rotated && !transition ? Math.PI / 2 : 0, scale: {x: 0.5, y: 0.5}},
    storedPosition: {x: 0, y: 0}, glowSprite: {}, SetTextureToBack() {}};
  scaleContext.pixi_holdCard = dragging || pressed ? card : null;
  scaleContext.pixi_dragMoved = dragging;
  let bounds;
  for (let frame = 0; frame < 120; frame++) {
    if (transition) scaleContext.animateRotation.call(card, Math.PI / 2);
    scaleContext.animateScale.call(card);
    const scale = card.sprite.scale.y / zoom;
    const c = Math.abs(Math.cos(card.sprite.rotation)), s = Math.abs(Math.sin(card.sprite.rotation));
    bounds = {width: (300 * c + 419 * s) * scale, height: (300 * s + 419 * c) * scale};
    if (transition || Object.keys(controls).length) {
      const area = context.pixi_cardPreviewArea();
      assert(bounds.width <= (area.right - area.left) / zoom + 1e-9 &&
        bounds.height <= (area.bottom - area.top) / zoom + 1e-9, 'every transition frame must fit the available area');
      assert(card.sprite.x - bounds.width * zoom / 2 >= area.left - 1e-9 &&
        card.sprite.x + bounds.width * zoom / 2 <= area.right + 1e-9 &&
        card.sprite.y - bounds.height * zoom / 2 >= area.top - 1e-9 &&
        card.sprite.y + bounds.height * zoom / 2 <= area.bottom + 1e-9,
        'reading preview must remain inside the viewport on every frame');

    }
  }
  const screenY = side === runner ? card.sprite.y / zoom : height - card.sprite.y / zoom;
  return {...bounds, bottom: screenY + bounds.height / 2};
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
  preview({width: 500, height: 390, zoom, rotated: true, transition: true});
}
for (const side of [runner, corp]) {
  for (const zoom of [1, 2, 4]) {
    for (const size of [{width: 390, height: 844}, {width: 844, height: 390}]) {
      const footer = {left: 0, right: 300, top: size.height - 65, width: 300, height: 65};
      const passpriority = {left: size.width - 220, right: size.width - 64,
        top: size.height - 90, width: 156, height: 84};
      for (const controls of [{footer}, {footer, passpriority}]) {
        preview({...size, side, zoom, rotated: true, transition: true, controls});
        const handPreview = preview({...size, side, zoom, hand: true, controls});
        assert(Math.abs(handPreview.bottom - size.height) < 0.001,
          'hovered hand cards must align with the screen bottom even with visible controls');
        assert.deepStrictEqual(handPreview, preview({...size, side, zoom, hand: true}),
          'footer and priority controls must not shift or shrink hand previews');
      }
      const normal = preview({...size, side, zoom});
      const hidden = preview({...size, side, zoom, controls: {passpriority: {...passpriority, width: 0, height: 0}}});
      assert.deepStrictEqual(hidden, normal, 'a hidden priority control must not reduce the preview area');
    }
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

// Moving a reading preview above controls must not end hover on its original card.
const hoverStart = rendererSource.indexOf('this.sprite.pointerout = function (event)');
const hoverEnd = rendererSource.indexOf('//some extras to support touch', hoverStart);
assert(hoverStart >= 0 && hoverEnd > hoverStart);
let hoveredTarget;
const hoverContext = {pixi_draggingCard: null, $: () => ({prop() {}})};
vm.createContext(hoverContext);
const hoveringCard = {zoomed: true, hover: true, storedPosition: {x: 600, y: 730},
  storedRotation: 0, UpdateGlow() {}, ToggleZoom() { this.zoomed = !this.zoomed; },
  app: {renderer: {plugins: {interaction: {hitTest(point) {
    assert.strictEqual(hoveringCard.sprite.interactive, false, 'test the original hover target behind the preview');
    assert.deepStrictEqual(point, {x: 600, y: 730});
    return hoveredTarget;
  }}}}}};
hoveringCard.sprite = {card: hoveringCard, interactive: true, x: 600, y: 400};
hoverContext.owner = hoveringCard;
vm.runInContext('(function() {' + rendererSource.slice(hoverStart, hoverEnd) + '}).call(owner);', hoverContext);
const originalTarget = {card: hoveringCard};
const leaveEvent = {type: 'pointerout', data: {pointerType: 'mouse', global: {x: 600, y: 730}}};
hoveredTarget = originalTarget;
for (let frame = 0; frame < 4; frame++) {
  hoveringCard.sprite.pointerout(leaveEvent);
  assert.strictEqual(hoveringCard.zoomed, true, 'stationary pointer on original hand card must not trigger a zoom loop');
  assert.strictEqual(hoveringCard.hover, true);
  assert.strictEqual(hoveringCard.sprite.interactive, true);
}
for (const target of [null, {card: {}}]) {
  hoveringCard.zoomed = hoveringCard.hover = true;
  hoveredTarget = target;
  hoveringCard.sprite.pointerout(leaveEvent);
  assert.strictEqual(hoveringCard.zoomed, false, 'leaving the original card must close its preview');
  assert.strictEqual(hoveringCard.hover, false);
  assert.strictEqual(hoveringCard.sprite.x, 600);
  assert.strictEqual(hoveringCard.sprite.y, 730);
}
hoveringCard.zoomed = hoveringCard.hover = true;
hoveredTarget = originalTarget;
hoveringCard.sprite.pointerout();
assert.strictEqual(hoveringCard.zoomed, false, 'explicit ticker unzoom must still work without an event');
for (const event of [
  {type: 'pointerout', data: {pointerType: 'touch'}},
  {type: 'pointerupoutside', data: {pointerType: 'mouse'}},
]) {
  hoveringCard.zoomed = hoveringCard.hover = true;
  hoveringCard.sprite.pointerout(event);
  assert.strictEqual(hoveringCard.zoomed, false, 'touch dismissal and release outside must still close previews');
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
// Exercise the real board fit block at the CSS viewport sizes browser zoom yields.
const fitStart = initSource.indexOf('  fieldZoom = 1.0;', initSource.indexOf('//zoom the field out'));
const fitEnd = initSource.indexOf('  var oldW = w;', fitStart);
assert(fitStart >= 0 && fitEnd > fitStart);
const fitContext = {pixi_browserZoom: context.pixi_browserZoom,
  runnerLargestHeight: 500, largestServerHeight: 600, scoredCascade: {width: 100},
  serverSeparationX: 40, corp: {remoteServers: []}, totalServersWidth: 1100,
  arbitraryHistorySpacer: 55};
vm.createContext(fitContext);
// Window chrome and docked panels cannot establish absolute startup zoom.
// Use the actual opening pixel ratio as baseline, including non-grid zooms.
for (const density of [1, 1.25, 2]) {
  for (const openingZoom of [0.8, 1, 1.25, 1.33, 1.5, 2]) {
    for (const panelWidth of [0, 432]) {
      Object.assign(context.window, {outerWidth: 1440,
        innerWidth: (1440 - panelWidth) / openingZoom,
        devicePixelRatio: density * openingZoom});
      context.cardRenderer.openingPixelRatio = context.pixi_openingPixelRatio();
      assert.strictEqual(context.cardRenderer.openingPixelRatio, density * openingZoom,
        'opening baseline uses the actual pixel ratio without viewport inference or rounding');
      assert.strictEqual(context.pixi_browserZoom(), 1, 'opening zoom is the session baseline');
      for (const actualZoom of [1, 1.33, 1.5, 2]) {
        const bounds = preview({width: (1440 - panelWidth) / actualZoom, height: 2000 / actualZoom,
          pixelRatio: density * actualZoom, zoom: 2});
        assert(Math.abs(context.pixi_browserZoom() - actualZoom / openingZoom) < 1e-9,
          'later zoom changes are measured exactly relative to opening zoom');
        assert(Math.abs(bounds.width * actualZoom - 450 * openingZoom) < 0.01,
          'preview retains its opening screen size without cancelling estimator errors');
      }
      // Opening and closing a panel after load must not change the zoom signal.
      Object.assign(context.window, {innerWidth: 1008, devicePixelRatio: density * openingZoom});
      assert.strictEqual(context.pixi_browserZoom(), 1);
      context.window.innerWidth = 1440;
      assert.strictEqual(context.pixi_browserZoom(), 1);
    }
  }
}
context.window.devicePixelRatio = undefined;
assert.strictEqual(context.pixi_openingPixelRatio(), 1, 'missing pixel ratio has a neutral fallback');
for (const density of [1, 2]) {
  context.cardRenderer.openingPixelRatio = density;
  let startingScale;
  for (const browserZoom of [1, 1.25, 1.5, 2, 0.8]) {
    const width = 1440 / browserZoom, height = 1000 / browserZoom;
    Object.assign(context.window, {devicePixelRatio: density * browserZoom});
    Object.assign(fitContext, {w: width, h: height});
    vm.runInContext(initSource.slice(fitStart, fitEnd), fitContext);
    if (startingScale === undefined) startingScale = fitContext.interfaceScale;
    assert(Math.abs(fitContext.interfaceScale - startingScale) < 1e-9,
      'browser zoom must not trigger compensating UI shrinkage');
    const ordinary = preview({width, height, zoom: fitContext.fieldZoom, browserZoom, enlarged: false});
    assert(height * fitContext.fieldZoom >= fitContext.runnerLargestHeight + fitContext.largestServerHeight - 1e-9,
      'the logical board must fit both rigs without letting Runner cards overlap Corp cards');
    assert(width * fitContext.fieldZoom >= fitContext.totalFieldWidth + fitContext.arbitraryHistorySpacer - 1e-9,
      'the logical board must fit the servers horizontally');
    assert(ordinary.width * browserZoom <= 150 * startingScale + 1e-9,
      'crowded boards must retain automatic fitting when browser zoom changes');
    for (const side of [runner, corp]) {
      const enlarged = preview({width, height, zoom: fitContext.fieldZoom, browserZoom, side, hand: true});
      assert(Math.abs(enlarged.width * browserZoom - 450) < 0.01,
        'reading previews must retain their screen size at every browser zoom and display density');
    }
  }
  // A real window resize at the same zoom still refits crowded boards.
  Object.assign(context.window, {devicePixelRatio: density});
  Object.assign(fitContext, {w: 720, h: 500});
  vm.runInContext(initSource.slice(fitStart, fitEnd), fitContext);
  assert(fitContext.interfaceScale < startingScale, 'window resizing must still fit the board');
}
console.log('Card zoom layer, preview-size, browser-zoom and hand-size regressions passed.');
