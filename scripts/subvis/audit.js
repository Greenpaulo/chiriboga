// Implementation behind scripts/measure-subroutine-visual.js (see
// scripts/subvis/README.md). Compares authored `visual` values in sets/*.js
// against positions measured from images/*.jpg by detect.js.
// audit.js — audit subroutine overlay `visual` values against card images.
// Usage (from repo root):
//   node scripts/subvis/audit.js [CODE...] [--preset modern|ffg]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const setsDir = path.join(root, 'sets');
const detectJs = path.join(__dirname, 'detect.js');
const workDir = path.join(__dirname, '.work');
if (!fs.existsSync(workDir)) fs.mkdirSync(workDir);

// Detector presets: modern NISEI frame vs old FFG frame (coreset,
// creationandcontrol). Auto-selected from set registry idRange below;
// --preset forces one for every card.
const PRESETS = {
  modern: {},
  ffg: { THR: '155', BASE: '50', TEXT_END: '198', IX0: '54', IX1: '74', RUNLEN: '8', IMAXSTART: '70', JOIN: '16' },
};

const args = process.argv.slice(2);
let forcePreset = null;
const onlyCodes = new Set();
for (let ai = 0; ai < args.length; ai++) {
  const a = args[ai];
  if (a === '--preset') forcePreset = args[++ai];
  else if (a === 'modern' || a === 'ffg') forcePreset = a;
  else if (/^\d+$/.test(a)) onlyCodes.add(String(+a));
}
if (forcePreset && !PRESETS[forcePreset]) {
  console.error('unknown preset ' + forcePreset);
  process.exit(1);
}
// 1. inventory: every ice card with real subroutines + authored visuals.
// Parsed from source (comments stripped) so coreset.js (coreSet[]) works too.
const cards = [];
for (const f of fs.readdirSync(setsDir)) {
  if (!f.endsWith('.js')) continue;
  const src = fs.readFileSync(path.join(setsDir, f), 'utf8');
  for (const chunk of src.split(/(?:cardSet|coreSet)\[/)) {
    const m = chunk.match(/^(\d+)\]\s*=\s*\{/);
    if (!m) continue;
    if (!/cardType:\s*["']ice["']/.test(chunk)) continue;
    const title = (chunk.match(/title:\s*"([^"]+)"/) || [])[1] || '?';
    const img = (chunk.match(/imageFile:\s*"([^"]+)"/) || [])[1];
    const i = chunk.indexOf('subroutines: [');
    let authored = null;
    if (i >= 0) {
      const rest = chunk.slice(i);
      const endMatch = rest.match(/\n  \],/);
      const block = endMatch ? rest.slice(0, endMatch.index) : rest;
      const clean = block.replace(/^[^\S\n]*\/\/.*$/gm, '');
      authored = [];
      const re = /visual:\s*\{\s*y:\s*(-?\d+),\s*h:\s*(\d+)\s*\}/g;
      let mm;
      while ((mm = re.exec(clean)) !== null) authored.push({ y: +mm[1], h: +mm[2] });
      // Subroutine objects are the direct entries of this source-level array.
      // Counting every Resolve property also counts callbacks nested inside a
      // subroutine (for example Howler's install decision).
      const nSub = (clean.match(/^    \{/gm) || []).length;
      if (nSub === 0) authored = null;
      else if (authored.length !== nSub) authored = { incomplete: true, nSub, list: authored };
    }
    if (onlyCodes.size && !onlyCodes.has(m[1]) && !onlyCodes.has(String(+m[1]))) continue;
    cards.push({ file: f, code: m[1], title, img, authored });
  }
}
// 2+3. convert image, detect, compare. Old-FFG-frame sets use FFG tuning.
const FFG_FILES = new Set(['coreset.js', 'creationandcontrol.js']);
const flags = [];
let checked = 0, noImage = 0;
for (const c of cards) {
  if (c.authored === null) continue;
  if (!c.img) { flags.push({ ...c, reason: 'no imageFile' }); continue; }
  const stem = c.img.replace(/\.[^.]+$/, '');
  const m2 = stem.match(/^(\d+)/);
  const base = m2 ? m2[1].padStart(5, '0') : stem;
  const jpg = path.join(root, 'images', base + '.jpg');
  if (!fs.existsSync(jpg)) { noImage++; flags.push({ file: c.file, code: c.code, title: c.title, reason: 'image missing: ' + jpg }); continue; }
  const bmp = path.join(workDir, base + '.bmp');
  if (!fs.existsSync(bmp)) {
    const r = spawnSync('sips', ['-s', 'format', 'bmp', jpg, '--out', bmp], { stdio: 'ignore' });
    if (r.status !== 0) { flags.push({ file: c.file, code: c.code, title: c.title, reason: 'sips failed' }); continue; }
  }
  const preset = forcePreset || (FFG_FILES.has(c.file) ? 'ffg' : 'modern');
  const env = { ...process.env, ...PRESETS[preset] };
  const d = spawnSync('node', [detectJs, bmp], { encoding: 'utf8', env });
  const measured = [];
  const re = /sub(\d+): lines=(.*?) => visual y=(-?\d+), h=(\d+)/g;
  let mm;
  while ((mm = re.exec(d.stdout || '')) !== null) measured.push({ y: +mm[3], h: +mm[4], lines: mm[2] });
  checked++;

  if (c.authored.incomplete) {
    flags.push({ file: c.file, code: c.code, title: c.title, reason: 'MISSING visual: ' + c.authored.list.length + '/' + c.authored.nSub + ' present', measured });
    continue;
  }
  const a = c.authored;
  if (a.length !== measured.length) {
    flags.push({ file: c.file, code: c.code, title: c.title, reason: 'COUNT mismatch authored=' + a.length + ' measured=' + measured.length, a, measured });
    continue;
  }
  let worst = 0;
  const lineCountDiffs = [];
  const deltas = a.map((av, k) => {
    const dy = measured[k].y - av.y;
    const dh = measured[k].h - av.h;
    if (Math.round(av.h / 16) !== measured[k].h / 16) lineCountDiffs.push('sub' + (k + 1) + ' lines ' + Math.round(av.h / 16) + '->' + measured[k].h / 16);
    worst = Math.max(worst, Math.abs(dy), Math.abs(dh));
    return dy + '/' + (dh === 0 ? '0' : 'H' + dh);
  });
  if (worst > 4 || lineCountDiffs.length) {
    flags.push({ file: c.file, code: c.code, title: c.title, reason: 'OFF by dy/dh: ' + deltas.join(' ') + (lineCountDiffs.length ? ' | LINECOUNT: ' + lineCountDiffs.join(' ') : ''), a, measured });
  }
}

console.log('ice cards with subs checked: ' + checked + ', no image: ' + noImage);
console.log(flags.length === 0 ? 'all visuals match measured positions (tolerance 4px).' : 'flags: ' + flags.length);
for (const fl of flags) {
  console.log('- ' + fl.file + ' #' + fl.code + ' ' + fl.title + ' :: ' + fl.reason);
  if (fl.a) console.log('    authored: ' + JSON.stringify(fl.a));
  if (fl.measured) console.log('    measured: ' + JSON.stringify(fl.measured.map((m) => ({ y: m.y, h: m.h }))));
}
console.log('\nVerify each flag with zoom.js before editing sets/*.js, then run tests/subroutine-visual.test.js.');
