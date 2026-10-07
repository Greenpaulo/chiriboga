#!/usr/bin/env node
'use strict';
// Owner-run queue only. --check validates inputs without launching games.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {spawnSync, execFileSync} = require('child_process');
const {loadPool} = require('./ai-batch');
const {compareReports} = require('./ai-batch/metrics');
const root = path.resolve(__dirname, '..');
const optionNames = ['secureScoringServerGate', 'serverAtRiskInstallOverride',
  'committedAgendaReserveBypass', 'emptyArchivesRunPressure', 'valuelessServerDebtReset'];
const files = ['deck/seedrandom.min.js', 'config.js', 'sounds.js', 'init.js', 'phase.js',
  'command.js', 'checks.js', 'mechanics.js', 'utility.js', 'decks.js', 'runcalculator.js',
  'ai_corp.js', 'ai_runner.js', 'sets/systemgateway.js', 'sets/systemupdate2021.js',
  'sets/elevation.js', 'scripts/ai-batch/headless.js', 'scripts/ai-batch/metrics.js'];
const metrics = ['winRate', 'pointsScored', 'pointsStolen', 'pointsStolenByServer.hq',
  'pointsStolenByServer.rd', 'pointsStolenByServer.archives', 'pointsStolenByServer.remote', 'gameLength'];
const seeds = Array.from({length: 200}, (_, i) => String(i + 1));
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = get => crypto.createHash('sha1')
  .update(files.map(f => f + '\n' + get(f).replace(/\r/g, '')).join('\n'))
  .digest('hex').slice(0, 16);
