// Reproduction for the Melies flip-zoom/layout bug (zoom happens on flip,
// not on hover-zoom). Runs unchanged from tests/pending/ (known red) or
// tests/ (green) once fixed.
//
// Symptom: after Melies U (36036) flips, only ~a quarter of the department
// art shows inside the card template, and R&D / ice / remotes space out as
// if an invisible oversized image pushed them away.
//
// Mechanism [Inferred, code-read]: Card.Extents() (cardrenderer/cardrenderer.js)
// measures sprite.getBounds() at fixed scale 0.5, and Cascade layout
// (same file) sizes servers from those extents. The renderer masks assume
// ~300x420 art (defaultMaskDimensions w:280 h:243, screen-fit comment
// "assumes image dimensions 300x419"). The 36036 department assets are
// 750x1050 webp, so at the same 0.5 scale their extents are 375x525 vs the
// normal 150x210 — inflating HQ/totalServersWidth/largestServerHeight and
// cropping to the fixed mask.
// Run with: node tests/pending/melies-flip-art-oversized-layout.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');

function jpegDimensions(buffer) {
  assert.strictEqual(buffer.readUInt16BE(0), 0xffd8, 'must be a JPEG');
  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset++; continue; }
    const marker = buffer[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) offset += 2;
    else offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  throw new Error('Could not read JPEG dimensions');
}

function webpDimensions(buffer, name) {
  assert.strictEqual(buffer.toString('ascii', 8, 12), 'WEBP', name + ': must be WEBP');
  assert.strictEqual(buffer.toString('ascii', 12, 16), 'VP8 ', name + ': must be lossy VP8 webp');
  const frame = buffer.slice(20);
  assert.deepStrictEqual(frame.slice(3, 6), Buffer.from([0x9d, 0x01, 0x2a]), name + ': bad VP8 start code');
  const w = frame.readUInt16LE(6) & 0x3fff;
  const h = frame.readUInt16LE(8) & 0x3fff;
  return { width: w, height: h };
}

let failures = 0;
function test(name, fn) {
  try { fn(); if (process.env.VERBOSE) console.log('ok   ' + name); }
  catch (e) { failures++; console.log('FAIL ' + name + '\n     ' + e.message); }
}

// Standard card art is 300x420 (cf. tests/flipped-identity.test.js asserting
// 35023-0.jpg is 300x420; cardrenderer "assumes image dimensions 300x419").
const STANDARD = { width: 300, height: 420 };

test('control: base identity art is standard size', () => {
  const dims = jpegDimensions(fs.readFileSync(path.join(root, 'images/36036.jpg')));
  assert.deepStrictEqual(dims, STANDARD, 'images/36036.jpg should be 300x420');
});

for (const face of ['images/36036-0.webp', 'images/36036-1.webp', 'images/36036-2.webp']) {
  test('bug: ' + face + ' matches standard card-art size', () => {
    const dims = webpDimensions(fs.readFileSync(path.join(root, face)), face);
    assert.deepStrictEqual(dims, STANDARD,
      face + ' is ' + dims.width + 'x' + dims.height + '; at the fixed 0.5 layout scale ' +
      'its extents are ' + (dims.width * 0.5) + 'x' + (dims.height * 0.5) + ' vs standard ' +
      (STANDARD.width * 0.5) + 'x' + (STANDARD.height * 0.5) +
      ', so the HQ cascade/field-zoom inflates and the fixed card mask crops to ~a quarter');
  });
}

test('bug: flip texture is covered by the fixed card mask', () => {
  const rendererSource = fs.readFileSync(path.join(root, 'cardrenderer/cardrenderer.js'), 'utf8');
  const m = rendererSource.match(/this\.defaultMaskDimensions\s*=\s*\{\s*x:\s*(-?\d+),\s*y:\s*(-?\d+),\s*w:\s*(\d+),\s*h:\s*(\d+)/);
  assert(m, 'expected defaultMaskDimensions in cardrenderer');
  const maskW = Number(m[3]), maskH = Number(m[4]);
  const dims = webpDimensions(fs.readFileSync(path.join(root, 'images/36036-0.webp')), '36036-0');
  // At scale 0.5 the sprite is dims*0.5 px; the mask window is fixed maskW*maskH.
  const visibleFraction = (maskW * maskH) / ((dims.width * 0.5) * (dims.height * 0.5));
  assert(visibleFraction > 0.9,
    'only ~' + Math.round(visibleFraction * 100) + '% of the 750x1050 flip texture fits the fixed ' +
    maskW + 'x' + maskH + ' mask window (expected ~full coverage at standard 300x420 art)');
});

if (failures) {
  console.log(failures + ' case(s) failed.');
  process.exit(1);
}
console.log('Melies flip-art layout reproduction passes.');
