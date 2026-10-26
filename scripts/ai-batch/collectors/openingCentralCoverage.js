'use strict';
// I2.3: occupancy at completed Corp turn boundaries, not installation history.
// Missing boundaries remain unobserved. Raw hands are Corp-known diagnostic
// samples; printed costs deliberately do not claim suitability/affordability.
module.exports = {
  name: 'openingCentralCoverage',
  directions: Object.fromEntries([1, 2].flatMap(turn => ['observed', 'both'].map(field =>
    [`openingCentralCoverage.turn${turn}.${field}`, null]))),
  onEvent(event, game) {
    if (event.type === 'gameStart') {
      game.openingCoverage = {turn1: {observed: 0, both: 0}, turn2: {observed: 0, both: 0}};
      game.openingSamples = {hands: {}, installs: [], boundaries: {}};
    } else if (event.type === 'openingHand') {
      game.openingSamples.hands[event.stage] = {mulligan: event.mulligan, credits: event.credits,
        cards: event.cards.map(card => ({...card}))};
    } else if (event.type === 'corpIceInstallCompleted') {
      game.openingSamples.installs.push({turn: event.turn, server: event.server, card: event.card,
        ordinal: event.ordinal, required: event.required, actual: event.actual, reason: event.reason, group: event.group, score: event.score});
    } else if (event.type === 'turnEnd' && event.side === 'corp' && [1, 2].includes(event.turn) && event.centralIce) {
      const key = `turn${event.turn}`;
      game.openingCoverage[key] = {observed: 1, both: Number(event.centralIce.hq > 0 && event.centralIce.rd > 0)};
      game.openingSamples.boundaries[key] = {...event.centralIce};
    }
  },
  finish(game) { return game.openingCoverage; },
  samples(game) { return game.openingSamples; },
};
