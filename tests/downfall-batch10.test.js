'use strict';
// Downfall batch 10: agenda counters, run economy and revealing trap ICE.
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
async function main() {
// Scoring responds only to this agenda, and never to a steal.
reset(); grip(8);
const edition = put(card(26047), remote().root); edition.advancement = 4;
watched.add('responseOnScored');
c.Score(edition);
const scored = takeResponse('responseOnScored'); fire('responseOnScored'); scored.after();
watched.delete('responseOnScored');
assert(corp.scoreArea.includes(edition), 'real Score moves the agenda before its response');
assert.strictEqual(edition.agenda, 1);
c.intended.score = {}; fire('responseOnScored');
assert.strictEqual(edition.agenda, 1);
const server = remote(); const target = put(card(26047), server.root); target.advancement = 3; target.canBeAdvanced = true;
const installedRunner = put(program('Runner target', []), runner.rig.programs);
withAI(corp, null, () => {
  const targets = edition.abilities[0].Enumerate.call(edition);
  assert(targets.some(option => option.card == installedRunner), 'human may place on any installed card');
  assert(!targets.some(option => option.card == edition), 'scored cards are not installed');
});
const countersBefore = edition.agenda;
corp.creditPool = 0; corp.clickTracker = 0;
assert.strictEqual(ai._potentialAdvancement(target, 4, true), 1, 'scored counter funds the last advancement');
assert.strictEqual(edition.agenda, countersBefore, 'planner is read-only');
assert.strictEqual(await ai.CommandChoice(['trigger', 'n']), 0);
assert.strictEqual(ai.preferred.cardToTrigger, edition);
const triggers = c.ChoicesTriggerableAbilities(corp);
c.executingCommand = 'trigger';
assert.strictEqual(triggers[await ai.SelectChoice(triggers)].card, edition);
c.executingCommand = '';
const targetOptions = edition.abilities[0].Enumerate.call(edition);
assert.strictEqual(targetOptions.length, 1); assert.strictEqual(targetOptions[0].card, target);
edition.abilities[0].Resolve.call(edition, targetOptions[0]);
assert.strictEqual(target.advancement, 4); assert.strictEqual(edition.agenda, 0);
assert.strictEqual(edition.abilities[0].Enumerate.call(edition).length, 0);
assert.strictEqual(ai._potentialAdvancement(target, 8, true), 0, 'counter cannot be spent twice');
target.advancement = 1; edition.agenda = 1;
assert.strictEqual(edition.abilities[0].Enumerate.call(edition).length, 0, 'cannot finish with the available resources');
corp.clickTracker = 2; corp.creditPool = 2;
assert.strictEqual(edition.abilities[0].Enumerate.call(edition)[0].card, target);
c.playerTurn = runner; assert.strictEqual(edition.abilities[0].Enumerate.call(edition).length, 0);
// Neither the new planner nor ability can consume an agenda in the Runner score area.
c.MoveCard(edition, runner.scoreArea);
assert.strictEqual(ai._potentialAdvancement(target, 8, true), 2);

// Both economy assets use the real legal install and rez selectors.
for (const id of [26048, 26049]) {
  reset(); grip(8); corp.creditPool = 1;
  put({title: 'Unfunded ICE', player: corp, cardType: 'ice', subTypes: [], rezCost: 10, strength: 0, subroutines: []}, corp.HQ.ice);
  const asset = put(card(id), corp.HQ.cards);
  const legal = c.ChoicesCardInstall(asset);
  const best = ai._bestInstallOption(legal, false);
  assert(best >= 0, asset.title + ' has a useful install');
  assert.strictEqual(legal[best].card, asset);
  const home = remote(); c.MoveCard(asset, home.root);
  assert.strictEqual(await ai.CommandChoice(['rez', 'n']), 0);
  assert.strictEqual(ai.preferred.cardToRez, asset);
  if (id == 26048) {
    corp.creditPool = 0; ai.preferred = null;
    assert(!c.FullCheckRez(asset, ['asset']), 'cannot afford Daily Quest');
    corp.creditPool = 1; c.playerTurn = runner; c.currentPhase = {identifier: "Runner 2.2", title: "Discard"};
    assert(!c.FullCheckRez(asset, ['asset']), 'Daily Quest cannot rez outside Corp action phase');
  } else {
    asset.usedThisTurn = true; ai.preferred = null;
    await ai.CommandChoice(['rez', 'n']);
    assert(!ai.preferred || ai.preferred.cardToRez != asset, 'expired first run does not justify a rez');
  }
}
// Daily Quest remembers runs before installation and while unrezzed; reward and
// income are distinct, and neither an unsuccessful run nor another server blocks income.
reset(); runner.creditPool = 5; const home = remote(), other = remote();
const daily = put(card(26048), corp.HQ.cards);
c.playerTurn = runner; c.AutomaticTriggers('automaticOnRunnerTurnBegins');
c.AutomaticTriggers('automaticOnRunSuccessful', [home]);
c.MoveCard(daily, home.root);
c.playerTurn = corp; c.currentPhase = c.phases.corpActionStart;
assert(c.FullCheckRez(daily, ['asset']), 'start of action phase is legal');
c.currentPhase = c.phases.corpPostAction;
assert(c.FullCheckRez(daily, ['asset']), 'post-action window is still in action phase');
daily.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
let money = corp.creditPool; fire('responseOnCorpTurnBegins');
assert.strictEqual(corp.creditPool, money, 'successful run before installation blocks income');
c.playerTurn = runner; c.AutomaticTriggers('automaticOnRunnerTurnBegins');
c.attackedServer = other; fire('responseOnRunSuccessful');
assert.strictEqual(runner.creditPool, 5);
c.attackedServer = home;
let runnerMoney = runner.creditPool; fire('responseOnRunSuccessful'); fire('responseOnRunSuccessful');
assert.strictEqual(runner.creditPool, runnerMoney + 4, 'reward on every success');
c.AutomaticTriggers('automaticOnRunSuccessful', [home]);
c.playerTurn = corp; fire('responseOnCorpTurnBegins'); assert.strictEqual(corp.creditPool, money);
c.playerTurn = runner; c.AutomaticTriggers('automaticOnRunnerTurnBegins');
c.AutomaticTriggers('automaticOnRunBegins', [home]); // unsuccessful does not count
c.AutomaticTriggers('automaticOnRunSuccessful', [other]);
c.playerTurn = corp; fire('responseOnCorpTurnBegins'); assert.strictEqual(corp.creditPool, money + 3);
daily.rezzed = false; c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = runner; c.AutomaticTriggers('automaticOnRunnerTurnBegins');
c.AutomaticTriggers('automaticOnRunSuccessful', [home]);
runnerMoney = runner.creditPool; fire('responseOnRunSuccessful');
assert.strictEqual(runner.creditPool, runnerMoney, 'unrezzed Quest does not pay Runner');
daily.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = corp; money = corp.creditPool; fire('responseOnCorpTurnBegins');
assert.strictEqual(corp.creditPool, money, 'unrezzed success still blocks income');

// First occurrence counts while inactive, resets on either turn, and pays once per copy.
reset(); const tier = put(card(26049), corp.HQ.cards);
c.AutomaticTriggers('automaticOnRunnerTurnBegins'); c.AutomaticTriggers('automaticOnRunBegins', [corp.HQ]);
assert(tier.usedThisTurn); c.MoveCard(tier, remote().root); tier.rezzed = true;
c.InvalidateActiveTriggerCandidateCache(); money = corp.creditPool;
c.AutomaticTriggers('automaticOnRunBegins', [corp.HQ]); assert.strictEqual(corp.creditPool, money);
c.AutomaticTriggers('automaticOnCorpTurnBegins'); c.AutomaticTriggers('automaticOnRunBegins', [corp.HQ]);
c.AutomaticTriggers('automaticOnRunBegins', [corp.HQ]); assert.strictEqual(corp.creditPool, money + 1);
c.AutomaticTriggers('automaticOnRunnerTurnBegins'); c.AutomaticTriggers('automaticOnRunBegins', [corp.HQ]);
assert.strictEqual(corp.creditPool, money + 2);

// ICE installation and approached-ICE rez go through the actual Corp consumer.
for (const id of [26050, 26051]) {
  reset(); grip(8); const ice = put(card(id), corp.HQ.cards);
  const legal = c.ChoicesCardInstall(ice), best = ai._bestInstallOption(legal, false);
  assert(best >= 0, ice.title + ' can be installed');
  c.MoveCard(ice, corp.HQ.ice); put(card(26047), corp.HQ.cards); c.attackedServer = corp.HQ; c.approachIce = 0;
  c.playerTurn = runner; c.currentPhase = c.phases.runApproachIce;
  assert.strictEqual(await ai.CommandChoice(['rez', 'n']), 0, ice.title + ' is rezzed on approach');
  assert.strictEqual(ai.preferred.cardToRez, ice);
}
// Congratulations: pass income also applies to broken/bypassed ICE; subroutine
// grants exactly 2/1 credits. The calculator permits using that credit only afterwards.
reset(); grip(8); const congratulations = put(card(26050), corp.HQ.ice); congratulations.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0;
money = corp.creditPool; runnerMoney = runner.creditPool;
congratulations.subroutines[0].Resolve.call(congratulations);
assert.strictEqual(corp.creditPool, money + 2); assert.strictEqual(runner.creditPool, runnerMoney + 1);
fire('responseOnPassesIce'); assert.strictEqual(corp.creditPool, money + 3);
c.approachIce = -1; fire('responseOnPassesIce'); assert.strictEqual(corp.creditPool, money + 3);
const tax = put({title: 'Tax', player: corp, rezzed: true, cardType: 'ice', subTypes: ['Barrier'], strength: 0,
  rezCost: 0, subroutines: [{text: 'Pay 1 credit'}],
  AIImplementIce(rc, result) {result.sr = [[['payCredits']]]; return result;}}, corp.RnD.ice);
c.MoveCard(congratulations, corp.RnD.ice); c.attackedServer = null; runner.creditPool = 0;
const rc = runner.AI.rc; rc.suppressOutput = true;
let paths = rc.Calculate(corp.RnD, 3, 0, 0, 8, Infinity, false, null);
assert(paths.length, 'Congratulations credit pays the inner tax');
let last = paths[0][paths[0].length - 1];
assert.strictEqual(last.runner_credits_lost, -1); assert.strictEqual(last.runner_credits_spent, 1);
assert.strictEqual(rc.TotalEffect(last).misc_minor, 3, 'two credits plus passing income');
congratulations.subroutines = congratulations.subroutines.map(sub => Object.assign({}, sub, {broken: true}));
paths = rc.Calculate(corp.RnD, 3, 0, 0, 8, Infinity, false, null);
assert.strictEqual(paths.length, 0, 'broken income cannot fund inner tax');
c.MoveCard(congratulations, corp.HQ.ice); c.MoveCard(tax, corp.HQ.ice);
congratulations.subroutines[0].broken = false;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 0, 0, 8, Infinity, false, null).length, 0, 'later gain cannot pay earlier tax');
assert.deepStrictEqual(Array.from(ai._requiredSubroutineIndices(congratulations)), [], 'income is not a dangerous subroutine');

