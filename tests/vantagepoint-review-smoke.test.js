'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const probes = path.join(__dirname, '../documentation/new-sets/reviews/vantage-point/probes');
const {assessResult, isFailure, writeSmokeReport} = require(path.join(probes, 'vantagepoint-headless-smoke'));
const clean = {winner: 'corp', errors: [], tail: ['Corp wins']};
assert.strictEqual(isFailure(assessResult(clean)), false);
const historical = JSON.parse(fs.readFileSync(path.join(probes, '../vantagepoint-headless-smoke.json')));
const missed = historical.results.find(r => r.tail.some(line => /^ERROR\b/.test(line)));
assert(missed && missed.winner && missed.errors.length === 0, 'retain the original false-green reproduction');
assert.strictEqual(isFailure(assessResult(missed)), true);
assert(assessResult(missed).engineErrors.some(line => line.includes('Witch Hunt')));
for (const result of [
  {...clean, winner: null}, {...clean, errors: ['timeout']},
  {...clean, log: ['ERROR early engine failure', ...Array(30).fill('later')]},
  {...clean, report: {engineErrors: ['ERROR console-only engine failure']}},
]) assert.strictEqual(isFailure(assessResult(result)), true);
assert.strictEqual(assessResult({...clean, log: ['ERROR duplicate'], tail: ['ERROR duplicate']}).engineErrors.length, 1);

const reportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vp-smoke-records-'));
try {
  const retained = path.join(reportDirectory, 'vantagepoint-headless-smoke-2026-10-08.json');
  fs.writeFileSync(retained, 'retained evidence');
  const started = new Date('2026-10-09T12:34:56.789Z');
  const first = writeSmokeReport([clean], reportDirectory, started);
  const second = writeSmokeReport([clean], reportDirectory, started);
  assert.notStrictEqual(first, second, 'even simultaneous runs must retain separate records');
  for (const destination of [first, second]) {
    assert.strictEqual(path.dirname(destination), reportDirectory);
    const report = JSON.parse(fs.readFileSync(destination, 'utf8'));
    assert.strictEqual(report.date, '2026-10-09');
    assert.strictEqual(report.startedAt, started.toISOString());
    assert.deepStrictEqual(report.results, [clean]);
  }
  assert.strictEqual(fs.readFileSync(retained, 'utf8'), 'retained evidence');
} finally {
  fs.rmSync(reportDirectory, {recursive: true, force: true});
}

function setup(file, overrides = {}) {
  const c = {console: {log() {}, warn() {}, error() {}}, runner: {stack: []}, corp: {RnD: {cards: []}}, cardSet: [], setIdentifiers: [], Math: Object.create(Math), Date, ...overrides};
  c.Math.random = () => 0.5;
  vm.createContext(c);
  for (const name of ['config.js', 'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'])
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), c, {filename: name});
  Object.assign(c, {
    cardBackTexturesCorp: {}, cardBackTexturesRunner: {}, glowTextures: {}, strengthTextures: {},
    InstanceCard: id => ({...c.cardSet[id]}),
    InstanceCardsPush: (id, deck) => deck.push({...c.cardSet[id]}), Shuffle() {},
  });
  vm.runInContext(fs.readFileSync(path.join(probes, file), 'utf8'), c, {filename: file});
  return c;
}
for (const file of ['vantagepoint-headless-setup.js', 'vantagepoint-headless-setup-alternate.js']) {
  const c = setup(file);
  assert.strictEqual(c.runner.identityCard.player, c.runner);
  assert.strictEqual(c.runner.identityCard.cardType, 'identity');
  assert(c.runner.stack.length >= c.runner.identityCard.deckSize);
  c.console.error('engine error without capitalized Error');
  assert.deepStrictEqual(Array.from(c.__report().engineErrors), ['ERROR engine error without capitalized Error']);
}
assert.throws(() => setup('vantagepoint-headless-setup.js', {vpReviewRunnerId: 36026}), /requires Corp and Runner identities/);
console.log('Vantage Point review smoke: error classification, retained records and legal setups passed.');
