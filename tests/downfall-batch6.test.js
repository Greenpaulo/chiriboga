'use strict';
// Downfall batch 6 (26024–26030): Gauss, Pelangi, Rezeki, The Artist, Direct Access,
// Rejig and Whistleblower through the real engine, selectors and run calculator.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: stub, jQuery: stub, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/downfall.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = runner; c.activePlayer = runner; c.viewingPlayer = runner;
c.currentPhase = c.phases.runnerActionMain;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
c.MoveCard = (item, destination, position) => {
  if (item.cardLocation) {const i = item.cardLocation.indexOf(item); if (i >= 0) item.cardLocation.splice(i, 1);}
  if (position == null) destination.push(item); else destination.splice(position, 0, item);
  item.cardLocation = destination; c.InvalidateActiveTriggerCandidateCache();
};
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
const withAI = (side, ai, fn) => {const saved = side.AI; side.AI = ai; try {return fn();} finally {side.AI = saved;}};
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
  c.currentPhase = c.phases.runnerActionMain;
};
// Install stub: pays the real InstallCost, then completes.
let installs = [];
c.Install = (item, host, ignore, pos, rtp, onResolve, ctx, onCancel, onPay, allowCancel, onComplete) => {
  const cost = c.InstallCost(item, host);
  installs.push({card: item, cost});
  runner.creditPool -= cost;
  c.MoveCard(item, item.cardType === 'program' ? runner.rig.programs : item.cardType === 'hardware' ? runner.rig.hardware : runner.rig.resources);
  c.AutomaticTriggers('automaticOnInstall', [item]);
  if (onComplete) onComplete.call(ctx);
};
const program = (title, installCost, extra = {}) => Object.assign({title, player: runner, cardType: 'program', subTypes: [],
  installCost, memoryCost: 1}, extra);

