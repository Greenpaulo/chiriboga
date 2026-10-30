'use strict';
// Genesis: Cyber Exodus (2041–2060) cards.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/genesis.js'])
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
// Resolve every enumerated trigger immediately, then continue.
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

const fullReset = () => {
  reset();
  for (const s of [corp.HQ, corp.RnD, corp.archives]) { s.ice.length = 0; s.root.length = 0; }
  runner.tags = 0; runner.coreDamage = 0; corp.AI = ai; runner.AI.preferred = null;
  c.InvalidateActiveTriggerCandidateCache();
};
const filler = n => { for (let i = 0; i < n; i++) put({title: 'Filler ' + i, player: runner, cardType: 'event', subTypes: [], playCost: 0}, runner.grip); };

// --- Viper ---------------------------------------------------------------
fullReset();
{
  const viper = put(card(2052), corp.HQ.ice); viper.rezzed = true;
  const realTrace = c.Trace, realEtr = c.EndTheRun; const traced = [];
  c.Trace = (strength, cb, ctx) => { traced.push(strength); cb.call(ctx, true); };
  c.EndTheRun = () => { traced.push('etr'); };
  viper.subroutines[0].Resolve.call(viper);
  assert.strictEqual(runner.clickTracker, 3, 'successful trace: lose a click');
  runner.clickTracker = 0; viper.subroutines[0].Resolve.call(viper);
  assert.strictEqual(runner.clickTracker, 0, 'if able');
  viper.subroutines[1].Resolve.call(viper);
  assert.deepStrictEqual(traced, [3, 3, 3, 'etr']);
  c.Trace = (strength, cb, ctx) => cb.call(ctx, false);
  runner.clickTracker = 4; viper.subroutines[0].Resolve.call(viper);
  viper.subroutines[1].Resolve.call(viper);
  assert.strictEqual(runner.clickTracker, 4, 'failed trace does nothing');
  assert.strictEqual(traced.length, 4);
  c.Trace = realTrace; c.EndTheRun = realEtr;
  const r = viper.AIImplementIce(null, {}, 0, false);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.sr)), [[['loseClicks']], [['endTheRun']]]);
}

// --- Edge of World -----------------------------------------------------
fullReset();
{
  const server = remote();
  const eow = put(card(2053), server.root);
  put(card(2052), server.ice); put(card(2052), server.ice);
  filler(5);
  c.accessingCard = eow;
  assert.strictEqual(eow.responseOnAccess.Enumerate.call(eow).length, 1);
  assert.strictEqual(eow.AIPunishesAccess(server), 2);
  eow.responseOnAccess.Resolve.call(eow);
  const d = decisions.shift();
  assert.strictEqual(corp.AI.preferred.option.id, 0, 'AI fires');
  corp.AI.preferred = null;
  d.choose(d.choices[0]);
  assert.strictEqual(corp.creditPool, 7, 'paid 3');
  assert.strictEqual(runner.coreDamage, 2, '1 core damage per ice');
  assert.strictEqual(runner.grip.length, 3);
  corp.creditPool = 2;
  assert.strictEqual(eow.responseOnAccess.Enumerate.call(eow).length, 0, 'cannot pay');
  assert.strictEqual(eow.AIPunishesAccess(server), 0);
  corp.creditPool = 10; server.ice.length = 0;
  assert.strictEqual(eow.responseOnAccess.Enumerate.call(eow).length, 0, 'no ice, no effect');
  const inHQ = put(card(2053), corp.HQ.cards); c.accessingCard = inHQ; put(card(2052), corp.HQ.ice);
  assert.strictEqual(inHQ.responseOnAccess.Enumerate.call(inHQ).length, 0, 'only while installed');
}

