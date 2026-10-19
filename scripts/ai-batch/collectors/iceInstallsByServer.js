'use strict';
// I2 diagnostic: completed Corp ICE installs per game by destination kind
// (hq, rd, archives, and remotes by harness-true root: agenda, trap, other,
// empty), from the headless runner's iceInstalled event. Per kind: install
// count, turn of the first install (0 if none), and summed printed rez cost
// and strength (divide by the count for means). No direction: it explains
// where an ICE policy moved protection; it is not a gate row.
const KINDS = ['hq', 'rd', 'archives', 'agendaRemote', 'trapRemote', 'otherRemote', 'emptyRemote'];
const FIELDS = ['count', 'firstTurn', 'rezCost', 'strength'];
module.exports = {
  name: 'iceInstallsByServer',
  directions: Object.fromEntries(KINDS.flatMap(kind => FIELDS.map(field => [`iceInstallsByServer.${kind}.${field}`, null]))
    .concat([['iceInstallsByServer.thirdLayerOrDeeper', null]])),
  onEvent(event, game) {
    if (event.type === 'gameStart') {
      game.iceInstalls = {thirdLayerOrDeeper: 0};
      for (const kind of KINDS) for (const field of FIELDS) game.iceInstalls[`${kind}.${field}`] = 0;
      return;
    }
    if (event.type !== 'iceInstalled' || !KINDS.includes(event.server)) return;
    const at = field => `${event.server}.${field}`, row = game.iceInstalls;
    row[at('count')]++;
    if (!row[at('firstTurn')]) row[at('firstTurn')] = event.turn;
    row[at('rezCost')] += event.rezCost;
    row[at('strength')] += event.strength;
    if (event.iceCount >= 3) row.thirdLayerOrDeeper++;
  },
  finish(game) { return Object.assign({}, game.iceInstalls); },
};