async function main() {
// --- Gauss: +3 strength for the turn it is installed, expires when the turn ends ---
reset();
const gauss = card(26024);
put(gauss, runner.grip);
c.Install(gauss, null);
assert.strictEqual(c.Strength(gauss), 4, 'installed this turn: 1 + 3');
const wall = put(ice('Wall', 'Barrier', 4, 2), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
runner.creditPool = 2;
let route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route, 'install bonus breaks a strength 4 barrier for 2 credits');
assert.strictEqual(route[route.length - 1].runner_credits_spent, 2, 'no pumping needed');
encounter(corp.HQ, 0);
assert.strictEqual(gauss.abilities[0].Enumerate.call(gauss).length, 2, 'interface usable at strength 4');
assert.strictEqual(gauss.abilities[1].Enumerate.call(gauss).length, 0, 'no pump at equal strength');
c.encountering = false; c.attackedServer = null;
responseQueue.push({name: 'responseOnRunnerDiscardEnds', params: []}); flushResponses();
assert.strictEqual(c.Strength(gauss), 1, 'bonus ends with the turn');
runner.creditPool = 10;
encounter(corp.HQ, 0);
assert.strictEqual(gauss.abilities[0].Enumerate.call(gauss).length, 0, 'too weak after the turn');
assert.strictEqual(gauss.abilities[1].Enumerate.call(gauss).length, 1, 'can pump');
gauss.abilities[1].Resolve.call(gauss, {});
assert.strictEqual(c.Strength(gauss), 3);
endEncounter();
assert.strictEqual(c.Strength(gauss), 1, 'pump lasts for the encounter');
c.attackedServer = null;

// --- Pelangi: counters, once-per-turn subtype gain, breaker match and run calculator ---
reset();
const gauss2 = put(card(26024), runner.rig.programs);
const pelangi = card(26025);
put(pelangi, runner.grip); c.Install(pelangi, null);
assert.strictEqual(c.Counters(pelangi, 'virus'), 2, 'installs with 2 virus counters');
const gate = put(ice('Gate', 'Code Gate', 1, 1), corp.HQ.ice);
put({title: 'Agenda', player: corp, cardType: 'agenda'}, corp.HQ.cards);
runner.creditPool = 3;
pelangi.usedThisTurn = true;
assert.strictEqual(runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0), null, 'no code gate breaker');
pelangi.usedThisTurn = false;
route = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(route, 'Pelangi lets the fracter break the code gate');
const last = route[route.length - 1];
assert(last.persistents.some(p => p.use === pelangi && p.addSubTypes && p.addSubTypes[0] === 'Barrier'));
assert(last.sr_broken.every(s => s.use === gauss2));
assert.strictEqual(last.virus_counters_spent, 1);
// AI follows the route: trigger Pelangi, then choose Barrier
encounter(corp.HQ, 0);
c.currentPhase = {identifier: 'Encounter', title: 'Encounter', player: runner};
runner.AI.cachedBestPath = null;
const triggers = c.ChoicesTriggerableAbilities(runner);
assert(triggers.some(t => t.card === pelangi), 'Pelangi usable while encountering');
c.executingCommand = 'trigger';
let ret = await runner.AI._computeChoice(['trigger', 'n'], 'command');
assert.strictEqual(ret, 0, 'AI triggers an ability');
assert.strictEqual(runner.AI.preferred.cardToTrigger, pelangi, 'Pelangi is used first');
runner.AI.preferred = null;
const subtypeChoices = pelangi.abilities[0].Enumerate.call(pelangi);
assert(!subtypeChoices.some(x => x.subType === 'Code Gate'), 'existing subtype not offered');
ret = await runner.AI._computeChoice(subtypeChoices, 'select');
assert.strictEqual(subtypeChoices[ret].subType, 'Barrier', 'AI chooses the fracter type');
pelangi.abilities[0].Resolve.call(pelangi, subtypeChoices[ret]);
assert.strictEqual(c.Counters(pelangi, 'virus'), 1);
assert(c.CheckSubType(gate, 'Barrier') && c.CheckSubType(gate, 'Code Gate'));
assert.strictEqual(gauss2.abilities[0].Enumerate.call(gauss2).length, 1, 'fracter now interfaces');
assert(runner.AI.rc.IceAI(gate, 0).subTypes.includes('Barrier'), 'live model sees the gained subtype');
assert.strictEqual(pelangi.abilities[0].Enumerate.call(pelangi).length, 0, 'once per turn');
endEncounter();
assert(!c.CheckSubType(gate, 'Barrier'), 'subtype lasts only for the encounter');
pelangi.usedThisTurn = false; c.RemoveCounters(pelangi, 'virus', 1);
c.attackedServer = corp.HQ; c.encountering = true;
assert.strictEqual(pelangi.abilities[0].Enumerate.call(pelangi).length, 0, 'needs a hosted counter');
assert.strictEqual(pelangi.AIOkToTrash(), true);
c.encountering = false; c.attackedServer = null;

// --- Rezeki: 1 credit when the Runner turn begins ---
reset();
const rezeki = put(card(26026), runner.rig.programs);
runner.creditPool = 0;
responseQueue.push({name: 'responseOnRunnerTurnBegins', params: []}); flushResponses();
assert.strictEqual(runner.creditPool, 1);
responseQueue.push({name: 'responseOnCorpTurnBegins', params: []}); flushResponses();
assert.strictEqual(runner.creditPool, 1, 'only the Runner turn');
assert(rezeki.AIEconomyInstall() > 0);

