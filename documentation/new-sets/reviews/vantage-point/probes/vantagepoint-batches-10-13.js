const assert = require('assert'); const fs = require('fs'); const vm = require('vm'); const path = require('path'); const root = path.resolve(__dirname, '../../../../..');
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

const magistrate = c.cardSet[36048];
put(magistrate, corp.HQ.root);
c.playerTurn = runner;
for (const identifier of ['Runner 2.2', 'Corp 2.2*']) {
  c.currentPhase = {identifier, title:'Paid window'}; ai.preferred = null;
  assert(c.FullCheckRez(magistrate, ['asset']));
  assert.strictEqual(ai.Choice(['rez','n'],'command'), 1);
}
// Public winning agenda in R&D: paying 2 to rez makes an empty-pool Runner unable to steal.
const prize = {...c.cardSet[36047]}; put(prize, corp.RnD.cards);
runner.creditPool = 0; runner.scoreArea = [{agendaPoints:5}];
c.attackedServer = corp.RnD; c.approachIce = -1;
c.currentPhase = {identifier:'Run 4.5',title:'Movement'}; ai.preferred = null;
assert.strictEqual(ai.Choice(['rez','n'],'command'), 1);
// Editorial's inline tutor goes through the real target consumer and Corp selector.
const editorial=c.cardSet[36046];
corp.identityCard=editorial; editorial.tookBadPublicityThisTurn=false;
corp.HQ.cards=[]; corp.RnD.cards=[];
put(c.cardSet[36063],corp.RnD.cards);
put(c.cardSet[36062],corp.RnD.cards);
put({...c.cardSet[36047]},corp.RnD.cards);
c.currentPhase={identifier:'Response',title:editorial.title}; ai.preferred=null;
let editorialChoices=editorial.responseOnTakeBadPublicity.Enumerate.call(editorial);
assert.strictEqual(editorialChoices[ai.Choice(editorialChoices,'select')].card,c.cardSet[36063]);
corp.RnD.cards=[c.cardSet[36063]];
editorialChoices=editorial.responseOnTakeBadPublicity.Enumerate.call(editorial);
assert.strictEqual(editorialChoices[ai.Choice(editorialChoices,'select')].card,null);
// Nihilo's useful legal discard-end rez is selected by the actual phase handler.
corp.identityCard={title:'Corp'}; corp.HQ.root=[];
const nihilo=c.cardSet[36049]; put(nihilo,corp.HQ.root);
c.currentPhase={identifier:'Corp 3.2',title:'Discard phase end'}; ai.preferred=null;
assert(c.FullCheckRez(nihilo,['asset']));
assert.strictEqual(ai.Choice(['rez','n'],'command'),0);
c.executingCommand='rez'; assert.strictEqual(ai.Choice([{card:nihilo}],'select'),0);
c.executingCommand=''; corp.HQ.root=[]; corp.RnD.cards=[];
// Run-calculator successful-run meat damage should be preventable by Crash Space.
vm.runInContext(fs.readFileSync(path.join(root,'runcalculator.js'),'utf8') + '\nthis.rc = new RunCalculator();',c);
vm.runInContext(fs.readFileSync(path.join(root,'ai_runner.js'),'utf8') + '\nthis.runnerAI = new RunnerAI();',c);
const rc=c.rc; rc.suppressOutput=true; rc._log=()=>{};
runner.AI=c.runnerAI; runner.AI.rc=rc; runner.AI._log=()=>{};
c.coreSet=[]; vm.runInContext(fs.readFileSync(path.join(root,'sets/coreset.js'),'utf8'),c);
const crash=c.coreSet[1030]; runner.rig.resources=[crash]; crash.cardLocation=runner.rig.resources;
const zone=c.cardSet[36056]; zone.faceUp=true; zone.advancement=1;
const home={root:[],ice:[]}; corp.remoteServers=[home]; put(zone,home.root);
corp.HQ.root=[]; corp.HQ.ice=[]; corp.RnD.cards=[]; runner.scoreArea=[]; runner.grip=[];
c.attackedServer=null; c.currentPhase={identifier:'Runner 1.3',title:'Runner action'};
assert.strictEqual(c.PublicMeatDamagePrevention(),3);
const routes=rc.Calculate(corp.HQ,4,5,0,0,Infinity,false,null);
assert.strictEqual(routes.length,0,'current bug: preventable meat is modelled as net and rejects the safe route');
zone.usedThisTurn=true;
assert(rc.Calculate(corp.HQ,4,5,0,0,Infinity,false,null).length>0);
console.log('Review probes confirmed: Magistrate skipped in useful rez windows; Sacrifice Zone meat misclassified as net.');

