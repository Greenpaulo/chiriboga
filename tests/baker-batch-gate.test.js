'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const batch = require('../scripts/ai-batch');
const {loadPrecon} = require('../scripts/ai-batch/headless');
const collector = require('../scripts/ai-batch/collectors/redirectExposure');
const root = path.resolve(__dirname, '..');
let passed = 0;
function check(name, fn) { fn(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
check('focused benchmark is legal and limits Vantage Point to the tested cards', () => {
  const info = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool-baker.json'));
  const deck = loadPrecon(info.pool.pairs[0].runner);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data;
  let cards = 0, influence = 0;
  for (const [id, count] of Object.entries(deck.cards)) {
    const card = metadata.find(card => Number(card.code) === Number(id));
    assert(card, 'missing metadata for ' + id);
    assert(count > 0 && count <= 3);
    cards += count;
    if (!['criminal', 'neutral-runner'].includes(card.faction_code)) influence += count * card.faction_cost;
    if (card.pack_code === 'vp') assert([36015, 36021].includes(Number(id)));
  }
  assert.strictEqual(cards, 45);
  assert.strictEqual(influence, 10);
  assert.strictEqual(deck.identity, '36009');
  assert.strictEqual(deck.cards['36015'], 3);
  assert.strictEqual(deck.cards['36021'], 3);
  const standard = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool.json'));
  assert(!standard.pool.sets.includes('vantagepoint'), 'normal pool remains unchanged');
});
check('collector distinguishes real naked redirects from other successful runs', () => {
  const state = {};
  collector.onEvent({type: 'gameStart'}, state);
  for (const event of [
    {type: 'run', server: 'archives', destination: 'hq', sourceIceCount: 0, success: true},
    {type: 'run', server: 'archives', destination: 'rd', sourceIceCount: 1, success: true},
    {type: 'run', server: 'archives', destination: 'hq', sourceIceCount: 0, success: false},
    {type: 'run', server: 'archives', destination: 'archives', sourceIceCount: 0, success: true},
    {type: 'run', server: 'hq', destination: 'hq', sourceIceCount: 0, success: true},
    {type: 'decision', side: 'corp'},
  ]) collector.onEvent(Object.freeze(event), state);
  assert.deepStrictEqual(collector.finish(state), {total: 3, successful: 2, unprotectedSuccessful: 1});
  collector.onEvent({type: 'gameStart'}, state);
  assert.deepStrictEqual(collector.finish(state), {total: 0, successful: 0, unprotectedSuccessful: 0});
});
check('gate uses 1000 matching seeds, measured exposure and the standard regression guards', () => {
  const config = batch.buildConfig(batch.parseArgs(['gate', '--pool', 'tests/fixtures/ai-batch/deck-pool-baker.json',
    '--games', '1000', '--collector', 'redirectExposure', '--corp-option', 'projectedRedirectThreats=true',
    '--improve', 'redirectExposure.unprotectedSuccessful', '--guard', 'winRate=0.02', '--guard', 'pointsStolen=0.2']));
  assert.strictEqual(config.seeds.length, 1000);
  assert.strictEqual(config.seeds[0], '1');
  assert.strictEqual(config.seeds[999], '1000');
  assert.strictEqual(config.pairs.length, 1);
  assert.deepStrictEqual(config.corpOptions, {projectedRedirectThreats: true});
  assert.strictEqual(config.directions['redirectExposure.unprotectedSuccessful'], 'lower');
});
check('expanded pool crosses three Corp strategies with two legal Runner variants', () => {
  const info = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool-baker-expanded.json'));
  assert.strictEqual(info.pool.pairs.length, 6);
  assert.strictEqual(new Set(info.pool.pairs.map(pair => pair.corp)).size, 3);
  const runners = [...new Set(info.pool.pairs.map(pair => pair.runner))];
  assert.strictEqual(runners.length, 2);
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data;
  const events = [];
  for (const file of runners) {
    const deck = loadPrecon(file);
    let count = 0, influence = 0, eventCount = 0;
    for (const [id, copies] of Object.entries(deck.cards)) {
      const card = metadata.find(card => Number(card.code) === Number(id));
      assert(card, 'missing metadata for ' + id);
      assert(copies > 0 && copies <= 3);
      count += copies;
      if (card.type_code === 'event') eventCount += copies;
      if (!['criminal', 'neutral-runner'].includes(card.faction_code)) influence += copies * card.faction_cost;
      if (card.pack_code === 'vp') assert([36015, 36021].includes(Number(id)));
    }
    assert.strictEqual(count, 45);
    assert(influence <= 15, file + ' exceeds influence');
    events.push(eventCount);
    assert(deck.cards['36015'] >= 2 && deck.cards['36021'] >= 2);
  }
  assert.deepStrictEqual(events, [18, 15]);
});
check('expanded gate schedules 2400 paired games with unchanged guards', () => {
  const args = batch.parseArgs(['gate', '--pool', 'tests/fixtures/ai-batch/deck-pool-baker-expanded.json',
    '--seeds', '1001-1400', '--collector', 'redirectExposure', '--corp-option', 'projectedRedirectThreats=true',
    '--improve', 'redirectExposure.unprotectedSuccessful', '--guard', 'winRate=0.02', '--guard', 'pointsStolen=0.2']);
  const config = batch.buildConfig(args);
  assert.strictEqual(config.seeds.length * config.pairs.length, 2400);
  assert.strictEqual(config.seeds[0], '1001');
  assert.strictEqual(config.seeds[399], '1400');
  const spec = batch.gateSpec(args);
  assert.deepStrictEqual(spec.guard, {winRate: 0.02, pointsStolen: 0.2});
});
console.log(passed + ' Baker batch-gate setup cases passed.');
