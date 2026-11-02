'use strict';
// Uprising batch 14 (26120–26123): Earth Station: SEA Headquarters, Transport
// Monopoly, Wall to Wall and Akhet through the real engine helpers, response
// windows, run calculator and Corp AI selectors.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/uprising.js'])
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
c.playerTurn = corp; c.activePlayer = corp; c.viewingPlayer = corp;
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const ai = corp.AI;
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0, visible: true}, destinationPosition: {x: 0, y: 0}});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command) => {
  const d = {player, choices, title, command, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
let responseQueue = [];
const watched = new Set(['responseOnTrash', 'responseOnScored']);
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
const withAI = (side, value, fn) => {const saved = side.AI; side.AI = value; try {return fn();} finally {side.AI = saved;}};
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const finishInstall = () => {for (let k = 0; k < 5 && c.currentPhase.title == 'Trash Before Install'; k++) c.currentPhase.Resolve.n();};
const agenda = (title, req, pts) => ({title, player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: req, agendaPoints: pts, canBeAdvanced: true});
const wall = (title, rezCost) => ({title, player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost, strength: 4,
  subroutines: [{text: 'End the run.', Resolve() {}}], AIImplementIce(rc, result) {result.sr = [[['endTheRun']]]; return result;}});
const reset = () => {
  decisions = []; responseQueue = []; ai.preferred = null; c.executingCommand = '';
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice, corp.archives.ice,
    corp.scoreArea, runner.scoreArea, runner.grip, runner.heap]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3; runner.coreDamage = 0;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain; c.accessingCard = null;
};
// Score through the engine and resolve the automatic responseOnScored triggers.
const score = target => {
  c.Score(target);
  const event = takeResponse('responseOnScored');
  for (const option of c.ChoicesActiveTriggers('responseOnScored')) option.card.responseOnScored.Resolve.call(option.card);
  event.after();
};
const encounter = (server, index) => {c.attackedServer = server; c.approachIce = index; c.encountering = true;};
const plainId = corp.identityCard;
corp.maxHandSize = 5;
const fillRnD = n => {for (let i = 0; i < n; i++) put({title: 'Filler ' + i, player: corp, cardType: 'operation', subTypes: [], playCost: 0}, corp.RnD.cards);};
const refresh = () => {if (typeof c.InvalidateActiveTriggerCandidateCache == 'function') c.InvalidateActiveTriggerCandidateCache();};

// --- Earth Station: run taxes, flip, limit 1 remote ---
reset();
const es = card(26120); es.flipped = false; corp.identityCard = es; refresh();
const esRemote = remote(); put(wall('Wall', 1), esRemote.ice);
assert.strictEqual(c.AdditionalRunCosts(corp.HQ).credits, 1, 'front: 1 credit to run HQ');
assert.strictEqual(c.AdditionalRunCosts(esRemote).credits, 0, 'front: remotes untaxed');
assert.strictEqual(c.AdditionalRunCosts(corp.RnD).credits, 0);
// human flip
withAI(corp, null, () => {
  assert.strictEqual(es.abilities[0].Enumerate.call(es).length, 1, 'click ability offered on the front');
  es.abilities[0].Resolve.call(es);
});
assert(es.flipped && corp.clickTracker === 2, 'flip costs a click');
assert.strictEqual(es.abilities[0].Enumerate.call(es).length, 0, 'flip side has no click ability');
assert.strictEqual(c.AdditionalRunCosts(corp.HQ).credits, 0, 'flip side: HQ untaxed');
assert.strictEqual(c.AdditionalRunCosts(esRemote).credits, 6, 'flip side: 6 credits to run a remote');
assert.strictEqual(c.AdditionalRunCosts(corp.archives).credits, 0);
runner.creditPool = 5;
assert(!c.CanPayAdditionalRunCosts(esRemote, 1), 'Runner with 5 credits cannot run the remote');
assert(c.CanPayAdditionalRunCosts(corp.HQ, 1));
// Runner run calculator charges the tax as a run-start loss
c.attackedServer = null; c.encountering = false; c.approachIce = -1;
const rc = runner.AI.rc; rc.suppressOutput = true; rc.Print = () => {};
esRemote.ice.length = 0; put({title: 'Asset', player: corp, cardType: 'asset', subTypes: []}, esRemote.root);
runner.creditPool = 10;
const esPaths = rc.Calculate(esRemote, 3, 10, 0, 8, Infinity, false, null);
assert(esPaths.length && esPaths.every(p => p[p.length - 1].runner_credits_lost >= 6), 'run calculator charges the 6 credit remote tax');
// R&D success keeps it flipped; HQ success flips back
es.automaticOnRunSuccessful.Resolve.call(es, corp.RnD);
assert(es.flipped, 'R&D success does not flip');
es.automaticOnRunSuccessful.Resolve.call(es, corp.HQ);
assert(!es.flipped, 'successful HQ run flips it back');
es.automaticOnRunSuccessful.Resolve.call(es, corp.HQ);
assert(!es.flipped, 'front side ignores HQ success');
// limit 1 remote server
const asset = put({title: 'Spare asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 0, trashCost: 1}, corp.HQ.cards);
let installs = c.ChoicesCardInstall(asset);
assert(!installs.some(o => o.server === null), 'no new remote once one exists');
assert(installs.some(o => o.server === esRemote), 'the existing remote is still offered');
esRemote.root.length = 0; corp.remoteServers.length = 0;
installs = c.ChoicesCardInstall(asset);
assert(installs.some(o => o.server === null), 'a first remote may be created');
corp.identityCard = plainId;
corp.HQ.cards.length = 0; put(asset, remote().root);
const asset2 = put({title: 'Other asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 0, trashCost: 1}, corp.HQ.cards);
assert(c.ChoicesCardInstall(asset2).some(o => o.server === null), 'other identities may create more remotes');
corp.identityCard = es;
assert(!c.ChoicesCardInstall(asset2).some(o => o.server === null));
// Corp AI ranking drops the forbidden new remote
const agendaHQ = put(agenda('Hand agenda', 3, 2), corp.HQ.cards);
assert(!ai._rankedInstallOptions([agendaHQ, asset2], false, false).some(o => o.serverToInstallTo == null), 'AI ranking has no new-remote option');
// Corp AI flips through the real action-phase selector once the remote holds a card
reset(); corp.identityCard = es; es.flipped = false; fillRnD(10);
const esAIRemote = remote(); put(wall('Wall', 1), esAIRemote.ice).rezzed = true;
assert.strictEqual(es.abilities[0].Enumerate.call(es).length, 0, 'AI does not flip with an empty remote');
const esAgenda = put(agenda('Remote agenda', 5, 3), esAIRemote.root);
let options = c.EnumeratePhase();
assert(options.includes('trigger'));
assert.strictEqual(options[ai.Choice(options, 'command')], 'trigger', 'Corp AI flips');
assert.strictEqual(ai.preferred.cardToTrigger, es); ai.preferred = null;
// but not when every click is needed to finish an installed agenda this turn
esAgenda.advancement = 2;
assert.strictEqual(es.abilities[0].Enumerate.call(es).length, 0, 'keeps the clicks to score');
esAgenda.advancement = 0; corp.clickTracker = 0;
assert.strictEqual(es.abilities[0].Enumerate.call(es).length, 0, 'needs a click');
corp.identityCard = plainId; refresh();

// --- Transport Monopoly: counters, once per turn, success prevention ---
reset();
const tm = put(card(26121), remote().root);
tm.usedThisTurn = false;
score(tm);
assert.strictEqual(c.Counters(tm, 'agenda'), 2, 'scores with 2 agenda counters');
assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 0, 'only during a run');
c.attackedServer = corp.HQ;
withAI(corp, null, () => {
  assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 1, 'usable during a run');
  tm.abilities[0].Resolve.call(tm);
});
assert.strictEqual(c.Counters(tm, 'agenda'), 1);
assert.strictEqual(c.ModifyingTriggers('modifyDeclareSuccess', null, 0), 1, 'this run cannot be declared successful');
withAI(corp, null, () => assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 0, 'once per turn'));
// the effect lingers if the agenda leaves the score area mid-run
corp.scoreArea.splice(corp.scoreArea.indexOf(tm), 1);
assert.strictEqual(c.ModifyingTriggers('modifyDeclareSuccess', null, 0), 1, 'lasts for the run without the agenda');
corp.scoreArea.push(tm);
const lingering = c.ChoicesActiveTriggers('responseOnRunEnds').map(o => o.card).filter(card => c.lingeringEffects.includes(card));
assert.strictEqual(lingering.length, 1, 'run-end cleanup is offered');
lingering[0].responseOnRunEnds.Resolve.call(lingering[0]);
assert.strictEqual(c.ModifyingTriggers('modifyDeclareSuccess', null, 0), 0, 'only for that run');
withAI(corp, null, () => assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 0, 'still used this turn'));
tm.responseOnRunnerTurnBegins.Resolve.call(tm);
withAI(corp, null, () => assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 1, 'available again next turn'));
tm.abilities[0].Resolve.call(tm);
c.lingeringEffects.length = 0;
tm.responseOnCorpTurnBegins.Resolve.call(tm);
withAI(corp, null, () => assert.strictEqual(tm.abilities[0].Enumerate.call(tm).length, 0, 'no counters left'));
// a stolen copy cannot be used by the Corp
const stolen = put(card(26121), runner.scoreArea); c.AddCounters(stolen, 'agenda', 2);
stolen.usedThisTurn = false;
withAI(corp, null, () => assert.strictEqual(stolen.abilities[0].Enumerate.call(stolen).length, 0, "not from the Runner's score area"));
c.attackedServer = null;
// Corp AI: uses it just before the Runner approaches a remote holding an agenda
reset(); refresh();
const tmAI = put(card(26121), corp.scoreArea); tmAI.usedThisTurn = false; c.AddCounters(tmAI, 'agenda', 2);
const tmRemote = remote(); put(agenda('Exposed', 4, 2), tmRemote.root);
c.playerTurn = runner; c.attackedServer = tmRemote; c.approachIce = 0; c.encountering = false;
c.currentPhase = {identifier: 'Run 3.1'};
assert.strictEqual(tmAI.abilities[0].Enumerate.call(tmAI).length, 0, 'AI waits until the Runner is about to approach the server');
c.currentPhase = {identifier: 'Run 4.5'};
assert.strictEqual(tmAI.abilities[0].Enumerate.call(tmAI).length, 1, 'AI blocks the agenda-holding remote');
assert.strictEqual(ai.Phase_Movement(['n', 'trigger']), 1, 'Phase_Movement triggers it');
tmRemote.root.length = 0; put({title: 'Asset', player: corp, cardType: 'asset', subTypes: []}, tmRemote.root);
assert.strictEqual(tmAI.abilities[0].Enumerate.call(tmAI).length, 0, 'not for a remote without agendas');
c.attackedServer = corp.RnD; put(agenda('R&D agenda', 3, 2), corp.RnD.cards);
assert.strictEqual(tmAI.abilities[0].Enumerate.call(tmAI).length, 0, 'not for R&D (order unknown)');
c.attackedServer = corp.HQ; put(agenda('HQ agenda', 3, 2), corp.HQ.cards); put(agenda('HQ agenda 2', 3, 2), corp.HQ.cards);
put({title: 'Op', player: corp, cardType: 'operation', subTypes: []}, corp.HQ.cards);
assert.strictEqual(tmAI.abilities[0].Enumerate.call(tmAI).length, 1, 'HQ mostly agendas');
c.attackedServer = null; c.playerTurn = corp;

