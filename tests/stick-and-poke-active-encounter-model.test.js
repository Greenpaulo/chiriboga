'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const context = {cardSet: [], setIdentifiers: [], corp: {}, runner: {},
  ChangeImageFileToJPG: name => name,
  ChoicesInstalledCards: () => [], CheckTrash: () => true};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'sets/vantagepoint.js'), 'utf8'), context);
const resource = context.cardSet[36008];
const ice = context.cardSet[36058];
const server = {ice: [ice]};
context.GetServer = () => server;
resource.automaticOnEncounter.Resolve.call(resource, ice);
const model = ice.AIImplementIce.call(ice, {}, {ice, sr: []});
resource.AIModifyIceAI.call(resource, model, 0);
try {
  assert.strictEqual(model.sr.length, ice.subroutines.length,
    'Stick and Poke must model its added subroutine during the active encounter');
  assert.deepStrictEqual(Array.from(model.sr[0][0]), ['netDamage']);
  assert.ok(model.sr[2][1].includes('endTheRun'), 'Event Horizon final row stays aligned');
  console.log('Stick and Poke active encounter model passed.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
