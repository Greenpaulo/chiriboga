'use strict';
// Uprising batch 8 (26096–26100): Megaprix Qualifier, Project Vacheron,
// Bass CH1R180G4, Cerebral Overwriter and Vaporframe Fabricator through the
// real engine helpers, response windows and Corp AI selectors.
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

// --- Megaprix Qualifier: +1 point with a counter placed when another copy is scored ---
reset();
const mq1 = put(card(26096), remote().root), mq2 = put(card(26096), remote().root), mq3 = put(card(26096), remote().root);
score(mq1);
assert.strictEqual(c.Counters(mq1, 'agenda'), 0, 'first copy: no other copy scored');
assert.strictEqual(c.AgendaPoints(corp), 1);
score(mq2);
assert.strictEqual(c.Counters(mq2, 'agenda'), 1, 'second copy gets a counter');
assert.strictEqual(c.Counters(mq1, 'agenda'), 0, 'only the newly scored copy gains it');
assert.strictEqual(c.AgendaPoints(corp), 3, '1 + (1 + 1)');
// a copy in the Runner's score area also counts
corp.scoreArea.length = 0; put(mq1, runner.scoreArea);
score(mq3);
assert.strictEqual(c.Counters(mq3, 'agenda'), 1, "copy in the Runner's score area counts");
c.RemoveCounters(mq3, 'agenda', 1);
assert.strictEqual(c.AgendaPointsForCard(mq3, corp), 1, 'bonus only while a counter is hosted');

// --- Project Vacheron: stolen from outside Archives enters with 4 counters and 0 points ---
reset();
put(agenda('Six', 5, 6), runner.scoreArea);
const vac = put(card(26097), remote().root);
c.MoveCard(vac, runner.scoreArea);
assert.strictEqual(c.Counters(vac, 'agenda'), 4, 'interrupt places 4 counters as it is added');
assert.strictEqual(c.AgendaPoints(runner), 6, 'worth 0 points: the Runner has not reached 7');
const vacTurn = () => c.ChoicesActiveTriggers('responseOnRunnerTurnBegins').filter(option => option.card == vac);
assert.strictEqual(vacTurn().length, 1, "the gained ability works from the Runner's score area");
for (let turn = 1; turn <= 4; turn++) {
  assert.strictEqual(vac.responseOnRunnerTurnBegins.Enumerate.call(vac).length, 1);
  vac.responseOnRunnerTurnBegins.Resolve.call(vac);
}
assert.strictEqual(c.Counters(vac, 'agenda'), 0);
assert.strictEqual(c.AgendaPoints(runner), 9, 'worth 3 once the counters are gone');
assert.strictEqual(vac.responseOnRunnerTurnBegins.Enumerate.call(vac).length, 0, 'ability ends with the counters');
// a steal from HQ through the engine's Steal
reset();
const vacHQ = put(card(26097), corp.HQ.cards);
c.accessingCard = vacHQ; c.attackedServer = corp.HQ;
c.Steal();
assert(runner.scoreArea.includes(vacHQ) && c.Counters(vacHQ, 'agenda') === 4, 'Steal from HQ adds 4 counters');
assert.strictEqual(c.AgendaPoints(runner), 0);
// from Archives: no interrupt
const vacArc = put(card(26097), corp.archives.cards);
c.accessingCard = vacArc; c.attackedServer = corp.archives;
c.Steal();
assert.strictEqual(c.Counters(vacArc, 'agenda'), 0, 'Archives steal is unchanged');
assert.strictEqual(c.AgendaPoints(runner), 3);
c.attackedServer = null;
// scored by the Corp: full points, no counters, no Runner-turn trigger
const vacScored = put(card(26097), remote().root);
score(vacScored);
assert.strictEqual(c.Counters(vacScored, 'agenda'), 0);
assert.strictEqual(c.AgendaPointsForCard(vacScored, corp), 3);
assert.strictEqual(vacScored.responseOnRunnerTurnBegins.Enumerate.call(vacScored).length, 0);

