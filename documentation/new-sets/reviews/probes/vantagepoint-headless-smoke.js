const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../..');
const {playGame} = require(path.join(root, 'scripts/ai-batch/headless'));
async function main() {
  const results = [];
  for (const setup of ['vantagepoint-headless-setup.js', 'vantagepoint-headless-setup-alternate.js']) {
    for (let seed = 1; seed <= 4; seed++) {
      const result = await playGame({streamPrefix: `vp-review-${setup}-${seed}`,
        corpFile: 'Duel PD vs Tao.js', runnerFile: 'Duel Tao vs PD.js',
        setFiles: ['sets/systemgateway.js', 'sets/systemupdate2021.js', 'sets/elevation.js', 'sets/vantagepoint.js'],
        setupFile: path.join(__dirname, setup), timeoutMs: 60000, tail: 20});
      results.push({setup, seed, ...result});
      console.log(JSON.stringify({setup, seed, winner: result.winner, reason: result.reason, turns: result.turns, errors: result.errors}));
    }
  }
  const destination = path.join(__dirname, '../vantagepoint-headless-smoke.json');
  fs.writeFileSync(destination, JSON.stringify({date: '2026-10-06', command: 'node documentation/new-sets/reviews/probes/vantagepoint-headless-smoke.js', results}, null, 2) + '\n');
  const failed = results.filter(r => !r.winner || r.errors.length);
  console.log(`${results.length} full-engine games, ${failed.length} failed; report saved.`);
  process.exitCode = failed.length ? 1 : 0;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
