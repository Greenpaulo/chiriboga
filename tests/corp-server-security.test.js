// Run with: node tests/corp-server-security.test.js
// Real AI classes/card definitions, with deterministic public-board engine helpers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const corp = {creditPool: 20, badPublicity: 0, scoreArea: [], HQ: {cards: []}, archives: {cards: []}};
const runner = {creditPool: 0, temporaryCredits: 0, clickTracker: 0, grip: [], stack: [], heap: [], cards: [], resolvingCards: [], AI: null};
const context = {console, corp, runner, playerTurn: runner, cardSet: {}, setIdentifiers: [], encountering: false, attackedServer: null, approachIce: -1};
let servers = [];
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.CheckCounters = (card, type, amount) => context.Counters(card, type) >= amount;
context.Strength = card => card.strength || 0;
context.Credits = player => player.creditPool;
context.AvailableCredits = context.Credits;
context.RezCost = card => card.rezCost || 0;
context.CheckCredits = (player, cost) => player.creditPool >= cost;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed && card.rezCost !== undefined;
context.AllottedClicks = player => player === runner ? 4 : 3;
context.InstalledCards = player => player === runner ? runner.cards : servers.reduce((cards, server) => cards.concat(server.ice, server.root), []);
context.ActiveCards = player => {
  const runnerCards = runner.cards.concat(runner.identityCard ? [runner.identityCard] : []);
  const corpCards = corp.scoreArea;
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckAdvance = card => card.canBeAdvanced || card.cardType === 'agenda';
context.AgendaPoints = player => player.agendaPoints || 0;
context.AgendaPointsToWin = () => 7;
context.ChoicesInstalledCards = (player, predicate) => context.InstalledCards(player).filter(predicate).map(card => ({card}));
context.BreakerMatchesIce = (breaker, ice) => (
  [['Fracter', 'Barrier'], ['Decoder', 'Code Gate'], ['Killer', 'Sentry']].some(types =>
    context.CheckSubType(breaker, types[0]) && context.CheckSubType(ice, types[1]))
);
context.PlayerCanLook = (player, card) => player === corp || !!card.rezzed;
context.GetServer = card => servers.find(server => server.ice.includes(card));
context.ServerName = server => server.serverName || 'Regression server';
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {}; runnerRC = new RunCalculator();', context);
const ai = context.reviewAI;
const card = id => Object.assign({}, context.cardSet[id]);
const ice = (texts, effects, extra) => Object.assign({title: 'Regression ice', player: corp,
  rezzed: true, rezCost: 1, strength: 3, subTypes: ['Barrier'],
  subroutines: texts.map(text => ({text})),
  AIImplementIce: effects ? function(rc, result) {result.sr = effects; return result;} : undefined,
}, extra);
const server = cards => {const result = {ice: cards, root: []}; servers = [result]; return result;};
const etr = () => ice(['End the run.'], [[['endTheRun']]]);
let tests = 0;
function test(name, body) {
  runner.cards = []; runner.identityCard = null; runner.AI = null;
  runner.grip = [{}, {}, {}, {}, {}]; runner.stack = Array(40).fill({}); runner.heap = []; runner.creditPool = 0;
  runner.temporaryCredits = 0; runner.clickTracker = 0; context.playerTurn = runner; context.attackedServer = null;
  runner.resolvingCards = [];
  corp.creditPool = 20; corp.badPublicity = 0; corp.scoreArea = []; servers = [];
  corp.HQ.cards = []; corp.agendaPoints = 0; runner.tags = 0; runner.agendaPoints = 0;
  ai._serverBaitDecisions = new WeakMap(); ai._agendaBluffDecisions = new WeakMap();
  ai._cardDeceptionProfiles = new WeakMap(); ai._random = Math.random;
  ai._protectionInstallsThisTurn = []; ai._serverProtectionDebt = new Map();
  ai._hasReachedCorpMainPhase = false;
  body(); tests++; console.log('PASS ' + name);
}

test('Corp classification never reads hidden grip properties or the Runner calculator', () => {
  runner.AI = {rc: context.runnerRC};
  runner.AI.rc.IceAI = () => {throw Error('Runner calculator used');};
  runner.grip = [{get installCost() {throw Error('Hidden grip read');}, get playCost() {throw Error('Hidden grip read');}}];
  const diviner = card(30046); diviner.rezzed = true; server([diviner]);
  assert.strictEqual(ai._requiredSubroutines(diviner), 1);
});
test('Mayfly Corp pricing never reads hidden titles or private Runner cache', () => {
  const mayfly = card(30032); runner.cards = [mayfly];
  runner.AI = {rc: context.runnerRC, _getCachedPotential() {throw Error('Private cache read');}};
  runner.grip = [{get title() {throw Error('Hidden title read');}}];
  const wall = etr(); server([wall]);
  assert.strictEqual(ai._estimateBreakCost(wall, mayfly), 3);
});
test('unrezzed minor ice uses actual hook, while Runner calculator still guesses', () => {
  const minor = ice(['Gain 1 credit.'], [[['misc_minor']]], {rezzed: false}); server([minor]);
  assert.strictEqual(ai._requiredSubroutines(minor), 0);
  vm.runInContext('freshRunnerRC = new RunCalculator()', context);
  assert.strictEqual(context.freshRunnerRC.IceAI(minor, 20).sr.length, 2);
});
test('no-hook ice uses actual printed subroutine count', () => {
  const unknown = ice(['Trash 1 program.', 'End the run.'], null, {rezzed: false}); server([unknown]);
  assert.strictEqual(ai._requiredSubroutines(unknown), 2);
});
[30006, 30005].forEach(id => test('Gateway breaker ' + id + ' pumps and rounds whole break batches without cardText', () => {
  const breaker = card(id); runner.cards = [breaker]; runner.creditPool = 10;
  const wall = ice(['End the run.'], [[['endTheRun']]], {strength: 4, subTypes: [id === 30006 ? 'Barrier' : 'Code Gate']}); server([wall]);
  assert.strictEqual(breaker.cardText, undefined);
  assert.strictEqual(ai._estimateBreakCost(wall, breaker), id === 30006 ? 3 : 4);
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, false);
}));
test('Unity hook uses fresh public breaker count', () => {
  const unity = card(30026); runner.cards = [unity, card(30006)];
  const gate = ice(['End the run.'], [[['endTheRun']]], {subTypes: ['Code Gate'], strength: 4}); server([gate]);
  assert.strictEqual(ai._estimateBreakCost(gate, unity), 3);
});
test('resource denial contributes avoidance tax but cannot prevent breach', () => {
  const breaker = {player: runner, title: 'Text fracter', strength: 3, subTypes: ['Icebreaker', 'Fracter'],
    cardText: '1 credit: Break 1 barrier subroutine. 1 credit: +1 strength.'};
  runner.cards = [breaker];
  const punishment = ice(['Trash 1 program.', 'Give the Runner 1 tag.'], [[['misc_moderate']], [['tag']]]);
  const result = ai._evaluateServerSecurity(server([punishment]));
  assert.strictEqual(result.totalBreakCost, 2);
  assert.strictEqual(result.totalMandatoryBreakCost, 0);
  assert.strictEqual(result.isSecure, false);
  runner.cards = [];
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, false);
});
test('optional punishment on ETR ice is excluded from mandatory expenditure', () => {
  const wall = ice(['Trash 1 program.', 'End the run.'], [[['misc_moderate']], [['endTheRun']]]);
  const breaker = {player: runner, title: 'Text fracter', strength: 3, subTypes: ['Icebreaker', 'Fracter'], cardText: '1 credit: Break 1 barrier subroutine.'};
  runner.cards = [breaker]; runner.creditPool = 1;
  const result = ai._evaluateServerSecurity(server([wall]));
  assert.strictEqual(result.totalBreakCost, 2); assert.strictEqual(result.totalMandatoryBreakCost, 1);
  assert.strictEqual(result.isSecure, false);
});
[0, 1].forEach(counters => test('Botulus with ' + counters + ' counter on ETR wall', () => {
  const wall = etr(); const botulus = card(30004); botulus.host = wall; botulus.virus = counters;
  wall.hostedCards = [botulus]; runner.cards = [botulus];
  assert.strictEqual(ai._evaluateServerSecurity(server([wall])).isSecure, counters === 0);
}));
test('partial Botulus covers mandatory ETR but not all avoidance; paid breaker covers remainder', () => {
  const wall = ice(['Trash 1 program.', 'End the run.'], [[['misc_moderate']], [['endTheRun']]]);
  const botulus = card(30004); botulus.virus = 1; botulus.host = wall;
  wall.hostedCards = [botulus]; runner.cards = [botulus]; server([wall]);
  assert.strictEqual(ai._hostedBreakerForIce(wall), null);
  assert.strictEqual(ai._estimateBreakCost(wall), Infinity);
  assert.strictEqual(ai._estimateBreakCost(wall, undefined, true), 0);
  runner.cards.push(card(30006));
  assert.strictEqual(ai._estimateBreakCost(wall), 1);
});
test('unrelated hosted card does not disable ETR ice', () => {
  const wall = etr(); wall.hostedCards = [{player: runner, title: 'Unrelated host'}];
  assert.strictEqual(ai._evaluateServerSecurity(server([wall])).hasHardLockout, true);
});
test('disabled Botulus and fracter-only ice reject hosted contribution', () => {
  const wall = etr(); const botulus = card(30004); botulus.virus = 2; botulus.host = wall;
  wall.hostedCards = [botulus]; runner.cards = [botulus]; server([wall]);
  botulus.disabled = true; assert.strictEqual(ai._hostedBreakContribution(wall), 0);
  botulus.disabled = false; wall.canOnlyBreakUsingFracter = true;
  assert.strictEqual(ai._hostedBreakContribution(wall), 0);
});
test('damage equal to grip is survivable; zero damage against empty grip is harmless', () => {
  const damage = ice(['Do 1 net damage.'], [[['netDamage']]]); server([damage]); runner.grip = [{}];
  assert.strictEqual(ai._iceIsLethal(damage), false);
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, false);
  runner.grip = []; assert.strictEqual(ai._iceIsLethal(damage), true);
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, true);
  const harmless = ice(['Gain 1 credit.'], [[['misc_minor']]]);
  assert.strictEqual(ai._iceIsLethal(harmless), false);
});
test('Tithe taxes a breach but is not secure when its damage is survivable', () => {
  const tithe = card(30073); tithe.rezzed = true; runner.grip = [{}, {}];
  const result = ai._evaluateServerSecurity(server([tithe]));
  assert.strictEqual(result.totalMandatoryBreakCost, 0);
  assert.strictEqual(result.isSecure, false);
});
test('game-saving Brân rez overrides reservation for a higher-value remote', () => {
  const rndBran = card(30039); rndBran.rezzed = false;
  const remoteBran = card(30039); remoteBran.rezzed = false;
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const rnd = {serverName: 'R&D', cards: [agenda, {cardType: 'operation'}], ice: [rndBran], root: []};
  const hq = {serverName: 'HQ', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const remote = {serverName: 'Remote 0', ice: [remoteBran], root: [agenda]};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote], creditPool: 8});
  servers = [hq, rnd, archives, remote];
  runner.agendaPoints = 5; runner.clickTracker = 2;

  assert.strictEqual(ai._icePreventsGameWinningBreach(rndBran, 6, rnd), true);
  assert.strictEqual(ai._iceWorthRezzing(rndBran, 6, rnd), true);

  runner.agendaPoints = 0;
  assert.strictEqual(ai._iceWorthRezzing(rndBran, 6, rnd), false);
});
test('approached Flyswatter does not save credits for equal-value Archives Mycoweb', () => {
  const flyswatter = card(35079); flyswatter.rezzed = false;
  const mycoweb = card(35053); mycoweb.rezzed = false;
  const hq = {serverName: 'HQ', cards: [], ice: [flyswatter], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [mycoweb], root: []};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [], creditPool: 9});
  servers = [hq, rnd, archives];
  runner.cards = [card(30005)]; runner.clickTracker = 3; runner.creditPool = 9;
  const messages = []; const oldLog = ai._log; ai._log = message => messages.push(message);
  try {
    assert.strictEqual(ai._iceWorthRezzing(flyswatter, 2, hq), true);
  } finally {
    ai._log = oldLog;
  }
  assert(messages.includes('Rez this is better than Mycoweb in Archives'));
});
test('approached Flyswatter rezzes when Runner has no clicks left', () => {
  const flyswatter = card(35079); flyswatter.rezzed = false;
  const mycoweb = card(35053); mycoweb.rezzed = false;
  const hq = {serverName: 'HQ', cards: [], ice: [flyswatter], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [mycoweb], root: []};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [], creditPool: 9});
  servers = [hq, rnd, archives];
  runner.cards = [card(30005)]; runner.clickTracker = 0; runner.creditPool = 9;
  assert.strictEqual(ai._iceWorthRezzing(flyswatter, 2, hq), true);
});
test('approached Flyswatter still saves for Mycoweb on a higher-value remote', () => {
  const flyswatter = card(35079); flyswatter.rezzed = false;
  const mycoweb = card(35053); mycoweb.rezzed = false;
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const hq = {serverName: 'HQ', cards: [], ice: [flyswatter], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const remote = {serverName: 'Remote 0', ice: [mycoweb], root: [agenda]};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote], creditPool: 9});
  servers = [hq, rnd, archives, remote];
  runner.cards = [card(30005)]; runner.clickTracker = 3; runner.creditPool = 9;
  assert.strictEqual(ai._iceWorthRezzing(flyswatter, 2, hq), false);
});
test('same-server ICE ordering retains the protection-value tie-break', () => {
  const flyswatter = card(35079); flyswatter.rezzed = false;
  const mycoweb = card(35053); mycoweb.rezzed = false;
  const hq = {serverName: 'HQ', cards: [], ice: [mycoweb, flyswatter], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [], creditPool: 9});
  servers = [hq, rnd, archives];
  runner.cards = [card(30005)]; runner.clickTracker = 3; runner.creditPool = 9;
  assert.strictEqual(ai._iceWorthRezzing(flyswatter, 2, hq), false);
});
test('game point does not force a non-stopping ICE rez', () => {
  const tithe = card(30073); tithe.rezzed = false;
  const remoteBran = card(30039); remoteBran.rezzed = false;
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const rnd = {serverName: 'R&D', cards: [agenda], ice: [tithe], root: []};
  const hq = {serverName: 'HQ', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const remote = {serverName: 'Remote 0', ice: [remoteBran], root: [agenda]};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote], creditPool: 6});
  servers = [hq, rnd, archives, remote];
  runner.agendaPoints = 5; runner.clickTracker = 2; runner.grip = [{}, {}];

  assert.strictEqual(ai._icePreventsGameWinningBreach(tithe, 1, rnd), false);
  assert.strictEqual(ai._iceWorthRezzing(tithe, 1, rnd), false);
});
test('lethal multiple damage subroutines require only enough breaks to survive', () => {
  runner.grip = [{}]; const damage = ice(['Do 1 net damage.', 'Do 1 net damage.'], [[['netDamage']], [['netDamage']]]); server([damage]);
  const breaker = {player: runner, title: 'Text breaker', strength: 3, cardText: '1 credit: Break 1 subroutine.'};
  assert.strictEqual(ai._estimateBreakCost(damage, breaker, true), 1);
});
test('text fallback rounds pump and break activation batches', () => {
  const wall = ice(['End the run.', 'End the run.', 'End the run.'], null, {strength: 4}); server([wall]);
  const breaker = {strength: 3, cardText: '2 credits: Break up to 2 subroutines. 2 credits: +2 strength.'};
  assert.strictEqual(ai._estimateBreakCost(wall, breaker), 6);
});
test('HTML and credit-symbol text fallback works', () => {
  const wall = etr(); wall.strength = 4; server([wall]);
  const breaker = {strength: 3, cardText: '<strong>1[credit]:</strong> Break up to 2 subroutines. <strong>2[c]:</strong> +2 strength.'};
  assert.strictEqual(ai._estimateBreakCost(wall, breaker), 3);
});
[false, true].forEach(aiRunner => test('Quetzal matching for ' + (aiRunner ? 'AI' : 'human') + ' Runner respects usedThisTurn', () => {
  const quetzal = card(31001); runner.identityCard = quetzal;
  if (aiRunner) runner.AI = {rc: context.runnerRC};
  const wall = etr(); server([wall]);
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, false);
  quetzal.usedThisTurn = true;
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).hasHardLockout, true);
}));
test('Quetzal cannot freely break multiple barriers or multiple subroutines', () => {
  runner.identityCard = card(31001); const first = etr(), second = etr();
  assert.strictEqual(ai._evaluateServerSecurity(server([first, second])).isSecure, true);
  const double = ice(['End the run.', 'End the run.'], [[['endTheRun']], [['endTheRun']]]);
  assert.strictEqual(ai._evaluateServerSecurity(server([double])).isSecure, true);
});
test('unaffordable unrezzed ice does not protect server', () => {
  corp.creditPool = 0; const wall = etr(); wall.rezzed = false;
  assert.strictEqual(ai._evaluateServerSecurity(server([wall])).isSecure, false);
});
test('already broken subroutines do not create mandatory breaks', () => {
  const wall = ice(['End the run.'], null); wall.subroutines[0].broken = true;
  assert.strictEqual(ai._evaluateServerSecurity(server([wall])).isSecure, false);
});
test('an unbreakable first matching breaker does not hide a usable second breaker', () => {
  const fixed = {player: runner, title: 'Fixed fracter', strength: 1, AIFixedStrength: true,
    subTypes: ['Icebreaker', 'Fracter'], cardText: '1 credit: Break 1 barrier subroutine.'};
  runner.cards = [fixed, card(30006)]; runner.creditPool = 1;
  assert.strictEqual(ai._evaluateServerSecurity(server([etr()])).isSecure, false);
});
test('Corp classification restores real encounter state helpers', () => {
  const wall = etr(); server([wall]);
  const oldServer = {name: 'Previous server'};
  context.encountering = true; context.attackedServer = oldServer; context.approachIce = 7;
  ai._requiredSubroutines(wall);
  assert.strictEqual(context.encountering, true);
  assert.strictEqual(context.attackedServer, oldServer);
  assert.strictEqual(context.approachIce, 7);
});
test('Mayfly Runner-owned pricing keeps the existing spare-in-grip decision', () => {
  const mayfly = card(30032); const wall = etr(); const target = server([wall]);
  let offers = 0;
  const rc = {ImplementIcebreaker() {offers++; return [];}};
  runner.AI = {rc, _getCachedPotential() {return 0;}};
  const iceAI = {ice: wall};
  runner.grip = [];
  mayfly.AIImplementBreaker(rc, [], {}, target, 1, iceAI, 3, 3, 10);
  assert.strictEqual(offers, 0);
  runner.grip = [{title: 'Mayfly'}];
  mayfly.AIImplementBreaker(rc, [], {}, target, 1, iceAI, 3, 3, 10);
  assert.strictEqual(offers, 1);
});
test('hosted subtype shifts let an installed decoder cover non-code-gate ice', () => {
  const wall = etr();
  const chromatophores = card(35030); chromatophores.host = wall;
  const decoder = card(30005);
  runner.cards = [chromatophores, decoder]; runner.creditPool = 5;
  server([wall]);
  assert(ai._effectiveIceSubtypes(wall).includes('Code Gate'));
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).isSecure, false);
});
test('effective subtype matching never swaps the live ice subtype array', () => {
  const wall = etr();
  const printedSubTypes = wall.subTypes;
  let observedSubTypes = null;
  const shift = {player: runner, AIEffectiveIceSubtypes: () => ({add: ['Code Gate']})};
  const breaker = {
    player: runner,
    AIMatchingBreakerInstalled(target, effectiveSubTypes) {
      observedSubTypes = target.subTypes;
      return effectiveSubTypes.includes('Code Gate') ? this : null;
    },
  };
  runner.cards = [shift, breaker];
  server([wall]);
  assert.strictEqual(ai._matchingBreakerForIce(wall), breaker);
  assert.strictEqual(observedSubTypes, printedSubTypes);
  assert.strictEqual(wall.subTypes, printedSubTypes);
  assert.deepStrictEqual(wall.subTypes, ['Barrier']);
});
test('Kit shifts only the first ice encountered for Corp planning', () => {
  const inner = etr(), outer = etr();
  runner.identityCard = card(31026);
  runner.cards = [card(30005)]; runner.creditPool = 10;
  server([inner, outer]);
  assert(ai._effectiveIceSubtypes(outer, servers[0], 1).includes('Code Gate'));
  assert(!ai._effectiveIceSubtypes(inner, servers[0], 0).includes('Code Gate'));
  assert.strictEqual(ai._evaluateServerSecurity(servers[0]).hasHardLockout, true);
});
test('generic first-encounter subtype wording applies only to the outermost relevant ice', () => {
  const inner = etr(), outer = etr();
  runner.cards = [{player: runner, usedThisTurn: false,
    cardText: 'The first time each turn you encounter a piece of ice, treat it as a code gate.'}];
  server([inner, outer]);
  assert(ai._effectiveIceSubtypes(outer, servers[0], 1).includes('Code Gate'));
  assert(!ai._effectiveIceSubtypes(inner, servers[0], 0).includes('Code Gate'));
});
test('targeted bypass pays its declared cost instead of treating hosted cards as disabling ice', () => {
  const wall = etr();
  const femme = card(31022); femme.chosenCard = wall;
  runner.cards = [femme]; runner.creditPool = 1;
  const result = ai._evaluateServerSecurity(server([wall]));
  assert.strictEqual(ai._iceIsBypassed(wall, servers[0], 0), true);
  assert.strictEqual(result.totalMandatoryBreakCost, 1);
  assert.strictEqual(result.isSecure, false);
  runner.creditPool = 0;
  const unaffordable = ai._evaluateServerSecurity(servers[0]);
  assert.strictEqual(unaffordable.hasHardLockout, false);
  assert.strictEqual(unaffordable.isSecure, true);
});
test('targeted bypass affordability uses the effective Runner credit ceiling', () => {
  const wall = etr();
  runner.cards = [{player: runner, AIBypassesIce: target => target === wall ? 1 : false}];
  runner.creditPool = 0;
  corp.badPublicity = 1;
  const target = server([wall]);
  assert.strictEqual(ai._iceIsBypassed(wall, target, 0), true);
});
test('targeted bypass is not paid when an ice has no mandatory effect', () => {
  const harmless = ice(['Trash 1 program.'], [[['misc_moderate']]]);
  const bypass = {player: runner, AIBypassesIce: target => target === harmless ? 1 : false};
  runner.cards = [bypass]; runner.creditPool = 0;
  const result = ai._evaluateServerSecurity(server([harmless]));
  assert.strictEqual(result.totalMandatoryBreakCost, 0);
  assert.strictEqual(result.isSecure, false);
});
test('one-shot outer bypass defeats one layer but not a second inner ETR', () => {
  const bypass = {player: runner, AIBypassesOutermostIce: () => true};
  runner.cards = [bypass];
  assert.strictEqual(ai._evaluateServerSecurity(server([etr()])).isSecure, false);
  assert.strictEqual(ai._evaluateServerSecurity(server([etr(), etr()])).hasHardLockout, true);
});
test('poor Corp may layer a breachable agenda remote with unrezzed ICE', () => {
  const unrezzedWall = etr(); unrezzedWall.rezzed = false;
  const target = {serverName: 'Remote 0', ice: [unrezzedWall], root: [{player: corp, cardType: 'agenda', agendaPoints: 3}]};
  servers = [target];
  runner.cards = [card(30006)]; runner.creditPool = 10;
  assert.strictEqual(ai._evaluateServerSecurity(target).isSecure, false);
  assert.strictEqual(ai._shouldInstallIceLayer(target, false), true);
});
test('poor Corp does not layer an empty remote with unrezzed ICE', () => {
  const unrezzedWall = etr(); unrezzedWall.rezzed = false;
  const target = {serverName: 'Remote 0', ice: [unrezzedWall], root: []};
  servers = [target];
  runner.cards = [card(30006)]; runner.creditPool = 10;
  assert.strictEqual(ai._shouldInstallIceLayer(target, false), false);
});
test('poor Corp does not layer a secure agenda remote with unrezzed ICE', () => {
  const unrezzedWall = etr(); unrezzedWall.rezzed = false;
  const target = {serverName: 'Remote 0', ice: [unrezzedWall], root: [{player: corp, cardType: 'agenda', agendaPoints: 3}]};
  servers = [target];
  runner.cards = []; runner.creditPool = 10;
  assert.strictEqual(ai._evaluateServerSecurity(target).isSecure, true);
  assert.strictEqual(ai._shouldInstallIceLayer(target, false), false);
});
test('choosing an agenda install records a scoring-plan commitment', () => {
  const agenda = {player: corp, cardType: 'agenda'};
  assert.strictEqual(
    ai._returnPreference(['install'], 'install', {cardToInstall: agenda}),
    0,
  );
  assert.strictEqual(agenda.AIScoringPlanCommitted, true);
  ai.preferred = null;
});
test('outermost bypass falls through ice the Corp cannot afford to rez', () => {
  const bypass = {player: runner, AIBypassesOutermostIce: () => true};
  const inner = etr(), outer = etr(); outer.rezzed = false; outer.rezCost = 3;
  runner.cards = [bypass]; corp.creditPool = 0;
  assert.strictEqual(ai._evaluateServerSecurity(server([inner, outer])).isSecure, false);
});
test('a flexible one-ice bypass targets the hard lockout and leaves another layer', () => {
  const bypass = {player: runner, AIBypassesOneIce: () => true};
  const inner = etr();
  const outer = ice(['Gain 1 credit.'], [[['misc_minor']]]);
  runner.cards = [bypass];
  const result = ai._evaluateServerSecurity(server([inner, outer]));
  assert.strictEqual(ai._oneShotIceBypassTarget(servers[0]), inner);
  assert.strictEqual(result.isSecure, false);
});
test('single-ice agenda remote receives structural risk only while bypass is live', () => {
  const remote = {ice: [etr()], root: [{cardType: 'agenda', agendaPoints: 2, advancement: 1}]};
  servers = [remote];
  runner.cards = [{player: runner, AIBypassesOutermostIce: () => true}];
  assert.strictEqual(ai._serverStructuralRisk(remote), 5);
  remote.ice.push(etr());
  assert.strictEqual(ai._serverStructuralRisk(remote), 0);
});
test('public hidden-threat risk uses faction, grip size, and Heap evidence', () => {
  const remote = server([etr()]);
  runner.identityCard = {faction: 'Criminal'};
  runner.grip = Array(5).fill({}); runner.stack = Array(35).fill({});
  const fullGripRisk = ai._estimateRunnerBypassRisk(remote);
  assert(fullGripRisk > 0);
  runner.grip = [{}]; runner.stack = Array(39).fill({});
  assert(ai._estimateRunnerBypassRisk(remote) < fullGripRisk);
  runner.grip = Array(5).fill({}); runner.stack = Array(35).fill({});
  runner.heap = [card(31018), card(31018), card(31018)];
  assert(ai._estimateRunnerBypassRisk(remote) < fullGripRisk);
  runner.heap.push(card(31017), card(31017), card(31017));
  assert.strictEqual(ai._estimateRunnerBypassRisk(remote), 0);
});
test('hidden-threat estimator never inspects grip contents and ignores layered servers', () => {
  runner.identityCard = {faction: 'Criminal'};
  runner.grip = [{get title() {throw Error('Hidden grip read');}}];
  runner.stack = Array(39).fill({});
  assert(ai._estimateRunnerBypassRisk(server([etr()])) > 0);
  servers[0].ice.push(etr());
  assert.strictEqual(ai._estimateRunnerBypassRisk(servers[0]), 0);
});
test('hidden-threat definitions are cached by public Runner faction', () => {
  let profileReads = 0;
  const definition = {player: runner, faction: 'Cache Test Faction'};
  Object.defineProperty(definition, 'AIHiddenThreat', {
    get() {
      profileReads++;
      return {kind: 'cache-test', expectedCopies: 1, severity: 1, AppliesToServer: () => true};
    },
  });
  context.cardSet[99999] = definition;
  runner.identityCard = {faction: 'Cache Test Faction'};
  const remote = server([etr()]);
  ai._estimateRunnerBypassRisk(remote);
  ai._estimateRunnerBypassRisk(remote);
  delete context.cardSet[99999];
  assert.strictEqual(profileReads, 1);
});
test('unrezzed-ice pressure applies only to a single unrezzed layer', () => {
  runner.identityCard = {faction: 'Criminal'};
  const wall = etr(); wall.rezzed = false;
  const remote = server([wall]);
  const unrezzedRisk = ai._estimateRunnerBypassRisk(remote);
  wall.rezzed = true;
  const rezzedRisk = ai._estimateRunnerBypassRisk(remote);
  assert(unrezzedRisk > rezzedRisk);
  runner.identityCard = {faction: 'Shaper'};
  assert(ai._estimateRunnerBypassRisk(remote) < rezzedRisk);
});
test('hidden threats affect protection urgency but not deterministic security', () => {
  runner.identityCard = {faction: 'Criminal'};
  const remote = server([etr()]);
  const risk = ai._estimateRunnerBypassRisk(remote);
  const security = ai._evaluateServerSecurity(remote);
  assert(risk > 0);
  assert.strictEqual(security.publicThreatRisk, risk);
  assert.strictEqual(security.hasHardLockout, true);
  const withoutRisk = ai._protectionScore(remote, {}) + risk;
  runner.heap = [card(31018), card(31018), card(31018)];
  //Forged Activation Orders does not apply to this rezzed layer.
  assert(Math.abs(ai._protectionScore(remote, {}) - withoutRisk) < 1e-9);
});
test('effective credit pool combines public bad publicity and click economy', () => {
  const target = server([etr()]);
  runner.clickTracker = 4;
  corp.badPublicity = 2;
  const pool = ai._effectiveRunnerCreditPool(target);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pool)), {
    baseCredits: 0, temporaryCredits: 0, recurringCredits: 0,
    badPublicityCredits: 2, clickCredits: 3, total: 5,
  });
});
test('Corp-turn security projects the next Runner click allotment', () => {
  const costly = ice(['End the run.', 'End the run.', 'End the run.'],
    [[['endTheRun']], [['endTheRun']], [['endTheRun']]]);
  const breaker = {player: runner, strength: 3, subTypes: ['Icebreaker', 'Fracter'],
    cardText: '1 credit: Break 1 barrier subroutine.'};
  runner.cards = [breaker]; runner.clickTracker = 0; context.playerTurn = corp;
  const result = ai._evaluateServerSecurity(server([costly]));
  assert.strictEqual(result.runnerCreditPool.clickCredits, 3);
  assert.strictEqual(result.totalMandatoryBreakCost, 3);
  assert.strictEqual(result.isSecure, false);
});
test('breaker-compatible hosted credits count but trash-only credits do not', () => {
  const wall = ice(['End the run.', 'End the run.'], [[['endTheRun']], [['endTheRun']]]);
  const breaker = {player: runner, strength: 3, subTypes: ['Icebreaker', 'Fracter'],
    cardText: '1 credit: Break 1 barrier subroutine.'};
  const breakerCredits = {player: runner, credits: 2,
    canUseCredits: (doing, target) => doing === 'using' && target === breaker};
  const trashCredits = {player: runner, credits: 9,
    canUseCredits: doing => doing === 'paying trash costs'};
  runner.cards = [breaker, breakerCredits, trashCredits];
  const result = ai._evaluateServerSecurity(server([wall]));
  assert.strictEqual(result.runnerCreditPool.recurringCredits, 2);
  assert.strictEqual(result.runnerCredits, 2);
  assert.strictEqual(result.isSecure, false);
});
test('server credit hook is route-aware and is not double counted with hosted credits', () => {
  const central = {cards: [], ice: [etr()], root: []};
  const remote = {ice: [etr()], root: []};
  servers = [central, remote];
  const breaker = {player: runner, strength: 3, subTypes: ['Icebreaker', 'Fracter'],
    cardText: '1 credit: Break 1 barrier subroutine.'};
  const source = {player: runner, credits: 2,
    canUseCredits: doing => doing === 'using',
    AIRunPoolCreditOffset: target => typeof target.cards !== 'undefined' ? 2 : 0};
  runner.cards = [breaker, source];
  assert.strictEqual(ai._effectiveRunnerCreditPool(central).recurringCredits, 2);
  assert.strictEqual(ai._effectiveRunnerCreditPool(remote).recurringCredits, 2);
  assert.strictEqual(context.attackedServer, null);
});
test('an active run uses temporary credits without adding future clicks or bad pub twice', () => {
  const target = server([etr()]);
  runner.creditPool = 1; runner.temporaryCredits = 2; runner.clickTracker = 3;
  corp.badPublicity = 2; context.attackedServer = target;
  const pool = ai._effectiveRunnerCreditPool(target);
  assert.strictEqual(pool.baseCredits, 1);
  assert.strictEqual(pool.temporaryCredits, 2);
  assert.strictEqual(pool.badPublicityCredits, 0);
  assert.strictEqual(pool.clickCredits, 0);
  assert.strictEqual(pool.total, 3);
});
test('server redirects are detected by hook and generic wording without title checks', () => {
  Object.assign(corp, {HQ: {cards: [], ice: [], root: []}, archives: {cards: [], ice: [], root: []}});
  runner.cards = [{player: runner, AIRedirectsRun: (from, to) => from === corp.archives && to === corp.HQ}];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  runner.cards = [{player: runner, cardText: 'click: Run Archives. Change the attacked server to HQ.'}];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
});
test('central pressure aggregates installed public hooks and stays server-specific', () => {
  Object.assign(corp, {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []}});
  runner.cards = [
    {player: runner, AICentralPressure: target => target === corp.RnD ? {additionalAccess: 2, growth: 1} : {}},
    {player: runner, AICentralPressure: target => target === corp.RnD ? {persistentPressure: 1} : {}},
    {player: runner, disabled: true, AICentralPressure: () => {throw Error('disabled hook called');}},
  ];
  const threat = ai._centralServerThreat(corp.RnD);
  assert.strictEqual(threat.additionalAccess, 2);
  assert.strictEqual(threat.persistentPressure, 1);
  assert.strictEqual(threat.growth, 1);
  assert.strictEqual(threat.sources, 2);
  assert.strictEqual(threat.penalty, 6);
  assert.strictEqual(ai._centralServerThreat(corp.HQ).penalty, 0);
});
test('scoped installed multi-access cards expose out-of-run public pressure', () => {
  Object.assign(corp, {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []}});
  const docklands = card(30013), conduit = card(30024), drone = card(35031);
  conduit.virus = 2; drone.power = 1; runner.cards = [docklands, conduit, drone];
  assert.strictEqual(ai._centralServerThreat(corp.HQ).additionalAccess, 1);
  const rnd = ai._centralServerThreat(corp.RnD);
  assert.strictEqual(rnd.additionalAccess, 3);
  assert.strictEqual(rnd.growth, 2);
  assert.strictEqual(ai._classifyRunnerMacroThreat().focus, 'rd');
  drone.power = 0;
  assert.strictEqual(ai._centralServerThreat(corp.RnD).additionalAccess, 2);
});
test('macro classification distinguishes central focus and persistent win conditions', () => {
  Object.assign(corp, {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []}});
  runner.cards = [{player: runner, AICentralPressure: target => target === corp.RnD ? {persistentPressure: 2} : {}}];
  const classification = ai._classifyRunnerMacroThreat();
  assert.strictEqual(classification.centralFocused, true);
  assert.strictEqual(classification.nonInteractive, true);
  assert.strictEqual(classification.focus, 'rd');
});
test('central pressure never reads hidden Runner card identities', () => {
  Object.assign(corp, {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []}});
  runner.grip = [{get title() {throw Error('hidden grip read');}}];
  runner.stack = [{get title() {throw Error('hidden stack read');}}];
  runner.cards = [{player: runner, AICentralPressure: target => target === corp.HQ ? 2 : 0}];
  assert.strictEqual(ai._centralServerThreat(corp.HQ).additionalAccess, 2);
});
test('central pressure directly increases protection urgency', () => {
  Object.assign(corp, {
    HQ: {cards: [], ice: [], root: []},
    RnD: {cards: [], ice: [], root: []},
    archives: {cards: [], ice: [], root: []},
    remoteServers: [],
  });
  runner.cards = [{player: runner, AICentralPressure: target => target === corp.RnD ? {additionalAccess: 2} : {}}];
  const pressured = ai._protectionScore(corp.RnD, {});
  runner.cards = [];
  const baseline = ai._protectionScore(corp.RnD, {});
  assert.strictEqual(pressured, baseline - 3);
});
test('central breach loss risk uses fair combinations rather than hidden order', () => {
  const agenda = () => ({player: corp, cardType: 'agenda', agendaPoints: 2});
  const operation = () => ({player: corp, cardType: 'operation'});
  Object.assign(corp, {
    HQ: {cards: [], ice: [], root: []},
    RnD: {cards: [agenda(), agenda(), operation(), operation()], ice: [], root: []},
    archives: {cards: [], ice: [], root: []},
    remoteServers: [],
  });
  runner.agendaPoints = 5;
  runner.cards = [{player: runner, AICentralPressure: target =>
    target === corp.RnD ? {additionalAccess: 1} : {}}];
  const risk = ai._centralBreachLossRisk(corp.RnD);
  assert.strictEqual(risk.accessCount, 2);
  assert(Math.abs(risk.probability - (5 / 6)) < 1e-9);
  assert.strictEqual(risk.canBreach, true);
});
test('critical Conduit pressure triggers purge before a non-winning score', () => {
  const agenda = () => ({player: corp, cardType: 'agenda', agendaPoints: 2});
  const operation = () => ({player: corp, cardType: 'operation'});
  Object.assign(corp, {
    HQ: {cards: [], ice: [], root: []},
    RnD: {cards: [agenda(), agenda(), agenda(), operation(), operation(), operation(), operation(), operation(), operation(), operation()], ice: [], root: []},
    archives: {cards: [], ice: [], root: []},
    remoteServers: [],
    clickTracker: 3,
  });
  const conduit = card(30024); conduit.virus = 4; runner.cards = [conduit];
  runner.agendaPoints = 5; corp.agendaPoints = 3;
  const nonWinningAgenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  assert.strictEqual(ai._criticalBreachDefenseAction(['purge', 'advance'], nonWinningAgenda), 0);
  corp.agendaPoints = 5;
  assert.strictEqual(ai._criticalBreachDefenseAction(['purge', 'advance'], nonWinningAgenda), -1);
});
test('critical defence prefers ICE that actually secures the threatened central', () => {
  const agenda = () => ({player: corp, cardType: 'agenda', agendaPoints: 2});
  const operation = () => ({player: corp, cardType: 'operation'});
  const wall = etr(); wall.cardType = 'ice'; wall.rezzed = false; wall.rezCost = 1;
  Object.assign(corp, {
    HQ: {cards: [wall], ice: [], root: []},
    RnD: {cards: [agenda(), agenda(), operation(), operation()], ice: [], root: []},
    archives: {cards: [], ice: [], root: []},
    remoteServers: [],
    clickTracker: 3,
  });
  servers = [corp.HQ, corp.RnD, corp.archives];
  runner.identityCard = {faction: 'Shaper'};
  runner.agendaPoints = 5;
  runner.cards = [{player: runner, AICentralPressure: target =>
    target === corp.RnD ? {additionalAccess: 1} : {}}];
  const oldRankedInstallOptions = ai._rankedInstallOptions;
  ai._rankedInstallOptions = () => [{cardToInstall: wall, serverToInstallTo: corp.RnD}];
  try {
    ai.preferred = null;
    assert.strictEqual(ai._criticalBreachDefenseAction(['install', 'purge']), 0);
    assert.strictEqual(ai.preferred.cardToInstall, wall);
    assert.strictEqual(ai.preferred.serverToInstallTo, corp.RnD);
  } finally {
    ai._rankedInstallOptions = oldRankedInstallOptions;
  }
});
test('modest breach risk does not interrupt ordinary advancement', () => {
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 1};
  const operations = Array.from({length: 9}, () => ({player: corp, cardType: 'operation'}));
  Object.assign(corp, {
    HQ: {cards: [], ice: [], root: []},
    RnD: {cards: [agenda].concat(operations), ice: [], root: []},
    archives: {cards: [], ice: [], root: []},
    remoteServers: [],
    clickTracker: 3,
  });
  runner.agendaPoints = 6;
  assert.strictEqual(ai._centralBreachLossRisk(corp.RnD).probability, 0.1);
  assert.strictEqual(ai._criticalBreachDefenseAction(['purge', 'advance']), -1);
});
test('access-punishment hooks drive a severity-weighted bait frequency', () => {
  const mildCard = card(30045); mildCard.advancement = 0;
  const severeCard = card(30045); severeCard.advancement = 4;
  const mild = {ice: [], root: [mildCard]};
  const severe = {ice: [], root: [severeCard]};
  assert.strictEqual(mildCard.AIPunishesAccess(mild), 2);
  assert.strictEqual(severeCard.AIPunishesAccess(severe), 6);
  assert(ai._calculateBaitFrequency(severe) < ai._calculateBaitFrequency(mild));
});
test('Snare access punishment is live only while its trigger is affordable', () => {
  const snare = card(31054);
  const remote = {ice: [], root: [snare]};
  corp.creditPool = 4;
  assert.strictEqual(snare.AIPunishesAccess(remote), 4);
  corp.creditPool = 3;
  assert.strictEqual(snare.AIPunishesAccess(remote), 0);
});
test('bait posture rolls once per installed trap and can stop extra protection', () => {
  const trap = card(30045);
  const remote = {ice: [etr()], root: [trap]};
  let rolls = 0;
  ai._random = () => {rolls++; return 0;};
  assert.strictEqual(ai._NoMoreProtectionForThisServer(remote), true);
  ai._random = () => {throw Error('bait posture rerolled');};
  assert.strictEqual(ai._NoMoreProtectionForThisServer(remote), true);
  assert.strictEqual(rolls, 4); //one posture decision and three shared-script dimensions
});
test('a failed bait roll permits ordinary trap protection', () => {
  const trap = card(30045);
  const remote = {ice: [etr()], root: [trap]};
  ai._random = () => 1;
  assert.strictEqual(ai._shouldBaitServer(remote), false);
  assert.strictEqual(ai._NoMoreProtectionForThisServer(remote), false);
});
test('bait posture is disabled when breaching the same root could win the game', () => {
  const trap = card(30045);
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2};
  const remote = {ice: [etr()], root: [trap, agenda]};
  runner.agendaPoints = 5;
  ai._random = () => {throw Error('unsafe bait posture rolled');};
  assert.strictEqual(ai._shouldBaitServer(remote), false);
});
test('agenda bluff supports variable ice depth and never risks the winning steal', () => {
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2, canBeAdvanced: true};
  const remote = {ice: [etr()], root: [agenda]};
  const rolls = [0, 0.6, 0.2, 0.8]; //active, two ice, one advance, no delay
  ai._random = () => rolls.shift();
  assert.strictEqual(ai._NoMoreProtectionForThisServer(remote), false);
  remote.ice.push(etr());
  assert.strictEqual(ai._NoMoreProtectionForThisServer(remote), true);
  runner.agendaPoints = 5;
  assert.strictEqual(ai._shouldBluffAgendaServer(remote), false);
  runner.agendaPoints = 0; corp.agendaPoints = 5;
  assert.strictEqual(ai._shouldBluffAgendaServer(remote), false);
});
test('shared remote posture varies install shape and advancement cadence', () => {
  const agenda = {player: corp, cardType: 'agenda', agendaPoints: 2, canBeAdvanced: true, advancement: 0};
  const remote = {ice: [etr()], root: [agenda]};
  const rolls = [0, 0.9, 0.2, 0.1]; //active, three ice, one opening advance, wait a turn
  ai._random = () => rolls.shift();
  assert.strictEqual(ai._deceptionAdvancementTarget(agenda, remote, 4), 0);
  agenda.AITurnsInstalled = 1;
  assert.strictEqual(ai._deceptionAdvancementTarget(agenda, remote, 4), 1);
  agenda.AITurnsInstalled = 2;
  assert.strictEqual(ai._deceptionAdvancementTarget(agenda, remote, 4), 4);
  assert.strictEqual(ai._deceptionInstallDistance(agenda, remote), 2);
  remote.ice.push(etr(), etr());
  assert.strictEqual(ai._deceptionInstallDistance(agenda, remote), 0);
});
test('tag punishment is bounded deterrence and never deterministic security', () => {
  const punishment = {player: corp, cardType: 'operation', playCost: 2, AITagPunishment: 1};
  corp.HQ.cards = [punishment]; runner.tags = 1; corp.creditPool = 2;
  const remote = server([]);
  assert.strictEqual(ai._tagPunishmentDeterrence(remote), 2);
  const security = ai._evaluateServerSecurity(remote);
  assert.strictEqual(security.deterrence, 2);
  assert.strictEqual(security.isSecure, false);
  corp.creditPool = 1;
  assert.strictEqual(ai._tagPunishmentDeterrence(remote), 0);
});
test('protection allocation rotates through insecure servers during a turn', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: [], score: 0};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: [], score: 1};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: [], score: 10};
  const remote = {serverName: 'Remote 1', ice: [], root: [], score: 2};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [remote]});
  runner.identityCard = {faction: 'Criminal'};
  ai._protectionScore = target => target ? target.score : 1;
  ai._evaluateServerSecurity = () => ({isSecure: false});
  ai._isAScoringServer = () => false;
  ai._emptyProtectedRemotes = () => [remote];
  ai._HVTsInstalled = () => 0;
  ai._protectionInstallsThisTurn = [];
  ai._serverProtectionDebt = new Map();
  assert.strictEqual(ai._serverToProtect(), hq);
  ai._recordProtectionInstall(hq);
  assert.strictEqual(ai._serverToProtect(), rnd);
  ai._recordProtectionInstall(rnd);
  assert.strictEqual(ai._serverToProtect(), remote);
});
test('empty Archives is never selected for protection', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: [], score: 1};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: [], score: 2};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: [], score: 0};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: []});
  runner.identityCard = {faction: 'Criminal'};
  ai._protectionScore = target => target ? target.score : 3;
  ai._evaluateServerSecurity = () => ({isSecure: false});
  ai._emptyProtectedRemotes = () => [];
  ai._HVTsInstalled = () => 0;
  ai._protectionInstallsThisTurn = [hq, rnd, null];
  assert.strictEqual(ai._serverToProtect(), hq);
});
test('Archives containing an agenda remains a valid protection target', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: [], score: 1};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: [], score: 2};
  const archives = {serverName: 'Archives', cards: [{cardType: 'agenda'}], ice: [], root: [], score: 0};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: []});
  runner.identityCard = {faction: 'Criminal'};
  ai._protectionScore = target => target ? target.score : 3;
  ai._evaluateServerSecurity = () => ({isSecure: false});
  ai._emptyProtectedRemotes = () => [];
  ai._HVTsInstalled = () => 0;
  ai._protectionInstallsThisTurn = [hq, rnd, null];
  assert.strictEqual(ai._serverToProtect(), archives);
});
test('poor Corp reinforces breachable HQ with an agenda but not a secure HQ', () => {
  const hq = {serverName: 'HQ', cards: [{cardType: 'agenda'}], ice: [etr()], root: []};
  Object.assign(corp, {HQ: hq, RnD: {cards: [], ice: [], root: []}, archives: {cards: [], ice: [], root: []}});
  ai._evaluateServerSecurity = () => ({isSecure: false});
  assert.strictEqual(ai._shouldInstallIceLayer(hq, false), true);
  ai._evaluateServerSecurity = () => ({isSecure: true});
  assert.strictEqual(ai._shouldInstallIceLayer(hq, false), false);
});
test('Corp turn-start protection aging skips the opening turn and then runs once', () => {
  let calls = 0;
  const oldAge = ai._ageProtectionPriorities;
  ai._ageProtectionPriorities = () => { calls++; };
  try {
    ai._hasReachedCorpMainPhase = false;
    ai._prepareProtectionPrioritiesForCorpTurn();
    assert.strictEqual(calls, 0);
    ai._hasReachedCorpMainPhase = true;
    ai._prepareProtectionPrioritiesForCorpTurn();
    assert.strictEqual(calls, 1);
  } finally {
    ai._ageProtectionPriorities = oldAge;
  }
});
test('unaddressed insecure servers gain bounded priority across turns', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: [], score: 0};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: [], score: 3};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: [], score: 20};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: []});
  runner.identityCard = {faction: 'Criminal'};
  ai._protectionScore = target => target ? target.score : 1;
  ai._evaluateServerSecurity = () => ({isSecure: false});
  ai._emptyProtectedRemotes = () => [{}];
  ai._HVTsInstalled = () => 0;
  ai._protectionInstallsThisTurn = [];
  ai._serverProtectionDebt = new Map();
  for (let turn = 0; turn < 4; turn++) {
    ai._recordProtectionInstall(hq);
    ai._ageProtectionPriorities();
  }
  assert.strictEqual(ai._serverToProtect(), rnd);
  assert.strictEqual(ai._serverProtectionDebt.get(hq), 0);
  assert.strictEqual(ai._serverProtectionDebt.get(rnd), 4);
});
test('an HVT server overrides a naturally weaker generic remote', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: [], score: 10};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: [], score: 11};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: [], score: 20};
  const generic = {serverName: 'Remote 1', ice: [], root: [], score: 0};
  const hvt = {serverName: 'Remote 2', ice: [], root: [{cardType: 'agenda'}], score: 5};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [generic, hvt]});
  runner.identityCard = {faction: 'Criminal'};
  ai._protectionScore = target => target ? target.score : 1;
  ai._evaluateServerSecurity = () => ({isSecure: false});
  ai._isAScoringServer = () => false;
  ai._emptyProtectedRemotes = () => [generic];
  ai._HVTsInstalled = () => 1;
  ai._HVTserver = () => hvt;
  ai._protectionInstallsThisTurn = [];
  ai._serverProtectionDebt = new Map();
  assert.strictEqual(ai._serverToProtect(), hvt);
});
test('critical naked server with no ICE uses install-and-rez draw before basic draw', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [etr()], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  const spin = card(30053);
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [], clickTracker: 3});
  hq.cards = [spin, {player: corp, cardType: 'agenda'}];
  servers = [hq, rnd, archives];
  const oldRanked = ai._rankedServersToProtect;
  const oldEconomy = ai._sufficientEconomy;
  ai._rankedServersToProtect = () => [{server: rnd, adjustedScore: -6, isSecure: false}];
  ai._sufficientEconomy = () => true;
  try {
    ai.preferred = null;
    assert.strictEqual(ai._emergencyProtectionRecoveryAction(['install', 'draw', 'gain']), 0);
    assert.strictEqual(ai.preferred.cardToInstall, spin);
    assert.strictEqual(ai.preferred.serverToInstallTo, null);

    hq.cards = hq.cards.filter(cardInHand => cardInHand !== spin);
    const drawRemote = {serverName: 'Remote 1', cards: [], ice: [], root: [spin]};
    spin.rezzed = false;
    servers.push(drawRemote);
    corp.remoteServers = [drawRemote];
    ai.preferred = null;
    assert.strictEqual(ai._emergencyProtectionRecoveryAction(['rez', 'draw', 'gain']), 0);
    assert.strictEqual(ai.preferred.cardToRez, spin);

    spin.rezzed = true;
    ai.preferred = null;
    assert.strictEqual(ai._emergencyProtectionRecoveryAction(['draw', 'gain']), 0);
    assert.strictEqual(ai.preferred, null);
  } finally {
    ai._rankedServersToProtect = oldRanked;
    ai._sufficientEconomy = oldEconomy;
  }
});
test('emergency draw preserves ordinary economy and agenda-flood safeguards', () => {
  const hq = {serverName: 'HQ', cards: [], ice: [], root: []};
  const rnd = {serverName: 'R&D', cards: [], ice: [], root: []};
  const archives = {serverName: 'Archives', cards: [], ice: [], root: []};
  Object.assign(corp, {HQ: hq, RnD: rnd, archives, remoteServers: [], clickTracker: 3});
  servers = [hq, rnd, archives];
  const oldRanked = ai._rankedServersToProtect;
  const oldEconomy = ai._sufficientEconomy;
  ai._rankedServersToProtect = () => [{server: rnd, adjustedScore: -6, isSecure: false}];
  ai._sufficientEconomy = () => true;
  try {
    hq.cards = [{player: corp, cardType: 'agenda'}, {player: corp, cardType: 'agenda'}];
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
    hq.cards = [{player: corp, cardType: 'ice', rezCost: 20}];
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
    hq.cards = [];
    ai._sufficientEconomy = () => false;
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
    ai._sufficientEconomy = () => true;
    corp.clickTracker = 1;
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
    corp.clickTracker = 3;
    ai._rankedServersToProtect = () => [{server: rnd, adjustedScore: -2.9, isSecure: false}];
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
    ai._rankedServersToProtect = () => [{server: rnd, adjustedScore: -6, isSecure: false}];
    rnd.ice = [{player: corp, cardType: 'ice', rezzed: false, rezCost: 3}];
    assert.strictEqual(ai._emergencyProtectionRecovery(), null);
  } finally {
    ai._rankedServersToProtect = oldRanked;
    ai._sufficientEconomy = oldEconomy;
  }
});
console.log(tests + ' regression cases passed.');
