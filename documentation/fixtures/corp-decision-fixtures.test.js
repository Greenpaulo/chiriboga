'use strict';
// Headless fixture runner for Corp AI decisions.
// A fixture is a text file: a few "// KEY: value" directive lines, followed by the
// RunnerTestField(...)/CorpTestField(...)/property lines that ReproductionCode() writes
// at the end of a downloaded game log. This file supplies headless versions of those
// functions (plain card objects, no PIXI) so the dump can be evaluated as-is.
//
// Usage:  node documentation/fixtures/corp-decision-fixtures.test.js          run every fixture
//         node documentation/fixtures/corp-decision-fixtures.test.js FILE...  run selected fixtures
//         AI_LOG=1 node documentation/fixtures/corp-decision-fixtures.test.js also print the AI's own reasoning
//         node documentation/fixtures/corp-decision-fixtures.test.js --ids    list card ids to help write fixtures
//         node documentation/fixtures/corp-decision-fixtures.test.js --stub-missing   discovery mode: auto-stub engine functions the AI needs
//                                                    (returns false; results are NOT trustworthy until real stubs are written)
//
// Directives:  // PHASE: Phase_Main        (default Phase_Main; e.g. Phase_Mulligan, Phase_Score)
//              // OPTIONS: install, advance, gain, draw   (option list the engine would offer)
//              // EXPECT: advance          (or  // EXPECT: !purge  for "must not choose")
//              // EXPECT_SERVER: HQ        (checks the preferred install target)
//              // SETUP: corp.creditPool=6; corp.clickTracker=3   (needed for non-debug logs, which omit them)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..', '..');
const corp = {}, runner = {};
const context = {console, corp, runner, playerTurn: corp, cardSet: {}, setIdentifiers: [], encountering: false, attackedServer: null, approachIce: -1};
let servers = [];
// ---- engine stubs (keep in sync with tests/corp-server-security.test.js) ----
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.Strength = card => card.strength || 0;
context.Credits = player => player.creditPool;
context.AvailableCredits = context.Credits;
context.RezCost = card => card.rezCost || 0;
context.CheckCredits = (player, cost) => player.creditPool >= cost;
context.CheckRez = (card, types) => types.includes(card.cardType) && !card.rezzed && card.rezCost !== undefined;
context.AllottedClicks = player => player === runner ? 4 : 3;
context.InstalledCards = player => player === runner ? runner.cards : servers.reduce((cards, server) => cards.concat(server.ice, server.root), []);
context.AllCards = player => {
  const corpCards = context.InstalledCards(corp).concat(corp.scoreArea, corp.HQ.cards, corp.RnD.cards, corp.archives.cards);
  const runnerCards = context.InstalledCards(runner).concat(runner.scoreArea, runner.grip, runner.stack, runner.heap);
  return player === corp ? corpCards : player === runner ? runnerCards : corpCards.concat(runnerCards);
};
context.ActiveCards = player => {
  const runnerCards = runner.cards.concat(runner.identityCard ? [runner.identityCard] : []);
  const corpCards = corp.scoreArea;
  return player === runner ? runnerCards : player === corp ? corpCards : runnerCards.concat(corpCards);
};
context.CheckHasAbilities = card => !card.disabled;
context.CheckSubType = (card, type) => (card.subTypes || []).includes(type);
context.CheckCardType = (card, types) => types.includes(card.cardType);
context.CheckAdvance = card => card.canBeAdvanced || card.cardType === 'agenda';
context.AgendaPoints = player => player.agendaPoints || 0;
context.AgendaPointsToWin = () => 7;
context.ChoicesInstalledCards = (player, predicate) => context.InstalledCards(player).filter(predicate).map(card => ({card}));
context.BreakerMatchesIce = (breaker, ice) => (
  [['Fracter', 'Barrier'], ['Decoder', 'Code Gate'], ['Killer', 'Sentry']].some(types =>
    context.CheckSubType(breaker, types[0]) && context.CheckSubType(ice, types[1])));
context.PlayerCanLook = (player, card) => player === corp || !!card.rezzed;
context.GetServer = card => servers.find(server => server.ice.includes(card));
context.ServerName = () => 'Fixture server';
context.AdvancementRequirement = card => card.advancementRequirement || 0;
context.MaxHandSize = () => 5;
context.PlayerHand = player => player === corp ? corp.HQ.cards : runner.grip;
context.Link = () => (runner.identityCard && runner.identityCard.link) || 0;
context.CheckTags = num => (runner.tags || 0) >= num;
context.CheckScore = card => (card.advancement || 0) >= context.AdvancementRequirement(card);  // approximation of the engine check
context.Shuffle = cards => cards;