// --- The Artist: two once-per-turn click abilities; AI routes installs through the discount ---
reset();
const artist = put(card(26027), runner.rig.resources);
const breaker = put(program('Breaker', 3, {subTypes: ['Icebreaker', 'Killer']}), runner.grip);
put({title: 'Res', player: runner, cardType: 'resource', subTypes: [], installCost: 0}, runner.grip);
runner.creditPool = 2;
let opts = artist.abilities[1].Enumerate.call(artist);
same(opts.map(o => o.card.title), ['Breaker'], 'programs/hardware only, affordable with the discount');
assert.strictEqual(c.InstallCost(breaker), 3, 'discount only through the ability');
const originalHandInstall = c.ChoicesHandInstall;
const installFailure = new Error('install enumeration failed');
try {
  for (const prior of [false, true]) for (const shouldThrow of [false, true]) {
    artist._discountActive = prior;
    let evaluated = false;
    c.ChoicesHandInstall = () => {
      evaluated = true;
      assert.strictEqual(artist._discountActive, true, 'discount active during enumeration');
      assert.strictEqual(c.InstallCost(breaker), 2, 'temporary discount reaches the cost evaluator');
      if (shouldThrow) throw installFailure;
      return [{card: breaker, host: null}];
    };
    if (shouldThrow)
      assert.throws(() => artist.AIInstallDiscountAbility(breaker, null), error => error === installFailure);
    else assert.strictEqual(artist.InstallChoices()[0].card, breaker);
    assert(evaluated, 'discounted install enumeration was reached');
    assert.strictEqual(artist._discountActive, prior, 'Artist restores the exact previous discount state');
  }
} finally {
  c.ChoicesHandInstall = originalHandInstall;
  artist._discountActive = false;
}
assert.strictEqual(c.InstallCost(breaker), 3, 'failed planning leaves no live discount');
// AI: an install decision becomes the Artist ability
c.currentPhase = c.phases.runnerActionMain;
runner.AI.preferred = {command: 'install', cardToInstall: breaker, hostToInstallTo: null};
runner.AI._computeChoice = async () => 0; // the install decision itself is the AI's normal choice
ret = await runner.AI.CommandChoice(['install', 'trigger', 'gain']);
delete runner.AI._computeChoice;
assert.strictEqual(ret, 1, 'trigger instead of install');
assert.strictEqual(runner.AI.preferred.cardToTrigger, artist);
assert.strictEqual(runner.AI.preferred.abilityAlt, 'artist_install');
opts = artist.abilities[1].Enumerate.call(artist);
same(opts.map(o => o.card.title), ['Breaker']);
artist.abilities[1].Resolve.call(artist, opts[0]);
assert.strictEqual(installs.pop().cost, 2, 'paid 1 less');
assert.strictEqual(runner.creditPool, 0); assert.strictEqual(runner.clickTracker, 3);
assert.strictEqual(c.InstallCost(breaker), 3, 'discount cleared');
assert.strictEqual(artist.abilities[1].Enumerate.call(artist).length, 0, 'once per turn');
assert.strictEqual(artist.AIInstallDiscountAbility(breaker, null), null);
// credit ability: once per turn, economy trigger
assert.strictEqual(artist.AIWouldTrigger(), true);
artist.abilities[0].Resolve.call(artist, {});
assert.strictEqual(runner.creditPool, 2); assert.strictEqual(runner.clickTracker, 2);
assert.strictEqual(artist.abilities[0].Enumerate.call(artist).length, 0);
assert.strictEqual(artist.AIWouldTrigger(), false, 'economy trigger never falls through to the install ability');
responseQueue.push({name: 'responseOnRunnerTurnBegins', params: []}); flushResponses();
assert.strictEqual(artist.abilities[0].Enumerate.call(artist).length, 1, 'resets each turn');
c.currentPhase = {identifier: 'Run 3.1'};
assert.strictEqual(artist.abilities[0].Enumerate.call(artist).length, 0, 'click abilities are actions');

