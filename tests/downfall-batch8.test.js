const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
async function main() {
const corp = {creditPool: 6, clickTracker: 3, badPublicity: 0, remoteServers: [], scoreArea: [],
  HQ: {cards: [], root: [], ice: []}, RnD: {cards: [], root: [], ice: []}, archives: {cards: [], root: [], ice: []}};
const runner = {creditPool: 6, clickTracker: 4, temporaryCredits: 0, grip: [], stack: [], heap: [],
  rig: {programs: [], hardware: [], resources: []}, scoreArea: []};
const c = {console, corp, runner, cardSet: [], setIdentifiers: [], playerTurn: corp, activePlayer: corp,
  attackedServer: null, approachIce: -1, encountering: false, accessingCard: null,
  currentPhase: {identifier: 'Corp 2.2'}, Log: () => {}, GetTitle: card => card.title,
  CheckCardType: (card, types) => types.includes(card.cardType),
  CheckSubType: (card, type) => (card.subTypes || []).includes(type),
  GainCredits: (player, amount, temporary, source, callback) => {player.creditPool += amount; if (callback) callback();},
};
vm.createContext(c);
function load(file) {vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});}
load('sets/downfall.js');
let decisions = [], afterDraw;
c.DecisionPhase = (player, choices, callback, title, instruction, context, command) => {
  const decision = {player, choices, title, command, choose: choice => callback.call(context, choice)};
  decisions.push(decision); return decision;
};
c.Draw = (player, count, callback) => {afterDraw = callback;};
const fully = c.cardSet[26036];
fully.Resolve();
decisions.pop().choose({id: 'draw'});
assert.strictEqual(decisions.length, 0, 'draw responses finish before prompting again');
corp.remoteServers.push({root: [{}], ice: [{}]});
afterDraw();
corp.remoteServers.push({root: [{}], ice: [{}]});
decisions.pop().choose({id: 'credits'});
assert.strictEqual(decisions.length, 0, 'repeat count locks after the initial effect');
assert.strictEqual(corp.creditPool, 8);
corp.AI = {};
fully.Resolve();
assert.strictEqual(corp.AI.preferred.option.id, 'credits');
decisions = []; corp.AI = null;
// Red Level Clearance never repeats a mode or overtakes a draw/install response.
const red = c.cardSet[26037];
c.GainClicks = (player, amount) => {player.clickTracker += amount;};
red.Resolve();
decisions.pop().choose({id: 'draw'});
assert.strictEqual(decisions.length, 0);
afterDraw();
assert(!decisions[0].choices.some(choice => choice.id === 'draw'));
decisions.pop().choose({id: 'click'});
assert.strictEqual(corp.clickTracker, 4);
let installDone;
c.ChoicesHandInstall = (player, ignore, filter) => {
  assert.strictEqual(ignore, false); assert(!filter({cardType: 'agenda'}));
  return [{card: {cardType: 'ice'}, server: corp.HQ}];
};
c.Install = (...args) => {assert.strictEqual(args[2], false); assert.strictEqual(args[9], false); installDone = args[10];};
red.Resolve(); decisions.pop().choose({id: 'install'});
decisions.pop().choose({card: {cardType: 'ice'}, server: corp.HQ});
assert.strictEqual(decisions.length, 0);
installDone();
assert(!decisions[0].choices.some(choice => choice.id === 'install'));
decisions.pop().choose({id: 'credits'});
c.ChoicesHandInstall = () => [];
red.Resolve(); decisions.pop().choose({id: 'install'});
assert.strictEqual(decisions.length, 1, 'no-target install still allows the other mode');
decisions = [];
// Cold Site setup and reset, including action phase and bounded AI setup.
c.GetServer = card => corp.remoteServers.find(server => server.root.includes(card));
c.Counters = (card, type) => card[type] || 0;
c.AddCounters = (card, type, n) => {card[type] = (card[type] || 0) + n;};
c.RemoveCounters = (card, type, n) => {card[type] -= n;};
c.CheckActionClicks = (player, n) => c.currentPhase.identifier === 'Corp 2.2' && player.clickTracker >= n;
c.SpendClicks = (player, n) => {player.clickTracker -= n;};
const cold = c.cardSet[26038];
cold.rezzed = true;
corp.remoteServers = [{root: [cold, {cardType: 'agenda'}], ice: [{}]}];
assert.strictEqual(cold.abilities[0].Enumerate.call(cold).length, 1);
cold.abilities[0].Resolve.call(cold);
assert.strictEqual(cold.power, 1);
assert.strictEqual(cold.modifyRunClickCost.Resolve.call(cold, corp.remoteServers[0]), 1);
assert.strictEqual(cold.modifyRunCreditCost.Resolve.call(cold, corp.HQ), 0);
c.currentPhase.identifier = 'Runner 1.3';
assert.strictEqual(cold.abilities[0].Enumerate.call(cold).length, 0);
cold.automaticOnCorpTurnBegins.Resolve.call(cold);
assert.strictEqual(cold.power, 0);
// Hyoubu choices expose no hidden data and reward only Corp reveals once per turn.
const hyoubu = c.cardSet[26039];
c.currentPhase.identifier = 'Corp 2.2';
runner.grip = [{title: 'hidden'}]; runner.stack = [{title: 'bottom'}, {title: 'top'}];
assert.strictEqual(hyoubu.abilities[0].Enumerate.call(hyoubu).length, 2);
let revealed;
c.Reveal = (card, callback, context, to, skip, actor) => {
  revealed = card; assert.strictEqual(actor, corp);
  hyoubu.automaticOnReveal.Resolve.call(hyoubu, card, actor); callback.call(context);
};
const beforeReveal = corp.creditPool;
hyoubu.abilities[0].Resolve.call(hyoubu, {id: 'stack'});
assert.strictEqual(revealed.title, 'top');
assert.strictEqual(corp.creditPool, beforeReveal + 1);
hyoubu.automaticOnReveal.Resolve.call(hyoubu, runner.grip[0], corp);
assert.strictEqual(corp.creditPool, beforeReveal + 1);
hyoubu.automaticOnRunnerTurnBegins.Resolve.call(hyoubu);
hyoubu.automaticOnReveal.Resolve.call(hyoubu, {}, runner);
assert.strictEqual(hyoubu.usedThisTurn, false);
hyoubu.automaticOnReveal.Resolve.call(hyoubu, {}, corp);
assert.strictEqual(corp.creditPool, beforeReveal + 2);
runner.grip = []; runner.stack = [];
assert.strictEqual(hyoubu.abilities[0].Enumerate.call(hyoubu).length, 0);
// Exercise real engine discovery, payment, movement, and AI selectors/calculator.
c.$ = () => {};
c.jQuery = {extend: (deep, target, source) => {
  function clone(value) {if (value === corp || value === runner) return value; return value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)])) : value;}
  return Object.assign(target, clone(source));
}};
for (const file of ['config.js', 'utility.js', 'checks.js', 'mechanics.js', 'phase.js', 'ai_runner.js', 'ai_corp.js', 'runcalculator.js']) load(file);
Object.assign(corp, {side: 'corp', identityCard: hyoubu, resolvingCards: [], installingCards: []});
Object.assign(runner, {side: 'runner', identityCard: {player: runner}, resolvingCards: [], installingCards: [], tags: 0});
c.ChangePhase = phase => {c.currentPhase = phase;};
c.currentPhase = {identifier: 'Corp 2.2', title: 'Corporation action phase'};
c.counterList = ['advancement', 'agenda', 'power', 'virus', 'credits']; c.lingeringEffects = []; c.removedFromGame = [];
c.executingCommand = ''; c.viewingPlayer = corp; c.intended = {}; c.globalProperties = {agendaPointsToWin: 7};
c.accessedCards = {root: [], cards: []};
c.UpdateCounters = () => {}; c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.GetTitle = card => card.title; c.MaxHandSize = () => 5;
c.PlayCreditGainSound = () => {}; c.PlaySound = () => {}; c.Render = () => {}; c.SetHistoryThumbnail = () => {};
c.PlayerCanLook = (player, card) => player === card.player || !!card.rezzed || !!card.faceUp;
c.TriggeredResponsePhase = (player, hook, args, callback) => {if (callback) callback();};
c.DecisionPhase = (player, choices, callback, title, instruction, context, command) => {
  c.currentPhase = {identifier: c.currentPhase.identifier, title};
  const decision = {player, choices, title, command, choose: choice => callback.call(context, choice)};
  decisions.push(decision); return decision;
};
c.document = {body: {classList: {add() {}}}, querySelector: () => null};
const renderer = () => ({sprite: {visible: true}, FaceUp() {}, ToggleZoom() {this.zoomed = !this.zoomed;}});
function put(card, zone) {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); return card;}
corp.remoteServers = []; corp.HQ.cards = []; corp.scoreArea = [];
const home = {serverName: 'Remote', root: [], ice: []}; corp.remoteServers.push(home);
put(cold, home.root); cold.rezzed = true; cold.power = 2;
corp.identityCard = {player: corp};
runner.creditPool = 1; runner.clickTracker = 4; c.currentPhase = {identifier: 'Runner 1.3'};
assert(!c.phases.runnerActionMain.Enumerate.run().some(choice => choice.server === home));
runner.creditPool = 2; runner.clickTracker = 2;
assert(!c.CanPayAdditionalRunCosts(home, 1));
runner.clickTracker = 3;
assert(c.CanPayAdditionalRunCosts(home, 1));
assert(c.phases.runnerActionMain.Enumerate.run().some(choice => choice.server === home));
const event = {player: runner, cardType: 'event', subTypes: ['Run'], playCost: 1,
  Enumerate: () => [{server: home}]};
