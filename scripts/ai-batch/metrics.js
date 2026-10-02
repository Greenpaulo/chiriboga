'use strict';
// F4 metrics: per-game core metrics from the harness event stream, report
// aggregation, and the paired bootstrap comparison rule from
// documentation/ai-planning.md (Acceptance gates). Pure functions, so they can
// be tested on scripted events and synthetic reports.

// Which direction is better for each core metric, from the Corp's side
// (null: neither). A gate may say otherwise with --better.
const CORE_DIRECTIONS = {
  winRate: 'higher', pointsScored: 'higher', pointsStolen: 'lower',
  'pointsStolenByServer.hq': 'lower', 'pointsStolenByServer.rd': 'lower',
  'pointsStolenByServer.archives': 'lower', 'pointsStolenByServer.remote': 'lower',
  gameLength: null,
  'decisionLatencyMs.corp.mean': 'lower', 'decisionLatencyMs.corp.p95': 'lower', 'decisionLatencyMs.corp.max': 'lower',
  'decisionLatencyMs.runner.mean': 'lower', 'decisionLatencyMs.runner.p95': 'lower', 'decisionLatencyMs.runner.max': 'lower',
  'mulliganRate.corp': null, 'mulliganRate.runner': null,
};

// Metrics that measure wall time: they vary between identical runs and are
// left out when reports are checked for reproducibility.
const isTimingMetric = name => name.startsWith('decisionLatencyMs.') || /(^|\.)ms$/.test(name);

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1)];
}

function latency(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
  return {mean: round(mean), p95: round(percentile(sorted, 0.95)), max: round(sorted.length ? sorted[sorted.length - 1] : 0)};
}

const round = value => Math.round(value * 1000) / 1000;

// events: the game's events in order (see headless.js). Returns a flat object
// of metric name -> number.
function coreMetrics(events) {
  const stolen = {hq: 0, rd: 0, archives: 0, remote: 0};
  const latencies = {corp: [], runner: []};
  const mulligans = {corp: 0, runner: 0};
  let scored = 0, winner = null, turns = 0;
  for (const event of events) {
    if (event.type === 'score') scored += event.points;
    else if (event.type === 'steal') stolen[event.server in stolen ? event.server : 'remote'] += event.points;
    else if (event.type === 'decision') latencies[event.side].push(event.latencyMs);
    else if (event.type === 'mulligan') mulligans[event.side] = 1;
    else if (event.type === 'gameEnd') { winner = event.winner; turns = event.turns; }
  }
  const metrics = {
    winRate: winner === 'corp' ? 1 : 0,
    pointsScored: scored,
    pointsStolen: stolen.hq + stolen.rd + stolen.archives + stolen.remote,
    gameLength: turns,
  };
  for (const key in stolen) metrics['pointsStolenByServer.' + key] = stolen[key];
  for (const side of ['corp', 'runner']) {
    const stats = latency(latencies[side]);
    for (const key in stats) metrics[`decisionLatencyMs.${side}.${key}`] = stats[key];
    metrics['mulliganRate.' + side] = mulligans[side];
  }
  return metrics;
}

// A collector's finish() result (a number or an object of numbers) as flat
// metric names prefixed by the collector name.
function flattenCollector(name, value) {
  const out = {};
  const walk = (prefix, v) => {
    if (typeof v === 'number') out[prefix] = v;
    else if (v && typeof v === 'object') for (const key in v) walk(prefix + '.' + key, v[key]);
    else throw new Error(`Collector ${name} returned a non-numeric value at ${prefix}`);
  };
  walk(name, value);
  return out;
}

const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

// Per-pair (and per-fixture) and pooled means of every metric over finished games.
function aggregate(games) {
  const groups = {pooled: games.filter(g => g.ok)};
  for (const game of groups.pooled) {
    const key = (game.fixtureId ? game.fixtureId + '/' : '') + game.deckPairId;
    (groups[key] = groups[key] || []).push(game);
  }
  const out = {};
  for (const key in groups) {
    const names = new Set(groups[key].flatMap(g => Object.keys(g.metrics)));
    out[key] = {games: groups[key].length, metrics: {}};
    for (const name of [...names].sort())
      out[key].metrics[name] = round(mean(groups[key].map(g => g.metrics[name] || 0)));
  }
  return out;
}

