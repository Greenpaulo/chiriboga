#!/usr/bin/env node
'use strict';
// Passive post-processing of the frozen I2.3 reports; never plays games.
const fs = require('fs');
const {bootstrap} = require('./metrics');
const key = game => JSON.stringify([game.fixtureId || '', game.deckPairId, String(game.seed)]);
const sample = game => game.samples?.openingCentralCoverage;
const iceCount = hand => hand.cards.filter(card => card.cardType === 'ice').length;
const stratum = game => {
  const offered = sample(game)?.hands.offered;
  return offered ? String(Math.min(2, iceCount(offered))) : 'unobserved';
};
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
function paired(rows, value, observed = () => true) {
  const retained = rows.filter(([a, b]) => observed(a) && observed(b));
  const differences = retained.map(([a, b]) => value(b) - value(a));
  return {retained: retained.length, excluded: rows.length - retained.length,
    candidateMinusBaseline: mean(differences), interval95: differences.length ? bootstrap(differences, 'i2.3-opening') : null};
}
function arm(games) {
  const successful = games.filter(game => game.ok);
  const coverage = {};
  for (const turn of [1, 2]) {
    const at = game => sample(game)?.boundaries[`turn${turn}`];
    const observed = successful.filter(at);
    const both = observed.filter(game => at(game).hq > 0 && at(game).rd > 0).length;
    coverage[`turn${turn}`] = {both, observed: observed.length, total: games.length, successful: successful.length,
      coverage: observed.length ? both / observed.length : null,
      confirmedCoverageLowerBound: successful.length ? both / successful.length : null,
      endedBeforeBoundary: successful.filter(game => sample(game) && !at(game)).length,
      missingSample: successful.filter(game => !sample(game)).length};
  }
  const installs = game => sample(game)?.installs || [];
  const timing = {};
  for (const central of ['hq', 'rd']) {
    const first = game => installs(game).find(install => install.actual === central);
    const installed = successful.filter(first);
    timing[central] = {installed: installed.length, neverInstalled: successful.length - installed.length,
      conditionalFirstTurn: mean(installed.map(game => first(game).turn)),
      noInstallThroughTurn2OrEarlierEnd: successful.filter(game => !first(game) || first(game).turn > 2).length,
      endedBeforeTurn2Boundary: successful.filter(game => !sample(game)?.boundaries.turn2).length,
      theftPointsPerGame: mean(successful.map(game => game.metrics[`pointsStolenByServer.${central}`]))};
  }
  const exceptions = {}, firstTwo = {};
  for (const game of successful) {
    const opening = installs(game).filter(install => install.ordinal <= 2);
    const destinations = opening.map(install => install.actual).join(',') || 'none';
    firstTwo[destinations] = (firstTwo[destinations] || 0) + 1;
    for (const install of opening.filter(i => !['currentI2', 'requiredCentral'].includes(i.reason))) {
      const rows = exceptions[install.reason] ||= [];
      rows.push({deckPairId: game.deckPairId, seed: game.seed, ...install});
    }
  }
  const hands = {};
  for (const stage of ['offered', 'kept', 'firstDraw']) {
    const values = successful.map(game => sample(game)?.hands[stage]).filter(Boolean);
    hands[stage] = {observed: values.length, zero: 0, one: 0, twoOrMore: 0, mulligans: 0,
      printedRezCostDistribution: {}, printedRezSum: {}};
    for (const hand of values) {
      const row = hands[stage], costs = hand.cards.filter(c => c.cardType === 'ice').map(c => c.rezCost);
      row[costs.length === 0 ? 'zero' : costs.length === 1 ? 'one' : 'twoOrMore']++;
      if (hand.mulligan) row.mulligans++;
      for (const cost of costs) row.printedRezCostDistribution[cost] = (row.printedRezCostDistribution[cost] || 0) + 1;
      const sum = costs.reduce((a, b) => a + b, 0);
      row.printedRezSum[sum] = (row.printedRezSum[sum] || 0) + 1;
    }
  }
  return {games: games.length, successful: successful.length,
    failures: games.filter(g => !g.ok).map(g => ({deckPairId: g.deckPairId, seed: g.seed, errors: g.errors})),
    coverage, timing, firstTwoDestinations: firstTwo, exceptions, hands};
}

