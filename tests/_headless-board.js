'use strict';
// Shared by pending reproductions that need the real engine and both AIs:
// play one seeded headless game (scripts/ai-batch/headless.js) whose board is
// built by `setupCode`, run inside the game context before StartGame. The
// setup usually replaces StartGame to lay out the board and force the AI's
// next action. Works from tests/pending/ and after a move to tests/.
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = path.resolve(__dirname, path.basename(__dirname) === 'pending' ? '../..' : '..');
const {playGame} = require(path.join(root, 'scripts', 'ai-batch', 'headless'));
const TRUSTED_SETS = ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js'];

async function playBoard({corp, runner, seed = '1:board', setupCode}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'board-')), 'setup.js');
  fs.writeFileSync(file, setupCode);
  try {
    return await playGame({streamPrefix: seed, corpFile: corp, runnerFile: runner, setFiles: TRUSTED_SETS,
      timeoutMs: 120000, stallMs: 3000, setupFile: file, tail: 12});
  } finally {
    fs.rmSync(path.dirname(file), {recursive: true, force: true});
  }
}

// Draw opening hands, then hand control to the board-building code.
const OPENING = `
  for (var __i = 0; __i < 5; __i++) {
    MoveCardByIndex(corp.RnD.cards.length - 1, corp.RnD.cards, corp.HQ.cards);
    MoveCardByIndex(runner.stack.length - 1, runner.stack, runner.grip);
  }`;

module.exports = {playBoard, OPENING, root};
