'use strict';
// Downfall batch 2 (26005–26009): Utae, Climactic Showdown, Fencer Fueno,
// The Nihilist and Trickster Taka through the real engine, selectors and run calculator.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/downfall.js'])
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
vm.runInContext('runner.AI = new RunnerAI(); runner.AI._log = function () {}; runner.AI.cardsWorthKeeping = []; runner.AI.rc._log = function () {};' +
  'corp.AI = new CorpAI(); corp.AI._log = function () {};', c);
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false});
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
c.DecisionPhase = (player, choices, resolve, title, instruction, context) => {
  const d = {player, choices, title, choose: choice => resolve.call(context, choice)};
  decisions.push(d); return d;
};
c.MoveCard = (item, destination, position) => {
  if (item.cardLocation) {const i = item.cardLocation.indexOf(item); if (i >= 0) item.cardLocation.splice(i, 1);}
  if (position == null) destination.push(item); else destination.splice(position, 0, item);
  item.cardLocation = destination;
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
const withAI = (side, ai, fn) => {const saved = side.AI; side.AI = ai; try {return fn();} finally {side.AI = saved;}};
const sub = () => ({text: 'End the run.', Resolve() {}});
const codeGate = (title, strength, subs, rezCost = 3) => ({title, player: corp, cardType: 'ice', subTypes: ['Code Gate'],
  strength, rezCost, rezzed: true, subroutines: Array.from({length: subs}, sub),
  AIImplementIce(rc, result) {result.sr = this.subroutines.map(() => [['endTheRun']]); return result;}});
const virtual = title => ({title, player: runner, cardType: 'resource', subTypes: ['Virtual']});
const encounter = (server, idx) => {c.attackedServer = server; c.approachIce = idx; c.encountering = true;};

async function main() {
// --- Utae: once-per-run X break, conditional 1[c] break, pump ---
const utae = put(card(26005), runner.rig.programs);
const gate = put(codeGate('Gate', 1, 3), corp.HQ.ice);
encounter(corp.HQ, 0);
let breaks = utae.abilities[0].Enumerate.call(utae);
assert.strictEqual(breaks.length, 3, 'X break chooses among unbroken code gate subroutines');
assert.strictEqual(utae.abilities[1].Enumerate.call(utae).length, 0, '1[c] break needs 3 virtual resources');
assert.strictEqual(utae.abilities[2].Enumerate.call(utae).length, 0, 'no pump needed at equal strength');
utae.abilities[0].Resolve.call(utae, breaks[0]);
let d = decisions.shift();
assert.strictEqual(d.choices.length, 3, 'two more subroutines plus pay');
d.choose(d.choices[0]);
d = decisions.shift();
d.choose(d.choices.find(x => x.alt === 'continue'));
assert.strictEqual(runner.creditPool, 3, 'X = 2 paid once');
assert.strictEqual(gate.subroutines.map(s => !!s.broken).join(), 'true,true,false');
assert.strictEqual(utae.abilities[0].Enumerate.call(utae).length, 0, 'X break is once per run');
for (const t of ['V1', 'V2', 'V3']) put(virtual(t), runner.rig.resources);
assert.strictEqual(utae.abilities[1].Enumerate.call(utae).length, 1, '3 virtual resources unlock 1[c] break');
utae.abilities[1].Resolve.call(utae, utae.abilities[1].Enumerate.call(utae)[0]);
assert(gate.subroutines[2].broken); assert.strictEqual(runner.creditPool, 2);
// X is capped by available credits
gate.subroutines.forEach(s => {s.broken = false;});
utae.usedThisRun = false; runner.creditPool = 1;
utae.abilities[0].Resolve.call(utae, utae.abilities[0].Enumerate.call(utae)[0]);
assert.strictEqual(decisions.length, 0, 'cannot choose more subroutines than affordable');
assert.strictEqual(runner.creditPool, 0); assert.strictEqual(gate.subroutines.filter(s => s.broken).length, 1);
utae.responseOnRunEnds.Resolve.call(utae);
assert.strictEqual(utae.usedThisRun, false, 'run end resets once-per-run use');
// pump lasts for the encounter
put(codeGate('Tall gate', 3, 1), corp.RnD.ice);
gate.subroutines.forEach(s => {s.broken = false;}); runner.creditPool = 5;
encounter(corp.RnD, 0);
assert.strictEqual(utae.abilities[0].Enumerate.call(utae).length, 0, 'interface needs strength');
utae.abilities[2].Resolve.call(utae); utae.abilities[2].Resolve.call(utae);
assert.strictEqual(c.Strength(utae), 3);
utae.responseOnEncounterEnds.Resolve.call(utae);
assert.strictEqual(c.Strength(utae), 1);
c.attackedServer = null; c.encountering = false; c.approachIce = -1;
runner.rig.resources = [];
corp.RnD.ice = [];

// Run calculator: one X break clears the outer 2-sub gate, then nothing is left for the second gate
// unless the 1[c] break is unlocked.
corp.HQ.ice = []; put(codeGate('Outer', 1, 2), corp.HQ.ice); put(codeGate('Inner', 1, 2), corp.HQ.ice);
put({title: 'Unknown', player: corp, cardType: 'agenda'}, corp.HQ.cards);
runner.creditPool = 10;
const plan = () => runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0);
assert.strictEqual(plan(), null, 'X break cannot be reused on the second gate');
for (const t of ['V1', 'V2', 'V3']) put(virtual(t), runner.rig.resources);
const route = plan();
assert(route, 'virtual resources make the second gate breakable');
assert(route.every(p => p.sr_broken.every(s => s.use === utae)), 'Utae breaks every subroutine');
runner.rig.resources = [];

// --- Trickster Taka: hosted credits fund programs during runs and the run calculator ---
const taka = put(card(26009), runner.rig.resources);
taka.responseOnRunnerTurnBegins.Resolve.call(taka);
taka.responseOnStolen.Resolve.call(taka);
assert.strictEqual(taka.credits, 2);
assert.strictEqual(taka.canUseCredits('using', utae), false, 'only during runs');
c.attackedServer = corp.HQ;
assert.strictEqual(taka.canUseCredits('using', utae), true);
assert.strictEqual(taka.canUseCredits('installing', utae), false);
assert.strictEqual(taka.canUseCredits('using', taka), false, 'programs only');
c.attackedServer = null;
runner.creditPool = 2;
const realPlan = () => runner.AI._commonRunCalculationChecksAsync(corp.HQ, null, null, false);
assert.strictEqual(await realPlan(), null, 'two credits cannot break two 2-sub gates');
put(virtual('V1'), runner.rig.resources); put(virtual('V2'), runner.rig.resources);
runner.creditPool = 2;
assert(await realPlan(), 'Taka credits extend the run budget');
runner.rig.resources = [taka];
taka.credits = 2;
assert.strictEqual(taka.responseOnRunnerDiscardEnds.Enumerate.call(taka).length, 0);
taka.credits = 3; runner.creditPool = 3;
taka.responseOnRunnerDiscardEnds.Resolve.call(taka);
d = decisions.shift();
assert.strictEqual(d.choices.length, 1); assert.strictEqual(d.choices[0].tag, true, 'AI takes a tag it can clear');
c.AddTags = n => {runner.tags += n;};
d.choose(d.choices[0]); assert.strictEqual(runner.tags, 1);
taka.responseOnRunnerDiscardEnds.Resolve.call(taka);
d = decisions.shift();
assert.strictEqual(d.choices[0].tag, false, 'AI trashes rather than stacking tags');
d.choose(d.choices[0]); flushResponses();
assert(runner.heap.includes(taka));
withAI(runner, null, () => taka.responseOnRunnerDiscardEnds.Resolve.call(Object.assign(card(26009), {credits: 3})));
assert.strictEqual(decisions.shift().choices.length, 2, 'human chooses tag or trash');
runner.tags = 0;

// --- Fencer Fueno: hosted credits after a successful run ---
const fueno = put(card(26007), runner.rig.resources);
fueno.responseOnRunnerTurnBegins.Resolve.call(fueno);
fueno.responseOnStolen.Resolve.call(fueno);
fueno.responseOnRunnerTurnBegins.Resolve.call(fueno);
assert.strictEqual(fueno.credits, 3);
c.attackedServer = corp.HQ;
runner.creditPool = 0;
const asset = {title: 'Asset', player: corp, cardType: 'asset', trashCost: 3};
assert.strictEqual(c.CheckCredits(runner, 3, 'trashing', asset), false, 'not before the run is successful');
fueno.responseOnRunSuccessful.Resolve.call(fueno);
assert.strictEqual(c.CheckCredits(runner, 3, 'trashing', asset), true, 'pays trash costs after success');
fueno.responseOnRunEnds.Resolve.call(fueno);
assert.strictEqual(c.CheckCredits(runner, 1, 'trashing', asset), false, 'only for the remainder of that run');
c.attackedServer = null;
runner.creditPool = 2;
fueno.responseOnRunnerDiscardEnds.Resolve.call(fueno);
d = decisions.shift(); assert.strictEqual(d.choices[0].pay, true);
d.choose(d.choices[0]);
assert.strictEqual(runner.creditPool, 1); assert.strictEqual(fueno.credits, 3, 'pool pays, not the stash');
runner.creditPool = 0;
fueno.responseOnRunnerDiscardEnds.Resolve.call(fueno);
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); assert.strictEqual(d.choices[0].pay, false, 'broke: must trash');
d.choose(d.choices[0]); flushResponses();
assert(runner.heap.includes(fueno));