// --- Bass CH1R180G4: [click], trash: gain 2 clicks ---
reset();
const bass = put(card(26098), remote().root);
assert.strictEqual(withAI(corp, null, () => bass.abilities[0].Enumerate.call(bass)).length, 0, 'unrezzed: no ability');
bass.rezzed = true;
assert.strictEqual(withAI(corp, null, () => bass.abilities[0].Enumerate.call(bass)).length, 1, 'human may use it');
c.currentPhase = c.phases.corpPostAction;
assert.strictEqual(withAI(corp, null, () => bass.abilities[0].Enumerate.call(bass)).length, 0, 'action phase only');
c.currentPhase = c.phases.corpActionMain;
// AI: holds it with 3 clicks and nothing to finish
assert.strictEqual(bass.abilities[0].Enumerate.call(bass).length, 0, 'AI keeps it without a use');
// an installed 4-advancement agenda becomes scorable this turn with one more click
const target = put(agenda('Four', 4, 2), remote().root);
assert.strictEqual(bass._aiScoreBurstAgenda(), target);
corp.creditPool = 3;
assert.strictEqual(bass._aiScoreBurstAgenda(), null, 'needs the advancement credits too');
corp.creditPool = 10;
let options = c.EnumeratePhase();
assert(options.includes('trigger'), 'Bass is offered in the action phase');
assert.strictEqual(options[ai.Choice(options, 'command')], 'trigger', 'Corp AI triggers Bass for the burst');
assert.strictEqual(ai.preferred.cardToTrigger, bass); ai.preferred = null;
bass.abilities[0].Resolve.call(bass);
takeResponse('responseOnTrash').after();
assert.strictEqual(corp.clickTracker, 4, '3 - 1 + 2');
assert(corp.archives.cards.includes(bass) && !c.CheckInstalled(bass), 'trashed as a cost');
// last click: always worth +1 click; the AI rezzes it then with credits to spare
reset();
const bass2 = put(card(26098), remote().root);
corp.clickTracker = 1; corp.creditPool = 8;
c.currentPhase = c.phases.corpPostAction;
assert.strictEqual(bass2.AIRezWhenCan.call(bass2), true, 'rez to use as the last click');
corp.creditPool = 5;
assert.strictEqual(bass2.AIRezWhenCan.call(bass2), false, 'not when credits are short');
c.playerTurn = runner;
corp.creditPool = 10;
assert.strictEqual(bass2.AIRezWhenCan.call(bass2), false, "never on the Runner's turn");
c.playerTurn = corp; c.currentPhase = c.phases.corpActionMain;
bass2.rezzed = true;
assert.strictEqual(bass2.abilities[0].Enumerate.call(bass2).length, 1, 'AI uses it as the last click');
assert.strictEqual(put(card(26098), corp.HQ.cards).AIWorthInstalling([]), -1, 'unique: no second copy');

