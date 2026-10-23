'use strict';
// Pending reproduction: documentation/bugs/beta-build-program-click-selects-server.md
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');

function reproduce(hoveredName) {
  const runner = {AI: null, testAI: null, grip: [], stack: [], rig: {programs: []}};
  const server = (serverName, xStart, xEnd) => ({serverName, xStart, xEnd, cards: [], root: [], ice: []});
  const corp = {
    HQ: server('HQ', 400, 600), RnD: server('R&D', 200, 400),
    archives: server('Archives', 0, 200), remoteServers: [server('Remote 0', 600, 800)],
  };
  const servers = [corp.HQ, corp.RnD, corp.archives, ...corp.remoteServers];
  const hovered = servers.find(s => s.serverName === hoveredName);
  const runs = [];
  const prompts = [];
  const jquery = {css() { return this; }, prop() { return false; }};
  const context = {
    console, runner, corp, cardSet: [], setIdentifiers: [],
    activePlayer: runner, viewingPlayer: runner, accessingCard: null,
    TutorialBlacklist: null, TutorialReplacer: null, phaseOptions: {},
    executingCommand: 'continue', mainLoopDelay: 0,
    window: {setTimeout() {}}, $() { return jquery; },
    countersUI: {credits: {runner: {sprite: {}}, corp: {sprite: {}}}, tag: {runner: {sprite: {}}}},
    pixi_playY: 0,
    cardRenderer: {MousePosition() { return {x: (hovered.xStart + hovered.xEnd) / 2, y: 100}; }},
    pixi_playThreshold() { return true; },
    CheckCardType(card, types) { return types.includes(card.cardType); },
    CheckSubType(card, subtype) { return card.subTypes.includes(subtype); },
    // Install legality is not under test; both programs have one legal unhosted install.
    ChoicesCardInstall(card) { return [{card, host: null, label: 'Install ' + card.title}]; },
    ServerName(s) { return s.serverName; },
    Shuffle() {},
    // Complete the installation before invoking the real card's continuation.
    Install(card, host, ignoreCosts, position, returnToPhase, callback, owner,
      onCancel, onPaymentComplete, allowCancel, onInstallComplete) {
      runner.stack.splice(runner.stack.indexOf(card), 1);
      runner.rig.programs.push(card);
      card.cardLocation = runner.rig.programs;
      onInstallComplete.call(owner);
    },
    MakeRun(s) { runs.push(s.serverName); },
    DecisionPhase(player, choices) { prompts.push({player, choices}); },
  };
  const isolatedHelpers = {
    ChoicesCardInstall: context.ChoicesCardInstall,
    ServerName: context.ServerName,
    Shuffle: context.Shuffle,
  };
  vm.createContext(context);
  for (const file of ['utility.js', 'command.js', 'sets/vantagepoint.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
  }
  Object.assign(context, isolatedHelpers);
  for (const title of ['Unity', 'Carmen']) {
    const card = {title, player: runner, cardType: 'program', subTypes: ['Icebreaker']};
    card.renderer = {card};
    card.cardLocation = runner.stack;
    runner.stack.push(card);
  }
  const unity = runner.stack[0];
  const beta = context.cardSet[36019];
  context.executingCommand = 'continue';
  context.currentPhase = {Resolve: {continue(params) { beta.Resolve.call(beta, params); }}};
  context.validOptions = beta.Enumerate.call(beta);
  assert.ok(runner.stack.every(card => context.validOptions.some(choice => choice.card === card)),
    'setup: both eligible programs must be offered');
  assert.strictEqual(context.OptionsAreOnlyUniqueServers(), false, 'setup: this is a program selection');
  assert.ok(context.GetAvailability(unity.renderer) > 0, 'setup: Unity must be selectable');
  // The renderer calls ResolveClick on release. There was no separate server click.
  context.ResolveClick.call({}, unity.renderer);
  assert.ok(runner.rig.programs.includes(unity), 'setup: program selection must install Unity');
  if (process.env.VERBOSE) console.log(JSON.stringify({hoveredName, runs, prompts: prompts.length}));
  assert.deepStrictEqual(runs, [],
    'program selection must wait for a separate server choice; pointer over ' + hoveredName);
  assert.ok(prompts.some(prompt => prompt.player === runner &&
    servers.every(s => prompt.choices.some(choice => choice.server === s))),
  'after installation, offer the Runner a separate choice of all four servers');
}

let failures = 0;
for (const hoveredName of ['R&D', 'Archives', 'Remote 0']) {
  try { reproduce(hoveredName); }
  catch (error) { failures++; console.error(error.stack); }
}
console.log(`Beta Build server choice: ${3 - failures}/3 passed, ${failures} failed.`);
if (failures) process.exitCode = 1;
