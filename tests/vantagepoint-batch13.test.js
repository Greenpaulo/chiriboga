// Run with: node tests/vantagepoint-batch13.test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
const corp = {side: 'corp', creditPool: 15, clickTracker: 3, badPublicity: 0,
  HQ: {serverName: 'HQ', cards: [], root: [], ice: []},
  RnD: {serverName: 'R&D', cards: [], root: [], ice: []},
  archives: {serverName: 'Archives', cards: [], root: [], ice: []},
  remoteServers: [], scoreArea: [], resolvingCards: [], installingCards: [], identityCard: {title: 'Corp'}};
const runner = {side: 'runner', creditPool: 5, temporaryCredits: 0, clickTracker: 4, tags: 0,
  grip: [{}, {}, {}, {}, {}], stack: [], heap: [], scoreArea: [], resolvingCards: [],
  rig: {programs: [], resources: [], hardware: []}, identityCard: {title: 'Runner'}, AI: null};
let decisions = [], damage = 0;
const c = {globalProperties: {agendaPointsToWin: 7}, console, corp, runner, cardSet: [], setIdentifiers: [], playerTurn: corp,
  attackedServer: null, approachIce: -1, encountering: false, intended: {},
  accessedCards: {root: [], cards: []}, currentPhase: {identifier: 'Corp 2.2', title: "Corporation's Action Phase"},
  activePlayer: corp, viewingPlayer: corp, executingCommand: '', Log: () => {}, LogError: message => {throw Error(message);},
  UpdateCounters: () => {}, Render: () => {}, PlaySound: () => {},
};
vm.createContext(c);
for (const file of ['config.js', 'utility.js', 'checks.js', 'mechanics.js', 'ai_corp.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
vm.runInContext('this.ai = new CorpAI(); ai._log = function () {};', c);
const ai = c.ai;
corp.AI = ai;
c.Log = () => {}; c.UpdateCounters = () => {}; c.Render = () => {};
c.GetTitle = card => card.title;
c.InstalledCards = player => player === corp ? [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers).flatMap(s => s.root.concat(s.ice)) : Object.values(runner.rig).flat();
c.ActiveCards = player => {
  const cards = p => c.InstalledCards(p).filter(card => p === runner || card.rezzed || card.faceUp).concat(p.scoreArea, p.resolvingCards, p.identityCard);
  return player ? cards(player) : cards(corp).concat(cards(runner));
};
c.ChoicesActiveTriggers = name => Array.from(new Set(c.ActiveCards().concat(corp.HQ.cards, corp.RnD.cards, corp.archives.cards, c.InstalledCards(corp)))).filter(card => card[name] && (c.ActiveCards().includes(card) || card[name].availableWhenInactive)).map(card => ({card}));
c.CheckHasAbilities = card => !card.disabled;
c.CheckActionClicks = (p, n) => c.currentPhase.identifier === 'Corp 2.2' && p.clickTracker >= n;
c.MaxHandSize = () => 5;
c.PlayerCanLook = (p, card) => p === card.player || !!card.rezzed || !!card.faceUp;
c.DecisionPhase = (player, choices, callback, title, instruction, context) => {
  const d = {player, choices, title, choose: params => callback.call(context, params)};
  decisions.push(d); c.currentPhase = {identifier: c.currentPhase.identifier, title}; return d;
};
c.MoveCard = (card, destination, position) => {
  if (card.cardLocation) {const i = card.cardLocation.indexOf(card); if (i >= 0) card.cardLocation.splice(i, 1);}
  if (position == null) destination.push(card); else destination.splice(position, 0, card);
  card.cardLocation = destination;
};
c.Damage = (type, amount, preventable) => {assert.strictEqual(type, 'meat'); assert(preventable); damage += amount;};
const put = (card, location) => {card.player = corp; card.cardLocation = location; location.push(card); return card;};
const action = () => {c.currentPhase = {identifier: 'Corp 2.2', title: "Corporation's Action Phase"}; c.executingCommand = ''; ai.preferred = null;};
const myoshu = c.cardSet[36061];
put(myoshu, corp.HQ.cards);
assert.strictEqual(myoshu.Enumerate().length, 0);
const fresh = {player: corp, cardType: 'agenda', agendaPoints: 2};
myoshu.automaticOnInstall.Resolve.call(myoshu, fresh);
c.intended.score = fresh; myoshu.responseOnScored.Resolve.call(myoshu);
assert.strictEqual(myoshu.Enumerate().length, 0, 'same-turn install does not enable Myōshu');
c.intended.score = {player: corp, cardType: 'agenda', agendaPoints: 2};
myoshu.responseOnScored.Resolve.call(myoshu);
assert.strictEqual(myoshu.Enumerate().length, 1);
corp.scoreArea = [{agendaPoints: 5}]; corp.creditPool = 10;
action();
assert.strictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0, 'spend final ten credits for an immediate win');
assert.strictEqual(ai.preferred.cardToPlay, myoshu);
c.executingCommand = 'play';
assert.strictEqual(ai.Choice([{card: myoshu}], 'select'), 0);
corp.scoreArea = []; corp.creditPool = 15;
action();
assert.strictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0, 'bank points during an expiring score window');
const defense = {player: corp, cardType: 'ice', title: 'Expensive defense', rezCost: 8, strength: 5, subTypes: ['Barrier'], subroutines: [{text: 'End the run.'}]};
put(defense, corp.HQ.ice); put({...fresh, title: 'HQ agenda'}, corp.HQ.cards);
assert.strictEqual(myoshu.AIWouldPlay(), false, 'reserve credits for defending exposed agendas');
action(); assert.notStrictEqual(ai.Choice(["play", "gain", "draw"], "command"), 0, "real selector preserves the rez reserve");
corp.creditPool = 9; action();
assert.notStrictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0, 'unaffordable point purchase is declined');
myoshu.responseOnRunnerTurnBegins.Resolve.call(myoshu);
corp.creditPool = 15; action();
assert.notStrictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0, 'expired scoring window is declined');
myoshu.responseOnCorpTurnBegins.Resolve.call(myoshu);
assert.strictEqual(myoshu.cardsInstalledThisTurn.length, 0);
myoshu.Resolve();
assert(corp.scoreArea.includes(myoshu)); assert.strictEqual(myoshu.agendaPoints, 2);
// Reanimation shares its ten-credit discount across installation and rez.
corp.HQ.cards = []; corp.HQ.ice = []; corp.scoreArea = []; corp.remoteServers = [];
corp.creditPool = 5; action();
const protocol = c.cardSet[36062]; put(protocol, corp.HQ.cards);
const archived = put({title: 'Liability defender', cardType: 'ice', subTypes: ['Barrier', 'Liability'],
  rezCost: 12, strength: 6, elo: 1800, rezzed: false, subroutines: [{text: 'End the run.'}]}, corp.archives.cards);
