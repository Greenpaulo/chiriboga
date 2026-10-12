// Run with: node tests/sang-kancil-and-principia-priced-as-unbreakable.test.js
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
function test(name, body) {
  runner.cards = []; runner.resolvingCards = []; runner.creditPool = 30;
  context.runnerRC.runEvent = null;
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}
function board(id, strength, subtype, count = 1) {
  const breaker = card(id);
  runner.cards = [breaker];
  const wall = ice(Array(count).fill('End the run.'), Array.from({length: count}, () => [['endTheRun']]),
    {strength, subTypes: [subtype]});
  return {breaker, wall, target: server([wall])};
}
function breakPath(breaker, wall, target, budget) {
  const rc = context.runnerRC;
  rc.basePoolCredits = budget; rc.baseOtherCredits = 0; rc.baseClicks = 4;
  const iceAI = {ice: wall, strength: wall.strength, subTypes: wall.subTypes,
    sr: wall.subroutines.map(() => [['endTheRun']])};
  let frontier = [{iceIdx: 0, runner_credits_spent: 0, runner_credits_lost: 0,
    runner_clicks_spent: 0, virus_counters_spent: 0, card_str_mods: [],
    persistents: [], sr_broken: [], effects: []}];
  // Follow real calculator pump and break edges until every ETR is broken.
  for (let depth = 0; depth < 12 && frontier.length; depth++) {
    const complete = frontier.find(point => point.sr_broken.length === wall.subroutines.length);
    if (complete) return complete;
    frontier = frontier.flatMap(point => Array.from(rc.IceAct(breaker, iceAI, point, target)));
  }
  return null;
}
for (const [id, subtype, pumpCost] of [[35020, 'Code Gate', 3], [35032, 'Barrier', 2]]) {
  for (const strength of [1, 4]) test(id + ' Corp strength ' + strength, () => {
    const {breaker, wall, target} = board(id, strength, subtype);
    const security = ai._evaluateServerSecurity(target);
    assert.strictEqual(security.isSecure, false);
    if (strength === 1) assert.ok(security.totalMandatoryBreakCost >= 1 && security.totalMandatoryBreakCost <= 2);
    else assert.strictEqual(security.totalMandatoryBreakCost, pumpCost + 1);
  });
  test(id + ' Runner strength 4 break path', () => {
    const {breaker, wall, target} = board(id, 4, subtype);
    const point = breakPath(breaker, wall, target, pumpCost + 1);
    assert.ok(point, 'must find a pump then break path');
    assert.strictEqual(point.runner_credits_spent, pumpCost + 1);
  });
  test(id + ' Runner insufficient credits', () => {
    const {breaker, wall, target} = board(id, 4, subtype);
    assert.strictEqual(breakPath(breaker, wall, target, pumpCost), null);
  });
  test(id + ' wrong subtype', () => {
    const {breaker, wall, target} = board(id, 4, subtype === 'Barrier' ? 'Code Gate' : 'Barrier');
    assert.strictEqual(breakPath(breaker, wall, target, 30), null);
  });
  test(id + ' multiple pumps and subroutines', () => {
    const {breaker, wall, target} = board(id, 7, subtype, 2);
    const cost = 3 * pumpCost + 2;
    assert.strictEqual(ai._evaluateServerSecurity(target).totalMandatoryBreakCost, cost);
    const point = breakPath(breaker, wall, target, cost);
    assert.ok(point);
    assert.strictEqual(point.runner_credits_spent, cost);
  });
}
for (const active of [false, true]) test('Sang Kancil resolving event Run=' + active, () => {
  const {breaker, wall, target} = board(35020, 4, 'Code Gate');
  runner.resolvingCards = [{cardType: 'event', subTypes: active ? ['Run'] : []}];
  const cost = active ? 2 : 4;
  assert.strictEqual(ai._evaluateServerSecurity(target).totalMandatoryBreakCost, cost);
  const point = breakPath(breaker, wall, target, cost);
  assert.ok(point);
  assert.strictEqual(point.runner_credits_spent, cost);
});
test('Sang Kancil prospective Run event', () => {
  const {breaker, wall, target} = board(35020, 4, 'Code Gate');
  context.runnerRC.runEvent = {cardType: 'event', subTypes: ['Run']};
  const point = breakPath(breaker, wall, target, 2);
  assert.ok(point, 'planned Run event must receive the same pump discount');
  assert.strictEqual(point.runner_credits_spent, 2);
  // The Corp uses its own calculator and sees only the public active event.
  assert.strictEqual(ai._evaluateServerSecurity(target).totalMandatoryBreakCost, 4);
});
console.log(passed + ' passed, ' + failed + ' failed breaker pricing cases.');
if (failed) process.exitCode = 1;
