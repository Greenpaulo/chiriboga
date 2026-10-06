// Review observations, not green acceptance tests. Assertions document current defects.
const assert = require('assert');
const {context:c,run,setUpBoard}=require('./vantagepoint-early-harness.cjs');
const originalDecisionPhase=c.DecisionPhase;
function reset(){ c.DecisionPhase=originalDecisionPhase; setUpBoard(); run('runner.AI = new RunnerAI(); runner.AI._log = function() {}; runner.AI._random = function() { return 0; }; corp.AI = null;'); }
function card(id, pile){ const obj=c.InstanceCard(id,null,null); pile.push(obj); obj.cardLocation=pile; return obj; }
async function main(){
reset(); const chain=card(36001,c.runner.grip); c.currentPhase={triggerList:[],instruction:'Review'};
for(const server of [c.corp.HQ,c.corp.RnD,c.corp.archives]){c.attackedServer=server; c.AddTriggersToTriggerList('responseOnRunSuccessful');}
assert.strictEqual(chain.Enumerate().length,0);
console.log('36001 actual automatic dispatch: all three successful runs leave event unplayable');
reset(); const dive=card(36002,c.runner.resolvingCards); dive.runningWithThis=true;dive.subroutineResolvedThisRun=true;c.attackedServer=c.corp.HQ;c.currentPhase={triggerList:[],instruction:'Review'};
assert.throws(()=>c.AddTriggersToTriggerList('responseOnRunSuccessful'), /AddBadPublicity is not defined/);
console.log('36002 actual success dispatch: ReferenceError AddBadPublicity is not defined');
reset(); const komp=card(36010,c.runner.resolvingCards);komp.runningWithThis=true;komp.runWasSuccessful=true;c.attackedServer=c.corp.HQ;c.corp.HQ.ice=[];c.DecisionPhase=(player,choices,cb,title,instruction,owner)=>{assert.throws(()=>cb.call(owner,choices[0]), /AddBadPublicity is not defined/);return {};};
komp.responseOnRunEnds.Resolve.call(komp);
console.log('36010 real run-end choice resolution: ReferenceError AddBadPublicity is not defined');
reset(); const sell=card(36011,c.runner.grip); card(36016,c.runner.rig.resources);
assert.throws(()=>c.runner.AI._wastefulToPlay(sell,sell.Enumerate()), /length/);
console.log('36011 actual RunnerAI._wastefulToPlay consumer: TypeError on legal resource choice');
reset(); const rotary=card(36014,c.runner.rig.hardware); c.runner.grip=[];c.runner.tags=0;c.runner.clickTracker=0;
c.currentPhase={identifier:'Review Rotary',title:'Rotary',triggerCallbackName:'responseOnBreach'};c.executingCommand='trigger';
const choices=rotary.responseOnBreach.Enumerate.call(rotary,c.corp.HQ);
let chosen=await c.runner.AI.SelectChoice(choices);assert.strictEqual(choices[chosen].use,true);
c.runner.AI._random=()=>0.99;chosen=await c.runner.AI.SelectChoice(choices);assert.strictEqual(choices[chosen].use,false);
console.log('36014 real SelectChoice: same no-click board accepts or declines tag solely by random seed');
reset(); const hacker=card(36006,c.runner.rig.resources); const nurse=card(36007,c.runner.grip);
const install=c.ChoicesCardInstall(nurse);assert(install.some(x=>x.host===hacker));assert(install.some(x=>!x.host));
console.log('36006 real legal install choices: '+install.map(x=>x.host===hacker?'Hackerspace':'ordinary').join(', '));
reset(); const under=card(36016,c.runner.grip); c.runner.clickTracker=1; c.runner.creditPool=1;c.runner.grip=[];c.runner.grip.push(under);under.iceRezzedThisTurn=false;
const ix=await c.runner.AI.CommandChoice(['install','gain']);
console.log('36016 real last-click no-rez command: '+['install','gain'][ix]+' '+JSON.stringify(c.runner.AI.preferred&&c.runner.AI.preferred.cardToInstall&&c.runner.AI.preferred.cardToInstall.title));
reset(); const air=card(36018,c.runner.resolvingCards);air.runningWithThis=true;air.primaryRun=true;air.primaryRunWasSuccessful=true;air.credits=0;
const rem=c.NewServer('Remote',false);c.corp.remoteServers.push(rem);c.runner.AI.cachedPotentials=[{server:rem,potential:3}];
// Exact cache shape obtained from the AI helper: add a cached-cost/potential through its real fields.
c.runner.AI.cachedPotentials=[]; c.runner.AI.cachedPotentials.push({server:rem,potential:3});
console.log('36018 optional remote response choices: '+air.responseOnRunEnds.Enumerate.call(air).map(x=>x.server?'remote':'decline').join(', '));
reset(); const beta=card(36019,c.runner.grip);c.runner.stack=[];card(30005,c.runner.stack);card(30006,c.runner.stack);c.runner.rig.programs=[];c.runner.creditPool=10;c.currentPhase={title:'Playing Beta Build',identifier:'Playing Beta Build'};c.executingCommand='play';
const bchoices=beta.Enumerate();c.runner.AI.serverList=[{server:c.corp.HQ}];c.runner.AI._random=()=>0;const bi=await c.runner.AI.SelectChoice(bchoices);c.runner.AI._random=()=>0.99;const bj=await c.runner.AI.SelectChoice(bchoices);
assert.notStrictEqual(bi,bj);console.log('36019 real play SelectChoice without nextPrefs: random program/server '+bchoices[bi].card.title+'/'+c.ServerName(bchoices[bi].server)+' vs '+bchoices[bj].card.title+'/'+c.ServerName(bchoices[bj].server));
reset(); const meth=card(36020,c.runner.grip);card(36013,c.runner.grip);c.runner.creditPool=4;c.runner.clickTracker=2;c.runner.startingMU=4;c.runner.rig.hardware=[];
assert.strictEqual(typeof meth.AIEconomyInstall,'number');const mi=await c.runner.AI.CommandChoice(['install','gain']);
console.log('36020 real economy choice with fuel and 4 credits: '+['install','gain'][mi]+' '+(c.runner.AI.preferred&&c.runner.AI.preferred.cardToInstall&&c.runner.AI.preferred.cardToInstall.title)+'; numeric hook has no economy consumer');
reset(); const goods=card(36013,c.runner.grip);c.runner.clickTracker=1;c.runner.creditPool=0;c.runner.startingMU=2;c.runner.rig.programs=[];card(30005,c.runner.rig.programs);card(30006,c.runner.rig.programs);c.runner.rig.resources=[];c.currentPhase=c.phases.runnerActionMain;
const gix=await c.runner.AI.CommandChoice(['install','gain']);console.log('36013 real last-click no-pool command: '+['install','gain'][gix]);
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
