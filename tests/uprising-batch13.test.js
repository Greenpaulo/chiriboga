'use strict';
// Uprising batch 13 (26117–26119): Digital Rights Management, SYNC Rerouting and
// Ganked! through real engine helpers, Corp/Runner selectors and the run calculator.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
const plain = v => v && typeof v === 'object' && (Array.isArray(v) || Object.getPrototypeOf(Object.getPrototypeOf(v) || {}) == null);
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && plain(value) ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jq = new Proxy(function () {}, {get: (t, k) => k === 'extend' ? extend : stub, apply: () => stub});
const c = {console, cardSet: [], setIdentifiers: [], $: jq, jQuery: jq, PIXI: stub,
  window: {}, document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout, clearTimeout, setInterval: () => 0, Image: function () {}, Audio: function () {return stub;}};
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
// Shared engine setup (copied from tests/uprising-integration.test.js).
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
c.particleSystems = {breaksubroutine: {spawnRect: {}}}; c.cardRenderer = {ParticleEffect() {}};
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  maxHandSize: 5, coreDamage: 0, grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
c.playerTurn = corp; c.activePlayer = corp; c.viewingPlayer = corp;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0, visible: true}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
const realDecisionPhase = c.DecisionPhase;
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
const realOpportunityForAvoidPrevent = c.OpportunityForAvoidPrevent;
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command, cancel) => {
  if (player === runner) choices = c.LegalBreakChoices(context, choices);
  const decision = {player, choices, title, command, cancel, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
c.TriggeredResponsePhase = (player, name, params, after) => { if (after) after(); };
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const wall = (title = 'Wall') => ({title, player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost: 2, strength: 4,
  subroutines: [{text: 'End the run.', Resolve() {c.EndTheRun();}}],
  AIImplementIce(rc, result) {result.sr = [[['endTheRun']]]; return result;}});
const reset = () => {
  decisions = []; ai.preferred = null; c.executingCommand = ''; c.attackedServer = null; c.approachIce = -1;
  c.encountering = false; c.movement = false; c.accessingCard = null;
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice,
    corp.archives.ice, corp.scoreArea, corp.resolvingCards, corp.installingCards,
    runner.scoreArea, runner.grip, runner.heap, runner.rig.programs, runner.rig.hardware, runner.rig.resources]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  runner.creditPool = 5; runner.clickTracker = 4; runner.coreDamage = 0; corp.tempBonusClicks = 0;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
  c.turnEventCounts = {};
};
const finishInstall = () => {
  for (let i = 0; i < 5 && c.currentPhase.title === 'Trash Before Install'; i++) c.currentPhase.Resolve.n();
  assert.notStrictEqual(c.currentPhase.title, 'Trash Before Install', 'install finishes');
};
const select = decision => {
  c.currentPhase = {title: decision.title, identifier: 'Decision', player: decision.player};
  const index = decision.player.AI.Choice(decision.choices, 'select');
  assert(index >= 0 && index < decision.choices.length, 'AI picks a legal option');
  const option = decision.choices[index]; decision.choose(option); return option;
};
const agenda = (title, points, extra = {}) => Object.assign({title, player: corp, cardType: 'agenda', subTypes: [],
  agendaPoints: points, advancementRequirement: points + 1, canBeAdvanced: true, elo: 1600}, extra);
let d, commands;

// Digital Rights Management: last-turn HQ success restriction and its reset.
reset();
const drm = put(card(26117), corp.HQ.cards);
assert.strictEqual(drm.Enumerate().length, 1);
c.playerTurn = runner; c.attackedServer = corp.RnD;
drm.responseOnRunSuccessful.Resolve.call(drm);
assert.strictEqual(drm.Enumerate().length, 1, 'an R&D run does not restrict it');
c.attackedServer = corp.HQ; drm.responseOnRunSuccessful.Resolve.call(drm);
assert.strictEqual(drm.Enumerate().length, 0, 'successful Runner-turn HQ run blocks it');
assert(!c.FullCheckPlay(drm));
drm.responseOnRunnerTurnBegins.Resolve.call(drm);
assert.strictEqual(drm.Enumerate().length, 1, 'restriction covers only the last Runner turn');
c.playerTurn = corp; drm.responseOnRunSuccessful.Resolve.call(drm);
assert.strictEqual(drm.Enumerate().length, 1, 'Corp-turn runs do not count');
assert(c.ChoicesActiveTriggers('responseOnRunSuccessful').some(o => o.card === drm), 'tracker works from HQ');
c.attackedServer = null;

// Real Corp command selection plays it, tutors the best agenda, then installs.
reset();
const drm2 = put(card(26117), corp.HQ.cards);
put(agenda('Small agenda', 1), corp.RnD.cards);
const big = put(agenda('Big agenda', 3), corp.RnD.cards);
put({title: 'Filler', player: corp, cardType: 'operation', subTypes: [], playCost: 0}, corp.RnD.cards);
const drmRemote = remote(); const drmIce = put(wall('Remote wall'), drmRemote.ice); drmIce.rezzed = true;
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, drm2); ai.preferred = null;
c.Play(drm2);
d = decisions.shift();
assert(d.title.includes("Playing")); d.choose(d.choices[0]); d = decisions.shift();
assert(d.choices.some(o => o.card === null), 'search may fail to find');
assert(!d.choices.some(o => o.card && o.card.cardType !== 'agenda'), 'only agendas are found');
assert.strictEqual(select(d).card, big, 'AI tutors the highest-point agenda');
d = decisions.shift(); assert(d.title.includes('Revealing') && d.player === runner); d.choose(d.choices[0]);
assert(corp.HQ.cards.includes(big) && !corp.RnD.cards.includes(big));
d = decisions.shift();
assert(d.choices.every(o => !o.server || o.server.cards === undefined), 'only remote roots are offered');
assert(d.choices.some(o => o.card === null), 'install is optional');
assert.strictEqual(select(d).card, big, 'AI installs the tutored agenda');
finishInstall();
assert(c.CheckInstalled(big) && !corp.HQ.cards.includes(big));
big.advancement = 4;
assert(!c.CheckScore(big), 'cannot score for the remainder of the turn');
c.turnEventCounts = {};
assert(c.CheckScore(big), 'restriction ends with the turn');
// A failed search with nothing installable needs no install choice.
reset();
const drm3 = put(card(26117), corp.HQ.cards);
drm3.Resolve.call(drm3);
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); d.choose(d.choices[0]);
assert.strictEqual(decisions.length, 0, 'nothing installable means no install choice');
assert.strictEqual(c.TurnEventCount('corpCannotScore'), 1);
// AI guards: agenda already in HQ, none in R&D, HQ run last turn, scorable agenda.
reset();
const drm4 = put(card(26117), corp.HQ.cards);
assert(!drm4.AIWouldPlay(), 'no agenda in R&D');
put(agenda('R&D agenda', 2), corp.RnD.cards);
assert(drm4.AIWouldPlay());
const handAgenda = put(agenda('Hand agenda', 2), corp.HQ.cards);
assert(!drm4.AIWouldPlay(), 'HQ already holds an agenda');
c.MoveCard(handAgenda, corp.archives.cards);
const scorable = put(agenda('Scorable', 2, {advancement: 3}), remote().root);
assert(!drm4.AIWouldPlay(), 'does not block a score this turn');
c.MoveCard(scorable, corp.archives.cards);
drm4.successfulHQRunLastTurn = true; assert(!drm4.AIWouldPlay());

