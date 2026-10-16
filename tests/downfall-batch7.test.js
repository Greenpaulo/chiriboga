'use strict';
// Downfall batch 7 (26031–26035): MirrorMorph: Endless Iteration, Architect
// Deployment Test, Calvin B4L3Y, Nanoetching Matrix and Hagen through the real
// engine phases, trash attribution and Corp AI selectors.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/downfall.js'])
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
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command) => {
  const d = {player, choices, title, command, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
let responseQueue = [];
// Windows under test are queued for inspection; other windows continue at once.
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
const watched = new Set(["responseOnTrash", "responseOnCorpActionCompletes"]);
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
  decisions = []; responseQueue = []; ai.preferred = null; c.executingCommand = '';
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice, corp.archives.ice,
    runner.rig.programs, runner.rig.hardware, runner.rig.resources, runner.heap]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
};

// --- Hagen: -1 strength per installed icebreaker, restricted program trash, ETR ---
reset();
const hagen = put(card(26035), corp.HQ.ice); hagen.rezzed = true;
assert.strictEqual(c.Strength(hagen), 6, 'printed strength with no icebreakers');
const corroder = put(program('Corroder', ['Icebreaker', 'Fracter']), runner.rig.programs);
const mimic = put(program('Mimic', ['Icebreaker', 'Killer']), runner.rig.programs);
const aiBreaker = put(program('Euler', ['Icebreaker', 'Decoder']), runner.rig.programs);
const crypsis = put(program('Crypsis', ['Icebreaker', 'AI']), runner.rig.programs);
const virus = put(program('Imp', ['Virus']), runner.rig.programs);
assert.strictEqual(c.Strength(hagen), 2, 'four installed icebreakers; the virus does not count');
hagen.subroutines[0].Resolve.call(hagen);
let d = decisions.shift();
same(d.choices.map(choice => choice.card.title).sort(), ['Crypsis', 'Imp'],
  'decoders, fracters and killers are protected');
assert.strictEqual(d.command, 'trash');
c.executingCommand = 'trash';
const pick = ai.Choice(d.choices, 'select');
assert(pick >= 0 && pick < d.choices.length, 'Corp AI selects a legal Hagen target');
d.choose(d.choices.find(choice => choice.card == crypsis));
assert(runner.heap.includes(crypsis) && !runner.rig.programs.includes(crypsis), 'chosen program trashed');
assert.strictEqual(c.Strength(hagen), 3, 'strength rises when an icebreaker leaves');
c.executingCommand = '';
// AI model: the program-trash subroutine matters only with an eligible target
let model = hagen.AIImplementIce.call(hagen, runner.AI.rc, {sr: []}, 10, false);
same(model.sr, [[['misc_serious']], [['endTheRun']]]);
assert.strictEqual(ai._requiredSubroutines(hagen), 2, 'Corp security sees both subroutines as threats');
c.Trash(virus, false); responseQueue = [];
hagen.subroutines[0].Resolve.call(hagen);
assert.strictEqual(decisions.length, 0, 'no eligible program: no trash decision');
model = hagen.AIImplementIce.call(hagen, runner.AI.rc, {sr: []}, 10, false);
same(model.sr, [[[]], [['endTheRun']]], 'blank subroutine keeps indices aligned');
assert.strictEqual(ai._requiredSubroutines(hagen), 1, 'only the end-the-run subroutine needs breaking');
assert.strictEqual(ai._effectiveIceStrength(hagen), 3, 'Corp planner sees the reduced strength');

