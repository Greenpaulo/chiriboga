'use strict';
// Downfall batch 13: run tax upgrade, install-turn agenda, draw asset and run-rezzable ICE.
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
const card = id => Object.assign({}, c.cardSet[id]);
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
const ice = (title, extra = {}) => Object.assign({title, player: corp, cardType: 'ice', subTypes: ['Barrier'],
  rezCost: 1, strength: 2, subroutines: [{text: 'End the run.', Resolve() {}}]}, extra);
const agenda = title => ({title, player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: 3, agendaPoints: 2});
const stack = (zone, n) => {for (let i = 0; i < n; i++) put({title: 'Filler ' + i, player: corp, cardType: 'operation', subTypes: [], playCost: 0}, zone);};
// The Corp AI card-declared rez path; option order keeps the no-handler fallback on pass.
const rezPick = async () => {
  ai.preferred = null;
  const index = await ai.CommandChoice(['n', 'rez']);
  const chosen = index == 1 && ai.preferred ? ai.preferred.cardToRez : null;
  return chosen;
};
async function main() {
// Reduced Service: optional rez payment, run tax only on its server, central-run decay.
reset(); corp.creditPool = 3;
let home = remote(); const other = remote();
const service = put(card(26062), home.root);
assert.strictEqual(service.unique, true);
watched.add('responseOnRez');
withAI(corp, null, () => c.Rez(service));
let event = takeResponse('responseOnRez');
assert(service.rezzed, 'rez cost 0 paid');
let offers = withAI(corp, null, () => offered(event, service));
same(offers.map(o => o.id), [0, 1, 2, 3], 'human may pay 0 up to the credits available (max 4)');
corp.creditPool = 9;
same(withAI(corp, null, () => offered(event, service)).map(o => o.id), [0, 1, 2, 3, 4], 'capped at 4');
service.responseOnRez.Resolve.call(service, {id: 3});
assert.strictEqual(c.Counters(service, 'power'), 3); assert.strictEqual(corp.creditPool, 6);
same(c.AdditionalRunCosts(home), {clicks: 0, credits: 6}, '2 credits per counter');
same(c.AdditionalRunCosts(other), {clicks: 0, credits: 0}, 'other servers untaxed');
c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runnerActionMain;
runner.creditPool = 5; runner.clickTracker = 4;
let runs = c.phases.runnerActionMain.Enumerate.run();
assert(!runs.some(o => o.server == home), 'Runner cannot run without the tax');
assert(runs.some(o => o.server == other));
runner.creditPool = 6;
assert(c.phases.runnerActionMain.Enumerate.run().some(o => o.server == home), 'affordable with exactly 6');
c.AutomaticTriggers('automaticOnRunSuccessful', [other]);
assert.strictEqual(c.Counters(service, 'power'), 3, 'remote success does not decay');
for (const central of [corp.HQ, corp.RnD, corp.archives]) c.AutomaticTriggers('automaticOnRunSuccessful', [central]);
assert.strictEqual(c.Counters(service, 'power'), 0, 'each central success removes 1');
c.AutomaticTriggers('automaticOnRunSuccessful', [corp.HQ]);
assert.strictEqual(c.Counters(service, 'power'), 0, 'never below zero');
service.power = 2; service.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
same(c.AdditionalRunCosts(home), {clicks: 0, credits: 0}, 'unrezzed counters do not tax');
c.AutomaticTriggers('automaticOnRunSuccessful', [corp.HQ]);
assert.strictEqual(c.Counters(service, 'power'), 2, 'unrezzed counters do not decay');
service.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
// The Runner's run calculator charges the tax at run start.
const rc = runner.AI.rc; rc.suppressOutput = true; rc.Print = () => {};
c.attackedServer = null; runner.creditPool = 5;
const taxed = rc.Calculate(home, 4, 5, 0, Infinity, Infinity, true);
assert(taxed.length, 'taxed server reachable with 5 credits');
assert.strictEqual(taxed[0].at(-1).runner_credits_lost, 4, 'run calculator charges the run tax');
assert.strictEqual(rc.Calculate(home, 4, 3, 0, Infinity, Infinity, true).length, 0, 'unaffordable tax');
watched.delete('responseOnRez');

// Corp AI: placement, rez timing and preferred payment.
reset(); corp.creditPool = 6;
home = remote(); const outer = put(ice('Unrezzed wall', {rezCost: 2}), home.ice);
const bare = remote();
const aiService = put(card(26062), corp.HQ.cards);
assert(ai._shouldUpgradeServerWithCard(home, aiService, true), 'worth installing in an iced remote');
assert(!ai._shouldUpgradeServerWithCard(bare, aiService, true), 'not in an unprotected remote');
c.MoveCard(aiService, home.root);
c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runnerStartResponse;
assert.strictEqual(await rezPick(), null, 'empty remote: no rez');
ai.preferred = null;
put(agenda('Hidden agenda'), home.root);
assert.strictEqual(await rezPick(), aiService, 'rezzes before the next run on the Runner turn');

ai.preferred = null;
same(aiService.responseOnRez.Enumerate.call(aiService, aiService).map(o => o.id), [4], 'keeps 2 for the unrezzed ICE');
corp.creditPool = 4;
same(aiService.responseOnRez.Enumerate.call(aiService, aiService).map(o => o.id), [2]);
corp.creditPool = 2;
assert.strictEqual(await rezPick(), null, 'no spare credits beyond the ICE reserve');
ai.preferred = null; corp.creditPool = 6;
c.attackedServer = home;
assert.strictEqual(await rezPick(), null, 'not mid-run (tax applies only to later runs)');
ai.preferred = null; c.attackedServer = null;
c.playerTurn = corp; c.currentPhase = c.phases.corpActionMain;
assert(!aiService.AIRezWhenCan.call(aiService), 'not on the Corp turn');
outer.rezzed = true;

// Vulnerability Audit: cannot be scored on its install turn; either turn start clears it.
reset();
home = remote();
const audit = put(card(26063), corp.HQ.cards);
const control = put(agenda('Control'), home.root); control.advancement = 3;
c.MoveCard(audit, home.root);
c.AutomaticTriggers('automaticOnInstall', [audit]);
audit.advancement = 4;
assert(!c.CheckScore(audit), 'installed this turn');
assert(c.CheckScore(control), 'other agendas are unaffected');
assert(!ai._isFullyAdvanceableAgenda(audit), 'AI does not plan to score it this turn');
c.AutomaticTriggers('automaticOnRunnerTurnBegins');
assert(c.CheckScore(audit), 'scorable on a later turn');
assert(ai._isFullyAdvanceableAgenda(audit));
c.AutomaticTriggers('automaticOnInstall', [audit]);
assert(!c.CheckScore(audit));
c.AutomaticTriggers('automaticOnCorpTurnBegins');
assert(c.CheckScore(audit), 'Corp turn start also clears it');
// Install-and-fast-advance win planning skips it.
reset(); corp.clickTracker = 5; corp.creditPool = 10;
corp.scoreArea.push({title: 'Scored', player: corp, cardType: 'agenda', agendaPoints: 4, cardLocation: corp.scoreArea});
const handAudit = put(card(26063), corp.HQ.cards);
const winReasons = () => ai._rankedInstallOptionsCore(corp.HQ.cards, true, false)
  .filter(o => o.cardToInstall == handAudit && o.reason == 'could be installed and fast-advanced to win');
const potential = ai._potentialAdvancement(null, Infinity, true);
assert(potential >= 4, 'enough advancement that an ordinary agenda would be planned');
assert.strictEqual(winReasons().length, 0, 'no install-and-score win plan for Vulnerability Audit');
handAudit.AICannotScoreOnInstallTurn = false;
assert.strictEqual(winReasons().length, 1, 'control: the flag is what excludes it');
corp.scoreArea.length = 0;

// CSR Campaign: optional draw when the Corp turn begins, only while rezzed.
reset(); stack(corp.RnD.cards, 5);
home = remote();
const csr = put(card(26064), home.root);
watched.add('responseOnCorpTurnBegins');
c.TriggeredResponsePhase(corp, 'responseOnCorpTurnBegins', []);
event = takeResponse('responseOnCorpTurnBegins');
assert.strictEqual(offered(event, csr).length, 0, 'unrezzed');
csr.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
same(withAI(corp, null, () => offered(event, csr)).map(o => o.id), [1, 0], 'human may draw or pass');
same(offered(event, csr).map(o => o.id), [1], 'AI draws');
csr.responseOnCorpTurnBegins.Resolve.call(csr, {id: 0});
assert.strictEqual(corp.HQ.cards.length, 0);
csr.responseOnCorpTurnBegins.Resolve.call(csr, {id: 1});
assert.strictEqual(corp.HQ.cards.length, 1); assert.strictEqual(corp.RnD.cards.length, 4);
corp.RnD.cards.length = 2;
same(offered(event, csr).map(o => o.id), [0], 'AI keeps R&D for the mandatory draw');
watched.delete('responseOnCorpTurnBegins');
// AI install and end-of-Runner-turn rez.
reset(); stack(corp.RnD.cards, 10); corp.maxHandSize = 5;
put(ice('Unfunded ICE', {rezCost: 10}), corp.HQ.ice);
const csrHand = put(card(26064), corp.HQ.cards);
let legal = c.ChoicesCardInstall(csrHand);
let best = ai._bestInstallOption(legal, false);
assert(best >= 0 && legal[best].card == csrHand, 'CSR Campaign has a useful install');
assert(csrHand.AIWorthInstalling.call(csrHand, []) >= 0);
for (let i = 0; i < 5; i++) put({title: 'Hand ' + i, player: corp, cardType: 'operation', subTypes: []}, corp.HQ.cards);
assert.strictEqual(csrHand.AIWorthInstalling.call(csrHand, []), -1, 'not with a near-full hand');
corp.HQ.cards.splice(1);
home = remote(); c.MoveCard(csrHand, home.root);
c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = {identifier: 'Runner 2.2', title: 'End of turn', player: runner};
assert.strictEqual(await rezPick(), csrHand, 'rezzes at the end of the Runner turn');

ai.preferred = null; c.currentPhase = c.phases.runnerStartResponse;
assert(!csrHand.AIRezWhenCan.call(csrHand), 'waits for the end of the Runner turn');

// Rime: +1 strength to each ice protecting its server, including itself, while rezzed.
reset();
home = remote();
const wall = put(ice('Wall', {rezzed: true}), home.ice);
const rime = put(card(26065), home.ice);
const elsewhere = put(ice('Elsewhere', {rezzed: true}), corp.HQ.ice);
assert.strictEqual(c.Strength(wall), 2, 'unrezzed Rime gives nothing');
rime.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
assert.strictEqual(c.Strength(wall), 3);
assert.strictEqual(c.Strength(rime), 1, 'Rime boosts itself');
assert.strictEqual(c.Strength(elsewhere), 2, 'other servers are unaffected');
const second = put(card(26065), home.ice); second.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
assert.strictEqual(c.Strength(wall), 4, 'two Rimes stack');
c.MoveCard(second, corp.archives.cards); second.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
rime.subroutines[0].Resolve.call(rime);
assert.strictEqual(runner.creditPool, 4, 'Runner loses 1');
// Rez legality: any non-ice rez window during runs on its server.
rime.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = runner; c.activePlayer = corp;
const rezOptions = phase => {c.currentPhase = phase; return phase.Enumerate.rez().map(o => o.card);};
c.attackedServer = home; c.approachIce = 0; // approaching the outer wall, not Rime
assert(rezOptions(c.phases.runApproachIce).includes(rime), 'rezzable while another ice is approached');
c.encountering = true; c.encounteredIce = wall;
// Official Downfall release notes: Rime cannot rez in the encounter's no-rez window.
assert(!rezOptions(c.phases.runEncounterIce).includes(rime), 'not rezzable during an encounter');
assert(!rezOptions(c.phases.runDecideContinue).includes(rime), 'not rezzable in the pre-jack-out window');
c.encountering = false; c.encounteredIce = null;
c.approachIce = -1;
assert(rezOptions(c.phases.runResponseBeforeApproach).includes(rime), 'rezzable in the post-jack-out window after passing all ice');
const ordinary = put(ice('Ordinary inner', {rezCost: 0}), home.ice);
assert(!rezOptions(c.phases.runResponseBeforeApproach).includes(ordinary), 'ordinary ice keeps approach-only timing');
c.MoveCard(ordinary, corp.archives.cards);
c.attackedServer = corp.HQ; c.approachIce = 0;
assert(!rezOptions(c.phases.runApproachIce).includes(rime), 'not during runs on another server');
c.attackedServer = null; c.playerTurn = corp; c.currentPhase = c.phases.corpActionMain;
assert(!c.CheckRezAsNonIceDuringRun(rime), 'no special timing outside runs');
// Corp AI rezzes it at the first opportunity in a run on its server; Runner AI models the subroutine.
c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runApproachIce;
c.attackedServer = home; c.approachIce = 0; ai.preferred = null;
assert.strictEqual(await rezPick(), rime, 'rezzes during a run on its server');

c.executingCommand = 'rez';
const rezChoices = c.phases.runApproachIce.Enumerate.rez();
assert.strictEqual(rezChoices[await ai.SelectChoice(rezChoices)].card, rime);
c.executingCommand = ''; ai.preferred = null;
c.attackedServer = corp.HQ;
assert.strictEqual(await rezPick(), null,
  'no rez during runs elsewhere');
c.attackedServer = null; ai.preferred = null;
rime.rezzed = true;
const model = rc.IceAI(rime, 0);
same(model.sr, [[['loseCredits']]], 'subroutine uses the documented credit-loss effect');
console.log('Downfall batch 13: mechanics, resource guards, cleanup and real AI consumers passed.');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
