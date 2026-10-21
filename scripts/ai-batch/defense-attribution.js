'use strict';
// Read completed F12 reports only. No engine, policy or gameplay is invoked.
const fs = require('fs');
const crypto = require('crypto');

function analyze(report) {
  const routes = new Map(), decks = new Map(), zeroSnapshots = new Map(), ages = new Map();
  const count = (map, key, make) => {
    if (!map.has(key)) map.set(key, make());
    return map.get(key);
  };
  let installs = 0, missingSnapshots = 0, missingPlacement = 0;
  for (const game of report.games.filter(game => game.ok)) {
    const sample = game.samples?.realizedIceByRootType;
    if (!sample || sample.errors?.length) throw Error('Missing or invalid F12 sample');
    const roots = new Map(), endpoints = new Map();
    for (const event of sample.lifecycle || []) {
      if (!['agenda', 'trap'].includes(event.rootType)) continue;
      if (event.action === 'endpoint') endpoints.set(event.commitmentId, event);
      if (event.action !== 'install') continue;
      if (roots.has(event.commitmentId)) throw Error('Duplicate install commitment');
      if (!event.leftCensored && !Number.isInteger(event.iceCount)) throw Error('Missing install-time ICE count');
      roots.set(event.commitmentId, {event, snapshots: [], added: 0, removed: 0});
    }
    for (const row of sample.rows || []) {
      const root = roots.get(row.commitmentId);
      if (!root) throw Error('Snapshot without install observation');
      root.snapshots.push(row);
      if (row.revealed) continue;
      const age = count(ages, JSON.stringify([row.rootType, row.rootAge]), () =>
        ({rootType: row.rootType, age: row.rootAge, snapshots: 0, zeroIce: 0}));
      age.snapshots++; age.zeroIce += row.iceCount === 0;
      if (row.iceCount !== 0) continue;
      const origin = row.leftCensored ? 'leftCensored' : root.event.iceCount === 0 ? 'installedAtZero' : 'lostDefense';
      const key = JSON.stringify([row.rootType, origin, root.event.placement?.chosenReason || 'unknown']);
      const bucket = count(zeroSnapshots, key, () => ({rootType: row.rootType, origin,
        reason: root.event.placement?.chosenReason || 'unknown', snapshots: 0, commitments: new Set(), games: new Set()}));
      bucket.snapshots++; bucket.commitments.add(`${sample.gameId}:${row.commitmentId}`); bucket.games.add(sample.gameId);
    }
    for (const event of sample.changes || []) {
      if (!['iceAdded', 'iceRemoved'].includes(event.action)) continue;
      for (const id of event.commitments) {
        const root = roots.get(id);
        if (root) root[event.action === 'iceAdded' ? 'added' : 'removed'] += event.count;
      }
    }
    for (const [id, root] of roots) {
      const e = root.event, reason = e.placement?.chosenReason || 'unknown', decision = e.placement?.decision;
      installs++; missingSnapshots += root.snapshots.length === 0; missingPlacement += !decision;
      const route = count(routes, JSON.stringify([e.rootType, reason]), () => ({rootType: e.rootType, reason,
        installs: 0, zeroIce: 0, newRemote: 0, offeredScoring: 0, availableScoring: 0,
        snapshots: 0, unrevealedSnapshots: 0, zeroSnapshots: 0, withoutSnapshot: 0,
        rootsWithAddedIce: 0, rootsWithRemovedIce: 0, endpoints: {}}));
      route.installs++; route.zeroIce += e.iceCount === 0;
      route.newRemote += e.placement?.requestedServerId === 0;
      route.offeredScoring += decision?.preferences.some(p => p.reason === 'HVT into scoring server') ? 1 : 0;
      route.availableScoring += decision?.destinations.some(d => d.emptyProtected && d.scoringEligible === true) ? 1 : 0;
      route.snapshots += root.snapshots.length;
      route.unrevealedSnapshots += root.snapshots.filter(row => !row.revealed).length;
      route.zeroSnapshots += root.snapshots.filter(row => !row.revealed && row.iceCount === 0).length;
      route.withoutSnapshot += root.snapshots.length === 0;
      route.rootsWithAddedIce += root.added > 0; route.rootsWithRemovedIce += root.removed > 0;
      const fate = endpoints.get(id)?.fate || 'unknown';
      route.endpoints[fate] = (route.endpoints[fate] || 0) + 1;
      const deck = count(decks, JSON.stringify([game.deckPairId, e.rootType, reason]), () =>
        ({deckPairId: game.deckPairId, rootType: e.rootType, reason, installs: 0, zeroIce: 0,
          unrevealedSnapshots: 0, zeroSnapshots: 0}));
      deck.installs++; deck.zeroIce += e.iceCount === 0;
      deck.unrevealedSnapshots += root.snapshots.filter(row => !row.revealed).length;
      deck.zeroSnapshots += root.snapshots.filter(row => !row.revealed && row.iceCount === 0).length;
    }
  }
  return {kind: 'L8.9 observed defense attribution', version: 1,
    provenance: {codeHash: report.codeHash, poolHash: report.poolHash, options: report.options,
      seeds: report.seeds, pairs: report.pairs, command: report.command},
    coverage: {games: report.games.filter(game => game.ok).length, failures: report.games.filter(game => !game.ok).length,
      installs, missingSnapshots, missingPlacement},
    routes: [...routes.values()], decks: [...decks.values()], ages: [...ages.values()],
    zeroSnapshots: [...zeroSnapshots.values()].map(row => ({...row, commitments: row.commitments.size, games: row.games.size})),
    diagnostics: report.batchDiagnostics?.realizedIceByRootType,
    metrics: report.batchMetrics,
    limits: ['Observed routes identify exercised code paths, not additive causal effect sizes.',
      'Unknown placement and roots with no Runner-turn snapshot remain in coverage.',
      'Per-root allocation exposure shares defense; it is not independent server allocation.',
      'The collector route diagnostic is HVT-query classification; routes here use the actual chosen reason.']};
}

if (require.main === module) {
  const [file, output] = process.argv.slice(2);
  if (!file) throw Error('Usage: node scripts/ai-batch/defense-attribution.js <completed-report.json> [output.json]');
  const bytes = fs.readFileSync(file);
  const result = analyze(JSON.parse(bytes));
  result.source = {file, sha256: crypto.createHash('sha256').update(bytes).digest('hex')};
  if (output) fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({coverage: result.coverage, routes: result.routes, zeroSnapshots: result.zeroSnapshots}, null, 2));
}
module.exports = {analyze};
