'use strict';
// Shared by L8.2, L8.4 and L8.5 (Corp principle 5: no posture may correlate
// with a single observable game-state variable). A batch-level metric:
// `max` is the largest absolute Spearman correlation between a posture outcome
// and one public variable, pooled over every game in the batch, with a
// bootstrap interval over games (see finishBatch in
// documentation/ai-batch-harness.md).
//
// Outcomes: for every bait or agenda-bluff decision that reached a random
// posture roll (each epoch reevaluation included), `postured` 0/1, and for
// postured decisions `isAgenda` 0/1; for every profile roll, the selected ICE
// depth, opening advancement and delay. Decisions stopped by a safety guard
// emit no roll and are excluded.
const VARIABLES = ['turn', 'corpCredits', 'runnerCredits', 'gripSize', 'hqSize', 'rootCount', 'iceCount',
  'deepestCentralIce', 'corpPoints', 'runnerPoints'];

function ranks(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    const rank = (i + j) / 2;
    for (let k = i; k <= j; k++) out[order[k][1]] = rank;
    i = j + 1;
  }
  return out;
}

// Spearman's rho (Pearson on average ranks); null when undefined (fewer than
// three samples or a constant column).
function spearman(xs, ys) {
  const n = xs.length;
  if (n < 3) return null;
  const rx = ranks(xs), ry = ranks(ys);
  const mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - mx, dy = ry[i] - my;
    sxy += dx * dy; sxx += dx * dx; syy += dy * dy;
  }
  if (!sxx || !syy) return null;
  return sxy / Math.sqrt(sxx * syy);
}

// Largest |rho| over every outcome/variable pair in the pooled samples.
function maxCorrelation(samples) {
  const groups = {postured: [], isAgenda: [], targetIce: [], openingAdvances: [], delayTurns: []};
  for (const s of samples) {
    if (s.k === 'p') {
      groups.postured.push([s.postured, s.v]);
      if (s.postured) groups.isAgenda.push([s.isAgenda, s.v]);
    } else {
      groups.targetIce.push([s.targetIce, s.v]);
      groups.openingAdvances.push([s.openingAdvances, s.v]);
      groups.delayTurns.push([s.delayTurns, s.v]);
    }
  }
  let max = 0;
  for (const rows of Object.values(groups)) {
    if (rows.length < 3) continue;
    const outcome = rows.map(r => r[0]);
    for (let j = 0; j < VARIABLES.length; j++) {
      const rho = spearman(outcome, rows.map(r => r[1][j]));
      if (rho !== null) max = Math.max(max, Math.abs(rho));
    }
  }
  return max;
}

module.exports = {
  name: 'bluffSingleVariableCorrelation',
  directions: {'bluffSingleVariableCorrelation.decisions': null, 'bluffSingleVariableCorrelation.max': 'lower'},
  VARIABLES, spearman, maxCorrelation,
  onEvent(event, game) {
    if (event.type !== 'posture') return;
    const vars = event.publicVars ? VARIABLES.map(name => Number(event.publicVars[name]) || 0) : null;
    if (!vars) return;
    const samples = game.postureSamples = game.postureSamples || [];
    if (event.action === 'roll' && event.kind !== 'profile')
      samples.push({k: 'p', postured: event.postured, isAgenda: event.isAgenda, v: vars});
    else if (event.action === 'profile' && event.profile)
      samples.push({k: 'f', targetIce: event.profile.targetIce, openingAdvances: event.profile.openingAdvances,
        delayTurns: event.profile.delayTurns, v: vars});
  },
  finish(game) {
    return {decisions: (game.postureSamples || []).length};
  },
  // Per-game data kept in the report for the batch metric.
  samples(game) {
    return game.postureSamples || [];
  },
  finishBatch(perGame) {
    return {max: maxCorrelation([].concat(...perGame))};
  },
};
