// Run with: node tests/pending/baker-next-turn-backdoor-threat.test.js
// Reconstructs the public Baker/Touchstone state after the runs at lines
// 120-134 and 169-180 of corp_still_not_protecting_archives_from_baker.txt.
// The retained-credit case is a counterfactual isolating the stale turn flag.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const corp = {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []},
  archives: {cards: [], ice: [], root: []}, remoteServers: []};
const runner = {grip: [], stack: [], heap: [], AI: null};
const context = {console, corp, runner, playerTurn: corp, attackedServer: null,
  cardSet: [], setIdentifiers: [], currentPhase: {identifier: 'Corp 2.2'}};
let installed = [];
context.InstalledCards = () => installed;
context.ActiveCards = () => installed;
context.CheckHasAbilities = () => true;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
for (const file of ['config.js', 'ai_corp.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
vm.runInContext('reviewAI = new CorpAI()', context);
const ai = context.reviewAI;
const baker = Object.assign({}, context.cardSet[36015], {usedThisTurn: true});
const touchstone = Object.assign({}, context.cardSet[36021], {credits: 0});
installed = [baker, touchstone];
let failures = 0;
function check(name, fn) {
  try { fn(); if (process.env.VERBOSE) console.log('PASS ' + name); }
  catch (error) { failures++; console.error('FAIL ' + name + ': ' + error.message); }
}
check('next Runner turn resets Baker even when a usable credit is retained', () => {
  touchstone.credits = 1;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  assert.strictEqual(baker.usedThisTurn, true, 'planning must not reset live state');
  assert.strictEqual(context.attackedServer, null);
  context.playerTurn = runner;
  assert.strictEqual(baker.AIRedirectsRun(corp.archives, corp.HQ), false,
    'Baker remains unavailable during the turn in which it was used');
  context.playerTurn = corp;
});
check('candidate recognises potential refill without inspecting hidden events', () => {
  baker.usedThisTurn = false; // isolate refill from the independent stale flag
  touchstone.credits = 0;
  ai.options.projectedRedirectThreats = true;
  for (const field of ['grip', 'stack'])
    Object.defineProperty(runner, field, {get() { throw new Error('hidden ' + field + ' read'); }});
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  assert.strictEqual(touchstone.credits, 0, 'planning must not create real credits');
  assert.strictEqual(baker.AIRedirectsRun(corp.archives, corp.HQ), false,
    'potential refill must not allow an actual unfunded redirect');
  assert.strictEqual(context.attackedServer, null);
});
console.log('2 Baker next-turn threat cases, ' + failures + ' failed.');
process.exitCode = failures ? 1 : 0;
