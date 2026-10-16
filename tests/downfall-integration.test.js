'use strict';
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/downfall.js'])
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
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI._random = function () {return 0;}; runner.AI.rc.Print = function () {}; corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {this.zoomed = !this.zoomed;}, zoomed: false});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command, cancel) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice), cancel};
  decisions.push(d); return d;
};
// Rendering-free zone movement; rules checks, triggers, AI and costs remain real.
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
async function main() {
const isolation = put(card(26001), runner.grip);
const exhausted = put({title: 'Empty resource', player: runner, cardType: 'resource', subTypes: [],
  installCost: 2, AIOkToTrash: () => true}, runner.rig.resources);
const live = put({title: 'Live engine', player: runner, cardType: 'resource', subTypes: [],
  installCost: 5, AIOkToTrash: () => false}, runner.rig.resources);
assert.strictEqual(c.FullCheckPlay(isolation).length, 2);
let ai = runner.AI; ai.rc.suppressOutput = true;
let options = ['gain', 'play'];
assert.strictEqual(options[await ai.CommandChoice(options)], 'play', 'real economy selector plays Isolation');
assert.strictEqual(ai.preferred.cardToPlay, isolation);
assert.strictEqual(ai.preferred.nextPrefs.index, 0, 'cash out the exhausted resource');
c.executingCommand = 'play';
assert.strictEqual(await ai.SelectChoice([{card: isolation}]), 0);
c.Play(isolation, finish => {runner.creditPool -= 2; runner.clickTracker--; finish();});
let decision = decisions.shift();
c.currentPhase = {identifier: 'Runner 1.3', title: decision.title};
const resourceIndex = await ai.SelectChoice(decision.choices);
assert.strictEqual(decision.choices[resourceIndex].card, exhausted);
decision.choose(decision.choices[resourceIndex]);
c.currentPhase = c.phases.runnerActionMain; c.executingCommand = '';
assert.strictEqual(runner.creditPool, 3, 'income waits for trash cost and responses');
flushResponses();
assert(runner.heap.includes(exhausted)); assert.strictEqual(runner.creditPool, 10);
assert(runner.rig.resources.includes(live));
assert.strictEqual(isolation.AIPreferredPlayChoice(isolation.Enumerate()), -1);
assert.strictEqual(options[await ai.CommandChoice(options)], 'gain', 'preserve a live resource');
runner.rig.resources = [];
assert.strictEqual(c.FullCheckPlay(isolation), null, 'cannot pay trash cost with no resource');
runner.rig.resources = [live]; live.cardLocation = runner.rig.resources;
runner.creditPool = 1;
assert.strictEqual(c.FullCheckPlay(isolation), null, 'cannot pay printed credit cost');
runner.creditPool = 5; runner.clickTracker = 4;
const cancellable = put(card(26001), runner.grip);
let paidOnCancel = false;
c.Cancel = () => {};
c.Play(cancellable, finish => {paidOnCancel = true; finish();});
const cancelDecision = decisions.shift(); cancelDecision.cancel();
assert.strictEqual(paidOnCancel, false);
assert(runner.rig.resources.includes(live) && runner.grip.includes(cancellable), 'cancel pays no costs');
const demolisher = put(card(26002), runner.grip);
runner.grip = [demolisher]; demolisher.cardLocation = runner.grip;
ai.preferred = null;
options = ['gain', 'install'];
assert.strictEqual(options[await ai.CommandChoice(options)], 'install', 'real selector installs useful console');
assert.strictEqual(ai.preferred.cardToInstall, demolisher);
c.MoveCard(demolisher, runner.rig.hardware);
const asset = put({title: 'Asset', player: corp, cardType: 'asset', subTypes: [], trashCost: 3}, corp.HQ.root);
assert.strictEqual(c.TrashCost(asset), 2, 'trash discount reaches the real cost evaluator');
assert.strictEqual(c.MemoryUnits(), 5);
let credits = runner.creditPool;
c.Trash(asset, false); flushResponses();
assert.strictEqual(runner.creditPool, credits + 1, 'Runner trashing gains a credit');
const second = put({title: 'Second asset', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
c.Trash(second, false); flushResponses();
assert.strictEqual(runner.creditPool, credits + 1, 'only the first trash pays');
demolisher.responseOnCorpTurnBegins.Resolve.call(demolisher);
c.activePlayer = corp;
const own = put({title: 'Corp sacrifice', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
c.Trash(own, false); flushResponses();
assert.strictEqual(demolisher.usedThisTurn, false, 'Corp trashing its own card does not spend the reward');
c.activePlayer = runner;
const batch = [0, 1].map(i => put({title: 'Batch '+i, player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root));
c.Trash(batch, false); flushResponses();
assert.strictEqual(runner.creditPool, credits + 2, 'simultaneous trash pays once');
demolisher.responseOnRunnerTurnBegins.Resolve.call(demolisher);
c.MoveCard(demolisher, runner.grip);
const prior = put({title: 'Before install', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
c.Trash(prior, false); flushResponses();
assert(demolisher.usedThisTurn, 'first time is tracked while uninstalled');
c.MoveCard(demolisher, runner.rig.hardware);
const later = put({title: 'After install', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
c.Trash(later, false); flushResponses();
assert.strictEqual(runner.creditPool, credits + 2);
assert(demolisher.AIWastefulToInstall(), 'do not install a second console');
demolisher.usedThisTurn = false;
const blanker = put({title: 'Blank console', player: corp, cardType: 'asset', subTypes: [], rezzed: true,
  modifyHasAbilities: {Resolve: function (target) {return target !== demolisher;}}}, corp.HQ.root);
const blankVictim = put({title: 'While blanked', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
const beforeBlanked = runner.creditPool;
c.Trash(blankVictim, false); flushResponses();
assert.strictEqual(runner.creditPool, beforeBlanked, 'blanked Demolisher does not award income');
corp.HQ.root.splice(corp.HQ.root.indexOf(blanker), 1);

// Effect ownership remains stable across priority changes and automatic effects.
demolisher.usedThisTurn = false;
const autoVictim = put({title: 'Automatic Corp sacrifice', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
const autoSource = put({title: 'Automatic source', player: corp, cardType: 'asset', subTypes: [], rezzed: true,
  automaticOnTestTrash: {Resolve: function () { c.Trash(autoVictim, false); }}}, corp.HQ.root);
c.AutomaticTriggers('automaticOnTestTrash'); flushResponses();
assert.strictEqual(demolisher.usedThisTurn, false, 'automatic Corp sacrifice is attributed to Corp');
const preventVictim = put({title: 'Runner trash with prevention window', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.root);
c.OpportunityForAvoidPrevent = (player, name, params, after) => {c.activePlayer = corp; after();};
c.activePlayer = runner; c.Trash(preventVictim, true); flushResponses();
assert(demolisher.usedThisTurn, 'Runner attribution survives Corp receiving prevention priority');
c.activePlayer = runner; corp.HQ.root = [];

runner.rig.hardware = []; runner.rig.resources = []; runner.creditPool = 20;
const wall = put({title: 'Wall', player: corp, cardType: 'ice', subTypes: ['Barrier'],
  strength: 2, rezCost: 3, rezzed: true, subroutines: [{text: 'End the run.'}],
  AIImplementIce: (rc, result) => {result.sr = [[['endTheRun']]]; return result;}}, corp.RnD.ice);
const chisel = put(card(26003), runner.grip);
runner.grip = [chisel]; chisel.cardLocation = runner.grip;
ai.preferred = null; options = ['gain', 'install'];
assert.strictEqual(options[await ai.CommandChoice(options)], 'install');
assert.strictEqual(ai.preferred.cardToInstall, chisel);
assert.strictEqual(ai.preferred.hostToInstallTo, wall, 'real install selector chooses useful host');
runner.grip = []; chisel.host = wall; wall.hostedCards = [chisel]; chisel.cardLocation = wall.hostedCards;
c.attackedServer = corp.RnD; c.approachIce = 0; c.encountering = true;
chisel.automaticOnEncounter.Resolve.call(chisel, wall);
assert.strictEqual(chisel.responseOnEncounter.Enumerate.call(chisel).length, 1);
chisel.responseOnEncounter.Resolve.call(chisel);
assert.strictEqual(c.Counters(chisel, 'virus'), 1); assert.strictEqual(c.Strength(wall), 1);
const rc = vm.runInContext('new RunCalculator()', c); rc.suppressOutput = true;
assert.strictEqual(rc.IceAI(wall, 20).strength, 1, 'live recalculation does not add a second counter');
chisel.responseOnEncounterEnds.Resolve.call(chisel); c.encountering = false; c.attackedServer = null;
assert.strictEqual(rc.IceAI(wall, 20).strength, 0, 'prospective encounter places the next counter');
assert.strictEqual(rc.IceAI(wall, 20).sr.length, 1, 'reaching zero does not trash in that encounter');
assert.strictEqual(rc.Calculate(corp.RnD, 3, 20, 0, 4, 0).length, 0, 'ETR remains at the counter-to-zero encounter');
assert.strictEqual(corp.AI._effectiveIceStrength(wall), 0, 'Corp planner sees the prospective counter exactly once');
chisel.virus = 2;
assert.strictEqual(rc.IceAI(wall, 20).sr.length, 0, 'zero-strength ice is trashed before subroutines');
assert(rc.Calculate(corp.RnD, 3, 20, 0, 4, 0).length > 0, 'real run calculator routes through Chisel trash');
const strengthBefore = wall.strength, countersBefore = chisel.virus;
corp.AI._evaluateServerSecurity(corp.RnD);
assert.strictEqual(wall.strength, strengthBefore); assert.strictEqual(chisel.virus, countersBefore, 'Corp planning is read-only');
c.attackedServer = corp.RnD; c.approachIce = 0; c.encountering = true;
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
chisel.responseOnEncounter.Resolve.call(chisel); flushResponses();
assert(corp.archives.cards.includes(wall)); assert(runner.heap.includes(chisel), 'host trash also trashes Chisel');
assert.strictEqual(c.encountering, false, 'engine ends encounter when host moves');
c.attackedServer = null; c.approachIce = -1;
assert.strictEqual(chisel.responseOnEncounter.Enumerate.call(chisel).length, 0);
const noHost = put(card(26003), runner.grip); ai.preferred = null;
assert.strictEqual(options[await ai.CommandChoice(options)], 'gain', 'no ice means no install target');
runner.grip = [];
runner.grip = []; runner.creditPool = 10; runner.clickTracker = 4;
corp.RnD.ice = []; corp.RnD.cards = []; corp.archives.cards = []; corp.HQ.cards = [];
const bottom = put({title: 'Bottom', player: corp, cardType: 'operation', subTypes: [], elo: 1400}, corp.RnD.cards);
const low = put({title: 'Low', player: corp, cardType: 'operation', subTypes: [], elo: 1200}, corp.RnD.cards);
const valuable = put({title: 'Valuable', player: corp, cardType: 'operation', subTypes: [], elo: 1900}, corp.RnD.cards);
const top = put({title: 'Top', player: corp, cardType: 'operation', subTypes: [], elo: 1500}, corp.RnD.cards);
const stargate = put(card(26004), runner.grip);
ai.preferred = null; options = ['gain', 'run', 'install'];
assert.strictEqual(options[await ai.CommandChoice(options)], 'install', 'real selector installs Stargate before R&D run');
assert.strictEqual(ai.preferred.cardToInstall, stargate);
c.MoveCard(stargate, runner.rig.programs);
ai.preferred = null; options = ['gain', 'run', 'trigger'];
assert.strictEqual(options[await ai.CommandChoice(options)], 'trigger', 'real run selector uses Stargate on R&D');
assert.strictEqual(ai.preferred.cardToTrigger, stargate);
assert.strictEqual(ai.preferred.nextPrefs.chooseServer, corp.RnD);
ai.preferred = null;
stargate.abilities[0].Resolve.call(stargate); flushResponses();
assert.strictEqual(c.attackedServer, corp.RnD); assert.strictEqual(runner.clickTracker, 3);
assert.strictEqual(stargate.abilities[0].Enumerate.call(stargate).length, 0, 'once per turn');
c.AutomaticTriggers('automaticOnRunSuccessful', [corp.RnD]);
c.currentPhase = {identifier: 'Run 5.4', player: runner, triggerCallbackName: 'responseOnRunSuccessful',
  triggerList: [], triggerEnumerateParams: []};
let replacements = c.phaseTemplates.globalTriggers.Enumerate.n();
assert.strictEqual(replacements.length, 1, 'mandatory replacement removes ordinary breach');
assert.strictEqual(replacements[0].card, stargate);
c.phaseTemplates.globalTriggers.Resolve.n(replacements[0]);
decisions.shift().choose({required: true});
for (let i = 0; i < 3; i++) {
  const reveal = decisions.shift();
  assert(reveal.title.startsWith('Revealing ')); reveal.choose({});
}
let trashDecision = decisions.shift();
assert.strictEqual(trashDecision.choices.length, 3);
assert(!trashDecision.choices.some(x => x.card === bottom));
assert.strictEqual(trashDecision.choices[0].card, top, 'R&D top is the end of its array');
c.currentPhase = {identifier: 'Run 6.4', title: trashDecision.title};
const targetIndex = await ai.SelectChoice(trashDecision.choices);
assert.strictEqual(trashDecision.choices[targetIndex].card, valuable, 'real select consumer chooses useful revealed trash');
trashDecision.choose(trashDecision.choices[targetIndex]); flushResponses();
assert(corp.archives.cards.includes(valuable)); assert.strictEqual(valuable.faceUp, true);
assert.strictEqual(corp.RnD.cards[corp.RnD.cards.length - 1], top, 'untrashed cards retain order');
assert(!top.faceUp && !low.faceUp, 'remaining cards turn facedown');
assert(top.knownToRunner && low.knownToRunner, 'revealed information is retained');
c.AutomaticTriggers('responseOnRunEnds');
assert(!stargate.runningWithThis && !stargate.breachReplacementQueued);
c.attackedServer = null; c.currentPhase = c.phases.runnerActionMain;
stargate.responseOnRunnerTurnBegins.Resolve.call(stargate);
assert.strictEqual(stargate.abilities[0].Enumerate.call(stargate).length, 1, 'new turn refreshes ability');
runner.clickTracker = 0;
assert.strictEqual(stargate.abilities[0].Enumerate.call(stargate).length, 0, 'requires action click');
runner.clickTracker = 4; c.currentPhase = c.phases.runDecideContinue;
assert.strictEqual(stargate.abilities[0].Enumerate.call(stargate).length, 0, 'not a mid-run paid ability');
// Trashing the program does not cancel its already-created run effect.
c.MoveCard(stargate, runner.heap); stargate.runningWithThis = true;
c.AutomaticTriggers('automaticOnRunSuccessful', [corp.RnD]);
assert(stargate.breachReplacementQueued);
assert(c.ChoicesActiveTriggers('specialOnInsteadOfBreaching', runner).some(x => x.card === stargate));
stargate.responseOnRunEnds.Resolve.call(stargate);
assert.strictEqual(stargate.specialOnInsteadOfBreaching.Enumerate.call(stargate).length, 0, 'failed run cannot leak replacement');
stargate.runningWithThis = true;
c.AutomaticTriggers('automaticOnRunSuccessful', [corp.HQ]);
assert.strictEqual(stargate.specialOnInsteadOfBreaching.Enumerate.call(stargate).length, 0, 'redirected success on HQ does not replace R&D breach');
corp.RnD.cards = []; stargate.specialOnInsteadOfBreaching.Resolve.call(stargate);
assert.strictEqual(decisions.length, 0, 'empty R&D resolves without an impossible choice');
// Short R&D and prevented trash restore visibility without reordering cards.
for (const count of [1, 2]) {
  corp.RnD.cards = [];
  const short = Array.from({length: count}, (_, i) => put({title: 'Short '+i, player: corp,
    cardType: 'operation', subTypes: [], elo: 1300 + i}, corp.RnD.cards));
  stargate.specialOnInsteadOfBreaching.Resolve.call(stargate);
  for (let i = 0; i < count; i++) decisions.shift().choose({});
  const d = decisions.shift(); assert.strictEqual(d.choices.length, count);
  c.OpportunityForAvoidPrevent = (player, name, params, after) => {c.intended.trash = []; after();};
  d.choose(d.choices[0]); flushResponses();
  assert.deepStrictEqual(corp.RnD.cards, short);
  assert(short.every(item => !item.faceUp), 'prevented trash restores every card');
}
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
c.currentPhase = c.phases.runnerActionMain; runner.clickTracker = 4;
c.MoveCard(stargate, runner.rig.programs); stargate.usedThisTurn = true;
ai.preferred = null;
options = ['gain', 'run', 'trigger'];
assert.notStrictEqual(options[await ai.CommandChoice(options)], 'trigger', 'spent Stargate cannot be selected');
stargate.usedThisTurn = false;
// Public successful-run suppression prevents the AI wasting the activation.
const suppression = put({title: 'Suppress success', player: corp, cardType: 'upgrade', subTypes: [],
  rezzed: true, AIPreventsSuccessfulRun: server => server === corp.RnD}, corp.RnD.root);
ai.preferred = null;
assert.notStrictEqual(options[await ai.CommandChoice(options)], 'trigger', 'no Stargate benefit through successful-run suppression');
corp.RnD.root = [];
// Chisel neither invents hidden ICE stats nor reduces protected ICE strength.
wall.cardLocation = corp.RnD.ice; corp.RnD.ice = [wall]; wall.cardLocation = corp.RnD.ice;
wall.hostedCards = [chisel]; chisel.host = wall; chisel.cardLocation = wall.hostedCards; chisel.virus = 1;
wall.rezzed = false; wall.knownToRunner = false; chisel.encounterResolved = false;
const unknown = rc.IceAI(wall, 20);
assert(unknown.sr.length > 0, 'hidden synthetic zero strength cannot trigger predicted trash');
wall.rezzed = true; wall.strengthCannotBeLowered = true;
assert.strictEqual(c.Strength(wall), 2);
assert.strictEqual(rc.IceAI(wall, 20).strength, 2);
wall.strengthCannotBeLowered = false;
chisel.virus = 0;
assert.strictEqual(c.Strength(wall), 2, 'purge restores host strength');
assert.strictEqual(rc.IceAI(wall, 20).strength, 1, 'next encounter only receives its own counter');
console.log('Downfall integration: batch 1 mechanics and baseline AI passed');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
