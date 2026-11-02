'use strict';
// Uprising (26066–26130) set-level checks. Batches append mechanics and AI cases
// below the structural checks, reusing this engine setup.
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
  'runcalculator.js', 'ai_runner.js', 'ai_corp.js', 'sets/systemgateway.js', 'sets/uprising.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});

const FIRST = 26066, LAST = 26130;
const registry = c.setRegistry.availableSets.uprising;
assert.deepStrictEqual(Array.from(registry.idRange), [FIRST, LAST], 'registry range matches the set');
assert.strictEqual(registry.code, 'ur');
assert(c.setIdentifiers.includes('ur'), 'set file registers its identifier');

const source = fs.readFileSync(path.join(root, 'sets/uprising.js'), 'utf8');
const metadata = JSON.parse(fs.readFileSync(path.join(root, 'carddata/carddata.json'), 'utf8')).data
  .filter(card => card.pack_code === 'ur');
assert.strictEqual(metadata.length, LAST - FIRST + 1, 'metadata covers the whole range');
const normalise = title => title.normalize('NFKD').replace(/[^a-z0-9]/gi, '').toLowerCase();
for (let id = FIRST; id <= LAST; id++) {
  const definitions = source.match(new RegExp('^cardSet\\[' + id + '\\]\\s*=', 'gm')) || [];
  assert.strictEqual(definitions.length, 1, id + ': exactly one definition');
  const card = c.cardSet[id];
  const meta = metadata.find(entry => Number(entry.code) === id);
  assert(meta, id + ': metadata entry');
  assert.strictEqual(normalise(card.title), normalise(meta.title), id + ': title matches metadata');
  assert.strictEqual(card.imageFile, id + '.png', id + ': image file');
  assert(Number.isFinite(card.elo), id + ': numeric ELO');
}

if (process.env.VERBOSE) console.log('uprising-integration: ' + (LAST - FIRST + 1) + ' definitions checked');

// Batch 9: shared engine setup for mechanics and real AI consumers.
c.Log = () => {}; c.LogError = message => {throw Error(message);};
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.GetTitle = card => card.title;
c.particleSystems = {breaksubroutine: {spawnRect: {}}}; c.cardRenderer = {ParticleEffect() {}};
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
const put = (card, zone) => {card.cardLocation = zone; card.renderer = renderer(); zone.push(card); c.InvalidateActiveTriggerCandidateCache(); return card;};
const card = id => Object.assign({}, c.cardSet[id]);
let decisions = [];
const realDecisionPhase = c.DecisionPhase;
const realTriggeredResponsePhase = c.TriggeredResponsePhase;
const realOpportunityForAvoidPrevent = c.OpportunityForAvoidPrevent;
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command, cancel) => {
  if (player === runner) choices = c.LegalBreakChoices(context, choices);
  const decision = {player, choices, title, command, cancel, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
c.TriggeredResponsePhase = (player, name, params, after) => { if (after) after(); };
c.OpportunityForAvoidPrevent = (player, name, params, after) => after();
const remote = () => {const server = c.NewServer('Remote ' + corp.remoteServers.length, false); corp.remoteServers.push(server); return server;};
const wall = (title = 'Wall') => ({title, player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost: 2, strength: 4,
  subroutines: [{text: 'End the run.', Resolve() {c.EndTheRun();}}],
  AIImplementIce(rc, result) {result.sr = [[['endTheRun']]]; return result;}});
const reset = () => {
  decisions = []; ai.preferred = null; c.executingCommand = ''; c.attackedServer = null; c.approachIce = -1;
  c.encountering = false; c.movement = false; c.accessingCard = null;
  for (const zone of [corp.HQ.cards, corp.RnD.cards, corp.archives.cards, corp.HQ.ice, corp.RnD.ice,
    corp.archives.ice, corp.scoreArea, corp.resolvingCards, corp.installingCards,
    runner.scoreArea, runner.grip, runner.heap, runner.rig.programs, runner.rig.hardware, runner.rig.resources]) zone.length = 0;
  corp.remoteServers.length = 0; corp.creditPool = 10; corp.clickTracker = 3;
  runner.creditPool = 5; runner.clickTracker = 4; runner.coreDamage = 0; corp.tempBonusClicks = 0;
  c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
  c.turnEventCounts = {};
};
const finishInstall = () => {
  for (let i = 0; i < 5 && c.currentPhase.title === 'Trash Before Install'; i++) c.currentPhase.Resolve.n();
  assert.notStrictEqual(c.currentPhase.title, 'Trash Before Install', 'install finishes');
};
const select = decision => {
  c.currentPhase = {title: decision.title, identifier: 'Decision', player: decision.player};
  const index = decision.player.AI.Choice(decision.choices, 'select');
  assert(index >= 0 && index < decision.choices.length, 'AI picks a legal option');
  const option = decision.choices[index]; decision.choose(option); return option;
};
const point = () => ({iceIdx: 0, runner_credits_spent: 0, runner_credits_lost: 0,
  runner_clicks_spent: 0, virus_counters_spent: 0, card_str_mods: [], persistents: [], sr_broken: [], effects: []});

// Drafter: optional recursion, decline/empty Archives, and free install from either zone.
reset();
const drafter = put(card(26101), corp.HQ.ice); drafter.rezzed = true;
const recur = put({title: 'Archived agenda', player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: 3, agendaPoints: 2, elo: 1800}, corp.archives.cards);
drafter.subroutines[0].Resolve.call(drafter);
let d = decisions.shift();
assert.strictEqual(select(d).card, recur, 'real Corp selector recovers an agenda from Archives');
assert(corp.HQ.cards.includes(recur));
drafter.subroutines[0].Resolve.call(drafter);
assert.strictEqual(decisions.length, 0, 'empty Archives needs no choice');
c.MoveCard(recur, corp.archives.cards);
drafter.subroutines[0].Resolve.call(drafter);
d = decisions.shift(); d.choose(d.choices.find(option => !option.card));
assert(corp.archives.cards.includes(recur), 'may decline recursion');
const installWall = put(wall('Archives Wall'), corp.archives.cards);
put(wall('Existing Wall'), corp.HQ.ice);
corp.creditPool = 0;
drafter.subroutines[1].Resolve.call(drafter); d = decisions.shift();
assert(d.choices.some(option => option.card === installWall && option.server === corp.HQ), 'outer install legal with no credits');
assert(d.choices.some(option => option.card === recur), 'agendas can be installed from Archives');
d.choose(d.choices.find(option => option.card === installWall && option.server === corp.HQ)); finishInstall();
assert(corp.HQ.ice.includes(installWall) && !installWall.rezzed);
assert.strictEqual(corp.creditPool, 0, 'all install costs ignored');
corp.creditPool = 10;
const fromHQ = put(wall('HQ Wall'), corp.HQ.cards);
drafter.subroutines[1].Resolve.call(drafter); d = decisions.shift();
const selectedInstall = select(d); finishInstall();
assert(selectedInstall.card, 'real Corp selector chooses a useful free install');
assert(c.CheckInstalled(selectedInstall.card));
assert.strictEqual(corp.creditPool, 10, 'AI install remains free');

// Tyr: Runner-only click break, stacked next-turn Corp bonus and cleanup.
reset();
const tyr = put(card(26102), corp.HQ.ice); tyr.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true; c.activePlayer = runner; c.playerTurn = runner;
let abilities = c.ChoicesTriggerableAbilities(runner).filter(option => option.card === tyr);
assert.strictEqual(abilities.length, 1);
c.TriggerAbility(tyr, abilities[0].ability); d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(runner.clickTracker, 3); assert.strictEqual(corp.tempBonusClicks, 1);
assert(tyr.subroutines[0].broken);
c.TriggerAbility(tyr, abilities[0].ability); d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(corp.tempBonusClicks, 2);
c.ResetClicks(corp); assert.strictEqual(corp.clickTracker, 5);
c.ResetClicks(corp); assert.strictEqual(corp.clickTracker, 3, 'bonus is consumed once');
runner.clickTracker = 0;
assert(!c.ChoicesTriggerableAbilities(runner).some(option => option.card === tyr), 'cannot break with no clicks');
runner.clickTracker = 3; c.encountering = false;
assert(!c.ChoicesTriggerableAbilities(runner).some(option => option.card === tyr), 'encounter only');
c.encountering = true;
const rc = runner.AI.rc; rc.baseClicks = 3; rc.basePoolCredits = 5; rc.baseOtherCredits = 0;
const tyrAI = rc.IceAI(tyr, 10); const before = point();
const tyrBreaks = rc.IceAct(tyr, tyrAI, before, corp.HQ);
assert(tyrBreaks.length > 0 && tyrBreaks.every(p => p.runner_clicks_spent === 1));
assert(tyrBreaks.every(p => p.effects.some(effects => effects.includes('misc_moderate'))), 'Corp bonus represented as a cost');
assert.strictEqual(before.effects.length, 0, 'run branches never mutate the input');
rc.baseClicks = 0;
assert.strictEqual(rc.IceAct(tyr, tyrAI, point(), corp.HQ).length, 0);
let damage;
const realDamage = c.Damage; c.Damage = (...args) => {damage = args;};
tyr.subroutines[0].Resolve.call(tyr); c.Damage = realDamage;
assert.deepStrictEqual(damage, ['core', 2, true]);
const victim = put({title: 'Victim', player: runner, cardType: 'hardware', subTypes: [], elo: 1900}, runner.rig.hardware);
corp.creditPool = 0; tyr.subroutines[1].Resolve.call(tyr); d = decisions.shift();
assert.strictEqual(select(d).card, victim);
assert(runner.heap.includes(victim)); assert.strictEqual(corp.creditPool, 3);
tyr.subroutines[1].Resolve.call(tyr); assert.strictEqual(corp.creditPool, 6, 'credits gained even with no installed target');
let ended = false; const realEnd = c.EndTheRun; c.EndTheRun = () => {ended = true;};
tyr.subroutines[2].Resolve.call(tyr); c.EndTheRun = realEnd; assert(ended);

// NEXT: play through the real command consumer, retain across action cleanup,
// prevent non-icebreaker choices and model the same restriction for both AIs.
reset();
const next = put(card(26103), corp.HQ.cards);
const guarded = put(wall(), corp.HQ.ice); guarded.rezzed = true;
let commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, next); ai.preferred = null;
c.Play(next); d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(c.ActiveLockdown(), next);
c.CleanupCorpResolvingCards(); assert(corp.resolvingCards.includes(next));
assert.strictEqual(c.Strength(guarded), 6);
const other = put(card(26103), corp.HQ.cards);
assert(!c.FullCheckPlay(other), 'no second Lockdown while one is active');
const boom = put(card(26075), runner.rig.hardware); boom.chosenCard = guarded;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true; c.activePlayer = runner; c.playerTurn = runner;
assert(!c.ChoicesTriggerableAbilities(runner).some(option => option.card === boom), 'Boomerang cannot be used to break');
rc.baseClicks = 3; rc.basePoolCredits = 10; rc.baseOtherCredits = 0;
assert.strictEqual(rc.IceAct(boom, rc.IceAI(guarded, 10), point(), corp.HQ).length, 0, 'Runner RC excludes Boomerang');
const eli = put(card(26102), corp.RnD.ice); eli.rezzed = true;
c.attackedServer = corp.RnD;
assert(!c.ChoicesTriggerableAbilities(runner).some(option => option.card === eli), 'ICE-owned break ability also forbidden');
assert.strictEqual(ai._iceSelfBreakCost(eli, 1, corp.RnD), null, 'Corp security excludes native break');
const bot = put({title: 'Virus', player: runner, cardType: 'program', subTypes: ['Virus'], AIHostedBreakContribution() {return 3;}}, runner.rig.programs);
guarded.hostedCards = [bot];
assert.strictEqual(ai._hostedBreakContribution(guarded), 0, 'Corp security excludes hosted non-breaker');
// Icebreakers still work while NEXT is active.
const fracter = put(Object.assign({}, c.cardSet[30006]), runner.rig.programs);
assert(c.CheckSubType(fracter, 'Icebreaker'));
assert(!c.CardEffectsForbid('breakUsing', fracter));
c.CleanupCorpResolvingCards(true);
assert.strictEqual(c.ActiveLockdown(), null); assert.strictEqual(c.Strength(guarded), 4);
c.attackedServer = corp.HQ;
assert(c.ChoicesTriggerableAbilities(runner).some(option => option.card === boom), 'ability returns after expiry');
assert.strictEqual(ai._hostedBreakContribution(guarded), 3);
assert(ai._iceSelfBreakCost(eli, 1, corp.RnD));
reset();
const noIceNext = put(card(26103), corp.HQ.cards);
assert(!noIceNext.AIWouldPlay(), 'AI holds NEXT without useful ice');

// Scapenet: successful-run condition, real operation selection, trace and RFG.
reset();
const scape = put(card(26104), corp.HQ.cards);
assert(!c.FullCheckPlay(scape), 'requires a successful run last Runner turn');
c.playerTurn = runner; scape.responseOnRunSuccessful.Resolve.call(scape); c.playerTurn = corp;
const chip = put({title: 'Chip', player: runner, cardType: 'hardware', subTypes: ['Chip'], elo: 1900}, runner.rig.hardware);
const ordinary = put({title: 'Ordinary', player: runner, cardType: 'resource', subTypes: [], elo: 2000}, runner.rig.resources);
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, scape); ai.preferred = null;
scape.Resolve.call(scape); d = decisions.shift();
assert(d.title.includes('Trace[7]')); d.choose(d.choices[0]);
d = decisions.shift(); d.choose(d.choices[0]);
d = decisions.shift(); assert(d.choices.every(option => option.card === chip));
assert.strictEqual(select(d).card, chip);
assert(c.removedFromGame.includes(chip) && !c.CheckInstalled(chip));
assert(c.CheckInstalled(ordinary));
assert(!scape.AIWouldPlay(), 'no valid target: hold the operation');
scape.responseOnRunnerTurnBegins.Resolve.call(scape);
assert(!c.FullCheckPlay(scape), 'old successful run expires');

