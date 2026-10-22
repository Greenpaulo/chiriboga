'use strict';
const assert = require('assert');
const {summarize} = require('../scripts/ai-batch/opening-central-summary');
const hand = {mulligan: false, credits: 5, cards: [{card: 'Wall', cardType: 'ice', rezCost: 9}]};
function report(candidate) {
  return {poolHash: 'test', codeHash: 'test', pairs: ['deck'], seeds: ['1', '2', '3'], starts: [],
    collectors: ['openingCentralCoverage'], options: {corp: {openingHqThenRdIce: candidate, iceMarginalSecurity: true}, runner: {}},
    games: [1, 2, 3].map(seed => ({deckPairId: 'deck', seed: String(seed), ok: seed !== 3, errors: seed === 3 ? ['failed'] : [],
      metrics: {'pointsStolenByServer.hq': 0, 'pointsStolenByServer.rd': 1},
      samples: {openingCentralCoverage: {hands: {offered: hand, kept: hand, firstDraw: hand},
        installs: [{ordinal: 1, actual: 'hq', turn: 1, reason: candidate ? 'requiredCentral' : 'currentI2'}],
        boundaries: seed === 2 ? {} : {turn1: {hq: 1, rd: Number(candidate)}, turn2: {hq: 0, rd: 1}}}}}))};
}
const baseline = report(false), candidate = report(true);
const result = summarize(baseline, candidate);
assert.strictEqual(result.valid, true);
const row = result.groups.pooled;
assert.deepStrictEqual(row.candidate.coverage.turn1, {both: 1, observed: 1, total: 3, successful: 2,
  coverage: 1, confirmedCoverageLowerBound: 0.5, endedBeforeBoundary: 1, missingSample: 0});
assert.strictEqual(row.paired.turn1.retained, 1);
assert.strictEqual(row.paired.turn1.excluded, 1);
assert.strictEqual(row.paired.turn1.candidateMinusBaseline, 1);
assert.strictEqual(row.candidate.failures.length, 1);
assert.strictEqual(result.groups['openingIce:1'].candidate.games, 3);
assert.strictEqual(row.candidate.hands.offered.printedRezCostDistribution[9], 2);
assert.strictEqual(row.candidate.timing.rd.neverInstalled, 2, 'never-installed games are retained');
assert.strictEqual(row.candidate.timing.rd.conditionalFirstTurn, null, 'no install is not turn zero');
const mismatch = report(true);
mismatch.games[0].samples.openingCentralCoverage.hands = {...mismatch.games[0].samples.openingCentralCoverage.hands,
  offered: {...hand, mulligan: true}};
assert.strictEqual(summarize(baseline, mismatch).valid, false);
const unclassified = report(true);
unclassified.games[0].samples.openingCentralCoverage.installs[0].reason = 'unclassifiedDestination';
assert.strictEqual(summarize(baseline, unclassified).valid, false);
const missing = report(true);
delete missing.games[0].samples;
assert.throws(() => summarize(baseline, missing), /Missing opening samples/);
console.log('Opening central summary: denominators, strata, censoring, failures and treatment validation passed.');
