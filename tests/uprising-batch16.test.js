'use strict';
// Uprising batch 16 (26128–26130): Cyberdex Sandbox, False Lead, NAPD Cordon.
// Real engine and AI consumers; setup mirrors tests/uprising-integration.test.js.
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

c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 10, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  maxHandSize: 5, coreDamage: 0, grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0, visible: true}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const decision = {player, choices, title, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
// Resolve every enumerated trigger immediately (all batch-16 responses are
// automatic or open their own decision), then continue.
c.TriggeredResponsePhase = (player, name, params, after) => {
  for (const choice of c.ChoicesActiveTriggers(name)) {
    const handler = choice.card[name];
    const options = handler.Enumerate ? handler.Enumerate.apply(choice.card, params || []) : [{}];
    if (options.length) handler.Resolve.call(choice.card, options[0]);
  }
  if (after) after();
};
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const agenda = (points = 2) => ({title: 'Agenda', player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: 3, agendaPoints: points});
const reset = () => {
  decisions = []; ai.preferred = null; c.executingCommand = ''; c.attackedServer = null; c.approachIce = -1;
  c.accessingCard = null;
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.scoreArea, corp.resolvingCards,
    runner.scoreArea, runner.grip, runner.heap, runner.rig.programs, runner.rig.hardware, runner.rig.resources]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  runner.creditPool = 5; runner.clickTracker = 4;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
  c.turnEventCounts = {};
  c.InvalidateActiveTriggerCandidateCache();
};

// --- Cyberdex Sandbox ---------------------------------------------------
reset();
let sandbox = put(card(26128), corp.scoreArea);
const virusProg = put({title: 'Virus', player: runner, cardType: 'program', subTypes: ['Virus'], virus: 3}, runner.rig.programs);
c.Purge();
assert.strictEqual(corp.creditPool, 14, 'first purge this turn gains 4');
assert.strictEqual(virusProg.virus, 0);
c.Purge();
assert.strictEqual(corp.creditPool, 14, 'second purge this turn gains nothing');
c.turnEventCounts = {};
c.Purge();
assert.strictEqual(corp.creditPool, 18, 'resets each turn');

// Inactive (installed, unscored) Sandbox does not pay.
reset();
const installedSandbox = put(card(26128), remote().root);
c.Purge();
assert.strictEqual(corp.creditPool, 10, 'unscored Sandbox inactive');
assert.strictEqual(c.TurnEventCount('corpPurge'), 1);

// Score: optional purge through the real Score(); AI purges for the income.
// The earlier purge this turn means scoring later in the turn gains nothing.
reset();
const scoreServer = remote();
sandbox = put(card(26128), scoreServer.root); sandbox.advancement = 4;
put({title: 'Virus', player: runner, cardType: 'program', subTypes: ['Virus'], virus: 2}, runner.rig.programs);
c.Score(sandbox);
assert(corp.scoreArea.includes(sandbox));
let d = decisions.shift();
assert(d && d.player === corp, 'score opens the optional purge');
assert.deepStrictEqual(Array.from(d.choices, o => o.id), [1], 'AI chooses to purge');
d.choose(d.choices[0]);
assert.strictEqual(corp.creditPool, 14, 'score purge triggers Sandbox itself');
assert.strictEqual(runner.rig.programs[0].virus, 0);
// Human choices include declining; declining purges nothing.
reset();
corp.AI = null;
sandbox = put(card(26128), remote().root); sandbox.advancement = 4;
const kept = put({title: 'Virus', player: runner, cardType: 'program', subTypes: ['Virus'], virus: 2}, runner.rig.programs);
c.Score(sandbox); d = decisions.shift();
assert.deepStrictEqual(Array.from(d.choices, o => o.id), [1, 0]);
d.choose(d.choices[1]);
assert.strictEqual(kept.virus, 2); assert.strictEqual(corp.creditPool, 10);
corp.AI = ai;
// After an earlier purge with no counters left, the AI declines the score purge.
reset();
c.RecordTurnEvent('corpPurge');
sandbox = put(card(26128), remote().root); sandbox.advancement = 4;
c.Score(sandbox); d = decisions.shift();
assert.deepStrictEqual(Array.from(d.choices, o => o.id), [0], 'no income and nothing to purge: decline');

// Purge action as economy: the real command selector purges when the Corp
// needs credits (here, to rez an installed asset).
reset();
put(card(26128), corp.scoreArea);
put({title: 'Pricey', player: corp, cardType: 'asset', subTypes: [], rezCost: 5, trashCost: 2}, remote().root);
corp.creditPool = 0;
c.globalProperties.agendaPointsToWin = 7;
let commands = c.EnumeratePhase();
assert(commands.includes('purge'), 'purge legal with three clicks');
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'purge', 'Sandbox income makes purge the economy action');
ai.preferred = null;
assert.strictEqual(ai._purgeIncome(), 4);
c.RecordTurnEvent('corpPurge');
assert.strictEqual(ai._purgeIncome(), 0, 'no income after the first purge');
corp.scoreArea.length = 0; c.turnEventCounts = {};
commands = c.EnumeratePhase();
assert.notStrictEqual(commands[ai.Choice(commands, 'command')], 'purge', 'without Sandbox no economic purge');
ai.preferred = null;