// --- Cerebral Overwriter: pay 3 on access for X core damage ---
reset();
const cow = put(card(26099), remote().root);
assert(c.CheckAdvance(cow), 'can be advanced');
assert.strictEqual(cow.RezUsability(), false, 'never rezzed');
for (let i = 0; i < 5; i++) put({title: 'Grip ' + i, player: runner, cardType: 'event', subTypes: []}, runner.grip);
c.accessingCard = cow;
assert.strictEqual(cow.responseOnAccess.Enumerate.call(cow).length, 0, 'no counters: nothing to pay for');
c.AddCounters(cow, 'advancement', 2);
corp.creditPool = 2;
assert.strictEqual(cow.responseOnAccess.Enumerate.call(cow).length, 0, 'cannot pay 3');
corp.creditPool = 5;
assert.strictEqual(cow.responseOnAccess.Enumerate.call(cow).length, 1, 'unrezzed and installed: offered');
assert.strictEqual(ai._isAgendaOrTrap(cow), true);
assert.strictEqual(cow.AIPunishesAccess(c.GetServer(cow)), 2, 'bait weight is X');
assert.strictEqual(cow.AIPunishesAccess(corp.HQ), 0);
cow.responseOnAccess.Resolve.call(cow);
let d = decisions.shift();
assert.strictEqual(ai.preferred.option, d.choices[0], 'Corp AI pays');
ai.preferred = null;
d.choose(d.choices[0]);
assert.strictEqual(corp.creditPool, 2, 'paid 3');
assert.strictEqual(runner.grip.length, 3, 'X = 2 cards trashed');
assert.strictEqual(runner.coreDamage, 2, 'each point of core damage counts');
assert.strictEqual(c.MaxHandSize(runner), 3);
// declining does nothing
corp.creditPool = 5;
withAI(corp, null, () => cow.responseOnAccess.Resolve.call(cow));
d = decisions.shift(); d.choose(d.choices[1]);
assert.strictEqual(corp.creditPool, 5); assert.strictEqual(runner.coreDamage, 2);
// accessed from HQ (not installed): no trigger
const cowHQ = put(card(26099), corp.HQ.cards); cowHQ.advancement = 3;
c.accessingCard = cowHQ;
assert.strictEqual(cowHQ.responseOnAccess.Enumerate.call(cowHQ).length, 0, 'only while installed');
c.accessingCard = null;
assert.strictEqual(cow.AIAdvancementLimit(), 3);
// Corp AI advances an installed Overwriter through the real action-phase selector
reset();
for (let i = 0; i < 10; i++) put({title: "Filler " + i, player: corp, cardType: "operation", subTypes: [], playCost: 0}, corp.RnD.cards);
const cowServer = remote(); put(wall("Wall", 1), cowServer.ice).rezzed = true;
const cowAI = put(card(26099), cowServer.root);
options = c.EnumeratePhase();
assert.strictEqual(options[ai.Choice(options, "command")], "advance", "Corp AI advances the ambush");
assert.strictEqual(ai.preferred.cardToAdvance, cowAI); ai.preferred = null;
cowAI.advancement = 3;
options = c.EnumeratePhase();
ai.Choice(options, "command");
assert(!ai.preferred || ai.preferred.cardToAdvance != cowAI, "stops at its advancement limit"); ai.preferred = null;

