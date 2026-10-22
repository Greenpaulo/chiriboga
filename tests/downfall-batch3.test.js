'use strict';
// Downfall batch 3 (26010-26014) in the real engine with both AIs: Az McCaffrey,
// Always Have a Backup Plan, Blueberry!™ Diesel, Flip Switch and Lucky Charm.
// Human menus are driven phase by phase; AI cases run the real main loop.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {playGame} = require(path.join(root, 'scripts', 'ai-batch', 'headless'));
const SETS = ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/downfall.js'];
const PALISADE = 30072, DZMZ = 30022, T400 = 30031, SIDE_HUSTLE = 35034, SCRUBBER = 31011, ICE_CARVER = 31009;

// Shared in-game helpers. `body` runs inside StartGame; a body that sets
// `finish` hands control to the AI main loop and ends the game itself.
const PRELUDE = `
  var checks = [], failure = null, log = [];
  __report = function() { return {checks: checks, failure: failure, log: log}; };
  function check(condition, message) {
    if (!condition) throw new Error(message);
    checks.push(message);
  }
  function inst(id, location) {
    var back = cardSet[id].player == runner ? cardBackTexturesRunner : cardBackTexturesCorp;
    return InstanceCardsPush(id, location, 1, back, glowTextures, strengthTextures)[0];
  }
  function offered(command) {
    EnumeratePhase();
    return currentPhase.Enumerate && currentPhase.Enumerate[command] ? currentPhase.Enumerate[command]() : [];
  }
  function choose(command, predicate) {
    var choice = offered(command).find(predicate || function() { return true; });
    if (!choice) throw new Error('No choice for ' + command + ' in ' + currentPhase.title);
    currentPhase.Resolve[command](choice);
  }
  // Fire mandatory response triggers, take the first continue, otherwise pass.
  function pass() {
    var responseWindow = currentPhase.identifier == 'Run Subroutines' ||
      (typeof currentPhase.triggerCallbackName == 'string' && currentPhase.triggerCallbackName != 'NOT SET');
    if (responseWindow && offered('trigger').length) return choose('trigger');
    if (offered('continue').length) return choose('continue');
    if (typeof currentPhase.Resolve.n == 'function') return currentPhase.Resolve.n(offered('n')[0] || {});
    var commands = Object.keys(currentPhase.Resolve).filter(function(c) { return offered(c).length > 0; });
    if (!commands.length) throw new Error('No command in ' + currentPhase.identifier + ' ' + currentPhase.title);
    choose(commands[0]);
  }
  function settle(predicate, label) {
    for (var step = 0; step < 80 && !predicate(); step++) pass();
    check(predicate(), label);
  }
  function actionPhase() { return currentPhase === phases.runnerActionMain && !attackedServer; }
  function grip(ids) { return ids.map(function(id) { return inst(id, runner.grip); }); }
`;

async function scenario(name, body) {
  const setupCode = PRELUDE + `
    StartGame = function() {
      var finish = null;
      try {
        for (var __i = 0; __i < 5; __i++) MoveCardByIndex(corp.RnD.cards.length - 1, corp.RnD.cards, corp.HQ.cards);
        while (runner.grip.length) MoveCard(runner.grip[0], runner.heap);
        var oldLog = Log; Log = function(m) { log.push(m); oldLog(m); };
        corp.creditPool = 10; runner.creditPool = 10; runner.clickTracker = 4; playerTurn = runner;
        ChangePhase(phases.runnerActionMain);
        ${body}
      } catch (error) { failure = error.message + ' @ ' + (currentPhase && currentPhase.identifier) + ' ' + String(error.stack).split('\\n').slice(1,3).join(' '); finish = null; }
      if (finish) {
        var oldStop = __stop;
        __stop = function() {
          var ended = false;
          try { ended = finish(); } catch (error) { failure = error.message; ended = true; }
          if (!ended && playerTurn === corp) { failure = failure || 'AI case did not finish in the Runner turn'; ended = true; }
          if (ended) { PlayerWin(corp, 'case complete'); return true; }
          return oldStop();
        };
        Main();
      } else PlayerWin(corp, 'case complete');
    };`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'downfall-b3-'));
  const file = path.join(dir, 'setup.js');
  fs.writeFileSync(file, setupCode);
  let game;
  try {
    game = await playGame({streamPrefix: '1:' + name, corpFile: 'Zwicky Supermodernism.js', runnerFile: 'Magdalene CBB.js',
      setFiles: SETS, timeoutMs: 120000, stallMs: 3000, setupFile: file, tail: 12});
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  const report = game.report || {};
  if (process.env.VERBOSE) console.log(name + ':\n  ' + (report.log || []).join('\n  '));
  assert.strictEqual(report.failure, null, name + ': ' + report.failure);
  assert(report.checks && report.checks.length > 0, name + ': checks ran');
  assert.deepStrictEqual(game.errors, [], name + ': engine errors');
  return report.checks.length;
}

