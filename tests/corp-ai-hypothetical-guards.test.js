// Run with: node tests/corp-ai-hypothetical-guards.test.js
// Roadmap item F2 (documentation/backlog/corp_ai_finding_10_guarded_hypothetical.md).
// Every migrated planning probe sees its hypothetical state at hypothetical
// depth above 0, and leaves every field it changed, and the depth, exactly as
// before: after a normal return and after the evaluated function throws.
// Row 7 (_potentialTagPunishment) is covered by
// tests/potential-tag-punishment-restores-state.test.js; rows 2 to 4 also by
// the security boards in tests/corp-server-security.test.js.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;
const corp = {creditPool: 6, clickTracker: 3, HQ: {serverName: 'HQ', cards: [], ice: [], root: []},
  RnD: {serverName: 'R&D', cards: [], ice: [], root: []}, archives: {serverName: 'Archives', cards: [], ice: [], root: []},
  remoteServers: [], scoreArea: [], AI: null};
const runner = {creditPool: 4, tags: 0, grip: [], rig: {resources: [], programs: [], hardware: []}, AI: null};
const context = {console, corp, runner, currentPhase: {identifier: 'Corp 2.2'},
  attackedServer: null, encountering: false, approachIce: -1, cardSet: {}, setIdentifiers: []};
let runnerCards = [];
const servers = () => [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers);
context.GetServer = card => servers().find(s => s.ice.includes(card) || s.root.includes(card)) || null;
context.ServerName = server => server.serverName || 'Remote';
context.InstalledCards = player => (player === runner ? runnerCards.slice() : []);
context.ActiveCards = context.InstalledCards;
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.AgendaPoints = () => 0;
context.AgendaPointsToWin = () => 7;
context.MaxHandSize = () => 5;
context.PlayerHand = player => player.HQ ? player.HQ.cards : [];
context.CheckTags = () => false;
context.Strength = card => card.strength || 0;
context.CheckStrength = () => true;
context.PlayerCanLook = (player, card) => !!card.rezzed;
context.RezCost = card => card.rezCost || 0;
context.Counters = (card, type) => card[type] || 0;
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['config.js', 'ai_corp.js', 'runcalculator.js', 'sets/systemupdate2021.js', 'sets/vantagepoint.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function(m) { this.logged.push(m); }; reviewAI.logged = [];', context);
const ai = context.reviewAI;
const depth = () => context.AIHypothetical.depth;
const encounter = () => ({encountering: context.encountering, attackedServer: context.attackedServer,
  approachIce: context.approachIce});

let tests = 0;
function check(name, fn) {
  fn();
  tests++;
  if (verbose) console.log('ok ' + name);
}
// Run action twice: once normally, once with the probe throwing. Both must leave
// state() as before, at depth 0.
function restores(name, state, action) {
  for (const throwing of [false, true]) {
    check(name + (throwing ? ' (probe throws)' : ''), () => {
      const before = state();
      assert.strictEqual(depth(), 0);
      if (throwing) assert.throws(() => action(true), /probe failure/);
      else action(false);
      assert.deepStrictEqual(state(), before, name + ': state restored');
      assert.strictEqual(depth(), 0, name + ': depth restored');
    });
  }
}
const fail = () => { throw new Error('probe failure'); };
const ice = extra => Object.assign({title: 'Test ice', cardType: 'ice', player: corp, rezzed: false,
  rezCost: 3, strength: 2, subTypes: ['Barrier'], subroutines: []}, extra);

// Scenario 5: the dead ICE-install scorer is gone.
check('row 9 deleted', () => {
  assert.strictEqual(typeof ai._iceInstallScore, 'undefined');
  assert.strictEqual(typeof ai._bestIceToInstall, 'undefined');
  const source = fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8');
  assert.ok(!/_iceInstallScore|_bestIceToInstall|AIIceInstallScore/.test(source));
});