// --- Sunset ------------------------------------------------------------
fullReset();
{
  const weak = put(card(2060), corp.HQ.ice); // strength 0, innermost
  const strong = put(card(2052), corp.HQ.ice); // strength 4
  put(card(2057), corp.HQ.ice); // strength 2, outermost
  const sunset = put(card(2054), corp.HQ.cards);
  const opts = sunset.Enumerate();
  assert.strictEqual(opts.length, 1); assert.strictEqual(opts[0].server, corp.HQ);
  assert(sunset.AIWouldPlay());
  const commands = c.EnumeratePhase();
  assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play', 'AI plays Sunset through the real selector');
  assert.strictEqual(ai.preferred.cardToPlay, sunset); ai.preferred = null;
  sunset.Resolve.call(sunset, opts[0]);
  assert.deepStrictEqual(Array.from(corp.HQ.ice, i => i.title), ['Chimera', 'Woodcutter', 'Viper'], 'strongest outermost');
  assert(!sunset.AIWouldPlay(), 'nothing left to improve');
  corp.AI = null;
  const h = sunset.Enumerate();
  assert.strictEqual(h.length, 1);
  sunset.Resolve.call(sunset, h[0]);
  decisions.shift().choose({card: weak});
  decisions.shift().choose({card: strong});
  assert.deepStrictEqual(Array.from(corp.HQ.ice, i => i.title), ['Woodcutter', 'Viper', 'Chimera'], 'human order, outermost first');
  corp.AI = ai;
  corp.HQ.ice.length = 1;
  assert.strictEqual(sunset.Enumerate().length, 0, 'needs a server with 2+ ice');
}

// --- Marked Accounts ---------------------------------------------------
fullReset();
{
  const ma = put(card(2055), remote().root); ma.rezzed = true;
  ma.abilities[0].Resolve.call(ma);
  assert.strictEqual(ma.credits, 3); assert.strictEqual(corp.clickTracker, 2);
  ma.responseOnCorpTurnBegins.Resolve.call(ma);
  assert.strictEqual(ma.credits, 2); assert.strictEqual(corp.creditPool, 11);
  ma.credits = 0; ma.responseOnCorpTurnBegins.Resolve.call(ma);
  assert.strictEqual(corp.creditPool, 11, 'if able');
  c.InvalidateActiveTriggerCandidateCache();
  const commands = c.EnumeratePhase();
  assert(commands.includes('trigger'));
  ai._bestMainPhaseEconomyOption(commands);
  assert.strictEqual(ai.preferred && ai.preferred.cardToTrigger, ma, 'reloads Marked Accounts for economy');
  ai.preferred = null;
  ma.credits = 3;
  ai._bestMainPhaseEconomyOption(c.EnumeratePhase());
  assert(!(ai.preferred && ai.preferred.cardToTrigger === ma), 'not while loaded');
  ai.preferred = null;
  assert(ma.AIRezWhenCan());
  corp.creditPool = 0; put({title: 'Pricey', player: corp, cardType: 'asset', subTypes: [], rezCost: 5, trashCost: 2}, remote().root);
  assert.strictEqual(ma.AIWorthInstalling([]), 0, 'new server when economy wanted');
}

// --- Woodcutter ----------------------------------------------------------
fullReset();
{
  const wc = put(card(2057), corp.RnD.ice);
  assert(!c.CheckAdvance(wc), 'not while unrezzed');
  wc.rezzed = true;
  assert(c.CheckAdvance(wc), 'rezzed: advanceable');
  assert(c.ChoicesInstalledCards(corp, c.CheckAdvance).some(o => o.card === wc), 'advance command offers it');
  c.PlaceAdvancement(wc, 2);
  wc._syncSubroutines();
  assert.strictEqual(wc.subroutines.length, 2);
  filler(4);
  wc.subroutines[0].Resolve.call(wc);
  assert.strictEqual(runner.grip.length, 3, '1 net damage');
  assert.strictEqual(JSON.parse(JSON.stringify(wc.AIImplementIce(null, {}, 0, false).sr)).length, 2);
  wc.advancement = 0; wc._syncSubroutines();
  assert.strictEqual(wc.subroutines.length, 0);
  assert.strictEqual(wc.AIAdvancementLimit(), 3);
  wc.rezzed = false; assert.strictEqual(wc.AIAdvancementLimit(), 0);
  const wc2 = put(card(2057), corp.HQ.ice); wc2.rezzed = true; wc2.advancement = 1; wc2._syncSubroutines();
  assert.strictEqual(wc.subroutines.length, 0); assert.strictEqual(wc2.subroutines.length, 1);
}

