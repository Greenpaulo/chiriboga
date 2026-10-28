'use strict';
// Uprising (26066–26130) set-level checks. Batches append mechanics and AI cases
// below the structural checks, reusing this engine setup.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: stub, jQuery: stub, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});

const FIRST = 26066, LAST = 26130;
const registry = c.setRegistry.availableSets.uprising;
assert.deepStrictEqual(Array.from(registry.idRange), [FIRST, LAST], 'registry range matches the set');
assert.strictEqual(registry.code, 'ur');
assert(c.setIdentifiers.includes('ur'), 'set file registers its identifier');

const source = fs.readFileSync(path.join(root, 'sets/uprising.js'), 'utf8');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data
  .filter(card => card.pack_code === 'ur');
assert.strictEqual(metadata.length, LAST - FIRST + 1, 'metadata covers the whole range');
const normalise = title => title.normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase();
for (let id = FIRST; id <= LAST; id++) {
  const definitions = source.match(new RegExp('^cardSet\\[' + id + '\\]\\s*=', 'gm')) || [];
  assert.strictEqual(definitions.length, 1, id + ': exactly one definition');
  const card = c.cardSet[id];
  const meta = metadata.find(entry => Number(entry.code) === id);
  assert(meta, id + ': metadata entry');
  assert.strictEqual(normalise(card.title), normalise(meta.title), id + ': title matches metadata');
  assert.strictEqual(card.imageFile, id + '.png', id + ': image file');
  assert(Number.isFinite(card.elo), id + ': numeric ELO');
}

if (process.env.VERBOSE) console.log('uprising-integration: ' + (LAST - FIRST + 1) + ' definitions checked');
