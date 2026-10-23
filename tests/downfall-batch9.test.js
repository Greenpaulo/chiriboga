'use strict';
// Downfall batch 9: damage, reveal, trash attribution, Psi and repeat-ICE decisions.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/downfall.js', 'sets/elevation.js'])
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
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice, corp.archives.ice,
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
async function main() {
// Sting uses the other player's score area and only triggers for itself.
reset(); grip(10);
const sting = put(card(26041), corp.scoreArea);
put(card(26041), runner.scoreArea); put(card(26041), runner.scoreArea);
c.intended.score = sting;
assert.strictEqual(sting.responseOnScored.Enumerate.call(sting).length, 1);
sting.responseOnScored.Resolve.call(sting);
assert.strictEqual(runner.grip.length, 7);
c.intended.score = {}; assert.strictEqual(sting.responseOnScored.Enumerate.call(sting).length, 0);
c.intended.steal = sting;
sting.responseOnStolen.Resolve.call(sting);
assert.strictEqual(runner.grip.length, 5, 'two damage for one Corp-scored copy');
// Real approach and Corp breach damage evaluators include a known Sting.
reset(); grip(8);
const stingServer = remote(); const accessSting = put(card(26041), stingServer.root);
accessSting.knownToRunner = true;
put(card(26041), corp.scoreArea);
assert.strictEqual(ai._potentialDamageOnBreach(stingServer, true), 2);
const paths = runner.AI.rc.Calculate(stingServer, 3, 20, 0, 8, Infinity, false, null);
assert(paths.length); assert.strictEqual(runner.AI.rc.TotalDamage(runner.AI.rc.TotalEffect(paths.at(-1).at(-1))), 2);
// Actual scoring selector advances/scores an ordinary Sting agenda.
accessSting.advancement = 3; ai.preferred = null;
assert.strictEqual(await ai.CommandChoice(['score', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToScore, accessSting);
// Portal waits for reveal completion and notifies Hyoubu before its income.
reset(); const portalServer = remote(); const portal = put(card(26042), portalServer.root); portal.rezzed = true;
const top = put(card(26041), corp.RnD.cards); let reveals = 0;
const observer = {title: 'Observer', player: corp, cardType: 'identity', subTypes: [],
  automaticOnReveal: {Resolve: (card, actor) => {assert.strictEqual(card, top); assert.strictEqual(actor, corp); reveals++;}}};
const savedID = corp.identityCard; corp.identityCard = observer; c.InvalidateActiveTriggerCandidateCache();
portal.responseOnCorpTurnBegins.Resolve.call(portal);
assert.strictEqual(reveals, 1); assert.strictEqual(corp.creditPool, 10);
decisions.shift().choose({}); assert.strictEqual(corp.creditPool, 12);
assert.strictEqual(top.faceUp, false);
corp.RnD.cards.length = 0; portal.responseOnCorpTurnBegins.Resolve.call(portal);
assert.strictEqual(corp.creditPool, 14, 'do as much as possible: income still resolves with empty R&D');
corp.identityCard = savedID;
// Install and rez policy consumers have a useful economy route.
reset(); const economyPortal = put(card(26042), corp.HQ.cards); corp.creditPool = 4;
put({title: 'Unfunded ICE', player: corp, cardType: 'ice', subTypes: [], rezCost: 10, strength: 0, subroutines: []}, corp.HQ.ice);
let installOptions = c.ChoicesCardInstall(economyPortal);
let best = ai._bestInstallOption(installOptions, false);
assert(best >= 0); assert.strictEqual(installOptions[best].card, economyPortal);
c.MoveCard(economyPortal, remote().root); c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = runner; c.currentPhase = {identifier: 'Runner 2.2', title: 'Discard'};
assert.strictEqual(await ai.CommandChoice(['rez', 'n']), 0);
assert.strictEqual(ai.preferred.cardToRez, economyPortal);
// Resonator counts only the first Corp trash matching the identity faction,
// including events before rez, simultaneous trashes and damage.
reset(); const resonator = put(card(26043), remote().root); resonator.rezzed = true;
const first = put(filler('One'), runner.grip); const second = put(filler('Two'), runner.grip);
c.Trash([first, second], false, null, resonator);
assert.strictEqual(resonator.power, 1);
c.Trash(put(filler('Three'), runner.stack), false, null, resonator);
assert.strictEqual(resonator.power, 1);
c.turnEventCounts = {};
c.Trash(put(filler('Four'), runner.grip), false, null, null, null, runner);
assert.strictEqual(resonator.power, 1, 'Runner trash does not charge Resonator');
c.Trash(put(filler('Off faction', 'event', 'Criminal'), runner.grip), false, null, resonator);
assert.strictEqual(resonator.power, 1);
resonator.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
c.Trash(put(filler('Before rez'), runner.stack), false, null, resonator);
resonator.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
c.Trash(put(filler('After rez'), runner.stack), false, null, resonator);
assert.strictEqual(resonator.power, 1, 'earlier inactive matching event consumed the opportunity');
c.turnEventCounts = {}; grip(4);
c.Damage('net', 1, true, null, resonator);
assert.strictEqual(resonator.power, 2, 'Corp damage is a matching trash');
ai.preferred = null;
assert.strictEqual(await ai.CommandChoice(['trigger', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToTrigger, resonator);
const beforeGrip = runner.grip.length;
resonator.abilities[0].Resolve.call(resonator);
assert.strictEqual(runner.grip.length, beforeGrip - 1); assert.strictEqual(resonator.power, 1);
c.currentPhase = {identifier: 'Run 4.5'};
assert.strictEqual(resonator.abilities[0].Enumerate.call(resonator).length, 0);
c.currentPhase = c.phases.corpActionMain; resonator.power = 0;
assert.strictEqual(resonator.abilities[0].Enumerate.call(resonator).length, 0);
// Nested automatic effects cannot change the original trash event's ordinal.
reset(); const nestedResonator = put(card(26043), remote().root); nestedResonator.rezzed = true;
const oldCorpID = corp.identityCard;
let nested = false;
corp.identityCard = {title: 'Nested trigger', player: corp, cardType: 'identity', subTypes: [],
  automaticOnTrash: {Resolve: function () {
    if (!nested) { nested = true; c.Trash(put(filler('Nested'), runner.grip), false, null, nestedResonator); }
  }}};
c.InvalidateActiveTriggerCandidateCache();
c.Trash(put(filler('Original'), runner.grip), false, null, nestedResonator);
assert.strictEqual(nestedResonator.power, 1, 'first event stays eligible after a nested second event');
corp.identityCard = oldCorpID;
// Saisentan choices use public cards. Each subroutine can produce only one
// bonus; the bonus is separately preventable and does not recursively chain.
reset(); const saisentan = put(card(26044), corp.HQ.ice); saisentan.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true; c.encounteredIce = saisentan;
put(filler('Observed resource', 'resource'), runner.heap); grip(7);
saisentan.responseOnEncounter.Resolve.call(saisentan);
assert.strictEqual((await chooseAI(corp)).type, 'resource');
saisentan.chosenType = 'event';
saisentan.subroutines[0].Resolve.call(saisentan);
assert.strictEqual(runner.grip.length, 5, 'bonus matching card does not trigger itself');
saisentan.chosenType = 'program'; saisentan.subroutines[1].Resolve.call(saisentan);
assert.strictEqual(runner.grip.length, 4);
const prevent = c.OpportunityForAvoidPrevent;
c.OpportunityForAvoidPrevent = (player, name, params, after) => {if (name == 'responsePreventableDamage') c.intended.damage = 0; after();};
saisentan.chosenType = 'event'; saisentan.subroutines[2].Resolve.call(saisentan);
assert.strictEqual(runner.grip.length, 4, 'prevented damage cannot cause a bonus');
c.OpportunityForAvoidPrevent = prevent;
saisentan.responseOnEncounterEnds.Resolve.call(saisentan); assert.strictEqual(saisentan.chosenType, null);
const iceAI = runner.AI.rc.IceAI(saisentan, 10, false, false, 0);
assert.strictEqual(iceAI.sr.length, 3); assert.strictEqual(iceAI.sr[0][0].length, 2);
// Complete Image: play restrictions, title choice, prevention and Terminal.
reset(); grip(4);
const image = put(card(26045), corp.HQ.cards);
assert.strictEqual((c.FullCheckPlay(image) || []).length, 0);
put({title: 'Points', player: corp, cardType: 'agenda', agendaPoints: 3}, runner.scoreArea);
image.responseOnRunSuccessful.Resolve.call(image);
assert.strictEqual((c.FullCheckPlay(image) || []).length, 0, 'only runs during the Runner turn qualify');
c.playerTurn = runner; image.responseOnRunSuccessful.Resolve.call(image); c.playerTurn = corp;
assert.strictEqual(c.FullCheckPlay(image).length, 1);
runner.grip.length = 1; ai.preferred = null;
assert.strictEqual(await ai.CommandChoice(['play', 'gain']), 0);
assert.strictEqual(ai.preferred.cardToPlay, image);
corp.creditPool = 3; assert.strictEqual((c.FullCheckPlay(image) || []).length, 0); corp.creditPool = 10;
// Avoid flatline in this test by stopping the chain on the second name.
runner.grip.length = 0; put(filler('Sure Gamble'), runner.grip); put(filler('Sure Gamble'), runner.grip);
c.MoveCard(image, corp.resolvingCards);
image.Resolve(); assert.strictEqual((await chooseAI(corp)).name, 'Sure Gamble');
assert.strictEqual(runner.grip.length, 1); assert.strictEqual(decisions.length, 1);
decisions.shift().choose({name: 'Different title'});
assert.strictEqual(runner.grip.length, 0); assert.strictEqual(c.currentPhase, c.phases.corpActionPhaseEnds);
assert(corp.archives.cards.includes(image));
image.responseOnRunnerTurnBegins.Resolve.call(image); assert.strictEqual(image.successfulRunLastTurn, false);
// Psi: bids stay unpaid until both commit, equality and zero-credit options.
reset(); corp.creditPool = 2; runner.creditPool = 1; let outcome;
c.PsiGame(value => {outcome = value;});
let d = decisions.shift(); assert.strictEqual(d.choices.length, 3); d.choose(d.choices[2]);
assert.strictEqual(corp.creditPool, 2); assert.strictEqual(outcome, undefined);
d = decisions.shift(); assert.strictEqual(d.choices.length, 2); d.choose(d.choices[1]);
assert.strictEqual(outcome, true); assert.strictEqual(corp.creditPool, 0); assert.strictEqual(runner.creditPool, 0);
c.PsiGame(value => {outcome = value;});
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); d.choose(d.choices[0]);
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); d.choose(d.choices[0]); assert.strictEqual(outcome, false);
// Real bid selectors consume independently generated preferences.
reset(); corp.creditPool = 2; runner.creditPool = 2;
ai._random = () => 0.8; runner.AI._random = () => 0.1;
c.PsiGame(value => {outcome = value;});
assert.strictEqual((await chooseAI(corp)).bid, 2);
assert.strictEqual((await chooseAI(runner)).bid, 0); assert.strictEqual(outcome, true);
// Hosted funds can pay a Psi bid, but spend responses see both bids paid.
reset(); corp.creditPool = 2; runner.creditPool = 0;
const wallet = put({title: 'Psi funds', player: runner, cardType: 'resource', subTypes: [], credits: 1,
  canUseCredits: doing => doing == 'psi'}, runner.rig.resources);
const spending = put({title: 'Spend observer', player: corp, cardType: 'asset', subTypes: [], rezzed: true,
  responseOnCreditsSpent: {Resolve: function () {}}}, remote().root);
let spendEvents = 0;
const responses = c.TriggeredResponsePhase;
c.TriggeredResponsePhase = (player, name, params, after) => {
  if (name == 'responseOnCreditsSpent') {
    spendEvents++; assert.strictEqual(corp.creditPool, 0); assert.strictEqual(wallet.credits, 0);
  }
  return responses(player, name, params, after);
};
c.PsiGame(value => {outcome = value;});
decisions.shift().choose({bid: 2}); decisions.shift().choose({bid: 1});
assert.strictEqual(spendEvents, 1); assert.strictEqual(outcome, true);
c.TriggeredResponsePhase = responses;
// Letheia install and rez selectors require a protected destination.
reset(); const installLetheia = put(card(26046), corp.HQ.cards);
const protectedIce = put(card(26044), corp.HQ.ice); protectedIce.rezzed = true;
const legalInstall = c.ChoicesCardInstall(installLetheia);
const chosenInstall = ai._bestInstallOption(legalInstall, false);
assert(chosenInstall >= 0); assert.strictEqual(legalInstall[chosenInstall].server, corp.HQ);
c.MoveCard(installLetheia, corp.HQ.root); c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = runner; c.attackedServer = corp.HQ; c.approachIce = -1;
c.currentPhase = {identifier: 'Run 4.5', title: 'Before approach'};
assert.strictEqual(await ai.CommandChoice(['rez', 'n']), 0);
assert.strictEqual(ai.preferred.cardToRez, installLetheia);
// Maintenance Access redirects before approach tracking and response enumeration.
reset();
const originalLetheia = put(card(26046), corp.archives.root);
const redirectedLetheia = put(card(26046), corp.HQ.root); redirectedLetheia.rezzed = true;
const maintenance = put(card(35016), runner.resolvingCards); maintenance.runningWithThis = true;
c.AutomaticTriggers('automaticOnRunBegins');
c.attackedServer = corp.archives; c.approachIce = 0; c.playerTurn = runner;
c.currentPhase = c.phases.runApproachServer;
c.currentPhase.Init();
assert.strictEqual(c.attackedServer, corp.HQ);
assert.strictEqual(c.approachIce, -1);
assert.strictEqual(originalLetheia.approachedThisRun, false, 'redirected-away server was never approached');
assert.strictEqual(redirectedLetheia.firstApproach, true, 'destination gets its first approach');
c.GlobalTriggersPhaseCommonResolveN(false); // Runner passes; Corp approach triggers are built.
assert(c.currentPhase.Enumerate.trigger().some(option => option.card === redirectedLetheia),
  'redirect destination offers the Letheia Psi response');
c.MoveCard(originalLetheia, corp.archives.cards);
c.MoveCard(redirectedLetheia, corp.HQ.cards);
c.MoveCard(maintenance, runner.heap);
// Letheia: first approach only (including inactive tracking), optional trash,
// same-run movement, legal target, real Corp preference and Runner continuation.
reset(); grip(10); runner.creditPool = 20;
const home = remote(); const letheia = put(card(26046), home.root); letheia.rezzed = true;
const toll = put({title: 'Toll', player: corp, cardType: 'ice', subTypes: ['Barrier'], strength: 0, rezCost: 0,
  rezzed: true, subroutines: [{text: 'Pay 1 credit'}],
  AIImplementIce: (rc, result) => {result.sr = [[['payCredits']]]; return result;}}, home.ice);
c.attackedServer = home; c.approachIce = -1; c.playerTurn = runner;
c.currentPhase = c.phases.runApproachServer;
c.AutomaticTriggers('automaticOnApproachServer', [home]);
assert.strictEqual(letheia.responseOnApproachServer.Enumerate.call(letheia).length, 1);
letheia.responseOnApproachServer.Resolve.call(letheia);
decisions.shift().choose({bid: 1}); decisions.shift().choose({bid: 0});
assert.strictEqual((await chooseAI(corp)).use, true);
assert(corp.archives.cards.includes(letheia)); assert.strictEqual(c.approachIce, 0);
assert.strictEqual((await chooseAI(runner)).jack, false);
assert.strictEqual(c.currentPhase, c.phases.runApproachIce);
letheia.rezzed = false; c.MoveCard(letheia, home.root); c.InvalidateActiveTriggerCandidateCache();
letheia.automaticOnRunBegins.Resolve.call(letheia);
c.AutomaticTriggers('automaticOnApproachServer', [home]);
letheia.rezzed = true; c.AutomaticTriggers('automaticOnApproachServer', [home]);
assert.strictEqual(letheia.responseOnApproachServer.Enumerate.call(letheia).length, 0);
// Model one possible retry with cumulative run resources and no new click.
letheia.automaticOnRunBegins.Resolve.call(letheia); c.attackedServer = null;
const rc = runner.AI.rc; rc.suppressOutput = true;
let routes = rc.Calculate(home, 1, 20, 0, 10, Infinity, false, null);
assert(routes.length); let endpoint = routes.at(-1).at(-1);
assert.strictEqual(endpoint.runner_credits_spent, 4, 'two traversal payments plus one upgrade trash cost');
assert.strictEqual(endpoint.runner_clicks_spent, 0, 'retry does not consume a run click');
assert.strictEqual(endpoint.persistents.filter(p => p.action == 'repeatIce').length, 1);
letheia.approachedThisRun = true;
routes = rc.Calculate(home, 1, 20, 0, 10, Infinity, false, null);
assert.strictEqual(routes.at(-1).at(-1).runner_credits_spent, 3, 'used defence cannot force a second repeat');
letheia.approachedThisRun = false;
const security = ai._evaluateServerSecurity(home);
assert(security.reasons.some(reason => reason.includes('finite Psi repeat')));
assert.strictEqual(security.hasHardLockout, false, 'Psi cannot establish a guaranteed lockout');
// The retry spends finite Runner resources from the same run: no new
// temporary credits, entry payments or counters are created.
letheia.approachedThisRun = false; home.root.splice(home.root.indexOf(letheia), 1);
// Remove the optional trash budget to isolate a two-credit traversal tax.
letheia.trashCost = 0; home.root.push(letheia);
assert.strictEqual(rc.Calculate(home, 1, 1, 0, 10, Infinity, false, null).length, 0);
assert(rc.Calculate(home, 1, 1, 1, 10, Infinity, false, null).length > 0);
// Real human mandatory encounter choice supplies all printed subroutines.
assert.strictEqual(saisentan.subroutines.length, 3);
console.log('Downfall batch 9 tests passed');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
