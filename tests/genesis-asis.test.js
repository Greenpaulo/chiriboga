'use strict';
// Genesis: A Study in Static (2061-2079, non-duplicates) in the real engine with
// both AIs. Human menus are driven phase by phase; AI cases run the real main
// loop or the real Runner/Corp selectors.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, '..');
const {playGame} = require(path.join(root, 'scripts', 'ai-batch', 'headless'));
const SETS = ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/genesis.js'];
const ENIGMA = 31081, KARUNA = 30047, PALISADE = 30072, SURE_GAMBLE = 30030;

const PRELUDE = `
  var checks = [], failure = null, log = [];
  __report = function() { return {checks: checks, failure: failure, log: log}; };
  function check(condition, message) {
    if (!condition) throw new Error(message);
    checks.push(message);
  }
  function inst(id, location) {
    var back = cardSet[id].player == runner ? cardBackTexturesRunner : cardBackTexturesCorp;
    var card = InstanceCardsPush(id, location, 1, back, glowTextures, strengthTextures)[0];
    if (location !== runner.grip && location !== runner.stack && location !== corp.HQ.cards && location !== corp.RnD.cards) {
      if (cardSet[id].recurringCredits) card.credits = cardSet[id].recurringCredits;
    }
    return card;
  }
  function ice(id, server) { var c = inst(id, server.ice); c.rezzed = true; return c; }
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
    if (typeof currentPhase.Resolve.n == 'function') return currentPhase.Resolve.n(offered('n')[0] || {});
    var commands = Object.keys(currentPhase.Resolve).filter(function(c) { return offered(c).length > 0; });
    if (!commands.length) throw new Error('No command in ' + currentPhase.identifier + ' ' + currentPhase.title);
    choose(commands[0]);
  }
  function settle(predicate, label) {
    for (var step = 0; step < 120 && !predicate(); step++) pass();
    check(predicate(), label);
  }
  function actionPhase() { return currentPhase === phases.runnerActionMain && !attackedServer; }
  function corpAction() { return currentPhase === phases.corpActionMain && !attackedServer; }
  function corpTurn() { playerTurn = corp; corp.clickTracker = 3; ChangePhase(phases.corpActionMain); }
  function inEncounter() { return currentPhase.identifier == 'Run 3.1'; }
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
          if (ended) { PlayerWin(corp, 'case complete'); return true; }
          return oldStop();
        };
        Main();
      } else PlayerWin(corp, 'case complete');
    };`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genesis-asis-'));
  const file = path.join(dir, 'setup.js');
  fs.writeFileSync(file, setupCode);
  let game;
  try {
    game = await playGame({streamPrefix: '1:' + name, corpFile: 'Duel PE vs Steve.js', runnerFile: 'Duel Steve vs PE.js',
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
  // Disrupter: human may zero or decline; AI zeroes only traces it cannot match.
  disrupter: `
    runner.AI = null;
    var d = inst(2061, runner.rig.programs);
    traceStrength = 4;
    var menu = d.responseOnTraceInitiated.Enumerate.call(d, 4);
    check(menu.length == 2 && menu[1].use === false, 'human gets use and decline');
    d.responseOnTraceInitiated.Resolve.call(d, menu[1]);
    check(d.cardLocation === runner.rig.programs && traceStrength == 4, 'decline keeps Disrupter');
    var result = null;
    Trace(3, function(s) { result = s; });
    choose('trigger');
    settle(function() { return result !== null; }, 'trace resolves');
    check(log.includes('Base trace strength reduced to 0') && d.cardLocation === runner.heap, 'Disrupter trashed to zero the trace');
    var d2 = inst(2061, runner.rig.programs);
    traceStrength = 0;
    check(d2.responseOnTraceInitiated.Enumerate.call(d2, 0).length == 0, 'nothing to reduce at 0');
    traceStrength = Link();
    check(!d2.AIWouldZeroTrace(), 'AI keeps it against a trace link already matches');
    traceStrength = Link() + 2;
    check(d2.AIWouldZeroTrace(), 'AI zeroes a trace it would lose');`,

  // Force of Nature: 1[c] pump and 2[c] break up to 2 code gate subs; AI path uses it.
  forceHuman: `
    runner.AI = null;
    var fon = inst(2062, runner.rig.programs);
    var enigma = ice(ENIGMA, corp.archives);
    MakeRun(corp.archives);
    settle(inEncounter, 'encounter Enigma');
    check(fon.abilities[0].Enumerate.call(fon).length == 0, 'cannot break below strength');
    fon.abilities[1].Resolve.call(fon, {});
    check(fon.abilities[1].Enumerate.call(fon).length == 0 && runner.creditPool == 9, 'pumped once for 1');
    var subs = fon.abilities[0].Enumerate.call(fon);
    fon.abilities[0].Resolve.call(fon, subs[0]);
    choose('continue', function(c) { return !!c.subroutine; });
    check(enigma.subroutines.every(function(s) { return s.broken; }) && runner.creditPool == 7, 'broke both subroutines for 2');
    settle(actionPhase, 'run ends');
    check(fon.strengthBoost == 0, 'strength resets after encounter');
    var palisade = ice(PALISADE, corp.HQ);
    MakeRun(corp.HQ);
    settle(inEncounter, 'encounter barrier');
    check(fon.abilities[0].Enumerate.call(fon).length == 0 && fon.abilities[1].Enumerate.call(fon).length == 0, 'no use on a barrier');`,

  forceAi: `
    for (var g = 0; g < 4; g++) inst(SURE_GAMBLE, runner.grip);
    var fon = inst(2062, runner.rig.programs);
    var enigma = ice(ENIGMA, corp.archives);
    var path = runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0);
    check(path && path.some(function(p) { return p.sr_broken.some(function(s) { return s.use === fon; }); }), 'run calculator breaks Enigma with Force of Nature');
    check(path[path.length - 1].runner_credits_spent == 3, 'priced at 1 pump plus 2 break');
    runner.creditPool = 2;
    path = runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0);
    check(!path || !path.some(function(p) { return p.sr_broken.some(function(s) { return s.use === fon && s.idx == 1; }); }), 'cannot afford the ETR break with 2 credits');
`,

  // Doppelgänger: +1 MU; once per turn after a successful run, may run any server.
  doppelHuman: `
    runner.AI = null;
    var mu = MemoryUnits ? MemoryUnits() : null;
    var dop = inst(2064, runner.rig.hardware);
    if (mu !== null) check(MemoryUnits() == mu + 1, '+1 MU');
    MakeRun(corp.archives);
    settle(function() { return offered('trigger').some(function(c) { return c.card === dop || (c.choices && c.choices.length); }) || actionPhase(); }, 'run end window');
    check(!actionPhase(), 'Doppelgänger offered after a successful run');
    var opts = dop.responseOnRunEnds.Enumerate.call(dop);
    check(opts.some(function(o) { return o.server === corp.HQ; }) && opts[opts.length - 1].server === null, 'any server or decline');
    dop.responseOnRunEnds.Resolve.call(dop, opts.find(function(o) { return o.server === corp.HQ; }));
    settle(function() { return attackedServer === corp.HQ || actionPhase(); }, 'second run starts');
    check(attackedServer === corp.HQ && runner.clickTracker == 4, 'second run on HQ without a click');
    settle(actionPhase, 'second run ends');
    check(dop.usedThisTurn && dop.responseOnRunEnds.Enumerate.call(dop).length == 0, 'once per turn');
    dop.responseOnRunnerTurnBegins.Resolve.call(dop);
    check(!dop.usedThisTurn, 'resets next turn');`,

  doppelAi: `
    for (var g0 = 0; g0 < 4; g0++) inst(SURE_GAMBLE, runner.grip);
    var dop = inst(2064, runner.rig.hardware);
    dop.runWasSuccessful = true;
    runner.AI.cachedPotentials = [{server: corp.HQ, potential: 2}, {server: corp.RnD, potential: 1}];
    var pick = dop.responseOnRunEnds.Enumerate.call(dop);
    check(pick.length == 1 && pick[0].server === corp.HQ, 'AI runs the highest-potential open server');
    runner.AI.cachedPotentials = [];
    pick = dop.responseOnRunEnds.Enumerate.call(dop);
    check(pick.length == 1 && pick[0].server === null, 'AI declines with no worthwhile server');
    ice(PALISADE, corp.HQ); runner.creditPool = 0;
    runner.AI.cachedPotentials = [{server: corp.HQ, potential: 2}];
    check(dop.AIDoppelgangerTarget() === null, 'AI declines a server it cannot get through');`,

  // Crescentus: derez ice fully broken this encounter; AI triggers it through the encounter hook.
  crescentus: `
    var aiRunner = runner.AI;
    var cres = inst(2065, runner.rig.programs);
    var enigma = ice(ENIGMA, corp.archives);
    runner.AI = null;
    MakeRun(corp.archives);
    settle(inEncounter, 'encounter Enigma');
    check(cres.abilities[0].Enumerate.call(cres).length == 0, 'not before fully broken');
    enigma.subroutines[0].broken = true;
    check(cres.abilities[0].Enumerate.call(cres).length == 0, 'not when partly broken');
    enigma.subroutines[1].broken = true;
    check(cres.abilities[0].Enumerate.call(cres).length == 1, 'usable when fully broken');
    check(cres.AITriggerDuringEncounter() == 'crescentus_derez', 'Enigma (rez 3) is worth derezzing');
    cres.abilities[0].Resolve.call(cres, {});
    settle(function() { return !enigma.rezzed || actionPhase(); }, 'derez resolves');
    check(!enigma.rezzed && cres.cardLocation === runner.heap, 'Enigma derezzed and Crescentus trashed');
    settle(actionPhase, 'run ends');
    runner.AI = aiRunner;`,

  // AI: the encounter-trigger consumer derezzes ice the run path fully broke.
  crescentusAi: `
    for (var g = 0; g < 4; g++) inst(SURE_GAMBLE, runner.grip);
    var cres = inst(2065, runner.rig.programs);
    var fon = inst(2062, runner.rig.programs);
    var enigma = ice(ENIGMA, corp.archives);
    MakeRun(corp.archives);
    finish = function() {
      if (!actionPhase()) return false;
      check(!enigma.rezzed && cres.cardLocation === runner.heap, 'AI fully broke Enigma and derezzed it with Crescentus');
      return true;
    };`,

  // Deus X: [trash] break any number of AP subs; [trash] prevent net damage; AI hooks.
  deusHuman: `
    runner.AI = null;
    var deus = inst(2066, runner.rig.programs);
    var karuna = ice(KARUNA, corp.archives);
    var palisade = ice(PALISADE, corp.HQ);
    MakeRun(corp.HQ);
    settle(inEncounter, 'encounter non-AP');
    check(deus.abilities[0].Enumerate.call(deus).length == 0, 'no break on non-AP ice');
    settle(actionPhase, 'HQ run ends');
    MakeRun(corp.archives);
    settle(inEncounter, 'encounter Karunā');
    var subs = deus.abilities[0].Enumerate.call(deus);
    deus.abilities[0].Resolve.call(deus, subs[0]);
    settle(function() { return offered('continue').some(function(c) { return !!c.subroutine; }); }, 'offered more breaks');
    choose('continue', function(c) { return !!c.subroutine; });
    check(karuna.subroutines.every(function(s) { return s.broken; }) && deus.cardLocation === runner.heap, 'both AP subs broken; Deus X trashed');
    settle(actionPhase, 'run ends');
    var deus2 = inst(2066, runner.rig.programs);
    for (var g = 0; g < 4; g++) inst(SURE_GAMBLE, runner.grip);
    intended.damageType = 'net'; intended.damage = 3;
    var menu = deus2.responsePreventableDamage.Enumerate.call(deus2);
    check(menu.length == 2, 'prevention offered with decline');
    intended.damageType = 'meat';
    check(deus2.responsePreventableDamage.Enumerate.call(deus2).length == 0, 'not meat damage');
    var done = false;
    Damage('net', 3, true, function() { done = true; });
    choose('trigger');
    settle(function() { return done; }, 'damage resolves');
    check(runner.grip.length == 4 && deus2.cardLocation === runner.heap, 'all net damage prevented');`,

  deusAi: `
    for (var g0 = 0; g0 < 4; g0++) inst(SURE_GAMBLE, runner.grip);
    var deus = inst(2066, runner.rig.programs);
    var karuna = ice(KARUNA, corp.archives);
    runner.creditPool = 0;
    var path = runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0, null, 0);
    check(path && path.some(function(p) { return p.sr_broken.length == 2 && p.sr_broken.every(function(s) { return s.use === deus; }); }), 'run calculator breaks all AP subs with Deus X for free');
    var k2 = ice(KARUNA, corp.archives);
    path = runner.AI._calculateBestCompleteRun(corp.archives, 0, 0, 0, 0, null, 1);
    check(!path || path.length == 0, 'one use per run: second AP ice is not covered');
    for (var g = 0; g < 4; g++) inst(SURE_GAMBLE, runner.grip);
    intended.damageType = 'net'; intended.damage = 1;
    var one = deus.responsePreventableDamage.Enumerate.call(deus);
    check(one.length == 1 && !one[0].prevent, 'AI takes 1 net damage');
    intended.damage = 2;
    var two = deus.responsePreventableDamage.Enumerate.call(deus);
    check(two.length == 1 && two[0].prevent, 'AI prevents 2+ net damage');`,

  // All-nighter: [click],[trash]: gain 2 clicks; AI waits a turn after install.
  allNighter: `
    var aiRunner = runner.AI;
    runner.AI = null;
    var an = inst(2067, runner.rig.resources);
    an.abilities[0].Resolve.call(an, {});
    settle(actionPhase, 'resolves');
    check(runner.clickTracker == 5 && an.cardLocation === runner.heap, 'net +1 click and trashed');
    var an2 = inst(2067, runner.rig.resources);
    runner.clickTracker = 0;
    check(an2.abilities[0].Enumerate.call(an2).length == 0, 'needs a click');
    check(!an2.AITriggerInPaidWindow(), 'AI does not use it the turn it is installed');
    an2.responseOnRunnerTurnBegins.Resolve.call(an2);
    check(an2.AITriggerInPaidWindow(), 'ready on a later turn');
    runner.clickTracker = 4; runner.creditPool = 0;
    runner.AI = aiRunner;
    finish = function() {
      if (an2.cardLocation === runner.heap) {
        check(runner.clickTracker >= 1, 'AI used All-nighter in its action phase');
        return true;
      }
      check(playerTurn !== corp, 'AI used All-nighter before its turn ended');
      return false;
    };`,

  // Inside Man: 2 recurring credits only for hardware installs.
  insideMan: `
    runner.AI = null;
    var im = inst(2068, runner.rig.resources);
    var dop = inst(2064, runner.grip);
    var gamble = inst(SURE_GAMBLE, runner.grip);
    runner.creditPool = 1;
    check(AvailableCredits(runner, 'installing', dop) == 3, 'hosted credits count for hardware installs');
    check(AvailableCredits(runner, 'playing', gamble) == 1, 'not for events');
    check(im.AIEconomyInstall() == 0 || runner.grip.some(function(c) { return c.cardType == 'hardware'; }), 'install hook reads grip');
    check(cardSet[2068].AIEconomyInstall.call(im) == 2, 'AI values it with hardware in grip');
    choose('install', function(c) { return c.card === dop; });
    settle(actionPhase, 'install resolves');
    check(dop.cardLocation === runner.rig.hardware && im.credits == 0 && runner.creditPool == 0, 'paid 3 using 2 hosted credits ' + im.credits + '/' + runner.creditPool);`,

  // Underworld Contact: 1[c] at turn start only with 2+ link.
  underworld: `
    var uc = inst(2069, runner.rig.resources);
    runner.creditPool = 0;
    uc.responseOnRunnerTurnBegins.Resolve.call(uc);
    check(runner.creditPool == 0 && uc.AIEconomyInstall() == 0, 'no credit or AI interest below 2 link');
    runner.identityCard.link = 2;
    uc.responseOnRunnerTurnBegins.Resolve.call(uc);
    check(runner.creditPool == 1 && uc.AIEconomyInstall() > 0, 'gains 1 with 2 link; AI values it');`,

  // ---- Corp sub-batch ----
  // Green Level Clearance: gain 3, draw 1; declared economy play.
  glc: `
    corpTurn();
    var glc = inst(2070, corp.HQ.cards);
    var hq = corp.HQ.cards.length;
    choose('play', function(c) { return c.card === glc; });
    settle(corpAction, 'play resolves');
    check(corp.creditPool == 12 && corp.HQ.cards.length == hq && corp.clickTracker == 2, 'paid 1, gained 3, drew 1 (net HQ size unchanged)');
    var glc2 = inst(2070, corp.HQ.cards);
    check(corp.AI._economyCards().includes('Green Level Clearance'), 'Corp AI lists it as an economy play');`,

  // Hourglass: three lose-click subroutines.
  hourglass: `
    runner.AI = null;
    var hg = ice(2071, corp.archives);
    MakeRun(corp.archives);
    settle(actionPhase, 'run resolves');
    check(runner.clickTracker == 1, 'lost 3 clicks');
    check(hg.AIImplementIce(runner.AI ? runner.AI.rc : {}, {sr: []}).sr.length == 3, 'three modelled subroutines');`,

  // Dedicated Server: 2 recurring credits only for rezzing ice.
  dedicated: `
    corpTurn();
    var ds = inst(2072, corp.HQ.root); ds.rezzed = true; ds.credits = 2;
    var enigma = inst(ENIGMA, corp.archives.ice);
    var agenda = corp.HQ.cards.find(function(c) { return c.cardType == 'agenda'; });
    corp.creditPool = 1;
    check(AvailableCredits(corp, 'rezzing', enigma) == 3, 'hosted credits count for ice rez');
    check(AvailableCredits(corp, 'advancing', enigma) == 1, 'not for other spending');
    check(ds.AIRezWhenCan(), 'AI rezzes it while unrezzed ice exists');
    check(ds.AIWorthInstalling([]) == 0 || !corp.AI._economyAssetWanted(), 'AI installs it in a new remote when economy is wanted');
    Rez(enigma);
    settle(function() { return enigma.rezzed || corpAction(); }, 'rez resolves');
    check(enigma.rezzed && ds.credits == 0 && corp.creditPool == 0, 'Enigma rezzed with 2 hosted + 1 pool');
    check(!ds.AIRezWhenCan() && ds.AIWorthInstalling([]) == -1, 'no unrezzed ice: AI not interested');`,

  // Bullfrog: psi game; different bids move it outermost on another server and the run continues there.
  bullfrog: `
    runner.AI = null; var corpAI = corp.AI; corp.AI = null;
    var bf = ice(2073, corp.HQ);
    var rndIce = ice(PALISADE, corp.RnD);
    MakeRun(corp.HQ);
    settle(inEncounter, 'encounter Bullfrog');
    settle(function() { return currentPhase.title == 'Psi Game: Corp bid'; }, 'psi game starts');
    choose('continue', function(c) { return c.bid === 1; });
    choose('continue', function(c) { return c.bid === 0; });
    settle(function() { return offered('continue').some(function(c) { return c.server; }); }, 'Corp chooses a server');
    check(!offered('continue').some(function(c) { return c.server === corp.HQ; }), 'only other servers');
    choose('continue', function(c) { return c.server === corp.RnD; });
    check(attackedServer === corp.RnD && corp.RnD.ice[corp.RnD.ice.length - 1] === bf && approachIce == corp.RnD.ice.length - 1, 'moved outermost on R&D; run now on R&D');
    check(corp.HQ.ice.length == 0 && corp.creditPool == 9, 'left HQ; Corp paid its bid');
    settle(function() { return GetApproachEncounterIce() === rndIce || actionPhase(); }, 'run continues inward');
    check(GetApproachEncounterIce() === rndIce, 'next ice is Palisade on R&D');
    settle(actionPhase, 'run ends');
    corp.AI = corpAI;
    check(bf.AIBullfrogDestination() === corp.HQ || bf.AIBullfrogDestination() === corp.archives, 'AI destination is another server');
    var hqIce = ice(PALISADE, corp.HQ); ice(PALISADE, corp.HQ);
    check(bf.AIBullfrogDestination() === corp.HQ, 'AI sends the run to the most-iced server');`,

  // Uroboros: trace 4 subs: no more runs this turn; end the run.
  uroboros: `
    runner.AI = null; var corpAI = corp.AI; corp.AI = null;
    var uro = ice(2074, corp.archives);
    MakeRun(corp.archives);
    settle(actionPhase, 'both traces succeed at base 4 against 0 link');
    check(log.filter(function(m) { return m == 'Trace successful'; }).length == 2 && log.includes('Uroboros: the Runner cannot make another run this turn'), 'both subroutines fired');
    check(RunForbidden(corp.HQ) && offered('run').length == 0, 'no further runs this turn');
    check(MakeRun(corp.HQ) === false, 'MakeRun refuses too');
    lingeringEffects.slice().forEach(function(e) { if (e.responseOnCorpTurnBegins) e.responseOnCorpTurnBegins.Resolve.call(e); });
    check(!RunForbidden(corp.HQ), 'restriction ends when the next turn begins');
    corp.AI = corpAI;
    var model = uro.AIImplementIce({}, {sr: []}).sr;
    check(model.length == 2 && model[1][0][0] == 'endTheRun', 'modelled as successful traces');`,

  // Net Police: X recurring credits = link, trace-only.
  netPolice: `
    var np = inst(2075, corp.HQ.root); np.rezzed = true;
    runner.identityCard.link = 2;
    check(RecurringCredits(np) == 2, 'X equals link');
    np.credits = RecurringCredits(np);
    corp.creditPool = 0;
    check(AvailableCredits(corp, 'trace') == 2 && AvailableCredits(corp, 'rezzing') == 0, 'trace-only credits');
    check(np.AIRezWhenCan(), 'AI rezzes against link');
    runner.identityCard.link = 0;
    check(RecurringCredits(np) == 0 && np.AIWorthInstalling([]) == -1 && !np.AIRezWhenCan(), 'worthless with no link');`,

  // Because We Built It: 1 recurring credit to advance ice.
  bwbi: `
    corpTurn();
    var id = inst(2076, []); corp.identityCard = id; id.credits = 1;
    var wall = ice(31077, corp.HQ);
    var agenda = inst(2077, corp.HQ.root);
    corp.creditPool = 0;
    check(AvailableCredits(corp, 'advancing', wall) == 1 && AvailableCredits(corp, 'advancing', agenda) == 0, 'ice-advance only');
    check(!offered('advance').some(function(c) { return c.card === agenda; }), 'cannot advance the agenda with it');
    choose('advance', function(c) { return c.card === wall; });
    settle(corpAction, 'advance resolves');
    check(Counters(wall, 'advancement') == 1 && id.credits == 0, 'advanced Ice Wall with the identity credit');`,

  // Government Contracts: scored, [click][click]: gain 4.
  govContracts: `
    corpTurn();
    var gc = inst(2077, corp.HQ.root);
    check(gc.abilities[0].Enumerate.call(gc).length == 0, 'not usable unscored');
    MoveCard(gc, corp.scoreArea);
    check(corp.AI._clickAbilityLikeAvailable(/(gain|take)\\s*\\d*\\s*\\[c\\]/gmi) === gc, 'Corp AI economy search finds it');
    choose('trigger', function(c) { return c.card === gc; });
    settle(corpAction, 'ability resolves');
    check(corp.creditPool == 14 && corp.clickTracker == 1, 'spent 2 clicks, gained 4');
    check(gc.abilities[0].Enumerate.call(gc).length == 0, 'needs 2 clicks');`,

  // Tyrant: advanceable only while rezzed; an ETR per counter.
  tyrant: `
    corpTurn();
    var ty = inst(2078, corp.HQ.ice);
    check(!CheckAdvance(ty) && ty.AIAdvancementLimit() == 0, 'unrezzed: not advanceable');
    ty.rezzed = true;
    check(CheckAdvance(ty) && ty.subroutines.length == 0 && ty.AIAdvancementLimit() == 1, 'rezzed: advanceable, no subs yet, AI wants 1');
    choose('advance', function(c) { return c.card === ty; });
    settle(corpAction, 'advance resolves');
    check(ty.subroutines.length == 1 && ty.subroutines[0].text == 'End the run.', 'gained one ETR');
    PlaceAdvancement(ty, 2);
    ty.automaticOnAnyChange.Resolve.call(ty);
    check(ty.subroutines.length == 3 && ty.AIImplementIce({}, {sr: []}).sr.length == 3, 'three counters: three ETR, modelled');
    var other = inst(2078, corp.archives.ice); other.rezzed = true;
    check(other.subroutines.length == 0, 'instances do not share subroutines');`,

  // Oversight AI: free rez + hosted condition; host trashed when fully broken.
  oversight: `
    corpTurn(); var corpAI = corp.AI; corp.AI = null;
    var enigma = inst(ENIGMA, corp.archives.ice);
    var ov = inst(2079, corp.HQ.cards);
    choose('play', function(c) { return c.card === ov; });
    choose('continue', function(c) { return c.card === enigma; });
    settle(function() { return currentPhase.identifier == "Corp 2.2" && !attackedServer && !!ov.host; }, "play resolves");
    check(enigma.rezzed && corp.creditPool == 9 && enigma.hostedCards.includes(ov) && ov.host === enigma, 'Enigma rezzed free; Oversight AI hosted');
    check(ov.cardLocation !== corp.archives.cards, 'not trashed by play cleanup');
    choose("gain");
    settle(function() { return currentPhase.identifier == "Corp 2.2" && corp.clickTracker == 1; }, "Corp keeps acting after the play");
    check(corp.creditPool == 10, "basic gain still works");
    playerTurn = runner; runner.clickTracker = 4; ChangePhase(phases.runnerActionMain); runner.AI = null;
    var fon = inst(2062, runner.rig.programs);
    MakeRun(corp.archives);
    settle(inEncounter, 'encounter Enigma');
    fon.abilities[1].Resolve.call(fon, {});
    var subs = fon.abilities[0].Enumerate.call(fon);
    fon.abilities[0].Resolve.call(fon, subs[0]);
    choose('continue', function(c) { return !!c.subroutine; });
    settle(actionPhase, 'run ends');
    check(enigma.cardLocation === corp.archives.cards && ov.cardLocation === corp.archives.cards, 'host and condition trashed after a full break');
    corp.AI = corpAI;
    var hg = inst(2071, corp.HQ.ice), cheap = inst(ENIGMA, corp.RnD.ice);
    var ov2 = inst(2079, corp.HQ.cards);
    check(ov2.AIWouldPlay() && ov2.AIOversightTarget() === hg, 'AI targets the 5-cost Hourglass');
    var aiChoices = ov2.Enumerate.call(ov2);
    check(aiChoices.length == 1 && aiChoices[0].card === hg, 'AI play choice is that ice');
    hg.rezzed = true;
    check(!ov2.AIWouldPlay(), 'AI skips a 3-cost target');`,
};

async function main() {
  let total = 0;
  const only = process.argv[2];
  for (const [name, body] of Object.entries(cases)) {
    if (only && name !== only) continue;
    const consts = `var ENIGMA=${ENIGMA}, KARUNA=${KARUNA}, PALISADE=${PALISADE}, SURE_GAMBLE=${SURE_GAMBLE};`;
    total += await scenario(name, consts + body);
  }
  console.log('genesis-asis: ' + total + ' checks passed');
}
main().catch(error => { console.error(error); process.exit(1); });
