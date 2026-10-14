'use strict';
// Credits the Corp spends rezzing ICE that hosts a card without
// AIHostedDoesNotPreventRez, in total and split by hosted-card title (title
// with non-alphanumerics removed). Built for hosted-ICE rez gates
// (documentation/bugs/hosted-ice-rez-ignores-repeated-tax.md).
module.exports = {
  name: 'hostedThreatRezCredits',
  // More rezzing is not worse in itself; the gate guards Tranquilizer, whose
  // host is derezzed at 3 virus counters. A gate guarding another title
  // declares it here.
  directions: {'hostedThreatRezCredits.total': null, 'hostedThreatRezCredits.Tranquilizer': 'lower'},
  onEvent(event, game) {
    if (event.type === 'gameStart') game.hostedRez = {total: 0};
    else if (event.type === 'rez' && event.cardType === 'ice') {
      const titles = [...new Set(event.hosted.filter(h => !h.exempt).map(h => String(h.title).replace(/[^A-Za-z0-9]/g, '')))];
      if (!titles.length) return;
      game.hostedRez.total += event.cost;
      for (const title of titles) game.hostedRez[title] = (game.hostedRez[title] || 0) + event.cost;
    }
  },
  finish(game) {
    return game.hostedRez;
  },
};
