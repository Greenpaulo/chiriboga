'use strict';
// Gate setup for hosted-ICE rez changes
// (documentation/bugs/hosted-ice-rez-ignores-repeated-tax.md): the
// hostedThreatRezCredits collector, the harness `rez` event it reads, and the
// real-board Chromatophores and Tranquilizer start boards under
// tests/fixtures/ai-batch/starts/.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {playGame} = require('../scripts/ai-batch/headless');
const batch = require('../scripts/ai-batch');
const collector = require('../scripts/ai-batch/collectors/hostedThreatRezCredits');
const metrics = require('../scripts/ai-batch/metrics');

const root = path.resolve(__dirname, '..');
const {pool, setFiles, ranges} = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool.json'));
const STARTS = [
  {file: 'tests/fixtures/ai-batch/starts/hosted-chromatophores-on-remote-ice.txt', hosted: 'Chromatophores', pair: 'pd-tao', seed: '1'},
  {file: 'tests/fixtures/ai-batch/starts/hosted-tranquilizer-on-remote-ice.txt', hosted: 'Tranquilizer', pair: 'neh-zahya', seed: '2'},
];
const verbose = !!process.env.VERBOSE;
let passed = 0;
const failures = [];

async function scenario(name, fn) {
  try {
    await fn();
    passed++;
    if (verbose) console.log('ok   ' + name);
  } catch (error) {
    failures.push(name + ': ' + (error.stack || error.message));
  }
}

function collect(events) {
  const game = {};
  for (const event of [{type: 'gameStart'}, ...events]) collector.onEvent(Object.freeze(event), game);
  return metrics.flattenCollector(collector.name, collector.finish(game));
}

// Run inside the game before play: evaluate the approached Remote 0 rez and
// capture the reason the Corp AI logs.
const PROBE = `
  var __server = corp.remoteServers[0], __ice = __server.ice[0], __messages = [], __log = corp.AI._log;
  attackedServer = __server; approachIce = 0; playerTurn = runner;
  corp.AI._log = function(message) { __messages.push(String(message)); };
  var __probeRez = corp.AI._iceWorthRezzing(__ice, RezCost(__ice), __server);
  corp.AI._log = __log;
  attackedServer = null; approachIce = -1; playerTurn = corp;
  var __probe = {hosted: __ice.hostedCards.map(function(c) { return c.title; }), rez: __probeRez,
    vetoed: __messages.some(function(m) { return /hosted .* requires/.test(m); })};
  __report = function() { return __probe; };`;

(async () => {
  await scenario('1. collector totals rez credits for ICE with a non-exempt hosted card, split by title', async () => {
    const m = collect([
      {type: 'rez', card: 'Lotus Field', cardType: 'ice', cost: 6, hosted: [{title: 'Tranquilizer', exempt: false}]},
      {type: 'rez', card: 'Palisade', cardType: 'ice', cost: 4, hosted: [{title: 'Chromatophores', exempt: false}, {title: 'Saci', exempt: true}]},
      {type: 'rez', card: 'Palisade', cardType: 'ice', cost: 4, hosted: [{title: 'Saci', exempt: true}]},
      {type: 'rez', card: 'Bumi 1.0', cardType: 'ice', cost: 4, hosted: []},
      {type: 'rez', card: 'Mahkota Langit Grid', cardType: 'upgrade', cost: 2, hosted: [{title: 'Tranquilizer', exempt: false}]},
    ]);
    assert.deepStrictEqual(m, {
      'hostedThreatRezCredits.total': 10,
      'hostedThreatRezCredits.Tranquilizer': 6,
      'hostedThreatRezCredits.Chromatophores': 4,
    });
    assert.deepStrictEqual(collect([]), {'hostedThreatRezCredits.total': 0});
    assert.strictEqual(collector.directions['hostedThreatRezCredits.Tranquilizer'], 'lower');
  });

  const setupFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'hosted-rez-')), 'probe.js');
  fs.writeFileSync(setupFile, PROBE);
  for (const start of STARTS) {
    await scenario(`2. ${path.basename(start.file)}: pool cards only, plays cleanly, reaches the hosted-ICE rez`, async () => {
      assert.strictEqual(batch.resolveStarts([path.join(root, start.file)], ranges).length, 1);
      const pair = pool.pairs.find(p => p.id === start.pair);
      const rezzes = [];
      const game = await playGame({streamPrefix: start.seed + ':' + start.pair, corpFile: pair.corp, runnerFile: pair.runner, setFiles,
        timeoutMs: 60000, start: path.join(root, start.file), setupFile, observe: true,
        onEvent: event => { if (event.type === 'rez') rezzes.push(event); }});
      assert.deepStrictEqual(game.errors, [], 'engine errors');
      assert.ok(game.winner, 'the game finished');
      // The board's remote decision is the one a hosted-ICE rez change targets:
      // the hosted card is there and the current rule vetoes the rez.
      assert.deepStrictEqual(game.report, {hosted: [start.hosted], rez: false, vetoed: true});
      assert.ok(rezzes.length > 0 && rezzes.every(e => e.card && e.cardType && e.cost >= 0 && Array.isArray(e.hosted)),
        'rez events carry card, type, cost and hosted cards');
    });
  }
  fs.rmSync(path.dirname(setupFile), {recursive: true, force: true});

  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`hosted-threat-rez-gate-setup: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`hosted-threat-rez-gate-setup: ${passed} scenarios passed`);
})();