// Loot Box: mandatory tax/end choice, correct payer and actual Runner preference.
reset(); grip(8); const loot = put(card(26051), corp.HQ.ice); loot.rezzed = true;
c.playerTurn = runner; c.attackedServer = corp.HQ; c.approachIce = 0;
runner.creditPool = 2; runner.AI.cachedComplete = true; runner.AI.cachedBestPath = [];
loot.subroutines[0].Resolve.call(loot);
assert.strictEqual((await chooseAI(runner)).id, 1); assert.strictEqual(runner.creditPool, 0);
let ends = 0; const realETR = c.EndTheRun; c.EndTheRun = () => {ends++;};
loot.subroutines[0].Resolve.call(loot);
assert.strictEqual(decisions[0].choices.length, 1); await chooseAI(runner); assert.strictEqual(ends, 1);
c.EndTheRun = realETR;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 1, 0, 8, Infinity, false, null).length, 0);
paths = rc.Calculate(corp.HQ, 3, 1, 1, 8, Infinity, false, null);
assert(paths.length, 'run credits may pay the two-credit tax');
last = paths[0][paths[0].length - 1]; assert.strictEqual(last.runner_credits_spent, 2);
assert(!rc.TotalEffect(last).trashProgram, 'Loot Box does not trash programs');
// If Letheia sends the Runner back through the ICE, a resolved Loot Box is gone.
const retry = put(card(26046), corp.HQ.root); retry.rezzed = true; retry.trashCost = 0;
retry.approachedThisRun = false; c.attackedServer = null;
paths = rc.Calculate(corp.HQ, 1, 2, 0, 8, Infinity, false, null);
assert(paths.length, 'self-trash prevents charging the same Loot Box twice');
last = paths[0][paths[0].length - 1];
assert.strictEqual(last.runner_credits_spent, 2);
assert(last.persistents.some(p => p.action == 'trashedIce' && p.card == loot));
assert(last.persistents.some(p => p.action == 'repeatIce'));
assert(corp.HQ.ice.includes(loot), 'hypothetical trash does not mutate the board');
// Sequential Reveal calls expose each card before Corp chooses. The printed
// cost, unaffected by install modifiers, is Corp income. The stack is shuffled.
reset(); grip(8); const box = put(card(26051), corp.HQ.ice); box.rezzed = true;
const low = put(Object.assign(filler('Low'), {playCost: 0}), runner.stack);
const high = put(Object.assign(program('High', []), {installCost: 7}), runner.stack);
const middle = put(Object.assign(filler('Middle'), {playCost: 2}), runner.stack);
let reveals = [];
const witness = put({title: 'Reveal witness', player: corp, cardType: 'asset', rezzed: true,
  automaticOnReveal: {Resolve(item, actor) {reveals.push({item, actor});}}}, remote().root);
