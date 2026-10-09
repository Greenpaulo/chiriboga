'use strict';
// I0: Corp turns that begin with the Corp insolvent: 0 credits, or fewer
// credits than the cheapest printed rez cost among its installed unrezzed ICE.
module.exports = {
  name: 'corpInsolventTurns',
  directions: {corpInsolventTurns: 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.insolventTurns = 0;
    else if (event.type === 'turnStart' && event.side === 'corp') {
      const {credits, unrezzedIceRezCosts} = event.corp;
      if (credits === 0 || (unrezzedIceRezCosts.length && credits < Math.min(...unrezzedIceRezCosts)))
        game.insolventTurns++;
    }
  },
  finish(game) {
    return game.insolventTurns;
  },
};
