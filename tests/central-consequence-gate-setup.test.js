'use strict';
// Gate setup for L7.1 consequence-calibrated central pressure
// (documentation/backlog/code-review/feature-layer-7-1-consequence-calibration.md): the
// centralStolen and exhaustedPressureProtectionInstalls collectors and the
// harness `install` event the second one reads.
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const os = require('os');
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

  for (const [expression, message] of [
    ["new Error('pressure probe failed')", 'pressure probe failed'],
    ['undefined', 'undefined'], ['null', 'null'], ["'primitive failure'", 'primitive failure'],
    ['42', '42'],
    ["{toString: function() { throw new Error('cannot print'); }}", 'unprintable thrown value'],
  ]) await scenario('4. pressure hook throwing ' + expression + ' preserves delegation and invalidates measurements', async () => {
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
          pressureCalls++; throw ${expression};
        }}
      ]; };
      __install = function(card, destination, extra) {
        calls++;
        arguments[10]();
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
      assert.deepStrictEqual(game.errors, ['central install observation: ' + message]);
      assert.strictEqual(installs.length, 1);
      assert.strictEqual(installs[0].pressureSources.length, 0, 'discard partial measurements');
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });

  await scenario('5. install events wait for completion and preserve callbacks and captured pressure', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'central-completion-'));
    const setupFile = path.join(directory, 'setup.js');
    const pair = pool.pairs.find(p => p.id === 'gateway');
    const installs = [];
    fs.writeFileSync(setupFile, `
      var receiver = {}, callbackReceiver = {}, callbackArgs, callbackThis, delegated;
      var pending, snapshot = {additionalAccess: 2};
      var installing = {player: corp, cardType: 'ice', title: 'Completed ICE'};
      var originalInstalled = InstalledCards, originalInstall = __install;
      var originalObserver = __centralIceInstall, eventCount = 0;
      InstalledCards = function() { return [{player: runner, title: 'Public pressure',
        AICentralPressure: function() { return snapshot; }}]; };
      __centralIceInstall = function() { eventCount++; return originalObserver.apply(this, arguments); };
      __install = function() {
        delegated = this === receiver && arguments[0] === installing && arguments[1] === corp.RnD &&
          arguments[2] === 'cost' && arguments[6] === callbackReceiver && arguments[9] === false;
        pending = arguments[10];
        return 'install return';
      };
      var returned = Install.call(receiver, installing, corp.RnD, 'cost', null, true, undefined,
        callbackReceiver, undefined, undefined, false, function() {
          callbackThis = this === callbackReceiver;
          callbackArgs = Array.prototype.slice.call(arguments);
          return 'callback return';
        });
      var before = eventCount;
      snapshot.additionalAccess = 0;
      var completed = pending.call(callbackReceiver, 'first', 7);
      // A failing observer must still invoke the engine's completion callback.
      __centralIceInstall = function() { throw undefined; };
      var observerFailureReturn = pending.call(callbackReceiver, 'second', 8);
      InstalledCards = originalInstalled; __install = originalInstall; __centralIceInstall = originalObserver;
      __report = function() { return {delegated: delegated, returned: returned, before: before,
        completed: completed, callbackThis: callbackThis, callbackArgs: callbackArgs,
        observerFailureReturn: observerFailureReturn}; };
    `);
    try {
      const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner,
        setFiles, timeoutMs: 60000, observe: true, setupFile,
        onEvent: event => { if (event.type === 'install') installs.push(event); }});
      assert.deepStrictEqual(game.report, {delegated: true, returned: 'install return', before: 0,
        completed: 'callback return', callbackThis: true, callbackArgs: ['second', 8],
        observerFailureReturn: 'callback return'});
      assert.deepStrictEqual(game.errors, ['central install observation: undefined']);
      assert.strictEqual(installs.length, 1);
      assert.deepStrictEqual(JSON.parse(JSON.stringify(installs[0].pressureSources)),
        [{card: 'Public pressure', additionalAccess: 2, exhausted: false}], 'retain request-time pressure');
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });

  await scenario('6. a real unaffordable then cancelled install emits no install event', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'central-cancel-'));
    const setupFile = path.join(directory, 'setup.js');
    const pair = pool.pairs.find(p => p.id === 'gateway');
    const installs = [];
    fs.writeFileSync(setupFile, `
      ChangePhase(phases.corpActionMain);
      var installing = corp.RnD.cards.find(function(c) { return c.cardType === 'ice'; });
      var oldLocation = installing.cardLocation;
      corp.creditPool = 0;
      corp.HQ.ice.push({player: corp, cardType: 'ice', title: 'Existing ICE'});
      var completed = 0, cancelled = 0;
      Install(installing, corp.HQ, false, null, true, undefined, null,
        function() { cancelled++; }, undefined, true, function() { completed++; });
      var affordableChoices = currentPhase.Enumerate.n().length;
      currentPhase.Cancel.trash();
      var restored = installing.cardLocation === oldLocation && oldLocation.indexOf(installing) >= 0;
      __report = function() { return {affordableChoices: affordableChoices, completed: completed,
        cancelled: cancelled, restored: restored}; };
      __onWin(corp, 'cancel test complete');
    `);
    try {
      const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner,
        setFiles, timeoutMs: 60000, observe: true, setupFile,
        onEvent: event => { if (event.type === 'install') installs.push(event); }});
      assert.deepStrictEqual(game.errors, []);
      assert.deepStrictEqual(game.report, {affordableChoices: 0, completed: 0, cancelled: 1, restored: true});
      assert.strictEqual(installs.length, 0, 'neither unaffordable nor cancelled installs count');
    } finally {
      fs.rmSync(directory, {recursive: true, force: true});
    }
  });

  await scenario('7. install telemetry waits for completion and preserves callbacks and decision pressure', async () => {
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
