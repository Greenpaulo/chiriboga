'use strict';
// L9.0: how often a server judged secure at the start of a Runner turn was
// breached (a successful run) that turn, under today's verdict (`current`)
// and the honest one (`honest`), for every server with stakes and for remotes
// holding an agenda. Per-game counts: the pooled breach rate of a group is
// mean(<group>.secureBreached) / mean(<group>.secure). Needs the harness's
// securitySnapshot events (enabled when this collector is selected).
const GROUPS = ['current', 'honest', 'current.agendaRemote', 'honest.agendaRemote'];
const FIELDS = ['secure', 'secureBreached', 'insecure', 'insecureBreached'];

function blank() {
  const out = {};
  for (const group of ['current', 'honest']) {
    out[group] = {};
    for (const scope of ['all', 'agendaRemote'])
      out[group][scope] = Object.fromEntries(FIELDS.map(field => [field, 0]));
  }
  return out;
}

function closeTurn(game) {
  const turn = game.calibration.turn;
  game.calibration.turn = null;
  if (!turn) return;
  for (const server of turn.servers) {
    const breached = turn.breached.has(server.serverName);
    for (const [group, secure] of [['current', server.isSecure], ['honest', server.honestIsSecure]]) {
      const scopes = server.agenda ? ['all', 'agendaRemote'] : ['all'];
      for (const scope of scopes) {
        const counts = game.calibration.counts[group][scope];
        const key = secure ? 'secure' : 'insecure';
        counts[key]++;
        if (breached) counts[key + 'Breached']++;
      }
    }
  }
}

module.exports = {
  name: 'securityCalibration',
  directions: Object.fromEntries(GROUPS.flatMap(group => FIELDS.map(field =>
    ['securityCalibration.' + group.replace(/^(current|honest)$/, '$1.all') + '.' + field, null]))),
  onEvent(event, game) {
    if (event.type === 'gameStart') game.calibration = {counts: blank(), turn: null};
    else if (event.type === 'securitySnapshot') {
      closeTurn(game);
      game.calibration.turn = {servers: event.servers, breached: new Set()};
    } else if (event.type === 'run' && event.success && game.calibration.turn)
      game.calibration.turn.breached.add(event.serverName);
    else if ((event.type === 'turnEnd' && event.side === 'runner') || event.type === 'gameEnd')
      closeTurn(game);
  },
  finish(game) {
    return game.calibration.counts;
  },
};