// --- Commercialization -------------------------------------------------
fullReset();
{
  const a = put(card(2057), corp.HQ.ice); a.advancement = 1;
  const b = put(card(2057), corp.RnD.ice); b.advancement = 3;
  const com = put(card(2058), corp.HQ.cards);
  const opts = com.Enumerate();
  assert.strictEqual(opts.length, 1); assert.strictEqual(opts[0].card, b, 'AI picks most advanced ice');
  assert(com.AIWouldPlay());
  corp.creditPool = 0;
  ai._bestMainPhaseEconomyOption(c.EnumeratePhase());
  assert.strictEqual(ai.preferred && ai.preferred.cardToPlay, com, 'economy play through the real policy');
  ai.preferred = null; corp.creditPool = 10;
  com.Resolve.call(com, opts[0]);
  assert.strictEqual(corp.creditPool, 13);
  b.advancement = 1;
  assert(!com.AIWouldPlay(), 'not for 1 credit');
  corp.AI = null;
  assert.strictEqual(com.Enumerate().length, 2, 'human may choose any ice');
  corp.AI = ai;
  corp.HQ.ice.length = 0; corp.RnD.ice.length = 0;
  assert.strictEqual(com.Enumerate().length, 0);
}

// --- Private Contracts -------------------------------------------------
fullReset();
{
  const pc = put(card(2059), remote().root);
  pc.rezzed = true; pc.automaticOnRez.Resolve.call(pc, pc);
  assert.strictEqual(pc.credits, 14);
  c.InvalidateActiveTriggerCandidateCache();
  ai._bestMainPhaseEconomyOption(c.EnumeratePhase());
  assert.strictEqual(ai.preferred && ai.preferred.cardToTrigger, pc, 'click ability used for economy');
  ai.preferred = null;
  pc.abilities[0].Resolve.call(pc);
  assert.strictEqual(corp.creditPool, 12); assert.strictEqual(pc.credits, 12);
  pc.credits = 2; corp.clickTracker = 3;
  pc.abilities[0].Resolve.call(pc);
  assert(corp.archives.cards.includes(pc), 'trashed when empty');
  corp.creditPool = 0; put({title: 'Pricey', player: corp, cardType: 'asset', subTypes: [], rezCost: 5, trashCost: 2}, remote().root);
  assert.strictEqual(pc.AIWorthInstalling([]), 0);
}

// --- Chimera -------------------------------------------------------------
fullReset();
{
  const ch = put(card(2060), corp.HQ.ice);
  put({title: 'Fracter', player: runner, cardType: 'program', subTypes: ['Icebreaker', 'Fracter'], memoryCost: 1}, runner.rig.programs);
  const opts = ch.responseOnRez.Enumerate.call(ch, ch);
  assert.strictEqual(opts.length, 1); assert.strictEqual(opts[0].subtype, 'Code Gate', 'avoids the installed fracter');
  ch.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
  ch.responseOnRez.Resolve.call(ch, opts[0]);
  assert(c.CheckSubType(ch, 'Code Gate')); assert(!c.CheckSubType(ch, 'Barrier'));
  corp.AI = null;
  assert.strictEqual(ch.responseOnRez.Enumerate.call(ch, ch).length, 3, 'human chooses any of three');
  corp.AI = ai;
  ch.responseOnRunnerDiscardEnds.Resolve.call(ch);
  assert(!ch.rezzed, 'derezzed when a turn ends'); assert.strictEqual(ch.chimeraSubtype, '');
  c.InvalidateActiveTriggerCandidateCache();
  assert(!c.CheckSubType(ch, 'Code Gate'));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ch.AIImplementIce(null, {}, 0, false).sr)), [[['endTheRun']]]);
}

