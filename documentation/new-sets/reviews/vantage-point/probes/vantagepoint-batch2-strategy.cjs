const note=(...args)=>{if(process.env.VERBOSE) console.log(...args);};
const assert=require('assert');const {context:c,run,setUpBoard}=require('./vantagepoint-early-harness.cjs');
function reset(){setUpBoard();run('runner.AI=new RunnerAI();runner.AI._log=function() {};runner.AI._random=function() {return 0;};');c.runner.grip=[];c.runner.rig.resources=[];}
function card(id,pile){const x=c.InstanceCard(id,null,null);pile.push(x);x.cardLocation=pile;return x;}
async function nurse(host,credits,reveal){reset();if(host)card(36006,c.runner.rig.resources);const n=card(36007,c.runner.grip);c.runner.creditPool=credits;c.corp.archives.cards=[];for(let i=0;i<reveal;i++){const x=card(30070,c.corp.archives.cards);x.faceUp=false;}const opts=['install','draw','gain'];const ix=await c.runner.AI.CommandChoice(opts);const pref=c.runner.AI.preferred;note('Nurse/Hackerspace host='+host+' credits='+credits+' facedown='+reveal+' decision='+opts[ix]+' preferredHost='+(pref&&pref.hostToInstallTo&&pref.hostToInstallTo.title));return {action:opts[ix],pref,n};}
async function main(){
let r=await nurse(true,1,2);assert.strictEqual(r.action,'install');assert.strictEqual(r.pref.hostToInstallTo,null);
const legal=c.ChoicesCardInstall(r.n);assert(legal.some(x=>x.host&&x.host.title==='Hackerspace'));c.executingCommand='install';const selected=await c.runner.AI.SelectChoice(legal);assert.strictEqual(legal[selected].host,null);note('Hackerspace actual SelectChoice selects ordinary paid install');note('Hackerspace hosted cost='+c.InstallCost(r.n,c.runner.rig.resources[0])+' normal='+c.InstallCost(r.n));
await nurse(true,0,2);await nurse(false,1,2);await nurse(false,1,0);await nurse(false,1,1);
reset(); const stick=card(36008,c.runner.rig.resources);c.runner.grip=[];c.runner.creditPool=10;c.runner.rig.programs=[];c.corp.HQ.ice=[];const ice=card(31065,c.corp.HQ.ice);ice.rezzed=true;c.attackedServer=c.corp.HQ;c.approachIce=c.corp.HQ.ice.length-1;
const path=c.runner.AI._calculateBestCompleteRun(c.corp.HQ,0,0,0,0,null,c.approachIce);note('Stick and Poke empty grip/no breaker complete route='+Boolean(path));assert.strictEqual(path,null);
c.runner.grip.push(c.InstanceCard(30020,null,null));const path2=c.runner.AI._calculateBestCompleteRun(c.corp.HQ,0,0,0,0,null,c.approachIce);note('Stick and Poke one card/no breaker complete route='+Boolean(path2));assert(path2);
}
main().then(()=>console.log('Batch 2 destination, reveal and damage-budget observations reproduced.')).catch(e=>{console.error(e.stack);process.exitCode=1;});