c.currentPhase = {identifier: 'Runner 1.3'};
assert.strictEqual(c.FullCheckPlay(event), null, 'event and run costs must both be covered');
runner.creditPool = 3;
assert(c.FullCheckPlay(event));
// Run-event play costs can use event-only credits; run-entry costs cannot.
load('sets/systemupdate2021.js');
const laundry = put(Object.assign({}, c.cardSet[31037]), runner.grip);
const prepaid = put(Object.assign({}, c.cardSet[31038], {credits: 1}), runner.rig.hardware);
const laundryCanRun = () => (c.FullCheckPlay(laundry) || []).some(choice => choice.server === home);
cold.power = 0; runner.creditPool = 1;
assert(laundryCanRun(),
  'Prepaid VoicePAD plus one pool credit can play Dirty Laundry without a run tax');
cold.power = 2; runner.clickTracker = 3;
assert(!laundryCanRun(),
  'event-only credits cannot pay the additional run cost');
runner.creditPool = 2;
assert(!laundryCanRun(),
  'pool credits cannot be counted for both the event and the run tax');
runner.creditPool = 3;
assert(laundryCanRun(),
  'Prepaid pays one event credit, leaving two pool credits for the run tax');
runner.clickTracker = 2;
assert(!laundryCanRun(),
  'event funding does not waive the additional click cost');
