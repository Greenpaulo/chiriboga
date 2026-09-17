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
const footerLayer = css.match(/body\.card-zoom-active\s+#footer\s*\{[^}]*z-index:\s*(\d+)/s);
assert(zoomLayer, 'zoomed canvas must have an explicit stacking layer');
assert(footerLayer, 'footer must have an explicit stacking layer');
assert.strictEqual(Number(zoomLayer[1]), 3, 'zoomed canvas must remain above the menu');
assert(
  Number(footerLayer[1]) > Number(zoomLayer[1]),
  'footer choices must remain clickable above the zoomed canvas'
);
assert(rendererSource.includes('pixi_setCardZoomLayer(this, true);'));
assert(rendererSource.includes('pixi_setCardZoomLayer(this, false);'));
console.log('5 card zoom-layer regression cases passed.');