// --- Wall to Wall: turn-begin choices ---
reset(); fillRnD(5);
const w2w = put(card(26122), remote().root); w2w.rezzed = true;
const ice = put(wall('Ice', 1), corp.HQ.ice);
assert.strictEqual(w2w.responseOnCorpTurnBegins.Enumerate.call(w2w).length, 1);
w2w.rezzed = false;
assert.strictEqual(w2w.responseOnCorpTurnBegins.Enumerate.call(w2w).length, 0, 'inactive while unrezzed');
w2w.rezzed = true;
// no other rezzed assets: up to 3, any order, each once
withAI(corp, null, () => w2w.responseOnCorpTurnBegins.Resolve.call(w2w));
let d = decisions.shift();
assert.deepStrictEqual(Array.from(d.choices, o => o.id), [1, 2, 3, 4, 0], 'all four options plus Done');
d.choose(d.choices.find(o => o.id === 2));
assert.strictEqual(corp.creditPool, 11);
d = decisions.shift();
assert(!d.choices.some(o => o.id === 2), 'each option once');
d.choose(d.choices.find(o => o.id === 3));
d = decisions.shift();
assert.deepStrictEqual(Array.from(d.choices, o => o.card), [ice], 'installed ice only');
d.choose(d.choices[0]);
assert.strictEqual(c.Counters(ice, 'advancement'), 1, 'ice gets an advancement counter');
d = decisions.shift();
d.choose(d.choices.find(o => o.id === 1));
assert.strictEqual(corp.HQ.cards.length, 1, 'drew 1');
assert.strictEqual(decisions.length, 0, 'stops after 3 effects');
// Done stops early; add to HQ
withAI(corp, null, () => w2w.responseOnCorpTurnBegins.Resolve.call(w2w));
d = decisions.shift(); d.choose(d.choices.find(o => o.id === 4));
assert(corp.HQ.cards.includes(w2w) && !c.CheckInstalled(w2w), 'added to HQ');
d = decisions.shift();
assert(!d.choices.some(o => o.id === 4), 'cannot bounce twice');
d.choose(d.choices.find(o => o.id === 0));
assert.strictEqual(decisions.length, 0, 'Done ends it');
// another rezzed asset: exactly 1, no Done
reset(); fillRnD(5);
const w2wB = put(card(26122), remote().root); w2wB.rezzed = true;
put({title: 'PAD', player: corp, cardType: 'asset', subTypes: [], rezCost: 0, trashCost: 1}, remote().root).rezzed = true;
withAI(corp, null, () => w2wB.responseOnCorpTurnBegins.Resolve.call(w2wB));
d = decisions.shift();
assert(!d.choices.some(o => o.id === 0), 'must resolve 1');
assert(!d.choices.some(o => o.id === 3), 'no ice installed: no advancement option');
d.choose(d.choices.find(o => o.id === 1));
assert.strictEqual(decisions.length, 0, 'only 1 effect with another rezzed asset');
// Corp AI: useful ice counter, credit, draw; never bounces
reset(); fillRnD(5);
const w2wAI = put(card(26122), remote().root); w2wAI.rezzed = true;
const akhetAI = put(card(26123), corp.HQ.ice); akhetAI.rezzed = true;
w2wAI.responseOnCorpTurnBegins.Resolve.call(w2wAI);
d = decisions.shift(); assert.strictEqual(ai.preferred.option.id, 3, 'AI advances ice that improves'); d.choose(ai.preferred.option);
d = decisions.shift(); assert.strictEqual(ai.preferred.option.card, akhetAI); d.choose(ai.preferred.option);
d = decisions.shift(); assert.strictEqual(ai.preferred.option.id, 2, 'then credits'); d.choose(ai.preferred.option);
d = decisions.shift(); assert.strictEqual(ai.preferred.option.id, 1, 'then a draw'); d.choose(ai.preferred.option);
assert(c.CheckInstalled(w2wAI), 'AI keeps it installed');
assert.strictEqual(c.Counters(akhetAI, 'advancement'), 1);
// AI rez timing and install
c.currentPhase = {identifier: 'Runner 2.2'};
assert.strictEqual(w2wAI.AIRezWhenCan.call(w2wAI), true, 'rez at the end of the Runner turn');
c.currentPhase = c.phases.corpActionMain;
assert.strictEqual(w2wAI.AIRezWhenCan.call(w2wAI), false);
reset(); fillRnD(10);
const w2wHand = put(card(26122), corp.HQ.cards);
assert(ai._rankedInstallOptions([w2wHand], false, true).some(o => o.cardToInstall == w2wHand), 'AI wants to install it');

