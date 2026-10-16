// Run with: node tests/vantagepoint-batch4.test.js
// Actual engine, decision selectors and calculators for batch 4 remediation.
// UI/audio are inert; gameplay and AI paths are loaded from production files.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const verbose = !!process.env.VERBOSE;

// ---- headless engine: real engine files, browser globals stubbed ----
const stub = new Proxy(function() {}, {
  get: (target, key) => key === Symbol.toPrimitive ? () => 0 : key === 'length' ? 0 : stub,
  apply: () => stub, construct: () => stub,
});
const extend = (deep, target, ...sources) => {
  if (typeof deep !== 'boolean') { sources.unshift(target); target = deep; deep = false; }
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && value && typeof value === 'object' ?
      extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
const jQuery = () => stub;
jQuery.extend = extend;
const context = {
  console: {log() {}, warn() {}, error: verbose ? console.error : () => {}},
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  cardSet: [], setIdentifiers: [], accessibilityMode: 'text',
  $: jQuery, jQuery, PIXI: stub, document: stub, navigator: {userAgent: 'node'},
  localStorage: {getItem: () => null, setItem() {}}, Image: function() {}, Audio: function() { return stub; },
  location: {search: '', href: '', hostname: 'localhost'},
};
context.window = context;
vm.createContext(context);
vm.runInContext('if (!String.prototype.replaceAll) String.prototype.replaceAll = function(a, b) { return this.split(a).join(b); };', context);
const files = ['deck/seedrandom.min.js', 'config.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js',
  'utility.js', 'sets/systemgateway.js', 'sets/midnightsun.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js',
  'decks.js', 'runcalculator.js', 'ai_corp.js', 'ai_runner.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
const run = code => vm.runInContext(code, context);

// Player state as Init() prepares it, then a small board. Tāo Salonga with
// Cleaver and Buzzsaw; Haas-Bioroid with Palisade on HQ and Funhouse on R&D.
function setUpBoard() {
  run(`
    cardRenderer = new Proxy(function() {}, {get: () => cardRenderer, apply: () => cardRenderer});
    var cardBackTexturesCorp = null, cardBackTexturesRunner = null, glowTextures = null;
    var strengthTextures = {ice: null, ib: null, broken: null, rc: null, crc: null, ctc: null};
    Object.assign(corp, {identityCard: null, creditPool: 5, clickTracker: 0, tempBonusClicks: 0, scoreArea: [],
      HQ: NewServer("HQ", true), RnD: NewServer("R&D", true), archives: NewServer("Archives", true),
      remoteServers: [], serverIncrementer: 0, maxHandSize: 5, resolvingCards: [], installingCards: [], badPublicity: 0});
    Object.assign(runner, {identityCard: {title: "placeholder", renderer: {}}, creditPool: 5, temporaryCredits: 0,
      clickTracker: 4, tempBonusClicks: 0, startingMU: 4, scoreArea: [], grip: [], stack: [], heap: [],
      rig: {programs: [], hardware: [], resources: []}, maxHandSize: 5, tags: 0, coreDamage: 0,
      resolvingCards: [], installingCards: []});
    CorpTestField(30035, [], [30070, 30070, 30070, 30070], [30070, 30070], [], [30054], [30072], [], [],
      cardBackTexturesCorp, glowTextures, strengthTextures);
    RunnerTestField(30019, [], [30020, 30020, 30020], [30020, 30020, 30020, 30020], [30006, 30005], [],
      cardBackTexturesRunner, glowTextures, strengthTextures);
    activePlayer = runner; playerTurn = runner; currentPhase = phases.runnerActionMain;
  `);
}


const c = context;
c.PlaySound=()=>{}; c.PlayCreditGainSound=()=>{}; c.Render=()=>{};
c.suppressCreditDrawSound=true;c.particleSystems={breaksubroutine:{spawnRect:{}}};
function reset() { setUpBoard(); run('runner.AI=new RunnerAI();runner.AI._log=function(s) {if(debugging) console.error(s);};runner.AI._random=function() {return 0;};corp.AI=null;');
 c.runner.grip=[]; c.runner.rig.programs=[]; c.runner.rig.hardware=[]; c.runner.rig.resources=[];
 c.corp.HQ.ice=[]; c.corp.RnD.ice=[]; c.corp.archives.ice=[];
 c.corp.HQ.cards=[]; c.corp.RnD.cards=[]; c.corp.archives.cards=[]; c.executingCommand='';c.runner.temporaryPoolCredits=0;c.attackedServer=null; c.encountering=false; c.approachIce=-1;
}
function card(id,pile) {const x=c.InstanceCard(id,null,null);pile.push(x);x.cardLocation=pile;return x;}
function passResponses() {
 for(let i=0;i<40;i++) {const phase=c.currentPhase;
  if(!phase.Enumerate || !phase.Enumerate.n || !phase.Enumerate.n.call(phase).length)break;
  phase.Resolve.n.call(phase,{});
 }
}
async function main() {
 for (const topId of [30070,30040]) {
  reset();const hiram=c.InstanceCard(36017,null,null);c.runner.identityCard=hiram;
  const top=card(topId,c.corp.RnD.cards);c.runner.creditPool=10;
  for(let i=0;i<5;i++)card(30020,c.runner.grip);
  assert.strictEqual(c.PlayerCanLook(c.runner,top),false);
  hiram.responseOnInstall.Resolve.call(hiram);
  assert.strictEqual(c.PlayerCanLook(c.runner,top),true);
  const opts=['run','gain'];const ix=await c.runner.AI.CommandChoice(opts);
  assert.strictEqual(c.runner.AI._getCachedPotential(c.corp.RnD)>0,top.cardType==='agenda');
  assert.strictEqual(opts[ix],top.cardType==='agenda'?'run':'gain');
  const next=card(30040,c.corp.RnD.cards);c.MoveCard(top,c.corp.HQ.cards);
  await c.runner.AI.CommandChoice(opts);
  assert.strictEqual(c.PlayerCanLook(c.runner,next),false,'moving the learned card reveals no new top');
 }
 reset();c.runner.AI=null;const hiram=c.InstanceCard(36017,null,null);c.runner.identityCard=hiram;
 const top=card(30070,c.corp.RnD.cards);
 hiram.responseOnInstall.Resolve.call(hiram);
 assert.strictEqual(c.activePlayer,c.runner);
 const lookChoices=c.currentPhase.Enumerate.continue();
 assert.strictEqual(lookChoices[0].card,top,'human look offers actual card without faceup disclosure');
 assert.strictEqual(!!top.faceUp,false);
 reset();const air=card(36018,c.runner.grip);c.runner.creditPool=15;
 const ice=card(31077,c.corp.HQ.ice);ice.rezzed=true;
 Object.defineProperty(ice,'strength',{get(){throw new Error('route fault');}});
 await assert.rejects(()=>c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,air,null,false),/route fault/);
 assert.strictEqual(c.runner.creditPool,15,'C4-3 restores live pool on calculator exception');
 assert.strictEqual(c.runner.AI.rc.runEvent,null);
 reset();const cleaver=card(30006,c.runner.stack);card(30005,c.runner.stack);
 const beta=card(36019,c.runner.grip);for(const id of [36013,36014,36020,36021])card(id,c.runner.grip);
 for(let i=0;i<3;i++)card(30060,c.runner.scoreArea);
 card(31077,c.corp.HQ.ice).rezzed=true;card(30070,c.corp.HQ.cards);
 c.runner.AI.suspectedHQCards=[{title:'Superconducting Hub',cardType:'agenda',copies:1,uncertainty:0}];
 c.runner.creditPool=4;c.runner.clickTracker=1;
 c.debugging=!!process.env.VERBOSE; if(c.debugging)c.console.error=console.error;const commands=['run','play','gain'];const selected=await c.runner.AI.CommandChoice(commands);

 assert.strictEqual(commands[selected],'play','C4-4 last-click combined tutor run');
 assert.strictEqual(c.runner.AI.preferred.cardToPlay,beta);
 c.executingCommand='play';const legal=c.currentPhase.Enumerate.play();
 const play=legal[await c.runner.AI.SelectChoice(legal)];c.executingCommand='';c.currentPhase.Resolve.play(play);
 const choices=c.currentPhase.Enumerate.continue();c.runner.AI._random=()=>0.99;
 const savedPreference=c.runner.AI.preferred;
 c.runner.AI.preferred={playingCard:beta,playChoice:{card:{},host:null,server:c.corp.HQ}};
 const fallback=await c.runner.AI.SelectChoice(choices);
 assert.strictEqual(choices[fallback].card,cleaver,'changed tutor preference reconstructs a safe legal answer');
 assert.strictEqual(choices[fallback].server,c.corp.HQ);
 c.runner.AI.preferred=savedPreference;const ix=await c.runner.AI.SelectChoice(choices);
 assert.strictEqual(choices[ix].card,cleaver,'C4-2 preserve urgent fracter over decoder');
 assert.strictEqual(choices[ix].server,c.corp.HQ);
 c.currentPhase.Resolve.continue(choices[ix]);
 if(c.currentPhase.Enumerate.continue)c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
 passResponses();
 assert.strictEqual(c.runner.creditPool,1,'combined event pays exactly three');
 assert.strictEqual(c.runner.clickTracker,0,'combined event uses exactly one click');
 assert.strictEqual(c.attackedServer,c.corp.HQ);
 assert.strictEqual(cleaver.cardLocation,c.runner.rig.programs);
 c.encountering=true;c.approachIce=0;c.encounteredIce=c.corp.HQ.ice[0];
 const breakChoices=cleaver.abilities[0].Enumerate.call(cleaver);
 assert.strictEqual(breakChoices.length,1);
 cleaver.abilities[0].Resolve.call(cleaver,breakChoices[0]);passResponses();
 if(c.currentPhase.Enumerate.continue)c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);
 assert.strictEqual(c.runner.creditPool,0,'actual break fits post-event budget');
 assert.strictEqual(c.corp.HQ.ice[0].subroutines[0].broken,true);
 c.encountering=false;c.approachIce=-1;c.accessingCard=c.corp.HQ.cards[0];c.currentPhase=c.phases.runAccessingCard;
 assert(c.CheckSteal(),'the combined route leaves a legal winning access');
 c.currentPhase.Resolve.steal();passResponses();assert.strictEqual(c.AgendaPoints(c.runner),7);
 beta.responseOnRunEnds.Resolve.call(beta);
 assert.strictEqual(c.runner.stack[c.runner.stack.length-1],cleaver,'temporary breaker returns after its run');
 assert.strictEqual(c.runner.rig.programs.includes(cleaver),false);

 for(const [credits,fuelIds,expected] of [[4,[36013,36013,36013],'install'],[3,[36013,36013,36013],'gain'],[8,[],'gain'],[8,[36003],'gain'],[8,[36013],'gain']]) {
  reset();const meth=card(36020,c.runner.grip);for(const id of fuelIds)card(id,c.runner.grip);
  if(expected==='install')card(30006,c.runner.rig.programs);
  c.runner.creditPool=credits;const opts=['install','gain'];const ix=await c.runner.AI.CommandChoice(opts);
  if(expected==='install')assert.strictEqual(opts[ix],expected,'C4-1 profitable installation');
  else assert.notStrictEqual(c.runner.AI.preferred && c.runner.AI.preferred.cardToInstall,meth,'C4-1 decline console without a return on its full cost');
  if(expected==='install') {
    assert.strictEqual(c.runner.AI.preferred.cardToInstall,meth);
    c.executingCommand='install';const legal=c.currentPhase.Enumerate.install();
    const chosen=legal[await c.runner.AI.SelectChoice(legal)];c.executingCommand='';c.currentPhase.Resolve.install(chosen);
    c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue()[0]);passResponses();
    assert.strictEqual(c.runner.creditPool,0,'real console installation consumes four');
    assert.strictEqual(meth.cardLocation,c.runner.rig.hardware);
    card(31077,c.corp.HQ.ice).rezzed=true;
    card(30070,c.corp.HQ.cards);c.currentPhase=c.phases.runnerActionMain;
    c.runner.AI.suspectedHQCards=[{title:'Superconducting Hub',cardType:'agenda',copies:1,uncertainty:0}];
    const actions=['run','gain'];const action=await c.runner.AI.CommandChoice(actions);
    assert.strictEqual(actions[action],'run','post-install fuel funds the follow-up route');
    assert.strictEqual(c.runner.AI.preferred.serverToRun,c.corp.HQ);
  }
 }
 for(const fuelId of [36013,36003]) {
  reset();const meth=card(36020,c.runner.rig.hardware);const fuel=card(fuelId,c.runner.grip);
  c.attackedServer=c.corp.HQ;c.runner.AI.cardsWorthKeeping=c.runner.AI._cardsInHandWorthKeeping();
  const choices=meth.responseOnRunBegins.Enumerate.call(meth);
  c.currentPhase={title:meth.title};c.executingCommand='trigger';const ix=await c.runner.AI.SelectChoice(choices);
  assert.strictEqual(choices[ix].card,fuelId===36013?fuel:null,'preserve useful stealth hardware');
  meth.responseOnRunBegins.Resolve.call(meth,choices[ix]);passResponses();
  assert.strictEqual(meth.credits,fuelId===36013?2:0,'real trash callback loads run-only credits');
  assert.strictEqual(c.runner.heap.includes(fuel),fuelId===36013);
 }
 for(const credits of [0,1]) {
  reset();const air=card(36018,c.runner.resolvingCards);air.runningWithThis=true;air.primaryRun=true;air.primaryRunWasSuccessful=true;air.credits=credits;
  card(30006,c.runner.rig.programs);const remote=c.NewServer('Remote');c.corp.remoteServers.push(remote);
  card(31077,remote.ice).rezzed=true;card(30070,remote.root).faceUp=true;
  for(let i=0;i<5;i++)card(30020,c.runner.grip);c.runner.creditPool=15;c.runner.clickTracker=0;c.attackedServer=c.corp.HQ;
  c.runner.AI.cachedPotentials=[{server:remote,potential:3}];
  const choices=air.responseOnRunEnds.Enumerate.call(air);
  assert.strictEqual(choices[0].server,credits===1?remote:null,'Aircheck remote uses remaining credits and no click');
  assert.strictEqual(c.runner.creditPool,15);
 }
 // Optional second run declines lethal/empty remotes and refreshes the fund.
 for(const mode of ['lethal','empty','fresh']) {
  reset();const air=card(36018,c.runner.resolvingCards);air.runningWithThis=true;air.primaryRun=true;air.primaryRunWasSuccessful=true;
  const remote=c.NewServer('Remote');c.corp.remoteServers.push(remote);card(30006,c.runner.rig.programs);
  if(mode!=='empty')card(30070,remote.root).knownToRunner=true;
  card(mode==='lethal'?30047:31077,remote.ice).rezzed=true;
  c.runner.creditPool=15;c.runner.clickTracker=0;c.runner.temporaryCredits=0;c.corp.badPublicity=mode==='fresh'?1:0;
  for(let i=0;i<(mode==='lethal'?3:5);i++)card(30020,c.runner.grip);
  c.attackedServer=c.corp.HQ;c.runner.AI.cachedPotentials=[{server:remote,potential:3}];
  const choice=air.responseOnRunEnds.Enumerate.call(air)[0];
  assert.strictEqual(choice.server,mode==='fresh'?remote:null,'optional follow-up safety and refreshed fund');
  air.responseOnRunEnds.Resolve.call(air,choice);
  let cleanupObserved=false;
  const observer={player:c.runner,cardType:'resource',automaticOnRunEndCleanup:{Resolve(){
    cleanupObserved=true;assert.strictEqual(c.attackedServer,null,'all cleanup hooks run before queued next run');
  }}};observer.cardLocation=c.runner.rig.resources;c.runner.rig.resources.push(observer);
  c.currentPhase=c.phases.runEnds;c.currentPhase.player=c.corp;
  c.phases.runEnds.Resolve.n();
  assert.strictEqual(cleanupObserved,true);
  assert.strictEqual(c.attackedServer,mode==='fresh'?remote:null);
  assert.strictEqual(c.runner.temporaryCredits,mode==='fresh'?1:0);
  assert.strictEqual(air.runningWithThis,mode==='fresh');
 }
 // Forecasted fuel and hypothetical breaker scratch state restore together on errors.
 reset();const faultEvent=card(36018,c.runner.grip);const source=card(36020,c.runner.rig.hardware);
 const disposable=card(36013,c.runner.grip);const planned=card(30006,c.runner.stack);
 planned.AIPrepareHypotheticalForRC=function(){this.prepared=true;};
 planned.AIRestoreHypotheticalFromRC=function(){delete this.prepared;};
 const faultIce=card(31077,c.corp.HQ.ice);faultIce.rezzed=true;
 Object.defineProperty(faultIce,'strength',{get(){throw new Error('forecast fault');}});
 const previousEvent={};c.runner.AI.rc.runEvent=previousEvent;c.runner.creditPool=15;
 await assert.rejects(()=>c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,faultEvent,{card:planned,cost:0},false),/forecast fault/);
 assert.strictEqual(c.runner.grip[0],faultEvent);assert.strictEqual(c.runner.grip[1],disposable);
 assert.strictEqual(source.credits,0);assert.strictEqual(planned.prepared,undefined);
 assert.strictEqual(c.runner.creditPool,15);assert.strictEqual(c.runner.AI.rc.runEvent,previousEvent);
 assert.strictEqual(Object.hasOwn(faultEvent,'storedAIRunnerCreditPool'),false);
 assert.strictEqual(c.AIHypothetical.depth,0);
 // Hiram learns the top, never unknown substitutes, and loses location after shuffling.
 for(const topId of [30070,30040]) {
  reset();const hiram=c.InstanceCard(36017,null,null);c.runner.identityCard=hiram;
  const top=card(topId,c.corp.RnD.cards);for(let i=0;i<5;i++)card(30020,c.runner.grip);
  await c.runner.AI.CommandChoice(['run','gain']);
  assert.strictEqual(c.runner.AI._getCachedPotential(c.corp.RnD),1.5,'hidden top contents do not change potential');
  const hardware=card(36013,c.runner.grip);
  assert.strictEqual(hiram.responseOnTrash.Enumerate.call(hiram,[hardware]).length,1,'hardware from Grip triggers the look');
  hiram.responseOnTrash.Resolve.call(hiram);assert.strictEqual(top.knownToRunner,true);
  c.Shuffle(c.corp.RnD.cards);assert.strictEqual(c.PlayerCanLook(c.runner,top),false);
 }
 // Scarce combined-action budgets decline instead of trashing essential installed programs.
 for(const [pool,mu] of [[3,4],[4,0]]) {
  reset();const beta=card(36019,c.runner.grip);card(30006,c.runner.stack);
  card(31077,c.corp.HQ.ice).rezzed=true;card(30070,c.corp.HQ.cards);
  c.runner.AI.suspectedHQCards=[{title:'Superconducting Hub',cardType:'agenda',copies:1,uncertainty:0}];
  for(let i=0;i<5;i++)card(30020,c.runner.grip);
  c.runner.creditPool=pool;c.runner.startingMU=mu;c.runner.clickTracker=1;
  const opts=['run','play','gain'];const ix=await c.runner.AI.CommandChoice(opts);
  assert.notStrictEqual(c.runner.AI.preferred && c.runner.AI.preferred.cardToPlay,beta,'combined play/break and MU limits decline: '+pool+'/'+mu);
 }
 // Bad-publicity funds: actual Paywall/helper behavior and Stimhack pool semantics.
 reset();c.runner.creditPool=6;c.runner.temporaryCredits=2;
 const paywall=c.cardSet[36052];paywall.responseOnEncounter.Resolve.call(paywall);
 assert.strictEqual(c.runner.creditPool,5);assert.strictEqual(c.runner.temporaryCredits,2);
 assert.strictEqual(c.Credits(c.runner),5);assert.strictEqual(c.AvailableCredits(c.runner),7);
 c.LoseCredits(c.corp,1);assert.strictEqual(c.corp.creditPool,4);assert.strictEqual(c.runner.temporaryCredits,2);
 c.runner.creditPool=0;assert.strictEqual(c.LoseCredits(c.runner,3),0);assert.strictEqual(c.runner.temporaryCredits,2);
 c.GainCredits(c.runner,9,'Stimhack');assert.strictEqual(c.Credits(c.runner),9);
 assert.strictEqual(c.LoseCredits(c.runner,1),1);assert.strictEqual(c.runner.temporaryCredits,10);
 assert.strictEqual(c.runner.temporaryPoolCredits,8);
 c.SpendCredits(c.runner,3,'using',{});
 assert.strictEqual(c.runner.temporaryCredits,7);assert.strictEqual(c.runner.temporaryPoolCredits,7,'fund spent before Stimhack');
 const airlock=card(36018,c.runner.resolvingCards);airlock.runningWithThis=true;airlock.credits=4;
 c.runner.temporaryCredits+=2;c.attackedServer=c.corp.HQ;
 assert.strictEqual(c.AvailableCredits(c.runner),6,'pool lock excludes Stimhack while fund stays spendable');
 assert.strictEqual(c.LoseCredits(c.runner,2),0);assert.strictEqual(c.runner.temporaryPoolCredits,7);
 run('corp.AI=new CorpAI();corp.AI._log=function() {};');
 const budget=c.corp.AI._effectiveRunnerCreditPool(c.corp.HQ);
 assert.strictEqual(budget.baseCredits,0);assert.strictEqual(budget.temporaryCredits,2);
 c.SpendCredits(c.runner,2,'using',{});assert.strictEqual(c.runner.temporaryPoolCredits,7);
 assert.strictEqual(c.runner.temporaryCredits,7);
 // Installed Methuselah forecasts actual expendable fuel, then pays a real run.
 reset();const fueled=card(36020,c.runner.rig.hardware);const fuel=card(36013,c.runner.grip);
 card(30006,c.runner.rig.programs);card(31077,c.corp.HQ.ice).rezzed=true;
 card(30070,c.corp.HQ.cards);c.runner.creditPool=0;
 c.runner.AI.suspectedHQCards=[{title:'Superconducting Hub',cardType:'agenda',copies:1,uncertainty:0}];
 const opts=['run','gain'];const action=await c.runner.AI.CommandChoice(opts);
 assert.strictEqual(opts[action],'run','future fuel opens an otherwise unaffordable route');
 assert.strictEqual(c.runner.AI.preferred.serverToRun,c.corp.HQ);
 assert.strictEqual(fueled.credits,0);assert.strictEqual(c.runner.grip[0],fuel,'planning restores exact fuel position');
 const cached=c.runner.AI.rc.baseOtherCredits;
 assert.strictEqual(cached,2,'forecast fuel is counted once');
 c.executingCommand='run';const runs=c.currentPhase.Enumerate.run();
 const chosen=runs[await c.runner.AI.SelectChoice(runs)];c.executingCommand='';c.currentPhase.Resolve.run(chosen);
 const fuelOptions=fueled.responseOnRunBegins.Enumerate.call(fueled);
 fueled.responseOnRunBegins.Resolve.call(fueled,fuelOptions[0]);passResponses();
 assert.strictEqual(fueled.credits,2);assert.strictEqual(c.runner.heap.includes(fuel),true);
 c.SpendCredits(c.runner,1,'using',c.runner.rig.programs[0]);
 assert.strictEqual(fueled.credits,1,'post-start live payment uses the planned source');
 // Forecasted stealth credits must serve reductions and ordinary breaks together.
 for(const count of [1,2]) {
  reset();const meth=card(36020,c.runner.rig.hardware);card(36004,c.runner.rig.programs);
  card(36013,c.runner.grip);for(let i=0;i<5;i++)card(30020,c.runner.grip);
  for(let i=0;i<count;i++){const ice=card(31077,c.corp.HQ.ice);ice.rezzed=true;ice.advancement=0;}
  card(30070,c.corp.HQ.cards);c.runner.creditPool=0;
  const route=await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,null,null,false);
  assert.strictEqual(!!route,count===1,'two forecast credits cannot pay for four reduction/break costs');
  assert.strictEqual(meth.credits,0);
 }
 // Pool-equivalent Stimhack payments avoid Shackleton with real human and AI allocation.
 for(const human of [true,false]) {
  reset();const grid=card(36065,c.corp.HQ.root);grid.rezzed=true;
  c.attackedServer=c.corp.HQ;c.runner.creditPool=0;c.runner.temporaryCredits=3;c.runner.temporaryPoolCredits=2;
  const before=c.runner.grip.length;
  if(human)c.runner.AI=null;
  let finished=false;c.SpendCredits(c.runner,1,'using',{},()=>{finished=true;});
  if(human) {
    const choices=c.currentPhase.Enumerate.continue();
    assert(choices.some(choice=>choice.temporary));
    c.currentPhase.Resolve.continue(choices.find(choice=>choice.temporaryPool));
  }
  assert.strictEqual(finished,true);assert.strictEqual(grid.usedThisTurn,false);
  assert.strictEqual(c.runner.temporaryCredits,2);assert.strictEqual(c.runner.temporaryPoolCredits,1);
  assert.strictEqual(c.runner.grip.length,before);
 }
 // C4-5: forecast and actual event source share reduction, break and access.
 reset();const stealthAir=card(36018,c.runner.grip),corsair=card(36004,c.runner.rig.programs);
 const wall=card(31077,c.corp.HQ.ice);wall.rezzed=true;
 c.runner.creditPool=1;c.runner.clickTracker=1;
 for(let i=0;i<5;i++)card(30020,c.runner.grip);
 const forecast=await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,stealthAir,null,false);
 assert(forecast,'Aircheck forecasts a finite actual Stealth source');
 assert.strictEqual(c.runner.AI.rc.baseOtherCredits,4,'event scalar is not counted twice');
 assert.strictEqual(stealthAir.credits,0);assert.strictEqual(stealthAir.runningWithThis,false);
 assert(!c.runner.resolvingCards.includes(stealthAir));
 c.phases.runnerActionMain.Resolve.play({card:stealthAir});
 c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue().find(x=>x.server===c.corp.HQ));passResponses();
 assert.strictEqual(stealthAir.credits,4);
 c.encountering=true;c.approachIce=0;c.encounteredIce=wall;
 assert.strictEqual(corsair.abilities[1].Enumerate.call(corsair).length,1);
 corsair.abilities[1].Resolve.call(corsair,{});passResponses();
 assert.strictEqual(stealthAir.credits,3);
 corsair.abilities[0].Resolve.call(corsair,corsair.abilities[0].Enumerate.call(corsair)[0]);passResponses();
 assert.strictEqual(stealthAir.credits,2);assert(wall.subroutines[0].broken);
 const lamp=card(36005,c.runner.rig.programs);lamp.power=3;
 const access=card(30040,c.corp.HQ.cards);access.playCost=1;
 c.encountering=false;c.approachIce=-1;c.accessingCard=access;c.currentPhase=c.phases.runAccessingCard;
 const accessOpts=['trigger','n'];const accessIx=await c.runner.AI.CommandChoice(accessOpts);
 assert.strictEqual(accessOpts[accessIx],'trigger','event Stealth enables useful Lampades trash');
 let lampPaid=0;stealthAir.onCreditsSpent=amount=>{lampPaid+=amount;};
 lamp.abilities[0].Resolve.call(lamp,{});passResponses();
 assert.strictEqual(lampPaid,1);assert(c.corp.archives.cards.includes(access));
 stealthAir.credits=0;
 assert.strictEqual(corsair._stealthCreditCards().length,0,'exhausted event excluded');
 stealthAir.credits=4;stealthAir.runningWithThis=false;
 assert.strictEqual(corsair._stealthCreditCards().length,0,'inactive event excluded');
 // Opposing complete-route pricing uses only public live sources, never Grip events.
 for(const live of [false,true]) {
  reset();const a=card(36018,live?c.runner.resolvingCards:c.runner.grip);a.credits=4;a.runningWithThis=live;
  card(36004,c.runner.rig.programs);card(31077,c.corp.HQ.ice).rezzed=true;
  c.runner.creditPool=0;c.runner.clickTracker=1;c.attackedServer=live?c.corp.HQ:null;
  for(let i=0;i<5;i++)card(30020,c.runner.grip);
  run('corp.AI=new CorpAI();corp.AI._log=function() {};');
  const security=c.corp.AI._evaluateServerSecurity(c.corp.HQ);
  if(live)assert.strictEqual(security.totalMandatoryBreakCost,2,'public event pays reduction and break');
  assert.strictEqual(a.credits,4);assert.strictEqual(c.attackedServer,live?c.corp.HQ:null);
 }
 // Renderer sees pool-equivalent credits, labels the fund, and restores even on errors.
 c.runner.creditPool=5;c.runner.temporaryCredits=9;c.runner.temporaryPoolCredits=7;
 const oldRenderer=c.cardRenderer,oldCounters=c.countersUI;c.countersUI={credits:{runner:{}}};
 c.cardRenderer={UpdateCounters(){assert.strictEqual(c.runner.creditPool,12);throw new Error('render fault');}};
 assert.throws(()=>c.UpdateCounters(),/render fault/);assert.strictEqual(c.runner.creditPool,5);
 assert.strictEqual(c.countersUI.credits.runner.postfix,' +2 fund');c.cardRenderer=oldRenderer;c.countersUI=oldCounters;
}
function buffers(n=5) {for(let i=0;i<n;i++)card(30020,c.runner.grip);}
function remote(name='Remote',id=30070) {const s=c.NewServer(name);c.corp.remoteServers.push(s);if(id)card(id,s.root).knownToRunner=true;return s;}
function followup(credits=0) {const a=card(36018,c.runner.resolvingCards);a.runningWithThis=true;a.primaryRun=true;a.primaryRunWasSuccessful=true;a.credits=credits;c.attackedServer=c.corp.HQ;c.runner.clickTracker=0;return a;}
function endPrimary(a,choice) {a.responseOnRunEnds.Resolve.call(a,choice);c.currentPhase=c.phases.runEnds;c.currentPhase.player=c.corp;c.phases.runEnds.Resolve.n();}
function steal(agenda) {c.encountering=false;c.approachIce=-1;c.accessingCard=agenda;c.currentPhase=c.phases.runAccessingCard;assert(c.currentPhase.Enumerate.steal().length,'actual terminal steal is legal');c.currentPhase.Resolve.steal();passResponses();}
async function continuationAcceptance() {
 // C4-6: zero-click optional run forecasts the same fuel and Grip loss as live.
 for(const points of [0,6])for(const mode of ['none','needed','fuel','lethal']) {
  reset();const a=followup(),m=card(36020,c.runner.rig.hardware),b=card(30006,c.runner.rig.programs);
  const fuel=mode==='none'?null:card(mode==='needed'?36003:36013,c.runner.grip);
  if(mode!=='lethal')buffers();
  const s=remote();card(31077,s.ice).rezzed=true;
  if(mode==='lethal')card(31059,s.root).rezzed=true;
  c.runner.scoreArea=[{player:c.runner,agendaPoints:points}];c.runner.creditPool=10;
  c.runner.AI.cachedPotentials=[{server:s,potential:3}];
  const before=c.runner.grip.slice();const chosen=a.responseOnRunEnds.Enumerate.call(a)[0];
  assert.strictEqual(chosen.server,mode==='fuel'?s:null,'fresh-run '+mode+' at '+points);
  assert.deepStrictEqual(c.runner.grip,before);assert.strictEqual(m.credits,0);
  if(mode!=='fuel')continue;
  endPrimary(a,chosen);assert.strictEqual(c.attackedServer,s);
  const fuelOptions=m.responseOnRunBegins.Enumerate.call(m);
  assert.strictEqual(fuelOptions[0].card,fuel);
  m.responseOnRunBegins.Resolve.call(m,fuelOptions[0]);passResponses();
  assert.strictEqual(m.credits,2);assert(c.runner.heap.includes(fuel));
  c.encountering=true;c.approachIce=0;c.encounteredIce=s.ice[0];
  b.abilities[0].Resolve.call(b,b.abilities[0].Enumerate.call(b)[0]);passResponses();
  assert.strictEqual(m.credits,1);assert(s.ice[0].subroutines[0].broken);
  if(points===6){steal(s.root[0]);assert.strictEqual(c.AgendaPoints(c.runner),7);}
 }
 reset();const a=followup(),m=card(36020,c.runner.rig.hardware),fuel=card(36013,c.runner.grip);
 const fault=remote();card(30006,c.runner.rig.programs);const wall=card(31077,fault.ice);wall.rezzed=true;
 buffers();c.runner.AI.cachedPotentials=[{server:fault,potential:3}];
 Object.defineProperty(wall,'strength',{get(){throw new Error('followup fault');}});
 const oldGrip=c.runner.grip.slice(),oldRC=c.runner.AI.rc;
 assert.throws(()=>a.responseOnRunEnds.Enumerate.call(a),/followup fault/);
 assert.deepStrictEqual(c.runner.grip,oldGrip);assert.strictEqual(m.credits,0);
 assert.strictEqual(c.runner.AI.rc,oldRC);assert.strictEqual(c.attackedServer,c.corp.HQ);assert.strictEqual(c.AIHypothetical.depth,0);

 // C4-7a: only the terminal state overrides the ordinary higher-potential run.
 for(const points of [0,6])for(const safe of [false,true]) {
  reset();const a=followup(4);buffers();c.runner.scoreArea=[{player:c.runner,agendaPoints:points}];
  const ordinary=remote('ordinary',30056);ordinary.root[0].knownToRunner=false;
  const win=remote('win');if(!safe)card(31077,win.ice).rezzed=true;
  c.runner.AI.cachedPotentials=[{server:ordinary,potential:5},{server:win,potential:2}];
  const choice=a.responseOnRunEnds.Enumerate.call(a)[0];
  assert.strictEqual(choice.server,points===6&&safe?win:ordinary);
  if(points===6&&safe){endPrimary(a,choice);steal(win.root[0]);assert.strictEqual(c.AgendaPoints(c.runner),7);}
 }
 // C4-7b: actual ordinary/Hiram and free-Aircheck winning steals use legal funds.
 for(const target of ['remote','hiram','aircheck'])for(const source of ['pool','fund','hosted','restricted','short']) {
  reset();buffers();c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=0;c.runner.clickTracker=1;
  let s,agenda,air;
  if(target==='hiram'){const h=card(36017,[]);c.runner.identityCard=h;s=c.corp.RnD;agenda=card(30070,s.cards);h.responseOnInstall.Resolve.call(h);}
  else{s=remote();agenda=s.root[0];}
  if(target==='aircheck')air=followup(source==='pool'?3:0);
  card(36048,c.corp.HQ.root).rezzed=true;
  let hosted;
  if(source==='pool'&&target!=='aircheck')c.runner.creditPool=3;
  if(source==='fund')c.corp.badPublicity=3;
  if(source==='hosted'||source==='short'){hosted=card(36020,c.runner.rig.hardware);hosted.credits=source==='short'?2:3;}
  if(source==='restricted'){
   // Real engine contract: these credits are usable for breakers only.
   hosted={player:c.runner,title:'Restricted payment fixture',cardType:'hardware',subTypes:['Stealth'],credits:3,
    canUseCredits(doing,card){return doing==='using'&&!!card&&c.CheckSubType(card,'Icebreaker');}};
   c.runner.rig.hardware.push(hosted);
  }
  const expected=source!=='restricted'&&source!=='short';
  if(air){c.runner.AI.cachedPotentials=[{server:s,potential:3}];const choice=air.responseOnRunEnds.Enumerate.call(air)[0];assert.strictEqual(choice.server,expected?s:null,target+' '+source);if(!expected)continue;endPrimary(air,choice);}
  else {
   const opts=['run','gain'];const selected=await c.runner.AI.CommandChoice(opts);
   assert.strictEqual(opts[selected],expected?'run':'gain',target+' '+source);
   if(!expected)continue;
   c.executingCommand='run';const options=c.currentPhase.Enumerate.run();const chosen=options[await c.runner.AI.SelectChoice(options)];c.executingCommand='';
   assert.strictEqual(chosen.server,s);c.currentPhase.Resolve.run(chosen);
  }
  c.runner.AI.RecalculateRunIfNeeded();assert(c.runner.AI.cachedComplete,'live terminal route remains affordable');
  steal(agenda);assert.strictEqual(c.AgendaPoints(c.runner),7,target+' '+source+' actual payment');
 }
 // Rotary's separate initial, completed-route and live consumers share funding.
 for(const source of ['pool','fund','hosted','short']) {
  reset();buffers();const rotary=card(36014,c.runner.rig.hardware);
  const win=card(30070,c.corp.RnD.cards);win.knownToRunner=true;card(30040,c.corp.RnD.cards);
  card(36048,c.corp.HQ.root).rezzed=true;c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];
  c.runner.creditPool=source==='pool'?3:0;c.corp.badPublicity=source==='fund'?3:0;
  if(source==='hosted'||source==='short')card(36020,c.runner.rig.hardware).credits=source==='short'?2:3;
  c.runner.clickTracker=1;
  assert.strictEqual(rotary._takeTagForAccess(c.corp.RnD),source!=='short','initial Rotary '+source);
  if(source==='short')continue;
  const commands=['run','gain'];assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)],'run');
  c.MakeRun(c.corp.RnD);c.runner.clickTracker=0;c.approachIce=-1;
  const path=c.runner.AI._calculateBestCompleteRun(c.corp.RnD,0,0,0,0,null,-1);
  assert(path);assert.strictEqual(path[path.length-1].breachTagsByCard.get(rotary),1);
  c.currentPhase={title:rotary.title,identifier:'Run 5.2',Enumerate:{},Resolve:{}};
  const options=rotary.responseOnBreach.Enumerate.call(rotary,c.corp.RnD),bonus=options[await c.runner.AI.SelectChoice(options)];
  assert.strictEqual(bonus.use,true);rotary.responseOnBreach.Resolve.call(rotary,bonus);passResponses();
  assert.strictEqual(c.runner.tags,1);steal(win);assert.strictEqual(c.AgendaPoints(c.runner),7);
 }
 // Baker pays its restricted redirect before terminal steal funding, including Rotary.
 for(const dest of ['HQ','RnD'])for(const source of ['pool','fund','hosted','short']) {
  reset();buffers();const baker=card(36015,c.runner.rig.programs),rotary=card(36014,c.runner.rig.hardware);
  const fuel=card(36021,c.runner.rig.hardware);fuel.credits=1;
  const s=c.corp[dest],agenda=card(30070,s.cards);agenda.knownToRunner=true;card(30040,s.cards);
  card(31077,s.ice).rezzed=true;card(36048,c.corp.HQ.root).rezzed=true;
  c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=source==='pool'?3:0;c.corp.badPublicity=source==='fund'?3:0;c.runner.clickTracker=1;
  if(source==='hosted'||source==='short')card(36020,c.runner.rig.hardware).credits=source==='short'?2:3;
  const commands=['trigger','run','gain'],command=commands[await c.runner.AI.CommandChoice(commands)];
  const plan=baker.AIRunAbilityPlan();
  assert.strictEqual(!!(plan&&plan.winningAgenda),source!=='short',dest+' Baker '+source);
  if(source==='short')continue;
  assert.strictEqual(command,'trigger');
  c.executingCommand='trigger';const options=c.ChoicesTriggerableAbilities(c.runner,'click');
  const ability=options[await c.runner.AI.SelectChoice(options)];c.executingCommand='';assert.strictEqual(ability.card,baker);
  ability.ability.Resolve.call(baker,ability.choice);
  c.approachIce=-1;c.currentPhase={title:baker.title,identifier:'Run 4.3',Enumerate:{},Resolve:{}};
  const redirects=baker.responseOnWouldApproachServer.Enumerate.call(baker),choice=redirects[await c.runner.AI.SelectChoice(redirects)];
  assert.strictEqual(choice.server,s);baker.responseOnWouldApproachServer.Resolve.call(baker,choice);
  if(c.currentPhase.title===baker.title&&c.currentPhase.Enumerate.continue){
   const sources=c.currentPhase.Enumerate.continue();c.currentPhase.Resolve.continue(sources[await c.runner.AI.SelectChoice(sources)]);
  }
  passResponses();assert.strictEqual(c.attackedServer,s);assert.strictEqual(fuel.credits,0);
  c.currentPhase={title:rotary.title,identifier:'Run 5.2',Enumerate:{},Resolve:{}};
  const tags=rotary.responseOnBreach.Enumerate.call(rotary,s),bonus=tags[await c.runner.AI.SelectChoice(tags)];
  assert.strictEqual(bonus.use,true);rotary.responseOnBreach.Resolve.call(rotary,bonus);passResponses();
  steal(agenda);assert.strictEqual(c.AgendaPoints(c.runner),7);
 }
 // Optional access must preserve a sole break credit when fresh publicity pays stealing.
 for(const spare of [false,true]) {
  reset();buffers();card(30006,c.runner.rig.programs);const m=card(36020,c.runner.rig.hardware);m.credits=spare?2:1;
  const s=remote();card(31077,s.ice).rezzed=true;card(36048,c.corp.HQ.root).rezzed=true;
  c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=0;c.corp.badPublicity=3;c.runner.clickTracker=1;
  assert.strictEqual(c.runner.AI._accessPaymentPreservesWinningRun({hosted:[{card:m,amount:1}]}),spare);
  c.attackedServer=c.corp.RnD;c.accessingCard=card(30040,c.corp.RnD.cards);c.accessingCard.trashCost=1;
  c.currentPhase=c.phases.runAccessingCard;
  const commands=['trash','n'];assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)],spare?'trash':'n');
  if(spare){c.currentPhase.Resolve.trash();passResponses();assert.strictEqual(m.credits,1);}
  // The protected/remaining source plus refreshed fund actually delivers the win.
  c.MakeRun(s);c.encountering=true;c.approachIce=0;c.encounteredIce=s.ice[0];
  const breaker=c.runner.rig.programs[0];breaker.abilities[0].Resolve.call(breaker,breaker.abilities[0].Enumerate.call(breaker)[0]);passResponses();
  steal(s.root[0]);assert.strictEqual(c.AgendaPoints(c.runner),7);
 }
 // Terminal outside payment itself triggers source damage once, after route costs.
 for(const grip of [3,4]) {
  reset();buffers(grip);c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];
  c.runner.creditPool=0;c.runner.clickTracker=1;c.corp.badPublicity=3;
  const s=remote();card(36048,c.corp.HQ.root).rezzed=true;const grid=card(36065,s.root);grid.rezzed=true;
  const commands=['run','gain'];assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)],grip===4?'run':'gain');
  if(grip===4){c.MakeRun(s);steal(s.root[0]);const triggers=c.currentPhase.Enumerate.trigger();
   c.currentPhase.Resolve.trigger(triggers.find(x=>x.card===grid));
   const damage=c.currentPhase.Enumerate.continue();c.currentPhase.Resolve.continue(damage.find(x=>x.id===1));passResponses();assert.strictEqual(c.AgendaPoints(c.runner),7);assert.strictEqual(c.runner.grip.length,0);assert(grid.usedThisTurn);}
 }
 // Live funding changes invalidate the reserve instead of preserving a stale route.
 reset();buffers();c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=0;c.corp.badPublicity=3;
 const liveTarget=remote();card(36048,c.corp.HQ.root).rezzed=true;c.MakeRun(liveTarget);c.approachIce=-1;
 c.runner.AI.RecalculateRunIfNeeded();assert(c.runner.AI.cachedComplete);
 c.runner.temporaryCredits=2;c.runner.AI.RecalculateRunIfNeeded();assert.strictEqual(c.runner.AI.cachedComplete,false);
 // An event's finite Stealth balance cannot fund more reductions/breaks than it owns.
 for(const count of [2,3]) {
  reset();buffers();const air=card(36018,c.runner.grip);card(36004,c.runner.rig.programs);
  for(let i=0;i<count;i++)card(31077,c.corp.HQ.ice).rezzed=true;
  c.runner.creditPool=1;c.runner.clickTracker=1;
  assert.strictEqual(!!await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,air,null,false),count===2);
 }
 // Source providers retain identity, route restrictions and real event-play gains.
 for(const id of [33017,36021,36020])for(const locked of [false,true]) {
  reset();buffers();const source=card(id,id===33017?c.runner.rig.programs:c.runner.rig.hardware);source.credits=2;
  const event=card(locked?36018:30029,c.runner.grip);card(locked?36004:30006,c.runner.rig.programs);
  card(31077,c.corp.HQ.ice).rezzed=true;c.runner.creditPool=1;c.runner.clickTracker=1;
  const before=source.credits;
  assert(await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,event,null,false));
  assert.strictEqual(c.runner.AI.rc.baseOtherCredits,(locked?4:5)+2+(id===36021?1:0));
  assert.strictEqual(source.credits,before,'source forecast restores exact balance');
  c.phases.runnerActionMain.Resolve.play({card:event});
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue().find(x=>x.server===c.corp.HQ));passResponses();
  assert.strictEqual(c.AvailableCredits(c.runner),(locked?4:5)+2+(id===36021?1:0));
  run('corp.AI=new CorpAI();corp.AI._log=function() {};');
  assert.strictEqual(c.corp.AI._effectiveRunnerCreditPool(c.corp.HQ).total,c.AvailableCredits(c.runner));
 }
 reset();const cezve=card(33017,c.runner.rig.programs);cezve.credits=2;c.runner.creditPool=0;
 const outside=remote();c.attackedServer=outside;
 assert.strictEqual(c.AvailableCredits(c.runner),0,'Cezve is central-only');
 // A finite failed attempt expires its fund, then reserves the actual fresh
 // steal fund on the successful run. It cannot carry the old fund forward.
 for(const fund of [0,3]) {
  reset();buffers();const s=remote();card(36058,s.ice).rezzed=true;card(36048,c.corp.HQ.root).rezzed=true;
  c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=3;c.corp.badPublicity=fund;c.runner.clickTracker=2;
  const commands=['run','gain'];assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)],fund===3?'run':'gain','finite fresh steal fund');
 }
 // Installed hosted funding survives a finite failed attempt at its remaining
 // balance, unlike expiring event credits. Six pays three now and three later.
 for(const credits of [5,6]) {
  reset();buffers();const source=card(36020,c.runner.rig.hardware);source.credits=credits;
  const s=remote();card(36058,s.ice).rezzed=true;card(36048,c.corp.HQ.root).rezzed=true;
  c.runner.scoreArea=[{player:c.runner,agendaPoints:6}];c.runner.creditPool=0;c.runner.clickTracker=2;
  const commands=['run','gain'];assert.strictEqual(commands[await c.runner.AI.CommandChoice(commands)],credits===6?'run':'gain','finite hosted steal funding');
  assert.strictEqual(source.credits,credits,'finite source forecast restores actual balance');
 }
 // Nested rerun exceptions restore the source overlay as well as outer state.
 reset();buffers();const finiteSource=card(36020,c.runner.rig.hardware);finiteSource.credits=6;
 card(30006,c.runner.rig.programs);const finiteServer=remote();card(36058,finiteServer.ice).rezzed=true;
 const finiteWall=card(31077,finiteServer.ice);finiteWall.rezzed=true;
 c.runner.creditPool=3;c.runner.clickTracker=2;
 Object.defineProperty(finiteWall,'strength',{get(){if(finiteSource.credits<6)throw new Error('finite source fault');return 1;}});
 await assert.rejects(()=>c.runner.AI._commonRunCalculationChecksAsync(finiteServer,null,null,false),/finite source fault/);
 assert.strictEqual(finiteSource.credits,6);assert.strictEqual(c.attackedServer,null);assert.strictEqual(c.AIHypothetical.depth,0);
 // The actual command selector cannot propose an unfunded fifth Aircheck break.
 for(const walls of [4,5]) {
  reset();for(let i=0;i<5;i++)card(30006,c.runner.grip);c.runner.identityCard=card(31013,[]);const air=card(36018,c.runner.grip),breaker=card(30006,c.runner.rig.programs);
  for(let i=0;i<walls;i++)card(31077,c.corp.HQ.ice).rezzed=true;
  card(30013,c.runner.rig.hardware);card(30070,c.corp.HQ.cards);card(30070,c.corp.HQ.cards);
  c.runner.AI.suspectedHQCards=[{title:'Superconducting Hub',cardType:'agenda',copies:2,uncertainty:0}];
  c.runner.creditPool=1;c.runner.clickTracker=1;
  const commands=['run','play','gain'];const action=commands[await c.runner.AI.CommandChoice(commands)];assert.strictEqual(action,walls===4?'play':'gain');
  if(walls===5)continue;
  c.executingCommand='play';const options=c.currentPhase.Enumerate.play(),choice=options[await c.runner.AI.SelectChoice(options)];c.executingCommand='';
  assert.strictEqual(choice.card,air);c.currentPhase.Resolve.play(choice);
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue().find(x=>x.server===c.corp.HQ));passResponses();
  for(let i=walls-1;i>=0;i--){c.encountering=true;c.approachIce=i;c.encounteredIce=c.corp.HQ.ice[i];
   breaker.abilities[0].Resolve.call(breaker,breaker.abilities[0].Enumerate.call(breaker)[0]);passResponses();}
  assert.strictEqual(air.credits,0);assert.strictEqual(c.runner.creditPool,1,'Ken income remains locked');
 }
 // C4-8: Ken is pool income, not hosted funding. Ordinary events retain that income.
 for(const locked of [false,true])for(const ken of [false,true]) {
  reset();if(ken)c.runner.identityCard=card(31013,[]);
  const event=card(locked?36018:30029,c.runner.grip);card(30006,c.runner.rig.programs);buffers();
  for(let i=0;i<(locked?5:6);i++)card(31077,c.corp.HQ.ice).rezzed=true;
  c.runner.creditPool=1;c.runner.clickTracker=1;
  const route=await c.runner.AI._commonRunCalculationChecksAsync(c.corp.HQ,event,null,false);
  assert.strictEqual(!!route,!locked&&ken,'pool income '+locked+' '+ken);
  c.phases.runnerActionMain.Resolve.play({card:event});
  c.currentPhase.Resolve.continue(c.currentPhase.Enumerate.continue().find(x=>x.server===c.corp.HQ));passResponses();
  assert.strictEqual(c.runner.creditPool,ken?1:0);
  assert.strictEqual(c.AvailableCredits(c.runner),(locked?4:5)+(ken&&!locked?1:0));
 }
}

main().then(continuationAcceptance).then(()=>console.log('Vantage Point batch 4: mechanics and strategic regressions passed.')).catch(e=>{console.error(e.stack);process.exitCode=1;});