// Tranquility: legal remote placement and real install bookkeeping, including
// installs while unrezzed, repeated installs, rez policy and economic choice.
reset();
const home = remote(); put(wall(), home.ice);
const grid = put(card(26105), corp.HQ.cards);
assert(!c.CheckInstallDestination(grid, corp.HQ)); assert(c.CheckInstallDestination(grid, home));
const upgrades = ai._upgradeInstallPreferences(undefined, [grid], true);
assert(upgrades.some(option => option.cardToInstall === grid && option.serverToInstallTo === home), 'real upgrade planner chooses a protected remote');
c.Install(grid, home); finishInstall();
assert.strictEqual(home.rootInstallsThisTurn, 1, 'own install consumes the first root install');
grid.rezzed = true;
const asset = put({title: 'Asset', player: corp, cardType: 'asset', subTypes: [], rezCost: 1, trashCost: 2}, corp.HQ.cards);
c.Install(asset, home); finishInstall();
assert.strictEqual(home.rootInstallsThisTurn, 2);
assert.strictEqual(grid.responseOnInstall.Enumerate.call(grid, asset).length, 0, 'no retroactive first trigger on rez');
home.rootInstallsThisTurn = 0;
const upgrade = put({title: 'Upgrade', player: corp, cardType: 'upgrade', subTypes: [], rezCost: 1, trashCost: 2}, corp.HQ.cards);
c.Install(upgrade, home); finishInstall();
assert.strictEqual(home.rootInstallsThisTurn, 1);
const gains = grid.responseOnInstall.Enumerate.call(grid, upgrade);
assert.strictEqual(gains.length, 2);
corp.creditPool = 0;
c.currentPhase = {title: grid.responseOnInstall.text, identifier: 'Decision', player: corp};
const gain = gains[ai.Choice(gains, 'select')];
grid.responseOnInstall.Resolve.call(grid, gain);
assert.strictEqual(corp.creditPool, 2, 'Corp selector chooses the credit economy');
assert.strictEqual(grid.responseOnInstall.Enumerate.call(grid, guarded).length, 0, 'ice never qualifies');
assert.strictEqual(c.CheckInstallDestination(grid, corp.RnD), false);
assert(grid.AIRezWhenCan()); corp.creditPool = 0; assert(!grid.AIRezWhenCan(), 'rez requires credits');


// Turn boundaries: Lockdown survives the next opening paid window and expires
// at the turn-begins checkpoint, before any turn-begins conditional resolves.
reset();
const expiring = put(card(26103), corp.resolvingCards);
const expiryHome = remote(); expiryHome.rootInstallsThisTurn = 3;
const quietConsole = c.console; c.console = {log() {}, error() {}};
c.rewinding = true;
c.ChangePhase({identifier: 'Runner 1.1', title: 'Runner turn', player: runner});
assert.strictEqual(c.ActiveLockdown(), expiring);
assert.strictEqual(expiryHome.rootInstallsThisTurn, 0);
c.ChangePhase({identifier: 'Corp 1.1', title: 'Corp opening window', player: corp});
assert.strictEqual(c.ActiveLockdown(), expiring, 'opening paid window is before turn begins');
c.currentPhase = {identifier: 'Corp 1.2', title: 'Corp turn begins', player: corp};
c.phaseTemplates.globalTriggers.Init();
assert.strictEqual(c.ActiveLockdown(), null);
assert(corp.archives.cards.includes(expiring));
c.console = quietConsole; c.rewinding = false;

// Failed trace, no targets, virtual targets and uninstall/host cleanup.
reset();
const failedScape = put(card(26104), corp.HQ.cards); failedScape.successfulRunLastTurn = true;
const virtual = put({title: 'Virtual', player: runner, cardType: 'resource', subTypes: ['Virtual'], elo: 1900}, runner.rig.resources);
runner.creditPool = 10;
failedScape.Resolve.call(failedScape); d = decisions.shift(); d.choose(d.choices[0]);
d = decisions.shift(); d.choose(d.choices.find(option => option.num === 7));
assert.strictEqual(decisions.length, 0, 'tied trace fails without a target choice');
assert(c.CheckInstalled(virtual));
runner.creditPool = 0;
virtual.hostedCards = [];
const hostedVictim = put({title: 'Hosted', player: runner, cardType: 'program', subTypes: [], host: virtual}, virtual.hostedCards);
failedScape.Resolve.call(failedScape); d = decisions.shift(); d.choose(d.choices[0]);
d = decisions.shift(); d.choose(d.choices[0]); d = decisions.shift();
assert.strictEqual(select(d).card, virtual);
assert(c.removedFromGame.includes(virtual));
assert(runner.heap.includes(hostedVictim), 'hosted cards are trashed when the target is uninstalled');
failedScape.Resolve.call(failedScape); d = decisions.shift(); d.choose(d.choices[0]);
d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(decisions.length, 0, 'successful trace with no target finishes cleanly');
corp.creditPool = 0;
assert(!c.FullCheckPlay(failedScape), 'printed play cost must be payable');

// Ordinary ICE uses the real Corp rez selector and respects the actual cost.
for (const id of [26101, 26102]) {
  reset();
  const ice = put(card(id), corp.HQ.ice);
  put({title: 'Agenda', player: corp, cardType: 'agenda', subTypes: [], agendaPoints: 2, advancementRequirement: 3}, corp.HQ.cards);
  c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = false;
  c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runApproachIce;
  runner.clickTracker = 0;
  let rezCommands = c.EnumeratePhase();
  assert.strictEqual(rezCommands[ai.Choice(rezCommands, 'command')], 'rez', id + ': real selector rezzes useful ICE');
  assert.strictEqual(ai.preferred.cardToRez, ice); ai.preferred = null;
  corp.creditPool = ice.rezCost - 1;
  rezCommands = c.EnumeratePhase();
  assert(!rezCommands.includes('rez'), id + ': cannot rez without credits');
}

// NEXT permits ordinary breaker calculations, and blocks special matching
// non-breakers in Corp planning without disabling their unrelated abilities.
reset();
const restriction = put(card(26103), corp.resolvingCards);
const barrier = put(wall(), corp.HQ.ice); barrier.rezzed = true;
const cleaver = put(Object.assign({}, c.cardSet[30006]), runner.rig.programs);
rc.baseClicks = 3; rc.basePoolCredits = 20; rc.baseOtherCredits = 0;
assert(rc.IceAct(cleaver, rc.IceAI(barrier, 10), point(), corp.HQ).length > 0, 'ordinary Icebreaker can pump/break under NEXT');
const special = put({title: 'Special breaker', player: runner, cardType: 'hardware', subTypes: [],
  AIMatchingBreakerInstalled() {return this;},
  abilities: [{text: 'Gain a credit', Enumerate() {return [{}];}, Resolve() {}}]}, runner.rig.hardware);