corp.HQ.ice.push({...defense, rezzed: true});
assert(protocol._choices(3).some(choice => choice.card === archived && choice.server === corp.HQ && choice.cost === 3));
assert.strictEqual(protocol.Enumerate().length, 1);
corp.creditPool = 1; assert.strictEqual(protocol.Enumerate().length, 0);
corp.creditPool = 5;
// Drive actual installation payment callbacks and discounted Rez responses;
// rendering/phase progression is provided by the headless harness.
const realInstall = c.Install, realRez = c.Rez;
let installArgs, rezArgs;
c.Install = (...args) => {installArgs = args;}; c.Rez = (...args) => {rezArgs = args;};
c.MoveCard(protocol, corp.resolvingCards); protocol.Resolve(); decisions.shift().choose({card: archived, server: corp.HQ});
assert.strictEqual(c.InstallCost(archived, corp.HQ), 0);
installArgs[5].call(protocol); // measure after optional install trashing
assert.strictEqual(c.InstallCost(archived, corp.HQ), 0);
installArgs[8].call(protocol); // payment complete: remove only install discount
assert.strictEqual(protocol.installingIce, null);
c.MoveCard(archived, corp.HQ.ice); installArgs[10].call(protocol);
assert.strictEqual(rezArgs[5], 9, 'one installation credit uses one of the ten discounted credits');
assert.strictEqual(rezArgs[4], false, 'mandatory rez cannot be cancelled');
let pubs = 0; c.BadPublicity = n => {pubs += n;};
rezArgs[6].call(protocol); assert.strictEqual(pubs, 0);
archived.subTypes = ['Barrier']; rezArgs[6].call(protocol); assert.strictEqual(pubs, 1);
c.Install = realInstall; c.Rez = realRez;
// Free cheap ICE still consumes only the printed total discount; costs floor at zero.
protocol.installingIce = archived;
assert.strictEqual(c.InstallCost(archived, corp.RnD), 0);
protocol.installingIce = null;
c.MoveCard(protocol, corp.HQ.cards);
// Real command/card/target selection recurs a stopping defender for exposed HQ.
corp.HQ.ice = []; corp.archives.cards = []; c.MoveCard(archived, corp.archives.cards);
put({...fresh, title: 'Exposed agenda'}, corp.HQ.cards);
archived.rezCost = 8; corp.creditPool = 5; action();
assert.strictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToPlay, protocol);
c.executingCommand = 'play'; assert.strictEqual(ai.Choice([{card: protocol}], 'select'), 0);
c.Install = (...args) => {installArgs = args;};
protocol.Resolve(); const recurDecision = decisions.shift();
const recurIndex = ai.Choice(recurDecision.choices, 'select');
assert.strictEqual(recurDecision.choices[recurIndex].card, archived);
assert.strictEqual(recurDecision.choices[recurIndex].server, corp.HQ);
recurDecision.choose(recurDecision.choices[recurIndex]); protocol.installingIce = null; c.Install = realInstall;
put({title: 'Cheap HQ alternative', cardType: 'ice', subTypes: ['Barrier'], rezCost: 1,
  strength: 1, elo: 1400, subroutines: [{text: 'End the run.'}]}, corp.HQ.cards);
