'use strict';
// Count actual server redirects using passive public run observations. No
// title matching, hidden-card reads, or changes to either AI's policy.
module.exports = {
  name: 'redirectExposure',
  directions: {
    'redirectExposure.unprotectedSuccessful': 'lower',
    'redirectExposure.total': null,
    'redirectExposure.successful': null,
  },
  onEvent(event, game) {
    if (event.type === 'gameStart')
      game.redirectExposure = {total: 0, successful: 0, unprotectedSuccessful: 0};
    if (event.type !== 'run' || event.server !== 'archives' ||
      !['hq', 'rd'].includes(event.destination)) return;
    game.redirectExposure.total++;
    if (!event.success) return;
    game.redirectExposure.successful++;
    if (event.sourceIceCount === 0) game.redirectExposure.unprotectedSuccessful++;
  },
  finish(game) { return game.redirectExposure; },
};
