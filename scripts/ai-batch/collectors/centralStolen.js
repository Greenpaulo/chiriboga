'use strict';
// Agenda points the Runner stole from HQ plus R&D per game (one metric, so a
// gate can require the combined central loss to fall). Built for L7.1
// (documentation/backlog/feature-layer-7-1-consequence-calibration.md).
module.exports = {
  name: 'centralStolen',
  directions: {'centralStolen.points': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.centralStolen = {points: 0};
    else if (event.type === 'steal' && (event.server === 'hq' || event.server === 'rd'))
      game.centralStolen.points += event.points || 0;
  },
  finish(game) {
    return game.centralStolen;
  },
};
