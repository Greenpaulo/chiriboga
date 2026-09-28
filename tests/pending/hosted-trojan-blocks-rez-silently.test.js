// Run with: node tests/pending/hosted-trojan-blocks-rez-silently.test.js
// Drafted by a read-only agent from documentation/debug-logs/bug_raised/
// corp_didnt_rez_ice_when_would_have_forced_runner_to_spend_creds.txt — not yet run.
// See documentation/bugs/corp-silently-declines-rez-of-ice-hosting-a-trojan.md
//
// Reproduces: _iceWorthRezzing() silently returns false (no logged reason)
// for unrezzed ice hosting a non-exempt Runner Trojan (here, Chromatophores,
// id 35030) whenever Credits(corp) < currentRezCost * 5, even when nothing
// else on the board would otherwise justify withholding the rez.
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
function buildBoard(hostedCard) {
  const approachedIce = ice(['End the run.'], [[['endTheRun']]], {rezzed: false, rezCost: 3});
  approachedIce.hostedCards = [hostedCard];
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const hq = {serverName: 'HQ', cards: [], ice: [], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const remote = {serverName: 'Remote 0', ice: [approachedIce], root: [agenda]};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote]});
  servers = [hq, rnd, archives, remote];
  runner.clickTracker = 0;
  return {approachedIce, remote};
}

test('BUG: undefended remote with affordable ice hosting Chromatophores is not rezzed, and no reason is logged', () => {
  const chromatophores = card(35030);
  assert.strictEqual(typeof chromatophores.AIHostedDoesNotPreventRez, 'undefined',
    'test assumption: Chromatophores has no AIHostedDoesNotPreventRez exception');
  const {approachedIce, remote} = buildBoard(chromatophores);
  corp.creditPool = 12; // 12 < rezCost(3) * 5 == 15, so the "super rich" gate is not met

  const messages = [];
  const oldLog = ai._log;
  ai._log = message => messages.push(message);
  let result;
  try {
    result = ai._iceWorthRezzing(approachedIce, 3, remote);
  } finally {
    ai._log = oldLog;
  }

  // This is the reported bug: the Corp can afford the ice, nothing else on
  // the board competes for the credits, and the server is not empty — yet
  // the ice is not rezzed, and nothing explains why.
  assert.strictEqual(result, true,
    'expected the Corp to rez affordable, undefended-server ice; ' +
    'got false from the silent hostedCards guard');
  assert.strictEqual(messages.length, 0,
    'expected some logged reason for declining the rez; the hostedCards ' +
    'branch currently declines silently');
});

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

console.log(tests + ' pending test(s) run (see file header: not yet confirmed against a live run)');