// --- Calvin B4L3Y and Nanoetching Matrix: once-per-turn click abilities ---
reset();
const filler = n => {for (let i = 0; i < n; i++) put({title: 'Filler ' + i, player: corp, cardType: 'operation', subTypes: []}, corp.RnD.cards);};
filler(8);
const calvinServer = remote(), matrixServer = remote();
const calvin = put(card(26033), remote().root);
const matrix = put(card(26034), matrixServer.root);
assert.strictEqual(c.ChoicesTriggerableAbilities(corp, 'click').length, 0, 'unrezzed assets have no abilities');
calvin.rezzed = true; matrix.rezzed = true;
let clickAbilities = c.ChoicesTriggerableAbilities(corp, 'click').map(option => option.card);
assert(clickAbilities.includes(calvin) && clickAbilities.includes(matrix), 'both are main-phase click abilities');
c.currentPhase = c.phases.corpPostAction;
assert.strictEqual(calvin.abilities[0].Enumerate.call(calvin).length, 0, 'clicks are spent only in the action phase');
c.currentPhase = c.phases.corpActionMain;
calvin.abilities[0].Resolve.call(calvin);
matrix.abilities[0].Resolve.call(matrix);
assert.strictEqual(corp.HQ.cards.length, 2, 'Calvin draws 2');
assert.strictEqual(corp.creditPool, 12, 'Nanoetching gains 2');
assert.strictEqual(corp.clickTracker, 1, 'each costs a click');
assert.strictEqual(calvin.abilities[0].Enumerate.call(calvin).length, 0, 'Calvin once per turn');
assert.strictEqual(matrix.abilities[0].Enumerate.call(matrix).length, 0, 'Nanoetching once per turn');
calvin.responseOnCorpTurnBegins.Resolve.call(calvin); matrix.responseOnCorpTurnBegins.Resolve.call(matrix);
assert.strictEqual(matrix.abilities[0].Enumerate.call(matrix).length, 1, 'usable again next turn');
// Corp AI: the economy path triggers Nanoetching specifically, the draw path Calvin
calvin.usedThisTurn = false; corp.clickTracker = 3;
let options = ['gain', 'draw', 'trigger', 'n'];
assert.strictEqual(ai._bestMainPhaseEconomyOption(options), options.indexOf('trigger'));
assert.strictEqual(ai.preferred.cardToTrigger, matrix, 'economy uses the credit ability, not Calvin');
ai.preferred = null;
assert.strictEqual(ai._drawAbilityCard(options), calvin, 'Calvin outdraws the basic draw');
corp.RnD.cards.length = 2;
assert.strictEqual(ai._drawAbilityCard(options), null, 'never draws R&D out');
filler(6);
// AI rezzes the free assets and installs them outside scoring servers
calvin.rezzed = false;
c.currentPhase = c.phases.corpPostAction; c.executingCommand = '';
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 0, 'AIRezWhenCan rezzes Calvin');
assert.strictEqual(ai.preferred.cardToRez, calvin); ai.preferred = null; calvin.rezzed = true;
c.currentPhase = c.phases.corpActionMain;
const spareMatrix = put(card(26034), corp.HQ.cards);
assert.strictEqual(spareMatrix.AIWorthInstalling.call(spareMatrix, []), 0, 'Nanoetching goes to a new server');
const spareCalvin = put(card(26033), corp.HQ.cards);
assert.strictEqual(spareCalvin.AIWorthInstalling.call(spareCalvin, []), -1, 'unique: no second Calvin');

// --- trash responses fire only when the Runner trashes the rezzed asset ---
const trashAs = (target, player) => {c.activePlayer = player; c.Trash(target, true); c.activePlayer = corp; return takeResponse('responseOnTrash');};
let event = trashAs(calvin, corp);
assert.strictEqual(offered(event, calvin).length, 0, 'Corp trashing Calvin gives nothing');
const calvin2 = put(card(26033), remote().root); calvin2.rezzed = true;
event = trashAs(spareMatrix, runner);
assert.strictEqual(offered(event, calvin2).length, 0, 'another card trashed: no Calvin response');
event = trashAs(calvin2, runner);
let choices = withAI(corp, null, () => offered(event, calvin2));
same(choices.map(choice => choice.id), [1, 0], 'human may draw or pass');
const hand = corp.HQ.cards.length;
calvin2.responseOnTrash.Resolve.call(calvin2, choices[0]);
assert.strictEqual(corp.HQ.cards.length, hand + 2, 'Runner trash: draw 2');
same(offered(event, calvin2).map(choice => choice.id), [], 'response is consumed');
const calvin3 = put(card(26033), remote().root); calvin3.rezzed = true;
event = trashAs(calvin3, runner);
same(offered(event, calvin3).map(choice => choice.id), [1], 'AI draws');
corp.RnD.cards.length = 2;
const calvin4 = put(card(26033), remote().root); calvin4.rezzed = true;
event = trashAs(calvin4, runner);
same(offered(event, calvin4).map(choice => choice.id), [0], 'AI declines a draw that empties R&D');
const unrezzed = put(card(26034), matrixServer.root);
event = trashAs(unrezzed, runner);
assert.strictEqual(offered(event, unrezzed).length, 0, 'unrezzed Nanoetching has no active ability');
event = trashAs(matrix, runner);
same(offered(event, matrix).map(choice => choice.id), [1], 'AI gains');
const credits = corp.creditPool;
matrix.responseOnTrash.Resolve.call(matrix, {id: 1});
assert.strictEqual(corp.creditPool, credits + 2, 'Runner trash: gain 2');

