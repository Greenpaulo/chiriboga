// Reproduction for roadmap item F2 row 7 and bug ticket
// potential-tag-punishment-never-restores-phase.
// Runs unchanged from tests/pending/ (known red) or tests/ (green) once fixed.
// _potentialTagPunishment() must leave runner.tags, corp.clickTracker,
// corp.creditPool and currentPhase.identifier exactly as it found them, after a
// normal return and after the evaluated probe throws.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const runner = {tags: 0, creditPool: 3, rig: {resources: []}, AI: null};
const corp = {creditPool: 7, clickTracker: 1, AI: null};
const currentPhase = {identifier: 'Runner 1.1'};
const context = {console, runner, corp, currentPhase, attackedServer: null,
  encountering: false, approachIce: -1, cardSet: {}, setIdentifiers: []};
vm.createContext(context);
const runnerSource = fs.readFileSync(path.join(root, 'ai_runner.js'), 'utf8');
vm.runInContext(runnerSource.slice(0, runnerSource.indexOf('//actual class')), context);
vm.runInContext(fs.readFileSync(path.join(root, 'ai_corp.js'), 'utf8'), context, {filename: 'ai_corp.js'});
vm.runInContext('reviewAI = new CorpAI(); reviewAI._log = function() {};', context);
const ai = context.reviewAI;

const live = () => ({tags: runner.tags, clicks: corp.clickTracker, credits: corp.creditPool,
  phase: currentPhase.identifier, depth: ai._hypotheticalDepth});
const before = live();
let tests = 0;

// No resource-trash shortcut: the Runner has no installed resources.
let seen = null;
ai._useWhenTaggedCard = function () {
  seen = live();
  return null;
};
assert.strictEqual(ai._potentialTagPunishment(2, 3, 9), false);
assert.deepStrictEqual(
  {tags: seen.tags, clicks: seen.clicks, credits: seen.credits, phase: seen.phase},
  {tags: 2, clicks: 3, credits: 9, phase: 'Corp 2.2'}, 'the probe sees the hypothetical values');
assert.ok(seen.depth > 0, 'the probe runs at hypothetical depth');
assert.deepStrictEqual(live(), before, 'normal return restores every field, including the phase');
tests++;

ai._useWhenTaggedCard = function () {
  throw new Error('probe failure');
};
assert.throws(() => ai._potentialTagPunishment(2, 3, 9), /probe failure/);
assert.deepStrictEqual(live(), before, 'a throwing probe restores every field and the depth');
tests++;

console.log('potential-tag-punishment-restores-state: ' + tests + ' tests passed');
