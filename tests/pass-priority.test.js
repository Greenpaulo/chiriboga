'use strict';
// Pass until end of turn / Resume Priority (documentation/backlog/pass-priority-until-end-of-turn.md):
// phase eligibility, turn lifetime, normal response-loop progression and Auto skip/resume interaction.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const stub = new Proxy(function () {}, {get: (t, k) => k === Symbol.toPrimitive ? () => 0 : stub, apply: () => stub});
// Phase templates are copied with jQuery.extend, so the real phase chain needs a working deep extend.
const plain = v => v && typeof v == 'object' && (Array.isArray(v) || Object.getPrototypeOf(Object.getPrototypeOf(v) || {}) == null);
const extend = (deep, target, ...sources) => {
  for (const source of sources) for (const key in source) {
    const value = source[key];
    target[key] = deep && plain(value) ? extend(true, Array.isArray(value) ? [] : {}, value) : value;
  }
  return target;
};
// Record footer HTML so the offered buttons can be checked.
let footerHtml = '';
const jqResult = selector => new Proxy(function () {}, {
  get: (t, k) => k === 'html' ? (html => { if (selector == '#footer' && typeof html == 'string') footerHtml = html; return stub; }) :
    k === Symbol.toPrimitive ? () => 0 : stub,
  apply: () => stub,
});
const jq = new Proxy(function () {}, {get: (t, k) => k == 'extend' ? extend : stub, apply: (t, self, args) => jqResult(args[0])});
// The main loop reschedules itself with window.setTimeout: queue those calls instead of running them.
const scheduled = [];
const c = {console, cardSet: [], setIdentifiers: [], $: jq, jQuery: jq, PIXI: stub,
  document: stub, navigator: {userAgent: 'node'}, localStorage: {getItem: () => null},
  setTimeout: fn => { scheduled.push(fn); return 0; }, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
  Image: function () {}, Audio: function () { return stub; }};
