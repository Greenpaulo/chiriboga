'use strict';
// Gate setup for L7.1 consequence-calibrated central pressure
// (documentation/backlog/feature-layer-7-1-consequence-calibration.md): the
// centralStolen and exhaustedPressureProtectionInstalls collectors and the
// harness `install` event the second one reads.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {playGame} = require('../scripts/ai-batch/headless');
const batch = require('../scripts/ai-batch');
const centralStolen = require('../scripts/ai-batch/collectors/centralStolen');
const exhausted = require('../scripts/ai-batch/collectors/exhaustedPressureProtectionInstalls');
const metrics = require('../scripts/ai-batch/metrics');

const root = path.resolve(__dirname, '..');
const {pool, setFiles} = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool.json'));
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

function collect(collector, events) {
  const game = {};
  for (const event of [{type: 'gameStart'}, ...events]) collector.onEvent(Object.freeze(event), game);
  return metrics.flattenCollector(collector.name, collector.finish(game));
}

const install = (server, pressureSources, cardType = 'ice') => ({type: 'install', card: 'Wall', cardType, server, pressureSources});

(async () => {
  await scenario('1. centralStolen sums points stolen from HQ and R&D only', async () => {
    assert.deepStrictEqual(collect(centralStolen, [
      {type: 'steal', card: 'A', server: 'hq', points: 2},
      {type: 'steal', card: 'B', server: 'rd', points: 3},
      {type: 'steal', card: 'C', server: 'remote', points: 2},
      {type: 'steal', card: 'D', server: 'archives', points: 1},
    ]), {'centralStolen.points': 5});
    assert.deepStrictEqual(collect(centralStolen, []), {'centralStolen.points': 0});
    assert.strictEqual(centralStolen.directions['centralStolen.points'], 'lower');
  });

  await scenario('2. exhaustedPressureProtectionInstalls counts ICE on a central whose only access pressure is spent', async () => {
    const spent = {card: 'Devadatta Drone', additionalAccess: 0, exhausted: true};
    const live = {card: 'Conduit', additionalAccess: 2, exhausted: false};
    const growth = {card: 'Conduit', additionalAccess: 0, exhausted: false};
    assert.deepStrictEqual(collect(exhausted, [
      install('rd', [spent]),                 // counts
      install('rd', [spent, growth]),         // counts: growth is not current access
      install('rd', [spent, live]),           // live access elsewhere: not over-protection
      install('hq', []),                      // no pressure sources
      install('rd', [growth]),                // only non-access pressure
      install('remote', [spent]),             // not a central
      install('rd', [spent], 'upgrade'),      // not ICE
    ]), {'exhaustedPressureProtectionInstalls.count': 2});
    assert.strictEqual(exhausted.directions['exhaustedPressureProtectionInstalls.count'], 'lower');
  });

  await scenario('3. the harness emits install events for Corp ICE on HQ and R&D with public pressure sources', async () => {
    const pair = pool.pairs.find(p => p.id === 'gateway');
    const installs = [];
    const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner, setFiles,
      timeoutMs: 60000, observe: true, onEvent: event => { if (event.type === 'install') installs.push(event); }});
    assert.deepStrictEqual(game.errors, [], 'engine errors');
    assert.ok(installs.length > 0, 'the Corp installed ICE on a central');
    assert.ok(installs.every(e => e.cardType === 'ice' && (e.server === 'hq' || e.server === 'rd') &&
      Array.isArray(e.pressureSources) && e.pressureSources.every(s => typeof s.additionalAccess === 'number' &&
        typeof s.exhausted === 'boolean')), 'install events carry server and normalized sources');
  });

  await scenario('4. a throwing pressure hook preserves install delegation and invalidates measurements', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'central-observer-'));
    const setupFile = path.join(directory, 'setup.js');
    const pair = pool.pairs.find(p => p.id === 'gateway');
    const installs = [];
    fs.writeFileSync(setupFile, `
      var calls = 0, pressureCalls = 0;
      var receiver = {}, installing = {player: corp, cardType: 'ice', title: 'Observer test ICE'};
      var originalInstalled = InstalledCards, originalInstall = __install;
      InstalledCards = function() { return [
        {player: runner, title: 'Live pressure', AICentralPressure: function() {
          pressureCalls++; return {additionalAccess: 1};
        }},
        {player: runner, title: 'Throwing pressure', AICentralPressure: function() {
          pressureCalls++; throw new Error('pressure probe failed');
        }}
      ]; };
      __install = function(card, destination, extra) {
        calls++;
        return this === receiver && card === installing && destination === corp.HQ && extra === 'extra';
      };
      var delegated = Install.call(receiver, installing, corp.HQ, 'extra');
      InstalledCards = originalInstalled; __install = originalInstall;
      __report = function() { return {calls: calls, pressureCalls: pressureCalls, delegated: delegated}; };
    `);
    try {
      const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner,
        setFiles, timeoutMs: 60000, observe: true, setupFile,
        onEvent: event => { if (event.type === 'install') installs.push(event); }});
      assert.deepStrictEqual(game.report, {calls: 1, pressureCalls: 2, delegated: true},
        'the real hook throws but the wrapped install still receives its receiver and all arguments');
      assert.deepStrictEqual(game.errors, ['central install observation: pressure probe failed']);
      assert.strictEqual(installs.length, 1);
      assert.strictEqual(installs[0].pressureSources.length, 0, 'discard partial measurements');
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });

  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`central-consequence-gate-setup: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`central-consequence-gate-setup: ${passed} scenarios passed`);
})();
