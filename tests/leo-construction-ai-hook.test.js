'use strict';
const assert = require('assert');
const path = require('path');
const {playBoard, OPENING} = require(path.resolve(__dirname,
  path.basename(__dirname) === 'pending' ? '../_headless-board' : './_headless-board'));

const setupCode = `
  var leoProbe = [];
  StartGame = function() {${OPENING}
    var server = NewServer("LEO reproduction", false);
    corp.remoteServers.push(server);
    var bumi = InstanceCardsPush(35041, server.ice, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    bumi.rezzed = true;
    InstanceCardsPush(35040, server.root, 1, cardBackTexturesCorp, glowTextures, strengthTextures);
    playerTurn = runner; attackedServer = server; approachIce = 0;
    [phases.runApproachIce, phases.runResponseBeforeApproach].forEach(function(phase) {
      ChangePhase(phase);
      activePlayer = corp; executingCommand = ""; corp.AI.preferred = null;
      var offered = currentPhase.Enumerate.trigger();
      var logs = [];
      var previousLog = corp.AI._log;
      corp.AI._log = function(message) { logs.push(message); };
      var commands = ["trigger", "n"];
      var decision = commands[corp.AI._choiceInner(commands, "command")];
      corp.AI._log = previousLog;
      leoProbe.push({phase: phase.identifier,
        offered: offered.map(function(choice) { return choice.card.title; }),
        hook: corp.identityCard.AIWouldTrigger(), decision: decision, logs: logs});
    });
    PlayerWin(corp, "reproduction complete");
  };
  __report = function() { return leoProbe; };
`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  assert.strictEqual(game.report.length, 2, 'both real run windows reached');
  for (const result of game.report) {
    assert.deepStrictEqual(result.offered, ['LEO Construction: Labor Solutions'], 'LEO is the only legal trigger');
    assert.strictEqual(result.hook, false, 'the existing hook declines on this board');
  }
  assert.deepStrictEqual(game.report.map(result => [result.phase, result.decision]),
    [['Run 2.1', 'n'], ['Run 4.5', 'n']], 'run commands must honor the offered ability hook');
  for (const result of game.report)
    assert.ok(result.logs.some(message => /AIWouldTrigger.*declin/i.test(message)), 'log why the ability was declined');
  console.log('LEO run-window hook routing: 2 cases passed.');
}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
