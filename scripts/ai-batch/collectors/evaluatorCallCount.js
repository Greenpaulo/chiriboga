'use strict';
// F3: observe headless decision telemetry, never the game state. Count actual
// evaluator work separately from requests (cache hits and verify recomputes).
module.exports = {
  name: 'evaluatorCallCount',
  directions: { 'evaluatorCallCount.computationsPerMainDecision': 'lower' },
  onEvent(event, game) {
    if (event.type === 'gameStart') game.security = {mainDecisions: 0, requests: 0, computations: 0};
    if (event.type !== 'decision' || event.side !== 'corp' || event.identifier !== 'Corp 2.2' ||
        event.choiceType !== 'command') return;
    if (!event.securityEvaluation) {
      game.invalidTelemetry = true; // Record() catches sink errors; finish must still reject the game.
      throw new Error('Missing security evaluator telemetry');
    }
    game.security.mainDecisions++;
    game.security.requests += event.securityEvaluation.requests;
    game.security.computations += event.securityEvaluation.computations;
  },
  finish(game) {
    if (game.invalidTelemetry) throw new Error('Missing security evaluator telemetry');
    const counts = game.security;
    return Object.assign({}, counts, {
      requestsPerMainDecision: counts.mainDecisions ? counts.requests / counts.mainDecisions : 0,
      computationsPerMainDecision: counts.mainDecisions ? counts.computations / counts.mainDecisions : 0,
    });
  },
};