// --- False Lead ---------------------------------------------------------
reset();
const falseLead = put(card(26129), corp.scoreArea);
const flAbility = () => c.ChoicesTriggerableAbilities(corp).find(o => o.card === falseLead);
corp.AI = null;
assert(flAbility(), 'human Corp may use it in any paid window');
corp.AI = ai;
// AI: Runner turn start, a remote agenda at stake.
c.playerTurn = runner; c.currentPhase = c.phases.runnerStartResponse; c.activePlayer = corp;
assert(!flAbility(), 'AI holds it with nothing at stake');
put(agenda(), remote().root);
assert(flAbility(), 'AI uses it to protect a remote agenda');
commands = c.EnumeratePhase();
assert(commands.includes('trigger'));
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'trigger');
assert.strictEqual(ai.preferred.cardToTrigger, falseLead); ai.preferred = null;
const choice = flAbility();
choice.ability.Resolve.call(falseLead);
assert.strictEqual(runner.clickTracker, 2, 'Runner loses two clicks');
assert(!corp.scoreArea.includes(falseLead) && c.removedFromGame.includes(falseLead), 'forfeited');
// Fewer than two clicks: the cost is paid but nothing is lost.
reset();
const lead2 = put(card(26129), corp.scoreArea);
corp.AI = null; runner.clickTracker = 1;
lead2.abilities[0].Resolve.call(lead2);
assert.strictEqual(runner.clickTracker, 1); assert(c.removedFromGame.includes(lead2));
corp.AI = ai;
// AI guards: Corp's own turn, during a run, too few clicks; Runner near win.
reset();
const lead3 = put(card(26129), corp.scoreArea); put(agenda(), remote().root);
assert(!lead3.AITriggerInPaidWindow(), 'not on the Corp turn');
c.playerTurn = runner; c.attackedServer = corp.HQ;
assert(!lead3.AITriggerInPaidWindow(), 'not mid-run');
c.attackedServer = null; runner.clickTracker = 1;
assert(!lead3.AITriggerInPaidWindow(), 'pointless below two clicks');
corp.remoteServers.length = 0; runner.clickTracker = 4;
const stolen = put(Object.assign(agenda(3), {agendaPoints: 5}), runner.scoreArea);
assert(lead3.AITriggerInPaidWindow(), 'Runner close to winning');
// Installed (unscored) False Lead has no ability.
reset();
const installedLead = put(card(26129), remote().root);
corp.AI = null;
assert(!c.ChoicesTriggerableAbilities(corp).some(o => o.card === installedLead));
corp.AI = ai;

// --- NAPD Cordon --------------------------------------------------------
reset();
const cordon = put(card(26130), corp.HQ.cards);
assert(!cordon.AIWouldPlay(), 'nothing to protect');
put(agenda(), corp.HQ.cards);
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, cordon); ai.preferred = null;
c.Play(cordon); d = decisions.shift(); if (d) d.choose(d.choices[0]);
assert.strictEqual(c.ActiveLockdown(), cordon);
c.CleanupCorpResolvingCards();
assert(corp.resolvingCards.includes(cordon), 'stays until the next Corp turn');
const other = put(card(26130), corp.HQ.cards);
assert(!c.FullCheckPlay(other), 'no second Lockdown');
assert(!other.AIWouldPlay());
// Steal costs: 4 plus 2 per advancement counter, through the real access phase.
const target = put(agenda(), remote().root); target.advancement = 2;
assert.deepStrictEqual(JSON.parse(JSON.stringify(c.StealCost(target))), {credits: 8, clicks: 0, programs: 0});
c.playerTurn = runner; c.activePlayer = runner; c.attackedServer = GetServerSafe(target);
c.accessingCard = target; c.currentPhase = c.phases.runAccessingCard;
runner.creditPool = 7;
assert(!c.CheckSteal(), 'cannot afford 8');
let opts = c.EnumeratePhase();
assert(!opts.includes('steal') && opts.includes('n'), 'decline remains');
runner.creditPool = 8;
assert(c.CheckSteal());
opts = c.EnumeratePhase();
assert(opts.includes('steal'));
c.phases.runAccessingCard.Resolve.steal();
for (d = decisions.shift(); d; d = decisions.shift()) d.choose(d.choices[0]);
assert.strictEqual(runner.creditPool, 0, 'paid 8');
assert(runner.scoreArea.includes(target), 'stolen');
const plainAgenda = agenda();
assert.strictEqual(c.StealCost(plainAgenda).credits, 4, 'unadvanced agenda costs 4');
// Expiry removes the cost.
c.CleanupCorpResolvingCards(true);
assert.strictEqual(c.ActiveLockdown(), null);
assert.strictEqual(c.StealCost(plainAgenda).credits, 0);
assert(corp.archives.cards.includes(cordon));
// Remote agenda is also a reason to play.
reset();
const cordon2 = put(card(26130), corp.HQ.cards); put(agenda(), remote().root);
assert(cordon2.AIWouldPlay());

function GetServerSafe(cardInServer) { return c.GetServer(cardInServer); }

(async () => {
  // Real Runner access selector steals when the Cordon cost is affordable.
  reset();
  put(card(26130), corp.resolvingCards);
  const accessed = put(agenda(), remote().root); accessed.advancement = 2;
  c.playerTurn = runner; c.activePlayer = runner; c.attackedServer = c.GetServer(accessed);
  c.accessingCard = accessed; c.currentPhase = c.phases.runAccessingCard; runner.creditPool = 8;
  const affordable = c.EnumeratePhase();
  assert.strictEqual(affordable[await runner.AI._internalChoiceDetermination(affordable, 'command')], 'steal');
  if (process.env.VERBOSE) console.log('uprising-batch16: all checks passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
