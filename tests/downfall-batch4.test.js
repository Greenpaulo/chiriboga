// Run with: node tests/downfall-batch4.test.js
// Downfall batch 4 (26015–26018): Masterwork (v37), Bukhgalter, "Baklan"
// Bochkin and The Class Act, exercised through the real engine and Runner AI.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;

// ---- headless engine: real engine files, browser globals stubbed ----
const stub = new Proxy(function() {}, {
  get: (target, key) => key === Symbol.toPrimitive ? () => 0 : key === 'length' ? 0 : stub,
  apply: () => stub, construct: () => stub,
});
const extend = (deep, target, ...sources) => {
  if (typeof deep !== 'boolean') { sources.unshift(target); target = deep; deep = false; }
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && value && typeof value === 'object' ?
      extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jQuery = () => stub;
jQuery.extend = extend;
const context = {
  console: {log() {}, warn() {}, error: verbose ? console.error : () => {}},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  cardSet: [], setIdentifiers: [], accessibilityMode: 'text',
  $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
  localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
  location: {search: '', href: '', hostname: 'localhost'},
  PlaySound() {}, PlayCreditGainSound() {}, suppressCreditDrawSound: false, particleSystems: stub,
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/downfall.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

const ID = {
  HB: 30035, Tao: 30019, HedgeFund: 30075, SureGamble: 30030, Diesel: 31027,
  Tithe: 30073, Rototurret: 31046, IceWall: 31077,
  DocklandsPass: 30013, T400: 30031,
  Masterwork: 26015, Bukhgalter: 26016, Baklan: 26017, ClassAct: 26018,
};

// Player state as Init() prepares it, then a board.
function setUpBoard({hqIce = [], rndIce = [], archivesIce = [], stack = [], grip = [], installed = [], credits = 5, ai = false} = {}) {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    viewAllFronts = false; accessingCard = null; lingeringEffects = [];
    attackedServer = null; approachIce = -1; encountering = false; encounteredIce = null;
    turnEventCounts = {};
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0, AI: null});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: ${credits}, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: [], AI: null});
    CorpTestField(${ID.HB}, [], [${ID.HedgeFund}, ${ID.HedgeFund}], [${ID.HedgeFund}],
      ${JSON.stringify(archivesIce)}, ${JSON.stringify(rndIce)}, ${JSON.stringify(hqIce)}, [], [], cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(${ID.Tao}, [], ${JSON.stringify(stack)}, ${JSON.stringify(grip)}, ${JSON.stringify(installed)}, [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
    corp.HQ.ice.concat(corp.RnD.ice, corp.archives.ice).forEach(function (c) { c.rezzed = true; c.knownToRunner = true; });
    ${ai ? 'runner.AI = new RunnerAI(); runner.AI._log = function() {};' : ''}
  `);
}

// Resolve every pending trigger in the current global-trigger phases and
// decisions; `pick(choices, card)` chooses within a card's decision.
function settle(pick = choices => choices[0]) {
  for (let guard = 0; guard < 50; guard++) {
    const phase = run('currentPhase');
    if (run('[phases.runnerActionMain, phases.runApproachIce, phases.runEncounterIce, phases.runSubroutines]').includes(phase)) return;
    const options = cmd => typeof phase.Resolve[cmd] !== 'function' ? [] :
      phase.Enumerate && typeof phase.Enumerate[cmd] === 'function' ? phase.Enumerate[cmd]() : [{}];
    if (phase.triggerCallbackName) {
      const triggers = options('trigger');
      if (triggers.length > 0) { phase.Resolve.trigger(triggers[0]); continue; }
    }
    const choices = options('continue');
    if (choices.length > 0) { phase.Resolve.continue(pick(choices, phase.context)); continue; }
    if (options('n').length > 0) { phase.Resolve.n({}); continue; }
    break;
  }
  const phase = run('currentPhase');
  throw new Error('settle did not finish at ' + phase.identifier + ' / ' + phase.title + ' ' + Object.keys(phase.Resolve || {}));
}
const noClassAct = (choices, card) => {
  if (card && card.title === 'The Class Act') throw new Error('unexpected The Class Act choice');
  return choices[0];
};
const byTitle = (cards, title) => cards.find(card => card.title === title);
const titles = cards => Array.from(cards, card => card.title);

const failures = [];
let cases = 0;
const tests = [];
function test(name, fn) { tests.push({name, fn}); }

// ---------------- Masterwork (v37) ----------------
test('Masterwork draws on the first hardware install each turn, its own install included', () => {
  setUpBoard({grip: [ID.Masterwork, ID.DocklandsPass], stack: [ID.SureGamble, ID.Diesel, ID.HedgeFund]});
  assert.strictEqual(run('GetCardProperty(runner.grip[0], "memoryUnits")'), 1);
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert.strictEqual(run('runner.rig.hardware.length'), 1);
  assert.strictEqual(run('runner.grip.length'), 2, 'drew 1 for its own install');
  assert.strictEqual(run('MemoryUnits(runner)'), 5, '+1 MU');
  run('Install(runner.grip.find(function (c) { return c.title == "Docklands Pass"; }), null, false, null, true)'); settle();
  assert.strictEqual(run('runner.grip.length'), 1, 'second hardware install this turn does not draw');
});

test('Masterwork does not draw when hardware was already installed this turn', () => {
  setUpBoard({grip: [ID.DocklandsPass, ID.Masterwork], stack: [ID.SureGamble, ID.Diesel]});
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert.strictEqual(run('runner.rig.hardware.length'), 2);
  assert.strictEqual(run('runner.grip.length'), 0, 'Masterwork was not the first hardware install');
});

test('Masterwork installs hardware when a run begins, paying 1 more', () => {
  setUpBoard({installed: [ID.Masterwork], grip: [ID.T400, ID.SureGamble], stack: [ID.Diesel, ID.HedgeFund], hqIce: [ID.IceWall], credits: 3});
  run('MakeRun(corp.HQ)');
  let offered = null;
  settle((choices, card) => {
    if (card && card.title === 'Masterwork (v37)' && choices.some(choice => 'card' in choice)) {
      offered = titles(choices.filter(choice => choice.card).map(choice => choice.card));
      return choices.find(choice => choice.card && choice.card.title === 'T400 Memory Diamond');
    }
    return choices[0];
  });
  assert.deepStrictEqual(offered, ['T400 Memory Diamond'], 'only hardware from the grip');
  assert(byTitle(run('runner.rig.hardware'), 'T400 Memory Diamond'), 'installed');
  assert.strictEqual(run('runner.creditPool'), 0, '2 install cost + 1');
  assert.strictEqual(run('runner.rig.hardware[0].extraCostCard'), null, 'extra cost cleared');
  assert.strictEqual(run('runner.grip.length'), 2, 'the run-begin install was the first hardware install: draw 1');
});

test('Masterwork offers nothing when the extra 1 is unaffordable', () => {
  setUpBoard({installed: [ID.Masterwork], grip: [ID.T400], hqIce: [ID.IceWall], credits: 2});
  run('attackedServer = corp.HQ;');
  assert.strictEqual(run('runner.rig.hardware[0].responseOnRunBegins.Enumerate.call(runner.rig.hardware[0]).length'), 0);
  run('runner.creditPool = 3;');
  assert.strictEqual(run('runner.rig.hardware[0].responseOnRunBegins.Enumerate.call(runner.rig.hardware[0]).length'), 2);
});

test('Runner AI installs at run start only while the planned run stays affordable', () => {
  setUpBoard({installed: [ID.Masterwork], grip: [ID.T400], hqIce: [ID.IceWall], credits: 5, ai: true});
  const choose = (spent) => run(`(function () {
    attackedServer = corp.HQ;
    runner.AI.cachedPathServer = corp.HQ;
    runner.AI.cachedBestPath = [{runner_credits_spent: ${spent}, runner_credits_lost: 0}];
    var mw = runner.rig.hardware[0];
    var choice = mw.responseOnRunBegins.Enumerate.call(mw);
    return choice.length == 1 && choice[0].card ? choice[0].card.title : null;
  })()`);
  run('runner.AI._cardsInHandWorthKeeping = function () { return runner.grip.slice(); };');
  assert.strictEqual(choose(2), 'T400 Memory Diamond', '5 - 3 leaves the 2 the run needs');
  assert.strictEqual(choose(3), null, 'would leave the run unaffordable');
  run('runner.AI._cardsInHandWorthKeeping = function () { return []; };');
  assert.strictEqual(choose(0), null, 'does not install hardware it would not keep');
});

for (const helper of ['_runInstallChoices', '_aiRunInstallChoice']) {
  test('Masterwork restores extraCostCard after ' + helper + ' returns or throws', () => {
    setUpBoard({installed: [ID.Masterwork], grip: [ID.T400, ID.DocklandsPass], credits: 5, ai: true});
    const mw = run('runner.rig.hardware[0]');
    const grip = run('runner.grip');
    const ai = run('runner.AI');
    run('attackedServer = corp.HQ; runner.AI.cachedPathServer = corp.HQ; runner.AI.cachedBestPath = [];');
    ai._cardsInHandWorthKeeping = () => grip;
    const evaluator = helper === '_runInstallChoices' ? 'ChoicesCardInstall' : 'InstallCost';
    const original = context[evaluator];
    const failure = new Error('install evaluation failed');
    try {
      for (const prior of [null, grip[1]]) for (const shouldThrow of [false, true]) {
        mw.extraCostCard = prior;
        let calls = 0;
        context[evaluator] = target => {
          calls++;
          assert.strictEqual(mw.extraCostCard, target, 'extra cost applies during evaluation');
          if (shouldThrow) throw failure;
          return evaluator === 'InstallCost' ? 3 : [{card: target}];
        };
        const evaluate = () => mw[helper]([{card: grip[0]}]);
        if (shouldThrow) assert.throws(evaluate, error => error === failure);
        else assert(evaluate(), 'normal evaluation returns its choices');
        assert(calls > 0, 'the temporary-cost evaluator was reached');
        assert.strictEqual(mw.extraCostCard, prior, 'the exact previous state is restored');
      }
    } finally {
      context[evaluator] = original;
      mw.extraCostCard = null;
    }
  });
}

// ---------------- Bukhgalter ----------------
function encounter(iceIdx = 0) {
  run(`attackedServer = corp.HQ; approachIce = ${iceIdx}; encountering = true;
    encounteredIce = corp.HQ.ice[${iceIdx}];
    AutomaticTriggers("automaticOnEncounter", [encounteredIce]);`);
}
function useAbility(card, index, choice = 0) {
  return run(`(function () {
    var card = ${card}; var ability = card.abilities[${index}];
    var choices = ability.Enumerate.call(card);
    if (choices.length <= ${choice}) return false;
    ability.Resolve.call(card, choices[${choice}]);
    return true;
  })()`);
}
test('Bukhgalter gains 2 the first time each turn it fully breaks ice', () => {
  setUpBoard({installed: [ID.Bukhgalter], hqIce: [ID.Rototurret], credits: 6});
  const b = 'runner.rig.programs[0]';
  encounter(); settle();
  assert(useAbility(b, 0)); settle();
  assert.strictEqual(run('runner.creditPool'), 5);
  assert(useAbility(b, 0)); settle();
  assert.strictEqual(run('runner.creditPool'), 6, 'paid 2, gained 2');
  run(`${b}.responseOnEncounterEnds.Resolve.call(${b}); corp.HQ.ice[0].subroutines.forEach(function (s) { s.broken = false; });`);
  encounter(); settle();
  useAbility(b, 0); settle(); useAbility(b, 0); settle();
  assert.strictEqual(run('runner.creditPool'), 4, 'only once per turn');
});

test('Bukhgalter does not fully break ice when another card broke a subroutine', () => {
  setUpBoard({installed: [ID.Bukhgalter], hqIce: [ID.Rototurret], credits: 6});
  encounter(); settle();
  run('corp.HQ.ice[0].subroutines[0].broken = true;'); // broken by another source
  assert(useAbility('runner.rig.programs[0]', 0)); settle();
  assert.strictEqual(run('runner.creditPool'), 5, 'no 2 credits');
  assert.strictEqual(run('runner.rig.programs[0].hasFullyBrokenThisTurn'), false);
});

test('Runner AI plans Bukhgalter breaks through a sentry', () => {
  setUpBoard({installed: [ID.Bukhgalter], hqIce: [ID.Rototurret], credits: 5, ai: true});
  const breaks = run(`(function () {
    var path = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, corp.HQ.ice.length - 1);
    if (!path) return -1;
    return Math.max.apply(null, path.map(function (point) {
      return point.sr_broken.filter(function (b) { return b.use.title == "Bukhgalter"; }).length;
    }));
  })()`);
  assert.strictEqual(breaks, 2, 'both Rototurret subroutines');
});

// ---------------- "Baklan" Bochkin ----------------
test('Baklan gains 1 power counter on the first encounter of each run', () => {
  setUpBoard({installed: [ID.Baklan], hqIce: [ID.IceWall, ID.Tithe]});
  run('AutomaticTriggers("automaticOnRunBegins", [corp.HQ]);');
  encounter(1); settle(); encounter(0); settle();
  assert.strictEqual(run('Counters(runner.rig.resources[0], "power")'), 1);
  run('AutomaticTriggers("automaticOnRunBegins", [corp.HQ]);');
  encounter(1); settle();
  assert.strictEqual(run('Counters(runner.rig.resources[0], "power")'), 2);
});

test('Baklan derezzes encountered ice of strength X or less and gives a tag; subroutines stop', () => {
  setUpBoard({installed: [ID.Baklan], hqIce: [ID.Tithe]});
  const k = 'runner.rig.resources[0]';
  run('AutomaticTriggers("automaticOnRunBegins", [corp.HQ]);');
  encounter(); settle();
  assert.strictEqual(run(`${k}.abilities[0].Enumerate.call(${k}).length`), 1, 'Tithe strength 1, 1 counter');
  run(`${k}.power = 0;`);
  assert.strictEqual(run(`${k}.abilities[0].Enumerate.call(${k}).length`), 0, 'not enough counters');
  run(`${k}.power = 3;`);
  assert.strictEqual(run(`${k}.abilities[0].Enumerate.call(${k})[0].id`), 1, 'X is the ice strength');
  assert(useAbility(k, 0)); settle();
  assert.strictEqual(run('corp.HQ.ice[0].rezzed'), false, 'derezzed');
  assert.strictEqual(run('runner.tags'), 1);
  assert.deepStrictEqual(titles(run('runner.heap')), ['“Baklan” Bochkin'], 'trashed as a cost');
  run('currentPhase = phases.runSubroutines; phases.runSubroutines.Init(); subroutine = 0;');
  assert.strictEqual(run('phases.runSubroutines.Enumerate.trigger().length'), 0, 'derezzed ice fires no subroutines');
  assert.strictEqual(run('CheckEncounter() && runner.rig.resources.length'), 0);
});

test('Runner AI plans a Baklan derez through ice it cannot break', () => {
  setUpBoard({installed: [ID.Baklan], hqIce: [ID.IceWall], credits: 5, ai: true});
  const k = 'runner.rig.resources[0]';
  run(`${k}.power = 1; runner.AI.cachedPotentials = [{server: corp.HQ, potential: 3}];`);
  const usesBaklan = () => run(`(function () {
    var path = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, corp.HQ.ice.length - 1);
    if (!path) return null;
    var last = path[path.length - 1];
    return last.persistents.some(function (p) { return p.use && p.use.title == "“Baklan” Bochkin" && p.action == "bypass"; });
  })()`);
  assert.strictEqual(usesBaklan(), true, 'counter on hand + first encounter covers strength 1');
  run(`${k}.power = 0;`);
  assert.strictEqual(usesBaklan(), true, 'the first encounter of the run supplies the counter');
  run(`${k}.power = 0; ${k}.encounteredThisRun = true; attackedServer = corp.HQ;`);
  assert.strictEqual(usesBaklan(), null, 'mid-run with no counters it cannot derez strength 1');
  run(`attackedServer = null; ${k}.power = 1; runner.AI.cachedPotentials = [{server: corp.HQ, potential: 1}];`);
  assert.strictEqual(usesBaklan(), null, 'kept for valuable runs');
});

test('Runner AI triggers Baklan during the encounter its path planned', async () => {
  setUpBoard({installed: [ID.Baklan], hqIce: [ID.IceWall], credits: 5, ai: true});
  run('runner.rig.resources[0].power = 1; runner.AI.cachedPotentials = [{server: corp.HQ, potential: 3}];');
  run('runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0, null, corp.HQ.ice.length - 1);');
  encounter(); settle();
  run('currentPhase = phases.runEncounterIce;');
  run('phaseOptions = {trigger: ChoicesTriggerableAbilities(runner), n: [{}]};');
  const optionList = run('["trigger", "n"]');
  const idx = await run('runner.AI').CommandChoice(optionList);
  assert.strictEqual(optionList[idx], 'trigger');
  assert.strictEqual(run('runner.AI.preferred && runner.AI.preferred.cardToTrigger && runner.AI.preferred.cardToTrigger.title'), '“Baklan” Bochkin');
});

// ---------------- The Class Act ----------------
test('The Class Act sends 1 of the top X cards to the bottom on the first draw each turn', () => {
  setUpBoard({installed: [ID.ClassAct], stack: [ID.HedgeFund, ID.Diesel, ID.SureGamble, ID.T400]});
  // stack top is the last element: T400, then Sure Gamble
  let offered = null;
  run('Draw(runner, 1)');
  settle((choices, card) => {
    if (card && card.title === 'The Class Act') {
      offered = titles(choices.map(choice => choice.card));
      return choices.find(choice => choice.card.title === 'T400 Memory Diamond');
    }
    return choices[0];
  });
  assert.deepStrictEqual(offered, ['T400 Memory Diamond', 'Sure Gamble'], 'X = 1 + 1');
  assert.deepStrictEqual(titles(run('runner.grip')), ['Sure Gamble'], 'drew the other looked-at card');
  assert.deepStrictEqual(titles(run('runner.stack')), ['T400 Memory Diamond', 'Hedge Fund', 'Diesel']);
  run('Draw(runner, 1)'); settle(noClassAct);
  assert.deepStrictEqual(titles(run('runner.grip')).sort(), ['Diesel', 'Sure Gamble'], 'only the first draw each turn');
});

test('The Class Act ignores later draws when a draw already happened this turn', () => {
  setUpBoard({grip: [ID.ClassAct], stack: [ID.HedgeFund, ID.Diesel, ID.SureGamble], credits: 5});
  run('Draw(runner, 1)'); settle();
  run('Install(runner.grip.find(function (c) { return c.title == "The Class Act"; }), null, false, null, true)'); settle();
  run('Draw(runner, 1)'); settle(noClassAct);
  assert.strictEqual(run('runner.grip.length'), 2, 'drawn normally, no interrupt choice');
});

test('The Class Act keeping the top card leaves the draw unchanged; empty stack offers nothing', () => {
  setUpBoard({installed: [ID.ClassAct], stack: [ID.HedgeFund, ID.Diesel, ID.SureGamble]});
  run('Draw(runner, 2)');
  settle((choices, card) => card && card.title === 'The Class Act' ? choices[choices.length - 1] : choices[0]);
  assert.deepStrictEqual(titles(run('runner.grip')).sort(), ['Diesel', 'Sure Gamble']);
  assert.deepStrictEqual(titles(run('runner.stack')), ['Hedge Fund'], 'top card moved to the bottom of a 1-card stack');
  setUpBoard({installed: [ID.ClassAct], stack: [ID.HedgeFund, ID.Diesel]});
  run('Draw(runner, 2)'); settle(noClassAct);
  assert.strictEqual(run('runner.grip.length'), 2, 'all looked-at cards are drawn anyway');
});

test('The Class Act draws 4 when a discard phase ends in the turn it was installed', () => {
  setUpBoard({grip: [ID.ClassAct], stack: [ID.HedgeFund, ID.Diesel, ID.SureGamble, ID.T400, ID.HedgeFund, ID.Diesel], credits: 5});
  run('Install(runner.grip[0], null, false, null, true)'); settle();
  assert.strictEqual(run('runner.creditPool'), 1);
  run('TriggeredResponsePhase(runner, "responseOnRunnerDiscardEnds", [], function () {}, "Discard Ends")');
  settle();
  assert.strictEqual(run('runner.grip.length'), 4, 'drew 4 (interrupt swapped one, count unchanged)');
  assert.strictEqual(run('runner.stack.length'), 2);
  run('runner.rig.resources[0].responseOnCorpTurnBegins.Resolve.call(runner.rig.resources[0]); turnEventCounts = {};');
  run('TriggeredResponsePhase(corp, "responseOnCorpDiscardEnds", [], function () {}, "Discard Ends")');
  settle();
  assert.strictEqual(run('runner.grip.length'), 4, 'not installed this turn');
});

test('Runner AI bottoms a duplicate unique with The Class Act', () => {
  setUpBoard({installed: [ID.ClassAct], stack: [ID.HedgeFund, ID.Masterwork, ID.Masterwork], ai: true});
  run('runner.rig.hardware = []; runner.AI.cardsWorthKeeping = [];');
  // the drawn Masterwork duplicates the unique one on top of the stack
  run('Draw(runner, 1)');
  const choices = run(`(function () {
    var ca = runner.rig.resources[0];
    return ca.responseOnCardsDrawn.Enumerate.call(ca, [runner.grip[0]]).map(function (c) { return c.card.title; });
  })()`);
  assert.deepStrictEqual(Array.from(choices), ['Masterwork (v37)'], 'AI returns a single duplicate unique to bottom');
});

test('Runner AI installs The Class Act when it wants cards and can pay', async () => {
  const choose = async credits => {
    setUpBoard({grip: [ID.ClassAct], stack: [ID.Diesel, ID.HedgeFund, ID.SureGamble, ID.T400, ID.Diesel],
      hqIce: [ID.IceWall], rndIce: [ID.IceWall], archivesIce: [ID.IceWall], credits, ai: true});
    run('EnumeratePhase();');
    const optionList = run('Object.keys(phaseOptions)');
    const idx = await run('runner.AI').CommandChoice(optionList);
    const card = run('runner.AI.preferred && runner.AI.preferred.cardToInstall');
    return optionList[idx] + ':' + (card ? card.title : '');
  };
  assert.strictEqual(await choose(8), 'install:The Class Act', 'nothing to run, wants cards');
  assert.notStrictEqual(await choose(3), 'install:The Class Act', 'cannot pay 4');
});

(async () => {
for (const {name, fn} of tests) {
  try { await fn(); cases++; if (verbose) console.log('ok   ' + name); }
  catch (error) { failures.push(name + ': ' + (verbose ? error.stack : error.message)); }
}
if (failures.length) {
  console.error(failures.length + ' failure(s):\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('downfall batch 4: ' + cases + ' cases passed');
})();