// --- Direct Access: blanks identities while resolving, optional shuffle back ---
reset();
const corpId = corp.identityCard, runnerId = runner.identityCard;
corpId.modifyStrength = {Resolve: () => 0}; runnerId.modifyStrength = {Resolve: () => 0};
const access = put(card(26028), runner.grip);
assert.strictEqual(c.CheckHasAbilities(corpId), true);
let ran = null; const realMakeRun = c.MakeRun; c.MakeRun = server => {ran = server;};
c.MoveCard(access, runner.resolvingCards);
access.Resolve.call(access, {server: corp.HQ});
assert.strictEqual(ran, corp.HQ);
assert.strictEqual(c.CheckHasAbilities(corpId), false); assert.strictEqual(c.CheckHasAbilities(runnerId), false);
assert.strictEqual(c.CheckHasAbilities(gauss), true, 'only identities');
assert.strictEqual(access.responseOnRunEnds.Enumerate.call(access).length, 1);
access.responseOnRunEnds.Resolve.call(access);
let d = decisions.shift();
assert.strictEqual(runner.AI.preferred.option.shuffle, true, 'AI shuffles it back');
d.choose(d.choices[0]);
assert(runner.stack.includes(access) && !runner.resolvingCards.includes(access), 'shuffled into the stack');
assert.strictEqual(c.CheckHasAbilities(corpId), true, 'abilities return when the event finishes');
// decline leaves it to be trashed
c.MoveCard(access, runner.resolvingCards);
access.Resolve.call(access, {server: corp.HQ});
access.responseOnRunEnds.Resolve.call(access);
decisions.shift().choose({shuffle: false});
assert(runner.resolvingCards.includes(access)); assert.strictEqual(c.CheckHasAbilities(corpId), true);
c.MakeRun = realMakeRun;
// AI value: only when it blanks a Corp identity and not the Runner's
c.MoveCard(access, runner.grip);
delete runnerId.modifyStrength;
assert(access.AIRunEventExtraPotential(corp.HQ, 1) > 0);
assert.strictEqual(access.AIRunEventExtraPotential(corp.HQ, 0.1), 0, 'low-value run');
runnerId.modifyStrength = {Resolve: () => 0};
assert.strictEqual(access.AIRunEventExtraPotential(corp.HQ, 1), 0, 'would blank our own identity');
access.AIRunEventModify(corp.HQ);
assert.strictEqual(c.CheckHasAbilities(corpId), false, 'run calculator models blank identities');
access.AIRunEventRestore(corp.HQ);
assert.strictEqual(c.CheckHasAbilities(corpId), true);
delete corpId.modifyStrength; delete runnerId.modifyStrength;

// --- Rejig: return a card as a cost, install with its printed cost as a discount ---
reset();
const spent = put(program('Spent', 2, {AIOkToTrash: () => true}), runner.rig.programs);
const keeper = put(program('Keeper', 1), runner.rig.programs);
const big = put(program('Big', 4, {subTypes: ['Icebreaker', 'Decoder']}), runner.grip);
const rejig = put(card(26029), runner.grip);
runner.creditPool = 2;
same(rejig.Enumerate().map(x => x.card.title).sort(), ['Keeper', 'Spent']);
assert.strictEqual(rejig.AIWouldPlay(), true);
const playChoices = c.FullCheckPlay(rejig);
assert.strictEqual(playChoices[rejig.AIPreferredPlayChoice(playChoices)].card, spent, 'returns the spent card');
c.MoveCard(rejig, runner.resolvingCards);
rejig.Resolve.call(rejig, {card: spent});
assert(runner.grip.includes(spent), 'added to the grip as a cost');
d = decisions.shift();
same(d.choices.map(x => x.card.title), ['Big'], 'AI plan narrows to the planned install');
d.choose(d.choices[0]);
assert.strictEqual(installs.pop().cost, 2, 'X = 2 printed cost');
assert.strictEqual(runner.creditPool, 0);
assert.strictEqual(c.InstallCost(big), 4, 'discount cleared');
// reinstalling the same card is allowed and costs nothing
reset();
const imp = put(program('Imp', 2, {AIOkToTrash: () => true, automaticOnInstall: {Resolve() {}}}), runner.rig.programs);
const rejig2 = put(card(26029), runner.grip);
runner.creditPool = 0;
assert.strictEqual(rejig2.ChooseAIPlan().installCard, imp, 'refresh install effects');
c.MoveCard(rejig2, runner.resolvingCards);
rejig2.Resolve.call(rejig2, {card: imp});
d = decisions.shift();
same(d.choices.map(x => x.card.title), ['Imp']);
d.choose(d.choices[0]);
assert.strictEqual(installs.pop().cost, 0);
// guards: nothing spent to return, or nothing installable afterwards
reset();
put(program('Fine', 2), runner.rig.programs);
const rejig3 = put(card(26029), runner.grip);
assert.strictEqual(rejig3.AIWouldPlay(), false, 'nothing worth returning');
assert.strictEqual(rejig3.AIPreferredPlayChoice(c.FullCheckPlay(rejig3)), -1);
runner.rig.programs = [];
assert.strictEqual(c.FullCheckPlay(rejig3), null, 'cost needs an installed program or hardware');

