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
    scatter.subroutines[0].Resolve.call(scatter);
    Main();
  };`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  const crash = game.errors.find(e => /TypeError.*'unique'/.test(e));
  assert.ok(!crash, 'Corp AI install choice threw on the null Decline option: ' + crash +
    (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  console.log('Corp install choice handles a null Decline option.');
}).catch(error => { console.log(error.message); process.exit(1); });
