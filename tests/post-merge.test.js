'use strict';

const assert = require('assert');
const {postMerge} = require('../scripts/post-merge');

const refreshes = [
  ['scripts/refresh-ai-baseline.js', '--format', 'beginner'],
  ['scripts/refresh-ai-baseline.js', '--format', 'startup'],
];
let cases = 0;
function test(name, fn) {
  fn();
  cases++;
  if (process.env.VERBOSE) console.log(name);
}

test('refreshes both pools without moving a ticket', () => {
  const calls = [];
  postMerge([], args => calls.push(args));
  assert.deepStrictEqual(calls, refreshes);
});

test('moves the supplied ticket after both refreshes', () => {
  const calls = [];
  const ticket = 'documentation/backlog/code-review/ticket with spaces.md';
  postMerge(['--move', ticket], args => calls.push(args));
  assert.deepStrictEqual(calls, [...refreshes, ['scripts/ticket.js', 'move', ticket, 'done']]);
});

test('invalid arguments fail before any command runs', () => {
  for (const args of [['--move'], ['ticket.md'], ['--unknown'], ['--move', ''],
    ['--move', '--help'], ['--move', 'ticket.md', 'extra']]) {
    assert.throws(() => postMerge(args, () => assert.fail('must not run')), /Usage:/);
  }
});

for (const failedAt of [0, 1, 2]) {
  test(`command failure at step ${failedAt + 1} stops remaining work`, () => {
    const calls = [];
    assert.throws(() => postMerge(['--move', 'ticket.md'], args => {
      calls.push(args);
      if (calls.length === failedAt + 1) throw new Error('command failed');
    }), /command failed/);
    assert.deepStrictEqual(calls, [...refreshes, ['scripts/ticket.js', 'move', 'ticket.md', 'done']]
      .slice(0, failedAt + 1));
  });
}

console.log(`${cases} post-merge cases passed.`);