// SYNC Rerouting: real command selection, shared Lockdown lifecycle, run tax.
reset(); runner.tags = 0;
const sync = put(card(26118), corp.HQ.cards);
const syncIce = put(wall('HQ wall'), corp.HQ.ice); syncIce.rezzed = true;
assert.strictEqual(sync.trashCost, 3);
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, sync); ai.preferred = null;
c.Play(sync); d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(c.ActiveLockdown(), sync);
c.CleanupCorpResolvingCards(); assert(corp.resolvingCards.includes(sync), 'stays in play until the next Corp turn');
const otherLockdown = put(card(26103), corp.HQ.cards);
assert(!c.FullCheckPlay(otherLockdown), 'one active Lockdown at a time');
assert(!sync.AIWouldPlay(), 'AI does not play a second Lockdown');
(async function runnerChecks() {
// Each run begins: the real Runner selector pays when it can, otherwise takes the tag.
c.playerTurn = runner; c.attackedServer = corp.HQ;
assert(c.ChoicesActiveTriggers('responseOnRunBegins').some(o => o.card === sync));
runner.creditPool = 5;
sync.responseOnRunBegins.Resolve.call(sync);
d = decisions.shift(); assert.strictEqual(d.player, runner);
c.currentPhase = {title: d.title, identifier: 'Decision', player: runner};
const payIndex = await runner.AI._internalChoiceDetermination(d.choices, 'select');
assert.strictEqual(d.choices[payIndex].id, 0, 'Runner AI pays 4 credits when affordable');
d.choose(d.choices[payIndex]);
assert.strictEqual(runner.creditPool, 1); assert.strictEqual(runner.tags, 0);
sync.responseOnRunBegins.Resolve.call(sync);
d = decisions.shift(); assert.strictEqual(d.choices.map(o => o.id).join(), '1', 'cannot pay without 4 credits');
d.choose(d.choices[0]); assert.strictEqual(runner.tags, 1);
runner.tags = 0; c.attackedServer = null; c.playerTurn = corp;
// Run calculator charges the tax once at run start (credits, else a tag).
reset(); runner.tags = 0;
const taxed = put(card(26118), corp.resolvingCards);
runner.creditPool = 6;
let runPath = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(runPath && runPath[0].runner_credits_lost === 4, 'planned run pays the 4-credit tax');
runner.creditPool = 3;
runPath = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(runPath && runPath[0].runner_credits_lost === 0 && runner.AI.rc.TotalEffect(runPath[0]).tag === 1,
  'an unaffordable tax is modelled as a tag');
c.MoveCard(taxed, corp.archives.cards);
runPath = runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert(runPath && runPath[0].runner_credits_lost === 0 && !runner.AI.rc.TotalEffect(runPath[0]).tag, 'no tax once it leaves play');
// AI play guard: a rich Runner without tag punishment is not worth taxing.
reset();
const sync2 = put(card(26118), corp.HQ.cards);
runner.creditPool = 15; assert(!sync2.AIWouldPlay());
runner.creditPool = 6; assert(sync2.AIWouldPlay());

// Ganked!: R&D reveal, Corp target choice, forced encounter during access,
// resumed access, and ETR after success ends the run without an unsuccessful run.
const accessPhase = {player: runner, identifier: 'Access response', title: 'Accessed'};
const startAccess = (g, server) => {
  c.forcedEncounters = []; c.runSuccessDeclared = true; c.attackedServer = server;
  c.approachIce = -1; c.encountering = false; c.encounteredIce = null; c.accessingCard = g;
  c.currentPhase = accessPhase; c.playerTurn = runner;
};
reset();
const ganked = put(card(26119), corp.HQ.cards);
const strong = put(wall('Strong wall'), corp.HQ.ice); strong.rezzed = true;
strong.subroutines = strong.subroutines.concat([{text: 'End the run.', Resolve() {c.EndTheRun();}}]);
const weak = put(wall('Weak wall'), corp.HQ.ice); weak.rezzed = true;
const unrezzed = put(wall('Unrezzed wall'), corp.HQ.ice);
startAccess(ganked, corp.HQ);
assert.strictEqual(ganked.responseOnAccess.Enumerate.call(ganked).length, 1);
ganked.responseOnAccess.Resolve.call(ganked);
d = decisions.shift(); assert.strictEqual(d.player, corp);
assert(!d.choices.some(o => o.card === unrezzed), 'only rezzed ice is a target');
assert(d.choices.some(o => o.card === null), 'trashing is optional');
c.currentPhase = {title: d.title, identifier: 'Decision', player: corp};
const gankedChoice = d.choices[ai.Choice(d.choices, 'select')];
assert.strictEqual(gankedChoice.card, strong, 'Corp AI chooses the strongest rezzed ice');
// DecisionPhase returns to the access window before its callback.
c.currentPhase = accessPhase; d.choose(gankedChoice);
assert(corp.archives.cards.includes(ganked), 'Ganked! is trashed');
assert.strictEqual(c.accessingCard, null, 'its access is complete');
assert.strictEqual(c.GetApproachEncounterIce(), strong);
assert.strictEqual(c.encounteredIce, strong);
assert.strictEqual(c.approachIce, 0, 'run planning sees the forced ice at its position');
assert.strictEqual(c.currentPhase, c.phases.runEncounterIce);
// Runner gets through: the encounter returns to the access window.
c.ChangePhase(c.phases.runSubroutines); c.subroutine = 2;
c.phases.runSubroutines.Resolve.n();
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd);
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.currentPhase, accessPhase, 'access resumes after the encounter');
assert.strictEqual(c.approachIce, -1); assert(!c.encountering);
assert.strictEqual(c.forcedEncounters.length, 0);
// Ending the run during the forced encounter goes to run end, not unsuccessful.
const ganked2 = put(card(26119), corp.HQ.cards);
startAccess(ganked2, corp.HQ);
ganked2.responseOnAccess.Resolve.call(ganked2);
d = decisions.shift(); d.choose(d.choices.find(o => o.card === weak));
c.EndTheRun(false);
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd);
assert.strictEqual(c.phases.runEncounterEnd.next.identifier, 'Forced encounter return');
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd, 'encounter-end window before the run ends');
assert.strictEqual(c.phases.runEncounterEnd.next, c.phases.runEnds, 'successful run is not made unsuccessful');
// Decline, no rezzed ice, and no run.
const ganked3 = put(card(26119), corp.HQ.cards);
startAccess(ganked3, corp.HQ);
ganked3.responseOnAccess.Resolve.call(ganked3);
d = decisions.shift(); d.choose(d.choices.find(o => !o.card));
assert(corp.HQ.cards.includes(ganked3) && c.forcedEncounters.length === 0, 'decline keeps it and forces nothing');
strong.rezzed = false; weak.rezzed = false;
assert.strictEqual(ganked3.responseOnAccess.Enumerate.call(ganked3).length, 0, 'no rezzed ice: no trigger');
strong.rezzed = true; c.attackedServer = null;
assert.strictEqual(ganked3.responseOnAccess.Enumerate.call(ganked3).length, 0, 'no trigger outside a run');
c.forcedEncounters = []; c.runSuccessDeclared = false;
// Accessing it in R&D reveals it; it is hidden again afterwards elsewhere.
reset();
const gankedRnD = put(card(26119), corp.RnD.cards); gankedRnD.faceUp = false;
startAccess(gankedRnD, corp.RnD);
gankedRnD.automaticOnAccess.Resolve.call(gankedRnD, gankedRnD);
assert(gankedRnD.faceUp && gankedRnD.knownToRunner, 'revealed while accessed in R&D');
assert.strictEqual(gankedRnD.responseOnAccess.Enumerate.call(gankedRnD).length, 0, 'R&D has no rezzed ice');
c.attackedServer = null; c.runSuccessDeclared = false;
// Corp install placement through the real upgrade-server consumer.
reset();
const gankedHand = put(card(26119), corp.HQ.cards);
assert.strictEqual(ai._bestServerToUpgrade(gankedHand), null, 'no rezzed ice anywhere: hold it');
const hqIce = put(wall('HQ ice'), corp.HQ.ice); hqIce.rezzed = true;
assert.strictEqual(ai._bestServerToUpgrade(gankedHand), corp.HQ);
const agendaRemote = remote(); put(agenda('Remote agenda', 2), agendaRemote.root);
const remoteIce = put(wall('Remote ice'), agendaRemote.ice); remoteIce.rezzed = true;
assert.strictEqual(ai._bestServerToUpgrade(gankedHand), agendaRemote, 'agenda remote with rezzed ice first');
const placed = put(card(26119), agendaRemote.root);
assert(placed.AIPunishesAccess(agendaRemote) > 0 && placed.AIPunishesAccess(corp.HQ) === 0);
assert.strictEqual(ai._bestServerToUpgrade(gankedHand), corp.HQ, 'one copy per server');

if (process.env.VERBOSE) console.log('uprising-batch13: ok');
})().catch(error => { console.error(error); process.exit(1); });
