'use strict';
// Corp ICE installs on HQ or R&D while that server's only access pressure is
// spent: at least one public central-pressure source reports `exhausted: true`
// and none reports positive current `additionalAccess`. A server with no
// pressure sources, or only non-access pressure, does not qualify. Guard for
// L7.1 (documentation/backlog/feature-layer-7-1-consequence-calibration.md).
module.exports = {
  name: 'exhaustedPressureProtectionInstalls',
  directions: {'exhaustedPressureProtectionInstalls.count': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.exhaustedInstalls = {count: 0};
    else if (event.type === 'install' && event.cardType === 'ice' && (event.server === 'hq' || event.server === 'rd')) {
      const sources = event.pressureSources || [];
      if (sources.some(s => s.exhausted) && !sources.some(s => s.additionalAccess > 0))
        game.exhaustedInstalls.count++;
    }
  },
  finish(game) {
    return game.exhaustedInstalls;
  },
};
