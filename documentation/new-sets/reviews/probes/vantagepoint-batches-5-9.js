// Run from repository root: node documentation/new-sets/reviews/probes/vantagepoint-batches-5-9.js
// Review probe: real card selectors, CorpAI.Choice and RunnerAI.SelectChoice.
// Reuses only the public-board engine adapters from the regression harness;
// no strategy method is stubbed. Expected findings are asserted as current
// behavior, so passing this probe is NOT evidence that these cards are correct.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = process.cwd();
let harness = fs.readFileSync('tests/corp-server-security.test.js', 'utf8');
harness = harness.slice(0, harness.indexOf('let tests = 0;'));
harness = harness.replace("const root = path.resolve(__dirname, '..');", 'const root = process.cwd();');
const h = new Function('require', '__dirname', harness + '\nreturn {context, corp, runner, ai, card, setServers: value => {servers = value;}};')(require, __dirname);
const {context: c, corp, runner, ai, card} = h;
vm.runInContext(fs.readFileSync('ai_runner.js', 'utf8') + '\nthis.runnerReviewAI = new RunnerAI();', c);
const utility = fs.readFileSync('utility.js','utf8');
vm.runInContext(utility.slice(utility.indexOf('const k_combinations ='),utility.indexOf('const combinations =')),c);
runner.AI = c.runnerReviewAI;
runner.AI._log = () => {};
corp.AI = ai;
const makeServer = name => ({serverName: name, cards: [], root: [], ice: []});
corp.HQ = makeServer('HQ'); corp.RnD = makeServer('R&D'); corp.archives = makeServer('Archives');
corp.remoteServers = [makeServer('Remote 0')];
const servers = [corp.HQ, corp.RnD, corp.archives, ...corp.remoteServers];
h.setServers(servers);
c.executingCommand = '';
c.currentPhase = {title: 'Review', identifier: 'Review'};
c.LogError = () => {};
c.Log = () => {};
c.ChoicesArrayCards = (cards, filter) => cards.filter(x => !filter || filter(x)).map(card => ({card, label: card.title}));
c.ChoicesExistingServers = () => servers.map(server => ({server}));
c.CheckActionClicks = (player, n) => player.clickTracker >= n;
c.AvailableMemory = () => 4;
c.InstalledMemoryCost = () => 0;
c.CheckUnique = () => true;
c.FullCheckPlay = () => true;
c.InstallCost = card => card.installCost || 0;
c.PlayCost = card => card.playCost || 0;
c.CheckInstall = () => true;
c.CheckPlay = () => true;
c.CheckTags = n => runner.tags >= n;
c.PlayerHand = player => player === runner ? runner.grip : corp.HQ.cards;
c.PlayerDeck = player => player === runner ? runner.stack : corp.RnD.cards;
c.PlayerTrash = player => player === runner ? runner.heap : corp.archives.cards;
c.MemoryUnits = () => 4;
c.MoveCard = (card, destination, index) => {
  if (card.cardLocation) { const i = card.cardLocation.indexOf(card); if (i >= 0) card.cardLocation.splice(i, 1); }
  if (index === undefined) destination.push(card); else destination.splice(index, 0, card);
  card.cardLocation = destination;
};
c.CheckTrash = () => true;
c.AddCounters = (card, type, n) => {card[type] = (card[type] || 0) + n;};
c.RemoveCounters = (card, type, n) => {card[type] = (card[type] || 0) - n;};
c.AddTags = (n, callback, owner) => {runner.tags += n; if (callback) callback.call(owner);};
c.LoseCredits = (player, n) => {player.creditPool = Math.max(0, player.creditPool - n);};
c.Draw = (player, n) => { for (let i=0; i<n; i++) {const deck=c.PlayerDeck(player); if(deck.length) c.MoveCard(deck[deck.length-1], c.PlayerHand(player));} };
c.CheckRunning = () => c.attackedServer !== null;
c.debugging = false;
runner.tags = 0;
corp.identityCard = {title:'Review identity',faction:'Haas-Bioroid'};
runner.identityCard = {title:'Review Runner',faction:'Shaper'};
runner.rig = {programs:[],hardware:[],resources:[]};
c.GetApproachEncounterIce = () => c.attackedServer && c.attackedServer.ice[c.approachIce];
c.CheckEncounter = () => c.encountering;
c.CheckClicks = (player,n) => player.clickTracker >= n;
c.CheckStrength = (card,n) => c.Strength(card) >= n;
c.TrashCost = card => card.trashCost || 0;
c.PlayCost = card => card.playCost || 0;
c.ChoicesCardInstall = card => [{card}];
c.ChoicesArrayInstall = (cards,ignore,filter) => cards.filter(card=>!filter||filter(card)).flatMap(card=>servers.map(server=>({card,server})));
c.AdvancementRequirement = card => card.advancementRequirement || 0;
c.CheckPlay = () => true;
c.FullCheckInstall = () => true;
c.AllCards = player => c.InstalledCards(player).concat(player===corp?corp.HQ.cards.concat(corp.archives.cards):runner.grip.concat(runner.heap));
c.ChoicesTriggerableAbilities = () => [];
c.CheckAccess = () => true;
c.ChoicesInstalledCards = (player,filter) => c.InstalledCards(player).filter(card=>!filter||filter(card)).map(card=>({card}));
let decisions = [];
c.DecisionPhase = (player, choices, callback, title, text, owner) => {
  decisions.push({player, choices, title, text, choose: option => callback.call(owner, option)});
};
function corpChoose(decision) {
  c.currentPhase = {title: decision.title, identifier: 'Review decision'};
  const index = ai.Choice(decision.choices, 'select');
  decision.choose(decision.choices[index]);
  return decision.choices[index];
}
let checks = 0;
const observations = [];
function observe(name, body) {body(); checks++; observations.push(name);}

