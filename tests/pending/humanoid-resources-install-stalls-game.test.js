'use strict';
// Pending reproduction: documentation/bugs/humanoid-resources-install-stalls-game.md
// After Humanoid Resources' ability, installing from HQ must not leave the game
// with no valid command. The Corp AI's separate null-option crash
// (corp-install-choice-crashes-on-null-skip-option.md) is neutralised here so
// this test isolates the card; the patch is a no-op once that bug is fixed.
const assert = require('assert');
const path = require('path');
// The shared board helper lives in tests/; this works from tests/pending/ and after a move to tests/.
const {playBoard, OPENING} = require(path.join(__dirname, path.basename(__dirname) === 'pending' ? '..' : '.', '_headless-board.js'));

const setupCode = `
  var __reproRank = CorpAI.prototype._rankedInstallOptions;
  CorpAI.prototype._rankedInstallOptions = function(cards) {
    arguments[0] = cards.filter(function(c) { return c !== null; });
    return __reproRank.apply(this, arguments);
  };
  StartGame = function() {${OPENING}
    var server = NewServer("Server 1", false); corp.remoteServers.push(server);
    var hr = InstanceCardsPush(35039, server.root, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    hr.rezzed = true;
    corp.creditPool = 5; corp.clickTracker = 3; playerTurn = corp;
    corp.AI.preferred = {command: "trigger", cardToTrigger: hr};
    ChangePhase(phases.corpActionMain);
    Main();
  };`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  assert.ok(game.tail.some(l => /Humanoid Resources gains/.test(l)) || game.winner, 'the ability was used');
  assert.ok(!game.errors.some(e => /^stalled/.test(e)), 'the game stalled after Humanoid Resources: ' +
    game.errors.join('; ') + (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  assert.ok(game.winner, 'the game finished');
  console.log('Humanoid Resources installs complete and play continues.');
}).catch(error => { console.log(error.message); process.exit(1); });
