'use strict';
// Uprising batch 6 (26088–26092): Mantle, Penrose, Self-modifying Code, Cybertrooper Talut
// and Paule's Café through the real engine, selectors and run calculator.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: stub, jQuery: stub, PIXI: stub,
  window: {}, location: {search: ''}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
// Headless jQuery.extend dependency used by the real InstanceCard constructor.
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && value && typeof value === 'object'
      ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
c.jQuery = {extend};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'decks.js', 'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0, maxHandSize: 5, coreDamage: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = runner; c.activePlayer = runner; c.viewingPlayer = runner;
c.currentPhase = c.phases.runnerActionMain;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
// Instances get their own arrays, as InstanceCard's deep copy does.
const card = id => {
  const def = c.cardSet[id], copy = Object.assign({}, def);
  for (const key of Object.keys(def)) if (Array.isArray(def[key])) copy[key] = def[key].slice();
  return copy;
};
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
c.MoveCard = (item, destination, position) => {
  const from = item.cardLocation;
  if (from) {const i = from.indexOf(item); if (i >= 0) from.splice(i, 1);}
  if (position == null) destination.push(item); else destination.splice(position, 0, item);
  item.cardLocation = destination;
  if (destination === runner.heap || destination === runner.grip || destination === runner.stack) {
    item.host = null;
    c.AutomaticTriggers('automaticOnUninstall', [item]);
  }
  c.InvalidateActiveTriggerCandidateCache();
};
c.Trash = (cards, canBePrevented, after, ctx) => {
  cards = Array.isArray(cards) ? cards : [cards];
  for (const item of cards) {
    for (const hosted of (item.hostedCards || []).slice()) c.MoveCard(hosted, runner.heap);
    c.MoveCard(item, runner.heap);
  }
  if (after) after.call(ctx, cards);
};
let shuffles = 0;
c.Shuffle = () => {shuffles++;};
let responseQueue = [];
c.TriggeredResponsePhase = (player, name, params, after) => {responseQueue.push({name, params, after});};
function flushResponses() {
  while (responseQueue.length) {
    const event = responseQueue.shift();
    for (const option of c.ChoicesActiveTriggers(event.name)) {
      const hook = option.card[event.name];
      if (hook.automatic) hook.Resolve.apply(option.card, event.params);
    }
    if (event.after) event.after();
  }
}
const turnEnds = () => {responseQueue.push({name: 'responseOnRunnerDiscardEnds', params: []}); flushResponses();};
const same = (a, b, m) => assert.deepStrictEqual([...a], b, m);
const sub = () => ({text: 'End the run.', Resolve() {}});
const ice = (title, subType, strength, subs) => ({title, player: corp, cardType: 'ice', subTypes: [subType],
  strength, rezCost: 3, rezzed: true, subroutines: Array.from({length: subs}, sub),
  AIImplementIce(rc, result) {result.sr = this.subroutines.map(() => [['endTheRun']]); return result;}});
const encounter = (server, idx) => {c.attackedServer = server; c.approachIce = idx; c.encountering = true;};
const endEncounter = () => {responseQueue.push({name: 'responseOnEncounterEnds', params: []}); flushResponses(); c.encountering = false;};
const reset = () => {
  runner.rig.programs = []; runner.rig.hardware = []; runner.rig.resources = []; runner.grip = []; runner.stack = []; runner.heap = [];
  corp.HQ.ice = []; corp.HQ.cards = []; corp.HQ.root = []; corp.remoteServers = [];
  c.lingeringEffects.length = 0; decisions = []; responseQueue = []; c.InvalidateActiveTriggerCandidateCache();
  c.attackedServer = null; c.approachIce = -1; c.encountering = false; c.accessingCard = null;
  runner.creditPool = 10; runner.clickTracker = 4; runner.AI.preferred = null; runner.AI.cachedBestPath = null;
  runner.AI._pendingAbilityInstall = null; c.playerTurn = runner;
  c.currentPhase = c.phases.runnerActionMain;
};
// Install stub: pays the real InstallCost (after any payment callback), then completes.
let installs = [];
c.Install = (item, host, ignore, pos, rtp, onResolve, ctx, onCancel, onPay, allowCancel, onComplete) => {
  const cost = c.InstallCost(item, host);
  installs.push({card: item, cost});
  runner.creditPool -= cost;
  if (onPay) onPay.call(ctx);
  c.MoveCard(item, item.cardType === 'program' ? runner.rig.programs : item.cardType === 'hardware' ? runner.rig.hardware : runner.rig.resources);
  item.host = null;
  if (typeof item.recurringCredits !== 'undefined') item.credits = item.recurringCredits;
  c.AutomaticTriggers('automaticOnInstall', [item]);
  if (onComplete) onComplete.call(ctx);
};
const breaker = (title, subType, strength, extra = {}) => Object.assign({title, player: runner, cardType: 'program',
  subTypes: ['Icebreaker', subType], installCost: 2, memoryCost: 1, strength, strengthBoost: 0, elo: 1500,
  modifyStrength: {Resolve(target) {return target == this ? this.strengthBoost : 0;}}}, extra);
