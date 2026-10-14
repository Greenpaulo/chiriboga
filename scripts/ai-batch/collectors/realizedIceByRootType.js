'use strict';
const {spearman} = require('./bluffSingleVariableCorrelation');
const name = 'realizedIceByRootType';
const METRICS = ['allCountCorrelation', 'posturedCountCorrelation', 'allCountDistance', 'posturedCountDistance'];
const COVERAGE = Object.freeze({commitmentsPerClass: 10, gamesPerClass: 5, knownPostureFraction: 0.9});

function histogram(rows) {
  const out = {};
  for (const row of rows) out[row.iceCount] = (out[row.iceCount] || 0) + 1;
  return out;
}
function distribution(rows) {
  const agenda = rows.filter(row => row.rootType === 'agenda'), trap = rows.filter(row => row.rootType === 'trap');
  const histograms = {agenda: histogram(agenda), trap: histogram(trap)};
  const bins = new Set([...Object.keys(histograms.agenda), ...Object.keys(histograms.trap)]);
  const distance = !agenda.length || !trap.length ? null : [...bins].reduce((sum, bin) => sum +
    Math.abs((histograms.agenda[bin] || 0) / agenda.length - (histograms.trap[bin] || 0) / trap.length), 0) / 2;
  const rho = spearman(rows.map(row => row.rootType === 'agenda' ? 1 : 0), rows.map(row => row.iceCount));
  const classes = Object.fromEntries([['agenda', agenda], ['trap', trap]].map(([kind, group]) => [kind, {
    observations: group.length, games: new Set(group.map(row => row.gameId)).size,
    roots: new Set(group.map(row => `${row.gameId}:${row.rootId}`)).size,
    commitments: new Set(group.map(row => `${row.gameId}:${row.commitmentId}`)).size,
    servers: new Set(group.map(row => `${row.gameId}:${row.serverId}`)).size,
  }]));
  return {distance, signedCorrelation: rho, correlation: rho === null ? null : Math.abs(rho), histograms, classes,
    prevalence: {agenda: rows.length ? agenda.length / rows.length : null, trap: rows.length ? trap.length / rows.length : null}};
}
function summarize(perGame, detailed = true) {
  const rows = perGame.flatMap(game => (game.rows || []).map(row => ({...row, gameId: game.gameId, deckPairId: game.deckPairId})));
  const headline = rows.filter(row => !row.revealed), postured = headline.filter(row => row.posture === 'active');
  const first = new Map();
  for (const row of rows) {
    const key = `${row.gameId}:${row.commitmentId}`;
    if (!first.has(key)) first.set(key, row);
  }
  const groups = keyOf => {
    const grouped = new Map();
    for (const row of rows) {
      const key = String(keyOf(row));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    }
    return Object.fromEntries([...grouped].map(([key, group]) => [key, distribution(group)]));
  };
  return {all: distribution(headline), postured: distribution(postured), revealed: distribution(rows.filter(row => row.revealed)),
    firstCommitment: distribution([...first.values()].filter(row => !row.revealed)),
    coverage: {observations: rows.length, headline: headline.length,
      knownPostureFraction: headline.length ? headline.filter(row => row.posture !== 'unknown').length / headline.length : 0,
      unknownPosture: headline.filter(row => row.posture === 'unknown').length,
      unknownSafety: headline.filter(row => row.safety === 'unknown').length,
      games: new Set(rows.map(row => row.gameId)).size},
    breakdowns: detailed ? {deckPair: groups(row => row.deckPairId), multiRoot: groups(row => row.multiRoot),
      rootAge: groups(row => row.rootAge === null ? 'leftCensored' : row.rootAge), revelation: groups(row => row.revealed),
      posture: groups(row => row.posture), safety: groups(row => row.safety)} : {},
    lifecycle: {installs: perGame.reduce((n, game) => n + (game.lifecycle || []).filter(e => e.action === 'install').length, 0),
      leaves: perGame.reduce((n, game) => n + (game.lifecycle || []).filter(e => e.action === 'leave').length, 0)},
    errors: perGame.flatMap(game => game.errors || [])};
}
function validateBatch(perGame, metrics = METRICS) {
  if (!Array.isArray(perGame) || !perGame.length) return 'missing realized observations';
  for (const game of perGame) {
    if (!game || typeof game.gameId !== 'string' || typeof game.deckPairId !== 'string' ||
        !Array.isArray(game.rows) || !Array.isArray(game.errors)) return 'invalid realized sample envelope';
    if (game.errors.length) return 'realized observation errors: ' + game.errors.join('; ');
    const boundaries = new Set();
    for (const row of game.rows) {
      if (!row || !['agenda', 'trap'].includes(row.rootType) ||
          !['unknown', 'unrolled', 'active', 'neutral', 'expired', 'safetyStopped'].includes(row.posture) ||
          !['unknown', 'allowedAtLastQuery', 'stopped'].includes(row.safety) ||
          !['iceCount', 'rootId', 'serverId', 'commitmentId', 'turn'].every(key => Number.isInteger(row[key]) && row[key] >= 0) ||
          typeof row.revealed !== 'boolean' || typeof row.multiRoot !== 'boolean' ||
          !(row.rootAge === null || Number.isInteger(row.rootAge) && row.rootAge >= 0)) return 'invalid realized observation columns';
      const boundary = `${row.commitmentId}:${row.turn}`;
      if (boundaries.has(boundary)) return 'duplicate commitment observation at Runner-turn boundary';
      boundaries.add(boundary);
    }
  }
  const stats = summarize(perGame, false);
  for (const population of ['all', 'postured'].filter(population => metrics.some(metric => metric.startsWith(population)))) {
    for (const kind of ['agenda', 'trap']) {
      const coverage = stats[population].classes[kind];
      if (coverage.commitments < COVERAGE.commitmentsPerClass || coverage.games < COVERAGE.gamesPerClass)
        return `insufficient ${population} ${kind} coverage (need ${COVERAGE.commitmentsPerClass} commitments / ${COVERAGE.gamesPerClass} games)`;
    }
    if (metrics.includes(`${population}CountCorrelation`) && stats[population].correlation === null)
      return `undefined ${population} count correlation`;
  }
  if (metrics.some(metric => metric.startsWith('postured')) && stats.coverage.knownPostureFraction < COVERAGE.knownPostureFraction)
    return 'insufficient known posture coverage (need 90%)';
  return true;
}
module.exports = {
  name, COVERAGE, distribution, summarize, validateBatch,
  strictBatchDiagnostics: true,
  directions: Object.fromEntries(METRICS.map(metric => [`${name}.${metric}`, 'lower'])),
  metricNames: METRICS,
  // A view keeps the same trusted sample name and statistics, but validates
  // only requested columns. Undefined rho must not invalidate a defined TV.
  forMetrics(names) {
    const selected = names.map(metric => metric.startsWith(name + '.') ? metric.slice(name.length + 1) : metric);
    if (!selected.length || selected.some(metric => !METRICS.includes(metric))) throw Error('unknown realized defense metric');
    return {...this, metricNames: selected, validateBatch: perGame => validateBatch(perGame, selected),
      finishBatch: perGame => Object.fromEntries(Object.entries(this.finishBatch(perGame)).filter(([metric]) => selected.includes(metric)))};
  },
  onEvent(event, game) {
    if (event.type === 'realizedDefenseSnapshot') (game.rows ||= []).push(...event.rows);
    if (event.type === 'realizedDefenseLifecycle') (game.lifecycle ||= []).push(event);
    if (event.type === 'realizedDefenseError') (game.errors ||= []).push(event.reason);
  },
  finish(game) { return {observations: (game.rows || []).length}; },
  samples(game) { return {gameId: `${game.fixtureId || ''}:${game.deckPairId}:${game.seed}`, deckPairId: game.deckPairId,
    rows: game.rows || [], lifecycle: game.lifecycle || [], errors: game.errors || []}; },
  finishBatch(perGame) {
    const stats = summarize(perGame, false);
    return {allCountCorrelation: stats.all.correlation, posturedCountCorrelation: stats.postured.correlation,
      allCountDistance: stats.all.distance, posturedCountDistance: stats.postured.distance};
  },
};
