// Run with: node tests/vantagepoint-batch12.test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
async function main() {
const corp = {side: 'corp', creditPool: 8, clickTracker: 3, badPublicity: 2,
  HQ: {cards: [], root: [], ice: []}, RnD: {cards: [], root: [], ice: []},
  archives: {cards: [], root: [], ice: []}, remoteServers: [], scoreArea: [], resolvingCards: [], installingCards: []};
const runner = {side: 'runner', creditPool: 5, temporaryCredits: 0, grip: [],
  rig: {programs: [], hardware: [], resources: []}, resolvingCards: [], scoreArea: []};
let installed = [], decisions = [], damage = 0;
const c = {console: Object.assign({}, console), corp, runner, cardSet: [], setIdentifiers: [], attackedServer: null,
  playerTurn: corp, activePlayer: corp, currentPhase: {identifier: 'Corp 2.2'},
  Log: () => {}, GetTitle: card => card.title,
  CheckInstalled: card => installed.includes(card),
  GetServer: card => corp.remoteServers.find(s => s.root.includes(card) || s.ice.includes(card)),
  Counters: (card, type) => card[type] || 0,
  CheckCounters: (card, type, amount) => (card[type] || 0) >= amount,
  RemoveCounters: (card, type, amount) => {card[type] -= amount;},
  AddCounters: (card, type, amount) => {card[type] = (card[type] || 0) + amount;},
  GainCredits: (player, amount) => {player.creditPool += amount;},
  Damage: (type, amount, preventable) => {assert.strictEqual(type, 'meat'); assert(preventable); damage += amount;},
  AdvancementRequirement: card => card.advancementRequirement,
  DecisionPhase: (player, choices, callback, title, instruction, context, command) => {
    const d = {player, choices, title, command, choose: params => callback.call(context, params)};
    decisions.push(d); c.currentPhase = {title, identifier: c.currentPhase.identifier}; return d;
  },
};
vm.createContext(c);
for (const file of ['config.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
const agenda = c.cardSet[36056];
const home = {root: [agenda], ice: []};
corp.remoteServers = [home]; installed = [agenda];
agenda.automaticOnInstall.Resolve.call(agenda, agenda);
assert.strictEqual(agenda.faceUp, true);
agenda.automaticOnAdvance.Resolve.call(agenda, {});
assert.strictEqual(corp.creditPool, 8);
agenda.automaticOnAdvance.Resolve.call(agenda, agenda);
agenda.automaticOnAdvance.Resolve.call(agenda, agenda);
assert.strictEqual(corp.creditPool, 11, 'only first advance generates credits');
agenda.advancement = 2;
c.attackedServer = home;
assert.strictEqual(agenda.responseOnRunSuccessful.Enumerate.call(agenda).length, 0);
c.attackedServer = corp.HQ;
let choices = agenda.responseOnRunSuccessful.Enumerate.call(agenda);
agenda.responseOnRunSuccessful.Resolve.call(agenda, choices[1]);
assert.strictEqual(agenda.usedThisTurn, false);
corp.AI = {};
choices = agenda.responseOnRunSuccessful.Enumerate.call(agenda);
assert.strictEqual(choices.length, 1);
agenda.responseOnRunSuccessful.Resolve.call(agenda, choices[0]);
assert.strictEqual(damage, 1); assert.strictEqual(agenda.advancement, 1);
assert.strictEqual(agenda.responseOnRunSuccessful.Enumerate.call(agenda).length, 0);
agenda.responseOnRunnerTurnBegins.Resolve.call(agenda);
assert.strictEqual(agenda.responseOnRunSuccessful.Enumerate.call(agenda).length, 1);
agenda.automaticOnAdvance.Resolve.call(agenda, agenda);
assert.strictEqual(corp.creditPool, 14, 'Runner-turn advancement has its own first advance');
installed = [];
assert.strictEqual(agenda.responseOnRunSuccessful.Enumerate.call(agenda).length, 0, 'scored agendas cannot fire');
corp.AI = null;
// Luana's hosting is a transfer; returning counters waits for prevention/responses.
const luana = c.cardSet[36057];
c.UpdateCounters = () => {};
let draws = 0;
c.Draw = (player, amount) => { draws += amount; };
let hostChoices = luana.responseOnCorpTurnBegins.Enumerate.call(luana);
luana.responseOnCorpTurnBegins.Resolve.call(luana, hostChoices[1]);
assert.strictEqual(corp.badPublicity, 2);
luana.responseOnCorpTurnBegins.Resolve.call(luana, hostChoices[0]);
assert.strictEqual(corp.badPublicity, 1);
assert.strictEqual(luana.bad_publicity, 1);
assert.strictEqual(draws, 1);
assert(luana.unique);
corp.badPublicity = 0;
assert.strictEqual(luana.responseOnCorpTurnBegins.Enumerate.call(luana).length, 0);
vm.runInContext(fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'), c);
installed = [luana]; luana.rezzed = true;
c.CheckCallback = (card, name) => !!card[name] && card.rezzed;
const order = [];
let finishBadPublicity;
c.BadPublicity = (amount, callback, context) => {
  assert.strictEqual(amount, 1); assert(installed.includes(luana));
  order.push('bad publicity'); finishBadPublicity = () => {corp.badPublicity += amount; callback.call(context);};
};
c.MoveCard = (card, destination) => {order.push('move'); installed = [];};
c.Uninstall(luana, corp.HQ.cards, () => order.push('done'));
assert.deepStrictEqual(order, ['bad publicity']);
finishBadPublicity();
assert.deepStrictEqual(order, ['bad publicity', 'move', 'done']);
assert.strictEqual(luana.bad_publicity, 0);

const horizon = c.cardSet[36058];
const iceServer = {root: [], ice: [horizon]};
corp.remoteServers = [iceServer]; installed = [horizon]; horizon.rezzed = true;
c.CheckTrash = card => card.trashable !== false;
c.CheckCardType = (card, types) => types.includes(card.cardType);
c.CheckCredits = (player, amount) => player.creditPool + (player.temporaryCredits || 0) >= amount;
c.ChoicesInstalledCards = (player, filter) => installed.filter(card => card.player === player && (!filter || filter(card))).map(card => ({card}));
c.SpendCredits = (player, amount) => {player.creditPool -= amount;};
let ended = 0;
c.EndTheRun = () => {ended++;};
c.Trash = (card, preventable, callback, context) => {
  installed = installed.filter(x => x !== card);
  if (callback) callback.call(context, [card]);
};
assert.strictEqual(horizon.abilities[0].Enumerate.call(horizon).length, 0);
c.attackedServer = corp.HQ;
assert.strictEqual(horizon.abilities[0].Enumerate.call(horizon).length, 0);
c.attackedServer = iceServer;
assert.strictEqual(horizon.abilities[0].Enumerate.call(horizon).length, 1);
horizon.trashable = false;
assert.strictEqual(horizon.abilities[0].Enumerate.call(horizon).length, 0);
horizon.trashable = true;
horizon.subroutines[0].Resolve.call(horizon);
decisions.pop().choose({id: 0});
assert.strictEqual(decisions.length, 0, 'no programs means no target decision');
const program = {title: 'Installed breaker', player: runner, cardType: 'program'};
installed.push(program);
horizon.subroutines[0].Resolve.call(horizon);
decisions.pop().choose({id: 1});
assert.strictEqual(runner.creditPool, 2);
assert(installed.includes(program));
horizon.subroutines[0].Resolve.call(horizon);
assert.strictEqual(decisions[0].choices.length, 1, 'payment is absent when unaffordable');
decisions.shift().choose({id: 0});
const targetDecision = decisions.shift();
assert.strictEqual(targetDecision.player, corp);
assert.strictEqual(targetDecision.choices[0].card, program);
targetDecision.choose({card: program});
assert(!installed.includes(program));
horizon.subroutines[1].Resolve.call(horizon);
decisions.shift().choose({id: 0}); assert.strictEqual(ended, 1);
horizon.abilities[0].Resolve.call(horizon);
assert.strictEqual(ended, 2); assert(!installed.includes(horizon));

// Reload the updated card definitions while retaining the harness.
vm.runInContext(fs.readFileSync(path.join(root, 'sets/vantagepoint.js'), 'utf8'), c);
const wheel = c.cardSet[36059];
c.Draw = (player, amount) => {draws += amount;};
c.GainCredits = (player, amount) => {player.creditPool += amount;};
const creditsBeforeWheel = corp.creditPool;
wheel.subroutines[0].Resolve.call(wheel);
decisions.shift().choose({id: 1});
wheel.subroutines[1].Resolve.call(wheel);
decisions.shift().choose({id: 0});
assert.strictEqual(corp.creditPool, creditsBeforeWheel + 2);
assert.strictEqual(draws, 2, 'each credit is mandatory, each draw optional');

// Exercise the real HQ ability discovery and Corp command/card selectors.
const saved = {...c};
vm.runInContext(fs.readFileSync(path.join(root, 'utility.js'), 'utf8'), c);
const real = {ChoicesTriggerableAbilities: c.ChoicesTriggerableAbilities,
  ChoicesAbility: c.ChoicesAbility, ActiveCards: c.ActiveCards};
Object.assign(c, saved, real);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8') + '\nthis.ai = new CorpAI();', c);
const ai = c.ai; ai._log = () => {};
c.InstalledCards = player => installed.filter(card => card.player === player);
c.RezzedCardsIn = cards => cards.filter(card => card.rezzed);
corp.identityCard = {title: 'Test Corp'}; runner.identityCard = {title: 'Test Runner'};
c.AgendaPoints = () => 0; c.AgendaPointsToWin = () => 7;
c.Strength = card => card.strength || 0;
c.CheckAdvance = card => card.cardType === 'agenda';
c.CheckScore = (card, ignoreAdvancement) => card.cardType === 'agenda' && installed.includes(card) &&
  (ignoreAdvancement || card.advancement >= card.advancementRequirement);
c.ChoicesActiveTriggers = () => [];
c.PlayerCanLook = (player, card) => player === card.player || !!card.rezzed || !!card.faceUp;
c.CheckTags = () => false;
c.Credits = player => player.creditPool;
c.AvailableCredits = player => player.creditPool;
c.RezCost = card => card.rezCost;
c.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
c.CheckHasAbilities = () => true;
c.CheckActionClicks = (player, amount) => {c.checkedClick = true; return c.currentPhase.identifier === 'Corp 2.2' && player.clickTracker >= amount;};
c.MaxHandSize = () => 5;
c.CheckRunning = () => !!c.attackedServer;
c.executingCommand = '';
c.CheckCredits = (player, amount) => player.creditPool >= amount;
c.ChoicesArrayCards = (cards, filter) => cards.filter(card => !filter || filter(card)).map(card => ({card}));
const tocsin = c.cardSet[36060];
const barrier = {title: 'Barrier', player: corp, cardType: 'ice', subTypes: ['Barrier'], rezCost: 2, elo: 1700};
const sentry = {title: 'Sentry', player: corp, cardType: 'ice', subTypes: ['Sentry'], rezCost: 3, elo: 1800};
const filler = {title: 'Filler', cardType: 'operation', subTypes: [], elo: 1500};
corp.HQ.cards = [tocsin]; tocsin.cardLocation = corp.HQ.cards;
corp.RnD.cards = [barrier, sentry, filler, {...filler}];
corp.creditPool = 4; corp.clickTracker = 3; installed = [];
c.currentPhase = {identifier: 'Corp 2.2', title: "Corporation's Action Phase"};
corp.AI = ai;
let triggers = c.ChoicesTriggerableAbilities(corp);
tocsin.abilities.push({text: 'Installed-only test ability', Enumerate: () => [{}]});
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 1,
  'HQ discovery does not activate unmarked abilities on the same card');
tocsin.abilities.pop();
assert.strictEqual(triggers.length, 1);
assert.strictEqual(triggers[0].card, tocsin);
assert.strictEqual(ai.Choice(['trigger', 'n'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToTrigger, tocsin);
c.executingCommand = 'trigger';
assert.strictEqual(ai.Choice(triggers, 'select'), 0);
c.executingCommand = '';
let shuffles = 0, revealed = [];
c.Shuffle = cards => {assert.strictEqual(cards, corp.RnD.cards); shuffles++;};
c.Reveal = (card, callback, context) => {revealed.push(card); callback.call(context);};
c.MoveCard = (card, destination) => {
  if (card.cardLocation) card.cardLocation.splice(card.cardLocation.indexOf(card), 1);
  destination.push(card); card.cardLocation = destination;
};
barrier.cardLocation = corp.RnD.cards; sentry.cardLocation = corp.RnD.cards;
c.SpendClicks = (player, amount) => {player.clickTracker -= amount;};
c.SpendCredits = (player, amount, reason, source, callback, context) => {player.creditPool -= amount; if (callback) callback.call(context);};
c.Trash = (card, preventable, callback, context) => {
  assert.strictEqual(preventable, false);
  c.MoveCard(card, corp.archives.cards);
  if (callback) callback.call(context, [card]);
};
triggers[0].ability.Resolve.call(tocsin);
assert.strictEqual(corp.clickTracker, 2); assert.strictEqual(corp.creditPool, 3);
assert.strictEqual(revealed[0], tocsin);
let search = decisions.shift();
assert.strictEqual(search.choices[ai.Choice(search.choices, 'select')].card, barrier);
search.choose({card: barrier});
search = decisions.shift();
assert.strictEqual(search.choices[ai.Choice(search.choices, 'select')].card, sentry);
search.choose({card: sentry});
assert.strictEqual(shuffles, 1);
assert.deepStrictEqual(revealed, [tocsin, barrier, sentry]);
assert(corp.HQ.cards.includes(barrier) && corp.HQ.cards.includes(sentry));
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'trash removes HQ ability');
corp.HQ.cards = [tocsin]; tocsin.cardLocation = corp.HQ.cards;
corp.RnD.cards = [filler];
c.currentPhase = {identifier: 'Corp 2.2'};
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'AI declines empty/unsafe searches');
corp.AI = null;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 1, 'human may search and fail to find');
c.currentPhase = {identifier: 'Run 3.1'};
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'click cost forbids mid-run expend');
c.currentPhase = {identifier: 'Corp 2.2'}; corp.creditPool = 0;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'cannot afford expend');
corp.creditPool = 8;
tocsin._searchIce();
search = decisions.shift(); search.choose({card: null});
search = decisions.shift(); search.choose({card: null});
assert.strictEqual(shuffles, 2, 'failed search still shuffles');

