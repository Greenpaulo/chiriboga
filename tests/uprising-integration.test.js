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