assert(!ai._matchingBreakersForIce(barrier, corp.HQ, 0).includes(special));
assert(c.ChoicesAbility(special).length > 0, 'unrelated non-breaking abilities stay available');
c.CleanupCorpResolvingCards(true);
assert(ai._matchingBreakersForIce(barrier, corp.HQ, 0).includes(special), 'special route returns when NEXT expires');

// Region's draw branch uses the real draw helper; its AI selects draw only
// with a healthy credit pool and a sparse HQ.
reset();
const drawHome = remote();
const drawGrid = put(card(26105), drawHome.root); drawGrid.rezzed = true;
const installedRoot = put({title: 'Root card', player: corp, cardType: 'upgrade', subTypes: []}, drawHome.root);
drawHome.rootInstallsThisTurn = 1;
for (let i = 0; i < 4; i++) put({title: 'Draw card ' + i, player: corp, cardType: 'operation', subTypes: []}, corp.RnD.cards);
corp.creditPool = 8;
const drawChoices = drawGrid.responseOnInstall.Enumerate.call(drawGrid, installedRoot);
c.currentPhase = {title: drawGrid.responseOnInstall.text, identifier: 'Decision', player: corp};
const drawChoice = drawChoices[ai.Choice(drawChoices, 'select')];
assert.strictEqual(drawChoice.id, 1, 'real selector chooses useful draw');
drawGrid.responseOnInstall.Resolve.call(drawGrid, drawChoice);
assert.strictEqual(corp.HQ.cards.length, 1); assert.strictEqual(corp.creditPool, 8);

// Cancelling the play restores HQ and immediately removes its transient effects.
reset();
const cancelledNext = put(card(26103), corp.HQ.cards);
const cancellationWall = put(wall(), corp.HQ.ice); cancellationWall.rezzed = true;
const realCancel = c.Cancel; c.Cancel = () => {};
c.Play(cancelledNext); d = decisions.shift(); d.cancel(); c.Cancel = realCancel;
assert(corp.HQ.cards.includes(cancelledNext)); assert.strictEqual(c.ActiveLockdown(), null);
assert.strictEqual(c.Strength(cancellationWall), 4);

// Legacy automatic bioroid choices also pass through the shared decision guard.
reset();
put(card(26103), corp.resolvingCards);
const legacyIce = put(wall(), corp.HQ.ice); legacyIce.rezzed = true;
c.currentPhase = c.phases.runEncounterIce;
const guardedDecision = realDecisionPhase(runner,
  [{subroutine: legacyIce.subroutines[0], label: 'Break'}, {subroutine: null, label: 'Continue'}],
  () => {}, 'Automatic ICE ability', '', legacyIce);
assert.strictEqual(guardedDecision.Enumerate.continue().length, 1);
assert.strictEqual(guardedDecision.Enumerate.continue()[0].subroutine, null);

if (process.env.VERBOSE) console.log('uprising batch 9: gameplay and real AI consumers passed');

// Batch 10: Flower Sermon score counters, free paid draw/filter and turn limits.
reset();
const sermon = put(card(26106), corp.scoreArea);
c.intended.score = {}; sermon.responseOnScored.Resolve.call(sermon);
assert.strictEqual(c.Counters(sermon, 'agenda'), 0, 'other scores add no counters');
c.intended.score = sermon; sermon.responseOnScored.Resolve.call(sermon);
assert.strictEqual(sermon.agenda, 5);
const corpFiller = (title, elo = 1500) => ({title, elo, player: corp, cardType: 'operation', subTypes: [], playCost: 0});
const runnerFiller = (title, type = 'event', elo = 1500) => ({title, elo, player: runner, cardType: type, subTypes: []});
const bottom = put(corpFiller('Bottom'), corp.RnD.cards);
const returnCard = put(corpFiller('Low value card', 1000), corp.RnD.cards);
const top = put(corpFiller('Top', 1900), corp.RnD.cards);
put(corpFiller('Useful HQ card', 1800), corp.HQ.cards);
let sermonCommands = c.EnumeratePhase();
assert.strictEqual(sermonCommands[ai.Choice(sermonCommands, 'command')], 'trigger', 'real selector uses scored draw/filter');
assert.strictEqual(ai.preferred.cardToTrigger, sermon); ai.preferred = null;
const sermonAbility = c.ChoicesTriggerableAbilities(corp).find(option => option.card === sermon);
c.TriggerAbility(sermon, sermonAbility.ability);
d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(sermon.agenda, 4); assert.strictEqual(corp.clickTracker, 3, 'agenda ability costs no clicks');
assert.strictEqual(top.faceUp, true); assert.strictEqual(corp.HQ.cards.length, 1, 'reveal precedes draw');
decisions.shift().choose({});
assert.strictEqual(top.faceUp, false); assert(corp.HQ.cards.includes(top));
d = decisions.shift(); assert.strictEqual(select(d).card, returnCard, 'real selector returns a low-value non-agenda');
assert.strictEqual(corp.RnD.cards[corp.RnD.cards.length - 1], returnCard);
assert.strictEqual(sermon.abilities[0].Enumerate.call(sermon).length, 0, 'once per turn');
sermon.responseOnRunnerTurnBegins.Resolve.call(sermon);
assert.strictEqual(sermon.usedThisTurn, false);
sermon.responseOnCorpTurnBegins.Resolve.call(sermon);
corp.RnD.cards.length = 1;
assert.strictEqual(sermon.abilities[0].Enumerate.call(sermon).length, 0, 'AI avoids deck-out');
const savedCorpAI10 = corp.AI; corp.AI = null;
c.playerTurn = runner;
assert.strictEqual(sermon.abilities[0].Enumerate.call(sermon).length, 1, 'human may use it during either turn');
sermon.agenda = 0;
assert.strictEqual(sermon.abilities[0].Enumerate.call(sermon).length, 0, 'counter required');
corp.AI = savedCorpAI10;

// Prāna: install/rez consumers, one prevention per damage packet, and lethal cash-out.
reset();
const prana = put(card(26107), corp.HQ.cards);
let pranaInstalls = c.ChoicesCardInstall(prana);
const pranaInstallIndex = ai._bestInstallOption(pranaInstalls, false);
assert(pranaInstallIndex >= 0); assert.strictEqual(pranaInstalls[pranaInstallIndex].card, prana);
c.MoveCard(prana, remote().root); c.InvalidateActiveTriggerCandidateCache();
c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runnerPostAction;
let pranaCommands = c.EnumeratePhase();
assert.strictEqual(pranaCommands[ai.Choice(pranaCommands, 'command')], 'rez');
assert.strictEqual(ai.preferred.cardToRez, prana); ai.preferred = null;
corp.creditPool = 0;
assert(!c.EnumeratePhase().includes('rez'), 'cannot rez without credits');
corp.creditPool = 10; prana.rezzed = true; c.InvalidateActiveTriggerCandidateCache();
put(runnerFiller('Grip one'), runner.grip); put(runnerFiller('Grip two'), runner.grip);
let preventionPackets = 0;
const priorPrevention10 = c.OpportunityForAvoidPrevent;
c.OpportunityForAvoidPrevent = (player, name, params, after) => {
  assert.strictEqual(name, 'responsePreventableDamage'); preventionPackets++;
  const choices = prana.responsePreventableDamage.Enumerate.call(prana);
  if (choices.length) {
    prana.responsePreventableDamage.Resolve.call(prana);
    select(decisions.shift());
  }
  after();
};
c.Damage('net', 2, true, null, {player: corp});
assert.strictEqual(preventionPackets, 1); assert.strictEqual(prana.power, 1);
assert.strictEqual(corp.creditPool, 13); assert.strictEqual(runner.grip.length, 1, 'prevents one, not whole packet');
c.Damage('net', 1, true, null, {player: runner});
assert.strictEqual(prana.power, 1, 'does not prevent Runner-sourced damage');
put(runnerFiller('Replacement'), runner.grip);
c.Damage('meat', 1, true);
assert.strictEqual(prana.power, 1, 'net only');
put(runnerFiller('Unpreventable victim'), runner.grip);
c.Damage('net', 1, false);
assert.strictEqual(prana.power, 1, 'unpreventable damage offers no prevention');
put(runnerFiller('Decline victim'), runner.grip);
c.OpportunityForAvoidPrevent = (player, name, params, after) => {
  prana.responsePreventableDamage.Resolve.call(prana);
  d = decisions.shift(); d.choose(d.choices.find(option => !option.use)); after();
};
c.Damage('net', 1, true);
assert.strictEqual(prana.power, 1, 'human may decline');
c.intended.damageType = 'net'; c.intended.damage = 2; c.intended.damageSourcePlayer = corp;
prana.responsePreventableDamage.Resolve.call(prana);
assert.strictEqual(select(decisions.shift()).use, false, 'AI preserves lethal damage');
c.OpportunityForAvoidPrevent = priorPrevention10;
c.playerTurn = corp; c.activePlayer = corp; c.currentPhase = c.phases.corpActionMain;
prana.power = 2; corp.clickTracker = 1;
assert(!c.ChoicesTriggerableAbilities(corp).some(option => option.card === prana), 'two clicks required');
corp.clickTracker = 3;
put(runnerFiller('Cash-out victim'), runner.grip);
pranaCommands = c.EnumeratePhase();
assert.strictEqual(pranaCommands[ai.Choice(pranaCommands, 'command')], 'trigger');
assert.strictEqual(ai.preferred.cardToTrigger, prana); ai.preferred = null;
const pranaTrigger = c.ChoicesTriggerableAbilities(corp).find(option => option.card === prana);
let pranaDamage, pranaWasTrashed = false;
c.Damage = (type, amount, preventable) => {
  pranaDamage = [type, amount, preventable]; pranaWasTrashed = corp.archives.cards.includes(prana);
};
c.TriggerAbility(prana, pranaTrigger.ability); d = decisions.shift(); d.choose(d.choices[0]);
c.Damage = realDamage;
assert.deepStrictEqual(pranaDamage, ['net', 2, true]); assert(pranaWasTrashed, 'trash cost paid before damage');
assert.strictEqual(corp.clickTracker, 1);
assert(!c.ChoicesTriggerableAbilities(corp).some(option => option.card === prana), 'trashed asset inactive');

