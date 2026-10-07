'use strict';
// Regression: documentation/bugs/code-review/corp-install-choice-crashes-on-null-skip-option.md
// Variation: Scatter Field's "You may install 1 card from HQ." subroutine
// offers `{card: null, label: "Decline"}`; the Corp AI's install-choice ranking
// must not throw on it.
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.join(__dirname, '_headless-board.js'));

const setupCode = `
  StartGame = function() {${OPENING}
    var scatter = InstanceCardsPush(35042, corp.HQ.ice, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    scatter.rezzed = true;
    corp.creditPool = 5; corp.clickTracker = 3; playerTurn = corp;
    ChangePhase(phases.corpActionMain);
    var installable = ChoicesHandInstall(corp).length;
    scatter.subroutines[0].Resolve.call(scatter);
    var choices = currentPhase.Enumerate.install ? currentPhase.Enumerate.install() : [];
    var probe = {scatter: scatter.title, installable: installable,
      prompt: currentPhase.text && currentPhase.text.install,
      declineOffered: choices.some(function(choice) { return choice.card === null && choice.label === 'Decline'; })};
    __report = function() { return probe; };
    Main();
  };`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  assert.strictEqual(game.report.scatter, 'Scatter Field', 'setup uses the expected ICE');
  assert.ok(game.report.installable > 0, 'HQ has an affordable install choice');
  assert.strictEqual(game.report.prompt, 'Install card from HQ?', 'Scatter Field reached its install prompt');
  assert.strictEqual(game.report.declineOffered, true, 'install choices contain the null Decline option');
  const crash = game.errors.find(e => /TypeError.*'unique'/.test(e));
  assert.ok(!crash, 'Corp AI install choice threw on the null Decline option: ' + crash +
    (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  console.log('Corp install choice handles a null Decline option.');
}).catch(error => { console.log(error.message); process.exit(1); });
