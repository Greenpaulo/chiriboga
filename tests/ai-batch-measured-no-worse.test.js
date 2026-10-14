// Measured-value rules deliberately differ from confidence-bound guards.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {parseArgs, gateSpec, applyNoWorseChecks, applyCeilingChecks} = require('../scripts/ai-batch');
const {compareReports} = require('../scripts/ai-batch/metrics');
const metric = 'bluffSingleVariableCorrelation.max';
const report = (value, low = 0.1, high = 0.9) => ({batchMetrics: {[metric]: {value, low, high, games: 20}}});
const result = () => ({checks: [], pass: null});
const check = (baseline, candidate) => applyNoWorseChecks(result(), baseline, candidate, [metric]);
assert(check(report(0.3), report(0.2)).pass, 'overlapping intervals do not veto a better measured value');
assert(check(report(0.3), report(0.3)).pass, 'exact equality passes');
assert.strictEqual(check(report(0.3), report(0.31)).pass, false, 'a small measured regression fails');
assert.strictEqual(check({}, report(0.2)).pass, false, 'missing baseline fails');
assert.strictEqual(check(report(0.3), {}).pass, false, 'missing candidate fails');
assert.strictEqual(check(report(0.3), report(NaN)).pass, false, 'nonfinite values fail');
assert.strictEqual(check(report(0.3), report(0.2, NaN)).pass, false, 'missing intervals fail');
const empty = report(0.2); empty.batchMetrics[metric].games = 0;
assert.strictEqual(check(report(0.3), empty).pass, false, 'empty batches fail');
const existing = {checks: [{name: 'other', pass: false}], pass: false};
assert.strictEqual(applyNoWorseChecks(existing, report(0.3), report(0.2), [metric]).pass, false);
const parsed = parseArgs(['gate', '--no-worse', metric, '--no-worse', 'other.max']);
assert.deepStrictEqual(gateSpec(parsed).noWorse, [metric, 'other.max']);
const meta = {poolHash: 'same', pairs: ['test'], seeds: [1], starts: [], collectors: []};
const game = {ok: true, deckPairId: 'test', seed: 1, metrics: {}, logHash: 'same'};
const a = {...meta, games: [game]}, b = {...meta, games: [{...game}]};
const unchanged = compareReports(a, b, {noWorse: [metric]});
assert(unchanged.checks.some(c => c.kind === 'changed' && !c.pass), 'measured-only gate requires changed games');
assert.throws(() => compareReports(a, {...b, pairs: ['other']}, {noWorse: [metric]}), /differ in pairs/);
assert.strictEqual(compareReports({...a, pairs: ['test', 'other']}, {...b, pairs: ['other', 'test']}).pairedGames, 1,
  'deck-pair order does not change the selected set');
for (const games of [[], [{...game, ok: false}], [{...game, seed: 2}]]) {
  const candidate = {...b, ...report(0.2), games};
  const baseline = {...a, ...report(0.3)};
  for (const spec of [{noWorse: [metric]}, {ceiling: {[metric]: 1}}]) {
    let compared = compareReports(baseline, candidate, spec);
    compared = applyNoWorseChecks(compared, baseline, candidate, spec.noWorse);
    compared = applyCeilingChecks(compared, baseline, candidate, spec.ceiling);
    assert.strictEqual(compared.pass, false, 'valid batch metrics cannot override missing successful pairs');
    assert(compared.checks.some(c => c.kind === 'paired' && !c.pass));
  }
}
// Exercise the actual --compare output and exit status, using synthetic reports.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'measured-no-worse-'));
try {
  const baseline = path.join(tmp, 'baseline.json'), candidate = path.join(tmp, 'candidate.json');
  fs.writeFileSync(baseline, JSON.stringify({...a, ...report(0.3)}));
  const compare = (candidateReport, flags = ['--no-worse', metric]) => {
    fs.writeFileSync(candidate, JSON.stringify(candidateReport));
    return spawnSync(process.execPath, [path.resolve(__dirname, '../scripts/ai-batch.js'),
      '--compare', baseline, candidate, ...flags], {encoding: 'utf8', timeout: 10000});
  };
  const valid = {...b, ...report(0.2), games: [{...game, logHash: 'changed'}]};
  assert.strictEqual(compare(valid).status, 0, 'a valid changed comparison passes');
  for (const field of ['value', 'low', 'high']) {
    for (const value of [null, undefined]) {
      const invalid = {...valid, ...report(0.2)};
      invalid.batchMetrics[metric][field] = value;
      const output = compare(invalid);
      assert.strictEqual(output.status, 1, output.stderr);
      assert.match(output.stdout, /candidate unavailable/);
      assert.match(output.stdout, /FAIL measured no-worse/);
      assert.match(output.stdout, /Gate: failed/);
    }
  }
  const invalidBatch = {...valid, ...report(null)};
  Object.assign(invalidBatch.batchMetrics[metric], {valid: false, why: 'undefined sample', invalidDraws: 3});
  const invalidOutput = compare(invalidBatch);
  assert.strictEqual(invalidOutput.status, 1, invalidOutput.stderr);
  assert.match(invalidOutput.stdout, /candidate invalid \(undefined sample; 3 invalid draws\)/);
  assert.match(invalidOutput.stdout, /Gate: failed/);
  for (const flags of [['--no-worse', metric], ['--ceiling', metric + '=1']]) {
    const output = compare({...valid, games: []}, flags);
    assert.strictEqual(output.status, 1, output.stderr);
    assert.match(output.stdout, /FAIL paired usable pairs/);
    assert.match(output.stdout, /Gate: failed/);
  }
  const disjoint = compare({...valid, pairs: ['other']});
  assert.strictEqual(disjoint.status, 2, 'incompatible reports are a setup error');
  assert.match(disjoint.stderr, /Reports differ in pairs/);
} finally {
  fs.rmSync(tmp, {recursive: true, force: true});
}
console.log('Measured no-worse gate checks passed.');