// Engram: public-only type prior, reveals, optional legal target, second reveal and cleanup.
reset();
const flush = put(card(26108), corp.HQ.ice); flush.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true;
put(runnerFiller('Observed hardware', 'hardware'), runner.heap);
const gripHigh = put(runnerFiller('High value hardware', 'hardware', 2000), runner.grip);
const gripLow = put(runnerFiller('Low value hardware', 'hardware', 1000), runner.grip);
const gripEvent = put(runnerFiller('Unmatched event'), runner.grip);
assert.strictEqual(flush.responseOnEncounter.Enumerate.call(flush).length, 1);
flush.responseOnEncounter.Resolve.call(flush);
assert.strictEqual(select(decisions.shift()).type, 'hardware', 'real selector uses observed board, not hidden grip');
const finishGripReveals = count => {
  for (let i = 0; i < count; i++) {
    const reveal = decisions.shift(); assert(reveal.title.startsWith('Revealing ')); reveal.choose({});
  }
};
flush.subroutines[0].Resolve.call(flush); finishGripReveals(3);
d = decisions.shift(); assert(!d.choices.some(option => option.card === gripEvent));
assert.strictEqual(select(d).card, gripHigh, 'real selector trashes highest-value matching revealed card');
assert(runner.heap.includes(gripHigh)); assert(!gripLow.faceUp && !gripEvent.faceUp, 'reveal leaves no persistent visibility');
flush.subroutines[1].Resolve.call(flush); finishGripReveals(2);
d = decisions.shift(); d.choose(d.choices.find(option => !option.card));
assert(runner.grip.includes(gripLow), 'human may decline optional trash');
flush.chosenType = 'program'; flush.subroutines[0].Resolve.call(flush); finishGripReveals(2);
assert.strictEqual(decisions.length, 0, 'no chosen-type target completes after reveal');
flush.responseOnEncounterEnds.Resolve.call(flush); assert.strictEqual(flush.chosenType, null);
flush.chosenType = 'event'; flush.responseOnRunEnds.Resolve.call(flush); assert.strictEqual(flush.chosenType, null);
c.MoveCard(gripLow, runner.heap); c.MoveCard(gripEvent, runner.heap);
flush.subroutines[0].Resolve.call(flush); assert.strictEqual(decisions.length, 0, 'empty grip is harmless');

// Both calculators use a finite, non-damage model; breaking either subroutine
// protects the only matching card. The Corp calculator never inspects grip types.
put(runnerFiller('One matching card', 'hardware'), runner.grip);
put(runnerFiller('Other type', 'event'), runner.grip);
flush.chosenType = 'hardware';
const flushAI = rc.IceAI(flush, 10);
assert.strictEqual(flushAI.gripTrashLimit, 1);
const flushPoint = rc.EmptyPoint(0);
const trashPath = rc.ValidateEncounterPoint(-1, flushPoint, false, ['trashGripCard', 'trashGripCard'], [], flushAI);
assert.strictEqual(rc.TotalEffect(trashPath).trashGripCard, 1, 'one card cannot be trashed twice');
assert(!rc.TotalEffect(trashPath).netDamage, 'targeted trash is not damage');
assert.strictEqual(flushPoint.effects.length, 0, 'input branch unchanged');
const oneSubPath = rc.ValidateEncounterPoint(-1, flushPoint, false, ['trashGripCard'], [], flushAI);
assert.strictEqual(rc.TotalEffect(oneSubPath).trashGripCard, 1, 'either surviving subroutine still threatens the card');
flush.chosenType = 'program';
const noTargetPath = rc.ValidateEncounterPoint(-1, flushPoint, false, ['trashGripCard', 'trashGripCard'], [], rc.IceAI(flush, 10));
assert(!rc.TotalEffect(noTargetPath).trashGripCard, 'Runner calculator recognizes no matching type');
const corpRC10 = ai._securityRunCalculator();
assert.strictEqual(corpRC10.IceAI(flush, 10, false, false, -1, corp).gripTrashLimit, 2, 'Corp uses public grip size');
assert.strictEqual(ai._countETRSubroutines(flush), 0);

if (process.env.VERBOSE) console.log('uprising batch 10: gameplay and real AI consumers passed');

// Targeted trash reduces later damage capacity without causing a flatline itself.
assert(rc.ValidPoint(trashPath, 0, 4, 10, 0, Infinity).valid, 'trash alone is legal even with zero damage budget');
const afterTrashDamage = rc.ValidateEncounterPoint(-1, trashPath, false, ['netDamage', 'netDamage'], [], null);
assert(!rc.ValidPoint(afterTrashDamage, 2, 4, 10, 0, Infinity).valid, 'lost grip card reduces subsequent damage capacity');
assert(rc.PointCost(trashPath) > 0, 'targeted trash has a cost in route ranking');

// Exercise the real triggered window: the prevention cannot be repeated on one packet.
reset();
const windowPrana = put(card(26107), remote().root); windowPrana.rezzed = true;
for (let i = 0; i < 4; i++) put(runnerFiller('Packet victim ' + i), runner.grip);
c.InvalidateActiveTriggerCandidateCache();
c.TriggeredResponsePhase = realTriggeredResponsePhase;
c.OpportunityForAvoidPrevent = realOpportunityForAvoidPrevent;
c.Damage('net', 3, true);
const preventionWindow = c.currentPhase;
const windowTriggers = preventionWindow.Enumerate.trigger();
assert.strictEqual(windowTriggers.length, 1); assert.strictEqual(windowTriggers[0].card, windowPrana);
preventionWindow.Resolve.trigger(windowTriggers[0]);
d = decisions.shift(); d.choose(d.choices[0]); select(decisions.shift());
c.currentPhase = preventionWindow;
assert.strictEqual(preventionWindow.Enumerate.trigger().length, 0, 'one interrupt per damage instance');
assert.strictEqual(windowPrana.power, 1); assert.strictEqual(c.intended.damage, 2);
// Return through the real window to apply the remaining damage.
preventionWindow.Resolve.n({}); preventionWindow.Resolve.n({});
// Trash's response window may have no candidates and complete synchronously.
assert.strictEqual(runner.grip.length, 2);

// Engram's ordinary rez route is useful with a grip to threaten and affordable.
c.TriggeredResponsePhase = (player, name, params, after) => {if (after) after();};
c.OpportunityForAvoidPrevent = priorPrevention10;
reset();
const rezFlush = put(card(26108), corp.HQ.ice);
put({title: 'Protected agenda', player: corp, cardType: 'agenda', subTypes: [], agendaPoints: 2, advancementRequirement: 3}, corp.HQ.cards);
put(runnerFiller('Hidden event'), runner.grip);
c.attackedServer = corp.HQ; c.approachIce = 0; c.playerTurn = runner; c.activePlayer = corp;
c.currentPhase = c.phases.runApproachIce; runner.clickTracker = 0;
const flushRezCommands = c.EnumeratePhase();
assert.strictEqual(flushRezCommands[ai.Choice(flushRezCommands, 'command')], 'rez');
assert.strictEqual(ai.preferred.cardToRez, rezFlush); ai.preferred = null;
corp.creditPool = 1;
assert(!c.EnumeratePhase().includes('rez'), 'Engram printed rez cost is enforced');

// Flower Sermon still pays its cost if a human chooses a draw that decks out.
reset();
const emptySermon = put(card(26106), corp.scoreArea); emptySermon.agenda = 1;
const oldWin10 = c.PlayerWin; let deckOut10 = null;
c.PlayerWin = (winner, reason) => {deckOut10 = {winner, reason};};
corp.AI = null;
emptySermon.abilities[0].Resolve.call(emptySermon);
assert.strictEqual(deckOut10.winner, runner); assert.strictEqual(emptySermon.agenda, 0);
assert.strictEqual(decisions.length, 0, 'deck-out does not continue to the return instruction');
corp.AI = savedCorpAI10; c.PlayerWin = oldWin10;

// Earlier ICE can empty the grip before Engram; it cannot trash nonexistent cards.
reset();
put(runnerFiller('Before damage 1'), runner.grip);
put(runnerFiller('Before damage 2'), runner.grip);
const priorDamage10 = rc.ValidateEncounterPoint(0, rc.EmptyPoint(1), false, ['netDamage', 'netDamage'], [], null);
const depletedGrip10 = rc.ValidateEncounterPoint(-1, priorDamage10, false,
  ['trashGripCard', 'trashGripCard'], [], {gripTrashLimit: 2});
assert(!rc.TotalEffect(depletedGrip10).trashGripCard, 'prior damage leaves no grip cards to trash');
const sameEncounterDepleted10 = rc.ValidateEncounterPoint(-1, rc.EmptyPoint(0), false,
  ['netDamage', 'netDamage', 'trashGripCard'], [], {gripTrashLimit: 2});
assert(!rc.TotalEffect(sameEncounterDepleted10).trashGripCard, 'effect order also caps loss within an encounter');
const priorTrash10 = rc.ValidateEncounterPoint(0, rc.EmptyPoint(1), false,
  ['trashGripCard', 'trashGripCard'], [], {gripTrashLimit: 2});
const afterPriorTrash10 = rc.ValidateEncounterPoint(-1, priorTrash10, false,
  ['trashGripCard'], [], {gripTrashLimit: 2});
assert.strictEqual(rc.TotalEffect(afterPriorTrash10).trashGripCard, 2, 'earlier targeted trashes also deplete the grip');

// Locked-pool route accounting retains temporary and eligible hosted credits.
reset();
put({title: 'Pool lock', player: runner, cardType: 'resource', subTypes: [],
  preventCreditPoolUse(player) { return player === runner; }}, runner.rig.resources);
const paymentSource11 = put({title: 'Payment source', player: runner, cardType: 'hardware', subTypes: [], credits: 2,
  canUseCredits(doing) { return doing === '' || doing === 'using'; }}, runner.rig.hardware);
