'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const corp = {HQ: {cards: [], ice: [], root: []}, RnD: {cards: [], ice: [], root: []},
  archives: {cards: [], ice: [], root: []}, remoteServers: []};
const runner = {AI: null};
for (const field of ['grip', 'stack'])
  Object.defineProperty(runner, field, {get() { throw new Error('hidden ' + field + ' read'); }});
const context = {console, corp, runner, playerTurn: corp, attackedServer: null,
  cardSet: [], setIdentifiers: [], currentPhase: {identifier: 'Corp 2.2'}};
let installed = [];
context.InstalledCards = () => installed;
context.ActiveCards = () => installed;
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.ChoicesArrayCards = cards => cards.map(card => ({card}));
context.CheckActionClicks = () => true;
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
for (const file of ['config.js', 'ai_corp.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
let ai, baker, touchstone;
function reset() {
  vm.runInContext('reviewAI = new CorpAI()', context);
  ai = context.reviewAI;
  baker = Object.assign({}, context.cardSet[36015], {usedThisTurn: true});
  touchstone = Object.assign({}, context.cardSet[36021], {credits: 0, playedEventThisTurn: true});
  installed = [baker, touchstone];
  context.playerTurn = corp;
  context.attackedServer = null;
}
let passed = 0;
function check(name, fn) {
  reset(); fn(); passed++;
  if (process.env.VERBOSE) console.log('PASS ' + name);
}
check('projection defaults on; option off keeps current hosted funding exact', () => {
  assert.strictEqual(ai.options.projectedRedirectThreats, true);
  ai.options.projectedRedirectThreats = false;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  touchstone.credits = 1;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  assert.strictEqual(touchstone.AIRunPoolCreditOffset(), 1);
});
check('both once-per-turn flags reset in planning without live mutation', () => {
  ai.options.projectedRedirectThreats = true;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  assert.strictEqual(baker.usedThisTurn, true);
  assert.strictEqual(touchstone.playedEventThisTurn, true);
  assert.strictEqual(touchstone.credits, 0);
  assert.strictEqual(context.attackedServer, null);
});
check('current Runner turn never inherits next-turn potential or reset', () => {
  context.playerTurn = runner;
  ai.options.projectedRedirectThreats = true;
  touchstone.credits = 1;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  baker.usedThisTurn = false;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  touchstone.credits = 0;
  touchstone.playedEventThisTurn = false;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
});
check('active run does not project another turn even during Corp turn', () => {
  ai.options.projectedRedirectThreats = true;
  touchstone.credits = 1;
  context.attackedServer = corp.archives;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  assert.strictEqual(context.attackedServer, corp.archives);
});
check('absent and disabled source or redirect provider does not forecast', () => {
  ai.options.projectedRedirectThreats = true;
  installed = [baker];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  installed.push(touchstone);
  touchstone.disabled = true;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  touchstone.disabled = false;
  baker.disabled = true;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
});
check('generic source projection preserves payment compatibility', () => {
  ai.options.projectedRedirectThreats = true;
  const source = {subTypes: ['Stealth'], credits: 0,
    canUseCredits(doing, card) {
      assert.strictEqual(doing, 'using');
      assert.strictEqual(card, baker);
      assert.strictEqual(context.attackedServer, corp.archives);
      return true;
    },
    AIPotentialHostedCredits(doing, card, planning) {
      assert.strictEqual(doing, 'using');
      assert.strictEqual(card, baker);
      assert.strictEqual(planning.nextRunnerTurn, true);
      return 1;
    }};
  installed = [baker, source];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
  source.canUseCredits = () => false;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
  source.canUseCredits = () => true;
  source.subTypes = [];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
});
check('source without a potential hook never invents funding', () => {
  ai.options.projectedRedirectThreats = true;
  installed = [baker, {subTypes: ['Stealth'], credits: 0}];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), false);
});
check('Touchstone source hook distinguishes current and prospective event resets', () => {
  assert.strictEqual(touchstone.AIPotentialHostedCredits('using', baker), 0);
  assert.strictEqual(touchstone.AIPotentialHostedCredits('using', baker,
    {includePotentialCredits: true, nextRunnerTurn: false}), 0);
  touchstone.playedEventThisTurn = false;
  assert.strictEqual(touchstone.AIPotentialHostedCredits('using', baker,
    {includePotentialCredits: true, nextRunnerTurn: false}), 1);
  assert.strictEqual(touchstone.AIPotentialHostedCredits('using', baker,
    {nextRunnerTurn: true}), 0);
});
check('candidate never makes actual unfunded enumeration available', () => {
  ai.options.projectedRedirectThreats = true;
  baker.usedThisTurn = false;
  baker.runningWithThis = true;
  context.attackedServer = corp.archives;
  assert.strictEqual(baker.responseOnWouldApproachServer.Enumerate.call(baker).length, 0);
  assert.strictEqual(baker.AIRedirectsRun(corp.archives, corp.HQ), false);
  context.attackedServer = null;
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
});
check('prospective context is restored when a credit query throws', () => {
  ai.options.projectedRedirectThreats = true;
  const fail = () => { throw new Error('probe failure'); };
  touchstone.AIPotentialHostedCredits = fail;
  assert.throws(() => ai._archivesIsBackdoorToHQ(), /probe failure/);
  assert.strictEqual(context.attackedServer, null);
  assert.strictEqual(context.AIHypothetical.depth, 0);
  touchstone.AIPotentialHostedCredits = context.cardSet[36021].AIPotentialHostedCredits;
  touchstone.canUseCredits = fail;
  assert.throws(() => ai._archivesIsBackdoorToHQ(), /probe failure/);
  assert.strictEqual(context.attackedServer, null);
  assert.strictEqual(context.AIHypothetical.depth, 0);
  assert.strictEqual(baker.usedThisTurn, true);
  assert.strictEqual(touchstone.credits, 0);
});
check('existing two-argument redirect providers tolerate planning context', () => {
  const provider = {player: runner,
    AIRedirectsRun(from, to) { return from === corp.archives && to === corp.HQ; }};
  installed = [provider];
  assert.strictEqual(ai._archivesIsBackdoorToHQ(), true);
});
check('real headless install changes while deterministic security and currency do not', () => {
  function probe(enabled) {
    const run = spawnSync(process.execPath,
      [path.join(__dirname, 'helpers/baker-next-turn-decision-probe.js'), String(enabled)],
      {cwd: root, encoding: 'utf8', timeout: 30000});
    assert.strictEqual(run.status, 0, run.stderr);
    return JSON.parse(run.stdout);
  }
  const baseline = probe(false), candidate = probe(true);
  assert.strictEqual(baseline.choice, 'install');
  assert.strictEqual(baseline.server, 'NEW');
  assert.strictEqual(candidate.choice, 'install');
  assert.strictEqual(candidate.server, 'Archives');
  assert.strictEqual(candidate.card, 'Bumi 1.0');
  assert.strictEqual(candidate.touchstoneCredits, 0);
  assert.strictEqual(candidate.bakerUsed, true);
  assert.deepStrictEqual(candidate.security, baseline.security);
  assert.deepStrictEqual(candidate.credits, baseline.credits);
});
console.log(passed + ' Baker redirect projection cases passed.');