// Event Horizon selects its real paid ability only at the final useful window.
const liveHorizon = c.cardSet[36058];
const prize = {title: 'Winning agenda', player: corp, cardType: 'agenda', agendaPoints: 2};
const threatened = {root: [prize], ice: [liveHorizon]};
corp.remoteServers = [threatened]; installed = [liveHorizon, prize];
liveHorizon.rezzed = true;
c.AgendaPoints = player => player === runner ? 5 : 0;
c.AgendaPointsToWin = () => 7;
c.attackedServer = threatened; c.approachIce = -1;
c.currentPhase = {identifier: 'Run 4.5', title: 'Movement'};
corp.AI = ai; ai.preferred = null;
triggers = c.ChoicesTriggerableAbilities(corp);
assert.strictEqual(triggers.length, 1);
assert.strictEqual(ai.Choice(['trigger', 'n'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToTrigger, liveHorizon);
c.executingCommand = 'trigger';
assert.strictEqual(triggers[ai.Choice(triggers, 'select')].card, liveHorizon);
c.executingCommand = '';
assert.strictEqual(ai._globalETRUses(threatened), 1, 'planner sees the same one-shot defense');
c.approachIce = 0;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'preserve ICE until final window');
c.approachIce = -1; threatened.root = [];
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'decline when no winning agenda is threatened');
assert.strictEqual(ai._globalETRUses(threatened), 0);
c.attackedServer = null;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0, 'expired run cannot trigger');