const install = item => {put(item, runner.grip); c.Install(item, null);};

async function main() {
// --- Mantle: 1 recurring credit for using programs and hardware only ---
reset();
const mantle = card(26088);
install(mantle);
assert.strictEqual(mantle.credits, 1, 'recurring credit on install');
runner.creditPool = 0;
const someProgram = breaker('Some Breaker', 'Decoder', 1);
assert(c.CheckCredits(runner, 1, 'using', someProgram), 'pays for a program');
assert(c.CheckCredits(runner, 1, 'using', {player: runner, cardType: 'hardware', subTypes: []}), 'pays for hardware');
assert(!c.CheckCredits(runner, 1, 'using', {player: runner, cardType: 'resource', subTypes: []}), 'not resources');
assert(!c.CheckCredits(runner, 1, 'installing', someProgram), 'not installs');
assert(!c.CheckCredits(runner, 1, '', null), 'not general spending');
// Corp security sees the credit for an installed breaker (canUseCredits contract)
put(someProgram, runner.rig.programs);
assert(c.AvailableCredits(runner, 'using', someProgram) === 1);

// --- Penrose: code gate breaks, barrier only on its install turn, stealth-only +3 ---
reset();
const penrose = card(26089);
install(penrose);
assert.strictEqual(penrose.installedThisTurn, true);
const gate = put(ice('Gate', 'Code Gate', 2, 2), corp.HQ.ice);
encounter(corp.HQ, 0);
assert.strictEqual(penrose.abilities[1].Enumerate.call(penrose).length, 2, 'code gate break at strength 2');
assert.strictEqual(penrose.abilities[0].Enumerate.call(penrose).length, 0, 'barrier ability needs a barrier');
penrose.abilities[1].Resolve.call(penrose, penrose.abilities[1].Enumerate.call(penrose)[0]);
assert(gate.subroutines[0].broken, 'subroutine broken');
endEncounter();
corp.HQ.ice = [];
const wall = put(ice('Wall', 'Barrier', 2, 1), corp.HQ.ice);
encounter(corp.HQ, 0);
assert.strictEqual(penrose.abilities[0].Enumerate.call(penrose).length, 1, 'barrier break while installed this turn');
endEncounter();
turnEnds();
assert.strictEqual(penrose.installedThisTurn, false, 'install-turn window ends with the turn');
encounter(corp.HQ, 0);
assert.strictEqual(penrose.abilities[0].Enumerate.call(penrose).length, 0, 'no barrier break on later turns');
assert.strictEqual(penrose.abilities[2].Enumerate.call(penrose).length, 0, 'no pump against an ice it cannot break');
endEncounter();
// pump: pool credits never pay it
corp.HQ.ice = [];
const bigGate = put(ice('Big Gate', 'Code Gate', 5, 2), corp.HQ.ice);
runner.creditPool = 10;
encounter(corp.HQ, 0);
assert.strictEqual(penrose.abilities[2].Enumerate.call(penrose).length, 0, 'no stealth credits, no pump');
assert.strictEqual(penrose.abilities[1].Enumerate.call(penrose).length, 0, 'too weak to break');
endEncounter();
const mantle2 = card(26088);
install(mantle2);
encounter(corp.HQ, 0);
assert.strictEqual(penrose.abilities[2].Enumerate.call(penrose).length, 1, 'Mantle credit enables the pump');
const poolBefore = runner.creditPool;
penrose.abilities[2].Resolve.call(penrose, {});
assert.strictEqual(mantle2.credits, 0, 'paid from Mantle');
assert.strictEqual(runner.creditPool, poolBefore, 'not from the pool');
assert.strictEqual(c.Strength(penrose), 5);
assert.strictEqual(penrose.abilities[2].Enumerate.call(penrose).length, 0, 'no pump once strong enough');
assert.strictEqual(penrose.abilities[1].Enumerate.call(penrose).length, 2, 'now breaks');
endEncounter();
assert.strictEqual(c.Strength(penrose), 2, 'pump lasts for the encounter');
// run calculator: pump is a restricted stealth payment
mantle2.credits = 1;
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
let route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route, 'Mantle funds the +3 needed against a strength 5 code gate');
const end = route[route.length - 1];
assert.strictEqual(end.restrictedCreditsSpent, 1, 'one stealth credit used');
assert.strictEqual(end.runner_credits_spent, 3, 'pump + 2 breaks');
mantle2.credits = 0;
runner.AI.cachedBestPath = null;
route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(!route, 'pool credits cannot pay the pump');
assert.strictEqual(penrose.AIRunRestrictedCredits(corp.HQ), 0);
mantle2.credits = 1;
assert.strictEqual(penrose.AIRunRestrictedCredits(corp.HQ), 1, 'Mantle credits are outside the generic budget');
// barrier routes: only in the install turn, or as the run planner's hypothetical install
corp.HQ.ice = [];
put(ice('Wall', 'Barrier', 2, 1), corp.HQ.ice);
runner.AI.cachedBestPath = null;
assert(!runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0), 'no barrier route on a later turn');
runner.rig.programs.splice(runner.rig.programs.indexOf(penrose), 1); runner.grip.push(penrose); penrose.cardLocation = runner.grip;
c.InvalidateActiveTriggerCandidateCache();
runner.AI.cachedBestPath = null;
assert(runner.AI._calculateBestCompleteRun(corp.HQ, -3, 0, 0, 0, {card: penrose, host: null, cost: 3}),
  'a hypothetical install this turn can break the barrier');

