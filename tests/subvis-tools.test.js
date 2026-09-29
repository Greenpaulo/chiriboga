// Run with: node tests/subvis-tools.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');

const root = path.resolve(__dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chiriboga-subvis-'));

function bmpHeader(bitDepth, compression) {
  const buffer = Buffer.alloc(54);
  buffer.write('BM', 0, 2, 'ascii');
  buffer.writeUInt32LE(54, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(1, 18);
  buffer.writeInt32LE(1, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(bitDepth, 28);
  buffer.writeUInt32LE(compression, 30);
  return buffer;
}

try {
  const paletteBmp = path.join(tempDir, 'palette.bmp');
  const compressedBmp = path.join(tempDir, 'compressed.bmp');
  fs.writeFileSync(paletteBmp, bmpHeader(8, 0));
  fs.writeFileSync(compressedBmp, bmpHeader(24, 1));

  for (const script of ['detect.js', 'zoom.js']) {
    const palette = spawnSync(process.execPath, [
      path.join(root, 'scripts', 'subvis', script),
      paletteBmp,
      '0', '0', '0', '0',
    ], {encoding: 'utf8'});
    assert.notStrictEqual(palette.status, 0, script + ' rejects palette-indexed BMP input');
    assert((palette.stderr || '').includes('unsupported BMP bit depth'));

    const compressed = spawnSync(process.execPath, [
      path.join(root, 'scripts', 'subvis', script),
      compressedBmp,
      '0', '0', '0', '0',
    ], {encoding: 'utf8'});
    assert.notStrictEqual(compressed.status, 0, script + ' rejects compressed BMP input');
    assert((compressed.stderr || '').includes('unsupported BMP compression'));
  }

  const missingCode = spawnSync(process.execPath, [
    path.join(root, 'scripts', 'subvis', 'audit.js'),
    '999999999',
  ], {encoding: 'utf8'});
  assert.notStrictEqual(missingCode.status, 0, 'audit rejects an unmatched requested code');
  assert((missingCode.stdout || '').includes('no matching card'));
} finally {
  for (const file of fs.readdirSync(tempDir)) fs.unlinkSync(path.join(tempDir, file));
  fs.rmdirSync(tempDir);
}

console.log('subvis tool checks passed.');
