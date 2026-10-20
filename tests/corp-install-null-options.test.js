'use strict';
// Real-engine regressions for optional install prompts with a null card.
const assert = require('assert');
const {playBoard, OPENING} = require('./_headless-board');

const cases = [
  {name: 'Skip install', setupCode: `
  StartGame = function() {${OPENING}
    var server = NewServer("Server 1", false); corp.remoteServers.push(server);
    var hr = InstanceCardsPush(35039, server.root, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    hr.rezzed = true;
    corp.creditPool = 5; corp.clickTracker = 3; playerTurn = corp;
    corp.AI.preferred = {command: "trigger", cardToTrigger: hr};
    ChangePhase(phases.corpActionMain);
    Main();
  };`, check(game) {
    const crash = game.errors.find(e => /TypeError.*'unique'/.test(e));
    assert.ok(!crash, 'Corp AI install choice threw on the null skip option: ' + crash +
      (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  }},
  {name: 'Decline', setupCode: `
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
  };`, check(game) {
    assert.strictEqual(game.report.scatter, 'Scatter Field', 'setup uses the expected ICE');
    assert.ok(game.report.installable > 0, 'HQ has an affordable install choice');
    assert.strictEqual(game.report.prompt, 'Install card from HQ?', 'Scatter Field reached its install prompt');
    assert.strictEqual(game.report.declineOffered, true, 'install choices contain the null Decline option');
    const crash = game.errors.find(e => /TypeError.*'unique'/.test(e));
    assert.ok(!crash, 'Corp AI install choice threw on the null Decline option: ' + crash +
      (process.env.VERBOSE ? '\n' + game.tail.join('\n') : ''));
  }},
];

(async () => {
  for (const entry of cases) {
    const game = await playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode: entry.setupCode});
    entry.check(game);
    if (process.env.VERBOSE) console.log('PASS ' + entry.name);
  }
  console.log('Corp install null options: ' + cases.length + ' cases passed.');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
