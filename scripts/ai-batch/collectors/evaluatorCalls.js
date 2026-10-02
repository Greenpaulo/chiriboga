'use strict';
// F3 collector: computed Corp server-security evaluations (cache hits
// excluded), from the evaluatorCalls field of each Corp decision's telemetry
// entry. mainPhaseMean is per Corp action-phase decision (Phase_Main).
const MAIN_PHASE = new Set(['Corp 2.1', 'Corp 2.2']);

module.exports = {
  name: 'evaluatorCalls',
  directions: {'evaluatorCalls.total': 'lower', 'evaluatorCalls.mainPhaseMean': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.evaluatorCalls = {total: 0, mainPhase: 0, mainPhaseDecisions: 0};
    else if (event.type === 'decision' && event.side === 'corp' && typeof event.evaluatorCalls === 'number') {
      game.evaluatorCalls.total += event.evaluatorCalls;
      if (MAIN_PHASE.has(event.identifier)) {
        game.evaluatorCalls.mainPhase += event.evaluatorCalls;
        game.evaluatorCalls.mainPhaseDecisions++;
      }
    }
  },
  finish(game) {
    const calls = game.evaluatorCalls;
    return {total: calls.total, mainPhaseMean: calls.mainPhaseDecisions ? calls.mainPhase / calls.mainPhaseDecisions : 0};
  },
};