zone.usedThisTurn = true; corp.badPublicity=2; runner.creditPool=5;
vm.runInContext(fs.readFileSync(path.join(root,'sets/systemgateway.js'),'utf8'),c);
const mayfly=c.cardSet[30032]; runner.rig.resources=[]; runner.rig.programs=[mayfly]; mayfly.cardLocation=runner.rig.programs;
const wall=c.cardSet[30072]; wall.rezzed=true; put(wall,home.ice); zone.advancement=4; zone.knownToRunner=true; runner.scoreArea=[{agendaPoints:5}]; runner.stack=[{title:"Economy event"}];
c.playerTurn=corp; c.attackedServer=null; c.currentPhase={identifier:'Corp 2.2',title:'Scapegoat'};
const scapegoat=c.cardSet[36054]; scapegoat.Resolve();
const mode=decisions.shift(); const chosen=await runner.AI._computeChoice(mode.choices,'select');
assert.strictEqual(mode.choices[chosen].id,1,'current preference sacrifices the only low-install-cost breaker');
// Taking away two bad publicity still leaves five credits: Mayfly pumps three times and breaks once through remote Palisade.
corp.badPublicity=0;
runner.AI.cachedPotentials = [{server:home,potential:3}];
assert(rc.Calculate(home,4,5,0,5,Infinity,false,null).length>0);
runner.rig.programs=[]; corp.badPublicity=2;
assert.strictEqual(rc.Calculate(home,4,5,2,5,Infinity,false,null).length,0);
console.log('Scapegoat counterexample: actual Runner selector shuffles its only Mayfly; removing bad publicity preserves a funded breach.');

