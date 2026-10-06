// Known-red review reproduction, outside the green test suite.
// Node documentation/new-sets/reviews/probes/vantagepoint-bad-publicity-fund.js
// Rules source: https://nullsignal.games/blog/the-return-of-bad-publicity-in-vantage-point/
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../../../..');
const runner = {side: 'runner', creditPool: 6, temporaryCredits: 2, rig: {programs: [], hardware: [], resources: []}};
const corp = {side: 'corp', creditPool: 5, HQ: {root: [], ice: [], cards: []}, RnD: {root: [], ice: [], cards: []}, archives: {root: [], ice: [], cards: []}, remoteServers: []};
const c = {runner, corp, cardSet: [], setIdentifiers: [], console, Log() {}};
vm.createContext(c);
for (const file of ['config.js', 'utility.js', 'checks.js', 'mechanics.js', 'sets/vantagepoint.js']) vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), c, {filename: file});
c.Log = () => {}; // UI-only logging; preserve gameplay implementations.
// Supply the board's active cards, without replacing any audited effect/check.
let active = [];
c.ActiveCards = player => active.filter(card => !player || card.player === player);
const paywall = c.cardSet[36052];
const aircheck = c.cardSet[36018];
const failures = [];
function check(label, actual, expected) {
  try { assert.deepStrictEqual(actual, expected); }
  catch (_) { failures.push(`${label}: actual ${JSON.stringify(actual)}; expected ${JSON.stringify(expected)}`); }
}
// The bad-publicity fund remains spendable but is not part of the pool.
check('AvailableCredits still counts spendable fund', c.AvailableCredits(runner), 8);
check('Credits pool query excludes fund', c.Credits(runner), 6);
assert.strictEqual(paywall.responseOnEncounter.Enumerate.call(paywall, paywall).length, 1);
paywall.responseOnEncounter.Resolve.call(paywall);
check('Paywall loses regular pool credit, retains fund', [runner.creditPool, runner.temporaryCredits], [5, 2]);
// Aircheck (batch 4) protects the pool against Paywall (batch 11). The fund is
// outside the pool and cannot be lost to Paywall, independently of that lock.
runner.creditPool = 6; runner.temporaryCredits = 2;
aircheck.runningWithThis = true; aircheck.credits = 4; active = [aircheck];
check('Aircheck pool is locked', c.CreditPoolCanBeUsed(runner, 'lose'), false);
paywall.responseOnEncounter.Resolve.call(paywall);
check('Aircheck + Paywall loses neither pool nor fund', [runner.creditPool, runner.temporaryCredits, aircheck.credits], [6, 2, 4]);
// Existing playable-card effects causing Corp credit loss must never consume
// the Runner's fund. This also demonstrates the shared helper side boundary.
active = []; runner.temporaryCredits = 2; corp.creditPool = 5;
c.LoseCredits(corp, 1);
check('Corp credit loss uses only Corp pool', [corp.creditPool, runner.temporaryCredits], [4, 2]);
for (const failure of failures) console.error(failure);
console.log(`Bad-publicity fund review: ${failures.length} confirmed mismatches; real effect/check/helper paths retained.`);
process.exitCode = failures.length ? 1 : 0;
