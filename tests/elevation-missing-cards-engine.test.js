'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {playGame} = require('../scripts/ai-batch/headless');
const batch = require('../scripts/ai-batch');
const root = path.resolve(__dirname, '..');
const {pool, setFiles} = batch.loadPool(path.join(root, 'tests/fixtures/ai-batch/deck-pool.json'));
const pair = pool.pairs.find(p => p.id === 'gateway');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'elevation-engine-'));
const setupFile = path.join(directory, 'setup.js');
fs.writeFileSync(setupFile, `
  function addCard(id, destination) {
    return InstanceCardsPush(id, destination, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
  }
  corp.AI = null;
  runner.AI = null;
  corp.identityCard = InstanceCard(35057, cardBackTexturesCorp, glowTextures, strengthTextures);
  corp.identityCard.flipped = true;
  corp.HQ.cards.length = 0;
  corp.scoreArea.length = 0;
  runner.scoreArea.length = 0;
  corp.creditPool = 10;
  corp.clickTracker = 3;
  runner.tags = 4;
  var remote = {serverName: 'NBN test', root: [], ice: []};
  corp.remoteServers = [remote];
  var stolen = addCard(35060, runner.scoreArea);
  stolen.faceUp = true;
  stolen.agenda = 1;
  ChangePhase(phases.corpActionMain);
  var deckBeforeDraw = corp.RnD.cards.length;
  var drawAbility = ChoicesTriggerableAbilities(corp).find(function (p) { return p.card === stolen; });
  phases.corpActionMain.Resolve.trigger(drawAbility);
  currentPhase.Resolve.continue({});
  var drawResult = {hand: corp.HQ.cards.length, deck: corp.RnD.cards.length,
    counter: stolen.agenda, clicks: corp.clickTracker, before: deckBeforeDraw};
  var shuffleCard = corp.HQ.cards[0];
  currentPhase.Resolve.continue({card: shuffleCard});
  currentPhase.Resolve.continue({});
  drawResult.shuffled = corp.RnD.cards.includes(shuffleCard);
  drawResult.finalHand = corp.HQ.cards.length;
  // Refill the hosted counter to test its cleanup when IP Enforcement moves it.
  stolen.agenda = 1;
  corp.clickTracker = 3;
  var operation = addCard(35066, corp.HQ.cards);
  ChangePhase(phases.corpActionMain);
  phases.corpActionMain.Resolve.play({card: operation});
  var target = currentPhase.Enumerate.install().find(function (p) { return p.card === stolen && p.server === remote; });
  currentPhase.Resolve.install(target);
  var tagsPaidBeforeInstall = runner.tags;
  var clicksAfterPlay = corp.clickTracker;
  currentPhase.Resolve.n({});
  var installResult = {
    tags: runner.tags, points: AgendaPoints(runner), agenda: stolen.agenda,
    advancement: stolen.advancement, installed: remote.root.includes(stolen),
    faceUp: stolen.faceUp, tagsPaidBeforeInstall: tagsPaidBeforeInstall,
    clicksAfterPlay: clicksAfterPlay
  };
  // A real score under SanSan must snapshot the server-modified requirement.
  var reporting = addCard(35059, remote.root);
  reporting.advancement = 3;
  var sansan = addCard(31069, remote.root);
  sansan.rezzed = true;
  ChangePhase(phases.corpActionMain);
  Score(reporting);
  // Both players decline unrelated response opportunities.
  var passes = 0;
  while (intended.score && passes++ < 8) currentPhase.Resolve.n({});
  var scoreResult = {agenda: reporting.agenda, advancement: reporting.advancement,
    inScore: corp.scoreArea.includes(reporting), snapshotCleared: typeof intended.scoreAdvancementRequirement === 'undefined'};
  corp.identityCard = InstanceCard(35058, cardBackTexturesCorp, glowTextures, strengthTextures);
  corp.HQ.cards.length = 0;
  corp.creditPool = 0;
  runner.creditPool = 5;
  runner.clickTracker = 4;
  runner.tags = 2;
  playerTurn = runner;
  var freeIce = corp.RnD.cards.find(function (card) { return card.cardType == 'ice'; });
  MoveCard(freeIce, corp.HQ.cards);
  var existingIce = addCard(30053, corp.HQ.ice);
  var existingIce2 = addCard(30053, corp.HQ.ice);
  ChangePhase(phases.runnerActionMain);
  phases.runnerActionMain.Resolve.remove({});
  var removalPasses = 0;
  while (!currentPhase.Enumerate.trigger().some(function (p) { return p.card == corp.identityCard; }) && removalPasses++ < 4) currentPhase.Resolve.n({});
  var synapseTrigger = currentPhase.Enumerate.trigger().find(function (p) { return p.card == corp.identityCard; });
  currentPhase.Resolve.trigger(synapseTrigger);
  var installChoice = currentPhase.Enumerate.continue().find(function (p) { return p.card == freeIce && p.server == corp.HQ; });
  currentPhase.Resolve.continue(installChoice);
  currentPhase.Resolve.continue({}); // Reveal acknowledgement.
  currentPhase.Resolve.n({}); // Install while ignoring the two existing ICE costs.
  var synapseResult = {installed: corp.HQ.ice.includes(freeIce), credits: corp.creditPool,
    tags: runner.tags, firstUsed: corp.identityCard.tagRemovedThisTurn,
    pending: corp.identityCard.installPending, known: freeIce.knownToRunner};
  __report = function () { return {install: installResult, score: scoreResult, draw: drawResult, synapse: synapseResult}; };
  __onWin(corp, 'Elevation engine checks complete');
`);
(async () => {
  try {
    const game = await playGame({streamPrefix: '1:gateway', corpFile: pair.corp, runnerFile: pair.runner, setFiles, setupFile, timeoutMs: 60000});
    assert.deepStrictEqual(game.errors, []);
    assert.deepStrictEqual(game.report.install, {tags: 1, points: 0, agenda: 0, advancement: 1, installed: true, faceUp: false, tagsPaidBeforeInstall: 1, clicksAfterPlay: 3});
    assert.deepStrictEqual(game.report.score, {agenda: 2, advancement: 0, inScore: true, snapshotCleared: true});
    assert.strictEqual(game.report.draw.hand, 4);
    assert.strictEqual(game.report.draw.deck, game.report.draw.before - 4);
    assert.strictEqual(game.report.draw.counter, 0);
    assert.strictEqual(game.report.draw.clicks, 2);
    assert.strictEqual(game.report.draw.finalHand, 3);
    assert.strictEqual(game.report.draw.shuffled, true);
    assert.deepStrictEqual(game.report.synapse, {installed: true, credits: 0, tags: 1, firstUsed: true, pending: false, known: true});
    console.log('Elevation missing-card engine checks passed.');
  } finally { fs.rmSync(directory, {recursive: true, force: true}); }
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
