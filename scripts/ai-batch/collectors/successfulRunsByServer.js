'use strict';
// I0: successful Runner runs per game by server (hq, rd, archives, remote).
module.exports = {
  name: 'successfulRunsByServer',
  directions: {'successfulRunsByServer.hq': 'lower', 'successfulRunsByServer.rd': 'lower',
    'successfulRunsByServer.archives': 'lower', 'successfulRunsByServer.remote': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.successfulRuns = {hq: 0, rd: 0, archives: 0, remote: 0};
    else if (event.type === 'run' && event.success) game.successfulRuns[event.server]++;
  },
  finish(game) {
    return game.successfulRuns;
  },
};
