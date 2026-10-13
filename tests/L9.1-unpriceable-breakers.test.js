// Run with: node tests/L9.1-unpriceable-breakers.test.js
// Real AI classes/card definitions, with deterministic public-board engine helpers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const corp = {creditPool: 20, badPublicity: 0, scoreArea: [], HQ: {cards: []}, archives: {cards: []}};
const runner = {creditPool: 0, temporaryCredits: 0, clickTracker: 0, grip: [], stack: [], heap: [], cards: [], resolvingCards: [], AI: null};
const context = {console, corp, runner, playerTurn: runner, cardSet: {}, setIdentifiers: [], encountering: false, attackedServer: null, approachIce: -1};
let servers = [];
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.ChoicesActiveTriggers = () => [];
context.CheckCounters = (card, type, amount) => context.Counters(card, type) >= amount;
context.Strength = card => card.strength || 0;
context.Credits = player => player.creditPool;
context.AvailableCredits = context.Credits;
context.RezCost = card => card.rezCost || 0;
context.CheckCredits = (player, cost) => player.creditPool >= cost;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed && card.rezCost !== undefined;
context.CheckRunning = () => context.attackedServer !== null;
context.AllottedClicks = player => player === runner ? 4 : 3;
context.InstalledCards = player => player === runner ? runner.cards : servers.reduce((cards, server) => cards.concat(server.ice, server.root), []);
context.ActiveCards = player => {
  const runnerCards = runner.cards.concat(runner.identityCard ? [runner.identityCard] : []);
  const corpCards = corp.scoreArea.concat(
    servers.reduce(
      (cards, currentServer) =>
        cards.concat(currentServer.root.concat(currentServer.ice).filter(card => card.rezzed)),
      [],
    ),
  );
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckInstallDestination = (card, destination) =>
  typeof card.installOnlyIn !== 'function' || card.installOnlyIn(destination);
context.CheckAdvance = card => card.canBeAdvanced || card.cardType === 'agenda';
context.CheckScore = (card, ignoreRequirement) => !runner.cards.some(active =>
  !active.disabled && (active.agendasInstalledThisTurn || []).includes(card));
context.AgendaPoints = player => player.agendaPoints || 0;
context.AgendaPointsToWin = () => 7;
context.MaxHandSize = () => 5;
context.ChoicesInstalledCards = (player, predicate) => context.InstalledCards(player).filter(predicate).map(card => ({card}));
context.BreakerMatchesIce = (breaker, ice) => (
  [['Fracter', 'Barrier'], ['Decoder', 'Code Gate'], ['Killer', 'Sentry']].some(types =>
    context.CheckSubType(breaker, types[0]) && context.CheckSubType(ice, types[1]))
);
context.PlayerCanLook = (player, card) => player === corp || !!card.rezzed;
context.GetServer = card => servers.find(server => server.ice.includes(card) || server.root.includes(card));
context.ServerName = server => server.serverName || 'Regression server';
vm.createContext(context);
// Use the engine's actual combinations helper for RunCalculator.SrBreak.
const utilitySource = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
vm.runInContext(utilitySource.slice(utilitySource.indexOf('const k_combinations ='),
  utilitySource.indexOf('const combinations =')), context);

const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {}; runnerRC = new RunCalculator();', context);
const ai = context.reviewAI;
const card = id => Object.assign({}, context.cardSet[id]);
const ice = (texts, effects, extra) => Object.assign({title: 'Regression ice', player: corp,
  rezzed: true, rezCost: 1, strength: 3, subTypes: ['Barrier'],
  subroutines: texts.map(text => ({text})),
  AIImplementIce: effects ? function(rc, result) {result.sr = effects; return result;} : undefined,
}, extra);
const server = cards => {const result = {ice: cards, root: []}; servers = [result]; return result;};
const etr = () => ice(['End the run.'], [[['endTheRun']]]);
let passed = 0;
let failed = 0;
for (const brokenHook of [false, true]) {
  const breaker = {title: 'Unpriced regression fracter', player: runner,
    cardType: 'program', subTypes: ['Icebreaker', 'Fracter'], strength: 1};
  if (brokenHook) breaker.AIImplementBreaker = function () { return []; };
  runner.cards = [breaker]; runner.creditPool = 30;
  const target = server([etr()]);
  try {
    const result = ai._evaluateServerSecurity(target);
    assert.strictEqual(result.hasHardLockout, false, 'unknown breaker price must not prove hard lockout');
    assert.strictEqual(result.isSecure, false);
    assert.strictEqual(result.honestLockout, false);
    assert.strictEqual(result.honestIsSecure, false);
    assert.ok(result.unpricedBreakers.includes(breaker.title));
    assert.ok(result.reasons.some(reason => reason.includes('unpriced breaker ' + breaker.title)));
    assert.ok(result.honestReasons.some(reason => reason.includes('unpriced breaker ' + breaker.title)));
    for (const field of ['totalMandatoryBreakCost', 'totalBreakCost',
      'honestMandatoryBreakCost', 'honestBreakCost'])
      assert.strictEqual(result[field], null, field + ' must explicitly report unknown');
    passed++;
  } catch (error) {
    failed++;
    console.error('FAIL ' + (brokenHook ? 'non-pricing hook' : 'missing hook') + ': ' + error.message);
  }
}
console.log('L9.1 unpriceable breakers: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
