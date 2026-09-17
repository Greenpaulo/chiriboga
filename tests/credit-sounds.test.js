// Run with: node tests/credit-sounds.test.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const mechanicsSource = fs.readFileSync(path.join(root, 'mechanics.js'), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert(start >= 0, 'Could not find ' + name);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Could not extract ' + name);
}

const runner = {creditPool: 0, temporaryCredits: 0};
const corp = {creditPool: 0};
const played = [];
const context = {
  console,
  runner,
  corp,
  Audio: function () { return {currentTime: 0, play: () => Promise.resolve()}; },
  Log() {},
  UpdateCounters() {},
  PlayerName: player => player === runner ? 'Runner' : 'Corp',
  GetTitle: card => card.title,
  CheckCardType: () => false,
  TriggeredResponsePhase() {},
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'sounds.js'), 'utf8'), context);
vm.runInContext(extractFunction(mechanicsSource, 'GainCredits'), context);
vm.runInContext(extractFunction(mechanicsSource, 'TakeCredits'), context);
context.PlaySound = name => played.push(name);

context.GainCredits(runner, 1);
assert.deepStrictEqual(played, ['gainCredit']);

const redTeam = {title: 'Red Team', credits: 12};
context.TakeCredits(runner, redTeam, 3);
assert.deepStrictEqual(played, ['gainCredit', 'gainCredit3']);
assert.strictEqual(redTeam.credits, 9);

const telework = {title: 'Telework Contract', credits: 9};
context.TakeCredits(runner, telework, 2);
assert.deepStrictEqual(played, ['gainCredit', 'gainCredit3', 'gainCredit2']);

context.suppressCreditDrawSound = true;
context.TakeCredits(runner, telework, 1);
assert.deepStrictEqual(played, ['gainCredit', 'gainCredit3', 'gainCredit2']);

console.log('4 credit sound regression cases passed.');