c.window = c;
vm.createContext(c);
for (const file of ['config.js', 'sounds.js', 'init.js', 'phase.js', 'command.js', 'checks.js', 'mechanics.js', 'utility.js',
  'sets/systemgateway.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; c.LogError = message => { throw Error(message); };
c.Render = () => {}; c.UpdateCounters = () => {}; c.PlaySound = () => {}; c.SetHistoryThumbnail = () => {};
c.Narrate = () => false; c.AddHistoryBreakIfRequired = () => {};
c.GetTitle = card => card.title;
c.accessibilityMode = ''; c.specifiedMentor = ''; c.rewinding = true; // ChangePhase would otherwise serialise rewind states
const corp = c.corp, runner = c.runner;
Object.assign(corp, {side: 'corp', creditPool: 0, clickTracker: 3, badPublicity: 0, scoreArea: [],
  resolvingCards: [], installingCards: [], identityCard: {player: corp, title: 'Corp', subTypes: []},
  HQ: c.NewServer('HQ', true), RnD: c.NewServer('R&D', true), archives: c.NewServer('Archives', true), remoteServers: []});
Object.assign(runner, {side: 'runner', startingMU: 4, creditPool: 0, temporaryCredits: 0, clickTracker: 4, tags: 0,
  grip: [], stack: [], heap: [], scoreArea: [], resolvingCards: [], installingCards: [],
  identityCard: {player: runner, title: 'Runner', subTypes: [], link: 0}, rig: {programs: [], hardware: [], resources: []}});
const renderer = () => ({FaceUp() {}, FaceDown() {}, ToggleZoom() {}, zoomed: false,
  sprite: {x: 0, y: 0}, destinationPosition: {x: 0, y: 0}});
const fakeAI = {CommandChoice: () => Promise.resolve(0)};

// Read-Write Share hosting one card: its trash ability is legal in every response window.
const share = Object.assign({}, c.cardSet[36022], {hostedCards: [], cardLocation: runner.rig.programs, renderer: renderer(), faceUp: true});
runner.rig.programs.push(share);
share.hostedCards.push({title: 'Hosted', player: runner, cardType: 'event', host: share, faceUp: false, notInstalled: true, renderer: renderer()});
c.InvalidateActiveTriggerCandidateCache();

// Put the game in a window with the given player holding priority.
const at = (phase, active, turn) => {
  c.currentPhase = phase; c.activePlayer = active; c.playerTurn = turn;
  c.opportunitiesGiven = false; c.actedThisPhase = false; phase.corpSkip = false;
};
const human = side => { (side == runner ? corp : runner).AI = fakeAI; side.AI = null; };
const reset = () => { c.PassPriorityReset(); c.autoContinue = false; c.autoContinueTimer = 0; scheduled.length = 0; };
const executed = [];
const realExecuteChosen = c.ExecuteChosen;
const recordOnly = cmd => { executed.push(cmd); };
const cases = [];
const test = (name, fn) => cases.push([name, fn]);

test('Read-Write Share response window is eligible and offers the button', () => {
  reset(); human(runner);
  at(c.phases.runnerStartResponse, runner, runner);
  const options = c.EnumeratePhase();
  assert.deepStrictEqual([...options].sort(), ['n', 'trigger']);
  assert(c.PassPriorityWindowEligible(runner, options));
  assert(footerHtml.includes('footerbutton-n') && footerHtml.includes('footerbutton-passpriority'), footerHtml);
});

test('each ordinary paid-ability window is eligible for the human', () => {
  reset(); human(runner);
  for (const name of ['runnerStartResponse', 'runnerPostAction', 'runnerDiscardResponse', 'runApproachIce',
    'runResponseBeforeApproach', 'corpStartDraw', 'corpActionStart', 'corpPostAction', 'corpDiscardResponse']) {
    at(c.phases[name], runner, runner);
    c.phaseOptions = {n: [{}], trigger: [{}]};
    assert(c.PassPriorityWindowEligible(runner, ['n', 'trigger']), name);
  }
});

test('stops are kept for jack out, breaking, approached ice, triggered effects, actions and AI players', () => {
  reset(); human(runner);
  at(c.phases.runDecideContinue, runner, runner);
  const options = c.EnumeratePhase();
  assert(options.includes('jack'), 'jack out is offered');
  assert(!c.PassPriorityWindowEligible(runner, options), 'jack-out decision keeps its stop');
  assert(!footerHtml.includes('footerbutton-passpriority'), 'no pass button beside jack out');
  at(c.phases.runEncounterIce, runner, runner);
  c.phaseOptions = {n: [{}], trigger: [{}]};
  assert(!c.PassPriorityWindowEligible(runner, ['n', 'trigger']), 'encounter keeps breaker decisions');
  human(corp);
  at(c.phases.runEncounterIce, corp, runner);
  assert(c.PassPriorityWindowEligible(corp, ['n', 'trigger']), 'Corp paid abilities during an encounter');
  at(c.phases.runDecideContinue, corp, runner);
  assert(c.PassPriorityWindowEligible(corp, ['n', 'trigger']), 'Corp has no jack-out decision');
  at(c.phases.runApproachIce, corp, runner);
  c.phaseOptions = {n: [{}], rez: [{card: {cardType: 'ice'}}]};
  assert(!c.PassPriorityWindowEligible(corp, ['n', 'rez']), 'rezzing the approached ice keeps its stop');
  c.phaseOptions = {n: [{}], rez: [{card: {cardType: 'asset'}}]};
  assert(c.PassPriorityWindowEligible(corp, ['n', 'rez']), 'optional asset rez is declined by passing');
  human(runner);
  const triggered = c.CreatePhaseFromTemplate(c.phaseTemplates.globalTriggers, runner, 'Runner Turn Begins', 'Runner Turn Begins', null);
  at(triggered, runner, runner);
  c.phaseOptions = {n: [{}], trigger: [{}]};
  assert(!c.PassPriorityWindowEligible(runner, ['n', 'trigger']), 'triggered-effect prompts are not passed');
  at(c.phases.runnerActionMain, runner, runner);
  assert(!c.PassPriorityWindowEligible(runner, ['n', 'trigger']), 'action phase');
  runner.AI = fakeAI;
  at(c.phases.runnerStartResponse, runner, runner);
  assert(!c.PassPriorityWindowEligible(runner, ['n', 'trigger']), 'never for an AI player');
});

test('passing submits Continue once per opportunity through the normal response loop', () => {
  reset(); human(runner);
  at(c.phases.runnerStartResponse, runner, runner);
  c.EnumeratePhase();
  c.PassPriorityEnable();
  assert(c.PassPriorityActive(runner));
  assert.strictEqual(c.currentPhase, c.phases.runnerStartResponse, 'no phase skipped');
  assert.strictEqual(c.activePlayer, corp, 'the opponent receives its opportunity');
  assert.strictEqual(scheduled.length, 1, 'one main-loop step scheduled');
  // the opponent acts: the human's setting survives
  c.actedThisPhase = true;
  c.ExecuteChosen = recordOnly;
  try {
    c.currentPhase.Resolve.n(); // the Corp passes after acting: priority returns to the Runner
    assert.strictEqual(c.activePlayer, runner);
    assert(c.PassPriorityActive(runner), 'opponent actions do not clear passing');
    c.Main();
    assert.deepStrictEqual(executed, ['n'], 'Main passes the returned opportunity once');
    executed.length = 0;
    at(c.phases.runDecideContinue, runner, runner);
    c.Main();
    assert.deepStrictEqual(executed, [], 'jack-out decision still stops');
  } finally { c.ExecuteChosen = realExecuteChosen; }
});

test('activation on the human\'s own turn ends at the next turn boundary', () => {
  reset(); human(runner);
  at(c.phases.runnerPostAction, runner, runner);
  c.passPriority.player = runner; c.passPriority.turn = runner;
  c.ChangePhase(c.phases.runnerDiscardResponse, true);
  assert(c.PassPriorityActive(runner), 'later window in the same turn');
  c.ChangePhase(c.phases.corpStartDraw);
  assert.strictEqual(c.passPriority.player, null, 'reset at Corp 1.1');
  assert(!c.PassPriorityActive(runner));
});

test('activation on the opponent\'s turn ends when that turn ends', () => {
  reset(); human(runner);
  at(c.phases.corpPostAction, runner, corp);
  c.passPriority.player = runner; c.passPriority.turn = corp;
  c.ChangePhase(c.phases.corpDiscardResponse, true);
  c.activePlayer = runner;
  assert(c.PassPriorityActive(runner), 'remainder of the Corp turn');
  c.ChangePhase(c.phases.runnerStartResponse);
  assert.strictEqual(c.passPriority.player, null, 'reset at Runner 1.1, not carried into the human turn');
});

test('game end clears passing', () => {
  reset(); human(runner);
  c.passPriority.player = runner; c.passPriority.turn = runner;
  c.playerTurn = runner;
  try { c.PlayerWin(corp, 'test'); } catch (e) { if (process.env.VERBOSE) console.log(e.message); }
  assert.strictEqual(c.passPriority.player, null);
});

test('Resume Priority restores stops and disables Auto skip', () => {
  reset(); human(runner);
  c.autoContinue = true; c.autoContinueTimer = 0.8;
  at(c.phases.runnerStartResponse, runner, runner);
  c.ExecuteChosen = recordOnly;
  try {
    c.EnumeratePhase();
    c.PassPriorityEnable();
    assert.deepStrictEqual(executed, ['n'], 'enabling passes the current opportunity once');
    assert.strictEqual(c.autoContinueTimer, 0, 'old Auto skip timer cannot also submit the window');
    executed.length = 0;
    c.PassPriorityResume();
    assert(!c.PassPriorityActive(runner));
    assert.strictEqual(c.autoContinue, false, 'Auto skip would otherwise pass the resumed window');
    assert.strictEqual(c.autoContinueTimer, 0);
    c.Main();
    assert.deepStrictEqual(executed, [], 'the next opportunity stops');
    assert(footerHtml.includes('footerbutton-passpriority'), 'and offers passing again');
  } finally { c.ExecuteChosen = realExecuteChosen; }
});

test('AI-only games are unchanged', () => {
  reset(); runner.AI = fakeAI; corp.AI = fakeAI;
  at(c.phases.runnerStartResponse, runner, runner);
  c.PassPriorityEnable();
  assert.strictEqual(c.passPriority.player, null, 'cannot be enabled for an AI player');
  c.passPriority.player = runner; c.passPriority.turn = runner;
  assert(!c.PassPriorityShouldAutoPass(['n', 'trigger']));
  assert(!c.PassPriorityOffered(['n', 'trigger']));
});

let failed = 0;
for (const [name, fn] of cases) {
  try { fn(); if (process.env.VERBOSE) console.log('ok - ' + name); }
  catch (error) { failed++; console.error('FAIL: ' + name + ': ' + (error.stack || error.message)); }
}
if (failed) process.exitCode = 1;
else console.log('Pass priority: ' + cases.length + ' cases passed.');