// Luana is found by the real generic rez selector, outside the fixed EOT list.
const liveLuana = c.cardSet[36057];
const luanaServer = {root: [liveLuana], ice: []};
corp.remoteServers = [luanaServer]; installed = [liveLuana];
corp.badPublicity = 1; corp.creditPool = 8;
corp.RnD.cards = [filler, {...filler}, {...filler}];
c.CheckRez = (card, types) => !card.rezzed && types.includes(card.cardType);
c.FullCheckRez = (card, types) => c.CheckRez(card, types) && c.CheckCredits(corp, c.RezCost(card));
c.currentPhase = {identifier: 'Runner 2.2', title: 'Runner turn ends'};
ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToRez, liveLuana);
c.executingCommand = 'rez';
assert.strictEqual(ai.Choice([{card: liveLuana}], 'select'), 0);
c.executingCommand = ''; corp.badPublicity = 0; ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1, 'no bad publicity means no economy rez');
corp.badPublicity = 1;
corp.RnD.cards = [filler];
ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1,
  'Luana is not rezzed for income that would consume the mandatory draw');
liveLuana.rezzed = true;
c.currentPhase = {title: liveLuana.title};
let luanaTurnChoices = liveLuana.responseOnCorpTurnBegins.Enumerate.call(liveLuana);
assert.strictEqual(luanaTurnChoices[ai.Choice(luanaTurnChoices, 'select')].id, 0,
  'Luana declines drawing the last R&D card before the mandatory draw');
