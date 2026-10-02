// Reproduction for ticket kit-matching-breaker-hook-always-returns-null.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const corp = {};
const runner = {cards: [], resolvingCards: [], AI: null};
const context = {
  console,
  corp,
  runner,
  cardSet: {},
  setIdentifiers: [],
  encountering: false,
  attackedServer: null,
  approachIce: -1,
  RunCalculator: function () {},
};
let servers = [];

context.GetServer = card => servers.find(server => server.ice.includes(card)) || null;
context.ActiveCards = player => player === runner
  ? runner.cards.concat(runner.identityCard ? [runner.identityCard] : [])
  : [];
context.CheckSubType = (card, subtype) => (card.subTypes || []).includes(subtype);
context.BreakerMatchesIce = (breaker, ice) =>
  (context.CheckSubType(breaker, 'Decoder') && context.CheckSubType(ice, 'Code Gate')) ||
  (context.CheckSubType(breaker, 'Fracter') && context.CheckSubType(ice, 'Barrier')) ||
  (context.CheckSubType(breaker, 'Killer') && context.CheckSubType(ice, 'Sentry'));

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8'), context, {filename: 'ai_runner.js'});
vm.runInContext(fs.readFileSync(path.join(root, 'sets', 'systemupdate2021.js'), 'utf8'), context,
  {filename: 'sets/systemupdate2021.js'});
vm.runInContext('runner.AI = new RunnerAI();', context);

const kit = Object.assign({}, context.cardSet[31026]);
const decoder = {title: 'Test Decoder', cardType: 'program', subTypes: ['Icebreaker', 'Decoder']};
const makeIce = (title, rezzed) => ({title, cardType: 'ice', rezzed, subTypes: ['Barrier']});

let tests = 0;
const verbose = !!process.env.VERBOSE;
function test(name, body) {
  kit.usedThisTurn = false;
  runner.identityCard = kit;
  runner.cards = [decoder];
  servers = [];
  try {
    body();
  } catch (error) {
    console.log('FAIL ' + name);
    throw error;
  }
  tests++;
  if (verbose) console.log('PASS ' + name);
}

test('outermost ice is treated as a code gate for breaker matching', () => {
  const inner = makeIce('Inner ice', true);
  const outer = makeIce('Outermost ice', true);
  servers = [{ice: [inner, outer], root: []}];
  assert.strictEqual(kit.AIMatchingBreakerInstalled(outer), decoder);
  assert.deepStrictEqual(outer.subTypes, ['Barrier'], 'temporary subtype must be restored');
});

test('first rezzed ice behind an unrezzed outer ice is matched', () => {
  const inner = makeIce('Inner rezzed ice', true);
  const outer = makeIce('Outer unrezzed ice', false);
  servers = [{ice: [inner, outer], root: []}];
  assert.strictEqual(kit.AIMatchingBreakerInstalled(inner), decoder);
  assert.deepStrictEqual(inner.subTypes, ['Barrier'], 'temporary subtype must be restored');
});

test('ice after an earlier rezzed encounter is not matched', () => {
  const inner = makeIce('Inner ice', true);
  const outer = makeIce('Outermost ice', true);
  servers = [{ice: [inner, outer], root: []}];
  assert.strictEqual(kit.AIMatchingBreakerInstalled(inner), null);
});

test('used ability does not create a match', () => {
  const outer = makeIce('Outermost ice', true);
  servers = [{ice: [outer], root: []}];
  kit.usedThisTurn = true;
  assert.strictEqual(kit.AIMatchingBreakerInstalled(outer), null);
});

test('Corp effective-subtype matching does not require a Runner AI', () => {
  const outer = makeIce('Outermost ice', true);
  servers = [{ice: [outer], root: []}];
  runner.AI = null;
  assert.strictEqual(
    kit.AIMatchingBreakerInstalled(outer, ['Barrier', 'Code Gate']),
    null,
  );
});

console.log('Kit matching-breaker hook: ' + tests + ' tests passed.');