// --- Vaporframe Fabricator: free install ability and trash response ---
reset();
const vfServer = remote();
const vf = put(card(26100), vfServer.root);
put(wall('Outer Wall', 1), corp.HQ.ice);
const bigWall = put(wall('Big Wall', 6), corp.HQ.cards);
const asset = put({title: 'Asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 1, trashCost: 2}, corp.HQ.cards);
assert.strictEqual(withAI(corp, null, () => vf.abilities[0].Enumerate.call(vf)).length, 0, 'unrezzed: no ability');
vf.rezzed = true;
assert.strictEqual(withAI(corp, null, () => vf.abilities[0].Enumerate.call(vf)).length, 1);
corp.creditPool = 0;
withAI(corp, null, () => vf.abilities[0].Resolve.call(vf));
assert.strictEqual(corp.clickTracker, 2, 'costs a click');
d = decisions.shift();
assert.strictEqual(d.command, 'install');
d.choose(d.choices.find(choice => choice.card == bigWall && choice.server == corp.HQ)); finishInstall();
assert(corp.HQ.ice.includes(bigWall) && !bigWall.rezzed, 'installed (not rezzed) as the second HQ ice');
assert.strictEqual(corp.creditPool, 0, 'install cost ignored');
assert.strictEqual(withAI(corp, null, () => vf.abilities[0].Enumerate.call(vf)).length, 0, 'once per turn');
vf.responseOnCorpTurnBegins.Resolve.call(vf);
assert.strictEqual(withAI(corp, null, () => vf.abilities[0].Enumerate.call(vf)).length, 1, 'usable next turn');
// Corp AI: uses it for a ranked install, but not when the click is needed to finish an agenda
corp.creditPool = 10; corp.clickTracker = 3;
c.currentPhase = c.phases.corpActionMain;
put(wall('Spare Wall', 2), corp.HQ.cards);
const aiChoices = vf._installChoices(null);
assert(ai._bestInstallOption(aiChoices, true) >= 0, 'the shared ranking wants an install');
assert.strictEqual(vf.abilities[0].Enumerate.call(vf).length, 1, 'AI may use it');
const nearly = put(agenda('Nearly', 5, 3), remote().root); nearly.advancement = 2;
assert.strictEqual(vf.abilities[0].Enumerate.call(vf).length, 0, 'every click is needed to finish an agenda');
nearly.advancement = 3;
assert.strictEqual(vf.abilities[0].Enumerate.call(vf).length, 1, 'a spare click remains');
c.Trash(nearly, false); responseQueue = [];
vf.abilities[0].Resolve.call(vf);
d = decisions.shift();
assert.strictEqual(ai.preferred.title, vf.title);
assert(d.choices.includes(ai.preferred.option) && ai.preferred.option.card, 'AI plan is one of the offered installs');
ai.preferred = null;
// trash response: Runner trash only, rezzed only, not in this server's root
reset();
const vfServer2 = remote();
const vf2 = put(card(26100), vfServer2.root); vf2.rezzed = true;
put(wall('Guard', 1), vfServer2.ice);
const hqAsset = put({title: 'Asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 1, trashCost: 2}, corp.HQ.cards);
const hqIce = put(wall('Ice', 3), corp.HQ.cards);
const trashAs = (targetCard, player) => {c.activePlayer = player; c.Trash(targetCard, true); c.activePlayer = corp; return takeResponse('responseOnTrash');};
let event = trashAs(vf2, runner);
const humanOffer = withAI(corp, null, () => offered(event, vf2));
assert.strictEqual(humanOffer.length, 1, 'Runner trash: free install offered');
withAI(corp, null, () => vf2.responseOnTrash.Resolve.call(vf2));
d = decisions.shift();
assert(!d.choices.some(choice => choice.card == hqAsset && choice.server == vfServer2), "not in this server's root");
assert(d.choices.some(choice => choice.card == hqIce && choice.server == vfServer2), 'ice may still protect this server');
assert(d.choices.some(choice => choice.card == hqAsset && choice.server == null), 'a new remote is fine');
assert(d.choices.some(choice => !choice.card), 'optional');
corp.creditPool = 0;
d.choose(d.choices.find(choice => choice.card == hqIce && choice.server == vfServer2)); finishInstall();
assert(vfServer2.ice.includes(hqIce) && corp.creditPool === 0, 'free install over this server');
assert.strictEqual(offered(event, vf2).length, 0, 'response is consumed');
const vf3 = put(card(26100), remote().root); vf3.rezzed = true;
event = trashAs(vf3, corp);
assert.strictEqual(offered(event, vf3).length, 0, 'Corp trash gives nothing');
const vf4 = put(card(26100), remote().root);
event = trashAs(vf4, runner);
assert.strictEqual(offered(event, vf4).length, 0, 'unrezzed: inactive');
// AI response: installs its ranked plan, or the window is not offered when nothing is wanted
corp.creditPool = 10;
put(wall('HQ Wall', 4), corp.HQ.cards);
const vf5 = put(card(26100), remote().root); vf5.rezzed = true;
event = trashAs(vf5, runner);
assert.strictEqual(offered(event, vf5).length, 1, 'AI takes the free install');
vf5.responseOnTrash.Resolve.call(vf5);
d = decisions.shift();
assert(ai.preferred.option.card && d.choices.includes(ai.preferred.option), 'AI installs its ranked plan');
ai.preferred = null;
corp.HQ.cards.length = 0;
const vf6 = put(card(26100), remote().root); vf6.rezzed = true;
event = trashAs(vf6, runner);
assert.strictEqual(offered(event, vf6).length, 0, 'empty HQ: nothing to install');
assert.strictEqual(vf6.AIWorthInstalling([]), -1, 'needs cards in HQ to be worth installing');

if (process.env.VERBOSE) console.log('uprising batch 8: all tests passed');
