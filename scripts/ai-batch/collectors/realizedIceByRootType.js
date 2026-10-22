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
function attribution(perGame) {
  const installs = [], endpoints = [], changes = [];
  for (const game of perGame) {
    const stamp = event => ({...event, gameId: game.gameId, deckPairId: game.deckPairId});
    installs.push(...(game.lifecycle || []).filter(e => e.action === 'install' && ['agenda', 'trap'].includes(e.rootType)).map(stamp));
    endpoints.push(...(game.lifecycle || []).filter(e => e.action === 'endpoint' && ['agenda', 'trap'].includes(e.rootType)).map(stamp));
    changes.push(...(game.changes || []).map(stamp));
  }
  const known = installs.filter(e => !e.leftCensored && Number.isInteger(e.iceCount));
  const group = (rows, keyOf) => {
    const out = {};
    for (const row of rows) { const key = keyOf(row); (out[key] ||= []).push(row); }
    return out;
  };
  const counts = (rows, keyOf) => Object.fromEntries(Object.entries(group(rows, keyOf)).map(([key, values]) => [key, values.length]));
  const roots = new Map(installs.map(row => [`${row.gameId}:${row.commitmentId}`, row]));
  const allocations = [];
  for (const event of changes.filter(e => ['iceAdded', 'iceRemoved'].includes(e.action)))
    for (const id of event.commitments) {
      const root = roots.get(`${event.gameId}:${id}`);
      if (!root) continue;
      allocations.push({...event, rootType: root.rootType, rootAge: root.installedTurn === null ? null : event.turn - root.installedTurn});
    }
  // These are descriptive game-clustered intervals, separate from adoption's
  // paired pooled gate. Stratify by deck; never treat repeated roots as games.
  const interval = rows => {
    const point = distribution(rows);
    const sufficient = stats => ['agenda', 'trap'].every(kind =>
      stats.classes[kind].commitments >= COVERAGE.commitmentsPerClass && stats.classes[kind].games >= COVERAGE.gamesPerClass);
    const result = {value: point.distance, low: null, high: null, resamples: 200, invalidDraws: 0,
      valid: false, why: null};
    if (!sufficient(point)) return {...result, why: 'insufficient installation class/game coverage'};
    const decks = new Set(rows.map(row => row.deckPairId)), byGame = group(rows, row => row.gameId);
    // Include games with no qualifying root: dropping them would condition
    // on observation and change deck-composition uncertainty.
    const byDeck = group(perGame.filter(game => decks.has(game.deckPairId)), game => game.deckPairId);
    const strata = Object.values(byDeck).map(games => games.map(game => byGame[game.gameId] || []));
    const random = require('../metrics').seededRandom('L8.9-installation-TV');
    const draws = [];
    for (let i = 0; i < result.resamples; i++) {
      const sample = strata.flatMap(games => Array.from({length: games.length}, () => games[Math.floor(random() * games.length)]).flat());
      const stats = distribution(sample);
      if (!sufficient(stats) || stats.distance === null) result.invalidDraws++; else draws.push(stats.distance);
    }
    if (result.invalidDraws) return {...result, why: 'invalid installation bootstrap draws'};
    draws.sort((a, b) => a - b);
    return {...result, valid: true, low: draws[5], high: draws[194]};
  };
  const age = value => value === null ? 'leftCensored' : value < 3 ? String(value) : '3+';
  return {version: 1, coverage: {installs: installs.length, knownInstallationDefense: known.length,
    leftCensored: installs.filter(e => e.leftCensored).length,
    unknownPlacement: installs.filter(e => !e.placement?.decision).length,
    selection: counts(installs, e => e.placement?.selection || 'unknown')},
    installation: {all: distribution(known), unrevealed: distribution(known.filter(e => !e.revealed)),
      interval: interval(known.filter(e => !e.revealed)),
      deckPair: Object.fromEntries(Object.entries(group(known, e => e.deckPairId)).map(([key, rows]) =>
        [key, {distribution: distribution(rows), interval: interval(rows)}])),
      route: counts(known, e => `${e.rootType}:${e.placement?.decision?.source === 'directCommand' ?
        e.placement.decision.hook ? 'hookDirect' : 'directUnknown' : e.placement?.decision?.hvt === true ? 'HVT' :
        e.placement?.decision?.hvt === false ? 'nonHVT' : 'unknown'}`),
      posture: counts(known, e => `${e.rootType}:${e.posture}`),
      safety: counts(known, e => `${e.rootType}:${e.safety}`),
      multiRoot: counts(known, e => `${e.rootType}:${e.multiRoot}`)},
    endpoints: counts(endpoints, e => `${e.rootType}:${e.fate}`),
    endpointAges: counts(endpoints, e => `${e.rootType}:${e.fate}:${age(e.installedTurn === null ? null : (e.leftTurn ?? e.turn) - e.installedTurn)}`),
    serverIceChanges: Object.fromEntries(['iceAdded', 'iceRemoved'].map(action =>
      [action, changes.filter(e => e.action === action).reduce((sum, e) => sum + e.count, 0)])),
    // Shared defense is counted once above; below is explicitly root exposure
    // to a change, allowing age comparisons, never independent allocations.
    rootChangeExposure: Object.fromEntries(Object.entries(group(allocations, e => `${e.rootType}:${e.action}:${age(e.rootAge)}`))
      .map(([key, rows]) => [key, {events: rows.length, layers: rows.reduce((sum, e) => sum + e.count, 0)}])),
    postureTransitions: counts(changes.filter(e => e.action === 'posture'), e => `${e.rootType}:${e.previous ?? 'initial'}:${e.posture}`)};
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
    attribution: detailed ? attribution(perGame) : undefined,
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
    if (event.type === 'realizedDefenseChange') (game.changes ||= []).push(event);
    if (event.type === 'realizedDefenseError') (game.errors ||= []).push(event.reason);
  },
  finish(game) { return {observations: (game.rows || []).length}; },
  samples(game) { return {gameId: `${game.fixtureId || ''}:${game.deckPairId}:${game.seed}`, deckPairId: game.deckPairId,
    rows: game.rows || [], lifecycle: game.lifecycle || [], changes: game.changes || [], errors: game.errors || []}; },
  finishBatch(perGame) {
    const stats = summarize(perGame, false);
    return {allCountCorrelation: stats.all.correlation, posturedCountCorrelation: stats.postured.correlation,
      allCountDistance: stats.all.distance, posturedCountDistance: stats.postured.distance};
  },
};
