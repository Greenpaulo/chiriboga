'use strict';
// Headless fixture runner for Corp AI decisions.
// A fixture is a text file: a few "// KEY: value" directive lines, followed by the
// RunnerTestField(...)/CorpTestField(...)/property lines that ReproductionCode() writes
// at the end of a downloaded game log. This file supplies headless versions of those
// functions (plain card objects, no PIXI) so the dump can be evaluated as-is.
//
// Usage:  node tests/corp-decision-fixtures.test.js          run every green fixture
//         node tests/corp-decision-fixtures.test.js FILE...  run selected green fixtures
//         node tests/corp-decision-fixtures.test.js --pending run known-red fixtures
//         AI_LOG=1 node tests/corp-decision-fixtures.test.js  also print the AI's own reasoning
//         VERBOSE=1 node tests/corp-decision-fixtures.test.js list passing fixtures too
//         node tests/corp-decision-fixtures.test.js --ids     list card ids to help write fixtures
//         node tests/corp-decision-fixtures.test.js --install-snapshots [--write]
//                                                    compare (or rewrite) the I0 install-decision baseline,
//                                                    tests/fixtures/corp-install-baseline.json; not part of the suite
//         node tests/corp-decision-fixtures.test.js --stub-missing   discovery mode: auto-stub engine functions the AI needs
//                                                    (returns false; results are NOT trustworthy until real stubs are written)
//
// Directives:  // PHASE: Phase_Main        (default Phase_Main; e.g. Phase_Mulligan, Phase_Score)
//              // OPTIONS: install, advance, gain, draw   (option list the engine would offer)
//              // EXPECT: advance          (or  // EXPECT: !purge  for "must not choose")
//              // EXPECT_SERVER: HQ        (checks the preferred install target)
//              // EXPECT_CARD: Semak-samun (checks the preferred card)
//              // SETUP: corp.creditPool=6; corp.clickTracker=3   (needed for non-debug logs, which omit them)
//              // EXPECT_SKIPPED: R&D=layerPolicy:existingUnrezzedIceAndPoor
//                                         (I0 telemetry: an ICE-protection walk passed over this server
//                                          for this reason; the part after ':' is the layer-policy reason)
//
// Every green fixture also runs with I0 install recording on and must give the
// same choice, logged reasons and CorpAI._random call count as without it.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const corp = {}, runner = {};
const context = {console, corp, runner, playerTurn: corp, cardSet: {}, setIdentifiers: [],
  encountering: false, attackedServer: null, approachIce: -1,
  currentPhase: {identifier: '', title: ''}, executingCommand: ''};
let servers = [];
let ai = null;
let decisionMessages = [];
// ---- engine stubs (keep in sync with tests/corp-server-security.test.js) ----
context.GetTitle = card => card.title;
context.Counters = (card, type) => card[type] || 0;
context.ChoicesActiveTriggers = () => [];
context.CheckCounters = (card, type, amount) => context.Counters(card, type) >= amount;
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
  vm.runInContext('reviewAI = new CorpAI();', context);
  ai = context.reviewAI;
  decisionMessages = [];
  ai._log = m => { decisionMessages.push(m); if (process.env.AI_LOG) console.log('    [ai] ' + m); };
  const central = name => ({serverName: name, cards: [], ice: [], root: []});
  Object.assign(corp, {HQ: central('HQ'), RnD: central('R&D'), archives: central('Archives'), remoteServers: [],
    scoreArea: [], resolvingCards: [], identityCard: null, creditPool: 5, clickTracker: 3,
    tempBonusClicks: 0, badPublicity: 0, agendaPoints: 0});
  Object.assign(runner, {rig: {programs: [], hardware: [], resources: []}, scoreArea: [], grip: [], stack: [], heap: [],
    cards: [], resolvingCards: [], identityCard: null, creditPool: 5, clickTracker: 0,
    tempBonusClicks: 0, temporaryCredits: 0, tags: 0, coreDamage: 0, agendaPoints: 0, AI: null});
  ai._random = () => 1;
  corp.AI = ai;
  servers = [];
  context.playerTurn = corp;
  context.attackedServer = null;
  context.encountering = false;
  context.approachIce = -1;
  context.currentPhase = {identifier: '', title: ''};
  context.executingCommand = '';
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
['ai_corp.js', 'runcalculator.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'].forEach(file =>
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file}));
vm.runInContext('runnerRC = new RunCalculator();', context);
// The real DecisionSnapshots recorder (utility.js), used by the recording pass.
const utilitySource = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
vm.runInContext(utilitySource.slice(utilitySource.indexOf('// BEGIN DecisionSnapshots'),
  utilitySource.indexOf('// END DecisionSnapshots')), context, {filename: 'utility.js'});