const cases = {
  // Az: first qualifying install each turn is 1 cheaper, through the real install command.
  az: `
    var az = inst(26010, []); runner.identityCard = az;
    var cards = grip([DZMZ, T400, SIDE_HUSTLE, SCRUBBER, ICE_CARVER]);
    var dz = cards[0], t400 = cards[1], job = cards[2], connection = cards[3], virtual = cards[4];
    check(InstallCost(dz) == 1 && InstallCost(job) == 1 && InstallCost(connection) == 1, 'hardware, job and connection discounted');
    check(InstallCost(virtual) == 3, 'other resources not discounted');
    runner.creditPool = 1;
    check(ChoicesHandInstall(runner).some(function(c) { return c.card === dz; }), 'AI install choices see discounted hardware as affordable');
    check(!ChoicesHandInstall(runner).some(function(c) { return c.card === virtual; }), 'undiscounted resource stays unaffordable');
    runner.creditPool = 5;
    choose('install', function(c) { return c.card === dz; });
    settle(actionPhase, 'install resolves');
    check(dz.cardLocation === runner.rig.hardware && runner.creditPool == 4, 'first hardware installed for 1 less');
    check(InstallCost(t400) == 2 && InstallCost(job) == 2, 'discount used for the turn');
    az.responseOnCorpTurnBegins.Resolve.call(az);
    check(InstallCost(t400) == 1, 'discount returns next turn');
    choose('install', function(c) { return c.card === virtual; });
    settle(actionPhase, 'virtual resource install resolves');
    check(InstallCost(job) == 1, 'non-qualifying install keeps the discount');
    Install(job, null, true);
    settle(actionPhase, 'free install resolves');
    check(InstallCost(connection) == 2, 'a free qualifying install still uses the discount');`,

  // Backup Plan, human: rerun after ETR and bypass the last encountered ice.
  backupHuman: `
    var palisade = inst(PALISADE, corp.HQ.ice); palisade.rezzed = true;
    var plan = inst(26011, runner.resolvingCards);
    check(plan.Enumerate().some(function(c) { return c.server === corp.HQ; }), 'any server can be run');
    var coldSite = inst(26038, corp.HQ.root); coldSite.rezzed = true; coldSite.power = 1;
    runner.creditPool = 1; runner.clickTracker = 2;
    runner.AI = null;
    plan.Resolve({server: corp.HQ});
    settle(function() { return offered('trigger').some(function(t) { return t.card === plan; }); }, 'run again offered after unsuccessful run');
    choose('trigger', function(t) { return t.card === plan; });
    var options = offered('continue');
    check(options.length == 2 && options[1].server === null, 'running again is optional');
    choose('continue', function(c) { return c.server === corp.HQ; });
    settle(function() { return offered('trigger').some(function(t) { return t.card === plan; }); }, 'bypass offered on the second encounter');
    choose('trigger', function(t) { return t.card === plan; });
    choose('continue');
    settle(function() { return currentPhase.identifier == 'Run 5.1' || actionPhase(); }, 'second run reaches the server');
    check(currentPhase.identifier == 'Run 5.1', 'second run successful after the bypass');
    settle(actionPhase, 'second run ends');
    check(!plan.runningWithThis && !plan.secondRun && !plan.bypassIce, 'state cleaned up after the second run');
    check(runner.clickTracker == 1 && runner.creditPool == 0, 'first run pays Cold Site costs; second run waives both costs');
    coldSite.power = 0; runner.creditPool = 10; runner.clickTracker = 4;

    // Declining ends the effect; a successful first run offers nothing.
    MoveCard(plan, runner.resolvingCards);
    plan.Resolve({server: corp.HQ});
    settle(function() { return offered('trigger').some(function(t) { return t.card === plan; }); }, 'offered again on a fresh play');
    choose('trigger', function(t) { return t.card === plan; });
    choose('continue', function(c) { return c.server === null; });
    settle(actionPhase, 'declined rerun ends');
    check(!plan.runningWithThis && !attackedServer, 'declining does not run');
    MoveCard(plan, runner.resolvingCards);
    plan.Resolve({server: corp.archives});
    settle(function() { return currentPhase.identifier == 'Run 6.4' || actionPhase(); }, 'archives run ends');
    check(!offered('trigger').some(function(t) { return t.card === plan; }), 'successful run offers no rerun');
    settle(actionPhase, 'successful run cleanup');
    check(!plan.runningWithThis, 'successful run cleaned up');`,

  // Backup Plan, AI: rerun only when the bypass gives a complete path.
  backupAiReruns: backupAi(1),
  backupAiDeclines: backupAi(2),

  // Blueberry: optionally bottom one of the top two, then draw 2.
  blueberry: `
    runner.AI = null;
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    var deep = inst(T400, runner.stack), second = inst(DZMZ, runner.stack), top = inst(SIDE_HUSTLE, runner.stack);
    var diesel = inst(26012, runner.resolvingCards);
    diesel.Resolve({});
    var options = offered('continue');
    check(options.length == 3 && options[0].card === top && options[1].card === second && options[2].card === null, 'top two cards shown, bottoming optional');
    choose('continue', function(c) { return c.card === top; });
    check(runner.stack[0] === top, 'chosen card moved to the bottom');
    check(runner.grip.includes(second) && runner.grip.includes(deep) && runner.grip.length == 2, 'then drew 2 cards');
    MoveCard(second, runner.stack); MoveCard(deep, runner.stack);
    var gripBefore = runner.grip.length;
    diesel.Resolve({});
    choose('continue', function(c) { return c.card === null; });
    check(runner.grip.length == gripBefore + 2 && runner.grip.includes(deep), 'declining keeps the order and still draws 2');
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    gripBefore = runner.grip.length;
    diesel.Resolve({});
    check(actionPhase() && runner.grip.length == gripBefore, 'empty stack resolves without a choice');

    runner.AI = __runnerAI;
    while (runner.grip.length) MoveCard(runner.grip[0], runner.heap);
    var console1 = inst(35028, runner.rig.hardware);
    inst(T400, runner.stack); inst(T400, runner.stack);
    var spareConsole = inst(35006, runner.stack), keeper = inst(SIDE_HUSTLE, runner.stack);
    diesel.Resolve({});
    options = offered('continue');
    check(options.length == 1 && options[0].card === spareConsole, 'AI bottoms a redundant console');
    choose('continue');
    check(runner.stack[0] === spareConsole, 'AI bottom choice applied');
    MoveCard(keeper, runner.stack); inst(T400, runner.stack);
    diesel.Resolve({});
    options = offered('continue');
    check(options.length == 1 && options[0].card === null, 'AI keeps useful cards on top');
    choose('continue');
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    check(!diesel.AIWouldPlay(), 'AI does not play into an empty stack');`,

  // Blueberry, AI: the draw consumer plays it when the Runner needs cards.
  blueberryAi: `
    for (var k = 0; k < 6; k++) inst(T400, runner.stack);
    [corp.HQ, corp.RnD, corp.archives].forEach(function(s) { inst(PALISADE, s.ice).rezzed = true; });
    var diesel = inst(26012, runner.grip);
    runner.clickTracker = 1;
    finish = function() {
      if (runner.clickTracker > 0 || attackedServer || diesel.cardLocation === runner.resolvingCards) return false;
      check(diesel.cardLocation === runner.heap && log.includes('Played "Blueberry!™ Diesel"'), 'AI played Blueberry!™ Diesel to draw');
      check(runner.grip.length == 2, 'AI drew 2 cards');
      return true;
    };`,

  // Flip Switch, human: own-turn trash abilities and the trace interrupt.
  flipHuman: `
    runner.AI = null;
    var flip = inst(26013, runner.rig.hardware);
    var abilities = function() { return ChoicesAbility(flip).map(function(a) { return a.alt; }); };
    check(abilities().length == 0, 'nothing to do untagged outside a run');
    runner.tags = 2;
    check(abilities().join() == 'flipswitch_removetag', 'tag removal offered when tagged');
    playerTurn = corp;
    check(abilities().length == 0, 'unusable during the Corp turn');
    traceStrength = 3;
    check(flip.responseOnTraceInitiated.Enumerate.call(flip, 3).length == 0, 'trace interrupt unusable during the Corp turn');
    playerTurn = runner; traceStrength = 0;
    check(flip.responseOnTraceInitiated.Enumerate.call(flip, 0).length == 0, 'nothing to reduce at strength 0');
    playerTurn = runner;
    check(!ChoicesTriggerableAbilities(runner, 'click').some(function(t) { return t.card === flip; }), 'not a click ability');
    ChangePhase(phases.runnerPostAction);
    choose('trigger', function(t) { return t.card === flip && t.ability && t.ability.alt == 'flipswitch_removetag'; });
    settle(actionPhase, 'tag removal resolves');
    check(runner.tags == 1 && flip.cardLocation === runner.heap && runner.clickTracker == 4, 'trashed to remove 1 tag, no click');

    var flip2 = inst(26013, runner.rig.hardware);
    var traceResult = null;
    Trace(4, function(successful) { traceResult = successful; });
    check(currentPhase.title == 'Trace Initiated', 'interrupt window opens before strength decisions');
    choose('trigger', function(t) { return t.card === flip2; });
    check(offered('continue').length == 2, 'trace interrupt is optional');
    choose('continue', function(c) { return c.use; });
    settle(function() { return traceStrength === 0 && flip2.cardLocation === runner.heap; }, 'base trace strength reduced to 0');
    settle(function() { return traceResult !== null; }, 'trace resolves');

    var flip3 = inst(26013, runner.rig.hardware);
    var palisade = inst(PALISADE, corp.HQ.ice); palisade.rezzed = true;
    MakeRun(corp.HQ);
    settle(function() { return currentPhase.identifier == 'Run 3.1'; }, 'encounter reached');
    check(ChoicesAbility(flip3).some(function(a) { return a.alt == 'flipswitch_jackout'; }), 'jack out offered mid-encounter');
    flip3.abilities[0].Resolve.call(flip3, {});
    settle(actionPhase, 'jack out resolves');
    check(flip3.cardLocation === runner.heap && log.includes('Runner jacked out'), 'trashed to jack out');`,

  // Flip Switch, AI: zero a trace it cannot beat, then remove a tag without a click.
  flipAi: `
    runner.identityCard = inst(26010, []); // link 1
    var flipA = inst(26013, runner.rig.hardware), flipB = inst(26013, runner.rig.hardware);
    traceStrength = Link();
    var aiTrace = flipA.responseOnTraceInitiated.Enumerate.call(flipA, traceStrength);
    check(aiTrace.length == 1 && !aiTrace[0].use, 'AI declines a trace its link already matches');
    runner.tags = 1;
    var traced = null;
    Trace(Link() + 3, function(successful) { traced = successful; });
    finish = function() {
      if (traced === null || !actionPhase() || runner.tags > 0) return false;
      check(traced === false && log.includes('Base trace strength reduced to 0'), 'AI zeroed a trace it could not beat');
      check(flipA.cardLocation === runner.heap && flipB.cardLocation === runner.heap, 'both copies trashed');
      var removed = log.indexOf('1 tag removed');
      check(removed > 0 && log[removed - 1] == 'Flip Switch trashed', 'AI removed the tag with Flip Switch, not the basic action');
      return true;
    };`,

  // Lucky Charm: needs a successful HQ run this turn; human and AI prevention.
  lucky: `
    runner.AI = null;
    var lucky = inst(26014, runner.rig.hardware);
    var palisade = inst(PALISADE, corp.RnD.ice); palisade.rezzed = true;
    MakeRun(corp.RnD);
    settle(actionPhase, 'run without an HQ success ends');
    check(lucky.cardLocation === runner.rig.hardware, 'not usable before a successful HQ run');
    MakeRun(corp.HQ);
    settle(actionPhase, 'HQ run resolves');
    check(lucky.madeSuccessfulRunOnHQThisTurn, 'successful HQ run recorded');
    MakeRun(corp.RnD);
    settle(function() { return offered('continue').some(function(c) { return c.use === false; }); }, 'declinable end-the-run interrupt');
    choose('continue', function(c) { return !c.use; });
    settle(actionPhase, 'declined: run ends');
    check(lucky.cardLocation === runner.rig.hardware, 'declining keeps Lucky Charm');
    MakeRun(corp.RnD);
    settle(function() { return offered('continue').some(function(c) { return c.use === true; }); }, 'end-the-run interrupt offered again');
    choose('continue', function(c) { return c.use; });
    settle(function() { return currentPhase.identifier == 'Run 5.1' || actionPhase(); }, 'run continues');
    check(lucky.cardLocation === removedFromGame && currentPhase.identifier == 'Run 5.1', 'removed from the game, run continues to success');
    settle(actionPhase, 'run ends');
    lucky.responseOnCorpTurnBegins.Resolve.call(lucky);
    check(!lucky.madeSuccessfulRunOnHQThisTurn, 'HQ success resets each turn');

    runner.AI = __runnerAI;
    var charm = inst(26014, runner.rig.hardware);
    charm.madeSuccessfulRunOnHQThisTurn = true;
    runner.AI.cachedPotentials = [{server: corp.RnD, potential: 0}];
    attackedServer = corp.RnD; intended.endRun = true;
    var aiCharm = charm.responsePreventableEndRun.Enumerate.call(charm);
    check(aiCharm.length == 1 && !aiCharm[0].use, 'AI keeps it when the server is not worth reaching');
    attackedServer = null; intended.endRun = false;
    runner.AI.cachedPotentials = [{server: corp.RnD, potential: 2}];
    MakeRun(corp.RnD);
    finish = function() {
      if (attackedServer || !actionPhase()) return false;
      check(charm.cardLocation === removedFromGame && log.includes('Lucky Charm prevents the run from ending'), 'AI prevented the end of a valuable run');
      return true;
    };`,
};

