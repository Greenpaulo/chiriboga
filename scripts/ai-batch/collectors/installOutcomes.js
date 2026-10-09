'use strict';
// I0: follows each Corp root commitment (agenda, asset, upgrade installed
// during play) from install to its fate, using the headless runner's
// observation-only install/leave/cardUsed/cardCredits/rez events. Metric
// definitions are in documentation/ai-batch-harness.md ("I0 collectors").
//
// Fates (leave.fate): scored, stolen, trashedOnAccess (trashed while the
// Runner accessed it), trashed (any other trash), returned (to HQ or R&D),
// other; a card still installed at game end has no fate.
const mean = values => values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

module.exports = {
  name: 'installOutcomes',
  directions: {
    'installOutcomes.installToScoreTurns': 'lower',
    'installOutcomes.agendaExposureTurns': 'lower',
    'installOutcomes.assetNetCredits': 'higher',
    'installOutcomes.trapTriggers': 'higher',
    'installOutcomes.abandoned': 'lower',
    'installOutcomes.agendasInstalled': null,
    'installOutcomes.agendasScored': 'higher',
    'installOutcomes.agendasStolen': 'lower',
    'installOutcomes.assetsInstalled': null,
    'installOutcomes.assetsTrashedBeforePayoff': 'lower',
    'installOutcomes.upgradesInstalled': null,
    'installOutcomes.upgradesUsed': null,
  },
  onEvent(event, game) {
    const io = game.installOutcomes;
    if (event.type === 'gameStart') {
      game.installOutcomes = {installs: new Map(), uses: new Map(), credits: new Map(), rezPaid: new Map()};
      return;
    }
    const add = (map, id, n) => map.set(id, (map.get(id) || 0) + n);
    if (event.type === 'install') {
      io.installs.set(event.id, {cardType: event.cardType, ambush: event.ambush, turn: event.turn,
        runnerTurns: 0, fate: null, resolvedTurn: null});
    } else if (event.type === 'leave') {
      const record = io.installs.get(event.id);
      if (record && !record.fate) { record.fate = event.fate; record.resolvedTurn = event.turn; }
    } else if (event.type === 'turnStart' && event.side === 'runner') {
      for (const record of io.installs.values())
        if (record.cardType === 'agenda' && !record.fate) record.runnerTurns++;
    } else if (event.type === 'cardUsed') add(io.uses, event.id, 1);
    else if (event.type === 'cardCredits') add(io.credits, event.id, event.credits);
    else if (event.type === 'rez' && event.id !== undefined) add(io.rezPaid, event.id, event.cost);
  },
  finish(game) {
    const io = game.installOutcomes;
    const all = [...io.installs.entries()].map(([id, r]) => Object.assign({
      used: io.uses.get(id) || 0, credits: io.credits.get(id) || 0, rezPaid: io.rezPaid.get(id) || 0}, r));
    const agendas = all.filter(r => r.cardType === 'agenda');
    const assets = all.filter(r => r.cardType === 'asset');
    const upgrades = all.filter(r => r.cardType === 'upgrade');
    const scored = agendas.filter(r => r.fate === 'scored');
    // An asset paid off once its credits cover its rez cost or, for one that
    // produces no credits, once it was used.
    const paidOff = r => r.credits > 0 ? r.credits >= r.rezPaid : r.used > 0;
    const trashed = r => r.fate === 'trashed' || r.fate === 'trashedOnAccess';
    return {
      installToScoreTurns: mean(scored.map(r => r.resolvedTurn - r.turn)),
      agendaExposureTurns: mean(agendas.map(r => r.runnerTurns)),
      assetNetCredits: assets.reduce((sum, r) => sum + r.credits - r.rezPaid, 0),
      trapTriggers: all.filter(r => r.ambush).reduce((sum, r) => sum + r.used, 0),
      abandoned: all.filter(r => r.fate === 'trashed' && !r.used && !r.credits).length,
      agendasInstalled: agendas.length,
      agendasScored: scored.length,
      agendasStolen: agendas.filter(r => r.fate === 'stolen').length,
      assetsInstalled: assets.length,
      assetsTrashedBeforePayoff: assets.filter(r => trashed(r) && !paidOff(r)).length,
      upgradesInstalled: upgrades.length,
      upgradesUsed: upgrades.filter(r => r.used > 0 || r.credits > 0).length,
    };
  },
};