runner.temporaryCredits = 2; runner.creditPool = 10;
const routeInputs11 = runner.AI._calculateRunPathPieceBegin({server: corp.HQ,
  clickOffset: 0, poolCreditOffset: 0, otherCreditOffset: 0, damageOffset: 0});
assert.strictEqual(routeInputs11.poolCredits, 0, 'locked pool is excluded from breaker-route budget');
assert.strictEqual(runner.AI._calculateRunPathPieceBegin({server: corp.HQ,
  clickOffset: 0, poolCreditOffset: 2, otherCreditOffset: 0, damageOffset: 0}).poolCredits, 2,
  'hypothetical pool offset is preserved');
assert.strictEqual(routeInputs11.otherCredits, 4, 'route setup subtracts only an available pool');
rc.baseOtherCredits = routeInputs11.otherCredits; rc.basePoolCredits = routeInputs11.poolCredits;
rc._poolOnly = false;
let paidOutside11 = rc.PayCredits(point(), 3, 'using', paymentSource11, corp.HQ);
assert(paidOutside11, 'temporary and hosted credits pay with the pool locked');
assert.strictEqual(paidOutside11.runner_credits_spent, 3);
assert.strictEqual(paidOutside11.runner_credits_lost, 0);
assert(rc.PayCredits(paidOutside11, 1, 'using', paymentSource11, corp.HQ));
assert.strictEqual(rc.PayCredits(paidOutside11, 2, 'using', paymentSource11, corp.HQ), null, 'cannot reuse outside credits or spend the locked pool');
assert.strictEqual(rc.PayCredits(point(), 3, 'stealing', null, corp.HQ), null, 'ineligible hosted credits cannot pay');
rc._poolOnly = true;
assert.strictEqual(rc.PayCredits(point(), 1, 'using', paymentSource11, corp.HQ), null);
rc._poolOnly = false;
runner.rig.resources.length = 0; c.InvalidateActiveTriggerCandidateCache();
const unlockedInputs11 = runner.AI._calculateRunPathPieceBegin({server: corp.HQ,
  clickOffset: 0, poolCreditOffset: 0, otherCreditOffset: 0, damageOffset: 0});
rc.basePoolCredits = unlockedInputs11.poolCredits; rc.baseOtherCredits = unlockedInputs11.otherCredits;
paidOutside11 = rc.PayCredits(point(), 5, 'using', paymentSource11, corp.HQ);
assert.strictEqual(paidOutside11.runner_credits_spent, 4, 'unlocked payments still prefer outside credits');
assert.strictEqual(paidOutside11.runner_credits_lost, 1);
runner.temporaryCredits = 0;

// Breaker search must reject routes affordable only with locked pool credits.
reset(); runner.temporaryCredits = 0;
const budgetWall11 = put(wall('Budget wall'), corp.HQ.ice); budgetWall11.rezzed = true;
put(card(30006), runner.rig.programs);
put({title: 'Budget pool lock', player: runner, cardType: 'resource', subTypes: [],
  preventCreditPoolUse(player) { return player === runner; }}, runner.rig.resources);
assert.strictEqual(runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0), null,
  'breaker route cannot use locked pool with no outside damage sources');
runner.rig.resources.length = 0; c.InvalidateActiveTriggerCandidateCache();
assert(runner.AI._calculateBestCompleteRun(corp.HQ, 0, 0, 0, 0), 'same breaker route is affordable when pool unlocks');

// Batch 11: Psi, nested encounters, Archives installs and mandatory counters.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const konjin = put(card(26109), corp.HQ.ice); konjin.rezzed = true;
const foreign = remote();
const otherIce = put(wall('Foreign ETR'), foreign.ice); otherIce.rezzed = true;
const facedownIce = put(wall('Unrezzed'), corp.RnD.ice);
assert(konjin.unique && konjin.subroutines.length === 0, 'printed unique ICE has no subroutines');
assert.strictEqual(konjin.responseOnEncounter.Enumerate.call(konjin, otherIce).length, 0);
c.attackedServer = corp.HQ; c.approachIce = 0; c.encounteredIce = konjin; c.encountering = true;
const suspended11 = {player: runner, identifier: 'Suspended encounter response', title: 'Suspended'};
c.currentPhase = suspended11;
konjin.responseOnEncounter.Resolve.call(konjin);
d = decisions.shift(); assert(d.title.includes('Corp bid')); d.choose(d.choices.find(o => o.bid === 0));
d = decisions.shift(); d.choose(d.choices.find(o => o.bid === 1));
d = decisions.shift();
assert(d.choices.some(o => o.card === otherIce));
assert(!d.choices.some(o => o.card === facedownIce || o.card === konjin), 'only another rezzed ICE is legal');
assert.strictEqual(select(d).card, otherIce, 'real Corp choice selects useful rezzed ICE');
assert.strictEqual(c.GetApproachEncounterIce(), otherIce);
assert.strictEqual(c.encounteredIce, otherIce);
assert.strictEqual(c.attackedServer, corp.HQ, 'forced encounter does not redirect the run');
assert.strictEqual(c.approachIce, 0);
const forcedBreak11 = c.ChoicesEncounteredSubroutines();
assert.strictEqual(forcedBreak11.length, 1, 'forced ICE supplies breakable subroutines despite empty parent');
assert.strictEqual(forcedBreak11[0].subroutine, otherIce.subroutines[0]);
assert.strictEqual(c.ChoicesEncounteredSubroutines([otherIce.subroutines[0]]).length, 0);
c.Break(forcedBreak11[0].subroutine);
assert(otherIce.subroutines[0].broken, 'breaking a forced encounter choice changes the child ICE');
assert.strictEqual(konjin.subroutines.length, 0);
otherIce.subroutines[0].broken = false;
const originalForced = c.forcedEncounters[0]; originalForced.phase = suspended11;
c.ChangePhase(c.phases.runSubroutines); c.subroutine = 1;
c.phases.runSubroutines.Resolve.n();
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd);
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.currentPhase, suspended11);
assert.strictEqual(c.GetApproachEncounterIce(), konjin);
assert.strictEqual(c.encounteredIce, konjin);
assert(c.encountering && c.forcedEncounters.length === 0, 'parent resumes without a new encounter or a pass');
// Matching bids leave the encounter unchanged; decline is also available.
decisions = []; c.currentPhase = suspended11;
konjin.responseOnEncounter.Resolve.call(konjin);
d = decisions.shift(); d.choose(d.choices[0]); d = decisions.shift(); d.choose(d.choices[0]);
assert.strictEqual(decisions.length, 0); assert.strictEqual(c.forcedEncounters.length, 0);
konjin.responseOnEncounter.Resolve.call(konjin);
d = decisions.shift(); d.choose(d.choices[0]); d = decisions.shift(); d.choose(d.choices[1]);
d = decisions.shift(); d.choose(d.choices.find(o => !o.card)); assert.strictEqual(c.forcedEncounters.length, 0);
// Forced bypass finishes only the child; ETR unwinds both encounters.
c.currentPhase = suspended11; c.ForceEncounter(otherIce); c.Bypass();
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.GetApproachEncounterIce(), konjin);
c.currentPhase = suspended11; c.ForceEncounter(otherIce); c.EndTheRun(false);
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.currentPhase, c.phases.runEncounterEnd, 'parent encounter also ends');
c.ChangePhase(c.phases.runEncounterEnd.next);
assert.strictEqual(c.currentPhase, c.phases.runUnsuccessful);
assert.strictEqual(c.forcedEncounters.length, 0);
// Real calculators model the extra encounter and leave the board untouched.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const calcKonjin = put(card(26109), corp.HQ.ice); calcKonjin.rezzed = true;
const calcForeign = remote(); const taxIce11 = put(wall('Tax ICE'), calcForeign.ice); taxIce11.rezzed = true;
taxIce11.AIImplementIce = function (calc, result) {
  result.sr = [[Array(calc === runner.AI.rc ? 2 : 3).fill('payCredits')]]; return result;
};
const calc11 = runner.AI.rc;
let paths11 = calc11.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 0);
assert(paths11.length);
assert(paths11.some(path => calc11.TotalEffect(path[path.length - 1]).misc_moderate), 'matching bids remain a graded-risk route, not a guaranteed block');
const conditional11 = calc11._forcedEncounterPoint(calc11.EmptyPoint(0), taxIce11);
assert.strictEqual(conditional11.runner_credits_spent, 2, 'differing-bids branch prices the selected extra ICE through the real breaker/effect search with Runner ownership');
const corpCalc11 = ai._securityRunCalculator();
corpCalc11.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 0);
const corpConditional11 = corpCalc11._forcedEncounterPoint(corpCalc11.EmptyPoint(0), taxIce11);
assert.strictEqual(corpConditional11.runner_credits_spent, 3, 'Corp child pricing retains Corp ownership and public information');
assert.strictEqual(c.attackedServer, null); assert.strictEqual(c.forcedEncounters.length, 0);
taxIce11.rezzed = false;
paths11 = calc11.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 0);
assert(paths11.some(path => path[path.length - 1].runner_credits_spent === 0), 'no target means no phantom extra encounter');
assert(!calcKonjin.AIWorthwhileIce());
calcKonjin.rezzed = false; taxIce11.rezzed = true;
assert(!calc11.IceAI(calcKonjin, 2).forcedEncounterIce, 'unaffordable unrezzed Konjin cannot force an encounter');

// Run-end cleanup clears a forced encounter still on the stack.
reset(); c.forcedEncounters = [];
const runEndForeign11 = remote();
const runEndIce11 = put(wall('Run end ICE'), runEndForeign11.ice); runEndIce11.rezzed = true;
const runEndParent11 = put(wall('Run end parent'), corp.HQ.ice); runEndParent11.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encountering = true; c.encounteredIce = runEndParent11;
assert.strictEqual(c.GetApproachEncounterIce(), runEndParent11);
assert(c.ForceEncounter(runEndIce11));
assert.strictEqual(c.GetApproachEncounterIce(), runEndIce11);
assert.strictEqual(c.forcedEncounters.length, 1);
c.playerTurn = corp; c.currentPhase = c.phases.runEnds;
c.phases.runEnds.Resolve.n();
assert.strictEqual(c.forcedEncounters.length, 0, 'run end clears the pending forced encounter');
assert.strictEqual(c.attackedServer, null);
assert.strictEqual(c.approachIce, -1);
assert.strictEqual(c.encountering, false);
assert.strictEqual(c.encounteredIce, null);
assert.strictEqual(c.GetApproachEncounterIce(), null, 'run end exposes neither child nor parent ICE');
assert.strictEqual(c.ChoicesEncounteredSubroutines().length, 0);