const realShuffle = c.Shuffle; let shuffled = null;
c.Shuffle = zone => {shuffled = zone; realShuffle(zone);};
money = corp.creditPool; runnerMoney = runner.creditPool;
box.subroutines[1].Resolve.call(box);
for (let i = 0; i < 3; i++) {
  const reveal = decisions.shift(); assert(reveal.title.startsWith('Revealing ')); reveal.choose({});
}
assert.strictEqual(reveals.length, 3); assert(reveals.every(event => event.actor == corp));
assert.strictEqual(decisions[0].player, corp);
assert.strictEqual((await chooseAI(corp)).card, high);
assert(runner.grip.includes(high)); assert.strictEqual(corp.creditPool, money + 7);
assert.strictEqual(runner.creditPool, runnerMoney);
assert.strictEqual(shuffled, runner.stack); assert(corp.archives.cards.includes(box));
assert.strictEqual(runner.stack.length, 2);
c.Shuffle = realShuffle;
// Empty/small stacks still shuffle and trash; a missing printed cost is zero.
for (const count of [0, 1, 2]) {
  reset(); const small = put(card(26051), corp.HQ.ice); small.rezzed = true;
  for (let i = 0; i < count; i++) put(filler('No printed cost'), runner.stack);
  small.subroutines[1].Resolve.call(small);
  for (let i = 0; i < count; i++) decisions.shift().choose({});
  if (count) await chooseAI(corp);
  assert(corp.archives.cards.includes(small)); assert.strictEqual(runner.stack.length, Math.max(0, count - 1));
}
// Adding a card to grip is real damage capacity, capped by the public stack size.
reset(); runner.grip.length = 0; runner.creditPool = 4;
const damageIce = put({title: 'One damage', player: corp, cardType: 'ice', rezzed: true,
  subTypes: [], strength: 0, rezCost: 0, subroutines: [{text: 'Do 1 net damage.'}],
  AIImplementIce(rc, result) {result.sr = [[['netDamage']]]; return result;}}, corp.HQ.ice);