// Scenario 8: shared wrappers keep one depth count, nest, and restore.
check('wrappers share one depth count', () => {
  const server = {serverName: 'Remote', ice: [], root: []};
  const wall = ice();
  server.ice.push(wall);
  corp.remoteServers = [server];
  const seen = [];
  ai._withHypothetical(() => {}, () => {
    seen.push(ai._hypotheticalDepth);
    context.AIWithRunContext(corp.HQ, () => {
      seen.push(depth(), context.attackedServer);
      context.AIWithIceEncounter(wall, entered => seen.push(depth(), entered, encounter()));
    });
  }, () => {});
  assert.deepStrictEqual(seen, [1, 2, corp.HQ, 3, true, {encountering: true, attackedServer: server, approachIce: 0}]);
  assert.strictEqual(ai._hypotheticalDepth, 0);
  assert.deepStrictEqual(encounter(), {encountering: false, attackedServer: null, approachIce: -1});
  // ICE outside any server: evaluate gets false and the encounter state is unchanged.
  assert.deepStrictEqual(context.AIWithIceEncounter(ice(), entered => [entered, encounter()]),
    [false, {encountering: false, attackedServer: null, approachIce: -1}]);
  corp.remoteServers = [];
});

// Rows 2 and 3: ICE rezzed and paid for, then removed.
{
  const wall = ice();
  const other = ice({title: 'Other ice'});
  const server = {serverName: 'Remote', ice: [other, wall], root: []};
  const iceArray = server.ice;
  const state = () => ({rezzed: wall.rezzed, credits: corp.creditPool, ice: server.ice.slice(),
    sameArray: server.ice === iceArray});
  ai._runnerMayWinIfServerBreached = () => true;
  for (const [row, probe] of [['row 2 _icePreventsGameWinningBreach', ai._icePreventsGameWinningBreach],
    ['row 3 _iceWouldSecureServer', ai._iceWouldSecureServer]]) {
    for (const failAt of [1, 2]) {
      restores(row + ' evaluation ' + failAt, state, throwing => {
        const seen = [];
        ai._evaluateServerSecurity = target => {
          assert.strictEqual(target, server);
          seen.push({depth: depth(), rezzed: wall.rezzed, credits: corp.creditPool, ice: server.ice.slice()});
          if (throwing && seen.length === failAt) fail();
          return {isSecure: seen.length === 1};
        };
        assert.strictEqual(probe.call(ai, wall, 3, server), true);
        assert.deepStrictEqual(seen, [
          {depth: 1, rezzed: true, credits: 3, ice: [other, wall]},
          {depth: 1, rezzed: false, credits: 6, ice: [other]},
        ]);
      });
    }
  }
  delete ai._evaluateServerSecurity;
  delete ai._runnerMayWinIfServerBreached;
}

// Row 4: a defensive ICE install is evaluated on the threatened central.
{
  const wall = ice();
  const state = () => ({credits: corp.creditPool, ice: corp.RnD.ice.slice()});
  ai._rankedInstallOptions = () => [{cardToInstall: wall, serverToInstallTo: corp.RnD}];
  restores('row 4 _criticalBreachDefenseAction', state, throwing => {
    const seen = [];
    ai._centralBreachLossRisk = server => {
      if (ai._hypotheticalDepth === 0) return {server, probability: server === corp.RnD ? 0.9 : 0};
      seen.push({depth: depth(), credits: corp.creditPool, ice: server.ice.slice()});
      if (throwing) fail();
      return {server, probability: 0.1};
    };
    assert.strictEqual(ai._criticalBreachDefenseAction(['install', 'gain']), 0);
    assert.deepStrictEqual(seen, [{depth: 1, credits: 6, ice: [wall]}]); // installing outermost costs 0
  });
  delete ai._rankedInstallOptions;
  delete ai._centralBreachLossRisk;
}

