'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const c = {console: {...console, error: () => {}}, cardSet: [], setIdentifiers: [],
  corp: {}, runner: {}, phases: {}, approachIce: 0, subroutine: 0,
  executingCommand: 'continue', ChangeImageFileToJPG: name => name,
  ChoicesInstalledCards: () => [], CheckTrash: () => true,
  AvailableCredits: () => 5, PlayerCanLook: () => true,
  RezCost: ice => ice.rezCost || 0, Strength: ice => ice.strength || 0,
  AIWithIceEncounter: (ice, callback) => callback(),
  AutomaticTriggers: () => {}, Log: () => {}, GetTitle: card => card.title,
  CheckCredits: () => true, CheckRunning: () => true,
  Draw: () => {}, Damage: (type, amount, preventable, callback) => {if (callback) callback();},
};
vm.createContext(c);
for (const file of ['config.js', 'runcalculator.js', 'ai_runner.js', 'sets/vantagepoint.js'])
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.AIWithIceEncounter = (ice, callback) => callback();
const resource = c.cardSet[36008];
const horizon = c.cardSet[36058], lion = c.cardSet[36041];
horizon.rezzed = lion.rezzed = true;
const server = {ice: [horizon]};
c.GetServer = ice => server.ice.includes(ice) ? server : null;
c.ActiveCards = () => [resource];
c.GetApproachEncounterIce = () => server.ice[0];
c.attackedServer = server;
vm.runInContext('globalThis.testAI = new RunnerAI()', c);
const ai = c.testAI, rc = ai.rc;
ai._phaseCallback = () => {};
ai._cardsInHandWorthKeeping = () => [];
ai._cachedOrBestRun = () => {};
ai._log = () => {};
const plain = value => JSON.parse(JSON.stringify(value));
const model = ice => rc.IceAI(ice, 10, false, false, server.ice.indexOf(ice));
const finish = () => resource.responseOnEncounterEnds.Resolve.call(resource);
const reset = () => resource.responseOnRunnerTurnBegins.Resolve.call(resource);
async function main() {
  // Prospective routes get only the first encountered row; unused routes stay intact.
  assert.strictEqual(model(horizon).sr.length, 3);
  const defaultIce = {rezzed: true, subTypes: [], subroutines: [{}, {}]};
  for (const ice of [horizon, lion, defaultIce]) {
    server.ice = [ice];
    const intact = plain(model(ice).sr);
    const actualRows = ice.subroutines.slice();
    for (let index = 0; index < actualRows.length; index++) {
      ice.subroutines[index].broken = true;
      const broken = plain(model(ice).sr);
      assert.deepStrictEqual(broken[index + 1], [[]],
        'prospective row shifts each broken printed row by one');
      for (let other = 0; other < broken.length; other++)
        if (other !== index + 1) assert.deepStrictEqual(broken[other], intact[other],
          'prospective damage and other printed rows stay intact');
      assert.deepStrictEqual(ice.subroutines, actualRows, 'planning never inserts a live row');
      // Without a prospective modifier, the same flag still uses the actual index.
      const unmodified = plain(rc.IceAI(ice, 10).sr);
      assert.deepStrictEqual(unmodified[index], [[]]);
      delete ice.subroutines[index].broken;
    }
  }
  server.ice = [horizon, lion];
  assert.strictEqual(rc.IceAI(horizon, 10, false, false, 1).sr.length, 2);
  assert.strictEqual(rc.IceAI(lion, 10, false, false, 1).sr.length, 4);
  server.ice = [horizon];
  resource.automaticOnEncounter.Resolve.call(resource, horizon);
  assert.strictEqual(model(horizon).sr.length, 3);
  assert.strictEqual(rc.IceAI(horizon, 10).sr.length, 3, 'live modifier ignores route start index');
  assert.deepStrictEqual(plain(model(horizon).sr[0]), [['netDamage']]);
  for (let index = 0; index < horizon.subroutines.length; index++) {
    const intact = plain(model(horizon).sr);
    horizon.subroutines[index].broken = true;
    const broken = plain(model(horizon).sr);
    assert.deepStrictEqual(broken[index], [[]]);
    for (let other = 0; other < broken.length; other++)
      if (other !== index) assert.deepStrictEqual(broken[other], intact[other], 'breaking one row must not blank another');
    delete horizon.subroutines[index].broken;
  }
  server.ice.push(lion);
  assert.strictEqual(model(lion).sr.length, 3, 'used resource does not modify a different ice');
  finish();
  assert.strictEqual(model(horizon).sr.length, 2);
  assert.strictEqual(horizon.subroutines.length, 2);
  reset();
  // Unimplemented ICE already has a default row for the actual added subroutine.
  const unknownModel = {rezzed: true, subTypes: [], subroutines: [{}, {}]};
  server.ice = [unknownModel];
  resource.automaticOnEncounter.Resolve.call(resource, unknownModel);
  assert.strictEqual(model(unknownModel).sr.length, 3, 'default model must not duplicate the added row');
  assert.deepStrictEqual(plain(model(unknownModel).sr[0]), [['netDamage']]);
  finish(); reset();

  // Real phase enumeration and firing preserve the identity across nested decisions.
  const phaseSource = fs.readFileSync(path.join(root, 'phase.js'), 'utf8');
  vm.runInContext(phaseSource.slice(phaseSource.indexOf('phases.runSubroutines = {'),
    phaseSource.indexOf('//Run: end of encounter')), c);
  const mechanics = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');
  vm.runInContext(mechanics.slice(mechanics.indexOf('function Trigger('),
    mechanics.indexOf('/**', mechanics.indexOf('function Trigger('))), c);
  const utility = fs.readFileSync(path.join(root, 'utility.js'), 'utf8');
  vm.runInContext(utility.slice(utility.indexOf('function ChoicesSubroutine('),
    utility.indexOf('/**', utility.indexOf('function ChoicesSubroutine('))), c);
  const decisions = [];
  c.DecisionPhase = (player, choices, callback, title, instruction, card) => {
    decisions.push({choices, callback, card});
    c.currentPhase = {identifier: 'Run Subroutines', title};
  };
  server.ice = [lion]; c.encounteredIce = lion;
  resource.automaticOnEncounter.Resolve.call(resource, lion);
  const fired = [];
  c.subroutine = 0; c.currentPhase = c.phases.runSubroutines;
  for (let i = 0; i < 4; i++) {
    const params = c.phases.runSubroutines.Enumerate.trigger()[0];
    fired.push(params.ability);
    c.phases.runSubroutines.Resolve.trigger.call(c.phases.runSubroutines.Resolve, params);
    assert.strictEqual(c.subroutine, i + 1);
  }
  assert.strictEqual(new Set(fired).size, 4);
  assert.strictEqual(c.phases.runSubroutines.Enumerate.trigger().length, 0);
  assert.strictEqual(decisions.length, 2);
  assert.strictEqual(fired[3], lion.subroutines[3]);
  assert(model(lion).sr[3][0].includes('endTheRun'));
  ai.cachedBestPath = null;
  assert.strictEqual(await ai._internalChoiceDetermination(decisions[1].choices, 'select'), 0,
    'final printed Lionsmane choice still maps to the end-the-run branch');
  finish(); reset();

  // Stable branch IDs map into the legal menu, even after payments disappear.
  server.ice = [horizon]; c.currentPhase = {identifier: 'Run Subroutines'}; c.subroutine = 2;
  const filtered = [{srChoice: 1, label: 'Decline payment'}];
  ai.cachedBestPath = [{iceIdx: -1, alt: [{srIdx: 1, choiceIdx: 1}]}];
  assert.strictEqual(await ai._internalChoiceDetermination(filtered, 'select'), 0);
  ai.cachedBestPath = [{iceIdx: -1, alt: [{srIdx: 1, choiceIdx: 0}]}];
  assert.strictEqual(await ai._internalChoiceDetermination(filtered, 'select'), 0);
  ai.cachedBestPath = null;
  assert.strictEqual(await ai._internalChoiceDetermination(filtered, 'select'), 0);
  c.subroutine = 99;
  ai.cachedBestPath = [{iceIdx: -1, alt: [{srIdx: 98, choiceIdx: 12}]}];
  assert.strictEqual(await ai._internalChoiceDetermination([{label: 'Only legal choice'}], 'select'), 0);
  ai.cachedBestPath = null;
  assert.strictEqual(await ai._internalChoiceDetermination(filtered, 'select'), 0);
  console.log('Stick and Poke lifecycle, broken rows, engine firing and choice mapping passed.');
}
main().catch(error => {console.error(error.stack); process.exitCode = 1;});
