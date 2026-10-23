'use strict';
// Uprising batch 3 (26074-26078) in the real engine with both AIs: Bravado,
// Boomerang, Mu Safecracker, Prognostic Q-Loop and Swift.
// Human menus are driven phase by phase; AI cases run the real main loop.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {playGame} = require(path.join(root, 'scripts', 'ai-batch', 'headless'));
const SETS = ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/uprising.js'];
const IDS = {PALISADE: 30072, PHAROS: 30063, WHITESPACE: 30074, HEDGE: 30075, TREAD: 30012, DZMZ: 30022,
  T400: 30031, UNITY: 30026, SURE_GAMBLE: 30030, MANTLE: 26088};

// Shared in-game helpers. `body` runs inside StartGame; a body that sets
// `finish` hands control to the AI main loop and ends the game itself.
const PRELUDE = `
  var checks = [], failure = null, log = [], accesses = 0;
  __report = function() { return {checks: checks, failure: failure, log: log}; };
  function check(condition, message) {
    if (!condition) throw new Error(message);
    checks.push(message);
  }
  function inst(id, location) {
    var back = cardSet[id].player == runner ? cardBackTexturesRunner : cardBackTexturesCorp;
    var card = InstanceCardsPush(id, location, 1, back, glowTextures, strengthTextures)[0];
    InvalidateActiveTriggerCandidateCache(); //instanced test cards may add modify callbacks
    return card;
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
  function pass() {
    var responseWindow = currentPhase.identifier == 'Run Subroutines' ||
      (typeof currentPhase.triggerCallbackName == 'string' && currentPhase.triggerCallbackName != 'NOT SET');
    if (responseWindow && offered('trigger').length) return choose('trigger');
    if (offered('continue').length) return choose('continue');
    if (offered('access').length) return choose('access'); //breach every card the Runner may access
    if (typeof currentPhase.Resolve.n == 'function') return currentPhase.Resolve.n(offered('n')[0] || {});
    var commands = Object.keys(currentPhase.Resolve).filter(function(c) { return offered(c).length > 0; });
    if (!commands.length) throw new Error('No command in ' + currentPhase.identifier + ' ' + currentPhase.title);
    choose(commands[0]);
  }
  function settle(predicate, label) {
    for (var step = 0; step < 80 && !predicate(); step++) pass();
    check(predicate(), label);
  }
  function triggerOffered(card) { return offered('trigger').some(function(t) { return t.card === card; }); }
  function responseOffered(card) { return offered('trigger').some(function(t) { return t.card === card && !t.ability; }); }
  function actionPhase() { return currentPhase === phases.runnerActionMain && !attackedServer; }
`;