// --- Nerve Agent ---------------------------------------------------------
fullReset();
{
  const na = put(card(2041), runner.rig.programs);
  c.attackedServer = corp.HQ;
  na.responseOnRunSuccessful.Resolve.call(na);
  assert.strictEqual(na.virus, 1);
  assert.strictEqual(na.responseOnBreach.Enumerate.call(na, corp.HQ).length, 0, 'one counter: only 0 possible');
  na.responseOnRunSuccessful.Resolve.call(na); na.responseOnRunSuccessful.Resolve.call(na);
  assert.strictEqual(na.virus, 3);
  assert.strictEqual(na.AIAdditionalAccess(corp.HQ), 3);
  assert.strictEqual(na.AIAdditionalAccess(corp.RnD), 0);
  na.responseOnBreach.Resolve.call(na);
  const d = decisions.shift();
  assert.deepStrictEqual(Array.from(d.choices, o => o.num), [0, 1, 2], 'less than the counters');
  assert.strictEqual(runner.AI.preferred.option.num, 2, 'AI takes the maximum');
  runner.AI.preferred = null;
  d.choose(d.choices[2]);
  assert.strictEqual(na.modifyBreachAccess.Resolve.call(na), 2);
  na.responseOnRunEnds.Resolve.call(na);
  assert.strictEqual(na.modifyBreachAccess.Resolve.call(na), 0);
  c.attackedServer = corp.RnD;
  na.responseOnRunSuccessful.Resolve.call(na);
  assert.strictEqual(na.virus, 3, 'only HQ');
}

// --- Joshua B. -----------------------------------------------------------
fullReset();
{
  const jb = put(card(2042), runner.rig.resources);
  runner.creditPool = 5;
  assert.strictEqual(jb.responseOnRunnerTurnBegins.Enumerate.call(jb).length, 1, 'AI takes the click');
  jb.responseOnRunnerTurnBegins.Resolve.call(jb, {use: true});
  assert.strictEqual(runner.clickTracker, 5);
  jb.responseOnRunnerDiscardEnds.Resolve.call(jb);
  assert.strictEqual(runner.tags, 1, 'tag at turn end');
  jb.responseOnRunnerDiscardEnds.Resolve.call(jb);
  assert.strictEqual(runner.tags, 1, 'once');
  assert.strictEqual(jb.responseOnRunnerTurnBegins.Enumerate.call(jb).length, 0, 'AI declines while tagged');
  runner.tags = 0; runner.creditPool = 2;
  assert.strictEqual(jb.responseOnRunnerTurnBegins.Enumerate.call(jb).length, 0, 'AI declines when broke');
  const saved = runner.AI; runner.AI = null;
  const h = jb.responseOnRunnerTurnBegins.Enumerate.call(jb);
  assert.strictEqual(h.length, 2);
  jb.responseOnRunnerTurnBegins.Resolve.call(jb, h[1]);
  jb.responseOnRunnerDiscardEnds.Resolve.call(jb);
  assert.strictEqual(runner.tags, 0, 'declined: no tag');
  runner.AI = saved;
}

// --- Muresh Bodysuit -----------------------------------------------------
fullReset();
{
  const mb = put(card(2044), runner.rig.hardware);
  const realOpp = c.OpportunityForAvoidPrevent;
  c.OpportunityForAvoidPrevent = (player, name, params, after) => c.TriggeredResponsePhase(player, name, params, after);
  filler(6);
  assert.strictEqual(mb.AIMeatDamagePrevention(), 1);
  c.Damage('meat', 2, true);
  assert.strictEqual(runner.grip.length, 5, 'first meat damage reduced by 1');
  assert.strictEqual(mb.AIMeatDamagePrevention(), 0);
  c.Damage('meat', 2, true);
  assert.strictEqual(runner.grip.length, 3, 'only the first time each turn');
  mb.responseOnCorpTurnBegins.Resolve.call(mb);
  c.Damage('net', 1, true);
  assert.strictEqual(runner.grip.length, 2, 'net damage not prevented');
  c.Damage('meat', 1, true);
  assert.strictEqual(runner.grip.length, 2, 'new turn: prevented');
  c.OpportunityForAvoidPrevent = realOpp;
}

