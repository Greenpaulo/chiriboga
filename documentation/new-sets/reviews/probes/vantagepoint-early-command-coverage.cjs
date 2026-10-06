// Broad real command exercise. Printed observations alone are not strategy acceptance.
const {context:c,run,setUpBoard}=require('./vantagepoint-early-harness.cjs');
let failures=0;
async function main(){
for(let id=36001;id<=36020;id++){
for(const credits of [1,10]){
setUpBoard();run('runner.AI = new RunnerAI(); runner.AI._log = function() {}; runner.AI._random = function() {return 0;}; corp.AI = null;');
c.runner.grip=[];c.runner.creditPool=credits;
const obj=c.InstanceCard(id,null,null);
if(obj.cardType==='identity'){c.runner.identityCard=obj;obj.cardLocation=null;}else{c.runner.grip.push(obj);obj.cardLocation=c.runner.grip;}
try{const options=['run','play','install','gain','draw','trigger'];const idx=await c.runner.AI.CommandChoice(options);const pref=c.runner.AI.preferred; if(process.env.VERBOSE)console.log(id+' credits='+credits+' -> '+options[idx]+' '+(pref?(pref.cardToInstall||pref.cardToPlay||pref.cardToTrigger||pref.serverToRun||{}).title||'':'') );}
catch(e){failures++;console.log(id+' credits='+credits+' -> ERROR '+e.message);}
}
}
}
main().then(()=>{console.log('Early Vantage Point command smoke: '+(40-failures)+' of 40 cases completed.');if(failures)process.exitCode=1;}).catch(e=>{console.error(e);process.exitCode=1;});