corp.RnD.cards.push({...filler});
luanaTurnChoices = liveLuana.responseOnCorpTurnBegins.Enumerate.call(liveLuana);
assert.strictEqual(luanaTurnChoices[ai.Choice(luanaTurnChoices, 'select')].id, 1,
  'two cards leave one for the mandatory draw');
// Luana uses the existing protected remote instead of creating an exposed one.
const emptyIncomeRemote = {root: [], ice: [liveHorizon]};
corp.remoteServers = [emptyIncomeRemote]; installed = [liveHorizon];
corp.HQ.cards = [liveLuana]; liveLuana.cardLocation = corp.HQ.cards;
corp.RnD.cards = [filler, {...filler}, {...filler}];
ai.preferred = null;
const incomeInstallChoices = [{card: liveLuana, server: null}, {card: liveLuana, server: emptyIncomeRemote}];
assert.strictEqual(ai._bestInstallOption(incomeInstallChoices), 1,
  'bad-publicity removal and income survive behind existing ICE');

// Flywheel's draw preferences are consumed by the real option selector.
corp.RnD.cards = [filler, {...filler}, {...filler}]; corp.HQ.cards = [];
wheel.subroutines[0].Resolve.call(wheel);
let drawDecision = decisions.shift();
assert.strictEqual(drawDecision.choices[ai.Choice(drawDecision.choices, 'select')].id, 1);
drawDecision.choose({id: 1});
corp.RnD.cards = [filler, {...filler}];
wheel.subroutines[1].Resolve.call(wheel);
drawDecision = decisions.shift();
assert.strictEqual(drawDecision.choices[ai.Choice(drawDecision.choices, 'select')].id, 1,
  'with two cards left, draw one and preserve the mandatory draw');
drawDecision.choose({id: 1});
corp.RnD.cards = [filler];
wheel.subroutines[1].Resolve.call(wheel);
drawDecision = decisions.shift();
assert.strictEqual(drawDecision.choices[ai.Choice(drawDecision.choices, 'select')].id, 0,
  'decline drawing the final card before the mandatory draw');
