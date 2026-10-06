// Run with: node tests/vantagepoint-batch13.test.js
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');
async function main() {
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
c.CardEffectsForbid = () => false;
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
// Shackleton: actual payment source choice and the cost-paid response checkpoint.
corp.HQ.cards = []; corp.HQ.root = []; corp.HQ.ice = []; corp.scoreArea = [];
const shackleton = c.cardSet[36065]; put(shackleton, corp.HQ.root); shackleton.rezzed = true;
c.playerTurn = runner; c.attackedServer = corp.HQ; c.approachIce = 0;
runner.creditPool = 6; runner.temporaryCredits = 2; runner.AI = null;
const hosted = {player: runner, title: 'Hosted run credits', credits: 10,
  cardType: 'hardware', subTypes: ['Stealth'], canUseCredits: () => true};
runner.rig.hardware = [hosted];
let spendEvents = [], finished = 0;
c.TriggeredResponsePhase = (player, name, params, after, title) => {
  assert.strictEqual(name, 'responseOnCreditsSpent');
  spendEvents.push({params, after, title});
};
c.SpendCredits(runner, 2, 'using', {}, () => finished++);
let payment = decisions.shift();
assert.strictEqual(runner.temporaryCredits, 2, 'temporary credits are optional when they trigger damage');
assert(payment.choices.some(option => option.temporary));
payment.choose(payment.choices.find(option => option.card === null));
payment = decisions.shift(); payment.choose(payment.choices.find(option => option.card === null));
assert.strictEqual(finished, 1); assert.strictEqual(spendEvents.length, 0);
assert.strictEqual(hosted.credits, 10); assert.strictEqual(runner.temporaryCredits, 2);
c.SpendCredits(runner, 2, 'using', {}, () => finished++);
payment = decisions.shift(); payment.choose(payment.choices.find(option => option.temporary));
payment = decisions.shift(); payment.choose(payment.choices.find(option => option.card === null));
assert.strictEqual(finished, 1, 'continuation waits until spend responses finish');
assert.strictEqual(spendEvents.length, 1); assert.strictEqual(spendEvents[0].params[1], 1);
let event = spendEvents.shift(); c.currentPhase = {title: event.title, identifier: 'Run 3.1'};
let damageChoices = shackleton.responseOnCreditsSpent.Enumerate.apply(shackleton, event.params);
const damageChoice = damageChoices[ai.Choice(damageChoices, 'select')];
assert.strictEqual(damageChoice.id, 1, 'Corp takes the damage opportunity through its real selector');
shackleton.responseOnCreditsSpent.Resolve.call(shackleton, damageChoice);
assert(shackleton.usedThisTurn); assert.strictEqual(damage, 4); event.after();
assert.strictEqual(finished, 2);
assert.strictEqual(shackleton.responseOnCreditsSpent.Enumerate.call(shackleton, runner, 1).length, 0);
shackleton.responseOnRunnerTurnBegins.Resolve.call(shackleton);
damageChoices = shackleton.responseOnCreditsSpent.Enumerate.call(shackleton, runner, 1);
shackleton.responseOnCreditsSpent.Resolve.call(shackleton, {id: 0});
assert(!shackleton.usedThisTurn, 'declining does not consume the once-per-turn opportunity');
assert.strictEqual(shackleton.responseOnCreditsSpent.Enumerate.call(shackleton, runner, 0).length, 0);
assert.strictEqual(shackleton.responseOnCreditsSpent.Enumerate.call(shackleton, corp, 1).length, 0);
c.SpendHostedCredits(runner, hosted, 1, () => finished++);
assert.strictEqual(hosted.credits, 9); assert.strictEqual(spendEvents.length, 1);
spendEvents.shift().after(); assert.strictEqual(finished, 3);
// The real calculator compares safe pool-only routes with damage-bearing routes.
const etrIce = put({title: 'Two-credit barrier', cardType: 'ice', rezzed: true,
  rezCost: 1, strength: 3, subTypes: ['Barrier'], subroutines: [{text: 'End the run.'}],
  AIImplementIce: (rc, result) => {result.sr = [[['endTheRun']]]; return result;}}, corp.HQ.ice);
const breaker = {title: 'Two-credit breaker', player: runner, cardType: 'program',
  strength: 3, subTypes: ['Icebreaker', 'Fracter'],
  AIImplementBreaker: function (rc, result, point, server, strength, iceAI, iceStrength, clicksLeft, creditsLeft) {
    return result.concat(rc.ImplementIcebreaker(point, this, strength, iceAI, iceStrength, ['Barrier'], 1, 1, 2, 1, creditsLeft));
  }};
runner.rig.programs = [breaker]; runner.grip = [{}, {}, {}]; runner.temporaryCredits = 0;
runner.AI = c.runnerAI; const rc = runner.AI.rc; rc.suppressOutput = true;
let routes = rc.Calculate(corp.HQ, 3, 6, 10, 3, 0, false, null);
assert(routes.length > 0, 'a safe pool-only run exists despite lethal outside spending');
assert(routes.every(route => route.at(-1).paymentPoolOnly));
assert(routes.every(route => rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 0));
assert.strictEqual(rc.Calculate(corp.HQ, 3, 1, 10, 3, 0, false, null).length, 0,
  'insufficient pool and lethal outside credits cannot reach the server');
routes = rc.Calculate(corp.HQ, 3, 1, 10, 4, 0, false, null);
assert(routes.length > 0, 'four damage is survivable with four cards');
assert(routes.some(route => !route.at(-1).paymentPoolOnly && rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 4));
runner.grip = [{}, {}, {}, {}, {}];
routes = rc.Calculate(corp.HQ, 3, 6, 10, 5, 0, false, null);
const bestRoute = routes.at(-1); assert(bestRoute.at(-1).paymentPoolOnly, 'saving four cards beats free credits');
runner.AI.cachedBestPath = bestRoute; runner.AI.cachedPathServer = corp.HQ;
runner.creditPool = 6; runner.temporaryCredits = 2; hosted.credits = 10;
c.SpendCredits(runner, 2, 'using', breaker, () => finished++);
assert.strictEqual(runner.creditPool, 4); assert.strictEqual(hosted.credits, 10);
assert.strictEqual(runner.temporaryCredits, 2); assert.strictEqual(spendEvents.length, 0);
// A planned unavoidable outside payment pays normally and emits the trigger.
runner.AI.cachedBestPath = rc.Calculate(corp.HQ, 3, 1, 10, 5, 0, false, null).at(-1);
runner.creditPool = 1; c.SpendCredits(runner, 2, 'using', breaker, () => finished++);
assert.strictEqual(runner.temporaryCredits, 0); assert.strictEqual(spendEvents.length, 1);
spendEvents.shift().after();
shackleton.usedThisTurn = true;
routes = rc.Calculate(corp.HQ, 3, 1, 10, 0, 0, false, null);
assert(routes.length > 0, 'later runs in the turn do not pay damage again');
assert(routes.every(route => rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 0));
shackleton.responseOnCorpTurnBegins.Resolve.call(shackleton);
assert(!shackleton.usedThisTurn);
const asyncRoutes = await rc.CalculateAsync(corp.HQ, 3, 6, 10, 3, 0, false, null);
assert(asyncRoutes.length > 0 && asyncRoutes.every(route => route.at(-1).paymentPoolOnly));
// Public Corp security sees a safe pool route, rather than a permanent lockout.
runner.creditPool = 1; runner.clickTracker = 0; runner.grip = [{}, {}, {}];
c.attackedServer = corp.HQ;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true, 'lethal outside payment closes the underfunded route');
runner.creditPool = 6;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false, 'pool-funded route remains breachable');
runner.creditPool = 1; runner.grip = [{}, {}, {}, {}];
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false, 'survivable damage is deterrence, not an ETR');
// Repeated-run continuation consumes Shackleton's opportunity once, while
// preserving the actual board and the pool-only alternative.
const disposable = {...etrIce, title: 'Disposable paid stop', AIRunExtraRuns: () => 1};
corp.HQ.ice = [disposable]; disposable.cardLocation = corp.HQ.ice;
runner.grip = [{}, {}, {}, {}, {}]; runner.creditPool = 6; shackleton.usedThisTurn = false;
routes = rc.Calculate(corp.HQ, 3, 6, 10, 5, 0, false, null);
assert(routes.length > 0);
assert(routes.some(route => !route.at(-1).paymentPoolOnly && rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 4),
  'two runs take source damage once, not once per run');
