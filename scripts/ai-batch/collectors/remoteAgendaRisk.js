'use strict';
// I4: one row per remote holding an installed agenda at the start of each
// Runner turn, [iceCount, rezzedIce, counters, points, bucket, stolen], where
// counters is the most advancement counters on an agenda there, bucket is
// I2's margin bucket (_breachMarginBucket(_breachMargin)) and stolen says
// whether one of those agendas was stolen by that turn's end. Passive: needs
// the harness's remoteAgendaTurn events (enabled when this collector is
// selected). summarize() pools steal rates by ICE count (0, 1, 2+) x counters
// (0, 1+), by margin bucket and by both, with a Wilson interval and an
// interval that resamples games (rows within a game are not independent).
const {seededRandom} = require('../metrics');

const iceGroup = n => n >= 2 ? '2+' : String(n);
const counterGroup = n => n >= 1 ? '1+' : '0';
const RESAMPLES = 2000;

function wilson(k, n, z = 1.96) {
  if (!n) return [null, null];
  const p = k / n, d = 1 + z * z / n;
  const centre = (p + z * z / (2 * n)) / d;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [centre - half, centre + half];
}

const round = value => value === null ? null : Math.round(value * 1000) / 1000;

// cells: key(row) -> {turns, stolen, rate, wilson, gameInterval}
function table(perGame, key) {
  const perGameCells = perGame.map(rows => {
    const cells = {};
    for (const row of rows) {
      const cell = (cells[key(row)] ||= [0, 0]);
      cell[0]++; cell[1] += row[5];
    }
    return cells;
  });
  const keys = [...new Set(perGameCells.flatMap(Object.keys))].sort();
  const pooled = games => {
    const out = {};
    for (const cells of games) for (const k in cells) {
      const cell = (out[k] ||= [0, 0]);
      cell[0] += cells[k][0]; cell[1] += cells[k][1];
    }
    return out;
  };
  const all = pooled(perGameCells);
  const random = seededRandom('i4-remote-agenda-risk');
  const draws = Object.fromEntries(keys.map(k => [k, []]));
  for (let r = 0; r < RESAMPLES; r++) {
    const sample = pooled(Array.from({length: perGameCells.length},
      () => perGameCells[Math.floor(random() * perGameCells.length)]));
    for (const k of keys) if (sample[k] && sample[k][0]) draws[k].push(sample[k][1] / sample[k][0]);
  }
  return Object.fromEntries(keys.map(k => {
    const [turns, stolen] = all[k];
    const sorted = draws[k].sort((a, b) => a - b);
    return [k, {turns, stolen, rate: round(stolen / turns), wilson: wilson(stolen, turns).map(round),
      gameInterval: [round(sorted[Math.floor(0.025 * sorted.length)]), round(sorted[Math.ceil(0.975 * sorted.length) - 1])],
      games: perGameCells.filter(cells => cells[k]).length}];
  }));
}

module.exports = {
  name: 'remoteAgendaRisk',
  directions: {'remoteAgendaRisk.turns': null, 'remoteAgendaRisk.stolen': null},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.remoteAgendaRisk = [];
    else if (event.type === 'remoteAgendaTurn')
      for (const s of event.servers)
        game.remoteAgendaRisk.push([s.iceCount, s.rezzedIce, s.counters, s.points, s.bucket, s.stolen ? 1 : 0]);
  },
  finish(game) {
    return {turns: game.remoteAgendaRisk.length, stolen: game.remoteAgendaRisk.filter(row => row[5]).length};
  },
  samples(game) { return game.remoteAgendaRisk; },
  summarize(perGame) {
    return {
      byIceAndCounters: table(perGame, row => iceGroup(row[0]) + ' ice / ' + counterGroup(row[2]) + ' counters'),
      byRezzedIceAndCounters: table(perGame, row => iceGroup(row[1]) + ' rezzed / ' + counterGroup(row[2]) + ' counters'),
      byBucket: table(perGame, row => row[4]),
      byIceCountersBucket: table(perGame, row => iceGroup(row[0]) + ' ice / ' + counterGroup(row[2]) + ' / ' + row[4]),
    };
  },
  _test: {wilson, table},
};