drawDecision.choose({id: 0});
corp.HQ.cards = [filler, filler, filler, filler, filler];
corp.RnD.cards.push({...filler});
wheel.subroutines[0].Resolve.call(wheel);
drawDecision = decisions.shift();
assert.strictEqual(drawDecision.choices[ai.Choice(drawDecision.choices, 'select')].id, 0, 'decline hand overflow');
drawDecision.choose({id: 0});

// Sacrifice Zone's advancement target is used by the actual planner/selector.
const liveAgenda = c.cardSet[36056];
corp.remoteServers = [{root: [liveAgenda], ice: []}];
liveAgenda.advancement = 1;
assert.strictEqual(ai._advancementStillRequired(liveAgenda), 3);
c.executingCommand = 'advance'; ai.preferred = null;
assert.strictEqual(ai.Choice([{card: liveAgenda}], 'select'), 0);
liveAgenda.advancement = 4;
assert.strictEqual(ai._cardNeedsAdvancement(liveAgenda), false, 'AI does not overadvance for counter income');
c.executingCommand = '';

// Scoring income is counted once per turn, including after counter placement.
corp.creditPool = 1; corp.clickTracker = 3; corp.HQ.cards = [];
liveAgenda.advancement = 1; liveAgenda.advancedThisTurn = false;
installed = [liveAgenda];
assert.strictEqual(ai._potentialAdvancement(liveAgenda, 4, true), 3,
  'one starting credit plus the first-advance income completes the agenda');
assert.strictEqual(corp.creditPool, 1); assert.strictEqual(liveAgenda.advancedThisTurn, false);
liveAgenda.advancedThisTurn = true;
assert.strictEqual(ai._potentialAdvancement(liveAgenda, 4, true), 1,
  'income already collected cannot be collected again in the plan');
assert.strictEqual(ai._potentialAdvancement(liveAgenda, 4, false, undefined, 3), 3,
  'the next turn resets the income opportunity and honours the three-click budget');
liveAgenda.advancedThisTurn = false;
const placed = {corpCredits: 1, corpClicks: 3, handCards: [], advancementSoFar: 2, persist: []};
let advances = ai._potentialAdvancementDirections(placed, {card: liveAgenda, limit: 4});
assert.strictEqual(advances[0].corpCredits, 3, 'placed counters do not consume first-advance income');
advances = ai._potentialAdvancementDirections(advances[0], {card: liveAgenda, limit: 4});
assert.strictEqual(advances[0].corpCredits, 2, 'a second basic advance only spends one credit');
c.attackedServer = corp.HQ; runner.grip = [filler]; c.playerTurn = runner;
let damageChoices = liveAgenda.responseOnRunSuccessful.Enumerate.call(liveAgenda);
ai.preferred = null;
assert.strictEqual(damageChoices[ai.Choice(damageChoices, 'select')].id, 0,
  'preserve the counter needed to score in three clicks next turn');
liveAgenda.advancement = 2;
damageChoices = liveAgenda.responseOnRunSuccessful.Enumerate.call(liveAgenda);
assert.strictEqual(damageChoices[ai.Choice(damageChoices, 'select')].id, 1,
  'damage is useful when spending the counter still permits scoring next turn');
liveAgenda.advancement = 4;
damageChoices = liveAgenda.responseOnRunSuccessful.Enumerate.call(liveAgenda);
assert.strictEqual(damageChoices[ai.Choice(damageChoices, 'select')].id, 0,
  'do not postpone scoring a completed agenda for attrition damage');
runner.grip = [];
damageChoices = liveAgenda.responseOnRunSuccessful.Enumerate.call(liveAgenda);
assert.strictEqual(damageChoices[ai.Choice(damageChoices, 'select')].id, 1,
  'immediate flatline takes priority over preserving a score');
liveAgenda.advancement = 1;
c.executingCommand = ''; ai.preferred = null;
assert.strictEqual(ai._bestMainPhaseEconomyOption(['gain', 'advance']), 1);
assert.strictEqual(ai.preferred.cardToAdvance, liveAgenda,
  'the net two-credit advance competes with a one-credit economy click');

// Expend is setup: it must not consume a click needed for a winning score.
corp.HQ.cards = [tocsin]; tocsin.cardLocation = corp.HQ.cards;
corp.RnD.cards = [barrier, sentry, filler, {...filler}];
corp.creditPool = 4; corp.clickTracker = 3; c.playerTurn = corp; c.attackedServer = null;
c.currentPhase = {identifier: 'Corp 2.2', title: "Corporation's Action Phase"};
liveAgenda.advancement = 3;
c.AgendaPoints = player => player === corp ? 5 : 0;
ai.preferred = null;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 1, 'expend remains a legal competing option');
assert.strictEqual(ai.Choice(['trigger', 'advance', 'gain', 'n'], 'command'), 1,
  'advance the winning agenda before searching for defenders');
