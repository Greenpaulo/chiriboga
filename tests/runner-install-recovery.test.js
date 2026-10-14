'use strict';
const assert = require('assert');
const {playBoard, OPENING} = require('./_headless-board');

// Real Install, Trash, response windows, payment allocator and card definitions.
// Synthetic cost/credit responses exercise contracts independently of titles.
async function observe(body) {
  const game = await playBoard({corp: 'Zwicky Supermodernism.js', runner: 'Magdalene CBB.js',
    setupCode: `
    var observation = {};
    __report = function() { return observation; };
    StartGame = function() {${OPENING}
      playerTurn = runner; runner.creditPool = 1; runner.temporaryCredits = 0;
      runner.clickTracker = 3;
      var sources = InstanceCardsPush(30025, runner.rig.programs, 2,
        cardBackTexturesRunner, glowTextures, strengthTextures);
      var breaker = InstanceCardsPush(35032, runner.rig.programs, 1,
        cardBackTexturesRunner, glowTextures, strengthTextures)[0];
      var candidate = InstanceCardsPush(35032, runner.heap, 1,
        cardBackTexturesRunner, glowTextures, strengthTextures)[0];
      runner.rig.programs.forEach(function(card) {card.faceUp = true;});
      ChangePhase(phases.runnerActionMain);
      var parent = currentPhase;
      var committed = 0, paid = 0, completed = 0, failed = 0;
      function begin(ignore, allowCancel) {
        Install(candidate, null, ignore || false, null, true,
          function() {committed++;}, null, function() {failed++;},
          function() {paid++;}, allowCancel !== false, function() {completed++;});
        return currentPhase;
      }
      function settle(target) {
        for (var hops = 0; currentPhase !== target && hops < 30; hops++) {
          if (currentPhase.Enumerate && currentPhase.Enumerate.trigger) {
            var triggers = currentPhase.Enumerate.trigger.call(currentPhase);
            var custom = triggers.find(function(p) {return p.card === breaker;});
            if (custom) {currentPhase.Resolve.trigger(custom); continue;}
          }
          if (currentPhase.Resolve && currentPhase.Resolve.continue && !currentPhase.Resolve.n) {
            currentPhase.Resolve.continue({}); continue;
          }
          if (!currentPhase.Resolve || typeof currentPhase.Resolve.n !== 'function')
            throw new Error('Unexpected recovery phase: ' + currentPhase.identifier);
          currentPhase.Resolve.n.call(currentPhase, {});
        }
        if (currentPhase !== target) throw new Error('Response window did not finish');
      }
      function trash(phase, card) {
        phase.Resolve.trash({card: card}); settle(phase);
      }
      ${body}
      observation.pool = runner.creditPool;
      observation.pending = runner.installingCards.includes(candidate);
      observation.heap = runner.heap.includes(candidate);
      observation.grip = runner.grip.includes(candidate);
      observation.installed = InstalledCards(runner).includes(candidate);
      observation.clicks = runner.clickTracker;
      observation.callbacks = [committed, paid, completed, failed];
      PlayerWin(corp, 'Install recovery observation complete');
    };`});
  assert(game.report, JSON.stringify(game.errors));
  assert.strictEqual(game.errors.length, 0, JSON.stringify(game.errors));
  return game.report;
}

