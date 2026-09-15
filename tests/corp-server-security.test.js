// Run with: node tests/corp-server-security.test.js
// Real AI classes/card definitions, with deterministic public-board engine helpers.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const corp = {creditPool: 20, scoreArea: [], HQ: {cards: []}, archives: {cards: []}};
const runner = {creditPool: 0, grip: [], cards: [], AI: null};
const context = {console, corp, runner, cardSet: {}, setIdentifiers: [], encountering: false, attackedServer: null, approachIce: -1};
let servers = [];
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.Strength = card => card.strength || 0;
context.Credits = player => player.creditPool;
context.AvailableCredits = context.Credits;
context.RezCost = card => card.rezCost || 0;
context.CheckCredits = (player, cost) => player.creditPool >= cost;
context.InstalledCards = player => player === runner ? runner.cards : servers.reduce((cards, server) => cards.concat(server.ice, server.root), []);
context.ActiveCards = player => {
  const runnerCards = runner.cards.concat(runner.identityCard ? [runner.identityCard] : []);
  const corpCards = corp.scoreArea;
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.ChoicesInstalledCards = (player, predicate) => context.InstalledCards(player).filter(predicate).map(card => ({card}));
context.BreakerMatchesIce = (breaker, ice) => (
  [['Fracter', 'Barrier'], ['Decoder', 'Code Gate'], ['Killer', 'Sentry']].some(types =>
    context.CheckSubType(breaker, types[0]) && context.CheckSubType(ice, types[1]))
);
context.PlayerCanLook = (player, card) => player === corp || !!card.rezzed;
context.GetServer = card => servers.find(server => server.ice.includes(card));
context.ServerName = () => 'Regression server';
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js'].forEach(file =>
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
  runner.grip = [{}, {}, {}, {}, {}]; runner.creditPool = 0;
  corp.creditPool = 20; corp.scoreArea = []; servers = [];
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
console.log(tests + ' regression cases passed.');