// --- Snitch --------------------------------------------------------------
fullReset();
{
  const sn = put(card(2045), runner.rig.programs);
  const ice = put(card(2052), corp.HQ.ice);
  c.attackedServer = corp.HQ; c.approachIce = 0;
  const realJack = c.JackOut; let jacked = 0; c.JackOut = () => { jacked++; };
  const saved = runner.AI; runner.AI = null;
  const opts = sn.responseOnApproachIce.Enumerate.call(sn, ice);
  assert.strictEqual(opts.length, 2);
  sn.responseOnApproachIce.Resolve.call(sn, opts[0]);
  let d = decisions.shift(); // view the exposed card
  assert(ice.knownToRunner, 'exposed');
  d.choose(d.choices[0]);
  d = decisions.shift();
  assert.strictEqual(d.title, 'Snitch');
  d.choose(d.choices[0]);
  assert.strictEqual(jacked, 1, 'may then jack out');
  assert.strictEqual(sn.responseOnApproachIce.Enumerate.call(sn, ice).length, 0, 'once per run');
  sn.automaticOnRunBegins.Resolve.call(sn);
  ice.rezzed = true;
  assert.strictEqual(sn.responseOnApproachIce.Enumerate.call(sn, ice).length, 0, 'unrezzed only');
  ice.rezzed = false; ice.knownToRunner = false;
  runner.AI = saved;
  assert.strictEqual(sn.responseOnApproachIce.Enumerate.call(sn, ice).length, 1, 'AI exposes unknown ice');
  ice.knownToRunner = true;
  assert.strictEqual(sn.responseOnApproachIce.Enumerate.call(sn, ice).length, 0, 'AI skips known ice');
  // AI: no breakers against an exposed ETR code gate -> jack out.
  ice.knownToRunner = false;
  sn.responseOnApproachIce.Resolve.call(sn, {use: true});
  decisions.shift().choose({});
  d = decisions.shift();
  assert(d, 'jack out offered');
  assert.strictEqual(runner.AI.preferred.option.id, 1, 'AI jacks out when it cannot get through');
  runner.AI.preferred = null;
  c.JackOut = realJack;
}

// --- Chaos Theory, Public Sympathy ---------------------------------------
fullReset();
{
  const before = c.MemoryUnits();
  const savedId = runner.identityCard;
  runner.identityCard = card(2046);
  c.InvalidateActiveTriggerCandidateCache();
  assert.strictEqual(c.MemoryUnits(), before + 1);
  runner.identityCard = savedId;
  c.InvalidateActiveTriggerCandidateCache();
  const hand = c.MaxHandSize(runner), corpHand = c.MaxHandSize(corp);
  put(card(2050), runner.rig.resources); c.InvalidateActiveTriggerCandidateCache();
  assert.strictEqual(c.MaxHandSize(runner), hand + 2);
  assert.strictEqual(c.MaxHandSize(corp), corpHand);
}