const gift = put(card(26051), corp.HQ.ice); gift.rezzed = true;
put(filler('Only stack card'), runner.stack);
paths = rc.Calculate(corp.HQ, 2, 2, 0, 0, Infinity, false, null);
assert(paths.length, 'Loot Box gift absorbs later damage');
assert.strictEqual(rc.TotalEffect(paths[0].at(-1)).gainGripCard, 1);
runner.stack.length = 0;
assert.strictEqual(rc.Calculate(corp.HQ, 2, 2, 0, 0, Infinity, false, null).length, 0, 'empty stack grants no damage capacity');
put(filler('Only stack card'), runner.stack);
const secondGift = put(card(26051), corp.HQ.ice); secondGift.rezzed = true;
damageIce.AIImplementIce = (rc, result) => {result.sr = [[['netDamage', 'netDamage']]]; return result;};
assert.strictEqual(rc.Calculate(corp.HQ, 2, 4, 0, 0, Infinity, false, null).length, 0, 'two Loot Boxes cannot grant two cards from a one-card stack');
// Public Corp reward hooks feed the real Runner run selector, only while active.
reset(); grip(5); runner.creditPool = 5; runner.clickTracker = 4;
c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runnerActionMain;
const rewardServer = remote(); const reward = put(card(26048), rewardServer.root);
runner.AI._random = () => 0.5;
runner.AI.rc.Print = () => {}; runner.AI.rc.suppressOutput = true;
await runner.AI.CommandChoice(['run', 'gain']);
const unrezzedPotential = runner.AI._getCachedPotential(rewardServer);
reward.rezzed = true; c.InvalidateActiveTriggerCandidateCache(); runner.AI.preferred = null;
await runner.AI.CommandChoice(['run', 'gain']);
const rewardedPotential = runner.AI._getCachedPotential(rewardServer);
// Unrezzed asset curiosity is worth 1; the visible reward is worth 1.5.
assert(rewardedPotential > unrezzedPotential, 'real run valuation includes the visible reward and denied income');
console.log('Downfall batch 10: mechanics, resource guards, cleanup and real AI consumers passed.');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