assert(routes.some(route => route.at(-1).paymentPoolOnly && rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 0));
assert.strictEqual(shackleton.usedThisTurn, false, 'hypothetical continuation never changes the card');
corp.HQ.ice = [etrIce];
// Pool locks cannot finance the safe branch, even with a large printed pool.
const poolLock = {player: runner, cardType: 'resource', preventCreditPoolUse: () => true};
runner.rig.resources = [poolLock]; runner.grip = [{}, {}, {}]; runner.creditPool = 100;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 100, 10, 3, 0, false, null).length, 0);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true);
runner.rig.resources = [];
// Required stealth remains a distinct payment. A pool cannot replace it;
// restricted credits cannot finance ordinary breaks or the access trash cost.
const corsair = c.cardSet[36004]; runner.rig.programs = [corsair];
const restrictedStealth = {player: runner, cardType: 'hardware', title: 'Ability-only stealth',
  subTypes: ['Stealth'], credits: 1, canUseCredits: (doing, card) => doing === 'using' && card === null};
runner.rig.hardware = [restrictedStealth]; runner.creditPool = 4;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 4, 0, 3, 0, false, null).length, 0,
  'required stealth damage cannot be avoided by substituting the pool');
routes = rc.Calculate(corp.HQ, 3, 4, 0, 4, 0, false, null);
assert(routes.length > 0 && routes.every(route => !route.at(-1).paymentPoolOnly));
runner.grip = [{}, {}, {}, {}];
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'Corp agrees that Corsair can pay required stealth and survive Shackleton');
assert(routes.every(route => route.at(-1).restrictedCreditsSpent === 1 && rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 4));
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).deterrence, 4, 'count the route damage once');
runner.grip = [{}, {}, {}]; runner.creditPool = 100;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'a large pool cannot substitute for mandatory lethal stealth');
runner.rig.programs = [corsair, breaker];
assert.strictEqual(rc.Calculate(corp.HQ, 3, 100, 0, 3, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'an ordinary breaker supplies a legal safe pool alternative');
runner.rig.programs = [corsair]; runner.creditPool = 4; runner.grip = [{}, {}, {}, {}];
shackleton.usedThisTurn = true; runner.grip = [];
assert.strictEqual(rc.Calculate(corp.HQ, 3, 4, 0, 0, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'already-used damage does not exclude a subsequent stealth route');
shackleton.usedThisTurn = false; runner.grip = [{}, {}, {}, {}];

assert.strictEqual(rc.Calculate(corp.HQ, 3, 3, 0, 4, 0, false, null).length, 0,
  'restricted stealth does not fund the break and trash payment');
corp.HQ.ice = [etrIce, {...etrIce}];
assert.strictEqual(rc.Calculate(corp.HQ, 3, 100, 0, 4, 0, false, null).length, 0,
  'one stealth credit cannot reduce two different barriers');
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'Corp preserves required-credit exhaustion across ICE');
restrictedStealth.credits = 2;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 100, 0, 4, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'two real stealth credits fund two reductions, with only one damage trigger');
// A finite stop repeats the inner payment. A public forecast must carry
// consumed stealth and damage forward, without changing the actual board.
const repeatedOuter = {...etrIce, title: 'Finite outer stop', AIRunExtraRuns: () => 1};
corp.HQ.ice = [etrIce, repeatedOuter];
for (const ice of corp.HQ.ice) ice.cardLocation = corp.HQ.ice;
runner.clickTracker = 1; runner.creditPool = 6;
assert.strictEqual(rc.Calculate(corp.HQ, 1, 6, 0, 4, 0, false, null).length, 0);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'two reductions leave no third credit for the repeated inner ICE');
restrictedStealth.credits = 3;
assert.strictEqual(rc.Calculate(corp.HQ, 1, 6, 0, 4, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'three reductions and one repeat click reach the server with four damage total');
runner.clickTracker = 0;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true, 'no repeat click means no breach');
corp.HQ.ice = [etrIce]; etrIce.cardLocation = corp.HQ.ice;
restrictedStealth.credits = 1; runner.creditPool = 4;
// Corp-owned hidden ICE may be forecast only when the rez allocator funds it.
const unknownBarrier = {...etrIce, rezzed: false, rezCost: 5};
corp.HQ.ice = [unknownBarrier]; unknownBarrier.cardLocation = corp.HQ.ice;
runner.grip = [{}, {}, {}]; corp.creditPool = 5;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true, 'affordable hidden ICE requires lethal stealth');
corp.creditPool = 4;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false, 'unfunded ICE is omitted from the forecast');
corp.creditPool = 15; corp.HQ.ice = [etrIce]; etrIce.cardLocation = corp.HQ.ice;
runner.grip = [{}, {}, {}, {}];
const privateGrip = runner.grip;
runner.grip = new Proxy(privateGrip, {get(target, key) {
  if (/^\d+$/.test(String(key))) throw Error('Corp read a hidden Grip card');
  return Reflect.get(target, key);
}});
const forecastState = {pool: runner.creditPool, source: restrictedStealth.credits,
  used: shackleton.usedThisTurn, attacked: c.attackedServer, phase: c.currentPhase,
  path: runner.AI.cachedBestPath, pathServer: runner.AI.cachedPathServer};
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false);
assert.deepStrictEqual({pool: runner.creditPool, source: restrictedStealth.credits,
  used: shackleton.usedThisTurn, attacked: c.attackedServer, phase: c.currentPhase,
  path: runner.AI.cachedBestPath, pathServer: runner.AI.cachedPathServer}, forecastState,
  'forecast leaves counters, run state and the actual Runner plan unchanged');