// Manifold: legal play/target through real Corp command selection and Psi timing.
reset(); c.runSuccessDeclared = false;
const manifold11 = put(card(26110), corp.HQ.cards);
const protected11 = remote(); put({title: 'Remote agenda', player: corp, cardType: 'agenda', subTypes: [], agendaPoints: 2, advancementRequirement: 3}, protected11.root);
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, manifold11); ai.preferred = null;
c.Play(manifold11); d = decisions.shift();
assert.strictEqual(select(d).server, protected11);
assert.strictEqual(c.ActiveLockdown(), manifold11);
c.CleanupCorpResolvingCards(); assert(corp.resolvingCards.includes(manifold11));
const competing11 = put(card(26103), corp.HQ.cards);
assert(!c.FullCheckPlay(competing11), 'one active Lockdown at a time');
c.attackedServer = corp.HQ; assert.strictEqual(manifold11.responseOnRunSuccessful.Enumerate.call(manifold11).length, 0);
c.attackedServer = protected11; c.runSuccessDeclared = true;
assert.strictEqual(manifold11.responseOnRunSuccessful.Enumerate.call(manifold11).length, 1);
manifold11.responseOnRunSuccessful.Resolve.call(manifold11);
d = decisions.shift(); d.choose(d.choices[0]); d = decisions.shift(); d.choose(d.choices[0]);
assert.notStrictEqual(c.currentPhase, c.phases.runEnds, 'matching bids permit breach');
manifold11.responseOnRunSuccessful.Resolve.call(manifold11);
d = decisions.shift(); d.choose(d.choices[0]); d = decisions.shift(); d.choose(d.choices[1]);
assert.strictEqual(c.currentPhase, c.phases.runEnds, 'different bids end a successful run without marking it unsuccessful');
assert.strictEqual(c.AIRunSuccessChance(protected11), 1 / 3, 'public Psi probability is graded, not a permanent lock');
assert.strictEqual(c.AIRunSuccessChance(corp.HQ), 1);
corp.creditPool = 0; runner.creditPool = 0;
assert.strictEqual(c.AIRunSuccessChance(protected11), 1, 'forced zero bids cannot stop a breach');
const restrictedPsi11 = put({title: 'Non-Psi credits', player: corp, cardType: 'asset', subTypes: [], rezzed: true, credits: 2,
  canUseCredits(doing) {return doing === ''; }}, protected11.root);
assert.strictEqual(c.AIRunSuccessChance(protected11), 1, 'restricted non-Psi credits do not create additional legal bids');
c.CleanupCorpResolvingCards(true); assert.strictEqual(c.ActiveLockdown(), null);
assert.strictEqual(c.AIRunSuccessChance(protected11), 1, 'expires on the next Corp turn');

// Kakurenbo: real play route, Triple costs, hand trash, concealment, optional
// remote-root install, post-install counters and remove-from-game cleanup.
reset(); c.runSuccessDeclared = false;
const kak11 = put(card(26111), corp.HQ.cards);
const kakRemote11 = remote(); put(wall(), kakRemote11.ice);
const archived11 = put({title: 'Archived agenda', player: corp, cardType: 'agenda', subTypes: [], agendaPoints: 2,
  advancementRequirement: 3, elo: 1800, faceUp: true, knownToRunner: true}, corp.archives.cards);
assert.strictEqual(c.PlayClickCost(kak11), 3);
corp.clickTracker = 2; assert(!c.FullCheckPlay(kak11));
corp.clickTracker = 3; corp.creditPool = 1; assert(!c.FullCheckPlay(kak11));
corp.creditPool = 5;
commands = c.EnumeratePhase(); assert.strictEqual(commands[ai.Choice(commands, 'command')], 'play');
assert.strictEqual(ai.preferred.cardToPlay, kak11); ai.preferred = null;
c.Play(kak11); d = decisions.shift(); d.choose(d.choices[0]);
d = decisions.shift(); select(d); // AI trashes zero when the target is already in Archives.
d = decisions.shift(); assert(d.choices.every(o => !o.card || !o.server || typeof o.server.cards === 'undefined'));
assert.strictEqual(select(d).card, archived11); finishInstall();
assert(c.CheckInstalled(archived11) && c.GetServer(archived11) !== corp.HQ);
assert.strictEqual(archived11.advancement, 2);
assert(c.removedFromGame.includes(kak11));
assert(!archived11.knownToRunner);
// Human trash-many and decline, including Archives cards which were faceup.
reset();
const humanKak11 = put(card(26111), corp.resolvingCards);
const oldArchive11 = put(wall(), corp.archives.cards); oldArchive11.faceUp = true;
const discardA11 = put(card(26106), corp.HQ.cards), discardB11 = put(wall(), corp.HQ.cards);
humanKak11.Resolve(); d = decisions.shift(); d.choose({cards: [discardA11, discardB11]});
assert(corp.archives.cards.includes(discardA11) && corp.archives.cards.includes(discardB11));
assert(corp.archives.cards.every(card => !card.faceUp));
d = decisions.shift(); d.choose(d.choices.find(o => !o.card)); assert(c.removedFromGame.includes(humanKak11));
reset(); const emptyKak11 = put(card(26111), corp.HQ.cards);
assert(!emptyKak11.AIWouldPlay(), 'AI holds with no useful install');
assert(c.FullCheckPlay(emptyKak11), 'humans may play with no install target');

// La Costa: remote/Region legality, mandatory arbitrary-root placement,
// useful real rez/trigger consumers and no next-turn counters booked early.
reset();
const coastServer11 = remote(); put(wall(), coastServer11.ice);
const coast11 = put(card(26112), corp.HQ.cards);
assert(!c.CheckInstallDestination(coast11, corp.HQ)); assert(c.CheckInstallDestination(coast11, coastServer11));
const coastAgenda11 = put(card(26106), coastServer11.root);
c.MoveCard(coast11, coastServer11.root);
c.playerTurn = runner; c.activePlayer = corp; c.currentPhase = c.phases.runnerDiscardResponse;
commands = c.EnumeratePhase(); assert.strictEqual(commands[ai.Choice(commands, 'command')], 'rez');
assert.strictEqual(ai.preferred.cardToRez, coast11); ai.preferred = null;
coast11.rezzed = true;
const coastChoices11 = coast11.responseOnCorpTurnBegins.Enumerate.call(coast11);
corp.AI = null;
assert(coast11.responseOnCorpTurnBegins.Enumerate.call(coast11).some(o => o.card === coast11), 'printed effect can advance itself or any root card');
corp.AI = ai;
c.currentPhase = {title: coast11.title, identifier: 'Decision', player: corp};
const coastChoice11 = coastChoices11[ai.Choice(coastChoices11, 'select')];
assert.strictEqual(coastChoice11.card, coastAgenda11);
coast11.responseOnCorpTurnBegins.Resolve.call(coast11, coastChoice11);
assert.strictEqual(coastAgenda11.advancement, 1);
coast11.responseOnCorpTurnBegins.Resolve.call(coast11, {card: coast11});
assert.strictEqual(coast11.advancement, 1, 'not restricted to cards you can advance');
assert.strictEqual(coast11.AIPreferredUpgradeServer([corp.HQ, coastServer11]), coastServer11);
const illegalCoast11 = put(card(26112), corp.HQ.cards);
c.Install(illegalCoast11, coastServer11);
assert.strictEqual(c.currentPhase.Enumerate.n().length, 0, 'must trash the existing Region before completing install');
c.currentPhase.Resolve.trash({card: coast11}); finishInstall();
assert(coastServer11.root.includes(illegalCoast11) && !coastServer11.root.includes(coast11), 'exactly one Region remains');

// Additional normal-use guards and cancellation paths.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const rezKonjin11 = put(card(26109), corp.HQ.ice);
const rezTargetServer11 = remote(); const rezTarget11 = put(wall(), rezTargetServer11.ice); rezTarget11.rezzed = true;
put(card(26106), corp.HQ.cards);
c.attackedServer = corp.HQ; c.approachIce = 0; c.playerTurn = runner; c.activePlayer = corp;
c.currentPhase = c.phases.runApproachIce; runner.clickTracker = 0;
commands = c.EnumeratePhase(); assert.strictEqual(commands[ai.Choice(commands, 'command')], 'rez');
assert.strictEqual(ai.preferred.cardToRez, rezKonjin11); ai.preferred = null;
corp.creditPool = 2; assert(!c.EnumeratePhase().includes('rez'), 'Konjin rez cost is enforced');
reset(); c.runSuccessDeclared = false;
const handKak11 = put(card(26111), corp.resolvingCards);
const handAgenda11 = put({title: 'HQ agenda', player: corp, cardType: 'agenda', subTypes: [], advancementRequirement: 3, agendaPoints: 2, elo: 1800}, corp.HQ.cards);
const handRemote11 = remote(); put(wall(), handRemote11.ice);
handKak11.Resolve(); select(decisions.shift());
assert(corp.archives.cards.includes(handAgenda11), 'AI trashes a useful HQ card for the advanced install');
select(decisions.shift());
assert.strictEqual(c.currentPhase.title, 'Trash Before Install');
c.currentPhase.Cancel.trash();
assert(corp.archives.cards.includes(handAgenda11) && !handAgenda11.advancement, 'cancellation grants no counters');
assert(c.removedFromGame.includes(handKak11), 'cancelled optional install still removes operation');
assert(corp.remoteServers.includes(handRemote11), 'cancellation preserves the existing destination');
for (const origin of [corp.HQ.cards, corp.archives.cards]) {
  const cancelledCard11 = put({title: 'Cancelled root install', player: corp, cardType: 'asset', subTypes: []}, origin);
  const beforeServers11 = corp.remoteServers.length;
  let cleaned11 = false;
  c.Install(cancelledCard11, null, false, null, true, null, null, () => {
    cleaned11 = true;
    assert.strictEqual(corp.remoteServers.length, beforeServers11, 'cancel callback sees the new empty remote removed');
  });
  assert.strictEqual(corp.remoteServers.length, beforeServers11 + 1);
  c.currentPhase.Cancel.trash();
  assert(cleaned11 && origin.includes(cancelledCard11), 'cancellation restores HQ or Archives card');
}
// Server-creation responses may populate the new server before cancellation.
const populatedCancel11 = put({title: 'Cancelled asset', player: corp, cardType: 'asset', subTypes: []}, corp.HQ.cards);
c.Install(populatedCancel11, null);
const populatedServer11 = corp.remoteServers[corp.remoteServers.length - 1];
put(wall(), populatedServer11.ice);
c.currentPhase.Cancel.trash();
assert(corp.remoteServers.includes(populatedServer11), 'cancellation preserves a newly populated server');
reset();
const noTargetKak11 = put(card(26111), corp.resolvingCards);
noTargetKak11.Resolve(); d = decisions.shift(); d.choose({cards: []});
d = decisions.shift(); assert.strictEqual(d.choices.length, 1); d.choose(d.choices[0]);
assert(c.removedFromGame.includes(noTargetKak11));
// Exercise the actual mandatory turn-begin response window, rather than only
// calling the counter-placement callback.
reset();
const turnServer11 = remote(); const turnCoast11 = put(card(26112), turnServer11.root); turnCoast11.rezzed = true;
const turnAgenda11 = put(card(26106), turnServer11.root);
c.TriggeredResponsePhase = realTriggeredResponsePhase;
c.TriggeredResponsePhase(corp, 'responseOnCorpTurnBegins', [], () => {}, 'Corp turn begins');
const turnWindow11 = c.currentPhase;
const turnTriggers11 = turnWindow11.Enumerate.trigger();
const turnTrigger11 = turnTriggers11.find(o => o.card === turnCoast11);
assert(turnTrigger11, 'rezzed Grid reaches actual turn-begin response collection');
turnWindow11.Resolve.trigger(turnTrigger11);
assert.strictEqual(select(decisions.shift()).card, turnAgenda11);
assert.strictEqual(turnAgenda11.advancement, 1, 'actual response trigger advances the agenda');
c.TriggeredResponsePhase = (player, name, params, after) => {if (after) after();};

