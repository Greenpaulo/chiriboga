'use strict';
// Real engine reproduction: rewinding with Rotary installed must keep its
// Corp-only ability usable (documentation/bugs/code-review/rewind-corrupts-runner-card-corp-abilities.md).
const assert = require('assert');
const path = require('path');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const {playGame} = require(path.join(root, 'scripts', 'ai-batch', 'headless'));
const {OPENING} = require(path.join(__dirname,
  path.basename(__dirname) === 'pending' ? '..' : '.', '_headless-board.js'));
const fs = require('fs');
const os = require('os');

const setupCode = `
  var rewindRepro = {};
  __report = function() { return rewindRepro; };
  StartGame = function() { try { __body(); } catch (e) { rewindRepro.uncaught = String(e.stack).split(String.fromCharCode(10)).slice(0, 5).join(' | '); } PlayerWin(corp, 'Rewind observation complete'); };
  var __body = function() {${OPENING}
    var rotary = InstanceCardsPush(36014, runner.rig.hardware, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    rotary.faceUp = true;
    playerTurn = runner; ChangePhase(phases.runnerActionMain);
    // Same steps as the rewind handler in init.js: save, clear, restore.
    var code = ReproductionCode(true);
    rewindRepro.savedLine = (code.match(/^runner\\.rig\\.hardware\\[\\d+\\]\\.corpAbilities=.*$/m) || [null])[0];
    rewinding = true;
    AllCards(null).forEach(function(card) { if (card.cardLocation) RemoveFromGame(card); });
    removedFromGame = [];
    eval(code);
    rewinding = false;
    var restored = runner.rig.hardware.find(function(card) { return card.title === 'Rotary'; });
    rewindRepro.restored = Boolean(restored);
    rewindRepro.abilityCount = restored ? restored.corpAbilities.length : null;
    rewindRepro.firstAbilityType = restored ? typeof restored.corpAbilities[0] : null;
    runner.tags = 1; playerTurn = corp; ChangePhase(phases.corpActionMain);
    corp.clickTracker = 3; corp.creditPool = 5;
    try {
      rewindRepro.corpChoices = ChoicesTriggerableAbilities(corp).map(function(choice) { return choice.label; });
    } catch (error) {
      rewindRepro.error = String(error && error.message);
    }
  };`;

const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'board-')), 'setup.js');
fs.writeFileSync(file, setupCode);
playGame({streamPrefix: '1:rewind-rotary', corpFile: 'Zwicky Supermodernism.js', runnerFile: 'Magdalene CBB.js',
  setFiles: ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'],
  timeoutMs: 60000, stallMs: 3000, setupFile: file, tail: 12}).then(game => {
  const r = game.report;
  if (process.env.VERBOSE) console.log(JSON.stringify(r), JSON.stringify(game.errors));
  assert(r && r.restored, 'Rotary must survive the rewind: ' + JSON.stringify(r));
  assert.strictEqual(r.error, undefined, 'Corp ability scan after rewind must not throw: ' + JSON.stringify(r));
  assert.strictEqual(r.firstAbilityType, 'object', 'restored Rotary keeps its ability object: ' + JSON.stringify(r));
  assert.deepStrictEqual(r.corpChoices, ['[click], 2[c]: Trash Rotary.'],
    'Corp can still use Rotary after rewind: ' + JSON.stringify(r));
  console.log('Rewind keeps Runner-card Corp abilities usable.');
}).catch(error => { console.error('FAIL: ' + error.message); process.exitCode = 1; })
  .finally(() => fs.rmSync(path.dirname(file), {recursive: true, force: true}));
