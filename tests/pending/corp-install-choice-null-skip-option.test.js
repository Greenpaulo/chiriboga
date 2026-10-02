'use strict';
// Pending reproduction: documentation/bugs/corp-install-choice-crashes-on-null-skip-option.md
// The Corp AI's install-choice ranking must not throw on an option whose
// `card` is null (Humanoid Resources' "Skip install").
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.join(__dirname, '_headless-board.js'));

const setupCode = `
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
  const crash = game.errors.find(e => /TypeError.*'unique'/.test(e));
  assert.ok(!crash, 'Corp AI install choice threw on the null skip option: ' + crash +
    (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  console.log('Corp install choice handles a null skip option.');
}).catch(error => { console.log(error.message); process.exit(1); });