function summarize(baseline, candidate) {
  for (const field of ['poolHash', 'pairs', 'seeds', 'starts', 'collectors', 'codeHash'])
    if (JSON.stringify(baseline[field]) !== JSON.stringify(candidate[field])) throw Error(`Reports differ in ${field}`);
  const aOptions = structuredClone(baseline.options), bOptions = structuredClone(candidate.options);
  if (aOptions.corp.openingHqThenRdIce !== false || bOptions.corp.openingHqThenRdIce !== true ||
      !aOptions.corp.iceMarginalSecurity || !bOptions.corp.iceMarginalSecurity) throw Error('Unexpected opening/I2 options');
  delete aOptions.corp.openingHqThenRdIce; delete bOptions.corp.openingHqThenRdIce;
  if (JSON.stringify(aOptions) !== JSON.stringify(bOptions)) throw Error('Unexpected second treatment');
  for (const report of [baseline, candidate]) {
    if (new Set(report.games.map(key)).size !== report.games.length) throw Error('Duplicate game keys');
    if (report.games.some(game => game.ok && (!sample(game) || !sample(game).hands.firstDraw)))
      throw Error('Missing opening samples (use real deck starts with openingCentralCoverage)');
  }
  const candidates = new Map(candidate.games.map(game => [key(game), game]));
  if (baseline.games.length !== candidates.size || baseline.games.some(game => !candidates.has(key(game))))
    throw Error('Reports do not contain matching game keys');
  const rows = baseline.games.flatMap(game => {
    const other = candidates.get(key(game));
    return game.ok && other.ok ? [[game, other]] : [];
  });
  const mismatch = rows.filter(([a, b]) => ['offered', 'kept', 'firstDraw'].some(stage =>
    JSON.stringify(sample(a).hands[stage]) !== JSON.stringify(sample(b).hands[stage])));
  const groups = {};
  function group(name, keep) {
    const a = baseline.games.filter(keep), b = candidate.games.filter(keep), matched = rows.filter(([game]) => keep(game));
    const differences = {};
    for (const turn of [1, 2]) {
      const boundary = game => sample(game).boundaries[`turn${turn}`];
      differences[`turn${turn}`] = paired(matched, game => Number(boundary(game).hq > 0 && boundary(game).rd > 0), boundary);
    }
    for (const central of ['hq', 'rd']) {
      const first = game => sample(game).installs.find(i => i.actual === central);
      differences[`${central}.neverInstalled`] = paired(matched, game => Number(!first(game)));
      differences[`${central}.noInstallThroughTurn2OrEarlierEnd`] = paired(matched, game => Number(!first(game) || first(game).turn > 2));
    }
    groups[name] = {baseline: arm(a), candidate: arm(b), paired: differences};
  }
  group('pooled', () => true);
  for (const deck of baseline.pairs) group(deck, game => game.deckPairId === deck);
  for (const n of ['0', '1', '2']) {
    group(`openingIce:${n === '2' ? '2+' : n}`, game => stratum(game) === n);
    for (const deck of baseline.pairs) group(`${deck}/openingIce:${n === '2' ? '2+' : n}`,
      game => game.deckPairId === deck && stratum(game) === n);
  }
  return {pairedSuccessful: rows.length, excludedPairs: baseline.games.length - rows.length,
    handMismatches: mismatch.map(([game]) => ({deckPairId: game.deckPairId, seed: game.seed})),
    valid: mismatch.length === 0 && !groups.pooled.candidate.exceptions.unclassifiedDestination,
    note: 'Printed hand ICE and rez costs are supply diagnostics, not suitability or joint rez affordability. Coverage includes unrezzed ICE.', groups};
}

module.exports = {summarize, arm, paired};
if (require.main === module) {
  const [baseline, candidate] = process.argv.slice(2);
  if (!baseline || !candidate) throw Error('usage: node scripts/ai-batch/opening-central-summary.js <baseline.json> <candidate.json>');
  const result = summarize(JSON.parse(fs.readFileSync(baseline)), JSON.parse(fs.readFileSync(candidate)));
  console.log(JSON.stringify(result, null, 2));
  if (!result.valid) process.exitCode = 1;
}
