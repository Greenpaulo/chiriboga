'use strict';
// One diagnostic board per process. Explicit Vantage Point loading is for the
// decision probe only; it does not change the trusted F4 pool or supply gate data.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {playGame, root} = require('../../scripts/ai-batch/headless');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'baker-decision-'));
const enabled = process.argv[2] === 'true';
const setup = path.join(dir, 'probe.js');
fs.writeFileSync(setup, `
  corp.AI.options.projectedRedirectThreats = ${enabled};
  ChangePhase(phases.corpActionMain);
  var bakerProbeOptions = ['gain', 'draw', 'install', 'advance', 'n'];
  var bakerProbeChoice = corp.AI.Phase_Main(bakerProbeOptions);
  var bakerProbePreference = corp.AI.preferred;
  var bakerProbeResult = {
    choice: bakerProbeOptions[bakerProbeChoice],
    server: bakerProbePreference && bakerProbePreference.serverToInstallTo === null ? 'NEW' :
      bakerProbePreference && bakerProbePreference.serverToInstallTo &&
      bakerProbePreference.serverToInstallTo.serverName,
    card: bakerProbePreference && bakerProbePreference.cardToInstall &&
      bakerProbePreference.cardToInstall.title,
    redirect: corp.AI._archivesIsBackdoorToHQ(),
    touchstoneCredits: runner.rig.hardware[0].credits,
    bakerUsed: runner.rig.programs[0].usedThisTurn,
    security: corp.AI._evaluateServerSecurity(corp.archives),
    credits: corp.AI._effectiveRunnerCreditPool(corp.archives),
  };
  __report = function() { return bakerProbeResult; };
  Main = function() {};
`);
(async () => {
  try {
    const game = await playGame({streamPrefix: 'baker-remediation-probe',
      corpFile: 'LEO Glacier.js', runnerFile: 'Topan CBB.js',
      setFiles: ['systemgateway', 'systemupdate2021', 'elevation', 'vantagepoint']
        .map(set => 'sets/' + set + '.js'),
      timeoutMs: 1, setupFile: setup,
      start: path.join(root, 'tests/fixtures/corp-decisions/corp-protects-empty-touchstone-baker.txt')});
    if (game.errors.length) throw new Error(game.errors.join('; '));
    console.log(JSON.stringify(game.report));
  } catch (error) {
    console.error(error.stack);
    process.exitCode = 1;
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
})();