runner.grip = privateGrip;
// Project a fresh opportunity next turn while retaining the used flag on the
// real card. An additional run this Runner turn retains the consumed trigger.
c.attackedServer = null; shackleton.usedThisTurn = true; runner.grip = [{}, {}, {}];
c.playerTurn = corp;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'next Runner turn restores Shackleton despite the current used flag');
c.playerTurn = runner;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'another run this turn retains the used damage opportunity');
assert.strictEqual(shackleton.usedThisTurn, true);
shackleton.usedThisTurn = false; runner.grip = [{}, {}, {}, {}];
c.playerTurn = runner; runner.creditPool = 0; runner.clickTracker = 1;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true, 'only click is reserved for initiating the run');
runner.clickTracker = 2;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false, 'a spare click can gain the ordinary break credit');
corp.HQ.ice = [etrIce, repeatedOuter];
for (const ice of corp.HQ.ice) ice.cardLocation = corp.HQ.ice;
runner.creditPool = 2; restrictedStealth.credits = 3;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'the same spare click cannot both gain a credit and initiate the repeated run');
runner.clickTracker = 3;
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'separate preparation and repeat clicks make the route feasible');
corp.HQ.ice = [etrIce]; etrIce.cardLocation = corp.HQ.ice;
restrictedStealth.credits = 1; runner.creditPool = 4; runner.clickTracker = 0;
c.attackedServer = corp.HQ; c.playerTurn = corp;


