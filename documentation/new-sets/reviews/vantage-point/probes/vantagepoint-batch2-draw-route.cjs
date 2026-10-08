// Real RunCalculator counterexample: Stick and Poke's damage is modelled,
// but the intervening draw is omitted. Observation asserts current defect.
const assert = require('assert');
const {context:c,run,setUpBoard}=require('./vantagepoint-early-harness.cjs');
function card(id,pile){const x=c.InstanceCard(id,null,null);pile.push(x);x.cardLocation=pile;return x;}
function board(withStick){
  setUpBoard();run('runner.AI=new RunnerAI();runner.AI._log=function() {};');
  c.runner.rig.programs=[];c.runner.rig.resources=[];c.runner.grip=[];c.runner.stack=[];
  card(30020,c.runner.grip);card(30020,c.runner.stack);
  c.runner.creditPool=10;c.runner.clickTracker=4;
  c.corp.HQ.ice=[];
  card(30073,c.corp.HQ.ice).rezzed=true; // inner Tithe: one net damage, credits to Corp
  card(36039,c.corp.HQ.ice).rezzed=true; // outer ezaM: no ETR or damage
  if(withStick)card(36008,c.runner.rig.resources);
  c.attackedServer=null;c.encountering=false;c.approachIce=-1;
  return c.runner.AI._calculateBestCompleteRun(c.corp.HQ,0,0,0,0,null,1);
}
assert(board(false),'one-card grip survives ordinary Tithe');
assert.strictEqual(board(true),null,'current planner omits draw and rejects neutral damage/draw followed by one damage');
console.log('Stick and Poke: real RC accepts ordinary one-card Tithe route, rejects it when the first encounter deals one damage then replenishes that card before Tithe.');
