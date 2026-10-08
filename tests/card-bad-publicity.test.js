const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const context = {
  cardSet: [], setIdentifiers: [],
  corp: {badPublicity: 0}, runner: {}, intended: {},
  Log() {}, UpdateCounters() {}, GetTitle: card => card.title,
  ChangeImageFileToJPG: name => name,
};
vm.createContext(context);
for (const file of ['config.js', 'mechanics.js', 'sets/vantagepoint.js', 'sets/downfall.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, {filename: file});
}
context.playerTurn = context.runner;
let prevent, respond, choose, removed;
context.OpportunityForAvoidPrevent = (player, hook, params, continuation) => {
  assert.strictEqual(player, context.corp);
  assert.strictEqual(hook, 'responsePreventableAddBadPublicity');
  prevent = continuation;
};
context.TriggeredResponsePhase = (player, hook, params, continuation) => {
  assert.strictEqual(hook, 'responseOnTakeBadPublicity');
  assert.deepStrictEqual(Array.from(params), [1]);
  respond = continuation;
};
context.RemoveFromGame = card => { removed = card; };
context.attackedServer = {ice: []};
context.ChoicesArrayCards = cards => cards.map(card => ({card}));
context.ServerName = () => 'HQ';
context.DecisionPhase = (player, choices, callback) => {
  choose = () => callback(choices.find(choice => choice.badPublicity));
};

for (const id of [36002, 36010, 26060]) {
  const card = context.cardSet[id];
  prevent = respond = choose = removed = null;
  const before = context.corp.badPublicity;
  if (id === 36002) {
    card.runningWithThis = card.subroutineResolvedThisRun = true;
    card.responseOnRunSuccessful.Resolve.call(card);
  } else if (id === 36010) {
    card.runningWithThis = card.runWasSuccessful = true;
    card.responseOnRunEnds.Resolve.call(card);
    choose();
  } else card.responseOnRez.Resolve.call(card);
  assert.strictEqual(typeof prevent, 'function', card.title + ' uses engine prevention');
  assert.strictEqual(context.corp.badPublicity, before);
  assert.strictEqual(removed, null);
  prevent();
  assert.strictEqual(context.corp.badPublicity, before + 1);
  assert.strictEqual(typeof respond, 'function', card.title + ' fires take responses');
  assert.strictEqual(removed, null, 'Kompromat waits for take responses');
  respond();
  if (id === 36010) {
    assert.strictEqual(removed, card);
    assert.strictEqual(card.runningWithThis, false);
  }
}
console.log('Card bad-publicity tests passed.');
