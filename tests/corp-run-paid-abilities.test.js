'use strict';
// Real phase enumeration and selection; synthetic identity abilities isolate the
// routing contract from card-specific strategic heuristics.
const assert = require('assert');
const {playBoard, OPENING} = require('./_headless-board');

const setupCode = `
  var paidProbe = [];
  StartGame = function() {${OPENING}
    var server = NewServer("Paid routing", false); corp.remoteServers.push(server);
    var bumi = InstanceCardsPush(35041, server.ice, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    bumi.rezzed = true;
    playerTurn = runner; attackedServer = server; approachIce = 0;
    var identity = corp.identityCard;
    var makeAbility = function(text) { return {text: text, Enumerate: function() { return [{}]; }, Resolve: function() {}}; };
    var reset = function(phase) {
      delete identity.AIWouldTrigger; delete identity.AITriggerInPaidWindow;
      identity.abilities = [makeAbility("First"), makeAbility("Second")];
      ChangePhase(phase); activePlayer = corp; executingCommand = "";
      corp.AI.preferred = null;
    };
    var capture = function(name, commands) {
      var logs = []; corp.AI._log = function(message) { logs.push(message); };
      var offered = currentPhase.Enumerate.trigger();
      var index = corp.AI._choiceInner(commands || ["trigger", "n"], "command");
      var result = {name: name, choice: (commands || ["trigger", "n"])[index], logs: logs,
        offered: offered.length, preferredCard: corp.AI.preferred && corp.AI.preferred.cardToTrigger && corp.AI.preferred.cardToTrigger.title};
      if (result.choice == "trigger") {
        // Reorder the same card's abilities before selection: the exact
        // accepted ability must win, rather than the first matching card.
        executingCommand = "trigger";
        var reversed = offered.slice().reverse();
        var selected = reversed[corp.AI._choiceInner(reversed, "select")];
        result.ability = selected.ability.text;
        result.consumed = corp.AI.preferred === null;
      }
      paidProbe.push(result);
      return result;
    };
    [phases.runApproachIce, phases.runEncounterIce, phases.runDecideContinue,
      phases.runResponseBeforeApproach].forEach(function(phase) {
      reset(phase); identity.AIWouldTrigger = function() { return false; };
      capture(phase.identifier + " declined");
      reset(phase); identity.AIWouldTrigger = function() { return true; };
      capture(phase.identifier + " accepted");
      reset(phase); capture(phase.identifier + " unhooked");
    });
    reset(phases.runApproachIce);
    var otto = InstanceCardsPush(35040, server.root, 1, cardBackTexturesCorp, glowTextures, strengthTextures)[0];
    otto.rezzed = true; otto.abilities = [makeAbility("Otto ability")];
    otto.AIWouldTrigger = function() { return false; };
    capture("declined then unhooked");
    otto.abilities = [];

    reset(phases.runApproachIce);
    identity.AIWouldTrigger = function() { return false; };
    identity.AITriggerInPaidWindow = function() { return true; };
    capture("declaration cannot bypass veto");

    reset(phases.runApproachIce);
    identity.AIWouldTrigger = function() { return true; };
    identity.AITriggerInPaidWindow = function() { return true; };
    capture("declaration selects exact ability");

    reset(phases.runApproachIce);
    otto.abilities = [makeAbility("Otto ability")]; delete otto.AIWouldTrigger;
    identity.AITriggerInPaidWindow = function() { return true; };
    capture("declaration precedes unhooked candidate");
    otto.abilities = [];

    reset(phases.runApproachIce);
    identity.AITriggerInPaidWindow = function() { return false; };
    capture("false declaration preserves unhooked default");

    reset(phases.runApproachIce);
    identity.AIWouldTrigger = function() { return true; };
    bumi.rezzed = false; corp.creditPool = 20;
    var originalWorth = corp.AI._iceWorthRezzing;
    corp.AI._iceWorthRezzing = function() { return true; };
    capture("approached rez precedes ordinary trigger", ["trigger", "rez", "n"]);
    executingCommand = ""; corp.AI.preferred = null;
    identity.AITriggerInPaidWindow = function() { return true; };
    capture("declaration retains priority over rez", ["trigger", "rez", "n"]);
    corp.AI._iceWorthRezzing = originalWorth; bumi.rezzed = true;

    reset(phases.corpPostAction);
    // Use an unrelated paid-window phase with a declaration; existing generic
    // dispatch remains independent of the new run-window veto.
    identity.AIWouldTrigger = function() { return false; };
    identity.AITriggerInPaidWindow = function() { return true; };
    capture("non-run dispatch preserved");
    PlayerWin(corp, "routing tests complete");
  };
  __report = function() { return paidProbe; };
`;

playBoard({corp: 'LEO Glacier.js', runner: 'Topan CBB.js', setupCode}).then(game => {
  assert.ok(game.report && game.report.length === 20, 'all routing cases reached: ' + game.errors.join('\n'));
  for (const row of game.report) {
    assert.ok(row.offered > 0, row.name + ': real enumeration offers an ability');
    if (row.name.endsWith(' declined') || row.name === 'declaration cannot bypass veto') {
      assert.strictEqual(row.choice, 'n', row.name);
      assert.ok(row.logs.some(log => /AIWouldTrigger declined/.test(log)), row.name + ': veto reason');
    } else if (row.name === 'approached rez precedes ordinary trigger') {
      assert.strictEqual(row.choice, 'rez', row.name);
      assert.ok(row.logs.includes('I will rez the approached ice'), row.name + ': rez reason');
    } else {
      assert.strictEqual(row.choice, 'trigger', row.name);
      assert.strictEqual(row.ability, row.name === 'non-run dispatch preserved' ? 'Second' : 'First', row.name + ': ability selection');
      assert.strictEqual(row.consumed, true, row.name + ': preference consumed');
      if (row.name !== 'non-run dispatch preserved') {
        const reason = row.name.startsWith('declaration ') ? /AITriggerInPaidWindow accepted/ :
          row.name.endsWith(' accepted') ? /AIWouldTrigger accepted/ : /No AIWouldTrigger hook/;
        assert.ok(row.logs.some(log => reason.test(log)), row.name + ': selection reason');
      } else assert.ok(row.logs.includes('a relevant preference has been set'), row.name + ': preference reason');
      if (row.name === 'declined then unhooked') {
        assert.strictEqual(row.preferredCard, 'LEO Construction: Labor Solutions');
        assert.ok(row.logs.some(log => /AIWouldTrigger declined/.test(log)), row.name + ': skipped veto reason');
      }
    }
  }
  console.log('Corp run paid abilities: ' + game.report.length + ' cases passed.');
}).catch(error => { console.error(error.stack || error); process.exitCode = 1; });