// ---- headless versions of the engine's board-setup functions ----
const clone = o => Array.isArray(o) ? o.map(clone) :
  (o && typeof o === 'object') ? Object.keys(o).reduce((r, k) => (r[k] = clone(o[k]), r), {}) : o;
function InstanceCard(id) {
  const def = context.cardSet[id];
  if (!def) throw new Error('Unknown card id ' + id + ' (not in the sets this harness loads)');
  const player = def.player; def.player = null;            // avoid cloning the whole player object
  const card = clone(def); def.player = player;
  Object.assign(card, {isCard: true, cardDefinition: def, player, setNumber: id});
  if (card.cardType === 'agenda' && card.canBeAdvanced === undefined) card.canBeAdvanced = true;
  return card;
}
function InstanceCardsPush(id, dest) { const c = InstanceCard(id); dest.push(c); c.cardLocation = dest; return [c]; }
const newServer = name => ({serverName: name, ice: [], root: []});
function CorpTestField(identity, archivesCards, rndCards, hqCards, archInst, rndInst, hqInst, remotes, scored) {
  corp.identityCard = InstanceCard(identity); corp.identityCard.faceUp = true;
  archivesCards.forEach(id => InstanceCardsPush(id, corp.archives.cards));
  rndCards.forEach(id => InstanceCardsPush(id, corp.RnD.cards));
  hqCards.forEach(id => InstanceCardsPush(id, corp.HQ.cards));
  const place = (ids, server) => ids.forEach(id =>
    InstanceCardsPush(id, context.cardSet[id].cardType === 'ice' ? server.ice : server.root));
  place(archInst, corp.archives); place(rndInst, corp.RnD); place(hqInst, corp.HQ);
  remotes.forEach((ids, j) => { const s = newServer('Remote ' + j); corp.remoteServers.push(s); place(ids, s); });
  scored.forEach(id => { InstanceCardsPush(id, corp.scoreArea)[0].faceUp = true; });
}
function RunnerTestField(identity, heap, stack, grip, installed, stolen) {
  runner.identityCard = InstanceCard(identity); runner.identityCard.faceUp = true;
  heap.forEach(id => { InstanceCardsPush(id, runner.heap)[0].faceUp = true; });
  stack.forEach(id => InstanceCardsPush(id, runner.stack));
  grip.forEach(id => InstanceCardsPush(id, runner.grip));
  installed.forEach(id => {
    const t = context.cardSet[id].cardType;
    InstanceCardsPush(id, t === 'program' ? runner.rig.programs : t === 'hardware' ? runner.rig.hardware : runner.rig.resources)[0].faceUp = true;
  });
  stolen.forEach(id => { InstanceCardsPush(id, runner.scoreArea)[0].faceUp = true; });
}
Object.assign(context, {InstanceCard, InstanceCardsPush, CorpTestField, RunnerTestField,
  NewServer: newServer, ChangePhase() {}, skipShuffleAndDraw: false,
  phases: new Proxy({}, {get: (t, k) => ({identifier: String(k), title: String(k)})}),
  cardBackTexturesCorp: null, cardBackTexturesRunner: null, glowTextures: null, strengthTextures: null});

function resetState() {
  const central = name => ({serverName: name, cards: [], ice: [], root: []});
  Object.assign(corp, {HQ: central('HQ'), RnD: central('R&D'), archives: central('Archives'), remoteServers: [],
    scoreArea: [], resolvingCards: [], identityCard: null, creditPool: 5, clickTracker: 3, badPublicity: 0, agendaPoints: 0});
  Object.assign(runner, {rig: {programs: [], hardware: [], resources: []}, scoreArea: [], grip: [], stack: [], heap: [],
    cards: [], resolvingCards: [], identityCard: null, creditPool: 5, clickTracker: 0, tags: 0, agendaPoints: 0, AI: null});
  corp.AI = ai; context.playerTurn = corp; context.attackedServer = null;
}
function finaliseState() {
  servers = [corp.HQ, corp.RnD, corp.archives].concat(corp.remoteServers);
  runner.cards = runner.rig.resources.concat(runner.rig.hardware, runner.rig.programs);
  const points = area => area.reduce((n, c) => n + (c.agendaPoints || 0), 0);
  if (!corp.agendaPoints) corp.agendaPoints = points(corp.scoreArea);
  if (!runner.agendaPoints) runner.agendaPoints = points(runner.scoreArea);
}

