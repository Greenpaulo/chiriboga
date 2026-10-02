#!/usr/bin/env node
'use strict';
// Play seeded AI-vs-AI games headlessly with the real engine, main loop and
// both AIs, one JSON line per game: a quick way to replay or profile a game.
// For batches, metrics and gates use scripts/ai-batch.js (same headless module,
// documentation/ai-batch-harness.md).
//
//   node scripts/ai-game.js [--seed <s> | --seeds <from>-<to> [--jobs <n>]]
//                           [--corp "<precon file>"] [--runner "<precon file>"]
//                           [--timeout <seconds>] [--tail <lines>] [--setup <file.js>]
//
// Defaults: seed 1, "Duel PD vs Tao.js" against "Duel Tao vs PD.js", 900 s.
// Each seed drives three independent streams (engine, Corp AI, Runner AI), so
// the same seed replays the same game; `logHash` fingerprints the game log.
// A game fails (exit code 1) if it ends without a winner or logs an engine
// error, because a missing browser stub silently changes AI choices.
// --setup runs a file inside the game context before StartGame (for
// measurements); if it defines __report(), its result is added as `report`.
const {spawn} = require('child_process');

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const corpFile = option('corp', 'Duel PD vs Tao.js');
const runnerFile = option('runner', 'Duel Tao vs PD.js');
const timeoutMs = Number(option('timeout', '900')) * 1000;
const tail = Number(option('tail', '0'));
const setupFile = option('setup', null);

const range = option('seeds', null);
if (range) {
  // Several seeds: one child process per game, `--jobs` at a time.
  const [from, to] = range.split('-').map(Number);
  const jobs = Number(option('jobs', String(Math.max(1, require('os').cpus().length - 2))));
  const seeds = [];
  for (let s = from; s <= (to || from); s++) seeds.push(String(s));
  const passOn = ['corp', 'runner', 'timeout', 'setup'].flatMap(name => args.includes('--' + name) ? ['--' + name, option(name)] : []);
  let running = 0, failed = false;
  const next = () => {
    while (running < jobs && seeds.length) {
      running++;
      const child = spawn(process.execPath, [__filename, '--seed', seeds.shift(), ...passOn], {stdio: ['ignore', 'pipe', 'inherit']});
      let out = '';
      child.stdout.on('data', chunk => { out += chunk; });
      child.on('close', code => {
        process.stdout.write(out);
        if (code !== 0) failed = true;
        running--;
        if (seeds.length) next(); else if (!running) process.exitCode = failed ? 1 : 0;
      });
    }
  };
  next();
  return;
}
const seed = option('seed', '1');

// The original four set files, kept fixed so recorded logHash values stay
// comparable (the batch harness loads its pool's own trusted sets instead).
const {playGame, loadPrecon} = require('./ai-batch/headless');
const setFiles = ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'];
process.on('uncaughtException', error => playGame.fail('uncaught: ' + error.message));
playGame({streamPrefix: seed, corpFile, runnerFile, setFiles, timeoutMs, tail, setupFile}).then(game => {
  const summary = Object.assign({seed, corp: loadPrecon(corpFile).name, runner: loadPrecon(runnerFile).name}, game);
  delete summary.tail; delete summary.options;
  console.log(JSON.stringify(summary));
  if (tail) console.log(game.tail.join('\n'));
  process.exit(summary.winner && !summary.errors.length ? 0 : 1);
});