// --- Self-modifying Code: 2[c] + trash, search and install a program ---
reset();
const smc = card(26090);
install(smc);
const decoder = breaker('Stack Decoder', 'Decoder', 3);
put(decoder, runner.stack);
put({title: 'Event', player: runner, cardType: 'event', subTypes: []}, runner.stack);
runner.creditPool = 1;
assert.strictEqual(smc.abilities[0].Enumerate.call(smc).length, 0, 'needs 2 credits');
assert(smc.abilities[0].text.includes('[trash]'), 'ability text names its trash cost');
const mantle3 = card(26088); install(mantle3);
runner.creditPool = 1;
assert.strictEqual(smc.abilities[0].Enumerate.call(smc).length, 1, 'Mantle can pay for a program ability');
c.Trash(mantle3, false);
runner.creditPool = 4;
withHuman(() => smc.abilities[0].Resolve.call(smc, {}));
assert.strictEqual(runner.creditPool, 2, 'paid 2');
assert(runner.heap.includes(smc), 'trashed as a cost');
let d = decisions.shift();
same(d.choices.map(o => o.card ? o.card.title : o.label), ['Stack Decoder', 'Install nothing'], 'programs only; may fail to find');
const shufflesBefore = shuffles;
d.choose(d.choices[0]);
assert(runner.rig.programs.includes(decoder), 'installed');
assert.strictEqual(installs.pop().cost, 2, 'pays the install cost');
assert.strictEqual(shuffles, shufflesBefore + 1, 'stack shuffled');
// empty stack: still usable, just shuffles
reset();
const smc2 = card(26090); install(smc2);
assert.strictEqual(smc2.abilities[0].Enumerate.call(smc2).length, 1, 'usable with nothing to find');
smc2.abilities[0].Resolve.call(smc2, {});
assert.strictEqual(decisions.length, 0); assert(runner.heap.includes(smc2));

