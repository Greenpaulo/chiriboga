'use strict';
// L8.4: bait and agenda-bluff posture rolls per eligible card per epoch (one
// Corp turn). `violations` counts rolls beyond the first for the same card and
// posture kind in one epoch; with posture epochs on it must be 0 in every game.
// Profile (shape) rolls are not posture decisions and are not counted.
module.exports = {
  name: 'postureDecisionsPerEpoch',
  directions: {'postureDecisionsPerEpoch.violations': 'lower', 'postureDecisionsPerEpoch.rolls': null},
  onEvent(event, game) {
    if (event.type !== 'posture' || event.action !== 'roll' || event.kind === 'profile') return;
    const counts = game.postureRolls = game.postureRolls || {};
    const key = [event.kind, event.cardId, event.epoch].join(':');
    counts[key] = (counts[key] || 0) + 1;
  },
  finish(game) {
    const counts = Object.values(game.postureRolls || {});
    return {
      violations: counts.reduce((sum, n) => sum + Math.max(0, n - 1), 0),
      rolls: counts.reduce((sum, n) => sum + n, 0),
    };
  },
};