async function main() {
  observe('Read-Write Share hides a unique emergency breaker based only on ELO', () => {
    const share = card(36022); share.hostedCards = [];
    const emergency = {title: 'Only decoder', cardType: 'program', subTypes: ['Icebreaker', 'Decoder'], memoryCost:1, elo: 1300, player: runner};
    runner.grip = [emergency, {title:'Extra economy', cardType:'event',subTypes:[],player:runner,elo:1600}, {title:'Extra economy 2',cardType:'event',subTypes:[],player:runner,elo:1700}];
    assert(runner.AI._cardsWorthKeeping(runner.grip).includes(emergency),'real keep scorer retains the only decoder');
    const choices = share.responseOnRunnerTurnBegins.Enumerate.call(share);
    assert.strictEqual(choices.length, 1); assert.strictEqual(choices[0].card, emergency);
    runner.grip = [emergency];
    assert.strictEqual(share.responseOnRunnerTurnBegins.Enumerate.call(share)[0].card, null);
  });
  observe('Sipa uses the real public threat/potential scorer and preferred-option consumer', () => {
    const sipa=card(36023); sipa.usedThisTurn=false;
    const heavy={title:'Expensive barrier', cardType:'ice', player:corp, rezzed:true, rezCost:8, subTypes:['Barrier'], subroutines:[{broken:true}]};
    const light={title:'Cheap barrier', cardType:'ice', player:corp, rezzed:true, rezCost:1, subTypes:['Barrier'], subroutines:[{}]};
    corp.HQ.ice=[heavy]; corp.archives.ice=[light]; runner.cards=[];
    c.attackedServer=corp.HQ; c.approachIce=0;
    runner.AI.cachedPotentials=[{server:corp.HQ,potential:3},{server:corp.archives,potential:1}];
    const choices=sipa.responseOnPassesIce.Enumerate.call(sipa);
    assert.strictEqual(runner.AI.preferred.option.card,light);
    c.currentPhase={title:'Sipa',identifier:'Review'};
    // The async real SelectChoice is exercised below; both cached states use real scoring.
    light.rezCost=30;
    sipa.responseOnPassesIce.Enumerate.call(sipa);
    assert.strictEqual(runner.AI.preferred.option.card,null);
    runner.AI.preferred={title:'Sipa',option:choices[0]};
  });
  observe('Stowaway host selector prefers a locked three-ice server over a cheap central', () => {
    const stowaway=card(36024);
    const cheap=card(36029); cheap.rezzed=true;
    const lock=card(36028); lock.rezzed=true;
    corp.HQ.ice=[cheap]; corp.HQ.root=[];
    corp.remoteServers[0].ice=[lock,{...lock},{...lock}]; corp.remoteServers[0].root=[];
    runner.cards=[card(31006)]; runner.tags=0;
    assert(runner.AI.rc.Calculate(corp.HQ,1,13,0,Infinity,Infinity,false,null).length>0);
    assert.strictEqual(runner.AI.rc.Calculate(corp.remoteServers[0],1,13,0,Infinity,Infinity,false,null).length,0);
    runner.cards=[];
    const choices=[{host:cheap},{host:lock}];
    assert.strictEqual(stowaway.AIPreferredInstallChoice.call(stowaway,choices),1);
    assert.strictEqual(stowaway.AIPreferredInstallChoice.call(stowaway,[]),-1);
  });
  observe('Sleipnir draws into a full HQ and declines to recycle an exposed winning HQ agenda', () => {
    const sleipnir=card(36030);
    corp.HQ.cards=Array.from({length:5},(_,i)=>({title:'HQ '+i,cardType:'operation'}));
    const top={title:'Extra agenda',cardType:'agenda',agendaPoints:2};
    corp.RnD.cards=[top]; top.cardLocation=corp.RnD.cards;
    decisions=[]; sleipnir.subroutines[0].Resolve.call(sleipnir);
    assert.strictEqual(corpChoose(decisions[0]).id,1); assert.strictEqual(corp.HQ.cards.length,6);
    corp.HQ.cards=[top]; top.cardLocation=corp.HQ.cards; corp.archives.cards=[];
    runner.agendaPoints=5; c.attackedServer=corp.HQ;
    decisions=[]; sleipnir.subroutines[1].Resolve.call(sleipnir);
    assert.strictEqual(corpChoose(decisions[0]).card,null);
    corp.RnD.cards=[]; decisions=[]; sleipnir.subroutines[0].Resolve.call(sleipnir);
    assert.strictEqual(corpChoose(decisions[0]).id,0);
  });
  observe('Perfect Recall offers an agenda title on unrelated empty Archives and repeats protection', () => {
    const recall=card(36035); recall.power=2;
    const agenda={title:'HQ agenda',cardType:'agenda',agendaPoints:3,player:corp};
    corp.HQ.cards=[agenda]; corp.archives.cards=[]; corp.archives.root=[];
    c.attackedServer=corp.archives;
    const choice=recall.abilities[0].Enumerate.call(recall);
    assert.strictEqual(choice.length,1); assert.strictEqual(choice[0].card,agenda);
    recall.power=0; assert.strictEqual(recall.abilities[0].Enumerate.call(recall).length,0);
  });
  observe('Méliès U loses its keep preference because the decision title is a department name', () => {
    const identity=card(36036); identity.department='HQ';
    const good={title:'High-value ICE',cardType:'ice',elo:1900};
    const poor={title:'Low-value operation',cardType:'operation',elo:1000};
    corp.RnD.cards=[good]; corp.archives.cards=[poor]; good.cardLocation=corp.RnD.cards; poor.cardLocation=corp.archives.cards;
    decisions=[]; identity._resolveDepartmentEffect.call(identity);
    assert.strictEqual(ai.preferred.option.id,0);
    assert.strictEqual(decisions[0].title,'Tenure Floors');
    // Observe selection only: don't invoke Trash adapter, so downstream state is untouched.
    c.currentPhase={title:decisions[0].title,identifier:'Review'};
    assert.strictEqual(decisions[0].choices[ai.Choice(decisions[0].choices,'select')].id,1);
    ai.preferred=null;
  });
  observe('Knowledge Seeker orders a winning agenda on top during an R&D run', () => {
    const seeker=card(36040);
    const agenda={title:'Winning two-pointer',cardType:'agenda',agendaPoints:2,elo:1600};
    const filler={title:'Filler operation',cardType:'operation',elo:1200};
    corp.RnD.cards=[agenda,filler]; for (const x of corp.RnD.cards) x.cardLocation=corp.RnD.cards;
    c.attackedServer=corp.RnD; runner.agendaPoints=5;
    seeker.subroutines[1].Resolve.call(seeker);
    assert.strictEqual(corp.RnD.cards[corp.RnD.cards.length-1],agenda);
  });
  observe('ezaM filters a revealed top agenda away and keeps a non-agenda', () => {
    const ezam=card(36039);
    const agenda={title:'Agenda',cardType:'agenda'}; const economy={title:'Economy',cardType:'operation'};
    corp.RnD.cards=[economy,agenda]; for(const x of corp.RnD.cards)x.cardLocation=corp.RnD.cards;
    decisions=[]; ezam.subroutines[0].Resolve.call(ezam); assert.strictEqual(corpChoose(decisions[0]).id,1);
    assert.strictEqual(corp.RnD.cards[corp.RnD.cards.length-1],economy);
    decisions=[]; ezam.subroutines[0].Resolve.call(ezam); assert.strictEqual(corpChoose(decisions[0]).id,0);
  });
  observe('Lotus Haze enumerates moving The Red Room to a remote', () => {
    const lotus=card(36037); lotus.agenda=1; const red=card(36045); red.rezzed=true;
    corp.HQ.root=[red]; const destinations=lotus._destinationChoices.call(lotus,red);
    assert(destinations.some(choice=>choice.server===corp.remoteServers[0]));
    assert.strictEqual(red.installOnlyIn(corp.remoteServers[0]),false);
    // This is a rules question, not asserted as a supported defect.
  });
  runner.grip=[]; runner.cards=[]; runner.AI.preferred=null;
  const rc=runner.AI.rc;
  observe('Luxury Line is treated as reachable with zero clicks remaining', () => {
    const target=corp.remoteServers[0]; const agenda=card(36026); agenda.knownToRunner=true;
    target.root=[agenda]; target.ice=[];
    const paths=rc.Calculate(target,0,0,0,0,0,false,null);
    assert(paths.length>0); assert.strictEqual(agenda.stealCost.clicks,1);
    target.root=[];
  });
  observe('Vertigo zero-click pass restriction is omitted when its subroutine is broken', () => {
    const target=corp.remoteServers[0]; const vertigo=card(36031); vertigo.rezzed=true;
    target.ice=[vertigo]; target.root=[];
    const decoder=card(31033); decoder.strength=2; runner.cards=[decoder];
    const paths=rc.Calculate(target,0,5,0,0,0,false,null);
    assert(paths.length>0);
    assert(paths.some(path=>path.some(point=>point.sr_broken.some(sr=>sr.idx===0))));
    runner.cards=[];
  });
  for (const [id,damageLimit,tags,expectRoute] of [[36029,5,0,false],[36041,6,0,true],[36041,1,0,false],[36042,4,0,true],[36042,1,2,false]]) {
    const target=corp.remoteServers[0]; const ice=card(id); ice.rezzed=true;
    target.ice=[ice]; target.root=[]; runner.tags=tags; runner.cards=[];
    const paths=rc.Calculate(target,3,10,0,damageLimit,Infinity,false,null);
    assert.strictEqual(paths.length>0,expectRoute,`${id} route expectation`); checks++;
  }
  // Real subroutine menu mapping for Lionsmane follows a complete planned route.
  const lionsmane=card(36041); lionsmane.rezzed=true;
  const target=corp.remoteServers[0]; target.ice=[lionsmane]; target.root=[];
  runner.tags=0; runner.grip=[{},{},{},{},{},{},{}]; runner.creditPool=10;
  c.attackedServer=target; c.approachIce=0; c.subroutine=3;
  const lionPaths=rc.Calculate(target,3,10,0,6,Infinity,false,null);
  runner.AI.cachedBestPath=lionPaths.reduce((a,b)=>rc.PathCost(a)<rc.PathCost(b)?a:b);
  runner.AI.cachedPathServer=target; runner.AI.cachedComplete=true;
  decisions=[]; lionsmane.subroutines[2].Resolve.call(lionsmane);
  c.currentPhase={title:decisions[0].title,identifier:'Run Subroutines'};
  const lionChoice=await runner.AI.SelectChoice(decisions[0].choices);
  assert.strictEqual(decisions[0].choices[lionChoice].id,0,'complete route accepts survivable net damage'); checks++;
  // Real Runner action choice exposes the documented economy-hook type mismatch.
  const touchstone=card(36021); runner.grip=[touchstone]; runner.cards=[];
  runner.clickTracker=4; runner.creditPool=5; runner.AI.preferred=null;
  c.currentPhase={identifier:'Runner 2.2',title:"Runner's Action Phase"}; c.executingCommand='';
  const commands=['install','gain'];
  const commandIndex=await runner.AI.CommandChoice(commands);
  assert.strictEqual(commands[commandIndex],'gain','numeric economy hook is ignored'); checks++;
  observe('Ansel 2.0 real routes require two clicks for its paid break', () => {
    const ansel=card(36028); ansel.rezzed=true; target.ice=[ansel]; target.root=[];
    runner.grip=[]; runner.cards=[]; runner.heap=[]; corp.HQ.cards=[]; corp.archives.cards=[];
    assert(rc.Calculate(target,2,0,0,0,0,false,null).length>0);
    assert.strictEqual(rc.Calculate(target,1,0,0,0,0,false,null).length,0);
  });
  observe('Reverb real routes require its two barrier breaks', () => {
    const reverb=card(36029); reverb.rezzed=true; target.ice=[reverb];
    const corroder=card(31006); runner.cards=[corroder];
    assert(rc.Calculate(target,3,2,0,0,0,false,null).length>0);
    assert.strictEqual(rc.Calculate(target,3,1,0,0,0,false,null).length,0);
    runner.cards=[];
  });
  observe('Perfect Recall is not rezzed before an otherwise game-winning breach', () => {
    const recall=card(36035); recall.rezzed=false; recall.power=0;
    const agenda=card(36037); target.root=[recall,agenda]; target.ice=[]; corp.HQ.cards=[card(36037)];
    corp.creditPool=5; runner.agendaPoints=5; c.attackedServer=target; c.approachIce=-1;
    assert.strictEqual(ai._runnerMayWinIfServerBreached(target),true);
    ai.preferred=null; c.currentPhase={identifier:'Run 4.5',title:'Movement'};
    assert.strictEqual(ai.Choice(['rez','n'],'command'),1);
    target.root=[];
  });
  observe('Unleash selects Lionsmane instead of a lethal Vicsek on five tags', () => {
    const unleash=card(36044); const lion=card(36041); const vicsek=card(36042);
    lion.rezzed=false; vicsek.rezzed=false; target.ice=[lion,vicsek];
    c.attackedServer=null; runner.tags=5; runner.grip=[{},{},{}];
    assert.strictEqual(unleash.Enumerate.call(unleash)[0].card,lion);
    decisions=[]; unleash._offerSubroutine.call(unleash,{...lion,rezzed:true});
    assert.strictEqual(decisions[0].choices[0].subroutine,lion.subroutines[0]);
    assert.strictEqual(runner.tags-1,4,'Vicsek would do four net damage after the additional tag cost');
    runner.tags=0; assert.strictEqual(unleash.Enumerate.call(unleash).length,0);
  });
  observe('Cultivate trashes the only available winning Neurospike under its ELO sorter', () => {
    const cultivate=card(36043); const spike=card(30049); spike.printedAgendaPointsThisTurn=2;
    const filler=card(30050); // Anoetic Void ELO 1911, higher than lethal Neurospike 1678.
    corp.RnD.cards=[spike,filler]; spike.cardLocation=corp.RnD.cards; filler.cardLocation=corp.RnD.cards;
    runner.grip=[{}]; corp.creditPool=3; corp.clickTracker=2;
    decisions=[]; cultivate.Resolve.call(cultivate);
    assert.strictEqual(decisions[0].choices[0].card,spike);
    assert(spike.printedAgendaPointsThisTurn>runner.grip.length);
  });
  observe('Caveat Emptor grants the extra click that opens two Ansel defenses at five Runner points', () => {
    const caveat=card(36032); const a=card(36028); a.rezzed=true;
    target.ice=[a,{...a}]; target.root=[]; runner.cards=[]; runner.grip=[]; runner.heap=[];
    runner.tags=0; runner.agendaPoints=5; corp.HQ.cards=[]; corp.archives.cards=[];
    const mode=caveat.Enumerate.call(caveat)[0]; assert.strictEqual(mode.clicks,1);
    c.attackedServer=target;
    assert(rc.Calculate(target,4,0,0,0,0,false,null).length>0,'five-click turn leaves four after initiating run');
    assert.strictEqual(rc.Calculate(target,2,0,0,0,0,false,null).length,0,'denial turn leaves two');
    runner.agendaPoints=6; assert.strictEqual(caveat.Enumerate.call(caveat)[0].clicks,-1);
  });
  observe('realloc() real protection scorer declines low-value pairs and permits an expensive pair', () => {
    const realloc=card(36033); const low1=card(36031),low2=card(36031);
    low1.rezzed=true; low2.rezzed=true; target.ice=[low1,low2]; target.root=[];
    corp.HQ.ice=[]; corp.RnD.ice=[]; corp.archives.ice=[];
    assert.strictEqual(realloc.Enumerate.call(realloc).length,0);
    const costly1=card(36028),costly2=card(36028); costly1.rezzed=true; costly2.rezzed=true;
    target.ice=[costly1,costly2]; assert.strictEqual(realloc.Enumerate.call(realloc).length,1);
  });
  observe('Synchrocyclotron real install ranking seeks a Double and rejects unaffordable setup', () => {
    const synchro=card(36027); corp.clickTracker=3; corp.creditPool=10; corp.HQ.cards=[synchro];
    corp.RnD.cards=[]; corp.archives.cards=[]; target.ice=[]; target.root=[];
    let ranked=ai._rankedInstallOptions([synchro]);
    assert(!ranked.some(option=>option.cardToInstall===synchro));
    corp.HQ.cards=[synchro,card(36034)];
    ranked=ai._rankedInstallOptions([synchro]);
    assert(ranked.some(option=>option.cardToInstall===synchro));
    corp.creditPool=2; ranked=ai._rankedInstallOptions([synchro]);
    assert(!ranked.some(option=>option.cardToInstall===synchro));
  });
  observe('Retirement Plan real install scorer declines empty Archives and returns legal ICE destination', () => {
    const retirement=card(36034); corp.creditPool=10; corp.clickTracker=3; corp.HQ.cards=[]; corp.archives.cards=[];
    assert.strictEqual(retirement.Enumerate.call(retirement).length,0);
    corp.archives.cards=[card(36029)];
    const choices=retirement.Enumerate.call(retirement);
    assert.strictEqual(choices.length,1); assert.strictEqual(choices[0].card,corp.archives.cards[0]);
    assert(servers.includes(choices[0].server));
  });
  for(const id of [36022,36023,36024,36025]) {
    const installed=card(id); runner.grip=[installed]; runner.cards=[]; runner.tags=0; runner.clickTracker=4;
    c.attackedServer=null; c.currentPhase={identifier:'Runner 2.2',title:"Runner's Action Phase"};
    c.executingCommand=''; runner.AI.preferred=null; runner.creditPool=13;
    const commands=['install','gain'];
    assert.strictEqual(commands[await runner.AI.CommandChoice(commands)],'install',`${id} rich state installs`);
    runner.creditPool=0; runner.AI.preferred=null;
    assert.strictEqual(commands[await runner.AI.CommandChoice(commands)],'gain',`${id} poor state holds`);
    checks++;
  }
  console.log(checks+' review selector/planner probes passed (current behavior; see reports).');
  console.log(JSON.stringify(observations));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