// Row 5: run-only credits are counted with the prospective run on the server.
{
  const server = corp.RnD;
  const source = {player: runner, title: 'Run credits', credits: 2};
  const breaker = {player: runner, title: 'Breaker', subTypes: ['Icebreaker']};
  restores('row 5 _effectiveRunnerCreditPool', encounter, throwing => {
    const seen = [];
    source.canUseCredits = () => {
      seen.push({depth: depth(), attackedServer: context.attackedServer});
      if (throwing) fail();
      return context.attackedServer === server;
    };
    runnerCards = [breaker, source];
    assert.strictEqual(ai._effectiveRunnerCreditPool(server).recurringCredits, 2);
    assert.deepStrictEqual(seen[0], {depth: 1, attackedServer: server});
  });
  runnerCards = [];
}

// Row 6: subtype modifiers are asked during a pretend encounter.
{
  const wall = ice();
  const server = {serverName: 'Remote', ice: [wall], root: []};
  corp.remoteServers = [server];
  ai._securityIceAI = () => null;
  const modifier = {player: runner, title: 'Subtype modifier'};
  restores('row 6 _effectiveIceSubtypes', encounter, throwing => {
    const seen = [];
    modifier.AIEffectiveIceSubtypes = () => {
      seen.push(Object.assign({depth: depth()}, encounter()));
      if (throwing) fail();
      return {add: ['Code Gate']};
    };
    runnerCards = [modifier];
    assert.deepStrictEqual([...ai._effectiveIceSubtypes(wall, server, 0)], ['Barrier', 'Code Gate']);
    assert.deepStrictEqual(seen, [{depth: 1, encountering: true, attackedServer: server, approachIce: 0}]);
  });
  delete ai._securityIceAI;
  runnerCards = [];
  corp.remoteServers = [];
}

// Row 8 and scenario 1: "gain a credit, then install" compares option counts.
{
  corp.HQ.cards = [ice(), ice(), ice(), ice(), ice()]; // a full hand: install or gain
  ai._sufficientEconomy = () => true;
  ai._criticalBreachDefenseAction = () => -1;
  ai._emergencyProtectionRecoveryAction = () => -1;
  ai._installedAgendaCanBeCompleted = () => false;
  ai._clicksLeft = () => 2;
  ai._returnPreference = (options, option) => options.indexOf(option);
  const options = (n, kind) => Array.from({length: n}, () => ({cardToInstall: {cardType: kind}, serverToInstallTo: corp.HQ}));
  const run = (now, withCredit) => {
    ai.logged = [];
    ai._rankedInstallOptions = (cards, priority) => {
      if (priority) return [];
      if (corp.creditPool === 6) return options(now, 'ice');
      assert.strictEqual(corp.creditPool, 7, 'one extra credit (clicks left - 1)');
      assert.strictEqual(depth(), 1);
      return withCredit === 'throw' ? fail() : options(withCredit, 'ice');
    };
    return ai.Phase_Main(['install', 'gain']);
  };
  const state = () => ({credits: corp.creditPool});
  check('scenario 1: more options with a credit chooses gain', () => {
    assert.strictEqual(run(1, 2), 1);
    assert.ok(ai.logged.includes('Just need a tiny bit more cash'));
  });
  check('scenario 1: from none to one option chooses gain', () => {
    assert.strictEqual(run(0, 1), 1);
    assert.ok(ai.logged.includes('Just need a tiny bit more cash'));
  });
  check('scenario 1: equal counts install instead', () => {
    assert.strictEqual(run(2, 2), 0);
    assert.ok(!ai.logged.includes('Just need a tiny bit more cash'));
    assert.ok(ai.logged.includes("Oh I know, I'll install something"));
  });
  restores('row 8 Phase_Main', state, throwing => run(1, throwing ? 'throw' : 2));
  for (const name of ['_sufficientEconomy', '_criticalBreachDefenseAction', '_emergencyProtectionRecoveryAction',
    '_installedAgendaCanBeCompleted', '_clicksLeft', '_returnPreference', '_rankedInstallOptions']) delete ai[name];
  corp.HQ.cards = [];
}