function backupAi(iceCount) {
  return `
    for (var k = 0; k < ${iceCount}; k++) inst(PALISADE, corp.HQ.ice).rezzed = true;
    runner.AI.cachedPotentials = [{server: corp.HQ, potential: 2}];
    var plan = inst(26011, runner.resolvingCards);
    var runs = 0, oldMake = MakeRun, bypassed = 0, oldBypass = Bypass;
    MakeRun = function(s) { runs++; oldMake(s); };
    Bypass = function() { bypassed++; oldBypass(); };
    plan.Resolve({server: corp.HQ});
    finish = function() {
      if (attackedServer || !actionPhase()) return false;
      if (${iceCount} == 1) {
        check(runs == 2 && bypassed == 1 && log.includes('Run successful'), 'AI reran and bypassed the ice that ended the first run');
      } else {
        check(runs == 1 && bypassed == 0, 'AI declines a rerun with no complete path');
      }
      check(!plan.runningWithThis, 'AI case cleaned up');
      return true;
    };`;
}

(async () => {
  let total = 0;
  for (const [name, body] of Object.entries(cases)) {
    total += await scenario(name, 'var __runnerAI = runner.AI;\n' +
      body.replace(/\b(PALISADE|DZMZ|T400|SIDE_HUSTLE|SCRUBBER|ICE_CARVER)\b/g, match => ({PALISADE, DZMZ, T400, SIDE_HUSTLE, SCRUBBER, ICE_CARVER})[match]));
  }
  console.log('Downfall batch 3: ' + Object.keys(cases).length + ' real-engine scenarios, ' + total + ' checks passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