// --- Akhet: advanceable, +3 strength and break limit at 3 counters, subroutines ---
reset();
const akhet = put(card(26123), corp.HQ.ice); akhet.rezzed = true;
akhet.subroutines = akhet.subroutines.map(sub => Object.assign({}, sub));
assert(c.CheckAdvance(akhet), 'can be advanced');
assert.strictEqual(c.Strength(akhet), 2);
akhet.advancement = 3;
assert.strictEqual(c.Strength(akhet), 5, '+3 strength at 3 counters');
encounter(corp.HQ, 0);
const [sr1, sr2] = akhet.subroutines;
assert(!c.CardEffectsForbid('break', sr1), 'first printed break allowed');
sr1.broken = true;
assert(c.CardEffectsForbid('break', sr2), 'second printed break forbidden');
sr1.broken = false;
assert(c.CardEffectsForbid('break', sr2, [sr1]), 'selected breaks count toward the limit');
akhet.advancement = 2;
assert.strictEqual(c.Strength(akhet), 2);
sr1.broken = true;
assert(!c.CardEffectsForbid('break', sr2), 'no limit below 3 counters');
sr1.broken = false; c.encountering = false; c.attackedServer = null;
// run calculator honours the limit
akhet.advancement = 3;
assert.strictEqual(rc.IceAI(akhet, 10).maxSrBroken, 1);
akhet.advancement = 0;
assert.strictEqual(rc.IceAI(akhet, 10).maxSrBroken, undefined);
assert.deepStrictEqual(JSON.parse(JSON.stringify(rc.IceAI(akhet, 10).sr)), [[['misc_minor', 'misc_minor']], [['endTheRun']]]);
// subroutine 1: gain 1 and place a counter (AI empowers Akhet first)
corp.creditPool = 5;
sr1.Resolve.call(akhet);
assert.strictEqual(corp.creditPool, 6, 'gain 1');
d = decisions.shift();
assert.strictEqual(ai.preferred.option.card, akhet, 'AI powers Akhet up');
d.choose(ai.preferred.option);
assert.strictEqual(c.Counters(akhet, 'advancement'), 1);
const nearAgenda = put(agenda('Near', 3, 2), remote().root); nearAgenda.advancement = 1;
sr1.Resolve.call(akhet);
d = decisions.shift();
assert.strictEqual(ai.preferred.option.card, nearAgenda, 'AI prefers a near-scored agenda');
assert(d.choices.some(o => o.card == akhet) && d.choices.some(o => o.card == nearAgenda), 'any installed card');
withAI(corp, null, () => sr1.Resolve.call(akhet));
d = decisions.shift(); d.choose(d.choices.find(o => o.card == nearAgenda));
assert.strictEqual(c.Counters(nearAgenda, 'advancement'), 2);
// AI advancement limit: only once rezzed, up to 3
assert.strictEqual(akhet.AIAdvancementLimit(), 3);
akhet.rezzed = false;
assert.strictEqual(akhet.AIAdvancementLimit(), 0);

if (process.env.VERBOSE) console.log('uprising-batch14: Earth Station, Transport Monopoly, Wall to Wall, Akhet checked');