// --- The Nihilist ---
runner.rig.resources = [];
const nihilist = put(card(26008), runner.grip);
const virus = {title: 'Virus', player: runner, cardType: 'program', subTypes: ['Virus'], memoryCost: 1};
assert.strictEqual(nihilist.AIWorthKeeping.call(nihilist), false);
put(virus, runner.grip);
assert.strictEqual(nihilist.AIWorthKeeping.call(nihilist), true, 'worth keeping alongside a virus');
runner.grip.splice(runner.grip.indexOf(virus), 1);
// an earlier virus install this turn uses up the trigger even while inactive
c.ChoicesActiveTriggers('responseOnInstall').forEach(o => o.card.responseOnInstall.Resolve.call(o.card, virus));
assert.strictEqual(nihilist.virusInstalledThisTurn, true);
runner.grip.splice(runner.grip.indexOf(nihilist), 1); put(nihilist, runner.rig.resources);
nihilist.responseOnInstall.Resolve.call(nihilist, virus);
assert.strictEqual(c.Counters(nihilist, 'virus'), 0);
nihilist.responseOnRunnerDiscardEnds.Resolve.call(nihilist);
put(virus, runner.rig.programs);
nihilist.responseOnInstall.Resolve.call(nihilist, virus);
nihilist.responseOnInstall.Resolve.call(nihilist, virus);
assert.strictEqual(c.Counters(nihilist, 'virus'), 2, 'only the first virus install each turn');
c.AddCounters(virus, 'virus', 1);
assert.strictEqual(JSON.stringify(nihilist.responseOnRunnerTurnBegins.Enumerate.call(nihilist)), '[{"use":true}]', 'AI spends own counters');
for (let i = 0; i < 6; i++) put({title: 'R&D ' + i, player: corp, cardType: 'operation'}, corp.RnD.cards);
nihilist.responseOnRunnerTurnBegins.Resolve.call(nihilist, {use: true});
for (let i = 0; i < 2; i++) {d = decisions.shift(); assert.strictEqual(d.choices[0].card, nihilist); d.choose(d.choices[0]);}
assert.strictEqual(c.Counters(nihilist, 'virus'), 0); assert.strictEqual(c.Counters(virus, 'virus'), 1, 'virus program keeps its counter');
d = decisions.shift(); assert.strictEqual(d.player, corp); assert.strictEqual(d.choices[0].trash, true, 'Corp AI mills a deep R&D');
d.choose(d.choices[0]); flushResponses();
assert.strictEqual(corp.RnD.cards.length, 5);
assert.strictEqual(nihilist.responseOnRunnerTurnBegins.Enumerate.call(nihilist).length, 0, 'AI keeps program counters');
withAI(runner, null, () => {
  c.AddCounters(nihilist, 'virus', 1);
  const options = nihilist.responseOnRunnerTurnBegins.Enumerate.call(nihilist);
  assert.strictEqual(options.length, 2, 'human may decline');
  nihilist.responseOnRunnerTurnBegins.Resolve.call(nihilist, options[0]);
  for (let i = 0; i < 2; i++) {d = decisions.shift(); assert.strictEqual(d.choices.length, 2 - i); d.choose(d.choices[0]);}
});
assert.strictEqual(c.Counters(virus, 'virus'), 0, 'human may spend program counters');
let drawn = 0; c.Draw = (p, n) => {drawn += n;};
d = decisions.shift(); assert.strictEqual(d.choices.length, 1);
assert.strictEqual(d.choices[0].trash, false, 'shallow R&D: Corp AI lets the Runner draw');
d.choose(d.choices[0]); assert.strictEqual(drawn, 2); assert.strictEqual(corp.RnD.cards.length, 5);
withAI(corp, null, () => nihilist.OfferDraw());
d = decisions.shift(); assert.strictEqual(d.choices.length, 2, 'human Corp chooses');
d.choose(d.choices[0]); flushResponses(); assert.strictEqual(corp.RnD.cards.length, 4);
runner.rig.programs = [utae]; runner.rig.resources = [];