// --- Architect Deployment Test: free install and rez from the top 5 of R&D ---
reset();
const wall = (title, rezCost) => ({title, player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost, strength: 4,
  subroutines: [{text: 'End the run.', Resolve() {}}],
  AIImplementIce(rc, result) {result.sr = [[['endTheRun']]]; return result;}});
const deep = put({title: 'Deep Upgrade', player: corp, cardType: 'upgrade', subTypes: [], rezCost: 2, trashCost: 2}, corp.RnD.cards);
const adtAsset = put({title: 'Asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 3, trashCost: 2}, corp.RnD.cards);
const adtAgenda = put({title: 'Agenda', player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: 3, agendaPoints: 2}, corp.RnD.cards);
const adtOp = put({title: 'Operation', player: corp, cardType: 'operation', subTypes: [], playCost: 0}, corp.RnD.cards);
const adtWall = put(wall('Big Wall', 8), corp.RnD.cards);
const adtTop = put(wall('Top Wall', 1), corp.RnD.cards);
const adt = put(card(26032), corp.scoreArea);
c.intended.score = null;
assert.strictEqual(adt.responseOnScored.Enumerate.call(adt).length, 0, 'only when this agenda is scored');
c.intended.score = adt;
assert.strictEqual(adt.responseOnScored.Enumerate.call(adt).length, 1);
withAI(corp, null, () => adt.responseOnScored.Resolve.call(adt));
d = decisions.shift();
same(d.choices.map(choice => choice.card ? choice.card.title : 'decline'), ['Top Wall', 'Big Wall', 'Agenda', 'Asset', 'decline'],
  'top 5, top first; operations cannot be installed and the sixth card is not seen');
assert(adtWall.faceUp, 'the human Corp sees the cards while choosing');
d.choose(d.choices[1]);
assert(!adtWall.faceUp && !adtAgenda.faceUp, 'looked-at cards turn back face down');
d = decisions.shift();
assert.strictEqual(d.command, 'install');
corp.creditPool = 0;
d.choose(d.choices.find(choice => choice.server == corp.HQ)); finishInstall();
assert(corp.HQ.ice.includes(adtWall), 'installed from R&D');
assert(adtWall.rezzed, 'rezzed ignoring its 8 rez cost');
assert.strictEqual(corp.creditPool, 0, 'no install or rez cost paid');
same(corp.RnD.cards.map(item => item.title), ['Deep Upgrade', 'Asset', 'Agenda', 'Operation', 'Top Wall'], 'other cards stay in order');
// an agenda can be installed, but not rezzed
withAI(corp, null, () => adt.responseOnScored.Resolve.call(adt));
d = decisions.shift(); d.choose(d.choices.find(choice => choice.card == adtAgenda));
d = decisions.shift(); d.choose(d.choices.find(choice => choice.server == null)); finishInstall();
assert(c.CheckInstalled(adtAgenda) && !adtAgenda.rezzed, 'agenda installed in a new remote, unrezzed');
// declining installs nothing
withAI(corp, null, () => adt.responseOnScored.Resolve.call(adt));
d = decisions.shift(); d.choose(d.choices[d.choices.length - 1]);
assert.strictEqual(decisions.length, 0); assert.strictEqual(corp.RnD.cards.length, 4);
// Corp AI: the shared install ranking picks a card and destination; free rez of the expensive ice
corp.RnD.cards.length = 0; corp.remoteServers.length = 0; corp.HQ.ice.length = 0;
put(card(26034), corp.RnD.cards); const aiWall = put(wall('AI Wall', 6), corp.RnD.cards); put(adtOp, corp.RnD.cards);
corp.creditPool = 0;
adt.responseOnScored.Resolve.call(adt);
d = decisions.shift();
assert.strictEqual(d.choices.length, 1, 'AI is offered only its plan');
assert(d.choices[0].card, 'AI installs a card when one is useful');
const aiCard = d.choices[0].card;
d.choose(d.choices[0]); finishInstall();
assert.strictEqual(decisions.length, 0, 'AI destination comes from the same plan');
assert(c.CheckInstalled(aiCard) && aiCard.rezzed, 'AI card installed and rezzed for free');
corp.RnD.cards.length = 0; put(adtOp, corp.RnD.cards);
adt.responseOnScored.Resolve.call(adt);
d = decisions.shift();
assert.strictEqual(d.choices[0].card, null, 'nothing installable: AI declines');
d.choose(d.choices[0]);
c.intended.score = null;

// --- MirrorMorph: three different actions, then 1[c] or a different extra action ---
reset();
const morph = card(26031);
const savedIdentity = corp.identityCard;
corp.identityCard = morph;
filler(10);
const mmServer = remote();
const mmMatrix = put(card(26034), mmServer.root); mmMatrix.rezzed = true;
const startTurn = clicks => {
  reset(); corp.clickTracker = clicks; mmMatrix.usedThisTurn = false;
  filler(10); corp.remoteServers.push(mmServer);
  c.currentPhase = c.phases.corpActionStart; c.phases.corpActionStart.Init();
  c.currentPhase = c.phases.corpActionMain;
};
const act = (command, params) => {
  assert.strictEqual(c.currentPhase, c.phases.corpActionMain, 'acting in the action phase');
  c.activePlayer = corp; c.currentPhase.Resolve[command](params || {});
  // TriggerAbility asks for its ability choice through a decision
  while (decisions.length && decisions[0].command == 'continue') {const ability = decisions.shift(); ability.choose(ability.choices[0]);}
  finishInstall();
  assert.strictEqual(c.currentPhase, c.phases.corpPostAction, command + ' reached the post-action window');
};
// The Corp passes the post-action window (the Runner then passes too).
const pass = () => {
  c.activePlayer = corp; c.currentPhase.Resolve.n();
  const event = responseQueue.length ? takeResponse('responseOnCorpActionCompletes') : null;
  return {event, finish() {
    if (event) event.after();
    if (c.currentPhase == c.phases.corpPostAction && c.activePlayer == runner) c.currentPhase.Resolve.n();
  }};
};
const matrixAbility = () => c.phases.corpActionMain.Enumerate.trigger().find(option => option.card == mmMatrix);
startTurn(3);
act('gain'); let window = pass();
assert.strictEqual(offered(window.event, morph).length, 0, 'not after the first action'); window.finish();
act('draw'); window = pass(); window.finish();
act('trigger', matrixAbility());
same(corp.actionsTakenThisTurn.map(action => action.command), ['gain', 'draw', 'trigger']);
window = pass();
let mmChoices = withAI(corp, null, () => offered(window.event, morph));
same(mmChoices.map(choice => choice.id), [0, 1, 2], 'gain, extra action, or pass');
assert.strictEqual(ai.preferred, null);
same(offered(window.event, morph).map(choice => choice.id), [1], 'AI takes the extra action when one is legal');
// take the extra action: one click is covered and it must differ from the first three
morph.responseOnCorpActionCompletes.Resolve.call(morph, mmChoices[1]);
assert.strictEqual(corp.clickTracker, 1, 'the last click was spent; the extra action is paid one click less');
window.finish();
assert.strictEqual(c.currentPhase, c.phases.corpActionMain, 'back to the action phase for the extra action');
const optionList = c.EnumeratePhase();
assert(!optionList.includes('gain') && !optionList.includes('draw'), 'basic gain and draw were already taken');
assert(!c.phases.corpActionMain.Enumerate.trigger().length, 'Nanoetching ability was the third action');
const extra = put(card(26034), corp.HQ.cards);
assert(c.EnumeratePhase().includes('install'), 'a different basic action remains');
const aiCommand = c.EnumeratePhase()[ai.Choice(c.EnumeratePhase(), 'command')];
assert(['install', 'play', 'advance'].includes(aiCommand), 'Corp AI picks a legal different action: ' + aiCommand);
ai.preferred = null;
act('install', {card: extra, server: null});
assert.strictEqual(corp.clickTracker, 0, 'the extra install cost the covered click only');
assert.strictEqual(corp.restrictedNextAction, null, 'restriction ends once the extra action is taken');
window = pass();
assert.strictEqual(offered(window.event, morph).length, 0, 'the fourth action does not trigger again');
window.finish();
assert.strictEqual(c.currentPhase, c.phases.corpActionPhaseEnds, 'turn proceeds once clicks are gone');
// Corp AI in the real response window: it triggers MirrorMorph and takes the extra action
startTurn(3);
act('gain'); pass().finish(); act('draw'); pass().finish(); act('trigger', matrixAbility());

realTriggeredResponsePhase(corp, 'responseOnCorpActionCompletes', [corp.actionsTakenThisTurn.slice()], () => {}, 'Action Completes');
let commands = c.EnumeratePhase();
assert(commands.includes('trigger'), 'MirrorMorph is offered in the window');
c.executingCommand = commands[ai.Choice(commands, 'command')];
assert.strictEqual(c.executingCommand, 'trigger', 'Corp AI triggers MirrorMorph');
c.validOptions = c.phaseOptions.trigger;
assert.strictEqual(c.validOptions.length, 1);
c.currentPhase.Resolve.trigger(c.validOptions[ai.Choice(c.validOptions, 'select')]);
while (decisions.length) {const choice = decisions.shift(); choice.choose(choice.choices[ai.Choice(choice.choices, 'select')]);}
assert.strictEqual(corp.clickTracker, 1, 'AI chose the extra action');
assert(corp.restrictedNextAction, 'the extra action is restricted');
c.executingCommand = ''; ai.preferred = null; responseQueue = [];
// gain 1 instead
startTurn(3);
act('gain'); pass().finish(); act('draw'); pass().finish(); act('trigger', matrixAbility());
window = pass();
const before = corp.creditPool;
morph.responseOnCorpActionCompletes.Resolve.call(morph, {id: 0});
window.finish();
assert.strictEqual(corp.creditPool, before + 1, 'MirrorMorph gains 1');
assert.strictEqual(c.currentPhase, c.phases.corpActionPhaseEnds, 'no extra click from the credit option');
// two same actions: no trigger
startTurn(3);
act('gain'); pass().finish(); act('gain'); pass().finish(); act('draw');
window = pass();
assert.strictEqual(offered(window.event, morph).length, 0, 'gain, gain, draw are not all different'); window.finish();
// a cancelled install is not an action
startTurn(4);
act('gain'); pass().finish();
const realInstall = c.Install;
c.Install = () => {}; // cancelled: the phase stays put and no click is spent
c.phases.corpActionMain.Resolve.install({card: put(card(26034), corp.HQ.cards), server: null});
c.Install = realInstall;
assert.strictEqual(c.currentPhase, c.phases.corpActionMain);
act('draw'); pass().finish();
same(corp.actionsTakenThisTurn.map(action => action.command), ['gain', 'draw'], 'only completed actions count');
// no different action possible: only the credit is offered
startTurn(3);
act('gain'); pass().finish(); act('draw'); pass().finish(); act('trigger', matrixAbility());
corp.RnD.cards.length = 0; corp.HQ.cards.length = 0;
window = pass();
assert(!c.CorpHasDifferentActionAvailable(corp.actionsTakenThisTurn, 1), 'nothing else to do');
same(withAI(corp, null, () => offered(window.event, morph)).map(choice => choice.id), [0, 2]);
same(offered(window.event, morph).map(choice => choice.id), [0], 'AI gains when no extra action is legal');
assert.strictEqual(c.currentPhase, c.phases.corpPostAction, 'legality check restores the phase');
assert.strictEqual(corp.clickTracker, 0, 'legality check restores clicks');
window.finish();
corp.identityCard = savedIdentity;

console.log('downfall batch 7: all tests passed');
