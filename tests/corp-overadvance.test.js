'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const corp = {clickTracker: 0, HQ: {cards: []}, scoreArea: []};
const scoreServer = {root: []};
const context = {
  console,
  corp,
  runner: {},
  cardSet: {},
  setIdentifiers: [],
  Counters: (card, type) => card[type] || 0,
  AgendaPoints: player => player.scoreArea.reduce((total, card) => total + (card.agendaPoints || 0), 0),
  AgendaPointsToWin: () => 7,
  AdvancementRequirement: card => card.advancementRequirement,
  GetServer: () => scoreServer,
  CheckCardType: (card, types) => types.includes(card.cardType),
  LogError: message => { throw new Error(message); },
};
context.phaseTemplates = {
  corpScorableResponse: {Enumerate: {score: () => [{card: scoreServer.root[0]}]}},
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'sets/elevation.js'), 'utf8'), context);
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;

const overAdvanceAgenda = advancement => ({
  title: 'Test dividends agenda',
  cardType: 'agenda',
  agendaPoints: 2,
  advancementRequirement: 3,
  advancement,
  AIOverAdvance: true,
  AIAdvancementLimit() { return 5; },
});

corp.scoreArea = [{agendaPoints: 4}];
scoreServer.root = [overAdvanceAgenda(3)];
assert.strictEqual(ai.Phase_Score(['score', 'n']), -1,
  'a non-winning over-advance agenda should wait for its advancement limit');

corp.scoreArea = [{agendaPoints: 5}];
assert.strictEqual(ai.Phase_Score(['score', 'n']), 0,
  'an over-advance agenda should score immediately when its points win the game');

corp.scoreArea = [{agendaPoints: 4}];
scoreServer.root = [overAdvanceAgenda(5)];
assert.strictEqual(ai.Phase_Score(['score', 'n']), 0,
  'a non-winning over-advance agenda should score after reaching its limit');

const projectIngatan = context.cardSet[35038];
const sericultureExpansion = context.cardSet[35049];
[projectIngatan, sericultureExpansion].forEach(card => {
  assert.strictEqual(card.AIOverAdvance, true, card.title + ' should use the boolean hook contract');
  assert.strictEqual(card.AIAdvancementLimit.call(card), 5,
    card.title + ' should target two counters above its score requirement');
});

const cappedIce = {
  cardType: 'ice',
  advancement: 2,
  AIOverAdvance: true,
  AIAdvancementLimit() { return 2; },
};
const eligibleIce = {
  cardType: 'ice',
  advancement: 1,
  AIAdvancementLimit() { return 2; },
};
assert.strictEqual(ai._cardNeedsAdvancement(cappedIce), false,
  'AIOverAdvance must not override an advancement target');
assert.strictEqual(ai._bestAdvanceOption([{card: cappedIce}, {card: eligibleIce}]), 1,
  'advance selection should skip a card that has reached its target');

console.log('PASS Corp over-advance limits and winning score exemption');
