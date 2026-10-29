// Run with: node tests/breach-hazard-table.test.js
// I2 M2: the breach-hazard table script is deterministic, isotonic within each
// server kind and merges thin cells, and CORP_AI_BREACH_HAZARD_TABLE /
// CORP_AI_POINT_VALUE equal what it derives from the committed calibration.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const table = require('../scripts/ai-batch/breach-hazard-table.js');
const root = path.resolve(__dirname, '..');
const calibrationFile = path.join(root, 'documentation/corp-ai/measurements/I2-15d485d-breach-hazard-calibration.json');
const verbose = !!process.env.VERBOSE;
let tests = 0;
function test(name, body) {
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (verbose) console.log('PASS ' + name);
}
const cells = spec => {
  const out = {};
  for (const kind of table.KINDS)
    out[kind] = Object.fromEntries(table.BUCKETS.map(bucket => [bucket, {turns: 0, breached: 0}]));
  for (const [kind, bucket, turns, breached] of spec) out[kind][bucket] = {turns, breached};
  return out;
};
const source = fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8').replace(/\r\n/g, '\n');
const constant = name => vm.runInNewContext(
  new RegExp('const ' + name + ' = ([\\s\\S]*?);\\n').exec(source)[1]);

test('thin cells merge with a neighbour; rates are non-decreasing in margin', () => {
  const derived = table.deriveTable(cells([
    ['hq', 'lockout', 500, 0], ['hq', '<=-4', 50, 10], ['hq', '-3..-1', 400, 20],
    ['hq', '0..1', 400, 80], ['hq', '2..4', 400, 60], ['hq', '5..9', 400, 120], ['hq', '>=10', 400, 160],
    ['hq', 'unknown', 20, 20],
  ]));
  const hq = derived.hq;
  // <=-4 (50 turns) merges into its thinner neighbour -3..-1: (10 + 20) / 450.
  assert.strictEqual(hq['<=-4'], hq['-3..-1']);
  assert.strictEqual(hq['-3..-1'], Math.round(30 / 450 * 10000) / 10000);
  // 0..1 (0.2) above 2..4 (0.15) is pooled: 140 / 800.
  assert.strictEqual(hq['0..1'], 0.175); assert.strictEqual(hq['2..4'], 0.175);
  for (let i = 1; i < table.ORDERED.length; i++)
    assert.ok(hq[table.ORDERED[i]] >= hq[table.ORDERED[i - 1]], table.ORDERED[i]);
  // A thin unknown cell takes the kind's pooled rate.
  assert.strictEqual(hq.unknown, Math.round(470 / 2570 * 10000) / 10000);
  // An empty kind is one pooled block of zero.
  assert.ok(Object.values(derived.rd).every(rate => rate === 0));
});

test('derivation is deterministic', () => {
  const spec = cells([['rd', '0..1', 250, 50], ['rd', '>=10', 900, 300], ['archives', '5..9', 199, 40]]);
  assert.deepStrictEqual(table.deriveTable(spec), table.deriveTable(JSON.parse(JSON.stringify(spec))));
});

test('committed calibration: table and constants equal the script output', () => {
  const calibration = JSON.parse(fs.readFileSync(calibrationFile, 'utf8'));
  const derived = table.deriveTable(calibration.fitCells);
  assert.deepStrictEqual(calibration.table, derived);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(constant('CORP_AI_BREACH_HAZARD_TABLE'))), derived);
  // The calibration split each kind by ICE count, as its one-ICE check requires.
  assert.strictEqual(calibration.split, calibration.oneIce.differ);
  for (const kind of table.KINDS) for (const group of table.ICE_GROUPS) {
    const row = calibration.split ? derived[kind][group] : derived[kind];
    for (let i = 1; i < table.ORDERED.length; i++)
      assert.ok(row[table.ORDERED[i]] >= row[table.ORDERED[i - 1]], kind + ' ' + group + ' ' + table.ORDERED[i]);
  }
  assert.deepStrictEqual(calibration.unsplit.table, table.deriveTable(calibration.unsplit.fitCells));
  const pointValue = table.pointValue(path.join(root, calibration.pool.file));
  assert.deepStrictEqual(pointValue, calibration.pointValue);
  assert.strictEqual(constant('CORP_AI_POINT_VALUE'), pointValue.value);
});
console.log(tests + ' breach-hazard table cases passed.');
