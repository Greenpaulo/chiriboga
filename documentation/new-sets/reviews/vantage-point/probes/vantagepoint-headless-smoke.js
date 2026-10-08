const fs = require('fs');
const path = require('path');
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
async function main() {
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
  const destination = path.join(__dirname, '../vantagepoint-headless-smoke-2026-10-08.json');
  fs.writeFileSync(destination, JSON.stringify({date: '2026-10-08', command: 'node documentation/new-sets/reviews/vantage-point/probes/vantagepoint-headless-smoke.js', results}, null, 2) + '\n');
  const failed = results.filter(isFailure);
  console.log(`${results.length} full-engine games, ${failed.length} failed; report saved.`);
  process.exitCode = failed.length ? 1 : 0;
}
module.exports = {assessResult, isFailure};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