runner.clickTracker = 3; prepaid.credits = 0;
assert(!laundryCanRun(),
  'an exhausted Prepaid does not contribute to the event');
prepaid.credits = 1;
prepaid.canUseCredits = () => true; runner.creditPool = 2;
assert(!laundryCanRun(),
  'hosted credits eligible for both costs cannot be counted twice either');
prepaid.canUseCredits = c.cardSet[31038].canUseCredits;
runner.creditPool = 3; runner.AI = {};
c.SpendClicks(runner, 1);
let laundryStarted = false;
c.SpendCredits(runner, 2, 'playing', laundry, () => {
  assert.strictEqual(prepaid.credits, 0);
  assert.strictEqual(runner.creditPool, 2, 'event payment leaves enough pool credits for the run');
  laundry.Resolve({server: home});
  laundryStarted = true;
});
assert(laundryStarted);
assert.strictEqual(c.attackedServer, home);
assert.strictEqual(runner.creditPool, 0, 'the additional run tax is paid separately');
assert.strictEqual(runner.clickTracker, 0);
runner.AI = null; c.attackedServer = null;
c.currentPhase = {identifier: 'Runner 1.3'}; runner.clickTracker = 3;
runner.rig.hardware = []; runner.grip = []; runner.creditPool = 3;
c.phases.runnerActionMain.Resolve.run({server: home});
assert.strictEqual(runner.clickTracker, 0, 'basic click plus both extra clicks');
assert.strictEqual(runner.creditPool, 1);
assert.strictEqual(c.attackedServer, home);
assert.strictEqual(c.MakeRun(home), false, 'cannot initiate an unaffordable effect run');
c.attackedServer = null; runner.creditPool = 0; runner.clickTracker = 0;
assert.strictEqual(c.MakeRun(home, true), true, 'explicit additional-cost waiver');
c.attackedServer = null; decisions = [];
// Reveal attribution runs through the shared function and active trigger discovery.
corp.identityCard = hyoubu; hyoubu.usedThisTurn = false;
c.activePlayer = corp; corp.creditPool = 5;
const stackTop = put({player: runner, title: 'Top card'}, runner.stack);
c.Reveal(stackTop, () => {});
assert.strictEqual(corp.creditPool, 6);
decisions.pop().choose({});
c.Reveal(stackTop, () => {}); decisions.pop().choose({});
assert.strictEqual(corp.creditPool, 6);
c.AutomaticTriggers('automaticOnRunnerTurnBegins');
const accessed = put({player: corp, title: 'Access reveal'}, corp.RnD.cards);
c.accessingCard = accessed;
c.Reveal(accessed, () => {}); decisions.pop().choose({});
assert.strictEqual(corp.creditPool, 6, 'Runner mandatory R&D reveal is not a Corp reveal');
c.accessingCard = null;
c.activePlayer = runner;
c.Reveal(stackTop, () => {}); decisions.pop().choose({});
assert.strictEqual(corp.creditPool, 6);
c.activePlayer = corp;
c.Reveal(stackTop, () => {}, null, corp, false, corp); decisions.pop().choose({});
assert.strictEqual(corp.creditPool, 7, 'Corp reveals also reward during the Runner turn');
// Real main-phase economy policy selects both operations and their legal follow-up modes.
vm.runInContext('this.ai = new CorpAI(); ai._log = function () {};', c);
const ai = c.ai; corp.AI = ai; corp.identityCard = {player: corp};
c.currentPhase = {identifier: 'Corp 2.2', title: 'Corporation action phase'};
corp.clickTracker = 3; corp.creditPool = 2; corp.RnD.cards = Array.from({length: 10}, () => ({player: corp}));
cold.rezzed = false; corp.HQ.cards = [fully]; fully.cardLocation = corp.HQ.cards;
let commands = ['play', 'gain'];
assert.strictEqual(ai._bestMainPhaseEconomyOption(commands), 0);
assert.strictEqual(ai.preferred.cardToPlay, fully);
ai.preferred = null; fully.Resolve();
let decision = decisions.pop();
decision.choose(decision.choices[await ai.SelectChoice(decision.choices)]);
assert.strictEqual(corp.creditPool, 4);
corp.HQ.cards = [red]; red.cardLocation = corp.HQ.cards; ai.preferred = null;
assert.strictEqual(ai._bestMainPhaseEconomyOption(commands), 0);
assert.strictEqual(ai.preferred.cardToPlay, red);
ai.preferred = null; red.Resolve(); decision = decisions.pop();
decision.choose(decision.choices[await ai.SelectChoice(decision.choices)]);
decision = decisions.pop();
assert.strictEqual(decision.choices[await ai.SelectChoice(decision.choices)].id, 'draw');
decisions = []; ai.preferred = null;
corp.creditPool = 0;
assert.notStrictEqual(ai._bestMainPhaseEconomyOption(commands), 0, 'unaffordable operations are held');
corp.creditPool = 8; corp.HQ.cards = [];
// Project Yagi-Uda score counters, swap legality, atomic server survival and cleanup.
const yagi = c.cardSet[26040];
c.intended.score = yagi; yagi.advancement = 5;
yagi.responseOnScored.Resolve.call(yagi);
assert.strictEqual(yagi.agenda, 2);
put(yagi, corp.scoreArea);
const threatened = put({title: 'Agenda', player: corp, cardType: 'agenda', subTypes: [], advancement: 2, agendaPoints: 2}, home.root);
const decoy = put({title: 'Decoy', player: corp, cardType: 'asset', subTypes: [], rezCost: 0, trashCost: 0}, corp.HQ.cards);
cold.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
c.attackedServer = home; c.approachIce = -1; c.currentPhase = {identifier: 'Run 4.5', title: 'Movement'};
let options = yagi.abilities[0].Enumerate.call(yagi);
assert.strictEqual(options.length, 1);
assert.strictEqual(options[0].target, threatened);
assert.strictEqual(options[0].card, decoy);
ai.preferred = null;
assert.strictEqual(await ai.CommandChoice(['trigger', 'n']), 0);
assert.strictEqual(ai.preferred.cardToTrigger, yagi);
const hosted = put({title: 'Hosted card', player: runner, cardType: 'program', subTypes: []}, threatened.hostedCards = []);
let trashFinished;
const realTrash = c.Trash;
c.Trash = (cards, preventable, callback) => {
  assert.strictEqual(cards[0], hosted); assert.strictEqual(preventable, false);
  c.MoveCard(hosted, runner.heap); trashFinished = callback;
};
yagi.abilities[0].Resolve.call(yagi, options[0]);
assert.strictEqual(yagi.agenda, 1);
assert(home.root.includes(decoy)); assert(corp.HQ.cards.includes(threatened));
assert.strictEqual(threatened.advancement, 0);
assert.strictEqual(decoy.rezzed, false);
assert.strictEqual(decisions.length, 0, 'hosted-card cleanup finishes before jack-out choice');
trashFinished();
decision = decisions.pop(); assert.strictEqual(decision.player, runner);
assert(decision.choices.some(choice => choice.id === 'jack'));
let jacked = false; c.JackOut = () => {jacked = true; c.attackedServer = null;};
decision.choose({id: 'jack'}); assert(jacked);
c.Trash = realTrash;
assert.strictEqual(yagi.abilities[0].Enumerate.call(yagi).length, 0, 'only during a run');
corp.AI = null; c.attackedServer = corp.HQ;
assert.strictEqual(yagi.abilities[0].Enumerate.call(yagi).length, 0, 'cannot swap central contents');
c.attackedServer = home;
const illegalAsset = put({title: 'Other asset', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.cards);
assert(!yagi.abilities[0].Enumerate.call(yagi).some(choice => choice.card === illegalAsset && choice.target === cold), 'cannot create two assets in a root');
// Sole-card remote swap must preserve the server; ice position and encounter end are correct.
home.root = []; home.ice = [];
const oldIce = put({title: 'Old ice', player: corp, cardType: 'ice', subTypes: ['Barrier'], strength: 1,
  rezCost: 0, rezzed: true, subroutines: []}, home.ice);
const newIce = put({title: 'New ice', player: corp, cardType: 'ice', subTypes: ['Barrier'], strength: 4,
  rezCost: 2, subroutines: []}, corp.HQ.cards);
c.approachIce = 0; c.encountering = true;
const swap = yagi.abilities[0].Enumerate.call(yagi).find(choice => choice.card === newIce);
assert(swap);
yagi.abilities[0].Resolve.call(yagi, swap);
assert(corp.remoteServers.includes(home)); assert.strictEqual(home.ice[0], newIce);
assert.strictEqual(c.approachIce, 0); assert.strictEqual(newIce.rezzed, false);
decisions.pop().choose({id: 'continue'});
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd);
assert.strictEqual(c.phases.runEncounterEnd.next, c.phases.runPassesIce);
assert.strictEqual(yagi.agenda, 0);
assert.strictEqual(yagi.abilities[0].Enumerate.call(yagi).length, 0);
c.attackedServer = null; c.encountering = false; c.approachIce = -1;
// Real run calculator charges entry once, keeps pool-only costs separate from run credits,
// and includes them even when the run does not breach.
corp.HQ.cards = []; corp.scoreArea = []; home.ice = []; home.root = [];
put(cold, home.root); cold.rezzed = true; cold.power = 2;
c.InvalidateActiveTriggerCandidateCache();
vm.runInContext('this.rc = new RunCalculator(); this.runnerBot = new RunnerAI();', c);
runner.AI = c.runnerBot; runner.AI.rc = c.rc; c.rc.suppressOutput = true;
let paths = c.rc.Calculate(home, 3, 2, 10, Infinity, Infinity, true);
assert(paths.length > 0);
let last = paths[0][paths[0].length - 1];
assert.strictEqual(last.runner_clicks_spent, 2);
assert.strictEqual(last.runner_credits_lost, 2);
assert.strictEqual(c.rc.Calculate(home, 1, 10, 0, Infinity, Infinity, true).length, 0);
assert.strictEqual(c.rc.Calculate(home, 3, 1, 10, Infinity, Infinity, true).length, 0, 'bad publicity cannot fund initiation');
c.attackedServer = home;
paths = c.rc.Calculate(home, 0, 0, 0, Infinity, Infinity, true);
assert(paths.length > 0, 'mid-run recalculation never pays entry again');
c.rc._continuationRun = true;
assert.strictEqual(c.rc.Calculate(home, 0, 0, 0, Infinity, Infinity, true).length, 0, 'a forced subsequent run pays entry again');
c.rc._continuationRun = false;
c.attackedServer = null;
c.AutomaticTriggers('automaticOnCorpTurnBegins');
assert.strictEqual(cold.power, 0);
assert(c.rc.Calculate(home, 0, 0, 0, Infinity, Infinity, true).length > 0);
runner.AI = null;
// Real main-phase discovery activates bounded useful setup after higher-priority tactics.
corp.AI = ai; corp.HQ.cards = []; corp.scoreArea = [];
home.root = [cold]; cold.cardLocation = home.root; cold.power = 0; cold.rezzed = true;
const waitingAgenda = put({title: 'Waiting agenda', player: corp, cardType: 'agenda', subTypes: [],
  advancement: 0, advancementRequirement: 5, agendaPoints: 2}, home.root);
