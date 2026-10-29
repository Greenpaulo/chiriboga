'use strict';
// Downfall batch 12: Weyland economy asset, HQ break limit, self-weakening and liability ICE, central ICE tutor.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
// Phase templates are copied with jQuery.extend, so the real phase chain needs a working deep extend.
const plain = v => v && typeof v == 'object' && (Array.isArray(v) || Object.getPrototypeOf(Object.getPrototypeOf(v) || {}) == null);
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && plain(value) ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jq = new Proxy(function () {}, {get: (t, k) => k == 'extend' ? extend : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: jq, jQuery: jq, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/downfall.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = corp; c.activePlayer = corp; c.viewingPlayer = corp;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
// Like init.js, each instance gets its own subroutine objects.
const card = id => {const copy = Object.assign({}, c.cardSet[id]); if (copy.subroutines) copy.subroutines = copy.subroutines.map(sub => Object.assign({}, sub, {broken: false})); return copy;};
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command) => {
  const d = {player, choices, title, command, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
let responseQueue = [];
// Windows under test are queued for inspection; other windows continue at once.
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
const watched = new Set();
c.TriggeredResponsePhase = (player, name, params, after) => {
  if (watched.has(name)) responseQueue.push({name, params, after});
  else if (after) after();
};
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const takeResponse = name => {
  const i = responseQueue.findIndex(event => event.name == name);
  assert(i >= 0, 'expected ' + name + ' response window');
  return responseQueue.splice(i, 1)[0];
};
const offered = (event, target) => c.ChoicesActiveTriggers(event.name)
  .filter(option => option.card == target)
  .map(option => option.card[event.name].Enumerate ? option.card[event.name].Enumerate.apply(option.card, event.params) : [{}])
  .flat();
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), expected, message);
const withAI = (side, value, fn) => {const saved = side.AI; side.AI = value; try {return fn();} finally {side.AI = saved;}};
const program = (title, subTypes) => ({title, player: runner, cardType: 'program', subTypes, memoryCost: 1, installCost: 1});
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
// Drive the engine's trash-before-install window as a player passing it.
const finishInstall = () => {for (let k = 0; k < 5 && c.currentPhase.title == 'Trash Before Install'; k++) c.currentPhase.Resolve.n();};
const reset = () => {
  c.turnEventCounts = {}; runner.grip.length = 0; runner.scoreArea.length = 0; corp.scoreArea.length = 0;
  corp.resolvingCards.length = 0; runner.stack.length = 0;
  c.attackedServer = null; c.encountering = false; c.encounteredIce = null;
  runner.identityCard.faction = 'Shaper'; c.intended.score = null; c.intended.steal = null;
  decisions = []; responseQueue = []; ai.preferred = null; c.executingCommand = '';
  for (const zone of [corp.HQ.root, corp.RnD.root, corp.archives.root, corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice, corp.archives.ice,
    runner.rig.programs, runner.rig.hardware, runner.rig.resources, runner.heap]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
};

const filler = (title = 'Sure Gamble', type = 'event', faction = 'Shaper') =>
  ({title, player: runner, cardType: type, faction, subTypes: [], installCost: 1});
const grip = n => {for (let i = 0; i < n; i++) put(filler(), runner.grip);};
const chooseAI = async side => {
  const decision = decisions.shift(); assert(decision, 'expected decision');
  const old = c.currentPhase;
  c.currentPhase = {identifier: old.identifier, title: decision.title};
  const index = await side.AI.SelectChoice(decision.choices);
  c.currentPhase = old;
  const choice = decision.choices[index]; assert(choice, 'legal AI choice'); decision.choose(choice); return choice;
};
const fire = (name, params = []) => {
  for (const option of c.ChoicesActiveTriggers(name)) {
    const hook = option.card[name];
    if (hook.automatic) hook.Resolve.apply(option.card, params);
  }
};
const ice = (title, subTypes, strength, subroutines, extra = {}) => Object.assign({title, player: corp, cardType: 'ice', subTypes,
  rezCost: 1, strength, rezzed: true, subroutines: subroutines.map(text => ({text, Resolve() {}}))}, extra);
const encounter = (server, index) => {c.attackedServer = server; c.approachIce = index; c.encountering = true;};
// Break draws a particle effect; the harness has no renderer.
c.particleSystems = {breaksubroutine: {spawnRect: {}}}; c.cardRenderer = {ParticleEffect() {}};
async function main() {
// Roughneck Repair Squad: three action clicks for 6 credits and an optional bad publicity removal.
reset(); grip(5);
const squad = put(card(26057), corp.HQ.cards);
assert.strictEqual(squad.AIEconomyCard, true);
corp.creditPool = 10; assert.strictEqual(squad.AIWorthInstalling([]), -1, "declined with sufficient economy");
put({title: "Unfunded ICE", player: corp, cardType: "ice", subTypes: [], rezCost: 10, strength: 0, subroutines: []}, corp.HQ.ice);
corp.creditPool = 1;
const installs = c.ChoicesCardInstall(squad);
const best = ai._bestInstallOption(installs, false);
assert(best >= 0 && installs[best].card == squad, 'Corp AI installs the economy asset');
const squadHome = remote(); c.MoveCard(squad, squadHome.root);
assert.strictEqual(squad.abilities[0].Enumerate.call(squad).length, 0, 'unrezzed ability is unavailable');
assert.strictEqual(await ai.CommandChoice(['rez', 'n']), 0);
assert.strictEqual(ai.preferred.cardToRez, squad, 'free rez is taken');
squad.rezzed = true; c.InvalidateActiveTriggerCandidateCache(); ai.preferred = null;
corp.clickTracker = 2;
assert.strictEqual(squad.abilities[0].Enumerate.call(squad).length, 0, 'needs three clicks');
corp.clickTracker = 3; c.currentPhase = c.phases.corpPostAction;
assert.strictEqual(squad.abilities[0].Enumerate.call(squad).length, 0, 'click ability only in the action phase');
c.currentPhase = c.phases.corpActionMain; corp.creditPool = 0;
assert.strictEqual(ai._bestMainPhaseEconomyOption(['trigger', 'n']), 0, 'economy policy triggers the ability');
assert.strictEqual(ai.preferred.cardToTrigger, squad);
corp.badPublicity = 0; squad.abilities[0].Resolve.call(squad);
assert.strictEqual(corp.creditPool, 6); assert.strictEqual(corp.clickTracker, 0);
assert.strictEqual(decisions.length, 0, 'no removal prompt without bad publicity');
// Human may decline; the Corp AI removes it.
corp.clickTracker = 3; corp.badPublicity = 2;
withAI(corp, null, () => squad.abilities[0].Resolve.call(squad));
assert.strictEqual(decisions.length, 1); decisions.shift().choose({id: 0});
assert.strictEqual(corp.badPublicity, 2, 'declining keeps bad publicity');
corp.clickTracker = 3; squad.abilities[0].Resolve.call(squad);
assert.strictEqual((await chooseAI(corp)).id, 1);
assert.strictEqual(corp.badPublicity, 1); assert.strictEqual(corp.creditPool, 18);

// Afshar: on HQ only one printed subroutine may be broken each encounter.
reset();
const afsharHQ = put(card(26058), corp.HQ.ice); afsharHQ.rezzed = true;
assert(afsharHQ.subroutines.every(sub => sub.printed));
encounter(corp.HQ, 0); c.InvalidateActiveTriggerCandidateCache();
assert.strictEqual(c.ChoicesEncounteredSubroutines().length, 2);
c.Break(afsharHQ.subroutines[1]);
assert(afsharHQ.subroutines[1].broken);
assert.strictEqual(c.ChoicesEncounteredSubroutines().length, 0, 'second printed subroutine is locked');
c.Break(afsharHQ.subroutines[0]);
assert(!afsharHQ.subroutines[0].broken, 'Break itself refuses a forbidden break');
const gained = {text: 'Gained subroutine', Resolve() {}};
afsharHQ.subroutines.push(gained);
assert.strictEqual(c.ChoicesEncounteredSubroutines().length, 1, 'non-printed subroutines are not limited');
afsharHQ.subroutines.pop();
c.UnbreakAll(afsharHQ);
assert.strictEqual(c.ChoicesEncounteredSubroutines().length, 2, 'limit resets with a new encounter');
// Utae counts pending selections before payment, without breaking anything early.
const utae = put(card(26005), runner.rig.programs);
for (const first of [0, 1]) {
  c.UnbreakAll(afsharHQ); utae.usedThisRun = false; runner.creditPool = 5;
  assert.strictEqual(c.ChoicesEncounteredSubroutines([afsharHQ.subroutines[first]]).length, 0);
  assert(afsharHQ.subroutines.every(sub => !sub.broken), 'selection leaves live flags unchanged');
  utae.abilities[0].Resolve.call(utae, {subroutine: afsharHQ.subroutines[first]});
  assert.strictEqual(decisions.length, 0, 'no illegal second printed break is offered');
  assert.strictEqual(runner.creditPool, 4, 'only one printed break is charged');
  assert.strictEqual(afsharHQ.subroutines.filter(sub => sub.broken).length, 1);
  assert(afsharHQ.subroutines[first].broken);
  // Revalidation also rejects stale, repeated or over-limit selections at payment.
  c.UnbreakAll(afsharHQ); utae.usedThisRun = false; runner.creditPool = 5;
  utae.PayXAndBreak.call(utae, [afsharHQ.subroutines[first], afsharHQ.subroutines[first], afsharHQ.subroutines[1 - first]]);
  assert.strictEqual(runner.creditPool, 4, 'invalid selections never add payment');
  assert.strictEqual(afsharHQ.subroutines.filter(sub => sub.broken).length, 1);
}
// Gained subroutines do not consume Afshar's printed allowance, in either order.
afsharHQ.subroutines.push(gained);
for (const selected of [[gained, afsharHQ.subroutines[1]], [afsharHQ.subroutines[1], gained]]) {
  c.UnbreakAll(afsharHQ); utae.usedThisRun = false; runner.creditPool = 5;
  utae.abilities[0].Resolve.call(utae, {subroutine: selected[0]});
  const choice = decisions.shift(); assert(choice, 'one additional legal break is offered');
  assert(afsharHQ.subroutines.every(sub => !sub.broken));
  choice.choose(choice.choices.find(option => option.subroutine == selected[1]));
  assert.strictEqual(decisions.length, 0);
  assert.strictEqual(runner.creditPool, 3, 'printed and gained breaks both paid');
  assert(selected.every(sub => sub.broken));
  assert(!afsharHQ.subroutines[0].broken);
}
afsharHQ.subroutines.pop(); c.UnbreakAll(afsharHQ);
c.MoveCard(utae, runner.heap);
// Remote copy has no limit.
const afsharRemote = put(card(26058), remote().ice); afsharRemote.rezzed = true;
encounter(c.GetServer(afsharRemote), 0); c.InvalidateActiveTriggerCandidateCache();
c.Break(afsharRemote.subroutines[0]); c.Break(afsharRemote.subroutines[1]);
assert(afsharRemote.subroutines.every(sub => sub.broken), 'both subroutines break away from HQ');
c.UnbreakAll(afsharRemote); c.MoveCard(utae, runner.rig.programs);
utae.usedThisRun = false; runner.creditPool = 5;
utae.abilities[0].Resolve.call(utae, {subroutine: afsharRemote.subroutines[0]});
const remoteChoice = decisions.shift(); assert(remoteChoice);
remoteChoice.choose(remoteChoice.choices.find(option => option.subroutine == afsharRemote.subroutines[1]));
assert.strictEqual(runner.creditPool, 3, 'Utae still pays for both remote breaks');
assert(afsharRemote.subroutines.every(sub => sub.broken));
c.MoveCard(utae, runner.heap);

// Run calculator with Buzzsaw (break up to 2 code gate subroutines) honours the limit.
c.encountering = false; c.attackedServer = null; c.approachIce = -1;
afsharRemote.subroutines.forEach(sub => {sub.broken = false;});
const buzzsaw = put(card(30005), runner.rig.programs); c.InvalidateActiveTriggerCandidateCache();
const rc = runner.AI.rc; rc.suppressOutput = true; rc.Print = () => {};
assert.strictEqual(rc.IceAI(afsharHQ, 10).maxSrBroken, 1);
assert.strictEqual(rc.IceAI(afsharRemote, 10).maxSrBroken, undefined);
const lostOn = server => rc.Calculate(server, 3, 5, 0, 8, Infinity, false, null).map(p => p[p.length - 1].runner_credits_lost);
const remoteLoss = lostOn(c.GetServer(afsharRemote));
assert(remoteLoss.includes(0), 'remote Afshar can be fully broken');
const hqLoss = lostOn(corp.HQ);
assert(hqLoss.length && hqLoss.every(loss => loss == 2), 'HQ route breaks only the ETR and loses 2 credits');
// Live encounter: after one break the planner allows no more.
encounter(corp.HQ, 0); afsharHQ.subroutines[1].broken = true;
assert.strictEqual(rc.IceAI(afsharHQ, 10).maxSrBroken, 0);
afsharHQ.subroutines[1].broken = false; c.encountering = false; c.attackedServer = null;
runner.rig.programs.length = 0;

// Sandstone: counter only when Sandstone itself is encountered; planner sees the coming counter.
reset();
const sandstone = put(card(26059), corp.HQ.ice); sandstone.rezzed = true;
const other = put(ice('Wall', ['Barrier'], 1, ['End the run.']), corp.HQ.ice); c.InvalidateActiveTriggerCandidateCache();
assert.strictEqual(rc.IceAI(sandstone, 10).strength, 5, 'next encounter strength before it begins');
c.AutomaticTriggers('automaticOnEncounter', [other]);
assert.strictEqual(c.Counters(sandstone, 'virus'), 0, 'other ice encounters add nothing');
encounter(corp.HQ, 0); c.AutomaticTriggers('automaticOnEncounter', [sandstone]);
assert.strictEqual(c.Counters(sandstone, 'virus'), 1); assert.strictEqual(c.Strength(sandstone), 5);
assert.strictEqual(rc.IceAI(sandstone, 10).strength, 5, 'during the encounter the placed counter is not double counted');
c.encountering = false; c.attackedServer = null; c.approachIce = -1;
assert.strictEqual(rc.IceAI(sandstone, 10).strength, 4);
same(rc.IceAI(sandstone, 10).sr, [[['endTheRun']]]);

// Trebuchet: rez bad publicity, trash subroutine, and a lingering trace lock.
reset();
const trebuchet = put(card(26060), corp.HQ.ice);
assert(c.CheckSubType(trebuchet, 'Liability') && c.CheckSubType(trebuchet, 'Destroyer') && c.CheckSubType(trebuchet, 'Tracer'));
assert(!c.CheckSubType(trebuchet, 'Illicit'));
trebuchet.rezzed = true; corp.badPublicity = 0; c.InvalidateActiveTriggerCandidateCache();
fire('responseOnRez', [other]); assert.strictEqual(corp.badPublicity, 0, 'other rez costs nothing');
fire('responseOnRez', [trebuchet]); assert.strictEqual(corp.badPublicity, 1);
trebuchet.subroutines[0].Resolve.call(trebuchet);
assert.strictEqual(decisions.length, 0, 'no target, no decision');
const victim = put(program('Victim', []), runner.rig.programs);
trebuchet.subroutines[0].Resolve.call(trebuchet);
assert.strictEqual(decisions.length, 1); assert.strictEqual(decisions[0].choices[0].card, victim);
decisions.shift().choose({card: victim});
assert(runner.heap.includes(victim), 'chosen card trashed');
rc.precalculated.runnerInstalledCardsLength = 0;
same(rc.IceAI(trebuchet, 10).sr, [[[]], [['misc_serious']]], 'no installed cards: trash sub is blank');
put(program('Breaker', ['Icebreaker']), runner.rig.programs);
rc.precalculated.runnerInstalledCardsLength = 1;
same(rc.IceAI(trebuchet, 10).sr, [[['misc_serious']], [['misc_serious']]]);
const asset = put({title: 'Corp asset', player: corp, cardType: 'asset', subTypes: [], trashCost: 1}, remote().root);
const runnerCard = runner.rig.programs[0];
encounter(corp.HQ, 0);
trebuchet.subroutines[1].Resolve.call(trebuchet);
assert.strictEqual(decisions[0].player, corp); decisions.shift().choose({num: 0});
assert.strictEqual(decisions[0].player, runner); decisions.shift().choose({num: 0});
assert(!c.CheckTrash(asset), 'successful trace forbids trashing Corp cards');
assert(c.CardEffectsForbid('steal', asset), 'and stealing');
assert(c.CheckTrash(runnerCard), 'Runner cards may still be trashed');
c.MoveCard(trebuchet, corp.archives.cards); c.InvalidateActiveTriggerCandidateCache();
assert(!c.CheckTrash(asset), 'lock outlives Trebuchet');
fire('responseOnRunEnds');
assert(c.CheckTrash(asset), 'lock ends with the run');
// Failed trace: no lock.
const trebuchet2 = put(card(26060), corp.HQ.ice); trebuchet2.rezzed = true; runner.identityCard.link = 7;
trebuchet2.subroutines[1].Resolve.call(trebuchet2);
decisions.shift().choose({num: 0}); decisions.shift().choose({num: 0});
assert(c.CheckTrash(asset), 'unsuccessful trace has no effect');
runner.identityCard.link = 0;
c.encountering = false; c.attackedServer = null; c.approachIce = -1;

// Secure and Protect: Double tutor installing ICE on a central server for 3 less.
reset(); grip(5);
const sap = put(card(26061), corp.HQ.cards);
assert.strictEqual(c.PlayClickCost(sap), 2, 'Double costs an additional click');
const gate = put(ice('Gate', ['Code Gate'], 3, ['End the run.'], {rezzed: false, rezCost: 3, elo: 1500}), corp.RnD.cards);
const weak = put(ice('Weak', ['Sentry'], 1, ['The Runner loses 1[c].'], {rezzed: false, rezCost: 1, elo: 1600}), corp.RnD.cards);
put({title: 'Filler op', player: corp, cardType: 'operation', subTypes: []}, corp.RnD.cards);
for (let i = 0; i < 4; i++) put(ice('Layer ' + i, ['Barrier'], 1, ['End the run.']), corp.RnD.ice);
corp.creditPool = 1;
let choices = sap._choices(1);
assert(choices.every(o => o.card.cardType == 'ice' && [corp.HQ, corp.RnD, corp.archives].includes(o.server)), 'only ICE on centrals');
assert(choices.some(o => o.server == corp.HQ && o.cost == 0), 'empty HQ install is free');
assert(choices.some(o => o.server == corp.RnD && o.cost == 1), 'fifth layer costs 4 - 3');
assert(c.FullCheckPlay(sap), 'playable with two clicks and its play cost');
corp.clickTracker = 1; assert(!c.FullCheckPlay(sap), 'Double needs two clicks'); corp.clickTracker = 3;
// Human resolution through Reveal and Install with the real discount.
corp.creditPool = 1; c.MoveCard(sap, corp.resolvingCards); c.InvalidateActiveTriggerCandidateCache();
withAI(corp, null, () => sap.Resolve.call(sap));
const pick = decisions[0].choices.find(o => o.card == gate && o.server == corp.RnD);
assert(pick, 'R&D option offered'); decisions.shift().choose(pick);
assert.strictEqual(decisions[0].player, runner, 'ICE revealed to the Runner'); decisions.shift().choose({});
finishInstall();
assert(corp.RnD.ice.includes(gate), 'installed protecting R&D'); assert(!corp.RnD.cards.includes(gate));
assert.strictEqual(corp.creditPool, 0, 'paid 4 - 3 = 1'); assert.strictEqual(sap.installingIce, null, 'discount cleared');
assert.strictEqual(c.InstallCost(weak, corp.RnD), 5, 'discount does not linger');
// No ICE: nothing to choose, R&D still shuffled.
c.MoveCard(weak, corp.archives.cards); decisions = [];
sap.Resolve.call(sap); assert.strictEqual(decisions.length, 0);

// Corp AI: plays the tutor for an unprotected central with stopping ICE in R&D only.
// Exercise normal ICE selection independently of the optional opening policy.
ai.options.openingHqThenRdIce = false;
reset(); grip(5);
const sap2 = put(card(26061), corp.HQ.cards);
const etr = put(ice('Stopper', ['Barrier'], 3, ['End the run.'], {rezzed: false, rezCost: 3, elo: 1500}), corp.RnD.cards);
put(ice('Taxer', ['Sentry'], 1, ['The Runner loses 1[c].'], {rezzed: false, rezCost: 1, elo: 1900}), corp.RnD.cards);
put({title: 'Agenda', player: corp, cardType: 'agenda', subTypes: [], agendaPoints: 2, advancementRequirement: 3}, corp.HQ.cards);
corp.creditPool = 6;
assert(sap2.AIWouldPlay(), 'tutor useful for an unprotected central');
assert(ai._commonCardToPlayChecks(sap2, '', false), 'real play checks accept it');
assert.strictEqual(await ai.CommandChoice(['play', 'n']), 0);
assert.strictEqual(ai.preferred.cardToPlay, sap2, 'main-phase policy plays the tutor'); ai.preferred = null;
c.MoveCard(sap2, corp.resolvingCards); c.InvalidateActiveTriggerCandidateCache();
sap2.Resolve.call(sap2);
const aiPick = await chooseAI(corp);
assert.strictEqual(aiPick.card, etr, 'AI prefers stopping ICE over higher-ELO tax ICE');
assert([corp.HQ, corp.RnD, corp.archives].includes(aiPick.server));
c.MoveCard(sap2, corp.HQ.cards);
// Guards: stopping ICE already in HQ, or no ICE in R&D.
const handWall = put(ice('Hand wall', ['Barrier'], 1, ['End the run.'], {rezzed: false, rezCost: 1}), corp.HQ.cards);
assert(!sap2.AIWouldPlay(), 'a cheaper HQ install competes');
c.MoveCard(handWall, corp.archives.cards);
for (const card of corp.RnD.cards.slice()) if (card.cardType == 'ice') c.MoveCard(card, corp.archives.cards);
assert(!sap2.AIWouldPlay(), 'no ICE to find');
console.log('Downfall batch 12: mechanics, resource guards, cleanup and real AI consumers passed.');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
