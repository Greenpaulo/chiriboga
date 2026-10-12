// Run with: node tests/L9.1-breaker-pricing.test.js
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
context.CheckTrash = () => true;
context.CheckInstalled = card => !!context.GetServer(card) || runner.cards.includes(card);
let passed = 0;
let failed = 0;
function test(name, body) {
  runner.cards = []; runner.creditPool = 30; runner.clickTracker = 4;
  runner.grip = [{}, {}, {}, {}, {}]; runner.stack = Array(40).fill({}); runner.heap = [];
  corp.creditPool = 30; corp.scoreArea = [];
  context.playerTurn = runner; context.attackedServer = null;
  context.approachIce = -1; context.encountering = false;
  const globalETR = ai._globalETRUses;
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.stack); }
  finally { ai._globalETRUses = globalETR; }
}
const fracter = extra => Object.assign({title: 'Pricing fracter', player: runner,
  cardType: 'program', subTypes: ['Icebreaker', 'Fracter'], strength: 1}, extra);
function unknown(result, title = 'Pricing fracter') {
  assert.ok(result.unpricedBreakers.includes(title));
  assert.ok(result.reasons.includes('unpriced breaker ' + title));
  assert.ok(result.honestReasons.includes('unpriced breaker ' + title));
  assert.strictEqual(result.totalMandatoryBreakCost, null);
  assert.strictEqual(result.honestMandatoryBreakCost, null);
  assert.strictEqual(result.totalBreakCost, null);
  assert.strictEqual(result.honestBreakCost, null);
}
function reachable(result) {
  assert.strictEqual(result.hasHardLockout, false);
  assert.strictEqual(result.honestLockout, false);
  assert.strictEqual(result.isSecure, false);
  assert.strictEqual(result.honestIsSecure, false);
}
for (const strength of [1, 3, 8]) test('missing pricing at strength ' + strength, () => {
  runner.cards = [fracter({strength})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
test('a pump pattern without break price is still unknown', () => {
  runner.cards = [fracter({cardText: '1 credit: +1 strength.'})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
test('optional punishment unknown is not a mandatory cost', () => {
  runner.cards = [fracter()];
  const result = ai._evaluateServerSecurity(server([ice(['Give the Runner 1 tag.'], [[['tag']]])]));
  assert.strictEqual(result.totalMandatoryBreakCost, 0);
  assert.strictEqual(result.honestMandatoryBreakCost, 0);
  assert.strictEqual(result.totalBreakCost, null);
  assert.strictEqual(result.honestBreakCost, null);
  assert.ok(result.honestReasons.includes('unpriced breaker Pricing fracter'));
  assert.strictEqual(result.isSecure, false);
});
test('declarative price precedes standard probe and is affordable exactly', () => {
  const breaker = fracter({AIBreakCost: (wall, count) => ({credits: count * 5, clicks: 0}),
    AIImplementBreaker: () => { throw Error('the standard probe must not run'); }});
  runner.cards = [breaker]; runner.creditPool = 5; runner.clickTracker = 1;
  const target = server([etr()]);
  let result = ai._evaluateServerSecurity(target);
  reachable(result);
  assert.deepStrictEqual(Array.from(result.unpricedBreakers), []);
  assert.strictEqual(result.totalMandatoryBreakCost, 5);
  assert.strictEqual(result.honestMandatoryBreakCost, 5);
  runner.creditPool = 4;
  result = ai._evaluateServerSecurity(target);
  assert.strictEqual(result.isSecure, true);
  assert.strictEqual(result.honestIsSecure, true);
  assert.ok(result.reasons.includes('priced breaker route exceeds available credits, clicks or counters'));
});
for (const declared of [null, {}, {credits: -1, clicks: 0}, {credits: Infinity, clicks: 0},
  {credits: 0, clicks: NaN}, {credits: 0, clicks: 0, counters: []},
  {credits: 0, clicks: 0, counters: {power: -1}}]) test('invalid price ' + JSON.stringify(declared), () => {
  runner.cards = [fracter({AIBreakCost: () => declared})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
for (const hook of ['AIBreakCost', 'AIImplementBreaker']) test('throwing ' + hook + ' restores public state', () => {
  const breaker = fracter({power: 3});
  breaker[hook] = function () {
    runner.creditPool = 0; runner.clickTracker = 0; this.power = 0;
    this.accidentalProbeField = true;
    context.attackedServer = null; context.approachIce = 42; context.encountering = true;
    throw Error('failed pricing');
  };
  runner.cards = [breaker];
  const target = server([etr()]);
  const before = [runner.creditPool, runner.clickTracker, breaker.power,
    context.attackedServer, context.approachIce, context.encountering];
  const result = ai._evaluateServerSecurity(target);
  unknown(result); reachable(result);
  assert.deepStrictEqual([runner.creditPool, runner.clickTracker, breaker.power,
    context.attackedServer, context.approachIce, context.encountering], before);
  assert.strictEqual('accidentalProbeField' in breaker, false);
});
test('malformed standard activation is unknown', () => {
  runner.cards = [fracter({AIImplementBreaker: (rc, result, point, target, strength, wall, iceStrength) =>
    rc.ImplementIcebreaker(point, null, strength, wall, iceStrength, ['Barrier'], NaN, 1, 1, 1)})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
test('explicit fixed strength remains a proved lockout', () => {
  runner.cards = [fracter({AIFixedStrength: true, cardText: '1 credit: Break 1 barrier subroutine.'})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  assert.strictEqual(result.hasHardLockout, true);
  assert.strictEqual(result.honestLockout, true);
  assert.deepStrictEqual(Array.from(result.unpricedBreakers), []);
  assert.ok(result.reasons.includes('Regression ice has mandatory breaks with no capable breaker'));
});
test('real fixed-strength Mimic cannot break stronger Sentry', () => {
  runner.cards = [card(31008)];
  const result = ai._evaluateServerSecurity(server([ice(['End the run.'], [[['endTheRun']]],
    {strength: 8, subTypes: ['Sentry']})]));
  assert.strictEqual(result.hasHardLockout, true);
  assert.deepStrictEqual(Array.from(result.unpricedBreakers), []);
});
test('missing breaker retains both previous lockout reasons', () => {
  runner.grip = [];
  const result = ai._evaluateServerSecurity(server([etr()]));
  assert.strictEqual(result.hasHardLockout, true);
  assert.strictEqual(result.honestLockout, true);
  assert.deepStrictEqual(Array.from(result.unpricedBreakers), []);
  assert.ok(result.reasons.includes('Regression ice has mandatory breaks with no capable breaker'));
  assert.ok(result.honestReasons.includes('Regression ice has no matching breaker installed yet'));
});
test('priced alternative does not hide an unknown matching breaker', () => {
  runner.cards = [fracter({title: 'Priced fracter', AIBreakCost: () => ({credits: 100, clicks: 0})}), fracter()];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
test('an independent priced layer still establishes security', () => {
  runner.cards = [fracter(), {title: 'Priced killer', player: runner, cardType: 'program',
    subTypes: ['Icebreaker', 'Killer'], AIBreakCost: () => ({credits: 100, clicks: 0})}];
  const sentry = ice(['End the run.'], [[['endTheRun']]], {subTypes: ['Sentry']});
  const result = ai._evaluateServerSecurity(server([etr(), sentry]));
  unknown(result);
  assert.strictEqual(result.isSecure, true); assert.strictEqual(result.honestIsSecure, true);
  assert.strictEqual(result.hasHardLockout, false); assert.strictEqual(result.honestLockout, false);
  assert.strictEqual(result.knownMandatoryBreakCost, 100);
});
test('an independent layer without a matching breaker retains hard lockout', () => {
  runner.cards = [fracter()]; runner.grip = [];
  const sentry = ice(['End the run.'], [[['endTheRun']]], {subTypes: ['Sentry']});
  const result = ai._evaluateServerSecurity(server([etr(), sentry]));
  unknown(result);
  assert.strictEqual(result.hasHardLockout, true); assert.strictEqual(result.honestLockout, true);
});
test('clicks used for breaking cannot also generate credits', () => {
  context.playerTurn = corp; runner.creditPool = 0;
  runner.cards = [fracter({AIBreakCost: () => ({credits: 2, clicks: 2})})];
  const result = ai._evaluateServerSecurity(server([etr()]));
  assert.strictEqual(result.isSecure, true); assert.strictEqual(result.honestIsSecure, true);
});
test('counter prices share the public stock across layers', () => {
  const breaker = fracter({power: 1, AIBreakCost: (wall, count) => ({credits: count, clicks: 0, counters: {power: count}})});
  runner.cards = [breaker];
  const target = server([etr(), etr()]);
  let result = ai._evaluateServerSecurity(target);
  assert.strictEqual(result.isSecure, true); assert.strictEqual(result.honestIsSecure, true);
  assert.strictEqual(breaker.power, 1);
  breaker.power = 2;
  result = ai._evaluateServerSecurity(target);
  reachable(result); assert.strictEqual(result.honestMandatoryBreakCost, 2);
  assert.strictEqual(breaker.power, 2);
});
const nativeWall = () => ice(['End the run.', 'End the run.'], [[['endTheRun']], [['endTheRun']]],
  {AIBreakCost: (wall, count) => ({credits: 0, clicks: count})});
test('honest route chooses a cheaper native break', () => {
  runner.cards = [fracter({AIBreakCost: (wall, count) => ({credits: count * 5, clicks: 0})})];
  const result = ai._evaluateServerSecurity(server([nativeWall()]));
  assert.strictEqual(result.honestMandatoryBreakCost, 2);
  assert.strictEqual(result.honestBreakCost, 2);
  assert.ok(result.honestReasons.includes('Regression ice can be broken by spending clicks'));
});
test('honest route chooses cheaper breaker over native', () => {
  runner.cards = [fracter({AIBreakCost: () => ({credits: 1, clicks: 0})})];
  const result = ai._evaluateServerSecurity(server([nativeWall()]));
  assert.strictEqual(result.honestMandatoryBreakCost, 1);
});
test('mixed route breaks each subroutine once with one available click', () => {
  runner.creditPool = 4; runner.clickTracker = 2;
  runner.cards = [fracter({AIBreakCost: (wall, count) => ({credits: count == 2 ? 10 : 4, clicks: 0})})];
  const result = ai._evaluateServerSecurity(server([nativeWall()]));
  assert.strictEqual(result.isSecure, true);
  assert.strictEqual(result.honestIsSecure, false);
  assert.strictEqual(result.honestMandatoryBreakCost, 5);
  assert.strictEqual(result.honestBreakCost, 5);
});
test('a known native upper bound does not erase unknown pricing', () => {
  runner.cards = [fracter()];
  const result = ai._evaluateServerSecurity(server([nativeWall()]));
  unknown(result); reachable(result);
});
test('mixed routes share counter budgets across ICE', () => {
  runner.clickTracker = 3;
  runner.cards = [fracter({power: 2, AIBreakCost: (wall, count) => ({credits: count, clicks: 0, counters: {power: count}})})];
  const result = ai._evaluateServerSecurity(server([nativeWall(), nativeWall()]));
  assert.strictEqual(result.isSecure, true);
  assert.strictEqual(result.honestIsSecure, false);
  assert.strictEqual(result.honestMandatoryBreakCost, 4);
});
test('reruns share the same breaker counter budget', () => {
  ai._globalETRUses = () => 1;
  const breaker = fracter({power: 1, AIBreakCost: () => ({credits: 1, clicks: 0, counters: {power: 1}})});
  runner.cards = [breaker];
  const result = ai._evaluateServerSecurity(server([etr()]));
  assert.strictEqual(result.isSecure, true); assert.strictEqual(result.honestIsSecure, true);
});
test('restricted credit path cannot restore the false lockout', () => {
  runner.cards = [fracter(), {title: 'Restricted credit source', player: runner,
    AIRunRestrictedCredits: () => 4}];
  const result = ai._evaluateServerSecurity(server([etr()]));
  unknown(result); reachable(result);
});
test('hidden identities cannot change the corrected evaluation', () => {
  runner.cards = [fracter()];
  const target = server([etr()]);
  const hidden = () => new Proxy({}, {get() { throw Error('hidden identity read'); }});
  runner.grip = Array.from({length: 5}, hidden); runner.stack = Array.from({length: 40}, hidden);
  const before = ai._evaluateServerSecurity(target);
  runner.grip = Array(5).fill(card(31008)); runner.stack = Array(40).fill(card(31008));
  const after = ai._evaluateServerSecurity(target);
  assert.strictEqual(JSON.stringify(after), JSON.stringify(before));
});
test('known partial native route cannot fabricate a partial breaker price', () => {
  runner.cards = [fracter({AIBreakCost: (wall, count) => count == 2 ? {credits: 10, clicks: 0} : null})];
  const result = ai._evaluateServerSecurity(server([nativeWall()]));
  assert.strictEqual(result.totalMandatoryBreakCost, 10);
  assert.strictEqual(result.honestMandatoryBreakCost, null);
  assert.ok(result.unpricedBreakers.includes('Pricing fracter'));
});
test('many native routes retain exact feasible choices', () => {
  const layers = Array.from({length: 20}, () => ({options: [
    {credits: 2, clicks: 0}, {credits: 1, clicks: 1}, {credits: 0, clicks: 2}]}));
  const result = ai._honestRouteVerdict(layers, 30, 10, 0);
  assert.ok(result.feasible);
  assert.strictEqual(result.feasible.total, 40);
});
test('resource prices keep a public restricted credit upper bound', () => {
  runner.creditPool = 0; runner.clickTracker = 1;
  runner.cards = [fracter({AIBreakCost: () => ({credits: 4, clicks: 0})}),
    {title: 'Restricted credits', player: runner, AIRunRestrictedCredits: () => 4}];
  const result = ai._evaluateServerSecurity(server([etr()]));
  reachable(result);
  assert.strictEqual(result.restrictedCreditUpperBound, 4);
});
test('Event Horizon native payment does not erase breaker counter costs', () => {
  runner.creditPool = 1; runner.clickTracker = 1;
  runner.cards = [{title: 'Counter killer', player: runner, cardType: 'program',
    subTypes: ['Icebreaker', 'Killer'], power: 0,
    AIBreakCost: () => ({credits: 1, clicks: 0, counters: {power: 1}})}];
  const horizon = card(36058); horizon.rezzed = true;
  const result = ai._evaluateServerSecurity(server([horizon]));
  assert.strictEqual(result.isSecure, true);
  assert.strictEqual(result.honestIsSecure, true);
  assert.strictEqual(result.totalMandatoryBreakCost, 3);
});
test('forbidden breaker type cannot become an unknown escape', () => {
  runner.cards = [{title: 'Unknown killer', player: runner, cardType: 'program', subTypes: ['Icebreaker', 'Killer']}];
  runner.grip = [];
  const restrictedIce = ice(['End the run.'], [[['endTheRun']]], {subTypes: ['Sentry'], canOnlyBreakUsingFracter: true});
  const result = ai._evaluateServerSecurity(server([restrictedIce]));
  assert.strictEqual(result.hasHardLockout, true);
  assert.deepStrictEqual(Array.from(result.unpricedBreakers), []);
});
test('optional counter break costs do not invent a feasible avoidance route', () => {
  runner.cards = [fracter({power: 0, AIBreakCost: (wall, count) =>
    ({credits: count, clicks: 0, counters: {power: count}})})];
  const result = ai._evaluateServerSecurity(server([ice(['Give the Runner 1 tag.'], [[['tag']]])]));
  reachable(result);
  assert.strictEqual(result.totalMandatoryBreakCost, 0);
  assert.strictEqual(result.totalBreakCost, Infinity);
  assert.strictEqual(result.honestBreakCost, Infinity);
});
console.log('L9.1 breaker pricing: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