// --- Dinosaurus ----------------------------------------------------------
fullReset();
{
  const dino = put(card(2048), runner.rig.hardware);
  const breaker = {title: 'Breaker', player: runner, cardType: 'program', subTypes: ['Icebreaker', 'Killer'], installCost: 2, memoryCost: 2, strength: 1};
  const aiBreaker = {title: 'AIB', player: runner, cardType: 'program', subTypes: ['Icebreaker', 'AI'], installCost: 2, memoryCost: 1, strength: 1};
  assert(dino.canHost(breaker)); assert(!dino.canHost(aiBreaker), 'non-AI only');
  assert(!dino.canHost({title: 'x', cardType: 'program', subTypes: []}), 'icebreakers only');
  put(breaker, runner.grip);
  const choices = c.ChoicesCardInstall(breaker);
  assert.strictEqual(choices[0].host, dino, 'hosting option offered first (AI default)');
  c.MoveCard(breaker, dino.hostedCards);
  assert.strictEqual(breaker.host, dino);
  c.InvalidateActiveTriggerCandidateCache();
  assert.strictEqual(c.Strength(breaker), 3, '+2 strength');
  assert.strictEqual(c.InstalledMemoryCost(), 0, 'MU does not count');
  assert(!dino.canHost(Object.assign({}, breaker, {title: 'Second'})), 'single card');
}

// --- Personal Workshop -------------------------------------------------
fullReset();
{
  const pw = put(card(2049), runner.rig.resources);
  const prog = put({title: 'Pricey', player: runner, cardType: 'program', subTypes: [], installCost: 3, memoryCost: 1}, runner.grip);
  put({title: 'Cheap', player: runner, cardType: 'hardware', subTypes: [], installCost: 1}, runner.grip);
  put({title: 'Event', player: runner, cardType: 'event', subTypes: [], playCost: 0}, runner.grip);
  c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runnerActionMain;
  const realInstall = c.Install; const installed = [];
  c.Install = (cardToInstall, dest, ignoreAll) => { installed.push([cardToInstall.title, ignoreAll, cardToInstall.notInstalled]); };
  assert.strictEqual(pw._AIHostTarget(), prog);
  assert(pw.AIWouldTrigger());
  const aiChoices = c.ChoicesAbility(pw, 'click');
  assert.strictEqual(aiChoices.length, 1, 'only the click ability in the action phase');
  assert.deepStrictEqual(Array.from(aiChoices[0].choices, o => o.card.title), ['Pricey']);
  pw.abilities[0].Resolve.call(pw, aiChoices[0].choices[0]);
  assert(pw.hostedCards.includes(prog)); assert.strictEqual(prog.power, 3); assert(prog.notInstalled);
  assert(!c.CheckInstalled(prog), 'hosted card is not installed');
  assert.strictEqual(runner.clickTracker, 3);
  assert.strictEqual(pw.responseOnRunnerTurnBegins.Enumerate.call(pw).length, 1);
  pw.responseOnRunnerTurnBegins.Resolve.call(pw);
  assert.strictEqual(prog.power, 2);
  const paid = pw.abilities[1].Enumerate.call(pw);
  assert.strictEqual(paid.length, 1);
  pw.abilities[1].Resolve.call(pw, paid[0]);
  assert.strictEqual(prog.power, 1); assert.strictEqual(runner.creditPool, 4);
  pw.abilities[1].Resolve.call(pw, paid[0]);
  assert.deepStrictEqual(installed, [['Pricey', true, false]], 'installed ignoring all costs at 0 counters');
  const saved = runner.AI; runner.AI = null;
  const human = pw.abilities[0].Enumerate.call(pw);
  assert.deepStrictEqual(Array.from(human, o => o.card.title), ['Cheap'], 'any program or hardware in grip');
  runner.AI = saved;
  const free = put({title: 'Free', player: runner, cardType: 'hardware', subTypes: [], installCost: 0}, runner.grip);
  pw.hostCard(free);
  assert.strictEqual(installed.length, 2); assert.strictEqual(installed[1][0], 'Free', 'zero cost installs at once');
  const leftover = put({title: 'Left', player: runner, cardType: 'hardware', subTypes: [], installCost: 2}, runner.grip);
  pw.hostCard(leftover);
  c.MoveCard(leftover, runner.heap);
  assert.strictEqual(leftover.notInstalled, false, 'flag reset when it leaves');
  c.Install = realInstall;
}

if (process.env.VERBOSE) console.log('genesis-ce: all checks passed');
