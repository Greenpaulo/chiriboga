'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');

// Reconstructed choice boundary observed in Startup jin-anarch seed 6.
// Path planning is isolated: the crash occurs in the no-acceptable-path fallback.
const context = {
  console, cardSet: [], setIdentifiers: [], corp: {}, runner: {},
  currentPhase: {identifier: 'Run Subroutines', title: 'Lionsmane'},
  subroutine: 4, approachIce: 0, executingCommand: 'continue',
  AvailableCredits: () => 5,
  ChangeImageFileToJPG: name => name,
};
vm.createContext(context);
for (const file of ['config.js', 'runcalculator.js', 'ai_runner.js', 'sets/vantagepoint.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, {filename: file});
}
context.GetApproachEncounterIce = () => context.cardSet[36041];
context.attackedServer = {ice: [context.cardSet[36041]]};
vm.runInContext('globalThis.reproAI = new RunnerAI()', context);
const ai = context.reproAI;
ai._phaseCallback = () => {};
ai._cardsInHandWorthKeeping = () => [];
ai._cachedOrBestRun = () => null;
ai._log = () => {};
ai.rc.IceAI = ice => ice.AIImplementIce(ai.rc, {}, 5, false);
const choices = [
  {id: 1, label: 'Jack out', button: 'Jack out', command: 'continue'},
  {id: 0, label: 'Take 2 net damage', button: 'Take damage', command: 'continue'},
];
(async () => {
  const selected = await ai._internalChoiceDetermination(choices, 'select');
  assert(Number.isInteger(selected) && selected >= 0 && selected < choices.length,
    'Lionsmane must return a legal offered choice without rejecting');
  console.log('Lionsmane subroutine choice reproduction passed.');
})().catch(error => { console.error(error.stack); process.exitCode = 1; });