// Ability offers pay credits without the hand-install click/card allowance.
reset();
const calculate = runner.AI._calculateBestCompleteRunAsync;
let offsets;
runner.AI._calculateBestCompleteRunAsync = async (...args) => {offsets = args.slice(1, 5); return [];};
const bonus = {card: breaker('Offset Decoder', 'Decoder', 3), cost: 4};
await runner.AI._commonRunCalculationChecksAsync(corp.HQ, null, bonus, false);
same(offsets, [-4, 0, -3, -1], 'hand installs retain their setup offsets');
await runner.AI._commonRunCalculationChecksAsync(corp.HQ, null, {...bonus, ability: {}}, false);
same(offsets, [-4, 0, -1, 0], 'ability installs pay only their offered credit cost');
runner.AI._calculateBestCompleteRunAsync = calculate;

// AI: the run planner fetches a missing breaker with SMC during the run
reset();
const smc3 = card(26090); install(smc3);
const fetched = breaker('Fetched Decoder', 'Decoder', 3, {elo: 1700, AIImplementBreaker(rc, result, point, server, cs, iceAI, is, cl, cr) {
  return result.concat(rc.ImplementIcebreaker(point, this, cs, iceAI, is, ['Code Gate'], 1, 1, 1, 1, cr));}});
put(fetched, runner.stack);
put(ice('Gate', 'Code Gate', 3, 1), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda', agendaPoints: 2}, corp.HQ.cards);
runner.creditPool = 8;
runner.clickTracker = 1; //paid installs need no setup click before the last-click run
// The last-click run heuristic requires a full grip at turn end.
for (let i = 0; i < 5; i++) put({title: 'Filler ' + i, player: runner, cardType: 'event'}, runner.grip);
const offers = smc3.AIAbilityInstallBreakers(c.InstalledCards(runner));
same(offers.map(o => [o.card.title, o.cost, o.alt]), [['Fetched Decoder', 4, 'smc_tutor']]);
same(card(26090).AIAbilityInstallBreakers([]), [], 'only an installed SMC offers');
runner.AI.cardsWorthKeeping = [];
let ret = await runner.AI._internalChoiceDetermination(['draw', 'gain', 'run', 'trigger'], 'command');
assert.strictEqual(ret, 2, 'runs HQ');
assert.strictEqual(runner.AI.preferred.serverToRun, corp.HQ);
assert(runner.AI._pendingAbilityInstall && runner.AI._pendingAbilityInstall.source === smc3, 'SMC planned for the run');
assert.strictEqual(smc3._aiTutorTarget, fetched);
runner.AI.preferred = null;
c.currentPhase = {identifier: 'Run 2.1', title: 'Approach Ice'};
c.attackedServer = corp.HQ; c.approachIce = 0;
ret = await runner.AI._internalChoiceDetermination(['trigger', 'n'], 'command');
assert.strictEqual(ret, 0, 'triggers in the first paid ability window');
assert.strictEqual(runner.AI.preferred.cardToTrigger, smc3);
assert.strictEqual(runner.AI.preferred.abilityAlt, 'smc_tutor');
smc3.abilities[0].Resolve.call(smc3, {});
d = decisions.shift();
same(d.choices.map(o => o.card.title), ['Fetched Decoder'], 'AI searches for the planned breaker');
d.choose(d.choices[0]);
assert(runner.rig.programs.includes(fetched));
assert.strictEqual(runner.AI._pendingAbilityInstall, null);
// negatives: nothing useful in the stack -> no offer; stale plans expire on another turn
reset();
const smc4 = card(26090); install(smc4);
put(breaker('Installed Twin', 'Decoder', 3), runner.rig.programs);
put(breaker('Installed Twin', 'Decoder', 3), runner.stack);
same(smc4.AIAbilityInstallBreakers(c.InstalledCards(runner)), [], 'already-installed titles are not fetched');
runner.AI._pendingAbilityInstall = {source: smc4, alt: 'smc_tutor'};
c.playerTurn = corp;
assert.strictEqual(runner.AI._pendingAbilityTrigger(['trigger', 'n']), null);
assert.strictEqual(runner.AI._pendingAbilityInstall, null, 'expired on the Corp turn');

// --- Cybertrooper Talut: +1 link, +2 strength to non-AI breakers installed this turn ---
reset();
const talut = c.InstanceCard(26091);
install(talut);
assert.strictEqual(c.Link(), 1, '+1 link');
const b1 = breaker('Breaker One', 'Fracter', 1);
install(b1);
assert.strictEqual(c.Strength(b1), 3, 'boosted');
const aiBreaker = breaker('AI Breaker', 'Fracter', 1); aiBreaker.subTypes = ['Icebreaker', 'AI'];
install(aiBreaker);
assert.strictEqual(c.Strength(aiBreaker), 1, 'AI breakers excluded');
const talut2 = c.InstanceCard(26091);
assert.notStrictEqual(talut2.boostedCards, talut.boostedCards, 'copies keep their own state');
assert.strictEqual(talut2.boostedCards.length, 0, 'the second engine instance inherits no boosts');
assert.strictEqual(c.cardSet[26091].boostedCards.length, 0, 'the definition remains untouched');
// AI: the run calculator uses the boost
put(ice('Wall', 'Barrier', 3, 1), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
b1.AIImplementBreaker = function (rc, result, point, server, cs, iceAI, is, cl, cr) {
  return result.concat(rc.ImplementIcebreaker(point, this, cs, iceAI, is, ['Barrier'], 2, 1, 1, 1, cr));
};
runner.creditPool = 1;
route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route && route[route.length - 1].runner_credits_spent === 1, 'boosted strength 3 breaks without pumping');
// the boost is lingering: survives Talut leaving play, ends with the turn
c.Trash(talut, false);
assert.strictEqual(c.Strength(b1), 3, 'outlasts Talut');
turnEnds();
assert.strictEqual(c.Strength(b1), 1, 'ends with the turn');
// a breaker that leaves play loses the boost
reset();
const talut3 = card(26091); install(talut3);
const b2 = breaker('Breaker Two', 'Fracter', 1); install(b2);
c.MoveCard(b2, runner.grip);
c.MoveCard(b2, runner.rig.programs);
assert.strictEqual(c.Strength(b2), 1, 'new object after leaving play');
assert.strictEqual(talut3.AIEconomyInstall(), 0, 'no breaker waiting');
runner.grip.push(breaker('Grip Breaker', 'Decoder', 1));
assert.strictEqual(talut3.AIEconomyInstall(), 1);

// --- Paule's Café: host from grip, install hosted cards with a connection discount ---
reset();
const cafe = card(26092);
install(cafe);
const hostable = put(breaker('Hosted Breaker', 'Decoder', 2, {installCost: 4}), runner.grip);
put({title: 'Grip Resource', player: runner, cardType: 'resource', subTypes: [], installCost: 1}, runner.grip);
let opts = cafe.abilities[0].Enumerate.call(cafe);
same(opts.map(o => o.card.title), ['Hosted Breaker'], 'programs and hardware only');
cafe.abilities[0].Resolve.call(cafe, opts[0]);
assert.strictEqual(runner.clickTracker, 3, 'costs a click');
assert(cafe.hostedCards.includes(hostable) && hostable.faceUp && hostable.notInstalled);
assert(!c.InstalledCards(runner).includes(hostable), 'hosted, not installed');
assert.strictEqual(c.InstalledMemoryCost(), 0, 'uses no MU while hosted');
c.currentPhase = {identifier: 'Run 3.1'};
assert.strictEqual(cafe.abilities[0].Enumerate.call(cafe).length, 0, 'hosting is an action');
// install (paid ability, usable outside the action phase); discount from unique connections
const conn = {title: 'Unique Contact', player: runner, cardType: 'resource', subTypes: ['Connection'], unique: true, installCost: 0};
put(conn, runner.rig.resources);
put(card(26091), runner.rig.resources);
put({title: 'Plain Contact', player: runner, cardType: 'resource', subTypes: ['Connection'], installCost: 0}, runner.rig.resources);
assert.strictEqual(cafe._uniqueConnections(), 2, 'unique connections only');
runner.creditPool = 3;
opts = cafe.abilities[1].Enumerate.call(cafe);
same(opts.map(o => o.card.title), ['Hosted Breaker'], '1 + (4 - 2) is affordable');
runner.creditPool = 2;
assert.strictEqual(cafe.abilities[1].Enumerate.call(cafe).length, 0, 'cannot afford 3');
runner.creditPool = 3;
cafe.abilities[1].Resolve.call(cafe, opts[0]);
assert.strictEqual(installs.pop().cost, 2, 'discounted install');
assert.strictEqual(runner.creditPool, 0);
assert(runner.rig.programs.includes(hostable) && !hostable.notInstalled, 'installed from the café');
assert.strictEqual(c.InstallCost(hostable), 4, 'discount cleared');
assert.strictEqual(c.Strength(hostable), 4, 'Talut boosts breakers installed this way');
// only the first install each Runner turn is discounted
const second = put(breaker('Second', 'Decoder', 1, {installCost: 2}), runner.grip);
c.currentPhase = c.phases.runnerActionMain;
cafe.abilities[0].Resolve.call(cafe, {card: second});
runner.creditPool = 3;
assert.strictEqual(cafe._hostedInstallCost(second, null), 2, 'no second discount this turn');
c.playerTurn = corp;
responseQueue.push({name: 'responseOnRunnerTurnBegins', params: []});
assert.strictEqual(cafe._nextDiscount(), 0, 'never during the Corp turn');
flushResponses(); c.playerTurn = runner;
assert.strictEqual(cafe._nextDiscount(), 2, 'resets each Runner turn');

// AI: host-then-install when connections make it cheaper; follow-up in the post-action window
reset();
const cafe2 = card(26092); install(cafe2);
put({title: 'Unique Contact', player: runner, cardType: 'resource', subTypes: ['Connection'], unique: true}, runner.rig.resources);
const gripBreaker = put(breaker('Grip Breaker', 'Decoder', 2, {installCost: 4}), runner.grip);
assert.strictEqual(cafe2.AIInstallDiscountAbility(gripBreaker, null), null, 'one connection saves nothing');
const talut4 = put(card(26091), runner.rig.resources);
runner.creditPool = 3;
runner.AI.preferred = {command: 'install', cardToInstall: gripBreaker, hostToInstallTo: null};
runner.AI._computeChoice = async () => 0;
ret = await runner.AI.CommandChoice(['install', 'trigger', 'gain']);
delete runner.AI._computeChoice;
assert.strictEqual(ret, 1, 'host on the café instead');
assert.strictEqual(runner.AI.preferred.abilityAlt, 'paule_host');
opts = cafe2.abilities[0].Enumerate.call(cafe2);
same(opts.map(o => o.card.title), ['Grip Breaker']);
cafe2.abilities[0].Resolve.call(cafe2, opts[0]);
runner.AI.preferred = null;
c.currentPhase = c.phases.runnerPostAction;
ret = await runner.AI._internalChoiceDetermination(['trigger', 'n'], 'command');
assert.strictEqual(ret, 0);
assert.strictEqual(runner.AI.preferred.cardToTrigger, cafe2);
assert.strictEqual(runner.AI.preferred.abilityAlt, 'paule_install');
opts = cafe2.abilities[1].Enumerate.call(cafe2);
cafe2.abilities[1].Resolve.call(cafe2, opts[0]);
assert.strictEqual(installs.pop().cost, 2, 'paid 1 + 2 instead of 4');
assert.strictEqual(runner.creditPool, 0);
assert.strictEqual(talut4.boostedCards.length, 1);
// hosted breakers are run-planner offers
reset();
const cafe3 = card(26092); install(cafe3);
const parked = breaker('Parked', 'Decoder', 2, {installCost: 3});
put(parked, cafe3.hostedCards); parked.host = cafe3; parked.notInstalled = true; parked.faceUp = true;
same(cafe3.AIAbilityInstallBreakers(c.InstalledCards(runner)).map(o => [o.card.title, o.cost, o.alt]), [['Parked', 4, 'paule_install']]);

if (process.env.VERBOSE) console.log('Uprising batch 6: all blocks ran');
}
function withHuman(fn) {const saved = runner.AI; runner.AI = null; try {return fn();} finally {runner.AI = saved;}}
main().catch(error => {console.error(error); process.exit(1);});