assert.strictEqual(ai.preferred.cardToAdvance, liveAgenda);
corp.clickTracker = 1;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0,
  'do not spend the last click tutoring ICE that cannot be installed this turn');
corp.clickTracker = 3; corp.creditPool = 4;
corp.RnD.cards = [barrier, filler, {...filler}];
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 1,
  'a three-card deck safely supports finding one defender and leaving two cards');
corp.creditPool = 2;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0,
  'the expend credit must leave enough to rez the fetched defender');
corp.clickTracker = 3; corp.creditPool = 8;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0,
  'keep affordable Tocsin as a defender instead of replacing it');

// Search prefers a stopping defender over higher-ELO economy-only ICE.
corp.creditPool = 4;
const taxingSentry = {...sentry, title: 'Economy-only sentry', elo: 2400,
  subroutines: [{text: 'Gain 1[c].'}]};
const stoppingSentry = {...sentry, title: 'Stopping sentry', elo: 1500,
  subroutines: [{text: 'End the run.'}]};
corp.RnD.cards = [taxingSentry, stoppingSentry, filler, {...filler}];
tocsin._searchIce();
search = decisions.shift(); search.choose({card: null});
search = decisions.shift(); ai.preferred && assert.strictEqual(ai.preferred.option.card, stoppingSentry);
assert.strictEqual(search.choices[ai.Choice(search.choices, 'select')].card, stoppingSentry);
search.choose({card: null});

// Protect a non-winning agenda on the Runner's last click as well.
corp.remoteServers = [threatened]; threatened.root = [prize]; installed = [liveHorizon, prize];
c.AgendaPoints = () => 0; c.playerTurn = runner; runner.clickTracker = 0;
c.attackedServer = threatened; c.approachIce = -1;
c.currentPhase = {identifier: 'Run 4.5', title: 'Movement'}; ai.preferred = null;
assert.strictEqual(ai.Choice(['trigger', 'n'], 'command'), 0,
  'sacrifice saves an agenda when the Runner cannot rerun this turn');
runner.clickTracker = 2; ai.preferred = null;
assert.strictEqual(c.ChoicesTriggerableAbilities(corp).length, 0,
  'preserve recurring ICE when a non-winning breach can immediately be repeated');
threatened.root = []; c.playerTurn = corp; runner.grip = [];

