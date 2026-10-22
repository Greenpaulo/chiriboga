'use strict';
// I2.2: replay ONE pool game, recording already-computed install measurements.
// node scripts/ai-batch/rnd-protection-probe.js <pair> <seed> <true|false> [--plain]
// --plain omits the probe, for log/decision identity checks in a separate process.
function installProbe(ai, corp, snapshots) {
  let frame = null;
  const serverName = server => server ? server.serverName : 'new remote';
  for (const name of ['_marginalIceScore', '_iceLayerPolicy', '_iceInCardsCommon']) {
    const original = ai[name];
    ai[name] = function (...args) {
      const result = original.apply(this, args);
      if (frame) {
        if (name === '_marginalIceScore') frame.scores.push({card: args[0].title,
          server: serverName(args[1]), ...result});
        else if (name === '_iceLayerPolicy') frame.admission.push({server: serverName(args[0]), ...result});
        else frame.affordability.push({server: serverName(args[0]), affordable: args[1],
          cards: result.map(card => card.title)});
      }
      return result;
    };
  }
  const original = ai._rankedInstallOptions;
  ai._rankedInstallOptions = function (...args) {
    const previous = frame;
    frame = {credits: corp.creditPool, clicks: corp.clickTracker,
      handIce: corp.HQ.cards.filter(card => card.cardType === 'ice')
        .map(card => ({card: card.title, rezCost: card.rezCost})),
      scores: [], admission: [], affordability: []};
    try {
      const result = original.apply(this, args);
      frame.ranked = result.map(option => ({card: option.cardToInstall.title,
        server: serverName(option.serverToInstallTo), reason: option.reason,
        score: option.iceMarginalScore || null}));
      snapshots.Note('rndProtectionProbe', frame);
      return result;
    } finally { frame = previous; }
  };
}

if (typeof module === 'undefined') {
  installProbe(corp.AI, corp, DecisionSnapshots);
} else {
  module.exports = {installProbe};
  if (require.main === module) {
    const {buildConfig, parseArgs} = require('../ai-batch');
    const {playGame} = require('./headless');
    const metrics = require('./metrics');
    const crypto = require('crypto');
    const [pair, seed, option, plain] = process.argv.slice(2);
    if (!pair || !/^\d+$/.test(seed) || !['true', 'false'].includes(option) ||
        (plain !== undefined && plain !== '--plain')) throw new Error('Expected pair seed true|false [--plain]');
    const config = buildConfig(parseArgs(['--pairs', pair, '--seeds', `${seed}-${seed}`,
      '--corp-option', `iceMarginalSecurity=${option}`]));
    const events = [], decisions = [], observations = [], installs = [];
    let turn = 0;
    playGame({streamPrefix: `${seed}:${pair}`, corpFile: config.pairs[0].corp,
      runnerFile: config.pairs[0].runner, setFiles: config.setFiles, timeoutMs: config.timeoutMs,
      corpOptions: config.corpOptions, telemetry: true, observe: true,
      setupFile: plain ? undefined : __filename,
      onEvent(event) {
        events.push(event);
        if (event.type === 'turnStart') turn = event.turn;
        if (event.type === 'iceInstalled') installs.push(event);
        if (event.type === 'decision') {
          decisions.push([event.n, event.side, event.identifier, event.choiceType, event.options, event.chosen]);
          if (turn <= 2 && event.side === 'corp' && event.rndProtectionProbe)
            observations.push({turn, identifier: event.identifier, choiceType: event.choiceType,
              chosen: event.options[event.chosen], probes: event.rndProtectionProbe});
        }
      },
    }).then(game => {
      console.log(JSON.stringify({pair, seed, option, logHash: game.logHash,
        decisionHash: crypto.createHash('sha1').update(JSON.stringify(decisions)).digest('hex'),
        winner: game.winner, errors: game.errors, metrics: metrics.coreMetrics(events), installs, observations}));
      if (!game.winner || game.errors.length) process.exitCode = 1;
    }).catch(error => { console.error(error); process.exitCode = 1; });
  }
}
