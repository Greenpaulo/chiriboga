'use strict';
// Baseline-only precision calibration. This API deliberately does not return
// adoption checks or relax compareReports' matching-seed requirement.
const {pooledComparison, orientDifference} = require('./metrics');

function calibrateReports(first, second, collectors) {
  for (const field of ['poolHash', 'starts', 'collectors', 'options', 'codeHash']) {
    if (JSON.stringify(first[field]) !== JSON.stringify(second[field]))
      throw new Error(`Calibration reports differ in ${field}`);
  }
  if (![first, second].every(report => Array.isArray(report.seeds) && report.seeds.length))
    throw new Error('Calibration requires disjoint seed cohorts');
  const seeds = new Set(first.seeds.map(String));
  if (second.seeds.some(seed => seeds.has(String(seed))))
    throw new Error('Calibration requires disjoint seed cohorts');
  const cohorts = [first, second].map(report => {
    const strata = new Map(), keys = new Set(), cohortSeeds = new Set(report.seeds.map(String));
    for (const game of report.games) {
      if (!cohortSeeds.has(String(game.seed))) throw new Error('Game seed outside calibration cohort');
      const stratum = JSON.stringify([game.fixtureId || '', game.deckPairId]);
      const key = stratum + ':' + game.seed;
      if (keys.has(key)) throw new Error('Duplicate calibration game key');
      keys.add(key);
      if (game.ok) {
        if (!strata.has(stratum)) strata.set(stratum, []);
        strata.get(stratum).push(game);
      }
    }
    for (const games of strata.values()) games.sort((a, b) => String(a.seed).localeCompare(String(b.seed)));
    return strata;
  });
  const strata = [...cohorts[0].keys()].sort();
  if (!strata.length || JSON.stringify(strata) !== JSON.stringify([...cohorts[1].keys()].sort()))
    throw new Error('Calibration requires successful games in matching deck-pair/fixture strata');
  const out = {};
  for (const collector of collectors) {
    if (!first.collectors?.includes(collector.name)) throw new Error('Calibration collector not in reports');
    if (typeof collector.finishBatch !== 'function') continue;
    const samples = cohorts.map(cohort => strata.map(key => cohort.get(key).map(game => {
      if (!game.samples || !Object.prototype.hasOwnProperty.call(game.samples, collector.name))
        throw new Error('Missing calibration samples');
      return game.samples[collector.name];
    })));
    const result = pooledComparison(collector, samples.map(arm => arm.flat()), random =>
      samples.map(arm => arm.flatMap(games => Array.from({length: games.length}, () =>
        games[Math.floor(random() * games.length)]))), 'f11-independent-calibration');
    for (const [name, value] of Object.entries(result)) {
      const direction = collector.directions?.[name] || null;
      out[name] = {...value, direction, improvement: orientDifference(value, direction)};
    }
  }
  return {kind: 'independent calibration', metrics: out, strata,
    games: cohorts.map(cohort => [...cohort.values()].reduce((sum, games) => sum + games.length, 0)),
    droppedGames: [first, second].map(report => report.games.filter(game => !game.ok).length)};
}

module.exports = {calibrateReports};
