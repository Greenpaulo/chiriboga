'use strict';
// I2: credits the Corp spent installing ICE that was never rezzed afterwards
// (still unrezzed at game end, or trashed or returned unrezzed), from the
// headless runner's observation-only iceInstall/iceRez events. Definition in
// documentation/ai-batch-harness.md ("I2 stranded ICE collector").
module.exports = {
  name: 'strandedUnrezzedIceCost',
  directions: {'strandedUnrezzedIceCost.credits': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') {
      game.strandedIce = new Map(); // ICE id -> install credits not yet followed by a rez
      return;
    }
    if (event.type === 'iceInstall')
      game.strandedIce.set(event.id, (game.strandedIce.get(event.id) || 0) + event.cost);
    else if (event.type === 'iceRez') game.strandedIce.delete(event.id);
  },
  finish(game) {
    let credits = 0;
    for (const cost of game.strandedIce.values()) credits += cost;
    return {credits};
  },
};