// --- Whistleblower: trash on a successful run to name an agenda; steal it ignoring costs ---
reset();
const realTrash = c.Trash;
c.Trash = (cards, prevent, after, ctx) => {[].concat(cards).forEach(x => c.MoveCard(x, runner.heap)); if (after) after.call(ctx, [].concat(cards));};
const whistle = put(card(26030), runner.rig.resources);
const remote = c.NewServer('Remote', false); corp.remoteServers.push(remote);
const pricey = put({title: 'Pricey Agenda', player: corp, cardType: 'agenda', agendaPoints: 2,
  stealCost: {credits: 5, clicks: 0}, knownToRunner: true}, remote.root);
c.cardSet[99901] = {title: 'Pricey Agenda', cardType: 'agenda'};
c.attackedServer = remote;
assert.strictEqual(whistle.ChooseAIName(remote), 'Pricey Agenda', 'known agenda with a steal cost');
assert.strictEqual(whistle.responseOnRunSuccessful.Enumerate.call(whistle).length, 1);
whistle.responseOnRunSuccessful.Resolve.call(whistle);
d = decisions.shift();
assert(d.choices.some(x => x.name === 'Pricey Agenda') && d.choices[d.choices.length - 1].name === null, 'agenda names plus decline');
assert.strictEqual(runner.AI.preferred.option.name, 'Pricey Agenda');
d.choose(runner.AI.preferred.option);
assert(runner.heap.includes(whistle), 'trashed as the cost');
const effect = c.lingeringEffects.find(e => e.title === 'Whistleblower');
assert(effect && effect.chosenName === 'Pricey Agenda');
// accessing a different agenda does nothing
const other = put({title: 'Other', player: corp, cardType: 'agenda', agendaPoints: 1}, remote.root);
c.accessingCard = other; c.AutomaticTriggers('automaticOnAccess', [other]);
assert.strictEqual(effect.responseOnAccess.Enumerate.call(effect).length, 0);
// the named agenda is stolen with 0 credits
runner.creditPool = 0;
let stolen = null; const realSteal = c.Steal; c.Steal = () => {stolen = c.accessingCard;};
c.accessingCard = pricey; c.AutomaticTriggers('automaticOnAccess', [pricey]);
assert.strictEqual(effect.responseOnAccess.Enumerate.call(effect).length, 1);
effect.responseOnAccess.Resolve.call(effect);
assert.strictEqual(stolen, pricey, 'stolen ignoring the 5 credit cost');
c.accessingCard = pricey; c.AutomaticTriggers('automaticOnAccess', [pricey]);
assert.strictEqual(effect.responseOnAccess.Enumerate.call(effect).length, 0, 'only the next such access');
responseQueue.push({name: 'responseOnRunEnds', params: []}); flushResponses();
assert(!c.lingeringEffects.includes(effect), 'ends with the run');
// AI keeps it when no known agenda has a steal cost
const whistle2 = put(card(26030), runner.rig.resources);
pricey.stealCost = null;
assert.strictEqual(whistle2.ChooseAIName(remote), null);
whistle2.responseOnRunSuccessful.Resolve.call(whistle2);
d = decisions.shift(); assert.strictEqual(runner.AI.preferred.option.name, null, 'AI declines');
d.choose(runner.AI.preferred.option);
assert(runner.rig.resources.includes(whistle2), 'not trashed');
c.Steal = realSteal; c.Trash = realTrash;
if (process.env.VERBOSE) console.log('Downfall batch 6: all blocks ran');
}
main().catch(error => {console.error(error); process.exit(1);});
