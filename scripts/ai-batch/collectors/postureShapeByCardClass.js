'use strict';
// Initial requested shape at each actual active bait/bluff commitment. Reuse
// does not add a sample. Later protection top-ups are measured by F12's actual
// ICE counts, not retroactively substituted for this initial profile.
const name = 'postureShapeByCardClass';
const COVERAGE = Object.freeze({commitmentsPerClass: 10, gamesPerClass: 5, knownShapeFraction: 0.9});
const validShape = shape => shape && [1, 2, 3].includes(shape.targetIce) &&
  [1, 2].includes(shape.openingAdvances) && [0, 1].includes(shape.delayTurns);
const shapeKey = shape => `${shape.targetIce}:${shape.openingAdvances}:${shape.delayTurns}`;
function summarize(games) {
  const rows = games.flatMap(game => game.rows.map(row => ({...row, gameId: game.gameId})));
  const histograms = {agenda: {}, trap: {}}, coverage = {};
  for (const type of ['agenda', 'trap']) {
    const all = rows.filter(row => row.rootType === type), known = all.filter(row => validShape(row.shape));
    for (const row of known) {
      const key = shapeKey(row.shape);
      histograms[type][key] = (histograms[type][key] || 0) + 1;
    }
    coverage[type] = {commitments: known.length, games: new Set(known.map(row => row.gameId)).size,
      unknown: all.length - known.length, knownFraction: all.length ? known.length / all.length : 0};
  }
  const keys = new Set([...Object.keys(histograms.agenda), ...Object.keys(histograms.trap)]);
  const tv = coverage.agenda.commitments && coverage.trap.commitments ? [...keys].reduce((sum, key) => sum +
    Math.abs((histograms.agenda[key] || 0) / coverage.agenda.commitments -
      (histograms.trap[key] || 0) / coverage.trap.commitments), 0) / 2 : null;
  return {tv, coverage, histograms};
}
module.exports = {
  name, COVERAGE, summarize, strictBatchDiagnostics: true, metricNames: ['tv'],
  directions: {[`${name}.tv`]: 'lower'},
  onEvent(event, game) {
    if (event.type !== 'posture' || event.hypothetical) return;
    game.shapes ||= new Map(); game.current ||= new Map(); game.shapeRows ||= [];
    if (event.action === 'profile' && Number.isInteger(event.cardId)) {
      const shape = {...event.profile};
      game.shapes.set(event.cardId, shape);
      const pending = game.current.get(event.cardId);
      if (pending && !pending.shape) pending.shape = shape;
    }
    if (event.action !== 'roll' || !['bait', 'bluff'].includes(event.kind)) return;
    game.current.delete(event.cardId);
    if (!event.postured) return;
    const row = {rootType: event.isAgenda === 1 ? 'agenda' : event.isAgenda === 0 ? 'trap' : null,
      cardId: event.cardId, epoch: event.epoch,
      shape: event.profile ? {...event.profile} : game.shapes.get(event.cardId) || null};
    game.shapeRows.push(row); game.current.set(event.cardId, row);
  },
  finish(game) { return {commitments: (game.shapeRows || []).length}; },
  samples(game) { return {gameId: `${game.fixtureId || ''}:${game.deckPairId}:${game.seed}`, rows: game.shapeRows || []}; },
  validateBatch(games) {
    if (!Array.isArray(games) || !games.length || games.some(game => !game ||
      typeof game.gameId !== 'string' || !Array.isArray(game.rows))) return 'invalid shape sample envelope';
    for (const row of games.flatMap(game => game.rows)) {
      if (!['agenda', 'trap'].includes(row.rootType) || !Number.isInteger(row.cardId) ||
        !Number.isInteger(row.epoch) || row.shape && !validShape(row.shape)) return 'invalid shape sample';
    }
    const stats = summarize(games);
    for (const type of ['agenda', 'trap']) {
      const c = stats.coverage[type];
      if (c.commitments < COVERAGE.commitmentsPerClass || c.games < COVERAGE.gamesPerClass)
        return `insufficient ${type} shape coverage`;
      if (c.knownFraction < COVERAGE.knownShapeFraction) return `insufficient known ${type} shapes (need 90%)`;
    }
    return true;
  },
  finishBatch(games) { return {tv: summarize(games).tv}; },
  diagnosticsBatch(games) { return summarize(games); },
};