// Small deterministic PRNG (mulberry32) seeded from a string, so the bootstrap
// is reproducible and independent of metric order.
function seededRandom(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bootstrap(differences, label, resamples = 10000, seed = 'f4-bootstrap') {
  const random = seededRandom(seed + ':' + label);
  const n = differences.length;
  const means = new Float64Array(resamples);
  for (let r = 0; r < resamples; r++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += differences[Math.floor(random() * n)];
    means[r] = n ? sum / n : 0;
  }
  means.sort();
  return {low: means[Math.floor(0.025 * resamples)], high: means[Math.ceil(0.975 * resamples) - 1]};
}

const gameKey = g => [g.fixtureId || '', g.deckPairId, g.seed].join('|');

// The fields that must match for two reports to be compared: only the AI
// options may differ.
const COMPARABLE_FIELDS = ['poolHash', 'seeds', 'starts', 'collectors'];

function compareReports(baseline, candidate, gate = {}) {
  for (const field of COMPARABLE_FIELDS) {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(candidate[field]))
      throw new Error(`Reports differ in ${field}; only the AI options may differ`);
  }
  const byKey = new Map(baseline.games.map(g => [gameKey(g), g]));
  const pairs = [];
  let dropped = 0;
  for (const game of candidate.games) {
    const base = byKey.get(gameKey(game));
    if (base && base.ok && game.ok) pairs.push([base, game]); else dropped++;
  }
  const directions = Object.assign({}, CORE_DIRECTIONS, baseline.directions || {}, gate.better || {});
  const names = [...new Set(pairs.flatMap(([b, c]) => [...Object.keys(b.metrics), ...Object.keys(c.metrics)]))].sort();
  const metrics = {};
  for (const name of names) {
    const differences = pairs.map(([b, c]) => (c.metrics[name] || 0) - (b.metrics[name] || 0));
    const interval = bootstrap(differences, name);
    const direction = directions[name] || null;
    const sign = direction === 'lower' ? -1 : 1;
    const oriented = direction ? {
      mean: sign * mean(differences),
      low: sign === 1 ? interval.low : -interval.high,
      high: sign === 1 ? interval.high : -interval.low,
    } : null;
    metrics[name] = {
      baseline: round(mean(pairs.map(([b]) => b.metrics[name] || 0))),
      candidate: round(mean(pairs.map(([, c]) => c.metrics[name] || 0))),
      difference: round(mean(differences)), low: round(interval.low), high: round(interval.high),
      direction, improvement: oriented && {mean: round(oriented.mean), low: round(oriented.low), high: round(oriented.high)},
    };
  }
  // Gate: a guarded metric must not admit a regression beyond its tolerance;
  // an improved metric needs its oriented interval above zero.
  const checks = [];
  // An option that changes no game passes every guard without evidence (a
  // broken wire or an unreachable branch), so a gate also requires that the
  // candidate played differently. Reports without log hashes skip the check.
  const hashed = pairs.filter(([b, c]) => b.logHash && c.logHash);
  const changedGames = hashed.filter(([b, c]) => b.logHash !== c.logHash).length;
  const gated = Object.keys(gate.guard || {}).length || (gate.improve || []).length || Object.keys(gate.max || {}).length;
  // A behaviour-identical item (a performance change) is the reverse: every
  // paired game must replay the baseline exactly, and every pair must be hashed.
  if (gate.identical)
    checks.push({name: 'identical games', kind: 'identical', pass: pairs.length > 0 && hashed.length === pairs.length && changedGames === 0,
      why: !pairs.length ? 'no paired games' : hashed.length < pairs.length ? 'some games have no log hash'
        : changedGames ? changedGames + ' games differ from the baseline' : undefined});
  else if (gated && hashed.length)
    checks.push({name: 'option effect', kind: 'changed', pass: changedGames > 0,
      why: changedGames ? undefined : 'no game differs from the baseline'});
  for (const [name, tolerance] of Object.entries(gate.guard || {})) {
    const m = metrics[name];
    if (!m || !m.improvement) { checks.push({name, kind: 'guard', pass: false, why: m ? 'no direction declared' : 'unknown metric'}); continue; }
    checks.push({name, kind: 'guard', tolerance, pass: m.improvement.low > -tolerance});
  }
  for (const name of gate.improve || []) {
    const m = metrics[name];
    if (!m || !m.improvement) { checks.push({name, kind: 'improve', pass: false, why: m ? 'no direction declared' : 'unknown metric'}); continue; }
    checks.push({name, kind: 'improve', pass: m.improvement.low > 0});
  }
  return {pairedGames: pairs.length, droppedGames: dropped, changedGames: hashed.length ? changedGames : null, metrics, checks,
    pass: checks.length ? checks.every(c => c.pass) : null};
}

module.exports = {CORE_DIRECTIONS, coreMetrics, flattenCollector, aggregate, bootstrap, compareReports, isTimingMetric, seededRandom};