c.currentPhase = {identifier: 'Corp 2.2', title: 'Corporation action phase'};
corp.clickTracker = 1; ai.preferred = null;
assert.strictEqual(ai.Phase_Main(['trigger', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToTrigger, cold);
cold.power = 3;
assert(!c.ChoicesTriggerableAbilities(corp).some(choice => choice.card === cold));
home.root = []; corp.identityCard = hyoubu; hyoubu.usedThisTurn = false;
runner.stack = [stackTop]; runner.grip = []; c.InvalidateActiveTriggerCandidateCache();
ai.preferred = null;
assert.strictEqual(ai.Phase_Main(['trigger', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToTrigger, hyoubu);
hyoubu.usedThisTurn = true;
assert(!c.ChoicesTriggerableAbilities(corp).some(choice => choice.card === hyoubu));

// Scored Yagi-Uda counters are not House of Knives damage in complete-run evaluation.
corp.scoreArea = [yagi]; yagi.agenda = 2; yagi.cardLocation = corp.scoreArea;
corp.identityCard = {player: corp}; corp.AI = null; home.root = []; home.ice = [];
c.attackedServer = null; runner.grip = []; runner.creditPool = 0; runner.clickTracker = 4;
runner.AI = c.runnerBot; runner.AI.rc = c.rc;
assert(c.rc.Calculate(home, 4, 0, 0, 0, 0, false).length > 0);
// Runner's real selector accepts an affordable route after a swap.
runner.creditPool = 10; runner.grip = [{}, {}, {}, {}, {}];
const rootAgenda = put({title: 'Target agenda', player: corp, cardType: 'agenda', subTypes: [],
  advancement: 0, agendaPoints: 1}, home.root);
const harmless = put({title: 'Harmless', player: corp, cardType: 'upgrade', subTypes: [], trashCost: 0}, corp.HQ.cards);
c.attackedServer = home; c.approachIce = -1; c.encountering = false;
c.currentPhase = {identifier: 'Run 4.5', title: 'Movement'};
options = yagi.abilities[0].Enumerate.call(yagi);
yagi.abilities[0].Resolve.call(yagi, options.find(choice => choice.card === harmless && choice.target === rootAgenda));
decision = decisions.pop();
assert.strictEqual(decision.choices[await runner.AI.SelectChoice(decision.choices)].id, 'continue');
decisions = [];
console.log('Downfall batch 8 tests passed');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