// --- Climactic Showdown ---
corp.HQ.ice = []; corp.RnD.ice = [];
const cheap = put(codeGate('Cheap', 1, 1, 1), corp.RnD.ice);
put(codeGate('Dear', 1, 1, 6), corp.HQ.ice);
const showdown = put(card(26006), runner.grip);
assert.strictEqual(showdown.AIPreferredInstallChoice.call(showdown, [{}]), 0);
runner.grip.splice(0, 1); put(showdown, runner.rig.resources);
showdown.responseOnRunnerTurnBegins.Resolve.call(showdown);
assert(c.removedFromGame.includes(showdown), 'removed from the game');
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); assert.strictEqual(d.choices[0].server, corp.HQ, 'pick server with dear ice');
d.choose(d.choices[0]);
d = decisions.shift(); assert.strictEqual(d.player, corp);
assert.strictEqual(d.choices[0].card, undefined, 'Corp AI keeps expensive ice');
d.choose(d.choices[0]);
const bonus = c.lingeringEffects.find(e => e.title === 'Climactic Showdown');
assert(bonus, 'bonus lingers after removal');
c.attackedServer = corp.HQ;
assert.strictEqual(c.ModifyingTriggers('modifyBreachAccess', null, 0), 2);
c.attackedServer = corp.archives;
assert.strictEqual(c.ModifyingTriggers('modifyBreachAccess', null, 0), 0);
// real run selector sees the extra accesses
c.attackedServer = null;
const rndPotential = async () => {
  runner.AI.preferred = null; c.currentPhase = c.phases.runnerActionMain; runner.clickTracker = 4;
  runner.creditPool = 10;
  await runner.AI._computeChoice(['gain', 'run'], 'command');
  return runner.AI._getCachedPotential(corp.RnD);
};
const withBonus = await rndPotential();
c.RemoveLingeringEffect(bonus);
const without = await rndPotential();
c.AddLingeringEffect(bonus);
assert.strictEqual(withBonus - without, 1.0, 'two extra accesses add run potential');
assert.strictEqual(bonus.AIRunExtraPotential(corp.archives), 0);
c.AutomaticTriggers('automaticOnBreach', [corp.RnD]);
assert.strictEqual(bonus.breachingNow, true);
responseQueue.push({name: 'responseOnRunEnds', params: []}); flushResponses();
assert(!c.lingeringEffects.includes(bonus), 'first HQ/R&D breach only');
// Corp trashes cheap ice instead
const showdown2 = put(card(26006), runner.rig.resources);
corp.HQ.ice = [];
showdown2.responseOnRunnerTurnBegins.Resolve.call(showdown2);
d = decisions.shift(); assert.strictEqual(d.choices[0].server, corp.RnD); d.choose(d.choices[0]);
d = decisions.shift(); assert.strictEqual(d.choices[0].card, cheap); d.choose(d.choices[0]); flushResponses();
assert(corp.archives.cards.includes(cheap)); assert.strictEqual(c.lingeringEffects.length, 0, 'no bonus when ice is trashed');
// no iced server: just removed
const showdown3 = put(card(26006), runner.rig.resources);
corp.RnD.ice = [];
assert.strictEqual(showdown3.AIPreferredInstallChoice.call(showdown3, [{}]), -1, 'no iced server: do not install');
showdown3.responseOnRunnerTurnBegins.Resolve.call(showdown3);
assert(c.removedFromGame.includes(showdown3)); assert.strictEqual(decisions.length, 0);
}
main().catch(error => {console.error(error); process.exit(1);});