async function main() {
  let r = await observe(`
    var choice = runner.identityCard.responseOnDiscardToMaxHandSize.Enumerate.call(
      runner.identityCard, [candidate]).find(function(p) {return p.card === candidate;});
    runner.identityCard.responseOnDiscardToMaxHandSize.Resolve.call(runner.identityCard, choice);
    var phase = currentPhase; trash(phase, sources[0]);
    observation.choices = [phase.Enumerate.n().length, phase.Enumerate.continue().length];
    observation.cancel = Boolean(phase.Cancel);
    phase.Resolve.continue();
    observation.returned = currentPhase === parent;
    observation.trashed = runner.heap.includes(sources[0]);
  `);
  assert.deepStrictEqual(r.choices, [0, 1]);
  assert.strictEqual(r.cancel, false);
  assert(r.returned && r.trashed && r.heap && !r.pending && !r.installed);
  assert.strictEqual(r.pool, 1);
  assert.strictEqual(r.clicks, 3);

  r = await observe(`
    MoveCard(candidate, runner.grip);
    phases.runnerActionMain.Resolve.install({card: candidate});
    var phase = currentPhase; trash(phase, sources[0]);
    phase.Resolve.continue();
    observation.returned = currentPhase === parent.next;
    phase.Resolve.n(); //stale callbacks cannot charge the action again
  `);
  assert(r.returned && r.grip && !r.pending && !r.installed);
  assert.strictEqual(r.pool, 1);
  assert.strictEqual(r.clicks, 2);

  r = await observe(`
    var phase = begin(false, false); trash(phase, sources[0]);
    observation.cancel = Boolean(phase.Cancel);
    phase.Resolve.n(); //defensive check for a stale formerly affordable option
    phase.Resolve.n();
    observation.returned = currentPhase === parent;
  `);
  assert(!r.cancel && r.returned && r.heap && !r.pending);
  assert.strictEqual(r.pool, 1);
  assert.deepStrictEqual(r.callbacks, [1, 0, 0, 1]);

  r = await observe(`
    var phase = begin(); phase.Cancel.trash();
    observation.returned = currentPhase === parent;
  `);
  assert(r.returned && r.heap && !r.pending);
  assert.deepStrictEqual(r.callbacks, [0, 0, 0, 1]);

  r = await observe(`
    runner.creditPool = 2;
    candidate.memoryCost = 2; //required MU trash
    var phase = begin();
    observation.before = phase.Enumerate.n().length;
    trash(phase, sources[0]);
    observation.after = phase.Enumerate.n().length;
    phase.Resolve.n(); settle(parent);
  `);
  assert.strictEqual(r.before, 0);
  assert.strictEqual(r.after, 1);
  assert(r.installed && !r.pending);
  assert.strictEqual(r.pool, 0);
  assert.deepStrictEqual(r.callbacks, [1, 1, 1, 0]);

  r = await observe(`
    //Further legal trashing can restore affordability; do not abort early.
    breaker.modifyInstallCost = {Resolve: function(card) {return card === candidate ? 2 : 0;}};
    candidate.modifyInstallCost = {Resolve: function() {return 0;}, availableWhenInactive: true};
    candidate.installCost = 1;
    var phase = begin();
    observation.before = phase.Enumerate.n().length;
    trash(phase, breaker);
    observation.after = phase.Enumerate.n().length;
    phase.Resolve.n(); settle(parent);
  `);
  assert.strictEqual(r.before, 0);
  assert.strictEqual(r.after, 1);
  assert(r.installed);
  assert.strictEqual(r.pool, 0);

  r = await observe(`
    var phase = begin(true); trash(phase, sources[0]);
    observation.after = phase.Enumerate.n().length;
    phase.Resolve.n(); settle(parent);
  `);
  assert.strictEqual(r.after, 1);
  assert(r.installed);
  assert.strictEqual(r.pool, 1);

  r = await observe(`
    breaker.responseOnTrash = {
      Enumerate: function(cards) {return cards.includes(sources[0]) ? [{}] : [];},
      Resolve: function() {
        DecisionPhase(runner, [{}], function() {GainCredits(runner, 1);},
          'Nested recovery response');
        observation.pendingDuringResponse = runner.installingCards.includes(candidate);
        observation.unpaidDuringResponse = runner.creditPool;
      }
    };
    var phase = begin(); trash(phase, sources[0]);
    observation.after = phase.Enumerate.n().length;
    observation.failureChoices = phase.Enumerate.continue().length;
    observation.cancel = Boolean(phase.Cancel);
    phase.Resolve.n(); settle(parent);
  `);
  assert(r.pendingDuringResponse && !r.cancel && r.installed);
  assert.strictEqual(r.unpaidDuringResponse, 1);
  assert.strictEqual(r.after, 1);
  assert.strictEqual(r.failureChoices, 0);
  assert.strictEqual(r.pool, 0);
  assert.deepStrictEqual(r.callbacks, [1, 1, 1, 0]);

  r = await observe(`
    runner.AI = null; //human payment path, with one forced hosted contribution
    var source = InstanceCardsPush(30025, runner.rig.hardware, 1,
      cardBackTexturesRunner, glowTextures, strengthTextures)[0];
    source.cardType = 'hardware'; source.subTypes = []; source.faceUp = true;
    source.credits = 1;
    source.canUseCredits = function(doing, card) {return doing === 'installing' && card === candidate;};
    var phase = begin(); trash(phase, sources[0]);
    phase.Resolve.n(); settle(parent);
    observation.source = source.credits;
  `);
  assert(r.installed);
  assert.strictEqual(r.pool, 0);
  assert.strictEqual(r.source, 0);

  r = await observe(`
    sources[0].credits = 1;
    sources[0].canUseCredits = function(doing, card) {return doing === 'installing' && card === candidate;};
    runner.creditPool = 0;
    var phase = begin();
    observation.before = phase.Enumerate.n().length;
    trash(phase, sources[0]);
    observation.after = phase.Enumerate.n().length;
    phase.Resolve.continue();
  `);
  assert.strictEqual(r.before, 1);
  assert.strictEqual(r.after, 0);
  assert(r.heap && !r.pending);
  assert.strictEqual(r.pool, 0);

  r = await observe(`
    runner.creditPool = 10;
    breaker.preventCreditPoolUse = function(player, action, doing, card) {
      return player === runner && doing === 'installing' && card === candidate;
    };
    var phase = begin();
    observation.choices = [phase.Enumerate.n().length, phase.Enumerate.continue().length];
    phase.Resolve.continue();
  `);
  assert.deepStrictEqual(r.choices, [0, 1]);
  assert(r.heap && !r.pending);
  assert.strictEqual(r.pool, 10);

  for (const kind of ['hosted', 'temporary', 'ineligible']) {
    r = await observe(`
      var source = InstanceCardsPush(30025, runner.rig.hardware, 1,
        cardBackTexturesRunner, glowTextures, strengthTextures)[0];
      source.cardType = 'hardware'; source.subTypes = []; source.faceUp = true; source.credits = 1;
      source.canUseCredits = function(doing, card) {
        return ${kind === 'hosted'} && doing === 'installing' && card === candidate;
      };
      runner.temporaryCredits = ${kind === 'temporary' ? 1 : 0};
      var phase = begin(); trash(phase, sources[0]);
      observation.choices = [phase.Enumerate.n().length, phase.Enumerate.continue().length];
      if (phase.Enumerate.n().length) {phase.Resolve.n(); settle(parent);}
      else phase.Resolve.continue();
      observation.source = source.credits;
      observation.temporary = runner.temporaryCredits;
    `);
    assert.deepStrictEqual(r.choices, kind === 'ineligible' ? [0, 1] : [1, 0], kind);
    assert.strictEqual(r.installed, kind !== 'ineligible', kind);
    assert.strictEqual(r.pool, kind === 'ineligible' ? 1 : 0, kind);
    assert.strictEqual(r.source, kind === 'hosted' ? 0 : 1, kind);
    assert.strictEqual(r.temporary, 0, kind);
  }
  console.log('Runner install recovery: 14 real-engine scenarios passed.');
}
main().catch(error => {console.error('FAIL: ' + error.stack); process.exitCode = 1;});
