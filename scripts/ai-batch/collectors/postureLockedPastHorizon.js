'use strict';
// L8.4: bait or agenda-bluff postures reused at a Corp-turn decision after
// their commitment horizon expired, without a reevaluation. Must be 0 in every
// game with posture epochs on (lifetime postures emit no reuse events).
module.exports = {
  name: 'postureLockedPastHorizon',
  directions: {'postureLockedPastHorizon.count': 'lower'},
  onEvent(event, game) {
    if (event.type === 'posture' && event.action === 'reuse' && event.corpTurn === 1 && event.expired === 1)
      game.postureLocked = (game.postureLocked || 0) + 1;
  },
  finish(game) {
    return {count: game.postureLocked || 0};
  },
};