async function scenario(name, body) {
  const setupCode = PRELUDE + `
    StartGame = function() {
      var finish = null;
      try {
        for (var __i = 0; __i < 5; __i++) MoveCardByIndex(corp.RnD.cards.length - 1, corp.RnD.cards, corp.HQ.cards);
        while (runner.grip.length) MoveCard(runner.grip[0], runner.heap);
        var oldLog = Log; Log = function(m) { log.push(m); oldLog(m); };
        var oldAccessInit = phases.runAccessingCard.Init;
        phases.runAccessingCard.Init = function() { accesses++; return oldAccessInit.apply(this, arguments); };
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uprising-b3-'));
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
  // Bravado: iced servers only; pays 6 + distinct passed ice when the run ends, successful or not.
  bravadoHuman: `
    runner.AI = null; corp.creditPool = 0;
    var bravado = inst(26074, runner.resolvingCards);
    check(!bravado.Enumerate().some(function(c) { return c.server === corp.HQ; }), 'unprotected server cannot be chosen');
    inst(WHITESPACE, corp.HQ.ice); inst(WHITESPACE, corp.HQ.ice);
    check(bravado.Enumerate().every(function(c) { return c.server.ice.length > 0; }) &&
      bravado.Enumerate().some(function(c) { return c.server === corp.HQ; }), 'only servers protected by ice offered');
    var before = runner.creditPool;
    bravado.Resolve({server: corp.HQ});
    settle(actionPhase, 'successful run past two unrezzed ice ends');
    check(runner.creditPool == before + 8, 'gained 6 plus 2 for two passed ice');
    check(!bravado.runningWithThis && bravado.icePassed.length == 0, 'state cleaned up');

    var palisade = inst(PALISADE, corp.RnD.ice); palisade.rezzed = true;
    inst(WHITESPACE, corp.RnD.ice);
    MoveCard(bravado, runner.resolvingCards);
    before = runner.creditPool;
    bravado.Resolve({server: corp.RnD});
    settle(actionPhase, 'run ended by Palisade');
    check(runner.creditPool == before + 7, 'gained 7 after an unsuccessful run');

    before = runner.creditPool;
    MakeRun(corp.HQ);
    settle(actionPhase, 'ordinary run ends');
    check(runner.creditPool == before, 'no payout for a run not made with Bravado');`,

  // Bravado, AI: played as the run event when the AI runs an iced server.
  bravadoAi: `
    corp.creditPool = 0;
    [corp.HQ, corp.RnD, corp.archives].forEach(function(s) { inst(WHITESPACE, s.ice); });
    var bravado = inst(26074, runner.grip);
    runner.creditPool = 5; runner.clickTracker = 1;
    check(bravado.AIRunEventExtraPotential(corp.HQ, 1) > 0 && bravado.AIRunEventExtraPotential(corp.remoteServers[0] || {ice: []}, 1) == 0, 'potential only for iced servers');
    finish = function() {
      if (attackedServer || bravado.cardLocation !== runner.heap) { if (!attackedServer && runner.clickTracker == 0 && bravado.cardLocation === runner.grip) check(false, 'AI played Bravado'); return false; }
      check(log.some(function(m) { return m.indexOf('Bravado: gained 7 credits') == 0; }), 'AI played Bravado and was paid for the passed ice');
      return true;
    };`,

  // Boomerang, human: choose ice on install; trash to break 2 subs on that ice only; recur after success.
  boomerangHuman: `
    runner.AI = null;
    var white = inst(WHITESPACE, corp.HQ.ice); white.rezzed = true;
    var pharos = inst(PHAROS, corp.RnD.ice); pharos.rezzed = true;
    var boom = inst(26075, runner.grip);
    choose('install', function(c) { return c.card === boom; });
    settle(function() { return offered('continue').some(function(c) { return c.card === white; }); }, 'ice choice offered on install');
    check(offered('continue').some(function(c) { return c.card === pharos; }), 'any installed ice can be chosen');
    choose('continue', function(c) { return c.card === white; });
    settle(actionPhase, 'install completes');
    check(boom.chosenCard === white && boom.cardLocation === runner.rig.hardware, 'Whitespace chosen');
    check(ChoicesAbility(boom).length == 0, 'unusable outside an encounter');

    MakeRun(corp.RnD);
    settle(function() { return currentPhase.identifier == 'Run 3.1'; }, 'Pharos encounter');
    check(ChoicesAbility(boom).length == 0, 'unusable on other ice');
    JackOut();
    settle(actionPhase, 'jacked out');

    MakeRun(corp.HQ);
    settle(function() { return currentPhase.identifier == 'Run 3.1'; }, 'Whitespace encounter');
    var subs = ChoicesAbility(boom)[0].choices;
    check(subs.length == 2, 'both subroutines offered');
    boom.abilities[0].Resolve.call(boom, subs[0]);
    settle(function() { return offered('continue').some(function(c) { return c.id === -1; }); }, 'second break optional');
    check(boom.cardLocation === runner.heap, 'trashed as the cost');
    choose('continue', function(c) { return c.subroutine; });
    check(white.subroutines.every(function(s) { return s.broken; }), 'both subroutines broken');
    settle(function() { return triggerOffered(boom) || actionPhase(); }, 'run ends successfully');
    check(triggerOffered(boom), 'recursion offered after a successful run');
    choose('trigger', function(t) { return t.card === boom; });
    check(offered('continue').length == 2, 'shuffling is optional');
    choose('continue', function(c) { return c.use; });
    settle(actionPhase, 'run ends');
    check(boom.cardLocation === runner.stack && !boom.boomerangReturnPending, 'shuffled back into the stack');

    // Unsuccessful run: no recursion.
    MoveCard(boom, runner.rig.hardware); boom.chosenCard = pharos;
    MakeRun(corp.RnD);
    settle(function() { return currentPhase.identifier == 'Run 3.1'; }, 'Pharos encounter again');
    var pharosSubs = ChoicesAbility(boom)[0].choices;
    boom.abilities[0].Resolve.call(boom, pharosSubs[0]);
    settle(function() { return offered('continue').some(function(c) { return c.id === -1; }); }, 'second break offered');
    choose('continue', function(c) { return c.id === -1; });
    check(pharos.subroutines.filter(function(s) { return s.broken; }).length == 1, 'declining leaves one break');
    settle(actionPhase, 'run ended by Pharos');
    check(boom.cardLocation === runner.heap && !boom.boomerangReturnPending, 'no recursion after an unsuccessful run; flag cleared');`,

  // Boomerang, AI: chooses ice on the server it plans to run, then breaks with it in the real run.
  boomerangAi: `
    var white = inst(WHITESPACE, corp.HQ.ice); white.rezzed = true;
    var boom = inst(26075, runner.rig.hardware);
    runner.AI.cachedPathServer = corp.HQ;
    var aiChoice = boom.responseOnInstall.Enumerate.call(boom, boom);
    check(aiChoice.length == 1 && aiChoice[0].card === white, 'AI chooses ice on the planned server');
    boom.chosenCard = white;
    runner.creditPool = 0; runner.clickTracker = 1;
    check(boom.AIInstallBeforeRun(corp.HQ) == 1, 'install-before-run on a threatening iced server');
    finish = function() {
      if (attackedServer || runner.clickTracker > 0) return false;
      check(log.indexOf('Run successful') > -1, 'AI completed the run');
      check(boom.cardLocation === runner.stack, 'AI used Boomerang and shuffled it back');
      return true;
    };`,

  // Mu Safecracker, human: stealth credits only; HQ costs 1, R&D costs 2.
  muHuman: `
    runner.AI = null;
    var mu = inst(26076, runner.rig.hardware);
    var mantle = inst(MANTLE, runner.rig.programs); mantle.credits = 1;
    for (var k = 0; k < 4; k++) { inst(HEDGE, corp.HQ.cards); inst(HEDGE, corp.RnD.cards); }
    MakeRun(corp.HQ);
    settle(function() { return triggerOffered(mu) || currentPhase.identifier == 'Run 5.1'; }, 'HQ success');
    check(triggerOffered(mu), 'offered on a successful HQ run');
    choose('trigger', function(t) { return t.card === mu; });
    choose('continue', function(c) { return c.use; });
    check(mantle.credits == 0 && runner.creditPool == 10, 'paid 1 from Mantle, not the pool');
    accesses = 0;
    settle(actionPhase, 'HQ breach ends');
    check(accesses == 2 && mu.additionalAccessServer === null, 'accessed 2 HQ cards; state cleared ' + accesses + ' ' + mu.additionalAccessServer + ' ' + log.slice(-12).join(' | '));

    mantle.credits = 1;
    MakeRun(corp.RnD);
    settle(function() { return currentPhase.identifier == 'Run 5.1' || actionPhase(); }, 'R&D success');
    check(!triggerOffered(mu), 'R&D needs 2 stealth credits');
    accesses = 0;
    settle(actionPhase, 'R&D breach ends');
    check(accesses == 1 && mantle.credits == 1 && runner.creditPool == 10, 'normal access, nothing paid');

    mantle.credits = 2;
    MakeRun(corp.RnD);
    settle(function() { return triggerOffered(mu); }, 'offered on R&D with 2 stealth credits');
    choose('trigger', function(t) { return t.card === mu; });
    choose('continue', function(c) { return !c.use; });
    accesses = 0;
    settle(actionPhase, 'declined R&D breach ends');
    check(accesses == 1 && mantle.credits == 2, 'declining pays nothing');

    MakeRun(corp.RnD);
    settle(function() { return triggerOffered(mu); }, 'offered again');
    choose('trigger', function(t) { return t.card === mu; });
    choose('continue', function(c) { return c.use; });
    accesses = 0;
    settle(actionPhase, 'paid R&D breach ends');
    check(accesses == 2 && mantle.credits == 0 && runner.creditPool == 10, 'paid 2 stealth credits for 2 R&D accesses');`,

  // Mu Safecracker, AI: models the access and pays with stealth credits in the real run.
  muAi: `
    var mu = inst(26076, runner.rig.hardware);
    var mantle = inst(MANTLE, runner.rig.programs); mantle.credits = 1;
    for (var k = 0; k < 4; k++) { inst(HEDGE, corp.HQ.cards); }
    check(mu.AIAdditionalAccess(corp.HQ) == 1 && mu.AIAdditionalAccess(corp.RnD) == 0, 'access modelled only when affordable');
    check(mu.AICentralPressure(corp.HQ).additionalAccess == 1, 'public central pressure on HQ');
    mantle.credits = 0;
    check(mu.AIAdditionalAccess(corp.HQ) == 0, 'no access without stealth credits');
    mantle.credits = 1;
    MakeRun(corp.HQ);
    accesses = 0;
    finish = function() {
      if (attackedServer || !actionPhase()) return false;
      check(mantle.credits == 0 && runner.creditPool == 10 && accesses == 2, 'AI paid 1 stealth credit for an extra HQ access');
      return true;
    };`,

  // Q-Loop, human: optional look on the first run each turn; once-per-turn reveal and install.
  qloopHuman: `
    runner.AI = null;
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    var second = inst(SURE_GAMBLE, runner.stack), top = inst(T400, runner.stack);
    var q = inst(26077, runner.rig.hardware);
    MakeRun(corp.archives);
    settle(function() { return responseOffered(q); }, 'look offered when the first run begins');
    choose('trigger', function(t) { return t.card === q && !t.ability; });
    choose('continue', function(c) { return c.use; });
    var shown = offered('continue');
    check(shown.length == 1 && shown[0].label.indexOf('Memory Diamond') > -1, 'top cards shown');
    settle(actionPhase, 'first run ends');
    check(top.knownToRunner && second.knownToRunner && q.lookedAt[0] === top, 'top 2 cards known');
    MakeRun(corp.archives);
    settle(function() { return responseOffered(q) || actionPhase(); }, 'second run');
    check(!responseOffered(q), 'no look on the second run');
    settle(actionPhase, 'second run ends');

    ChangePhase(phases.runnerPostAction);
    var before = runner.creditPool;
    choose('trigger', function(t) { return t.card === q; });
    settle(function() { return offered('continue').some(function(c) { return c.card === top; }); }, 'install offered after reveal');
    choose('continue', function(c) { return c.card === top; });
    settle(function() { return top.cardLocation === runner.rig.hardware; }, 'installed from the stack');
    check(runner.creditPool == before - 1 - InstallCost(top), 'paid 1 plus the install cost');
    check(ChoicesAbility(q).length == 0, 'once per turn');

    q.responseOnRunnerTurnBegins.Resolve.call(q);
    before = runner.creditPool;
    q.abilities[0].Resolve.call(q, {});
    settle(function() { return !offered('continue').some(function(c) { return c.card; }); }, 'event revealed');
    check(second.cardLocation === runner.stack && runner.creditPool == before - 1, 'event revealed but not installable');
    MoveCard(second, runner.heap);
    check(ChoicesAbility(q).length == 0, 'no use with an empty stack');

    // "First time each turn" counts a run begun before Q-Loop was installed.
    var q2 = inst(26077, runner.grip); inst(T400, runner.stack);
    q2.responseOnRunnerTurnBegins.Resolve.call(q2);
    ChangePhase(phases.runnerActionMain);
    MakeRun(corp.archives);
    settle(actionPhase, 'run before install');
    MoveCard(q2, runner.rig.hardware);
    MakeRun(corp.archives);
    settle(function() { return responseOffered(q2) || actionPhase(); }, 'run after install');
    check(!responseOffered(q2), 'not the first run this turn');
    settle(actionPhase, 'run ends');`,

  // Q-Loop, AI: looks on its run, then uses the ability to install a known hardware.
  qloopAi: `
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    for (var k = 0; k < 4; k++) inst(SURE_GAMBLE, runner.stack);
    var second = inst(SURE_GAMBLE, runner.stack), top = inst(T400, runner.stack);
    var q = inst(26077, runner.rig.hardware);
    MakeRun(corp.archives);
    finish = function() {
      if (top.cardLocation !== runner.rig.hardware) { if (attackedServer === null && runner.clickTracker == 0 && actionPhase()) check(false, 'AI installed the known hardware with Q-Loop'); return false; }
      check(q.lookedAt[0] === top && q.usedThisTurn, 'AI looked, then used Q-Loop');
      check(log.some(function(m) { return m.indexOf('revealed') > -1; }), 'top card revealed');
      return true;
    };`,

  // Q-Loop AI guard: unknown or non-installable top card is not worth the credit.
  qloopAiGuard: `
    while (runner.stack.length) MoveCard(runner.stack[0], runner.heap);
    var gamble = inst(SURE_GAMBLE, runner.stack);
    var q = inst(26077, runner.rig.hardware);
    check(!q.AIWouldTrigger(), 'unknown top card');
    gamble.knownToRunner = true; q.lookedAt = [gamble];
    check(!q.AIWouldTrigger(), 'known event is not installable');
    var t400 = inst(T400, runner.stack); t400.knownToRunner = true; q.lookedAt = [t400];
    check(q.AIWouldTrigger(), 'known hardware is worth revealing');
    runner.creditPool = InstallCost(t400);
    check(!q.AIWouldTrigger(), 'needs 1 more than the install cost');`,

  // Swift: +1 MU; first run event each turn gains a click, even counting plays before install.
  swiftHuman: `
    runner.AI = null;
    var mu = MemoryUnits();
    var swift = inst(26078, runner.grip);
    choose('install', function(c) { return c.card === swift; });
    settle(actionPhase, 'Swift installed');
    check(MemoryUnits() == mu + 1, '+1 MU');
    var clicks = runner.clickTracker;
    var tread = inst(TREAD, runner.grip);
    choose('play', function(c) { return c.card === tread; });
    settle(function() { return offered('continue').some(function(c) { return c.server === corp.archives; }) || attackedServer; }, 'server choice');
    if (!attackedServer) choose('continue', function(c) { return c.server === corp.archives; });
    settle(actionPhase, 'Tread Lightly run ends');
    check(runner.clickTracker == clicks, 'click spent to play was regained');
    var tread2 = inst(TREAD, runner.grip);
    choose('play', function(c) { return c.card === tread2; });
    if (!attackedServer) choose('continue', function(c) { return c.server === corp.archives; });
    settle(actionPhase, 'second run ends');
    check(runner.clickTracker == clicks - 1, 'only the first run event each turn');
    var gamble = inst(SURE_GAMBLE, runner.grip);
    swift.responseOnRunnerTurnBegins.Resolve.call(swift);
    clicks = runner.clickTracker;
    choose('play', function(c) { return c.card === gamble; });
    settle(actionPhase, 'Sure Gamble resolves');
    check(runner.clickTracker == clicks - 1 && !swift.playedRunEventThisTurn, 'non-run events ignored');

    // A run event played while Swift was not installed uses up the turn's trigger.
    MoveCard(swift, runner.grip); runner.clickTracker = 4;
    var tread3 = inst(TREAD, runner.grip);
    choose('play', function(c) { return c.card === tread3; });
    if (!attackedServer) choose('continue', function(c) { return c.server === corp.archives; });
    settle(actionPhase, 'run with Swift in grip ends');
    Install(swift, null, true);
    settle(actionPhase, 'Swift reinstalled');
    clicks = runner.clickTracker;
    var tread4 = inst(TREAD, runner.grip);
    choose('play', function(c) { return c.card === tread4; });
    if (!attackedServer) choose('continue', function(c) { return c.server === corp.archives; });
    settle(actionPhase, 'later run ends');
    check(runner.clickTracker == clicks - 1, 'no click after an earlier run event this turn');`,

  // Swift, AI: installs it as its console, and not over another console.
  swiftAi: `
    var swift = inst(26078, runner.grip); inst(TREAD, runner.grip);
    check(swift.AIEconomyInstall() == 2, 'higher install priority with a run event in grip');
    var other = inst(26078, []);
    other.subTypes = ['Console']; runner.rig.hardware.push(other); other.cardLocation = runner.rig.hardware;
    check(swift.AIWastefulToInstall() && swift.AIEconomyInstall() == 0, 'not over an installed console');
    runner.rig.hardware.splice(runner.rig.hardware.indexOf(other), 1);
    [corp.HQ, corp.RnD, corp.archives].forEach(function(s) { inst(PALISADE, s.ice).rezzed = true; });
    runner.creditPool = 3;
    finish = function() {
      if (swift.cardLocation !== runner.rig.hardware) { if (runner.clickTracker == 0 && !attackedServer) check(false, 'AI installed Swift'); return false; }
      check(MemoryUnits() > 0, 'AI installed Swift');
      return true;
    };`,
};

(async () => {
  let total = 0;
  const names = Object.keys(IDS).join('|');
  for (const [name, body] of Object.entries(cases)) {
    if (process.env.ONLY && process.env.ONLY != name) continue;
    total += await scenario(name, 'var __runnerAI = runner.AI;\n' +
      body.replace(new RegExp('\\b(' + names + ')\\b', 'g'), match => IDS[match]));
  }
  console.log('Uprising batch 3: ' + Object.keys(cases).length + ' real-engine scenarios, ' + total + ' checks passed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
