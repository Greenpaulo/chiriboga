'use strict';
// Gate setup for L7.1 consequence-calibrated central pressure
// (documentation/backlog/feature-layer-7-1-consequence-calibration.md): the
// centralStolen and exhaustedPressureProtectionInstalls collectors and the
// harness `install` event the second one reads.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const vm = require('vm');
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

  await scenario('4. install telemetry waits for completion and preserves callbacks and decision pressure', async () => {
    // Exercise the actual harness wrapper with a controllable asynchronous
    // Install boundary: cancellation never invokes onInstallComplete.
    const source = fs.readFileSync(path.join(root, 'scripts/ai-batch/headless.js'), 'utf8');
    const wrapper = source.slice(source.indexOf('      var __install = Install;'), source.indexOf('      var __mulliganFn = Mulligan;'));
    assert.ok(wrapper.length > 0, 'found install wrapper');
    const events = [];
    const calls = [];
    let pressure = {additionalAccess: 0, persistentPressure: 0, growth: 0, exhausted: true};
    const corp = {HQ: {}, RnD: {}, AI: {_centralPressureFromCard: () => pressure}};
    const runner = {};
    const context = vm.createContext({corp, runner,
      InstalledCards: () => [{title: 'Pressure source'}],
      __centralIceInstall: (card, destination, sources) => events.push(install(destination === corp.HQ ? 'hq' : 'rd', sources)),
      Install: function() { calls.push({receiver: this, args: Array.from(arguments)}); return 'pending'; },
    });
    vm.runInContext(wrapper, context);
    const receiver = {};
    const callbackContext = {};
    const token = {};
    let callbacks = 0;
    const callback = function(arg) {
      assert.strictEqual(this, callbackContext);
      assert.strictEqual(arg, token);
      assert.strictEqual(events.length, 1, 'telemetry precedes original callback');
      callbacks++;
      return 'completed';
    };
    const args = [{player: corp, cardType: 'ice'}, corp.RnD, false, null, true,
      undefined, callbackContext, undefined, undefined, true, callback];
    assert.strictEqual(context.Install.apply(receiver, args), 'pending');
    assert.strictEqual(events.length, 0, 'no event while installation is pending');
    assert.strictEqual(calls[0].receiver, receiver);
    assert.deepStrictEqual(calls[0].args.slice(0, 10), args.slice(0, 10));
    pressure = {additionalAccess: 2, persistentPressure: 0, growth: 0, exhausted: false};
    assert.strictEqual(calls[0].args[10].call(callbackContext, token), 'completed');
    assert.strictEqual(callbacks, 1);
    assert.strictEqual(events[0].pressureSources[0].exhausted, true, 'pressure captured at decision');
    assert.deepStrictEqual(collect(exhausted, events), {'exhaustedPressureProtectionInstalls.count': 1});

    context.Install.apply(receiver, args); // cancelled: completion never fires
    assert.strictEqual(events.length, 1, 'cancelled install contributes no event');
    context.Install(args[0], corp.HQ); // completion callback is optional
    calls[2].args[10]();
    assert.strictEqual(events.length, 2);
    for (const [card, destination] of [
      [{player: runner, cardType: 'ice'}, corp.HQ],
      [{player: corp, cardType: 'asset'}, corp.HQ],
      [args[0], {}],
    ]) {
      const otherArgs = [card, destination, ...args.slice(2)];
      context.Install.apply(receiver, otherArgs);
      assert.deepStrictEqual(calls[calls.length - 1].args, otherArgs, 'nonmatching install unchanged');
    }
    assert.strictEqual(events.length, 2);
  });

  if (failures.length) {
    console.log(failures.join('\n\n'));
    console.log(`central-consequence-gate-setup: ${failures.length} of ${passed + failures.length} scenarios failed`);
    process.exit(1);
  }
  console.log(`central-consequence-gate-setup: ${passed} scenarios passed`);
})();
