// Run with: node tests/agenda-exposure-table.test.js
// I4: CORP_AI_AGENDA_EXPOSURE_TABLE equals what
// scripts/ai-batch/agenda-exposure-table.js derives from the committed
// calibration's fit cells, and every row is non-decreasing in margin.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const exposure = require('../scripts/ai-batch/agenda-exposure-table.js');
const {ORDERED} = require('../scripts/ai-batch/breach-hazard-table.js');
const root = path.resolve(__dirname, '..');
const calibrationFile = path.join(root, 'documentation/corp-ai/measurements/I4-3f46a2a-agenda-exposure-calibration.json');
let tests = 0;
function test(name, body) {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (process.env.VERBOSE) console.log('PASS ' + name);
}
const source = fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8');
const constant = name => vm.runInNewContext(
  new RegExp('const ' + name + ' = ([\\s\\S]*?);\\r?\\n').exec(source)[1]);

test('rows are keyed by counters and ICE count; counters and margin order the rates', () => {
  const games = [{deckPairId: 'a', rows: [
    // [iceCount, rezzedIce, counters, points, bucket, stolen]
    ...Array.from({length: 300}, (_, i) => [1, 0, 0, 2, '5..9', i < 30 ? 1 : 0]),
    ...Array.from({length: 300}, (_, i) => [1, 0, 2, 2, '5..9', i < 120 ? 1 : 0]),
    ...Array.from({length: 300}, (_, i) => [0, 0, 1, 2, '>=10', i < 270 ? 1 : 0]),
  ]}];
  const table = exposure.deriveTable(exposure.cellCounts(games));
  assert.strictEqual(table.none.single['5..9'], 0.1);
  assert.strictEqual(table.advanced.single['5..9'], 0.4);
  assert.strictEqual(table.advanced.bare['>=10'], 0.9);
  assert.ok(Object.values(table.none.multi).every(rate => rate === 0));
});

test('committed calibration: table and constant equal the script output', () => {
  const calibration = JSON.parse(fs.readFileSync(calibrationFile, 'utf8'));
  const derived = exposure.deriveTable(calibration.fitCells);
  assert.deepStrictEqual(calibration.table, derived);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(constant('CORP_AI_AGENDA_EXPOSURE_TABLE'))), derived);
  for (const c of exposure.COUNTER_GROUPS) for (const i of exposure.ICE_GROUPS)
    for (let k = 1; k < ORDERED.length; k++)
      assert.ok(derived[c][i][ORDERED[k]] >= derived[c][i][ORDERED[k - 1]], c + ' ' + i + ' ' + ORDERED[k]);
});
// Synthetic reports retain the same pool/options while varying deterministic game keys.
const report = (seed, rows = [[1, 0, 0, 2, '5..9', 0]]) => ({
  poolHash: 'pool', pairs: [{id: 'a'}], options: {}, seeds: [seed], failures: [],
  games: [{ok: true, deckPairId: 'a', seed, samples: {remoteAgendaRisk: rows}}],
});
test('held-out reliability requires observations, including when every game fails', () => {
  const fit = report(1), heldout = report(2);
  heldout.games[0].ok = false;
  const result = exposure.build(fit, heldout).reliability;
  assert.strictEqual(result.pass, false);
  assert.strictEqual(result.meanAbsoluteError, null);
  assert.strictEqual(exposure.build(fit, report(2, [])).reliability.pass, false);
  assert.strictEqual(exposure.build(fit, report(2)).reliability.pass, true);
});
test('fit and held-out reports reject repeated deck-pair/seed games', () => {
  const fit = report(1);
  assert.throws(() => exposure.build(fit, fit), /overlapping/);
  assert.throws(() => exposure.build(fit, report(1)), /overlapping/);
  const differentPair = report(1);
  differentPair.games[0].deckPairId = 'b';
  assert.doesNotThrow(() => exposure.build(fit, differentPair));
  assert.doesNotThrow(() => exposure.build(fit, report(2)));
});
console.log(tests + ' agenda exposure table cases passed.');
