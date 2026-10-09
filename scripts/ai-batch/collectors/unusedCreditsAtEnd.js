'use strict';
// I0: Corp credits left in its credit pool when the game ends.
module.exports = {
  name: 'unusedCreditsAtEnd',
  directions: {unusedCreditsAtEnd: 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.unusedCredits = 0;
    else if (event.type === 'gameEnd') game.unusedCredits = event.corpCredits || 0;
  },
  finish(game) {
    return game.unusedCredits;
  },
};