(async function batch11PlannerChecks() {
// Manifold reaches the Runner's actual command-planning consumer, and only
// discounts access potential while its response can still fire.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const risk11 = put(card(26110), corp.resolvingCards); risk11.chosenServer = corp.RnD;
put(card(26106), corp.RnD.cards);
c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runnerActionMain;
runner.AI.preferred = null; runner.AI.cachedBestPath = null;
await runner.AI._internalChoiceDetermination(c.EnumeratePhase(), 'command');
const penalised11 = runner.AI._getCachedPotential(corp.RnD);
c.MoveCard(risk11, corp.archives.cards); runner.AI.preferred = null; runner.AI.cachedBestPath = null;
await runner.AI._internalChoiceDetermination(c.EnumeratePhase(), 'command');
const unpenalised11 = runner.AI._getCachedPotential(corp.RnD);
assert(unpenalised11 > 0 && Math.abs(penalised11 * 3 - unpenalised11) < 1e-8,
  'real Runner command planner discounts the protected server by matching-bid probability');

// Single-use breakers spent on the child cannot also break its later ordinary
// encounter. The matching-bids branch stays available instead of a false lock.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const repeatTarget11 = put(wall('Repeated target'), corp.HQ.ice); repeatTarget11.rezzed = true;
const outerKonjin11 = put(card(26109), corp.HQ.ice); outerKonjin11.rezzed = true;
const boom11 = put(card(26075), runner.rig.hardware); boom11.chosenCard = repeatTarget11;
paths11 = calc11.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 1);
assert(paths11.length, 'matching-bids route still permits completion');
assert(paths11.every(path => path[path.length - 1].persistents.filter(p => p.use === boom11).length <= 1),
  'forced and normal encounters share finite-use resources');
assert(paths11.some(path => calc11.TotalEffect(path[path.length - 1]).misc_moderate), 'one Boomerang cannot cover both encounters');
// A live child recalculation addresses the child, even when it protects a
// different server. Hypothetical probes restore the live overlay on failure.
reset(); c.forcedEncounters = []; c.runSuccessDeclared = false;
const liveKonjin11 = put(card(26109), corp.HQ.ice); liveKonjin11.rezzed = true;
const liveRemote11 = remote(); const liveTax11 = put(wall('Live tax'), liveRemote11.ice); liveTax11.rezzed = true;
liveTax11.AIImplementIce = function (calc, result) { result.sr = [[['payCredits']]]; return result; };
c.attackedServer = corp.HQ; c.approachIce = 0; c.encounteredIce = liveKonjin11; c.encountering = true;
c.ForceEncounter(liveTax11);
paths11 = calc11.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 0);
assert(paths11.length && paths11.every(path => path[path.length - 1].runner_credits_spent >= 1));
assert.strictEqual(c.GetApproachEncounterIce(), liveTax11);
assert.throws(() => c.AIWithIceEncounter(liveKonjin11, () => {throw Error('probe failure');}), /probe failure/);
assert.strictEqual(c.GetApproachEncounterIce(), liveTax11, 'exception restores live forced encounter');
assert.strictEqual(c.attackedServer, corp.HQ);

