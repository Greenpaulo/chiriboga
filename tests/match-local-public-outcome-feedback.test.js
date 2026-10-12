// Run with: node tests/pending/match-local-public-outcome-feedback.test.js
// L8.5 feature reproduction: real CorpAI, public event record and game reset.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const context = {console};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
const ai = vm.runInContext('new CorpAI()', context);
let passed = 0, failed = 0;
function test(name, body) {
  try { body(); passed++; if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failed++; console.error('FAIL ' + name + ': ' + error.message); }
}

test('two-turn public record keeps actions and amounts without facedown identities', () => {
  assert.strictEqual(typeof ai._recordPublicPostureEvent, 'function', 'public outcome recorder is missing');
  const server = {root: [], ice: []};
  const rootCard = {}, ice = {};
  for (const card of [rootCard, ice]) {
    for (const field of ['title', 'cardType', 'agendaPoints', 'imageFile']) {
      Object.defineProperty(card, field, {get() { throw new Error('hidden identity read: ' + field); }});
    }
  }
  const sequence = [
    [1, 'rootInstalled', rootCard, 1],
    [1, 'iceInstalled', ice, 1],
    [1, 'iceRezzed', ice, 1],
    [1, 'advancementPlaced', rootCard, 2],
    [2, 'advancementPlaced', rootCard, 1],
    [2, 'runInitiated', null, 1],
    [2, 'iceEncountered', ice, 1],
    [2, 'access', rootCard, 1],
  ];
  for (const [turn, action, card, amount] of sequence) {
    ai._postureEpoch = turn;
    ai._recordPublicPostureEvent(action, server, card, amount);
  }
  const record = JSON.parse(JSON.stringify(ai._publicPostureHistory));
  assert.deepStrictEqual(record.map(e => [e.turn, e.action, e.amount]),
    sequence.map(([turn, action, , amount]) => [turn, action, amount]));
  assert(record.every(e => e.serverId === record[0].serverId), 'one stable server id across turns');
  assert(record[0].cardId === record[3].cardId && record[0].cardId === record[7].cardId,
    'one opaque root id across events');
  assert(record[1].cardId === record[2].cardId && record[1].cardId === record[6].cardId,
    'one opaque ICE id across events');
  assert(!JSON.stringify(record).match(/title|cardType|agendaPoints|imageFile/),
    'record must not contain card identities');
});

test('a new CorpAI starts with an empty public history', () => {
  const fresh = vm.runInContext('new CorpAI()', context);
  assert(Array.isArray(fresh._publicPostureHistory), 'match-local public history is missing');
  assert.strictEqual(fresh._publicPostureHistory.length, 0);
});

console.log(passed + ' passed, ' + failed + ' failed');
if (failed) process.exitCode = 1;
