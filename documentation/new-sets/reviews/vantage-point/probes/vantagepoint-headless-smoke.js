const fs = require('fs');
const path = require('path');
const {randomUUID} = require('crypto');
const root = path.resolve(__dirname, '../../../../..');
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));
function assessResult(result) {
  const engineErrors = [...new Set([
    ...(result.report?.engineErrors || []),
    ...(result.log || []), ...(result.tail || []),
  ].filter(line => /^ERROR\b/.test(line)))];
  const {log, ...summary} = result;
  return {...summary, engineErrors};
}
function isFailure(result) {
  return !result.winner || result.errors.length > 0 || result.engineErrors.length > 0;
}
function writeSmokeReport(results, directory = path.join(__dirname, '..'), started = new Date()) {
  const startedAt = started.toISOString();
  const destination = path.join(directory,
    `vantagepoint-headless-smoke-${startedAt.replace(/[:.]/g, '-')}-${randomUUID()}.json`);
  fs.writeFileSync(destination, JSON.stringify({date: startedAt.slice(0, 10), startedAt,
    command: 'node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-headless-smoke.js',
    results}, null, 2) + '\n', {flag: 'wx'});
  return destination;
}
async function main() {
  const started = new Date();
  const results = [];
  for (const setup of ['vantagepoint-headless-setup.js', 'vantagepoint-headless-setup-alternate.js']) {
    for (let seed = 1; seed <= 4; seed++) {
      const result = assessResult(await playGame({streamPrefix: `vp-review-${setup}-${seed}`,
        corpFile: 'Duel PD vs Tao.js', runnerFile: 'Duel Tao vs PD.js',
        setFiles: ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'],
        setupFile: path.join(__dirname, setup), timeoutMs: 60000, tail: 20, fullLog: true}));
      results.push({setup, seed, ...result});
      console.log(JSON.stringify({setup, seed, winner: result.winner, reason: result.reason, turns: result.turns, errors: result.errors, engineErrors: result.engineErrors}));
    }
  }
  const destination = writeSmokeReport(results, undefined, started);
  const failed = results.filter(isFailure);
  console.log(`${results.length} full-engine games, ${failed.length} failed; report saved to ${destination}.`);
  process.exitCode = failed.length ? 1 : 0;
}
module.exports = {assessResult, isFailure, writeSmokeReport};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