vm.createContext(context);
// Establish mutable global bindings as well as properties on the context object.
// Some AI helpers temporarily replace these values while evaluating an encounter.
vm.runInContext('var attackedServer = null, encountering = false, approachIce = -1;', context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('reviewAI = new CorpAI(); runnerRC = new RunCalculator();', context);
const ai = context.reviewAI;
ai._log = process.env.AI_LOG ? m => console.log('    [ai] ' + m) : function() {};

if (process.argv.includes('--ids')) {
  const show = (label, pred) => console.log(label + ': ' + Object.entries(context.cardSet)
    .filter(([id, c]) => pred(c)).slice(0, 40).map(([id, c]) => id + '=' + c.title).join(', '));
  show('Corp identities', c => c.player === corp && c.cardType === 'identity');
  show('Runner identities', c => c.player === runner && c.cardType === 'identity');
  ['ice', 'agenda', 'operation', 'asset', 'upgrade'].forEach(t => show('Corp ' + t, c => c.player === corp && c.cardType === t));
  ['program', 'hardware', 'resource', 'event'].forEach(t => show('Runner ' + t, c => c.player === runner && c.cardType === t));
  process.exit(0);
}

// ---- run fixtures ----
const dir = __dirname;
const requestedFixtures = process.argv.slice(2).filter(arg => arg.endsWith('.txt'));
const files = requestedFixtures.length ? requestedFixtures :
  (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort() : []);
let passed = 0, failed = 0;
files.forEach(file => {
  const src = fs.readFileSync(path.join(dir, file), 'utf8').replace(/\r/g, '');
  const directive = key => { const m = src.match(new RegExp('^//\\s*' + key + ':\\s*(.*)$', 'm')); return m ? m[1].trim() : ''; };
  const phase = directive('PHASE') || 'Phase_Main';
  const options = directive('OPTIONS').split(',').map(s => s.trim()).filter(Boolean);
  const expect = directive('EXPECT');
  const stubbed = [];
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      resetState();
      vm.runInContext(src, context, {filename: file});
      if (directive('SETUP')) vm.runInContext(directive('SETUP'), context);
      finaliseState();
      const idx = ai[phase](options.slice());
      const chosen = typeof idx === 'number' ? options[idx] : JSON.stringify(idx);
      const negate = expect.startsWith('!');
      const expectedServer = directive('EXPECT_SERVER');
      const chosenServer = ai.preferred && ai.preferred.serverToInstallTo === null ? 'NEW' :
        ai.preferred && ai.preferred.serverToInstallTo && ai.preferred.serverToInstallTo.serverName;
      const commandOK = negate ? chosen !== expect.slice(1) : chosen === expect;
      const serverOK = !expectedServer || chosenServer === expectedServer;
      const ok = commandOK && serverOK;
      const note = stubbed.length ? '  [auto-stubbed: ' + stubbed.join(', ') + ']' : '';
      if (ok) { passed++; console.log('PASS ' + file + '  (' + phase + ' -> ' + chosen + ')' + note); }
      else {
        const serverNote = expectedServer ? ', server ' + (chosenServer || 'none') + ', expected ' + expectedServer : '';
        failed++; console.log('FAIL ' + file + '  (' + phase + ' -> ' + chosen + ', expected ' + expect + serverNote + ')' + note);
      }
      break;
    } catch (e) {
      const missing = /^(\w+) is not defined/.exec(String(e.message));
      if (missing && process.argv.includes('--stub-missing') && !(missing[1] in context)) {
        context[missing[1]] = () => false; stubbed.push(missing[1]); continue;
      }
      failed++; console.log('ERROR ' + file + '  ' + String(e.message).split('\n')[0] + '\n    ' + String(e.stack).split('\n').slice(1, 3).join('\n    '));
      break;
    }
  }
});
console.log(passed + ' passed, ' + failed + ' failed, ' + files.length + ' fixtures.');
process.exitCode = failed ? 1 : 0;