const key = g => JSON.stringify([g.fixtureId || null, g.deckPairId, String(g.seed)]);
const fail = message => { throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function validateReport(report, label, pool, expectedHash, expectedOptions, expectedSha) {
  if (report.kind !== 'ai-batch-report' || report.dirty !== false || report.quick !== false ||
      report.poolHash !== 'fe8cb821d04c9dd7' || report.pool.id !== 'beginner-v1' ||
      !equal(report.pool.sets, pool.pool.sets) || !equal(report.pairs, pool.pool.pairs.map(p => p.id)) ||
      !equal(report.seeds, seeds) || !equal(report.starts, []) || !equal(report.collectors, []) ||
      report.codeHash !== expectedHash || !equal(report.options, expectedOptions) ||
      !expectedSha.startsWith(report.sha) || report.games.length !== 1000)
    fail(`${label}: report metadata does not match the frozen run.`);
  const expected = new Set(pool.pool.pairs.flatMap(p => seeds.map(seed => key({deckPairId: p.id, seed}))));
  for (const game of report.games) {
    if (!expected.delete(key(game))) fail(`${label}: duplicate/unexpected game.`);
  }
  if (expected.size) fail(`${label}: missing games.`);
  const failures = report.games.filter(g => !g.ok);
  if (!Array.isArray(report.failures) || report.failures.length !== failures.length)
    fail(`${label}: failure accounting mismatch.`);
}

function uniqueLog(bench, name) {
  for (let i = 0; ; i++) {
    const file = path.join(bench, name + (i ? `-${i}` : '') + '.log');
    try { return {file, fd: fs.openSync(file, 'wx')}; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
}

function invoke(args, log) {
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/ai-batch.js'), ...args],
    {cwd: root, stdio: ['ignore', log.fd, log.fd]});
  if (result.error) throw result.error;
  if (result.signal || ![0, 1].includes(result.status))
    fail(`Harness stopped (${result.signal || result.status}); inspect ${log.file}.`);
  return result.status;
}

function fidelity(baseline, candidate, label) {
  const byKey = new Map(baseline.games.map(g => [key(g), g]));
  const changed = candidate.games.filter(g => {
    const b = byKey.get(key(g));
    return !b || !b.ok || !g.ok || (b.errors || []).length || (g.errors || []).length ||
      !b.logHash || b.logHash !== g.logHash ||
      ['winner', 'reason', 'turns', 'corpPoints', 'runnerPoints'].some(f => b[f] !== g[f]) ||
      metrics.some(f => b.metrics[f] !== g.metrics[f]);
  });
  if (baseline.games.length !== 1000 || candidate.games.length !== 1000 || changed.length)
    fail(`${label}: fidelity failed (${changed.length} changed/failed/missing pairs); no reruns.`);
  return 'Fidelity PASS: 1,000 completed pairs, identical logHash, winner, points and turns.';
}

function compare(bench, baselineFile, candidateFile, label, strict) {
  const log = uniqueLog(bench, `compare-${label}`);
  try {
    invoke(['--compare', baselineFile, candidateFile], log);
    const baseline = read(baselineFile), candidate = read(candidateFile);
    const result = compareReports(baseline, candidate);
    const lines = ['\nPaired outcome differences (candidate minus baseline), 95% intervals:',
      'Metric | Baseline | Candidate | Difference [95% interval]'];
    for (const name of metrics) {
      const m = result.metrics[name];
      if (!m) { lines.push(`${name} | unavailable (no completed pairs)`); continue; }
      const scale = name === 'winRate' ? 100 : 1;
      const fmt = n => (n * scale).toFixed(3);
      lines.push(`${name}${scale === 100 ? ' (percentage points)' : ''} | ${fmt(m.baseline)} | ` +
        `${fmt(m.candidate)} | ${fmt(m.difference)} [${fmt(m.low)}, ${fmt(m.high)}]`);
    }
    lines.push(`Pairs used: ${result.pairedGames}; dropped: ${result.droppedGames}; changed games: ${result.changedGames}`);
    fs.writeSync(log.fd, lines.join('\n') + '\n');
    if (strict) fs.writeSync(log.fd, fidelity(baseline, candidate, label) + '\n');
    console.log(`${label}: ${result.pairedGames} pairs, ${result.changedGames} changed; ${log.file}`);
  } catch (error) {
    fs.writeSync(log.fd, `\nSTOP: ${error.message}\n`);
    throw error;
  } finally { fs.closeSync(log.fd); }
}

function main() {
  const args = process.argv.slice(2);
  let bench, check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--bench' && args[i + 1]) bench = path.resolve(args[++i]);
    else if (args[i] === '--check') check = true;
    else fail('Usage: node scripts/run-corp-regression-options.js --bench <directory> [--check]');
  }
  if (!bench) fail('--bench is required; use the migrated benchmark directory.');
  if (git('status', '--porcelain')) fail('Build must be committed and clean.');
  const sha = git('rev-parse', 'HEAD');
  const codeHash = hash(f => fs.readFileSync(path.join(root, f), 'utf8'));
  if (codeHash !== '83dee8ba06045827') fail('Game code differs from the prepared option build.');
  for (const file of files.filter(f => f !== 'ai_corp.js')) {
    const old = execFileSync('git', ['show', `b52d451:${file}`], {cwd: root, encoding: 'utf8'});
    if (old.replace(/\r/g, '') !== fs.readFileSync(path.join(root, file), 'utf8').replace(/\r/g, ''))
      fail(`Chassis differs from b52d451: ${file}`);
  }
  const poolFile = path.join(bench, 'beginner-pool.json');
  const pool = loadPool(poolFile);
  if (pool.hash !== 'fe8cb821d04c9dd7' || pool.pool.id !== 'beginner-v1') fail('Pool mismatch.');
  const controls = [
    {file: path.join(bench, 'causal-gate-and-four-off.json'), sha: 'edc177a', hash: '87710e06cb4e7cf9'},
    {file: path.join(bench, 'current.json'), sha: 'b52d451', hash: 'a0ab675e420ce8b0'},
  ];
  for (const control of controls) {
    validateReport(read(control.file), control.file, pool, control.hash,
      {corp: {evidenceBasedHostedCardRez: false}, runner: {}}, control.sha);
    if (hash(f => execFileSync('git', ['show', `${control.sha}:${f}`], {cwd: root, encoding: 'utf8'})) !== control.hash)
      fail(`${control.file}: historical build hash mismatch.`);
  }
  const arms = [
    {label: 'default', on: []},
    ...optionNames.map(name => ({label: name, on: [name]})),
    {label: 'all-on', on: optionNames},
  ].map(arm => ({...arm, file: path.join(bench, `corp-options-${arm.label}.json`),
    options: {corp: {evidenceBasedHostedCardRez: false,
      ...Object.fromEntries(optionNames.map(name => [name, arm.on.includes(name)]))}, runner: {}}}));
  // Validate every existing arm before launching any new one.
  for (const arm of arms) {
    for (const file of [arm.file, arm.file + '.pending']) {
      if (fs.existsSync(file)) validateReport(read(file), file, pool, codeHash, arm.options, sha);
    }
  }
  if (check) { console.log('Queue inputs/build verified. No games or comparisons launched.'); return; }
  const lockFile = path.join(bench, 'corp-options-queue.lock');
  if (fs.existsSync(lockFile)) {
    const pid = Number(fs.readFileSync(lockFile, 'utf8'));
    if (!Number.isInteger(pid) || pid <= 0) fail(`Invalid queue lock: ${lockFile}`);
    try { process.kill(pid, 0); fail(`Queue already running (PID ${pid}).`); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
    fs.unlinkSync(lockFile);
  }
  fs.writeFileSync(lockFile, String(process.pid), {flag: 'wx'});
  try {
    for (const arm of arms) {
      if (!fs.existsSync(arm.file)) {
        const pending = arm.file + '.pending';
        if (!fs.existsSync(pending)) {
          const log = uniqueLog(bench, `run-corp-options-${arm.label}`);
          console.log(`Running ${arm.label}; ${log.file}`);
          try {
            invoke(['--pool', poolFile, '--games', '200', '--seeds', '1-200', '--jobs', '10',
              '--timeout', '900', '--out', pending,
              ...arm.on.flatMap(name => ['--corp-option', `${name}=true`])], log);
          } finally { fs.closeSync(log.fd); }
        }
        const report = read(pending);
        validateReport(report, pending, pool, codeHash, arm.options, sha);
        // link is atomic and fails if a report already exists; never overwrite.
        fs.linkSync(pending, arm.file);
        fs.unlinkSync(pending);
      } else console.log(`Skipping existing ${arm.file}`);
      const report = read(arm.file);
      console.log(`${arm.label}: ${report.failures.length} failed games retained, not rerun.`);
      const strict = arm.label === 'default' || arm.label === 'all-on';
      const baseline = arm.label === 'default' ? controls[0].file :
        arm.label === 'all-on' ? controls[1].file : arms[0].file;
      compare(bench, baseline, arm.file, arm.label, strict);
    }
    console.log('Queue complete. Reports and comparison logs retained; no further runs queued.');
  } finally { fs.unlinkSync(lockFile); }
}

try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