assert.strictEqual(protocol.AIWouldPlay(), false, 'one-credit HQ ICE beats paying two to recur');
// Economy: ordinary plays prefer clean income; Vulture is used when it is the
// affordable burst option and yields seven net credits before taking publicity.
corp.HQ.cards = []; corp.HQ.ice = []; corp.archives.cards = [];
corp.creditPool = 7; action(); const vulture = c.cardSet[36063]; put(vulture, corp.HQ.cards);
assert.strictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToPlay, vulture);
c.executingCommand = 'play'; assert.strictEqual(ai.Choice([{card: vulture}], 'select'), 0);
c.GainCredits = (p, n) => {p.creditPool += n;};
corp.creditPool -= 7; vulture.Resolve(); assert.strictEqual(corp.creditPool, 14); assert.strictEqual(pubs, 2);
corp.creditPool = 6; action();
assert.notStrictEqual(ai.Choice(['gain', 'draw'], 'command'), -1);
assert.strictEqual(c.FullCheckPlay(vulture), null);
// Existing economy policy ranks Hedge Fund ahead of bad-publicity income.
const hedge = put({title: 'Hedge Fund', cardType: 'operation', playCost: 5, subTypes: []}, corp.HQ.cards);
corp.creditPool = 7; action();
assert.strictEqual(ai.Choice(['play', 'gain', 'draw'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToPlay, hedge);
// Flagship limits all other accesses, including the central root, and only
// its access limit persists after a Runner access-trash (CR 9.12.5).
corp.HQ.cards = []; corp.HQ.root = []; corp.HQ.ice = []; runner.rig.programs = [];
const flagship = c.cardSet[36064]; put(flagship, corp.HQ.root); flagship.rezzed = true;
const renderer = {zoomed: false}; flagship.renderer = renderer;
const centralCard = put({...fresh, title: 'Central agenda', renderer}, corp.HQ.cards);
const otherRoot = put({title: 'Other upgrade', cardType: 'upgrade', renderer}, corp.HQ.root);
c.attackedServer = corp.HQ; c.accessedCards = {cards: [], root: []};
assert(flagship.unique); assert(!c.CheckInstallDestination(flagship, corp.archives));
assert(!c.CheckInstallDestination(flagship, null)); assert(c.CheckInstallDestination(flagship, corp.RnD));
assert.strictEqual(c.ModifyingTriggers('modifyDeclareSuccess', null, 0), 1);
assert.strictEqual(c.ChoicesAccess().length, 3, 'choose central card or either root card first');
flagship.disabled = true; c.accessedCards.root.push(otherRoot);
assert.strictEqual(c.ChoicesAccess().length, 2, 'blanked installed upgrade cannot restrict accesses');
flagship.disabled = false; c.accessedCards.root = [];
c.accessedCards.root.push(otherRoot);
assert.deepStrictEqual(Array.from(c.ChoicesAccess(), o => o.card), [flagship], 'root access consumes the other-card allowance');
c.accessedCards = {cards: [centralCard], root: []};
assert.deepStrictEqual(Array.from(c.ChoicesAccess(), o => o.card), [flagship]);
c.accessingCard = flagship;
flagship.automaticOnWouldTrash.Resolve.call(flagship, [flagship]);
c.MoveCard(flagship, corp.archives.cards);
assert.strictEqual(c.ModifyingTriggers('modifyDeclareSuccess', null, 0), 0, 'success suppression is not persistent');
assert.strictEqual(c.ChoicesAccess().length, 0, 'access limit persists after trashing Flagship');
flagship.automaticOnRunEndCleanup.Resolve.call(flagship);
assert.strictEqual(c.ChoicesAccess().length, 1, 'cleanup restores other accesses');
c.MoveCard(flagship, corp.HQ.root); flagship.rezzed = false; c.accessedCards = {cards: [], root: []};
assert.strictEqual(c.ChoicesAccess().length, 3, 'unrezzed Flagship does not constrain access');
flagship.rezzed = true;
const multiaccess = {player: runner, cardType: 'program', title: 'Public multi-access',
  AICentralPressure: server => server === corp.HQ ? {additionalAccess: 2, persistentPressure: 1} : {},
  AIAdditionalAccess: server => server === corp.HQ ? 2 : 0};
runner.rig.programs = [multiaccess];
put({...fresh, title: "Second HQ card", renderer}, corp.HQ.cards);
put({...fresh, title: "Third HQ card", renderer}, corp.HQ.cards);
flagship.rezzed = false; assert.strictEqual(ai._centralServerThreat(corp.HQ).additionalAccess, 2);
corp.creditPool = 3; c.currentPhase = {identifier: 'Run 4.5', title: 'Run: Movement'};
c.executingCommand = ''; ai.preferred = null; c.attackedServer = corp.HQ;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 0, 'rez Flagship before public multi-access');
assert.strictEqual(ai.preferred.cardToRez, flagship);
c.executingCommand = 'rez'; assert.strictEqual(ai.Choice([{card: flagship}], 'select'), 0);
corp.creditPool = 2; c.executingCommand = ''; ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1, 'preserve credits when the upgrade is unaffordable');
corp.creditPool = 3;

flagship.rezzed = true; assert.strictEqual(ai._centralServerThreat(corp.HQ).additionalAccess, 0);
assert.strictEqual(ai._centralServerThreat(corp.HQ).persistentPressure, 0);
assert.strictEqual(ai._centralServerThreat(corp.RnD).additionalAccess, 0);
vm.runInContext(fs.readFileSync(path.join(root, 'runcalculator.js'), 'utf8'), c);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8') + '\nthis.runnerAI = new RunnerAI(); runnerAI._log = function () {};', c);
runner.AI = c.runnerAI;
assert.strictEqual(c.runnerAI._additionalHQAccessValue(), 0, 'Runner planner sees no multi-access value');
assert(c.runnerAI._rootKnownToContainCopyOfCard(corp.HQ, 'Crisium Grid'), 'existing successful-run benefit consumers recognize Flagship');
flagship.rezzed = false;
assert.strictEqual(c.runnerAI._additionalHQAccessValue(), 2, 'ordinary HQ multi-access returns when protection is inactive');
flagship.rezzed = true;
assert.strictEqual(c.ServerAccessLimit(corp.RnD), Infinity);
runner.AI = null; runner.rig.programs = []; c.attackedServer = null;
console.log('Vantage Point batch 13 tests passed');
