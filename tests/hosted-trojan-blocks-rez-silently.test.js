// Run with: node tests/hosted-trojan-blocks-rez-silently.test.js
// Guards for the hosted-card rez veto, from
// corp-silently-declines-rez-of-ice-hosting-a-trojan.md
// (documentation/bugs/).
// Its "should rez" reproduction is pending in
// tests/pending/hosted-ice-rez-ignores-repeated-tax.test.js.
//
// Guards the retained hosted-card rez policy after the candidate failed its gate.
// Further diagnostic and policy cases are in tests/corp-server-security.test.js.
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
        cards.concat(currentServer.root.filter(card => card.rezzed)),
      [],
    ),
  );
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => {
  if ((card.subTypes || []).includes(type)) return true;
  // Active subtype modifiers matter here: Chromatophores gives its host all
  // three ice subtypes, which can turn any matching breaker into a usable one.
  return runner.cards.some(activeCard => {
    if (!activeCard.modifySubTypes || typeof activeCard.modifySubTypes.Resolve !== 'function') return false;
    const modification = activeCard.modifySubTypes.Resolve.call(activeCard, card) || {};
    return (modification.add || []).includes(type);
  });
};
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
const etr = () => ice(['End the run.'], [[['endTheRun']]]);
let tests = 0;
const verbose = !!process.env.VERBOSE; // passing cases are silent by default to keep agent context small
function test(name, body) {
  runner.cards = []; runner.identityCard = null; runner.AI = null;
  runner.grip = [{}, {}, {}, {}, {}]; runner.stack = Array(40).fill({}); runner.heap = []; runner.creditPool = 0;
  runner.temporaryCredits = 0; runner.clickTracker = 0; context.playerTurn = runner; context.attackedServer = null;
  runner.resolvingCards = [];
  corp.creditPool = 20; corp.badPublicity = 0; corp.scoreArea = []; servers = [];
  corp.HQ.cards = []; corp.agendaPoints = 0; runner.tags = 0; runner.agendaPoints = 0;
  ai._serverBaitDecisions = new WeakMap(); ai._agendaBluffDecisions = new WeakMap();
  ai._cardDeceptionProfiles = new WeakMap(); ai._random = Math.random;
  ai._decisionRandomState = null;
  ai._protectionInstallsThisTurn = []; ai._serverProtectionDebt = new Map();
  ai._recentSuccessfulRunPressure = new WeakMap();
  ai._hasReachedCorpMainPhase = false;
  try { body(); } catch (error) { console.log('FAIL ' + name); throw error; }
  tests++; if (verbose) console.log('PASS ' + name);
}

// Shared board: a remote holding an agenda, guarded by one unrezzed ice
// (rez cost 3, matching the deck's Bumi 1.0 / Scatter Field cost) with
// Chromatophores hosted on it. No other unrezzed ice exists anywhere, so
// nothing else in the function could legitimately cause a reservation —
// isolating the hosted-card branch as the only possible reason to decline.
function buildBoard(hostedCard, options = {}) {
  const approachedIce = ice(['End the run.'], [[['endTheRun']]], {rezzed: false, rezCost: 3});
  approachedIce.hostedCards = [hostedCard];
  hostedCard.host = approachedIce;
  runner.cards.push(hostedCard);
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const hq = {serverName: 'HQ', cards: [], ice: [], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const remoteIce = options.innerIce ? [options.innerIce, approachedIce] : [approachedIce];
  const remote = {serverName: 'Remote 0', ice: remoteIce, root: [agenda]};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote]});
  servers = [hq, rnd, archives, remote];
  runner.clickTracker = 0;
  return {approachedIce, remote};
}

test('GUARD: a hosted card with AIHostedDoesNotPreventRez (Saci-style) does not block the rez', () => {
  const exemptHostedCard = Object.assign(card(35030), {AIHostedDoesNotPreventRez: true});
  const {approachedIce, remote} = buildBoard(exemptHostedCard);
  corp.creditPool = 12;
  assert.strictEqual(ai._iceWorthRezzing(approachedIce, 3, remote), true);
});

test('GUARD: a "super rich" Corp already rezzes despite a non-exempt hosted card', () => {
  const chromatophores = card(35030);
  const {approachedIce, remote} = buildBoard(chromatophores);
  corp.creditPool = 15; // 15 is not < rezCost(3) * 5 == 15, so the gate is not triggered
  assert.strictEqual(ai._iceWorthRezzing(approachedIce, 3, remote), true);
});

console.log(tests + ' hosted Trojan rez test(s) passed');
