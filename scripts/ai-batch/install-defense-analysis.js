'use strict';
// Offline diagnostics only. F12 remains the authority for gated metrics.
const {seededRandom} = require('./metrics');
function analyzeReports(reports, {resamples = 2000} = {}) {
  if (!Number.isInteger(resamples) || resamples < 1) throw Error('Invalid resamples');
  const keys = new Set(), strata = new Map(), buckets = new Map();
  const coverage = {games: 0, failedGames: 0, leftCensored: 0};
  const definitions = {bareRate: ['bare', 'installs'], lastBareRate: ['lastBare', 'seen'],
    gainedNetRate: ['gainedNet', 'seen'], addedRate: ['added', 'installs'],
    zeroRate: ['zero', 'snapshots'], meanEndpointAge: ['endpointAgeSum', 'endpointAgeN'],
    meanLastSnapshotAge: ['lastAgeSum', 'seen']};
  const rateFields = [...new Set(Object.values(definitions).flat())];
  for (const report of reports) {
    for (const field of ['codeHash', 'poolHash', 'options', 'starts', 'collectors'])
      if (JSON.stringify(report[field]) !== JSON.stringify(reports[0][field])) throw Error(`Reports differ in ${field}`);
    for (const game of report.games) {
      const key = JSON.stringify([game.fixtureId || '', game.deckPairId, game.seed]);
      if (keys.has(key)) throw Error('Duplicate game');
      keys.add(key);
      if (!game.ok) { coverage.failedGames++; continue; }
      const s = game.samples?.realizedIceByRootType;
      if (!s || s.errors?.length) throw Error('Missing or invalid F12 sample');
      coverage.games++;
      const local = new Map();
      const add = (group, fields) => {
        const name = JSON.stringify(group);
        if (!buckets.has(name)) buckets.set(name, {group, counts: {}, games: 0});
        if (!local.has(name)) local.set(name, {});
        const counts = local.get(name);
        for (const [k, v] of Object.entries(fields)) counts[k] = (counts[k] || 0) + v;
      };
      const roots = new Map(), endpoints = new Map(), seen = new Set();
      for (const e of s.lifecycle || []) {
        if (e.action === 'endpoint') endpoints.set(e.commitmentId, e);
        if (e.action !== 'install') continue;
        if (seen.has(e.commitmentId)) throw Error('Duplicate commitment');
        seen.add(e.commitmentId);
        if (e.leftCensored) { coverage.leftCensored++; continue; }
        if (!Number.isInteger(e.iceCount) || e.iceCount < 0) throw Error('Unknown install ICE');
        roots.set(e.commitmentId, {e, rows: [], added: 0, removed: 0});
      }
      for (const row of s.rows || []) {
        const root = roots.get(row.commitmentId);
        if (!root && !row.leftCensored) throw Error('Snapshot without commitment');
        if (root) root.rows.push(row);
      }
      for (const c of s.changes || []) {
        if (!['iceAdded', 'iceRemoved'].includes(c.action)) continue;
        for (const id of c.commitments) {
          const root = roots.get(id);
          if (root) root[c.action === 'iceAdded' ? 'added' : 'removed'] += c.count;
        }
      }
      for (const [id, root] of roots) {
        const {e, rows} = root, type = e.rootType || 'unknown';
        const route = e.placement?.chosenReason || 'unknown';
        const last = rows.reduce((a, b) => !a || b.turn >= a.turn ? b : a, null);
        const endpoint = endpoints.get(id), fate = endpoint?.fate || 'missing';
        // Game end is right censoring, not an observed natural lifetime.
        const endAge = endpoint ? (endpoint.leftTurn ?? endpoint.turn) - e.installedTurn : null;
        const d = e.placement?.decision;
        const fields = {installs: 1, bare: +(e.iceCount === 0), seen: +!!last,
          lastBare: +(last?.iceCount === 0), lastAgeSum: last ? last.turn - e.installedTurn : 0,
          gainedNet: +(!!last && last.iceCount > e.iceCount),
          added: +(root.added > 0), removed: +(root.removed > 0),
          [`endpoint:${fate}`]: 1, endpointAgeN: +(endAge !== null), endpointAgeSum: endAge ?? 0,
          rightCensored: +(fate === 'gameEnd'), missingPlacement: +!d,
          newRemote: +(e.placement?.requestedServerId === 0),
          protectedAvailable: +(d?.destinations.some(x => x.emptyProtected) || false),
          scoringAvailable: +(d?.destinations.some(x => x.scoringEligible === true) || false),
          bareWithProtectedAvailable: +(e.iceCount === 0 && (d?.destinations.some(x => x.emptyProtected) || false)),
          nonBareWithoutProtectedAvailable: +(e.iceCount > 0 && d && !d.destinations.some(x => x.emptyProtected))};
        for (const group of [['class', type], ['route', type, route], ['deck', game.deckPairId, type],
          ['deckRoute', game.deckPairId, type, route], ['endpoint', type, fate]]) add(group, fields);
        for (const row of rows) {
          const f = {snapshots: 1, zero: +(row.iceCount === 0), revealed: +!!row.revealed,
            multiRoot: +!!row.multiRoot, safetyStopped: +(row.safety === 'stopped'),
            installedBare: +(row.iceCount === 0 && e.iceCount === 0),
            lostDefense: +(row.iceCount === 0 && e.iceCount > 0)};
          add(['exposure', type, 'all'], f);
          add(['posture', type, row.posture || 'unknown'], f);
          add(['routeExposure', type, route], f);
          add(['deckExposure', game.deckPairId, type], f);
          if (!row.revealed) {
            add(['exposure', type, 'hidden'], f);
            const age = row.rootAge;
            const band = age == null ? 'unknown' : age < 3 ? String(age) : age < 6 ? '3-5' : '6+';
            add(['age', type, band], f);
          }
        }
      }
      for (const [name, counts] of local) {
        const bucket = buckets.get(name); bucket.games++;
        for (const [k, v] of Object.entries(counts)) bucket.counts[k] = (bucket.counts[k] || 0) + v;
      }
      const stratum = JSON.stringify([game.fixtureId || '', game.deckPairId]);
      if (!strata.has(stratum)) strata.set(stratum, []);
      strata.get(stratum).push(local);
    }
  }
  const draws = new Map([...buckets].map(([k]) => [k, {}]));
  const random = seededRandom('L8.9-install-defense-v1');
  for (let n = 0; n < resamples; n++) {
    const totals = new Map();
    for (const games of strata.values()) {
      const weights = new Map();
      for (let i = 0; i < games.length; i++) {
        const id = Math.floor(random() * games.length);
        weights.set(id, (weights.get(id) || 0) + 1);
      }
      for (const [id, weight] of weights) for (const [key, counts] of games[id]) {
        if (!totals.has(key)) totals.set(key, {});
        const total = totals.get(key);
        for (const field of rateFields)
          if (counts[field]) total[field] = (total[field] || 0) + counts[field] * weight;
      }
    }
    for (const [key, bucket] of buckets) for (const [metric, [num, den]] of Object.entries(definitions)) {
      if (!bucket.counts[den]) continue;
      const series = draws.get(key)[metric] ||= [], counts = totals.get(key);
      series.push(counts?.[den] ? (counts[num] || 0) / counts[den] : null);
    }
  }
  return {kind: 'L8.9 offline install/lifecycle analysis', coverage, resamples,
    uncertainty: '95% percentile bootstrap; whole games resampled within deck-pair/fixture strata',
    otherSplit: 'Unavailable: saved lifecycle records lack asset/upgrade type and card identity; routes are not type labels',
    buckets: [...buckets].map(([key, bucket]) => {
      const rates = {};
      for (const [metric, [num, den]] of Object.entries(definitions)) {
        if (!bucket.counts[den]) continue;
        const series = draws.get(key)[metric], invalidDraws = series.filter(x => x === null).length;
        series.sort((a, b) => a - b);
        const valid = bucket.games >= 5 && !invalidDraws;
        rates[metric] = {value: (bucket.counts[num] || 0) / bucket.counts[den],
          low: valid ? series[Math.floor(.025 * resamples)] : null,
          high: valid ? series[Math.ceil(.975 * resamples) - 1] : null, valid, invalidDraws};
      }
      return {...bucket, rates};
    })};
}
module.exports = {analyzeReports};
