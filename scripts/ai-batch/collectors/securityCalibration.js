'use strict';
// L9.0: how often a server judged secure at the start of a Runner turn was
// breached (a successful run) that turn, under today's verdict (`current`)
// and the honest one (`honest`), for every server with stakes and for remotes
// holding an agenda. Per-game counts: the pooled breach rate of a group is
// mean(<group>.secureBreached) / mean(<group>.secure). Needs the harness's
// securitySnapshot events (enabled when this collector is selected).
// I2: per-game samples also keep one row per server-turn,
// [kind, bucket, iceCount, breached, approachDefense], and one next-turn row,
// [kind, bucket2, breached], for each server whose ICE and root were unchanged
// since the previous snapshot (bucket2 was predicted for this turn). The
// breach-hazard table and its reliability check are built from these rows.
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
  const previous = game.calibration.previous;
  game.calibration.previous = new Map();
  for (const server of turn.servers) {
    const breached = turn.breached.has(server.serverName);
    if (server.kind) {
      game.calibration.rows.push([server.kind, server.bucket, server.iceCount, breached ? 1 : 0,
        server.approachDefense ? 1 : 0]);
      const before = previous.get(server.serverName);
      if (before && before.signature === server.signature)
        game.calibration.next.push([before.kind, before.bucket2, breached ? 1 : 0]);
      game.calibration.previous.set(server.serverName, server);
    }
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
    if (event.type === 'gameStart')
      game.calibration = {counts: blank(), turn: null, rows: [], next: [], previous: new Map()};
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
  samples(game) {
    return {rows: game.calibration.rows, next: game.calibration.next};
  },
  // Pooled server-turns and breaches per kind and margin bucket.
  summarize(perGame) {
    const cells = {}, next = {};
    const add = (table, kind, bucket, breached) => {
      const cell = ((table[kind] ||= {})[bucket] ||= {turns: 0, breached: 0});
      cell.turns++; cell.breached += breached;
    };
    for (const game of perGame) {
      for (const [kind, bucket, , breached] of game.rows) add(cells, kind, bucket, breached);
      for (const [kind, bucket, breached] of game.next) add(next, kind, bucket, breached);
    }
    return {cells, next};
  },
};