corp.HQ.ice = [etrIce]; runner.rig.programs = [breaker]; runner.rig.hardware = [hosted];
runner.creditPool = 1;
// Public one-shot meat prevention expands survivable routes and is consumed
// through the normal preventable Damage path, without changing printed damage.
c.coreSet = []; vm.runInContext(fs.readFileSync(path.join(root, 'sets/coreset.js'), 'utf8'), c);
const crashSpace = c.coreSet[1030]; runner.rig.resources = [crashSpace];
crashSpace.cardLocation = runner.rig.resources;
runner.grip = [{}]; runner.creditPool = 1;
assert.strictEqual(c.PublicMeatDamagePrevention(), 3);
routes = rc.Calculate(corp.HQ, 3, 1, 10, 1, 0, false, null);
assert(routes.length > 0 && routes.some(route => rc.TotalDamage(rc.TotalEffect(route.at(-1))) === 1));
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false, 'public prevention makes damage survivable');
runner.rig.programs = [corsair]; runner.rig.hardware = [restrictedStealth]; runner.creditPool = 4;
assert.strictEqual(rc.Calculate(corp.HQ, 3, 4, 0, 1, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'Corp includes public prevention on a mandatory-stealth route');
const meatInner = {...etrIce, AIImplementIce: (rc, result) => {
  result.sr = [[['endTheRun']]]; result.encounterEffects = [['meatDamage']]; return result;
}};
corp.HQ.ice = [meatInner, repeatedOuter];
for (const ice of corp.HQ.ice) ice.cardLocation = corp.HQ.ice;
restrictedStealth.credits = 3; runner.creditPool = 6; runner.clickTracker = 1;
runner.grip = [{}, {}];
assert.strictEqual(rc.Calculate(corp.HQ, 1, 6, 0, 2, 0, false, null).length, 0);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, true,
  'one-shot prevention cannot be reused for a repeated meat-damage encounter');
