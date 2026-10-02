'use strict';
// Example collector (F4): runs made and successful runs per game. A collector
// observes only: it reads plain event data and never touches the game.
module.exports = {
  name: 'runs',
  // Optional: which direction is better for each metric (Corp's view).
  directions: {'runs.total': null, 'runs.successful': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.runs = {total: 0, successful: 0};
    else if (event.type === 'run') {
      game.runs.total++;
      if (event.success) game.runs.successful++;
    }
  },
  finish(game) {
    return game.runs;
  },
};