const batchCard12 = id => Object.assign(card(id), {subroutines: (c.cardSet[id].subroutines || []).map(sr => Object.assign({}, sr))});
const selectRunner12 = async decision => {
  c.currentPhase = {title: decision.title, identifier: 'Decision', player: runner};
  const index = await runner.AI._internalChoiceDetermination(decision.choices, 'select');
  assert(index >= 0 && index < decision.choices.length);
  const option = decision.choices[index]; decision.choose(option); return option;
};
// Batch 12: GameNET attribution follows actual triggers and deferred decisions.
reset(); c.forcedEncounters = []; runner.temporaryCredits = 0; runner.tags = 0;
const game12 = batchCard12(26113); corp.identityCard = game12; c.InvalidateActiveTriggerCandidateCache();
const gold12 = put(batchCard12(26116), corp.HQ.ice); gold12.rezzed = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encounteredIce = gold12; c.encountering = true;
c.playerTurn = runner; c.activePlayer = runner;
c.SpendCredits(runner, 3, 'using', gold12);
assert.strictEqual(corp.creditPool, 11, 'one gain for a three-credit Corp ability payment');
c.SpendCredits(runner, 0, 'using', gold12);
c.SpendCredits(runner, 1, 'using', {player: runner});
c.SpendCredits(runner, 1, 'paying trash costs', gold12);
assert.strictEqual(corp.creditPool, 11, 'zero payments, breaker costs and basic access trash costs do not trigger');
runner.creditPool = 0; c.LoseCredits(runner, 3, gold12);
assert.strictEqual(corp.creditPool, 11, 'zero actual loss does not trigger');
runner.creditPool = 2; c.Trigger(gold12, {Resolve() {c.LoseCredits(runner, 3);}});
assert.strictEqual(corp.creditPool, 12, 'inferred card source and saturated loss trigger once');
c.attackedServer = null; runner.creditPool = 5; c.SpendCredits(runner, 2, 'using', gold12);
assert.strictEqual(corp.creditPool, 12, 'off-run payments do not trigger');
assert.strictEqual(c.resolvingCardAbility, null, 'source scope cleans up');
assert.throws(() => c.WithCardAbilitySource(gold12, () => {throw Error('source cleanup');}), /source cleanup/);
assert.strictEqual(c.resolvingCardAbility, null);
// Actual delayed DecisionPhase callback retains the source after Trigger returns.
c.attackedServer = corp.HQ; runner.creditPool = 5;
c.DecisionPhase = realDecisionPhase;
c.Trigger(gold12, {Resolve() {c.DecisionPhase(runner, [{}], function () {c.LoseCredits(runner, 1);}, 'Delayed loss');}});
c.currentPhase.Resolve.continue({});
assert.strictEqual(corp.creditPool, 13, 'asynchronous Corp ability loss retains its source');
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command, cancel) => {
  if (player === runner) choices = c.LegalBreakChoices(context, choices);
  const decision = {player, choices, title, command, cancel, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
// Printed breaks trigger individually; granted subroutines and repeated breaks do not.
runner.creditPool = 3; c.Break(gold12.subroutines[0]); c.Break(gold12.subroutines[1]);
assert.strictEqual(runner.creditPool, 1); assert.strictEqual(corp.creditPool, 15);
c.Break(gold12.subroutines[0]); assert.strictEqual(runner.creditPool, 1);
const extra12 = {text: 'Granted subroutine'}; gold12.subroutines = gold12.subroutines.concat([extra12]);
c.Break(extra12); assert.strictEqual(runner.creditPool, 1, 'granted subroutine has no printed-break penalty');
c.UnbreakAll(gold12); runner.creditPool = 0; c.Break(gold12.subroutines[0]);
assert.strictEqual(corp.creditPool, 15, 'breaking at zero credits is legal and grants no GameNET income');
runner.creditPool = 0; runner.temporaryCredits = 1; c.Break(gold12.subroutines[1]);
assert.strictEqual(runner.temporaryCredits, 0); assert.strictEqual(corp.creditPool, 16);
// Pay-or-end mechanics and real Runner selector follow a complete route.
runner.creditPool = 3; runner.AI.cachedComplete = true;
gold12.subroutines[0].Resolve.call(gold12);
assert((await selectRunner12(decisions.shift())).pay); assert.strictEqual(runner.creditPool, 0);
gold12.subroutines[1].Resolve.call(gold12); d = decisions.shift();
assert.strictEqual(d.choices.length, 1); assert(!d.choices[0].pay);
// Bellona uses actual steal legality/payment and the automatic score response.
reset(); runner.temporaryCredits = 0; c.encounteredIce = null;
const bellServer12 = remote(); const bell12 = put(batchCard12(26114), bellServer12.root);
bell12.knownToRunner = true; c.attackedServer = bellServer12; c.accessingCard = bell12;
c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runAccessingCard;
runner.creditPool = 4; assert(!c.CheckSteal(), 'cannot steal without five credits');
runner.creditPool = 5; assert(c.CheckSteal());
commands = ['steal', 'n']; assert.strictEqual(commands[await runner.AI._internalChoiceDetermination(commands, 'command')], 'steal');
c.phases.runAccessingCard.Resolve.steal();
assert.strictEqual(runner.creditPool, 0); assert(runner.scoreArea.includes(bell12));
assert.strictEqual(corp.creditPool, 11, 'GameNET sees the additional steal payment');
reset(); const scoredBell12 = put(batchCard12(26114), corp.scoreArea); c.intended.score = scoredBell12;
c.TriggeredResponsePhase = realTriggeredResponsePhase;
c.TriggeredResponsePhase(corp, 'responseOnScored', [], () => {}, 'Scored');
assert.strictEqual(corp.creditPool, 15, 'mandatory score response grants five');
c.TriggeredResponsePhase = (player, name, params, after) => {if (after) after();};
// Known Bellona costs enter the real run planner and cannot use breaker credits.
reset(); runner.temporaryCredits = 0; c.encounteredIce = null;
const knownServer12 = remote(); const knownBell12 = put(batchCard12(26114), knownServer12.root); knownBell12.knownToRunner = true;
const rc12 = runner.AI.rc;
assert.strictEqual(rc12.Calculate(knownServer12, 4, 4, 10, 5, 5, false).length, 0, 'restricted breaker funds cannot pay steal cost');
let paths12 = rc12.Calculate(knownServer12, 4, 5, 0, 5, 5, false);
assert(paths12.length && paths12.every(p => p[p.length - 1].runner_credits_spent + p[p.length - 1].runner_credits_lost >= 5));
knownBell12.knownToRunner = false;
paths12 = rc12.Calculate(knownServer12, 4, 4, 0, 5, 5, false);
assert(paths12.length, 'unknown agenda identity does not leak into run costs');
// F2P: useful self-break path through RunCalculator and Runner command/target selectors.
reset(); runner.temporaryCredits = 0; runner.tags = 0; c.encounteredIce = null;
const f2p12 = put(batchCard12(26115), corp.HQ.ice); f2p12.rezzed = true;
const bounce12 = put(Object.assign({}, c.cardSet[30006]), runner.rig.programs);
paths12 = rc12.Calculate(corp.HQ, 4, 4, 0, 0, 0, false, null, 0);
assert(paths12.length && paths12.some(p => p[p.length - 1].runner_credits_spent + p[p.length - 1].runner_credits_lost === 4), 'four credits avoid both F2P subroutines without a breaker');
runner.AI.cachedBestPath = paths12[paths12.length - 1]; runner.AI.cachedPathServer = corp.HQ; runner.AI.cachedComplete = true;
c.attackedServer = corp.HQ; c.approachIce = 0; c.encounteredIce = f2p12; c.encountering = true;
c.playerTurn = runner; c.activePlayer = runner; c.currentPhase = c.phases.runEncounterIce;
runner.creditPool = 4; runner.AI.preferred = null;
commands = c.EnumeratePhase();
assert.strictEqual(commands[await runner.AI._internalChoiceDetermination(commands, 'command')], 'trigger');
assert.strictEqual(runner.AI.preferred.cardToTrigger, f2p12);
c.TriggerAbility(f2p12, f2p12.abilities[0]);
const breakOption12 = await selectRunner12(decisions.shift());
assert(breakOption12.subroutine.broken); assert.strictEqual(runner.creditPool, 2);
assert.strictEqual(corp.creditPool, 11, 'F2P ability payment triggers GameNET');
c.UnbreakAll(f2p12); runner.tags = 1; assert.strictEqual(f2p12.abilities[0].Enumerate.call(f2p12).length, 0);
paths12 = rc12.Calculate(corp.HQ, 4, 10, 0, 0, 0, false, null, 0);
assert(paths12.every(p => p.every(n => n.sr_broken.every(b => b.use !== f2p12))), 'tagged Runner cannot use native break route');
runner.tags = 0; runner.creditPool = 1;
assert.strictEqual(f2p12.abilities[0].Enumerate.call(f2p12).length, 0);
c.encountering = false; runner.creditPool = 4;
assert.strictEqual(f2p12.abilities[0].Enumerate.call(f2p12).length, 0);
// Corp chooses an installed card, and Uninstall cleans up hosted cards.
c.activePlayer = corp; const host12 = put({title: 'Hosted card', player: runner, cardType: 'program', subTypes: [], host: bounce12}, []);
bounce12.hostedCards = [host12];
f2p12.subroutines[0].Resolve.call(f2p12); assert.strictEqual(select(decisions.shift()).card, bounce12);
assert(runner.grip.includes(bounce12)); assert(runner.heap.includes(host12), 'hosted cards are trashed on bounce');
f2p12.subroutines[0].Resolve.call(f2p12); assert.strictEqual(decisions.length, 0);
f2p12.subroutines[1].Resolve.call(f2p12); assert.strictEqual(runner.tags, 1);
// Gold Farmer break tax and pay-through alternatives in both real calculators.
reset(); runner.tags = 0; runner.temporaryCredits = 0; c.encounteredIce = null;
const tax12 = put(batchCard12(26116), corp.HQ.ice); tax12.rezzed = true;
const cleaver12 = put(card(30006), runner.rig.programs);
paths12 = rc12.Calculate(corp.HQ, 4, 10, 0, 5, 5, false, null, 0);
assert(paths12.length);
assert(paths12.some(p => p.some(n => n.sr_broken.length === 2 && n.runner_credits_lost === 2)), 'printed break losses enter the real search');
assert.strictEqual(ai._breakerPrice(tax12, cleaver12, 2, corp.HQ, 0).credits, 3, 'Corp pricing includes activation and two credit losses');
runner.rig.programs.length = 0; c.InvalidateActiveTriggerCandidateCache();
paths12 = rc12.Calculate(corp.HQ, 4, 6, 0, 5, 5, false, null, 0);
assert(paths12.length && paths12.every(p => p[p.length - 1].runner_credits_spent + p[p.length - 1].runner_credits_lost === 6), 'no-breaker route pays six');
assert.strictEqual(rc12.Calculate(corp.HQ, 4, 5, 0, 5, 5, false, null, 0).length, 0);
assert.strictEqual(rc12.Calculate(corp.HQ, 4, 0, 6, 5, 5, false, null, 0).length, 0,
  'Gold Farmer payments cannot use an anonymous breaker-only credit budget');
runner.temporaryCredits = 6;
assert(rc12.Calculate(corp.HQ, 4, 0, 6, 5, 5, false, null, 0).length, 'temporary credits can fund Gold Farmer');
runner.temporaryCredits = 0;
reset(); c.encounteredIce = null; runner.tags = 0;
const restrictedF2P12 = put(batchCard12(26115), corp.HQ.ice); restrictedF2P12.rezzed = true;
put(card(30006), runner.rig.programs);
assert.strictEqual(rc12.Calculate(corp.HQ, 4, 0, 4, 0, 0, false, null, 0).length, 0,
  'F2P self-breaking cannot use breaker-only funds');
runner.temporaryCredits = 4;
assert(rc12.Calculate(corp.HQ, 4, 0, 4, 0, 0, false, null, 0).length, 'temporary credits can fund F2P');
runner.temporaryCredits = 0;
// Native F2P pricing is read-only, public and unavailable when tagged.
runner.tags = 0; assert.strictEqual(ai._iceSelfBreakCost(f2p12, 1, corp.HQ).credits, 2);
runner.tags = 1; assert.strictEqual(ai._iceSelfBreakCost(f2p12, 1, corp.HQ), null);
corp.identityCard = {player: corp, title: 'Corp', subTypes: []}; runner.tags = 0;

// Trace and Psi payments inherit the initiating Corp card through real decisions.
reset(); corp.identityCard = game12; c.InvalidateActiveTriggerCandidateCache();
c.attackedServer = corp.HQ; c.playerTurn = runner; c.activePlayer = runner;
c.DecisionPhase = realDecisionPhase;
c.Trigger(gold12, {Resolve() {c.PsiGame(function () {}, this);}});
c.currentPhase.Resolve.continue({bid: 0}); c.currentPhase.Resolve.continue({bid: 1});
assert.strictEqual(corp.creditPool, 11, 'Psi Runner bid triggers once after committing both bids');
c.Trigger(gold12, {Resolve() {c.Trace(1, function () {}, this);}});
c.currentPhase.Resolve.trace({num: 0}); c.currentPhase.Resolve.trace({num: 1});
assert.strictEqual(corp.creditPool, 12, 'trace payment retains initiating Corp source');
assert.strictEqual(c.resolvingCardAbility, null);
c.DecisionPhase = (player, choices, resolve, title, instruction, context, command, cancel) => {
  if (player === runner) choices = c.LegalBreakChoices(context, choices);
  const decision = {player, choices, title, command, cancel, choose: option => resolve.call(context, option)};
  decisions.push(decision); return decision;
};
// Corp's normal install/rez and scoring consumers need no card-specific heuristic.
for (const id of [26115, 26116]) {
  reset(); runner.tags = 0; c.encounteredIce = null;
  const ice = put(batchCard12(id), corp.HQ.ice);
  put(card(26114), corp.HQ.cards);
  c.attackedServer = corp.HQ; c.approachIce = 0; c.playerTurn = runner; c.activePlayer = corp;
  c.currentPhase = c.phases.runApproachIce; runner.clickTracker = 0;
  commands = c.EnumeratePhase();
  assert.strictEqual(commands[ai.Choice(commands, 'command')], 'rez');
  assert.strictEqual(ai.preferred.cardToRez, ice); ai.preferred = null;
  corp.creditPool = ice.rezCost - 1;
  assert(!c.EnumeratePhase().includes('rez'), id + ': insufficient credits suppress rez');
}
reset(); c.encounteredIce = null;
const scoreServer12 = remote(); const readyBell12 = put(batchCard12(26114), scoreServer12.root); readyBell12.advancement = 5;
c.currentPhase = c.phases.corpPostAction;
commands = c.EnumeratePhase();
assert.strictEqual(commands[ai.Choice(commands, 'command')], 'score');
assert.strictEqual(ai.preferred.cardToScore, readyBell12);
corp.identityCard = {player: corp, title: 'Corp', subTypes: []}; c.InvalidateActiveTriggerCandidateCache();

})().catch(error => {console.error(error); process.exitCode = 1;});
