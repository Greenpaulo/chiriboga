'use strict';
// L8.5: passive per-script extrema and per-game invariant violations.
module.exports = {
  name: 'postureScriptWeights',
  directions: {'postureScriptWeights.violations': 'lower'},
  onEvent(event, game) {
    if (event.type !== 'posture' || event.action !== 'weights') return;
    const scripts = game.scriptWeights = game.scriptWeights || {};
    const lastWeights = game.lastScriptWeights = game.lastScriptWeights || {};
    game.weightObservations = (game.weightObservations || 0) + 1;
    let total = 0;
    if (!Array.isArray(event.scripts) || event.scripts.length !== 12) {
      game.weightViolations = (game.weightViolations || 0) + 1;
      return;
    }
    const ids = new Set();
    for (const s of event.scripts) {
      const previous = lastWeights[s.id];
      if (ids.has(s.id) || !Number.isFinite(s.weight) || s.weight < 0.8 - 1e-12 || s.weight > 1.2 + 1e-12 ||
          (previous !== undefined && Math.abs(s.weight - previous) > 0.02 + 1e-12) ||
          !Number.isFinite(s.probability) || s.probability < 0.015 - 1e-12 || s.probability > 1)
        game.weightViolations = (game.weightViolations || 0) + 1;
      ids.add(s.id);
      total += s.probability;
      const extrema = scripts[s.id] = scripts[s.id] || {minWeight: s.weight, maxWeight: s.weight,
        minProbability: s.probability, maxProbability: s.probability};
      extrema.minWeight = Math.min(extrema.minWeight, s.weight);
      extrema.maxWeight = Math.max(extrema.maxWeight, s.weight);
      extrema.minProbability = Math.min(extrema.minProbability, s.probability);
      extrema.maxProbability = Math.max(extrema.maxProbability, s.probability);
      lastWeights[s.id] = s.weight;
    }
    if (!Number.isFinite(total) || Math.abs(total - 1) > 1e-9)
      game.weightViolations = (game.weightViolations || 0) + 1;
  },
  finish(game) {
    return {violations: (game.weightViolations || 0) + (game.weightObservations ? 0 : 1), observations: game.weightObservations || 0,
      scripts: game.scriptWeights || {}};
  },
};