// Row 10 and scenario 6: Baker's redirect, paid by a run-only Stealth credit.
{
  const baker = Object.assign({}, context.cardSet[36015]);
  const cloak = {player: runner, title: 'Run-only stealth', subTypes: ['Stealth'], credits: 1};
  restores('row 10 Baker _stealthCreditCards', encounter, throwing => {
    const seen = [];
    cloak.canUseCredits = () => {
      seen.push({depth: depth(), attackedServer: context.attackedServer});
      if (throwing) fail();
      return context.attackedServer !== null;
    };
    runnerCards = [baker, cloak];
    assert.strictEqual(baker.AIRedirectsRun(corp.archives, corp.HQ), true);
    assert.deepStrictEqual(seen, [{depth: 1, attackedServer: corp.archives}]);
  });
  check('row 10 Baker keeps a live run as the run context', () => {
    context.attackedServer = corp.RnD;
    const seen = [];
    cloak.canUseCredits = () => { seen.push(context.attackedServer); return true; };
    assert.strictEqual(baker._stealthCreditCards(corp.archives).length, 1);
    assert.deepStrictEqual(seen, [corp.RnD]);
    assert.strictEqual(context.attackedServer, corp.RnD);
    context.attackedServer = null;
  });
  runnerCards = [];
}

// Row 11: RunCalculator.IceAI reads strength during a pretend encounter.
{
  const wall = ice({rezzed: true});
  const server = {serverName: 'Remote', ice: [wall], root: []};
  corp.remoteServers = [server];
  const rc = vm.runInContext('new RunCalculator()', context);
  restores('row 11 RunCalculator.IceAI', encounter, throwing => {
    const seen = [];
    rc._baseStrength = () => {
      seen.push(Object.assign({depth: depth()}, encounter()));
      if (throwing) fail();
      return 5;
    };
    assert.strictEqual(rc.IceAI(wall, 0).strength, 5);
    assert.deepStrictEqual(seen, [{depth: 1, encountering: true, attackedServer: server, approachIce: 0}]);
  });
  corp.remoteServers = [];
}

// Rows 12 to 14: Atman and Chameleon check strength during a pretend encounter.
{
  const wall = ice({subTypes: ['Barrier']});
  const server = {serverName: 'Remote', ice: [wall], root: []};
  corp.remoteServers = [server];
  const atman = Object.assign({}, context.cardSet[31030]);
  const chameleon = Object.assign({}, context.cardSet[31031], {chosenWord: 'Barrier'});
  const inEncounter = [{depth: 1, encountering: true, attackedServer: server, approachIce: 0}];
  for (const [row, card, call] of [
    ['row 12 Atman AISharedPreferredX', atman, () => atman.AISharedPreferredX(wall)],
    ['row 13 Atman AIMatchingBreakerInstalled', atman, () => atman.AIMatchingBreakerInstalled(wall)],
    ['row 14 Chameleon AIMatchingBreakerInstalled', chameleon, () => chameleon.AIMatchingBreakerInstalled(wall)],
  ]) {
    restores(row, encounter, throwing => {
      const seen = [];
      const probe = () => {
        seen.push(Object.assign({depth: depth()}, encounter()));
        if (throwing) fail();
      };
      context.Strength = c => { if (c === wall) probe(); return c.strength || 0; };
      context.CheckStrength = () => { probe(); return true; };
      const result = call();
      assert.ok(result === card || typeof result === 'number', row + ' result');
      assert.deepStrictEqual(seen, inEncounter);
    });
  }
  check('row 13 Atman needs the ICE in a server', () => {
    const loose = ice();
    let checked = false;
    context.CheckStrength = () => { checked = true; return true; };
    assert.strictEqual(atman.AIMatchingBreakerInstalled(loose), null);
    assert.strictEqual(checked, false);
  });
  corp.remoteServers = [];
}

console.log('corp-ai-hypothetical-guards: ' + tests + ' tests passed');
