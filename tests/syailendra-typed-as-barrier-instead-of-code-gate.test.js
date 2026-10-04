// Run with: node tests/syailendra-typed-as-barrier-instead-of-code-gate.test.js
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const elevation = fs.readFileSync(path.join(root, 'sets', 'elevation.js'), 'utf8');
const cardData = JSON.parse(
  fs.readFileSync(path.join(root, 'carddata', 'carddata.json'), 'utf8'),
).data;

const cardStart = elevation.indexOf('cardSet[35076] = {');
const nextCard = elevation.indexOf('\ncardSet[', cardStart + 1);
const definition = elevation.slice(cardStart, nextCard);
const subtypeMatch = definition.match(/^\s*subTypes:\s*\["([^"]+)"\]/m);
const canonical = cardData.find(card => card.code === '35076');

assert.notStrictEqual(cardStart, -1, 'Syailendra should have an implemented card definition');
assert.ok(subtypeMatch, 'Syailendra should declare a primary subtype');
assert.ok(canonical, 'Syailendra should exist in canonical card data');
assert.strictEqual(
  subtypeMatch[1],
  canonical.keywords.split(' - ')[0],
  'Syailendra implementation should use its canonical primary ice subtype',
);

console.log('PASS Syailendra primary ice subtype matches canonical card data');
