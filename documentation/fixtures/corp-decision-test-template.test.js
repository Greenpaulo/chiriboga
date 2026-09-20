// Run with: node tests/corp-server-security.test.js
// Real AI classes/card definitions, with deterministic public-board engine helpers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const corp = {creditPool: 20, badPublicity: 0, scoreArea: [], HQ: {cards: []}, archives: {cards: []}};
const runner = {creditPool: 0, temporaryCredits: 0, clickTracker: 0, grip: [], stack: [], heap: [], cards: [], resolvingCards: [], AI: null};
const context = {console, corp, runner, playerTurn: runner, cardSet: {}, setIdentifiers: [], encountering: false, attackedServer: null, approachIce: -1};
let servers = [];
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.Strength = card => card.strength || 0;
context.Credits = player => player.creditPool;
context.AvailableCredits = context.Credits;
context.RezCost = card => card.rezCost || 0;
context.CheckCredits = (player, cost) => player.creditPool >= cost;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed && card.rezCost !== undefined;
context.AllottedClicks = player => player === runner ? 4 : 3;
context.InstalledCards = player => player === runner ? runner.cards : servers.reduce((cards, server) => cards.concat(server.ice, server.root), []);
context.ActiveCards = player => {
  const runnerCards = runner.cards.concat(runner.identityCard ? [runner.identityCard] : []);
  const corpCards = corp.scoreArea;
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckAdvance = card => card.canBeAdvanced || card.cardType === 'agenda';
context.AgendaPoints = player => player.agendaPoints || 0;
context.AgendaPointsToWin = () => 7;
context.ChoicesInstalledCards = (player, predicate) => context.InstalledCards(player).filter(predicate).map(card => ({card}));
context.BreakerMatchesIce = (breaker, ice) => (
  [['Fracter', 'Barrier'], ['Decoder', 'Code Gate'], ['Killer', 'Sentry']].some(types =>
    context.CheckSubType(breaker, types[0]) && context.CheckSubType(ice, types[1]))
);
context.PlayerCanLook = (player, card) => player === corp || !!card.rezzed;
context.GetServer = card => servers.find(server => server.ice.includes(card));
context.ServerName = () => 'Regression server';
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js'].forEach(file =>
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
let tests = 0;
function test(name, body) {
  runner.cards = []; runner.identityCard = null; runner.AI = null;
  runner.grip = [{}, {}, {}, {}, {}]; runner.stack = Array(40).fill({}); runner.heap = []; runner.creditPool = 0;
  runner.temporaryCredits = 0; runner.clickTracker = 0; context.playerTurn = runner; context.attackedServer = null;
  runner.resolvingCards = [];
  corp.creditPool = 20; corp.badPublicity = 0; corp.scoreArea = []; servers = [];
  corp.HQ.cards = []; corp.agendaPoints = 0; runner.tags = 0; runner.agendaPoints = 0;
  ai._serverBaitDecisions = new WeakMap(); ai._agendaBluffDecisions = new WeakMap();
  ai._cardDeceptionProfiles = new WeakMap(); ai._random = Math.random;
  body(); tests++; console.log('PASS ' + name);
}

test('DEMO: opening hand with 1 ICE, 2 economy ops and an agenda is kept', () => {
  corp.creditPool = 5;
  const iceA = ice(['End the run.'], [[['endTheRun']]], {cardType: 'ice', title: 'Ice A', rezCost: 2, rezzed: false});
  const op = () => ({cardType: 'operation', player: corp, title: 'Some operation'});
  const agenda = {cardType: 'agenda', player: corp, agendaPoints: 2, title: 'Some agenda'};
  corp.HQ.cards = [iceA, op(), op(), op(), agenda];
  const optionList = ['m', 'n'];            // what the engine offers: mulligan / keep
  const choice = ai.Phase_Mulligan(optionList);
  assert.strictEqual(optionList[choice], 'n', 'expected keep but AI chose ' + optionList[choice]);
});
console.log(tests + ' demo cases passed.');