const recorder = vm.runInContext('DecisionSnapshots', context);
const installSnapshots = process.argv.includes('--install-snapshots');
const snapshotFile = path.join(__dirname, 'fixtures', 'corp-install-baseline.json');
const snapshots = {};

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
const pending = process.argv.includes('--pending');
const dir = path.join(
  __dirname,
  'fixtures',
  pending ? 'corp-decisions-pending' : 'corp-decisions',
);
const requestedFixtures = process.argv.slice(2).filter(arg => arg.endsWith('.txt'));
// Passing fixtures are listed only when asked for, to keep agent context small.
const showPasses = !!process.env.VERBOSE || pending || requestedFixtures.length > 0;
const files = requestedFixtures.length ? requestedFixtures :
  (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort() : []);
let passed = 0, failed = 0;
// Why an ICE-protection walk passed over a server, as "<skipped>[:<layer policy reason>]".
function skippedReasons(installNotes) {
  const out = {};
  for (const note of installNotes || [])
    for (const trace of note.protection || [])
      for (const row of trace.ranked)
        if (trace.filtered && row.skipped) {
          const reason = row.skipped + (row.skipped === 'layerPolicy' ? ':' + row.layerPolicy : '');
          (out[row.server] = out[row.server] || []).includes(reason) || out[row.server].push(reason);
        }
  return out;
}
files.forEach(file => {
  // An absolute path runs a fixture from elsewhere (tests/decision-snapshots.test.js).
  const src = fs.readFileSync(path.resolve(dir, file), 'utf8').replace(/\r/g, '');
  const directive = key => { const m = src.match(new RegExp('^//\\s*' + key + ':\\s*(.*)$', 'm')); return m ? m[1].trim() : ''; };
  const phase = directive('PHASE') || 'Phase_Main';
  const options = directive('OPTIONS').split(',').map(s => s.trim()).filter(Boolean);
  const expect = directive('EXPECT');
  const stubbed = [];
  let baseline = null;
  // Pending fixtures remain single known-red reproductions. Green fixtures
  // also prove identical choices and logged reasons across F3 cache modes.
  for (const cacheMode of (pending ? ['on'] : ['off', 'on', 'verify', 'record'])) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      resetState();
      let randomCalls = 0;
      ai._random = () => { randomCalls++; return 1; };
      ai._securityCacheEnabled = cacheMode !== 'off';
      ai._securityCacheVerify = cacheMode === 'verify';
      const recording = cacheMode === 'record';
      const telemetry = [];
      recorder.telemetry = recording ? {sink: entry => telemetry.push(entry)} : null;
      let notes = null;
      vm.runInContext(src, context, {filename: file});
      if (directive('SETUP')) vm.runInContext(directive('SETUP'), context);
      finaliseState();
      if (!expect) throw new Error('Missing required EXPECT directive');
      if (options.length < 1) throw new Error('Missing required OPTIONS directive');
      if (directive('REPLAYABLE') === 'false')
        throw new Error('Fixture contains non-text options and cannot be replayed exactly');
      const identifier = directive('IDENTIFIER');
      const title = directive('TITLE');
      const command = directive('COMMAND');
      const choiceType = directive('CHOICETYPE');
      let idx;
      if (identifier) {
        context.currentPhase = {identifier, title};
        context.executingCommand = command;
        idx = ai.Choice(options.slice(), choiceType);
        if (recording) notes = telemetry.length ? telemetry[telemetry.length - 1] : {};
      } else {
        if (typeof ai[phase] != 'function') throw new Error('Unknown PHASE ' + phase);
        const previous = recording ? recorder.BeginNotes(true) : null;
        try {
          idx = cacheMode === 'off' ? ai[phase](options.slice()) :
            ai._withSecurityCache(() => ai[phase](options.slice()));
        } finally {
          if (recording) notes = recorder.EndNotes(previous) || {};
        }
      }
      recorder.telemetry = null;
      const chosen = typeof idx === 'number' ? options[idx] : JSON.stringify(idx);
      const negate = expect.startsWith('!');
      const expectedServer = directive('EXPECT_SERVER');
      const expectedCard = directive('EXPECT_CARD');
      const chosenServer = ai.preferred && ai.preferred.serverToInstallTo === null ? 'NEW' :
        ai.preferred && ai.preferred.serverToInstallTo && ai.preferred.serverToInstallTo.serverName;
      const chosenCard = ai.preferred && ai.preferred.cardToInstall && ai.preferred.cardToInstall.title;
      const commandOK = negate ? chosen !== expect.slice(1) : chosen === expect;
      const serverOK = !expectedServer || chosenServer === expectedServer;
      const cardOK = !expectedCard || chosenCard === expectedCard;
      const result = JSON.stringify([chosen, chosenServer, chosenCard, decisionMessages, randomCalls]);
      if (baseline === null) baseline = result;
      assert.strictEqual(result, baseline, 'F3 choice/reasons/random calls differ in mode ' + cacheMode);
      let skippedOK = true, skippedNote = '';
      if (recording) {
        const skipped = skippedReasons(notes.install);
        const expectedSkip = directive('EXPECT_SKIPPED');
        if (expectedSkip) {
          const [server, reason] = [expectedSkip.slice(0, expectedSkip.indexOf('=')), expectedSkip.slice(expectedSkip.indexOf('=') + 1)];
          skippedOK = (skipped[server] || []).includes(reason);
          if (!skippedOK) skippedNote = ', skipped ' + JSON.stringify(skipped) + ', expected ' + expectedSkip;
        }
        if (installSnapshots && options.includes('install'))
          snapshots[file] = {chosen, server: chosenServer || null, card: chosenCard || null, install: notes.install || []};
      }
      const ok = commandOK && serverOK && cardOK && skippedOK;
      const replayPath = identifier ? 'Choice ' + identifier : phase;
      const note = stubbed.length ? '  [auto-stubbed: ' + stubbed.join(', ') + ']' : '';
      if (ok) { passed++; if (showPasses) console.log('PASS ' + file + '  (' + replayPath + ' -> ' + chosen + ')' + note); }
      else {
        const serverNote = expectedServer ? ', server ' + (chosenServer || 'none') + ', expected ' + expectedServer : '';
        const cardNote = expectedCard ? ', card ' + (chosenCard || 'none') + ', expected ' + expectedCard : '';
        failed++; console.log('FAIL ' + file + '  (' + replayPath + ' -> ' + chosen + ', expected ' + expect + serverNote + cardNote + skippedNote + ')' + note);
      }
      break;
    } catch (e) {
      recorder.telemetry = null;
      const missing = /^(\w+) is not defined/.exec(String(e.message));
      if (missing && process.argv.includes('--stub-missing') && !(missing[1] in context)) {
        context[missing[1]] = () => false; stubbed.push(missing[1]); continue;
      }
      failed++; console.log('ERROR ' + file + '  ' + String(e.message).split('\n')[0] + '\n    ' + String(e.stack).split('\n').slice(1, 3).join('\n    '));
      break;
    }
  }
  }
});
if (installSnapshots) {
  // I0 install-decision baseline (documentation/ai-batch-harness.md): I1 and
  // later items diff against it; only listed, justified deltas are expected.
  const current = JSON.stringify(snapshots, null, 1) + '\n';
  if (process.argv.includes('--write')) {
    fs.writeFileSync(snapshotFile, current);
    console.log('Wrote ' + Object.keys(snapshots).length + ' install snapshots to ' + path.relative(root, snapshotFile));
  } else {
    const saved = fs.existsSync(snapshotFile) ? JSON.parse(fs.readFileSync(snapshotFile, 'utf8')) : {};
    const names = [...new Set(Object.keys(saved).concat(Object.keys(snapshots)))].sort();
    const changed = names.filter(name => JSON.stringify(saved[name]) !== JSON.stringify(snapshots[name]));
    changed.forEach(name => console.log('CHANGED install snapshot ' + name +
      (saved[name] && snapshots[name] ? ' (chosen ' + saved[name].chosen + '/' + saved[name].server + '/' + saved[name].card +
        ' -> ' + snapshots[name].chosen + '/' + snapshots[name].server + '/' + snapshots[name].card + ')' : ' (added or removed)')));
    console.log(changed.length + ' of ' + names.length + ' install snapshots changed.');
    if (changed.length) failed++;
  }
}
console.log(passed + ' passed, ' + failed + ' failed, ' + files.length + ' fixtures.');
process.exitCode = failed ? 1 : 0;