// Complete-run modelling must still see Event Horizon after it was passed.
vm.runInContext(fs.readFileSync(path.join(root, 'runcalculator.js'), 'utf8') + '\nthis.rc = new RunCalculator();', c);
const rc = c.rc; rc.suppressOutput = true; rc._log = () => {};
vm.runInContext(fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8') + '\nthis.runnerAI = new RunnerAI();', c);
runner.AI = c.runnerAI; runner.AI.rc = rc; runner.AI._log = () => {};
c.PlayerCanLook = (player, card) => !!card.rezzed;
c.Strength = card => card.strength;
corp.remoteServers = [threatened]; installed = [liveHorizon];
c.attackedServer = threatened;
const afterIce = {server: threatened, incomplete: false, startIceIdx: -1,
  doInnerLoop: false, approachOptions: [{credits: 0, clicks: 0, effects: []}],
  damageLimit: Infinity, clickLimit: 4, poolCreditLimit: 9, otherCredits: 0, tagLimit: Infinity};
rc.baseClicks = 4; rc.basePoolCredits = 9;
rc.CalculatePieceEnd(afterIce);
assert.strictEqual(rc.paths.length, 1, 'finite sacrifice permits an affordable ordinary rerun');
assert.strictEqual(rc.paths[0].at(-1).runner_clicks_spent, 1, 'reserve the extra run click');
rc.CalculatePieceEnd({...afterIce, clickLimit: 0});
assert.strictEqual(rc.paths.length, 0, 'a last-click run cannot outlast the sacrifice');
liveHorizon.rezzed = false;
rc.CalculatePieceEnd(afterIce);
assert.strictEqual(rc.paths.length, 1, 'unrezzed ICE cannot use its paid ability');
liveHorizon.rezzed = true;
rc.CalculatePieceEnd({...afterIce, incomplete: true});
assert.strictEqual(rc.paths.length, 1, 'encounter-only planning does not erase incomplete routes');
runner.AI = null;
rc.CalculatePieceEnd(afterIce);
assert.strictEqual(rc.paths.length, 1, 'Corp planning uses finite ETR capacity separately');
wheel.rezzed = true; tocsin.rezzed = true;
c.encountering = false;
const iceModel = rc.IceAI(wheel, 2, false, false, 0, corp);
assert.strictEqual(iceModel.sr.length, 2);
assert.strictEqual(ai._iceHasETR(wheel), false, 'economy ICE is never an ETR lockout');
const tocsinModel = rc.IceAI(tocsin, 8, false, false, 0, corp);
rc.precalculated.iceAIs = [tocsinModel];
const point = rc.EmptyPoint(0);
point.sr_broken = [{idx: 1}, {idx: 2}];
const route = rc.Directions({}, point, Infinity, Infinity, 4, 9, 0, Infinity, false).find(p => p.iceIdx === -1);
assert.strictEqual(route.runner_credits_lost, 2, 'Tocsin drains two pool credits through the real run calculator');

vm.runInContext('this.runnerAI = new RunnerAI();', c);
runner.AI = c.runnerAI; runner.AI.rc = rc; runner.AI._log = () => {};
const publicAgenda = c.cardSet[36056];
publicAgenda.advancement = 1; publicAgenda.automaticOnInstall.Resolve.call(publicAgenda, publicAgenda);
const publicHome = {root: [publicAgenda], ice: []};
corp.remoteServers = [publicHome]; installed = [publicAgenda];
c.PlayerCanLook = (player, card) => !!card.rezzed || !!card.faceUp;
c.attackedServer = null;
const open = {root: [], ice: []};
assert.strictEqual(rc.Calculate(open, 4, 9, 0, 0, Infinity, false, null).length, 0,
  'successful run on another server cannot survive mandatory meat damage with empty grip');
assert(rc.Calculate(open, 4, 9, 0, 1, Infinity, false, null).length > 0);
publicAgenda.usedThisTurn = true;
assert(rc.Calculate(open, 4, 9, 0, 0, Infinity, false, null).length > 0,
  'used once-per-turn damage no longer taxes the run');
publicAgenda.usedThisTurn = false;
assert(rc.Calculate(publicHome, 4, 9, 0, 0, Infinity, false, null).length > 0,
  'own server is exempt from the successful-run damage');

// Finite ETR plans pay for a second traversal without mutating the server.
const toll = {title: 'Public two-credit toll', player: corp, cardType: 'ice',
  rezzed: true, strength: 0, subTypes: ['Code Gate'], rezCost: 0, subroutines: [{text: 'Pay 2[c].'}],
  AIImplementIce: (calculator, result) => {result.sr = [[['payCredits', 'payCredits']]]; return result;}};
threatened.root = []; threatened.ice = [liveHorizon, toll];
corp.remoteServers = [threatened]; installed = [liveHorizon, toll];
corp.badPublicity = 0; runner.rig.programs = []; c.attackedServer = null;
liveHorizon.rezzed = true; c.playerTurn = runner;
let finitePaths = rc.Calculate(threatened, 3, 6, 0, Infinity, Infinity, false, null);
assert.strictEqual(finitePaths.length, 0, 'five credits for attempt one plus two for rerun exceed six');
finitePaths = rc.Calculate(threatened, 3, 7, 0, Infinity, Infinity, false, null);
assert(finitePaths.length > 0, 'seven pool credits fund both traversals');
let finiteBest = finitePaths.reduce((a, b) => rc.PathCost(a) <= rc.PathCost(b) ? a : b);
assert.strictEqual(finiteBest.at(-1).runner_credits_reserved, 2,
  'rerun pays the other ICE but never pays the trashed Horizon again');
assert.strictEqual(threatened.ice.length, 2); assert(threatened.ice.includes(liveHorizon));
corp.badPublicity = 1;
assert(rc.Calculate(threatened, 3, 5, 1, Infinity, Infinity, false, null).length > 0,
  'each run receives its own bad-publicity credit');
assert.strictEqual(rc.Calculate(threatened, 3, 4, 1, Infinity, Infinity, false, null).length, 0,
  'fresh bad-publicity credits still cannot substitute for five required pool credits');
corp.badPublicity = 0;
const secondHorizon = {...liveHorizon};
threatened.ice = [liveHorizon, secondHorizon]; installed = [liveHorizon, secondHorizon];
assert.strictEqual(rc.Calculate(threatened, 1, 20, 0, Infinity, Infinity, false, null).length, 0,
  'two independent sacrifices require two additional run clicks');
assert(rc.Calculate(threatened, 2, 20, 0, Infinity, Infinity, false, null).length > 0,
  'both finite sacrifices can be exhausted');

// Successful-run damage applies to the eventual breach, not the stopped run.
threatened.ice = [liveHorizon]; publicAgenda.usedThisTurn = false; publicAgenda.advancement = 1;
corp.remoteServers = [threatened, publicHome]; installed = [liveHorizon, publicAgenda];
assert.strictEqual(rc.Calculate(threatened, 3, 9, 0, 0, Infinity, false, null).length, 0);
finitePaths = rc.Calculate(threatened, 3, 9, 0, 1, Infinity, false, null);
assert(finitePaths.length > 0);
assert.strictEqual(rc.TotalDamage(rc.TotalEffect(finitePaths[0].at(-1))), 1,
  'only the successful rerun triggers Sacrifice Zone damage');
corp.remoteServers = [threatened];

// Real Runner option selection follows the calculator's OR branches.
threatened.ice = [liveHorizon]; installed = [liveHorizon]; runner.creditPool = 9;
c.attackedServer = threatened; c.approachIce = 0; c.subroutine = 1;
c.GetApproachEncounterIce = () => liveHorizon;
finitePaths = rc.Calculate(threatened, 3, 9, 0, Infinity, Infinity, false, null);
finiteBest = finitePaths.reduce((a, b) => rc.PathCost(a) <= rc.PathCost(b) ? a : b);
runner.AI.cachedBestPath = finiteBest; runner.AI.cachedPathServer = threatened;
runner.AI.cachedComplete = true; runner.AI.preferred = null;
c.currentPhase = {identifier: 'Run Subroutines', title: 'Subroutines'};
liveHorizon.subroutines[0].Resolve.call(liveHorizon);
let payment = decisions.shift();
assert.strictEqual(payment.choices[await runner.AI.SelectChoice(payment.choices)].id, 0,
  'do not pay to protect a program when none exists');
payment.choose({id: 0});
const valuableProgram = {title: 'Installed killer', player: runner, cardType: 'program',
  subTypes: [], strength: 0};
installed = [liveHorizon, valuableProgram]; runner.rig.programs = [valuableProgram];
finitePaths = rc.Calculate(threatened, 3, 9, 0, Infinity, Infinity, false, null);
finiteBest = finitePaths.reduce((a, b) => rc.PathCost(a) <= rc.PathCost(b) ? a : b);
runner.AI.cachedBestPath = finiteBest; runner.AI.cachedPathServer = threatened;
runner.AI.cachedComplete = true; runner.AI.preferred = null; c.subroutine = 1;
c.currentPhase = {identifier: 'Run Subroutines', title: 'Subroutines'};
liveHorizon.subroutines[0].Resolve.call(liveHorizon);
payment = decisions.shift();
assert.strictEqual(payment.choices[await runner.AI.SelectChoice(payment.choices)].id, 1,
  'the calculated route pays three to preserve an installed program');
payment.choose({id: 1});
installed = [liveHorizon]; runner.rig.programs = [];
runner.creditPool = 2; c.subroutine = 2;
const incompletePaths = rc.Calculate(threatened, 3, 2, 0, Infinity, Infinity, true, null);
assert(incompletePaths.length > 0);
runner.AI.cachedBestPath = incompletePaths.reduce((a, b) => rc.PathCost(a) <= rc.PathCost(b) ? a : b);
runner.AI.cachedPathServer = threatened; runner.AI.cachedComplete = false;
c.currentPhase = {identifier: 'Run Subroutines', title: 'Subroutines'};
liveHorizon.subroutines[1].Resolve.call(liveHorizon);
payment = decisions.shift();
assert.strictEqual(payment.choices.length, 1);
assert.strictEqual(await runner.AI.SelectChoice(payment.choices), 0,
  'model decline branch one maps to menu index zero when payment is unaffordable');
payment.choose({id: 0});

// The real trash/prevention pipeline waits for Luana's interrupt and responses.
const beforePipeline = {...c};
vm.runInContext(fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8'), c);
const realTrash = c.Trash, realBadPublicity = c.BadPublicity;
Object.assign(c, beforePipeline, {Trash: realTrash, BadPublicity: realBadPublicity});
runner.AI = null; corp.AI = null;
installed = [liveLuana]; liveLuana.rezzed = true; liveLuana.bad_publicity = 2;
corp.badPublicity = 0;
c.intended = {};
c.AutomaticTriggers = () => {};
c.GetApproachEncounterIce = () => null;
c.PlayerTrashPile = player => player === corp ? corp.archives.cards : [];
let preventionDone, responsesDone;
const interruptOrder = [];
c.OpportunityForAvoidPrevent = (player, name, args, callback) => {
  assert.strictEqual(name, 'responsePreventableAddBadPublicity');
  assert(installed.includes(liveLuana)); interruptOrder.push('prevention'); preventionDone = callback;
};
c.TriggeredResponsePhase = (player, name, args, callback) => {
  if (name === 'responseOnTakeBadPublicity') {
    assert(installed.includes(liveLuana));
    interruptOrder.push('bad publicity response'); responsesDone = callback;
  } else callback();
};
c.MoveCard = card => {assert.strictEqual(card, liveLuana); installed = []; interruptOrder.push('uninstall');};
c.Trash(liveLuana, false, () => interruptOrder.push('trash complete'));
assert.deepStrictEqual(interruptOrder, ['prevention']);
assert.strictEqual(liveLuana.bad_publicity, 0, 'the hosted counters are consumed once');
c.intended.badPublicity = 1; // prevent one of the two counters
preventionDone();
assert.strictEqual(corp.badPublicity, 1);
assert.deepStrictEqual(interruptOrder, ['prevention', 'bad publicity response']);
responsesDone();
assert.deepStrictEqual(interruptOrder, ['prevention', 'bad publicity response', 'uninstall', 'trash complete']);

console.log('Vantage Point Batch 12 checks passed.');
}
main().catch(error => {console.error(error); process.exitCode = 1;});