// Lethe's real optional recursion selects top draws, buries agendas, and declines an empty pile.
corp.identityCard={title:'Corp'}; corp.scoreArea=[]; corp.creditPool=15; corp.HQ.cards=[];
corp.archives.cards=[]; runner.rig.programs=[]; runner.rig.resources=[]; c.attackedServer=null;
const lethe=c.cardSet[36051];
for (const [archived,bottom] of [[c.cardSet[36063],false],[c.cardSet[36047],true],[null,null]]) {
  corp.archives.cards=archived?[archived]:[];
  c.currentPhase={identifier:'Run Subroutines',title:lethe.title};
  lethe.subroutines[0].Resolve.call(lethe);
  const d=decisions.pop(); const choice=d.choices[ai.Choice(d.choices,'select')];
  assert.strictEqual(choice.card,archived);
  if (archived) assert.strictEqual(choice.bottom,bottom);
}
// Return uses the actual public threat consumer and selector with competing installed cards.
runner.rig.programs=[mayfly]; mayfly.cardLocation=runner.rig.programs;
runner.rig.resources=[crash]; crash.cardLocation=runner.rig.resources;
c.currentPhase={identifier:'Run Subroutines',title:lethe.title};
lethe.subroutines[1].Resolve.call(lethe);
let d=decisions.pop(); assert.strictEqual(d.choices[ai.Choice(d.choices,'select')].card,mayfly);
corp.remoteServers=[];
lethe.subroutines[1].Resolve.call(lethe);
d=decisions.pop(); assert.strictEqual(d.choices[ai.Choice(d.choices,'select')].card,crash,'without threatened ICE, return higher investment rather than a redundant breaker');
runner.rig.programs=[]; runner.rig.resources=[];
lethe.subroutines[1].Resolve.call(lethe); assert.strictEqual(decisions.length,0,'empty-rig Lethe creates no target decision');
// Compare ordinary scoring, holding with no resource, and immediate winning advance for actual Witch Hunt.
const witch=c.cardSet[36047]; witch.advancement=3; witch.rezzed=false; witch.canBeAdvanced=true;
const witchHome={root:[],ice:[]}; put(wall,witchHome.ice); corp.remoteServers=[witchHome]; put(witch,witchHome.root);
corp.HQ.root=[]; corp.HQ.ice=[]; corp.archives.cards=[]; corp.HQ.cards=[];
corp.RnD.cards=[{cardType:'operation'}, {cardType:'operation'}, {cardType:'operation'}];
corp.scoreArea=[{agendaPoints:5}]; corp.creditPool=4; corp.clickTracker=1;
c.playerTurn=corp; c.attackedServer=null; action();
assert.strictEqual(ai.Choice(['advance','gain','n'],'command'),0);
assert.strictEqual(ai.preferred.cardToAdvance,witch);
const phaseSource=fs.readFileSync(path.join(root,'phase.js'),'utf8');
c.phaseTemplates={corpScorableResponse:{Enumerate:{}}};
vm.runInContext(phaseSource.slice(phaseSource.indexOf('phaseTemplates.corpScorableResponse.Enumerate.score ='),phaseSource.indexOf('phaseTemplates.corpScorableResponse.Resolve.score =')),c);
witch.advancement=4; ai.preferred=null;
assert.strictEqual(ai.Choice(['score','gain','n'],'command'),0);
witch.advancement=3; corp.creditPool=0; action();
assert.notStrictEqual(ai.Choice(['gain','n'],'command'),-1);
// Nihilo gives way to declared funded economy at EOT rather than consuming the only rez credit.
const usefulLuana=c.cardSet[36057]; usefulLuana.rezzed=false;
corp.remoteServers=[]; corp.HQ.root=[]; put(nihilo,corp.HQ.root); put(usefulLuana,corp.HQ.root);
corp.badPublicity=1; corp.creditPool=1; corp.scoreArea=[];
c.playerTurn=runner; c.currentPhase={identifier:'Runner 2.2',title:'Runner turn ends'}; ai.preferred=null;
assert.strictEqual(ai.Choice(['rez','n'],'command'),0);
assert.strictEqual(ai.preferred.cardToRez,usefulLuana);
corp.creditPool=0; assert.strictEqual(c.FullCheckRez(nihilo,['asset']),false);
console.log('Additional real consumers: Lethe recursion/return, Witch Hunt winning advancement/score, and Nihilo competing economy rez.');
// Grubber shrinks its live payment menu but omits stable model-branch IDs.
const grubber=c.cardSet[36050]; grubber.rezzed=true; corp.HQ.ice=[]; put(grubber,corp.HQ.ice);
runner.rig.programs=[]; runner.scoreArea=[]; corp.remoteServers=[]; runner.creditPool=0; runner.temporaryCredits=0;
corp.badPublicity=0; runner.grip=[{},{},{},{},{}];
c.playerTurn=runner; c.attackedServer=corp.HQ; c.approachIce=0; c.subroutine=1; c.encountering=true;
c.currentPhase={identifier:'Run Subroutines',title:grubber.title};
runner.AI.cachedPathServer=corp.HQ;
runner.AI.cachedBestPath=rc.Calculate(corp.HQ,4,0,0,5,Infinity,true,null);
// Use the actual incomplete path, which chooses the end-the-run model branch.
assert(runner.AI.cachedBestPath.length>0);
runner.AI.cachedBestPath=runner.AI.cachedBestPath[0];
runner.AI.cachedComplete=false;
grubber.subroutines[0].Resolve.call(grubber);
const grubberDecision=decisions.pop();
assert.strictEqual(grubberDecision.choices.length,1);
const selected=await runner.AI._computeChoice(grubberDecision.choices,'select');
assert.strictEqual(selected,0,'sole unaffordable-payment option is selected safely');
runner.creditPool=6;
runner.AI.cachedComplete=true;
runner.AI.cachedBestPath=rc.Calculate(corp.HQ,4,6,0,5,Infinity,false,null)[0];
assert(runner.AI.cachedBestPath);
grubber.subroutines[0].Resolve.call(grubber);
const payGrubber=decisions.pop();
assert.strictEqual(payGrubber.choices[(await runner.AI._computeChoice(payGrubber.choices,'select'))].id,1);
console.log('Grubber real selector pays a funded complete route and chooses ETR with no payment available.');
}
main().catch(e=>{ console.error(e); process.exitCode=1; });