runner.grip = [{}, {}, {}];
assert.strictEqual(rc.Calculate(corp.HQ, 1, 6, 0, 3, 0, false, null).length > 0, true);
assert.strictEqual(ai._evaluateServerSecurity(corp.HQ).isSecure, false,
  'three cards cover first-run damage after prevention and the unprevented repeat');
assert(runner.rig.resources.includes(crashSpace), 'forecast never actually consumes prevention');
corp.HQ.ice = [etrIce]; etrIce.cardLocation = corp.HQ.ice;
runner.rig.programs = [breaker]; runner.rig.hardware = [hosted];
runner.creditPool = 1; runner.clickTracker = 0; runner.grip = [{}];

const stubDamage = c.Damage;
const damageSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
const damageFn = damageSource.slice(damageSource.indexOf('function Damage('), damageSource.indexOf('/**', damageSource.indexOf('function Damage(')));
vm.runInContext(damageFn, c);
c.OpportunityForAvoidPrevent = (player, name, params, after) => {
  assert.strictEqual(player, runner); assert.strictEqual(name, 'responsePreventableDamage');
  const prevention = crashSpace.responsePreventableDamage.Enumerate.call(crashSpace).find(choice => choice.prevent === 3);
  crashSpace.responsePreventableDamage.Resolve.call(crashSpace, prevention); after();
};
c.Trash = (cards, preventable, after, context) => {
  for (const card of Array.isArray(cards) ? cards : [cards]) c.MoveCard(card, card.player === runner ? runner.heap : corp.archives.cards);
  if (after) after.call(context);
};
runner.grip = [{player: runner, cardLocation: null}]; runner.grip[0].cardLocation = runner.grip;
shackleton.responseOnCreditsSpent.Resolve.call(shackleton, {id: 1});
assert.strictEqual(c.intended.damage, 1, 'printed four damage is reduced through real prevention');
assert.strictEqual(runner.grip.length, 0); assert(runner.heap.includes(crashSpace));
c.Damage = stubDamage; runner.rig.resources = [];
// Useful rez precedes payment; an already-used opportunity and an empty
// outside-credit budget both preserve the credit for other defense.
c.attackedServer = corp.HQ; c.approachIce = 0; runner.creditPool = 6; hosted.credits = 2;
corp.creditPool = 1; shackleton.rezzed = false; shackleton.usedThisTurn = false;
c.currentPhase = {identifier: 'Run 2.1', title: 'Run: Approaching Ice'}; c.executingCommand = ''; ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 0);
assert.strictEqual(ai.preferred.cardToRez, shackleton);
c.executingCommand = 'rez'; assert.strictEqual(ai.Choice([{card: shackleton}], 'select'), 0);
shackleton.usedThisTurn = true; c.executingCommand = ''; ai.preferred = null;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1);
shackleton.usedThisTurn = false; hosted.credits = 0; runner.temporaryCredits = 0;
assert.strictEqual(ai.Choice(['rez', 'n'], 'command'), 1);
// The real install ranking places the Region where passing ICE costs credits,
// rather than rejecting it after considering only an empty unprotected server.
c.MoveCard(shackleton, corp.HQ.cards); shackleton.rezzed = false;
corp.creditPool = 15; corp.clickTracker = 3; runner.creditPool = 1;
hosted.credits = 10; c.attackedServer = null; c.playerTurn = corp; action();
corp.remoteServers = []; corp.RnD.ice = []; corp.archives.ice = [];
const gridInstallOptions = [corp.RnD, corp.HQ, corp.archives].map(server => ({card: shackleton, server}));
assert.strictEqual(ai._bestInstallOption(gridInstallOptions), 1, 'funded paid defense is the useful placement');
hosted.credits = 0;
assert.strictEqual(ai._bestInstallOption(gridInstallOptions), -1, 'without outside credits hold the Region');
hosted.credits = 10; corp.HQ.root.push({cardType: 'upgrade', subTypes: ['Region']});
assert.strictEqual(ai._bestInstallOption(gridInstallOptions), -1, 'another Region rules out the useful server');
corp.HQ.root = [];
// Let Them Dream: search, reveal, shuffle only the searched deck, and bottom
// insertion use real card choices with the Corp's option selector.
c.attackedServer = null; c.playerTurn = corp; corp.HQ.root = []; corp.HQ.ice = [];
corp.HQ.cards = []; corp.RnD.cards = []; corp.archives.cards = []; corp.scoreArea = [];
corp.remoteServers = []; corp.creditPool = 8; corp.clickTracker = 2; action();
const dream = c.cardSet[36066]; put(dream, corp.scoreArea); c.intended.score = dream;
let shuffleCount = 0, revealedCards = [];
c.Shuffle = cards => {if (cards === corp.RnD.cards) shuffleCount++;};
c.Reveal = (card, after, context) => {revealedCards.push(card); after.call(context);};
const winningAgenda = put({...fresh, title: 'Fast winning agenda', advancementRequirement: 3, agendaPoints: 2}, corp.RnD.cards);
const slowAgenda = put({...fresh, title: 'Slow agenda', advancementRequirement: 5, agendaPoints: 3}, corp.RnD.cards);
const secureRemote = {serverName: 'Scoring remote', root: [], ice: [{...etrIce, rezCost: 8, strength: 8}]};
corp.remoteServers = [secureRemote]; runner.rig.programs = []; runner.rig.hardware = []; runner.creditPool = 0;
corp.scoreArea.push({agendaPoints: 3});
assert.strictEqual(dream.responseOnScored.Enumerate.call(dream).length, 1);
dream.responseOnScored.Resolve.call(dream);
let searchDecision = decisions.shift();
let index = ai.Choice(searchDecision.choices, 'select');
assert.strictEqual(searchDecision.choices[index].source, corp.RnD.cards);
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
index = ai.Choice(searchDecision.choices, 'select');
assert.strictEqual(searchDecision.choices[index].card, winningAgenda, 'fastest two-point agenda completes the winning scoring plan');
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
index = ai.Choice(searchDecision.choices, 'select');
assert.strictEqual(searchDecision.choices[index].destination, corp.HQ.cards);
searchDecision.choose(searchDecision.choices[index]);
assert.strictEqual(shuffleCount, 1); assert.strictEqual(revealedCards[0], winningAgenda);
assert(corp.HQ.cards.includes(winningAgenda));
// With no staging click, hide flooded HQ's slower agenda and retain the faster
// winning agenda. Searching HQ does not shuffle R&D.
c.MoveCard(slowAgenda, corp.HQ.cards);
corp.clickTracker = 0; action();
dream.responseOnScored.Resolve.call(dream);
searchDecision = decisions.shift(); index = ai.Choice(searchDecision.choices, 'select');
assert.strictEqual(searchDecision.choices[index].source, corp.HQ.cards);
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
assert(!searchDecision.choices.some(choice => choice.card === null), 'HQ must find an agenda when one exists');
index = ai.Choice(searchDecision.choices, 'select'); assert.strictEqual(searchDecision.choices[index].card, slowAgenda);
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
index = ai.Choice(searchDecision.choices, 'select'); assert.strictEqual(searchDecision.choices[index].destination, corp.RnD.cards);
searchDecision.choose(searchDecision.choices[index]);
assert.strictEqual(corp.RnD.cards[0], slowAgenda); assert.strictEqual(shuffleCount, 1);
// Archive rescue uses the bottom of R&D when HQ lacks a scoring opportunity.
const exposedAgenda = put({...fresh, title: 'Archive agenda', advancementRequirement: 4, faceUp: true}, corp.archives.cards);
dream.responseOnScored.Resolve.call(dream);
searchDecision = decisions.shift(); index = ai.Choice(searchDecision.choices, 'select');
assert.strictEqual(searchDecision.choices[index].source, corp.archives.cards);
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
index = ai.Choice(searchDecision.choices, 'select'); assert.strictEqual(searchDecision.choices[index].card, exposedAgenda);
searchDecision.choose(searchDecision.choices[index]); searchDecision = decisions.shift();
index = ai.Choice(searchDecision.choices, 'select'); searchDecision.choose(searchDecision.choices[index]);
assert.strictEqual(corp.RnD.cards[0], exposedAgenda); assert.strictEqual(shuffleCount, 1);
// Human decline and restricted-deck failure have distinct shuffle behavior.
corp.AI = null; dream.responseOnScored.Resolve.call(dream);
searchDecision = decisions.shift(); searchDecision.choose({source: null});
assert.strictEqual(shuffleCount, 1);
dream.responseOnScored.Resolve.call(dream); decisions.shift().choose({source: corp.RnD.cards});
searchDecision = decisions.shift(); searchDecision.choose(searchDecision.choices.find(choice => choice.card === null));
assert.strictEqual(shuffleCount, 2, 'failed R&D search still shuffles');
corp.archives.cards = [];
dream.responseOnScored.Resolve.call(dream); decisions.shift().choose({source: corp.archives.cards});
searchDecision = decisions.shift(); assert.strictEqual(searchDecision.choices.length, 1);
assert.strictEqual(searchDecision.choices[0].card, null); searchDecision.choose(searchDecision.choices[0]);
assert.strictEqual(shuffleCount, 2, 'empty Archives search does not shuffle R&D');
corp.AI = ai; corp.HQ.cards = []; corp.RnD.cards = []; corp.clickTracker = 0;
assert.strictEqual(dream.responseOnScored.Enumerate.call(dream).length, 0, 'AI declines a search with no useful target');
c.intended.score = winningAgenda;
assert.strictEqual(dream.responseOnScored.Enumerate.call(dream).length, 0, 'another agenda score cannot trigger this ability');
// Point value depends on the score-area owner, without corrupting printed
// metadata when the agenda moves between score areas.
corp.scoreArea = []; runner.scoreArea = []; c.MoveCard(dream, runner.scoreArea);
assert.strictEqual(c.AgendaPoints(runner), 1); assert.strictEqual(dream.agendaPoints, 2);
c.MoveCard(dream, corp.scoreArea); assert.strictEqual(c.AgendaPoints(corp), 2);
corp.AI = ai; corp.HQ.cards = [dream]; dream.cardLocation = corp.HQ.cards;
corp.HQ.ice = []; corp.scoreArea = []; runner.scoreArea = [{agendaPoints: 5}];
assert.strictEqual(ai._centralBreachLossRisk(corp.HQ).probability, 0, 'Let Them Dream cannot supply two missing Runner points');
runner.scoreArea = [{agendaPoints: 6}];
assert.strictEqual(ai._centralBreachLossRisk(corp.HQ).probability, 1, 'one missing Runner point can still win');
console.log('Vantage Point batch 13 tests passed');

}
main().catch(error => {console.error(error); process.exitCode = 1;});
