'use strict';
// I0 (R1.1's definition): Corp turns in which every main-phase action was the
// basic credit action although the Corp began the turn able to afford a legal
// install or play. "Able" means HQ held an ICE, agenda, asset or upgrade (a
// first ICE or a new remote costs nothing to install) or an operation whose
// printed play cost the Corp could pay; play restrictions are not modelled.
// An action is a Corp "Corp 2.2" decision whose options include "gain".
const INSTALLABLE = ['ice', 'agenda', 'asset', 'upgrade'];

function closeTurn(game) {
  const turn = game.stall.turn;
  if (turn && turn.able && turn.actions > 0 && turn.gains === turn.actions) game.stall.count++;
  game.stall.turn = null;
}

module.exports = {
  name: 'stallTurns',
  directions: {stallTurns: 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.stall = {count: 0, turn: null};
    else if (event.type === 'turnStart' && event.side === 'corp') {
      const {credits, hand} = event.corp;
      const able = hand.some(card => INSTALLABLE.includes(card.cardType) ||
        (card.cardType === 'operation' && card.playCost !== null && card.playCost <= credits));
      game.stall.turn = {able, actions: 0, gains: 0};
    } else if (event.type === 'decision' && event.side === 'corp' && game.stall.turn &&
        event.identifier === 'Corp 2.2' && event.options.includes('gain')) {
      game.stall.turn.actions++;
      if (event.options[event.chosen] === 'gain') game.stall.turn.gains++;
    } else if ((event.type === 'turnEnd' && event.side === 'corp') || event.type === 'gameEnd') closeTurn(game);
  },
  finish(game) {
    return game.stall.count;
  },
};
